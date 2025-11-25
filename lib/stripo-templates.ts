// Predefined Stripo default templates as fallback
// These are common template names/categories that Stripo provides
export interface StripoTemplate {
  templateId: string;
  name: string;
  description?: string;
  category?: string;
}

// Fallback templates if API is unavailable
// Note: These are placeholder template IDs - actual template IDs would need to be obtained from Stripo
export const FALLBACK_TEMPLATES: StripoTemplate[] = [
  {
    templateId: "blank",
    name: "Blank Template",
    description: "Start with a blank canvas",
    category: "Basic",
  },
  {
    templateId: "newsletter-basic",
    name: "Basic Newsletter",
    description: "Simple newsletter template",
    category: "Newsletter",
  },
  {
    templateId: "promotional-basic",
    name: "Basic Promotional",
    description: "Simple promotional email template",
    category: "Promotional",
  },
  {
    templateId: "transactional-basic",
    name: "Basic Transactional",
    description: "Simple transactional email template",
    category: "Transactional",
  },
  {
    templateId: "welcome-email",
    name: "Welcome Email",
    description: "Welcome new users template",
    category: "Transactional",
  },
  {
    templateId: "announcement",
    name: "Announcement",
    description: "Announcement email template",
    category: "Newsletter",
  },
];

// Fetch templates from API with fallback
export async function fetchStripoTemplates(): Promise<{
  templates: StripoTemplate[];
  error?: string;
}> {
  try {
    const response = await fetch(
      "/api/stripo/templates?type=FREE&limit=50&sort=NEW&page=0",
    );

    if (!response.ok) {
      console.warn(
        "[TemplateSelector] API request failed, using fallback templates",
      );
      return {
        templates: FALLBACK_TEMPLATES,
        error: `API request failed: ${response.status}`,
      };
    }

    const data = await response.json();

    if (data.error || !data.templates || data.templates.length === 0) {
      console.warn("[TemplateSelector] No templates from API, using fallback");
      return {
        templates: FALLBACK_TEMPLATES,
        error: data.error || "No templates available",
      };
    }

    return {
      templates: data.templates,
    };
  } catch (error) {
    console.error("[TemplateSelector] Error fetching templates:", error);
    return {
      templates: FALLBACK_TEMPLATES,
      error:
        error instanceof Error ? error.message : "Failed to fetch templates",
    };
  }
}
