// In-memory stand-in for the parts of Firefox's `browser.storage` API that
// settings.js uses. Values are deep-copied in and out, like real storage.
export function installFakeBrowser() {
  const data = new Map();
  const listeners = new Set();
  const fake = {
    data,
    failNext: null, // set to "get", "set" or "remove" to make that call reject once

    fail(method) {
      if (fake.failNext === method) {
        fake.failNext = null;
        throw new Error(`fake storage.${method} failure`);
      }
    },

    emit(key, oldValue, newValue, areaName = "sync") {
      const changes = { [key]: { oldValue, newValue } };
      for (const listener of listeners) listener(changes, areaName);
    },

    storage: {
      sync: {
        async get(key) {
          fake.fail("get");
          return data.has(key) ? { [key]: structuredClone(data.get(key)) } : {};
        },
        async set(items) {
          fake.fail("set");
          for (const [key, value] of Object.entries(items)) {
            const oldValue = data.get(key);
            data.set(key, structuredClone(value));
            fake.emit(key, oldValue, structuredClone(value));
          }
        },
        async remove(key) {
          fake.fail("remove");
          if (!data.has(key)) return;
          const oldValue = data.get(key);
          data.delete(key);
          fake.emit(key, oldValue, undefined);
        },
      },
      onChanged: {
        addListener: (listener) => listeners.add(listener),
        removeListener: (listener) => listeners.delete(listener),
        get count() { return listeners.size; },
      },
    },
  };
  globalThis.browser = fake;
  return fake;
}
