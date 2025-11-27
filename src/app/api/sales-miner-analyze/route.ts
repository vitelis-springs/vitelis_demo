import { NextRequest, NextResponse } from "next/server";
import { CreditsServiceServer } from "../../server/services/creditsService.server";
import { SalesMinerAnalyzeServiceServer } from "../../server/services/salesMinerAnalyzeService.server";

export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Access token required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    let payload: any;

    // Basic JWT validation
    try {
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      payload = JSON.parse(
        atob(tokenParts[1]?.replace(/-/g, "+").replace(/_/g, "/") || "")
      );

      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }

      console.log("🔍 API: Authenticated user:", {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      });
    } catch (jwtError) {
      console.error("🔍 API: JWT validation failed:", jwtError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const userId = searchParams.get("userId");
    const executionId = searchParams.get("executionId");

    console.log("🔍 API: GET request received with params:", {
      id,
      userId,
      executionId,
    });

    if (id) {
      // Get specific sales miner analyze by ID
      const salesMinerAnalyze =
        await SalesMinerAnalyzeServiceServer.getSalesMinerAnalyzeById(id);
      if (!salesMinerAnalyze) {
        return NextResponse.json(
          { error: "Sales miner analyze record not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(salesMinerAnalyze);
    }

    if (executionId) {
      // Get sales miner analyze by execution ID
      const salesMinerAnalyze =
        await SalesMinerAnalyzeServiceServer.getSalesMinerAnalyzeByExecutionId(
          executionId
        );
      if (!salesMinerAnalyze) {
        return NextResponse.json(
          { error: "Sales miner analyze record not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(salesMinerAnalyze);
    }

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    if (userId) {
      // If requesting specific user's data, ensure it matches the token or user is admin

      const isAuthorized =
        String(userId).trim() === String(payload.userId).trim() ||
        payload.role === "admin";

      if (!isAuthorized) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }

      if (userId === "all") {
        // Check if user is admin
        if (payload.role !== "admin") {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        const salesMinerAnalyzes =
          await SalesMinerAnalyzeServiceServer.getSalesMinerAnalyzesByUser(
            "all",
            page,
            limit
          );
        return NextResponse.json(salesMinerAnalyzes);
      }

      const salesMinerAnalyzes =
        await SalesMinerAnalyzeServiceServer.getSalesMinerAnalyzesByUser(
          userId,
          page,
          limit
        );

      return NextResponse.json(salesMinerAnalyzes);
    }

    // If no specific userId is provided in the query, and not 'all',
    // then return the current user's analyzes by default, unless admin.
    // This handles the case where `userId` query param is absent.
    if (payload.role === "admin") {
      const salesMinerAnalyzes =
        await SalesMinerAnalyzeServiceServer.getSalesMinerAnalyzesByUser(
          "all",
          page,
          limit
        );
      return NextResponse.json(salesMinerAnalyzes);
    } else {
      // For non-admin users, if no userId is specified, return their own data
      const salesMinerAnalyzes =
        await SalesMinerAnalyzeServiceServer.getSalesMinerAnalyzesByUser(
          payload.userId,
          page,
          limit
        );
      return NextResponse.json(salesMinerAnalyzes);
    }
  } catch (error) {
    console.error("Error in GET /api/sales-miner-analyze:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Access token required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    let payload: any;

    // Basic JWT validation
    try {
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      payload = JSON.parse(
        atob(tokenParts[1]?.replace(/-/g, "+").replace(/_/g, "/") || "")
      );

      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }
    } catch (jwtError) {
      console.error("📝 API: JWT validation failed:", jwtError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    console.log("📝 API: POST request received");
    const body = await request.json();
    const { analyzeId, ...data } = body;
    console.log("📝 API: Request body parsed:", { analyzeId, data });

    // Extract user ID from JWT token
    const tokenParts = token.split(".");
    payload = JSON.parse(
      atob(tokenParts[1]?.replace(/-/g, "+").replace(/_/g, "/") || "")
    );
    const userId = payload.userId;
    const userRole = payload.role;
    console.log(
      "👤 API: Creating/updating sales miner analyze for user:",
      userId
    );

    if (analyzeId) {
      // Update existing sales miner analyze
      const updatedSalesMinerAnalyze =
        await SalesMinerAnalyzeServiceServer.updateSalesMinerAnalyze(
          analyzeId,
          data
        );

      if (!updatedSalesMinerAnalyze) {
        return NextResponse.json(
          { error: "Sales miner analyze record not found" },
          { status: 404 }
        );
      }
      return NextResponse.json(updatedSalesMinerAnalyze);
    } else {
      // Create new sales miner analyze with user ID
      const salesMinerAnalyzeDataWithUser = { ...data, user: userId };
      const newSalesMinerAnalyze =
        await SalesMinerAnalyzeServiceServer.createSalesMinerAnalyze(
          salesMinerAnalyzeDataWithUser
        );

      // Deduct credits after successful creation (only for users with role "user")
      if (userRole === "user" && newSalesMinerAnalyze) {
        const creditsDeducted = await CreditsServiceServer.deductCredits(
          userId,
          1
        );
        if (!creditsDeducted) {
          console.error(
            "❌ API: Failed to deduct credits after creating sales miner analysis"
          );
          // Note: We don't rollback the analysis creation here as it's already created
          // In a production environment, you might want to implement transaction rollback
        }
      }

      return NextResponse.json(newSalesMinerAnalyze);
    }
  } catch (error) {
    console.error("Error in POST /api/sales-miner-analyze:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Check authentication
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Access token required" },
        { status: 401 }
      );
    }

    const token = authHeader.replace("Bearer ", "");

    // Basic JWT validation
    try {
      const tokenParts = token.split(".");
      if (tokenParts.length !== 3) {
        throw new Error("Invalid JWT format");
      }

      const payload = JSON.parse(
        atob(tokenParts[1]?.replace(/-/g, "+").replace(/_/g, "/") || "")
      );

      // Check if token is expired
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        throw new Error("Token expired");
      }

      console.log("🗑️ API: Authenticated user:", {
        userId: payload.userId,
        email: payload.email,
        role: payload.role,
      });
    } catch (jwtError) {
      console.error("🗑️ API: JWT validation failed:", jwtError);
      return NextResponse.json(
        { error: "Invalid or expired token" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID is required" }, { status: 400 });
    }

    const deleted =
      await SalesMinerAnalyzeServiceServer.deleteSalesMinerAnalyze(id);
    if (!deleted) {
      return NextResponse.json(
        { error: "Sales miner analyze record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Sales miner analyze record deleted" });
  } catch (error) {
    console.error("Error in DELETE /api/sales-miner-analyze:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
