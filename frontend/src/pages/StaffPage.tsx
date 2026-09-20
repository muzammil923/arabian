import { useState } from 'react'
import { Trash2, UserPlus } from 'lucide-react'
import {
  useBranches,
  useCreateStaff,
  useDeleteStaff,
  useStaff,
  useUpdateStaff,
} from '../hooks/queries'
import { ROLES } from '../lib/constants'
import { formatDateTime } from '../lib/format'
import { formatPhoneDisplay } from '../lib/phone'
import { Badge, Button, Card, EmptyState, ErrorBlock, Field, Input, LoadingBlock, Modal, PageHeader, Select } from '../components/ui'
import { useToast } from '../components/toast'
import type { Role } from '../types/api'

export function StaffPage() {
  const toast = useToast()
  const { data: staff, isLoading, isError, error, refetch } = useStaff(true)
  const { data: branches } = useBranches(true)
  const createStaff = useCreateStaff()
  const updateStaff = useUpdateStaff()
  const deleteStaff = useDeleteStaff()

  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<Role>('STAFF')
  const [branchId, setBranchId] = useState('')

  const reset = () => {
    setName('')
    setEmail('')
    setPassword('')
    setRole('STAFF')
    setBranchId('')
  }

  const submit = async () => {
    if (!name.trim() || !email.trim() || password.length < 8) {
      return toast.error('Enter a name, email and a password of at least 8 characters.')
    }
    try {
      await createStaff.mutateAsync({
        name: name.trim(),
        email: email.trim(),
        password,
        role,
        branch_id: branchId || null,
      })
      toast.success('Staff member added.')
      setOpen(false)
      reset()
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not add staff.')
    }
  }

  const remove = async (id: string) => {
    try {
      await deleteStaff.mutateAsync(id)
      toast.success('Staff member removed.')
    } catch (err) {
      toast.error((err as { message?: string }).message ?? 'Could not remove staff.')
    }
  }

  const rows = staff ?? []

  return (
    <div className="space-y-4">
      <PageHeader
        title="Staff"
        subtitle={staff ? `${rows.length} member(s)` : undefined}
        action={
          <Button onClick={() => setOpen(true)}>
            <UserPlus className="h-4 w-4" /> Add staff
          </Button>
        }
      />

      {isLoading ? (
        <LoadingBlock />
      ) : isError ? (
        <ErrorBlock message={(error as Error)?.message ?? 'Failed to load staff.'} onRetry={() => void refetch()} />
      ) : rows.length === 0 ? (
        <Card>
          <EmptyState title="No staff" description="Add team members to assign orders and logins." />
        </Card>
      ) : (
        <Card>
          <ul className="divide-y divide-slate-100">
            {rows.map((member) => (
              <li key={member.business_user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-800">{member.name}</p>
                    <Badge className={member.is_active ? undefined : 'bg-slate-100 text-slate-400'}>{member.role}</Badge>
                    {!member.is_active ? <Badge>Disabled</Badge> : null}
                  </div>
                  <p className="truncate text-sm text-slate-500">{member.email}</p>
                  <p className="text-xs text-slate-400">
                    {member.phone_e164 ? `${formatPhoneDisplay(member.phone_e164)} · ` : ''}
                    Joined {formatDateTime(member.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Select
                    value={member.role}
                    onChange={(e) =>
                      updateStaff.mutate(
                        { id: member.user_id, input: { role: e.target.value } },
                        { onError: (err) => toast.error(err.message), onSuccess: () => toast.success('Role updated.') },
                      )
                    }
                    className="w-32"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </Select>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() =>
                      updateStaff.mutate(
                        { id: member.user_id, input: { is_active: member.is_active ? 0 : 1 } },
                        { onSuccess: () => toast.success('Updated.'), onError: (err) => toast.error(err.message) },
                      )
                    }
                  >
                    {member.is_active ? 'Disable' : 'Enable'}
                  </Button>
                  <Button variant="ghost" size="icon" aria-label="Remove" onClick={() => remove(member.user_id)}>
                    <Trash2 className="h-4 w-4 text-slate-400" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Add staff member"
        footer={
          <>
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button loading={createStaff.isPending} onClick={submit}>
              Add
            </Button>
          </>
        }
      >
        <div className="space-y-3">
          <Field label="Name" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </Field>
          <Field label="Email" required>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </Field>
          <Field label="Temporary password" required hint="At least 8 characters.">
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Role">
              <Select value={role} onChange={(e) => setRole(e.target.value as Role)}>
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Branch">
              <Select value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">No branch</option>
                {(branches ?? []).map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </div>
      </Modal>
    </div>
  )
}
