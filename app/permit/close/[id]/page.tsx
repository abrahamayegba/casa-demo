"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import {
  getPermits,
  getSites,
  seedIfNeeded,
  closePermit,
  generateId,
} from "@/lib/store";
import type { Permit, Site, PermitAttachment } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Flame,
  Building2,
  CalendarDays,
  MapPin,
  FileText,
  Upload,
  X,
  AlertCircle,
  Loader2,
  ShieldCheck,
  Clock,
  ClipboardCheck,
  User,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

function deriveRef(permit: Permit): string {
  return `PTW-${permit.id.split("_")[1]?.slice(-6).toUpperCase() ?? permit.id.slice(-6).toUpperCase()}`;
}

export default function PermitClosePage() {
  const params = useParams<{ id: string }>();
  const permitId = params.id;

  const [permit, setPermit] = useState<Permit | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [attachments, setAttachments] = useState<PermitAttachment[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    seedIfNeeded();
    const permits = getPermits();
    const found = permits.find((p) => p.id === permitId);
    setPermit(found ?? null);
    if (found) {
      const sites = getSites();
      setSite(sites.find((s) => s.id === found.siteId) ?? null);
      // Pre-fill contractor name/email from permit
      setName(found.contractorName);
      setEmail(found.contractorEmail);
    }
    setLoading(false);
  }, [permitId]);

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
            uploadedAt: new Date().toISOString(),
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

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!permit) return;
    setSubmitting(true);
    setError(null);

    setTimeout(() => {
      try {
        const result = closePermit(permitId, name.trim(), email.trim(), notes.trim(), attachments);
        if (!result) {
          setError("Something went wrong. Please try again.");
          setSubmitting(false);
          return;
        }
        setPermit(result.permit);
        setSubmitted(true);
      } catch {
        setError("An unexpected error occurred. Please try again.");
      }
      setSubmitting(false);
    }, 900);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg)] flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Not found
  if (!permit) {
    return (
      <div className="min-h-screen bg-[var(--brand-bg)] flex flex-col">
        <PermitHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
            <AlertCircle className="w-6 h-6 text-red-600" />
          </div>
          <div className="text-center">
            <h1 className="text-lg font-semibold text-foreground">Permit Not Found</h1>
            <p className="text-sm text-muted-foreground mt-1">
              This link may be invalid or the permit has been removed.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Permit not approved — can't close
  if (permit.status !== "approved" && permit.status !== "closed") {
    return (
      <div className="min-h-screen bg-[var(--brand-bg)] flex flex-col">
        <PermitHeader />
        <div className="flex-1 flex flex-col items-center justify-center gap-4 px-4">
          <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center">
            <Clock className="w-6 h-6 text-amber-600" />
          </div>
          <div className="text-center max-w-sm">
            <h1 className="text-lg font-semibold text-foreground">Permit Not Ready</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              This permit has not yet been approved. You can only submit a job completion for an approved permit.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const permitRef = deriveRef(permit);

  // Already closed
  if (submitted || permit.status === "closed") {
    return (
      <div className="min-h-screen bg-[var(--brand-bg)] flex flex-col">
        <PermitHeader />
        <main className="flex-1 flex flex-col items-center px-4 py-12">
          <div className="w-full max-w-md flex flex-col gap-5">
            <div className="bg-card rounded-2xl border border-border shadow-sm p-8 flex flex-col items-center gap-5 text-center">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">Job Completed</h1>
                <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
                  Thank you. Your job completion has been submitted and a works record has been created on the system.
                </p>
              </div>
              <div className="w-full rounded-xl border border-border bg-muted/30 p-4 text-left flex flex-col gap-2.5">
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Permit Reference</p>
                  <p className="text-sm font-bold font-mono tracking-wider">{permitRef}</p>
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Contractor</p>
                  <p className="text-sm font-medium">{permit.contractorCompany}</p>
                </div>
                {site && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Site</p>
                    <p className="text-sm">{site.name}</p>
                  </div>
                )}
                {permit.closedAt && (
                  <div>
                    <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Submitted At</p>
                    <p className="text-sm">{format(parseISO(permit.closedAt), "d MMMM yyyy 'at' HH:mm")}</p>
                  </div>
                )}
              </div>
              <p className="text-xs text-muted-foreground">You can safely close this tab.</p>
            </div>
          </div>
        </main>
      </div>
    );
  }

  const isValid = name.trim().length > 0;

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex flex-col">
      <PermitHeader />
      <main className="flex-1 flex flex-col items-center px-4 py-10">
        <div className="w-full max-w-lg flex flex-col gap-6">
          {/* Title */}
          <div>
            <h1 className="text-2xl font-bold text-foreground text-balance">Complete Your Permit</h1>
            <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
              Use this form to confirm that all works have been completed safely. This will close the permit on the system and create a permanent works record.
            </p>
          </div>

          {/* Permit summary */}
          <div className="bg-card rounded-xl border border-green-200/60 p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Permit Reference</p>
                <p className="text-base font-bold font-mono tracking-wide text-foreground mt-0.5">{permitRef}</p>
              </div>
              <span className="inline-flex items-center gap-1.5 text-xs border px-2.5 py-1 rounded-md bg-green-50 text-green-700 border-green-200 shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                Approved
              </span>
            </div>
            <div className="grid grid-cols-1 gap-2 pt-2 border-t border-border">
              <SummaryRow icon={User} label="Contractor" value={`${permit.contractorName} — ${permit.contractorCompany}`} />
              {site && <SummaryRow icon={Building2} label="Site" value={site.name} />}
              <SummaryRow icon={MapPin} label="Location" value={permit.locationOnSite} />
              <SummaryRow
                icon={CalendarDays}
                label="Permit Dates"
                value={
                  permit.plannedStartDate === permit.plannedEndDate
                    ? format(parseISO(permit.plannedStartDate), "d MMMM yyyy")
                    : `${format(parseISO(permit.plannedStartDate), "d MMM")} – ${format(parseISO(permit.plannedEndDate), "d MMM yyyy")}`
                }
              />
              <SummaryRow
                icon={FileText}
                label="Works Description"
                value={permit.workDescription.length > 100 ? permit.workDescription.slice(0, 100) + "…" : permit.workDescription}
              />
            </div>
            {permit.approvalNotes && (
              <div className="pt-2 border-t border-border flex items-start gap-2">
                <ShieldCheck className="w-3.5 h-3.5 text-green-600 shrink-0 mt-0.5" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Approval note:</strong> &ldquo;{permit.approvalNotes}&rdquo;
                </p>
              </div>
            )}
          </div>

          {/* Completion form */}
          <form onSubmit={handleSubmit} className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4">
            <div>
              <h2 className="text-sm font-semibold text-foreground mb-0.5">Job Completion Form</h2>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Confirm the works are complete. Attach your job sheet, photos, or any certificates.
              </p>
            </div>

            {/* Your name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">
                Your Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Stuart Wallace"
                required
              />
            </div>

            {/* Email */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">
                Your Email Address
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.co.uk"
              />
            </div>

            {/* Completion notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">
                Completion Notes
                <span className="text-muted-foreground font-normal ml-1">(optional)</span>
              </Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the work completed, any findings, parts replaced, issues encountered, follow-up required..."
                rows={5}
                className="resize-none text-sm"
              />
            </div>

            {/* Attachments */}
            <div className="flex flex-col gap-2">
              <Label>Attachments</Label>
              <p className="text-xs text-muted-foreground -mt-1">
                Upload your job sheet, photos, certificates, or any supporting documents.
              </p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center justify-center gap-2.5 px-4 py-3.5 rounded-lg border-2 border-dashed border-border hover:border-[var(--brand-purple)]/40 hover:bg-[var(--brand-purple)]/5 transition-colors text-sm text-muted-foreground"
              >
                <Upload className="w-4 h-4 shrink-0" />
                Click to attach job cards, photos or certificates
              </button>
              {attachments.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {attachments.map((att) => {
                    const isImage = att.type.startsWith("image/");
                    return (
                      <div key={att.id} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/60 bg-muted/30">
                        {isImage ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={att.dataUrl} alt={att.name} className="w-8 h-8 rounded object-cover shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded bg-muted flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4 text-muted-foreground" />
                          </div>
                        )}
                        <span className="text-xs flex-1 min-w-0 truncate">{att.name}</span>
                        <button
                          type="button"
                          onClick={() => removeAttachment(att.id)}
                          className="p-1 rounded hover:bg-muted transition-colors"
                          aria-label="Remove attachment"
                        >
                          <X className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Safety declaration */}
            <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-3">
              <ClipboardCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                By submitting this form you confirm that all works described in the permit have been completed safely, the site has been left clean and secure, and all personnel and equipment have been removed from the work area.
              </p>
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
                <p className="text-xs text-red-800">{error}</p>
              </div>
            )}

            <Button
              type="submit"
              disabled={!isValid || submitting}
              className="w-full bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white mt-1"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" />Submit Job Completion</>
              )}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground pb-4">
            Casa Moda Asset Compliance Portal
          </p>
        </div>
      </main>
    </div>
  );
}

function SummaryRow({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-3.5 h-3.5 text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
        <p className="text-xs text-foreground leading-snug mt-0.5 break-words">{value}</p>
      </div>
    </div>
  );
}

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
        <p className="text-white font-semibold text-sm leading-none">Casa Moda</p>
        <p className="text-white/60 text-xs mt-0.5">Permit to Work — Job Completion</p>
      </div>
    </header>
  );
}
