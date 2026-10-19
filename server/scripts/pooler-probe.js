/* Find this project's Session-pooler cluster: connect as postgres.<project-ref>
 * across Supabase's pooler grid; wrong clusters reject instantly (unknown
 * tenant), the right one authenticates. Password comes from .env DATABASE_URL,
 * so no secrets are hard-coded. */
import 'dotenv/config';
import pg from 'pg';

const src = new URL(process.env.DATABASE_URL.replace(/^postgresql:/, 'postgres:'));
const REF = src.hostname.replace('db.', '').replace('.supabase.co', '');
const USER = `postgres.${REF}`;
const PASSWORD = decodeURIComponent(src.password);

const REGIONS = [
  'af-south-1', 'ap-east-1', 'ap-northeast-1', 'ap-northeast-2', 'ap-northeast-3',
  'ap-southeast-1', 'ap-southeast-2', 'ap-southeast-3', 'ap-southeast-4',
  'ca-central-1', 'eu-central-1', 'eu-central-2', 'eu-north-1', 'eu-south-1',
  'eu-west-1', 'eu-west-2', 'eu-west-3', 'me-central-1', 'me-south-1',
  'sa-east-1', 'us-east-1', 'us-east-2', 'us-west-1', 'us-west-2',
];
const CLUSTERS = ['aws-0', 'aws-1', 'aws-2'];

const hits = [];
let pending = 0;
const probe = async (cluster, region) => {
  pending++;
  const host = `${cluster}-${region}.pooler.supabase.com`;
  const c = new pg.Client({
    host, port: 5432, user: USER, password: PASSWORD, database: 'postgres',
    ssl: { rejectUnauthorized: false }, connectionTimeoutMillis: 3500,
  });
  try {
    await c.connect();
    const { rows } = await c.query('select current_user');
    hits.push(host);
    console.log(`HIT ${host} (auth as ${rows[0].current_user})`);
    await c.end().catch(() => {});
  } catch (e) {
    await c.end().catch(() => {});
  } finally {
    pending--;
  }
};

for (const cluster of CLUSTERS) {
  await Promise.allSettled(REGIONS.map(r => probe(cluster, r)));
}

console.log(hits.length ? `FOUND: ${hits.join(', ')}` : 'NO CLUSTER FOUND');
process.exit(hits.length ? 0 : 1);
