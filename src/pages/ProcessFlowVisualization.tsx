import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  ReactFlow,
  Node,
  Edge,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Position,
  addEdge,
  Connection,
  NodeChange,
  EdgeChange,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AppLayout } from '@/components/layout/AppLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { Bot, Clock, TrendingDown, Users, Zap, FileUp } from 'lucide-react';
import ActivityNode from '@/components/flow/ActivityNode';
import AutomatedNode from '@/components/flow/AutomatedNode';
import EditableActivityNode from '@/components/flow/EditableActivityNode';
import { FlowToolbar } from '@/components/flow/FlowToolbar';
import { FlowEditorDialog } from '@/components/flow/FlowEditorDialog';
import { NodeEditorDialog } from '@/components/flow/NodeEditorDialog';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { TooltipProvider } from '@/components/ui/tooltip';

interface AutomationUseCase {
  id: string;
  name: string;
  type: string;
  affected_activities: string[];
  estimated_time_saved: number;
  confidence_score: number;
}

interface Dataset {
  id: string;
  name: string;
  file_name: string;
}

interface ActivityData {
  id: string;
  name: string;
  duration: number;
  frequency: number;
  automationType?: string;
  timeSaved?: number;
}

const ProcessFlowVisualization = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'as-is' | 'to-be'>('as-is');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [useCases, setUseCases] = useState<AutomationUseCase[]>([]);
  const [selectedUseCase, setSelectedUseCase] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  // Edit mode state
  const [isEditMode, setIsEditMode] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [originalActivities, setOriginalActivities] = useState<ActivityData[]>([]);
  const [editableActivities, setEditableActivities] = useState<ActivityData[]>([]);

  // Dialog states
  const [flowDialogOpen, setFlowDialogOpen] = useState(false);
  const [flowDialogMode, setFlowDialogMode] = useState<'create' | 'edit'>('create');
  const [nodeDialogOpen, setNodeDialogOpen] = useState(false);
  const [nodeDialogMode, setNodeDialogMode] = useState<'create' | 'edit'>('create');
  const [editingNodeData, setEditingNodeData] = useState<ActivityData | undefined>();

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  // Fetch available datasets
  useEffect(() => {
    const fetchDatasets = async () => {
      const { data } = await supabase
        .from('datasets')
        .select('id, name, file_name')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setDatasets(data);
        setSelectedDataset(data[0].id);
      }
      setLoading(false);
    };

    fetchDatasets();
  }, []);

  // Fetch use cases for selected dataset
  useEffect(() => {
    if (!selectedDataset) return;

    const fetchUseCases = async () => {
      setLoading(true);

      const { data: useCasesData } = await supabase
        .from('automation_use_cases')
        .select('id, name, type, affected_activities, estimated_time_saved, confidence_score')
        .eq('dataset_id', selectedDataset);

      if (useCasesData) {
        setUseCases(useCasesData);
        setSelectedUseCase('all');
      }

      setLoading(false);
    };

    fetchUseCases();
  }, [selectedDataset]);

  // Get the activities to display based on selected use case
  const processActivities = useMemo(() => {
    if (useCases.length === 0) return [];

    if (selectedUseCase === 'all') {
      const allActivities: string[] = [];
      useCases.forEach(uc => {
        uc.affected_activities.forEach(activity => {
          if (!allActivities.includes(activity)) {
            allActivities.push(activity);
          }
        });
      });
      return allActivities;
    } else {
      const useCase = useCases.find(uc => uc.id === selectedUseCase);
      return useCase?.affected_activities || [];
    }
  }, [useCases, selectedUseCase]);

  // Convert process activities to ActivityData format
  useEffect(() => {
    if (processActivities.length > 0) {
      const activities: ActivityData[] = processActivities.map((activity, index) => {
        const useCase = useCases.find(uc => uc.affected_activities.includes(activity));
        const timeSaved = useCase 
          ? Math.round(useCase.estimated_time_saved / useCase.affected_activities.length)
          : 0;
        
        return {
          id: `activity-${index}`,
          name: activity,
          duration: 60,
          frequency: 1,
          automationType: useCase?.type,
          timeSaved,
        };
      });
      setOriginalActivities(activities);
      setEditableActivities(activities);
    }
  }, [processActivities, useCases]);

  const getAutomationType = (activity: string): string | null => {
    const useCase = useCases.find(uc => uc.affected_activities.includes(activity));
    return useCase?.type || null;
  };

  const getTimeSavedForActivity = (activity: string): number => {
    const useCase = useCases.find(uc => uc.affected_activities.includes(activity));
    if (!useCase) return 0;
    return Math.round(useCase.estimated_time_saved / useCase.affected_activities.length);
  };

  // Build flow visualization from activities
  useEffect(() => {
    const activities = isEditMode ? editableActivities : originalActivities;
    
    if (activities.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const nodeTypes = isEditMode ? 'editable' : (activeView === 'to-be' ? 'automated' : 'activity');

    const newNodes: Node[] = activities.map((activity, index) => {
      const baseDuration = activity.duration;
      const timeSaved = activity.timeSaved || 0;
      const newDuration = activeView === 'to-be' ? Math.max(baseDuration - timeSaved, 5) : baseDuration;

      const row = Math.floor(index / 3);
      const col = index % 3;
      const xOffset = row % 2 === 0 ? col : 2 - col;

      return {
        id: activity.id,
        type: isEditMode ? 'editable' : (activeView === 'to-be' ? 'automated' : 'activity'),
        position: { x: xOffset * 280 + 50, y: row * 180 + 50 },
        selected: activity.id === selectedNodeId,
        data: {
          label: activity.name.length > 50 ? activity.name.substring(0, 47) + '...' : activity.name,
          fullLabel: activity.name,
          frequency: activity.frequency,
          duration: activeView === 'to-be' ? newDuration : baseDuration,
          originalDuration: baseDuration,
          rework: 0,
          isAutomated: activeView === 'to-be',
          automationType: activity.automationType,
          timeSaved: timeSaved,
          showSavings: activeView === 'to-be',
          isEditable: isEditMode,
          onEdit: () => handleEditNode(activity),
          onDelete: () => handleDeleteNode(activity.id),
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    const newEdges: Edge[] = activities.slice(0, -1).map((activity, index) => ({
      id: `edge-${activity.id}-${activities[index + 1].id}`,
      source: activity.id,
      target: activities[index + 1].id,
      type: 'smoothstep',
      animated: activeView === 'to-be',
      style: { 
        strokeWidth: 2, 
        stroke: activeView === 'to-be' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))' 
      },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: activeView === 'to-be' ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
      },
    }));

    setNodes(newNodes);
    setEdges(newEdges);
  }, [editableActivities, originalActivities, useCases, activeView, isEditMode, selectedNodeId]);

  const totalTimeSaved = useMemo(() => {
    if (selectedUseCase === 'all') {
      return useCases.reduce((sum, uc) => sum + uc.estimated_time_saved, 0);
    }
    const useCase = useCases.find(uc => uc.id === selectedUseCase);
    return useCase?.estimated_time_saved || 0;
  }, [useCases, selectedUseCase]);

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) return `${Math.round(minutes)}m`;
    return `${(minutes / 60).toFixed(1)}h`;
  };

  // Node selection handler
  const handleNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    if (isEditMode) {
      setSelectedNodeId(node.id);
    }
  }, [isEditMode]);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // CRUD handlers
  const handleCreateFlow = () => {
    setFlowDialogMode('create');
    setFlowDialogOpen(true);
  };

  const handleSaveNewFlow = async (data: { name: string; description: string; activities: ActivityData[] }) => {
    try {
      // Create a new dataset for the flow
      const { data: newDataset, error: datasetError } = await supabase
        .from('datasets')
        .insert({
          name: data.name,
          description: data.description,
          file_name: `${data.name.toLowerCase().replace(/\s+/g, '-')}.json`,
          status: 'completed',
          row_count: data.activities.length,
        })
        .select()
        .single();

      if (datasetError) throw datasetError;

      // Create use case with activities
      const { error: useCaseError } = await supabase
        .from('automation_use_cases')
        .insert({
          dataset_id: newDataset.id,
          name: data.name,
          type: data.activities.some(a => a.automationType) ? data.activities.find(a => a.automationType)?.automationType : 'RPA',
          affected_activities: data.activities.map(a => a.name),
          estimated_time_saved: data.activities.reduce((sum, a) => sum + (a.timeSaved || 0), 0),
          confidence_score: 0.8,
          pattern_type: 'manual',
          complexity: 'medium',
          monthly_volume: 100,
        });

      if (useCaseError) throw useCaseError;

      // Refresh datasets
      const { data: refreshedData } = await supabase
        .from('datasets')
        .select('id, name, file_name')
        .order('created_at', { ascending: false });

      if (refreshedData) {
        setDatasets(refreshedData);
        setSelectedDataset(newDataset.id);
      }

      toast.success('Process flow created successfully');
    } catch (error) {
      console.error('Error creating flow:', error);
      toast.error('Failed to create process flow');
    }
  };

  const handleToggleEditMode = () => {
    if (isEditMode && hasChanges) {
      toast.warning('You have unsaved changes. Save or discard before exiting edit mode.');
      return;
    }
    setIsEditMode(!isEditMode);
    setSelectedNodeId(null);
  };

  const handleAddNode = () => {
    setNodeDialogMode('create');
    setEditingNodeData(undefined);
    setNodeDialogOpen(true);
  };

  const handleEditNode = (activity: ActivityData) => {
    setNodeDialogMode('edit');
    setEditingNodeData(activity);
    setNodeDialogOpen(true);
  };

  const handleEditSelectedNode = () => {
    if (selectedNodeId) {
      const activity = editableActivities.find(a => a.id === selectedNodeId);
      if (activity) {
        handleEditNode(activity);
      }
    }
  };

  const handleSaveNode = (nodeData: { id: string; label: string; duration: number; frequency: number; automationType?: string; timeSaved?: number }) => {
    if (nodeDialogMode === 'create') {
      const newActivity: ActivityData = {
        id: nodeData.id,
        name: nodeData.label,
        duration: nodeData.duration,
        frequency: nodeData.frequency,
        automationType: nodeData.automationType,
        timeSaved: nodeData.timeSaved,
      };
      setEditableActivities([...editableActivities, newActivity]);
    } else {
      setEditableActivities(editableActivities.map(a => 
        a.id === nodeData.id 
          ? { ...a, name: nodeData.label, duration: nodeData.duration, frequency: nodeData.frequency, automationType: nodeData.automationType, timeSaved: nodeData.timeSaved }
          : a
      ));
    }
    setHasChanges(true);
    toast.success(nodeDialogMode === 'create' ? 'Activity added' : 'Activity updated');
  };

  const handleDeleteNode = (nodeId: string) => {
    if (editableActivities.length <= 1) {
      toast.error('Cannot delete the last activity. Delete the entire flow instead.');
      return;
    }
    setEditableActivities(editableActivities.filter(a => a.id !== nodeId));
    setSelectedNodeId(null);
    setHasChanges(true);
    toast.success('Activity deleted');
  };

  const handleDeleteSelectedNode = () => {
    if (selectedNodeId) {
      handleDeleteNode(selectedNodeId);
    }
  };

  const handleSaveChanges = async () => {
    try {
      // Update the use case with new activities
      const useCase = useCases.find(uc => 
        selectedUseCase === 'all' ? true : uc.id === selectedUseCase
      );
      
      if (useCase) {
        const { error } = await supabase
          .from('automation_use_cases')
          .update({
            affected_activities: editableActivities.map(a => a.name),
            estimated_time_saved: editableActivities.reduce((sum, a) => sum + (a.timeSaved || 0), 0),
            type: editableActivities.find(a => a.automationType)?.automationType || useCase.type,
          })
          .eq('id', useCase.id);

        if (error) throw error;
      }

      setOriginalActivities([...editableActivities]);
      setHasChanges(false);
      toast.success('Changes saved successfully');
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to save changes');
    }
  };

  const handleDiscardChanges = () => {
    setEditableActivities([...originalActivities]);
    setHasChanges(false);
    setSelectedNodeId(null);
    toast.info('Changes discarded');
  };

  const handleDeleteFlow = async () => {
    try {
      // Delete use cases first
      await supabase
        .from('automation_use_cases')
        .delete()
        .eq('dataset_id', selectedDataset);

      // Delete activity metrics
      await supabase
        .from('activity_metrics')
        .delete()
        .eq('dataset_id', selectedDataset);

      // Delete process events
      await supabase
        .from('process_events')
        .delete()
        .eq('dataset_id', selectedDataset);

      // Delete the dataset
      await supabase
        .from('datasets')
        .delete()
        .eq('id', selectedDataset);

      // Refresh datasets
      const { data } = await supabase
        .from('datasets')
        .select('id, name, file_name')
        .order('created_at', { ascending: false });

      if (data && data.length > 0) {
        setDatasets(data);
        setSelectedDataset(data[0].id);
      } else {
        setDatasets([]);
        setSelectedDataset('');
      }

      setIsEditMode(false);
      toast.success('Process flow deleted successfully');
    } catch (error) {
      console.error('Error deleting flow:', error);
      toast.error('Failed to delete process flow');
    }
  };

  const handleExport = () => {
    const activities = isEditMode ? editableActivities : originalActivities;
    const dataset = datasets.find(d => d.id === selectedDataset);
    
    const exportData = {
      name: dataset?.name || 'Process Flow',
      exportedAt: new Date().toISOString(),
      activities: activities.map(a => ({
        name: a.name,
        duration: a.duration,
        frequency: a.frequency,
        automationType: a.automationType || null,
        timeSaved: a.timeSaved || 0,
      })),
      useCases: useCases.map(uc => ({
        name: uc.name,
        type: uc.type,
        affectedActivities: uc.affected_activities,
        estimatedTimeSaved: uc.estimated_time_saved,
        confidenceScore: uc.confidence_score,
      })),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${dataset?.name || 'process-flow'}-export.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Flow exported successfully');
  };

  // Custom node types including editable
  const nodeTypes = useMemo(() => ({
    activity: ActivityNode,
    automated: AutomatedNode,
    editable: EditableActivityNode,
  }), []);

  if (loading && datasets.length === 0) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[500px] w-full" />
        </div>
      </AppLayout>
    );
  }

  if (datasets.length === 0) {
    return (
      <AppLayout>
        <TooltipProvider>
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-3xl font-bold">Process Flow Visualization</h1>
                <p className="text-muted-foreground mt-1">
                  Compare current state vs automated future state
                </p>
              </div>
              <Button onClick={handleCreateFlow}>
                Create New Flow
              </Button>
            </div>
            <EmptyState
              icon={<FileUp className="h-6 w-6" />}
              title="No Process Data Available"
              description="Create a new process flow or upload process data (CSV) to visualize automation opportunities."
              action={
                <div className="flex gap-2">
                  <Button onClick={handleCreateFlow}>
                    Create Flow
                  </Button>
                  <Button variant="outline" onClick={() => navigate('/upload')}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Upload Data
                  </Button>
                </div>
              }
            />
          </div>
        </TooltipProvider>

        <FlowEditorDialog
          open={flowDialogOpen}
          onOpenChange={setFlowDialogOpen}
          mode={flowDialogMode}
          onSave={handleSaveNewFlow}
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <TooltipProvider>
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold">Process Flow Visualization</h1>
              <p className="text-muted-foreground mt-1">
                Compare current state vs automated future state
              </p>
            </div>
            
            <div className="flex items-center gap-4">
              <Select value={selectedDataset} onValueChange={setSelectedDataset}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Select dataset" />
                </SelectTrigger>
                <SelectContent>
                  {datasets.map(ds => (
                    <SelectItem key={ds.id} value={ds.id}>
                      {ds.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedUseCase} onValueChange={setSelectedUseCase}>
                <SelectTrigger className="w-[250px]">
                  <SelectValue placeholder="Select use case" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Use Cases ({useCases.length})</SelectItem>
                  {useCases.map(uc => (
                    <SelectItem key={uc.id} value={uc.id}>
                      {uc.name.length > 35 ? uc.name.substring(0, 32) + '...' : uc.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {!isEditMode && (
                <Tabs value={activeView} onValueChange={(v) => setActiveView(v as 'as-is' | 'to-be')}>
                  <TabsList className="grid grid-cols-2 w-[280px]">
                    <TabsTrigger value="as-is" className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      AS-IS (Current)
                    </TabsTrigger>
                    <TabsTrigger value="to-be" className="flex items-center gap-2">
                      <Bot className="h-4 w-4" />
                      TO-BE (Automated)
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              )}
            </div>
          </div>

          {/* Toolbar */}
          <Card>
            <CardContent className="py-3">
              <FlowToolbar
                isEditMode={isEditMode}
                hasChanges={hasChanges}
                hasSelectedNode={!!selectedNodeId}
                onToggleEditMode={handleToggleEditMode}
                onCreateFlow={handleCreateFlow}
                onAddNode={handleAddNode}
                onEditNode={handleEditSelectedNode}
                onDeleteNode={handleDeleteSelectedNode}
                onSaveChanges={handleSaveChanges}
                onDiscardChanges={handleDiscardChanges}
                onDeleteFlow={handleDeleteFlow}
                onExport={handleExport}
              />
            </CardContent>
          </Card>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Zap className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Use Cases</p>
                    <p className="text-2xl font-bold">{selectedUseCase === 'all' ? useCases.length : 1}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Clock className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Activities</p>
                    <p className="text-2xl font-bold">{(isEditMode ? editableActivities : originalActivities).length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className={activeView === 'to-be' && !isEditMode ? 'border-green-500/50 bg-green-500/5' : ''}>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg ${activeView === 'to-be' && !isEditMode ? 'bg-green-500/20' : 'bg-muted'}`}>
                    <TrendingDown className={`h-5 w-5 ${activeView === 'to-be' && !isEditMode ? 'text-green-500' : 'text-muted-foreground'}`} />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Time Saved</p>
                    <p className="text-2xl font-bold text-green-600">{formatDuration(totalTimeSaved)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-muted rounded-lg">
                    <Bot className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Automation Type</p>
                    <p className="text-2xl font-bold">
                      {selectedUseCase === 'all' 
                        ? 'Mixed' 
                        : useCases.find(uc => uc.id === selectedUseCase)?.type || '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Flow Diagram */}
          <Card className="overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2">
                {isEditMode ? (
                  <>
                    <Zap className="h-5 w-5 text-primary" />
                    Edit Mode {hasChanges && <Badge variant="outline" className="ml-2 text-amber-600">Unsaved changes</Badge>}
                  </>
                ) : activeView === 'as-is' ? (
                  <>
                    <Users className="h-5 w-5" />
                    Current Process (Manual)
                  </>
                ) : (
                  <>
                    <Bot className="h-5 w-5 text-primary" />
                    Future Process (Automated)
                  </>
                )}
                {(isEditMode ? editableActivities : originalActivities).length > 0 && (
                  <Badge variant="secondary" className="ml-2">
                    {(isEditMode ? editableActivities : originalActivities).length} activities
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[500px] w-full">
                {(isEditMode ? editableActivities : originalActivities).length > 0 ? (
                  <ReactFlow
                    nodes={nodes}
                    edges={edges}
                    onNodesChange={onNodesChange}
                    onEdgesChange={onEdgesChange}
                    onNodeClick={handleNodeClick}
                    onPaneClick={handlePaneClick}
                    nodeTypes={nodeTypes}
                    fitView
                    fitViewOptions={{ padding: 0.2 }}
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background gap={20} />
                    <Controls />
                  </ReactFlow>
                ) : (
                  <div className="h-full flex items-center justify-center">
                    <EmptyState
                      icon={<FileUp className="h-6 w-6" />}
                      title="No Use Cases Found"
                      description="Upload documents to analyze and generate automation use cases for visualization."
                      action={
                        <Button onClick={() => navigate('/upload')}>
                          <FileUp className="mr-2 h-4 w-4" />
                          Upload Documents
                        </Button>
                      }
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Legend */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Legend</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-card border-2 border-muted-foreground rounded" />
                  <span className="text-sm">Manual Activity</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary/10 border-2 border-primary rounded" />
                  <span className="text-sm">Automated Activity</span>
                </div>
                {isEditMode && (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 bg-card border-2 border-primary ring-2 ring-primary/20 rounded" />
                    <span className="text-sm">Selected (Editable)</span>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-muted-foreground" />
                  <span className="text-sm">Process Flow</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-0.5 bg-primary animate-pulse" />
                  <span className="text-sm">Automated Flow</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </TooltipProvider>

      {/* Dialogs */}
      <FlowEditorDialog
        open={flowDialogOpen}
        onOpenChange={setFlowDialogOpen}
        mode={flowDialogMode}
        onSave={handleSaveNewFlow}
      />

      <NodeEditorDialog
        open={nodeDialogOpen}
        onOpenChange={setNodeDialogOpen}
        mode={nodeDialogMode}
        nodeData={editingNodeData ? {
          id: editingNodeData.id,
          label: editingNodeData.name,
          duration: editingNodeData.duration,
          frequency: editingNodeData.frequency,
          automationType: editingNodeData.automationType,
          timeSaved: editingNodeData.timeSaved,
        } : undefined}
        onSave={handleSaveNode}
        onDelete={editingNodeData ? () => handleDeleteNode(editingNodeData.id) : undefined}
      />
    </AppLayout>
  );
};

export default ProcessFlowVisualization;
