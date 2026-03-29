import React, { createContext, useContext, useState, useEffect } from 'react'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => localStorage.getItem('fb_token'))

  useEffect(() => {
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]))
        setUser({ id: payload.sub, email: payload.email, role: payload.role })
      } catch {
        localStorage.removeItem('fb_token')
        setToken(null)
      }
    }
  }, [token])

  const login = (authData) => {
    localStorage.setItem('fb_token', authData.token)
    localStorage.setItem('fb_user_name', authData.name)
    setToken(authData.token)
    setUser({ id: authData.user_id, email: authData.email, role: authData.role, name: authData.name })
  }

  const logout = () => {
    localStorage.removeItem('fb_token')
    localStorage.removeItem('fb_user_name')
    setToken(null)
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoggedIn: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
