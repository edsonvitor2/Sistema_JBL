import { useEffect, useMemo, useState } from 'react'
import { brl, dataBR, fimDoDiaISO, hojeISO, inicioDoDiaISO, rotuloOrigem, rotuloPagamento } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Venda } from '../lib/types'

export function Relatorios() {
  const [de, setDe] = useState(hojeISO())
  const [ate, setAte] = useState(hojeISO())
  const [vendas, setVendas] = useState<Venda[]>([])
  const [carregando, setCarregando] = useState(false)

  async function carregar() {
    setCarregando(true)
    const { data } = await supabase
      .from('historico_vendas')
      .select('*')
      .gte('criado_em', inicioDoDiaISO(de))
      .lte('criado_em', fimDoDiaISO(ate))
      .order('criado_em', { ascending: false })
    setVendas((data || []) as Venda[])
    setCarregando(false)
  }

  useEffect(() => {
    void carregar()
  }, [])

  const validas = vendas.filter((venda) => venda.status !== 'aberta' && venda.status !== 'cancelado')

  const resumo = useMemo(() => {
    const porPagamento: Record<string, number> = {}
    const porOrigem: Record<string, number> = {}
    const porProduto: Record<string, { nome: string; qtd: number; total: number }> = {}
    let total = 0
    for (const venda of validas) {
      total += Number(venda.total)
      const pag = venda.pagamento_tipo || 'outro'
      const origem = venda.origem || 'outro'
      porPagamento[pag] = (porPagamento[pag] || 0) + Number(venda.total)
      porOrigem[origem] = (porOrigem[origem] || 0) + Number(venda.total)
      for (const item of venda.itens || []) {
        const atual = porProduto[item.produtoId] || { nome: item.nome, qtd: 0, total: 0 }
        atual.qtd += Number(item.quantidade)
        atual.total += Number(item.preco) * Number(item.quantidade)
        porProduto[item.produtoId] = atual
      }
    }
    return {
      total,
      porPagamento,
      porOrigem,
      top: Object.values(porProduto)
        .sort((a, b) => b.total - a.total)
        .slice(0, 8),
    }
  }, [validas])

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gold">Análise</p>
        <h1 className="titulo text-3xl">Relatórios</h1>
      </div>

      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-line bg-panel p-4">
        <label className="text-sm text-muted">
          De
          <input type="date" value={de} onChange={(e) => setDe(e.target.value)} className="mt-1 block rounded-xl border border-line bg-panel-2 px-3 py-2 text-ink" />
        </label>
        <label className="text-sm text-muted">
          Até
          <input type="date" value={ate} onChange={(e) => setAte(e.target.value)} className="mt-1 block rounded-xl border border-line bg-panel-2 px-3 py-2 text-ink" />
        </label>
        <button onClick={() => void carregar()} className="rounded-xl bg-gold px-4 py-2 font-semibold text-bg">
          Filtrar
        </button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <CaixaResumo titulo="Faturamento" valor={brl(resumo.total)} />
        <CaixaResumo titulo="Vendas" valor={String(validas.length)} />
        <CaixaResumo titulo="Ticket médio" valor={brl(validas.length ? resumo.total / validas.length : 0)} />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <Lista titulo="Por pagamento" itens={Object.entries(resumo.porPagamento).map(([k, v]) => [rotuloPagamento(k), v])} />
        <Lista titulo="Por origem" itens={Object.entries(resumo.porOrigem).map(([k, v]) => [rotuloOrigem(k), v])} />
      </div>

      <section className="rounded-2xl border border-line bg-panel p-4">
        <h2 className="titulo text-xl">Produtos mais vendidos</h2>
        <div className="mt-3 space-y-2">
          {resumo.top.map((item) => (
            <div key={item.nome} className="flex items-center justify-between rounded-xl bg-panel-2 px-3 py-2">
              <div>
                <p className="text-sm">{item.nome}</p>
                <p className="text-xs text-muted">{item.qtd} un.</p>
              </div>
              <p className="text-gold">{brl(item.total)}</p>
            </div>
          ))}
          {resumo.top.length === 0 && <p className="text-muted">Sem vendas no período.</p>}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-line">
        <div className="scroll-fino max-h-[50vh] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 bg-panel-2 text-muted">
              <tr>
                <th className="px-3 py-3">Data</th>
                <th className="px-3 py-3">Origem</th>
                <th className="px-3 py-3">Pagamento</th>
                <th className="px-3 py-3">Cliente / mesa</th>
                <th className="px-3 py-3">Total</th>
              </tr>
            </thead>
            <tbody>
              {validas.map((venda) => (
                <tr key={venda.id} className="border-t border-line bg-panel">
                  <td className="px-3 py-2">{dataBR(venda.criado_em)}</td>
                  <td className="px-3 py-2">{rotuloOrigem(venda.origem)}</td>
                  <td className="px-3 py-2">{rotuloPagamento(venda.pagamento_tipo)}</td>
                  <td className="px-3 py-2">{venda.cliente_nome || '—'}</td>
                  <td className="px-3 py-2 text-gold">{brl(venda.total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {carregando && <p className="text-muted">Atualizando...</p>}
    </div>
  )
}

function CaixaResumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <p className="text-sm text-muted">{titulo}</p>
      <p className="titulo text-2xl">{valor}</p>
    </div>
  )
}

function Lista({ titulo, itens }: { titulo: string; itens: [string, number][] }) {
  return (
    <section className="rounded-2xl border border-line bg-panel p-4">
      <h2 className="titulo text-xl">{titulo}</h2>
      <div className="mt-3 space-y-2">
        {itens.length === 0 && <p className="text-muted">Sem dados.</p>}
        {itens.map(([nome, valor]) => (
          <div key={nome} className="flex justify-between rounded-xl bg-panel-2 px-3 py-2 text-sm">
            <span>{nome}</span>
            <span className="text-gold">{brl(valor)}</span>
          </div>
        ))}
      </div>
    </section>
  )
}
