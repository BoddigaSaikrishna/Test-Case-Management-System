import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import AppLayout from "@/components/AppLayout";
import StatusBadge from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
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
import { Plus, Search, Loader2, Play, CheckCircle, XCircle, AlertCircle, MinusCircle, Trash2, Eye, Clock, Timer } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { API_URL } from "@/lib/api";

interface TestCaseStep {
  id: string;
  step_number: number;
  action: string;
  expected_result: string;
}

interface ExecutionStep {
  test_case_step_id: string;
  step_number: number;
  action: string;
  expected_result: string;
  status: string;
  actual_result: string;
  notes: string;
}

interface Execution {
  id: string;
  execution_id: string;
  status: string;
  environment: string | null;
  browser: string | null;
  comments: string | null;
  execution_time: number | null;
  executed_at: string;
  executorName: string;
  testCaseId: string;
  testCaseTitle: string;
  projectName: string;
}

interface TestCase {
  id: string;
  test_case_id: string;
  title: string;
  project_id: string;
  projectName: string;
}

interface Project {
  id: string;
  name: string;
}

const Executions = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [executions, setExecutions] = useState<Execution[]>([]);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [testCaseSteps, setTestCaseSteps] = useState<TestCaseStep[]>([]);
  const [loadingSteps, setLoadingSteps] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [executionTimer, setExecutionTimer] = useState(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [viewExecution, setViewExecution] = useState<Execution | null>(null);
  const [viewSteps, setViewSteps] = useState<ExecutionStep[]>([]);
  const [loadingViewSteps, setLoadingViewSteps] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  // Form state
  const [formData, setFormData] = useState({
    project_id: "",
    test_case_id: "",
    status: "pending",
    environment: "",
    browser: "",
    comments: "",
  });

  const [executionSteps, setExecutionSteps] = useState<ExecutionStep[]>([]);

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

  const fetchTestCaseSteps = async (testCaseId: string) => {
    setLoadingSteps(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/executions/testcase/${testCaseId}/steps`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        setTestCaseSteps(data.steps || []);
        // Initialize execution steps based on test case steps
        setExecutionSteps(data.steps.map((step: TestCaseStep) => ({
          test_case_step_id: step.id,
          step_number: step.step_number,
          action: step.action,
          expected_result: step.expected_result,
          status: "pending",
          actual_result: "",
          notes: "",
        })));
      }
    } catch (error) {
      console.error("Error fetching steps:", error);
    } finally {
      setLoadingSteps(false);
    }
  };

  const fetchExecutions = async () => {
    try {
      const token = localStorage.getItem("token");
      let url = `${API_URL}/executions?`;
      
      if (searchQuery) url += `search=${encodeURIComponent(searchQuery)}&`;
      if (filterStatus !== "all") url += `status=${filterStatus}&`;

      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch executions");
      }

      const data = await response.json();
      setExecutions(data.executions || []);
    } catch (error) {
      console.error("Error fetching executions:", error);
      toast({
        title: "Error",
        description: "Failed to load executions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchTestCases();
    fetchExecutions();
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchExecutions();
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery, filterStatus]);

  useEffect(() => {
    if (formData.project_id) {
      fetchTestCases(formData.project_id);
      setFormData(prev => ({ ...prev, test_case_id: "" }));
      setTestCaseSteps([]);
      setExecutionSteps([]);
    }
  }, [formData.project_id]);

  useEffect(() => {
    if (formData.test_case_id) {
      fetchTestCaseSteps(formData.test_case_id);
    }
  }, [formData.test_case_id]);

  // Handle ?run= parameter from TestCases page
  useEffect(() => {
    const runId = searchParams.get("run");
    if (runId && testCases.length > 0) {
      const testCase = testCases.find(tc => tc.id === runId);
      if (testCase) {
        setFormData(prev => ({
          ...prev,
          project_id: testCase.project_id,
          test_case_id: runId,
        }));
        setIsDialogOpen(true);
        startTimer();
        // Clear the URL parameter
        setSearchParams({});
      }
    }
  }, [searchParams, testCases]);

  // Timer functionality
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setExecutionTimer(prev => prev + 1);
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isTimerRunning]);

  const startTimer = () => {
    setExecutionTimer(0);
    setIsTimerRunning(true);
  };

  const stopTimer = () => {
    setIsTimerRunning(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const getExecutionProgress = () => {
    if (executionSteps.length === 0) return 0;
    const completed = executionSteps.filter(s => s.status !== "pending").length;
    return Math.round((completed / executionSteps.length) * 100);
  };

  const fetchExecutionSteps = async (executionId: string) => {
    setLoadingViewSteps(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/executions/${executionId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) {
        const data = await response.json();
        // Backend returns execution_steps with test_case_step nested data
        const executionSteps = data.execution?.execution_steps || [];
        // Map to the format expected by the view dialog
        const mappedSteps = executionSteps.map((es: any) => ({
          id: es.id,
          step_number: es.test_case_step?.step_number || es.step_number,
          action: es.test_case_step?.action || '',
          expected_result: es.test_case_step?.expected_result || '',
          actual_result: es.actual_result,
          status: es.status,
        }));
        setViewSteps(mappedSteps);
      }
    } catch (error) {
      console.error("Error fetching execution steps:", error);
    } finally {
      setLoadingViewSteps(false);
    }
  };

  const handleViewExecution = (execution: Execution) => {
    setViewExecution(execution);
    fetchExecutionSteps(execution.id);
  };

  const updateStepStatus = (index: number, status: string) => {
    const newSteps = [...executionSteps];
    newSteps[index].status = status;
    setExecutionSteps(newSteps);

    // Auto-update overall status based on steps
    const statuses = newSteps.map(s => s.status);
    if (statuses.every(s => s === "pass")) {
      setFormData(prev => ({ ...prev, status: "pass" }));
    } else if (statuses.some(s => s === "fail")) {
      setFormData(prev => ({ ...prev, status: "fail" }));
    } else if (statuses.some(s => s === "blocked")) {
      setFormData(prev => ({ ...prev, status: "blocked" }));
    }
  };

  const updateStepField = (index: number, field: "actual_result" | "notes", value: string) => {
    const newSteps = [...executionSteps];
    newSteps[index][field] = value;
    setExecutionSteps(newSteps);
  };

  const handleCreateExecution = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    stopTimer();

    try {
      const token = localStorage.getItem("token");
      const selectedTestCase = testCases.find(tc => tc.id === formData.test_case_id);

      const response = await fetch(`${API_URL}/executions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          test_case_id: formData.test_case_id,
          project_id: formData.project_id,
          status: formData.status,
          environment: formData.environment || null,
          browser: formData.browser || null,
          comments: formData.comments || null,
          execution_time: executionTimer,
          steps: executionSteps.filter(s => s.test_case_step_id),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create execution");
      }

      toast({
        title: "Success",
        description: `Execution ${data.execution.execution_id} created successfully`,
      });

      // Reset form
      setFormData({
        project_id: "",
        test_case_id: "",
        status: "pending",
        environment: "",
        browser: "",
        comments: "",
      });
      setExecutionSteps([]);
      setTestCaseSteps([]);
      setExecutionTimer(0);
      setIsDialogOpen(false);

      fetchExecutions();
    } catch (error) {
      console.error("Error creating execution:", error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create execution",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pass": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "fail": return <XCircle className="h-4 w-4 text-red-500" />;
      case "blocked": return <AlertCircle className="h-4 w-4 text-yellow-500" />;
      case "skipped": return <MinusCircle className="h-4 w-4 text-gray-500" />;
      default: return <Play className="h-4 w-4 text-blue-500" />;
    }
  };

  const handleDeleteExecution = async () => {
    if (!deleteId) return;
    setIsDeleting(true);
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/executions/${deleteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("Failed to delete execution");
      }
      toast({
        title: "Deleted",
        description: "Execution deleted successfully",
      });
      fetchExecutions();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete execution",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteId(null);
    }
  };

  return (
    <AppLayout title="Test Executions">
      <div className="space-y-4">
        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row gap-3 justify-between">
          <div className="flex gap-2 flex-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search executions..." 
                className="pl-9 h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-36 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="pass">Pass</SelectItem>
                <SelectItem value="fail">Fail</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
                <SelectItem value="skipped">Skipped</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (open) startTimer();
            else { stopTimer(); setExecutionTimer(0); }
          }}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-9 bg-accent text-accent-foreground hover:bg-accent/90">
                <Plus className="h-3.5 w-3.5 mr-1.5" />
                New Execution
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
              <form onSubmit={handleCreateExecution}>
                <DialogHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <DialogTitle>Execute Test Case</DialogTitle>
                      <DialogDescription>
                        Run a test case and record the results for each step
                      </DialogDescription>
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <div className="flex items-center gap-1.5 bg-muted px-3 py-1.5 rounded-lg">
                        <Timer className="h-4 w-4 text-accent" />
                        <span className="font-mono font-medium">{formatTime(executionTimer)}</span>
                      </div>
                      {executionSteps.length > 0 && (
                        <div className="flex items-center gap-1.5">
                          <span className="text-muted-foreground">{getExecutionProgress()}%</span>
                        </div>
                      )}
                    </div>
                  </div>
                  {executionSteps.length > 0 && (
                    <Progress value={getExecutionProgress()} className="h-1.5 mt-2" />
                  )}
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
                      <Label>Test Case *</Label>
                      <Select
                        value={formData.test_case_id}
                        onValueChange={(value) => setFormData({ ...formData, test_case_id: value })}
                        disabled={!formData.project_id}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select test case" />
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

                  <div className="grid grid-cols-3 gap-4">
                    <div className="grid gap-2">
                      <Label>Environment</Label>
                      <Input
                        value={formData.environment}
                        onChange={(e) => setFormData({ ...formData, environment: e.target.value })}
                        placeholder="e.g., Production"
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
                    <div className="grid gap-2">
                      <Label>Overall Status</Label>
                      <Select
                        value={formData.status}
                        onValueChange={(value) => setFormData({ ...formData, status: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="pass">Pass</SelectItem>
                          <SelectItem value="fail">Fail</SelectItem>
                          <SelectItem value="blocked">Blocked</SelectItem>
                          <SelectItem value="skipped">Skipped</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Execution Steps */}
                  {formData.test_case_id && (
                    <div className="space-y-3">
                      <Label>Execution Steps</Label>
                      {loadingSteps ? (
                        <div className="flex items-center justify-center py-4">
                          <Loader2 className="h-6 w-6 animate-spin" />
                        </div>
                      ) : executionSteps.length === 0 ? (
                        <p className="text-sm text-muted-foreground py-2">
                          No steps defined for this test case
                        </p>
                      ) : (
                        <div className="space-y-3">
                          {executionSteps.map((step, index) => (
                            <div key={index} className="border rounded-lg p-3 space-y-2">
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-sm font-medium">Step {step.step_number}</span>
                                    {getStatusIcon(step.status)}
                                  </div>
                                  <p className="text-sm">{step.action}</p>
                                  {step.expected_result && (
                                    <p className="text-xs text-muted-foreground mt-1">
                                      Expected: {step.expected_result}
                                    </p>
                                  )}
                                </div>
                                <div className="flex gap-1">
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={step.status === "pass" ? "default" : "outline"}
                                    className="h-8 w-8 p-0"
                                    onClick={() => updateStepStatus(index, "pass")}
                                  >
                                    <CheckCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={step.status === "fail" ? "destructive" : "outline"}
                                    className="h-8 w-8 p-0"
                                    onClick={() => updateStepStatus(index, "fail")}
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant={step.status === "blocked" ? "secondary" : "outline"}
                                    className="h-8 w-8 p-0"
                                    onClick={() => updateStepStatus(index, "blocked")}
                                  >
                                    <AlertCircle className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <Input
                                  placeholder="Actual result"
                                  value={step.actual_result}
                                  onChange={(e) => updateStepField(index, "actual_result", e.target.value)}
                                  className="h-8 text-sm"
                                />
                                <Input
                                  placeholder="Notes"
                                  value={step.notes}
                                  onChange={(e) => updateStepField(index, "notes", e.target.value)}
                                  className="h-8 text-sm"
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}

                  <div className="grid gap-2">
                    <Label>Comments</Label>
                    <Textarea
                      value={formData.comments}
                      onChange={(e) => setFormData({ ...formData, comments: e.target.value })}
                      placeholder="Add any additional comments"
                      rows={2}
                    />
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
                    disabled={isSubmitting || !formData.project_id || !formData.test_case_id}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      "Save Execution"
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
          ) : executions.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No executions found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "New Execution" to run your first test case
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Execution ID</TableHead>
                  <TableHead className="text-xs">Test Case</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Executed By</TableHead>
                  <TableHead className="text-xs">Date</TableHead>
                  <TableHead className="text-xs">Comments</TableHead>
                  <TableHead className="text-xs w-24">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {executions.map((exec) => (
                  <TableRow key={exec.id} className="hover:bg-muted/50 cursor-pointer">
                    <TableCell className="font-mono text-xs font-medium">{exec.execution_id}</TableCell>
                    <TableCell className="font-mono text-xs text-accent font-medium">{exec.testCaseId}</TableCell>
                    <TableCell className="text-sm">{exec.testCaseTitle}</TableCell>
                    <TableCell><StatusBadge status={exec.status} variant="execution" /></TableCell>
                    <TableCell className="text-sm text-muted-foreground">{exec.executorName}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(exec.executed_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground max-w-48 truncate">
                      {exec.comments || "-"}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-accent hover:text-accent hover:bg-accent/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewExecution(exec);
                          }}
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteId(exec.id);
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
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Execution?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the execution record and all step results.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteExecution}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* View Execution Details Dialog */}
      <Dialog open={!!viewExecution} onOpenChange={(open) => !open && setViewExecution(null)}>
        <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span>Execution Details</span>
              {viewExecution && <StatusBadge status={viewExecution.status} variant="execution" />}
            </DialogTitle>
            <DialogDescription>
              {viewExecution?.execution_id} - {viewExecution?.testCaseTitle}
            </DialogDescription>
          </DialogHeader>
          
          {viewExecution && (
            <div className="space-y-4">
              {/* Execution Info */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <p className="text-xs text-muted-foreground">Test Case</p>
                  <p className="text-sm font-medium">{viewExecution.testCaseId}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Project</p>
                  <p className="text-sm font-medium">{viewExecution.projectName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Executed By</p>
                  <p className="text-sm font-medium">{viewExecution.executorName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Date</p>
                  <p className="text-sm font-medium">{new Date(viewExecution.executed_at).toLocaleString()}</p>
                </div>
                {viewExecution.environment && (
                  <div>
                    <p className="text-xs text-muted-foreground">Environment</p>
                    <p className="text-sm font-medium">{viewExecution.environment}</p>
                  </div>
                )}
                {viewExecution.browser && (
                  <div>
                    <p className="text-xs text-muted-foreground">Browser</p>
                    <p className="text-sm font-medium capitalize">{viewExecution.browser}</p>
                  </div>
                )}
                {viewExecution.execution_time && (
                  <div>
                    <p className="text-xs text-muted-foreground">Duration</p>
                    <p className="text-sm font-medium">{formatTime(viewExecution.execution_time)}</p>
                  </div>
                )}
              </div>

              {viewExecution.comments && (
                <div className="p-3 bg-muted/30 rounded-lg">
                  <p className="text-xs text-muted-foreground mb-1">Comments</p>
                  <p className="text-sm">{viewExecution.comments}</p>
                </div>
              )}

              {/* Step Results */}
              <div>
                <h4 className="text-sm font-semibold mb-3">Step Results</h4>
                {loadingViewSteps ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : viewSteps.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-4">No step results recorded</p>
                ) : (
                  <div className="space-y-2">
                    {viewSteps.map((step, index) => (
                      <div key={index} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-sm font-medium">Step {step.step_number}</span>
                              {getStatusIcon(step.status)}
                              <span className="text-xs capitalize text-muted-foreground">{step.status}</span>
                            </div>
                            <p className="text-sm">{step.action}</p>
                            {step.expected_result && (
                              <p className="text-xs text-muted-foreground mt-1">
                                <span className="font-medium">Expected:</span> {step.expected_result}
                              </p>
                            )}
                          </div>
                        </div>
                        {(step.actual_result || step.notes) && (
                          <div className="mt-2 pt-2 border-t grid grid-cols-2 gap-2">
                            {step.actual_result && (
                              <div>
                                <p className="text-xs text-muted-foreground">Actual Result</p>
                                <p className="text-sm">{step.actual_result}</p>
                              </div>
                            )}
                            {step.notes && (
                              <div>
                                <p className="text-xs text-muted-foreground">Notes</p>
                                <p className="text-sm">{step.notes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewExecution(null)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

export default Executions;
