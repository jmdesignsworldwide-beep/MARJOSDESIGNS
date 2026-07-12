'use client'

import { useEffect, useRef, useState } from 'react'
import { useFormState, useFormStatus } from 'react-dom'
import { Paperclip, Upload, FileText, Trash2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useToast } from '@/components/ui/Toast'
import { uploadAttachment, deleteAttachment, type ManageState } from '@/app/(app)/ordenes/manage-actions'
import type { Attachment } from '@/lib/ordenes/finance'

const initial: ManageState = {}

function UploadBtn() {
  const { pending } = useFormStatus()
  return (
    <Button type="submit" size="sm" loading={pending}>
      <Upload className="h-4 w-4" />
      Subir
    </Button>
  )
}

export function AttachmentsPanel({ orderId, attachments }: { orderId: string; attachments: Attachment[] }) {
  const [state, action] = useFormState(uploadAttachment, initial)
  const [fileName, setFileName] = useState('')
  const formRef = useRef<HTMLFormElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    if (state.ok) { toast({ title: 'Adjunto subido', variant: 'success' }); setFileName(''); formRef.current?.reset() }
    if (state.error) toast({ title: state.error, variant: 'error' })
  }, [state, toast])

  return (
    <div>
      <form ref={formRef} action={action} className="flex flex-wrap items-center gap-2">
        <input type="hidden" name="orderId" value={orderId} />
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-card/60 px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-gold-mid/50">
          <Paperclip className="h-4 w-4" />
          <span className="max-w-[160px] truncate">{fileName || 'Elegir archivo'}</span>
          <input
            type="file"
            name="file"
            accept="image/png,image/jpeg,image/webp,image/gif,application/pdf"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? '')}
          />
        </label>
        <UploadBtn />
        <span className="text-xs text-muted-foreground">Imágenes o PDF · máx 10 MB · privado</span>
      </form>

      {attachments.length === 0 ? (
        <p className="mt-4 rounded-xl border border-dashed border-border bg-card/40 px-3.5 py-6 text-center text-sm text-muted-foreground dark:border-white/[0.08]">
          Sin adjuntos todavía. Sube el arte o una referencia.
        </p>
      ) : (
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {attachments.map((a) => {
            const isImg = (a.mime ?? '').startsWith('image/')
            return (
              <div key={a.id} className="group relative overflow-hidden rounded-xl border border-border bg-muted/40 dark:border-white/[0.08]">
                <a href={a.url ?? '#'} target="_blank" rel="noopener noreferrer" className="block aspect-square">
                  {isImg && a.url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.url} alt={a.filename} className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-muted-foreground">
                      <FileText className="h-8 w-8" />
                      <span className="px-2 text-center text-[10px]">PDF</span>
                    </div>
                  )}
                </a>
                {/* Actions over the thumbnail need a contrasting scrim */}
                <div className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                  <span className="pointer-events-auto max-w-[70%] truncate text-[10px] font-medium text-white/90">{a.filename}</span>
                  <div className="pointer-events-auto flex gap-1">
                    <a href={a.url ?? '#'} target="_blank" rel="noopener noreferrer" title="Abrir" className="grid h-6 w-6 place-items-center rounded-md bg-white/15 text-white backdrop-blur-sm hover:bg-white/25">
                      <ExternalLink className="h-3 w-3" />
                    </a>
                    <form action={deleteAttachment}>
                      <input type="hidden" name="id" value={a.id} />
                      <input type="hidden" name="orderId" value={orderId} />
                      <button type="submit" title="Eliminar" className="grid h-6 w-6 place-items-center rounded-md bg-white/15 text-white backdrop-blur-sm hover:bg-status-overdue">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
