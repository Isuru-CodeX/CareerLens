import React, { useState, useCallback, useRef } from 'react';
import {
  FuturisticTransitionLoader,
  LoaderConfig
} from '../components/common/FuturisticTransitionLoader';
import { LoadingContext } from './loadingContextDef';

export const LoadingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [config, setConfig] = useState<LoaderConfig>({
    title: 'Loading...',
    subtitle: 'Synchronizing career intelligence & telemetry...',
    badge: 'Neural Career Engine',
    icon: 'brain',
    accentColor: 'indigo'
  });

  const timerRef = useRef<any>(null);

  const showLoader = useCallback((newConfig?: LoaderConfig) => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (newConfig) {
      setConfig((prev) => ({ ...prev, ...newConfig }));
    }
    setIsOpen(true);
  }, []);

  const hideLoader = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setIsOpen(false);
  }, []);

  const triggerTransition = useCallback((transitionConfig?: LoaderConfig, durationMs = 500): Promise<void> => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (transitionConfig) {
      setConfig((prev) => ({ ...prev, ...transitionConfig }));
    }
    setIsOpen(true);

    return new Promise((resolve) => {
      timerRef.current = setTimeout(() => {
        setIsOpen(false);
        timerRef.current = null;
        resolve();
      }, durationMs);
    });
  }, []);

  return (
    <LoadingContext.Provider value={{ showLoader, hideLoader, triggerTransition, isLoading: isOpen }}>
      {children}
      <FuturisticTransitionLoader
        isOpen={isOpen}
        title={config.title}
        subtitle={config.subtitle}
        badge={config.badge}
        icon={config.icon}
        accentColor={config.accentColor}
      />
    </LoadingContext.Provider>
  );
};
