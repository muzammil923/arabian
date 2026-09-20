import { Field, Input, Select } from './ui'
import { countryOptions } from '../lib/phone'
import type { AddressSnapshot } from '../types/api'

export function AddressFields({
  value,
  onChange,
  includeLabel = true,
}: {
  value: AddressSnapshot
  onChange: (next: AddressSnapshot) => void
  includeLabel?: boolean
}) {
  const update = (patch: Partial<AddressSnapshot>) => onChange({ ...value, ...patch })

  return (
    <div className="space-y-3">
      {includeLabel ? (
        <Field label="Label">
          <Input value={value.label ?? 'Home'} onChange={(e) => update({ label: e.target.value })} placeholder="Home, Office…" />
        </Field>
      ) : null}
      <Field label="Address line 1" required>
        <Input
          value={value.address_line_1 ?? ''}
          onChange={(e) => update({ address_line_1: e.target.value })}
          placeholder="Street, building"
        />
      </Field>
      <Field label="Address line 2">
        <Input
          value={value.address_line_2 ?? ''}
          onChange={(e) => update({ address_line_2: e.target.value })}
          placeholder="Apartment, floor"
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Landmark">
          <Input value={value.landmark ?? ''} onChange={(e) => update({ landmark: e.target.value })} />
        </Field>
        <Field label="City">
          <Input value={value.city ?? ''} onChange={(e) => update({ city: e.target.value })} />
        </Field>
        <Field label="State / Region">
          <Input value={value.state_region ?? ''} onChange={(e) => update({ state_region: e.target.value })} />
        </Field>
        <Field label="Postal code">
          <Input value={value.postal_code ?? ''} onChange={(e) => update({ postal_code: e.target.value })} />
        </Field>
      </div>
      <Field label="Country">
        <Select value={value.country_code ?? 'IN'} onChange={(e) => update({ country_code: e.target.value })}>
          {countryOptions().map((c) => (
            <option key={c.code} value={c.code}>
              {c.flag} {c.name}
            </option>
          ))}
        </Select>
      </Field>
    </div>
  )
}
