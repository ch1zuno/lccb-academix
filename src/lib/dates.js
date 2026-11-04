/**
 * Date-only helpers. PostgreSQL `date` values arrive as timestamps; treating
 * them with `toISOString()` shifts the day for UTC+8 users before 08:00.
 */
export function localYmd(value = new Date()) {
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addDaysYmd(days, from = new Date()) {
  const date = from instanceof Date ? new Date(from) : new Date(from);
  date.setDate(date.getDate() + Number(days || 0));
  return localYmd(date);
}
