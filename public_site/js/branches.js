import { createBranch, deleteBranch, listBranches, updateBranch, updateStaff } from "./firestore.js";

export function createBranchService(companyId) {
  return {
    async list() {
      return listBranches(companyId);
    },
    async create(payload) {
      return createBranch(companyId, payload);
    },
    async update(branchId, patch) {
      return updateBranch(companyId, branchId, patch);
    },
    async remove(branchId) {
      return deleteBranch(companyId, branchId);
    },
    async setActiveForStaff(staffId, branchId) {
      return updateStaff(companyId, staffId, {
        branchIds: [branchId],
      });
    },
  };
}
