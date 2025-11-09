/* script.js - Fueltek v3.0
 Features:
 - OT correlativo empezando en 727
 - Guardado en IndexedDB (orders store, key = ot)
 - Export a Excel (SheetJS) from DB
 - Export/Import DB JSON
 - Print / PDF: construye vista limpia en #printArea, ajustada a carta
 - Form reset after save; show next OT
 - Pago: valor, estado (Pagado/Pendiente/Abonado) y campo monto abonado condicional
*/

const DB_NAME = "fueltek-db";
const DB_VERSION = 1;
const STORE_NAME = "orders";
const OT_KEY = "fueltek_last_ot_localstorage"; // mantiene el último número por compatibilidad (also stored in DB keys)

function openDb() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = ev => {
      const db = ev.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        // keyPath = ot para que cada OT sea única
        db.createObjectStore(STORE_NAME, { keyPath: "ot" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

function dbAddOrder(order) {
  return openDb().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      const putReq = store.put(order); // put si existe actualiza, si no inserta
      putReq.onsuccess = () => { resolve(true); db.close(); };
      putReq.onerror = () => { reject(putReq.error); db.close(); };
    });
  });
}

function dbGetAll() {
  return openDb().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();
      req.onsuccess = () => { resolve(req.result || []); db.close(); };
      req.onerror = () => { reject(req.error); db.close(); };
    });
  });
}

function dbBulkImport(arrayOfOrders) {
  return openDb().then(db => {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readwrite");
      const store = tx.objectStore(STORE_NAME);
      let count = 0;
      for (const ord of arrayOfOrders) {
        // ensure OT exists
        if(!ord.ot) continue;
        store.put(ord);
        count++;
      }
      tx.oncomplete = () => { resolve(count); db.close(); };
      tx.onerror = () => { reject(tx.error); db.close(); };
    });
  });
}

/* last OT management */
function getLastOtLocal() {
  const raw = localStorage.getItem(OT_KEY);
  return raw ? parseInt(raw, 10) : 726;
}
function setLastOtLocal(n) { localStorage.setItem(OT_KEY, String(n)); }

/* UI wiring */
document.addEventListener("DOMContentLoaded", () => {
  const otInput = document.getElementById("otNumber");
  const form = document.getElementById("otForm");
  const estadoPago = document.getElementById("estadoPago");
  const labelAbono = document.getElementById("labelAbono");
  const importFile = document.getElementById("importFile");

  // Mostrar siguiente OT disponible en pantalla
  function updateOtDisplay() {
    otInput.value = getLastOtLocal() + 1;
  }
  updateOtDisplay();

  // Mostrar/ocultar campo abono
  estadoPago.addEventListener("change", () => {
    if (estadoPago.value === "Abonado") {
      labelAbono.classList.remove("hidden");
    } else {
      labelAbono.classList.add("hidden");
      document.getElementById("montoAbonado").value = "";
    }
  });

  // Nuevo OT (manual)
  document.getElementById("newOtBtn").onclick = () => {
    const newOt = getLastOtLocal() + 1;
    // actualizar last ot local (lo reservamos)
    setLastOtLocal(newOt);
    otInput.value = newOt + 1; // mostrar siguiente disponible (muestra el correlativo después de asignacion)
    alert("Se reservó el OT " + newOt + ". En pantalla verás el siguiente disponible.");
  };

  // Guardar orden: leer formulario, armar objeto, guardar en DB, limpiar form y actualizar OT
  document.getElementById("saveBtn").onclick = async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const order = {};
    // recoger campos simples
    for (const [k, v] of fd.entries()) {
      if (k === "accesorios") continue;
      order[k] = v;
    }
    // accesorios (array)
    const accessories = Array.from(form.querySelectorAll("input[name='accesorios']:checked")).map(i => i.value);
    order.accesorios = accessories.join(", ");
    // OT (usar el valor visible)
    const currentDisplayed = parseInt(otInput.value, 10);
    // We decide: the saved OT will be lastOtLocal + 1 (if not previously reserved)
    // to ensure monotonic sequence, use getLastOtLocal() + 1 as the OT for this saved record.
    const assignedOt = getLastOtLocal() + 1;
    order.ot = String(assignedOt);
    order.fechaGuardado = new Date().toISOString();

    // Pago fields normalization
    order.valorTrabajo = order.valorTrabajo ? Number(order.valorTrabajo) : 0;
    order.estadoPago = order.estadoPago || "Pendiente";
    order.montoAbonado = order.montoAbonado ? Number(order.montoAbonado) : 0;

    try {
      await dbAddOrder(order);
      // actualizar last OT (se guardó assignedOt)
      setLastOtLocal(assignedOt);
      // limpiar form y actualizar pantalla (siguiente OT)
      form.reset();
      updateOtDisplay();
      labelAbono.classList.add("hidden");
      alert("Orden guardada correctamente. OT #" + assignedOt);
    } catch (err) {
      console.error(err);
      alert("Error guardando en la base de datos: " + err);
    }
  };

  // Exportar todas las órdenes a Excel (desde IndexedDB)
  document.getElementById("exportBtn").onclick = async (e) => {
    e.preventDefault();
    try {
      const all = await dbGetAll();
      if (!all || all.length === 0) return alert("No hay órdenes para exportar.");
      // Convertir a hoja
      const ws = XLSX.utils.json_to_sheet(all);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ordenes");
      XLSX.writeFile(wb, "Ordenes_Fueltek.xlsx");
    } catch (err) {
      console.error(err);
      alert("Error exportando a Excel: " + err);
    }
  };

  // Construir vista printable y llamar a window.print()
  document.getElementById("printBtn").onclick = (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {};
    for (const [k, v] of fd.entries()) {
      if (k === "accesorios") continue;
      data[k] = v;
    }
    const accessories = Array.from(form.querySelectorAll("input[name='accesorios']:checked")).map(i => i.value);
    data.accesorios = accessories;
    data.ot = (getLastOtLocal() + 1).toString(); // show the OT that will be saved if pressing guardar
    data.fechaImpresion = new Date().toLocaleString();

    buildPrintable(data);
    // Mostrar printArea y llamar a print (CSS @media print hará visible sólo printArea)
    window.print();
  };

  // Construye HTML dentro de #printArea usando datos del formulario (ordenado y profesional)
  function buildPrintable(data) {
    const area = document.getElementById("printArea");
    // create clean HTML with table-like layout
    const html = `
      <div style="font-family: Arial, Helvetica, sans-serif; color:#111;">
        <div style="display:flex; align-items:center; gap:12px; margin-bottom:8px;">
          <img src="logo-fueltek.png" style="width:90px; height:90px; object-fit:contain;" alt="Logo" />
          <div>
            <h2 style="margin:0;">FUELTEK</h2>
            <div style="color:#f26522; font-weight:600;">Servicio Técnico Multimarca</div>
            <div style="margin-top:6px; font-size:12px;">Teléfono: +56 9 4043 5805 | La Trilla 1062, San Bernardo</div>
          </div>
          <div style="margin-left:auto; text-align:right;">
            <div style="font-weight:700; font-size:18px;">N° OT: ${escapeHtml(data.ot || "")}</div>
            <div style="font-size:12px; margin-top:6px;">Fecha impresión: ${escapeHtml(data.fechaImpresion)}</div>
          </div>
        </div>

        <hr style="border:none; border-top:1px solid #ddd; margin:8px 0 12px;">

        <section style="display:flex; gap:14px; margin-bottom:8px;">
          <div style="flex:1;">
            <div style="font-weight:700; margin-bottom:6px;">Datos del Cliente</div>
            <div>Nombre: ${escapeHtml(data.clienteNombre || "")}</div>
            <div>Teléfono: ${escapeHtml(data.clienteTelefono || "")}</div>
            <div>Email: ${escapeHtml(data.clienteEmail || "")}</div>
            <div>Fecha Recibida: ${escapeHtml(data.fechaRecibida || "")}</div>
            <div>Fecha Entrega: ${escapeHtml(data.fechaEntrega || "")}</div>
          </div>
          <div style="flex:1;">
            <div style="font-weight:700; margin-bottom:6px;">Datos de la Herramienta</div>
            <div>Marca: ${escapeHtml(data.marca || "")}</div>
            <div>Modelo: ${escapeHtml(data.modelo || "")}</div>
            <div>N° Serie: ${escapeHtml(data.serie || "")}</div>
            <div>Año Fabricación: ${escapeHtml(data.anio || "")}</div>
            <div style="margin-top:8px; font-weight:700;">Pago</div>
            <div>Valor: ${escapeHtml(data.valorTrabajo || "")} CLP</div>
            <div>Estado: ${escapeHtml(data.estadoPago || "")}</div>
            <div>Abonado: ${escapeHtml(data.montoAbonado || "")} CLP</div>
          </div>
        </section>

        <section style="margin-bottom:8px;">
          <div style="font-weight:700; margin-bottom:6px;">Revisión y Accesorios</div>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${ (data.accesorios || []).map(i => `<span style="border:1px solid #ddd; padding:6px 8px; border-radius:6px; font-size:12px;">${escapeHtml(i)}</span>`).join("") }
          </div>
        </section>

        <section style="margin-top:8px;">
          <div style="font-weight:700; margin-bottom:6px;">Diagnóstico Inicial</div>
          <div style="min-height:44px; border:1px solid #eee; padding:8px; border-radius:6px;">${escapeHtml(data.diagnostico || "")}</div>
        </section>

        <section style="margin-top:8px;">
          <div style="font-weight:700; margin-bottom:6px;">Trabajo Realizado / Notas del Técnico</div>
          <div style="min-height:44px; border:1px solid #eee; padding:8px; border-radius:6px;">${escapeHtml(data.trabajo || "")}</div>
        </section>

        <div style="display:flex; gap:40px; margin-top:28px;">
          <div style="flex:1; text-align:center;">
            <div style="height:60px; border-bottom:1px solid #aaa;"></div>
            <div style="margin-top:6px; font-size:12px;">Firma Taller</div>
          </div>
          <div style="flex:1; text-align:center;">
            <div style="height:60px; border-bottom:1px solid #aaa;"></div>
            <div style="margin-top:6px; font-size:12px;">Firma Cliente</div>
          </div>
        </div>

        <div style="margin-top:18px; font-size:11px; color:#666;">
          <strong>Notas Importantes:</strong>
          <ul style="margin:6px 0 0 18px;">
            <li>Toda herramienta no retirada en 30 días podrá generar cobro por almacenamiento.</li>
            <li>FuelTek no se responsabiliza por accesorios no declarados al momento de la recepción.</li>
            <li>El cliente declara estar informado sobre los términos del servicio y autoriza la revisión del equipo.</li>
          </ul>
        </div>
      </div>
    `;
    area.innerHTML = html;
    area.style.display = "block";
  }

  // Simple escape for HTML injection safety
  function escapeHtml(str) {
    if (!str && str !== 0) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  // Export DB to JSON file
  document.getElementById("exportDbBtn").onclick = async (e) => {
    e.preventDefault();
    try {
      const all = await dbGetAll();
      const blob = new Blob([JSON.stringify(all, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "fueltek_orders_db.json";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert("Error exportando DB: " + err);
    }
  };

  // Import DB JSON (file input)
  importFile.addEventListener("change", async (ev) => {
    const f = ev.target.files[0];
    if (!f) return;
    if (!confirm("Importarás este archivo JSON y se agregarán/actualizarán las órdenes en la base de datos. ¿Continuar?")) {
      importFile.value = "";
      return;
    }
    try {
      const text = await f.text();
      const arr = JSON.parse(text);
      if (!Array.isArray(arr)) throw new Error("JSON inválido: se esperaba un arreglo de órdenes.");
      const count = await dbBulkImport(arr);
      alert("Importadas/Actualizadas: " + count + " órdenes.");
      importFile.value = "";
    } catch (err) {
      console.error(err);
      alert("Error al importar JSON: " + err);
      importFile.value = "";
    }
  });

  // Borrar toda la DB y localStorage (reset)
  document.getElementById("clearBtn").onclick = async () => {
    if (!confirm("¿Estás seguro de borrar todas las órdenes y reiniciar el contador a 727?")) return;
    // delete DB
    const delReq = indexedDB.deleteDatabase(DB_NAME);
    delReq.onsuccess = () => {
      localStorage.removeItem(OT_KEY);
      setLastOtLocal(726);
      updateOtDisplay();
      alert("Base de datos eliminada. Contador reiniciado a 727.");
    };
    delReq.onerror = () => {
      alert("Error eliminando la base de datos: " + delReq.error);
    };
  };

  // Utility: load all orders and log count (for debugging)
  // dbGetAll().then(a=>console.log("Orders in DB:", a.length)).catch(()=>{});
});
