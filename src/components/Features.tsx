import { motion } from 'framer-motion';
import { Palette, Type, Image, Moon, Sparkles } from 'lucide-react';
import { Card } from './Card';

const features = [
  {
    title: 'Custom Theme',
    description: 'Beautiful dark mode with warm amber and rose accents that create a welcoming atmosphere.',
    icon: <Palette className="w-6 h-6" />,
  },
  {
    title: 'Typography',
    description: 'Google Fonts integration with Quicksand and Poppins for modern, readable text.',
    icon: <Type className="w-6 h-6" />,
  },
  {
    title: 'Visual Assets',
    description: 'Stunning background images from Unsplash API for engaging visual experiences.',
    icon: <Image className="w-6 h-6" />,
  },
  {
    title: 'Dark Mode',
    description: 'Seamless theme switching with persistent preferences and smooth transitions.',
    icon: <Moon className="w-6 h-6" />,
  },
  {
    title: 'Animations',
    description: 'Framer Motion powered smooth animations and transitions throughout the UI.',
    icon: <Sparkles className="w-6 h-6" />,
  },
  {
    title: 'Icon Library',
    description: 'Lucide React icons for consistent, beautiful iconography across your application.',
    icon: <Sparkles className="w-6 h-6" />,
  },
];

export function Features() {
  return (
    <section className="py-20 px-4 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="max-w-7xl mx-auto">
        <motion.div
          className="text-center mb-16"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-4 font-quicksand">
            Design System Features
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 font-poppins max-w-2xl mx-auto">
            Everything you need to build beautiful, modern user interfaces
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              <Card
                title={feature.title}
                description={feature.description}
                icon={feature.icon}
              />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
