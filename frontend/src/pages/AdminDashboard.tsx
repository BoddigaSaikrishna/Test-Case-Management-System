import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { API_URL } from "@/lib/api";
import {
    Shield, Users, FolderKanban, TestTube2, Activity, Clock,
    CheckCircle2, AlertTriangle, TrendingUp, Database,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

interface AdminStats {
    totalUsers: number;
    activeUsers: number;
    totalProjects: number;
    totalTestCases: number;
    systemStatus: string;
    uptime: number;
}

const StatCard = ({
    title,
    value,
    subtitle,
    icon: Icon,
    color = "bg-primary/10 text-primary",
}: {
    title: string;
    value: string | number;
    subtitle?: string;
    icon: any;
    color?: string;
}) => (
    <Card>
        <CardContent className="flex items-center gap-4 p-5">
            <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
                <Icon className="h-6 w-6" />
            </div>
            <div>
                <p className="text-sm text-muted-foreground font-medium">{title}</p>
                <p className="text-2xl font-bold text-foreground">{value}</p>
                {subtitle && <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>}
            </div>
        </CardContent>
    </Card>
);

const AdminDashboard = () => {
    const [stats, setStats] = useState<AdminStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchAdminStats = async () => {
        setLoading(true);
        setError(null);
        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${API_URL}/dashboard/admin-stats`, {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (!response.ok) {
                const data = await response.json();
                throw new Error(data.error || "Failed to fetch admin stats");
            }

            const data = await response.json();
            setStats(data.stats);
        } catch (err: any) {
            setError(err.message || "Unable to load admin stats");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchAdminStats();
    }, []);

    const formatUptime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        return `${h}h ${m}m`;
    };

    return (
        <AppLayout title="Admin Dashboard">
            <div className="space-y-6">
                {/* Header */}
                <div className="flex items-center gap-3 pb-2 border-b">
                    <div className="h-9 w-9 rounded-lg bg-destructive/10 flex items-center justify-center">
                        <Shield className="h-5 w-5 text-destructive" />
                    </div>
                    <div>
                        <h2 className="text-lg font-bold">System Administration</h2>
                        <p className="text-xs text-muted-foreground">Monitor system health, users and projects</p>
                    </div>
                </div>

                {/* Loading */}
                {loading && (
                    <div className="flex items-center justify-center h-48">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                    </div>
                )}

                {/* Error */}
                {!loading && error && (
                    <Card className="border-destructive/50 bg-destructive/5">
                        <CardContent className="flex items-center gap-3 p-5">
                            <AlertTriangle className="h-5 w-5 text-destructive shrink-0" />
                            <div>
                                <p className="font-medium text-destructive">Access Denied or Error</p>
                                <p className="text-sm text-muted-foreground">{error}</p>
                                <button onClick={fetchAdminStats} className="text-sm text-primary hover:underline mt-1">
                                    Retry
                                </button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Stats Grid */}
                {!loading && stats && (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                            <StatCard
                                title="Total Users"
                                value={stats.totalUsers}
                                subtitle={`${stats.activeUsers} active in last 30 days`}
                                icon={Users}
                                color="bg-blue-500/10 text-blue-500"
                            />
                            <StatCard
                                title="Total Projects"
                                value={stats.totalProjects}
                                subtitle="Across all teams"
                                icon={FolderKanban}
                                color="bg-purple-500/10 text-purple-500"
                            />
                            <StatCard
                                title="Total Test Cases"
                                value={stats.totalTestCases}
                                subtitle="System-wide"
                                icon={TestTube2}
                                color="bg-green-500/10 text-green-500"
                            />
                        </div>

                        {/* System Health */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <Activity className="h-4 w-4 text-green-500" />
                                        System Health
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3">
                                    <div className="flex items-center justify-between py-2 border-b">
                                        <span className="text-sm text-muted-foreground">API Server</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                                            <span className="text-sm font-medium text-green-600 capitalize">{stats.systemStatus}</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b">
                                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                            <Clock className="h-3.5 w-3.5" /> Server Uptime
                                        </span>
                                        <span className="text-sm font-medium">{formatUptime(stats.uptime)}</span>
                                    </div>
                                    <div className="flex items-center justify-between py-2 border-b">
                                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                            <Database className="h-3.5 w-3.5" /> Database
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-2 w-2 rounded-full bg-green-500" />
                                            <span className="text-sm font-medium text-green-600">Connected</span>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between py-2">
                                        <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                                            <CheckCircle2 className="h-3.5 w-3.5" /> Auth Service
                                        </span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="h-2 w-2 rounded-full bg-green-500" />
                                            <span className="text-sm font-medium text-green-600">Operational</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                        <TrendingUp className="h-4 w-4 text-blue-500" />
                                        Usage Overview
                                    </CardTitle>
                                    <CardDescription>Resource overview</CardDescription>
                                </CardHeader>
                                <CardContent className="h-[160px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart
                                            data={[
                                                { name: "Users", value: stats.totalUsers },
                                                { name: "Projects", value: stats.totalProjects },
                                                { name: "Test Cases", value: stats.totalTestCases },
                                                { name: "Active", value: stats.activeUsers },
                                            ]}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                                            <YAxis tick={{ fontSize: 11 }} />
                                            <Tooltip />
                                            <Bar dataKey="value" fill="hsl(210, 80%, 52%)" radius={[4, 4, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </CardContent>
                            </Card>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
};

export default AdminDashboard;
