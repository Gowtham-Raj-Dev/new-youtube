// Security rules tests. Run with: npm run test:rules (needs Java 21+ for the emulators).
import { readFileSync } from "node:fs";
import { after, before, beforeEach, describe, test } from "node:test";
import { assertFails, assertSucceeds, initializeTestEnvironment } from "@firebase/rules-unit-testing";
import firebase from "firebase/compat/app";

const serverTimestamp = () => firebase.firestore.FieldValue.serverTimestamp();
const GiB = 1024 ** 3;

let env;

before(async () => {
  env = await initializeTestEnvironment({
    projectId: "demo-shortflow",
    firestore: { rules: readFileSync("firestore.rules", "utf8"), host: "127.0.0.1", port: 8080 },
    storage: { rules: readFileSync("storage.rules", "utf8"), host: "127.0.0.1", port: 9199 },
  });
});

beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
});

after(() => env.cleanup());

const alice = () => env.authenticatedContext("alice", { email: "alice@example.com" });
const bob = () => env.authenticatedContext("bob", { email: "bob@example.com" });

function newUser(overrides = {}) {
  return {
    displayName: "Alice",
    email: "alice@example.com",
    photoURL: null,
    timezone: "Asia/Kolkata",
    createdAt: serverTimestamp(),
    lastLoginAt: serverTimestamp(),
    plan: "free",
    youtubeConnected: false,
    ...overrides,
  };
}

function newSettings(uid, overrides = {}) {
  return {
    userId: uid,
    processing: { shortDuration: 60, cropMode: "blur", outputQuality: "high", clippingStrategy: "fixed" },
    publishing: {
      timezone: "Asia/Kolkata",
      defaultPrivacy: "public",
      defaultUploadTime: "18:00",
      titleTemplate: "{videoTitle} — Part {part}",
      defaultDescription: "Watch till the end!",
      defaultTags: ["shorts"],
      categoryId: "22",
    },
    automation: {
      autoProcess: false,
      autoGenerate: false,
      autoSchedule: false,
      autoUpload: false,
      intervalMinutes: 240,
      publishDays: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"],
      maxPerDay: 6,
    },
    storage: { deleteSourceAfterProcessing: false },
    notifications: { processing: true, uploads: true, failures: true },
    updatedAt: serverTimestamp(),
    ...overrides,
  };
}

function newVideo(uid, videoId, overrides = {}) {
  return {
    userId: uid,
    title: "My Horror Story",
    fileName: "story.mp4",
    storagePath: `users/${uid}/videos/original/${videoId}/source.mp4`,
    contentType: "video/mp4",
    fileSize: 16,
    status: "uploading",
    createdAt: serverTimestamp(),
    uploadedAt: null,
    durationSec: null,
    width: null,
    height: null,
    thumbnailPath: null,
    processingStartedAt: null,
    processingCompletedAt: null,
    shortsCount: 0,
    activeJobId: null,
    errorMessage: null,
    ...overrides,
  };
}

async function seed(path, data) {
  await env.withSecurityRulesDisabled((ctx) => ctx.firestore().doc(path).set(data));
}

describe("users", () => {
  test("can create own profile", async () => {
    await assertSucceeds(alice().firestore().doc("users/alice").set(newUser()));
  });
  test("cannot create someone else's profile", async () => {
    await assertFails(bob().firestore().doc("users/alice").set(newUser()));
  });
  test("cannot self-assign a paid plan or YouTube connection", async () => {
    await assertFails(alice().firestore().doc("users/alice").set(newUser({ plan: "pro" })));
    await assertFails(alice().firestore().doc("users/alice").set(newUser({ youtubeConnected: true })));
  });
  test("cannot spoof another email", async () => {
    await assertFails(alice().firestore().doc("users/alice").set(newUser({ email: "boss@example.com" })));
  });
  test("can change timezone but not server fields", async () => {
    await alice().firestore().doc("users/alice").set(newUser());
    const ref = alice().firestore().doc("users/alice");
    await assertSucceeds(ref.update({ timezone: "Europe/London" }));
    await assertFails(ref.update({ plan: "pro" }));
    await assertFails(ref.update({ youtubeConnected: true }));
  });
  test("cannot read another user's profile", async () => {
    await alice().firestore().doc("users/alice").set(newUser());
    await assertFails(bob().firestore().doc("users/alice").get());
  });
});

describe("settings", () => {
  test("can save valid settings", async () => {
    await assertSucceeds(alice().firestore().doc("settings/alice").set(newSettings("alice")));
  });
  test("rejects invalid enum values", async () => {
    const bad = newSettings("alice");
    bad.processing = { ...bad.processing, cropMode: "stretch" };
    await assertFails(alice().firestore().doc("settings/alice").set(bad));
  });
  test("rejects smart clipping until supported", async () => {
    const bad = newSettings("alice");
    bad.processing = { ...bad.processing, clippingStrategy: "highlight" };
    await assertFails(alice().firestore().doc("settings/alice").set(bad));
  });
  test("cannot write another user's settings", async () => {
    await assertFails(bob().firestore().doc("settings/alice").set(newSettings("alice")));
  });
});

describe("videos", () => {
  test("can reserve an upload", async () => {
    await assertSucceeds(alice().firestore().doc("videos/v1").set(newVideo("alice", "v1")));
  });
  test("cannot create a video already marked completed", async () => {
    await assertFails(alice().firestore().doc("videos/v1").set(newVideo("alice", "v1", { status: "completed" })));
  });
  test("cannot point storagePath at another user", async () => {
    await assertFails(
      alice().firestore().doc("videos/v1").set(newVideo("alice", "v1", { storagePath: "users/bob/videos/original/v1/source.mp4" })),
    );
  });
  test("rejects files over 10 GiB", async () => {
    await assertFails(alice().firestore().doc("videos/v1").set(newVideo("alice", "v1", { fileSize: 10 * GiB + 1 })));
  });
  test("can rename but not change status or shortsCount", async () => {
    await alice().firestore().doc("videos/v1").set(newVideo("alice", "v1"));
    const ref = alice().firestore().doc("videos/v1");
    await assertSucceeds(ref.update({ title: "Renamed" }));
    await assertFails(ref.update({ status: "completed" }));
    await assertFails(ref.update({ shortsCount: 99 }));
  });
  test("can only list own videos", async () => {
    await alice().firestore().doc("videos/v1").set(newVideo("alice", "v1"));
    await assertSucceeds(alice().firestore().collection("videos").where("userId", "==", "alice").get());
    await assertFails(alice().firestore().collection("videos").get());
    await assertFails(bob().firestore().doc("videos/v1").get());
  });
  test("can cancel an upload but not delete a processed video", async () => {
    await alice().firestore().doc("videos/v1").set(newVideo("alice", "v1"));
    await assertSucceeds(alice().firestore().doc("videos/v1").delete());
    await seed("videos/v2", { ...newVideo("alice", "v2"), status: "completed", createdAt: new Date() });
    await assertFails(alice().firestore().doc("videos/v2").delete());
  });
});

describe("shorts", () => {
  const short = (overrides = {}) => ({
    userId: "alice",
    videoId: "v1",
    segmentIndex: 1,
    status: "ready",
    title: "Part 01",
    description: "",
    tags: [],
    privacy: "public",
    categoryId: "22",
    youtubeVideoId: null,
    ...overrides,
  });

  test("clients cannot create Shorts", async () => {
    await assertFails(alice().firestore().doc("shorts/s1").set(short()));
  });
  test("owner can edit metadata", async () => {
    await seed("shorts/s1", short());
    await assertSucceeds(alice().firestore().doc("shorts/s1").update({ title: "Nobody Expected This 😱", tags: ["shorts", "viral"] }));
  });
  test("owner cannot touch upload state", async () => {
    await seed("shorts/s1", short());
    const ref = alice().firestore().doc("shorts/s1");
    await assertFails(ref.update({ status: "published" }));
    await assertFails(ref.update({ youtubeVideoId: "abc123" }));
  });
  test("rejects titles longer than YouTube allows", async () => {
    await seed("shorts/s1", short());
    await assertFails(alice().firestore().doc("shorts/s1").update({ title: "x".repeat(101) }));
  });
  test("no edits once published", async () => {
    await seed("shorts/s1", short({ status: "published" }));
    await assertFails(alice().firestore().doc("shorts/s1").update({ title: "Too late" }));
  });
  test("other users cannot read", async () => {
    await seed("shorts/s1", short());
    await assertFails(bob().firestore().doc("shorts/s1").get());
  });
});

describe("backend-owned collections", () => {
  test("schedules and jobs are read-only for the owner", async () => {
    await seed("schedules/s1", { userId: "alice", status: "scheduled" });
    await seed("jobs/j1", { userId: "alice", status: "processing" });
    await assertSucceeds(alice().firestore().doc("schedules/s1").get());
    await assertFails(alice().firestore().doc("schedules/s1").update({ status: "published" }));
    await assertFails(alice().firestore().doc("schedules/s2").set({ userId: "alice", status: "scheduled" }));
    await assertSucceeds(alice().firestore().doc("jobs/j1").get());
    await assertFails(alice().firestore().doc("jobs/j1").update({ progress: 100 }));
    await assertFails(bob().firestore().doc("jobs/j1").get());
  });
  test("YouTube tokens are never readable", async () => {
    await seed("youtubeCredentials/c1", { userId: "alice", encryptedRefreshToken: "x" });
    await assertFails(alice().firestore().doc("youtubeCredentials/c1").get());
  });
  test("notifications can only be marked read", async () => {
    await seed("notifications/n1", { userId: "alice", title: "Done", read: false });
    const ref = alice().firestore().doc("notifications/n1");
    await assertSucceeds(ref.update({ read: true }));
    await assertFails(ref.update({ title: "Hacked" }));
    await assertFails(bob().firestore().doc("notifications/n1").get());
  });
});

describe("storage", () => {
  const bytes = new Uint8Array(16);
  const sourcePath = "users/alice/videos/original/v1/source.mp4";

  async function reserve(overrides = {}) {
    await seed("videos/v1", { ...newVideo("alice", "v1", overrides), createdAt: new Date() });
  }

  test("can upload into a reserved slot", async () => {
    await reserve();
    await assertSucceeds(alice().storage().ref(sourcePath).put(bytes, { contentType: "video/mp4" }));
  });
  test("rejects upload without a reservation", async () => {
    await assertFails(alice().storage().ref(sourcePath).put(bytes, { contentType: "video/mp4" }));
  });
  test("rejects size or type that differs from the reservation", async () => {
    await reserve();
    await assertFails(alice().storage().ref(sourcePath).put(new Uint8Array(17), { contentType: "video/mp4" }));
    await assertFails(alice().storage().ref(sourcePath).put(bytes, { contentType: "video/webm" }));
  });
  test("rejects non-video content", async () => {
    await reserve({ contentType: "text/html" });
    await assertFails(alice().storage().ref(sourcePath).put(bytes, { contentType: "text/html" }));
  });
  test("cannot upload into another user's folder", async () => {
    await reserve();
    await assertFails(bob().storage().ref(sourcePath).put(bytes, { contentType: "video/mp4" }));
  });
  test("clients cannot write Shorts or thumbnails", async () => {
    await assertFails(alice().storage().ref("users/alice/shorts/s1/video.mp4").put(bytes, { contentType: "video/mp4" }));
    await assertFails(alice().storage().ref("users/alice/videos/thumbnails/v1.jpg").put(bytes, { contentType: "image/jpeg" }));
  });
  test("owner can read their files, others cannot", async () => {
    await reserve();
    await alice().storage().ref(sourcePath).put(bytes, { contentType: "video/mp4" });
    await assertSucceeds(alice().storage().ref(sourcePath).getMetadata());
    await assertFails(bob().storage().ref(sourcePath).getMetadata());
  });
});
