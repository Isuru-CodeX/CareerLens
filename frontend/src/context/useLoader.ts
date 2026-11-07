import { useContext } from 'react';
import { LoadingContext, LoadingContextType } from './loadingContextDef';

export const useLoader = (): LoadingContextType => {
  const context = useContext(LoadingContext);
  if (!context) {
    throw new Error('useLoader must be used within a LoadingProvider');
  }
  return context;
};
