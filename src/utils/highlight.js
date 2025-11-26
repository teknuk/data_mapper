let selectionActive = false;
let hoverOverlay;
let clickOverlay;
let tooltip;
let currentElement = null;
let cleanupFns = [];

export function isSelectionActive() {
  return selectionActive;
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
    if (!selectionActive) return;
    e.preventDefault();
    e.stopPropagation();
    const target = e.target;
    if (!target || !(target instanceof Element)) return;
    currentElement = target;
    highlightElement(target, clickOverlay);
    showTooltipForElement(target, onElementChosen);
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
    left: rect.left + 'px',
    top: rect.top + 'px',
    width: rect.width + 'px',
    height: rect.height + 'px',
    display: 'block'
  });
}

function clearOverlay(overlay) {
  if (!overlay) return;
  overlay.style.display = 'none';
}

function showTooltipForElement(el, onElementChosen) {
  const rect = el.getBoundingClientRect();
  tooltip.style.display = 'block';
  tooltip.style.left = rect.left + 'px';
  tooltip.style.top = rect.bottom + 6 + 'px';

  const nameInput = tooltip.querySelector('#dm-field-name');
  const typeSelect = tooltip.querySelector('#dm-selector-type');
  const cancelBtn = tooltip.querySelector('#dm-cancel');
  const saveBtn = tooltip.querySelector('#dm-save');

  nameInput.value = '';
  nameInput.focus();

  const handleCancel = () => {
    tooltip.style.display = 'none';
    cleanup();
  };
  const handleSave = () => {
    const fieldName = nameInput.value.trim();
    const selectorType = typeSelect.value;
    if (!fieldName) return;
    tooltip.style.display = 'none';
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
