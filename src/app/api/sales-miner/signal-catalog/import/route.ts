import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

function serializeBigInt<T>(value: T): T {
	return JSON.parse(
		JSON.stringify(value, (_key, v) =>
			typeof v === "bigint" ? v.toString() : v,
		),
	) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

interface GicsRowData {
	gicsCode: string;
	instruction: string | null;
	status: boolean;
}

interface ImportRow {
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

export async function POST(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const body = (await request.json().catch(() => null)) as unknown;
	if (!isRecord(body) || !Array.isArray(body.rows) || body.rows.length === 0) {
		return NextResponse.json(
			{ success: false, error: "rows array is required and must not be empty" },
			{ status: 400 },
		);
	}

	const rows = (body.rows as unknown[])
		.map(normalizeRow)
		.filter((r): r is ImportRow => r !== null);
	if (rows.length === 0) {
		return NextResponse.json(
			{ success: false, error: "No valid rows to import" },
			{ status: 400 },
		);
	}

	const importCatCodes = new Set(rows.map((r) => r.catCode));
	const importSubCodes = new Set(rows.map((r) => r.subCode));

	// First occurrence per code wins
	const uniqueCatMap = new Map<string, ImportRow>();
	const uniqueSubMap = new Map<string, ImportRow>();
	for (const row of rows) {
		if (!uniqueCatMap.has(row.catCode)) uniqueCatMap.set(row.catCode, row);
		if (!uniqueSubMap.has(row.subCode)) uniqueSubMap.set(row.subCode, row);
	}
	const uniqueCatRows = Array.from(uniqueCatMap.values());
	const uniqueSubRows = Array.from(uniqueSubMap.values());

	// Load all existing data upfront (2 queries instead of N findFirsts)
	const [existingCats, existingSubs] = await Promise.all([
		prisma.smSignalCategory.findMany(),
		prisma.smSignalSubcategory.findMany({
			include: {
				versions: true,
				industries: { include: { instructions: true } },
			},
		}),
	]);

	type SubFull = (typeof existingSubs)[number];
	const catByExtId = new Map<string, (typeof existingCats)[number]>();
	for (const c of existingCats) catByExtId.set(c.external_id, c);

	const subByExtId = new Map<string, SubFull>();
	for (const s of existingSubs) subByExtId.set(s.external_id, s);

	// Compute category diffs
	const catsToCreate = uniqueCatRows.filter((r) => !catByExtId.has(r.catCode));
	const catsToUpdate = uniqueCatRows.filter((r) => {
		const ex = catByExtId.get(r.catCode);
		return !!ex && (!ex.is_active || ex.name !== r.catName);
	});

	// Compute subcategory diffs
	const subsToCreate = uniqueSubRows.filter((r) => !subByExtId.has(r.subCode));
	const subsToUpdate = uniqueSubRows.filter((r) => {
		const ex = subByExtId.get(r.subCode);
		return (
			!!ex &&
			(!ex.is_active ||
				ex.name !== r.signalName ||
				ex.signal_class !== r.signalClass)
		);
	});

	// Compute version plans
	type VersionCreate = {
		action: "create";
		subCode: string;
		definition: string;
		prompt: string;
	};
	type VersionSetCurrent = {
		action: "set_current";
		subCode: string;
		versionId: bigint;
	};

	const versionPlans = uniqueSubRows.map(
		(row): VersionCreate | VersionSetCurrent | { action: "none" } => {
			const ex = subByExtId.get(row.subCode);
			const prompt = row.backbonePrompt ?? "";
			if (!ex)
				return {
					action: "create",
					subCode: row.subCode,
					definition: row.description,
					prompt,
				};
			const match = ex.versions.find(
				(v) => v.definition === row.description && v.prompt === prompt,
			);
			if (!match)
				return {
					action: "create",
					subCode: row.subCode,
					definition: row.description,
					prompt,
				};
			if (ex.sm_signal_subcategories_current_version_id !== match.id) {
				return {
					action: "set_current",
					subCode: row.subCode,
					versionId: match.id,
				};
			}
			return { action: "none" };
		},
	);

	const versionsToCreate = versionPlans.filter(
		(p): p is VersionCreate => p.action === "create",
	);
	const versionsToSetCurrent = versionPlans.filter(
		(p): p is VersionSetCurrent => p.action === "set_current",
	);

	// Compute industry and instruction diffs
	type NewIndustry = { subCode: string; gicsCode: string; status: boolean };
	type UpdateIndustryStatus = { industryId: bigint; status: boolean };
	type InstrCreate = { industryId: bigint; instruction: string };
	type InstrFkUpdate = { industryId: bigint; instructionId: bigint };

	const allNewIndustries: NewIndustry[] = [];
	const allUpdateIndustryStatus: UpdateIndustryStatus[] = [];
	const existingIndustryInstrsToCreate: InstrCreate[] = [];
	const existingIndustryInstrFkUpdates: InstrFkUpdate[] = [];
	// Instructions for new industries, keyed by "subCode:gicsCode"
	const newIndustryInstrByKey = new Map<string, string>();

	for (const row of uniqueSubRows) {
		const ex = subByExtId.get(row.subCode);
		for (const g of row.gicsData) {
			if (!g.gicsCode) continue;
			const existingInd = ex?.industries.find(
				(i) => i.gics_code === g.gicsCode,
			);

			if (!existingInd) {
				allNewIndustries.push({
					subCode: row.subCode,
					gicsCode: g.gicsCode,
					status: g.status,
				});
				if (g.instruction) {
					newIndustryInstrByKey.set(
						`${row.subCode}:${g.gicsCode}`,
						g.instruction,
					);
				}
			} else {
				if (existingInd.status !== g.status) {
					allUpdateIndustryStatus.push({
						industryId: existingInd.id,
						status: g.status,
					});
				}
				if (g.instruction) {
					const matchInstr = existingInd.instructions.find(
						(i) => i.instruction === g.instruction,
					);
					if (!matchInstr) {
						existingIndustryInstrsToCreate.push({
							industryId: existingInd.id,
							instruction: g.instruction,
						});
					} else if (
						existingInd.sm_signal_subcategories_industry_instruction_id !==
						matchInstr.id
					) {
						existingIndustryInstrFkUpdates.push({
							industryId: existingInd.id,
							instructionId: matchInstr.id,
						});
					}
				}
			}
		}
	}

	let categoriesCreated = 0;
	let categoriesUpdated = 0;
	let categoriesDeactivated = 0;
	let subcategoriesCreated = 0;
	let subcategoriesUpdated = 0;
	let subcategoriesDeactivated = 0;
	let versionsCreated = 0;
	let versionsSetCurrent = 0;
	let industriesCreated = 0;
	let instructionsCreated = 0;

	await prisma.$transaction(
		async (tx) => {
			// 1. Create categories (batch)
			const createdCats =
				catsToCreate.length > 0
					? await tx.smSignalCategory.createManyAndReturn({
							data: catsToCreate.map((r) => ({
								external_id: r.catCode,
								name: r.catName,
								tier: r.tier,
								is_active: true,
							})),
						})
					: [];
			categoriesCreated = createdCats.length;

			// 2. Update categories (few records, individual updates are fine)
			for (const row of catsToUpdate) {
				await tx.smSignalCategory.update({
					where: { id: catByExtId.get(row.catCode)!.id },
					data: { name: row.catName, is_active: true, updated_at: new Date() },
				});
				categoriesUpdated++;
			}

			const catIdMap = new Map<string, bigint>();
			for (const c of existingCats) catIdMap.set(c.external_id, c.id);
			for (const c of createdCats) catIdMap.set(c.external_id, c.id);

			// 3. Create subcategories (batch, null current_version_id — set in step 6)
			const createdSubs =
				subsToCreate.length > 0
					? await tx.smSignalSubcategory.createManyAndReturn({
							data: subsToCreate.map((r) => ({
								external_id: r.subCode,
								name: r.signalName,
								signal_class: r.signalClass,
								sm_signal_category_id: catIdMap.get(r.catCode) ?? null,
								is_active: true,
								sm_signal_subcategories_current_version_id: null,
							})),
						})
					: [];
			subcategoriesCreated = createdSubs.length;

			// 4. Update subcategories (few records)
			for (const row of subsToUpdate) {
				await tx.smSignalSubcategory.update({
					where: { id: subByExtId.get(row.subCode)!.id },
					data: {
						name: row.signalName,
						signal_class: row.signalClass,
						is_active: true,
						updated_at: new Date(),
					},
				});
				subcategoriesUpdated++;
			}

			const subIdMap = new Map<string, bigint>();
			for (const s of existingSubs) subIdMap.set(s.external_id, s.id);
			for (const s of createdSubs) subIdMap.set(s.external_id, s.id);

			// 5. Create versions (batch)
			const versionCreateData = versionsToCreate.map((p) => ({
				sm_signal_subcategory_id: subIdMap.get(p.subCode)!,
				definition: p.definition,
				prompt: p.prompt,
			}));
			const createdVersions =
				versionCreateData.length > 0
					? await tx.smSignalSubcategoryVersion.createManyAndReturn({
							data: versionCreateData,
						})
					: [];
			versionsCreated = createdVersions.length;

			// 6. Set current_version_id on subcategories — single batch UPDATE
			const versionPairs: Array<{ subId: bigint; versionId: bigint }> = [];
			for (const v of createdVersions) {
				if (v.sm_signal_subcategory_id)
					versionPairs.push({
						subId: v.sm_signal_subcategory_id,
						versionId: v.id,
					});
			}
			for (const { subCode, versionId } of versionsToSetCurrent) {
				const subId = subIdMap.get(subCode);
				if (subId) {
					versionPairs.push({ subId, versionId });
					versionsSetCurrent++;
				}
			}
			if (versionPairs.length > 0) {
				const vals = versionPairs
					.map((p) => `(${p.subId}::bigint,${p.versionId}::bigint)`)
					.join(",");
				await tx.$executeRawUnsafe(`
					UPDATE sm_signal_subcategories AS t
					SET sm_signal_subcategories_current_version_id = v.ver_id
					FROM (VALUES ${vals}) AS v(sub_id, ver_id)
					WHERE t.id = v.sub_id
				`);
			}

			// 7. Create new industries (batch)
			const industryCreateData = allNewIndustries.flatMap((i) => {
				const subId = subIdMap.get(i.subCode);
				if (!subId) return [];
				return [
					{
						sm_signal_subcategory_id: subId,
						gics_code: i.gicsCode,
						status: i.status,
					},
				];
			});
			const createdIndustries =
				industryCreateData.length > 0
					? await tx.smSignalSubcategoryIndustry.createManyAndReturn({
							data: industryCreateData,
						})
					: [];
			industriesCreated = createdIndustries.length;

			// 8. Update industry status (batch: separate updateMany for true/false)
			const statusTrue = allUpdateIndustryStatus
				.filter((i) => i.status)
				.map((i) => i.industryId);
			const statusFalse = allUpdateIndustryStatus
				.filter((i) => !i.status)
				.map((i) => i.industryId);
			if (statusTrue.length > 0) {
				await tx.smSignalSubcategoryIndustry.updateMany({
					where: { id: { in: statusTrue } },
					data: { status: true, updated_at: new Date() },
				});
			}
			if (statusFalse.length > 0) {
				await tx.smSignalSubcategoryIndustry.updateMany({
					where: { id: { in: statusFalse } },
					data: { status: false, updated_at: new Date() },
				});
			}

			// 9. Collect instruction creates for new industries
			// Use created.sm_signal_subcategory_id to resolve subCode, then look up instruction
			const subCodeById = new Map<bigint, string>();
			for (const s of existingSubs) subCodeById.set(s.id, s.external_id);
			for (const s of createdSubs) subCodeById.set(s.id, s.external_id);

			const allInstrsToCreate: InstrCreate[] = [
				...existingIndustryInstrsToCreate,
			];
			for (const created of createdIndustries) {
				if (!created.sm_signal_subcategory_id || !created.gics_code) continue;
				const subCode = subCodeById.get(created.sm_signal_subcategory_id);
				if (!subCode) continue;
				const instr = newIndustryInstrByKey.get(
					`${subCode}:${created.gics_code}`,
				);
				if (instr) {
					allInstrsToCreate.push({
						industryId: created.id,
						instruction: instr,
					});
				}
			}

			// 10. Create instructions (batch)
			const createdInstrs =
				allInstrsToCreate.length > 0
					? await tx.smSignalSubcategoryIndustryInstruction.createManyAndReturn(
							{
								data: allInstrsToCreate.map((i) => ({
									sm_signal_subcategories_industry_id: i.industryId,
									instruction: i.instruction,
								})),
							},
						)
					: [];
			instructionsCreated = createdInstrs.length;

			// 11. Update instruction FK on industries — single batch UPDATE
			const instrPairs: Array<{ industryId: bigint; instrId: bigint }> = [];
			for (const instr of createdInstrs) {
				if (instr.sm_signal_subcategories_industry_id)
					instrPairs.push({
						industryId: instr.sm_signal_subcategories_industry_id,
						instrId: instr.id,
					});
			}
			for (const {
				industryId,
				instructionId,
			} of existingIndustryInstrFkUpdates) {
				instrPairs.push({ industryId, instrId: instructionId });
			}
			if (instrPairs.length > 0) {
				const vals = instrPairs
					.map((p) => `(${p.industryId}::bigint,${p.instrId}::bigint)`)
					.join(",");
				await tx.$executeRawUnsafe(`
					UPDATE sm_signal_subcategories_industries AS t
					SET sm_signal_subcategories_industry_instruction_id = v.instr_id,
					    updated_at = NOW()
					FROM (VALUES ${vals}) AS v(ind_id, instr_id)
					WHERE t.id = v.ind_id
				`);
			}

			// 12. Deactivate categories and subcategories absent from this import
			const deactivatedCats = await tx.smSignalCategory.updateMany({
				where: {
					external_id: { notIn: Array.from(importCatCodes) },
					is_active: true,
				},
				data: { is_active: false, updated_at: new Date() },
			});
			categoriesDeactivated = deactivatedCats.count;

			const deactivatedSubs = await tx.smSignalSubcategory.updateMany({
				where: {
					external_id: { notIn: Array.from(importSubCodes) },
					is_active: true,
				},
				data: { is_active: false, updated_at: new Date() },
			});
			subcategoriesDeactivated = deactivatedSubs.count;
		},
		{ timeout: 120000 },
	);

	return NextResponse.json({
		success: true,
		data: serializeBigInt({
			categoriesCreated,
			categoriesUpdated,
			categoriesDeactivated,
			subcategoriesCreated,
			subcategoriesUpdated,
			subcategoriesDeactivated,
			versionsCreated,
			versionsSetCurrent,
			industriesCreated,
			instructionsCreated,
		}),
	});
}
