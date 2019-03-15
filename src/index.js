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

    this.arrayBuffer = new ArrayBuffer(size * this.byteWidth);
    this.dataView = new DataView(this.arrayBuffer);
    this.buffer = Buffer.from(this.arrayBuffer);
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
    this.buffer = Buffer.from(this.arrayBuffer);
    this.byteLength = this.buffer.byteLength;
    return this;
  }

  setIsLittleEndian(value) {
    if (this.littleEndian !== Boolean(value)) {
      this.littleEndian = Boolean(value);
      this.set(this.raw);
    }
    return this;
  }
}

class Bytes extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(1, 'Uint8', false, sizeOrDataArray, littleEndian);
  }
}

class Words extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(2, 'Uint8', false, sizeOrDataArray, littleEndian);
  }
}

class DoubleWords extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(4, 'Uint8', false, sizeOrDataArray, littleEndian);
  }
}

class SignedBytes extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(1, 'Int8', false, sizeOrDataArray, littleEndian);
  }
}

class SignedWords extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(2, 'Int8', false, sizeOrDataArray, littleEndian);
  }
}

class SignedDoubleWords extends DataValue {
  constructor(sizeOrDataArray, littleEndian = true) {
    super(4, 'Int8', false, sizeOrDataArray, littleEndian);
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
    super(2, 'Uint8', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class DoubleWord extends DataValue {
  constructor(value, littleEndian = true) {
    super(4, 'Uint8', true, value, littleEndian);
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
    super(2, 'Int8', true, value, littleEndian);
  }
  set(value) {
    return super.set([value]);
  }
}

class SignedDoubleWord extends DataValue {
  constructor(value, littleEndian = true) {
    super(4, 'Int8', true, value, littleEndian);
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
        size += field.buffer.byteLength;
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
      return acc + field.buffer.byteLength;
    }, 0);
  }

  toBuffer() {
    return Buffer.concat(this.fields.reduce((acc, [_, field]) => {
      if (field instanceof Struct) {
        return [...acc, field.toBuffer()];
      }
      return [...acc, field.buffer];
    }, []));
  }
}


module.exports = {
  RawString: (str, littleEndian = true) => new Bytes(str.split('').map(c => c.charCodeAt(0)), littleEndian),
  Bytes: (sizeOrDataArray, littleEndian = true) => new Bytes(sizeOrDataArray, littleEndian),
  Words: (sizeOrDataArray, littleEndian = true) => new Words(sizeOrDataArray, littleEndian),
  DoubleWords: (sizeOrDataArray, littleEndian = true) => new DoubleWords(sizeOrDataArray, littleEndian),
  SignedBytes: (sizeOrDataArray, littleEndian = true) => new SignedBytes(sizeOrDataArray, littleEndian),
  SignedWords: (sizeOrDataArray, littleEndian = true) => new SignedWords(sizeOrDataArray, littleEndian),
  SignedDoubleWords: (sizeOrDataArray, littleEndian = true) => new SignedDoubleWords(sizeOrDataArray, littleEndian),

  Byte: (value, littleEndian = true) => new Byte(value, littleEndian),
  Word: (value, littleEndian = true) => new Word(value, littleEndian),
  DoubleWord: (value, littleEndian = true) => new DoubleWord(value, littleEndian),
  SignedByte: (value, littleEndian = true) => new SignedByte(value, littleEndian),
  SignedWord: (value, littleEndian = true) => new SignedWord(value, littleEndian),
  SignedDoubleWord: (value, littleEndian = true) => new SignedDoubleWord(value, littleEndian),

  Struct: (name, littleEndian = true) => new Struct(name, littleEndian),
};
