import fs from 'node:fs';
const f = 'db/seed.sql';
let s = fs.readFileSync(f, 'utf8');
const HASH = '$2b$10$LSji5.0L8UH47kR53pYmOO9vXnbYRTs0.5/GpCJGlB.mnztxvwmlO';
// password_hash slots were emptied by the hash removal: `''` right before row end
const before = (s.match(/\x27\x27/g) || []).length;
s = s.replaceAll(`\x27\x27),`, `'${HASH}'),`);
s = s.replaceAll(`\x27\x27);`, `'${HASH}');`);
s = s.replaceAll(`\x27\x27`, `NULL`); // safety net for any remaining
// Track referral hours remaining
s = s.replace(/;\s*$/, `;\n\n-- 001: hours remaining starts equal to hours required\nUPDATE referrals SET hours_remaining = hours_required;\n
COMMIT;`);
fs.writeFileSync(f, s);
console.log('empty pairs before:', before, 'hash inserted, ends with:', s.slice(-80).replace(/\n/g, '\\n'));
