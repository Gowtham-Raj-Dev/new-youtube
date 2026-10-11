// Imported first by index.ts so these options apply before any function is defined.
import { setGlobalOptions } from "firebase-functions/options";
import { initializeApp } from "firebase-admin/app";
import { REGION } from "./config";

setGlobalOptions({ region: REGION, maxInstances: 10 });
initializeApp();
