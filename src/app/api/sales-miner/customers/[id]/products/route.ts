import { NextRequest } from "next/server";
import { CustomersAdminController } from "../../../../../server/modules/customers-admin";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return CustomersAdminController.listProducts(request, id);
}
