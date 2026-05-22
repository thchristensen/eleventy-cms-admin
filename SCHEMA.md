# Schema reference

`schema.json` drives the admin form UI. Every key maps to a corresponding key in `cms.json`. The top-level keys are page slugs (e.g. `home`, `contact`); nested keys form the content tree.

---

## Page metadata

Each top-level page key accepts two optional admin-only properties (prefixed with `_` so Eleventy ignores them):

| Option          | Type   | Description                                                            |
| --------------- | ------ | ---------------------------------------------------------------------- |
| `_preview_url`  | string | Path to load in the preview iframe (e.g. `"/"`, `"/contact/"`). If omitted the admin falls back to `/<pageKey>/`. Always set this explicitly to avoid surprises. |

```json
"home": {
  "_preview_url": "/",
  "heading": { "type": "text", "label": "Heading" }
}
```

---

## Field types

All leaf fields require at minimum `type` and `label`.

### `text`

Single-line text input.

```json
"heading": { "type": "text", "label": "Heading" }
```

| Option  | Type      | Description                                   |
| ------- | --------- | --------------------------------------------- |
| `label` | string    | Field label shown in the admin                |
| `size`  | `"small"` | Renders a narrower input; omit for full width |

---

### `textarea`

Multi-line plain text input.

```json
"body": { "type": "textarea", "label": "Body Text" }
```

| Option  | Type   | Description |
| ------- | ------ | ----------- |
| `label` | string | Field label |

---

### `richtext`

WYSIWYG editor (bold, italic, lists, links). Saves as HTML.

```json
"intro": { "type": "richtext", "label": "Intro Text" }
```

| Option  | Type   | Description |
| ------- | ------ | ----------- |
| `label` | string | Field label |

---

### `image`

Image upload via Cloudinary. Saves the public URL string.

```json
"photo": { "type": "image", "label": "Photo" }
```

| Option  | Type   | Description |
| ------- | ------ | ----------- |
| `label` | string | Field label |

Requires `CLOUDINARY_CLOUD_NAME` and `CLOUDINARY_UPLOAD_PRESET` to be set.

---

### `select`

Dropdown with a fixed list of options.

```json
"layout": { "type": "select", "label": "Layout", "options": ["default", "centered", "sidebar"] }
```

| Option    | Type     | Description                      |
| --------- | -------- | -------------------------------- |
| `label`   | string   | Field label                      |
| `options` | string[] | Allowed values (displayed as-is) |

---

### `boolean`

Toggle switch. Saves `true` or `false`.

```json
"showPhone": { "type": "boolean", "label": "Show phone number" }
```

| Option  | Type   | Description |
| ------- | ------ | ----------- |
| `label` | string | Field label |

---

### `number`

Numeric input. Saves a number value.

```json
"sortOrder": { "type": "number", "label": "Sort Order" }
```

| Option  | Type   | Description |
| ------- | ------ | ----------- |
| `label` | string | Field label |

---

### `color`

Colour picker. Saves a hex string (e.g. `#ff6600`).

```json
"accentColor": { "type": "color", "label": "Accent Colour" }
```

| Option  | Type   | Description |
| ------- | ------ | ----------- |
| `label` | string | Field label |

---

### `date`

Date picker. Saves an ISO date string (`YYYY-MM-DD`).

```json
"launchDate": { "type": "date", "label": "Launch Date" }
```

| Option  | Type   | Description |
| ------- | ------ | ----------- |
| `label` | string | Field label |

---

## Structural types

### Object (nested group)

A plain JSON object creates a collapsible fieldset. No special key needed.

```json
"cta": {
  "label": { "type": "text", "label": "Button Label" },
  "url":   { "type": "text", "label": "Button URL" }
}
```

Objects can be nested to any depth.

---

### Array

A repeating list of items, each built from the same `_item` schema.

```json
"slides": {
  "_type": "array",
  "min": 1,
  "max": 6,
  "allow_reorder": true,
  "_item": {
    "heading": { "type": "text",     "label": "Heading" },
    "body":    { "type": "textarea", "label": "Body" }
  }
}
```

| Option           | Type    | Default | Description                                             |
| ---------------- | ------- | ------- | ------------------------------------------------------- |
| `_item`          | object  | —       | Schema for each item (required)                         |
| `min`            | number  | —       | Remove buttons disabled when count ≤ min                |
| `max`            | number  | —       | Add button disabled when count ≥ max                    |
| `allow_add`      | boolean | `true`  | Set to `false` to hide the Add button entirely          |
| `allow_remove`   | boolean | `true`  | Set to `false` to hide Remove buttons on all items      |
| `allow_reorder`  | boolean | `false` | Set to `true` to show ↑ ↓ buttons on each item          |
| `add_to_top`     | boolean | `false` | Set to `true` to prepend new items instead of appending |
| `_single_field`  | boolean | `false` | Each item holds a scalar value directly rather than an object with named keys. Use this when `_item` is a single field type (e.g. an image gallery where every item is just a URL string). |

`_item` can itself contain objects and nested arrays.

**Single-field array example** — a gallery where each item is just an image URL:

```json
"gallery": {
  "_type": "array",
  "_single_field": true,
  "allow_reorder": true,
  "_item": { "type": "image", "label": "Image" }
}
```

---

## Collections

Collections are defined in the top-level `_collections` array and appear in the admin sidebar.

### Folder collection

Manages multiple items stored as individual JSON files in a folder.

```json
"_collections": [
  {
    "label": "Blog Posts",
    "name": "blog",
    "label_singular": "Blog Post",
    "folder": "src/posts",
    "extension": "json",
    "create": true,
    "delete": true,
    "slug_field": "title",
    "preview_field": "title",
    "fields": {
      "title":   { "type": "text",     "label": "Title" },
      "date":    { "type": "date",     "label": "Publish Date" },
      "body":    { "type": "richtext", "label": "Body" }
    }
  }
]
```

| Option           | Type    | Description                                                                 |
| ---------------- | ------- | --------------------------------------------------------------------------- |
| `label`          | string  | Collection name shown in sidebar                                            |
| `name`           | string  | Internal identifier (used as Eleventy collection name)                      |
| `label_singular` | string  | Label for a single item (used in "New …" button)                            |
| `folder`         | string  | Path to the folder relative to project root                                 |
| `extension`      | string  | File extension for items (e.g. `"json"`)                                    |
| `create`         | boolean | Show "New item" button                                                       |
| `delete`         | boolean | Show "Delete" button on items                                                |
| `slug_field`     | string  | Field name whose value is slugified to form the filename                    |
| `preview_field`  | string  | Field name shown as the item title in the collection list                   |
| `fields`         | object  | Schema for each item (same field-type syntax as pages)                      |

---

## Template access

Content is accessed in Nunjucks templates via `cms.<page>.<path>`.

For array items, use `loop.index0` for the `data-cms-path` index:

```njk
{% for section in cms.home.sections %}
  <h2 data-cms-path="cms.home.sections.{{ loop.index0 }}.heading">
    {{ section.heading }}
  </h2>
{% endfor %}
```

For background images use `data-cms-bg-path` instead of `data-cms-path`:

```njk
<div data-cms-bg-path="cms.home.hero.image"
     style="background-image: url('{{ cms.home.hero.image }}')">
</div>
```
