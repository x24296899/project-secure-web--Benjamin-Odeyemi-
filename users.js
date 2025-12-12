// Simple IndexedDB user helpers.
// Provides: openDb, add/get/update/delete users, password hashing,
// session helpers, and failed-login tracking.
const DB_NAME = 'secure_web_db';
const STORE_NAME = 'users';
const DB_VERSION = 1;

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'email' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStore(mode = 'readonly') {
  const db = await openDb();
  const tx = db.transaction(STORE_NAME, mode);
  return { store: tx.objectStore(STORE_NAME), tx, db };
}

async function hashPassword(password) {
  const enc = new TextEncoder();
  const data = enc.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return btoa(String.fromCharCode(...hashArray));
}


export async function addUser(email, password, role = 'user') {
  // Add a new user to the local database.
  const existing = await getUser(email);
  if (existing) throw new Error('User already exists');

  // Hash the password then store the user record.
  const passwordHash = await hashPassword(password);
  const { store, tx } = await getStore('readwrite');
  store.add({ email, passwordHash, role, createdAt: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getUser(email) {
  // Return the user object for the given email.
  const { store, tx } = await getStore('readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(email);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllUsers() {
  const { store, tx } = await getStore('readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function updateUser(email, patch) {
  // Update fields on an existing user. If patch contains `password`
  // it is hashed before saving.
  const current = await getUser(email);
  if (!current) throw new Error('User not found');

  const updated = { ...current, ...patch };
  if (patch.password) {
    updated.passwordHash = await hashPassword(patch.password);
    delete updated.password;
  }

  const { store, tx } = await getStore('readwrite');
  store.put(updated);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteUser(email) {
  const { store, tx } = await getStore('readwrite');
  store.delete(email);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function verifyCredentials(email, password) {
  // Verify email + password by comparing hashes.
  const user = await getUser(email);
  if (!user) return false;
  const passwordHash = await hashPassword(password);
  return user.passwordHash === passwordHash;
}

// Session helpers
export function setSession(email) {
  // Store a session marker for this tab.
  sessionStorage.setItem('secure_user', email);
}

export function getSession() {
  // Return the current session user (tab-local), or cookie if present.
  const s = sessionStorage.getItem('secure_user');
  if (s) return s;
  // read cookie
  const m = document.cookie.match(/(?:^|; )secure_user=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function clearSession() {
  // Clear session marker and cookie.
  sessionStorage.removeItem('secure_user');
  document.cookie = 'secure_user=; Max-Age=0; path=/; SameSite=Lax';
}

// Cookie helpers.
export function setSessionCookie(email, maxAgeSeconds = 3600) {
  // Set a cookie so other tabs can detect the session
  const encoded = encodeURIComponent(email);
  const secureFlag = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `secure_user=${encoded}; Max-Age=${maxAgeSeconds}; path=/; SameSite=Strict${secureFlag}`;
}

export function getSessionCookie() {
  const m = document.cookie.match(/(?:^|; )secure_user=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// Failed login tracking
const LOCK_THRESHOLD = 3; // attempts
const LOCK_SECONDS = 60; // lock duration in seconds

function _failedKey(email) {
  return `failed:${email}`;
}

export function getLockInfo(email) {
  const raw = localStorage.getItem(_failedKey(email));
  if (!raw) return { count: 0, lockedUntil: 0 };
  try {
    return JSON.parse(raw);
  } catch (e) {
    return { count: 0, lockedUntil: 0 };
  }
}

export function recordFailedAttempt(email) {
  const key = _failedKey(email);
  const now = Date.now();
  const info = getLockInfo(email);
  // if currently locked, keep lock
  if (info.lockedUntil && info.lockedUntil > now) {
    return info;
  }
  let count = (info.count || 0) + 1;
  let lockedUntil = 0;
  if (count >= LOCK_THRESHOLD) {
    lockedUntil = now + LOCK_SECONDS * 1000;
    count = 0; // reset count after lock
  }
  const nxt = { count, lockedUntil };
  localStorage.setItem(key, JSON.stringify(nxt));
  return nxt;
}

export function resetFailedAttempts(email) {
  localStorage.removeItem(_failedKey(email));
}

// Ensure a default admin user exists 
export async function ensureSeeded() {
  const adminEmail = 'admin@example.com';
  try {
    const existing = await getUser(adminEmail);
    if (!existing) {
      // default admin password
      await addUser(adminEmail, 'AdminPass123', 'admin');
      console.log('Seeded admin user:', adminEmail);
    }
  } catch (err) {
    console.error('Failed to seed admin user:', err);
  }
}
