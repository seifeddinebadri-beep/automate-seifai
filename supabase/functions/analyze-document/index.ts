import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { content, fileName, fileType } = await req.json();

    if (!content) {
      return new Response(
        JSON.stringify({ error: "No content provided" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Analyzing document: ${fileName} (${fileType})`);
    console.log(`Content length: ${content.length} characters`);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert business process analyst and automation consultant. 
Your task is to analyze technical documentation, operational manuals, and process instructions to identify automation opportunities.

For each document, you must:
1. Summarize the key processes and procedures described
2. Identify specific activities that could be automated
3. Classify each automation opportunity by type (RPA, Workflow, Rule-Based, AI Agent)
4. Assess complexity (Low, Medium, High) and confidence score (0-1)
5. Provide actionable recommendations

Return your analysis as valid JSON with this structure:
{
  "summary": "Brief summary of the document content",
  "use_cases": [
    {
      "name": "Use case name",
      "description": "What this automation would do",
      "type": "RPA" | "Workflow Automation" | "Rule-Based" | "AI Agent",
      "complexity": "Low" | "Medium" | "High",
      "confidence": 0.85,
      "affected_activities": ["Activity 1", "Activity 2"],
      "suggested_approach": "How to implement this",
      "estimated_time_saved_minutes": 30,
      "reasoning": "Why this is a good automation candidate"
    }
  ]
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { 
            role: "user", 
            content: `Analyze this ${fileType} document and identify all automation opportunities:\n\n---\n${content}\n---\n\nProvide your analysis as JSON.` 
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("AI API error:", response.status, errorText);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "AI credits exhausted. Please add funds." }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      throw new Error(`AI API error: ${response.status}`);
    }

    const aiData = await response.json();
    const aiContent = aiData.choices?.[0]?.message?.content || "";

    console.log("AI response received, parsing JSON...");

    // Extract JSON from response (handle markdown code blocks)
    let analysisResult;
    try {
      const jsonMatch = aiContent.match(/```(?:json)?\s*([\s\S]*?)```/) || [null, aiContent];
      const jsonString = jsonMatch[1].trim();
      analysisResult = JSON.parse(jsonString);
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      // Fallback: try parsing the entire content
      try {
        analysisResult = JSON.parse(aiContent);
      } catch {
        analysisResult = {
          summary: "Document analyzed but structured extraction failed. Raw analysis: " + aiContent.substring(0, 500),
          use_cases: []
        };
      }
    }

    // Store in database
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get or create a default dataset for document-based use cases
    let datasetId: string;
    const { data: existingDataset } = await supabase
      .from("datasets")
      .select("id")
      .eq("name", "Document Analysis")
      .single();

    if (existingDataset) {
      datasetId = existingDataset.id;
    } else {
      const { data: newDataset, error: datasetError } = await supabase
        .from("datasets")
        .insert({
          name: "Document Analysis",
          file_name: "document-uploads",
          description: "Use cases extracted from uploaded documents",
          status: "completed",
          row_count: 0,
        })
        .select()
        .single();

      if (datasetError) {
        console.error("Dataset creation error:", datasetError);
        throw datasetError;
      }
      datasetId = newDataset.id;
    }

    const { data: docAnalysis, error: insertError } = await supabase
      .from("document_analyses")
      .insert({
        file_name: fileName,
        file_type: fileType,
        content_summary: analysisResult.summary,
        use_cases: analysisResult.use_cases,
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      throw insertError;
    }

    console.log(`Document analysis saved with ID: ${docAnalysis.id}`);

    // Insert use cases into automation_use_cases table
    if (analysisResult.use_cases && analysisResult.use_cases.length > 0) {
      const useCasesToInsert = analysisResult.use_cases.map((uc: any) => {
        // Map AI type to database type
        let dbType = "Workflow";
        if (uc.type?.toLowerCase().includes("rpa")) dbType = "RPA";
        else if (uc.type?.toLowerCase().includes("rule")) dbType = "Rule";
        else if (uc.type?.toLowerCase().includes("ai") || uc.type?.toLowerCase().includes("agent")) dbType = "AI Agent";

        return {
          dataset_id: datasetId,
          name: uc.name || "Unnamed Use Case",
          description: uc.description || uc.reasoning || "",
          type: dbType,
          complexity: uc.complexity || "Medium",
          confidence_score: uc.confidence || 0.7,
          affected_activities: uc.affected_activities || [],
          suggested_approach: uc.suggested_approach || "",
          pattern_type: "Document Analysis",
          monthly_volume: 100, // Default estimate
          estimated_time_saved: uc.estimated_time_saved_minutes || 30,
          estimated_cost_impact: (uc.estimated_time_saved_minutes || 30) * 100 * 0.5, // Rough cost calculation
          priority_score: Math.round((uc.confidence || 0.7) * 100),
          status: "new",
        };
      });

      const { error: useCaseError } = await supabase
        .from("automation_use_cases")
        .insert(useCasesToInsert);

      if (useCaseError) {
        console.error("Use case insert error:", useCaseError);
        // Don't throw - document was saved, just log the error
      } else {
        console.log(`Inserted ${useCasesToInsert.length} use cases`);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        analysis: docAnalysis,
        useCasesCount: analysisResult.use_cases?.length || 0
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error analyzing document:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
