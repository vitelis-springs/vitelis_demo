import { NextRequest } from "next/server";
import { GeneratedCompanyReportsController } from "../../server/modules/generated-company-reports";

export async function GET(request: NextRequest) {
  return GeneratedCompanyReportsController.get(request);
}

export async function POST(request: NextRequest) {
  return GeneratedCompanyReportsController.generateSellerBriefDocx(request);
}
