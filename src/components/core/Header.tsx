"use client";

import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LogOut, User, Briefcase, Settings, MapPinIcon, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useState, useEffect } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

export default function Header() {
  const { userRole, testingMode, setTestingMode, user, logout } = useAppContext();
  const router = useRouter();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [multipleTabsDetected, setMultipleTabsDetected] = useState(false);

  // Check for multiple tabs with broadcast channel
  useEffect(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel) return;
    
    // Get the tab ID for this tab
    const tabId = sessionStorage.getItem('geoattend-tab-id');
    if (!tabId) return;
    
    // Create a channel for tab detection
    const channel = new BroadcastChannel('geoattend-tabs');
    
    // Function to send ping to other tabs
    const pingOtherTabs = () => {
      channel.postMessage({ type: 'ping', tabId });
    };
    
    // Listen for pings from other tabs
    channel.onmessage = (event) => {
      if (event.data.type === 'ping' && event.data.tabId !== tabId) {
        // Another tab detected
        setMultipleTabsDetected(true);
        
        // Reply to acknowledge we exist
        channel.postMessage({ type: 'pong', tabId });
      } else if (event.data.type === 'pong' && event.data.tabId !== tabId) {
        // Another tab responded to our ping
        setMultipleTabsDetected(true);
      }
    };
    
    // Ping on load and every 10 seconds
    pingOtherTabs();
    const intervalId = setInterval(pingOtherTabs, 10000);
    
    return () => {
      clearInterval(intervalId);
      channel.close();
    };
  }, []);

  const handleLogout = async () => {
    try {
      setIsLoggingOut(true);
      // Use the AppContext logout method that handles everything
      const success = await logout();
      
      if (success) {
        // Clear any sessionStorage items for this tab
        sessionStorage.clear();
        
        // Redirect to home page using router.replace (not push) to prevent history issues
        router.replace('/');
      } else {
        console.error('Logout failed');
        setIsLoggingOut(false);
      }
    } catch (error) {
      console.error('Error during logout:', error);
      setIsLoggingOut(false);
    }
  };

  const roleIcon = userRole === 'student' ? <User className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />;
  const roleText = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'Guest';
  
  // Get initials for avatar
  const getInitials = () => {
    if (!user?.displayName) return roleText.charAt(0);
    
    const nameParts = user.displayName.split(' ');
    if (nameParts.length === 1) return nameParts[0].charAt(0);
    return `${nameParts[0].charAt(0)}${nameParts[nameParts.length - 1].charAt(0)}`;
  };

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-40 py-2">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPinIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-primary">GeoAttend</h1>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Multiple tabs warning */}
          {multipleTabsDetected && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center text-amber-500">
                    <AlertTriangle className="h-5 w-5 mr-1" />
                    <span className="text-xs hidden sm:inline">Multiple tabs</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent>
                  <p className="max-w-xs">Multiple GeoAttend tabs detected. Each tab has its own session. We recommend using only one tab at a time to avoid confusion.</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
          
          {/* Testing mode switch */}
          <div className="flex items-center space-x-2">
            <Switch
              id="testing-mode"
              checked={testingMode}
              onCheckedChange={() => setTestingMode(prev => !prev)}
              aria-label="Toggle Testing Mode"
            />
            <Label htmlFor="testing-mode" className="text-xs">Testing Mode</Label>
          </div>
          
          {/* User profile dropdown */}
          {userRole && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-full h-10 w-10">
                  <Avatar>
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel className="flex items-center gap-2">
                  {roleIcon}
                  <span>{user?.displayName || roleText}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} disabled={isLoggingOut}>
                  <LogOut className="h-4 w-4 mr-2" />
                  {isLoggingOut ? 'Logging out...' : 'Log Out'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
