"use client";

import { useState, useRef } from "react";
import { useDocuments, useStalenessDashboard } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { AlertTriangle, CheckCircle, FileText, ArrowRight, Download, Activity, FileDigit, ListChecks, ChevronRight } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { DiffViewer } from "@/components/features/diff-viewer";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

export default function StalenessPage() {
  const { data: documents } = useDocuments();

  const [docId, setDocId] = useState<string>("");
  const [oldV, setOldV] = useState<string>("");
  const [newV, setNewV] = useState<string>("");
  const [runCheck, setRunCheck] = useState(false);
  
  const selectedDoc = documents?.find(d => d.id.toString() === docId);

  const { data: dashboardData, isLoading } = useStalenessDashboard(
    runCheck ? Number(oldV) : null, 
    runCheck ? Number(newV) : null
  );

  const [selectedQa, setSelectedQa] = useState<{
    tc_id: string;
    title: string;
    requirement: string;
    change_reason: string;
    severity: string;
    status: string;
    recommended_action: string;
    stale_reasons: Array<{node_id: string, status: string}>;
    generation_id: number;
  } | null>(null);
  const [filterType, setFilterType] = useState<string>("All");

  const reportRef = useRef<HTMLDivElement>(null);

  const handleCheck = () => {
    if (!oldV || !newV) return;
    setRunCheck(true);
    toast.info("Analyzing staleness...");
  };

  const getSeverityColor = (sev: string) => {
    if (sev === "High") return "bg-red-500/10 text-red-500 border-red-500/20";
    if (sev === "Medium") return "bg-orange-500/10 text-orange-500 border-orange-500/20";
    return "bg-blue-500/10 text-blue-500 border-blue-500/20";
  };

  const exportJSON = () => {
    if (!dashboardData) return;
    const blob = new Blob([JSON.stringify(dashboardData, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staleness-report-${oldV}-${newV}.json`;
    a.click();
    toast.success("JSON Report exported");
  };

  const exportMarkdown = () => {
    if (!dashboardData) return;
    let md = `# Staleness Report\n\n## Summary\n`;
    md += `- Total Requirements: ${dashboardData.summary.total_requirements}\n`;
    md += `- Modified: ${dashboardData.summary.modified}\n`;
    md += `- Added: ${dashboardData.summary.added}\n`;
    md += `- Deleted: ${dashboardData.summary.deleted}\n`;
    md += `- Stale QA: ${dashboardData.summary.stale_qa}\n\n`;
    
    md += `## Changed Requirements\n`;
    dashboardData.changed_requirements.forEach(r => {
      md += `### ${r.title} (${r.change_type})\nSeverity: ${r.severity}\n\n`;
    });

    md += `## Affected QA\n`;
    dashboardData.affected_qa.forEach(qa => {
      md += `### ${qa.tc_id}: ${qa.title}\nStatus: ${qa.status} | Recommended Action: ${qa.recommended_action}\n\n`;
    });

    const blob = new Blob([md], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `staleness-report-${oldV}-${newV}.md`;
    a.click();
    toast.success("Markdown Report exported");
  };

  const exportPDF = async () => {
    if (!reportRef.current) return;
    toast.info("Generating PDF...");
    const canvas = await html2canvas(reportRef.current, { scale: 2 });
    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF("p", "mm", "a4");
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
    pdf.save(`staleness-report-${oldV}-${newV}.pdf`);
    toast.success("PDF Report exported");
  };

  return (
    <div className="p-8 max-w-6xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-8 pb-20">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Staleness Analysis Dashboard</h1>
          <p className="text-muted-foreground mt-2">Track impact of document changes on QA traceability.</p>
        </div>
        {dashboardData && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={exportPDF}>Export as PDF</DropdownMenuItem>
              <DropdownMenuItem onClick={exportMarkdown}>Export as Markdown</DropdownMenuItem>
              <DropdownMenuItem onClick={exportJSON}>Export as JSON</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Card className="border-border/50">
        <CardContent className="p-6">
          <div className="grid grid-cols-4 gap-6 items-end">
            <div className="space-y-2">
              <label className="text-sm font-medium">Document</label>
              <Select value={docId} onValueChange={(v) => { setDocId(v); setRunCheck(false); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a document" />
                </SelectTrigger>
                <SelectContent>
                  {documents?.map(d => (
                    <SelectItem key={d.id} value={d.id.toString()}>{d.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Baseline Version (Has QA)</label>
              <Select value={oldV} onValueChange={(v) => { setOldV(v); setRunCheck(false); }} disabled={!selectedDoc}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {selectedDoc?.versions?.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>Version {v.version_num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Current Version</label>
              <Select value={newV} onValueChange={(v) => { setNewV(v); setRunCheck(false); }} disabled={!selectedDoc}>
                <SelectTrigger>
                  <SelectValue placeholder="Select version" />
                </SelectTrigger>
                <SelectContent>
                  {selectedDoc?.versions?.map(v => (
                    <SelectItem key={v.id} value={v.id.toString()}>Version {v.version_num}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button 
              className="w-full gap-2" 
              disabled={!oldV || !newV || isLoading}
              onClick={handleCheck}
            >
              <Activity className="w-4 h-4" />
              {isLoading ? "Analyzing..." : "Analyze Impact"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {dashboardData && (
        <div ref={reportRef} className="space-y-8 bg-background">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card className="border-border/50">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Total Requirements
                </p>
                <h3 className="text-3xl font-bold mt-2">{dashboardData.summary.total_requirements}</h3>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <FileDigit className="w-4 h-4" /> Requirement Changes
                </p>
                <div className="flex gap-4 mt-2">
                  <div>
                    <span className="text-3xl font-bold text-blue-500">{dashboardData.summary.modified}</span>
                    <span className="text-xs text-muted-foreground block uppercase">Mod</span>
                  </div>
                  <div>
                    <span className="text-3xl font-bold text-green-500">{dashboardData.summary.added}</span>
                    <span className="text-xs text-muted-foreground block uppercase">Add</span>
                  </div>
                  <div>
                    <span className="text-3xl font-bold text-red-500">{dashboardData.summary.deleted}</span>
                    <span className="text-xs text-muted-foreground block uppercase">Del</span>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <ListChecks className="w-4 h-4" /> Total QA Generated
                </p>
                <h3 className="text-3xl font-bold mt-2">{dashboardData.summary.qa_generated}</h3>
              </CardContent>
            </Card>
            <Card className={`border ${dashboardData.summary.stale_qa > 0 ? 'border-red-500/50' : 'border-green-500/50'}`}>
              <CardContent className="p-6">
                <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  {dashboardData.summary.stale_qa > 0 ? <AlertTriangle className="w-4 h-4 text-red-500" /> : <CheckCircle className="w-4 h-4 text-green-500" />}
                  Stale QA Items
                </p>
                <h3 className={`text-3xl font-bold mt-2 ${dashboardData.summary.stale_qa > 0 ? 'text-red-500' : 'text-green-500'}`}>
                  {dashboardData.summary.stale_qa} <span className="text-base font-normal text-muted-foreground">/ {dashboardData.summary.qa_generated}</span>
                </h3>
              </CardContent>
            </Card>
          </div>

          {/* Timeline */}
          <Card className="border-border/50">
            <CardContent className="p-6 flex items-center justify-between text-sm font-medium text-muted-foreground">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">1</div>
                Version {oldV} Baseline
              </div>
              <ArrowRight className="w-4 h-4 opacity-50" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">2</div>
                QA Generated
              </div>
              <ArrowRight className="w-4 h-4 opacity-50" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">3</div>
                Version {newV} Modified Req
              </div>
              <ArrowRight className="w-4 h-4 text-blue-500" />
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center">4</div>
                QA Invalidated
              </div>
            </CardContent>
          </Card>

          <Tabs defaultValue="qa">
            <div className="flex items-center justify-between mb-4">
              <TabsList>
                <TabsTrigger value="qa">Affected QA ({dashboardData.affected_qa.length})</TabsTrigger>
                <TabsTrigger value="req">Requirement Impact ({dashboardData.changed_requirements.length})</TabsTrigger>
              </TabsList>
              
              <div className="flex gap-2">
                <Badge variant={filterType === "All" ? "default" : "outline"} className="cursor-pointer" onClick={() => setFilterType("All")}>All</Badge>
                <Badge variant={filterType === "Stale" ? "destructive" : "outline"} className="cursor-pointer" onClick={() => setFilterType("Stale")}>Stale Only</Badge>
                <Badge variant={filterType === "High" ? "default" : "outline"} className="cursor-pointer bg-red-500/20 text-red-500 hover:bg-red-500/30 border-red-500/30" onClick={() => setFilterType("High")}>High Severity</Badge>
              </div>
            </div>

            <TabsContent value="qa" className="m-0">
              <Card className="border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>TC ID</TableHead>
                      <TableHead>Title</TableHead>
                      <TableHead>Requirement</TableHead>
                      <TableHead>Change Reason</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.affected_qa
                      .filter(q => filterType === "All" || (filterType === "Stale" && q.status === "Stale") || (filterType === "High" && q.severity === "High"))
                      .map((qa, i) => (
                      <TableRow key={i} className="cursor-pointer hover:bg-muted/50" onClick={() => setSelectedQa(qa)}>
                        <TableCell className="font-mono text-xs">{qa.tc_id}</TableCell>
                        <TableCell className="font-medium max-w-[250px] truncate">{qa.title}</TableCell>
                        <TableCell className="text-muted-foreground">{qa.requirement}</TableCell>
                        <TableCell>{qa.change_reason}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getSeverityColor(qa.severity)}>{qa.severity}</Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{qa.recommended_action}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm">Trace <ChevronRight className="w-4 h-4 ml-1" /></Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {dashboardData.affected_qa.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                          No affected QA tests found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>

            <TabsContent value="req" className="m-0">
              <Card className="border-border/50">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Req ID</TableHead>
                      <TableHead>Section / Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Severity</TableHead>
                      <TableHead>Hash</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dashboardData.changed_requirements
                      .filter(r => filterType === "All" || (filterType === "High" && r.severity === "High"))
                      .map((req, i) => (
                      <TableRow key={i}>
                        <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[120px]">{req.requirement_id}</TableCell>
                        <TableCell className="font-medium max-w-[300px] truncate">{req.title}</TableCell>
                        <TableCell>
                           {req.change_type === "deleted" ? <Badge variant="destructive">Deleted</Badge> : req.change_type === "added" ? <Badge className="bg-green-600">Added</Badge> : <Badge className="bg-blue-600">Modified</Badge>}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={getSeverityColor(req.severity)}>{req.severity}</Badge>
                        </TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">{req.new_hash ? req.new_hash.substring(0, 8) : req.old_hash?.substring(0, 8)}</TableCell>
                      </TableRow>
                    ))}
                    {dashboardData.changed_requirements.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                          No requirement changes found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}

      <Sheet open={!!selectedQa} onOpenChange={(open) => !open && setSelectedQa(null)}>
        <SheetContent className="w-[600px] sm:max-w-none overflow-y-auto">
          <SheetHeader className="mb-6">
            <SheetTitle>Interactive Trace: {selectedQa?.tc_id}</SheetTitle>
            <SheetDescription>
              This test case was invalidated because its parent requirements were modified.
            </SheetDescription>
          </SheetHeader>
          
          {selectedQa && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">Test Case Title</p>
                  <p className="font-medium">{selectedQa.title}</p>
                </div>
                <div>
                  <p className="text-muted-foreground mb-1">Recommended Action</p>
                  <Badge variant="outline" className={getSeverityColor(selectedQa.severity)}>{selectedQa.recommended_action}</Badge>
                </div>
              </div>
              
              <h3 className="font-semibold text-lg border-b pb-2">Requirement Diffs</h3>
              <div className="space-y-6">
                {selectedQa.stale_reasons.map((reason: {node_id: string, status: string}, idx: number) => {
                  const fullReq = dashboardData?.changed_requirements.find(r => r.requirement_id === reason.node_id);
                  if (!fullReq) return null;

                  return (
                    <Card key={idx} className="border-border/50">
                      <CardHeader className="bg-muted/30 py-3">
                        <CardTitle className="text-sm flex items-center justify-between">
                          <span className="truncate max-w-[400px]">{fullReq.title}</span>
                          <Badge variant="outline">{fullReq.change_type}</Badge>
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <DiffViewer oldContent={fullReq.old_content} newContent={fullReq.new_content} />
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

    </div>
  );
}
