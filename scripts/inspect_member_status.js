const fs = require('fs');

const SUPABASE_URL = 'https://aggfmnyrfxmuwpjbynom.supabase.co';
const API_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFnZ2ZtbnlyZnhtdXdwamJ5bm9tIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTExODM2OTcsImV4cCI6MjEwNjc1OTY5N30.HnGYGAADMLfoVMpv0lfAM3a5Z3CRZwQS1UpFXdBzsBI';

async function inspectMember(memberId) {
  console.log(`\n===============================================================`);
  console.log(` INSPECTING MEMBER: #${memberId}`);
  console.log(`===============================================================`);

  // 1. Query Supabase for all delivery orders for this member
  const url = `${SUPABASE_URL}/rest/v1/delivery_orders?member_id=eq.${memberId}&select=id,member_id,customer_name,branch,truck_number,status,reason,delivery_date,is_transferred,round,note&order=delivery_date.asc`;
  const resp = await fetch(url, {
    headers: {
      'apikey': API_KEY,
      'Authorization': `Bearer ${API_KEY}`
    }
  });

  const orders = await resp.json();
  console.log(`Supabase Total Orders found: ${orders.length}`);
  orders.forEach((o, idx) => {
    console.log(`  [${idx + 1}] วันที่: ${o.delivery_date} | รอบ: ${o.round} | สายรถ: ${o.truck_number} | สถานะ: ${o.status} | เหตุผล: ${o.reason} | โอนงาน: ${o.is_transferred} | หมายเหตุ: ${o.note || '-'}`);
  });

  // 2. Check in js/data_store.js
  const dataStoreContent = fs.readFileSync('js/data_store.js', 'utf8');
  const jsonMatch = dataStoreContent.match(/window\.CRISIS_DATA\s*=\s*({[\s\S]*});/);
  if (jsonMatch) {
    const data = JSON.parse(jsonMatch[1]);
    const inPending = (data.pending || []).find(p => p.memberId === memberId);
    const inResolved = (data.resolved || []).find(r => r.memberId === memberId);

    console.log('\njs/data_store.js current state:');
    if (inPending) {
      console.log('  ⚠️ FOUND IN PENDING LIST:', JSON.stringify(inPending, null, 2));
    } else {
      console.log('  Not in pending list');
    }
    if (inResolved) {
      console.log('  ✅ FOUND IN RESOLVED LIST:', JSON.stringify(inResolved, null, 2));
    } else {
      console.log('  Not in resolved list');
    }
  }
}

async function main() {
  await inspectMember('117485');
  await inspectMember('154781');
  await inspectMember('224899');
}

main().catch(console.error);
