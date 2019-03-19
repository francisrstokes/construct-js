# construct-js

`construct-js` is a library for creating byte level data structures. It focuses on a declarative API and simplicity of use.

```bash
npm i construct-js
```


- [1. Example](#example)
- [2. API](#api)
  - [2.1 Struct](#struct)
    - [2.1.1 forceEndianess](#forceEndianess)
    - [2.1.2 field](#field)
    - [2.1.3 get](#get)
    - [2.1.4 getOffset](#getOffset)
    - [2.1.5 getDeep](#getDeep)
    - [2.1.6 getDeepOffset](#getDeepOffset)
    - [2.1.7 computeBufferSize](#computeBufferSize)
    - [2.1.8 toBuffer](#toBuffer)
  - [2.2 BitStruct](#bitstruct)
    - [2.2.1 flag](#flag)
    - [2.2.2 multiBit](#multiBit)
    - [2.2.3 getOffset](#getOffset-1)
    - [2.2.4 computeBufferSize](#computeBufferSize-1)
    - [2.2.5 toBuffer](#toBuffer-1)
  - [2.3 Fields](#fields)
    - [2.3.1 U8](#U8)
    - [2.3.2 U16](#U16)
    - [2.3.3 U32](#U32)
    - [2.3.4 I8](#I8)
    - [2.3.5 I16](#I16)
    - [2.3.6 I32](#I32)
    - [2.3.7 RawString](#RawString)
    - [2.3.8 U8s](#U8s)
    - [2.3.9 U16s](#U16s)
    - [2.3.10 U32s](#U32s)
    - [2.3.11 I8s](#I8s)
    - [2.3.12 I16s](#I16s)
    - [2.3.13 I32s](#I32s)
  - [2.4 Fields (Deprecated)](#fields-deprecated)
    - [2.4.1 Byte](#Byte)
    - [2.4.2 Word](#Word)
    - [2.4.3 DoubleWord](#DoubleWord)
    - [2.4.4 SignedByte](#SignedByte)
    - [2.4.5 SignedWord](#SignedWord)
    - [2.4.6 SignedDoubleWord](#SignedDoubleWord)
    - [2.4.7 RawString](#RawStrng)
    - [2.4.8 Bytes](#Bytes)
    - [2.4.9 Words](#Words)
    - [2.4.10 DoubleWords](#DoubleWords)
    - [2.4.11 SignedBytes](#SignedBytes)
    - [2.4.12 SignedWords](#SignedWords)
    - [2.4.13 SignedDoubleWords](#SignedDoubleWords)

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

## API

### Struct

`Struct(name, littleEndian = true)`

Creates a Struct object. If *littleEndian* is set to true, the Struct will be considered to be little endian ordering.

#### forceEndianess

`forceEndianess`

*forceEndianess* is `true` by default, which means [fields](#field) created will be forced into the endianess set when creating the Struct.


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

#### toBuffer

`.toBuffer()`

Returns a `Buffer` representation of the Struct.

### BitStruct

`BitStruct(name)`

Creates a BitStruct object, for storing and addressing data on the sub-byte level.

**Note**: When [bitStruct.toBuffer()](#tobuffer-1) is used, the resulting buffer will be byte aligned. This means if the size of the BitStruct is 12-bits, the resulting buffer will be 16-bits (2 bytes).

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

#### I8

`I8(value)`

A single 8-bit signed value.

#### I16

`I16(value)`

A single 16-bit signed value.

#### I32

`I32(value)`

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

#### I8s

`I8s(array | number)`

A collection of 8-bit signed values.

If the argument provided is an array, then the size of the field is `array.length` bytes, with each value corresponding to an 8-bit interpretation of that value.

#### I16s

`I16s(array | number)`

A collection of 16-bit signed values.

If the argument provided is an array, then the size of the field is `array.length * 2` bytes, with each value corresponding to an 16-bit interpretation of that value.

#### I32s

`I32s(array | number)`

A collection of 32-bit signed values.

If the argument provided is an array, then the size of the field is `array.length * 4` bytes, with each value corresponding to an 32-bit interpretation of that value.


### Fields (Deprecated)

**These fields are the same as those above, but using outdated and ambiguous terminology.**

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

#### I8

`I8(value)`

A single 8-bit signed value.

#### I16

`I16(value)`

A single 16-bit signed value.

#### I32

`I32(value)`

A single 32-bit signed value.

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

#### I8s

`I8s(array | number)`

A collection of 8-bit signed values.

If the argument provided is an array, then the size of the field is `array.length` bytes, with each value corresponding to an 8-bit interpretation of that value.

#### I16s

`I16s(array | number)`

A collection of 16-bit signed values.

If the argument provided is an array, then the size of the field is `array.length * 2` bytes, with each value corresponding to an 16-bit interpretation of that value.

#### I32s

`I32s(array | number)`

A collection of 32-bit signed values.

If the argument provided is an array, then the size of the field is `array.length * 4` bytes, with each value corresponding to an 32-bit interpretation of that value.
