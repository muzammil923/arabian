import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
  type CountryCode,
} from 'libphonenumber-js'

export interface CountryOption {
  code: CountryCode
  name: string
  dial: string
  flag: string
}

function flagEmoji(code: string): string {
  return code
    .toUpperCase()
    .replace(/./g, (char) => String.fromCodePoint(127397 + char.charCodeAt(0)))
}

let cached: CountryOption[] | null = null

export function countryOptions(): CountryOption[] {
  if (cached) return cached
  const display = typeof Intl !== 'undefined' && 'DisplayNames' in Intl
    ? new Intl.DisplayNames(['en'], { type: 'region' })
    : null
  cached = getCountries()
    .map((code) => ({
      code,
      name: display?.of(code) ?? code,
      dial: `+${getCountryCallingCode(code)}`,
      flag: flagEmoji(code),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
  return cached
}

export function countryByCode(code: string): CountryOption | undefined {
  return countryOptions().find((c) => c.code === code)
}

export function validatePhone(raw: string, country: CountryCode) {
  const parsed = parsePhoneNumberFromString(raw, country)
  if (!parsed || !parsed.isValid()) return null
  return {
    e164: parsed.number,
    national: parsed.nationalNumber,
    country: parsed.country ?? country,
    countryCode: `+${parsed.countryCallingCode}`,
  }
}

export function formatPhoneDisplay(e164: string | null | undefined): string {
  if (!e164) return '—'
  const parsed = parsePhoneNumberFromString(e164)
  return parsed ? parsed.formatInternational() : e164
}

export function whatsappLink(phone: string, message?: string): string {
  const digits = phone.replace(/[^0-9]/g, '')
  const params = message ? `?text=${encodeURIComponent(message)}` : ''
  return `https://wa.me/${digits}${params}`
}
