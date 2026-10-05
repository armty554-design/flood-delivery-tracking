const fs = require('fs');
const path = require('path');

const initialData = require('./initial_data.json');

console.log(`Starting export of ${initialData.length} records to Supabase CSV...`);

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  let str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

const headers = [
  'order_code',
  'member_id',
  'customer_name',
  'delivery_date',
  'round',
  'reason',
  'truck_number',
  'delivery_day',
  'customer_type',
  'branch',
  'address',
  'gps',
  'latitude',
  'longitude',
  'district',
  'status',
  'note',
  'delivery_group',
  'is_transferred',
  'transfer_operator',
  'transfer_date',
  'transfer_raw'
];

const rows = [headers.join(',')];

for (const item of initialData) {
  let lat = '';
  let lng = '';
  if (item.gps && item.gps.includes(',')) {
    const parts = item.gps.split(',');
    lat = parseFloat(parts[0].trim()) || '';
    lng = parseFloat(parts[1].trim()) || '';
  }

  // Format delivery date to ISO or clean string
  let delivDate = item.date || '';
  if (delivDate && !delivDate.includes('T') && delivDate.includes(' ')) {
    delivDate = delivDate.replace(' ', 'T') + '+07:00';
  }

  const row = [
    item.id || '',
    escapeCsv(item.memberId),
    escapeCsv(item.name),
    escapeCsv(delivDate),
    escapeCsv(item.round),
    escapeCsv(item.reason),
    escapeCsv(item.truck),
    escapeCsv(item.day),
    escapeCsv(item.customerType),
    escapeCsv(item.branch),
    escapeCsv(item.address),
    escapeCsv(item.gps),
    lat !== '' ? lat : '',
    lng !== '' ? lng : '',
    escapeCsv(item.district),
    escapeCsv(item.status),
    escapeCsv(item.note),
    escapeCsv(item.deliveryGroup),
    item.isTransferred ? 'true' : 'false',
    escapeCsv(item.transferOperator),
    escapeCsv(item.transferDate),
    escapeCsv(item.transferRaw)
  ];

  rows.push(row.join(','));
}

// Write with UTF-8 BOM so Thai characters are preserved perfectly
const csvContent = '\uFEFF' + rows.join('\r\n');
const outputPath = path.join(__dirname, 'supabase_delivery_orders.csv');

fs.writeFileSync(outputPath, csvContent, 'utf8');

console.log(`Successfully exported to: ${outputPath}`);
console.log(`Total rows: ${rows.length - 1}`);
