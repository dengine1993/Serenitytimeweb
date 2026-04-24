import { motion } from "framer-motion";

export const MagicLoader = () => {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="flex flex-col items-center justify-center space-y-8"
        >
            <div className="relative w-32 h-32 flex items-center justify-center">
                {/* Pulsing Rings */}
                {[0, 1, 2].map((i) => (
                    <motion.div
                        key={i}
                        className="absolute inset-0 rounded-full border border-violet-500/30"
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1.5, opacity: 0 }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            delay: i * 0.6,
                            ease: "easeOut",
                        }}
                    />
                ))}

                {/* Core */}
                <motion.div
                    className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500 blur-md"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
                <div className="absolute w-12 h-12 rounded-full bg-white blur-sm opacity-50" />
            </div>

            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center space-y-2"
            >
                <h2 className="text-2xl font-medium text-foreground">
                    Настраиваем для тебя...
                </h2>
                <p className="text-muted-foreground">
                    Подбираем индивидуальный опыт
                </p>
            </motion.div>
        </motion.div>
    );
};
