# construct-js

`construct-js` is a library for creating byte level data structures.

```bash
npm i construct-js
```

## Features

- Signed and unsigned fields, up to 64-bit
- Nested structs
- Pointer and SizeOf fields
- Different struct alignments, up to 64-bit, including packed structs. Padding can be added before or after the data
- Ability to specify endianness per field
- String support - both raw and null-terminated
- Outputs to the standard Uint8Array type, which can be used in the browser and node
- Getting and setting data in fields
- Fast computation for the size of a field or complete struct
- Written in TypeScript - providing static typing in both JS and TS (dependant on editor support)
- Less than 3.5KiB after minification and gzip

## Table of contents

- [0. High Level Overview](#high-level-overview)
- [1. Examples](#examples)
- [2. Changelog](#changelog)
- [3. API](#api)
  <details>
    <summary>Click to expand</summary>

  - [3.1 Struct](#struct)
  - [3.2 BitStruct](#bitstruct)
  - [3.3 Fields](#fields)
    - [3.3.0 Field Interfaces](#Field-Interfaces)
    - [3.3.1 U8](#U8)
    - [3.3.2 U16](#U16)
    - [3.3.3 U32](#U32)
    - [3.3.4 U64](#U64)
    - [3.3.5 I8](#I8)
    - [3.3.6 I16](#I16)
    - [3.3.7 I32](#I32)
    - [3.3.8 I64](#I64)
    - [3.3.9 RawString](#RawString)
    - [3.3.10 NullTerminatedString](#NullTerminatedString)
    - [3.3.11 U8s](#U8s)
    - [3.3.12 U16s](#U16s)
    - [3.3.13 U32s](#U32s)
    - [3.3.14 U64s](#U64s)
    - [3.3.15 I8s](#I8s)
    - [3.3.16 I16s](#I16s)
    - [3.3.17 I32s](#I32s)
    - [3.3.18 Pointer8](#Pointer8)
    - [3.3.19 Pointer16](#Pointer16)
    - [3.3.20 Pointer32](#Pointer32)
    - [3.3.21 Pointer64](#Pointer64)
    - [3.3.22 SizeOf8](#SizeOf8)
    - [3.3.23 SizeOf16](#SizeOf16)
    - [3.3.24 SizeOf32](#SizeOf32)
    - [3.3.25 SizeOf64](#SizeOf64)

</details>

## High Level Overview

`construct-js` is all about creating a low-cost and performant abstraction for working with structured, binary data. If you've ever found yourself trying to manually assemble binary data in an ArrayBuffer - stuffing data, calculating sizes, scratching your head over endianness and offsets, then this is likely the tool for you.

`construct-js` allows you to specify and manipulate binary data using an expressive API made up of standard primitives that you may be used to in lower level languages - such as structs, pointers, sizeof operators, and standard sized signed and unsigned integer types.

### Why?

Why not? I mean - I think there is genuine utility, but even if there wasn't, it would simply be an interesting project to undertake.

In terms of actual utility, as the web and distributed services evolve, web pages and JavaScript are taking on increasing more diverse and complex task, as well as connecting to more elaborate and varied services. Typically communication channels between different services use simple interchange formats like JSON over HTTP or WebSockets, but for a variety of reasons this is not always ideal. A large part of the reason this is so widespread is that JavaScript traditionally hasn't had good facilities or abstractions for creating byte-level data structures. Now, however, with the advent and standardisation of Typed Arrays and BigInt, this is no longer the case. `construct-js` allows developers to write expressive descriptions using standard native types like numbers, strings, and regular arrays - and outputs to an efficient Uint8Array format for interchange with the network, filesystem, or even across execution environments like WebAssembly.

## Examples

[There are more examples in the examples folder, showing the some more possibilities - including array fields, explicit endianness, etc.](./examples/index.md)

The following example builds a (just about) valid\* zip archive with one file inside - `helloworld.txt`.

<sup>*At least when unzipped using the unzip command. Some GUI programs seem to have less success</sup>

```typescript
import * as fs from 'fs/promises';
import {RawString, U16, U32, Struct, Pointer32, Endian} from 'construct-js';

const data = RawString('helloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworldhelloworld');
const dataSize = data.computeBufferSize();
const filename = RawString('helloworld.txt');
const filenameSize = filename.computeBufferSize();

// Create a stub for the top level struct that can be referenced by other structs
const zipFile = Struct('ZipFile');

const sharedHeaderInfo = Struct('sharedHeaderInfo')
  .field('minVersion', U16(10))
  .field('gpFlag', U16(0))
  .field('compressionMethod', U16(0))
  .field('lastModifiedTime', U16(0))
  .field('lastModifiedDate', U16(0))
  .field('crc32', U32(0))
  .field('compressedSized', U32(dataSize))
  .field('uncompressedSized', U32(dataSize))
  .field('filenameSize', U16(filenameSize))
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
  .field('offsetToStart', Pointer32(zipFile, 'centralDirectory'))
  .field('commentLength', U16(0));

// Finalise the top level struct
zipFile
  .field('localHeader', localHeader)
  .field('data', data)
  .field('centralDirectory', centralDirectory)
  .field('endOfCentralDirectory', endOfCentralDirectory);

const fileBuffer = zipFile.toUint8Array();

fs.writeFile('./test.zip', fileBuffer).then(() => {
  console.log('Done writing zip file.');
});
```

## Changelog

### 1.0.0

- Full rewrite in TypeScript
- Added 64-Bit support
- Added alignment support
- Breaking changes with the pre 1.0.0 releases

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

`Struct(name: string, alignment = StructAlignment.Packed, paddingDirection = AlignmentPadding.AfterData)`

Creates a `Struct` object. `alignment` specifies how much (if any) padding should be applied to the fields in order for them to align to a fixed byte boundary. `paddingDirection` specifies where the extra bytes should be added (before or after the data).

#### field

`.field(name: string, value: ConstructDataType)`

Adds a field to the struct. *name* is used to lookup the field using methods like `struct.get(name)`. *value* must be either a `Struct` or one of the other data types provided by construct-js.

#### get

`.get<T extends ConstructDataType>(name: string)`

Returns the [field](#field) with that *name*. Note: When using TypeScript, this value must be *cast* to the correct type, either using the generic or with the `as` keyword:

```typescript
const s = Struct('example').field('first', U8(0));

s.get<DataType<typeof U8>>('first');
```

#### getOffset

`.getOffset(name: string)`

Returns the byte offset within the struct of the [field](#field) with that *name*.

#### getDeep

`.getDeep(path: string)`

Returns the [field](#field) within multiple structs, where *path* is a `.` separated string. Note: When using TypeScript, this value must be *cast* to the correct type, either using the generic or with the `as` keyword:

```typescript

const struct = Struct('firstStruct')
  .field('aRawString', RawString('ABC'));

const struct2 = Struct('secondStruct')
  .field('deeperStruct', struct);

struct2.getDeep<DataType<RawString>>('deeperStruct.aRawString');
```

#### getDeepOffset

`.getDeepOffset(path: string)`

Returns the byte offset within multiple structs, where *path* is a `.` separated string.

#### computeBufferSize

`.computeBufferSize()`

Returns the size of the struct in bytes.

#### toUint8Array

`.toUint8Array()`

Returns a `Uint8Array` representation of the Struct.

### Fields

#### Field Interfaces

Fields implement the `IField` interface, and optionally the `IValue` interface:

##### IField

```typescript
interface IField {
  computeBufferSize(): number;
  toUint8Array(): Uint8Array;
}
```

##### IValue

```typescript
interface IValue<T> {
  set(value: T): void;
  get(): T;
}
```

#### U8

`U8(value: number) implements IField, IValue<number>`

A single 8-bit unsigned value.

#### U16

`U16(value: number, endian = Endian.Little) implements IField, IValue<number>`

A single 16-bit unsigned value, in either big or little endian byte order.

#### U32

`U32(value: number, endian = Endian.Little) implements IField, IValue<number>`

A single 32-bit unsigned value, in either big or little endian byte order.

#### U64

`U64(value: bigint, endian = Endian.Little) implements IField, IValue<bigint>`

A single 64-bit unsigned value, in either big or little endian byte order. Note: Values for 64-bit fields must be specified as `bigint`.

#### I8

`I8(value: number) implements IField, IValue<number>`

A single 8-bit signed value.

#### I16

`I16(value: number, endian = Endian.Little) implements IField, IValue<number>`

A single 16-bit signed value, in either big or little endian byte order.

#### I32

`I32(value: number, endian = Endian.Little) implements IField, IValue<number>`

A single 32-bit signed value, in either big or little endian byte order.

#### I64

`I64(value: bigint, endian = Endian.Little) implements IField, IValue<bigint>`

A single 64-bit signed value, in either big or little endian byte order. Note: Values for 64-bit fields must be specified as `bigint`.

#### RawString

`RawString(string) implements IField, IValue<string>`

A collection of 8-bit unsigned values, interpreted directly from the string provided.


#### NullTerminatedString

`NullTerminatedString(string) implements IField, IValue<string>`

A collection of 8-bit unsigned values, interpreted directly from the string provided. This field appends a single `0x00` byte to the end of the data.

#### U8s

`U8s(values: number[]) implements IField, IValue<number[]>`

A collection of 8-bit unsigned values.

#### U16s

`U16s(values: number[], endian = Endian.Little) implements IField, IValue<number[]>`

A collection of 16-bit unsigned values, in either big or little endian byte order.

#### U32s

`U32s(values: number[], endian = Endian.Little) implements IField, IValue<number[]>`

A collection of 32-bit unsigned values, in either big or little endian byte order.

#### U64s

`U64s(values: bigint[], endian = Endian.Little) implements IField, IValue<bigint[]>`

A collection of 64-bit unsigned values, in either big or little endian byte order. Note: Values for 64-bit fields must be specified as `bigint`.

#### I8s

`I8s(values: number[]) implements IField, IValue<number[]>`

A collection of 8-bit signed values.

#### I16s

`I16s(values: number[], endian = Endian.Little) implements IField, IValue<number[]>`

A collection of 16-bit signed values, in either big or little endian byte order.

#### I32s

`I32s(values: number[], endian = Endian.Little) implements IField, IValue<number[]>`

A collection of 32-bit signed values, in either big or little endian byte order.

#### I64s

`I64s(values: bigint[], endian = Endian.Little) implements IField, IValue<bigint[]>`

A collection of 64-bit signed values, in either big or little endian byte order. Note: Values for 64-bit fields must be specified as `bigint`.

#### Pointer8

`Pointer8(struct: Struct, path: string) implements IField`

`Pointer8` takes a [Struct](#Struct) and a path, and represents an 8-bit pointer (offset) to the field specified by the path in the provided struct.

#### Pointer16

`Pointer16(struct: Struct, path: string, endian = Endian.Little) implements IField`

`Pointer16` takes a [Struct](#Struct) and a path, and represents an 16-bit pointer (offset) to the field specified by the path in the provided struct.

#### Pointer32

`Pointer32(struct: Struct, path: string, endian = Endian.Little) implements IField`

`Pointer32` takes a [Struct](#Struct) and a path, and represents an 32-bit pointer (offset) to the field specified by the path in the provided struct.

#### Pointer64

`Pointer64(struct: Struct, path: string, endian = Endian.Little) implements IField`

`Pointer64` takes a [Struct](#Struct) and a path, and represents an 64-bit pointer (offset) to the field specified by the path in the provided struct.

#### SizeOf8

`SizeOf8(target: ConstructDataType) implements IField`

`SizeOf8` takes a [Struct](#Struct) or a [Field](#Field), and represents the size of the Struct or the Field as an 8-bit unsigned integer.

#### SizeOf16

`SizeOf16(target: ConstructDataType, endian = Endian.Little) implements IField`

`SizeOf16` takes a [Struct](#Struct) or a [Field](#Field), and represents the size of the Struct or the Field as an 16-bit unsigned integer.

#### SizeOf32

`SizeOf32(target: ConstructDataType, endian = Endian.Little) implements IField`

`SizeOf32` takes a [Struct](#Struct) or a [Field](#Field), and represents the size of the Struct or the Field as an 32-bit unsigned integer.

#### SizeOf64

`SizeOf64(target: ConstructDataType, endian = Endian.Little) implements IField`

`SizeOf64` takes a [Struct](#Struct) or a [Field](#Field), and represents the size of the Struct or the Field as an 64-bit unsigned integer.
