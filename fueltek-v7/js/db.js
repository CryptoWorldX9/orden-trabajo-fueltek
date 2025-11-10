// js/db.js
export const DB_NAME = "fueltek_db_v7";
export const DB_VERSION = 1;
export const STORE = "orders";

export async function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: "ot" });
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

export async function putOrder(order){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).put(order);
    tx.oncomplete = ()=>{ db.close(); res(true); };
    tx.onerror = ()=>{ db.close(); rej(tx.error); };
  });
}

export async function getAllOrders(){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,"readonly");
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = ()=>{ db.close(); res(req.result || []); };
    req.onerror = ()=>{ db.close(); rej(req.error); };
  });
}

export async function getOrder(ot){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,"readonly");
    const req = tx.objectStore(STORE).get(String(ot));
    req.onsuccess = ()=>{ db.close(); res(req.result); };
    req.onerror = ()=>{ db.close(); rej(req.error); };
  });
}

export async function deleteOrder(ot){
  const db = await openDB();
  return new Promise((res,rej)=>{
    const tx = db.transaction(STORE,"readwrite");
    tx.objectStore(STORE).delete(String(ot));
    tx.oncomplete = ()=>{ db.close(); res(true); };
    tx.onerror = ()=>{ db.close(); rej(tx.error); };
  });
}

export async function deleteDatabase(){
  return new Promise((res,rej)=>{
    const del = indexedDB.deleteDatabase(DB_NAME);
    del.onsuccess = ()=> res(true);
    del.onerror = ()=> rej(del.error);
  });
}
