import { useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { LoadingScreen } from "@/components/ui/loading-screen";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

/**
 * ProtectedRoute - обёртка для маршрутов, требующих авторизации.
 * 
 * - Показывает LoadingScreen пока идёт проверка auth
 * - Редиректит на /auth если пользователь не авторизован
 * - Сохраняет URL для редиректа после логина
 */
export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const { isSignedIn, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!loading && !isSignedIn) {
      // Неавторизованных всегда отправляем на лендинг — он сам предложит «Войти»
      const returnUrl = location.pathname + location.search;
      navigate("/", {
        replace: true,
        state: { returnUrl }
      });
    }
  }, [isSignedIn, loading, navigate, location]);

  if (loading) {
    return <LoadingScreen />;
  }

  if (!isSignedIn) {
    return null;
  }

  return <>{children}</>;
}
