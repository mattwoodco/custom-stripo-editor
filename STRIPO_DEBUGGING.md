# Stripo Editor Debugging Guide

## New Features Added

### 1. Comprehensive Logging

The editor now logs detailed information at every step of initialization:

- **Email ID Management**: Logs when checking localStorage, generating new IDs, or reusing existing ones
- **Token Authentication**: Logs token fetch requests and responses
- **Script Loading**: Logs zone.js and Stripo script loading status
- **Editor Initialization**: Logs config, timing, and success/failure
- **API Readiness**: Polls and logs when StripoEditorApi becomes available
- **Template Validation**: Attempts to validate template exists after initialization

### 2. Email ID Validation API

**Endpoint**: `POST /api/stripo/validate-email-id`

**Request Body**:
```json
{
  "emailId": "email-1234567890-abc123"
}
```

**Response**:
```json
{
  "emailId": "email-1234567890-abc123",
  "exists": null,
  "note": "Stripo Plugin API doesn't support server-side template validation...",
  "recommendation": "If you want to ensure a template exists, initialize the editor..."
}
```

**Note**: Stripo Plugin API doesn't support server-side template validation. The real validation happens client-side when the editor initializes. If a template doesn't exist, Stripo SDK will create it automatically.

### 3. Storage Management

#### Clear Storage Function

**Client-side function**: `clearStripoStorage(options?)`

```typescript
// Clear specific storage key (default: "stripo-email-id")
clearStripoStorage({ storageKey: "stripo-email-id" });

// Clear all Stripo-related keys
clearStripoStorage({ clearAll: true });
```

**Available in**:
- Component export (import from component)
- Global window object (dev mode only): `window.clearStripoStorage()`
- Error screen button: "Clear Storage & Retry"
- Dev helper button (top-right corner in dev mode)

#### Clear Storage API

**Endpoint**: `POST /api/stripo/clear-storage`

**Request Body** (optional):
```json
{
  "storageKey": "stripo-email-id",
  "clearAll": false
}
```

**Note**: This API provides instructions but actual clearing happens client-side.

## Debugging Workflow

### Step 1: Check Console Logs

Open browser console and look for:

1. **Email ID Source**:
   ```
   [StripoEditorCustomized] getOrCreateEmailId: Checking localStorage
   ```
   - Check if it's using localStorage or generating new
   - If using localStorage, the emailId might not exist in Stripo

2. **Token Fetch**:
   ```
   [API] ===== STRIPO TOKEN REQUEST =====
   [API] ✓ Stripo token received successfully
   ```
   - If this fails, check credentials in `.env.local`

3. **Script Loading**:
   ```
   [StripoEditorCustomized] ✓ zone.js ready
   [StripoEditorCustomized] ✓ Stripo script loaded successfully
   ```
   - If zone.js fails, Stripo may still work
   - If Stripo script fails, check network/CDN access

4. **Editor Initialization**:
   ```
   [StripoEditorCustomized] ===== INITIALIZING STRIPO EDITOR =====
   [StripoEditorCustomized] ✓ Stripo editor initialized successfully
   ```
   - Check the emailId being used
   - Check if HTML/CSS are provided

5. **API Readiness**:
   ```
   [StripoEditorCustomized] Editor API check #X
   [StripoEditorCustomized] ✓ Editor API is ready after X checks
   ```
   - If this never becomes ready, the emailId might not exist
   - Check for template data retrieval success

### Step 2: Validate Email ID

If the editor doesn't load, the emailId in localStorage might not exist in Stripo:

1. **Check localStorage**:
   ```javascript
   localStorage.getItem('stripo-email-id')
   ```

2. **Clear and retry**:
   - Click "Clear Storage & Retry" button on error screen
   - Or use dev helper button (top-right in dev mode)
   - Or run in console: `window.clearStripoStorage()`

3. **Check template data**:
   After editor loads, check console for:
   ```
   [StripoEditorCustomized] ✓ Template data retrieved successfully
   ```
   If this doesn't appear, the template might not exist.

### Step 3: Common Issues

#### Issue: Editor doesn't load, no errors

**Possible causes**:
1. EmailId in localStorage doesn't exist in Stripo
2. Token authentication failed silently
3. Stripo SDK initialization error

**Solution**:
- Clear storage and retry
- Check token API logs in server console
- Check browser network tab for failed requests

#### Issue: "Stripo editor script not loaded"

**Possible causes**:
1. Network/CDN access issues
2. Script blocked by ad blocker
3. CORS issues

**Solution**:
- Check network tab for script requests
- Try disabling ad blockers
- Check browser console for CORS errors

#### Issue: Editor loads but API never becomes ready

**Possible causes**:
1. EmailId doesn't exist and SDK failed to create it
2. Token refresh failing
3. Stripo SDK internal error

**Solution**:
- Check token refresh logs
- Clear storage and retry with new emailId
- Check StripoEditorApi availability in console

## Testing Utilities

### Browser Console Commands (Dev Mode)

```javascript
// Clear storage
window.clearStripoStorage()

// Clear all Stripo-related storage
window.clearStripoStorage({ clearAll: true })

// Check current emailId
localStorage.getItem('stripo-email-id')

// Check if editor API is ready
window.StripoEditorApi?.actionsApi

// Try to get template data
window.StripoEditorApi?.actionsApi?.getTemplateData((data) => {
  console.log('Template data:', data)
})
```

### Manual Storage Clearing

```javascript
// Clear specific key
localStorage.removeItem('stripo-email-id')

// Clear all Stripo-related keys
Object.keys(localStorage)
  .filter(k => k.toLowerCase().includes('stripo'))
  .forEach(k => localStorage.removeItem(k))
```

## Next Steps

After reviewing logs, we can:

1. **Implement better emailId management**: Fetch existing templates from Stripo API (if available)
2. **Add template listing**: Show available templates to reuse
3. **Improve error handling**: Better error messages based on failure type
4. **Add retry logic**: Automatic retry with new emailId if current one fails

## Log Prefixes

- `[StripoEditorCustomized]` - Component logs
- `[API]` - API route logs (server-side)
- `✓` - Success indicator
- `✗` - Error indicator
- `⚠` - Warning indicator

