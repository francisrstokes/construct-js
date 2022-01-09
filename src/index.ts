function assert(condition: boolean, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

const validName = '[a-zA-Z0-9_\\-]+';
const validNameRegex = new RegExp(`^${validName}$`);
const pathRegex = new RegExp(`^(${validName}\.)*${validName}$`);

type StructMember = { name: string, field: ConstructDataType }

export enum Endian {
  Little  = 'Little',
  Big     = 'Big'
}

export enum StructAlignment {
  Packed     = 'Packed',
  Align2Byte = 'Align2Byte',
  Align4Byte = 'Align4Byte',
  Align8Byte = 'Align8Byte',
}

const AlignmentBoundaries: Record<StructAlignment, number> = {
  [StructAlignment.Packed]:     0, // Not actually meaningful
  [StructAlignment.Align2Byte]: 2,
  [StructAlignment.Align4Byte]: 4,
  [StructAlignment.Align8Byte]: 8,
};

// https://github.com/AsahiLinux/dcp-parser/blob/363f10217e9fcd30e2e69080e33abe66437175e0/parser.c#L10
const alignTo = (value: number, boundary: number) => ((value + (boundary - 1)) & ~(boundary - 1));

export enum AlignmentPadding {
  BeforeData = 'BeforeData',
  AfterData = 'AfterData'
}

export interface IField {
  computeBufferSize(): number;
  toUint8Array(): Uint8Array;
}

interface IValue<T> {
  set(value: T): void;
  get(): T;
}

export class StructType implements IField {
  private alignment: StructAlignment;
  private paddingDirection: AlignmentPadding;
  private fields: Array<StructMember> = [];
  private fieldMap: Record<string, StructMember> = {};
  name: string;

  constructor(name: string, alignment = StructAlignment.Packed, paddingDirection = AlignmentPadding.AfterData) {
    this.name = name;
    this.alignment = alignment;
    this.paddingDirection = paddingDirection;
  }

  get<T extends ConstructDataType>(name: string): T {
    assert((name in this.fieldMap), `No field with name ${name} exists on Struct ${this.name}`);
    return this.fieldMap[name].field as T;
  }

  getDeep<T extends ConstructDataType>(path: string): T {
    assert(pathRegex.test(path), `Path "${path}" is not valid`);

    const [head, ...tail] = path.split('.');
    const nextPart = this.get<T>(head);

    if (tail.length === 0) {
      return nextPart as T;
    }

    assert(nextPart instanceof StructType, `Item in path "${head}" is not a Struct`);
    return nextPart.getDeep<T>(tail.join('.'));
  }

  getDeepOffset(path: string, startOffset = 0): number {
    assert(pathRegex.test(path), `Path "${path}" is not valid`);

    const [head, ...tail] = path.split('.');
    const nextPart = this.get(head);
    const nextOffset = startOffset + this.getOffset(head);

    if (tail.length === 0) {
      return nextOffset;
    }

    assert(nextPart instanceof StructType, `Item in path "${head}" is not a Struct`);
    return nextPart.getDeepOffset(tail.join('.'), nextOffset);
  }

  getOffset(name: string) {
    assert((name in this.fieldMap), `No field with name ${name} exists on Struct ${this.name}`);

    let total = 0;
    for (let { name: fName, field} of this.fields) {
      if (name === fName) break;
      let bufSize = field.computeBufferSize();
      if (this.alignment !== StructAlignment.Packed) {
        bufSize = alignTo(bufSize, AlignmentBoundaries[this.alignment]);
      }
      total += bufSize;
    }
    return total;
  }

  field(name: string, item: ConstructDataType) {
    assert(
      !(name in this.fieldMap),
      `A field already exists on Struct ${this.name} with name ${name}`
    );
    assert(
      validNameRegex.test(name),
      `Name "${name}" is not valid. Names can be made of letters, numbers, underscores, and dashes`
    );

    const field = {name, field: item};
    this.fields.push(field);
    this.fieldMap[name] = field;

    return this;
  }

  computeBufferSize(): number {
    return this.fields.reduce((acc, {field}) => {
      let bufSize = field.computeBufferSize();
      if (this.alignment !== StructAlignment.Packed) {
        bufSize = alignTo(bufSize, AlignmentBoundaries[this.alignment]);
      }
      return acc + bufSize;
    }, 0);
  }

  toUint8Array(): Uint8Array {
    const buffers = this.fields.map<Uint8Array>(({field}) => {
      const buffer = field.toUint8Array();

      if (this.alignment === StructAlignment.Packed) {
        return buffer;
      }

      const size = alignTo(buffer.length, AlignmentBoundaries[this.alignment]);
      const resizedBuffer = new Uint8Array(size);

      if (this.paddingDirection === AlignmentPadding.AfterData) {
        resizedBuffer.set(buffer);
      } else {
        resizedBuffer.set(buffer, size - buffer.length);
      }

      return resizedBuffer;
    });

    const totalSize = buffers.reduce((acc, buffer) => acc + buffer.length, 0);
    const buffer = new Uint8Array(totalSize);

    let offset = 0;
    for (let fieldBuffer of buffers) {
      buffer.set(fieldBuffer, offset);
      offset += fieldBuffer.length;
    }

    return buffer;
  }
}

type RelaxedArray<T> = T[] | Readonly<T[]>;
type ByteConversionStrategyFn = (ns: RelaxedArray<number>, isLittleEndian: boolean) => Uint8Array;
const u8sTou8s = (ns: RelaxedArray<number>) => {
  return new Uint8Array(ns);
}
const u16sTou8s = (ns: RelaxedArray<number>, isLittleEndian: boolean) => {
  const stride = 2;
  const buffer = new Uint8Array(ns.length * stride);
  let i = 0;
  for (let n of ns) {
    if (isLittleEndian) {
      buffer[i+0] = n & 0xff;
      buffer[i+1] = (n >> 8) & 0xff;
    } else {
      buffer[i+1] = n & 0xff;
      buffer[i+0] = (n >> 8) & 0xff;
    }
    i += stride;
  }
  return buffer;
}

const u32sTou8s = (ns: RelaxedArray<number>, isLittleEndian: boolean) => {
  const stride = 4;
  const buffer = new Uint8Array(ns.length * stride);
  let i = 0;
  for (let n of ns) {
    if (isLittleEndian) {
      buffer[i+0] = n & 0xff;
      buffer[i+1] = (n >> 8) & 0xff;
      buffer[i+2] = (n >> 16) & 0xff;
      buffer[i+3] = (n >> 24) & 0xff;
    } else {
      buffer[i+3] = n & 0xff;
      buffer[i+2] = (n >> 8) & 0xff;
      buffer[i+1] = (n >> 16) & 0xff;
      buffer[i+0] = (n >> 24) & 0xff;
    }
    i += stride;
  }
  return buffer;
}

const u64sTou8s = (ns: RelaxedArray<bigint>, isLittleEndian: boolean) => {
  const stride = 8;
  const buffer = new Uint8Array(ns.length * stride);
  let i = 0;
  for (let n of ns) {
    if (isLittleEndian) {
      buffer[i+0] = Number(n & 0xffn);
      buffer[i+1] = Number((n >> 8n) & 0xffn);
      buffer[i+2] = Number((n >> 16n) & 0xffn);
      buffer[i+3] = Number((n >> 24n) & 0xffn);
      buffer[i+4] = Number((n >> 32n) & 0xffn);
      buffer[i+5] = Number((n >> 40n) & 0xffn);
      buffer[i+6] = Number((n >> 48n) & 0xffn);
      buffer[i+7] = Number((n >> 56n) & 0xffn);
    } else {
      buffer[i+7] = Number(n & 0xffn);
      buffer[i+6] = Number((n >> 8n) & 0xffn);
      buffer[i+5] = Number((n >> 16n) & 0xffn);
      buffer[i+4] = Number((n >> 24n) & 0xffn);
      buffer[i+3] = Number((n >> 32n) & 0xffn);
      buffer[i+2] = Number((n >> 40n) & 0xffn);
      buffer[i+1] = Number((n >> 48n) & 0xffn);
      buffer[i+0] = Number((n >> 56n) & 0xffn);
    }
    i += stride;
  }
  return buffer;
}

const normalise64 = (n: bigint) => {
  return n < 0n
    ? 0xffffffffffffffffn + n + 1n
    : n;
};

class BaseField implements IValue<number>, IField {
  private value: number;
  private endian: Endian;

  private width: number;
  private min: number;
  private max: number;
  private toBytesFn: ByteConversionStrategyFn;

  constructor(width: number, min: number, max: number, toBytesFn: ByteConversionStrategyFn, value: number, endian: Endian) {
    this.width = width;
    this.min = min;
    this.max = max;
    this.toBytesFn = toBytesFn;

    this.assertInvariants(value);
    this.value = value;
    this.endian = endian;
  }

  private assertInvariants(value: number) {
    assert(value >= this.min && value <= this.max, `value must be an integer between ${this.min} and ${this.max}`);
    assert(Number.isInteger(value), `value must be an integer between ${this.min} and ${this.max}`);
  }

  computeBufferSize(): number { return this.width; }

  toUint8Array(): Uint8Array {
    return this.toBytesFn([this.value], this.endian === Endian.Little);
  }

  set(value: number) {
    this.assertInvariants(value);
    this.value = value;
  }

  get() { return this.value; }
}

class U8Type extends BaseField {
  constructor(value: number, endian = Endian.Little) {
    super(1, 0, 0xff, u8sTou8s, value, endian);
  }
}

class U16Type extends BaseField {
  constructor(value: number, endian = Endian.Little) {
    super(2, 0, 0xffff, u16sTou8s, value, endian);
  }
}

class U32Type extends BaseField {
  constructor(value: number, endian = Endian.Little) {
    super(4, 0, 0xffffffff, u32sTou8s, value, endian);
  }
}

class I8Type extends BaseField {
  constructor(value: number, endian = Endian.Little) {
    super(1, -0x80, 0x7f, u8sTou8s, value, endian);
  }
}

class I16Type extends BaseField {
  constructor(value: number, endian = Endian.Little) {
    super(2, -0x8000, 0x7fff, u16sTou8s, value, endian);
  }
}

class I32Type extends BaseField {
  constructor(value: number, endian = Endian.Little) {
    super(4, -0x80000000, 0x7fffffff, u32sTou8s, value, endian);
  }
}

class BaseArrayField implements IValue<number[]>, IField {
  private values: Readonly<number[]>;
  private endian: Endian;

  private width: number;
  private min: number;
  private max: number;
  private toBytesFn: ByteConversionStrategyFn;

  private assertInvariants(values: number[]) {
    values.forEach(value => {
      assert(value >= this.min && value <= this.max, `value must be an integer between ${this.min} and ${this.max}`);
      assert(Number.isInteger(value), `value must be an integer between ${this.min} and ${this.max}`);
    });
  }

  constructor(width: number, min: number, max: number, toBytesFn: ByteConversionStrategyFn, values: number[], endian = Endian.Little) {
    this.width = width;
    this.min = min;
    this.max = max;
    this.toBytesFn = toBytesFn;

    this.assertInvariants(values);
    this.values = Object.freeze([...values]);
    this.endian = endian;
  }

  computeBufferSize() {
    return this.values.length * this.width;
  }

  get() { return [...this.values]; }
  set(values: number[]) {
    this.assertInvariants(values);
    this.values = Object.freeze([...values]);
  }

  toUint8Array() {
    return this.toBytesFn(this.values, this.endian === Endian.Little);
  }
}

class U8sType extends BaseArrayField {
  constructor(values: number[], endian = Endian.Little) {
    super(1, 0, 0xff, u8sTou8s, values, endian);
  }
}

class U16sType extends BaseArrayField {
  constructor(values: number[], endian = Endian.Little) {
    super(2, 0, 0xffff, u16sTou8s, values, endian);
  }
}

class U32sType extends BaseArrayField {
  constructor(values: number[], endian = Endian.Little) {
    super(4, 0, 0xffffffff, u32sTou8s, values, endian);
  }
}

class I8sType extends BaseArrayField {
  constructor(values: number[], endian = Endian.Little) {
    super(1, -0x80, 0x7f, u8sTou8s, values, endian);
  }
}

class I16sType extends BaseArrayField {
  constructor(values: number[], endian = Endian.Little) {
    super(2, -0x8000, 0x7fff, u16sTou8s, values, endian);
  }
}

class I32sType extends BaseArrayField {
  constructor(values: number[], endian = Endian.Little) {
    super(4, -0x80000000, 0x7fffffff, u32sTou8s, values, endian);
  }
}

export class U64Type implements IValue<bigint>, IField {
  private value: bigint;
  private endian: Endian;

  private assertInvariants(value: bigint) {
    const max = 0xffffffffffffffffn;
    assert(
      value >= 0n && value <= max,
      `value must be a positive integer between 0 and ${max.toString()}`
    );
  }

  constructor(value: bigint, endian = Endian.Little) {
    this.assertInvariants(value);
    this.value = value;
    this.endian = endian;
  }

  computeBufferSize(): number { return 8; }

  toUint8Array(): Uint8Array {
    return u64sTou8s([this.value], this.endian === Endian.Little);
  }

  set(value: bigint) {
    this.assertInvariants(value);
    this.value = value;
  }

  get() { return this.value; }
}

export class I64Type implements IValue<bigint>, IField {
  private value: bigint;
  private endian: Endian;

  private assertInvariants(value: bigint) {
    const min = -0x8000000000000000n;
    const max =  0x7fffffffffffffffn;
    assert(
      value >= min && value <= max,
      `value must be an integer between ${min.toString()} and ${max.toString()}`
    );
  }

  constructor(value: bigint, endian = Endian.Little) {
    this.assertInvariants(value);
    this.value = value;
    this.endian = endian;
  }

  computeBufferSize(): number { return 8; }

  toUint8Array(): Uint8Array {
    return u64sTou8s([normalise64(this.value)], this.endian === Endian.Little);
  }

  set(value: bigint) {
    this.assertInvariants(value);
    this.value = value;
  }

  get() { return this.value; }
}

export class U64sType implements IValue<bigint[]>, IField {
  private values: Readonly<bigint[]>;
  private endian: Endian;

  private assertInvariants(values: bigint[]) {
    const max = 2n**64n - 1n;
    values.forEach(value => {
      assert(value >= 0x00n && value <= max, `value must be a positive integer between 0 and ${max.toString()}`);
    });
  }

  constructor(values: bigint[], endian = Endian.Little) {
    this.assertInvariants(values);
    this.values = Object.freeze([...values]);
    this.endian = endian;
  }

  computeBufferSize() {
    return this.values.length * 8;
  }

  get() { return [...this.values]; }
  set(values: bigint[]) {
    this.assertInvariants(values);
    this.values = Object.freeze([...values]);
  }

  toUint8Array() {
    return u64sTou8s(this.values, this.endian === Endian.Little);
  }
}

export class I64sType implements IValue<bigint[]>, IField {
  private values: Readonly<bigint[]>;
  private endian: Endian;

  private assertInvariants(values: bigint[]) {
    const min = -0x8000000000000000n;
    const max =  0x7fffffffffffffffn;
    values.forEach(value => {
      assert(value >= min && value <= max, `value must be an integer between ${min.toString()} and ${max.toString()}`);
    });
  }

  constructor(values: bigint[], endian = Endian.Little) {
    this.assertInvariants(values);
    this.values = Object.freeze([...values]);
    this.endian = endian;
  }

  computeBufferSize() {
    return this.values.length * 8;
  }

  get() { return [...this.values]; }
  set(values: bigint[]) {
    this.assertInvariants(values);
    this.values = Object.freeze([...values]);
  }

  toUint8Array() {
    return u64sTou8s(this.values.map(normalise64), this.endian === Endian.Little);
  }
}

class BaseSizeOf implements IField {
  private target: ConstructDataType;
  private endian: Endian;
  private width: number;
  private toBytesFn: ByteConversionStrategyFn;

  constructor(width: number, toBytesFn: ByteConversionStrategyFn, target: ConstructDataType, endian = Endian.Little) {
    this.width = width;
    this.toBytesFn = toBytesFn;
    this.target = target;
    this.endian = endian;
  }

  computeBufferSize(): number { return this.width; }

  toUint8Array(): Uint8Array {
    return this.toBytesFn([this.target.computeBufferSize()], this.endian === Endian.Little);
  }

  get() {
    return this.target.computeBufferSize();
  }
}

class SizeOf8Type extends BaseSizeOf {
  constructor(target: ConstructDataType, endian = Endian.Little) {
    super(1, u8sTou8s, target, endian);
  }
}

class SizeOf16Type extends BaseSizeOf {
  constructor(target: ConstructDataType, endian = Endian.Little) {
    super(2, u16sTou8s, target, endian);
  }
}

class SizeOf32Type extends BaseSizeOf {
  constructor(target: ConstructDataType, endian = Endian.Little) {
    super(4, u32sTou8s, target, endian);
  }
}

export class SizeOf64Type implements IField {
  private target: ConstructDataType;
  private endian: Endian;

  constructor(target: ConstructDataType, endian = Endian.Little) {
    this.target = target;
    this.endian = endian;
  }

  computeBufferSize(): number { return 8; }

  toUint8Array(): Uint8Array {
    const bufferSize = BigInt(this.target.computeBufferSize());
    return u64sTou8s([bufferSize], this.endian === Endian.Little);
  }

  get() {
    return BigInt(this.target.computeBufferSize());
  }
}

class BasePointer implements IField {
  private target: StructType;
  private path: string;
  private endian: Endian;

  private width: number;
  private toBytesFn: ByteConversionStrategyFn;

  constructor(width: number, toBytesFn: ByteConversionStrategyFn, target: StructType, path: string, endian = Endian.Little) {
    this.width = width;
    this.toBytesFn = toBytesFn;

    assert(pathRegex.test(path), `Path "${path}" is not valid`);
    this.target = target;
    this.path = path;
    this.endian = endian;
  }

  computeBufferSize(): number { return this.width; }

  toUint8Array(): Uint8Array {
    return this.toBytesFn([this.target.getDeepOffset(this.path)], this.endian === Endian.Little);
  }

  get() {
    return this.target.getDeepOffset(this.path);
  }
}

class Pointer8Type extends BasePointer {
  constructor(target: StructType, path: string, endian = Endian.Little) {
    super(1, u8sTou8s, target, path, endian);
  }
}

class Pointer16Type extends BasePointer {
  constructor(target: StructType, path: string, endian = Endian.Little) {
    super(2, u16sTou8s, target, path, endian);
  }
}

class Pointer32Type extends BasePointer {
  constructor(target: StructType, path: string, endian = Endian.Little) {
    super(4, u32sTou8s, target, path, endian);
  }
}

export class Pointer64Type implements IField {
  private target: StructType;
  private path: string;
  private endian: Endian;

  constructor(target: StructType, path: string, endian = Endian.Little) {
    assert(pathRegex.test(path), `Path "${path}" is not valid`);
    this.target = target;
    this.path = path;
    this.endian = endian;
  }

  computeBufferSize(): number { return 8; }

  toUint8Array(): Uint8Array {
    const offset = BigInt(this.target.getDeepOffset(this.path));
    return u64sTou8s([offset], this.endian === Endian.Little);
  }

  get() {
    return BigInt(this.target.getDeepOffset(this.path));
  }
}

export class RawStringType implements IValue<string>, IField {
  private value: string;

  constructor(value: string) {
    this.value = value;
  }

  computeBufferSize(): number { return this.value.length; }

  toUint8Array(): Uint8Array {
    return u8sTou8s(this.value.split('').map(x => x.charCodeAt(0)));
  }

  set(value: string) {
    this.value = value;
  }

  get() { return this.value; }
}

export class NullTerminatedStringType implements IValue<string>, IField {
  private value: string;

  constructor(value: string) {
    this.value = value;
  }

  computeBufferSize(): number { return this.value.length + 1; }

  toUint8Array(): Uint8Array {
    return u8sTou8s([...this.value.split('').map(x => x.charCodeAt(0)), 0]);
  }

  set(value: string) {
    this.value = value;
  }

  get() { return this.value; }
}

export const Struct = (name: string, alignment = StructAlignment.Packed, paddingDirection = AlignmentPadding.AfterData) => (
  new StructType(name, alignment, paddingDirection)
);

export const U8 = (value: number) => new U8Type(value);
export const U16 = (value: number, endian = Endian.Little) => new U16Type(value, endian);
export const U32 = (value: number, endian = Endian.Little) => new U32Type(value, endian);
export const U64 = (value: bigint, endian = Endian.Little) => new U64Type(value, endian);
export const I8 = (value: number) => new I8Type(value);
export const I16 = (value: number, endian = Endian.Little) => new I16Type(value, endian);
export const I32 = (value: number, endian = Endian.Little) => new I32Type(value, endian);
export const I64 = (value: bigint, endian = Endian.Little) => new I64Type(value, endian);

export const U8s = (values: number[]) => new U8sType(values);
export const U16s = (values: number[], endian = Endian.Little) => new U16sType(values, endian);
export const U32s = (values: number[], endian = Endian.Little) => new U32sType(values, endian);
export const U64s = (values: bigint[], endian = Endian.Little) => new U64sType(values, endian);
export const I8s = (values: number[]) => new I8sType(values);
export const I16s = (values: number[], endian = Endian.Little) => new I16sType(values, endian);
export const I32s = (values: number[], endian = Endian.Little) => new I32sType(values, endian);
export const I64s = (values: bigint[], endian = Endian.Little) => new I64sType(values, endian);

export const SizeOf8 = (target: ConstructDataType) => new SizeOf8Type(target);
export const SizeOf16 = (target: ConstructDataType, endian = Endian.Little) => new SizeOf16Type(target, endian);
export const SizeOf32 = (target: ConstructDataType, endian = Endian.Little) => new SizeOf32Type(target, endian);
export const SizeOf64 = (target: ConstructDataType, endian = Endian.Little) => new SizeOf64Type(target, endian);

export const Pointer8 = (target: StructType, path: string) => (
  new Pointer8Type(target, path)
);
export const Pointer16 = (target: StructType, path: string, endian = Endian.Little) => (
  new Pointer16Type(target, path, endian)
);
export const Pointer32 = (target: StructType, path: string, endian = Endian.Little) => (
  new Pointer32Type(target, path, endian)
);
export const Pointer64 = (target: StructType, path: string, endian = Endian.Little) => (
  new Pointer64Type(target, path, endian)
);

export const RawString = (value: string) => new RawStringType(value);
export const NullTerminatedString = (value: string) => new NullTerminatedStringType(value);

export type ConstructDataType =
  | StructType
  | IField;

export type DataType<T extends (...args: any[]) => ConstructDataType> = ReturnType<T>;
