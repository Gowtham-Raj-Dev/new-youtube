import { onMessagePublished } from "firebase-functions/pubsub";
import * as logger from "firebase-functions/logger";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { COLLECTIONS } from "@shortflow/shared";
import { notify } from "../lib/activity";

/**
 * The Pub/Sub topic a Cloud Billing budget posts to. Connect it once in the
 * Cloud console: Billing → Budgets & alerts → the budget → "Connect a Pub/Sub
 * topic to this budget" → projects/fir-4b5dc/topics/budget-alerts.
 */
export const BUDGET_TOPIC = "budget-alerts";

/** What Cloud Billing sends: https://cloud.google.com/billing/docs/how-to/budgets-programmatic-notifications */
interface BudgetNotification {
  budgetDisplayName?: string;
  costAmount?: number;
  budgetAmount?: number;
  currencyCode?: string;
}

/**
 * The budget guard: once the month's cost reaches the budget, every channel's
 * AI Shorts are switched off, so the bill stops growing from them. The rest of
 * the app keeps running. Switching them on again on the AI Shorts page is the
 * owner's choice.
 */
export const budgetGuard = onMessagePublished<BudgetNotification>({ topic: BUDGET_TOPIC, retry: false }, async (event) => {
  const { costAmount, budgetAmount, currencyCode, budgetDisplayName } = event.data.message.json ?? {};
  if (typeof costAmount !== "number" || typeof budgetAmount !== "number" || budgetAmount <= 0) return;
  if (costAmount < budgetAmount) return;

  const db = getFirestore();
  const on = await db.collection(COLLECTIONS.autoShorts).where("enabled", "==", true).get();
  if (on.empty) return;
  const amount = `${currencyCode ?? ""} ${costAmount.toFixed(2)}`.trim();
  const reason = `Paused because this month's cost reached ${amount} (budget “${budgetDisplayName ?? "budget"}”: ${budgetAmount}).`;
  const batch = db.batch();
  const owners = new Set<string>();
  for (const doc of on.docs) {
    batch.update(doc.ref, { enabled: false, pausedReason: reason, updatedAt: FieldValue.serverTimestamp() });
    owners.add(String(doc.get("userId")));
  }
  for (const userId of owners) {
    notify(batch, userId, { kind: "warning", title: "AI Shorts paused", body: reason, link: "/ai-shorts" });
  }
  await batch.commit();
  logger.warn("Budget reached: AI Shorts paused", { costAmount, budgetAmount, channels: on.size });
});
