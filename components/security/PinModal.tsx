'use client'

import { useEffect, useState } from 'react'
import { ShieldAlert } from 'lucide-react'
import { Modal } from '@/components/ui/Modal'
import { Button } from '@/components/ui/Button'
import { PinInput } from './PinInput'

/**
 * Reusable PIN confirmation modal for any sensitive action. The parent passes
 * `onConfirm(pin)` — usually a server action bound with the item id — and
 * controls `loading`/`error`. Reuse this for delete-employee today, and
 * delete/edit-caja tomorrow: just render it and wire onConfirm.
 */
export function PinModal({
  open,
  onClose,
  onConfirm,
  title = 'Confirma con tu PIN',
  description,
  actionLabel = 'Confirmar',
  loading = false,
  error,
}: {
  open: boolean
  onClose: () => void
  onConfirm: (pin: string) => void
  title?: string
  description?: string
  actionLabel?: string
  loading?: boolean
  error?: string
}) {
  const [pin, setPin] = useState('')

  useEffect(() => { if (open) setPin('') }, [open])

  const ready = /^\d{4}$/.test(pin)

  return (
    <Modal open={open} onClose={onClose} title={title} description={description}>
      <div className="space-y-5">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-status-overdue/10 text-status-overdue">
          <ShieldAlert className="h-6 w-6" />
        </div>

        <PinInput value={pin} onChange={setPin} onComplete={(v) => { if (!loading) onConfirm(v) }} disabled={loading} />

        {error && <p className="text-center text-sm font-medium text-status-overdue">{error}</p>}

        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose} disabled={loading}>Cancelar</Button>
          <Button type="button" variant="danger" loading={loading} disabled={!ready} onClick={() => onConfirm(pin)}>
            {actionLabel}
          </Button>
        </div>
      </div>
    </Modal>
  )
}
