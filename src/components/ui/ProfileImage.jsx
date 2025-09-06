import { useState, useEffect } from 'react';
import { User, ImageIcon, AlertCircle } from 'lucide-react';
import { utils } from '../../utils/api';
import { loadImageWithFallback } from '../../utils/httpsHandler';
import noProfile from '../../assets/no-profile.png';

/**
 * ProfileImage Component
 * A reusable component that handles profile image display with fallback states
 * 
 * @param {Object} props
 * @param {Object} props.user - User object containing profile picture data
 * @param {string} props.size - Size variant: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'custom'
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.alt - Alt text for the image
 * @param {boolean} props.showBorder - Whether to show border (default: true)
 * @param {string} props.borderColor - Border color class (default: 'border-gray-300')
 * @param {string} props.fallbackType - Type of fallback: 'icon' | 'image' | 'initials' (default: 'icon')
 * @param {Function} props.onClick - Click handler
 * @param {boolean} props.clickable - Whether the image is clickable
 * @param {string} props.customSize - Custom size classes when size='custom'
 */
export default function ProfileImage({ 
  user,
  size = 'md',
  className = '',
  alt = 'Profile',
  showBorder = true,
  borderColor = 'border-gray-300',
  fallbackType = 'icon',
  onClick,
  clickable = false,
  customSize = ''
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [verifiedImageUrl, setVerifiedImageUrl] = useState('');

  // Size mappings
  const sizeMap = {
    xs: 'h-6 w-6',
    sm: 'h-8 w-8',  
    md: 'h-10 w-10',
    lg: 'h-16 w-16',
    xl: 'h-20 w-20',
    custom: customSize
  };

  // Icon size mappings
  const iconSizeMap = {
    xs: 'h-3 w-3',
    sm: 'h-4 w-4',
    md: 'h-5 w-5', 
    lg: 'h-8 w-8',
    xl: 'h-10 w-10',
    custom: customSize.replace(/h-\d+|w-\d+/g, 'h-1/2 w-1/2')
  };

  const sizeClasses = sizeMap[size] || sizeMap.md;
  const iconSizeClasses = iconSizeMap[size] || iconSizeMap.md;
  const borderClasses = showBorder ? `border-2 ${borderColor}` : '';
  const cursorClasses = clickable || onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : '';

  // Get profile picture URL
  const profilePictureUrl = user ? utils.user.getProfilePictureUrl(user) : '';

  // Verify image URL with HTTPS fallback
  useEffect(() => {
    if (profilePictureUrl) {
      setImageLoading(true);
      setImageError(false);
      
      loadImageWithFallback(profilePictureUrl)
        .then((workingUrl) => {
          setVerifiedImageUrl(workingUrl);
          setImageError(false);
        })
        .catch(() => {
          setImageError(true);
          setVerifiedImageUrl('');
        })
        .finally(() => {
          setImageLoading(false);
        });
    } else {
      setImageLoading(false);
      setImageError(false);
      setVerifiedImageUrl('');
    }
  }, [profilePictureUrl]);

  const hasProfilePicture = verifiedImageUrl && !imageError;

  // Generate initials from user name
  const getInitials = (user) => {
    if (!user) return 'U';
    
    const firstName = user.firstName || user.first_name || '';
    const lastName = user.lastName || user.last_name || '';
    const username = user.username || '';
    
    if (firstName && lastName) {
      return `${firstName[0]}${lastName[0]}`.toUpperCase();
    }
    
    if (firstName) {
      return firstName[0].toUpperCase();
    }
    
    if (username) {
      return username[0].toUpperCase();
    }
    
    return 'U';
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleClick = () => {
    if (onClick) {
      onClick();
    }
  };

  // Loading state
  if (imageLoading && hasProfilePicture) {
    return (
      <div 
        className={`${sizeClasses} rounded-full bg-gray-200 ${borderClasses} ${cursorClasses} flex items-center justify-center ${className}`}
        onClick={handleClick}
      >
        <div className="animate-pulse">
          <div className={`${iconSizeClasses} bg-gray-300 rounded`}></div>
        </div>
      </div>
    );
  }

  // If we have a valid profile picture URL and no error, show the image
  if (hasProfilePicture) {
    return (
      <div 
        className={`${sizeClasses} rounded-full ${borderClasses} ${cursorClasses} overflow-hidden relative ${className}`}
        onClick={handleClick}
      >
        <img
          src={verifiedImageUrl}
          alt={alt}
          className="h-full w-full object-cover absolute inset-0"
          onError={handleImageError}
          onLoad={handleImageLoad}
        />
      </div>
    );
  }

  // Fallback rendering based on fallbackType
  const renderFallback = () => {
    switch (fallbackType) {
      case 'image':
        return (
          <img
            src={noProfile}
            alt={alt}
            className="h-full w-full object-cover absolute inset-0"
            onError={() => {
              // If even the fallback image fails, switch to icon fallback
              setImageError(true);
            }}
          />
        );
        
      case 'initials': {
        const initials = getInitials(user);
        return (
          <span className="text-gray-600 font-medium text-sm select-none">
            {initials}
          </span>
        );
      }
        
      case 'icon':
      default:
        return <User className={`${iconSizeClasses} text-gray-500`} />;
    }
  };

  // Show error state with different icon
  if (imageError && fallbackType === 'image') {
    return (
      <div 
        className={`${sizeClasses} rounded-full bg-gray-100 ${borderClasses} ${cursorClasses} flex items-center justify-center ${className}`}
        onClick={handleClick}
      >
        <User className={`${iconSizeClasses} text-gray-500`} />
      </div>
    );
  }

  // Default fallback container
  return (
    <div 
      className={`${sizeClasses} rounded-full bg-gradient-to-br from-gray-100 to-gray-200 ${borderClasses} ${cursorClasses} flex items-center justify-center relative overflow-hidden ${className}`}
      onClick={handleClick}
    >
      {renderFallback()}
    </div>
  );
}

// Export additional variants for common use cases
export const SmallProfileImage = (props) => (
  <ProfileImage {...props} size="sm" />
);

export const LargeProfileImage = (props) => (
  <ProfileImage {...props} size="lg" />
);

export const ProfileImageWithInitials = (props) => (
  <ProfileImage {...props} fallbackType="initials" />
);

export const ProfileImageWithFallback = (props) => (
  <ProfileImage {...props} fallbackType="image" />
);