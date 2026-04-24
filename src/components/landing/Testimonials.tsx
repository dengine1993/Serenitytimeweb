import { useI18n } from "@/hooks/useI18n";
import { motion } from "framer-motion";
import { Quote } from "lucide-react";
import { memo } from "react";

interface TestimonialCardProps {
  text: string;
  author: string;
  context: string;
  delay: number;
}

const TestimonialCard = memo(({ text, author, context, delay }: TestimonialCardProps) => {
  return (
    <motion.div
      className="relative bg-background/30 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:bg-background/40 hover:border-[#FFE2BD]/20 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_20px_50px_rgba(255,226,189,0.15)]"
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-100px" }}
      transition={{ duration: 0.6, delay }}
    >
      <Quote className="w-8 h-8 text-[#FFE2BD]/40 mb-4" />
      <p className="text-white/80 text-sm md:text-base leading-relaxed mb-4">
        {text}
      </p>
      <div className="flex flex-col gap-1">
        <p className="text-[#FFE2BD] text-sm font-medium">{author}</p>
        <p className="text-white/60 text-xs">{context}</p>
      </div>
    </motion.div>
  );
});

export const Testimonials = () => {
  const { t, tArray } = useI18n();

  const testimonials = tArray('index.testimonials.items').map((item: any, index: number) => ({
    text: item.text,
    author: item.author,
    context: item.context,
    delay: index * 0.15,
  }));

  return (
    <section className="w-full py-16 md:py-24">
      <div className="container mx-auto px-4">
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('index.testimonials.title')}
          </h2>
          <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto">
            {t('index.testimonials.subtitle')}
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {testimonials.map((testimonial: any, index: number) => (
            <TestimonialCard
              key={index}
              text={testimonial.text}
              author={testimonial.author}
              context={testimonial.context}
              delay={testimonial.delay}
            />
          ))}
        </div>
      </div>
    </section>
  );
};
