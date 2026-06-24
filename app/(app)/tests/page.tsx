"use client";

import { useState, useEffect, useRef } from "react";
import {
  getAssetTests,
  saveAssetTest,
  deleteAssetTest,
  getAssetInstances,
  getAssetTypes,
  getSites,
  generateId,
} from "@/lib/store";
import type {
  AssetTest,
  AssetInstance,
  AssetType,
  Site,
  Attachment,
  TestResult,
} from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  ClipboardList,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  Paperclip,
  Upload,
  X,
  FileText,
  Image as ImageIcon,
  ChevronDown,
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

const RESULT_CONFIG = {
  pass: {
    label: "Pass",
    icon: CheckCircle2,
    badge: "border-green-200 text-green-700 bg-green-50",
    dot: "bg-green-500",
  },
  fail: {
    label: "Fail",
    icon: XCircle,
    badge: "border-red-200 text-red-700 bg-red-50",
    dot: "bg-red-500",
  },
  pending: {
    label: "No Test",
    icon: Clock,
    badge: "border-amber-200 text-amber-700 bg-amber-50",
    dot: "bg-amber-400",
  },
};

export default function TestsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [tests, setTests] = useState<AssetTest[]>([]);
  const [instances, setInstances] = useState<AssetInstance[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  const [addOpen, setAddOpen] = useState(false);
  const [editTest, setEditTest] = useState<AssetTest | null>(null);
  const [detailTest, setDetailTest] = useState<AssetTest | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  function load() {
    setTests(getAssetTests());
    setInstances(getAssetInstances());
    setTypes(getAssetTypes());
    setSites(getSites());
  }

  useEffect(() => {
    load();
  }, []);

  const filtered = tests
    .filter((t) => {
      const instance = instances.find((i) => i.id === t.assetInstanceId);
      const assetType = instance
        ? types.find((at) => at.id === instance.assetTypeId)
        : null;
      const site = instance
        ? sites.find((s) => s.id === instance.siteId)
        : null;
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        t.testedBy.toLowerCase().includes(q) ||
        t.notes.toLowerCase().includes(q) ||
        instance?.serialNumber.toLowerCase().includes(q) ||
        assetType?.name.toLowerCase().includes(q) ||
        site?.name.toLowerCase().includes(q);
      const matchSite = siteFilter === "all" || site?.id === siteFilter;
      const matchResult = resultFilter === "all" || t.result === resultFilter;
      const matchType = typeFilter === "all" || assetType?.id === typeFilter;
      return matchSearch && matchSite && matchResult && matchType;
    })
    .sort(
      (a, b) => new Date(b.testDate).getTime() - new Date(a.testDate).getTime(),
    );

  function handleSave(data: Omit<AssetTest, "id" | "createdAt" | "updatedAt">) {
    const now = new Date().toISOString();
    if (editTest) {
      saveAssetTest({ ...editTest, ...data, updatedAt: now });
      setEditTest(null);
    } else {
      saveAssetTest({
        ...data,
        id: generateId("tst"),
        createdAt: now,
        updatedAt: now,
      });
      setAddOpen(false);
    }
    load();
  }

  function handleQuickResult(test: AssetTest, result: TestResult) {
    const now = new Date().toISOString();
    saveAssetTest({ ...test, result, updatedAt: now });
    load();
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Asset Tests</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {tests.length} test records
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Log Test
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search tests..."
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={siteFilter} onValueChange={setSiteFilter}>
          <SelectTrigger className="h-9 text-sm w-44">
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
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 text-sm w-44">
            <SelectValue placeholder="All Types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {types.map((t) => (
              <SelectItem key={t.id} value={t.id}>
                {t.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={resultFilter} onValueChange={setResultFilter}>
          <SelectTrigger className="h-9 text-sm w-32">
            <SelectValue placeholder="All Results" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Results</SelectItem>
            <SelectItem value="pass">Pass</SelectItem>
            <SelectItem value="fail">Fail</SelectItem>
            <SelectItem value="pending">No Test</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3">
        {(["pass", "fail", "pending"] as const).map((r) => {
          const count = filtered.filter((t) => t.result === r).length;
          const rc = RESULT_CONFIG[r];
          const Icon = rc.icon;
          return (
            <button
              key={r}
              className={cn(
                "flex items-center gap-2.5 px-4 py-3 rounded-lg border text-left transition-all",
                resultFilter === r
                  ? `${rc.badge} border-current`
                  : "bg-card border-border hover:bg-muted/40",
              )}
              onClick={() => setResultFilter(resultFilter === r ? "all" : r)}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0",
                  r === "pass"
                    ? "text-green-600"
                    : r === "fail"
                      ? "text-red-600"
                      : "text-amber-600",
                )}
              />
              <div>
                <p className="text-lg font-bold leading-none">{count}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 capitalize">
                  {rc.label}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
              <ClipboardList className="w-10 h-10 opacity-30" />
              <p className="text-sm">No test records found.</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    Asset / Site
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">
                    Test Date
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">
                    Tested By
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                    Result
                  </th>
                  <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3 hidden xl:table-cell">
                    Attachments
                  </th>
                  {isAdmin && <th className="px-4 py-3 w-10" />}
                </tr>
              </thead>
              <tbody>
                {filtered.map((test, idx) => {
                  const instance = instances.find(
                    (i) => i.id === test.assetInstanceId,
                  );
                  const assetType = instance
                    ? types.find((at) => at.id === instance.assetTypeId)
                    : null;
                  const site = instance
                    ? sites.find((s) => s.id === instance.siteId)
                    : null;
                  const rc =
                    RESULT_CONFIG[test.result] ?? RESULT_CONFIG.pending;
                  const ResultIcon = rc.icon;

                  return (
                    <tr
                      key={test.id}
                      className={cn(
                        "hover:bg-muted/30 cursor-pointer transition-colors",
                        idx < filtered.length - 1 &&
                          "border-b border-border/30",
                      )}
                      onClick={() => setDetailTest(test)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-xs">
                          {assetType?.name ?? "Unknown Asset"}
                        </p>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                          <Building2 className="w-2.5 h-2.5" />
                          <span>{site?.name ?? "Unknown Site"}</span>
                          {instance && (
                            <span className="font-mono ml-1">
                              · {instance.serialNumber}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 hidden sm:table-cell">
                        <p className="text-xs">
                          {format(new Date(test.testDate), "dd MMM yyyy")}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatDistanceToNow(new Date(test.testDate), {
                            addSuffix: true,
                          })}
                        </p>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <p className="text-xs">{test.testedBy}</p>
                      </td>
                      <td
                        className="px-4 py-3"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {isAdmin ? (
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-1 rounded-md border text-xs font-medium transition-colors hover:opacity-80",
                                  rc.badge,
                                )}
                              >
                                <ResultIcon className="w-3 h-3" />
                                {rc.label}
                                <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="start">
                              <DropdownMenuItem
                                onClick={() => handleQuickResult(test, "pass")}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-2 text-green-600" />{" "}
                                Mark as Pass
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleQuickResult(test, "fail")}
                              >
                                <XCircle className="w-3.5 h-3.5 mr-2 text-red-600" />{" "}
                                Mark as Fail
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleQuickResult(test, "pending")
                                }
                              >
                                <Clock className="w-3.5 h-3.5 mr-2 text-amber-600" />{" "}
                                Mark as No Test
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        ) : (
                          <Badge
                            variant="outline"
                            className={cn(
                              rc.badge,
                              "text-[10px] flex items-center gap-1 w-fit",
                            )}
                          >
                            <ResultIcon className="w-3 h-3" /> {rc.label}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 pl-6 py-3 hidden xl:table-cell">
                        {test.attachments.length > 0 ? (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Paperclip className="w-3 h-3" />
                            {test.attachments.length}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      {isAdmin && (
                        <td
                          className="px-4 py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="w-7 h-7"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => setEditTest(test)}
                              >
                                <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteId(test.id)}
                              >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Detail dialog */}
      {detailTest && (
        <TestDetailDialog
          test={detailTest}
          instances={instances}
          types={types}
          sites={sites}
          onClose={() => setDetailTest(null)}
          onEdit={
            isAdmin
              ? () => {
                  setEditTest(detailTest);
                  setDetailTest(null);
                }
              : undefined
          }
        />
      )}

      {/* Add/Edit dialog */}
      {(addOpen || editTest) && (
        <TestFormDialog
          open={addOpen || !!editTest}
          onOpenChange={(o) => {
            if (!o) {
              setAddOpen(false);
              setEditTest(null);
            }
          }}
          instances={instances}
          types={types}
          sites={sites}
          initialData={editTest ?? undefined}
          currentUser={user}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Test Record</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this test record? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteId) {
                  deleteAssetTest(deleteId);
                  load();
                  setDeleteId(null);
                }
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

// ─── Detail Dialog ────────────────────────────────────────────────────────────
function TestDetailDialog({
  test,
  instances,
  types,
  sites,
  onClose,
  onEdit,
}: {
  test: AssetTest;
  instances: AssetInstance[];
  types: AssetType[];
  sites: Site[];
  onClose: () => void;
  onEdit?: () => void;
}) {
  const instance = instances.find((i) => i.id === test.assetInstanceId);
  const assetType = instance
    ? types.find((at) => at.id === instance.assetTypeId)
    : null;
  const site = instance ? sites.find((s) => s.id === instance.siteId) : null;
  const rc = RESULT_CONFIG[test.result] ?? RESULT_CONFIG.pending;
  const ResultIcon = rc.icon;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="flex flex-col gap-0.5 min-w-0">
              <DialogTitle>Test Record</DialogTitle>
              <DialogDescription className="line-clamp-2">
                {assetType?.name ?? "Unknown Asset"} —{" "}
                {site?.name ?? "Unknown Site"}
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(
                rc.badge,
                "text-xs shrink-0 flex items-center gap-1",
              )}
            >
              <ResultIcon className="w-3 h-3" /> {rc.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          {/* Two-column detail grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-4">
            {[
              { label: "Asset Type", value: assetType?.name ?? "Unknown" },
              { label: "Serial No.", value: instance?.serialNumber ?? "—" },
              { label: "Site", value: site?.name ?? "Unknown" },
              { label: "Location", value: instance?.location ?? "—" },
              {
                label: "Test Date",
                value: format(new Date(test.testDate), "dd MMM yyyy"),
              },
              {
                label: "Next Test Due",
                value: format(new Date(test.nextTestDate), "dd MMM yyyy"),
              },
              { label: "Tested By", value: test.testedBy },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5 min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                  {label}
                </p>
                <p className="font-medium text-sm break-words">{value}</p>
              </div>
            ))}
          </div>

          {test.notes && (
            <div className="flex flex-col gap-1 pt-1 border-t border-border/50">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Notes
              </p>
              <p className="text-sm leading-relaxed">{test.notes}</p>
            </div>
          )}

          {test.failureReasons && test.failureReasons.length > 0 && (
            <div className="flex flex-col gap-2 pt-1 border-t border-border/50">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Failure Reasons
              </p>
              <ul className="flex flex-col gap-1.5">
                {test.failureReasons.map((r, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-md px-3 py-2"
                  >
                    <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {test.attachments.length > 0 && (
            <div className="flex flex-col gap-2 pt-1 border-t border-border/50">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Attachments ({test.attachments.length})
              </p>
              <div className="flex flex-col gap-2">
                {test.attachments.map((att) => (
                  <AttachmentPreview key={att.id} attachment={att} />
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="mt-2">
          {onEdit && (
            <Button variant="outline" size="sm" onClick={onEdit}>
              <Pencil className="w-3.5 h-3.5 mr-1.5" /> Edit
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Attachment Preview ───────────────────────────────────────────────────────
function AttachmentPreview({ attachment }: { attachment: Attachment }) {
  const isImage = attachment.type.startsWith("image/");
  return (
    <a
      href={attachment.dataUrl}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2.5 p-2.5 rounded-lg border border-border/60 bg-muted/30 hover:bg-muted/60 transition-colors group"
      onClick={(e) => e.stopPropagation()}
    >
      {isImage ? (
        <ImageIcon className="w-4 h-4 text-[var(--brand-purple)] shrink-0" />
      ) : (
        <FileText className="w-4 h-4 text-[var(--brand-purple)] shrink-0" />
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium truncate">{attachment.name}</p>
        <p className="text-[10px] text-muted-foreground">
          {(attachment.size / 1024).toFixed(1)} KB
        </p>
      </div>
    </a>
  );
}

// ─── Test Form Dialog ─────────────────────────────────────────────────────────
type TestFormData = Omit<AssetTest, "id" | "createdAt" | "updatedAt">;

function TestFormDialog({
  open,
  onOpenChange,
  instances,
  types,
  sites,
  initialData,
  currentUser,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  instances: AssetInstance[];
  types: AssetType[];
  sites: Site[];
  initialData?: AssetTest;
  currentUser: { name: string; id: string } | null;
  onSave: (data: TestFormData) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const today = new Date().toISOString().split("T")[0];

  const [form, setForm] = useState<TestFormData>({
    assetInstanceId: initialData?.assetInstanceId ?? "",
    testedBy: initialData?.testedBy ?? currentUser?.name ?? "",
    testedByUserId: initialData?.testedByUserId ?? currentUser?.id ?? "",
    testDate: initialData?.testDate ?? today,
    result: initialData?.result ?? "pending",
    notes: initialData?.notes ?? "",
    failureReasons: initialData?.failureReasons ?? [],
    attachments: initialData?.attachments ?? [],
    nextTestDate: initialData?.nextTestDate ?? "",
  });

  const [failureInput, setFailureInput] = useState("");
  const [siteFilter, setSiteFilterLocal] = useState("all");
  const [uploading, setUploading] = useState(false);

  function set<K extends keyof TestFormData>(k: K, v: TestFormData[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  const filteredInstances =
    siteFilter === "all"
      ? instances
      : instances.filter((i) => i.siteId === siteFilter);

  function getInstanceLabel(i: AssetInstance) {
    const t = types.find((t) => t.id === i.assetTypeId);
    const s = sites.find((s) => s.id === i.siteId);
    return `${t?.name ?? "Unknown"} · ${i.serialNumber} (${s?.name ?? "?"})`;
  }

  function addFailureReason() {
    if (!failureInput.trim()) return;
    set("failureReasons", [
      ...(form.failureReasons ?? []),
      failureInput.trim(),
    ]);
    setFailureInput("");
  }

  function removeFailureReason(idx: number) {
    set(
      "failureReasons",
      (form.failureReasons ?? []).filter((_, i) => i !== idx),
    );
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    setUploading(true);
    Promise.all(
      files.map(
        (file) =>
          new Promise<Attachment>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              resolve({
                id: generateId("att"),
                name: file.name,
                type: file.type,
                size: file.size,
                dataUrl: reader.result as string,
                uploadedAt: new Date().toISOString(),
              });
            };
            reader.readAsDataURL(file);
          }),
      ),
    ).then((newAtts) => {
      set("attachments", [...form.attachments, ...newAtts]);
      setUploading(false);
    });
    e.target.value = "";
  }

  function removeAttachment(id: string) {
    set(
      "attachments",
      form.attachments.filter((a) => a.id !== id),
    );
  }

  const isValid =
    !!form.assetInstanceId &&
    !!form.testDate &&
    !!form.testedBy &&
    !!form.nextTestDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-h-[92vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>
            {initialData ? "Edit Test Record" : "Log Asset Test"}
          </DialogTitle>
          <DialogDescription>
            Record the outcome of an asset inspection or test.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* Asset selection */}
          <div className="flex flex-col gap-2">
            <Label>Filter by Site</Label>
            <Select value={siteFilter} onValueChange={setSiteFilterLocal}>
              <SelectTrigger className="h-9 text-sm">
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
          </div>

          <div className="flex flex-col gap-2">
            <Label>Asset Instance *</Label>
            <Select
              value={form.assetInstanceId}
              onValueChange={(v) => set("assetInstanceId", v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="Select asset..." />
              </SelectTrigger>
              <SelectContent>
                {filteredInstances.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {getInstanceLabel(i)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="flex flex-col gap-2">
              <Label>Test Date *</Label>
              <Input
                type="date"
                value={form.testDate}
                onChange={(e) => set("testDate", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Next Test Due *</Label>
              <Input
                type="date"
                value={form.nextTestDate}
                onChange={(e) => set("nextTestDate", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label>Tested By *</Label>
              <Input
                value={form.testedBy}
                onChange={(e) => set("testedBy", e.target.value)}
                className="h-9 text-sm"
              />
            </div>
          </div>

          {/* Result */}
          <div className="flex flex-col gap-2">
            <Label>Result *</Label>
            <div className="flex gap-2">
              {(["pass", "fail", "pending"] as const).map((r) => {
                const rc = RESULT_CONFIG[r];
                const Icon = rc.icon;
                return (
                  <button
                    key={r}
                    type="button"
                    className={cn(
                      "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border text-sm font-medium transition-all",
                      form.result === r
                        ? `${rc.badge} border-current`
                        : "bg-muted/30 border-border hover:bg-muted/50",
                    )}
                    onClick={() => set("result", r)}
                  >
                    <Icon className="w-3.5 h-3.5" /> {rc.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Notes */}
          <div className="flex flex-col gap-2">
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              rows={3}
              placeholder="Describe findings, observations..."
              className="text-sm resize-none"
            />
          </div>

          {/* Failure reasons (shown when result = fail) */}
          {form.result === "fail" && (
            <div className="flex flex-col gap-2">
              <Label>Failure Reasons</Label>
              <div className="flex gap-2">
                <Input
                  value={failureInput}
                  onChange={(e) => setFailureInput(e.target.value)}
                  placeholder="Describe a specific failure..."
                  className="h-9 text-sm"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addFailureReason();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-9"
                  onClick={addFailureReason}
                >
                  Add
                </Button>
              </div>
              {(form.failureReasons ?? []).length > 0 && (
                <ul className="flex flex-col gap-1.5 mt-1">
                  {(form.failureReasons ?? []).map((r, i) => (
                    <li
                      key={i}
                      className="flex items-center gap-2 text-sm bg-red-50 border border-red-200 rounded-md px-3 py-1.5 text-red-700"
                    >
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span className="flex-1">{r}</span>
                      <button
                        type="button"
                        onClick={() => removeFailureReason(i)}
                        className="ml-auto hover:text-red-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Attachments / Job Cards */}
          <div className="flex flex-col gap-2">
            <Label>Attachments / Job Cards</Label>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              multiple
              accept="image/*,.pdf,.doc,.docx,.xls,.xlsx"
              onChange={handleFileChange}
            />
            <button
              type="button"
              className="flex items-center justify-center gap-2 border-2 border-dashed border-border rounded-lg py-3 px-4 text-sm text-muted-foreground hover:border-[var(--brand-purple)] hover:text-[var(--brand-purple)] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="w-4 h-4" />
              {uploading ? "Uploading..." : "Click to upload files"}
            </button>
            {form.attachments.length > 0 && (
              <div className="flex flex-col gap-1.5">
                {form.attachments.map((att) => (
                  <div
                    key={att.id}
                    className="flex items-center gap-2.5 p-2 rounded-md border border-border/60 bg-muted/30"
                  >
                    {att.type.startsWith("image/") ? (
                      <ImageIcon className="w-3.5 h-3.5 text-[var(--brand-purple)] shrink-0" />
                    ) : (
                      <FileText className="w-3.5 h-3.5 text-[var(--brand-purple)] shrink-0" />
                    )}
                    <span className="text-xs flex-1 truncate">{att.name}</span>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {(att.size / 1024).toFixed(1)} KB
                    </span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(att.id)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
            disabled={!isValid}
            onClick={() => onSave(form)}
          >
            {initialData ? "Save Changes" : "Log Test"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
