import { NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest } from "../../../../lib/auth";
import { IndustriesService } from "./industries.service";

export class IndustriesController {
  static async list(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const items = await IndustriesService.listIndustries();
      return NextResponse.json(items);
    } catch (error) {
      console.error("Error in IndustriesController.list:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  static async create(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const body = await request.json();
      const rawName = body?.name;

      if (typeof rawName !== "string" || !rawName.trim()) {
        return NextResponse.json({ error: "name is required" }, { status: 400 });
      }

      const created = await IndustriesService.createIndustry(rawName);
      return NextResponse.json(created);
    } catch (error) {
      console.error("Error in IndustriesController.create:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
}

