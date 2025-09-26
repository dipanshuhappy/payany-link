import React from "react";

// Create an SVG data URL with the TbLocationDollar icon design
export const createLogoDataUrl = (size: number = 28) => {
  const svg = `
    <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path stroke="rgb(91 33 182)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
      <path stroke="rgb(91 33 182)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M12 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"/>
      <path stroke="rgb(91 33 182)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M15 9h6l-3 3z"/>
      <path stroke="rgb(91 33 182)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
            d="M9 9H3l3 3z"/>
      <circle cx="12" cy="9" r="1.5" fill="rgb(91 33 182)"/>
    </svg>
  `;
  return `data:image/svg+xml;base64,${btoa(svg)}`;
};

// React component version of the logo
interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 28 }) => {
  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="text-primary"
      >
        <path
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"
        />
        <path
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M12 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
        />
        <path
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M15 9h6l-3 3z"
        />
        <path
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M9 9H3l3 3z"
        />
        <circle cx="12" cy="9" r="1.5" fill="currentColor" />
      </svg>
      <span className="text-xl font-bold text-gray-900">PayAny</span>
    </div>
  );
};

export default Logo;
