import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    let body: { name?: string; subject?: string; html?: string };
    try {
      body = await request.json();
    } catch (parseError) {
      console.error("[API] Failed to parse request body:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body" },
        { status: 400 },
      );
    }
    const {
      name = "Hello World Template",
      subject = "Hello World",
      html,
    } = body;

    // Use same env var pattern as token route for consistency
    // IMPORTANT: Check NEXT_PUBLIC_STRIPO_PLUGIN_ID before NEXT_PUBLIC_STRIPO_API_KEY
    // because API_KEY might be a JWT token, not the plugin ID
    const apiKey = process.env.STRIPO_PLUGIN_ID || 
                   process.env.NEXT_PUBLIC_STRIPO_PLUGIN_ID ||
                   process.env.NEXT_PUBLIC_STRIPO_API_KEY || 
                   process.env.STRIPO_API_KEY;
    const secretKey = process.env.STRIPO_SECRET_KEY || 
                      process.env.NEXT_PUBLIC_STRIPO_SECRET_KEY;

    console.log("[API] Create template - env vars:", {
      hasPluginId: !!process.env.STRIPO_PLUGIN_ID,
      hasApiKey: !!process.env.NEXT_PUBLIC_STRIPO_API_KEY,
      hasSecretKey: !!process.env.STRIPO_SECRET_KEY,
      hasPublicSecretKey: !!process.env.NEXT_PUBLIC_STRIPO_SECRET_KEY,
      apiKeyLength: apiKey?.length,
      secretKeyLength: secretKey?.length,
    });

    if (!apiKey || !secretKey) {
      return NextResponse.json(
        { 
          error: "Stripo API credentials not configured",
          hint: "Please set STRIPO_PLUGIN_ID and STRIPO_SECRET_KEY in your .env.local file",
        },
        { status: 500 },
      );
    }

    // Stripo Plugin API doesn't support creating templates via REST API
    // The Stripo UI Editor SDK creates templates when initialized with an emailId
    // We'll generate a unique emailId that the SDK can use to create a new template
    console.log("[API] Generating emailId for Stripo UI Editor SDK");
    
    const generatedEmailId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    return NextResponse.json(
      {
        emailId: generatedEmailId,
        note: "The Stripo UI Editor SDK will create the template when initialized with this emailId",
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("[API] Error creating Stripo template:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Failed to create template";
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
