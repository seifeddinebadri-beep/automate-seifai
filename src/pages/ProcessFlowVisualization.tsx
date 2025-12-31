import { useState, useEffect, useMemo } from 'react';
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
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';

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

const nodeTypes = {
  activity: ActivityNode,
  automated: AutomatedNode,
};

const ProcessFlowVisualization = () => {
  const navigate = useNavigate();
  const [activeView, setActiveView] = useState<'as-is' | 'to-be'>('as-is');
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [selectedDataset, setSelectedDataset] = useState<string>('');
  const [useCases, setUseCases] = useState<AutomationUseCase[]>([]);
  const [selectedUseCase, setSelectedUseCase] = useState<string>('all');
  const [loading, setLoading] = useState(true);

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
      // Show all unique activities from all use cases
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
      // Show activities from selected use case
      const useCase = useCases.find(uc => uc.id === selectedUseCase);
      return useCase?.affected_activities || [];
    }
  }, [useCases, selectedUseCase]);

  const getAutomationType = (activity: string): string | null => {
    const useCase = useCases.find(uc => uc.affected_activities.includes(activity));
    return useCase?.type || null;
  };

  const getTimeSavedForActivity = (activity: string): number => {
    // Distribute time saved across affected activities
    const useCase = useCases.find(uc => uc.affected_activities.includes(activity));
    if (!useCase) return 0;
    return Math.round(useCase.estimated_time_saved / useCase.affected_activities.length);
  };

  const getUseCaseName = (activity: string): string | null => {
    const useCase = useCases.find(uc => uc.affected_activities.includes(activity));
    return useCase?.name || null;
  };

  // Build flow visualization from activities
  useEffect(() => {
    if (processActivities.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }

    const newNodes: Node[] = processActivities.map((activity, index) => {
      const automationType = getAutomationType(activity);
      const timeSaved = getTimeSavedForActivity(activity);
      const baseDuration = 60; // Default 1 minute per activity for estimation
      const newDuration = activeView === 'to-be' ? Math.max(baseDuration - timeSaved, 5) : baseDuration;

      // Calculate position - arrange in a flowing layout
      const row = Math.floor(index / 3);
      const col = index % 3;
      const xOffset = row % 2 === 0 ? col : 2 - col; // Alternate direction for readability

      return {
        id: `node-${index}`,
        type: activeView === 'to-be' ? 'automated' : 'activity',
        position: { x: xOffset * 280 + 50, y: row * 180 + 50 },
        data: {
          label: activity.length > 50 ? activity.substring(0, 47) + '...' : activity,
          fullLabel: activity,
          frequency: 1,
          duration: activeView === 'to-be' ? newDuration : baseDuration,
          originalDuration: baseDuration,
          rework: 0,
          isAutomated: activeView === 'to-be',
          automationType: automationType,
          timeSaved: timeSaved,
          showSavings: activeView === 'to-be',
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Create edges following the activity order
    const newEdges: Edge[] = processActivities.slice(0, -1).map((_, index) => ({
      id: `edge-${index}`,
      source: `node-${index}`,
      target: `node-${index + 1}`,
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
  }, [processActivities, useCases, activeView]);

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
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold">Process Flow Visualization</h1>
            <p className="text-muted-foreground mt-1">
              Compare current state vs automated future state
            </p>
          </div>
          <EmptyState
            icon={<FileUp className="h-6 w-6" />}
            title="No Process Data Available"
            description="Upload process data (CSV) or documents to visualize the process flow and automation opportunities."
            action={
              <Button onClick={() => navigate('/upload')}>
                <FileUp className="mr-2 h-4 w-4" />
                Upload Data
              </Button>
            }
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
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
          </div>
        </div>

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
                  <p className="text-2xl font-bold">{processActivities.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={activeView === 'to-be' ? 'border-green-500/50 bg-green-500/5' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${activeView === 'to-be' ? 'bg-green-500/20' : 'bg-muted'}`}>
                  <TrendingDown className={`h-5 w-5 ${activeView === 'to-be' ? 'text-green-500' : 'text-muted-foreground'}`} />
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
              {activeView === 'as-is' ? (
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
              {processActivities.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {processActivities.length} activities
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] w-full">
              {processActivities.length > 0 ? (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
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
    </AppLayout>
  );
};

export default ProcessFlowVisualization;
