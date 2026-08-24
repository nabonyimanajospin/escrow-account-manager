import { createContext, useContext, useMemo, useState } from 'react';
import { DEMO_USERS } from '../data/demoData';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      loginAs: (role) => setUser(DEMO_USERS[role]),
      logout: () => setUser(null),
    }),
    [user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  return useContext(AuthContext);
}
