import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';

interface NodeData {
  id: string;
  label: string;
  duration: number;
  frequency: number;
  automationType?: string;
  timeSaved?: number;
}

interface NodeEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  nodeData?: NodeData;
  onSave: (data: NodeData) => void;
  onDelete?: () => void;
}

export const NodeEditorDialog = ({
  open,
  onOpenChange,
  mode,
  nodeData,
  onSave,
  onDelete,
}: NodeEditorDialogProps) => {
  const [label, setLabel] = useState('');
  const [duration, setDuration] = useState(60);
  const [frequency, setFrequency] = useState(1);
  const [automationType, setAutomationType] = useState<string>('');
  const [timeSaved, setTimeSaved] = useState(0);

  useEffect(() => {
    if (open && nodeData) {
      setLabel(nodeData.label);
      setDuration(nodeData.duration);
      setFrequency(nodeData.frequency);
      setAutomationType(nodeData.automationType || '');
      setTimeSaved(nodeData.timeSaved || 0);
    } else if (open && mode === 'create') {
      setLabel('');
      setDuration(60);
      setFrequency(1);
      setAutomationType('');
      setTimeSaved(0);
    }
  }, [open, nodeData, mode]);

  const handleSave = () => {
    if (!label.trim()) {
      toast.error('Activity name is required');
      return;
    }

    onSave({
      id: nodeData?.id || crypto.randomUUID(),
      label: label.trim(),
      duration,
      frequency,
      automationType: automationType || undefined,
      timeSaved: timeSaved || undefined,
    });
    onOpenChange(false);
  };

  const handleDelete = () => {
    if (onDelete) {
      onDelete();
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Add New Activity' : 'Edit Activity'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="node-label">Activity Name</Label>
            <Input
              id="node-label"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g., Review Document"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="node-duration">Duration (seconds)</Label>
              <Input
                id="node-duration"
                type="number"
                value={duration}
                onChange={(e) => setDuration(parseInt(e.target.value) || 0)}
                min={1}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="node-frequency">Frequency</Label>
              <Input
                id="node-frequency"
                type="number"
                value={frequency}
                onChange={(e) => setFrequency(parseInt(e.target.value) || 1)}
                min={1}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Automation Type (Optional)</Label>
            <Select value={automationType} onValueChange={setAutomationType}>
              <SelectTrigger>
                <SelectValue placeholder="None - Manual Activity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None - Manual</SelectItem>
                <SelectItem value="RPA">RPA</SelectItem>
                <SelectItem value="Workflow">Workflow</SelectItem>
                <SelectItem value="Rule">Rule</SelectItem>
                <SelectItem value="AI Agent">AI Agent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {automationType && automationType !== 'none' && (
            <div className="space-y-2">
              <Label htmlFor="node-time-saved">Time Saved (seconds)</Label>
              <Input
                id="node-time-saved"
                type="number"
                value={timeSaved}
                onChange={(e) => setTimeSaved(parseInt(e.target.value) || 0)}
                min={0}
                max={duration}
              />
              <p className="text-xs text-muted-foreground">
                Estimated time reduction when automated
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-between">
          {mode === 'edit' && onDelete && (
            <Button variant="destructive" onClick={handleDelete}>
              Delete Activity
            </Button>
          )}
          <div className="flex gap-2 ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave}>
              {mode === 'create' ? 'Add Activity' : 'Save Changes'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
