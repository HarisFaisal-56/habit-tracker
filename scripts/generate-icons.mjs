// Draws the app icon (a white check on an emerald tile, matching public/favicon.svg)
// as PNGs for the web app manifest and iOS. No dependencies: rasterises with 4x4
// supersampling and encodes PNG with node:zlib.
//
//   npm run icons
import { mkdirSync, writeFileSync } from "node:fs";
import { deflateSync } from "node:zlib";

const EMERALD = [5, 150, 105]; // #059669, Tailwind emerald-600
const WHITE = [255, 255, 255];
const SAMPLES = 4;

// The check mark in the favicon's 64x64 coordinate space.
const CHECK = [
  [19, 33.5],
  [28, 42],
  [45, 22],
];
const STROKE = 6;

function distanceToSegment(px, py, [ax, ay], [bx, by]) {
  const dx = bx - ax;
  const dy = by - ay;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy));
}

function inCheck(x, y) {
  return (
    distanceToSegment(x, y, CHECK[0], CHECK[1]) <= STROKE / 2 ||
    distanceToSegment(x, y, CHECK[1], CHECK[2]) <= STROKE / 2
  );
}

function inRoundedSquare(x, y, radius) {
  const cx = Math.min(Math.max(x, radius), 64 - radius);
  const cy = Math.min(Math.max(y, radius), 64 - radius);
  return Math.hypot(x - cx, y - cy) <= radius;
}

/**
 * @param size output width and height in pixels
 * @param options.radius corner radius in 64-unit space (0 = full-bleed square)
 * @param options.glyphScale shrinks the check towards the centre (maskable safe zone)
 */
function drawIcon(size, { radius, glyphScale = 1 }) {
  const pixels = Buffer.alloc(size * size * 4);
  for (let py = 0; py < size; py += 1) {
    for (let px = 0; px < size; px += 1) {
      let tile = 0;
      let check = 0;
      for (let sy = 0; sy < SAMPLES; sy += 1) {
        for (let sx = 0; sx < SAMPLES; sx += 1) {
          const x = ((px + (sx + 0.5) / SAMPLES) / size) * 64;
          const y = ((py + (sy + 0.5) / SAMPLES) / size) * 64;
          if (radius === 0 || inRoundedSquare(x, y, radius)) {
            tile += 1;
            const gx = 32 + (x - 32) / glyphScale;
            const gy = 32 + (y - 32) / glyphScale;
            if (inCheck(gx, gy)) check += 1;
          }
        }
      }
      const total = SAMPLES * SAMPLES;
      const mix = tile === 0 ? 0 : check / tile;
      const offset = (py * size + px) * 4;
      for (let channel = 0; channel < 3; channel += 1) {
        pixels[offset + channel] = Math.round(EMERALD[channel] * (1 - mix) + WHITE[channel] * mix);
      }
      pixels[offset + 3] = Math.round((tile / total) * 255);
    }
  }
  return encodePng(size, pixels);
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([length, body, crc]);
}

function encodePng(size, rgba) {
  const header = Buffer.alloc(13);
  header.writeUInt32BE(size, 0);
  header.writeUInt32BE(size, 4);
  header[8] = 8; // bit depth
  header[9] = 6; // RGBA
  // Each row starts with filter type 0 (none).
  const rows = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    rgba.copy(rows, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", header),
    chunk("IDAT", deflateSync(rows, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const icons = [
  // Rounded tile like the favicon, for browsers and desktop installs.
  { file: "pwa-192x192.png", size: 192, radius: 14 },
  { file: "pwa-512x512.png", size: 512, radius: 14 },
  // Full-bleed with the check inside the 80% safe zone; Android crops it to a shape.
  { file: "maskable-512x512.png", size: 512, radius: 0, glyphScale: 0.75 },
  // iOS adds its own rounded corners and ignores transparency.
  { file: "apple-touch-icon-180x180.png", size: 180, radius: 0, glyphScale: 0.85 },
];

mkdirSync("public", { recursive: true });
for (const { file, size, ...options } of icons) {
  writeFileSync(`public/${file}`, drawIcon(size, options));
  console.log(`public/${file}`);
}
