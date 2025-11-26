"use client";

import { ExtensionBuilder } from "@stripoinc/ui-editor-extensions";
import { useEffect, useRef, useState } from "react";

interface StripoEditorCustomizedProps {
  emailId?: string;
  html?: string;
  css?: string;
  createHelloWorldTemplate?: boolean;
  mergeTags?: Array<{
    category: string;
    entries: Array<{
      label: string;
      value: string;
    }>;
  }>;
  onStorageCleared?: () => void; // Callback when storage is cleared
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

// Storage key for emailId
const STORAGE_KEY = "stripo-email-id";

// Clear Stripo storage (useful for testing)
export function clearStripoStorage(options?: {
  storageKey?: string;
  clearAll?: boolean;
}): void {
  if (typeof window === "undefined") {
    console.warn(
      "[StripoEditorCustomized] clearStripoStorage: window undefined (SSR)",
    );
    return;
  }

  const { storageKey = STORAGE_KEY, clearAll = false } = options || {};

  console.log("[StripoEditorCustomized] Clearing Stripo storage:", {
    storageKey,
    clearAll,
  });

  if (clearAll) {
    // Clear all Stripo-related keys
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.toLowerCase().includes("stripo")) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((key) => {
      localStorage.removeItem(key);
      console.log(`[StripoEditorCustomized] Removed localStorage key: ${key}`);
    });
    console.log(
      `[StripoEditorCustomized] ✓ Cleared ${keysToRemove.length} Stripo-related keys`,
    );
  } else {
    // Clear specific key
    const hadValue = localStorage.getItem(storageKey) !== null;
    localStorage.removeItem(storageKey);
    console.log(
      `[StripoEditorCustomized] ${hadValue ? "✓" : "⚠"} Cleared storage key: ${storageKey}${hadValue ? "" : " (key didn't exist)"}`,
    );
  }
}

// Validate emailId exists using StripoEditorApi (must be called after editor loads)
function validateEmailIdWithEditorApi(emailId: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (!window.StripoEditorApi?.actionsApi?.getTemplateData) {
      console.warn(
        "[StripoEditorCustomized] StripoEditorApi not available for validation",
      );
      resolve(false);
      return;
    }

    console.log(
      "[StripoEditorCustomized] Validating emailId with editor API:",
      emailId,
    );

    try {
      window.StripoEditorApi.actionsApi.getTemplateData((data) => {
        const exists = !!(data.html || data.css);
        console.log("[StripoEditorCustomized] Template validation result:", {
          emailId,
          exists,
          hasHtml: !!data.html,
          hasCss: !!data.css,
        });
        resolve(exists);
      });
    } catch (error) {
      console.error(
        "[StripoEditorCustomized] Error validating with editor API:",
        error,
      );
      resolve(false);
    }
  });
}

// Get or create email template ID from localStorage
function getOrCreateEmailId(): string | null {
  if (typeof window === "undefined") {
    console.log(
      "[StripoEditorCustomized] getOrCreateEmailId: window undefined (SSR)",
    );
    return null;
  }

  const storedEmailId = localStorage.getItem(STORAGE_KEY);

  console.log(
    "[StripoEditorCustomized] getOrCreateEmailId: Checking localStorage",
    {
      storageKey: STORAGE_KEY,
      hasStoredId: !!storedEmailId,
      storedIdValue: storedEmailId,
      localStorageAvailable: typeof localStorage !== "undefined",
    },
  );

  if (storedEmailId) {
    console.log(
      "[StripoEditorCustomized] ✓ Found existing emailId in localStorage:",
      storedEmailId,
      "- Will attempt to reuse (may fail if template doesn't exist in Stripo)",
    );
    return storedEmailId;
  }

  // Generate a new emailId and store it
  const newEmailId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(STORAGE_KEY, newEmailId);
  console.log(
    "[StripoEditorCustomized] ✗ No existing emailId found, generated new:",
    newEmailId,
    "- Template will be created by Stripo SDK on first load",
  );
  return newEmailId;
}

// Create a hello world email template via Next.js API route (server-side)
// NOTE: This function is kept for backwards compatibility but we prefer using getOrCreateEmailId()
async function createHelloWorldTemplate(): Promise<string | null> {
  // First check localStorage for existing emailId
  const existingEmailId = getOrCreateEmailId();
  if (existingEmailId) {
    console.log(
      "[StripoEditorCustomized] Reusing existing template from localStorage:",
      existingEmailId,
    );
    return existingEmailId;
  }

  // If no existing emailId, generate one (but don't call API to avoid rate limits)
  const emailId = getOrCreateEmailId();
  console.log(
    "[StripoEditorCustomized] Using emailId (will be created by Stripo SDK on first load):",
    emailId,
  );
  return emailId;
}

// Create and register Stripo extension with toolbar positioning
function createStripoExtension() {
  const extension = new ExtensionBuilder()
    .addStyles(`
      /* Styles applied via direct DOM manipulation */
    `)
    .build();

  return extension;
}

export function StripoEditorCustomized({
  emailId: providedEmailId,
  html: providedHtml,
  css: providedCss,
  createHelloWorldTemplate: shouldCreateTemplate = false,
  mergeTags = [],
  onStorageCleared,
}: StripoEditorCustomizedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scriptLoadedRef = useRef(false);
  const editorInitializedRef = useRef(false);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [isModulesPanelVisible, setIsModulesPanelVisible] = useState(true);
  const [isSimplePanelVisible, setIsSimplePanelVisible] = useState(true);
  const [isWidePanelVisible, setIsWidePanelVisible] = useState(true);
  const cleanupRef = useRef<(() => void) | null>(null);
  const uiEditorCheckIntervalRef = useRef<ReturnType<
    typeof setInterval
  > | null>(null);
  const tokenRef = useRef<string | null>(null); // Cache token for synchronous access
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const previousMobileRef = useRef<boolean>(false);

  useEffect(() => {
    // Add global error handler for Stripo API errors with graceful degradation
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      const error = event.reason;
      const errorMessage = error?.message || error?.toString() || "";
      const errorUrl = error?.url || "";
      const errorStatus = error?.status || error?.statusCode;

      // Handle 403 errors from Stripo plugin config endpoint gracefully
      // According to Stripo docs, plugin config endpoint may be optional
      if (
        errorMessage.includes("403") ||
        errorMessage.includes("forbidden") ||
        errorUrl?.includes("plugins/config") ||
        errorUrl?.includes("/api/v1/plugins/config") ||
        errorStatus === 403
      ) {
        console.warn(
          "[StripoEditorCustomized] ===== PLUGIN CONFIG 403 ERROR CAUGHT =====",
          {
            errorUrl,
            errorMessage,
            status: errorStatus,
            errorType: error?.constructor?.name,
            errorKeys: error ? Object.keys(error) : [],
            note: "Plugin config endpoint may be optional per Stripo docs. Preventing error from blocking editor.",
            timestamp: new Date().toISOString(),
          },
        );
        event.preventDefault(); // Prevent unhandled rejection error
        event.stopPropagation(); // Stop error propagation
        return false; // Indicate error was handled
      }
    };

    const handleError = (event: ErrorEvent) => {
      const errorMessage = event.message || "";
      const errorSource = event.filename || "";

      // Handle 403 errors from Stripo plugin config endpoint gracefully
      if (
        (errorMessage.includes("403") || errorMessage.includes("forbidden")) &&
        errorSource.includes("plugins.stripo.email")
      ) {
        console.warn(
          "[StripoEditorCustomized] Stripo API error (403) - continuing with graceful degradation:",
          {
            errorSource,
            errorMessage,
            note: "Plugin config endpoint may be optional per Stripo docs. Editor should continue to function.",
          },
        );
        event.preventDefault(); // Prevent error from showing in console
        return;
      }
    };

    window.addEventListener("unhandledrejection", handleUnhandledRejection);
    window.addEventListener("error", handleError);

    // Prevent double initialization (React StrictMode in dev)
    if (editorInitializedRef.current) {
      console.log("[StripoEditorCustomized] Already initialized, skipping...");
      return;
    }

    if (!containerRef.current) {
      console.log(
        "[StripoEditorCustomized] Container not ready, will retry...",
      );
      return;
    }

    console.log("[StripoEditorCustomized] Starting initialization...");
    setLoadingState("loading");
    setErrorMessage(null);
    editorInitializedRef.current = true;

    // Load zone.js first if not already loaded
    const loadZoneJs = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if zone.js is already loaded
        if (typeof window !== "undefined" && (window as any).Zone) {
          console.log("[StripoEditorCustomized] zone.js already loaded");
          resolve();
          return;
        }

        // Check if script tag already exists
        const existingZoneScript = document.querySelector(
          'script[src*="zone.js"], script#zone-js-script',
        );
        if (existingZoneScript) {
          console.log(
            "[StripoEditorCustomized] zone.js script tag exists, waiting for load...",
          );
          let attempts = 0;
          const maxAttempts = 100;
          const checkInterval = setInterval(() => {
            attempts++;
            if ((window as any).Zone) {
              clearInterval(checkInterval);
              console.log("[StripoEditorCustomized] zone.js loaded");
              resolve();
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              resolve();
            }
          }, 100);
          return;
        }

        // Load zone.js
        console.log("[StripoEditorCustomized] Loading zone.js...");

        if (!document.head) {
          console.error("[StripoEditorCustomized] document.head not available");
          reject(new Error("document.head not available"));
          return;
        }

        const script = document.createElement("script");
        script.src =
          "https://cdnjs.cloudflare.com/ajax/libs/zone.js/0.14.3/zone.min.js";
        script.async = false;

        script.onload = () => {
          console.log("[StripoEditorCustomized] zone.js script loaded");
          setTimeout(() => {
            if ((window as any).Zone) {
              resolve();
            } else {
              let retries = 0;
              const retryInterval = setInterval(() => {
                retries++;
                if ((window as any).Zone) {
                  clearInterval(retryInterval);
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
          console.error(
            "[StripoEditorCustomized] Failed to load zone.js:",
            error,
          );
          const fallbackScript = document.createElement("script");
          fallbackScript.src =
            "https://cdn.jsdelivr.net/npm/zone.js@0.14.3/dist/zone.min.js";
          fallbackScript.async = false;

          fallbackScript.onload = () => {
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
            reject(new Error("Failed to load zone.js from both CDNs"));
          };

          document.head.appendChild(fallbackScript);
        };

        document.head.appendChild(script);
      });
    };

    const initStripoEditor = async () => {
      console.log("[StripoEditorCustomized] ===== INIT EDITOR START =====", {
        timestamp: new Date().toISOString(),
        containerReady: !!containerRef.current,
        uiEditorReady: typeof window.UIEditor !== "undefined",
        currentLoadingState: loadingState,
      });

      if (!containerRef.current) {
        console.error(
          "[StripoEditorCustomized] Cannot initialize: container ref is not available",
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

      console.log(
        "[StripoEditorCustomized] initStripoEditor: Starting emailId resolution",
        {
          providedEmailId: providedEmailId || "none",
          shouldCreateTemplate,
          hasProvidedHtml: !!providedHtml,
        },
      );

      // Get or create emailId from localStorage (reuse existing template)
      if (!emailIdToUse) {
        if (shouldCreateTemplate) {
          console.log(
            "[StripoEditorCustomized] Getting or creating template (shouldCreateTemplate=true)...",
          );
          try {
            const emailId = await createHelloWorldTemplate();
            console.log(
              "[StripoEditorCustomized] createHelloWorldTemplate result:",
              {
                emailId: emailId || "null",
                emailIdType: typeof emailId,
              },
            );
            if (emailId) {
              emailIdToUse = emailId;
              if (!htmlToUse) {
                htmlToUse = DEFAULT_HTML;
                console.log(
                  "[StripoEditorCustomized] Using DEFAULT_HTML for template",
                );
              }
            }
          } catch (error) {
            console.error(
              "[StripoEditorCustomized] Error getting template:",
              error,
            );
          }
        } else {
          // Even if not creating, try to reuse existing emailId
          console.log(
            "[StripoEditorCustomized] Not creating template, checking for existing emailId...",
          );
          const existingEmailId = getOrCreateEmailId();
          if (existingEmailId) {
            emailIdToUse = existingEmailId;
            console.log(
              "[StripoEditorCustomized] Reusing existing emailId from localStorage:",
              emailIdToUse,
              "- WARNING: This emailId may not exist in Stripo, editor may fail to load",
            );
          }
        }
      }

      // Generate emailId if still not provided (fallback)
      if (!emailIdToUse) {
        emailIdToUse =
          getOrCreateEmailId() ||
          `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(
          "[StripoEditorCustomized] Generated fallback emailId:",
          emailIdToUse,
        );
      }

      console.log("[StripoEditorCustomized] Final emailId decision:", {
        emailIdToUse,
        source: providedEmailId
          ? "provided"
          : shouldCreateTemplate
            ? "createTemplate"
            : "localStorage/fallback",
        hasHtml: !!htmlToUse,
        htmlLength: htmlToUse?.length || 0,
      });

      // Ensure HTML is set
      if (!htmlToUse && shouldCreateTemplate) {
        htmlToUse = DEFAULT_HTML;
        console.log(
          "[StripoEditorCustomized] Using DEFAULT_HTML for hello world template",
        );
      }

      // Check if UIEditor is available
      if (!window.UIEditor) {
        console.error(
          "[StripoEditorCustomized] Cannot initialize: window.UIEditor is not available",
        );
        setErrorMessage("Stripo editor script not loaded");
        setLoadingState("error");
        return;
      }

      // Extension should already be registered before editor initialization
      // Styles are injected via registerExtension() function called in loadStripoScript()
      console.log(
        "[StripoEditorCustomized] Initializing editor with extension support",
      );

      // Initialize Stripo editor with correct config
      try {
        const finalHtml = htmlToUse || providedHtml || DEFAULT_HTML;
        const finalCss = providedCss || "";

        console.log(
          "[StripoEditorCustomized] ===== INITIALIZING STRIPO EDITOR =====",
        );
        console.log("[StripoEditorCustomized] Editor config:", {
          emailId: emailIdToUse,
          emailIdLength: emailIdToUse.length,
          htmlLength: finalHtml.length,
          cssLength: finalCss.length,
          hasHtml: !!finalHtml,
          htmlPreview:
            finalHtml.substring(0, 100) + (finalHtml.length > 100 ? "..." : ""),
          containerReady: !!containerRef.current,
          containerDimensions: containerRef.current
            ? {
                width: containerRef.current.getBoundingClientRect().width,
                height: containerRef.current.getBoundingClientRect().height,
              }
            : null,
        });
        console.log("[StripoEditorCustomized] Window globals check:", {
          hasUIEditor: typeof window.UIEditor !== "undefined",
          hasStripoEditorApi: typeof window.StripoEditorApi !== "undefined",
          hasZone: typeof (window as any).Zone !== "undefined",
        });

        // Clear any existing content in container
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }

        // Pre-fetch token BEFORE calling initEditor (per Stripo docs)
        // This ensures token is available when SDK calls plugin config endpoint
        const tokenFetchStartTime = Date.now();
        console.log(
          "[StripoEditorCustomized] ===== TOKEN PRE-FETCH START =====",
          {
            timestamp: new Date().toISOString(),
            hasCachedToken: !!tokenRef.current,
          },
        );

        let preFetchedToken: string | null = null;
        try {
          preFetchedToken = await getStripoToken();
          const tokenFetchDuration = Date.now() - tokenFetchStartTime;
          tokenRef.current = preFetchedToken; // Cache token for synchronous access
          console.log(
            "[StripoEditorCustomized] ===== TOKEN PRE-FETCH SUCCESS =====",
            {
              duration: `${tokenFetchDuration}ms`,
              tokenLength: preFetchedToken.length,
              tokenPreview: preFetchedToken.substring(0, 20) + "...",
              timestamp: new Date().toISOString(),
            },
          );
        } catch (error) {
          const tokenFetchDuration = Date.now() - tokenFetchStartTime;
          console.error(
            "[StripoEditorCustomized] ===== TOKEN PRE-FETCH FAILED =====",
            {
              duration: `${tokenFetchDuration}ms`,
              error,
              errorMessage:
                error instanceof Error ? error.message : String(error),
              errorStack: error instanceof Error ? error.stack : undefined,
              timestamp: new Date().toISOString(),
              note: "Continuing anyway - token will be fetched on demand",
            },
          );
          // Continue anyway - token will be fetched on demand
        }

        console.log(
          "[StripoEditorCustomized] ===== CALLING INIT EDITOR =====",
          {
            timestamp: new Date().toISOString(),
            hasToken: !!tokenRef.current,
            emailId: emailIdToUse,
            htmlLength: finalHtml.length,
            cssLength: finalCss.length,
          },
        );
        const startTime = Date.now();

        let initEditorCalled = false;
        try {
          window.UIEditor.initEditor(containerRef.current, {
            metadata: {
              emailId: emailIdToUse,
            },
            html: finalHtml,
            css: finalCss,
            locale: "en",
            onTokenRefreshRequest: (callback: (token: string) => void) => {
              console.log(
                "[StripoEditorCustomized] Token refresh requested by Stripo SDK",
              );

              // Return cached token immediately if available (synchronous)
              // This ensures SDK gets token right away when calling plugin config endpoint
              if (tokenRef.current) {
                console.log(
                  "[StripoEditorCustomized] Returning cached token synchronously:",
                  {
                    tokenLength: tokenRef.current.length,
                    tokenPreview: tokenRef.current.substring(0, 20) + "...",
                  },
                );
                callback(tokenRef.current);

                // Refresh token in background for next time
                Promise.resolve().then(async () => {
                  try {
                    console.log(
                      "[StripoEditorCustomized] Refreshing token in background...",
                    );
                    const newToken = await getStripoToken();
                    tokenRef.current = newToken;
                    console.log(
                      "[StripoEditorCustomized] ✓ Token refreshed in background:",
                      {
                        tokenLength: newToken.length,
                        tokenPreview: newToken.substring(0, 20) + "...",
                      },
                    );
                  } catch (error) {
                    console.error(
                      "[StripoEditorCustomized] ✗ Failed to refresh token in background:",
                      error,
                    );
                  }
                });
              } else {
                // Fallback: fetch token if not cached
                Promise.resolve().then(async () => {
                  try {
                    console.log(
                      "[StripoEditorCustomized] Fetching token from /api/stripo/token...",
                    );
                    const token = await getStripoToken();
                    tokenRef.current = token; // Cache for next time
                    console.log("[StripoEditorCustomized] ✓ Token received:", {
                      tokenLength: token.length,
                      tokenPreview: token.substring(0, 20) + "...",
                    });
                    callback(token);
                  } catch (error) {
                    console.error(
                      "[StripoEditorCustomized] ✗ Failed to refresh Stripo token:",
                      error,
                    );
                    // Don't call callback on error - let Stripo handle it
                  }
                });
              }
            },
            messageSettingsEnabled: false,
            conditionsEnabled: false,
            syncModulesEnabled: false,
            notifications: {
              info: console.info,
              error: (message, id, params) => {
                // Handle expected/non-actionable errors with graceful degradation
                const messageStr = message?.toString() || "";
                const paramsStr = JSON.stringify(params || {});
                const combinedMessage =
                  `${messageStr} ${paramsStr}`.toLowerCase();

                // Handle plugin config 403 errors gracefully (may be optional per Stripo docs)
                if (
                  messageStr.includes("403") ||
                  combinedMessage.includes("plugins/config") ||
                  combinedMessage.includes("forbidden")
                ) {
                  console.warn(
                    "[StripoEditorCustomized] Plugin config error (403) - continuing with graceful degradation:",
                    {
                      message: messageStr,
                      id,
                      params,
                      note: "Plugin config endpoint may be optional per Stripo docs.",
                    },
                  );
                  return; // Don't show error to user
                }

                // Suppress other expected errors
                if (
                  messageStr.includes("connection") ||
                  messageStr.includes("limit") ||
                  messageStr.includes("exceeded")
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
          });
          initEditorCalled = true;
          console.log(
            "[StripoEditorCustomized] ===== INIT EDITOR CALLED (no error thrown) =====",
            {
              timestamp: new Date().toISOString(),
            },
          );
        } catch (initError) {
          console.error(
            "[StripoEditorCustomized] ===== INIT EDITOR THREW ERROR =====",
            {
              error: initError,
              errorMessage:
                initError instanceof Error
                  ? initError.message
                  : String(initError),
              errorStack:
                initError instanceof Error ? initError.stack : undefined,
              timestamp: new Date().toISOString(),
            },
          );
          throw initError; // Re-throw to be caught by outer try-catch
        }

        const initDuration = Date.now() - startTime;
        console.log(
          "[StripoEditorCustomized] ===== INIT EDITOR COMPLETED =====",
          {
            duration: `${initDuration}ms`,
            initEditorCalled,
            timestamp: new Date().toISOString(),
          },
        );

        // Note: initEditor returns void, so we can't store a cleanup function
        // The editor will be cleaned up when the container is cleared on unmount

        console.log(
          "[StripoEditorCustomized] ===== SETTING LOADING STATE TO 'loaded' =====",
          {
            timestamp: new Date().toISOString(),
            currentState: loadingState,
          },
        );
        // Don't set loading state to 'loaded' immediately - wait for editor to actually render
        // The 403 error might prevent rendering even though initEditor() returned successfully
        console.log(
          "[StripoEditorCustomized] Waiting for editor to render before hiding loading spinner...",
        );

        // Check if editor actually rendered - poll until it appears or timeout
        let renderCheckCount = 0;
        const maxRenderChecks = 40; // 20 seconds max (40 * 500ms)
        const renderCheckInterval = setInterval(() => {
          renderCheckCount++;
          const container = containerRef.current;
          if (container) {
            const uiEditor = container.querySelector("ui-editor");
            const hasShadowRoot = !!uiEditor?.shadowRoot;
            const hasContent = container.children.length > 0 || hasShadowRoot;

            console.log(
              `[StripoEditorCustomized] Editor render check #${renderCheckCount}:`,
              {
                hasContainer: !!container,
                hasUIEditor: !!uiEditor,
                hasShadowRoot,
                containerChildren: container.children.length,
                hasContent,
              },
            );

            if (hasContent && hasShadowRoot) {
              console.log(
                "[StripoEditorCustomized] ===== EDITOR RENDERED SUCCESSFULLY =====",
                {
                  timestamp: new Date().toISOString(),
                  checks: renderCheckCount,
                },
              );

              // Apply positioning to blocks panel parent container
              const applyPositioning = (width?: number) => {
                try {
                  // Get container width if not provided
                  const containerWidth =
                    width ??
                    containerRef.current?.getBoundingClientRect().width ??
                    0;

                  const uiEditor = container.querySelector("ui-editor");
                  if (uiEditor?.shadowRoot) {
                    // Remove min-width from ui-editor on mobile and tablet
                    if (containerWidth <= 1200) {
                      // Mobile/Tablet: remove min-width
                      (uiEditor as HTMLElement).style.setProperty(
                        "min-width",
                        "0",
                        "important",
                      );
                      console.log(
                        "[StripoEditorCustomized] Removed min-width from ui-editor (mobile/tablet: width <= 1200px)",
                        {
                          containerWidth,
                          minWidth: "0",
                        },
                      );
                    } else {
                      // Desktop: restore default min-width (remove override)
                      (uiEditor as HTMLElement).style.removeProperty("min-width");
                      console.log(
                        "[StripoEditorCustomized] Restored default min-width for ui-editor (desktop: width > 1200px)",
                        {
                          containerWidth,
                        },
                      );
                    }

                    // Helper function to apply responsive styling to an element
                    const applyResponsiveStyling = (
                      element: HTMLElement,
                      elementName: string,
                    ) => {
                      // Base transform: move right 10px
                      // On mobile (width <= 1200px): also move down 20px
                      // On desktop (width > 1200px): leave as is (just translateX)
                      const transformValue =
                        containerWidth <= 1200
                          ? "translateX(10px) translateY(20px)"
                          : "translateX(10px)";

                      element.style.setProperty(
                        "transform",
                        transformValue,
                        "important",
                      );

                      // Width only changes on mobile (width <= 1200px)
                      // On desktop (width > 1200px): leave width as-is (remove override)
                      // For ue-ui-simple-panel, use wider width on mobile to accommodate inline block thumbs
                      const widthValue =
                        containerWidth <= 1200
                          ? elementName === "ue-ui-simple-panel"
                            ? "400px"
                            : "100px"
                          : null;
                      if (containerWidth <= 1200) {
                        element.style.setProperty("width", widthValue!, "important");
                      } else {
                        element.style.removeProperty("width");
                      }

                      console.log(
                        containerWidth <= 1200
                          ? `[StripoEditorCustomized] Applied transform (10px right, 20px down) and width (${widthValue}) to ${elementName} (mobile: width <= 1200px)`
                          : `[StripoEditorCustomized] Applied transform (10px right) to ${elementName}, width left as-is (desktop: width > 1200px)`,
                        {
                          tagName: element.tagName,
                          className: element.className,
                          containerWidth,
                          transformValue,
                          computedTransform:
                            window.getComputedStyle(element).transform,
                          computedWidth: window.getComputedStyle(element).width,
                          movedDown: containerWidth <= 1200,
                          widthApplied: containerWidth <= 1200,
                          widthValue: widthValue || "default",
                        },
                      );
                    };

                    // Find ue-blocks-panel-component and walk up to find ue-ui-simple-panel
                    const blocksPanel = uiEditor.shadowRoot.querySelector(
                      "ue-blocks-panel-component",
                    );
                    if (blocksPanel) {
                      console.log(
                        "[StripoEditorCustomized] Found ue-blocks-panel-component",
                      );

                      // Walk up the DOM tree to find ue-ui-simple-panel
                      let current: Element | null = blocksPanel.parentElement;
                      let depth = 0;
                      const maxDepth = 10;
                      let simplePanel: HTMLElement | null = null;

                      while (current && depth < maxDepth) {
                        const tagName = current.tagName.toLowerCase();
                        const className = current.className || "";

                        console.log(
                          `[StripoEditorCustomized] Walking up DOM tree (depth ${depth}):`,
                          {
                            tagName,
                            className:
                              typeof className === "string"
                                ? className
                                : Array.from(className).join(" "),
                          },
                        );

                        // Look for ue-ui-simple-panel
                        if (tagName === "ue-ui-simple-panel") {
                          simplePanel = current as HTMLElement;
                          console.log(
                            `[StripoEditorCustomized] Found ue-ui-simple-panel at depth ${depth}`,
                          );
                          break; // Found the target, stop walking
                        }

                        current = current.parentElement;
                        depth++;
                      }

                      // Apply transform and width to ue-ui-simple-panel (always applied)
                      if (simplePanel) {
                        applyResponsiveStyling(
                          simplePanel,
                          "ue-ui-simple-panel",
                        );
                        // Initialize visibility based on container width
                        if (containerWidth <= 1200) {
                          // Mobile: hide panel
                          simplePanel.style.setProperty("display", "none", "important");
                          setIsSimplePanelVisible(false);
                          console.log(
                            "[StripoEditorCustomized] Simple panel initialized to hidden (mobile)",
                          );
                        } else {
                          // Desktop: show panel (remove any display property)
                          simplePanel.style.removeProperty("display");
                          setIsSimplePanelVisible(true);
                          console.log(
                            "[StripoEditorCustomized] Simple panel initialized to visible (desktop)",
                          );
                        }
                      } else {
                        console.warn(
                          "[StripoEditorCustomized] ue-ui-simple-panel not found, applying to immediate parent",
                        );
                        // Fallback: apply to immediate parent
                        if (blocksPanel.parentElement) {
                          const parentElement =
                            blocksPanel.parentElement as HTMLElement;
                          // Base transform: move right 10px
                          // On mobile (width <= 1200px): also move down 20px
                          // On desktop (width > 1200px): leave as is (just translateX)
                          const transformValue =
                            containerWidth <= 1200
                              ? "translateX(10px) translateY(20px)"
                              : "translateX(10px)";
                          parentElement.style.setProperty(
                            "transform",
                            transformValue,
                            "important",
                          );
                        }
                      }
                    } else {
                      console.warn(
                        "[StripoEditorCustomized] ue-blocks-panel-component not found",
                      );
                    }

                    // Apply same responsive effect to ue-modules-panel-component (independent of blocks panel)
                    const modulesPanel = uiEditor.shadowRoot.querySelector(
                      "ue-modules-panel-component",
                    ) as HTMLElement | null;
                    if (modulesPanel) {
                      applyResponsiveStyling(
                        modulesPanel,
                        "ue-modules-panel-component",
                      );
                      // Initialize visibility based on container width
                      if (containerWidth <= 1200) {
                        // Mobile: hide panel
                        modulesPanel.style.setProperty("display", "none", "important");
                        setIsModulesPanelVisible(false);
                        console.log(
                          "[StripoEditorCustomized] Modules panel initialized to hidden (mobile)",
                        );
                      } else {
                        // Desktop: show panel (remove any display property)
                        modulesPanel.style.removeProperty("display");
                        setIsModulesPanelVisible(true);
                        console.log(
                          "[StripoEditorCustomized] Modules panel initialized to visible (desktop)",
                        );
                      }
                    } else {
                      console.warn(
                        "[StripoEditorCustomized] ue-modules-panel-component not found",
                      );
                    }

                    // Find and initialize ue-wide-panel visibility based on container width
                    const widePanel = uiEditor.shadowRoot.querySelector(
                      "ue-wide-panel",
                    ) as HTMLElement | null;
                    if (widePanel) {
                      // Initialize visibility based on container width
                      if (containerWidth <= 1200) {
                        // Mobile: hide panel
                        widePanel.style.setProperty("display", "none", "important");
                        setIsWidePanelVisible(false);
                        console.log(
                          "[StripoEditorCustomized] Wide panel initialized to hidden (mobile)",
                        );
                      } else {
                        // Desktop: show panel (remove any display property)
                        widePanel.style.removeProperty("display");
                        setIsWidePanelVisible(true);
                        console.log(
                          "[StripoEditorCustomized] Wide panel initialized to visible (desktop)",
                        );
                      }
                    } else {
                      console.warn(
                        "[StripoEditorCustomized] ue-wide-panel not found",
                      );
                    }

                    // Make block thumbs inline on mobile (ue-block-thumb-component inside ue-narrow-panel)
                    const narrowPanel = uiEditor.shadowRoot.querySelector(
                      "ue-narrow-panel",
                    ) as HTMLElement | null;
                    if (narrowPanel) {
                      const blockThumbs = narrowPanel.querySelectorAll(
                        "ue-block-thumb-component",
                      );
                      console.log(
                        "[StripoEditorCustomized] Found ue-narrow-panel with",
                        blockThumbs.length,
                        "ue-block-thumb-component elements",
                      );

                      if (blockThumbs.length > 0) {
                        // On mobile (width <= 1200px): apply flexbox to make thumbs display inline
                        // On desktop (width > 1200px): remove flex styles to restore default vertical layout
                        if (containerWidth <= 1200) {
                          narrowPanel.style.setProperty(
                            "display",
                            "flex",
                            "important",
                          );
                          narrowPanel.style.setProperty(
                            "flex-direction",
                            "row",
                            "important",
                          );
                          narrowPanel.style.setProperty(
                            "flex-wrap",
                            "wrap",
                            "important",
                          );
                          console.log(
                            "[StripoEditorCustomized] Applied inline flexbox styles to ue-narrow-panel (mobile: width <= 1200px)",
                            {
                              containerWidth,
                              thumbCount: blockThumbs.length,
                              display: "flex",
                              flexDirection: "row",
                              flexWrap: "wrap",
                            },
                          );
                        } else {
                          // Remove flex styles on desktop to restore default vertical layout
                          narrowPanel.style.removeProperty("display");
                          narrowPanel.style.removeProperty("flex-direction");
                          narrowPanel.style.removeProperty("flex-wrap");
                          console.log(
                            "[StripoEditorCustomized] Removed flexbox styles from ue-narrow-panel (desktop: width > 1200px)",
                            {
                              containerWidth,
                              thumbCount: blockThumbs.length,
                            },
                          );
                        }
                      } else {
                        console.warn(
                          "[StripoEditorCustomized] ue-narrow-panel found but no ue-block-thumb-component elements inside",
                        );
                      }
                    } else {
                      console.warn(
                        "[StripoEditorCustomized] ue-narrow-panel not found",
                      );
                    }

                    // Fix block-panel-content service-element: set to display flex on mobile to prevent grid from stacking thumbs vertically
                    const blockPanelContent = uiEditor.shadowRoot.querySelector(
                      ".block-panel-content.service-element",
                    ) as HTMLElement | null;
                    if (blockPanelContent) {
                      if (containerWidth <= 1200) {
                        blockPanelContent.style.setProperty(
                          "display",
                          "flex",
                          "important",
                        );
                        blockPanelContent.style.setProperty(
                          "flex-direction",
                          "row",
                          "important",
                        );
                        blockPanelContent.style.setProperty(
                          "flex-wrap",
                          "wrap",
                          "important",
                        );
                        console.log(
                          "[StripoEditorCustomized] Applied flexbox styles to block-panel-content.service-element (mobile: width <= 1200px)",
                          {
                            containerWidth,
                            display: "flex",
                            flexDirection: "row",
                            flexWrap: "wrap",
                          },
                        );
                      } else {
                        // Remove flex styles on desktop to restore default grid layout
                        blockPanelContent.style.removeProperty("display");
                        blockPanelContent.style.removeProperty("flex-direction");
                        blockPanelContent.style.removeProperty("flex-wrap");
                        console.log(
                          "[StripoEditorCustomized] Removed flexbox styles from block-panel-content.service-element (desktop: width > 1200px)",
                          {
                            containerWidth,
                          },
                        );
                      }
                    } else {
                      // Try alternative selector without the dot notation
                      const blockPanelContentAlt =
                        uiEditor.shadowRoot.querySelector(
                          '[class*="block-panel-content"][class*="service-element"]',
                        ) as HTMLElement | null;
                      if (blockPanelContentAlt) {
                        if (containerWidth <= 1200) {
                          blockPanelContentAlt.style.setProperty(
                            "display",
                            "flex",
                            "important",
                          );
                          blockPanelContentAlt.style.setProperty(
                            "flex-direction",
                            "row",
                            "important",
                          );
                          blockPanelContentAlt.style.setProperty(
                            "flex-wrap",
                            "wrap",
                            "important",
                          );
                          console.log(
                            "[StripoEditorCustomized] Applied flexbox styles to block-panel-content.service-element (alternative selector, mobile: width <= 1200px)",
                            {
                              containerWidth,
                              display: "flex",
                              flexDirection: "row",
                              flexWrap: "wrap",
                            },
                          );
                        } else {
                          blockPanelContentAlt.style.removeProperty("display");
                          blockPanelContentAlt.style.removeProperty(
                            "flex-direction",
                          );
                          blockPanelContentAlt.style.removeProperty("flex-wrap");
                          console.log(
                            "[StripoEditorCustomized] Removed flexbox styles from block-panel-content.service-element (alternative selector, desktop: width > 1200px)",
                            {
                              containerWidth,
                            },
                          );
                        }
                      } else {
                        console.warn(
                          "[StripoEditorCustomized] block-panel-content.service-element not found",
                        );
                      }
                    }
                  }
                } catch (error) {
                  console.warn(
                    "[StripoEditorCustomized] Failed to apply positioning:",
                    error,
                  );
                }
              };

              // Apply immediately with current width
              const initialWidth =
                containerRef.current?.getBoundingClientRect().width ?? 0;
              const initialMobile = initialWidth <= 1200;
              previousMobileRef.current = initialMobile;
              setIsMobile(initialMobile);
              applyPositioning(initialWidth);

              // Set up ResizeObserver to track container width changes
              if (
                containerRef.current &&
                typeof ResizeObserver !== "undefined"
              ) {
                // Clean up existing observer if any
                if (resizeObserverRef.current) {
                  resizeObserverRef.current.disconnect();
                }

                resizeObserverRef.current = new ResizeObserver((entries) => {
                  const width = entries[0]?.contentRect.width ?? 0;
                  console.log(
                    "[StripoEditorCustomized] Container width changed:",
                    width,
                  );
                  const wasMobile = previousMobileRef.current;
                  const mobile = width <= 1200;
                  previousMobileRef.current = mobile;
                  setIsMobile(mobile);

                  // When switching from mobile to desktop, restore all panels
                  if (wasMobile && !mobile) {
                    const container = containerRef.current;
                    if (container) {
                      const uiEditor = container.querySelector("ui-editor");
                      if (uiEditor?.shadowRoot) {
                        // Restore modules panel
                        const modulesPanel = uiEditor.shadowRoot.querySelector(
                          "ue-modules-panel-component",
                        ) as HTMLElement | null;
                        if (modulesPanel) {
                          modulesPanel.style.removeProperty("display");
                          setIsModulesPanelVisible(true);
                          console.log(
                            "[StripoEditorCustomized] Restored modules panel when switching to desktop",
                          );
                        }

                        // Restore simple panel
                        const simplePanel = uiEditor.shadowRoot.querySelector(
                          "ue-ui-simple-panel",
                        ) as HTMLElement | null;
                        if (simplePanel) {
                          simplePanel.style.removeProperty("display");
                          setIsSimplePanelVisible(true);
                          console.log(
                            "[StripoEditorCustomized] Restored simple panel when switching to desktop",
                          );
                        }

                        // Restore wide panel
                        const widePanel = uiEditor.shadowRoot.querySelector(
                          "ue-wide-panel",
                        ) as HTMLElement | null;
                        if (widePanel) {
                          widePanel.style.removeProperty("display");
                          setIsWidePanelVisible(true);
                          console.log(
                            "[StripoEditorCustomized] Restored wide panel when switching to desktop",
                          );
                        }
                      }
                    }
                  }

                  applyPositioning(width);
                });

                resizeObserverRef.current.observe(containerRef.current);
                console.log(
                  "[StripoEditorCustomized] ResizeObserver set up to track container width",
                );
              } else if (typeof ResizeObserver === "undefined") {
                console.warn(
                  "[StripoEditorCustomized] ResizeObserver not available, using window resize fallback",
                );
                // Fallback to window resize event
                const handleResize = () => {
                  const width =
                    containerRef.current?.getBoundingClientRect().width ?? 0;
                  const wasMobile = previousMobileRef.current;
                  const mobile = width <= 1200;
                  previousMobileRef.current = mobile;
                  setIsMobile(mobile);

                  // When switching from mobile to desktop, restore all panels
                  if (wasMobile && !mobile) {
                    const container = containerRef.current;
                    if (container) {
                      const uiEditor = container.querySelector("ui-editor");
                      if (uiEditor?.shadowRoot) {
                        // Restore modules panel
                        const modulesPanel = uiEditor.shadowRoot.querySelector(
                          "ue-modules-panel-component",
                        ) as HTMLElement | null;
                        if (modulesPanel) {
                          modulesPanel.style.removeProperty("display");
                          setIsModulesPanelVisible(true);
                          console.log(
                            "[StripoEditorCustomized] Restored modules panel when switching to desktop (window resize fallback)",
                          );
                        }

                        // Restore simple panel
                        const simplePanel = uiEditor.shadowRoot.querySelector(
                          "ue-ui-simple-panel",
                        ) as HTMLElement | null;
                        if (simplePanel) {
                          simplePanel.style.removeProperty("display");
                          setIsSimplePanelVisible(true);
                          console.log(
                            "[StripoEditorCustomized] Restored simple panel when switching to desktop (window resize fallback)",
                          );
                        }

                        // Restore wide panel
                        const widePanel = uiEditor.shadowRoot.querySelector(
                          "ue-wide-panel",
                        ) as HTMLElement | null;
                        if (widePanel) {
                          widePanel.style.removeProperty("display");
                          setIsWidePanelVisible(true);
                          console.log(
                            "[StripoEditorCustomized] Restored wide panel when switching to desktop (window resize fallback)",
                          );
                        }
                      }
                    }
                  }

                  applyPositioning(width);
                };
                window.addEventListener("resize", handleResize);
                // Store cleanup function (preserve existing cleanup if any)
                const existingCleanup = cleanupRef.current;
                cleanupRef.current = () => {
                  window.removeEventListener("resize", handleResize);
                  if (existingCleanup) {
                    existingCleanup();
                  }
                };
              }

              // Also set up MutationObserver to catch elements when they appear
              try {
                const uiEditor = container.querySelector("ui-editor");
                if (uiEditor?.shadowRoot) {
                  const observer = new MutationObserver(() => {
                    applyPositioning();
                  });
                  observer.observe(uiEditor.shadowRoot, {
                    childList: true,
                    subtree: true,
                  });
                  // Clean up observer after 10 seconds
                  setTimeout(() => observer.disconnect(), 10000);
                }
              } catch (error) {
                console.warn(
                  "[StripoEditorCustomized] Failed to set up MutationObserver:",
                  error,
                );
              }

              clearInterval(renderCheckInterval);
              setLoadingState("loaded");
              console.log(
                "[StripoEditorCustomized] ===== LOADING STATE SET TO 'loaded' =====",
                {
                  timestamp: new Date().toISOString(),
                },
              );
            } else if (renderCheckCount >= maxRenderChecks) {
              console.warn(
                "[StripoEditorCustomized] ===== EDITOR DID NOT RENDER AFTER TIMEOUT =====",
                {
                  timestamp: new Date().toISOString(),
                  checks: renderCheckCount,
                  hasContainer: !!container,
                  hasUIEditor: !!uiEditor,
                  containerChildren: container?.children.length || 0,
                  note: "Editor may have failed to render due to 403 error on plugin config endpoint",
                },
              );
              clearInterval(renderCheckInterval);
              // Set to loaded anyway - user can see the error if editor didn't render
              setLoadingState("loaded");
            }
          } else {
            console.warn(
              `[StripoEditorCustomized] Container not available on render check #${renderCheckCount}`,
            );
            if (renderCheckCount >= maxRenderChecks) {
              clearInterval(renderCheckInterval);
              setLoadingState("loaded");
            }
          }
        }, 500); // Check every 500ms

        // Extension styles are handled by the ExtensionBuilder, no need for manual injection

        // Function to log all toolbar classes for inspection
        const logToolbarClasses = () => {
          try {
            const container = containerRef.current;
            if (!container) return;

            console.log("=== INSPECTING TOOLBAR CLASSES ===");

            // Check shadow DOM
            const uiEditor = container.querySelector("ui-editor");
            if (uiEditor && uiEditor.shadowRoot) {
              const shadowElements = uiEditor.shadowRoot.querySelectorAll("*");
              const toolbarClasses = new Set<string>();
              const toolbarElements: Array<{
                tag: string;
                classes: string[];
                id?: string;
                text?: string;
              }> = [];

              shadowElements.forEach((el) => {
                const classes = Array.from(el.classList || []);
                classes.forEach((className) => {
                  if (
                    className.toLowerCase().includes("toolbar") ||
                    className.toLowerCase().includes("panel") ||
                    className.toLowerCase().includes("ue-") ||
                    className.toLowerCase().includes("header")
                  ) {
                    toolbarClasses.add(className);
                    toolbarElements.push({
                      tag: el.tagName,
                      classes: Array.from(el.classList),
                      id: el.id || undefined,
                      text: el.textContent?.substring(0, 50) || undefined,
                    });
                  }
                });
              });

              console.log(
                "Shadow DOM Toolbar Classes:",
                Array.from(toolbarClasses).sort(),
              );
              console.log(
                "Toolbar Elements (first 30):",
                toolbarElements.slice(0, 30),
              );

              // Log detailed info about specific toolbar elements
              const toolPanel = uiEditor.shadowRoot.querySelector(
                ".tool-panel-container",
              );
              const tabsHeader =
                uiEditor.shadowRoot.querySelector(".tabs-header");
              const movablePanel =
                uiEditor.shadowRoot.querySelector(".movable-panel");

              if (toolPanel) {
                const rect = toolPanel.getBoundingClientRect();
                console.log("tool-panel-container found:", {
                  classes: Array.from(toolPanel.classList),
                  position: window.getComputedStyle(toolPanel).position,
                  top: window.getComputedStyle(toolPanel).top,
                  bottom: window.getComputedStyle(toolPanel).bottom,
                  rect: {
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                  },
                });

                // Directly apply transform to move toolbar 100px to the right
                (toolPanel as HTMLElement).style.setProperty(
                  "transform",
                  "translateX(100px)",
                  "important",
                );
                console.log(
                  "[StripoEditorCustomized] Applied transform to tool-panel-container (100px right)",
                );
              }
              if (tabsHeader) {
                const rect = tabsHeader.getBoundingClientRect();
                console.log("tabs-header found:", {
                  classes: Array.from(tabsHeader.classList),
                  position: window.getComputedStyle(tabsHeader).position,
                  top: window.getComputedStyle(tabsHeader).top,
                  bottom: window.getComputedStyle(tabsHeader).bottom,
                  rect: {
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                  },
                });
              }
              if (movablePanel) {
                const rect = movablePanel.getBoundingClientRect();
                console.log("movable-panel found:", {
                  classes: Array.from(movablePanel.classList),
                  position: window.getComputedStyle(movablePanel).position,
                  top: window.getComputedStyle(movablePanel).top,
                  bottom: window.getComputedStyle(movablePanel).bottom,
                  rect: {
                    top: rect.top,
                    bottom: rect.bottom,
                    left: rect.left,
                    right: rect.right,
                  },
                });
              }
            }

            // Check regular DOM
            const allElements = container.querySelectorAll("*");
            const regularToolbarClasses = new Set<string>();
            allElements.forEach((el) => {
              Array.from(el.classList || []).forEach((className) => {
                if (
                  className.toLowerCase().includes("toolbar") ||
                  className.toLowerCase().includes("panel") ||
                  className.toLowerCase().includes("ue-")
                ) {
                  regularToolbarClasses.add(className);
                }
              });
            });
            console.log(
              "Regular DOM Toolbar Classes:",
              Array.from(regularToolbarClasses).sort(),
            );
          } catch (error) {
            console.warn(
              "[StripoEditorCustomized] Error logging toolbar classes:",
              error,
            );
          }
        };

        // Poll for StripoEditorApi to be available
        let editorReadyCheckInterval: ReturnType<typeof setInterval> | null =
          null;
        let checkCount = 0;
        const maxChecks = 60; // 30 seconds max (60 * 500ms)

        editorReadyCheckInterval = setInterval(() => {
          checkCount++;
          const isReady = checkEditorReady();

          console.log(
            `[StripoEditorCustomized] Editor API check #${checkCount}:`,
            {
              isReady,
              hasStripoEditorApi: typeof window.StripoEditorApi !== "undefined",
              hasActionsApi:
                typeof window.StripoEditorApi?.actionsApi !== "undefined",
              hasSave:
                typeof window.StripoEditorApi?.actionsApi?.save === "function",
              hasCompileEmail:
                typeof window.StripoEditorApi?.actionsApi?.compileEmail ===
                "function",
              hasGetTemplateData:
                typeof window.StripoEditorApi?.actionsApi?.getTemplateData ===
                "function",
            },
          );

          if (isReady) {
            console.log(
              "[StripoEditorCustomized] ✓ Editor API is ready after",
              checkCount,
              "checks",
            );

            // Try to validate emailId exists by checking template data
            if (
              window.StripoEditorApi?.actionsApi?.getTemplateData &&
              emailIdToUse
            ) {
              setTimeout(async () => {
                try {
                  const exists =
                    await validateEmailIdWithEditorApi(emailIdToUse);
                  if (exists) {
                    console.log(
                      "[StripoEditorCustomized] ✓ Template validation: EXISTS and is accessible",
                    );
                    console.log(
                      "[StripoEditorCustomized] ✓ EmailId is valid:",
                      emailIdToUse,
                    );
                  } else {
                    console.warn(
                      "[StripoEditorCustomized] ⚠ Template validation: DOES NOT EXIST or is empty",
                    );
                    console.warn(
                      "[StripoEditorCustomized] ⚠ EmailId may be invalid:",
                      emailIdToUse,
                    );
                    console.warn(
                      "[StripoEditorCustomized] Recommendation: Clear storage and let Stripo create a new template",
                    );
                  }

                  // Also log template data details
                  window.StripoEditorApi.actionsApi.getTemplateData((data) => {
                    console.log(
                      "[StripoEditorCustomized] Template data details:",
                      {
                        hasHtml: !!data.html,
                        htmlLength: data.html?.length || 0,
                        hasCss: !!data.css,
                        cssLength: data.css?.length || 0,
                        emailId: emailIdToUse,
                      },
                    );
                  });
                } catch (error) {
                  console.warn(
                    "[StripoEditorCustomized] ⚠ Could not validate template:",
                    error,
                  );
                  console.warn(
                    "[StripoEditorCustomized] This might indicate the emailId doesn't exist in Stripo",
                  );
                }
              }, 1000);
            }

            // Log toolbar classes for inspection
            setTimeout(() => logToolbarClasses(), 2000);

            if (editorReadyCheckInterval) {
              clearInterval(editorReadyCheckInterval);
              editorReadyCheckInterval = null;
            }
          } else if (checkCount >= maxChecks) {
            console.warn(
              "[StripoEditorCustomized] ⚠ Editor API not ready after",
              maxChecks,
              "checks - giving up",
            );
            console.warn("[StripoEditorCustomized] Possible causes:");
            console.warn(
              "  1. EmailId doesn't exist in Stripo and SDK failed to create it",
            );
            console.warn("  2. Token authentication failed");
            console.warn(
              "  3. Network issues preventing Stripo SDK from loading",
            );
            console.warn(
              "  4. Stripo SDK initialization error (check console for errors)",
            );
            if (editorReadyCheckInterval) {
              clearInterval(editorReadyCheckInterval);
              editorReadyCheckInterval = null;
            }
          }
        }, 500);

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
          "[StripoEditorCustomized] ===== ERROR IN TRY BLOCK =====",
          {
            error,
            errorMessage: errorMsg,
            errorStack: error instanceof Error ? error.stack : undefined,
            emailId: emailIdToUse,
            containerReady: !!containerRef.current,
            uiEditorAvailable: typeof window.UIEditor !== "undefined",
            timestamp: new Date().toISOString(),
          },
        );
        setErrorMessage(errorMsg);
        setLoadingState("error");
        console.log(
          "[StripoEditorCustomized] ===== SET LOADING STATE TO 'error' =====",
          {
            timestamp: new Date().toISOString(),
          },
        );
      }

      console.log(
        "[StripoEditorCustomized] ===== INIT EDITOR FUNCTION END =====",
        {
          timestamp: new Date().toISOString(),
          finalLoadingState: loadingState,
        },
      );
    };

    // Register extension before loading Stripo script
    // Extensions must be registered BEFORE the editor initializes
    const loadExtensionScript = (): Promise<void> => {
      return new Promise((resolve) => {
        try {
          // Create extension using ExtensionBuilder
          const extension = createStripoExtension();

          // Register extension globally so Stripo can detect it
          if (!window.StripoExtensionsSDK) {
            (window as any).StripoExtensionsSDK = {};
          }

          // Store the extension - Stripo will pick it up during initialization
          (window as any).StripoExtensionsSDK.customExtension = extension;

          console.log(
            "[StripoEditorCustomized] Extension created and registered globally",
          );

          // Extension styles are handled by ExtensionBuilder, no manual injection needed

          resolve();
        } catch (error) {
          console.warn(
            "[StripoEditorCustomized] Extension registration warning:",
            error,
          );
          resolve(); // Continue anyway - styles are injected as fallback
        }
      });
    };

    // Load Stripo script if not already loaded
    const loadStripoScript = async () => {
      // Load extension script BEFORE loading Stripo editor
      await loadExtensionScript();

      const existingScript = document.getElementById("UiEditorScript");
      if (existingScript && window.UIEditor) {
        console.log(
          "[StripoEditorCustomized] Stripo script already loaded, initializing...",
        );
        initStripoEditor();
        return;
      }

      if (existingScript) {
        console.log(
          "[StripoEditorCustomized] Script tag exists, waiting for UIEditor...",
        );

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

        setTimeout(() => {
          if (uiEditorCheckIntervalRef.current) {
            clearInterval(uiEditorCheckIntervalRef.current);
            uiEditorCheckIntervalRef.current = null;
          }
          if (!window.UIEditor) {
            console.error(
              "[StripoEditorCustomized] UIEditor not available after waiting",
            );
            setErrorMessage("Stripo editor failed to load");
            setLoadingState("error");
          }
        }, 10000);
        return;
      }

      console.log(
        "[StripoEditorCustomized] Loading Stripo UI Editor script...",
      );
      const script = document.createElement("script");
      script.id = "UiEditorScript";
      script.type = "module";
      script.src =
        "https://plugins.stripo.email/resources/uieditor/rev/2.21.0/UIEditor.js";
      script.async = true;

      script.onload = () => {
        console.log(
          "[StripoEditorCustomized] ✓ Stripo script loaded successfully",
          {
            scriptSrc: script.src,
            scriptId: script.id,
          },
        );
        setTimeout(() => {
          console.log(
            "[StripoEditorCustomized] Checking for window.UIEditor after script load...",
          );
          if (window.UIEditor) {
            console.log(
              "[StripoEditorCustomized] ✓ window.UIEditor found, initializing editor",
            );
            initStripoEditor();
          } else {
            console.error(
              "[StripoEditorCustomized] ✗ UIEditor not found after script load",
              {
                windowKeys: Object.keys(window).filter(
                  (k) =>
                    k.toLowerCase().includes("editor") ||
                    k.toLowerCase().includes("stripo") ||
                    k.toLowerCase().includes("ui"),
                ),
                hasUIEditor: typeof window.UIEditor !== "undefined",
              },
            );
            setErrorMessage("Stripo editor failed to load");
            setLoadingState("error");
          }
        }, 500);
      };

      script.onerror = () => {
        const errorMsg =
          "Failed to load Stripo UI Editor script. Please check your internet connection.";
        console.error("[StripoEditorCustomized] Failed to load Stripo script");
        setErrorMessage(errorMsg);
        setLoadingState("error");
        editorInitializedRef.current = false;
      };

      document.head.appendChild(script);
      scriptLoadedRef.current = true;
    };

    // Load zone.js first, then Stripo
    console.log(
      "[StripoEditorCustomized] Starting initialization sequence: zone.js -> Stripo script -> editor",
    );
    loadZoneJs()
      .then(() => {
        console.log(
          "[StripoEditorCustomized] ✓ zone.js ready, loading Stripo script...",
          {
            hasZone: typeof (window as any).Zone !== "undefined",
          },
        );
        loadStripoScript();
      })
      .catch((error) => {
        console.warn(
          "[StripoEditorCustomized] ⚠ Failed to load zone.js:",
          error,
        );
        console.warn(
          "[StripoEditorCustomized] Proceeding without zone.js (Stripo may handle it internally)",
        );
        loadStripoScript();
      });

    return () => {
      console.log("[StripoEditorCustomized] Cleaning up...");

      // Remove global error handlers
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
      window.removeEventListener("error", handleError);

      if (uiEditorCheckIntervalRef.current) {
        clearInterval(uiEditorCheckIntervalRef.current);
        uiEditorCheckIntervalRef.current = null;
      }

      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      // Clean up ResizeObserver
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
        resizeObserverRef.current = null;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      editorInitializedRef.current = false;
      scriptLoadedRef.current = false;
    };
  }, []);

  // Expose clearStripoStorage globally for easy testing (dev only)
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      process.env.NODE_ENV === "development"
    ) {
      (window as any).clearStripoStorage = clearStripoStorage;
      console.log(
        "[StripoEditorCustomized] Dev helper: clearStripoStorage() available on window",
      );
      return () => {
        delete (window as any).clearStripoStorage;
      };
    }
  }, []);

  // Toggle function for modules panel visibility
  const toggleModulesPanel = () => {
    const container = containerRef.current;
    if (!container) return;

    const uiEditor = container.querySelector("ui-editor");
    if (!uiEditor?.shadowRoot) {
      console.warn(
        "[StripoEditorCustomized] Cannot toggle modules panel: ui-editor or shadowRoot not found",
      );
      return;
    }

    const modulesPanel = uiEditor.shadowRoot.querySelector(
      "ue-modules-panel-component",
    ) as HTMLElement | null;

    if (!modulesPanel) {
      console.warn(
        "[StripoEditorCustomized] Cannot toggle modules panel: ue-modules-panel-component not found",
      );
      return;
    }

    const newVisibility = !isModulesPanelVisible;
    setIsModulesPanelVisible(newVisibility);

    if (newVisibility) {
      // Show the panel - remove display property to restore default
      modulesPanel.style.removeProperty("display");
      console.log(
        "[StripoEditorCustomized] Modules panel shown (display property removed)",
      );
    } else {
      // Hide the panel
      modulesPanel.style.setProperty("display", "none", "important");
      console.log(
        "[StripoEditorCustomized] Modules panel hidden (display: none)",
      );
    }
  };

  // Toggle function for simple panel visibility
  const toggleSimplePanel = () => {
    const container = containerRef.current;
    if (!container) return;

    const uiEditor = container.querySelector("ui-editor");
    if (!uiEditor?.shadowRoot) {
      console.warn(
        "[StripoEditorCustomized] Cannot toggle simple panel: ui-editor or shadowRoot not found",
      );
      return;
    }

    const simplePanel = uiEditor.shadowRoot.querySelector(
      "ue-ui-simple-panel",
    ) as HTMLElement | null;

    if (!simplePanel) {
      console.warn(
        "[StripoEditorCustomized] Cannot toggle simple panel: ue-ui-simple-panel not found",
      );
      return;
    }

    const newVisibility = !isSimplePanelVisible;
    setIsSimplePanelVisible(newVisibility);

    if (newVisibility) {
      // Show the panel - remove display property to restore default
      simplePanel.style.removeProperty("display");
      console.log(
        "[StripoEditorCustomized] Simple panel shown (display property removed)",
      );
    } else {
      // Hide the panel
      simplePanel.style.setProperty("display", "none", "important");
      console.log(
        "[StripoEditorCustomized] Simple panel hidden (display: none)",
      );
    }
  };

  // Toggle function for wide panel visibility
  const toggleWidePanel = () => {
    const container = containerRef.current;
    if (!container) return;

    const uiEditor = container.querySelector("ui-editor");
    if (!uiEditor?.shadowRoot) {
      console.warn(
        "[StripoEditorCustomized] Cannot toggle wide panel: ui-editor or shadowRoot not found",
      );
      return;
    }

    const widePanel = uiEditor.shadowRoot.querySelector(
      "ue-wide-panel",
    ) as HTMLElement | null;

    if (!widePanel) {
      console.warn(
        "[StripoEditorCustomized] Cannot toggle wide panel: ue-wide-panel not found",
      );
      return;
    }

    const newVisibility = !isWidePanelVisible;
    setIsWidePanelVisible(newVisibility);

    if (newVisibility) {
      // Show the panel - remove display property to restore default
      widePanel.style.removeProperty("display");
      console.log(
        "[StripoEditorCustomized] Wide panel shown (display property removed)",
      );
    } else {
      // Hide the panel
      widePanel.style.setProperty("display", "none", "important");
      console.log(
        "[StripoEditorCustomized] Wide panel hidden (display: none)",
      );
    }
  };

  return (
    <div className="w-full h-[600px] relative" style={{ minHeight: "600px" }}>
      <div className="absolute top-2 right-2 z-20 flex gap-2">
        {isMobile && (
          <>
            <button
              type="button"
              onClick={toggleModulesPanel}
              className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 flex items-center justify-center text-xs"
              title={
                isModulesPanelVisible
                  ? "Hide modules panel"
                  : "Show modules panel"
              }
              aria-label={
                isModulesPanelVisible
                  ? "Hide modules panel"
                  : "Show modules panel"
              }
            >
              Modules
            </button>
            <button
              type="button"
              onClick={toggleSimplePanel}
              className="px-3 py-2 bg-green-500 text-white rounded hover:bg-green-600 flex items-center justify-center text-xs"
              title={
                isSimplePanelVisible
                  ? "Hide simple panel"
                  : "Show simple panel"
              }
              aria-label={
                isSimplePanelVisible
                  ? "Hide simple panel"
                  : "Show simple panel"
              }
            >
              Simple
            </button>
            <button
              type="button"
              onClick={toggleWidePanel}
              className="px-3 py-2 bg-purple-500 text-white rounded hover:bg-purple-600 flex items-center justify-center text-xs"
              title={
                isWidePanelVisible
                  ? "Hide wide panel"
                  : "Show wide panel"
              }
              aria-label={
                isWidePanelVisible
                  ? "Hide wide panel"
                  : "Show wide panel"
              }
            >
              Wide
            </button>
          </>
        )}
        {process.env.NODE_ENV === "development" && (
          <button
            type="button"
            onClick={() => {
              clearStripoStorage({ clearAll: false });
              console.log(
                "[StripoEditorCustomized] Storage cleared, reloading...",
              );
              window.location.reload();
            }}
            className="px-2 py-1 text-xs bg-yellow-500 text-white rounded hover:bg-yellow-600"
            title="Clear localStorage emailId (dev only)"
          >
            Clear Storage
          </button>
        )}
      </div>
      <div
        key="stripo-editor-container-customized"
        ref={containerRef}
        id="stripo-editor-container-customized"
        className="w-full h-full"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "600px",
          display: "block",
          position: "relative",
          isolation: "isolate",
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
            <div className="flex gap-2 mt-2">
              <button
                type="button"
                onClick={() => {
                  setLoadingState("idle");
                  setErrorMessage(null);
                  scriptLoadedRef.current = false;
                  window.location.reload();
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
              >
                Retry
              </button>
              <button
                type="button"
                onClick={() => {
                  clearStripoStorage({ clearAll: false });
                  if (onStorageCleared) {
                    onStorageCleared();
                  }
                  setLoadingState("idle");
                  setErrorMessage(null);
                  scriptLoadedRef.current = false;
                  editorInitializedRef.current = false;
                  window.location.reload();
                }}
                className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 text-sm"
                title="Clear localStorage and retry (useful if emailId doesn't exist in Stripo)"
              >
                Clear Storage & Retry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
