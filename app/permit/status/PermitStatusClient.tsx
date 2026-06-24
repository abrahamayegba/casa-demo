"use client";


import { useState, useEffect, useCallback } from "react";
import { getPermits, getSites, seedIfNeeded } from "@/lib/store";
import type { Permit, Site } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PermitPreviewModal } from "@/components/permit-preview-modal";
import {
  CheckCircle2,
  XCircle,
  Clock,
  Flame,
  Search,
  ArrowLeft,
  Building2,
  CalendarDays,
  User,
  MapPin,
  FileText,
  ShieldCheck,
  Eye,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

function deriveRef(permit: Permit): string {
  return `PTW-${permit.id.split("_")[1]?.slice(-6).toUpperCase() ?? permit.id.slice(-6).toUpperCase()}`;
}

export default function PermitStatusPage() {
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [email, setEmail] = useState("");
  const [result, setResult] = useState<Permit | null | "not_found">(null);
  const [sites, setSites] = useState<Site[]>([]);
  const [searched, setSearched] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const handleSearch = useCallback(
    (overrideRef?: string) => {
      const permits = getPermits();
      const q = (overrideRef ?? query).trim().toUpperCase().replace(/\s/g, "");
      const emailQ = email.trim().toLowerCase();

      const match = permits.find((p) => {
        const ref = deriveRef(p).replace(/\s/g, "");
        const refMatch = ref === q;
        const emailMatch =
          !emailQ || p.contractorEmail.toLowerCase() === emailQ;
        return refMatch && emailMatch;
      });

      setResult(match ?? "not_found");
      setSearched(true);
    },
    [query, email],
  );

  useEffect(() => {
    seedIfNeeded();
    setSites(getSites());
    // Pre-fill ref from QR code scan URL param
    const refParam = searchParams.get("ref");
    if (refParam) {
      setQuery(refParam);
      // Auto-search after seeds are ready
      setTimeout(() => handleSearch(refParam), 100);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const site =
    result && result !== "not_found"
      ? sites.find((s) => s.id === result.siteId)
      : undefined;

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex flex-col">
      <PermitHeader />
      <main className="flex-1 flex flex-col items-center px-4 py-12">
        <div className="w-full max-w-md flex flex-col gap-6">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-bold text-foreground">
              Check Permit Status
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Enter your permit reference number to check whether your
              application has been approved, rejected, or is still awaiting
              review.
            </p>
          </div>

          {/* Search card */}
          <div className="bg-card rounded-xl border border-border shadow-sm p-5 flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="ref"
              >
                Permit Reference Number
              </label>
              <Input
                id="ref"
                placeholder="e.g. PTW-A1B2C3"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value.toUpperCase());
                  setSearched(false);
                  setResult(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="font-mono tracking-wide"
              />
              <p className="text-xs text-muted-foreground">
                This was shown on your confirmation screen after submission.
              </p>
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                className="text-sm font-medium text-foreground"
                htmlFor="email"
              >
                Your Email Address{" "}
                <span className="text-muted-foreground font-normal">
                  (optional — for verification)
                </span>
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.co.uk"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSearched(false);
                  setResult(null);
                }}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              />
            </div>
            <Button
              className="w-full bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
              disabled={!query.trim()}
              onClick={() => handleSearch()}
            >
              <Search className="w-4 h-4 mr-2" />
              Check Status
            </Button>
          </div>

          {/* Result */}
          {searched && result === "not_found" && (
            <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-2 text-center">
              <p className="text-sm font-medium text-foreground">
                No permit found
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                We could not find a permit matching <strong>{query}</strong>
                {email ? ` for ${email}` : ""}. Please double-check your
                reference number.
              </p>
            </div>
          )}

          {searched && result && result !== "not_found" && (
            <StatusCard
              permit={result}
              site={site}
              onViewPermit={() => setPreviewOpen(true)}
            />
          )}

          {/* Permit preview modal — only mounts when we have a valid result */}
          {result && result !== "not_found" && (
            <PermitPreviewModal
              permit={result}
              site={site}
              open={previewOpen}
              onClose={() => setPreviewOpen(false)}
            />
          )}

          {/* Back link */}
          <Link
            href="/permit"
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Submit a new permit
          </Link>
        </div>
      </main>
    </div>
  );
}

function StatusCard({
  permit,
  site,
  onViewPermit,
}: {
  permit: Permit;
  site?: Site;
  onViewPermit?: () => void;
}) {
  const ref = deriveRef(permit);

  const config = {
    pending: {
      icon: Clock,
      title: "Awaiting Review",
      description:
        "Your permit application has been received and is currently being reviewed by the site facilities manager.",
      bg: "bg-amber-50 border-amber-200",
      iconColor: "text-amber-600",
      titleColor: "text-amber-900",
      descColor: "text-amber-800",
      dot: "bg-amber-500",
    },
    approved: {
      icon: CheckCircle2,
      title: "Permit Approved",
      description:
        "Your permit to work has been approved. You may proceed with the works as described in your application. Ensure all safety measures are in place before starting.",
      bg: "bg-green-50 border-green-200",
      iconColor: "text-green-600",
      titleColor: "text-green-900",
      descColor: "text-green-800",
      dot: "bg-green-500",
    },
    rejected: {
      icon: XCircle,
      title: "Permit Rejected",
      description:
        "Your permit application has been rejected. Please review the reason below and resubmit once you have addressed the issues.",
      bg: "bg-red-50 border-red-200",
      iconColor: "text-red-600",
      titleColor: "text-red-900",
      descColor: "text-red-800",
      dot: "bg-red-500",
    },
    expired: {
      icon: Clock,
      title: "Permit Expired",
      description:
        "This permit has expired. If you need to carry out the works, please submit a new permit application.",
      bg: "bg-gray-50 border-gray-200",
      iconColor: "text-gray-500",
      titleColor: "text-gray-800",
      descColor: "text-gray-700",
      dot: "bg-gray-400",
    },
    closed: {
      icon: CheckCircle2,
      title: "Works Completed",
      description:
        "The works covered by this permit have been completed and the permit has been officially closed. A permanent works record has been created on the system.",
      bg: "bg-teal-50 border-teal-200",
      iconColor: "text-teal-600",
      titleColor: "text-teal-900",
      descColor: "text-teal-800",
      dot: "bg-teal-500",
    },
  }[permit.status];

  const StatusIcon = config.icon;

  return (
    <div className="flex flex-col gap-4">
      {/* Status banner */}
      <div
        className={cn(
          "rounded-xl border p-5 flex items-start gap-4",
          config.bg,
        )}
      >
        <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center shrink-0">
          <StatusIcon className={cn("w-5 h-5", config.iconColor)} />
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("font-semibold text-sm", config.titleColor)}>
            {config.title}
          </p>
          <p className={cn("text-xs mt-1 leading-relaxed", config.descColor)}>
            {config.description}
          </p>
          {permit.status === "rejected" && permit.rejectionReason && (
            <div className="mt-3 pt-3 border-t border-red-200">
              <p className="text-xs font-semibold text-red-900 mb-1">
                Reason given:
              </p>
              <p className="text-xs text-red-800 leading-relaxed">
                {permit.rejectionReason}
              </p>
            </div>
          )}
          {permit.status === "approved" && permit.approvalNotes && (
            <div className="mt-3 pt-3 border-t border-green-200">
              <p className="text-xs font-semibold text-green-900 mb-1">
                Notes from facilities manager:
              </p>
              <p className="text-xs text-green-800 leading-relaxed italic">
                &ldquo;{permit.approvalNotes}&rdquo;
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Permit summary card */}
      <div className="bg-card rounded-xl border border-border p-5 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
              Reference
            </p>
            <p className="text-lg font-bold font-mono tracking-wider text-foreground">
              {ref}
            </p>
          </div>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 text-xs border px-2.5 py-1 rounded-md",
              permit.status === "approved"
                ? "bg-green-50 text-green-700 border-green-200"
                : permit.status === "rejected"
                  ? "bg-red-50 text-red-700 border-red-200"
                  : permit.status === "pending"
                    ? "bg-amber-50 text-amber-700 border-amber-200"
                    : "bg-gray-50 text-gray-600 border-gray-200",
            )}
          >
            <span className={cn("w-1.5 h-1.5 rounded-full", config.dot)} />
            {permit.status.charAt(0).toUpperCase() + permit.status.slice(1)}
          </span>
        </div>

        <div className="grid grid-cols-1 gap-3 pt-3 border-t border-border">
          <SummaryRow
            icon={User}
            label="Contractor"
            value={`${permit.contractorName} — ${permit.contractorCompany}`}
          />
          {site && (
            <SummaryRow icon={Building2} label="Site" value={site.name} />
          )}
          <SummaryRow
            icon={MapPin}
            label="Location"
            value={permit.locationOnSite}
          />
          <SummaryRow
            icon={CalendarDays}
            label="Planned Dates"
            value={
              permit.plannedStartDate === permit.plannedEndDate
                ? format(parseISO(permit.plannedStartDate), "d MMMM yyyy")
                : `${format(parseISO(permit.plannedStartDate), "d MMM")} – ${format(parseISO(permit.plannedEndDate), "d MMM yyyy")}`
            }
          />
          <SummaryRow
            icon={FileText}
            label="Work Type"
            value={
              permit.workDescription.length > 80
                ? permit.workDescription.slice(0, 80) + "…"
                : permit.workDescription
            }
          />
        </div>

        {/* Reviewed info */}
        {permit.reviewedAt && permit.reviewedBy && (
          <div className="pt-3 border-t border-border flex items-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
            <p className="text-xs text-muted-foreground">
              Decision made by{" "}
              <strong className="text-foreground">{permit.reviewedBy}</strong>{" "}
              on {format(parseISO(permit.reviewedAt), "d MMMM yyyy 'at' HH:mm")}
            </p>
          </div>
        )}
      </div>

      {/* View full permit + important notice for approved */}
      {permit.status === "approved" && (
        <>
          <Button
            className="w-full bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
            onClick={onViewPermit}
          >
            <Eye className="w-4 h-4 mr-2" />
            View Full Permit &amp; Download
          </Button>
          <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs text-blue-800 leading-relaxed">
            <strong>Important:</strong> Keep this reference number safe. You may
            be asked to show proof of an approved permit when arriving on site.
            Work must remain within the scope described in your application.
          </div>
        </>
      )}

      {/* CTA to complete the job if approved */}
      {permit.status === "approved" && (
        <div className="flex flex-col gap-3">
          <div className="border-t border-border pt-1" />
          <p className="text-xs font-semibold text-foreground">Ready to close out?</p>
          <p className="text-xs text-muted-foreground leading-relaxed -mt-1">
            Once the works described in this permit are complete, use the link below to submit your job completion. This will close the permit and create a permanent works record.
          </p>
          <Link href={`/permit/close/${permit.id}`}>
            <Button className="w-full bg-green-600 hover:bg-green-700 text-white">
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Submit Job Completion
            </Button>
          </Link>
        </div>
      )}

      {/* Already closed */}
      {permit.status === "closed" && (
        <div className="rounded-lg bg-teal-50 border border-teal-200 px-4 py-3 text-xs text-teal-800 leading-relaxed">
          <strong>Permit Closed.</strong> This permit has been completed and a works record has been created. No further action is required.
        </div>
      )}

      {/* CTA to resubmit if rejected */}
      {permit.status === "rejected" && (
        <Link href="/permit">
          <Button className="w-full bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white">
            Submit a New Permit
          </Button>
        </Link>
      )}
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
        <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        <p className="text-sm text-foreground leading-snug mt-0.5 break-words">
          {value}
        </p>
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
        <p className="text-white font-semibold text-sm leading-none">
          Casa Moda
        </p>
        <p className="text-white/60 text-xs mt-0.5">
          Permit to Work — Status Checker
        </p>
      </div>
    </header>
  );
}
