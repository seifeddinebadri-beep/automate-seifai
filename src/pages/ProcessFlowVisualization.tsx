import { useState, useCallback, useEffect, useMemo } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { Bot, Clock, TrendingDown, Users, Zap, ArrowRight } from 'lucide-react';
import ActivityNode from '@/components/flow/ActivityNode';
import AutomatedNode from '@/components/flow/AutomatedNode';

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

const nodeTypes = {
  activity: ActivityNode,
  automated: AutomatedNode,
};

const ProcessFlowVisualization = () => {
  const [activeView, setActiveView] = useState<'as-is' | 'to-be'>('as-is');
  const [metrics, setMetrics] = useState<ActivityMetric[]>([]);
  const [useCases, setUseCases] = useState<AutomationUseCase[]>([]);
  const [loading, setLoading] = useState(true);

  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      const { data: metricsData } = await supabase
        .from('activity_metrics')
        .select('activity, frequency, avg_duration, rework_count')
        .order('frequency', { ascending: false });

      const { data: useCasesData } = await supabase
        .from('automation_use_cases')
        .select('name, type, affected_activities, estimated_time_saved, confidence_score');

      if (metricsData) setMetrics(metricsData);
      if (useCasesData) setUseCases(useCasesData);
      
      setLoading(false);
    };

    fetchData();
  }, []);

  // Process flow order based on typical Order-to-Cash
  const processOrder = [
    'Create Sales Order',
    'Credit Check',
    'Inventory Check',
    'Generate Invoice',
    'Send Invoice Email',
    'Ship Order',
  ];

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

  useEffect(() => {
    if (metrics.length === 0) return;

    const orderedMetrics = processOrder
      .map(name => metrics.find(m => m.activity === name))
      .filter(Boolean) as ActivityMetric[];

    const newNodes: Node[] = orderedMetrics.map((metric, index) => {
      const isAutomated = automatedActivities.has(metric.activity);
      const automationType = getAutomationType(metric.activity);
      const timeSaved = getTimeSaved(metric.activity);
      const originalDuration = metric.avg_duration || 0;
      const newDuration = activeView === 'to-be' && isAutomated 
        ? Math.max(originalDuration - timeSaved, originalDuration * 0.1)
        : originalDuration;

      return {
        id: `node-${index}`,
        type: activeView === 'to-be' && isAutomated ? 'automated' : 'activity',
        position: { x: index * 220, y: 150 },
        data: {
          label: metric.activity,
          frequency: metric.frequency,
          duration: activeView === 'to-be' && isAutomated ? newDuration : originalDuration,
          originalDuration: originalDuration,
          rework: metric.rework_count || 0,
          isAutomated: activeView === 'to-be' && isAutomated,
          automationType: automationType,
          timeSaved: timeSaved,
          showSavings: activeView === 'to-be' && isAutomated,
        },
        sourcePosition: Position.Right,
        targetPosition: Position.Left,
      };
    });

    const newEdges: Edge[] = orderedMetrics.slice(0, -1).map((_, index) => ({
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
  }, [metrics, useCases, activeView, automatedActivities]);

  const totalCurrentDuration = useMemo(() => {
    return metrics.reduce((sum, m) => sum + (m.avg_duration || 0), 0);
  }, [metrics]);

  const totalAutomatedDuration = useMemo(() => {
    return metrics.reduce((sum, m) => {
      const isAutomated = automatedActivities.has(m.activity);
      const timeSaved = getTimeSaved(m.activity);
      const original = m.avg_duration || 0;
      return sum + (isAutomated ? Math.max(original - timeSaved, original * 0.1) : original);
    }, 0);
  }, [metrics, automatedActivities, useCases]);

  const timeSavedPercentage = totalCurrentDuration > 0 
    ? Math.round(((totalCurrentDuration - totalAutomatedDuration) / totalCurrentDuration) * 100)
    : 0;

  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="space-y-6">
          <Skeleton className="h-12 w-64" />
          <Skeleton className="h-[500px] w-full" />
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
                  <p className="text-2xl font-bold">{automatedActivities.size} / {metrics.length}</p>
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
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="h-[400px] w-full">
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
