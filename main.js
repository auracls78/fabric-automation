import { auth } from "./js/auth.js";

const app = document.getElementById("app");
if (typeof window.__API_BASE__ === "undefined") {
  console.error("config.js is missing: window.__API_BASE__ is undefined");
}

function navigate(view, data) {
  if (view === "login") renderLogin();
  else if (view === "register") renderRegister();
  else if (view === "verify") renderVerify(data);
  else if (view === "dashboard") {
    if (!auth.isAuthenticated()) {
      navigate("login");
      return;
    }
    renderDashboard();
  }
}

function renderLogin() {
  app.innerHTML = `
    <div class="glass-card">
      <h1>Welcome Back</h1>
      <p class="subtitle">Please enter your details to sign in</p>
      <form id="loginForm">
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="email" required placeholder="name@company.com">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="password" required placeholder="........">
        </div>
        <div id="loginError" class="error-message"></div>
        <button type="submit">Sign In</button>
      </form>
      <div class="footer-text">
        Don't have an account? <span class="text-link" id="gotoRegister">Sign up</span>
      </div>
    </div>
  `;

  document.getElementById("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    try {
      await auth.login(email, password);
      navigate("dashboard");
    } catch (err) {
      document.getElementById("loginError").textContent = err.message;
    }
  });

  document.getElementById("gotoRegister").addEventListener("click", () => navigate("register"));
}

function renderRegister() {
  app.innerHTML = `
    <div class="glass-card">
      <h1>Create Account</h1>
      <p class="subtitle">Join our fabric automation platform</p>
      <form id="registerForm">
        <div class="form-group">
          <label>Email Address</label>
          <input type="email" id="regEmail" required placeholder="name@company.com">
        </div>
        <div class="form-group">
          <label>Password</label>
          <input type="password" id="regPassword" required placeholder="Minimum 8 characters">
        </div>
        <div id="regError" class="error-message"></div>
        <button type="submit">Get Started</button>
      </form>
      <div class="footer-text">
        Already have an account? <span class="text-link" id="gotoLogin">Sign in</span>
      </div>
    </div>
  `;

  document.getElementById("registerForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.getElementById("regEmail").value;
    const password = document.getElementById("regPassword").value;
    try {
      await auth.register(email, password);
      navigate("verify", { email });
    } catch (err) {
      document.getElementById("regError").textContent = err.message;
    }
  });

  document.getElementById("gotoLogin").addEventListener("click", () => navigate("login"));
}

function renderVerify(data) {
  const email = data?.email || "";
  app.innerHTML = `
    <div class="glass-card">
      <h1>Verify Email</h1>
      <p class="subtitle">Enter the 6-digit code sent to ${email}</p>
      <form id="verifyForm">
        <div class="form-group">
          <label>Verification Code</label>
          <input type="text" id="verifyCode" required minlength="6" maxlength="6" placeholder="123456">
        </div>
        <div id="verifyError" class="error-message"></div>
        <button type="submit">Verify</button>
      </form>
      <div class="footer-text">
        Wrong email? <span class="text-link" id="backToRegister">Go back</span>
      </div>
    </div>
  `;

  document.getElementById("verifyForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const code = document.getElementById("verifyCode").value;
    try {
      await auth.verify(email, code);
      alert("Email verified successfully! You can now log in.");
      navigate("login");
    } catch (err) {
      document.getElementById("verifyError").textContent = err.message;
    }
  });

  document.getElementById("backToRegister").addEventListener("click", () => navigate("register"));
}

function renderDashboard() {
  const user = auth.getCurrentUser();
  if (!user || !user.email) {
    console.error("Invalid auth state: missing currentUser, redirecting to login");
    auth.logout();
    navigate("login");
    return;
  }
  app.innerHTML = `
    <div class="glass-card dashboard-container">
      <div class="header-actions">
        <h1>My Company</h1>
        <button class="btn-secondary btn-sm" id="logoutBtn">Logout</button>
      </div>
      <p class="subtitle">Welcome, ${user.email}. Manage your branches below.</p>

      <div class="header-actions" style="margin-top: 2rem;">
        <h2 style="font-size: 1.25rem;">Branches</h2>
        <button class="btn-sm" id="addBranchBtn">+ Add Branch</button>
      </div>

      <div id="branchList" class="branch-list"></div>
    </div>

    <div id="branchModal" style="display:none; position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.8); z-index:10; justify-content:center; align-items:center;">
      <div class="glass-card" style="max-width: 400px; width: 90%;">
        <h2>Add New Branch</h2>
        <form id="branchForm" style="margin-top: 1.5rem;">
          <div class="form-group">
            <label>Branch Name</label>
            <input type="text" id="branchName" required placeholder="Main Street Branch">
          </div>
          <div class="form-group">
            <label>Location</label>
            <input type="text" id="branchLocation" required placeholder="City Center, 123">
          </div>
          <div style="display:flex; gap: 1rem;">
            <button type="button" class="btn-secondary" id="closeModal">Cancel</button>
            <button type="submit">Save Branch</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const branchList = document.getElementById("branchList");
  const branchModal = document.getElementById("branchModal");

  const refreshBranches = async () => {
    try {
      const branches = await auth.listBranches();
      branchList.innerHTML = branches.length
        ? ""
        : '<p style="text-align:center; color:var(--text-dim);">No branches added yet.</p>';

      branches.forEach((branch) => {
        const div = document.createElement("div");
        div.className = "branch-item";
        div.innerHTML = `
          <div>
            <div style="font-weight:600;">${branch.name}</div>
            <div style="font-size:0.8rem; color:var(--text-dim);">${branch.location}</div>
          </div>
          <div style="font-size:0.75rem; background:rgba(99, 102, 241, 0.2); padding:0.25rem 0.5rem; border-radius:8px; color:var(--primary);">Active</div>
        `;
        branchList.appendChild(div);
      });
    } catch (err) {
      branchList.innerHTML = `<p class="error-message">${err.message}</p>`;
    }
  };

  refreshBranches();

  document.getElementById("logoutBtn").addEventListener("click", async () => {
    await auth.logout();
    navigate("login");
  });

  document.getElementById("addBranchBtn").addEventListener("click", () => {
    branchModal.style.display = "flex";
  });

  document.getElementById("closeModal").addEventListener("click", () => {
    branchModal.style.display = "none";
  });

  document.getElementById("branchForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const name = document.getElementById("branchName").value;
    const location = document.getElementById("branchLocation").value;
    try {
      await auth.addBranch(name, location);
      branchModal.style.display = "none";
      e.target.reset();
      refreshBranches();
    } catch (err) {
      alert(err.message);
    }
  });
}

if (auth.isAuthenticated()) {
  navigate("dashboard");
} else {
  navigate("login");
}
