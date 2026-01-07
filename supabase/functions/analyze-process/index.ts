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
    const { datasetId, sourceFileName } = await req.json();
    console.log("Starting analysis for dataset:", datasetId, "source:", sourceFileName);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch all events for this dataset
    const { data: events, error: eventsError } = await supabase
      .from("process_events")
      .select("*")
      .eq("dataset_id", datasetId);

    if (eventsError) throw eventsError;
    if (!events || events.length === 0) {
      return new Response(JSON.stringify({ error: "No events found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Processing ${events.length} events`);

    // Group by activity
    const activityGroups: Record<string, typeof events> = {};
    events.forEach((e) => {
      if (!activityGroups[e.activity]) activityGroups[e.activity] = [];
      activityGroups[e.activity].push(e);
    });

    // Calculate metrics per activity
    const metrics = Object.entries(activityGroups).map(([activity, actEvents]) => {
      const durations = actEvents.map((e) => e.duration).filter((d) => d != null) as number[];
      const avgDuration = durations.length > 0 ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
      const maxDuration = durations.length > 0 ? Math.max(...durations) : null;
      const minDuration = durations.length > 0 ? Math.min(...durations) : null;
      
      // Std deviation
      let stdDev = null;
      if (durations.length > 1 && avgDuration) {
        const variance = durations.reduce((sum, d) => sum + Math.pow(d - avgDuration, 2), 0) / durations.length;
        stdDev = Math.sqrt(variance);
      }

      // Unique cases
      const uniqueCases = new Set(actEvents.map((e) => e.case_id)).size;

      // Rework detection (same activity repeated in same case)
      const caseActivityCounts: Record<string, number> = {};
      actEvents.forEach((e) => {
        caseActivityCounts[e.case_id] = (caseActivityCounts[e.case_id] || 0) + 1;
      });
      const reworkCount = Object.values(caseActivityCounts).filter((c) => c > 1).length;

      return {
        dataset_id: datasetId,
        activity,
        frequency: actEvents.length,
        avg_duration: avgDuration ? Math.round(avgDuration * 100) / 100 : null,
        max_duration: maxDuration,
        min_duration: minDuration,
        std_deviation: stdDev ? Math.round(stdDev * 100) / 100 : null,
        repetition_rate: uniqueCases > 0 ? Math.round((reworkCount / uniqueCases) * 100) : 0,
        rework_count: reworkCount,
        avg_waiting_time: null, // Would need sequence analysis
        unique_cases: uniqueCases,
      };
    });

    // Upsert metrics
    const { error: metricsError } = await supabase.from("activity_metrics").upsert(metrics, {
      onConflict: "dataset_id,activity",
    });
    if (metricsError) throw metricsError;

    console.log(`Saved ${metrics.length} activity metrics`);

    // Detect automation patterns
    const useCases: any[] = [];
    const costPerHour = 50;

    metrics.forEach((m) => {
      // Pattern 1: High frequency + low variance (RPA candidate)
      if (m.frequency > 100 && m.std_deviation !== null && m.std_deviation < 30) {
        const hoursSaved = ((m.avg_duration || 60) * m.frequency) / 3600;
        useCases.push({
          dataset_id: datasetId,
          name: `Automate "${m.activity}"`,
          description: `High-frequency activity with consistent execution time, ideal for RPA.`,
          type: "RPA",
          affected_activities: [m.activity],
          pattern_type: "high_frequency_low_variance",
          monthly_volume: m.frequency,
          estimated_time_saved: Math.round(hoursSaved * 60),
          estimated_cost_impact: Math.round(hoursSaved * costPerHour * 0.8),
          complexity: m.std_deviation < 10 ? "Low" : "Medium",
          confidence_score: Math.min(0.95, 0.6 + (m.frequency / 1000)),
          priority_score: 0,
          source: sourceFileName || null,
        });
      }

      // Pattern 2: Rework loops (validation automation)
      if (m.rework_count > 10) {
        const hoursSaved = (m.rework_count * (m.avg_duration || 120)) / 3600;
        useCases.push({
          dataset_id: datasetId,
          name: `Reduce rework in "${m.activity}"`,
          description: `Frequent rework indicates validation or error correction opportunities.`,
          type: "Rule",
          affected_activities: [m.activity],
          pattern_type: "rework_loop",
          monthly_volume: m.rework_count,
          estimated_time_saved: Math.round(hoursSaved * 60),
          estimated_cost_impact: Math.round(hoursSaved * costPerHour),
          complexity: "Medium",
          confidence_score: Math.min(0.85, 0.5 + (m.rework_count / 100)),
          priority_score: 0,
          source: sourceFileName || null,
        });
      }
    });

    // Calculate priority scores
    useCases.forEach((uc) => {
      const complexityWeight = uc.complexity === "Low" ? 1 : uc.complexity === "Medium" ? 2 : 3;
      uc.priority_score = Math.round(
        (uc.monthly_volume * (uc.estimated_time_saved / 60) * costPerHour) / complexityWeight
      );
    });

    let insertedUseCases: any[] = [];
    if (useCases.length > 0) {
      const { data: useCasesData, error: useCaseError } = await supabase
        .from("automation_use_cases")
        .insert(useCases)
        .select("id, name, type, complexity, confidence_score, estimated_time_saved");
      
      if (useCaseError) throw useCaseError;
      console.log(`Created ${useCases.length} use cases`);
      insertedUseCases = useCasesData || [];
      
      // Trigger AI classification
      try {
        await supabase.functions.invoke("classify-activities", { body: { datasetId } });
      } catch (e) {
        console.log("AI classification will run separately");
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      metrics: metrics.length, 
      useCasesCount: useCases.length,
      useCases: insertedUseCases,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    console.error("Analysis error:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
