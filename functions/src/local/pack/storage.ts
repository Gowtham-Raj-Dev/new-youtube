// Stands in for `firebase-admin/storage` in the downloadable helper, which never reads Storage itself.
export function getStorage(): never {
  throw new Error("Storage isn't available in the PC helper.");
}
