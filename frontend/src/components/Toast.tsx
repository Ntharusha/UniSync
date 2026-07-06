import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, AlertCircle, Info, XCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (type: ToastType, title: string, message?: string) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2);
    setToasts(prev => [...prev, { id, type, title, message }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 5000);
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    success: (title, msg) => addToast('success', title, msg),
    error: (title, msg) => addToast('error', title, msg),
    info: (title, msg) => addToast('info', title, msg),
    warning: (title, msg) => addToast('warning', title, msg),
  };

   return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast Container */}
      <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <ToastItem
              key={t.id}
              toast={t}
              onDismiss={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
            />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const icons: Record<ToastType, ReactNode> = {
    success: <CheckCircle size={20} className="text-green-500 shrink-0" />,
    error:   <XCircle    size={20} className="text-red-500 shrink-0" />,
    warning: <AlertCircle size={20} className="text-amber-500 shrink-0" />,
    info:    <Info        size={20} className="text-blue-500 shrink-0" />,
  };

  const borders: Record<ToastType, string> = {
    success: 'border-l-green-500',
    error:   'border-l-red-500',
    warning: 'border-l-amber-500',
    info:    'border-l-blue-500',
  };

   return (
    <motion.div
      layout
      initial={{ opacity: 0, x: 80, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 80, scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className={`pointer-events-auto bg-white rounded-2xl shadow-2xl border border-gray-100 border-l-4 ${borders[toast.type]} max-w-sm w-full flex items-start gap-3 p-4`}
    >
      {icons[toast.type]}
      <div className="flex-1 min-w-0">
        <p className="font-bold text-gray-900 text-sm leading-snug">{toast.title}</p>
        {toast.message && (
          <p className="text-xs text-gray-500 mt-0.5 leading-snug whitespace-pre-line">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onDismiss}
        className="shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-colors text-gray-400 hover:text-gray-700"
      >
        <X size={14} />
      </button>
    </motion.div>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}
