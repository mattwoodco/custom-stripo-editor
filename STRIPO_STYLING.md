# Stripo Editor Element Styling

## Overview

This document describes the technical implementation for styling Stripo editor elements via direct DOM manipulation within the shadow DOM.

## Target Element

**`ue-ui-simple-panel`** - The main container panel that holds the blocks panel component.

## Implementation Approach

### 1. Element Discovery
- Locate `ue-blocks-panel-component` within the Stripo editor's shadow DOM
- Walk up the DOM tree (up to 10 levels) to find the parent `ue-ui-simple-panel` element

### 2. Style Application
Styles are applied via direct DOM manipulation using `style.setProperty()` with `!important` flag:

```typescript
simplePanel.style.setProperty("transform", "translateX(10px)", "important");
simplePanel.style.setProperty("width", "100px", "important");
```

### 3. Applied Styles

- **Transform**: `translateX(10px)` - Moves the panel 10px to the right
- **Width**: `100px` - Sets the panel width to 100px

## Components

### `stripo-editor-customized.tsx`
- Uses ExtensionBuilder for CSS injection (currently empty, styles applied via DOM manipulation)
- Applies styles after editor renders successfully
- Uses MutationObserver as fallback to catch elements when they appear

### `stripo-editor.tsx`
- Direct DOM manipulation only
- Applies styles after editor renders successfully
- Uses MutationObserver as fallback

## Timing

Styles are applied:
1. Immediately after editor render detection
2. Via MutationObserver callback (watches for DOM changes for 10 seconds)
3. Fallback: Applied to immediate parent if `ue-ui-simple-panel` is not found

## Technical Notes

- Shadow DOM access required: `uiEditor.shadowRoot.querySelector()`
- Styles use `!important` flag to override Stripo's default styles
- Console logging included for debugging element discovery and style application

