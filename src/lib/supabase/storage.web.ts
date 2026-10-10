const memory = new Map<string, string>();

function browserStore(): Storage | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

/** Web oturumu localStorage'da kalır; tarayıcı kapanınca silinmez. */
export const supabaseAuthStorage = {
  async getItem(key: string): Promise<string | null> {
    const store = browserStore();
    if (!store) return memory.get(key) ?? null;
    return store.getItem(key);
  },

  async setItem(key: string, value: string): Promise<void> {
    const store = browserStore();
    if (!store) {
      memory.set(key, value);
      return;
    }
    store.setItem(key, value);
  },

  async removeItem(key: string): Promise<void> {
    const store = browserStore();
    memory.delete(key);
    store?.removeItem(key);
  },
};
