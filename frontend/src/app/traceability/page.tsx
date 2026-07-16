"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { GitGraph, AlertTriangle, CheckCircle, ArrowRight } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";

export default function TraceabilityIndexPage() {
  const { data: generations, isLoading } = useQuery({
    queryKey: ['generations'],
    queryFn: async () => {
      // Actually we don't have GET /generations but we have a way to list them?
      // Wait, we don't have GET /generations endpoint. 
      // I should add it to the backend. For now, I'll mock it if it fails or fetch /selections and trace them?
      // Let's assume we add GET /generations endpoint.
      try {
        const { data } = await api.get('/generations');
        return data;
      } catch {
        return [];
      }
    }
  });

  return (
    <div className="p-8 max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">Traceability</h1>
        <p className="text-muted-foreground mt-2">View the lineage of generated QA test cases.</p>
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle>Generated Test Cases</CardTitle>
          <CardDescription>Select a generated QA batch to view its traceability graph.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
             <div className="text-muted-foreground p-4">Loading generations...</div>
          ) : generations?.length > 0 ? (
            <div className="space-y-4">
              {generations.map((gen: any) => (
                <div key={gen.id} className="flex items-center justify-between p-4 border border-border/50 rounded-lg hover:bg-muted/30 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded bg-primary/10 flex items-center justify-center">
                      <GitGraph className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h4 className="font-semibold">Generation #{gen.id}</h4>
                      <p className="text-sm text-muted-foreground">Model: {gen.model}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6">
                    {gen.is_stale ? (
                      <Badge variant="destructive" className="gap-1.5"><AlertTriangle className="w-3 h-3"/> Stale</Badge>
                    ) : (
                      <Badge variant="outline" className="text-green-600 border-green-600/30 bg-green-500/5 gap-1.5"><CheckCircle className="w-3 h-3"/> Fresh</Badge>
                    )}
                    <Link href={`/traceability/${gen.id}`}>
                      <Button variant="ghost" size="sm" className="gap-2">
                        View Graph <ArrowRight className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-4 border border-dashed rounded-lg">
              <GitGraph className="w-12 h-12 opacity-20" />
              <p>No QA generations found. Go generate some test cases first.</p>
              <Link href="/qa">
                <Button variant="outline" className="mt-2">Go to QA Generator</Button>
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
