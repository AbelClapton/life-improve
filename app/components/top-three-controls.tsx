'use client'

import { useState, useTransition } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { moveTaskTopThree, setTaskTopThree } from '@/app/actions'

type TopThreeControlsProps = {
  locale: string
  taskId: string
  selected: boolean
  position: number | null
  addLabel: string
  removeLabel: string
  moveUpLabel: string
  moveDownLabel: string
  limitError: string
}

export function TopThreeControls({
  locale,
  taskId,
  selected,
  position,
  addLabel,
  removeLabel,
  moveUpLabel,
  moveDownLabel,
  limitError,
}: TopThreeControlsProps) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  function run(action: () => Promise<{ success?: boolean; error?: string }>) {
    setError(null)
    startTransition(async () => {
      const result = await action()
      if (result.error) setError(result.error === 'You can only choose three top priorities.' ? limitError : result.error)
    })
  }

  return (
    <div className="task-actions">
      {selected && (
        <>
          <button type="button" className="icon-button" disabled={isPending || position === 1} onClick={() => run(() => moveTaskTopThree(locale, taskId, 'up'))} aria-label={moveUpLabel} title={moveUpLabel}>
            <ArrowUp size={16} />
          </button>
          <button type="button" className="icon-button" disabled={isPending || position === 3} onClick={() => run(() => moveTaskTopThree(locale, taskId, 'down'))} aria-label={moveDownLabel} title={moveDownLabel}>
            <ArrowDown size={16} />
          </button>
        </>
      )}
      <button type="button" className={selected ? 'secondary-button' : 'icon-text-button'} disabled={isPending} onClick={() => run(() => setTaskTopThree(locale, taskId, !selected))}>
        {selected ? removeLabel : addLabel}
      </button>
      {error && <span className="task-action-error" role="alert">{error}</span>}
    </div>
  )
}