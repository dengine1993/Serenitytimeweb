import { useI18n } from "@/hooks/useI18n";
import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const FAQ = () => {
  const { t, tArray } = useI18n();

  const faqs = tArray('index.faq.items').map((item: any) => ({
    question: item.question,
    answer: item.answer,
  }));

  return (
    <section className="w-full py-12 md:py-16">
      <div className="w-full px-4 sm:px-8 lg:px-16 xl:px-24 2xl:px-32">
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            {t('index.faq.title')}
          </h2>
          <p className="text-white/60 text-base md:text-lg max-w-2xl mx-auto">
            {t('index.faq.subtitle')}
          </p>
        </motion.div>

        <motion.div
          className="max-w-5xl xl:max-w-6xl 2xl:max-w-7xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Accordion
            type="single"
            collapsible
            defaultValue={faqs.length > 0 ? `item-${faqs.length - 1}` : undefined}
            className="space-y-3"
          >
            {faqs.map((faq: any, index: number) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-gradient-to-br from-amber-950/40 via-slate-900/50 to-orange-950/30 backdrop-blur-md border border-amber-500/20 rounded-xl px-5 hover:border-amber-400/40 transition-all hover:scale-[1.01] hover:shadow-[0_12px_30px_rgba(251,191,36,0.15)] data-[state=open]:border-amber-400/50 data-[state=open]:shadow-[0_12px_30px_rgba(251,191,36,0.2)]"
              >
                <AccordionTrigger className="text-left text-white hover:text-white font-medium py-4 text-sm md:text-base">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-white/75 leading-relaxed pb-4 text-sm">
                  {faq.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>
      </div>
    </section>
  );
};
