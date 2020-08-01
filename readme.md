# construct-js

`construct-js` is a library for creating byte level data structures. It focuses on a declarative API and simplicity of use.

```bash
npm i construct-js
```

- [1. Example](#example)
- [2. Changelog](#changelog)
- [3. API](#api)
  - [3.1 Struct](#struct)
    - [3.1.1 field](#field)
    - [3.1.2 get](#get)
    - [3.1.3 getOffset](#getOffset)
    - [3.1.4 getDeep](#getDeep)
    - [3.1.5 getDeepOffset](#getDeepOffset)
    - [3.1.6 computeBufferSize](#computeBufferSize)
    - [3.1.7 toArrayBuffer](#toArrayBuffer)
    - [3.1.8 toBuffer](#toBuffer)
    - [3.1.9 toBytes](#toBytes)
  - [3.2 BitStruct](#bitstruct)
    - [3.2.1 flag](#flag)
    - [3.2.2 multiBit](#multiBit)
    - [3.2.3 getOffset](#getOffset-1)
    - [3.2.4 computeBufferSize](#computeBufferSize-1)
    - [3.2.5 toBuffer](#toBuffer-1)
    - [3.2.6 toArrayBuffer](#toArrayBuffer-1)
    - [3.2.7 toArray](#toArray-1)
  - [3.3 Fields](#fields)
    - [3.3.1 U8](#U8)
    - [3.3.2 U16](#U16)
    - [3.3.3 U32](#U32)
    - [3.3.4 S8](#S8)
    - [3.3.5 S16](#S16)
    - [3.3.6 S32](#S32)
    - [3.3.7 RawString](#RawString)
    - [3.3.8 U8s](#U8s)
    - [3.3.9 U16s](#U16s)
    - [3.3.10 U32s](#U32s)
    - [3.3.11 S8s](#S8s)
    - [3.3.12 S16s](#S16s)
    - [3.3.13 S32s](#S32s)

## Example

The following example builds a completely valid zip archive with one file inside - `helloworld.txt`.

```javascript
const fs = require('fs');
const {
  RawString,
  U16,
  U32,
  Struct,
} = require('construct-js');

const data = RawString('helloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworld');
const filename = RawString('helloworld.txt');

const sharedHeaderInfo = Struct('sharedHeaderInfo')
  .field('minVersion', U16(10))
  .field('gpFlag', U16(0))
  .field('compressionMethod', U16(0))
  .field('lastModifiedTime', U16(0))
  .field('lastModifiedDate', U16(0))
  .field('crc32', U32(0))
  .field('compressedSized', U32(data.byteLength))
  .field('uncompressedSized', U32(data.byteLength))
  .field('filenameSize', U16(filename.byteLength))
  .field('extraFieldLength', U16(0));

const localHeader = Struct('localHeader')
  .field('header', U32(0x04034b50))
  .field('sharedHeaderInfo', sharedHeaderInfo)
  .field('filename', filename);

const centralDirectory = Struct('centralDirectory')
  .field('header', U32(0x02014b50))
  .field('madeByVersion', U16(10))
  .field('sharedHeaderInfo', sharedHeaderInfo)
  .field('fileCommentSize', U16(0))
  .field('diskNumber', U16(0))
  .field('internalFileAttributes', U16(0))
  .field('externalFileAttributes', U32(0))
  .field('relativeOffset', U32(0))
  .field('filename', filename);

const endOfCentralDirectory = Struct('endOfCentralDirectory')
  .field('header', U32(0x06054b50))
  .field('diskNumber', U16(0))
  .field('centralDirDiskStart', U16(0))
  .field('numberOfCentralDirsOnDisk', U16(1))
  .field('totalNumberOfCentralDirs', U16(1))
  .field('centralDirSize', U32(0))
  .field('offsetToStart', U32(0))
  .field('commentLength', U16(0));


const zipFile = Struct('ZipFile')
  .field('localHeader', localHeader)
  .field('data', data)
  .field('centralDirectory', centralDirectory)
  .field('endOfCentralDirectory', endOfCentralDirectory);

const offset = zipFile.getOffset('centralDirectory');
endOfCentralDirectory.get('offsetToStart').set(offset);

const fileBuffer = zipFile.toBuffer();

fs.writeFile('./test.zip', fileBuffer, () => {});
```

## Changelog

### 0.4.0

- Removed concept of endianness from `Structs`. All endianness information comes directly from the [Fields](#Fields) themselves
- Removed deprecated [Fields](#Fields)
- Renamed `I8, I16, I32, I8s, I16s, I32s` -> `S8, S16, S32, S8s, S16s, S32s`

### 0.3.0

- Allow the bit ordering to be specified for [BitStruct](#BitStruct)s

## API

### Struct

`Struct(name)`

Creates a `Struct` object.

#### field

`.field(name, value)`

Adds a field to the struct. *name* is used to lookup the field using `struct.get(name)`. *value* must be either a `Struct` or one of the other data types provided by construct-js.

#### get

`.get(name)`

Returns the [field](#field) with that *name*.

#### getOffset

`.getOffset(name)`

Returns the byte offset within the struct of the [field](#field) with that *name*.

#### getDeep

`.getDeep(path)`

Returns the [field](#field) within multiple structs, where *path* is a `.` separated string. For example:

```javascript

const struct = Struct('firstStruct')
  .field('aRawString', RawString('ABC'));

const struct2 = Struct('secondStruct')
  .field('deeperStruct', struct);

struct2.getDeep('deeperStruct.aRawString');
```

#### getDeepOffset

`.getDeepOffset(path)`

Returns the byte offset within multiple structs, where *path* is a `.` separated string.

#### computeBufferSize

`.computeBufferSize()`

Returns the size of the struct in bytes.

#### toArrayBuffer

`.toArrayBuffer()`

Returns an `ArrayBuffer` representation of the Struct. You should use this if working in the browser.

#### toBuffer

`.toBuffer()`

Returns a `Buffer` representation of the Struct.

#### toBytes

`.toBytes()`

Returns a regular `Array` representation of the Struct.

### BitStruct

`BitStruct(name, lsbFirst = true)`

Creates a BitStruct object, for storing and addressing data on the sub-byte level. If *lsbFirst* is `true`, the resulting buffer will consider the fields to be ordered from the 0th bit i.e. the first field in the BitStruct will be the least significant bit in the Buffer. If *lsbFirst* is `false`, the Buffer will contain the fields in the order they are specified.

**Note**: When [bitStruct.toBuffer()](#tobuffer-1) is used, the resulting buffer will be byte aligned. This means if the size of the BitStruct is 12-bits, the resulting buffer will be 16-bits (2 bytes). When *lsbFirst* is true, the most significant bits will be padded.

#### flag

`.flag(name, value)`

Sets a 1-bit flag in the structure.

#### multiBit

`.multiBit(name, size, value)`

Sets a multi-bit flag of *size*.

#### getOffset

`.getOffset(name)`

Gets the **bit** offset of the data with *name*.

#### computeBufferSize

`.computeBufferSize()`

Returns the size of the BitStruct in **bytes**.

#### toBuffer

`.toBuffer()`

Returns a byte-aligned `Buffer` representing the BitStruct.

#### toArrayBuffer

`.toArrayBuffer()`

Returns a byte-aligned `ArrayBuffer` representing the BitStruct.

#### toArray

`.toArray()`

Returns a byte-aligned `Array` representing the BitStruct.

### Fields

All fields contain some common properties and methods. These are:

`.set(value | values)`

Which sets either the value or values of the field.

`.setIsLittleEndian(trueOrFalse)`

Manually sets this field to little or big endian.

The rest of the properties should be considered private and not modified directly.

#### U8

`U8(value)`

A single 8-bit unsigned value.

#### U16

`U16(value)`

A single 16-bit unsigned value.

#### U32

`U32(value)`

A single 32-bit unsigned value.

#### S8

`S8(value)`

A single 8-bit signed value.

#### S16

`S16(value)`

A single 16-bit signed value.

#### S32

`S32(value)`

A single 32-bit signed value.

#### RawString

`RawString(string)`

A collection of 8-bit unsigned values, interpreted directly from the string provided. The size of the field is the **byte length** of the string (which is not always the `string.length` when considering unicode).

#### U8s

`U8s(array | number)`

A collection of 8-bit unsigned values.

If the argument provided is an array, then the size of the field is `array.length` bytes, with each value corresponding to an 8-bit interpretation of that value.

#### U16s

`U16s(array | number)`

A collection of 16-bit unsigned values.

If the argument provided is an array, then the size of the field is `array.length * 2` bytes, with each value corresponding to an 16-bit interpretation of that value.

#### U32s

`U32s(array | number)`

A collection of 32-bit unsigned values.

If the argument provided is an array, then the size of the field is `array.length * 4` bytes, with each value corresponding to an 32-bit interpretation of that value.

#### S8s

`S8s(array | number)`

A collection of 8-bit signed values.

If the argument provided is an array, then the size of the field is `array.length` bytes, with each value corresponding to an 8-bit interpretation of that value.

#### S16s

`S16s(array | number)`

A collection of 16-bit signed values.

If the argument provided is an array, then the size of the field is `array.length * 2` bytes, with each value corresponding to an 16-bit interpretation of that value.

#### S32s

`S32s(array | number)`

A collection of 32-bit signed values.

If the argument provided is an array, then the size of the field is `array.length * 4` bytes, with each value corresponding to an 32-bit interpretation of that value.

