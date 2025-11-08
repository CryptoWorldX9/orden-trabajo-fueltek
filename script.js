const OT_KEY = "fueltek_last_ot";
const ORDERS_KEY = "fueltek_orders";

document.addEventListener("DOMContentLoaded", () => {
  const otInput = document.getElementById("otNumber");
  const form = document.getElementById("otForm");

  function getLastOt() {
    return parseInt(localStorage.getItem(OT_KEY) || "726", 10);
  }

  function setLastOt(n) {
    localStorage.setItem(OT_KEY, n);
  }

  function nextOt() {
    const n = getLastOt() + 1;
    setLastOt(n);
    return n;
  }

  function updateOtDisplay() {
    otInput.value = getLastOt() + 1;
  }

  updateOtDisplay();

  document.getElementById("newOtBtn").onclick = () => {
    const n = nextOt();
    otInput.value = n;
    alert("Nuevo número OT asignado: " + n);
  };

  document.getElementById("saveBtn").onclick = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const obj = {};
    for (const [k, v] of fd.entries()) {
      if (k === "accesorios") continue;
      obj[k] = v;
    }
    const acc = Array.from(form.querySelectorAll("input[name='accesorios']:checked"))
      .map(c => c.value).join(", ");
    obj.accesorios = acc;
    obj.ot = otInput.value;
    obj.fechaGuardado = new Date().toLocaleString();

    const all = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    all.push(obj);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));
    alert("Orden guardada correctamente ✅");
  };

  document.getElementById("exportBtn").onclick = (e) => {
    e.preventDefault();
    const all = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    if (all.length === 0) return alert("No hay órdenes para exportar.");
    const ws = XLSX.utils.json_to_sheet(all);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ordenes");
    XLSX.writeFile(wb, "Ordenes_Fueltek.xlsx");
  };

  document.getElementById("printBtn").onclick = () => {
    window.print();
  };

  document.getElementById("clearBtn").onclick = () => {
    if (confirm("¿Seguro que deseas borrar todos los registros guardados?")) {
      localStorage.removeItem(ORDERS_KEY);
      localStorage.removeItem(OT_KEY);
      updateOtDisplay();
      alert("Datos eliminados y contador reiniciado a 727.");
    }
  };
});
