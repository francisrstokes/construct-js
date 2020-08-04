const {assert} = require('chai');
const {
  Struct,
  U8, U16, U32,
  S8, S16, S32,
  U8s, U16s, U32s,
  S8s, S16s, S32s,
  Pointer8, Pointer16, Pointer32,
  RawString,
  BitStruct
} = require('./src');

const compareExpectedBytes = (structure, expectedBytes) => {
  const bytes = structure.toBytes();
  const arrayBuffer = structure.toArrayBuffer();
  const buffer = structure.toBuffer();
  const expectedArrayBuffer = new Uint8Array(expectedBytes).buffer;
  assert.deepEqual(bytes, expectedBytes);
  assert.deepEqual(buffer, Buffer.from(expectedBytes));
  assert.deepEqual(arrayBuffer, expectedArrayBuffer);
};

const compareExpectedBytesTest = (name, structure, expectedBytes) =>
  it(name, () => compareExpectedBytes(structure, expectedBytes));

const expectedFailureTest = (name, structureThunk, errorMsg) =>
  it(name, () => assert.throws(structureThunk, errorMsg));

describe('basic', () => {
  compareExpectedBytesTest('Struct with bytes',
    Struct('test')
      .field('b1', U8(0x01))
      .field('b2', U8(0x02))
      .field('b3', U8(0x03)),
    [1, 2, 3]
  );

  compareExpectedBytesTest('Struct with signed values',
    Struct('test')
      .field('b1', S8(-128))
      .field('b2', S16(-10000, false))
      .field('b3', S16(-10000, true))
      .field('b4', S32(-10000000, false)),
    [0x80, 0xd8, 0xf0, 0xf0, 0xd8, 0xff, 0x67, 0x69, 0x80]
  );

  compareExpectedBytesTest('Struct with multi-value fields',
    Struct('test')
      .field('b1', U8s([0x01, 0x02, 0x03]))
      .field('b2', U16s([0x0405, 0x0607]))
      .field('b3', U32s([0x08090a0b, 0x0c0d0e0f], false))
      .field('b4', S8s([-1, -2, -3]))
      .field('b5', S16s([-4, -5, -6]))
      .field('b6', S32s([-7, -8, -9], false)),
    [
      1, 2, 3,
      5, 4, 7,
      6, 8, 9, 10, 11, 12, 13, 14, 15,
      0xff, 0xfe, 0xfd,
      0xfc, 0xff, 0xfb, 0xff, 0xfa, 0xff,
      0xff, 0xff, 0xff, 0xf9, 0xff, 0xff, 0xff, 0xf8, 0xff, 0xff, 0xff, 0xf7
    ]
  );

  compareExpectedBytesTest('Struct with raw string',
    Struct('test')
      .field('b1', U8(0x01))
      .field('b2', RawString("hello"))
      .field('b3', U16(0x0000)),
    [1, ...("hello".split('').map(x => x.charCodeAt(0))), 0, 0]
  );

  compareExpectedBytesTest('Little endian U16',
    Struct('test')
      .field('b1', U8(0x01))
      .field('b2', U16(0x0203, true))
      .field('b3', U8(0x04)),
    [1, 3, 2, 4]
  );

  compareExpectedBytesTest('Big endian U16',
    Struct('test')
      .field('b1', U8(0x01))
      .field('b2', U16(0x0203, false))
      .field('b3', U8(0x04)),
    [1, 2, 3, 4]
  );

  compareExpectedBytesTest('Little endian U32',
    Struct('test')
      .field('b1', U8(0x01))
      .field('b2', U16(0x0203, false))
      .field('b3', U32(0x04050607, true))
      .field('b4', U8(0x08)),
    [1, 2, 3, 7, 6, 5, 4, 8]
  );

  compareExpectedBytesTest('Big endian U32',
    Struct('test')
      .field('b1', U8(0x01))
      .field('b2', U16(0x0203, false))
      .field('b3', U32(0x04050607, false))
      .field('b4', U8(0x08)),
    [1, 2, 3, 4, 5, 6, 7, 8]
  );

  compareExpectedBytesTest('Struct in a Struct',
    Struct('test')
      .field('s1',
        Struct('s2')
          .field('s2b1', U8(0x01))
          .field('s2b2', U16(0x0203, true))
      )
      .field('b1', U32(0x04050607, false)),
    [1, 3, 2, 4, 5, 6, 7]
  );

  expectedFailureTest('Field names are unique',
    () => Struct('test')
      .field('a', U8(0x01))
      .field('a', U8(0x02)),
    'Field name a already exists in structure test'
  );

  expectedFailureTest('Can only get fields that exist',
    () => Struct('test')
      .field('a', U8(0x01))
      .get('b'),
    'No Field b in structure test'
  );

  expectedFailureTest('Can only get offsets of fields that exist',
    () => Struct('test')
      .field('a', U8(0x01))
      .getOffset('b'),
    'No field b in Struct test'
  );

  it('possible to change a fields endianness', () => {
    const f = U32(0x01020304);
    const s = Struct('test').field('b1', f);
    compareExpectedBytes(s, [4, 3, 2, 1]);

    f.setIsLittleEndian(false);
    compareExpectedBytes(s, [1, 2, 3, 4]);
  });
});

describe('pointers', () => {
  const s1 = Struct('test');
  s1
    .field('b1', U8(0x01))
    .field('b2', U8(0x02))
    .field('pointer', Pointer8(s1, 'b2'))
    .field('b3', U8(0x03))
    .field('b4', U8(0x04));
  compareExpectedBytesTest('Pointer8', s1, [1, 2, 1, 3, 4]);

  const s2 = Struct('test');
  s2
    .field('b1', U8(0x01))
    .field('b2', U16(0x0203, false))
    .field('b3', U8(0x04))
    .field('pointer', Pointer16(s2, 'b3', true))
    .field('b4', U8(0x05));
  compareExpectedBytesTest('Pointer16 little endian', s2, [1, 2, 3, 4, 3, 0, 5]);

  const s3 = Struct('test');
  s3
    .field('b1', U8(0x01))
    .field('b2', U16(0x0203, false))
    .field('b3', U8(0x04))
    .field('pointer', Pointer16(s3, 'b3', false))
    .field('b4', U8(0x05));
  compareExpectedBytesTest('Pointer16 big endian', s3, [1, 2, 3, 4, 0, 3, 5]);

  const s4 = Struct('test');
  s4
    .field('b1', U8(0x01))
    .field('b2', U16(0x0203, false))
    .field('b3', U8(0x04))
    .field('pointer', Pointer32(s4, 'b3', true))
    .field('b4', U8(0x05));
  compareExpectedBytesTest('Pointer32 little endian', s4, [1, 2, 3, 4, 3, 0, 0, 0, 5]);

  const s5 = Struct('test');
  s5
    .field('b1', U8(0x01))
    .field('b2', U16(0x0203, false))
    .field('b3', U8(0x04))
    .field('pointer', Pointer32(s5, 'b3', false))
    .field('b4', U8(0x05));
  compareExpectedBytesTest('Pointer32 big endian', s5, [1, 2, 3, 4, 0, 0, 0, 3, 5]);

  expectedFailureTest('Pointers fail when made concrete',
    () => {
      const s = Struct('whatevs');
      s.field('pointer', Pointer8(s, 'x'));
      s.toArrayBuffer();
    },
    'No field x in Struct whatevs'
  );

  expectedFailureTest('Using an invalid struct fails',
    () => {
      const s = Struct('whatevs');
      s.field('pointer', Pointer8({}, 'x'));
      s.toArrayBuffer();
    },
    'argument struct must be a Struct'
  );

  expectedFailureTest('Setting an invalid struct fails',
    () => {
      const s = Struct('whatevs');
      s.field('pointer', Pointer8(s, 'x'));
      s.get('pointer').set({}, 'bleh');
      s.toArrayBuffer();
    },
    'argument struct must be a Struct'
  );
});

describe('getters/setters/offsets', () => {
  it('getting a pointer to a field in a struct', () => {
    const s = Struct('test')
      .field('b1', U8(0x01))
      .field('pointee', U16(0x0203))
      .field('b3', U32(0x04050607))
      .field('pointer', U16(0xeeee))
      .field('b4', U16(0x0809));
    const offset = s.getOffset('pointee');
    s.get('pointer').set(offset);

    compareExpectedBytes(s, [1, 3, 2, 7, 6, 5, 4, 1, 0, 9, 8]);
  });

  it('referencing a size in a struct', () => {
    const s = Struct('test')
      .field('b1', U8(0x01))
      .field('b2', U8(0x02))
      .field('b3', U8(0x03))
      .field('size', U32(0xffffffff, false));

    const size = s.computeBufferSize();
    s.get('size').set(size);

    compareExpectedBytes(s, [1, 2, 3, 0, 0, 0, 7]);
  });

  it('getting a pointer to a field in a deep struct', () => {
    const s = Struct('test')
      .field('b1', U8(0x01))
      .field('innerStruct',
        Struct('inner')
          .field('i1', U8(0x02))
          .field('i2', U16(0x0304))
          .field('i3', U32(0x05060708))
          .field('i4', U8(0x09))
      )
      .field('b2', U8(0x0a))
      .field('pointer', U8(0xff))
      .field('b4', U16(0x0b0c));

    const offset = s.getDeepOffset('innerStruct.i3');
    s.get('pointer').set(offset);

    compareExpectedBytes(s, [1, 2, 4, 3, 8, 7, 6, 5, 9, 10, 4, 12, 11]);
  });

  it('referencing a size in a deep struct', () => {
    const s = Struct('test')
      .field('b1', U8(0x01))
      .field('innerStruct',
        Struct('inner')
          .field('i1', U8(0x02))
          .field('innerInner',
            Struct('inner2')
              .field('i2', U16(0x0304))
              .field('i3', U32(0x05060708))
              .field('i4', U8(0x09))
          )
          .field('i2', U8(0x0a))
      )
      .field('b2', U8(0x0b))
      .field('size', U8(0xff))
      .field('b4', U16(0x0c0d));

    const size = s.getDeep('innerStruct.innerInner').computeBufferSize();
    s.get('size').set(size);

    compareExpectedBytes(s, [1, 2, 4, 3, 8, 7, 6, 5, 9, 10, 11, 7, 13, 12]);
  });
});

describe('bit structs', () => {
  compareExpectedBytesTest('Aligned BitStruct',
    Struct('test')
      .field('b1',
        BitStruct('bits', false)
          .flag('f1', 1)
          .flag('f2', 0)
          .multiBit('f3', 4, 0b1101)
          .multiBit('f4', 2, 0b01)
      )
      .field('b2',
        BitStruct('bits', true)
          .flag('f1', 1)
          .flag('f2', 0)
          .multiBit('f3', 4, 0b1101)
          .multiBit('f4', 2, 0b01)
      ),
    [0b10110101, 0b01110101]
  );

  compareExpectedBytesTest('Unaligned BitStruct',
    Struct('test')
      .field('b1',
        BitStruct('bits', false)
          .flag('f1', 1)
          .flag('f2', 0)
          .multiBit('f3', 4, 0b1101)
      )
      .field('b2',
        BitStruct('bits', true)
          .flag('f1', 1)
          .flag('f2', 0)
          .multiBit('f3', 4, 0b1101)
      )
      .field('u8', U8(0xff)),
    [0b10110100, 0b110101, 0xff]
  );
});
