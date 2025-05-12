import { Loader2 } from 'lucide-react';

interface LoadingSpinnerProps {
  text?: string;
  fullScreen?: boolean;
}

export default function LoadingSpinner({ text = "Loading...", fullScreen = false }: LoadingSpinnerProps) {
  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/80 z-50">
        <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
        <p className="text-lg text-foreground">{text}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-10">
      <Loader2 className="h-10 w-10 animate-spin text-primary mb-3" />
      <p className="text-md text-foreground">{text}</p>
    </div>
  );
}
