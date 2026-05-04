import { idbGetMany, idbRemove, idbSet } from "./indexedDb.js";

export const loadJson = (key, fallback) => {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) : fallback;
  } catch {
    return fallback;
  }
};

export const saveJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage write failures so billing UI never blocks.
  }

  Promise.resolve().then(() => idbSet(key, value).catch(() => {}));
};

export const removeJson = (key) => {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }

  Promise.resolve().then(() => idbRemove(key).catch(() => {}));
};

export const loadManyFromPersistence = async (keys = []) => {
  const persisted = await idbGetMany(keys);
  return persisted;
};
