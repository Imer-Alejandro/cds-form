const zlib = require("zlib");
const fs = require("fs");
const path = require("path");

// CRC32 table
let crcTable = [];
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  crcTable[n] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, "ascii");
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}

function encodePNG(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  const raw = Buffer.alloc((width * 4 + 1) * height);
  let o = 0;
  for (let y = 0; y < height; y++) {
    raw[o++] = 0; // filter none
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      raw[o++] = rgba[idx];
      raw[o++] = rgba[idx + 1];
      raw[o++] = rgba[idx + 2];
      raw[o++] = rgba[idx + 3];
    }
  }

  const idat = zlib.deflateSync(raw);
  return Buffer.concat([
    sig,
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

const TEAL = [13, 115, 119];
const WHITE = [255, 255, 255];

function drawIcon(size) {
  const rgba = Buffer.alloc(size * size * 4);
  // Background gradient teal (dark at top, slightly lighter bottom)
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const t = y / size;
      rgba[idx] = Math.round(TEAL[0] * (1 - t) + 11 * t);
      rgba[idx + 1] = Math.round(TEAL[1] * (1 - t) + 111 * t);
      rgba[idx + 2] = Math.round(TEAL[2] * (1 - t) + 126 * t);
      rgba[idx + 3] = 255;
    }
  }

  const s = size / 512; // scale factor relative to 512 design

  const fillRect = (x0, y0, w, h, color) => {
    for (let y = Math.round(y0 * s); y < Math.round((y0 + h) * s); y++) {
      for (let x = Math.round(x0 * s); x < Math.round((x0 + w) * s); x++) {
        if (x < 0 || y < 0 || x >= size || y >= size) continue;
        const idx = (y * size + x) * 4;
        rgba[idx] = color[0];
        rgba[idx + 1] = color[1];
        rgba[idx + 2] = color[2];
        rgba[idx + 3] = 255;
      }
    }
  };

  // Clipboard / document with a checkbox-list motif (white on teal)
  // Document body
  fillRect(150, 90, 212, 340, WHITE);
  // Document top fold (corner)
  fillRect(150, 90, 212, 60, WHITE);
  // Header bar
  fillRect(150, 90, 212, 46, WHITE);

  // Three list rows with checkboxes
  const rowColor = [223, 240, 240];
  const checkColor = TEAL;
  const rows = [160, 250, 340];
  for (let i = 0; i < rows.length; i++) {
    const y = rows[i];
    // checkbox
    fillRect(190, y, 44, 44, checkColor);
    // line
    fillRect(255, y + 12, 80, 20, rowColor);
    fillRect(255, y + 46, 60, 12, rowColor);
  }

  return rgba;
}

const dir = path.join(__dirname, "..", "public", "icons");
fs.mkdirSync(dir, { recursive: true });

for (const size of [192, 512, 180]) {
  const rgba = drawIcon(size);
  const png = encodePNG(size, size, rgba);
  fs.writeFileSync(path.join(dir, `icon-${size}.png`), png);
  console.log(`Generated icon-${size}.png (${png.length} bytes)`);
}
