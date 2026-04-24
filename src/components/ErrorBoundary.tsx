import React, { Component, ErrorInfo, ReactNode } from 'react';
import { RefreshCw, Home, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught error:', error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  private handleGoHome = () => {
    this.setState({ hasError: false, error: null });
    window.location.href = '/';
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30 flex items-center justify-center p-6">
          <div className="max-w-md w-full text-center space-y-6">
            {/* Soft, calming icon */}
            <div className="mx-auto w-20 h-20 rounded-full bg-rose-100 dark:bg-rose-900/30 flex items-center justify-center">
              <AlertCircle className="w-10 h-10 text-rose-400" />
            </div>
            
            {/* Calm, reassuring message */}
            <div className="space-y-3">
              <h1 className="text-2xl font-display font-semibold text-foreground">
                Что-то пошло не так
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                Не волнуйтесь, это временная проблема. Ваши данные в безопасности. 
                Попробуйте обновить страницу или вернуться на главную.
              </p>
            </div>
            
            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={this.handleRetry}
                className="gap-2"
                variant="default"
              >
                <RefreshCw className="w-4 h-4" />
                Попробовать снова
              </Button>
              <Button
                onClick={this.handleGoHome}
                variant="outline"
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                На главную
              </Button>
            </div>
            
            {/* Subtle encouragement */}
            <p className="text-sm text-muted-foreground/70">
              Если проблема повторяется, напишите нам на support@serenitypeople.ru
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
