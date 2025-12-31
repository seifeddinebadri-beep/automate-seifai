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

interface ProcessEvent {
  case_id: string;
  activity: string;
  timestamp: string;
}

interface ActivityMetric {
  activity: string;
  frequency: number;
  avg_duration: number | null;
  rework_count: number | null;
}

interface AutomationUseCase {
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
  const [processEvents, setProcessEvents] = useState<ProcessEvent[]>([]);
  const [metrics, setMetrics] = useState<ActivityMetric[]>([]);
  const [useCases, setUseCases] = useState<AutomationUseCase[]>([]);
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

  // Fetch data for selected dataset
  useEffect(() => {
    if (!selectedDataset) return;

    const fetchData = async () => {
      setLoading(true);

      // Fetch process events for this dataset
      const { data: eventsData } = await supabase
        .from('process_events')
        .select('case_id, activity, timestamp')
        .eq('dataset_id', selectedDataset)
        .order('timestamp', { ascending: true });

      // Fetch activity metrics for this dataset
      const { data: metricsData } = await supabase
        .from('activity_metrics')
        .select('activity, frequency, avg_duration, rework_count')
        .eq('dataset_id', selectedDataset);

      // Fetch automation use cases for this dataset
      const { data: useCasesData } = await supabase
        .from('automation_use_cases')
        .select('name, type, affected_activities, estimated_time_saved, confidence_score')
        .eq('dataset_id', selectedDataset);

      if (eventsData) setProcessEvents(eventsData);
      if (metricsData) setMetrics(metricsData);
      if (useCasesData) setUseCases(useCasesData);

      setLoading(false);
    };

    fetchData();
  }, [selectedDataset]);

  // Derive process flow order from actual events
  const processOrder = useMemo(() => {
    if (processEvents.length === 0) return [];

    // Group events by case_id
    const caseActivities = new Map<string, string[]>();
    processEvents.forEach(event => {
      if (!caseActivities.has(event.case_id)) {
        caseActivities.set(event.case_id, []);
      }
      caseActivities.get(event.case_id)!.push(event.activity);
    });

    // Build transition frequency map to determine most common flow
    const transitions = new Map<string, Map<string, number>>();
    const firstActivities = new Map<string, number>();

    caseActivities.forEach(activities => {
      // Count first activity occurrences
      if (activities.length > 0) {
        const first = activities[0];
        firstActivities.set(first, (firstActivities.get(first) || 0) + 1);
      }

      // Count transitions
      for (let i = 0; i < activities.length - 1; i++) {
        const from = activities[i];
        const to = activities[i + 1];
        
        if (!transitions.has(from)) {
          transitions.set(from, new Map());
        }
        const fromMap = transitions.get(from)!;
        fromMap.set(to, (fromMap.get(to) || 0) + 1);
      }
    });

    // Find most common starting activity
    let startActivity = '';
    let maxStartCount = 0;
    firstActivities.forEach((count, activity) => {
      if (count > maxStartCount) {
        maxStartCount = count;
        startActivity = activity;
      }
    });

    // Build ordered flow following most common transitions
    const orderedActivities: string[] = [];
    const visited = new Set<string>();
    let current = startActivity;

    while (current && !visited.has(current)) {
      orderedActivities.push(current);
      visited.add(current);

      // Find most common next activity
      const nextMap = transitions.get(current);
      if (!nextMap || nextMap.size === 0) break;

      let nextActivity = '';
      let maxCount = 0;
      nextMap.forEach((count, activity) => {
        if (count > maxCount && !visited.has(activity)) {
          maxCount = count;
          nextActivity = activity;
        }
      });

      current = nextActivity;
    }

    // Add any remaining activities not in the main flow
    const allActivities = new Set(processEvents.map(e => e.activity));
    allActivities.forEach(activity => {
      if (!visited.has(activity)) {
        orderedActivities.push(activity);
      }
    });

    return orderedActivities;
  }, [processEvents]);

  const automatedActivities = useMemo(() => {
    const activities = new Set<string>();
    useCases.forEach(uc => {
      uc.affected_activities.forEach(a => activities.add(a));
    });
    return activities;
  }, [useCases]);

  const getAutomationType = (activity: string): string | null => {
    const useCase = useCases.find(uc => uc.affected_activities.includes(activity));
    return useCase?.type || null;
  };

  const getTimeSaved = (activity: string): number => {
    const useCase = useCases.find(uc => uc.affected_activities.includes(activity));
    return useCase?.estimated_time_saved || 0;
  };

  const getMetricForActivity = (activity: string): ActivityMetric | undefined => {
    return metrics.find(m => m.activity === activity);
  };

  // Build flow visualization from derived process order
  useEffect(() => {
    if (processOrder.length === 0) return;

    const newNodes: Node[] = processOrder.map((activity, index) => {
      const metric = getMetricForActivity(activity);
      const isAutomated = automatedActivities.has(activity);
      const automationType = getAutomationType(activity);
      const timeSaved = getTimeSaved(activity);
      const originalDuration = metric?.avg_duration || 0;
      const newDuration = activeView === 'to-be' && isAutomated 
        ? Math.max(originalDuration - timeSaved, originalDuration * 0.1)
        : originalDuration;

      // Calculate position - arrange in a flowing layout
      const row = Math.floor(index / 4);
      const col = index % 4;
      const xOffset = row % 2 === 0 ? col : 3 - col; // Alternate direction for readability

      return {
        id: `node-${index}`,
        type: activeView === 'to-be' && isAutomated ? 'automated' : 'activity',
        position: { x: xOffset * 250 + 50, y: row * 180 + 50 },
        data: {
          label: activity,
          frequency: metric?.frequency || processEvents.filter(e => e.activity === activity).length,
          duration: activeView === 'to-be' && isAutomated ? newDuration : originalDuration,
          originalDuration: originalDuration,
          rework: metric?.rework_count || 0,
          isAutomated: activeView === 'to-be' && isAutomated,
          automationType: automationType,
          timeSaved: timeSaved,
          showSavings: activeView === 'to-be' && isAutomated,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    // Create edges following the process order
    const newEdges: Edge[] = processOrder.slice(0, -1).map((_, index) => {
      const row = Math.floor(index / 4);
      const nextRow = Math.floor((index + 1) / 4);
      const isRowChange = row !== nextRow;

      return {
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
      };
    });

    setNodes(newNodes);
    setEdges(newEdges);
  }, [processOrder, metrics, useCases, activeView, automatedActivities, processEvents]);

  const totalCurrentDuration = useMemo(() => {
    return processOrder.reduce((sum, activity) => {
      const metric = getMetricForActivity(activity);
      return sum + (metric?.avg_duration || 0);
    }, 0);
  }, [processOrder, metrics]);

  const totalAutomatedDuration = useMemo(() => {
    return processOrder.reduce((sum, activity) => {
      const metric = getMetricForActivity(activity);
      const isAutomated = automatedActivities.has(activity);
      const timeSaved = getTimeSaved(activity);
      const original = metric?.avg_duration || 0;
      return sum + (isAutomated ? Math.max(original - timeSaved, original * 0.1) : original);
    }, 0);
  }, [processOrder, metrics, automatedActivities, useCases]);

  const timeSavedPercentage = totalCurrentDuration > 0 
    ? Math.round(((totalCurrentDuration - totalAutomatedDuration) / totalCurrentDuration) * 100)
    : 0;

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
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
                  <Clock className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Current Duration</p>
                  <p className="text-2xl font-bold">{formatDuration(totalCurrentDuration)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className={activeView === 'to-be' ? 'border-primary/50 bg-primary/5' : ''}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${activeView === 'to-be' ? 'bg-primary/20' : 'bg-muted'}`}>
                  <Zap className={`h-5 w-5 ${activeView === 'to-be' ? 'text-primary' : 'text-muted-foreground'}`} />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Automated Duration</p>
                  <p className="text-2xl font-bold">{formatDuration(totalAutomatedDuration)}</p>
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
                  <p className="text-2xl font-bold text-green-600">{timeSavedPercentage}%</p>
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
                  <p className="text-sm text-muted-foreground">Automated Activities</p>
                  <p className="text-2xl font-bold">{automatedActivities.size} / {processOrder.length}</p>
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
              {processOrder.length > 0 && (
                <Badge variant="secondary" className="ml-2">
                  {processOrder.length} activities
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[500px] w-full">
              {processOrder.length > 0 ? (
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
                <div className="h-full flex items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <FileUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No process events found for this dataset</p>
                    <p className="text-sm">Upload process data to visualize the flow</p>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Legend */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-card border-2 border-muted-foreground" />
                <span className="text-sm">Manual Activity</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 rounded bg-primary/20 border-2 border-primary" />
                <span className="text-sm">Automated Activity</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">RPA</Badge>
                <span className="text-sm">Robotic Process Automation</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Workflow</Badge>
                <span className="text-sm">Workflow Automation</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">Rule</Badge>
                <span className="text-sm">Business Rules Engine</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs">AI Agent</Badge>
                <span className="text-sm">AI-Powered Automation</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
};

export default ProcessFlowVisualization;
