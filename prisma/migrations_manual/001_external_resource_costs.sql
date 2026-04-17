-- Migration: external resource call logs, pricing and cost views
-- Apply to local DB: psql -U postgres -d vitelis_local -f prisma/migrations_manual/001_external_resource_costs.sql

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS public.external_resource_call_logs (
  id                   bigint                   NOT NULL DEFAULT nextval('external_resource_call_logs_id_seq'::regclass),
  report_id            integer,
  company_id           integer,
  step_id              bigint,
  execution_id         character varying(20),
  node_name            character varying(150),
  task                 character varying(50)    NOT NULL,
  provider             character varying(50)    NOT NULL,
  model                character varying(100)   NOT NULL,
  prompt_tokens        integer                  NOT NULL DEFAULT 0,
  completion_tokens    integer                  NOT NULL DEFAULT 0,
  is_success           boolean                  NOT NULL DEFAULT true,
  error_message        text,
  duration_ms          integer,
  external_request_id  character varying(100),
  metadata             jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamp with time zone NOT NULL DEFAULT now(),
  resource_units_count integer                  NOT NULL DEFAULT 0,
  CONSTRAINT external_resource_call_logs_pkey PRIMARY KEY (id),
  CONSTRAINT external_resource_call_logs_completion_tokens_check CHECK (completion_tokens >= 0),
  CONSTRAINT external_resource_call_logs_duration_ms_check CHECK (duration_ms IS NULL OR duration_ms >= 0),
  CONSTRAINT external_resource_call_logs_prompt_tokens_check CHECK (prompt_tokens >= 0),
  CONSTRAINT external_resource_call_logs_resource_units_count_check CHECK (resource_units_count >= 0)
);

CREATE SEQUENCE IF NOT EXISTS external_resource_call_logs_id_seq
  START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE external_resource_call_logs_id_seq OWNED BY external_resource_call_logs.id;

-- ----

CREATE TABLE IF NOT EXISTS public.external_resource_pricing (
  id                   bigint                   NOT NULL DEFAULT nextval('external_resource_pricing_id_seq'::regclass),
  provider             character varying(50)    NOT NULL,
  model                character varying(100)   NOT NULL,
  input_price          numeric(18,8)            NOT NULL DEFAULT 0,
  input_tokens_count   integer                  NOT NULL,
  output_price         numeric(18,8)            NOT NULL DEFAULT 0,
  output_tokens_count  integer                  NOT NULL,
  valid_from           timestamp with time zone NOT NULL DEFAULT now(),
  valid_to             timestamp with time zone,
  is_active            boolean                  NOT NULL DEFAULT true,
  metadata             jsonb                    NOT NULL DEFAULT '{}'::jsonb,
  created_at           timestamp with time zone NOT NULL DEFAULT now(),
  mcp_call_price       numeric(18,8)            NOT NULL DEFAULT 0,
  mcp_calls_count      integer                  NOT NULL DEFAULT 1,
  CONSTRAINT external_resource_pricing_pkey PRIMARY KEY (id),
  CONSTRAINT external_resource_pricing_input_price_check CHECK (input_price >= 0),
  CONSTRAINT external_resource_pricing_input_tokens_count_check CHECK (
    input_price = 0 AND input_tokens_count >= 0
    OR input_price > 0 AND input_tokens_count > 0
  ),
  CONSTRAINT external_resource_pricing_mcp_call_price_check CHECK (mcp_call_price >= 0),
  CONSTRAINT external_resource_pricing_mcp_calls_count_check CHECK (mcp_calls_count > 0),
  CONSTRAINT external_resource_pricing_output_price_check CHECK (output_price >= 0),
  CONSTRAINT external_resource_pricing_output_tokens_count_check CHECK (
    output_price = 0 AND output_tokens_count >= 0
    OR output_price > 0 AND output_tokens_count > 0
  )
);

CREATE SEQUENCE IF NOT EXISTS external_resource_pricing_id_seq
  START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE external_resource_pricing_id_seq OWNED BY external_resource_pricing.id;

-- ============================================================
-- Views
-- ============================================================

CREATE OR REPLACE VIEW public.v_external_resource_costs_by_report_company_step_task AS
WITH priced_logs AS (
  SELECT
    l.id,
    l.report_id,
    l.company_id,
    l.step_id,
    l.task,
    l.provider,
    l.model,
    l.prompt_tokens,
    l.completion_tokens,
    l.resource_units_count,
    l.created_at,
    p.id AS pricing_id,
    p.input_price,
    p.input_tokens_count,
    p.output_price,
    p.output_tokens_count,
    p.mcp_call_price,
    p.mcp_calls_count,
    CASE
      WHEN p.id IS NOT NULL AND p.input_price > 0 AND p.input_tokens_count > 0 AND l.prompt_tokens > 0
        THEN l.prompt_tokens::numeric / p.input_tokens_count::numeric * p.input_price
      ELSE 0::numeric
    END AS input_cost,
    CASE
      WHEN p.id IS NOT NULL AND p.output_price > 0 AND p.output_tokens_count > 0 AND l.completion_tokens > 0
        THEN l.completion_tokens::numeric / p.output_tokens_count::numeric * p.output_price
      ELSE 0::numeric
    END AS output_cost,
    CASE
      WHEN p.id IS NOT NULL AND p.mcp_call_price > 0 AND p.mcp_calls_count > 0 AND l.resource_units_count > 0
        THEN l.resource_units_count::numeric / p.mcp_calls_count::numeric * p.mcp_call_price
      ELSE 0::numeric
    END AS mcp_cost,
    CASE
      WHEN l.prompt_tokens > 0       AND NOT (p.id IS NOT NULL AND p.input_price > 0     AND p.input_tokens_count > 0) THEN true
      WHEN l.completion_tokens > 0   AND NOT (p.id IS NOT NULL AND p.output_price > 0    AND p.output_tokens_count > 0) THEN true
      WHEN l.resource_units_count > 0 AND NOT (p.id IS NOT NULL AND p.mcp_call_price > 0  AND p.mcp_calls_count > 0)   THEN true
      ELSE false
    END AS missing_pricing
  FROM external_resource_call_logs l
  LEFT JOIN LATERAL (
    SELECT p_1.id, p_1.provider, p_1.model,
           p_1.input_price, p_1.input_tokens_count,
           p_1.output_price, p_1.output_tokens_count,
           p_1.valid_from, p_1.valid_to, p_1.is_active, p_1.metadata, p_1.created_at,
           p_1.mcp_call_price, p_1.mcp_calls_count
    FROM external_resource_pricing p_1
    WHERE p_1.provider::text = l.provider::text
      AND p_1.model::text = l.model::text
      AND p_1.is_active = true
      AND p_1.valid_from <= l.created_at
      AND (p_1.valid_to IS NULL OR p_1.valid_to > l.created_at)
    ORDER BY p_1.valid_from DESC, p_1.id DESC
    LIMIT 1
  ) p ON true
)
SELECT
  report_id,
  company_id,
  step_id,
  task,
  count(*)                               AS calls_count,
  count(*) FILTER (WHERE missing_pricing) AS calls_without_pricing,
  sum(prompt_tokens)                     AS prompt_tokens,
  sum(completion_tokens)                 AS completion_tokens,
  sum(resource_units_count)              AS resource_units_count,
  sum(input_cost)                        AS input_cost,
  sum(output_cost)                       AS output_cost,
  sum(mcp_cost)                          AS mcp_cost,
  sum(input_cost + output_cost + mcp_cost) AS total_cost,
  min(created_at)                        AS first_call_at,
  max(created_at)                        AS last_call_at
FROM priced_logs
GROUP BY report_id, company_id, step_id, task;

-- ----

CREATE OR REPLACE VIEW public.v_report_cost_by_step AS
SELECT
  v.report_id,
  v.step_id,
  rs.step_order,
  rgs.name                              AS step_name,
  rss.status                            AS step_status,
  count(DISTINCT v.company_id)          AS companies_count,
  count(DISTINCT v.task)                AS tasks_count,
  sum(v.calls_count)                    AS total_calls,
  sum(v.calls_without_pricing)          AS calls_without_pricing,
  sum(v.prompt_tokens)                  AS input_tokens,
  sum(v.completion_tokens)              AS output_tokens,
  sum(v.prompt_tokens + v.completion_tokens) AS total_tokens,
  sum(v.resource_units_count)           AS total_resource_units,
  round(sum(v.input_cost), 6)           AS input_cost,
  round(sum(v.output_cost), 6)          AS output_cost,
  round(sum(v.mcp_cost), 6)             AS mcp_cost,
  round(sum(v.total_cost), 6)           AS total_cost,
  min(v.first_call_at)                  AS started_at,
  max(v.last_call_at)                   AS finished_at,
  round(EXTRACT(EPOCH FROM max(v.last_call_at) - min(v.first_call_at)), 1) AS duration_sec
FROM v_external_resource_costs_by_report_company_step_task v
JOIN report_steps rs
  ON rs.step_id = v.step_id AND rs.report_id = v.report_id
LEFT JOIN report_generation_steps rgs
  ON rgs.id = v.step_id
LEFT JOIN report_step_statuses rss
  ON rss.step_id = v.step_id AND rss.report_id = v.report_id AND rss.company_id IS NULL
GROUP BY v.report_id, v.step_id, rs.step_order, rgs.name, rss.status;

-- ----

CREATE OR REPLACE VIEW public.v_report_cost_by_step_task AS
SELECT
  l.report_id,
  l.step_id,
  l.task,
  l.provider,
  l.model,
  count(*)                                                          AS total_calls,
  sum(CASE WHEN NOT l.is_success THEN 1 ELSE 0 END)                AS error_count,
  count(DISTINCT l.company_id)                                     AS companies_count,
  sum(l.prompt_tokens)                                             AS input_tokens,
  sum(l.completion_tokens)                                         AS output_tokens,
  sum(l.prompt_tokens + l.completion_tokens)                       AS total_tokens,
  sum(l.resource_units_count)                                      AS total_resource_units,
  round(avg(l.duration_ms), 0)                                     AS avg_duration_ms,
  round(
    CASE WHEN p.input_price > 0 AND p.input_tokens_count > 0
      THEN sum(l.prompt_tokens)::numeric / p.input_tokens_count::numeric * p.input_price
      ELSE 0 END, 6)                                               AS input_cost,
  round(
    CASE WHEN p.output_price > 0 AND p.output_tokens_count > 0
      THEN sum(l.completion_tokens)::numeric / p.output_tokens_count::numeric * p.output_price
      ELSE 0 END, 6)                                              AS output_cost,
  round(
    CASE WHEN p.mcp_call_price > 0 AND p.mcp_calls_count > 0
      THEN sum(l.resource_units_count)::numeric / p.mcp_calls_count::numeric * p.mcp_call_price
      ELSE 0 END, 6)                                              AS mcp_cost,
  round(
    CASE WHEN p.input_price > 0 AND p.input_tokens_count > 0
      THEN sum(l.prompt_tokens)::numeric / p.input_tokens_count::numeric * p.input_price
      ELSE 0 END
    + CASE WHEN p.output_price > 0 AND p.output_tokens_count > 0
      THEN sum(l.completion_tokens)::numeric / p.output_tokens_count::numeric * p.output_price
      ELSE 0 END
    + CASE WHEN p.mcp_call_price > 0 AND p.mcp_calls_count > 0
      THEN sum(l.resource_units_count)::numeric / p.mcp_calls_count::numeric * p.mcp_call_price
      ELSE 0 END, 6)                                              AS total_cost,
  sum(
    CASE
      WHEN l.prompt_tokens > 0       AND NOT (p.input_price > 0    AND p.input_tokens_count > 0)  THEN 1
      WHEN l.completion_tokens > 0   AND NOT (p.output_price > 0   AND p.output_tokens_count > 0) THEN 1
      WHEN l.resource_units_count > 0 AND NOT (p.mcp_call_price > 0 AND p.mcp_calls_count > 0)    THEN 1
      ELSE 0
    END)                                                           AS calls_without_pricing,
  min(l.created_at)                                                AS first_call_at,
  max(l.created_at)                                                AS last_call_at
FROM external_resource_call_logs l
LEFT JOIN LATERAL (
  SELECT p_1.id, p_1.provider, p_1.model,
         p_1.input_price, p_1.input_tokens_count,
         p_1.output_price, p_1.output_tokens_count,
         p_1.valid_from, p_1.valid_to, p_1.is_active, p_1.metadata, p_1.created_at,
         p_1.mcp_call_price, p_1.mcp_calls_count
  FROM external_resource_pricing p_1
  WHERE p_1.provider::text = l.provider::text
    AND p_1.model::text = l.model::text
    AND p_1.is_active = true
    AND p_1.valid_from <= l.created_at
    AND (p_1.valid_to IS NULL OR p_1.valid_to > l.created_at)
  ORDER BY p_1.valid_from DESC, p_1.id DESC
  LIMIT 1
) p ON true
GROUP BY l.report_id, l.step_id, l.task, l.provider, l.model,
         p.input_price, p.input_tokens_count,
         p.output_price, p.output_tokens_count,
         p.mcp_call_price, p.mcp_calls_count;
