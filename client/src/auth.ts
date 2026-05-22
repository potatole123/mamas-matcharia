import { createContext, useContext } from 'react'
import type { User, UserCredential } from 'firebase/auth'

export type AuthContextValue = {
  user: User | null
  username: string | null
  loading: boolean
  signInGoogle: () => Promise<UserCredential>
  signUp: (email: string, password: string) => Promise<UserCredential>
  login: (email: string, password: string) => Promise<UserCredential>
  logout: () => Promise<void>
  getIdToken: () => Promise<string | null>
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
