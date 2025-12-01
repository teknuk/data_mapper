# Teknuk DataMapper – Visual Web Data Mapping & Extraction (Chrome Extension)

**Teknuk DataMapper** is a Chrome Extension (Manifest V3) that lets you visually select elements on any webpage, map them to named fields, and extract structured data. It’s built as a **modular extension** with a **Svelte + TailwindCSS drawer-style popup**, a **content script** for selection and extraction, and utility modules for exporting data and computing selectors.

You can:

- 🔍 **Visually select elements** on any page
- 🏷️ Assign **field names** and choose **CSS** or **XPath** selectors
- 📦 Save field mappings as **templates**
- 📤 Extract structured data (supports **multiple matches** per selector → arrays)
- 💾 Download results as **JSON, YAML, TOON, CSV, or XML**
- 📁 Import/export templates as JSON (merge or replace)

---

## ✨ Features

### Element Selection & Mapping

- Toggle **Selection Mode** from the popup.
- Hover → element gets a **solid border + semi-transparent overlay**.
- Click → a **tooltip** appears near the element:
  - Enter **field name**
  - Choose **selector type**: `css` or `xpath`
- Save → mapping is persisted in `chrome.storage.local` under the schema:

```json
{
  "templateName": {
    "fieldName": {
      "type": "css" | "xpath",
      "selector": "..."
    }
  }
}
```

### Templates

* Organize mappings into **templates**, e.g. `product-page`, `blog-listing`.
* Switch current template from the drawer.
* New templates auto-saved to `chrome.storage.local`.
* Import & export all templates as JSON.

  * **Merge** mode (default) – merges with existing templates.
  * **Replace** mode – overwrites all existing templates.
* Auto-overwrite template names with a **toast notification**.

### Data Extraction

* Click **Extract** in the popup.
* For each field:

  * If `css`, uses `querySelectorAll`.
  * If `xpath`, uses `document.evaluate`.
* All matches are captured → `fieldName` always maps to an **array** of values.
* Extraction result payload:

```json
{
  "templateName": "currentTemplate",
  "url": "https://example.com",
  "timestamp": 1700000000000,
  "data": {
    "title": ["Product A", "Product B"],
    "price": ["10", "20"]
  }
}
```

### Exports

From the drawer you can download extraction results as:

* **JSON**
* **YAML**
* **TOON**
* **CSV**
* **XML**

Filenames follow:

```text
{templateName}-{YYYYMMDD-HHMMSS}.{ext}
```

e.g.:

```text
product-page-20251126-142233.json
```

---

## 🧱 Architecture

### Core Files

* `manifest.json`
  Manifest V3 configuration (permissions, background worker, popup, content scripts).

* `service-worker.js`
  Background service worker:

  * Forwards messages from popup → content script.
  * Relays extraction results to the popup.

* `content-script.js`
  Injected into all pages:

  * Handles selection mode UX (highlighting, tooltip).
  * Stores mappings into `chrome.storage.local`.
  * Performs data extraction given a template.

* `popup.html` / `popup.js`
  Built Svelte app:

  * Drawer-style UI for templates, fields, selection toggle, extraction, and exports.

### Svelte + Tailwind Popup

Source under `src/popup/`:

* `App.svelte` – main drawer UI.
* `main.js` – bootstraps Svelte.
* `index.html` – dev entry for Vite.
* `src/styles.css` – Tailwind entry.

### Utilities (modular)

Located in `src/utils/`:

* `highlight.js` – selection mode overlays and tooltip.
* `xpath.js` – XPath generation from DOM elements.
* `exporters.js` – JSON / YAML / TOON / CSV / XML export + filename helper.
* `storage.js` – load/save/import/export templates.

---

## 🧪 Tests

Two levels of tests are included:

### 1. Unit Tests (`tests/unit/`)

* `exporters.test.js`

  * Validates filename format.
  * Ensures CSV generation is correct (headers + rows).
* `xpath.test.js`

  * Basic XPath generation checks (e.g. ID-based XPath).

Run via:

```bash
npm test
```

(Using `vitest`.)

### 2. Integration / System Tests (`tests/e2e/`)

* `datamapper.e2e.test.js` (skeleton)
  Uses Puppeteer (or similar) to:

  * Load the extension.
  * Open a target page.
  * (Extend to) simulate mapping fields and extracting data.

Run via:

```bash
npm run test:e2e
```

You’ll need to adjust the E2E script to match your environment and CI.

---

## 🚀 Getting Started

### 1. Install Dependencies

```bash
npm install
```

### 2. Develop the Popup (Svelte + Tailwind)

```bash
npm run dev
```

* Open the dev server URL (from Vite) to iterate on the drawer UI.
* Tailwind is configured via `tailwind.config.cjs` and `postcss.config.cjs`.

### 3. Build Extension Assets

```bash
npm run build
```

This:

* Builds the Svelte popup via Vite.
* Copies the compiled popup bundle to:

  * `popup.html`
  * `popup.js`

Make sure your root folder contains at least:

* `manifest.json`
* `service-worker.js`
* `content-script.js`
* `popup.html`
* `popup.js`

### 4. Load into Chrome

1. Open `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select the **project root** folder.

You should now see **Teknuk DataMapper** in the toolbar.

---

## 🧭 Usage

1. Open a webpage you want to scrape.
2. Click the **Teknuk DataMapper** icon to open the popup (drawer).
3. In the drawer:

   * Choose or create a **Template**.
   * Set default **selector type** (CSS/XPath).
4. Click **Start selecting**.
5. On the page:

   * Hover over elements to see the highlight.
   * Click an element → tooltip appears.
   * Enter **field name**, choose **CSS/XPath**, click **Save**.
6. Back in the drawer:

   * See mapped fields with selector details.
   * Click **Extract** to collect data from the current page.
7. Download results as **JSON**, **YAML**, **TOON**, **CSV**, or **XML**.

---

## 🧩 Template Management

* **Creating templates**
  Enter a name in the “New template” input and click `+`.

* **Overwriting templates**
  Creating a template with an existing name overwrites the mapping.

  * A small toast appears to inform you.

* **Export templates**
  Click **Export templates** to download a JSON file of all templates.

* **Import templates (merge)**
  Choose a JSON file in the **Import (merge)** input:

  * New templates are added.
  * Existing templates with the same name are merged (fields overwrite by name).

* **Import templates (replace)**
  Choose a JSON file in the **Import (replace)** input:

  * All existing templates are replaced by the imported ones.

---

## 🧱 Tech Stack

* **Extension platform:** Chrome Extension, Manifest V3
* **UI:** Svelte + TailwindCSS
* **Background:** MV3 service worker
* **Content script:** vanilla JS + DOM APIs
* **Storage:** `chrome.storage.local`
* **Build:** Vite + Svelte plugin
* **Testing:** Vitest (unit), Puppeteer/Node (E2E skeleton)
