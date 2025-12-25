-- Create datasets table to store uploaded file metadata
CREATE TABLE public.datasets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  row_count INTEGER DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create process_events table for raw process data
CREATE TABLE public.process_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  case_id TEXT NOT NULL,
  activity TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
  user_role TEXT,
  system TEXT,
  duration INTEGER, -- in seconds
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create activity_metrics table for computed metrics
CREATE TABLE public.activity_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  activity TEXT NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 0,
  avg_duration NUMERIC(10,2),
  max_duration INTEGER,
  min_duration INTEGER,
  std_deviation NUMERIC(10,2),
  repetition_rate NUMERIC(5,2), -- percentage of cases with repeated activity
  rework_count INTEGER DEFAULT 0,
  avg_waiting_time INTEGER, -- seconds before this activity starts
  unique_cases INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(dataset_id, activity)
);

-- Create automation_use_cases table for detected opportunities
CREATE TABLE public.automation_use_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  dataset_id UUID NOT NULL REFERENCES public.datasets(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  type TEXT NOT NULL CHECK (type IN ('RPA', 'Workflow', 'Rule', 'AI Agent')),
  affected_activities TEXT[] NOT NULL,
  pattern_type TEXT NOT NULL, -- e.g., 'high_frequency_low_variance', 'rework_loop', etc.
  monthly_volume INTEGER NOT NULL DEFAULT 0,
  estimated_time_saved INTEGER NOT NULL DEFAULT 0, -- minutes per month
  estimated_cost_impact NUMERIC(12,2) DEFAULT 0,
  complexity TEXT NOT NULL CHECK (complexity IN ('Low', 'Medium', 'High')),
  confidence_score NUMERIC(3,2) NOT NULL DEFAULT 0.5, -- 0.00 to 1.00
  priority_score NUMERIC(10,2) DEFAULT 0,
  ai_classification TEXT, -- 'Manual', 'Rule-based', 'Semi-automatable', 'Not automatable'
  ai_explanation TEXT, -- Natural language explanation from AI
  suggested_approach TEXT,
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'approved', 'rejected', 'in_progress', 'completed')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_settings table for ROI assumptions
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert default ROI settings
INSERT INTO public.user_settings (setting_key, setting_value) VALUES
  ('cost_per_hour', '{"value": 50, "currency": "USD"}'::jsonb),
  ('volume_threshold', '{"min": 100, "unit": "per_month"}'::jsonb),
  ('time_saved_threshold', '{"min": 5, "unit": "minutes"}'::jsonb),
  ('complexity_weights', '{"Low": 1, "Medium": 2, "High": 3}'::jsonb);

-- Create indexes for performance
CREATE INDEX idx_process_events_dataset ON public.process_events(dataset_id);
CREATE INDEX idx_process_events_case ON public.process_events(case_id);
CREATE INDEX idx_process_events_activity ON public.process_events(activity);
CREATE INDEX idx_activity_metrics_dataset ON public.activity_metrics(dataset_id);
CREATE INDEX idx_automation_use_cases_dataset ON public.automation_use_cases(dataset_id);
CREATE INDEX idx_automation_use_cases_type ON public.automation_use_cases(type);
CREATE INDEX idx_automation_use_cases_priority ON public.automation_use_cases(priority_score DESC);

-- Enable RLS on all tables (public access for MVP, no auth required)
ALTER TABLE public.datasets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.process_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_use_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Create public access policies (MVP without auth)
CREATE POLICY "Allow public read access on datasets" ON public.datasets FOR SELECT USING (true);
CREATE POLICY "Allow public insert on datasets" ON public.datasets FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on datasets" ON public.datasets FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on datasets" ON public.datasets FOR DELETE USING (true);

CREATE POLICY "Allow public read access on process_events" ON public.process_events FOR SELECT USING (true);
CREATE POLICY "Allow public insert on process_events" ON public.process_events FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public delete on process_events" ON public.process_events FOR DELETE USING (true);

CREATE POLICY "Allow public read access on activity_metrics" ON public.activity_metrics FOR SELECT USING (true);
CREATE POLICY "Allow public insert on activity_metrics" ON public.activity_metrics FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on activity_metrics" ON public.activity_metrics FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on activity_metrics" ON public.activity_metrics FOR DELETE USING (true);

CREATE POLICY "Allow public read access on automation_use_cases" ON public.automation_use_cases FOR SELECT USING (true);
CREATE POLICY "Allow public insert on automation_use_cases" ON public.automation_use_cases FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update on automation_use_cases" ON public.automation_use_cases FOR UPDATE USING (true);
CREATE POLICY "Allow public delete on automation_use_cases" ON public.automation_use_cases FOR DELETE USING (true);

CREATE POLICY "Allow public read access on user_settings" ON public.user_settings FOR SELECT USING (true);
CREATE POLICY "Allow public update on user_settings" ON public.user_settings FOR UPDATE USING (true);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_datasets_updated_at
  BEFORE UPDATE ON public.datasets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_activity_metrics_updated_at
  BEFORE UPDATE ON public.activity_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automation_use_cases_updated_at
  BEFORE UPDATE ON public.automation_use_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
  BEFORE UPDATE ON public.user_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();