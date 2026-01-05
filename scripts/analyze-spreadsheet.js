const XLSX = require('xlsx');
const workbook = XLSX.readFile('./C2A Data/Sales/C2A Security Pipeline Projections 2026 24122025 (1).xlsx');
const sheet = workbook.Sheets['Pipeline'];
const data = XLSX.utils.sheet_to_json(sheet);

let totalEstimated = 0;
let totalWeighted = 0;
let count = 0;

console.log('=== SAMPLE DEALS ===');
data.slice(1, 6).forEach(row => {
  const dealName = row['Deal Name'];
  if (!dealName) return;

  const estimated = row['Total Amount'] || 0;
  const weighted = row['Weighted Amount Conservative '] || row['Weighted Amount Conservative'] || 0;
  const prob = row['Conservative Probability'] || 0;

  console.log(dealName.slice(0, 50));
  console.log('  Total Amount: $' + estimated.toLocaleString());
  console.log('  Probability: ' + (prob * 100).toFixed(0) + '%');
  console.log('  Weighted (from spreadsheet): $' + weighted.toLocaleString());
  console.log('');
});

data.forEach(row => {
  const dealName = row['Deal Name'];
  if (!dealName || String(dealName).trim() === '') return;
  count++;
  totalEstimated += row['Total Amount'] || 0;
  totalWeighted += row['Weighted Amount Conservative '] || row['Weighted Amount Conservative'] || 0;
});

console.log('=== TOTALS FROM SPREADSHEET ===');
console.log('Total deals:', count);
console.log('Total Estimated (Column K):', '$' + totalEstimated.toLocaleString());
console.log('Total Weighted (Column P):', '$' + totalWeighted.toLocaleString());
