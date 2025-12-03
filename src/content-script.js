import { setupSelection, teardownSelection, isSelectionActive, createRevealOverlay } from './utils/highlight.js';
import { getCssSelector } from './utils/css_selector.js';
import { generateXPath } from './utils/xpath.js';

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

  chrome.storage.local.get(templateName, (data) => {
    const templates = data[templateName] || {};
    if (originalName && originalName !== fieldName) {
      delete templates[originalName]; // if renamed: delete old key
    }
    templates[fieldName] = { type, value, selector };

    chrome.storage.local.set({ [templateName]: templates }, () => {
      chrome.runtime.sendMessage({
        type: originalName ? 'TN_DATAMAPPER_FIELD_UPDATED' : 'TN_DATAMAPPER_FIELD_ADDED',
        templateName,
        fieldName,
        originalName,
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
          const xpathResult = document.evaluate( selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null );
          for (let i = 0; i < xpathResult.snapshotLength; i++) {
            const node = xpathResult.snapshotItem(i);
            if (node) values.push(node.textContent.trim());
          }
        }
      } catch (e) {
        console.error('Extraction error for field', fieldName, e);
      }
      if (values.length == 1) {
        result[fieldName] = values.at(0);
      } else {
        result[fieldName] = values; // always array to support multi-match
      }
    });

    const payload = {
      type: 'TN_DATAMAPPER_EXTRACTION_RESULT',
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

function handleReveal(templateName) {
  clearRevealOverlays();
  chrome.storage.local.get(templateName, data => {
    const template = data[templateName] || {};
    const result = {};

    Object.entries(template).forEach(([fieldName, { type, selector }]) => {
      try {
        let nodes = [];

        if (type === "css") {
          nodes = Array.from(document.querySelectorAll(selector));
        } else if (type === "xpath") {
          const r = document.evaluate( selector, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null );
          for (let i = 0; i < r.snapshotLength; i++) {
            nodes.push(r.snapshotItem(i));
          }
        }

        let values = Array.from(nodes).map((n) => (n.textContent || "").trim());
        if (values.length == 1) {
          result[fieldName] = values.at(0);
        } else {
          result[fieldName] = values; // always array to support multi-match
        }

        // Create overlays
        nodes.forEach(node => {
          const overlay = createRevealOverlay(node, fieldName);
          document.body.appendChild(overlay);
          revealOverlays.push(overlay);
        });

      } catch (err) {
        console.warn("Reveal failed:", fieldName, err);
      }
    });

    // respond back to popup
    chrome.runtime.sendMessage({
      type: "TN_DATAMAPPER_REVEAL_RESULT",
      templateName,
      data: result,
      revealedMessage: `🔍 Revealed ${revealOverlays.length} fields`
    });
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
