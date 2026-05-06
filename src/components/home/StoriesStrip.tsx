import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Plus, MessageCircle, ArrowRight, Crown, BookOpen } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { useStories, type UserStory } from "@/hooks/useStories";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

/**
 * StoriesStrip — горизонтальная лента историй на главной.
 * Цель: дать прямой доступ к чтению чужих историй и созданию своей,
 * без перехода в Чат и без скролла под ленту «Маленькие Восходы».
 */

const TILE_W = "w-[140px]";
const TILE_H = "h-[170px]";
const TILE_BASE =
  "snap-start shrink-0 rounded-2xl overflow-hidden transition-all duration-200 active:scale-[0.97]";

interface MyStoryLite {
  id: string;
  title: string | null;
  content: string;
  comment_count: number;
}

export function StoriesStrip() {
  const { user } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const { stories, isLoading } = useStories({ sortBy: "comments" });
  const [myStory, setMyStory] = useState<MyStoryLite | null>(null);

  // Загружаем «мою последнюю» историю отдельно — она пин в начало ленты
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("user_stories")
        .select("id, title, content, comment_count")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1);
      if (!cancelled) {
        const row = (data?.[0] as MyStoryLite) ?? null;
        // Не показываем «обрывки» (<25 символов) — иначе на главной торчит мусор
        const meaningful = row && (row.content?.trim().length ?? 0) >= 25 ? row : null;
        setMyStory(meaningful);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Чужие истории (без моих, только осмысленные ≥25 символов), максимум 8
  const otherStories = useMemo(() => {
    if (!stories || stories.length === 0) return [];
    return stories
      .filter((s) => s.user_id !== user?.id)
      .filter((s) => (s.content?.trim().length ?? 0) >= 25)
      .slice(0, 8);
  }, [stories, user?.id]);

  const goCreate = () => {
    if (!user) {
      navigate("/auth");
      return;
    }
    navigate("/community?tab=stories&new=1");
  };
  const goStory = (id: string) => navigate(`/community?tab=stories&storyId=${id}`);
  const goAll = () => navigate("/community?tab=stories");

  const isEmpty = !isLoading && otherStories.length === 0 && !myStory;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] }}
      aria-label={t("home.stories.title")}
      className="mb-3 sm:mb-4"
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 sm:px-6 mb-2.5">
        <div className="flex items-center gap-2">
          <BookOpen className="h-4 w-4 text-amber-400" />
          <h2 className="text-sm font-semibold text-foreground">
            {t("home.stories.title")}
          </h2>
        </div>
        {!isEmpty && (
          <button
            onClick={goAll}
            className="inline-flex items-center gap-1 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors"
          >
            {t("home.stories.viewAll")}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>

      {/* Полноширинный CTA, когда историй ещё нет вообще */}
      {isEmpty ? (
        <div className="px-4 sm:px-6">
          <EmptyCTABanner onClick={goCreate} label={t("home.stories.share")} hint={t("home.stories.empty")} />
        </div>
      ) : (
        <div
          className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory px-4 sm:px-6 pb-2"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <CreateStoryTile onClick={goCreate} label={t("home.stories.share")} />

          {myStory && (
            <MyStoryTile story={myStory} onClick={() => goStory(myStory.id)} label={t("home.stories.mine")} />
          )}

          {isLoading && otherStories.length === 0 && (
            <>
              <StoryTileSkeleton />
              <StoryTileSkeleton />
              <StoryTileSkeleton />
            </>
          )}

          {otherStories.map((s) => (
            <StoryTile key={s.id} story={s} onClick={() => goStory(s.id)} />
          ))}
        </div>
      )}
    </motion.section>
  );
}

function EmptyCTABanner({
  onClick,
  label,
  hint,
}: {
  onClick: () => void;
  label: string;
  hint: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-2xl px-4 py-4 text-left transition-all active:scale-[0.99]",
        "bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-rose-500/10",
        "border border-amber-300/25 hover:border-amber-300/45",
        "flex items-center gap-3"
      )}
    >
      <div className="w-10 h-10 rounded-full bg-amber-500/25 flex items-center justify-center shrink-0">
        <Plus className="w-5 h-5 text-amber-200" strokeWidth={2.5} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground mt-0.5 truncate">{hint}</div>
      </div>
      <ArrowRight className="w-4 h-4 text-amber-300 shrink-0" />
    </button>
  );
}

/* ===================== Tiles ===================== */

function CreateStoryTile({ onClick, label }: { onClick: () => void; label: string }) {
  const { t } = useI18n();
  return (
    <button
      onClick={onClick}
      className={cn(
        TILE_BASE,
        TILE_W,
        TILE_H,
        "relative bg-gradient-to-br from-amber-500/90 via-orange-500/85 to-rose-500/80",
        "border border-amber-300/30 shadow-[0_8px_24px_-12px_rgba(249,115,22,0.55)]",
        "flex flex-col items-center justify-center text-center px-3"
      )}
      aria-label={label}
    >
      <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center mb-3">
        <Plus className="w-6 h-6 text-white" strokeWidth={2.5} />
      </div>
      <span className="text-sm font-semibold text-white leading-tight">
        {label}
      </span>
      <span className="text-[11px] text-white/80 mt-1 leading-tight">
        {t("home.stories.aboutYourSunrise")}
      </span>
    </button>
  );
}

function MyStoryTile({
  story,
  onClick,
  label,
}: {
  story: MyStoryLite;
  onClick: () => void;
  label: string;
}) {
  const preview = story.title || story.content;
  return (
    <button
      onClick={onClick}
      className={cn(
        TILE_BASE,
        TILE_W,
        TILE_H,
        "relative bg-card/80 backdrop-blur-sm border-2 border-amber-400/60",
        "shadow-[0_0_0_1px_rgba(0,0,0,0.35)_inset]",
        "flex flex-col p-3 text-left"
      )}
      aria-label={label}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className="text-[10px] font-semibold uppercase tracking-wide text-amber-400">
          {label}
        </span>
        {story.comment_count > 0 && (
          <span className="ml-auto inline-flex items-center gap-0.5 text-[10px] text-muted-foreground">
            <MessageCircle className="h-3 w-3" />
            {story.comment_count}
          </span>
        )}
      </div>
      <p className="text-xs text-foreground leading-snug line-clamp-6 break-words [overflow-wrap:anywhere]">
        {preview}
      </p>
    </button>
  );
}

function StoryTile({ story, onClick }: { story: UserStory; onClick: () => void }) {
  const name = story.author?.display_name?.trim() || "Аноним";
  const avatarUrl = story.author?.avatar_url || undefined;
  const preview = story.title || story.content;
  return (
    <button
      onClick={onClick}
      className={cn(
        TILE_BASE,
        TILE_W,
        TILE_H,
        "bg-card/70 backdrop-blur-sm border border-border/40 hover:border-amber-500/40",
        "flex flex-col p-3 text-left"
      )}
      aria-label={name}
    >
      <div className="flex items-center gap-2 mb-2">
        <Avatar className="h-7 w-7 shrink-0">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
          <AvatarFallback className="text-[10px]">
            {name.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="text-[11px] font-medium text-foreground truncate flex-1">
          {name}
        </span>
        {story.is_premium && (
          <Crown className="h-3 w-3 text-amber-500 shrink-0" />
        )}
      </div>
      <p className="text-xs text-muted-foreground leading-snug line-clamp-5 break-words [overflow-wrap:anywhere]">
        {preview}
      </p>
      {story.comment_count > 0 && (
        <div className="mt-auto pt-2 inline-flex items-center gap-1 text-[10px] text-muted-foreground/80">
          <MessageCircle className="h-3 w-3" />
          {story.comment_count}
        </div>
      )}
    </button>
  );
}


function StoryTileSkeleton() {
  return (
    <div
      className={cn(
        TILE_W,
        TILE_H,
        "snap-start shrink-0 rounded-2xl bg-muted/30 animate-pulse"
      )}
    />
  );
}

