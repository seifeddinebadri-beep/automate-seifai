import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Activity, Clock, RefreshCcw, AlertTriangle, Upload } from "lucide-react";

interface ActivityMetric {
  id: string;
  activity: string;
  frequency: number;
  avg_duration: number;
  max_duration: number;
  min_duration: number;
  rework_count: number;
  avg_waiting_time: number;
  unique_cases: number;
}

interface Dataset {
  id: string;
  name: string;
  row_count: number;
  status: string;
  created_at: string;
}

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
  "hsl(199, 89%, 48%)",
];

export default function ProcessOverview() {
  const [metrics, setMetrics] = useState<ActivityMetric[]>([]);
  const [datasets, setDatasets] = useState<Dataset[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDataset, setSelectedDataset] = useState<string | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch datasets
      const { data: ds } = await supabase
        .from("datasets")
        .select("*")
        .order("created_at", { ascending: false });

      setDatasets(ds || []);

      if (ds && ds.length > 0) {
        const datasetId = selectedDataset || ds[0].id;
        setSelectedDataset(datasetId);

        // Fetch metrics for selected dataset
        const { data: metricsData } = await supabase
          .from("activity_metrics")
          .select("*")
          .eq("dataset_id", datasetId)
          .order("frequency", { ascending: false });

        setMetrics(metricsData || []);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "-";
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m`;
    return `${(seconds / 3600).toFixed(1)}h`;
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (datasets.length === 0) {
    return (
      <AppLayout>
        <EmptyState
          icon={<Upload className="h-6 w-6" />}
          title="No process data available"
          description="Upload your process data to view activity metrics and identify bottlenecks."
          action={
            <Button asChild>
              <Link to="/upload">Upload Data</Link>
            </Button>
          }
        />
      </AppLayout>
    );
  }

  // Prepare chart data
  const frequencyData = metrics.slice(0, 10).map((m) => ({
    activity: m.activity.length > 20 ? m.activity.slice(0, 20) + "..." : m.activity,
    frequency: m.frequency,
  }));

  const durationData = metrics
    .filter((m) => m.avg_duration)
    .slice(0, 10)
    .map((m) => ({
      activity: m.activity.length > 20 ? m.activity.slice(0, 20) + "..." : m.activity,
      duration: Math.round(Number(m.avg_duration)),
    }));

  const bottlenecks = metrics
    .filter((m) => m.avg_waiting_time && m.avg_waiting_time > 0)
    .sort((a, b) => (b.avg_waiting_time || 0) - (a.avg_waiting_time || 0))
    .slice(0, 5);

  const reworkActivities = metrics
    .filter((m) => m.rework_count > 0)
    .sort((a, b) => b.rework_count - a.rework_count)
    .slice(0, 5);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Dataset Selector */}
        {datasets.length > 1 && (
          <div className="flex gap-2">
            {datasets.map((ds) => (
              <Button
                key={ds.id}
                variant={selectedDataset === ds.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedDataset(ds.id);
                  fetchData();
                }}
              >
                {ds.name}
              </Button>
            ))}
          </div>
        )}

        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Activity className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{metrics.length}</p>
                  <p className="text-sm text-muted-foreground">Unique Activities</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-chart-2/10">
                  <Clock className="h-5 w-5 text-chart-2" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">
                    {metrics.reduce((sum, m) => sum + m.frequency, 0).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Executions</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                  <RefreshCcw className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{reworkActivities.length}</p>
                  <p className="text-sm text-muted-foreground">Activities with Rework</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-destructive/10">
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                </div>
                <div>
                  <p className="text-2xl font-semibold">{bottlenecks.length}</p>
                  <p className="text-sm text-muted-foreground">Bottleneck Areas</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Frequency Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activity Frequency</CardTitle>
            </CardHeader>
            <CardContent>
              {frequencyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={frequencyData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis
                      type="category"
                      dataKey="activity"
                      width={120}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="frequency" radius={[0, 4, 4, 0]}>
                      {frequencyData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No frequency data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Duration Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Average Duration (seconds)</CardTitle>
            </CardHeader>
            <CardContent>
              {durationData.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={durationData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis type="number" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                    <YAxis
                      type="category"
                      dataKey="activity"
                      width={120}
                      tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                    <Bar dataKey="duration" fill="hsl(var(--chart-2))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-[300px] items-center justify-center text-muted-foreground">
                  No duration data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Bottlenecks & Rework */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Bottlenecks */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Top Bottlenecks (Wait Time)</CardTitle>
            </CardHeader>
            <CardContent>
              {bottlenecks.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead className="text-right">Avg Wait</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bottlenecks.map((b) => (
                      <TableRow key={b.id}>
                        <TableCell className="font-medium">{b.activity}</TableCell>
                        <TableCell className="text-right text-warning">
                          {formatDuration(b.avg_waiting_time)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No significant bottlenecks detected
                </div>
              )}
            </CardContent>
          </Card>

          {/* Rework Activities */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Activities with Rework</CardTitle>
            </CardHeader>
            <CardContent>
              {reworkActivities.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Activity</TableHead>
                      <TableHead className="text-right">Rework Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reworkActivities.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell className="font-medium">{r.activity}</TableCell>
                        <TableCell className="text-right text-destructive">
                          {r.rework_count}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="py-8 text-center text-muted-foreground">
                  No rework patterns detected
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Full Metrics Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">All Activity Metrics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Activity</TableHead>
                    <TableHead className="text-right">Frequency</TableHead>
                    <TableHead className="text-right">Avg Duration</TableHead>
                    <TableHead className="text-right">Min Duration</TableHead>
                    <TableHead className="text-right">Max Duration</TableHead>
                    <TableHead className="text-right">Unique Cases</TableHead>
                    <TableHead className="text-right">Rework</TableHead>
                    <TableHead className="text-right">Wait Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {metrics.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell className="font-medium">{m.activity}</TableCell>
                      <TableCell className="text-right">{m.frequency}</TableCell>
                      <TableCell className="text-right">{formatDuration(Number(m.avg_duration))}</TableCell>
                      <TableCell className="text-right">{formatDuration(m.min_duration)}</TableCell>
                      <TableCell className="text-right">{formatDuration(m.max_duration)}</TableCell>
                      <TableCell className="text-right">{m.unique_cases}</TableCell>
                      <TableCell className="text-right">
                        {m.rework_count > 0 ? (
                          <span className="text-warning">{m.rework_count}</span>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {m.avg_waiting_time ? formatDuration(m.avg_waiting_time) : "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
