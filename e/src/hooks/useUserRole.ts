import { useState, useEffect } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { User } from 'firebase/auth';

interface UserProfile {
  email: string;
  role: string;
  permissions: string[];
  displayName?: string;
  createdAt?: Date;
}

export const useUserRole = (user: User | null) => {
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const userDocRef = doc(db, 'users', user.uid);
        const userDoc = await getDoc(userDocRef);

        if (userDoc.exists()) {
          setUserProfile(userDoc.data() as UserProfile);
        } else {
          // If user doc doesn't exist, create a default profile.
          // Special-case: make a configured UID an admin immediately.
          const isSeededAdmin = user.uid === '4OzW9GTwokTOnza0A0e4DNclJ6H2';
          const defaultProfile: UserProfile = {
            email: user.email || '',
            role: isSeededAdmin ? 'admin' : 'viewer',
            permissions: isSeededAdmin ? [] : [],
            displayName: user.displayName || 'User',
            createdAt: new Date(),
          };
          try {
            // Persist the user profile for future logins
            (async () => {
              await import('firebase/firestore').then(({ setDoc, doc }) => setDoc(doc(db, 'users', user.uid), defaultProfile));
            })();
          } catch (err) {
            console.error('Failed to create user profile in Firestore:', err);
          }
          setUserProfile(defaultProfile);
        }
        setError(null);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch user role'
        );
        console.error('Error fetching user role:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { userProfile, loading, error };
};
