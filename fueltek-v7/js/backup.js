async function exportBackup() {
  const data = await dbGetAll();
  if (!data.length) { alert("No hay datos para respaldar."); return; }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "fueltek_backup.json";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}
