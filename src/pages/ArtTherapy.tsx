import { Helmet } from "react-helmet-async";
import { Suspense, lazy } from "react";

// Lazy: MoodCanvas тянет konva (~150KB). Грузим только при заходе на /art-therapy.
const MoodCanvas = lazy(() => import('@/features/art-therapy/MoodCanvas'));

export function ArtTherapyPage() {
  return (
    <>
      <Helmet>
        <title>Mood Canvas — Образ дня</title>
        <meta name="description" content="Нарисуй свой шаг — Джива увидит и мягко отзовётся. Образ дня для пути к себе." />
      </Helmet>

      <Suspense fallback={
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-primary" />
        </div>
      }>
        <MoodCanvas />
      </Suspense>
    </>
  );
}

export default ArtTherapyPage;
