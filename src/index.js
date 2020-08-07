class Field {
  constructor(byteWidth, dataViewFn, isSingleValue, sizeOrDataArray, littleEndian = true) {
    this.byteWidth = byteWidth;
    this._dataViewSet = `set${dataViewFn}`;
    this._dataViewGet = `get${dataViewFn}`;

    let size;
    const gotArray = Array.isArray(sizeOrDataArray);
    if (!isSingleValue) {
      size = gotArray
        ? sizeOrDataArray.length
        : sizeOrDataArray;

      this.raw = gotArray ? sizeOrDataArray : Array.from({length: size}).fill(0);
    } else {
      this.raw = [sizeOrDataArray];
      size = 1;
    }

    this.byteLength = size * this.byteWidth;
    this.arrayBuffer = new ArrayBuffer(this.byteLength);
    this.dataView = new DataView(this.arrayBuffer);
    this.littleEndian = littleEndian;

    if (isSingleValue) {
      this.set([sizeOrDataArray]);
    } else if (gotArray) {
      this.set(sizeOrDataArray);
    }
  }

  set(values) {
    if (values.length !== this.size) {
      this.size = values.length;
      this.byteLength = this.size * this.byteWidth;
      this.arrayBuffer = new ArrayBuffer(this.byteLength);
      this.dataView = new DataView(this.arrayBuffer);
    }

    this.raw = values;
    values.forEach((data, index) => {
      this.dataView[this._dataViewSet](index * this.byteWidth, data, this.littleEndian);
    });

    return this;
  }

  setIsLittleEndian(value) {
    if (this.littleEndian !== Boolean(value)) {
      this.littleEndian = Boolean(value);
      this.set(this.raw);
    }
    return this;
  }

  toBuffer() {
    return Buffer.from(this.arrayBuffer);
  }

  toBytes() {
    const bytes = Array.from({length: this.byteLength});

    for (let i = 0; i < this.byteLength; i++) {
      bytes[i] = this.dataView.getUint8(i, this.littleEndian);
    }

    return bytes;
  }

  writeBytes(array, offset) {
    for (let i = offset; i < offset + this.byteLength; i++) {
      array[i] = this.dataView.getUint8(i - offset, this.littleEndian);
    }

    return offset + this.byteLength;
  }

  computeBufferSize() {
    return this.byteLength;
  }

  value() {
    if (this.raw.length === 1) {
      return this.raw[0]
    }
    return [...this.raw];
  }
}

class U8s extends Field {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(1, 'Uint8', false, sizeOrDataArray, littleEndian);
  }
}

class U16s extends Field {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(2, 'Uint16', false, sizeOrDataArray, littleEndian);
  }
}

class U32s extends Field {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(4, 'Uint32', false, sizeOrDataArray, littleEndian);
  }
}

class S8s extends Field {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(1, 'Int8', false, sizeOrDataArray, littleEndian);
  }
}

class S16s extends Field {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(2, 'Int16', false, sizeOrDataArray, littleEndian);
  }
}

class S32s extends Field {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(4, 'Int32', false, sizeOrDataArray, littleEndian);
  }
}

class U8 extends Field {
  constructor(value, littleEndian = true) {
    super(1, 'Uint8', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class U16 extends Field {
  constructor(value, littleEndian = true) {
    super(2, 'Uint16', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class U32 extends Field {
  constructor(value, littleEndian = true) {
    super(4, 'Uint32', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class S8 extends Field {
  constructor(value, littleEndian = true) {
    super(1, 'Int8', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class S16 extends Field {
  constructor(value, littleEndian = true) {
    super(2, 'Int16', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class S32 extends Field {
  constructor(value, littleEndian = true) {
    super(4, 'Int32', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class PointerBase extends Field {
  constructor(byteLength, dataViewFn, struct, path, littleEndian = true) {
    super(byteLength, dataViewFn, true, 0, littleEndian);
    this.isReferential = true;
    this.set(struct, path);
  }

  set(struct, path) {
    if (!this.isReferential) return;

    if (!(struct && struct.constructor === Struct)) {
      throw new Error('argument struct must be a Struct type');
    }
    this.struct = struct;
    this.path = path;
  }

  toBytes() {
    super.set([this.value()]);
    return super.toBytes();
  }

  writeBytes(bytes, offset) {
    const theseBytes = this.toBytes();
    theseBytes.forEach((value, index) => {
      bytes[offset + index] = value;
    });

    return offset + theseBytes.length;
  }

  value() {
    return this.struct.getDeepOffset(this.path);
  }
}

class SizeOfBase extends Field {
  constructor(byteLength, dataViewFn, structOrField, littleEndian = true) {
    super(byteLength, dataViewFn, true, 0, littleEndian);
    this.isReferential = true;
    this.set(structOrField);
  }

  set(structOrField) {
    if (!this.isReferential) return;

    const isStruct = structOrField instanceof Struct;
    const isField = structOrField instanceof Field;

    if (!isStruct && !isField) {
      throw new Error('argument must be a Struct or a Field');
    }

    this.structOrField = structOrField;
  }

  toBytes() {
    super.set([this.value()]);
    return super.toBytes();
  }

  writeBytes(bytes, offset) {
    const theseBytes = this.toBytes();
    theseBytes.forEach((value, index) => {
      bytes[offset + index] = value;
    });

    return offset + theseBytes.length;
  }

  value() {
    return this.structOrField.computeBufferSize();
  }
}

class SizeOf8 extends SizeOfBase {
  constructor(structOrField, littleEndian = true) {
    super(1, 'Uint8', structOrField, littleEndian);
  }
}

class SizeOf16 extends SizeOfBase {
  constructor(structOrField, littleEndian = true) {
    super(2, 'Uint16', structOrField, littleEndian);
  }
}

class SizeOf32 extends SizeOfBase {
  constructor(structOrField, littleEndian = true) {
    super(4, 'Uint32', structOrField, littleEndian);
  }
}

class Pointer8 extends PointerBase {
  constructor(struct, path, littleEndian = true) {
    super(1, 'Uint8', struct, path, littleEndian);
  }
}

class Pointer16 extends PointerBase {
  constructor(struct, path, littleEndian = true) {
    super(2, 'Uint16', struct, path, littleEndian);
  }
}

class Pointer32 extends PointerBase {
  constructor(struct, path, littleEndian = true) {
    super(4, 'Uint32', struct, path, littleEndian);
  }
}

class RawString extends Field {
  constructor(str) {
    super(1, 'Uint8', false, str.split('').map(c => c.charCodeAt(0)));
    this.hasInitialised = true;
  }

  set(str) {
    if (!this.hasInitialised) {
      return super.set(str);
    }
    return super.set(str.split('').map(c => c.charCodeAt(0)));
  }

  value() {
    return this.raw.map(c => String.fromCharCode(c)).join('');
  }
}

class NullTerminatedString extends Field {
  constructor(str) {
    super(1, 'Uint8', false, [...str.split('').map(c => c.charCodeAt(0)), 0]);
    this.hasInitialised = true;
  }

  set(str) {
    if (!this.hasInitialised) {
      return super.set(str);
    }
    return super.set([...str.split('').map(c => c.charCodeAt(0)), 0]);
  }

  value() {
    return this.raw.slice(0, this.raw.length-1).map(c => String.fromCharCode(c)).join('');
  }
}

class Struct {
  constructor(name) {
    this.name = name;
    this.fields = [];
  }

  field(name, value) {
    if (this.fields.find(([fieldName]) => fieldName === name)) {
      throw new Error(`Field name ${name} already exists in structure ${this.name}`);
    }
    this.fields.push([name, value]);

    return this;
  }

  get(name) {
    const field = this.fields.find(([fieldName]) => fieldName === name);
    if (!field) {
      throw new Error(`No Field ${name} in structure ${this.name}`);
    }
    return field[1];
  }

  getOffset(name) {
    const ind = this.fields.findIndex(([n]) => n === name);
    if (ind === -1) {
      throw new Error(`No field ${name} in Struct ${this.name}`);
    }

    let size = 0;
    for (let i = 0; i < ind; i++) {
      const field = this.fields[i][1];
      if (field instanceof Struct) {
        size += field.computeBufferSize();
      } else {
        size += field.byteLength;
      }
    }
    return size;
  }

  getDeep(path) {
    const parts = path.split('.');
    return parts.reduce((field, name) => {
      if (field instanceof Struct) {
        return field.get(name);
      } else {
        throw new Error(`Can't read ${name} from non-struct`);
      }
    }, this);
  }

  getDeepOffset(path) {
    const parts = path.split('.');
    const [_, offset] = parts.reduce(([field, total], name) => {
      const offset = field.getOffset(name);
      return [field.get(name), total + offset];
    }, [this, 0]);
    return offset;
  }

  computeBufferSize() {
    return this.fields.reduce((acc, [_, field]) => {
      if (field instanceof Struct) {
        return acc + field.computeBufferSize();
      }
      return acc + field.byteLength;
    }, 0);
  }

  toBuffer() {
    return Buffer.from(this.toBytes());
  }

  toBytes() {
    const bytes = Array.from({length: this.computeBufferSize()});
    let offset = 0;

    this.fields.forEach(([_, field]) => {
      offset = field.writeBytes(bytes, offset);
    });

    return bytes;
  }

  writeBytes(bytes, offset) {
    let newOffset = offset;

    this.fields.forEach(([_, field]) => {
      newOffset = field.writeBytes(bytes, newOffset);
    });

    return newOffset;
  }

  toArrayBuffer() {
    const bytes = this.toBytes();
    const ab = new ArrayBuffer(bytes.length);
    const view = new DataView(ab);
    for (let i = 0; i < bytes.length; i++) {
      view.setUint8(i, bytes[i]);
    }
    return ab;
  }
}

class Bits {
  constructor(size, value = 0) {
    this._size = size;
    this._value = value;
  }

  set(value) {
    this._value = value;
    return this;
  }

  getBits() {
    return Array.from({length: this._size}, (_, i) => {
      const shift = this._size - (i+1)
      return (this._value >> shift) & 0x01
    });
  }

  value() {
    return this._value;
  }

  size() {
    return this._size;
  }
}

class BitStruct extends Struct {
  constructor(name, lsbFirst = true) {
    super(name);
    this._lsbFirst = lsbFirst;
  }

  multiBit(name, size, value) {
    this.fields.push([name, new Bits(size, value)]);
    return this;
  }

  field(name, size, value) {
    return this.multiBit(name, size, value);
  }

  flag(name, value) {
    this.fields.push([name, new Bits(1, value)]);
    return this;
  }

  getOffset(name) {
    const ind = this.fields.findIndex(([n]) => n === name);
    if (ind === -1) {
      throw new Error(`No field ${name} in BitStruct ${this.name}`);
    }

    let size = 0;
    for (let i = 0; i < ind; i++) {
      const field = this.fields[i][1];
        size += field._size;
    }
    return size;
  }

  computeBufferSize() {
    const bits = this.fields.reduce((acc, [_, {_size}]) => acc + _size, 0);
    return Math.ceil(bits / 8);
  }

  toBuffer() {
    return Buffer.from(this.toBytes());
  }

  toBytes() {
    const bits = this.fields.reduce((bits, [_, field]) => {
      const fieldBits = field.getBits();
      if (this._lsbFirst) fieldBits.reverse();

      return [...bits, ...fieldBits];
    }, []);

    return bits.reduce((bytes, bit, i) => {
      const byteIndex = Math.floor(i/8);
      const bitIndex = i % 8;
      const shift = this._lsbFirst ? bitIndex : 7 - bitIndex;
      bytes[byteIndex] += bit << shift;
      return bytes;
    }, Array.from({length: this.computeBufferSize()}).fill(0));
  }

  writeBytes(array, offset) {
    const bytes = this.toBytes();

    for (let i = offset; i < offset + bytes.length; i++) {
      array[i] = bytes[i - offset];
    }

    return offset + bytes.length;
  }
}

module.exports = {
  RawString: str => new RawString(str),
  NullTerminatedString: str => new NullTerminatedString(str),

  U8s: (sizeOrDataArray) => new U8s(sizeOrDataArray),
  S8s: (sizeOrDataArray) => new S8s(sizeOrDataArray),
  U8: (value) => new U8(value),
  S8: (value) => new S8(value),

  U16LEs: (sizeOrDataArray) => new U16s(sizeOrDataArray, true),
  U16BEs: (sizeOrDataArray) => new U16s(sizeOrDataArray, false),
  S16LEs: (sizeOrDataArray) => new S16s(sizeOrDataArray, true),
  S16BEs: (sizeOrDataArray) => new S16s(sizeOrDataArray, false),
  U16LE: (value) => new U16(value, true),
  U16BE: (value) => new U16(value, false),
  S16LE: (value) => new S16(value, true),
  S16BE: (value) => new S16(value, false),

  U32LEs: (sizeOrDataArray) => new U32s(sizeOrDataArray, true),
  U32BEs: (sizeOrDataArray) => new U32s(sizeOrDataArray, false),
  S32LEs: (sizeOrDataArray) => new S32s(sizeOrDataArray, true),
  S32BEs: (sizeOrDataArray) => new S32s(sizeOrDataArray, false),
  U32LE: (value) => new U32(value, true),
  U32BE: (value) => new U32(value, false),
  S32LE: (value) => new S32(value, true),
  S32BE: (value) => new S32(value, false),

  Pointer8: (struct, path) => new Pointer8(struct, path),
  Pointer16LE: (struct, path) => new Pointer16(struct, path, true),
  Pointer16BE: (struct, path) => new Pointer16(struct, path, false),
  Pointer32LE: (struct, path) => new Pointer32(struct, path, true),
  Pointer32BE: (struct, path) => new Pointer32(struct, path, false),

  SizeOf8: (struct) => new SizeOf8(struct),
  SizeOf16LE: (struct) => new SizeOf16(struct, true),
  SizeOf16BE: (struct) => new SizeOf16(struct, false),
  SizeOf32LE: (struct) => new SizeOf32(struct, true),
  SizeOf32BE: (struct) => new SizeOf32(struct, false),

  Struct: (name) => new Struct(name),
  BitStructLSB: (name) => new BitStruct(name, true),
  BitStructMSB: (name) => new BitStruct(name, false),
};
