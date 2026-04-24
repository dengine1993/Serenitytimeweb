import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Palette, Trash2, X, Calendar, Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/hooks/useI18n';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ru, enUS } from 'date-fns/locale';

interface ArtEntry {
  id: string;
  image_base64: string | null;
  analysis_text: string;
  tags: string[] | null;
  created_at: string;
}

export function ArtGalleryTab() {
  const { user } = useAuth();
  const { t, language } = useI18n();
  const [entries, setEntries] = useState<ArtEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<ArtEntry | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  const fetchEntries = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('user_art_therapy_entries')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setEntries((data || []).filter((entry) => Boolean(entry.image_base64)));
    } catch (error) {
      console.error('Error fetching art entries:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeleting(id);
    try {
      const { error } = await supabase
        .from('user_art_therapy_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setEntries(entries.filter(e => e.id !== id));
      if (selectedEntry?.id === id) {
        setSelectedEntry(null);
      }
      toast.success(language === 'ru' ? 'Рисунок удалён' : 'Drawing deleted');
    } catch (error) {
      console.error('Delete error:', error);
      toast.error(language === 'ru' ? 'Ошибка удаления' : 'Delete error');
    } finally {
      setDeleting(null);
    }
  };

  const dateLocale = language === 'ru' ? ru : enUS;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="aspect-square rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center py-12"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted/30 flex items-center justify-center">
          <Palette className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-medium text-foreground mb-2">
          {language === 'ru' ? 'Пока нет рисунков' : 'No drawings yet'}
        </h3>
        <p className="text-sm text-muted-foreground max-w-xs mx-auto">
          {language === 'ru' 
            ? 'Создай свой первый рисунок в разделе Арт-терапия' 
            : 'Create your first drawing in Art Therapy'}
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {entries.map((entry, index) => (
          <motion.div
            key={entry.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="relative group cursor-pointer"
            onClick={() => setSelectedEntry(entry)}
          >
            <div className="aspect-square rounded-2xl overflow-hidden bg-muted/20 border border-border/30 shadow-lg">
              <img
                src={entry.image_base64}
                alt="Art therapy drawing"
                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl flex items-end p-3">
              <span className="text-white text-xs">
                {format(new Date(entry.created_at), 'd MMM', { locale: dateLocale })}
              </span>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedEntry && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
            onClick={() => setSelectedEntry(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto bg-card rounded-3xl shadow-2xl border border-border/30"
            >
              {/* Close button */}
              <button
                onClick={() => setSelectedEntry(null)}
                className="absolute top-4 right-4 z-10 p-2 rounded-full bg-black/50 hover:bg-black/70 transition-colors"
              >
                <X className="w-5 h-5 text-white" />
              </button>

              {/* Image */}
              <div className="aspect-square w-full">
                <img
                  src={selectedEntry.image_base64}
                  alt="Art therapy drawing"
                  className="w-full h-full object-cover rounded-t-3xl"
                />
              </div>

              {/* Content */}
              <div className="p-6 space-y-4">
                {/* Date */}
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  {format(new Date(selectedEntry.created_at), 'PPP', { locale: dateLocale })}
                </div>

                {/* Tags */}
                {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {selectedEntry.tags.map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs rounded-full bg-primary/10 text-primary border border-primary/20"
                      >
                        <Tag className="w-3 h-3" />
                        {tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Analysis */}
                <div className="p-4 rounded-2xl bg-muted/20 border border-border/20">
                  <p className="text-sm text-muted-foreground leading-relaxed italic">
                    "{selectedEntry.analysis_text}"
                  </p>
                </div>

                {/* Delete button */}
                <Button
                  variant="ghost"
                  onClick={() => handleDelete(selectedEntry.id)}
                  disabled={deleting === selectedEntry.id}
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  {deleting === selectedEntry.id 
                    ? (language === 'ru' ? 'Удаление...' : 'Deleting...') 
                    : (language === 'ru' ? 'Удалить рисунок' : 'Delete drawing')}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}