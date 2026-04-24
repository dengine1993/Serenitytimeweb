import React, { useState, useRef, useEffect } from 'react';
import { Stage, Layer, Line } from 'react-konva';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Brush, Eraser, Undo, Trash2, Check, Home, Image, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { useArtTherapyQuota } from '@/hooks/useArtTherapyQuota';


import { toast } from 'sonner';
import { AnalysisResultModal } from './AnalysisResultModal';
import { WelcomeOverlay } from './WelcomeOverlay';
import { PostDrawingScreen } from './PostDrawingScreen';
import { ArtQuotaExhaustedCard } from '@/components/paywall/ArtQuotaExhaustedCard';

interface DrawLine {
  tool: 'brush' | 'eraser';
  points: number[];
  color: string;
  size: number;
  opacity: number;
}

const EMOTION_COLORS = [
  { key: 'calmBlue', value: '#A8D8EA' },
  { key: 'sereneTeal', value: '#7FCDCD' },
  { key: 'peacefulGreen', value: '#B4E7CE' },
  { key: 'softMint', value: '#C7EFCF' },
  { key: 'warmPeach', value: '#FFD4A3' },
  { key: 'gentleCoral', value: '#FFB6B9' },
  { key: 'tenderPink', value: '#FFC6D9' },
  { key: 'dreamyLavender', value: '#D4BBDD' },
  { key: 'mysticPurple', value: '#C5A3D9' },
  { key: 'sunsetOrange', value: '#FFB88C' },
  { key: 'goldenYellow', value: '#FFE5A0' },
  { key: 'softGray', value: '#C8C8C8' },
  { key: 'deepGray', value: '#808080' },
  { key: 'charcoal', value: '#4A4A4A' },
  { key: 'pureWhite', value: '#FFFFFF' },
  { key: 'deepBlack', value: '#1A1A1A' },
];

const FloatingParticle: React.FC<{ delay: number }> = ({ delay }) => {
  const [initialX] = useState(() => Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400));
  const [targetX] = useState(() => Math.random() * (typeof window !== 'undefined' ? window.innerWidth : 400));
  
  return (
    <motion.div
      className="absolute w-2 h-2 bg-white/30 rounded-full"
      initial={{ x: initialX, y: typeof window !== 'undefined' ? window.innerHeight + 20 : 800, opacity: 0 }}
      animate={{
        y: -20,
        opacity: [0, 0.6, 0],
        x: targetX,
      }}
      transition={{
        duration: 8 + Math.random() * 4,
        delay: delay,
        repeat: Infinity,
        ease: 'linear',
      }}
    />
  );
};

export function MoodCanvas() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t, language } = useI18n();
  const { allowed: canAnalyze, remaining, limit, isPremium, periodType, refresh: refreshQuota } = useArtTherapyQuota();
  
  const [lines, setLines] = useState<DrawLine[]>([]);
  const [tool, setTool] = useState<'brush' | 'eraser'>('brush');
  const [color, setColor] = useState(EMOTION_COLORS[0].value);
  const [brushSize, setBrushSize] = useState([15]);
  const [opacity, setOpacity] = useState([80]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showWelcome, setShowWelcome] = useState(true);
  const [showPostDrawing, setShowPostDrawing] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [showArtQuotaExhausted, setShowArtQuotaExhausted] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<{ feedback: string; tags: string[]; thumbnail: string } | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showCanvas, setShowCanvas] = useState(false);
  const [currentThumbnail, setCurrentThumbnail] = useState('');
  const stageRef = useRef<any>(null);
  const [cursorPosition, setCursorPosition] = useState({ x: 0, y: 0 });
  const [showCursor, setShowCursor] = useState(false);
  const [dimensions, setDimensions] = useState({ 
    width: typeof window !== 'undefined' ? window.innerWidth : 800, 
    height: typeof window !== 'undefined' ? window.innerHeight : 600 
  });


  useEffect(() => {
    const handleResize = () => {
      setDimensions({ 
        width: window.innerWidth, 
        height: window.innerHeight 
      });
    };
    window.addEventListener('resize', handleResize);
    setTimeout(() => setShowCanvas(true), 500);
    
    // Prevent page scrolling on touch for art therapy
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';
    document.body.style.position = 'fixed';
    document.body.style.width = '100%';
    document.body.style.height = '100%';
    
    return () => {
      window.removeEventListener('resize', handleResize);
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.body.style.position = '';
      document.body.style.width = '';
      document.body.style.height = '';
    };
  }, []);

  const handleMouseDown = (e: any) => {
    setIsDrawing(true);
    const pos = e.target.getStage().getPointerPosition();
    if (pos) {
      setLines([...lines, { tool, points: [pos.x, pos.y], color, size: brushSize[0], opacity: opacity[0] / 100 }]);
    }
  };

  const handleMouseMove = (e: any) => {
    const stage = e.target.getStage();
    const point = stage.getPointerPosition();
    if (point) {
      setCursorPosition({ x: point.x, y: point.y });
      setShowCursor(true);
      
      if (isDrawing && lines.length > 0) {
        const lastLine = lines[lines.length - 1];
        lastLine.points = lastLine.points.concat([point.x, point.y]);
        setLines([...lines.slice(0, -1), lastLine]);
      }
    }
  };

  const handleMouseUp = () => {
    setIsDrawing(false);
  };

  const handleUndo = () => {
    setLines(lines.slice(0, -1));
  };

  const handleClear = () => {
    setLines([]);
  };

  const createCanvasThumbnail = async () => {
    const stage = stageRef.current?.getStage?.() ?? stageRef.current;
    if (!stage) return '';

    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });

    stage.batchDraw?.();

    const stageWidth = stage.width?.() ?? canvasWidth;
    const stageHeight = stage.height?.() ?? canvasHeight;
    const sceneCanvas = stage.container?.()?.querySelector('canvas');

    if (sceneCanvas instanceof HTMLCanvasElement) {
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = stageWidth;
      exportCanvas.height = stageHeight;

      const ctx = exportCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, stageWidth, stageHeight);
        ctx.drawImage(sceneCanvas, 0, 0, stageWidth, stageHeight);
        return exportCanvas.toDataURL('image/png');
      }
    }

    return stage.toDataURL({
      mimeType: 'image/png',
      pixelRatio: 2,
    });
  };

  // Handle "Готово" button - save and show post-drawing screen
  const handleDone = async () => {
    if (lines.length === 0) return;
    
    const uri = await createCanvasThumbnail();
    if (!uri) {
      toast.error('Не удалось сохранить рисунок');
      return;
    }

    setCurrentThumbnail(uri);
    setShowPostDrawing(true);
  };

  // Analyze drawing with AI (quota-based for free users, unlimited for premium)
  const handleAnalyze = async () => {
    // Check quota before analyzing
    if (!canAnalyze) {
      setShowPostDrawing(false);
      setShowArtQuotaExhausted(true);
      return;
    }

    if (!currentThumbnail) return;
    
    setIsAnalyzing(true);
    
    try {
      const base64Data = currentThumbnail.replace(/^data:image\/\w+;base64,/, '');
      
      const { data, error } = await supabase.functions.invoke('analyze-drawing', {
        body: { image: base64Data, language: 'ru' }
      });
      
      if (error) {
        let serverMessage = error.message;
        const response = error.context;

        if (response instanceof Response) {
          try {
            const errorPayload = await response.clone().json();
            serverMessage = errorPayload?.error || errorPayload?.message || serverMessage;
          } catch {
            try {
              serverMessage = await response.text();
            } catch {
              // ignore secondary parsing failure
            }
          }
        }

        throw Object.assign(new Error(serverMessage || 'Не удалось получить анализ'), {
          status: response instanceof Response ? response.status : undefined,
        });
      }

      if (!data?.feedback) {
        throw new Error('Пустой ответ анализа');
      }
      
      // Server-side tracking via edge function; just refresh client quota
      refreshQuota();
      
      setAnalysisResult({
        feedback: data.feedback,
        tags: data.tags || ['творчество', 'самовыражение'],
        thumbnail: currentThumbnail,
      });
      setShowPostDrawing(false);
      setShowAnalysis(true);
    } catch (error: any) {
      console.error('Analysis error:', error);
      const status = error?.status ?? error?.context?.status;

      if (status === 403) {
        setShowPostDrawing(false);
        setShowArtQuotaExhausted(true);
      } else if (status === 401) {
        toast.error('Сессия истекла. Войдите заново.');
        setShowPostDrawing(false);
      } else {
        toast.error(error?.message || 'Не удалось получить анализ. Попробуйте позже.');
        setShowPostDrawing(false);
      }
    } finally {
      setIsAnalyzing(false);
    }
  };

  const extractTags = (drawLines: DrawLine[]): string[] => {
    const tags: string[] = [];
    const colorCounts: { [key: string]: number } = {};
    
    drawLines.forEach(line => {
      colorCounts[line.color] = (colorCounts[line.color] || 0) + 1;
    });
    
    const dominantColor = Object.keys(colorCounts).reduce((a, b) => 
      colorCounts[a] > colorCounts[b] ? a : b, EMOTION_COLORS[0].value
    );
    
    if (dominantColor.includes('A8D8EA') || dominantColor.includes('7FCDCD')) {
      tags.push('спокойствие', 'умиротворение');
    } else if (dominantColor.includes('FFB6B9') || dominantColor.includes('FFC6D9')) {
      tags.push('нежность', 'надежда');
    } else if (dominantColor.includes('4A4A4A') || dominantColor.includes('1A1A1A')) {
      tags.push('глубина', 'размышления');
    } else {
      tags.push('творчество', 'эмоции');
    }
    
    return tags;
  };

  const generateMockAnalysis = (drawLines: DrawLine[]): string => {
    const colorCounts: { [key: string]: number } = {};
    drawLines.forEach(line => {
      colorCounts[line.color] = (colorCounts[line.color] || 0) + 1;
    });
    
    const dominantColor = Object.keys(colorCounts).reduce((a, b) => 
      colorCounts[a] > colorCounts[b] ? a : b, EMOTION_COLORS[0].value
    );
    
    const totalPoints = drawLines.reduce((sum, line) => sum + line.points.length, 0);
    const avgSize = drawLines.reduce((sum, line) => sum + line.size, 0) / drawLines.length || 15;
    
    let interpretation = '';
    
    if (dominantColor.includes('A8D8EA') || dominantColor.includes('7FCDCD')) {
      interpretation = 'Вижу успокаивающие синие и бирюзовые оттенки, струящиеся по вашему холсту — словно нежные волны, ищущие покоя. ';
    } else if (dominantColor.includes('FFB6B9') || dominantColor.includes('FFC6D9')) {
      interpretation = 'Мягкие розовые и тёплые тона проступают — здесь есть нежность, возможно, уязвимость, смешанная с надеждой. ';
    } else if (dominantColor.includes('4A4A4A') || dominantColor.includes('1A1A1A')) {
      interpretation = 'Глубокие, тёмные штрихи заполняют пространство — ощущается тяжесть, словно вы несёте груз, который трудно назвать. ';
    } else {
      interpretation = 'Прекрасное сочетание цветов танцует на вашем холсте — эмоции смешиваются и перетекают друг в друга. ';
    }
    
    if (avgSize > 20) {
      interpretation += 'Смелые, сильные штрихи говорят об интенсивности, потребности быть увиденным и услышанным. ';
    } else {
      interpretation += 'Деликатные, мягкие следы — сегодня вы выражаете себя с особой нежностью. ';
    }
    
    if (totalPoints > 500) {
      interpretation += 'Энергии много, возможно, беспокойство или стремление к освобождению. ';
    }
    
    interpretation += '\n\nВы не одиноки в том, что чувствуете. Сделайте глубокий вдох и знайте, что самовыражение — даже без слов — это мощный акт заботы о себе. 💙';
    
    return interpretation;
  };

  const handleNewDrawing = () => {
    setShowAnalysis(false);
    setShowPostDrawing(false);
    setAnalysisResult(null);
    setCurrentThumbnail('');
    setLines([]);
  };

  const handleClosePostDrawing = () => {
    setShowPostDrawing(false);
  };

  const handleStartDrawing = () => {
    setShowWelcome(false);
  };

  const handleSaveToJournal = async () => {
    if (!user || !analysisResult) {
      toast.error('Не удалось сохранить рисунок');
      return;
    }

    setIsSaving(true);
    try {
      if (isPremium) {
        const { error: artError } = await supabase
          .from('user_art_therapy_entries')
          .insert({
            user_id: user.id,
            image_base64: analysisResult.thumbnail,
            analysis_text: analysisResult.feedback,
            tags: analysisResult.tags
          });

        if (artError) throw artError;
      } else {
        const { data: existingArtEntry, error: existingArtEntryError } = await supabase
          .from('user_art_therapy_entries')
          .select('id, image_base64')
          .eq('user_id', user.id)
          .eq('analysis_text', analysisResult.feedback)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (existingArtEntryError) throw existingArtEntryError;

        if (!existingArtEntry) {
          const { error: insertArtError } = await supabase
            .from('user_art_therapy_entries')
            .insert({
              user_id: user.id,
              image_base64: analysisResult.thumbnail,
              analysis_text: analysisResult.feedback,
              tags: analysisResult.tags
            });

          if (insertArtError) throw insertArtError;
        } else if (!existingArtEntry.image_base64) {
          const { error: updateArtError } = await supabase
            .from('user_art_therapy_entries')
            .update({ image_base64: analysisResult.thumbnail })
            .eq('id', existingArtEntry.id);

          if (updateArtError) throw updateArtError;
        }
      }

      const today = new Date().toISOString().split('T')[0];
      const artNote = `🎨 Арт-терапия: ${analysisResult.tags.join(', ')}\n\n${analysisResult.feedback.slice(0, 200)}...`;
      
      const { data: existing, error: existingError } = await supabase
        .from('mood_entries')
        .select('id, note')
        .eq('user_id', user.id)
        .eq('entry_date', today)
        .maybeSingle();

      if (existingError) throw existingError;

      if (existing) {
        const newNote = existing.note ? `${existing.note}\n\n${artNote}` : artNote;
        const { error: updateMoodError } = await supabase
          .from('mood_entries')
          .update({ note: newNote, updated_at: new Date().toISOString() })
          .eq('id', existing.id);

        if (updateMoodError) throw updateMoodError;
      } else {
        const { error: insertMoodError } = await supabase
          .from('mood_entries')
          .insert({
            user_id: user.id,
            mood: 'calm',
            note: artNote,
            entry_date: today
          });

        if (insertMoodError) throw insertMoodError;
      }
      
      toast.success('Рисунок сохранён в галерею и дневник!');
      handleNewDrawing();
    } catch (error) {
      console.error('Save error:', error);
      toast.error('Рисунок не сохранился в галерею');
    } finally {
      setIsSaving(false);
    }
  };

  const canvasWidth = dimensions.width < 640 ? dimensions.width - 32 : Math.min(dimensions.width - 48, 1800);
  const canvasHeight = Math.max(dimensions.height - (dimensions.width < 640 ? 340 : 360), 280);

  return (
    <div className="relative w-full h-screen overflow-hidden bg-gradient-to-br from-blue-100 via-purple-50 to-orange-100">
      {/* Animated Background Particles */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        {[...Array(30)].map((_, i) => (
          <FloatingParticle key={i} delay={i * 0.3} />
        ))}
      </div>

      {/* Animated Waves */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden opacity-20">
        <motion.div
          className="absolute bottom-0 left-0 right-0 h-64 bg-gradient-to-t from-teal-300/30 to-transparent"
          animate={{
            y: [0, -20, 0],
          }}
          transition={{
            duration: 6,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>

      {/* Top Navigation */}
      <div className="absolute top-6 left-4 right-4 z-20 flex justify-between items-center">
        <Button
          variant="ghost"
          size="icon"
          className="bg-gray-800 text-white hover:bg-gray-700 rounded-full shadow-xl border border-gray-600"
          onClick={() => navigate('/app')}
        >
          <Home className="w-5 h-5 text-white" />
        </Button>
        <motion.div 
          initial={{ y: -20, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.6, type: "spring" }}
          className="relative"
        >
          {/* Glow effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-teal-400/40 via-cyan-400/40 to-purple-400/40 blur-xl rounded-full scale-110" />
          
          <div className="relative bg-white/95 backdrop-blur-md px-8 py-3.5 rounded-full shadow-2xl border border-white/60 flex items-center gap-3">
            {/* Animated logo icon */}
            <motion.div
              animate={{ 
                rotate: [0, 5, -5, 0],
                scale: [1, 1.1, 1]
              }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="relative"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 via-cyan-500 to-teal-600 flex items-center justify-center shadow-lg">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              {/* Sparkle accent */}
              <motion.div
                animate={{ scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 2, repeat: Infinity, delay: 0.5 }}
                className="absolute -top-1 -right-1 w-2 h-2 bg-yellow-400 rounded-full"
              />
            </motion.div>
            
            {/* Stylized text */}
            <div className="flex flex-col">
              <span className="text-xl font-bold bg-gradient-to-r from-gray-800 via-teal-700 to-gray-800 bg-clip-text text-transparent tracking-tight">
                {t('artTherapy.title')}
              </span>
              <span className="text-[10px] text-teal-600/80 font-medium tracking-widest uppercase -mt-0.5">
                {t('artTherapy.subtitle')}
              </span>
            </div>
          </div>
        </motion.div>
        <div className="flex items-center gap-2">
          {/* Quota indicator */}
          {user && (
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg border border-white/60 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-teal-500" />
              <span className="text-xs font-medium text-gray-700">
                {remaining}/{limit} {isPremium ? t('artTherapy.today') : 'бесплатно'}
              </span>
            </motion.div>
          )}
          <Button
            variant="ghost"
            size="icon"
            className="bg-gray-800 text-white hover:bg-gray-700 rounded-full shadow-xl border border-gray-600"
            onClick={() => navigate('/settings?tab=gallery')}
            title={t('artTherapy.gallery')}
          >
            <Image className="w-5 h-5 text-white" />
          </Button>
        </div>
      </div>

      {/* Canvas */}
      <AnimatePresence>
        {showCanvas && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            className="absolute inset-0 flex items-center justify-center px-4 sm:px-6 pt-20 sm:pt-24 pb-[260px] sm:pb-[300px]"
          >
            <div className="relative w-full h-full max-w-7xl">
              <motion.div 
                className="absolute inset-0 bg-white/95 backdrop-blur-md rounded-3xl sm:rounded-[2.5rem] shadow-2xl overflow-hidden border-2 border-white/60"
                animate={{
                  boxShadow: [
                    '0 0 30px rgba(127, 205, 205, 0.4), 0 0 60px rgba(168, 216, 234, 0.3)',
                    '0 0 50px rgba(127, 205, 205, 0.6), 0 0 80px rgba(168, 216, 234, 0.4)',
                    '0 0 30px rgba(127, 205, 205, 0.4), 0 0 60px rgba(168, 216, 234, 0.3)',
                  ],
                }}
                transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
              >
                <Stage
                  ref={stageRef}
                  width={canvasWidth}
                  height={canvasHeight}
                  onMouseDown={handleMouseDown}
                  onMousemove={handleMouseMove}
                  onMouseup={handleMouseUp}
                  onMouseLeave={() => setShowCursor(false)}
                  onTouchStart={handleMouseDown}
                  onTouchMove={handleMouseMove}
                  onTouchEnd={handleMouseUp}
                  style={{ cursor: 'crosshair', touchAction: 'none' }}
                >
                  <Layer>
                    {lines.map((line, i) => (
                      <Line
                        key={i}
                        points={line.points}
                        stroke={line.tool === 'eraser' ? '#FFFFFF' : line.color}
                        strokeWidth={line.size}
                        tension={0.4}
                        lineCap="round"
                        lineJoin="round"
                        globalCompositeOperation={
                          line.tool === 'eraser' ? 'destination-out' : 'source-over'
                        }
                        opacity={line.opacity}
                        shadowBlur={line.tool === 'brush' ? 12 : 0}
                        shadowColor={line.color}
                        shadowOpacity={0.5}
                      />
                    ))}
                    {/* Custom cursor with outline */}
                    {showCursor && tool === 'brush' && (
                      <>
                        <Line
                          points={[cursorPosition.x, cursorPosition.y]}
                          stroke="#000000"
                          strokeWidth={brushSize[0] + 4}
                          opacity={0.3}
                          lineCap="round"
                        />
                        <Line
                          points={[cursorPosition.x, cursorPosition.y]}
                          stroke={color}
                          strokeWidth={brushSize[0]}
                          opacity={opacity[0] / 100}
                          lineCap="round"
                          shadowBlur={15}
                          shadowColor={color}
                          shadowOpacity={0.8}
                        />
                      </>
                    )}
                    {showCursor && tool === 'eraser' && (
                      <Line
                        points={[cursorPosition.x, cursorPosition.y]}
                        stroke="#888888"
                        strokeWidth={brushSize[0]}
                        opacity={0.5}
                        lineCap="round"
                      />
                    )}
                  </Layer>
                </Stage>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Unified Bottom Panel: Colors + Toolbar */}
      <motion.div
        initial={{ y: 120, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.6 }}
        className="fixed bottom-0 inset-x-0 z-30 flex justify-center pb-[env(safe-area-inset-bottom,0px)]"
      >
        <div className="bg-white/95 backdrop-blur-md rounded-t-2xl sm:rounded-t-[2rem] px-3 sm:px-6 py-2.5 sm:py-4 shadow-2xl border-t-2 border-x-2 border-white/60 w-full max-w-4xl max-h-[45dvh] overflow-y-auto">
          {/* Color Palette */}
          <div className="flex flex-col gap-1.5 items-center mb-2 sm:mb-3">
            <div className="flex gap-1 sm:gap-2.5 justify-center flex-wrap">
              {EMOTION_COLORS.slice(0, 11).map((emotionColor) => (
                <motion.button
                  key={emotionColor.value}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setColor(emotionColor.value);
                    setTool('brush');
                  }}
                  className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full transition-all shadow-md border-2 flex-shrink-0 ${
                    color === emotionColor.value && tool === 'brush'
                      ? 'ring-2 sm:ring-4 ring-teal-400 ring-offset-1 sm:ring-offset-2 border-teal-400'
                      : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ 
                    backgroundColor: emotionColor.value,
                    boxShadow: color === emotionColor.value && tool === 'brush' 
                      ? `0 0 12px ${emotionColor.value}80` 
                      : `0 2px 6px ${emotionColor.value}30`
                  }}
                  title={t(`artTherapy.colors.${emotionColor.key}` as any)}
                />
              ))}
            </div>
            <div className="flex gap-1 sm:gap-2.5 justify-center flex-wrap">
              {EMOTION_COLORS.slice(11).map((emotionColor) => (
                <motion.button
                  key={emotionColor.value}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    setColor(emotionColor.value);
                    setTool('brush');
                  }}
                  className={`w-7 h-7 sm:w-10 sm:h-10 rounded-full transition-all shadow-md border-2 flex-shrink-0 ${
                    color === emotionColor.value && tool === 'brush'
                      ? 'ring-2 sm:ring-4 ring-teal-400 ring-offset-1 sm:ring-offset-2 border-teal-400'
                      : emotionColor.value === '#FFFFFF' 
                        ? 'border-gray-300 hover:border-gray-400'
                        : 'border-gray-200 hover:border-gray-400'
                  }`}
                  style={{ 
                    backgroundColor: emotionColor.value,
                    boxShadow: color === emotionColor.value && tool === 'brush' 
                      ? `0 0 12px ${emotionColor.value}80` 
                      : `0 2px 6px rgba(0,0,0,0.1)`
                  }}
                  title={t(`artTherapy.colors.${emotionColor.key}` as any)}
                />
              ))}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap justify-center">
            <Button
              variant={tool === 'brush' ? 'default' : 'outline'}
              size="icon"
              onClick={() => setTool('brush')}
              className={`rounded-full w-9 h-9 sm:w-12 sm:h-12 ${
                tool === 'brush' 
                  ? 'bg-gradient-to-r from-teal-400 to-teal-500 shadow-lg shadow-teal-300/50 text-white' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Brush className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTool('eraser')}
              className={`rounded-full w-9 h-9 sm:w-12 sm:h-12 ${
                tool === 'eraser' 
                  ? 'bg-gray-100 border-gray-400 text-gray-800' 
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Eraser className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <div className="flex items-center gap-1.5 sm:gap-3 bg-white rounded-full px-3 sm:px-5 py-1.5 sm:py-3 border border-gray-200">
              <span className="text-[10px] sm:text-sm font-medium text-gray-600">{t('artTherapy.size')}</span>
              <Slider
                value={brushSize}
                onValueChange={setBrushSize}
                min={5}
                max={50}
                step={1}
                variant="dark"
                className="w-14 sm:w-24"
              />
              <span className="text-[10px] font-medium text-gray-600 w-4 sm:w-6">{brushSize[0]}</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-3 bg-white rounded-full px-3 sm:px-5 py-1.5 sm:py-3 border border-gray-200">
              <span className="text-[10px] sm:text-sm font-medium text-gray-600">{t('artTherapy.opacity')}</span>
              <Slider
                value={opacity}
                onValueChange={setOpacity}
                min={10}
                max={100}
                step={5}
                variant="dark"
                className="w-14 sm:w-24"
              />
              <span className="text-[10px] font-medium text-gray-600 w-6 sm:w-9">{opacity[0]}%</span>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handleUndo}
              disabled={lines.length === 0}
              className="rounded-full w-9 h-9 sm:w-12 sm:h-12 bg-white border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <Undo className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={handleClear}
              disabled={lines.length === 0}
              className="rounded-full w-9 h-9 sm:w-12 sm:h-12 bg-white border-gray-200 text-gray-500 hover:bg-gray-50 disabled:opacity-40"
            >
              <Trash2 className="w-4 h-4 sm:w-5 sm:h-5" />
            </Button>
            <Button
              onClick={handleDone}
              disabled={lines.length === 0}
              className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white px-6 sm:px-10 py-2.5 sm:py-4 text-xs sm:text-base font-semibold shadow-lg disabled:opacity-50"
            >
              <span className="flex items-center gap-1.5">
                <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                Готово
              </span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* Welcome Overlay */}
      <WelcomeOverlay isOpen={showWelcome} onStart={handleStartDrawing} />

      {/* Post Drawing Screen */}
      <PostDrawingScreen
        isOpen={showPostDrawing}
        imageData={currentThumbnail}
        isPremium={isPremium}
        isAnalyzing={isAnalyzing}
        remaining={remaining}
        limit={limit}
        onAnalyze={handleAnalyze}
        onNewDrawing={handleNewDrawing}
        onClose={handleClosePostDrawing}
      />

      {/* Analysis Result Modal */}
      <AnalysisResultModal
        isOpen={showAnalysis}
        onClose={() => setShowAnalysis(false)}
        imageData={analysisResult?.thumbnail || ''}
        feedback={analysisResult?.feedback || ''}
        tags={analysisResult?.tags || []}
        onSaveToJournal={handleSaveToJournal}
        onNewDrawing={handleNewDrawing}
        isSaving={isSaving}
        isPremium={isPremium}
        periodType={periodType}
      />

      {/* Art Quota Exhausted Card */}
      {showArtQuotaExhausted && (
        <ArtQuotaExhaustedCard 
          imageData={currentThumbnail}
          onClose={() => setShowArtQuotaExhausted(false)}
        />
      )}
    </div>
  );
}

export default MoodCanvas;
