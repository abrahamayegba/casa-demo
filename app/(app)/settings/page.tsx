"use client";

import { useState, useEffect } from "react";
import { getCurrentUser, saveUser } from "@/lib/store";
import { useAuth } from "@/contexts/auth-context";
import type { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Alert, AlertDescription,
} from "@/components/ui/alert";
import {
  User as UserIcon, Mail, Lock, ShieldCheck, CheckCircle2, AlertCircle,
} from "lucide-react";
import { format } from "date-fns";

export default function SettingsPage() {
  const { user, refresh } = useAuth();
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [pwMsg, setPwMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) { setName(user.name); setEmail(user.email); }
  }, [user]);

  function handleProfileSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setProfileMsg(null);
    setTimeout(() => {
      saveUser({ ...user, name: name.trim(), email: email.trim() });
      refresh();
      setProfileMsg({ type: "success", text: "Profile updated successfully." });
      setSaving(false);
    }, 400);
  }

  function handlePasswordChange(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setPwMsg(null);
    if (currentPw !== user.passwordHash) {
      setPwMsg({ type: "error", text: "Current password is incorrect." });
      return;
    }
    if (newPw.length < 8) {
      setPwMsg({ type: "error", text: "New password must be at least 8 characters." });
      return;
    }
    if (newPw !== confirmPw) {
      setPwMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    saveUser({ ...user, passwordHash: newPw });
    refresh();
    setCurrentPw(""); setNewPw(""); setConfirmPw("");
    setPwMsg({ type: "success", text: "Password changed successfully." });
  }

  if (!user) return null;

  return (
    <div className="flex flex-col gap-6 max-w-2xl mx-auto">
      <div>
        <h2 className="text-xl font-bold text-foreground">Settings</h2>
        <p className="text-sm text-muted-foreground">Manage your account preferences</p>
      </div>

      {/* Profile */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-[var(--brand-purple)]" /> Profile
          </CardTitle>
          <CardDescription>Update your name and email address.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-6 p-3 rounded-lg bg-muted/40 border border-border/50">
            <div className="w-12 h-12 rounded-full bg-[var(--brand-purple)]/15 flex items-center justify-center text-[var(--brand-purple)] font-bold text-lg">
              {user.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)}
            </div>
            <div>
              <p className="font-semibold">{user.name}</p>
              <div className="flex items-center gap-2 mt-0.5">
                <Badge variant="outline" className="text-[10px] capitalize px-1.5 py-0">
                  <ShieldCheck className="w-2.5 h-2.5 mr-1" /> {user.role}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Member since {format(new Date(user.createdAt), "MMM yyyy")}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleProfileSave} className="flex flex-col gap-4">
            {profileMsg && (
              <Alert variant={profileMsg.type === "error" ? "destructive" : "default"} className="py-2">
                {profileMsg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>{profileMsg.text}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
                disabled={saving}
              >
                {saving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Password */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Lock className="w-4 h-4 text-[var(--brand-purple)]" /> Change Password
          </CardTitle>
          <CardDescription>Update your login credentials.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
            {pwMsg && (
              <Alert variant={pwMsg.type === "error" ? "destructive" : "default"} className="py-2">
                {pwMsg.type === "success" ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
                <AlertDescription>{pwMsg.text}</AlertDescription>
              </Alert>
            )}
            <div className="flex flex-col gap-2">
              <Label htmlFor="currentPw">Current Password</Label>
              <Input id="currentPw" type="password" value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} required />
            </div>
            <Separator />
            <div className="flex flex-col gap-2">
              <Label htmlFor="newPw">New Password</Label>
              <Input id="newPw" type="password" value={newPw} onChange={(e) => setNewPw(e.target.value)} required />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="confirmPw">Confirm New Password</Label>
              <Input id="confirmPw" type="password" value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} required />
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                size="sm"
                className="bg-[var(--brand-purple)] hover:bg-[var(--brand-purple-dark)] text-white"
              >
                Change Password
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Account info */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--brand-purple)]" /> Account Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            {[
              { label: "User ID", value: user.id },
              { label: "Role", value: user.role.charAt(0).toUpperCase() + user.role.slice(1) },
              { label: "Account Status", value: user.isActive ? "Active" : "Inactive" },
              { label: "Last Login", value: user.lastLogin ? format(new Date(user.lastLogin), "dd MMM yyyy, HH:mm") : "Never" },
            ].map(({ label, value }) => (
              <div key={label} className="flex flex-col gap-0.5">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</p>
                <p className="font-medium text-sm">{value}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
