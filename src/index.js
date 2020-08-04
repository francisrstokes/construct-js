class DataValue {
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

  getOffset() {
    return 0;
  }

  set(values) {
    this.raw = values;
    values.forEach((data, index) => {
      this.dataView[this._dataViewSet](index * this.byteWidth, data, this.littleEndian);
    });

    this.size = this.raw.length;
    this.byteLength = this.size * this.byteWidth;
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
}

class U8s extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(1, 'Uint8', false, sizeOrDataArray, littleEndian);
  }
}

class U16s extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(2, 'Uint16', false, sizeOrDataArray, littleEndian);
  }
}

class U32s extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(4, 'Uint32', false, sizeOrDataArray, littleEndian);
  }
}

class S8s extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(1, 'Int8', false, sizeOrDataArray, littleEndian);
  }
}

class S16s extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(2, 'Int16', false, sizeOrDataArray, littleEndian);
  }
}

class S32s extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(4, 'Int32', false, sizeOrDataArray, littleEndian);
  }
}

class U8 extends DataValue {
  constructor(value, littleEndian = true) {
    super(1, 'Uint8', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class U16 extends DataValue {
  constructor(value, littleEndian = true) {
    super(2, 'Uint16', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class U32 extends DataValue {
  constructor(value, littleEndian = true) {
    super(4, 'Uint32', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class S8 extends DataValue {
  constructor(value, littleEndian = true) {
    super(1, 'Int8', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class S16 extends DataValue {
  constructor(value, littleEndian = true) {
    super(2, 'Int16', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class S32 extends DataValue {
  constructor(value, littleEndian = true) {
    super(4, 'Int32', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class PointerBase extends DataValue {
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
    const value = this.struct.getDeepOffset(this.path);
    super.set([value]);
    return super.toBytes();
  }
  writeBytes(bytes, offset) {
    const theseBytes = this.toBytes();
    theseBytes.forEach((value, index) => {
      bytes[offset + index] = value;
    });

    return offset + theseBytes.length;
  }
}

class SizeOfBase extends DataValue {
  constructor(byteLength, dataViewFn, structOrField, littleEndian = true) {
    super(byteLength, dataViewFn, true, 0, littleEndian);
    this.isReferential = true;
    this.set(structOrField);
  }
  set(structOrField) {
    if (!this.isReferential) return;

    const isStruct = structOrField instanceof Struct;
    const isField = structOrField instanceof DataValue;

    if (!isStruct && !isField) {
      throw new Error('argument must be a Struct or a Field');
    }

    this.structOrField = structOrField
  }
  toBytes() {
    const value = this.structOrField.computeBufferSize();
    super.set([value]);
    return super.toBytes();
  }
  writeBytes(bytes, offset) {
    const theseBytes = this.toBytes();
    theseBytes.forEach((value, index) => {
      bytes[offset + index] = value;
    });

    return offset + theseBytes.length;
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
        return field;
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
  RawString: (str, littleEndian = true) => new U8s(str.split('').map(c => c.charCodeAt(0)), littleEndian),

  U8s: (sizeOrDataArray, littleEndian = true) => new U8s(sizeOrDataArray, littleEndian),
  U16s: (sizeOrDataArray, littleEndian = true) => new U16s(sizeOrDataArray, littleEndian),
  U32s: (sizeOrDataArray, littleEndian = true) => new U32s(sizeOrDataArray, littleEndian),
  S8s: (sizeOrDataArray, littleEndian = true) => new S8s(sizeOrDataArray, littleEndian),
  S16s: (sizeOrDataArray, littleEndian = true) => new S16s(sizeOrDataArray, littleEndian),
  S32s: (sizeOrDataArray, littleEndian = true) => new S32s(sizeOrDataArray, littleEndian),

  U8: (value, littleEndian = true) => new U8(value, littleEndian),
  U16: (value, littleEndian = true) => new U16(value, littleEndian),
  U32: (value, littleEndian = true) => new U32(value, littleEndian),
  S8: (value, littleEndian = true) => new S8(value, littleEndian),
  S16: (value, littleEndian = true) => new S16(value, littleEndian),
  S32: (value, littleEndian = true) => new S32(value, littleEndian),

  Pointer8: (struct, path, littleEndian = true) => new Pointer8(struct, path, littleEndian),
  Pointer16: (struct, path, littleEndian = true) => new Pointer16(struct, path, littleEndian),
  Pointer32: (struct, path, littleEndian = true) => new Pointer32(struct, path, littleEndian),

  SizeOf8: (struct, littleEndian = true) => new SizeOf8(struct, littleEndian),
  SizeOf16: (struct, littleEndian = true) => new SizeOf16(struct, littleEndian),
  SizeOf32: (struct, littleEndian = true) => new SizeOf32(struct, littleEndian),

  Struct: (name) => new Struct(name),
  BitStruct: (name, lsbFirst = true) => new BitStruct(name, lsbFirst),
};
