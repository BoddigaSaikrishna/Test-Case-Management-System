import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import MetricCard from "@/components/MetricCard";
import StatusBadge from "@/components/StatusBadge";
import { TestTube2, CheckCircle2, XCircle, Bug, Play, Clock, Loader2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const API_URL = "http://localhost:3000/api";

interface ExecutionDataItem {
  name: string;
  value: number;
  color: string;
}

interface WeeklyDataItem {
  day: string;
  executed: number;
  passed: number;
}

interface RecentExecution {
  id: string;
  title: string;
  status: string;
  executor: string;
  date: string;
}

interface DashboardMetrics {
  totalTestCases: number;
  totalExecutions: number;
  passRate: number;
  openDefects: number;
  criticalDefects: number;
  newTestCases: number;
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalTestCases: 0,
    totalExecutions: 0,
    passRate: 0,
    openDefects: 0,
    criticalDefects: 0,
    newTestCases: 0,
  });
  const [executionData, setExecutionData] = useState<ExecutionDataItem[]>([]);
  const [weeklyData, setWeeklyData] = useState<WeeklyDataItem[]>([]);
  const [recentExecutions, setRecentExecutions] = useState<RecentExecution[]>([]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`${API_URL}/dashboard/stats`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const data = await response.json();
          setMetrics(data.metrics);
          setExecutionData(data.executionData);
          setWeeklyData(data.weeklyData);
          setRecentExecutions(data.recentExecutions);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AppLayout title="Dashboard">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout title="Dashboard">
      <div className="space-y-6">
        {/* Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard
            title="Total Test Cases"
            value={metrics.totalTestCases}
            change={`+${metrics.newTestCases} this week`}
            changeType="positive"
            icon={TestTube2}
          />
          <MetricCard
            title="Executed"
            value={metrics.totalExecutions}
            change={metrics.totalTestCases > 0 
              ? `${Math.round((metrics.totalExecutions / metrics.totalTestCases) * 100)}% completion` 
              : "0% completion"}
            changeType="positive"
            icon={Play}
          />
          <MetricCard
            title="Pass Rate"
            value={`${metrics.passRate}%`}
            change="Based on all executions"
            changeType={metrics.passRate >= 70 ? "positive" : "negative"}
            icon={CheckCircle2}
          />
          <MetricCard
            title="Open Defects"
            value={metrics.openDefects}
            change={`${metrics.criticalDefects} critical`}
            changeType={metrics.criticalDefects > 0 ? "negative" : "positive"}
            icon={Bug}
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-card rounded-lg border p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Execution Status</h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={executionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {executionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-4 mt-2 justify-center">
              {executionData.map((item) => (
                <div key={item.name} className="flex items-center gap-1.5 text-xs">
                  <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                  <span className="text-muted-foreground">{item.name}</span>
                  <span className="font-semibold text-card-foreground">{item.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-card rounded-lg border p-5">
            <h3 className="text-sm font-semibold text-card-foreground mb-4">Weekly Execution Trend</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(214, 20%, 90%)" />
                  <XAxis dataKey="day" tick={{ fontSize: 12 }} stroke="hsl(215, 12%, 50%)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(215, 12%, 50%)" />
                  <Tooltip />
                  <Bar dataKey="executed" fill="hsl(210, 80%, 52%)" radius={[4, 4, 0, 0]} name="Executed" />
                  <Bar dataKey="passed" fill="hsl(152, 60%, 40%)" radius={[4, 4, 0, 0]} name="Passed" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Recent Executions Table */}
        <div className="bg-card rounded-lg border">
          <div className="p-5 border-b flex items-center justify-between">
            <h3 className="text-sm font-semibold text-card-foreground">Recent Executions</h3>
            <button className="text-xs text-accent hover:underline font-medium">View All</button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs">ID</TableHead>
                <TableHead className="text-xs">Title</TableHead>
                <TableHead className="text-xs">Status</TableHead>
                <TableHead className="text-xs">Executed By</TableHead>
                <TableHead className="text-xs">Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentExecutions.map((exec) => (
                <TableRow key={exec.id} className="hover:bg-muted/50 cursor-pointer">
                  <TableCell className="font-mono text-xs text-accent font-medium">{exec.id}</TableCell>
                  <TableCell className="text-sm">{exec.title}</TableCell>
                  <TableCell>
                    <StatusBadge status={exec.status} variant="execution" />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">{exec.executor}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{exec.date}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </AppLayout>
  );
};

export default Dashboard;
