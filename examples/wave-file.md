# Wave File (.wav)

Wave is a relatively simple format that encodes high fidelity sound. It consists of a header, a format section, and a data section. The format section describes everything needed to decode the data section, like sample rate, bits per sample, and the number of channels.

This example shows:

- A few functions to generate very simple square waves at a given frequency, for a given amount of time
- Using those functions to generate 0.8 seconds of the notes of the C major scale
- The definition of the header, format section, and data sections of the wave file

[**Listen to the generated audio**](./squares.wav)

```javascript
const { Struct, S16LEs, RawString, SizeOf32LE, U32LE, U16LE } = require('construct-js');
const fs = require('fs');
const path = require('path');

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

const soundData = S16LEs([
  ...squareAtFreq(0.1, 261.63), // C4
  ...squareAtFreq(0.1, 293.66), // D4
  ...squareAtFreq(0.1, 329.63), // E4
  ...squareAtFreq(0.1, 349.23), // F4
  ...squareAtFreq(0.1, 392.00), // G4
  ...squareAtFreq(0.1, 440.00), // A3
  ...squareAtFreq(0.1, 493.88), // B4
  ...squareAtFreq(0.1, 523.25), // C3
], true);

// Create a stub so that we can reference it in the header
const wave = Struct('wave');

const header = Struct('header')
  .field('magic', RawString('RIFF'))
  .field('chunkSize', SizeOf32LE(wave))
  .field('format', RawString('WAVE'))

const formatSection = Struct('formatSection')
  .field('subChunk1ID', RawString('fmt '))
  .field('subChunk1Size', U32LE(16))
  .field('audioFormat', U16LE(1))
  .field('numChannels', U16LE(1))
  .field('sampleRate', U32LE(sampleRate))
  .field('byteRate', U32LE(sampleRate * 2))
  .field('blockAlign', U16LE(2))
  .field('bitsPerSample', U16LE(16));

const dataSection = Struct('dataSection')
  .field('subChunk2ID', RawString('data'))
  .field('subChunk2Size', SizeOf32LE(soundData))
  .field('soundData', soundData);

wave
  .field('header', header)
  .field('formatSection', formatSection)
  .field('dataSection', dataSection);

fs.writeFileSync(path.join(__dirname, 'squares.wav'), wave.toBuffer());
```
