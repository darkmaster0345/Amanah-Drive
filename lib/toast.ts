// Simple client-side toast notification system
type ToastType = 'success' | 'error' | 'info' | 'warning'

interface ToastMessage {
  id: string
  type: ToastType
  message: string
}

// In-memory storage for toast messages
let toasts: ToastMessage[] = []
let listeners: Array<(toasts: ToastMessage[]) => void> = []

export function subscribe(listener: (toasts: ToastMessage[]) => void) {
  listeners.push(listener)
  return () => {
    listeners = listeners.filter(l => l !== listener)
  }
}

function notify() {
  listeners.forEach(listener => listener([...toasts]))
}

function createToast(type: ToastType, message: string) {
  const id = Math.random().toString(36).substr(2, 9)
  const toast: ToastMessage = { id, type, message }
  
  toasts.push(toast)
  notify()
  
  // Auto-remove after 4 seconds
  setTimeout(() => {
    toasts = toasts.filter(t => t.id !== id)
    notify()
  }, 4000)
}

export const toast = {
  success: (message: string) => createToast('success', message),
  error: (message: string) => createToast('error', message),
  info: (message: string) => createToast('info', message),
  warning: (message: string) => createToast('warning', message),
}
