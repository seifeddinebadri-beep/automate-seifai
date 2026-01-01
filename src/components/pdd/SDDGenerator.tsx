import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Code,
  Download,
  FileJson,
  Server,
  Database,
  Shield,
  Workflow,
  TestTube,
  Settings,
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

interface SDDData {
  // 1. Solution Overview
  solutionName: string;
  version: string;
  author: string;
  status: string;
  solutionDescription: string;
  automationType: string;
  // 2. Technical Architecture
  architecture: string;
  components: string[];
  technologyStack: string[];
  // 3. System Requirements
  infrastructure: string;
  dependencies: string[];
  prerequisites: string[];
  // 4. Integration Design
  sourceSystem: string;
  targetSystem: string;
  apiEndpoints: string;
  dataMapping: string;
  authMethod: string;
  // 5. Data Model
  inputSchema: string;
  outputSchema: string;
  dataTransformations: string;
  // 6. Error Handling
  retryStrategy: string;
  maxRetries: number;
  fallbackAction: string;
  exceptionHandling: string;
  // 7. Security
  accessControl: string;
  dataProtection: string;
  auditLogging: boolean;
  encryption: boolean;
  // 8. Deployment
  environment: string;
  deploymentSteps: string[];
  rollbackPlan: string;
  // 9. Testing Strategy
  unitTests: boolean;
  integrationTests: boolean;
  uatCriteria: string;
  testCases: string;
  // 10. Maintenance
  monitoringMetrics: string[];
  loggingLevel: string;
  supportContacts: string;
  maintenanceSchedule: string;
}

interface SDDGeneratorProps {
  useCase: UseCase;
}

export function SDDGenerator({ useCase }: SDDGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [sddData, setSddData] = useState<SDDData>(() => initializeSDD(useCase));

  function initializeSDD(uc: UseCase): SDDData {
    const techStack = getTechStack(uc.type);
    const components = getComponents(uc.type);

    return {
      solutionName: `${uc.name} Automation`,
      version: "1.0.0",
      author: "",
      status: "Draft",
      solutionDescription:
        uc.description ||
        `Automated solution for ${uc.affected_activities.join(", ")}`,
      automationType: uc.type,
      architecture: getArchitecture(uc.type),
      components: components,
      technologyStack: techStack,
      infrastructure:
        uc.type === "AI Agent"
          ? "Cloud-based with GPU support"
          : "Standard cloud infrastructure",
      dependencies: getDependencies(uc.type),
      prerequisites: [
        "API access to source systems",
        "Service account credentials",
        uc.complexity !== "Low" ? "Exception handling workflow defined" : "",
      ].filter(Boolean),
      sourceSystem: "Source System (to be specified)",
      targetSystem: "Target System (to be specified)",
      apiEndpoints: "/api/v1/automation/" + uc.name.toLowerCase().replace(/\s+/g, "-"),
      dataMapping: `Input fields → Processing → Output fields`,
      authMethod: "OAuth 2.0 / API Key",
      inputSchema: generateInputSchema(uc),
      outputSchema: generateOutputSchema(uc),
      dataTransformations: "Field mapping and validation rules",
      retryStrategy:
        uc.complexity === "Low"
          ? "Exponential backoff"
          : "Linear with manual escalation",
      maxRetries: uc.complexity === "Low" ? 5 : 3,
      fallbackAction:
        uc.complexity === "Low"
          ? "Log and continue"
          : "Create incident and notify operator",
      exceptionHandling:
        uc.type === "AI Agent"
          ? "AI-assisted exception routing with human review"
          : "Rule-based exception handling with escalation matrix",
      accessControl: "Role-based access control (RBAC)",
      dataProtection: "Data encryption in transit and at rest",
      auditLogging: true,
      encryption: true,
      environment: "Development → Staging → Production",
      deploymentSteps: getDeploymentSteps(uc.type),
      rollbackPlan: "Automated rollback on failure with state preservation",
      unitTests: true,
      integrationTests: true,
      uatCriteria: `Process ${uc.monthly_volume} transactions with >99% success rate`,
      testCases: generateTestCases(uc),
      monitoringMetrics: [
        "Execution success rate",
        "Average processing time",
        "Error rate by type",
        "Queue depth",
      ],
      loggingLevel: "INFO",
      supportContacts: "automation-support@company.com",
      maintenanceSchedule: "Weekly health checks, monthly reviews",
    };
  }

  function getTechStack(type: UseCaseType): string[] {
    switch (type) {
      case "RPA":
        return ["UiPath / Automation Anywhere", "Orchestrator", "Queue Manager", "Credential Vault"];
      case "Workflow":
        return ["Workflow Engine (Camunda/Temporal)", "API Gateway", "Message Queue", "Database"];
      case "Rule":
        return ["Rules Engine (Drools/DMN)", "API Service", "Decision Tables", "Version Control"];
      case "AI Agent":
        return ["LLM Framework", "Vector Database", "Agent Orchestrator", "Prompt Management"];
      default:
        return [];
    }
  }

  function getComponents(type: UseCaseType): string[] {
    switch (type) {
      case "RPA":
        return ["Bot Runner", "Attended/Unattended Bot", "Exception Handler", "Dashboard"];
      case "Workflow":
        return ["Workflow Engine", "Task Service", "Notification Service", "Admin Console"];
      case "Rule":
        return ["Rule Engine", "Decision Service", "Rule Repository", "Testing Framework"];
      case "AI Agent":
        return ["AI Model Service", "Memory Store", "Tool Executor", "Guardrails"];
      default:
        return [];
    }
  }

  function getArchitecture(type: UseCaseType): string {
    switch (type) {
      case "RPA":
        return "Client-Orchestrator architecture with centralized bot management";
      case "Workflow":
        return "Event-driven microservices with workflow orchestration";
      case "Rule":
        return "Stateless decision service with centralized rule management";
      case "AI Agent":
        return "Agent-based architecture with tool integration and memory persistence";
      default:
        return "Standard automation architecture";
    }
  }

  function getDependencies(type: UseCaseType): string[] {
    const base = ["Authentication service", "Logging infrastructure", "Monitoring stack"];
    switch (type) {
      case "RPA":
        return [...base, "RPA platform license", "Desktop infrastructure"];
      case "Workflow":
        return [...base, "Message broker", "State database"];
      case "Rule":
        return [...base, "Rule engine license", "Decision tables"];
      case "AI Agent":
        return [...base, "LLM API access", "Vector database", "GPU resources"];
      default:
        return base;
    }
  }

  function generateInputSchema(uc: UseCase): string {
    return `{
  "transactionId": "string",
  "timestamp": "ISO-8601",
  "payload": {
    // Activity-specific fields for: ${uc.affected_activities.slice(0, 2).join(", ")}
  },
  "metadata": { "source": "string", "priority": "number" }
}`;
  }

  function generateOutputSchema(uc: UseCase): string {
    return `{
  "transactionId": "string",
  "status": "SUCCESS | FAILED | PENDING",
  "result": { /* processed data */ },
  "processingTime": "number (ms)",
  "errors": []
}`;
  }

  function getDeploymentSteps(type: UseCaseType): string[] {
    const base = [
      "1. Code review and approval",
      "2. Deploy to staging environment",
      "3. Run integration tests",
      "4. UAT sign-off",
      "5. Production deployment",
      "6. Post-deployment verification",
    ];
    if (type === "RPA") {
      return ["0. Bot package creation", ...base, "7. Bot assignment to machine"];
    }
    return base;
  }

  function generateTestCases(uc: UseCase): string {
    return `• Happy path: Standard transaction processing
• Edge case: Maximum payload size
• Error case: Invalid input data
• Integration: End-to-end flow verification
• Performance: ${uc.monthly_volume} transactions/month load`;
  }

  const exportSDDAsJSON = () => {
    const sdd = {
      generatedAt: new Date().toISOString(),
      useCaseId: useCase.id,
      ...sddData,
    };
    const blob = new Blob([JSON.stringify(sdd, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SDD_${useCase.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SDD exported as JSON");
  };

  const exportSDDAsText = () => {
    const content = `
================================================================================
                    SOLUTION DESIGN DOCUMENT (SDD)
                         Automation Solution
================================================================================

1. SOLUTION OVERVIEW
--------------------
Solution Name:      ${sddData.solutionName}
Version:            ${sddData.version}
Author:             ${sddData.author || "Not assigned"}
Status:             ${sddData.status}
Generated:          ${new Date().toLocaleDateString()}

Description:
${sddData.solutionDescription}

Automation Type:    ${sddData.automationType}

================================================================================

2. TECHNICAL ARCHITECTURE
-------------------------
Architecture Pattern:
${sddData.architecture}

Components:
${sddData.components.map((c) => `  • ${c}`).join("\n")}

Technology Stack:
${sddData.technologyStack.map((t) => `  • ${t}`).join("\n")}

================================================================================

3. SYSTEM REQUIREMENTS
----------------------
Infrastructure:     ${sddData.infrastructure}

Dependencies:
${sddData.dependencies.map((d) => `  • ${d}`).join("\n")}

Prerequisites:
${sddData.prerequisites.map((p) => `  • ${p}`).join("\n")}

================================================================================

4. INTEGRATION DESIGN
---------------------
Source System:      ${sddData.sourceSystem}
Target System:      ${sddData.targetSystem}
API Endpoints:      ${sddData.apiEndpoints}
Auth Method:        ${sddData.authMethod}

Data Mapping:
${sddData.dataMapping}

================================================================================

5. DATA MODEL
-------------
INPUT SCHEMA:
${sddData.inputSchema}

OUTPUT SCHEMA:
${sddData.outputSchema}

Data Transformations:
${sddData.dataTransformations}

================================================================================

6. ERROR HANDLING
-----------------
Retry Strategy:     ${sddData.retryStrategy}
Max Retries:        ${sddData.maxRetries}
Fallback Action:    ${sddData.fallbackAction}

Exception Handling:
${sddData.exceptionHandling}

================================================================================

7. SECURITY CONSIDERATIONS
--------------------------
Access Control:     ${sddData.accessControl}
Data Protection:    ${sddData.dataProtection}
Audit Logging:      ${sddData.auditLogging ? "Enabled" : "Disabled"}
Encryption:         ${sddData.encryption ? "Enabled" : "Disabled"}

================================================================================

8. DEPLOYMENT PLAN
------------------
Environment Flow:   ${sddData.environment}

Deployment Steps:
${sddData.deploymentSteps.map((s) => `  ${s}`).join("\n")}

Rollback Plan:
${sddData.rollbackPlan}

================================================================================

9. TESTING STRATEGY
-------------------
Unit Tests:         ${sddData.unitTests ? "Required" : "Optional"}
Integration Tests:  ${sddData.integrationTests ? "Required" : "Optional"}

UAT Criteria:
${sddData.uatCriteria}

Test Cases:
${sddData.testCases}

================================================================================

10. MAINTENANCE & SUPPORT
-------------------------
Monitoring Metrics:
${sddData.monitoringMetrics.map((m) => `  • ${m}`).join("\n")}

Logging Level:      ${sddData.loggingLevel}
Support Contact:    ${sddData.supportContacts}
Maintenance:        ${sddData.maintenanceSchedule}

================================================================================
                     Generated by AutoFlow Discovery
================================================================================
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SDD_${useCase.name.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("SDD exported as document");
  };

  const updateArrayField = (
    field: keyof SDDData,
    index: number,
    value: string
  ) => {
    const arr = [...(sddData[field] as string[])];
    arr[index] = value;
    setSddData({ ...sddData, [field]: arr });
  };

  const addArrayItem = (field: keyof SDDData) => {
    const arr = [...(sddData[field] as string[]), ""];
    setSddData({ ...sddData, [field]: arr });
  };

  const removeArrayItem = (field: keyof SDDData, index: number) => {
    const arr = (sddData[field] as string[]).filter((_, i) => i !== index);
    setSddData({ ...sddData, [field]: arr });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Code className="mr-2 h-4 w-4" />
          Generate SDD
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            Solution Design Document (SDD)
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6 py-4">
            {/* 1. Solution Overview */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                <Server className="h-4 w-4" />
                Solution Overview
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Solution Name</Label>
                  <Input
                    value={sddData.solutionName}
                    onChange={(e) =>
                      setSddData({ ...sddData, solutionName: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input
                    value={sddData.version}
                    onChange={(e) =>
                      setSddData({ ...sddData, version: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Author</Label>
                  <Input
                    value={sddData.author}
                    onChange={(e) =>
                      setSddData({ ...sddData, author: e.target.value })
                    }
                    placeholder="Enter author name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={sddData.status}
                    onValueChange={(v) => setSddData({ ...sddData, status: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Draft">Draft</SelectItem>
                      <SelectItem value="In Review">In Review</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="In Development">In Development</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Solution Description</Label>
                <Textarea
                  value={sddData.solutionDescription}
                  onChange={(e) =>
                    setSddData({ ...sddData, solutionDescription: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </section>

            <Separator />

            {/* 2. Technical Architecture */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                <Workflow className="h-4 w-4" />
                Technical Architecture
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Architecture Pattern</Label>
                  <Textarea
                    value={sddData.architecture}
                    onChange={(e) =>
                      setSddData({ ...sddData, architecture: e.target.value })
                    }
                    rows={2}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Components</Label>
                  {sddData.components.map((comp, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={comp}
                        onChange={(e) =>
                          updateArrayField("components", idx, e.target.value)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArrayItem("components", idx)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem("components")}
                  >
                    + Add Component
                  </Button>
                </div>
                <div className="space-y-2">
                  <Label>Technology Stack</Label>
                  {sddData.technologyStack.map((tech, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={tech}
                        onChange={(e) =>
                          updateArrayField("technologyStack", idx, e.target.value)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArrayItem("technologyStack", idx)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem("technologyStack")}
                  >
                    + Add Technology
                  </Button>
                </div>
              </div>
            </section>

            <Separator />

            {/* 3. System Requirements */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                <Settings className="h-4 w-4" />
                System Requirements
              </h3>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Infrastructure</Label>
                  <Input
                    value={sddData.infrastructure}
                    onChange={(e) =>
                      setSddData({ ...sddData, infrastructure: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Dependencies</Label>
                  {sddData.dependencies.map((dep, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        value={dep}
                        onChange={(e) =>
                          updateArrayField("dependencies", idx, e.target.value)
                        }
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeArrayItem("dependencies", idx)}
                      >
                        ✕
                      </Button>
                    </div>
                  ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => addArrayItem("dependencies")}
                  >
                    + Add Dependency
                  </Button>
                </div>
              </div>
            </section>

            <Separator />

            {/* 4. Integration Design */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">4</Badge>
                <Database className="h-4 w-4" />
                Integration Design
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Source System</Label>
                  <Input
                    value={sddData.sourceSystem}
                    onChange={(e) =>
                      setSddData({ ...sddData, sourceSystem: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target System</Label>
                  <Input
                    value={sddData.targetSystem}
                    onChange={(e) =>
                      setSddData({ ...sddData, targetSystem: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>API Endpoints</Label>
                  <Input
                    value={sddData.apiEndpoints}
                    onChange={(e) =>
                      setSddData({ ...sddData, apiEndpoints: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Authentication Method</Label>
                  <Select
                    value={sddData.authMethod}
                    onValueChange={(v) =>
                      setSddData({ ...sddData, authMethod: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="OAuth 2.0 / API Key">
                        OAuth 2.0 / API Key
                      </SelectItem>
                      <SelectItem value="OAuth 2.0">OAuth 2.0</SelectItem>
                      <SelectItem value="API Key">API Key</SelectItem>
                      <SelectItem value="Basic Auth">Basic Auth</SelectItem>
                      <SelectItem value="JWT">JWT Token</SelectItem>
                      <SelectItem value="mTLS">mTLS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data Mapping</Label>
                <Textarea
                  value={sddData.dataMapping}
                  onChange={(e) =>
                    setSddData({ ...sddData, dataMapping: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </section>

            <Separator />

            {/* 5. Data Model */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">5</Badge>
                Data Model
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Input Schema</Label>
                  <Textarea
                    value={sddData.inputSchema}
                    onChange={(e) =>
                      setSddData({ ...sddData, inputSchema: e.target.value })
                    }
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Output Schema</Label>
                  <Textarea
                    value={sddData.outputSchema}
                    onChange={(e) =>
                      setSddData({ ...sddData, outputSchema: e.target.value })
                    }
                    rows={6}
                    className="font-mono text-xs"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Data Transformations</Label>
                <Textarea
                  value={sddData.dataTransformations}
                  onChange={(e) =>
                    setSddData({
                      ...sddData,
                      dataTransformations: e.target.value,
                    })
                  }
                  rows={2}
                />
              </div>
            </section>

            <Separator />

            {/* 6. Error Handling */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">6</Badge>
                Error Handling
              </h3>
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Retry Strategy</Label>
                  <Select
                    value={sddData.retryStrategy}
                    onValueChange={(v) =>
                      setSddData({ ...sddData, retryStrategy: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Exponential backoff">
                        Exponential Backoff
                      </SelectItem>
                      <SelectItem value="Linear with manual escalation">
                        Linear + Escalation
                      </SelectItem>
                      <SelectItem value="Fixed interval">Fixed Interval</SelectItem>
                      <SelectItem value="No retry">No Retry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Max Retries</Label>
                  <Input
                    type="number"
                    value={sddData.maxRetries}
                    onChange={(e) =>
                      setSddData({
                        ...sddData,
                        maxRetries: Number(e.target.value),
                      })
                    }
                    min={0}
                    max={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fallback Action</Label>
                  <Input
                    value={sddData.fallbackAction}
                    onChange={(e) =>
                      setSddData({ ...sddData, fallbackAction: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Exception Handling</Label>
                <Textarea
                  value={sddData.exceptionHandling}
                  onChange={(e) =>
                    setSddData({ ...sddData, exceptionHandling: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </section>

            <Separator />

            {/* 7. Security */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">7</Badge>
                <Shield className="h-4 w-4" />
                Security Considerations
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Access Control</Label>
                  <Input
                    value={sddData.accessControl}
                    onChange={(e) =>
                      setSddData({ ...sddData, accessControl: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Data Protection</Label>
                  <Input
                    value={sddData.dataProtection}
                    onChange={(e) =>
                      setSddData({ ...sddData, dataProtection: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="auditLogging"
                    checked={sddData.auditLogging}
                    onCheckedChange={(c) =>
                      setSddData({ ...sddData, auditLogging: !!c })
                    }
                  />
                  <Label htmlFor="auditLogging">Audit Logging</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="encryption"
                    checked={sddData.encryption}
                    onCheckedChange={(c) =>
                      setSddData({ ...sddData, encryption: !!c })
                    }
                  />
                  <Label htmlFor="encryption">Encryption</Label>
                </div>
              </div>
            </section>

            <Separator />

            {/* 8. Deployment */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">8</Badge>
                Deployment Plan
              </h3>
              <div className="space-y-2">
                <Label>Environment Flow</Label>
                <Input
                  value={sddData.environment}
                  onChange={(e) =>
                    setSddData({ ...sddData, environment: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Deployment Steps</Label>
                {sddData.deploymentSteps.map((step, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={step}
                      onChange={(e) =>
                        updateArrayField("deploymentSteps", idx, e.target.value)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArrayItem("deploymentSteps", idx)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem("deploymentSteps")}
                >
                  + Add Step
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Rollback Plan</Label>
                <Textarea
                  value={sddData.rollbackPlan}
                  onChange={(e) =>
                    setSddData({ ...sddData, rollbackPlan: e.target.value })
                  }
                  rows={2}
                />
              </div>
            </section>

            <Separator />

            {/* 9. Testing */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">9</Badge>
                <TestTube className="h-4 w-4" />
                Testing Strategy
              </h3>
              <div className="flex gap-6">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="unitTests"
                    checked={sddData.unitTests}
                    onCheckedChange={(c) =>
                      setSddData({ ...sddData, unitTests: !!c })
                    }
                  />
                  <Label htmlFor="unitTests">Unit Tests Required</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="integrationTests"
                    checked={sddData.integrationTests}
                    onCheckedChange={(c) =>
                      setSddData({ ...sddData, integrationTests: !!c })
                    }
                  />
                  <Label htmlFor="integrationTests">Integration Tests Required</Label>
                </div>
              </div>
              <div className="space-y-2">
                <Label>UAT Criteria</Label>
                <Textarea
                  value={sddData.uatCriteria}
                  onChange={(e) =>
                    setSddData({ ...sddData, uatCriteria: e.target.value })
                  }
                  rows={2}
                />
              </div>
              <div className="space-y-2">
                <Label>Test Cases</Label>
                <Textarea
                  value={sddData.testCases}
                  onChange={(e) =>
                    setSddData({ ...sddData, testCases: e.target.value })
                  }
                  rows={4}
                />
              </div>
            </section>

            <Separator />

            {/* 10. Maintenance */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">10</Badge>
                Maintenance & Support
              </h3>
              <div className="space-y-2">
                <Label>Monitoring Metrics</Label>
                {sddData.monitoringMetrics.map((metric, idx) => (
                  <div key={idx} className="flex gap-2">
                    <Input
                      value={metric}
                      onChange={(e) =>
                        updateArrayField("monitoringMetrics", idx, e.target.value)
                      }
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeArrayItem("monitoringMetrics", idx)}
                    >
                      ✕
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => addArrayItem("monitoringMetrics")}
                >
                  + Add Metric
                </Button>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Logging Level</Label>
                  <Select
                    value={sddData.loggingLevel}
                    onValueChange={(v) =>
                      setSddData({ ...sddData, loggingLevel: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DEBUG">DEBUG</SelectItem>
                      <SelectItem value="INFO">INFO</SelectItem>
                      <SelectItem value="WARN">WARN</SelectItem>
                      <SelectItem value="ERROR">ERROR</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Support Contacts</Label>
                  <Input
                    value={sddData.supportContacts}
                    onChange={(e) =>
                      setSddData({ ...sddData, supportContacts: e.target.value })
                    }
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Maintenance Schedule</Label>
                <Input
                  value={sddData.maintenanceSchedule}
                  onChange={(e) =>
                    setSddData({
                      ...sddData,
                      maintenanceSchedule: e.target.value,
                    })
                  }
                />
              </div>
            </section>
          </div>
        </ScrollArea>

        {/* Export Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={exportSDDAsJSON}>
            <FileJson className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
          <Button onClick={exportSDDAsText}>
            <Download className="mr-2 h-4 w-4" />
            Export Document
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
