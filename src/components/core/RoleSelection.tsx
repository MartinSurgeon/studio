"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';

const roles = [
  {
    key: 'student',
    label: "I'm a Student",
    emoji: '🧑‍🎓',
    route: '/auth/student',
  },
  {
    key: 'lecturer',
    label: "I'm a Lecturer",
    emoji: '👩‍🏫',
    route: '/auth/lecturer',
  },
];

export default function RoleSelection() {
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);

  const handleRoleSelect = (role: typeof roles[number]) => {
    setSelected(role.key);
    setTimeout(() => router.push(role.route), 200); // slight delay for effect
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-100 via-white to-blue-200 p-4">
      <div className="mb-8 flex flex-col items-center">
        <div className="flex items-center gap-3">
          <span className="text-5xl drop-shadow-lg">📍</span>
          <span className="text-4xl font-extrabold text-primary tracking-tight">Trakzy</span>
        </div>
        <div className="mt-2 text-base text-blue-700 font-medium tracking-wide bg-white/60 px-4 py-1 rounded-full shadow-sm backdrop-blur-sm">
          Smart Attendance, Simplified
        </div>
          </div>
      <div className="mb-8 text-lg text-muted-foreground font-medium text-center max-w-md">
            Welcome! Please select your role to continue.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-8 w-full max-w-2xl">
        {roles.map((role) => (
          <button
            key={role.key}
            type="button"
            onClick={() => handleRoleSelect(role)}
            className={`flex flex-col items-center justify-center p-10 rounded-3xl shadow-2xl border-2 transition-all duration-300 focus:outline-none focus:ring-4 focus:ring-blue-300/40
              bg-white/60 backdrop-blur-lg hover:bg-blue-50/80 hover:shadow-blue-200
              ${selected === role.key ? 'border-blue-600 bg-gradient-to-br from-blue-100 to-blue-200 scale-105 shadow-blue-300/40' : 'border-transparent'}
              group relative overflow-hidden`}
            aria-label={role.label}
          >
            <span className="text-7xl mb-5 drop-shadow-xl transition-transform duration-300 group-hover:scale-110 group-active:scale-95">
              {role.emoji}
            </span>
            <span className="text-2xl font-bold text-gray-800 mb-1 tracking-tight group-hover:text-blue-700 transition-colors duration-200">
              {role.label}
            </span>
            <span className={`absolute inset-0 rounded-3xl pointer-events-none transition-all duration-300 ${selected === role.key ? 'ring-4 ring-blue-400/30' : ''}`}></span>
          </button>
        ))}
      </div>
      <footer className="mt-16 text-center text-sm text-muted-foreground opacity-80">
        <p>&copy; {new Date().getFullYear()} GeoAttend. All rights reserved.</p>
        <p>Smart Attendance, Simplified.</p>
      </footer>
    </div>
  );
}
