import React from 'react';

export type IconProps = React.SVGProps<SVGSVGElement> & { size?: number; color?: string };

const base = { stroke: 'currentColor', fill: 'none', strokeWidth: 1.6, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

export const IconPlus: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <path {...base} d="M12 5v14M5 12h14" />
  </svg>
);

export const IconTask: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <rect {...base} x="4" y="4" width="16" height="16" rx="2" />
    <path {...base} d="M8 12l2 2 6-6" />
  </svg>
);

export const IconTable: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <rect {...base} x="3" y="4" width="18" height="16" rx="2" />
    <path {...base} d="M3 10h18M9 4v16M15 4v16" />
  </svg>
);

export const IconMore: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <circle cx="5" cy="12" r="1.8" fill="currentColor" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    <circle cx="19" cy="12" r="1.8" fill="currentColor" />
  </svg>
);

export const IconChevronRight: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <path {...base} d="M9 5l7 7-7 7" />
  </svg>
);

export const IconChevronDown: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <path {...base} d="M5 9l7 7 7-7" />
  </svg>
);

export const IconEye: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <path {...base} d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" />
    <circle cx="12" cy="12" r="3" fill="currentColor" />
  </svg>
);

export const IconEyeOff: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <path {...base} d="M2 12s4-7 10-7c2.4 0 4.6.9 6.3 2.1M22 12s-4 7-10 7c-2.7 0-5.1-1.2-6.9-2.6" />
    <path {...base} d="M15 12a3 3 0 0 1-3 3M9.88 9.88A3 3 0 0 1 12 9" />
    <path {...base} d="M3 3l18 18" />
  </svg>
);

export const IconLink: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <path {...base} d="M10 13a5 5 0 0 0 7.07 0l2.12-2.12a5 5 0 0 0-7.07-7.07L10 5" />
    <path {...base} d="M14 11a5 5 0 0 0-7.07 0L4.81 13.12a5 5 0 0 0 7.07 7.07L14 19" />
  </svg>
);

export const IconUndo: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <path {...base} d="M9 14l-4-4 4-4" />
    <path {...base} d="M5 10h8a6 6 0 1 1 0 12h-3" />
  </svg>
);

export const IconRedo: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <path {...base} d="M15 6l4 4-4 4" />
    <path {...base} d="M19 10H11a6 6 0 1 0 0 12h3" />
  </svg>
);

export const IconSearch: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <circle {...base} cx="11" cy="11" r="7" />
    <path {...base} d="M20 20l-3-3" />
  </svg>
);

export const IconComment: React.FC<IconProps> = ({ size = 16, color, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" style={{ display: 'inline-block', color, ...style }} {...rest}>
    <path {...base} d="M4 5h16v12H7l-3 3z" />
  </svg>
);