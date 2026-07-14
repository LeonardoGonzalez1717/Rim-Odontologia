// =============================================================================
// pages/Login.jsx — Pantalla de inicio de sesión
// =============================================================================
import React, { useState } from 'react'
import { LogIn, Loader2, AlertCircle, User, Lock, Eye, EyeOff } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import Logo from '../components/Logo'
import BackendLoader from '../components/BackendLoader'

const Login = () => {
  const { login, loading } = useAuth()
  const [form, setForm] = useState({ username: '', password: '' })
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setError('')
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.username.trim() || !form.password) {
      setError('Ingresa usuario y contraseña.')
      return
    }

    try {
      await login(form.username.trim(), form.password)
    } catch (err) {
      setError(err.message || 'Error al iniciar sesión.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4
                    bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900">
      <BackendLoader />
      <div className="w-full max-w-md animate-scale-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex mb-4">
            <Logo size="xl" />
          </div>
          <h1 className="text-2xl font-bold text-white">Rim Challouf</h1>
          <p className="text-slate-400 text-sm mt-1">Sistema de Control de Ventas</p>
        </div>

        {/* Formulario */}
        <form
          onSubmit={handleSubmit}
          className="bg-white rounded-3xl shadow-2xl p-8 space-y-5"
        >
          <div className="text-center mb-2">
            <h2 className="text-lg font-bold text-slate-800">Iniciar Sesión</h2>
            <p className="text-sm text-slate-500 mt-0.5">
              Accede con tu cuenta de administrador o asistente
            </p>
          </div>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200
                            text-red-700 rounded-xl p-4 animate-slide-up">
              <AlertCircle size={18} className="flex-shrink-0 mt-0.5" />
              <span className="text-sm">{error}</span>
            </div>
          )}

          <div>
            <label htmlFor="username" className="form-label">
              <User size={14} className="inline mr-1.5 text-pink-500" />
              Usuario
            </label>
            <input
              id="username"
              name="username"
              type="text"
              value={form.username}
              onChange={handleChange}
              className="form-input"
              placeholder="Tu nombre de usuario"
              autoComplete="username"
              autoFocus
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="form-label">
              <Lock size={14} className="inline mr-1.5 text-pink-500" />
              Contraseña
            </label>
            <div className="relative">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={handleChange}
                className="form-input pr-11"
                placeholder="••••••••"
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400
                           hover:text-slate-600 transition-colors"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full flex items-center justify-center gap-2 py-3"
          >
            {loading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Verificando…
              </>
            ) : (
              <>
                <LogIn size={18} />
                Entrar
              </>
            )}
          </button>
        </form>

        <p className="text-center text-xs text-slate-500 mt-6">
          © {new Date().getFullYear()} Rim Challouf Odontología
        </p>
      </div>
    </div>
  )
}

export default Login
