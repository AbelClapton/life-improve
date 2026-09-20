'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { postponeTask } from '@/app/actions'

export function TaskPostponeButton({ locale, taskId, defaultDate, label, dateLabel, errorLabel }: { locale: string; taskId: string; defaultDate: string; label: string; dateLabel: string; errorLabel: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [date, setDate] = useState(defaultDate)
  const [error, setError] = useState<string | null>(null)

  function postpone() {
    if (!date) return
    setError(null)
    startTransition(async () => {
      const result = await postponeTask(locale, taskId, date)
      if ('error' in result) setError(errorLabel)
      else router.refresh()
    })
  }

  return (
    <>
      <label className="sr-only" htmlFor={`postpone-date-${taskId}`}>{dateLabel}</label>
      <input id={`postpone-date-${taskId}`} className="field-input task-date-input" type="date" min={defaultDate} value={date} onChange={(event) => setDate(event.target.value)} disabled={isPending} />
      <button className="secondary-button" type="button" onClick={postpone} disabled={isPending || !date}>{label}</button>
      {error && <span className="task-action-error" role="alert">{error}</span>}
    </>
  )
}
