import { useState, useCallback } from 'react';

import { useStories, StorySortBy } from '@/hooks/useStories';
import { StoryCard } from './StoryCard';
import { StoryScreen } from './StoryScreen';
import { CreateStoryModal } from './CreateStoryModal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { useI18n } from '@/hooks/useI18n';
import { useAuth } from '@/hooks/useAuth';
import { 
  Search, 
  PenLine, 
  MessageSquareText, 
  Sparkles, 
  User,
  Loader2,
  BookOpen
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export function StoriesTab() {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [sortBy, setSortBy] = useState<StorySortBy>('comments');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStory, setSelectedStory] = useState<{ id: string; data?: any } | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  const { 
    stories, 
    isLoading, 
    isLoadingMore, 
    hasMore, 
    loadMore,
    refresh
  } = useStories({ sortBy, searchQuery });

  const handleBack = useCallback(() => setSelectedStory(null), []);

  const handleCreateClick = () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    setShowCreateModal(true);
  };

  const handleStoryCreated = () => {
    setShowCreateModal(false);
    setSortBy('newest');
    refresh();
  };

  return (
    <>
      {selectedStory ? (
        <div className="h-full">
          <StoryScreen 
            storyId={selectedStory.id} 
            initialStory={selectedStory.data}
            onBack={handleBack} 
          />
        </div>
      ) : (
        <div className="flex flex-col h-full">
      {/* Header with search and sorting */}
      <div className="p-4 space-y-3 bg-background/50 backdrop-blur-sm border-b border-border/30">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t('stories.searchPlaceholder')}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-muted/30"
          />
        </div>
        
        {/* Sort buttons */}
        <div className="flex gap-2 overflow-x-auto scrollbar-hide">
          <SortButton
            active={sortBy === 'comments'}
            onClick={() => setSortBy('comments')}
            icon={<MessageSquareText className="h-3.5 w-3.5" />}
          >
            {t('stories.sortByComments')}
          </SortButton>
          <SortButton
            active={sortBy === 'newest'}
            onClick={() => setSortBy('newest')}
            icon={<Sparkles className="h-3.5 w-3.5" />}
          >
            {t('stories.sortByNewest')}
          </SortButton>
          {user && (
            <SortButton
              active={sortBy === 'mine'}
              onClick={() => setSortBy('mine')}
              icon={<User className="h-3.5 w-3.5" />}
            >
              {t('stories.sortByMine')}
            </SortButton>
          )}
        </div>
      </div>

      {/* Stories list */}
      <ScrollArea className="flex-1">
        <div className="p-4 space-y-3 pb-32">
          {isLoading ? (
            // Loading skeleton
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-card rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                </div>
                <Skeleton className="h-16 w-full" />
                <div className="flex gap-3">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))
          ) : stories.length === 0 ? (
            // Empty state
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <BookOpen className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-medium mb-2">{t('stories.emptyState')}</h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-xs">
                {t('stories.emptyStateDesc')}
              </p>
              <Button onClick={handleCreateClick} className="gap-2">
                <PenLine className="h-4 w-4" />
                {t('stories.createButton')}
              </Button>
            </div>
          ) : (
            <>
              <>
                {stories.map((story) => (
                  <div key={story.id}>
                    <StoryCard
                      story={story}
                      onClick={() => setSelectedStory({ id: story.id, data: story })}
                    />
                  </div>
                ))}
              </>

              {/* Load more */}
              {hasMore && (
                <div className="flex justify-center pt-4">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={loadMore}
                    disabled={isLoadingMore}
                    className="text-muted-foreground"
                  >
                    {isLoadingMore ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    {t('common.loadingMore')}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </ScrollArea>

      {/* Floating create button */}
      <div className="fixed bottom-24 right-4 z-30">
        <Button
          onClick={handleCreateClick}
          size="lg"
          className="h-14 rounded-full shadow-lg gap-2 px-6"
        >
          <PenLine className="h-5 w-5" />
          <span className="hidden sm:inline">{t('stories.createButton')}</span>
        </Button>
      </div>

      {/* Create modal */}
      <CreateStoryModal
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onCreated={handleStoryCreated}
      />
        </div>
      )}
    </>
  );
}

function SortButton({
  children,
  active,
  onClick,
  icon
}: {
  children: React.ReactNode;
  active: boolean;
  onClick: () => void;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all whitespace-nowrap",
        active
          ? "bg-primary text-primary-foreground shadow-sm"
          : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {icon}
      {children}
    </button>
  );
}
