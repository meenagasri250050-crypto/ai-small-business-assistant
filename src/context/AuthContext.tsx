import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { 
  auth, 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  signInWithPopup,
  googleProvider,
  User 
} from '../config/firebase';
import { getUserProfile, saveUserProfile } from '../services/firestoreService';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  loading: boolean;
  authError: string | null;
  clearAuthError: () => void;
  signUpWithEmail: (name: string, shopName: string, email: string, password: string) => Promise<void>;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  loginWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshProfile: () => Promise<void>;
  updateProfileData: (updates: Partial<UserProfile>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  const clearAuthError = () => setAuthError(null);

  const fetchProfile = async (user: User) => {
    try {
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        // Initialize default profile if it doesn't exist
        const defaultProfile: UserProfile = {
          uid: user.uid,
          name: user.displayName || 'Shop Owner',
          shopName: 'My Retail Shop',
          email: user.email || '',
          currency: '₹',
          createdAt: new Date().toISOString(),
        };
        await saveUserProfile(defaultProfile);
        profile = defaultProfile;
      }
      setUserProfile(profile);
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
    }
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await fetchProfile(user);
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const signUpWithEmail = async (name: string, shopName: string, email: string, password: string) => {
    setAuthError(null);
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const newProfile: UserProfile = {
        uid: user.uid,
        name: name.trim(),
        shopName: shopName.trim(),
        email: email.trim(),
        currency: '₹',
        createdAt: new Date().toISOString(),
      };

      await saveUserProfile(newProfile);
      setUserProfile(newProfile);
    } catch (err: any) {
      console.error('Sign up error:', err);
      let msg = err.message || 'Failed to create account.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is not enabled yet in your Firebase Console. Please enable Email/Password provider in Firebase Console > Authentication > Sign-in method, or use Google Sign-In below.';
      } else if (err.code === 'auth/email-already-in-use') {
        msg = 'This email address is already in use by another shop account.';
      } else if (err.code === 'auth/weak-password') {
        msg = 'Password should be at least 6 characters.';
      } else if (err.code === 'auth/invalid-email') {
        msg = 'Please enter a valid email address.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const loginWithEmail = async (email: string, password: string) => {
    setAuthError(null);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err: any) {
      console.error('Login error:', err);
      let msg = err.message || 'Failed to log in.';
      if (err.code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is not enabled yet in your Firebase Console. Please enable Email/Password provider in Firebase Console > Authentication > Sign-in method, or sign in with Google below.';
      } else if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = 'Invalid email or password. Please verify your credentials or reset your password.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const loginWithGoogle = async () => {
    setAuthError(null);
    try {
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        const newProfile: UserProfile = {
          uid: user.uid,
          name: user.displayName || 'Shop Owner',
          shopName: `${user.displayName?.split(' ')[0] || 'My'}'s Store`,
          email: user.email || '',
          currency: '₹',
          createdAt: new Date().toISOString(),
        };
        await saveUserProfile(newProfile);
        setUserProfile(newProfile);
      }
    } catch (err: any) {
      console.error('Google Sign-in error:', err);
      setAuthError(err.message || 'Failed to sign in with Google.');
      throw err;
    }
  };

  const resetPassword = async (email: string) => {
    setAuthError(null);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err: any) {
      console.error('Password reset error:', err);
      let msg = err.message || 'Failed to send password reset email.';
      if (err.code === 'auth/user-not-found') {
        msg = 'No account found with this email address.';
      }
      setAuthError(msg);
      throw new Error(msg);
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      setUserProfile(null);
      setCurrentUser(null);
    } catch (err: any) {
      console.error('Logout error:', err);
    }
  };

  const refreshProfile = async () => {
    if (currentUser) {
      await fetchProfile(currentUser);
    }
  };

  const updateProfileData = async (updates: Partial<UserProfile>) => {
    if (!currentUser || !userProfile) return;
    const updated = { ...userProfile, ...updates };
    await saveUserProfile(updated);
    setUserProfile(updated);
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        loading,
        authError,
        clearAuthError,
        signUpWithEmail,
        loginWithEmail,
        loginWithGoogle,
        resetPassword,
        logout,
        refreshProfile,
        updateProfileData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
