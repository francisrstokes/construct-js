# construct-js

`construct-js` is a library for creating byte level data structures. It focuses on a declarative API and simplicity of use.

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