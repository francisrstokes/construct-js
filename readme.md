# construct-js

`construct-js` is a library for creating byte level data structures. It focuses on a declarative API and simplicity of use.

```bash
npm i construct-js
```

- [1. Examples](#examples)
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
    - [3.3.0 Common Methods](#Common-Methods)
    - [3.3.1 U8](#U8)
    - [3.3.2 U16](#U16)
    - [3.3.3 U32](#U32)
    - [3.3.4 S8](#S8)
    - [3.3.5 S16](#S16)
    - [3.3.6 S32](#S32)
    - [3.3.7 RawString](#RawString)
    - [3.3.8 NullTerminatedString](#NullTerminatedString)
    - [3.3.9 U8s](#U8s)
    - [3.3.10 U16s](#U16s)
    - [3.3.11 U32s](#U32s)
    - [3.3.12 S8s](#S8s)
    - [3.3.13 S16s](#S16s)
    - [3.3.14 S32s](#S32s)
    - [3.3.15 Pointer8](#Pointer8)
    - [3.3.16 Pointer16](#Pointer16)
    - [3.3.17 Pointer32](#Pointer32)
    - [3.3.18 SizeOf8](#SizeOf8)
    - [3.3.19 SizeOf16](#SizeOf16)
    - [3.3.20 SizeOf32](#SizeOf32)

## Examples

[There are more examples in the examples folder.](./examples/index.md)

The following example builds a completely valid zip archive with one file inside - `helloworld.txt`.

```javascript
const fs = require('fs');
const { RawString, U16LE, U32LE, Struct, Pointer32LE } = require('construct-js');

const data = RawString('helloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworld');
const filename = RawString('helloworld.txt');

// Create a stub for the top level struct that can be referenced by other structs
const zipFile = Struct('ZipFile');

const sharedHeaderInfo = Struct('sharedHeaderInfo')
  .field('minVersion', U16LE(10))
  .field('gpFlag', U16LE(0))
  .field('compressionMethod', U16LE(0))
  .field('lastModifiedTime', U16LE(0))
  .field('lastModifiedDate', U16LE(0))
  .field('crc32', U32LE(0))
  .field('compressedSized', U32LE(data.byteLength))
  .field('uncompressedSized', U32LE(data.byteLength))
  .field('filenameSize', U16LE(filename.byteLength))
  .field('extraFieldLength', U16LE(0));

const localHeader = Struct('localHeader')
  .field('header', U32LE(0x04034b50))
  .field('sharedHeaderInfo', sharedHeaderInfo)
  .field('filename', filename);

const centralDirectory = Struct('centralDirectory')
  .field('header', U32LE(0x02014b50))
  .field('madeByVersion', U16LE(10))
  .field('sharedHeaderInfo', sharedHeaderInfo)
  .field('fileCommentSize', U16LE(0))
  .field('diskNumber', U16LE(0))
  .field('internalFileAttributes', U16LE(0))
  .field('externalFileAttributes', U32LE(0))
  .field('relativeOffset', U32LE(0))
  .field('filename', filename);

const endOfCentralDirectory = Struct('endOfCentralDirectory')
  .field('header', U32LE(0x06054b50))
  .field('diskNumber', U16LE(0))
  .field('centralDirDiskStart', U16LE(0))
  .field('numberOfCentralDirsOnDisk', U16LE(1))
  .field('totalNumberOfCentralDirs', U16LE(1))
  .field('centralDirSize', U32LE(0))
  .field('offsetToStart', Pointer32LE(zipFile, 'centralDirectory'))
  .field('commentLength', U16LE(0));

// Finalise the top level struct
zipFile
  .field('localHeader', localHeader)
  .field('data', data)
  .field('centralDirectory', centralDirectory)
  .field('endOfCentralDirectory', endOfCentralDirectory);

const fileBuffer = zipFile.toBuffer();

fs.writeFileSync('./test.zip', fileBuffer);
```

## Changelog

### 0.7.0

- Add TypeScript definition file

### 0.6.1

- Add `.value()` method to fields.

### 0.6.0

- Refactor the user-facing API to remove endianness flags in fields and instead create a field for little endian and big endian variations.

### 0.5.0

- Added `NullTerminatedString` field
- Fixed a bug in `getDeep` that allowed requesting nonsense values in the path

### 0.4.2

- Added `Pointer8`, `Pointer16`, `Pointer32`, `SizeOf8`, `SizeOf16` and `SizeOf32` fields

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

`BitStructLSB(name)` and `BitStructMSB(name)`

Creates a BitStruct object, for storing and addressing data on the sub-byte level. If using `BitStructLSB`, the resulting buffer will consider the fields to be ordered from the 0th bit i.e. the first field in the BitStruct will be the least significant bit in the Buffer. If using `BitStructMSB`, the Buffer will write the bits in the opposite order

**Note**: When [bitStruct.toBuffer()](#tobuffer-1) is used, the resulting buffer will be byte aligned. This means if the size of the BitStruct is 12-bits, the resulting buffer will be 16-bits (2 bytes). When using `BitStructLSB`, the most significant bits will be padded.

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

#### Common Methods

All fields contain some common properties and methods. These are:

`.set(value | values)`

Which sets either the value or values of the field.

`.setIsLittleEndian(trueOrFalse)`

Manually sets this field to little or big endian.

`.value()`

Returns the value of this field, as originally specified.

**The rest of the properties should be considered private and not modified directly.**

#### U8

`U8(value)`

A single 8-bit unsigned value.

#### U16

`U16LE(value)` or `U16BE(value)`

A single 16-bit unsigned value, in either big or little endian byte order.

#### U32

`U32LE(value)` or `U32BE(value)`

A single 32-bit unsigned value, in either big or little endian byte order.

#### S8

`S8(value)`

A single 8-bit signed value.

#### S16

`S16LE(value)` or `S16BE(value)`

A single 16-bit signed value, in either big or little endian byte order.

#### S32

`S32LE(value)` or `S32BE(value)`

A single 32-bit signed value, in either big or little endian byte order.

#### RawString

`RawString(string)`

A collection of 8-bit unsigned values, interpreted directly from the string provided. The size of the field is the **byte length** of the string (which is not always the `string.length` when considering unicode).

##### RawString.set(string)

(Re)sets the value using the provided string.

#### NullTerminatedString

`NullTerminatedString(string)`

A collection of 8-bit unsigned values, interpreted directly from the string provided. The size of the field is the **byte length** of the string (which is not always the `string.length` when considering unicode). This field appends a single `0x00` byte to the end of the data.

##### NullTerminatedString.set(string)

(Re)sets the value using the provided string. Automatically adds a new null termination byte.

#### U8s

`U8s(array | number)`

A collection of 8-bit unsigned values.

If the argument provided is an array, then the size of the field is `array.length` bytes, with each value corresponding to an 8-bit interpretation of that value.

#### U16s

`U16LEs(array | number)` or `U16BEs(array | number)`

A collection of 16-bit unsigned values, in either big or little endian byte order.

If the argument provided is an array, then the size of the field is `array.length * 2` bytes, with each value corresponding to an 16-bit interpretation of that value.

#### U32s

`U32LEs(array | number)` or `U32BEs(array | number)`

A collection of 32-bit unsigned values, in either big or little endian byte order.

If the argument provided is an array, then the size of the field is `array.length * 4` bytes, with each value corresponding to an 32-bit interpretation of that value.

#### S8s

`S8s(array | number)`

A collection of 8-bit signed values.

If the argument provided is an array, then the size of the field is `array.length` bytes, with each value corresponding to an 8-bit interpretation of that value.

#### S16s

`S16LEs(array | number)` or `S16BEs(array | number)`

A collection of 16-bit signed values, in either big or little endian byte order.

If the argument provided is an array, then the size of the field is `array.length * 2` bytes, with each value corresponding to an 16-bit interpretation of that value.

#### S32s

`S32LEs(array | number)` or `S32BEs(array | number)`

A collection of 32-bit signed values, in either big or little endian byte order.

If the argument provided is an array, then the size of the field is `array.length * 4` bytes, with each value corresponding to an 32-bit interpretation of that value.

#### Pointer8

`Pointer8(struct, path)`

`Pointer8` takes a [Struct](#Struct) and a path, and represents an 8-bit pointer (offset) to the field specified by the path in the provided struct.

#### Pointer16

`Pointer16(struct, path)`

`Pointer16` take a [Struct](#Struct) and a path, and represents a 16-bit pointer (offset) to the field specified by the path in the provided struct - in either little endian or big endian format.

#### Pointer32

`Pointer32(struct, path)`

`Pointer32` take a [Struct](#Struct) and a path, and represents a 32-bit pointer (offset) to the field specified by the path in the provided struct - in either little endian or big endian format.

#### SizeOf8

`SizeOf8(structOrField)`

`SizeOf8` takes a [Struct](#Struct) or a [Field](#Field), and represents the size of the Struct or the Field as an 8-bit unsigned integer.

#### SizeOf16

`SizeOf16LE(structOrField)`

`SizeOf16` take a [Struct](#Struct) or a [Field](#Field), and represents the size of the Struct or the Field as a 16-bit unsigned integer - in either little endian or big endian format.

#### SizeOf32

`SizeOf32LE(structOrField)`

`SizeOf32` take a [Struct](#Struct) or a [Field](#Field), and represents the size of the Struct or the Field as a 32-bit unsigned integer - in either little endian or big endian format.
