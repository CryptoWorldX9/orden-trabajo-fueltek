// js/backup.js
import { getAllOrders } from './db.js';

// export JSON backup
export async function exportBackupJSON(filename = "fueltek_backup.json"){
  const data = await getAllOrders();
  if(!data.length) { alert("No hay datos para respaldar."); return; }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(a.href);
  alert("Respaldo descargado.");
}

// import JSON (file object)
export async function importBackupJSON(file){
  return new Promise((resolve,reject)=>{
    const r = new FileReader();
    r.onload = async () => {
      try{
        const arr = JSON.parse(r.result);
        if(!Array.isArray(arr)) throw new Error("JSON inválido");
        // return array to caller who will write into DB
        resolve(arr);
      }catch(err){ reject(err); }
    };
    r.onerror = () => reject(r.error);
    r.readAsText(file);
  });
}

// Export to Excel using SheetJS CDN (expects global XLSX)
export async function exportToExcel(filename="Ordenes_Fueltek.xlsx"){
  const data = await getAllOrders();
  if(!data.length){ alert("No hay órdenes para exportar."); return; }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ordenes");
  XLSX.writeFile(wb, filename);
}
