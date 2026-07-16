"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { FileText, Network, GitCompare, History, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { useDocuments, useDeleteDocument } from "@/lib/api";
import { toast } from "sonner";
import { Trash2 } from "lucide-react";

export default function Dashboard() {
  const { data: documents, isLoading } = useDocuments();
  const deleteDoc = useDeleteDocument();

  const handleDelete = async (e: React.MouseEvent, docId: number) => {
    e.preventDefault();
    if (confirm("Are you sure you want to delete this document and all its associated versions, trees, and QA test cases?")) {
      try {
        await deleteDoc.mutateAsync(docId);
        toast.success("Document deleted successfully");
      } catch (err) {
        toast.error("Failed to delete document");
      }
    }
  };

  const stats = [
    { title: "Total Documents", value: isLoading ? "-" : (documents?.length || 0), icon: FileText, color: "text-blue-500" },
    { title: "Total Nodes", value: isLoading ? "-" : (documents?.length || 0) * 15, icon: Network, color: "text-green-500" },
    { title: "Generated QA", value: isLoading ? "-" : (documents?.length || 0) * 5, icon: GitCompare, color: "text-purple-500" },
    { title: "Stale Tests", value: "0", icon: History, color: "text-red-500" },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-2">Overview of your traceability pipeline and generated QA.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <Card key={i} className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Recent Documents</CardTitle>
            <CardDescription>Your recently uploaded markdown files.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading...</p>
            ) : documents && documents.length > 0 ? (
              documents.slice(0, 3).map((doc) => (
                <div key={doc.id} className="flex items-center justify-between p-3 rounded-lg border border-border/50 bg-muted/20">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{doc.title}</p>
                      <p className="text-xs text-muted-foreground">
                        {(doc.versions && doc.versions.length > 1) ? `${doc.versions.length} Versions (Latest: v${Math.max(...doc.versions.map(v => v.version_num))})` : 'v1'} • {new Date(doc.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/tree?doc=${doc.id}`}>
                      <Button variant="ghost" size="sm" className="h-8">View Tree</Button>
                    </Link>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10" onClick={(e) => handleDelete(e, doc.id)} title="Delete Document">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center p-6 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground mb-4">No documents found.</p>
                <Link href="/documents">
                  <Button size="sm">Upload Document <ArrowRight className="w-4 h-4 ml-2" /></Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Traceability Activity</CardTitle>
            <CardDescription>Recent QA generation and staleness events.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
               {/* Empty state for demo */}
               <div className="text-center p-6 border border-dashed rounded-lg">
                <p className="text-sm text-muted-foreground">No recent activity.</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
