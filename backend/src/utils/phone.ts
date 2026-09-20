import {
  parsePhoneNumberFromString,
  AsYouType,
  CountryCode,
  getCountryCallingCode,
} from 'libphonenumber-js'

export interface NormalizedPhone {
  country: string
  countryCode: string
  national: string
  e164: string
}

/**
 * Parses and validates an international phone number from a (raw, country) pair.
 * Throws a descriptive error when the number is invalid for the given country.
 */
export function normalizePhone(raw: string, isoCountry: string): NormalizedPhone {
  const trimmed = raw.trim().replace(/[^\d+]/g, '')
  const phone = parsePhoneNumberFromString(trimmed, isoCountry as CountryCode)
  if (!phone || !phone.isValid()) {
    throw new Error('Please enter a valid phone number for the selected country.')
  }
  return {
    country: isoCountry,
    countryCode: getCountryCallingCode(isoCountry as CountryCode).toString(),
    national: phone.nationalNumber,
    e164: phone.number,
  }
}

/**
 * Formats a partial input as the user types, within the selected country.
 */
export function formatAsYouType(raw: string, isoCountry: string): string {
  const fmt = new AsYouType(isoCountry as CountryCode)
  return fmt.input(raw) || ''
}

export const DEFAULT_COUNTRY = 'IN'
export const PHONE_COUNTRIES: Array<{ code: string; iso: string; flag: string; calling: string }> = [
  { code: 'IN', iso: 'India', flag: '🇮🇳', calling: '+91' },
  { code: 'AE', iso: 'UAE', flag: '🇦🇪', calling: '+971' },
  { code: 'GB', iso: 'United Kingdom', flag: '🇬🇧', calling: '+44' },
  { code: 'US', iso: 'USA', flag: '🇺🇸', calling: '+1' },
  { code: 'CA', iso: 'Canada', flag: '🇨🇦', calling: '+1' },
  { code: 'AU', iso: 'Australia', flag: '🇦🇺', calling: '+61' },
  { code: 'SA', iso: 'Saudi Arabia', flag: '🇸🇦', calling: '+966' },
  { code: 'QA', iso: 'Qatar', flag: '🇶🇦', calling: '+974' },
  { code: 'SG', iso: 'Singapore', flag: '🇸🇬', calling: '+65' },
  { code: 'MY', iso: 'Malaysia', flag: '🇲🇾', calling: '+60' },
  { code: 'TH', iso: 'Thailand', flag: '🇹🇭', calling: '+66' },
  { code: 'DE', iso: 'Germany', flag: '🇩🇪', calling: '+49' },
  { code: 'FR', iso: 'France', flag: '🇫🇷', calling: '+33' },
  { code: 'KR', iso: 'South Korea', flag: '🇰🇷', calling: '+82' },
  { code: 'JP', iso: 'Japan', flag: '🇯🇵', calling: '+81' },
  { code: 'ID', iso: 'Indonesia', flag: '🇮🇩', calling: '+62' },
  { code: 'PK', iso: 'Pakistan', flag: '🇵🇰', calling: '+92' },
  { code: 'BD', iso: 'Bangladesh', flag: '🇧🇩', calling: '+880' },
  { code: 'LK', iso: 'Sri Lanka', flag: '🇱🇰', calling: '+94' },
  { code: 'NP', iso: 'Nepal', flag: '🇳🇵', calling: '+977' },
  { code: 'EG', iso: 'Egypt', flag: '🇪🇬', calling: '+20' },
  { code: 'NG', iso: 'Nigeria', flag: '🇳🇬', calling: '+234' },
  { code: 'KE', iso: 'Kenya', flag: '🇰🇪', calling: '+254' },
  { code: 'BR', iso: 'Brazil', flag: '🇧🇷', calling: '+55' },
  { code: 'MX', iso: 'Mexico', flag: '🇲🇽', calling: '+52' },
]