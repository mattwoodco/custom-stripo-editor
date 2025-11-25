"use client";

import { useEffect, useState } from "react";
import { fetchStripoTemplates, type StripoTemplate } from "@/lib/stripo-templates";

interface TemplateSelectorProps {
  onTemplateSelect?: (template: StripoTemplate | null) => void;
  selectedTemplateId?: string | null;
}

export function TemplateSelector({
  onTemplateSelect,
  selectedTemplateId,
}: TemplateSelectorProps) {
  const [templates, setTemplates] = useState<StripoTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string>(selectedTemplateId || "");

  useEffect(() => {
    async function loadTemplates() {
      setLoading(true);
      setError(null);

      try {
        const result = await fetchStripoTemplates();
        setTemplates(result.templates);
        
        if (result.error) {
          setError(result.error);
          console.warn("[TemplateSelector] Using fallback templates:", result.error);
        }
      } catch (err) {
        console.error("[TemplateSelector] Error loading templates:", err);
        setError(err instanceof Error ? err.message : "Failed to load templates");
      } finally {
        setLoading(false);
      }
    }

    loadTemplates();
  }, []);

  useEffect(() => {
    if (selectedTemplateId !== undefined) {
      setSelectedId(selectedTemplateId || "");
    }
  }, [selectedTemplateId]);

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const templateId = event.target.value;
    setSelectedId(templateId);

    if (templateId === "") {
      onTemplateSelect?.(null);
      return;
    }

    const selectedTemplate = templates.find((t) => t.templateId === templateId);
    onTemplateSelect?.(selectedTemplate || null);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <label htmlFor="template-select" className="text-sm font-medium text-gray-700">
          Template:
        </label>
        <div className="flex items-center gap-2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
          <span className="text-sm text-gray-500">Loading templates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor="template-select" className="text-sm font-medium text-gray-700">
          Stripo Default Templates:
        </label>
        <select
          id="template-select"
          value={selectedId}
          onChange={handleChange}
          className="px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm min-w-[200px]"
        >
          <option value="">-- Select a template --</option>
          {templates.map((template) => (
            <option key={template.templateId} value={template.templateId}>
              {template.name}
              {template.category ? ` (${template.category})` : ""}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="text-xs text-amber-600">
          ⚠ Using fallback templates: {error}
        </p>
      )}
      {selectedId && (
        <p className="text-xs text-gray-500">
          Selected: {templates.find((t) => t.templateId === selectedId)?.name || selectedId}
        </p>
      )}
    </div>
  );
}

