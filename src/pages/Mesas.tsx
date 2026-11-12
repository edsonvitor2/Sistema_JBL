import { useCallback, useEffect, useMemo, useState } from 'react'
import { AvisoCaixa } from '../components/AvisoCaixa'
import { Checkout } from '../components/Checkout'
import { PdvShell } from '../components/PdvShell'
import { ProductPicker } from '../components/ProductPicker'
import { useApp } from '../context/AppContext'
import { baixarEstoque, devolverEstoque } from '../lib/estoque'
import { agoraISO, brl, numeroMesa } from '../lib/format'
import { supabase } from '../lib/supabase'
import { atualizarComanda } from '../lib/vendas'
import type { ItemVenda, Produto, Venda } from '../lib/types'

const MESAS_PADRAO = 16
const CHAVE_MESAS = 'jbl_qtd_mesas'

export function Mesas() {
  const { produtos, caixa, clientes, recarregarProdutos } = useApp()
  const [comandas, setComandas] = useState<Venda[]>([])
  const [mesaAtiva, setMesaAtiva] = useState<number | null>(null)
  const [qtdMesas, setQtdMesas] = useState(() => Number(localStorage.getItem(CHAVE_MESAS) || MESAS_PADRAO))
  const [erro, setErro] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    const { data, error } = await supabase
      .from('historico_vendas')
      .select('*')
      .eq('origem', 'comanda')
      .eq('status', 'aberta')
      .order('criado_em')
    if (error) throw error
    setComandas((data || []) as Venda[])
  }, [])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const comandaAtiva = useMemo(
    () => comandas.find((venda) => numeroMesa(venda.cliente_nome) === mesaAtiva) || null,
    [comandas, mesaAtiva],
  )

  async function abrirMesa(numero: number) {
    if (!caixa) return
    const existente = comandas.find((venda) => numeroMesa(venda.cliente_nome) === numero)
    if (existente) {
      setMesaAtiva(numero)
      return
    }
    const { error } = await supabase.from('historico_vendas').insert({
      caixa_id: caixa.id,
      origem: 'comanda',
      itens: [],
      total: 0,
      pagamento_tipo: null,
      status: 'aberta',
      cliente_nome: `Mesa ${numero}`,
      criado_em: agoraISO(),
      atualizado_em: agoraISO(),
    })
    if (error) {
      setErro(error.message)
      return
    }
    await carregar()
    setMesaAtiva(numero)
  }

  async function adicionar(produto: Produto): Promise<boolean> {
    if (!comandaAtiva) return false
    setErro(null)
    const atual = [...(comandaAtiva.itens || [])]
    const existe = atual.find((item) => item.produtoId === produto.id)
    const item: ItemVenda = existe
      ? { ...existe, quantidade: existe.quantidade + 1 }
      : { produtoId: produto.id, nome: produto.nome, preco: Number(produto.preco), quantidade: 1 }

    try {
      await baixarEstoque([{ ...item, quantidade: 1 }])
      const itens = existe
        ? atual.map((linha) => (linha.produtoId === produto.id ? item : linha))
        : [...atual, item]
      await atualizarComanda(comandaAtiva.id, itens)
      await Promise.all([carregar(), recarregarProdutos()])
      return true
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao lançar item')
      return false
    }
  }

  async function mudarQtd(produtoId: string, delta: number) {
    if (!comandaAtiva) return
    const atual = comandaAtiva.itens || []
    const item = atual.find((linha) => linha.produtoId === produtoId)
    if (!item) return
    try {
      if (delta > 0) await baixarEstoque([{ ...item, quantidade: delta }])
      if (delta < 0) await devolverEstoque([{ ...item, quantidade: Math.abs(delta) }])
      const itens = atual
        .map((linha) => (linha.produtoId === produtoId ? { ...linha, quantidade: linha.quantidade + delta } : linha))
        .filter((linha) => linha.quantidade > 0)
      await atualizarComanda(comandaAtiva.id, itens)
      await Promise.all([carregar(), recarregarProdutos()])
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao ajustar item')
    }
  }

  async function cancelar() {
    if (!comandaAtiva) return
    if (!confirm('Cancelar esta comanda e devolver os itens ao estoque?')) return
    await devolverEstoque(comandaAtiva.itens || [])
    await supabase
      .from('historico_vendas')
      .update({ status: 'cancelado', atualizado_em: agoraISO(), total: 0 })
      .eq('id', comandaAtiva.id)
    setMesaAtiva(null)
    await Promise.all([carregar(), recarregarProdutos()])
  }

  if (!caixa) return <AvisoCaixa />

  if (mesaAtiva && comandaAtiva) {
    return (
      <>
        {erro && <p className="mb-2 text-sm text-danger">{erro}</p>}
        <PdvShell
          titulo={`Mesa ${mesaAtiva}`}
          subtitulo="Comanda"
          itens={comandaAtiva.itens || []}
          topo={
            <div className="flex gap-3 text-sm">
              <button onClick={() => setMesaAtiva(null)} className="text-gold">
                Mesas
              </button>
              <button onClick={() => void cancelar()} className="text-danger">
                Cancelar
              </button>
            </div>
          }
          checkout={(fechar) => (
            <Checkout
              itens={comandaAtiva.itens || []}
              caixaId={caixa.id}
              origem="comanda"
              vendaId={comandaAtiva.id}
              clienteNome={comandaAtiva.cliente_nome || `Mesa ${mesaAtiva}`}
              clientes={clientes}
              baixarEstoque={false}
              onMudarItens={(itens) => {
                const mapa = new Map((comandaAtiva.itens || []).map((item) => [item.produtoId, item.quantidade]))
                for (const item of itens) {
                  const anterior = mapa.get(item.produtoId) || 0
                  if (item.quantidade !== anterior) void mudarQtd(item.produtoId, item.quantidade - anterior)
                }
                for (const [id, qtd] of mapa) {
                  if (!itens.find((item) => item.produtoId === id)) void mudarQtd(id, -qtd)
                }
              }}
              onSucesso={() => {
                fechar()
                setMesaAtiva(null)
                void carregar()
                void recarregarProdutos()
              }}
            />
          )}
        >
          <ProductPicker produtos={produtos} onEscolher={adicionar} />
        </PdvShell>
      </>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gold">Salão</p>
          <h1 className="titulo text-3xl">Mesas</h1>
        </div>
        <label className="text-sm text-muted">
          Quantidade
          <input
            type="number"
            min={1}
            max={40}
            value={qtdMesas}
            onChange={(e) => {
              const valor = Math.min(40, Math.max(1, Number(e.target.value || 1)))
              setQtdMesas(valor)
              localStorage.setItem(CHAVE_MESAS, String(valor))
            }}
            className="ml-2 w-20 rounded-lg border border-line bg-panel-2 px-2 py-1 text-ink"
          />
        </label>
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-6">
        {Array.from({ length: qtdMesas }, (_, i) => i + 1).map((numero) => {
          const comanda = comandas.find((venda) => numeroMesa(venda.cliente_nome) === numero)
          return (
            <button
              key={numero}
              onClick={() => void abrirMesa(numero)}
              className={`min-h-24 rounded-2xl border p-4 text-left transition ${
                comanda ? 'border-gold bg-gold/10' : 'border-line bg-panel hover:border-gold'
              }`}
            >
              <p className="text-sm text-muted">Mesa</p>
              <p className="titulo text-3xl">{numero}</p>
              {comanda ? (
                <p className="mt-2 text-sm text-gold">{brl(comanda.total)}</p>
              ) : (
                <p className="mt-2 text-sm text-muted">Livre</p>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
