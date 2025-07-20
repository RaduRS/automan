import { JobsTable } from "@/components/jobs-table";

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center pt-8">
          <h1 className="text-4xl font-bold tracking-tight mb-2 pt-8 text-white">
            Dashboard
          </h1>
          <p className="text-gray-300 text-lg pb-16">
            Manage and monitor your content automation jobs
          </p>
        </div>

        <JobsTable />
      </div>
    </div>
  );
}
