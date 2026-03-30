-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.apiaries (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name character varying NOT NULL UNIQUE,
  location text,
  swarm smallint NOT NULL,
  honey_super smallint NOT NULL,
  image_link text,
  user_id uuid DEFAULT gen_random_uuid(),
  CONSTRAINT apiaries_pkey PRIMARY KEY (id),
  CONSTRAINT apiaries_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.expense_categories (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name character varying NOT NULL,
  user_id uuid DEFAULT gen_random_uuid(),
  CONSTRAINT expense_categories_pkey PRIMARY KEY (id),
  CONSTRAINT expense_categories_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  value real NOT NULL,
  date timestamp with time zone NOT NULL DEFAULT now(),
  description text,
  category_id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  CONSTRAINT expenses_pkey PRIMARY KEY (id),
  CONSTRAINT ex_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.expense_categories(id),
  CONSTRAINT expenses_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  name character varying,
  email character varying,
  password text,
  CONSTRAINT users_pkey PRIMARY KEY (id)
);
CREATE TABLE public.visits (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  apiary_id uuid NOT NULL DEFAULT gen_random_uuid(),
  date timestamp with time zone NOT NULL DEFAULT now(),
  new_swarm smallint DEFAULT '0'::smallint,
  new_honey_super smallint DEFAULT '0'::smallint,
  removed_swarm smallint DEFAULT '0'::smallint,
  removed_honey_super smallint DEFAULT '0'::smallint,
  user_id uuid,
  CONSTRAINT visits_pkey PRIMARY KEY (id),
  CONSTRAINT visits_apiary_id_fkey FOREIGN KEY (apiary_id) REFERENCES public.apiaries(id),
  CONSTRAINT visits_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);