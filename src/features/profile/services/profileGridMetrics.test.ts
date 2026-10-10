import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  PROFILE_GRID_COLUMNS,
  PROFILE_GRID_MAX_WIDTH,
  chunkProfileGridItems,
  resolveProfileGridCellSize,
  resolveProfileGridContainerWidth,
} from '@/features/profile/services/profileGridMetrics';

const GAP = 1;
const PAGE_PADDING = 24;

test('telefon genişliğinde ızgara 3 sütuna bölünür ve pencereyi aşmaz', () => {
  const containerWidth = resolveProfileGridContainerWidth({
    windowWidth: 390,
    fullBleed: true,
    pagePadding: PAGE_PADDING,
  });
  const cellSize = resolveProfileGridCellSize(containerWidth, GAP);

  assert.equal(containerWidth, 390);
  assert.equal(cellSize, Math.floor((390 - GAP * (PROFILE_GRID_COLUMNS - 1)) / PROFILE_GRID_COLUMNS));
  assert.ok(cellSize * PROFILE_GRID_COLUMNS + GAP * (PROFILE_GRID_COLUMNS - 1) <= containerWidth);
  assert.ok(cellSize < 390 / 2);
});

test('geniş pencerede hücre yarım ekran karesine büyümez', () => {
  const containerWidth = resolveProfileGridContainerWidth({
    windowWidth: 1280,
    measuredWidth: 1280,
    fullBleed: true,
    pagePadding: PAGE_PADDING,
  });
  const cellSize = resolveProfileGridCellSize(containerWidth, GAP);

  assert.equal(containerWidth, PROFILE_GRID_MAX_WIDTH);
  assert.equal(cellSize, Math.floor((PROFILE_GRID_MAX_WIDTH - 2) / 3));
  assert.ok(cellSize * 2 < 1280 / 2);
});

test('ölçülen daha geniş tur ızgarayı büyütmez', () => {
  const first = resolveProfileGridContainerWidth({
    windowWidth: 390,
    measuredWidth: 342,
    fullBleed: true,
    pagePadding: PAGE_PADDING,
  });
  const grown = resolveProfileGridContainerWidth({
    windowWidth: 390,
    measuredWidth: 900,
    fullBleed: true,
    pagePadding: PAGE_PADDING,
  });
  assert.equal(first, grown);
});

test('gönderiler satır satır dizilir; tek satırda yığılmaz', () => {
  const rows = chunkProfileGridItems(['a', 'b', 'c', 'd', 'e', 'f', 'g'], PROFILE_GRID_COLUMNS);
  assert.deepEqual(rows, [
    ['a', 'b', 'c'],
    ['d', 'e', 'f'],
    ['g'],
  ]);
});

test('boş liste satır üretmez', () => {
  assert.deepEqual(chunkProfileGridItems([], PROFILE_GRID_COLUMNS), []);
});

test('tek satırlık liste tek satırdır ve fazladan satır eklemez', () => {
  const rows = chunkProfileGridItems(['a', 'b'], PROFILE_GRID_COLUMNS);
  assert.equal(rows.length, 1);
  assert.deepEqual(rows[0], ['a', 'b']);
});
