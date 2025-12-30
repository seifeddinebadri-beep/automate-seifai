import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, Bot, TrendingDown, Zap } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface AutomatedNodeData {
  label: string;
  frequency: number;
  duration: number;
  originalDuration: number;
  automationType: string | null;
  timeSaved: number;
  showSavings: boolean;
}

const AutomatedNode = memo(({ data }: { data: AutomatedNodeData }) => {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  const getTypeColor = (type: string | null) => {
    switch (type) {
      case 'RPA': return 'bg-blue-500/20 text-blue-700 border-blue-500';
      case 'Workflow': return 'bg-purple-500/20 text-purple-700 border-purple-500';
      case 'Rule': return 'bg-orange-500/20 text-orange-700 border-orange-500';
      case 'AI Agent': return 'bg-green-500/20 text-green-700 border-green-500';
      default: return 'bg-primary/20 text-primary border-primary';
    }
  };

  const savingsPercent = data.originalDuration > 0 
    ? Math.round(((data.originalDuration - data.duration) / data.originalDuration) * 100)
    : 0;

  return (
    <div className="bg-primary/5 border-2 border-primary rounded-lg p-4 min-w-[180px] shadow-lg relative overflow-visible">
      <Handle type="target" position={Position.Left} className="!bg-primary" />
      
      {/* Automation Badge */}
      <div className="absolute -top-3 left-1/2 -translate-x-1/2">
        <Badge variant="outline" className={`text-[10px] px-2 py-0.5 ${getTypeColor(data.automationType)}`}>
          <Bot className="h-3 w-3 mr-1" />
          {data.automationType || 'Automated'}
        </Badge>
      </div>
      
      <div className="text-center mb-3 mt-2">
        <h3 className="font-semibold text-sm text-foreground leading-tight">{data.label}</h3>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-1">
            <Zap className="h-3 w-3 text-primary" />
            Frequency
          </span>
          <span className="font-medium text-foreground">{data.frequency}</span>
        </div>
        
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Duration
          </span>
          <div className="flex items-center gap-1">
            <span className="text-muted-foreground line-through text-[10px]">
              {formatDuration(data.originalDuration)}
            </span>
            <span className="font-medium text-primary">{formatDuration(data.duration)}</span>
          </div>
        </div>
        
        {data.showSavings && savingsPercent > 0 && (
          <div className="flex items-center justify-between text-green-600 bg-green-500/10 rounded px-2 py-1 -mx-2">
            <span className="flex items-center gap-1">
              <TrendingDown className="h-3 w-3" />
              Savings
            </span>
            <span className="font-bold">-{savingsPercent}%</span>
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Right} className="!bg-primary" />
    </div>
  );
});

AutomatedNode.displayName = 'AutomatedNode';

export default AutomatedNode;
