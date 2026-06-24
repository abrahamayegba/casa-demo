"use client";

import { useEffect, useState } from "react";
import {
  getSites,
  getAssetInstances,
  getAssetTests,
  getNotifications,
  getReactiveJobs,
  getAllSiteComplianceStatuses,
} from "@/lib/store";
import type {
  Site,
  AssetInstance,
  AssetTest,
  Notification,
  ReactiveJob,
  SiteComplianceStatus,
} from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Building2,
  Package,
  XCircle,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  ChevronRight,
  Zap,
  HelpCircle,
  ShieldCheck,
  ShieldAlert,
  ShieldX,
} from "lucide-react";
import Link from "next/link";
import {
  formatDistanceToNow,
  isPast,
  isWithinInterval,
  addDays,
} from "date-fns";
import { useAuth } from "@/contexts/auth-context";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
  LabelList,
} from "recharts";

const GREEN = "#16a34a";
const RED = "#dc2626";
const AMBER = "#d97706";

export default function DashboardPage() {
  const { user } = useAuth();
  const [sites, setSites] = useState<Site[]>([]);
  const [instances, setInstances] = useState<AssetInstance[]>([]);
  const [tests, setTests] = useState<AssetTest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [reactiveJobs, setReactiveJobs] = useState<ReactiveJob[]>([]);
  const [complianceStatuses, setComplianceStatuses] = useState<SiteComplianceStatus[]>([]);

  useEffect(() => {
    setSites(getSites());
    setInstances(getAssetInstances());
    setTests(getAssetTests());
    setNotifications(getNotifications());
    setReactiveJobs(getReactiveJobs());
    setComplianceStatuses(getAllSiteComplianceStatuses());
  }, []);

  const activeSites = sites.filter((s) => s.status === "active").length;
  const totalAssets = instances.length;
  const passedTests = tests.filter((t) => t.result === "pass").length;
  const failedTests = tests.filter((t) => t.result === "fail").length;

  // Assets with no test at all or overdue for testing
  const noTestAssets = instances.filter(
    (i) =>
      !i.lastTestResult ||
      i.lastTestResult === "pending" ||
      (i.nextTestDue && isPast(new Date(i.nextTestDue))),
  ).length;

  const overdueAssets = instances.filter(
    (i) =>
      i.nextTestDue &&
      isPast(new Date(i.nextTestDue)) &&
      i.lastTestResult !== "pending",
  ).length;

  const dueSoon = instances.filter((i) => {
    if (!i.nextTestDue) return false;
    const due = new Date(i.nextTestDue);
    return isWithinInterval(due, {
      start: new Date(),
      end: addDays(new Date(), 30),
    });
  }).length;

  const unreadNotifications = notifications.filter((n) => !n.read).length;
  const openJobs = reactiveJobs.filter((j) => j.status === "open").length;
  const portalJobs = reactiveJobs.filter((j) => j.source === "portal").length;

  // Property compliance summary
  const compliantSites = complianceStatuses.filter((s) => s.level === "compliant").length;
  const warningSites = complianceStatuses.filter((s) => s.level === "warning").length;
  const nonCompliantSites = complianceStatuses.filter((s) => s.level === "non-compliant").length;
  const nonCompliantList = complianceStatuses
    .filter((s) => s.level === "non-compliant" || s.level === "warning")
    .sort((a, b) => {
      if (a.level === "non-compliant" && b.level !== "non-compliant") return -1;
      if (b.level === "non-compliant" && a.level !== "non-compliant") return 1;
      return b.failingAssets - a.failingAssets;
    })
    .slice(0, 5);

  // Combo bar chart: pass / fail / no-test per site — top 12 by total assets, sorted by fail count desc
  const siteChartData = sites
    .filter((s) => s.status === "active")
    .map((site) => {
      const siteInstances = instances.filter((i) => i.siteId === site.id);
      const pass = siteInstances.filter(
        (i) => i.lastTestResult === "pass",
      ).length;
      const fail = siteInstances.filter(
        (i) => i.lastTestResult === "fail",
      ).length;
      const noTest = siteInstances.filter(
        (i) =>
          !i.lastTestResult ||
          i.lastTestResult === "pending" ||
          (i.nextTestDue && isPast(new Date(i.nextTestDue))),
      ).length;
      const shortName = site.name
        .replace(
          / (Supported Living|Care Home|Day Centre|Resource Centre|Residential|Hub|Crown House)$/i,
          "",
        )
        .slice(0, 18);
      return { site: shortName, pass, fail, noTest, total: pass + fail + noTest };
    })
    .filter((d) => d.total > 0)
    .sort((a, b) => b.fail - a.fail || b.total - a.total)
    .slice(0, 12);

  // Pie data — pass vs fail vs no test
  const pieData = [
    { name: "Pass", value: passedTests },
    { name: "Fail", value: failedTests },
    { name: "No Test", value: noTestAssets },
  ];

  // Recent notifications
  const recentNotifications = notifications.slice(0, 4);

  // Assets needing attention
  const assetsNeedingAttention = instances
    .filter(
      (i) =>
        i.lastTestResult === "fail" ||
        (i.nextTestDue && isPast(new Date(i.nextTestDue))),
    )
    .slice(0, 5);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl font-bold text-foreground text-balance">
          Good {getTimeOfDay()}, {user?.name.split(" ")[0]}
        </h2>
        <p className="text-muted-foreground text-sm mt-1">
          Here&apos;s an overview of the Casa Moda asset compliance
          status.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <KpiCard
          title="Active Sites"
          value={activeSites}
          icon={Building2}
          color="purple"
          href="/sites"
          sub={`${sites.length} total`}
        />
        <KpiCard
          title="Managed Assets"
          value={totalAssets}
          icon={Package}
          color="purple"
          href="/assets"
          sub="across all sites"
        />
        <KpiCard
          title="Assets - Passed"
          value={passedTests}
          icon={CheckCircle2}
          color="green"
          href="/tests"
          sub={`${tests.length} total tests`}
        />
        <KpiCard
          title="Assets - Failed"
          value={failedTests}
          icon={XCircle}
          color="red"
          href="/tests"
          sub="require action"
        />
        <KpiCard
          title="Assets — No Tests"
          value={noTestAssets}
          icon={HelpCircle}
          color="amber"
          href="/assets"
          sub="no test on record"
        />
      </div>

      {/* Status Alerts */}
      {(overdueAssets > 0 || dueSoon > 0) && (
        <div className="flex flex-col gap-2">
          {overdueAssets > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-red-50 border border-red-200">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <p className="text-sm text-red-800 font-medium">
                {overdueAssets} asset{overdueAssets > 1 ? "s are" : " is"}{" "}
                overdue for testing.
              </p>
              <Link
                href="/assets"
                className="ml-auto text-xs text-red-700 hover:underline flex items-center gap-1"
              >
                View <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
          {dueSoon > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-amber-50 border border-amber-200">
              <Clock className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="text-sm text-amber-800 font-medium">
                {dueSoon} asset{dueSoon > 1 ? "s" : ""} due for testing within
                the next 30 days.
              </p>
              <Link
                href="/assets"
                className="ml-auto text-xs text-amber-700 hover:underline flex items-center gap-1"
              >
                View <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* Charts + Attention */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Combo bar chart: tests by site — top 12 sorted by failures */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center justify-between">
              Asset Test Status by Site
              <span className="text-[10px] font-normal text-muted-foreground">
                Top {siteChartData.length} sites by issue count
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="pr-2">
            <div
              className="overflow-y-auto"
              style={{ maxHeight: 320 }}
            >
              <div style={{ height: siteChartData.length * 36 + 40, minHeight: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={siteChartData}
                    margin={{ top: 4, right: 40, left: 0, bottom: 4 }}
                    layout="vertical"
                  >
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="#f0f0f0"
                      horizontal={false}
                    />
                    <XAxis
                      type="number"
                      tick={{ fontSize: 10 }}
                      allowDecimals={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="site"
                      tick={{ fontSize: 10 }}
                      width={112}
                    />
                    <Tooltip
                      contentStyle={{ fontSize: 11 }}
                      cursor={{ fill: "#f5f5f5" }}
                    />
                    <Legend
                      iconSize={9}
                      iconType="circle"
                      wrapperStyle={{ fontSize: 10, paddingTop: 4 }}
                    />
                    <Bar dataKey="pass" stackId="a" fill={GREEN} name="Pass" radius={[0, 0, 0, 0]} />
                    <Bar dataKey="fail" stackId="a" fill={RED} name="Fail" />
                    <Bar dataKey="noTest" stackId="a" fill={AMBER} name="No Test" radius={[0, 3, 3, 0]}>
                      <LabelList
                        dataKey="total"
                        position="right"
                        style={{ fontSize: 9, fill: "#888" }}
                      />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Pie chart with inline % labels */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Overall Pass / Fail / No Test
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="46%"
                  innerRadius={48}
                  outerRadius={78}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ cx, cy, midAngle, innerRadius, outerRadius, percent, name }) => {
                    if (percent < 0.04) return null;
                    const RADIAN = Math.PI / 180;
                    const radius = innerRadius + (outerRadius - innerRadius) * 1.45;
                    const x = cx + radius * Math.cos(-midAngle * RADIAN);
                    const y = cy + radius * Math.sin(-midAngle * RADIAN);
                    return (
                      <text
                        x={x}
                        y={y}
                        fill="#555"
                        textAnchor={x > cx ? "start" : "end"}
                        dominantBaseline="central"
                        style={{ fontSize: 11, fontWeight: 600 }}
                      >
                        {`${(percent * 100).toFixed(0)}%`}
                      </text>
                    );
                  }}
                  labelLine={false}
                >
                  <Cell fill={GREEN} />
                  <Cell fill={RED} />
                  <Cell fill={AMBER} />
                </Pie>
                <Tooltip formatter={(value: number) => [`${value}`, ""]} />
                <Legend iconSize={10} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Reactive jobs strip */}
      {openJobs > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Zap className="w-4 h-4 text-[var(--brand-purple)]" />
              Open Reactive Jobs
              {portalJobs > 0 && (
                <span className="text-xs font-normal text-muted-foreground">
                  · {portalJobs} submitted via portal
                </span>
              )}
            </CardTitle>
            <Link href="/reactive-jobs">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-[var(--brand-purple)]"
              >
                Manage <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {reactiveJobs
              .filter((j) => j.status === "open")
              .slice(0, 4)
              .map((job) => {
                const site = sites.find((s) => s.id === job.siteId);
                const priorityColors: Record<string, string> = {
                  urgent: "border-red-200 text-red-700 bg-red-50",
                  high: "border-orange-200 text-orange-700 bg-orange-50",
                  medium: "border-yellow-200 text-yellow-700 bg-yellow-50",
                  low: "border-blue-200 text-blue-700 bg-blue-50",
                };
                return (
                  <Link href="/reactive-jobs" key={job.id}>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors">
                      <Zap className="w-4 h-4 text-[var(--brand-purple)] shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {job.title}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {site?.name}
                        </p>
                      </div>
                      {job.source === "portal" && (
                        <span className="text-[10px] text-[var(--brand-purple)] bg-[var(--brand-purple)]/10 px-1.5 py-0.5 rounded font-medium shrink-0">
                          Portal
                        </span>
                      )}
                      <span
                        className={`text-[10px] border px-1.5 py-0.5 rounded font-medium shrink-0 ${priorityColors[job.priority]}`}
                      >
                        {job.priority.charAt(0).toUpperCase() +
                          job.priority.slice(1)}
                      </span>
                    </div>
                  </Link>
                );
              })}
          </CardContent>
        </Card>
      )}

      {/* Property Compliance Overview */}
      <Card>
        <CardHeader className="pb-2 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[var(--brand-purple)]" />
            Property Compliance Overview
            {nonCompliantSites > 0 && (
              <Badge className="bg-red-600 text-white border-0 text-[10px] px-1.5">
                {nonCompliantSites} non-compliant
              </Badge>
            )}
            {nonCompliantSites === 0 && warningSites > 0 && (
              <Badge className="bg-amber-500 text-white border-0 text-[10px] px-1.5">
                {warningSites} warning
              </Badge>
            )}
          </CardTitle>
          <Link href="/sites">
            <Button variant="ghost" size="sm" className="text-xs h-7 px-2 text-[var(--brand-purple)]">
              All sites <ChevronRight className="w-3 h-3 ml-1" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {/* Summary strip */}
          <div className="grid grid-cols-3 gap-2">
            <div className="flex flex-col items-center gap-0.5 rounded-lg border border-green-200 bg-green-50 py-2 px-3">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              <span className="font-bold text-lg text-green-700">{compliantSites}</span>
              <span className="text-[10px] text-green-600">Compliant</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 rounded-lg border border-amber-200 bg-amber-50 py-2 px-3">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              <span className="font-bold text-lg text-amber-700">{warningSites}</span>
              <span className="text-[10px] text-amber-600">Warning</span>
            </div>
            <div className="flex flex-col items-center gap-0.5 rounded-lg border border-red-200 bg-red-50 py-2 px-3">
              <ShieldX className="w-4 h-4 text-red-600" />
              <span className="font-bold text-lg text-red-700">{nonCompliantSites}</span>
              <span className="text-[10px] text-red-600">Non-Compliant</span>
            </div>
          </div>
          {/* List of sites needing attention */}
          {nonCompliantList.length === 0 ? (
            <div className="flex items-center gap-2 py-3 px-3 rounded-lg bg-green-50/50 border border-green-100">
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
              <p className="text-xs font-medium text-green-800">All properties are fully compliant.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Properties Needing Attention</p>
              {nonCompliantList.map((cs) => {
                const site = sites.find((s) => s.id === cs.siteId);
                if (!site) return null;
                const isNonCompliant = cs.level === "non-compliant";
                return (
                  <Link href="/sites" key={cs.siteId}>
                    <div className={`flex items-center gap-3 px-3 py-2 rounded-lg border transition-colors hover:opacity-80 ${isNonCompliant ? "border-red-200 bg-red-50/40" : "border-amber-200 bg-amber-50/40"}`}>
                      {isNonCompliant
                        ? <ShieldX className="w-4 h-4 text-red-500 shrink-0" />
                        : <ShieldAlert className="w-4 h-4 text-amber-500 shrink-0" />
                      }
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate text-foreground">{site.name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {isNonCompliant
                            ? `${cs.failingAssets} asset test${cs.failingAssets !== 1 ? "s" : ""} failed`
                            : `${cs.overdueAssets > 0 ? `${cs.overdueAssets} overdue` : ""}${cs.overdueAssets > 0 && cs.pendingAssets > 0 ? ", " : ""}${cs.pendingAssets > 0 ? `${cs.pendingAssets} untested` : ""}`
                          }
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${isNonCompliant ? "border-red-200 text-red-700 bg-red-50" : "border-amber-200 text-amber-700 bg-amber-50"}`}
                      >
                        {isNonCompliant ? "Non-Compliant" : "Warning"}
                      </Badge>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Assets needing attention */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold">
              Assets Needing Attention
            </CardTitle>
            <Link href="/assets">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-[var(--brand-purple)]"
              >
                View all <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {assetsNeedingAttention.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                All assets are up to date.
              </div>
            ) : (
              assetsNeedingAttention.map((asset) => {
                const isOverdue =
                  asset.nextTestDue && isPast(new Date(asset.nextTestDue));
                return (
                  <div
                    key={asset.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/60 bg-muted/20"
                  >
                    {asset.lastTestResult === "fail" ? (
                      <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    ) : (
                      <Clock className="w-4 h-4 text-amber-500 shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">
                        {asset.serialNumber}
                      </p>
                      <p className="text-[10px] text-muted-foreground">
                        {asset.location}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={
                        asset.lastTestResult === "fail"
                          ? "border-red-200 text-red-700 bg-red-50 text-[10px]"
                          : "border-amber-200 text-amber-700 bg-amber-50 text-[10px]"
                      }
                    >
                      {asset.lastTestResult === "fail" ? "Failed" : "Overdue"}
                    </Badge>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>

        {/* Recent notifications */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              Recent Notifications
              {unreadNotifications > 0 && (
                <Badge className="bg-red-500 text-white border-0 text-[10px] px-1.5">
                  {unreadNotifications}
                </Badge>
              )}
            </CardTitle>
            <Link href="/notifications">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-7 px-2 text-[var(--brand-purple)]"
              >
                View all <ChevronRight className="w-3 h-3 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {recentNotifications.map((n) => (
              <div
                key={n.id}
                className={`flex items-start gap-3 px-3 py-2 rounded-lg border ${n.read ? "border-border/40 bg-transparent" : "border-[var(--brand-purple)]/20 bg-accent/30"}`}
              >
                <NotificationIcon type={n.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{n.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {formatDistanceToNow(new Date(n.createdAt), {
                      addSuffix: true,
                    })}
                  </p>
                </div>
                {!n.read && (
                  <div className="w-1.5 h-1.5 rounded-full bg-[var(--brand-purple)] mt-1 shrink-0" />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiCard({
  title,
  value,
  icon: Icon,
  color,
  href,
  sub,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: "purple" | "green" | "red" | "amber";
  href: string;
  sub: string;
}) {
  const colorMap = {
    purple: "bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]",
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
  };

  return (
    <Link href={href}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer">
        <CardContent className="flex flex-col gap-3 pt-5 pb-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">{title}</p>
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${colorMap[color]}`}
            >
              <Icon className="w-4 h-4" />
            </div>
          </div>
          <div>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

function NotificationIcon({ type }: { type: string }) {
  if (type === "test_failed")
    return <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />;
  if (type === "test_passed")
    return <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />;
  if (type === "test_overdue")
    return <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />;
  if (type === "supplier_insurance_expired")
    return <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />;
  return (
    <Bell className="w-4 h-4 text-[var(--brand-purple)] shrink-0 mt-0.5" />
  );
}

function getTimeOfDay() {
  const h = new Date().getHours();
  if (h < 12) return "morning";
  if (h < 17) return "afternoon";
  return "evening";
}
