/** Reklam etkileşim gönderileri normal akışta görünmez. */
export function excludeAdEngagementPosts<T extends { is: (col: string, val: null) => T }>(
  query: T,
): T {
  return query.is('business_ad_id', null);
}
