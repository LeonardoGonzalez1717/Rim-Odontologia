// =============================================================================
// context/AuthContext.jsx — Estado de autenticación y roles
// =============================================================================
import React, { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { login as apiLogin } from '../api/api'

const STORAGE_KEY = 'rim_challouf_user'

const AuthContext = createContext(null)

const loadStoredUser = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(loadStoredUser)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const login = useCallback(async (username, password) => {
    setLoading(true)
    try {
      const data = await apiLogin({ username, password })
      setUser(data.user)
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data.user))
      return data.user
    } finally {
      setLoading(false)
    }
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    sessionStorage.removeItem(STORAGE_KEY)
  }, [])

  const updateUser = useCallback((datos) => {
    setUser((prev) => {
      if (!prev) return prev
      const actualizado = { ...prev, ...datos }
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(actualizado))
      return actualizado
    })
  }, [])

  const isAdmin = user?.rol === 'admin'
  const isAsistente = user?.rol === 'asistente'

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, updateUser, isAdmin, isAsistente }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
