#!/usr/bin/env node
/*
 sync-cloudinary-images.js

  - Reads Cloudinary Search API for images under a folder
  - Writes `_data/images.yml` with an array of image objects
  - Requires environment variables: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET
  - Optional: CLOUDINARY_FOLDER (default: "images")

  Usage:
    CLOUDINARY_CLOUD_NAME=... CLOUDINARY_API_KEY=... CLOUDINARY_API_SECRET=... node scripts/sync-cloudinary-images.js

*/

const fs = require('fs');
const path = require('path');
try { require('dotenv').config(); } catch (e) {}
const yaml = require('js-yaml');
const cloudinary = require('cloudinary').v2;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME || process.env.CLOUDINARY_CLOUDNAME || process.env.CLOUDINARY_CLOUD;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const FOLDER = process.env.CLOUDINARY_FOLDER || 'images';

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('\nMissing Cloudinary credentials. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the environment or an .env file.');
  console.error('This script will not run without credentials. Exiting.\n');
  process.exit(0);
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });

async function fetchAllResources(folder) {
  const items = [];
  let next_cursor = undefined;
  do {
    const builder = cloudinary.search
      .expression(`folder:${folder}/*`) // everything under the folder
      .max_results(500)
      .sort_by('public_id', 'asc');
    if (next_cursor) builder.next_cursor(next_cursor);
    const res = await builder.execute();
    if (res && res.resources) items.push(...res.resources);
    next_cursor = res.next_cursor;
  } while (next_cursor);
  return items;
}

function resourceToItem(r) {
  const url = r.secure_url || r.url || '';
  const public_id = r.public_id || '';
  // derive title from context or filename
  let title = '';
  try {
    if (r.context && r.context.custom && r.context.custom.title) title = r.context.custom.title;
    else title = path.basename(public_id);
  } catch (e) { title = path.basename(public_id); }

  let caption = '';
  try { if (r.context && r.context.custom && r.context.custom.caption) caption = r.context.custom.caption; } catch (e) {}

  // category: infer from the folder that directly contains the file
  // e.g. public_id = images/astro/landscapes/_111 -> category = 'landscapes'
  let category = '';
  if (public_id && public_id.includes('/')) {
    const parts = public_id.split('/');
    if (parts.length >= 2) {
      // pick the penultimate segment (folder containing the file)
      category = parts[parts.length - 2];
    } else {
      category = parts[0];
    }
  } else {
    category = FOLDER;
  }

  const featured = (r.tags || []).includes('featured');

  return {
    url,
    public_id,
    title,
    caption,
    category,
    featured
  };
}

async function writeDataFile(items) {
  const outPath = path.join(process.cwd(), '_data', 'images.yml');
  const dir = path.dirname(outPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const yamlStr = yaml.dump(items, { noRefs: true, sortKeys: false });
  fs.writeFileSync(outPath, yamlStr, 'utf8');
  console.log('Wrote', outPath, 'with', items.length, 'items');
}

(async () => {
  try {
    console.log('Fetching resources from Cloudinary folder:', FOLDER);
    const resources = await fetchAllResources(FOLDER);
    console.log('Found', resources.length, 'resources');
    const items = resources.map(resourceToItem);
    await writeDataFile(items);
    console.log('Done.');
  } catch (err) {
    console.error('Error while syncing Cloudinary images:', err);
    process.exit(1);
  }
})();