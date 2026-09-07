import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

// Convert the existing app artwork without changing the logo or installing new dependencies.
const publicDirectory = new URL('../public/', import.meta.url);
const source = new URL('favicon.svg', publicDirectory);
const render = size => sharp(fileURLToPath(source), { density: 192 }).resize(size, size).png().toBuffer();

const frames = await Promise.all([16, 32, 48, 64].map(async size => ({ size, png: await render(size) })));
const directory = Buffer.alloc(6 + frames.length * 16);
directory.writeUInt16LE(1, 2);
directory.writeUInt16LE(frames.length, 4);
let offset = directory.length;
for (const [index, { size, png }] of frames.entries()) {
  const entry = 6 + index * 16;
  directory.writeUInt8(size, entry);
  directory.writeUInt8(size, entry + 1);
  directory.writeUInt16LE(1, entry + 4);
  directory.writeUInt16LE(32, entry + 6);
  directory.writeUInt32LE(png.length, entry + 8);
  directory.writeUInt32LE(offset, entry + 12);
  offset += png.length;
}

await Promise.all([
  writeFile(new URL('favicon.ico', publicDirectory), Buffer.concat([directory, ...frames.map(frame => frame.png)])),
  writeFile(new URL('favicon-16x16.png', publicDirectory), frames[0].png),
  writeFile(new URL('favicon-32x32.png', publicDirectory), frames[1].png),
  render(180).then(png => writeFile(new URL('apple-touch-icon.png', publicDirectory), png)),
]);
console.log('Generated the ICO, PNG favicons, and Apple touch icon from the DiskPress artwork.');
