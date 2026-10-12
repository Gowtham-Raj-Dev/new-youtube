import { REACTION_FITS, REACTION_PERCENT_DEFAULT, REACTION_POSITIONS, type ReactionLook } from "@shortflow/shared";

/**
 * Reaction videos are kept in this browser (IndexedDB), not in the cloud: they
 * are only ever used by the PC helper on this machine, so nothing is uploaded
 * or paid for. They are there again the next time Shorts are added.
 */
const DB_NAME = "shortflow-reactions";
const STORE = "videos";
const LAST_KEY = "shortflow:reaction";

export interface SavedReaction {
  id: string;
  name: string;
  file: File;
  addedAt: number;
}

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "id" });
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function store<T>(mode: IDBTransactionMode, work: (videos: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      const request = work(tx.objectStore(STORE));
      tx.oncomplete = () => resolve(request.result);
      tx.onerror = tx.onabort = () => reject(tx.error ?? request.error);
    });
  } finally {
    db.close();
  }
}

/** The reaction videos saved in this browser, newest first. Empty if the browser won't give us storage. */
export async function listReactions(): Promise<SavedReaction[]> {
  try {
    return (await store<SavedReaction[]>("readonly", (videos) => videos.getAll())).sort((a, b) => b.addedAt - a.addedAt);
  } catch {
    return [];
  }
}

/** Keeps `file` for next time. If the browser refuses, it still comes back, usable until the page is closed. */
export async function saveReaction(file: File): Promise<SavedReaction> {
  const saved: SavedReaction = { id: crypto.randomUUID(), name: file.name.replace(/\.[^.]+$/, ""), file, addedAt: Date.now() };
  await store("readwrite", (videos) => videos.put(saved)).catch(() => undefined);
  return saved;
}

export async function deleteReaction(id: string) {
  await store("readwrite", (videos) => videos.delete(id)).catch(() => undefined);
}

/** The reaction video used last time (null for none) and how it was set up. */
export interface LastReaction extends ReactionLook {
  id: string | null;
}

export function readLastReaction(): LastReaction {
  const fallback: LastReaction = { id: null, position: "bottom", percent: REACTION_PERCENT_DEFAULT, fit: "fill", focus: 0.5 };
  try {
    const last = JSON.parse(localStorage.getItem(LAST_KEY) ?? "null") as Partial<LastReaction> | null;
    if (!last) return fallback;
    return {
      id: typeof last.id === "string" ? last.id : null,
      position: REACTION_POSITIONS.includes(last.position as LastReaction["position"]) ? (last.position as LastReaction["position"]) : fallback.position,
      percent: typeof last.percent === "number" ? last.percent : fallback.percent,
      fit: REACTION_FITS.includes(last.fit as LastReaction["fit"]) ? (last.fit as LastReaction["fit"]) : fallback.fit,
      focus: typeof last.focus === "number" && last.focus >= 0 && last.focus <= 1 ? last.focus : fallback.focus,
    };
  } catch {
    return fallback;
  }
}

export function rememberLastReaction(last: LastReaction) {
  try {
    localStorage.setItem(LAST_KEY, JSON.stringify(last));
  } catch {
    // Storage is off or full: the choice just isn't remembered.
  }
}
