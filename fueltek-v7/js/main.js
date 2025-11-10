let currentLoadedOt = null;
function getLastOt() { return parseInt(localStorage.getItem("fueltek_last_ot") || "726", 10); }
function setLastOt(n) { localStorage.setItem("fueltek_last_ot", String(n)); }

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("otForm");
  const estadoPago = document.getElementById("estadoPago");
  const labelAbono = document.getElementById("labelAbono");
  const inputAbono = document.getElementById("montoAbonado");
  const otInput = document.getElementById("otNumber");
  const printArea = document.getElementById("printArea");
  const updateOtDisplay = () => (otInput.value = String(getLastOt() + 1));
  updateOtDisplay();

  // Mostrar/ocultar monto abonado
  estadoPago.addEventListener("change", () => {
    if (estadoPago.value === "Abonado") {
      labelAbono.classList.remove("hidden");
      inputAbono.classList.remove("hidden");
    } else {
      labelAbono.classList.add("hidden");
      inputAbono.classList.add("hidden");
      inputAbono.value = "";
    }
  });

  // Guardar OT
  document.getElementById("saveBtn").addEventListener("click", async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const order = {};
    for (const [k, v] of fd.entries()) {
      if (k !== "accesorios") order[k] = v;
    }
    order.accesorios = Array.from(form.querySelectorAll("input[name='accesorios']:checked")).map(c => c.value);
    order.ot = String(getLastOt() + 1);
    await dbPut(order);
    setLastOt(parseInt(order.ot));
    alert("Orden guardada correctamente ✅");
    clearForm(form);
    updateOtDisplay();
  });

  // Nueva OT
  document.getElementById("newOtBtn").addEventListener("click", () => {
    clearForm(form);
    alert("Listo para nueva OT");
  });

  // Borrar toda la base de datos
  document.getElementById("clearBtn").addEventListener("click", () => {
    if (confirm("¿Borrar toda la base de datos?")) {
      indexedDB.deleteDatabase("fueltek_db_v6");
      localStorage.removeItem("fueltek_last_ot");
      clearForm(form);
      alert("Base de datos eliminada y contador reiniciado.");
      updateOtDisplay();
    }
  });

  // Imprimir OT
  document.getElementById("printBtn").addEventListener("click", async e => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = {};
    for (const [k, v] of fd.entries()) if (k !== "accesorios") data[k] = v;
    data.accesorios = Array.from(form.querySelectorAll("input[name='accesorios']:checked")).map(c => c.value);
    data.ot = otInput.value;
    buildPrintAndPrint(data);
  });

  // Generar vista lista para imprimir
  function buildPrintAndPrint(data) {
    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;color:#111;width:100%;padding:20px;box-sizing:border-box;">
        <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:2px solid #f26522;padding-bottom:10px;margin-bottom:10px;">
          <div style="display:flex;align-items:center;gap:10px;">
            <img src="assets/logo-fueltek.png" style="width:80px;height:auto;" alt="logo" />
            <div>
              <h2 style="margin:0;">FUELTEK</h2>
              <div style="font-size:14px;color:#f26522;font-weight:bold;">Servicio Técnico Multimarca</div>
              <div style="font-size:12px;">Tel: +56 9 4043 5805 | La Trilla 1062, San Bernardo</div>
            </div>
          </div>
          <div style="text-align:right;">
            <div style="font-weight:bold;font-size:18px;">N° OT: ${data.ot}</div>
            <div style="font-size:12px;">Fecha impresión: ${new Date().toLocaleString()}</div>
          </div>
        </div>

        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><th colspan="4" style="text-align:left;color:#f26522;">Datos del Cliente</th></tr>
          <tr>
            <td><strong>Nombre:</strong> ${data.clienteNombre || ""}</td>
            <td><strong>Teléfono:</strong> ${data.clienteTelefono || ""}</td>
            <td><strong>Correo:</strong> ${data.clienteEmail || ""}</td>
            <td><strong>Recibida:</strong> ${data.fechaRecibida || ""}</td>
          </tr>
          <tr><td colspan="4"><strong>Entrega:</strong> ${data.fechaEntrega || ""}</td></tr>
        </table>

        <hr style="margin:10px 0;border:none;border-top:1px solid #ccc;"/>

        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <tr><th colspan="4" style="text-align:left;color:#f26522;">Datos de la Herramienta</th></tr>
          <tr>
            <td><strong>Marca:</strong> ${data.marca || ""}</td>
            <td><strong>Modelo:</strong> ${data.modelo || ""}</td>
            <td><strong>N° Serie:</strong> ${data.serie || ""}</td>
            <td><strong>Año:</strong> ${data.anio || ""}</td>
          </tr>
        </table>

        <hr style="margin:10px 0;border:none;border-top:1px solid #ccc;"/>

        <div style="margin-top:10px;">
          <strong style="color:#f26522;">Revisión y Accesorios Recibidos</strong>
          <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:6px;">
            ${(data.accesorios||[]).map(a=>`<span style="border:1px solid #ccc;padding:4px 6px;border-radius:5px;">${a}</span>`).join('')}
          </div>
        </div>

        <div style="margin-top:15px;">
          <strong style="color:#f26522;">Diagnóstico Inicial</strong>
          <div style="border:1px solid #ccc;border-radius:6px;padding:6px;min-height:50px;margin-top:5px;">
            ${data.diagnostico || ""}
          </div>
        </div>

        <div style="margin-top:15px;">
          <strong style="color:#f26522;">Trabajo Realizado / Notas del Técnico</strong>
          <div style="border:1px solid #ccc;border-radius:6px;padding:6px;min-height:50px;margin-top:5px;">
            ${data.trabajo || ""}
          </div>
        </div>

        <div style="margin-top:15px;">
          <strong style="color:#f26522;">Pago</strong>
          <div style="border:1px solid #ccc;border-radius:6px;padding:6px;margin-top:5px;">
            <strong>Valor del trabajo:</strong> ${data.valorTrabajo || "0"} CLP<br/>
            <strong>Estado:</strong> ${data.estadoPago || ""}<br/>
            <strong>Abonado:</strong> ${data.montoAbonado || "0"} CLP
          </div>
        </div>

        <div style="display:flex;justify-content:space-around;margin-top:40px;">
          <div style="text-align:center;">
            <div style="height:60px;border-bottom:1px solid #000;width:200px;margin:auto;"></div>
            <span>Firma Taller</span>
          </div>
          <div style="text-align:center;">
            <div style="height:60px;border-bottom:1px solid #000;width:200px;margin:auto;"></div>
            <span>Firma Cliente</span>
          </div>
        </div>
      </div>
    `;

    printArea.innerHTML = html;
    printArea.style.display = "block";

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>OT N° ${data.ot}</title>
          <style>
            @page { size: letter; margin: 15mm; }
            body { font-family: Arial, Helvetica, sans-serif; font-size: 13px; margin: 0; }
          </style>
        </head>
        <body>${html}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
    printWindow.onafterprint = () => printWindow.close();
  }
});
