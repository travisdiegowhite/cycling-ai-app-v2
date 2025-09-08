import { createTheme } from '@mantine/core';

export const theme = createTheme({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
  primaryColor: 'ridgeGreen',
  defaultRadius: 'lg',
  
  colors: {
    // Primary: Deep Ridge Green - premium outdoor tech
    ridgeGreen: [
      '#ecfdf5', // 50
      '#d1fae5', // 100  
      '#a7f3d0', // 200
      '#6ee7b7', // 300
      '#34d399', // 400
      '#10b981', // 500 - Main brand
      '#059669', // 600
      '#047857', // 700
      '#065f46', // 800
      '#064e3b'  // 900
    ],
    
    // Accent: Electric Cyan - high-tech glow
    electricCyan: [
      '#ecfeff', // 50
      '#cffafe', // 100
      '#a5f3fc', // 200  
      '#67e8f9', // 300
      '#22d3ee', // 400
      '#06b6d4', // 500 - Electric accent
      '#0891b2', // 600
      '#0e7490', // 700
      '#155e75', // 800
      '#164e63'  // 900
    ],
    
    // Warm accent: Sunset Gold
    sunsetGold: [
      '#fffbeb', // 50
      '#fef3c7', // 100
      '#fde68a', // 200  
      '#fcd34d', // 300
      '#fbbf24', // 400
      '#f59e0b', // 500 - Gold accent
      '#d97706', // 600
      '#b45309', // 700
      '#92400e', // 800
      '#78350f'  // 900
    ],
    
    // Dark base: Midnight Slate
    midnightSlate: [
      '#f8fafc', // 50 - light content areas
      '#f1f5f9', // 100
      '#e2e8f0', // 200
      '#cbd5e1', // 300
      '#94a3b8', // 400
      '#64748b', // 500
      '#475569', // 600
      '#334155', // 700 - main dark
      '#1e293b', // 800 - deeper dark
      '#0f172a'  // 900 - darkest
    ]
  },
  
  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
    fontWeight: '800',
    sizes: {
      h1: { fontSize: '3rem', lineHeight: '1', letterSpacing: '-0.025em' },
      h2: { fontSize: '2.25rem', lineHeight: '2.5rem', letterSpacing: '-0.025em' },
      h3: { fontSize: '1.875rem', lineHeight: '2.25rem', letterSpacing: '-0.025em' },
      h4: { fontSize: '1.5rem', lineHeight: '2rem' },
      h5: { fontSize: '1.25rem', lineHeight: '1.75rem' },
      h6: { fontSize: '1.125rem', lineHeight: '1.75rem' },
    },
  },
  
  fontSizes: {
    xs: '0.75rem',
    sm: '0.875rem', 
    md: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
  },
  
  radius: {
    xs: '0.5rem',
    sm: '0.75rem',
    md: '1rem',
    lg: '1.25rem',
    xl: '1.5rem',
  },
  
  shadows: {
    xs: '0 1px 3px 0 rgba(15, 23, 42, 0.3), 0 1px 2px 0 rgba(15, 23, 42, 0.2)',
    sm: '0 4px 6px -1px rgba(15, 23, 42, 0.3), 0 2px 4px -1px rgba(15, 23, 42, 0.2)',
    md: '0 10px 15px -3px rgba(15, 23, 42, 0.3), 0 4px 6px -2px rgba(15, 23, 42, 0.2)',
    lg: '0 20px 25px -5px rgba(15, 23, 42, 0.4), 0 10px 10px -5px rgba(15, 23, 42, 0.2)',
    xl: '0 25px 50px -12px rgba(15, 23, 42, 0.6)',
  },
  
  other: {
    // Premium gradient system
    gradients: {
      // Main brand gradients
      ridgeHero: 'linear-gradient(135deg, #0f172a 0%, #1e293b 20%, #10b981 60%, #22d3ee 100%)',
      darkToGreen: 'linear-gradient(135deg, #1e293b 0%, #334155 30%, #10b981 100%)',
      greenToCyan: 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)',
      
      // Atmospheric gradients
      twilightMist: 'linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(16, 185, 129, 0.1) 100%)',
      alpineGlow: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(34, 211, 238, 0.2) 50%, rgba(251, 191, 36, 0.3) 100%)',
      deepForest: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #065f46 100%)',
      
      // Interactive states
      hoverGlow: 'linear-gradient(135deg, #10b981 0%, #06b6d4 100%)',
      activeShine: 'linear-gradient(135deg, #059669 0%, #0891b2 100%)',
      
      // Card backgrounds
      glassDark: 'linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.6) 100%)',
      glassLight: 'linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.8) 100%)',
    },
    
    monoFontFamily: 'JetBrains Mono, SF Mono, Monaco, Cascadia Code, Roboto Mono, Courier New, monospace',
  },
});
