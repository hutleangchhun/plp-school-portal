# Notification Helper - Quick Reference Card

## Import
```javascript
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo,
  NOTIFICATION_MESSAGES,
  executeWithNotification,
  notifyBulkOperation,
  getErrorMessage
} from '../utils/notificationHelper';
```

## Basic Notifications

| Function | Usage | Duration |
|----------|-------|----------|
| `notifySuccess(msg)` | Show success toast | 4000ms |
| `notifyError(msg)` | Show error toast | 5000ms |
| `notifyWarning(msg)` | Show warning toast | 4000ms |
| `notifyInfo(msg)` | Show info toast | 3000ms |

## Predefined Messages

### Success Messages
```javascript
NOTIFICATION_MESSAGES.CREATED      // Created successfully
NOTIFICATION_MESSAGES.UPDATED      // Updated successfully
NOTIFICATION_MESSAGES.DELETED      // Deleted successfully
NOTIFICATION_MESSAGES.SAVED        // Saved successfully
NOTIFICATION_MESSAGES.SENT         // Sent successfully
NOTIFICATION_MESSAGES.APPROVED     // Approved successfully
NOTIFICATION_MESSAGES.IMPORTED     // Imported successfully
NOTIFICATION_MESSAGES.EXPORTED     // Exported successfully
```

### Error Messages
```javascript
NOTIFICATION_MESSAGES.FAILED_TO_CREATE     // Failed to create item
NOTIFICATION_MESSAGES.FAILED_TO_UPDATE     // Failed to update item
NOTIFICATION_MESSAGES.FAILED_TO_DELETE     // Failed to delete item
NOTIFICATION_MESSAGES.FAILED_TO_SAVE       // Failed to save changes
NOTIFICATION_MESSAGES.FAILED_TO_LOAD       // Failed to load data
NOTIFICATION_MESSAGES.NETWORK_ERROR        // Network error. Please check your connection
NOTIFICATION_MESSAGES.UNAUTHORIZED         // You are not authorized to perform this action
NOTIFICATION_MESSAGES.SERVER_ERROR         // Server error. Please try again later
NOTIFICATION_MESSAGES.VALIDATION_ERROR     // Please check your input and try again
```

## Common Patterns

### Pattern 1: Try-Catch with Notifications
```javascript
try {
  await api.updateItem(data);
  notifySuccess(NOTIFICATION_MESSAGES.UPDATED);
} catch (error) {
  notifyError(error.message || NOTIFICATION_MESSAGES.FAILED_TO_UPDATE);
}
```

### Pattern 2: Async with Loading State
```javascript
setLoading(true);
try {
  const result = await api.doSomething();
  notifySuccess('Done!');
} catch (error) {
  notifyError(getErrorMessage(error));
} finally {
  setLoading(false);
}
```

### Pattern 3: With Loading Context
```javascript
const { startLoading, stopLoading } = useLoading();

const result = await executeWithNotification(
  async () => api.doSomething(),
  {
    successMessage: NOTIFICATION_MESSAGES.CREATED,
    errorMessage: NOTIFICATION_MESSAGES.FAILED_TO_CREATE,
    showLoader: true,
    context: { startLoading, stopLoading }
  }
);
```

### Pattern 4: Bulk Operations
```javascript
const results = await Promise.all(
  items.map(item => api.delete(item.id).catch(e => ({ error: e })))
);

const successCount = results.filter(r => !r.error).length;
const failedCount = results.filter(r => r.error).length;

notifyBulkOperation(successCount, items.length, failedCount);
```

### Pattern 5: Custom Error Mapping
```javascript
try {
  await api.call();
} catch (error) {
  const message = getErrorMessage(error, {
    400: 'Invalid data provided',
    401: 'Please log in again',
    403: 'You do not have permission'
  });
  notifyError(message);
}
```

## Function Signatures

```javascript
// Basic notifications
notifySuccess(message: string, duration?: number): void
notifyError(message: string, duration?: number): void
notifyWarning(message: string, duration?: number): void
notifyInfo(message: string, duration?: number): void

// API response handling
handleSuccessResponse(response: any, message?: string): any
handleErrorResponse(error: Error, fallback?: string): Error

// Complex operations
executeWithNotification(
  apiCall: () => Promise<any>,
  options: {
    successMessage?: string,
    errorMessage?: string,
    showLoader?: boolean,
    context?: { startLoading?, stopLoading? },
    onSuccess?: (result) => void,
    onError?: (error) => void
  }
): Promise<any>

// Bulk operations
notifyBulkOperation(
  successCount: number,
  totalCount: number,
  failedCount?: number
): void

// Error handling
getErrorMessage(
  error: Error,
  customMap?: Record<string, string>
): string
```

## HTTP Status Code to Message Mapping

```javascript
400 → VALIDATION_ERROR
401 → UNAUTHORIZED
403 → FORBIDDEN
404 → NOT_FOUND
500 → SERVER_ERROR
503 → Service temporarily unavailable
```

## Duration Reference

```javascript
notifySuccess(msg, 3000)   // 3 seconds (quick messages)
notifySuccess(msg, 4000)   // 4 seconds (default for success)
notifyError(msg, 5000)     // 5 seconds (default for errors)
notifyWarning(msg, 6000)   // 6 seconds (bulk operations)
```

## When to Use Each Function

| Scenario | Use |
|----------|-----|
| Form submission success | `notifySuccess(NOTIFICATION_MESSAGES.SAVED)` |
| Form submission error | `notifyError(getErrorMessage(error))` |
| Item created | `notifySuccess(NOTIFICATION_MESSAGES.CREATED)` |
| Item updated | `notifySuccess(NOTIFICATION_MESSAGES.UPDATED)` |
| Item deleted | `notifySuccess(NOTIFICATION_MESSAGES.DELETED)` |
| Operation with loading | `executeWithNotification(...)` |
| Multiple item operations | `notifyBulkOperation(...)` |
| Custom warning | `notifyWarning('Action cannot be undone')` |
| Info messages | `notifyInfo(NOTIFICATION_MESSAGES.LOADING)` |

## Examples by Page Type

### Create/Edit Form
```javascript
const handleSubmit = async (data) => {
  setLoading(true);
  try {
    await api.save(data);
    notifySuccess(isEditing
      ? NOTIFICATION_MESSAGES.UPDATED
      : NOTIFICATION_MESSAGES.CREATED
    );
  } catch (error) {
    notifyError(getErrorMessage(error));
  } finally {
    setLoading(false);
  }
};
```

### Delete with Confirmation
```javascript
const handleDelete = async (id) => {
  if (!window.confirm('Are you sure?')) return;

  try {
    await api.delete(id);
    notifySuccess(NOTIFICATION_MESSAGES.DELETED);
    refreshList();
  } catch (error) {
    notifyError(getErrorMessage(error));
  }
};
```

### List with Bulk Actions
```javascript
const handleBulkDelete = async (selectedIds) => {
  const results = await Promise.all(
    selectedIds.map(id => api.delete(id).catch(e => ({ error: e })))
  );

  const success = results.filter(r => !r.error).length;
  const failed = results.filter(r => r.error).length;

  notifyBulkOperation(success, selectedIds.length, failed);
  refreshList();
};
```

### Modal/Dialog Actions
```javascript
const handleApprove = async (id) => {
  await executeWithNotification(
    () => api.approve(id),
    {
      successMessage: NOTIFICATION_MESSAGES.APPROVED,
      errorMessage: 'Failed to approve',
      onSuccess: () => closeModal()
    }
  );
};
```

## Do's and Don'ts

### ✅ Do's
- Use predefined messages from `NOTIFICATION_MESSAGES`
- Use `getErrorMessage()` for API errors
- Use `executeWithNotification()` for complex operations
- Provide custom error messages for validation
- Show different messages for bulk vs single operations

### ❌ Don'ts
- Don't use hardcoded strings for common messages
- Don't ignore error details from API responses
- Don't show multiple notifications for same action
- Don't use same message for different operations
- Don't forget to handle loading states

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Notifications not showing | Check `setToastContext` is called in App.jsx |
| Wrong message type | Verify constant name in `NOTIFICATION_MESSAGES` |
| Multiple notifications stacking | This is expected behavior |
| Duration too short | Increase duration parameter (in ms) |
| Error message not showing | Check error response structure with console.log |

---

**Last Updated:** 2025-10-26
**Version:** 1.0
