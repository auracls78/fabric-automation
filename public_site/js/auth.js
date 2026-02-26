const RAW_API_BASE =
  window.__API_BASE__ ||
  localStorage.getItem("apiBase") ||
  `${window.location.protocol}//${window.location.host}`;
const API_BASE = RAW_API_BASE.replace(/\/+$/, "");

async function request(path, options = {}) {
  const token = localStorage.getItem("authToken");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Request failed");
  }
  return data;
}

export const auth = {
  async register(email, password) {
    const data = await request("/api/auth/register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (data.verificationCode) {
      alert(`[SIMULATION] Check your email (${email}) for the code: ${data.verificationCode}`);
    }
    return true;
  },

  async verify(email, code) {
    await request("/api/auth/verify", {
      method: "POST",
      body: JSON.stringify({ email, code }),
    });
    return true;
  },

  async login(email, password) {
    const data = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    localStorage.setItem("authToken", data.token);
    localStorage.setItem("currentUser", JSON.stringify(data.user));
    return data.user;
  },

  async logout() {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } catch (_err) {
      // Ignore network/session errors during logout cleanup.
    }
    localStorage.removeItem("authToken");
    localStorage.removeItem("currentUser");
  },

  getCurrentUser() {
    const raw = localStorage.getItem("currentUser");
    return raw ? JSON.parse(raw) : null;
  },

  isAuthenticated() {
    return !!localStorage.getItem("authToken");
  },

  async listBranches() {
    const data = await request("/api/branches");
    return data.branches || [];
  },

  async addBranch(name, location) {
    const data = await request("/api/branches", {
      method: "POST",
      body: JSON.stringify({ name, location }),
    });
    return data.branch;
  },
};
