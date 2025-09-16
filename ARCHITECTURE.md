# Teacher Portal - Architecture Documentation

## Overview

The Teacher Portal is a comprehensive React-based application designed for educational institutions in Cambodia. It provides teachers with tools to manage students, classes, attendance, achievements, and generate reports. The application features complete Khmer-English bilingual support and a modular, maintainable architecture.

## Project Structure

```
src/
├── components/           # Reusable UI components
│   ├── common/          # Common components (LanguageSwitcher, etc.)
│   ├── forms/           # Form-related components
│   ├── layout/          # Layout components (Sidebar, Navbar, etc.)
│   └── ui/              # Basic UI components (Button, Modal, etc.)
├── constants/           # Application constants and configurations
│   ├── achievements.js  # Achievement categories and levels
│   ├── grades.js        # Grade level definitions
│   ├── ui.js           # UI-related constants
│   └── index.js        # Main constants export
├── contexts/            # React contexts for state management
│   ├── LanguageContext.jsx  # Internationalization context
│   └── ToastContext.jsx     # Toast notification context
├── hooks/               # Custom React hooks
│   ├── useApiCall.js    # API call management
│   ├── useLocalStorage.js   # localStorage utilities
│   └── index.js         # Hook exports and utility hooks
├── locales/             # Internationalization files
│   ├── en.js           # English translations
│   ├── km.js           # Khmer translations
│   └── index.js        # Locale exports
├── pages/               # Page components
│   ├── achievements/    # Achievement management
│   ├── attendance/      # Attendance tracking
│   ├── auth/           # Authentication pages
│   ├── classes/        # Class management
│   ├── dashboard/      # Dashboard and analytics
│   ├── profile/        # User profile management
│   ├── reports/        # Report generation
│   └── students/       # Student management
├── utils/               # Utility functions
│   ├── api/            # API layer and services
│   ├── errorHandler.js # Error handling utilities
│   ├── formatters.js   # Data formatting functions
│   ├── helpers.js      # General helper functions
│   └── validation.js   # Form and data validation
└── assets/             # Static assets (images, icons, etc.)
```

## Key Features

### 1. Internationalization (i18n)
- **Bilingual Support**: Complete Khmer and English language support
- **Dynamic Language Switching**: Real-time language switching without page reload
- **Persistent Language Preference**: User's language choice saved in localStorage
- **Translation Context**: Centralized translation management via LanguageContext

### 2. Responsive Design
- **Mobile-First Approach**: Optimized for mobile devices with responsive layouts
- **Adaptive UI**: Dynamic sidebar collapse and mobile-friendly navigation
- **Touch-Friendly**: Large touch targets and intuitive mobile interactions

### 3. Modular Architecture
- **Component Reusability**: Shared UI components with consistent styling
- **Custom Hooks**: Reusable logic for API calls, storage, and state management
- **Utility Functions**: Centralized helper functions for common operations
- **Constants Management**: Organized constants for better maintainability

### 4. Error Handling
- **Centralized Error Handling**: Comprehensive error parsing and user-friendly messages
- **Toast Notifications**: Non-intrusive error and success notifications
- **Retry Mechanisms**: Automatic retry for failed API calls with exponential backoff
- **Error Boundaries**: Component-level error containment

### 5. API Layer
- **Service-Oriented Architecture**: Organized API services by domain
- **Request/Response Interceptors**: Automatic authentication and error handling
- **Caching**: Intelligent caching for frequently accessed data
- **Loading States**: Built-in loading state management

## Technology Stack

### Core Technologies
- **React 19**: Latest React with improved performance and features
- **Vite**: Fast build tool and development server
- **React Router Dom 7**: Client-side routing
- **Tailwind CSS**: Utility-first CSS framework
- **Lucide React**: Consistent icon library

### UI Components
- **Radix UI**: Accessible component primitives
- **React Day Picker**: Date selection components
- **React Hook Form**: Efficient form handling

### Data & State Management
- **Axios**: HTTP client for API communication
- **React Context**: State management for global app state
- **Custom Hooks**: Encapsulated state logic

### Development Tools
- **ESLint**: Code linting and quality checks
- **PostCSS**: CSS processing and optimization
- **Autoprefixer**: Automatic vendor prefixing

## Development Guidelines

### Code Organization
1. **Component Structure**: Each component should have a single responsibility
2. **Custom Hooks**: Extract reusable logic into custom hooks
3. **Constants**: Use constants for magic numbers and repeated values
4. **Utils**: Create utility functions for complex operations

### Naming Conventions
- **Components**: PascalCase (e.g., `StudentManagement.jsx`)
- **Files**: camelCase for utilities, PascalCase for components
- **Functions**: camelCase (e.g., `fetchStudents`)
- **Constants**: SCREAMING_SNAKE_CASE (e.g., `GRADE_LEVELS`)

### Translation Keys
- **Descriptive Keys**: Use descriptive keys instead of English text
- **Namespace Organization**: Group related translations together
- **Consistent Naming**: Use consistent patterns across languages

### API Integration
- **Service Layer**: Use dedicated service files for API endpoints
- **Error Handling**: Always handle errors gracefully
- **Loading States**: Provide feedback during async operations
- **Data Validation**: Validate data at API boundaries

## Performance Optimizations

### Bundle Optimization
- **Code Splitting**: Dynamic imports for route-based splitting
- **Tree Shaking**: Eliminate unused code from bundles
- **Asset Optimization**: Optimized images and static assets

### Runtime Performance
- **React.memo**: Prevent unnecessary re-renders
- **useCallback/useMemo**: Optimize expensive computations
- **Lazy Loading**: Load components and data on demand
- **Virtual Scrolling**: For large data sets (planned)

### Caching Strategy
- **API Response Caching**: Cache frequently accessed data
- **localStorage**: Persist user preferences and temporary data
- **Browser Caching**: Leverage browser caching for static assets

## Security Considerations

### Data Protection
- **Input Sanitization**: Clean user inputs to prevent XSS
- **Authentication**: Secure authentication token management
- **HTTPS**: Enforce secure communication
- **CORS**: Proper cross-origin resource sharing configuration

### User Privacy
- **Data Minimization**: Only collect necessary user data
- **Local Storage**: Sensitive data never stored in localStorage
- **Session Management**: Proper session timeout and cleanup

## Testing Strategy

### Unit Testing
- **Component Testing**: Test individual component behavior
- **Hook Testing**: Test custom hooks in isolation
- **Utility Testing**: Test utility functions with various inputs

### Integration Testing
- **API Integration**: Test API service integrations
- **Context Testing**: Test context providers and consumers
- **Route Testing**: Test navigation and route protection

### End-to-End Testing
- **User Workflows**: Test complete user journeys
- **Cross-Browser**: Ensure compatibility across browsers
- **Mobile Testing**: Test on actual mobile devices

## Deployment

### Build Process
1. **Linting**: Check code quality with ESLint
2. **Building**: Create optimized production build
3. **Asset Optimization**: Minimize and compress assets
4. **Deployment**: Deploy to hosting platform (Vercel)

### Environment Configuration
- **Development**: Local development with hot reload
- **Staging**: Pre-production testing environment
- **Production**: Live application with performance monitoring

## Future Enhancements

### Planned Features
- **Real-time Updates**: WebSocket integration for live data
- **Offline Support**: Service worker for offline functionality
- **Advanced Analytics**: Enhanced reporting and data visualization
- **Mobile App**: React Native mobile application

### Performance Improvements
- **Virtual Scrolling**: For handling large datasets
- **Image Optimization**: Advanced image compression and lazy loading
- **PWA Features**: Progressive web app capabilities

### Developer Experience
- **Storybook**: Component development and documentation
- **Testing Coverage**: Comprehensive test coverage
- **CI/CD Pipeline**: Automated testing and deployment

## Contributing

### Development Setup
1. Clone the repository
2. Install dependencies: `npm install`
3. Start development server: `npm run dev`
4. Run tests: `npm test`
5. Build for production: `npm run build`

### Code Review Process
1. Create feature branch from main
2. Implement changes following guidelines
3. Write/update tests as needed
4. Submit pull request with description
5. Address review feedback
6. Merge after approval

### Best Practices
- Write clear, descriptive commit messages
- Keep components small and focused
- Add translations for new text
- Update documentation for new features
- Follow the established file structure

## Support and Maintenance

### Monitoring
- **Error Tracking**: Monitor application errors in production
- **Performance Metrics**: Track Core Web Vitals and user experience
- **User Analytics**: Understand user behavior and feature usage

### Maintenance Tasks
- **Dependency Updates**: Regular updates of npm packages
- **Security Patches**: Prompt application of security updates
- **Performance Audits**: Regular performance reviews and optimizations
- **Code Refactoring**: Continuous improvement of code quality

This architecture document serves as a comprehensive guide for developers working on the Teacher Portal application. It should be updated as the application evolves and new features are added.