import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Caixa, Cliente, Produto } from '../lib/types'

type AppContextValue = {
  carregando: boolean
  erro: string | null
  produtos: Produto[]
  caixa: Caixa | null
  clientes: Cliente[]
  recarregar: () => Promise<void>
  recarregarProdutos: () => Promise<void>
  recarregarCaixa: () => Promise<void>
}

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [produtos, setProdutos] = useState<Produto[]>([])
  const [caixa, setCaixa] = useState<Caixa | null>(null)
  const [clientes, setClientes] = useState<Cliente[]>([])

  const recarregarProdutos = useCallback(async () => {
    const { data, error } = await supabase.from('produtos').select('*').order('nome')
    if (error) throw error
    setProdutos((data || []) as Produto[])
  }, [])

  const recarregarCaixa = useCallback(async () => {
    const { data, error } = await supabase
      .from('caixas')
      .select('*')
      .eq('status', 'aberto')
      .order('aberto_em', { ascending: false })
      .limit(1)
    if (error) throw error
    setCaixa(((data || [])[0] as Caixa) || null)
  }, [])

  const recarregar = useCallback(async () => {
    setErro(null)
    setCarregando(true)
    try {
      const [produtosRes, caixaRes, clientesRes] = await Promise.all([
        supabase.from('produtos').select('*').order('nome'),
        supabase.from('caixas').select('*').eq('status', 'aberto').order('aberto_em', { ascending: false }).limit(1),
        supabase.from('clientes').select('*').order('nome'),
      ])

      if (produtosRes.error) throw produtosRes.error
      if (caixaRes.error) throw caixaRes.error
      if (clientesRes.error) throw clientesRes.error

      setProdutos((produtosRes.data || []) as Produto[])
      setCaixa(((caixaRes.data || [])[0] as Caixa) || null)
      setClientes((clientesRes.data || []) as Cliente[])
    } catch (e) {
      console.error('Falha ao carregar dados', e)
      setErro(descreverErro(e))
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  const value = useMemo(
    () => ({
      carregando,
      erro,
      produtos,
      caixa,
      clientes,
      recarregar,
      recarregarProdutos,
      recarregarCaixa,
    }),
    [carregando, erro, produtos, caixa, clientes, recarregar, recarregarProdutos, recarregarCaixa],
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

function descreverErro(e: unknown): string {
  if (e && typeof e === 'object') {
    const { message, details, hint, code } = e as Record<string, unknown>
    const partes = [message, details, hint, code ? `código ${code}` : null].filter(
      (p): p is string => typeof p === 'string' && p.trim() !== '',
    )
    if (partes.length) return `Falha ao carregar dados: ${partes.join(' · ')}`
  }
  if (typeof e === 'string' && e) return `Falha ao carregar dados: ${e}`
  return 'Falha ao carregar dados'
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp precisa estar dentro de AppProvider')
  return ctx
}
