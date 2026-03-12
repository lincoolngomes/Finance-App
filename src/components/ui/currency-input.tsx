
import React, { forwardRef } from 'react'
import { Input } from '/src/components/ui/input'
import { formatCurrencyInput, parseCurrency } from '/src/utils/currency'
import { cn } from '/src/lib/utils'

interface CurrencyInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: string | number
  onChange?: (value: number) => void
}

const CurrencyInput = forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ className, value, onChange, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState('')

    React.useEffect(() => {
      if (value !== undefined) {
        const numValue = typeof value === 'string' ? parseFloat(value) : value
        if (!isNaN(numValue)) {
          setDisplayValue(formatCurrencyInput((numValue * 100).toString()))
        }
      }
    }, [value])

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const inputValue = e.target.value
      const formatted = formatCurrencyInput(inputValue)
      setDisplayValue(formatted)
      
      if (onChange) {
        const numericValue = parseCurrency(formatted)
        onChange(numericValue)
      }
    }

    return (
      <Input
        {...props}
        ref={ref}
        value={displayValue}
        onChange={handleChange}
        className={cn(className)}
        placeholder="R$ 0,00"
      />
    )
  }
)

CurrencyInput.displayName = "CurrencyInput"

export { CurrencyInput }
