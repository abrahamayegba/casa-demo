"use client";

import { useState, useEffect } from "react";
import {
  getAssetTests,
  getAssetInstances,
  getAssetTypes,
  getSites,
} from "@/lib/store";
import type { AssetTest, AssetInstance, AssetType, Site } from "@/lib/types";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts";
import {
  BarChart3,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Clock,
  RefreshCw,
} from "lucide-react";
import {
  format,
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  addDays,
} from "date-fns";

const PURPLE = "#5b2d8e";
const GREEN = "#16a34a";
const RED = "#dc2626";
const AMBER = "#d97706";
const TEAL = "#0d9488";
const SLATE = "#64748b";

export default function ReportsPage() {
  const [tests, setTests] = useState<AssetTest[]>([]);
  const [instances, setInstances] = useState<AssetInstance[]>([]);
  const [types, setTypes] = useState<AssetType[]>([]);
  const [sites, setSites] = useState<Site[]>([]);

  const [siteFilter, setSiteFilter] = useState("all");
  const [periodMonths, setPeriodMonths] = useState(6);

  useEffect(() => {
    setTests(getAssetTests());
    setInstances(getAssetInstances());
    setTypes(getAssetTypes());
    setSites(getSites());
  }, []);

  // ── Derived helpers ──────────────────────────────────────────────────────
  const filteredInstances = instances.filter((i) => {
    const matchSite = siteFilter === "all" || i.siteId === siteFilter;
    return matchSite;
  });

  const instanceIds = new Set(filteredInstances.map((i) => i.id));

  const filteredTests = tests.filter((t) => instanceIds.has(t.assetInstanceId));

  const periodStart = subMonths(new Date(), periodMonths);

  const periodTests = filteredTests.filter(
    (t) => new Date(t.testDate) >= periodStart,
  );

  const passCount = periodTests.filter((t) => t.result === "pass").length;
  const failCount = periodTests.filter((t) => t.result === "fail").length;
  const pendingCount = periodTests.filter((t) => t.result === "pending").length;
  const total = periodTests.length;
  const passRate = total > 0 ? Math.round((passCount / total) * 100) : 0;

  // 1. Pass/Fail by Site (bar chart)
  const passBySite = sites
    .map((s) => {
      const siteInstanceIds = new Set(
        filteredInstances.filter((i) => i.siteId === s.id).map((i) => i.id),
      );
      const siteTests = periodTests.filter((t) =>
        siteInstanceIds.has(t.assetInstanceId),
      );
      return {
        site: s.name.split(" ").slice(0, 2).join(" "),
        pass: siteTests.filter((t) => t.result === "pass").length,
        fail: siteTests.filter((t) => t.result === "fail").length,
        pending: siteTests.filter((t) => t.result === "pending").length,
      };
    })
    .filter((s) => s.pass + s.fail + s.pending > 0);

  // 2. Monthly trend (line chart)
  const monthlyTrend = Array.from({ length: periodMonths }, (_, i) => {
    const d = subMonths(new Date(), periodMonths - 1 - i);
    const monthStart = startOfMonth(d);
    const monthEnd = endOfMonth(d);
    const monthTests = filteredTests.filter((t) =>
      isWithinInterval(new Date(t.testDate), {
        start: monthStart,
        end: monthEnd,
      }),
    );
    return {
      month: format(d, "MMM yy"),
      pass: monthTests.filter((t) => t.result === "pass").length,
      fail: monthTests.filter((t) => t.result === "fail").length,
      total: monthTests.length,
    };
  });

  // 3. Fail rate by category (bar chart)
  // 4. Pass rate gauge per site (radial)
  const passRateGauge = sites
    .map((s) => {
      const siteInstanceIds = new Set(
        filteredInstances.filter((i) => i.siteId === s.id).map((i) => i.id),
      );
      const siteTests = periodTests.filter((t) =>
        siteInstanceIds.has(t.assetInstanceId),
      );
      const p = siteTests.filter((t) => t.result === "pass").length;
      const rate =
        siteTests.length > 0 ? Math.round((p / siteTests.length) * 100) : 0;
      return {
        name: s.name.split(" ").slice(0, 2).join(" "),
        passRate: rate,
        total: siteTests.length,
      };
    })
    .filter((s) => s.total > 0)
    .sort((a, b) => b.passRate - a.passRate);

  // 5. Upcoming tests due (next 60 days)
  const upcoming = filteredInstances
    .filter((i) => {
      if (!i.nextTestDue) return false;
      const due = new Date(i.nextTestDue);
      return isWithinInterval(due, {
        start: new Date(),
        end: addDays(new Date(), 60),
      });
    })
    .slice(0, 8);

  // 6. Top failing asset types
  const failByType = types
    .map((t) => {
      const typeInstanceIds = new Set(
        filteredInstances
          .filter((i) => i.assetTypeId === t.id)
          .map((i) => i.id),
      );
      const typeTests = periodTests.filter((t2) =>
        typeInstanceIds.has(t2.assetInstanceId),
      );
      const fails = typeTests.filter((t2) => t2.result === "fail").length;
      return { name: t.name, code: t.code, fails, total: typeTests.length };
    })
    .filter((t) => t.fails > 0)
    .sort((a, b) => b.fails - a.fails)
    .slice(0, 6);

  const pieData = [
    { name: "Pass", value: passCount, color: GREEN },
    { name: "Fail", value: failCount, color: RED },
    { name: "Pending", value: pendingCount, color: AMBER },
  ].filter((d) => d.value > 0);

  return (
    <div className="flex flex-col gap-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-foreground">
            Reports & Analytics
          </h2>
          <p className="text-sm text-muted-foreground">
            Asset test compliance overview for Casa Moda
          </p>
        </div>
        {/* Metabase BI button */}
        <a
          href="#"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[var(--brand-purple)] text-white text-sm font-medium hover:bg-[var(--brand-purple-dark)] transition-colors shadow-sm shrink-0"
        >
          <BarChart3 className="w-4 h-4" />
          Open in Metabase BI
          <ExternalLink className="w-3.5 h-3.5 opacity-70" />
        </a>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2 items-center">
        {/* Site */}
        <Select value={siteFilter} onValueChange={setSiteFilter}>
          <SelectTrigger className="h-9 text-sm w-full">
            <SelectValue placeholder="All Sites" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sites</SelectItem>
            {sites.map((s) => (
              <SelectItem key={s.id} value={s.id}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Period */}
        <Select
          value={String(periodMonths)}
          onValueChange={(v) => setPeriodMonths(Number(v))}
        >
          <SelectTrigger className="h-9 text-sm w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="3">Last 3 months</SelectItem>
            <SelectItem value="6">Last 6 months</SelectItem>
            <SelectItem value="12">Last 12 months</SelectItem>
            <SelectItem value="24">Last 24 months</SelectItem>
          </SelectContent>
        </Select>

        {/* Reset */}
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setSiteFilter("all");
              setPeriodMonths(6);
            }}
          >
            <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
            Reset
          </Button>
        </div>
      </div>

      {/* KPI Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiTile
          icon={CheckCircle2}
          label="Tests Passed"
          value={passCount}
          color="green"
          sub={`${passRate}% pass rate`}
        />
        <KpiTile
          icon={XCircle}
          label="Tests Failed"
          value={failCount}
          color="red"
          sub={`${total > 0 ? Math.round((failCount / total) * 100) : 0}% fail rate`}
        />
        <KpiTile
          icon={Clock}
          label="Pending"
          value={pendingCount}
          color="amber"
          sub="awaiting result"
        />
        <KpiTile
          icon={BarChart3}
          label="Total Tests"
          value={total}
          color="purple"
          sub={`last ${periodMonths} months`}
        />
      </div>

      {/* Row 1: Pass/Fail by Site + Pie */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Pass / Fail by Site
            </CardTitle>
            <CardDescription className="text-xs">
              Stacked test results per site over selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={passBySite}
                margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="site" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip />
                <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="pass"
                  name="Pass"
                  stackId="a"
                  fill={GREEN}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="fail"
                  name="Fail"
                  stackId="a"
                  fill={RED}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="pending"
                  name="Pending"
                  stackId="a"
                  fill={AMBER}
                  radius={[3, 3, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Overall Result Breakdown
            </CardTitle>
            <CardDescription className="text-xs">
              All tests in selected period
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) =>
                    `${name} ${Math.round(percent * 100)}%`
                  }
                  labelLine={false}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Monthly Trend */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Monthly Test Volume & Trend
          </CardTitle>
          <CardDescription className="text-xs">
            Pass and fail counts per month
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={monthlyTrend}
              margin={{ top: 4, right: 8, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="gPassR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={GREEN} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gFailR" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={RED} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={RED} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="pass"
                name="Pass"
                stroke={GREEN}
                fill="url(#gPassR)"
                strokeWidth={2}
              />
              <Area
                type="monotone"
                dataKey="fail"
                name="Fail"
                stroke={RED}
                fill="url(#gFailR)"
                strokeWidth={2}
              />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Row 3: Site Pass Rate */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">
            Pass Rate by Site
          </CardTitle>
          <CardDescription className="text-xs">
            Ranked from highest to lowest compliance
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5 pt-1">
          {passRateGauge.slice(0, 7).map((s, i) => (
            <div key={`${s.name}-${i}`} className="flex items-center gap-3">
              <span className="text-xs text-muted-foreground w-28 shrink-0 truncate">
                {s.name}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${s.passRate}%`,
                    backgroundColor:
                      s.passRate >= 80 ? GREEN : s.passRate >= 60 ? AMBER : RED,
                  }}
                />
              </div>
              <span className="text-xs font-semibold w-10 text-right shrink-0">
                {s.passRate}%
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0">
                ({s.total})
              </span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Row 4: Top Failing Types + Upcoming Tests */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top failing asset types */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Top Failing Asset Types
            </CardTitle>
            <CardDescription className="text-xs">
              Asset types with most failures in period
            </CardDescription>
          </CardHeader>
          <CardContent>
            {failByType.length === 0 ? (
              <div className="flex items-center gap-2 py-4 text-muted-foreground text-sm">
                <CheckCircle2 className="w-4 h-4 text-green-600" /> No failures
                recorded in this period.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {failByType.map((t, i) => (
                  <div
                    key={t.code}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 bg-muted/20"
                  >
                    <span className="text-xs text-muted-foreground w-4 shrink-0">
                      #{i + 1}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground font-mono">
                        {t.code}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className="border-red-200 text-red-700 bg-red-50 text-[10px] shrink-0"
                    >
                      {t.fails} fail{t.fails > 1 ? "s" : ""}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground shrink-0">
                      {t.total} total
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Upcoming tests */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">
              Upcoming Tests (Next 60 Days)
            </CardTitle>
            <CardDescription className="text-xs">
              Assets due for testing soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                No tests due in next 60 days.
              </p>
            ) : (
              <div className="flex flex-col gap-2">
                {upcoming.map((i) => {
                  const type = types.find((t) => t.id === i.assetTypeId);
                  const site = sites.find((s) => s.id === i.siteId);
                  const daysUntil = Math.ceil(
                    (new Date(i.nextTestDue).getTime() - Date.now()) / 86400000,
                  );
                  return (
                    <div
                      key={i.id}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg border border-border/50 bg-muted/20"
                    >
                      <Clock
                        className={`w-3.5 h-3.5 shrink-0 ${daysUntil <= 14 ? "text-amber-600" : "text-muted-foreground"}`}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">
                          {type?.name}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          {site?.name} · {i.serialNumber}
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`text-[10px] shrink-0 ${daysUntil <= 14 ? "border-amber-200 text-amber-700 bg-amber-50" : "border-border"}`}
                      >
                        {daysUntil}d
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function KpiTile({
  icon: Icon,
  label,
  value,
  color,
  sub,
}: {
  icon: React.ElementType;
  label: string;
  value: number;
  color: "green" | "red" | "amber" | "purple";
  sub: string;
}) {
  const colorMap = {
    green: "bg-green-100 text-green-700",
    red: "bg-red-100 text-red-700",
    amber: "bg-amber-100 text-amber-700",
    purple: "bg-[var(--brand-purple)]/10 text-[var(--brand-purple)]",
  };
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-5 pb-4">
        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-muted-foreground">{label}</p>
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
  );
}
