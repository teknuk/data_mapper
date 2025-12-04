import { setupSelection, teardownSelection, isSelectionActive, createRevealOverlay } from './utils/highlight.js';
import { getCssSelector } from './utils/css_selector.js';
import { generateXPath } from './utils/xpath.js';
import { getTemplate, saveTemplate } from './utils/storage.js';

// This file will be bundled in practice; for raw use, you can inline utils here
// or adjust build paths. For simplicity, we assume a bundler copies utils.

let currentTemplateName = 'default';
let currentSelectionType = 'css'; // default type for new mappings

let revealOverlays = [];

let panelVisible = false;
let panelContainer = null;
let panelIframe = null;
let panelSide = "right";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  switch (message.type) {
    case 'TN_DATAMAPPER_SET_TEMPLATE':
      currentTemplateName = message.templateName || 'default';
      break;

    case 'TN_DATAMAPPER_TOGGLE_SELECTION':
      currentTemplateName = message.templateName || currentTemplateName || 'default';
      currentSelectionType = message.selectorType || 'css';
      toggleSelectionMode(message);
      break;

    case 'TN_DATAMAPPER_TOGGLE_PANEL':
      togglePanel();
      break;

    case 'TN_DATAMAPPER_SET_PANEL_SIDE':
      togglePanelSide(message);
      break;

    case 'TN_DATAMAPPER_REVEAL':
      currentTemplateName = message.templateName || currentTemplateName || 'default';
      revealOverlays.length === 0 ? handleReveal(currentTemplateName) : clearRevealOverlays();
      return true; // async

    case 'TN_DATAMAPPER_EXTRACT':
      currentTemplateName = message.templateName || currentTemplateName || 'default';
      handleExtraction(currentTemplateName, sendResponse);
      return true; // async

    default:
      break;
  }
});

// Toggle selection
function toggleSelectionMode({ mode, fieldName, selectorType, templateName }) {
  // console.log("=== toggleSelectionMode", { mode, fieldName, selectorType, templateName })
  if ((mode === 'ACTIVE') && !isSelectionActive()) {
    setupSelection({
      reselectContext: {},
      onElementChosen: handleElementChosen
    });
  } else if ((mode === 'INACTIVE') && isSelectionActive()) {
    teardownSelection();
  } else if (mode === 'RESELECT') {
    setupSelection({
      reselectContext: { fieldName, selectorType, templateName },
      onElementChosen: handleElementChosen
    });
  }
}

// When user clicks an element and confirms a field name/type
async function handleElementChosen({ element, fieldName, selectorType, originalName }) {
  const templateName = currentTemplateName || 'default';
  const type = selectorType || currentSelectionType || 'css';

  const selector = type === 'css' ? getCssSelector(element) : generateXPath(element);
  const value = element.innerText || "";
  console.log("=== handleElementChosen ", {element, fieldName, selectorType, originalName});

  const template = await getTemplate(templateName); // --- storage via helper ---
  if (originalName && originalName !== fieldName) {
    delete template[originalName]; // if renamed: delete old key
  }
  template[fieldName] = { type, value, selector };
  await saveTemplate(templateName, template);

  chrome.runtime.sendMessage({
    type: originalName ? "TN_DATAMAPPER_FIELD_UPDATED" : "TN_DATAMAPPER_FIELD_ADDED",
    templateName,
    fieldName,
    originalName,
    mapping: template[fieldName]
  });
}

// Extraction logic
async function handleExtraction(templateName) {
  const { result } = await extractTemplateMatches(templateName);
  const payload = {
    type: "TN_DATAMAPPER_EXTRACTION_RESULT",
    templateName,
    data: result,
    url: window.location.href,
    timestamp: Date.now()
  };
  chrome.runtime.sendMessage(payload);
}

async function extractTemplateMatches(templateName, { includeNodes = false } = {}) {
  const template = await getTemplate(templateName);   // ← uses your storage API
  const result = {};
  const nodeMap = {};

  for (const [fieldName, { type, selector }] of Object.entries(template)) {
    let nodes = [];
    try {
      if (type === "css") {
        nodes = Array.from(document.querySelectorAll(selector));
      } else if (type === "xpath") {
        const xpathResult = document.evaluate( selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null );
        nodes = Array.from({ length: xpathResult.snapshotLength }, (_, i) => xpathResult.snapshotItem(i));
      }
      const values = nodes.map(n => (n?.textContent || "").trim());
      result[fieldName] = values.length === 1 ? values[0] : values;
      if (includeNodes) nodeMap[fieldName] = nodes;
    } catch (err) {
      console.warn("Extraction failed:", fieldName, err);
      result[fieldName] = null;
      if (includeNodes) nodeMap[fieldName] = [];
    }
  }
  return { result, nodeMap };
}

async function handleReveal(templateName) {
  clearRevealOverlays();
  const { result, nodeMap } = await extractTemplateMatches(templateName, { includeNodes: true });
  for (const [fieldName, nodes] of Object.entries(nodeMap)) {
    for (const node of nodes) {
      const overlay = createRevealOverlay(node, fieldName);
      document.body.appendChild(overlay);
      revealOverlays.push(overlay);
    }
  }
  chrome.runtime.sendMessage({
    type: "TN_DATAMAPPER_REVEAL_RESULT",
    templateName,
    data: result,
    revealedMessage: `🔍 Revealed ${revealOverlays.length} fields`
  });
}

function clearRevealOverlays() {
  revealOverlays.forEach(o => o.remove());
  chrome.runtime.sendMessage({
    type: "TN_DATAMAPPER_REVEAL_RESULT",
    data: {},
    revealedMessage: `🧹 Cleared ${revealOverlays.length} highlights`
  });
  revealOverlays = [];
}

function togglePanelSide({ side }) {
  if (!panelContainer) return;

  if (side === "left") {
    panelContainer.style.left = "0";
    panelContainer.style.right = "auto";
    panelSide = "left";
  } else {
    panelContainer.style.right = "0";
    panelContainer.style.left = "auto";
    panelSide = "right";
  }
}

function togglePanel() {
  if (panelVisible) {
    if (panelContainer && panelContainer.parentNode) {
      panelContainer.parentNode.removeChild(panelContainer);
    }
    panelContainer = null;
    panelIframe = null;
    panelVisible = false;
    return;
  }

  panelContainer = document.createElement('div');
  Object.assign(panelContainer.style, {
    position: 'fixed',
    top: '0',
    [panelSide]: '0',
    width: '420px',
    height: '100vh',
    zIndex: '2147483640',   // lower than your highlight tooltip z-index if needed
    boxShadow: '0 0 20px rgba(0,0,0,0.35)'
  });

  panelIframe = document.createElement('iframe');
  panelIframe.src = chrome.runtime.getURL('panel/index.html'); // we’ll create this
  panelIframe.sandbox = "allow-scripts allow-same-origin";
  Object.assign(panelIframe.style, {
    width: '100%',
    height: '100%',
    border: 'none',
    background: 'transparent'
  });

  const shadow = panelContainer.attachShadow({ mode: "open" });
  shadow.appendChild(panelIframe);
  // panelContainer.appendChild(panelIframe);
  document.documentElement.appendChild(panelContainer);
  panelVisible = true;
}
