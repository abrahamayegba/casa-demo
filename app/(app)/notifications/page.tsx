"use client";

import { useState, useEffect } from "react";
import {
  getNotifications, markNotificationRead, markAllNotificationsRead,
} from "@/lib/store";
import type { Notification, NotificationType } from "@/lib/types";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Bell, CheckCircle2, XCircle, AlertTriangle, Building2,
  UserPlus, RefreshCw, Clock, CheckCheck, Zap, ShieldAlert,
} from "lucide-react";
import Link from "next/link";

const TYPE_CONFIG: Record<NotificationType, { label: string; icon: React.ElementType; color: string }> = {
  test_failed: { label: "Test Failed", icon: XCircle, color: "text-red-600" },
  test_passed: { label: "Test Passed", icon: CheckCircle2, color: "text-green-600" },
  test_overdue: { label: "Test Overdue", icon: AlertTriangle, color: "text-amber-600" },
  test_due: { label: "Test Due", icon: Clock, color: "text-amber-500" },
  asset_added: { label: "Asset Added", icon: Building2, color: "text-[var(--brand-purple)]" },
  site_synced: { label: "Site Synced", icon: RefreshCw, color: "text-teal-600" },
  user_added: { label: "User Added", icon: UserPlus, color: "text-[var(--brand-purple)]" },
  job_created: { label: "Job Created", icon: Zap, color: "text-[var(--brand-purple)]" },
  job_assigned: { label: "Job Assigned", icon: Zap, color: "text-blue-600" },
  job_completed: { label: "Job Completed", icon: CheckCircle2, color: "text-green-600" },
  supplier_insurance_expired: { label: "Insurance Expired", icon: ShieldAlert, color: "text-red-600" },
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [typeFilter, setTypeFilter] = useState("all");
  const [readFilter, setReadFilter] = useState("all");

  function load() {
    setNotifications(getNotifications());
  }

  useEffect(() => { load(); }, []);

  function handleMarkRead(id: string) {
    markNotificationRead(id);
    load();
  }

  function handleMarkAllRead() {
    markAllNotificationsRead();
    load();
  }

  const filtered = notifications.filter((n) => {
    const matchType = typeFilter === "all" || n.type === typeFilter;
    const matchRead =
      readFilter === "all" ||
      (readFilter === "unread" && !n.read) ||
      (readFilter === "read" && n.read);
    return matchType && matchRead;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
            Notifications
            {unreadCount > 0 && (
              <Badge className="bg-red-500 text-white border-0 text-xs px-2">{unreadCount}</Badge>
            )}
          </h2>
          <p className="text-sm text-muted-foreground">{filtered.length} notification{filtered.length !== 1 ? "s" : ""}</p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={handleMarkAllRead}>
            <CheckCheck className="w-3.5 h-3.5 mr-1.5" /> Mark all as read
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-2">
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="h-9 text-sm w-44"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            {Object.entries(TYPE_CONFIG).map(([k, v]) => (
              <SelectItem key={k} value={k}>{v.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={readFilter} onValueChange={setReadFilter}>
          <SelectTrigger className="h-9 text-sm w-36"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="unread">Unread</SelectItem>
            <SelectItem value="read">Read</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Notification list */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-muted-foreground">
          <Bell className="w-10 h-10 opacity-30" />
          <p className="text-sm">No notifications found.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((n) => {
            const tc = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.asset_added;
            const Icon = tc.icon;
            return (
              <Card
                key={n.id}
                className={cn(
                  "transition-colors cursor-pointer",
                  !n.read ? "border-[var(--brand-purple)]/25 bg-accent/20" : "hover:bg-muted/20"
                )}
                onClick={() => !n.read && handleMarkRead(n.id)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div className={cn("w-9 h-9 rounded-full flex items-center justify-center shrink-0 mt-0.5",
                    !n.read ? "bg-[var(--brand-purple)]/10" : "bg-muted"
                  )}>
                    <Icon className={cn("w-4 h-4", tc.color)} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn("text-sm font-medium", !n.read && "text-foreground")}>{n.title}</p>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">{tc.label}</Badge>
                        {!n.read && <div className="w-2 h-2 rounded-full bg-[var(--brand-purple)] shrink-0" />}
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{n.message}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-[10px] text-muted-foreground/70">
                        {new Date(n.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}{" "}
                        {new Date(n.createdAt).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })} ·{" "}
                        {(() => {
                          const diff = Date.now() - new Date(n.createdAt).getTime();
                          const mins = Math.floor(diff / 60000);
                          if (mins < 1) return "just now";
                          if (mins < 60) return `${mins}m ago`;
                          const hrs = Math.floor(mins / 60);
                          if (hrs < 24) return `${hrs}h ago`;
                          return `${Math.floor(hrs / 24)}d ago`;
                        })()}
                      </p>
                      {n.linkTo && (
                        <Link
                          href={n.linkTo}
                          className="text-[10px] text-[var(--brand-purple)] hover:underline shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          View &rarr;
                        </Link>
                      )}
                    </div>
                  </div>

                  {!n.read && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs shrink-0 text-muted-foreground"
                      onClick={(e) => { e.stopPropagation(); handleMarkRead(n.id); }}
                    >
                      Dismiss
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
