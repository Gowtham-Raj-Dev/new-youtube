// Read-only probe of the live Firebase project: is each service switched on?
// Usage: npm run check:firebase   (reads web/.env.local)
import { readFileSync } from "node:fs";

const env = Object.fromEntries(
  readFileSync(new URL("../web/.env.local", import.meta.url), "utf8")
    .split(/\r?\n/)
    .filter((line) => line.includes("=") && !line.startsWith("#"))
    .map((line) => [line.slice(0, line.indexOf("=")).trim(), line.slice(line.indexOf("=") + 1).trim()]),
);

const key = env.NEXT_PUBLIC_FIREBASE_API_KEY;
const projectId = env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const bucket = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;

async function json(url, init) {
  const res = await fetch(url, init);
  return { status: res.status, body: await res.json().catch(() => ({})) };
}

const post = (body) => ({ method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });

const checks = {
  async "Auth: initialised + Email/Password"() {
    const { body } = await json(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${key}`,
      post({ email: "probe@example.invalid", password: "probe-only", returnSecureToken: true }),
    );
    const msg = body.error?.message ?? "";
    if (msg.startsWith("CONFIGURATION_NOT_FOUND")) return [false, "Auth not initialised — click Get started in Authentication"];
    if (msg.startsWith("OPERATION_NOT_ALLOWED") || msg.startsWith("PASSWORD_LOGIN_DISABLED")) return [false, "Email/Password provider disabled"];
    return [true, "enabled"];
  },
  async "Auth: Google provider"() {
    const { body } = await json(
      `https://identitytoolkit.googleapis.com/v1/accounts:createAuthUri?key=${key}`,
      post({ providerId: "google.com", continueUri: "http://localhost:3000" }),
    );
    if (body.authUri) return [true, "enabled"];
    return [false, body.error?.message ?? "disabled"];
  },
  async "Firestore: (default) database"() {
    const { status, body } = await json(
      `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/probe?key=${key}`,
    );
    if (status === 403 && body.error?.status === "PERMISSION_DENIED" && !/API has not been used|disabled/.test(body.error.message))
      return [true, "exists, rules are denying anonymous reads ✓"];
    if (status === 404 && /^Document /.test(body.error?.message ?? "")) return [false, "exists, but rules allow anonymous reads (test mode?)"];
    if (status === 404) return [false, "database not created"];
    if (/API has not been used|disabled/.test(body.error?.message ?? "")) return [false, "Firestore API not enabled / database not created"];
    return [false, `unexpected ${status}: ${body.error?.message ?? "open to the public?"}`];
  },
  async "Storage: default bucket"() {
    const { status } = await json(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o?maxResults=1`);
    if (status === 403 || status === 401) return [true, "exists, rules are denying anonymous access ✓"];
    if (status === 404) return [false, "bucket not created (requires Blaze plan)"];
    if (status === 200) return [false, "exists, but rules allow anonymous listing (test mode?)"];
    return [false, `unexpected ${status}`];
  },
  async "Storage: CORS upload methods"() {
    const res = await fetch(`https://firebasestorage.googleapis.com/v0/b/${bucket}/o`, {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type,x-goog-upload-protocol,x-goog-resumable",
      },
    });
    const allowMethods = res.headers.get("access-control-allow-methods") || "";
    const methods = allowMethods.split(",").map((m) => m.trim().toUpperCase());
    if (methods.includes("POST") || methods.includes("*")) {
      return [true, `CORS permits uploads (${allowMethods}) ✓`];
    }
    return [
      false,
      `CORS allows: "${allowMethods || 'none'}". Must include POST/PUT or uploads fail with storage/unknown.`,
    ];
  },
};

let allOk = true;
console.log(`Firebase project: ${projectId}\n`);
for (const [name, run] of Object.entries(checks)) {
  try {
    const [ok, detail] = await run();
    allOk &&= ok;
    console.log(`${ok ? "✔" : "✘"} ${name.padEnd(36)} ${detail}`);
  } catch (error) {
    allOk = false;
    console.log(`✘ ${name.padEnd(36)} ${error.message}`);
  }
}
process.exitCode = allOk ? 0 : 1;
