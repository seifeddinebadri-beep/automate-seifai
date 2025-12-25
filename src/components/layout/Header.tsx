import { useLocation } from "react-router-dom";

const pageTitles: Record<string, { title: string; description: string }> = {
  "/": {
    title: "Dashboard",
    description: "Overview of your automation discovery progress",
  },
  "/upload": {
    title: "Upload Data",
    description: "Import your process data for analysis",
  },
  "/process": {
    title: "Process Overview",
    description: "Analyze activity patterns and bottlenecks",
  },
  "/use-cases": {
    title: "Automation Use Cases",
    description: "Detected opportunities for automation",
  },
  "/roi": {
    title: "ROI & Prioritization",
    description: "Quantify and prioritize automation investments",
  },
};

export function Header() {
  const location = useLocation();
  const currentPage = pageTitles[location.pathname] || pageTitles["/"];

  return (
    <header className="flex h-16 shrink-0 items-center border-b border-border bg-card px-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          {currentPage.title}
        </h2>
        <p className="text-sm text-muted-foreground">
          {currentPage.description}
        </p>
      </div>
    </header>
  );
}
