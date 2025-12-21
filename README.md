# Nettside2 – Local Update Workflow

To keep the site in sync with Cloudinary before each push:

```bash
npm run build:site
```

This command will:
- Sync Cloudinary images into `_data/images.yml` using your `.env` credentials
- Regenerate preview pages
- Copy regenerated pages into `deploy/` and root so GitHub Pages serves the latest gallery

Commit and push after running it to publish the updates.
