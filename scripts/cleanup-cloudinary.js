/**
 * Finds and optionally deletes Cloudinary assets not listed in media.json.
 *
 * Usage:
 *   node scripts/cleanup-cloudinary.js           # dry run — list orphans
 *   node scripts/cleanup-cloudinary.js --delete  # delete orphans (prompts for confirmation)
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { v2: cloudinary } = require('cloudinary');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length && !process.env[k]) process.env[k] = v.join('=');
  }
}

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('Missing Cloudinary credentials in .env');
  process.exit(1);
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });

const MEDIA_PATH = path.join(__dirname, '..', 'src', '_data', 'media.json');
const CMS_PATH = path.join(__dirname, '..', 'src', '_data', 'cms.json');
const STORIES_DIR = path.join(__dirname, '..', 'src', 'wedding-stories');
const DELETE_MODE = process.argv.includes('--delete');
const DELETE_BATCH = 100;

function extractPublicId(url) {
  // https://res.cloudinary.com/{cloud}/image/upload/v{version}/{public_id}.{ext}
  // Also handles transformations like /upload/w_800,c_fit/v{version}/{id}.ext
  const match = url.match(/\/upload\/(?:[^/]+\/)?v\d+\/(.+?)(?:\.[^.]+)?$/);
  return match ? match[1] : null;
}

function collectCloudinaryUrls(obj, out = new Set()) {
  if (typeof obj === 'string' && obj.includes('res.cloudinary.com')) out.add(obj);
  else if (Array.isArray(obj)) obj.forEach(i => collectCloudinaryUrls(i, out));
  else if (obj && typeof obj === 'object') Object.values(obj).forEach(v => collectCloudinaryUrls(v, out));
  return out;
}

async function listAllCloudinaryAssets() {
  const assets = [];
  let nextCursor = null;
  let page = 0;

  process.stdout.write('Fetching Cloudinary assets');
  do {
    const opts = { type: 'upload', max_results: 500, resource_type: 'image' };
    if (nextCursor) opts.next_cursor = nextCursor;
    const result = await cloudinary.api.resources(opts);
    assets.push(...result.resources);
    nextCursor = result.next_cursor || null;
    page++;
    process.stdout.write('.');
  } while (nextCursor);

  console.log(` done (${page} page${page !== 1 ? 's' : ''})`);
  return assets;
}

function prompt(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => rl.question(question, ans => { rl.close(); resolve(ans); }));
}

async function main() {
  // Build set of known public IDs from media.json
  const media = JSON.parse(fs.readFileSync(MEDIA_PATH, 'utf8'));
  const uploads = media.uploads || [];
  const knownIds = new Set();
  for (const entry of uploads) {
    const id = extractPublicId(entry.url);
    if (id) knownIds.add(id);
  }

  // Also protect images referenced in cms.json and wedding stories (even if absent from media.json)
  const siteUrls = collectCloudinaryUrls(JSON.parse(fs.readFileSync(CMS_PATH, 'utf8')));
  if (fs.existsSync(STORIES_DIR)) {
    for (const f of fs.readdirSync(STORIES_DIR).filter(f => f.endsWith('.json'))) {
      collectCloudinaryUrls(JSON.parse(fs.readFileSync(path.join(STORIES_DIR, f), 'utf8')), siteUrls);
    }
  }
  let protectedCount = 0;
  for (const url of siteUrls) {
    const id = extractPublicId(url);
    if (id && !knownIds.has(id)) { knownIds.add(id); protectedCount++; }
  }

  console.log(`media.json: ${uploads.length} entries, ${knownIds.size} unique public IDs${protectedCount > 0 ? ` (${protectedCount} extra protected from cms.json/stories)` : ''}`);

  // List all assets in Cloudinary
  const assets = await listAllCloudinaryAssets();
  console.log(`Cloudinary:  ${assets.length} assets`);

  // Find orphans
  const orphans = assets.filter(a => !knownIds.has(a.public_id));

  if (orphans.length === 0) {
    console.log('\nNo orphaned assets found. Cloudinary is in sync with media.json.');
    return;
  }

  const totalBytes = orphans.reduce((sum, a) => sum + (a.bytes || 0), 0);
  const totalMB = (totalBytes / 1024 / 1024).toFixed(1);

  console.log(`\nOrphaned assets (${orphans.length}, ~${totalMB} MB):`);
  console.log('─'.repeat(70));
  for (const a of orphans) {
    const mb = ((a.bytes || 0) / 1024 / 1024).toFixed(2);
    console.log(`  ${a.public_id.padEnd(45)} ${mb.padStart(6)} MB  ${a.secure_url}`);
  }
  console.log('─'.repeat(70));
  console.log(`Total: ${orphans.length} orphan${orphans.length !== 1 ? 's' : ''}, ~${totalMB} MB\n`);

  if (!DELETE_MODE) {
    console.log('Run with --delete to remove these from Cloudinary.');
    return;
  }

  const answer = await prompt(`Delete ${orphans.length} orphaned asset(s) from Cloudinary? Type "yes" to confirm: `);
  if (answer.trim().toLowerCase() !== 'yes') {
    console.log('Aborted.');
    return;
  }

  const ids = orphans.map(a => a.public_id);
  let deleted = 0, failed = 0;

  for (let i = 0; i < ids.length; i += DELETE_BATCH) {
    const batch = ids.slice(i, i + DELETE_BATCH);
    try {
      const result = await cloudinary.api.delete_resources(batch);
      const batchDeleted = Object.values(result.deleted).filter(v => v === 'deleted').length;
      deleted += batchDeleted;
      failed += batch.length - batchDeleted;
      process.stdout.write(`\rDeleted ${deleted}/${ids.length}...`);
    } catch (err) {
      console.error(`\nBatch delete failed: ${err.message || err}`);
      failed += batch.length;
    }
  }

  console.log(`\nDone. Deleted: ${deleted}, Failed: ${failed}`);
  if (failed > 0) console.warn('Re-run --delete to retry failed deletions.');
}

main().catch(err => { console.error(err); process.exit(1); });
