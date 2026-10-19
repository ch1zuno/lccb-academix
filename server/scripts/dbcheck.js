import pg from 'pg';
const c = new pg.Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/lccb_academix' });
await c.connect();
const { rows } = await c.query(`SELECT role, department, program, count(*)::int AS n FROM users GROUP BY role, department, program ORDER BY role, n DESC LIMIT 20`);
console.table(rows);
await c.end();
