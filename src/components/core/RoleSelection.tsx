"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const roles = [
  {
    key: 'student',
    label: "I'm a Student",
    emoji: '🧑‍🎓',
    description: "Access your personalized dashboard to view classes, mark attendance, and track your history.",
    route: '/auth/student',
  },
  {
    key: 'lecturer',
    label: "I'm a Lecturer",
    emoji: '👩‍🏫',
    description: "Manage classes, generate QR codes, track student attendance, and view reports.",
    route: '/auth/lecturer',
  },
];

export default function RoleSelection() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const handleRoleSelect = (role: typeof roles[number]) => {
    setSelected(role.key);
    // No delay needed with card click, immediate navigation
    router.push(role.route);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 dark:from-gray-800 dark:to-gray-950">
      <div className="mb-12 text-center">
        <h1 className="text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-50 sm:text-6xl lg:text-7xl leading-tight">
          Welcome to <span className="text-blue-600 dark:text-blue-400">Trakzy</span>
        </h1>
        <p className="mt-5 text-xl text-gray-700 dark:text-gray-300 max-w-2xl font-medium">
          Smart Attendance, Simplified. Please select your role to get started.
        </p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-5xl px-4">
        {roles.map((role) => (
          <Card
            key={role.key}
            className={`relative flex flex-col items-center p-8 rounded-xl shadow-lg border-2 border-gray-200 dark:border-gray-700 transition-all duration-300 ease-in-out
              bg-white dark:bg-gray-850 hover:shadow-xl hover:scale-[1.02] transform-gpu
              ${selected === role.key ? 'ring-4 ring-blue-400 dark:ring-blue-600 border-blue-500 dark:border-blue-500' : ''}
              group overflow-hidden cursor-pointer`}
            onClick={() => handleRoleSelect(role)}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-blue-50/20 dark:to-blue-900/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            <CardHeader className="flex flex-col items-center text-center space-y-4 mb-4 z-10 p-0">
              <span className="text-7xl leading-none drop-shadow-lg transform transition-transform duration-300 group-hover:scale-110">{role.emoji}</span>
              <CardTitle className="text-3xl font-bold text-gray-900 dark:text-gray-50 tracking-tight mt-4">{role.label}</CardTitle>
            </CardHeader>
            <CardContent className="text-center z-10 p-0">
              <CardDescription className="text-lg text-gray-600 dark:text-gray-400 max-w-sm">
                {role.description}
              </CardDescription>
            </CardContent>
            <div className={`absolute bottom-4 right-4 text-sm font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10`}>
                Select Role →
            </div>
          </Card>
        ))}
      </div>

      <footer className="mt-20 text-center text-sm text-gray-600 dark:text-gray-400 opacity-90">
        <p>&copy; {new Date().getFullYear()} Trakzy. All rights reserved.</p>
        <p>Smart Attendance, Simplified.</p>
      </footer>
    </div>
  );
}
