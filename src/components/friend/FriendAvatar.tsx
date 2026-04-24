import { motion } from "framer-motion";

interface FriendAvatarProps {
  size?: "sm" | "md" | "lg";
  animate?: boolean;
}

export function FriendAvatar({ size = "md", animate = false }: FriendAvatarProps) {
  const sizeClasses = {
    sm: "w-8 h-8",
    md: "w-10 h-10",
    lg: "w-16 h-16",
  };

  return (
    <motion.div
      initial={animate ? { scale: 0 } : false}
      animate={animate ? { scale: 1 } : false}
      transition={{ type: "spring", damping: 15 }}
      className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-emerald-400 via-teal-400 to-cyan-400 p-[2px] flex-shrink-0`}
    >
      <div className="w-full h-full rounded-full bg-gradient-to-br from-emerald-500/30 to-teal-500/30 flex items-center justify-center backdrop-blur-sm">
        <span className={size === "lg" ? "text-2xl" : size === "sm" ? "text-sm" : "text-lg"}>
          🌿
        </span>
      </div>
    </motion.div>
  );
}
