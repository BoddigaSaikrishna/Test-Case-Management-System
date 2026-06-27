interface StatusBadgeProps {
  status: string;
  variant?: "execution" | "priority" | "severity" | "defect";
}

const statusStyles: Record<string, Record<string, string>> = {
  execution: {
    // Uppercase versions
    Pass: "bg-green-100 text-green-700 border-green-300",
    Fail: "bg-red-100 text-red-700 border-red-300",
    Blocked: "bg-yellow-100 text-yellow-700 border-yellow-300",
    Pending: "bg-gray-100 text-gray-600 border-gray-300",
    "Not Executed": "bg-gray-100 text-gray-500 border-gray-300",
    // Lowercase versions (from database)
    pass: "bg-green-100 text-green-700 border-green-300",
    fail: "bg-red-100 text-red-700 border-red-300",
    blocked: "bg-yellow-100 text-yellow-700 border-yellow-300",
    pending: "bg-gray-100 text-gray-600 border-gray-300",
    // Test case status
    draft: "bg-gray-100 text-gray-600 border-gray-300",
    active: "bg-blue-100 text-blue-700 border-blue-300",
    deprecated: "bg-orange-100 text-orange-700 border-orange-300",
  },
  priority: {
    high: "bg-red-100 text-red-700 border-red-300",
    medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
    low: "bg-blue-100 text-blue-700 border-blue-300",
    High: "bg-red-100 text-red-700 border-red-300",
    Medium: "bg-yellow-100 text-yellow-700 border-yellow-300",
    Low: "bg-blue-100 text-blue-700 border-blue-300",
  },
  severity: {
    critical: "bg-red-100 text-red-700 border-red-300",
    major: "bg-orange-100 text-orange-700 border-orange-300",
    minor: "bg-yellow-100 text-yellow-700 border-yellow-300",
    trivial: "bg-blue-100 text-blue-700 border-blue-300",
    Critical: "bg-red-100 text-red-700 border-red-300",
    Major: "bg-orange-100 text-orange-700 border-orange-300",
    Minor: "bg-yellow-100 text-yellow-700 border-yellow-300",
    Trivial: "bg-blue-100 text-blue-700 border-blue-300",
  },
  defect: {
    open: "bg-red-100 text-red-700 border-red-300",
    assigned: "bg-yellow-100 text-yellow-700 border-yellow-300",
    "in-progress": "bg-blue-100 text-blue-700 border-blue-300",
    fixed: "bg-green-100 text-green-700 border-green-300",
    retest: "bg-purple-100 text-purple-700 border-purple-300",
    closed: "bg-gray-100 text-gray-600 border-gray-300",
    verified: "bg-green-100 text-green-700 border-green-300",
    Open: "bg-red-100 text-red-700 border-red-300",
    Assigned: "bg-yellow-100 text-yellow-700 border-yellow-300",
    "In Progress": "bg-blue-100 text-blue-700 border-blue-300",
    Fixed: "bg-green-100 text-green-700 border-green-300",
    Retest: "bg-purple-100 text-purple-700 border-purple-300",
    Closed: "bg-gray-100 text-gray-600 border-gray-300",
    Verified: "bg-green-100 text-green-700 border-green-300",
  },
};

const StatusBadge = ({ status, variant = "execution" }: StatusBadgeProps) => {
  const style = statusStyles[variant]?.[status] || "bg-gray-100 text-gray-600 border-gray-300";
  const displayText = status.charAt(0).toUpperCase() + status.slice(1);

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${style}`}>
      {displayText}
    </span>
  );
};

export default StatusBadge;
