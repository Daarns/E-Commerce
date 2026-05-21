import { useState, useEffect } from 'react';
import { Address } from '@/types';
import { authService } from '@/services/auth';
import { addressService } from '@/services/address';
import { toast } from 'sonner';

interface ProfileData {
  id: string;
  email: string;
  name: string;
  phone: string;
  created_at: string;
}

export function useProfileData() {
  const [userData, setUserData] = useState<ProfileData | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      setIsLoading(true);
      try {
        const [userProfile, userAddresses] = await Promise.all([
          authService.getProfile(),
          addressService.getAddresses(),
        ]);

        setUserData({
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          phone: userProfile.phone || '',
          created_at: userProfile.created_at,
        });

        setAddresses(userAddresses);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load profile data';
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    }

    loadProfile();
  }, []);

  return { userData, addresses, isLoading, error, setUserData, setAddresses };
}
