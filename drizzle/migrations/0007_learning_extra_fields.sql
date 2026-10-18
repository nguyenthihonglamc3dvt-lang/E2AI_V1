ALTER TABLE public.learning_resources ADD COLUMN part_of_speech text, ADD COLUMN function_label text;
ALTER TABLE public.learning_topics ADD COLUMN practice_category text;
ALTER TABLE public.learning_progress ADD COLUMN status text NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','learning','learned'));