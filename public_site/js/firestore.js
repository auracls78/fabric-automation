import { initializeApp, getApp, getApps } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  orderBy,
  serverTimestamp,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { ROLE, defaultPermissions } from "./permissions.js";

const firebaseConfig = window.__FIREBASE_CONFIG__ || null;
const app = firebaseConfig ? (getApps().length ? getApp() : initializeApp(firebaseConfig)) : null;
const db = app ? getFirestore(app) : null;

function assertDb() {
  if (!db) throw new Error("Firestore is not configured");
}

export function getCompanyIdForOwner(uid) {
  // We choose companyId = owner uid for O(1) lookup from users/{uid} and easy ownership checks.
  return uid;
}

export async function ensureUserDoc(user) {
  assertDb();
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);
  if (snap.exists()) return snap.data();

  const payload = {
    email: user.email || "",
    role: ROLE.OWNER,
    companyId: null,
    staffId: null,
    activeBranchId: null,
    createdAt: serverTimestamp(),
  };
  await setDoc(ref, payload);
  return payload;
}

export async function getUserDoc(uid) {
  assertDb();
  const snap = await getDoc(doc(db, "users", uid));
  return snap.exists() ? snap.data() : null;
}

export async function createCompanyForOwner(ownerUser, payload) {
  assertDb();
  const companyId = getCompanyIdForOwner(ownerUser.uid);
  const companyRef = doc(db, "companies", companyId);
  const companySnap = await getDoc(companyRef);

  if (!companySnap.exists()) {
    await setDoc(companyRef, {
      name: payload.name,
      phone: payload.phone || "",
      currency: payload.currency || "UZS",
      timezone: payload.timezone || "Asia/Tashkent",
      ownerUid: ownerUser.uid,
      createdAt: serverTimestamp(),
    });
  }

  const branchRef = await addDoc(collection(db, "companies", companyId, "branches"), {
    name: "Main",
    address: "",
    status: "active",
    createdAt: serverTimestamp(),
  });

  const staffId = ownerUser.uid;
  await setDoc(doc(db, "companies", companyId, "staff", staffId), {
    email: ownerUser.email || "",
    userUid: ownerUser.uid,
    role: ROLE.OWNER,
    permissions: defaultPermissions(ROLE.OWNER),
    branchIds: [branchRef.id],
    status: "active",
    createdAt: serverTimestamp(),
  });

  await setDoc(
    doc(db, "users", ownerUser.uid),
    {
      email: ownerUser.email || "",
      companyId,
      staffId,
      role: ROLE.OWNER,
      activeBranchId: branchRef.id,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );

  localStorage.setItem("activeBranchId", branchRef.id);
  return { companyId, branchId: branchRef.id };
}

export async function loadCompanyContext(uid) {
  assertDb();
  const userData = await getUserDoc(uid);
  if (!userData?.companyId) {
    return {
      userData: userData || null,
      company: null,
      staffMe: null,
      branches: [],
    };
  }

  const companyId = userData.companyId;
  const [companySnap, staffSnap, branchSnap] = await Promise.all([
    getDoc(doc(db, "companies", companyId)),
    userData.staffId ? getDoc(doc(db, "companies", companyId, "staff", userData.staffId)) : Promise.resolve(null),
    getDocs(query(collection(db, "companies", companyId, "branches"), orderBy("createdAt", "asc"))),
  ]);

  const branches = branchSnap.docs.map((item) => {
    const data = item.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Date.now();
    return {
      id: item.id,
      name: data.name || "Untitled",
      address: data.address || "",
      status: data.status || "inactive",
      createdAt,
    };
  });

  return {
    userData,
    company: companySnap.exists() ? { id: companySnap.id, ...companySnap.data() } : null,
    staffMe: staffSnap && staffSnap.exists() ? { id: staffSnap.id, ...staffSnap.data() } : null,
    branches,
  };
}

export async function setActiveBranch(uid, branchId) {
  assertDb();
  await updateDoc(doc(db, "users", uid), {
    activeBranchId: branchId,
    updatedAt: serverTimestamp(),
  });
  localStorage.setItem("activeBranchId", branchId);
}

export async function listBranches(companyId) {
  assertDb();
  const snap = await getDocs(query(collection(db, "companies", companyId, "branches"), orderBy("createdAt", "asc")));
  return snap.docs.map((item) => {
    const data = item.data();
    const createdAt = data.createdAt?.toDate ? data.createdAt.toDate().getTime() : Date.now();
    return {
      id: item.id,
      name: data.name || "Untitled",
      address: data.address || "",
      status: data.status || "inactive",
      createdAt,
    };
  });
}

export async function createBranch(companyId, payload) {
  assertDb();
  const ref = await addDoc(collection(db, "companies", companyId, "branches"), {
    name: payload.name,
    address: payload.address || "",
    status: payload.status || "inactive",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateBranch(companyId, branchId, patch) {
  assertDb();
  await updateDoc(doc(db, "companies", companyId, "branches", branchId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteBranch(companyId, branchId) {
  assertDb();
  await deleteDoc(doc(db, "companies", companyId, "branches", branchId));
}

export async function listStaff(companyId) {
  assertDb();
  const snap = await getDocs(query(collection(db, "companies", companyId, "staff"), orderBy("createdAt", "asc")));
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
}

export async function createStaff(companyId, payload) {
  assertDb();
  const ref = await addDoc(collection(db, "companies", companyId, "staff"), {
    email: payload.email,
    userUid: payload.userUid || null,
    role: payload.role,
    permissions: payload.permissions,
    branchIds: payload.branchIds || [],
    status: payload.status || "invited",
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateStaff(companyId, staffId, patch) {
  assertDb();
  await updateDoc(doc(db, "companies", companyId, "staff", staffId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteStaff(companyId, staffId) {
  assertDb();
  await deleteDoc(doc(db, "companies", companyId, "staff", staffId));
}
