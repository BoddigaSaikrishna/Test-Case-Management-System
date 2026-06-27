import { useState, useEffect, useRef } from "react";
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
import { Plus, Search, Download, Upload, Loader2, Trash2, Play, Code, Rocket, Link as LinkIcon, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api";
import { useNavigate } from "react-router-dom";

interface TestCaseStep {
  action: string;
  expected_result: string;
  test_code: string;
}

interface TestCase {
  id: string;
  test_case_id: string;
  title: string;
  description: string | null;
  preconditions: string | null;
  module: string | null;
  priority: string;
  type: string;
  status: string;
  expected_result: string | null;
  feature_url?: string | null;
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
  const navigate = useNavigate();
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [isResultDialogOpen, setIsResultDialogOpen] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
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
    feature_url: "",
  });

  const [steps, setSteps] = useState<TestCaseStep[]>([
    { action: "", expected_result: "", test_code: "" }
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
    setSteps([...steps, { action: "", expected_result: "", test_code: "" }]);
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

      const url = editingId 
        ? `${API_URL}/testcases/${editingId}`
        : `${API_URL}/testcases`;
        
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
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
        throw new Error(data.error || `Failed to ${editingId ? "update" : "create"} test case`);
      }

      toast({
        title: "Success",
        description: `Test case ${data.testCase.test_case_id} ${editingId ? "updated" : "created"} successfully`,
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
        feature_url: "",
      });
      setSteps([{ action: "", expected_result: "", test_code: "" }]);
      setEditingId(null);
      setIsDialogOpen(false);

      fetchTestCases();
    } catch (error) {
      console.error(`Error ${editingId ? "updating" : "creating"} test case:`, error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : `Failed to ${editingId ? "update" : "create"} test case`,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditClick = async (tc: TestCase) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/testcases/${tc.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!response.ok) {
        throw new Error("Failed to fetch test case details");
      }
      
      const data = await response.json();
      const fullTestCase = data.testCase;
      
      setFormData({
        project_id: fullTestCase.project_id || "",
        title: fullTestCase.title || "",
        description: fullTestCase.description || "",
        preconditions: fullTestCase.preconditions || "",
        module: fullTestCase.module || "",
        priority: fullTestCase.priority || "medium",
        type: fullTestCase.type || "functional",
        expected_result: fullTestCase.expected_result || "",
        feature_url: fullTestCase.feature_url || "",
      });
      
      if (fullTestCase.test_case_steps && fullTestCase.test_case_steps.length > 0) {
        setSteps(fullTestCase.test_case_steps.map((s: any) => ({
          action: s.action || "",
          expected_result: s.expected_result || "",
          test_code: s.test_code || "",
        })));
      } else {
        setSteps([{ action: "", expected_result: "", test_code: "" }]);
      }
      
      setEditingId(tc.id);
      setIsDialogOpen(true);
    } catch (error) {
      console.error("Error fetching test case details:", error);
      toast({
        title: "Error",
        description: "Failed to load test case details for editing",
        variant: "destructive",
      });
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

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/testcases/export/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to export test cases");
      }

      const data = await response.json();
      
      // Create a blob and download it
      const blob = new Blob([JSON.stringify(data.testCases, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `test-cases-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Export Successful",
        description: `Exported ${data.testCases.length} test cases`,
      });
    } catch (error) {
      console.error("Export error:", error);
      toast({
        title: "Export Failed",
        description: error instanceof Error ? error.message : "Failed to export test cases",
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    try {
      const text = await file.text();
      let testCases;
      try {
        testCases = JSON.parse(text);
      } catch (e) {
        throw new Error("Invalid JSON file");
      }

      if (!Array.isArray(testCases)) {
        throw new Error("File must contain an array of test cases");
      }

      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/testcases/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ testCases }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to import test cases");
      }

      toast({
        title: "Import Successful",
        description: data.message || `Imported ${data.count} test cases`,
      });

      // Refresh the list
      fetchTestCases();
    } catch (error) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error instanceof Error ? error.message : "Failed to import test cases",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
      // Clear the file input so the same file can be selected again
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };


  const handleRunAutomatedTest = async (testCaseId: string, projectId?: string) => {
    setRunningTestId(testCaseId);
    try {
      const token = localStorage.getItem("token");

      // Get the test case to find its project_id
      const tcResponse = await fetch(`${API_URL}/testcases/${testCaseId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!tcResponse.ok) {
        throw new Error("Failed to fetch test case");
      }
      const tcData = await tcResponse.json();
      const project_id = projectId || tcData.testCase?.project_id;

      const response = await fetch(`${API_URL}/test-runner/run/${testCaseId}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id,
          environment: "automated",
          browser: "api-test",
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        toast({
          title: "No Automated Tests",
          description: result.message || result.error || "Add test_code to steps or a Feature URL to run automation",
          variant: "destructive",
        });
        return;
      }

      setTestResult(result);
      setIsResultDialogOpen(true);

      toast({
        title: result.execution?.status === "pass" ? "All Tests Passed! ✓" : "Tests Failed ✗",
        description: "Test execution completed. Viewing results...",
        variant: result.execution?.status === "pass" ? "default" : "destructive",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to run automated tests",
        variant: "destructive",
      });
    } finally {
      setRunningTestId(null);
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
            <input 
              type="file" 
              accept=".json" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleImportFileChange} 
            />
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9" 
              onClick={() => fileInputRef.current?.click()}
              disabled={isImporting}
            >
              {isImporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Upload className="h-3.5 w-3.5 mr-1.5" />}
              Import
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              className="h-9"
              onClick={handleExport}
              disabled={isExporting}
            >
              {isExporting ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Download className="h-3.5 w-3.5 mr-1.5" />}
              Export
            </Button>
            <Dialog open={isDialogOpen} onOpenChange={(open) => {
              setIsDialogOpen(open);
              if (!open) {
                setEditingId(null);
                setFormData({
                  project_id: "",
                  title: "",
                  description: "",
                  preconditions: "",
                  module: "",
                  priority: "medium",
                  type: "functional",
                  expected_result: "",
                  feature_url: "",
                });
                setSteps([{ action: "", expected_result: "", test_code: "" }]);
              }
            }}>
              <DialogTrigger asChild>
                <Button size="sm" className="h-9 bg-accent text-accent-foreground hover:bg-accent/90">
                  <Plus className="h-3.5 w-3.5 mr-1.5" />
                  New Test Case
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleCreateTestCase}>
                  <DialogHeader>
                    <DialogTitle>{editingId ? "Edit Test Case" : "Create New Test Case"}</DialogTitle>
                    <DialogDescription>
                      {editingId ? "Update existing test case details and steps" : "Add a new test case with steps"}
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
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="module">Module</Label>
                          <Input
                            id="module"
                            value={formData.module}
                            onChange={(e) => setFormData({ ...formData, module: e.target.value })}
                            placeholder="e.g., Authentication"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="feature_url">Feature URL</Label>
                          <Input
                            id="feature_url"
                            value={formData.feature_url}
                            onChange={(e) => setFormData({ ...formData, feature_url: e.target.value })}
                            placeholder="https://example.com/login"
                          />
                        </div>
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
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <Code className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="text-xs text-muted-foreground">Test Code (JSON - API or UI)</span>
                              </div>
                              <Textarea
                                placeholder={`API Example:\n{ "method": "GET", "url": "https://api..." }\n\nUI Example:\n{ "type": "ui", "url": "https://...", "actions": [\n  { "action": "type", "selector": "#email", "value": "test" },\n  { "action": "click", "selector": "#login-btn" }\n] }`}
                                value={step.test_code}
                                onChange={(e) => updateStep(index, "test_code", e.target.value)}
                                className="font-mono text-xs min-h-[160px]"
                              />
                            </div>
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
                          {editingId ? "Updating..." : "Creating..."}
                        </>
                      ) : (
                        editingId ? "Update Test Case" : "Create Test Case"
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
                    <TableHead className="text-xs w-32">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {testCases.map((tc) => (
                    <TableRow key={tc.id} className="hover:bg-muted/50 cursor-pointer">
                      <TableCell className="font-mono text-xs text-accent font-medium">{tc.test_case_id}</TableCell>
                      <TableCell className="text-sm font-medium">{tc.title}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        <div className="flex flex-col gap-1">
                          <span>{tc.module || "-"}</span>
                          {tc.feature_url && (
                            <a
                              href={tc.feature_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-500 hover:underline flex items-center gap-1"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <LinkIcon className="h-3 w-3" />
                              View Link
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={tc.priority} variant="priority" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground capitalize">{tc.type}</TableCell>
                      <TableCell>
                        <StatusBadge status={tc.status} variant="execution" />
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{tc.createdByName}</TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRunAutomatedTest(tc.id);
                            }}
                            disabled={runningTestId === tc.id}
                            title="Run Automated Test"
                          >
                            {runningTestId === tc.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Rocket className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-green-600 hover:text-green-700 hover:bg-green-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/executions?run=${tc.id}`);
                            }}
                            title="Manual Test"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-amber-600 hover:text-amber-700 hover:bg-amber-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(tc);
                            }}
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(tc.id);
                            }}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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

      {/* Test Result Dialog */}
      <Dialog open={isResultDialogOpen} onOpenChange={setIsResultDialogOpen}>
        <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Test Execution Result</DialogTitle>
            <DialogDescription>
              Results for test case execution
            </DialogDescription>
          </DialogHeader>

          {testResult && (
            <div className="space-y-4 py-4">
              {/* Overall Status */}
              <div className="flex items-center gap-2 p-3 rounded-lg border bg-muted/30">
                <span className="font-semibold">Status:</span>
                <StatusBadge
                  status={testResult.execution?.status || 'unknown'}
                  variant="execution"
                />
                <span className="text-muted-foreground ml-auto text-sm">
                  Time: {testResult.execution?.execution_time}ms
                </span>
              </div>

              {/* Feature URL Result */}
              {testResult.featureUrlResult && (
                <div className="space-y-2 border rounded-lg p-4">
                  <h3 className="font-medium flex items-center justify-between">
                    <span>Feature URL Check</span>
                    <StatusBadge
                      status={testResult.featureUrlResult.status}
                      variant="execution"
                    />
                  </h3>
                  <div className="text-sm text-muted-foreground break-all">
                    URL: {testResult.featureUrlResult.url}
                  </div>
                  <div className="text-sm font-medium">
                    {testResult.featureUrlResult.message}
                  </div>

                  {testResult.featureUrlResult.output && (
                    <div className="mt-2">
                      <Label className="text-xs text-muted-foreground mb-1 block">Response Output:</Label>
                      <div className="bg-slate-950 text-slate-50 p-3 rounded-md font-mono text-xs overflow-x-auto max-h-[300px]">
                        <pre>{testResult.featureUrlResult.output}</pre>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Step Results */}
              {testResult.results && testResult.results.length > 0 && (
                <div className="space-y-2">
                  <h3 className="font-medium">Step Results</h3>
                  <div className="space-y-2">
                    {testResult.results.map((step: any, index: number) => (
                      <div key={index} className="border rounded-lg p-3 text-sm">
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-medium">Step {step.step_number}</span>
                          <StatusBadge status={step.status} variant="execution" />
                        </div>
                        <pre className="bg-muted p-2 rounded text-xs whitespace-pre-wrap">
                          {step.actual_result}
                        </pre>
                        {step.screenshot && (
                          <div className="mt-2">
                            <span className="text-xs text-muted-foreground block mb-1">Browser Screenshot:</span>
                            <img src={step.screenshot} alt={`Screenshot for step ${step.step_number}`} className="max-w-full h-auto border rounded-md" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button onClick={() => setIsResultDialogOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout >
  );
};

export default TestCases;
