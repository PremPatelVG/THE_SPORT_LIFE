import React from 'react';
import logoSvg from '../assets/logo_dev_auth.svg';
import logoTextSvg from '../assets/logo_text_auth.svg';

/**
 * LogoAuth Component - Specialized Logo for Login/Signup Pages
 * Optimized for display on gradient backgrounds with white text
 * @param {Object} props
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg', 'xl' (default: 'lg')
 * @param {boolean} props.showText - Whether to show text beside logo (default: true)
 * @param {string} props.className - Additional CSS classes
 */
const LogoAuth = ({ 
  size = 'lg', 
  showText = true,
  className = '' 
}) => {
  // Size configurations for auth pages
  const sizes = {
    sm: {
      logo: { width: 48, height: 48 },
      text: {
        the: 'text-[10px]',
        sport: 'text-xl',
      }
    },
    md: {
      logo: { width: 64, height: 64 },
      text: {
        the: 'text-xs',
        sport: 'text-2xl',
      }
    },
    lg: {
      logo: { width: 80, height: 80 },
      text: {
        the: 'text-sm',
        sport: 'text-3xl',
      }
    },
    xl: {
      logo: { width: 120, height: 120 },
      text: {
        the: 'text-base',
        sport: 'text-5xl',
      }
    },
  };

  const currentSize = sizes[size] || sizes.lg;

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* Logo Image */}
      <div className="flex-shrink-0">
        <img 
          src={logoSvg}
          alt="The SportLife Logo"
          width={100}
          height={100}
        />
      </div>
      
      {/* Text beside logo - SVG Text Image */}
      {showText && (
        <div className="flex-shrink-0">
          <img 
            src={logoTextSvg}
            alt="The SportLife Text"
            className="h-18 w-auto"
          />
        </div>
      )}
    </div>
  );
};

export default LogoAuth;
