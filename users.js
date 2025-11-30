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
  return sessionStorage.getItem('secure_user');
}

export function clearSession() {
  sessionStorage.removeItem('secure_user');
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
