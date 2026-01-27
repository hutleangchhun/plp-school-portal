import React from 'react';

/**
 * KhmerBorder Component
 * Traditional Khmer-inspired decorative border for certificates
 * @param {string} primaryColor - Main border color (default: green)
 * @param {string} accentColor - Accent/gold color for decorations
 * @param {number} strokeWidth - Border thickness
 */
export const KhmerBorder = ({ 
  primaryColor = "#059669",  // Emerald green
  accentColor = "#d4af37",   // Gold
  strokeWidth = 8 
}) => (
  <svg 
    className="absolute inset-0 w-full h-full pointer-events-none" 
    viewBox="0 0 800 600"
    preserveAspectRatio="none"
  >
    <defs>
      {/* Golden gradient for traditional look */}
      <linearGradient id="khmerGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor={accentColor} stopOpacity="1" />
        <stop offset="50%" stopColor="#f4e5c3" stopOpacity="1" />
        <stop offset="100%" stopColor={accentColor} stopOpacity="1" />
      </linearGradient>

      {/* Green gradient for depth */}
      <linearGradient id="khmerGreen" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor={primaryColor} stopOpacity="1" />
        <stop offset="50%" stopColor="#10b981" stopOpacity="1" />
        <stop offset="100%" stopColor={primaryColor} stopOpacity="1" />
      </linearGradient>

      {/* Lotus flower motif - traditional Khmer symbol */}
      <g id="lotusFlower">
        {/* Center circle */}
        <circle cx="10" cy="10" r="3" fill={accentColor} />
        {/* Petals */}
        <path d="M10,7 Q8,4 6,7 Q8,8 10,7" fill="url(#khmerGold)" opacity="0.9" />
        <path d="M10,7 Q12,4 14,7 Q12,8 10,7" fill="url(#khmerGold)" opacity="0.9" />
        <path d="M7,10 Q4,8 7,6 Q8,8 7,10" fill="url(#khmerGold)" opacity="0.9" />
        <path d="M13,10 Q16,8 13,6 Q12,8 13,10" fill="url(#khmerGold)" opacity="0.9" />
        <path d="M7,13 Q4,12 6,14 Q8,12 7,13" fill="url(#khmerGold)" opacity="0.9" />
        <path d="M13,13 Q16,12 14,14 Q12,12 13,13" fill="url(#khmerGold)" opacity="0.9" />
        <path d="M10,13 Q8,16 10,14 Q12,16 10,13" fill="url(#khmerGold)" opacity="0.9" />
        <path d="M10,13 Q8,10 10,12 Q12,10 10,13" fill="url(#khmerGold)" opacity="0.9" />
      </g>

      {/* Naga (serpent) curve - traditional Khmer motif */}
      <path 
        id="nagaCurve" 
        d="M0,0 Q10,-5 20,0 Q15,10 20,20 Q10,15 0,20" 
        fill="none"
        stroke="url(#khmerGold)"
        strokeWidth="2"
        opacity="0.8"
      />

      {/* Corner ornament with traditional elements */}
      <g id="cornerOrnament">
        {/* Outer decorative circle */}
        <circle cx="40" cy="40" r="25" fill={primaryColor} opacity="0.2" />
        
        {/* Inner decorative shape */}
        <circle cx="40" cy="40" r="18" fill="url(#khmerGreen)" opacity="0.6" />
        
        {/* Stupa-inspired triangle */}
        <path 
          d="M40,25 L35,40 L40,38 L45,40 Z" 
          fill="url(#khmerGold)"
          stroke={accentColor}
          strokeWidth="1"
        />
        
        {/* Curved decorations */}
        <path 
          d="M25,40 Q30,30 40,30 Q50,30 55,40" 
          fill="none"
          stroke="url(#khmerGold)"
          strokeWidth="2"
          opacity="0.8"
        />
        
        {/* Small lotus flowers around */}
        <use href="#lotusFlower" transform="translate(25, 25) scale(0.6)" />
        <use href="#lotusFlower" transform="translate(45, 25) scale(0.6)" />
        <use href="#lotusFlower" transform="translate(25, 45) scale(0.6)" />
        
        {/* Decorative dots */}
        <circle cx="40" cy="40" r="4" fill={accentColor} />
        <circle cx="30" cy="35" r="2" fill={accentColor} opacity="0.7" />
        <circle cx="50" cy="35" r="2" fill={accentColor} opacity="0.7" />
      </g>

      {/* Pattern for decorative lines */}
      <pattern id="decorativeDots" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
        <circle cx="10" cy="10" r="1.5" fill={accentColor} opacity="0.5" />
      </pattern>
    </defs>

    {/* Main outer border with gradient */}
    <rect 
      x={strokeWidth/2} 
      y={strokeWidth/2} 
      width={800 - strokeWidth} 
      height={600 - strokeWidth}
      fill="none"
      stroke="url(#khmerGreen)"
      strokeWidth={strokeWidth}
      rx="8"
    />

    {/* Inner decorative border with golden accent */}
    <rect 
      x={strokeWidth * 2} 
      y={strokeWidth * 2} 
      width={800 - strokeWidth * 4} 
      height={600 - strokeWidth * 4}
      fill="none"
      stroke="url(#khmerGold)"
      strokeWidth="3"
      rx="5"
    />

    {/* Thin innermost border with pattern */}
    <rect 
      x={strokeWidth * 2.5} 
      y={strokeWidth * 2.5} 
      width={800 - strokeWidth * 5} 
      height={600 - strokeWidth * 5}
      fill="none"
      stroke={accentColor}
      strokeWidth="1"
      rx="4"
      strokeDasharray="8,4"
      opacity="0.6"
    />

    {/* Corner ornaments */}
    <use href="#cornerOrnament" transform="translate(-20, -20)" />
    <use href="#cornerOrnament" transform="translate(780, -20) scale(-1, 1)" />
    <use href="#cornerOrnament" transform="translate(-20, 580) scale(1, -1)" />
    <use href="#cornerOrnament" transform="translate(780, 580) scale(-1, -1)" />

    {/* Decorative lotus flowers along borders */}
    <g opacity="0.7">
      {/* Top border */}
      {[...Array(12)].map((_, i) => (
        <use 
          key={`top-${i}`}
          href="#lotusFlower" 
          transform={`translate(${100 + i * 60}, ${strokeWidth * 2}) scale(0.8)`} 
        />
      ))}
      
      {/* Bottom border */}
      {[...Array(12)].map((_, i) => (
        <use 
          key={`bottom-${i}`}
          href="#lotusFlower" 
          transform={`translate(${100 + i * 60}, ${600 - strokeWidth * 2.5}) scale(0.8) rotate(180, 10, 10)`} 
        />
      ))}

      {/* Left border */}
      {[...Array(9)].map((_, i) => (
        <use 
          key={`left-${i}`}
          href="#lotusFlower" 
          transform={`translate(${strokeWidth * 2}, ${80 + i * 55}) scale(0.7) rotate(-90, 10, 10)`} 
        />
      ))}

      {/* Right border */}
      {[...Array(9)].map((_, i) => (
        <use 
          key={`right-${i}`}
          href="#lotusFlower" 
          transform={`translate(${800 - strokeWidth * 2.5}, ${80 + i * 55}) scale(0.7) rotate(90, 10, 10)`} 
        />
      ))}
    </g>

    {/* Naga curves in corners for added elegance */}
    <g opacity="0.5">
      <use href="#nagaCurve" transform="translate(70, 15) scale(0.8)" />
      <use href="#nagaCurve" transform="translate(730, 15) scale(-0.8, 0.8)" />
      <use href="#nagaCurve" transform="translate(70, 565) scale(0.8, -0.8)" />
      <use href="#nagaCurve" transform="translate(730, 565) scale(-0.8, -0.8)" />
    </g>
  </svg>
);

export default KhmerBorder;
