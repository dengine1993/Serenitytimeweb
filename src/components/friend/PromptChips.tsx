import { motion } from "framer-motion";

interface PromptChipsProps {
  onSelect: (prompt: string) => void;
  disabled?: boolean;
}

const PROMPTS = [
  { label: "Объясни симптом", emoji: "🔍" },
  { label: "Помоги успокоиться", emoji: "🫂" },
  { label: "Просто выслушай", emoji: "👂" },
  { label: "Что это может быть?", emoji: "🤔" },
];

export function PromptChips({ onSelect, disabled }: PromptChipsProps) {
  return (
    <div className="flex gap-2 flex-wrap">
      {PROMPTS.map((prompt, i) => (
        <motion.button
          key={prompt.label}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.05 }}
          onClick={() => onSelect(prompt.label)}
          disabled={disabled}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 hover:text-white text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <span>{prompt.emoji}</span>
          <span>{prompt.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
