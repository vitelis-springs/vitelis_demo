import { NextRequest, NextResponse } from "next/server";
import { extractAdminFromRequest, extractAuthFromRequest } from "../../../../lib/auth";
import { VitelisSalesService } from "./vitelis-sales.service";

export class VitelisSalesController {
  static async get(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAuthFromRequest(request);
      if (!auth.success) return auth.response;

      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");
      const userId = searchParams.get("userId");
      const executionId = searchParams.get("executionId");
      const page = parseInt(searchParams.get("page") || "1");
      const limit = parseInt(searchParams.get("limit") || "10");

      if (id) {
        const analyze = await VitelisSalesService.getVitelisSalesAnalyzeById(id);
        if (!analyze) {
          return NextResponse.json(
            { error: "VitelisSales analyze record not found" },
            { status: 404 }
          );
        }
        const isOwn = String(analyze.user) === String(auth.user.userId);
        if (!isOwn && auth.user.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json(analyze);
      }

      if (executionId) {
        const analyze =
          await VitelisSalesService.getVitelisSalesAnalyzeByExecutionId(executionId);
        if (!analyze) {
          return NextResponse.json(
            { error: "VitelisSales analyze record not found" },
            { status: 404 }
          );
        }
        const isOwn = String(analyze.user) === String(auth.user.userId);
        if (!isOwn && auth.user.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        return NextResponse.json(analyze);
      }

      const effectiveUserId = userId ?? (auth.user.role === "admin" ? "all" : auth.user.userId);
      if (effectiveUserId !== "all") {
        const isAuthorized =
          effectiveUserId === auth.user.userId || auth.user.role === "admin";
        if (!isAuthorized) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
      } else if (auth.user.role !== "admin") {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      const result = await VitelisSalesService.getVitelisSalesAnalyzesByUser(
        effectiveUserId,
        page,
        limit
      );
      return NextResponse.json(result);
    } catch (error) {
      console.error("Error in VitelisSalesController.get:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  static async create(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const body = await request.json();
      const { analyzeId, ...data } = body;

      if (analyzeId) {
        const updated = await VitelisSalesService.updateVitelisSalesAnalyze(
          analyzeId,
          data
        );
        if (!updated) {
          return NextResponse.json(
            { error: "VitelisSales analyze record not found" },
            { status: 404 }
          );
        }
        return NextResponse.json(updated);
      }

      if (!data.companyName || !data.url || data.industry_id === undefined) {
        return NextResponse.json(
          { error: "Missing required fields: companyName, url, industry_id" },
          { status: 400 }
        );
      }

      const newAnalyze = await VitelisSalesService.createVitelisSalesAnalyze(
        data,
        auth.user.userId
      );
      return NextResponse.json(newAnalyze);
    } catch (error) {
      console.error("Error in VitelisSalesController.create:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }

  static async delete(request: NextRequest): Promise<NextResponse> {
    try {
      const auth = extractAdminFromRequest(request);
      if (!auth.success) return auth.response;

      const { searchParams } = new URL(request.url);
      const id = searchParams.get("id");

      if (!id) {
        return NextResponse.json({ error: "ID is required" }, { status: 400 });
      }

      const deleted = await VitelisSalesService.deleteVitelisSalesAnalyze(id);
      if (!deleted) {
        return NextResponse.json(
          { error: "VitelisSales analyze record not found" },
          { status: 404 }
        );
      }

      return NextResponse.json({ message: "VitelisSales analyze record deleted" });
    } catch (error) {
      console.error("Error in VitelisSalesController.delete:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
  }
}
