CREATE TABLE public.learning_topics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL UNIQUE,
  title_vi text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_topics TO authenticated;
GRANT ALL ON public.learning_topics TO service_role;
ALTER TABLE public.learning_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "signed in reads topics" ON public.learning_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "teachers manage topics" ON public.learning_topics FOR ALL TO authenticated USING (public.has_role(auth.uid(),'teacher')) WITH CHECK (public.has_role(auth.uid(),'teacher'));

CREATE TABLE public.learning_resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id uuid NOT NULL REFERENCES public.learning_topics(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN ('vocabulary','structure','pattern','idea')),
  level text NOT NULL DEFAULT 'A2' CHECK (level IN ('A1','A2','B1','B2')),
  title text NOT NULL,
  meaning text,
  example text,
  notes text,
  published boolean NOT NULL DEFAULT false,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX learning_resources_topic_idx ON public.learning_resources(topic_id);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_resources TO authenticated;
GRANT ALL ON public.learning_resources TO service_role;
ALTER TABLE public.learning_resources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read published or teacher" ON public.learning_resources FOR SELECT TO authenticated USING (published OR public.has_role(auth.uid(),'teacher'));
CREATE POLICY "teachers manage resources" ON public.learning_resources FOR ALL TO authenticated USING (public.has_role(auth.uid(),'teacher')) WITH CHECK (public.has_role(auth.uid(),'teacher'));

CREATE TABLE public.learning_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  resource_id uuid NOT NULL REFERENCES public.learning_resources(id) ON DELETE CASCADE,
  favorite boolean NOT NULL DEFAULT false,
  learned boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, resource_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.learning_progress TO authenticated;
GRANT ALL ON public.learning_progress TO service_role;
ALTER TABLE public.learning_progress ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own progress" ON public.learning_progress FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "teacher reads progress" ON public.learning_progress FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'teacher'));