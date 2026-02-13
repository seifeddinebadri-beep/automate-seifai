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
    const { datasetId, processContext } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch use cases without AI analysis
    const { data: useCases } = await supabase
      .from("automation_use_cases")
      .select("*")
      .eq("dataset_id", datasetId)
      .is("ai_explanation", null);

    if (!useCases || useCases.length === 0) {
      return new Response(JSON.stringify({ message: "No use cases to classify" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Classifying ${useCases.length} use cases`);

    for (const uc of useCases) {
      let contextBlock = "";
      if (processContext) {
        const parts: string[] = [];
        if (processContext.processName) parts.push(`Process: ${processContext.processName}`);
        if (processContext.businessUnit) parts.push(`Department: ${processContext.businessUnit}`);
        if (processContext.businessObjective) parts.push(`Objective: ${processContext.businessObjective}`);
        if (processContext.processFrequency) parts.push(`Frequency: ${processContext.processFrequency}`);
        if (processContext.processCriticality) parts.push(`Criticality: ${processContext.processCriticality}`);
        if (processContext.tools?.length > 0) {
          parts.push(`Tools: ${processContext.tools.map((t: any) => `${t.name} (${t.purpose})`).join(", ")}`);
        }
        if (processContext.additionalDetails) parts.push(`Additional context: ${processContext.additionalDetails}`);
        if (processContext.knownPainPoints) parts.push(`Pain points: ${processContext.knownPainPoints}`);
        contextBlock = `\n\nBusiness Context:\n${parts.join("\n")}`;
      }

      const prompt = `Analyze this automation opportunity and provide classification and explanation:

Activity: ${uc.affected_activities.join(", ")}
Pattern: ${uc.pattern_type}
Monthly Volume: ${uc.monthly_volume}
Suggested Type: ${uc.type}
Complexity: ${uc.complexity}${contextBlock}

Respond in JSON format:
{
  "classification": "one of: Fully Automatable, Semi-Automatable, Rule-Based, Manual Required",
  "explanation": "2-3 sentence explanation of why this is automatable and what approach works best",
  "suggested_approach": "brief implementation recommendation"
}`;

      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: "You are an automation expert. Analyze process activities and provide actionable automation recommendations. Always respond with valid JSON." },
              { role: "user", content: prompt },
            ],
          }),
        });

        if (response.ok) {
          const data = await response.json();
          const content = data.choices?.[0]?.message?.content || "";
          
          // Parse JSON from response
          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            await supabase
              .from("automation_use_cases")
              .update({
                ai_classification: parsed.classification,
                ai_explanation: parsed.explanation,
                suggested_approach: parsed.suggested_approach,
              })
              .eq("id", uc.id);
          }
        }
      } catch (e) {
        console.error(`Error classifying ${uc.id}:`, e);
      }
    }

    return new Response(JSON.stringify({ success: true, classified: useCases.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Classification error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
