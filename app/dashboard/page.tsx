import { JobsTable } from "@/components/jobs-table";
import { Button } from "@/components/ui/button";
import { ImageIcon } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-4xl font-bold tracking-tight mb-2">
              Dashboard
            </h1>
            <p className="text-muted-foreground text-lg">
              Manage and monitor your content automation jobs
            </p>
          </div>
          <div className="flex gap-3">
            <Link href="/image-generator">
              <Button variant="outline" className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4" />
                Image Generator
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline">Create New Job</Button>
            </Link>
          </div>
        </div>

        <JobsTable />
      </div>
    </div>
  );
}
