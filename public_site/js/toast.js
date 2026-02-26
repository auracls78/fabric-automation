let container;

function ensure() {
  if (container) return container;
  container = document.createElement("div");
  container.className = "toast-wrap";
  document.body.appendChild(container);
  return container;
}

export function toast(message, type = "info", timeout = 2800) {
  const host = ensure();
  const node = document.createElement("div");
  node.className = `toast ${type}`;
  node.textContent = message;
  host.appendChild(node);
  window.setTimeout(() => node.remove(), timeout);
}
