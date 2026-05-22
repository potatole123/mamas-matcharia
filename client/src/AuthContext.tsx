import {
  useEffect,
  useState,
  type ReactNode,
} from 'react'

import {
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from 'firebase/auth'

import { AuthContext } from './auth'
import { auth, isFirebaseConfigured } from './firebase'

const firebaseConfigError = new Error('Firebase is not configured. Add the VITE_FIREBASE_* values to client/.env.')

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [username, setUsername] = useState<string | null>(null)
  const [loading, setLoading] = useState(Boolean(auth))
  const value = {
    user,
    username,
    loading,
    signInGoogle,
    signUp,
    login,
    logout,
    getIdToken,
  }

  useEffect(() => {
    if (!auth) {
      return undefined
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setUser(user)
      setUsername(user?.email?.split('@')[0] ?? null)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  function signInGoogle() {
    if (!auth || !isFirebaseConfigured) {
      return Promise.reject(firebaseConfigError)
    }

    const gProvider = new GoogleAuthProvider()
    return signInWithPopup(auth, gProvider)
  }

  function signUp(email: string, password: string) {
    if (!auth || !isFirebaseConfigured) {
      return Promise.reject(firebaseConfigError)
    }

    return createUserWithEmailAndPassword(auth, email, password)
  }

  function login(email: string, password: string) {
    if (!auth || !isFirebaseConfigured) {
      return Promise.reject(firebaseConfigError)
    }

    return signInWithEmailAndPassword(auth, email, password)
  }

  function logout() {
    if (!auth || !isFirebaseConfigured) {
      setUser(null)
      setUsername(null)
      return Promise.resolve()
    }

    return signOut(auth)
  }

  function getIdToken() {
    return auth?.currentUser?.getIdToken() ?? Promise.resolve(null)
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
