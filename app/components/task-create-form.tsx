'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createTask } from '@/app/actions'

type TaskCreateLabels = {
  title: string
  titlePlaceholder: string
  dueDate: string
  description: string
  descriptionPlaceholder: string
  area: string
  noArea: string
  priority: string
  high: string
  medium: string
  low: string
  startTime: string
  duration: string
  recurrence: string
  none: string
  daily: string
  weekly: string
  monthly: string
  topThree: string
  reminder: string
  submit: string
  saving: string
  error: string
  titleRequired: string
  durationInvalid: string
  invalidDate: string
  areaNotFound: string
  topThreeLimit: string
}

type AreaOption = { id: string; name: string }

export function TaskCreateForm({ locale, areas, initialDueAt, labels }: { locale: string; areas: AreaOption[]; initialDueAt: string; labels: TaskCreateLabels }) {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

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
          unable_to_save: labels.error,
        }
        setError(messages[result.error || ''] || labels.error)
      } else {
        router.refresh()
      }
    })
  }

  return (
    <form action={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div className="space-y-2">
        <label className="field-label" htmlFor="create-task-title">{labels.title}</label>
        <input id="create-task-title" name="title" required className="field-input" placeholder={labels.titlePlaceholder} />
      </div>
      <div className="space-y-2">
        <label className="field-label" htmlFor="create-task-due">{labels.dueDate}</label>
        <input id="create-task-due" name="due_at" type="datetime-local" className="field-input" defaultValue={initialDueAt} />
      </div>
      <div className="md:col-span-2 space-y-2">
        <label className="field-label" htmlFor="create-task-description">{labels.description}</label>
        <textarea id="create-task-description" name="description" className="field-input" placeholder={labels.descriptionPlaceholder} />
      </div>
      <div className="space-y-2">
        <label className="field-label" htmlFor="area_id">{labels.area}</label>
        <select name="area_id" id="area_id" className="field-input" defaultValue="">
          <option value="">{labels.noArea}</option>
          {areas.map(area => <option key={area.id} value={area.id}>{area.name}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        <label className="field-label" htmlFor="priority">{labels.priority}</label>
        <select name="priority" id="priority" className="field-input" defaultValue="medium">
          <option value="high">{labels.high}</option>
          <option value="medium">{labels.medium}</option>
          <option value="low">{labels.low}</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="field-label" htmlFor="start_at">{labels.startTime}</label>
        <input name="start_at" id="start_at" type="datetime-local" className="field-input" />
      </div>
      <div className="space-y-2">
        <label className="field-label" htmlFor="duration_min">{labels.duration}</label>
        <input name="duration_min" id="duration_min" type="number" min="1" className="field-input" placeholder="30" />
      </div>
      <div className="space-y-2">
        <label className="field-label" htmlFor="recurrence">{labels.recurrence}</label>
        <select name="recurrence" id="recurrence" className="field-input" defaultValue="none">
          <option value="none">{labels.none}</option>
          <option value="daily">{labels.daily}</option>
          <option value="weekly">{labels.weekly}</option>
          <option value="monthly">{labels.monthly}</option>
        </select>
      </div>
      <div className="flex flex-wrap items-center gap-4 md:col-span-2">
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_top_three" />{labels.topThree}</label>
        <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="is_reminder" />{labels.reminder}</label>
      </div>
      {error && <p className="quick-capture-error md:col-span-2" role="alert">{error}</p>}
      <button type="submit" disabled={isPending} className="primary-button md:col-span-2">
        {isPending ? labels.saving : labels.submit}
      </button>
    </form>
  )
}
