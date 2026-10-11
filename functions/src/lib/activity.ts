import { FieldValue, getFirestore, type WriteBatch } from "firebase-admin/firestore";
import { COLLECTIONS, type ActivityLogDoc, type NotificationDoc } from "@shortflow/shared";

type NewActivity = Omit<ActivityLogDoc, "userId" | "createdAt">;
type NewNotification = Omit<NotificationDoc, "userId" | "createdAt" | "read">;

/** Adds an audit-log entry to `batch`. */
export function logActivity(batch: WriteBatch, userId: string, entry: NewActivity) {
  const ref = getFirestore().collection(COLLECTIONS.activityLogs).doc();
  batch.set(ref, { ...entry, userId, createdAt: FieldValue.serverTimestamp() });
}

/** Adds an in-app notification to `batch`. */
export function notify(batch: WriteBatch, userId: string, notification: NewNotification) {
  const ref = getFirestore().collection(COLLECTIONS.notifications).doc();
  batch.set(ref, { ...notification, userId, read: false, createdAt: FieldValue.serverTimestamp() });
}
