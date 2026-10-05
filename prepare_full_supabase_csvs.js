const fs = require('fs');
const readline = require('readline');

// Simple CSV line parser handling quotes
function parseCsvLine(text) {
  const result = [];
  let cur = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (inQuotes && text[i + 1] === '"') {
        cur += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === ',' && !inQuotes) {
      result.push(cur);
      cur = '';
    } else {
      cur += c;
    }
  }
  result.push(cur);
  return result;
}

function escapeCsv(val) {
  if (val === null || val === undefined) return '""';
  let s = String(val).replace(/"/g, '""');
  return `"${s}"`;
}

async function processMembers() {
  console.log('Processing sheet2_addresses_39k.csv into supabase_members_39k.csv...');
  const fileStream = fs.createReadStream('sheet2_addresses_39k.csv');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const outStream = fs.createWriteStream('supabase_members_39k.csv', { encoding: 'utf8' });
  outStream.write('\uFEFF'); // UTF-8 BOM

  const outHeaders = [
    'member_id',
    'name',
    'address_building',
    'address_subdistrict',
    'full_address',
    'branch',
    'truck_number',
    'gps',
    'latitude',
    'longitude',
    'district',
    'customer_type'
  ];
  outStream.write(outHeaders.join(',') + '\r\n');

  let isHeader = true;
  let count = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const cols = parseCsvLine(line);
    const memberId = (cols[0] || '').trim();
    if (!memberId) continue;

    const name = (cols[1] || '').trim();
    const addr1 = (cols[2] || '').trim();
    const addr2 = (cols[3] || '').trim();
    const fullAddr = [addr1, addr2].filter(Boolean).join(' ');
    let branch = (cols[4] || '').trim();
    if (branch.startsWith('คลัง')) branch = branch.replace(/^คลัง/, 'สาขา');
    const truck = (cols[5] || '').trim();
    const gps = (cols[6] || '').trim();
    const custType = (cols[7] || '').trim();

    let lat = '';
    let lng = '';
    if (gps.includes(',')) {
      const parts = gps.split(',');
      lat = parseFloat(parts[0].trim()) || '';
      lng = parseFloat(parts[1].trim()) || '';
    }

    // Extract district (เขต)
    let district = '';
    const dMatch = fullAddr.match(/เขต([^\s,]+)/);
    if (dMatch) {
      district = dMatch[1].trim();
    } else {
      const aMatch = fullAddr.match(/อ\.([^\s,]+)/);
      if (aMatch) district = aMatch[1].trim();
    }

    const row = [
      escapeCsv(memberId),
      escapeCsv(name),
      escapeCsv(addr1),
      escapeCsv(addr2),
      escapeCsv(fullAddr),
      escapeCsv(branch),
      escapeCsv(truck),
      escapeCsv(gps),
      lat !== '' ? lat : '',
      lng !== '' ? lng : '',
      escapeCsv(district),
      escapeCsv(custType)
    ];

    outStream.write(row.join(',') + '\r\n');
    count++;
  }

  outStream.end();
  console.log(`Finished supabase_members_39k.csv: ${count} members written.`);
  return count;
}

async function processDeliveries() {
  console.log('Processing sheet1_deliveries_53k.csv into supabase_deliveries_53k.csv...');
  const fileStream = fs.createReadStream('sheet1_deliveries_53k.csv');
  const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

  const outStream = fs.createWriteStream('supabase_deliveries_53k.csv', { encoding: 'utf8' });
  outStream.write('\uFEFF'); // UTF-8 BOM

  const outHeaders = [
    'member_id',
    'customer_name',
    'delivery_date',
    'round',
    'status_code',
    'fail_reason',
    'delivery_group',
    'truck_number',
    'change_bottle',
    'doc_details',
    'money_collected',
    'mdfss_note',
    'weekly_round',
    'customer_type',
    'branch'
  ];
  outStream.write(outHeaders.join(',') + '\r\n');

  let isHeader = true;
  let count = 0;

  for await (const line of rl) {
    if (!line.trim()) continue;
    if (isHeader) {
      isHeader = false;
      continue;
    }

    const cols = parseCsvLine(line);
    const memberId = (cols[0] || '').trim();
    if (!memberId) continue;

    const name = (cols[1] || '').trim();
    let dDate = (cols[2] || '').trim();
    const round = (cols[3] || '').trim();
    const statusCode = (cols[4] || '').trim();
    const failReason = (cols[5] || '').trim();
    const truck = (cols[6] || '').trim();
    const changeBottle = (cols[7] || '').trim();
    const docDetails = (cols[8] || '').trim();
    const moneyCollected = (cols[9] || '').trim();
    const mdfssNote = (cols[10] || '').trim();
    const weeklyRound = (cols[11] || '').trim();
    const custType = (cols[12] || '').trim();
    let branch = (cols[13] || '').trim();
    if (branch.startsWith('คลัง')) branch = branch.replace(/^คลัง/, 'สาขา');

    // Categorize delivery group
    let deliveryGroup = 'ปกติ';
    if (failReason) {
      const isCannotDeliver = failReason.includes('ไม่สามารถเข้าส่งได้') ||
                              failReason.includes('น้ำท่วม') ||
                              failReason.includes('เกิดข้อผิดพลาด') ||
                              failReason.includes('เลื่อนวันที่ส่ง');
      deliveryGroup = isCannotDeliver ? 'ยังส่งไม่ได้' : 'เข้าส่งได้';
    }

    const row = [
      escapeCsv(memberId),
      escapeCsv(name),
      escapeCsv(dDate),
      escapeCsv(round),
      escapeCsv(statusCode),
      escapeCsv(failReason),
      escapeCsv(deliveryGroup),
      escapeCsv(truck),
      escapeCsv(changeBottle),
      escapeCsv(docDetails),
      escapeCsv(moneyCollected),
      escapeCsv(mdfssNote),
      escapeCsv(weeklyRound),
      escapeCsv(custType),
      escapeCsv(branch)
    ];

    outStream.write(row.join(',') + '\r\n');
    count++;
  }

  outStream.end();
  console.log(`Finished supabase_deliveries_53k.csv: ${count} deliveries written.`);
  return count;
}

async function run() {
  await processMembers();
  await processDeliveries();
  console.log('ALL CSVS GENERATED SUCCESSFULLY!');
}

run().catch(console.error);
