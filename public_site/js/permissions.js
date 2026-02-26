export const ROLE = {
  OWNER: "OWNER",
  ADMIN: "ADMIN",
  MANAGER: "MANAGER",
  CASHIER: "CASHIER",
  STOCKER: "STOCKER",
  VIEWER: "VIEWER",
};

const ROLE_PERMISSIONS = {
  OWNER: {
    manageCompany: true,
    manageBranches: true,
    manageStaff: true,
    viewReports: true,
    sell: true,
    manageStock: true,
  },
  ADMIN: {
    manageCompany: true,
    manageBranches: true,
    manageStaff: true,
    viewReports: true,
    sell: true,
    manageStock: true,
  },
  MANAGER: {
    manageCompany: false,
    manageBranches: true,
    manageStaff: true,
    viewReports: true,
    sell: true,
    manageStock: true,
  },
  CASHIER: {
    manageCompany: false,
    manageBranches: false,
    manageStaff: false,
    viewReports: false,
    sell: true,
    manageStock: false,
  },
  STOCKER: {
    manageCompany: false,
    manageBranches: false,
    manageStaff: false,
    viewReports: true,
    sell: false,
    manageStock: true,
  },
  VIEWER: {
    manageCompany: false,
    manageBranches: false,
    manageStaff: false,
    viewReports: true,
    sell: false,
    manageStock: false,
  },
};

export function defaultPermissions(role) {
  return { ...(ROLE_PERMISSIONS[role] || ROLE_PERMISSIONS.VIEWER) };
}

export function can(permission, staff) {
  if (!staff) return false;
  if (staff.role === ROLE.OWNER) return true;
  return Boolean(staff.permissions?.[permission]);
}
