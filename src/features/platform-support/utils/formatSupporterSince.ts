export function formatSupporterSinceDate(iso: string): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function platformSupporterNote(iso: string): string {
  return `Vora platformuna ${formatSupporterSinceDate(iso)} tarihinden beri destekçi.`;
}
