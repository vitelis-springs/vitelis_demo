/**
 * @jest-environment node
 */
import {
	buildDeepDiveNarrative,
	buildOverview,
} from "../../../../src/app/server/modules/deep-dive/export-opportunities/sheets";
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
});
