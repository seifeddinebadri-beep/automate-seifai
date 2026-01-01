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
import { toast } from "sonner";
import {
  FileText,
  Download,
  FileJson,
  Check,
  X,
  AlertTriangle,
  Info,
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

interface PDDData {
  // 1. Feature Info
  featureName: string;
  owner: string;
  status: string;
  version: string;
  // 2. Process Definition
  processName: string;
  businessObjective: string;
  frequency: string;
  volume: string;
  criticality: string;
  // 3. Automation Eligibility
  processStability: number;
  dataStructure: number;
  ruleClarity: number;
  exceptionRate: number;
  // 4. User Journey
  triggerType: string;
  inputSource: string;
  inputValidation: string;
  businessRules: string;
  decisionLogic: string;
  humanInTheLoop: boolean;
  outputTarget: string;
  successCriteria: string;
  // Scope
  inScope: string[];
  outOfScope: string[];
  // KPIs
  targetExecutionTime: string;
  targetSuccessRate: string;
  targetManualRate: string;
  roiEstimate: string;
}

interface PDDGeneratorProps {
  useCase: UseCase;
}

export function PDDGenerator({ useCase }: PDDGeneratorProps) {
  const [open, setOpen] = useState(false);
  const [pddData, setPddData] = useState<PDDData>(() => initializePDD(useCase));

  function initializePDD(uc: UseCase): PDDData {
    // Calculate eligibility scores based on use case data
    const stabilityScore = uc.confidence_score > 0.7 ? 4 : uc.confidence_score > 0.5 ? 3 : 2;
    const dataScore = uc.type === "RPA" || uc.type === "Rule" ? 4 : 3;
    const ruleScore = uc.type === "Rule" ? 5 : uc.type === "RPA" ? 4 : 3;
    const exceptionScore = uc.complexity === "Low" ? 4 : uc.complexity === "Medium" ? 3 : 2;

    return {
      featureName: uc.name,
      owner: "",
      status: uc.status === "new" ? "Draft" : "In Review",
      version: "1.0",
      processName: uc.name,
      businessObjective: uc.description || `Automate ${uc.affected_activities.join(", ")} to reduce manual effort`,
      frequency: uc.monthly_volume > 1000 ? "High" : uc.monthly_volume > 100 ? "Medium" : "Low",
      volume: `${uc.monthly_volume.toLocaleString()} executions/month`,
      criticality: uc.priority_score > 70 ? "High" : uc.priority_score > 40 ? "Medium" : "Low",
      processStability: stabilityScore,
      dataStructure: dataScore,
      ruleClarity: ruleScore,
      exceptionRate: exceptionScore,
      triggerType: uc.pattern_type.includes("scheduled") ? "Scheduled" : uc.pattern_type.includes("event") ? "Event" : "Manual",
      inputSource: "System data / User input",
      inputValidation: "Format and completeness check required",
      businessRules: uc.suggested_approach || "See automation type for recommended rules",
      decisionLogic: uc.ai_explanation || "Rule-based decision logic",
      humanInTheLoop: uc.complexity !== "Low",
      outputTarget: "Target system(s)",
      successCriteria: "Process completion without errors",
      inScope: [
        "Repetitive, structured processes",
        "Deterministic rules",
        uc.complexity !== "Low" ? "Human fallback for exceptions" : "Fully automated execution",
      ],
      outOfScope: [
        "Real-time critical flows",
        "Unstable or frequently changing processes",
        "Fully autonomous AI decisions without oversight",
      ],
      targetExecutionTime: `${Math.round(uc.estimated_time_saved / uc.monthly_volume * 60)} seconds per execution`,
      targetSuccessRate: `${Math.round(uc.confidence_score * 100)}%`,
      targetManualRate: uc.complexity === "Low" ? "<5%" : uc.complexity === "Medium" ? "5-15%" : ">15%",
      roiEstimate: `$${Number(uc.estimated_cost_impact).toLocaleString()}/month`,
    };
  }

  const calculateEligibilityScore = () => {
    const avg = (pddData.processStability + pddData.dataStructure + pddData.ruleClarity + pddData.exceptionRate) / 4;
    return avg;
  };

  const getRecommendedType = () => {
    const score = calculateEligibilityScore();
    if (score >= 4) return useCase.type;
    if (score >= 3) return "Workflow";
    if (score >= 2) return "Rule";
    return "Not eligible";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 4) return { label: "High", color: "text-success" };
    if (score >= 3) return { label: "Medium", color: "text-warning" };
    if (score >= 2) return { label: "Low", color: "text-destructive" };
    return { label: "Very Low", color: "text-destructive" };
  };

  const exportPDDAsJSON = () => {
    const pdd = {
      generatedAt: new Date().toISOString(),
      useCaseId: useCase.id,
      ...pddData,
      eligibilityScore: calculateEligibilityScore(),
      recommendedType: getRecommendedType(),
    };
    const blob = new Blob([JSON.stringify(pdd, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PDD_${useCase.name.replace(/\s+/g, "_")}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PDD exported as JSON");
  };

  const exportPDDAsText = () => {
    const eligScore = calculateEligibilityScore();
    const content = `
================================================================================
                    PROCESS DESIGN DOCUMENT (PDD)
                         Automation Feature
================================================================================

1. FEATURE INFORMATION
----------------------
Name:           ${pddData.featureName}
Owner:          ${pddData.owner || "Not assigned"}
Status:         ${pddData.status}
Version:        ${pddData.version}
Generated:      ${new Date().toLocaleDateString()}

================================================================================

2. PROCESS DEFINITION
---------------------
Process Name:       ${pddData.processName}
Business Objective: ${pddData.businessObjective}
Frequency:          ${pddData.frequency}
Volume:             ${pddData.volume}
Criticality:        ${pddData.criticality}

================================================================================

3. AUTOMATION ELIGIBILITY (Auto-Scored)
---------------------------------------
Process Stability:  ${pddData.processStability}/5 (${getScoreLabel(pddData.processStability).label})
Data Structure:     ${pddData.dataStructure}/5 (${getScoreLabel(pddData.dataStructure).label})
Rule Clarity:       ${pddData.ruleClarity}/5 (${getScoreLabel(pddData.ruleClarity).label})
Exception Rate:     ${pddData.exceptionRate}/5 (${getScoreLabel(pddData.exceptionRate).label})

➡ ELIGIBILITY SCORE: ${eligScore.toFixed(1)}/5
➡ RECOMMENDED TYPE:  ${getRecommendedType()}

================================================================================

4. USER JOURNEY
---------------
TRIGGER
  Type: ${pddData.triggerType}

INPUT
  Source:     ${pddData.inputSource}
  Validation: ${pddData.inputValidation}

LOGIC
  Business Rules: ${pddData.businessRules}
  Decisions:      ${pddData.decisionLogic}

EXCEPTION
  Human-in-the-Loop: ${pddData.humanInTheLoop ? "Yes" : "No"}

OUTPUT
  Target System:    ${pddData.outputTarget}
  Success Criteria: ${pddData.successCriteria}

================================================================================

5. CORE FEATURES
----------------
✓ Process creation
✓ Rule configuration
✓ Trigger setup
✓ Execution & retry
✓ Monitoring & logs

================================================================================

6. SCOPE
--------
IN SCOPE:
${pddData.inScope.map((s) => `  • ${s}`).join("\n")}

OUT OF SCOPE:
${pddData.outOfScope.map((s) => `  • ${s}`).join("\n")}

================================================================================

7. KPIs
-------
Target Execution Time:      ${pddData.targetExecutionTime}
Target Success Rate:        ${pddData.targetSuccessRate}
Manual Intervention Rate:   ${pddData.targetManualRate}
ROI Estimate:               ${pddData.roiEstimate}

================================================================================
                    Generated by AutoFlow Discovery
================================================================================
    `.trim();

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PDD_${useCase.name.replace(/\s+/g, "_")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("PDD exported as document");
  };

  const eligScore = calculateEligibilityScore();
  const eligLabel = getScoreLabel(eligScore);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="default" size="sm">
          <FileText className="mr-2 h-4 w-4" />
          Generate PDD
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Process Design Document (PDD)
          </DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[70vh] pr-4">
          <div className="space-y-6 py-4">
            {/* 1. Feature Info */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                Feature Information
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={pddData.featureName}
                    onChange={(e) => setPddData({ ...pddData, featureName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Input
                    value={pddData.owner}
                    onChange={(e) => setPddData({ ...pddData, owner: e.target.value })}
                    placeholder="Enter owner name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select
                    value={pddData.status}
                    onValueChange={(v) => setPddData({ ...pddData, status: v })}
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
                <div className="space-y-2">
                  <Label>Version</Label>
                  <Input
                    value={pddData.version}
                    onChange={(e) => setPddData({ ...pddData, version: e.target.value })}
                  />
                </div>
              </div>
            </section>

            <Separator />

            {/* 2. Process Definition */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                Process Definition
              </h3>
              <div className="grid gap-4">
                <div className="space-y-2">
                  <Label>Process Name</Label>
                  <Input
                    value={pddData.processName}
                    onChange={(e) => setPddData({ ...pddData, processName: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Business Objective</Label>
                  <Textarea
                    value={pddData.businessObjective}
                    onChange={(e) => setPddData({ ...pddData, businessObjective: e.target.value })}
                    rows={2}
                  />
                </div>
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Frequency</Label>
                    <Select
                      value={pddData.frequency}
                      onValueChange={(v) => setPddData({ ...pddData, frequency: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Volume</Label>
                    <Input
                      value={pddData.volume}
                      onChange={(e) => setPddData({ ...pddData, volume: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Criticality</Label>
                    <Select
                      value={pddData.criticality}
                      onValueChange={(v) => setPddData({ ...pddData, criticality: v })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Low">Low</SelectItem>
                        <SelectItem value="Medium">Medium</SelectItem>
                        <SelectItem value="High">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* 3. Automation Eligibility */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                Automation Eligibility (Auto-Scored)
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                {[
                  { key: "processStability", label: "Process Stability" },
                  { key: "dataStructure", label: "Data Structure" },
                  { key: "ruleClarity", label: "Rule Clarity" },
                  { key: "exceptionRate", label: "Exception Rate (inverse)" },
                ].map(({ key, label }) => (
                  <div key={key} className="space-y-2">
                    <Label className="flex items-center justify-between">
                      {label}
                      <span className={getScoreLabel(pddData[key as keyof PDDData] as number).color}>
                        {pddData[key as keyof PDDData]}/5
                      </span>
                    </Label>
                    <input
                      type="range"
                      min="1"
                      max="5"
                      value={pddData[key as keyof PDDData] as number}
                      onChange={(e) =>
                        setPddData({ ...pddData, [key]: Number(e.target.value) })
                      }
                      className="w-full accent-primary"
                    />
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-4 rounded-lg bg-muted p-4">
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Eligibility Score</p>
                  <p className={`text-2xl font-bold ${eligLabel.color}`}>
                    {eligScore.toFixed(1)}/5
                  </p>
                </div>
                <Separator orientation="vertical" className="h-12" />
                <div className="flex-1">
                  <p className="text-sm text-muted-foreground">Recommended Type</p>
                  <Badge variant="secondary" className="mt-1">
                    {getRecommendedType()}
                  </Badge>
                </div>
              </div>
            </section>

            <Separator />

            {/* 4. User Journey */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">4</Badge>
                User Journey
              </h3>
              <div className="space-y-4">
                <div className="rounded-lg border p-4 space-y-3">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Info className="h-4 w-4 text-primary" /> Trigger
                  </p>
                  <Select
                    value={pddData.triggerType}
                    onValueChange={(v) => setPddData({ ...pddData, triggerType: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manual">Manual</SelectItem>
                      <SelectItem value="Scheduled">Scheduled</SelectItem>
                      <SelectItem value="Event">Event-based</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <p className="font-medium text-sm">Input</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Source</Label>
                      <Input
                        value={pddData.inputSource}
                        onChange={(e) => setPddData({ ...pddData, inputSource: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Validation</Label>
                      <Input
                        value={pddData.inputValidation}
                        onChange={(e) => setPddData({ ...pddData, inputValidation: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <p className="font-medium text-sm">Logic</p>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Business Rules</Label>
                      <Textarea
                        value={pddData.businessRules}
                        onChange={(e) => setPddData({ ...pddData, businessRules: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Decision Logic</Label>
                      <Textarea
                        value={pddData.decisionLogic}
                        onChange={(e) => setPddData({ ...pddData, decisionLogic: e.target.value })}
                        rows={2}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-warning" /> Exception
                  </p>
                  <div className="flex items-center gap-3">
                    <Label>Human-in-the-Loop:</Label>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant={pddData.humanInTheLoop ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPddData({ ...pddData, humanInTheLoop: true })}
                      >
                        <Check className="h-4 w-4 mr-1" /> Yes
                      </Button>
                      <Button
                        type="button"
                        variant={!pddData.humanInTheLoop ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPddData({ ...pddData, humanInTheLoop: false })}
                      >
                        <X className="h-4 w-4 mr-1" /> No
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-lg border p-4 space-y-3">
                  <p className="font-medium text-sm">Output</p>
                  <div className="grid gap-3 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Target System</Label>
                      <Input
                        value={pddData.outputTarget}
                        onChange={(e) => setPddData({ ...pddData, outputTarget: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Success Criteria</Label>
                      <Input
                        value={pddData.successCriteria}
                        onChange={(e) => setPddData({ ...pddData, successCriteria: e.target.value })}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* 5. Core Features */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">5</Badge>
                Core Features
              </h3>
              <div className="grid gap-2 md:grid-cols-2">
                {[
                  "Process creation",
                  "Rule configuration",
                  "Trigger setup",
                  "Execution & retry",
                  "Monitoring & logs",
                ].map((feature) => (
                  <div key={feature} className="flex items-center gap-2 text-sm">
                    <Check className="h-4 w-4 text-success" />
                    {feature}
                  </div>
                ))}
              </div>
            </section>

            <Separator />

            {/* 6. Scope */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">6</Badge>
                Scope
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-lg border border-success/30 bg-success/5 p-4">
                  <p className="font-medium text-sm text-success mb-2">In Scope</p>
                  <div className="space-y-1">
                    {pddData.inScope.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-success mt-0.5" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4">
                  <p className="font-medium text-sm text-destructive mb-2">Out of Scope</p>
                  <div className="space-y-1">
                    {pddData.outOfScope.map((item, i) => (
                      <div key={i} className="flex items-start gap-2 text-sm">
                        <X className="h-4 w-4 text-destructive mt-0.5" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <Separator />

            {/* 7. KPIs */}
            <section className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Badge variant="outline">7</Badge>
                KPIs
              </h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Target Execution Time</Label>
                  <Input
                    value={pddData.targetExecutionTime}
                    onChange={(e) => setPddData({ ...pddData, targetExecutionTime: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Target Success Rate</Label>
                  <Input
                    value={pddData.targetSuccessRate}
                    onChange={(e) => setPddData({ ...pddData, targetSuccessRate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Manual Intervention Rate</Label>
                  <Input
                    value={pddData.targetManualRate}
                    onChange={(e) => setPddData({ ...pddData, targetManualRate: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>ROI Estimate</Label>
                  <Input
                    value={pddData.roiEstimate}
                    onChange={(e) => setPddData({ ...pddData, roiEstimate: e.target.value })}
                  />
                </div>
              </div>
            </section>
          </div>
        </ScrollArea>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={exportPDDAsJSON}>
            <FileJson className="mr-2 h-4 w-4" />
            Export JSON
          </Button>
          <Button onClick={exportPDDAsText}>
            <Download className="mr-2 h-4 w-4" />
            Export Document
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
