"use client";

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, Briefcase } from 'lucide-react';

export default function RoleSelection() {
  const router = useRouter();

  const handleRoleSelect = (role: 'student' | 'lecturer') => {
    if (role === 'student') {
      router.push('/auth/student');
    } else {
      router.push('/auth/lecturer');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-secondary to-background p-4">
      <Card className="w-full max-w-md shadow-2xl">
        <CardHeader className="text-center">
          <div className="inline-flex items-center justify-center mb-4">
             <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-primary mr-2"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>
            <CardTitle className="text-4xl font-bold">Trakzy</CardTitle>
          </div>
          <CardDescription className="text-lg text-muted-foreground">
            Welcome! Please select your role to continue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 p-8">
          <Button
            onClick={() => handleRoleSelect('student')}
            className="w-full text-lg py-6 bg-primary hover:bg-primary/90 text-primary-foreground transition-all duration-300 ease-in-out transform hover:scale-105"
            aria-label="Select Student Role"
          >
            <User className="mr-3 h-6 w-6" />
            I am a Student
          </Button>
          <Button
            onClick={() => handleRoleSelect('lecturer')}
            variant="outline"
            className="w-full text-lg py-6 border-primary text-primary hover:bg-primary/10 transition-all duration-300 ease-in-out transform hover:scale-105"
            aria-label="Select Lecturer Role"
          >
            <Briefcase className="mr-3 h-6 w-6" />
            I am a Lecturer
          </Button>
        </CardContent>
      </Card>
      <footer className="mt-8 text-center text-sm text-muted-foreground">
        <p>&copy; {new Date().getFullYear()} GeoAttend. All rights reserved.</p>
        <p>Smart Attendance, Simplified.</p>
      </footer>
    </div>
  );
}
