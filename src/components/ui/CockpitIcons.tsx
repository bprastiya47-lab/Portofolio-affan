import React from 'react';

interface IconProps {
  className?: string;
}

const baseProps = {
  viewBox: '0 0 20 20',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.5,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true as const,
};

export const IconGallery: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M10 2.5v4.2M16.5 6.25l-3.6 2.1M16.5 13.75l-3.6-2.1M10 17.5v-4.2M3.5 13.75l3.6-2.1M3.5 6.25l3.6 2.1" />
    <circle cx="10" cy="10" r="2.2" />
  </svg>
);

export const IconGear: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M3 6.5h2.5l1.3-2h6.4l1.3 2H17a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 17 16.5H3A1.5 1.5 0 0 1 1.5 15V8A1.5 1.5 0 0 1 3 6.5Z" />
    <circle cx="10" cy="11.5" r="3" />
  </svg>
);

export const IconSpecs: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M10 10l4.2-4.2" />
    <path d="M10 4.5v1.2M15.5 10h-1.2M4.5 10h1.2M10 15.5v-1.2" />
    <circle cx="10" cy="10" r="1.1" />
  </svg>
);

export const IconContact: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <rect x="2.5" y="4.5" width="15" height="11" rx="1.5" />
    <path d="M3 5.5l7 5.2 7-5.2" />
  </svg>
);

export const IconPrev: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M12.5 4.5L7 10l5.5 5.5" />
  </svg>
);

export const IconNext: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M7.5 4.5L13 10l-5.5 5.5" />
  </svg>
);

export const IconBack: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M15.5 10H4.5M9 5.5L4.5 10 9 14.5" />
  </svg>
);

export const IconClose: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M5 5l10 10M15 5L5 15" />
  </svg>
);

export const IconReplay: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M4.2 8.5A6.3 6.3 0 1 1 5.6 14.4" />
    <path d="M4 4.8v3.9h3.9" />
  </svg>
);

export const IconCompass: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <circle cx="10" cy="10" r="7.5" />
    <polygon points="10,5.2 12,10 10,14.8 8,10" />
  </svg>
);

export const IconLocation: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M10 17.2s5.2-4.6 5.2-8.7a5.2 5.2 0 1 0-10.4 0c0 4.1 5.2 8.7 5.2 8.7Z" />
    <circle cx="10" cy="8.5" r="1.8" />
  </svg>
);

export const IconInstagram: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <rect x="3" y="3" width="14" height="14" rx="3.5" />
    <circle cx="10" cy="10" r="3.2" />
    <circle cx="14.2" cy="5.8" r="0.7" fill="currentColor" stroke="none" />
  </svg>
);

export const IconWhatsApp: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M10 2.8a7.1 7.1 0 0 0-6.1 10.7L3 17l3.6-.9A7.1 7.1 0 1 0 10 2.8Z" />
    <path d="M7.6 7.8c.2-.3.5-.3.7-.1l.9.9c.2.2.2.5 0 .7l-.4.4c.5.9 1.2 1.6 2.1 2.1l.4-.4c.2-.2.5-.2.7 0l.9.9c.2.2.2.5-.1.7-.5.4-1.2.6-1.9.3-1.6-.6-3-2-3.6-3.6-.3-.7-.1-1.4.3-1.9Z" />
  </svg>
);

export const IconSend: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M17.2 2.8L9.2 10.8" />
    <path d="M17.2 2.8l-4.8 14.4-3.2-6.4-6.4-3.2 14.4-4.8Z" />
  </svg>
);

export const IconCheck: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <circle cx="10" cy="10" r="7.5" />
    <path d="M6.8 10.2l2.1 2.1 4.4-4.6" />
  </svg>
);

export const IconChevronDown: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M5.5 7.5L10 12l4.5-4.5" />
  </svg>
);

export const IconExpand: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M3.5 7.5v-4h4M12.5 3.5h4v4M16.5 12.5v4h-4M7.5 16.5h-4v-4" />
  </svg>
);

export const IconLicense: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M4.5 3h7.8L15.5 6.2V17H4.5V3Z" />
    <path d="M12 3v3.5h3.5" />
    <path d="M7 9.5h6M7 12.5h4.5" />
  </svg>
);

export const IconContactSheet: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <rect x="2.5" y="3.5" width="4" height="4" rx="0.5" />
    <rect x="8" y="3.5" width="4" height="4" rx="0.5" />
    <rect x="13.5" y="3.5" width="4" height="4" rx="0.5" />
    <rect x="2.5" y="9" width="4" height="4" rx="0.5" />
    <rect x="8" y="9" width="4" height="4" rx="0.5" />
    <rect x="13.5" y="9" width="4" height="4" rx="0.5" />
    <path d="M2.5 16h15" />
  </svg>
);

export const IconAudioOn: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M3.5 8.2v3.6h2.8l3.7 3.2V5L6.3 8.2H3.5Z" />
    <path d="M13 7.2a4.2 4.2 0 0 1 0 5.6" />
    <path d="M15.4 5a7.2 7.2 0 0 1 0 10" />
  </svg>
);

export const IconAudioOff: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M3.5 8.2v3.6h2.8l3.7 3.2V5L6.3 8.2H3.5Z" />
    <path d="M13 7.5l4 5M17 7.5l-4 5" />
  </svg>
);

export const IconFlightMark: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M2.5 12.5L10 4.5l7.5 8" />
    <path d="M6.5 14.5h7" />
    <circle cx="10" cy="10.5" r="1.4" />
  </svg>
);

export const IconHome: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M3 9.5L10 3.5l7 6" />
    <path d="M5.2 8.2V16.5h9.6V8.2" />
    <path d="M8.5 16.5v-4.2h3v4.2" />
  </svg>
);

export const IconTransform: React.FC<IconProps> = ({ className = 'w-4 h-4' }) => (
  <svg {...baseProps} className={className}>
    <path d="M4.2 3.2L8.4 8.2 10 16.8l1.6-8.6 4.2-5" />
    <path d="M6.4 10.2L10 12.6l3.6-2.4" />
    <path d="M10 3.8v4.2" />
  </svg>
);


