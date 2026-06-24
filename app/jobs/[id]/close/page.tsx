"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { getReactiveJobs, saveReactiveJob, getSites } from "@/lib/store";
import type { ReactiveJob, Site } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  CheckCircle2,
  Zap,
  Building2,
  Paperclip,
  Upload,
  X,
  FileText,
  AlertCircle,
  Clock,
  Loader2,
} from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import Image from "next/image";

const STATUS_CONFIG = {
  open: { label: "Open", dot: "bg-red-500", badge: "bg-red-50 text-red-700 border-red-200" },
  "in-progress": { label: "In Progress", dot: "bg-blue-500", badge: "bg-blue-50 text-blue-700 border-blue-200" },
  completed: { label: "Completed", dot: "bg-green-500", badge: "bg-green-50 text-green-700 border-green-200" },
  cancelled: { label: "Cancelled", dot: "bg-gray-400", badge: "bg-gray-50 text-gray-600 border-gray-200" },
} as const;

export default function CloseJobPage() {
  const params = useParams<{ id: string }>();
  const jobId = params.id;

  const [job, setJob] = useState<ReactiveJob | null>(null);
  const [site, setSite] = useState<Site | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [notes, setNotes] = useState("");
  const [name, setName] = useState("");
  const [attachments, setAttachments] = useState<{ name: string; size: number; dataUrl: string; type: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const jobs = getReactiveJobs();
    const found = jobs.find((j) => j.id === jobId);
    setJob(found ?? null);
    if (found) {
      const sites = getSites();
      setSite(sites.find((s) => s.id === found.siteId) ?? null);
    }
    setLoading(false);
  }, [jobId]);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setAttachments((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            dataUrl: ev.target?.result as string,
            type: file.type,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function removeAttachment(i: number) {
    setAttachments((prev) => prev.filter((_, idx) => idx !== i));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!job) return;
    setSubmitting(true);
    setTimeout(() => {
      const now = new Date().toISOString();
      const updatedJob: ReactiveJob = {
        ...job,
        status: "completed",
        completedAt: now,
        closeNotes: notes,
        updatedAt: now,
        attachments: [
          ...(job.attachments ?? []),
          ...attachments.map((a, i) => ({
            id: `att_close_${job.id}_${i}`,
            name: a.name,
            type: a.type,
            size: a.size,
            dataUrl: a.dataUrl,
            uploadedAt: now,
          })),
        ],
      };
      saveReactiveJob(updatedJob);
      setJob(updatedJob);
      setSubmitting(false);
      setSubmitted(true);
    }, 900);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-600" />
        </div>
        <div className="text-center">
          <h1 className="text-lg font-semibold text-foreground">Job Not Found</h1>
          <p className="text-sm text-muted-foreground mt-1">
            This link may be invalid or the job may have been removed.
          </p>
        </div>
      </div>
    );
  }

  if (submitted || job.status === "completed") {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center gap-4 px-4">
        <div className="bg-white rounded-2xl border border-border shadow-sm p-8 max-w-md w-full flex flex-col items-center gap-4 text-center">
          <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle2 className="w-7 h-7 text-green-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Job Closed</h1>
            <p className="text-sm text-muted-foreground mt-1">
              This job has been marked as complete. Thank you for submitting your documentation.
            </p>
          </div>
          <div className="w-full rounded-xl border border-border bg-muted/30 p-4 text-left">
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground mb-1">Job Reference</p>
            <p className="text-sm font-semibold text-foreground">{job.title}</p>
            {site && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Building2 className="w-3 h-3" /> {site.name}
              </p>
            )}
            {job.completedAt && (
              <p className="text-xs text-muted-foreground mt-1">
                Closed {format(new Date(job.completedAt), "dd MMM yyyy, HH:mm")}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            You can safely close this tab.
          </p>
        </div>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[job.status];

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-lg mx-auto flex flex-col gap-6">
        {/* Header */}
        <div className="flex items-center justify-center py-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-purple)] flex items-center justify-center">
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-foreground text-sm">Casa Moda — Maintenance Portal</span>
          </div>
        </div>

        {/* Job card */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold text-foreground leading-tight">{job.title}</h1>
              {site && (
                <p className="text-sm text-muted-foreground mt-0.5 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                  {site.name}
                </p>
              )}
            </div>
            <span className={cn("inline-flex items-center gap-1.5 text-xs border px-2 py-1 rounded-md shrink-0", statusCfg.badge)}>
              <span className={cn("w-1.5 h-1.5 rounded-full", statusCfg.dot)} />
              {statusCfg.label}
            </span>
          </div>

          <div className="text-sm text-muted-foreground leading-relaxed border-t border-border/50 pt-3">
            {job.description}
          </div>

          <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-muted-foreground border-t border-border/50 pt-3">
            <div className="flex items-center gap-1.5">
              <Clock className="w-3 h-3" />
              Raised {format(new Date(job.createdAt), "dd MMM yyyy")}
            </div>
            {job.assignedTo && (
              <div className="flex items-center gap-1.5">
                <Zap className="w-3 h-3 text-[var(--brand-purple)]" />
                Assigned to {job.assignedTo}
              </div>
            )}
          </div>
        </div>

        {/* Close form */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-6">
          <h2 className="text-base font-semibold text-foreground mb-1">Close This Job</h2>
          <p className="text-sm text-muted-foreground mb-5 leading-relaxed">
            Upload your job card or any supporting documentation, add your completion notes, then submit to mark this job as closed.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {/* Your name */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">
                Your Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Craig Brennan"
                required
              />
            </div>

            {/* Completion notes */}
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Completion Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe the work completed, parts used, any follow-up required..."
                rows={4}
              />
            </div>

            {/* Attachments */}
            <div className="flex flex-col gap-2">
              <Label>Attachments (Job Cards, Photos, Certificates)</Label>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="application/pdf,image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2.5 px-4 py-3 rounded-lg border-2 border-dashed border-border hover:border-[var(--brand-purple)]/40 hover:bg-[var(--brand-purple)]/5 transition-colors text-sm text-muted-foreground"
              >
                <Upload className="w-4 h-4 shrink-0" />
                Click to attach files
              </button>
              {attachments.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {attachments.map((att, i) => (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-lg border border-border/60 bg-muted/30">
                      <FileText className="w-4 h-4 text-[var(--brand-purple)] shrink-0" />
                      <span className="flex-1 min-w-0 text-xs truncate">{att.name}</span>
                      <span className="text-[10px] text-muted-foreground shrink-0">{(att.size / 1024).toFixed(0)} KB</span>
                      <button type="button" onClick={() => removeAttachment(i)} className="p-0.5 hover:text-destructive transition-colors">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Button
              type="submit"
              disabled={!name.trim() || submitting}
              className="w-full bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white mt-1"
            >
              {submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-2" />Mark Job as Complete</>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground pb-4">
          Casa Moda Asset Compliance Portal — For internal use only
        </p>
      </div>
    </div>
  );
}
