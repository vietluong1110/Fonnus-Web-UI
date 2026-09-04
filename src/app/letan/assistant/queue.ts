import { useMemo, useState } from 'react'
import { buildQuestions } from '../questions'
import { useConfig } from '../store'

/*
 * The question queue: everything the record cannot answer yet, as questions
 * Fonnus asks one at a time. Derived from the record, so it empties as the
 * record fills. "Bỏ qua" hides a question for the session only — the record
 * still lacks the answer, and next time the owner opens the app it is asked
 * again.
 */

const SKIPPED_KEY = 'fonnus.letan.skipped'

function readSkipped(): string[] {
  try {
    return JSON.parse(window.sessionStorage.getItem(SKIPPED_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

export function useQuestionQueue() {
  const { config } = useConfig()
  const [skipped, setSkipped] = useState<string[]>(() => (typeof window === 'undefined' ? [] : readSkipped()))
  const all = useMemo(() => buildQuestions(config), [config])
  const queue = all.filter((q) => !skipped.includes(q.id))
  const skip = (id: string) => {
    const next = [...skipped, id]
    setSkipped(next)
    try {
      window.sessionStorage.setItem(SKIPPED_KEY, JSON.stringify(next))
    } catch {
      /* ignore */
    }
  }
  const unskip = () => {
    setSkipped([])
    try {
      window.sessionStorage.removeItem(SKIPPED_KEY)
    } catch {
      /* ignore */
    }
  }
  return { queue, skippedCount: all.length - queue.length, skip, unskip }
}
