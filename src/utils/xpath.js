export function generateXPath(el) {
  if (el.id) {
    return `//*[@id="${el.id}"]`;
  }
  return getElementTreeXPath(el);
}

function getElementTreeXPath(element) {
  const paths = [];

  // Document node
  for (; element && element.nodeType === Node.ELEMENT_NODE; element = element.parentNode) {
    let index = 0;
    let hasSameTypeSiblings = false;
    const siblings = element.parentNode ? element.parentNode.childNodes : [];
    for (let i = 0; i < siblings.length; i++) {
      const sibling = siblings[i];
      if (sibling.nodeType === Node.ELEMENT_NODE && sibling.nodeName === element.nodeName) {
        hasSameTypeSiblings = true;
        index++;
        if (sibling === element) {
          break;
        }
      }
    }

    const tagName = element.nodeName.toLowerCase();
    const pathIndex = hasSameTypeSiblings ? `[${index}]` : '';
    paths.unshift(`${tagName}${pathIndex}`);
  }

  return '//' + paths.join('/');
}
