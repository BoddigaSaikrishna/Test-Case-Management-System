interface StatusBadgeProps {
  status: string;
  variant?: "execution" | "priority" | "severity" | "defect";
}

const statusStyles: Record<string, Record<string, string>> = {
  execution: {
    Pass: "bg-success/10 text-success border-success/20",
    Fail: "bg-destructive/10 text-destructive border-destructive/20",
    Blocked: "bg-warning/10 text-warning border-warning/20",
    "Not Executed": "bg-muted text-muted-foreground border-border",
  },
  priority: {
    High: "bg-destructive/10 text-destructive border-destructive/20",
    Medium: "bg-warning/10 text-warning border-warning/20",
    Low: "bg-info/10 text-info border-info/20",
  },
  severity: {
    Critical: "bg-destructive/10 text-destructive border-destructive/20",
    Major: "bg-warning/10 text-warning border-warning/20",
    Minor: "bg-info/10 text-info border-info/20",
  },
  defect: {
    Open: "bg-destructive/10 text-destructive border-destructive/20",
    Assigned: "bg-warning/10 text-warning border-warning/20",
    "In Progress": "bg-info/10 text-info border-info/20",
    Fixed: "bg-success/10 text-success border-success/20",
    Retest: "bg-accent/10 text-accent border-accent/20",
    Closed: "bg-muted text-muted-foreground border-border",
  },
};

const StatusBadge = ({ status, variant = "execution" }: StatusBadgeProps) => {
  const style = statusStyles[variant]?.[status] || "bg-muted text-muted-foreground border-border";

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${style}`}>
      {status}
    </span>
  );
};

export default StatusBadge;
