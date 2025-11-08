// script.js
// Manejo simple de OT auto-incremental, guardado en localStorage y exportación a Excel usando SheetJS

const OT_KEY = "fueltek_last_ot";
const ORDERS_KEY = "fueltek_orders";

document.addEventListener("DOMContentLoaded", () => {
  const otInput = document.getElementById("otNumber");
  const newOtBtn = document.getElementById("newOtBtn");
  const saveBtn = document.getElementById("saveBtn");
  const exportBtn = document.getElementById("exportBtn");
  const clearBtn = document.getElementById("clearBtn");
  const form = document.getElementById("otForm");

  function getLastOt(){
    const raw = localStorage.getItem(OT_KEY);
    return raw ? parseInt(raw, 10) : 726; // posicionamos en 726 para que al crear la primera quede 727
  }
  function setLastOt(n){
    localStorage.setItem(OT_KEY, String(n));
  }
  function nextOt(){
    let last = getLastOt();
    last = last + 1;
    setLastOt(last);
    return last;
  }

  function setOtField(n){
    otInput.value = String(n);
  }

  // Inicializa mostrando el siguiente OT disponible si no hay uno en el campo
  if(!otInput.value) setOtField(getLastOt() + 1);

  newOtBtn.addEventListener("click", () => {
    const n = nextOt();
    setOtField(n);
    alert("Nuevo N° OT asignado: " + n);
  });

  function readForm(){
    const fd = new FormData(form);
    const obj = {};
    for (const [k,v] of fd.entries()){
      if(k === "accesorios") continue;
      obj[k] = v;
    }
    // accesorios: todas las checkboxes marcadas
    const accesorios = [];
    form.querySelectorAll("input[name='accesorios']:checked").forEach(ch => accesorios.push(ch.value));
    obj.accesorios = accesorios.join(", ");
    obj.ot = otInput.value || (getLastOt()+1);
    obj.timestamp = new Date().toISOString();
    return obj;
  }

  function saveOrder(){
    const order = readForm();
    // Si el OT del formulario es mayor que el stored last, actualizamos
    const currentLast = getLastOt();
    const otNum = parseInt(order.ot,10);
    if(otNum > currentLast) setLastOt(otNum);

    const all = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    all.push(order);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
    alert("Orden guardada localmente.");
  }

  function exportToExcel(){
    const all = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    if(all.length === 0){
      alert("No hay órdenes guardadas para exportar.");
      return;
    }
    // Convertir a worksheet
    const ws = XLSX.utils.json_to_sheet(all);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ordenes");
    // Generar archivo y forzar descarga
    XLSX.writeFile(wb, "Ordenes_Fueltek.xlsx");
  }

  function clearData(){
    if(confirm("¿Estás seguro de borrar todas las órdenes guardadas? Esta acción no se puede deshacer.")){
      localStorage.removeItem(ORDERS_KEY);
      localStorage.removeItem(OT_KEY);
      // reiniciar last ot para que el próximo sea 727
      setLastOt(726);
      setOtField(727);
      alert("Datos borrados. El próximo N° OT será 727.");
    }
  }

  saveBtn.addEventListener("click", (e) => {
    e.preventDefault();
    saveOrder();
  });

  exportBtn.addEventListener("click", (e) => {
    e.preventDefault();
    exportToExcel();
  });

  clearBtn.addEventListener("click", (e) => {
    e.preventDefault();
    clearData();
  });
});
