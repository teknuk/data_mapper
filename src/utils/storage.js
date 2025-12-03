/** -------------------------------------------------------------
 *  INTERNAL HELPERS
 * --------------------------------------------------------------*/

// Get entire `chrome.storage.local` payload
function getAllStorage() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (data) => resolve(data || {}));
  });
}

// Atomic setter
function setStorage(obj) {
  return new Promise((resolve) => {
    chrome.storage.local.set(obj, () => resolve());
  });
}


/** -------------------------------------------------------------
 *  PREFERENCES API
 * --------------------------------------------------------------*/

export async function loadPrefs() {
  const store = await getAllStorage();
  return store.preferences || {};
}

export async function savePref(key, value) {
  const prefs = await loadPrefs();
  prefs[key] = value;
  await setStorage({ preferences: prefs });
}

export async function savePrefs(prefs) {
  await setStorage({ preferences: prefs });
}


/** -------------------------------------------------------------
 *  TEMPLATES API
 * --------------------------------------------------------------*/

export async function getTemplates() {
  const store = await getAllStorage();
  return store.templates || {};
}

export async function getTemplate(name) {
  const store = await getAllStorage();
  const templates = store.templates || {};
  return templates[name] || {};
}

export async function saveTemplate(name, templateData) {
  const templates = await getTemplates();
  templates[name] = templateData;
  await setStorage({ templates });
}

export async function saveTemplates(allTemplates) {
  await setStorage({ templates: allTemplates });
}


/** -------------------------------------------------------------
 *  IMPORT / EXPORT
 * --------------------------------------------------------------*/

export async function importTemplates(json, { mode = "merge" } = {}) {
  const incoming = JSON.parse(json);            // { templateName: {...} }
  const current = await getTemplates();         // existing templates

  let result;

  if (mode === "replace") {
    result = incoming;
  } else {
    // merge mode
    result = { ...current };
    for (const [tName, fields] of Object.entries(incoming)) {
      result[tName] = { ...(result[tName] || {}), ...fields };
    }
  }

  await saveTemplates(result);
  return result;
}

export async function exportTemplates() {
  const all = await getTemplates();
  return JSON.stringify(all, null, 2);
}
