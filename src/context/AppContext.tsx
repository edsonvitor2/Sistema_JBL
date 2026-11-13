import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { Caixa, Cliente, ItemVenda, Produto, Venda } from '../lib/types'

const CHAVE_CARRINHO = 'jbl_carrinho_balcao'

function lerCarrinho(): ItemVenda[] {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_CARRINHO) || '[]')
    return Array.isArray(salvo) ? salvo : []
  } catch {
    return []
  }
}

const DIAS_RANKING = 90

type AppContextValue = {
  /** Unidades vendidas por produto (id → qtd) nos últimos 90 dias, para ordenar por mais vendidos. */
  vendidos: Record<string, number>
  /** Carrinho do Balcão, salvo no aparelho para não se perder ao trocar de página. */
  carrinhoBalcao: ItemVenda[]
  setCarrinhoBalcao: (atualizar: ItemVenda[] | ((atual: ItemVenda[]) => ItemVenda[])) => void
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
  const [carrinhoBalcao, setCarrinhoBalcao] = useState<ItemVenda[]>(lerCarrinho)
  const [vendidos, setVendidos] = useState<Record<string, number>>({})

  useEffect(() => {
    try {
      if (carrinhoBalcao.length) localStorage.setItem(CHAVE_CARRINHO, JSON.stringify(carrinhoBalcao))
      else localStorage.removeItem(CHAVE_CARRINHO)
    } catch {
      /* armazenamento indisponível: o carrinho só não persiste */
    }
  }, [carrinhoBalcao])

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

  // Ranking de mais vendidos (unidades nos últimos DIAS_RANKING dias).
  // Calculado só ao abrir/recarregar o sistema, para os botões não mudarem de lugar durante o atendimento.
  const carregarRanking = useCallback(async () => {
    const desde = new Date(Date.now() - DIAS_RANKING * 86_400_000).toISOString()
    const { data, error } = await supabase.from('historico_vendas').select('itens,status').gte('criado_em', desde)
    if (error) {
      console.error('Falha ao carregar mais vendidos', error)
      return
    }
    const contagem: Record<string, number> = {}
    for (const venda of (data || []) as Pick<Venda, 'itens' | 'status'>[]) {
      if (venda.status === 'aberta' || venda.status === 'cancelado') continue
      for (const item of venda.itens || []) {
        contagem[item.produtoId] = (contagem[item.produtoId] || 0) + Number(item.quantidade || 0)
      }
    }
    setVendidos(contagem)
  }, [])

  const recarregar = useCallback(async () => {
    setErro(null)
    setCarregando(true)
    void carregarRanking()
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
  }, [carregarRanking])

  useEffect(() => {
    void recarregar()
  }, [recarregar])

  const value = useMemo(
    () => ({
      vendidos,
      carrinhoBalcao,
      setCarrinhoBalcao,
      carregando,
      erro,
      produtos,
      caixa,
      clientes,
      recarregar,
      recarregarProdutos,
      recarregarCaixa,
    }),
    [vendidos, carrinhoBalcao, carregando, erro, produtos, caixa, clientes, recarregar, recarregarProdutos, recarregarCaixa],
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
