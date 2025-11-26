export async function loadTemplates() {
  return new Promise((resolve) => {
    chrome.storage.local.get(null, (data) => {
      resolve(data || {});
    });
  });
}

export async function saveTemplate(templateName, templateData) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ [templateName]: templateData }, () => resolve());
  });
}

export async function importTemplates(json, { mode = 'merge' } = {}) {
  const incoming = JSON.parse(json); // { templateName: { fieldName: {...} } }
  const current = await loadTemplates();

  let result;
  if (mode === 'replace') {
    result = incoming;
  } else {
    result = { ...current };
    for (const [tName, fields] of Object.entries(incoming)) {
      result[tName] = {
        ...(result[tName] || {}),
        ...fields
      };
    }
  }

  return new Promise((resolve) => {
    chrome.storage.local.set(result, () => resolve(result));
  });
}

export async function exportTemplates() {
  const all = await loadTemplates();
  return JSON.stringify(all, null, 2);
}
