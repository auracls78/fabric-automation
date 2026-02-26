const ACTIVE_BRANCH_KEY = "activeBranchId";

export function getActiveBranchId() {
  return localStorage.getItem(ACTIVE_BRANCH_KEY) || "";
}

export function setActiveBranchId(branchId) {
  if (!branchId) {
    localStorage.removeItem(ACTIVE_BRANCH_KEY);
    return;
  }
  localStorage.setItem(ACTIVE_BRANCH_KEY, branchId);
}
