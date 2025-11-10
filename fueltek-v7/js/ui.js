// js/ui.js
import { putOrder, getAllOrders, getOrder, deleteOrder } from './db.js';
import { exportBackupJSON, importBackupJSON, exportToExcel } from './backup.js';

const ACCESSORIES = [
  "Motosierra","Desbrozadora","Cortasetos","Corta Césped","Fumigadora","Sopladora",
  "Espada","Cadena","Pistón Rayado","Cilindro Rayado","Bujía","Funda Espada",
  "Tapa de Arranque","Brazo Completo","Cabezal","Tubo","Manilla Arranque"
];

let currentLoadedOt = null;

export function renderAccessories(container){
  container.innerHTML = "";
  for(const a of ACCESSORIES){
    const label = document.createElement("label");
    label.className = "checkbox-item";
    label.innerHTML = `<input type="checkbox" name="accesorios" value="${a}"><span>${a}</span>`;
    container.appendChild(label);
  }
}

export function bindFormControls(opts){
  const { form, otInput, controlsContainer, modal, ordersList, searchInput, printArea } = opts;

  // build control buttons (small)
  const btns = [
    { id:'newOt', title:'Reservar OT', icon:'+' },
    { id:'save', title:'Guardar', icon:'💾' },
    { id:'view', title:'Ver OT', icon:'📋' },
    { id:'exportExcel', title:'Excel', icon:'📥' },
    { id:'exportJSON', title:'Exportar DB', icon:'📂' },
    { id:'importJSON', title:'Importar DB', icon:'📤', isFile:true },
    { id:'print', title:'Imprimir', icon:'🖨️' },
    { id:'clearDB', title:'Borrar DB', icon:'🗑️' }
  ];

  // create element buttons
  for(const b of btns){
    if(b.isFile){
      const label = document.createElement("label");
      label.className = "small-btn import-label";
      label.title = b.title;
      label.innerHTML = '📤<input type="file" id="importFile" accept=".json" style="display:none" />';
      controlsContainer.appendChild(label);
    } else {
      const button = document.createElement("button");
      button.className = "small-btn";
      button.id = b.id + "Btn";
      button.title = b.title;
      button.textContent = b.icon;
      controlsContainer.appendChild(button);
    }
  }

  // add two gray small buttons (limpiar campos y respaldar ahora)
  const clearFields = document.createElement("button");
  clearFields.className = "small-gray-btn";
  clearFields.id = "clearFieldsBtn";
  clearFields.textContent = "Limpiar Campos";
  controlsContainer.appendChild(clearFields);

  const backupNow = document.createElement("button");
  backupNow.className = "small-gray-btn";
  backupNow.id = "backupNowBtn";
  backupNow.textContent = "Respaldar Ahora";
  controlsContainer.appendChild(backupNow);

  // handlers (exposed to main via events)
  // nothing else here: main will attach events by id
}

export function loadOrderIntoForm(form, order, otInput){
  if(!order) return alert("Orden no encontrada.");
  // reset before fill
  form.reset();
  currentLoadedOt = order.ot;
  const fields = ["clienteNombre","clienteTelefono","clienteEmail","fechaRecibida","fechaEntrega",
  "marca","modelo","serie","anio","diagnostico","trabajo","valorTrabajo","estadoPago","montoAbonado","firmaTaller","firmaCliente"];
  fields.forEach(k=>{
    const el = form.querySelector(`[name="${k}"]`);
    if(el) el.value = order[k] || "";
  });
  // accessories
  form.querySelectorAll("input[name='accesorios']").forEach(ch => ch.checked = false);
  if(Array.isArray(order.accesorios)){
    order.accesorios.forEach(v=>{
      const el = Array.from(form.querySelectorAll("input[name='accesorios']")).find(c=>c.value===v);
      if(el) el.checked = true;
    });
  }
  otInput.value = order.ot;
  const labelAbono = document.getElementById("labelAbono");
  if(order.estadoPago === "Abonado") labelAbono.classList.remove("hidden");
  else labelAbono.classList.add("hidden");
  alert("OT #" + order.ot + " cargada. Al guardar se actualizará esa OT.");
}

export function gatherFormData(form, ot){
  const fd = new FormData(form);
  const obj = {};
  for(const [k,v] of fd.entries()){
    if(k === "accesorios") continue;
    obj[k] = v;
  }
  obj.accesorios = Array.from(form.querySelectorAll("input[name='accesorios']:checked")).map(c=>c.value);
  if(ot) obj.ot = String(ot);
  obj.fechaGuardado = new Date().toISOString();
  obj.valorTrabajo = Number(obj.valorTrabajo) || 0;
  obj.montoAbonado = Number(obj.montoAbonado) || 0;
  obj.estadoPago = obj.estadoPago || "Pendiente";
  return obj;
}

export function clearForm(form){
  form.reset();
  document.getElementById("labelAbono").classList.add("hidden");
}

export function buildPrintableHTML(data){
  // returns innerHTML for printArea; similar to previous versions but modular
  const accessoriesHtml = (data.accesorios||[]).map(s=>`<span style="border:1px solid #ddd;padding:6px 8px;border-radius:6px;font-size:12px;margin:3px">${s}</span>`).join("");
  return `
    <div style="font-family:Arial,Helvetica,sans-serif;color:#111">
      <div style="display:flex;align-items:center;gap:12px">
        <img src="assets/logo-fueltek.png" style="width:90px;height:90px;object-fit:contain" alt="logo" />
        <div>
          <h2 style="margin:0">FUELTEK</h2>
          <div style="color:${getComputedStyle(document.documentElement).getPropertyValue('--primary') || '#f26522'};font-weight:700">Servicio Técnico Multimarca</div>
          <div style="font-size:12px;margin-top:6px">Tel: +56 9 4043 5805 | La Trilla 1062, San Bernardo</div>
        </div>
        <div style="margin-left:auto;text-align:right">
          <div style="font-weight:700;font-size:18px">N° OT: ${data.ot||''}</div>
          <div style="font-size:12px;margin-top:6px">Fecha impresión: ${new Date().toLocaleString()}</div>
        </div>
      </div>
      <hr style="border:none;border-top:1px solid #ddd;margin:10px 0 14px" />
      <div style="display:flex;gap:18px">
        <div style="flex:1">
          <strong>Datos del Cliente</strong><br/>
          Nombre: ${data.clienteNombre||''}<br/>
          Teléfono: ${data.clienteTelefono||''}<br/>
          Email: ${data.clienteEmail||''}<br/>
          Fecha Recibida: ${data.fechaRecibida||''}<br/>
          Fecha Entrega: ${data.fechaEntrega||''}
        </div>
        <div style="flex:1">
          <strong>Datos de la Herramienta</strong><br/>
          Marca: ${data.marca||''}<br/>
          Modelo: ${data.modelo||''}<br/>
          N° Serie: ${data.serie||''}<br/>
          Año Fabricación: ${data.anio||''}<br/>
          <strong style="margin-top:8px;display:block">Pago</strong>
          Valor: ${data.valorTrabajo||0} CLP<br/>
          Estado: ${data.estadoPago||''}<br/>
          Abonado: ${data.montoAbonado||0} CLP
        </div>
      </div>
      <div style="margin-top:12px">
        <strong>Revisión y Accesorios</strong>
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;">${accessoriesHtml}</div>
      </div>
      <div style="margin-top:12px">
        <strong>Diagnóstico Inicial</strong>
        <div style="border:1px solid #eee;padding:8px;border-radius:6px;min-height:60px">${data.diagnostico||''}</div>
      </div>
      <div style="margin-top:12px">
        <strong>Trabajo Realizado / Notas del Técnico</strong>
        <div style="border:1px solid #eee;padding:8px;border-radius:6px;min-height:60px">${data.trabajo||''}</div>
      </div>
      <div style="display:flex;gap:40px;margin-top:22px">
        <div style="flex:1;text-align:center"><div style="height:60px;border-bottom:1px solid #aaa"></div><div style="margin-top:6px">Firma Taller</div></div>
        <div style="flex:1;text-align:center"><div style="height:60px;border-bottom:1px solid #aaa"></div><div style="margin-top:6px">Firma Cliente</div></div>
      </div>
    </div>
  `;
}
