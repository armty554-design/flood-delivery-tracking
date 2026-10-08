const SUPABASE_URL = 'https://aggfmnyrfxmuwpjbynom.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ2ZtbnlyZnhtdXdwamJ5bm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODM2OTcsImV4cCI6MjEwNjc1OTY5N30.HnGYGAADMLfoVMpv0lfAM3a5Z3CRZwQS1UpFXdBzsBI';

async function checkDate7() {
  const date = '2026-10-07';
  const url = `${SUPABASE_URL}/rest/v1/delivery_orders?delivery_date=gte.${date}T00:00:00%2B07:00&delivery_date=lte.${date}T23:59:59%2B07:00&select=id,member_id,customer_name,branch,truck_number,status,reason,delivery_date,is_transferred,round`;
  
  // 1. Get exact total count
  const respCount = await fetch(url, {
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`,
      'Range-Unit': 'items',
      'Prefer': 'count=exact',
      'Range': '0-0'
    }
  });
  const contentRange = respCount.headers.get('content-range');
  const total = contentRange ? parseInt(contentRange.split('/')[1], 10) : 0;
  console.log('--- SUPABASE QUERY RESULT ---');
  console.log('Target Date: 2026-10-07 (Thailand Time UTC+7)');
  console.log('Content-Range Header:', contentRange);
  console.log('Total Count on 2026-10-07:', total);

  // 2. Fetch records in batches to summarize
  let allRows = [];
  let page = 0;
  const pageSize = 1000;
  while (true) {
    const start = page * pageSize;
    const end = start + pageSize - 1;
    const resp = await fetch(url, {
      headers: {
        'apikey': API_KEY,
        'Authorization': `Bearer ${API_KEY}`,
        'Range-Unit': 'items',
        'Range': `${start}-${end}`
      }
    });
    const rows = await resp.json();
    if (!rows || rows.length === 0) break;
    allRows.push(...rows);
    if (rows.length < pageSize) break;
    page++;
  }

  console.log('Fetched rows for analysis:', allRows.length);

  const branchCounts = {};
  const statusCounts = {};
  const trucks = new Set();
  let floodCount = 0;
  let transferCount = 0;

  allRows.forEach(r => {
    branchCounts[r.branch] = (branchCounts[r.branch] || 0) + 1;
    const isTrans = r.is_transferred || (r.reason && r.reason.includes('โอนงาน')) || (r.round && r.round.includes('โอนงาน'));
    if (isTrans) transferCount++;
    const isFlood = (r.reason && r.reason.includes('น้ำท่วม')) || (r.status && r.status.includes('น้ำท่วม'));
    if (isFlood) floodCount++;
    if (r.truck_number) trucks.add(r.truck_number);
    const key = r.reason || r.status || 'ปกติ';
    statusCounts[key] = (statusCounts[key] || 0) + 1;
  });

  console.log('\n--- BREAKDOWN BY BRANCH ---');
  for (const [b, c] of Object.entries(branchCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  - ${b}: ${c.toLocaleString()} รายการ`);
  }

  console.log('\n--- KEY METRICS ---');
  console.log(`  - จำนวนรถที่วิ่งส่ง: ${trucks.size} คัน`);
  console.log(`  - ติดปัญหาน้ำท่วม: ${floodCount.toLocaleString()} รายการ`);
  console.log(`  - มีการโอนงานระหว่างสายรถ: ${transferCount.toLocaleString()} รายการ`);

  console.log('\n--- TOP 5 REASONS/STATUS ---');
  const sortedStatus = Object.entries(statusCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);
  sortedStatus.forEach(([s, c]) => {
    console.log(`  - ${s}: ${c.toLocaleString()} รายการ`);
  });
}

checkDate7().catch(console.error);
