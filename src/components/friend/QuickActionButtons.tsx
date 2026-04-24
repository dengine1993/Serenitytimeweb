import { Wind, Compass, Music, AlertTriangle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

interface QuickActionButtonsProps {
  onBreathing?: () => void;
  onGrounding?: () => void;
}

export function QuickActionButtons({ onBreathing, onGrounding }: QuickActionButtonsProps) {
  const navigate = useNavigate();

  const actions = [
    {
      id: "breathing",
      label: "Дыхание 4-7-8",
      icon: Wind,
      color: "from-sky-500/20 to-blue-500/20 border-sky-500/30 text-sky-300",
      onClick: onBreathing || (() => navigate("/breathing")),
    },
    {
      id: "grounding",
      label: "Заземление",
      icon: Compass,
      color: "from-emerald-500/20 to-teal-500/20 border-emerald-500/30 text-emerald-300",
      onClick: onGrounding || (() => navigate("/grounding")),
    },
    {
      id: "relaxation",
      label: "Релаксация",
      icon: Music,
      color: "from-violet-500/20 to-purple-500/20 border-violet-500/30 text-violet-300",
      onClick: () => navigate("/techniques"),
    },
    {
      id: "crisis",
      label: "Кризис?",
      icon: AlertTriangle,
      color: "from-rose-500/20 to-red-500/20 border-rose-500/30 text-rose-300",
      onClick: () => navigate("/crisis"),
    },
  ];

  return (
    <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide px-1">
      {actions.map((action, i) => (
        <motion.button
          key={action.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.05 }}
          onClick={action.onClick}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r ${action.color} border whitespace-nowrap transition-all hover:scale-[1.02] active:scale-[0.98]`}
        >
          <action.icon className="w-4 h-4" />
          <span className="text-sm font-medium">{action.label}</span>
        </motion.button>
      ))}
    </div>
  );
}
