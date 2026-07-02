"use client";

import { useState, useEffect, useMemo } from "react";
import {
  getPlannedJobs,
  savePlannedJob,
  deletePlannedJob,
  getSites,
  getSupplyChain,
  generateId,
} from "@/lib/store";
import type { PlannedJob, Site, SupplyChainCompany } from "@/lib/types";
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
  CalendarClock,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  Clock,
  XCircle,
  Building2,
  ChevronRight,
  CalendarDays,
  ChevronLeft,
  LayoutList,
  Calendar,
  AlertCircle,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isPast,
  isToday,
  parseISO,
} from "date-fns";
import { cn } from "@/lib/utils";

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_CONFIG = {
  scheduled: {
    label: "Scheduled",
    icon: Clock,
    dot: "bg-blue-500",
    badge: "bg-blue-50 text-blue-700 border-blue-200",
  },
  "in-progress": {
    label: "In Progress",
    icon: AlertCircle,
    dot: "bg-amber-500",
    badge: "bg-amber-50 text-amber-700 border-amber-200",
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
  low: { label: "Low", badge: "bg-slate-100 text-slate-600 border-slate-200", dot: "bg-slate-400" },
  medium: { label: "Medium", badge: "bg-amber-50 text-amber-700 border-amber-200", dot: "bg-amber-400" },
  high: { label: "High", badge: "bg-orange-50 text-orange-700 border-orange-200", dot: "bg-orange-500" },
  urgent: { label: "Urgent", badge: "bg-red-100 text-red-700 border-red-300 font-semibold", dot: "bg-red-500" },
} as const;

const FREQUENCY_LABELS: Record<string, string> = {
  "one-off": "One-off",
  monthly: "Monthly",
  quarterly: "Quarterly",
  biannual: "6-Monthly",
  annual: "Annual",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function PlannedJobsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [jobs, setJobs] = useState<PlannedJob[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [companies, setCompanies] = useState<SupplyChainCompany[]>([]);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [view, setView] = useState<"list" | "calendar">("calendar");
  const [calendarMonth, setCalendarMonth] = useState(new Date());
  const [addOpen, setAddOpen] = useState(false);
  const [editJob, setEditJob] = useState<PlannedJob | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedJob, setSelectedJob] = useState<PlannedJob | null>(null);

  useEffect(() => {
    setJobs(getPlannedJobs());
    setSites(getSites());
    setCompanies(getSupplyChain());
  }, []);

  function refresh() {
    setJobs(getPlannedJobs());
  }

  const filtered = jobs.filter((j) => {
    const site = sites.find((s) => s.id === j.siteId);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      j.title.toLowerCase().includes(q) ||
      j.description.toLowerCase().includes(q) ||
      (site?.name ?? "").toLowerCase().includes(q) ||
      (j.assignedTo ?? "").toLowerCase().includes(q);
    const matchSite = siteFilter === "all" || j.siteId === siteFilter;
    const matchStatus = statusFilter === "all" || j.status === statusFilter;
    return matchSearch && matchSite && matchStatus;
  });

  const stats = {
    scheduled: jobs.filter((j) => j.status === "scheduled").length,
    inProgress: jobs.filter((j) => j.status === "in-progress").length,
    completed: jobs.filter((j) => j.status === "completed").length,
    total: jobs.length,
  };

  return (
    <div className="flex flex-col gap-5 max-w-7xl mx-auto">
      {/* ── Page header ── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">Planned Jobs</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            PPM planner — scheduled maintenance & compliance visits
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* View toggle */}
          <div className="flex items-center rounded-lg border border-border bg-muted/40 p-0.5">
            <button
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                view === "calendar"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setView("calendar")}
            >
              <Calendar className="w-3.5 h-3.5" />
              Calendar
            </button>
            <button
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors",
                view === "list"
                  ? "bg-white text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
              onClick={() => setView("list")}
            >
              <LayoutList className="w-3.5 h-3.5" />
              List
            </button>
          </div>
          {isAdmin && (
            <Button
              size="sm"
              className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              New Job
            </Button>
          )}
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Scheduled", value: stats.scheduled, dot: "bg-blue-500" },
          { label: "In Progress", value: stats.inProgress, dot: "bg-amber-500" },
          { label: "Completed", value: stats.completed, dot: "bg-green-500" },
          { label: "Total", value: stats.total, dot: "bg-[var(--brand-purple)]" },
        ].map(({ label, value, dot }) => (
          <div
            key={label}
            className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border bg-card"
          >
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
            placeholder="Search planned jobs..."
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
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-sm w-full">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="scheduled">Scheduled</SelectItem>
            <SelectItem value="in-progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>
        {(search || siteFilter !== "all" || statusFilter !== "all") && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-muted-foreground"
            onClick={() => { setSearch(""); setSiteFilter("all"); setStatusFilter("all"); }}
          >
            Clear filters
          </Button>
        )}
      </div>

      {/* ── Main content ── */}
      {view === "calendar" ? (
        <CalendarView
          jobs={filtered}
          sites={sites}
          calendarMonth={calendarMonth}
          onMonthChange={setCalendarMonth}
          onJobClick={setSelectedJob}
        />
      ) : (
        <ListView
          jobs={filtered}
          sites={sites}
          isAdmin={isAdmin}
          totalJobs={jobs.length}
          onJobClick={setSelectedJob}
          onEdit={setEditJob}
          onDelete={setDeleteId}
        />
      )}

      {/* ── Job Detail ── */}
      {selectedJob && (
        <JobDetailDialog
          job={selectedJob}
          site={sites.find((s) => s.id === selectedJob.siteId)}
          onClose={() => setSelectedJob(null)}
          onEdit={() => { setEditJob(selectedJob); setSelectedJob(null); }}
          isAdmin={isAdmin}
        />
      )}

      {/* ── Add dialog ── */}
      <PlannedJobFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        sites={sites}
        companies={companies}
        user={user}
        onSave={(data) => {
          savePlannedJob({ ...data, id: generateId("pj"), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
          refresh();
          setAddOpen(false);
        }}
      />

      {/* ── Edit dialog ── */}
      {editJob && (
        <PlannedJobFormDialog
          open={!!editJob}
          onOpenChange={(o) => !o && setEditJob(null)}
          sites={sites}
          companies={companies}
          user={user}
          initialData={editJob}
          onSave={(data) => {
            savePlannedJob({ ...editJob, ...data, updatedAt: new Date().toISOString() });
            refresh();
            setEditJob(null);
          }}
        />
      )}

      {/* ── Delete confirm ── */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Planned Job</DialogTitle>
            <DialogDescription>
              This will permanently remove the planned job and cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => {
                if (deleteId) { deletePlannedJob(deleteId); refresh(); setDeleteId(null); }
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

// ─── Calendar View ─────────────────────────────────────────────────────────────

function CalendarView({
  jobs,
  sites,
  calendarMonth,
  onMonthChange,
  onJobClick,
}: {
  jobs: PlannedJob[];
  sites: Site[];
  calendarMonth: Date;
  onMonthChange: (d: Date) => void;
  onJobClick: (j: PlannedJob) => void;
}) {
  const monthStart = startOfMonth(calendarMonth);
  const monthEnd = endOfMonth(calendarMonth);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  const jobsByDate = useMemo(() => {
    const map: Record<string, PlannedJob[]> = {};
    for (const job of jobs) {
      const key = job.scheduledDate.slice(0, 10);
      if (!map[key]) map[key] = [];
      map[key].push(job);
    }
    return map;
  }, [jobs]);

  const DAYS_OF_WEEK = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Calendar header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          onClick={() => onMonthChange(subMonths(calendarMonth, 1))}
          aria-label="Previous month"
        >
          <ChevronLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <h3 className="text-sm font-semibold text-foreground">
          {format(calendarMonth, "MMMM yyyy")}
        </h3>
        <button
          className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          onClick={() => onMonthChange(addMonths(calendarMonth, 1))}
          aria-label="Next month"
        >
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
        </button>
      </div>

      {/* Day of week headers */}
      <div className="grid grid-cols-7 border-b border-border">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="py-2 text-center text-[11px] font-medium text-muted-foreground border-r last:border-r-0 border-border">
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7">
        {days.map((day, idx) => {
          const key = format(day, "yyyy-MM-dd");
          const dayJobs = jobsByDate[key] ?? [];
          const isCurrentMonth = isSameMonth(day, calendarMonth);
          const isCurrentDay = isToday(day);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <div
              key={key}
              className={cn(
                "min-h-[120px] p-2 border-r border-b border-border last:border-r-0",
                !isCurrentMonth && "bg-muted/20",
                isWeekend && isCurrentMonth && "bg-muted/10",
                // remove bottom border on last row
                idx >= days.length - 7 && "border-b-0",
              )}
            >
              {/* Day number */}
              <div className="flex items-center justify-between mb-1">
                <span
                  className={cn(
                    "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                    isCurrentDay
                      ? "bg-[var(--brand-purple)] text-white"
                      : isCurrentMonth
                      ? "text-foreground"
                      : "text-muted-foreground/40",
                  )}
                >
                  {format(day, "d")}
                </span>
              </div>

              {/* Jobs on this day */}
              <div className="flex flex-col gap-1">
                {dayJobs.slice(0, 3).map((job) => {
                  const statusCfg = STATUS_CONFIG[job.status];
                  const priorityCfg = PRIORITY_CONFIG[job.priority];
                  return (
                    <button
                      key={job.id}
                      className={cn(
                        "w-full text-left px-1.5 py-1 rounded-md text-[10px] leading-tight font-bold border transition-all hover:brightness-95 shadow-sm overflow-hidden",
                        statusCfg.badge,
                      )}
                      onClick={() => onJobClick(job)}
                      title={job.title}
                    >
                      <span className="flex items-center gap-1 w-full overflow-hidden">
                        <span className={cn("w-2 h-2 rounded-full shrink-0", priorityCfg.dot)} />
                        <span className="block truncate min-w-0 flex-1">{job.title}</span>
                      </span>
                    </button>
                  );
                })}
                {dayJobs.length > 3 && (
                  <span className="text-[11px] font-medium text-muted-foreground px-1">
                    +{dayJobs.length - 3} more
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap px-4 py-2.5 border-t border-border bg-muted/20">
        <span className="text-[11px] font-medium text-muted-foreground">Legend:</span>
        {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
          <div key={key} className="flex items-center gap-1.5">
            <span className={cn("w-2 h-2 rounded-full", cfg.dot)} />
            <span className="text-[11px] text-muted-foreground">{cfg.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── List View ─────────────────────────────────────────────────────────────────

function ListView({
  jobs,
  sites,
  isAdmin,
  totalJobs,
  onJobClick,
  onEdit,
  onDelete,
}: {
  jobs: PlannedJob[];
  sites: Site[];
  isAdmin: boolean;
  totalJobs: number;
  onJobClick: (j: PlannedJob) => void;
  onEdit: (j: PlannedJob) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Table header */}
      <div className="hidden md:grid grid-cols-[1fr_150px_110px_100px_110px_100px_44px] gap-4 px-4 py-2.5 border-b border-border bg-muted/40">
        <p className="text-xs font-medium text-muted-foreground">Job</p>
        <p className="text-xs font-medium text-muted-foreground">Site</p>
        <p className="text-xs font-medium text-muted-foreground">Status</p>
        <p className="text-xs font-medium text-muted-foreground">Priority</p>
        <p className="text-xs font-medium text-muted-foreground">Frequency</p>
        <p className="text-xs font-medium text-muted-foreground">Scheduled</p>
        <p className="text-xs font-medium text-muted-foreground sr-only">Actions</p>
      </div>

      {jobs.length === 0 ? (
        <div className="py-16 text-center">
          <CalendarClock className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-sm text-muted-foreground font-medium">No planned jobs found</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Try adjusting your filters or create a new planned job</p>
        </div>
      ) : (
        <div className="divide-y divide-border">
          {jobs.map((job) => {
            const site = sites.find((s) => s.id === job.siteId);
            const statusCfg = STATUS_CONFIG[job.status];
            const priorityCfg = PRIORITY_CONFIG[job.priority];
            const isPastDue = job.status === "scheduled" && isPast(parseISO(job.scheduledDate));
            return (
              <div
                key={job.id}
                className="grid grid-cols-1 md:grid-cols-[1fr_150px_110px_100px_110px_100px_44px] gap-2 md:gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors cursor-pointer group items-center"
                onClick={() => onJobClick(job)}
              >
                {/* Title */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <div className={cn("mt-1.5 w-1.5 h-1.5 rounded-full shrink-0", statusCfg.dot)} />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-sm font-medium text-foreground truncate">{job.title}</span>
                      {isPastDue && (
                        <span className="inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 shrink-0">
                          Overdue
                        </span>
                      )}
                    </div>
                    {job.assignedTo && (
                      <p className="text-xs text-muted-foreground mt-0.5 truncate">{job.assignedTo}</p>
                    )}
                  </div>
                </div>

                {/* Site */}
                <div className="hidden md:flex items-center gap-1.5 min-w-0">
                  <Building2 className="w-3 h-3 text-muted-foreground shrink-0" />
                  <span className="text-xs text-muted-foreground truncate">{site?.name ?? "—"}</span>
                </div>

                {/* Status */}
                <div className="hidden md:flex">
                  <span className={cn("inline-flex items-center gap-1.5 text-xs border px-2 py-0.5 rounded-md", statusCfg.badge)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                    {statusCfg.label}
                  </span>
                </div>

                {/* Priority */}
                <div className="hidden md:flex">
                  <span className={cn("text-xs border px-2 py-0.5 rounded-md", priorityCfg.badge)}>
                    {priorityCfg.label}
                  </span>
                </div>

                {/* Frequency */}
                <div className="hidden md:block">
                  <span className="text-xs text-muted-foreground">{FREQUENCY_LABELS[job.frequency]}</span>
                </div>

                {/* Scheduled date */}
                <div className="hidden md:block">
                  <p className={cn("text-xs font-medium", isPastDue && job.status === "scheduled" ? "text-red-600" : "text-foreground")}>
                    {format(parseISO(job.scheduledDate), "dd MMM yyyy")}
                  </p>
                </div>

                {/* Actions */}
                {isAdmin ? (
                  <div className="hidden md:flex justify-end">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <button className="w-8 h-8 flex items-center justify-center rounded-md hover:bg-muted transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100">
                          <MoreHorizontal className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-36">
                        <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(job); }}>
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => { e.stopPropagation(); onDelete(job.id); }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
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
                  <span className={cn("inline-flex items-center gap-1.5 text-xs border px-2 py-0.5 rounded-md", statusCfg.badge)}>
                    <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
                    {statusCfg.label}
                  </span>
                  <span className={cn("text-xs border px-2 py-0.5 rounded-md", priorityCfg.badge)}>
                    {priorityCfg.label}
                  </span>
                  <span className="text-xs text-muted-foreground ml-auto">
                    {format(parseISO(job.scheduledDate), "dd MMM yyyy")}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {jobs.length > 0 && (
        <div className="border-t border-border px-4 py-2.5 bg-muted/20">
          <p className="text-xs text-muted-foreground">
            Showing {jobs.length} of {totalJobs} planned jobs
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Job Detail Dialog ─────────────────────────────────────────────────────────

function JobDetailDialog({
  job,
  site,
  onClose,
  onEdit,
  isAdmin,
}: {
  job: PlannedJob;
  site?: Site;
  onClose: () => void;
  onEdit: () => void;
  isAdmin: boolean;
}) {
  const statusCfg = STATUS_CONFIG[job.status];
  const priorityCfg = PRIORITY_CONFIG[job.priority];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader className="gap-1">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-[var(--brand-purple)]/10 flex items-center justify-center shrink-0">
              <CalendarClock className="w-3.5 h-3.5 text-[var(--brand-purple)]" />
            </div>
            <DialogTitle className="text-base leading-tight">{job.title}</DialogTitle>
          </div>
          <DialogDescription className="flex items-center gap-2 flex-wrap">
            <span className="flex items-center gap-1 text-xs">
              <Building2 className="w-3 h-3" />
              {site?.name ?? "Unknown site"}
            </span>
            <span className="text-border">·</span>
            <span className={cn("inline-flex items-center gap-1.5 text-xs border px-1.5 py-0.5 rounded-md", statusCfg.badge)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
              {statusCfg.label}
            </span>
            <span className={cn("text-xs border px-1.5 py-0.5 rounded-md", priorityCfg.badge)}>
              {priorityCfg.label}
            </span>
          </DialogDescription>
        </DialogHeader>

        <Separator />

        <div className="flex flex-col gap-4 text-sm">
          {/* Description */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Description</p>
            <p className="text-sm leading-relaxed text-foreground">{job.description}</p>
          </div>

          {/* Meta grid */}
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Scheduled Date</p>
              <p className="text-sm flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {format(parseISO(job.scheduledDate), "dd MMM yyyy")}
              </p>
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Frequency</p>
              <p className="text-sm">{FREQUENCY_LABELS[job.frequency]}</p>
            </div>
            {job.assignedTo && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Assigned To</p>
                <p className="text-sm">{job.assignedTo}</p>
              </div>
            )}
            {job.completedAt && (
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-0.5">Completed</p>
                <p className="text-sm">{format(new Date(job.completedAt), "dd MMM yyyy")}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {job.notes && (
            <>
              <Separator />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Notes</p>
                <p className="text-sm leading-relaxed text-foreground">{job.notes}</p>
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
        </div>

        <Separator />

        <DialogFooter className="flex gap-2">
          {isAdmin && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" />
              Edit Job
            </Button>
          )}
          <Button variant="outline" size="sm" className="ml-auto" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Form Dialog ──────────────────────────────────────────────────────────────

type PJFormData = Omit<PlannedJob, "id" | "createdAt" | "updatedAt">;

function PlannedJobFormDialog({
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
  initialData?: PlannedJob;
  onSave: (data: PJFormData) => void;
}) {
  const [form, setForm] = useState<PJFormData>({
    siteId: initialData?.siteId ?? "",
    title: initialData?.title ?? "",
    description: initialData?.description ?? "",
    priority: initialData?.priority ?? "medium",
    status: initialData?.status ?? "scheduled",
    frequency: initialData?.frequency ?? "annual",
    scheduledDate: initialData?.scheduledDate ?? "",
    createdBy: initialData?.createdBy ?? user?.name ?? "",
    createdByUserId: initialData?.createdByUserId ?? user?.id ?? "",
    assignedTo: initialData?.assignedTo,
    assignedCompanyId: initialData?.assignedCompanyId,
    notes: initialData?.notes,
    attachments: initialData?.attachments ?? [],
    completedAt: initialData?.completedAt,
  });

  function set<K extends keyof PJFormData>(k: K, v: PJFormData[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const isValid = form.siteId && form.title.trim() && form.description.trim() && form.scheduledDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Planned Job" : "Create Planned Job"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Update the details for this planned maintenance job." : "Schedule a new PPM or compliance job."}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 mt-1">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Site <span className="text-destructive">*</span></Label>
              <Select value={form.siteId} onValueChange={(v) => set("siteId", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select site..." />
                </SelectTrigger>
                <SelectContent>
                  {sites.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Title <span className="text-destructive">*</span></Label>
              <Input
                value={form.title}
                onChange={(e) => set("title", e.target.value)}
                placeholder="e.g. Annual Fire Extinguisher Service"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Description <span className="text-destructive">*</span></Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Describe the planned work..."
                rows={3}
                className="resize-none"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Priority</Label>
              <Select value={form.priority} onValueChange={(v: any) => set("priority", v)}>
                <SelectTrigger className="w-full">
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
              <Select value={form.status} onValueChange={(v: any) => set("status", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="scheduled">Scheduled</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v: any) => set("frequency", v)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="one-off">One-off</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="quarterly">Quarterly</SelectItem>
                  <SelectItem value="biannual">6-Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Scheduled Date <span className="text-destructive">*</span></Label>
              <Input
                type="date"
                value={form.scheduledDate}
                onChange={(e) => set("scheduledDate", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Assigned To (Supplier)</Label>
              <Select
                value={form.assignedCompanyId ?? "none"}
                onValueChange={(v) => {
                  if (v === "none") { set("assignedCompanyId", undefined); set("assignedTo", undefined); }
                  else {
                    const co = companies.find((c) => c.id === v);
                    set("assignedCompanyId", v);
                    set("assignedTo", co?.name);
                  }
                }}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select supplier..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— Unassigned —</SelectItem>
                  {companies.filter((c) => c.status === "active").map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
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
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancel</Button>
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
