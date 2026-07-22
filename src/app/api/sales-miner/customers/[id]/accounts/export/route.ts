import { type NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { extractAdminFromRequest } from "../../../../../../../lib/auth";
import prisma from "../../../../../../../lib/prisma";

const HEADERS = [
	"#",
	"Company Name",
	"Exchange Ticker",
	"GICS Code",
	"Subsidiaries",
	"Corporate Website",
	"Career Site",
	"Investor Relations Site",
];

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const auth = extractAdminFromRequest(request);
	if (!auth.success) return auth.response;

	const { id } = await params;
	const customerId = BigInt(id);

	const accounts = await prisma.customer_accounts.findMany({
		where: { customer_id: customerId },
		include: { companies: true },
		orderBy: { companies: { name: "asc" } },
	});

	const wb = new ExcelJS.Workbook();
	const ws = wb.addWorksheet("target-accounts");

	ws.getColumn(1).width = 6;
	ws.getColumn(2).width = 40;
	ws.getColumn(3).width = 16;
	ws.getColumn(4).width = 12;
	ws.getColumn(5).width = 50;
	ws.getColumn(6).width = 40;
	ws.getColumn(7).width = 40;
	ws.getColumn(8).width = 40;

	const headerRow = ws.getRow(1);
	HEADERS.forEach((label, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = label;
		cell.font = { bold: true };
	});

	accounts.forEach((acc, i) => {
		ws.addRow([
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

	const buffer = await wb.xlsx.writeBuffer();

	return new NextResponse(buffer, {
		status: 200,
		headers: {
			"Content-Type":
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"Content-Disposition": `attachment; filename="customer-${id}-accounts.xlsx"`,
		},
	});
}
