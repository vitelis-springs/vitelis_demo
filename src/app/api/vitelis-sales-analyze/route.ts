import { NextRequest } from "next/server";
import { VitelisSalesController } from "../../server/modules/vitelis-sales";

export async function GET(request: NextRequest) {
  return VitelisSalesController.get(request);
}

export async function POST(request: NextRequest) {
  return VitelisSalesController.create(request);
}

export async function DELETE(request: NextRequest) {
  return VitelisSalesController.delete(request);
}
