# ZIP

This is example a working ZIP archive, albiet without any compression (and other actually necessary stuff like a valid the CRC32). It shows how construct-js can be used to create nested levels of structs and data in parts, and how pointers/offsets can be calculated referentially after specifying the structure as a whole.

[**Check out the generated zip file here**](./test.zip)

```javascript
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
