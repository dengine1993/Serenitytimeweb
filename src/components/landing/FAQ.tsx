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

  const faqs = tArray("index.faq.items").map((item: any) => ({
    question: item.question,
    answer: item.answer,
  }));

  return (
    <section className="w-full py-16 md:py-24">
      <div className="w-full px-4 sm:px-8 lg:px-16">
        <motion.div
          className="text-center mb-10 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-3 tracking-tight">
            {t("index.faq.title")}
          </h2>
          <p className="text-white/60 text-base">
            {t("index.faq.subtitle")}
          </p>
        </motion.div>

        <motion.div
          className="max-w-3xl mx-auto"
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Accordion type="single" collapsible className="space-y-2">
            {faqs.map((faq: any, index: number) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className="bg-white/[0.025] border border-white/10 rounded-2xl px-5 transition-colors hover:border-white/20 data-[state=open]:border-rose-400/30 data-[state=open]:bg-white/[0.04]"
              >
                <AccordionTrigger className="text-left text-white/95 hover:text-white font-medium py-5 text-base [&>svg]:text-white/50">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-white/70 leading-relaxed pb-5 text-sm sm:text-base">
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
