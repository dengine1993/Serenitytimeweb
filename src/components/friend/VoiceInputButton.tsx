import { useState, useEffect, useRef } from "react";
import { Mic, MicOff } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

// Web Speech API types
interface ISpeechRecognitionEvent extends Event {
  results: {
    [index: number]: {
      [index: number]: {
        transcript: string;
      };
    };
  };
}

interface ISpeechRecognitionErrorEvent extends Event {
  error: string;
}

interface ISpeechRecognition extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: ISpeechRecognitionEvent) => void) | null;
  onerror: ((event: ISpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => ISpeechRecognition;
    webkitSpeechRecognition: new () => ISpeechRecognition;
  }
}

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void;
  disabled?: boolean;
}

export function VoiceInputButton({ onTranscript, disabled }: VoiceInputButtonProps) {
  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const recognitionRef = useRef<ISpeechRecognition | null>(null);

  useEffect(() => {
    // Check for browser support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setIsSupported(true);
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = "ru-RU";

      recognitionRef.current.onresult = (event: ISpeechRecognitionEvent) => {
        const transcript = event.results[0][0].transcript;
        onTranscript(transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: ISpeechRecognitionErrorEvent) => {
        console.error("Speech recognition error:", event.error);
        if (event.error === "not-allowed") {
          toast.error("Микрофон заблокирован. Разреши доступ в настройках.");
        } else if (event.error === "no-speech") {
          toast.info("Не удалось распознать речь. Попробуй ещё раз.");
        }
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [onTranscript]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error("Failed to start recognition:", error);
        toast.error("Не удалось запустить распознавание речи");
      }
    }
  };

  if (!isSupported) {
    return null;
  }

  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={toggleListening}
      disabled={disabled}
      className={`p-2.5 rounded-xl transition-all ${
        isListening
          ? "bg-rose-500/20 text-rose-400 border border-rose-500/40"
          : "bg-white/5 text-white/60 hover:text-white hover:bg-white/10 border border-transparent"
      } disabled:opacity-50 disabled:cursor-not-allowed`}
      title={isListening ? "Остановить запись" : "Голосовой ввод"}
    >
      {isListening ? (
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ repeat: Infinity, duration: 1 }}
        >
          <MicOff className="w-5 h-5" />
        </motion.div>
      ) : (
        <Mic className="w-5 h-5" />
      )}
    </motion.button>
  );
}
