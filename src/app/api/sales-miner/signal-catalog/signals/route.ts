import { type NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../../lib/auth";
import prisma from "../../../../../lib/prisma";

function serializeBigInt<T>(value: T): T {
	return JSON.parse(
		JSON.stringify(value, (_key, nestedValue) =>
			typeof nestedValue === "bigint" ? nestedValue.toString() : nestedValue,
		),
	) as T;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeString(value: unknown): string | null {
	return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizePhrases(value: unknown) {
	if (!Array.isArray(value)) return [];
	return value
		.map((item, index) => {
			if (typeof item === "string") {
				const phrase = item.trim();
				if (!phrase) return null;
				return {
					phrase,
					phraseType: "core",
					languageCode: "en",
					priority: (index + 1) * 10,
					isActive: true,
				};
			}
			if (!isRecord(item)) return null;
			const phrase = normalizeString(item.phrase);
			if (!phrase) return null;
			return {
				phrase,
				phraseType: normalizeString(item.phraseType) ?? "core",
				languageCode: normalizeString(item.languageCode) ?? "en",
				priority: Number(item.priority ?? (index + 1) * 10),
				isActive: typeof item.isActive === "boolean" ? item.isActive : true,
			};
		})
		.filter((item): item is NonNullable<typeof item> => item !== null);
}

const signalSelect = {
	id: true,
	code: true,
	signal_type_id: true,
	signal_types: { select: { name: true } },
	category_id: true,
	signal_categories: {
		select: {
			name: true,
			signal_categories: { select: { name: true } },
		},
	},
	name: true,
	description: true,
	scope: true,
	search_level: true,
	requires_company_binding: true,
	merged_into_signal_id: true,
	is_active: true,
	created_at: true,
	updated_at: true,
	signal_search_phrases: {
		select: {
			id: true,
			phrase: true,
			phrase_type: true,
			language_code: true,
			priority: true,
			is_active: true,
		},
		orderBy: [{ priority: "asc" as const }, { phrase: "asc" as const }],
	},
	signal_definition_gics_codes: { select: { gics_code: true } },
};

function mapSignal(
	signal: {
		id: bigint;
		code: string;
		signal_type_id: bigint;
		signal_types: { name: string };
		category_id: bigint | null;
		signal_categories: {
			name: string;
			signal_categories: { name: string } | null;
		} | null;
		name: string;
		description: string;
		scope: string;
		search_level: string;
		requires_company_binding: boolean;
		merged_into_signal_id: bigint | null;
		is_active: boolean;
		created_at: Date;
		updated_at: Date;
		signal_search_phrases: Array<{
			id: bigint;
			phrase: string;
			phrase_type: string;
			language_code: string;
			priority: number;
			is_active: boolean;
		}>;
		signal_definition_gics_codes: Array<{ gics_code: string }>;
	},
	isLatest?: boolean,
) {
	return {
		id: signal.id,
		code: signal.code,
		signal_type_id: signal.signal_type_id,
		signal_type_name: signal.signal_types.name,
		category_id: signal.category_id,
		category_name: signal.signal_categories?.signal_categories?.name ?? null,
		name: signal.name,
		description: signal.description,
		scope: signal.scope,
		search_level: signal.search_level,
		requires_company_binding: signal.requires_company_binding,
		merged_into_signal_id: signal.merged_into_signal_id,
		is_active: signal.is_active,
		created_at: signal.created_at,
		updated_at: signal.updated_at,
		meta: {},
		is_latest: isLatest,
		gics_codes: signal.signal_definition_gics_codes.map((g) => g.gics_code),
		search_phrases: signal.signal_search_phrases.map((p) => ({
			id: p.id,
			phrase: p.phrase,
			phraseType: p.phrase_type,
			languageCode: p.language_code,
			priority: p.priority,
			isActive: p.is_active,
		})),
	};
}

export async function GET(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const categoryIdParam = request.nextUrl.searchParams.get("categoryId");
	if (categoryIdParam) {
		try {
			const categoryId = BigInt(categoryIdParam);
			const [category, signals, junctionRows] = await prisma.$transaction([
				prisma.signal_categories.findUnique({
					where: { id: categoryId },
					select: { signal_definition_id: true },
				}),
				prisma.signal_definitions.findMany({
					where: { category_id: categoryId },
					select: signalSelect,
					orderBy: [{ created_at: "desc" }],
				}),
				prisma.signal_category_signal_definitions.findMany({
					where: { signal_category_id: categoryId },
					select: { signal_definition_id: true },
				}),
			]);
			const universalLatestId = category?.signal_definition_id ?? null;
			const industryCurrentIds = new Set(
				junctionRows.map((r) => r.signal_definition_id),
			);
			return NextResponse.json({
				success: true,
				data: serializeBigInt({
					items: signals.map((s) => {
						const isIndustry = s.signal_definition_gics_codes.length > 0;
						const isLatest = isIndustry
							? industryCurrentIds.has(s.id)
							: universalLatestId !== null && s.id === universalLatestId;
						return mapSignal(s, isLatest);
					}),
					total: signals.length,
					page: 1,
					limit: signals.length,
				}),
			});
		} catch (error) {
			console.error("Signal catalog versions GET failed", error);
			return NextResponse.json(
				{
					success: false,
					error:
						error instanceof Error ? error.message : "Failed to load versions",
				},
				{ status: 500 },
			);
		}
	}

	const q = request.nextUrl.searchParams.get("q")?.trim() || undefined;
	const parentCategoryIdParam =
		request.nextUrl.searchParams.get("parentCategoryId");
	const page = Math.max(
		1,
		Number(request.nextUrl.searchParams.get("page") ?? 1),
	);
	const limit = Math.min(
		100,
		Math.max(1, Number(request.nextUrl.searchParams.get("limit") ?? 20)),
	);
	const offset = (page - 1) * limit;

	const where = {
		signal_categories_signal_categories_signal_definition_idTosignal_definitions:
			{
				some: { is_gc: true },
			},
		...(parentCategoryIdParam
			? {
					signal_categories: {
						is: { parent_id: BigInt(parentCategoryIdParam) },
					},
				}
			: {}),
		...(q
			? {
					OR: [
						{ name: { contains: q, mode: "insensitive" as const } },
						{ code: { contains: q, mode: "insensitive" as const } },
						{ description: { contains: q, mode: "insensitive" as const } },
					],
				}
			: {}),
	};

	try {
		const [total, signals] = await prisma.$transaction([
			prisma.signal_definitions.count({ where }),
			prisma.signal_definitions.findMany({
				where,
				select: signalSelect,
				orderBy: [{ updated_at: "desc" }, { id: "desc" }],
				skip: offset,
				take: limit,
			}),
		]);

		return NextResponse.json({
			success: true,
			data: serializeBigInt({
				items: signals.map((s) => mapSignal(s)),
				total,
				page,
				limit,
			}),
		});
	} catch (error) {
		console.error("Signal catalog signals GET failed", error);
		return NextResponse.json(
			{
				success: false,
				error:
					error instanceof Error ? error.message : "Failed to load signals",
			},
			{ status: 500 },
		);
	}
}

export async function POST(request: NextRequest) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const body = (await request.json().catch(() => null)) as unknown;
	if (!isRecord(body)) {
		return NextResponse.json(
			{ success: false, error: "Invalid request body" },
			{ status: 400 },
		);
	}

	const code = normalizeString(body.code);
	const name = normalizeString(body.name);
	const description = normalizeString(body.description);
	const signalTypeIdRaw = normalizeString(body.signalTypeId);
	const signalTypeId = signalTypeIdRaw ? BigInt(signalTypeIdRaw) : null;
	// categoryId: existing subcategory (used when creating a new version of a signal)
	const categoryId =
		body.categoryId === null || body.categoryId === undefined
			? null
			: BigInt(String(body.categoryId));
	// parentCategoryId: tier-1 category (when set, a new subcategory is auto-created)
	const parentCategoryId =
		body.parentCategoryId === null || body.parentCategoryId === undefined
			? null
			: BigInt(String(body.parentCategoryId));
	const sourceSignalId =
		body.sourceSignalId === null || body.sourceSignalId === undefined
			? null
			: BigInt(String(body.sourceSignalId));
	const scope = normalizeString(body.scope) ?? "company";
	const searchLevel = normalizeString(body.searchLevel) ?? "entity";
	const requiresCompanyBinding =
		typeof body.requiresCompanyBinding === "boolean"
			? body.requiresCompanyBinding
			: true;
	const isActive = typeof body.isActive === "boolean" ? body.isActive : true;
	const phrases = normalizePhrases(body.searchPhrases);
	const gicsCodes = Array.isArray(body.gicsCodes)
		? (body.gicsCodes as unknown[]).filter(
				(c): c is string => typeof c === "string" && c.trim().length > 0,
			)
		: [];

	if (!code || !name || !description || signalTypeId === null) {
		return NextResponse.json(
			{
				success: false,
				error: "code, name, description and signalTypeId are required",
			},
			{ status: 400 },
		);
	}

	// Validate GICS overlap: industry signals in existing subcategory must not share GICS codes
	if (gicsCodes.length > 0 && categoryId !== null) {
		const existingCurrent =
			await prisma.signal_category_signal_definitions.findMany({
				where: { signal_category_id: categoryId, code: { not: code } },
				select: { signal_definition_id: true },
			});
		if (existingCurrent.length > 0) {
			const conflicting = await prisma.signal_definition_gics_codes.findFirst({
				where: {
					signal_definition_id: {
						in: existingCurrent.map((r) => r.signal_definition_id),
					},
					gics_code: { in: gicsCodes },
				},
				select: { gics_code: true },
			});
			if (conflicting) {
				return NextResponse.json(
					{
						success: false,
						error: `GICS code ${conflicting.gics_code} is already covered by another current signal in this subcategory`,
					},
					{ status: 409 },
				);
			}
		}
	}

	const result = await prisma.$transaction(async (tx) => {
		// When parentCategoryId is provided, auto-create a subcategory for this signal
		let resolvedCategoryId = categoryId;
		if (parentCategoryId !== null) {
			const subcat = await tx.signal_categories.create({
				data: {
					code,
					name,
					tier: 2,
					parent_id: parentCategoryId,
					is_gc: true,
					is_active: isActive,
				},
			});
			resolvedCategoryId = subcat.id;
		}

		const signal = await tx.signal_definitions.create({
			data: {
				code,
				signal_type_id: signalTypeId,
				category_id: resolvedCategoryId,
				name,
				description,
				scope,
				requires_company_binding: requiresCompanyBinding,
				merged_into_signal_id: sourceSignalId,
				is_active: isActive,
				meta: {},
				search_level: searchLevel,
			},
		});

		if (phrases.length > 0) {
			await tx.signal_search_phrases.createMany({
				data: phrases.map((p) => ({
					signal_definition_id: signal.id,
					phrase: p.phrase,
					phrase_type: p.phraseType,
					language_code: p.languageCode,
					priority: p.priority,
					is_active: p.isActive,
					meta: {},
				})),
			});
		}

		if (gicsCodes.length > 0) {
			await tx.signal_definition_gics_codes.createMany({
				data: gicsCodes.map((gc) => ({
					signal_definition_id: signal.id,
					gics_code: gc,
				})),
			});
		}

		if (resolvedCategoryId !== null) {
			if (gicsCodes.length === 0) {
				// Universal signal — store in signal_definition_id pointer
				await tx.signal_categories.updateMany({
					where: { id: resolvedCategoryId, is_gc: true },
					data: { signal_definition_id: signal.id },
				});
			} else {
				// Industry-specific — swap current version in junction table
				await tx.signal_category_signal_definitions.deleteMany({
					where: { signal_category_id: resolvedCategoryId, code },
				});
				await tx.signal_category_signal_definitions.create({
					data: {
						signal_category_id: resolvedCategoryId,
						signal_definition_id: signal.id,
						code,
					},
				});
			}
		}

		return signal;
	});

	return NextResponse.json({
		success: true,
		data: serializeBigInt(result),
	});
}
