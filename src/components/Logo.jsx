import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import logoSvg from '../assets/logo_dev.svg';
import logoTextSvg from '../assets/logo_text.svg';

/**
 * Logo Component - Reusable SportLife Logo
 * @param {Object} props
 * @param {string} props.size - Size variant: 'sm', 'md', 'lg', 'xl' (default: 'md')
 * @param {boolean} props.showText - Whether to show text beside logo (default: true)
 * @param {boolean} props.clickable - Whether logo is clickable (default: true)
 * @param {string} props.className - Additional CSS classes
 */
const Logo = ({ 
  size = 'md', 
  showText = true, 
  clickable = true,
  className = '' 
}) => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  // Size configurations
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

  const currentSize = sizes[size] || sizes.md;

  const handleClick = () => {
    if (clickable) {
      navigate(isAuthenticated ? '/dashboard' : '/tournaments');
    }
  };

  return (
    <div 
      className={`flex items-center gap-2 ${clickable ? 'cursor-pointer group' : ''} ${className}`}
      onClick={handleClick}
    >
      {/* Logo Image */}
      <div className={clickable ? 'group-hover:scale-105 transition-transform' : ''}>
        <img 
          src={logoSvg}
          alt="The SportLife Logo"
          width={currentSize.logo.width}
          height={currentSize.logo.height}
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

export default Logo;
