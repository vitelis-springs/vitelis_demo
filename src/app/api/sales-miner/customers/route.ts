import { NextRequest } from "next/server";
import { CustomersAdminController } from "../../../server/modules/customers-admin";

export async function GET(request: NextRequest) {
	return CustomersAdminController.list(request);
}

export async function POST(request: NextRequest) {
	return CustomersAdminController.createCustomer(request);
}
