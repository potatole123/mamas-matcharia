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
import { Fetch } from './Fetch'
import { auth, isFirebaseConfigured } from './firebase'

const firebaseConfigError = new Error('Firebase is not configured. Add the VITE_FIREBASE_* values to client/.env.')

type AuthSessionPayload = {
  user: {
    userId: string
    email: string
    username: string
  }
  profile: {
    displayName: string
  } | null
}

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
    const firebaseAuth = auth

    if (!firebaseAuth) {
      return undefined
    }

    let isSubscribed = true

    const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
      if (!isSubscribed) {
        return
      }

      setUser(user)

      if (!user) {
        setUsername(null)
        setLoading(false)
        return
      }

      try {
        await syncBackendSession(user)
      } catch {
        await signOut(firebaseAuth)
      } finally {
        if (isSubscribed) {
          setLoading(false)
        }
      }
    })

    return () => {
      isSubscribed = false
      unsubscribe()
    }
  }, [])

  async function syncBackendSession(firebaseUser: User) {
    const token = await firebaseUser.getIdToken()
    const session = await Fetch<AuthSessionPayload>('/api/authentication/login', {
      method: 'POST',
      token,
    })

    setUsername(session.profile?.displayName ?? session.user.username)
    return session
  }

  async function signInGoogle() {
    if (!auth || !isFirebaseConfigured) {
      return Promise.reject(firebaseConfigError)
    }

    const gProvider = new GoogleAuthProvider()
    const credential = await signInWithPopup(auth, gProvider)

    try {
      await syncBackendSession(credential.user)
      return credential
    } catch (error) {
      await signOut(auth)
      throw error
    }
  }

  async function signUp(email: string, password: string) {
    if (!auth || !isFirebaseConfigured) {
      return Promise.reject(firebaseConfigError)
    }

    const credential = await createUserWithEmailAndPassword(auth, email, password)

    try {
      await syncBackendSession(credential.user)
      return credential
    } catch (error) {
      await signOut(auth)
      throw error
    }
  }

  async function login(email: string, password: string) {
    if (!auth || !isFirebaseConfigured) {
      return Promise.reject(firebaseConfigError)
    }

    const credential = await signInWithEmailAndPassword(auth, email, password)

    try {
      await syncBackendSession(credential.user)
      return credential
    } catch (error) {
      await signOut(auth)
      throw error
    }
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
