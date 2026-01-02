import { Button } from '@/components/ui/button';
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  RotateCcw, 
  Download,
  PlusCircle
} from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

interface FlowToolbarProps {
  isEditMode: boolean;
  hasChanges: boolean;
  hasSelectedNode: boolean;
  onToggleEditMode: () => void;
  onCreateFlow: () => void;
  onAddNode: () => void;
  onEditNode: () => void;
  onDeleteNode: () => void;
  onSaveChanges: () => void;
  onDiscardChanges: () => void;
  onDeleteFlow: () => void;
  onExport: () => void;
}

export const FlowToolbar = ({
  isEditMode,
  hasChanges,
  hasSelectedNode,
  onToggleEditMode,
  onCreateFlow,
  onAddNode,
  onEditNode,
  onDeleteNode,
  onSaveChanges,
  onDiscardChanges,
  onDeleteFlow,
  onExport,
}: FlowToolbarProps) => {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={onCreateFlow}>
            <Plus className="h-4 w-4 mr-1" />
            New Flow
          </Button>
        </TooltipTrigger>
        <TooltipContent>Create a new process flow</TooltipContent>
      </Tooltip>

      <div className="h-6 w-px bg-border" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            variant={isEditMode ? "default" : "outline"} 
            size="sm" 
            onClick={onToggleEditMode}
          >
            <Pencil className="h-4 w-4 mr-1" />
            {isEditMode ? 'Editing' : 'Edit'}
          </Button>
        </TooltipTrigger>
        <TooltipContent>Toggle edit mode</TooltipContent>
      </Tooltip>

      {isEditMode && (
        <>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="outline" size="sm" onClick={onAddNode}>
                <PlusCircle className="h-4 w-4 mr-1" />
                Add Activity
              </Button>
            </TooltipTrigger>
            <TooltipContent>Add a new activity to the flow</TooltipContent>
          </Tooltip>

          {hasSelectedNode && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="sm" onClick={onEditNode}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit selected activity</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={onDeleteNode}
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Delete selected activity</TooltipContent>
              </Tooltip>
            </>
          )}

          <div className="h-6 w-px bg-border" />

          {hasChanges && (
            <>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="default" size="sm" onClick={onSaveChanges}>
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Save all changes</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" size="sm" onClick={onDiscardChanges}>
                    <RotateCcw className="h-4 w-4 mr-1" />
                    Discard
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Discard changes</TooltipContent>
              </Tooltip>
            </>
          )}
        </>
      )}

      <div className="flex-1" />

      <Tooltip>
        <TooltipTrigger asChild>
          <Button variant="outline" size="sm" onClick={onExport}>
            <Download className="h-4 w-4 mr-1" />
            Export
          </Button>
        </TooltipTrigger>
        <TooltipContent>Export flow as JSON</TooltipContent>
      </Tooltip>

      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button 
            variant="outline" 
            size="sm"
            className="text-destructive hover:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-1" />
            Delete Flow
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Process Flow</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this process flow and all its activities. 
              This action also affects related use cases and documentation.
              This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onDeleteFlow} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
