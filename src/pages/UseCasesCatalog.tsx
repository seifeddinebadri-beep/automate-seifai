import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { EmptyState } from "@/components/ui/empty-state";
import { TypeBadge } from "@/components/ui/type-badge";
import { ComplexityBadge } from "@/components/ui/complexity-badge";
import { ConfidenceIndicator } from "@/components/ui/confidence-indicator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import {
  Lightbulb,
  Search,
  ArrowUpDown,
  Upload,
  ExternalLink,
  FileText,
} from "lucide-react";

type UseCaseType = "RPA" | "Workflow" | "Rule" | "AI Agent";
type Complexity = "Low" | "Medium" | "High";

interface UseCase {
  id: string;
  name: string;
  description: string | null;
  type: UseCaseType;
  affected_activities: string[];
  monthly_volume: number;
  estimated_time_saved: number;
  estimated_cost_impact: number;
  complexity: Complexity;
  confidence_score: number;
  priority_score: number;
  ai_classification: string | null;
  status: string;
  created_at: string;
  source: string | null;
}

type SortField = "priority_score" | "estimated_cost_impact" | "confidence_score" | "monthly_volume";

export default function UseCasesCatalog() {
  const [useCases, setUseCases] = useState<UseCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [complexityFilter, setComplexityFilter] = useState<string>("all");
  const [sortField, setSortField] = useState<SortField>("priority_score");
  const [sortAsc, setSortAsc] = useState(false);

  useEffect(() => {
    fetchUseCases();
  }, []);

  async function fetchUseCases() {
    try {
      const { data } = await supabase
        .from("automation_use_cases")
        .select("*")
        .order("priority_score", { ascending: false });

      setUseCases((data as UseCase[]) || []);
    } catch (error) {
      console.error("Error fetching use cases:", error);
    } finally {
      setLoading(false);
    }
  }

  const filteredUseCases = useCases
    .filter((uc) => {
      const matchesSearch =
        uc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        uc.description?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = typeFilter === "all" || uc.type === typeFilter;
      const matchesComplexity =
        complexityFilter === "all" || uc.complexity === complexityFilter;
      return matchesSearch && matchesType && matchesComplexity;
    })
    .sort((a, b) => {
      const aVal = a[sortField] || 0;
      const bVal = b[sortField] || 0;
      return sortAsc ? Number(aVal) - Number(bVal) : Number(bVal) - Number(aVal);
    });

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const formatTime = (minutes: number) => {
    if (minutes < 60) return `${minutes}m`;
    return `${(minutes / 60).toFixed(1)}h`;
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
          icon={<Lightbulb className="h-6 w-6" />}
          title="No automation opportunities detected"
          description="Upload process data and run analysis to discover automation use cases."
          action={
            <Button asChild>
              <Link to="/upload">Upload Data</Link>
            </Button>
          }
        />
      </AppLayout>
    );
  }

  // Stats summary
  const totalSavings = useCases.reduce(
    (sum, uc) => sum + Number(uc.estimated_cost_impact),
    0
  );
  const byType = useCases.reduce((acc, uc) => {
    acc[uc.type] = (acc[uc.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <AppLayout>
      <div className="space-y-6 animate-fade-in">
        {/* Summary Stats */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <p className="text-3xl font-semibold">{useCases.length}</p>
              <p className="text-sm text-muted-foreground">Total Use Cases</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-3xl font-semibold text-success">
                ${totalSavings.toLocaleString()}
              </p>
              <p className="text-sm text-muted-foreground">
                Potential Monthly Savings
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap gap-2">
                {Object.entries(byType).map(([type, count]) => (
                  <div key={type} className="flex items-center gap-1">
                    <TypeBadge type={type as UseCaseType} showIcon={false} />
                    <span className="text-sm font-medium">{count}</span>
                  </div>
                ))}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">By Type</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <p className="text-3xl font-semibold">
                {useCases.filter((uc) => uc.complexity === "Low").length}
              </p>
              <p className="text-sm text-muted-foreground">Quick Wins (Low Complexity)</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap gap-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search use cases..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="RPA">RPA</SelectItem>
                  <SelectItem value="Workflow">Workflow</SelectItem>
                  <SelectItem value="Rule">Rule</SelectItem>
                  <SelectItem value="AI Agent">AI Agent</SelectItem>
                </SelectContent>
              </Select>
              <Select value={complexityFilter} onValueChange={setComplexityFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Complexity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Complexity</SelectItem>
                  <SelectItem value="Low">Low</SelectItem>
                  <SelectItem value="Medium">Medium</SelectItem>
                  <SelectItem value="High">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Use Cases Table */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Automation Opportunities ({filteredUseCases.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Use Case</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Complexity</TableHead>
                    <TableHead>Confidence</TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => handleSort("monthly_volume")}
                      >
                        Volume/mo
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => handleSort("estimated_cost_impact")}
                      >
                        Savings/mo
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        className="flex items-center gap-1 hover:text-foreground"
                        onClick={() => handleSort("priority_score")}
                      >
                        Priority
                        <ArrowUpDown className="h-3 w-3" />
                      </button>
                    </TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredUseCases.map((uc) => (
                    <TableRow key={uc.id}>
                      <TableCell>
                        <div>
                          <Link
                            to={`/use-cases/${uc.id}`}
                            className="font-medium hover:text-primary hover:underline"
                          >
                            {uc.name}
                          </Link>
                          {uc.description && (
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {uc.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <TypeBadge type={uc.type} />
                      </TableCell>
                      <TableCell>
                        {uc.source ? (
                          <span className="flex items-center gap-1 text-sm text-muted-foreground">
                            <FileText className="h-3 w-3" />
                            <span className="max-w-[120px] truncate" title={uc.source}>
                              {uc.source}
                            </span>
                          </span>
                        ) : (
                          <span className="text-sm text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <ComplexityBadge complexity={uc.complexity} />
                      </TableCell>
                      <TableCell>
                        <ConfidenceIndicator score={uc.confidence_score} />
                      </TableCell>
                      <TableCell>{uc.monthly_volume.toLocaleString()}</TableCell>
                      <TableCell className="font-medium text-success">
                        ${Number(uc.estimated_cost_impact).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">
                          {Number(uc.priority_score).toFixed(0)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={`/use-cases/${uc.id}`}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {filteredUseCases.length === 0 && (
              <div className="py-12 text-center text-muted-foreground">
                No use cases match your filters
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
