import { useState, useEffect } from "react";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { Plus, Search, Download, Upload, Loader2, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const API_URL = "http://localhost:3000/api";

interface TestCaseStep {
  action: string;
  expected_result: string;
}

interface TestCase {
  id: string;
  test_case_id: string;
  title: string;
  description: string | null;
  module: string | null;
  priority: string;
  type: string;
  status: string;
  createdByName: string;
  projectName: string;
  created_at: string;
  stepsCount: number;
}

interface Project {
  id: string;
  name: string;
}

const TestCases = () => {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPriority, setFilterPriority] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    project_id: "",
    title: "",
    description: "",
    preconditions: "",
    module: "",
    priority: "medium",
    type: "functional",
    expected_result: "",
  });

  const [steps, setSteps] = useState<TestCaseStep[]>([
    { action: "", expected_result: "" }
  ]);

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

  const fetchTestCases = async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_URL}/testcases?`;
      
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      if (filterPriority !== "all") url += `priority=${filterPriority}&`;
      if (filterStatus !== "all") url += `status=${filterStatus}&`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch test cases");
      }

      const data = await response.json();
      setTestCases(data.testCases || []);
    } catch (error) {
      console.error("Error fetching test cases:", error);
      toast({
        title: "Error",
        description: "Failed to load test cases",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchTestCases();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchTestCases();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, filterPriority, filterStatus]);

  const addStep = () => {
    setSteps([...steps, { action: "", expected_result: "" }]);
  };

  const removeStep = (index: number) => {
    if (steps.length > 1) {
      setSteps(steps.filter((_, i) => i !== index));
    }
  };

  const updateStep = (index: number, field: keyof TestCaseStep, value: string) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };

  const handleCreateTestCase = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const token = localStorage.getItem("token");
      
      // Filter out empty steps
      const validSteps = steps.filter(s => s.action.trim() !== "");

      const response = await fetch(`${API_URL}/testcases`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          steps: validSteps,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create test case");
      }

      toast({
        title: "Success",
        description: `Test case ${data.testCase.test_case_id} created successfully`,
      });

      // Reset form
      setFormData({
        project_id: "",
        title: "",
        description: "",
        preconditions: "",
        module: "",
        priority: "medium",
        type: "functional",
        expected_result: "",
      });
      setSteps([{ action: "", expected_result: "" }]);
      setIsDialogOpen(false);

      fetchTestCases();
    } catch (error) {
      console.error("Error creating test case:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create test case",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTestCase = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/testcases/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Failed to delete test case");
      }
      toast({
        title: "Deleted",
        description: "Test case deleted successfully",
      });
      fetchTestCases();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete test case",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <AppLayout title="Test Cases">
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search test cases..." 
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priorities</SelectItem>
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
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="deprecated">Deprecated</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-9">
              <Upload className="h-3.5 w-3.5 mr-1.5" />
              Import
            </Button>
            <Button variant="outline" size="sm" className="h-9">
              <Download className="h-3.5 w-3.5 mr-1.5" />
              Export
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 bg-accent text-accent-foreground hover:bg-accent/90">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New Test Case
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleCreateTestCase}>
                  <DialogHeader>
                    <DialogTitle>Create New Test Case</DialogTitle>
                    <DialogDescription>
                      Add a new test case with steps
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="project">Project *</Label>
                        <Select
                          value={formData.project_id}
                          onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                          required
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
                        <Label htmlFor="module">Module</Label>
                        <Input
                          id="module"
                          value={formData.module}
                          onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                          placeholder="e.g., Authentication"
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Enter test case title"
                        required
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Enter test case description"
                        rows={2}
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="preconditions">Preconditions</Label>
                      <Textarea
                        id="preconditions"
                        value={formData.preconditions}
                        onChange={(e) => setFormData({ ...formData, preconditions: e.target.value })}
                        placeholder="Enter preconditions"
                        rows={2}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
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
                      <div className="grid gap-2">
                        <Label>Type</Label>
                        <Select
                          value={formData.type}
                          onValueChange={(value) => setFormData({ ...formData, type: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="functional">Functional</SelectItem>
                            <SelectItem value="regression">Regression</SelectItem>
                            <SelectItem value="smoke">Smoke</SelectItem>
                            <SelectItem value="integration">Integration</SelectItem>
                            <SelectItem value="performance">Performance</SelectItem>
                            <SelectItem value="security">Security</SelectItem>
                            <SelectItem value="usability">Usability</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="expected_result">Expected Result</Label>
                      <Textarea
                        id="expected_result"
                        value={formData.expected_result}
                        onChange={(e) => setFormData({ ...formData, expected_result: e.target.value })}
                        placeholder="Enter expected result"
                        rows={2}
                      />
                    </div>

                    {/* Steps */}
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label>Test Steps</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addStep}>
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Step
                        </Button>
                      </div>
                      {steps.map((step, index) => (
                        <div key={index} className="flex gap-2 items-start p-3 border rounded-lg bg-muted/30">
                          <span className="text-sm font-medium text-muted-foreground w-6 pt-2">
                            {index + 1}.
                          </span>
                          <div className="flex-1 space-y-2">
                            <Input
                              placeholder="Action / Step description"
                              value={step.action}
                              onChange={(e) => updateStep(index, "action", e.target.value)}
                            />
                            <Input
                              placeholder="Expected result (optional)"
                              value={step.expected_result}
                              onChange={(e) => updateStep(index, "expected_result", e.target.value)}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeStep(index)}
                            disabled={steps.length === 1}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
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
                    <Button type="submit" disabled={isSubmitting || !formData.project_id || !formData.title}>
                      {isSubmitting ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        "Create Test Case"
                      )}
                    </Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Table */}
        <div className="bg-card rounded-lg border">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : testCases.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No test cases found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "New Test Case" to create your first test case
              </p>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs w-24">ID</TableHead>
                    <TableHead className="text-xs">Title</TableHead>
                    <TableHead className="text-xs">Module</TableHead>
                    <TableHead className="text-xs">Priority</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                    <TableHead className="text-xs">Created By</TableHead>
                    <TableHead className="text-xs w-16">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((tc) => (
                    <TableRow key={tc.id} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell className="font-mono text-xs text-accent font-medium">{tc.test_case_id}</TableCell>
                      <TableCell className="text-sm font-medium">{tc.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tc.module || "-"}</TableCell>
                      <TableCell>
                        <StatusBadge status={tc.priority} variant="priority" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">{tc.type}</TableCell>
                      <TableCell>
                        <StatusBadge status={tc.status} variant="execution" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tc.createdByName}</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(tc.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="p-4 border-t flex items-center justify-between text-sm text-muted-foreground">
                <span>Showing {testCases.length} test cases</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Test Case?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the test case and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTestCase}
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

export default TestCases;
