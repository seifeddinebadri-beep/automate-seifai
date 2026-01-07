import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { EmptyState } from "@/components/ui/empty-state";
import { TypeBadge } from "@/components/ui/type-badge";
import { ComplexityBadge } from "@/components/ui/complexity-badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  UseCaseFilters,
  filterUseCases,
  type UseCaseType,
  type Complexity,
} from "@/components/filters/UseCaseFilters";
import { supabase } from "@/integrations/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import {
  Calculator,
  DollarSign,
  TrendingUp,
  Clock,
  Settings,
} from "lucide-react";

interface UseCase {
  id: string;
  name: string;
  description: string | null;
  type: UseCaseType;
  complexity: Complexity;
  monthly_volume: number;
  estimated_time_saved: number;
  estimated_cost_impact: number;
  priority_score: number;
  source: string | null;
}

interface SettingsState {
  costPerHour: number;
  complexityWeights: Record<string, number>;
}

const COLORS = [
  "hsl(217, 91%, 60%)",
  "hsl(262, 83%, 58%)",
  "hsl(142, 76%, 36%)",
  "hsl(38, 92%, 50%)",
];

export default function ROIDashboard() {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<SettingsState>({
    costPerHour: 50,
    complexityWeights: { Low: 1, Medium: 2, High: 3 },
  });
  const [showSettings, setShowSettings] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [complexityFilter, setComplexityFilter] = useState<string>("all");

  useEffect(() => {
    fetchData();
  }, []);

  async function fetchData() {
    try {
      // Fetch settings
      const { data: settingsData } = await supabase
        .from("user_settings")
        .select("setting_key, setting_value");

      if (settingsData) {
        const costSetting = settingsData.find(
          (s) => s.setting_key === "cost_per_hour"
        );
        const weightsSetting = settingsData.find(
          (s) => s.setting_key === "complexity_weights"
        );

        setSettings({
          costPerHour: (costSetting?.setting_value as any)?.value || 50,
          complexityWeights:
            (weightsSetting?.setting_value as Record<string, number>) || {
              Low: 1,
              Medium: 2,
              High: 3,
            },
        });
      }

      // Fetch use cases
      const { data: useCasesData } = await supabase
        .from("automation_use_cases")
        .select(
          "id, name, description, type, complexity, monthly_volume, estimated_time_saved, estimated_cost_impact, priority_score, source"
        )
        .order("priority_score", { ascending: false });

      setUseCases((useCasesData as UseCase[]) || []);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  }

  // Filter use cases first
  const filteredUseCases = filterUseCases(useCases, {
    searchTerm,
    typeFilter,
    complexityFilter,
  });

  // Recalculate priority scores with current settings
  const recalculatedUseCases = filteredUseCases.map((uc) => {
    const hoursSaved = uc.estimated_time_saved / 60;
    const costImpact = hoursSaved * settings.costPerHour;
    const complexityWeight = settings.complexityWeights[uc.complexity] || 1;
    const priorityScore =
      (uc.monthly_volume * hoursSaved * settings.costPerHour) / complexityWeight;

    return {
      ...uc,
      adjusted_cost_impact: costImpact,
      adjusted_priority: priorityScore,
    };
  }).sort((a, b) => b.adjusted_priority - a.adjusted_priority);

  const saveSettings = async () => {
    try {
      await supabase
        .from("user_settings")
        .update({
          setting_value: { value: settings.costPerHour, currency: "USD" },
        })
        .eq("setting_key", "cost_per_hour");

      await supabase
        .from("user_settings")
        .update({ setting_value: settings.complexityWeights })
        .eq("setting_key", "complexity_weights");

      setShowSettings(false);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
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

  if (useCases.length === 0) {
    return (
      <AppLayout>
        <EmptyState
          icon={<Calculator className="h-6 w-6" />}
          title="No ROI data available"
          description="Upload process data and detect automation opportunities to see ROI analysis."
          action={
            <Button asChild>
              <Link to="/upload">Upload Data</Link>
            </Button>
          }
        />
      </AppLayout>
    );
  }

  const hasFilteredResults = recalculatedUseCases.length > 0;

  // Prepare chart data
  const totalSavings = recalculatedUseCases.reduce(
    (sum, uc) => sum + uc.adjusted_cost_impact,
    0
  );
  const totalHoursSaved = recalculatedUseCases.reduce(
    (sum, uc) => sum + uc.estimated_time_saved / 60,
    0
  );

  const byType = recalculatedUseCases.reduce((acc, uc) => {
    acc[uc.type] = (acc[uc.type] || 0) + uc.adjusted_cost_impact;
    return acc;
  }, {} as Record<string, number>);

  const typeChartData = Object.entries(byType).map(([name, value]) => ({
    name,
    value: Math.round(value),
  }));

  const byComplexity = recalculatedUseCases.reduce((acc, uc) => {
    acc[uc.complexity] = (acc[uc.complexity] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const complexityChartData = Object.entries(byComplexity).map(
    ([name, value]) => ({ name, value })
  );

  const top10 = recalculatedUseCases.slice(0, 10).map((uc) => ({
    name:
      uc.name.length > 25 ? uc.name.slice(0, 25) + "..." : uc.name,
    savings: Math.round(uc.adjusted_cost_impact),
  }));

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <UseCaseFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              typeFilter={typeFilter}
              onTypeChange={setTypeFilter}
              complexityFilter={complexityFilter}
              onComplexityChange={setComplexityFilter}
            />
          </CardContent>
        </Card>
        {/* Summary Cards */}
        {hasFilteredResults ? (
          <>
            <div className="grid gap-4 md:grid-cols-4">
              <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
                      <DollarSign className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold text-primary">
                        ${Math.round(totalSavings).toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Total Monthly Savings
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-chart-2/10">
                      <Clock className="h-6 w-6 text-chart-2" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">
                        {Math.round(totalHoursSaved).toLocaleString()}h
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Hours Saved/Month
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
                      <TrendingUp className="h-6 w-6 text-success" />
                    </div>
                    <div>
                      <p className="text-3xl font-bold">{recalculatedUseCases.length}</p>
                      <p className="text-sm text-muted-foreground">
                        Automation Opportunities
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="cursor-pointer hover:shadow-card-hover" onClick={() => setShowSettings(!showSettings)}>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                      <Settings className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">${settings.costPerHour}/hr</p>
                      <p className="text-sm text-muted-foreground">
                        Click to adjust assumptions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

        {/* Settings Panel */}
        {showSettings && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">ROI Assumptions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <Label>Cost per Hour ($)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Slider
                      value={[settings.costPerHour]}
                      onValueChange={([v]) =>
                        setSettings({ ...settings, costPerHour: v })
                      }
                      min={10}
                      max={200}
                      step={5}
                      className="flex-1"
                    />
                    <Input
                      type="number"
                      value={settings.costPerHour}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          costPerHour: parseInt(e.target.value) || 0,
                        })
                      }
                      className="w-20"
                    />
                  </div>
                </div>
                <div>
                  <Label>Complexity Weights (Higher = Harder)</Label>
                  <div className="grid grid-cols-3 gap-4 mt-2">
                    {(["Low", "Medium", "High"] as const).map((level) => (
                      <div key={level}>
                        <Label className="text-xs text-muted-foreground">
                          {level}
                        </Label>
                        <Input
                          type="number"
                          value={settings.complexityWeights[level]}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              complexityWeights: {
                                ...settings.complexityWeights,
                                [level]: parseFloat(e.target.value) || 1,
                              },
                            })
                          }
                          min={0.1}
                          step={0.5}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={saveSettings}>Save Settings</Button>
                <Button variant="outline" onClick={() => setShowSettings(false)}>
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts Row */}
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Savings by Use Case */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Top 10 by Monthly Savings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={top10} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    tick={{ fill: "hsl(var(--muted-foreground))" }}
                    tickFormatter={(v) => `$${v.toLocaleString()}`}
                  />
                  <YAxis
                    type="category"
                    dataKey="name"
                    width={150}
                    tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 11 }}
                  />
                  <Tooltip
                    formatter={(value: number) => [`$${value.toLocaleString()}`, "Savings"]}
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                  <Bar dataKey="savings" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Distribution Charts */}
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Savings by Type</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={150}>
                  <PieChart>
                    <Pie
                      data={typeChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={60}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {typeChartData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend
                      formatter={(value) => (
                        <span className="text-sm text-foreground">{value}</span>
                      )}
                    />
                    <Tooltip
                      formatter={(value: number) => `$${value.toLocaleString()}`}
                      contentStyle={{
                        backgroundColor: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: "8px",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">By Complexity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-around">
                  {complexityChartData.map((item) => (
                    <div key={item.name} className="text-center">
                      <p className="text-2xl font-semibold">{item.value}</p>
                      <ComplexityBadge complexity={item.name as Complexity} />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Priority Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Prioritized Implementation Roadmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Use Case</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Complexity</TableHead>
                    <TableHead className="text-right">Volume</TableHead>
                    <TableHead className="text-right">Hours/mo</TableHead>
                    <TableHead className="text-right">Savings/mo</TableHead>
                    <TableHead className="text-right">Priority</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recalculatedUseCases.slice(0, 15).map((uc, idx) => (
                    <TableRow key={uc.id}>
                      <TableCell className="font-medium text-muted-foreground">
                        {idx + 1}
                      </TableCell>
                      <TableCell>
                        <Link
                          to={`/use-cases/${uc.id}`}
                          className="font-medium hover:text-primary hover:underline"
                        >
                          {uc.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={uc.type} showIcon={false} />
                      </TableCell>
                      <TableCell>
                        <ComplexityBadge complexity={uc.complexity} />
                      </TableCell>
                      <TableCell className="text-right">
                        {uc.monthly_volume.toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right">
                        {(uc.estimated_time_saved / 60).toFixed(1)}
                      </TableCell>
                      <TableCell className="text-right font-medium text-success">
                        ${Math.round(uc.adjusted_cost_impact).toLocaleString()}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {Math.round(uc.adjusted_priority).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
          </>
        ) : (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No use cases match your filters
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
