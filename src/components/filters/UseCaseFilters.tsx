import { Search, Filter, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";

export type UseCaseType = "RPA" | "Workflow" | "Rule" | "AI Agent";
export type Complexity = "Low" | "Medium" | "High";

interface UseCaseFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  typeFilter: string;
  onTypeChange: (value: string) => void;
  complexityFilter: string;
  onComplexityChange: (value: string) => void;
  sourceFilter?: string;
  onSourceChange?: (value: string) => void;
  sources?: string[];
  showSourceFilter?: boolean;
  compact?: boolean;
}

export function UseCaseFilters({
  searchTerm,
  onSearchChange,
  typeFilter,
  onTypeChange,
  complexityFilter,
  onComplexityChange,
  sourceFilter,
  onSourceChange,
  sources = [],
  showSourceFilter = false,
  compact = false,
}: UseCaseFiltersProps) {
  const hasActiveFilters =
    searchTerm ||
    typeFilter !== "all" ||
    complexityFilter !== "all" ||
    (showSourceFilter && sourceFilter !== "all");

  const clearFilters = () => {
    onSearchChange("");
    onTypeChange("all");
    onComplexityChange("all");
    if (onSourceChange) onSourceChange("all");
  };

  const activeFilterCount = [
    searchTerm,
    typeFilter !== "all",
    complexityFilter !== "all",
    showSourceFilter && sourceFilter !== "all",
  ].filter(Boolean).length;

  return (
    <div className={`flex flex-wrap gap-3 ${compact ? "items-center" : ""}`}>
      <div className={`relative ${compact ? "flex-1 min-w-[180px]" : "flex-1 min-w-[200px]"}`}>
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search use cases..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>

      <Select value={typeFilter} onValueChange={onTypeChange}>
        <SelectTrigger className={compact ? "w-[130px]" : "w-[150px]"}>
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

      <Select value={complexityFilter} onValueChange={onComplexityChange}>
        <SelectTrigger className={compact ? "w-[130px]" : "w-[150px]"}>
          <SelectValue placeholder="Complexity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Complexity</SelectItem>
          <SelectItem value="Low">Low</SelectItem>
          <SelectItem value="Medium">Medium</SelectItem>
          <SelectItem value="High">High</SelectItem>
        </SelectContent>
      </Select>

      {showSourceFilter && sources.length > 0 && onSourceChange && (
        <Select value={sourceFilter || "all"} onValueChange={onSourceChange}>
          <SelectTrigger className={compact ? "w-[140px]" : "w-[160px]"}>
            <SelectValue placeholder="Source" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sources</SelectItem>
            {sources.map((source) => (
              <SelectItem key={source} value={source}>
                {source.length > 20 ? source.slice(0, 20) + "..." : source}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {hasActiveFilters && (
        <Button
          variant="ghost"
          size="sm"
          onClick={clearFilters}
          className="gap-1 text-muted-foreground hover:text-foreground"
        >
          <X className="h-4 w-4" />
          Clear
          {activeFilterCount > 0 && (
            <Badge variant="secondary" className="ml-1 h-5 px-1.5">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      )}
    </div>
  );
}

// Helper function to filter use cases
export function filterUseCases<
  T extends {
    name: string;
    description?: string | null;
    type: string;
    complexity: string;
    source?: string | null;
  }
>(
  useCases: T[],
  filters: {
    searchTerm: string;
    typeFilter: string;
    complexityFilter: string;
    sourceFilter?: string;
  }
): T[] {
  return useCases.filter((uc) => {
    const matchesSearch =
      !filters.searchTerm ||
      uc.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
      uc.description?.toLowerCase().includes(filters.searchTerm.toLowerCase());

    const matchesType =
      filters.typeFilter === "all" || uc.type === filters.typeFilter;

    const matchesComplexity =
      filters.complexityFilter === "all" ||
      uc.complexity === filters.complexityFilter;

    const matchesSource =
      !filters.sourceFilter ||
      filters.sourceFilter === "all" ||
      uc.source === filters.sourceFilter;

    return matchesSearch && matchesType && matchesComplexity && matchesSource;
  });
}

// Helper to extract unique sources
export function extractUniqueSources<T extends { source?: string | null }>(
  useCases: T[]
): string[] {
  const sources = useCases
    .map((uc) => uc.source)
    .filter((s): s is string => !!s);
  return [...new Set(sources)];
}
