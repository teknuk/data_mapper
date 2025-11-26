# PageMapper (MVP)

PageMapper is a Chrome Extension (Manifest V3) that will allow users to visually map elements on a webpage to named data fields and extract JSON.

1. **Install dependencies**

```bash
npm install
```

2. **Develop the popup UI**

```bash
npm run dev
```

Open the dev server URL to iterate on the Svelte drawer UI.

3. **Build the popup & copy files**

```bash
npm run build
```

This runs Vite, then copies the built popup to `popup.html` + `popup.js` at the root.

4. **Ensure root files exist**

  At the project root you should now have:

  * `manifest.json`
  * `service-worker.js`
  * `content-script.js` (plus any bundling you did)
  * `popup.html`
  * `popup.js`

5. **Load into Chrome**

  * Go to `chrome://extensions`
  * Enable **Developer mode**
  * Click **Load unpacked**
  * Select the `datamapper/` folder

6. **Use the extension**

  * Open any webpage
  * Click the **DataMapper** icon (Chrome toolbar)
  * In the drawer:

    * Choose / create a **template**
    * Pick **CSS/XPath** type
    * Click **Start selecting**
    * Hover and click elements on the page → fill tooltip **field name** + type, click **Save**
    * Click **Extract**
    * Download **JSON**, **CSV**, or **XML** — filenames are like `TemplateName-YYYYMMDD-HHMMSS.json`.

Templates are stored in `chrome.storage.local` in exactly the shape you specified:

```json
{
  "templateName": {
    "fieldName": {
      "type": "css",
      "selector": "#some > selector"
    }
  }
}
```
