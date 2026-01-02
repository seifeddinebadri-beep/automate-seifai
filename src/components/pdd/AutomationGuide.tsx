import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  BookOpen,
  Download,
  CheckCircle2,
  Circle,
  ArrowRight,
  Cpu,
  Code,
  Database,
  Cloud,
  Bot,
  Workflow,
  Shield,
  Zap,
  Settings,
  TestTube,
  Rocket,
  Monitor,
} from "lucide-react";

type UseCaseType = "RPA" | "Workflow" | "Rule" | "AI Agent";
type Complexity = "Low" | "Medium" | "High";

interface UseCase {
  id: string;
  name: string;
  description: string | null;
  type: UseCaseType;
  affected_activities: string[];
  pattern_type: string;
  monthly_volume: number;
  estimated_time_saved: number;
  estimated_cost_impact: number;
  complexity: Complexity;
  confidence_score: number;
  priority_score: number;
  ai_classification: string | null;
  ai_explanation: string | null;
  suggested_approach: string | null;
  status: string;
  created_at: string;
}

interface TechStack {
  category: string;
  primary: string;
  alternatives: string[];
  reason: string;
}

interface Step {
  id: number;
  title: string;
  description: string;
  tasks: string[];
  estimatedDays: string;
  icon: React.ReactNode;
}

interface AutomationGuideProps {
  useCase: UseCase;
}

const getTechStackByType = (type: UseCaseType, complexity: Complexity): TechStack[] => {
  const stacks: Record<UseCaseType, TechStack[]> = {
    RPA: [
      {
        category: "RPA Platform",
        primary: "UiPath",
        alternatives: ["Automation Anywhere", "Blue Prism", "Power Automate Desktop"],
        reason: "Market leader with extensive activity library and strong community support",
      },
      {
        category: "Orchestrator",
        primary: "UiPath Orchestrator",
        alternatives: ["Control Room (AA)", "Camunda for hybrid"],
        reason: "Centralized bot management, scheduling, and monitoring",
      },
      {
        category: "Development IDE",
        primary: "UiPath Studio",
        alternatives: ["Bot Creator", "Process Studio"],
        reason: "Low-code development with recording capabilities",
      },
      {
        category: "Version Control",
        primary: "Git + Azure DevOps",
        alternatives: ["GitHub", "GitLab", "Bitbucket"],
        reason: "Track changes and enable collaborative development",
      },
      {
        category: "Monitoring",
        primary: "UiPath Insights",
        alternatives: ["Elasticsearch + Kibana", "Splunk", "Datadog"],
        reason: "Built-in analytics for bot performance and exceptions",
      },
    ],
    Workflow: [
      {
        category: "Workflow Engine",
        primary: "Camunda Platform 8",
        alternatives: ["n8n", "Temporal", "Apache Airflow", "Prefect"],
        reason: "BPMN-compliant, scalable, with strong developer tooling",
      },
      {
        category: "API Gateway",
        primary: "Kong",
        alternatives: ["AWS API Gateway", "Apigee", "Tyk"],
        reason: "Secure API management with rate limiting and authentication",
      },
      {
        category: "Message Queue",
        primary: "Apache Kafka",
        alternatives: ["RabbitMQ", "AWS SQS", "Redis Streams"],
        reason: "High-throughput event streaming for async workflows",
      },
      {
        category: "Backend Runtime",
        primary: "Node.js + TypeScript",
        alternatives: ["Python + FastAPI", "Go", "Java + Spring Boot"],
        reason: "Fast development with strong async support",
      },
      {
        category: "Database",
        primary: "PostgreSQL",
        alternatives: ["MySQL", "MongoDB", "Supabase"],
        reason: "Reliable, feature-rich, with excellent JSON support",
      },
      {
        category: "Monitoring",
        primary: "Grafana + Prometheus",
        alternatives: ["Datadog", "New Relic", "AWS CloudWatch"],
        reason: "Real-time metrics and alerting for workflow health",
      },
    ],
    Rule: [
      {
        category: "Rule Engine",
        primary: "Drools",
        alternatives: ["Easy Rules", "json-rules-engine", "NRules"],
        reason: "Mature, feature-rich business rule management system",
      },
      {
        category: "Decision Tables",
        primary: "DMN (Camunda)",
        alternatives: ["Excel-based rules", "OpenRules", "DecisionCAMP"],
        reason: "Visual decision tables for business users",
      },
      {
        category: "Backend",
        primary: "Java + Spring Boot",
        alternatives: ["Node.js", "Python", ".NET Core"],
        reason: "Native Drools integration with strong enterprise support",
      },
      {
        category: "API Layer",
        primary: "REST API + OpenAPI",
        alternatives: ["GraphQL", "gRPC"],
        reason: "Standard interface for rule execution",
      },
      {
        category: "Database",
        primary: "PostgreSQL",
        alternatives: ["MySQL", "Oracle", "SQL Server"],
        reason: "Store rule metadata and execution history",
      },
      {
        category: "Version Control",
        primary: "Git + Rule Versioning",
        alternatives: ["Custom rule repository"],
        reason: "Track rule changes with approval workflows",
      },
    ],
    "AI Agent": [
      {
        category: "LLM Provider",
        primary: "OpenAI GPT-4",
        alternatives: ["Anthropic Claude", "Google Gemini", "Azure OpenAI"],
        reason: "Most capable for complex reasoning and tool use",
      },
      {
        category: "Agent Framework",
        primary: "LangChain",
        alternatives: ["AutoGPT", "CrewAI", "Microsoft Semantic Kernel"],
        reason: "Flexible agent orchestration with tool integration",
      },
      {
        category: "Vector Database",
        primary: "Pinecone",
        alternatives: ["Weaviate", "Qdrant", "Chroma", "pgvector"],
        reason: "Fast similarity search for RAG implementations",
      },
      {
        category: "Backend",
        primary: "Python + FastAPI",
        alternatives: ["Node.js", "LangServe"],
        reason: "Best ML/AI library ecosystem",
      },
      {
        category: "Orchestration",
        primary: "LangGraph",
        alternatives: ["Temporal", "Prefect", "Custom state machine"],
        reason: "Stateful agent workflows with human-in-the-loop",
      },
      {
        category: "Monitoring",
        primary: "LangSmith",
        alternatives: ["Weights & Biases", "MLflow", "Custom logging"],
        reason: "LLM-specific tracing and evaluation",
      },
    ],
  };

  return stacks[type] || stacks.Workflow;
};

const getStepsByType = (type: UseCaseType, useCase: UseCase): Step[] => {
  const baseSteps: Step[] = [
    {
      id: 1,
      title: "Discovery & Analysis",
      description: "Deep-dive into current process and document requirements",
      tasks: [
        "Map current AS-IS process flow",
        "Identify all input/output data sources",
        "Document business rules and exceptions",
        "Interview process SMEs",
        "Define success criteria and KPIs",
      ],
      estimatedDays: "3-5 days",
      icon: <BookOpen className="h-5 w-5" />,
    },
    {
      id: 2,
      title: "Solution Design",
      description: "Design TO-BE architecture and integration points",
      tasks: [
        "Create solution architecture diagram",
        "Design data flow and transformations",
        "Define error handling strategy",
        "Plan rollback procedures",
        "Document security requirements",
      ],
      estimatedDays: "3-5 days",
      icon: <Settings className="h-5 w-5" />,
    },
  ];

  const typeSpecificSteps: Record<UseCaseType, Step[]> = {
    RPA: [
      {
        id: 3,
        title: "Bot Development",
        description: "Build and configure RPA workflows",
        tasks: [
          "Set up development environment (UiPath Studio)",
          "Create reusable components/libraries",
          "Build main workflow with error handling",
          "Implement credential management",
          "Add logging and screenshots for debugging",
        ],
        estimatedDays: "5-10 days",
        icon: <Cpu className="h-5 w-5" />,
      },
      {
        id: 4,
        title: "Bot Testing",
        description: "Validate automation in test environment",
        tasks: [
          "Unit test individual components",
          "Integration testing with test data",
          "Exception scenario testing",
          "Performance testing under load",
          "UAT with business users",
        ],
        estimatedDays: "3-5 days",
        icon: <TestTube className="h-5 w-5" />,
      },
      {
        id: 5,
        title: "Deployment & Orchestration",
        description: "Deploy bot to production with scheduling",
        tasks: [
          "Configure Orchestrator environment",
          "Set up bot scheduling and triggers",
          "Configure queue management",
          "Set up alerts and notifications",
          "Deploy to production robots",
        ],
        estimatedDays: "2-3 days",
        icon: <Rocket className="h-5 w-5" />,
      },
    ],
    Workflow: [
      {
        id: 3,
        title: "API Development",
        description: "Build integration APIs and workflow logic",
        tasks: [
          "Design and document API contracts (OpenAPI)",
          "Implement integration connectors",
          "Build workflow process model (BPMN)",
          "Implement service tasks and handlers",
          "Set up message queues for async processing",
        ],
        estimatedDays: "7-14 days",
        icon: <Code className="h-5 w-5" />,
      },
      {
        id: 4,
        title: "Integration Testing",
        description: "End-to-end workflow validation",
        tasks: [
          "API contract testing",
          "Workflow path testing (happy + error)",
          "Integration testing with external systems",
          "Load and stress testing",
          "Security penetration testing",
        ],
        estimatedDays: "5-7 days",
        icon: <TestTube className="h-5 w-5" />,
      },
      {
        id: 5,
        title: "Cloud Deployment",
        description: "Deploy to production environment",
        tasks: [
          "Set up CI/CD pipeline",
          "Configure cloud infrastructure (K8s/containers)",
          "Implement blue-green deployment",
          "Set up monitoring and alerting",
          "Configure auto-scaling policies",
        ],
        estimatedDays: "3-5 days",
        icon: <Cloud className="h-5 w-5" />,
      },
    ],
    Rule: [
      {
        id: 3,
        title: "Rule Implementation",
        description: "Build and configure business rules",
        tasks: [
          "Set up rule engine environment",
          "Create decision tables in DMN",
          "Implement complex rule logic",
          "Build rule testing harness",
          "Create rule versioning workflow",
        ],
        estimatedDays: "5-8 days",
        icon: <Database className="h-5 w-5" />,
      },
      {
        id: 4,
        title: "Rule Testing & Validation",
        description: "Validate rules against business scenarios",
        tasks: [
          "Create comprehensive test cases",
          "Test rule combinations and edge cases",
          "Business validation with stakeholders",
          "Performance testing",
          "Document rule behavior",
        ],
        estimatedDays: "3-5 days",
        icon: <TestTube className="h-5 w-5" />,
      },
      {
        id: 5,
        title: "Deployment & Governance",
        description: "Deploy with rule management processes",
        tasks: [
          "Set up rule deployment pipeline",
          "Configure rule versioning",
          "Implement approval workflow for changes",
          "Set up audit logging",
          "Train business users on rule management",
        ],
        estimatedDays: "2-4 days",
        icon: <Shield className="h-5 w-5" />,
      },
    ],
    "AI Agent": [
      {
        id: 3,
        title: "Agent Development",
        description: "Build AI agent with tools and knowledge",
        tasks: [
          "Design agent architecture and tools",
          "Build knowledge base / RAG pipeline",
          "Implement agent logic with LangChain",
          "Create tool integrations",
          "Implement guardrails and safety checks",
        ],
        estimatedDays: "10-15 days",
        icon: <Bot className="h-5 w-5" />,
      },
      {
        id: 4,
        title: "Evaluation & Fine-tuning",
        description: "Test and improve agent performance",
        tasks: [
          "Create evaluation dataset",
          "Test agent reasoning and tool use",
          "Iterate on prompts and chains",
          "Human evaluation for quality",
          "A/B testing different approaches",
        ],
        estimatedDays: "5-10 days",
        icon: <Zap className="h-5 w-5" />,
      },
      {
        id: 5,
        title: "Production Deployment",
        description: "Deploy with monitoring and human oversight",
        tasks: [
          "Set up LLM observability (LangSmith)",
          "Implement rate limiting and caching",
          "Configure human-in-the-loop workflows",
          "Set up cost monitoring",
          "Deploy with fallback strategies",
        ],
        estimatedDays: "3-5 days",
        icon: <Cloud className="h-5 w-5" />,
      },
    ],
  };

  const postDeployment: Step = {
    id: 6,
    title: "Monitoring & Optimization",
    description: "Continuous improvement and support",
    tasks: [
      "Monitor KPIs and SLAs",
      "Analyze exception patterns",
      "Gather user feedback",
      "Implement improvements",
      "Document lessons learned",
    ],
    estimatedDays: "Ongoing",
    icon: <Monitor className="h-5 w-5" />,
  };

  return [...baseSteps, ...typeSpecificSteps[type], postDeployment];
};

export function AutomationGuide({ useCase }: AutomationGuideProps) {
  const [open, setOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const techStack = getTechStackByType(useCase.type, useCase.complexity);
  const steps = getStepsByType(useCase.type, useCase);

  const exportGuide = () => {
    const content = `
================================================================================
                    AUTOMATION IMPLEMENTATION GUIDE
                        Step-by-Step Playbook
================================================================================

USE CASE: ${useCase.name}
TYPE: ${useCase.type}
COMPLEXITY: ${useCase.complexity}
Generated: ${new Date().toLocaleDateString()}

================================================================================

RECOMMENDED TECHNOLOGY STACK
-----------------------------
${techStack
  .map(
    (tech) => `
${tech.category.toUpperCase()}
  Primary: ${tech.primary}
  Alternatives: ${tech.alternatives.join(", ")}
  Why: ${tech.reason}
`
  )
  .join("")}

================================================================================

IMPLEMENTATION STEPS
--------------------
${steps
  .map(
    (step) => `
STEP ${step.id}: ${step.title.toUpperCase()}
Timeline: ${step.estimatedDays}

${step.description}

Tasks:
${step.tasks.map((t) => `  □ ${t}`).join("\n")}
`
  )
  .join("\n" + "-".repeat(40) + "\n")}

================================================================================

ESTIMATED TOTAL TIMELINE
------------------------
${useCase.complexity === "Low" ? "4-6 weeks" : useCase.complexity === "Medium" ? "6-10 weeks" : "10-16 weeks"}

================================================================================

KEY SUCCESS FACTORS
-------------------
• Strong executive sponsorship
• Dedicated project team
• Clear success metrics
• Iterative development approach
• Continuous stakeholder communication
• Robust testing strategy
• Post-go-live support plan

================================================================================
                    Generated by AutoFlow Discovery
================================================================================
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Automation_Guide_${useCase.name.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Implementation guide exported");
  };

  const getComplexityTimeline = () => {
    switch (useCase.complexity) {
      case "Low":
        return "4-6 weeks";
      case "Medium":
        return "6-10 weeks";
      case "High":
        return "10-16 weeks";
      default:
        return "6-10 weeks";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Workflow className="mr-2 h-4 w-4" />
          Implementation Guide
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-5xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Workflow className="h-5 w-5" />
            Automation Implementation Guide
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[75vh] pr-4">
          <div className="space-y-6 py-4">
            {/* Overview */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Automation Type</p>
                    <Badge className="mt-1">{useCase.type}</Badge>
                  </div>
                  <Separator orientation="vertical" className="h-10 hidden md:block" />
                  <div>
                    <p className="text-sm text-muted-foreground">Complexity</p>
                    <Badge variant="outline" className="mt-1">{useCase.complexity}</Badge>
                  </div>
                  <Separator orientation="vertical" className="h-10 hidden md:block" />
                  <div>
                    <p className="text-sm text-muted-foreground">Est. Timeline</p>
                    <p className="font-semibold text-primary">{getComplexityTimeline()}</p>
                  </div>
                  <Button size="sm" onClick={exportGuide}>
                    <Download className="mr-2 h-4 w-4" />
                    Export Guide
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Technology Stack */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <Cpu className="h-5 w-5 text-primary" />
                Recommended Technology Stack
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {techStack.map((tech, idx) => (
                  <Card key={idx}>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        {tech.category}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge variant="default">{tech.primary}</Badge>
                        <span className="text-xs text-muted-foreground">Recommended</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tech.alternatives.map((alt, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {alt}
                          </Badge>
                        ))}
                      </div>
                      <p className="text-xs text-muted-foreground mt-2">{tech.reason}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            {/* Step-by-Step Guide */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <ArrowRight className="h-5 w-5 text-primary" />
                Step-by-Step Implementation
              </h3>

              {/* Step Navigator */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2">
                {steps.map((step) => (
                  <Button
                    key={step.id}
                    variant={currentStep === step.id ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentStep(step.id)}
                    className="shrink-0"
                  >
                    {step.id}
                  </Button>
                ))}
              </div>

              {/* Steps Timeline */}
              <div className="space-y-4">
                {steps.map((step) => (
                  <Card
                    key={step.id}
                    className={`transition-all ${
                      currentStep === step.id
                        ? "ring-2 ring-primary"
                        : "opacity-70 hover:opacity-100"
                    }`}
                    onClick={() => setCurrentStep(step.id)}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-3 text-base">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full ${
                            currentStep === step.id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted"
                          }`}
                        >
                          {step.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span>
                              Step {step.id}: {step.title}
                            </span>
                            <Badge variant="outline" className="ml-2">
                              {step.estimatedDays}
                            </Badge>
                          </div>
                          <p className="text-sm font-normal text-muted-foreground mt-1">
                            {step.description}
                          </p>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    {currentStep === step.id && (
                      <CardContent>
                        <div className="space-y-2 pl-11">
                          {step.tasks.map((task, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <Circle className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                              <span className="text-sm">{task}</span>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    )}
                  </Card>
                ))}
              </div>
            </section>

            <Separator />

            {/* Key Success Factors */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2 text-lg">
                <CheckCircle2 className="h-5 w-5 text-success" />
                Key Success Factors
              </h3>
              <div className="grid gap-3 md:grid-cols-2">
                {[
                  "Strong executive sponsorship",
                  "Dedicated project team",
                  "Clear success metrics",
                  "Iterative development approach",
                  "Continuous stakeholder communication",
                  "Robust testing strategy",
                  "Change management plan",
                  "Post-go-live support plan",
                ].map((factor, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
                  >
                    <CheckCircle2 className="h-4 w-4 text-success shrink-0" />
                    <span className="text-sm">{factor}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
