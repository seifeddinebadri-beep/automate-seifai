import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { StatCard } from "@/components/ui/stat-card";
import { EmptyState } from "@/components/ui/empty-state";
import { TypeBadge } from "@/components/ui/type-badge";
import { ComplexityBadge } from "@/components/ui/complexity-badge";
import { ConfidenceIndicator } from "@/components/ui/confidence-indicator";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Database,
  Lightbulb,
  Clock,
  DollarSign,
  Upload,
  ArrowRight,
} from "lucide-react";

interface DashboardStats {
  totalCases: number;
  totalActivities: number;
  useCasesDetected: number;
  estimatedSavings: number;
}

interface TopUseCase {
  id: string;
  name: string;
  type: "RPA" | "Workflow" | "Rule" | "AI Agent";
  complexity: "Low" | "Medium" | "High";
  confidence_score: number;
  estimated_cost_impact: number;
  priority_score: number;
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalCases: 0,
    totalActivities: 0,
    useCasesDetected: 0,
    estimatedSavings: 0,
  });
  const [topUseCases, setTopUseCases] = useState<TopUseCase[]>([]);
  const [hasData, setHasData] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboardData() {
      try {
        // Check if we have any datasets
        const { data: datasets } = await supabase
          .from("datasets")
          .select("id")
          .limit(1);

        if (!datasets || datasets.length === 0) {
          setHasData(false);
          setLoading(false);
          return;
        }

        setHasData(true);

        // Fetch total unique cases
        const { data: cases } = await supabase
          .from("process_events")
          .select("case_id");

        const uniqueCases = new Set(cases?.map((c) => c.case_id) || []);

        // Fetch total unique activities
        const { data: activities } = await supabase
          .from("activity_metrics")
          .select("activity");

        // Fetch use cases count and estimated savings
        const { data: useCases } = await supabase
          .from("automation_use_cases")
          .select("id, estimated_cost_impact");

        const totalSavings =
          useCases?.reduce(
            (sum, uc) => sum + (Number(uc.estimated_cost_impact) || 0),
            0
          ) || 0;

        setStats({
          totalCases: uniqueCases.size,
          totalActivities: activities?.length || 0,
          useCasesDetected: useCases?.length || 0,
          estimatedSavings: totalSavings,
        });

        // Fetch top 5 use cases by priority
        const { data: topCases } = await supabase
          .from("automation_use_cases")
          .select(
            "id, name, type, complexity, confidence_score, estimated_cost_impact, priority_score"
          )
          .order("priority_score", { ascending: false })
          .limit(5);

        setTopUseCases((topCases as TopUseCase[]) || []);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <AppLayout>
        <div className="flex h-full items-center justify-center">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      </AppLayout>
    );
  }

  if (!hasData) {
    return (
      <AppLayout>
        <EmptyState
          icon={<Upload className="h-6 w-6" />}
          title="No data uploaded yet"
          description="Upload your process data to start discovering automation opportunities and calculating ROI."
          action={
            <Button asChild>
              <Link to="/upload">
                Upload Data <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          }
        />
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Total Cases Analyzed"
            value={stats.totalCases.toLocaleString()}
            icon={<Database className="h-5 w-5" />}
          />
          <StatCard
            title="Unique Activities"
            value={stats.totalActivities}
            icon={<Clock className="h-5 w-5" />}
          />
          <StatCard
            title="Use Cases Detected"
            value={stats.useCasesDetected}
            icon={<Lightbulb className="h-5 w-5" />}
          />
          <StatCard
            title="Estimated Monthly Savings"
            value={`$${stats.estimatedSavings.toLocaleString()}`}
            icon={<DollarSign className="h-5 w-5" />}
          />
        </div>

        {/* Top Automation Opportunities */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">
              Top Automation Opportunities
            </CardTitle>
            <Button variant="outline" size="sm" asChild>
              <Link to="/use-cases">View All</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {topUseCases.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Use Case</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Complexity</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead className="text-right">Est. Savings/mo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topUseCases.map((useCase) => (
                    <TableRow key={useCase.id}>
                      <TableCell className="font-medium">
                        <Link
                          to={`/use-cases/${useCase.id}`}
                          className="hover:text-primary hover:underline"
                        >
                          {useCase.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={useCase.type} />
                      </TableCell>
                      <TableCell>
                        <ComplexityBadge complexity={useCase.complexity} />
                      </TableCell>
                      <TableCell>
                        <ConfidenceIndicator score={useCase.confidence_score} />
                      </TableCell>
                      <TableCell className="text-right font-medium">
                        ${Number(useCase.estimated_cost_impact).toLocaleString()}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="py-8 text-center text-muted-foreground">
                <Lightbulb className="mx-auto mb-2 h-8 w-8" />
                <p>No automation opportunities detected yet.</p>
                <p className="text-sm">
                  Run the analysis on your uploaded data to discover
                  opportunities.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-4 md:grid-cols-3">
          <Link
            to="/upload"
            className="rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-card-hover"
          >
            <Upload className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-semibold text-card-foreground">Upload More Data</h3>
            <p className="text-sm text-muted-foreground">
              Import additional process data for analysis
            </p>
          </Link>
          <Link
            to="/process"
            className="rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-card-hover"
          >
            <Clock className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-semibold text-card-foreground">View Process Metrics</h3>
            <p className="text-sm text-muted-foreground">
              Analyze activity patterns and bottlenecks
            </p>
          </Link>
          <Link
            to="/roi"
            className="rounded-lg border border-border bg-card p-6 transition-all hover:border-primary hover:shadow-card-hover"
          >
            <DollarSign className="mb-3 h-8 w-8 text-primary" />
            <h3 className="font-semibold text-card-foreground">ROI Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Prioritize automation investments
            </p>
          </Link>
        </div>
      </div>
    </AppLayout>
  );
}
