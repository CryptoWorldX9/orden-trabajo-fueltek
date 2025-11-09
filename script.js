const OT_KEY = "fueltek_last_ot";
const ORDERS_KEY = "fueltek_orders";

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("otForm");
  const otInput = document.getElementById("otNumber");
  const abonadoGroup = document.getElementById("abonadoGroup");
  const estadoPago = document.getElementById("estadoPago");
  const importFile = document.getElementById("importFile");

  // ========== Funciones OT ==========
  const getLastOt = () => parseInt(localStorage.getItem(OT_KEY) || "726", 10);
  const setLastOt = n => localStorage.setItem(OT_KEY, n);
  const nextOt = () => { const n = getLastOt() + 1; setLastOt(n); return n; };
  const updateOtDisplay = () => (otInput.value = getLastOt() + 1);

  updateOtDisplay();

  // Mostrar/ocultar campo abonado
  estadoPago.addEventListener("change", () => {
    abonadoGroup.style.display = estadoPago.value === "Abonado" ? "block" : "none";
  });

  // NUEVO OT
  document.getElementById("newOtBtn").onclick = () => {
    const n = nextOt();
    otInput.value = n;
    alert("Nuevo número OT: " + n);
  };

  // GUARDAR
  document.getElementById("saveBtn").onclick = e => {
    e.preventDefault();
    const fd = new FormData(form);
    const obj = {};
    for (const [k, v] of fd.entries()) {
      if (k === "accesorios") continue;
      obj[k] = v;
    }
    const accesorios = Array.from(form.querySelectorAll("input[name='accesorios']:checked"))
      .map(c => c.value).join(", ");
    obj.accesorios = accesorios;
    obj.ot = otInput.value;
    obj.fechaGuardado = new Date().toLocaleString();

    const all = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    all.push(obj);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));

    alert("Orden guardada ✅");
    form.reset();
    abonadoGroup.style.display = "none";
    otInput.value = nextOt(); // siguiente OT
  };

  // EXPORTAR EXCEL
  document.getElementById("exportBtn").onclick = e => {
    e.preventDefault();
    const all = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    if (!all.length) return alert("No hay datos guardados.");
    const ws = XLSX.utils.json_to_sheet(all);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ordenes");
    XLSX.writeFile(wb, "Ordenes_Fueltek.xlsx");
  };

  // IMPRIMIR / PDF
  document.getElementById("printBtn").onclick = () => window.print();

  // RESPALDO
  document.getElementById("backupBtn").onclick = () => {
    const data = localStorage.getItem(ORDERS_KEY) || "[]";
    const blob = new Blob([data], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "backup_fueltek.json";
    link.click();
  };

  // IMPORTAR
  document.getElementById("importBtn").onclick = () => importFile.click();
  importFile.onchange = e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = evt => {
      try {
        const data = JSON.parse(evt.target.result);
        if (Array.isArray(data)) {
          localStorage.setItem(ORDERS_KEY, JSON.stringify(data));
          alert("Base de datos importada correctamente ✅");
        }
      } catch {
        alert("Archivo no válido.");
      }
    };
    reader.readAsText(file);
  };

  // BORRAR TODO
  document.getElementById("clearBtn").onclick = () => {
    if (confirm("¿Eliminar todas las órdenes guardadas?")) {
      localStorage.removeItem(ORDERS_KEY);
      localStorage.removeItem(OT_KEY);
      updateOtDisplay();
      alert("Base de datos vaciada
