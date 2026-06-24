"use client";

import { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  getSites,
  submitContractorPermit,
  generateId,
  seedIfNeeded,
} from "@/lib/store";
import type {
  Site,
  PermitWorkType,
  HotWorksDailyInspection,
} from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  ShieldAlert,
  HardHat,
  Flame,
  ChevronRight,
  ChevronLeft,
  ClipboardList,
  Upload,
  X,
  Info,
  CheckSquare,
  AlertTriangle,
  Search,
  Plus,
  Trash2,
  BookOpen,
  Shield,
  PhoneCall,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

const WORK_TYPES: { value: PermitWorkType; label: string }[] = [
  { value: "general_maintenance", label: "General Maintenance" },
  { value: "electrical", label: "Electrical Works" },
  { value: "hot_works", label: "Hot Works (welding, soldering, cutting)" },
  { value: "confined_space", label: "Confined Space Entry" },
  { value: "working_at_height", label: "Working at Height" },
  { value: "excavation", label: "Excavation / Ground Works" },
  { value: "asbestos_adjacent", label: "Works Adjacent to Asbestos" },
  { value: "roof_access", label: "Roof Access" },
  { value: "plant_room", label: "Plant Room Access" },
  { value: "other", label: "Other" },
];

const STEPS = [
  { id: 1, label: "Your Details", icon: User },
  { id: 2, label: "Work Details", icon: ClipboardList },
  { id: 3, label: "Precautions", icon: Shield },
  { id: 4, label: "Hazards & PPE", icon: ShieldAlert },
  { id: 5, label: "Emergency", icon: AlertTriangle },
  { id: 6, label: "RAMS & Docs", icon: BookOpen },
  { id: 7, label: "Declaration", icon: CheckSquare },
];

// All 20 safety precautions matching the original PTW form
const SAFETY_PRECAUTIONS = [
  {
    id: "safetyIsolationRequired",
    label: "Have you been given a copy of the Site Safety Rules?",
  },
  {
    id: "safetyBarriersRequired",
    label: "Has a risk assessment been carried out?",
  },
  {
    id: "safetyPermitDisplayed",
    label: "Are the workforce qualified to carry out the task?",
  },
  {
    id: "safetyAreaClear",
    label: "Is appropriate PPE available? (Tick box for Protective Equipment)",
  },
  {
    id: "safetyToolboxTalk",
    label:
      "Isolated electrical supply? Work in accordance with current Electricity at Work regs.",
  },
  {
    id: "safetyFirstAidAvailable",
    label: "Voltage detection instrument required?",
  },
  {
    id: "safetyVentilationAdequate",
    label:
      "Isolator locked off / tagged? Work in accordance with I.E.E. Wiring regs. (BS7671).",
  },
  {
    id: "safetyServicesLocated",
    label: "Is work being carried out at height?",
  },
  {
    id: "safetyEquipmentInspected",
    label:
      "Are ladders or Scaffolding required - Maintained in safe cond. - ready to use?",
  },
  {
    id: "safetyEmergencyStopTested",
    label: "Is a license required and in place for scaffolding?",
  },
  {
    id: "safetyFireExtsAvailable",
    label:
      "Are personnel aware of means of escape and method of raising alarm?",
  },
  { id: "safetyHotWorkPrecautions", label: "Risk of falling objects?" },
  {
    id: "safetyConfinedSpaceAtmosphere",
    label: "Details of fragile roof explained?",
  },
  {
    id: "safetyRescuePlanInPlace",
    label: "Are at least two fire extinguishers available?",
  },
  {
    id: "safetyLiftingEquipmentChecked",
    label: "Are personnel trained in use of fire extinguishers?",
  },
  {
    id: "safetyScaffoldInspected",
    label: "Have flammable liquids / materials been removed from area?",
  },
  {
    id: "safetyChemicalsSegregated",
    label: "Have Gas cylinders been properly secured?",
  },
  { id: "safetyNoiseControls", label: "Is safe access and egress confirmed?" },
  {
    id: "safetyWasteDisposalPlan",
    label: "Are personnel trained and supplied with Breathing Apparatus?",
  },
  {
    id: "safetySiteInductionComplete",
    label: "Lifebelt and rope held on outside of confined space?",
  },
] as const;

type SafetyPrecautionKey = (typeof SAFETY_PRECAUTIONS)[number]["id"];

const DEMO_DATA = {
  contractorCompany: "Caledonian Fire & Safety Ltd",
  contractorName: "Stuart Wallace",
  contractorEmail: "stuart.wallace@caledonianfire.co.uk",
  contractorPhone: "07712 334 891",
  supervisorOnSite: "Stuart Wallace",
  workType: "general_maintenance" as PermitWorkType,
  workDescription:
    "Annual service and inspection of all fire extinguishers across the building. Replacing any discharged units and tagging serviced equipment.",
  locationOnSite: "All floors — Ground, First, Second and Plant Room",
  plannedStartDate: new Date().toISOString().split("T")[0],
  plannedEndDate: new Date().toISOString().split("T")[0],
  estimatedWorkers: "2",
  ramsReference: "RAMS-CAL-2024-047",
  ramsReviewedOnSite: true,
  hazardManualHandling: true,
  ppeSafetyBoots: true,
  ppeGloves: true,
  emergencyProcedure:
    "Follow site evacuation procedure. Assembly point at front car park. Call 999 then site manager.",
  nearestFirstAid: "Reception (Ground Floor)",
  nearestFireExit: "Main entrance or rear fire exit on each floor",
  assemblyPoint: "Front car park",
  hasRiskAssessment: true,
  hasMethodStatement: true,
  hasPublicLiabilityInsurance: true,
  insuranceExpiryDate: "2026-12-31",
  declarationName: "Stuart Wallace",
};

interface FilePreview {
  id: string;
  name: string;
  type: string;
  size: number;
  dataUrl: string;
  isRams?: boolean; // tagged as the RAMS upload
}

function emptyDailyInspection(): HotWorksDailyInspection {
  return {
    date: new Date().toISOString().split("T")[0],
    timeStart: "",
    timeEnd: "",
    inspectorName: "",
    areaChecked: false,
    fireExtinguisherPresent: false,
    hotWorkCompleted: false,
    areaInspectedAfter: false,
  };
}

export default function PermitPage() {
  const [step, setStep] = useState<"form" | "asbestos_stop" | "success">(
    "form",
  );
  const [currentStep, setCurrentStep] = useState(1);
  const [sites, setSites] = useState<Site[]>([]);
  const [submittedRef, setSubmittedRef] = useState("");
  const [submittedId, setSubmittedId] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const ramsFileInputRef = useRef<HTMLInputElement>(null);

  // Step 1 — Contractor details
  const [contractorCompany, setContractorCompany] = useState("");
  const [contractorName, setContractorName] = useState("");
  const [contractorEmail, setContractorEmail] = useState("");
  const [contractorPhone, setContractorPhone] = useState("");
  const [supervisorOnSite, setSupervisorOnSite] = useState("");
  const [siteId, setSiteId] = useState("");

  // Step 2 — Work details
  const [workType, setWorkType] = useState<PermitWorkType | "">("");
  const [workDescription, setWorkDescription] = useState("");
  const [locationOnSite, setLocationOnSite] = useState("");
  const [plannedStartDate, setPlannedStartDate] = useState("");
  const [plannedEndDate, setPlannedEndDate] = useState("");
  const [estimatedWorkers, setEstimatedWorkers] = useState("1");

  // Step 3 — Safety Precautions (all 20)
  const [asbestosSpecialPermitRequired, setAsbestosSpecialPermitRequired] =
    useState(false);
  const [safetyPrecautions, setSafetyPrecautions] = useState<
    Record<SafetyPrecautionKey, boolean>
  >(
    () =>
      Object.fromEntries(
        SAFETY_PRECAUTIONS.map((p) => [p.id, false]),
      ) as Record<SafetyPrecautionKey, boolean>,
  );
  // Hot works specific
  const [fireWatchName, setFireWatchName] = useState("");
  const [fireWatchPhone, setFireWatchPhone] = useState("");
  const [fireWatchDurationMinutes, setFireWatchDurationMinutes] =
    useState("60");
  const [hotWorksDailyInspections, setHotWorksDailyInspections] = useState<
    HotWorksDailyInspection[]
  >([emptyDailyInspection()]);

  // Step 4 — Hazard Identification
  const [hazardElectrical, setHazardElectrical] = useState(false);
  const [hazardHotWorks, setHazardHotWorks] = useState(false);
  const [hazardAsbestos, setHazardAsbestos] = useState(false);
  const [hazardConfined, setHazardConfined] = useState(false);
  const [hazardHeight, setHazardHeight] = useState(false);
  const [hazardChemicals, setHazardChemicals] = useState(false);
  const [hazardManualHandling, setHazardManualHandling] = useState(false);
  const [hazardNoise, setHazardNoise] = useState(false);
  // Step 4 — Protective Equipment (PPE)
  const [ppeHardHat, setPpeHardHat] = useState(false);
  const [ppeHighVis, setPpeHighVis] = useState(false);
  const [ppeSafetyBoots, setPpeSafetyBoots] = useState(false);
  const [ppeGloves, setPpeGloves] = useState(false);
  const [ppeEyeProtection, setPpeEyeProtection] = useState(false);
  const [ppeRespirator, setPpeRespirator] = useState(false);

  // Step 5 — Emergency
  const [emergencyProcedure, setEmergencyProcedure] = useState("");
  const [nearestFirstAid, setNearestFirstAid] = useState("");
  const [nearestFireExit, setNearestFireExit] = useState("");
  const [assemblyPoint, setAssemblyPoint] = useState("");

  // Step 6 — RAMS & Documents
  const [ramsReference, setRamsReference] = useState("");
  const [ramsReviewedOnSite, setRamsReviewedOnSite] = useState(false);
  const [ramsFile, setRamsFile] = useState<FilePreview | null>(null); // compulsory upload
  const [hasRiskAssessment, setHasRiskAssessment] = useState(false);
  const [hasMethodStatement, setHasMethodStatement] = useState(false);
  const [hasPublicLiabilityInsurance, setHasPublicLiabilityInsurance] =
    useState(false);
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState("");
  const [attachments, setAttachments] = useState<FilePreview[]>([]);

  // Step 7 — Declaration
  const [declarationAgreed, setDeclarationAgreed] = useState(false);
  const [declarationName, setDeclarationName] = useState("");

  const isHotWorks = workType === "hot_works";

  useEffect(() => {
    seedIfNeeded();
    const loadedSites = getSites().filter((s) => s.status === "active");
    setSites(loadedSites);
  }, []);

  useEffect(() => {
    if (contractorName && !declarationName) setDeclarationName(contractorName);
  }, [contractorName, declarationName]);

  function togglePrecaution(key: SafetyPrecautionKey) {
    setSafetyPrecautions((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function fillDemoData(loadedSites?: Site[]) {
    const siteList = loadedSites ?? sites;
    setContractorCompany(DEMO_DATA.contractorCompany);
    setContractorName(DEMO_DATA.contractorName);
    setContractorEmail(DEMO_DATA.contractorEmail);
    setContractorPhone(DEMO_DATA.contractorPhone);
    setSupervisorOnSite(DEMO_DATA.supervisorOnSite);
    setSiteId(siteList[0]?.id ?? "");
    setWorkType(DEMO_DATA.workType);
    setWorkDescription(DEMO_DATA.workDescription);
    setLocationOnSite(DEMO_DATA.locationOnSite);
    setPlannedStartDate(DEMO_DATA.plannedStartDate);
    setPlannedEndDate(DEMO_DATA.plannedEndDate);
    setEstimatedWorkers(DEMO_DATA.estimatedWorkers);
    setSafetyPrecautions((prev) => ({
      ...prev,
      safetyAreaClear: true,
      safetyFirstAidAvailable: true,
      safetyToolboxTalk: true,
      safetyPermitDisplayed: true,
      safetyEquipmentInspected: true,
      safetyFireExtsAvailable: true,
      safetyServicesLocated: true,
      safetySiteInductionComplete: true,
    }));
    setHazardManualHandling(DEMO_DATA.hazardManualHandling);
    setPpeSafetyBoots(DEMO_DATA.ppeSafetyBoots);
    setPpeGloves(DEMO_DATA.ppeGloves);
    setEmergencyProcedure(DEMO_DATA.emergencyProcedure);
    setNearestFirstAid(DEMO_DATA.nearestFirstAid);
    setNearestFireExit(DEMO_DATA.nearestFireExit);
    setAssemblyPoint(DEMO_DATA.assemblyPoint);
    setRamsReference(DEMO_DATA.ramsReference);
    setRamsReviewedOnSite(DEMO_DATA.ramsReviewedOnSite);
    setHasRiskAssessment(DEMO_DATA.hasRiskAssessment);
    setHasMethodStatement(DEMO_DATA.hasMethodStatement);
    setHasPublicLiabilityInsurance(DEMO_DATA.hasPublicLiabilityInsurance);
    setInsuranceExpiryDate(DEMO_DATA.insuranceExpiryDate);
    setDeclarationName(DEMO_DATA.declarationName);
    setDeclarationAgreed(true);
    // Create a fake demo RAMS file so step 6 is valid
    setRamsFile({
      id: generateId("att"),
      name: "RAMS-CAL-2024-047.pdf",
      type: "application/pdf",
      size: 204800,
      dataUrl: "data:application/pdf;base64,JVBERi0=", // minimal stub
      isRams: true,
    });
  }

  function isStepValid(s: number): boolean {
    switch (s) {
      case 1:
        return !!(
          contractorCompany.trim() &&
          contractorName.trim() &&
          contractorEmail.trim() &&
          contractorPhone.trim() &&
          supervisorOnSite.trim() &&
          siteId
        );
      case 2:
        return !!(
          workType &&
          workDescription.trim() &&
          locationOnSite.trim() &&
          plannedStartDate &&
          plannedEndDate &&
          parseInt(estimatedWorkers) > 0
        );
      case 3:
        if (isHotWorks && (!fireWatchName.trim() || !fireWatchPhone.trim()))
          return false;
        return true;
      case 4:
        return true;
      case 5:
        return !!(
          emergencyProcedure.trim() &&
          nearestFirstAid.trim() &&
          nearestFireExit.trim() &&
          assemblyPoint.trim()
        );
      case 6:
        // RAMS file upload is compulsory (for demo just reference is enough, but file required)
        return !!(ramsFile && ramsReference.trim() && ramsReviewedOnSite);
      case 7:
        return !!(declarationAgreed && declarationName.trim());
      default:
        return false;
    }
  }

  function handleRamsFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRamsFile({
        id: generateId("att"),
        name: file.name,
        type: file.type,
        size: file.size,
        dataUrl: ev.target?.result as string,
        isRams: true,
      });
    };
    reader.readAsDataURL(file);
    if (ramsFileInputRef.current) ramsFileInputRef.current.value = "";
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachments((prev) => [
          ...prev,
          {
            id: generateId("att"),
            name: file.name,
            type: file.type,
            size: file.size,
            dataUrl: ev.target?.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(id: string) {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  }

  function updateDailyInspection(
    index: number,
    field: keyof HotWorksDailyInspection,
    value: string | boolean,
  ) {
    setHotWorksDailyInspections((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function handleNext() {
    if (currentStep === 3 && asbestosSpecialPermitRequired) {
      setStep("asbestos_stop");
      return;
    }
    setCurrentStep((s) => s + 1);
  }

  function handleSubmit() {
    if (!isStepValid(7)) return;
    const id = generateId("pmt");
    const allAttachments = [
      ...(ramsFile
        ? [
            {
              id: ramsFile.id,
              name: ramsFile.name,
              type: ramsFile.type,
              size: ramsFile.size,
              dataUrl: ramsFile.dataUrl,
              uploadedAt: new Date().toISOString(),
            },
          ]
        : []),
      ...attachments.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        size: a.size,
        dataUrl: a.dataUrl,
        uploadedAt: new Date().toISOString(),
      })),
    ];
    submitContractorPermit({
      id,
      siteId,
      contractorCompany: contractorCompany.trim(),
      contractorName: contractorName.trim(),
      contractorEmail: contractorEmail.trim(),
      contractorPhone: contractorPhone.trim(),
      supervisorOnSite: supervisorOnSite.trim(),
      workType: workType as PermitWorkType,
      workDescription: workDescription.trim(),
      locationOnSite: locationOnSite.trim(),
      plannedStartDate,
      plannedEndDate,
      estimatedWorkers: parseInt(estimatedWorkers),
      ramsReference: ramsReference.trim(),
      ramsReviewedOnSite,
      ramsAttachmentId: ramsFile?.id,
      hasRiskAssessment,
      hasMethodStatement,
      hasPublicLiabilityInsurance,
      insuranceExpiryDate: insuranceExpiryDate || undefined,
      // Safety precautions — spread all 20
      asbestosSpecialPermitRequired,
      safetyIsolationRequired: safetyPrecautions.safetyIsolationRequired,
      safetyBarriersRequired: safetyPrecautions.safetyBarriersRequired,
      safetyPermitDisplayed: safetyPrecautions.safetyPermitDisplayed,
      safetyAreaClear: safetyPrecautions.safetyAreaClear,
      safetyToolboxTalk: safetyPrecautions.safetyToolboxTalk,
      safetyFirstAidAvailable: safetyPrecautions.safetyFirstAidAvailable,
      safetyVentilationAdequate: safetyPrecautions.safetyVentilationAdequate,
      safetyServicesLocated: safetyPrecautions.safetyServicesLocated,
      safetyEquipmentInspected: safetyPrecautions.safetyEquipmentInspected,
      safetyEmergencyStopTested: safetyPrecautions.safetyEmergencyStopTested,
      safetyFireExtsAvailable: safetyPrecautions.safetyFireExtsAvailable,
      safetyHotWorkPrecautions: safetyPrecautions.safetyHotWorkPrecautions,
      safetyConfinedSpaceAtmosphere:
        safetyPrecautions.safetyConfinedSpaceAtmosphere,
      safetyRescuePlanInPlace: safetyPrecautions.safetyRescuePlanInPlace,
      safetyLiftingEquipmentChecked:
        safetyPrecautions.safetyLiftingEquipmentChecked,
      safetyScaffoldInspected: safetyPrecautions.safetyScaffoldInspected,
      safetyChemicalsSegregated: safetyPrecautions.safetyChemicalsSegregated,
      safetyNoiseControls: safetyPrecautions.safetyNoiseControls,
      safetyWasteDisposalPlan: safetyPrecautions.safetyWasteDisposalPlan,
      safetySiteInductionComplete:
        safetyPrecautions.safetySiteInductionComplete,
      // Hazards
      hazardElectrical,
      hazardHotWorks,
      hazardAsbestos,
      hazardConfined,
      hazardHeight,
      hazardChemicals,
      hazardManualHandling,
      hazardNoise,
      // PPE
      ppeHardHat,
      ppeHighVis,
      ppeSafetyBoots,
      ppeGloves,
      ppeEyeProtection,
      ppeRespirator,
      // Hot works
      ...(isHotWorks && {
        fireWatchName: fireWatchName.trim(),
        fireWatchPhone: fireWatchPhone.trim(),
        fireWatchDurationMinutes: parseInt(fireWatchDurationMinutes) || 60,
        hotWorksDailyInspections,
      }),
      emergencyProcedure: emergencyProcedure.trim(),
      nearestFirstAid: nearestFirstAid.trim(),
      nearestFireExit: nearestFireExit.trim(),
      assemblyPoint: assemblyPoint.trim(),
      attachments: allAttachments,
      status: "pending",
      submittedAt: new Date().toISOString(),
      declarationAgreed,
      declarationName: declarationName.trim(),
      declarationDate: new Date().toISOString().split("T")[0],
    });
    setSubmittedRef(`PTW-${id.split("_")[1].slice(-6).toUpperCase()}`);
    setSubmittedId(id);
    setStep("success");
  }

  function resetForm() {
    setStep("form");
    setCurrentStep(1);
    setContractorCompany("");
    setContractorName("");
    setContractorEmail("");
    setContractorPhone("");
    setSupervisorOnSite("");
    setSiteId("");
    setWorkType("");
    setWorkDescription("");
    setLocationOnSite("");
    setPlannedStartDate("");
    setPlannedEndDate("");
    setEstimatedWorkers("1");
    setAsbestosSpecialPermitRequired(false);
    setSafetyPrecautions(
      Object.fromEntries(
        SAFETY_PRECAUTIONS.map((p) => [p.id, false]),
      ) as Record<SafetyPrecautionKey, boolean>,
    );
    setFireWatchName("");
    setFireWatchPhone("");
    setFireWatchDurationMinutes("60");
    setHotWorksDailyInspections([emptyDailyInspection()]);
    setHazardElectrical(false);
    setHazardHotWorks(false);
    setHazardAsbestos(false);
    setHazardConfined(false);
    setHazardHeight(false);
    setHazardChemicals(false);
    setHazardManualHandling(false);
    setHazardNoise(false);
    setPpeHardHat(false);
    setPpeHighVis(false);
    setPpeSafetyBoots(false);
    setPpeGloves(false);
    setPpeEyeProtection(false);
    setPpeRespirator(false);
    setEmergencyProcedure("");
    setNearestFirstAid("");
    setNearestFireExit("");
    setAssemblyPoint("");
    setRamsReference("");
    setRamsReviewedOnSite(false);
    setRamsFile(null);
    setHasRiskAssessment(false);
    setHasMethodStatement(false);
    setHasPublicLiabilityInsurance(false);
    setInsuranceExpiryDate("");
    setAttachments([]);
    setDeclarationAgreed(false);
    setDeclarationName("");
    setSubmittedId("");
  }

  const statusUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/permit/status?ref=${submittedRef}`
      : `/permit/status?ref=${submittedRef}`;

  // ── Asbestos hard-stop screen ──
  if (step === "asbestos_stop") {
    return (
      <div className="min-h-screen bg-[var(--brand-bg)] flex flex-col">
        <PermitHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center">
              <AlertTriangle className="w-10 h-10 text-red-600" />
            </div>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-foreground">
                Special Permit Required
              </h1>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed max-w-sm mx-auto">
                You have indicated that asbestos or ACMs are present and a
                special asbestos permit is required. This type of work{" "}
                <strong>cannot proceed</strong> without prior authorisation from
                our team.
              </p>
            </div>
            <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-5 w-full text-sm text-red-900 flex flex-col gap-3">
              <p className="font-semibold flex items-center gap-2">
                <PhoneCall className="w-4 h-4 shrink-0" />
                You must contact us before proceeding
              </p>
              <p className="text-red-800 leading-relaxed">
                Do <strong>not</strong> commence any work near
                asbestos-containing materials until you have spoken directly
                with the facilities management team and received written
                authorisation.
              </p>
              <div className="border-t border-red-200 pt-3 flex flex-col gap-1.5">
                <p className="text-xs text-red-700 font-medium">
                  Contact Ignite Consultancy:
                </p>
                <a
                  href="tel:+441234567890"
                  className="text-sm font-semibold text-red-800 hover:underline"
                >
                  01234 567 890
                </a>
                <a
                  href="mailto:permits@ignite-consultancy.co.uk"
                  className="text-sm font-semibold text-red-800 hover:underline"
                >
                  permits@ignite-consultancy.co.uk
                </a>
              </div>
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setAsbestosSpecialPermitRequired(false);
                  setStep("form");
                }}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Go Back
              </Button>
              <Button variant="outline" onClick={resetForm}>
                Start Over
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Success screen ──
  if (step === "success") {
    return (
      <div className="min-h-screen bg-[var(--brand-bg)] flex flex-col">
        <PermitHeader />
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="w-full max-w-md text-center flex flex-col items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-green-100 flex items-center justify-center">
              <CheckCircle2 className="w-10 h-10 text-green-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                Permit Submitted
              </h1>
              <p className="text-muted-foreground text-sm mt-2 leading-relaxed max-w-sm mx-auto">
                Your permit to work has been submitted and is awaiting approval
                by the site facilities manager. You will be notified once a
                decision is made.
              </p>
            </div>
            <div className="bg-card rounded-xl border border-border px-8 py-6 flex flex-col items-center gap-4 w-full">
              <div className="flex flex-col items-center gap-1">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">
                  Reference Number
                </p>
                <p className="text-3xl font-bold tracking-widest text-[var(--brand-purple)]">
                  {submittedRef}
                </p>
                <p className="text-xs text-muted-foreground">
                  Please keep this for your records.
                </p>
              </div>
              <div className="border-t border-border w-full pt-4 flex flex-col items-center gap-2">
                <p className="text-xs text-muted-foreground">
                  Scan to check permit status
                </p>
                <div className="p-3 bg-white rounded-lg border border-border shadow-sm">
                  <QRCodeSVG
                    value={statusUrl}
                    size={140}
                    level="M"
                    includeMargin={false}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground text-center max-w-[200px] leading-relaxed">
                  Share this QR code with your team to quickly check the
                  approval status on any device.
                </p>
              </div>
            </div>
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 text-left w-full">
              <strong>Important:</strong> Do not begin any work on site until
              you have received written approval. Commencing work without an
              approved permit may result in the permit being revoked.
            </div>
            <Link
              href="/permit/status"
              className="text-sm text-[var(--brand-purple)] underline underline-offset-2 hover:opacity-80 transition-opacity flex items-center gap-1"
            >
              <Search className="w-3.5 h-3.5" /> Check another permit status
            </Link>
            <Button variant="outline" onClick={resetForm}>
              Submit Another Permit
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex flex-col">
      <PermitHeader />
      <main className="flex-1 flex flex-col items-center px-4 py-8">
        <div className="w-full max-w-[720px]">
          {/* Title */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground text-balance">
                Permit to Work Application
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
                Complete all sections below. Your permit will be reviewed by the
                site facilities manager before work can commence. Do not start
                any work until approval is confirmed.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fillDemoData()}
              className="shrink-0 text-xs border border-dashed border-border rounded-lg px-3 py-1.5 text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
            >
              Fill demo data
            </button>
          </div>

          {/* Step progress */}
          <div className="flex items-center gap-1 mb-6 overflow-x-auto pb-1">
            {STEPS.map((s, i) => {
              const isActive = s.id === currentStep;
              const isDone = s.id < currentStep;
              return (
                <div key={s.id} className="flex items-center gap-1 shrink-0">
                  <div
                    className={cn(
                      "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                      isActive && "bg-[var(--brand-purple)] text-white",
                      isDone && "bg-green-100 text-green-700",
                      !isActive && !isDone && "bg-muted text-muted-foreground",
                    )}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    ) : (
                      <s.icon className="w-3.5 h-3.5" />
                    )}
                    <span className="hidden sm:block">{s.label}</span>
                    <span className="sm:hidden">{s.id}</span>
                  </div>
                  {i < STEPS.length - 1 && (
                    <div
                      className={cn(
                        "w-4 h-px",
                        isDone ? "bg-green-300" : "bg-border",
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>

          {/* Form card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-6">
            {/* ── Step 1: Contractor Details ── */}
            {currentStep === 1 && (
              <div className="flex flex-col gap-5">
                <SectionTitle
                  icon={User}
                  title="Contractor & Company Details"
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor="company">
                      Company Name <Req />
                    </Label>
                    <Input
                      id="company"
                      placeholder="e.g. Caledonian Fire & Safety Ltd"
                      value={contractorCompany}
                      onChange={(e) => setContractorCompany(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="name">
                      Contact Name <Req />
                    </Label>
                    <Input
                      id="name"
                      placeholder="e.g. Stuart Wallace"
                      value={contractorName}
                      onChange={(e) => setContractorName(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="supervisor">
                      Supervisor on Site <Req />
                    </Label>
                    <Input
                      id="supervisor"
                      placeholder="Name of person supervising works"
                      value={supervisorOnSite}
                      onChange={(e) => setSupervisorOnSite(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="email">
                      Email Address <Req />
                    </Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        id="email"
                        type="email"
                        className="pl-8"
                        placeholder="you@company.co.uk"
                        value={contractorEmail}
                        onChange={(e) => setContractorEmail(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="phone">
                      Phone Number <Req />
                    </Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                      <Input
                        id="phone"
                        className="pl-8"
                        placeholder="07700 900 000"
                        value={contractorPhone}
                        onChange={(e) => setContractorPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site">
                    Site <Req />
                  </Label>
                  <Select value={siteId} onValueChange={setSiteId}>
                    <SelectTrigger className="w-full" id="site">
                      <SelectValue placeholder="Select the site you will be working at..." />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          <div className="flex items-center gap-2">
                            <Building2 className="w-3.5 h-3.5 text-muted-foreground" />
                            {s.name}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* ── Step 2: Work Details ── */}
            {currentStep === 2 && (
              <div className="flex flex-col gap-5">
                <SectionTitle
                  icon={ClipboardList}
                  title="Description of Works"
                />
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="workType">
                    Type of Work <Req />
                  </Label>
                  <Select
                    value={workType}
                    onValueChange={(v) => setWorkType(v as PermitWorkType)}
                  >
                    <SelectTrigger className="w-full" id="workType">
                      <SelectValue placeholder="Select work type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {WORK_TYPES.map((w) => (
                        <SelectItem key={w.value} value={w.value}>
                          {w.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="workDesc">
                    Full Description of Works <Req />
                  </Label>
                  <Textarea
                    id="workDesc"
                    placeholder="Provide a detailed description of the work to be carried out, including methods and equipment used..."
                    rows={4}
                    className="resize-none"
                    value={workDescription}
                    onChange={(e) => setWorkDescription(e.target.value)}
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="location">
                    Location on Site <Req />
                  </Label>
                  <Input
                    id="location"
                    placeholder="e.g. Plant Room, Ground Floor Corridor, Roof..."
                    value={locationOnSite}
                    onChange={(e) => setLocationOnSite(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="startDate">
                      Planned Start Date <Req />
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={plannedStartDate}
                      onChange={(e) => setPlannedStartDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="endDate">
                      Planned End Date <Req />
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={plannedEndDate}
                      onChange={(e) => setPlannedEndDate(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="workers">
                      Number of Workers <Req />
                    </Label>
                    <Input
                      id="workers"
                      type="number"
                      min={1}
                      max={100}
                      value={estimatedWorkers}
                      onChange={(e) => setEstimatedWorkers(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 3: Safety Precautions (all 20) ── */}
            {currentStep === 3 && (
              <div className="flex flex-col gap-6">
                <SectionTitle icon={Shield} title="Safety Precautions" />
                <InfoBox>
                  Tick all safety precautions that apply and have been confirmed
                  before work commences. If asbestos is present and a special
                  permit is required, you will be directed to contact us
                  immediately.
                </InfoBox>

                {/* Asbestos special permit — hard stop trigger */}
                <div
                  className={cn(
                    "flex items-start gap-3 px-4 py-3.5 rounded-lg border-2 transition-colors cursor-pointer",
                    asbestosSpecialPermitRequired
                      ? "border-red-400 bg-red-50"
                      : "border-border hover:border-red-200 hover:bg-red-50/40",
                  )}
                  onClick={() =>
                    setAsbestosSpecialPermitRequired(
                      !asbestosSpecialPermitRequired,
                    )
                  }
                >
                  <Checkbox
                    id="asbestosSpecial"
                    checked={asbestosSpecialPermitRequired}
                    onCheckedChange={(c) =>
                      setAsbestosSpecialPermitRequired(c === true)
                    }
                    className="mt-0.5"
                  />
                  <div className="flex flex-col gap-0.5">
                    <label
                      htmlFor="asbestosSpecial"
                      className="text-sm font-semibold text-foreground cursor-pointer"
                    >
                      Asbestos present — Special Permit Required
                    </label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Tick if asbestos-containing materials (ACMs) are present
                      in the work area.{" "}
                      <strong className="text-red-700">
                        This will end the form and direct you to contact us.
                      </strong>
                    </p>
                  </div>
                </div>

                {asbestosSpecialPermitRequired && (
                  <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-red-50 border border-red-300">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                    <p className="text-xs text-red-800 leading-relaxed font-medium">
                      You have indicated that a special asbestos permit is
                      required. Click &ldquo;Continue&rdquo; to be directed to
                      contact us before proceeding.
                    </p>
                  </div>
                )}

                {!asbestosSpecialPermitRequired && (
                  <>
                    <div className="flex flex-col gap-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-1">
                        Confirm all precautions that are in place before work
                        starts
                      </p>
                      {SAFETY_PRECAUTIONS.map((precaution, idx) => (
                        <div
                          key={precaution.id}
                          className={cn(
                            "flex items-start gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer",
                            safetyPrecautions[precaution.id]
                              ? "border-[var(--brand-purple)]/40 bg-[var(--brand-purple)]/5"
                              : "border-border hover:bg-muted/30",
                          )}
                          onClick={() => togglePrecaution(precaution.id)}
                        >
                          <Checkbox
                            id={precaution.id}
                            checked={safetyPrecautions[precaution.id]}
                            onCheckedChange={() =>
                              togglePrecaution(precaution.id)
                            }
                            className="mt-0.5 shrink-0"
                          />
                          <label
                            htmlFor={precaution.id}
                            className="text-sm text-foreground cursor-pointer leading-snug select-none flex gap-2"
                          >
                            <span className="text-muted-foreground text-xs shrink-0 mt-px w-5 text-right">
                              {idx + 1}.
                            </span>
                            {precaution.label}
                          </label>
                        </div>
                      ))}
                    </div>

                    {/* Hot works — conditional fire watch section */}
                    {isHotWorks && (
                      <div className="border border-amber-200 rounded-xl bg-amber-50/50 p-4 flex flex-col gap-4 mt-2">
                        <div className="flex items-center gap-2">
                          <Flame className="w-4 h-4 text-amber-600" />
                          <p className="text-sm font-semibold text-amber-900">
                            Hot Works — Fire Watch Required
                          </p>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed -mt-1">
                          Hot works require a designated Fire Watch to monitor
                          the area during and after work. A fire watch must
                          remain on site for a minimum period after hot works
                          cease.
                        </p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="fwName">
                              Fire Watch Name <Req />
                            </Label>
                            <Input
                              id="fwName"
                              placeholder="Full name of fire watch operative"
                              value={fireWatchName}
                              onChange={(e) => setFireWatchName(e.target.value)}
                            />
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="fwPhone">
                              Fire Watch Phone <Req />
                            </Label>
                            <div className="relative">
                              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                              <Input
                                id="fwPhone"
                                className="pl-8"
                                placeholder="07700 900 000"
                                value={fireWatchPhone}
                                onChange={(e) =>
                                  setFireWatchPhone(e.target.value)
                                }
                              />
                            </div>
                          </div>
                          <div className="flex flex-col gap-1.5">
                            <Label htmlFor="fwDuration">
                              Post-Works Fire Watch Duration (minutes) <Req />
                            </Label>
                            <Input
                              id="fwDuration"
                              type="number"
                              min={30}
                              max={240}
                              value={fireWatchDurationMinutes}
                              onChange={(e) =>
                                setFireWatchDurationMinutes(e.target.value)
                              }
                            />
                            <p className="text-[10px] text-muted-foreground">
                              Minimum 60 minutes recommended
                            </p>
                          </div>
                        </div>

                        {/* Daily Inspection Records */}
                        <div className="border-t border-amber-200 pt-4 flex flex-col gap-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-amber-900">
                              Daily Hot Works Inspection Record
                            </p>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs border-amber-300 text-amber-800 hover:bg-amber-100"
                              onClick={() =>
                                setHotWorksDailyInspections((prev) => [
                                  ...prev,
                                  emptyDailyInspection(),
                                ])
                              }
                            >
                              <Plus className="w-3 h-3 mr-1" /> Add Day
                            </Button>
                          </div>
                          {hotWorksDailyInspections.map((insp, idx) => (
                            <div
                              key={idx}
                              className="bg-white border border-amber-200 rounded-lg p-4 flex flex-col gap-3"
                            >
                              <div className="flex items-center justify-between">
                                <p className="text-xs font-semibold text-amber-900">
                                  Day {idx + 1}
                                </p>
                                {hotWorksDailyInspections.length > 1 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setHotWorksDailyInspections((prev) =>
                                        prev.filter((_, i) => i !== idx),
                                      )
                                    }
                                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-50 text-red-400 hover:text-red-600 transition-colors"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="flex flex-col gap-1.5">
                                  <Label className="text-xs">
                                    Date <Req />
                                  </Label>
                                  <Input
                                    type="date"
                                    value={insp.date}
                                    onChange={(e) =>
                                      updateDailyInspection(
                                        idx,
                                        "date",
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <Label className="text-xs">
                                    Works Start Time
                                  </Label>
                                  <Input
                                    type="time"
                                    value={insp.timeStart}
                                    onChange={(e) =>
                                      updateDailyInspection(
                                        idx,
                                        "timeStart",
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="flex flex-col gap-1.5">
                                  <Label className="text-xs">
                                    Works End Time
                                  </Label>
                                  <Input
                                    type="time"
                                    value={insp.timeEnd}
                                    onChange={(e) =>
                                      updateDailyInspection(
                                        idx,
                                        "timeEnd",
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 text-xs"
                                  />
                                </div>
                                <div className="sm:col-span-3 flex flex-col gap-1.5">
                                  <Label className="text-xs">
                                    Inspector Name
                                  </Label>
                                  <Input
                                    placeholder="Name of person completing this record"
                                    value={insp.inspectorName}
                                    onChange={(e) =>
                                      updateDailyInspection(
                                        idx,
                                        "inspectorName",
                                        e.target.value,
                                      )
                                    }
                                    className="h-8 text-xs"
                                  />
                                </div>
                              </div>
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                                {[
                                  {
                                    field:
                                      "areaChecked" as keyof HotWorksDailyInspection,
                                    label:
                                      "Work area checked and combustibles removed",
                                  },
                                  {
                                    field:
                                      "fireExtinguisherPresent" as keyof HotWorksDailyInspection,
                                    label:
                                      "Fire extinguisher present and accessible",
                                  },
                                  {
                                    field:
                                      "hotWorkCompleted" as keyof HotWorksDailyInspection,
                                    label:
                                      "Hot works completed and all equipment off",
                                  },
                                  {
                                    field:
                                      "areaInspectedAfter" as keyof HotWorksDailyInspection,
                                    label:
                                      "Area inspected after works (fire watch complete)",
                                  },
                                ].map(({ field, label }) => (
                                  <div
                                    key={field}
                                    className={cn(
                                      "flex items-center gap-2.5 px-2.5 py-2 rounded-md border cursor-pointer transition-colors text-xs",
                                      insp[field]
                                        ? "border-green-300 bg-green-50 text-green-800"
                                        : "border-border hover:bg-muted/20",
                                    )}
                                    onClick={() =>
                                      updateDailyInspection(
                                        idx,
                                        field,
                                        !insp[field],
                                      )
                                    }
                                  >
                                    <Checkbox
                                      checked={insp[field] as boolean}
                                      onCheckedChange={(c) =>
                                        updateDailyInspection(
                                          idx,
                                          field,
                                          c === true,
                                        )
                                      }
                                    />
                                    <span className="leading-snug">
                                      {label}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

            {/* ── Step 4: Hazard Identification & Protective Equipment ── */}
            {currentStep === 4 && (
              <div className="flex flex-col gap-6">
                {/* Section A — Hazard Identification */}
                <div>
                  <SectionTitle
                    icon={ShieldAlert}
                    title="Hazard Identification"
                  />
                  <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
                    Identify all hazards associated with the planned work. All
                    hazards must be addressed in your RAMS.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        id: "hElectrical",
                        label: "Electrical hazard",
                        val: hazardElectrical,
                        set: setHazardElectrical,
                      },
                      {
                        id: "hHotWorks",
                        label: "Hot works (flame / sparks)",
                        val: hazardHotWorks,
                        set: setHazardHotWorks,
                      },
                      {
                        id: "hAsbestos",
                        label: "Asbestos or ACMs nearby",
                        val: hazardAsbestos,
                        set: setHazardAsbestos,
                      },
                      {
                        id: "hConfined",
                        label: "Confined space entry",
                        val: hazardConfined,
                        set: setHazardConfined,
                      },
                      {
                        id: "hHeight",
                        label: "Working at height",
                        val: hazardHeight,
                        set: setHazardHeight,
                      },
                      {
                        id: "hChemicals",
                        label: "Chemicals / COSHH substances",
                        val: hazardChemicals,
                        set: setHazardChemicals,
                      },
                      {
                        id: "hManual",
                        label: "Manual handling",
                        val: hazardManualHandling,
                        set: setHazardManualHandling,
                      },
                      {
                        id: "hNoise",
                        label: "Excessive noise or vibration",
                        val: hazardNoise,
                        set: setHazardNoise,
                      },
                    ].map(({ id, label, val, set }) => (
                      <CheckItem
                        key={id}
                        id={id}
                        label={label}
                        checked={val}
                        onCheckedChange={(c) => set(c === true)}
                      />
                    ))}
                  </div>
                </div>

                <div className="border-t border-border" />

                {/* Section B — Protective Equipment */}
                <div>
                  <SectionTitle icon={HardHat} title="Protective Equipment" />
                  <p className="text-xs text-muted-foreground mt-1 mb-4 leading-relaxed">
                    Select all personal protective equipment (PPE) that will be
                    worn by all workers during the works.
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {[
                      {
                        id: "pHardHat",
                        label: "Hard hat / safety helmet",
                        val: ppeHardHat,
                        set: setPpeHardHat,
                      },
                      {
                        id: "pHighVis",
                        label: "High-visibility clothing",
                        val: ppeHighVis,
                        set: setPpeHighVis,
                      },
                      {
                        id: "pBoots",
                        label: "Safety boots / steel toecap",
                        val: ppeSafetyBoots,
                        set: setPpeSafetyBoots,
                      },
                      {
                        id: "pGloves",
                        label: "Protective gloves",
                        val: ppeGloves,
                        set: setPpeGloves,
                      },
                      {
                        id: "pEye",
                        label: "Eye / face protection",
                        val: ppeEyeProtection,
                        set: setPpeEyeProtection,
                      },
                      {
                        id: "pResp",
                        label: "Respirator / face mask",
                        val: ppeRespirator,
                        set: setPpeRespirator,
                      },
                    ].map(({ id, label, val, set }) => (
                      <CheckItem
                        key={id}
                        id={id}
                        label={label}
                        checked={val}
                        onCheckedChange={(c) => set(c === true)}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 5: Emergency Info ── */}
            {currentStep === 5 && (
              <div className="flex flex-col gap-5">
                <SectionTitle
                  icon={AlertTriangle}
                  title="Emergency Arrangements"
                />
                <InfoBox>
                  This information must be known by all workers on site before
                  work commences.
                </InfoBox>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="emergency">
                    Emergency Procedure <Req />
                  </Label>
                  <Textarea
                    id="emergency"
                    placeholder="Describe what workers should do in the event of an emergency, fire, injury, or hazardous incident..."
                    rows={3}
                    className="resize-none"
                    value={emergencyProcedure}
                    onChange={(e) => setEmergencyProcedure(e.target.value)}
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="firstAid">
                      Location of Nearest First Aid <Req />
                    </Label>
                    <Input
                      id="firstAid"
                      placeholder="e.g. Reception, Ward B Nursing Station"
                      value={nearestFirstAid}
                      onChange={(e) => setNearestFirstAid(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="fireExit">
                      Location of Nearest Fire Exit <Req />
                    </Label>
                    <Input
                      id="fireExit"
                      placeholder="e.g. End of Ground Floor Corridor"
                      value={nearestFireExit}
                      onChange={(e) => setNearestFireExit(e.target.value)}
                    />
                  </div>
                  <div className="sm:col-span-2 flex flex-col gap-1.5">
                    <Label htmlFor="assemblyPoint">
                      Assembly Point <Req />
                    </Label>
                    <Input
                      id="assemblyPoint"
                      placeholder="e.g. Front car park, South car park"
                      value={assemblyPoint}
                      onChange={(e) => setAssemblyPoint(e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* ── Step 6: RAMS & Documents ── */}
            {currentStep === 6 && (
              <div className="flex flex-col gap-6">
                <SectionTitle
                  icon={BookOpen}
                  title="RAMS & Supporting Documents"
                />

                {/* RAMS — compulsory file upload */}
                <div className="bg-[var(--brand-purple)]/5 border-2 border-[var(--brand-purple)]/30 rounded-xl p-5 flex flex-col gap-4">
                  <div className="flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-[var(--brand-purple)]" />
                    <p className="text-sm font-semibold text-foreground">
                      Risk Assessment &amp; Method Statement (RAMS)
                    </p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--brand-purple)] text-white ml-auto uppercase tracking-wide">
                      Compulsory
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed -mt-1">
                    A valid RAMS document <strong>must be uploaded</strong> for
                    all permit to work applications. Work cannot be approved
                    without a RAMS file on record. Reference number and on-site
                    review confirmation are also required.
                  </p>

                  {/* RAMS File Upload */}
                  {ramsFile ? (
                    <div className="flex items-center gap-3 px-3 py-3 rounded-lg border border-[var(--brand-purple)]/30 bg-[var(--brand-purple)]/5">
                      <div className="w-8 h-8 rounded-md bg-[var(--brand-purple)]/10 flex items-center justify-center shrink-0">
                        <FileText className="w-4 h-4 text-[var(--brand-purple)]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {ramsFile.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {(ramsFile.size / 1024).toFixed(1)} KB &middot; RAMS
                          document
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setRamsFile(null)}
                        className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => ramsFileInputRef.current?.click()}
                        className="w-full border-2 border-dashed border-[var(--brand-purple)]/40 rounded-lg px-4 py-6 flex flex-col items-center gap-2 text-sm hover:border-[var(--brand-purple)]/70 hover:bg-[var(--brand-purple)]/5 transition-colors"
                      >
                        <Upload className="w-6 h-6 text-[var(--brand-purple)]/50" />
                        <span className="text-foreground font-medium">
                          Upload RAMS Document{" "}
                          <span className="text-destructive">*</span>
                        </span>
                        <span className="text-xs text-muted-foreground">
                          PDF, DOC, DOCX — max 20MB
                        </span>
                      </button>
                      <input
                        ref={ramsFileInputRef}
                        type="file"
                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                        className="hidden"
                        onChange={handleRamsFileChange}
                      />
                      <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs text-amber-800">
                          You must upload your RAMS document before this permit
                          can be submitted.
                        </p>
                      </div>
                    </>
                  )}

                  {/* RAMS Reference */}
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="ramsRef">
                      RAMS Reference Number / Document Title <Req />
                    </Label>
                    <Input
                      id="ramsRef"
                      placeholder="e.g. RAMS-2024-047 or document title"
                      value={ramsReference}
                      onChange={(e) => setRamsReference(e.target.value)}
                    />
                  </div>

                  {/* RAMS reviewed on site */}
                  <div
                    className={cn(
                      "flex items-start gap-3 px-3 py-3 rounded-lg border transition-colors cursor-pointer",
                      ramsReviewedOnSite
                        ? "border-green-300 bg-green-50"
                        : "border-border hover:bg-muted/30",
                    )}
                    onClick={() => setRamsReviewedOnSite(!ramsReviewedOnSite)}
                  >
                    <Checkbox
                      id="ramsReviewed"
                      checked={ramsReviewedOnSite}
                      onCheckedChange={(c) => setRamsReviewedOnSite(c === true)}
                      className="mt-0.5"
                    />
                    <label
                      htmlFor="ramsReviewed"
                      className="text-sm font-medium text-foreground cursor-pointer leading-snug select-none"
                    >
                      I confirm the RAMS have been reviewed on site with all
                      workers before commencement{" "}
                      <span className="text-destructive">*</span>
                    </label>
                  </div>

                  {!ramsReviewedOnSite && (
                    <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-amber-50 border border-amber-200">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-xs text-amber-800">
                        RAMS must be reviewed on site with all workers before
                        this permit can be submitted.
                      </p>
                    </div>
                  )}
                </div>

                {/* Additional document declarations */}
                <div className="flex flex-col gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Additional Declarations
                  </p>
                  <CheckItem
                    id="ra"
                    label="I confirm a Risk Assessment is in place and available on request"
                    checked={hasRiskAssessment}
                    onCheckedChange={(c) => setHasRiskAssessment(c === true)}
                  />
                  <CheckItem
                    id="ms"
                    label="I confirm a Method Statement is in place and available on request"
                    checked={hasMethodStatement}
                    onCheckedChange={(c) => setHasMethodStatement(c === true)}
                  />
                  <CheckItem
                    id="pli"
                    label="My company holds valid Public Liability Insurance"
                    checked={hasPublicLiabilityInsurance}
                    onCheckedChange={(c) =>
                      setHasPublicLiabilityInsurance(c === true)
                    }
                  />
                  {hasPublicLiabilityInsurance && (
                    <div className="flex flex-col gap-1.5 pl-2">
                      <Label htmlFor="insuranceExpiry">
                        Insurance Expiry Date
                      </Label>
                      <Input
                        id="insuranceExpiry"
                        type="date"
                        value={insuranceExpiryDate}
                        onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                      />
                    </div>
                  )}
                </div>

                {/* Additional file uploads */}
                <div className="flex flex-col gap-3">
                  <div>
                    <Label className="mb-1 block">
                      Additional Supporting Documents
                    </Label>
                    <p className="text-xs text-muted-foreground mb-2 leading-relaxed">
                      Optionally upload any further supporting documents such as
                      insurance certificates, test certificates, or method
                      statements.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full border-2 border-dashed border-border rounded-lg px-4 py-5 flex flex-col items-center gap-2 text-sm text-muted-foreground hover:border-[var(--brand-purple)]/50 hover:bg-[var(--brand-purple)]/5 transition-colors"
                  >
                    <Upload className="w-5 h-5 text-muted-foreground/50" />
                    <span>Click to upload additional documents</span>
                    <span className="text-xs text-muted-foreground/60">
                      PDF, JPG, PNG — max 10MB each
                    </span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                  {attachments.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {attachments.map((a) => (
                        <div
                          key={a.id}
                          className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border bg-muted/30"
                        >
                          <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-medium text-foreground truncate">
                              {a.name}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                              {(a.size / 1024).toFixed(1)} KB
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => removeAttachment(a.id)}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-muted transition-colors"
                          >
                            <X className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── Step 7: Declaration ── */}
            {currentStep === 7 && (
              <div className="flex flex-col gap-5">
                <SectionTitle icon={CheckSquare} title="Declaration" />
                <div className="bg-muted/40 rounded-lg border border-border px-4 py-4 text-sm text-foreground leading-relaxed">
                  <p className="font-semibold mb-2">
                    Before submitting, please read and confirm the following:
                  </p>
                  <ul className="list-disc list-inside text-sm text-muted-foreground flex flex-col gap-1.5">
                    <li>
                      All information provided in this permit application is
                      accurate and complete to the best of my knowledge.
                    </li>
                    <li>
                      I understand that work must not commence until written
                      approval has been received from the site facilities
                      manager.
                    </li>
                    <li>
                      I confirm that all persons carrying out the works will be
                      briefed on the hazards identified and emergency
                      arrangements.
                    </li>
                    <li>
                      I confirm the RAMS have been reviewed on site with all
                      workers prior to commencement of works.
                    </li>
                    <li>
                      I confirm that appropriate insurance is in place for the
                      duration of the works.
                    </li>
                    <li>
                      I accept responsibility for the safe management of the
                      works described and compliance with all relevant health
                      and safety legislation.
                    </li>
                    <li>
                      I understand that this permit may be revoked at any time
                      if safety conditions change or the works deviate from this
                      application.
                    </li>
                  </ul>
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="declName">
                    Your Full Name <Req />
                  </Label>
                  <Input
                    id="declName"
                    placeholder="Type your full name to confirm"
                    value={declarationName}
                    onChange={(e) => setDeclarationName(e.target.value)}
                  />
                </div>
                <div
                  className="flex items-start gap-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => setDeclarationAgreed(!declarationAgreed)}
                >
                  <Checkbox
                    id="declaration"
                    checked={declarationAgreed}
                    onCheckedChange={(c) => setDeclarationAgreed(c === true)}
                    className="mt-0.5"
                  />
                  <label
                    htmlFor="declaration"
                    className="text-sm font-medium text-foreground cursor-pointer leading-snug"
                  >
                    I confirm I have read and agree to the above declaration,
                    and that all information provided is accurate.
                    <span className="text-destructive ml-1">*</span>
                  </label>
                </div>
                {declarationAgreed && declarationName && (
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    Ready to submit. Your permit will be sent for review.
                  </div>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between mt-6 pt-5 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                disabled={currentStep === 1}
                onClick={() => setCurrentStep((s) => s - 1)}
              >
                <ChevronLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <p className="text-xs text-muted-foreground">
                Step {currentStep} of {STEPS.length}
              </p>
              {currentStep < STEPS.length ? (
                <Button
                  size="sm"
                  className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
                  disabled={!isStepValid(currentStep)}
                  onClick={handleNext}
                >
                  {currentStep === 3 && asbestosSpecialPermitRequired ? (
                    <>
                      Contact Required{" "}
                      <AlertTriangle className="w-4 h-4 ml-1" />
                    </>
                  ) : (
                    <>
                      Continue <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  size="sm"
                  className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
                  disabled={!isStepValid(7)}
                  onClick={handleSubmit}
                >
                  Submit Permit <CheckCircle2 className="w-4 h-4 ml-1" />
                </Button>
              )}
            </div>
          </div>

          <p className="text-center text-xs text-muted-foreground mt-4">
            Casa Moda — Facilities Management &nbsp;&middot;&nbsp; Managed by{" "}
            <a
              href="https://www.ignite-consultancy.co.uk"
              className="underline hover:text-foreground"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ignite Consultancy
            </a>
            &nbsp;&middot;&nbsp;
            <Link
              href="/permit/status"
              className="underline hover:text-foreground"
            >
              Check permit status
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function PermitHeader() {
  return (
    <header
      className="w-full py-4 px-6 flex items-center gap-3"
      style={{ background: "var(--brand-purple)" }}
    >
      <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
        <Flame className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-white font-semibold text-sm leading-none">
          Casa Moda
        </p>
        <p className="text-white/60 text-xs mt-0.5">
          Permit to Work — Contractor Portal
        </p>
      </div>
    </header>
  );
}

function SectionTitle({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-1">
      <Icon className="w-4 h-4 text-[var(--brand-purple)]" />
      <h2 className="text-sm font-semibold text-foreground">{title}</h2>
    </div>
  );
}

function Req() {
  return <span className="text-destructive">*</span>;
}

function InfoBox({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-blue-50 border border-blue-200">
      <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
      <p className="text-xs text-blue-800 leading-relaxed">{children}</p>
    </div>
  );
}

function CheckItem({
  id,
  label,
  checked,
  onCheckedChange,
}: {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean | "indeterminate") => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-colors cursor-pointer",
        checked
          ? "border-[var(--brand-purple)]/40 bg-[var(--brand-purple)]/5"
          : "border-border hover:bg-muted/30",
      )}
      onClick={() => onCheckedChange(!checked)}
    >
      <Checkbox id={id} checked={checked} onCheckedChange={onCheckedChange} />
      <label
        htmlFor={id}
        className="text-sm text-foreground cursor-pointer leading-snug select-none"
      >
        {label}
      </label>
    </div>
  );
}
