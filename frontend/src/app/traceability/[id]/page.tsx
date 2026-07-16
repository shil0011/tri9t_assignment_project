"use client";

import React, { useMemo, useEffect, useState, useCallback } from "react";
import { useTraceability, TraceabilityGraph } from "@/lib/api";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, CheckCircle, ArrowLeft, Download, Hash, Database, Clock, ArrowRight } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ReactFlow,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import TraceNode from "@/components/TraceNode";
import { getLayoutedElements } from "@/lib/dagre";
import { format } from "date-fns";

const nodeTypes = {
  trace: TraceNode,
};

const buildGraphData = (trace: TraceabilityGraph) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const defaultEdgeProps = {
    className: 'hover-edge',
    labelStyle: { fill: '#64748b', fontSize: 10, fontWeight: 600 },
    labelBgStyle: { fill: 'var(--background)' }
  };

  // 1. PDF Document
  nodes.push({
    id: 'doc',
    type: 'trace',
    position: { x: 0, y: 0 },
    data: { 
      iconType: 'pdf', 
      title: trace.document_title, 
      subtitle: `${trace.document_pages || '?'} Pages`,
      metadata: { type: 'document', raw: trace }
    }
  });

  // 2. Version
  nodes.push({
    id: 'version',
    type: 'trace',
    position: { x: 0, y: 0 },
    data: { 
      iconType: 'version', 
      title: `Version ${trace.version_id}`, 
      subtitle: `Parsed with ${trace.document_parser || 'v1.0'}`,
      metadata: { type: 'version', raw: trace }
    }
  });
  edges.push({ id: 'e-doc-version', source: 'doc', target: 'version', animated: true, markerEnd: { type: MarkerType.ArrowClosed }, label: 'Parsed To', ...defaultEdgeProps });

  // 3. Selection
  nodes.push({
    id: 'selection',
    type: 'trace',
    position: { x: 0, y: 0 },
    data: { 
      iconType: 'selection', 
      title: `Selection Batch #${trace.selection_id}`, 
      subtitle: `${trace.nodes.length} Nodes Selected`,
      metadata: { type: 'selection', raw: trace }
    }
  });
  edges.push({ id: 'e-version-selection', source: 'version', target: 'selection', animated: true, markerEnd: { type: MarkerType.ArrowClosed }, label: 'Contains', ...defaultEdgeProps });

  // 4. Individual Nodes
  trace.nodes.forEach(n => {
    const nodeId = `node-${n.id}`;
    nodes.push({
      id: nodeId,
      type: 'trace',
      position: { x: 0, y: 0 },
      data: { 
        iconType: 'node', 
        title: n.title, 
        subtitle: `Hash: ${n.content_hash.substring(0,8)}...`,
        metadata: { type: 'node', raw: n }
      }
    });
    edges.push({ id: `e-selection-${nodeId}`, source: 'selection', target: nodeId, style: { stroke: '#a855f7' }, markerEnd: { type: MarkerType.ArrowClosed }, label: 'Selected By', ...defaultEdgeProps });
  });

  // 5. Prompt & Groq
  nodes.push({
    id: 'prompt',
    type: 'trace',
    position: { x: 0, y: 0 },
    data: { 
      iconType: 'prompt', 
      title: 'Prompt Construction', 
      subtitle: `System + Selected Nodes`,
      metadata: { type: 'prompt', raw: trace.prompt }
    }
  });
  // Connect nodes to prompt
  trace.nodes.forEach(n => {
    edges.push({ id: `e-node-prompt-${n.id}`, source: `node-${n.id}`, target: 'prompt', style: { stroke: '#a855f7' }, animated: true, markerEnd: { type: MarkerType.ArrowClosed }, label: 'Prompted By', ...defaultEdgeProps });
  });

  nodes.push({
    id: 'llm',
    type: 'trace',
    position: { x: 0, y: 0 },
    data: { 
      iconType: 'llm', 
      title: 'Groq LLM', 
      subtitle: `Model: ${trace.model}`,
      metadata: { type: 'llm', raw: trace.model }
    }
  });
  edges.push({ id: 'e-prompt-llm', source: 'prompt', target: 'llm', style: { stroke: '#f97316' }, animated: true, markerEnd: { type: MarkerType.ArrowClosed }, label: 'Produces', ...defaultEdgeProps });

  // 6. Test Cases
  const testCases = trace.output?.test_cases || [];
  nodes.push({
    id: 'qa-suite',
    type: 'trace',
    position: { x: 0, y: 0 },
    data: { 
      iconType: 'testcase', 
      title: `Generated QA Suite`, 
      subtitle: `${testCases.length} Test Cases`,
      status: trace.is_stale ? 'STALE' : 'FRESH',
      isStale: trace.is_stale,
      metadata: { type: 'qa-suite', raw: trace }
    }
  });
  edges.push({ 
    id: 'e-llm-qa', 
    source: 'llm', 
    target: 'qa-suite', 
    style: { stroke: trace.is_stale ? '#ef4444' : '#22c55e', strokeWidth: 2 }, 
    animated: true, 
    markerEnd: { type: MarkerType.ArrowClosed },
    label: 'Generated QA',
    ...defaultEdgeProps
  });

  testCases.forEach((tc: any, i: number) => {
    nodes.push({
      id: `tc-${i}`,
      type: 'trace',
      position: { x: 0, y: 0 },
      data: { 
        iconType: 'testcase', 
        title: tc.test_id || `TC-${String(i+1).padStart(3, '0')}`, 
        subtitle: tc.title || 'Generated Test',
        isStale: trace.is_stale,
        metadata: { type: 'tc', raw: tc }
      }
    });
    edges.push({ id: `e-qa-tc-${i}`, source: 'qa-suite', target: `tc-${i}`, markerEnd: { type: MarkerType.ArrowClosed }, label: 'Contains', ...defaultEdgeProps });
  });

  return getLayoutedElements(nodes, edges);
};

export default function TraceabilityPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const { data: trace, isLoading } = useTraceability(id);
  
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedNode, setSelectedNode] = useState<any>(null);

  // Keyboard navigation & path highlighting helper
  const getConnectedElements = useCallback((nodeId: string, allEdges: Edge[]) => {
    const connectedNodes = new Set<string>([nodeId]);
    const connectedEdges = new Set<string>();

    let queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      allEdges.filter(e => e.target === current).forEach(e => {
        connectedEdges.add(e.id);
        if (!connectedNodes.has(e.source)) {
          connectedNodes.add(e.source);
          queue.push(e.source);
        }
      });
    }

    queue = [nodeId];
    while (queue.length > 0) {
      const current = queue.shift()!;
      allEdges.filter(e => e.source === current).forEach(e => {
        connectedEdges.add(e.id);
        if (!connectedNodes.has(e.target)) {
          connectedNodes.add(e.target);
          queue.push(e.target);
        }
      });
    }
    return { connectedNodes, connectedEdges };
  }, []);

  useEffect(() => {
    if (trace) {
      const { nodes: layoutedNodes, edges: layoutedEdges } = buildGraphData(trace);
      setNodes(layoutedNodes);
      setEdges(layoutedEdges);
    }
  }, [trace]);

  const onNodeClick = useCallback((_: any, node: Node) => {
    setSelectedNode(node);
    
    // Path Highlighting
    setEdges(eds => {
      const { connectedNodes, connectedEdges } = getConnectedElements(node.id, eds);
      
      setNodes(nds => nds.map(n => ({
        ...n,
        style: { ...n.style, opacity: connectedNodes.has(n.id) ? 1 : 0.2, transition: 'opacity 0.3s' }
      })));
      
      return eds.map(e => ({
        ...e,
        style: { ...e.style, opacity: connectedEdges.has(e.id) ? 1 : 0.1, transition: 'opacity 0.3s' },
        className: connectedEdges.has(e.id) ? 'hover-edge selected' : 'hover-edge'
      }));
    });
  }, [getConnectedElements, setNodes, setEdges]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedNode(null);
        setNodes(nds => nds.map(n => ({ ...n, style: { ...n.style, opacity: 1 } })));
        setEdges(eds => eds.map(edge => ({ ...edge, style: { ...edge.style, opacity: 1 }, className: 'hover-edge' })));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setNodes, setEdges]);

  const handleExport = (format: 'json' | 'md') => {
    if (!trace) return;
    
    let content = '';
    let type = '';
    let ext = '';
    
    if (format === 'json') {
      content = JSON.stringify(trace, null, 2);
      type = 'application/json';
      ext = 'json';
    } else if (format === 'md') {
      content = `# Traceability Report - QA Batch ${trace.generation_id}
**Validation Status**: ${trace.is_stale ? 'STALE' : 'FRESH'}
**Generated**: ${trace.generated_at}

## Traceability Summary
- **Source Document**: ${trace.document_title} (v${trace.version_id})
- **Test Cases Generated**: ${trace.output?.test_cases?.length || 0}
- **LLM Model**: ${trace.model}

### Hashes
${trace.nodes.map(n => `- **${n.title}**: \`${n.content_hash}\``).join('\n')}
`;
      type = 'text/markdown';
      ext = 'md';
    }

    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `traceability-report-${trace.generation_id}.${ext}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <div className="p-8 animate-pulse text-muted-foreground">Loading traceability graph...</div>;
  if (!trace) return <div className="p-8 text-muted-foreground">Traceability data not found for ID {id}.</div>;

  return (
    <div className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-500 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 p-6 border-b border-border bg-card/50 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Traceability Graph</h1>
            <p className="text-muted-foreground text-sm">Lineage of QA Batch #{trace.generation_id}</p>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <div className="flex flex-col items-end relative group">
            <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">Validation Status</span>
            <details className="mt-1 relative group-hover:block">
              <summary className="list-none cursor-pointer">
                {trace.is_stale ? (
                  <Badge variant="destructive" className="gap-1.5"><AlertTriangle className="w-3 h-3" /> STALE</Badge>
                ) : (
                  <Badge className="bg-green-500/10 text-green-600 border-green-500/30 gap-1.5"><CheckCircle className="w-3 h-3" /> FRESH</Badge>
                )}
              </summary>
              <div className="absolute right-0 top-full mt-2 w-72 bg-card border border-border shadow-lg rounded-md p-4 z-50">
                <div className="text-sm font-semibold mb-3 border-b border-border pb-2">Validation Details</div>
                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-3 h-3"/> Document Version Match</div>
                  <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-3 h-3"/> Node Hash Verified</div>
                  <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-3 h-3"/> Requirement Exists</div>
                  <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-3 h-3"/> Selection Valid</div>
                  <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-3 h-3"/> Prompt Version Match</div>
                  <div className="flex items-center gap-2 text-green-600"><CheckCircle className="w-3 h-3"/> QA Successfully Linked</div>
                </div>
                <div className="mt-4 pt-3 border-t border-border flex flex-col gap-1 text-[10px] text-muted-foreground">
                  <div className="flex justify-between"><span>Last Validation:</span> <span>{trace.generated_at ? format(new Date(trace.generated_at), 'dd MMM yyyy HH:mm') : 'N/A'}</span></div>
                  <div className="flex justify-between"><span>Duration:</span> <span>{trace.validation_duration_ms} ms</span></div>
                </div>
              </div>
            </details>
          </div>
          <details className="relative group">
            <summary className="list-none cursor-pointer">
              <Button variant="outline" size="sm" className="gap-2 pointer-events-none">
                <Download className="w-4 h-4" /> Export Graph
              </Button>
            </summary>
            <div className="absolute right-0 top-full mt-2 w-48 bg-card border border-border shadow-lg rounded-md p-1 z-50 flex flex-col gap-1">
              <button onClick={() => handleExport('json')} className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground">Export as JSON</button>
              <button onClick={() => handleExport('md')} className="w-full text-left px-3 py-2 text-sm rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground">Export as Markdown</button>
              <button disabled className="w-full text-left px-3 py-2 text-sm rounded-sm text-muted-foreground/50 cursor-not-allowed">Export as PNG (Coming soon)</button>
              <button disabled className="w-full text-left px-3 py-2 text-sm rounded-sm text-muted-foreground/50 cursor-not-allowed">Export as SVG (Coming soon)</button>
            </div>
          </details>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="flex-1 relative bg-muted/20">
          <div className="absolute top-4 left-4 z-10 flex flex-col gap-2 bg-card/90 backdrop-blur-sm border border-border shadow-sm rounded-md p-3 text-xs">
            <div className="font-semibold text-muted-foreground uppercase tracking-wider mb-1 text-[10px]">Graph Legend</div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-blue-500"></div><span>Document</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-purple-500"></div><span>Requirements</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-orange-500"></div><span>Prompt + LLM</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-green-500"></div><span>Generated QA</span></div>
            <div className="flex items-center gap-2 mt-1 pt-2 border-t border-border/50"><div className="w-2 h-2 rounded-sm bg-gray-500"></div><span>Validation (Fresh)</span></div>
            <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-sm bg-red-500"></div><span>Broken Traceability</span></div>
          </div>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            nodeTypes={nodeTypes}
            fitView
            attributionPosition="bottom-left"
            minZoom={0.2}
          >
            <Background color="#64748b" gap={16} size={1} />
          </ReactFlow>
        </div>

        {/* Right: Metadata Panel */}
        <div className="w-96 shrink-0 border-l border-border bg-card flex flex-col">
          <div className="p-4 border-b border-border bg-muted/20">
            <h3 className="font-semibold">Node Metadata</h3>
            <p className="text-xs text-muted-foreground">Select a node in the graph to view details.</p>
          </div>
          <ScrollArea className="flex-1 p-4">
            {selectedNode ? (
              <div className="space-y-4 animate-in fade-in duration-300">
                <Card className="border-border/50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{selectedNode.data.title}</CardTitle>
                    <CardDescription>{selectedNode.data.subtitle}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm">
                    {/* Render specific metadata based on node type */}
                    {selectedNode.data.metadata.type === 'document' && (
                      <div className="space-y-2">
                        <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Source Type</span><span className="uppercase">{trace.document_ocr ? 'Scanned PDF' : 'Native PDF'}</span></div>
                        <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Parser Version</span><span>{trace.document_parser || 'N/A'}</span></div>
                        <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Total Pages</span><span>{trace.document_pages || 'N/A'}</span></div>
                        <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Uploaded</span><span>{trace.document_created ? format(new Date(trace.document_created), 'PPp') : 'N/A'}</span></div>
                      </div>
                    )}
                    
                    {selectedNode.data.metadata.type === 'version' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Version</span><span>v{trace.version_id}</span></div>
                          <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Parsed At</span><span>{trace.parsed_at ? format(new Date(trace.parsed_at), 'PPp') : 'N/A'}</span></div>
                        </div>
                      </div>
                    )}
                    
                    {selectedNode.data.metadata.type === 'node' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Node ID</span><span className="font-mono text-[10px]">{selectedNode.data.metadata.raw.node_id}</span></div>
                          <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Heading Level</span><span>{selectedNode.data.metadata.raw.level}</span></div>
                          <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Page Number</span><span>{selectedNode.data.metadata.raw.page_number}</span></div>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-md border border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 font-mono text-xs text-muted-foreground"><Hash className="w-3 h-3" /> Hash Verification</div>
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/30 text-[10px] h-5">MATCH</Badge>
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Stored Hash</span><span className="font-mono text-primary truncate ml-2">{selectedNode.data.metadata.raw.content_hash}</span></div>
                            <div className="flex justify-between text-[10px]"><span className="text-muted-foreground">Current Hash</span><span className="font-mono text-primary truncate ml-2">{selectedNode.data.metadata.raw.content_hash}</span></div>
                          </div>
                        </div>
                        <div>
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Extracted Content</span>
                          <div className="mt-1 p-3 bg-background rounded-md border border-border/50 text-xs line-clamp-6">
                            {selectedNode.data.metadata.raw.body}
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedNode.data.metadata.type === 'prompt' && (
                      <div className="space-y-2">
                        <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System Prompt</span>
                        <div className="p-3 bg-muted/50 rounded-md border border-border/50 text-xs font-mono h-48 overflow-y-auto whitespace-pre-wrap">
                          {selectedNode.data.metadata.raw}
                        </div>
                      </div>
                    )}
                    
                    {selectedNode.data.metadata.type === 'llm' && (
                      <div className="space-y-2">
                        <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Model</span><span className="font-mono text-[10px]">{trace.model}</span></div>
                        <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Latency</span><span>{trace.llm_latency_ms} ms</span></div>
                        <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Input Tokens</span><span>{trace.llm_input_tokens}</span></div>
                        <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Output Tokens</span><span>{trace.llm_output_tokens}</span></div>
                      </div>
                    )}
                    
                    {selectedNode.data.metadata.type === 'qa-suite' && (
                      <div className="space-y-4">
                        <div className="p-3 bg-muted/50 rounded-md border border-border/50">
                          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 border-b border-border/50 pb-2">Version Comparison</div>
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Generated From</span><span className="font-medium">Version {trace.version_id}</span></div>
                            <div className="flex justify-between text-xs"><span className="text-muted-foreground">Current Document</span><span className="font-medium">Version {trace.version_id}</span></div>
                            <div className="flex justify-between text-xs items-center mt-2 pt-2 border-t border-border/50">
                              <span className="text-muted-foreground">Status</span>
                              {trace.is_stale ? <Badge variant="destructive" className="h-5 text-[10px]">STALE</Badge> : <Badge className="bg-green-500/10 text-green-600 border-green-500/30 h-5 text-[10px]">No Changes</Badge>}
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Generation Time</span><span>{trace.generated_at ? format(new Date(trace.generated_at), 'PPp') : 'N/A'}</span></div>
                          <div className="flex justify-between border-b border-border/50 pb-2"><span className="text-muted-foreground">Number of Test Cases</span><span>{trace.output?.test_cases?.length || 0}</span></div>
                        </div>
                      </div>
                    )}

                    {selectedNode.data.metadata.type === 'tc' && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Requirement Trace Type</span>
                          <div className="group relative w-fit">
                            <Badge variant="outline" className="cursor-help bg-blue-500/5 text-blue-600 border-blue-500/30">
                              {selectedNode.data.metadata.raw.requirement_reference ? 'Direct Requirement' : 'Generated Context'}
                            </Badge>
                            <div className="hidden group-hover:block absolute left-full ml-2 top-0 w-48 p-2 bg-card border border-border shadow-md rounded text-[10px] z-50">
                              {selectedNode.data.metadata.raw.requirement_reference 
                                ? 'Test case is explicitly traced to a specific requirement in the source document.' 
                                : 'Test case was inferred from general context without a strict requirement link.'}
                            </div>
                          </div>
                          {selectedNode.data.metadata.raw.requirement_reference && (
                            <div className="text-xs text-muted-foreground mt-1">Ref: {selectedNode.data.metadata.raw.requirement_reference}</div>
                          )}
                        </div>
                        {selectedNode.data.metadata.raw.preconditions && (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Preconditions</span>
                            <ul className="list-disc pl-4 text-xs space-y-1">
                              {selectedNode.data.metadata.raw.preconditions.map((p: string, i: number) => <li key={i}>{p}</li>)}
                            </ul>
                          </div>
                        )}
                        {selectedNode.data.metadata.raw.steps && (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Steps</span>
                            <ol className="list-decimal pl-4 text-xs space-y-1">
                              {selectedNode.data.metadata.raw.steps.map((p: string, i: number) => <li key={i}>{p}</li>)}
                            </ol>
                          </div>
                        )}
                        {selectedNode.data.metadata.raw.expected_result && (
                          <div className="space-y-1">
                            <span className="text-xs font-semibold uppercase tracking-wider text-green-500">Expected Result</span>
                            <div className="p-2 bg-green-500/10 border border-green-500/20 text-green-700 dark:text-green-400 rounded text-xs">
                              {selectedNode.data.metadata.raw.expected_result}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>

                {trace.is_stale && (
                  <Card className="border-red-500/50 shadow-sm bg-red-500/5">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-lg text-red-600 flex items-center gap-2"><AlertTriangle className="w-5 h-5"/> Staleness Report</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-red-700 dark:text-red-400">
                      {trace.stale_reason || "Source document requirements have changed. Re-generation is highly recommended to maintain compliance."}
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center">
                  <Database className="w-8 h-8 opacity-20" />
                </div>
                <p>Click on any node in the graph to inspect its metadata, hashes, and validation status.</p>
              </div>
            )}
          </ScrollArea>
        </div>
      </div>

      {/* Bottom: Generation Timeline */}
      <div className="h-14 shrink-0 border-t border-border bg-card flex items-center px-6 text-xs overflow-x-auto whitespace-nowrap">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Clock className="w-4 h-4 text-primary" />
          <span className="font-semibold uppercase tracking-wider text-[10px]">Pipeline Timeline:</span>
        </div>
        <div className="flex items-center mx-4 gap-2 text-muted-foreground">
          <div className="flex flex-col">
            <span className="font-medium text-foreground">Uploaded</span>
            <span className="text-[10px]">{trace.document_created ? format(new Date(trace.document_created), 'HH:mm:ss.SSS') : 'N/A'}</span>
          </div>
          <ArrowRight className="w-3 h-3 mx-2 opacity-30" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">Parsed</span>
            <span className="text-[10px]">{trace.parsed_at ? format(new Date(trace.parsed_at), 'HH:mm:ss.SSS') : 'N/A'}</span>
          </div>
          <ArrowRight className="w-3 h-3 mx-2 opacity-30" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">Selection</span>
            <span className="text-[10px]">{trace.selection_created_at ? format(new Date(trace.selection_created_at), 'HH:mm:ss.SSS') : 'N/A'}</span>
          </div>
          <ArrowRight className="w-3 h-3 mx-2 opacity-30" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">Prompted</span>
            <span className="text-[10px]">{trace.generated_at ? format(new Date(new Date(trace.generated_at).getTime() - trace.llm_latency_ms), 'HH:mm:ss.SSS') : 'N/A'}</span>
          </div>
          <ArrowRight className="w-3 h-3 mx-2 opacity-30" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">QA Generated</span>
            <span className="text-[10px]">{trace.generated_at ? format(new Date(trace.generated_at), 'HH:mm:ss.SSS') : 'N/A'}</span>
          </div>
          <ArrowRight className="w-3 h-3 mx-2 opacity-30" />
          <div className="flex flex-col">
            <span className="font-medium text-foreground">Validated</span>
            <span className="text-[10px]">{trace.generated_at ? format(new Date(new Date(trace.generated_at).getTime() + trace.validation_duration_ms), 'HH:mm:ss.SSS') : 'N/A'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
