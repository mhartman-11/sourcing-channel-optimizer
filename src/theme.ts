// Hartman AI brand palette — single source of truth for colors.
export const brand = {
  bg: '#F4F1EC', // cream
  bgAlt: '#E5E0D8', // stone
  bgCreamWarm: '#F7F3EE',
  bgStoneWarm: '#EDE6DC',
  primary: '#1C3329', // forest green
  primaryMid: '#2E5243',
  primaryLight: '#D4E6DF',
  accent: '#C5533A', // terracotta
  accentDark: '#9E3D27',
  accentLight: '#E8D5A0', // ochre
  text: '#18120E',
  textMid: '#3D3328',
  textMuted: '#4A3F35',
  textFaint: '#8A7D72',
  border: '#D8CEC5',
  surface: '#FFFFFF',
} as const;

export type Brand = typeof brand;
