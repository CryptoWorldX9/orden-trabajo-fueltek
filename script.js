const OT_KEY = "fueltek_last_ot";
const ORDERS_KEY = "fueltek_orders";

document.addEventListener("DOMContentLoaded", () => {
  const otInput = document.getElementById("otNumber");
  const newOtBtn = document.getElementById("newOtBtn");
  const saveBtn = document.getElementById("saveBtn");
  const exportBtn = document.getElementById("exportBtn");
  const clearBtn = document.getElementById("clearBtn");
  const form = document.getElementById("otForm");

  function getLastOt() {
    return parseInt(localStorage.getItem(OT_KEY) || "726", 10);
  }

  function setLastOt(n) {
    localStorage.setItem(OT_KEY, n);
  }

  function nextOt() {
    const next = getLastOt() + 1;
    setLastOt(next);
    return next;
  }

  function updateOtDisplay() {
    otInput.value = getLastOt() + 1;
  }

  updateOtDisplay();

  newOtBtn.onclick = () => {
    const newNum = nextOt();
    otInput.value = newNum;
    alert("Nuevo número OT asignado: " + newNum);
  };

  saveBtn.onclick = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {};
    for (const [k, v] of fd.entries()) {
      if (k === "accesorios") continue;
      data[k] = v;
    }
    const acc = Array.from(form.querySelectorAll("input[name='accesorios']:checked"))
      .map(c => c.value)
      .join(", ");
    data.accesorios = acc;
    data.ot = otInput.value;
    data.fechaGuardado = new Date().toLocaleString();

    const all = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    all.push(data);
    localStorage.setItem(ORDERS_KEY, JSON.stringify(all));

    alert("Orden guardada correctamente ✅");
  };

  exportBtn.onclick = (e) => {
    e.preventDefault();
    const all = JSON.parse(localStorage.getItem(ORDERS_KEY) || "[]");
    if (all.length === 0) return alert("No hay órdenes para exportar");
    const ws = XLSX.utils.json_to_sheet(all);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Ordenes");
    XLSX.writeFile(wb, "Ordenes_Fueltek.xlsx");
  };

  clearBtn.onclick = () => {
    if (confirm("¿Seguro que deseas borrar todas las órdenes guardadas?")) {
      localStorage.removeItem(ORDERS_KEY);
      localStorage.removeItem(OT_KEY);
      updateOtDisplay();
      alert("Datos eliminados. Reiniciado a OT #727.");
    }
  };
});
