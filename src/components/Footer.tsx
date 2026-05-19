import { motion } from 'framer-motion';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white py-12 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          {/* Brand */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-rose-500 flex items-center justify-center">
                <span className="text-white font-bold text-lg">DS</span>
              </div>
              <span className="text-xl font-bold font-quicksand">Design System</span>
            </div>
            <p className="text-gray-400 font-poppins text-sm">
              A modern UI/UX design system built with React, Tailwind CSS, and Framer Motion.
            </p>
          </motion.div>

          {/* Quick Links */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.1 }}
          >
            <h3 className="font-semibold mb-4 font-quicksand">Quick Links</h3>
            <ul className="space-y-2">
              {['Features', 'Components', 'Documentation', 'Examples'].map((link) => (
                <li key={link}>
                  <a
                    href={`#${link.toLowerCase()}`}
                    className="text-gray-400 hover:text-amber-400 transition-colors font-poppins text-sm"
                  >
                    {link}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Resources */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.2 }}
          >
            <h3 className="font-semibold mb-4 font-quicksand">Resources</h3>
            <ul className="space-y-2">
              {['Tailwind CSS', 'Framer Motion', 'Lucide Icons', 'Google Fonts'].map((resource) => (
                <li key={resource}>
                  <a
                    href="#"
                    className="text-gray-400 hover:text-amber-400 transition-colors font-poppins text-sm"
                  >
                    {resource}
                  </a>
                </li>
              ))}
            </ul>
          </motion.div>

          {/* Connect */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.4, delay: 0.3 }}
          >
            <h3 className="font-semibold mb-4 font-quicksand">Connect</h3>
            <p className="text-gray-400 font-poppins text-sm mb-4">
              Built with ❤️ using modern web technologies
            </p>
            <div className="flex gap-4">
              {['GitHub', 'Twitter', 'Discord'].map((social) => (
                <motion.a
                  key={social}
                  href="#"
                  className="text-gray-400 hover:text-amber-400 transition-colors font-poppins text-sm"
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                >
                  {social}
                </motion.a>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Bottom Bar */}
        <motion.div
          className="border-t border-gray-800 pt-8 text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.4 }}
        >
          <p className="text-gray-500 font-poppins text-sm">
            © {new Date().getFullYear()} Design System. All rights reserved.
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
