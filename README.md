# UI/UX Design System - Phase 6

A modern, beautiful UI/UX design system built with cutting-edge frontend technologies.

## 🎨 Features

### Frontend Stack
- **Tailwind CSS** - Utility-first CSS framework with custom theme
  - Dark mode support
  - Warm amber and rose color accents
  - Custom configuration for brand colors

- **Framer Motion** - Smooth animations and transitions
  - Page transitions
  - Hover effects
  - Scroll-based animations
  - Gesture support

- **Lucide React** - Beautiful icon library
  - Consistent iconography
  - SVG-based icons
  - Extensive icon collection

- **Google Fonts API** - Custom typography
  - **Quicksand** - Rounded sans-serif for headings
  - **Poppins** - Geometric sans-serif for body text

### Assets
- **Unsplash Images** - Free, high-quality background images
  - No API key required for direct URLs
  - Beautiful decorative visuals
  - Responsive image loading

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## 📁 Project Structure

```
/workspace
├── src/
│   ├── components/
│   │   ├── Navbar.tsx       # Navigation bar with theme toggle
│   │   ├── Hero.tsx         # Hero section with animations
│   │   ├── Features.tsx     # Feature cards grid
│   │   ├── Gallery.tsx      # Unsplash image gallery
│   │   ├── Card.tsx         # Reusable card component
│   │   ├── Button.tsx       # Animated button component
│   │   ├── ThemeToggle.tsx  # Dark/Light mode switch
│   │   └── Footer.tsx       # Footer component
│   ├── hooks/
│   │   └── useTheme.tsx     # Theme context hook
│   ├── App.tsx              # Main application
│   ├── main.tsx             # Entry point
│   └── index.css            # Global styles + Tailwind
├── index.html               # HTML template with Google Fonts
├── tailwind.config.js       # Tailwind configuration
├── postcss.config.js        # PostCSS configuration
├── vite.config.ts           # Vite configuration
├── tsconfig.json            # TypeScript configuration
└── package.json             # Dependencies
```

## 🎯 Components

### ThemeToggle
Animated sun/moon icon button for switching between light and dark modes.

### Hero
Full-screen hero section with:
- Parallax background image
- Animated gradient orbs
- Staggered text animations
- Call-to-action buttons

### Card
Reusable card component with:
- Hover animations
- Icon support
- Image support
- Glassmorphism effect

### Button
Animated button with variants:
- Primary (gradient)
- Secondary (solid)
- Outline (border)

### Features
Grid of feature cards showcasing design system capabilities.

### Gallery
Responsive image gallery using Unsplash photos.

## 🎨 Color Palette

### Amber (Warm)
- 50-900 scale available
- Primary accent color
- Used for highlights and CTAs

### Rose (Warm)
- 50-900 scale available
- Secondary accent color
- Used for gradients and accents

## 🔧 Configuration

### Tailwind Config
Custom theme extends default Tailwind with:
- Font families (Quicksand, Poppins)
- Extended amber colors
- Extended rose colors
- Dark mode class strategy

### Google Fonts
Loaded in `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Quicksand:wght@300;400;500;600;700&display=swap" rel="stylesheet">
```

## 📝 Usage Examples

### Using Components
```tsx
import { Button, Card, ThemeToggle } from './components';

function MyComponent() {
  return (
    <div>
      <ThemeToggle />
      <Button variant="primary">Click Me</Button>
      <Card title="Hello" description="World" />
    </div>
  );
}
```

### Using Theme Hook
```tsx
import { useTheme } from './hooks/useTheme';

function ThemedComponent() {
  const { isDark, toggleTheme } = useTheme();
  
  return (
    <div className={isDark ? 'dark' : 'light'}>
      {/* Your content */}
    </div>
  );
}
```

## 🌟 Animations

All components use Framer Motion for:
- **Entrance animations** - Elements fade/slide in on mount
- **Hover effects** - Scale, rotate, and color transitions
- **Scroll animations** - Trigger animations when elements enter viewport
- **Theme transitions** - Smooth color changes between modes

## 📄 License

MIT License - feel free to use this design system in your projects!

---

Built with ❤️ using React, Tailwind CSS, Framer Motion, and Lucide Icons
