import { NextRequest } from "next/server";
import { CustomersAdminController } from "../../../../server/modules/customers-admin";

export async function GET(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return CustomersAdminController.getById(request, id);
}

export async function PATCH(
	request: NextRequest,
	{ params }: { params: Promise<{ id: string }> },
) {
	const { id } = await params;
	return CustomersAdminController.updateCustomer(request, id);
}
