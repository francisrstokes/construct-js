# Wave File (.wav)

Wave is a relatively simple format that encodes high fidelity sound. It consists of a header, a format section, and a data section. The format section describes everything needed to decode the data section, like sample rate, bits per sample, and the number of channels.

This example shows:

- A few functions to generate very simple square waves at a given frequency, for a given amount of time
- Using those functions to generate 0.8 seconds of the notes of the C major scale
- The definition of the header, format section, and data sections of the wave file

[**Listen to the generated audio**](./squares.wav)

```typescript
import { Struct, I16s, RawString, SizeOf32, U32, U16, Endian } from 'construct-js';
import * as fs from 'fs/promises';
import * as path from 'path';

const sampleRate = 44100;

const secondsToSamples = seconds => seconds * sampleRate;
const squareAtFreq = (seconds, freq) => {
  const samples = secondsToSamples(seconds);
  const rate = Math.round(sampleRate / freq / 2);

  let apexOrBase = true;

  // Create a square wave that oscillates according to the provided frequency
  return Array.from({length: Math.round(samples)}, (_, i) => {
    if ((i + 1) % rate === 0) {
      apexOrBase = !apexOrBase;
    }
    return apexOrBase ? 100 : -100;
  });
};

const soundData = I16s([
  ...squareAtFreq(0.1, 261.63), // C4
  ...squareAtFreq(0.1, 293.66), // D4
  ...squareAtFreq(0.1, 329.63), // E4
  ...squareAtFreq(0.1, 349.23), // F4
  ...squareAtFreq(0.1, 392.00), // G4
  ...squareAtFreq(0.1, 440.00), // A3
  ...squareAtFreq(0.1, 493.88), // B4
  ...squareAtFreq(0.1, 523.25), // C3
]);

// Create a stub so that we can reference it in the header
const wave = Struct('wave');

const header = Struct('header')
  .field('magic', RawString('RIFF'))
  .field('chunkSize', SizeOf32(wave))
  .field('format', U32(0x57415645, Endian.Big)) // The string "RIFF" - specified as a 32-bit big endian integer for demo purposes

const formatSection = Struct('formatSection')
  .field('subChunk1ID', RawString('fmt '))
  .field('subChunk1Size', U32(16))
  .field('audioFormat', U16(1))
  .field('numChannels', U16(1))
  .field('sampleRate', U32(sampleRate))
  .field('byteRate', U32(sampleRate * 2))
  .field('blockAlign', U16(2))
  .field('bitsPerSample', U16(16));

const dataSection = Struct('dataSection')
  .field('subChunk2ID', RawString('data'))
  .field('subChunk2Size', SizeOf32(soundData))
  .field('soundData', soundData);

wave
  .field('header', header)
  .field('formatSection', formatSection)
  .field('dataSection', dataSection);

fs.writeFile(path.join(__dirname, 'squares.wav'), wave.toUint8Array()).then(() => {
  console.log('Done writing wav file.');
});
```
