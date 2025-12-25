import { cn } from "@/lib/utils";

interface ConfidenceIndicatorProps {
  score: number; // 0 to 1
  className?: string;
  showLabel?: boolean;
}

export function ConfidenceIndicator({
  score,
  className,
  showLabel = true,
}: ConfidenceIndicatorProps) {
  const percentage = Math.round(score * 100);
  const level = score >= 0.7 ? "high" : score >= 0.4 ? "medium" : "low";

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <div className="h-2 w-16 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full transition-all", {
            "bg-success": level === "high",
            "bg-warning": level === "medium",
            "bg-destructive": level === "low",
          })}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span
          className={cn("text-xs font-medium", {
            "text-success": level === "high",
            "text-warning": level === "medium",
            "text-destructive": level === "low",
          })}
        >
          {percentage}%
        </span>
      )}
    </div>
  );
}
