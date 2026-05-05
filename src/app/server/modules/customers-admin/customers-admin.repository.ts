import type { Prisma } from "../../../../generated/prisma";
import prisma from "../../../../lib/prisma";

export class CustomersAdminRepository {
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
						companies: { select: { id: true, name: true } },
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
}
