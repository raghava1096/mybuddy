import { useCallback, useEffect, useState } from 'react'

// load data from the api. also tells us when the free server is slow to wake up.
export function useLoad<T>(load: () => Promise<T>, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [error, setError] = useState('')
  const [slow, setSlow] = useState(false)

  const reload = useCallback(() => {
    setError('')
    const timer = setTimeout(() => setSlow(true), 2500)
    return load()
      .then(setData)
      .catch((e: Error) => setError(e.message))
      .finally(() => {
        clearTimeout(timer)
        setSlow(false)
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  useEffect(() => {
    reload()
  }, [reload])

  return { data, error, slow, reload }
}

// small wrapper around localStorage that never throws
export function useStored<T>(key: string, initial: T) {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key)
      return raw ? (JSON.parse(raw) as T) : initial
    } catch {
      return initial
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(value))
    } catch {
      // storage blocked, keep it in memory only
    }
  }, [key, value])

  return [value, setValue] as const
}
