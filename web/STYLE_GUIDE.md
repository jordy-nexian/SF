# Stateless Forms — Brand Style Guide

## Overview

Stateless Forms uses a modern, dark-themed design that conveys trust, privacy, and technical sophistication. The aesthetic combines deep slate backgrounds with vibrant indigo/purple gradients, creating a premium feel that appeals to developers and technical teams.

---

## Color Palette

### Primary Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Indigo 500** | `#6366f1` | rgb(99, 102, 241) | Primary buttons, accents |
| **Indigo 600** | `#4f46e5` | rgb(79, 70, 229) | Hover states |
| **Purple 500** | `#8b5cf6` | rgb(139, 92, 246) | Gradient endpoints |
| **Purple 600** | `#7c3aed` | rgb(124, 58, 237) | Hover states |

### Accent Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Orange 500** | `#f97316` | rgb(249, 115, 22) | Highlights, warnings |
| **Pink 500** | `#ec4899` | rgb(236, 72, 153) | Gradient accents |
| **Green 400** | `#4ade80` | rgb(74, 222, 128) | Success states, checkmarks |
| **Red 400** | `#f87171` | rgb(248, 113, 113) | Error states |

### Background Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **Slate 900** | `#0f172a` | rgb(15, 23, 42) | Primary background |
| **Slate 800** | `#1e293b` | rgb(30, 41, 59) | Cards, elevated surfaces |
| **Slate 700** | `#334155` | rgb(51, 65, 85) | Borders, dividers |

### Text Colors

| Name | Hex | RGB | Usage |
|------|-----|-----|-------|
| **White** | `#ffffff` | rgb(255, 255, 255) | Primary headings |
| **Slate 100** | `#f1f5f9` | rgb(241, 245, 249) | Secondary headings |
| **Slate 300** | `#cbd5e1` | rgb(203, 213, 225) | Body text |
| **Slate 400** | `#94a3b8` | rgb(148, 163, 184) | Muted text, descriptions |
| **Slate 500** | `#64748b` | rgb(100, 116, 139) | Placeholder text, captions |

---

## Gradients

### Primary Gradient (Buttons, CTAs)
```css
background: linear-gradient(to right, #6366f1, #8b5cf6);
```

### Text Gradient (Headlines)
```css
background: linear-gradient(to right, #818cf8, #a78bfa, #f472b6);
-webkit-background-clip: text;
-webkit-text-fill-color: transparent;
```

### Border Gradient (Featured Cards)
```css
background: linear-gradient(to right, #6366f1, #8b5cf6, #ec4899);
```

### Feature Icon Gradients
| Purpose | Gradient |
|---------|----------|
| Schema/Forms | `linear-gradient(to bottom right, #6366f1, #8b5cf6)` |
| Security | `linear-gradient(to bottom right, #f97316, #ef4444)` |
| Speed/n8n | `linear-gradient(to bottom right, #10b981, #059669)` |
| Theming | `linear-gradient(to bottom right, #06b6d4, #3b82f6)` |
| Analytics | `linear-gradient(to bottom right, #ec4899, #f43f5e)` |
| Multi-tenant | `linear-gradient(to bottom right, #8b5cf6, #7c3aed)` |

---

## Typography

### Font Family
```css
font-family: 'Geist', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
```

### Font Sizes

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| Hero H1 | 4.5rem (72px) | 700 (Bold) | 1.1 |
| Section H2 | 3rem (48px) | 700 (Bold) | 1.2 |
| Card H3 | 1.25rem (20px) | 600 (Semibold) | 1.4 |
| Body | 1rem (16px) | 400 (Regular) | 1.6 |
| Small | 0.875rem (14px) | 400 (Regular) | 1.5 |
| Caption | 0.75rem (12px) | 400 (Regular) | 1.5 |

### Responsive Typography
- Mobile: Hero H1 scales to 3rem (48px)
- Mobile: Section H2 scales to 1.875rem (30px)

---

## Spacing

### Base Unit
8px grid system

| Token | Value | Usage |
|-------|-------|-------|
| `xs` | 4px | Tight spacing |
| `sm` | 8px | Icon gaps |
| `md` | 16px | Card padding |
| `lg` | 24px | Section gaps |
| `xl` | 32px | Large gaps |
| `2xl` | 48px | Section padding |
| `3xl` | 64px | Hero padding |
| `4xl` | 96px | Section margins |

---

## Components

### Buttons

#### Primary Button
```css
background: linear-gradient(to right, #6366f1, #8b5cf6);
color: white;
font-weight: 600;
padding: 0.75rem 1.5rem; /* 12px 24px */
border-radius: 9999px; /* Fully rounded */
box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
transition: all 0.3s ease;

/* Hover */
background: linear-gradient(to right, #4f46e5, #7c3aed);
box-shadow: 0 6px 25px rgba(99, 102, 241, 0.5);
transform: translateY(-2px);
```

#### Secondary Button
```css
background: transparent;
color: white;
font-weight: 600;
padding: 0.75rem 1.5rem;
border-radius: 9999px;
border: 1px solid rgba(255, 255, 255, 0.2);
transition: all 0.3s ease;

/* Hover */
background: rgba(255, 255, 255, 0.05);
border-color: rgba(255, 255, 255, 0.3);
```

### Cards

#### Glass Card
```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 1rem; /* 16px */
padding: 2rem; /* 32px */

/* Hover */
background: rgba(255, 255, 255, 0.07);
border-color: rgba(99, 102, 241, 0.3);
transform: translateY(-4px);
transition: all 0.3s ease;
```

#### Featured Card (with gradient border)
```css
/* Wrapper */
padding: 2px;
border-radius: 1rem;
background: linear-gradient(to right, #6366f1, #8b5cf6, #ec4899);

/* Inner content */
background: #0f172a;
border-radius: calc(1rem - 2px);
```

### Form Inputs
```css
background: #1e293b;
border: 1px solid #334155;
border-radius: 0.5rem; /* 8px */
padding: 0.75rem 1rem; /* 12px 16px */
color: white;

/* Focus */
border-color: #6366f1;
outline: none;
box-shadow: 0 0 0 1px #6366f1;
```

### Badges
```css
background: rgba(255, 255, 255, 0.05);
border: 1px solid rgba(255, 255, 255, 0.1);
border-radius: 9999px;
padding: 0.5rem 1rem; /* 8px 16px */
font-size: 0.875rem; /* 14px */
```

---

## Effects

### Ambient Glow Orbs
```css
.glow-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(100px);
  opacity: 0.3-0.4;
  pointer-events: none;
}

/* Indigo orb */
background: rgba(99, 102, 241, 0.3);
width: 500-600px;
height: 500-600px;

/* Purple orb */
background: rgba(139, 92, 246, 0.3);
width: 400-500px;
height: 400-500px;

/* Orange orb (accent) */
background: rgba(249, 115, 22, 0.2);
width: 300-400px;
height: 300-400px;
```

### Box Shadows

| Type | Value |
|------|-------|
| Button | `0 4px 15px rgba(99, 102, 241, 0.4)` |
| Button Hover | `0 6px 25px rgba(99, 102, 241, 0.5)` |
| Card | `0 4px 6px rgba(0, 0, 0, 0.1)` |
| Floating Badge | `0 10px 40px rgba(0, 0, 0, 0.3)` |

### Transitions
```css
transition: all 0.3s ease;
```

Standard easing for all interactive elements.

---

## Icons

### Style
- Stroke-based (not filled)
- 2px stroke width
- Rounded line caps and joins

### Sizes
| Context | Size |
|---------|------|
| Feature icons | 28px (in 56px container) |
| Inline icons | 20px |
| Small icons | 16px |

### Icon Containers
```css
width: 56px;
height: 56px;
border-radius: 16px;
background: /* gradient based on category */;
display: flex;
align-items: center;
justify-content: center;
```

---

## Layout

### Max Widths
| Context | Width |
|---------|-------|
| Content container | 1152px (72rem) |
| Narrow content | 768px (48rem) |
| Form/Card | 448px (28rem) |

### Grid
- 3-column grid for features (desktop)
- 2-column grid for features (tablet)
- 1-column grid (mobile)

Gap: 24px (1.5rem)

---

## Animation

### Hover Lift
```css
transform: translateY(-4px);
transition: transform 0.3s ease;
```

### Pulse (status indicators)
```css
animation: pulse 2s infinite;

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}
```

### Spin (loading)
```css
animation: spin 1s linear infinite;

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
```

---

## Responsive Breakpoints

| Name | Width | Usage |
|------|-------|-------|
| Mobile | < 640px | Single column, reduced spacing |
| Tablet | 640px - 1024px | 2-column grids |
| Desktop | > 1024px | Full layout |

---

## Usage Examples

### Hero Section
```jsx
<section style={{ background: '#0f172a' }}>
  <h1 className="text-5xl md:text-7xl font-bold">
    Forms that flow,{" "}
    <span style={{
      background: 'linear-gradient(to right, #818cf8, #a78bfa, #f472b6)',
      WebkitBackgroundClip: 'text',
      WebkitTextFillColor: 'transparent',
    }}>
      data that goes
    </span>
  </h1>
</section>
```

### Feature Card
```jsx
<div style={{ 
  background: 'rgba(255, 255, 255, 0.05)',
  border: '1px solid rgba(255, 255, 255, 0.1)',
  borderRadius: '1rem',
  padding: '2rem',
}}>
  <div style={{ 
    background: 'linear-gradient(to bottom right, #6366f1, #8b5cf6)',
    width: '56px',
    height: '56px',
    borderRadius: '16px',
  }}>
    {/* Icon */}
  </div>
  <h3 className="text-xl font-semibold">Feature Title</h3>
  <p style={{ color: '#94a3b8' }}>Description text</p>
</div>
```

### Primary Button
```jsx
<button style={{
  background: 'linear-gradient(to right, #6366f1, #8b5cf6)',
  color: 'white',
  fontWeight: 600,
  padding: '0.75rem 1.5rem',
  borderRadius: '9999px',
  boxShadow: '0 4px 15px rgba(99, 102, 241, 0.4)',
}}>
  Start building free
</button>
```

---

## Do's and Don'ts

### Do ✓
- Use the dark slate background for all marketing pages
- Apply gradient text to key headlines
- Include ambient glow orbs for depth
- Use fully rounded buttons (pill shape)
- Maintain consistent spacing with 8px grid
- Use glass-morphism for cards

### Don't ✗
- Don't use pure black (#000000) backgrounds
- Don't use flat colors without gradients on CTAs
- Don't mix different gradient directions randomly
- Don't use sharp corners on buttons
- Don't use more than 2-3 glow orbs per section
- Don't use light backgrounds on marketing pages

---

## File References

- Landing page: `src/app/page.tsx`
- Features page: `src/app/features/page.tsx`
- Pricing page: `src/app/pricing/page.tsx`
- Sign-in page: `src/app/signin/page.tsx`
- Header: `src/components/Header.tsx`
- Global styles: `src/app/globals.css`



