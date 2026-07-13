'use client'

import { useEffect, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { Modal } from '@/components/ui/Modal'
import { Input, Select } from '@/components/ui/Field'
import { useToast } from '@/components/ui/Toast'
import { addCategory, toggleCategory, type GastoState } from '@/lib/gastos/actions'
import { GROUPS, groupMeta, type ExpenseCategory } from '@/lib/gastos/types'

const initial: GastoState = {}

function AddBtn() {
  const { pending } = useFormStatus()
  return <Button type="submit" size="sm" loading={pending}><Plus className="h-4 w-4" />Agregar</Button>
}

export function CategoriesModal({
  open,
  onClose,
  categories,
}: {
  open: boolean
  onClose: () => void
  categories: ExpenseCategory[]
}) {
  const [state, action] = useFormState(addCategory, initial)
  const [grp, setGrp] = useState('produccion')
  const { toast } = useToast()

  useEffect(() => {
    if (state.ok) toast({ title: 'Categoría creada', variant: 'success' })
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast])

  return (
    <Modal open={open} onClose={onClose} title="Subcategorías de gastos" description="Un solo lugar de gestión. Agrega las que te falten o desactiva las que no uses.">
      <div className="space-y-5">
        <form action={action} className="flex flex-wrap items-end gap-2">
          <div className="flex-1"><Input id="cat-name" name="name" label="Nueva subcategoría" placeholder="Ej. Farmacia" required /></div>
          <Select id="cat-grp" name="grp" label="Grupo" value={grp} onChange={(e) => setGrp(e.target.value)}>
            {GROUPS.map((g) => <option key={g} value={g}>{groupMeta[g].short}</option>)}
          </Select>
          <AddBtn />
        </form>

        <div className="max-h-72 space-y-4 overflow-y-auto">
          {GROUPS.map((g) => {
            const inG = categories.filter((c) => c.grp === g)
            if (inG.length === 0) return null
            return (
              <div key={g}>
                <p className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{groupMeta[g].label}</p>
                <ul className="space-y-1">
                  {inG.map((c) => (
                    <li key={c.id} className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm dark:border-white/[0.08]">
                      <span className={cn(c.status === 'inactivo' && 'text-muted-foreground line-through')}>{c.name}</span>
                      <form action={toggleCategory}>
                        <input type="hidden" name="id" value={c.id} />
                        <input type="hidden" name="status" value={c.status === 'activo' ? 'inactivo' : 'activo'} />
                        <button type="submit" className={cn('text-xs font-medium', c.status === 'activo' ? 'text-muted-foreground hover:text-status-overdue' : 'text-status-ready hover:underline')}>
                          {c.status === 'activo' ? 'Desactivar' : 'Activar'}
                        </button>
                      </form>
                    </li>
                  ))}
                </ul>
              </div>
            )
          })}
        </div>

        <div className="flex justify-end"><Button variant="ghost" onClick={onClose}>Cerrar</Button></div>
      </div>
    </Modal>
  )
}
