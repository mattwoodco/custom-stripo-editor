import { type NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const apiKey = process.env.NEXT_PUBLIC_STRIPO_API_KEY;
    const secretKey = process.env.NEXT_PUBLIC_STRIPO_SECRET_KEY;

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { error: "Stripo API credentials not configured" },
        { status: 500 },
      );
    }

    // Stripo auth endpoint - using pluginId (apiKey) and secretKey
    const STRIPO_AUTH_URL = "https://plugins.stripo.email/api/v1/auth";

    // Generate a userId (can be any unique identifier for the user)
    // In a real app, this would come from the authenticated user's session
    const userId = `user-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const response = await fetch(STRIPO_AUTH_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        pluginId: apiKey,
        secretKey: secretKey,
        userId: userId,
        role: "user",
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({
        message: `HTTP ${response.status}`,
      }));
      console.error("[API] Stripo auth error:", response.status, error);
      return NextResponse.json(
        {
          error: error.message || "Failed to authenticate with Stripo",
          code: error.code,
          status: response.status,
        },
        { status: response.status },
      );
    }

    const data = (await response.json()) as { token: string };
    return NextResponse.json({ token: data.token });
  } catch (error) {
    console.error("[API] Error fetching Stripo token:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to fetch token";
    return NextResponse.json(
      { error: errorMessage },
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
}

