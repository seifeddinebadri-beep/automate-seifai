import { cn } from "@/lib/utils";

interface ComplexityBadgeProps {
  complexity: "Low" | "Medium" | "High";
  className?: string;
}

export function ComplexityBadge({ complexity, className }: ComplexityBadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        {
          "bg-success/10 text-success": complexity === "Low",
          "bg-warning/10 text-warning": complexity === "Medium",
          "bg-destructive/10 text-destructive": complexity === "High",
        },
        className
      )}
    >
      {complexity}
    </span>
  );
}
