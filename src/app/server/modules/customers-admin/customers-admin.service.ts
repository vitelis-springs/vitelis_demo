import { Prisma } from "../../../../generated/prisma";
import { CustomersAdminRepository } from "./customers-admin.repository";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

export class CustomersAdminService {
	static parseId(raw: string): bigint | null {
		try {
			const v = BigInt(raw);
			if (v <= BigInt(0)) return null;
			return v;
		} catch {
			return null;
		}
	}

	static async list(params: { page: number; limit: number; q?: string }) {
		const limit = Math.min(Math.max(params.limit, 1), 100);
		const page = Math.max(params.page, 1);
		const skip = (page - 1) * limit;
		return CustomersAdminRepository.list({
			skip,
			take: limit,
			q: params.q,
		});
	}

	static async getById(id: bigint) {
		return CustomersAdminRepository.findById(id);
	}

	static async createCustomer(
		companyId: unknown,
		displayName: unknown,
		settings: unknown,
	) {
		if (
			typeof companyId !== "number" ||
			!Number.isInteger(companyId) ||
			companyId <= 0
		) {
			throw new CustomersAdminValidationError(
				"companyId must be a positive integer",
			);
		}
		if (typeof displayName !== "string" || !displayName.trim()) {
			throw new CustomersAdminValidationError("displayName is required");
		}
		const settingsJson: Prisma.InputJsonValue =
			settings === undefined
				? {}
				: isRecord(settings)
					? (settings as Prisma.InputJsonValue)
					: (() => {
							throw new CustomersAdminValidationError(
								"settings must be a JSON object when provided",
							);
						})();
		return CustomersAdminRepository.createCustomer(
			companyId,
			displayName.trim(),
			settingsJson,
		);
	}

	static async updateCustomer(
		id: bigint,
		body: {
			displayName?: unknown;
			isActive?: unknown;
			settings?: unknown;
		},
	) {
		const data: {
			display_name?: string;
			is_active?: boolean;
			settings?: Prisma.InputJsonValue;
		} = {};
		if (body.displayName !== undefined) {
			if (typeof body.displayName !== "string" || !body.displayName.trim()) {
				throw new CustomersAdminValidationError(
					"displayName must be a non-empty string",
				);
			}
			data.display_name = body.displayName.trim();
		}
		if (body.isActive !== undefined) {
			if (typeof body.isActive !== "boolean") {
				throw new CustomersAdminValidationError("isActive must be a boolean");
			}
			data.is_active = body.isActive;
		}
		if (body.settings !== undefined) {
			if (!isRecord(body.settings)) {
				throw new CustomersAdminValidationError(
					"settings must be a JSON object",
				);
			}
			data.settings = body.settings as Prisma.InputJsonValue;
		}
		if (
			data.display_name === undefined &&
			data.is_active === undefined &&
			data.settings === undefined
		) {
			throw new CustomersAdminValidationError("No fields to update");
		}
		return CustomersAdminRepository.updateCustomer(id, data);
	}

	static async createAccount(customerId: bigint, companyId: unknown) {
		if (
			typeof companyId !== "number" ||
			!Number.isInteger(companyId) ||
			companyId <= 0
		) {
			throw new CustomersAdminValidationError(
				"companyId must be a positive integer",
			);
		}
		const customer = await CustomersAdminRepository.findById(customerId);
		if (!customer) {
			throw new CustomersAdminValidationError("Customer not found", 404);
		}
		if (customer.company_id === companyId) {
			throw new CustomersAdminValidationError(
				"Account company must differ from the customer primary company",
			);
		}
		return CustomersAdminRepository.createAccount(customerId, companyId);
	}

	static async updateAccount(accountId: bigint, isActive: unknown) {
		if (typeof isActive !== "boolean") {
			throw new CustomersAdminValidationError("isActive must be a boolean");
		}
		const row = await CustomersAdminRepository.findAccountById(accountId);
		if (!row) {
			throw new CustomersAdminValidationError("Account not found", 404);
		}
		return CustomersAdminRepository.updateAccount(accountId, isActive);
	}

	static async createSubsidiary(
		accountId: bigint,
		subsidiaryCompanyId: unknown,
		relationType: unknown,
		meta: unknown,
	) {
		if (
			typeof subsidiaryCompanyId !== "number" ||
			!Number.isInteger(subsidiaryCompanyId) ||
			subsidiaryCompanyId <= 0
		) {
			throw new CustomersAdminValidationError(
				"subsidiaryCompanyId must be a positive integer",
			);
		}
		const account = await CustomersAdminRepository.findAccountById(accountId);
		if (!account) {
			throw new CustomersAdminValidationError("Account not found", 404);
		}
		const rel =
			typeof relationType === "string" && relationType.trim()
				? relationType.trim().slice(0, 50)
				: "subsidiary";
		const metaJson: Prisma.InputJsonValue =
			meta === undefined
				? {}
				: isRecord(meta)
					? (meta as Prisma.InputJsonValue)
					: (() => {
							throw new CustomersAdminValidationError(
								"meta must be a JSON object",
							);
						})();
		return CustomersAdminRepository.createSubsidiary(
			accountId,
			subsidiaryCompanyId,
			rel,
			metaJson,
		);
	}

	static async updateSubsidiary(
		subsidiaryId: bigint,
		body: {
			isActive?: unknown;
			relationType?: unknown;
			meta?: unknown;
		},
	) {
		const data: {
			is_active?: boolean;
			relation_type?: string;
			meta?: Prisma.InputJsonValue;
		} = {};
		if (body.isActive !== undefined) {
			if (typeof body.isActive !== "boolean") {
				throw new CustomersAdminValidationError("isActive must be a boolean");
			}
			data.is_active = body.isActive;
		}
		if (body.relationType !== undefined) {
			if (typeof body.relationType !== "string" || !body.relationType.trim()) {
				throw new CustomersAdminValidationError(
					"relationType must be a non-empty string",
				);
			}
			data.relation_type = body.relationType.trim().slice(0, 50);
		}
		if (body.meta !== undefined) {
			if (!isRecord(body.meta)) {
				throw new CustomersAdminValidationError("meta must be a JSON object");
			}
			data.meta = body.meta as Prisma.InputJsonValue;
		}
		if (
			data.is_active === undefined &&
			data.relation_type === undefined &&
			data.meta === undefined
		) {
			throw new CustomersAdminValidationError("No fields to update");
		}
		return CustomersAdminRepository.updateSubsidiary(subsidiaryId, data);
	}
}

export class CustomersAdminValidationError extends Error {
	readonly status: number;

	constructor(message: string, status = 400) {
		super(message);
		this.name = "CustomersAdminValidationError";
		this.status = status;
	}
}
