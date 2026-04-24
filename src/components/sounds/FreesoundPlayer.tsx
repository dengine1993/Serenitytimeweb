import { useState, useRef, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Play, Pause, Volume2, Search, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useI18n } from '@/hooks/useI18n';

interface Sound {
  id: number;
  name: string;
  description: string;
  duration: number;
  previews: {
    'preview-hq-mp3': string;
  };
  username: string;
}

interface FreesoundPlayerProps {
  onPlay?: () => void;
  onPause?: () => void;
}

export const FreesoundPlayer = ({ onPlay, onPause }: FreesoundPlayerProps = {}) => {
  const { t } = useI18n();
  const [sounds, setSounds] = useState<Sound[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const PRESET_CATEGORIES = [
    { name: (t('sounds.categories') as unknown as string[])[0], query: 'rain nature' },
    { name: (t('sounds.categories') as unknown as string[])[1], query: 'ocean waves' },
    { name: (t('sounds.categories') as unknown as string[])[2], query: 'forest birds' },
    { name: (t('sounds.categories') as unknown as string[])[3], query: 'fire crackling' },
    { name: (t('sounds.categories') as unknown as string[])[4], query: 'thunder storm' },
    { name: (t('sounds.categories') as unknown as string[])[5], query: 'stream water' }
  ];

  const searchSounds = async (query: string) => {
    if (!query.trim()) {
      toast.error(t('notifications.soundEnterQuery'));
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('freesound-search', {
        body: { query, filter: 'duration:[1 TO 300]' }
      });

      if (error) throw error;

      if (data?.results) {
        setSounds(data.results);
        if (data.results.length === 0) {
          toast.info(t('notifications.soundNoResults'));
        }
      }
    } catch (error) {
      console.error('Freesound search error:', error);
      const message = error instanceof Error ? error.message : '';
      if (message.includes('FREESOUND_API_KEY')) {
        toast.error(t('notifications.soundApiKeyMissing'));
      } else {
        toast.error(t('notifications.soundSearchError'));
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePresetSearch = (query: string) => {
    setSearchQuery(query);
    searchSounds(query);
  };

  const togglePlay = (sound: Sound) => {
    if (playingId === sound.id) {
      audioRef.current?.pause();
      setPlayingId(null);
      onPause?.();
    } else {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = sound.previews['preview-hq-mp3'];
        audioRef.current.play();
        setPlayingId(sound.id);
        onPlay?.();
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  useEffect(() => {
    const audio = new Audio();
    audioRef.current = audio;

    audio.addEventListener('timeupdate', () => {
      setCurrentTime(audio.currentTime);
    });

    audio.addEventListener('loadedmetadata', () => {
      setDuration(audio.duration);
    });

    audio.addEventListener('ended', () => {
      setPlayingId(null);
      setCurrentTime(0);
      onPause?.();
    });

    return () => {
      audio.pause();
      onPause?.();
      audio.remove();
    };
  }, [onPause]);

  return (
    <div className="space-y-6">
      {/* Search Bar */}
      <div className="flex gap-2">
        <Input
          placeholder={t('sounds.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && searchSounds(searchQuery)}
          className="bg-white/10 border-white/20 text-white placeholder:text-blue-200/50"
        />
        <Button
          onClick={() => searchSounds(searchQuery)}
          disabled={loading}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:shadow-lg"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
        </Button>
      </div>

      {/* Preset Categories */}
      <div className="flex flex-wrap gap-2">
        {PRESET_CATEGORIES.map((category) => (
          <Button
            key={category.name}
            variant="outline"
            size="sm"
            onClick={() => handlePresetSearch(category.query)}
            className="bg-white/5 border-white/20 text-white hover:bg-white/10"
          >
            {category.name}
          </Button>
        ))}
      </div>

      {/* Results */}
      {sounds.length > 0 && (
        <div className="space-y-3">
          {sounds.map((sound) => (
            <Card
              key={sound.id}
              className="bg-white/5 border-white/10 p-4 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-4">
                <Button
                  size="icon"
                  onClick={() => togglePlay(sound)}
                  className="shrink-0 bg-gradient-to-r from-blue-500 to-purple-500"
                >
                  {playingId === sound.id ? (
                    <Pause className="w-4 h-4" />
                  ) : (
                    <Play className="w-4 h-4" />
                  )}
                </Button>

                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-semibold truncate">{sound.name}</h4>
                  <p className="text-blue-100/70 text-sm truncate">
                    {sound.description || `${t('sounds.by')} ${sound.username}`}
                  </p>
                  
                  {playingId === sound.id && (
                    <div className="mt-2 flex items-center gap-2">
                      <Volume2 className="w-3 h-3 text-blue-400" />
                      <div className="flex-1 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 transition-all"
                          style={{ width: `${(currentTime / duration) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-blue-100/70">
                        {formatTime(currentTime)} / {formatTime(duration)}
                      </span>
                    </div>
                  )}
                </div>

                <div className="text-blue-100/50 text-sm shrink-0">
                  {Math.floor(sound.duration)}s
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {sounds.length === 0 && !loading && (
        <Card className="bg-white/5 border-white/10 p-8 text-center">
          <p className="text-blue-100/70">
            {t('sounds.emptyState')}
          </p>
        </Card>
      )}
    </div>
  );
};
