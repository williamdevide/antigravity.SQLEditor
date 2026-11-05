import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth';
import { auth } from '../services/firebase';
import {
  syncUserProfile,
  getUserProfile,
  reloadCurrentUser,
  logoutUser,
  ADMIN_EMAIL,
} from '../services/authService';
import type { UserProfile } from '../types';

export type AuthModalTab = 'login' | 'register' | 'forgot' | 'verify';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  isAdmin: boolean;
  isEmailVerified: boolean;
  loading: boolean;
  authModalOpen: boolean;
  authModalInitialTab: AuthModalTab;
  openAuthModal: (tab?: AuthModalTab) => void;
  closeAuthModal: () => void;
  refreshUserProfile: () => Promise<void>;
  refreshEmailVerification: () => Promise<boolean>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Controle do Modal de Autenticação
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalInitialTab, setAuthModalInitialTab] = useState<AuthModalTab>('login');

  const openAuthModal = (tab: AuthModalTab = 'login') => {
    setAuthModalInitialTab(tab);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
  };

  const refreshUserProfile = async () => {
    if (!auth.currentUser) {
      setUserProfile(null);
      return;
    }
    try {
      const p = await getUserProfile(auth.currentUser.uid);
      if (p) {
        setUserProfile(p);
      } else {
        const synced = await syncUserProfile(auth.currentUser);
        setUserProfile(synced);
      }
    } catch (err) {
      console.warn('Erro ao atualizar perfil do usuário:', err);
    }
  };

  const refreshEmailVerification = async (): Promise<boolean> => {
    const verified = await reloadCurrentUser();
    if (auth.currentUser) {
      setUser({ ...auth.currentUser });
      if (verified && userProfile && !userProfile.emailVerified) {
        setUserProfile({ ...userProfile, emailVerified: true });
      }
    }
    return verified;
  };

  const logout = async () => {
    await logoutUser();
    setUser(null);
    setUserProfile(null);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profile = await syncUserProfile(currentUser);
          setUserProfile(profile);
        } catch (err) {
          console.warn('Falha ao sincronizar perfil do Firestore:', err);
          // Fallback seguro caso Firestore esteja offline
          const isProf = (currentUser.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
          setUserProfile({
            uid: currentUser.uid,
            email: currentUser.email || '',
            displayName: currentUser.displayName || 'Aluno(a) SQLEditor',
            role: isProf ? 'admin' : 'aluno',
            createdAt: new Date().toISOString(),
            emailVerified: currentUser.emailVerified,
            providerId: currentUser.providerData[0]?.providerId || 'password',
          });
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const isAdmin = useMemo(() => {
    if (!user) return false;
    const isEmailAdmin = (user.email || '').toLowerCase() === ADMIN_EMAIL.toLowerCase();
    return isEmailAdmin || userProfile?.role === 'admin';
  }, [user, userProfile]);

  const isEmailVerified = useMemo(() => {
    if (!user) return false;
    // Usuários do Google já possuem e-mail verificado
    if (user.providerData.some((p) => p.providerId === 'google.com')) return true;
    return !!user.emailVerified;
  }, [user]);

  return (
    <AuthContext.Provider
      value={{
        user,
        userProfile,
        isAdmin,
        isEmailVerified,
        loading,
        authModalOpen,
        authModalInitialTab,
        openAuthModal,
        closeAuthModal,
        refreshUserProfile,
        refreshEmailVerification,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de um <AuthProvider>');
  }
  return context;
}

