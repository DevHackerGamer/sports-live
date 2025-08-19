// Firebase Admin initialization for server-side writes to Realtime Database
// Env options:
// - FIREBASE_SERVICE_ACCOUNT: JSON string of service account
//   OR discrete vars:
//   - FIREBASE_PROJECT_ID
//   - FIREBASE_CLIENT_EMAIL
//   - FIREBASE_PRIVATE_KEY (with \n escaped; will be fixed here)

let admin;
let fs;
let db;

try {
  // Lazy require to avoid bundlers touching this in client builds
  // eslint-disable-next-line global-require
  admin = require('firebase-admin');
  // eslint-disable-next-line global-require
  fs = require('fs');
} catch (_) {
  // admin not installed; will throw later when used
}

function initAdmin() {
  if (!admin) throw new Error('firebase-admin module not found');
  if (admin.apps?.length) {
    return { admin, db: admin.database() };
  }

  const svcB64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  const svc = process.env.FIREBASE_SERVICE_ACCOUNT;
  const svcFile = process.env.FIREBASE_SERVICE_ACCOUNT_FILE || process.env.GOOGLE_APPLICATION_CREDENTIALS;
  let credential;
  if (svcB64) {
    try {
      const json = JSON.parse(Buffer.from(svcB64, 'base64').toString('utf8'));
      credential = admin.credential.cert(json);
    } catch (e) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_BASE64');
    }
  } else if (svc) {
    try {
      const json = JSON.parse(svc);
      credential = admin.credential.cert(json);
    } catch (e) {
      throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT JSON');
    }
  } else if (svcFile) {
    try {
      const raw = fs.readFileSync(svcFile, 'utf8');
      const json = JSON.parse(raw);
      credential = admin.credential.cert(json);
    } catch (e) {
      // As a fallback, try ADC if GOOGLE_APPLICATION_CREDENTIALS is set and readable fails
      if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
        try {
          credential = admin.credential.applicationDefault();
        } catch (e2) {
          throw new Error('Failed to load credentials from file or ADC');
        }
      } else {
        throw new Error('Invalid FIREBASE_SERVICE_ACCOUNT_FILE');
      }
    }
  } else {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    // Allow providing the key as base64 to avoid newline escaping issues
    let privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const privateKeyB64 = process.env.FIREBASE_PRIVATE_KEY_BASE64;
    if (!privateKey && privateKeyB64) {
      try {
        privateKey = Buffer.from(privateKeyB64, 'base64').toString('utf8');
      } catch (e) {
        throw new Error('Invalid FIREBASE_PRIVATE_KEY_BASE64');
      }
    }
    if (privateKey && privateKey.includes('\\n')) {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    if (!projectId || !clientEmail || !privateKey) {
      throw new Error('Missing Firebase Admin credentials in env');
    }
    credential = admin.credential.cert({ projectId, clientEmail, privateKey });
  }

  const databaseURL = process.env.FIREBASE_DATABASE_URL;
  if (!databaseURL) {
    throw new Error('FIREBASE_DATABASE_URL is required');
  }

  admin.initializeApp({
    credential,
    databaseURL,
  });
  db = admin.database();
  return { admin, db };
}

module.exports = {
  getAdmin: () => {
    if (!db) return initAdmin();
    return { admin, db };
  },
};
