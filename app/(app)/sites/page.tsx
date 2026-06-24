"use client";

import { useState, useEffect, useRef } from "react";
import {
  getSites,
  saveSite,
  deleteSite,
  getAssetInstances,
  getAssetTypes,
  generateId,
  getSiteComplianceStatus,
} from "@/lib/store";
import type { Site, SiteContact, SiteComplianceStatus, AssetInstance, AssetType } from "@/lib/types";
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
  Building2,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  MapPin,
  Phone,
  Mail,
  Users,
  CheckCircle2,
  Loader2,
  Package,
  Crown,
  X,
  FileText,
  Paperclip,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
  AlertTriangle,
  CircleDashed,
} from "lucide-react";

type SyncStep = { label: string; done: boolean; active: boolean };

function ComplianceBadge({ status }: { status: SiteComplianceStatus }) {
  if (status.level === "no-data") {
    return (
      <Badge variant="outline" className="border-gray-200 text-gray-400 bg-gray-50 text-[10px] flex items-center gap-1">
        <CircleDashed className="w-2.5 h-2.5" /> No data
      </Badge>
    );
  }
  if (status.level === "compliant") {
    return (
      <Badge variant="outline" className="border-green-200 text-green-700 bg-green-50 text-[10px] flex items-center gap-1">
        <ShieldCheck className="w-2.5 h-2.5" /> Compliant
      </Badge>
    );
  }
  if (status.level === "warning") {
    const issues = [];
    if (status.overdueAssets > 0) issues.push(`${status.overdueAssets} overdue`);
    if (status.pendingAssets > 0) issues.push(`${status.pendingAssets} untested`);
    return (
      <Badge variant="outline" className="border-amber-200 text-amber-700 bg-amber-50 text-[10px] flex items-center gap-1">
        <AlertTriangle className="w-2.5 h-2.5" /> {issues.join(", ") || "Warning"}
      </Badge>
    );
  }
  // non-compliant
  return (
    <Badge variant="outline" className="border-red-200 text-red-700 bg-red-50 text-[10px] flex items-center gap-1">
      <ShieldX className="w-2.5 h-2.5" /> {status.failingAssets} failing
    </Badge>
  );
}

export default function SitesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [sites, setSites] = useState<Site[]>([]);
  const [instances, setInstances] = useState<AssetInstance[]>([]);
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [complianceMap, setComplianceMap] = useState<Record<string, SiteComplianceStatus>>({});
  const [search, setSearch] = useState("");
  const [regionFilter, setRegionFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [complianceFilter, setComplianceFilter] = useState("all");
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 24;
  const [addOpen, setAddOpen] = useState(false);
  const [editSite, setEditSite] = useState<Site | null>(null);
  const [deleteSiteId, setDeleteSiteId] = useState<string | null>(null);
  const [syncOpen, setSyncOpen] = useState(false);
  const [syncSteps, setSyncSteps] = useState<SyncStep[]>([]);
  const [syncDone, setSyncDone] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedSite, setSelectedSite] = useState<Site | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadedSites = getSites();
    setSites(loadedSites);
    setInstances(getAssetInstances());
    setAssetTypes(getAssetTypes());
    const map: Record<string, SiteComplianceStatus> = {};
    for (const s of loadedSites) {
      map[s.id] = getSiteComplianceStatus(s.id);
    }
    setComplianceMap(map);
  }, []);

  function refresh() {
    const loadedSites = getSites();
    setSites(loadedSites);
    setInstances(getAssetInstances());
    setAssetTypes(getAssetTypes());
    const map: Record<string, SiteComplianceStatus> = {};
    for (const s of loadedSites) {
      map[s.id] = getSiteComplianceStatus(s.id);
    }
    setComplianceMap(map);
  }

  const regions = [...new Set(sites.map((s) => s.region).filter(Boolean))].sort();
  const cities = [...new Set(sites.map((s) => s.city).filter(Boolean))].sort();

  const filtered = sites.filter((s) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      s.city.toLowerCase().includes(q) ||
      s.postcode.toLowerCase().includes(q) ||
      s.address.toLowerCase().includes(q) ||
      (s.simproId ?? "").toLowerCase().includes(q);
    const matchRegion = regionFilter === "all" || s.region === regionFilter;
    const matchCity = cityFilter === "all" || s.city === cityFilter;
    const matchStatus = statusFilter === "all" || s.status === statusFilter;
    const cs = complianceMap[s.id];
    const matchCompliance =
      complianceFilter === "all" ||
      (complianceFilter === "compliant" && cs?.level === "compliant") ||
      (complianceFilter === "warning" && cs?.level === "warning") ||
      (complianceFilter === "non-compliant" && cs?.level === "non-compliant") ||
      (complianceFilter === "no-data" && (!cs || cs.level === "no-data"));
    return matchSearch && matchRegion && matchCity && matchStatus && matchCompliance;
  });

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function resetPage() { setPage(1); }

  function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const rows = text.trim().split("\n").slice(1);
      rows.forEach((row) => {
        const cols = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
        if (cols.length < 4) return;
        const [name, address, city, postcode, region, contact, email, phone] =
          cols;
        if (!name) return;
        saveSite({
          id: generateId("site"),
          name,
          address: address ?? "",
          city: city ?? "",
          postcode: postcode ?? "",
          region: region ?? "Unknown",
          primaryContact: contact ?? "",
          primaryContactEmail: email ?? "",
          primaryContactPhone: phone ?? "",
          status: "active",
          createdAt: new Date().toISOString(),
          syncedFromSimpro: false,
        });
      });
      setUploadOpen(false);
      refresh();
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Sites</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {sites.length} properties
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setUploadOpen(true)}
            >
              <Upload className="w-3.5 h-3.5 mr-1.5" /> Import CSV
            </Button>
            <Button
              size="sm"
              className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
              onClick={() => setAddOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Site
            </Button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="Search name, address, postcode, Simpro ID..."
              className="pl-8 h-9 text-sm"
              value={search}
              onChange={(e) => { setSearch(e.target.value); resetPage(); }}
            />
          </div>
          {(search || regionFilter !== "all" || cityFilter !== "all" || statusFilter !== "all" || complianceFilter !== "all") && (
            <Button
              variant="ghost"
              size="sm"
              className="h-9 text-xs text-muted-foreground"
              onClick={() => { setSearch(""); setRegionFilter("all"); setCityFilter("all"); setStatusFilter("all"); setComplianceFilter("all"); resetPage(); }}
            >
              <X className="w-3 h-3 mr-1" /> Clear filters
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Select value={cityFilter} onValueChange={(v) => { setCityFilter(v); resetPage(); }}>
            <SelectTrigger className="h-8 text-xs w-40">
              <SelectValue placeholder="All Towns" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Towns</SelectItem>
              {cities.map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v); resetPage(); }}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="All Regions" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              {regions.map((r) => (
                <SelectItem key={r} value={r}>{r}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={complianceFilter} onValueChange={(v) => { setComplianceFilter(v); resetPage(); }}>
            <SelectTrigger className="h-8 text-xs w-44">
              <SelectValue placeholder="All Compliance" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Compliance</SelectItem>
              <SelectItem value="compliant">Compliant</SelectItem>
              <SelectItem value="warning">Warning</SelectItem>
              <SelectItem value="non-compliant">Non-Compliant</SelectItem>
              <SelectItem value="no-data">No Data</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); resetPage(); }}>
            <SelectTrigger className="h-8 text-xs w-32">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {paginated.map((site) => {
          const siteAssets = instances.filter(
            (i) => i.siteId === site.id,
          ).length;
          const compliance = complianceMap[site.id];
          return (
            <Card
              key={site.id}
              className={`hover:shadow-md transition-shadow cursor-pointer ${compliance?.level === "non-compliant" ? "border-red-200" : compliance?.level === "warning" ? "border-amber-200" : ""}`}
              onClick={() => setSelectedSite(site)}
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap mb-1">
                      <Badge
                        variant="outline"
                        className={
                          site.status === "active"
                            ? "border-green-200 text-green-700 bg-green-50 text-[10px]"
                            : "border-gray-200 text-gray-500 bg-gray-50 text-[10px]"
                        }
                      >
                        {site.status}
                      </Badge>
                      {site.syncedFromSimpro && (
                        <Badge
                          variant="outline"
                          className="border-purple-200 text-purple-700 bg-purple-50 text-[10px]"
                        >
                          Simpro
                        </Badge>
                      )}
                      {compliance && <ComplianceBadge status={compliance} />}
                    </div>
                    <h3 className="font-semibold text-sm leading-tight">
                      {site.name}
                    </h3>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        asChild
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-7 h-7 shrink-0"
                        >
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditSite(site);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteSiteId(site.id);
                          }}
                        >
                          <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>

                <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3 h-3 shrink-0" />
                    <span className="truncate">
                      {site.address}, {site.city}, {site.postcode}
                    </span>
                  </div>
                  {(() => {
                    const primary =
                      site.contacts?.find((c) => c.isPrimary) ?? null;
                    const name = primary?.name ?? site.primaryContact;
                    const email = primary?.email ?? site.primaryContactEmail;
                    return (
                      <>
                        <div className="flex items-center gap-1.5">
                          <Crown className="w-3 h-3 shrink-0 text-amber-500" />
                          <span className="truncate font-medium text-foreground">
                            {name}
                          </span>
                          {site.contacts && site.contacts.length > 1 && (
                            <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">
                              +{site.contacts.length - 1} more
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{email}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-border/50">
                  <div className="flex items-center gap-3 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Package className="w-3 h-3 text-muted-foreground" />
                      <span className="text-muted-foreground">
                        {siteAssets} asset{siteAssets !== 1 ? "s" : ""}
                      </span>
                    </div>
                    {compliance && compliance.failingAssets > 0 && (
                      <div className="flex items-center gap-1 text-red-600">
                        <ShieldX className="w-3 h-3" />
                        <span>{compliance.failingAssets} fail{compliance.failingAssets !== 1 ? "s" : ""}</span>
                      </div>
                    )}
                    {compliance && compliance.failingAssets === 0 && compliance.overdueAssets > 0 && (
                      <div className="flex items-center gap-1 text-amber-600">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{compliance.overdueAssets} overdue</span>
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] text-muted-foreground">
                    {site.region}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Building2 className="w-10 h-10 opacity-30" />
            <p className="text-sm">No properties match your filters.</p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground border-t border-border/50 pt-4">
          <span>
            Showing {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} of {filtered.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
              // Show first, last, current ± 1, and ellipsis
              const p = i + 1;
              return (
                <Button
                  key={p}
                  variant={page === p ? "default" : "outline"}
                  size="sm"
                  className={`h-8 w-8 text-xs ${page === p ? "bg-[var(--brand-purple)] text-white" : ""}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </Button>
              );
            })}
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Site Detail */}
      <Dialog open={!!selectedSite} onOpenChange={() => setSelectedSite(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedSite?.name}</DialogTitle>
            <DialogDescription>
              Site details and contact information
            </DialogDescription>
          </DialogHeader>
          {selectedSite && (
            <div className="flex flex-col gap-5 text-sm">
              {/* Compliance status */}
              {(() => {
                const cs = complianceMap[selectedSite.id];
                if (!cs || cs.level === "no-data") return null;
                const isNonCompliant = cs.level === "non-compliant";
                const isWarning = cs.level === "warning";
                const bgClass = isNonCompliant
                  ? "bg-red-50 border-red-200"
                  : isWarning
                  ? "bg-amber-50 border-amber-200"
                  : "bg-green-50 border-green-200";
                const textClass = isNonCompliant
                  ? "text-red-800"
                  : isWarning
                  ? "text-amber-800"
                  : "text-green-800";
                const Icon = isNonCompliant ? ShieldX : isWarning ? ShieldAlert : ShieldCheck;

                // Assets that are failing or overdue for this site
                const siteInstances = instances.filter((i) => i.siteId === selectedSite.id);
                const failingInstances = siteInstances.filter((i) => i.lastTestResult === "fail");
                const overdueInstances = siteInstances.filter(
                  (i) =>
                    i.lastTestResult !== "fail" &&
                    i.nextTestDue &&
                    new Date(i.nextTestDue) < new Date(),
                );
                const pendingInstances = siteInstances.filter(
                  (i) => !i.lastTestResult || i.lastTestResult === "pending",
                );
                const problemAssets = [
                  ...failingInstances,
                  ...overdueInstances,
                  ...pendingInstances,
                ];

                return (
                  <div className={`flex flex-col gap-2 rounded-lg border p-3 ${bgClass}`}>
                    <div className="flex items-center gap-2">
                      <Icon className={`w-4 h-4 shrink-0 ${textClass}`} />
                      <p className={`font-semibold text-sm ${textClass}`}>
                        {isNonCompliant ? "Non-Compliant" : isWarning ? "Compliance Warning" : "Fully Compliant"}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="flex flex-col items-center gap-0.5 rounded-md bg-white/60 py-1.5 px-2">
                        <span className="font-bold text-base text-foreground">{cs.totalAssets}</span>
                        <span className={textClass}>Total</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 rounded-md bg-white/60 py-1.5 px-2">
                        <span className={`font-bold text-base ${cs.failingAssets > 0 ? "text-red-600" : "text-foreground"}`}>{cs.failingAssets}</span>
                        <span className={textClass}>Failing</span>
                      </div>
                      <div className="flex flex-col items-center gap-0.5 rounded-md bg-white/60 py-1.5 px-2">
                        <span className={`font-bold text-base ${cs.overdueAssets > 0 ? "text-amber-600" : "text-foreground"}`}>{cs.overdueAssets}</span>
                        <span className={textClass}>Overdue</span>
                      </div>
                    </div>

                    {/* Failing / overdue / pending asset list */}
                    {(isNonCompliant || isWarning) && problemAssets.length > 0 && (
                      <div className="flex flex-col gap-1 mt-1">
                        <p className={`text-[10px] font-semibold uppercase tracking-wide ${textClass} opacity-70`}>
                          Assets Requiring Attention
                        </p>
                        <div className="flex flex-col gap-1 max-h-40 overflow-y-auto">
                          {problemAssets.map((inst) => {
                            const assetType = assetTypes.find((t) => t.id === inst.assetTypeId);
                            const isFailing = inst.lastTestResult === "fail";
                            const isPending = !inst.lastTestResult || inst.lastTestResult === "pending";
                            const label = isFailing ? "Failed" : isPending ? "No Test" : "Overdue";
                            const rowColor = isFailing
                              ? "border-red-200 bg-red-50/60 text-red-800"
                              : isPending
                              ? "border-gray-200 bg-gray-50/60 text-gray-700"
                              : "border-amber-200 bg-amber-50/60 text-amber-800";
                            const dotColor = isFailing ? "bg-red-500" : isPending ? "bg-gray-400" : "bg-amber-500";
                            return (
                              <div
                                key={inst.id}
                                className={`flex items-center gap-2 rounded px-2 py-1.5 border text-[11px] ${rowColor}`}
                              >
                                <div className={`w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
                                <span className="font-medium truncate flex-1">
                                  {assetType?.name ?? "Unknown Asset"} — {inst.serialNumber}
                                </span>
                                <span className="text-[10px] opacity-70 shrink-0">{inst.location}</span>
                                <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded shrink-0 ${
                                  isFailing ? "bg-red-600 text-white" : isPending ? "bg-gray-400 text-white" : "bg-amber-500 text-white"
                                }`}>
                                  {label}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}

              {/* Site details */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  {
                    label: "Address",
                    value: `${selectedSite.address}, ${selectedSite.city}`,
                  },
                  { label: "Postcode", value: selectedSite.postcode },
                  { label: "Region", value: selectedSite.region },
                  {
                    label: "Status",
                    value:
                      selectedSite.status.charAt(0).toUpperCase() +
                      selectedSite.status.slice(1),
                  },
                  ...(selectedSite.simproId
                    ? [{ label: "Simpro ID", value: selectedSite.simproId }]
                    : []),
                ].map(({ label, value }) => (
                  <div key={label} className="flex flex-col gap-0.5">
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                      {label}
                    </p>
                    <p className="font-medium">{value}</p>
                  </div>
                ))}
              </div>

              {/* Contacts section */}
              <div className="flex flex-col gap-2 border-t border-border/50 pt-4">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="w-3.5 h-3.5 text-muted-foreground" />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Contacts ({(selectedSite.contacts ?? []).length || 1})
                  </p>
                </div>
                <div className="flex flex-col gap-2">
                  {(selectedSite.contacts && selectedSite.contacts.length > 0
                    ? selectedSite.contacts
                    : [
                        {
                          id: "legacy",
                          name: selectedSite.primaryContact,
                          email: selectedSite.primaryContactEmail,
                          phone: selectedSite.primaryContactPhone,
                          role: "Primary Contact",
                          isPrimary: true,
                        },
                      ]
                  ).map((contact) => (
                    <div
                      key={contact.id}
                      className={`flex items-start gap-3 rounded-lg border p-3 ${contact.isPrimary ? "border-amber-200 bg-amber-50/50" : "border-border bg-muted/20"}`}
                    >
                      <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-semibold shrink-0 text-muted-foreground">
                        {contact.name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .slice(0, 2)
                          .toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-semibold text-sm">
                            {contact.name}
                          </p>
                          {contact.isPrimary && (
                            <Badge
                              variant="outline"
                              className="text-[9px] px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50 flex items-center gap-0.5"
                            >
                              <Crown className="w-2.5 h-2.5" /> Primary
                            </Badge>
                          )}
                        </div>
                        {contact.role && (
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {contact.role}
                          </p>
                        )}
                        <div className="flex flex-col gap-0.5 mt-1.5">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Mail className="w-3 h-3 shrink-0" />
                            <span className="truncate">{contact.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Phone className="w-3 h-3 shrink-0" />
                            <span>{contact.phone}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Attachments section */}
              {selectedSite.attachments && selectedSite.attachments.length > 0 && (
                <div className="flex flex-col gap-2 border-t border-border/50 pt-4">
                  <div className="flex items-center gap-1.5 mb-1">
                    <Paperclip className="w-3.5 h-3.5 text-muted-foreground" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      Attachments ({selectedSite.attachments.length})
                    </p>
                  </div>
                  <div className="flex flex-col gap-2">
                    {selectedSite.attachments.map((att) => (
                      <a
                        key={att.id}
                        href={att.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors p-3 group"
                      >
                        <FileText className="w-4 h-4 text-[var(--brand-purple)] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium truncate">{att.name}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {att.type}
                            {att.description && ` · ${att.description}`}
                          </p>
                        </div>
                        <ExternalLink className="w-3.5 h-3.5 text-muted-foreground group-hover:text-[var(--brand-purple)] transition-colors shrink-0" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedSite(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <SiteFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        onSave={(data) => {
          saveSite({
            ...data,
            id: generateId("site"),
            createdAt: new Date().toISOString(),
          });
          refresh();
          setAddOpen(false);
        }}
      />
      {editSite && (
        <SiteFormDialog
          open={!!editSite}
          onOpenChange={(o) => !o && setEditSite(null)}
          initialData={editSite}
          onSave={(data) => {
            saveSite({ ...editSite, ...data });
            refresh();
            setEditSite(null);
          }}
        />
      )}

      <Dialog
        open={!!deleteSiteId}
        onOpenChange={(o) => !o && setDeleteSiteId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Site</DialogTitle>
            <DialogDescription>
              Are you sure? This cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteSiteId(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (deleteSiteId) {
                  deleteSite(deleteSiteId);
                  refresh();
                  setDeleteSiteId(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={syncOpen} onOpenChange={(o) => !o && setSyncOpen(false)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Syncing from Simpro</DialogTitle>
            <DialogDescription>
              Connecting to Simpro API and importing site data...
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2 py-2">
            {syncSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2.5 text-sm">
                {step.done ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
                ) : step.active ? (
                  <Loader2 className="w-4 h-4 text-[var(--brand-purple)] shrink-0 animate-spin" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-border shrink-0" />
                )}
                <span
                  className={
                    step.done ? "text-foreground" : "text-muted-foreground"
                  }
                >
                  {step.label}
                </span>
              </div>
            ))}
          </div>
          {syncDone && (
            <DialogFooter>
              <Button
                className="bg-[var(--brand-purple)] text-white"
                onClick={() => setSyncOpen(false)}
              >
                Done
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={uploadOpen} onOpenChange={setUploadOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Import Sites from CSV</DialogTitle>
            <DialogDescription>
              CSV columns: Name, Address, City, Postcode, Region, Contact,
              Email, Phone
            </DialogDescription>
          </DialogHeader>
          <div
            className="border-2 border-dashed border-border rounded-lg p-8 flex flex-col items-center gap-3 cursor-pointer hover:border-[var(--brand-purple)] transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="w-8 h-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground text-center">
              Click to browse or drag and drop your CSV file
            </p>
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={handleCsvUpload}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUploadOpen(false)}>
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type SiteFormData = Omit<Site, "id" | "createdAt">;

function SiteFormDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialData?: Partial<SiteFormData>;
  onSave: (data: SiteFormData) => void;
}) {
  const [form, setForm] = useState<SiteFormData>({
    name: initialData?.name ?? "",
    address: initialData?.address ?? "",
    city: initialData?.city ?? "",
    postcode: initialData?.postcode ?? "",
    region: initialData?.region ?? "",
    primaryContact: initialData?.primaryContact ?? "",
    primaryContactEmail: initialData?.primaryContactEmail ?? "",
    primaryContactPhone: initialData?.primaryContactPhone ?? "",
    status: initialData?.status ?? "active",
    syncedFromSimpro: initialData?.syncedFromSimpro ?? false,
    contacts: initialData?.contacts ?? [],
  });

  const [contacts, setContacts] = useState<SiteContact[]>(
    initialData?.contacts && initialData.contacts.length > 0
      ? initialData.contacts
      : [
          {
            id: "con_new_0",
            name: initialData?.primaryContact ?? "",
            email: initialData?.primaryContactEmail ?? "",
            phone: initialData?.primaryContactPhone ?? "",
            role: "",
            isPrimary: true,
          },
        ],
  );

  function addContact() {
    setContacts((prev) => [
      ...prev,
      {
        id: `con_new_${prev.length}`,
        name: "",
        email: "",
        phone: "",
        role: "",
        isPrimary: false,
      },
    ]);
  }

  function removeContact(idx: number) {
    setContacts((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length > 0 && !next.some((c) => c.isPrimary)) {
        next[0].isPrimary = true;
      }
      return next;
    });
  }

  function setPrimary(idx: number) {
    setContacts((prev) => prev.map((c, i) => ({ ...c, isPrimary: i === idx })));
  }

  function updateContact(idx: number, field: keyof SiteContact, value: string) {
    setContacts((prev) =>
      prev.map((c, i) => (i === idx ? { ...c, [field]: value } : c)),
    );
  }

  function set(k: keyof SiteFormData, v: string) {
    setForm((prev) => ({ ...prev, [k]: v }));
  }

  function handleSave() {
    const primary = contacts.find((c) => c.isPrimary) ?? contacts[0];
    const finalForm: SiteFormData = {
      ...form,
      contacts,
      primaryContact: primary?.name ?? form.primaryContact,
      primaryContactEmail: primary?.email ?? form.primaryContactEmail,
      primaryContactPhone: primary?.phone ?? form.primaryContactPhone,
    };
    onSave(finalForm);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {initialData?.name ? "Edit Site" : "Add New Site"}
          </DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-4">
          {/* Site info */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Site Name *</Label>
              <Input
                value={form.name}
                onChange={(e) => set("name", e.target.value)}
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>City</Label>
              <Input
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Postcode</Label>
              <Input
                value={form.postcode}
                onChange={(e) => set("postcode", e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Region</Label>
              <Input
                value={form.region}
                onChange={(e) => set("region", e.target.value)}
                placeholder="e.g. West, East, North"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Contacts section */}
          <div className="flex flex-col gap-2 border-t border-border/50 pt-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Site Contacts</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={addContact}
              >
                <Plus className="w-3 h-3 mr-1" /> Add Contact
              </Button>
            </div>
            <div className="flex flex-col gap-3">
              {contacts.map((contact, idx) => (
                <div
                  key={contact.id}
                  className={`flex flex-col gap-2 rounded-lg border p-3 ${contact.isPrimary ? "border-amber-200 bg-amber-50/40" : "border-border bg-muted/10"}`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {contact.isPrimary ? (
                        <Badge
                          variant="outline"
                          className="text-[9px] px-1.5 border-amber-300 text-amber-700 bg-amber-50 flex items-center gap-0.5"
                        >
                          <Crown className="w-2.5 h-2.5" /> Primary
                        </Badge>
                      ) : (
                        <button
                          type="button"
                          className="text-[10px] text-muted-foreground hover:text-foreground underline"
                          onClick={() => setPrimary(idx)}
                        >
                          Set as primary
                        </button>
                      )}
                    </div>
                    {contacts.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeContact(idx)}
                        className="text-muted-foreground hover:text-destructive"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Name</Label>
                      <Input
                        className="h-8 text-xs"
                        value={contact.name}
                        onChange={(e) =>
                          updateContact(idx, "name", e.target.value)
                        }
                        placeholder="Full name"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Role</Label>
                      <Input
                        className="h-8 text-xs"
                        value={contact.role ?? ""}
                        onChange={(e) =>
                          updateContact(idx, "role", e.target.value)
                        }
                        placeholder="e.g. Site Manager"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Email</Label>
                      <Input
                        className="h-8 text-xs"
                        type="email"
                        value={contact.email}
                        onChange={(e) =>
                          updateContact(idx, "email", e.target.value)
                        }
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs">Phone</Label>
                      <Input
                        className="h-8 text-xs"
                        value={contact.phone}
                        onChange={(e) =>
                          updateContact(idx, "phone", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
            disabled={!form.name}
            onClick={handleSave}
          >
            {initialData?.name ? "Save Changes" : "Add Site"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}
