"use client";

import { useAppContext } from '@/contexts/AppContext';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { LogOut, User, Briefcase, Settings, MapPinIcon } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export default function Header() {
  const { userRole, setUserRole, testingMode, setTestingMode } = useAppContext();
  const router = useRouter();

  const handleLogout = () => {
    setUserRole(null);
    // Optionally clear other stored data if needed
    // localStorage.removeItem('geoattend-classes');
    // localStorage.removeItem('geoattend-attendance');
    router.push('/');
  };

  const roleIcon = userRole === 'student' ? <User className="h-5 w-5" /> : <Briefcase className="h-5 w-5" />;
  const roleText = userRole ? userRole.charAt(0).toUpperCase() + userRole.slice(1) : 'Guest';

  return (
    <header className="bg-card border-b shadow-sm sticky top-0 z-40">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MapPinIcon className="h-8 w-8 text-primary" />
          <h1 className="text-2xl font-bold text-primary">GeoAttend</h1>
        </div>
        <div className="flex items-center gap-4">
          {userRole && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {roleIcon}
              <span>{roleText}</span>
            </div>
          )}
           <div className="flex items-center space-x-2">
            <Switch
              id="testing-mode"
              checked={testingMode}
              onCheckedChange={() => setTestingMode(prev => !prev)}
              aria-label="Toggle Testing Mode"
            />
            <Label htmlFor="testing-mode" className="text-xs">Testing Mode</Label>
          </div>
          {userRole && (
             <Button variant="ghost" size="icon" onClick={handleLogout} aria-label="Log Out">
                <LogOut className="h-5 w-5" />
              </Button>
          )}
        </div>
      </div>
    </header>
  );
}
