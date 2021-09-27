import {expect} from 'chai';
import {
  I16,
  I8,
  Struct,
  U8,
  U32,
  RawString,
  NullTerminatedString,
  U64,
  Endian,
  SizeOf8,
  SizeOf16,
  SizeOf32,
  SizeOf64,
  U8s,
  U16s,
  U32s,
  U64s,
  I8s,
  I16s,
  I32s,
  I64s,
  Pointer8,
  Pointer16,
  Pointer32,
  Pointer64,
  StructAlignment,
  U16,
  AlignmentPadding,
  DataType,
  I64,
  I32,
  ConstructDataType
} from './src';

const expectEqualBuffers = (buffer: Uint8Array, expected: Array<number>) => {
  expect(buffer.join(', ')).to.equal(expected.join(', '));
}

const basicStruct = Struct('Hello')
  .field('a', U8(1))
  .field('b', I8(-1))
  .field('c', I16(-2))
  .field('d', U32(0x01020304))
  .field('e', U64(0x0102030405060708n))
  .field('f', RawString('hello!'))
  .field('g', NullTerminatedString('world!'));

const basicStructData = [
  1, 0xff, 0xfe, 0xff, 4, 3, 2, 1, 8, 7, 6, 5, 4, 3, 2, 1,
  ...'hello!'.split('').map(c => c.charCodeAt(0)),
  ...'world!'.split('').map(c => c.charCodeAt(0)), 0
];

describe('ConstructJS', () => {
  it('should create an empty struct', () => {
    const s = Struct('Hello');
    expectEqualBuffers(s.toUint8Array(), []);
  });

  it('should create a struct with basic data types', () => {
    expectEqualBuffers(basicStruct.toUint8Array(), basicStructData);
  });

  it('should respect endianness', () => {
    const s = Struct('Hello')
      .field('a', U8(1))
      .field('b', I8(-1))
      .field('c', I16(-2, Endian.Big))
      .field('d', U32(0x01020304, Endian.Big))
      .field('e', U64(0x0102030405060708n, Endian.Big))
      .field('f', RawString('hello!'))
      .field('g', NullTerminatedString('world!'))

    expectEqualBuffers(s.toUint8Array(), [
      1, 0xff, 0xff, 0xfe, 1, 2, 3, 4, 1, 2, 3, 4, 5, 6, 7, 8,
      ...'hello!'.split('').map(c => c.charCodeAt(0)),
      ...'world!'.split('').map(c => c.charCodeAt(0)), 0
    ]);
  });

  it('should calculate the size of fields', () => {
    const outerStruct = Struct('outer')
      .field('inner', basicStruct)
      .field('sizeofInner', SizeOf8(basicStruct))
      .field('sizeofInner16', SizeOf16(basicStruct))
      .field('sizeofInner32', SizeOf32(basicStruct))
      .field('sizeofInner64', SizeOf64(basicStruct));

      expectEqualBuffers(outerStruct.toUint8Array(), [
        ...basicStructData,
        29, 29, 0, 29, 0, 0, 0, 29, 0, 0, 0, 0, 0, 0, 0
      ]);
  });

  it('should generate fields with arrays', () => {
    const s = Struct('Hello')
      .field('a', U8s([1, 2, 3, 4]))
      .field('ai', I8s([-1, -2, -3, -4]))
      .field('b', U16s([0x0102, 0x0304]))
      .field('bi', I16s([-0x0102, -0x0304]))
      .field('c', U32s([0x01020304, 0x05060708], Endian.Big))
      .field('ci', I32s([-1, -2], Endian.Big))
      .field('d', U64s([0x0102030405060708n, 0n, 0x090a0b0c0d0e0f00n], Endian.Big))
      .field('di', I64s([-3n, 0n, -4n], Endian.Big));

      expectEqualBuffers(s.toUint8Array(), [
        1, 2, 3, 4,
        0xff, 0xfe, 0xfd, 0xfc,
        2, 1, 4, 3,
        0xfe, 0xfe, 0xfc, 0xfc,
        1, 2, 3, 4, 5, 6, 7, 8,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfe,
        1, 2, 3, 4, 5, 6, 7, 8,
        0, 0, 0, 0, 0, 0, 0, 0,
        9, 10, 11, 12, 13, 14, 15, 0,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfd,
        0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
        0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xff, 0xfc,
      ]);
  });

  it('should calculate pointer addresses into a struct', () => {
    const outer = Struct('Outer');
    outer
      .field('a', Pointer8(outer, 'b.d'))
      .field('b', basicStruct)
      .field('c', Pointer16(outer, 'a'))
      .field('d', Pointer32(basicStruct, 'f', Endian.Big))
      .field('e', Pointer64(outer, 'b.g'));

    expectEqualBuffers(outer.toUint8Array(), [
      5,
      ...basicStructData,
      0, 0,
      0, 0, 0, 16,
      23, 0, 0, 0, 0, 0, 0, 0
    ]);
  });

  it('should allow for structs to align fields (2 byte boundary)', () => {
    const s = Struct('Aligned', StructAlignment.Align2Byte)
      .field('a', U8(1))
      .field('b', U16(2, Endian.Big))
      .field('c', U32(3))
      .field('d', U64(4n));

    expectEqualBuffers(s.toUint8Array(), [
      1, 0,
      0, 2,
      3, 0, 0, 0,
      4, 0, 0, 0, 0, 0, 0, 0
    ]);

    const s2 = Struct('Aligned', StructAlignment.Align2Byte, AlignmentPadding.BeforeData)
      .field('a', U8(1))
      .field('b', U16(2, Endian.Big))
      .field('c', U32(3))
      .field('d', U64(4n));

    expectEqualBuffers(s2.toUint8Array(), [
      0, 1,
      0, 2,
      3, 0, 0, 0,
      4, 0, 0, 0, 0, 0, 0, 0
    ]);
  });

  it('should allow for structs to align fields (4 byte boundary)', () => {
    const s = Struct('Aligned', StructAlignment.Align4Byte)
      .field('a', U8(1))
      .field('b', U16(2, Endian.Big))
      .field('c', U32(3))
      .field('d', U64(4n));

    expectEqualBuffers(s.toUint8Array(), [
      1, 0, 0, 0,
      0, 2, 0, 0,
      3, 0, 0, 0,
      4, 0, 0, 0, 0, 0, 0, 0
    ]);

    const s2 = Struct('Aligned', StructAlignment.Align4Byte, AlignmentPadding.BeforeData)
      .field('a', U8(1))
      .field('b', U16(2, Endian.Big))
      .field('c', U32(3))
      .field('d', U64(4n));

    expectEqualBuffers(s2.toUint8Array(), [
      0, 0, 0, 1,
      0, 0, 0, 2,
      3, 0, 0, 0,
      4, 0, 0, 0, 0, 0, 0, 0
    ]);
  });

  it('should allow for structs to align fields (8 byte boundary)', () => {
    const s = Struct('Aligned', StructAlignment.Align8Byte)
      .field('a', U8(1))
      .field('b', U16(2, Endian.Big))
      .field('c', U32(3))
      .field('d', U64(4n));

    expectEqualBuffers(s.toUint8Array(), [
      1, 0, 0, 0, 0, 0, 0, 0,
      0, 2, 0, 0, 0, 0, 0, 0,
      3, 0, 0, 0, 0, 0, 0, 0,
      4, 0, 0, 0, 0, 0, 0, 0
    ]);

    const s2 = Struct('Aligned', StructAlignment.Align8Byte, AlignmentPadding.BeforeData)
      .field('a', U8(1))
      .field('b', U16(2, Endian.Big))
      .field('c', U32(3))
      .field('d', U64(4n));

    expectEqualBuffers(s2.toUint8Array(), [
      0, 0, 0, 0, 0, 0, 0, 1,
      0, 0, 0, 0, 0, 0, 0, 2,
      0, 0, 0, 0, 3, 0, 0, 0,
      4, 0, 0, 0, 0, 0, 0, 0
    ]);
  });

  it('should allow getting data from fields', () => {
    const s = Struct('Hello')
      .field('a', I8(-1))
      .field('b', U64(0x0102030405060708n))
      .field('c', RawString('hello!'))
      .field('d', NullTerminatedString('world!'))
      .field('e', U16s([1, 2, 3, 4]));

    expect(s.get<DataType<typeof I8>>('a').get()).to.equal(-1);
    expect(s.get<DataType<typeof RawString>>('c').get()).to.equal('hello!');
    expect(s.get<DataType<typeof U64>>('b').get()).to.equal(0x0102030405060708n);
    expect(s.get<DataType<typeof NullTerminatedString>>('d').get()).to.equal('world!');
    expect(s.get<DataType<typeof U16s>>('e').get()).to.deep.equal([1, 2, 3, 4]);
  });

  it('should allow setting data in a field', () => {
    const s = Struct('Hello')
      .field('a', U8(1))
      .field('b', U64(0x0102030405060708n))
      .field('c', I64(0x0102030405060708n))
      .field('d', RawString('hello!'))
      .field('e', NullTerminatedString('world!'))
      .field('f', U16s([1, 2, 3, 4]));

    expectEqualBuffers(s.toUint8Array(), [
      1, 8, 7, 6, 5, 4, 3, 2, 1, 8, 7, 6, 5, 4, 3, 2, 1,
      ...'hello!'.split('').map(c => c.charCodeAt(0)),
      ...'world!'.split('').map(c => c.charCodeAt(0)), 0,
      1, 0, 2, 0, 3, 0, 4, 0
    ]);

    s.get<DataType<typeof U8>>('a').set(2);
    s.get<DataType<typeof U64>>('b').set(0x0a0b0c0d0e0f0102n);
    s.get<DataType<typeof I64>>('c').set(0x0203040506070809n);
    s.get<DataType<typeof RawString>>('d').set('francis');
    s.get<DataType<typeof NullTerminatedString>>('e').set('stokes');
    s.get<DataType<typeof U16s>>('f').set([0xabcd, 0xef01]);

    expectEqualBuffers(s.toUint8Array(), [
      2, 2, 1, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2,
      ...'francis'.split('').map(c => c.charCodeAt(0)),
      ...'stokes'.split('').map(c => c.charCodeAt(0)), 0,
      0xcd, 0xab, 0x01, 0xef
    ]);
  });

  it('should error when fields are created with values out of range', () => {
    expect(() => U8(-1)).to.throw();
    expect(() => U8(0x100)).to.throw();
    expect(() => I8(-0x81)).to.throw();
    expect(() => I8(0x80)).to.throw();
    expect(() => U16(-1)).to.throw();
    expect(() => U16(0x10000)).to.throw();
    expect(() => I16(-0x8001)).to.throw();
    expect(() => I16(0x8000)).to.throw();
    expect(() => U32(-1)).to.throw();
    expect(() => U32(0x100000000)).to.throw();
    expect(() => I32(-0x80000001)).to.throw();
    expect(() => I32(0x80000000)).to.throw();
    expect(() => U64(-1n)).to.throw();
    expect(() => U64(0x10000000000000000n)).to.throw();
    expect(() => I64(-0x8000000000000001n)).to.throw();
    expect(() => I64(0x8000000000000000n)).to.throw();
  });

  it('should error on invalid field names', () => {
    const s = Struct('s');
    expect(() => s.field('#notvalid', U8(0))).to.throw();
  });

  it('should error on invalid path names', () => {
    const s = Struct('s').field('x', U8(0));
    expect(() => s.getDeep<DataType<typeof U8>>('#.xa')).to.throw();
    expect(() => s.getDeepOffset('#.xa')).to.throw();
  });

  it('should error on paths that result in do not lead to a valid field', () => {
    const s = Struct('s').field('t', Struct('t').field('a', U8(0)));

    expect(() => s.getDeep<DataType<typeof U8>>('t.y')).to.throw();
    expect(() => s.getDeepOffset('t.y')).to.throw();
  });

  it('should get offsets into structs', () => {
    const structFields: Array<[string, ConstructDataType]> = [
      ['a', U8(0xaa)],
      ['b', I16(-1)],
      ['c', Struct('c')
        .field('c_a', U32(0xddeeff00))
        .field('c_b', U8(0x11))
      ],
      ['d', I32(-1)],
    ];

    const packed = Struct('packed');
    const aligned64 = Struct('aligned64', StructAlignment.Align8Byte, AlignmentPadding.AfterData);
    structFields.forEach(([name, field]) => {
      packed.field(name, field);
      aligned64.field(name, field);
    });

    expect(packed.getOffset('a')).to.equal(0);
    expect(packed.getOffset('b')).to.equal(1);
    expect(packed.getOffset('c')).to.equal(3);
    expect(packed.getOffset('d')).to.equal(8);

    expect(aligned64.getOffset('a')).to.equal(0);
    expect(aligned64.getOffset('b')).to.equal(8);
    expect(aligned64.getOffset('c')).to.equal(16);
    expect(aligned64.getOffset('d')).to.equal(24);
  });

  it('should compute the size of structs and fields correctly', () => {
    const structFields: Array<[string, ConstructDataType]> = [
      ['a', U8(0xaa)],
      ['b', I16(-1)],
      ['c', Struct('c')
        .field('c_a', U32(0xddeeff00))
        .field('c_b', U8(0x11))
      ],
      ['d', I32(-1)],
      ['e', I32s([1, 2, 3, 4])],
    ];

    const packed = Struct('packed');
    const aligned64 = Struct('aligned64', StructAlignment.Align8Byte, AlignmentPadding.AfterData);
    structFields.forEach(([name, field]) => {
      packed.field(name, field);
      aligned64.field(name, field);
    });

    expect(packed.computeBufferSize()).to.equal(28);
    expect(aligned64.computeBufferSize()).to.equal(48);

    expect(packed.get<DataType<typeof I16>>('b').computeBufferSize()).to.equal(2);
    expect(aligned64.get<DataType<typeof I16>>('b').computeBufferSize()).to.equal(2);
  });
});
