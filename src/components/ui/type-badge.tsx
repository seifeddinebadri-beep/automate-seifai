import { cn } from "@/lib/utils";
import { Bot, GitBranch, Settings, Brain } from "lucide-react";

interface TypeBadgeProps {
  type: "RPA" | "Workflow" | "Rule" | "AI Agent";
  className?: string;
  showIcon?: boolean;
}

const typeConfig = {
  RPA: {
    icon: Bot,
    className: "bg-rpa/10 text-rpa border-rpa/20",
  },
  Workflow: {
    icon: GitBranch,
    className: "bg-workflow/10 text-workflow border-workflow/20",
  },
  Rule: {
    icon: Settings,
    className: "bg-rule/10 text-rule border-rule/20",
  },
  "AI Agent": {
    icon: Brain,
    className: "bg-ai-agent/10 text-ai-agent border-ai-agent/20",
  },
};

export function TypeBadge({ type, className, showIcon = true }: TypeBadgeProps) {
  const config = typeConfig[type];
  const Icon = config.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.className,
        className
      )}
    >
      {showIcon && <Icon className="h-3 w-3" />}
      {type}
    </span>
  );
}
