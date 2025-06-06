"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import RoleSelection from '@/components/core/RoleSelection';
import { useAppContext } from '@/contexts/AppContext';
import LoadingSpinner from '@/components/core/LoadingSpinner';
import Link from 'next/link';
import SupabaseTroubleshooting from '@/components/core/SupabaseTroubleshooting';

export default function Home() {
  return (
    <RoleSelection />
  );
}
