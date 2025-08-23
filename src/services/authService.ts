import { API_BASE_URL } from '../config/clientEnv';

interface User {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  createdAt: string
}

interface LoginCredentials {
  email: string
  password: string
}

interface SignupData {
  name: string
  email: string
  password: string
}

interface UpdateProfileData {
  name?: string
  email?: string
}

interface ChangePasswordData {
  currentPassword: string
  newPassword: string
}

interface AuthResponse {
  user: User
  token: string
}

// Seeded users
const SEEDED_USERS: User[] = [
  {
    id: '1',
    email: 'admin@trae.com',
    name: 'Admin User',
    role: 'admin',
    createdAt: new Date().toISOString()
  },
  {
    id: '2',
    email: 'demo@trae.com',
    name: 'Demo User',
    role: 'user',
    createdAt: new Date().toISOString()
  }
]

// Password mapping for seeded users
const USER_PASSWORDS: Record<string, string> = {
  'admin@trae.com': 'admin123',
  'demo@trae.com': 'demo123'
}

class AuthService {
  private readonly USERS_KEY = 'trae_users'
  private readonly AUTH_KEY = 'trae_auth'

  constructor() {
    this.initializeUsers()
  }

  private initializeUsers(): void {
    const existingUsers = localStorage.getItem(this.USERS_KEY)
    if (!existingUsers) {
      localStorage.setItem(this.USERS_KEY, JSON.stringify(SEEDED_USERS))
    }
  }

  private getUsers(): User[] {
    const users = localStorage.getItem(this.USERS_KEY)
    return users ? JSON.parse(users) : SEEDED_USERS
  }

  private saveUsers(users: User[]): void {
    localStorage.setItem(this.USERS_KEY, JSON.stringify(users))
  }

  private generateToken(user: User): string {
    return btoa(JSON.stringify({ userId: user.id, email: user.email, role: user.role }))
  }

  private saveAuth(user: User, token: string): void {
    const authData = { user, token }
    localStorage.setItem(this.AUTH_KEY, JSON.stringify(authData))
  }

  private clearAuth(): void {
    localStorage.removeItem(this.AUTH_KEY)
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    // TODO: Replace with actual API call to POST /auth/login
    // const response = await fetch(`${API_BASE_URL}/auth/login`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(credentials)
    // });
    // if (!response.ok) throw new Error('Login failed');
    // return await response.json();
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = this.getUsers()
        const user = users.find(u => u.email === credentials.email)
        
        if (!user) {
          reject(new Error('User not found'))
          return
        }

        const expectedPassword = USER_PASSWORDS[credentials.email]
        if (credentials.password !== expectedPassword) {
          reject(new Error('Invalid password'))
          return
        }

        const token = this.generateToken(user)
        this.saveAuth(user, token)
        
        resolve({ user, token })
      }, 800)
    })
  }

  async signup(data: SignupData): Promise<void> {
    // TODO: Replace with actual API call to POST /auth/signup
    // const response = await fetch(`${API_BASE_URL}/auth/signup`, {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(data)
    // });
    // if (!response.ok) throw new Error('Signup failed');
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = this.getUsers()
        
        if (users.find(u => u.email === data.email)) {
          reject(new Error('Email already exists'))
          return
        }

        const newUser: User = {
          id: Date.now().toString(),
          email: data.email,
          name: data.name,
          role: 'user',
          createdAt: new Date().toISOString()
        }

        users.push(newUser)
        this.saveUsers(users)
        
        // Store password for new user
        const passwords = JSON.parse(localStorage.getItem('trae_passwords') || '{}')
        passwords[data.email] = data.password
        localStorage.setItem('trae_passwords', JSON.stringify(passwords))
        
        resolve()
      }, 1000)
    })
  }

  async me(): Promise<User> {
    // TODO: Replace with actual API call to GET /auth/me
    // const response = await fetch(`${API_BASE_URL}/auth/me`, {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // if (!response.ok) throw new Error('Failed to get user info');
    // return await response.json();
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const authData = localStorage.getItem(this.AUTH_KEY)
        
        if (!authData) {
          reject(new Error('Not authenticated'))
          return
        }

        try {
          const { user } = JSON.parse(authData)
          resolve(user)
        } catch (error) {
          reject(new Error('Invalid auth data'))
        }
      }, 300)
    })
  }

  async updateProfile(data: UpdateProfileData): Promise<User> {
    // TODO: Replace with actual API call to PUT /auth/profile
    // const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    //   method: 'PUT',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`
    //   },
    //   body: JSON.stringify(data)
    // });
    // if (!response.ok) throw new Error('Failed to update profile');
    // return await response.json();
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const authData = localStorage.getItem(this.AUTH_KEY)
        
        if (!authData) {
          reject(new Error('Not authenticated'))
          return
        }

        try {
          const { user, token } = JSON.parse(authData)
          const users = this.getUsers()
          
          const userIndex = users.findIndex(u => u.id === user.id)
          if (userIndex === -1) {
            reject(new Error('User not found'))
            return
          }

          const updatedUser = { ...users[userIndex], ...data }
          users[userIndex] = updatedUser
          
          this.saveUsers(users)
          this.saveAuth(updatedUser, token)
          
          resolve(updatedUser)
        } catch (error) {
          reject(new Error('Failed to update profile'))
        }
      }, 600)
    })
  }

  async changePassword(data: ChangePasswordData): Promise<void> {
    // TODO: Replace with actual API call to PUT /auth/password
    // const response = await fetch(`${API_BASE_URL}/auth/password`, {
    //   method: 'PUT',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`
    //   },
    //   body: JSON.stringify(data)
    // });
    // if (!response.ok) throw new Error('Failed to change password');
    
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const authData = localStorage.getItem(this.AUTH_KEY)
        
        if (!authData) {
          reject(new Error('Not authenticated'))
          return
        }

        try {
          const { user } = JSON.parse(authData)
          
          // Check current password
          const storedPasswords = JSON.parse(localStorage.getItem('trae_passwords') || '{}')
          const currentPassword = storedPasswords[user.email] || USER_PASSWORDS[user.email]
          
          if (data.currentPassword !== currentPassword) {
            reject(new Error('Current password is incorrect'))
            return
          }

          // Update password
          storedPasswords[user.email] = data.newPassword
          localStorage.setItem('trae_passwords', JSON.stringify(storedPasswords))
          
          resolve()
        } catch (error) {
          reject(new Error('Failed to change password'))
        }
      }, 600)
    })
  }

  logout(): void {
    // TODO: Add API call to POST /auth/logout to invalidate token on server
    // await fetch(`${API_BASE_URL}/auth/logout`, {
    //   method: 'POST',
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    
    this.clearAuth()
  }

  getStoredAuth(): { user: User; token: string } | null {
    const authData = localStorage.getItem(this.AUTH_KEY)
    if (!authData) return null
    
    try {
      return JSON.parse(authData)
    } catch {
      return null
    }
  }

  isAuthenticated(): boolean {
    return this.getStoredAuth() !== null
  }
}

export const authService = new AuthService()
export type { User, LoginCredentials, SignupData, UpdateProfileData, ChangePasswordData, AuthResponse }