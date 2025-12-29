import { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  Upload, 
  FileSpreadsheet, 
  FileText, 
  Video, 
  Check, 
  AlertCircle, 
  Loader2,
  Sparkles
} from "lucide-react";

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
  
  // CSV state
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({
    case_id: "",
    activity: "",
    timestamp: "",
  });
  const [isProcessing, setIsProcessing] = useState(false);
  const [step, setStep] = useState<"upload" | "map" | "confirm">("upload");

  // Document state
  const [docFile, setDocFile] = useState<File | null>(null);
  const [docContent, setDocContent] = useState<string>("");
  const [isAnalyzingDoc, setIsAnalyzingDoc] = useState(false);

  // Video state
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const parseCSV = (text: string): ParsedData => {
    const lines = text.trim().split("\n");
    const headers = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const rows = lines.slice(1).map((line) => {
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

      const batchSize = 500;
      for (let i = 0; i < events.length; i += batchSize) {
        const batch = events.slice(i, i + batchSize);
        const { error } = await supabase.from("process_events").insert(batch);
        if (error) throw error;
      }

      await supabase
        .from("datasets")
        .update({ status: "completed" })
        .eq("id", dataset.id);

      toast.success(`Successfully imported ${events.length} events`);
      toast.info("Starting process analysis...");
      
      const response = await supabase.functions.invoke("analyze-process", {
        body: { datasetId: dataset.id },
      });

      if (response.error) {
        console.error("Analysis error:", response.error);
        toast.warning("Data imported, but analysis encountered an issue.");
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

  // Word document handling
  const handleDocFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        const validExtensions = [".docx", ".doc", ".txt", ".md"];
        const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
        
        if (!validExtensions.includes(ext)) {
          toast.error("Please upload a Word document (.docx, .doc) or text file (.txt, .md)");
          return;
        }
        
        setDocFile(selectedFile);
        
        // Read file content
        const reader = new FileReader();
        reader.onload = async (event) => {
          let content = "";
          
          if (ext === ".txt" || ext === ".md") {
            content = event.target?.result as string;
          } else if (ext === ".docx") {
            // For .docx files, we'll extract text using a simple approach
            // The arraybuffer contains the docx zip file
            const arrayBuffer = event.target?.result as ArrayBuffer;
            content = await extractTextFromDocx(arrayBuffer);
          } else {
            // For .doc files (older format), we can only try text extraction
            content = event.target?.result as string;
          }
          
          setDocContent(content);
        };
        
        if (ext === ".docx") {
          reader.readAsArrayBuffer(selectedFile);
        } else {
          reader.readAsText(selectedFile);
        }
      }
    },
    []
  );

  // Simple DOCX text extraction (extracts from document.xml)
  const extractTextFromDocx = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    try {
      const JSZip = (await import("jszip")).default;
      const zip = await JSZip.loadAsync(arrayBuffer);
      const documentXml = await zip.file("word/document.xml")?.async("text");
      
      if (!documentXml) {
        return "Could not extract document content";
      }
      
      // Extract text from XML by removing tags
      const textContent = documentXml
        .replace(/<[^>]+>/g, " ")
        .replace(/\s+/g, " ")
        .trim();
      
      return textContent;
    } catch (error) {
      console.error("Error extracting DOCX:", error);
      return "Error extracting document content";
    }
  };

  const analyzeDocument = async () => {
    if (!docFile || !docContent) return;

    setIsAnalyzingDoc(true);
    
    try {
      toast.info("Analyzing document with AI...");
      
      const response = await supabase.functions.invoke("analyze-document", {
        body: {
          content: docContent.substring(0, 50000), // Limit content size
          fileName: docFile.name,
          fileType: docFile.name.endsWith(".docx") ? "Word Document" : "Text Document",
        },
      });

      if (response.error) {
        console.error("Analysis error:", response.error);
        toast.error("Failed to analyze document. Please try again.");
        return;
      }

      toast.success(`Analysis complete! Found ${response.data.useCasesCount} automation opportunities.`);
      navigate("/use-cases");
    } catch (error) {
      console.error("Error analyzing document:", error);
      toast.error("Failed to analyze document. Please try again.");
    } finally {
      setIsAnalyzingDoc(false);
    }
  };

  // Video handling
  const handleVideoFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      if (selectedFile) {
        const validExtensions = [".mp4", ".webm", ".mov", ".avi", ".mkv"];
        const ext = selectedFile.name.substring(selectedFile.name.lastIndexOf(".")).toLowerCase();
        
        if (!validExtensions.includes(ext)) {
          toast.error("Please upload a video file (.mp4, .webm, .mov, .avi, .mkv)");
          return;
        }
        
        // Check file size (max 500MB)
        if (selectedFile.size > 500 * 1024 * 1024) {
          toast.error("Video file must be less than 500MB");
          return;
        }
        
        setVideoFile(selectedFile);
      }
    },
    []
  );

  const uploadVideo = async () => {
    if (!videoFile) return;

    setIsUploadingVideo(true);
    setUploadProgress(0);
    
    try {
      const fileName = `${Date.now()}-${videoFile.name}`;
      
      // Upload to Supabase Storage
      const { data, error } = await supabase.storage
        .from("videos")
        .upload(fileName, videoFile, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from("videos")
        .getPublicUrl(fileName);

      // Save reference in database
      const { error: dbError } = await supabase
        .from("document_analyses")
        .insert({
          file_name: videoFile.name,
          file_type: "Video",
          content_summary: "Video uploaded for process documentation",
          video_url: urlData.publicUrl,
          use_cases: [],
        });

      if (dbError) throw dbError;

      toast.success("Video uploaded successfully!");
      setVideoFile(null);
      setUploadProgress(100);
    } catch (error) {
      console.error("Error uploading video:", error);
      toast.error("Failed to upload video. Please try again.");
    } finally {
      setIsUploadingVideo(false);
    }
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-4xl space-y-6 animate-fade-in">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Upload Data</h1>
          <p className="text-muted-foreground">
            Import process data, technical documents, or videos for analysis
          </p>
        </div>

        <Tabs defaultValue="csv" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="csv" className="flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Process Data (CSV)
            </TabsTrigger>
            <TabsTrigger value="document" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="video" className="flex items-center gap-2">
              <Video className="h-4 w-4" />
              Videos
            </TabsTrigger>
          </TabsList>

          {/* CSV Tab */}
          <TabsContent value="csv" className="space-y-6 mt-6">
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
                  <CardDescription>
                    Upload a CSV file containing your process event log
                  </CardDescription>
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
          </TabsContent>

          {/* Document Tab */}
          <TabsContent value="document" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-primary" />
                  AI Document Analysis
                </CardTitle>
                <CardDescription>
                  Upload technical instructions, SOPs, or operational documents. 
                  AI will analyze and identify automation opportunities.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-12 transition-colors hover:border-primary/50"
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile) {
                      const input = document.getElementById("doc-input") as HTMLInputElement;
                      const dataTransfer = new DataTransfer();
                      dataTransfer.items.add(droppedFile);
                      input.files = dataTransfer.files;
                      input.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <FileText className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    Upload Technical Documentation
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    Word documents (.docx, .doc) or text files (.txt, .md)
                  </p>
                  <input
                    id="doc-input"
                    type="file"
                    accept=".docx,.doc,.txt,.md"
                    className="hidden"
                    onChange={handleDocFileChange}
                  />
                  <Button
                    onClick={() => document.getElementById("doc-input")?.click()}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    Select Document
                  </Button>
                </div>

                {docFile && (
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{docFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(docFile.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={analyzeDocument}
                        disabled={isAnalyzingDoc || !docContent}
                      >
                        {isAnalyzingDoc ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Analyzing...
                          </>
                        ) : (
                          <>
                            <Sparkles className="mr-2 h-4 w-4" />
                            Analyze with AI
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {docContent && (
                      <div className="mt-4">
                        <p className="text-sm text-muted-foreground mb-2">Content Preview:</p>
                        <div className="rounded bg-muted/50 p-3 text-sm max-h-40 overflow-y-auto">
                          {docContent.substring(0, 500)}
                          {docContent.length > 500 && "..."}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="mb-2 font-medium">What AI Will Analyze</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Standard Operating Procedures (SOPs)</li>
                    <li>• Technical instructions and manuals</li>
                    <li>• Process documentation</li>
                    <li>• Operational guidelines</li>
                  </ul>
                  <h4 className="mb-2 mt-4 font-medium">AI Will Identify</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Repetitive tasks suitable for RPA</li>
                    <li>• Decision points for rule-based automation</li>
                    <li>• Workflow optimization opportunities</li>
                    <li>• AI/ML automation candidates</li>
                  </ul>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Video Tab */}
          <TabsContent value="video" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Upload Process Videos</CardTitle>
                <CardDescription>
                  Upload videos documenting your processes for reference and future analysis
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div
                  className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-muted/30 p-12 transition-colors hover:border-primary/50"
                  onDrop={(e) => {
                    e.preventDefault();
                    const droppedFile = e.dataTransfer.files[0];
                    if (droppedFile) {
                      const input = document.getElementById("video-input") as HTMLInputElement;
                      const dataTransfer = new DataTransfer();
                      dataTransfer.items.add(droppedFile);
                      input.files = dataTransfer.files;
                      input.dispatchEvent(new Event("change", { bubbles: true }));
                    }
                  }}
                  onDragOver={(e) => e.preventDefault()}
                >
                  <Video className="mb-4 h-12 w-12 text-muted-foreground" />
                  <h3 className="mb-2 text-lg font-semibold">
                    Upload Process Recording
                  </h3>
                  <p className="mb-4 text-sm text-muted-foreground">
                    MP4, WebM, MOV, AVI, MKV (max 500MB)
                  </p>
                  <input
                    id="video-input"
                    type="file"
                    accept="video/*,.mp4,.webm,.mov,.avi,.mkv"
                    className="hidden"
                    onChange={handleVideoFileChange}
                  />
                  <Button
                    onClick={() => document.getElementById("video-input")?.click()}
                  >
                    <Video className="mr-2 h-4 w-4" />
                    Select Video
                  </Button>
                </div>

                {videoFile && (
                  <div className="rounded-lg border bg-card p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Video className="h-8 w-8 text-primary" />
                        <div>
                          <p className="font-medium">{videoFile.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {(videoFile.size / (1024 * 1024)).toFixed(1)} MB
                          </p>
                        </div>
                      </div>
                      <Button
                        onClick={uploadVideo}
                        disabled={isUploadingVideo}
                      >
                        {isUploadingVideo ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="mr-2 h-4 w-4" />
                            Upload Video
                          </>
                        )}
                      </Button>
                    </div>
                    
                    {isUploadingVideo && (
                      <div className="mt-4">
                        <div className="h-2 rounded-full bg-muted overflow-hidden">
                          <div 
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${uploadProgress}%` }}
                          />
                        </div>
                        <p className="text-sm text-muted-foreground mt-2 text-center">
                          {uploadProgress}% uploaded
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-lg bg-muted/50 p-4">
                  <h4 className="mb-2 font-medium">Supported Video Types</h4>
                  <ul className="space-y-1 text-sm text-muted-foreground">
                    <li>• Screen recordings of process execution</li>
                    <li>• Training videos</li>
                    <li>• Process walkthroughs</li>
                    <li>• System demonstrations</li>
                  </ul>
                  <p className="mt-4 text-sm text-muted-foreground">
                    <strong>Note:</strong> Videos are stored for reference. Future versions will include AI video analysis for automated transcription and use case detection.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
