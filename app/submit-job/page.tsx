"use client";

import { useState, useEffect } from "react";
import { getSites, submitPortalJob, generateId, seedIfNeeded } from "@/lib/store";
import type { Site } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Zap,
  Building2,
  User,
  Phone,
  Mail,
  FileText,
  AlertTriangle,
} from "lucide-react";

type Step = "form" | "success";

export default function SubmitJobPage() {
  const [step, setStep] = useState<Step>("form");
  const [sites, setSites] = useState<Site[]>([]);
  const [submittedRef, setSubmittedRef] = useState("");

  // Form state
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [siteId, setSiteId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");

  useEffect(() => {
    seedIfNeeded();
    const allSites = getSites().filter((s) => s.status === "active");
    setSites(allSites);
  }, []);

  const isValid = contactName.trim() && siteId && title.trim() && description.trim();

  function handleSubmit() {
    if (!isValid) return;
    const id = generateId("job");
    submitPortalJob({
      id,
      siteId,
      title: title.trim(),
      description: description.trim(),
      priority: priority as any,
      status: "open",
      source: "portal",
      createdBy: contactName.trim(),
      createdByUserId: "",
      contactName: contactName.trim(),
      contactPhone: contactPhone.trim() || undefined,
      contactEmail: contactEmail.trim() || undefined,
      notes: undefined,
      attachments: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    // Generate a short human-readable reference number
    setSubmittedRef(`RJ-${id.split("_")[1].slice(-6).toUpperCase()}`);
    setStep("success");
  }

  return (
    <div className="min-h-screen bg-[var(--brand-bg)] flex flex-col">
      {/* Header */}
      <header
        className="w-full py-4 px-6 flex items-center gap-3"
        style={{ background: "var(--brand-purple)" }}
      >
        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" />
        </div>
        <div>
          <p className="text-white font-semibold text-sm leading-none">
            Casa Moda
          </p>
          <p className="text-white/60 text-xs mt-0.5">
            Facilities Maintenance Portal
          </p>
        </div>
      </header>

      <main className="flex-1 flex items-start justify-center px-4 py-10">
        {step === "success" ? (
          <SuccessScreen
            ref_={submittedRef}
            onSubmitAnother={() => {
              setStep("form");
              setContactName("");
              setContactPhone("");
              setContactEmail("");
              setSiteId("");
              setTitle("");
              setDescription("");
              setPriority("medium");
            }}
          />
        ) : (
          <div className="w-full max-w-[600px]">
            {/* Page heading */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-foreground text-balance">
                Report a Maintenance Issue
              </h1>
              <p className="text-muted-foreground text-sm mt-1.5 leading-relaxed">
                Use this form to report a facilities or maintenance issue at
                your site. Our team will review your request and get back to
                you.
              </p>
            </div>

            <div className="bg-card rounded-xl border border-border shadow-sm p-6 flex flex-col gap-5">
              {/* Contact section */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" /> Your Details
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="contactName">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="contactName"
                      placeholder="e.g. Anne Stewart"
                      value={contactName}
                      onChange={(e) => setContactName(e.target.value)}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="contactPhone">Phone Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          id="contactPhone"
                          className="pl-8"
                          placeholder="01234 567 890"
                          value={contactPhone}
                          onChange={(e) => setContactPhone(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="contactEmail">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                        <Input
                          id="contactEmail"
                          type="email"
                          className="pl-8"
                          placeholder="you@casamoda.com"
                          value={contactEmail}
                          onChange={(e) => setContactEmail(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border-t border-border" />

              {/* Site section */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" /> Site Details
                </p>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="site">
                    Site <span className="text-destructive">*</span>
                  </Label>
                  <Select value={siteId} onValueChange={setSiteId}>
                    <SelectTrigger className=" w-full" id="site">
                      <SelectValue placeholder="Select your site..." />
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
              </div>

              <div className="border-t border-border" />

              {/* Issue section */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Issue Details
                </p>
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="title">
                      Issue Title <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="title"
                      placeholder="e.g. Broken window in corridor"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="description">
                      Description <span className="text-destructive">*</span>
                    </Label>
                    <Textarea
                      id="description"
                      placeholder="Please describe the issue in as much detail as possible — location within the building, when it was noticed, any safety concerns..."
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="resize-none"
                    />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="priority">Urgency</Label>
                    <Select value={priority} onValueChange={setPriority}>
                      <SelectTrigger className=" w-full" id="priority">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">
                          Low — not urgent, can wait
                        </SelectItem>
                        <SelectItem value="medium">
                          Medium — needs attention soon
                        </SelectItem>
                        <SelectItem value="high">
                          High — significant issue
                        </SelectItem>
                        <SelectItem value="urgent">
                          Urgent — immediate safety risk
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {priority === "urgent" && (
                <div className="flex items-start gap-3 px-3 py-3 rounded-lg bg-red-50 border border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800">
                    If this is an immediate danger to life, please call{" "}
                    <strong>999</strong> first, then contact your site manager.
                  </p>
                </div>
              )}

              <Button
                className="w-full bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
                disabled={!isValid}
                onClick={handleSubmit}
              >
                Submit Maintenance Request
              </Button>
            </div>

            <p className="text-center text-xs text-muted-foreground mt-4">
              Casa Moda — Estates Portal &nbsp;&middot;&nbsp;
              Managed by{" "}
              <a
                href="https://www.ignite-consultancy.co.uk"
                className="underline hover:text-foreground"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ignite Consultancy
              </a>
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

function SuccessScreen({
  ref_,
  onSubmitAnother,
}: {
  ref_: string;
  onSubmitAnother: () => void;
}) {
  return (
    <div className="w-full max-w-lg text-center flex flex-col items-center gap-5 py-10">
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center"
        style={{ background: "var(--brand-purple)" }}
      >
        <CheckCircle2 className="w-8 h-8 text-white" />
      </div>
      <div>
        <h2 className="text-2xl font-bold text-foreground">Request Submitted</h2>
        <p className="text-muted-foreground text-sm mt-2 leading-relaxed">
          Your maintenance request has been received and will be reviewed by
          our facilities team. You may be contacted for further information.
        </p>
      </div>
      <div className="bg-card rounded-xl border border-border shadow-sm px-8 py-5 flex flex-col items-center gap-1">
        <p className="text-xs text-muted-foreground uppercase tracking-wider">Reference Number</p>
        <p className="text-2xl font-bold tracking-widest text-[var(--brand-purple)]">{ref_}</p>
        <p className="text-xs text-muted-foreground mt-1">Please keep this for your records.</p>
      </div>
      <Button
        variant="outline"
        className="mt-2"
        onClick={onSubmitAnother}
      >
        Submit Another Request
      </Button>
    </div>
  );
}
