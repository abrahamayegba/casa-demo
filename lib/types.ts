// ─── Auth ─────────────────────────────────────────────────────────────────────
export type UserRole = "admin" | "viewer";

export interface User {
  id: string;
  name: string;
  email: string;
  passwordHash: string; // stored as plain-text for demo
  role: UserRole;
  avatar?: string;
  createdAt: string;
  lastLogin?: string;
  isActive: boolean;
}

export interface AuthSession {
  userId: string;
  role: UserRole;
}

// ─── Sites ────────────────────────────────────────────────────────────────────
export interface SiteContact {
  id: string;
  name: string;
  email: string;
  phone: string;
  role?: string; // e.g. "Site Manager", "Head of H&S"
  isPrimary: boolean;
}

export interface Site {
  id: string;
  simproId?: string;
  name: string;
  address: string;
  city: string;
  postcode: string;
  region: string;
  // Legacy single-contact fields (kept for backwards compatibility)
  primaryContact: string;
  primaryContactEmail: string;
  primaryContactPhone: string;
  // Multiple contacts support
  contacts?: SiteContact[];
  status: "active" | "inactive";
  createdAt: string;
  syncedFromSimpro?: boolean;
  attachments?: SiteAttachment[];
}

// ─── Asset Types (catalogue level) ────────────────────────────────────────────
export interface AssetType {
  id: string;
  name: string;
  code: string;
  description: string;
  testingIntervalMonths: number; // how often it should be tested
  createdAt: string;
}

// ─── Asset Instances (physical asset at a site) ───────────────────────────────
export interface AssetInstance {
  id: string;
  assetTypeId: string;
  siteId: string;
  serialNumber: string;
  location: string; // e.g. "Ground Floor Corridor"
  installDate: string;
  nextTestDue: string;
  lastTestDate?: string;
  lastTestResult?: "pass" | "fail" | "pending";
  notes?: string;
  createdAt: string;
}

// ─── Asset Tests ──────────────────────────────────────────────────────────────
export type TestResult = "pass" | "fail" | "pending";

export interface Attachment {
  id: string;
  name: string;
  type: string; // MIME type
  size: number; // bytes
  dataUrl: string; // base64 data URL (simulated upload) — empty string when url is provided
  url?: string; // public URL for real documents served from /public/docs/
  uploadedAt: string;
}

export interface AssetTest {
  id: string;
  assetInstanceId: string;
  testedBy: string;
  testedByUserId: string;
  testDate: string;
  result: TestResult;
  notes: string;
  failureReasons?: string[];
  attachments: Attachment[];
  certificateNumber?: string;
  nextTestDate: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Reactive Jobs (unplanned maintenance) ─────────────────────────────────────
export type ReactiveJobStatus = "open" | "in-progress" | "completed" | "cancelled";
export type ReactiveJobPriority = "low" | "medium" | "high" | "urgent";
export type ReactiveJobSource = "portal" | "manual";

export interface ReactiveJob {
  id: string;
  siteId: string;
  title: string;
  description: string;
  priority: ReactiveJobPriority;
  status: ReactiveJobStatus;
  source: ReactiveJobSource; // "portal" = submitted via public form, "manual" = created by admin
  createdBy: string;
  createdByUserId: string;
  // Intake / submitter details (populated when source = "portal")
  contactName?: string;
  contactPhone?: string;
  contactEmail?: string;
  assignedTo?: string;
  assignedToUserId?: string;
  assignedCompanyId?: string; // supply chain company id
  notes?: string;
  attachments: Attachment[];
  scheduledDate?: string; // ISO date — when the job is scheduled to be carried out
  completedAt?: string;
  closeNotes?: string; // notes added when closing via public link
  createdAt: string;
  updatedAt: string;
}

// ─── Planned Jobs (PPM / scheduled maintenance) ───────────────────────────────
export type PlannedJobStatus = "scheduled" | "in-progress" | "completed" | "cancelled";
export type PlannedJobFrequency = "one-off" | "monthly" | "quarterly" | "biannual" | "annual";

export interface PlannedJob {
  id: string;
  siteId: string;
  title: string;
  description: string;
  priority: ReactiveJobPriority;
  status: PlannedJobStatus;
  frequency: PlannedJobFrequency;
  scheduledDate: string; // ISO date — when the job is scheduled
  createdBy: string;
  createdByUserId: string;
  assignedTo?: string;
  assignedCompanyId?: string;
  notes?: string;
  attachments: Attachment[];
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Works Completed (temp job cards) ────────────────────────────────────────
export interface WorksCompletedAttachment {
  id: string;
  name: string;
  type: string; // MIME type
  dataUrl: string; // base64 data URL
  uploadedAt: string;
}

export type WorksCompletedApprovalStatus = "pending_approval" | "approved" | "rejected";

export interface WorksCompleted {
  id: string;
  siteId: string;
  jobTitle: string;
  workCarriedOut: string; // notes describing what was done
  completedBy: string; // name of person / contractor
  completedByUserId?: string;
  completedDate: string; // ISO date
  linkedJobId?: string; // optional ref to reactive/planned job
  linkedJobType?: "reactive" | "planned" | "permit";
  linkedPermitId?: string; // optional ref to a permit (when auto-created from permit closure)
  permitRef?: string; // the PTW reference number e.g. PTW-A1B2C3
  // Duration fields (populated from permit)
  startDate?: string;
  endDate?: string;
  locationOnSite?: string;
  attachments: WorksCompletedAttachment[]; // JPEGs / docs uploaded
  // Approval workflow
  approvalStatus?: WorksCompletedApprovalStatus; // only for permit-linked records
  approvedBy?: string;
  approvedByUserId?: string;
  approvedAt?: string;
  approvalNotes?: string;
  createdAt: string;
  updatedAt: string;
}

// ─── Supply Chain ─────────────────────────────────────────────────────────────
export interface SupplyChainCompany {
  id: string;
  name: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string;
  address: string;
  city: string;
  postcode: string;
  specialisms: string[]; // e.g. ["LOLER", "Fire Safety", "PAT Testing"]
  insuranceExpiryDate: string; // ISO date string
  status: "active" | "inactive";
  createdAt: string;
}

// ─── Site Attachments ─────────────────────────────────────────────────────────
export interface SiteAttachment {
  id: string;
  name: string;
  description: string;
  url: string; // opens in new tab (fake URL for demo)
  type: string; // e.g. "Lease Agreement", "Risk Assessment"
  uploadedAt: string;
}

// ─── Permits ──────────────────────────────────────────────────────────────────
export type PermitStatus = "pending" | "approved" | "rejected" | "expired" | "closed";
export type PermitWorkType =
  | "general_maintenance"
  | "electrical"
  | "hot_works"
  | "confined_space"
  | "working_at_height"
  | "excavation"
  | "asbestos_adjacent"
  | "roof_access"
  | "plant_room"
  | "other";

export interface PermitAttachment {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  uploadedAt: string;
}

export interface HotWorksDailyInspection {
  date: string;
  timeStart: string;
  timeEnd: string;
  inspectorName: string;
  areaChecked: boolean;
  fireExtinguisherPresent: boolean;
  hotWorkCompleted: boolean;
  areaInspectedAfter: boolean;
}

export interface Permit {
  id: string;
  siteId: string;
  // Contractor / company details
  contractorCompany: string;
  contractorName: string;
  contractorEmail: string;
  contractorPhone: string;
  supervisorOnSite: string;
  // Work details
  workType: PermitWorkType;
  workDescription: string;
  locationOnSite: string;
  plannedStartDate: string; // ISO date
  plannedEndDate: string; // ISO date
  estimatedWorkers: number;
  // RAMS (compulsory — file upload required)
  ramsReference: string;
  ramsReviewedOnSite: boolean;
  ramsAttachmentId?: string; // ID of the uploaded RAMS file within attachments[]
  // Risk / safety
  hasRiskAssessment: boolean;
  hasMethodStatement: boolean;
  hasPublicLiabilityInsurance: boolean;
  insuranceExpiryDate?: string;
  // Safety precautions checklist (20 items matching the original PTW form)
  safetyIsolationRequired: boolean;        // 1.  Have you been given a copy of the Site Safety Rules?
  safetyBarriersRequired: boolean;         // 2.  Has a risk assessment been carried out?
  safetyPermitDisplayed: boolean;          // 3.  Are the workforce qualified to carry out the task?
  safetyAreaClear: boolean;                // 4.  Is appropriate PPE available?
  safetyToolboxTalk: boolean;              // 5.  Isolated electrical supply? (Electricity at Work regs)
  safetyFirstAidAvailable: boolean;        // 6.  Voltage detection instrument required?
  safetyVentilationAdequate: boolean;      // 7.  Isolator locked off / tagged? (I.E.E. Wiring regs BS7671)
  safetyServicesLocated: boolean;          // 8.  Is work being carried out at height?
  safetyEquipmentInspected: boolean;       // 9.  Are ladders or Scaffolding required - in safe condition?
  safetyEmergencyStopTested: boolean;      // 10. Is a license required and in place for scaffolding?
  safetyFireExtsAvailable: boolean;        // 11. Are personnel aware of means of escape and raising alarm?
  safetyHotWorkPrecautions: boolean;       // 12. Risk of falling objects?
  safetyConfinedSpaceAtmosphere: boolean;  // 13. Details of fragile roof explained?
  safetyRescuePlanInPlace: boolean;        // 14. Are at least two fire extinguishers available?
  safetyLiftingEquipmentChecked: boolean;  // 15. Are personnel trained in use of fire extinguishers?
  safetyScaffoldInspected: boolean;        // 16. Have flammable liquids / materials been removed from area?
  safetyChemicalsSegregated: boolean;      // 17. Have Gas cylinders been properly secured?
  safetyNoiseControls: boolean;            // 18. Is safe access and egress confirmed?
  safetyWasteDisposalPlan: boolean;        // 19. Are personnel trained and supplied with Breathing Apparatus?
  safetySiteInductionComplete: boolean;    // 20. Lifebelt and rope held on outside of confined space?
  // Special permit flags
  asbestosSpecialPermitRequired: boolean; // hard stop — must contact office
  // Specific hazard checks
  hazardElectrical: boolean;
  hazardHotWorks: boolean;
  hazardAsbestos: boolean;
  hazardConfined: boolean;
  hazardHeight: boolean;
  hazardChemicals: boolean;
  hazardManualHandling: boolean;
  hazardNoise: boolean;
  // PPE checks
  ppeHardHat: boolean;
  ppeHighVis: boolean;
  ppeSafetyBoots: boolean;
  ppeGloves: boolean;
  ppeEyeProtection: boolean;
  ppeRespirator: boolean;
  // Hot works specific
  hotWorksDailyInspections?: HotWorksDailyInspection[];
  fireWatchName?: string;
  fireWatchPhone?: string;
  fireWatchDurationMinutes?: number;
  // Emergency
  emergencyProcedure: string;
  nearestFirstAid: string;
  nearestFireExit: string;
  assemblyPoint?: string;
  // File uploads
  attachments: PermitAttachment[];
  // Admin
  status: PermitStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  reviewedByUserId?: string;
  rejectionReason?: string;
  approvalNotes?: string;
  // Signature / declaration
  declarationAgreed: boolean;
  declarationName: string;
  declarationDate: string;
  // Job closure (filled in by contractor via /permit/close/[id])
  closedAt?: string;
  closedByName?: string;
  closedByEmail?: string;
  closureNotes?: string;
  closureAttachments?: PermitAttachment[];
  worksCompletedRecordId?: string; // links to the auto-created WorksCompleted record
}

// ─── Site Compliance ──────────────────────────────────────────────────────────
export type SiteComplianceLevel = "compliant" | "warning" | "non-compliant" | "no-data";

export interface SiteComplianceStatus {
  siteId: string;
  level: SiteComplianceLevel;
  totalAssets: number;
  failingAssets: number;   // assets with lastTestResult === "fail"
  overdueAssets: number;   // assets with nextTestDue in the past (and not currently passing)
  pendingAssets: number;   // assets with lastTestResult === "pending" or no test yet
}

// ─── Notifications ────────────────────────────────────────────────────────────
export type NotificationType =
  | "test_due"
  | "test_overdue"
  | "test_failed"
  | "test_passed"
  | "asset_added"
  | "site_synced"
  | "user_added"
  | "job_created"
  | "job_assigned"
  | "job_completed"
  | "supplier_insurance_expired";

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  linkTo?: string; // optional deep link
  metadata?: Record<string, string>;
}
