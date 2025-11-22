"use client";

import { useEffect, useRef, useState } from "react";

interface StripoEditorSimpleProps {
  emailId?: string;
  html?: string;
  css?: string;
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

export function StripoEditorSimple({
  emailId,
  html,
  css,
  mergeTags = [],
}: StripoEditorSimpleProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loadingState, setLoadingState] = useState<LoadingState>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const scriptsLoadedRef = useRef(false);
  const stripoOpenedOnceRef = useRef(false);

  useEffect(() => {
    if (scriptsLoadedRef.current || stripoOpenedOnceRef.current) return;

    setLoadingState("loading");
    setErrorMessage(null);

    const initEditor = async () => {
      // Wait for container to be available and visible
      let attempts = 0;
      const maxAttempts = 50;
      while (attempts < maxAttempts) {
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect();
          const styles = window.getComputedStyle(containerRef.current);
          const isVisible =
            styles.display !== "none" &&
            styles.visibility !== "hidden" &&
            styles.opacity !== "0" &&
            rect.width > 0 &&
            rect.height > 0;

          if (isVisible) {
            break;
          }
        }
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (!containerRef.current) {
        setErrorMessage("Editor container not available");
        setLoadingState("error");
        return;
      }

      // Ensure container has dimensions
      const rect = containerRef.current.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        containerRef.current.style.width = "100%";
        containerRef.current.style.height = "800px";
        containerRef.current.style.minHeight = "800px";
      }

      // Scroll container into view (Stripo may require this)
      containerRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
      });
      await new Promise((resolve) => setTimeout(resolve, 300));

      if (!window.UIEditor || typeof window.UIEditor.initEditor !== "function") {
        setErrorMessage("UIEditor not available");
        setLoadingState("error");
        return;
      }

      // Generate emailId if not provided
      const emailIdToUse =
        emailId || `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Initialize Stripo editor
      try {
        console.log("[StripoEditor] Initializing editor with config:", {
          emailId: emailIdToUse,
          hasHtml: !!html,
          hasCss: !!css,
          mergeTagsCount: mergeTags.length,
          containerExists: !!containerRef.current,
        });

        window.UIEditor.initEditor(containerRef.current, {
          metadata: {
            emailId: emailIdToUse,
          },
          html: html || '<div></div>',
          css: css || '',
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

        console.log("[StripoEditor] initEditor called successfully");
        stripoOpenedOnceRef.current = true;
        setLoadingState("loaded");
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Failed to initialize editor";
        console.error("[StripoEditor] Initialization error:", error);
        setErrorMessage(errorMsg);
        setLoadingState("error");
      }
    };

    // Load UIEditor script
    const loadUIEditor = (): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if already loaded
        if (window.UIEditor && typeof window.UIEditor.initEditor === "function") {
          console.log("[StripoEditor] UIEditor already loaded");
          resolve();
          return;
        }

        // Check if script tag already exists
        if (document.getElementById("UiEditorScript")) {
          // Script is loading, wait for it
          let attempts = 0;
          const maxAttempts = 50;
          const check = () => {
            if (
              window.UIEditor &&
              typeof window.UIEditor.initEditor === "function"
            ) {
              resolve();
            } else if (attempts >= maxAttempts) {
              reject(new Error("UIEditor not available after script load"));
            } else {
              attempts++;
              setTimeout(check, 100);
            }
          };
          check();
          return;
        }

        console.log("[StripoEditor] Loading UIEditor script...");
        const script = document.createElement("script");
        script.id = "UiEditorScript";
        script.type = "module";
        script.src =
          "https://plugins.stripo.email/resources/uieditor/rev/2.21.0/UIEditor.js";
        script.async = true;

        script.onload = () => {
          console.log("[StripoEditor] UIEditor script loaded, waiting for UIEditor object...");
          // Wait for UIEditor to be available
          let attempts = 0;
          const maxAttempts = 50;

          const check = () => {
            if (
              window.UIEditor &&
              typeof window.UIEditor.initEditor === "function"
            ) {
              console.log("[StripoEditor] UIEditor object is now available");
              resolve();
            } else if (attempts >= maxAttempts) {
              console.error("[StripoEditor] UIEditor not available after script load", {
                attempts,
                hasUIEditor: typeof window.UIEditor !== "undefined",
                hasInitEditor: typeof window.UIEditor?.initEditor === "function",
              });
              reject(new Error("UIEditor not available after script load"));
            } else {
              attempts++;
              setTimeout(check, 100);
            }
          };

          check();
        };

        script.onerror = (error) => {
          console.error("[StripoEditor] Failed to load UIEditor script", error);
          reject(new Error("Failed to load UIEditor script"));
        };
        document.head.appendChild(script);
      });
    };

    // Load scripts and initialize
    const loadAndInit = async () => {
      try {
        console.log("[StripoEditor] Starting loadAndInit...");
        
        console.log("[StripoEditor] Loading UIEditor...");
        await loadUIEditor();
        console.log("[StripoEditor] UIEditor loaded");
        
        // Small delay to ensure everything is ready
        console.log("[StripoEditor] Waiting 300ms before initialization...");
        await new Promise((resolve) => setTimeout(resolve, 300));
        
        console.log("[StripoEditor] Initializing editor...");
        await initEditor();
        scriptsLoadedRef.current = true;
        console.log("[StripoEditor] Initialization complete");
      } catch (error) {
        const errorMsg =
          error instanceof Error ? error.message : "Failed to load editor";
        console.error("[StripoEditor] Load error:", error);
        setErrorMessage(errorMsg);
        setLoadingState("error");
      }
    };

    loadAndInit();

    // Cleanup
    return () => {
      const existingScript = document.querySelector("#UiEditorScript");
      if (existingScript?.parentNode) {
        existingScript.parentNode.removeChild(existingScript);
      }
      scriptsLoadedRef.current = false;
    };
  }, [emailId, html, css, mergeTags]);

  return (
    <div className="w-full relative" style={{ height: "800px", minHeight: "800px" }}>
      {loadingState === "loading" ? (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-50 bg-opacity-90 z-10">
          <div className="flex flex-col items-center gap-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            <p className="text-sm text-gray-600">Loading Stripo Editor...</p>
          </div>
        </div>
      ) : null}
      {loadingState === "error" && errorMessage && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 bg-opacity-90 z-10">
          <div className="flex flex-col items-center gap-2 max-w-md p-4">
            <div className="text-red-600 font-semibold">Error Loading Editor</div>
            <p className="text-sm text-red-700 text-center">{errorMessage}</p>
            <button
              type="button"
              onClick={() => {
                setLoadingState("idle");
                setErrorMessage(null);
                scriptsLoadedRef.current = false;
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
      <div
        ref={containerRef}
        id="stripo-editor-container"
        className="w-full h-full"
        style={{
          width: "100%",
          height: "800px",
          minHeight: "800px",
          display: "block",
          position: "relative",
        }}
      />
    </div>
  );
}
