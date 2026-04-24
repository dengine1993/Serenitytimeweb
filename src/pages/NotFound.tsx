import AnimatedShaderBackground from "@/components/ui/animated-shader-background";
import { Button } from "@/components/ui/button";
import { useNavigate, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Home } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";

const NotFound = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useI18n();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="relative min-h-screen overflow-hidden">
      <AnimatedShaderBackground />
      
      <div className="relative z-10 flex items-center justify-center min-h-screen px-4">
        <div className="text-center">
          <h1 className="text-9xl font-bold bg-gradient-to-r from-blue-200 via-purple-200 to-indigo-200 bg-clip-text text-transparent mb-4">
            404
          </h1>
          <h2 className="text-3xl font-bold text-white mb-4">
            {t("errors.notFound.title")}
          </h2>
          <p className="text-blue-100/70 mb-8 max-w-md mx-auto">
            {t("errors.notFound.description")}
          </p>
          <Button
            onClick={() => navigate('/')}
            className="bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:scale-105 transition-transform"
          >
            <Home className="mr-2 h-4 w-4" />
            {t("errors.notFound.cta")}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
