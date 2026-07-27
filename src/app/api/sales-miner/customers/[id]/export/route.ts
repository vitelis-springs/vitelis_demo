import { type NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { extractAdminFromRequest } from "../../../../../../lib/auth";
import prisma from "../../../../../../lib/prisma";

const ACCOUNTS_HEADERS = [
	"#",
	"Company Name",
	"Exchange Ticker",
	"GICS Code",
	"Subsidiaries",
	"Corporate Website",
	"Career Site",
	"Investor Relations Site",
];

const PRODUCTS_HEADERS = [
	"#",
	"Org Unit",
	"(Product) Group/Category",
	"Sub-Category",
	"Product name",
	"Internal Description",
	"Product Value proposition",
	"Customer Pain point - resolved by the product/service",
	"Markets",
	"Geographies",
	"Price",
	"Buying Trigger Signals",
	"Land Anchor",
	"Expand Anchor",
	"Scale Anchor",
	"Cross-Portfolio Connection (Land → Expand → Scale)",
];

function safeFileName(name: string): string {
	const cleaned = name
		.trim()
		.replace(/[\\/:*?"<>|]+/g, "")
		.replace(/\s+/g, " ")
		.slice(0, 100);
	return cleaned || "customer";
}

function cellStr(value: unknown): string {
	if (value == null) return "";
	return typeof value === "string" ? value : String(value);
}

function additionalDataOf(meta: unknown): Record<string, unknown> {
	if (!meta || typeof meta !== "object" || Array.isArray(meta)) return {};
	const raw = (meta as Record<string, unknown>).additional_data;
	return raw && typeof raw === "object" && !Array.isArray(raw)
		? (raw as Record<string, unknown>)
		: {};
}

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const { id } = await params;
	const customerId = BigInt(id);

	const [customer, accounts, products] = await Promise.all([
		prisma.customers.findUnique({
			where: { id: customerId },
			select: { display_name: true },
		}),
		prisma.customer_accounts.findMany({
			where: { customer_id: customerId },
			include: { companies: true },
			orderBy: { companies: { name: "asc" } },
		}),
		prisma.customer_products.findMany({
			where: { customer_id: customerId, product_level: "l3", is_active: true },
			include: { customer_products: true },
			orderBy: [{ parent_id: "asc" }, { name: "asc" }],
		}),
	]);

	const wb = new ExcelJS.Workbook();

	const wsAccounts = wb.addWorksheet("target-accounts");
	wsAccounts.getColumn(1).width = 6;
	wsAccounts.getColumn(2).width = 40;
	wsAccounts.getColumn(3).width = 16;
	wsAccounts.getColumn(4).width = 12;
	wsAccounts.getColumn(5).width = 50;
	wsAccounts.getColumn(6).width = 40;
	wsAccounts.getColumn(7).width = 40;
	wsAccounts.getColumn(8).width = 40;

	const accountsHeaderRow = wsAccounts.getRow(1);
	ACCOUNTS_HEADERS.forEach((label, i) => {
		const cell = accountsHeaderRow.getCell(i + 1);
		cell.value = label;
		cell.font = { bold: true };
	});

	accounts.forEach((acc, i) => {
		wsAccounts.addRow([
			i + 1,
			acc.companies.name,
			"",
			acc.companies.gics_code ?? "",
			"",
			acc.companies.url ?? "",
			acc.companies.career_portal ?? "",
			acc.companies.invest_portal ?? "",
		]);
	});

	const wsProducts = wb.addWorksheet("product-table");
	wsProducts.getColumn(1).width = 6;
	for (let col = 2; col <= PRODUCTS_HEADERS.length; col++) {
		wsProducts.getColumn(col).width = 28;
	}

	const productsHeaderRow = wsProducts.getRow(1);
	PRODUCTS_HEADERS.forEach((label, i) => {
		const cell = productsHeaderRow.getCell(i + 1);
		cell.value = label;
		cell.font = { bold: true };
	});

	products.forEach((product, i) => {
		const additionalData = additionalDataOf(product.meta);
		wsProducts.addRow([
			i + 1,
			cellStr(additionalData.org_unit),
			product.customer_products?.name ?? "",
			cellStr(additionalData.sub_category),
			product.name,
			product.description ?? "",
			cellStr(additionalData.value_proposition),
			cellStr(additionalData.pain_point),
			cellStr(additionalData.markets),
			cellStr(additionalData.geographies),
			cellStr(additionalData.price),
			cellStr(additionalData.buying_trigger_signals),
			cellStr(additionalData.land_anchor),
			cellStr(additionalData.expand_anchor),
			cellStr(additionalData.scale_anchor),
			cellStr(additionalData.cross_portfolio_connection),
		]);
	});

	const buffer = await wb.xlsx.writeBuffer();

	const fileName = `${safeFileName(customer?.display_name ?? `customer-${id}`)}-export.xlsx`;

	return new NextResponse(buffer, {
		status: 200,
		headers: {
			"Content-Type":
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"Content-Disposition": `attachment; filename="${fileName}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
		},
	});
}
