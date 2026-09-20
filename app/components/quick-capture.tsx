'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CirclePlus, X } from 'lucide-react'
import { createTask } from '@/app/actions'

export function QuickCapture({ locale, label }: { locale: string; label: string }) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  function openDialog() {
    setError(null)
    dialogRef.current?.showModal()
  }

  function closeDialog() {
    dialogRef.current?.close()
  }

  function submit(formData: FormData) {
    setError(null)
    startTransition(async () => {
      const result = await createTask(locale, formData)
      if ('error' in result) {
        setError(result.error ?? 'Unable to save the task.')
        return
      }
      closeDialog()
      router.refresh()
    })
  }

  return (
    <>
      <button className="quick-capture-button" onClick={openDialog} aria-label={label} title={label}>
        <CirclePlus size={24} />
      </button>
      <dialog ref={dialogRef} className="quick-capture-dialog">
        <div className="quick-capture-header">
          <h2 className="panel-title">{label}</h2>
          <button className="icon-button" onClick={closeDialog} aria-label="Close"><X size={18} /></button>
        </div>
        <form action={submit} className="quick-capture-form">
          <label className="field-label" htmlFor="quick-title">Title</label>
          <input id="quick-title" name="title" className="field-input" required autoFocus />
          <div className="quick-capture-grid">
            <div>
              <label className="field-label" htmlFor="quick-due">Date and time</label>
              <input id="quick-due" name="due_at" type="datetime-local" className="field-input" />
            </div>
            <div>
              <label className="field-label" htmlFor="quick-priority">Priority</label>
              <select id="quick-priority" name="priority" className="field-input" defaultValue="medium">
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>
          <label className="quick-capture-check">
            <input type="checkbox" name="is_top_three" /> Add to Top 3
          </label>
          {error && <p className="quick-capture-error">{error}</p>}
          <button className="primary-button" type="submit" disabled={isPending}>
            {isPending ? 'Saving...' : 'Save task'}
          </button>
        </form>
      </dialog>
    </>
  )
}