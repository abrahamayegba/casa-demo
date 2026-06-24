"use client";

import { useState, useEffect } from "react";
import {
  getWorksCompleted,
  deleteWorksCompleted,
  approveWorksCompleted,
  rejectWorksCompleted,
  getSites,
  getPermits,
} from "@/lib/store";
import type { WorksCompleted, Site, Permit } from "@/lib/types";
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
  CheckSquare,
  Search,
  MoreHorizontal,
  Trash2,
  Building2,
  CalendarDays,
  Image as ImageIcon,
  FileText,
  X,
  ExternalLink,
  User,
  CheckCircle2,
  XCircle,
  MapPin,
  Clock,
  FileCheck,
  Printer,
  ShieldCheck,
  Hourglass,
  ThumbsUp,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

// ─── Approval status config ───────────────────────────────────────────────────

const APPROVAL_CONFIG = {
  pending_approval: {
    label: "Awaiting Approval",
    icon: Hourglass,
    badge: "bg-amber-50 text-amber-700 border-amber-200",
    dot: "bg-amber-400",
  },
  approved: {
    label: "Approved",
    icon: CheckCircle2,
    badge: "bg-green-50 text-green-700 border-green-200",
    dot: "bg-green-500",
  },
  rejected: {
    label: "Rejected",
    icon: XCircle,
    badge: "bg-red-50 text-red-700 border-red-200",
    dot: "bg-red-500",
  },
} as const;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function WorksCompletedPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [records, setRecords] = useState<WorksCompleted[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [permits, setPermits] = useState<Permit[]>([]);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedRecord, setSelectedRecord] = useState<WorksCompleted | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  useEffect(() => {
    setRecords(getWorksCompleted());
    setSites(getSites());
    setPermits(getPermits());
  }, []);

  function refresh() {
    setRecords(getWorksCompleted());
    setPermits(getPermits());
  }

  // Only show permit-linked records
  const permitRecords = records.filter((r) => r.linkedJobType === "permit");

  const filtered = permitRecords.filter((r) => {
    const site = sites.find((s) => s.id === r.siteId);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      r.jobTitle.toLowerCase().includes(q) ||
      r.workCarriedOut.toLowerCase().includes(q) ||
      r.completedBy.toLowerCase().includes(q) ||
      (site?.name ?? "").toLowerCase().includes(q) ||
      (r.permitRef ?? "").toLowerCase().includes(q);
    const matchSite = siteFilter === "all" || r.siteId === siteFilter;
    const matchApproval = approvalFilter === "all" || (r.approvalStatus ?? "pending_approval") === approvalFilter;
    return matchSearch && matchSite && matchApproval;
  });

  const stats = {
    pending: permitRecords.filter((r) => (r.approvalStatus ?? "pending_approval") === "pending_approval").length,
    approved: permitRecords.filter((r) => r.approvalStatus === "approved").length,
    total: permitRecords.length,
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Works Completed</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Permit job cards — submitted by contractors when work is done, approved by site management
          </p>
        </div>
        {isAdmin && stats.pending > 0 && (
          <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 font-medium shrink-0">
            <Hourglass className="w-3.5 h-3.5" />
            {stats.pending} awaiting approval
          </span>
        )}
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Total Job Cards", value: stats.total, dot: "bg-[var(--brand-purple)]" },
          { label: "Awaiting Approval", value: stats.pending, dot: "bg-amber-400" },
          { label: "Approved", value: stats.approved, dot: "bg-green-500" },
          { label: "With Attachments", value: permitRecords.filter((r) => r.attachments.length > 0).length, dot: "bg-blue-500" },
        ].map(({ label, value, dot }) => (
          <div key={label} className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card">
            <span className={cn("w-2.5 h-2.5 rounded-full shrink-0", dot)} />
            <div>
              <p className="text-xl font-bold text-foreground leading-none">{value}</p>
              <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Filters ── */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 w-full">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search records, permit ref..."
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
              <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={approvalFilter} onValueChange={setApprovalFilter}>
          <SelectTrigger className="h-9 text-sm w-full">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending_approval">Awaiting Approval</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
        {(search || siteFilter !== "all" || approvalFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={() => { setSearch(""); setSiteFilter("all"); setApprovalFilter("all"); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Permit job cards grid ── */}
      {filtered.length > 0 ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0" />
            <h3 className="text-sm font-semibold text-foreground">Permit Job Cards</h3>
            <span className="text-xs text-muted-foreground">— auto-created when contractors close permits on site</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((record) => (
              <RecordCard
                key={record.id}
                record={record}
                sites={sites}
                isAdmin={isAdmin}
                onView={() => setSelectedRecord(record)}
                onApprove={() => setApproveId(record.id)}
                onReject={() => setRejectId(record.id)}
                onDelete={() => setDeleteId(record.id)}
              />
            ))}
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-card py-16 text-center">
          <CheckSquare className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No records found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            {search || siteFilter !== "all" || approvalFilter !== "all"
              ? "Try adjusting your filters"
              : "Works records are created automatically when a contractor closes a permit"}
          </p>
        </div>
      )}

      {/* ── Detail dialog ── */}
      {selectedRecord && (
        <RecordDetailDialog
          record={selectedRecord}
          site={sites.find((s) => s.id === selectedRecord.siteId)}
          linkedPermit={selectedRecord.linkedPermitId ? permits.find((p) => p.id === selectedRecord.linkedPermitId) : undefined}
          onClose={() => setSelectedRecord(null)}
          onApprove={isAdmin && (selectedRecord.approvalStatus ?? "pending_approval") === "pending_approval" ? () => { setSelectedRecord(null); setApproveId(selectedRecord.id); } : undefined}
          onReject={isAdmin && (selectedRecord.approvalStatus ?? "pending_approval") === "pending_approval" ? () => { setSelectedRecord(null); setRejectId(selectedRecord.id); } : undefined}
          isAdmin={isAdmin}
        />
      )}

      {/* ── Approve dialog ── */}
      <ApproveDialog
        open={!!approveId}
        onOpenChange={(o) => !o && setApproveId(null)}
        onConfirm={(notes) => {
          if (approveId && user) {
            approveWorksCompleted(approveId, user.name, user.id, notes);
            refresh();
            setApproveId(null);
          }
        }}
      />

      {/* ── Reject dialog ── */}
      <RejectDialog
        open={!!rejectId}
        onOpenChange={(o) => !o && setRejectId(null)}
        onConfirm={(reason) => {
          if (rejectId && user) {
            rejectWorksCompleted(rejectId, user.name, user.id, reason);
            refresh();
            setRejectId(null);
          }
        }}
      />

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Record</DialogTitle>
            <DialogDescription>This will permanently remove the works completed record.</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteId) { deleteWorksCompleted(deleteId); refresh(); setDeleteId(null); }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Record Card ───────────────────────────────────────────────────────────────

function RecordCard({
  record,
  sites,
  isAdmin,
  onView,
  onApprove,
  onReject,
  onDelete,
}: {
  record: WorksCompleted;
  sites: Site[];
  isAdmin: boolean;
  onView: () => void;
  onApprove: () => void;
  onReject: () => void;
  onDelete: () => void;
}) {
  const site = sites.find((s) => s.id === record.siteId);
  const imgCount = record.attachments.filter((a) => a.type.startsWith("image/")).length;
  const docCount = record.attachments.filter((a) => !a.type.startsWith("image/")).length;
  const approvalStatus = record.approvalStatus ?? "pending_approval";
  const approvalCfg = APPROVAL_CONFIG[approvalStatus];
  const ApprovalIcon = approvalCfg.icon;
  const isPending = approvalStatus === "pending_approval";

  return (
    <div
      className={cn(
        "rounded-xl border bg-card overflow-hidden hover:shadow-sm transition-shadow cursor-pointer group",
        isPending ? "border-amber-200/70" : approvalStatus === "approved" ? "border-teal-200/60" : "border-red-200/60",
      )}
      onClick={onView}
    >
      {/* Card header */}
      <div className={cn(
        "px-4 py-3 border-b",
        isPending ? "bg-amber-50/30 border-amber-100" : approvalStatus === "approved" ? "bg-teal-50/40 border-teal-100" : "bg-red-50/30 border-red-100"
      )}>
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 mb-1">
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-teal-100 text-teal-700 font-semibold border border-teal-200 shrink-0">
                <ShieldCheck className="w-2.5 h-2.5" />
                {record.permitRef}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded border font-medium shrink-0",
                approvalCfg.badge
              )}>
                <ApprovalIcon className="w-2.5 h-2.5" />
                {approvalCfg.label}
              </span>
            </div>
            <h3 className="text-sm font-semibold text-foreground truncate">{record.jobTitle}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
              <span className="text-xs text-muted-foreground truncate">{site?.name ?? "Unknown site"}</span>
            </div>
          </div>
          {isAdmin && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <button className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 shrink-0">
                  <MoreHorizontal className="w-3.5 h-3.5" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                {isPending && (
                  <>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onApprove(); }} className="text-green-700 focus:text-green-700">
                      <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Approve
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onReject(); }} className="text-red-600 focus:text-red-600">
                      <XCircle className="w-3.5 h-3.5 mr-2" /> Reject
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                  </>
                )}
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="px-4 py-3 flex flex-col gap-2.5">
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
          {record.workCarriedOut}
        </p>

        {/* Location */}
        {record.locationOnSite && (
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3 h-3 text-muted-foreground shrink-0" />
            <span className="text-xs text-muted-foreground truncate">{record.locationOnSite}</span>
          </div>
        )}

        {/* Meta row */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-1.5">
            <User className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">{record.completedBy}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CalendarDays className="w-3 h-3 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">
              {format(new Date(record.completedDate), "dd MMM yyyy")}
            </span>
          </div>
        </div>

        {/* Attachment chips */}
        {record.attachments.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {imgCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
                <ImageIcon className="w-2.5 h-2.5" />
                {imgCount} photo{imgCount !== 1 ? "s" : ""}
              </span>
            )}
            {docCount > 0 && (
              <span className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full bg-slate-50 text-slate-700 border border-slate-200">
                <FileText className="w-2.5 h-2.5" />
                {docCount} doc{docCount !== 1 ? "s" : ""}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Card footer */}
      <div className="px-4 py-2.5 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
        {isPending && isAdmin ? (
          <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              className="h-6 px-2 text-[10px] bg-green-600 hover:bg-green-700 text-white"
              onClick={onApprove}
            >
              <ThumbsUp className="w-2.5 h-2.5 mr-1" />
              Approve
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[10px] border-red-200 text-red-600 hover:bg-red-50"
              onClick={onReject}
            >
              <XCircle className="w-2.5 h-2.5 mr-1" />
              Reject
            </Button>
          </div>
        ) : approvalStatus === "approved" ? (
          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-teal-700">
            <FileCheck className="w-2.5 h-2.5" />
            Permit closed &amp; approved
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-[10px] text-red-600">
            <XCircle className="w-2.5 h-2.5" />
            Rejected
          </span>
        )}
        <span className="text-[10px] text-muted-foreground/60">
          {formatDistanceToNow(new Date(record.createdAt), { addSuffix: true })}
        </span>
      </div>
    </div>
  );
}

// ─── Detail Dialog — PDF-style job card ────────────────────────────────────────

function RecordDetailDialog({
  record,
  site,
  linkedPermit,
  onClose,
  onApprove,
  onReject,
  isAdmin,
}: {
  record: WorksCompleted;
  site?: Site;
  linkedPermit?: Permit;
  onClose: () => void;
  onApprove?: () => void;
  onReject?: () => void;
  isAdmin: boolean;
}) {
  const images = record.attachments.filter((a) => a.type.startsWith("image/"));
  const docs = record.attachments.filter((a) => !a.type.startsWith("image/"));

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0">
        {/* ── PDF-style header ── */}
        <div className="bg-[var(--brand-purple)] px-6 py-5 flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <FileCheck className="w-4 h-4 text-white/80 shrink-0" />
              <p className="text-white/70 text-xs font-medium uppercase tracking-wider">Works Completed Record</p>
            </div>
            <h2 className="text-white font-bold text-lg leading-tight">{record.jobTitle}</h2>
            {record.permitRef && (
              <p className="text-white/70 text-xs mt-1 font-mono tracking-wide">Permit Ref: {record.permitRef}</p>
            )}
          </div>
          <div className="text-right shrink-0">
            <p className="text-white/60 text-[10px] uppercase tracking-wider">Date Completed</p>
            <p className="text-white font-semibold text-sm mt-0.5">
              {format(new Date(record.completedDate), "d MMMM yyyy")}
            </p>
          </div>
        </div>

        <div className="p-6 flex flex-col gap-5">
          {/* ── Key details grid ── */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Site</p>
              <p className="text-sm font-medium text-foreground">{site?.name ?? "—"}</p>
            </div>
            <div className="flex flex-col gap-0.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Completed By</p>
              <p className="text-sm font-medium text-foreground">{record.completedBy}</p>
            </div>
            {record.locationOnSite && (
              <div className="flex flex-col gap-0.5 col-span-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Location on Site</p>
                <p className="text-sm text-foreground">{record.locationOnSite}</p>
              </div>
            )}
            {(record.startDate || record.endDate) && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Work Period</p>
                <p className="text-sm text-foreground">
                  {record.startDate && record.endDate
                    ? record.startDate === record.endDate
                      ? format(new Date(record.startDate), "d MMMM yyyy")
                      : `${format(new Date(record.startDate), "d MMM")} – ${format(new Date(record.endDate), "d MMM yyyy")}`
                    : record.startDate
                    ? format(new Date(record.startDate), "d MMMM yyyy")
                    : "—"}
                </p>
              </div>
            )}
            {record.linkedJobType && (
              <div className="flex flex-col gap-0.5">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Record Type</p>
                <span className="inline-flex items-center gap-1 text-xs font-medium w-fit px-2 py-0.5 rounded-full border bg-teal-50 text-teal-700 border-teal-200">
                  <ShieldCheck className="w-3 h-3" /> Permit Closure
                </span>
              </div>
            )}
            {/* Approval status */}
            <div className="flex flex-col gap-0.5 col-span-2">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Approval Status</p>
              {(() => {
                const approvalStatus = record.approvalStatus ?? "pending_approval";
                const cfg = APPROVAL_CONFIG[approvalStatus];
                const Icon = cfg.icon;
                return (
                  <div className="flex flex-col gap-1.5">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs font-medium w-fit px-2.5 py-1 rounded-lg border", cfg.badge)}>
                      <Icon className="w-3.5 h-3.5" />
                      {cfg.label}
                    </span>
                    {record.approvedBy && record.approvedAt && (
                      <p className="text-xs text-muted-foreground">
                        {approvalStatus === "approved" ? "Approved" : "Reviewed"} by <strong className="text-foreground">{record.approvedBy}</strong> on{" "}
                        {format(new Date(record.approvedAt), "d MMM yyyy 'at' HH:mm")}
                      </p>
                    )}
                    {record.approvalNotes && (
                      <p className="text-xs text-muted-foreground italic">&ldquo;{record.approvalNotes}&rdquo;</p>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>

          <Separator />

          {/* ── Works carried out ── */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Works Carried Out</p>
            <p className="text-sm leading-relaxed text-foreground whitespace-pre-wrap bg-muted/20 rounded-lg px-4 py-3 border border-border/50">
              {record.workCarriedOut}
            </p>
          </div>

          {/* ── Linked permit details ── */}
          {linkedPermit && (
            <>
              <Separator />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Permit Details</p>
                <div className="rounded-xl border border-teal-200/60 bg-teal-50/30 p-4 flex flex-col gap-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Contractor</p>
                      <p className="text-sm font-medium">{linkedPermit.contractorName}</p>
                      <p className="text-xs text-muted-foreground">{linkedPermit.contractorCompany}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Permit Reference</p>
                      <p className="text-sm font-bold font-mono tracking-wide text-teal-700">{record.permitRef}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Work Type</p>
                      <p className="text-sm">{linkedPermit.workType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">Supervisor on Site</p>
                      <p className="text-sm">{linkedPermit.supervisorOnSite}</p>
                    </div>
                  </div>
                  {linkedPermit.approvalNotes && (
                    <div className="pt-2 border-t border-teal-200/60">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Approval Notes</p>
                      <p className="text-xs text-foreground leading-relaxed italic">&ldquo;{linkedPermit.approvalNotes}&rdquo;</p>
                    </div>
                  )}
                  {linkedPermit.closureNotes && (
                    <div className="pt-2 border-t border-teal-200/60">
                      <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Closure Notes (from contractor)</p>
                      <p className="text-xs text-foreground leading-relaxed">{linkedPermit.closureNotes}</p>
                    </div>
                  )}
                  {linkedPermit.closedAt && linkedPermit.closedByName && (
                    <div className="flex items-center gap-2 pt-2 border-t border-teal-200/60">
                      <CheckCircle2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <p className="text-xs text-muted-foreground">
                        Closed by <strong className="text-foreground">{linkedPermit.closedByName}</strong> on{" "}
                        {format(new Date(linkedPermit.closedAt), "d MMMM yyyy 'at' HH:mm")}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* ── Images ── */}
          {images.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Photos ({images.length})
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {images.map((img) => (
                    <div key={img.id} className="aspect-square rounded-lg overflow-hidden border border-border bg-muted relative group/img">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={img.dataUrl} alt={img.name} className="w-full h-full object-cover" />
                      <a
                        href={img.dataUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 group-hover/img:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <ExternalLink className="w-4 h-4 text-white" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Docs ── */}
          {docs.length > 0 && (
            <>
              <Separator />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                  Documents ({docs.length})
                </p>
                <div className="flex flex-col gap-1.5">
                  {docs.map((doc) => (
                    <a
                      key={doc.id}
                      href={doc.dataUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border hover:bg-muted/40 transition-colors"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <FileText className="w-4 h-4 text-muted-foreground shrink-0" />
                      <span className="text-xs text-foreground truncate flex-1">{doc.name}</span>
                      <ExternalLink className="w-3 h-3 text-muted-foreground shrink-0" />
                    </a>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* ── Created at ── */}
          <div className="flex items-center gap-2 pt-1 border-t border-border text-muted-foreground">
            <Clock className="w-3.5 h-3.5 shrink-0" />
            <p className="text-xs">
              Record created {format(new Date(record.createdAt), "d MMMM yyyy 'at' HH:mm")}
            </p>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex items-center gap-2 bg-muted/20 flex-wrap">
          {isAdmin && onApprove && (
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 text-white"
              onClick={onApprove}
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
              Approve
            </Button>
          )}
          {isAdmin && onReject && (
            <Button
              size="sm"
              variant="outline"
              className="border-red-200 text-red-600 hover:bg-red-50"
              onClick={onReject}
            >
              <XCircle className="w-3.5 h-3.5 mr-1.5" />
              Reject
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Print / Save PDF
          </Button>
          <Button variant="outline" size="sm" className="ml-auto" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Approve Dialog ───────────────────────────────────────────────────────────

function ApproveDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (notes: string) => void;
}) {
  const [notes, setNotes] = useState("");

  function handleConfirm() {
    onConfirm(notes);
    setNotes("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Approve Works Completed</DialogTitle>
          <DialogDescription>
            Confirm you have reviewed the job card and are satisfied the works were completed correctly and safely.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>Approval Notes <span className="text-muted-foreground font-normal">(optional)</span></Label>
          <Textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Confirmed — certificates received and site left in good order."
            rows={3}
            className="resize-none text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white"
            onClick={handleConfirm}
          >
            <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
            Confirm Approval
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Reject Dialog ────────────────────────────────────────────────────────────

function RejectDialog({
  open,
  onOpenChange,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: (reason: string) => void;
}) {
  const [reason, setReason] = useState("");

  function handleConfirm() {
    onConfirm(reason);
    setReason("");
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Reject Works Completed</DialogTitle>
          <DialogDescription>
            Provide a reason for rejecting this job card. The contractor will need to resubmit.
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          <Label>Reason for Rejection <span className="text-destructive">*</span></Label>
          <Textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Job card incomplete — no certificate attached. Please resubmit with full documentation."
            rows={4}
            className="resize-none text-sm"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button
            size="sm"
            variant="destructive"
            disabled={!reason.trim()}
            onClick={handleConfirm}
          >
            <XCircle className="w-3.5 h-3.5 mr-1.5" />
            Confirm Rejection
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
