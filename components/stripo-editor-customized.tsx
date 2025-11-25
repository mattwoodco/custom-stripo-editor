"use client";

import { useEffect, useRef, useState } from "react";
import { ExtensionBuilder } from "@stripoinc/ui-editor-extensions";

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
      "[StripoEditorCustomized] Creating hello world template via API route...",
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
        "[StripoEditorCustomized] Failed to create template:",
        response.status,
        errorData,
      );
      return null;
    }

    const data = await response.json();
    const emailId = data.emailId || data.id;

    if (emailId) {
      console.log(
        "[StripoEditorCustomized] Hello world template created successfully:",
        emailId,
      );
      return emailId;
    }

    console.warn(
      "[StripoEditorCustomized] Template created but no emailId in response:",
      data,
    );
    return null;
  } catch (error) {
    console.error(
      "[StripoEditorCustomized] Error creating hello world template:",
      error,
    );
    return null;
  }
}

// Create and register Stripo extension with toolbar customization
function createStripoExtension() {
  const extension = new ExtensionBuilder()
    .addStyles(`
      /* Customize toolbar buttons */
      .ue-toolbar-button {
        background-color: #4f46e5 !important;
        color: #ffffff !important;
        border-radius: 0.375rem !important;
        padding: 0.35rem 0.75rem !important;
        transition: background-color 0.2s ease !important;
        font-weight: 500 !important;
        border: none !important;
      }
      
      .ue-toolbar-button:hover {
        background-color: #4338ca !important;
      }
      
      .ue-toolbar-button:active {
        background-color: #3730a3 !important;
      }
      
      /* Customize toolbar container */
      .ue-toolbar {
        background-color: #f9fafb !important;
        border-bottom: 1px solid #e5e7eb !important;
        padding: 0.5rem !important;
      }
      
      /* Customize blocks panel */
      .block-panel-content {
        background-color: #ffffff !important;
      }
      
      /* Customize panel headers */
      .ue-panel-header {
        background-color: #1f2937 !important;
        color: #f9fafb !important;
        font-weight: 600 !important;
        padding: 0.75rem 1rem !important;
      }
      
      /* Customize control panels */
      .ue-control-panel {
        background-color: #ffffff !important;
        border-left: 1px solid #e5e7eb !important;
      }
      
      /* Customize icon buttons */
      .ue-icon-button {
        color: #4f46e5 !important;
      }
      
      .ue-icon-button:hover {
        background-color: #eef2ff !important;
        color: #4338ca !important;
      }
    `)
    .withPreviewStyles(`
      .ue-preview-dragging, .ue-dots-icon {
        background-color: #4f46e5 !important;
        opacity: 0.8;
      }
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
}: StripoEditorCustomizedProps) {
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

      // Create hello world template if requested
      if (shouldCreateTemplate && !emailIdToUse) {
        console.log(
          "[StripoEditorCustomized] Creating hello world template before initialization...",
        );
        try {
          const createdEmailId = await createHelloWorldTemplate();
          if (createdEmailId) {
            emailIdToUse = createdEmailId;
            createdEmailIdRef.current = createdEmailId;
            if (!htmlToUse) {
              htmlToUse = DEFAULT_HTML;
              console.log(
                "[StripoEditorCustomized] Using DEFAULT_HTML for hello world template",
              );
            }
          }
        } catch (error) {
          console.error(
            "[StripoEditorCustomized] Error creating template:",
            error,
          );
        }
      }

      // Generate emailId if not provided
      if (!emailIdToUse) {
        emailIdToUse = `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        console.log(
          "[StripoEditorCustomized] Generated emailId for new email:",
          emailIdToUse,
        );
      }

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

        console.log("[StripoEditorCustomized] Initializing with:", {
          emailId: emailIdToUse,
          htmlLength: finalHtml.length,
          cssLength: finalCss.length,
          hasHtml: !!finalHtml,
        });

        // Clear any existing content in container
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
            coeditingEnabled: false,
            notifications: {
              info: console.info,
              error: (message, id, params) => {
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

        console.log(
          "[StripoEditorCustomized] Stripo editor initialized successfully",
        );

        // Store cleanup function if available
        if (editorInstance && typeof editorInstance.destroy === "function") {
          cleanupRef.current = () => {
            try {
              editorInstance.destroy();
            } catch (error) {
              console.error(
                "[StripoEditorCustomized] Error destroying editor:",
                error,
              );
            }
          };
        }

        setLoadingState("loaded");

        // Inject styles into editor's DOM after initialization
        // Stripo might load in shadow DOM or iframe, so we need to find and inject styles there
        const injectStylesIntoEditor = () => {
          try {
            const container = containerRef.current;
            if (!container) return;

            // Try multiple times with increasing delays to catch the editor when it's ready
            const tryInject = (attempt = 1) => {
              if (attempt > 5) {
                console.warn(
                  "[StripoEditorCustomized] Max attempts reached for style injection",
                );
                return;
              }

              setTimeout(() => {
                // Look for shadow DOM
                const uiEditor = container.querySelector("ui-editor");
                if (uiEditor && uiEditor.shadowRoot) {
                  const existingStyle = uiEditor.shadowRoot.querySelector(
                    "#stripo-custom-styles",
                  );
                  if (!existingStyle) {
                    const styleElement = document.createElement("style");
                    styleElement.id = "stripo-custom-styles";
                    styleElement.textContent = `
                      /* Customize toolbar buttons - try multiple selectors */
                      button.ue-toolbar-button,
                      .ue-toolbar-button,
                      [class*="toolbar-button"],
                      [class*="ue-button"],
                      button[class*="button"] {
                        background-color: #4f46e5 !important;
                        color: #ffffff !important;
                        border-radius: 0.375rem !important;
                        padding: 0.35rem 0.75rem !important;
                        transition: background-color 0.2s ease !important;
                        font-weight: 500 !important;
                        border: none !important;
                      }
                      
                      button.ue-toolbar-button:hover,
                      .ue-toolbar-button:hover,
                      [class*="toolbar-button"]:hover {
                        background-color: #4338ca !important;
                      }
                      
                      button.ue-toolbar-button:active,
                      .ue-toolbar-button:active,
                      [class*="toolbar-button"]:active {
                        background-color: #3730a3 !important;
                      }
                      
                      /* Customize toolbar container */
                      .ue-toolbar,
                      [class*="toolbar"] {
                        background-color: #f9fafb !important;
                        border-bottom: 1px solid #e5e7eb !important;
                        padding: 0.5rem !important;
                      }
                    `;
                    uiEditor.shadowRoot.appendChild(styleElement);
                    console.log(
                      "[StripoEditorCustomized] Styles injected into shadow DOM",
                    );
                  }
                }

                // Try injecting into iframe
                const iframe = container.querySelector("iframe");
                if (
                  iframe &&
                  iframe.contentDocument &&
                  iframe.contentDocument.head
                ) {
                  const existingIframeStyle =
                    iframe.contentDocument.querySelector(
                      "#stripo-custom-styles",
                    );
                  if (!existingIframeStyle) {
                    const iframeStyle =
                      iframe.contentDocument.createElement("style");
                    iframeStyle.id = "stripo-custom-styles";
                    iframeStyle.textContent = `
                      button, .ue-toolbar-button, [class*="button"] {
                        background-color: #4f46e5 !important;
                        color: #ffffff !important;
                        border-radius: 0.375rem !important;
                        padding: 0.35rem 0.75rem !important;
                      }
                      button:hover, .ue-toolbar-button:hover {
                        background-color: #4338ca !important;
                      }
                      .ue-toolbar, [class*="toolbar"] {
                        background-color: #f9fafb !important;
                        border-bottom: 1px solid #e5e7eb !important;
                        padding: 0.5rem !important;
                      }
                    `;
                    iframe.contentDocument.head.appendChild(iframeStyle);
                    console.log(
                      "[StripoEditorCustomized] Styles injected into iframe",
                    );
                  }
                }

                // Also try to find and style toolbar elements directly
                const allButtons = container.querySelectorAll(
                  'button, [class*="button"], [class*="toolbar"]',
                );
                allButtons.forEach((btn) => {
                  const element = btn as HTMLElement;
                  if (element.style) {
                    element.style.setProperty(
                      "background-color",
                      "#4f46e5",
                      "important",
                    );
                    element.style.setProperty("color", "#ffffff", "important");
                    element.style.setProperty(
                      "border-radius",
                      "0.375rem",
                      "important",
                    );
                    element.style.setProperty(
                      "padding",
                      "0.35rem 0.75rem",
                      "important",
                    );
                  }
                });

                // If styles weren't injected, try again
                const shadowStyle = uiEditor?.shadowRoot?.querySelector(
                  "#stripo-custom-styles",
                );
                const iframeStyle = iframe?.contentDocument?.querySelector(
                  "#stripo-custom-styles",
                );
                if (!shadowStyle && !iframeStyle && attempt < 5) {
                  tryInject(attempt + 1);
                }
              }, attempt * 1000); // Try every second
            };

            tryInject(1);
          } catch (error) {
            console.warn(
              "[StripoEditorCustomized] Error injecting styles into editor:",
              error,
            );
          }
        };

        injectStylesIntoEditor();

        // Poll for StripoEditorApi to be available
        let editorReadyCheckInterval: ReturnType<typeof setInterval> | null =
          null;
        editorReadyCheckInterval = setInterval(() => {
          const isReady = checkEditorReady();

          if (isReady) {
            console.log("[StripoEditorCustomized] Editor API is ready");
            // Try injecting styles again once API is ready
            injectStylesIntoEditor();

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
          "[StripoEditorCustomized] Error initializing Stripo editor:",
          error,
        );
        setErrorMessage(errorMsg);
        setLoadingState("error");
      }
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

          // Also inject styles directly into document head as immediate fallback
          // This ensures styles are available even if extension registration has timing issues
          const styleId = "stripo-custom-extension-styles";
          if (!document.getElementById(styleId)) {
            const styleElement = document.createElement("style");
            styleElement.id = styleId;
            styleElement.textContent = `
              /* Customize toolbar buttons - use multiple selectors to catch all variations */
              button.ue-toolbar-button,
              .ue-toolbar-button,
              button[class*="toolbar"],
              button[class*="button"],
              [class*="ue-toolbar"] button,
              [class*="toolbar"] button {
                background-color: #4f46e5 !important;
                color: #ffffff !important;
                border-radius: 0.375rem !important;
                padding: 0.35rem 0.75rem !important;
                transition: background-color 0.2s ease !important;
                font-weight: 500 !important;
                border: none !important;
              }
              
              button.ue-toolbar-button:hover,
              .ue-toolbar-button:hover,
              button[class*="toolbar"]:hover,
              button[class*="button"]:hover {
                background-color: #4338ca !important;
              }
              
              button.ue-toolbar-button:active,
              .ue-toolbar-button:active,
              button[class*="toolbar"]:active,
              button[class*="button"]:active {
                background-color: #3730a3 !important;
              }
              
              /* Customize toolbar container */
              .ue-toolbar,
              [class*="ue-toolbar"],
              [class*="toolbar"]:not(button) {
                background-color: #f9fafb !important;
                border-bottom: 1px solid #e5e7eb !important;
                padding: 0.5rem !important;
              }
              
              /* Customize blocks panel */
              .block-panel-content,
              [class*="block-panel"] {
                background-color: #ffffff !important;
              }
              
              /* Customize panel headers */
              .ue-panel-header,
              [class*="panel-header"] {
                background-color: #1f2937 !important;
                color: #f9fafb !important;
                font-weight: 600 !important;
                padding: 0.75rem 1rem !important;
              }
              
              /* Customize control panels */
              .ue-control-panel,
              [class*="control-panel"] {
                background-color: #ffffff !important;
                border-left: 1px solid #e5e7eb !important;
              }
              
              /* Customize icon buttons */
              .ue-icon-button,
              button[class*="icon"],
              [class*="icon-button"] {
                color: #4f46e5 !important;
              }
              
              .ue-icon-button:hover,
              button[class*="icon"]:hover,
              [class*="icon-button"]:hover {
                background-color: #eef2ff !important;
                color: #4338ca !important;
              }
            `;
            document.head.appendChild(styleElement);
            console.log(
              "[StripoEditorCustomized] Custom styles injected into document head",
            );
          }

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
          "[StripoEditorCustomized] Stripo script loaded successfully",
        );
        setTimeout(() => {
          if (window.UIEditor) {
            initStripoEditor();
          } else {
            console.error(
              "[StripoEditorCustomized] UIEditor not found after script load",
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
    loadZoneJs()
      .then(() => {
        console.log(
          "[StripoEditorCustomized] zone.js ready, loading Stripo...",
        );
        loadStripoScript();
      })
      .catch((error) => {
        console.warn("[StripoEditorCustomized] Failed to load zone.js:", error);
        console.warn("[StripoEditorCustomized] Proceeding without zone.js");
        loadStripoScript();
      });

    return () => {
      console.log("[StripoEditorCustomized] Cleaning up...");

      if (zoneCheckIntervalRef.current) {
        clearInterval(zoneCheckIntervalRef.current);
        zoneCheckIntervalRef.current = null;
      }
      if (uiEditorCheckIntervalRef.current) {
        clearInterval(uiEditorCheckIntervalRef.current);
        uiEditorCheckIntervalRef.current = null;
      }

      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }

      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }

      editorInitializedRef.current = false;
      scriptLoadedRef.current = false;
    };
  }, []);

  return (
    <div className="w-full h-[600px] relative" style={{ minHeight: "600px" }}>
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
            <button
              type="button"
              onClick={() => {
                setLoadingState("idle");
                setErrorMessage(null);
                scriptLoadedRef.current = false;
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
