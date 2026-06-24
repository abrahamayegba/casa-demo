"use client";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useAuth } from "@/contexts/auth-context";
import { getNotifications } from "@/lib/store";
import { useEffect, useState } from "react";

const BREADCRUMB_MAP: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/sites": "Sites",
  "/asset-types": "Asset Library",
  "/assets": "Live Assets",
  "/tests": "Asset Tests",
  "/reactive-jobs": "Reactive Jobs",
  "/reports": "Reports",
  "/notifications": "Notifications",
  "/settings": "Settings",
  "/users": "User Management",
  "/permits": "Permits To Work",
};

export function AppHeader() {
  const pathname = usePathname();
  const { user } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const notifications = getNotifications();
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [pathname]);

  const pageTitle = BREADCRUMB_MAP[pathname] ?? "Portal";

  return (
    <header className="h-14 bg-background border-b border-border flex items-center justify-between px-6 shrink-0">
      <div className="flex items-center gap-2">
        <h1 className="text-sm font-semibold text-foreground">{pageTitle}</h1>
      </div>

      <div className="flex items-center gap-3">
        <Link
          href="/notifications"
          className="relative p-2 rounded-lg hover:bg-muted transition-colors"
          aria-label="Notifications"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
          )}
        </Link>
        <div className="h-6 w-px bg-border" />
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-[var(--brand-purple)] flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">
              {user?.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2)}
            </span>
          </div>
          <div className="hidden sm:block">
            <p className="text-xs font-medium text-foreground leading-tight">
              {user?.name}
            </p>
            <p className="text-[10px] text-muted-foreground capitalize leading-tight">
              {user?.role}
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}
