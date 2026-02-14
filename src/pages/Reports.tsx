import AppLayout from "@/components/AppLayout";

const Reports = () => (
  <AppLayout title="Reports">
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {[
        { title: "Test Execution Report", desc: "Summary of all test executions with pass/fail rates" },
        { title: "Defect Summary Report", desc: "Overview of defects by severity, priority, and status" },
        { title: "Tester Performance", desc: "Individual tester productivity and quality metrics" },
      ].map((report) => (
        <div key={report.title} className="bg-card rounded-lg border p-5 hover:shadow-md transition-shadow cursor-pointer">
          <h3 className="font-semibold text-card-foreground">{report.title}</h3>
          <p className="text-sm text-muted-foreground mt-1">{report.desc}</p>
          <button className="text-xs text-accent hover:underline font-medium mt-3 inline-block">
            Generate Report →
          </button>
        </div>
      ))}
    </div>
  </AppLayout>
);

export default Reports;
