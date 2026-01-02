import { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { Clock, RefreshCw, Activity, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface EditableActivityNodeData {
  label: string;
  frequency: number;
  duration: number;
  rework: number;
  isEditable?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
}

const EditableActivityNode = memo(({ data, selected }: NodeProps & { data: EditableActivityNodeData }) => {
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  return (
    <div className={`bg-card border-2 rounded-lg p-4 min-w-[180px] shadow-md transition-all ${
      selected ? 'border-primary ring-2 ring-primary/20' : 'border-muted-foreground/50'
    }`}>
      <Handle type="target" position={Position.Left} className="!bg-muted-foreground" />
      
      {data.isEditable && (
        <div className="absolute -top-3 -right-3 flex gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full bg-background shadow-md"
            onClick={(e) => {
              e.stopPropagation();
              data.onEdit?.();
            }}
          >
            <Pencil className="h-3 w-3" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-6 w-6 rounded-full bg-background shadow-md text-destructive hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              data.onDelete?.();
            }}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      )}
      
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

EditableActivityNode.displayName = 'EditableActivityNode';

export default EditableActivityNode;
