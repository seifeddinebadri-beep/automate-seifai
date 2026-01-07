-- Add source column to track which file generated each use case
ALTER TABLE public.automation_use_cases 
ADD COLUMN source TEXT;