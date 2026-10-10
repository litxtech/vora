import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { ProfileStats } from '@/features/profile/types';
import {
  profileTabCounts,
  resolveActiveProfileTab,
  selectVisibleProfileTabs,
} from '@/features/profile/services/profileTabs';

const stats: ProfileStats = {
  followerCount: 0,
  followingCount: 0,
  friendCount: 0,
  postCount: 4,
  reelCount: 2,
  totalViews: 10,
  totalLikes: 8,
  totalComments: 1,
  totalQuotes: 99,
  profileViewCount: 3,
  quotePostCount: 1,
  mediaCount: 3,
  likedPostCount: 5,
  savedPostCount: 2,
};

test('başka profilde gizli beğeniler ve kayıtlar sekmesi görünmez', () => {
  const tabs = selectVisibleProfileTabs({ isOwnProfile: false, showLikedPosts: false }).map((tab) => tab.id);
  assert.deepEqual(tabs, ['posts', 'reels', 'quotes', 'media', 'badges']);
});

test('beğeniler herkese açıksa ziyaretçi sekmesi görünür', () => {
  const tabs = selectVisibleProfileTabs({ isOwnProfile: false, showLikedPosts: true }).map((tab) => tab.id);
  assert.ok(tabs.includes('liked'));
  assert.equal(tabs.includes('saved'), false);
});

test('kendi profilinde beğeni ve kayıt sekmeleri görünür', () => {
  const tabs = selectVisibleProfileTabs({ isOwnProfile: true, showLikedPosts: false }).map((tab) => tab.id);
  assert.ok(tabs.includes('liked'));
  assert.ok(tabs.includes('saved'));
});

test('gizli beğeni sayısı ziyaretçiye yazılmaz', () => {
  const counts = profileTabCounts({
    stats,
    isOwnProfile: false,
    showLikedPosts: false,
    badgeCount: 2,
  });
  assert.equal(counts.quotes, 1);
  assert.equal(counts.media, 3);
  assert.equal(counts.liked, undefined);
  assert.equal(counts.saved, undefined);
  assert.equal(counts.posts, 4);
  assert.notEqual(counts.quotes, stats.totalQuotes);
});

test('izin verilen beğeni ve kayıt sayıları görünür', () => {
  const counts = profileTabCounts({
    stats,
    isOwnProfile: true,
    showLikedPosts: false,
    badgeCount: 0,
  });
  assert.equal(counts.liked, 5);
  assert.equal(counts.saved, 2);
  assert.equal(counts.badges, 0);
});

test('görünmeyen sekme gönderilere döner', () => {
  const visible = selectVisibleProfileTabs({ isOwnProfile: false, showLikedPosts: false });
  assert.equal(resolveActiveProfileTab('liked', visible), 'posts');
  assert.equal(resolveActiveProfileTab('saved', visible), 'posts');
  assert.equal(resolveActiveProfileTab('media', visible), 'media');
});
