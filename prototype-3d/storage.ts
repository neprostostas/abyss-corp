/** Separate local playtest saves while reusing the production save format. */
export function isolateStorage(backing: Storage, prefix: string): Storage {
  const keys = () => Object.keys(backing).filter((k) => k.startsWith(prefix));
  return {
    get length() {
      return keys().length;
    },
    key(index) {
      return keys()[index]?.slice(prefix.length) ?? null;
    },
    getItem(key) {
      return backing.getItem(prefix + key);
    },
    setItem(key, value) {
      backing.setItem(prefix + key, value);
    },
    removeItem(key) {
      backing.removeItem(prefix + key);
    },
    clear() {
      keys().forEach((key) => backing.removeItem(key));
    },
  };
}
