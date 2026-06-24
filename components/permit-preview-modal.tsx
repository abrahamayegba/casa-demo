"use client";

import { useRef } from "react";
import type { Permit, Site } from "@/lib/types";
import { format, parseISO } from "date-fns";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Printer, Download, X, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const WORK_TYPE_LABELS: Record<string, string> = {
  general_maintenance: "General Maintenance",
  electrical: "Electrical Works",
  hot_works: "Hot Works (welding, soldering, cutting)",
  confined_space: "Confined Space Entry",
  working_at_height: "Working at Height",
  excavation: "Excavation / Ground Works",
  asbestos_adjacent: "Works Adjacent to Asbestos",
  roof_access: "Roof Access",
  plant_room: "Plant Room Access",
  other: "Other",
};

const SAFETY_PRECAUTIONS: { key: keyof Permit; label: string }[] = [
  { key: "safetyIsolationRequired",       label: "Have you been given a copy of the Site Safety Rules?" },
  { key: "safetyBarriersRequired",        label: "Has a risk assessment been carried out?" },
  { key: "safetyPermitDisplayed",         label: "Are the workforce qualified to carry out the task?" },
  { key: "safetyAreaClear",               label: "Is appropriate PPE available? (Tick box for Protective Equipment)" },
  { key: "safetyToolboxTalk",             label: "Isolated electrical supply? Work in accordance with current Electricity at Work regs." },
  { key: "safetyFirstAidAvailable",       label: "Voltage detection instrument required?" },
  { key: "safetyVentilationAdequate",     label: "Isolator locked off / tagged? Work in accordance with I.E.E. Wiring regs. (BS7671)." },
  { key: "safetyServicesLocated",         label: "Is work being carried out at height?" },
  { key: "safetyEquipmentInspected",      label: "Are ladders or Scaffolding required - Maintained in safe cond. - ready to use?" },
  { key: "safetyEmergencyStopTested",     label: "Is a license required and in place for scaffolding?" },
  { key: "safetyFireExtsAvailable",       label: "Are personnel aware of means of escape and method of raising alarm?" },
  { key: "safetyHotWorkPrecautions",      label: "Risk of falling objects?" },
  { key: "safetyConfinedSpaceAtmosphere", label: "Details of fragile roof explained?" },
  { key: "safetyRescuePlanInPlace",       label: "Are at least two fire extinguishers available?" },
  { key: "safetyLiftingEquipmentChecked", label: "Are personnel trained in use of fire extinguishers?" },
  { key: "safetyScaffoldInspected",       label: "Have flammable liquids / materials been removed from area?" },
  { key: "safetyChemicalsSegregated",     label: "Have Gas cylinders been properly secured?" },
  { key: "safetyNoiseControls",           label: "Is safe access and egress confirmed?" },
  { key: "safetyWasteDisposalPlan",       label: "Are personnel trained and supplied with Breathing Apparatus?" },
  { key: "safetySiteInductionComplete",   label: "Lifebelt and rope held on outside of confined space?" },
];

function deriveRef(permit: Permit): string {
  return `PTW-${permit.id.split("_")[1]?.slice(-6).toUpperCase() ?? permit.id.slice(-6).toUpperCase()}`;
}

function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center justify-center w-4 h-4 border rounded shrink-0 text-[10px] font-bold",
        checked
          ? "bg-green-600 border-green-600 text-white"
          : "bg-white border-gray-400 text-transparent"
      )}
    >
      {checked ? "✓" : "✓"}
    </span>
  );
}

interface PermitPreviewModalProps {
  permit: Permit;
  site?: Site;
  open: boolean;
  onClose: () => void;
}

export function PermitPreviewModal({ permit, site, open, onClose }: PermitPreviewModalProps) {
  const printRef = useRef<HTMLDivElement>(null);
  const ref = deriveRef(permit);

  function handlePrint() {
    if (!printRef.current) return;
    const content = printRef.current.innerHTML;
    const printWindow = window.open("", "_blank", "width=900,height=700");
    if (!printWindow) return;
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Permit to Work — ${ref}</title>
          <meta charset="utf-8" />
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; font-size: 11px; color: #111; background: #fff; padding: 0; }
            .permit-doc { max-width: 210mm; margin: 0 auto; padding: 20px; }
            .permit-header { background: #3b0764; color: white; padding: 16px 20px; display: flex; justify-content: space-between; align-items: center; border-radius: 4px 4px 0 0; }
            .permit-header h1 { font-size: 16px; font-weight: bold; }
            .permit-header .ref { font-size: 13px; font-family: monospace; letter-spacing: 1px; }
            .approved-banner { background: #f0fdf4; border: 1.5px solid #86efac; padding: 10px 16px; margin-bottom: 14px; border-radius: 4px; display: flex; align-items: center; gap: 8px; }
            .approved-banner .label { font-size: 11px; font-weight: bold; color: #166534; }
            .approved-banner .detail { font-size: 10px; color: #166534; }
            .section { margin-bottom: 14px; border: 1px solid #e5e7eb; border-radius: 4px; overflow: hidden; }
            .section-header { background: #f3f4f6; border-bottom: 1px solid #e5e7eb; padding: 6px 12px; font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; color: #6b7280; }
            .section-body { padding: 10px 12px; }
            .grid2 { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 20px; }
            .grid3 { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px 14px; }
            .field-label { font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; color: #9ca3af; margin-bottom: 2px; }
            .field-value { font-size: 11px; color: #111827; font-weight: 500; }
            .full-width { grid-column: 1 / -1; }
            .desc-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 3px; padding: 8px 10px; font-size: 11px; line-height: 1.5; margin-top: 6px; }
            .checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 16px; }
            .check-item { display: flex; align-items: flex-start; gap: 6px; padding: 3px 0; }
            .check-box { width: 14px; height: 14px; border: 1.5px solid #9ca3af; border-radius: 2px; display: inline-flex; align-items: center; justify-content: center; font-size: 10px; font-weight: bold; flex-shrink: 0; margin-top: 1px; }
            .check-box.checked { background: #16a34a; border-color: #16a34a; color: white; }
            .check-label { font-size: 10px; line-height: 1.4; color: #374151; }
            .tags { display: flex; flex-wrap: wrap; gap: 4px; }
            .tag { display: inline-flex; align-items: center; font-size: 10px; padding: 2px 8px; border-radius: 3px; border: 1px solid; }
            .tag-hazard { background: #fef2f2; color: #991b1b; border-color: #fca5a5; }
            .tag-ppe { background: #eff6ff; color: #1e40af; border-color: #93c5fd; }
            .tag-doc { background: #f0fdf4; color: #166534; border-color: #86efac; }
            .signature-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-top: 8px; }
            .sig-box { border: 1px solid #e5e7eb; border-radius: 3px; padding: 8px 10px; }
            .sig-title { font-size: 9px; text-transform: uppercase; letter-spacing: 0.4px; color: #9ca3af; margin-bottom: 4px; }
            .sig-name { font-size: 11px; font-weight: 600; color: #111827; }
            .sig-date { font-size: 10px; color: #6b7280; margin-top: 2px; }
            .sig-line { border-bottom: 1px dashed #d1d5db; margin-top: 20px; }
            .footer { text-align: center; font-size: 9px; color: #9ca3af; margin-top: 16px; border-top: 1px solid #e5e7eb; padding-top: 10px; }
            @media print {
              body { padding: 0; }
              .permit-doc { padding: 12px; }
            }
          </style>
        </head>
        <body>${content}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 300);
  }

  const hazards = [
    permit.hazardElectrical && "Electrical",
    permit.hazardHotWorks && "Hot Works",
    permit.hazardAsbestos && "Asbestos Nearby",
    permit.hazardConfined && "Confined Space",
    permit.hazardHeight && "Working at Height",
    permit.hazardChemicals && "Chemicals / COSHH",
    permit.hazardManualHandling && "Manual Handling",
    permit.hazardNoise && "Noise / Vibration",
  ].filter(Boolean) as string[];

  const ppe = [
    permit.ppeHardHat && "Hard Hat",
    permit.ppeHighVis && "High-Vis",
    permit.ppeSafetyBoots && "Safety Boots",
    permit.ppeGloves && "Gloves",
    permit.ppeEyeProtection && "Eye Protection",
    permit.ppeRespirator && "Respirator",
  ].filter(Boolean) as string[];

  const docs = [
    permit.hasRiskAssessment && "Risk Assessment",
    permit.hasMethodStatement && "Method Statement",
    permit.hasPublicLiabilityInsurance && "Public Liability Insurance",
  ].filter(Boolean) as string[];

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[95vh] p-0 flex flex-col overflow-hidden">
        <DialogTitle className="sr-only">Permit to Work Preview — {ref}</DialogTitle>

        {/* Toolbar */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-card shrink-0">
          <div>
            <p className="text-sm font-semibold text-foreground">Permit to Work Preview</p>
            <p className="text-xs text-muted-foreground font-mono">{ref}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={handlePrint}
            >
              <Printer className="w-3.5 h-3.5 mr-1.5" />
              Print / Save PDF
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={onClose}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Scrollable permit document */}
        <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
          <div ref={printRef}>
            <div className="permit-doc bg-white rounded shadow-sm max-w-[210mm] mx-auto">

              {/* Header */}
              <div
                className="permit-header flex items-center justify-between px-5 py-4"
                style={{ background: "var(--brand-purple)", borderRadius: "4px 4px 0 0" }}
              >
                <div>
                  <h1 className="text-white font-bold text-base leading-none">PERMIT TO WORK</h1>
                  <p className="text-white/70 text-xs mt-1">Casa Moda — Estates</p>
                </div>
                <div className="text-right">
                  <p className="text-white font-mono font-bold text-sm tracking-widest">{ref}</p>
                  <p className="text-white/70 text-xs mt-1">
                    Issued: {format(parseISO(permit.submittedAt), "dd/MM/yyyy")}
                  </p>
                </div>
              </div>

              {/* Approval banner */}
              {permit.status === "approved" && (
                <div className="approved-banner flex items-start gap-3 mx-4 mt-4 px-4 py-3 rounded-md border border-green-300 bg-green-50">
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="label text-xs font-bold text-green-800">PERMIT APPROVED</p>
                    <p className="detail text-xs text-green-700">
                      Approved by {permit.reviewedBy}
                      {permit.reviewedAt ? ` on ${format(parseISO(permit.reviewedAt), "dd/MM/yyyy 'at' HH:mm")}` : ""}
                    </p>
                    {permit.approvalNotes && (
                      <p className="text-xs text-green-700 mt-1 italic">&ldquo;{permit.approvalNotes}&rdquo;</p>
                    )}
                  </div>
                </div>
              )}

              <div className="px-4 py-4 flex flex-col gap-4">

                {/* Section 1 — Contractor Details */}
                <DocSection title="1. Contractor & Company Details">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    <Field label="Name of Contractor / Company" value={permit.contractorCompany} span={2} />
                    <Field label="Contact Name" value={permit.contractorName} />
                    <Field label="Supervisor on Site" value={permit.supervisorOnSite} />
                    <Field label="Email Address" value={permit.contractorEmail} />
                    <Field label="Phone Number" value={permit.contractorPhone} />
                    <Field label="Site" value={site?.name ?? permit.siteId} span={2} />
                  </div>
                </DocSection>

                {/* Section 2 — Work Details */}
                <DocSection title="2. Work Details">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    <Field label="Type of Work" value={WORK_TYPE_LABELS[permit.workType] ?? permit.workType} span={2} />
                    <Field
                      label="Planned Start Date"
                      value={format(parseISO(permit.plannedStartDate), "dd/MM/yyyy")}
                    />
                    <Field
                      label="Planned End Date"
                      value={format(parseISO(permit.plannedEndDate), "dd/MM/yyyy")}
                    />
                    <Field label="Location on Site" value={permit.locationOnSite} span={2} />
                    <Field label="Number of Workers" value={String(permit.estimatedWorkers)} />
                  </div>
                  <div className="mt-3">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Description of Works to be Carried Out</p>
                    <div className="desc-box text-xs bg-gray-50 rounded border border-border px-3 py-2.5 leading-relaxed text-foreground">
                      {permit.workDescription}
                    </div>
                  </div>
                </DocSection>

                {/* Section 3 — Safety Precautions */}
                <DocSection title="3. Safety Precautions Checklist">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {SAFETY_PRECAUTIONS.map(({ key, label }) => {
                      const checked = permit[key] as boolean;
                      return (
                        <div key={key} className="flex items-start gap-2 py-1">
                          <CheckBox checked={checked} />
                          <span className={cn(
                            "text-xs leading-snug",
                            checked ? "text-foreground font-medium" : "text-muted-foreground"
                          )}>{label}</span>
                        </div>
                      );
                    })}
                  </div>
                </DocSection>

                {/* Section 4 — Hazards & PPE */}
                <div className="grid grid-cols-2 gap-4">
                  <DocSection title="4. Hazards Identified">
                    {hazards.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">None identified</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {hazards.map((h) => (
                          <span key={h} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">
                            {h}
                          </span>
                        ))}
                      </div>
                    )}
                  </DocSection>
                  <DocSection title="5. Protective Equipment (PPE)">
                    {ppe.length === 0 ? (
                      <p className="text-xs text-muted-foreground italic">None specified</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {ppe.map((p) => (
                          <span key={p} className="inline-flex items-center text-[10px] px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
                            {p}
                          </span>
                        ))}
                      </div>
                    )}
                  </DocSection>
                </div>

                {/* Section 5 — Emergency */}
                <DocSection title="6. Emergency Arrangements">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    <Field label="Nearest First Aid" value={permit.nearestFirstAid} />
                    <Field label="Nearest Fire Exit" value={permit.nearestFireExit} />
                    {permit.assemblyPoint && (
                      <Field label="Assembly Point" value={permit.assemblyPoint} />
                    )}
                  </div>
                  <div className="mt-3">
                    <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1.5 font-medium">Emergency Procedure</p>
                    <div className="desc-box text-xs bg-gray-50 rounded border border-border px-3 py-2.5 leading-relaxed text-foreground">
                      {permit.emergencyProcedure}
                    </div>
                  </div>
                </DocSection>

                {/* Section 6 — RAMS & Documentation */}
                <DocSection title="7. RAMS & Documentation">
                  <div className="grid grid-cols-2 gap-x-8 gap-y-3">
                    <Field label="RAMS Reference" value={permit.ramsReference} />
                    <div>
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-1 font-medium">RAMS Reviewed On Site</p>
                      <div className="flex items-center gap-1.5">
                        <CheckBox checked={permit.ramsReviewedOnSite} />
                        <span className="text-xs text-foreground">{permit.ramsReviewedOnSite ? "Yes" : "No"}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {docs.length > 0 ? docs.map((d) => (
                      <span key={d} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded border bg-green-50 text-green-700 border-green-200">
                        <CheckCircle2 className="w-2.5 h-2.5" />
                        {d}
                      </span>
                    )) : (
                      <p className="text-xs text-muted-foreground italic">No documents declared</p>
                    )}
                  </div>
                  {permit.insuranceExpiryDate && (
                    <p className="text-xs text-muted-foreground mt-2">
                      Insurance expiry: <strong className="text-foreground">{format(parseISO(permit.insuranceExpiryDate), "dd/MM/yyyy")}</strong>
                    </p>
                  )}
                  {permit.attachments.length > 0 && (
                    <div className="mt-3 flex flex-col gap-1.5">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Attached Files</p>
                      {permit.attachments.map((att) => (
                        <div key={att.id} className="flex items-center gap-2 text-xs text-foreground bg-muted/30 rounded border border-border px-3 py-1.5">
                          <span className="flex-1 truncate">{att.name}</span>
                          <span className="text-muted-foreground shrink-0">{(att.size / 1024).toFixed(0)} KB</span>
                        </div>
                      ))}
                    </div>
                  )}
                </DocSection>

                {/* Section 7 — Authorisation */}
                <DocSection title="8. Authorisation & Signatures">
                  <div className="grid grid-cols-2 gap-4">
                    {/* Performing Authority (contractor) */}
                    <div className="border border-border rounded p-3 flex flex-col gap-2">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Performing Authority (Contractor)</p>
                      <p className="text-sm font-semibold text-foreground">{permit.declarationName}</p>
                      <p className="text-xs text-muted-foreground">{permit.contractorCompany}</p>
                      <p className="text-xs text-muted-foreground">Date: {format(parseISO(permit.declarationDate), "dd/MM/yyyy")}</p>
                      <div className="border-b border-dashed border-gray-300 mt-3 pt-4">
                        <p className="text-[9px] text-muted-foreground">Signature</p>
                      </div>
                    </div>

                    {/* Issuing Authority (facilities manager) */}
                    <div className="border border-border rounded p-3 flex flex-col gap-2">
                      <p className="text-[9px] uppercase tracking-wider text-muted-foreground font-medium">Issuing Authority (Facilities Manager)</p>
                      {permit.status === "approved" && permit.reviewedBy ? (
                        <>
                          <p className="text-sm font-semibold text-foreground">{permit.reviewedBy}</p>
                          <p className="text-xs text-muted-foreground">Casa Moda Estates</p>
                          {permit.reviewedAt && (
                            <p className="text-xs text-muted-foreground">
                              Date: {format(parseISO(permit.reviewedAt), "dd/MM/yyyy")}
                            </p>
                          )}
                        </>
                      ) : (
                        <p className="text-xs text-muted-foreground italic">Pending authorisation</p>
                      )}
                      <div className="border-b border-dashed border-gray-300 mt-3 pt-4">
                        <p className="text-[9px] text-muted-foreground">Signature</p>
                      </div>
                    </div>
                  </div>

                  {/* Permit number + dates bar */}
                  <div className="grid grid-cols-3 gap-3 mt-4 pt-3 border-t border-border">
                    <Field label="Permit Number" value={ref} />
                    <Field label="Date Issued" value={format(parseISO(permit.submittedAt), "dd/MM/yyyy")} />
                    <Field
                      label="Valid Until"
                      value={format(parseISO(permit.plannedEndDate), "dd/MM/yyyy")}
                    />
                  </div>
                </DocSection>

              </div>

              {/* Footer */}
              <div className="px-4 pb-4 pt-1">
                <div className="border-t border-border pt-3 text-center">
                  <p className="text-[9px] text-muted-foreground">
                    This permit must be displayed at the work area at all times. It is only valid for the work and dates described above.
                    Any changes to the scope of work require a new permit application. Reference: {ref}
                  </p>
                </div>
              </div>

            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function DocSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-border rounded-md overflow-hidden">
      <div className="bg-muted/50 border-b border-border px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      </div>
      <div className="px-3 py-3">
        {children}
      </div>
    </div>
  );
}

function Field({ label, value, span }: { label: string; value: string; span?: number }) {
  return (
    <div className={span === 2 ? "col-span-2" : undefined}>
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5 font-medium">{label}</p>
      <p className="text-xs text-foreground font-medium leading-snug">{value || "—"}</p>
    </div>
  );
}
