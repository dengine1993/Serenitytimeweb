import { Canvas } from '@react-three/fiber';
import { memo, useMemo } from 'react';
import { get3DQualitySettings } from '@/utils/performance';

interface OptimizedCanvasProps {
  children: React.ReactNode;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  camera?: any;
  className?: string;
}

/**
 * Optimized Canvas wrapper with performance-based settings
 * Automatically adjusts quality based on device capabilities
 */
export const OptimizedCanvas = memo(({ children, camera, className }: OptimizedCanvasProps) => {
  const qualitySettings = useMemo(() => get3DQualitySettings(), []);

  return (
    <Canvas
      camera={camera}
      className={className}
      dpr={qualitySettings.pixelRatio}
      shadows={qualitySettings.shadows}
      gl={{
        antialias: qualitySettings.antialias,
        powerPreference: qualitySettings.powerPreference as 'high-performance' | 'low-power' | 'default',
        alpha: true,
        stencil: false,
        depth: true,
      }}
      performance={{
        min: 0.5,
        max: 1,
        debounce: 200,
      }}
    >
      {children}
    </Canvas>
  );
});

OptimizedCanvas.displayName = 'OptimizedCanvas';
