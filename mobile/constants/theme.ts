// Brand colors — mirrors the web app's Tailwind theme
export const colors = {
  primary: '#8B1A3B',       // vau-maroon
  primaryLight: '#A8294E',
  primaryDark: '#6B1230',
  gold: '#D4A017',          // vau-gold
  goldLight: '#E8B520',

  success: '#22C55E',
  successBg: '#F0FDF4',
  warning: '#F59E0B',
  warningBg: '#FFFBEB',
  danger: '#EF4444',
  dangerBg: '#FEF2F2',
  info: '#3B82F6',
  infoBg: '#EFF6FF',
  displacement: '#8B5CF6',
  displacementBg: '#F5F3FF',

  white: '#FFFFFF',
  background: '#F8F7F7',
  surface: '#FFFFFF',
  border: '#F3F4F6',
  borderMid: '#E5E7EB',
  divider: '#F9FAFB',

  text: {
    primary: '#111827',
    secondary: '#4B5563',
    muted: '#9CA3AF',
    placeholder: '#D1D5DB',
    inverse: '#FFFFFF',
  },

  priority: {
    normal: { bg: '#EFF6FF', text: '#2563EB', dot: '#3B82F6' },
    academic_urgent: { bg: '#FFFBEB', text: '#D97706', dot: '#F59E0B' },
    emergency: { bg: '#FEF2F2', text: '#DC2626', dot: '#EF4444' },
  },

  status: {
    pending: { bg: '#FFFBEB', text: '#D97706' },
    approved: { bg: '#F0FDF4', text: '#15803D' },
    rejected: { bg: '#FEF2F2', text: '#DC2626' },
    cancelled: { bg: '#F3F4F6', text: '#6B7280' },
    rescheduled: { bg: '#EFF6FF', text: '#2563EB' },
  },
} as const;

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  base: 16,
  lg: 20,
  xl: 24,
  '2xl': 32,
  '3xl': 40,
  '4xl': 48,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  '2xl': 24,
  '3xl': 32,
  full: 9999,
} as const;

export const shadow = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 6,
  },
  primary: {
    shadowColor: '#8B1A3B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 5,
  },
} as const;
