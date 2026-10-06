CREATE TABLE public.inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  title text NOT NULL DEFAULT 'New inspection',
  subject_reference text,
  subject_name text,
  record_reference text,
  procedure_name text,
  transcript jsonb NOT NULL DEFAULT '[]'::jsonb,
  history jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist jsonb NOT NULL DEFAULT '[]'::jsonb,
  ready boolean NOT NULL DEFAULT false,
  summary text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own inspections" ON public.inspections FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE public.inspection_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inspection_id uuid NOT NULL REFERENCES public.inspections(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  storage_path text NOT NULL,
  filename text NOT NULL,
  mime_type text NOT NULL,
  size_bytes integer NOT NULL,
  assessment text,
  assessment_status text NOT NULL DEFAULT 'pending',
  upload_status text NOT NULL DEFAULT 'not_submitted',
  upload_error text,
  cairn_candidate_id text,
  proposed_step_id text,
  proposed_slot_id text,
  placement text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspection_photos TO authenticated;
GRANT ALL ON public.inspection_photos TO service_role;
ALTER TABLE public.inspection_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own photos" ON public.inspection_photos FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER t_insp_upd BEFORE UPDATE ON public.inspections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER t_photo_upd BEFORE UPDATE ON public.inspection_photos FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "own photo files select" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'scout-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own photo files insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'scout-photos' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "own photo files delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'scout-photos' AND (storage.foldername(name))[1] = auth.uid()::text);