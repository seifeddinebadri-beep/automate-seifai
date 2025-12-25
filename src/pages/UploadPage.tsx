import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Check, AlertCircle, Loader2 } from "lucide-react";

interface ParsedData {
  headers: string[];
  rows: string[][];
  preview: string[][];
}

interface ColumnMapping {
  case_id: string;
  activity: string;
  timestamp: string;
  user_role?: string;
  system?: string;
  duration?: string;
}

const requiredFields = ["case_id", "activity", "timestamp"] as const;
const optionalFields = ["user_role", "system", "duration"] as const;

export default function UploadPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    case_id: "",
    activity: "",
    timestamp: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "confirm">("upload");

  const parseCSV = (text: string): ParsedData => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1).map((line) => {
      // Handle quoted values with commas
      const matches = line.match(/(".*?"|[^",\s]+)(?=\s*,|\s*$)/g) || [];
      return matches.map((val) => val.replace(/"/g, "").trim());
    });
    const preview = rows.slice(0, 5);
    return { headers, rows, preview };
  };

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        if (!selectedFile.name.endsWith(".csv")) {
          toast.error("Please upload a CSV file");
          return;
        }
        setFile(selectedFile);
        const reader = new FileReader();
        reader.onload = (event) => {
          const text = event.target?.result as string;
          const data = parseCSV(text);
          setParsedData(data);

          // Auto-detect column mappings
          const autoMapping: ColumnMapping = {
            case_id: "",
            activity: "",
            timestamp: "",
          };

          data.headers.forEach((header) => {
            const lower = header.toLowerCase();
            if (lower.includes("case") && lower.includes("id")) {
              autoMapping.case_id = header;
            } else if (lower === "activity" || lower === "step" || lower === "task") {
              autoMapping.activity = header;
            } else if (lower.includes("timestamp") || lower.includes("time") || lower.includes("date")) {
              autoMapping.timestamp = header;
            } else if (lower.includes("role") || lower.includes("user")) {
              autoMapping.user_role = header;
            } else if (lower === "system" || lower === "application") {
              autoMapping.system = header;
            } else if (lower === "duration" || lower.includes("time_spent")) {
              autoMapping.duration = header;
            }
          });

          setColumnMapping(autoMapping);
          setStep("map");
        };
        reader.readAsText(selectedFile);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const droppedFile = e.dataTransfer.files[0];
      if (droppedFile) {
        const input = document.getElementById("file-input") as HTMLInputElement;
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(droppedFile);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
    },
    []
  );

  const handleMappingChange = (field: keyof ColumnMapping, value: string) => {
    setColumnMapping((prev) => ({ ...prev, [field]: value || undefined }));
  };

  const validateMapping = () => {
    return requiredFields.every((field) => columnMapping[field]);
  };

  const processData = async () => {
    if (!file || !parsedData || !validateMapping()) return;

    setIsProcessing(true);

    try {
      // Create dataset record
      const { data: dataset, error: datasetError } = await supabase
        .from("datasets")
        .insert({
          name: file.name.replace(".csv", ""),
          file_name: file.name,
          row_count: parsedData.rows.length,
          status: "processing",
        })
        .select()
        .single();

      if (datasetError) throw datasetError;

      // Transform and insert process events
      const events = parsedData.rows.map((row) => {
        const getCol = (field: keyof ColumnMapping) => {
          const colName = columnMapping[field];
          if (!colName) return null;
          const idx = parsedData.headers.indexOf(colName);
          return idx >= 0 ? row[idx] : null;
        };

        const durationVal = getCol("duration");

        return {
          dataset_id: dataset.id,
          case_id: getCol("case_id") || "",
          activity: getCol("activity") || "",
          timestamp: getCol("timestamp") || new Date().toISOString(),
          user_role: getCol("user_role"),
          system: getCol("system"),
          duration: durationVal ? parseInt(durationVal, 10) || null : null,
        };
      });

      // Insert in batches
      const batchSize = 500;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        const { error } = await supabase.from("process_events").insert(batch);
        if (error) throw error;
      }

      // Update dataset status
      await supabase
        .from("datasets")
        .update({ status: "completed" })
        .eq("id", dataset.id);

      toast.success(`Successfully imported ${events.length} events`);
      
      // Trigger analysis
      toast.info("Starting process analysis...");
      
      const response = await supabase.functions.invoke("analyze-process", {
        body: { datasetId: dataset.id },
      });

      if (response.error) {
        console.error("Analysis error:", response.error);
        toast.warning("Data imported, but analysis encountered an issue. You can retry from Process Overview.");
      } else {
        toast.success("Analysis complete! Automation opportunities detected.");
      }

      navigate("/process");
    } catch (error) {
      console.error("Error processing data:", error);
      toast.error("Failed to process data. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
        {/* Progress Steps */}
        <div className="flex items-center justify-center gap-4">
          {["Upload", "Map Columns", "Confirm"].map((label, idx) => {
            const stepMap = ["upload", "map", "confirm"];
            const currentIdx = stepMap.indexOf(step);
            const isActive = idx === currentIdx;
            const isComplete = idx < currentIdx;

            return (
              <div key={label} className="flex items-center gap-2">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium ${
                    isComplete
                      ? "bg-success text-success-foreground"
                      : isActive
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isComplete ? <Check className="h-4 w-4" /> : idx + 1}
                </div>
                <span
                  className={`text-sm ${
                    isActive ? "font-medium text-foreground" : "text-muted-foreground"
                  }`}
                >
                  {label}
                </span>
                {idx < 2 && (
                  <div className="ml-2 h-px w-12 bg-border" />
                )}
              </div>
            );
          })}
        </div>

        {/* Step 1: Upload */}
        {step === "upload" && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Process Data</CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-12 transition-colors hover:border-primary/50"
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
              >
                <Upload className="mb-4 h-12 w-12 text-muted-foreground" />
                <h3 className="mb-2 text-lg font-semibold">
                  Drag and drop your CSV file
                </h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  or click to browse
                </p>
                <input
                  id="file-input"
                  type="file"
                  accept=".csv"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button
                  onClick={() => document.getElementById("file-input")?.click()}
                >
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Select CSV File
                </Button>
              </div>

              <div className="mt-6 rounded-lg bg-muted/50 p-4">
                <h4 className="mb-2 font-medium">Required Fields</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <code className="rounded bg-muted px-1">case_id</code> - Unique identifier for each process instance</li>
                  <li>• <code className="rounded bg-muted px-1">activity</code> - Name of the activity/step performed</li>
                  <li>• <code className="rounded bg-muted px-1">timestamp</code> - When the activity occurred</li>
                </ul>
                <h4 className="mb-2 mt-4 font-medium">Optional Fields</h4>
                <ul className="space-y-1 text-sm text-muted-foreground">
                  <li>• <code className="rounded bg-muted px-1">user_role</code> - Role of the person performing the activity</li>
                  <li>• <code className="rounded bg-muted px-1">system</code> - System/application used</li>
                  <li>• <code className="rounded bg-muted px-1">duration</code> - Time spent on the activity (seconds)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Map Columns */}
        {step === "map" && parsedData && (
          <>
            <Card>
              <CardHeader>
                <CardTitle>Map Columns</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid gap-4 md:grid-cols-2">
                  {requiredFields.map((field) => (
                    <div key={field}>
                      <Label className="mb-2 flex items-center gap-1">
                        {field.replace("_", " ")}
                        <span className="text-destructive">*</span>
                      </Label>
                      <Select
                        value={columnMapping[field]}
                        onValueChange={(v) => handleMappingChange(field, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column" />
                        </SelectTrigger>
                        <SelectContent>
                          {parsedData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                  {optionalFields.map((field) => (
                    <div key={field}>
                      <Label className="mb-2">{field.replace("_", " ")}</Label>
                      <Select
                        value={columnMapping[field] || ""}
                        onValueChange={(v) => handleMappingChange(field, v)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select column (optional)" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">None</SelectItem>
                          {parsedData.headers.map((header) => (
                            <SelectItem key={header} value={header}>
                              {header}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>

                {!validateMapping() && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="h-4 w-4" />
                    Please map all required fields
                  </div>
                )}

                <div className="flex gap-3">
                  <Button variant="outline" onClick={() => setStep("upload")}>
                    Back
                  </Button>
                  <Button
                    onClick={() => setStep("confirm")}
                    disabled={!validateMapping()}
                  >
                    Continue
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Data Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Data Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        {parsedData.headers.map((header) => (
                          <TableHead key={header}>{header}</TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {parsedData.preview.map((row, idx) => (
                        <TableRow key={idx}>
                          {row.map((cell, cellIdx) => (
                            <TableCell key={cellIdx}>{cell}</TableCell>
                          ))}
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">
                  Showing 5 of {parsedData.rows.length} rows
                </p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Step 3: Confirm */}
        {step === "confirm" && parsedData && (
          <Card>
            <CardHeader>
              <CardTitle>Confirm Import</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="text-sm text-muted-foreground">File</p>
                    <p className="font-medium">{file?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                    <p className="font-medium">{parsedData.rows.length.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="mb-2 font-medium">Column Mappings</h4>
                <div className="space-y-2 text-sm">
                  {Object.entries(columnMapping)
                    .filter(([_, value]) => value)
                    .map(([key, value]) => (
                      <div key={key} className="flex items-center gap-2">
                        <span className="font-medium">{key}:</span>
                        <span className="text-muted-foreground">{value}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={() => setStep("map")}
                  disabled={isProcessing}
                >
                  Back
                </Button>
                <Button onClick={processData} disabled={isProcessing}>
                  {isProcessing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Check className="mr-2 h-4 w-4" />
                      Import & Analyze
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
