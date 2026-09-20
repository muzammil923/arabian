import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { CornerDownLeft, Delete, Keyboard, X } from 'lucide-react'
import { cn } from '../lib/cn'

interface KeyboardContextValue {
  enabled: boolean
  setEnabled: (value: boolean) => void
}

const KeyboardContext = createContext<KeyboardContextValue | null>(null)

export function useKeyboard(): KeyboardContextValue {
  const ctx = useContext(KeyboardContext)
  if (!ctx) throw new Error('useKeyboard must be used within a KeyboardProvider')
  return ctx
}

export function KeyboardProvider({ children }: { children: ReactNode }) {
  const [enabled, setEnabledState] = useState(() => {
    if (typeof localStorage === 'undefined') return false
    return localStorage.getItem('pos.keyboard') === '1'
  })

  const setEnabled = useCallback((value: boolean) => {
    setEnabledState(value)
    try {
      localStorage.setItem('pos.keyboard', value ? '1' : '0')
    } catch {
      /* storage unavailable */
    }
  }, [])

  const value = useMemo(() => ({ enabled, setEnabled }), [enabled, setEnabled])

  return (
    <KeyboardContext.Provider value={value}>
      {children}
      <OnScreenKeyboard />
    </KeyboardContext.Provider>
  )
}

function isEditable(el: Element | null): el is HTMLInputElement | HTMLTextAreaElement {
  return (
    el instanceof HTMLInputElement ||
    el instanceof HTMLTextAreaElement ||
    (el instanceof HTMLElement && el.isContentEditable)
  )
}

function insertAtCursor(el: HTMLInputElement | HTMLTextAreaElement, text: string) {
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? start
  el.setRangeText(text, start, end, 'end')
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.focus()
}

function backspaceAtCursor(el: HTMLInputElement | HTMLTextAreaElement) {
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? start
  if (start !== end) {
    el.setRangeText('', start, end, 'end')
  } else if (start > 0) {
    el.setRangeText('', start - 1, start, 'end')
  }
  el.dispatchEvent(new Event('input', { bubbles: true }))
  el.focus()
}

const LETTER_ROWS = ['QWERTYUIOP', 'ASDFGHJKL', 'ZXCVBNM']
const DIGIT_ROW = '1234567890'

function OnScreenKeyboard() {
  const { enabled, setEnabled } = useKeyboard()
  const [pending, setPending] = useState('')

  useEffect(() => {
    if (!enabled) return
    const onFocus = (event: FocusEvent) => {
      const target = event.target as Element | null
      if (!pending) return
      if (!isEditable(target)) return
      insertAtCursor(target, pending)
      setPending('')
    }
    window.addEventListener('focusin', onFocus)
    return () => window.removeEventListener('focusin', onFocus)
  }, [enabled, pending])

  if (!enabled) return null

  const press = (text: string) => {
    const el = document.activeElement
    if (isEditable(el)) {
      insertAtCursor(el, text)
    } else if (text.trim()) {
      setPending((prev) => prev + text)
    }
  }

  const handleBackspace = () => {
    const el = document.activeElement
    if (isEditable(el)) {
      backspaceAtCursor(el)
    } else {
      setPending((prev) => prev.slice(0, -1))
    }
  }

  const handleEnter = () => {
    const el = document.activeElement
    if (isEditable(el)) el.blur()
    else setPending('')
  }

  const Key = ({ label, wide, onPress }: { label: string; wide?: boolean; onPress?: () => void }) => (
    <button
      type="button"
      onPointerDown={(event) => event.preventDefault()}
      onClick={() => {
        if (onPress) onPress()
        else press(label)
      }}
      className={cn(
        'flex h-11 items-center justify-center rounded-lg text-sm font-semibold text-slate-800 shadow-sm transition active:scale-95',
        'bg-white ring-1 ring-inset ring-slate-300 hover:bg-slate-50',
        wide && 'flex-[2.4]',
      )}
    >
      {label}
    </button>
  )

  return (
    <div className="no-print fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-slate-100 px-2 pb-2 pt-1 shadow-[0_-8px_24px_rgba(15,23,42,0.12)]">
      {pending ? (
        <div className="mb-1 text-center text-xs font-medium text-brand-700">
          Next: “{pending}” — tap a field to receive it
        </div>
      ) : null}
      <div className="mx-auto flex max-w-3xl flex-col gap-1.5">
        {LETTER_ROWS.map((row) => (
          <div key={row} className="flex gap-1.5">
            {row.split('').map((ch) => (
              <Key key={ch} label={ch} />
            ))}
          </div>
        ))}
        <div className="flex gap-1.5">
          {DIGIT_ROW.split('').map((ch) => (
            <Key key={ch} label={ch} />
          ))}
        </div>
        <div className="flex gap-1.5">
          <Key label="Space" wide onPress={() => press(' ')} />
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={handleBackspace}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 transition active:scale-95"
          >
            <Delete className="h-4 w-4" /> Backspace
          </button>
          <button
            type="button"
            onClick={handleEnter}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-brand-600 text-sm font-semibold text-white shadow-sm transition active:scale-95"
          >
            <CornerDownLeft className="h-4 w-4" /> Done
          </button>
          <button
            type="button"
            onClick={() => {
              setPending('')
              setEnabled(false)
            }}
            className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-lg bg-slate-900 text-sm font-semibold text-white shadow-sm transition active:scale-95"
          >
            <X className="h-4 w-4" /> Close
          </button>
        </div>
      </div>
      <div className="mt-1 flex items-center justify-center gap-1 text-[11px] text-slate-500">
        <Keyboard className="h-3 w-3" /> On-screen keyboard active
      </div>
    </div>
  )
}