// Simple IndexedDB wrapper for user CRUD, with SHA-256 password hashing (browser-side) for demo only
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
  // Check for existing user first using a separate readonly transaction.
  const existing = await getUser(email);
  if (existing) throw new Error('User already exists');

  // Now open a readwrite transaction to add the user. Keep async work
  // (like hashing) before adding so the transaction stays active only
  // while performing the add() call.
  const passwordHash = await hashPassword(password);
  const { store, tx } = await getStore('readwrite');
  store.add({ email, passwordHash, role, createdAt: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getUser(email) {
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
  // Read the existing user first to avoid letting a readwrite
  // transaction auto-commit while awaiting other async operations.
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
  const user = await getUser(email);
  if (!user) return false;
  const passwordHash = await hashPassword(password);
  return user.passwordHash === passwordHash;
}

// Session helpers (demo only)
export function setSession(email) {
  sessionStorage.setItem('secure_user', email);
}

export function getSession() {
  // Prefer sessionStorage (current tab). If absent, fall back to cookie session.
  const s = sessionStorage.getItem('secure_user');
  if (s) return s;
  // read cookie
  const m = document.cookie.match(/(?:^|; )secure_user=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function clearSession() {
  sessionStorage.removeItem('secure_user');
  // clear cookie as well
  document.cookie = 'secure_user=; Max-Age=0; path=/; SameSite=Lax';
}

// Cookie helpers (client-side only). Note: HttpOnly cookies require a server.
export function setSessionCookie(email, maxAgeSeconds = 3600) {
  const encoded = encodeURIComponent(email);
  // add Secure flag only if page is served over https
  const secureFlag = location.protocol === 'https:' ? '; Secure' : '';
  // Use SameSite=Strict to reduce CSRF exposure (demo-level improvement)
  document.cookie = `secure_user=${encoded}; Max-Age=${maxAgeSeconds}; path=/; SameSite=Strict${secureFlag}`;
}

export function getSessionCookie() {
  const m = document.cookie.match(/(?:^|; )secure_user=([^;]+)/);
  return m ? decodeURIComponent(m[1]) : null;
}

// Failed login tracking (client-side only, demo)
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

// Ensure a default admin user exists (for demo). Call this on app start.
export async function ensureSeeded() {
  const adminEmail = 'admin@example.com';
  try {
    const existing = await getUser(adminEmail);
    if (!existing) {
      // default admin password (demo only)
      await addUser(adminEmail, 'AdminPass123', 'admin');
      console.log('Seeded admin user:', adminEmail);
    }
  } catch (err) {
    console.error('Failed to seed admin user:', err);
  }
}
