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
// Optional: comma-separated folders or a full Cloudinary Search expression
const FOLDERS = (process.env.CLOUDINARY_FOLDERS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);
const SEARCH_EXPRESSION = process.env.CLOUDINARY_SEARCH_EXPRESSION || '';
const FALLBACK_CATEGORY_ENV = (process.env.CLOUDINARY_FALLBACK_CATEGORY || '').trim();

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('\nMissing Cloudinary credentials. Please set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY and CLOUDINARY_API_SECRET in the environment or an .env file.');
  console.error('This script will not run without credentials. Exiting.\n');
  process.exit(0);
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });

function folderLeaf(f) {
  const segs = (f || '').split('/').filter(Boolean);
  return segs.length ? segs[segs.length - 1] : 'uncategorized';
}

function buildExpression(singleFolder) {
  if (SEARCH_EXPRESSION) return SEARCH_EXPRESSION;
  const folders = singleFolder ? [singleFolder] : (FOLDERS.length ? FOLDERS : [FOLDER]);
  // Build an OR expression for all provided folders, scoped to images
  const parts = folders.map(f => `folder:${f.replace(/^\//, '')}/*`);
  return `resource_type:image AND (${parts.join(' OR ')})`;
}

// Fallback category if Cloudinary does not return a folder (happens on some uploads)
const DEFAULT_CATEGORY = FALLBACK_CATEGORY_ENV || folderLeaf(FOLDERS[0] || FOLDER || '');

async function fetchAllResources(expression) {
  const items = [];
  let next_cursor = undefined;
  do {
    const builder = cloudinary.search
      .expression(expression) // everything that matches the expression
      .max_results(500)
      .sort_by('public_id', 'asc');
    if (next_cursor) builder.next_cursor(next_cursor);
    const res = await builder.execute();
    if (res && res.resources) items.push(...res.resources);
    next_cursor = res.next_cursor;
  } while (next_cursor);
  return items;
}

// Fetch resources for a single folder with a per-folder fallback category
async function fetchResourcesForFolder(folder) {
  const expression = buildExpression(folder);
  const fallbackCategory = folderLeaf(folder);
  const resources = await fetchAllResources(expression);
  return { resources, fallbackCategory };
}

function resourceToItem(r, fallbackCategory) {
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

  // category: use resource.folder last segment when possible, else penultimate of public_id
  // e.g. public_id = images/astro/landscapes/_111 -> category = 'landscapes'
  let category = '';
  if (r.folder) {
    const segs = r.folder.split('/').filter(Boolean);
    category = segs.length ? segs[segs.length - 1] : '';
  }
  if (!category) {
    if (public_id && public_id.includes('/')) {
      const parts = public_id.split('/');
      category = parts.length >= 2 ? parts[parts.length - 2] : '';
    }
  }
  if (!category) category = fallbackCategory || DEFAULT_CATEGORY || 'uncategorized';

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
    const resourcesWithFallback = [];
    if (SEARCH_EXPRESSION) {
      console.log('Fetching resources with custom expression:', SEARCH_EXPRESSION);
      const res = await fetchAllResources(buildExpression());
      resourcesWithFallback.push(...res.map(r => ({ resource: r, fallback: DEFAULT_CATEGORY })));
    } else if (FOLDERS.length > 1) {
      console.log('Fetching resources from folders:', FOLDERS.join(', '));
      for (const f of FOLDERS) {
        const { resources, fallbackCategory } = await fetchResourcesForFolder(f);
        resourcesWithFallback.push(...resources.map(r => ({ resource: r, fallback: fallbackCategory })));
      }
    } else {
      console.log('Fetching resources from folder:', FOLDER);
      const res = await fetchAllResources(buildExpression());
      resourcesWithFallback.push(...res.map(r => ({ resource: r, fallback: folderLeaf(FOLDER) })));
    }

    console.log('Found', resourcesWithFallback.length, 'resources');
    // De-duplicate by public_id
    const seen = new Set();
    const items = [];
    for (const entry of resourcesWithFallback) {
      const r = entry.resource;
      if (r && r.public_id && !seen.has(r.public_id)) {
        items.push(resourceToItem(r, entry.fallback));
        seen.add(r.public_id);
      }
    }
    await writeDataFile(items);
    console.log('Done.');
  } catch (err) {
    console.error('Error while syncing Cloudinary images:', err);
    process.exit(1);
  }
})();