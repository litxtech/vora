import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'assets');

const src =
  process.argv[2] ??
  path.join(assets, 'vora-logo-android-source.png');

const SIZE = 1024;
/** Squircle logo — fill canvas without cropping orbit/V tips (safe ~66% mask). */
const CONTENT_RATIO = 0.9;
const BG = { r: 255, g: 255, b: 255 };

async function main() {
  if (!fs.existsSync(src)) {
    throw new Error(`Source logo not found: ${src}`);
  }

  const meta = await sharp(src).metadata();
  console.log('source', meta.width, meta.height);

  const trimmed = await sharp(src)
    .trim({ background: '#000000', threshold: 18 })
    .png()
    .toBuffer({ resolveWithObject: true });

  console.log('trimmed', trimmed.info.width, trimmed.info.height);

  const maxSide = Math.round(SIZE * CONTENT_RATIO);
  const fitted = await sharp(trimmed.data)
    .resize({
      width: maxSide,
      height: maxSide,
      fit: 'inside',
      withoutEnlargement: false,
    })
    .png()
    .toBuffer({ resolveWithObject: true });

  console.log('fitted', fitted.info.width, fitted.info.height);

  const left = Math.round((SIZE - fitted.info.width) / 2);
  const top = Math.round((SIZE - fitted.info.height) / 2);

  const foreground = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: fitted.data, left, top }])
    .png()
    .toBuffer();

  const fullIcon = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 3,
      background: BG,
    },
  })
    .composite([{ input: fitted.data, left, top }])
    .png()
    .toBuffer();

  const background = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 3,
      background: BG,
    },
  })
    .png()
    .toBuffer();

  const monoRaw = await sharp(fitted.data).greyscale().normalize().threshold(24).png().toBuffer();
  const monoFg = await sharp(monoRaw).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { data, info } = monoFg;
  for (let i = 0; i < data.length; i += 4) {
    const v = data[i];
    if (v < 40) {
      data[i] = 0;
      data[i + 1] = 0;
      data[i + 2] = 0;
      data[i + 3] = 0;
    } else {
      data[i] = 255;
      data[i + 1] = 255;
      data[i + 2] = 255;
      data[i + 3] = 255;
    }
  }

  const monoFitted = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  const mono = await sharp({
    create: {
      width: SIZE,
      height: SIZE,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: monoFitted, left, top }])
    .png()
    .toBuffer();

  const outFg = path.join(assets, 'android-icon-foreground.png');
  const outBg = path.join(assets, 'android-icon-background.png');
  const outMono = path.join(assets, 'android-icon-monochrome.png');
  const outAndroid = path.join(assets, 'icon-android.png');

  fs.writeFileSync(outFg, foreground);
  fs.writeFileSync(outBg, background);
  fs.writeFileSync(outMono, mono);
  fs.writeFileSync(outAndroid, fullIcon);
  fs.copyFileSync(src, path.join(assets, 'vora-logo-full.png'));

  for (const f of [outFg, outBg, outMono, outAndroid]) {
    const m = await sharp(f).metadata();
    console.log(path.basename(f), m.width, m.height, fs.statSync(f).size);
  }
  console.log('done');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
