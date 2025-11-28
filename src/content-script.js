import { setupSelection, teardownSelection, isSelectionActive } from './utils/highlight.js';
import { getCssSelector } from './utils/css_selector.js';
import { generateXPath } from './utils/xpath.js';

// This file will be bundled in practice; for raw use, you can inline utils here
// or adjust build paths. For simplicity, we assume a bundler copies utils.

let currentTemplateName = 'default';
let currentSelectionType = 'css'; // default type for new mappings

let panelVisible = false;
let panelContainer = null;
let panelIframe = null;

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || !message.type) return;

  switch (message.type) {
    case 'DATAMAPPER_SET_TEMPLATE':
      currentTemplateName = message.templateName || 'default';
      break;

    case 'DATAMAPPER_TOGGLE_SELECTION':
      currentTemplateName = message.templateName || currentTemplateName || 'default';
      currentSelectionType = message.selectorType || 'css';
      toggleSelectionMode(message.active);
      break;

    case 'DATAMAPPER_TOGGLE_PANEL':
      togglePanel();
      return; // async

    case 'DATAMAPPER_EXTRACT':
      currentTemplateName = message.templateName || currentTemplateName || 'default';
      handleExtraction(currentTemplateName, sendResponse);
      return true; // async

    default:
      break;
  }
});

// Toggle selection
function toggleSelectionMode(active) {
  if (active && !isSelectionActive()) {
    setupSelection({
      onElementChosen: handleElementChosen
    });
  } else if (!active && isSelectionActive()) {
    teardownSelection();
  }
}

// When user clicks an element and confirms a field name/type
async function handleElementChosen({ element, fieldName, selectorType }) {
  const templateName = currentTemplateName || 'default';
  const type = selectorType || currentSelectionType || 'css';

  const selector = type === 'css'
    ? getCssSelector(element)
    : generateXPath(element);

  const key = templateName;

  chrome.storage.local.get(key, (data) => {
    const templates = data[key] || {};
    templates[fieldName] = {
      type,
      selector
    };

    chrome.storage.local.set({ [key]: templates }, () => {
      chrome.runtime.sendMessage({
        type: 'DATAMAPPER_FIELD_ADDED',
        templateName,
        fieldName,
        mapping: templates[fieldName]
      });
    });
  });
}

// Extraction logic
function handleExtraction(templateName, sendResponse) {
  const key = templateName;
  chrome.storage.local.get(key, (data) => {
    const template = data[key] || {};
    const result = {};

    Object.entries(template).forEach(([fieldName, { type, selector }]) => {
      let values = [];
      try {
        if (type === 'css') {
          const nodes = document.querySelectorAll(selector);
          values = Array.from(nodes).map((n) => n.textContent.trim());
        } else if (type === 'xpath') {
          const xpathResult = document.evaluate(
            selector,
            document,
            null,
            XPathResult.ORDERED_NODE_SNAPSHOT_TYPE,
            null
          );
          for (let i = 0; i < xpathResult.snapshotLength; i++) {
            const node = xpathResult.snapshotItem(i);
            if (node) values.push(node.textContent.trim());
          }
        }
      } catch (e) {
        console.error('Extraction error for field', fieldName, e);
      }
      result[fieldName] = values; // always array to support multi-match
    });

    const payload = {
      type: 'DATAMAPPER_EXTRACTION_RESULT',
      templateName,
      data: result,
      url: window.location.href,
      timestamp: Date.now()
    };

    // respond to popup via background
    chrome.runtime.sendMessage(payload);
    if (sendResponse) sendResponse(payload);
  });
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
    right: '0',
    width: '420px',
    height: '100vh',
    zIndex: '2147483640',   // lower than your highlight tooltip z-index if needed
    boxShadow: '0 0 20px rgba(0,0,0,0.35)'
  });

  panelIframe = document.createElement('iframe');
  panelIframe.src = chrome.runtime.getURL('index.html'); // we’ll create this
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
