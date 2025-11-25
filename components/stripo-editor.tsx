"use client";

import { useEffect, useRef, useState } from "react";

interface StripoEditorProps {
  emailId?: string; // Optional: use existing email template
  html?: string; // Optional: HTML content for the template
  css?: string; // Optional: CSS content for the template
  createHelloWorldTemplate?: boolean; // Create a hello world template on mount
  mergeTags?: Array<{
    category: string;
    entries: Array<{
      label: string;
      value: string;
    }>;
  }>;
}

type LoadingState = "idle" | "loading" | "loaded" | "error";

// Helper function to fetch Stripo token from API
async function getStripoToken(): Promise<string> {
  const response = await fetch("/api/stripo/token");
  if (!response.ok) {
    const error = await response.json().catch(() => ({
      error: "Failed to fetch token",
    }));
    throw new Error(error.error || "Failed to fetch Stripo token");
  }
  const data = await response.json();
  return data.token;
}

// Default HTML template for new emails
const DEFAULT_HTML = `
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
        This is your email template. Start customizing it with Stripo Editor.
      </p>
    </div>
  </body>
</html>
`;

// Check if StripoEditorApi is available (editor is ready)
function checkEditorReady(): boolean {
  return !!(
    window.StripoEditorApi?.actionsApi &&
    typeof window.StripoEditorApi.actionsApi.save === "function" &&
    typeof window.StripoEditorApi.actionsApi.compileEmail === "function" &&
    typeof window.StripoEditorApi.actionsApi.getTemplateData === "function"
  );
}

// Create a hello world email template via Next.js API route (server-side)
async function createHelloWorldTemplate(): Promise<string | null> {
  try {
    console.log(
      "[StripoEditor] Creating hello world template via API route...",
    );

    const response = await fetch("/api/stripo/create-template", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Hello World Template",
        subject: "Hello World",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({
        error: "Unknown error",
      }));
      console.error(
        "[StripoEditor] Failed to create template:",
        response.status,
        errorData,
      );
      return null;
    }

    const data = await response.json();
    const emailId = data.emailId || data.id;

    if (emailId) {
      console.log(
        "[StripoEditor] Hello world template created successfully:",
        emailId,
      );
      return emailId;
    }

    console.warn(
      "[StripoEditor] Template created but no emailId in response:",
      data,
    );
    return null;
  } catch (error) {
    console.error("[StripoEditor] Error creating hello world template:", error);
    return null;
  }
}

export function StripoEditor({
  emailId: providedEmailId,
  html: providedHtml,
  css: providedCss,
  createHelloWorldTemplate: shouldCreateTemplate = false,
  mergeTags = [],
}: StripoEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const editorInitializedRef = useRef(false);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createdEmailIdRef = useRef<string | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const zoneCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(
    null,
  );
  const uiEditorCheckIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);

  useEffect(() => {
    // Prevent double initialization (React StrictMode in dev)
    if (editorInitializedRef.current) {
      console.log("[StripoEditor] Already initialized, skipping...");
      return;
    }

    if (!containerRef.current) {
      console.log("[StripoEditor] Container not ready, will retry...");
      return;
    }

    console.log("[StripoEditor] Starting initialization...");
    setLoadingState("loading");
    setErrorMessage(null);
    editorInitializedRef.current = true;

    // Load zone.js first if not already loaded
    const loadZoneJs = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if zone.js is already loaded
        if (typeof window !== "undefined" && (window as any).Zone) {
          console.log("[StripoEditor] zone.js already loaded");
          resolve();
          return;
        }

        // Check if script tag already exists (from Next.js Script component or manually loaded)
        const existingZoneScript = document.querySelector(
          'script[src*="zone.js"], script#zone-js-script',
        );
        if (existingZoneScript) {
          console.log(
            "[StripoEditor] zone.js script tag exists, waiting for load...",
          );
          let attempts = 0;
          const maxAttempts = 100; // 10 seconds
          const checkInterval = setInterval(() => {
            attempts++;
            if ((window as any).Zone) {
              clearInterval(checkInterval);
              console.log("[StripoEditor] zone.js loaded");
              resolve();
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              console.warn(
                "[StripoEditor] zone.js script exists but Zone not available after waiting",
              );
              // Don't reject - proceed anyway as zone.js might be optional
              resolve();
            }
          }, 100);
          return;
        }

        // Load zone.js
        console.log("[StripoEditor] Loading zone.js...");

        // Ensure document.head is ready
        if (!document.head) {
          console.error("[StripoEditor] document.head not available");
          reject(new Error("document.head not available"));
          return;
        }

        const script = document.createElement("script");
        // Use cdnjs CDN (correct path structure for zone.js 0.14.3)
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/zone.js/0.14.3/zone.min.js";
        script.async = false; // Load synchronously to ensure it's available

        script.onload = () => {
          console.log(
            "[StripoEditor] zone.js script loaded, checking Zone object...",
          );
          // Give it a moment to initialize
          setTimeout(() => {
            if ((window as any).Zone) {
              console.log("[StripoEditor] zone.js Zone object available");
              resolve();
            } else {
              console.warn(
                "[StripoEditor] zone.js loaded but Zone not available, retrying check...",
              );
              // Retry a few more times
              let retries = 0;
              const retryInterval = setInterval(() => {
                retries++;
                if ((window as any).Zone) {
                  clearInterval(retryInterval);
                  console.log(
                    "[StripoEditor] zone.js Zone object now available",
                  );
                  resolve();
                } else if (retries >= 20) {
                  clearInterval(retryInterval);
                  reject(
                    new Error(
                      "zone.js loaded but Zone not available after retries",
                    ),
                  );
                }
              }, 100);
            }
          }, 200);
        };

        script.onerror = (error) => {
          console.error("[StripoEditor] Failed to load zone.js:", error);
          console.error("[StripoEditor] Script src:", script.src);

          // Try fallback CDN
          console.log("[StripoEditor] Trying fallback CDN (jsdelivr)...");
          const fallbackScript = document.createElement("script");
          fallbackScript.src =
            "https://cdn.jsdelivr.net/npm/zone.js@0.14.3/dist/zone.min.js";
          fallbackScript.async = false;

          fallbackScript.onload = () => {
            console.log("[StripoEditor] zone.js loaded from fallback CDN");
            setTimeout(() => {
              if ((window as any).Zone) {
                resolve();
              } else {
                reject(
                  new Error(
                    "zone.js loaded from fallback but Zone not available",
                  ),
                );
              }
            }, 200);
          };

          fallbackScript.onerror = () => {
            console.error("[StripoEditor] Fallback CDN also failed");
            reject(new Error("Failed to load zone.js from both CDNs"));
          };

          document.head.appendChild(fallbackScript);
        };

        // Append to head (simpler than insertBefore)
        document.head.appendChild(script);
      });
    };

    const initStripoEditor = async () => {
      // Wait for container to be available
      if (!containerRef.current) {
        console.error(
          "[StripoEditor] Cannot initialize: container ref is not available",
        );
        setErrorMessage("Editor container not available");
        setLoadingState("error");
        return;
      }

      // Ensure container has dimensions
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        containerRef.current.style.width = "100%";
        containerRef.current.style.height = "600px";
        containerRef.current.style.minHeight = "600px";
      }

      // Determine emailId to use
      let emailIdToUse = providedEmailId;
      let htmlToUse = providedHtml;

      // Create hello world template if requested
      if (shouldCreateTemplate && !emailIdToUse) {
        console.log(
          "[StripoEditor] Creating hello world template before initialization...",
        );
        try {
          const createdEmailId = await createHelloWorldTemplate();
          if (createdEmailId) {
            emailIdToUse = createdEmailId;
            createdEmailIdRef.current = createdEmailId;
            // Use DEFAULT_HTML when creating hello world template
            if (!htmlToUse) {
              htmlToUse = DEFAULT_HTML;
              console.log(
                "[StripoEditor] Using DEFAULT_HTML for hello world template",
              );
            }
          } else {
            console.warn(
              "[StripoEditor] Failed to create template, using generated ID",
            );
          }
        } catch (error) {
          console.error("[StripoEditor] Error creating template:", error);
        }
      }

      // Generate emailId if not provided
      if (!emailIdToUse) {
        emailIdToUse = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(
          "[StripoEditor] Generated emailId for new email:",
          emailIdToUse,
        );
      } else {
        console.log("[StripoEditor] Using emailId:", emailIdToUse);
      }

      // Ensure HTML is set - use DEFAULT_HTML if creating hello world template and no HTML provided
      if (!htmlToUse && shouldCreateTemplate) {
        htmlToUse = DEFAULT_HTML;
        console.log(
          "[StripoEditor] Using DEFAULT_HTML for hello world template",
        );
      }

      // Check if UIEditor is available
      if (!window.UIEditor) {
        console.error(
          "[StripoEditor] Cannot initialize: window.UIEditor is not available",
        );
        setErrorMessage("Stripo editor script not loaded");
        setLoadingState("error");
        return;
      }

      // Initialize Stripo editor with correct config
      try {
        const finalHtml = htmlToUse || providedHtml || DEFAULT_HTML;
        const finalCss = providedCss || "";

        console.log("[StripoEditor] Initializing with:", {
          emailId: emailIdToUse,
          htmlLength: finalHtml.length,
          cssLength: finalCss.length,
          hasHtml: !!finalHtml,
          htmlPreview: finalHtml.substring(0, 100) + "...",
        });

        // Clear any existing content in container to prevent shadow DOM conflicts
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }

        const editorInstance = window.UIEditor.initEditor(
          containerRef.current,
          {
            metadata: {
              emailId: emailIdToUse,
            },
            html: finalHtml,
            css: finalCss,
            locale: "en",
            onTokenRefreshRequest: (callback: (token: string) => void) => {
              Promise.resolve().then(async () => {
                try {
                  const token = await getStripoToken();
                  callback(token);
                } catch (error) {
                  console.error("Failed to refresh Stripo token:", error);
                }
              });
            },
            messageSettingsEnabled: false,
            conditionsEnabled: false,
            syncModulesEnabled: false,
            // Disable collaborative editing to prevent connection errors
            coeditingEnabled: false,
            notifications: {
              info: console.info,
              error: (message, id, params) => {
                // Suppress coediting connection errors (they're expected when coediting is disabled)
                if (
                  message &&
                  typeof message === "string" &&
                  message.includes("connection")
                ) {
                  return;
                }
                console.error(message, id, params);
              },
              warn: console.warn,
              success: console.log,
            },
            mergeTags: mergeTags,
            mobileViewButtonSelector: ".toggle-mobile-button",
            desktopViewButtonSelector: ".toggle-desktop-button",
          },
        );

        console.log("[StripoEditor] Stripo editor initialized successfully");

        // Store cleanup function if available
        if (editorInstance && typeof editorInstance.destroy === "function") {
          cleanupRef.current = () => {
            try {
              editorInstance.destroy();
            } catch (error) {
              console.error("[StripoEditor] Error destroying editor:", error);
            }
          };
        }

        // Hide loading overlay immediately after initialization
        // Stripo will render the editor content asynchronously, but we don't need to wait for it
        setLoadingState("loaded");

        // Poll for StripoEditorApi to be available (for API features) - this is optional
        // The editor UI should be visible even if API isn't ready yet
        let editorReadyCheckInterval: ReturnType<typeof setInterval> | null =
          null;
        editorReadyCheckInterval = setInterval(() => {
          const isReady = checkEditorReady();

          if (isReady) {
            console.log("[StripoEditor] Editor API is ready");
            if (editorReadyCheckInterval) {
              clearInterval(editorReadyCheckInterval);
              editorReadyCheckInterval = null;
            }
          }
        }, 500); // Check every 500ms

        // Cleanup interval after 30 seconds
        setTimeout(() => {
          if (editorReadyCheckInterval) {
            clearInterval(editorReadyCheckInterval);
            editorReadyCheckInterval = null;
          }
        }, 30000);
      } catch (error) {
        const errorMsg =
          error instanceof Error
            ? error.message
            : "Unknown error initializing Stripo editor";
        console.error(
          "[StripoEditor] Error initializing Stripo editor:",
          error,
        );
        setErrorMessage(errorMsg);
        setLoadingState("error");
      }
    };

    // Load Stripo script if not already loaded
    const loadStripoScript = () => {
      const existingScript = document.getElementById("UiEditorScript");
      if (existingScript && window.UIEditor) {
        // Script already loaded, just initialize
        console.log(
          "[StripoEditor] Stripo script already loaded, initializing...",
        );
        initStripoEditor();
        return;
      }

      if (existingScript) {
        // Script tag exists but UIEditor not ready yet, wait for it
        console.log(
          "[StripoEditor] Script tag exists, waiting for UIEditor...",
        );

        // Clear any existing interval
        if (uiEditorCheckIntervalRef.current) {
          clearInterval(uiEditorCheckIntervalRef.current);
        }

        uiEditorCheckIntervalRef.current = setInterval(() => {
          if (window.UIEditor) {
            if (uiEditorCheckIntervalRef.current) {
              clearInterval(uiEditorCheckIntervalRef.current);
              uiEditorCheckIntervalRef.current = null;
            }
            initStripoEditor();
          }
        }, 100);

        // Timeout after 10 seconds
        setTimeout(() => {
          if (uiEditorCheckIntervalRef.current) {
            clearInterval(uiEditorCheckIntervalRef.current);
            uiEditorCheckIntervalRef.current = null;
          }
          if (!window.UIEditor) {
            console.error(
              "[StripoEditor] UIEditor not available after waiting",
            );
            setErrorMessage("Stripo editor failed to load");
            setLoadingState("error");
          }
        }, 10000);
        return;
      }

      console.log("[StripoEditor] Loading Stripo UI Editor script...");
      const script = document.createElement("script");
      script.id = "UiEditorScript";
      script.type = "module";
      script.src =
        "https://plugins.stripo.email/resources/uieditor/rev/2.21.0/UIEditor.js";
      script.async = true;

      script.onload = () => {
        console.log("[StripoEditor] Stripo script loaded successfully");
        // Wait a bit for UIEditor to be available (Angular needs time to bootstrap)
        setTimeout(() => {
          if (window.UIEditor) {
            initStripoEditor();
          } else {
            console.error(
              "[StripoEditor] UIEditor not found after script load",
            );
            setErrorMessage("Stripo editor failed to load");
            setLoadingState("error");
          }
        }, 500);
      };

      script.onerror = () => {
        const errorMsg =
          "Failed to load Stripo UI Editor script. Please check your internet connection.";
        console.error("[StripoEditor] Failed to load Stripo script");
        setErrorMessage(errorMsg);
        setLoadingState("error");
        editorInitializedRef.current = false;
      };

      document.head.appendChild(script);
      scriptLoadedRef.current = true;
    };

    // Load zone.js first, then Stripo
    // Note: zone.js is recommended but Stripo may work without it
    loadZoneJs()
      .then(() => {
        console.log("[StripoEditor] zone.js ready, loading Stripo...");
        loadStripoScript();
      })
      .catch((error) => {
        console.warn("[StripoEditor] Failed to load zone.js:", error);
        console.warn(
          "[StripoEditor] Proceeding without zone.js - Stripo may handle it internally",
        );
        // Proceed anyway - Stripo might load zone.js itself or work without it
        // The warning from Stripo about zone.js is just a warning, not a fatal error
        loadStripoScript();
      });

    return () => {
      // Cleanup on unmount
      console.log("[StripoEditor] Cleaning up...");

      // Clear intervals
      if (zoneCheckIntervalRef.current) {
        clearInterval(zoneCheckIntervalRef.current);
        zoneCheckIntervalRef.current = null;
      }
      if (uiEditorCheckIntervalRef.current) {
        clearInterval(uiEditorCheckIntervalRef.current);
        uiEditorCheckIntervalRef.current = null;
      }

      // Run editor cleanup if available
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // Clear container to prevent shadow DOM conflicts
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      // Reset initialization flag
      editorInitializedRef.current = false;
      scriptLoadedRef.current = false;
    };
  }, []); // Empty deps - only run once on mount

  return (
    <div className="w-full h-[600px] relative" style={{ minHeight: "600px" }}>
      {/* Container is always rendered - Stripo needs it to initialize */}
      {/* Use key to ensure fresh container on remount */}
      <div
        key="stripo-editor-container"
        ref={containerRef}
        id="stripo-editor-container"
        className="w-full h-full"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "600px",
          display: "block",
          position: "relative",
          isolation: "isolate", // Create new stacking context to prevent shadow DOM conflicts
        }}
      />
      {loadingState === "loading" && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-50 z-10 pointer-events-none">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-sm text-gray-600">Loading Stripo Editor...</p>
          </div>
        </div>
      )}
      {loadingState === "error" && errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-75 z-10">
          <div className="flex flex-col items-center gap-2 max-w-md p-4">
            <div className="text-red-600 font-semibold">
              Error Loading Editor
            </div>
            <p className="text-sm text-red-700 text-center">{errorMessage}</p>
            <button
              type="button"
              onClick={() => {
                setLoadingState("idle");
                setErrorMessage(null);
                scriptLoadedRef.current = false;
                stripoOpenedOnceRef.current = false;
                window.location.reload();
              }}
              className="mt-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
            >
              Retry
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
