/**
 * @jest-environment node
 */
import {
	buildCompetitiveAwareness,
	buildDeepDiveNarrative,
	buildOverview,
} from "../../../../src/app/server/modules/deep-dive/export-opportunities/sheets";
import { priorityLabel } from "../../../../src/app/server/modules/deep-dive/export-opportunities/parsers";
import type { RawRow } from "../../../../src/app/server/modules/deep-dive/export-opportunities/types";

describe("opportunity export sheets", () => {
	it("strips private-use citation artifacts from deep dive narrative cells", () => {
		const sheet = buildDeepDiveNarrative([
			{
				opportunity_candidate_id: 101,
				account: "Example Account",
				opportunity_title: "Modernization",
				property_key: "executiveSummary",
				value_json:
					"Cloud migration need \uE200cite\uE202turn2view0\uE201 with budget impact.",
			},
		]);

		expect(sheet?.rows[0]?.executiveSummary).toBe(
			"Cloud migration need with budget impact.",
		);
	});

	it("uses horizon and deal-size labels in overview aggregates", () => {
		const rows: RawRow[] = Array.from({ length: 13 }, (_, idx) => ({
			opportunity_candidate_id: idx + 1,
			account: `Account ${idx + 1}`,
			is_selected: "",
			horizon: "n/a",
			horizon_name: "Near-term",
			time_label_general: "This quarter",
			deal_size_general: "Enterprise",
			indicative_deal_size_range: "$250k-$500k",
			delivery_type: "n/a",
			solution_center: "n/a",
			qa_grounding_status: "pass",
			qa_grounding_unsupported_claim_count: 0,
			stakeholders_count: 1,
		}));

		const sheet = buildOverview(rows);
		const horizonBlock = sheet.metricBlocks?.find(
			(block) => block.title === "Opportunities by horizon",
		);
		const dealSizeBlock = sheet.metricBlocks?.find(
			(block) => block.title === "Opportunities by deal size",
		);

		expect(horizonBlock?.rows).toEqual([["Near-term", 13]]);
		expect(dealSizeBlock?.rows).toEqual([["Enterprise", 13]]);
	});

	it("labels portfolio priority scores consistently across 0-1 and 0-100 scales", () => {
		expect(priorityLabel(89)).toBe("High");
		expect(priorityLabel(84)).toBe("High");
		expect(priorityLabel(74)).toBe("Medium");
		expect(priorityLabel(67)).toBe("Medium");
		expect(priorityLabel(57)).toBe("Medium");
		expect(priorityLabel(49)).toBe("Low");
		expect(priorityLabel(35)).toBe("Low");

		expect(priorityLabel(0.89)).toBe("High");
		expect(priorityLabel(0.74)).toBe("Medium");
		expect(priorityLabel(0.49)).toBe("Low");
	});

	it("keeps competitive vendors and sources in separate baskets", () => {
		const sheet = buildCompetitiveAwareness(
			[
				{
					opportunity_candidate_id: 4130,
					account: "Honeywell",
					opportunity_title: "Post-spin ERP migration",
					competitive_awareness_status: "confirmed",
					competitive_applicability: "direct",
					competitive_seller_implication: "validate_first",
					competitive_awareness: {
						confidence: 0.8,
						cell_text:
							"Confirmed signs: SAP and PwC appear in public evidence.",
						detail_text:
							"Public evidence is strongest for SAP, with PwC as adjacent SI evidence.",
						sales_implication:
							"Position as complementary landing-model support.",
						vendors: [
							{
								name: "SAP",
								role: "primary ERP platform",
								evidence_strength: "confirmed",
							},
							{
								name: "PwC",
								role: "adjacent ERP implementation partner",
								evidence_strength: "possible",
							},
						],
						sources: [
							{
								title: "Supplier Information Hub",
								url: "https://www.honeywell.com/us/en/legal/supplier",
								evidence_summary: "Honeywell states SAP is primary ERP.",
							},
							{
								title: "SAP Sapphire 2026: PwC",
								url: "https://www.pwc.com/us/en/technology/alliances/sap-implementation/sap-sapphire.html",
								evidence_summary:
									"PwC describes Honeywell ERP modernization content.",
							},
						],
						awareness_lanes: [
							{
								lane_label: "ACCOUNT",
								themes: [
									{
										theme: "ERP platform footprint",
										incumbent: "SAP",
										awareness: "Honeywell says SAP is its primary ERP.",
									},
								],
							},
						],
						group_key: "post_spin_erp_shared_services_migration",
						group_name: "Post-spin ERP & shared-services migration",
						generated_at: "2026-07-20T10:43:29.136Z",
					},
				},
			],
			{},
		);

		expect(sheet?.rows).toHaveLength(1);
		expect(sheet?.rows[0]?.vendors_mentioned).toContain(
			"01 | SAP | confirmed | primary ERP platform",
		);
		expect(sheet?.rows[0]?.vendors_mentioned).toContain(
			"02 | PwC | possible | adjacent ERP implementation partner",
		);
		expect(sheet?.rows[0]?.evidence_sources).toContain(
			"01 | Supplier Information Hub",
		);
		expect(sheet?.rows[0]?.evidence_sources).toContain(
			"02 | SAP Sapphire 2026: PwC",
		);
		expect(sheet?.rows[0]?.confidence).toBe(0.8);
		expect(sheet?.rows[0]).not.toHaveProperty("source_title");
		expect(sheet?.rows[0]).not.toHaveProperty("source_url");
		expect(sheet?.rows[0]).not.toHaveProperty("vendor");
	});

	it("does not emit competitive awareness rows for not researched placeholders", () => {
		const sheet = buildCompetitiveAwareness(
			[
				{
					opportunity_candidate_id: 4131,
					account: "Honeywell",
					opportunity_title: "Placeholder opportunity",
					competitive_awareness_status: "not_researched",
				},
			],
			{},
		);

		expect(sheet).toBeNull();
	});
});
