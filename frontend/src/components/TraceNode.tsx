import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Database, GitCommit, MessageSquare, Cpu, CheckCircle, AlertTriangle, Hash, ListChecks, FileDigit } from 'lucide-react';

const iconMap: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-5 h-5 text-blue-500" />,
  document: <FileDigit className="w-5 h-5 text-indigo-500" />,
  version: <GitCommit className="w-5 h-5 text-violet-500" />,
  node: <Database className="w-5 h-5 text-purple-500" />,
  selection: <ListChecks className="w-5 h-5 text-fuchsia-500" />,
  prompt: <MessageSquare className="w-5 h-5 text-pink-500" />,
  llm: <Cpu className="w-5 h-5 text-orange-500" />,
  testcase: <CheckCircle className="w-5 h-5 text-green-500" />,
  hash: <Hash className="w-5 h-5 text-zinc-500" />
};

const getBorderColor = (type: string, isStale?: boolean) => {
  if (isStale) return 'border-red-500/50 shadow-red-500/20';
  switch (type) {
    case 'pdf': case 'document': case 'version': return 'border-blue-500/30';
    case 'node': case 'selection': return 'border-purple-500/30';
    case 'prompt': case 'llm': return 'border-orange-500/30';
    case 'testcase': return 'border-green-500/30';
    default: return 'border-border';
  }
};

const TraceNode = ({ data, selected }: any) => {
  const { title, subtitle, iconType, status, isStale } = data;
  
  return (
    <div className={`relative min-w-[280px] rounded-lg bg-card transition-all duration-200 ${selected ? 'ring-2 ring-primary ring-offset-2 ring-offset-background' : ''}`}>
      <Handle type="target" position={Position.Top} className="w-3 h-3 bg-muted-foreground border-2 border-background" />
      
      <Card className={`border-2 ${getBorderColor(iconType, isStale)} ${selected ? 'shadow-lg' : 'shadow-sm'} bg-card overflow-hidden`}>
        {isStale && <div className="absolute top-0 left-0 w-full h-1 bg-red-500" />}
        <CardContent className="p-4 flex items-start gap-4">
          <div className="w-10 h-10 rounded-md bg-muted/50 border border-border/50 flex items-center justify-center shrink-0">
            {iconMap[iconType] || <FileText className="w-5 h-5 text-muted-foreground" />}
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm truncate" title={title}>{title}</h4>
            <p className="text-xs text-muted-foreground truncate" title={subtitle}>{subtitle}</p>
            {status && (
              <div className="mt-2">
                 <Badge variant={isStale ? "destructive" : "secondary"} className="text-[10px] font-mono px-1.5 py-0">
                   {status}
                 </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Handle type="source" position={Position.Bottom} className="w-3 h-3 bg-muted-foreground border-2 border-background" />
    </div>
  );
};

export default memo(TraceNode);
