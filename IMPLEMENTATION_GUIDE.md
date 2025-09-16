# Teacher Portal - Implementation Guide

## Overview

This guide provides detailed implementation instructions for the Teacher Portal improvements, including Khmer localization and architectural enhancements. Follow this guide to understand the changes made and how to extend the application further.

## Localization Implementation

### Translation System

The application uses a robust translation system based on React Context:

```javascript
// Using translations in components
import { useLanguage } from '../contexts/LanguageContext';

function MyComponent() {
  const { t, language, toggleLanguage } = useLanguage();
  
  return (
    <div>
      <h1>{t('welcome')}</h1>
      <button onClick={toggleLanguage}>
        {t('switchLanguage')}
      </button>
    </div>
  );
}
```

### Adding New Translations

1. **Add to English file** (`src/locales/en.js`):
```javascript
export const en = {
  // ... existing translations
  newFeatureName: 'New Feature',
  newButtonLabel: 'Click Me'
};
```

2. **Add to Khmer file** (`src/locales/km.js`):
```javascript
export const km = {
  // ... existing translations
  newFeatureName: 'មុខងារថ្មី',
  newButtonLabel: 'ចុចខ្ញុំ'
};
```

3. **Use in components**:
```javascript
<h2>{t('newFeatureName')}</h2>
<button>{t('newButtonLabel')}</button>
```

### Translation Key Naming Convention

- Use camelCase for consistency
- Use descriptive names that indicate the content
- Group related translations with prefixes:
  - `form*` for form-related text
  - `error*` for error messages
  - `dashboard*` for dashboard-specific content

Example:
```javascript
// Good
formUsername: 'Username',
formPassword: 'Password',
errorInvalidEmail: 'Please enter a valid email',
dashboardTotalStudents: 'Total Students'

// Avoid
username: 'Username',  // Too generic
msg1: 'Error',         // Not descriptive
```

## Using Constants

### Grade Levels

```javascript
import { GRADE_LEVELS, getGradeLevels, getGradeLabel } from '../constants/grades';

// Get all grade levels with translations
const MyComponent = () => {
  const { t } = useLanguage();
  const grades = getGradeLevels(t);
  
  return (
    <select>
      {grades.map(grade => (
        <option key={grade.value} value={grade.value}>
          {grade.translatedLabel}
        </option>
      ))}
    </select>
  );
};

// Get specific grade label
const gradeLabel = getGradeLabel('1', t); // Returns "Grade 1" or "ថ្នាក់ទី១"
```

### Achievement Categories

```javascript
import { ACHIEVEMENT_CATEGORIES, getAchievementCategories } from '../constants/achievements';

const AchievementForm = () => {
  const { t } = useLanguage();
  const categories = getAchievementCategories(t);
  
  return (
    <select>
      {categories.map(category => (
        <option key={category.value} value={category.value}>
          {category.icon} {category.translatedLabel}
        </option>
      ))}
    </select>
  );
};
```

### UI Constants

```javascript
import { PAGINATION_DEFAULTS, TOAST_TYPES, VALIDATION_PATTERNS } from '../constants/ui';

// Use pagination defaults
const [itemsPerPage, setItemsPerPage] = useState(PAGINATION_DEFAULTS.itemsPerPage);

// Show toast notification
showToast({ type: TOAST_TYPES.SUCCESS, message: 'Operation completed' });

// Validate email
const isValid = VALIDATION_PATTERNS.EMAIL.test(email);
```

## Using Custom Hooks

### API Calls with useApiCall

```javascript
import { useApiCall } from '../hooks/useApiCall';
import { studentService } from '../utils/api/services/studentService';

const StudentList = () => {
  const {
    data: students,
    loading,
    error,
    execute: fetchStudents
  } = useApiCall(studentService.getAll, {
    showSuccessToast: false,
    showErrorToast: true,
    retries: 3
  });
  
  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);
  
  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;
  
  return (
    <div>
      {students?.map(student => (
        <div key={student.id}>{student.name}</div>
      ))}
    </div>
  );
};
```

### Paginated API Calls

```javascript
import { usePaginatedApiCall } from '../hooks/useApiCall';

const PaginatedStudents = () => {
  const {
    data: response,
    loading,
    pagination,
    goToPage,
    changeLimit
  } = usePaginatedApiCall(studentService.getPaginated, {
    initialPage: 1,
    initialLimit: 10
  });
  
  return (
    <div>
      {response?.data?.map(student => (
        <div key={student.id}>{student.name}</div>
      ))}
      
      <Pagination
        pagination={pagination}
        onPageChange={goToPage}
      />
    </div>
  );
};
```

### Local Storage Management

```javascript
import { useLocalStorage, useLocalStorageArray } from '../hooks/useLocalStorage';

const UserPreferences = () => {
  const [preferences, setPreferences] = useLocalStorage('userPrefs', {
    theme: 'light',
    language: 'km'
  });
  
  const {
    array: recentSearches,
    addItem: addSearch,
    removeItem: removeSearch
  } = useLocalStorageArray('recentSearches', []);
  
  const updateTheme = (theme) => {
    setPreferences(prev => ({ ...prev, theme }));
  };
  
  return (
    <div>
      <button onClick={() => updateTheme('dark')}>
        Dark Theme
      </button>
    </div>
  );
};
```

## Utility Functions

### Data Formatting

```javascript
import { formatDate, formatNumber, formatFileSize } from '../utils/formatters';

const MyComponent = ({ student }) => {
  return (
    <div>
      <p>Born: {formatDate(student.dateOfBirth, 'MMM dd, yyyy')}</p>
      <p>Total Points: {formatNumber(student.points)}</p>
      <p>Avatar Size: {formatFileSize(student.avatarSize)}</p>
    </div>
  );
};
```

### Validation

```javascript
import { isValidEmail, validatePassword, validateRequiredFields } from '../utils/validation';

const LoginForm = () => {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [errors, setErrors] = useState({});
  
  const validateForm = () => {
    const newErrors = {};
    
    if (!isValidEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    const passwordValidation = validatePassword(formData.password);
    if (!passwordValidation.isValid) {
      newErrors.password = passwordValidation.messages[0];
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      if (validateForm()) {
        // Submit form
      }
    }}>
      {/* Form fields */}
    </form>
  );
};
```

### Helper Functions

```javascript
import { debounce, groupBy, sortBy } from '../utils/helpers';

const SearchableList = ({ items }) => {
  const [searchTerm, setSearchTerm] = useState('');
  
  // Debounce search to avoid excessive API calls
  const debouncedSearch = debounce((term) => {
    // Perform search
  }, 300);
  
  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm]);
  
  // Group items by category
  const groupedItems = groupBy(items, 'category');
  
  // Sort items by multiple criteria
  const sortedItems = sortBy(items, [
    { key: 'priority', direction: 'desc' },
    { key: 'name', direction: 'asc' }
  ]);
  
  return (
    <div>
      <input
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        placeholder="Search..."
      />
      {/* Render sorted/grouped items */}
    </div>
  );
};
```

## Error Handling

### Using Error Handler Utilities

```javascript
import { handleError, withErrorBoundary } from '../utils/errorHandler';
import { useToast } from '../contexts/ToastContext';

const MyComponent = () => {
  const { showToast } = useToast();
  const { t } = useLanguage();
  
  // Wrapped API call with error handling
  const safeApiCall = withErrorBoundary(
    async (studentId) => {
      return await studentService.getById(studentId);
    },
    {
      showToast,
      t,
      context: 'StudentComponent',
      fallbackValue: null
    }
  );
  
  const fetchStudent = async (id) => {
    try {
      const student = await safeApiCall(id);
      // Handle success
    } catch (error) {
      // Error is already handled by withErrorBoundary
    }
  };
  
  return <div>...</div>;
};
```

### Custom Error Handling

```javascript
import { parseError, ERROR_CODES } from '../utils/errorHandler';

const handleApiError = (error) => {
  const parsedError = parseError(error, t);
  
  switch (parsedError.code) {
    case ERROR_CODES.UNAUTHORIZED:
      // Redirect to login
      break;
    case ERROR_CODES.VALIDATION_ERROR:
      // Show form validation errors
      break;
    default:
      // Show generic error message
      showToast({
        type: 'error',
        message: parsedError.message
      });
  }
};
```

## Creating New Components

### Basic Component Structure

```javascript
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { cn } from '../../utils/helpers';

export default function MyComponent({ 
  className = '',
  variant = 'default',
  children,
  ...props 
}) {
  const { t } = useLanguage();
  
  return (
    <div
      className={cn(
        'base-styles',
        variant === 'primary' && 'primary-styles',
        className
      )}
      {...props}
    >
      <h2>{t('componentTitle')}</h2>
      {children}
    </div>
  );
}
```

### Form Components

```javascript
import { useForm } from '../../hooks';
import { validateRequiredFields } from '../../utils/validation';

export default function MyForm({ onSubmit }) {
  const { t } = useLanguage();
  
  const {
    values,
    errors,
    handleChange,
    handleSubmit,
    setFieldError
  } = useForm({
    name: '',
    email: ''
  }, async (formData) => {
    // Validate
    const validation = validateRequiredFields(formData, ['name', 'email']);
    if (!validation.isValid) {
      Object.keys(validation.errors).forEach(field => {
        setFieldError(field, validation.errors[field]);
      });
      return;
    }
    
    // Submit
    await onSubmit(formData);
  });
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        name="name"
        value={values.name}
        onChange={handleChange}
        placeholder={t('name')}
      />
      {errors.name && <span className="error">{errors.name}</span>}
      
      <button type="submit">{t('submit')}</button>
    </form>
  );
}
```

## Best Practices

### Component Design
1. **Single Responsibility**: Each component should have one clear purpose
2. **Composition over Inheritance**: Use composition to build complex components
3. **Props Interface**: Define clear, well-documented props
4. **Default Values**: Provide sensible defaults for optional props

### Performance
1. **React.memo**: Use for components that receive static props
2. **useCallback**: For event handlers passed to child components
3. **useMemo**: For expensive calculations
4. **Code Splitting**: Split large components into smaller chunks

### Accessibility
1. **Semantic HTML**: Use appropriate HTML elements
2. **ARIA Labels**: Provide screen reader support
3. **Keyboard Navigation**: Ensure keyboard accessibility
4. **Color Contrast**: Maintain sufficient color contrast

### Testing
1. **Unit Tests**: Test component behavior in isolation
2. **Integration Tests**: Test component interactions
3. **Accessibility Tests**: Verify accessibility compliance
4. **Visual Regression**: Test visual consistency

## Common Patterns

### Modal Pattern

```javascript
import { useState } from 'react';
import Modal from '../ui/Modal';

const MyPageWithModal = () => {
  const [showModal, setShowModal] = useState(false);
  const { t } = useLanguage();
  
  return (
    <div>
      <button onClick={() => setShowModal(true)}>
        {t('openModal')}
      </button>
      
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={t('modalTitle')}
      >
        <p>{t('modalContent')}</p>
      </Modal>
    </div>
  );
};
```

### List with Actions Pattern

```javascript
const ItemList = ({ items, onEdit, onDelete }) => {
  const { t } = useLanguage();
  
  return (
    <div className="space-y-2">
      {items.map(item => (
        <div key={item.id} className="flex justify-between items-center p-4 border rounded">
          <span>{item.name}</span>
          <div className="flex space-x-2">
            <button onClick={() => onEdit(item)}>
              {t('edit')}
            </button>
            <button onClick={() => onDelete(item.id)}>
              {t('delete')}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
```

### Search and Filter Pattern

```javascript
const SearchableFilterableList = ({ items }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategory, setFilterCategory] = useState('all');
  const { t } = useLanguage();
  
  const filteredItems = useMemo(() => {
    return items
      .filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(item => 
        filterCategory === 'all' || item.category === filterCategory
      );
  }, [items, searchTerm, filterCategory]);
  
  return (
    <div>
      <div className="flex space-x-4 mb-4">
        <input
          type="text"
          placeholder={t('search')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <select
          value={filterCategory}
          onChange={(e) => setFilterCategory(e.target.value)}
        >
          <option value="all">{t('allCategories')}</option>
          <option value="academic">{t('academic')}</option>
          <option value="sports">{t('sports')}</option>
        </select>
      </div>
      
      <ItemList items={filteredItems} />
    </div>
  );
};
```

This implementation guide provides the foundation for extending and maintaining the Teacher Portal application. Follow these patterns and practices to ensure consistency and maintainability as the application grows.