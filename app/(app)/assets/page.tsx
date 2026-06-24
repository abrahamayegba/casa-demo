"use client";

import { useState, useEffect } from "react";
import {
  getAssetInstances,
  saveAssetInstance,
  deleteAssetInstance,
  getAssetTypes,
  getSites,
  generateId,
} from "@/lib/store";
import type { AssetInstance, AssetType, Site } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
  Package,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  MapPin,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ClipboardList,
} from "lucide-react";
import { isPast, format } from "date-fns";
import Link from "next/link";

const RESULT_CONFIG = {
  pass: {
    label: "Pass",
    icon: CheckCircle2,
    class: "border-green-200 text-green-700 bg-green-50",
  },
  fail: {
    label: "Fail",
    icon: XCircle,
    class: "border-red-200 text-red-700 bg-red-50",
  },
  pending: {
    label: "No Test",
    icon: Clock,
    class: "border-amber-200 text-amber-700 bg-amber-50",
  },
};

export default function AssetsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [instances, setInstances] = useState<AssetInstance[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState("");
  const [siteFilter, setSiteFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [resultFilter, setResultFilter] = useState("all");
  const [addOpen, setAddOpen] = useState(false);
  const [editInstance, setEditInstance] = useState<AssetInstance | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedInstance, setSelectedInstance] =
    useState<AssetInstance | null>(null);

  useEffect(() => {
    setInstances(getAssetInstances());
    setTypes(getAssetTypes());
    setSites(getSites());
  }, []);

  function refresh() {
    setInstances(getAssetInstances());
    setTypes(getAssetTypes());
    setSites(getSites());
  }

  const filtered = instances.filter((i) => {
    const type = types.find((t) => t.id === i.assetTypeId);
    const site = sites.find((s) => s.id === i.siteId);
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      i.serialNumber.toLowerCase().includes(q) ||
      i.location.toLowerCase().includes(q) ||
      type?.name.toLowerCase().includes(q) ||
      site?.name.toLowerCase().includes(q);
    const matchSite = siteFilter === "all" || i.siteId === siteFilter;
    const matchType = typeFilter === "all" || i.assetTypeId === typeFilter;
    // For result filter: if overdue, treat as "pending"; otherwise use actual result
    const isOverdue = i.nextTestDue && isPast(new Date(i.nextTestDue));
    const effectiveResult = isOverdue ? "pending" : i.lastTestResult;
    const matchResult =
      resultFilter === "all" ||
      effectiveResult === resultFilter ||
      (!effectiveResult && resultFilter === "pending");
    return matchSearch && matchSite && matchType && matchResult;
  });

  // Group by site
  const siteGroups = sites.filter((s) =>
    filtered.some((i) => i.siteId === s.id),
  );

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Live Assets</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {instances.length} asset instances
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Asset
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-48 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search serial, location..."
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={siteFilter} onValueChange={setSiteFilter}>
          <SelectTrigger className="h-9 text-sm w-48">
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
          <SelectTrigger className="h-9 text-sm w-48">
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
          <SelectTrigger className="h-9 text-sm w-36">
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

      {/* Grouped by site */}
      {siteGroups.length > 0 ? (
        siteGroups.map((site) => {
          const siteInstances = filtered.filter((i) => i.siteId === site.id);
          return (
            <div key={site.id} className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-[var(--brand-purple)]" />
                <h3 className="font-semibold text-sm">{site.name}</h3>
                <span className="text-xs text-muted-foreground">
                  {site.city}
                </span>
                <Badge variant="outline" className="text-[10px] ml-1">
                  {siteInstances.length} asset
                  {siteInstances.length !== 1 ? "s" : ""}
                </Badge>
              </div>
              <Card>
                <CardContent className="p-0">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/50">
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">
                          Serial / Frequency
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">
                          Type
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 hidden md:table-cell">
                          Last Test
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">
                          Last Test Status
                        </th>
                        <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 hidden lg:table-cell">
                          Next Due
                        </th>
                        <th className="px-4 py-2.5 w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {siteInstances.map((instance, idx) => {
                        const type = types.find(
                          (t) => t.id === instance.assetTypeId,
                        );
                        const isOverdue =
                          instance.nextTestDue &&
                          isPast(new Date(instance.nextTestDue));
                        // If overdue, treat as "pending" (no test), otherwise use actual result
                        const result = isOverdue
                          ? "pending"
                          : (instance.lastTestResult ?? "pending");
                        const rc =
                          RESULT_CONFIG[result as keyof typeof RESULT_CONFIG] ??
                          RESULT_CONFIG.pending;
                        const ResultIcon = rc.icon;
                        return (
                          <tr
                            key={instance.id}
                            className={`${idx < siteInstances.length - 1 ? "border-b border-border/30" : ""} hover:bg-muted/30 cursor-pointer transition-colors`}
                            onClick={() => setSelectedInstance(instance)}
                          >
                            {/* Serial + Frequency */}
                            <td className="px-4 py-2.5">
                              <p className="font-medium font-mono text-xs">
                                {instance.serialNumber}
                              </p>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <Clock className="w-2.5 h-2.5 shrink-0" />
                                <span className="font-mono font-semibold">
                                  {type
                                    ? `${type.testingIntervalMonths}M`
                                    : "—"}
                                </span>
                                <span className="text-border">·</span>
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                {instance.location}
                              </div>
                            </td>
                            {/* Type */}
                            <td className="px-4 py-2.5 hidden sm:table-cell">
                              <p className="text-xs">
                                {type?.name ?? "Unknown"}
                              </p>
                              <p className="text-[10px] text-muted-foreground font-mono">
                                {type?.code}
                              </p>
                            </td>
                            {/* Last Test Date */}
                            <td className="px-4 py-2.5 hidden md:table-cell">
                              <span className="text-xs text-muted-foreground">
                                {instance.lastTestDate
                                  ? format(
                                      new Date(instance.lastTestDate),
                                      "dd MMM yyyy",
                                    )
                                  : "Never"}
                              </span>
                            </td>
                            {/* Last Test Status */}
                            <td className="px-4 py-2.5">
                              <div className="flex items-center gap-1.5">
                                <ResultIcon
                                  className={`w-3.5 h-3.5 ${result === "pass" ? "text-green-600" : result === "fail" ? "text-red-600" : "text-amber-600"}`}
                                />
                                <Badge
                                  variant="outline"
                                  className={`${rc.class} text-[10px]`}
                                >
                                  {rc.label}
                                </Badge>
                              </div>
                            </td>
                            {/* Next Due */}
                            <td className="px-4 py-2.5 hidden lg:table-cell">
                              {instance.nextTestDue ? (
                                <span
                                  className={`text-xs ${isOverdue ? "text-red-600 font-semibold" : "text-muted-foreground"}`}
                                >
                                  {isOverdue
                                    ? `Overdue · ${format(new Date(instance.nextTestDue), "dd MMM yyyy")}`
                                    : format(
                                        new Date(instance.nextTestDue),
                                        "dd MMM yyyy",
                                      )}
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">
                                  —
                                </span>
                              )}
                            </td>
                            <td
                              className="px-4 py-2.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {isAdmin && (
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
                                      onClick={() => setEditInstance(instance)}
                                    >
                                      <Pencil className="w-3.5 h-3.5 mr-2" />{" "}
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive"
                                      onClick={() => setDeleteId(instance.id)}
                                    >
                                      <Trash2 className="w-3.5 h-3.5 mr-2" />{" "}
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </CardContent>
              </Card>
            </div>
          );
        })
      ) : (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Package className="w-10 h-10 opacity-30" />
          <p className="text-sm">No assets found.</p>
        </div>
      )}

      {/* Detail dialog */}
      <Dialog
        open={!!selectedInstance}
        onOpenChange={() => setSelectedInstance(null)}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {selectedInstance?.serialNumber}
            </DialogTitle>
            <DialogDescription>
              {selectedInstance &&
                types.find((t) => t.id === selectedInstance.assetTypeId)?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedInstance &&
            (() => {
              const type = types.find(
                (t) => t.id === selectedInstance.assetTypeId,
              );
              const site = sites.find((s) => s.id === selectedInstance.siteId);
              const isOverdue =
                selectedInstance.nextTestDue &&
                isPast(new Date(selectedInstance.nextTestDue));
              return (
                <div className="grid grid-cols-2 gap-4 text-sm">
                  {[
                    { label: "Site", value: site?.name ?? "Unknown" },
                    { label: "Location", value: selectedInstance.location },
                    { label: "Asset Type", value: type?.name ?? "Unknown" },
                    { label: "Code", value: type?.code ?? "—" },
                    {
                      label: "Installed",
                      value: selectedInstance.installDate
                        ? format(
                            new Date(selectedInstance.installDate),
                            "dd MMM yyyy",
                          )
                        : "—",
                    },
                    {
                      label: "Last Test",
                      value: selectedInstance.lastTestDate
                        ? format(
                            new Date(selectedInstance.lastTestDate),
                            "dd MMM yyyy",
                          )
                        : "Never",
                    },
                    {
                      label: "Next Due",
                      value: selectedInstance.nextTestDue
                        ? format(
                            new Date(selectedInstance.nextTestDue),
                            "dd MMM yyyy",
                          ) + (isOverdue ? " (OVERDUE)" : "")
                        : "—",
                    },
                    {
                      label: "Last Result",
                      value:
                        selectedInstance.lastTestResult?.toUpperCase() ??
                        "Pending",
                    },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        {label}
                      </p>
                      <p
                        className={`font-medium ${label === "Last Result" && selectedInstance.lastTestResult === "fail" ? "text-red-600" : ""}`}
                      >
                        {value}
                      </p>
                    </div>
                  ))}
                  {selectedInstance.notes && (
                    <div className="col-span-2 flex flex-col gap-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                        Notes
                      </p>
                      <p className="text-sm">{selectedInstance.notes}</p>
                    </div>
                  )}
                </div>
              );
            })()}
          <DialogFooter className="flex gap-2">
            <Link href="/tests">
              <Button variant="outline" size="sm">
                <ClipboardList className="w-3.5 h-3.5 mr-1.5" /> View Tests
              </Button>
            </Link>
            <Button variant="outline" onClick={() => setSelectedInstance(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AssetFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        types={types}
        sites={sites}
        onSave={(data) => {
          saveAssetInstance({
            ...data,
            id: generateId("ai"),
            createdAt: new Date().toISOString(),
          });
          refresh();
          setAddOpen(false);
        }}
      />
      {editInstance && (
        <AssetFormDialog
          open={!!editInstance}
          onOpenChange={(o) => !o && setEditInstance(null)}
          types={types}
          sites={sites}
          initialData={editInstance}
          onSave={(data) => {
            saveAssetInstance({ ...editInstance, ...data });
            refresh();
            setEditInstance(null);
          }}
        />
      )}

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Asset</DialogTitle>
            <DialogDescription>
              Are you sure? This cannot be undone.
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
                  deleteAssetInstance(deleteId);
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
    </div>
  );
}

type AIFormData = Omit<AssetInstance, "id" | "createdAt">;

function AssetFormDialog({
  open,
  onOpenChange,
  types,
  sites,
  initialData,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  types: AssetType[];
  sites: Site[];
  initialData?: Partial<AIFormData>;
  onSave: (data: AIFormData) => void;
}) {
  const [form, setForm] = useState<AIFormData>({
    assetTypeId: initialData?.assetTypeId ?? "",
    siteId: initialData?.siteId ?? "",
    serialNumber: initialData?.serialNumber ?? "",
    location: initialData?.location ?? "",
    installDate: initialData?.installDate ?? "",
    nextTestDue: initialData?.nextTestDue ?? "",
    lastTestDate: initialData?.lastTestDate,
    lastTestResult: initialData?.lastTestResult,
    notes: initialData?.notes ?? "",
  });
  function set<K extends keyof AIFormData>(k: K, v: AIFormData[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData?.serialNumber ? "Edit Asset" : "Add Asset"}
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Asset Type *</Label>
            <Select
              value={form.assetTypeId}
              onValueChange={(v) => set("assetTypeId", v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {types.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Site *</Label>
            <Select value={form.siteId} onValueChange={(v) => set("siteId", v)}>
              <SelectTrigger>
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
          <div className="flex flex-col gap-1.5">
            <Label>Serial Number *</Label>
            <Input
              value={form.serialNumber}
              onChange={(e) => set("serialNumber", e.target.value)}
              className="font-mono"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Location</Label>
            <Input
              value={form.location}
              onChange={(e) => set("location", e.target.value)}
              placeholder="e.g. Ground Floor Corridor"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Install Date</Label>
            <Input
              type="date"
              value={form.installDate}
              onChange={(e) => set("installDate", e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Next Test Due</Label>
            <Input
              type="date"
              value={form.nextTestDue}
              onChange={(e) => set("nextTestDue", e.target.value)}
            />
          </div>
          <div className="col-span-2 flex flex-col gap-1.5">
            <Label>Notes</Label>
            <Input
              value={form.notes ?? ""}
              onChange={(e) => set("notes", e.target.value)}
            />
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
            disabled={!form.assetTypeId || !form.siteId || !form.serialNumber}
            onClick={() => onSave(form)}
          >
            {initialData?.serialNumber ? "Save Changes" : "Add Asset"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
