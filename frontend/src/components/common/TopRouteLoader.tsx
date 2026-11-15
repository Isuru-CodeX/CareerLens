import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TopRouteLoaderProps {
  loading?: boolean;
}

export const TopRouteLoader: React.FC<TopRouteLoaderProps> = ({ loading = false }) => {
  const [active, setActive] = useState(loading);

  useEffect(() => {
    if (loading) {
      setActive(true);
    } else {
      const timer = setTimeout(() => setActive(false), 500);
      return () => clearTimeout(timer);
    }
  }, [loading]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          id="careerlens-top-loader"
          initial={{ opacity: 0, scaleX: 0 }}
          animate={{ opacity: 1, scaleX: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="fixed top-0 left-0 right-0 h-[3px] z-[9999] origin-left bg-gradient-to-r from-cyan-400 via-indigo-500 via-purple-500 to-fuchsia-500 shadow-sm shadow-cyan-500/50"
        >
          <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-r from-transparent to-white/80 shadow-md" />
        </motion.div>
      )}
    </AnimatePresence>
  );
};
