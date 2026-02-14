import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Loader2, Trash2 } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";

const API_URL = "http://localhost:3000/api";

interface Defect {
  id: string;
  defect_id: string;
  title: string;
  description: string | null;
  severity: string;
  priority: string;
  status: string;
  environment: string | null;
  browser: string | null;
  created_at: string;
  reportedByName: string;
  assignedToName: string;
  testCaseId: string | null;
  projectName: string;
}

interface Project {
  id: string;
  name: string;
}

interface TestCase {
  id: string;
  test_case_id: string;
  title: string;
}

interface User {
  id: string;
  name: string;
  email: string;
}

const Defects = () => {
  const [defects, setDefects] = useState<Defect[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSeverity, setFilterSeverity] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    project_id: "",
    test_case_id: "",
    title: "",
    description: "",
    steps_to_reproduce: "",
    severity: "medium",
    priority: "medium",
    environment: "",
    browser: "",
    assigned_to: "",
  });

  const fetchProjects = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/projects`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setProjects(data.projects || []);
      }
    } catch (error) {
      console.error("Error fetching projects:", error);
    }
  };

  const fetchTestCases = async (projectId?: string) => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_URL}/testcases`;
      if (projectId) {
        url += `?project_id=${projectId}`;
      }
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTestCases(data.testCases || []);
      }
    } catch (error) {
      console.error("Error fetching test cases:", error);
    }
  };

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/defects/users/list`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
      }
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  const fetchDefects = async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_URL}/defects?`;
      
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      if (filterSeverity !== "all") url += `severity=${filterSeverity}&`;
      if (filterStatus !== "all") url += `status=${filterStatus}&`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch defects");
      }

      const data = await response.json();
      setDefects(data.defects || []);
    } catch (error) {
      console.error("Error fetching defects:", error);
      toast({
        title: "Error",
        description: "Failed to load defects",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchUsers();
    fetchDefects();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchDefects();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, filterSeverity, filterStatus]);

  useEffect(() => {
    if (formData.project_id) {
      fetchTestCases(formData.project_id);
      setFormData(prev => ({ ...prev, test_case_id: "" }));
    }
  }, [formData.project_id]);

  const handleCreateDefect = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(`${API_URL}/defects`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: formData.project_id,
          test_case_id: formData.test_case_id || null,
          title: formData.title,
          description: formData.description || null,
          steps_to_reproduce: formData.steps_to_reproduce || null,
          severity: formData.severity,
          priority: formData.priority,
          environment: formData.environment || null,
          browser: formData.browser || null,
          assigned_to: formData.assigned_to || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create defect");
      }

      toast({
        title: "Success",
        description: `Defect ${data.defect.defect_id} reported successfully`,
      });

      // Reset form
      setFormData({
        project_id: "",
        test_case_id: "",
        title: "",
        description: "",
        steps_to_reproduce: "",
        severity: "medium",
        priority: "medium",
        environment: "",
        browser: "",
        assigned_to: "",
      });
      setIsDialogOpen(false);

      fetchDefects();
    } catch (error) {
      console.error("Error creating defect:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create defect",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDefect = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/defects/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Failed to delete defect");
      }
      toast({
        title: "Deleted",
        description: "Defect deleted successfully",
      });
      fetchDefects();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete defect",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <AppLayout title="Defects">
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search defects..." 
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterSeverity} onValueChange={setFilterSeverity}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Severities</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="low">Low</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="resolved">Resolved</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="reopened">Reopened</SelectItem>
                <SelectItem value="deferred">Deferred</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                Report Defect
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleCreateDefect}>
                <DialogHeader>
                  <DialogTitle>Report New Defect</DialogTitle>
                  <DialogDescription>
                    Log a new defect or bug found during testing
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Project *</Label>
                      <Select
                        value={formData.project_id}
                        onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Related Test Case</Label>
                      <Select
                        value={formData.test_case_id}
                        onValueChange={(value) => setFormData({ ...formData, test_case_id: value })}
                        disabled={!formData.project_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select test case (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          {testCases.map((tc) => (
                            <SelectItem key={tc.id} value={tc.id}>
                              {tc.test_case_id} - {tc.title}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="title">Title *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      placeholder="Brief description of the defect"
                      required
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Detailed description of the defect"
                      rows={3}
                    />
                  </div>

                  <div className="grid gap-2">
                    <Label htmlFor="steps">Steps to Reproduce</Label>
                    <Textarea
                      id="steps"
                      value={formData.steps_to_reproduce}
                      onChange={(e) => setFormData({ ...formData, steps_to_reproduce: e.target.value })}
                      placeholder="1. Go to...&#10;2. Click on...&#10;3. Observe..."
                      rows={4}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Severity</Label>
                      <Select
                        value={formData.severity}
                        onValueChange={(value) => setFormData({ ...formData, severity: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-2">
                      <Label>Priority</Label>
                      <Select
                        value={formData.priority}
                        onValueChange={(value) => setFormData({ ...formData, priority: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="critical">Critical</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="low">Low</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>Environment</Label>
                      <Input
                        value={formData.environment}
                        onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                        placeholder="e.g., Production, Staging"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label>Browser</Label>
                      <Select
                        value={formData.browser}
                        onValueChange={(value) => setFormData({ ...formData, browser: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select browser" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="chrome">Chrome</SelectItem>
                          <SelectItem value="firefox">Firefox</SelectItem>
                          <SelectItem value="safari">Safari</SelectItem>
                          <SelectItem value="edge">Edge</SelectItem>
                          <SelectItem value="other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid gap-2">
                    <Label>Assign To</Label>
                    <Select
                      value={formData.assigned_to}
                      onValueChange={(value) => setFormData({ ...formData, assigned_to: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select assignee (optional)" />
                      </SelectTrigger>
                      <SelectContent>
                        {users.map((user) => (
                          <SelectItem key={user.id} value={user.id}>
                            {user.name} ({user.email})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDialogOpen(false)}
                    disabled={isSubmitting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    type="submit" 
                    disabled={isSubmitting || !formData.project_id || !formData.title}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      "Report Defect"
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : defects.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No defects found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Report Defect" to log your first defect
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">ID</TableHead>
                  <TableHead className="text-xs">Test Case</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Severity</TableHead>
                  <TableHead className="text-xs">Priority</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Assigned To</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs w-16">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {defects.map((d) => (
                  <TableRow key={d.id} className="hover:bg-muted/50 cursor-pointer">
                    <TableCell className="font-mono text-xs font-medium">{d.defect_id}</TableCell>
                    <TableCell className="font-mono text-xs text-accent font-medium">
                      {d.testCaseId || "-"}
                    </TableCell>
                    <TableCell className="text-sm font-medium">{d.title}</TableCell>
                    <TableCell><StatusBadge status={d.severity} variant="severity" /></TableCell>
                    <TableCell><StatusBadge status={d.priority} variant="priority" /></TableCell>
                    <TableCell><StatusBadge status={d.status} variant="defect" /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d.assignedToName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(d.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(d.id);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Defect?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the defect record.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteDefect}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

export default Defects;
