const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function createMetroReaderPNG(width, height, isMaskable = false) {
  const rowBytes = width * 4;
  const rawData = Buffer.alloc((rowBytes + 1) * height);
  const cx = width / 2;
  const cy = height / 2;

  // Render pixels
  for (let y = 0; y < height; y++) {
    const rowOffset = y * (rowBytes + 1);
    rawData[rowOffset] = 0; // Filter None

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;
      const u = x / width;
      const v = y / height;
      const dx = (x - cx) / width;
      const dy = (y - cy) / height;

      // Dark blue background with top-right purple & bottom-left cyan ambient glow
      const distTopRight = Math.hypot(u - 0.85, v - 0.15);
      const distBotLeft = Math.hypot(u - 0.15, v - 0.85);

      let r = 5;
      let g = 8;
      let b = 22;

      // Ambient glows
      r += Math.max(0, 75 * (1 - distTopRight * 1.5));
      b += Math.max(0, 110 * (1 - distTopRight * 1.5));
      g += Math.max(0, 50 * (1 - distBotLeft * 1.6));
      b += Math.max(0, 90 * (1 - distBotLeft * 1.6));

      if (!isMaskable) {
        // Rounded corner squircle
        const cornerDist = Math.max(Math.abs(dx), Math.abs(dy));
        if (cornerDist > 0.46) {
          rawData[pixelOffset + 3] = 0;
          continue;
        }
      }

      // Check if within Book Shape
      // Book center: y from 0.28 to 0.74, x from 0.16 to 0.84
      const bookTop = 0.26 + 0.04 * Math.sin((u - 0.5) * Math.PI);
      const bookBottom = 0.74 + 0.05 * Math.sin((u - 0.5) * Math.PI);

      if (u >= 0.16 && u <= 0.84 && v >= bookTop && v <= bookBottom) {
        const isLeftPage = u < 0.49;
        const isRightPage = u > 0.51;

        if (isLeftPage) {
          // Electric Cyan gradient
          const pageProg = (u - 0.16) / 0.33;
          r = Math.round(0 + pageProg * 10);
          g = Math.round(180 + pageProg * 60);
          b = Math.round(230 + pageProg * 25);
        } else if (isRightPage) {
          // Vivid Magenta / Purple gradient
          const pageProg = (u - 0.51) / 0.33;
          r = Math.round(160 + pageProg * 70);
          g = Math.round(30 + pageProg * 40);
          b = Math.round(210 + pageProg * 40);
        }

        // Center Play Button (Silhouette)
        // Triangle centered at u: 0.50, v: 0.50
        // Pointing right
        const triX = u - 0.44;
        const triY = Math.abs(v - 0.50);
        if (triX >= 0 && triX <= 0.16 && triY <= (0.16 - triX) * 0.9) {
          r = 4;
          g = 7;
          b = 20; // Dark silhouette
        }

        // Soundwave Arcs on Right Page
        if (isRightPage) {
          const waveDist = Math.hypot(u - 0.52, (v - 0.50) * 1.1);
          // 3 arcs
          const arc1 = Math.abs(waveDist - 0.11) < 0.022;
          const arc2 = Math.abs(waveDist - 0.18) < 0.024;
          const arc3 = Math.abs(waveDist - 0.25) < 0.026;

          if ((arc1 || arc2 || arc3) && u > 0.55 && Math.abs(v - 0.50) < 0.22) {
            // White neon soundwave
            r = 250;
            g = 240;
            b = 255;
          }
        }
      }

      rawData[pixelOffset] = Math.min(255, Math.max(0, Math.round(r)));
      rawData[pixelOffset + 1] = Math.min(255, Math.max(0, Math.round(g)));
      rawData[pixelOffset + 2] = Math.min(255, Math.max(0, Math.round(b)));
      rawData[pixelOffset + 3] = 255;
    }
  }

  // Compress IDAT
  const compressedData = zlib.deflateSync(rawData);

  function makeChunk(type, data) {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const body = Buffer.concat([typeBuf, data]);
    const crc = crc32(body);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crc, 0);
    return Buffer.concat([len, body, crcBuf]);
  }

  const crcTable = [];
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
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

  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8;
  ihdrData[9] = 6;
  ihdrData[10] = 0;
  ihdrData[11] = 0;
  ihdrData[12] = 0;

  const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  return Buffer.concat([
    pngSignature,
    makeChunk('IHDR', ihdrData),
    makeChunk('IDAT', compressedData),
    makeChunk('IEND', Buffer.alloc(0))
  ]);
}

const publicDir = path.resolve(__dirname, '../public');
fs.writeFileSync(path.join(publicDir, 'pwa-192x192.png'), createMetroReaderPNG(192, 192, false));
fs.writeFileSync(path.join(publicDir, 'pwa-512x512.png'), createMetroReaderPNG(512, 512, false));
fs.writeFileSync(path.join(publicDir, 'pwa-maskable-512x512.png'), createMetroReaderPNG(512, 512, true));
fs.writeFileSync(path.join(publicDir, 'apple-touch-icon.png'), createMetroReaderPNG(180, 180, false));
console.log('Successfully generated Metro Reader PWA icons!');
