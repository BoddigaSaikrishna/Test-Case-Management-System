/**
 * Database Migration Runner
 * 
 * Reads SQL migration files from backend/migrations/ and executes them
 * against the Supabase database using the service role key.
 * 
 * Usage:
 *   node src/config/migrate.js          - Run all pending migrations
 *   node src/config/migrate.js --list   - List available migration files
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const MIGRATIONS_DIR = path.resolve(__dirname, '../../migrations');

// Use service role key for migrations (bypasses RLS)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required for migrations.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * Get all .sql files from the migrations directory, sorted alphabetically.
 */
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
    process.exit(1);
  }

  return fs
    .readdirSync(MIGRATIONS_DIR)
    .filter(file => file.endsWith('.sql'))
    .sort();
}

/**
 * Execute a single SQL migration file against Supabase.
 */
async function runMigration(filename) {
  const filePath = path.join(MIGRATIONS_DIR, filename);
  const sql = fs.readFileSync(filePath, 'utf-8');

  console.log(`  Running: ${filename}...`);

  let error = null;
  try {
    const res = await supabase.rpc('exec_sql', { query: sql });
    error = res.error;
  } catch (err) {
    error = err;
  }

  if (error) {
    // Fallback: Try using the REST API to execute SQL directly
    // Note: Supabase doesn't natively support raw SQL execution via the client library.
    // For production, consider using a direct PostgreSQL connection (e.g., via pg library).
    console.warn(`  ⚠ Could not execute via RPC. Error: ${error.message || error}`);
    console.warn(`  ℹ To run this migration manually, paste the contents of`);
    console.warn(`    ${filePath}`);
    console.warn(`    into the Supabase SQL Editor at: ${supabaseUrl}`);
    return false;
  }

  console.log(`  ✓ ${filename} applied successfully.`);
  return true;
}

/**
 * Main entry point.
 */
async function main() {
  const args = process.argv.slice(2);
  const files = getMigrationFiles();

  if (files.length === 0) {
    console.log('No migration files found.');
    return;
  }

  // --list flag: just print the files
  if (args.includes('--list')) {
    console.log('Available migration files:');
    files.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
    return;
  }

  console.log(`Found ${files.length} migration file(s) in ${MIGRATIONS_DIR}`);
  console.log('');

  let successCount = 0;
  let failCount = 0;

  for (const file of files) {
    const success = await runMigration(file);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log('');
  console.log(`Migration complete: ${successCount} succeeded, ${failCount} failed.`);

  if (failCount > 0) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Migration runner error:', err);
  process.exit(1);
});
