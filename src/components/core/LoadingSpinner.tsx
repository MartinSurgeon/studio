import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect } from 'react';

interface LoadingSpinnerProps {
  text?: string;
  fullScreen?: boolean;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  timeoutMs?: number; // Optional timeout in milliseconds
}

export default function LoadingSpinner({ 
  text = "Loading...", 
  fullScreen = false, 
  className = '', 
  size = 'md',
  timeoutMs = 15000, // Default 15 seconds timeout
}: LoadingSpinnerProps) {
  const [showTimeout, setShowTimeout] = useState(false);
  const [displayText, setDisplayText] = useState(text);

  // Use effect to show timeout message after specified time
  useEffect(() => {
    // Skip timeout for small spinners or non-full screen
    if (size === 'sm' || !fullScreen) return;
    
    const timeout = setTimeout(() => {
      setShowTimeout(true);
      setDisplayText("Loading is taking longer than expected. You may want to check your internet connection or refresh the page.");
    }, timeoutMs);
    
    // Clear timeout on unmount
    return () => clearTimeout(timeout);
  }, [size, fullScreen, timeoutMs]);

  // Define size classes
  const sizeClasses = {
    sm: 'h-4 w-4',
    md: 'h-10 w-10',
    lg: 'h-12 w-12'
  };

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex flex-col items-center justify-center bg-background/80 z-50">
        <Loader2 className={cn(sizeClasses.lg, 'animate-spin text-primary mb-4', className)} />
        <div className="max-w-md text-center">
          <p className="text-lg text-foreground">{displayText}</p>
          {showTimeout && (
            <div className="mt-4">
              <p className="text-sm text-muted-foreground mb-2">Possible issues:</p>
              <ul className="text-sm text-left list-disc pl-6 text-muted-foreground space-y-1">
                <li>Supabase connection issues</li>
                <li>Missing or incorrect environment variables</li>
                <li>Network connectivity problems</li>
              </ul>
              <button 
                onClick={() => window.location.reload()}
                className="mt-4 bg-primary text-white px-4 py-2 rounded-md text-sm"
              >
                Refresh Page
              </button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center justify-center", className)}>
      <Loader2 className={cn(sizeClasses[size], 'animate-spin text-primary', text ? 'mr-2' : '')} />
      {text && <p className="text-md text-foreground">{text}</p>}
    </div>
  );
}
