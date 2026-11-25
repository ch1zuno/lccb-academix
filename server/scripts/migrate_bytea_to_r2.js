/**
 * Migration Script: Migrate existing user avatars and application documents
 * from Supabase PostgreSQL bytea columns to Cloudflare R2 object storage.
 *
 * Idempotent: Can be run multiple times safely.
 */
import { query, pool } from '../db.js';
import { isR2Configured, uploadToR2 } from '../lib/storage.js';

async function runMigration() {
  console.log('--- Starting Cloudflare R2 Migration ---');

  if (!isR2Configured()) {
    console.error('Error: Cloudflare R2 is not configured in environment variables.');
    process.exit(1);
  }

  let totalAvatarsMigrated = 0;
  let totalAvatarBytes = 0;
  let totalDocsMigrated = 0;
  let totalDocBytes = 0;

  // 1. Migrate user_avatars
  console.log('\n[1/2] Checking user_avatars...');
  const { rows: avatars } = await query(`
    SELECT user_id, data, mime_type, size_bytes, r2_key, r2_url 
    FROM user_avatars 
    WHERE data IS NOT NULL
  `);

  console.log(`Found ${avatars.length} avatar(s) with binary data in PostgreSQL.`);

  for (const avatar of avatars) {
    try {
      const mime = avatar.mime_type || 'image/jpeg';
      const ext = mime === 'image/png' ? 'png' : (mime === 'image/webp' ? 'webp' : 'jpg');
      const r2Key = avatar.r2_key || `avatars/${avatar.user_id}-${Date.now()}.${ext}`;

      console.log(`Uploading avatar for user ${avatar.user_id} (${avatar.size_bytes} bytes) -> ${r2Key}...`);
      const uploadResult = await uploadToR2({
        key: r2Key,
        buffer: avatar.data,
        mimeType: mime,
      });

      await query(
        `UPDATE user_avatars 
         SET r2_key = $1, r2_url = $2, data = NULL, updated_at = CURRENT_TIMESTAMP 
         WHERE user_id = $3`,
        [r2Key, uploadResult.url, avatar.user_id]
      );

      totalAvatarsMigrated++;
      totalAvatarBytes += Number(avatar.size_bytes || avatar.data.length);
      console.log(`✓ Avatar migrated. Direct URL: ${uploadResult.url}`);
    } catch (err) {
      console.error(`✗ Failed to migrate avatar for user ${avatar.user_id}:`, err.message);
    }
  }

  // 2. Migrate application_documents
  console.log('\n[2/2] Checking application_documents...');
  const { rows: docs } = await query(`
    SELECT id, application_id, file_name, mime_type, size_bytes, data, r2_key, r2_url 
    FROM application_documents 
    WHERE data IS NOT NULL
  `);

  console.log(`Found ${docs.length} document(s) with binary data in PostgreSQL.`);

  for (const doc of docs) {
    try {
      const cleanName = (doc.file_name || 'document.pdf').replace(/[^a-zA-Z0-9._-]/g, '_');
      const r2Key = doc.r2_key || `documents/${doc.application_id}/${doc.id}-${cleanName}`;

      console.log(`Uploading document ${doc.id} (${cleanName}, ${doc.size_bytes} bytes) -> ${r2Key}...`);
      const uploadResult = await uploadToR2({
        key: r2Key,
        buffer: doc.data,
        mimeType: doc.mime_type || 'application/octet-stream',
      });

      await query(
        `UPDATE application_documents 
         SET r2_key = $1, r2_url = $2, data = NULL 
         WHERE id = $3`,
        [r2Key, uploadResult.url, doc.id]
      );

      totalDocsMigrated++;
      totalDocBytes += Number(doc.size_bytes || doc.data.length);
      console.log(`✓ Document migrated. R2 Key: ${r2Key}`);
    } catch (err) {
      console.error(`✗ Failed to migrate document ${doc.id}:`, err.message);
    }
  }

  // 3. Post-migration verification
  console.log('\n--- Post-Migration Audit ---');
  const { rows: remainingAvatars } = await query(`SELECT COUNT(*) AS count FROM user_avatars WHERE data IS NOT NULL`);
  const { rows: remainingDocs } = await query(`SELECT COUNT(*) AS count FROM application_documents WHERE data IS NOT NULL`);

  console.log(`Avatars migrated: ${totalAvatarsMigrated} (${(totalAvatarBytes / 1024).toFixed(1)} KB)`);
  console.log(`Documents migrated: ${totalDocsMigrated} (${(totalDocBytes / 1024).toFixed(1)} KB)`);
  console.log(`Remaining bytea avatars in Supabase: ${remainingAvatars[0].count}`);
  console.log(`Remaining bytea documents in Supabase: ${remainingDocs[0].count}`);

  if (Number(remainingAvatars[0].count) === 0 && Number(remainingDocs[0].count) === 0) {
    console.log('\n🎉 ALL MEDIA SUCCESSFULLY MIGRATED TO CLOUDFLARE R2! Supabase bytea is now 0.');
  }

  await pool.end();
}

runMigration().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
