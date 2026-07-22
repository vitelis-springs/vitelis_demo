/*
Node/Task: Excel opportunity line items export with Stakeholders + Competitive / Incumbent Awareness + Quality Assessment
Type: Postgres query for Excel export
NOTE: Runtime uses the bundled copy in opps-query-sql.ts (required for Vercel).
      After editing this file, regenerate opps-query-sql.ts from it.
Purpose:
  Export final opportunity_candidates line items for one or more reports/research runs,
  including revalidated stakeholders, Competitive / incumbent awareness,
  and detailed Quality Assessment columns.
Inputs from n8n JSON:
  {
    "report_ids": [154],
    "company_ids": [2887, 2888, 2889],
    "research_run_ids": [310, 311, 312],
    "ranking_version": "motion_first_portfolio_refinement"
  }
Outputs:
  One row per opportunity_candidate_id for spreadsheet export.
Patch note:
  Added account-signal lineage and audit columns after Opportunity Title:
  - Seed ID: originating opportunity seed, when available.
  - Account Signals - Trigger Lineage: compact view of the signal path that led to the opportunity.
  - Signal-to-Product Evidence Basis: short bridge from account signal evidence to product/opportunity fit.
  - Account Signals - Audit Fact Count: number of source facts used for the lineage audit block.
  - Account Signals - Audit Facts: readable source-fact summaries; use to inspect why the signal is grounded.
  - Account Signals - Signal Confirmation Count: number of linked signal confirmations pulled into the audit.
  - Account Signals - Signal Confirmations: linked confirmation summaries with IDs, dates, sources, and snippets when available.
  Added stakeholder columns after Primary Buyer Persona:
  - Stakeholders - Count: number of stakeholder assignments for the opportunity.
  - Stakeholders: readable role, person, title, entity, and LinkedIn summary.
  - Stakeholders - Revalidation: selection rationale retained from the stakeholder revalidation flow.
  - Stakeholders - Missing Person Count: assignments whose person record is missing or incomplete.
  - Stakeholders - Email Count: stakeholders with a generated first-touch email.
  - Stakeholders cell now embeds each stakeholder's contact email addresses (email: from
    persons.contacts->emails) and the generated message (email_subject / email_body) from
    opportunity_stakeholder_messages, latest message per stakeholder when regenerated.
  Resilience patch (account signals):
  - Account Signals audit + confirmations now fall back to meta.trigger_signal_lineage when the
    originating seed_id is not present in opportunity_seed_signal_facts (observed for late/last
    seeds such as FM4 / FM04), so the audit block no longer goes blank for a valid candidate.
  - New column "Account Signals - Audit Source" reports whether a candidate's signals came from
    seed_fact, trigger_lineage, or both.
How to read:
  Use Trigger Lineage first to understand the opportunity's signal logic, then Evidence Basis
  to see the product-fit bridge. Use Audit Facts and Signal Confirmations for QA/debugging;
  empty counts mean no linked audit records were available for that candidate, not necessarily
  that the opportunity has no rationale.
  Stakeholders are aggregated into multiline cells so the export remains one row per opportunity.
Notes:
  - competitive_awareness is populated by [PE] Competitive / Incumbent Awareness Enrichment flow.
  - Quality Assessment is read from opportunity_candidates.meta.quality and opportunity_candidates.meta.diagnostics.
  - This query does not change any opportunity data.
*/
WITH params AS (
  SELECT
    ARRAY[{{REPORT_IDS}}]::integer[] AS report_ids,
    ARRAY[{{COMPANY_IDS}}]::integer[] AS company_ids,
    ARRAY[{{RESEARCH_RUN_IDS}}]::bigint[] AS research_run_ids,
    {{RANKING_VERSION}} AS ranking_version
),
resolved_runs AS (
  SELECT rr.*
  FROM public.research_runs rr
  CROSS JOIN params p
  WHERE (
      p.report_ids IS NULL
      OR cardinality(p.report_ids) = 0
      OR rr.report_id = ANY(p.report_ids)
    )
    AND (
      p.company_ids IS NULL
      OR cardinality(p.company_ids) = 0
      OR rr.company_id = ANY(p.company_ids)
    )
    AND (
      p.research_run_ids IS NULL
      OR cardinality(p.research_run_ids) = 0
      OR rr.id = ANY(p.research_run_ids)
    )
  ORDER BY
    rr.report_id,
    rr.company_id,
    rr.created_at DESC,
    rr.id DESC
),
candidate_source AS (
  SELECT
    oc.*,
    oc.meta::jsonb AS meta_json,
    COALESCE(oc.meta::jsonb->'quality', '{}'::jsonb) AS quality_json,
    COALESCE(oc.meta::jsonb->'diagnostics', '{}'::jsonb) AS diagnostics_json,
    COALESCE(oc.entity_attribution::jsonb, '{}'::jsonb) AS entity_attribution_json
  FROM resolved_runs rr
  CROSS JOIN params p
  JOIN public.opportunity_candidates oc
    ON oc.research_run_id = rr.id
   AND oc.company_id = rr.company_id
  WHERE (p.ranking_version IS NULL OR oc.ranking_version = p.ranking_version)
    AND COALESCE((oc.meta::jsonb->>'include_in_final_pack')::boolean, true) = true
    AND oc.is_approved = TRUE
),
base AS (
  SELECT
    oc.ranking_version AS version,
    oc.research_run_id,
    oc.company_id,
    oc.id AS opportunity_candidate_id,
    oc.is_selected_for_deep_dive AS is_selected,
    c.name AS account,
COALESCE(
  NULLIF(oc.entity_attribution_json->>'report_column_value', ''),
  NULLIF(oc.entity_attribution_json->>'primary_entity', ''),
  ''
) AS entity_attribution,
NULLIF(oc.entity_attribution_json->>'scope_classification', '') AS entity_scope_classification,
NULLIF(oc.entity_attribution_json->>'attribution_confidence', '')::numeric AS entity_attribution_confidence,
NULLIF(oc.entity_attribution_json->>'needs_human_review', '')::boolean AS entity_attribution_needs_human_review,
CASE
  WHEN jsonb_typeof(oc.entity_attribution_json->'secondary_entities') = 'array'
    THEN (
      SELECT string_agg(se.value, E'\n' ORDER BY se.ordinality)
      FROM jsonb_array_elements_text(oc.entity_attribution_json->'secondary_entities') WITH ORDINALITY AS se(value, ordinality)
    )
  ELSE ''
END AS entity_secondary_entities,
    COALESCE(scope_co.name, c.name) AS entity,
    oc.title AS opportunity_title,
    oc.rank_position,
    oc.portfolio_priority_score,
    oc.portfolio_priority_reason,
    COALESCE(oc.horizon ,'n/a') as horizon,
    COALESCE(oc.horizon_name,'n/a') as horizon_name,
    COALESCE(oc.horizon_confidence,0) as horizon_confidence,
    COALESCE(oc.horizon_reasoning,'n/a') as horizon_reasoning,
    COALESCE(oc.horizon_meta->>'indicative_deal_size_range','n/a') AS indicative_deal_size_range,
    oc.deal_size_general,
    oc.time_label_general,
    COALESCE(oc.delivery_type,'n/a') as delivery_type,
    oc.track_1_entity,
    COALESCE(oc.track_2_entities::text, '[]') AS track_2_entities,
    oc.why_now,
    oc.notes,
    NULLIF(oc.meta_json->>'seed_id', '') AS seed_id,
    CASE
      WHEN jsonb_typeof(oc.meta_json->'trigger_signal_lineage') = 'array'
        THEN oc.meta_json->'trigger_signal_lineage'
      ELSE '[]'::jsonb
    END AS trigger_signal_lineage_json,
    CASE
      WHEN jsonb_typeof(oc.meta_json->'trigger_signal_lineage') = 'array'
        THEN (
          SELECT string_agg(
            concat_ws(
              E'\n   ',
              concat(
                lpad(ts.ordinality::text, 2, '0'),
                ' | signal_definition_id=',
                COALESCE(ts.signal_item->>'signal_definition_id', ''),
                ' | ',
                COALESCE(ts.signal_item->>'signal_label', ''),
                ' | decision_role=',
                COALESCE(ts.signal_item->>'decision_role', ''),
                ' | lineage_role=',
                COALESCE(ts.signal_item->>'lineage_role', '')
              ),
              CASE
                WHEN NULLIF(ts.signal_item->>'supports', '') IS NOT NULL
                  THEN 'supports: ' || (ts.signal_item->>'supports')
                ELSE NULL
              END,
              CASE
                WHEN NULLIF(ts.signal_item->>'reason', '') IS NOT NULL
                  THEN 'reason: ' || (ts.signal_item->>'reason')
                ELSE NULL
              END
            ),
            E'\n'
            ORDER BY ts.ordinality
          )
          FROM jsonb_array_elements(oc.meta_json->'trigger_signal_lineage') WITH ORDINALITY AS ts(signal_item, ordinality)
        )
      ELSE ''
    END AS trigger_signal_lineage_summary,
    concat_ws(
      E'\n\n',
      CASE
        WHEN jsonb_typeof(oc.meta_json#>'{evidence_basis,confirmed_evidence}') = 'array'
          THEN 'confirmed_evidence:' || E'\n' || (
            SELECT string_agg(lpad(ce.ordinality::text, 2, '0') || ' | ' || ce.evidence, E'\n' ORDER BY ce.ordinality)
            FROM jsonb_array_elements_text(oc.meta_json#>'{evidence_basis,confirmed_evidence}') WITH ORDINALITY AS ce(evidence, ordinality)
          )
        ELSE NULL
      END,
      CASE
        WHEN jsonb_typeof(oc.meta_json#>'{evidence_basis,commercial_inference}') = 'array'
          THEN 'commercial_inference:' || E'\n' || (
            SELECT string_agg(lpad(ci.ordinality::text, 2, '0') || ' | ' || ci.inference, E'\n' ORDER BY ci.ordinality)
            FROM jsonb_array_elements_text(oc.meta_json#>'{evidence_basis,commercial_inference}') WITH ORDINALITY AS ci(inference, ordinality)
          )
        ELSE NULL
      END,
      CASE
        WHEN jsonb_typeof(oc.meta_json#>'{evidence_basis,product_fit_basis}') = 'array'
          THEN 'product_fit_basis:' || E'\n' || (
            SELECT string_agg(lpad(pfb.ordinality::text, 2, '0') || ' | ' || pfb.basis, E'\n' ORDER BY pfb.ordinality)
            FROM jsonb_array_elements_text(oc.meta_json#>'{evidence_basis,product_fit_basis}') WITH ORDINALITY AS pfb(basis, ordinality)
          )
        ELSE NULL
      END,
      CASE
        WHEN jsonb_typeof(oc.meta_json#>'{evidence_basis,evidence_limitations}') = 'array'
          THEN 'evidence_limitations:' || E'\n' || (
            SELECT string_agg(lpad(el.ordinality::text, 2, '0') || ' | ' || el.limitation, E'\n' ORDER BY el.ordinality)
            FROM jsonb_array_elements_text(oc.meta_json#>'{evidence_basis,evidence_limitations}') WITH ORDINALITY AS el(limitation, ordinality)
          )
        ELSE NULL
      END
    ) AS signal_to_product_evidence_basis,
    oc.primary_business_problem,
    oc.primary_buyer_persona,
    oc.primary_value_proposition,
    oc.solution_center,
    oc.competitive_awareness,
    CASE
      WHEN oc.competitive_awareness IS NULL THEN 'Not researched'
      WHEN NULLIF(BTRIM(oc.competitive_awareness->>'cell_text'), '') IS NULL THEN 'Not researched'
      ELSE BTRIM(oc.competitive_awareness->>'cell_text')
    END AS competitive_incumbent_awareness,
    COALESCE(NULLIF(oc.competitive_awareness->>'status', ''), 'not_researched') AS competitive_awareness_status,
    COALESCE(NULLIF(oc.competitive_awareness->>'seller_implication', ''), '') AS competitive_seller_implication,
    COALESCE(NULLIF(oc.competitive_awareness->>'applicability', ''), '') AS competitive_applicability,
    NULLIF(oc.competitive_awareness->>'confidence', '')::numeric AS competitive_confidence,
    CASE
      WHEN jsonb_typeof(oc.competitive_awareness->'vendors') = 'array'
        THEN (
          SELECT string_agg(
            concat_ws(
              ' | ',
              NULLIF(v.vendor->>'name', ''),
              NULLIF(v.vendor->>'role', ''),
              NULLIF(v.vendor->>'evidence_strength', '')
            ),
            E'\n'
            ORDER BY v.ordinality
          )
          FROM jsonb_array_elements(oc.competitive_awareness->'vendors') WITH ORDINALITY AS v(vendor, ordinality)
        )
      ELSE ''
    END AS competitive_vendors_summary,
    CASE
      WHEN jsonb_typeof(oc.competitive_awareness->'sources') = 'array'
        THEN (
          SELECT string_agg(
            concat_ws(
              E'\n   ',
              concat(lpad(s.ordinality::text, 2, '0'), ' | ', COALESCE(NULLIF(s.source->>'title', ''), '[untitled source]')),
              NULLIF(s.source->>'url', ''),
              CASE
                WHEN NULLIF(s.source->>'evidence_summary', '') IS NOT NULL
                  THEN 'evidence: ' || (s.source->>'evidence_summary')
                ELSE NULL
              END
            ),
            E'\n'
            ORDER BY s.ordinality
          )
          FROM jsonb_array_elements(oc.competitive_awareness->'sources') WITH ORDINALITY AS s(source, ordinality)
        )
      ELSE ''
    END AS competitive_sources_summary,
    CASE
      WHEN jsonb_typeof(oc.meta_json->'conditional_attach_candidates') = 'array'
        THEN oc.meta_json->'conditional_attach_candidates'
      ELSE '[]'::jsonb
    END AS conditional_attach_candidates,
    oc.quality_json,
    oc.diagnostics_json,
    concat_ws(
      E'\n',
      'Grounding: ' || COALESCE(oc.quality_json#>>'{grounding,grounding_status}', 'missing') || ' / ' || COALESCE(oc.quality_json#>>'{grounding,grounding_score}', 'n/a'),
      'Traceability: ' || COALESCE(oc.quality_json#>>'{traceability,traceability_status}', 'missing') || ' / ' || COALESCE(oc.quality_json#>>'{traceability,traceability_score}', 'n/a'),
      'Company Binding: ' || COALESCE(oc.quality_json#>>'{company_binding,company_binding_status}', 'missing') || ' / ' || COALESCE(oc.quality_json#>>'{company_binding,company_binding_score}', 'n/a'),
      'Customer Relevance: ' || COALESCE(oc.quality_json#>>'{customer_relevance,customer_relevance_status}', 'missing') || ' / ' || COALESCE(oc.quality_json#>>'{customer_relevance,customer_relevance_score}', 'n/a'),
      'Commercial Logic: ' || COALESCE(oc.quality_json#>>'{commercial_logic,commercial_logic_status}', 'missing') || ' / ' || COALESCE(oc.quality_json#>>'{commercial_logic,commercial_logic_score}', 'n/a')
    ) AS quality_assessment_summary,
    concat_ws(
      E'\n',
      'Grounding: ' || COALESCE(oc.quality_json#>>'{grounding,short_explanation}', oc.quality_json#>>'{grounding,reasoning}', ''),
      'Traceability: ' || COALESCE(oc.quality_json#>>'{traceability,short_explanation}', ''),
      'Company Binding: ' || COALESCE(oc.quality_json#>>'{company_binding,short_explanation}', ''),
      'Customer Relevance: ' || COALESCE(oc.quality_json#>>'{customer_relevance,short_explanation}', ''),
      'Commercial Logic: ' || COALESCE(oc.quality_json#>>'{commercial_logic,short_explanation}', '')
    ) AS quality_assessment_explanation,
    oc.quality_json#>>'{grounding,grounding_status}' AS grounding_status,
    NULLIF(oc.quality_json#>>'{grounding,grounding_score}', '')::numeric AS grounding_score,
    oc.quality_json#>>'{grounding,evidence_level}' AS grounding_evidence_level,
    NULLIF(oc.quality_json#>>'{grounding,deterministic_base_score}', '')::numeric AS grounding_deterministic_base_score,
    oc.quality_json#>>'{grounding,recommended_action}' AS grounding_recommended_action,
    oc.quality_json#>>'{grounding,claim_review,review_status}' AS grounding_claim_review_status,
    NULLIF(oc.quality_json#>>'{grounding,claim_review,claim_review_penalty}', '')::numeric AS grounding_claim_review_penalty,
    NULLIF(oc.quality_json#>>'{grounding,claim_review,claim_review_penalty_cap}', '')::numeric AS grounding_claim_review_penalty_cap,
    NULLIF(oc.diagnostics_json->>'unsupported_claim_count', '')::int AS grounding_unsupported_claim_count,
    NULLIF(oc.diagnostics_json->>'overstated_claim_count', '')::int AS grounding_overstated_claim_count,
    NULLIF(oc.diagnostics_json->>'grounding_warning_count', '')::int AS grounding_warning_count,
    oc.quality_json#>>'{grounding,reasoning}' AS grounding_reasoning,
    oc.quality_json#>>'{grounding,claim_review,short_reasoning}' AS grounding_claim_review_reasoning,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{grounding,grounding_warnings}') = 'array'
        THEN (
          SELECT string_agg(lpad(gw.ordinality::text, 2, '0') || ' | ' || gw.warning, E'\n' ORDER BY gw.ordinality)
          FROM jsonb_array_elements_text(oc.quality_json#>'{grounding,grounding_warnings}') WITH ORDINALITY AS gw(warning, ordinality)
        )
      ELSE ''
    END AS grounding_warnings_summary,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{grounding,supported_claims}') = 'array'
        THEN (
          SELECT string_agg(lpad(sc.ordinality::text, 2, '0') || ' | ' || sc.claim, E'\n' ORDER BY sc.ordinality)
          FROM jsonb_array_elements_text(oc.quality_json#>'{grounding,supported_claims}') WITH ORDINALITY AS sc(claim, ordinality)
        )
      ELSE ''
    END AS grounding_supported_claims_summary,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{grounding,inferred_claims}') = 'array'
        THEN (
          SELECT string_agg(lpad(ic.ordinality::text, 2, '0') || ' | ' || ic.claim, E'\n' ORDER BY ic.ordinality)
          FROM jsonb_array_elements_text(oc.quality_json#>'{grounding,inferred_claims}') WITH ORDINALITY AS ic(claim, ordinality)
        )
      ELSE ''
    END AS grounding_inferred_claims_summary,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{grounding,unsupported_claims}') = 'array'
        THEN (
          SELECT string_agg(lpad(uc.ordinality::text, 2, '0') || ' | ' || COALESCE(uc.claim::text, ''), E'\n' ORDER BY uc.ordinality)
          FROM jsonb_array_elements(oc.quality_json#>'{grounding,unsupported_claims}') WITH ORDINALITY AS uc(claim, ordinality)
        )
      ELSE ''
    END AS grounding_unsupported_claims_summary,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{grounding,overstated_claims}') = 'array'
        THEN (
          SELECT string_agg(lpad(oclaim.ordinality::text, 2, '0') || ' | ' || COALESCE(oclaim.claim::text, ''), E'\n' ORDER BY oclaim.ordinality)
          FROM jsonb_array_elements(oc.quality_json#>'{grounding,overstated_claims}') WITH ORDINALITY AS oclaim(claim, ordinality)
        )
      ELSE ''
    END AS grounding_overstated_claims_summary,
    oc.quality_json#>>'{traceability,traceability_status}' AS traceability_status,
    NULLIF(oc.quality_json#>>'{traceability,traceability_score}', '')::numeric AS traceability_score,
    oc.quality_json#>>'{traceability,url_traceability_status}' AS traceability_url_status,
    NULLIF(oc.quality_json#>>'{traceability,source_ref_summary,selected_source_ref_count}', '')::int AS traceability_selected_source_ref_count,
    NULLIF(oc.quality_json#>>'{traceability,source_ref_summary,selected_product_fit_source_count}', '')::int AS traceability_selected_product_fit_source_count,
    NULLIF(oc.quality_json#>>'{traceability,source_ref_summary,selected_signal_confirmation_source_count}', '')::int AS traceability_selected_signal_confirmation_source_count,
    NULLIF(oc.quality_json#>>'{traceability,source_ref_summary,available_product_fit_url_count}', '')::int AS traceability_available_product_fit_url_count,
    NULLIF(oc.quality_json#>>'{traceability,source_ref_summary,available_signal_confirmation_url_count}', '')::int AS traceability_available_signal_confirmation_url_count,
    NULLIF(oc.quality_json#>>'{traceability,component_scores,source_url_traceability}', '')::numeric AS traceability_source_url_score,
    NULLIF(oc.quality_json#>>'{traceability,component_scores,signal_traceability}', '')::numeric AS traceability_signal_score,
    NULLIF(oc.quality_json#>>'{traceability,component_scores,decision_traceability}', '')::numeric AS traceability_decision_score,
    NULLIF(oc.quality_json#>>'{traceability,component_scores,validation_traceability}', '')::numeric AS traceability_validation_score,
    NULLIF(oc.quality_json#>>'{traceability,component_scores,product_fit_traceability}', '')::numeric AS traceability_product_fit_score,
    NULLIF(oc.quality_json#>>'{traceability,component_scores,audit_completeness}', '')::numeric AS traceability_audit_completeness_score,
    oc.quality_json#>>'{traceability,short_explanation}' AS traceability_short_explanation,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{traceability,source_refs}') = 'array'
        THEN (
          SELECT string_agg(
            concat_ws(
              E'\n   ',
              concat(lpad(sr.ordinality::text, 2, '0'), ' | ', COALESCE(sr.source_ref->>'ref_type', 'source'), ' | ', COALESCE(sr.source_ref->>'product_role', '')),
              COALESCE(sr.source_ref->>'title', '[untitled source]'),
              COALESCE(sr.source_ref->>'url', ''),
              CASE WHEN NULLIF(sr.source_ref->>'publisher', '') IS NOT NULL THEN 'publisher: ' || (sr.source_ref->>'publisher') ELSE NULL END,
              CASE WHEN NULLIF(sr.source_ref->>'published_at', '') IS NOT NULL THEN 'published_at: ' || (sr.source_ref->>'published_at') ELSE NULL END,
              CASE WHEN NULLIF(sr.source_ref->>'ref_strength', '') IS NOT NULL THEN 'strength: ' || (sr.source_ref->>'ref_strength') ELSE NULL END
            ),
            E'\n'
            ORDER BY sr.ordinality
          )
          FROM jsonb_array_elements(oc.quality_json#>'{traceability,source_refs}') WITH ORDINALITY AS sr(source_ref, ordinality)
        )
      ELSE ''
    END AS traceability_source_refs_summary,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{traceability,traceability_warnings}') = 'array'
        THEN (
          SELECT string_agg(lpad(tw.ordinality::text, 2, '0') || ' | ' || tw.warning, E'\n' ORDER BY tw.ordinality)
          FROM jsonb_array_elements_text(oc.quality_json#>'{traceability,traceability_warnings}') WITH ORDINALITY AS tw(warning, ordinality)
        )
      ELSE ''
    END AS traceability_warnings_summary,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{traceability,missing_trace_layers}') = 'array'
        THEN (
          SELECT string_agg(lpad(mt.ordinality::text, 2, '0') || ' | ' || mt.layer, E'\n' ORDER BY mt.ordinality)
          FROM jsonb_array_elements_text(oc.quality_json#>'{traceability,missing_trace_layers}') WITH ORDINALITY AS mt(layer, ordinality)
        )
      ELSE ''
    END AS traceability_missing_layers_summary,
    oc.quality_json#>>'{company_binding,company_binding_status}' AS company_binding_status,
    NULLIF(oc.quality_json#>>'{company_binding,company_binding_score}', '')::numeric AS company_binding_score,
    oc.quality_json#>>'{company_binding,review_status}' AS company_binding_review_status,
    NULLIF(oc.quality_json#>>'{company_binding,component_scores,source_level_company_binding}', '')::numeric AS company_binding_source_level_score,
    NULLIF(oc.quality_json#>>'{company_binding,component_scores,trigger_signal_binding}', '')::numeric AS company_binding_trigger_signal_score,
    NULLIF(oc.quality_json#>>'{company_binding,component_scores,opportunity_scope_entity_fit}', '')::numeric AS company_binding_scope_entity_score,
    NULLIF(oc.quality_json#>>'{company_binding,component_scores,ambiguity_risk_control}', '')::numeric AS company_binding_ambiguity_score,
    NULLIF(oc.quality_json#>>'{company_binding,component_scores,review_completeness}', '')::numeric AS company_binding_review_completeness_score,
    NULLIF(oc.quality_json#>>'{company_binding,entity_binding_summary,strong_source_count}', '')::int AS company_binding_strong_source_count,
    NULLIF(oc.quality_json#>>'{company_binding,entity_binding_summary,acceptable_source_count}', '')::int AS company_binding_acceptable_source_count,
    NULLIF(oc.quality_json#>>'{company_binding,entity_binding_summary,weak_source_count}', '')::int AS company_binding_weak_source_count,
    NULLIF(oc.quality_json#>>'{company_binding,entity_binding_summary,not_bound_source_count}', '')::int AS company_binding_not_bound_source_count,
    NULLIF(oc.quality_json#>>'{company_binding,entity_binding_summary,unknown_source_count}', '')::int AS company_binding_unknown_source_count,
    NULLIF(oc.quality_json#>>'{company_binding,entity_binding_summary,primary_company_evidence_count}', '')::int AS company_binding_primary_company_evidence_count,
    NULLIF(oc.quality_json#>>'{company_binding,entity_binding_summary,affiliate_or_brand_context_count}', '')::int AS company_binding_affiliate_or_brand_context_count,
    NULLIF(oc.quality_json#>>'{company_binding,entity_binding_summary,geo_proxy_context_count}', '')::int AS company_binding_geo_proxy_context_count,
    oc.quality_json#>>'{company_binding,target_company_identity_used,database_name}' AS company_binding_target_database_name,
    oc.quality_json#>>'{company_binding,target_company_identity_used,company_prompt}' AS company_binding_target_company_prompt,
    oc.quality_json#>>'{company_binding,short_explanation}' AS company_binding_short_explanation,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{company_binding,binding_warnings}') = 'array'
        THEN (
          SELECT string_agg(lpad(bw.ordinality::text, 2, '0') || ' | ' || bw.warning, E'\n' ORDER BY bw.ordinality)
          FROM jsonb_array_elements_text(oc.quality_json#>'{company_binding,binding_warnings}') WITH ORDINALITY AS bw(warning, ordinality)
        )
      ELSE ''
    END AS company_binding_warnings_summary,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{company_binding,source_binding_reviews}') = 'array'
        THEN (
          SELECT string_agg(
            concat_ws(
              E'\n   ',
              concat(lpad(br.ordinality::text, 2, '0'), ' | ', COALESCE(br.review->>'binding_strength', 'unknown'), ' | ', COALESCE(br.review->>'binding_role', '')),
              COALESCE(br.review->>'url', ''),
              CASE WHEN NULLIF(br.review->>'entity_mentioned', '') IS NOT NULL THEN 'entity: ' || (br.review->>'entity_mentioned') ELSE NULL END,
              CASE WHEN NULLIF(br.review->>'entity_relationship_to_target', '') IS NOT NULL THEN 'relationship: ' || (br.review->>'entity_relationship_to_target') ELSE NULL END,
              CASE WHEN NULLIF(br.review->>'geo_scope_fit', '') IS NOT NULL THEN 'geo_scope_fit: ' || (br.review->>'geo_scope_fit') ELSE NULL END,
              CASE WHEN NULLIF(br.review->>'reason', '') IS NOT NULL THEN 'reason: ' || (br.review->>'reason') ELSE NULL END
            ),
            E'\n'
            ORDER BY br.ordinality
          )
          FROM jsonb_array_elements(oc.quality_json#>'{company_binding,source_binding_reviews}') WITH ORDINALITY AS br(review, ordinality)
        )
      ELSE ''
    END AS company_binding_source_reviews_summary,
    oc.quality_json#>>'{customer_relevance,customer_relevance_status}' AS customer_relevance_status,
    NULLIF(oc.quality_json#>>'{customer_relevance,customer_relevance_score}', '')::numeric AS customer_relevance_score,
    oc.quality_json#>>'{customer_relevance,review_status}' AS customer_relevance_review_status,
    oc.quality_json#>>'{customer_relevance,relevance_stage}' AS customer_relevance_stage,
    NULLIF(oc.quality_json#>>'{customer_relevance,component_scores,product_catalog_relevance}', '')::numeric AS customer_product_catalog_relevance_score,
    NULLIF(oc.quality_json#>>'{customer_relevance,component_scores,product_fit_evidence_strength}', '')::numeric AS customer_product_fit_evidence_strength_score,
    NULLIF(oc.quality_json#>>'{customer_relevance,component_scores,bundle_relevance_discipline}', '')::numeric AS customer_bundle_relevance_discipline_score,
    NULLIF(oc.quality_json#>>'{customer_relevance,component_scores,seller_actionability}', '')::numeric AS customer_seller_actionability_score,
    NULLIF(oc.quality_json#>>'{customer_relevance,component_scores,overreach_constraint_control}', '')::numeric AS customer_overreach_constraint_control_score,
    NULLIF(oc.quality_json#>>'{customer_relevance,customer_relevance_summary,directly_relevant_product_count}', '')::int AS customer_relevance_directly_relevant_product_count,
    NULLIF(oc.quality_json#>>'{customer_relevance,customer_relevance_summary,proxy_relevant_product_count}', '')::int AS customer_relevance_proxy_relevant_product_count,
    NULLIF(oc.quality_json#>>'{customer_relevance,customer_relevance_summary,conditionally_relevant_product_count}', '')::int AS customer_relevance_conditionally_relevant_product_count,
    NULLIF(oc.quality_json#>>'{customer_relevance,customer_relevance_summary,weak_or_speculative_product_count}', '')::int AS customer_relevance_weak_or_speculative_product_count,
    NULLIF(oc.quality_json#>>'{customer_relevance,customer_relevance_summary,not_relevant_product_count}', '')::int AS customer_relevance_not_relevant_product_count,
    NULLIF(oc.quality_json#>>'{customer_relevance,customer_relevance_summary,unscored_product_count}', '')::int AS customer_relevance_unscored_product_count,
    NULLIF(oc.quality_json#>>'{customer_relevance,customer_relevance_summary,hypothesis_only_product_count}', '')::int AS customer_relevance_hypothesis_only_product_count,
    NULLIF(oc.quality_json#>>'{customer_relevance,customer_relevance_summary,missing_scoring_result_count}', '')::int AS customer_relevance_missing_scoring_result_count,
    NULLIF(oc.quality_json#>>'{customer_relevance,customer_relevance_summary,validation_required_product_count}', '')::int AS customer_relevance_validation_required_product_count,
    NULLIF(oc.quality_json#>>'{customer_relevance,cap_diagnostics,raw_score}', '')::numeric AS customer_relevance_raw_score,
    oc.quality_json#>>'{customer_relevance,cap_diagnostics,raw_score_status}' AS customer_relevance_raw_score_status,
    NULLIF(oc.quality_json#>>'{customer_relevance,cap_diagnostics,final_score}', '')::numeric AS customer_relevance_final_score,
    oc.quality_json#>>'{customer_relevance,cap_diagnostics,final_status}' AS customer_relevance_final_status,
    NULLIF(oc.quality_json#>>'{customer_relevance,cap_diagnostics,cap_applied}', '')::boolean AS customer_relevance_cap_applied,
    oc.quality_json#>>'{customer_relevance,cap_diagnostics,primary_cap_reason}' AS customer_relevance_primary_cap_reason,
    oc.quality_json#>>'{customer_relevance,short_explanation}' AS customer_relevance_short_explanation,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{customer_relevance,cap_diagnostics,cap_reasons}') = 'array'
        THEN (
          SELECT string_agg(lpad(cr.ordinality::text, 2, '0') || ' | ' || cr.reason, E'\n' ORDER BY cr.ordinality)
          FROM jsonb_array_elements_text(oc.quality_json#>'{customer_relevance,cap_diagnostics,cap_reasons}') WITH ORDINALITY AS cr(reason, ordinality)
        )
      ELSE ''
    END AS customer_relevance_cap_reasons_summary,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{customer_relevance,relevance_warnings}') = 'array'
        THEN (
          SELECT string_agg(lpad(rw.ordinality::text, 2, '0') || ' | ' || rw.warning, E'\n' ORDER BY rw.ordinality)
          FROM jsonb_array_elements_text(oc.quality_json#>'{customer_relevance,relevance_warnings}') WITH ORDINALITY AS rw(warning, ordinality)
        )
      ELSE ''
    END AS customer_relevance_warnings_summary,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{customer_relevance,product_relevance_reviews}') = 'array'
        THEN (
          SELECT string_agg(
            concat_ws(
              E'\n   ',
              concat(lpad(pr.ordinality::text, 2, '0'), ' | ', COALESCE(pr.review->>'bundle_role', ''), ' | ', COALESCE(pr.review->>'product_name', '[unknown product]')),
              'status: ' || COALESCE(pr.review->>'product_relevance_status', ''),
              'seller_posture: ' || COALESCE(pr.review->>'seller_posture', ''),
              CASE WHEN jsonb_typeof(pr.review->'risk_flags') = 'array' THEN 'risk_flags: ' || (SELECT string_agg(rf.value, ', ' ORDER BY rf.ordinality) FROM jsonb_array_elements_text(pr.review->'risk_flags') WITH ORDINALITY AS rf(value, ordinality)) ELSE NULL END,
              CASE WHEN NULLIF(pr.review->>'reason', '') IS NOT NULL THEN 'reason: ' || (pr.review->>'reason') ELSE NULL END
            ),
            E'\n'
            ORDER BY pr.ordinality
          )
          FROM jsonb_array_elements(oc.quality_json#>'{customer_relevance,product_relevance_reviews}') WITH ORDINALITY AS pr(review, ordinality)
        )
      ELSE ''
    END AS customer_relevance_product_reviews_summary,
    oc.quality_json#>>'{commercial_logic,commercial_logic_status}' AS commercial_logic_status,
    NULLIF(oc.quality_json#>>'{commercial_logic,commercial_logic_score}', '')::numeric AS commercial_logic_score,
    oc.quality_json#>>'{commercial_logic,review_status}' AS commercial_logic_review_status,
    oc.quality_json#>>'{commercial_logic,commercial_stage}' AS commercial_logic_stage,
    NULLIF(oc.quality_json#>>'{commercial_logic,component_scores,trigger_to_opportunity_causality}', '')::numeric AS commercial_trigger_causality_score,
    NULLIF(oc.quality_json#>>'{commercial_logic,component_scores,problem_value_coherence}', '')::numeric AS commercial_problem_value_coherence_score,
    NULLIF(oc.quality_json#>>'{commercial_logic,component_scores,buyer_path_stage_logic}', '')::numeric AS commercial_buyer_path_stage_logic_score,
    NULLIF(oc.quality_json#>>'{commercial_logic,component_scores,commercial_posture_actionability}', '')::numeric AS commercial_posture_actionability_score,
    NULLIF(oc.quality_json#>>'{commercial_logic,component_scores,sequencing_dependency_logic}', '')::numeric AS commercial_sequencing_dependency_score,
    NULLIF(oc.quality_json#>>'{commercial_logic,component_scores,commercial_overreach_control}', '')::numeric AS commercial_overreach_control_score,
    NULLIF(oc.quality_json#>>'{commercial_logic,commercial_logic_summary,strong_area_count}', '')::int AS commercial_logic_strong_area_count,
    NULLIF(oc.quality_json#>>'{commercial_logic,commercial_logic_summary,acceptable_area_count}', '')::int AS commercial_logic_acceptable_area_count,
    NULLIF(oc.quality_json#>>'{commercial_logic,commercial_logic_summary,weak_area_count}', '')::int AS commercial_logic_weak_area_count,
    NULLIF(oc.quality_json#>>'{commercial_logic,commercial_logic_summary,invalid_area_count}', '')::int AS commercial_logic_invalid_area_count,
    NULLIF(oc.quality_json#>>'{commercial_logic,commercial_logic_summary,overreach_risk_count}', '')::int AS commercial_logic_overreach_risk_count,
    NULLIF(oc.quality_json#>>'{commercial_logic,commercial_logic_summary,buyer_path_risk_count}', '')::int AS commercial_logic_buyer_path_risk_count,
    NULLIF(oc.quality_json#>>'{commercial_logic,commercial_logic_summary,stage_mismatch_count}', '')::int AS commercial_logic_stage_mismatch_count,
    NULLIF(oc.quality_json#>>'{commercial_logic,commercial_logic_summary,sequencing_risk_count}', '')::int AS commercial_logic_sequencing_risk_count,
    NULLIF(oc.quality_json#>>'{commercial_logic,commercial_logic_summary,actionability_risk_count}', '')::int AS commercial_logic_actionability_risk_count,
    NULLIF(oc.quality_json#>>'{commercial_logic,commercial_logic_summary,safe_discovery_indicator_count}', '')::int AS commercial_logic_safe_discovery_indicator_count,
    NULLIF(oc.quality_json#>>'{commercial_logic,cap_diagnostics,raw_score}', '')::numeric AS commercial_logic_raw_score,
    oc.quality_json#>>'{commercial_logic,cap_diagnostics,raw_score_status}' AS commercial_logic_raw_score_status,
    NULLIF(oc.quality_json#>>'{commercial_logic,cap_diagnostics,final_score}', '')::numeric AS commercial_logic_final_score,
    oc.quality_json#>>'{commercial_logic,cap_diagnostics,final_status}' AS commercial_logic_final_status,
    NULLIF(oc.quality_json#>>'{commercial_logic,cap_diagnostics,cap_applied}', '')::boolean AS commercial_logic_cap_applied,
    oc.quality_json#>>'{commercial_logic,cap_diagnostics,primary_cap_reason}' AS commercial_logic_primary_cap_reason,
    oc.quality_json#>>'{commercial_logic,short_explanation}' AS commercial_logic_short_explanation,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{commercial_logic,cap_diagnostics,cap_reasons}') = 'array'
        THEN (
          SELECT string_agg(lpad(cr.ordinality::text, 2, '0') || ' | ' || cr.reason, E'\n' ORDER BY cr.ordinality)
          FROM jsonb_array_elements_text(oc.quality_json#>'{commercial_logic,cap_diagnostics,cap_reasons}') WITH ORDINALITY AS cr(reason, ordinality)
        )
      ELSE ''
    END AS commercial_logic_cap_reasons_summary,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{commercial_logic,commercial_logic_warnings}') = 'array'
        THEN (
          SELECT string_agg(lpad(cw.ordinality::text, 2, '0') || ' | ' || cw.warning, E'\n' ORDER BY cw.ordinality)
          FROM jsonb_array_elements_text(oc.quality_json#>'{commercial_logic,commercial_logic_warnings}') WITH ORDINALITY AS cw(warning, ordinality)
        )
      ELSE ''
    END AS commercial_logic_warnings_summary,
    CASE
      WHEN jsonb_typeof(oc.quality_json#>'{commercial_logic,commercial_logic_reviews}') = 'array'
        THEN (
          SELECT string_agg(
            concat_ws(
              E'\n   ',
              concat(lpad(clr.ordinality::text, 2, '0'), ' | ', COALESCE(clr.review->>'review_area', ''), ' | ', COALESCE(clr.review->>'status', '')),
              CASE WHEN jsonb_typeof(clr.review->'risk_flags') = 'array' THEN 'risk_flags: ' || (SELECT string_agg(rf.value, ', ' ORDER BY rf.ordinality) FROM jsonb_array_elements_text(clr.review->'risk_flags') WITH ORDINALITY AS rf(value, ordinality)) ELSE NULL END,
              CASE WHEN NULLIF(clr.review->>'reason', '') IS NOT NULL THEN 'reason: ' || (clr.review->>'reason') ELSE NULL END,
              CASE WHEN jsonb_typeof(clr.review->'required_fix_or_validation') = 'array' THEN 'required_validation: ' || (SELECT string_agg(rv.value, ' | ' ORDER BY rv.ordinality) FROM jsonb_array_elements_text(clr.review->'required_fix_or_validation') WITH ORDINALITY AS rv(value, ordinality)) ELSE NULL END
            ),
            E'\n'
            ORDER BY clr.ordinality
          )
          FROM jsonb_array_elements(oc.quality_json#>'{commercial_logic,commercial_logic_reviews}') WITH ORDINALITY AS clr(review, ordinality)
        )
      ELSE ''
    END AS commercial_logic_reviews_summary
  FROM candidate_source oc
  JOIN public.companies c
    ON c.id = oc.company_id
  LEFT JOIN public.companies scope_co
    ON scope_co.id = oc.primary_scope_company_id
),
item_rows AS (
  SELECT
    oci.opportunity_candidate_id,
    ROW_NUMBER() OVER (
      PARTITION BY oci.opportunity_candidate_id
      ORDER BY COALESCE(oci.sort_order, 999999), oci.id
    ) AS rn,
    oci.item_role,
    cp.name AS product_name,
    COALESCE(oci.is_primary, false) AS is_primary,
    COALESCE(oci.is_required_for_close, false) AS is_required_for_close,
    oci.source_score,
    oci.source_confidence_score
  FROM base b
  JOIN public.opportunity_candidate_items oci
    ON oci.opportunity_candidate_id = b.opportunity_candidate_id
  LEFT JOIN public.customer_products cp
    ON cp.id = oci.customer_product_id
),
products AS (
  SELECT
    ir.opportunity_candidate_id,
    string_agg(
      concat(
        lpad(ir.rn::text, 2, '0'),
        ' | ',
        COALESCE(ir.item_role, 'product'),
        ' | ',
        COALESCE(ir.product_name, '[unknown product]'),
        CASE WHEN ir.is_primary THEN ' | primary=yes' ELSE '' END,
        CASE WHEN ir.is_required_for_close THEN ' | required_for_close=yes' ELSE '' END,
        CASE
          WHEN ir.source_score IS NOT NULL OR ir.source_confidence_score IS NOT NULL
            THEN ' | scored=yes'
          ELSE ''
        END,
        CASE
          WHEN ir.source_score IS NOT NULL
            THEN ' | source_score=' || to_char(ir.source_score, 'FM999999990.0000')
          ELSE ''
        END,
        CASE
          WHEN ir.source_confidence_score IS NOT NULL
            THEN ' | source_confidence=' || to_char(ir.source_confidence_score, 'FM999999990.0000')
          ELSE ''
        END
      ),
      E'\n' ORDER BY ir.rn
    ) AS products_summary
  FROM item_rows ir
  GROUP BY ir.opportunity_candidate_id
),
conditional_attach_rows AS (
  SELECT
    b.research_run_id,
    b.company_id,
    b.opportunity_candidate_id,
    ROW_NUMBER() OVER (
      PARTITION BY b.opportunity_candidate_id
      ORDER BY
        CASE (ca.attach_item->>'recommended_timing')
          WHEN 'same_discovery' THEN 1
          WHEN 'after_discovery' THEN 2
          WHEN 'after_customer_validation' THEN 3
          WHEN 'parked' THEN 4
          ELSE 9
        END,
        ca.attach_item->>'product_name'
    ) AS rn,
    ca.attach_item
  FROM base b
  CROSS JOIN LATERAL jsonb_array_elements(b.conditional_attach_candidates) AS ca(attach_item)
),
conditional_attach AS (
  SELECT
    car.opportunity_candidate_id,
    COUNT(*) AS conditional_attach_candidate_count,
    string_agg(
      concat(
        lpad(car.rn::text, 2, '0'),
        ' | ',
        COALESCE((car.attach_item->>'attach_role'), 'conditional_attach'),
        ' | ',
        COALESCE((car.attach_item->>'product_name'), '[unknown product]'),
        CASE
          WHEN NULLIF((car.attach_item->>'recommended_timing'), '') IS NOT NULL
            THEN ' | timing=' || (car.attach_item->>'recommended_timing')
          ELSE ''
        END,
        CASE
          WHEN NULLIF((car.attach_item->>'evidence_strength'), '') IS NOT NULL
            THEN ' | evidence=' || (car.attach_item->>'evidence_strength')
          ELSE ''
        END,
        CASE
          WHEN NULLIF((car.attach_item->>'attach_trigger'), '') IS NOT NULL
            THEN E'\n   trigger: ' || (car.attach_item->>'attach_trigger')
          ELSE ''
        END,
        CASE
          WHEN NULLIF((car.attach_item->>'why_not_in_current_bundle'), '') IS NOT NULL
            THEN E'\n   why_not_in_current_bundle: ' || (car.attach_item->>'why_not_in_current_bundle')
          ELSE ''
        END,
        CASE
          WHEN NULLIF((car.attach_item->>'guardrail_note'), '') IS NOT NULL
            THEN E'\n   guardrail: ' || (car.attach_item->>'guardrail_note')
          ELSE ''
        END
      ),
      E'\n' ORDER BY car.rn
    ) AS conditional_attach_candidates_summary
  FROM conditional_attach_rows car
  GROUP BY car.opportunity_candidate_id
),
stakeholder_rows AS (
  SELECT
    b.opportunity_candidate_id,
    ROW_NUMBER() OVER (
      PARTITION BY b.opportunity_candidate_id
      ORDER BY
        CASE s.gate_role_type
          WHEN 'owner' THEN 1
          WHEN 'decision' THEN 2
          WHEN 'delivery' THEN 3
          WHEN 'approval' THEN 4
          ELSE 9
        END,
        s.gate_role,
        s.id
    ) AS rn,
    s.id AS stakeholder_id,
    s.gate_role,
    s.gate_role_type,
    p.job_title AS role_title,
    s.entity_name,
    s.entity_level,
    s.rationale,
    p.id AS person_id,
    p.full_name,
    p.linkedin_url,
    CASE
      WHEN jsonb_typeof(p.contacts->'emails') = 'array'
        THEN (
          SELECT string_agg(NULLIF(e.item->>'email', ''), ', ' ORDER BY e.ordinality)
          FROM jsonb_array_elements(p.contacts->'emails') WITH ORDINALITY AS e(item, ordinality)
        )
      ELSE NULL
    END AS person_emails,
    osm.message_subject,
    osm.message_body
  FROM base b
  JOIN public.stakeholders_v2 s
    ON s.opportunity_id = b.opportunity_candidate_id
  LEFT JOIN public.persons p
    ON p.id = s.person_id
  LEFT JOIN LATERAL (
    SELECT m.message_subject, m.message_body
    FROM public.opportunity_stakeholder_messages m
    WHERE m.opportunity_id = s.opportunity_id
      AND m.stakeholder_id = s.id
    ORDER BY m.created_at DESC, m.id DESC
    LIMIT 1
  ) osm ON true
),
stakeholders AS (
  SELECT
    sr.opportunity_candidate_id,
    COUNT(*) AS stakeholder_count,
    COUNT(*) FILTER (
      WHERE sr.person_id IS NULL
         OR NULLIF(BTRIM(sr.full_name), '') IS NULL
    ) AS missing_person_count,
    string_agg(
      concat_ws(
        E'\n   ',
        concat(
          lpad(sr.rn::text, 2, '0'),
          ' | ',
          COALESCE(NULLIF(sr.gate_role, ''), 'Stakeholder'),
          CASE
            WHEN NULLIF(sr.gate_role_type, '') IS NOT NULL
              THEN ' (' || sr.gate_role_type || ')'
            ELSE ''
          END,
          ' | ',
          COALESCE(NULLIF(sr.full_name, ''), '[missing person]')
        ),
        CASE
          WHEN NULLIF(sr.role_title, '') IS NOT NULL
            THEN 'title: ' || sr.role_title
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(sr.entity_name, '') IS NOT NULL
            THEN 'entity: ' || sr.entity_name ||
              CASE
                WHEN NULLIF(sr.entity_level, '') IS NOT NULL
                  THEN ' (' || sr.entity_level || ')'
                ELSE ''
              END
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(sr.person_emails, '') IS NOT NULL
            THEN 'email: ' || sr.person_emails
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(sr.linkedin_url, '') IS NOT NULL
            THEN 'linkedin: ' || sr.linkedin_url
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(sr.message_subject, '') IS NOT NULL
            THEN 'email_subject: ' || sr.message_subject
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(sr.message_body, '') IS NOT NULL
            THEN 'email_body:' || E'\n' || sr.message_body
          ELSE NULL
        END
      ),
      E'\n\n'
      ORDER BY sr.rn
    ) AS stakeholders_summary,
    COUNT(*) FILTER (
      WHERE NULLIF(BTRIM(sr.message_body), '') IS NOT NULL
    ) AS stakeholder_email_count,
    string_agg(
      concat_ws(
        E'\n   ',
        concat(
          lpad(sr.rn::text, 2, '0'),
          ' | ',
          COALESCE(NULLIF(sr.full_name, ''), '[missing person]'),
          ' | stakeholder_id=',
          sr.stakeholder_id,
          ' | person_id=',
          COALESCE(sr.person_id::text, 'missing')
        ),
        CASE
          WHEN NULLIF(sr.rationale, '') IS NOT NULL
            THEN 'rationale: ' || sr.rationale
          ELSE 'rationale: [not available]'
        END
      ),
      E'\n\n'
      ORDER BY sr.rn
    ) AS stakeholder_revalidation_summary
  FROM stakeholder_rows sr
  GROUP BY sr.opportunity_candidate_id
),
seed_fact_signals AS (
  -- Rich path: signals from the persisted seed originating this candidate.
  SELECT
    b.research_run_id,
    b.company_id,
    b.opportunity_candidate_id,
    b.seed_id,
    osf.signal_definition_id,
    osf.signal_type_name,
    osf.decision_role,
    osf.causal_role,
    osf.influence_score,
    osf.effective_signal_score,
    osf.reason,
    osf.selected_opportunity_space,
    'seed_fact'::text AS source_layer
  FROM base b
  JOIN public.opportunity_seed_signal_facts osf
    ON osf.research_run_id = b.research_run_id
   AND osf.company_id = b.company_id
   AND osf.seed_id = b.seed_id
),
lineage_signals AS (
  -- Fallback path: signals carried on the candidate itself (meta.trigger_signal_lineage).
  -- Used when the originating seed_id was never written to opportunity_seed_signal_facts
  -- (observed for late/last seeds such as FM4 / FM04), so the audit block never goes blank.
  SELECT
    b.research_run_id,
    b.company_id,
    b.opportunity_candidate_id,
    b.seed_id,
    NULLIF(tl.item->>'signal_definition_id', '')::bigint AS signal_definition_id,
    sd.name AS signal_type_name,
    NULLIF(tl.item->>'decision_role', '') AS decision_role,
    NULLIF(tl.item->>'lineage_role', '') AS causal_role,
    NULL::numeric AS influence_score,
    NULL::numeric AS effective_signal_score,
    COALESCE(NULLIF(tl.item->>'reason', ''), NULLIF(tl.item->>'supports', '')) AS reason,
    NULL::text AS selected_opportunity_space,
    'trigger_lineage'::text AS source_layer
  FROM base b
  CROSS JOIN LATERAL jsonb_array_elements(b.trigger_signal_lineage_json) AS tl(item)
  LEFT JOIN public.signal_definitions sd
    ON sd.id = NULLIF(tl.item->>'signal_definition_id', '')::bigint
  WHERE NULLIF(tl.item->>'signal_definition_id', '') IS NOT NULL
),
account_signal_fact_rows AS (
  -- Resilient spine: prefer persisted seed facts; backfill from trigger lineage only for
  -- signal_definition_ids a candidate's seed facts do not already cover. Nothing is dropped.
  SELECT
    u.research_run_id,
    u.company_id,
    u.opportunity_candidate_id,
    ROW_NUMBER() OVER (
      PARTITION BY u.opportunity_candidate_id
      ORDER BY
        u.source_rank,
        u.influence_score DESC NULLS LAST,
        u.effective_signal_score DESC NULLS LAST,
        u.signal_definition_id
    ) AS rn,
    u.seed_id,
    u.signal_definition_id,
    u.signal_type_name,
    u.decision_role,
    u.influence_score,
    u.effective_signal_score,
    u.causal_role,
    u.reason,
    u.selected_opportunity_space,
    u.source_layer
  FROM (
    SELECT sfs.*, 0 AS source_rank
    FROM seed_fact_signals sfs
    UNION ALL
    SELECT ls.*, 1 AS source_rank
    FROM lineage_signals ls
    WHERE NOT EXISTS (
      SELECT 1
      FROM seed_fact_signals sfs
      WHERE sfs.opportunity_candidate_id = ls.opportunity_candidate_id
        AND sfs.signal_definition_id     = ls.signal_definition_id
    )
  ) u
),
account_signal_facts AS (
  SELECT
    asfr.opportunity_candidate_id,
    COUNT(*) AS account_signal_fact_count,
    string_agg(DISTINCT asfr.source_layer, ',') AS account_signal_source_layers,
    string_agg(
      concat_ws(
        E'\n   ',
        concat(
          lpad(asfr.rn::text, 2, '0'),
          ' | source=',
          COALESCE(asfr.source_layer, ''),
          ' | seed_id=',
          COALESCE(asfr.seed_id, ''),
          ' | signal_definition_id=',
          COALESCE(asfr.signal_definition_id::text, ''),
          ' | ',
          COALESCE(asfr.signal_type_name, ''),
          ' | causal_role=',
          COALESCE(asfr.causal_role, ''),
          ' | decision_role=',
          COALESCE(asfr.decision_role, ''),
          ' | influence=',
          COALESCE(to_char(asfr.influence_score, 'FM999999990.0000'), 'n/a'),
          ' | effective_signal=',
          COALESCE(to_char(asfr.effective_signal_score, 'FM999999990.0000'), 'n/a')
        ),
        CASE
          WHEN NULLIF(asfr.reason, '') IS NOT NULL
            THEN 'reason: ' || asfr.reason
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(asfr.selected_opportunity_space, '') IS NOT NULL
            THEN 'opportunity_space: ' || asfr.selected_opportunity_space
          ELSE NULL
        END
      ),
      E'\n'
      ORDER BY asfr.rn
    ) AS account_signal_facts_summary
  FROM account_signal_fact_rows asfr
  GROUP BY asfr.opportunity_candidate_id
),
signal_confirmation_rows AS (
  SELECT
    asfr.opportunity_candidate_id,
    asfr.rn AS signal_rn,
    asfr.seed_id,
    asfr.signal_definition_id,
    asfr.signal_type_name,
    sc.id AS signal_confirmation_id,
    ROW_NUMBER() OVER (
      PARTITION BY asfr.opportunity_candidate_id, asfr.signal_definition_id
      ORDER BY
        sc.source_confidence DESC NULLS LAST,
        sc.applicability_confidence DESC NULLS LAST,
        sc.published_at DESC NULLS LAST,
        sc.id
    ) AS confirmation_rn,
    sc.title,
    sc.url,
    sc.publisher,
    sc.published_at,
    sc.validation_status,
    sc.source_confidence,
    sc.applicability_confidence,
    sc.normalized_claim,
    sc.why_it_confirms,
    sc.why_it_applies
  FROM account_signal_fact_rows asfr
  JOIN public.signal_confirmations sc
    ON sc.research_run_id = asfr.research_run_id
   AND sc.company_id = asfr.company_id
   AND sc.signal_definition_id = asfr.signal_definition_id
),
signal_confirmations AS (
  SELECT
    scr.opportunity_candidate_id,
    COUNT(*) AS signal_confirmation_count,
    string_agg(
      concat_ws(
        E'\n ',
        concat(
          lpad(scr.signal_rn::text, 2, '0'),
          '.',
          lpad(scr.confirmation_rn::text, 2, '0'),
          ' | signal_definition_id=',
          COALESCE(scr.signal_definition_id::text, ''),
          ' | signal_confirmation_id=',
          COALESCE(scr.signal_confirmation_id::text, ''),
          ' | ',
          COALESCE(scr.signal_type_name, '')
        ),
        concat_ws(
          ' | ',
          COALESCE(NULLIF(scr.publisher, ''), '[unknown publisher]'),
          COALESCE(to_char(scr.published_at::date, 'YYYY-MM-DD'), 'undated'),
          'source_confidence=' || COALESCE(to_char(scr.source_confidence, 'FM999999990.0000'), 'n/a'),
          'applicability_confidence=' || COALESCE(to_char(scr.applicability_confidence, 'FM999999990.0000'), 'n/a')
        ),
        COALESCE(NULLIF(scr.title, ''), '[untitled source]'),
        NULLIF(scr.url, ''),
        CASE
          WHEN NULLIF(scr.normalized_claim, '') IS NOT NULL
            THEN 'claim: ' || scr.normalized_claim
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(scr.why_it_confirms, '') IS NOT NULL
            THEN 'why_it_confirms: ' || scr.why_it_confirms
          ELSE NULL
        END,
        CASE
          WHEN NULLIF(scr.why_it_applies, '') IS NOT NULL
            THEN 'why_it_applies: ' || scr.why_it_applies
          ELSE NULL
        END
      ),
      E'\n\n'
      ORDER BY
        scr.signal_rn,
        scr.confirmation_rn
    ) AS signal_confirmations_summary
  FROM signal_confirmation_rows scr
  GROUP BY scr.opportunity_candidate_id
)
SELECT
  b.opportunity_candidate_id,
  CASE WHEN b.is_selected THEN 'X' ELSE '' END AS is_selected,
  b.account,
  b.entity_attribution AS entity,
  b.entity_secondary_entities AS secondary_entities,
  b.entity_scope_classification AS entity_scope_classification,
  b.opportunity_title,
  b.seed_id AS seed_id,
  b.trigger_signal_lineage_summary AS account_signals_trigger_lineage,
  b.signal_to_product_evidence_basis AS signal_to_product_evidence_basis,
  COALESCE(asf.account_signal_fact_count, 0) AS account_signals_audit_fact_count,
  COALESCE(asf.account_signal_facts_summary, '') AS account_signals_audit_facts,
  COALESCE(asf.account_signal_source_layers, '') AS account_signals_audit_source,
  COALESCE(sc.signal_confirmation_count, 0) AS account_signals_signal_confirmation_count,
  COALESCE(sc.signal_confirmations_summary, '') AS account_signals_signal_confirmations,
  b.rank_position,
  b.portfolio_priority_score,
  b.portfolio_priority_reason,
  b.horizon,
  b.horizon_name,
  b.horizon_confidence,
  b.horizon_reasoning,
  b.indicative_deal_size_range,
  b.deal_size_general,
  b.time_label_general,
  b.delivery_type,
  b.track_1_entity,
  b.track_2_entities,
  b.why_now,
  b.notes,
  b.primary_business_problem,
  b.primary_buyer_persona,
  COALESCE(sh.stakeholder_count, 0) AS stakeholders_count,
  COALESCE(sh.stakeholder_email_count, 0) AS stakeholders_email_count,
  COALESCE(sh.stakeholders_summary, '') AS stakeholders,
  COALESCE(sh.stakeholder_revalidation_summary, '') AS stakeholders_revalidation,
  COALESCE(sh.missing_person_count, 0) AS stakeholders_missing_person_count,
  b.primary_value_proposition,
  b.solution_center,
  b.competitive_incumbent_awareness AS competitive_incumbent_awareness,
  b.quality_assessment_summary AS quality_assessment_summary,
  b.quality_assessment_explanation AS quality_assessment_explanation,
  b.grounding_status AS qa_grounding_status,
  b.grounding_score AS qa_grounding_score,
  b.grounding_evidence_level AS qa_grounding_evidence_level,
  b.grounding_deterministic_base_score AS qa_grounding_deterministic_base_score,
  b.grounding_recommended_action AS qa_grounding_recommended_action,
  b.grounding_claim_review_status AS qa_grounding_claim_review_status,
  b.grounding_claim_review_penalty AS qa_grounding_claim_review_penalty,
  b.grounding_claim_review_penalty_cap AS qa_grounding_claim_review_penalty_cap,
  b.grounding_unsupported_claim_count AS qa_grounding_unsupported_claim_count,
  b.grounding_overstated_claim_count AS qa_grounding_overstated_claim_count,
  b.grounding_warning_count AS qa_grounding_warning_count,
  b.grounding_reasoning AS qa_grounding_reasoning,
  b.grounding_claim_review_reasoning AS qa_grounding_claim_review_reasoning,
  b.grounding_warnings_summary AS qa_grounding_warnings,
  b.grounding_supported_claims_summary AS qa_grounding_supported_claims,
  b.grounding_inferred_claims_summary AS qa_grounding_inferred_claims,
  b.grounding_unsupported_claims_summary AS qa_grounding_unsupported_claims,
  b.grounding_overstated_claims_summary AS qa_grounding_overstated_claims,
  b.traceability_status AS qa_traceability_status,
  b.traceability_score AS qa_traceability_score,
  b.traceability_url_status AS qa_traceability_url_status,
  b.traceability_selected_source_ref_count AS qa_traceability_selected_source_ref_count,
  b.traceability_selected_product_fit_source_count AS qa_traceability_selected_product_fit_source_count,
  b.traceability_selected_signal_confirmation_source_count AS qa_traceability_selected_signal_confirmation_source_count,
  b.traceability_available_product_fit_url_count AS qa_traceability_available_product_fit_url_count,
  b.traceability_available_signal_confirmation_url_count AS qa_traceability_available_signal_confirmation_url_count,
  b.traceability_source_url_score AS qa_traceability_source_url_score,
  b.traceability_signal_score AS qa_traceability_signal_score,
  b.traceability_decision_score AS qa_traceability_decision_score,
  b.traceability_validation_score AS qa_traceability_validation_score,
  b.traceability_product_fit_score AS qa_traceability_product_fit_score,
  b.traceability_audit_completeness_score AS qa_traceability_audit_completeness_score,
  b.traceability_short_explanation AS qa_traceability_explanation,
  b.traceability_source_refs_summary AS qa_traceability_source_refs,
  b.traceability_warnings_summary AS qa_traceability_warnings,
  b.traceability_missing_layers_summary AS qa_traceability_missing_layers,
  b.company_binding_status AS qa_company_binding_status,
  b.company_binding_score AS qa_company_binding_score,
  b.company_binding_review_status AS qa_company_binding_review_status,
  b.company_binding_source_level_score AS qa_company_binding_source_level_score,
  b.company_binding_trigger_signal_score AS qa_company_binding_trigger_signal_score,
  b.company_binding_scope_entity_score AS qa_company_binding_scope_entity_score,
  b.company_binding_ambiguity_score AS qa_company_binding_ambiguity_score,
  b.company_binding_review_completeness_score AS qa_company_binding_review_completeness_score,
  b.company_binding_strong_source_count AS qa_company_binding_strong_source_count,
  b.company_binding_acceptable_source_count AS qa_company_binding_acceptable_source_count,
  b.company_binding_weak_source_count AS qa_company_binding_weak_source_count,
  b.company_binding_not_bound_source_count AS qa_company_binding_not_bound_source_count,
  b.company_binding_unknown_source_count AS qa_company_binding_unknown_source_count,
  b.company_binding_primary_company_evidence_count AS qa_company_binding_primary_company_evidence_count,
  b.company_binding_affiliate_or_brand_context_count AS qa_company_binding_affiliate_or_brand_context_count,
  b.company_binding_geo_proxy_context_count AS qa_company_binding_geo_proxy_context_count,
  b.company_binding_target_database_name AS qa_company_binding_target_company,
  b.company_binding_target_company_prompt AS qa_company_binding_company_prompt,
  b.company_binding_short_explanation AS qa_company_binding_explanation,
  b.company_binding_warnings_summary AS qa_company_binding_warnings,
  b.company_binding_source_reviews_summary AS qa_company_binding_source_reviews,
  b.customer_relevance_status AS qa_customer_relevance_status,
  b.customer_relevance_score AS qa_customer_relevance_score,
  b.customer_relevance_review_status AS qa_customer_relevance_review_status,
  b.customer_relevance_stage AS qa_customer_relevance_stage,
  b.customer_product_catalog_relevance_score AS qa_customer_relevance_product_catalog_score,
  b.customer_product_fit_evidence_strength_score AS qa_customer_relevance_product_fit_evidence_score,
  b.customer_bundle_relevance_discipline_score AS qa_customer_relevance_bundle_discipline_score,
  b.customer_seller_actionability_score AS qa_customer_relevance_seller_actionability_score,
  b.customer_overreach_constraint_control_score AS qa_customer_relevance_overreach_control_score,
  b.customer_relevance_directly_relevant_product_count AS qa_customer_relevance_directly_relevant_product_count,
  b.customer_relevance_proxy_relevant_product_count AS qa_customer_relevance_proxy_relevant_product_count,
  b.customer_relevance_conditionally_relevant_product_count AS qa_customer_relevance_conditionally_relevant_product_count,
  b.customer_relevance_weak_or_speculative_product_count AS qa_customer_relevance_weak_or_speculative_product_count,
  b.customer_relevance_not_relevant_product_count AS qa_customer_relevance_not_relevant_product_count,
  b.customer_relevance_unscored_product_count AS qa_customer_relevance_unscored_product_count,
  b.customer_relevance_hypothesis_only_product_count AS qa_customer_relevance_hypothesis_only_product_count,
  b.customer_relevance_missing_scoring_result_count AS qa_customer_relevance_missing_scoring_result_count,
  b.customer_relevance_validation_required_product_count AS qa_customer_relevance_validation_required_product_count,
  b.customer_relevance_raw_score AS qa_customer_relevance_raw_score,
  b.customer_relevance_raw_score_status AS qa_customer_relevance_raw_score_status,
  b.customer_relevance_final_score AS qa_customer_relevance_final_score,
  b.customer_relevance_final_status AS qa_customer_relevance_final_status,
  b.customer_relevance_cap_applied AS qa_customer_relevance_cap_applied,
  b.customer_relevance_primary_cap_reason AS qa_customer_relevance_primary_cap_reason,
  b.customer_relevance_cap_reasons_summary AS qa_customer_relevance_cap_reasons,
  b.customer_relevance_short_explanation AS qa_customer_relevance_explanation,
  b.customer_relevance_warnings_summary AS qa_customer_relevance_warnings,
  b.customer_relevance_product_reviews_summary AS qa_customer_relevance_product_reviews,
  b.commercial_logic_status AS qa_commercial_logic_status,
  b.commercial_logic_score AS qa_commercial_logic_score,
  b.commercial_logic_review_status AS qa_commercial_logic_review_status,
  b.commercial_logic_stage AS qa_commercial_logic_stage,
  b.commercial_trigger_causality_score AS qa_commercial_logic_trigger_causality_score,
  b.commercial_problem_value_coherence_score AS qa_commercial_logic_problem_value_coherence_score,
  b.commercial_buyer_path_stage_logic_score AS qa_commercial_logic_buyer_path_stage_score,
  b.commercial_posture_actionability_score AS qa_commercial_logic_actionability_score,
  b.commercial_sequencing_dependency_score AS qa_commercial_logic_sequencing_dependency_score,
  b.commercial_overreach_control_score AS qa_commercial_logic_overreach_control_score,
  b.commercial_logic_strong_area_count AS qa_commercial_logic_strong_area_count,
  b.commercial_logic_acceptable_area_count AS qa_commercial_logic_acceptable_area_count,
  b.commercial_logic_weak_area_count AS qa_commercial_logic_weak_area_count,
  b.commercial_logic_invalid_area_count AS qa_commercial_logic_invalid_area_count,
  b.commercial_logic_overreach_risk_count AS qa_commercial_logic_overreach_risk_count,
  b.commercial_logic_buyer_path_risk_count AS qa_commercial_logic_buyer_path_risk_count,
  b.commercial_logic_stage_mismatch_count AS qa_commercial_logic_stage_mismatch_count,
  b.commercial_logic_sequencing_risk_count AS qa_commercial_logic_sequencing_risk_count,
  b.commercial_logic_actionability_risk_count AS qa_commercial_logic_actionability_risk_count,
  b.commercial_logic_safe_discovery_indicator_count AS qa_commercial_logic_safe_discovery_indicator_count,
  b.commercial_logic_raw_score AS qa_commercial_logic_raw_score,
  b.commercial_logic_raw_score_status AS qa_commercial_logic_raw_score_status,
  b.commercial_logic_final_score AS qa_commercial_logic_final_score,
  b.commercial_logic_final_status AS qa_commercial_logic_final_status,
  b.commercial_logic_cap_applied AS qa_commercial_logic_cap_applied,
  b.commercial_logic_primary_cap_reason AS qa_commercial_logic_primary_cap_reason,
  b.commercial_logic_cap_reasons_summary AS qa_commercial_logic_cap_reasons,
  b.commercial_logic_short_explanation AS qa_commercial_logic_explanation,
  b.commercial_logic_warnings_summary AS qa_commercial_logic_warnings,
  b.commercial_logic_reviews_summary AS qa_commercial_logic_reviews,
  b.competitive_awareness_status,
  b.competitive_seller_implication,
  b.competitive_applicability,
  b.competitive_confidence,
  b.competitive_awareness,
  b.competitive_vendors_summary,
  b.competitive_sources_summary,
  COALESCE(p.products_summary, '') AS products_summary,
  jsonb_array_length(b.conditional_attach_candidates) AS conditional_attach_candidate_count,
  COALESCE(ca.conditional_attach_candidates_summary, '') AS conditional_attach_candidates_summary
FROM base b
LEFT JOIN products p
  ON p.opportunity_candidate_id = b.opportunity_candidate_id
LEFT JOIN conditional_attach ca
  ON ca.opportunity_candidate_id = b.opportunity_candidate_id
LEFT JOIN stakeholders sh
  ON sh.opportunity_candidate_id = b.opportunity_candidate_id
LEFT JOIN account_signal_facts asf
  ON asf.opportunity_candidate_id = b.opportunity_candidate_id
LEFT JOIN signal_confirmations sc
  ON sc.opportunity_candidate_id = b.opportunity_candidate_id
ORDER BY
  b.account,
  b.version,
  b.portfolio_priority_score DESC NULLS LAST,
  b.entity,
  b.rank_position NULLS LAST,
  b.opportunity_candidate_id;
