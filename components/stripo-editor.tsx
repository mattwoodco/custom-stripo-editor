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
    typeof window.StripoEditorApi.actionsApi.save === 'function' &&
    typeof window.StripoEditorApi.actionsApi.compileEmail === 'function' &&
    typeof window.StripoEditorApi.actionsApi.getTemplateData === 'function'
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
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const createdEmailIdRef = useRef<string | null>(null);
  const stripoOpenedOnceRef = useRef(false);

  useEffect(() => {
    if (scriptLoadedRef.current || stripoOpenedOnceRef.current) return;
    if (!containerRef.current) return; // Container not ready yet, will retry on next render

    console.log("[StripoEditor] Starting initialization...");
    setLoadingState("loading");
    setErrorMessage(null);

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
              console.log("[StripoEditor] Using DEFAULT_HTML for hello world template");
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
        console.log("[StripoEditor] Using DEFAULT_HTML for hello world template");
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
        window.UIEditor.initEditor(containerRef.current, {
          metadata: {
            emailId: emailIdToUse,
          },
          html: htmlToUse || providedHtml || DEFAULT_HTML,
          css: providedCss || '',
          locale: 'en',
          onTokenRefreshRequest: (callback: (token: string) => void) => {
            Promise.resolve().then(async () => {
              try {
                const token = await getStripoToken();
                callback(token);
              } catch (error) {
                console.error('Failed to refresh Stripo token:', error);
              }
            });
          },
          messageSettingsEnabled: false,
          conditionsEnabled: false,
          syncModulesEnabled: false,
          notifications: {
            info: console.info,
            error: (message, id, params) => {
              console.error(message, id, params);
            },
            warn: console.warn,
            success: console.log,
          },
          mergeTags: mergeTags,
          mobileViewButtonSelector: '.toggle-mobile-button',
          desktopViewButtonSelector: '.toggle-desktop-button',
        });

        console.log("[StripoEditor] Stripo editor initialized successfully");
        stripoOpenedOnceRef.current = true;

        // Check if editor content is actually rendering by looking for Stripo elements
        const checkEditorContent = () => {
          if (!containerRef.current) return false;
          
          // Check if Stripo has injected content into the container
          const hasStripoContent = containerRef.current.children.length > 0 ||
                                   containerRef.current.querySelector('iframe') !== null ||
                                   containerRef.current.querySelector('[id*="stripo"]') !== null ||
                                   containerRef.current.querySelector('[class*="stripo"]') !== null;
          
          return hasStripoContent;
        };

        // Hide loading overlay once editor content appears or after timeout
        let contentCheckInterval: ReturnType<typeof setInterval> | null = null;
        let fallbackTimeout: ReturnType<typeof setTimeout> | null = null;

        // Check for editor content every 200ms
        contentCheckInterval = setInterval(() => {
          if (checkEditorContent()) {
            console.log("[StripoEditor] Editor content detected, hiding loading overlay");
            if (contentCheckInterval) {
              clearInterval(contentCheckInterval);
              contentCheckInterval = null;
            }
            if (fallbackTimeout) {
              clearTimeout(fallbackTimeout);
              fallbackTimeout = null;
            }
            setLoadingState("loaded");
          }
        }, 200);

        // Fallback: hide loading after 3 seconds even if content check fails
        fallbackTimeout = setTimeout(() => {
          console.log("[StripoEditor] Fallback: hiding loading overlay after timeout");
          if (contentCheckInterval) {
            clearInterval(contentCheckInterval);
            contentCheckInterval = null;
          }
          setLoadingState("loaded");
        }, 3000);

        // Poll for StripoEditorApi to be available (for API features)
        let editorReadyCheckInterval: ReturnType<typeof setInterval> | null = null;
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

        // Cleanup intervals after 30 seconds
        setTimeout(() => {
          if (contentCheckInterval) {
            clearInterval(contentCheckInterval);
          }
          if (editorReadyCheckInterval) {
            clearInterval(editorReadyCheckInterval);
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
      if (document.getElementById('UiEditorScript')) {
        // Script already loaded, just initialize
        initStripoEditor();
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
        // Wait a bit for UIEditor to be fully available
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
      };

      document.head.appendChild(script);
      scriptLoadedRef.current = true;
    };

    loadStripoScript();

    return () => {
      // Cleanup: remove script if component unmounts
      const existingScript = document.querySelector("#UiEditorScript");
      if (existingScript?.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
        scriptLoadedRef.current = false;
      }
    };
  }, [providedEmailId, providedHtml, providedCss, shouldCreateTemplate, mergeTags]);

  return (
    <div className="w-full h-[600px] relative" style={{ minHeight: "600px" }}>
      {/* Container is always rendered - Stripo needs it to initialize */}
      <div
        ref={containerRef}
        id="stripo-editor-container"
        className="w-full h-full"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "600px",
          display: "block",
          position: "relative",
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
