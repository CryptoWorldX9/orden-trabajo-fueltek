// js/main.js
import * as DB from './db.js';
import * as UI from './ui.js';
import * as BACKUP from './backup.js';

const OT_LOCAL = "fueltek_last_ot_v7";

function getLastOt(){ return parseInt(localStorage.getItem(OT_LOCAL) || "726", 10); }
function setLastOt(n){ localStorage.setItem(OT_LOCAL, String(n)); }
function updateOtDisplay(){ document.getElementById("otNumber").value = String(getLastOt() + 1); }

document.addEventListener("DOMContentLoaded", async ()=>{
  const form = document.getElementById("otForm");
  const otInput = document.getElementById("otNumber");
  const controlsContainer = document.getElementById("controls");
  const accessoriesGrid = document.getElementById("accessoriesGrid");
  const modal = document.getElementById("modal");
  const ordersList = document.getElementById("ordersList");
  const searchOt = document.getElementById("searchOt");
  const printArea = document.getElementById("printArea");

  // render accessories and controls
  UI.renderAccessories(accessoriesGrid);
  UI.bindFormControls({ form, otInput, controlsContainer, modal, ordersList, searchInput:searchOt, printArea });

  // create references to buttons (controls were injected)
  const newBtn = document.getElementById("newOtBtn");
  const saveBtn = document.getElementById("saveBtn");
  const viewBtn = document.getElementById("viewBtn");
  const exportBtn = document.getElementById("exportExcelBtn");
  const exportJsonBtn = document.getElementById("exportJSONBtn");
  const printBtn = document.getElementById("printBtn");
  const importFile = document.getElementById("importFile");
  const clearDBBtn = document.getElementById("clearDBBtn");
  const clearFieldsBtn = document.getElementById("clearFieldsBtn");
  const backupNowBtn = document.getElementById("backupNowBtn");

  // fallback if some ids differ (older browsers) — try alternatives
  const byId = id => document.getElementById(id) || document.querySelector(`#${id}Btn`);

  // map real buttons
  const btnNew = byId("newOt") || byId("newOtBtn");
  const btnSave = byId("save") || byId("saveBtn");
  const btnView = byId("view") || byId("viewBtn");
  const btnExcel = byId("exportExcel") || document.getElementById("exportExcelBtn");
  const btnExportJson = byId("exportJSON") || document.getElementById("exportJSONBtn");
  const btnImportFile = document.getElementById("importFile");
  const btnPrint = byId("print") || document.getElementById("printBtn");
  const btnClearDB = byId("clearDB") || document.getElementById("clearDBBtn");

  // update OT on load
  updateOtDisplay();

  // events
  if(btnNew) btnNew.addEventListener("click", ()=>{ // reserve OT
    const n = getLastOt() + 1; setLastOt(n); updateOtDisplay();
    alert("Reservado OT #" + n);
  });

  if(btnSave) btnSave.addEventListener("click", async (e)=>{
    e.preventDefault();
    // simple validation
    const cliente = form.querySelector('[name="clienteNombre"]').value.trim();
    const marca = form.querySelector('[name="marca"]').value.trim();
    if(!cliente || !marca){
      return alert("Por favor complete Nombre del Cliente y Marca de la herramienta.");
    }
    // gather data
    const data = UI.gatherFormData(form);
    // if ot number present and exists in DB, update; else create new correlativo
    const displayedOt = otInput.value;
    const existing = await DB.getOrder(displayedOt).catch(()=>null);
    if(existing){
      data.ot = displayedOt;
      await DB.putOrder(data);
      alert("Orden actualizada: OT #" + data.ot);
    }else{
      const newOt = getLastOt() + 1;
      data.ot = String(newOt);
      await DB.putOrder(data);
      setLastOt(newOt);
      alert("Orden creada: OT #" + data.ot);
    }
    UI.clearForm(form);
    updateOtDisplay();
  });

  if(btnView) btnView.addEventListener("click", async ()=>{
    await renderOrdersModal(); modal.classList.remove("hidden");
  });

  async function renderOrdersModal(filter=""){
    ordersList.innerHTML = "<div style='padding:8px;color:#666'>Cargando...</div>";
    const all = await DB.getAllOrders();
    const rows = all.filter(o=>{
      if(!filter) return true;
      const f = filter.toLowerCase();
      return (o.ot && o.ot.includes(f)) || (o.clienteNombre && o.clienteNombre.toLowerCase().includes(f));
    }).sort((a,b)=> Number(b.ot) - Number(a.ot));
    if(!rows.length){ ordersList.innerHTML = "<div style='padding:12px;color:#666'>No hay órdenes</div>"; return; }
    ordersList.innerHTML = rows.map(o=>`
      <div class="order-row">
        <div><b>OT #${o.ot}</b> — ${o.clienteNombre||''}<br><small>${o.marca||''} ${o.modelo||''}</small></div>
        <div class="order-actions">
          <button class="small" data-ot="${o.ot}" data-action="print">Imprimir</button>
          <button class="small" data-ot="${o.ot}" data-action="load">Cargar</button>
          <button class="small" data-ot="${o.ot}" data-action="delete" style="background:var(--danger)">Borrar</button>
        </div>
      </div>
    `).join("");
    // attach handlers
    ordersList.querySelectorAll("button").forEach(btn=>{
      btn.addEventListener("click", async (ev)=>{
        const ot = ev.currentTarget.dataset.ot;
        const action = ev.currentTarget.dataset.action;
        if(action === "print"){ const d = await DB.getOrder(ot); printOrder(d); }
        if(action === "load"){ const d = await DB.getOrder(ot); UI.loadOrderIntoForm(form,d,otInput); modal.classList.add("hidden"); }
        if(action === "delete"){ if(confirm("Borrar OT #"+ot+" ?")){ await DB.deleteOrder(ot); renderOrdersModal(); } }
      });
    });
  }

  document.getElementById("closeModal").addEventListener("click", ()=> modal.classList.add("hidden"));
  document.getElementById("searchOt").addEventListener("input",(e)=> renderOrdersModal(e.target.value.trim()));

  // export excel (load sheetjs dynamically if not present)
  document.querySelector('#exportExcelBtn')?.addEventListener('click', async ()=>{
    if(typeof XLSX === 'undefined'){
      await loadSheetJS();
    }
    BACKUP.exportToExcel();
  });

  // export JSON
  document.querySelector('#exportJSONBtn')?.addEventListener('click', ()=> BACKUP.exportBackupJSON());

  // import JSON file input
  const importInput = document.getElementById('importFile');
  importInput?.addEventListener('change', async (e)=>{
    const f = e.target.files[0]; if(!f) return;
    if(!confirm("Importarás órdenes desde este JSON y se agregarán/actualizarán. Continuar?")) { e.target.value=''; return; }
    try{
      const arr = await BACKUP.importBackupJSON(f);
      // bulk write
      const db = await DB.openDB();
      const tx = db.transaction(DB.STORE,"readwrite");
      const store = tx.objectStore(DB.STORE);
      arr.forEach(o=>{ if(o.ot) store.put(o); });
      tx.oncomplete = ()=>{ db.close(); alert("Importación completada."); renderOrdersModal(); e.target.value=''; };
      tx.onerror = ()=>{ db.close(); alert("Error importando: "+tx.error); e.target.value=''; };
    }catch(err){ alert("Error: "+err); e.target.value=''; }
  });

  // print handler (build printArea HTML via UI)
  function printOrder(data){
    if(!data) return alert("Orden no encontrada.");
    printArea.innerHTML = UI.buildPrintableHTML(data);
    printArea.style.display = "block";
    window.print();
    setTimeout(()=> printArea.style.display='none',800);
  }
  document.querySelector('#printBtn')?.addEventListener('click', (e)=>{
    e.preventDefault();
    // print current form values
    const data = UI.gatherFormData(form, otInput.value);
    printOrder(data);
  });

  // clear DB
  document.querySelector('#clearDBBtn')?.addEventListener('click', async ()=>{
    if(!confirm("Borrar toda la base de datos? (esto elimina todas las órdenes)")) return;
    await DB.deleteDatabase();
    setLastOt(726);
    updateOtDisplay();
    alert("DB borrada. Contador reiniciado.");
  });

  // clear fields
  document.getElementById('clearFieldsBtn')?.addEventListener('click', ()=>{
    if(confirm("Limpiar todos los campos del formulario?")){
      UI.clearForm(form); updateOtDisplay();
    }
  });

  // backup now
  document.getElementById('backupNowBtn')?.addEventListener('click', ()=> BACKUP.exportBackupJSON());

  // automatic backup cada 10 minutos
  setInterval(()=>{ BACKUP.exportBackupJSON(); }, 10 * 60 * 1000);

  // register service worker for PWA (optional)
  if('serviceWorker' in navigator){
    navigator.serviceWorker.register('/service-worker.js').catch(()=>{ console.warn('SW register falló'); });
  }

  // helper: load SheetJS when required
  async function loadSheetJS(){
    return new Promise((res,rej)=>{
      const s = document.createElement('script');
      s.src = "https://cdn.sheetjs.com/xlsx-0.20.3/package/dist/xlsx.full.min.js";
      s.onload = ()=> res();
      s.onerror = ()=> rej("No se cargó SheetJS");
      document.head.appendChild(s);
    });
  }
});
