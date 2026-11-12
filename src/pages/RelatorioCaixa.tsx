import { ArrowLeft, ChevronDown } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { brl, dataBR, rotuloOrigem, rotuloPagamento } from '../lib/format'
import { supabase } from '../lib/supabase'
import { totaisPorPagamento } from '../lib/vendas'
import type { Caixa, Sangria, TotaisPagamento, Venda } from '../lib/types'

const FORMAS = ['dinheiro', 'pix', 'debito', 'credito'] as const
const FILTRO_PAGAMENTO = ['todos', 'dinheiro', 'pix', 'debito', 'credito', 'prazo'] as const
const FILTRO_ORIGEM = ['todas', 'balcao', 'comanda'] as const

type FiltroPagamento = (typeof FILTRO_PAGAMENTO)[number]
type FiltroOrigem = (typeof FILTRO_ORIGEM)[number]

const valida = (venda: Venda) => venda.status !== 'aberta' && venda.status !== 'cancelado'

export function RelatorioCaixa() {
  const { id } = useParams()
  const [caixa, setCaixa] = useState<Caixa | null>(null)
  const [vendas, setVendas] = useState<Venda[]>([])
  const [sangrias, setSangrias] = useState<Sangria[]>([])
  const [carregando, setCarregando] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  const [pagamento, setPagamento] = useState<FiltroPagamento>('todos')
  const [origem, setOrigem] = useState<FiltroOrigem>('todas')
  const [aberta, setAberta] = useState<string | null>(null)

  const carregar = useCallback(async () => {
    if (!id) return
    setCarregando(true)
    setErro(null)
    const [caixaRes, vendasRes, sangriasRes] = await Promise.all([
      supabase.from('caixas').select('*').eq('id', id).maybeSingle(),
      supabase.from('historico_vendas').select('*').eq('caixa_id', id).order('criado_em', { ascending: false }),
      supabase.from('sangrias_caixa').select('*').eq('caixa_id', id).order('criado_em', { ascending: false }),
    ])
    const falha = caixaRes.error || vendasRes.error || sangriasRes.error
    if (falha) setErro(falha.message)
    setCaixa((caixaRes.data as Caixa) || null)
    setVendas((vendasRes.data || []) as Venda[])
    setSangrias((sangriasRes.data || []) as Sangria[])
    setCarregando(false)
  }, [id])

  useEffect(() => {
    void carregar()
  }, [carregar])

  const validas = useMemo(() => vendas.filter(valida), [vendas])
  const canceladas = vendas.filter((venda) => venda.status === 'cancelado').length

  const filtradas = useMemo(
    () =>
      validas.filter(
        (venda) =>
          (pagamento === 'todos' || venda.pagamento_tipo === pagamento) &&
          (origem === 'todas' || venda.origem === origem),
      ),
    [validas, pagamento, origem],
  )

  const totalFiltrado = filtradas.reduce((acc, venda) => acc + Number(venda.total), 0)

  const contagem = useMemo(() => {
    const porPagamento: Record<string, number> = {}
    const porOrigem: Record<string, number> = {}
    for (const venda of validas) {
      porPagamento[venda.pagamento_tipo || ''] = (porPagamento[venda.pagamento_tipo || ''] || 0) + Number(venda.total)
      porOrigem[venda.origem || ''] = (porOrigem[venda.origem || ''] || 0) + Number(venda.total)
    }
    return { porPagamento, porOrigem }
  }, [validas])

  const produtos = useMemo(() => {
    const mapa: Record<string, { nome: string; qtd: number; total: number }> = {}
    for (const venda of filtradas) {
      for (const item of venda.itens || []) {
        const atual = mapa[item.produtoId] || { nome: item.nome, qtd: 0, total: 0 }
        atual.qtd += Number(item.quantidade)
        atual.total += Number(item.preco) * Number(item.quantidade)
        mapa[item.produtoId] = atual
      }
    }
    return Object.values(mapa).sort((a, b) => b.total - a.total)
  }, [filtradas])

  // Fechamento: se o caixa já foi fechado, usa o que foi gravado; se está aberto, calcula ao vivo.
  const totalSangrias = sangrias.reduce((acc, item) => acc + Number(item.valor), 0)
  const aoVivo = totaisPorPagamento(vendas)
  const calculado: TotaisPagamento = caixa?.total_calculado_sistema || {
    ...aoVivo,
    dinheiro: Number(caixa?.valor_inicial || 0) + aoVivo.dinheiro - totalSangrias,
  }
  const informado = caixa?.total_informado_fechamento || null
  const diferenca = caixa?.diferenca_caixa || null
  const totalVendas = validas.reduce((acc, venda) => acc + Number(venda.total), 0)
  const fechado = caixa?.status === 'fechado'

  if (carregando && !caixa) return <p className="text-muted">Carregando relatório...</p>
  if (!caixa) {
    return (
      <div className="space-y-3">
        <Voltar />
        <p className="text-danger">{erro || 'Caixa não encontrado.'}</p>
      </div>
    )
  }

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <Voltar />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-gold">Relatório do caixa</p>
            <h1 className="titulo text-3xl">{dataBR(caixa.aberto_em)}</h1>
            <p className="text-sm text-muted">
              {fechado ? `Fechado em ${dataBR(caixa.fechado_em)}` : 'Caixa aberto · valores atualizados agora'}
            </p>
          </div>
          <span
            className={`rounded-full px-3 py-1 text-sm font-semibold ${fechado ? 'bg-panel-2 text-muted' : 'bg-ok/15 text-ok'}`}
          >
            {fechado ? 'Fechado' : 'Aberto'}
          </span>
        </div>
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Resumo titulo="Total vendido" valor={brl(totalVendas)} />
        <Resumo titulo="Vendas" valor={String(validas.length)} detalhe={canceladas ? `${canceladas} cancelada(s)` : undefined} />
        <Resumo titulo="Fundo inicial" valor={brl(caixa.valor_inicial)} />
        <Resumo titulo="Sangrias" valor={brl(totalSangrias)} />
      </section>

      <section className="rounded-2xl border border-line bg-panel p-4">
        <h2 className="titulo text-xl">Fechamento</h2>
        <div className="scroll-fino mt-3 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <thead className="text-muted">
              <tr>
                <th className="py-2 pr-3 font-medium">Forma</th>
                <th className="py-2 pr-3 text-right font-medium">Sistema</th>
                <th className="py-2 pr-3 text-right font-medium">Informado</th>
                <th className="py-2 text-right font-medium">Diferença</th>
              </tr>
            </thead>
            <tbody>
              {FORMAS.map((forma) => {
                const dif = diferenca ? Number(diferenca[forma]) : null
                return (
                  <tr key={forma} className="border-t border-line">
                    <td className="py-2.5 pr-3">
                      {rotuloPagamento(forma)}
                      {forma === 'dinheiro' && <span className="block text-xs text-muted">fundo + vendas − sangrias</span>}
                    </td>
                    <td className="py-2.5 pr-3 text-right">{brl(calculado[forma])}</td>
                    <td className="py-2.5 pr-3 text-right">{informado ? brl(informado[forma]) : '—'}</td>
                    <td
                      className={`py-2.5 text-right font-semibold ${
                        dif === null ? 'text-muted' : Math.abs(dif) < 0.005 ? 'text-ok' : dif < 0 ? 'text-danger' : 'text-warn'
                      }`}
                    >
                      {dif === null ? '—' : `${dif > 0 ? '+' : ''}${brl(dif)}`}
                    </td>
                  </tr>
                )
              })}
              {(contagem.porPagamento.prazo || 0) > 0 && (
                <tr className="border-t border-line text-muted">
                  <td className="py-2.5 pr-3">A prazo (não entra no caixa)</td>
                  <td className="py-2.5 pr-3 text-right">{brl(contagem.porPagamento.prazo)}</td>
                  <td colSpan={2} />
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {!fechado && <p className="mt-2 text-xs text-muted">Informado e diferença aparecem depois que o caixa for fechado.</p>}
        {caixa.observacao_fechamento && (
          <p className="mt-3 rounded-xl bg-panel-2 px-3 py-2 text-sm">
            <span className="text-muted">Observação: </span>
            {caixa.observacao_fechamento}
          </p>
        )}
        {sangrias.length > 0 && (
          <div className="mt-4">
            <p className="text-sm text-muted">Sangrias</p>
            <div className="mt-2 space-y-1.5">
              {sangrias.map((item) => (
                <div key={item.id} className="flex justify-between gap-3 rounded-xl bg-panel-2 px-3 py-2 text-sm">
                  <span>
                    {item.motivo} <span className="text-xs text-muted">· {dataBR(item.criado_em)}</span>
                  </span>
                  <span>{brl(item.valor)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="space-y-3 rounded-2xl border border-line bg-panel p-4">
        <h2 className="titulo text-xl">Vendas</h2>
        <Filtros
          rotulo="Pagamento"
          opcoes={FILTRO_PAGAMENTO}
          valor={pagamento}
          onMudar={setPagamento}
          nome={(op) => (op === 'todos' ? 'Todos' : rotuloPagamento(op))}
          total={(op) => (op === 'todos' ? totalVendas : contagem.porPagamento[op] || 0)}
        />
        <Filtros
          rotulo="Origem"
          opcoes={FILTRO_ORIGEM}
          valor={origem}
          onMudar={setOrigem}
          nome={(op) => (op === 'todas' ? 'Todas' : rotuloOrigem(op))}
          total={(op) => (op === 'todas' ? totalVendas : contagem.porOrigem[op] || 0)}
        />

        <div className="flex flex-wrap items-baseline justify-between gap-2 rounded-xl bg-gold/10 px-4 py-3">
          <p className="text-sm text-muted">
            {filtradas.length} venda(s){' '}
            {filtradas.length > 0 && <>· ticket médio {brl(totalFiltrado / filtradas.length)}</>}
          </p>
          <p className="titulo text-2xl text-gold">{brl(totalFiltrado)}</p>
        </div>

        <div className="space-y-2">
          {filtradas.map((venda) => {
            const expandida = aberta === venda.id
            const qtd = (venda.itens || []).reduce((acc, item) => acc + Number(item.quantidade), 0)
            return (
              <div key={venda.id} className="rounded-xl bg-panel-2">
                <button
                  onClick={() => setAberta(expandida ? null : venda.id)}
                  className="flex w-full flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2.5 text-left text-sm"
                >
                  <span className="w-12 shrink-0 text-muted">{dataBR(venda.criado_em).split(' ').pop()}</span>
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{venda.origem === 'comanda' ? venda.cliente_nome || 'Mesa' : rotuloOrigem(venda.origem)}</span>
                    <span className="text-muted">
                      {' '}
                      · {rotuloPagamento(venda.pagamento_tipo)} · {qtd} item(ns)
                      {venda.origem !== 'comanda' && venda.cliente_nome ? ` · ${venda.cliente_nome}` : ''}
                    </span>
                  </span>
                  <span className="font-semibold text-gold">{brl(venda.total)}</span>
                  <ChevronDown size={16} className={`text-muted transition ${expandida ? 'rotate-180' : ''}`} />
                </button>
                {expandida && (
                  <div className="border-t border-line px-3 py-2 text-sm">
                    {(venda.itens || []).map((item) => (
                      <div key={item.produtoId} className="flex justify-between gap-3 py-1">
                        <span>
                          {item.quantidade}× {item.nome} <span className="text-muted">({brl(item.preco)})</span>
                        </span>
                        <span>{brl(Number(item.preco) * Number(item.quantidade))}</span>
                      </div>
                    ))}
                    {venda.pagamento_tipo === 'dinheiro' && venda.valor_cliente != null && (
                      <p className="mt-1 border-t border-line pt-2 text-muted">
                        Recebido {brl(venda.valor_cliente)} · troco {brl(venda.troco)}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )
          })}
          {filtradas.length === 0 && <p className="py-6 text-center text-muted">Nenhuma venda com esses filtros.</p>}
        </div>
      </section>

      {produtos.length > 0 && (
        <section className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="titulo text-xl">Produtos vendidos</h2>
          <p className="text-xs text-muted">Considerando os filtros acima</p>
          <div className="mt-3 space-y-1.5">
            {produtos.map((item) => (
              <div key={item.nome} className="flex justify-between gap-3 rounded-xl bg-panel-2 px-3 py-2 text-sm">
                <span>
                  {item.nome} <span className="text-muted">· {item.qtd} un.</span>
                </span>
                <span className="text-gold">{brl(item.total)}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}

function Voltar() {
  return (
    <Link to="/caixa" className="inline-flex items-center gap-1.5 text-sm text-gold">
      <ArrowLeft size={16} />
      Voltar ao caixa
    </Link>
  )
}

function Resumo({ titulo, valor, detalhe }: { titulo: string; valor: string; detalhe?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <p className="text-sm text-muted">{titulo}</p>
      <p className="titulo text-2xl">{valor}</p>
      {detalhe && <p className="text-xs text-muted">{detalhe}</p>}
    </div>
  )
}

function Filtros<T extends string>({
  rotulo,
  opcoes,
  valor,
  onMudar,
  nome,
  total,
}: {
  rotulo: string
  opcoes: readonly T[]
  valor: T
  onMudar: (valor: T) => void
  nome: (op: T) => string
  total: (op: T) => number
}) {
  return (
    <div>
      <p className="mb-1.5 text-xs tracking-wide text-muted uppercase">{rotulo}</p>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((op) => (
          <button
            key={op}
            onClick={() => onMudar(op)}
            className={`rounded-xl px-3 py-2 text-sm ${
              valor === op ? 'bg-gold font-semibold text-bg' : 'bg-panel-2 text-muted hover:text-ink'
            }`}
          >
            {nome(op)} <span className={valor === op ? 'text-bg/70' : 'text-muted/70'}>{brl(total(op))}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
