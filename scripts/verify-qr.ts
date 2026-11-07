import { readFile } from 'node:fs/promises';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';
const image = PNG.sync.read(await readFile('.impeccable/review/qr-test.png'));
const result = jsQR(new Uint8ClampedArray(image.data), image.width, image.height);
if (result?.data !== 'https://example.org/falcons-qa/')
  throw new Error('Le QR rendu dans le PDF ne se décode pas correctement.');
console.log('QR de test décodé depuis le rendu PDF : destination conforme.');
