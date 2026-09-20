'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { postponeTask } from '@/app/actions'

export function TaskPostponeButton({ locale, taskId, label, errorLabel }: { locale: string; taskId: string; label: string; errorLabel: string }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function postpone() {
    setError(null)
    startTransition(async () => {
      const result = await postponeTask(locale, taskId)
      if ('error' in result) setError(errorLabel)
      else router.refresh()
    })
  }

  return (
    <>
      <button className="secondary-button" type="button" onClick={postpone} disabled={isPending}>{label}</button>
      {error && <span className="task-action-error" role="alert">{error}</span>}
    </>
  )
}
