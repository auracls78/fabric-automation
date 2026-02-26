import { auth } from "./js/auth.js";
import { goTo, getRoute, onRouteChange } from "./js/router.js";
import { can, defaultPermissions, ROLE } from "./js/permissions.js";
import {
  ensureUserDoc,
  createCompanyForOwner,
  loadCompanyContext,
  setActiveBranch,
  listBranches,
} from "./js/firestore.js";
import { createBranchService } from "./js/branches.js";
import { createStaffService } from "./js/staff.js";
import { renderAuthScreen, renderOnboarding, renderBranchPicker, renderAppShell } from "./js/ui.js";
import { toast } from "./js/toast.js";

const app = document.getElementById("app");

const state = {
  route: getRoute(),
  authMode: "login",
  user: null,
  userData: null,
  company: null,
  staffMe: null,
  permissions: defaultPermissions(ROLE.OWNER),
  branches: [],
  staff: [],
  activeBranchId: localStorage.getItem("activeBranchId") || "",
  sidebarOpen: false,
  loading: false,
  error: "",
  staffLoading: false,
  branchModal: { open: false, mode: "create", id: "", values: { name: "", address: "", status: "inactive" } },
  staffModal: { open: false, mode: "create", id: "", values: { email: "", role: "CASHIER", branchIds: [] } },
  deleteModal: { open: false, kind: "", id: "" },
};

let branchService = null;
let staffService = null;

function safeError(err) {
  const msg = err?.message || "Unknown error";
  if (/permission|denied/i.test(msg)) return "Permission denied for this action.";
  if (/network|fetch|offline/i.test(msg)) return "Network error. Please retry.";
  return msg;
}

function resetModals() {
  state.branchModal = { open: false, mode: "create", id: "", values: { name: "", address: "", status: "inactive" } };
  state.staffModal = { open: false, mode: "create", id: "", values: { email: "", role: "CASHIER", branchIds: [] } };
  state.deleteModal = { open: false, kind: "", id: "" };
}

async function syncAuthContext() {
  const user = auth.getCurrentUser();
  state.user = user;
  if (!user) {
    state.userData = null;
    state.company = null;
    state.staffMe = null;
    state.branches = [];
    state.staff = [];
    return;
  }

  await ensureUserDoc(user);
  const ctx = await loadCompanyContext(user.uid);
  state.userData = ctx.userData;
  state.company = ctx.company;
  state.staffMe = ctx.staffMe;
  state.branches = ctx.branches;

  if (state.userData?.activeBranchId) {
    state.activeBranchId = state.userData.activeBranchId;
    localStorage.setItem("activeBranchId", state.activeBranchId);
  }

  branchService = state.company ? createBranchService(state.company.id) : null;
  staffService = state.company ? createStaffService(state.company.id) : null;

  const roleFromUser = state.userData?.role || state.staffMe?.role || ROLE.OWNER;
  state.permissions = {
    ...defaultPermissions(roleFromUser),
    ...(state.staffMe?.permissions || {}),
  };

  if (state.staffMe && !state.staffMe.permissions) {
    state.permissions = defaultPermissions(state.staffMe.role || roleFromUser);
  }
}

function applyRouteGuards() {
  const route = state.route;
  if (!state.user) {
    if (route !== "/login") goTo("/login");
    return;
  }

  if (!state.userData?.companyId) {
    if (route !== "/onboarding") goTo("/onboarding");
    return;
  }

  if (!state.activeBranchId && !["/branches", "/onboarding", "/login"].includes(route)) {
    goTo("/branches");
    return;
  }

  if (route === "/staff" && !can("manageStaff", { role: state.staffMe?.role, permissions: state.permissions })) {
    goTo("/dashboard");
    return;
  }

  if (route === "/settings" && !can("manageCompany", { role: state.staffMe?.role, permissions: state.permissions })) {
    goTo("/dashboard");
  }
}

async function refreshBranches() {
  if (!state.company) return;
  state.loading = true;
  render();
  try {
    state.branches = await listBranches(state.company.id);
    if (!state.activeBranchId || !state.branches.some((b) => b.id === state.activeBranchId)) {
      state.activeBranchId = state.branches[0]?.id || "";
      if (state.activeBranchId && state.user) {
        await setActiveBranch(state.user.uid, state.activeBranchId);
      }
    }
    state.error = "";
  } catch (err) {
    state.error = safeError(err);
  } finally {
    state.loading = false;
    render();
  }
}

async function refreshStaff() {
  if (!state.company || !staffService || !can("manageStaff", { role: state.staffMe?.role, permissions: state.permissions })) {
    state.staff = [];
    return;
  }
  state.staffLoading = true;
  render();
  try {
    state.staff = await staffService.list();
  } catch (err) {
    toast(safeError(err), "error");
  } finally {
    state.staffLoading = false;
    render();
  }
}

function render() {
  const route = getRoute();
  state.route = route;

  if (route === "/login") {
    app.innerHTML = renderAuthScreen(state.authMode === "signup" ? "signup" : "login");
    bindAuthScreen();
    return;
  }

  if (route === "/onboarding") {
    app.innerHTML = renderOnboarding();
    bindOnboarding();
    return;
  }

  if (route === "/branches") {
    app.innerHTML = renderBranchPicker({
      company: state.company,
      branches: state.branches,
      activeBranchId: state.activeBranchId,
      canManageBranches: can("manageBranches", { role: state.staffMe?.role, permissions: state.permissions }),
      sidebarOpen: state.sidebarOpen,
      branchModal: state.branchModal,
      deleteModal: state.deleteModal,
      staffModal: state.staffModal,
    });
    bindBranchPicker();
    return;
  }

  app.innerHTML = renderAppShell({
    route,
    company: state.company,
    branches: state.branches,
    activeBranchId: state.activeBranchId,
    sidebarOpen: state.sidebarOpen,
    loading: state.loading,
    error: state.error,
    staff: state.staff,
    staffLoading: state.staffLoading,
    permissions: state.permissions,
    branchModal: state.branchModal,
    deleteModal: state.deleteModal,
    staffModal: state.staffModal,
  });

  bindShell();
}

function bindAuthScreen() {
  const form = document.getElementById("authForm");
  const switcher = document.getElementById("switchAuthMode");
  const errorNode = document.getElementById("authError");

  switcher?.addEventListener("click", () => {
    state.authMode = state.authMode === "login" ? "signup" : "login";
    render();
  });

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorNode.textContent = "";
    const email = document.getElementById("authEmail").value.trim();
    const password = document.getElementById("authPassword").value;
    try {
      if (state.authMode === "signup") {
        await auth.register(email, password);
        toast("Account created", "success");
      } else {
        await auth.login(email, password);
        toast("Signed in", "success");
      }
      await syncAuthContext();
      applyRouteGuards();
      render();
    } catch (err) {
      errorNode.textContent = safeError(err);
    }
  });
}

function bindOnboarding() {
  const form = document.getElementById("onboardingForm");
  const errorNode = document.getElementById("onboardingError");

  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorNode.textContent = "";

    const payload = {
      name: document.getElementById("companyName").value.trim(),
      phone: document.getElementById("companyPhone").value.trim(),
      currency: document.getElementById("companyCurrency").value,
      timezone: document.getElementById("companyTimezone").value,
    };

    if (!payload.name) {
      errorNode.textContent = "Company name is required";
      return;
    }

    try {
      await createCompanyForOwner(state.user, payload);
      await syncAuthContext();
      toast("Business created", "success");
      goTo("/branches");
    } catch (err) {
      errorNode.textContent = safeError(err);
    }
  });
}

function bindBranchPicker() {
  document.getElementById("logoutBtn")?.addEventListener("click", doLogout);
  document.getElementById("toggleSidebarBtn")?.addEventListener("click", () => {
    state.sidebarOpen = !state.sidebarOpen;
    render();
  });

  if (can("manageBranches", { role: state.staffMe?.role, permissions: state.permissions })) {
    document.getElementById("openCreateBranchBtn")?.addEventListener("click", () => {
      state.branchModal = { open: true, mode: "create", id: "", values: { name: "", address: "", status: "active" } };
      render();
    });
  }

  app.querySelectorAll("[data-branch-pick]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const branchId = btn.getAttribute("data-branch-pick");
      if (!branchId || !state.user) return;
      try {
        await setActiveBranch(state.user.uid, branchId);
        state.activeBranchId = branchId;
        localStorage.setItem("activeBranchId", branchId);
        toast("Branch selected", "success");
        goTo("/dashboard");
      } catch (err) {
        toast(safeError(err), "error");
      }
    });
  });

  bindBranchModalAndDelete();
}

function bindShell() {
  document.getElementById("logoutBtn")?.addEventListener("click", doLogout);
  document.getElementById("toggleSidebarBtn")?.addEventListener("click", () => {
    state.sidebarOpen = !state.sidebarOpen;
    render();
  });

  document.getElementById("goBranchPickerBtn")?.addEventListener("click", () => goTo("/branches"));

  document.getElementById("activeBranchSelect")?.addEventListener("change", async (e) => {
    const branchId = e.target.value;
    if (!branchId || !state.user) return;
    try {
      await setActiveBranch(state.user.uid, branchId);
      state.activeBranchId = branchId;
      localStorage.setItem("activeBranchId", branchId);
      toast("Active branch changed", "success");
      render();
    } catch (err) {
      toast(safeError(err), "error");
    }
  });

  app.querySelectorAll("[data-go]").forEach((btn) => {
    btn.addEventListener("click", () => goTo(btn.getAttribute("data-go")));
  });

  document.getElementById("retryBtn")?.addEventListener("click", () => {
    refreshBranches();
    if (state.route === "/staff") refreshStaff();
  });

  if (can("manageBranches", { role: state.staffMe?.role, permissions: state.permissions })) {
    document.getElementById("openCreateBranchBtn")?.addEventListener("click", () => {
      state.branchModal = { open: true, mode: "create", id: "", values: { name: "", address: "", status: "active" } };
      render();
    });
  }

  if (can("manageStaff", { role: state.staffMe?.role, permissions: state.permissions })) {
    document.getElementById("openCreateStaffBtn")?.addEventListener("click", () => {
      state.staffModal = { open: true, mode: "create", id: "", values: { email: "", role: "CASHIER", branchIds: [] } };
      render();
    });
  }

  app.querySelectorAll("[data-action='activate-branch']").forEach((btn) => {
    btn.addEventListener("click", async () => {
      const id = btn.getAttribute("data-id");
      if (!id || !state.user) return;
      try {
        await setActiveBranch(state.user.uid, id);
        state.activeBranchId = id;
        localStorage.setItem("activeBranchId", id);
        toast("Branch activated", "success");
        render();
      } catch (err) {
        toast(safeError(err), "error");
      }
    });
  });

  app.querySelectorAll("[data-action='edit-branch']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const branch = state.branches.find((b) => b.id === id);
      if (!branch) return;
      state.branchModal = { open: true, mode: "edit", id, values: { name: branch.name, address: branch.address, status: branch.status } };
      render();
    });
  });

  app.querySelectorAll("[data-action='delete-branch']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      state.deleteModal = { open: true, kind: "branch", id };
      render();
    });
  });

  app.querySelectorAll("[data-action='edit-staff']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const item = state.staff.find((s) => s.id === id);
      if (!item) return;
      state.staffModal = {
        open: true,
        mode: "edit",
        id,
        values: {
          email: item.email || "",
          role: item.role || "CASHIER",
          branchIds: item.branchIds || [],
        },
      };
      render();
      const roleSelect = document.getElementById("staffRole");
      if (roleSelect) roleSelect.value = item.role || "CASHIER";
    });
  });

  app.querySelectorAll("[data-action='delete-staff']").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      state.deleteModal = { open: true, kind: "staff", id };
      render();
    });
  });

  bindBranchModalAndDelete();
  bindStaffModal();
}

function bindBranchModalAndDelete() {
  document.getElementById("closeBranchModalBtn")?.addEventListener("click", () => {
    state.branchModal.open = false;
    render();
  });

  document.getElementById("branchForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!branchService) return;
    const errorNode = document.getElementById("branchFormError");
    const name = document.getElementById("branchName").value.trim();
    const address = document.getElementById("branchAddress").value.trim();
    const status = document.getElementById("branchStatus").value;

    if (!name) {
      errorNode.textContent = "Branch name is required";
      return;
    }

    try {
      if (state.branchModal.mode === "edit") {
        await branchService.update(state.branchModal.id, { name, address, status });
        toast("Branch updated", "success");
      } else {
        const branchId = await branchService.create({ name, address, status });
        toast("Branch created", "success");
        if (!state.activeBranchId && state.user) {
          await setActiveBranch(state.user.uid, branchId);
          state.activeBranchId = branchId;
        }
      }
      state.branchModal.open = false;
      await refreshBranches();
    } catch (err) {
      errorNode.textContent = safeError(err);
    }
  });

  document.getElementById("cancelDeleteBtn")?.addEventListener("click", () => {
    state.deleteModal.open = false;
    render();
  });

  document.getElementById("confirmDeleteBtn")?.addEventListener("click", async () => {
    if (!state.deleteModal.open) return;
    try {
      if (state.deleteModal.kind === "branch" && branchService) {
        await branchService.remove(state.deleteModal.id);
        if (state.activeBranchId === state.deleteModal.id) {
          state.activeBranchId = "";
          localStorage.removeItem("activeBranchId");
        }
        toast("Branch deleted", "success");
        await refreshBranches();
      }
      if (state.deleteModal.kind === "staff" && staffService) {
        await staffService.remove(state.deleteModal.id);
        toast("Staff deleted", "success");
        await refreshStaff();
      }
      state.deleteModal.open = false;
      render();
    } catch (err) {
      toast(safeError(err), "error");
    }
  });
}

function bindStaffModal() {
  document.getElementById("closeStaffModalBtn")?.addEventListener("click", () => {
    state.staffModal.open = false;
    render();
  });

  document.getElementById("staffForm")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!staffService) return;
    const errorNode = document.getElementById("staffFormError");
    const email = document.getElementById("staffEmail").value.trim();
    const role = document.getElementById("staffRole").value;
    const branchIds = [...app.querySelectorAll("[data-branch-checkbox]:checked")].map((el) => el.value);

    if (!email) {
      errorNode.textContent = "Email is required";
      return;
    }

    const permissions = defaultPermissions(role);
    try {
      if (state.staffModal.mode === "edit") {
        await staffService.update(state.staffModal.id, { email, role, permissions, branchIds, status: "active" });
        toast("Staff updated", "success");
      } else {
        await staffService.create({ email, role, permissions, branchIds, status: "invited" });
        toast("Staff invited", "success");
      }
      state.staffModal.open = false;
      await refreshStaff();
    } catch (err) {
      errorNode.textContent = safeError(err);
    }
  });

  const roleSelect = document.getElementById("staffRole");
  if (roleSelect && state.staffModal.values.role) {
    roleSelect.value = state.staffModal.values.role;
  }
}

async function doLogout() {
  await auth.logout();
  toast("Logged out", "info");
  goTo("/login");
}

async function init() {
  state.loading = true;
  render();

  try {
    await syncAuthContext();
    applyRouteGuards();
    if (state.company) {
      await refreshBranches();
      if (state.route === "/staff") {
        await refreshStaff();
      }
    }
  } catch (err) {
    state.error = safeError(err);
    toast(state.error, "error");
  } finally {
    state.loading = false;
    render();
  }
}

onRouteChange(async (route) => {
  state.route = route;
  applyRouteGuards();
  if (state.route === "/staff") {
    await refreshStaff();
  }
  render();
});

auth.onAuthChange(async (user) => {
  state.user = user;
  await init();
});

init();
