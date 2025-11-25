"use client";

import { useState, useEffect } from "react";
import { Container } from "@/components/container";
import { StripoEditor } from "@/components/stripo-editor";
import { TemplateSelector } from "@/components/template-selector";
import type { StripoTemplate } from "@/lib/stripo-templates";

export default function EditorPage() {
  const [selectedTemplate, setSelectedTemplate] = useState<StripoTemplate | null>(null);
  const [templateHtml, setTemplateHtml] = useState<string | undefined>(undefined);
  const [templateCss, setTemplateCss] = useState<string | undefined>(undefined);
  const [loadingTemplate, setLoadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState<string | null>(null);
  const [templateKey, setTemplateKey] = useState(0); // Key to force editor remount

  // Log state changes for debugging
  useEffect(() => {
    console.log("[EditorPage] State changed:", {
      selectedTemplate: selectedTemplate?.name || "null",
      templateId: selectedTemplate?.templateId || "null",
      loadingTemplate,
      hasHtml: templateHtml !== undefined,
      htmlLength: templateHtml?.length || 0,
      hasCss: templateCss !== undefined,
      cssLength: templateCss?.length || 0,
      templateKey,
    });
  }, [selectedTemplate, templateHtml, templateCss, loadingTemplate, templateKey]);

  useEffect(() => {
    async function loadTemplateContent(template: StripoTemplate) {
      console.log("[EditorPage] loadTemplateContent called:", {
        templateId: template?.templateId,
        templateName: template?.name,
      });

      if (!template || template.templateId === "blank") {
        console.log("[EditorPage] Blank template selected, clearing HTML/CSS");
        setTemplateHtml(undefined);
        setTemplateCss(undefined);
        setTemplateKey((prev) => prev + 1); // Force remount with blank template
        return;
      }

      console.log("[EditorPage] Setting loadingTemplate to TRUE");
      setLoadingTemplate(true);
      setTemplateError(null); // Clear any previous errors
      const fetchStartTime = Date.now();
      const fetchUrl = `/api/stripo/templates/${template.templateId}`;
      console.log("[EditorPage] Fetching template from:", fetchUrl);

      try {
        console.log("[EditorPage] Starting fetch request...");
        
        // Add timeout to detect hanging requests
        const fetchPromise = fetch(fetchUrl);
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error("Fetch timeout after 30 seconds")), 30000)
        );
        
        const response = await Promise.race([fetchPromise, timeoutPromise]) as Response;
        const fetchDuration = Date.now() - fetchStartTime;
        console.log("[EditorPage] Fetch completed in", fetchDuration, "ms");
        
        console.log("[EditorPage] Template fetch response:", {
          status: response.status,
          ok: response.ok,
        });
        
        if (!response.ok) {
          const errorText = await response.text().catch(() => `HTTP ${response.status}`);
          let errorData;
          try {
            errorData = JSON.parse(errorText);
          } catch {
            errorData = { message: errorText };
          }
          
          const isFallbackTemplate = template.templateId.startsWith("blank") || 
                                     template.templateId.includes("basic") || 
                                     template.templateId.includes("newsletter") ||
                                     template.templateId.includes("promotional") ||
                                     template.templateId.includes("transactional") ||
                                     template.templateId.includes("welcome") ||
                                     template.templateId.includes("announcement");
          
          console.error("[EditorPage] ✗ Failed to fetch template content:", {
            status: response.status,
            statusText: response.statusText,
            errorText,
            errorData,
            templateId: template.templateId,
            templateName: template.name,
            isFallbackTemplate,
          });
          
          // Show error message to user
          const errorMessage = isFallbackTemplate
            ? `Fallback template "${template.name}" doesn't have a valid Stripo templateId. Please select a template from the Stripo API.`
            : `Failed to load template: ${errorData?.message || errorData?.details || errorText || `HTTP ${response.status}`}`;
          
          setTemplateError(errorMessage);
          setTemplateHtml(undefined);
          setTemplateCss(undefined);
          setLoadingTemplate(false);
          
          // Don't return early - let the error state show
          return;
        }

        const data = await response.json();
        
        console.log("[EditorPage] Template data received:", {
          hasError: !!data.error,
          error: data.error,
          hasHtml: !!data.html,
          htmlLength: data.html?.length || 0,
          hasCss: !!data.css,
          cssLength: data.css?.length || 0,
          htmlPreview: data.html?.substring(0, 100) || "",
        });
        
        if (data.error) {
          console.error("[EditorPage] Template fetch error:", data.error);
          setTemplateError(`Template error: ${data.error}${data.details ? ` - ${data.details}` : ""}`);
          setTemplateHtml(undefined);
          setTemplateCss(undefined);
          setLoadingTemplate(false);
          return;
        }

        const html = data.html || "";
        const css = data.css || "";

        console.log("[EditorPage] Setting template HTML/CSS:", {
          htmlLength: html.length,
          cssLength: css.length,
          willIncrementKey: true,
        });

        console.log("[EditorPage] About to set state - HTML length:", html.length, "CSS length:", css.length);
        setTemplateHtml(html);
        setTemplateCss(css);
        console.log("[EditorPage] State set - HTML and CSS should now be available");
        
        setTemplateKey((prev) => {
          const newKey = prev + 1;
          console.log("[EditorPage] Incrementing templateKey:", { prev, newKey });
          return newKey;
        });
        console.log("[EditorPage] TemplateKey incremented, editor should remount");
      } catch (error) {
        console.error("[EditorPage] Error loading template:", {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          templateId: template.templateId,
        });
        setTemplateError(`Failed to load template: ${error instanceof Error ? error.message : String(error)}`);
        setTemplateHtml(undefined);
        setTemplateCss(undefined);
      } finally {
        const totalDuration = Date.now() - fetchStartTime;
        console.log("[EditorPage] Setting loadingTemplate to FALSE (total duration:", totalDuration, "ms)");
        setLoadingTemplate(false);
        console.log("[EditorPage] Template loading finished - loadingTemplate should now be false");
      }
    }

    if (selectedTemplate) {
      console.log("[EditorPage] Template selected, loading content:", {
        templateId: selectedTemplate.templateId,
        templateName: selectedTemplate.name,
      });
      loadTemplateContent(selectedTemplate);
    } else {
      console.log("[EditorPage] No template selected, clearing HTML/CSS");
      setTemplateHtml(undefined);
      setTemplateCss(undefined);
      setTemplateKey((prev) => prev + 1);
    }
  }, [selectedTemplate]);

  const handleTemplateSelect = (template: StripoTemplate | null) => {
    console.log("[EditorPage] handleTemplateSelect called:", {
      template: template ? { id: template.templateId, name: template.name } : "null",
      currentSelectedTemplate: selectedTemplate?.templateId || "null",
    });
    setSelectedTemplate(template);
    console.log("[EditorPage] selectedTemplate state updated");
  };

  return (
    <Container>
      <div className="flex flex-col gap-4">
        <div className="mb-4">
          <h1 className="text-2xl font-bold mb-2">Stripo Email Editor</h1>
          <p className="text-gray-600 mb-4">
            Select a Stripo default template or create a new email template.
          </p>
          <TemplateSelector
            onTemplateSelect={handleTemplateSelect}
            selectedTemplateId={selectedTemplate?.templateId || null}
          />
          {loadingTemplate && (
            <div className="text-sm text-gray-500 mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="font-semibold">⏳ Loading template...</p>
              <p className="text-xs mt-1">
                Selected: {selectedTemplate?.name || "Unknown"} ({selectedTemplate?.templateId || "N/A"})
              </p>
            </div>
          )}
          {templateError && (
            <div className="text-sm text-red-600 mt-2 p-2 bg-red-50 border border-red-200 rounded">
              <p className="font-semibold">❌ Template Loading Error</p>
              <p className="text-xs mt-1">{templateError}</p>
              <button
                type="button"
                onClick={() => {
                  setTemplateError(null);
                  if (selectedTemplate) {
                    // Retry loading
                    setSelectedTemplate(null);
                    setTimeout(() => setSelectedTemplate(selectedTemplate), 100);
                  }
                }}
                className="mt-2 px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          )}
          {!loadingTemplate && !templateError && selectedTemplate && !templateHtml && selectedTemplate.templateId !== "blank" && (
            <div className="text-sm text-amber-600 mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
              <p className="font-semibold">⚠️ Template selected but HTML not loaded</p>
              <p className="text-xs mt-1">
                Template: {selectedTemplate.name} ({selectedTemplate.templateId})
              </p>
            </div>
          )}
        </div>
        <StripoEditor
          key={templateKey} // Force remount when template changes
          html={templateHtml}
          css={templateCss}
          createHelloWorldTemplate={!selectedTemplate || selectedTemplate.templateId === "blank"}
        />
        {/* Debug info */}
        {process.env.NODE_ENV === "development" && (
          <div className="mt-2 p-2 bg-gray-100 rounded text-xs">
            <div>Template Key: {templateKey}</div>
            <div>Has HTML: {templateHtml ? `Yes (${templateHtml.length} chars)` : "No"}</div>
            <div>Has CSS: {templateCss ? `Yes (${templateCss.length} chars)` : "No"}</div>
            <div>Selected Template: {selectedTemplate?.name || "None"}</div>
            <div>Create Hello World: {(!selectedTemplate || selectedTemplate.templateId === "blank") ? "Yes" : "No"}</div>
          </div>
        )}
      </div>
    </Container>
  );
}
