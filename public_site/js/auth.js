import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  sendEmailVerification,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

const firebaseConfig = window.__FIREBASE_CONFIG__ || null;

if (!firebaseConfig) {
  console.error("Firebase config is missing. Ensure /config.js sets window.__FIREBASE_CONFIG__");
}

const app = firebaseConfig ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
const authClient = app ? getAuth(app) : null;

let currentUserCache = null;

if (authClient) {
  onAuthStateChanged(authClient, (user) => {
    currentUserCache = user
      ? {
          uid: user.uid,
          email: user.email || "",
          emailVerified: Boolean(user.emailVerified),
        }
      : null;
    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(currentUserCache));
    } else {
      localStorage.removeItem("currentUser");
      localStorage.removeItem("activeBranchId");
    }
  });
}

function ensureAuth() {
  if (!authClient) throw new Error("Firebase Auth is not configured");
}

function normalizeUser(user) {
  if (!user) return null;
  return {
    uid: user.uid,
    email: user.email || "",
    emailVerified: Boolean(user.emailVerified),
  };
}

export const auth = {
  async register(email, password) {
    ensureAuth();
    const result = await createUserWithEmailAndPassword(authClient, email, password);
    if (result.user && !result.user.emailVerified) {
      await sendEmailVerification(result.user).catch(() => {});
    }
    currentUserCache = normalizeUser(result.user);
    localStorage.setItem("currentUser", JSON.stringify(currentUserCache));
    return currentUserCache;
  },

  async verify(_email, _code) {
    // Kept for backward compatibility with previous flow.
    return true;
  },

  async login(email, password) {
    ensureAuth();
    const result = await signInWithEmailAndPassword(authClient, email, password);
    currentUserCache = normalizeUser(result.user);
    localStorage.setItem("currentUser", JSON.stringify(currentUserCache));
    return currentUserCache;
  },

  async logout() {
    if (authClient) {
      await signOut(authClient).catch(() => {});
    }
    currentUserCache = null;
    localStorage.removeItem("currentUser");
    localStorage.removeItem("activeBranchId");
  },

  getCurrentUser() {
    if (currentUserCache) return currentUserCache;
    const raw = localStorage.getItem("currentUser");
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch (_err) {
      return null;
    }
  },

  getCurrentUserId() {
    return this.getCurrentUser()?.uid || "";
  },

  isAuthenticated() {
    return Boolean(this.getCurrentUser());
  },

  onAuthChange(callback) {
    if (!authClient) {
      callback(null);
      return () => {};
    }
    return onAuthStateChanged(authClient, (user) => callback(normalizeUser(user)));
  },
};
