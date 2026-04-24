import { Suspense, lazy } from 'react';
import { cn } from '@/lib/utils';

const Spline = lazy(() => import('@splinetool/react-spline'));

interface SplineSceneProps {
  scene: string;
  className?: string;
}

export const SplineScene = ({ scene, className }: SplineSceneProps) => {
  return (
    <Suspense fallback={
      <div className={cn("flex items-center justify-center bg-background/5", className)}>
        <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-primary"></div>
      </div>
    }>
      <Spline 
        scene={scene}
        className={cn("w-full h-full", className)}
      />
    </Suspense>
  );
};
