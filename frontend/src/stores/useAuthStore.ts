import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { authService, type User, type LoginCredentials, type SignupData, type UpdateProfileData } from '../services/authService'



interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => void
  updateProfile: (data: Partial<User>) => Promise<void>
  checkAuth: () => void
  clearError: () => void
  setLoading: (loading: boolean) => void
}

type AuthStore = AuthState & AuthActions

export const useAuthStore = create<AuthStore>()(persist(
  (set, get) => ({
    // Initial state
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: false,
    error: null,

    // Actions
    login: async (email: string, password: string) => {
      set({ isLoading: true, error: null })
      try {
        const credentials: LoginCredentials = { email, password }
        const { user, token } = await authService.login(credentials)
        
        set({
          user,
          token,
          isAuthenticated: true,
          isLoading: false
        })
      } catch (error) {
        console.error('Login failed:', error);
        set({
          error: error instanceof Error ? error.message : 'Login failed',
          isLoading: false
        })
        throw error // Re-throw the error so the Login component can catch it
      }
    },

    signup: async (name: string, email: string, password: string) => {
      set({ isLoading: true, error: null })
      try {
        const signupData: SignupData = { name, email, password }
        await authService.signup(signupData)
        
        set({ isLoading: false })
        // After successful signup, you might want to auto-login
        // or redirect to login page
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Signup failed',
          isLoading: false
        })
        throw error // Re-throw the error so components can handle it
      }
    },

    logout: () => {
      authService.logout()
      set({
        user: null,
        token: null,
        isAuthenticated: false,
        error: null
      })
    },

    updateProfile: async (data: Partial<User>) => {
      const { user } = get()
      if (!user) return
      
      set({ isLoading: true, error: null })
      try {
        const updateData: UpdateProfileData = {
          name: data.name,
          email: data.email
        }
        const updatedUser = await authService.updateProfile(updateData)
        
        set({
          user: updatedUser,
          isLoading: false
        })
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Profile update failed',
          isLoading: false
        })
        throw error // Re-throw the error so components can handle it
      }
    },

    checkAuth: () => {
      const storedAuth = authService.getStoredAuth()
      if (storedAuth) {
        set({
          user: storedAuth.user,
          token: storedAuth.token,
          isAuthenticated: true
        })
      } else {
        set({
          user: null,
          token: null,
          isAuthenticated: false
        })
      }
    },

    clearError: () => set({ error: null }),
    setLoading: (loading: boolean) => set({ isLoading: loading })
  }),
  {
    name: 'auth-storage',
    partialize: (state) => ({
      user: state.user,
      token: state.token,
      isAuthenticated: state.isAuthenticated
    })
  }
))