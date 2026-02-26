const routes = new Set(["/login", "/onboarding", "/branches", "/dashboard", "/staff", "/settings"]);

export function getRoute() {
  const raw = window.location.hash.replace(/^#/, "") || "/dashboard";
  return routes.has(raw) ? raw : "/dashboard";
}

export function goTo(route) {
  const safe = routes.has(route) ? route : "/dashboard";
  if (getRoute() === safe) return;
  window.location.hash = safe;
}

export function onRouteChange(callback) {
  const handler = () => callback(getRoute());
  window.addEventListener("hashchange", handler);
  return () => window.removeEventListener("hashchange", handler);
}
