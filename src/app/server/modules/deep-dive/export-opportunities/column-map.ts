/**
 * Field map for opportunity Excel export sheets.
 *
 * Source of truth: OPPS_QUERY.sql result columns (snake_case aliases).
 *
 * Sheet population summary:
 * - 00 Overview: aggregates from opportunity_candidate_id, account, is_selected,
 *   portfolio_priority_score, horizon, delivery_type, solution_center, QA statuses/counts,
 *   stakeholders_count, competitive_awareness_status
 * - 01 Portfolio: identification, prioritization, commercial, product/stakeholder/competitive
 *   summaries, compact QA scores/statuses
 * - 02 Details: long commercial + entity/signal/competitive/product/notes text fields
 * - 03 Stakeholders / 04 Outreach: parsed from `stakeholders` multiline (when parseable)
 * - 05 Products: parsed from `products_summary`
 * - 06 Signals & Evidence: parsed from account signal confirmation summaries
 * - 07 Competitive Awareness: parsed from competitive_vendors_summary / sources
 * - 08 QA Summary: compact QA status/score/count fields
 * - 09 QA Details: remaining QA diagnostic / summary text columns
 * - 10 Deep Dive Narrative: wide pivot of key narrative properties
 * - 12 MEDDPICC: wide pivot of meddpicc property (summary + sources per section)
 * - 13 Next Best Actions: parsed from nextBestActions property (long format; one row per action)
 * - 14 Competitive Analysis: parsed from competitiveAnalysis property (one row per opportunity)
 * - 15 Discovery Questions: parsed from discoveryQuestions property (long format; one row per question)
 * - 16 What To Offer: parsed from whatToOffer property (one row per opportunity)
 * - 17 Proof Points: parsed from proofPoints property (long format; one row per proof point)
 * - 18 Why Now: parsed from whyNow property (one row per opportunity)
 * - 99 Raw Export: every OPPS_QUERY column (display headers below)
 */

import type { SheetColumnDef } from "./types";

/** Display headers for 99 Raw Export (must cover every SQL select alias). */
export const RAW_EXPORT_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "is_selected", title: "Selected", width: 10, format: "text" },
	{ field: "account", title: "Account", width: 28 },
	{ field: "entity", title: "Entity", width: 28, wrap: true },
	{
		field: "secondary_entities",
		title: "Secondary Entities",
		width: 30,
		wrap: true,
	},
	{
		field: "entity_scope_classification",
		title: "Entity Scope Classification",
		width: 22,
	},
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 40,
		wrap: true,
	},
	{ field: "seed_id", title: "Seed ID", width: 14, format: "id" },
	{
		field: "account_signals_trigger_lineage",
		title: "Account Signals - Trigger Lineage",
		width: 50,
		wrap: true,
	},
	{
		field: "signal_to_product_evidence_basis",
		title: "Signal-to-Product Evidence Basis",
		width: 50,
		wrap: true,
	},
	{
		field: "account_signals_audit_fact_count",
		title: "Account Signals - Audit Fact Count",
		width: 12,
		format: "number",
	},
	{
		field: "account_signals_audit_facts",
		title: "Account Signals - Audit Facts",
		width: 50,
		wrap: true,
	},
	{
		field: "account_signals_audit_source",
		title: "Account Signals - Audit Source",
		width: 18,
	},
	{
		field: "account_signals_signal_confirmation_count",
		title: "Account Signals - Signal Confirmation Count",
		width: 12,
		format: "number",
	},
	{
		field: "account_signals_signal_confirmations",
		title: "Account Signals - Signal Confirmations",
		width: 55,
		wrap: true,
	},
	{ field: "rank_position", title: "Rank", width: 8, format: "number" },
	{
		field: "portfolio_priority_score",
		title: "Portfolio Priority Score",
		width: 14,
		format: "number",
	},
	{
		field: "portfolio_priority_reason",
		title: "Portfolio Priority Reason",
		width: 45,
		wrap: true,
	},
	{ field: "horizon", title: "Horizon", width: 14 },
	{ field: "horizon_name", title: "Horizon Name", width: 18 },
	{
		field: "horizon_confidence",
		title: "Horizon Confidence",
		width: 14,
		format: "number",
	},
	{
		field: "horizon_reasoning",
		title: "Horizon Reasoning",
		width: 45,
		wrap: true,
	},
	{ field: "indicative_deal_size_range", title: "Deal Size Range", width: 18 },
	{ field: "deal_size_general", title: "Deal Size General", width: 18 },
	{ field: "time_label_general", title: "Time Label General", width: 18 },
	{ field: "delivery_type", title: "Delivery Type", width: 16 },
	{ field: "track_1_entity", title: "Track 1 Entity", width: 24 },
	{
		field: "track_2_entities",
		title: "Track 2 Entities",
		width: 28,
		wrap: true,
	},
	{ field: "why_now", title: "Why Now", width: 45, wrap: true },
	{ field: "notes", title: "Notes", width: 40, wrap: true },
	{
		field: "primary_business_problem",
		title: "Primary Business Problem",
		width: 40,
		wrap: true,
	},
	{ field: "primary_buyer_persona", title: "Primary Buyer Persona", width: 28 },
	{
		field: "stakeholders_count",
		title: "Stakeholders - Count",
		width: 12,
		format: "number",
	},
	{
		field: "stakeholders_email_count",
		title: "Stakeholders - Email Count",
		width: 12,
		format: "number",
	},
	{ field: "stakeholders", title: "Stakeholders", width: 55, wrap: true },
	{
		field: "stakeholders_revalidation",
		title: "Stakeholders - Revalidation",
		width: 45,
		wrap: true,
	},
	{
		field: "stakeholders_missing_person_count",
		title: "Stakeholders - Missing Person Count",
		width: 12,
		format: "number",
	},
	{
		field: "primary_value_proposition",
		title: "Primary Value Proposition",
		width: 40,
		wrap: true,
	},
	{ field: "solution_center", title: "Solution Center", width: 22 },
	{
		field: "competitive_incumbent_awareness",
		title: "Competitive / incumbent awareness",
		width: 45,
		wrap: true,
	},
	{
		field: "quality_assessment_summary",
		title: "Quality Assessment - Summary",
		width: 40,
		wrap: true,
	},
	{
		field: "quality_assessment_explanation",
		title: "Quality Assessment - Explanation",
		width: 45,
		wrap: true,
	},
	{
		field: "qa_grounding_status",
		title: "QA Grounding - Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_grounding_score",
		title: "QA Grounding - Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_grounding_evidence_level",
		title: "QA Grounding - Evidence Level",
		width: 16,
	},
	{
		field: "qa_grounding_deterministic_base_score",
		title: "QA Grounding - Deterministic Base Score",
		width: 14,
		format: "number",
	},
	{
		field: "qa_grounding_recommended_action",
		title: "QA Grounding - Recommended Action",
		width: 22,
	},
	{
		field: "qa_grounding_claim_review_status",
		title: "QA Grounding - Claim Review Status",
		width: 18,
		format: "status",
	},
	{
		field: "qa_grounding_claim_review_penalty",
		title: "QA Grounding - Claim Review Penalty",
		width: 14,
		format: "number",
	},
	{
		field: "qa_grounding_claim_review_penalty_cap",
		title: "QA Grounding - Claim Review Penalty Cap",
		width: 14,
		format: "number",
	},
	{
		field: "qa_grounding_unsupported_claim_count",
		title: "QA Grounding - Unsupported Claim Count",
		width: 12,
		format: "count",
	},
	{
		field: "qa_grounding_overstated_claim_count",
		title: "QA Grounding - Overstated Claim Count",
		width: 12,
		format: "count",
	},
	{
		field: "qa_grounding_warning_count",
		title: "QA Grounding - Warning Count",
		width: 12,
		format: "count",
	},
	{
		field: "qa_grounding_reasoning",
		title: "QA Grounding - Reasoning",
		width: 45,
		wrap: true,
	},
	{
		field: "qa_grounding_claim_review_reasoning",
		title: "QA Grounding - Claim Review Reasoning",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_grounding_warnings",
		title: "QA Grounding - Warnings",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_grounding_supported_claims",
		title: "QA Grounding - Supported Claims",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_grounding_inferred_claims",
		title: "QA Grounding - Inferred Claims",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_grounding_unsupported_claims",
		title: "QA Grounding - Unsupported Claims",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_grounding_overstated_claims",
		title: "QA Grounding - Overstated Claims",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_traceability_status",
		title: "QA Traceability - Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_traceability_score",
		title: "QA Traceability - Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_url_status",
		title: "QA Traceability - URL Status",
		width: 16,
	},
	{
		field: "qa_traceability_selected_source_ref_count",
		title: "QA Traceability - Selected Source Ref Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_selected_product_fit_source_count",
		title: "QA Traceability - Selected Product Fit Source Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_selected_signal_confirmation_source_count",
		title: "QA Traceability - Selected Signal Confirmation Source Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_available_product_fit_url_count",
		title: "QA Traceability - Available Product Fit URL Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_available_signal_confirmation_url_count",
		title: "QA Traceability - Available Signal Confirmation URL Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_source_url_score",
		title: "QA Traceability - Source URL Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_signal_score",
		title: "QA Traceability - Signal Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_decision_score",
		title: "QA Traceability - Decision Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_validation_score",
		title: "QA Traceability - Validation Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_product_fit_score",
		title: "QA Traceability - Product Fit Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_audit_completeness_score",
		title: "QA Traceability - Audit Completeness Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_explanation",
		title: "QA Traceability - Explanation",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_traceability_source_refs",
		title: "QA Traceability - Source Refs",
		width: 45,
		wrap: true,
	},
	{
		field: "qa_traceability_warnings",
		title: "QA Traceability - Warnings",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_traceability_missing_layers",
		title: "QA Traceability - Missing Layers",
		width: 35,
		wrap: true,
	},
	{
		field: "qa_company_binding_status",
		title: "QA Company Binding - Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_company_binding_score",
		title: "QA Company Binding - Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_review_status",
		title: "QA Company Binding - Review Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_company_binding_source_level_score",
		title: "QA Company Binding - Source Level Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_trigger_signal_score",
		title: "QA Company Binding - Trigger Signal Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_scope_entity_score",
		title: "QA Company Binding - Scope Entity Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_ambiguity_score",
		title: "QA Company Binding - Ambiguity Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_review_completeness_score",
		title: "QA Company Binding - Review Completeness Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_strong_source_count",
		title: "QA Company Binding - Strong Source Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_acceptable_source_count",
		title: "QA Company Binding - Acceptable Source Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_weak_source_count",
		title: "QA Company Binding - Weak Source Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_not_bound_source_count",
		title: "QA Company Binding - Not Bound Source Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_unknown_source_count",
		title: "QA Company Binding - Unknown Source Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_primary_company_evidence_count",
		title: "QA Company Binding - Primary Company Evidence Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_affiliate_or_brand_context_count",
		title: "QA Company Binding - Affiliate / Brand Context Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_geo_proxy_context_count",
		title: "QA Company Binding - Geo Proxy Context Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_target_company",
		title: "QA Company Binding - Target Company",
		width: 24,
	},
	{
		field: "qa_company_binding_company_prompt",
		title: "QA Company Binding - Company Prompt",
		width: 30,
		wrap: true,
	},
	{
		field: "qa_company_binding_explanation",
		title: "QA Company Binding - Explanation",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_company_binding_warnings",
		title: "QA Company Binding - Warnings",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_company_binding_source_reviews",
		title: "QA Company Binding - Source Reviews",
		width: 45,
		wrap: true,
	},
	{
		field: "qa_customer_relevance_status",
		title: "QA Customer Relevance - Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_customer_relevance_score",
		title: "QA Customer Relevance - Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_review_status",
		title: "QA Customer Relevance - Review Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_customer_relevance_stage",
		title: "QA Customer Relevance - Stage",
		width: 16,
	},
	{
		field: "qa_customer_relevance_product_catalog_score",
		title: "QA Customer Relevance - Product Catalog Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_product_fit_evidence_score",
		title: "QA Customer Relevance - Product Fit Evidence Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_bundle_discipline_score",
		title: "QA Customer Relevance - Bundle Discipline Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_seller_actionability_score",
		title: "QA Customer Relevance - Seller Actionability Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_overreach_control_score",
		title: "QA Customer Relevance - Overreach Control Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_directly_relevant_product_count",
		title: "QA Customer Relevance - Directly Relevant Product Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_proxy_relevant_product_count",
		title: "QA Customer Relevance - Proxy Relevant Product Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_conditionally_relevant_product_count",
		title: "QA Customer Relevance - Conditionally Relevant Product Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_weak_or_speculative_product_count",
		title: "QA Customer Relevance - Weak / Speculative Product Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_not_relevant_product_count",
		title: "QA Customer Relevance - Not Relevant Product Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_unscored_product_count",
		title: "QA Customer Relevance - Unscored Product Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_hypothesis_only_product_count",
		title: "QA Customer Relevance - Hypothesis Only Product Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_missing_scoring_result_count",
		title: "QA Customer Relevance - Missing Scoring Result Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_validation_required_product_count",
		title: "QA Customer Relevance - Validation Required Product Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_raw_score",
		title: "QA Customer Relevance - Raw Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_raw_score_status",
		title: "QA Customer Relevance - Raw Score Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_customer_relevance_final_score",
		title: "QA Customer Relevance - Final Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_final_status",
		title: "QA Customer Relevance - Final Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_customer_relevance_cap_applied",
		title: "QA Customer Relevance - Cap Applied",
		width: 12,
		format: "boolean",
	},
	{
		field: "qa_customer_relevance_primary_cap_reason",
		title: "QA Customer Relevance - Primary Cap Reason",
		width: 28,
		wrap: true,
	},
	{
		field: "qa_customer_relevance_cap_reasons",
		title: "QA Customer Relevance - Cap Reasons",
		width: 35,
		wrap: true,
	},
	{
		field: "qa_customer_relevance_explanation",
		title: "QA Customer Relevance - Explanation",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_customer_relevance_warnings",
		title: "QA Customer Relevance - Warnings",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_customer_relevance_product_reviews",
		title: "QA Customer Relevance - Product Reviews",
		width: 45,
		wrap: true,
	},
	{
		field: "qa_commercial_logic_status",
		title: "QA Commercial Logic - Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_commercial_logic_score",
		title: "QA Commercial Logic - Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_review_status",
		title: "QA Commercial Logic - Review Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_commercial_logic_stage",
		title: "QA Commercial Logic - Stage",
		width: 16,
	},
	{
		field: "qa_commercial_logic_trigger_causality_score",
		title: "QA Commercial Logic - Trigger Causality Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_problem_value_coherence_score",
		title: "QA Commercial Logic - Problem / Value Coherence Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_buyer_path_stage_score",
		title: "QA Commercial Logic - Buyer Path / Stage Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_actionability_score",
		title: "QA Commercial Logic - Actionability Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_sequencing_dependency_score",
		title: "QA Commercial Logic - Sequencing / Dependency Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_overreach_control_score",
		title: "QA Commercial Logic - Overreach Control Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_strong_area_count",
		title: "QA Commercial Logic - Strong Area Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_acceptable_area_count",
		title: "QA Commercial Logic - Acceptable Area Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_weak_area_count",
		title: "QA Commercial Logic - Weak Area Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_invalid_area_count",
		title: "QA Commercial Logic - Invalid Area Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_overreach_risk_count",
		title: "QA Commercial Logic - Overreach Risk Count",
		width: 12,
		format: "count",
	},
	{
		field: "qa_commercial_logic_buyer_path_risk_count",
		title: "QA Commercial Logic - Buyer Path Risk Count",
		width: 12,
		format: "count",
	},
	{
		field: "qa_commercial_logic_stage_mismatch_count",
		title: "QA Commercial Logic - Stage Mismatch Count",
		width: 12,
		format: "count",
	},
	{
		field: "qa_commercial_logic_sequencing_risk_count",
		title: "QA Commercial Logic - Sequencing Risk Count",
		width: 12,
		format: "count",
	},
	{
		field: "qa_commercial_logic_actionability_risk_count",
		title: "QA Commercial Logic - Actionability Risk Count",
		width: 12,
		format: "count",
	},
	{
		field: "qa_commercial_logic_safe_discovery_indicator_count",
		title: "QA Commercial Logic - Safe Discovery Indicator Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_raw_score",
		title: "QA Commercial Logic - Raw Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_raw_score_status",
		title: "QA Commercial Logic - Raw Score Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_commercial_logic_final_score",
		title: "QA Commercial Logic - Final Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_final_status",
		title: "QA Commercial Logic - Final Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_commercial_logic_cap_applied",
		title: "QA Commercial Logic - Cap Applied",
		width: 12,
		format: "boolean",
	},
	{
		field: "qa_commercial_logic_primary_cap_reason",
		title: "QA Commercial Logic - Primary Cap Reason",
		width: 28,
		wrap: true,
	},
	{
		field: "qa_commercial_logic_cap_reasons",
		title: "QA Commercial Logic - Cap Reasons",
		width: 35,
		wrap: true,
	},
	{
		field: "qa_commercial_logic_explanation",
		title: "QA Commercial Logic - Explanation",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_commercial_logic_warnings",
		title: "QA Commercial Logic - Warnings",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_commercial_logic_reviews",
		title: "QA Commercial Logic - Reviews",
		width: 45,
		wrap: true,
	},
	{
		field: "competitive_awareness_status",
		title: "Competitive Awareness Status",
		width: 18,
	},
	{
		field: "competitive_seller_implication",
		title: "Competitive Seller Implication",
		width: 35,
		wrap: true,
	},
	{
		field: "competitive_applicability",
		title: "Competitive Applicability",
		width: 18,
	},
	{
		field: "competitive_confidence",
		title: "Competitive Confidence",
		width: 14,
		format: "number",
	},
	{
		field: "competitive_vendors_summary",
		title: "Competitive Vendors Summary",
		width: 40,
		wrap: true,
	},
	{
		field: "competitive_sources_summary",
		title: "Competitive Sources Summary",
		width: 45,
		wrap: true,
	},
	{ field: "products_summary", title: "Products", width: 55, wrap: true },
	{
		field: "conditional_attach_candidate_count",
		title: "Conditional Attach Count",
		width: 12,
		format: "number",
	},
	{
		field: "conditional_attach_candidates_summary",
		title: "Conditional Attach Candidates",
		width: 55,
		wrap: true,
	},
];

export const PORTFOLIO_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "is_selected", title: "Selected", width: 10 },
	{ field: "account", title: "Account", width: 24 },
	{ field: "entity", title: "Entity", width: 24, wrap: true },
	{
		field: "secondary_entities",
		title: "Secondary Entities",
		width: 28,
		wrap: true,
	},
	{
		field: "entity_scope_classification",
		title: "Entity Scope Classification",
		width: 22,
	},
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{ field: "rank_position", title: "Rank", width: 8, format: "number" },
	{ field: "priority_label", title: "Priority", width: 12 },
	{
		field: "portfolio_priority_score",
		title: "Portfolio Priority Score",
		width: 14,
		format: "number",
	},
	{
		field: "portfolio_priority_reason",
		title: "Portfolio Priority Reason",
		width: 40,
		wrap: true,
	},
	{ field: "deal_size_general", title: "Deal Size General", width: 18 },
	{ field: "time_label_general", title: "Time Label General", width: 18 },
	{ field: "why_now", title: "Why Now", width: 36, wrap: true },
	{ field: "notes", title: "Notes", width: 36, wrap: true },
	{
		field: "primary_business_problem",
		title: "Primary Business Problem",
		width: 32,
		wrap: true,
	},
	{ field: "primary_buyer_persona", title: "Primary Buyer Persona", width: 24 },
	{
		field: "primary_value_proposition",
		title: "Value Proposition",
		width: 32,
		wrap: true,
	},
	{ field: "solution_center", title: "Solution Center", width: 18 },
	{ field: "primary_product", title: "Primary Product", width: 24 },
	{
		field: "product_bundle_summary",
		title: "Product Bundle Summary",
		width: 36,
		wrap: true,
	},
	{
		field: "product_count",
		title: "Product Count",
		width: 10,
		format: "number",
	},
	{
		field: "stakeholders_count",
		title: "Stakeholder Count",
		width: 12,
		format: "number",
	},
	{
		field: "key_stakeholders",
		title: "Key Stakeholders",
		width: 36,
		wrap: true,
	},
	{
		field: "decision_maker_identified",
		title: "Decision Maker Identified",
		width: 14,
		format: "boolean",
	},
	{
		field: "competitive_awareness_status",
		title: "Competitive Status",
		width: 16,
		format: "status",
	},
	{
		field: "main_incumbent_or_vendor",
		title: "Main Incumbent or Vendor",
		width: 24,
	},
	{
		field: "competitive_seller_implication",
		title: "Seller Implication",
		width: 32,
		wrap: true,
	},
	{
		field: "qa_grounding_status",
		title: "Grounding Status",
		width: 14,
		format: "status",
	},
	{
		field: "qa_grounding_score",
		title: "Grounding Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_status",
		title: "Traceability Status",
		width: 14,
		format: "status",
	},
	{
		field: "qa_traceability_score",
		title: "Traceability Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_status",
		title: "Company Binding Status",
		width: 14,
		format: "status",
	},
	{
		field: "qa_company_binding_score",
		title: "Company Binding Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_status",
		title: "Customer Relevance Status",
		width: 14,
		format: "status",
	},
	{
		field: "qa_customer_relevance_score",
		title: "Customer Relevance Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_status",
		title: "Commercial Logic Status",
		width: 14,
		format: "status",
	},
	{
		field: "qa_commercial_logic_score",
		title: "Commercial Logic Score",
		width: 12,
		format: "number",
	},
	{
		field: "warning_count",
		title: "Warning Count",
		width: 10,
		format: "count",
	},
	{
		field: "unsupported_claim_count",
		title: "Unsupported Claim Count",
		width: 12,
		format: "count",
	},
	{
		field: "human_review_required",
		title: "Human Review Required",
		width: 14,
		format: "boolean",
	},
];

export const DETAILS_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{ field: "horizon", title: "Horizon", width: 14 },
	{
		field: "horizon_reasoning",
		title: "Horizon Reasoning",
		width: 40,
		wrap: true,
	},
	{ field: "indicative_deal_size_range", title: "Deal Size", width: 16 },
	{ field: "delivery_type", title: "Delivery Type", width: 14 },
	{
		field: "signal_to_product_evidence_basis",
		title: "Signal-to-Product Evidence Basis",
		width: 45,
		wrap: true,
	},
	{
		field: "conditional_attach_candidates_summary",
		title: "Conditional Attach Candidates",
		width: 45,
		wrap: true,
	},
	{
		field: "account_signals_trigger_lineage",
		title: "Account Signals - Trigger Lineage",
		width: 45,
		wrap: true,
	},
];

export const QA_SUMMARY_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{
		field: "qa_grounding_status",
		title: "Grounding Status",
		width: 14,
		format: "status",
	},
	{
		field: "qa_grounding_score",
		title: "Grounding Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_status",
		title: "Traceability Status",
		width: 14,
		format: "status",
	},
	{
		field: "qa_traceability_score",
		title: "Traceability Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_company_binding_status",
		title: "Company Binding Status",
		width: 14,
		format: "status",
	},
	{
		field: "qa_company_binding_score",
		title: "Company Binding Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_customer_relevance_status",
		title: "Customer Relevance Status",
		width: 14,
		format: "status",
	},
	{
		field: "qa_customer_relevance_score",
		title: "Customer Relevance Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_commercial_logic_status",
		title: "Commercial Logic Status",
		width: 14,
		format: "status",
	},
	{
		field: "qa_commercial_logic_score",
		title: "Commercial Logic Score",
		width: 12,
		format: "number",
	},
	{
		field: "unsupported_claim_count",
		title: "Unsupported Claim Count",
		width: 12,
		format: "count",
	},
	{
		field: "overstated_claim_count",
		title: "Overstated Claim Count",
		width: 12,
		format: "count",
	},
	{
		field: "warning_count",
		title: "Warning Count",
		width: 10,
		format: "count",
	},
	{
		field: "missing_trace_layer_count",
		title: "Missing Trace Layer Count",
		width: 12,
		format: "count",
	},
	{
		field: "human_review_required",
		title: "Human Review Required",
		width: 14,
		format: "boolean",
	},
	{
		field: "recommended_action",
		title: "Recommended Action",
		width: 28,
		wrap: true,
	},
];

/** Remaining QA diagnostic fields for 09 QA Details (one row per opportunity). */
export const QA_DETAILS_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{
		field: "quality_assessment_summary",
		title: "QA Summary Text",
		width: 40,
		wrap: true,
	},
	{
		field: "quality_assessment_explanation",
		title: "QA Explanation Text",
		width: 45,
		wrap: true,
	},
	{
		field: "qa_grounding_evidence_level",
		title: "Grounding Evidence Level",
		width: 16,
	},
	{
		field: "qa_grounding_deterministic_base_score",
		title: "Grounding Deterministic Base Score",
		width: 14,
		format: "number",
	},
	{
		field: "qa_grounding_recommended_action",
		title: "Grounding Recommended Action",
		width: 22,
	},
	{
		field: "qa_grounding_claim_review_status",
		title: "Grounding Claim Review Status",
		width: 18,
		format: "status",
	},
	{
		field: "qa_grounding_claim_review_penalty",
		title: "Grounding Claim Review Penalty",
		width: 12,
		format: "number",
	},
	{
		field: "qa_grounding_claim_review_penalty_cap",
		title: "Grounding Claim Review Penalty Cap",
		width: 12,
		format: "number",
	},
	{
		field: "qa_grounding_reasoning",
		title: "Grounding Reasoning",
		width: 45,
		wrap: true,
	},
	{
		field: "qa_grounding_claim_review_reasoning",
		title: "Grounding Claim Review Reasoning",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_grounding_warnings",
		title: "Grounding Warnings",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_grounding_supported_claims",
		title: "Supported Claims",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_grounding_inferred_claims",
		title: "Inferred Claims",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_grounding_unsupported_claims",
		title: "Unsupported Claims",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_grounding_overstated_claims",
		title: "Overstated Claims",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_traceability_url_status",
		title: "Traceability URL Status",
		width: 16,
	},
	{
		field: "qa_traceability_selected_source_ref_count",
		title: "Selected Source Ref Count",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_source_url_score",
		title: "Source URL Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_signal_score",
		title: "Signal Traceability Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_decision_score",
		title: "Decision Traceability Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_validation_score",
		title: "Validation Traceability Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_product_fit_score",
		title: "Product Fit Traceability Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_audit_completeness_score",
		title: "Audit Completeness Score",
		width: 12,
		format: "number",
	},
	{
		field: "qa_traceability_explanation",
		title: "Traceability Explanation",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_traceability_source_refs",
		title: "Traceability Source Refs",
		width: 45,
		wrap: true,
	},
	{
		field: "qa_traceability_warnings",
		title: "Traceability Warnings",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_traceability_missing_layers",
		title: "Missing Trace Layers",
		width: 35,
		wrap: true,
	},
	{
		field: "qa_company_binding_review_status",
		title: "Company Binding Review Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_company_binding_explanation",
		title: "Company Binding Explanation",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_company_binding_warnings",
		title: "Company Binding Warnings",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_company_binding_source_reviews",
		title: "Company Binding Source Reviews",
		width: 45,
		wrap: true,
	},
	{
		field: "qa_customer_relevance_review_status",
		title: "Customer Relevance Review Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_customer_relevance_stage",
		title: "Customer Relevance Stage",
		width: 16,
	},
	{
		field: "qa_customer_relevance_cap_applied",
		title: "Customer Relevance Cap Applied",
		width: 12,
		format: "boolean",
	},
	{
		field: "qa_customer_relevance_primary_cap_reason",
		title: "Customer Relevance Primary Cap Reason",
		width: 28,
		wrap: true,
	},
	{
		field: "qa_customer_relevance_cap_reasons",
		title: "Customer Relevance Cap Reasons",
		width: 35,
		wrap: true,
	},
	{
		field: "qa_customer_relevance_explanation",
		title: "Customer Relevance Explanation",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_customer_relevance_warnings",
		title: "Customer Relevance Warnings",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_customer_relevance_product_reviews",
		title: "Customer Relevance Product Reviews",
		width: 45,
		wrap: true,
	},
	{
		field: "qa_commercial_logic_review_status",
		title: "Commercial Logic Review Status",
		width: 16,
		format: "status",
	},
	{
		field: "qa_commercial_logic_stage",
		title: "Commercial Logic Stage",
		width: 16,
	},
	{
		field: "qa_commercial_logic_cap_applied",
		title: "Commercial Logic Cap Applied",
		width: 12,
		format: "boolean",
	},
	{
		field: "qa_commercial_logic_primary_cap_reason",
		title: "Commercial Logic Primary Cap Reason",
		width: 28,
		wrap: true,
	},
	{
		field: "qa_commercial_logic_cap_reasons",
		title: "Commercial Logic Cap Reasons",
		width: 35,
		wrap: true,
	},
	{
		field: "qa_commercial_logic_explanation",
		title: "Commercial Logic Explanation",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_commercial_logic_warnings",
		title: "Commercial Logic Warnings",
		width: 40,
		wrap: true,
	},
	{
		field: "qa_commercial_logic_reviews",
		title: "Commercial Logic Reviews",
		width: 45,
		wrap: true,
	},
	{
		field: "account_signals_audit_facts",
		title: "Account Signals Audit Facts",
		width: 50,
		wrap: true,
	},
	{
		field: "account_signals_signal_confirmations",
		title: "Account Signals Confirmations (raw)",
		width: 50,
		wrap: true,
	},
];

/** 10 Deep Dive Narrative — one row per opportunity, selected property keys as columns. */
export const DEEP_DIVE_NARRATIVE_KEYS = [
	"primaryProblem",
	"whyWeWin",
	"whyWeCouldLose",
	"executiveSummary",
	"competitivePositioning",
] as const;

export type DeepDiveNarrativeKey = (typeof DEEP_DIVE_NARRATIVE_KEYS)[number];

export const DEEP_DIVE_NARRATIVE_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{ field: "primaryProblem", title: "Primary Problem", width: 45, wrap: true },
	{ field: "whyWeWin", title: "Why We Win", width: 45, wrap: true },
	{
		field: "whyWeCouldLose",
		title: "Why We Could Lose",
		width: 45,
		wrap: true,
	},
	{
		field: "executiveSummary",
		title: "Executive Summary",
		width: 50,
		wrap: true,
	},
	{
		field: "competitivePositioning",
		title: "Competitive Positioning",
		width: 50,
		wrap: true,
	},
];

/** Deep-dive property key for MEDDPICC (exported on sheet 12). */
export const MEDDPICC_PROPERTY_KEY = "meddpicc";

/** Deep-dive property key for Next Best Actions (exported on sheet 13). */
export const NEXT_BEST_ACTIONS_PROPERTY_KEY = "nextBestActions";

/** Deep-dive property key for Competitive Analysis (exported on sheet 14). */
export const COMPETITIVE_ANALYSIS_PROPERTY_KEY = "competitiveAnalysis";

/** 14 Competitive Analysis — one row per opportunity, parsed from the competitiveAnalysis property. */
export const COMPETITIVE_ANALYSIS_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{
		field: "incumbent_vendor",
		title: "Incumbent Vendor",
		width: 28,
		wrap: true,
	},
	{
		field: "incumbent_strength",
		title: "Incumbent Strength",
		width: 45,
		wrap: true,
	},
	{
		field: "switching_friction",
		title: "Switching Friction",
		width: 45,
		wrap: true,
	},
	{ field: "tenant_counter", title: "Tenant Counter", width: 45, wrap: true },
	{ field: "narrative", title: "Narrative", width: 60, wrap: true },
	{ field: "win_themes", title: "Win Themes", width: 45, wrap: true },
	{ field: "incumbents", title: "Incumbents", width: 35, wrap: true },
	{ field: "sources", title: "Sources", width: 55, wrap: true },
	{
		field: "incumbent_evidence",
		title: "Incumbent Evidence",
		width: 55,
		wrap: true,
	},
];

/** Deep-dive property key for Discovery Questions (exported on sheet 15). */
export const DISCOVERY_QUESTIONS_PROPERTY_KEY = "discoveryQuestions";

/** 15 Discovery Questions — one row per opportunity × question, parsed from the discoveryQuestions property. */
export const DISCOVERY_QUESTIONS_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{ field: "sequence", title: "Sequence", width: 10, format: "number" },
	{ field: "layer", title: "Layer", width: 18 },
	{ field: "question", title: "Question", width: 55, wrap: true },
	{ field: "rationale", title: "Rationale", width: 55, wrap: true },
];

/** Deep-dive property key for What To Offer (exported on sheet 16). */
export const WHAT_TO_OFFER_PROPERTY_KEY = "whatToOffer";

/** 16 What To Offer — one row per opportunity, parsed from the whatToOffer property. */
export const WHAT_TO_OFFER_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{ field: "offering", title: "Offering", width: 28 },
	{
		field: "offering_description",
		title: "Offering Description",
		width: 45,
		wrap: true,
	},
	{ field: "approach", title: "Approach", width: 60, wrap: true },
	{
		field: "business_outcome",
		title: "Business Outcome",
		width: 45,
		wrap: true,
	},
	{
		field: "supporting_portfolio",
		title: "Supporting Portfolio",
		width: 35,
		wrap: true,
	},
];

/** Deep-dive property key for Proof Points (exported on sheet 17). */
export const PROOF_POINTS_PROPERTY_KEY = "proofPoints";

/** 17 Proof Points — one row per opportunity × proof point, parsed from the proofPoints property. */
export const PROOF_POINTS_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{ field: "sequence", title: "Sequence", width: 10, format: "number" },
	{ field: "claim", title: "Claim", width: 45, wrap: true },
	{ field: "evidence", title: "Evidence", width: 55, wrap: true },
	{ field: "source_url", title: "Source URL", width: 40, format: "hyperlink" },
	{ field: "applicability", title: "Applicability", width: 45, wrap: true },
	{
		field: "verbatim_support",
		title: "Verbatim Support",
		width: 45,
		wrap: true,
	},
];

/** Deep-dive property key for Why Now (exported on sheet 18). */
export const WHY_NOW_PROPERTY_KEY = "whyNow";

/** 18 Why Now — one row per opportunity, parsed from the whyNow property. */
export const WHY_NOW_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{ field: "confidence", title: "Confidence", width: 12, format: "number" },
	{ field: "narrative", title: "Narrative", width: 60, wrap: true },
	{ field: "sources", title: "Sources", width: 55, wrap: true },
];

/** 13 Next Best Actions — one row per opportunity × action item. */
export const NEXT_BEST_ACTIONS_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{ field: "sequence", title: "Sequence", width: 10, format: "number" },
	{ field: "due", title: "Due", width: 20 },
	{ field: "who", title: "Who", width: 28, wrap: true },
	{ field: "action", title: "Action", width: 55, wrap: true },
	{ field: "rationale", title: "Rationale", width: 45, wrap: true },
	{ field: "tool_suggested", title: "Tool Suggested", width: 22 },
];

/** MEDDPICC section keys in standard order (M-E-D-D-P-I-C-C). */
export const MEDDPICC_SECTION_KEYS = [
	"metrics",
	"economicBuyer",
	"decisionCriteria",
	"decisionProcess",
	"paperProcess",
	"identifyPain",
	"champion",
	"competition",
] as const;

export type MeddpiccSectionKey = (typeof MEDDPICC_SECTION_KEYS)[number];

const MEDDPICC_SECTION_TITLES: Record<MeddpiccSectionKey, string> = {
	metrics: "Metrics",
	economicBuyer: "Economic Buyer",
	decisionCriteria: "Decision Criteria",
	decisionProcess: "Decision Process",
	paperProcess: "Paper Process",
	identifyPain: "Identify Pain",
	champion: "Champion",
	competition: "Competition",
};

function meddpiccColumnPair(section: MeddpiccSectionKey): SheetColumnDef[] {
	const title = MEDDPICC_SECTION_TITLES[section];
	return [
		{
			field: `${section}_summary`,
			title: `${title} — Summary`,
			width: 45,
			wrap: true,
		},
		{
			field: `${section}_sources`,
			title: `${title} — Sources`,
			width: 55,
			wrap: true,
		},
	];
}

/** 12 MEDDPICC — one row per opportunity, summary + sources per section. */
export const MEDDPICC_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	...MEDDPICC_SECTION_KEYS.flatMap((section) => meddpiccColumnPair(section)),
];

export const STAKEHOLDER_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{ field: "stakeholder_id", title: "Stakeholder ID", width: 14, format: "id" },
	{ field: "gate_role", title: "Gate Role", width: 18 },
	{ field: "gate_role_type", title: "Gate Role Type", width: 14 },
	{ field: "person_name", title: "Person Name", width: 24 },
	{ field: "job_title", title: "Job Title", width: 24 },
	{ field: "entity_name", title: "Entity", width: 22 },
	{ field: "entity_level", title: "Entity Level", width: 14 },
	{ field: "email", title: "Email", width: 28, format: "hyperlink" },
	{
		field: "linkedin_url",
		title: "LinkedIn URL",
		width: 32,
		format: "hyperlink",
	},
	{
		field: "selection_rationale",
		title: "Selection Rationale",
		width: 36,
		wrap: true,
	},
	{
		field: "person_missing",
		title: "Person Missing",
		width: 12,
		format: "boolean",
	},
	{
		field: "decision_maker_flag",
		title: "Decision Maker Flag",
		width: 14,
		format: "boolean",
	},
	{
		field: "message_available",
		title: "Message Available",
		width: 14,
		format: "boolean",
	},
];

export const OUTREACH_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{ field: "stakeholder_name", title: "Stakeholder Name", width: 24 },
	{ field: "stakeholder_title", title: "Stakeholder Title", width: 24 },
	{
		field: "stakeholder_email",
		title: "Stakeholder Email",
		width: 28,
		format: "hyperlink",
	},
	{ field: "message_type", title: "Message Type", width: 14 },
	{ field: "email_subject", title: "Email Subject", width: 36, wrap: true },
	{ field: "email_body", title: "Email Body", width: 60, wrap: true },
];

export const PRODUCT_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{ field: "product_name", title: "Product Name", width: 28 },
	{ field: "item_role", title: "Item Role", width: 16 },
	{
		field: "is_primary",
		title: "Primary Product Flag",
		width: 12,
		format: "boolean",
	},
	{
		field: "required_for_close",
		title: "Required for Close",
		width: 12,
		format: "boolean",
	},
	{ field: "source_score", title: "Source Score", width: 12, format: "number" },
	{
		field: "source_confidence",
		title: "Source Confidence",
		width: 12,
		format: "number",
	},
];

export const EVIDENCE_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{ field: "seed_id", title: "Seed ID", width: 14, format: "id" },
	{
		field: "signal_definition_id",
		title: "Signal Definition ID",
		width: 14,
		format: "id",
	},
	{ field: "signal_name", title: "Signal Name", width: 28 },
	{
		field: "confirmation_id",
		title: "Confirmation ID",
		width: 14,
		format: "id",
	},
	{ field: "publisher", title: "Publisher", width: 22 },
	{ field: "source_title", title: "Source Title", width: 36, wrap: true },
	{ field: "published_date", title: "Published Date", width: 14 },
	{ field: "source_url", title: "Source URL", width: 40, format: "hyperlink" },
	{
		field: "source_confidence",
		title: "Source Confidence",
		width: 12,
		format: "number",
	},
	{
		field: "applicability_confidence",
		title: "Applicability Confidence",
		width: 12,
		format: "number",
	},
	{
		field: "normalized_claim",
		title: "Normalized Claim",
		width: 40,
		wrap: true,
	},
	{ field: "why_it_confirms", title: "Why It Confirms", width: 36, wrap: true },
	{ field: "why_it_applies", title: "Why It Applies", width: 36, wrap: true },
];

export const COMPETITIVE_COLUMNS: SheetColumnDef[] = [
	{
		field: "opportunity_candidate_id",
		title: "Opportunity ID",
		width: 14,
		format: "id",
	},
	{ field: "account", title: "Account", width: 24 },
	{
		field: "opportunity_title",
		title: "Opportunity Title",
		width: 36,
		wrap: true,
	},
	{
		field: "competitive_status",
		title: "Competitive Status",
		width: 16,
		format: "status",
	},
	{ field: "applicability", title: "Applicability", width: 16 },
	{ field: "confidence", title: "Confidence", width: 12, format: "number" },
	{
		field: "seller_implication",
		title: "Seller Implication",
		width: 36,
		wrap: true,
	},
	{
		field: "sales_implication",
		title: "Sales Implication",
		width: 42,
		wrap: true,
	},
	{
		field: "competitive_summary",
		title: "Competitive Summary",
		width: 55,
		wrap: true,
	},
	{
		field: "competitive_detail",
		title: "Competitive Detail",
		width: 60,
		wrap: true,
	},
	{
		field: "vendors_mentioned",
		title: "Vendors Mentioned",
		width: 48,
		wrap: true,
	},
	{
		field: "awareness_themes",
		title: "Awareness Themes",
		width: 58,
		wrap: true,
	},
	{
		field: "evidence_sources",
		title: "Evidence Sources Basket",
		width: 70,
		wrap: true,
	},
	{ field: "group_key", title: "Group Key", width: 28 },
	{ field: "group_name", title: "Group Name", width: 32, wrap: true },
	{ field: "generated_at", title: "Generated At", width: 22, format: "date" },
];
