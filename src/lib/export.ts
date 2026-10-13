export function exportToCSV(filename: string, rows: Record<string, any>[], headers: string[]) {
  if (!rows || !rows.length) return;

  // Header row
  let csvContent = headers.map(h => `"${h}"`).join(',') + '\r\n';

  // Data rows
  for (const row of rows) {
    const values = headers.map(header => {
      let val = row[header] === null || row[header] === undefined ? '' : String(row[header]);
      // Escape quotes
      val = val.replace(/"/g, '""');
      // Wrap in quotes
      return `"${val}"`;
    });
    csvContent += values.join(',') + '\r\n';
  }

  // Create a Blob and trigger download
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF for UTF-8 BOM
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
