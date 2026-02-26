function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatDate(ts) {
  try {
    return new Date(ts).toLocaleDateString();
  } catch (_err) {
    return "-";
  }
}

export function renderAuthScreen(mode = "login") {
  const isSignup = mode === "signup";
  return `
    <div class="auth-screen">
      <div class="auth-card">
        <h1>${isSignup ? "Create account" : "Sign in"}</h1>
        <p class="auth-subtitle">${isSignup ? "Start your business workspace" : "Continue to your business workspace"}</p>
        <form id="authForm">
          <div class="form-group">
            <label>Email</label>
            <input id="authEmail" type="email" required placeholder="name@company.com" />
          </div>
          <div class="form-group">
            <label>Password</label>
            <input id="authPassword" type="password" required minlength="6" placeholder="Enter password" />
          </div>
          <div class="error-text" id="authError"></div>
          <button class="btn btn-primary" type="submit">${isSignup ? "Create account" : "Sign in"}</button>
        </form>
        <div class="auth-footer">
          ${isSignup ? "Already have an account?" : "No account yet?"}
          <span class="text-link" id="switchAuthMode">${isSignup ? "Sign in" : "Create one"}</span>
        </div>
      </div>
    </div>
  `;
}

export function renderOnboarding() {
  return `
    <div class="auth-screen">
      <div class="auth-card" style="max-width:560px;">
        <h1>Create your business</h1>
        <p class="auth-subtitle">First login detected. Set up your company to continue.</p>
        <form id="onboardingForm">
          <div class="form-group">
            <label>Company name</label>
            <input id="companyName" type="text" required placeholder="Fabric House" />
          </div>
          <div class="form-group">
            <label>Phone (optional)</label>
            <input id="companyPhone" type="text" placeholder="+998" />
          </div>
          <div class="form-group">
            <label>Currency</label>
            <select id="companyCurrency">
              <option value="UZS">UZS</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <div class="form-group">
            <label>Timezone</label>
            <select id="companyTimezone">
              <option value="Asia/Tashkent">Asia/Tashkent</option>
              <option value="UTC">UTC</option>
            </select>
          </div>
          <div class="error-text" id="onboardingError"></div>
          <button class="btn btn-primary" type="submit">Create business</button>
        </form>
      </div>
    </div>
  `;
}

export function renderBranchPicker(data) {
  const branches = data.branches || [];
  const cards = branches.length
    ? branches
        .map(
          (b) => `
      <button class="card" data-branch-pick="${b.id}" style="text-align:left;cursor:pointer;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;">
          <h3 style="margin:0;">${escapeHtml(b.name)}</h3>
          ${data.activeBranchId === b.id ? '<span class="pill">Active</span>' : '<span class="muted">Select</span>'}
        </div>
        <div class="muted" style="margin-top:8px;">${escapeHtml(b.address || "No address")}</div>
      </button>
    `
        )
        .join("")
    : `<div class="empty-state"><div><h4>No branches yet</h4><p class="muted">Create your first branch to continue.</p></div></div>`;

  return `
    <div class="app-shell">
      <aside class="sidebar ${data.sidebarOpen ? "open" : ""}" id="sidebar">
        <div class="brand"><span class="brand-dot"></span><h2>Fabric Automation</h2></div>
        <div class="nav-title">Workspace</div>
        <button class="nav-btn active">Branch selection</button>
      </aside>
      <section class="main">
        <header class="topbar">
          <div class="topbar-left">
            <button class="btn btn-secondary mobile-menu" id="toggleSidebarBtn">Menu</button>
            <div>
              <h1>Select branch</h1>
              <p class="topbar-sub">${escapeHtml(data.company?.name || "")}</p>
            </div>
          </div>
          <div style="display:flex;gap:8px;">
            ${data.canManageBranches ? '<button class="btn btn-primary" id="openCreateBranchBtn">+ Add branch</button>' : ""}
            <button class="btn btn-secondary" id="logoutBtn">Logout</button>
          </div>
        </header>
        <section class="content" style="grid-template-columns:1fr;">${cards}</section>
      </section>
    </div>
    ${renderBranchModal(data)}
  `;
}

function renderBranchRows(branches, activeBranchId, canManageBranches) {
  return branches
    .map((b) => {
      const actions = canManageBranches
        ? `<div class="actions">
            <button class="btn btn-secondary btn-xs" data-action="activate-branch" data-id="${b.id}">Set active</button>
            <button class="btn btn-secondary btn-xs" data-action="edit-branch" data-id="${b.id}">Edit</button>
            <button class="btn btn-danger btn-xs" data-action="delete-branch" data-id="${b.id}">Delete</button>
          </div>`
        : "-";

      return `
        <tr>
          <td>${escapeHtml(b.name)}</td>
          <td>${escapeHtml(b.address || "-")}</td>
          <td>${escapeHtml(b.status || "inactive")}</td>
          <td>${formatDate(b.createdAt)}</td>
          <td>${b.id === activeBranchId ? '<span class="pill">Active</span>' : '<span class="muted">Inactive</span>'}</td>
          <td>${actions}</td>
        </tr>
      `;
    })
    .join("");
}

function renderStaffRows(staff, branchNameById, canManageStaff) {
  return staff
    .map((s) => {
      const branchNames = (s.branchIds || []).map((id) => branchNameById[id] || id).join(", ") || "All";
      const actions = canManageStaff
        ? `<div class="actions">
            <button class="btn btn-secondary btn-xs" data-action="edit-staff" data-id="${s.id}">Edit</button>
            <button class="btn btn-danger btn-xs" data-action="delete-staff" data-id="${s.id}">Delete</button>
          </div>`
        : "-";
      return `
        <tr>
          <td>${escapeHtml(s.email || "-")}</td>
          <td>${escapeHtml(s.role || "-")}</td>
          <td>${escapeHtml(s.status || "invited")}</td>
          <td>${escapeHtml(branchNames)}</td>
          <td>${actions}</td>
        </tr>
      `;
    })
    .join("");
}

function renderShellNav(route, canManageStaff, canManageCompany) {
  return `
    <button class="nav-btn ${route === "/dashboard" ? "active" : ""}" data-go="/dashboard">Dashboard</button>
    <button class="nav-btn ${route === "/dashboard" ? "active" : ""}" data-go="/dashboard">Stock</button>
    <button class="nav-btn ${route === "/dashboard" ? "active" : ""}" data-go="/dashboard">Incoming</button>
    <button class="nav-btn ${route === "/dashboard" ? "active" : ""}" data-go="/dashboard">Sales</button>
    <button class="nav-btn ${route === "/dashboard" ? "active" : ""}" data-go="/dashboard">Clients</button>
    ${canManageStaff ? `<button class="nav-btn ${route === "/staff" ? "active" : ""}" data-go="/staff">Staff</button>` : ""}
    ${canManageCompany ? `<button class="nav-btn ${route === "/settings" ? "active" : ""}" data-go="/settings">Settings</button>` : ""}
  `;
}

export function renderAppShell(data) {
  const activeBranch = data.branches.find((b) => b.id === data.activeBranchId);
  const canManageBranches = data.permissions.manageBranches;
  const canManageStaff = data.permissions.manageStaff;
  const canManageCompany = data.permissions.manageCompany;
  const branchOptions = data.branches
    .map((b) => `<option value="${b.id}" ${b.id === data.activeBranchId ? "selected" : ""}>${escapeHtml(b.name)}</option>`)
    .join("");

  const branchTable = data.loading
    ? `<div class="loader-wrap"><div class="loader"></div></div>`
    : data.error
    ? `<div class="error-box">${escapeHtml(data.error)}<div style="margin-top:8px;"><button class="btn btn-secondary btn-xs" id="retryBtn">Retry</button></div></div>`
    : data.branches.length
    ? `<table class="table">
        <thead>
          <tr><th>Name</th><th>Address</th><th>Status</th><th>Created</th><th>Current</th><th>Actions</th></tr>
        </thead>
        <tbody>${renderBranchRows(data.branches, data.activeBranchId, canManageBranches)}</tbody>
      </table>`
    : `<div class="empty-state"><div><h4>No branches</h4><p class="muted">Create your first branch to get started.</p>${canManageBranches ? '<button class="btn btn-primary" id="openCreateBranchBtn">Create branch</button>' : ""}</div></div>`;

  const branchById = Object.fromEntries(data.branches.map((b) => [b.id, b.name]));

  const staffTable = data.staffLoading
    ? `<div class="loader-wrap"><div class="loader"></div></div>`
    : !canManageStaff
    ? `<div class="error-box">No access to staff module.</div>`
    : `<table class="table">
        <thead>
          <tr><th>Email</th><th>Role</th><th>Status</th><th>Branches</th><th>Actions</th></tr>
        </thead>
        <tbody>${renderStaffRows(data.staff || [], branchById, canManageStaff)}</tbody>
      </table>`;

  let mainContent = `
    <div class="card">
      <div class="card-head">
        <div>
          <h3>Branch management</h3>
          <div class="muted">Company branches and active status</div>
        </div>
        ${canManageBranches ? '<button class="btn btn-primary" id="openCreateBranchBtn">+ Add branch</button>' : ""}
      </div>
      ${branchTable}
    </div>

    <div class="card">
      <h3>Active branch</h3>
      ${
        activeBranch
          ? `<div style="margin-bottom:8px;"><strong>${escapeHtml(activeBranch.name)}</strong></div>
             <div class="muted">${escapeHtml(activeBranch.address || "Address not set")}</div>
             <div class="muted" style="margin-top:6px;">Status: ${escapeHtml(activeBranch.status || "inactive")}</div>`
          : `<div class="muted">No branch selected</div>`
      }
    </div>
  `;

  if (data.route === "/staff") {
    mainContent = `
      <div class="card" style="grid-column:1 / -1;">
        <div class="card-head">
          <div>
            <h3>Staff</h3>
            <div class="muted">Invite and manage employees in current company</div>
          </div>
          ${canManageStaff ? '<button class="btn btn-primary" id="openCreateStaffBtn">+ Add staff</button>' : ""}
        </div>
        ${staffTable}
      </div>
    `;
  }

  if (data.route === "/settings") {
    mainContent = `
      <div class="card" style="grid-column:1 / -1;">
        <h3>Company settings</h3>
        ${
          canManageCompany
            ? `<div class="muted">Name: ${escapeHtml(data.company?.name || "-")}</div>
               <div class="muted">Currency: ${escapeHtml(data.company?.currency || "-")}</div>
               <div class="muted">Timezone: ${escapeHtml(data.company?.timezone || "-")}</div>`
            : `<div class="error-box">No access to company settings.</div>`
        }
      </div>
    `;
  }

  return `
    <div class="app-shell">
      <aside class="sidebar ${data.sidebarOpen ? "open" : ""}" id="sidebar">
        <div class="brand"><span class="brand-dot"></span><h2>Fabric Automation</h2></div>
        <div class="nav-title">Modules</div>
        ${renderShellNav(data.route, canManageStaff, canManageCompany)}
      </aside>

      <section class="main">
        <header class="topbar">
          <div class="topbar-left">
            <button class="btn btn-secondary mobile-menu" id="toggleSidebarBtn">Menu</button>
            <div>
              <h1>${data.route === "/staff" ? "Staff" : data.route === "/settings" ? "Settings" : "Dashboard"}</h1>
              <p class="topbar-sub">${escapeHtml(data.company?.name || "")}</p>
            </div>
          </div>
          <div style="display:flex;align-items:center;gap:8px;">
            <select id="activeBranchSelect">${branchOptions}</select>
            <button class="btn btn-secondary" id="goBranchPickerBtn">Branches</button>
            <button class="btn btn-secondary" id="logoutBtn">Logout</button>
          </div>
        </header>

        <section class="content">${mainContent}</section>
      </section>
    </div>

    ${renderBranchModal(data)}
    ${renderDeleteModal(data)}
    ${renderStaffModal(data)}
  `;
}

export function renderBranchModal(data) {
  const modal = data.branchModal || { open: false, mode: "create", id: "", values: {} };
  return `
    <div class="modal ${modal.open ? "open" : ""}" id="branchModal">
      <div class="modal-card">
        <h3 style="margin-top:0;">${modal.mode === "edit" ? "Edit branch" : "Create branch"}</h3>
        <form id="branchForm">
          <div class="form-group"><label>Name</label><input id="branchName" required value="${escapeHtml(modal.values.name || "")}" /></div>
          <div class="form-group"><label>Address</label><input id="branchAddress" value="${escapeHtml(modal.values.address || "")}" /></div>
          <div class="form-group"><label>Status</label>
            <select id="branchStatus">
              <option value="active" ${modal.values.status === "active" ? "selected" : ""}>active</option>
              <option value="inactive" ${modal.values.status !== "active" ? "selected" : ""}>inactive</option>
            </select>
          </div>
          <div class="error-text" id="branchFormError"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="closeBranchModalBtn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function renderStaffModal(data) {
  const modal = data.staffModal || { open: false, mode: "create", id: "", values: {} };
  const options = (data.branches || [])
    .map(
      (b) => `<label style="display:flex;align-items:center;gap:8px;margin-bottom:6px;"><input type="checkbox" data-branch-checkbox value="${b.id}" ${
        (modal.values.branchIds || []).includes(b.id) ? "checked" : ""
      } style="width:auto;"/>${escapeHtml(b.name)}</label>`
    )
    .join("");

  return `
    <div class="modal ${modal.open ? "open" : ""}" id="staffModal">
      <div class="modal-card">
        <h3 style="margin-top:0;">${modal.mode === "edit" ? "Edit staff" : "Add staff"}</h3>
        <form id="staffForm">
          <div class="form-group"><label>Email</label><input id="staffEmail" type="email" required value="${escapeHtml(modal.values.email || "")}" /></div>
          <div class="form-group"><label>Role</label>
            <select id="staffRole">
              <option>OWNER</option><option>ADMIN</option><option>MANAGER</option><option>CASHIER</option><option>STOCKER</option><option>VIEWER</option>
            </select>
          </div>
          <div class="form-group">
            <label>Branch access</label>
            <div>${options || '<span class="muted">No branches yet</span>'}</div>
          </div>
          <div class="error-text" id="staffFormError"></div>
          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" id="closeStaffModalBtn">Cancel</button>
            <button type="submit" class="btn btn-primary">Save</button>
          </div>
        </form>
      </div>
    </div>
  `;
}

export function renderDeleteModal(data) {
  const modal = data.deleteModal || { open: false, kind: "", id: "" };
  return `
    <div class="modal ${modal.open ? "open" : ""}" id="deleteModal">
      <div class="modal-card">
        <h3 style="margin-top:0;">Delete ${escapeHtml(modal.kind || "item")}?</h3>
        <div class="muted">This action cannot be undone.</div>
        <div class="modal-actions">
          <button class="btn btn-secondary" id="cancelDeleteBtn" type="button">Cancel</button>
          <button class="btn btn-danger" id="confirmDeleteBtn" type="button">Delete</button>
        </div>
      </div>
    </div>
  `;
}
