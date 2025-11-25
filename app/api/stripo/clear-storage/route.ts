import { type NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    let body: { storageKey?: string; clearAll?: boolean } = {};
    try {
      body = await request.json().catch(() => ({}));
    } catch (_parseError) {
      // Body is optional, continue with empty object
      body = {};
    }

    const { storageKey = "stripo-email-id", clearAll = false } = body;

    console.log("[API] ===== CLEARING STORAGE =====");
    console.log("[API] Request:", {
      storageKey,
      clearAll,
    });

    // This is a client-side operation, but we can provide instructions
    // The actual clearing happens client-side via a utility function
    return NextResponse.json({
      success: true,
      message: clearAll
        ? "All Stripo-related localStorage keys should be cleared client-side"
        : `Storage key '${storageKey}' should be cleared client-side`,
      storageKey,
      clearAll,
      instructions: {
        clientSide: "Call clearStripoStorage() function from the component",
        manual: `In browser console: localStorage.removeItem('${storageKey}')`,
        clearAll: clearAll
          ? "In browser console: Object.keys(localStorage).filter(k => k.includes('stripo')).forEach(k => localStorage.removeItem(k))"
          : undefined,
      },
    });
  } catch (error) {
    console.error("[API] Error in clear-storage route:", error);
    const errorMessage =
      error instanceof Error
        ? error.message
        : "Failed to process clear storage request";
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
