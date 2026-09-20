import { useEffect, useState } from 'react'
import { Save, Store } from 'lucide-react'
import {
  useBranches,
  useCreateBranch,
  useSettings,
  useUpdateBranch,
  useUpdateSettings,
} from '../hooks/queries'
import { fromMinor, parseMoneyInput } from '../lib/format'
import { countryOptions } from '../lib/phone'
import { Button, Card, CardHeader, EmptyState, ErrorBlock, Field, Input, LoadingBlock, Modal, PageHeader, Select, Textarea } from '../components/ui'
import { Badge } from '../components/ui'
import { useToast } from '../components/toast'

interface BusinessForm {
  name: string
  address: string
  phone_e164: string
  currency: string
  tax_name: string
  tax_percent: string
  default_calling_country: string
  timezone: string
}

interface SettingsForm {
  order_prefix: string
  invoice_prefix: string
  order_number_min_digits: string
  receipt_footer: string
  expected_turnaround_hours: string
  delivery_charge: string
  pickup_enabled: boolean
  delivery_enabled: boolean
  enable_prepaid_checkout: boolean
  whatsapp_notes: string
}

export function SettingsPage() {
  const toast = useToast()
  const { data, isLoading, isError, error, refetch } = useSettings()
  const updateSettings = useUpdateSettings()
  const { data: branches } = useBranches(true)
  const createBranch = useCreateBranch()
  const updateBranch = useUpdateBranch()

  const [business, setBusiness] = useState<BusinessForm | null>(null)
  const [form, setForm] = useState<SettingsForm | null>(null)
  const [branchOpen, setBranchOpen] = useState(false)
  const [branchName, setBranchName] = useState('')
  const [branchAddress, setBranchAddress] = useState('')
  const [branchPhone, setBranchPhone] = useState('')

  useEffect(() => {
    if (!data) return
    setBusiness({
      name: data.business.name,
      address: data.business.address ?? '',
      phone_e164: data.business.phone_e164 ?? '',
      currency: data.business.currency,
      tax_name: data.business.tax_name,
      tax_percent: String(data.business.tax_bp / 100),
      default_calling_country: data.business.default_calling_country,
      timezone: data.business.timezone,
    })
    setForm({
      order_prefix: data.settings.order_prefix,
      invoice_prefix: data.settings.invoice_prefix,
      order_number_min_digits: String(data.settings.order_number_min_digits),
      receipt_footer: data.settings.receipt_footer,
      expected_turnaround_hours: String(data.settings.expected_turnaround_hours),
      delivery_charge: String(fromMinor(data.settings.delivery_charge_minor)),
      pickup_enabled: data.settings.pickup_enabled === 1,
      delivery_enabled: data.settings.delivery_enabled === 1,
      enable_prepaid_checkout: data.settings.enable_prepaid_checkout === 1,
      whatsapp_notes: data.settings.whatsapp_notes ?? '',
    })
  }, [data])

  if (isLoading || !business || !form) return <LoadingBlock />
  if (isError) return <ErrorBlock message={(error as Error)?.message ?? 'Failed to load settings.'} onRetry={() => void refetch()} />

  const save = async () => {
    try {
      await updateSettings.mutateAsync({
        business: {
          name: business.name,
          address: business.address || null,
          phone_e164: business.phone_e164 || null,
          currency: business.currency,
          tax_name: business.tax_name,
          tax_bp: Math.round((Number(business.tax_percent) || 0) * 100),
          default_calling_country: business.default_calling_country,
          timezone: business.timezone,
        },
        settings: {
          order_prefix: form.order_prefix,
          invoice_prefix: form.invoice_prefix,
          order_number_min_digits: Number(form.order_number_min_digits) || 4,
          receipt_footer: form.receipt_footer,
          expected_turnaround_hours: Number(form.expected_turnaround_hours) || 48,
          delivery_charge_minor: parseMoneyInput(form.delivery_charge) ?? 0,
          pickup_enabled: form.pickup_enabled,
          delivery_enabled: form.delivery_enabled,
          enable_prepaid_checkout: form.enable_prepaid_checkout,
          whatsapp_notes: form.whatsapp_notes || null,
        },
      })
      toast.success('Settings saved.')
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not save settings.')
    }
  }

  const addBranch = async () => {
    if (!branchName.trim()) return toast.error('Enter a branch name.')
    try {
      await createBranch.mutateAsync({
        name: branchName.trim(),
        address: branchAddress || null,
        phone_e164: branchPhone || null,
      })
      toast.success('Branch added.')
      setBranchOpen(false)
      setBranchName('')
      setBranchAddress('')
      setBranchPhone('')
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not add branch.')
    }
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Settings"
        subtitle="Business profile, billing and branches"
        action={
          <Button loading={updateSettings.isPending} onClick={save}>
            <Save className="h-4 w-4" /> Save changes
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Business profile" />
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            <Field label="Business name" className="sm:col-span-2">
              <Input value={business.name} onChange={(e) => setBusiness({ ...business, name: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={business.phone_e164} onChange={(e) => setBusiness({ ...business, phone_e164: e.target.value })} />
            </Field>
            <Field label="Timezone">
              <Input value={business.timezone} onChange={(e) => setBusiness({ ...business, timezone: e.target.value })} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea value={business.address} onChange={(e) => setBusiness({ ...business, address: e.target.value })} />
            </Field>
            <Field label="Currency">
              <Input value={business.currency} onChange={(e) => setBusiness({ ...business, currency: e.target.value.toUpperCase() })} maxLength={3} />
            </Field>
            <Field label="Default calling country">
              <Select
                value={business.default_calling_country}
                onChange={(e) => setBusiness({ ...business, default_calling_country: e.target.value })}
              >
                {countryOptions().map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tax name">
              <Input value={business.tax_name} onChange={(e) => setBusiness({ ...business, tax_name: e.target.value })} />
            </Field>
            <Field label="Tax percent">
              <Input
                value={business.tax_percent}
                inputMode="decimal"
                onChange={(e) => setBusiness({ ...business, tax_percent: e.target.value })}
              />
            </Field>
          </div>
        </Card>

        <Card>
          <CardHeader title="Billing & operations" />
          <div className="grid gap-3 p-4 sm:grid-cols-2 sm:p-5">
            <Field label="Order prefix">
              <Input value={form.order_prefix} onChange={(e) => setForm({ ...form, order_prefix: e.target.value })} />
            </Field>
            <Field label="Invoice prefix">
              <Input value={form.invoice_prefix} onChange={(e) => setForm({ ...form, invoice_prefix: e.target.value })} />
            </Field>
            <Field label="Min digits">
              <Input value={form.order_number_min_digits} inputMode="numeric" onChange={(e) => setForm({ ...form, order_number_min_digits: e.target.value })} />
            </Field>
            <Field label="Turnaround (hours)">
              <Input value={form.expected_turnaround_hours} inputMode="numeric" onChange={(e) => setForm({ ...form, expected_turnaround_hours: e.target.value })} />
            </Field>
            <Field label="Delivery charge">
              <Input value={form.delivery_charge} inputMode="decimal" onChange={(e) => setForm({ ...form, delivery_charge: e.target.value })} />
            </Field>
            <Field label="WhatsApp notes" className="sm:col-span-2">
              <Input value={form.whatsapp_notes} onChange={(e) => setForm({ ...form, whatsapp_notes: e.target.value })} />
            </Field>
            <Field label="Receipt footer" className="sm:col-span-2">
              <Textarea value={form.receipt_footer} onChange={(e) => setForm({ ...form, receipt_footer: e.target.value })} />
            </Field>
            <div className="space-y-2 sm:col-span-2">
              <Toggle label="Enable pickups" checked={form.pickup_enabled} onChange={(v) => setForm({ ...form, pickup_enabled: v })} />
              <Toggle label="Enable deliveries" checked={form.delivery_enabled} onChange={(v) => setForm({ ...form, delivery_enabled: v })} />
              <Toggle label="Enable prepaid checkout" checked={form.enable_prepaid_checkout} onChange={(v) => setForm({ ...form, enable_prepaid_checkout: v })} />
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title="Branches"
          action={
            <Button size="sm" variant="secondary" onClick={() => setBranchOpen(true)}>
              <Store className="h-4 w-4" /> Add branch
            </Button>
          }
        />
        {(branches ?? []).length === 0 ? (
          <EmptyState title="No branches" description="Add branches to organise orders and staff." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {(branches ?? []).map((branch) => (
              <li key={branch.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">{branch.name}</p>
                    {!branch.is_active ? <Badge>Disabled</Badge> : null}
                  </div>
                  <p className="text-xs text-slate-500">
                    {[branch.address, branch.phone_e164].filter(Boolean).join(' · ') || 'No details'}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() =>
                    updateBranch.mutate(
                      { id: branch.id, input: { is_active: branch.is_active ? 0 : 1 } },
                      { onSuccess: () => toast.success('Updated.'), onError: (err) => toast.error(err.message) },
                    )
                  }
                >
                  {branch.is_active ? 'Disable' : 'Enable'}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal
        open={branchOpen}
        onClose={() => setBranchOpen(false)}
        title="Add branch"
        footer={
          <>
            <Button variant="secondary" onClick={() => setBranchOpen(false)}>
              Cancel
            </Button>
            <Button loading={createBranch.isPending} onClick={addBranch}>
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Name" required>
            <Input value={branchName} onChange={(e) => setBranchName(e.target.value)} autoFocus />
          </Field>
          <Field label="Address">
            <Input value={branchAddress} onChange={(e) => setBranchAddress(e.target.value)} />
          </Field>
          <Field label="Phone">
            <Input value={branchPhone} onChange={(e) => setBranchPhone(e.target.value)} />
          </Field>
        </div>
      </Modal>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700">
      {label}
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
      />
    </label>
  )
}
