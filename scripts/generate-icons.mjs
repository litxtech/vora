import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'assets');

const iosSrc = process.argv[2] ?? path.join(assets, 'icon-source-ios.jpg');
const androidSrc = process.argv[3] ?? path.join(assets, 'icon-source-android.jpg');

const ANDROID = 1024;
/** Circular launcher mask diameter is the 72dp keyline on a 108dp canvas. */
const CIRCLE_RADIUS = (ANDROID * 72) / 108 / 2 - 14;

function clamp(n) {
  return Math.max(0, Math.min(255, Math.round(n)));
}

async function opaqueSquare(src, size) {
  const { data, info } = await sharp(src)
    .flatten({ background: '#ffffff' })
    .resize(size, size, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  for (let i = 0; i < data.length; i += 3) {
    if (data[i] >= 248 && data[i + 1] >= 248 && data[i + 2] >= 248) {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
    }
  }

  return sharp(data, { raw: { width: info.width, height: info.height, channels: 3 } })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

function knockOutWhite(data) {
  const out = Buffer.alloc((data.length / 3) * 4);
  for (let p = 0, o = 0; p < data.length; p += 3, o += 4) {
    const r = data[p];
    const g = data[p + 1];
    const b = data[p + 2];
    const min = Math.min(r, g, b);
    let a = 255 - min;
    if (a < 12) continue;
    if (a > 246) a = 255;
    const af = a / 255;
    const inv = 1 - af;
    out[o] = clamp((r - 255 * inv) / af);
    out[o + 1] = clamp((g - 255 * inv) / af);
    out[o + 2] = clamp((b - 255 * inv) / af);
    out[o + 3] = a;
  }
  return out;
}

async function androidLayers() {
  const base = await opaqueSquare(androidSrc, 512);
  const { data, info } = await sharp(base).raw().toBuffer({ resolveWithObject: true });
  const knocked = knockOutWhite(data);
  const trimmed = await sharp(knocked, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .trim({ threshold: 1 })
    .png()
    .toBuffer({ resolveWithObject: true });

  const trimmedRaw = await sharp(trimmed.data).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const tw = trimmedRaw.info.width;
  const th = trimmedRaw.info.height;
  const tcx = (tw - 1) / 2;
  const tcy = (th - 1) / 2;
  let maxDistance = 1;
  for (let y = 0; y < th; y++) {
    for (let x = 0; x < tw; x++) {
      const alpha = trimmedRaw.data[(y * tw + x) * 4 + 3];
      if (alpha < 40) continue;
      const distance = Math.hypot(x - tcx, y - tcy);
      if (distance > maxDistance) maxDistance = distance;
    }
  }
  const scale = CIRCLE_RADIUS / maxDistance;
  const fitted = await sharp(trimmed.data)
    .resize({
      width: Math.max(1, Math.round(tw * scale)),
      height: Math.max(1, Math.round(th * scale)),
      fit: 'fill',
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  const left = Math.round((ANDROID - fitted.info.width) / 2);
  const top = Math.round((ANDROID - fitted.info.height) / 2);

  const foreground = await sharp({
    create: {
      width: ANDROID,
      height: ANDROID,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted.data, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  const full = await sharp({
    create: { width: ANDROID, height: ANDROID, channels: 3, background: '#ffffff' },
  })
    .composite([{ input: fitted.data, left, top }])
    .flatten({ background: '#ffffff' })
    .removeAlpha()
    .png({ compressionLevel: 9 })
    .toBuffer();

  const background = await sharp({
    create: { width: ANDROID, height: ANDROID, channels: 3, background: '#ffffff' },
  })
    .png({ compressionLevel: 9 })
    .toBuffer();

  const { data: fg, info: fgInfo } = await sharp(fitted.data)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const monoPx = Buffer.alloc(fg.length);
  for (let i = 0; i < fg.length; i += 4) {
    monoPx[i] = 255;
    monoPx[i + 1] = 255;
    monoPx[i + 2] = 255;
    monoPx[i + 3] = fg[i + 3];
  }
  const monoFitted = await sharp(monoPx, {
    raw: { width: fgInfo.width, height: fgInfo.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const monochrome = await sharp({
    create: {
      width: ANDROID,
      height: ANDROID,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: monoFitted, left, top }])
    .png({ compressionLevel: 9 })
    .toBuffer();

  const noteSide = 96;
  const noteMax = Math.round(noteSide * 0.86);
  const noteFitted = await sharp(monoFitted)
    .resize({ width: noteMax, height: noteMax, fit: 'inside' })
    .png()
    .toBuffer({ resolveWithObject: true });
  const notification = await sharp({
    create: {
      width: noteSide,
      height: noteSide,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: noteFitted.data,
        left: Math.round((noteSide - noteFitted.info.width) / 2),
        top: Math.round((noteSide - noteFitted.info.height) / 2),
      },
    ])
    .png()
    .toBuffer();

  return { foreground, full, background, monochrome, notification };
}

function pngIco(images) {
  const count = images.length;
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(count, 4);
  const dir = Buffer.alloc(16 * count);
  let offset = 6 + 16 * count;
  for (let i = 0; i < count; i++) {
    const { size, png } = images[i];
    const o = i * 16;
    dir[o] = size >= 256 ? 0 : size;
    dir[o + 1] = size >= 256 ? 0 : size;
    dir.writeUInt16LE(1, o + 4);
    dir.writeUInt16LE(32, o + 6);
    dir.writeUInt32LE(png.length, o + 8);
    dir.writeUInt32LE(offset, o + 12);
    offset += png.length;
  }
  return Buffer.concat([header, dir, ...images.map((img) => img.png)]);
}

const iosPng = await opaqueSquare(iosSrc, 1024);
const android = await androidLayers();

writeFileSync(path.join(assets, 'icon-ios.png'), iosPng);
writeFileSync(path.join(assets, 'icon-android.png'), android.full);
writeFileSync(path.join(assets, 'android-icon-foreground.png'), android.foreground);
writeFileSync(path.join(assets, 'android-icon-background.png'), android.background);
writeFileSync(path.join(assets, 'android-icon-monochrome.png'), android.monochrome);
writeFileSync(path.join(assets, 'android-notification-icon.png'), android.notification);
writeFileSync(path.join(assets, 'favicon.png'), await sharp(iosPng).resize(48, 48).png().toBuffer());
writeFileSync(path.join(root, 'web/public/vora-logo.png'), iosPng);

const icoImages = [];
for (const size of [16, 32, 48]) {
  icoImages.push({ size, png: await sharp(iosPng).resize(size, size).png().toBuffer() });
}
writeFileSync(path.join(root, 'web/public/favicon.ico'), pngIco(icoImages));

for (const file of [
  'icon-ios.png',
  'icon-android.png',
  'android-icon-foreground.png',
  'android-icon-background.png',
  'android-icon-monochrome.png',
  'android-notification-icon.png',
  'favicon.png',
]) {
  const meta = await sharp(path.join(assets, file)).metadata();
  console.log(file, meta.width, meta.height, 'alpha', meta.hasAlpha);
}

console.log('icons written');
