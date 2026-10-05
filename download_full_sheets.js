const fs = require('fs');

async function downloadSheet(gid, filename) {
  console.log(`Downloading GID ${gid} to ${filename}...`);
  const url = `https://docs.google.com/spreadsheets/d/1MzG8dBJNeYPRkUbaUg0C8stQIYz8bYChFxk_oHJiXgo/export?format=csv&gid=${gid}`;
  const res = await fetch(url);
  const text = await res.text();
  fs.writeFileSync(filename, text, 'utf8');
  console.log(`Saved ${filename}: ${text.length} bytes, ${text.split('\n').length} lines`);
}

async function main() {
  await downloadSheet('1946422535', 'sheet1_deliveries_53k.csv');
  await downloadSheet('495654728', 'sheet2_addresses_39k.csv');
}

main().catch(console.error);
