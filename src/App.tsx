import { ThemeProvider } from './hooks/useTheme';
import { Navbar } from './components/Navbar';
import { Hero } from './components/Hero';
import { Features } from './components/Features';
import { Gallery } from './components/Gallery';
import { Footer } from './components/Footer';

// Sample Unsplash images (free, no API key required for direct URLs)
const unsplashImages = [
  {
    id: '1',
    url: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=800&h=600&fit=crop',
    alt: 'Colorful gradient background',
    photographer: 'Patrick Hendry',
  },
  {
    id: '2',
    url: 'https://images.unsplash.com/photo-1557683316-973673baf926?w=800&h=600&fit=crop',
    alt: 'Abstract warm colors',
    photographer: 'Annie Spratt',
  },
  {
    id: '3',
    url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?w=800&h=600&fit=crop',
    alt: 'Modern design aesthetic',
    photographer: 'Luke Chesser',
  },
  {
    id: '4',
    url: 'https://images.unsplash.com/photo-1558591710-4b4a1ae0f04d?w=800&h=600&fit=crop',
    alt: 'Warm amber tones',
    photographer: 'Joshua Sortino',
  },
  {
    id: '5',
    url: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=800&h=600&fit=crop',
    alt: 'Artistic rose colors',
    photographer: 'Austin Neill',
  },
  {
    id: '6',
    url: 'https://images.unsplash.com/photo-1505330622279-bf7d7fc918f4?w=800&h=600&fit=crop',
    alt: 'Minimalist design',
    photographer: 'Alexandre Debiève',
  },
];

function App() {
  return (
    <ThemeProvider>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <Navbar />
        
        <main>
          <Hero
            title="UI/UX Design System"
            subtitle="Build beautiful, modern interfaces with Tailwind CSS, Framer Motion, and custom typography"
            backgroundImage="https://images.unsplash.com/photo-1579546929518-9e396f3cc809?w=1920&h=1080&fit=crop"
          />
          
          <Features />
          
          <Gallery images={unsplashImages} />
        </main>
        
        <Footer />
      </div>
    </ThemeProvider>
  );
}

export default App;
