import { useEffect, useMemo, useState } from 'react'
import { Modal } from '../components/Modal'
import { useApp } from '../context/AppContext'
import { agoraISO, brl, dataBR } from '../lib/format'
import { supabase } from '../lib/supabase'
import { totaisPorPagamento } from '../lib/vendas'
import type { Caixa, Sangria, TotaisPagamento, Venda } from '../lib/types'

const zerado: TotaisPagamento = { dinheiro: 0, pix: 0, debito: 0, credito: 0 }

export function CaixaPage() {
  const { caixa, recarregarCaixa } = useApp()
  const [vendas, setVendas] = useState<Venda[]>([])
  const [sangrias, setSangrias] = useState<Sangria[]>([])
  const [historico, setHistorico] = useState<Caixa[]>([])
  const [valorInicial, setValorInicial] = useState('0')
  const [obsAbertura, setObsAbertura] = useState('')
  const [obsFechamento, setObsFechamento] = useState('')
  const [informado, setInformado] = useState({ ...zerado })
  const [sangriaValor, setSangriaValor] = useState('')
  const [sangriaMotivo, setSangriaMotivo] = useState('')
  const [abrirSangria, setAbrirSangria] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    void carregarExtras()
  }, [caixa?.id])

  async function carregarExtras() {
    const { data: caixas } = await supabase.from('caixas').select('*').order('aberto_em', { ascending: false }).limit(8)
    setHistorico((caixas || []) as Caixa[])
    if (!caixa) {
      setVendas([])
      setSangrias([])
      return
    }
    const [{ data: vendasData }, { data: sangriasData }] = await Promise.all([
      supabase.from('historico_vendas').select('*').eq('caixa_id', caixa.id),
      supabase.from('sangrias_caixa').select('*').eq('caixa_id', caixa.id).order('criado_em', { ascending: false }),
    ])
    setVendas((vendasData || []) as Venda[])
    setSangrias((sangriasData || []) as Sangria[])
  }

  const totais = useMemo(() => totaisPorPagamento(vendas), [vendas])
  const totalSangrias = sangrias.reduce((acc, item) => acc + Number(item.valor), 0)
  const dinheiroSistema = Number(caixa?.valor_inicial || 0) + totais.dinheiro - totalSangrias
  const calculado: TotaisPagamento = {
    ...totais,
    dinheiro: dinheiroSistema,
  }
  const totalVendas = totais.dinheiro + totais.pix + totais.debito + totais.credito

  async function abrirCaixa() {
    setErro(null)
    const { error } = await supabase.from('caixas').insert({
      status: 'aberto',
      valor_inicial: Number(valorInicial || 0),
      observacao_abertura: obsAbertura,
      aberto_em: agoraISO(),
      criado_em: agoraISO(),
      atualizado_em: agoraISO(),
    })
    if (error) {
      setErro(error.message)
      return
    }
    setValorInicial('0')
    setObsAbertura('')
    await recarregarCaixa()
  }

  async function registrarSangria() {
    if (!caixa) return
    const { error } = await supabase.from('sangrias_caixa').insert({
      caixa_id: caixa.id,
      valor: Number(sangriaValor || 0),
      motivo: sangriaMotivo || 'Sangria',
      criado_em: agoraISO(),
    })
    if (error) {
      setErro(error.message)
      return
    }
    setSangriaValor('')
    setSangriaMotivo('')
    setAbrirSangria(false)
    await carregarExtras()
  }

  async function fecharCaixa() {
    if (!caixa) return
    if (!confirm('Fechar o caixa agora?')) return
    const diferenca = {
      dinheiro: Number(informado.dinheiro || 0) - calculado.dinheiro,
      pix: Number(informado.pix || 0) - calculado.pix,
      debito: Number(informado.debito || 0) - calculado.debito,
      credito: Number(informado.credito || 0) - calculado.credito,
    }
    const { error } = await supabase
      .from('caixas')
      .update({
        status: 'fechado',
        fechado_em: agoraISO(),
        total_informado_fechamento: informado,
        total_calculado_sistema: calculado,
        diferenca_caixa: diferenca,
        observacao_fechamento: obsFechamento,
        atualizado_em: agoraISO(),
      })
      .eq('id', caixa.id)
    if (error) {
      setErro(error.message)
      return
    }
    setInformado({ ...zerado })
    setObsFechamento('')
    await recarregarCaixa()
    await carregarExtras()
  }

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm text-gold">Movimento</p>
        <h1 className="titulo text-3xl">Caixa</h1>
      </div>
      {erro && <p className="text-sm text-danger">{erro}</p>}

      {!caixa && (
        <section className="max-w-xl rounded-2xl border border-line bg-panel p-5">
          <h2 className="titulo text-2xl">Abrir caixa</h2>
          <label className="mt-4 block text-sm text-muted">
            Valor inicial em dinheiro
            <input
              type="number"
              value={valorInicial}
              onChange={(e) => setValorInicial(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-panel-2 px-3 py-2 text-ink"
            />
          </label>
          <label className="mt-3 block text-sm text-muted">
            Observação
            <input
              value={obsAbertura}
              onChange={(e) => setObsAbertura(e.target.value)}
              className="mt-1 w-full rounded-xl border border-line bg-panel-2 px-3 py-2 text-ink"
            />
          </label>
          <button onClick={() => void abrirCaixa()} className="mt-4 w-full rounded-xl bg-gold py-3 font-semibold text-bg">
            Abrir caixa
          </button>
        </section>
      )}

      {caixa && (
        <>
          <section className="grid gap-3 md:grid-cols-4">
            <Resumo titulo="Aberto em" valor={dataBR(caixa.aberto_em)} />
            <Resumo titulo="Fundo inicial" valor={brl(caixa.valor_inicial)} />
            <Resumo titulo="Vendas" valor={brl(totalVendas)} />
            <Resumo titulo="Sangrias" valor={brl(totalSangrias)} />
          </section>

          <section className="grid gap-3 md:grid-cols-4">
            <Resumo titulo="Dinheiro no sistema" valor={brl(calculado.dinheiro)} />
            <Resumo titulo="Pix" valor={brl(calculado.pix)} />
            <Resumo titulo="Débito" valor={brl(calculado.debito)} />
            <Resumo titulo="Crédito" valor={brl(calculado.credito)} />
          </section>

          <section className="rounded-2xl border border-line bg-panel p-5">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h2 className="titulo text-2xl">Fechar caixa</h2>
              <button onClick={() => setAbrirSangria(true)} className="rounded-xl bg-panel-2 px-4 py-2 text-sm">
                Registrar sangria
              </button>
            </div>
            <p className="mb-4 text-sm text-muted">Informe o que realmente ficou em cada forma de pagamento.</p>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {(['dinheiro', 'pix', 'debito', 'credito'] as const).map((tipo) => (
                <label key={tipo} className="text-sm text-muted capitalize">
                  {tipo}
                  <input
                    type="number"
                    value={informado[tipo]}
                    onChange={(e) => setInformado({ ...informado, [tipo]: Number(e.target.value || 0) })}
                    className="mt-1 w-full rounded-xl border border-line bg-panel-2 px-3 py-2 text-ink"
                  />
                  <span className="mt-1 block text-xs">Sistema: {brl(calculado[tipo])}</span>
                </label>
              ))}
            </div>
            <label className="mt-3 block text-sm text-muted">
              Observação de fechamento
              <input
                value={obsFechamento}
                onChange={(e) => setObsFechamento(e.target.value)}
                className="mt-1 w-full rounded-xl border border-line bg-panel-2 px-3 py-2 text-ink"
              />
            </label>
            <button onClick={() => void fecharCaixa()} className="mt-4 rounded-xl bg-danger px-5 py-3 font-semibold text-white">
              Fechar caixa
            </button>
          </section>

          {sangrias.length > 0 && (
            <section className="rounded-2xl border border-line bg-panel p-5">
              <h2 className="titulo text-xl">Sangrias</h2>
              <div className="mt-3 space-y-2">
                {sangrias.map((item) => (
                  <div key={item.id} className="flex justify-between rounded-xl bg-panel-2 px-3 py-2 text-sm">
                    <span>{item.motivo}</span>
                    <span>{brl(item.valor)}</span>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <section className="rounded-2xl border border-line bg-panel p-5">
        <h2 className="titulo text-xl">Últimos caixas</h2>
        <div className="mt-3 space-y-2">
          {historico.map((item) => (
            <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-panel-2 px-3 py-2">
              <div>
                <p className="text-sm font-medium capitalize">{item.status}</p>
                <p className="text-xs text-muted">{dataBR(item.aberto_em)}</p>
              </div>
              <p className="text-sm text-muted">Inicial {brl(item.valor_inicial)}</p>
            </div>
          ))}
        </div>
      </section>

      <Modal aberto={abrirSangria} titulo="Sangria" onFechar={() => setAbrirSangria(false)}>
        <label className="block text-sm text-muted">
          Valor
          <input
            type="number"
            value={sangriaValor}
            onChange={(e) => setSangriaValor(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-panel-2 px-3 py-2 text-ink"
          />
        </label>
        <label className="mt-3 block text-sm text-muted">
          Motivo
          <input
            value={sangriaMotivo}
            onChange={(e) => setSangriaMotivo(e.target.value)}
            className="mt-1 w-full rounded-xl border border-line bg-panel-2 px-3 py-2 text-ink"
          />
        </label>
        <button onClick={() => void registrarSangria()} className="mt-4 w-full rounded-xl bg-gold py-3 font-semibold text-bg">
          Confirmar sangria
        </button>
      </Modal>
    </div>
  )
}

function Resumo({ titulo, valor }: { titulo: string; valor: string }) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <p className="text-sm text-muted">{titulo}</p>
      <p className="titulo text-2xl">{valor}</p>
    </div>
  )
}
