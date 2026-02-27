import { NextRequest } from "next/server";
import { IndustriesController } from "../../server/modules/industries";

export async function GET(request: NextRequest) {
  return IndustriesController.list(request);
}

export async function POST(request: NextRequest) {
  return IndustriesController.create(request);
}

