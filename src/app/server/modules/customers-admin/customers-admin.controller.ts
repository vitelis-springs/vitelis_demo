/** biome-ignore-all lint/complexity/noStaticOnlyClass: Controller classes are static route facades in this module. */
import { type NextRequest, NextResponse } from "next/server";
import { Prisma } from "../../../../generated/prisma";
import { extractAdminFromRequest } from "../../../../lib/auth";
import {
	CustomersAdminService,
	CustomersAdminValidationError,
} from "./customers-admin.service";

function serializeJson<T>(data: T): T {
	return JSON.parse(
		JSON.stringify(data, (_key, value) =>
			typeof value === "bigint" ? value.toString() : value,
		),
	) as T;
}

function jsonSuccess<T>(data: T, status = 200) {
	return NextResponse.json(serializeJson({ success: true, data }), { status });
}

function jsonError(message: string, status: number) {
	return NextResponse.json({ success: false, error: message }, { status });
}

function isPrismaKnownError(
	error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
	return error instanceof Prisma.PrismaClientKnownRequestError;
}

export class CustomersAdminController {
	static async list(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const url = new URL(request.url);
			const page = Math.max(Number(url.searchParams.get("page")) || 1, 1);
			const limit = Math.max(Number(url.searchParams.get("limit")) || 20, 1);
			const q = url.searchParams.get("q") ?? undefined;

			const { items, total } = await CustomersAdminService.list({
				page,
				limit,
				q,
			});
			return jsonSuccess({ items, total, page, limit });
		} catch (error) {
			console.error("CustomersAdminController.list:", error);
			return jsonError("Internal server error", 500);
		}
	}

	static async createCustomer(request: NextRequest): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const body = (await request.json()) as Record<string, unknown>;
			const created = await CustomersAdminService.createCustomer(
				body.companyId,
				body.displayName,
				body.settings,
			);
			return jsonSuccess(created, 201);
		} catch (error) {
			if (error instanceof CustomersAdminValidationError) {
				return jsonError(error.message, error.status);
			}
			if (isPrismaKnownError(error)) {
				if (error.code === "P2002") {
					return jsonError("A customer already exists for this company", 409);
				}
				if (error.code === "P2003") {
					return jsonError("Invalid company reference", 400);
				}
			}
			console.error("CustomersAdminController.createCustomer:", error);
			return jsonError("Internal server error", 500);
		}
	}

	static async getById(
		request: NextRequest,
		idParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const id = CustomersAdminService.parseId(idParam);
			if (id === null) return jsonError("Invalid id", 400);

			const row = await CustomersAdminService.getById(id);
			if (!row) return jsonError("Not found", 404);
			return jsonSuccess(row);
		} catch (error) {
			console.error("CustomersAdminController.getById:", error);
			return jsonError("Internal server error", 500);
		}
	}

	static async updateCustomer(
		request: NextRequest,
		idParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const id = CustomersAdminService.parseId(idParam);
			if (id === null) return jsonError("Invalid id", 400);

			const body = (await request.json()) as Record<string, unknown>;
			const updated = await CustomersAdminService.updateCustomer(id, {
				displayName: body.displayName,
				isActive: body.isActive,
				settings: body.settings,
			});
			return jsonSuccess(updated);
		} catch (error) {
			if (error instanceof CustomersAdminValidationError) {
				return jsonError(error.message, error.status);
			}
			if (isPrismaKnownError(error) && error.code === "P2025") {
				return jsonError("Not found", 404);
			}
			console.error("CustomersAdminController.updateCustomer:", error);
			return jsonError("Internal server error", 500);
		}
	}

	static async createAccount(
		request: NextRequest,
		customerIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const customerId = CustomersAdminService.parseId(customerIdParam);
			if (customerId === null) return jsonError("Invalid customer id", 400);

			const body = (await request.json()) as Record<string, unknown>;
			const created = await CustomersAdminService.createAccount(
				customerId,
				body.companyId,
			);
			return jsonSuccess(created, 201);
		} catch (error) {
			if (error instanceof CustomersAdminValidationError) {
				return jsonError(error.message, error.status);
			}
			if (isPrismaKnownError(error)) {
				if (error.code === "P2002") {
					return jsonError("This account link already exists", 409);
				}
				if (error.code === "P2003") {
					return jsonError("Invalid company reference", 400);
				}
			}
			console.error("CustomersAdminController.createAccount:", error);
			return jsonError("Internal server error", 500);
		}
	}

	static async updateAccount(
		request: NextRequest,
		accountIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const accountId = CustomersAdminService.parseId(accountIdParam);
			if (accountId === null) return jsonError("Invalid account id", 400);

			const body = (await request.json()) as Record<string, unknown>;
			const updated = await CustomersAdminService.updateAccount(
				accountId,
				body.isActive,
			);
			return jsonSuccess(updated);
		} catch (error) {
			if (error instanceof CustomersAdminValidationError) {
				return jsonError(error.message, error.status);
			}
			if (isPrismaKnownError(error) && error.code === "P2025") {
				return jsonError("Not found", 404);
			}
			console.error("CustomersAdminController.updateAccount:", error);
			return jsonError("Internal server error", 500);
		}
	}

	static async createSubsidiary(
		request: NextRequest,
		accountIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const accountId = CustomersAdminService.parseId(accountIdParam);
			if (accountId === null) return jsonError("Invalid account id", 400);

			const body = (await request.json()) as Record<string, unknown>;
			const created = await CustomersAdminService.createSubsidiary(
				accountId,
				body.subsidiaryCompanyId,
				body.relationType,
				body.meta,
			);
			return jsonSuccess(created, 201);
		} catch (error) {
			if (error instanceof CustomersAdminValidationError) {
				return jsonError(error.message, error.status);
			}
			if (isPrismaKnownError(error)) {
				if (error.code === "P2002") {
					return jsonError("This subsidiary link already exists", 409);
				}
				if (error.code === "P2003") {
					return jsonError("Invalid company reference", 400);
				}
			}
			console.error("CustomersAdminController.createSubsidiary:", error);
			return jsonError("Internal server error", 500);
		}
	}

	static async updateSubsidiary(
		request: NextRequest,
		subsidiaryIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const subsidiaryId = CustomersAdminService.parseId(subsidiaryIdParam);
			if (subsidiaryId === null) return jsonError("Invalid subsidiary id", 400);

			const body = (await request.json()) as Record<string, unknown>;
			const updated = await CustomersAdminService.updateSubsidiary(
				subsidiaryId,
				{
					isActive: body.isActive,
					relationType: body.relationType,
					meta: body.meta,
				},
			);
			return jsonSuccess(updated);
		} catch (error) {
			if (error instanceof CustomersAdminValidationError) {
				return jsonError(error.message, error.status);
			}
			if (isPrismaKnownError(error) && error.code === "P2025") {
				return jsonError("Not found", 404);
			}
			console.error("CustomersAdminController.updateSubsidiary:", error);
			return jsonError("Internal server error", 500);
		}
	}

	static async listProducts(
		request: NextRequest,
		customerIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const customerId = CustomersAdminService.parseId(customerIdParam);
			if (customerId === null) return jsonError("Invalid customer id", 400);

			const products = await CustomersAdminService.listProducts(customerId);
			return jsonSuccess(products);
		} catch (error) {
			if (error instanceof CustomersAdminValidationError) {
				return jsonError(error.message, error.status);
			}
			console.error("CustomersAdminController.listProducts:", error);
			return jsonError("Internal server error", 500);
		}
	}

	static async importProducts(
		request: NextRequest,
		customerIdParam: string,
	): Promise<NextResponse> {
		try {
			const auth = extractAdminFromRequest(request);
			if (!auth.success) return auth.response;

			const customerId = CustomersAdminService.parseId(customerIdParam);
			if (customerId === null) return jsonError("Invalid customer id", 400);

			const body = (await request.json()) as { products?: unknown };
			const result = await CustomersAdminService.importProducts(
				customerId,
				body,
			);
			return jsonSuccess(result);
		} catch (error) {
			if (error instanceof CustomersAdminValidationError) {
				return jsonError(error.message, error.status);
			}
			console.error("CustomersAdminController.importProducts:", error);
			return jsonError("Internal server error", 500);
		}
	}
}
