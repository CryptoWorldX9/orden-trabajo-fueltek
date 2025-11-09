/* Fueltek v5.0 - script.js
 - IndexedDB store "orders" (key = ot)
 - Next OT starts at 727
 - Save / Edit / List / Print / Export JSON & Excel
*/

const DB_NAME = "fueltek_db_v5";
const DB_VERSION = 1;
const STORE = "orders";
const OT_LOCAL = "fueltek_last_ot_v5";

function openDB(){
  return new Promise((resolve,reject)=>{
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = e => {
      const db = e.target.result;
      if(!db.objectStoreNames.contains(STORE)){
        db.createObjectStore(STORE, { keyPath: "ot" }); // ot como clave
      }
    };
    req.onsuccess = ()=> resolve(req.result);
    req.onerror = ()=> reject(req.error);
  });
}

function dbPut(order){
  return openDB().then(db=>{
    return new Promise((res,rej)=>{
      const tx = db.transaction(STORE,"readwrite");
      const store = tx.objectStore(STORE);
      const r = store.put(order);
      r.onsuccess = ()=>{ res(true); db.close(); };
      r.onerror = ()=>{ rej(r.error); db.close(); };
    });
  });
}

function dbGetAll(){
  return openDB().then(db=>{
    return new Promise((res,rej)=>{
      const tx = db.transaction(STORE,"readonly");
      const store = tx.objectStore(STORE);
      const r = store.getAll();
      r.onsuccess = ()=>{ res(r.result || []); db.close(); };
      r.onerror = ()=>{ rej(r.error); db.close(); };
    });
  });
}

function dbGet(key){
  return openDB().then(db=>{
    return new Promise((res,rej)=>{
      const tx = db.transaction(STORE,"readonly");
      const store = tx.objectStore(STORE);
      const r = store.get(key);
      r.onsuccess = ()=>{ res(r.result); db.close(); };
      r.onerror = ()=>{ rej(r.error); db.close(); };
    });
  });
}

function dbDeleteAll(){
  return new Promise((res,rej)=>{
    const del = indexedDB.deleteDatabase(DB_NAME);
    del.onsuccess = ()=> res(true);
    del.onerror = ()=> rej(del.error);
  });
}

function getLastOt(){
  const n = parseInt(localStorage.getItem(OT_LOCAL) || "726", 10);
  return n;
}
function setLastOt(n){ localStorage.setItem(OT_LOCAL,String(n)); }
function nextOtAndSave(){ const n = getLastOt() + 1; setLastOt(n); return n; }

document.addEventListener("DOMContentLoaded", ()=> {
  const otInput = document.getElementById("otNumber");
  const form = document.getElementById("otForm");
  const estadoPago = document.getElementById("estadoPago");
  const labelAbono = document.getElementById("labelAbono");

  // modal elements
  const modal = document.getElementById("modal");
  const closeModal = document.getElementById("closeModal");
  const ordersList = document.getElementById("ordersList");
  const searchOt = document.getElementById("searchOt");

  // print area
  const printArea = document.getElementById("printArea");

  // show next OT
  function updateOtDisplay(){ otInput.value = String(getLastOt() + 1); }
  updateOtDisplay();

  // estadoPago change
  if(estadoPago){
    estadoPago.addEventListener("change", ()=>{
      if(estadoPago.value === "Abonado") labelAbono.classList.remove("hidden");
      else { labelAbono.classList.add("hidden"); document.getElementById("montoAbonado").value = ""; }
    });
  }

  // new OT reserved (doesn't auto-save)
  document.getElementById("newOtBtn").addEventListener("click", ()=>{
    const reserved = nextOtAndSave(); // reserve
    updateOtDisplay();
    alert("Reservado N° OT: " + reserved + ". En pantalla verás el siguiente disponible.");
  });

  // Save (create or update)
  document.getElementById("saveBtn").addEventListener("click", async (e)=>{
    e.preventDefault();
    const fd = new FormData(form);
    const order = {};
    for(const [k,v] of fd.entries()){
      if(k === "accesorios") continue;
      order[k] = v;
    }
    const acc = Array.from(form.querySelectorAll("input[name='accesorios']:checked")).map(c=>c.value);
    order.accesorios = acc;
    // assign OT: use getLastOt()+1 to avoid duplicates
    const assigned = getLastOt() + 1;
    order.ot = String(assigned);
    order.fechaGuardado = new Date().toISOString();
    // payment normalization
    order.valorTrabajo = order.valorTrabajo ? Number(order.valorTrabajo) : 0;
    order.estadoPago = order.estadoPago || "Pendiente";
    order.montoAbonado = order.montoAbonado ? Number(order.montoAbonado) : 0;

    try{
      await dbPut(order);
      setLastOt(assigned); // move the counter
      form.reset();
      labelAbono.classList.add("hidden");
      updateOtDisplay();
      alert("Orden guardada correctamente. OT #" + assigned);
    }catch(err){
      console.error(err);
      alert("Error al guardar: " + err);
    }
  });

  // View modal (list of OTs)
  document.getElementById("viewBtn").addEventListener("click", async ()=>{
    await renderOrdersList();
    modal.classList.remove("hidden");
    modal.setAttribute("aria-hidden","false");
  });
  closeModal.addEventListener("click", ()=>{ modal.classList.add("hidden"); modal.setAttribute("aria-hidden","true"); });

  // search input
  searchOt.addEventListener("input", ()=> renderOrdersList(searchOt.value.trim()));

  async function renderOrdersList(filter=""){
    ordersList.innerHTML = "<div style='padding:10px;color:#666'>Cargando...</div>";
    try{
      const all = await dbGetAll();
      const rows = all
        .filter(o=>{
          if(!filter) return true;
          const f = filter.toLowerCase();
          return (o.ot && o.ot.toLowerCase().includes(f)) ||
                 (o.clienteNombre && o.clienteNombre.toLowerCase().includes(f));
        })
        .sort((a,b)=> Number(b.ot) - Number(a.ot)); // desc
      if(rows.length === 0){ ordersList.innerHTML = "<div style='padding:12px;color:#666'>No hay órdenes.</div>"; return; }
      ordersList.innerHTML = "";
      for(const o of rows){
        const div = document.createElement("div");
        div.className = "order-row";
        div.innerHTML = `
          <div>
            <div style="font-weight:700">OT #${o.ot} — ${o.clienteNombre || ""}</div>
            <div style="font-size:12px;color:#666">${(o.marca?o.marca+" — ":"")}${o.modelo?o.modelo:""}</div>
          </div>
          <div class="order-actions">
            <button class="small" data-ot="${o.ot}" data-action="print">Imprimir</button>
            <button class="small" data-ot="${o.ot}" data-action="load">Cargar</button>
            <button class="small" data-ot="${o.ot}" data-action="delete" style="background:#b51b1b">Borrar</button>
          </div>
        `;
        ordersList.appendChild(div);
      }
      // attach actions
      ordersList.querySelectorAll("button").forEach(btn=>{
        btn.addEventListener("click", async (ev)=>{
          const ot = ev.currentTarget.dataset.ot;
          const action = ev.currentTarget.dataset.action;
          if(action === "print"){ const dat = await dbGet(ot); buildPrintAndPrint(dat); }
          else if(action === "load"){ const dat = await dbGet(ot); loadOrderToForm(dat); modal.classList.add("hidden"); }
          else if(action === "delete"){ if(confirm("Borrar OT #" + ot + " ?")){ await deleteOneOt(ot); renderOrdersList(); } }
        });
      });
    }catch(err){
      ordersList.innerHTML = "<div style='padding:10px;color:red'>Error: "+err+"</div>";
    }
  }

  async function deleteOneOt(ot){
    const db = await openDB();
    return new Promise((res,rej)=>{
      const tx = db.transaction(STORE,"readwrite");
      const store = tx.objectStore(STORE);
      const r = store.delete(ot);
      r.onsuccess = ()=>{ res(true); db.close(); };
      r.onerror = ()=>{ rej(r.error); db.close(); };
    });
  }

  function loadOrderToForm(o){
    if(!o) return alert("Orden no encontrada.");
    form.reset();
    // fill simple inputs
    const fields = ["clienteNombre","clienteTelefono","clienteEmail","fechaRecibida","fechaEntrega",
      "marca","modelo","serie","anio","diagnostico","trabajo","valorTrabajo","estadoPago","montoAbonado","firmaTaller","firmaCliente"];
    fields.forEach(k=>{
      const el = form.querySelector(`[name="${k}"]`);
      if(el) el.value = o[k] || "";
    });
    // accesorios
    form.querySelectorAll("input[name='accesorios']").forEach(ch => ch.checked = false);
    if(Array.isArray(o.accesorios)) {
      o.accesorios.forEach(val => {
        const el = Array.from(form.querySelectorAll("input[name='accesorios']")).find(c => c.value === val);
        if(el) el.checked = true;
      });
    }
    // set OT display to loaded OT (but not change counter)
    otInput.value = o.ot;
    if(o.estadoPago === "Abonado") labelAbono.classList.remove("hidden"); else labelAbono.classList.add("hidden");
    alert("Orden OT #" + o.ot + " cargada en el formulario. Edítala y presiona Guardar para actualizar.");
  }

  // export DB JSON
  document.getElementById("exportDbBtn").addEventListener("click", async ()=>{
    try{
      const all = await dbGetAll();
      const blob = new Blob([JSON.stringify(all, null, 2)], {type:"application/json"});
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a"); a.href = url; a.download = "fueltek_orders_v5.json"; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    }catch(err){ alert("Error exportando DB: "+err); }
  });

  // import DB JSON
  document.getElementById("importFile").addEventListener("change", async (ev)=>{
    const f = ev.target.files[0];
    if(!f) return;
    if(!confirm("Importar JSON y añadir/actualizar órdenes?")){ ev.target.value = ""; return; }
    try{
      const txt = await f.text();
      const arr = JSON.parse(txt);
      if(!Array.isArray(arr)) throw new Error("JSON inválido");
      // bulk import
      const db = await openDB();
      const tx = db.transaction(STORE,"readwrite");
      const store = tx.objectStore(STORE);
      for(const o of arr){
        if(!o.ot) continue;
        store.put(o);
      }
      tx.oncomplete = ()=>{ db.close(); alert("Importación completada."); };
      tx.onerror = ()=>{ db.close(); alert("Error importando: "+tx.error); };
    }catch(err){ alert("Error al importar: "+err); }
    ev.target.value = "";
  });

  // export to Excel (all)
  document.getElementById("exportBtn").addEventListener("click", async ()=>{
    try{
      const all = await dbGetAll();
      if(!all || all.length === 0) return alert("No hay órdenes para exportar.");
      const ws = XLSX.utils.json_to_sheet(all);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Ordenes");
      XLSX.writeFile(wb, "Ordenes_Fueltek.xlsx");
    }catch(err){ alert("Error exportando a Excel: "+err); }
  });

  // print current form (build print area)
  document.getElementById("printBtn").addEventListener("click", (ev)=>{
    ev.preventDefault();
    const fd = new FormData(form);
    const data = {};
    for(const [k,v] of fd.entries()) if(k!=="accesorios") data[k]=v;
    data.accesorios = Array.from(form.querySelectorAll("input[name='accesorios']:checked")).map(c=>c.value);
    data.ot = otInput.value || String(getLastOt()+1);
    buildPrintAndPrint(data);
  });

  function buildPrintAndPrint(data){
    // build a clean printable HTML
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111">
        <div style="display:flex;align-items:center;gap:12px">
          <img src="logo-fueltek.png" style="width:90px;height:90px;object-fit:contain" alt="logo" />
          <div>
            <h2 style="margin:0">FUELTEK</h2>
            <div style="color:${getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#f26522'};font-weight:700">Servicio Técnico Multimarca</div>
            <div style="font-size:12px;margin-top:6px">Tel: +56 9 4043 5805 | La Trilla 1062, San Bernardo</div>
          </div>
          <div style="margin-left:auto;text-align:right">
            <div style="font-weight:700;font-size:18px">N° OT: ${escapeHtml(data.ot)}</div>
            <div style="font-size:12px;margin-top:6px">Fecha impresión: ${new Date().toLocaleString()}</div>
          </div>
        </div>
        <hr style="border:none;border-top:1px solid #ddd;margin:10px 0 14px" />

        <div style="display:flex;gap:18px">
          <div style="flex:1">
            <strong>Datos del Cliente</strong><br/>
            Nombre: ${escapeHtml(data.clienteNombre || '')}<br/>
            Teléfono: ${escapeHtml(data.clienteTelefono || '')}<br/>
            Email: ${escapeHtml(data.clienteEmail || '')}<br/>
            Fecha Recibida: ${escapeHtml(data.fechaRecibida || '')}<br/>
            Fecha Entrega: ${escapeHtml(data.fechaEntrega || '')}
          </div>
          <div style="flex:1">
            <strong>Datos de la Herramienta</strong><br/>
            Marca: ${escapeHtml(data.marca || '')}<br/>
            Modelo: ${escapeHtml(data.modelo || '')}<br/>
            N° Serie: ${escapeHtml(data.serie || '')}<br/>
            Año Fabricación: ${escapeHtml(data.anio || '')}<br/>
            <strong style="margin-top:8px;display:block">Pago</strong>
            Valor: ${escapeHtml(data.valorTrabajo||'0')} CLP<br/>
            Estado: ${escapeHtml(data.estadoPago||'') }<br/>
            Abonado: ${escapeHtml(data.montoAbonado||'0')} CLP
          </div>
        </div>

        <div style="margin-top:12px">
          <strong>Revisión y Accesorios</strong>
          <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px">
            ${(data.accesorios || []).map(s=>`<span style="border:1px solid #ddd;padding:6px 8px;border-radius:6px;font-size:12px">${escapeHtml(s)}</span>`).join('')}
          </div>
        </div>

        <div style="margin-top:12px">
          <strong>Diagnóstico Inicial</strong>
          <div style="border:1px solid #eee;padding:8px;border-radius:6px;min-height:60px">${escapeHtml(data.diagnostico||'')}</div>
        </div>

        <div style="margin-top:12px">
          <strong>Trabajo Realizado / Notas del Técnico</strong>
          <div style="border:1px solid #eee;padding:8px;border-radius:6px;min-height:60px">${escapeHtml(data.trabajo||'')}</div>
        </div>

        <div style="display:flex;gap:40px;margin-top:22px">
          <div style="flex:1;text-align:center">
            <div style="height:60px;border-bottom:1px solid #aaa"></div>
            <div style="margin-top:6px">Firma Taller</div>
          </div>
          <div style="flex:1;text-align:center">
            <div style="height:60px;border-bottom:1px solid #aaa"></div>
            <div style="margin-top:6px">Firma Cliente</div>
          </div>
        </div>

        <div style="margin-top:14px;font-size:11px;color:#666">
          <strong>Notas:</strong>
          <ul>
            <li>Toda herramienta no retirada en 30 días podrá generar cobro por almacenamiento.</li>
            <li>FuelTek no se responsabiliza por accesorios no declarados al momento de la recepción.</li>
            <li>El cliente declara estar informado sobre los términos del servicio y autoriza la revisión del equipo.</li>
          </ul>
        </div>
      </div>
    `;
    printArea.innerHTML = html;
    printArea.style.display = "block";
    // call print
    window.print();
    // hide after print (some browsers keep the element visible)
    setTimeout(()=>{ printArea.style.display = "none"; }, 800);
  }

  function escapeHtml(s){ if(s===undefined || s===null) return ""; return String(s).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;"); }

  // clear DB
  document.getElementById("clearBtn").addEventListener("click", async ()=>{
    if(!confirm("Borrar toda la base de datos y reiniciar contador a 727?")) return;
    try{
      await dbDeleteAll();
      setLastOt(726);
      updateOtDisplay();
      alert("Base de datos eliminada. Contador reiniciado a 727.");
    }catch(err){ alert("Error borrando DB: "+err); }
  });

  // load last saved count into display at start
  updateOtDisplay();
});
