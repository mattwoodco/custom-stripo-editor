import { NextResponse } from "next/server";

/**
 * Handle source map requests gracefully (return 204 instead of 404)
 * 
 * This prevents console errors from missing source maps (e.g., from Stripo editor
 * or other third-party scripts). Source maps are optional debugging aids and
 * missing ones don't affect functionality.
 * 
 * Best practice: Return 204 No Content for missing source maps rather than 404,
 * as this suppresses error logs without serving actual content.
 */
export async function GET() {
	return new NextResponse(null, {
		status: 204, // No Content
		headers: {
			"Content-Type": "application/json",
		},
	});
}

