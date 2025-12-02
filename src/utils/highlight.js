import { getCssSelector } from "./css_selector";
import { generateXPath } from "./xpath";

let selectionActive = false;
let tooltipOpen = false;
let hoverOverlay;
let clickOverlay;
let tooltip;
let currentElement = null;
let cleanupFns = [];

export function isSelectionActive() {
  return selectionActive;
}

function extractElementInfo(el) {
  return {
    css: getCssSelector(el),
    xpath: generateXPath(el),
    text: el.innerText.trim()
  };
}

function isValidSelectable(el, info) {
  const rect = el.getBoundingClientRect();

  if (rect.width < 5 || rect.height < 5) return false;
  if (el.children.length === 0 && (el.innerText.trim() === "")) return false;

  // Reject noisy containers
  const badTags = ["HTML", "BODY", "HEAD", "SCRIPT", "STYLE"];
  if (badTags.includes(el.tagName)) return false;

  return true;
}

function flashInvalid(el) {
  el.style.transition = "outline 0.12s ease";
  ["2px solid red", "", "2px solid red", ""].forEach((border, i)=>{
    setTimeout(() => { el.style.outline = border }, 120 * i);
  });
}

export function setupSelection({ onElementChosen }) {
  if (selectionActive) return;
  selectionActive = true;

  createHoverOverlay();
  createClickOverlay();
  createTooltip();

  const mouseOver = (e) => {
    if (!selectionActive) return;
    const target = e.target;
    if (!target || !(target instanceof Element)) return;
    currentElement = target;
    highlightElement(target, hoverOverlay);
  };

  const mouseOut = () => {
    if (!selectionActive) return;
    clearOverlay(hoverOverlay);
  };

  const click = (e) => {
    if (!selectionActive || tooltipOpen) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.target;
    if (!target || !(target instanceof Element)) return;
    const info = extractElementInfo(target);
    if (!isValidSelectable(target, info)) {
      flashInvalid(target);
      return;
    }
    currentElement = target;
    tooltipOpen = true;
    highlightElement(target, clickOverlay);
    showTooltipForElement(target, e, onElementChosen);
  };

  document.addEventListener('mouseover', mouseOver, true);
  document.addEventListener('mouseout', mouseOut, true);
  document.addEventListener('click', click, true);

  cleanupFns.push(() => document.removeEventListener('mouseover', mouseOver, true));
  cleanupFns.push(() => document.removeEventListener('mouseout', mouseOut, true));
  cleanupFns.push(() => document.removeEventListener('click', click, true));
}

export function teardownSelection() {
  selectionActive = false;
  cleanupFns.forEach((fn) => fn());
  cleanupFns = [];
  if (hoverOverlay?.remove) hoverOverlay.remove();
  if (clickOverlay?.remove) clickOverlay.remove();
  if (tooltip?.remove) tooltip.remove();
  hoverOverlay = null;
  clickOverlay = null;
  tooltip = null;
  currentElement = null;
}

// Helpers

function createHoverOverlay() {
  hoverOverlay = document.createElement('div');
  Object.assign(hoverOverlay.style, {
    position: 'absolute',
    border: '2px solid #3b82f6',
    background: 'rgba(59,130,246,0.15)',
    pointerEvents: 'none',
    zIndex: '2147483646'
  });
  document.documentElement.appendChild(hoverOverlay);
}

function createClickOverlay() {
  clickOverlay = document.createElement('div');
  Object.assign(clickOverlay.style, {
    position: 'absolute',
    border: '2px solid #ec4899',
    background: 'rgba(236,72,153,0.15)',
    pointerEvents: 'none',
    zIndex: '2147483647'
  });
  document.documentElement.appendChild(clickOverlay);
}

function createTooltip() {
  tooltip = document.createElement('div');
  tooltip.style.position = 'fixed';
  tooltip.style.zIndex = '2147483648';
  tooltip.style.background = '#111827';
  tooltip.style.color = '#f9fafb';
  tooltip.style.padding = '8px';
  tooltip.style.borderRadius = '8px';
  tooltip.style.fontSize = '12px';
  tooltip.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  tooltip.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)';
  tooltip.style.display = 'none';
  tooltip.style.maxWidth = '260px';

  tooltip.innerHTML = `
    <style>
      #dm-save:focus, #dm-cancel:focus {
        outline: 2px solid #3b82f6;
        outline-offset: 2px;
      }
    </style>
    <div style="margin-bottom:4px;font-weight:600;">Map field</div>
    <label style="display:block;margin-bottom:4px;">
      <span style="display:block;margin-bottom:2px;">Field name</span>
      <input type="text" id="dm-field-name" style="width:100%;padding:4px 6px;border-radius:4px;border:1px solid #374151;background:#111827;color:#f9fafb;"/>
    </label>
    <label style="display:block;margin-bottom:4px;">
      <span style="display:block;margin-bottom:2px;">Type</span>
      <select id="dm-selector-type" style="width:100%;padding:4px 6px;border-radius:4px;border:1px solid #374151;background:#111827;color:#f9fafb;">
        <option value="css">CSS Selector</option>
        <option value="xpath">XPath</option>
      </select>
    </label>
    <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:6px;">
      <button id="dm-cancel" style="padding:3px 8px;border-radius:4px;border:1px solid #4b5563;background:#111827;color:#e5e7eb;">Cancel</button>
      <button id="dm-save" style="padding:3px 8px;border-radius:4px;border:none;background:#3b82f6;color:#f9fafb;font-weight:500;">Save</button>
    </div>
  `;

  document.documentElement.appendChild(tooltip);
}

function highlightElement(el, overlay) {
  const rect = el.getBoundingClientRect();
  Object.assign(overlay.style, {
    left: (rect.left + window.scrollX) + 'px',
    top: (rect.top + window.scrollY) + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
    display: 'block'
  });
}

function clearOverlay(overlay) {
  if (!overlay) return;
  overlay.style.display = 'none';
}

function showTooltipForElement(el, event, onElementChosen) {
  const rect = el.getBoundingClientRect();
  tooltip.style.display = 'block';
  // tooltip.style.left = rect.left + 'px';
  // tooltip.style.top = rect.bottom + 6 + 'px';
  tooltip.style.position = "fixed";
  tooltip.style.left = event.clientX + 10 + "px";
  tooltip.style.top = event.clientY + 10 + "px";

  const nameInput = tooltip.querySelector('#dm-field-name');
  const typeSelect = tooltip.querySelector('#dm-selector-type');
  const cancelBtn = tooltip.querySelector('#dm-cancel');
  const saveBtn = tooltip.querySelector('#dm-save');

  nameInput.value = '';
  nameInput.focus();

  tooltip.addEventListener("keydown", (e) => {
    if (e.key === "Enter") handleSave();
    if (e.key === "Escape") handleCancel();
  });

  const handleCancel = () => {
    tooltip.style.display = 'none';
    tooltipOpen = false;
    cleanup();
  };
  const handleSave = () => {
    const fieldName = nameInput.value.trim();
    const selectorType = typeSelect.value;
    if (!fieldName) return;
    tooltip.style.display = 'none';
    tooltipOpen = false;
    cleanup();
    onElementChosen({ element: el, fieldName, selectorType });
  };

  cancelBtn.addEventListener('click', handleCancel, { once: true });
  saveBtn.addEventListener('click', handleSave, { once: true });

  const cleanup = () => {
    cancelBtn.removeEventListener('click', handleCancel);
    saveBtn.removeEventListener('click', handleSave);
  };
}

export function createRevealOverlay(el, name) {
  const rect = el.getBoundingClientRect();
  const div = document.createElement("div");
  div.classList.add("tn_overlay");
  div.style.position = "absolute";
  div.style.top = rect.top + window.scrollY + "px";
  div.style.left = rect.left + window.scrollX + "px";
  div.style.width = rect.width + "px";
  div.style.height = rect.height + "px";
  div.style.border = "2px solid #00aaff";
  div.style.background = "rgba(0, 170, 255, 0.10)";
  div.style.zIndex = 2147483647;  // max
  div.style.pointerEvents = "none";
  // label
  const label = document.createElement("div");
  label.textContent = name;
  label.style.position = "absolute";
  label.style.top = "-18px";
  label.style.left = "0";
  label.style.fontSize = "12px";
  label.style.background = "#00aaff";
  label.style.color = "white";
  label.style.padding = "2px 4px";
  label.style.pointerEvents = "none";
  div.appendChild(label);
  return div;
}
