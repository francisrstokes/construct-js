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

class Bytes extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(1, 'Uint8', false, sizeOrDataArray, littleEndian);
  }
}

class Words extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(2, 'Uint16', false, sizeOrDataArray, littleEndian);
  }
}

class DoubleWords extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(4, 'Uint32', false, sizeOrDataArray, littleEndian);
  }
}

class SignedBytes extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(1, 'Int8', false, sizeOrDataArray, littleEndian);
  }
}

class SignedWords extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(2, 'Int16', false, sizeOrDataArray, littleEndian);
  }
}

class SignedDoubleWords extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(4, 'Int32', false, sizeOrDataArray, littleEndian);
  }
}

class Byte extends DataValue {
  constructor(value, littleEndian = true) {
    super(1, 'Uint8', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class Word extends DataValue {
  constructor(value, littleEndian = true) {
    super(2, 'Uint16', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class DoubleWord extends DataValue {
  constructor(value, littleEndian = true) {
    super(4, 'Uint32', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class SignedByte extends DataValue {
  constructor(value, littleEndian = true) {
    super(1, 'Int8', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class SignedWord extends DataValue {
  constructor(value, littleEndian = true) {
    super(2, 'Int16', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class SignedDoubleWord extends DataValue {
  constructor(value, littleEndian = true) {
    super(4, 'Int32', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class Struct {
  constructor(name, littleEndian = true) {
    this.name = name;
    this.littleEndian = littleEndian;
    this.forceEndianess = true;
    this.fields = [];
  }

  field(name, value) {
    if (this.fields.find(([fieldName]) => fieldName === name)) {
      throw new Error(`Field name ${name} already exists in structure ${this.name}`);
    }
    this.fields.push([name, value]);

    if (this.forceEndianess) {
      if (value instanceof Struct) {
          value.forceEndianess = true;
      } else if (value instanceof DataValue) {
          value.setIsLittleEndian(this.littleEndian);
      }
    }

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
    return Buffer.concat(this.fields.reduce((acc, [_, field]) => {
      if (field instanceof Struct) {
        return [...acc, field.toBuffer()];
      }
      return [...acc, field.toBuffer()];
    }, []));
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
  RawString: (str, littleEndian = true) => new Bytes(str.split('').map(c => c.charCodeAt(0)), littleEndian),

  U8s: (sizeOrDataArray, littleEndian = true) => new Bytes(sizeOrDataArray, littleEndian),
  U16s: (sizeOrDataArray, littleEndian = true) => new Words(sizeOrDataArray, littleEndian),
  U32s: (sizeOrDataArray, littleEndian = true) => new DoubleWords(sizeOrDataArray, littleEndian),
  I8s: (sizeOrDataArray, littleEndian = true) => new SignedBytes(sizeOrDataArray, littleEndian),
  I16s: (sizeOrDataArray, littleEndian = true) => new SignedWords(sizeOrDataArray, littleEndian),
  I32s: (sizeOrDataArray, littleEndian = true) => new SignedDoubleWords(sizeOrDataArray, littleEndian),

  Bytes: (sizeOrDataArray, littleEndian = true) => new Bytes(sizeOrDataArray, littleEndian),
  Words: (sizeOrDataArray, littleEndian = true) => new Words(sizeOrDataArray, littleEndian),
  DoubleWords: (sizeOrDataArray, littleEndian = true) => new DoubleWords(sizeOrDataArray, littleEndian),
  SignedBytes: (sizeOrDataArray, littleEndian = true) => new SignedBytes(sizeOrDataArray, littleEndian),
  SignedWords: (sizeOrDataArray, littleEndian = true) => new SignedWords(sizeOrDataArray, littleEndian),
  SignedDoubleWords: (sizeOrDataArray, littleEndian = true) => new SignedDoubleWords(sizeOrDataArray, littleEndian),

  U8: (value, littleEndian = true) => new Byte(value, littleEndian),
  U16: (value, littleEndian = true) => new Word(value, littleEndian),
  U32: (value, littleEndian = true) => new DoubleWord(value, littleEndian),
  I8: (value, littleEndian = true) => new SignedByte(value, littleEndian),
  I16: (value, littleEndian = true) => new SignedWord(value, littleEndian),
  I32: (value, littleEndian = true) => new SignedDoubleWord(value, littleEndian),

  Byte: (value, littleEndian = true) => new Byte(value, littleEndian),
  Word: (value, littleEndian = true) => new Word(value, littleEndian),
  DoubleWord: (value, littleEndian = true) => new DoubleWord(value, littleEndian),
  SignedByte: (value, littleEndian = true) => new SignedByte(value, littleEndian),
  SignedWord: (value, littleEndian = true) => new SignedWord(value, littleEndian),
  SignedDoubleWord: (value, littleEndian = true) => new SignedDoubleWord(value, littleEndian),

  Struct: (name, littleEndian = true) => new Struct(name, littleEndian),
  BitStruct: (name, lsbFirst = true) => new BitStruct(name, lsbFirst),
};
