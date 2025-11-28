<script>
  import { onMount } from 'svelte';
  import { loadTemplates, saveTemplate, importTemplates, exportTemplates } from '../utils/storage.js';
  import { buildFilename, toJsonBlob, toCsvBlob, toXmlBlob } from '../utils/exporters.js';

  let templates = {};
  let currentTemplateName = 'default';
  let newTemplateName = '';
  let selectionActive = false;
  let tooltipOpen = false;
  let selectorType = 'css';
  let extractionResult = null; // { templateName, data, url, timestamp }
  let toastMessage = '';
  let toastTimeout = null;

  onMount(async () => {
    templates = await loadTemplates();
    if (!templates[currentTemplateName]) {
      templates[currentTemplateName] = {};
      await saveTemplate(currentTemplateName, templates[currentTemplateName]);
    }
    // Listen for content updates
    chrome.runtime.onMessage.addListener((message) => {
      if (message?.type === 'DATAMAPPER_EXTRACTION_RESULT') {
        extractionResult = message;
      }
      if (message?.type === 'DATAMAPPER_FIELD_ADDED') {
        const { templateName, fieldName, mapping } = message;
        if (!templates[templateName]) templates[templateName] = {};
        templates = {
          ...templates,
          [templateName]: {
            ...templates[templateName],
            [fieldName]: mapping
          }
        };
        showToast(`Field "${fieldName}" added to template "${templateName}".`);
      }
    });
  });

  function showToast(msg) {
    toastMessage = msg;
    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => (toastMessage = ''), 2500);
  }

  function templateNames() {
    return Object.keys(templates);
  }

  function selectTemplate(name) {
    currentTemplateName = name;
    notifyContentTemplate();
  }

  function notifyContentTemplate() {
    chrome.runtime.sendMessage({
      target: 'content-script',
      type: 'DATAMAPPER_SET_TEMPLATE',
      templateName: currentTemplateName
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
    currentTemplateName = name;
    newTemplateName = '';
    notifyContentTemplate();
  }

  function selectionBackgroundClass() {
    if (selectionActive) {
      if (tooltipOpen) return 'bg-orange-500';
      return 'bg-rose-500';
    }
    return 'bg-sky-500';
  }

  async function toggleSelection() {
    selectionActive = !selectionActive;
    chrome.runtime.sendMessage({
      target: 'content-script',
      type: 'DATAMAPPER_TOGGLE_SELECTION',
      active: selectionActive,
      templateName: currentTemplateName,
      selectorType
    });
  }

  async function extractData() {
    extractionResult = null;
    chrome.runtime.sendMessage({
      target: 'content-script',
      type: 'DATAMAPPER_EXTRACT',
      templateName: currentTemplateName
    });
  }

  function currentFields() {
    return templates[currentTemplateName] || {};
  }

  async function download(type) {
    if (!extractionResult) return;
    const { templateName, data, url } = extractionResult;
    let blob;
    let ext;
    if (type === 'json') {
      blob = toJsonBlob(templateName, url, data);
      ext = 'json';
    } else if (type === 'csv') {
      blob = toCsvBlob(data);
      ext = 'csv';
    } else if (type === 'xml') {
      blob = toXmlBlob(templateName, url, data);
      ext = 'xml';
    }
    const filename = buildFilename(templateName, ext);
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(urlObj);
  }

  async function handleExportTemplates() {
    const json = await exportTemplates();
    const blob = new Blob([json], { type: 'application/json' });
    const filename = buildFilename('templates', 'json');
    const urlObj = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = urlObj;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(urlObj);
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
</script>

<div class="w-[420px] h-[600px] bg-slate-900 text-slate-100 flex flex-col">
  <!-- Header -->
  <header class="px-4 py-3 border-b border-slate-800 flex items-center justify-between">
    <div>
      <div class="text-xs uppercase tracking-wide text-slate-400">DataMapper</div>
      <div class="text-sm font-semibold">
        Template:
        <span class="text-emerald-400">{currentTemplateName}</span>
      </div>
    </div>
    <button
      class="text-xs px-2 py-1 rounded-full border border-slate-700 hover:bg-slate-800"
      on:click={notifyContentTemplate}
      title="Resend template to content script"
    >
      Sync
    </button>
  </header>

  <div class="flex flex-1 overflow-hidden">
    <!-- Left pane: templates & controls -->
    <div class="w-40 border-r border-slate-800 flex flex-col text-xs">
      <div class="p-2 border-b border-slate-800">
        <div class="text-[10px] uppercase tracking-wide text-slate-500 mb-1">Templates</div>
        <div class="space-y-1 max-h-40 overflow-auto pr-1">
          {#each templateNames() as t}
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
        <div class="mt-2 flex gap-1">
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
    </div>

    <!-- Right pane: fields & extraction -->
    <div class="flex-1 flex flex-col text-xs">
      <div class="p-3 border-b border-slate-800 flex items-center justify-between">
        <div>
          <div class="text-[10px] uppercase text-slate-500 tracking-wide mb-1">Mapped fields</div>
          <div class="text-[11px] text-slate-400">
            Click “Start selecting” then click elements on the page to map fields.
          </div>
        </div>
        <button
          class="ml-2 px-3 py-1 rounded-md bg-emerald-500 text-slate-900 text-[11px] font-semibold"
          on:click={extractData}
        >
          Extract
        </button>
      </div>

      <div class="flex-1 overflow-auto p-3 space-y-2">
        {#if Object.keys(currentFields()).length === 0}
          <div class="text-[11px] text-slate-500 italic">
            No fields mapped yet for <span class="text-emerald-400">{currentTemplateName}</span>.
          </div>
        {:else}
          <div class="space-y-2">
            {#each Object.entries(currentFields()) as [name, mapping]}
              <div class="border border-slate-800 rounded-md p-2">
                <div class="flex justify-between items-center mb-1">
                  <div class="font-semibold text-[11px]">{name}</div>
                  <span
                    class="px-1.5 py-0.5 text-[10px] rounded-full bg-slate-800 border border-slate-700 uppercase tracking-wide"
                  >
                    {mapping.type}
                  </span>
                </div>
                <div class="text-[11px] text-slate-400 break-all">
                  {mapping.selector}
                </div>
              </div>
            {/each}
          </div>
        {/if}
      </div>

      <!-- Extraction result -->
      <div class="border-t border-slate-800 p-3 space-y-2">
        <div class="flex items-center justify-between">
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
