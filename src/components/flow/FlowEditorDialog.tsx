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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { toast } from 'sonner';

interface Activity {
  id: string;
  name: string;
  duration: number;
  frequency: number;
  automationType?: string;
  timeSaved?: number;
}

interface FlowEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initialData?: {
    name: string;
    description: string;
    activities: Activity[];
  };
  onSave: (data: {
    name: string;
    description: string;
    activities: Activity[];
  }) => void;
}

export const FlowEditorDialog = ({
  open,
  onOpenChange,
  mode,
  initialData,
  onSave,
}: FlowEditorDialogProps) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [activities, setActivities] = useState<Activity[]>([]);

  useEffect(() => {
    if (open && initialData) {
      setName(initialData.name);
      setDescription(initialData.description);
      setActivities(initialData.activities);
    } else if (open && mode === 'create') {
      setName('');
      setDescription('');
      setActivities([
        { id: crypto.randomUUID(), name: '', duration: 60, frequency: 1 },
      ]);
    }
  }, [open, initialData, mode]);

  const addActivity = () => {
    setActivities([
      ...activities,
      { id: crypto.randomUUID(), name: '', duration: 60, frequency: 1 },
    ]);
  };

  const removeActivity = (id: string) => {
    if (activities.length <= 1) {
      toast.error('At least one activity is required');
      return;
    }
    setActivities(activities.filter((a) => a.id !== id));
  };

  const updateActivity = (id: string, field: keyof Activity, value: string | number) => {
    setActivities(
      activities.map((a) =>
        a.id === id ? { ...a, [field]: value } : a
      )
    );
  };

  const handleSave = () => {
    if (!name.trim()) {
      toast.error('Process name is required');
      return;
    }

    const validActivities = activities.filter((a) => a.name.trim());
    if (validActivities.length === 0) {
      toast.error('At least one activity with a name is required');
      return;
    }

    onSave({
      name: name.trim(),
      description: description.trim(),
      activities: validActivities,
    });
    onOpenChange(false);
  };

  const moveActivity = (index: number, direction: 'up' | 'down') => {
    if (
      (direction === 'up' && index === 0) ||
      (direction === 'down' && index === activities.length - 1)
    ) {
      return;
    }

    const newActivities = [...activities];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    [newActivities[index], newActivities[targetIndex]] = [
      newActivities[targetIndex],
      newActivities[index],
    ];
    setActivities(newActivities);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {mode === 'create' ? 'Create New Process Flow' : 'Edit Process Flow'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="flow-name">Process Name</Label>
            <Input
              id="flow-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Invoice Processing"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="flow-description">Description (Optional)</Label>
            <Textarea
              id="flow-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the process flow..."
              rows={2}
            />
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>Activities</Label>
              <Button variant="outline" size="sm" onClick={addActivity}>
                <Plus className="h-4 w-4 mr-1" />
                Add Activity
              </Button>
            </div>

            <div className="space-y-3">
              {activities.map((activity, index) => (
                <div
                  key={activity.id}
                  className="flex items-start gap-2 p-3 border rounded-lg bg-muted/30"
                >
                  <div className="flex flex-col gap-1 pt-2">
                    <button
                      type="button"
                      onClick={() => moveActivity(index, 'up')}
                      disabled={index === 0}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      ▲
                    </button>
                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                    <button
                      type="button"
                      onClick={() => moveActivity(index, 'down')}
                      disabled={index === activities.length - 1}
                      className="text-muted-foreground hover:text-foreground disabled:opacity-30"
                    >
                      ▼
                    </button>
                  </div>

                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <Label className="text-xs">Activity Name</Label>
                      <Input
                        value={activity.name}
                        onChange={(e) =>
                          updateActivity(activity.id, 'name', e.target.value)
                        }
                        placeholder="e.g., Review Document"
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Duration (seconds)</Label>
                      <Input
                        type="number"
                        value={activity.duration}
                        onChange={(e) =>
                          updateActivity(
                            activity.id,
                            'duration',
                            parseInt(e.target.value) || 0
                          )
                        }
                        min={1}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Frequency</Label>
                      <Input
                        type="number"
                        value={activity.frequency}
                        onChange={(e) =>
                          updateActivity(
                            activity.id,
                            'frequency',
                            parseInt(e.target.value) || 1
                          )
                        }
                        min={1}
                        className="mt-1"
                      />
                    </div>

                    <div>
                      <Label className="text-xs">Automation Type (Optional)</Label>
                      <Select
                        value={activity.automationType || ''}
                        onValueChange={(value) =>
                          updateActivity(activity.id, 'automationType', value)
                        }
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">None</SelectItem>
                          <SelectItem value="RPA">RPA</SelectItem>
                          <SelectItem value="Workflow">Workflow</SelectItem>
                          <SelectItem value="Rule">Rule</SelectItem>
                          <SelectItem value="AI Agent">AI Agent</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs">Time Saved (seconds)</Label>
                      <Input
                        type="number"
                        value={activity.timeSaved || 0}
                        onChange={(e) =>
                          updateActivity(
                            activity.id,
                            'timeSaved',
                            parseInt(e.target.value) || 0
                          )
                        }
                        min={0}
                        className="mt-1"
                      />
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeActivity(activity.id)}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {mode === 'create' ? 'Create Flow' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
