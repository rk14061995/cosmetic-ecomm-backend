/**
 * Copies every collection from cosmetic_web (prod) → cosmetic_web_dev.
 * Run: node scripts/copyProdToDev.js
 *
 * What it does:
 *  - Connects once to the cluster (no db specified)
 *  - Lists all collections in cosmetic_web
 *  - For each collection: drops the dev version, bulk-inserts prod documents
 *  - Skips empty collections silently
 */

require('dotenv').config();
const { MongoClient } = require('mongodb');

const SOURCE_DB = 'cosmetic_web';
const TARGET_DB = 'cosmetic_web_dev';

// Strip the database name from the URI so we can target both DBs from one client
const clusterUri = process.env.MONGODB_URI.replace(/\/[^/?]+([\?]|$)/, '/$1') || process.env.MONGODB_URI;

async function main() {
  const client = new MongoClient(clusterUri);

  try {
    await client.connect();
    console.log(`Connected to cluster`);

    const src = client.db(SOURCE_DB);
    const tgt = client.db(TARGET_DB);

    const collections = await src.listCollections().toArray();

    if (collections.length === 0) {
      console.log(`No collections found in "${SOURCE_DB}". Nothing to copy.`);
      return;
    }

    console.log(`Found ${collections.length} collection(s) in "${SOURCE_DB}" → copying to "${TARGET_DB}"\n`);

    for (const { name } of collections) {
      const srcCol = src.collection(name);
      const tgtCol = tgt.collection(name);

      const docs = await srcCol.find({}).toArray();

      if (docs.length === 0) {
        console.log(`  [skip]  ${name} — empty`);
        continue;
      }

      await tgtCol.drop().catch(() => {}); // ignore "ns not found" error on first run
      await tgtCol.insertMany(docs, { ordered: false });

      console.log(`  [ok]    ${name} — ${docs.length} document(s) copied`);
    }

    console.log(`\nDone. "${SOURCE_DB}" → "${TARGET_DB}" complete.`);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
