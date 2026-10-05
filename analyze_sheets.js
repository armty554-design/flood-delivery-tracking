const fs = require('fs');

function parseFirstLine(file) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  console.log(`\n=== File: ${file} ===`);
  console.log('Total lines:', lines.length);
  console.log('Header line:', lines[0]);
  console.log('Row 1:', lines[1]);
}

parseFirstLine('sheet1_deliveries_53k.csv');
parseFirstLine('sheet2_addresses_39k.csv');
