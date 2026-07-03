import React, { useState, useRef, useEffect, Suspense } from 'react'
import { cn } from '@/utils'
import { X, Loader2 } from 'lucide-react'

// ─── Badge ───────────────────────────────────────────────
interface BadgeProps { className?: string; children: React.ReactNode }
export function Badge({ className, children }: BadgeProps) {
  return <span className={cn('badge', className)}>{children}</span>
}

// ─── Spinner ─────────────────────────────────────────────
export function Spinner({ size = 20, className }: { size?: number; className?: string }) {
  return <Loader2 size={size} className={cn('animate-spin text-gold-500', className)} />
}

export function PageSpinner() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Spinner size={32} />
        <p className="text-sm text-stone-400 font-body">A carregar...</p>
      </div>
    </div>
  )
}

// ─── Modal ───────────────────────────────────────────────
interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl'
}
export function Modal({ open, onClose, title, children, size = 'md' }: ModalProps) {
  useEffect(() => {
    if (open) document.body.style.overflow = 'hidden'
    else document.body.style.overflow = ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null
  const sizeClass = { sm: 'max-w-sm', md: 'max-w-md', lg: 'max-w-lg', xl: 'max-w-2xl' }[size]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-stone-950/50 backdrop-blur-sm" onClick={onClose} />
      <div className={cn('relative bg-white rounded-2xl shadow-luxury-lg w-full animate-fadeIn', sizeClass)}>
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-stone-100">
            <h2 className="section-title">{title}</h2>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-stone-100 transition-colors">
              <X size={18} className="text-stone-500" />
            </button>
          </div>
        )}
        <div className="p-6">{children}</div>
      </div>
    </div>
  )
}

// ─── LazyImage ───────────────────────────────────────────
interface LazyImageProps {
  src?: string
  alt: string
  className?: string
  fallback?: React.ReactNode
}
export function LazyImage({ src, alt, className, fallback }: LazyImageProps) {
  const [loaded, setLoaded] = useState(false)
  const [error, setError] = useState(false)
  const [inView, setInView] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setInView(true); obs.disconnect() } }, { threshold: 0.1 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [])

  const imgSrc = src?.startsWith('http') ? src : src ? `http://10.10.0.4:9090/uploads/${src}` : undefined

  return (
    <div ref={ref} className={cn('overflow-hidden bg-stone-100', className)}>
      {!loaded && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-stone-100 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-stone-200" />
        </div>
      )}
      {inView && imgSrc && !error ? (
        <img
          src={imgSrc} alt={alt}
          className={cn('w-full h-full object-cover transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      ) : error ? (
        fallback || <div className="w-full h-full flex items-center justify-center text-stone-300 text-4xl">🏨</div>
      ) : null}
    </div>
  )
}

// ─── EmptyState ──────────────────────────────────────────
export function EmptyState({ icon, title, description, action }: {
  icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      {icon && <div className="mb-4 text-stone-300">{icon}</div>}
      <h3 className="font-display text-lg font-semibold text-stone-700 mb-1">{title}</h3>
      {description && <p className="text-sm text-stone-400 mb-4 max-w-xs">{description}</p>}
      {action}
    </div>
  )
}

// ─── ConfirmDialog ───────────────────────────────────────
export function ConfirmDialog({ open, onClose, onConfirm, title, message, danger }: {
  open: boolean; onClose: () => void; onConfirm: () => void
  title: string; message: string; danger?: boolean
}) {
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm text-stone-600 mb-6">{message}</p>
      <div className="flex gap-3 justify-end">
        <button className="btn-secondary" onClick={onClose}>Cancelar</button>
        <button className={danger ? 'btn-danger' : 'btn-primary'} onClick={() => { onConfirm(); onClose() }}>
          Confirmar
        </button>
      </div>
    </Modal>
  )
}
