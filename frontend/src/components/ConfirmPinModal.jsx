// =============================================================================
// components/ConfirmPinModal.jsx
// Modal reutilizable de confirmación con PIN de administrador
// =============================================================================
import React, { useState, useEffect, useRef } from 'react'
import { Shield, Loader2, AlertTriangle, X, KeyRound, Eye, EyeOff } from 'lucide-react'
import { verifyPin } from '../api/api'

const ConfirmPinModal = ({
  titulo,
  descripcion,
  detalle,
  textoConfirmar = 'Confirmar',
  variante = 'danger',
  onConfirm,
  onClose,
}) => {
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPin, setShowPin] = useState(false)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
    const fn = (e) => { if (e.key === 'Escape' && !loading) onClose() }
    document.addEventListener('keydown', fn)
    return () => document.removeEventListener('keydown', fn)
  }, [onClose, loading])

  const esPeligro = variante === 'danger'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!/^\d{4,6}$/.test(pin)) {
      setError('El PIN debe tener entre 4 y 6 dígitos.')
      return
    }

    setLoading(true)
    setError('')
    try {
      await verifyPin(pin)
      await onConfirm()
      onClose()
    } catch (err) {
      if (err.message && !err.message.includes('PIN')) {
        onClose()
      }
      setError(err.message || 'PIN incorrecto.')
      setPin('')
      inputRef.current?.focus()
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in"
      onClick={(e) => e.target === e.currentTarget && !loading && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-scale-in">
        <div className="p-6">
          <div className="flex justify-center mb-4">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center
              ${esPeligro ? 'bg-red-50 border border-red-200' : 'bg-amber-50 border border-amber-200'}`}>
              {esPeligro
                ? <AlertTriangle size={28} className="text-red-500" />
                : <Shield size={28} className="text-amber-600" />
              }
            </div>
          </div>

          <h3 className="text-lg font-bold text-slate-800 text-center mb-1">{titulo}</h3>
          {descripcion && (
            <p className="text-sm text-slate-500 text-center mb-1">{descripcion}</p>
          )}
          {detalle && (
            <p className="text-sm text-slate-400 text-center mb-4">{detalle}</p>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200
                              text-red-700 rounded-xl p-3 text-sm">
                <X size={14} className="flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="pin-confirm" className="form-label text-center block">
                <KeyRound size={14} className="inline mr-1.5 text-pink-500" />
                PIN del administrador
              </label>
              <div className="relative">
                <input
                  ref={inputRef}
                  id="pin-confirm"
                  type={showPin ? 'text' : 'password'}
                  inputMode="numeric"
                  pattern="\d{4,6}"
                  maxLength={6}
                  value={pin}
                  onChange={(e) => {
                    setError('')
                    setPin(e.target.value.replace(/\D/g, '').slice(0, 6))
                  }}
                  placeholder="••••"
                  className="form-input text-center text-lg tracking-[0.4em] font-mono pr-11"
                  autoComplete="off"
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPin((prev) => !prev)}
                  disabled={loading}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400
                             hover:text-slate-600 transition-colors disabled:opacity-40"
                  aria-label={showPin ? 'Ocultar PIN' : 'Mostrar PIN'}
                >
                  {showPin ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              <p className="text-xs text-slate-400 text-center mt-2">
                Ingresa el PIN configurado en la cuenta de administrador
              </p>
            </div>

            <div className="flex gap-3 pt-1">
              <button type="button" onClick={onClose} disabled={loading} className="btn-secondary flex-1">
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className={`flex-1 font-semibold py-2.5 px-5 rounded-xl text-white
                            transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2
                            disabled:opacity-50 flex items-center justify-center gap-2
                            ${esPeligro
                              ? 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                              : 'bg-pink-600 hover:bg-pink-700 focus:ring-pink-500'
                            }`}
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Verificando…</>
                ) : (
                  textoConfirmar
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default ConfirmPinModal
