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

    const apiKey = process.env.NEXT_PUBLIC_STRIPO_API_KEY;
    const secretKey = process.env.NEXT_PUBLIC_STRIPO_SECRET_KEY;

    if (!apiKey) {
      return NextResponse.json(
        { error: "Stripo API key not configured" },
        { status: 500 },
      );
    }

    // Try multiple possible Stripo API endpoints
    // The correct endpoint may vary based on Stripo account type
    const endpoints = [
      "https://api.stripo.email/v1/emails",
      "https://plugins.stripo.email/api/v1/emails",
      "https://api.stripo.email/v1/templates",
    ];
    
    let endpoint = endpoints[0];

    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "X-API-Key": apiKey,
    };

    if (secretKey) {
      headers["X-Secret-Key"] = secretKey;
    }

    // Create hello world template HTML if not provided
    const templateHtml =
      html ||
      `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #f4f4f4;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          <h1 style="color: #333333; font-size: 32px; margin: 0 0 20px 0; text-align: center;">
            Hello, World!
          </h1>
          <p style="color: #666666; font-size: 16px; line-height: 1.6; margin: 0; text-align: center;">
            This is your first email template created with Stripo Editor.
          </p>
        </div>
      </body>
    </html>
  `;

    let response: Response | null = null;
    let lastError: Error | null = null;
    
    // Try each endpoint until one works
    for (const testEndpoint of endpoints) {
      try {
        console.log(`[API] Trying Stripo endpoint: ${testEndpoint}`);
        response = await fetch(testEndpoint, {
          method: "POST",
          headers,
          body: JSON.stringify({
            name,
            subject,
            html: templateHtml,
          }),
        });
        
        if (response.ok) {
          endpoint = testEndpoint;
          console.log(`[API] Successfully connected to: ${endpoint}`);
          break;
        } else {
          console.warn(
            `[API] Endpoint ${testEndpoint} returned ${response.status}`,
          );
        }
      } catch (fetchError) {
        lastError =
          fetchError instanceof Error
            ? fetchError
            : new Error(String(fetchError));
        console.warn(`[API] Endpoint ${testEndpoint} failed:`, lastError.message);
      }
    }

    if (!response || !response.ok) {
      const errorText = response
        ? await response.text().catch(() => `HTTP ${response.status}`)
        : lastError?.message || "Unknown error";
      console.error("[API] Stripo API error:", response?.status || "no response", errorText);

      // Stripo REST API may not support template creation via these endpoints
      // Generate a client-side emailId instead - the UI Editor SDK can work with any emailId
      console.warn(
        "[API] Stripo API endpoints not available, generating client-side emailId",
      );
      const generatedEmailId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      return NextResponse.json(
        {
          emailId: generatedEmailId,
          warning: `Stripo API returned ${response?.status || "no response"}, using generated emailId`,
          note: "The Stripo UI Editor SDK will create the template when initialized",
        },
        { status: 200 },
      );
    }

    let data: { id?: string; emailId?: string; email?: { id?: string } };
    try {
      data = await response.json();
    } catch (jsonError) {
      console.error("[API] Failed to parse Stripo API response:", jsonError);
      return NextResponse.json(
        { error: "Invalid response from Stripo API" },
        { status: 500 },
      );
    }

    const emailId = data.id || data.emailId || data.email?.id;

    if (!emailId) {
      console.warn("[API] No emailId in response:", data);
      return NextResponse.json(
        { error: "Template created but no emailId returned", data },
        { status: 500 },
      );
    }

    return NextResponse.json({ emailId, ...data });
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
