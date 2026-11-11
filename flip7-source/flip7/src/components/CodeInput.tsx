import { useRef } from 'react'
import { cn } from '../lib/labels'

interface CodeInputProps {
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  disabled?: boolean
}

export function CodeInput({ value, onChange, onSubmit, disabled }: CodeInputProps) {
  const refs = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: 5 }, (_, index) => value[index] ?? '')

  const write = (index: number, digit: string) => {
    const next = digits.slice()
    next[index] = digit
    onChange(next.join('').slice(0, 5))
  }

  return (
    <div
      className="flex items-center justify-center gap-1.5 sm:gap-2"
      onPaste={(event) => {
        const text = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 5)
        if (!text) return
        event.preventDefault()
        onChange(text)
        refs.current[Math.min(text.length, 4)]?.focus()
      }}
    >
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element
          }}
          value={digit}
          disabled={disabled}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          aria-label={`Cifra ${index + 1} del codice`}
          onChange={(event) => {
            const raw = event.target.value.replace(/\D/g, '')
            if (!raw) {
              write(index, '')
              return
            }
            write(index, raw.slice(-1))
            if (index < 4) refs.current[index + 1]?.focus()
          }}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !digits[index] && index > 0) {
              refs.current[index - 1]?.focus()
              write(index - 1, '')
            }
            if (event.key === 'Enter') onSubmit?.()
            if (event.key === 'ArrowLeft' && index > 0) refs.current[index - 1]?.focus()
            if (event.key === 'ArrowRight' && index < 4) refs.current[index + 1]?.focus()
          }}
          className={cn(
            'h-14 w-10 rounded-xl border border-white/12 bg-black/45 text-center font-mono text-2xl font-semibold text-gold-200 outline-none transition',
            'shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] sm:h-16 sm:w-12 sm:text-[26px]',
            'focus:border-gold-400/70 focus:bg-black/65 focus:ring-2 focus:ring-gold-400/20',
            disabled && 'opacity-50',
          )}
        />
      ))}
    </div>
  )
}
