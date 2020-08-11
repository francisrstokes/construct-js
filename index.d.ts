// Type definitions for construct-js
// Project: https://github.com/francisrstokes/construct-js
// Definitions by:
//  - Francis Stokes <https://github.com/francisrstokes/

export type FieldValue = Struct
  | BitStruct
  | U8s
  | S8s
  | U8
  | S8
  | U16LEs
  | U16BEs
  | S16LEs
  | S16BEs
  | U16LE
  | U16BE
  | S16LE
  | S16BE
  | U32LEs
  | U32BEs
  | S32LEs
  | S32BEs
  | U32LE
  | U32BE
  | S32LE
  | S32BE
  | Pointer8
  | Pointer16
  | Pointer32
  | SizeOf8
  | SizeOf16
  | SizeOf32
  | RawString
  | NullTerminatedString;

declare class Struct {
  /**
   * Adds a field to the struct. *name* is used to lookup the field using `struct.get(name)`. *value* must be either a `Struct` or one of the other data types provided by construct-js.
   */
  field(name:string, value:FieldValue): Struct;

  /**
   * Returns the [field](#field) with that *name*.
   */
  get(name:string): FieldValue;

  /**
   * Returns the byte offset within the struct of the [field](#field) with that *name*.
   */
  getOffset(name:string): number;

  /**
   * Returns the [field](#field) within multiple structs, where *path* is a `.` separated string. For example:
   */
  getDeep(path:string): FieldValue;

  /**
   * Returns the byte offset within multiple structs, where *path* is a `.` separated string.
   */
  getDeepOffset(path:string): number;

  /**
   * Returns the size of the struct in bytes.
   */
  computeBufferSize(): number;

  /**
   * Returns a `Buffer` representation of the Struct.
   */
  toBuffer(): Buffer;

  /**
   * Returns a regular `Array` representation of the Struct.
   */
  toBytes(): number[];

  /**
   * Returns an `ArrayBuffer` representation of the Struct. You should use this if working in the browser.
   */
  toArrayBuffer(): ArrayBuffer;
}

declare class Field<OuterType, InnerType> {
  /**
  * Sets either the value or values of the field.
  */
  set(values: number | number[]): OuterType;

  /**
  * Manually sets this field to little or big endian.
  */
  setIsLittleEndian(value: boolean): OuterType;

  /**
  * Returns the value of this field, as originally specified.
  */
  value(): InnerType;
}

declare class BitStruct {
  /**
   * Sets a multi-bit flag of *size*.
   */
  multiBit(name:string, size:number, value:number): BitStruct;

  /**
   * Sets a 1-bit flag in the structure.
   */
  flag(name:string, value:number): BitStruct;

  /**
   * Gets the **bit** offset of the data with *name*.
   */
  getOffset(name:string): number;

  /**
   * Returns the size of the BitStruct in **bytes**.
   */
  computeBufferSize(): number;

  /**
   * Returns a byte-aligned `Buffer` representing the BitStruct.
   */
  toBuffer(): Buffer;

  /**
   * Returns a byte-aligned `Array` representing the BitStruct.
   */
  toBytes(): number[];
}

declare class U8s extends Field<U8s, number> { #__nonEmptyClass; }
declare class S8s extends Field<S8s, number> { #__nonEmptyClass; }
declare class U8 extends Field<U8, number> { #__nonEmptyClass; }
declare class S8 extends Field<S8, number> { #__nonEmptyClass; }
declare class U16LEs extends Field<U16LEs, number[]> { #__nonEmptyClass; }
declare class U16BEs extends Field<U16BEs, number[]> { #__nonEmptyClass; }
declare class S16LEs extends Field<S16LEs, number[]> { #__nonEmptyClass; }
declare class S16BEs extends Field<S16BEs, number[]> { #__nonEmptyClass; }
declare class U16LE extends Field<U16LE, number> { #__nonEmptyClass; }
declare class U16BE extends Field<U16BE, number> { #__nonEmptyClass; }
declare class S16LE extends Field<S16LE, number> { #__nonEmptyClass; }
declare class S16BE extends Field<S16BE, number> { #__nonEmptyClass; }
declare class U32LEs extends Field<U32LEs, number[]> { #__nonEmptyClass; }
declare class U32BEs extends Field<U32BEs, number[]> { #__nonEmptyClass; }
declare class S32LEs extends Field<S32LEs, number[]> { #__nonEmptyClass; }
declare class S32BEs extends Field<S32BEs, number[]> { #__nonEmptyClass; }
declare class U32LE extends Field<U32LE, number> { #__nonEmptyClass; }
declare class U32BE extends Field<U32BE, number> { #__nonEmptyClass; }
declare class S32LE extends Field<S32LE, number> { #__nonEmptyClass; }
declare class S32BE extends Field<S32BE, number> { #__nonEmptyClass; }

declare class Pointer8 extends Field<Pointer8, number> {
  set(struct:Struct, path:string): Pointer8;
}

declare class Pointer16 extends Field<Pointer16, number> {
  set(struct:Struct, path:string): Pointer16;
}

declare class Pointer32 extends Field<Pointer32, number> {
  set(struct:Struct, path:string): Pointer32;
}

declare class SizeOf8 extends Field<SizeOf8, number> {
  set(struct:Struct, path:string): SizeOf8;
}

declare class SizeOf16 extends Field<SizeOf16, number> {
  set(struct:Struct, path:string): SizeOf16;
}

declare class SizeOf32 extends Field<SizeOf32, number> {
  set(struct:Struct, path:string): SizeOf32;
}

declare class RawString extends Field<RawString, string> {
  set(str: string): RawString;
}

declare class NullTerminatedString extends Field<NullTerminatedString, string> {
  set(str: string): NullTerminatedString;
}


/**
 * Creates a `Struct` object.
 */
export function Struct(name: string): Struct;
/**
 * A collection of 8-bit unsigned values.
 * If the argument provided is an array, then the size of the field is `array.length` bytes, with each value corresponding to an 8-bit interpretation of that value.
 */
export function U8s(data: number[]): U8s;
/**
 * A collection of 8-bit signed values.
 * If the argument provided is an array, then the size of the field is `array.length` bytes, with each value corresponding to an 8-bit interpretation of that value.
 */
export function S8s(data: number[]): S8s;
/**
 * A single 8-bit unsigned value.
 */
export function U8(data: number): U8;
/**
 * A single 8-bit signed value.
 */
export function S8(data: number): S8;
/**
 * A collection of 16-bit unsigned values, in little endian byte order.
 * If the argument provided is an array, then the size of the field is `array.length * 2` bytes, with each value corresponding to an 16-bit interpretation of that value.
 */
export function U16LEs(data: number[]): U16LEs;
/**
 * A collection of 16-bit unsigned values, in big endian byte order.
 * If the argument provided is an array, then the size of the field is `array.length * 2` bytes, with each value corresponding to an 16-bit interpretation of that value.
 */
export function U16BEs(data: number[]): U16BEs;
/**
 * A collection of 16-bit signed values, in little endian byte order.
 * If the argument provided is an array, then the size of the field is `array.length * 2` bytes, with each value corresponding to an 16-bit interpretation of that value.
 */
export function S16LEs(data: number[]): S16LEs;
/**
 * A collection of 16-bit signed values, in big endian byte order.
 * If the argument provided is an array, then the size of the field is `array.length * 2` bytes, with each value corresponding to an 16-bit interpretation of that value.
 */
export function S16BEs(data: number[]): S16BEs;
/**
 * A single 16-bit unsigned value, in little endian byte order.
 */
export function U16LE(data: number): U16LE;
/**
 * A single 16-bit unsigned value, in big endian byte order.
 */
export function U16BE(data: number): U16BE;
/**
 * A single 16-bit signed value, in little endian byte order.
 */
export function S16LE(data: number): S16LE;
/**
 * A single 16-bit signed value, in big endian byte order.
 */
export function S16BE(data: number): S16BE;
/**
 * A collection of 32-bit unsigned values, in little endian byte order.
 * If the argument provided is an array, then the size of the field is `array.length * 4` bytes, with each value corresponding to an 32-bit interpretation of that value.
 */
export function U32LEs(data: number[]): U32LEs;
/**
 * A collection of 32-bit unsigned values, in big endian byte order.
 * If the argument provided is an array, then the size of the field is `array.length * 4` bytes, with each value corresponding to an 32-bit interpretation of that value.
 */
export function U32BEs(data: number[]): U32BEs;
/**
 * A collection of 32-bit signed values, in little endian byte order.
 * If the argument provided is an array, then the size of the field is `array.length * 4` bytes, with each value corresponding to an 32-bit interpretation of that value.
 */
export function S32LEs(data: number[]): S32LEs;
/**
 * A collection of 32-bit signed values, in big endian byte order.
 * If the argument provided is an array, then the size of the field is `array.length * 4` bytes, with each value corresponding to an 32-bit interpretation of that value.
 */
export function S32BEs(data: number[]): S32BEs;
/**
 * A single 32-bit unsigned value, in little endian byte order.
 */
export function U32LE(data: number): U32LE;
/**
 * A single 32-bit unsigned value, in big endian byte order.
 */
export function U32BE(data: number): U32BE;
/**
 * A single 32-bit signed value, in little endian byte order.
 */
export function S32LE(data: number): S32LE;
/**
 * A single 32-bit signed value, in big endian byte order.
 */
export function S32BE(data: number): S32BE;
/**
 * `Pointer8` takes a [Struct](#Struct) and a path, and represents an 8-bit pointer (offset) to the field specified by the path in the provided struct.
 */
export function Pointer8(struct: Struct, path: string): Pointer8;
/**
 * `Pointer16` takes a [Struct](#Struct) and a path, and represents a 16-bit pointer (offset) to the field specified by the path in the provided struct - in either little endian or big endian format.
 */
export function Pointer16(struct: Struct, path: string): Pointer16;
/**
 * `Pointer32` takes a [Struct](#Struct) and a path, and represents a 32-bit pointer (offset) to the field specified by the path in the provided struct - in either little endian or big endian format.
 */
export function Pointer32(struct: Struct, path: string): Pointer32;
/**
 * `SizeOf8` takes a [Struct](#Struct) or a [Field](#Field), and represents the size of the Struct or the Field as an 8-bit unsigned integer.
 */
export function SizeOf8(struct: Struct, path: string): SizeOf8;
/**
 * `SizeOf16` take a [Struct](#Struct) or a [Field](#Field), and represents the size of the Struct or the Field as a 16-bit unsigned integer - in either little endian or big endian format.
 */
export function SizeOf16(struct: Struct, path: string): SizeOf16;
/**
 * `SizeOf32` take a [Struct](#Struct) or a [Field](#Field), and represents the size of the Struct or the Field as a 32-bit unsigned integer - in either little endian or big endian format.
 */
export function SizeOf32(struct: Struct, path: string): SizeOf32;
/**
 * A collection of 8-bit unsigned values, interpreted directly from the string provided. The size of the field is the **byte length** of the string (which is not always the `string.length` when considering unicode).
 */
export function RawString(str: string): RawString;
/**
 * A collection of 8-bit unsigned values, interpreted directly from the string provided. The size of the field is the **byte length** of the string (which is not always the `string.length` when considering unicode). This field appends a single `0x00` byte to the end of the data.
 */
export function NullTerminatedString(str: string): NullTerminatedString;
/**
 * Creates a BitStruct object, for storing and addressing data on the sub-byte level. If using `BitStructLSB`, the resulting buffer will consider the fields to be ordered from the 0th bit i.e. the first field in the BitStruct will be the least significant bit in the Buffer. If using `BitStructMSB`, the Buffer will write the bits in the opposite order
 * **Note**: When [bitStruct.toBuffer()](#tobuffer-1) is used, the resulting buffer will be byte aligned. This means if the size of the BitStruct is 12-bits, the resulting buffer will be 16-bits (2 bytes). When using `BitStructLSB`, the most significant bits will be padded.
 */
export function BitStructLSB(name: string): BitStruct;
/**
 * Creates a BitStruct object, for storing and addressing data on the sub-byte level. If using `BitStructLSB`, the resulting buffer will consider the fields to be ordered from the 0th bit i.e. the first field in the BitStruct will be the least significant bit in the Buffer. If using `BitStructMSB`, the Buffer will write the bits in the opposite order
 * **Note**: When [bitStruct.toBuffer()](#tobuffer-1) is used, the resulting buffer will be byte aligned. This means if the size of the BitStruct is 12-bits, the resulting buffer will be 16-bits (2 bytes). When using `BitStructLSB`, the most significant bits will be padded.
 */
export function BitStructMSB(name: string): BitStruct;
