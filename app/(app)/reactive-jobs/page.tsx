"use client";
import { useState, useEffect } from "react";
import {
  getReactiveJobs,
  saveReactiveJob,
  deleteReactiveJob,
  getSites,
  getSupplyChain,
  generateId,
} from "@/lib/store";
import type { ReactiveJob, Site, SupplyChainCompany } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Zap,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  AlertCircle,
  CheckCircle2,
  Clock,
  XCircle,
  Phone,
  Mail,
  User,
  Globe,
  WrenchIcon,
  Copy,
  Check,
  Building2,
  ChevronRight,
  CalendarDays,
  ArrowUpRight,
  QrCode,
  Download,
  Send,
  FileText,
  ExternalLink,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { QRCodeSVG } from "qrcode.react";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  open: {
    label: "Open",
    icon: AlertCircle,
    dot: "bg-red-500",
    badge: "bg-red-50 text-red-700 border-red-200",
  },
  "in-progress": {
    label: "In Progress",
    icon: Clock,
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    dot: "bg-green-500",
    badge: "bg-green-50 text-green-700 border-green-200",
  },
  cancelled: {
    label: "Cancelled",
    icon: XCircle,
    dot: "bg-gray-400",
    badge: "bg-gray-50 text-gray-600 border-gray-200",
  },
} as const;

const PRIORITY_CONFIG = {
  low: { label: "Low", badge: "bg-slate-100 text-slate-600 border-slate-200" },
  medium: {
    label: "Medium",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
  },
  high: {
    label: "High",
    badge: "bg-orange-50 text-orange-700 border-orange-200",
  },
  urgent: {
    label: "Urgent",
    badge: "bg-red-100 text-red-700 border-red-300 font-semibold",
  },
} as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ReactiveJobsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [jobs, setJobs] = useState<ReactiveJob[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [companies, setCompanies] = useState<SupplyChainCompany[]>([]);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editJob, setEditJob] = useState<ReactiveJob | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<ReactiveJob | null>(null);
  const [copyTooltip, setCopyTooltip] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);

  useEffect(() => {
    setJobs(getReactiveJobs());
    setSites(getSites());
    setCompanies(getSupplyChain());
  }, []);

  function refresh() {
    setJobs(getReactiveJobs());
  }

  const filtered = jobs.filter((j) => {
    const site = sites.find((s) => s.id === j.siteId);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      j.title.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      (j.contactName ?? "").toLowerCase().includes(q) ||
      (site?.name ?? "").toLowerCase().includes(q);
    const matchSite = siteFilter === "all" || j.siteId === siteFilter;
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    const matchPriority =
      priorityFilter === "all" || j.priority === priorityFilter;
    return matchSearch && matchSite && matchStatus && matchPriority;
  });

  const stats = {
    open: jobs.filter((j) => j.status === "open").length,
    inProgress: jobs.filter((j) => j.status === "in-progress").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    portal: jobs.filter((j) => j.source === "portal").length,
  };

  const portalUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/submit-job`
      : "/submit-job";

  function handleCopyLink() {
    navigator.clipboard.writeText(portalUrl).then(() => {
      setCopyTooltip(true);
      setTimeout(() => setCopyTooltip(false), 2200);
    });
  }

  function handleDownloadQR() {
    const svg = document.getElementById("portal-qr-svg");
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
      a.download = "rcs-job-portal-qr.png";
      a.href = canvas.toDataURL("image/png");
      a.click();
    };
    img.src =
      "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgStr)));
  }

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Reactive Jobs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Unplanned maintenance requests — {jobs.length} total
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white shrink-0"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            New Job
          </Button>
        )}
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Open", value: stats.open, dot: "bg-red-500" },
          { label: "In Progress", value: stats.inProgress, dot: "bg-blue-500" },
          { label: "Completed", value: stats.completed, dot: "bg-green-500" },
          {
            label: "Via Portal",
            value: stats.portal,
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

      {/* ── Portal intake banner ── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 px-4 py-4 rounded-xl border border-[var(--brand-purple)]/25 bg-[var(--brand-purple)]/5">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-[var(--brand-purple)] flex items-center justify-center shrink-0">
            <Globe className="w-4 h-4 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">
              Staff Job Submission Portal
            </p>
            <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
              Share this link with site staff to let them report maintenance
              issues directly — no login required.
            </p>
          </div>
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
            <Copy className="w-3 h-3 mr-1.5" />
            {copyTooltip ? "Copied!" : "Copy Link"}
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
          <Link href="/submit-job" target="_blank">
            <Button variant="outline" size="sm" className="h-8 text-xs">
              <ArrowUpRight className="w-3 h-3 mr-1" />
              Preview
            </Button>
          </Link>
        </div>
      </div>

      {/* ── Filters ── */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-2 w-full">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search jobs..."
            className="pl-8 h-9 text-sm w-full"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

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

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-sm w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="h-9 text-sm w-full">
            <SelectValue placeholder="Priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priority</SelectItem>
            <SelectItem value="low">Low</SelectItem>
            <SelectItem value="medium">Medium</SelectItem>
            <SelectItem value="high">High</SelectItem>
            <SelectItem value="urgent">Urgent</SelectItem>
          </SelectContent>
        </Select>

        {(search ||
          siteFilter !== "all" ||
          statusFilter !== "all" ||
          priorityFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground w-full md:w-auto"
            onClick={() => {
              setSearch("");
              setSiteFilter("all");
              setStatusFilter("all");
              setPriorityFilter("all");
            }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Jobs table ── */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[1fr_150px_110px_110px_100px_100px_44px] gap-4 px-4 py-2.5 border-b border-border bg-muted/40">
          <p className="text-xs font-medium text-muted-foreground">Job</p>
          <p className="text-xs font-medium text-muted-foreground">Site</p>
          <p className="text-xs font-medium text-muted-foreground">Status</p>
          <p className="text-xs font-medium text-muted-foreground">Priority</p>
          <p className="text-xs font-medium text-muted-foreground">Raised</p>
          <p className="text-xs font-medium text-muted-foreground">Scheduled</p>
          <p className="text-xs font-medium text-muted-foreground sr-only">
            Actions
          </p>
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center">
            <Zap className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground font-medium">
              No jobs found
            </p>
            <p className="text-xs text-muted-foreground/60 mt-1">
              {search ||
              siteFilter !== "all" ||
              statusFilter !== "all" ||
              priorityFilter !== "all"
                ? "Try adjusting your filters"
                : "Create a job or share the portal link with site staff"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {filtered.map((job) => {
              const site = sites.find((s) => s.id === job.siteId);
              const statusCfg = STATUS_CONFIG[job.status];
              const priorityCfg = PRIORITY_CONFIG[job.priority];
              return (
                <div
                  key={job.id}
                  className="grid grid-cols-1 md:grid-cols-[1fr_150px_110px_110px_100px_100px_44px] gap-2 md:gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group items-center"
                  onClick={() => setSelectedJob(job)}
                >
                  {/* Title + source */}
                  <div className="flex items-start gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "mt-1.5 w-1.5 h-1.5 rounded-full shrink-0",
                        statusCfg.dot,
                      )}
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-sm font-medium text-foreground truncate">
                          {job.title}
                        </span>
                        {job.source === "portal" && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-[var(--brand-purple)]/10 text-[var(--brand-purple)] border border-[var(--brand-purple)]/20 shrink-0">
                            <Globe className="w-2.5 h-2.5" />
                            Portal
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5 truncate md:hidden">
                        {site?.name}
                        {job.contactName ? ` · ${job.contactName}` : ""}
                      </p>
                      {job.contactName && (
                        <p className="text-xs text-muted-foreground mt-0.5 hidden md:block truncate">
                          {job.contactName}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Site */}
                  <div className="hidden md:flex items-center gap-1.5 min-w-0">
                    <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                    <span className="text-xs text-muted-foreground truncate">
                      {site?.name ?? "—"}
                    </span>
                  </div>

                  {/* Status */}
                  <div className="hidden md:flex">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs border px-2 py-0.5 rounded-md",
                        statusCfg.badge,
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          statusCfg.dot,
                        )}
                      />
                      {statusCfg.label}
                    </span>
                  </div>

                  {/* Priority */}
                  <div className="hidden md:flex">
                    <span
                      className={cn(
                        "text-xs border px-2 py-0.5 rounded-md",
                        priorityCfg.badge,
                      )}
                    >
                      {priorityCfg.label}
                    </span>
                  </div>

                  {/* Date Raised */}
                  <div className="hidden md:block">
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(job.createdAt), {
                        addSuffix: true,
                      })}
                    </p>
                  </div>

                  {/* Scheduled Date */}
                  <div className="hidden md:block">
                    {job.scheduledDate ? (
                      <p className="text-xs text-foreground font-medium">
                        {format(new Date(job.scheduledDate), "dd MMM yyyy")}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/50">—</p>
                    )}
                  </div>

                  {/* Actions */}
                  {isAdmin ? (
                    <div className="hidden md:flex justify-end">
                      <DropdownMenu>
                        <DropdownMenuTrigger
                          asChild
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                            <MoreHorizontal className="w-4 h-4" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-36">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditJob(job);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(job.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ) : (
                    <div className="hidden md:flex justify-end">
                      <ChevronRight className="w-4 h-4 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
                    </div>
                  )}

                  {/* Mobile badge row */}
                  <div className="flex items-center gap-2 md:hidden">
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 text-xs border px-2 py-0.5 rounded-md",
                        statusCfg.badge,
                      )}
                    >
                      <span
                        className={cn(
                          "w-1.5 h-1.5 rounded-full",
                          statusCfg.dot,
                        )}
                      />
                      {statusCfg.label}
                    </span>
                    <span
                      className={cn(
                        "text-xs border px-2 py-0.5 rounded-md",
                        priorityCfg.badge,
                      )}
                    >
                      {priorityCfg.label}
                    </span>
                    <span className="text-xs text-muted-foreground ml-auto">
                      {formatDistanceToNow(new Date(job.createdAt), {
                        addSuffix: true,
                      })}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="border-t border-border px-4 py-2.5 bg-muted/20">
            <p className="text-xs text-muted-foreground">
              Showing {filtered.length} of {jobs.length} jobs
            </p>
          </div>
        )}
      </div>

      {/* ── Job Detail Sheet ── */}
      {selectedJob && (
        <JobDetailDialog
          job={selectedJob}
          site={sites.find((s) => s.id === selectedJob.siteId)}
          onClose={() => setSelectedJob(null)}
          onEdit={() => {
            setEditJob(selectedJob);
            setSelectedJob(null);
          }}
          isAdmin={isAdmin}
        />
      )}

      {/* ── Add dialog ── */}
      <ReactiveJobFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        sites={sites}
        companies={companies}
        user={user}
        onSave={(data) => {
          saveReactiveJob({
            ...data,
            id: generateId("job"),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
          refresh();
          setAddOpen(false);
        }}
      />

      {/* ── Edit dialog ���─ */}
      {editJob && (
        <ReactiveJobFormDialog
          open={!!editJob}
          onOpenChange={(o) => !o && setEditJob(null)}
          sites={sites}
          companies={companies}
          user={user}
          initialData={editJob}
          onSave={(data) => {
            saveReactiveJob({
              ...editJob,
              ...data,
              updatedAt: new Date().toISOString(),
            });
            refresh();
            setEditJob(null);
          }}
        />
      )}

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Job</DialogTitle>
            <DialogDescription>
              This will permanently remove the job and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteId) {
                  deleteReactiveJob(deleteId);
                  refresh();
                  setDeleteId(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── QR Code dialog ── */}
      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-4 h-4 text-[var(--brand-purple)]" />
              Job Submission QR Code
            </DialogTitle>
            <DialogDescription>
              Print or display this code at each site. Staff scan it with their
              phone to report a maintenance issue — no login needed.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-2">
            {/* QR code */}
            <div className="p-4 bg-white rounded-xl border border-border shadow-sm">
              <QRCodeSVG
                id="portal-qr-svg"
                value={portalUrl}
                size={200}
                bgColor="#ffffff"
                fgColor="#1a1a2e"
                level="M"
                includeMargin={false}
              />
            </div>

            {/* URL label */}
            <div className="text-center">
              <p className="text-xs font-mono text-muted-foreground bg-muted px-3 py-1.5 rounded-md">
                {portalUrl.replace(/^https?:\/\//, "")}
              </p>
              <p className="text-xs text-muted-foreground mt-2">
                Scan to open the staff job submission form
              </p>
            </div>

            {/* Tip */}
            <div className="w-full rounded-lg border border-[var(--brand-purple)]/20 bg-[var(--brand-purple)]/5 px-3 py-2.5 text-xs text-muted-foreground leading-relaxed">
              <span className="font-medium text-foreground">Tip:</span> Download
              the PNG and paste it into a Word document or email. You can print
              one per site and laminate it near the front desk.
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setQrOpen(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
              onClick={handleDownloadQR}
            >
              <Download className="w-3.5 h-3.5 mr-1.5" />
              Download PNG
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Job Detail Dialog ────────────────────────────────────────────────────────

function JobDetailDialog({
  job,
  site,
  onClose,
  onEdit,
  isAdmin,
}: {
  job: ReactiveJob;
  site?: Site;
  onClose: () => void;
  onEdit: () => void;
  isAdmin: boolean;
}) {
  const statusCfg = STATUS_CONFIG[job.status];
  const priorityCfg = PRIORITY_CONFIG[job.priority];
  const hasIntake =
    job.source === "portal" &&
    (job.contactName || job.contactPhone || job.contactEmail);
  const [linkCopied, setLinkCopied] = useState(false);
  const jobLink =
    typeof window !== "undefined"
      ? `${window.location.origin}/jobs/${job.id}/close`
      : `/jobs/${job.id}/close`;

  function copyJobLink() {
    navigator.clipboard.writeText(jobLink).catch(() => {});
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 2000);
  }

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-2">
            {job.source === "portal" ? (
              <div className="w-6 h-6 rounded bg-[var(--brand-purple)]/10 flex items-center justify-center shrink-0">
                <Globe className="w-3.5 h-3.5 text-[var(--brand-purple)]" />
              </div>
            ) : (
              <div className="w-6 h-6 rounded bg-muted flex items-center justify-center shrink-0">
                <WrenchIcon className="w-3.5 h-3.5 text-muted-foreground" />
              </div>
            )}
            <DialogTitle className="text-base leading-tight">
              {job.title}
            </DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs">
              <Building2 className="w-3 h-3" />
              {site?.name ?? "Unknown site"}
            </span>
            <span className="text-border">·</span>
            <span
              className={cn(
                "inline-flex items-center gap-1.5 text-xs border px-1.5 py-0.5 rounded-md",
                statusCfg.badge,
              )}
            >
              <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
              {statusCfg.label}
            </span>
            <span
              className={cn(
                "text-xs border px-1.5 py-0.5 rounded-md",
                priorityCfg.badge,
              )}
            >
              {priorityCfg.label}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="flex flex-col gap-4 text-sm">
          {/* Description */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
              Description
            </p>
            <p className="text-sm leading-relaxed text-foreground">
              {job.description}
            </p>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                Raised
              </p>
              <p className="text-sm flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {format(new Date(job.createdAt), "dd MMM yyyy")}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatDistanceToNow(new Date(job.createdAt), {
                  addSuffix: true,
                })}
              </p>
            </div>
            {job.scheduledDate && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Scheduled
                </p>
                <p className="text-sm flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  {format(new Date(job.scheduledDate), "dd MMM yyyy")}
                </p>
              </div>
            )}
            {job.assignedTo && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Assigned To
                </p>
                <p className="text-sm">{job.assignedTo}</p>
              </div>
            )}
            {job.completedAt && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                  Completed
                </p>
                <p className="text-sm">
                  {format(new Date(job.completedAt), "dd MMM yyyy")}
                </p>
              </div>
            )}
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">
                Source
              </p>
              <p className="text-sm capitalize flex items-center gap-1.5">
                {job.source === "portal" ? (
                  <>
                    <Globe className="w-3.5 h-3.5 text-[var(--brand-purple)]" />{" "}
                    Portal submission
                  </>
                ) : (
                  <>
                    <WrenchIcon className="w-3.5 h-3.5 text-muted-foreground" />{" "}
                    Manual entry
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Notes */}
          {job.notes && (
            <>
              <Separator />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  Notes
                </p>
                <p className="text-sm leading-relaxed text-foreground">
                  {job.notes}
                </p>
              </div>
            </>
          )}

          {/* Documents */}
          {job.attachments && job.attachments.length > 0 && (
            <>
              <Separator />
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Documents ({job.attachments.length})
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {job.attachments.map((att) => {
                    const href = att.url || att.dataUrl;
                    return (
                      <a
                        key={att.id}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors group"
                      >
                        <FileText className="w-4 h-4 text-[var(--brand-purple)] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{att.name}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {(att.size / 1024).toFixed(1)} KB · PDF
                          </p>
                        </div>
                        <ExternalLink className="w-3 h-3 text-muted-foreground/50 group-hover:text-muted-foreground shrink-0 transition-colors" />
                      </a>
                    );
                  })}
                </div>
              </div>
            </>
          )}

          {/* Submitter contact */}
          {hasIntake && (
            <>
              <Separator />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                  Submitted By
                </p>
                <div className="flex flex-col gap-2.5">
                  {job.contactName && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-[var(--brand-purple)]/10 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-[var(--brand-purple)]" />
                      </div>
                      <span className="text-sm font-medium">
                        {job.contactName}
                      </span>
                    </div>
                  )}
                  {job.contactPhone && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Phone className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <a
                        href={`tel:${job.contactPhone}`}
                        className="text-sm text-[var(--brand-purple)] hover:underline"
                      >
                        {job.contactPhone}
                      </a>
                    </div>
                  )}
                  {job.contactEmail && (
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center shrink-0">
                        <Mail className="w-3.5 h-3.5 text-muted-foreground" />
                      </div>
                      <a
                        href={`mailto:${job.contactEmail}`}
                        className="text-sm text-[var(--brand-purple)] hover:underline"
                      >
                        {job.contactEmail}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <Separator />

        {/* Job Share Link */}
        <div className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            Job Link
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Share this link with the assigned supplier. They can click it to
            close the job by uploading a job card and notes.
          </p>
          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60">
            <span className="flex-1 min-w-0 text-xs font-mono text-muted-foreground truncate">
              {jobLink}
            </span>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0 h-7 text-xs"
              onClick={copyJobLink}
            >
              {linkCopied ? (
                <>
                  <Check className="w-3 h-3 mr-1.5 text-green-600" />
                  Copied
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 mr-1.5" />
                  Copy
                </>
              )}
            </Button>
            <a
              href={`mailto:${job.contactEmail ?? ""}?subject=Action Required: ${encodeURIComponent(job.title)}&body=${encodeURIComponent(`Hi,\n\nPlease use the following link to close reactive job "${job.title}" at ${job.assignedTo ?? "your site"}:\n\n${jobLink}\n\nYou can upload your job card and notes via the link above.\n\nThank you,\nCasa Moda`)}`}
            >
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-7 text-xs"
              >
                <Send className="w-3 h-3 mr-1" />
                Email
              </Button>
            </a>
            <Link href={jobLink} target="_blank">
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-7 text-xs"
              >
                <ArrowUpRight className="w-3 h-3 mr-1" />
                Open
              </Button>
            </Link>
          </div>
        </div>

        <Separator />

        <DialogFooter className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit Job
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={onClose}
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

type RJFormData = Omit<ReactiveJob, "id" | "createdAt" | "updatedAt">;

function ReactiveJobFormDialog({
  open,
  onOpenChange,
  sites,
  companies,
  user,
  initialData,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  sites: Site[];
  companies: SupplyChainCompany[];
  user: any;
  initialData?: ReactiveJob;
  onSave: (data: RJFormData) => void;
}) {
  const [form, setForm] = useState<RJFormData>({
    siteId: initialData?.siteId ?? "",
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    priority: initialData?.priority ?? "medium",
    status: initialData?.status ?? "open",
    source: initialData?.source ?? "manual",
    createdBy: initialData?.createdBy ?? user?.name ?? "",
    createdByUserId: initialData?.createdByUserId ?? user?.id ?? "",
    contactName: initialData?.contactName,
    contactPhone: initialData?.contactPhone,
    contactEmail: initialData?.contactEmail,
    assignedTo: initialData?.assignedTo,
    assignedToUserId: initialData?.assignedToUserId,
    assignedCompanyId: initialData?.assignedCompanyId,
    notes: initialData?.notes,
    attachments: initialData?.attachments ?? [],
    scheduledDate: initialData?.scheduledDate,
  });

  function set<K extends keyof RJFormData>(k: K, v: RJFormData[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const isValid = form.siteId && form.title.trim() && form.description.trim();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Job" : "Create Reactive Job"}
          </DialogTitle>
          <DialogDescription>
            {initialData
              ? "Update the details for this maintenance job."
              : "Manually log a new reactive maintenance job."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>
                Site <span className="text-destructive">*</span>
              </Label>
              <Select
                value={form.siteId}
                onValueChange={(v) => set("siteId", v)}
              >
                <SelectTrigger className=" w-full">
                  <SelectValue placeholder="Select site..." />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>
                Title <span className="text-destructive">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Broken window in corridor"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>
                Description <span className="text-destructive">*</span>
              </Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe the issue..."
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Select
                value={form.priority}
                onValueChange={(v: any) => set("priority", v)}
              >
                <SelectTrigger className=" w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v: any) => set("status", v)}
              >
                <SelectTrigger className=" w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Open</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Scheduled Date</Label>
              <Input
                type="date"
                value={form.scheduledDate ?? ""}
                onChange={(e) =>
                  set("scheduledDate", e.target.value || undefined)
                }
                className="h-9 text-sm"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Assigned To (Supplier)</Label>
              <Select
                value={form.assignedCompanyId ?? "none"}
                onValueChange={(v) => {
                  if (v === "none") {
                    set("assignedCompanyId", undefined);
                    set("assignedTo", undefined);
                  } else {
                    const co = companies.find((c) => c.id === v);
                    set("assignedCompanyId", v);
                    set("assignedTo", co?.name);
                  }
                }}
              >
                <SelectTrigger className=" w-full">
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassigned —</SelectItem>
                  {companies
                    .filter((c) => c.status === "active")
                    .map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Notes</Label>
              <Textarea
                value={form.notes ?? ""}
                onChange={(e) => set("notes", e.target.value || undefined)}
                placeholder="Any additional notes..."
                rows={2}
                className="resize-none"
              />
            </div>
          </div>
        </div>
        <Separator />
        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
            disabled={!isValid}
            onClick={() => onSave(form)}
          >
            {initialData ? "Save Changes" : "Create Job"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
