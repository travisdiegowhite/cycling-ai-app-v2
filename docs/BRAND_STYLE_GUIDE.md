# Tribos.Studio Brand Style Guide

## Brand Identity

**Brand Name:** Tribos.Studio
**Tagline:** Discover the road less traveled

**Brand Story:**
τρίβος (tribos) - An ancient Greek word meaning "the road less traveled, a path worn by those who venture beyond the ordinary." We help cyclists discover unique routes tailored to their goals, not just the same paths everyone else rides.

**Mission:**
Make every ride better through intelligent, AI-powered route planning that adapts to your goals and fitness.

---

## Typography

### Primary Font Family
```
Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif
```

### Monospace Font (Code/Technical)
```
JetBrains Mono, SF Mono, Monaco, Cascadia Code, Roboto Mono, Courier New, monospace
```

### Heading Styles
- **Font Weight:** 800 (Extra Bold)
- **Letter Spacing:** -0.025em (tighter for larger headings)

**Heading Sizes:**
- H1: 3rem (48px) - Line height: 1
- H2: 2.25rem (36px) - Line height: 2.5rem
- H3: 1.875rem (30px) - Line height: 2.25rem
- H4: 1.5rem (24px) - Line height: 2rem
- H5: 1.25rem (20px) - Line height: 1.75rem
- H6: 1.125rem (18px) - Line height: 1.75rem

### Body Text Sizes
- **xs:** 0.75rem (12px)
- **sm:** 0.875rem (14px)
- **md:** 1rem (16px) - Default
- **lg:** 1.125rem (18px)
- **xl:** 1.25rem (20px)
- **2xl:** 1.5rem (24px)

---

## Color Palette

### Primary: Ridge Green
**Use for:** Main brand elements, primary CTAs, success states

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#ecfdf5` | Lightest backgrounds |
| 100 | `#d1fae5` | Light backgrounds |
| 200 | `#a7f3d0` | Subtle highlights |
| 300 | `#6ee7b7` | Light accents |
| 400 | `#34d399` | Medium accents |
| **500** | **`#10b981`** | **Main Brand Color** |
| 600 | `#059669` | Darker brand |
| 700 | `#047857` | Deep brand |
| 800 | `#065f46` | Very deep |
| 900 | `#064e3b` | Darkest |

### Accent: Electric Cyan
**Use for:** Secondary CTAs, interactive elements, tech features

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#ecfeff` | Lightest backgrounds |
| 100 | `#cffafe` | Light backgrounds |
| 200 | `#a5f3fc` | Subtle highlights |
| 300 | `#67e8f9` | Light accents |
| **400** | **`#22d3ee`** | **Electric Accent** |
| 500 | `#06b6d4` | Deeper cyan |
| 600 | `#0891b2` | Dark cyan |
| 700 | `#0e7490` | Very dark |
| 800 | `#155e75` | Deep dark |
| 900 | `#164e63` | Darkest |

### Warm Accent: Sunset Gold
**Use for:** Highlights, premium features, warnings

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#fffbeb` | Lightest backgrounds |
| 100 | `#fef3c7` | Light backgrounds |
| 200 | `#fde68a` | Subtle highlights |
| 300 | `#fcd34d` | Light accents |
| 400 | `#fbbf24` | Medium gold |
| **500** | **`#f59e0b`** | **Gold Accent** |
| 600 | `#d97706` | Dark gold |
| 700 | `#b45309` | Deeper gold |
| 800 | `#92400e` | Very dark |
| 900 | `#78350f` | Darkest |

### Dark Base: Midnight Slate
**Use for:** Backgrounds, dark UI elements, text

| Shade | Hex | Usage |
|-------|-----|-------|
| 50 | `#f8fafc` | Light content areas |
| 100 | `#f1f5f9` | Very light backgrounds |
| 200 | `#e2e8f0` | Light borders |
| 300 | `#cbd5e1` | Medium borders |
| 400 | `#94a3b8` | Light text |
| 500 | `#64748b` | Medium text |
| 600 | `#475569` | Dark text |
| **700** | **`#334155`** | **Main Dark** |
| 800 | `#1e293b` | Deeper dark |
| 900 | `#0f172a` | Darkest backgrounds |

### Supporting Colors

**Text Colors:**
- Primary: `#374151` (gray-700)
- Secondary: `#6b7280` (gray-500)
- Muted: `#9ca3af` (gray-400)

**Borders:**
- Light: `#e5e7eb` (gray-200)
- Medium: `#d1d5db` (gray-300)
- Dark: `#9ca3af` (gray-400)

---

## Gradients

### Brand Gradients

**Main Hero Gradient (Ridge Hero)**
```css
linear-gradient(135deg, #0f172a 0%, #1e293b 20%, #10b981 60%, #22d3ee 100%)
```
**Use for:** Hero sections, landing pages, major CTAs

**Green to Cyan**
```css
linear-gradient(135deg, #10b981 0%, #22d3ee 100%)
```
**Use for:** Primary buttons, key CTAs, highlights

**Dark to Green**
```css
linear-gradient(135deg, #1e293b 0%, #334155 30%, #10b981 100%)
```
**Use for:** Dark sections transitioning to brand color

**Triple Gradient (Premium)**
```css
linear-gradient(135deg, #10b981 0%, #22d3ee 50%, #fbbf24 100%)
```
**Use for:** Premium features, special promotions

### Atmospheric Gradients

**Twilight Mist**
```css
linear-gradient(180deg, rgba(30, 41, 59, 0.95) 0%, rgba(16, 185, 129, 0.1) 100%)
```
**Use for:** Overlays, hero sections

**Alpine Glow**
```css
linear-gradient(135deg, rgba(15, 23, 42, 0.9) 0%, rgba(34, 211, 238, 0.2) 50%, rgba(251, 191, 36, 0.3) 100%)
```
**Use for:** Special effects, atmospheric backgrounds

**Deep Forest**
```css
linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #065f46 100%)
```
**Use for:** Dark mode backgrounds, nature themes

### Interactive States

**Hover Glow**
```css
linear-gradient(135deg, #10b981 0%, #06b6d4 100%)
```
**Use for:** Hover states on primary elements

**Active Shine**
```css
linear-gradient(135deg, #059669 0%, #0891b2 100%)
```
**Use for:** Active/pressed states

### Glass/Card Backgrounds

**Glass Dark**
```css
linear-gradient(135deg, rgba(30, 41, 59, 0.8) 0%, rgba(51, 65, 85, 0.6) 100%)
```
**Use for:** Dark glassmorphism cards

**Glass Light**
```css
linear-gradient(135deg, rgba(248, 250, 252, 0.9) 0%, rgba(241, 245, 249, 0.8) 100%)
```
**Use for:** Light glassmorphism cards

---

## Border Radius

**System:**
- xs: 0.5rem (8px)
- sm: 0.75rem (12px)
- md: 1rem (16px)
- lg: 1.25rem (20px) - **Default**
- xl: 1.5rem (24px)

**Usage:**
- Buttons: lg (20px)
- Cards: lg-xl (20-24px)
- Modals: lg (20px)
- Input fields: md-lg (16-20px)

---

## Shadows

**Light Theme:**
```css
/* xs - Subtle */
box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.3), 0 1px 2px 0 rgba(15, 23, 42, 0.2);

/* sm - Small cards */
box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.3), 0 2px 4px -1px rgba(15, 23, 42, 0.2);

/* md - Medium cards */
box-shadow: 0 10px 15px -3px rgba(15, 23, 42, 0.3), 0 4px 6px -2px rgba(15, 23, 42, 0.2);

/* lg - Large elevated elements */
box-shadow: 0 20px 25px -5px rgba(15, 23, 42, 0.4), 0 10px 10px -5px rgba(15, 23, 42, 0.2);

/* xl - Modals, overlays */
box-shadow: 0 25px 50px -12px rgba(15, 23, 42, 0.6);
```

---

## Common Component Styles

### Primary Button
```css
background: linear-gradient(135deg, #10b981 0%, #22d3ee 100%);
color: #ffffff;
border-radius: 0.375rem (6px);
padding: 14px 28px;
font-weight: 600;
font-size: 16px;
```

### Secondary Button (Outlined)
```css
background: transparent;
color: #10b981;
border: 2px solid #10b981;
border-radius: 0.375rem (6px);
padding: 14px 28px;
font-weight: 600;
font-size: 16px;
```

### Callout Box (Golden/Warning)
```css
background: #fef3c7;
border-left: 4px solid #f59e0b;
border-radius: 4px;
padding: 20px;
color: #78350f;
```

### Info Box (Cyan/Info)
```css
background: #f0fdfa;
border-left: 4px solid #10b981;
border-radius: 4px;
padding: 20px;
color: #065f46;
```

### Notice Box (Blue/Beta)
```css
background: #eff6ff;
border-left: 4px solid #3b82f6;
border-radius: 4px;
padding: 20px;
color: #1e40af;
```

---

## Email Design Guidelines

### Email Colors
- Header Gradient: `linear-gradient(135deg, #10b981 0%, #22d3ee 100%)`
- Background: `#f3f4f6`
- Card Background: `#ffffff`
- Text Primary: `#374151`
- Text Secondary: `#6b7280`
- Footer Background: `#f9fafb`

### Email Buttons
**Primary CTA:**
```css
background: linear-gradient(135deg, #10b981 0%, #22d3ee 100%);
color: #ffffff;
padding: 14px 28px;
border-radius: 6px;
font-weight: 600;
```

**Secondary CTA:**
```css
background: #ffffff;
color: #10b981;
border: 2px solid #10b981;
padding: 14px 28px;
border-radius: 6px;
font-weight: 600;
```

---

## Brand Voice & Tone

### Voice
- **Professional** but approachable
- **Technical** but not jargon-heavy
- **Encouraging** and empowering
- **Authentic** and transparent

### Tone Guidelines
- **Active, not passive:** "Discover your next route" vs "Routes can be discovered"
- **Direct and clear:** Get to the point quickly
- **Inclusive:** Use "we" and "you" to build community
- **Honest about beta:** "Expect rough edges, but rapid improvements"

### Key Phrases
- "Discover the road less traveled"
- "τρίβος (tribos) - the road less traveled"
- "Ride smarter"
- "AI-powered route planning"
- "You're not just testing software - you're shaping it"

---

## Logo Usage

**Text Logo:** Tribos.Studio
**Spacing:** Always maintain clear space around the logo (minimum 20px)
**Minimum Size:** 120px width for digital, 1 inch for print

**Color Variations:**
- Full color (on light backgrounds)
- White (on dark backgrounds)
- Gradient version (hero/premium contexts)

---

## Iconography

**Style:** Lucide React icons
**Weight:** Regular (1.5-2px stroke)
**Size Range:** 16px - 48px
**Colors:** Match brand palette

**Common Icons:**
- 🚴 Cycling
- 🗺️ Routes/Maps
- ⚡ AI/Technology
- 📊 Analytics
- 🎯 Goals

---

## Do's and Don'ts

### Do
✅ Use gradients for primary CTAs
✅ Maintain consistent border radius (lg = 20px default)
✅ Use the Greek τρίβος symbol when explaining the brand
✅ Keep designs clean with generous white space
✅ Use Ridge Green (#10b981) as the primary brand color

### Don't
❌ Use more than 2-3 colors in a single design
❌ Make text smaller than 14px for body copy
❌ Use sharp corners (always use border-radius)
❌ Mix different gradient directions in the same section
❌ Forget to maintain brand voice in copy

---

## Accessibility

**Color Contrast:**
- Text on white: Use gray-700 (#374151) or darker
- Text on dark: Use white (#ffffff) or gray-50 (#f8fafc)
- Minimum contrast ratio: 4.5:1 for body text, 3:1 for large text

**Interactive Elements:**
- Minimum touch target: 44x44px
- Clear hover/focus states
- Keyboard navigation support

---

## File Formats for Marketing

**Logos:**
- SVG (preferred for web)
- PNG (transparent background, 2x resolution)

**Images:**
- Hero images: 1920x1080px minimum
- Social media: Follow platform guidelines
- Email headers: 600px width

**Colors:**
- Provide in HEX, RGB, and HSL when needed
- Include Pantone equivalents for print

---

## Quick Reference

**Primary Brand Gradient:**
```
#10b981 → #22d3ee (135deg)
```

**Primary Colors:**
- Ridge Green: #10b981
- Electric Cyan: #22d3ee
- Sunset Gold: #f59e0b
- Midnight Slate: #0f172a

**Font:** Inter (weights: 400, 600, 800)

**Tagline:** Discover the road less traveled

---

## Contact

For brand questions or asset requests, contact the development team or refer to the theme.js file in the codebase.

**Theme File Location:** `/src/theme.js`
**CSS Variables:** `/src/styles/trail-tech-theme.css`
