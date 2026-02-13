import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, ArrowLeft, ArrowRight, SkipForward } from "lucide-react";

export interface ProcessContext {
  processName: string;
  businessUnit?: string;
  businessObjective?: string;
  processFrequency?: string;
  processCriticality?: string;
  tools: { name: string; purpose: string }[];
  additionalDetails?: string;
  knownPainPoints?: string;
}

interface CSVContextWizardProps {
  open: boolean;
  onComplete: (context: ProcessContext) => void;
  onSkip: () => void;
}

const STEPS = ["Process Info", "Business Context", "Tools & Systems", "Additional Context"];

export function CSVContextWizard({ open, onComplete, onSkip }: CSVContextWizardProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [context, setContext] = useState<ProcessContext>({
    processName: "",
    tools: [],
  });
  const [newTool, setNewTool] = useState({ name: "", purpose: "" });

  const progress = ((currentStep + 1) / STEPS.length) * 100;

  const addTool = () => {
    if (newTool.name.trim()) {
      setContext((prev) => ({
        ...prev,
        tools: [...prev.tools, { name: newTool.name.trim(), purpose: newTool.purpose.trim() }],
      }));
      setNewTool({ name: "", purpose: "" });
    }
  };

  const removeTool = (index: number) => {
    setContext((prev) => ({
      ...prev,
      tools: prev.tools.filter((_, i) => i !== index),
    }));
  };

  const canProceed = currentStep === 0 ? context.processName.trim().length > 0 : true;

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      onComplete(context);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) setCurrentStep((s) => s - 1);
  };

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-lg" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>Business Context</DialogTitle>
          <DialogDescription>
            Step {currentStep + 1} of {STEPS.length}: {STEPS[currentStep]}
          </DialogDescription>
        </DialogHeader>

        <Progress value={progress} className="h-2" />

        <div className="space-y-4 py-2">
          {currentStep === 0 && (
            <>
              <div>
                <Label>
                  Process Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  placeholder="e.g. Invoice Processing"
                  value={context.processName}
                  onChange={(e) => setContext((p) => ({ ...p, processName: e.target.value }))}
                />
              </div>
              <div>
                <Label>Business Unit / Department</Label>
                <Input
                  placeholder="e.g. Finance, HR, Operations"
                  value={context.businessUnit || ""}
                  onChange={(e) => setContext((p) => ({ ...p, businessUnit: e.target.value }))}
                />
              </div>
            </>
          )}

          {currentStep === 1 && (
            <>
              <div>
                <Label>Business Objective</Label>
                <Textarea
                  placeholder="What does this process achieve?"
                  value={context.businessObjective || ""}
                  onChange={(e) => setContext((p) => ({ ...p, businessObjective: e.target.value }))}
                />
              </div>
              <div>
                <Label>Process Frequency</Label>
                <Select
                  value={context.processFrequency || ""}
                  onValueChange={(v) => setContext((p) => ({ ...p, processFrequency: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How often is this process run?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Daily">Daily</SelectItem>
                    <SelectItem value="Weekly">Weekly</SelectItem>
                    <SelectItem value="Monthly">Monthly</SelectItem>
                    <SelectItem value="On-demand">On-demand</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Process Criticality</Label>
                <Select
                  value={context.processCriticality || ""}
                  onValueChange={(v) => setContext((p) => ({ ...p, processCriticality: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="How critical is this process?" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {currentStep === 2 && (
            <>
              <div className="space-y-3">
                <Label>Tools & Systems Used</Label>
                {context.tools.map((tool, i) => (
                  <div key={i} className="flex items-center gap-2 rounded-lg border p-2">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{tool.name}</p>
                      {tool.purpose && (
                        <p className="text-xs text-muted-foreground">{tool.purpose}</p>
                      )}
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => removeTool(i)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                ))}
                <div className="grid gap-2">
                  <Input
                    placeholder="Tool name (e.g. SAP, Excel)"
                    value={newTool.name}
                    onChange={(e) => setNewTool((p) => ({ ...p, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Purpose (e.g. ERP system for invoices)"
                    value={newTool.purpose}
                    onChange={(e) => setNewTool((p) => ({ ...p, purpose: e.target.value }))}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={addTool}
                    disabled={!newTool.name.trim()}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add Tool
                  </Button>
                </div>
              </div>
            </>
          )}

          {currentStep === 3 && (
            <>
              <div>
                <Label>Additional Details</Label>
                <Textarea
                  placeholder="Any extra context to help the AI understand this event log..."
                  value={context.additionalDetails || ""}
                  onChange={(e) => setContext((p) => ({ ...p, additionalDetails: e.target.value }))}
                />
              </div>
              <div>
                <Label>Known Pain Points</Label>
                <Textarea
                  placeholder="What are the main issues with this process?"
                  value={context.knownPainPoints || ""}
                  onChange={(e) => setContext((p) => ({ ...p, knownPainPoints: e.target.value }))}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter className="flex-row justify-between sm:justify-between">
          <Button variant="ghost" size="sm" onClick={onSkip}>
            <SkipForward className="mr-1 h-4 w-4" /> Skip
          </Button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <Button variant="outline" size="sm" onClick={handleBack}>
                <ArrowLeft className="mr-1 h-4 w-4" /> Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext} disabled={!canProceed}>
              {currentStep < STEPS.length - 1 ? (
                <>
                  Next <ArrowRight className="ml-1 h-4 w-4" />
                </>
              ) : (
                "Done"
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
