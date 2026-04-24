import { Helmet } from "react-helmet-async";
import MoodCanvas from '@/features/art-therapy/MoodCanvas';

/**
 * Art Therapy Page
 * 
 * Now accessible to ALL users (free and premium).
 * - Free users: 3 AI analyses per month
 * - Premium users: Unlimited AI analyses
 * 
 * Drawing is always available, quota only affects AI analysis.
 */
export function ArtTherapyPage() {
  return (
    <>
      <Helmet>
        <title>Mood Canvas — Арт-терапия</title>
        <meta name="description" content="Выражай свои эмоции через рисование. Терапевтический инструмент для снижения тревоги." />
      </Helmet>
      
      <MoodCanvas />
    </>
  );
}

export default ArtTherapyPage;
