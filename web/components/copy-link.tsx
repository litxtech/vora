'use client';

export function CopyLink({ url }: { url: string }) {
  return (
    <button
      type="button"
      onClick={() => {
        void navigator.clipboard?.writeText(url);
      }}
    >
      Bağlantıyı kopyala
    </button>
  );
}
