import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const assets = path.join(root, 'assets');
const cursorAssets = path.join(
  'C:',
  'Users',
  'ilkse',
  '.cursor',
  'projects',
  'c-KARADEN-ZSOSYAL',
  'assets',
);
const source = path.join(cursorAssets, 'vora-icon-ios.png');
const monoSource = path.join(cursorAssets, 'vora-icon-mono.png');

const BG = '#1A1D26';

async function writeIcon(filename, size) {
  await sharp(source)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(path.join(assets, filename));
}

async function writeSolid(filename, size, color) {
  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: color,
    },
  })
    .png()
    .toFile(path.join(assets, filename));
}

async function writeFavicon() {
  await sharp(source)
    .resize(48, 48, { fit: 'cover' })
    .png()
    .toFile(path.join(assets, 'favicon.png'));
}

await mkdir(assets, { recursive: true });

await Promise.all([
  writeIcon('icon-ios.png', 1024),
  writeIcon('icon-android.png', 512),
  writeIcon('android-icon-foreground.png', 512),
  writeSolid('android-icon-background.png', 512, BG),
  sharp(monoSource).resize(512, 512).png().toFile(path.join(assets, 'android-icon-monochrome.png')),
  writeFavicon(),
]);

console.log('Icons generated: icon-ios 1024, icon-android 512');
