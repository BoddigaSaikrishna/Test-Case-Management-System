import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell
} from "recharts";
import { API_URL } from "@/lib/api";
import { useAuth } from "@/hooks/useAuth";
import { AlertTriangle, RefreshCw, TrendingUp, Bug, Users, Play } from "lucide-react";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884d8", "#82ca9d"];

// Safe chart wrappers — never crash on empty data
const SafePieChart = ({ data, label }: { data: any[]; label?: string }) => {
  const nonEmpty = data?.filter(d => (d.value || d.count || 0) > 0) || [];
  if (nonEmpty.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        No data available
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={nonEmpty}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => percent > 0.05 ? `${name} ${(percent * 100).toFixed(0)}%` : ""}
          outerRadius={90}
          dataKey={nonEmpty[0]?.value !== undefined ? "value" : "count"}
        >
          {nonEmpty.map((_: any, index: number) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
};

const SafeBarChart = ({ data, xKey, bars }: { data: any[]; xKey: string; bars: { key: string; color: string; name: string }[] }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-muted-foreground text-sm">
        No data available
      </div>
    );
  }
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip />
        <Legend />
        {bars.map(b => (
          <Bar key={b.key} dataKey={b.key} fill={b.color} name={b.name} radius={[3, 3, 0, 0]} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
};

const StatCard = ({ title, value, color = "" }: { title: string; value: any; color?: string }) => (
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
    </CardHeader>
    <CardContent>
      <div className={`text-2xl font-bold ${color}`}>{value ?? "—"}</div>
    </CardContent>
  </Card>
);

const Reports = () => {
  const { token } = useAuth();
  const [projectId, setProjectId] = useState<string>("all");
  const [projects, setProjects] = useState<any[]>([]);
  const [executionData, setExecutionData] = useState<any>(null);
  const [defectData, setDefectData] = useState<any>(null);
  const [testerData, setTesterData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (token) fetchProjects();
  }, [token]);

  useEffect(() => {
    if (token) fetchReports();
  }, [token, projectId]);

  const fetchProjects = async () => {
    try {
      const res = await fetch(`${API_URL}/reports/projects`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setProjects(data.projects || []);
      }
    } catch (e) {
      console.error("Error fetching projects", e);
    }
  };

  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = projectId !== "all" ? `?project_id=${projectId}` : "";
      const headers = { Authorization: `Bearer ${token}` };

      const [execRes, defectRes, testerRes] = await Promise.all([
        fetch(`${API_URL}/reports/execution${query}`, { headers }),
        fetch(`${API_URL}/reports/defects${query}`, { headers }),
        fetch(`${API_URL}/reports/testers${query}`, { headers }),
      ]);

      const [execData, defData, testData] = await Promise.all([
        execRes.json(),
        defectRes.json(),
        testerRes.json(),
      ]);

      if (!execRes.ok || !defectRes.ok || !testerRes.ok) {
        throw new Error("One or more report endpoints returned an error.");
      }

      setExecutionData(execData);
      setDefectData(defData);
      setTesterData(testData);
    } catch (err: any) {
      console.error("Error fetching reports", err);
      setError(err.message || "Failed to load reports.");
    } finally {
      setLoading(false);
    }
  };

  // ── Derived chart data ───────────────────────────────────────────────
  const statusData = [
    { name: "Pass", value: executionData?.summary?.passCount ?? 0 },
    { name: "Fail", value: executionData?.summary?.failCount ?? 0 },
    { name: "Blocked", value: executionData?.summary?.blockedCount ?? 0 },
    { name: "Skipped", value: executionData?.summary?.skippedCount ?? 0 },
    { name: "Pending", value: executionData?.summary?.pendingCount ?? 0 },
  ];

  const byTypeData = (executionData?.byType || []).map((item: any) => ({
    type: item.type,
    pass: item.pass ?? 0,
    fail: item.fail ?? 0,
  }));

  const severityPieData = (defectData?.bySeverity || []).map((item: any) => ({
    name: item.severity,
    value: item.count ?? 0,
  }));

  const byStatusData = (defectData?.byStatus || []).map((item: any) => ({
    status: item.status,
    count: item.count ?? 0,
  }));

  // ── Render states ────────────────────────────────────────────────────
  if (loading) {
    return (
      <AppLayout title="Reports">
        <div className="flex flex-col items-center justify-center h-64 gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          <p className="text-sm text-muted-foreground">Loading reports...</p>
        </div>
      </AppLayout>
    );
  }

  if (error || !executionData || !defectData || !testerData) {
    return (
      <AppLayout title="Reports">
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <p className="font-medium">{error || "Unable to load report data."}</p>
          </div>
          <Button variant="outline" size="sm" onClick={fetchReports}>
            <RefreshCw className="h-4 w-4 mr-2" /> Retry
          </Button>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Reports">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Analytics & Reports</h2>
            <p className="text-sm text-muted-foreground">System-wide quality metrics</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={fetchReports}>
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Refresh
            </Button>
            <div className="w-[180px]">
              <Select value={projectId} onValueChange={setProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Tabs defaultValue="executions" className="space-y-4">
          <TabsList>
            <TabsTrigger value="executions" className="flex items-center gap-1.5">
              <Play className="h-3.5 w-3.5" /> Test Executions
            </TabsTrigger>
            <TabsTrigger value="defects" className="flex items-center gap-1.5">
              <Bug className="h-3.5 w-3.5" /> Defects
            </TabsTrigger>
            <TabsTrigger value="testers" className="flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5" /> Team Performance
            </TabsTrigger>
          </TabsList>

          {/* ── Executions Tab ── */}
          <TabsContent value="executions" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Total Executions" value={executionData.summary?.totalExecutions} />
              <StatCard title="Pass Rate" value={`${executionData.summary?.passRate ?? 0}%`} color="text-green-600" />
              <StatCard title="Fail Rate" value={`${executionData.summary?.failRate ?? 0}%`} color="text-red-600" />
              <StatCard title="Pending" value={executionData.summary?.pendingCount} color="text-yellow-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Execution Status</CardTitle></CardHeader>
                <CardContent className="h-[280px]">
                  <SafePieChart data={statusData} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Executions by Type</CardTitle></CardHeader>
                <CardContent className="h-[280px]">
                  <SafeBarChart
                    data={byTypeData}
                    xKey="type"
                    bars={[
                      { key: "pass", color: "#82ca9d", name: "Passed" },
                      { key: "fail", color: "#ff8042", name: "Failed" },
                    ]}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Defects Tab ── */}
          <TabsContent value="defects" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Total Defects" value={defectData.summary?.totalDefects} />
              <StatCard title="Open" value={defectData.summary?.openCount} color="text-red-600" />
              <StatCard title="Critical" value={defectData.summary?.criticalCount} color="text-red-800" />
              <StatCard title="Closed" value={defectData.summary?.closedCount} color="text-green-600" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader><CardTitle className="text-sm">Defects by Severity</CardTitle></CardHeader>
                <CardContent className="h-[280px]">
                  <SafePieChart data={severityPieData} />
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-sm">Defects by Status</CardTitle></CardHeader>
                <CardContent className="h-[280px]">
                  <SafeBarChart
                    data={byStatusData}
                    xKey="status"
                    bars={[{ key: "count", color: "#8884d8", name: "Count" }]}
                  />
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* ── Testers Tab ── */}
          <TabsContent value="testers" className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard title="Total Testers" value={testerData.summary?.totalTesters} />
              <StatCard title="Total Executions" value={testerData.summary?.totalExecutions} />
              <StatCard title="Defects Reported" value={testerData.summary?.totalDefectsReported} />
              <StatCard title="Avg per Tester" value={testerData.summary?.avgExecutionsPerTester} />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Team Performance</CardTitle>
                <CardDescription>Execution metrics by team member</CardDescription>
              </CardHeader>
              <CardContent>
                {!testerData.testers || testerData.testers.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8 text-sm">No tester data available yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="font-medium p-2">Tester</th>
                          <th className="font-medium p-2 text-center">Executions</th>
                          <th className="font-medium p-2 text-center">Pass Rate</th>
                          <th className="font-medium p-2 text-center">Defects Filed</th>
                          <th className="font-medium p-2 text-center">Avg Time (ms)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {testerData.testers.map((tester: any) => (
                          <tr key={tester.id} className="border-b hover:bg-muted/50">
                            <td className="p-2 font-medium">{tester.name}</td>
                            <td className="p-2 text-center">{tester.totalExecutions}</td>
                            <td className="p-2 text-center">
                              <span className={tester.passRate >= 90 ? "text-green-600" : tester.passRate < 70 ? "text-red-600" : ""}>
                                {tester.passRate}%
                              </span>
                            </td>
                            <td className="p-2 text-center">{tester.defectsReported}</td>
                            <td className="p-2 text-center">{tester.avgExecutionTime ?? "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
};

export default Reports;
