import { useI18n } from "@/hooks/useI18n";
import { motion } from "framer-motion";
import { useEffect, useState, memo } from "react";
import { MessageCircle, Users, Heart, Star } from "lucide-react";

interface StatCardProps {
  icon: React.ReactNode;
  value: number;
  label: string;
  suffix?: string;
  decimals?: number;
  delay: number;
}

const StatCard = memo(({ icon, value, label, suffix = "", decimals = 0, delay }: StatCardProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const duration = 2000; // 2 seconds
    const steps = 60;
    const increment = value / steps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= value) {
        setCount(value);
        clearInterval(timer);
      } else {
        setCount(current);
      }
    }, duration / steps);

    return () => clearInterval(timer);
  }, [value]);

  const formatNumber = (num: number) => {
    if (decimals > 0) {
      return num.toFixed(decimals);
    }
    return Math.floor(num).toLocaleString('ru-RU');
  };

  return (
    <motion.div
      className="relative bg-background/30 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-background/40 hover:border-[#FFE2BD]/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(255,226,189,0.15)]"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.6, delay }}
    >
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#FFE2BD]/20 to-[#FFB68B]/20 flex items-center justify-center">
          <div className="text-[#FFE2BD]">{icon}</div>
        </div>
        <div>
          <motion.div
            className="text-3xl md:text-4xl font-bold text-white mb-2"
            key={count}
          >
            {formatNumber(count)}{suffix}
          </motion.div>
          <p className="text-sm md:text-base text-foreground/70">
            {label}
          </p>
        </div>
      </div>
    </motion.div>
  );
});

export const Stats = () => {
  const { t, tArray } = useI18n();

  const stats = tArray('index.stats.items').map((item: any, index: number) => ({
    value: item.value,
    label: item.label,
    suffix: item.suffix || "",
    decimals: item.decimals || 0,
    delay: index * 0.1,
  }));

  const icons = [
    <MessageCircle size={28} />,
    <Users size={28} />,
    <Heart size={28} />,
    <Star size={28} />,
  ];

  return (
    <section className="w-full py-16 md:py-24 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-[#FFE2BD]/10 rounded-full blur-[100px]" />
        <div className="absolute top-1/2 right-1/4 w-64 h-64 bg-[#FFB68B]/10 rounded-full blur-[100px]" />
      </div>

      <div className="container mx-auto px-4 relative">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('index.stats.title')}
          </h2>
          <p className="text-foreground/70 text-base md:text-lg max-w-2xl mx-auto">
            {t('index.stats.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 max-w-6xl mx-auto">
          {stats.map((stat: any, index: number) => (
            <StatCard
              key={index}
              icon={icons[index]}
              value={stat.value}
              label={stat.label}
              suffix={stat.suffix}
              decimals={stat.decimals}
              delay={stat.delay}
            />
          ))}
        </div>

        {/* Footer note */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <p className="text-foreground/50 text-xs md:text-sm">
            {t('index.stats.footer')}
          </p>
        </motion.div>
      </div>
    </section>
  );
};
