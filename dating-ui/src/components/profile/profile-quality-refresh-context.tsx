'use client';

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

type ProfileQualityRefreshValue = {
  refreshKey: number;
  bumpQualityRefresh: () => void;
};

const ProfileQualityRefreshContext =
  createContext<ProfileQualityRefreshValue | null>(null);

export function ProfileQualityRefreshProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const bumpQualityRefresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);
  const value = useMemo(
    () => ({ refreshKey, bumpQualityRefresh }),
    [refreshKey, bumpQualityRefresh],
  );
  return (
    <ProfileQualityRefreshContext.Provider value={value}>
      {children}
    </ProfileQualityRefreshContext.Provider>
  );
}

export function useProfileQualityRefresh(): ProfileQualityRefreshValue {
  const ctx = useContext(ProfileQualityRefreshContext);
  if (!ctx) {
    return {
      refreshKey: 0,
      bumpQualityRefresh: () => {},
    };
  }
  return ctx;
}
