/**
 * ตัวอย่างโค้ดเชื่อมต่อ Supabase บน Frontend (JavaScript / HTML)
 * สามารถนำไปใส่ใน Index_template.html หรือ Web App ได้ทันที
 */

// 1. นำเข้า Supabase Client ผ่าน CDN ในแท็ก <head>:
// <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';

const supabaseClient = window.supabase ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

/**
 * 2. ฟังก์ชันดึงข้อมูลรายการจัดส่งทั้งหมดจาก Supabase (แทนที่ google.script.run)
 */
async function fetchOrdersFromSupabase() {
  try {
    const { data, error } = await supabaseClient
      .from('delivery_orders')
      .select('*')
      .order('id', { ascending: true });

    if (error) throw error;

    // แปลงรูปแบบข้อมูลให้ตรงกับ Frontend เดิม (snake_case -> camelCase)
    const formattedItems = data.map(row => ({
      id: row.order_code || row.id,
      memberId: row.member_id,
      name: row.customer_name,
      date: row.delivery_date ? row.delivery_date.replace('T', ' ').substring(0, 16) : '',
      round: row.round,
      reason: row.reason,
      truck: row.truck_number,
      day: row.delivery_day,
      customerType: row.customer_type,
      branch: row.branch,
      address: row.address,
      gps: row.gps,
      district: row.district,
      status: row.status,
      note: row.note,
      deliveryGroup: row.delivery_group,
      isTransferred: row.is_transferred,
      transferOperator: row.transfer_operator,
      transferDate: row.transfer_date,
      transferRaw: row.transfer_raw
    }));

    return formattedItems;
  } catch (err) {
    console.error('Error fetching from Supabase:', err);
    return [];
  }
}

/**
 * 3. ฟังก์ชันอัปเดตสถานะและบันทึก Action Log เมื่อกดปุ่มใน Modal
 */
async function updateOrderInSupabase(memberId, newStatus, note, operatorEmail = 'Admin') {
  try {
    // 3.1 อัปเดตสถานะที่ตารางหลัก delivery_orders
    const { error: updateError } = await supabaseClient
      .from('delivery_orders')
      .update({
        status: newStatus,
        note: note,
        updated_at: new Date().toISOString()
      })
      .eq('member_id', memberId);

    if (updateError) throw updateError;

    // 3.2 บันทึกประวัติลงตาราง action_logs
    const { error: logError } = await supabaseClient
      .from('action_logs')
      .insert([
        {
          member_id: memberId,
          status: newStatus,
          note: note,
          user_email: operatorEmail
        }
      ]);

    if (logError) console.warn('Warning: Log insert error:', logError);

    return { success: true };
  } catch (err) {
    console.error('Error updating status in Supabase:', err);
    return { success: false, error: err.message };
  }
}

/**
 * 4. ระบบ Real-time Subscription (เมื่อมีผู้อื่นอัปเดตข้อมูล หน้าจอจะเปลี่ยนสดทันที)
 */
function initRealtimeListener(onDataChange) {
  if (!supabaseClient) return;

  const channel = supabaseClient
    .channel('realtime-delivery-orders')
    .on(
      'postgres_changes',
      { event: '*', schema: 'public', table: 'delivery_orders' },
      payload => {
        console.log('Realtime change received:', payload);
        if (typeof onDataChange === 'function') {
          onDataChange(payload);
        }
      }
    )
    .subscribe();

  return channel;
}
