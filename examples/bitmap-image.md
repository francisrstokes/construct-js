# Bitmap Image

BMP ranges from being a fairly simple format in some versions, to more complex with features like compression in others. This example shows the creation of a 512x512 grayscale image, with 256 color depth.

<center><img src="./bitmap-image.bmp"></center>

```javascript
const fs = require('fs');
const path = require('path');
const { Struct, RawString, U16, U32, U8s, SizeOf32 } = require('construct-js');

const width = 512;
const height = 512;

const bmpFile = Struct('bmpFile');

const header = Struct('header')
  .field('magic', RawString('BM'))
  .field('size', SizeOf32(bmpFile))
  .field('reserved1', U16(0, true))
  .field('reserved2', U16(0, true))
  .field('startOffset', U32(0, true));

const dibHeader = Struct('dibHeader')
  .field('size', U32(40, true))
  .field('width', U32(width, true))
  .field('height', U32(height, true))
  .field('colorPlanes', U16(1, true))
  .field('bitsPerPixel', U16(8, true))
  .field('compression', U32(0, true))
  .field('compressedSize', U32(0, true))
  .field('xPixelsPerMeter', U32(0, true))
  .field('yPixelsPerMeter', U32(0, true))
  .field('totalColors', U32(0, true))
  .field('importantColors', U32(0, true));

// The color table consists of 256 grayscale values
const colorTableValues = Array.from({length: 256}).reduce(
  (acc, _, i) =>[...acc, i, i, i, 0],
  []
);
const colorTable = Struct('colorTable').field('entries', U8s(colorTableValues));

const pixels = Struct('pixels');

bmpFile
  .field('header', header)
  .field('dibHeader', dibHeader)
  .field('colorTable', colorTable)
  .field('pixels', pixels);

// Create a cool, fractaly wave pattern based on the x and y position of each pixel
const pixelData = Array.from({length: width*height}, (_, i) => {
  const x = (i % width) / width;
  const y = Math.floor(i / width) / height;
  const waveValue = (Math.sin(x**y * Math.PI * 2 * (i / 25)) + 1) / 2;
  const grayscaleValue = waveValue * 255;

  return grayscaleValue;
});

// Set the pixels in the structure
pixels.field('data', U8s(pixelData));

// Calculate the file size and set it in the header
const totalSize = bmpFile.computeBufferSize();
header.get('size').set(totalSize);

// Calculate the offset to the pixel data and set it in the header
const pixelOffset = bmpFile.getOffset('pixels');
header.get('startOffset').set(pixelOffset);

// Serialise the BMP to a buffer and write it to a file
const buf = bmpFile.toBuffer();
fs.writeFileSync(path.join(__dirname, 'bitmap-image.bmp'), buf);
```
