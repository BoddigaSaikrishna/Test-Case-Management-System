import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import AppLayout from "@/components/AppLayout";
import { API_URL } from "@/lib/api";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export default function AuditLogs() {
  const [entityType, setEntityType] = useState<string>("all");
  const [action, setAction] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ['audit-logs', entityType, action],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (entityType !== 'all') params.append('entity_type', entityType);
      if (action !== 'all') params.append('action', action);
      
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/audit-logs?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!res.ok) throw new Error('Failed to fetch audit logs');
      return res.json();
    },
  });

  const logs = data?.logs || [];

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE': return 'bg-green-500/10 text-green-500';
      case 'UPDATE': return 'bg-blue-500/10 text-blue-500';
      case 'DELETE': return 'bg-red-500/10 text-red-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <AppLayout>
      <div className="flex flex-col space-y-6 animate-fade-in pb-10">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
            <p className="text-muted-foreground mt-1">
              Track user actions and system changes.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>System Activity</CardTitle>
                <CardDescription>Recent changes across the platform</CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={entityType} onValueChange={setEntityType}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Entity Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Entities</SelectItem>
                    <SelectItem value="PROJECT">Projects</SelectItem>
                    <SelectItem value="TEST_CASE">Test Cases</SelectItem>
                    <SelectItem value="DEFECT">Defects</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Action" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Actions</SelectItem>
                    <SelectItem value="CREATE">Create</SelectItem>
                    <SelectItem value="UPDATE">Update</SelectItem>
                    <SelectItem value="DELETE">Delete</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center p-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground bg-muted/20 rounded-lg border border-dashed">
                No audit logs found for the selected filters.
              </div>
            ) : (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Time</TableHead>
                      <TableHead>User</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Entity</TableHead>
                      <TableHead>Details</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {logs.map((log: any) => (
                      <TableRow key={log.id}>
                        <TableCell className="whitespace-nowrap">
                          {format(new Date(log.created_at), "MMM d, yyyy HH:mm:ss")}
                        </TableCell>
                        <TableCell>
                          {log.profiles?.name || log.user_id}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getActionColor(log.action)}>
                            {log.action}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium text-sm">{log.entity_type}</span>
                            <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
                              {log.entity_id}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto max-w-[300px]">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
