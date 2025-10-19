#!/usr/bin/env node
/* upload-to-cloudinary.js
  Simple CLI to upload a local images folder to Cloudinary.
*/

const fs = require('fs');
const path = require('path');
const glob = require('glob');
try { require('dotenv').config(); } catch (e) {}
const cloudinary = require('cloudinary').v2;

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;
const TARGET_FOLDER = process.env.CLOUDINARY_FOLDER || 'images';

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('Missing Cloudinary credentials. Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to .env');
  process.exit(1);
}

cloudinary.config({ cloud_name: CLOUD_NAME, api_key: API_KEY, api_secret: API_SECRET });

const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const patternArgIndex = args.indexOf('--pattern');
const pattern = (patternArgIndex !== -1 && args[patternArgIndex+1]) ? args[patternArgIndex+1] : 'images/**/*.{jpg,jpeg,png,JPG,JPEG,PNG,webp}';

const files = glob.sync(pattern, { nodir: true });
if (!files.length) {
  console.log('No files found for pattern:', pattern);
  process.exit(0);
}

console.log(`Found ${files.length} files to upload (pattern: ${pattern})`);
if (dryRun) {
  files.forEach(f => console.log('[dry-run] would upload', f));
  process.exit(0);
}

async function uploadFile(localPath) {
  // compute public_id and folder so subfolders are preserved
  // e.g. localPath = images/astro/_00001.jpg
  const rel = path.relative(process.cwd(), localPath).replace(/\\\\/g, '/');
  // strip the initial images/ if the TARGET_FOLDER is also 'images'
  const relParts = rel.split('/');
  // determine subpath after the local base 'images' directory
  const subpathParts = relParts.slice(relParts.indexOf('images') + 1);
  const ext = path.extname(localPath);
  const publicId = path.join(...subpathParts).replace(ext, '');
  const folderForUpload = TARGET_FOLDER; // keep subfolders in public_id instead of folder nesting

  // We set folder to TARGET_FOLDER and public_id to the relative path (without extension). Cloudinary will store public_id under the folder.
  const options = {
    folder: folderForUpload,
    public_id: publicId.replace(/\\/g, '/'),
    resource_type: 'image',
    overwrite: false
  };

  try {
    const res = await cloudinary.uploader.upload(localPath, options);
    console.log('Uploaded:', localPath, '->', res.secure_url);
    return res;
  } catch (err) {
    console.error('Upload failed for', localPath, err.message || err);
    return null;
  }
}

(async () => {
  console.log('Starting upload to Cloudinary folder:', TARGET_FOLDER);
  for (const file of files) {
    // skip files larger than some size? (optional)
    await uploadFile(file);
  }
  console.log('Upload run finished. Run `node scripts/sync-cloudinary-images.js` to refresh _data/images.yml');
})();
