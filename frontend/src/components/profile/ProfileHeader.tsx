'use client';

import { useRef, useEffect } from 'react';
import gsap from 'gsap';
import { Mail, Camera } from 'lucide-react';
import { AvatarSVG } from '@/components/common/avatar';

interface ProfileHeaderProps {
  name: string;
  email: string;
  createdAt: string;
  isLoading: boolean;
}

export function ProfileHeader({
  name,
  email,
  createdAt,
  isLoading,
}: ProfileHeaderProps) {
  const headerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (headerRef.current && !isLoading) {
      gsap.fromTo(
        headerRef.current,
        { opacity: 0, y: -20 },
        { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }
      );
    }
  }, [isLoading]);

  return (
    <div
      ref={headerRef}
      className="bg-gradient-to-r from-gray-900 to-gray-800 dark:from-gray-800 dark:to-gray-900 text-white py-12"
    >
      <div className="container mx-auto px-4 max-w-6xl">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Avatar */}
          <div className="relative group">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-gray-700 ring-4 ring-white/20 flex items-center justify-center">
              <AvatarSVG name={name} size={96} />
            </div>
            <button className="absolute bottom-0 right-0 p-2 bg-white dark:bg-gray-700 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
              <Camera className="h-4 w-4 text-gray-700 dark:text-gray-200" />
            </button>
          </div>

          {/* User Info */}
          <div className="text-center sm:text-left">
            <h1 className="text-2xl font-bold">{name}</h1>
            <p className="text-gray-300 flex items-center justify-center sm:justify-start gap-2 mt-1">
              <Mail className="h-4 w-4" />
              {email}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Member since {new Date(createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
