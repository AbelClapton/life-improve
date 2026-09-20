'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CirclePlus, X } from 'lucide-react'
import { createTask } from '@/app/actions'

type QuickCaptureLabels = {
  title: string
  close: string
  date: string
  priority: string
  priorityHigh: string
  priorityMedium: string
  priorityLow: string
  topThree: string
  topThreeLimit: string
  titleRequired: string
  durationInvalid: string
  invalidDate: string
  areaNotFound: string
  saving: string
  save: string
  unableToSave: string
}

export function QuickCapture({ locale, label, labels }: { locale: string; label: string; labels: QuickCaptureLabels }) {
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
        const messages: Record<string, string> = {
          task_title_required: labels.titleRequired,
          duration_invalid: labels.durationInvalid,
          invalid_datetime: labels.invalidDate,
          area_not_found: labels.areaNotFound,
          top_three_limit: labels.topThreeLimit,
          unable_to_save: labels.unableToSave,
        }
        setError(messages[result.error || ''] || labels.unableToSave)
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
          <button className="icon-button" onClick={closeDialog} aria-label={labels.close}><X size={18} /></button>
        </div>
        <form action={submit} className="quick-capture-form">
          <label className="field-label" htmlFor="quick-title">{labels.title}</label>
          <input id="quick-title" name="title" className="field-input" required autoFocus />
          <div className="quick-capture-grid">
            <div>
              <label className="field-label" htmlFor="quick-due">{labels.date}</label>
              <input id="quick-due" name="due_at" type="datetime-local" className="field-input" />
            </div>
            <div>
              <label className="field-label" htmlFor="quick-priority">{labels.priority}</label>
              <select id="quick-priority" name="priority" className="field-input" defaultValue="medium">
                <option value="high">{labels.priorityHigh}</option>
                <option value="medium">{labels.priorityMedium}</option>
                <option value="low">{labels.priorityLow}</option>
              </select>
            </div>
          </div>
          <label className="quick-capture-check">
            <input type="checkbox" name="is_top_three" /> {labels.topThree}
          </label>
          {error && <p className="quick-capture-error" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={isPending}>
            {isPending ? labels.saving : labels.save}
          </button>
        </form>
      </dialog>
    </>
  )
}