import {
  createContext, useContext, useEffect, useState, type ReactNode,
} from 'react';
import type { User } from '@supabase/supabase-js';
import {
  getSession, getSupabaseClient, supabaseEnabled, signIn, signOut, signUp,
} from './supabase';

interface AuthContextValue {
  user: User | null;
  initializing: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const c = getSupabaseClient();
    if (!c) {
      setInitializing(false);
      return;
    }

    // 初始化：讀取現有 session
    (async () => {
      const session = await getSession();
      if (!cancelled) {
        setUser(session?.user ?? null);
        setInitializing(false);
      }
    })();

    // 監聽登入/登出事件
    const { data: listener } = c.auth.onAuthStateChange((_event, session) => {
      if (!cancelled) setUser(session?.user ?? null);
    });

    return () => {
      cancelled = true;
      listener.subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, password: string) => {
    const { error } = await signIn(email, password);
    if (error) throw error;
  };

  const register = async (email: string, password: string) => {
    const { data, error } = await signUp(email, password);
    if (error) throw error;
    if (data.user && !data.session) {
      // 若需 email 驗證，提示使用者
      throw new Error('REGISTER_EMAIL_CONFIRM');
    }
  };

  const logout = async () => {
    await signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, initializing, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export { supabaseEnabled };
