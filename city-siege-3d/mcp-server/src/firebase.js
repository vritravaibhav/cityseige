import { readFileSync } from 'node:fs';
import { initializeApp, cert, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

/**
 * Firebase Admin for the MCP server. Credentials, in order:
 *   FIREBASE_SERVICE_ACCOUNT_JSON  the service-account key itself (JSON text) - handy for hosting
 *   GOOGLE_APPLICATION_CREDENTIALS path to a service-account key file (standard Google variable)
 *   FIRESTORE_EMULATOR_HOST        dev: the emulator needs no credentials at all
 * FIREBASE_PROJECT_ID picks the project; it defaults to the key's project_id, else
 * 'demo-city-siege' (the emulator project in .firebaserc).
 *
 * The Admin SDK bypasses firestore.rules, which is why every edit goes through cityRules first
 * (spec section 1: the MCP server is the only non-client writer).
 */
export function initFirestore(env = process.env) {
  let credential = null;
  let keyProject = null;
  let mode;
  if (env.FIREBASE_SERVICE_ACCOUNT_JSON) {
    let key;
    try {
      key = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT_JSON);
    } catch (e) {
      throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON is not valid JSON (paste the whole service-account key file): ' + e.message);
    }
    credential = cert(key);
    keyProject = key.project_id || null;
    mode = 'service account (FIREBASE_SERVICE_ACCOUNT_JSON)';
  } else if (env.GOOGLE_APPLICATION_CREDENTIALS) {
    credential = applicationDefault();
    try {
      keyProject = JSON.parse(readFileSync(env.GOOGLE_APPLICATION_CREDENTIALS, 'utf8')).project_id || null;
    } catch {
      // Not a key file we can read (e.g. workload identity config): the project must come from the env.
    }
    mode = 'service account (GOOGLE_APPLICATION_CREDENTIALS)';
  }
  const projectId = env.FIREBASE_PROJECT_ID || keyProject || 'demo-city-siege';
  if (env.FIRESTORE_EMULATOR_HOST) mode = `emulator ${env.FIRESTORE_EMULATOR_HOST}`;
  if (!mode) {
    if (projectId.startsWith('demo-')) {
      throw new Error(`Project "${projectId}" is an emulator-only demo project, but FIRESTORE_EMULATOR_HOST is not set. ` +
        'Start the emulators (npm run emulators) and set FIRESTORE_EMULATOR_HOST=127.0.0.1:8085, or configure a real project ' +
        '(FIREBASE_PROJECT_ID + GOOGLE_APPLICATION_CREDENTIALS or FIREBASE_SERVICE_ACCOUNT_JSON).');
    }
    // No key given: Google's default credentials (e.g. Cloud Run's service identity).
    credential = applicationDefault();
    mode = 'application default credentials';
  }
  const app = initializeApp({ projectId, ...(credential ? { credential } : {}) }, 'city-siege-mcp');
  const db = getFirestore(app);
  // cityRules never produces undefined, but a hand-edited document might carry holes.
  db.settings({ ignoreUndefinedProperties: true });
  return { app, db, projectId, mode };
}
