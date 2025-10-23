import { type NextRequest, NextResponse } from "next/server";
import { ensureDBConnection } from "../../../../lib/mongodb";
import User from "../../../server/models/User";

/**
 * API endpoint to get user credits information
 * Returns whether credits should be displayed and current credits amount
 * Accessible by authenticated users (both admin and user roles)
 */
export async function GET(request: NextRequest) {
	try {
		// Check authentication
		const authHeader = request.headers.get("authorization");
		if (!authHeader || !authHeader.startsWith("Bearer ")) {
			return NextResponse.json(
				{ error: "Access token required" },
				{ status: 401 },
			);
		}

		const token = authHeader.replace("Bearer ", "");
		let userId: string;
		let userRole: string;

		try {
			// Basic JWT structure validation
			const tokenParts = token.split(".");
			if (tokenParts.length !== 3) {
				throw new Error("Invalid JWT format");
			}

			const payload = JSON.parse(
				Buffer.from(tokenParts[1] || "", "base64").toString(),
			);
			
			if (payload.exp && payload.exp * 1000 < Date.now()) {
				throw new Error("Token expired");
			}

			userId = payload.userId;
			userRole = payload.role;

			console.log("🔍 Credits API: User authenticated:", {
				userId,
				email: payload.email,
				role: userRole,
			});
		} catch (jwtError) {
			console.error("🔍 Credits API: JWT validation failed:", jwtError);
			return NextResponse.json(
				{ error: "Invalid or expired token" },
				{ status: 401 },
			);
		}

		// Connect to database
		await ensureDBConnection();

		// Fetch user data (excluding password)
		const user = await User.findById(userId).select("-password").lean();
		
		if (!user) {
			return NextResponse.json(
				{ error: "User not found" },
				{ status: 404 },
			);
		}

		// Determine if credits should be displayed based on user role
		const shouldDisplayCredits = user.role === "user";
		const currentCredits = user.credits ?? 0;

		console.log("🔍 Credits API: User credits info:", {
			userId: user._id,
			role: user.role,
			shouldDisplayCredits,
			currentCredits,
		});

		return NextResponse.json({
			success: true,
			data: {
				shouldDisplayCredits,
				currentCredits,
				userRole: user.role,
			},
		});
	} catch (error) {
		console.error("❌ Credits API: Error fetching user credits:", error);
		return NextResponse.json(
			{
				success: false,
				error: "Failed to fetch user credits information",
			},
			{ status: 500 },
		);
	}
}
