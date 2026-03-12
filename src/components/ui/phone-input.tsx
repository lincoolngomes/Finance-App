
import React, { forwardRef } from 'react'
import { Input } from '/src/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '/src/components/ui/select'
import { useCountries, Country } from '/src/hooks/useCountries'
import { cn } from '/src/lib/utils'

interface PhoneInputProps extends Omit<React.ComponentProps<"input">, "onChange" | "value"> {
  value?: string
  countryCode?: string
  onValueChange?: (phone: string) => void
  onCountryChange?: (country: string) => void
}

const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(
  ({ className, value, countryCode = '+55', onValueChange, onCountryChange, ...props }, ref) => {
    const { countries } = useCountries()

    const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const phoneValue = e.target.value.replace(/\D/g, '')
      onValueChange?.(phoneValue)
    }

    const formatPhoneDisplay = (phone: string) => {
      const numbers = phone.replace(/\D/g, '')
      if (countryCode === '+55') {
        // Formato brasileiro
        if (numbers.length <= 10) {
          return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3')
        } else {
          return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3')
        }
      }
      return numbers
    }

    return (
      <div className="flex">
        <Select value={countryCode} onValueChange={onCountryChange}>
          <SelectTrigger className="w-[120px] rounded-r-none border-r-0">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {countries.map((country) => (
              <SelectItem key={country.code} value={country.dialCode}>
                <div className="flex items-center gap-2">
                  <span>{country.flag}</span>
                  <span>{country.dialCode}</span>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          {...props}
          ref={ref}
          value={formatPhoneDisplay(value || '')}
          onChange={handlePhoneChange}
          className={cn("rounded-l-none", className)}
          placeholder="(11) 99999-9999"
        />
      </div>
    )
  }
)

PhoneInput.displayName = "PhoneInput"

export { PhoneInput }
