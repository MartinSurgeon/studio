"use client";

import { ReactNode } from 'react';
import { useAppContext } from '@/contexts/AppContext';

export default function StudentLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
} 