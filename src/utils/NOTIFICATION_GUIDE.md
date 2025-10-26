# Notification Helper Guide

This guide explains how to use the standardized notification system across the entire project.

## Overview

The `notificationHelper.js` module provides a centralized way to show success, error, warning, and info notifications throughout the application. It integrates with the Toast context and provides consistent messaging.

## Basic Usage

### 1. Simple Notifications

```javascript
import {
  notifySuccess,
  notifyError,
  notifyWarning,
  notifyInfo
} from '../utils/notificationHelper';

// Show success notification
notifySuccess('Profile updated successfully');

// Show error notification
notifyError('Failed to save changes');

// Show warning
notifyWarning('This action cannot be undone');

// Show info
notifyInfo('File is being processed');
```

### 2. Predefined Messages

```javascript
import { NOTIFICATION_MESSAGES } from '../utils/notificationHelper';

// Use common messages to maintain consistency
notifySuccess(NOTIFICATION_MESSAGES.CREATED);
notifyError(NOTIFICATION_MESSAGES.FAILED_TO_UPDATE);
notifyWarning(NOTIFICATION_MESSAGES.NO_CHANGES);
```

### 3. API Response Handling

```javascript
import { handleSuccessResponse, handleErrorResponse } from '../utils/notificationHelper';

try {
  const response = await api.createItem(data);
  // Automatically shows success toast with response message
  handleSuccessResponse(response, 'Item created successfully');
} catch (error) {
  // Automatically shows error toast
  handleErrorResponse(error, 'Failed to create item');
}
```

### 4. Execute with Notification

```javascript
import { executeWithNotification } from '../utils/notificationHelper';

// Wraps async call with automatic loading and notification
const result = await executeWithNotification(
  async () => await api.updateItem(id, data),
  {
    successMessage: 'Item updated successfully',
    errorMessage: 'Failed to update item',
    showLoader: true,
    context: { startLoading, stopLoading }, // Optional loading context
    onSuccess: (result) => {
      // Handle success
      console.log('Updated:', result);
    },
    onError: (error) => {
      // Handle error
      console.error('Error:', error);
    }
  }
);
```

### 5. Bulk Operations

```javascript
import { notifyBulkOperation } from '../utils/notificationHelper';

// Notify about bulk operation results
const results = await bulkDelete(items);
const failedCount = results.filter(r => !r.success).length;
notifyBulkOperation(
  results.length - failedCount, // successful count
  results.length,                // total count
  failedCount                    // failed count
);
```

### 6. Error Message Mapping

```javascript
import { getErrorMessage } from '../utils/notificationHelper';

try {
  await api.call();
} catch (error) {
  // Get appropriate error message based on status code
  const message = getErrorMessage(error, {
    400: 'Invalid input provided',
    401: 'You need to log in',
    403: 'You do not have permission'
  });
  notifyError(message);
}
```

## Complete Examples

### Example 1: Creating an Item

```javascript
import React, { useState } from 'react';
import {
  notifySuccess,
  notifyError,
  NOTIFICATION_MESSAGES
} from '../utils/notificationHelper';

export function CreateItemForm() {
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (formData) => {
    setLoading(true);
    try {
      const response = await api.createItem(formData);
      notifySuccess(NOTIFICATION_MESSAGES.CREATED);
      // Redirect or refresh list
    } catch (error) {
      notifyError(
        error.response?.data?.message || NOTIFICATION_MESSAGES.FAILED_TO_CREATE
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleSubmit(new FormData(e.target));
    }}>
      {/* form fields */}
      <button type="submit" disabled={loading}>
        {loading ? 'Creating...' : 'Create'}
      </button>
    </form>
  );
}
```

### Example 2: Updating with Loading Context

```javascript
import { executeWithNotification } from '../utils/notificationHelper';
import { useLoading } from '../contexts/LoadingContext';

export function UpdateItemForm({ itemId }) {
  const { startLoading, stopLoading } = useLoading();

  const handleUpdate = async (formData) => {
    await executeWithNotification(
      async () => api.updateItem(itemId, formData),
      {
        successMessage: 'Changes saved successfully',
        errorMessage: 'Failed to save changes',
        showLoader: true,
        context: { startLoading, stopLoading },
        onSuccess: (result) => {
          // Refresh or redirect
          window.location.reload();
        }
      }
    );
  };

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      handleUpdate(new FormData(e.target));
    }}>
      {/* form fields */}
      <button type="submit">Save Changes</button>
    </form>
  );
}
```

### Example 3: Bulk Operations

```javascript
import { notifyBulkOperation } from '../utils/notificationHelper';

export async function deleteSelectedItems(itemIds) {
  const results = await Promise.all(
    itemIds.map(id => api.deleteItem(id).catch(err => ({ error: err })))
  );

  const successCount = results.filter(r => !r.error).length;
  const failedCount = results.filter(r => r.error).length;

  notifyBulkOperation(successCount, itemIds.length, failedCount);

  // Refresh list
  refreshList();
}
```

### Example 4: API Service Integration

```javascript
// In your API service file:
import { NOTIFICATION_MESSAGES, getErrorMessage } from '../utils/notificationHelper';

export const itemService = {
  async create(data) {
    try {
      const response = await api.post('/items', data);
      // Don't show notification here - let component decide
      return response.data;
    } catch (error) {
      // Re-throw with proper error message
      throw new Error(getErrorMessage(error, {
        400: NOTIFICATION_MESSAGES.VALIDATION_ERROR,
        409: 'Item already exists'
      }));
    }
  }
};

// In your component:
import { notifySuccess, notifyError } from '../utils/notificationHelper';
import { itemService } from '../services/itemService';

const handleCreate = async (data) => {
  try {
    const result = await itemService.create(data);
    notifySuccess('Item created successfully');
  } catch (error) {
    notifyError(error.message);
  }
};
```

## Available Messages

### Success Messages
- `CREATED` - Created successfully
- `UPDATED` - Updated successfully
- `DELETED` - Deleted successfully
- `SAVED` - Saved successfully
- `SENT` - Sent successfully
- `APPROVED` - Approved successfully
- `IMPORTED` - Imported successfully
- `EXPORTED` - Exported successfully
- `SYNCED` - Synced successfully

### Error Messages
- `FAILED_TO_CREATE` - Failed to create item
- `FAILED_TO_UPDATE` - Failed to update item
- `FAILED_TO_DELETE` - Failed to delete item
- `FAILED_TO_SAVE` - Failed to save changes
- `FAILED_TO_LOAD` - Failed to load data
- `NETWORK_ERROR` - Network error message
- `UNAUTHORIZED` - Unauthorized access
- `SERVER_ERROR` - Server error occurred
- `VALIDATION_ERROR` - Validation error

## Best Practices

1. **Use predefined messages** for consistency:
   ```javascript
   notifySuccess(NOTIFICATION_MESSAGES.CREATED); // Good
   notifySuccess('Created'); // Avoid
   ```

2. **Distinguish between API and business logic errors**:
   ```javascript
   // API error - show status-based message
   try {
     await api.call();
   } catch (error) {
     notifyError(getErrorMessage(error));
   }
   ```

3. **Use executeWithNotification for complex operations**:
   ```javascript
   // For operations that need loading state and notification
   await executeWithNotification(apiCall, options);
   ```

4. **Handle custom errors appropriately**:
   ```javascript
   if (!isValidEmail) {
     notifyWarning('Please enter a valid email');
     return;
   }
   ```

5. **Bulk operations should show summary**:
   ```javascript
   notifyBulkOperation(success, total, failed);
   // Shows: "Successfully processed X items" or "X succeeded, Y failed"
   ```

## Migration Guide

To update existing code to use the notification helper:

### Before:
```javascript
const { showSuccess, showError } = useToast();

try {
  const response = await api.create(data);
  showSuccess('Item created');
} catch (error) {
  showError(error.message || 'Failed to create');
}
```

### After:
```javascript
import { notifySuccess, notifyError, NOTIFICATION_MESSAGES } from '../utils/notificationHelper';

try {
  const response = await api.create(data);
  notifySuccess(NOTIFICATION_MESSAGES.CREATED);
} catch (error) {
  notifyError(error.message || NOTIFICATION_MESSAGES.FAILED_TO_CREATE);
}
```

## Troubleshooting

**Q: Notifications not showing?**
A: Make sure `App.jsx` has initialized the notification helper. Check that `setToastContext` is called in `AppContent`.

**Q: Wrong messages showing?**
A: Verify you're using the correct message constants from `NOTIFICATION_MESSAGES`.

**Q: Multiple notifications stacking?**
A: The Toast system queues them. This is normal and shows user multiple actions.

## API Reference

### Functions

- `notifySuccess(message, duration)` - Show success notification
- `notifyError(message, duration)` - Show error notification
- `notifyWarning(message, duration)` - Show warning notification
- `notifyInfo(message, duration)` - Show info notification
- `handleSuccessResponse(response, message)` - Handle API success
- `handleErrorResponse(error, fallback)` - Handle API error
- `executeWithNotification(apiCall, options)` - Execute with notification
- `notifyBulkOperation(success, total, failed)` - Bulk operation notification
- `getErrorMessage(error, customMap)` - Get error message from error object

### Constants

- `NOTIFICATION_MESSAGES` - Object with predefined notification messages
- All message keys are documented in the "Available Messages" section
