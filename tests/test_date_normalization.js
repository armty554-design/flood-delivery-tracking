/**
 * Test date normalization & query range matching
 */
const assert = require('assert');

function normalizeParsedDate(val) {
  if (!val && val !== 0) return new Date().toISOString();
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return new Date().toISOString();
    return val.toISOString();
  }
  const s = String(val).trim();
  if (!s) return new Date().toISOString();

  // 1. Check Excel serial date number like 45573 or 45572.43194
  if (/^\d{4,5}(\.\d+)?$/.test(s)) {
    const num = parseFloat(s);
    // Excel epoch 1900
    const date = new Date(Math.round((num - 25569) * 86400 * 1000));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // 2. Format: YYYY-MM-DD or YYYY/MM/DD (with optional time and BE year support)
  const ymdMatch = s.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})(?:[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?)?(.*)$/);
  if (ymdMatch) {
    let year = parseInt(ymdMatch[1], 10);
    if (year > 2400) year -= 543; // Buddhist Era
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    const hh = ymdMatch[4] ? ymdMatch[4].padStart(2, '0') : '00';
    const mm = ymdMatch[5] ? ymdMatch[5].padStart(2, '0') : '00';
    const ss = ymdMatch[6] ? ymdMatch[6].padStart(2, '0') : '00';
    const tz = ymdMatch[7] ? ymdMatch[7].trim() : '';

    if (tz && (tz.startsWith('+') || tz.startsWith('-') || tz.toUpperCase() === 'Z')) {
      return `${year}-${month}-${day}T${hh}:${mm}:${ss}${tz}`;
    }
    return `${year}-${month}-${day}T${hh}:${mm}:${ss}+07:00`;
  }

  // 3. Format: DD/MM/YYYY or DD-MM-YYYY (with optional time and BE year support)
  const dmyMatch = s.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})(?:[\sT](\d{1,2}):(\d{2})(?::(\d{2}))?)?(.*)$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    let year = parseInt(dmyMatch[3], 10);
    if (year > 2400) year -= 543; // Buddhist Era
    const hh = dmyMatch[4] ? dmyMatch[4].padStart(2, '0') : '00';
    const mm = dmyMatch[5] ? dmyMatch[5].padStart(2, '0') : '00';
    const ss = dmyMatch[6] ? dmyMatch[6].padStart(2, '0') : '00';
    const tz = dmyMatch[7] ? dmyMatch[7].trim() : '';

    if (tz && (tz.startsWith('+') || tz.startsWith('-') || tz.toUpperCase() === 'Z')) {
      return `${year}-${month}-${day}T${hh}:${mm}:${ss}${tz}`;
    }
    return `${year}-${month}-${day}T${hh}:${mm}:${ss}+07:00`;
  }

  return s;
}

// Run test cases
console.log('--- Testing normalizeParsedDate ---');
assert.strictEqual(normalizeParsedDate('2026-10-07 10:22:00'), '2026-10-07T10:22:00+07:00');
assert.strictEqual(normalizeParsedDate('2026-10-07 10:22'), '2026-10-07T10:22:00+07:00');
assert.strictEqual(normalizeParsedDate('2026-10-07'), '2026-10-07T00:00:00+07:00');
assert.strictEqual(normalizeParsedDate('2026-10-07T10:22:00+07:00'), '2026-10-07T10:22:00+07:00');
assert.strictEqual(normalizeParsedDate('2569-10-07 10:22:00'), '2026-10-07T10:22:00+07:00');
assert.strictEqual(normalizeParsedDate('2569/10/07'), '2026-10-07T00:00:00+07:00');
assert.strictEqual(normalizeParsedDate('07/10/2569 10:22:00'), '2026-10-07T10:22:00+07:00');
assert.strictEqual(normalizeParsedDate('07/10/2026 10:22'), '2026-10-07T10:22:00+07:00');
assert.strictEqual(normalizeParsedDate('7/10/2026'), '2026-10-07T00:00:00+07:00');
assert(normalizeParsedDate('45572').includes('2024-10-07'));

console.log('✅ All 10 normalizeParsedDate test cases PASSED!');
