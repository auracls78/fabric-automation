import { createStaff, deleteStaff, listStaff, updateStaff } from "./firestore.js";
import { defaultPermissions } from "./permissions.js";

export function createStaffService(companyId) {
  return {
    async list() {
      return listStaff(companyId);
    },
    async create(payload) {
      return createStaff(companyId, {
        email: payload.email,
        userUid: null,
        role: payload.role,
        permissions: payload.permissions || defaultPermissions(payload.role),
        branchIds: payload.branchIds || [],
        status: payload.status || "invited",
      });
    },
    async update(staffId, patch) {
      return updateStaff(companyId, staffId, patch);
    },
    async remove(staffId) {
      return deleteStaff(companyId, staffId);
    },
  };
}
