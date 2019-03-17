# construct-js

`construct-js` is a library for creating byte level data structures. It focuses on a declarative API and simplicity of use.

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
  - [2.2 Fields](#fields)
    - [2.2.1 Byte](#Byte)
    - [2.2.2 Word](#Word)
    - [2.2.3 DoubleWord](#DoubleWord)
    - [2.2.4 SignedByte](#SignedByte)
    - [2.2.5 SignedWord](#SignedWord)
    - [2.2.6 SignedDoubleWord](#SignedDoubleWord)
    - [2.2.7 RawString](#RawString)
    - [2.2.8 Bytes](#Bytes)
    - [2.2.9 Words](#Words)
    - [2.2.10 DoubleWords](#DoubleWords)
    - [2.2.11 SignedBytes](#SignedBytes)
    - [2.2.12 SignedWords](#SignedWords)
    - [2.2.13 SignedDoubleWords](#SignedDoubleWords)

## Example

The following example builds a completely valid zip archive with one file inside - `helloworld.txt`.

```javascript
const fs = require('fs');
const {
  RawString,
  Word,
  DoubleWord,
  Struct,
} = require('construct-js');

const data = RawString('helloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworld');
const filename = RawString('helloworld.txt');

const sharedHeaderInfo = Struct('sharedHeaderInfo')
  .field('minVersion', Word(10))
  .field('gpFlag', Word(0))
  .field('compressionMethod', Word(0))
  .field('lastModifiedTime', Word(0))
  .field('lastModifiedDate', Word(0))
  .field('crc32', DoubleWord(0))
  .field('compressedSized', DoubleWord(data.byteLength))
  .field('uncompressedSized', DoubleWord(data.byteLength))
  .field('filenameSize', Word(filename.byteLength))
  .field('extraFieldLength', Word(0));

const localHeader = Struct('localHeader')
  .field('header', DoubleWord(0x04034b50))
  .field('sharedHeaderInfo', sharedHeaderInfo)
  .field('filename', filename);

const centralDirectory = Struct('centralDirectory')
  .field('header', DoubleWord(0x02014b50))
  .field('madeByVersion', Word(10))
  .field('sharedHeaderInfo', sharedHeaderInfo)
  .field('fileCommentSize', Word(0))
  .field('diskNumber', Word(0))
  .field('internalFileAttributes', Word(0))
  .field('externalFileAttributes', DoubleWord(0))
  .field('relativeOffset', DoubleWord(0))
  .field('filename', filename);

const endOfCentralDirectory = Struct('endOfCentralDirectory')
  .field('header', DoubleWord(0x06054b50))
  .field('diskNumber', Word(0))
  .field('centralDirDiskStart', Word(0))
  .field('numberOfCentralDirsOnDisk', Word(1))
  .field('totalNumberOfCentralDirs', Word(1))
  .field('centralDirSize', DoubleWord(0))
  .field('offsetToStart', DoubleWord(0))
  .field('commentLength', Word(0));


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

### Fields

All fields contain some common properties and methods. These are:

**.set(value | values)**

Which sets either the value or values of the field.

**.setIsLittleEndian(trueOrFalse)**

Manually sets this field to little or big endian.

The rest of the properties should be considered private and not modifed directly.

#### Byte

`Byte(value)`

A single 8-bit unsigned value.

#### Word

`Word(value)`

A single 16-bit unsigned value.

#### DoubleWord

`DoubleWord(value)`

A single 32-bit unsigned value.

#### SignedByte

`SignedByte(value)`

A single 8-bit signed value.

#### SignedWord

`SignedWord(value)`

A single 16-bit signed value.

#### SignedDoubleWord

`SignedDoubleWord(value)`

A single 32-bit signed value.

#### RawString

`RawString(string)`

A collection of 8-bit unsigned values, interpreted directly from the string provided. The size of the field is the **byte length** of the string (which is not always the `string.length` when considering unicode).

#### Bytes

`Bytes(array | number)`

A collection of 8-bit unsigned values.

If the argument provided is an array, then the size of the field is `array.length` bytes, with each value corresponding to an 8-bit interpretation of that value.

#### Words

`Words(array | number)`

A collection of 16-bit unsigned values.

If the argument provided is an array, then the size of the field is `array.length * 2` bytes, with each value corresponding to an 16-bit interpretation of that value.

#### DoubleWords

`DoubleWords(array | number)`

A collection of 32-bit unsigned values.

If the argument provided is an array, then the size of the field is `array.length * 4` bytes, with each value corresponding to an 32-bit interpretation of that value.

#### SignedBytes

`SignedBytes(array | number)`

A collection of 8-bit signed values.

If the argument provided is an array, then the size of the field is `array.length` bytes, with each value corresponding to an 8-bit interpretation of that value.

#### SignedWords

`SignedWords(array | number)`

A collection of 16-bit signed values.

If the argument provided is an array, then the size of the field is `array.length * 2` bytes, with each value corresponding to an 16-bit interpretation of that value.

#### SignedDoubleWords

`SignedDoubleWords(array | number)`

A collection of 32-bit signed values.

If the argument provided is an array, then the size of the field is `array.length * 4` bytes, with each value corresponding to an 32-bit interpretation of that value.
