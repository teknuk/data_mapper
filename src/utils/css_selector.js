// Simple CSS selector generator
export function getCssSelector(el) {
  if (!(el instanceof Element)) return null;

  if (el.id) {
    return `#${CSS.escape(el.id)}`;
  }
  const path = [];
  while (el && el.nodeType === Node.ELEMENT_NODE && el !== document.body) {
    let selector = el.nodeName.toLowerCase();
    if (el.classList.length > 0) {
      selector += '.' + Array.from(el.classList)
        .map((c) => CSS.escape(c))
        .join('.');
    }
    const siblingIndex = getSiblingIndex(el);
    selector += `:nth-of-type(${siblingIndex})`;
    path.unshift(selector);
    el = el.parentElement;
  }
  return path.join(' > ');
}

function getSiblingIndex(el) {
  let i = 1;
  let sib = el.previousElementSibling;
  while (sib) {
    if (sib.nodeName === el.nodeName) i++;
    sib = sib.previousElementSibling;
  }
  return i;
}
