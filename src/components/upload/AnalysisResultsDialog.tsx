import { Link } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  ArrowRight, 
  Bot, 
  Workflow, 
  Scale, 
  Cpu,
  FileText,
  TrendingUp
} from "lucide-react";

interface UseCase {
  id: string;
  name: string;
  type: string;
  complexity: string;
  confidence_score: number;
  estimated_time_saved: number;
}

interface AnalysisResultsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  useCases: UseCase[];
  sourceFileName: string;
  onViewAll: () => void;
}

const typeIcons: Record<string, React.ReactNode> = {
  RPA: <Bot className="h-4 w-4" />,
  Workflow: <Workflow className="h-4 w-4" />,
  Rule: <Scale className="h-4 w-4" />,
  "AI Agent": <Cpu className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  RPA: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
  Workflow: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  Rule: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300",
  "AI Agent": "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
};

const complexityColors: Record<string, string> = {
  Low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
  Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300",
  High: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
};

export function AnalysisResultsDialog({
  open,
  onOpenChange,
  useCases,
  sourceFileName,
  onViewAll,
}: AnalysisResultsDialogProps) {
  const totalTimeSaved = useCases.reduce((sum, uc) => sum + (uc.estimated_time_saved || 0), 0);
  const avgConfidence = useCases.length > 0 
    ? useCases.reduce((sum, uc) => sum + (uc.confidence_score || 0), 0) / useCases.length 
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Analysis Complete
          </DialogTitle>
          <DialogDescription className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Source: <span className="font-medium">{sourceFileName}</span>
          </DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-3 gap-4 py-4">
          <div className="rounded-lg bg-primary/10 p-3 text-center">
            <p className="text-2xl font-bold text-primary">{useCases.length}</p>
            <p className="text-xs text-muted-foreground">Use Cases Found</p>
          </div>
          <div className="rounded-lg bg-success/10 p-3 text-center">
            <p className="text-2xl font-bold text-success">
              {Math.round(totalTimeSaved / 60)}h
            </p>
            <p className="text-xs text-muted-foreground">Est. Time Saved/Mo</p>
          </div>
          <div className="rounded-lg bg-blue-500/10 p-3 text-center">
            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">
              {Math.round(avgConfidence * 100)}%
            </p>
            <p className="text-xs text-muted-foreground">Avg Confidence</p>
          </div>
        </div>

        {/* Use Cases List */}
        <ScrollArea className="max-h-[300px] pr-4">
          <div className="space-y-3">
            {useCases.map((useCase) => (
              <Link
                key={useCase.id}
                to={`/use-cases/${useCase.id}`}
                className="block rounded-lg border bg-card p-4 transition-colors hover:bg-accent group"
                onClick={() => onOpenChange(false)}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-foreground group-hover:text-primary transition-colors truncate">
                      {useCase.name}
                    </h4>
                    <div className="flex flex-wrap items-center gap-2 mt-2">
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${typeColors[useCase.type] || ""}`}
                      >
                        {typeIcons[useCase.type]}
                        <span className="ml-1">{useCase.type}</span>
                      </Badge>
                      <Badge 
                        variant="secondary" 
                        className={`text-xs ${complexityColors[useCase.complexity] || ""}`}
                      >
                        {useCase.complexity}
                      </Badge>
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-3 w-3" />
                        {useCase.estimated_time_saved} min/mo saved
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors flex-shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
          <Button onClick={onViewAll}>
            View All Use Cases
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
