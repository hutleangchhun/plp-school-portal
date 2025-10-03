# Infinite Loop Prevention Guide

This document outlines best practices to prevent infinite loops in React components, especially when working with API calls.

## Common Causes of Infinite Loops

### 1. **useEffect with Missing Dependencies**
```javascript
// ❌ BAD: Missing dependencies
useEffect(() => {
  fetchData(userId); // userId not in deps
}, []);

// ✅ GOOD: Include all dependencies
useEffect(() => {
  fetchData(userId);
}, [userId, fetchData]);
```

### 2. **Object/Array in Dependency Array**
```javascript
// ❌ BAD: Object recreated every render
const filters = { name: searchTerm, age: 25 };
useEffect(() => {
  fetchData(filters);
}, [filters]); // filters is a new object every render!

// ✅ GOOD: Use individual primitives or useMemo
useEffect(() => {
  fetchData({ name: searchTerm, age: 25 });
}, [searchTerm]); // Only re-run when searchTerm changes

// ✅ GOOD: Or use useMemo for complex objects
const filters = useMemo(() => ({ name: searchTerm, age: 25 }), [searchTerm]);
useEffect(() => {
  fetchData(filters);
}, [filters]);
```

### 3. **setState Inside useEffect Without Proper Deps**
```javascript
// ❌ BAD: Can cause infinite loop
useEffect(() => {
  setCount(count + 1); // count changes → effect runs → count changes...
}, [count]);

// ✅ GOOD: Use functional update
useEffect(() => {
  setCount(prev => prev + 1);
}, []); // No dependency on count
```

### 4. **API Calls in useEffect**
```javascript
// ❌ BAD: Function recreated every render
const fetchData = async () => {
  const data = await api.getData();
  setData(data);
};

useEffect(() => {
  fetchData();
}, [fetchData]); // fetchData is new every render!

// ✅ GOOD: Use useCallback or useStableCallback
const fetchData = useStableCallback(async () => {
  const data = await api.getData();
  setData(data);
}, []); // Stable reference

useEffect(() => {
  fetchData();
}, [fetchData]); // fetchData is stable
```

## Best Practices

### 1. **Use useStableCallback for API Functions**
```javascript
import { useStableCallback } from '../../utils/reactOptimization';

const fetchClasses = useStableCallback(async () => {
  const response = await classService.getClasses();
  setClasses(response.data);
}, [/* dependencies that should trigger re-creation */]);
```

### 2. **Use useRenderTracker in Development**
```javascript
import { useRenderTracker } from '../../utils/reactOptimization';

function MyComponent() {
  // This will warn in console if component renders > 10 times
  useRenderTracker('MyComponent');

  // ... rest of component
}
```

### 3. **Memoize Complex Objects**
```javascript
// Use useStableObject for objects
const filterParams = useStableObject({
  search: searchTerm,
  page: currentPage,
  limit: pageSize
});

useEffect(() => {
  fetchData(filterParams);
}, [filterParams]);
```

### 4. **Avoid Calling setState in Render**
```javascript
// ❌ BAD: setState in render
function Component() {
  const [count, setCount] = useState(0);
  setCount(count + 1); // Infinite loop!
  return <div>{count}</div>;
}

// ✅ GOOD: Use useEffect
function Component() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    setCount(count + 1);
  }, []); // Run once

  return <div>{count}</div>;
}
```

### 5. **Prevent Multiple Simultaneous API Calls**
```javascript
const fetchData = useStableCallback(async () => {
  // Prevent concurrent calls
  if (fetchingRef.current) {
    console.log('Already fetching, skipping...');
    return;
  }

  fetchingRef.current = true;
  try {
    const data = await api.getData();
    setData(data);
  } finally {
    fetchingRef.current = false;
  }
}, []);
```

### 6. **Use Cleanup in useEffect**
```javascript
useEffect(() => {
  let cancelled = false;

  const fetchData = async () => {
    const data = await api.getData();
    if (!cancelled) {
      setData(data);
    }
  };

  fetchData();

  // Cleanup: prevent setState on unmounted component
  return () => {
    cancelled = true;
  };
}, []);
```

## Debugging Tools

### 1. **Console Warnings**
Watch for these console warnings:
- `⚠️ Component MyComponent has rendered 15 times. Check for infinite loops!`
- `🚨 Component MyComponent has rendered 25 times. INFINITE LOOP DETECTED!`

### 2. **React DevTools Profiler**
1. Open React DevTools
2. Go to "Profiler" tab
3. Record a session
4. Look for components with many renders

### 3. **Browser Performance Tab**
1. Open Chrome DevTools
2. Go to Performance tab
3. Record while app is running
4. Look for long-running scripts or excessive function calls

## Quick Checklist

Before deploying, verify:

- [ ] All `useEffect` hooks have proper dependency arrays
- [ ] No objects/arrays in dependency arrays (unless memoized)
- [ ] API call functions are wrapped in `useCallback` or `useStableCallback`
- [ ] No `setState` calls in render (only in effects/callbacks)
- [ ] `useRenderTracker` added to main components (development)
- [ ] No excessive console warnings about re-renders
- [ ] Cleanup functions added to effects with async operations

## Monitoring in Production

### Enable Render Tracking (Development Only)
The `useRenderTracker` hook automatically logs warnings:
- After 10 renders: Warning
- After 20 renders: Error

### Example Implementation
```javascript
export default function MyComponent() {
  // Development only - removed in production build
  useRenderTracker('MyComponent');

  // ... component code
}
```

## Common Patterns in This Codebase

### Pattern 1: Stable API Calls
```javascript
const fetchData = useStableCallback(async () => {
  // API call logic
}, [/* minimal deps */]);

useEffect(() => {
  fetchData();
}, [fetchData]);
```

### Pattern 2: Debounced Effects
```javascript
const [searchTerm, setSearchTerm] = useState('');
const [debouncedSearch, setDebouncedSearch] = useState('');

useEffect(() => {
  const timer = setTimeout(() => {
    setDebouncedSearch(searchTerm);
  }, 300);

  return () => clearTimeout(timer);
}, [searchTerm]);

useEffect(() => {
  if (debouncedSearch) {
    fetchData(debouncedSearch);
  }
}, [debouncedSearch, fetchData]);
```

### Pattern 3: Prevent Concurrent Fetches
```javascript
const fetchingRef = useRef(false);

const fetchData = useStableCallback(async () => {
  if (fetchingRef.current) return;

  fetchingRef.current = true;
  try {
    // API call
  } finally {
    fetchingRef.current = false;
  }
}, []);
```

## Resources

- [React Docs: useEffect](https://react.dev/reference/react/useEffect)
- [React Docs: useCallback](https://react.dev/reference/react/useCallback)
- [React Docs: useMemo](https://react.dev/reference/react/useMemo)
- [Overreacted: A Complete Guide to useEffect](https://overreacted.io/a-complete-guide-to-useeffect/)
