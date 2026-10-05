const fs = require('fs');
const readline = require('readline');

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

async function testJoin() {
  console.log('Loading members into map...');
  const memberMap = new Map();
  const fileStream2 = fs.createReadStream('supabase_members_39k.csv');
  const rl2 = readline.createInterface({ input: fileStream2, crlfDelay: Infinity });

  let isHeader2 = true;
  for await (const line of rl2) {
    if (!line.trim()) continue;
    if (isHeader2) { isHeader2 = false; continue; }
    const cols = parseCsvLine(line);
    const mId = (cols[0] || '').trim();
    if (mId) {
      memberMap.set(mId, {
        name: cols[1],
        address: cols[4],
        branch: cols[5],
        truck: cols[6],
        gps: cols[7],
        lat: cols[8],
        lng: cols[9],
        district: cols[10],
        custType: cols[11]
      });
    }
  }
  console.log(`Loaded ${memberMap.size} unique members.`);

  console.log('Checking deliveries join...');
  const fileStream1 = fs.createReadStream('supabase_deliveries_53k.csv');
  const rl1 = readline.createInterface({ input: fileStream1, crlfDelay: Infinity });

  let isHeader1 = true;
  let totalDeliveries = 0;
  let matchedMembers = 0;

  for await (const line of rl1) {
    if (!line.trim()) continue;
    if (isHeader1) { isHeader1 = false; continue; }
    totalDeliveries++;
    const cols = parseCsvLine(line);
    const mId = (cols[0] || '').trim();
    if (memberMap.has(mId)) {
      matchedMembers++;
    }
  }

  console.log(`Total deliveries: ${totalDeliveries}`);
  console.log(`Matched with member address/GPS: ${matchedMembers} (${((matchedMembers/totalDeliveries)*100).toFixed(1)}%)`);
}

testJoin().catch(console.error);
