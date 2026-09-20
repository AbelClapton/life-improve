'use client'

import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { X } from 'lucide-react'
import { updateTask } from '@/app/actions'

type EditableTask = {
  id: string
  title: string
  notes: string | null
  area_id: string | null
  priority: string | null
  due_at: string | null
  start_at: string | null
  duration_min: number | null
  recurrence: string | null
  is_reminder: boolean | null
}

type TaskEditLabels = {
  title: string
  taskTitle: string
  notes: string
  area: string
  noArea: string
  priority: string
  high: string
  medium: string
  low: string
  dueDate: string
  startTime: string
  duration: string
  recurrence: string
  none: string
  daily: string
  weekly: string
  monthly: string
  reminder: string
  close: string
  cancel: string
  save: string
  saving: string
  edit: string
  error: string
  titleRequired: string
  durationInvalid: string
  invalidDate: string
  areaNotFound: string
  taskNotFound: string
}

type AreaOption = { id: string; name: string }

function toLocalDateTime(value: string | null, timeZone: string) {
  if (!value) return ''
  const parts = new Intl.DateTimeFormat('sv-SE', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(value))
  const values = Object.fromEntries(parts.map(({ type, value: partValue }) => [type, partValue]))
  return `${values.year}-${values.month}-${values.day}T${values.hour}:${values.minute}`
}

export function TaskEditDialog({
  locale,
  task,
  areas,
  timeZone,
  labels,
}: {
  locale: string
  task: EditableTask
  areas: AreaOption[]
  timeZone: string
  labels: TaskEditLabels
}) {
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
      const result = await updateTask(locale, task.id, formData)
      if ('error' in result) {
        const errorMessages: Record<string, string> = {
          task_title_required: labels.titleRequired,
          duration_invalid: labels.durationInvalid,
          invalid_datetime: labels.invalidDate,
          area_not_found: labels.areaNotFound,
          task_not_found: labels.taskNotFound,
          unable_to_save: labels.error,
        }
        setError(errorMessages[result.error || ''] || labels.error)
        return
      }
      closeDialog()
      router.refresh()
    })
  }

  return (
    <>
      <button type="button" className="secondary-button task-edit-trigger" onClick={openDialog} aria-haspopup="dialog">
        {labels.edit}
      </button>
      <dialog ref={dialogRef} className="task-edit-dialog" aria-labelledby={`task-edit-title-${task.id}`}>
        <div className="quick-capture-header">
          <h2 id={`task-edit-title-${task.id}`} className="panel-title">{labels.title}</h2>
          <button type="button" className="icon-button" onClick={closeDialog} aria-label={labels.close}>
            <X size={18} />
          </button>
        </div>
        <form action={submit} className="task-edit-form">
          <label className="field-label" htmlFor={`task-title-${task.id}`}>{labels.taskTitle}</label>
          <input id={`task-title-${task.id}`} name="title" defaultValue={task.title} className="field-input" required />
          <label className="field-label" htmlFor={`task-notes-${task.id}`}>{labels.notes}</label>
          <textarea id={`task-notes-${task.id}`} name="notes" defaultValue={task.notes || ''} className="field-input" />
          <div className="quick-capture-grid">
            <div>
              <label className="field-label" htmlFor={`task-area-${task.id}`}>{labels.area}</label>
              <select id={`task-area-${task.id}`} name="area_id" defaultValue={task.area_id || ''} className="field-input">
                <option value="">{labels.noArea}</option>
                {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label" htmlFor={`task-priority-${task.id}`}>{labels.priority}</label>
              <select id={`task-priority-${task.id}`} name="priority" defaultValue={task.priority || 'medium'} className="field-input">
                <option value="high">{labels.high}</option>
                <option value="medium">{labels.medium}</option>
                <option value="low">{labels.low}</option>
              </select>
            </div>
          </div>
          <div className="quick-capture-grid">
            <div>
              <label className="field-label" htmlFor={`task-due-${task.id}`}>{labels.dueDate}</label>
              <input id={`task-due-${task.id}`} name="due_at" type="datetime-local" defaultValue={toLocalDateTime(task.due_at, timeZone)} className="field-input" />
            </div>
            <div>
              <label className="field-label" htmlFor={`task-start-${task.id}`}>{labels.startTime}</label>
              <input id={`task-start-${task.id}`} name="start_at" type="datetime-local" defaultValue={toLocalDateTime(task.start_at, timeZone)} className="field-input" />
            </div>
          </div>
          <div className="quick-capture-grid">
            <div>
              <label className="field-label" htmlFor={`task-duration-${task.id}`}>{labels.duration}</label>
              <input id={`task-duration-${task.id}`} name="duration_min" type="number" min="1" defaultValue={task.duration_min || ''} className="field-input" />
            </div>
            <div>
              <label className="field-label" htmlFor={`task-recurrence-${task.id}`}>{labels.recurrence}</label>
              <select id={`task-recurrence-${task.id}`} name="recurrence" defaultValue={task.recurrence || 'none'} className="field-input">
                <option value="none">{labels.none}</option>
                <option value="daily">{labels.daily}</option>
                <option value="weekly">{labels.weekly}</option>
                <option value="monthly">{labels.monthly}</option>
              </select>
            </div>
          </div>
          <label className="quick-capture-check">
            <input type="checkbox" name="is_reminder" defaultChecked={!!task.is_reminder} /> {labels.reminder}
          </label>
          {error && <p className="quick-capture-error" role="alert">{error}</p>}
          <div className="task-edit-actions">
            <button type="submit" className="primary-button" disabled={isPending}>{isPending ? labels.saving : labels.save}</button>
            <button type="button" className="secondary-button" onClick={closeDialog} disabled={isPending}>{labels.cancel}</button>
          </div>
        </form>
      </dialog>
    </>
  )
}
