import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import {
    createUserWithEmailAndPassword,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    signInWithPopup,
    signOut,
    type User,
    type UserCredential
} from 'firebase/auth'

import { auth } from './firebase'

type AuthContextValue = {
  user: User | null;
  username: string | null;
  loading: boolean;
  signInGoogle: () => Promise<UserCredential>;
  signUp: (email: string, password: string) => Promise<UserCredential>;
  login: (email: string, password: string) => Promise<UserCredential>;
  logout: () => Promise<void>;
  getIdToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

export function useAuth() {
    const context = useContext(AuthContext)
    if (context === undefined) {
        throw new Error("undefined auth context value provided")
    }
    return context
}

export function AuthProvider( { children }: { children: ReactNode } ) {
    const [user, setUser] = useState<User | null>(null);
    const [username, setUsername] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const value = {
        user,
        username,
        loading,
        signInGoogle,
        signUp,
        login,
        logout,
        getIdToken,
    };

   useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setUsername(user?.email?.split("@")[0] ?? null);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    function signInGoogle() {
        const gProvider = new GoogleAuthProvider()
        return signInWithPopup(auth, gProvider)
    }

    function signUp(email: string, password: string) {
        return createUserWithEmailAndPassword(auth, email, password)
    }

    function login(email: string , password: string) {
        return signInWithEmailAndPassword(auth, email, password)
    }

    function logout() {
        return signOut(auth)
    }

    function getIdToken() {
        return auth.currentUser?.getIdToken() ?? Promise.resolve(null);
    }   

    return(
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    )
}
