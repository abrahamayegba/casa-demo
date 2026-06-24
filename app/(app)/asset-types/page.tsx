"use client";

import { useState, useEffect } from "react";
import { getAssetTypes, saveAssetType, deleteAssetType, getAssetInstances, getSites, generateId } from "@/lib/store";
import type { AssetType, AssetInstance, Site } from "@/lib/types";
import { useAuth } from "@/contexts/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Layers, Plus, Search, MoreHorizontal, Pencil, Trash2, Clock, Hash, MapPin, Building2, CheckCircle2, XCircle } from "lucide-react";

export default function AssetTypesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [types, setTypes] = useState<AssetType[]>([]);
  const [instances, setInstances] = useState<ReturnType<typeof getAssetInstances>>([]);
  const [sites, setSites] = useState<ReturnType<typeof getSites>>([]);
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editType, setEditType] = useState<AssetType | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<AssetType | null>(null);

  useEffect(() => {
    setTypes(getAssetTypes());
    setInstances(getAssetInstances());
    setSites(getSites());
  }, []);

  function refresh() {
    setTypes(getAssetTypes());
    setInstances(getAssetInstances());
    setSites(getSites());
  }

  function formatFrequency(months: number): string {
    return `${months}M`;
  }

  const filtered = types.filter((t) => {
    const q = search.toLowerCase();
    const matchSearch = !q || t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q);
    return matchSearch;
  });

  const grouped = { all: filtered } as Record<string, AssetType[]>;

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground">Asset Library</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} of {types.length} asset type definitions</p>
        </div>
        {isAdmin && (
          <Button size="sm" className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white" onClick={() => setAddOpen(true)}>
            <Plus className="w-3.5 h-3.5 mr-1.5" /> Add Asset Type
          </Button>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input placeholder="Search types or codes..." className="pl-8 h-9 text-sm" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      {/* Simple table view */}
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50">
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5">Name / Code</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 hidden sm:table-cell">Frequency</th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-2.5 hidden lg:table-cell">Instances</th>
                <th className="px-4 py-2.5 w-10" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((t, i) => {
                const instanceCount = instances.filter((ai) => ai.assetTypeId === t.id).length;
                return (
                  <tr key={t.id} className={`${i < filtered.length - 1 ? "border-b border-border/30" : ""} hover:bg-muted/30 cursor-pointer transition-colors`} onClick={() => setSelectedType(t)}>
                    <td className="px-4 py-2.5">
                      <div>
                        <p className="font-medium">{t.name}</p>
                        <p className="text-[10px] text-muted-foreground font-mono">{t.code}</p>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden sm:table-cell">
                      <div className="flex items-center gap-1.5 text-sm">
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-mono font-semibold text-xs">{formatFrequency(t.testingIntervalMonths)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 hidden lg:table-cell">
                      <Badge variant="outline" className="bg-muted/50">{instanceCount}</Badge>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal className="w-4 h-4" /></button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditType(t)}><Pencil className="w-3 h-3 mr-2" />Edit</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onClick={() => setDeleteId(t.id)}><Trash2 className="w-3 h-3 mr-2" />Delete</DropdownMenuItem>
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

      {filtered.length === 0 && (
        <div className="flex flex-col items-center gap-3 py-12 text-muted-foreground">
          <Layers className="w-10 h-10 opacity-30" />
          <p className="text-sm">No asset types found.</p>
        </div>
      )}

      {/* Detail */}
      <Dialog open={!!selectedType} onOpenChange={() => setSelectedType(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedType?.name}</DialogTitle>
            <DialogDescription>{selectedType?.description}</DialogDescription>
          </DialogHeader>
          {selectedType && (() => {
            const typeInstances = instances.filter((ai) => ai.assetTypeId === selectedType.id);
            return (
              <div className="flex flex-col gap-4 text-sm">
                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: "Code", value: selectedType.code },
                    { label: "Frequency", value: `Every ${formatFrequency(selectedType.testingIntervalMonths)}` },
                  ].map(({ label, value }) => (
                    <div key={label} className="flex flex-col gap-0.5">
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
                      <p className="font-medium">{value}</p>
                    </div>
                  ))}
                </div>

                {/* Deployed instances */}
                <div className="border-t border-border/50 pt-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5" />
                    Deployed Instances ({typeInstances.length})
                  </p>
                  {typeInstances.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No instances deployed yet.</p>
                  ) : (
                    <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto">
                      {typeInstances.map((ai) => {
                        const site = sites.find((s) => s.id === ai.siteId);
                        const result = ai.lastTestResult;
                        return (
                          <div
                            key={ai.id}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 bg-muted/20"
                          >
                            <div className="flex-1 min-w-0">
                              <p className="font-mono text-xs font-semibold truncate">
                                {site?.name}
                              </p>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground mt-0.5">
                                <MapPin className="w-2.5 h-2.5 shrink-0" />
                                <span className="truncate">{ai.location}</span>
                                {site && (
                                  <span className="ml-1 font-medium">
                                    · {ai.serialNumber}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Badge
                              variant="outline"
                              className={
                                result === "pass"
                                  ? "border-green-200 text-green-700 bg-green-50 text-[10px]"
                                  : result === "fail"
                                    ? "border-red-200 text-red-700 bg-red-50 text-[10px]"
                                    : "border-amber-200 text-amber-700 bg-amber-50 text-[10px]"
                              }
                            >
                              {result === "pass"
                                ? "Pass"
                                : result === "fail"
                                  ? "Fail"
                                  : "No Test"}
                            </Badge>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            );
          })()}
          <DialogFooter><Button variant="outline" onClick={() => setSelectedType(null)}>Close</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AssetTypeFormDialog open={addOpen} onOpenChange={setAddOpen} onSave={(data) => { saveAssetType({ ...data, id: generateId("at"), createdAt: new Date().toISOString() }); refresh(); setAddOpen(false); }} />
      {editType && <AssetTypeFormDialog open={!!editType} onOpenChange={(o) => !o && setEditType(null)} initialData={editType} onSave={(data) => { saveAssetType({ ...editType, ...data }); refresh(); setEditType(null); }} />}

      <Dialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Asset Type</DialogTitle><DialogDescription>This action cannot be undone and will remove the asset type from the system.</DialogDescription></DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => { if (deleteId) { deleteAssetType(deleteId); refresh(); setDeleteId(null); } }}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

type ATFormData = Omit<AssetType, "id" | "createdAt">;

function AssetTypeFormDialog({ open, onOpenChange, initialData, onSave }: { open: boolean; onOpenChange: (o: boolean) => void; initialData?: Partial<ATFormData>; onSave: (data: ATFormData) => void }) {
  const [form, setForm] = useState<ATFormData>({
    name: initialData?.name ?? "", 
    code: initialData?.code ?? "", 
    description: initialData?.description ?? "", 
    testingIntervalMonths: initialData?.testingIntervalMonths ?? 12,
  });
  function set<K extends keyof ATFormData>(k: K, v: ATFormData[K]) { setForm((p) => ({ ...p, [k]: v })); }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initialData?.name ? "Edit Asset Type" : "Add Asset Type"}</DialogTitle>
          <DialogDescription>{initialData?.name ? "Update the asset type details below." : "Create a new asset type by filling in the form below."}</DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 flex flex-col gap-1.5"><Label>Name *</Label><Input value={form.name} onChange={(e) => set("name", e.target.value)} /></div>
          <div className="flex flex-col gap-1.5"><Label>Code *</Label><Input value={form.code} onChange={(e) => set("code", e.target.value)} placeholder="e.g. FE-PORT" className="font-mono" /></div>
          <div className="col-span-2 flex flex-col gap-1.5"><Label>Description</Label><Input value={form.description} onChange={(e) => set("description", e.target.value)} /></div>
          <div className="col-span-2 flex flex-col gap-1.5"><Label>Frequency (months)</Label><Input type="number" min={1} value={form.testingIntervalMonths} onChange={(e) => set("testingIntervalMonths", parseInt(e.target.value) || 12)} /></div>
        </div>
        <DialogFooter className="mt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white" disabled={!form.name || !form.code} onClick={() => onSave(form)}>{initialData?.name ? "Save Changes" : "Add Asset Type"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
