"use client";

import type {
  User,
  Site,
  AssetType,
  AssetInstance,
  AssetTest,
  Notification,
  AuthSession,
  ReactiveJob,
  PlannedJob,
  WorksCompleted,
  SupplyChainCompany,
  Permit,
  PermitAttachment,
  SiteComplianceStatus,
} from "./types";
import {
  DEMO_USERS,
  DEMO_SITES,
  DEMO_ASSET_TYPES,
  DEMO_ASSET_INSTANCES,
  DEMO_ASSET_TESTS,
  DEMO_NOTIFICATIONS,
  DEMO_REACTIVE_JOBS,
  DEMO_PLANNED_JOBS,
  DEMO_WORKS_COMPLETED,
  DEMO_SUPPLY_CHAIN,
  DEMO_PERMITS,
} from "./demo-data";

// ─── Storage Keys ─────────────────────────────────────────────────────────────
const KEYS = {
  USERS: "es_users",
  SITES: "es_sites",
  ASSET_TYPES: "es_asset_types",
  ASSET_INSTANCES: "es_asset_instances",
  ASSET_TESTS: "es_asset_tests",
  NOTIFICATIONS: "es_notifications",
  REACTIVE_JOBS: "es_reactive_jobs",
  PLANNED_JOBS: "es_planned_jobs",
  WORKS_COMPLETED: "es_works_completed",
  SUPPLY_CHAIN: "es_supply_chain",
  PERMITS: "es_permits",
  SESSION: "es_session",
  SEEDED: "es_seeded",
};

const SEED_VERSION = "v10"; // bump this to reseed all demo data

// ─── Seed ─────────────────────────────────────────────────────────────────────
export function seedIfNeeded(): void {
  if (typeof window === "undefined") return;
  const seeded = localStorage.getItem(KEYS.SEEDED);
  if (seeded === SEED_VERSION) return;

  localStorage.setItem(KEYS.USERS, JSON.stringify(DEMO_USERS));
  localStorage.setItem(KEYS.SITES, JSON.stringify(DEMO_SITES));
  localStorage.setItem(KEYS.ASSET_TYPES, JSON.stringify(DEMO_ASSET_TYPES));
  localStorage.setItem(KEYS.ASSET_INSTANCES, JSON.stringify(DEMO_ASSET_INSTANCES));
  localStorage.setItem(KEYS.ASSET_TESTS, JSON.stringify(DEMO_ASSET_TESTS));
  localStorage.setItem(KEYS.NOTIFICATIONS, JSON.stringify(DEMO_NOTIFICATIONS));
  localStorage.setItem(KEYS.REACTIVE_JOBS, JSON.stringify(DEMO_REACTIVE_JOBS));
  localStorage.setItem(KEYS.PLANNED_JOBS, JSON.stringify(DEMO_PLANNED_JOBS));
  localStorage.setItem(KEYS.WORKS_COMPLETED, JSON.stringify(DEMO_WORKS_COMPLETED));
  localStorage.setItem(KEYS.SUPPLY_CHAIN, JSON.stringify(DEMO_SUPPLY_CHAIN));
  localStorage.setItem(KEYS.PERMITS, JSON.stringify(DEMO_PERMITS));
  localStorage.setItem(KEYS.SEEDED, SEED_VERSION);
}

// ─── Generic helpers ──────────────────────────────────────────────────────────
function getAll<T>(key: string): T[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(key) ?? "[]") as T[];
  } catch {
    return [];
  }
}

function setAll<T>(key: string, data: T[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(data));
}

// ─── Users ────────────────────────────────────────────────────────────────────
export function getUsers(): User[] {
  return getAll<User>(KEYS.USERS);
}

export function saveUser(user: User): void {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === user.id);
  if (idx >= 0) users[idx] = user;
  else users.push(user);
  setAll(KEYS.USERS, users);
}

export function deleteUser(userId: string): void {
  const users = getUsers().filter((u) => u.id !== userId);
  setAll(KEYS.USERS, users);
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    return JSON.parse(localStorage.getItem(KEYS.SESSION) ?? "null") as AuthSession | null;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession | null): void {
  if (typeof window === "undefined") return;
  if (session) {
    localStorage.setItem(KEYS.SESSION, JSON.stringify(session));
  } else {
    localStorage.removeItem(KEYS.SESSION);
  }
}

export function login(email: string, password: string): User | null {
  const users = getUsers();
  const user = users.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && u.passwordHash === password && u.isActive
  );
  if (!user) return null;
  // Update last login
  user.lastLogin = new Date().toISOString();
  saveUser(user);
  setSession({ userId: user.id, role: user.role });
  return user;
}

export function logout(): void {
  setSession(null);
}

export function getCurrentUser(): User | null {
  const session = getSession();
  if (!session) return null;
  const users = getUsers();
  return users.find((u) => u.id === session.userId) ?? null;
}

// ─── Sites ────────────────────────────────────────────────────────────────────
export function getSites(): Site[] {
  return getAll<Site>(KEYS.SITES);
}

export function saveSite(site: Site): void {
  const sites = getSites();
  const idx = sites.findIndex((s) => s.id === site.id);
  if (idx >= 0) sites[idx] = site;
  else sites.push(site);
  setAll(KEYS.SITES, sites);
}

export function deleteSite(siteId: string): void {
  const sites = getSites().filter((s) => s.id !== siteId);
  setAll(KEYS.SITES, sites);
}

// ─── Asset Types ──────────────────────────────────────────────────────────────
export function getAssetTypes(): AssetType[] {
  return getAll<AssetType>(KEYS.ASSET_TYPES);
}

export function saveAssetType(at: AssetType): void {
  const types = getAssetTypes();
  const idx = types.findIndex((t) => t.id === at.id);
  if (idx >= 0) types[idx] = at;
  else types.push(at);
  setAll(KEYS.ASSET_TYPES, types);
}

export function deleteAssetType(id: string): void {
  const types = getAssetTypes().filter((t) => t.id !== id);
  setAll(KEYS.ASSET_TYPES, types);
}

// ─── Asset Instances ──────────────────────────────────────────────────────────
export function getAssetInstances(): AssetInstance[] {
  return getAll<AssetInstance>(KEYS.ASSET_INSTANCES);
}

export function saveAssetInstance(ai: AssetInstance): void {
  const instances = getAssetInstances();
  const idx = instances.findIndex((i) => i.id === ai.id);
  if (idx >= 0) instances[idx] = ai;
  else instances.push(ai);
  setAll(KEYS.ASSET_INSTANCES, instances);
}

export function deleteAssetInstance(id: string): void {
  const instances = getAssetInstances().filter((i) => i.id !== id);
  setAll(KEYS.ASSET_INSTANCES, instances);
}

// ─── Asset Tests ──────────────────────────────────────────────────────────────
export function getAssetTests(): AssetTest[] {
  return getAll<AssetTest>(KEYS.ASSET_TESTS);
}

export function saveAssetTest(test: AssetTest): void {
  const tests = getAssetTests();
  const idx = tests.findIndex((t) => t.id === test.id);
  if (idx >= 0) tests[idx] = test;
  else tests.push(test);
  setAll(KEYS.ASSET_TESTS, tests);
  // Update the asset instance's lastTestDate and result
  const instances = getAssetInstances();
  const instanceIdx = instances.findIndex((i) => i.id === test.assetInstanceId);
  if (instanceIdx >= 0) {
    instances[instanceIdx].lastTestDate = test.testDate;
    instances[instanceIdx].lastTestResult = test.result;
    instances[instanceIdx].nextTestDue = test.nextTestDate;
    setAll(KEYS.ASSET_INSTANCES, instances);
  }
}

export function deleteAssetTest(id: string): void {
  const tests = getAssetTests().filter((t) => t.id !== id);
  setAll(KEYS.ASSET_TESTS, tests);
}

// ─── Notifications ───────────────────────────��────────────────────────────────
export function getNotifications(): Notification[] {
  return getAll<Notification>(KEYS.NOTIFICATIONS).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function markNotificationRead(id: string): void {
  const notifications = getNotifications();
  const idx = notifications.findIndex((n) => n.id === id);
  if (idx >= 0) {
    notifications[idx].read = true;
    setAll(KEYS.NOTIFICATIONS, notifications);
  }
}

export function markAllNotificationsRead(): void {
  const notifications = getNotifications().map((n) => ({ ...n, read: true }));
  setAll(KEYS.NOTIFICATIONS, notifications);
}

export function addNotification(notification: Notification): void {
  const notifications = getNotifications();
  notifications.unshift(notification);
  setAll(KEYS.NOTIFICATIONS, notifications);
}

// ─── ID generation ────────────────────────────────────────────────────────────
export function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

// ─── Reactive Jobs ────────────────────────────────────────────────────────────
export function getReactiveJobs(): ReactiveJob[] {
  return getAll<ReactiveJob>(KEYS.REACTIVE_JOBS).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
}

export function saveReactiveJob(job: ReactiveJob): void {
  const jobs = getReactiveJobs();
  const idx = jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) jobs[idx] = job;
  else jobs.push(job);
  setAll(KEYS.REACTIVE_JOBS, jobs);
}

export function deleteReactiveJob(id: string): void {
  const jobs = getReactiveJobs().filter((j) => j.id !== id);
  setAll(KEYS.REACTIVE_JOBS, jobs);
}

// ─── Planned Jobs ─────────────────────────────────────────────────────────────
export function getPlannedJobs(): PlannedJob[] {
  return getAll<PlannedJob>(KEYS.PLANNED_JOBS).sort(
    (a, b) => new Date(a.scheduledDate).getTime() - new Date(b.scheduledDate).getTime()
  );
}

export function savePlannedJob(job: PlannedJob): void {
  const jobs = getPlannedJobs();
  const idx = jobs.findIndex((j) => j.id === job.id);
  if (idx >= 0) jobs[idx] = job;
  else jobs.push(job);
  setAll(KEYS.PLANNED_JOBS, jobs);
}

export function deletePlannedJob(id: string): void {
  const jobs = getPlannedJobs().filter((j) => j.id !== id);
  setAll(KEYS.PLANNED_JOBS, jobs);
}

// ─── Works Completed ──────────────────────────────────────────────────────────
export function getWorksCompleted(): WorksCompleted[] {
  return getAll<WorksCompleted>(KEYS.WORKS_COMPLETED).sort(
    (a, b) => new Date(b.completedDate).getTime() - new Date(a.completedDate).getTime()
  );
}

export function saveWorksCompleted(record: WorksCompleted): void {
  const records = getWorksCompleted();
  const idx = records.findIndex((r) => r.id === record.id);
  if (idx >= 0) records[idx] = record;
  else records.push(record);
  setAll(KEYS.WORKS_COMPLETED, records);
}

export function deleteWorksCompleted(id: string): void {
  const records = getWorksCompleted().filter((r) => r.id !== id);
  setAll(KEYS.WORKS_COMPLETED, records);
}

export function approveWorksCompleted(
  id: string,
  approvedBy: string,
  approvedByUserId: string,
  approvalNotes: string,
): void {
  const records = getWorksCompleted();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return;
  records[idx] = {
    ...records[idx],
    approvalStatus: "approved",
    approvedBy,
    approvedByUserId,
    approvedAt: new Date().toISOString(),
    approvalNotes: approvalNotes || undefined,
    updatedAt: new Date().toISOString(),
  };
  setAll(KEYS.WORKS_COMPLETED, records);
}

export function rejectWorksCompleted(
  id: string,
  rejectedBy: string,
  rejectedByUserId: string,
  reason: string,
): void {
  const records = getWorksCompleted();
  const idx = records.findIndex((r) => r.id === id);
  if (idx < 0) return;
  records[idx] = {
    ...records[idx],
    approvalStatus: "rejected",
    approvedBy: rejectedBy,
    approvedByUserId: rejectedByUserId,
    approvedAt: new Date().toISOString(),
    approvalNotes: reason || undefined,
    updatedAt: new Date().toISOString(),
  };
  setAll(KEYS.WORKS_COMPLETED, records);
}

// Public portal submission — no auth required, creates job with source="portal"
export function submitPortalJob(job: ReactiveJob): void {
  saveReactiveJob(job);
  // Auto-create a notification for admins
  addNotification({
    id: generateId("ntf"),
    type: "job_created",
    title: `New Job Submitted: ${job.title}`,
    message: `A reactive job was submitted via the portal by ${job.contactName ?? job.createdBy}.`,
    read: false,
    createdAt: new Date().toISOString(),
    linkTo: "/reactive-jobs",
  });
}

// ─── Supply Chain ─────────────────────────────────────────────────────────────
export function getSupplyChain(): SupplyChainCompany[] {
  return getAll<SupplyChainCompany>(KEYS.SUPPLY_CHAIN).sort((a, b) =>
    a.name.localeCompare(b.name)
  );
}

export function saveSupplyChainCompany(company: SupplyChainCompany): void {
  const companies = getSupplyChain();
  const idx = companies.findIndex((c) => c.id === company.id);
  if (idx >= 0) companies[idx] = company;
  else companies.push(company);
  setAll(KEYS.SUPPLY_CHAIN, companies);
}

export function deleteSupplyChainCompany(id: string): void {
  const companies = getSupplyChain().filter((c) => c.id !== id);
  setAll(KEYS.SUPPLY_CHAIN, companies);
}

// ─── Permits ──────────────────────────────────────────────────────────────────
export function getPermits(): Permit[] {
  return getAll<Permit>(KEYS.PERMITS).sort(
    (a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime()
  );
}

export function savePermit(permit: Permit): void {
  const permits = getPermits();
  const idx = permits.findIndex((p) => p.id === permit.id);
  if (idx >= 0) permits[idx] = permit;
  else permits.push(permit);
  setAll(KEYS.PERMITS, permits);
}

export function deletePermit(id: string): void {
  const permits = getPermits().filter((p) => p.id !== id);
  setAll(KEYS.PERMITS, permits);
}

// Close a permit (contractor submits completion from /permit/close/[id])
// Auto-creates a WorksCompleted record and marks the permit as "closed"
export function closePermit(
  permitId: string,
  closedByName: string,
  closedByEmail: string,
  closureNotes: string,
  closureAttachments: PermitAttachment[],
): { permit: Permit; worksRecord: WorksCompleted } | null {
  const permit = getPermits().find((p) => p.id === permitId);
  if (!permit) return null;

  const now = new Date().toISOString();

  // Derive PTW reference (same formula as status page)
  const permitRef = `PTW-${permit.id.split("_")[1]?.slice(-6).toUpperCase() ?? permit.id.slice(-6).toUpperCase()}`;

  // Create a WorksCompleted record
  const wcId = generateId("wc");
  const wcRecord: WorksCompleted = {
    id: wcId,
    siteId: permit.siteId,
    jobTitle: permit.workDescription.length > 80
      ? permit.workDescription.slice(0, 80) + "…"
      : permit.workDescription,
    workCarriedOut: closureNotes || `Works completed as per approved permit ${permitRef}. Contractor: ${permit.contractorName} (${permit.contractorCompany}).`,
    completedBy: `${closedByName} — ${permit.contractorCompany}`,
    completedDate: now.slice(0, 10),
    linkedJobType: "permit",
    linkedPermitId: permitId,
    permitRef,
    startDate: permit.plannedStartDate,
    endDate: permit.plannedEndDate,
    locationOnSite: permit.locationOnSite,
    attachments: closureAttachments.map((a) => ({
      id: a.id,
      name: a.name,
      type: a.type,
      dataUrl: a.dataUrl,
      uploadedAt: a.uploadedAt,
    })),
    approvalStatus: "pending_approval",
    createdAt: now,
    updatedAt: now,
  };

  saveWorksCompleted(wcRecord);

  // Update the permit
  const updatedPermit: Permit = {
    ...permit,
    status: "closed",
    closedAt: now,
    closedByName,
    closedByEmail,
    closureNotes,
    closureAttachments,
    worksCompletedRecordId: wcId,
  };
  savePermit(updatedPermit);

  addNotification({
    id: generateId("ntf"),
    type: "job_completed",
    title: `Permit Closed: ${permit.contractorCompany}`,
    message: `${closedByName} from ${permit.contractorCompany} has submitted job completion for permit ${permitRef}. A works completed record has been created.`,
    read: false,
    createdAt: now,
    linkTo: "/works-completed",
  });

  return { permit: updatedPermit, worksRecord: wcRecord };
}

// ─── Compliance ───────────────────────────────────────────────────────────────

/**
 * Calculate compliance status for a single site.
 * - "compliant"     → all assets have a passing most-recent test and none are overdue
 * - "warning"       → some assets have no test record yet or tests are overdue but none are failing
 * - "non-compliant" → at least one asset has lastTestResult === "fail"
 * - "no-data"       → site has no assets at all
 */
export function getSiteComplianceStatus(siteId: string): SiteComplianceStatus {
  const instances = getAssetInstances().filter((i) => i.siteId === siteId);
  const totalAssets = instances.length;

  if (totalAssets === 0) {
    return { siteId, level: "no-data", totalAssets: 0, failingAssets: 0, overdueAssets: 0, pendingAssets: 0 };
  }

  const todayStr = new Date().toISOString().split("T")[0];

  let failingAssets = 0;
  let overdueAssets = 0;
  let pendingAssets = 0;

  for (const inst of instances) {
    if (inst.lastTestResult === "fail") {
      failingAssets++;
    } else if (!inst.lastTestResult || inst.lastTestResult === "pending") {
      pendingAssets++;
      // Also flag as overdue if the nextTestDue has passed
      if (inst.nextTestDue < todayStr) overdueAssets++;
    } else if (inst.lastTestResult === "pass" && inst.nextTestDue < todayStr) {
      // Passed at some point but now the next test interval has passed
      overdueAssets++;
    }
  }

  let level: SiteComplianceStatus["level"];
  if (failingAssets > 0) {
    level = "non-compliant";
  } else if (overdueAssets > 0 || pendingAssets > 0) {
    level = "warning";
  } else {
    level = "compliant";
  }

  return { siteId, level, totalAssets, failingAssets, overdueAssets, pendingAssets };
}

/**
 * Returns compliance status for every site.
 */
export function getAllSiteComplianceStatuses(): SiteComplianceStatus[] {
  const sites = getSites();
  return sites.map((s) => getSiteComplianceStatus(s.id));
}

// Public contractor submission — no auth required
export function submitContractorPermit(permit: Permit): void {
  savePermit(permit);
  addNotification({
    id: generateId("ntf"),
    type: "job_created",
    title: `New Permit Request: ${permit.contractorCompany}`,
    message: `A permit to work has been submitted by ${permit.contractorName} (${permit.contractorCompany}) for ${permit.plannedStartDate}.`,
    read: false,
    createdAt: new Date().toISOString(),
    linkTo: "/permits",
  });
}
