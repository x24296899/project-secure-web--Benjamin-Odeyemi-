// reservations.js
// Client-side IndexedDB storage for tables and reservations (demo-only)
// Exports: openDb, seedTables, getTables, getAvailableTables, addReservation,
// getReservationsForUser, getAllReservations, updateReservation, deleteReservation

const RDB_NAME = 'restaurant_db';
const RDB_VERSION = 1;
const TABLES_STORE = 'tables';
const RES_STORE = 'reservations';

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(RDB_NAME, RDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(TABLES_STORE)) {
        db.createObjectStore(TABLES_STORE, { keyPath: 'id', autoIncrement: true });
      }
      if (!db.objectStoreNames.contains(RES_STORE)) {
        const s = db.createObjectStore(RES_STORE, { keyPath: 'id', autoIncrement: true });
        s.createIndex('tableId', 'tableId', { unique: false });
        s.createIndex('userEmail', 'userEmail', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function getStore(storeName, mode = 'readonly') {
  const db = await openDb();
  const tx = db.transaction(storeName, mode);
  return { store: tx.objectStore(storeName), tx };
}

// Seed some default tables if none exist
export async function seedTables() {
  const tables = await getTables();
  if (tables.length > 0) return;
  const defaults = [
    { name: 'T1', capacity: 2 },
    { name: 'T2', capacity: 2 },
    { name: 'T3', capacity: 4 },
    { name: 'T4', capacity: 4 },
    { name: 'T5', capacity: 6 },
  ];
  const { store, tx } = await getStore(TABLES_STORE, 'readwrite');
  for (const t of defaults) store.add(t);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getTables() {
  const { store, tx } = await getStore(TABLES_STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getTableById(id) {
  const { store } = await getStore(TABLES_STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.get(Number(id));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function overlaps(aStart, aEnd, bStart, bEnd) {
  return aStart < bEnd && bStart < aEnd;
}

// Find available tables for a requested datetime and duration and partySize
export async function getAvailableTables(datetimeISO, durationMinutes, partySize) {
  const wantStart = new Date(datetimeISO).getTime();
  const wantEnd = wantStart + durationMinutes * 60 * 1000;
  const tables = await getTables();
  const candidate = tables.filter(t => t.capacity >= partySize);

  // For each candidate table, check reservations index
  const { store } = await getStore(RES_STORE, 'readonly');
  const avail = [];

  for (const table of candidate) {
    // get all reservations for this table
    const index = store.index('tableId');
    const range = IDBKeyRange.only(Number(table.id));
    const existing = await new Promise((resolve, reject) => {
      const req = index.getAll(range);
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const conflict = existing.some(r => {
      const rStart = new Date(r.datetimeISO).getTime();
      const rEnd = rStart + (r.durationMinutes || 60) * 60 * 1000;
      return overlaps(wantStart, wantEnd, rStart, rEnd);
    });

    if (!conflict) avail.push(table);
  }
  return avail;
}

export async function addReservation(tableId, userEmail, datetimeISO, durationMinutes = 60, partySize = 1) {
  // availability check
  const avail = await getAvailableTables(datetimeISO, durationMinutes, partySize);
  if (!avail.find(t => Number(t.id) === Number(tableId))) {
    throw new Error('Table not available for the requested time');
  }
  const { store, tx } = await getStore(RES_STORE, 'readwrite');
  store.add({ tableId: Number(tableId), userEmail, datetimeISO, durationMinutes, partySize, createdAt: Date.now() });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function getReservationsForUser(email) {
  const { store } = await getStore(RES_STORE, 'readonly');
  const index = store.index('userEmail');
  return new Promise((resolve, reject) => {
    const req = index.getAll(IDBKeyRange.only(email));
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function getAllReservations() {
  const { store } = await getStore(RES_STORE, 'readonly');
  return new Promise((resolve, reject) => {
    const req = store.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

export async function updateReservation(id, patch) {
  const { store, tx } = await getStore(RES_STORE, 'readwrite');
  const existing = await new Promise((resolve, reject) => {
    const req = store.get(Number(id));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (!existing) throw new Error('Reservation not found');
  const updated = { ...existing, ...patch };
  store.put(updated);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteReservation(id) {
  const { store, tx } = await getStore(RES_STORE, 'readwrite');
  store.delete(Number(id));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

// Table CRUD helpers for admin UI
export async function addTable(name, capacity) {
  const { store, tx } = await getStore(TABLES_STORE, 'readwrite');
  store.add({ name, capacity: Number(capacity) });
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function updateTable(id, patch) {
  const { store, tx } = await getStore(TABLES_STORE, 'readwrite');
  const existing = await new Promise((resolve, reject) => {
    const req = store.get(Number(id));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  if (!existing) throw new Error('Table not found');
  const updated = { ...existing, ...patch };
  store.put(updated);
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}

export async function deleteTable(id) {
  // prevent deleting a table that has future reservations
  const all = await getAllReservations();
  const now = Date.now();
  const hasFuture = all.some(r => Number(r.tableId) === Number(id) && new Date(r.datetimeISO).getTime() > now);
  if (hasFuture) throw new Error('Cannot delete table with future reservations');
  const { store, tx } = await getStore(TABLES_STORE, 'readwrite');
  store.delete(Number(id));
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve(true);
    tx.onerror = () => reject(tx.error);
  });
}
