import { Prisma } from "../../../../generated/prisma";
import prisma from "../../../../lib/prisma";

export interface ProductImportItem {
	group: string;
	name: string;
	description: string;
	meta: Prisma.InputJsonValue;
}

export interface ProductImportResult {
	reset_count: number;
	groups_in_payload: number;
	parents_inserted: number;
	parents_reactivated: number;
	children_upserted: number;
}

export class CustomersAdminRepository {
	static async listProducts(customerId: bigint) {
		return prisma.customer_products.findMany({
			where: { customer_id: customerId },
			orderBy: [{ product_level: "asc" }, { parent_id: "asc" }, { id: "asc" }],
		});
	}

	static async list(params: { skip: number; take: number; q?: string }) {
		const where: Prisma.customersWhereInput = params.q?.trim()
			? {
					display_name: {
						contains: params.q.trim(),
						mode: "insensitive",
					},
				}
			: {};
		const [items, total] = await Promise.all([
			prisma.customers.findMany({
				where,
				skip: params.skip,
				take: params.take,
				orderBy: { id: "desc" },
				include: {
					companies: { select: { id: true, name: true } },
					_count: { select: { customer_accounts: true } },
				},
			}),
			prisma.customers.count({ where }),
		]);
		return { items, total };
	}

	static async findById(id: bigint) {
		return prisma.customers.findUnique({
			where: { id },
			include: {
				companies: {
					select: { id: true, name: true, url: true, country_code: true },
				},
				customer_accounts: {
					include: {
						companies: { select: { id: true, name: true, verified: true } },
						customer_account_subsidiaries: {
							include: {
								companies: { select: { id: true, name: true } },
							},
							orderBy: { id: "asc" },
						},
					},
					orderBy: { id: "asc" },
				},
			},
		});
	}

	static async createCustomer(
		companyId: number,
		displayName: string,
		settings: Prisma.InputJsonValue,
	) {
		return prisma.customers.create({
			data: {
				company_id: companyId,
				display_name: displayName,
				settings,
			},
			include: {
				companies: { select: { id: true, name: true } },
				_count: { select: { customer_accounts: true } },
			},
		});
	}

	static async updateCustomer(
		id: bigint,
		data: {
			display_name?: string;
			is_active?: boolean;
			settings?: Prisma.InputJsonValue;
		},
	) {
		return prisma.customers.update({
			where: { id },
			data: {
				...(data.display_name !== undefined && {
					display_name: data.display_name,
				}),
				...(data.is_active !== undefined && { is_active: data.is_active }),
				...(data.settings !== undefined && { settings: data.settings }),
				updated_at: new Date(),
			},
			include: {
				companies: { select: { id: true, name: true } },
				_count: { select: { customer_accounts: true } },
			},
		});
	}

	static async createAccount(customerId: bigint, companyId: number) {
		return prisma.customer_accounts.create({
			data: {
				customer_id: customerId,
				company_id: companyId,
			},
			include: {
				companies: { select: { id: true, name: true } },
				customer_account_subsidiaries: {
					include: { companies: { select: { id: true, name: true } } },
					orderBy: { id: "asc" },
				},
			},
		});
	}

	static async findAccountById(id: bigint) {
		return prisma.customer_accounts.findUnique({
			where: { id },
			select: { id: true, customer_id: true },
		});
	}

	static async updateAccount(id: bigint, isActive: boolean) {
		return prisma.customer_accounts.update({
			where: { id },
			data: { is_active: isActive, updated_at: new Date() },
		});
	}

	static async createSubsidiary(
		customerAccountId: bigint,
		subsidiaryCompanyId: number,
		relationType: string,
		meta: Prisma.InputJsonValue,
	) {
		return prisma.customer_account_subsidiaries.create({
			data: {
				customer_account_id: customerAccountId,
				subsidiary_company_id: subsidiaryCompanyId,
				relation_type: relationType,
				meta,
			},
			include: { companies: { select: { id: true, name: true } } },
		});
	}

	static async updateSubsidiary(
		id: bigint,
		data: {
			is_active?: boolean;
			relation_type?: string;
			meta?: Prisma.InputJsonValue;
		},
	) {
		return prisma.customer_account_subsidiaries.update({
			where: { id },
			data: {
				...(data.is_active !== undefined && { is_active: data.is_active }),
				...(data.relation_type !== undefined && {
					relation_type: data.relation_type,
				}),
				...(data.meta !== undefined && { meta: data.meta }),
				updated_at: new Date(),
			},
			include: { companies: { select: { id: true, name: true } } },
		});
	}

	/**
	 * Full-resync product portfolio import: deactivates every existing
	 * customer_products row for this customer (and blanks L2 description/meta,
	 * since the AI-generated L2 description is a synthesis over its active L3
	 * children and goes stale when the child set changes), then reactivates or
	 * creates the L2 groups and L3 products present in `items`. Anything that
	 * existed before but is missing from `items` is left soft-deactivated.
	 *
	 * Runs as two separate statements (in one transaction) rather than one
	 * mega-CTE query: within a single statement, Postgres reads every plain
	 * table scan against the snapshot taken at the *start* of that statement,
	 * so a later CTE re-querying customer_products cannot see a row an
	 * earlier CTE just INSERTed in the same statement — only RETURNING-based
	 * references to that CTE are visible. Splitting into two statements gives
	 * the second one a fresh snapshot that includes the first statement's
	 * writes, so brand-new L2 groups are visible when L3 rows are linked to
	 * them.
	 */
	static async importProductsL2L3(
		customerId: bigint,
		items: ProductImportItem[],
	): Promise<ProductImportResult> {
		const payload = JSON.stringify(items);

		return prisma.$transaction(async (tx) => {
			const parentRows = await tx.$queryRaw<
				Array<{
					reset_count: number;
					groups_in_payload: number;
					parents_inserted: number;
				}>
			>(
				Prisma.sql`
					WITH input AS (
						SELECT NULLIF(btrim(t."group"), '') AS group_name
						FROM jsonb_to_recordset(${payload}::jsonb)
							AS t("group" text, name text, description text, meta jsonb)
					),
					groups AS (
						SELECT DISTINCT group_name FROM input WHERE group_name IS NOT NULL
					),
					reset_all AS (
						UPDATE public.customer_products cp
						SET
							is_active = false,
							description = CASE WHEN cp.product_level = 'l2' THEN '' ELSE cp.description END,
							meta = CASE WHEN cp.product_level = 'l2' THEN '{}'::jsonb ELSE cp.meta END,
							updated_at = now()
						WHERE cp.customer_id = ${customerId}::bigint
						RETURNING cp.id
					),
					insert_parents AS (
						INSERT INTO public.customer_products
							(customer_id, parent_id, name, description, meta, is_active, product_level)
						SELECT
							${customerId}::bigint, NULL::bigint, g.group_name, ''::text, '{}'::jsonb, true, 'l2'
						FROM groups g
						CROSS JOIN (SELECT count(*) AS n FROM reset_all) AS dep1
						WHERE NOT EXISTS (
							SELECT 1 FROM public.customer_products cp
							WHERE cp.customer_id = ${customerId}::bigint
								AND cp.parent_id IS NULL
								AND cp.name = g.group_name
						)
						RETURNING id, name
					)
					SELECT
						(SELECT count(*) FROM reset_all)::int AS reset_count,
						(SELECT count(*) FROM groups)::int AS groups_in_payload,
						(SELECT count(*) FROM insert_parents)::int AS parents_inserted
				`,
			);
			const parentResult = parentRows[0];
			if (!parentResult) {
				throw new Error("Product import (parents) query returned no result");
			}

			const childRows = await tx.$queryRaw<
				Array<{ parents_reactivated: number; children_upserted: number }>
			>(
				Prisma.sql`
					WITH input AS (
						SELECT
							NULLIF(btrim(t."group"), '') AS group_name,
							NULLIF(btrim(t.name), '')    AS product_name,
							COALESCE(t.description, '')  AS product_description,
							COALESCE(t.meta, '{}'::jsonb) AS product_meta
						FROM jsonb_to_recordset(${payload}::jsonb)
							AS t("group" text, name text, description text, meta jsonb)
					),
					groups AS (
						SELECT DISTINCT group_name FROM input WHERE group_name IS NOT NULL
					),
					reactivate_parents AS (
						UPDATE public.customer_products cp
						SET is_active = true, updated_at = now()
						WHERE cp.customer_id = ${customerId}::bigint
							AND cp.parent_id IS NULL
							AND cp.name IN (SELECT group_name FROM groups)
						RETURNING cp.id, cp.name
					),
					parent_map AS (
						SELECT cp.id, cp.name
						FROM public.customer_products cp
						CROSS JOIN (SELECT count(*) AS n FROM reactivate_parents) AS dep2
						WHERE cp.customer_id = ${customerId}::bigint
							AND cp.parent_id IS NULL
							AND cp.name IN (SELECT group_name FROM groups)
					),
					upsert_children AS (
						INSERT INTO public.customer_products
							(customer_id, parent_id, name, description, meta, is_active, product_level)
						SELECT
							${customerId}::bigint, pm.id, i.product_name, i.product_description, i.product_meta, true, 'l3'
						FROM input i
						JOIN parent_map pm ON pm.name = i.group_name
						WHERE i.product_name IS NOT NULL
						ON CONFLICT ON CONSTRAINT uq_customer_products_customer_parent_name
						DO UPDATE SET
							description = EXCLUDED.description,
							meta = EXCLUDED.meta,
							is_active = true,
							updated_at = now()
						RETURNING id
					)
					SELECT
						(SELECT count(*) FROM reactivate_parents)::int AS parents_reactivated,
						(SELECT count(*) FROM upsert_children)::int AS children_upserted
				`,
			);
			const childResult = childRows[0];
			if (!childResult) {
				throw new Error("Product import (children) query returned no result");
			}

			return { ...parentResult, ...childResult };
		});
	}
}
