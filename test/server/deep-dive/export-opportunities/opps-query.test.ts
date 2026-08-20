/**
 * @jest-environment node
 */
import { loadRawExport } from "../../../../src/app/server/modules/deep-dive/export-opportunities/opps-query";

/** Captures the SQL the loader builds without touching a database. */
function makeClient() {
	const queries: string[] = [];
	return {
		queries,
		client: {
			$queryRawUnsafe: async <T>(sql: string): Promise<T> => {
				queries.push(sql);
				// First call resolves the ranking version, later ones read rows.
				return [] as unknown as T;
			},
		},
	};
}

describe("loadRawExport approval filter", () => {
	it("defaults to approved opportunities, as the report export always has", async () => {
		const { client, queries } = makeClient();

		await loadRawExport(client, { reportId: 217 });

		const exportQuery = queries[queries.length - 1] ?? "";
		expect(exportQuery).toContain("AND oc.is_approved IS TRUE");
		expect(exportQuery).not.toContain("{{APPROVAL_FILTER}}");
	});

	it("selects only opportunities left out of the export", async () => {
		const { client, queries } = makeClient();

		await loadRawExport(client, { reportId: 217, approval: "unapproved" });

		expect(queries[queries.length - 1]).toContain(
			"AND oc.is_approved IS NOT TRUE",
		);
	});

	it("drops the approval condition entirely when asked for all", async () => {
		const { client, queries } = makeClient();

		await loadRawExport(client, { reportId: 217, approval: "all" });

		const exportQuery = queries[queries.length - 1] ?? "";
		expect(exportQuery).not.toContain("is_approved");
		expect(exportQuery).not.toContain("{{APPROVAL_FILTER}}");
	});

	it("narrows to the requested accounts", async () => {
		const { client, queries } = makeClient();

		await loadRawExport(client, {
			reportId: 217,
			companyIds: [2690, 2921],
			rankingVersion: null,
		});

		expect(queries[queries.length - 1]).toContain(
			"ARRAY[2690,2921]::integer[] AS company_ids",
		);
	});
});
