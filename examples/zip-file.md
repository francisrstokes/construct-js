# ZIP

This is example a working ZIP archive, albiet without any compression. It shows how construct-js can be used to create nested levels of structs and data in parts, and how pointers/offsets can be calculated referentially after specifying the structure as a whole.

[**Check out the generated zip file here**](./test.zip)

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
