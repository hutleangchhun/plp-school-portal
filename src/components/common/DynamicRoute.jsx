import { Suspense } from 'react';
import { Navigate } from 'react-router-dom';
import { getComponent, getRouteConfig } from '../../utils/componentLoader';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useLanguage } from '../../contexts/LanguageContext';
import { api } from '../../utils/api';
import { hasRouteAccess } from '../../utils/routePermissions';

/**
 * DynamicRoute Component
 * Handles dynamic component loading with authentication and layout support
 * 
 * @param {Object} props
 * @param {string} props.path - Route path
 * @param {Object} props.user - Current user object
 * @param {Object} props.additionalProps - Additional props to pass to the component
 */
export default function DynamicRoute({ 
  path, 
  user, 
  additionalProps = {} 
}) {
  const { t } = useLanguage();
  const config = getRouteConfig(path);
  const Component = getComponent(config.component);

  // Check authentication requirement
  if (config.requiresAuth && !api.auth.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  // Check if user is authenticated but trying to access login
  if (!config.requiresAuth && api.auth.isAuthenticated()) {
    return <Navigate to="/dashboard" replace />;
  }

  // Loading fallback component
  const LoadingFallback = () => (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col items-center space-y-4">
        <LoadingSpinner size="lg" />
        <p className="text-gray-600">{t('loading') || 'Loading...'}</p>
      </div>
    </div>
  );

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Component 
        user={user} 
        {...additionalProps}
      />
    </Suspense>
  );
}

/**
 * ProtectedRoute Component
 * Wraps routes with role-based access control
 */
export function ProtectedRoute({ children, path, user, fallbackPath }) {
  const isAuthenticated = api.auth.isAuthenticated();

  // Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Check if user has access to this specific route
  if (!hasRouteAccess(path, user)) {
    // Show 404 page when user tries to access a route they don't have permission for
    return <Navigate to="/404" replace />;
  }

  return children;
}

/**
 * HOC for creating protected routes
 * @param {React.Component} Component - Component to protect
 * @param {Array} allowedRoleIds - Array of allowed role IDs
 */
export const withAuth = (Component, allowedRoleIds = []) => {
  return function AuthenticatedComponent(props) {
    const isAuthenticated = api.auth.isAuthenticated();
    
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }

    // Check role-based access if roles are specified
    if (allowedRoleIds.length > 0 && props.user) {
      if (!allowedRoleIds.includes(props.user.roleId)) {
        return <Navigate to="/dashboard" replace />;
      }
    }

    return <Component {...props} />;
  };
};

/**
 * HOC for adding loading states to components
 * @param {React.Component} Component - Component to add loading to
 * @param {string} loadingText - Custom loading text
 */
export const withLoading = (Component, loadingText) => {
  return function LoadingComponent(props) {
    const { t } = useLanguage();
    
    return (
      <Suspense fallback={
        <div className="flex items-center justify-center min-h-[200px] bg-white rounded-lg">
          <div className="flex flex-col items-center space-y-4">
            <LoadingSpinner />
            <p className="text-gray-600">
              {loadingText ? t(loadingText) : t('loading') || 'Loading...'}
            </p>
          </div>
        </div>
      }>
        <Component {...props} />
      </Suspense>
    );
  };
};

/**
 * Error boundary for dynamic routes
 */
export const DynamicRouteErrorBoundary = ({ children, fallback }) => {
  // You can implement error boundary logic here
  // For now, just return children
  return children;
};