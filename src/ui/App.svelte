<script>
  import { onMount } from 'svelte';
  import { loadTemplates, saveTemplate, importTemplates, exportTemplates } from '../utils/storage.js';
  import { buildFilename, toJsonBlob, toYamlBlob, toToonBlob, toCsvBlob, toXmlBlob } from '../utils/exporters.js';

  let templates = {};
  let currentTemplateName = 'default';
  let currentFields = {};
  let newTemplateName = '';
  let selectionActive = false;
  let tooltipOpen = false;
  let selectorType = 'css';
  let extractionResult = null; // { templateName, data, url, timestamp }
  let toastMessage = '';
  let toastTimeout = null;
  let featureTemplateIO = false;
  let featureTemplateSync = false;
  let revealed = false;

  onMount(async () => {
    templates = await loadTemplates();
    console.log("=== onMount => loadTemplates()", templates)
    if (!templates[currentTemplateName]) {
      templates[currentTemplateName] = {};
      await saveTemplate(currentTemplateName, templates[currentTemplateName]);
    }
    selectTemplate(currentTemplateName);
    // Listen for content updates
    chrome.runtime.onMessage.addListener((message) => {
      if (!message || !message.type) return;

      switch (message.type) {
        case 'TN_DATAMAPPER_FIELD_ADDED':
          handleFieldAdded(message);
          break;

        case 'TN_DATAMAPPER_FIELD_UPDATED':
          handleFieldUpdated(message);
          break;

        case 'TN_DATAMAPPER_EXTRACTION_RESULT':
          handleExtractionResult(message);
          break;

        case 'TN_DATAMAPPER_REVEAL_RESULT':
          handleRevealResult(message);
          break;

        default:
          break;
      }
    });
  });

  function showToast(toastMessage) {
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => (toastMessage = ''), 2500);
  }

  async function handleFieldAdded({ templateName, fieldName, mapping }) {
    if (!templates[templateName]) templates[templateName] = {};
    templates = {
      ...templates,
      [templateName]: {
        ...templates[templateName],
        [fieldName]: mapping
      }
    };
    currentFields = templates[currentTemplateName];
    showToast(`Field "${fieldName}" added to template "${templateName}".`);
  }

  function handleFieldUpdated({ templateName, fieldName, originalName, mapping }) {
    if (!templates[templateName]) templates[templateName] = {};
    const updated = { ...templates[templateName] };
    if (originalName && originalName !== fieldName) { // rename if needed
      delete updated[originalName];
    }
    updated[fieldName] = mapping; // apply updated mapping
    templates = { // update templates hash
      ...templates,
      [templateName]: updated
    };
    if (templateName === currentTemplateName) { // update current UI fields if this template is visible
      currentFields = updated;
    }
    chrome.runtime.sendMessage({ target: 'content-script', type: 'TN_DATAMAPPER_TOGGLE_SELECTION', mode: 'INACTIVE' });
    if (originalName && originalName !== fieldName) {
      showToast(`Field "${originalName}" renamed to "${fieldName}".`);
    } else {
      showToast(`Field "${fieldName}" updated.`);
    }
  }

  async function removeField(fieldName) {
    const updated = { ...templates[currentTemplateName] };
    delete updated[fieldName];
    templates = {
      ...templates,
      [currentTemplateName]: updated
    };
    await saveTemplate(currentTemplateName, templates[currentTemplateName]);
    currentFields = templates[currentTemplateName];
    showToast(`Field "${fieldName}" removed`);
  }

  // function templateNames() {
  //   return Object.keys(templates);
  // }

  function selectTemplate(name) {
    currentTemplateName = name;
    currentFields = templates[currentTemplateName];
    notifyContentTemplate();
  }

  function notifyContentTemplate() {
    chrome.runtime.sendMessage({
      target: 'content-script',
      type: 'TN_DATAMAPPER_SET_TEMPLATE',
      templateName: currentTemplateName
    });
  }

  function togglePanelSide(side) {
    chrome.runtime.sendMessage({
      target: 'content-script',
      type: 'TN_DATAMAPPER_SET_PANEL_SIDE',
      side
    });
  }

  async function createTemplate() {
    const name = newTemplateName.trim();
    if (!name) return;
    if (templates[name]) {
      templates = { ...templates };
      showToast(`Template "${name}" already exists. Overwriting.`);
    }
    templates[name] = {};
    await saveTemplate(name, templates[name]);
    newTemplateName = '';
    selectTemplate(name);
    // currentTemplateName = name;
    // notifyContentTemplate();
  }

  function selectionBackgroundClass() {
    if (selectionActive) {
      if (tooltipOpen) return 'bg-orange-500';
      return 'bg-rose-500';
    }
    return 'bg-sky-500';
  }

  function reselectField(fieldName, selectorType) {
    if (selectionActive) {
      selectionActive = false;
      chrome.runtime.sendMessage({ target: 'content-script', type: 'TN_DATAMAPPER_TOGGLE_SELECTION', mode: 'INACTIVE' });
    }
    setTimeout(() => {
      chrome.runtime.sendMessage({
        target: 'content-script',
        type: 'TN_DATAMAPPER_TOGGLE_SELECTION',
        mode: 'RESELECT',
        templateName: currentTemplateName,
        fieldName,
        selectorType
      });
    }, 200);
  }

  async function toggleSelection() {
    selectionActive = !selectionActive;
    chrome.runtime.sendMessage({
      target: 'content-script',
      type: 'TN_DATAMAPPER_TOGGLE_SELECTION',
      mode: selectionActive ? 'ACTIVE' : 'INACTIVE',
      templateName: currentTemplateName,
      selectorType
    });
  }

  async function revealFields() {
    chrome.runtime.sendMessage({
      target: 'content-script',
      type: 'TN_DATAMAPPER_REVEAL',
      templateName: currentTemplateName
    });
  }

  function handleRevealResult({data, revealedMessage}) {
    if ( Object.keys(data).length === 0 ) {
      revealed = false;
      return;
    }
    revealed = true;
    for (const key in currentFields) {
      currentFields[key].value = data[key];
    }
    showToast(revealedMessage);
  }

  function handleExtractionResult(message) {
    extractionResult = message;
    // console.log('=== handleExtractionResult', extractionResult)
    for (const key in currentFields) {
      currentFields[key].value = extractionResult.data[key];
    }
    showToast(`Extracted ${Object.keys(extractionResult.data || {}).length} fields from ${extractionResult.url}`);
  }

  async function extractData() {
    extractionResult = null;
    // console.log('=== extractData[currentTemplateName]', currentTemplateName)
    chrome.runtime.sendMessage({
      target: 'content-script',
      type: 'TN_DATAMAPPER_EXTRACT',
      templateName: currentTemplateName
    });
  }

  // function currentFields() {
  //   console.log("=== currentFields => templates[currentTemplateName]", currentTemplateName, templates[currentTemplateName]);
  //   return templates[currentTemplateName] || {};
  // }

  async function download(type) {
    console.log("=== download(type) => ", type, extractionResult);
    if (!extractionResult) return;
    const { templateName, data, url } = extractionResult;
    let blob;
    let ext;
    if (type === 'json') {
      blob = toJsonBlob(templateName, url, data);
      ext = 'json';
    } else if (type === 'yaml') {
      blob = toYamlBlob(templateName, url, data);
      ext = 'yml';
    } else if (type === 'toon') {
      blob = toToonBlob(data);
      ext = 'toon';
    } else if (type === 'csv') {
      blob = toCsvBlob(data);
      ext = 'csv';
    } else if (type === 'xml') {
      blob = toXmlBlob(templateName, url, data);
      ext = 'xml';
    }
    const filename = buildFilename(templateName, ext);
    const urlObj = URL.createObjectURL(blob);
    chrome.runtime.sendMessage({ type: "TN_DATAMAPPER_DOWNLOAD", url: urlObj, filename });
    // const a = document.createElement('a');
    // a.href = urlObj;
    // a.download = filename;
    // a.click();
    // URL.revokeObjectURL(urlObj);
  }

  async function handleExportTemplates() {
    const json = await exportTemplates();
    const blob = new Blob([json], { type: 'application/json' });
    const filename = buildFilename('templates', 'json');
    const urlObj = URL.createObjectURL(blob);
    chrome.runtime.sendMessage({ type: "TN_DATAMAPPER_DOWNLOAD", url: urlObj, filename });
    // const a = document.createElement('a');
    // a.href = urlObj;
    // a.download = filename;
    // a.click();
    // URL.revokeObjectURL(urlObj);
  }

  async function handleImportTemplates(event, mode = 'merge') {
    const file = event.target.files[0];
    if (!file) return;
    const text = await file.text();
    const result = await importTemplates(text, { mode });
    templates = result;
    showToast(mode === 'replace' ? 'Templates replaced.' : 'Templates merged.');
    event.target.value = '';
  }

  function shortenSelector(sel, max = 60) {
    return sel.length > max ? sel.slice(0, max) + `… [${sel.length}]`  : sel;
  }
</script>

<div class="w-[420px] h-[800px] bg-slate-900 text-slate-100 flex flex-col">
  <!-- Header -->
  <header class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
    <div>
      <div class="text-xs uppercase tracking-wide text-slate-400">Teknuk DataMapper</div>
      <div class="text-sm font-semibold">
        Template:
        <span class="text-emerald-400">{currentTemplateName}</span>
      </div>
    </div>
    <div class="flex items-center gap-2">
      <!-- left arrow -->
      <button
        class="px-2 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
        on:click={() => togglePanelSide('left')}
        title="Move panel to left side"
      >⬅</button>

      <!-- right arrow -->
      <button
        class="px-2 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
        on:click={() => togglePanelSide('right')}
        title="Move panel to right side"
      >➡</button>
    </div>
    {#if featureTemplateSync }
      <button
        class="text-xs px-2 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
        on:click={notifyContentTemplate}
        title="Resend template to content script"
      >
        Sync
      </button>
    {/if}
  </header>

  <div class="flex flex-1 overflow-hidden">
    <!-- Left pane: templates & controls -->
    <div class="w-40 border-r border-slate-800 flex flex-col text-xs">
      <div class="p-2 border-b border-slate-800">
        <div class="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Templates</div>
        <div class="space-y-1 max-h-40 overflow-auto pr-1">
          {#each Object.keys(templates) as t}
            <button
              class="w-full text-left px-2 py-1 rounded-md hover:bg-slate-800 {t === currentTemplateName
                ? 'bg-slate-800 text-emerald-400'
                : ''}"
              on:click={() => selectTemplate(t)}
            >
              {t}
            </button>
          {/each}
        </div>
        <div class="mt-2 flex flex-col gap-1">
          <input
            class="flex-1 bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[11px]"
            placeholder="New template"
            bind:value={newTemplateName}
            on:keydown={(e) => e.key === 'Enter' && createTemplate()}
          />
          <button
            class="px-2 py-0.5 text-[11px] rounded bg-emerald-500 text-slate-900 font-semibold"
            on:click={createTemplate}
          >
            +
          </button>
        </div>
      </div>

      <div class="p-2 border-b border-slate-800 space-y-2">
        <div>
          <div class="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Selector type</div>
          <select
            class="w-full bg-slate-950 border border-slate-700 rounded px-1 py-0.5 text-[11px]"
            bind:value={selectorType}
          >
            <option value="css">CSS</option>
            <option value="xpath">XPath</option>
          </select>
        </div>

        <div>
          <div class="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Selection</div>
          <button
            class="w-full px-2 py-1 rounded-md text-[11px] font-semibold text-slate-900 {selectionBackgroundClass()}"
            on:click={toggleSelection}
          >
            {selectionActive ? 'Stop selecting' : 'Start selecting'}
          </button>
        </div>
      </div>

      {#if featureTemplateIO }
        <div class="p-2 border-b border-slate-800 space-y-2">
          <div class="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Templates I/O</div>
          <button
            class="w-full mb-1 px-2 py-1 rounded-md text-[11px] border border-slate-700 hover:bg-slate-800"
            on:click={handleExportTemplates}
          >
            Export templates
          </button>

          <label class="block mb-1 text-[11px]">
            <span class="block mb-0.5 text-slate-400">Import (merge)</span>
            <input
              type="file"
              accept="application/json"
              class="w-full text-[11px]"
              on:change={(e) => handleImportTemplates(e, 'merge')}
            />
          </label>

          <label class="block text-[11px]">
            <span class="block mb-0.5 text-slate-400">Import (replace)</span>
            <input
              type="file"
              accept="application/json"
              class="w-full text-[11px]"
              on:change={(e) => handleImportTemplates(e, 'replace')}
            />
          </label>
        </div>
      {/if}
    </div>

    <!-- Right pane: fields & extraction -->
    <div class="flex-1 flex flex-col w-64 text-xs">
      <div class="flex flex-col p-3 border-b border-slate-800 items-center justify-between">
        <div>
          <div class="text-[10px] uppercase text-slate-500 tracking-wide mb-1">Mapped fields</div>
          <div class="text-[11px] text-slate-400">
            Click “Start selecting” then click elements on the page to map fields.
          </div>
        </div>
        <div class="flex gap-4">
          <button class="px-3 py-1 rounded-md bg-emerald-500 text-slate-900 text-[11px] font-semibold" on:click={revealFields}>
            { revealed ? "Hide" : "Reveal" }
          </button>
          <button class="px-3 py-1 rounded-md bg-emerald-500 text-slate-900 text-[11px] font-semibold" on:click={extractData}>
            Extract
          </button>
        </div>
      </div>

      <div class="flex-1 overflow-auto p-3 space-y-2">
        {#if Object.keys(currentFields).length === 0}
          <div class="text-[11px] text-slate-500 italic">
            No fields mapped yet for <span class="text-emerald-400">{currentTemplateName}</span>.
          </div>
        {:else}
          <div class="space-y-2">
            {#each Object.entries(currentFields) as [name, mapping]}
              <div class="border border-slate-800 rounded-md p-2">
                <div class="flex justify-between items-center mb-1">
                  <div class="font-semibold text-[11px]">{name}</div>
                  <span
                    class="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 border border-slate-700 uppercase tracking-wide"
                  >
                    {mapping.type}
                  </span>
                </div>
                <div class="text-[11px] text-slate-400 break-all" title={mapping.selector}>
                  {shortenSelector(mapping.selector)}
                </div>
                <div>{shortenSelector(mapping.value ?? "(empty)", 120)}</div>
                <div class="flex gap-3 mt-1">
                  <button class="px-1.5 py-0.5 rounded text-[10px] text-orange-400 hover:text-orange-300 border border-slate-500"
                    on:click={() => reselectField(name, mapping.type)}
                    >
                    RESELECT
                  </button>
                  <button class="px-1.5 py-0.5 rounded text-[10px] text-red-400 hover:text-red-300 border border-slate-500" on:click={() => removeField(name)}>
                    REMOVE
                  </button>
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Extraction result -->
      <div class="border-t border-slate-800 p-3 space-y-2">
        <div class="flex flex-col items-center justify-between">
          <div>
            <div class="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Extraction</div>
            {#if extractionResult}
              <div class="text-[11px] text-slate-400">
                {Object.keys(extractionResult.data || {}).length} fields from
                <span class="text-sky-400 ml-1"> {extractionResult.url} </span>
              </div>
            {:else}
              <div class="text-[11px] text-slate-500">No extraction yet. Click “Extract”.</div>
            {/if}
          </div>
          <div class="flex gap-1">
            <button
              class="px-2 py-1 text-[11px] rounded-md border border-slate-700 hover:bg-slate-800"
              disabled={!extractionResult}
              on:click={() => download('json')}
            >
              JSON
            </button>
            <button
              class="px-2 py-1 text-[11px] rounded-md border border-slate-700 hover:bg-slate-800"
              disabled={!extractionResult}
              on:click={() => download('yaml')}
            >
              YAML
            </button>
            <button
              class="px-2 py-1 text-[11px] rounded-md border border-slate-700 hover:bg-slate-800"
              disabled={!extractionResult}
              on:click={() => download('toon')}
            >
              TOON
            </button>
            <button
              class="px-2 py-1 text-[11px] rounded-md border border-slate-700 hover:bg-slate-800"
              disabled={!extractionResult}
              on:click={() => download('csv')}
            >
              CSV
            </button>
            <button
              class="px-2 py-1 text-[11px] rounded-md border border-slate-700 hover:bg-slate-800"
              disabled={!extractionResult}
              on:click={() => download('xml')}
            >
              XML
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>

  {#if toastMessage}
    <div class="absolute bottom-4 left-1/2 -translate-x-1/2 bg-slate-800 text-slate-100 text-xs px-3 py-1.5 rounded-full border border-slate-700 shadow-lg">
      {toastMessage}
    </div>
  {/if}
</div>
