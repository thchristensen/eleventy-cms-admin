# eleventy-cms-admin

Custom headless CMS admin panel for Eleventy + Netlify projects. A vanilla JS single-page app that lets you edit content via a form UI, with a live preview iframe and direct commits to GitHub.

**Stack:** Vanilla JS · Netlify Identity (auth) · Netlify Functions (GitHub proxy) · Cloudinary (images)

---

## What's included

| File | Description |
| ---- | ----------- |
| `admin/index.html` | Admin SPA shell |
| `admin/admin.js` | Form builder, GitHub API integration, live preview |
| `admin/admin.css` | Admin UI styles |
| `functions/github-proxy.js` | Netlify Function — proxies all GitHub API reads/writes server-side |

The `sync.js` script copies these files into the correct locations in your project.

---

## Adding to a project

### 1. Copy files

From a local clone of this repo, run:

```bash
node deploy.js ../path-to-your-project
```

This copies `admin/` and `netlify/functions/github-proxy.js` into your project. Commit the result.

### 3. Configure Eleventy

In `.eleventy.js`, pass through the admin folder and publish the schema:

```js
eleventyConfig.addPassthroughCopy('admin');
eleventyConfig.addPassthroughCopy({ 'src/_data/schema.json': 'admin/schema.json' });
```

### 4. Set environment variables

Required in `.env` (local) and Netlify → Site Settings → Environment Variables (production):

| Variable | Description |
| -------- | ----------- |
| `GITHUB_TOKEN` | Fine-grained PAT with Contents: Read & Write on the repo |
| `GITHUB_OWNER` | GitHub username or organisation |
| `GITHUB_REPO` | Repository name |
| `GITHUB_BRANCH` | Branch to commit to (e.g. `main` or `preview`) |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary account name (optional — required for image uploads) |
| `CLOUDINARY_UPLOAD_PRESET` | Unsigned upload preset (optional) |

### 5. Add the preview listener to your base layout

In your base Nunjucks template, add the preview message receiver before `</body>`:

```njk
<script>
  if (location.search.includes('preview=1')) {
    document.addEventListener('click', function(e) {
      if (e.target.closest('a')) e.preventDefault();
    });
    window.addEventListener('message', function(e) {
      if (!e.data || e.data.type !== 'cms-preview') return;
      var values = e.data.values;
      document.querySelectorAll('[data-cms-path]').forEach(function(el) {
        var path = el.dataset.cmsPath;
        if (path in values) {
          if (el.tagName === 'IMG') { el.src = values[path]; }
          else { el.innerHTML = values[path]; }
        }
      });
      document.querySelectorAll('[data-cms-bg-path]').forEach(function(el) {
        var path = el.dataset.cmsBgPath;
        if (path in values) el.style.backgroundImage = 'url(' + values[path] + ')';
      });
    });
  }
</script>
```

### 6. Define your schema

Create `src/_data/schema.json` to describe your editable content. See [SCHEMA.md](SCHEMA.md) for the full reference.

```json
{
  "home": {
    "_preview_url": "/",
    "heading": { "type": "text", "label": "Hero Heading" }
  }
}
```

### 7. Add `data-cms-path` attributes to templates

Mark editable elements in your Nunjucks templates:

```njk
<h1 data-cms-path="cms.home.heading">{{ cms.home.heading }}</h1>
```

---

## Updating the admin

### Publishing a new version

1. Edit files in `admin/` or `functions/` inside this repo
2. Commit your changes
3. Run the release script:
   ```bash
   node release.js patch   # or: minor / major
   ```
   This bumps the version in `VERSION` and `admin/admin.js`, commits, and pushes.

### Updating a project

From a local clone of this repo:

```bash
node deploy.js ../path-to-your-project
```

Then in the consuming project, review the diff and commit:

```bash
git add admin/ netlify/functions/github-proxy.js
git commit -m "chore: update admin to v1.x.x"
```

To check what version a project is running, look at the first line of its `admin/admin.js`.

### Pushing improvements back from a project

If you improved the admin while working in a project:

```bash
cp path/to/project/admin/admin.js admin/admin.js
# repeat for other changed files, then commit
```

---

## Local development

Run Netlify CLI so the GitHub proxy function is available:

```bash
npm run dev   # netlify dev — serves on :8888
```

The admin is then at `http://localhost:8888/admin/`. On localhost, authentication is bypassed automatically.

---

## Schema reference

See [SCHEMA.md](SCHEMA.md) for the full field type and collection reference.
