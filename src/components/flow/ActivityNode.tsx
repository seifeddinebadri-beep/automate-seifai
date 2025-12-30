import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Clock, RefreshCw, Activity } from 'lucide-react';

interface ActivityNodeData {
  label: string;
  frequency: number;
  duration: number;
  rework: number;
}

const ActivityNode = memo(({ data }: { data: ActivityNodeData }) => {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div className="bg-card border-2 border-muted-foreground/50 rounded-lg p-4 min-w-[180px] shadow-md">
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      
      <div className="text-center mb-3">
        <h3 className="font-semibold text-sm text-foreground leading-tight">{data.label}</h3>
      </div>
      
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Frequency
          </span>
          <span className="font-medium text-foreground">{data.frequency}</span>
        </div>
        
        <div className="flex items-center justify-between text-muted-foreground">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            Duration
          </span>
          <span className="font-medium text-foreground">{formatDuration(data.duration)}</span>
        </div>
        
        {data.rework > 0 && (
          <div className="flex items-center justify-between text-amber-600">
            <span className="flex items-center gap-1">
              <RefreshCw className="h-3 w-3" />
              Rework
            </span>
            <span className="font-medium">{data.rework}</span>
          </div>
        )}
      </div>
      
      <Handle type="source" position={Position.Right} className="!bg-muted-foreground" />
    </div>
  );
});

ActivityNode.displayName = 'ActivityNode';

export default ActivityNode;
