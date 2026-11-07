import { createContext } from 'react';
import { LoaderConfig } from '../components/common/FuturisticTransitionLoader';

export interface LoadingContextType {
  showLoader: (config?: LoaderConfig) => void;
  hideLoader: () => void;
  triggerTransition: (config?: LoaderConfig, durationMs?: number) => Promise<void>;
  isLoading: boolean;
}

export const LoadingContext = createContext<LoadingContextType | undefined>(undefined);

