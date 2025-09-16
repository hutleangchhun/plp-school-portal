// UI constants for consistent styling and behavior
export const PAGINATION_DEFAULTS = {
  itemsPerPage: 10,
  itemsPerPageOptions: [5, 10, 20, 50],
  maxPagesToShow: 5
};

// Toast notification types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error', 
  WARNING: 'warning',
  INFO: 'info'
};

// Modal sizes
export const MODAL_SIZES = {
  SM: 'sm',
  MD: 'md', 
  LG: 'lg',
  XL: 'xl',
  FULL: 'full'
};

// Button variants
export const BUTTON_VARIANTS = {
  PRIMARY: 'primary',
  SECONDARY: 'secondary',
  DANGER: 'danger',
  SUCCESS: 'success',
  WARNING: 'warning',
  GHOST: 'ghost',
  OUTLINE: 'outline'
};

// Loading states
export const LOADING_STATES = {
  IDLE: 'idle',
  LOADING: 'loading',
  SUCCESS: 'success',
  ERROR: 'error'
};

// Form validation patterns
export const VALIDATION_PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE: /^[0-9+\-\s()]+$/,
  USERNAME: /^[a-zA-Z0-9_]{3,20}$/,
  PASSWORD: /^.{6,}$/
};

// File types for uploads
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
export const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

// Export formats
export const EXPORT_FORMATS = {
  EXCEL: 'xlsx',
  CSV: 'csv', 
  PDF: 'pdf'
};

// Date formats
export const DATE_FORMATS = {
  SHORT: 'MM/dd/yyyy',
  LONG: 'MMMM do, yyyy',
  ISO: 'yyyy-MM-dd',
  DISPLAY: 'MMM dd, yyyy'
};