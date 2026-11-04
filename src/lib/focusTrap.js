/**
 * Minimal keyboard containment for the custom brutalist dialogs. The mobile
 * menu already had this; the sign-in slip and approval modal now share it.
 */
const FOCUSABLE = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

function visibleNodes(container) {
  return Array.from(container.querySelectorAll(FOCUSABLE)).filter((node) => {
    if (node.getAttribute('aria-hidden') === 'true') return false;
    const style = window.getComputedStyle(node);
    return style.display !== 'none' && style.visibility !== 'hidden';
  });
}

export function focusFirst(container, selector) {
  const target = selector ? container?.querySelector(selector) : visibleNodes(container)[0];
  target?.focus?.();
}

export function trapTabKey(event, container) {
  if (event.key !== 'Tab' || !container) return;
  const nodes = visibleNodes(container);
  if (nodes.length === 0) {
    event.preventDefault();
    return;
  }
  const first = nodes[0];
  const last = nodes[nodes.length - 1];
  if (event.shiftKey && document.activeElement === first) {
    event.preventDefault();
    last.focus();
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault();
    first.focus();
  }
}
