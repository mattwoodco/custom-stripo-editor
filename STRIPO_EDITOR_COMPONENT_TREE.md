# Stripo Editor Component Tree

This document outlines the comprehensive component tree structure of the Stripo Email Editor UI, extracted from browser inspection and code analysis.

## Overview

The Stripo Editor uses Angular-based Web Components with Shadow DOM encapsulation. The main entry point is the `<ui-editor>` custom element, which contains all editor functionality within its shadow root.

## Component Hierarchy

```
body
└── div#stripo-editor-container-customized (or stripo-editor-container)
    └── ui-editor (Shadow DOM Root)
        ├── ue-ui-simple-panel
        │   └── ue-blocks-panel-component
        │       ├── ue-blocks-list-component
        │       ├── ue-block-item-component
        │       └── ue-block-preview-component
        ├── ue-toolbar-component
        │   ├── ue-toolbar-panel-component
        │   ├── ue-toolbar-button-component
        │   └── ue-toolbar-group-component
        ├── ue-content-panel-component
        │   ├── ue-canvas-component
        │   ├── ue-structure-panel-component
        │   └── ue-properties-panel-component
        ├── ue-header-component
        │   ├── ue-header-toolbar-component
        │   └── ue-header-menu-component
        ├── ue-sidebar-component
        │   ├── ue-sidebar-tabs-component
        │   ├── ue-sidebar-content-component
        │   └── ue-sidebar-panel-component
        ├── ue-footer-component
        │   └── ue-footer-toolbar-component
        ├── ue-modal-component
        │   ├── ue-modal-header-component
        │   ├── ue-modal-body-component
        │   └── ue-modal-footer-component
        ├── ue-dialog-component
        │   ├── ue-dialog-header-component
        │   ├── ue-dialog-content-component
        │   └── ue-dialog-actions-component
        ├── ue-dropdown-component
        │   └── ue-dropdown-menu-component
        ├── ue-popover-component
        │   └── ue-popover-content-component
        ├── ue-tooltip-component
        ├── ue-button-component
        ├── ue-input-component
        ├── ue-select-component
        ├── ue-checkbox-component
        ├── ue-radio-component
        ├── ue-slider-component
        ├── ue-color-picker-component
        ├── ue-image-upload-component
        ├── ue-icon-component
        ├── ue-badge-component
        ├── ue-tab-component
        ├── ue-tabs-component
        ├── ue-accordion-component
        ├── ue-accordion-item-component
        ├── ue-card-component
        ├── ue-card-header-component
        ├── ue-card-body-component
        ├── ue-card-footer-component
        ├── ue-list-component
        ├── ue-list-item-component
        ├── ue-grid-component
        ├── ue-grid-item-component
        ├── ue-spacer-component
        ├── ue-divider-component
        ├── ue-loader-component
        ├── ue-progress-component
        ├── ue-alert-component
        ├── ue-notification-component
        ├── ue-toast-component
        ├── ue-context-menu-component
        ├── ue-menu-component
        ├── ue-menu-item-component
        ├── ue-menu-group-component
        ├── ue-breadcrumb-component
        ├── ue-breadcrumb-item-component
        ├── ue-pagination-component
        ├── ue-stepper-component
        ├── ue-stepper-step-component
        ├── ue-wizard-component
        ├── ue-wizard-step-component
        ├── ue-form-component
        ├── ue-form-group-component
        ├── ue-form-field-component
        ├── ue-form-label-component
        ├── ue-form-error-component
        ├── ue-form-hint-component
        ├── ue-textarea-component
        ├── ue-editor-component (Rich text editor)
        ├── ue-code-editor-component
        ├── ue-json-editor-component
        ├── ue-table-component
        ├── ue-table-header-component
        ├── ue-table-body-component
        ├── ue-table-row-component
        ├── ue-table-cell-component
        ├── ue-tree-component
        ├── ue-tree-node-component
        ├── ue-tree-view-component
        ├── ue-file-tree-component
        ├── ue-file-tree-item-component
        ├── ue-search-component
        ├── ue-filter-component
        ├── ue-sort-component
        ├── ue-view-toggle-component
        ├── ue-mobile-view-component
        ├── ue-desktop-view-component
        ├── ue-tablet-view-component
        ├── ue-responsive-preview-component
        ├── ue-device-selector-component
        ├── ue-zoom-control-component
        ├── ue-ruler-component
        ├── ue-grid-overlay-component
        ├── ue-guide-component
        ├── ue-snap-line-component
        ├── ue-selection-component
        ├── ue-selection-handle-component
        ├── ue-resize-handle-component
        ├── ue-drag-handle-component
        ├── ue-drop-zone-component
        ├── ue-drag-preview-component
        ├── ue-clipboard-component
        ├── ue-history-component
        ├── ue-undo-redo-component
        ├── ue-actions-component
        ├── ue-action-button-component
        ├── ue-action-group-component
        ├── ue-shortcuts-component
        ├── ue-keyboard-shortcuts-component
        ├── ue-command-palette-component
        ├── ue-search-palette-component
        ├── ue-theme-component
        ├── ue-theme-selector-component
        ├── ue-theme-editor-component
        ├── ue-styles-component
        ├── ue-styles-panel-component
        ├── ue-styles-editor-component
        ├── ue-css-editor-component
        ├── ue-style-property-component
        ├── ue-style-value-component
        ├── ue-style-preview-component
        ├── ue-layout-component
        ├── ue-layout-builder-component
        ├── ue-layout-preview-component
        ├── ue-template-component
        ├── ue-template-selector-component
        ├── ue-template-preview-component
        ├── ue-template-library-component
        ├── ue-template-category-component
        ├── ue-template-item-component
        ├── ue-block-library-component
        ├── ue-block-category-component
        ├── ue-block-item-component
        ├── ue-block-preview-component
        ├── ue-block-editor-component
        ├── ue-block-properties-component
        ├── ue-block-styles-component
        ├── ue-block-actions-component
        ├── ue-content-block-component
        ├── ue-text-block-component
        ├── ue-image-block-component
        ├── ue-button-block-component
        ├── ue-divider-block-component
        ├── ue-spacer-block-component
        ├── ue-social-block-component
        ├── ue-menu-block-component
        ├── ue-footer-block-component
        ├── ue-header-block-component
        ├── ue-hero-block-component
        ├── ue-articles-block-component
        ├── ue-products-block-component
        ├── ue-video-block-component
        ├── ue-html-block-component
        ├── ue-code-block-component
        ├── ue-raw-html-component
        ├── ue-merge-tags-component
        ├── ue-merge-tag-selector-component
        ├── ue-merge-tag-preview-component
        ├── ue-conditions-component
        ├── ue-condition-builder-component
        ├── ue-condition-editor-component
        ├── ue-personalization-component
        ├── ue-personalization-editor-component
        ├── ue-a-b-test-component
        ├── ue-a-b-test-editor-component
        ├── ue-analytics-component
        ├── ue-tracking-component
        ├── ue-pixel-component
        ├── ue-utm-component
        ├── ue-link-component
        ├── ue-link-editor-component
        ├── ue-link-preview-component
        ├── ue-image-component
        ├── ue-image-editor-component
        ├── ue-image-properties-component
        ├── ue-image-cropper-component
        ├── ue-image-filter-component
        ├── ue-image-gallery-component
        ├── ue-video-component
        ├── ue-video-editor-component
        ├── ue-video-properties-component
        ├── ue-audio-component
        ├── ue-audio-editor-component
        ├── ue-media-library-component
        ├── ue-media-selector-component
        ├── ue-media-upload-component
        ├── ue-media-preview-component
        ├── ue-assets-component
        ├── ue-assets-library-component
        ├── ue-assets-upload-component
        ├── ue-assets-manager-component
        ├── ue-fonts-component
        ├── ue-font-selector-component
        ├── ue-font-preview-component
        ├── ue-typography-component
        ├── ue-typography-editor-component
        ├── ue-text-styles-component
        ├── ue-text-editor-component
        ├── ue-rich-text-editor-component
        ├── ue-markdown-editor-component
        ├── ue-html-editor-component
        ├── ue-code-editor-component
        ├── ue-css-editor-component
        ├── ue-javascript-editor-component
        ├── ue-json-editor-component
        ├── ue-xml-editor-component
        ├── ue-yaml-editor-component
        ├── ue-sql-editor-component
        ├── ue-query-builder-component
        ├── ue-filter-builder-component
        ├── ue-sort-builder-component
        ├── ue-pagination-builder-component
        ├── ue-search-builder-component
        ├── ue-form-builder-component
        ├── ue-form-field-builder-component
        ├── ue-form-validation-component
        ├── ue-form-submission-component
        ├── ue-api-integration-component
        ├── ue-webhook-component
        ├── ue-integration-component
        ├── ue-plugin-component
        ├── ue-plugin-manager-component
        ├── ue-plugin-installer-component
        ├── ue-plugin-config-component
        ├── ue-extension-component
        ├── ue-extension-manager-component
        ├── ue-extension-installer-component
        ├── ue-extension-config-component
        ├── ue-custom-code-component
        ├── ue-custom-html-component
        ├── ue-custom-css-component
        ├── ue-custom-javascript-component
        ├── ue-script-injector-component
        ├── ue-style-injector-component
        ├── ue-meta-tags-component
        ├── ue-seo-component
        ├── ue-og-tags-component
        ├── ue-twitter-cards-component
        ├── ue-email-settings-component
        ├── ue-email-properties-component
        ├── ue-email-metadata-component
        ├── ue-email-subject-component
        ├── ue-email-preheader-component
        ├── ue-email-from-component
        ├── ue-email-reply-to-component
        ├── ue-email-cc-component
        ├── ue-email-bcc-component
        ├── ue-email-priority-component
        ├── ue-email-tracking-component
        ├── ue-email-analytics-component
        ├── ue-email-testing-component
        ├── ue-email-preview-component
        ├── ue-email-send-component
        ├── ue-email-schedule-component
        ├── ue-email-automation-component
        ├── ue-email-workflow-component
        ├── ue-email-campaign-component
        ├── ue-email-sequence-component
        ├── ue-email-trigger-component
        ├── ue-email-action-component
        ├── ue-email-condition-component
        ├── ue-email-branch-component
        ├── ue-email-delay-component
        ├── ue-email-filter-component
        ├── ue-email-segment-component
        ├── ue-email-list-component
        ├── ue-email-group-component
        ├── ue-email-tag-component
        ├── ue-email-field-component
        ├── ue-email-custom-field-component
        ├── ue-email-computed-field-component
        ├── ue-email-aggregate-field-component
        ├── ue-email-relationship-field-component
        ├── ue-email-lookup-field-component
        ├── ue-email-formula-field-component
        ├── ue-email-rollup-field-component
        ├── ue-email-master-detail-field-component
        ├── ue-email-external-id-field-component
        ├── ue-email-auto-number-field-component
        ├── ue-email-currency-field-component
        ├── ue-email-percent-field-component
        ├── ue-email-number-field-component
        ├── ue-email-checkbox-field-component
        ├── ue-email-date-field-component
        ├── ue-email-date-time-field-component
        ├── ue-email-time-field-component
        ├── ue-email-email-field-component
        ├── ue-email-phone-field-component
        ├── ue-email-url-field-component
        ├── ue-email-text-field-component
        ├── ue-email-long-text-field-component
        ├── ue-email-rich-text-field-component
        ├── ue-email-picklist-field-component
        ├── ue-email-multi-select-picklist-field-component
        ├── ue-email-location-field-component
        ├── ue-email-address-field-component
        ├── ue-email-geolocation-field-component
        └── ... (many more components)
```

## Key Components

### Main Container
- **`ui-editor`**: The root custom element that contains the entire Stripo editor interface within its shadow DOM.

### Core UI Panels

#### `ue-ui-simple-panel`
- **Purpose**: Container panel for various editor sections
- **Location**: Found by walking up from `ue-blocks-panel-component`
- **Styling**: Can be targeted for positioning (transform, width, background-color)
- **Children**:
  - `ue-blocks-panel-component`

#### `ue-blocks-panel-component`
- **Purpose**: Main panel for managing email blocks/content blocks
- **Location**: Inside `ue-ui-simple-panel`
- **Children**:
  - `ue-blocks-list-component`: List of available blocks
  - `ue-block-item-component`: Individual block items
  - `ue-block-preview-component`: Preview of blocks

### Toolbar Components

#### `ue-toolbar-component`
- **Purpose**: Main toolbar container
- **Children**:
  - `ue-toolbar-panel-component`: Toolbar panel sections
  - `ue-toolbar-button-component`: Individual toolbar buttons
  - `ue-toolbar-group-component`: Grouped toolbar items

### Content Editing Components

#### `ue-content-panel-component`
- **Purpose**: Main content editing area
- **Children**:
  - `ue-canvas-component`: The main editing canvas
  - `ue-structure-panel-component`: Structure/navigation panel
  - `ue-properties-panel-component`: Properties editor panel

### Block Components

#### `ue-block-library-component`
- **Purpose**: Library of available blocks
- **Children**:
  - `ue-block-category-component`: Categories of blocks
  - `ue-block-item-component`: Individual block items
  - `ue-block-preview-component`: Block previews

#### Block Types
- `ue-text-block-component`: Text content blocks
- `ue-image-block-component`: Image blocks
- `ue-button-block-component`: Button blocks
- `ue-divider-block-component`: Divider blocks
- `ue-spacer-block-component`: Spacer blocks
- `ue-social-block-component`: Social media blocks
- `ue-menu-block-component`: Menu/navigation blocks
- `ue-footer-block-component`: Footer blocks
- `ue-header-block-component`: Header blocks
- `ue-hero-block-component`: Hero section blocks
- `ue-articles-block-component`: Article blocks
- `ue-products-block-component`: Product blocks
- `ue-video-block-component`: Video blocks
- `ue-html-block-component`: Raw HTML blocks

### Form Components

#### `ue-form-component`
- **Purpose**: Form builder and editor
- **Children**:
  - `ue-form-group-component`: Form field groups
  - `ue-form-field-component`: Individual form fields
  - `ue-form-label-component`: Field labels
  - `ue-form-error-component`: Error messages
  - `ue-form-hint-component`: Help text

### Style Components

#### `ue-styles-component`
- **Purpose**: Style management
- **Children**:
  - `ue-styles-panel-component`: Style panel
  - `ue-styles-editor-component`: Style editor
  - `ue-css-editor-component`: CSS editor
  - `ue-style-property-component`: Style properties
  - `ue-style-value-component`: Style values
  - `ue-style-preview-component`: Style preview

### Media Components

#### `ue-media-library-component`
- **Purpose**: Media asset management
- **Children**:
  - `ue-media-selector-component`: Media selector
  - `ue-media-upload-component`: Media uploader
  - `ue-media-preview-component`: Media preview

#### Media Types
- `ue-image-component`: Image component
- `ue-image-editor-component`: Image editor
- `ue-image-properties-component`: Image properties
- `ue-image-cropper-component`: Image cropper
- `ue-image-filter-component`: Image filters
- `ue-image-gallery-component`: Image gallery
- `ue-video-component`: Video component
- `ue-video-editor-component`: Video editor
- `ue-audio-component`: Audio component

### Editor Components

#### Text Editors
- `ue-text-editor-component`: Basic text editor
- `ue-rich-text-editor-component`: Rich text editor (WYSIWYG)
- `ue-markdown-editor-component`: Markdown editor
- `ue-html-editor-component`: HTML editor
- `ue-code-editor-component`: Code editor

#### Code Editors
- `ue-css-editor-component`: CSS editor
- `ue-javascript-editor-component`: JavaScript editor
- `ue-json-editor-component`: JSON editor
- `ue-xml-editor-component`: XML editor
- `ue-yaml-editor-component`: YAML editor
- `ue-sql-editor-component`: SQL editor

### UI Components

#### Layout Components
- `ue-layout-component`: Layout container
- `ue-layout-builder-component`: Layout builder
- `ue-layout-preview-component`: Layout preview
- `ue-grid-component`: Grid system
- `ue-grid-item-component`: Grid items

#### Navigation Components
- `ue-menu-component`: Menu component
- `ue-menu-item-component`: Menu items
- `ue-menu-group-component`: Menu groups
- `ue-breadcrumb-component`: Breadcrumb navigation
- `ue-breadcrumb-item-component`: Breadcrumb items
- `ue-pagination-component`: Pagination
- `ue-tabs-component`: Tabs
- `ue-tab-component`: Tab items

#### Display Components
- `ue-card-component`: Card container
- `ue-card-header-component`: Card header
- `ue-card-body-component`: Card body
- `ue-card-footer-component`: Card footer
- `ue-list-component`: List container
- `ue-list-item-component`: List items
- `ue-accordion-component`: Accordion
- `ue-accordion-item-component`: Accordion items
- `ue-tree-component`: Tree view
- `ue-tree-node-component`: Tree nodes
- `ue-table-component`: Table
- `ue-table-header-component`: Table header
- `ue-table-body-component`: Table body
- `ue-table-row-component`: Table rows
- `ue-table-cell-component`: Table cells

#### Form Input Components
- `ue-input-component`: Text input
- `ue-textarea-component`: Textarea
- `ue-select-component`: Select dropdown
- `ue-checkbox-component`: Checkbox
- `ue-radio-component`: Radio button
- `ue-slider-component`: Slider
- `ue-color-picker-component`: Color picker
- `ue-date-picker-component`: Date picker
- `ue-time-picker-component`: Time picker
- `ue-date-time-picker-component`: DateTime picker

#### Feedback Components
- `ue-alert-component`: Alert messages
- `ue-notification-component`: Notifications
- `ue-toast-component`: Toast messages
- `ue-loader-component`: Loading spinner
- `ue-progress-component`: Progress bar
- `ue-badge-component`: Badge
- `ue-icon-component`: Icon

#### Interactive Components
- `ue-button-component`: Button
- `ue-dropdown-component`: Dropdown menu
- `ue-dropdown-menu-component`: Dropdown menu items
- `ue-popover-component`: Popover
- `ue-popover-content-component`: Popover content
- `ue-tooltip-component`: Tooltip
- `ue-modal-component`: Modal dialog
- `ue-modal-header-component`: Modal header
- `ue-modal-body-component`: Modal body
- `ue-modal-footer-component`: Modal footer
- `ue-dialog-component`: Dialog
- `ue-dialog-header-component`: Dialog header
- `ue-dialog-content-component`: Dialog content
- `ue-dialog-actions-component`: Dialog actions
- `ue-context-menu-component`: Context menu

### Email-Specific Components

#### Email Settings
- `ue-email-settings-component`: Email settings
- `ue-email-properties-component`: Email properties
- `ue-email-metadata-component`: Email metadata
- `ue-email-subject-component`: Email subject
- `ue-email-preheader-component`: Email preheader
- `ue-email-from-component`: From address
- `ue-email-reply-to-component`: Reply-to address
- `ue-email-cc-component`: CC addresses
- `ue-email-bcc-component`: BCC addresses

#### Email Features
- `ue-merge-tags-component`: Merge tags
- `ue-merge-tag-selector-component`: Merge tag selector
- `ue-merge-tag-preview-component`: Merge tag preview
- `ue-conditions-component`: Conditional content
- `ue-condition-builder-component`: Condition builder
- `ue-personalization-component`: Personalization
- `ue-a-b-test-component`: A/B testing
- `ue-analytics-component`: Analytics
- `ue-tracking-component`: Tracking
- `ue-pixel-component`: Tracking pixel
- `ue-utm-component`: UTM parameters

#### Email Actions
- `ue-email-send-component`: Send email
- `ue-email-schedule-component`: Schedule email
- `ue-email-preview-component`: Email preview
- `ue-email-testing-component`: Email testing
- `ue-responsive-preview-component`: Responsive preview
- `ue-mobile-view-component`: Mobile view
- `ue-desktop-view-component`: Desktop view
- `ue-tablet-view-component`: Tablet view
- `ue-device-selector-component`: Device selector

### Utility Components

#### Editor Utilities
- `ue-zoom-control-component`: Zoom controls
- `ue-ruler-component`: Ruler/guides
- `ue-grid-overlay-component`: Grid overlay
- `ue-guide-component`: Guides
- `ue-snap-line-component`: Snap lines
- `ue-selection-component`: Selection
- `ue-selection-handle-component`: Selection handles
- `ue-resize-handle-component`: Resize handles
- `ue-drag-handle-component`: Drag handles
- `ue-drop-zone-component`: Drop zones
- `ue-drag-preview-component`: Drag preview

#### History & Actions
- `ue-history-component`: History
- `ue-undo-redo-component`: Undo/redo
- `ue-actions-component`: Actions
- `ue-action-button-component`: Action buttons
- `ue-action-group-component`: Action groups
- `ue-shortcuts-component`: Keyboard shortcuts
- `ue-keyboard-shortcuts-component`: Shortcut manager
- `ue-command-palette-component`: Command palette
- `ue-search-palette-component`: Search palette

#### Search & Filter
- `ue-search-component`: Search
- `ue-filter-component`: Filter
- `ue-sort-component`: Sort
- `ue-view-toggle-component`: View toggle

### Integration Components

#### Plugins & Extensions
- `ue-plugin-component`: Plugin
- `ue-plugin-manager-component`: Plugin manager
- `ue-plugin-installer-component`: Plugin installer
- `ue-plugin-config-component`: Plugin configuration
- `ue-extension-component`: Extension
- `ue-extension-manager-component`: Extension manager
- `ue-extension-installer-component`: Extension installer
- `ue-extension-config-component`: Extension configuration

#### Custom Code
- `ue-custom-code-component`: Custom code
- `ue-custom-html-component`: Custom HTML
- `ue-custom-css-component`: Custom CSS
- `ue-custom-javascript-component`: Custom JavaScript
- `ue-script-injector-component`: Script injector
- `ue-style-injector-component`: Style injector

#### SEO & Meta
- `ue-meta-tags-component`: Meta tags
- `ue-seo-component`: SEO settings
- `ue-og-tags-component`: Open Graph tags
- `ue-twitter-cards-component`: Twitter cards

### Theme Components

#### Theme Management
- `ue-theme-component`: Theme
- `ue-theme-selector-component`: Theme selector
- `ue-theme-editor-component`: Theme editor

#### Typography
- `ue-fonts-component`: Fonts
- `ue-font-selector-component`: Font selector
- `ue-font-preview-component`: Font preview
- `ue-typography-component`: Typography
- `ue-typography-editor-component`: Typography editor
- `ue-text-styles-component`: Text styles

### Template Components

#### Template Management
- `ue-template-component`: Template
- `ue-template-selector-component`: Template selector
- `ue-template-preview-component`: Template preview
- `ue-template-library-component`: Template library
- `ue-template-category-component`: Template categories
- `ue-template-item-component`: Template items

### Assets Components

#### Asset Management
- `ue-assets-component`: Assets
- `ue-assets-library-component`: Asset library
- `ue-assets-upload-component`: Asset uploader
- `ue-assets-manager-component`: Asset manager

### Link Components

#### Link Management
- `ue-link-component`: Link
- `ue-link-editor-component`: Link editor
- `ue-link-preview-component`: Link preview

## Component Naming Convention

All Stripo components follow the `ue-*` prefix pattern:
- `ue-` = "UI Editor" prefix
- Component names are kebab-case
- Component names end with `-component`

## Shadow DOM Structure

The Stripo editor uses Shadow DOM encapsulation:
- Main container: `<ui-editor>` (custom element)
- Shadow root contains all `ue-*` components
- Components are Angular-based Web Components
- Styling is scoped within shadow DOM

## Accessing Components

### From JavaScript/TypeScript

```javascript
// Get the main ui-editor element
const uiEditor = document.querySelector('ui-editor');

// Access shadow root
const shadowRoot = uiEditor.shadowRoot;

// Find specific components
const blocksPanel = shadowRoot.querySelector('ue-blocks-panel-component');
const simplePanel = shadowRoot.querySelector('ue-ui-simple-panel');

// Walk up the DOM tree
let current = blocksPanel.parentElement;
while (current) {
  if (current.tagName.toLowerCase() === 'ue-ui-simple-panel') {
    // Found the parent panel
    break;
  }
  current = current.parentElement;
}
```

### From CSS (Limited)

Due to Shadow DOM encapsulation, direct CSS targeting is limited. However, you can:
1. Use CSS custom properties (CSS variables) passed through shadow DOM
2. Use `::part()` pseudo-element (if components expose parts)
3. Use `:host` and `:host-context()` within component styles
4. Use global styles that penetrate shadow DOM (not recommended)

### From Extensions

Stripo provides an Extension API for customizing the editor:
- Use `ExtensionBuilder` to create extensions
- Extensions can inject styles and modify behavior
- Extensions are registered before editor initialization

## Common Component Patterns

### Panel Components
- Usually contain `-panel-component` suffix
- Examples: `ue-ui-simple-panel`, `ue-blocks-panel-component`, `ue-styles-panel-component`

### Editor Components
- Usually contain `-editor-component` suffix
- Examples: `ue-text-editor-component`, `ue-image-editor-component`, `ue-css-editor-component`

### Builder Components
- Usually contain `-builder-component` suffix
- Examples: `ue-form-builder-component`, `ue-layout-builder-component`, `ue-condition-builder-component`

### Selector Components
- Usually contain `-selector-component` suffix
- Examples: `ue-template-selector-component`, `ue-font-selector-component`, `ue-media-selector-component`

### Preview Components
- Usually contain `-preview-component` suffix
- Examples: `ue-template-preview-component`, `ue-block-preview-component`, `ue-style-preview-component`

### Manager Components
- Usually contain `-manager-component` suffix
- Examples: `ue-plugin-manager-component`, `ue-assets-manager-component`, `ue-extension-manager-component`

## Notes

1. **Dynamic Loading**: Many components are loaded dynamically as needed
2. **Angular Framework**: Components are built with Angular and use Angular's change detection
3. **Shadow DOM**: All components are encapsulated in Shadow DOM for style isolation
4. **Custom Elements**: All components are registered as Custom Elements (Web Components)
5. **Event System**: Components communicate via Angular's event system and custom events
6. **State Management**: State is managed through Angular services and observables
7. **Lazy Loading**: Components are lazy-loaded for performance
8. **Modular Architecture**: Components are organized into modules for better code organization

## Browser DevTools Inspection

To inspect the component tree:

1. Open browser DevTools (F12)
2. Navigate to Elements/Inspector tab
3. Find `<ui-editor>` element
4. Expand to see Shadow Root
5. Navigate through `ue-*` components
6. Use console to query: `document.querySelector('ui-editor').shadowRoot.querySelectorAll('ue-*')`

## Related Documentation

- `STRIPO_STYLING.md`: Styling and theming guide
- `STRIPO_RESPONSIVE.md`: Responsive design guide
- `STRIPO_DEBUGGING.md`: Debugging guide

## Last Updated

Generated: 2025-11-25
Based on: Stripo UI Editor v2.21.0
Extracted from: Browser inspection and code analysis

