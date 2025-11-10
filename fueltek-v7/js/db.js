const DB_NAME = "fueltek_db_v6";
const DB_VERSION = 1;
const STORE = "orders";

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "ot" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbPut(order) {
  return openDB().then(db => new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(order);
    tx.oncomplete = () => { db.close(); res(true); };
    tx.onerror = () => { db.close(); rej(tx.error); };
  }));
}

function dbGetAll() {
  return openDB().then(db => new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => { db.close(); res(req.result || []); };
    req.onerror = () => { db.close(); rej(req.error); };
  }));
}

function dbGet(id) {
  return openDB().then(db => new Promise((res, rej) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(id);
    req.onsuccess = () => { db.close(); res(req.result); };
    req.onerror = () => { db.close(); rej(req.error); };
  }));
}
