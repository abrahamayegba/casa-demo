"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/contexts/auth-context";
import { getNotifications } from "@/lib/store";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  Building2,
  BarChart3,
  Bell,
  Settings,
  Users,
  ChevronRight,
  LogOut,
  Layers,
  Package,
  ClipboardList,
  ExternalLink,
  Zap,
  ChevronDown,
  ShieldCheck,
  CalendarClock,
  CheckSquare,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  adminOnly?: boolean;
}

const TOP_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Sites", href: "/sites", icon: Building2 },
];

const ASSET_SUB_NAV: NavItem[] = [
  { label: "Library", href: "/asset-types", icon: Layers },
  { label: "Live", href: "/assets", icon: Package },
  { label: "Tests", href: "/tests", icon: ClipboardList },
];

const JOBS_SUB_NAV: NavItem[] = [
  { label: "Reactive", href: "/reactive-jobs", icon: Zap },
  { label: "Planned", href: "/planned-jobs", icon: CalendarClock },
  { label: "Works Completed", href: "/works-completed", icon: CheckSquare },
];

const BOTTOM_NAV: NavItem[] = [
  { label: "Reports", href: "/reports", icon: BarChart3 },
  { label: "Notifications", href: "/notifications", icon: Bell },
];

const SETTINGS_ITEMS: NavItem[] = [
  { label: "Settings", href: "/settings", icon: Settings },
  { label: "Users", href: "/users", icon: Users, adminOnly: true },
];

function NavLink({
  item,
  currentPath,
  unreadCount,
  indent = false,
}: {
  item: NavItem;
  currentPath: string;
  unreadCount?: number;
  indent?: boolean;
}) {
  const isActive =
    currentPath === item.href || currentPath.startsWith(item.href + "/");
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 group",
        indent && "ml-3 pl-4 border-l-2 border-border",
        isActive
          ? "bg-[var(--brand-purple)] text-white shadow-sm"
          : "text-muted-foreground hover:bg-secondary hover:text-foreground",
      )}
    >
      <Icon
        className={cn(
          "w-4 h-4 shrink-0",
          isActive ? "text-white" : "text-muted-foreground group-hover:text-foreground",
        )}
      />
      <span className="flex-1 truncate">{item.label}</span>
      {unreadCount && unreadCount > 0 ? (
        <Badge className="bg-[var(--brand-gold)] text-white border-0 text-[10px] px-1.5 py-0 min-w-[18px] h-[18px] flex items-center justify-center">
          {unreadCount > 99 ? "99+" : unreadCount}
        </Badge>
      ) : null}
      {isActive && !indent && (
        <ChevronRight className="w-3 h-3 text-white/70" />
      )}
    </Link>
  );
}

interface AppSidebarProps {
  currentPath: string;
}

export function AppSidebar({ currentPath }: AppSidebarProps) {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [unreadCount, setUnreadCount] = useState(0);
  const [assetsOpen, setAssetsOpen] = useState(
    currentPath.startsWith("/asset-types") ||
    currentPath.startsWith("/assets") ||
    currentPath.startsWith("/tests")
  );
  const [jobsOpen, setJobsOpen] = useState(
    currentPath.startsWith("/reactive-jobs") ||
    currentPath.startsWith("/planned-jobs") ||
    currentPath.startsWith("/works-completed")
  );

  useEffect(() => {
    const notifications = getNotifications();
    setUnreadCount(notifications.filter((n) => !n.read).length);
  }, [currentPath]);

  // Auto-expand when navigating to an asset sub-route
  useEffect(() => {
    if (
      currentPath.startsWith("/asset-types") ||
      currentPath.startsWith("/assets") ||
      currentPath.startsWith("/tests")
    ) {
      setAssetsOpen(true);
    }
  }, [currentPath]);

  // Auto-expand when navigating to a jobs sub-route
  useEffect(() => {
    if (
      currentPath.startsWith("/reactive-jobs") ||
      currentPath.startsWith("/planned-jobs") ||
      currentPath.startsWith("/works-completed")
    ) {
      setJobsOpen(true);
    }
  }, [currentPath]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const initials =
    user?.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2) ?? "?";

  const visibleSettingsItems = SETTINGS_ITEMS.filter(
    (item) => !item.adminOnly || user?.role === "admin",
  );

  const isAssetActive =
    currentPath.startsWith("/asset-types") ||
    currentPath.startsWith("/assets") ||
    currentPath.startsWith("/tests");

  const isJobsActive =
    currentPath.startsWith("/reactive-jobs") ||
    currentPath.startsWith("/planned-jobs") ||
    currentPath.startsWith("/works-completed");

  return (
    <TooltipProvider delayDuration={300}>
      <aside className="w-60 shrink-0 flex flex-col h-full bg-white border-r border-border shadow-sm">
        {/* Logo — white background so the SVG's own navy/yellow/white renders correctly */}
        <div className="flex items-center justify-center px-4 py-4 bg-white border-b border-border">
          <Image
            src="/casa-moda-logo.svg"
            alt="Casa Moda"
            width={220}
            height={60}
            className="h-10 w-auto"
            priority
          />
        </div>

        {/* Main Nav */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 flex flex-col gap-1">
          {TOP_NAV.map((item) => (
            <NavLink key={item.href} item={item} currentPath={currentPath} />
          ))}

          {/* Assets group */}
          <button
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 w-full",
              isAssetActive
                ? "bg-[var(--brand-purple)] text-white shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            onClick={() => setAssetsOpen((o) => !o)}
          >
            <Package
              className={cn(
                "w-4 h-4 shrink-0",
                isAssetActive ? "text-white" : "text-muted-foreground",
              )}
            />
            <span className="flex-1 text-left truncate">Assets</span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-200",
                isAssetActive ? "text-white/70" : "text-muted-foreground",
                assetsOpen && "rotate-180",
              )}
            />
          </button>

          {assetsOpen && (
            <div className="flex flex-col gap-0.5 mt-0.5">
              {ASSET_SUB_NAV.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  currentPath={currentPath}
                  indent
                />
              ))}
            </div>
          )}

          {/* Jobs group */}
          <button
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 w-full",
              isJobsActive
                ? "bg-[var(--brand-purple)] text-white shadow-sm"
                : "text-muted-foreground hover:bg-secondary hover:text-foreground",
            )}
            onClick={() => setJobsOpen((o) => !o)}
          >
            <Wrench
              className={cn(
                "w-4 h-4 shrink-0",
                isJobsActive ? "text-white" : "text-muted-foreground",
              )}
            />
            <span className="flex-1 text-left truncate">Jobs</span>
            <ChevronDown
              className={cn(
                "w-3.5 h-3.5 transition-transform duration-200",
                isJobsActive ? "text-white/70" : "text-muted-foreground",
                jobsOpen && "rotate-180",
              )}
            />
          </button>

          {jobsOpen && (
            <div className="flex flex-col gap-0.5 mt-0.5">
              {JOBS_SUB_NAV.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  currentPath={currentPath}
                  indent
                />
              ))}
            </div>
          )}

          {BOTTOM_NAV.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              currentPath={currentPath}
              unreadCount={
                item.href === "/notifications" ? unreadCount : undefined
              }
            />
          ))}

          <div className="my-3 border-t border-border" />

          {visibleSettingsItems.map((item) => (
            <NavLink key={item.href} item={item} currentPath={currentPath} />
          ))}

          {/* Metabase BI Link */}
          <a
            href="https://bi.ignite-consultancy.co.uk/public/question/609e6b6c-43c9-4d3c-bb5f-642e5a553862"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-muted-foreground hover:bg-secondary hover:text-foreground transition-all duration-150 group mt-1"
          >
            <BarChart3 className="w-4 h-4 shrink-0 text-muted-foreground group-hover:text-foreground" />
            <span className="flex-1 truncate">BI Reporting</span>
            <ExternalLink className="w-3 h-3 text-muted-foreground/60 group-hover:text-muted-foreground" />
          </a>
        </nav>

        {/* User Footer */}
        <div className="border-t border-border p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-2.5 px-2 py-2 rounded-lg hover:bg-secondary transition-colors group">
                <Avatar className="w-7 h-7 shrink-0">
                  <AvatarFallback className="bg-[var(--brand-purple)] text-white text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-medium text-foreground truncate">
                    {user?.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate capitalize">
                    {user?.role}
                  </p>
                </div>
                <ChevronRight className="w-3 h-3 text-muted-foreground group-hover:text-foreground transition-colors" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="top" className="w-52">
              <DropdownMenuItem asChild>
                <Link href="/settings" className="cursor-pointer">
                  <Settings className="w-4 h-4 mr-2" /> Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-destructive focus:text-destructive cursor-pointer"
              >
                <LogOut className="w-4 h-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>
    </TooltipProvider>
  );
}
