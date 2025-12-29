-- Create storage bucket for video uploads
INSERT INTO storage.buckets (id, name, public)
VALUES ('videos', 'videos', true)
ON CONFLICT (id) DO NOTHING;

-- Create RLS policies for video bucket
CREATE POLICY "Anyone can view videos"
ON storage.objects FOR SELECT
USING (bucket_id = 'videos');

CREATE POLICY "Anyone can upload videos"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'videos');

CREATE POLICY "Anyone can delete videos"
ON storage.objects FOR DELETE
USING (bucket_id = 'videos');

-- Create table for document-based use cases
CREATE TABLE IF NOT EXISTS public.document_analyses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  content_summary TEXT,
  use_cases JSONB,
  video_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.document_analyses ENABLE ROW LEVEL SECURITY;

-- RLS policies for document_analyses
CREATE POLICY "Allow public read on document_analyses"
ON public.document_analyses FOR SELECT
USING (true);

CREATE POLICY "Allow public insert on document_analyses"
ON public.document_analyses FOR INSERT
WITH CHECK (true);

CREATE POLICY "Allow public update on document_analyses"
ON public.document_analyses FOR UPDATE
USING (true);

CREATE POLICY "Allow public delete on document_analyses"
ON public.document_analyses FOR DELETE
USING (true);

-- Add timestamp trigger using existing function
CREATE TRIGGER update_document_analyses_updated_at
BEFORE UPDATE ON public.document_analyses
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();