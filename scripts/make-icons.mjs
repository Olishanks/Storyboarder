// Draws the app icon (three storyboard frames) and writes the PNG sizes the manifest needs.
// Run: node scripts/make-icons.mjs
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';

const INK = [28, 27, 24];
const PAPER = [253, 252, 249];
const ACCENT = [42, 82, 190];

function crc32(buffer) {
  let crc = -1;
  for (const byte of buffer) {
    crc ^= byte;
    for (let k = 0; k < 8; k += 1) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ -1) >>> 0;
}

function chunk(type, data) {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(data.length, 0);
  head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), data])), 0);
  return Buffer.concat([head, data, tail]);
}

function png(size, pixel) {
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    const row = y * (size * 3 + 1);
    for (let x = 0; x < size; x += 1) raw.set(pixel(x / size, y / size), row + 1 + x * 3);
  }
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header.set([8, 2, 0, 0, 0], 8);
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', header),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

// Three upright frames; the middle one is the shot being worked on.
const frames = [
  { x: 0.2, color: PAPER },
  { x: 0.41, color: ACCENT },
  { x: 0.62, color: PAPER },
];
const icon = (u, v) => {
  for (const frame of frames) {
    if (u >= frame.x && u < frame.x + 0.18 && v >= 0.3 && v < 0.7) return frame.color;
  }
  return INK;
};

mkdirSync('public/icons', { recursive: true });
for (const size of [180, 192, 512]) writeFileSync(`public/icons/icon-${size}.png`, png(size, icon));
console.log('icons written');
