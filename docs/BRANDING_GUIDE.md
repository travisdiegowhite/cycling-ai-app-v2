# Tribos.Studio Branding Guide

## Brand Overview

**tribos.studio** is an intelligent cycling route planning and performance tracking platform that emphasizes personalized, data-driven route discovery over generic AI terminology.

### Brand Name Origin

**τρίβος (tribos)** - An ancient Greek word meaning "the road less traveled, a path worn by those who venture beyond the ordinary."

This etymology captures our core value proposition: helping cyclists discover unique routes tailored to their goals, not just the same paths everyone else rides.

---

## Brand Identity

### Positioning
- **What we do**: Intelligent cycling route planning & performance tracking
- **How we differentiate**: Personalized routes based on goals and fitness, not generic suggestions
- **Target audience**: Cyclists who want to train smarter and explore new routes
- **Tone**: Professional, mission-driven, approachable (not overly technical)

### Mission Statement
"Make every ride better through intelligent, data-driven route planning that adapts to your goals and fitness."

### Brand Values
1. **Discovery**: Help cyclists find the road less traveled
2. **Intelligence**: Data-driven insights without the AI jargon
3. **Community**: Privacy-first route sharing and collaboration
4. **Integration**: Seamless connection with existing cycling tech ecosystem
5. **Approachability**: Professional tools that don't intimidate

---

## Visual Identity

### Logo & Wordmark

**Primary Logo**: Route icon (from lucide-react) + "tribos.studio" wordmark

```jsx
<Route size={48} color="#10b981"
  style={{ filter: 'drop-shadow(0 0 8px rgba(16, 185, 129, 0.5))' }} />
```

**Wordmark Style**:
- Font: Inter, weight 800
- Size: 48px
- Gradient: `linear-gradient(135deg, #10b981 0%, #22d3ee 50%, #fbbf24 100%)`
- Letter spacing: -0.05em
- Always lowercase: "tribos.studio"

### Color Palette

#### Primary Colors

**Ridge Green** (Primary Brand Color)
- Main: `#10b981` (RGB: 16, 185, 129)
- Usage: Primary actions, brand elements, accents
- Emotional association: Growth, outdoors, premium tech
- Scale:
  - 50: `#ecfdf5`
  - 100: `#d1fae5`
  - 200: `#a7f3d0`
  - 300: `#6ee7b7`
  - 400: `#34d399`
  - 500: `#10b981` ← Primary
  - 600: `#059669`
  - 700: `#047857`
  - 800: `#065f46`
  - 900: `#064e3b`

**Electric Cyan** (Accent Color)
- Main: `#22d3ee` (RGB: 34, 211, 238)
- Usage: Interactive elements, highlights, gradients
- Emotional association: High-tech, energy, precision
- Scale:
  - 50: `#ecfeff`
  - 100: `#cffafe`
  - 200: `#a5f3fc`
  - 300: `#67e8f9`
  - 400: `#22d3ee` ← Primary
  - 500: `#06b6d4`
  - 600: `#0891b2`
  - 700: `#0e7490`
  - 800: `#155e75`
  - 900: `#164e63`

#### Secondary Colors

**Sunset Gold** (Warm Accent)
- Main: `#fbbf24` (RGB: 251, 191, 36)
- Usage: Highlights, achievements, premium features
- Scale:
  - 50: `#fffbeb`
  - 100: `#fef3c7`
  - 200: `#fde68a`
  - 300: `#fcd34d`
  - 400: `#fbbf24` ← Primary
  - 500: `#f59e0b`
  - 600: `#d97706`
  - 700: `#b45309`
  - 800: `#92400e`
  - 900: `#78350f`

**Midnight Slate** (Neutral/Dark)
- Main Dark: `#334155` (RGB: 51, 65, 85)
- Deeper Dark: `#1e293b` (RGB: 30, 41, 59)
- Darkest: `#0f172a` (RGB: 15, 23, 42)
- Usage: Backgrounds, text, containers
- Scale:
  - 50: `#f8fafc` (Light content areas)
  - 100: `#f1f5f9`
  - 200: `#e2e8f0`
  - 300: `#cbd5e1`
  - 400: `#94a3b8`
  - 500: `#64748b`
  - 600: `#475569`
  - 700: `#334155` ← Main dark
  - 800: `#1e293b` ← Deeper dark
  - 900: `#0f172a` ← Darkest

### Gradient System

#### Brand Gradients
```css
/* Primary Action Gradient */
greenToCyan: linear-gradient(135deg, #10b981 0%, #22d3ee 100%)

/* Hero/Header Gradient */
ridgeHero: linear-gradient(135deg, #0f172a 0%, #1e293b 20%, #10b981 60%, #22d3ee 100%)

/* Dark to Green */
darkToGreen: linear-gradient(135deg, #1e293b 0%, #334155 30%, #10b981 100%)
```

#### Atmospheric Gradients
```css
/* Twilight Mist (overlays) */
twilightMist: linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(16, 185, 129, 0.1) 100%)

/* Alpine Glow (premium cards) */
alpineGlow: linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(34, 211, 238, 0.2) 50%, rgba(251, 191, 36, 0.3) 100%)

/* Deep Forest (dark backgrounds) */
deepForest: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #065f46 100%)
```

#### Interactive States
```css
/* Hover State */
hoverGlow: linear-gradient(135deg, #10b981 0%, #06b6d4 100%)

/* Active/Pressed State */
activeShine: linear-gradient(135deg, #059669 0%, #0891b2 100%)
```

#### Card/Glass Effects
```css
/* Dark Glass Cards */
glassDark: linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.6) 100%)

/* Light Glass Cards */
glassLight: linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.8) 100%)
```

### Typography

#### Font Families
```css
/* Primary (UI & Headings) */
font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif;

/* Monospace (code, data) */
font-family: 'JetBrains Mono', 'SF Mono', Monaco, 'Cascadia Code', 'Roboto Mono', 'Courier New', monospace;
```

#### Heading Sizes
- **H1**: 48px (3rem), weight 800, line-height 1, letter-spacing -0.025em
- **H2**: 36px (2.25rem), weight 800, line-height 2.5rem, letter-spacing -0.025em
- **H3**: 30px (1.875rem), weight 800, line-height 2.25rem, letter-spacing -0.025em
- **H4**: 24px (1.5rem), weight 800, line-height 2rem
- **H5**: 20px (1.25rem), weight 800, line-height 1.75rem
- **H6**: 18px (1.125rem), weight 800, line-height 1.75rem

#### Body Text Sizes
- **XS**: 12px (0.75rem)
- **SM**: 14px (0.875rem)
- **MD**: 16px (1rem) ← Default
- **LG**: 18px (1.125rem)
- **XL**: 20px (1.25rem)
- **2XL**: 24px (1.5rem)

### Border Radius
- **XS**: 8px (0.5rem)
- **SM**: 12px (0.75rem)
- **MD**: 16px (1rem)
- **LG**: 20px (1.25rem) ← Default
- **XL**: 24px (1.5rem)

### Shadows
```css
/* Extra Small */
xs: 0 1px 3px 0 rgba(15, 23, 42, 0.3), 0 1px 2px 0 rgba(15, 23, 42, 0.2)

/* Small */
sm: 0 4px 6px -1px rgba(15, 23, 42, 0.3), 0 2px 4px -1px rgba(15, 23, 42, 0.2)

/* Medium */
md: 0 10px 15px -3px rgba(15, 23, 42, 0.3), 0 4px 6px -2px rgba(15, 23, 42, 0.2)

/* Large */
lg: 0 20px 25px -5px rgba(15, 23, 42, 0.4), 0 10px 10px -5px rgba(15, 23, 42, 0.2)

/* Extra Large */
xl: 0 25px 50px -12px rgba(15, 23, 42, 0.6)
```

---

## Voice & Messaging

### Writing Style

**DO:**
- Use clear, benefit-focused language
- Emphasize what the system does, not how it works
- Be professional but approachable
- Focus on the cyclist's goals and outcomes
- Use active voice

**DON'T:**
- Overuse "AI" terminology in user-facing copy
- Use jargon or overly technical language
- Make promises you can't keep
- Use passive voice
- Be overly casual or use emoji (unless contextually appropriate)

### Terminology Guidelines

#### Preferred Terms (User-Facing)
- **Smart Route Planner** (not "AI Route Generator")
- **Intelligent routing** (not "AI-powered routing")
- **Data-driven insights** (not "AI analysis")
- **System analyzes** (not "AI analyzes")
- **Find My Routes** (not "Generate AI Routes")
- **Route Builder & Studio** (not just "Route Builder")
- **Training Dashboard** (not "AI Training Dashboard")

#### Technical Terms (Internal/Documentation)
You can use AI terminology in:
- Developer documentation
- API documentation
- Technical architecture docs
- Backend code comments

### Brand Voice Attributes

1. **Knowledgeable but not arrogant**: We understand cycling and tech, but we're guides, not gatekeepers
2. **Mission-driven**: Every feature serves the goal of better rides
3. **Community-minded**: We build for and with cyclists
4. **Honest**: Beta means beta; we acknowledge limitations
5. **Aspirational**: We help you ride the road less traveled

### Example Messaging

#### Hero Copy
```
Intelligent cycling route planning & performance tracking

Discover personalized routes, build custom paths with professional tools,
analyze your performance, and connect with a community of cyclists.
Everything you need for smarter cycling in one place.
```

#### Feature Descriptions

**Smart Route Planner**:
"Intelligent route planning based on your time, goals, and preferences. From recovery rides to hill training—personalized for you."

**Route Builder & Studio**:
"Build custom routes manually or edit with professional tools. Includes gravel profiles and smart cycling-focused routing."

**Training Dashboard**:
"Comprehensive training hub with smart insights, performance analytics, and personalized training plans to track your progress."

**Community Routes**:
"Discover and share routes with other cyclists. Privacy-first design with optional route sharing and comments."

**Fitness App Integration**:
"Connect Strava, Wahoo, or Garmin to import activities and sync routes to your bike computer automatically."

#### Email Communication

**From Address**: `Tribos Studio <onboarding@tribos.studio>`

**Subject Line Style**: Clear, benefit-focused
- "Welcome to Tribos Studio Cycling AI Beta!"
- "Your first route is ready to ride"

**Email Signature**:
```
Travis White
Tribos.Studio
```

**Footer Copy**:
"Tribos.Studio - Discover the road less traveled"

---

## UI Components & Patterns

### Buttons

#### Primary CTA
```jsx
<Button
  size="lg"
  style={{
    background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)',
  }}
>
  Start Exploring →
</Button>
```

#### Secondary CTA
```jsx
<Button
  size="lg"
  variant="outline"
  style={{
    backgroundColor: '#ffffff',
    color: '#10b981',
    border: '2px solid #10b981',
  }}
>
  Invite Friends →
</Button>
```

### Cards

#### Feature Card
- Background: White or glassDark gradient
- Border radius: lg (20px)
- Shadow: md
- Icon: ThemeIcon with feature color
- Padding: 40px

#### Info/Notice Boxes

**Beta Notice** (Blue):
```jsx
<Box style={{
  backgroundColor: '#eff6ff',
  borderLeft: '4px solid #3b82f6',
  borderRadius: '4px',
  padding: '20px'
}}>
  <Text color="#1e40af">
    <strong>This is Beta</strong>, so expect some rough edges...
  </Text>
</Box>
```

**Tribos Meaning** (Gold):
```jsx
<Box style={{
  backgroundColor: '#fef3c7',
  borderLeft: '4px solid #f59e0b',
  borderRadius: '4px',
  padding: '20px'
}}>
  <Text color="#78350f">
    <strong>τρίβος (tribos)</strong> - An ancient Greek word...
  </Text>
</Box>
```

### Icons

Use icons from **lucide-react**:
- Route - Brand logo, navigation
- Brain - Smart features
- TrendingUp - Analytics, performance
- MapPin - Location, routes
- Activity - Fitness integration
- Zap - Speed, power features
- Target - Goals, objectives
- Clock - Time-based features
- Users - Community
- Rocket - Beta, getting started
- Play - Demo, start action

---

## Product Features

### Core Feature Set

1. **Smart Route Planner**
   - Icon: Brain
   - Color: Teal
   - Description: Intelligent route planning based on time, goals, and preferences

2. **Route Builder & Studio**
   - Icon: Plus
   - Color: Cyan
   - Description: Professional tools with gravel profiles and smart routing

3. **Training Dashboard**
   - Icon: TrendingUp
   - Color: Blue
   - Description: Smart insights, analytics, and personalized training plans

4. **Community Routes**
   - Icon: Users
   - Color: Purple
   - Description: Privacy-first route sharing with comments

5. **Fitness App Integration**
   - Icon: Activity
   - Color: Orange
   - Description: Connect Strava, Wahoo, or Garmin

6. **Guided Experience**
   - Icon: HelpCircle
   - Color: Green
   - Description: Interactive onboarding and contextual help

### Key Benefits (Marketing)
- Discover new routes that match your riding style
- Train smarter with optimized workout routes
- Track progress with comprehensive analytics
- Export routes to any GPS device or app
- Learn from your actual riding patterns
- Stay motivated with personalized challenges

---

## Email Templates

### Welcome Email Structure

**Header**: Gradient background (`#10b981` to `#22d3ee`)
- White text, centered
- 28px font, weight 700

**Content Sections**:
1. Personal greeting
2. Tribos meaning callout (gold box)
3. Mission statement
4. Getting started steps
5. CTA buttons (dual: primary + outline)
6. Coming soon features
7. Call for beta feedback
8. Beta expectations notice (blue box)
9. Closing

**Footer**:
- Background: `#f9fafb`
- Border top: `1px solid #e5e7eb`
- Tagline: "Tribos.Studio - Discover the road less traveled"

### Email Design Tokens
```css
/* Colors */
--bg-gradient: linear-gradient(135deg, #10b981 0%, #22d3ee 100%);
--content-bg: #ffffff;
--footer-bg: #f9fafb;
--gold-box-bg: #fef3c7;
--gold-box-border: #f59e0b;
--blue-box-bg: #eff6ff;
--blue-box-border: #3b82f6;

/* Typography */
--heading-color: #ffffff (on gradient), #111827 (on white);
--body-color: #374151;
--accent-color: #10b981;
```

---

## Platform Integrations

### Domain & Email
- **Domain**: tribos.studio
- **Email from**: `Tribos Studio <onboarding@tribos.studio>`
- **Email service**: Resend

### Fitness Integrations
- **Strava**: Primary integration (import history, sync routes)
- **Garmin**: Coming soon
- **Wahoo**: Coming soon

### Deployment
- **Platform**: Vercel
- **Analytics**: Vercel Analytics

---

## File & Asset Naming

### Conventions
- Use lowercase with hyphens for files: `beta-signup.js`
- Component names: PascalCase (`BetaSignup.js`)
- CSS/Theme files: camelCase (`theme.js`)
- Documentation: UPPERCASE (`BRANDING_GUIDE.md`)

### Image Assets
- Logo files: `logo-{size}.png` (e.g., `logo-192.png`, `logo-512.png`)
- Favicon: `favicon.ico`
- Social previews: `og-image.png`

---

## Code Style Guide

### Component Structure
```jsx
// Always import lucide-react icons for consistency
import { Route, Brain, TrendingUp } from 'lucide-react';

// Use Mantine components with theme tokens
<ThemeIcon color="teal" size="xl" radius="md">
  <Brain />
</ThemeIcon>

// Apply gradients using inline styles or theme.other.gradients
style={{
  background: 'linear-gradient(135deg, #10b981 0%, #22d3ee 100%)',
}}
```

### Theme Access
```jsx
import { theme } from './theme';

// Access colors
theme.colors.ridgeGreen[5] // #10b981

// Access gradients
theme.other.gradients.greenToCyan
```

---

## Launch & Beta Strategy

### Beta Program
- **Status**: Active beta
- **Transparency**: Acknowledge rough edges, emphasize rapid iteration
- **Value proposition**: "You're not just testing software—you're shaping it"
- **Call to action**: Test features, share feedback, invite fellow cyclists

### Beta Welcome Flow
1. Email welcome with tribos meaning
2. Mission statement
3. Getting started steps
4. Feature highlights
5. Coming soon teasers
6. Feedback request

### Coming Soon Features
- Direct Garmin integration
- Direct Wahoo integration
- Enhanced Strava connectivity
- (Currently: can import Strava history)

---

## Don'ts & Anti-Patterns

### ❌ Don't Do This
- Don't use "AI" in user-facing features unnecessarily
- Don't use emojis in UI (unless explicitly part of feature)
- Don't promise features that aren't ready
- Don't hide beta status or limitations
- Don't use stock cycling photos (prefer authentic or abstract)
- Don't use all-caps for emphasis (use bold or color)
- Don't mix color systems (stay within the defined palette)

### ✅ Do This Instead
- Use "Smart" or "Intelligent" for user-facing features
- Reserve technical terminology for docs
- Be transparent about beta status
- Acknowledge limitations while highlighting vision
- Use icons and gradients for visual interest
- Use semantic HTML and proper heading hierarchy
- Reference theme tokens instead of hardcoding colors

---

## Brand Evolution Notes

### Recent Rebranding (October 2025)
Removed AI terminology from user-facing UI to focus on value proposition:
- "AI Route Generator" → "Smart Route Planner"
- "AI-powered" → "Intelligent" / "Smart" / "Data-driven"
- "Generate AI Routes" → "Find My Routes"

**Rationale**: Makes product more approachable to users skeptical of AI-generated content while maintaining all functionality.

### Maintained Elements
- Core colors and gradients
- Typography system
- Component structure
- Feature set and capabilities

---

## Quick Reference

### Primary Brand Assets
- **Name**: tribos.studio (always lowercase)
- **Logo**: Route icon + wordmark gradient
- **Primary color**: Ridge Green `#10b981`
- **Accent color**: Electric Cyan `#22d3ee`
- **Primary gradient**: `linear-gradient(135deg, #10b981 0%, #22d3ee 100%)`
- **Font**: Inter (weight 800 for headings)
- **Tagline**: "Discover the road less traveled"

### Key Messaging
- **Positioning**: Intelligent cycling route planning & performance tracking
- **Mission**: Make every ride better through intelligent, data-driven route planning
- **Differentiation**: Personalized routes based on goals and fitness, not generic suggestions

### Contact & Attribution
- **Creator**: Travis White
- **Domain**: tribos.studio
- **Email**: onboarding@tribos.studio
- **Platform**: Web app (React + Mantine)

---

## Version History

- **v1.0** (October 2025): Initial branding guide after AI terminology rebrand
