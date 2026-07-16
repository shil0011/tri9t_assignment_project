"use client";

import { useState } from "react";
import { useDocuments, useVersionNodes, useCreateSelection, useGenerateQA } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { BrainCircuit, Check, CheckCircle2, Download, Copy, Eye, AlertTriangle, FileText, FileDown, Layers, FileJson, FileSpreadsheet } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect } from "react";
import { TraceabilityPanel } from "@/components/features/traceability-panel";
import jsPDF from "jspdf";

export default function QAPage() {
  const { data: documents } = useDocuments();
  const [selectedDocId, setSelectedDocId] = useState<number | null>(null);
  
  const doc = documents?.find(d => d.id === selectedDocId);
  
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");

  useEffect(() => {
    if (doc?.versions && doc.versions.length > 0) {
      const highestVersion = [...doc.versions].sort((a, b) => b.version_num - a.version_num)[0];
      setSelectedVersionId(highestVersion.id.toString());
    } else {
      setSelectedVersionId("");
    }
  }, [doc]);

  const versionId = selectedVersionId ? Number(selectedVersionId) : null;
  
  const { data: nodes } = useVersionNodes(versionId);
  
  const [selectedNodeIds, setSelectedNodeIds] = useState<number[]>([]);
  const createSelection = useCreateSelection();
  const generateQA = useGenerateQA();

  const [generationResult, setGenerationResult] = useState<any>(null);
  
  const [loadingPhase, setLoadingPhase] = useState<number>(0);
  const [panelOpen, setPanelOpen] = useState(false);
  const [panelMetadata, setPanelMetadata] = useState<any>(null);

  const toggleNode = (id: number) => {
    setSelectedNodeIds(prev => 
      prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
    );
  };

  const handleGenerate = async () => {
    if (selectedNodeIds.length === 0 || !versionId) return;
    try {
      setLoadingPhase(1);
      const selection = await createSelection.mutateAsync({
        name: `Selection - ${new Date().toISOString()}`,
        node_ids: selectedNodeIds
      });
      
      setLoadingPhase(2);
      setTimeout(() => setLoadingPhase(3), 1500);
      setTimeout(() => setLoadingPhase(4), 3000);
      
      const generation = await generateQA.mutateAsync({
        selection_id: selection.id,
        version_id: versionId,
        model: "llama-3.3-70b-versatile"
      });
      
      setLoadingPhase(5);
      setTimeout(() => {
        setGenerationResult(generation);
        setLoadingPhase(0);
        toast.success("QA test cases generated successfully!");
      }, 500);
      
    } catch (error: any) {
      setLoadingPhase(0);
      const msg = error?.response?.data?.detail || error.message || "Unknown error occurred.";
      toast.error(`Failed to generate QA: ${msg}`);
    }
  };

  const loadingMessages = [
    "",
    "Reading selected nodes...",
    "Analyzing requirements...",
    "Designing QA scenarios...",
    "Validating structured output...",
    "Finalizing traceability...",
    "Complete."
  ];

  const getPriorityColor = (priority: string) => {
    const p = priority?.toLowerCase() || "";
    if (p.includes("high")) return "bg-red-500 border-red-500";
    if (p.includes("medium")) return "bg-yellow-500 border-yellow-500";
    if (p.includes("low")) return "bg-blue-500 border-blue-500";
    return "bg-slate-500 border-slate-500";
  };

  const handleExportJSON = () => {
    if (!generationResult?.output?.test_cases) return;
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(generationResult.output.test_cases, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "test_cases.json");
    dlAnchorElem.click();
  };

  const handleExportCSV = () => {
    if (!generationResult?.output?.test_cases) return;
    const tcs = generationResult.output.test_cases;
    const header = ["ID", "Title", "Requirement", "Priority", "Category", "Expected Result"];
    const csvContent = "data:text/csv;charset=utf-8," 
      + header.join(",") + "\n"
      + tcs.map((tc:any, i:number) => `TC-${String(i+1).padStart(3, '0')},"${tc.title}","${tc.requirement_reference}","${tc.priority}","${tc.category}","${tc.expected_result}"`).join("\n");
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", csvContent);
    dlAnchorElem.setAttribute("download", "test_cases.csv");
    dlAnchorElem.click();
  };

  const handleExportMD = () => {
    if (!generationResult?.output?.test_cases) return;
    let md = "# QA Test Cases\n\n";
    generationResult.output.test_cases.forEach((tc: any, i: number) => {
      md += `## TC-${String(i+1).padStart(3, '0')}: ${tc.title}\n`;
      md += `- **Requirement:** ${tc.requirement_reference}\n`;
      md += `- **Priority:** ${tc.priority} | **Category:** ${tc.category}\n\n`;
      md += `### Preconditions\n${tc.preconditions?.map((p:string)=>`- ${p}`).join("\n")}\n\n`;
      md += `### Steps\n${tc.steps?.map((s:string,idx:number)=>`${idx+1}. ${s}`).join("\n")}\n\n`;
      md += `### Expected Result\n${tc.expected_result}\n\n`;
      md += `---\n\n`;
    });
    const dataStr = "data:text/markdown;charset=utf-8," + encodeURIComponent(md);
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "test_cases.md");
    dlAnchorElem.click();
  };

  const handleExportPDF = () => {
    if (!generationResult?.output?.test_cases) return;
    const doc = new jsPDF();
    let y = 20;
    doc.setFontSize(18);
    doc.text("QA Test Cases", 20, y);
    y += 15;
    doc.setFontSize(12);
    
    generationResult.output.test_cases.forEach((tc: any, i: number) => {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.text(`TC-${String(i+1).padStart(3, '0')}: ${tc.title}`, 20, y);
      y += 8;
      doc.setFontSize(10);
      doc.text(`Requirement: ${tc.requirement_reference} | Priority: ${tc.priority}`, 20, y);
      y += 8;
      doc.text(`Expected: ${tc.expected_result}`, 20, y);
      y += 15;
    });
    doc.save("test_cases.pdf");
  };

  const openTraceability = () => {
    if (generationResult?.output?.traceability) {
      setPanelMetadata(generationResult.output.traceability);
      setPanelOpen(true);
    }
  };

  return (
    <div className="p-8 h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center justify-between mb-8 shrink-0">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">QA Generator</h1>
          <p className="text-muted-foreground mt-2">Design professional QA Test Cases automatically.</p>
        </div>
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        {/* Left Col: Setup */}
        <div className="w-1/3 flex flex-col gap-6">
          <Card className="border-border/50 shrink-0">
            <CardHeader className="pb-4">
              <CardTitle className="text-lg">1. Select Document</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
                {documents?.map(d => (
                  <div 
                    key={d.id} 
                    onClick={() => setSelectedDocId(d.id)}
                    className={`p-3 rounded-lg border cursor-pointer flex items-center justify-between ${selectedDocId === d.id ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted'}`}
                  >
                    <span className="font-medium text-sm">{d.title}</span>
                    {selectedDocId === d.id && <CheckCircle2 className="w-4 h-4 text-primary" />}
                  </div>
                ))}
                {!documents?.length && <p className="text-sm text-muted-foreground">No documents available.</p>}
              </div>

              {doc?.versions && doc.versions.length > 0 && (
                <div className="mt-4 pt-4 border-t border-border/50 space-y-2">
                  <span className="text-sm font-medium">Version</span>
                  <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select version" />
                    </SelectTrigger>
                    <SelectContent>
                      {[...doc.versions].sort((a, b) => b.version_num - a.version_num).map(v => (
                        <SelectItem key={v.id} value={v.id.toString()}>
                          Version {v.version_num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/50 flex-1 flex flex-col min-h-0">
            <CardHeader className="pb-4 shrink-0">
              <CardTitle className="text-lg">2. Select Nodes</CardTitle>
              <CardDescription>Choose sections to base QA on.</CardDescription>
            </CardHeader>
            <CardContent className="flex-1 min-h-0 p-0">
              <ScrollArea className="h-full px-6 pb-6">
                <div className="space-y-2">
                  {nodes?.map(node => (
                    <div 
                      key={node.id} 
                      onClick={() => toggleNode(node.id)}
                      className={`p-3 rounded-lg border cursor-pointer flex items-start gap-3 transition-colors ${selectedNodeIds.includes(node.id) ? 'border-primary bg-primary/5' : 'border-border/50 hover:bg-muted'}`}
                    >
                      <div className={`mt-0.5 w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedNodeIds.includes(node.id) ? 'bg-primary border-primary' : 'border-input bg-background'}`}>
                        {selectedNodeIds.includes(node.id) && <Check className="w-3 h-3 text-primary-foreground" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium truncate">{node.title}</span>
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">H{node.level}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground line-clamp-1 mt-1">{node.body || "No text"}</p>
                      </div>
                    </div>
                  ))}
                  {!nodes?.length && selectedDocId && <p className="text-sm text-muted-foreground">No nodes found.</p>}
                  {!selectedDocId && <p className="text-sm text-muted-foreground">Select a document first.</p>}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>

        {/* Right Col: Generation */}
        <div className="w-2/3 flex flex-col gap-6">
          <Card className="border-border/50 flex-1 flex flex-col min-h-0 overflow-hidden shadow-sm">
            <CardHeader className="border-b border-border/50 bg-muted/10 pb-4 shrink-0 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-primary" />
                  Test Case Suite
                </CardTitle>
                <CardDescription className="mt-1.5 flex items-center gap-2">
                  <span>Using Llama-3.3-70b via Groq</span>
                  {generationResult && (
                    <Badge variant={generationResult.is_stale ? "destructive" : "secondary"} className="ml-2 text-xs">
                      {generationResult.is_stale ? "Stale - Review Needed" : "Fresh"}
                    </Badge>
                  )}
                </CardDescription>
              </div>
              <div className="flex items-center gap-3">
                {generationResult && (
                  <div className="flex items-center gap-2 bg-muted/50 p-1 rounded-md border border-border/50 mr-2">
                    <Button variant="ghost" size="icon" className="w-8 h-8" title="Export JSON" onClick={handleExportJSON}>
                      <FileJson className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8" title="Export CSV" onClick={handleExportCSV}>
                      <FileSpreadsheet className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8" title="Export MD" onClick={handleExportMD}>
                      <FileText className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    <Button variant="ghost" size="icon" className="w-8 h-8" title="Export PDF" onClick={handleExportPDF}>
                      <FileDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                  </div>
                )}
                
                <Button 
                  onClick={handleGenerate} 
                  disabled={selectedNodeIds.length === 0 || createSelection.isPending || generateQA.isPending}
                  className="gap-2"
                >
                  {generateQA.isPending ? (
                    <><BrainCircuit className="w-4 h-4 animate-pulse" /> Generating...</>
                  ) : (
                    <><BrainCircuit className="w-4 h-4" /> Generate TC Suite</>
                  )}
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="flex-1 min-h-0 p-0 bg-muted/5">
              <ScrollArea className="h-full p-6">
                {!generationResult && !generateQA.isPending && (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground min-h-[400px]">
                    <Layers className="w-16 h-16 opacity-10 mb-6" />
                    <h3 className="text-lg font-medium text-foreground/70 mb-2">No Test Cases Generated</h3>
                    <p className="text-center max-w-sm">Select one or more requirement nodes on the left and click generate to create a professional test suite.</p>
                  </div>
                )}
                
                {generateQA.isPending && (
                  <div className="h-full flex flex-col items-center justify-center min-h-[400px] gap-6">
                    <div className="relative">
                      <div className="w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                      <BrainCircuit className="w-6 h-6 text-primary absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" />
                    </div>
                    <div className="text-center space-y-2">
                      <h3 className="text-lg font-medium text-foreground">Processing Documentation</h3>
                      <p className="text-sm text-muted-foreground animate-pulse">{loadingMessages[loadingPhase]}</p>
                    </div>
                  </div>
                )}
                
                {generationResult?.output?.test_cases && (
                  <div className="space-y-6 pb-12">
                    {generationResult.output.test_cases.map((tc: any, i: number) => {
                      const priorityClass = getPriorityColor(tc.priority);
                      const tcId = `TC-${String(i+1).padStart(3, '0')}`;
                      
                      return (
                        <div key={i} className="flex rounded-xl border border-border/60 bg-card shadow-sm overflow-hidden group">
                          {/* Left Priority Strip */}
                          <div className={`w-2 shrink-0 ${priorityClass} opacity-80 group-hover:opacity-100 transition-opacity`}></div>
                          
                          <div className="flex-1 p-0">
                            {/* Header */}
                            <div className="px-5 py-4 border-b border-border/40 bg-muted/10 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className="font-mono font-bold text-foreground">{tcId}</span>
                                <Badge variant="outline" className="bg-background text-xs font-medium border-muted-foreground/30">{tc.category}</Badge>
                                <Badge variant="outline" className="bg-background text-xs font-medium border-muted-foreground/30">{tc.priority} Priority</Badge>
                              </div>
                              <div className="flex items-center gap-2">
                                {generationResult.is_stale && (
                                  <div className="flex items-center gap-2 bg-destructive/10 border border-destructive/20 pl-2 pr-1 py-1 rounded-md">
                                    <Badge variant="destructive" className="text-[10px] h-5 px-1.5 flex items-center gap-1">
                                      <AlertTriangle className="w-3 h-3" /> Stale - Changed in Newer Version
                                    </Badge>
                                    <Button variant="outline" size="sm" className="h-5 text-[10px] px-2 bg-background" onClick={() => {
                                      try {
                                        const reasons = JSON.parse(generationResult.stale_reason);
                                        const msg = reasons.map((r:any) => `Node ${r.node_id}: ${r.status}\nOld Hash: ${r.old_hash}\nNew Hash: ${r.new_hash || 'N/A'}`).join('\n\n');
                                        alert(`Staleness Details:\n\n${msg}`);
                                      } catch(e) {
                                        alert("Documentation has been updated.");
                                      }
                                    }}>
                                      View Diff
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Body */}
                            <div className="p-5 space-y-6">
                              <div>
                                <h3 className="text-lg font-semibold text-foreground mb-1">{tc.title}</h3>
                                <p className="text-sm text-muted-foreground flex items-center gap-2">
                                  <FileText className="w-4 h-4" /> 
                                  Requirement Ref: <span className="font-mono text-xs bg-muted px-1.5 py-0.5 rounded border">{tc.requirement_reference}</span>
                                </p>
                              </div>
                              
                              <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Preconditions</h4>
                                    <ul className="list-disc pl-4 space-y-1">
                                      {tc.preconditions?.map((p:string, idx:number) => (
                                        <li key={idx} className="text-sm">{p}</li>
                                      ))}
                                      {(!tc.preconditions || tc.preconditions.length === 0) && <li className="text-sm text-muted-foreground italic">None</li>}
                                    </ul>
                                  </div>
                                  
                                  <div>
                                    <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-2">Execution Steps</h4>
                                    <ol className="list-decimal pl-4 space-y-1.5">
                                      {tc.steps?.map((step:string, idx:number) => (
                                        <li key={idx} className="text-sm pl-1">{step}</li>
                                      ))}
                                    </ol>
                                  </div>
                                </div>
                                
                                <div className="space-y-4">
                                  <div className="bg-green-500/5 border border-green-500/20 rounded-lg p-4 h-full">
                                    <h4 className="text-xs font-bold text-green-600 dark:text-green-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                                      <CheckCircle2 className="w-4 h-4" /> Expected Result
                                    </h4>
                                    <p className="text-sm font-medium">{tc.expected_result}</p>
                                    
                                    <div className="mt-4 pt-4 border-t border-green-500/10">
                                      <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider mb-1">Reasoning</h4>
                                      <p className="text-xs text-muted-foreground leading-relaxed">{tc.reasoning}</p>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            {/* Footer */}
                            <div className="px-5 py-3 border-t border-border/40 bg-muted/10 flex items-center justify-between">
                              <span className="text-xs text-muted-foreground">Generated via {generationResult.model}</span>
                              <div className="flex items-center gap-2">
                                <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5" onClick={() => {
                                  navigator.clipboard.writeText(`${tcId}: ${tc.title}\n\nSteps:\n${tc.steps?.join('\n')}\n\nExpected:\n${tc.expected_result}`);
                                  toast.success("Test case copied!");
                                }}>
                                  <Copy className="w-3.5 h-3.5" /> Copy
                                </Button>
                                <Button variant="secondary" size="sm" className="h-8 text-xs gap-1.5" onClick={openTraceability}>
                                  <Eye className="w-3.5 h-3.5" /> View Source Requirement
                                </Button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <TraceabilityPanel 
        open={panelOpen} 
        onOpenChange={setPanelOpen} 
        metadata={panelMetadata} 
      />
    </div>
  );
}
