/**
 * firebase - the ONLY door to the Firebase SDK (docs/ONLINE_SPEC.md sections 1, 7 and 12).
 *
 * Offline-first: the game boots from localStorage and plays exactly as before when Firebase is
 * not configured. So nothing here imports firebase at module scope - the SDK (a few hundred KB)
 * is pulled in by dynamic import() the first time loadFirebase() runs, and loadFirebase() refuses
 * to run unless the build is configured. An offline build therefore never fetches a firebase
 * chunk, and the existing tools (smoke.mjs flags any failed request) never see one.
 *
 * Configured means VITE_FIREBASE_API_KEY is set, or VITE_FIREBASE_EMULATORS === 'true'
 * (`vite --mode emulator` reads the committed .env.emulator: a demo-* project on the local
 * Emulator Suite, no real project and no secrets).
 */

// Vite replaces import.meta.env at build time; under plain Node it is undefined (offline).
const env = import.meta.env || {};

const str = (v) => (typeof v === 'string' ? v.trim() : '');
const port = (v, fallback) => {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n > 0 && n < 65536 ? n : fallback;
};

/** Everything the online layer reads from the VITE_* variables (spec section 12). */
export function onlineConfig() {
  const emulators = str(env.VITE_FIREBASE_EMULATORS) === 'true';
  const projectId = str(env.VITE_FIREBASE_PROJECT_ID) || (emulators ? 'demo-city-siege' : '');
  return {
    apiKey: str(env.VITE_FIREBASE_API_KEY),
    authDomain: str(env.VITE_FIREBASE_AUTH_DOMAIN),
    projectId,
    appId: str(env.VITE_FIREBASE_APP_ID),
    storageBucket: str(env.VITE_FIREBASE_STORAGE_BUCKET),
    messagingSenderId: str(env.VITE_FIREBASE_MESSAGING_SENDER_ID),
    emulators,
    emulatorHost: str(env.VITE_FIREBASE_EMULATOR_HOST) || '127.0.0.1',
    authEmulatorPort: port(env.VITE_FIREBASE_AUTH_EMULATOR_PORT, 9099),
    firestoreEmulatorPort: port(env.VITE_FIREBASE_FIRESTORE_EMULATOR_PORT, 8085),
    // Shown in the ACCOUNT screen's HTTP config snippet (the hosted MCP server).
    mcpServerUrl: str(env.VITE_MCP_SERVER_URL) || 'http://localhost:8787/mcp'
  };
}

/** True when this build should talk to Firebase at all. */
export function isOnlineConfigured() {
  return !!str(env.VITE_FIREBASE_API_KEY) || str(env.VITE_FIREBASE_EMULATORS) === 'true';
}

let loading = null;

/**
 * Load and initialise the SDK once: resolves to
 * `{ app, auth, db, config, appSdk, authSdk, fsSdk }` where the *Sdk fields are the modular
 * firebase/app, firebase/auth and firebase/firestore namespaces (the services import their
 * functions from here, so they never import firebase themselves).
 */
export function loadFirebase() {
  if (!isOnlineConfigured()) {
    return Promise.reject(new Error('Online play is not configured (set VITE_FIREBASE_* - see docs/ONLINE.md).'));
  }
  if (!loading) {
    loading = init().catch((e) => {
      loading = null;   // a failed chunk fetch (flaky network) may be retried
      throw e;
    });
  }
  return loading;
}

async function init() {
  const [appSdk, authSdk, fsSdk] = await Promise.all([
    import('firebase/app'),
    import('firebase/auth'),
    import('firebase/firestore')
  ]);
  const config = onlineConfig();
  const options = {
    // The emulators accept any key; a real project needs its own (the web config is not a
    // secret - firestore.rules is what protects the data).
    apiKey: config.apiKey || 'demo-api-key',
    authDomain: config.authDomain || `${config.projectId}.firebaseapp.com`,
    projectId: config.projectId,
    appId: config.appId || 'demo-app'
  };
  if (config.storageBucket) options.storageBucket = config.storageBucket;
  if (config.messagingSenderId) options.messagingSenderId = config.messagingSenderId;

  const app = appSdk.getApps().length ? appSdk.getApp() : appSdk.initializeApp(options);
  const auth = authSdk.getAuth(app);
  // ignoreUndefinedProperties: a save blob may carry `undefined` (serializeCity's `gate` on a
  // normal building); Firestore would otherwise reject the whole write.
  const db = fsSdk.initializeFirestore(app, { ignoreUndefinedProperties: true });

  if (config.emulators) {
    const host = config.emulatorHost;
    // disableWarnings: the SDK otherwise pins a banner over the bottom of the game canvas.
    authSdk.connectAuthEmulator(auth, `http://${host}:${config.authEmulatorPort}`, { disableWarnings: true });
    fsSdk.connectFirestoreEmulator(db, host, config.firestoreEmulatorPort);
    console.info(`[online] Firebase Emulator Suite: project ${config.projectId}, auth ${host}:${config.authEmulatorPort}, ` +
      `firestore ${host}:${config.firestoreEmulatorPort}`);
  }
  return { app, auth, db, config, appSdk, authSdk, fsSdk };
}
