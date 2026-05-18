import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface GicsRowData {
	gicsCode: string;
	instruction: string | null;
	status: boolean;
}

interface ImportRow {
	rowNumber: number;
	catCode: string;
	catName: string;
	tier: number;
	subCode: string;
	signalClass: string;
	signalName: string;
	description: string;
	backbonePrompt: string | null;
	gicsData: GicsRowData[];
}

function normalizeRow(row: unknown): ImportRow | null {
	if (!isRecord(row)) return null;
	const rowNumber = typeof row.rowNumber === "number" ? row.rowNumber : 0;
	const catCode =
		typeof row.catCode === "string" && row.catCode.trim()
			? row.catCode.trim()
			: null;
	const catName =
		typeof row.catName === "string" && row.catName.trim()
			? row.catName.trim()
			: null;
	const subCode =
		typeof row.subCode === "string" && row.subCode.trim()
			? row.subCode.trim()
			: null;
	const signalClass =
		typeof row.signalClass === "string" ? row.signalClass.trim() : "";
	const signalName =
		typeof row.signalName === "string" && row.signalName.trim()
			? row.signalName.trim()
			: null;
	const description =
		typeof row.description === "string" && row.description.trim()
			? row.description.trim()
			: null;
	const backbonePrompt =
		typeof row.backbonePrompt === "string" && row.backbonePrompt.trim()
			? row.backbonePrompt.trim()
			: null;
	const tier = Number(row.tier ?? 1);

	if (!catCode || !catName || !subCode || !signalName || !description)
		return null;

	const gicsData: GicsRowData[] = Array.isArray(row.gicsData)
		? (row.gicsData as unknown[]).flatMap((g) => {
				if (!isRecord(g)) return [];
				return [
					{
						gicsCode: typeof g.gicsCode === "string" ? g.gicsCode : "",
						instruction:
							typeof g.instruction === "string" ? g.instruction : null,
						status: g.status === true,
					},
				];
			})
		: [];

	return {
		rowNumber,
		catCode,
		catName,
		tier: Number.isFinite(tier) ? tier : 1,
		subCode,
		signalClass,
		signalName,
		description,
		backbonePrompt,
		gicsData,
	};
}

export type CatAction = "create" | "update" | "activate" | "none";
export type SubAction = "create" | "update" | "activate" | "none";
export type VersionAction = "create" | "set_current" | "none";

export interface RowAction {
	rowNumber: number;
	catAction: CatAction;
	subAction: SubAction;
	versionAction: VersionAction;
	industryChanges: number;
	notes: string[];
}

export interface AnalysisSummary {
	categories: {
		create: number;
		update: number;
		activate: number;
		deactivate: number;
		deactivateList: { external_id: string; name: string }[];
	};
	subcategories: {
		create: number;
		update: number;
		activate: number;
		deactivate: number;
	};
	versions: { create: number; setCurrent: number };
	industries: {
		create: number;
		updateInstruction: number;
		updateStatus: number;
	};
}

export interface AnalysisResult {
	rowActions: RowAction[];
	summary: AnalysisSummary;
}

export async function POST(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const body = (await request.json().catch(() => null)) as unknown;
	if (!isRecord(body) || !Array.isArray(body.rows) || body.rows.length === 0) {
		return NextResponse.json(
			{ success: false, error: "rows array is required" },
			{ status: 400 },
		);
	}

	const rows = (body.rows as unknown[])
		.map(normalizeRow)
		.filter((r): r is ImportRow => r !== null);
	if (rows.length === 0) {
		return NextResponse.json(
			{ success: false, error: "No valid rows" },
			{ status: 400 },
		);
	}

	const [dbCategories, dbSubcategories] = await Promise.all([
		prisma.smSignalCategory.findMany(),
		prisma.smSignalSubcategory.findMany({
			include: {
				versions: true,
				industries: {
					include: { current_instruction: true, instructions: true },
				},
			},
		}),
	]);

	const dbCatMap = new Map(dbCategories.map((c) => [c.external_id, c]));
	const dbSubMap = new Map(dbSubcategories.map((s) => [s.external_id, s]));

	const importCatCodes = new Set(rows.map((r) => r.catCode));
	const importSubCodes = new Set(rows.map((r) => r.subCode));

	const summary: AnalysisSummary = {
		categories: {
			create: 0,
			update: 0,
			activate: 0,
			deactivate: 0,
			deactivateList: [],
		},
		subcategories: { create: 0, update: 0, activate: 0, deactivate: 0 },
		versions: { create: 0, setCurrent: 0 },
		industries: { create: 0, updateInstruction: 0, updateStatus: 0 },
	};

	// Categories to deactivate: active in DB, absent in import
	for (const dbCat of dbCategories) {
		if (dbCat.is_active && !importCatCodes.has(dbCat.external_id)) {
			summary.categories.deactivate++;
			summary.categories.deactivateList.push({
				external_id: dbCat.external_id,
				name: dbCat.name,
			});
		}
	}

	// Subcategories to deactivate
	for (const dbSub of dbSubcategories) {
		if (dbSub.is_active && !importSubCodes.has(dbSub.external_id)) {
			summary.subcategories.deactivate++;
		}
	}

	// Track which cats/subs we've already counted for summary (avoid double-counting per unique code)
	const countedCats = new Set<string>();
	const countedSubs = new Set<string>();

	const rowActions: RowAction[] = [];

	for (const row of rows) {
		const notes: string[] = [];

		// --- Category analysis ---
		let catAction: CatAction = "none";
		if (!countedCats.has(row.catCode)) {
			const dbCat = dbCatMap.get(row.catCode);
			if (!dbCat) {
				catAction = "create";
				notes.push(`cat: not in DB (external_id="${row.catCode}")`);
				summary.categories.create++;
			} else if (!dbCat.is_active) {
				catAction = "activate";
				notes.push(`cat: exists but inactive`);
				summary.categories.activate++;
			} else if (dbCat.name !== row.catName) {
				catAction = "update";
				notes.push(`cat name: "${dbCat.name}" → "${row.catName}"`);
				summary.categories.update++;
			}
			countedCats.add(row.catCode);
		}

		// --- Subcategory analysis ---
		let subAction: SubAction = "none";
		let versionAction: VersionAction = "none";
		let industryChanges = 0;

		if (!countedSubs.has(row.subCode)) {
			const dbSub = dbSubMap.get(row.subCode);
			if (!dbSub) {
				subAction = "create";
				versionAction = "create";
				industryChanges = 25;
				notes.push(`sub: not in DB (external_id="${row.subCode}")`);
				notes.push(`version: new sub → version will be created`);
				summary.subcategories.create++;
				summary.versions.create++;
				summary.industries.create += 25;
			} else {
				if (!dbSub.is_active) {
					subAction = "activate";
					notes.push(`sub: exists (id=${dbSub.id}) but inactive`);
					summary.subcategories.activate++;
				} else if (dbSub.name !== row.signalName) {
					subAction = "update";
					notes.push(`sub name: "${dbSub.name}" → "${row.signalName}"`);
					summary.subcategories.update++;
				} else if (dbSub.signal_class !== row.signalClass) {
					subAction = "update";
					notes.push(
						`sub class: "${dbSub.signal_class}" → "${row.signalClass}"`,
					);
					summary.subcategories.update++;
				}

				// Version analysis
				const dbPrompt = row.backbonePrompt ?? "";
				const existingVersion = dbSub.versions.find(
					(v) => v.definition === row.description && v.prompt === dbPrompt,
				);
				if (!existingVersion) {
					versionAction = "create";
					notes.push(
						`version: no match among ${dbSub.versions.length} existing` +
							(dbSub.versions.length > 0
								? ` (first stored prompt="${dbSub.versions[0]?.prompt?.substring(0, 40) ?? ""}…")`
								: ""),
					);
					summary.versions.create++;
				} else if (
					dbSub.sm_signal_subcategories_current_version_id === null ||
					dbSub.sm_signal_subcategories_current_version_id !==
						existingVersion.id
				) {
					versionAction = "set_current";
					notes.push(
						`version: match found (id=${existingVersion.id}) but not current`,
					);
					summary.versions.setCurrent++;
				} else {
					notes.push(`version: match found, already current`);
				}

				// Industry analysis
				const instrNewVersionGics: string[] = [];
				const instrSwitchVersionGics: string[] = [];
				const statusUpdateGics: string[] = [];

				for (const gicsEntry of row.gicsData) {
					const dbIndustry = dbSub.industries.find(
						(i) => i.gics_code === gicsEntry.gicsCode,
					);
					if (!dbIndustry) {
						industryChanges++;
						summary.industries.create++;
					} else {
						const currentInstruction =
							dbIndustry.current_instruction?.instruction ?? null;
						const newInstruction = gicsEntry.instruction;
						if (currentInstruction !== newInstruction) {
							industryChanges++;
							summary.industries.updateInstruction++;
							const existsInHistory =
								newInstruction !== null &&
								dbIndustry.instructions.some(
									(i) => i.instruction === newInstruction,
								);
							if (existsInHistory) {
								instrSwitchVersionGics.push(gicsEntry.gicsCode);
							} else {
								instrNewVersionGics.push(gicsEntry.gicsCode);
							}
						}
						if (dbIndustry.status !== gicsEntry.status) {
							statusUpdateGics.push(gicsEntry.gicsCode);
							industryChanges++;
							summary.industries.updateStatus++;
						}
					}
				}

				if (instrNewVersionGics.length > 0) {
					notes.push(
						`instr: new version will be created for gics ${instrNewVersionGics.join(", ")}`,
					);
				}
				if (instrSwitchVersionGics.length > 0) {
					notes.push(
						`instr: switch to existing version for gics ${instrSwitchVersionGics.join(", ")}`,
					);
				}
				if (statusUpdateGics.length > 0) {
					notes.push(`status update for gics ${statusUpdateGics.join(", ")}`);
				}
			}
			countedSubs.add(row.subCode);
		}

		rowActions.push({
			rowNumber: row.rowNumber,
			catAction,
			subAction,
			versionAction,
			industryChanges,
			notes,
		});
	}

	return NextResponse.json({ success: true, data: { rowActions, summary } });
}
