"use client";

import { useState, useEffect, useRef } from "react";
import {
  getSupplyChain,
  saveSupplyChainCompany,
  deleteSupplyChainCompany,
  generateId,
  getAssetTests,
  getAssetInstances,
  getSites,
} from "@/lib/store";
import type { SupplyChainCompany, AssetTest, AssetInstance, Site } from "@/lib/types";
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
  Truck,
  Plus,
  Search,
  MoreHorizontal,
  Pencil,
  Trash2,
  Upload,
  Phone,
  Mail,
  MapPin,
  ShieldCheck,
  ShieldAlert,
  ClipboardList,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  Building2,
} from "lucide-react";
import { format, isPast, differenceInDays } from "date-fns";
import { cn } from "@/lib/utils";

// ─── helpers ─────────────────────────────────────────────────────────────────

function insuranceBadge(dateStr: string) {
  const d = new Date(dateStr);
  const expired = isPast(d);
  const daysLeft = differenceInDays(d, new Date());
  const soonExpiry = !expired && daysLeft <= 60;
  if (expired)
    return {
      label: "Expired",
      class: "border-red-200 text-red-700 bg-red-50",
      icon: ShieldAlert,
    };
  if (soonExpiry)
    return {
      label: `Exp. ${format(d, "dd MMM yyyy")}`,
      class: "border-amber-200 text-amber-700 bg-amber-50",
      icon: AlertTriangle,
    };
  return {
    label: `Exp. ${format(d, "dd MMM yyyy")}`,
    class: "border-green-200 text-green-700 bg-green-50",
    icon: ShieldCheck,
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SupplyChainPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const [companies, setCompanies] = useState<SupplyChainCompany[]>([]);
  const [tests, setTests] = useState<AssetTest[]>([]);
  const [instances, setInstances] = useState<AssetInstance[]>([]);
  const [sites, setSites] = useState<Site[]>([]);
  const [search, setSearch] = useState("");
  const [specFilter, setSpecFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const [selected, setSelected] = useState<SupplyChainCompany | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<SupplyChainCompany | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        const [name, contactName, contactEmail, contactPhone, address, city, postcode, specialism1, specialism2, insuranceExpiry] = cols;
        if (!name) return;
        saveSupplyChainCompany({
          id: generateId("sc"),
          name,
          contactName: contactName ?? "",
          contactEmail: contactEmail ?? "",
          contactPhone: contactPhone ?? "",
          address: address ?? "",
          city: city ?? "",
          postcode: postcode ?? "",
          specialisms: [specialism1, specialism2].filter(Boolean),
          insuranceExpiryDate: insuranceExpiry ?? new Date().toISOString().slice(0, 10),
          status: "active",
          createdAt: new Date().toISOString(),
        });
      });
      load();
      if (fileInputRef.current) fileInputRef.current.value = "";
    };
    reader.readAsText(file);
  }

  function load() {
    setCompanies(getSupplyChain());
    setTests(getAssetTests());
    setInstances(getAssetInstances());
    setSites(getSites());
  }

  useEffect(() => {
    load();
  }, []);

  // All unique specialisms for filter
  const allSpecialisms = [
    ...new Set(companies.flatMap((c) => c.specialisms)),
  ].sort();

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    const matchSearch =
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q) ||
      c.city.toLowerCase().includes(q) ||
      c.specialisms.some((s) => s.toLowerCase().includes(q));
    const matchSpec =
      specFilter === "all" || c.specialisms.includes(specFilter);
    const matchStatus = statusFilter === "all" || c.status === statusFilter;
    return matchSearch && matchSpec && matchStatus;
  });

  // Count tests per company (by matching testedBy name to company name – for demo)
  // In real app you'd link tests to company ID
  function testsForCompany(company: SupplyChainCompany) {
    return tests.filter((t) =>
      company.specialisms.some((sp) =>
        t.notes?.toLowerCase().includes(sp.toLowerCase())
      )
    );
  }

  function handleSave(data: Omit<SupplyChainCompany, "id" | "createdAt">) {
    if (editCompany) {
      saveSupplyChainCompany({ ...editCompany, ...data });
    } else {
      saveSupplyChainCompany({
        ...data,
        id: generateId("sc"),
        createdAt: new Date().toISOString(),
      });
    }
    load();
    setAddOpen(false);
    setEditCompany(null);
  }

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Supply Chain</h2>
          <p className="text-sm text-muted-foreground">
            {filtered.length} of {companies.length} contractors &amp; suppliers
          </p>
        </div>
        {isAdmin && (
          <Button
            size="sm"
            className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white w-fit"
            onClick={() => setAddOpen(true)}
          >
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Supplier
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            placeholder="Search by name, city, specialism..."
            className="pl-8 h-9 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {/* <Select value={specFilter} onValueChange={setSpecFilter}>
          <SelectTrigger className="h-9 text-sm w-48">
            <SelectValue placeholder="All Specialisms" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Specialisms</SelectItem>
            {allSpecialisms.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select> */}
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="h-9 text-sm w-36">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="inactive">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Company Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {filtered.map((company) => {
          const ins = insuranceBadge(company.insuranceExpiryDate);
          const InsIcon = ins.icon;
          return (
            <Card
              key={company.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelected(company)}
            >
              <CardContent className="p-4 flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <Badge
                        variant="outline"
                        className={
                          company.status === "active"
                            ? "border-green-200 text-green-700 bg-green-50 text-[10px]"
                            : "border-gray-200 text-gray-500 bg-gray-50 text-[10px]"
                        }
                      >
                        {company.status}
                      </Badge>
                      <Badge
                        variant="outline"
                        className={cn(ins.class, "text-[10px] flex items-center gap-1")}
                      >
                        <InsIcon className="w-3 h-3" />
                        {ins.label}
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-sm leading-tight">
                      {company.name}
                    </h3>
                  </div>
                  {isAdmin && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="w-7 h-7 shrink-0">
                          <MoreHorizontal className="w-3.5 h-3.5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditCompany(company);
                          }}
                        >
                          <Pencil className="w-3.5 h-3.5 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(company.id);
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
                      {company.city}, {company.postcode}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 shrink-0" />
                    <span className="truncate">{company.contactEmail}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 shrink-0" />
                    <span>{company.contactPhone}</span>
                  </div>
                </div>

                {/* <div className="flex flex-wrap gap-1 pt-1 border-t border-border/50">
                  {company.specialisms.slice(0, 3).map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="text-[10px] bg-muted/30 border-border/60"
                    >
                      {s}
                    </Badge>
                  ))}
                  {company.specialisms.length > 3 && (
                    <Badge
                      variant="outline"
                      className="text-[10px] bg-muted/30 border-border/60 text-muted-foreground"
                    >
                      +{company.specialisms.length - 3} more
                    </Badge>
                  )}
                </div> */}
              </CardContent>
            </Card>
          );
        })}
        {filtered.length === 0 && (
          <div className="col-span-full flex flex-col items-center gap-3 py-12 text-muted-foreground">
            <Truck className="w-10 h-10 opacity-30" />
            <p className="text-sm">No suppliers found.</p>
          </div>
        )}
      </div>

      {/* Detail Dialog */}
      {selected && (
        <SupplierDetailDialog
          company={selected}
          onClose={() => setSelected(null)}
          onEdit={
            isAdmin
              ? () => {
                  setEditCompany(selected);
                  setSelected(null);
                }
              : undefined
          }
        />
      )}

      {/* Add / Edit Dialog */}
      {(addOpen || editCompany) && (
        <SupplierFormDialog
          open={addOpen || !!editCompany}
          onOpenChange={(o) => {
            if (!o) {
              setAddOpen(false);
              setEditCompany(null);
            }
          }}
          initialData={editCompany ?? undefined}
          onSave={handleSave}
        />
      )}

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Remove Supplier</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this supplier? This action cannot be undone.
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
                  deleteSupplyChainCompany(deleteId);
                  load();
                  setDeleteId(null);
                }
              }}
            >
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ─── Supplier Detail Dialog ───────────────────────────────────────────────────

function SupplierDetailDialog({
  company,
  onClose,
  onEdit,
}: {
  company: SupplyChainCompany;
  onClose: () => void;
  onEdit?: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const ins = insuranceBadge(company.insuranceExpiryDate);
  const InsIcon = ins.icon;

  // Generate a fake "share link" – a URL a manager could send the supplier to
  // upload their own certificates / job cards
  const shareLink = `${typeof window !== "undefined" ? window.location.origin : ""}/portal/supplier/${company.id}`;

  function copyLink() {
    navigator.clipboard.writeText(shareLink).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  // Fake recent job cards for demo
  const fakeJobs = [
    {
      id: "jc_01",
      ref: `JC-${company.id.toUpperCase()}-001`,
      description: `${company.specialisms[0]} inspection – Quarterly`,
      date: "2025-11-14",
      status: "completed",
      site: "Riverside Care Home",
    },
    {
      id: "jc_02",
      ref: `JC-${company.id.toUpperCase()}-002`,
      description: `${company.specialisms[0] ?? "Maintenance"} service call`,
      date: "2025-10-02",
      status: "completed",
      site: "Thornhill Lodge",
    },
    {
      id: "jc_03",
      ref: `JC-${company.id.toUpperCase()}-003`,
      description: `${company.specialisms[Math.min(1, company.specialisms.length - 1)]} remedial works`,
      date: "2025-09-18",
      status: "completed",
      site: "Gleneagles Residential",
    },
  ];

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <DialogTitle className="text-base leading-tight">
                {company.name}
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                {company.city} · {company.postcode}
              </DialogDescription>
            </div>
            <Badge
              variant="outline"
              className={cn(ins.class, "text-xs shrink-0 flex items-center gap-1")}
            >
              <InsIcon className="w-3 h-3" />
              Insurance {ins.label}
            </Badge>
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-5 text-sm">
          {/* Contact + details grid */}
          <div className="grid grid-cols-2 gap-x-8 gap-y-3">
            {[
              { label: "Contact Name", value: company.contactName },
              { label: "Phone", value: company.contactPhone },
              { label: "Email", value: company.contactEmail },
              { label: "Address", value: `${company.address}, ${company.city}, ${company.postcode}` },
              { label: "Status", value: company.status.charAt(0).toUpperCase() + company.status.slice(1) },
              { label: "Added", value: format(new Date(company.createdAt), "dd MMM yyyy") },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5 min-w-0">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="font-medium text-sm break-words">{value}</p>
              </div>
            ))}
          </div>

          {/* Specialisms */}
          {/* <div className="flex flex-col gap-2 border-t border-border/50 pt-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
              Specialisms
            </p>
            <div className="flex flex-wrap gap-1.5">
              {company.specialisms.map((s) => (
                <Badge
                  key={s}
                  variant="outline"
                  className="text-xs bg-[var(--brand-purple)]/5 border-[var(--brand-purple)]/20 text-[var(--brand-purple)]"
                >
                  {s}
                </Badge>
              ))}
            </div>
          </div> */}

          {/* Share link */}
          <div className="flex flex-col gap-2 border-t border-border/50 pt-4">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
              Supplier Portal Link
            </p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Share this link with {company.contactName} so they can upload compliance documents and job card evidence directly.
            </p>
            <div className="flex items-center gap-2 p-2.5 rounded-lg bg-muted/40 border border-border/60">
              <span className="flex-1 min-w-0 text-xs font-mono text-muted-foreground truncate">
                {shareLink}
              </span>
              <Button
                variant="outline"
                size="sm"
                className="shrink-0 h-7 text-xs"
                onClick={copyLink}
              >
                {copied ? (
                  <><Check className="w-3 h-3 mr-1.5 text-green-600" /> Copied</>
                ) : (
                  <><Copy className="w-3 h-3 mr-1.5" /> Copy</>
                )}
              </Button>
            </div>
          </div>

          {/* Recent Job Cards */}
          <div className="flex flex-col gap-2 border-t border-border/50 pt-4">
            <div className="flex items-center justify-between">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">
                Recent Job Cards
              </p>
              <Badge variant="outline" className="text-[10px]">
                {fakeJobs.length} records
              </Badge>
            </div>
            <div className="flex flex-col gap-2">
              {fakeJobs.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center gap-3 rounded-lg border border-border/60 bg-muted/20 p-3"
                >
                  <ClipboardList className="w-4 h-4 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-mono font-semibold">{job.ref}</span>
                      <Badge
                        variant="outline"
                        className="text-[9px] px-1.5 py-0 border-green-200 text-green-700 bg-green-50 flex items-center gap-0.5"
                      >
                        <CheckCircle2 className="w-2.5 h-2.5" /> Completed
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{job.description}</p>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-muted-foreground">
                      <Building2 className="w-3 h-3 shrink-0" />
                      <span>{job.site}</span>
                      <span className="text-border">·</span>
                      <span>{format(new Date(job.date), "dd MMM yyyy")}</span>
                    </div>
                  </div>
                  <a
                    href="https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 shrink-0 text-muted-foreground hover:text-foreground"
                      title="Open job card"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                    </Button>
                  </a>
                </div>
              ))}
            </div>
          </div>
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

// ─── Supplier Form Dialog ─────────────────────────────────────────────────────

type FormData = Omit<SupplyChainCompany, "id" | "createdAt">;

function SupplierFormDialog({
  open,
  onOpenChange,
  initialData,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  initialData?: SupplyChainCompany;
  onSave: (data: FormData) => void;
}) {
  const [form, setForm] = useState<FormData>({
    name: initialData?.name ?? "",
    contactName: initialData?.contactName ?? "",
    contactEmail: initialData?.contactEmail ?? "",
    contactPhone: initialData?.contactPhone ?? "",
    address: initialData?.address ?? "",
    city: initialData?.city ?? "",
    postcode: initialData?.postcode ?? "",
    specialisms: initialData?.specialisms ?? [],
    insuranceExpiryDate: initialData?.insuranceExpiryDate ?? "",
    status: initialData?.status ?? "active",
  });

  const [specialismInput, setSpecialismInput] = useState("");

  function set<K extends keyof FormData>(k: K, v: FormData[K]) {
    setForm((p) => ({ ...p, [k]: v }));
  }

  function addSpecialism() {
    const val = specialismInput.trim();
    if (val && !form.specialisms.includes(val)) {
      set("specialisms", [...form.specialisms, val]);
    }
    setSpecialismInput("");
  }

  function removeSpecialism(s: string) {
    set("specialisms", form.specialisms.filter((x) => x !== s));
  }

  const isValid =
    form.name.trim() &&
    form.contactName.trim() &&
    form.contactEmail.trim() &&
    form.insuranceExpiryDate;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData ? "Edit Supplier" : "Add Supplier"}</DialogTitle>
          <DialogDescription>
            {initialData ? "Update supplier details." : "Add a new contractor or supplier to your supply chain."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-4 text-sm">
          {/* Company */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sc-name">Company Name *</Label>
            <Input
              id="sc-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. ScotFix Building Services"
              className="h-9"
            />
          </div>

          {/* Contact */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sc-cname">Contact Name *</Label>
              <Input
                id="sc-cname"
                value={form.contactName}
                onChange={(e) => set("contactName", e.target.value)}
                placeholder="Full name"
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sc-phone">Phone</Label>
              <Input
                id="sc-phone"
                value={form.contactPhone}
                onChange={(e) => set("contactPhone", e.target.value)}
                placeholder="0141 000 0000"
                className="h-9"
              />
            </div>
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="sc-email">Email *</Label>
              <Input
                id="sc-email"
                type="email"
                value={form.contactEmail}
                onChange={(e) => set("contactEmail", e.target.value)}
                placeholder="contact@company.co.uk"
                className="h-9"
              />
            </div>
          </div>

          {/* Address */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 flex flex-col gap-1.5">
              <Label htmlFor="sc-addr">Address</Label>
              <Input
                id="sc-addr"
                value={form.address}
                onChange={(e) => set("address", e.target.value)}
                placeholder="Street address"
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sc-city">City</Label>
              <Input
                id="sc-city"
                value={form.city}
                onChange={(e) => set("city", e.target.value)}
                placeholder="City"
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sc-post">Postcode</Label>
              <Input
                id="sc-post"
                value={form.postcode}
                onChange={(e) => set("postcode", e.target.value)}
                placeholder="AB1 2CD"
                className="h-9"
              />
            </div>
          </div>

          {/* Insurance expiry */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sc-ins">Insurance Expiry *</Label>
              <Input
                id="sc-ins"
                type="date"
                value={form.insuranceExpiryDate}
                onChange={(e) => set("insuranceExpiryDate", e.target.value)}
                className="h-9"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sc-status">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => set("status", v as "active" | "inactive")}
              >
                <SelectTrigger id="sc-status" className="h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Specialisms */}
          {/* <div className="flex flex-col gap-1.5">
            <Label>Specialisms</Label>
            <div className="flex gap-2">
              <Input
                value={specialismInput}
                onChange={(e) => setSpecialismInput(e.target.value)}
                placeholder="e.g. LOLER, Fire Safety..."
                className="h-9 flex-1"
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addSpecialism();
                  }
                }}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-9"
                onClick={addSpecialism}
              >
                Add
              </Button>
            </div>
            {form.specialisms.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1">
                {form.specialisms.map((s) => (
                  <Badge
                    key={s}
                    variant="outline"
                    className="text-xs gap-1 pr-1 cursor-pointer hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30"
                    onClick={() => removeSpecialism(s)}
                  >
                    {s}
                    <span className="text-[10px]">×</span>
                  </Badge>
                ))}
              </div>
            )}
          </div> */}
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
            {initialData ? "Save Changes" : "Add Supplier"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
