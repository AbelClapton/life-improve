'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toggleTask } from '@/app/actions'

type TaskCompletionButtonProps = {
  locale: string
  taskId: string
  completed: boolean
  isTopThree?: boolean
  markDoneLabel: string
  markPendingLabel: string
  errorLabel: string
  className?: string
  children?: React.ReactNode
  content?: React.ReactNode
}

export function TaskCompletionButton({
  locale,
  taskId,
  completed,
  isTopThree = false,
  markDoneLabel,
  markPendingLabel,
  errorLabel,
  className = 'task-check',
  children,
  content,
}: TaskCompletionButtonProps) {
  const [optimisticCompleted, setOptimisticCompleted] = useState<boolean | null>(null)
  const [celebrating, setCelebrating] = useState(false)
  const [error, setError] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  const isCompleted = optimisticCompleted ?? completed

  function submit() {
    const nextCompleted = !isCompleted
    setError(false)
    setOptimisticCompleted(nextCompleted)
    if (nextCompleted && isTopThree) {
      setCelebrating(true)
      if ('vibrate' in navigator) navigator.vibrate?.(18)
      window.setTimeout(() => setCelebrating(false), 850)
    }

    startTransition(async () => {
      const result = await toggleTask(locale, taskId, nextCompleted)
      if ('error' in result) {
        setOptimisticCompleted(null)
        setCelebrating(false)
        setError(true)
        return
      }
      router.refresh()
    })
  }

  return (
    <>
      <form action={submit} className="task-completion-form">
        <button
          type="submit"
          className={`${className} ${isCompleted ? 'task-check-done' : ''}`}
          aria-label={isCompleted ? markPendingLabel : markDoneLabel}
          aria-busy={isPending}
          disabled={isPending}
        >
          {children ?? (isCompleted ? '✓' : '')}
        </button>
      </form>
      {content && <div className={`task-completion-content ${isCompleted ? 'task-completion-content-done' : ''}`}>{content}</div>}
      {celebrating && <span className="completion-confetti" aria-hidden="true">{Array.from({ length: 10 }, (_, index) => <i key={index} />)}</span>}
      {error && <span className="sr-only" role="alert">{errorLabel}</span>}
    </>
  )
}