import * as RadixToast from '@radix-ui/react-toast'
import { X } from 'lucide-react'

export function ToastProvider({ children }) {
  return (
    <RadixToast.Provider swipeDirection="right">
      {children}
      <RadixToast.Viewport className="fixed bottom-6 right-6 flex flex-col gap-2 w-80 z-[200]" />
    </RadixToast.Provider>
  )
}

export function Toast({ open, onOpenChange, title, description }) {
  return (
    <RadixToast.Root
      open={open}
      onOpenChange={onOpenChange}
      className="bg-[var(--color-bg-panel)] border border-white/[0.08] rounded-[10px] px-4 py-3 flex items-start gap-3 shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in"
    >
      <div className="flex-1">
        {title && (
          <RadixToast.Title className="text-[13px] font-semibold text-white">
            {title}
          </RadixToast.Title>
        )}
        {description && (
          <RadixToast.Description className="text-[12px] text-[var(--color-text-dim)] mt-0.5">
            {description}
          </RadixToast.Description>
        )}
      </div>
      <RadixToast.Close className="text-[var(--color-text-dim)] hover:text-white transition-colors">
        <X size={14} />
      </RadixToast.Close>
    </RadixToast.Root>
  )
}
