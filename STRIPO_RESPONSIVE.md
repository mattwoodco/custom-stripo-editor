# Stripo Editor Responsive Styling Guide

## Overview

This guide provides technical patterns for customizing Stripo editor layouts and styles with responsive behavior. Stripo uses Shadow DOM, requiring direct DOM manipulation to override default styles. This guide covers element discovery, style application, and responsive breakpoint management.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Element Discovery](#element-discovery)
3. [Style Application Patterns](#style-application-patterns)
4. [Responsive Breakpoints](#responsive-breakpoints)
5. [Implementation Patterns](#implementation-patterns)
6. [Complete Examples](#complete-examples)

---

## Architecture Overview

### Key Concepts

- **Shadow DOM**: Stripo editor elements are encapsulated in Shadow DOM, requiring `shadowRoot` access
- **Direct DOM Manipulation**: Styles must be applied via `style.setProperty()` with `!important` flag
- **Timing**: Elements may not exist immediately after editor initialization
- **Responsive Detection**: Use `ResizeObserver` to track container size changes

### Target Elements

Common Stripo editor elements you may want to style:

- `ue-ui-simple-panel` - Main container panel for blocks
- `ue-blocks-panel-component` - Blocks panel component
- `.tool-panel-container` - Toolbar container
- `.tabs-header` - Tab navigation header
- `.movable-panel` - Movable panel elements

---

## Element Discovery

### Pattern: Shadow DOM Traversal

```typescript
function findStripoElement(
  container: HTMLElement,
  targetSelector: string,
  maxDepth: number = 10
): HTMLElement | null {
  const uiEditor = container.querySelector("ui-editor");
  if (!uiEditor?.shadowRoot) return null;

  // Start from a known child element
  const startElement = uiEditor.shadowRoot.querySelector("ue-blocks-panel-component");
  if (!startElement) return null;

  // Walk up the DOM tree
  let current: Element | null = startElement.parentElement;
  let depth = 0;

  while (current && depth < maxDepth) {
    const tagName = current.tagName.toLowerCase();
    
    // Check tag name or class
    if (tagName === targetSelector || current.matches(targetSelector)) {
      return current as HTMLElement;
    }

    current = current.parentElement;
    depth++;
  }

  return null;
}
```

### Pattern: Multiple Element Discovery

```typescript
function findMultipleElements(
  container: HTMLElement,
  selectors: string[]
): Map<string, HTMLElement | null> {
  const uiEditor = container.querySelector("ui-editor");
  if (!uiEditor?.shadowRoot) {
    return new Map(selectors.map(s => [s, null]));
  }

  const results = new Map<string, HTMLElement | null>();
  
  for (const selector of selectors) {
    const element = uiEditor.shadowRoot.querySelector(selector) as HTMLElement | null;
    results.set(selector, element);
  }

  return results;
}
```

---

## Style Application Patterns

### Pattern: Basic Style Application

```typescript
function applyStyles(element: HTMLElement, styles: Record<string, string>) {
  Object.entries(styles).forEach(([property, value]) => {
    element.style.setProperty(property, value, "important");
  });
}

// Usage
const simplePanel = findStripoElement(container, "ue-ui-simple-panel");
if (simplePanel) {
  applyStyles(simplePanel, {
    transform: "translateX(10px)",
    width: "100px",
  });
}
```

### Pattern: Conditional Style Application

```typescript
function applyConditionalStyles(
  element: HTMLElement,
  condition: boolean,
  styles: Record<string, string>
) {
  if (condition) {
    Object.entries(styles).forEach(([property, value]) => {
      element.style.setProperty(property, value, "important");
    });
  } else {
    // Remove styles when condition is false
    Object.keys(styles).forEach(property => {
      element.style.removeProperty(property);
    });
  }
}
```

### Pattern: Style Removal

```typescript
function removeStyles(element: HTMLElement, properties: string[]) {
  properties.forEach(property => {
    element.style.removeProperty(property);
  });
}
```

---

## Responsive Breakpoints

### Pattern: ResizeObserver Setup

```typescript
const resizeObserverRef = useRef<ResizeObserver | null>(null);

function setupResizeObserver(
  container: HTMLElement,
  callback: (width: number, height: number) => void
) {
  if (typeof ResizeObserver === "undefined") {
    // Fallback to window resize
    const handleResize = () => {
      const rect = container.getBoundingClientRect();
      callback(rect.width, rect.height);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }

  // Clean up existing observer
  if (resizeObserverRef.current) {
    resizeObserverRef.current.disconnect();
  }

  resizeObserverRef.current = new ResizeObserver((entries) => {
    const entry = entries[0];
    if (entry) {
      callback(entry.contentRect.width, entry.contentRect.height);
    }
  });

  resizeObserverRef.current.observe(container);
  
  return () => {
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }
  };
}
```

### Pattern: Breakpoint Management

```typescript
interface BreakpointConfig {
  min?: number;
  max?: number;
  styles: Record<string, string>;
}

const BREAKPOINTS: BreakpointConfig[] = [
  {
    max: 768,
    styles: { width: "80px", transform: "translateX(5px)" }
  },
  {
    min: 769,
    max: 1200,
    styles: { width: "100px", transform: "translateX(10px) translateY(20px)" }
  },
  {
    min: 1201,
    styles: { 
      // No width override on desktop - leave as-is
      transform: "translateX(15px)"
    }
  }
];

function getStylesForWidth(width: number): Record<string, string> {
  for (const breakpoint of BREAKPOINTS) {
    const matchesMin = !breakpoint.min || width >= breakpoint.min;
    const matchesMax = !breakpoint.max || width <= breakpoint.max;
    
    if (matchesMin && matchesMax) {
      return breakpoint.styles;
    }
  }
  
  return {}; // Default: no styles
}
```

---

## Implementation Patterns

### Pattern: Complete Responsive Styling Function

```typescript
function createResponsiveStyler(
  containerRef: React.RefObject<HTMLDivElement>,
  targetSelector: string
) {
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  const applyResponsiveStyles = (width?: number) => {
    const containerWidth = width ?? containerRef.current?.getBoundingClientRect().width ?? 0;
    const element = findStripoElement(containerRef.current!, targetSelector);
    
    if (!element) return;

    // Apply responsive transform based on width
    // On mobile (width <= 1200px): move down 20px
    // On desktop (width > 1200px): leave as is
    const transformValue =
      containerWidth <= 1200
        ? "translateX(10px) translateY(20px)"
        : "translateX(10px)";
    element.style.setProperty("transform", transformValue, "important");

    // Width only changes on mobile (width <= 1200px)
    // On desktop (width > 1200px): leave width as-is (remove override)
    if (containerWidth <= 1200) {
      element.style.setProperty("width", "100px", "important");
    } else {
      element.style.removeProperty("width");
    }
  };

  const setupObserver = () => {
    if (!containerRef.current) return;

    if (typeof ResizeObserver !== "undefined") {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }

      resizeObserverRef.current = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        applyResponsiveStyles(width);
      });

      resizeObserverRef.current.observe(containerRef.current);
    } else {
      // Fallback
      const handleResize = () => applyResponsiveStyles();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  };

  return { applyResponsiveStyles, setupObserver };
}
```

### Pattern: MutationObserver for Delayed Elements

```typescript
function watchForElement(
  container: HTMLElement,
  selector: string,
  callback: (element: HTMLElement) => void,
  timeout: number = 10000
): () => void {
  const uiEditor = container.querySelector("ui-editor");
  if (!uiEditor?.shadowRoot) {
    return () => {};
  }

  // Try immediately
  const element = uiEditor.shadowRoot.querySelector(selector) as HTMLElement | null;
  if (element) {
    callback(element);
  }

  // Watch for changes
  const observer = new MutationObserver(() => {
    const element = uiEditor.shadowRoot?.querySelector(selector) as HTMLElement | null;
    if (element) {
      callback(element);
    }
  });

  observer.observe(uiEditor.shadowRoot, {
    childList: true,
    subtree: true,
  });

  // Cleanup after timeout
  const timeoutId = setTimeout(() => {
    observer.disconnect();
  }, timeout);

  return () => {
    clearTimeout(timeoutId);
    observer.disconnect();
  };
}
```

---

## Complete Examples

### Example 1: Basic Responsive Panel Styling

```typescript
"use client";
import { useEffect, useRef } from "react";

export function StripoEditorWithResponsiveStyles() {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const applyPanelStyles = (width?: number) => {
      const containerWidth = width ?? containerRef.current?.getBoundingClientRect().width ?? 0;
      const uiEditor = containerRef.current?.querySelector("ui-editor");
      
      if (!uiEditor?.shadowRoot) return;

      const blocksPanel = uiEditor.shadowRoot.querySelector("ue-blocks-panel-component");
      if (!blocksPanel) return;

      // Find ue-ui-simple-panel
      let current: Element | null = blocksPanel.parentElement;
      let depth = 0;
      const maxDepth = 10;
      
      while (current && depth < maxDepth) {
        if (current.tagName.toLowerCase() === "ue-ui-simple-panel") {
          const simplePanel = current as HTMLElement;
          
          // Responsive transform: move right 10px, and down 20px on mobile (width <= 1200px)
          // On desktop (width > 1200px): leave as is (just translateX)
          const transformValue =
            containerWidth <= 1200
              ? "translateX(10px) translateY(20px)"
              : "translateX(10px)";
          simplePanel.style.setProperty("transform", transformValue, "important");
          
          // Width only changes on mobile (width <= 1200px)
          // On desktop (width > 1200px): leave width as-is (remove override)
          if (containerWidth <= 1200) {
            simplePanel.style.setProperty("width", "100px", "important");
          } else {
            simplePanel.style.removeProperty("width");
          }
          
          break;
        }
        current = current.parentElement;
        depth++;
      }
    };

    // Apply immediately
    applyPanelStyles();

    // Setup ResizeObserver
    if (typeof ResizeObserver !== "undefined") {
      resizeObserverRef.current = new ResizeObserver((entries) => {
        const width = entries[0]?.contentRect.width ?? 0;
        applyPanelStyles(width);
      });
      resizeObserverRef.current.observe(containerRef.current);
    }

    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  return <div ref={containerRef} className="w-full h-[600px]" />;
}
```

### Example 2: Multi-Breakpoint Responsive Styling

```typescript
interface BreakpointStyles {
  width: string;
  transform: string;
  backgroundColor?: string;
  padding?: string;
}

const BREAKPOINT_STYLES: Record<string, BreakpointStyles> = {
  mobile: {
    width: "80px",
    transform: "translateX(5px) translateY(20px)",
  },
  tablet: {
    width: "100px",
    transform: "translateX(10px) translateY(20px)",
  },
  desktop: {
    // No width override on desktop - leave as-is
    transform: "translateX(15px)",
    padding: "10px",
  },
};

function getBreakpointStyles(width: number): BreakpointStyles {
  if (width <= 768) return BREAKPOINT_STYLES.mobile;
  if (width <= 1200) return BREAKPOINT_STYLES.tablet;
  return BREAKPOINT_STYLES.desktop;
}

function applyBreakpointStyles(element: HTMLElement, width: number) {
  const styles = getBreakpointStyles(width);
  
  // Width only applied on mobile/tablet (width <= 1200px)
  // On desktop (width > 1200px): leave width as-is (no override)
  if (styles.width) {
    element.style.setProperty("width", styles.width, "important");
  } else {
    element.style.removeProperty("width");
  }
  
  element.style.setProperty("transform", styles.transform, "important");
  
  if (styles.backgroundColor) {
    element.style.setProperty("background-color", styles.backgroundColor, "important");
  } else {
    element.style.removeProperty("background-color");
  }
  
  if (styles.padding) {
    element.style.setProperty("padding", styles.padding, "important");
  } else {
    element.style.removeProperty("padding");
  }
}
```

### Example 3: Multiple Elements with Different Breakpoints

```typescript
interface ElementStyleConfig {
  selector: string;
  baseStyles: Record<string, string>;
  responsiveStyles: Array<{
    minWidth: number;
    styles: Record<string, string>;
  }>;
}

const ELEMENT_CONFIGS: ElementStyleConfig[] = [
  {
    selector: "ue-ui-simple-panel",
    baseStyles: { transform: "translateX(10px) translateY(20px)" },
    responsiveStyles: [
      { minWidth: 1201, styles: { transform: "translateX(10px)" } },
    ],
  },
  {
    selector: ".tool-panel-container",
    baseStyles: { position: "relative" },
    responsiveStyles: [
      { minWidth: 768, styles: { "margin-top": "20px" } },
      { minWidth: 1200, styles: { "margin-top": "40px" } },
    ],
  },
];

function applyMultiElementResponsiveStyles(
  container: HTMLElement,
  width: number
) {
  const uiEditor = container.querySelector("ui-editor");
  if (!uiEditor?.shadowRoot) return;

  ELEMENT_CONFIGS.forEach(config => {
    const element = uiEditor.shadowRoot.querySelector(
      config.selector
    ) as HTMLElement | null;
    
    if (!element) return;

    // Apply base styles
    Object.entries(config.baseStyles).forEach(([prop, value]) => {
      element.style.setProperty(prop, value, "important");
    });

    // Apply responsive styles
    config.responsiveStyles.forEach(({ minWidth, styles }) => {
      if (width >= minWidth) {
        Object.entries(styles).forEach(([prop, value]) => {
          element.style.setProperty(prop, value, "important");
        });
      } else {
        // Remove responsive styles when below breakpoint
        Object.keys(styles).forEach(prop => {
          element.style.removeProperty(prop);
        });
      }
    });
  });
}
```

---

## Best Practices

### 1. Always Use `!important` Flag

Stripo's default styles have high specificity. Always use the `important` flag:

```typescript
element.style.setProperty("property", "value", "important");
```

### 2. Clean Up Observers

Always disconnect observers on component unmount:

```typescript
useEffect(() => {
  // Setup observers
  return () => {
    resizeObserverRef.current?.disconnect();
    mutationObserver?.disconnect();
  };
}, []);
```

### 3. Handle Missing Elements Gracefully

Elements may not exist immediately. Use fallbacks:

```typescript
const element = findElement(container, selector);
if (!element) {
  console.warn(`Element ${selector} not found`);
  return;
}
```

### 4. Debounce Rapid Resize Events

For performance, debounce resize callbacks:

```typescript
function debounce<T extends (...args: any[]) => void>(
  func: T,
  wait: number
): T {
  let timeout: NodeJS.Timeout;
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

const debouncedApplyStyles = debounce(applyStyles, 100);
```

### 5. Use TypeScript for Type Safety

```typescript
interface StyleConfig {
  property: string;
  value: string;
  breakpoint?: {
    min?: number;
    max?: number;
  };
}

const styleConfigs: StyleConfig[] = [
  {
    property: "transform",
    value: "translateX(10px) translateY(20px)",
    breakpoint: { max: 1200 },
  },
];
```

---

## Troubleshooting

### Element Not Found

**Problem**: Element selector returns `null`

**Solutions**:

- Increase `maxDepth` in DOM traversal
- Use `MutationObserver` to wait for element appearance
- Check element exists in Shadow DOM: `uiEditor.shadowRoot.querySelector()`

### Styles Not Applying

**Problem**: Styles are set but not visible

**Solutions**:

- Ensure `!important` flag is used
- Check for CSS specificity conflicts
- Verify element is correct target (use browser DevTools)

### ResizeObserver Not Firing

**Problem**: Styles don't update on resize

**Solutions**:

- Verify `ResizeObserver` is supported (use fallback)
- Check container has dimensions (`width > 0`)
- Ensure observer is observing correct element

### Performance Issues

**Problem**: Frequent style updates cause lag

**Solutions**:

- Debounce resize callbacks
- Batch style updates
- Use `requestAnimationFrame` for smooth updates

---

## Reference

### Common Stripo Element Selectors

- `ue-ui-simple-panel` - Main panel container
- `ue-blocks-panel-component` - Blocks panel
- `.tool-panel-container` - Toolbar container
- `.tabs-header` - Tab navigation
- `.movable-panel` - Movable panels

### CSS Properties That Work Well

- `transform` - Positioning and movement
- `width`, `height` - Dimensions
- `background-color` - Background colors
- `padding`, `margin` - Spacing
- `opacity` - Transparency
- `display` - Display mode

### Browser Compatibility

- `ResizeObserver`: Supported in all modern browsers (IE11 requires polyfill)
- Shadow DOM: Supported in all modern browsers
- `MutationObserver`: Widely supported

---

## Summary

This guide provides patterns for:

1. **Element Discovery**: Traversing Shadow DOM to find target elements
2. **Style Application**: Applying styles with proper specificity
3. **Responsive Breakpoints**: Managing styles based on container width
4. **Observer Management**: Using ResizeObserver and MutationObserver effectively
5. **Cleanup**: Properly disposing of observers and event listeners

Use these patterns as building blocks for your custom Stripo editor styling needs.
