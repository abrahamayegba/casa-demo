"use client";
import { useState, useEffect } from "react";
import {
  getPermits,
  savePermit,
  getSites,
  generateId,
  addNotification,
} from "@/lib/store";
import type { Permit, Site, PermitStatus, PermitWorkType } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ClipboardList,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  AlertTriangle,
  Building2,
  User,
  ShieldAlert,
  HardHat,
  FileText,
  ChevronRight,
  ExternalLink,
  Copy,
  Check,
  ArrowUpRight,
  Flame,
  Calendar,
  QrCode,
  Download,
  Globe,
  Eye,
} from "lucide-react";
import { PermitPreviewModal } from "@/components/permit-preview-modal";
import { QRCodeSVG } from "qrcode.react";
import {
  format,
  isToday,
  isTomorrow,
  isYesterday,
  parseISO,
  addDays,
  startOfDay,
  endOfDay,
  isWithinInterval,
} from "date-fns";
import { cn } from "@/lib/utils";
import Link from "next/link";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<
  PermitStatus,
  { label: string; dot: string; badge: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pending Review",
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    icon: Clock,
  },
  approved: {
    label: "Approved",
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
    icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
    icon: XCircle,
  },
  expired: {
    label: "Expired",
    dot: "bg-gray-400",
    badge: "bg-gray-50 text-gray-600 border-gray-200",
    icon: Clock,
  },
  closed: {
    label: "Closed",
    dot: "bg-teal-500",
    badge: "bg-teal-50 text-teal-700 border-teal-200",
    icon: CheckCircle2,
  },
};

const WORK_TYPE_LABELS: Record<PermitWorkType, string> = {
  general_maintenance: "General Maintenance",
  electrical: "Electrical Works",
  hot_works: "Hot Works",
  confined_space: "Confined Space",
  working_at_height: "Working at Height",
  excavation: "Excavation",
  asbestos_adjacent: "Asbestos Adjacent",
  roof_access: "Roof Access",
  plant_room: "Plant Room",
  other: "Other",
};

const WORK_TYPE_RISK: Record<PermitWorkType, "low" | "medium" | "high"> = {
  general_maintenance: "low",
  electrical: "high",
  hot_works: "high",
  confined_space: "high",
  working_at_height: "high",
  excavation: "high",
  asbestos_adjacent: "high",
  roof_access: "medium",
  plant_room: "medium",
  other: "low",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PermitsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [permits, setPermits] = useState<Permit[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedPermit, setSelectedPermit] = useState<Permit | null>(null);
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [actionPermit, setActionPermit] = useState<Permit | null>(null);
  const [approvalNotes, setApprovalNotes] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [copiedLink, setCopiedLink] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const [permitPreviewOpen, setPermitPreviewOpen] = useState(false);
  const [dailyDate, setDailyDate] = useState(() =>
    format(new Date(), "yyyy-MM-dd"),
  );

  useEffect(() => {
    setPermits(getPermits());
    setSites(getSites());
  }, []);

  function refresh() {
    setPermits(getPermits());
  }

  // ── Portal URL ────────────────────────────────────────────────────────────
  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/permit`
      : "/permit";
  function handleCopyLink() {
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2200);
    });
  }

  function handleDownloadQR() {
    const svg = document.getElementById("permit-portal-qr-svg");
    if (!svg) return;
    const serializer = new XMLSerializer();
    const svgStr = serializer.serializeToString(svg);
    const canvas = document.createElement("canvas");
    const size = 512;
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new Image();
    img.onload = () => {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      const a = document.createElement("a");
      a.download = "permit-portal-qr.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
  }

  // ── Approval ─────────────────────────────────────────────────────────────
  function handleApprove() {
    if (!actionPermit || !user) return;
    const updated: Permit = {
      ...actionPermit,
      status: "approved",
      reviewedAt: new Date().toISOString(),
      reviewedBy: user.name,
      reviewedByUserId: user.id,
      approvalNotes: approvalNotes.trim() || undefined,
    };
    savePermit(updated);
    addNotification({
      id: generateId("ntf"),
      type: "job_completed",
      title: `Permit Approved: ${actionPermit.contractorCompany}`,
      message: `Permit PTW for ${actionPermit.contractorCompany} at ${sites.find((s) => s.id === actionPermit.siteId)?.name} has been approved.`,
      read: false,
      createdAt: new Date().toISOString(),
      linkTo: "/permits",
    });
    refresh();
    setApproveOpen(false);
    setActionPermit(null);
    setApprovalNotes("");
    if (selectedPermit?.id === updated.id) setSelectedPermit(updated);
  }

  function handleReject() {
    if (!actionPermit || !user) return;
    const updated: Permit = {
      ...actionPermit,
      status: "rejected",
      reviewedAt: new Date().toISOString(),
      reviewedBy: user.name,
      reviewedByUserId: user.id,
      rejectionReason: rejectionReason.trim(),
    };
    savePermit(updated);
    addNotification({
      id: generateId("ntf"),
      type: "test_failed",
      title: `Permit Rejected: ${actionPermit.contractorCompany}`,
      message: `Permit for ${actionPermit.contractorCompany} has been rejected.`,
      read: false,
      createdAt: new Date().toISOString(),
      linkTo: "/permits",
    });
    refresh();
    setRejectOpen(false);
    setActionPermit(null);
    setRejectionReason("");
    if (selectedPermit?.id === updated.id) setSelectedPermit(updated);
  }

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filtered = permits.filter((p) => {
    const site = sites.find((s) => s.id === p.siteId);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      p.contractorCompany.toLowerCase().includes(q) ||
      p.contractorName.toLowerCase().includes(q) ||
      (site?.name ?? "").toLowerCase().includes(q) ||
      p.workDescription.toLowerCase().includes(q);
    const matchSite = siteFilter === "all" || p.siteId === siteFilter;
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    return matchSearch && matchSite && matchStatus;
  });

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = {
    pending: permits.filter((p) => p.status === "pending").length,
    approved: permits.filter((p) => p.status === "approved").length,
    rejected: permits.filter((p) => p.status === "rejected").length,
    today: permits.filter((p) => isToday(parseISO(p.plannedStartDate))).length,
  };

  // ── Daily live view ───────────────────────────────────────────────────────
  const dailyPermits = permits.filter((p) => {
    if (p.status !== "approved") return false;
    const start = parseISO(p.plannedStartDate);
    const end = parseISO(p.plannedEndDate);
    const day = parseISO(dailyDate);
    return isWithinInterval(day, {
      start: startOfDay(start),
      end: endOfDay(end),
    });
  });

  const dailyBySite = sites
    .map((site) => ({
      site,
      permits: dailyPermits.filter((p) => p.siteId === site.id),
    }))
    .filter((s) => s.permits.length > 0);

  // ── Label helpers ─────────────────────────────────────────────────────────
  function dateLabel(d: string) {
    const dt = parseISO(d);
    if (isToday(dt)) return "Today";
    if (isTomorrow(dt)) return "Tomorrow";
    if (isYesterday(dt)) return "Yesterday";
    return format(dt, "d MMM yyyy");
  }

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Permits to Work</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Contractor permit approval and daily site activity
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <code className="hidden lg:block text-xs bg-background border border-border rounded-md px-2.5 py-1.5 text-muted-foreground font-mono">
            {portalUrl.replace(/^https?:\/\//, "")}
          </code>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={handleCopyLink}
          >
            {copiedLink ? (
              <Check className="w-3 h-3 mr-1.5" />
            ) : (
              <Copy className="w-3 h-3 mr-1.5" />
            )}
            {copiedLink ? "Copied!" : "Copy Link"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => setQrOpen(true)}
          >
            <QrCode className="w-3 h-3 mr-1.5" />
            QR Code
          </Button>
          <Link href="/permit" target="_blank">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              Contractor Form
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          {
            label: "Pending Review",
            value: stats.pending,
            dot: "bg-amber-500",
          },
          { label: "Approved", value: stats.approved, dot: "bg-green-500" },
          { label: "Rejected", value: stats.rejected, dot: "bg-red-500" },
          {
            label: "Active Today",
            value: stats.today,
            dot: "bg-[var(--brand-purple)]",
          },
        ].map(({ label, value, dot }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
          >
            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dot)} />
            <div>
              <p className="text-xl font-bold text-foreground leading-none">
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <Tabs defaultValue="daily">
        <TabsList className="w-auto">
          <TabsTrigger value="daily" className="gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Daily Live View
          </TabsTrigger>
          <TabsTrigger value="queue" className="gap-1.5">
            <ClipboardList className="w-3.5 h-3.5" />
            Approval Queue
            {stats.pending > 0 && (
              <span className="ml-1 inline-flex items-center justify-center w-4 h-4 rounded-full bg-amber-500 text-white text-[10px] font-bold">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
        </TabsList>
        {/* ── Daily Live View Tab ── */}
        <TabsContent value="daily" className="mt-4 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <p className="text-sm font-medium text-foreground">
                View permits for:
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() =>
                  setDailyDate(
                    format(addDays(parseISO(dailyDate), -1), "yyyy-MM-dd"),
                  )
                }
              >
                ←
              </Button>
              <Input
                type="date"
                value={dailyDate}
                onChange={(e) => setDailyDate(e.target.value)}
                className="h-8 text-sm w-40"
              />
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() =>
                  setDailyDate(
                    format(addDays(parseISO(dailyDate), 1), "yyyy-MM-dd"),
                  )
                }
              >
                →
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => setDailyDate(format(new Date(), "yyyy-MM-dd"))}
              >
                Today
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">
              — {dailyPermits.length} active permit
              {dailyPermits.length !== 1 ? "s" : ""}
            </p>
          </div>

          {dailyPermits.length === 0 ? (
            <div className="rounded-xl border border-border bg-card py-16 text-center">
              <Calendar className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
              <p className="text-sm text-muted-foreground font-medium">
                No active permits on this date
              </p>
              <p className="text-xs text-muted-foreground/60 mt-1">
                Approved permits with work dates matching{" "}
                {format(parseISO(dailyDate), "d MMMM yyyy")} will appear here
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {dailyBySite.map(({ site, permits: sitePermits }) => (
                <div
                  key={site.id}
                  className="rounded-xl border border-border bg-card overflow-hidden"
                >
                  {/* Site header */}
                  <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-[var(--brand-purple)]/5">
                    <Building2 className="w-4 h-4 text-[var(--brand-purple)]" />
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-foreground">
                        {site.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {site.address}, {site.city}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-[var(--brand-purple)] bg-[var(--brand-purple)]/10 border border-[var(--brand-purple)]/20 rounded-md px-2 py-0.5">
                      {sitePermits.length} active
                    </span>
                  </div>

                  {/* Permits on this site */}
                  <div className="divide-y divide-border">
                    {sitePermits.map((permit) => {
                      const risk = WORK_TYPE_RISK[permit.workType];
                      return (
                        <div
                          key={permit.id}
                          className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-muted/20 cursor-pointer group"
                          onClick={() => setSelectedPermit(permit)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <p className="text-sm font-medium text-foreground">
                                {permit.contractorCompany}
                              </p>
                              <span className="text-xs text-muted-foreground">
                                — {permit.contractorName}
                              </span>
                              {risk === "high" && (
                                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  High Risk
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-3 mt-1 flex-wrap">
                              <span className="text-xs text-muted-foreground">
                                {WORK_TYPE_LABELS[permit.workType]}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ·
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {permit.locationOnSite}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                ·
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {permit.estimatedWorkers} worker
                                {permit.estimatedWorkers !== 1 ? "s" : ""}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {/* PPE summary */}
                            <div className="flex items-center gap-1">
                              {permit.ppeHardHat && (
                                <span
                                  title="Hard Hat"
                                  className="w-5 h-5 rounded bg-muted flex items-center justify-center text-[10px]"
                                >
                                  <HardHat className="w-3 h-3 text-muted-foreground" />
                                </span>
                              )}
                              {permit.ppeHighVis && (
                                <span
                                  title="High Vis"
                                  className="w-5 h-5 rounded bg-amber-100 flex items-center justify-center text-[10px] font-bold text-amber-700"
                                >
                                  V
                                </span>
                              )}
                              {permit.ppeSafetyBoots && (
                                <span
                                  title="Safety Boots"
                                  className="w-5 h-5 rounded bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-700"
                                >
                                  B
                                </span>
                              )}
                              {permit.hazardElectrical && (
                                <span
                                  title="Electrical hazard"
                                  className="w-5 h-5 rounded bg-yellow-100 flex items-center justify-center"
                                >
                                  <Flame className="w-3 h-3 text-yellow-700" />
                                </span>
                              )}
                              {permit.hazardHotWorks && (
                                <span
                                  title="Hot works"
                                  className="w-5 h-5 rounded bg-red-100 flex items-center justify-center"
                                >
                                  <Flame className="w-3 h-3 text-red-700" />
                                </span>
                              )}
                            </div>
                            <span className="inline-flex items-center gap-1.5 text-xs border px-2 py-0.5 rounded-md bg-green-50 text-green-700 border-green-200">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
                              Approved
                            </span>
                            <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* ── Approval Queue Tab ── */}
        <TabsContent value="queue" className="mt-4 flex flex-col gap-4">
          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            {/* Search */}
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search permits..."
                className="pl-8 h-9 text-sm w-full"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {/* Site */}
            <Select value={siteFilter} onValueChange={setSiteFilter}>
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder="All Sites" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sites</SelectItem>
                {sites.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 text-sm w-full">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            {filtered.length === 0 ? (
              <div className="py-16 text-center">
                <ClipboardList className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-sm text-muted-foreground font-medium">
                  No permits found
                </p>
                <p className="text-xs text-muted-foreground/60 mt-1">
                  {search || siteFilter !== "all" || statusFilter !== "all"
                    ? "Try adjusting your filters"
                    : "Share the contractor link to receive permit applications"}
                </p>
              </div>
            ) : (
              <div className="w-full overflow-x-auto">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[30%]">
                        Contractor
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[22%]">
                        Site
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[18%]">
                        Work Type
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[14%]">
                        Status
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[10%]">
                        Date
                      </th>
                      <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 w-[6%]"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filtered.map((permit) => {
                      const site = sites.find((s) => s.id === permit.siteId);
                      const cfg = STATUS_CONFIG[permit.status];
                      const risk = WORK_TYPE_RISK[permit.workType];
                      return (
                        <tr
                          key={permit.id}
                          className="hover:bg-muted/30 transition-colors cursor-pointer group"
                          onClick={() => setSelectedPermit(permit)}
                        >
                          {/* Contractor */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-start gap-2.5">
                              <span
                                className={cn(
                                  "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
                                  cfg.dot,
                                )}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground leading-snug">
                                  {permit.contractorCompany}
                                </p>
                                <p className="text-xs text-muted-foreground">
                                  {permit.contractorName}
                                </p>
                                {risk === "high" && (
                                  <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 mt-1 rounded bg-red-50 text-red-700 border border-red-200">
                                    <AlertTriangle className="w-2.5 h-2.5" />
                                    High Risk
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Site */}
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-1.5">
                              <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                              <span className="text-xs text-muted-foreground">
                                {site?.name ?? "—"}
                              </span>
                            </div>
                          </td>

                          {/* Work type */}
                          <td className="px-4 py-3.5 align-middle">
                            <span className="text-xs text-muted-foreground">
                              {WORK_TYPE_LABELS[permit.workType]}
                            </span>
                          </td>

                          {/* Status */}
                          <td className="px-4 py-3.5 align-middle">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 text-xs border px-2 py-0.5 rounded-md whitespace-nowrap",
                                cfg.badge,
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full shrink-0",
                                  cfg.dot,
                                )}
                              />
                              {cfg.label}
                            </span>
                          </td>

                          {/* Date */}
                          <td className="px-4 py-3.5 align-middle">
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {dateLabel(permit.plannedStartDate)}
                            </p>
                            {permit.plannedStartDate !==
                              permit.plannedEndDate && (
                              <p className="text-[10px] text-muted-foreground/60 whitespace-nowrap">
                                to {dateLabel(permit.plannedEndDate)}
                              </p>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="px-4 py-3.5 align-middle">
                            {permit.status === "pending" && isAdmin ? (
                              <div className="flex items-center gap-1.5">
                                <Button
                                  size="sm"
                                  className="h-7 text-xs px-2.5 bg-green-600 hover:bg-green-700 text-white"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionPermit(permit);
                                    setApproveOpen(true);
                                  }}
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Approve
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="h-7 text-xs px-2.5 border-red-200 text-red-600 hover:bg-red-50"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActionPermit(permit);
                                    setRejectOpen(true);
                                  }}
                                >
                                  Reject
                                </Button>
                              </div>
                            ) : (
                              <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* ── Permit Detail Dialog ── */}
      {selectedPermit && (
        <PermitDetailDialog
          permit={selectedPermit}
          site={sites.find((s) => s.id === selectedPermit.siteId)}
          isAdmin={isAdmin}
          onClose={() => setSelectedPermit(null)}
          onApprove={() => {
            setActionPermit(selectedPermit);
            setApproveOpen(true);
          }}
          onReject={() => {
            setActionPermit(selectedPermit);
            setRejectOpen(true);
          }}
          onViewPermit={() => setPermitPreviewOpen(true)}
        />
      )}

      {/* ── Permit Preview Modal ── */}
      {selectedPermit && (
        <PermitPreviewModal
          permit={selectedPermit}
          site={sites.find((s) => s.id === selectedPermit.siteId)}
          open={permitPreviewOpen}
          onClose={() => setPermitPreviewOpen(false)}
        />
      )}

      {/* ── Approve Dialog ── */}
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Approve Permit</DialogTitle>
            <DialogDescription>
              Approve the permit for{" "}
              <strong>{actionPermit?.contractorCompany}</strong>. The contractor
              will be notified.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <label className="text-sm font-medium text-foreground">
              Notes (optional)
            </label>
            <Textarea
              placeholder="Add any conditions or notes for the contractor..."
              rows={3}
              className="resize-none text-sm"
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setApproveOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={handleApprove}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Confirm Approval
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QR Code Dialog ── */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[var(--brand-purple)]" />
              Contractor Permit Portal QR
            </DialogTitle>
            <DialogDescription>
              Print or display this QR code so contractors can quickly access the permit to work application on any device.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="p-4 bg-white rounded-xl border border-border shadow-sm">
              <QRCodeSVG
                id="permit-portal-qr-svg"
                value={portalUrl}
                size={200}
                level="M"
                includeMargin={false}
              />
            </div>
            <div className="flex items-center gap-1.5 px-3 py-2 bg-muted/50 rounded-lg border border-border w-full">
              <Globe className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <code className="text-xs text-muted-foreground font-mono truncate flex-1">
                {portalUrl.replace(/^https?:\/\//, "")}
              </code>
            </div>
            <p className="text-xs text-muted-foreground text-center leading-relaxed max-w-[240px]">
              Share this QR code with contractors. Scanning it will open the permit to work application form directly.
            </p>
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={handleCopyLink}>
              <Copy className="w-3.5 h-3.5 mr-1.5" />
              {copiedLink ? "Copied!" : "Copy Link"}
            </Button>
            <Button size="sm" className="flex-1 bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white" onClick={handleDownloadQR}>
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download PNG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Reject Dialog ── */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Reject Permit</DialogTitle>
            <DialogDescription>
              Reject the permit for{" "}
              <strong>{actionPermit?.contractorCompany}</strong>. Please provide
              a reason so the contractor can resubmit.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            <label className="text-sm font-medium text-foreground">
              Reason for rejection
            </label>
            <Textarea
              placeholder="Explain why this permit is being rejected and what the contractor needs to address..."
              rows={4}
              className="resize-none text-sm"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setRejectOpen(false)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!rejectionReason.trim()}
              onClick={handleReject}
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Confirm Rejection
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Permit Detail Dialog ─────────────────────────────────────────────────────

function PermitDetailDialog({
  permit,
  site,
  isAdmin,
  onClose,
  onApprove,
  onReject,
  onViewPermit,
}: {
  permit: Permit;
  site?: Site;
  isAdmin: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  onViewPermit?: () => void;
}) {
  const cfg = STATUS_CONFIG[permit.status];
  const risk = WORK_TYPE_RISK[permit.workType];

  const hazards = [
    permit.hazardElectrical && "Electrical",
    permit.hazardHotWorks && "Hot Works",
    permit.hazardAsbestos && "Asbestos nearby",
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

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        <DialogTitle></DialogTitle>
        {/* Header */}
        <div className="sticky top-0 bg-card border-b border-border px-6 py-4 flex items-start justify-between gap-4 z-10">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base font-bold text-foreground">
                {permit.contractorCompany}
              </h2>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs border px-2 py-0.5 rounded-md",
                  cfg.badge,
                )}
              >
                <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
                {cfg.label}
              </span>
              {risk === "high" && (
                <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200">
                  <AlertTriangle className="w-2.5 h-2.5" />
                  High Risk Work
                </span>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Submitted{" "}
              {format(parseISO(permit.submittedAt), "d MMM yyyy 'at' HH:mm")}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {permit.status === "approved" && onViewPermit && (
              <Button
                size="sm"
                variant="outline"
                className="h-7 text-xs px-2.5 border-[var(--brand-purple)]/30 text-[var(--brand-purple)] hover:bg-[var(--brand-purple)]/5"
                onClick={onViewPermit}
              >
                <Eye className="w-3 h-3 mr-1" /> View Permit
              </Button>
            )}
            {permit.status === "pending" && isAdmin && (
              <>
                <Button
                  size="sm"
                  className="h-7 text-xs px-2.5 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => {
                    onClose();
                    onApprove();
                  }}
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" /> Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2.5 border-red-200 text-red-600 hover:bg-red-50"
                  onClick={() => {
                    onClose();
                    onReject();
                  }}
                >
                  Reject
                </Button>
              </>
            )}
          </div>
        </div>

        <div className="px-6 py-5 flex flex-col gap-5">
          {/* Status outcomes */}
          {permit.status === "approved" && (
            <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-green-50 border border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-green-900">
                  Approved by {permit.reviewedBy}
                </p>
                {permit.reviewedAt && (
                  <p className="text-xs text-green-700 mt-0.5">
                    {format(
                      parseISO(permit.reviewedAt),
                      "d MMM yyyy 'at' HH:mm",
                    )}
                  </p>
                )}
                {permit.approvalNotes && (
                  <p className="text-xs text-green-800 mt-1.5 italic">
                    &ldquo;{permit.approvalNotes}&rdquo;
                  </p>
                )}
              </div>
            </div>
          )}
          {permit.status === "rejected" && (
            <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-red-50 border border-red-200">
              <XCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Rejected by {permit.reviewedBy}
                </p>
                {permit.reviewedAt && (
                  <p className="text-xs text-red-700 mt-0.5">
                    {format(
                      parseISO(permit.reviewedAt),
                      "d MMM yyyy 'at' HH:mm",
                    )}
                  </p>
                )}
                {permit.rejectionReason && (
                  <p className="text-xs text-red-800 mt-1.5">
                    {permit.rejectionReason}
                  </p>
                )}
              </div>
            </div>
          )}
          {permit.status === "closed" && (
            <div className="flex items-start gap-2.5 px-3 py-3 rounded-lg bg-teal-50 border border-teal-200">
              <CheckCircle2 className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-teal-900">
                  Works completed — permit closed on site
                </p>
                {permit.closedByName && (
                  <p className="text-xs text-teal-700 mt-0.5">
                    Submitted by {permit.closedByName}
                    {permit.closedAt && ` on ${format(parseISO(permit.closedAt), "d MMM yyyy 'at' HH:mm")}`}
                  </p>
                )}
                {permit.closureNotes && (
                  <p className="text-xs text-teal-800 mt-1.5 leading-relaxed">
                    {permit.closureNotes}
                  </p>
                )}
                {permit.worksCompletedRecordId && (
                  <Link href="/works-completed" className="inline-flex items-center gap-1 text-xs text-teal-700 font-medium underline underline-offset-2 mt-1.5" onClick={onClose}>
                    View works completed record
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Contractor details */}
          <Section title="Contractor Details" icon={User}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <DetailItem
                label="Company"
                value={permit.contractorCompany}
                span={2}
              />
              <DetailItem label="Contact Name" value={permit.contractorName} />
              <DetailItem
                label="Supervisor on Site"
                value={permit.supervisorOnSite}
              />
              <DetailItem label="Email" value={permit.contractorEmail} />
              <DetailItem label="Phone" value={permit.contractorPhone} />
              <DetailItem
                label="Site"
                value={site?.name ?? permit.siteId}
                span={2}
              />
            </div>
          </Section>

          {/* Work details */}
          <Section title="Work Details" icon={ClipboardList}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <DetailItem
                label="Work Type"
                value={WORK_TYPE_LABELS[permit.workType]}
              />
              <DetailItem
                label="Workers on Site"
                value={String(permit.estimatedWorkers)}
              />
              <DetailItem
                label="Planned Start"
                value={format(parseISO(permit.plannedStartDate), "d MMM yyyy")}
              />
              <DetailItem
                label="Planned End"
                value={format(parseISO(permit.plannedEndDate), "d MMM yyyy")}
              />
              <DetailItem
                label="Location on Site"
                value={permit.locationOnSite}
                span={2}
              />
            </div>
            <div className="mt-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                Description of Works
              </p>
              <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg px-3 py-2.5 border border-border">
                {permit.workDescription}
              </p>
            </div>
          </Section>

          {/* Hazards + PPE side by side */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Section title="Hazards Identified" icon={ShieldAlert}>
              {hazards.length === 0 ? (
                <p className="text-xs text-muted-foreground">None identified</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {hazards.map((h) => (
                    <span
                      key={h}
                      className="inline-flex items-center text-xs px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200"
                    >
                      {h}
                    </span>
                  ))}
                </div>
              )}
            </Section>
            <Section title="PPE Required" icon={HardHat}>
              {ppe.length === 0 ? (
                <p className="text-xs text-muted-foreground">None specified</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {ppe.map((p) => (
                    <span
                      key={p}
                      className="inline-flex items-center text-xs px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {p}
                    </span>
                  ))}
                </div>
              )}
            </Section>
          </div>

          {/* Emergency */}
          <Section title="Emergency Arrangements" icon={AlertTriangle}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-3">
              <DetailItem
                label="Nearest First Aid"
                value={permit.nearestFirstAid}
              />
              <DetailItem
                label="Nearest Fire Exit"
                value={permit.nearestFireExit}
              />
            </div>
            <div className="mt-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1.5">
                Emergency Procedure
              </p>
              <p className="text-sm text-foreground leading-relaxed bg-muted/30 rounded-lg px-3 py-2.5 border border-border">
                {permit.emergencyProcedure}
              </p>
            </div>
          </Section>

          {/* Documents */}
          <Section title="Documentation" icon={FileText}>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2">
              <DocRow label="Risk Assessment" has={permit.hasRiskAssessment} />
              <DocRow
                label="Method Statement"
                has={permit.hasMethodStatement}
              />
              <DocRow
                label="Public Liability Insurance"
                has={permit.hasPublicLiabilityInsurance}
              />
              {permit.insuranceExpiryDate && (
                <p className="text-xs text-muted-foreground col-span-2 pl-5">
                  Insurance expires:{" "}
                  {format(parseISO(permit.insuranceExpiryDate), "d MMM yyyy")}
                </p>
              )}
            </div>
            {permit.attachments.length > 0 && (
              <div className="mt-3 flex flex-col gap-2">
                {permit.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-muted/20"
                  >
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <p className="text-xs text-foreground flex-1 truncate">
                      {att.name}
                    </p>
                    <a
                      href={att.dataUrl}
                      download={att.name}
                      className="text-[10px] text-[var(--brand-purple)] hover:underline flex items-center gap-0.5"
                    >
                      <ExternalLink className="w-3 h-3" /> Download
                    </a>
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* Declaration */}
          <Section title="Declaration" icon={CheckCircle2}>
            <p className="text-sm text-foreground">
              Signed by <strong>{permit.declarationName}</strong> on{" "}
              {format(parseISO(permit.declarationDate), "d MMMM yyyy")}
            </p>
          </Section>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reusable sub-components ──────────────────────────────────────────────────

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-3.5 h-3.5 text-[var(--brand-purple)]" />
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h3>
      </div>
      {children}
    </div>
  );
}

function DetailItem({
  label,
  value,
  span,
}: {
  label: string;
  value: string;
  span?: number;
}) {
  return (
    <div className={span === 2 ? "col-span-2" : undefined}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-0.5">
        {label}
      </p>
      <p className="text-sm text-foreground break-words leading-snug">
        {value || "—"}
      </p>
    </div>
  );
}

function DocRow({ label, has }: { label: string; has: boolean }) {
  return (
    <div className="flex items-center gap-2">
      {has ? (
        <CheckCircle2 className="w-3.5 h-3.5 text-green-600 shrink-0" />
      ) : (
        <XCircle className="w-3.5 h-3.5 text-muted-foreground/50 shrink-0" />
      )}
      <span
        className={cn(
          "text-xs",
          has ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
    </div>
  );
}
