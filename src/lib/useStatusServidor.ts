import { useCallback, useEffect, useRef, useState } from 'react'
import { supabase } from './supabase'

export type StatusServidor = 'verificando' | 'online' | 'lento' | 'sem-internet' | 'fora'

const INTERVALO_MS = 30_000
const LENTO_MS = 1500
const TIMEOUT_MS = 8000

export function useStatusServidor() {
  const [status, setStatus] = useState<StatusServidor>('verificando')
  const [latencia, setLatencia] = useState<number | null>(null)
  const [verificadoEm, setVerificadoEm] = useState<Date | null>(null)
  const emAndamento = useRef(false)

  const verificar = useCallback(async () => {
    if (emAndamento.current) return
    if (!navigator.onLine) {
      setStatus('sem-internet')
      setLatencia(null)
      setVerificadoEm(new Date())
      return
    }
    emAndamento.current = true
    const inicio = performance.now()
    try {
      const { error } = await supabase
        .from('caixas')
        .select('id')
        .limit(1)
        .abortSignal(AbortSignal.timeout(TIMEOUT_MS))
      if (error) throw error
      const ms = Math.round(performance.now() - inicio)
      setLatencia(ms)
      setStatus(ms > LENTO_MS ? 'lento' : 'online')
    } catch {
      setLatencia(null)
      setStatus(navigator.onLine ? 'fora' : 'sem-internet')
    } finally {
      emAndamento.current = false
      setVerificadoEm(new Date())
    }
  }, [])

  useEffect(() => {
    const primeira = setTimeout(() => void verificar(), 0)
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') void verificar()
    }, INTERVALO_MS)
    const aoVoltar = () => {
      if (document.visibilityState === 'visible') void verificar()
    }
    const aoMudarRede = () => void verificar()
    document.addEventListener('visibilitychange', aoVoltar)
    window.addEventListener('online', aoMudarRede)
    window.addEventListener('offline', aoMudarRede)
    return () => {
      clearTimeout(primeira)
      clearInterval(timer)
      document.removeEventListener('visibilitychange', aoVoltar)
      window.removeEventListener('online', aoMudarRede)
      window.removeEventListener('offline', aoMudarRede)
    }
  }, [verificar])

  return { status, latencia, verificadoEm, verificar }
}
