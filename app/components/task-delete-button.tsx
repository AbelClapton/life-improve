'use client'

import { deleteTask } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

export function TaskDeleteButton({ locale, taskId, label, confirmLabel, errorLabel }: { locale: string; taskId: string; label: string; confirmLabel: string; errorLabel: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState(false)

  function removeTask() {
    if (!window.confirm(confirmLabel)) return
    setError(false)
    startTransition(async () => {
      const result = await deleteTask(locale, taskId)
      if ('error' in result) setError(true)
      else router.refresh()
    })
  }

  return (
    <>
      <button className="danger-action" type="button" onClick={removeTask} disabled={isPending}>
        {label}
      </button>
      {error && <span className="task-action-error" role="alert">{errorLabel}</span>}
    </>
  )
}
