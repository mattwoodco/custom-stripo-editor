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

// Storage key for emailId
const STORAGE_KEY = "stripo-email-id";

// Get or create email template ID from localStorage (reuse existing template)
function getOrCreateEmailId(): string | null {
  if (typeof window === "undefined") {
    console.log("[StripoEditor] getOrCreateEmailId: window undefined (SSR)");
    return null;
  }
  
  const storedEmailId = localStorage.getItem(STORAGE_KEY);
  
  console.log("[StripoEditor] getOrCreateEmailId: Checking localStorage", {
    storageKey: STORAGE_KEY,
    hasStoredId: !!storedEmailId,
    storedIdValue: storedEmailId,
    localStorageAvailable: typeof localStorage !== "undefined",
  });
  
  if (storedEmailId) {
    console.log(
      "[StripoEditor] ✓ Found existing emailId in localStorage:",
      storedEmailId,
      "- Will attempt to reuse (may fail if template doesn't exist in Stripo)",
    );
    return storedEmailId;
  }
  
  // Generate a new emailId and store it
  const newEmailId = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  localStorage.setItem(STORAGE_KEY, newEmailId);
  console.log(
    "[StripoEditor] ✗ No existing emailId found, generated new:",
    newEmailId,
    "- Template will be created by Stripo SDK on first load",
  );
  return newEmailId;
}

// Create a hello world email template
// NOTE: This function prefers reusing existing templates from localStorage
// to avoid hitting Stripo's template creation limit. The Stripo SDK will
// create the template when initializing with the emailId.
async function createHelloWorldTemplate(): Promise<string | null> {
  // Check if there's an EXISTING emailId in localStorage (before generating new one)
  if (typeof window !== "undefined") {
    const storedEmailId = localStorage.getItem(STORAGE_KEY);
    if (storedEmailId) {
      console.log(
        "[StripoEditor] ✓ Reusing existing template from localStorage:",
        storedEmailId,
        "- This avoids hitting Stripo's template creation limit",
      );
      return storedEmailId;
    }
  }
  
  // No existing emailId found - generate a new one
  // Note: We don't call the API route because it doesn't actually create templates
  // The Stripo SDK will create the template when initializing with this emailId
  const newEmailId = getOrCreateEmailId();
  console.log(
    "[StripoEditor] Generated new emailId:",
    newEmailId,
    "- Stripo SDK will create template on initialization (may hit limit if exceeded)",
  );
  return newEmailId;
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
  const initializedHtmlRef = useRef<string | undefined>(undefined);
  const initializedCssRef = useRef<string | undefined>(undefined);
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
  const tokenRef = useRef<string | null>(null); // Cache token for synchronous access

  // Log props changes for debugging
  useEffect(() => {
    console.log("[StripoEditor] ===== PROPS RECEIVED =====", {
      emailId: providedEmailId || "none",
      hasHtml: providedHtml !== undefined,
      htmlIsUndefined: providedHtml === undefined,
      htmlIsEmptyString: providedHtml === "",
      htmlLength: providedHtml?.length || 0,
      htmlPreview: providedHtml?.substring(0, 100) || "",
      hasCss: providedCss !== undefined,
      cssLength: providedCss?.length || 0,
      shouldCreateTemplate,
      timestamp: new Date().toISOString(),
    });
  }, [providedEmailId, providedHtml, providedCss, shouldCreateTemplate]);

  useEffect(() => {
    console.log("[StripoEditor] ===== useEffect RUNNING =====", {
      editorInitialized: editorInitializedRef.current,
      hasContainer: !!containerRef.current,
      providedHtml: providedHtml !== undefined ? (providedHtml ? `"${providedHtml.substring(0, 30)}..."` : '"" (empty)') : "undefined",
      htmlLength: providedHtml?.length || 0,
      shouldCreateTemplate,
      timestamp: new Date().toISOString(),
    });

    // If we're not creating a template and HTML is not provided yet, wait
    // This prevents initializing with empty content when a template is being loaded
    if (!shouldCreateTemplate && providedHtml === undefined) {
      console.log("[StripoEditor] ⏳ Waiting for HTML to be provided (template loading)...", {
        shouldCreateTemplate,
        hasHtml: providedHtml !== undefined,
      });
      return;
    }

    // Check if HTML/CSS has changed - if so, reset initialization to allow reinit
    const htmlChanged = initializedHtmlRef.current !== providedHtml;
    const cssChanged = initializedCssRef.current !== providedCss;
    
    if (editorInitializedRef.current && (htmlChanged || cssChanged)) {
      console.log("[StripoEditor] 🔄 HTML/CSS changed, resetting initialization to reload template", {
        htmlChanged,
        cssChanged,
        oldHtmlLength: initializedHtmlRef.current?.length || 0,
        newHtmlLength: providedHtml?.length || 0,
        oldCssLength: initializedCssRef.current?.length || 0,
        newCssLength: providedCss?.length || 0,
      });
      
      // Clean up existing editor
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
      
      // Clear intervals
      if (zoneCheckIntervalRef.current) {
        clearInterval(zoneCheckIntervalRef.current);
        zoneCheckIntervalRef.current = null;
      }
      if (uiEditorCheckIntervalRef.current) {
        clearInterval(uiEditorCheckIntervalRef.current);
        uiEditorCheckIntervalRef.current = null;
      }
      
      // Reset initialization flags
      editorInitializedRef.current = false;
      scriptLoadedRef.current = false;
    }

    // Prevent double initialization (React StrictMode in dev)
    if (editorInitializedRef.current && !htmlChanged && !cssChanged) {
      console.log("[StripoEditor] ⚠️ Already initialized, skipping...", {
        providedHtml: providedHtml !== undefined ? (providedHtml ? `"${providedHtml.substring(0, 30)}..."` : '""') : "undefined",
        htmlLength: providedHtml?.length || 0,
        reason: "editorInitializedRef.current is true and content unchanged",
      });
      return;
    }

    if (!containerRef.current) {
      console.log("[StripoEditor] ⚠️ Container not ready, will retry...");
      return;
    }

    console.log("[StripoEditor] ✓ Starting initialization...", {
      hasHtml: providedHtml !== undefined,
      htmlLength: providedHtml?.length || 0,
      willCreateTemplate: shouldCreateTemplate,
    });
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
            {
              scriptSrc: (existingZoneScript as HTMLScriptElement).src,
              scriptId: existingZoneScript.id,
              hasZone: typeof (window as any).Zone !== "undefined",
              windowKeys: Object.keys(window).filter(k => k.toLowerCase().includes("zone") || k.toLowerCase().includes("Zone")),
            },
          );
          let attempts = 0;
          const maxAttempts = 100; // 10 seconds
          const checkInterval = setInterval(() => {
            attempts++;
            const hasZone = typeof (window as any).Zone !== "undefined";
            if (hasZone) {
              clearInterval(checkInterval);
              zoneCheckIntervalRef.current = null;
              console.log("[StripoEditor] ✓ zone.js Zone object found after", attempts, "attempts");
              resolve();
            } else if (attempts >= maxAttempts) {
              clearInterval(checkInterval);
              zoneCheckIntervalRef.current = null;
              console.warn(
                "[StripoEditor] ⚠ zone.js script exists but Zone not available after waiting - proceeding anyway",
                {
                  attempts,
                  scriptSrc: (existingZoneScript as HTMLScriptElement).src,
                  scriptComplete: (existingZoneScript as HTMLScriptElement).complete,
                  scriptReadyState: (existingZoneScript as HTMLScriptElement).readyState,
                  note: "Zone.js may be optional - proceeding with Stripo initialization",
                },
              );
              // Don't reject - proceed anyway as zone.js might be optional
              resolve();
              return; // Ensure we exit
            } else if (attempts % 10 === 0) {
              // Log every 10th attempt for debugging
              console.log(`[StripoEditor] Still waiting for Zone... (attempt ${attempts}/${maxAttempts})`);
            }
          }, 100);
          zoneCheckIntervalRef.current = checkInterval;
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
      // Wait for container to be available with retries
      if (!containerRef.current) {
        console.warn(
          "[StripoEditor] Container ref not available, waiting...",
        );
        // Retry a few times before giving up
        let retries = 0;
        const maxRetries = 20; // 2 seconds
        const checkContainer = setInterval(() => {
          retries++;
          if (containerRef.current) {
            clearInterval(checkContainer);
            console.log("[StripoEditor] ✓ Container ref now available after", retries, "retries");
            // Recursively call initStripoEditor now that container is ready
            initStripoEditor();
          } else if (retries >= maxRetries) {
            clearInterval(checkContainer);
            console.error(
              "[StripoEditor] Cannot initialize: container ref is not available after waiting",
            );
            setErrorMessage("Editor container not available");
            setLoadingState("error");
          }
        }, 100);
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
      // Check if HTML was explicitly provided (including empty string)
      const hasProvidedHtml = providedHtml !== undefined;
      let htmlToUse = providedHtml;

      console.log("[StripoEditor] ===== HTML PROP ANALYSIS =====", {
        providedHtml: providedHtml !== undefined ? (providedHtml ? `"${providedHtml.substring(0, 50)}..."` : '"" (empty string)') : "undefined",
        hasProvidedHtml,
        htmlLength: providedHtml?.length || 0,
        htmlIsUndefined: providedHtml === undefined,
        htmlIsEmptyString: providedHtml === "",
        htmlIsTruthy: !!providedHtml,
        shouldCreateTemplate,
        timestamp: new Date().toISOString(),
      });

      // Create hello world template if requested
      if (shouldCreateTemplate && !emailIdToUse) {
        console.log(
          "[StripoEditor] Creating hello world template before initialization...",
        );
        try {
          const createdEmailId = await createHelloWorldTemplate();
          console.log("[StripoEditor] Template creation result:", {
            emailId: createdEmailId,
            emailIdType: typeof createdEmailId,
            emailIdLength: createdEmailId?.length,
          });
          if (createdEmailId) {
            emailIdToUse = createdEmailId;
            createdEmailIdRef.current = createdEmailId;
            // Use DEFAULT_HTML when creating hello world template ONLY if HTML wasn't explicitly provided
            if (!hasProvidedHtml) {
              htmlToUse = DEFAULT_HTML;
              console.log(
                "[StripoEditor] Using DEFAULT_HTML for hello world template (no HTML provided)",
                {
                  htmlLength: DEFAULT_HTML.length,
                  htmlPreview: DEFAULT_HTML.substring(0, 100) + "...",
                },
              );
            } else {
              console.log(
                "[StripoEditor] Using provided HTML for hello world template",
                {
                  htmlLength: htmlToUse?.length || 0,
                },
              );
            }
          } else {
            console.warn(
              "[StripoEditor] ⚠ Failed to create template, using generated ID",
              {
                willGenerateNewId: true,
              },
            );
          }
        } catch (error) {
          console.error("[StripoEditor] ✗ Error creating template:", {
            error,
            errorMessage: error instanceof Error ? error.message : String(error),
            errorStack: error instanceof Error ? error.stack : undefined,
            willGenerateNewId: true,
          });
        }
      }

      // Generate emailId if not provided (prefer localStorage to avoid creating new templates)
      if (!emailIdToUse) {
        // Try to reuse existing emailId from localStorage
        const existingEmailId = getOrCreateEmailId();
        if (existingEmailId) {
          emailIdToUse = existingEmailId;
          console.log(
            "[StripoEditor] Using emailId from localStorage:",
            emailIdToUse,
            "- Reusing existing template to avoid creation limits",
          );
        } else {
          // Fallback: generate new emailId
          emailIdToUse = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
          localStorage.setItem(STORAGE_KEY, emailIdToUse);
          console.log(
            "[StripoEditor] Generated new emailId:",
            emailIdToUse,
            "- Stored in localStorage for future reuse",
          );
        }
      } else {
        // Store provided emailId in localStorage for future reuse
        localStorage.setItem(STORAGE_KEY, emailIdToUse);
        console.log("[StripoEditor] Using provided emailId:", emailIdToUse);
      }

      // Determine final HTML to use
      // If HTML was explicitly provided (even if empty string), use it
      // Otherwise, use DEFAULT_HTML only if creating a template
      let finalHtml: string;
      if (hasProvidedHtml) {
        // HTML was provided (could be empty string, that's OK)
        finalHtml = htmlToUse ?? "";
        console.log("[StripoEditor] ===== FINAL HTML DECISION: USING PROVIDED HTML =====", {
          htmlLength: finalHtml.length,
          isEmpty: finalHtml === "",
          htmlPreview: finalHtml.substring(0, 100),
          source: "providedHtml prop",
          timestamp: new Date().toISOString(),
        });
      } else if (shouldCreateTemplate) {
        // No HTML provided but creating template - use default
        finalHtml = DEFAULT_HTML;
        console.log("[StripoEditor] ===== FINAL HTML DECISION: USING DEFAULT_HTML =====", {
          htmlLength: finalHtml.length,
          reason: "no HTML provided, creating template",
          timestamp: new Date().toISOString(),
        });
      } else {
        // No HTML provided and not creating template - use empty string
        finalHtml = "";
        console.log("[StripoEditor] ===== FINAL HTML DECISION: USING EMPTY HTML =====", {
          htmlLength: 0,
          reason: "no HTML provided, not creating template",
          timestamp: new Date().toISOString(),
        });
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
        const finalCss = providedCss ?? "";

        console.log("[StripoEditor] ===== INITIALIZING STRIPO EDITOR =====");
        console.log("[StripoEditor] Editor config:", {
          emailId: emailIdToUse,
          emailIdLength: emailIdToUse.length,
          htmlLength: finalHtml.length,
          cssLength: finalCss.length,
          hasHtml: !!finalHtml,
          htmlIsEmpty: finalHtml === "",
          htmlIsProvided: hasProvidedHtml,
          htmlSource: hasProvidedHtml ? "provided prop" : (shouldCreateTemplate ? "DEFAULT_HTML" : "empty string"),
          htmlPreview: finalHtml.substring(0, 200) + (finalHtml.length > 200 ? "..." : ""),
          containerReady: !!containerRef.current,
          containerDimensions: containerRef.current ? {
            width: containerRef.current.getBoundingClientRect().width,
            height: containerRef.current.getBoundingClientRect().height,
          } : null,
          timestamp: new Date().toISOString(),
        });
        console.log("[StripoEditor] Window globals check:", {
          hasUIEditor: typeof window.UIEditor !== "undefined",
          hasStripoEditorApi: typeof window.StripoEditorApi !== "undefined",
          hasZone: typeof (window as any).Zone !== "undefined",
          zoneType: typeof (window as any).Zone,
        });

        // Clear any existing content in container to prevent shadow DOM conflicts
        if (containerRef.current) {
          containerRef.current.innerHTML = "";
        }

        // Pre-fetch token BEFORE calling initEditor (per Stripo docs)
        // This ensures token is available when SDK calls plugin config endpoint
        console.log("[StripoEditor] Pre-fetching token before editor initialization...");
        let preFetchedToken: string | null = null;
        try {
          preFetchedToken = await getStripoToken();
          tokenRef.current = preFetchedToken; // Cache token for synchronous access
          console.log("[StripoEditor] ✓ Token pre-fetched successfully:", {
            tokenLength: preFetchedToken.length,
            tokenPreview: preFetchedToken.substring(0, 20) + "...",
          });
        } catch (error) {
          console.error("[StripoEditor] ✗ Failed to pre-fetch token:", error);
          // Continue anyway - token will be fetched on demand
        }

        console.log("[StripoEditor] Calling window.UIEditor.initEditor...");
        const initStartTime = Date.now();
        
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
              console.log("[StripoEditor] Token refresh requested by Stripo SDK");
              
              // Return cached token immediately if available (synchronous)
              // This ensures SDK gets token right away when calling plugin config endpoint
              if (tokenRef.current) {
                console.log("[StripoEditor] Returning cached token synchronously:", {
                  tokenLength: tokenRef.current.length,
                  tokenPreview: tokenRef.current.substring(0, 20) + "...",
                });
                callback(tokenRef.current);
                
                // Refresh token in background for next time
                Promise.resolve().then(async () => {
                  try {
                    console.log("[StripoEditor] Refreshing token in background...");
                    const newToken = await getStripoToken();
                    tokenRef.current = newToken;
                    console.log("[StripoEditor] ✓ Token refreshed in background:", {
                      tokenLength: newToken.length,
                      tokenPreview: newToken.substring(0, 20) + "...",
                    });
                  } catch (error) {
                    console.error("[StripoEditor] ✗ Failed to refresh token in background:", error);
                  }
                });
              } else {
                // Fallback: fetch token if not cached
                Promise.resolve().then(async () => {
                  try {
                    console.log("[StripoEditor] Fetching token from /api/stripo/token...");
                    const token = await getStripoToken();
                    tokenRef.current = token; // Cache for next time
                    console.log("[StripoEditor] ✓ Token received:", {
                      tokenLength: token.length,
                      tokenPreview: token.substring(0, 20) + "...",
                    });
                    callback(token);
                  } catch (error) {
                    console.error("[StripoEditor] ✗ Failed to refresh Stripo token:", {
                      error,
                      errorMessage: error instanceof Error ? error.message : String(error),
                      errorStack: error instanceof Error ? error.stack : undefined,
                    });
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
                const messageStr = message?.toString() || "";
                const paramsStr = JSON.stringify(params || {});
                const combinedMessage = `${messageStr} ${paramsStr}`.toLowerCase();
                
                // Log all errors for debugging
                console.error("[StripoEditor] Stripo error notification:", {
                  message,
                  id,
                  params,
                  messageStr,
                  combinedMessage,
                });
                
                // Handle template creation limit error
                if (
                  messageStr.includes("limit") ||
                  messageStr.includes("exceeded") ||
                  combinedMessage.includes("limit") ||
                  combinedMessage.includes("exceeded")
                ) {
                  console.warn("[StripoEditor] ⚠ Template creation limit error detected:", messageStr);
                  console.warn("[StripoEditor] Clearing localStorage emailId to allow retry with fresh template");
                  
                  // Clear localStorage so next load can try with a fresh emailId
                  // This allows the user to retry after the limit resets
                  if (typeof window !== "undefined" && localStorage.getItem(STORAGE_KEY)) {
                    localStorage.removeItem(STORAGE_KEY);
                    console.warn("[StripoEditor] ✓ Cleared localStorage emailId. Reload page to retry.");
                  }
                  
                  // Suppress the error from showing to user (we've logged it)
                  return;
                }
                
                // Suppress coediting connection errors (they're expected when coediting is disabled)
                if (
                  messageStr.includes("connection")
                ) {
                  console.warn("[StripoEditor] Suppressing expected connection error:", messageStr);
                  return;
                }
                
                console.error("[StripoEditor] Stripo error:", message, id, params);
              },
              warn: (message, id, params) => {
                console.warn("[StripoEditor] Stripo warning:", message, id, params);
              },
              success: (message, id, params) => {
                console.log("[StripoEditor] Stripo success:", message, id, params);
              },
            },
            mergeTags: mergeTags,
            mobileViewButtonSelector: ".toggle-mobile-button",
            desktopViewButtonSelector: ".toggle-desktop-button",
          },
        );

        const initDuration = Date.now() - initStartTime;
        
        console.log("[StripoEditor] ✓ Stripo editor initialized successfully", {
          duration: `${initDuration}ms`,
        });

        // Track what HTML/CSS was used for initialization
        initializedHtmlRef.current = providedHtml;
        initializedCssRef.current = providedCss;

        // Note: initEditor returns void, so we can't store a cleanup function
        // The editor will be cleaned up when the container is cleared on unmount

        // Don't set loading state to 'loaded' immediately - wait for editor to actually render
        // The 403 error might prevent rendering even though initEditor() returned successfully
        console.log("[StripoEditor] Waiting for editor to render before hiding loading spinner...");
        
        // Check if editor actually rendered - poll until it appears or timeout
        let renderCheckCount = 0;
        const maxRenderChecks = 40; // 20 seconds max (40 * 500ms)
        const renderCheckInterval = setInterval(() => {
          renderCheckCount++;
          const container = containerRef.current;
          if (container) {
            const uiEditor = container.querySelector("ui-editor");
            const hasShadowRoot = !!(uiEditor?.shadowRoot);
            const hasContent = container.children.length > 0 || hasShadowRoot;
            
            console.log(`[StripoEditor] Editor render check #${renderCheckCount}:`, {
              hasContainer: !!container,
              hasUIEditor: !!uiEditor,
              hasShadowRoot,
              containerChildren: container.children.length,
              hasContent,
            });
            
            if (hasContent && hasShadowRoot) {
              console.log("[StripoEditor] ===== EDITOR RENDERED SUCCESSFULLY =====", {
                timestamp: new Date().toISOString(),
                checks: renderCheckCount,
              });
              
              // Apply positioning to blocks panel parent container
              const applyToolbarPositioning = () => {
                try {
                  const uiEditor = container.querySelector("ui-editor");
                  if (uiEditor?.shadowRoot) {
                    // Find ue-blocks-panel-component and walk up to find ue-ui-simple-panel
                    const blocksPanel = uiEditor.shadowRoot.querySelector("ue-blocks-panel-component");
                    if (blocksPanel) {
                      console.log("[StripoEditor] Found ue-blocks-panel-component");
                      
                      // Walk up the DOM tree to find ue-ui-simple-panel
                      let current: Element | null = blocksPanel.parentElement;
                      let depth = 0;
                      const maxDepth = 10;
                      let simplePanel: HTMLElement | null = null;
                      
                      while (current && depth < maxDepth) {
                        const tagName = current.tagName.toLowerCase();
                        const className = current.className || "";
                        
                        console.log(`[StripoEditor] Walking up DOM tree (depth ${depth}):`, {
                          tagName,
                          className: typeof className === "string" ? className : Array.from(className).join(" "),
                        });
                        
                        // Look for ue-ui-simple-panel
                        if (tagName === "ue-ui-simple-panel") {
                          simplePanel = current as HTMLElement;
                          console.log(`[StripoEditor] Found ue-ui-simple-panel at depth ${depth}`);
                          break; // Found the target, stop walking
                        }
                        
                        current = current.parentElement;
                        depth++;
                      }
                      
                      // Apply transform and width to ue-ui-simple-panel
                      if (simplePanel) {
                        simplePanel.style.setProperty("transform", "translateX(10px)", "important");
                        simplePanel.style.setProperty("width", "100px", "important");
                        console.log("[StripoEditor] Applied transform and width to ue-ui-simple-panel (10px right, 100px wide)", {
                          tagName: simplePanel.tagName,
                          className: simplePanel.className,
                          computedTransform: window.getComputedStyle(simplePanel).transform,
                          computedWidth: window.getComputedStyle(simplePanel).width,
                        });
                        return true;
                      } else {
                        console.warn("[StripoEditor] ue-ui-simple-panel not found, applying to immediate parent");
                        // Fallback: apply to immediate parent
                        if (blocksPanel.parentElement) {
                          (blocksPanel.parentElement as HTMLElement).style.setProperty("transform", "translateX(10px)", "important");
                          return true;
                        }
                      }
                    } else {
                      console.warn("[StripoEditor] ue-blocks-panel-component not found");
                    }
                  }
                } catch (error) {
                  console.warn("[StripoEditor] Failed to apply positioning:", error);
                }
                return false;
              };
              
              // Try to apply immediately
              if (!applyToolbarPositioning()) {
                // If toolbar not found yet, try again after a short delay
                setTimeout(() => {
                  applyToolbarPositioning();
                }, 500);
              }
              
              // Also set up a MutationObserver to catch toolbar when it appears
              try {
                const uiEditor = container.querySelector("ui-editor");
                if (uiEditor?.shadowRoot) {
                  const observer = new MutationObserver(() => {
                    applyToolbarPositioning();
                  });
                  observer.observe(uiEditor.shadowRoot, {
                    childList: true,
                    subtree: true,
                  });
                  // Clean up observer after 5 seconds
                  setTimeout(() => observer.disconnect(), 5000);
                }
              } catch (error) {
                // Observer setup failed, that's okay
              }
              
              clearInterval(renderCheckInterval);
              setLoadingState("loaded");
              console.log("[StripoEditor] ===== LOADING STATE SET TO 'loaded' =====", {
                timestamp: new Date().toISOString(),
              });
            } else if (renderCheckCount >= maxRenderChecks) {
              console.warn("[StripoEditor] ===== EDITOR DID NOT RENDER AFTER TIMEOUT =====", {
                timestamp: new Date().toISOString(),
                checks: renderCheckCount,
                hasContainer: !!container,
                hasUIEditor: !!uiEditor,
                containerChildren: container?.children.length || 0,
                note: "Editor may have failed to render due to 403 error on plugin config endpoint",
              });
              clearInterval(renderCheckInterval);
              // Set to loaded anyway - user can see the error if editor didn't render
              setLoadingState("loaded");
            }
          } else {
            console.warn(`[StripoEditor] Container not available on render check #${renderCheckCount}`);
            if (renderCheckCount >= maxRenderChecks) {
              clearInterval(renderCheckInterval);
              setLoadingState("loaded");
            }
          }
        }, 500); // Check every 500ms

        // Poll for StripoEditorApi to be available (for API features) - this is optional
        // The editor UI should be visible even if API isn't ready yet
        let editorReadyCheckInterval: ReturnType<typeof setInterval> | null =
          null;
        let checkCount = 0;
        const maxChecks = 60; // 30 seconds max (60 * 500ms)
        
        editorReadyCheckInterval = setInterval(() => {
          checkCount++;
          const isReady = checkEditorReady();

          console.log(`[StripoEditor] Editor API check #${checkCount}:`, {
            isReady,
            hasStripoEditorApi: typeof window.StripoEditorApi !== "undefined",
            hasActionsApi: typeof window.StripoEditorApi?.actionsApi !== "undefined",
            hasSave: typeof window.StripoEditorApi?.actionsApi?.save === "function",
            hasCompileEmail: typeof window.StripoEditorApi?.actionsApi?.compileEmail === "function",
            hasGetTemplateData: typeof window.StripoEditorApi?.actionsApi?.getTemplateData === "function",
          });

          if (isReady) {
            const totalDuration = Date.now() - initStartTime;
            console.log("[StripoEditor] ✓ Editor API is ready after", checkCount, "checks", {
              totalDuration: `${totalDuration}ms`,
            });
            
            // Try to validate template exists
            if (window.StripoEditorApi?.actionsApi?.getTemplateData) {
              setTimeout(() => {
                try {
                  window.StripoEditorApi.actionsApi.getTemplateData((data) => {
                    console.log("[StripoEditor] Template data validation:", {
                      emailId: emailIdToUse,
                      hasHtml: !!data.html,
                      htmlLength: data.html?.length || 0,
                      hasCss: !!data.css,
                      cssLength: data.css?.length || 0,
                      templateExists: !!(data.html || data.css),
                    });
                  });
                } catch (error) {
                  console.warn("[StripoEditor] ⚠ Could not validate template:", error);
                }
              }, 1000);
            }
            
            if (editorReadyCheckInterval) {
              clearInterval(editorReadyCheckInterval);
              editorReadyCheckInterval = null;
            }
          } else if (checkCount >= maxChecks) {
            console.warn("[StripoEditor] ⚠ Editor API not ready after", maxChecks, "checks - giving up");
            console.warn("[StripoEditor] Possible causes:");
            console.warn("  1. EmailId doesn't exist in Stripo and SDK failed to create it");
            console.warn("  2. Token authentication failed");
            console.warn("  3. Network issues preventing Stripo SDK from loading");
            console.warn("  4. Stripo SDK initialization error (check console for errors)");
            console.warn("  5. Template creation limit exceeded");
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
        // Ensure container is ready before initializing
        if (containerRef.current && !editorInitializedRef.current) {
          initStripoEditor();
        } else {
          console.warn("[StripoEditor] Skipping initialization - container not ready or already initialized");
        }
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
          // Check if we're still supposed to initialize
          if (!containerRef.current || editorInitializedRef.current) {
            if (uiEditorCheckIntervalRef.current) {
              clearInterval(uiEditorCheckIntervalRef.current);
              uiEditorCheckIntervalRef.current = null;
            }
            return;
          }
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
          // Check if we're still supposed to initialize (component might have unmounted)
          if (!containerRef.current || editorInitializedRef.current) {
            console.log("[StripoEditor] Skipping initialization - container not ready or already initialized");
            return;
          }
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
  }, [providedHtml, providedCss, shouldCreateTemplate]); // Re-run when HTML/CSS changes or createTemplate flag changes

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
                editorInitializedRef.current = false;
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
