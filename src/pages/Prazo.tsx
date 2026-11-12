import { useEffect, useState } from 'react'
import { Modal } from '../components/Modal'
import { agoraISO, brl, dataBR } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { VendaPrazo } from '../lib/types'

export function Prazo() {
  const [vendas, setVendas] = useState<VendaPrazo[]>([])
  const [selecionada, setSelecionada] = useState<VendaPrazo | null>(null)
  const [valor, setValor] = useState('')
  const [obs, setObs] = useState('')
  const [erro, setErro] = useState<string | null>(null)

  async function carregar() {
    const { data } = await supabase.from('vendas_prazo').select('*').order('criado_em', { ascending: false })
    setVendas((data || []) as VendaPrazo[])
  }

  useEffect(() => {
    void carregar()
  }, [])

  async function receber() {
    if (!selecionada) return
    const pago = Number(valor || 0)
    if (pago <= 0) {
      setErro('Informe um valor')
      return
    }
    const valorPago = Number(selecionada.valor_pago) + pago
    const valorRestante = Math.max(0, Number(selecionada.valor_total) - valorPago)
    const { error } = await supabase.from('pagamentos_vendas_prazo').insert({
      venda_prazo_id: selecionada.id,
      valor: pago,
      data_pagamento: agoraISO(),
      observacao: obs,
      criado_em: agoraISO(),
    })
    if (error) {
      setErro(error.message)
      return
    }
    await supabase
      .from('vendas_prazo')
      .update({
        valor_pago: valorPago,
        valor_restante: valorRestante,
        status: valorRestante === 0 ? 'quitada' : 'ativa',
        atualizado_em: agoraISO(),
      })
      .eq('id', selecionada.id)
    setSelecionada(null)
    setValor('')
    setObs('')
    await carregar()
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-sm text-gold">Fiado</p>
        <h1 className="titulo text-3xl">Vendas a prazo</h1>
      </div>
      <div className="space-y-3">
        {vendas.map((venda) => (
          <button
            key={venda.id}
            onClick={() => setSelecionada(venda)}
            className="flex w-full flex-wrap items-center justify-between gap-3 rounded-2xl border border-line bg-panel p-4 text-left"
          >
            <div>
              <p className="font-semibold">{venda.cliente_nome}</p>
              <p className="text-sm text-muted">{dataBR(venda.criado_em)}</p>
              <p className="text-xs text-muted capitalize">{venda.status}</p>
            </div>
            <div className="text-right">
              <p className="text-gold">{brl(venda.valor_restante)} em aberto</p>
              <p className="text-xs text-muted">Total {brl(venda.valor_total)}</p>
            </div>
          </button>
        ))}
        {vendas.length === 0 && <p className="text-muted">Nenhuma venda a prazo.</p>}
      </div>

      <Modal aberto={!!selecionada} titulo={`Receber · ${selecionada?.cliente_nome || ''}`} onFechar={() => setSelecionada(null)}>
        <p className="text-sm text-muted">Restante: {brl(selecionada?.valor_restante)}</p>
        <div className="mt-3 space-y-2 text-sm">
          {selecionada?.produtos?.map((item) => (
            <div key={item.produtoId} className="flex justify-between">
              <span>
                {item.quantidade}x {item.nome}
              </span>
              <span>{brl(item.preco * item.quantidade)}</span>
            </div>
          ))}
        </div>
        <input
          type="number"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder="Valor recebido"
          className="mt-4 w-full rounded-xl border border-line bg-panel-2 px-3 py-2"
        />
        <input
          value={obs}
          onChange={(e) => setObs(e.target.value)}
          placeholder="Observação"
          className="mt-2 w-full rounded-xl border border-line bg-panel-2 px-3 py-2"
        />
        {erro && <p className="mt-2 text-sm text-danger">{erro}</p>}
        <button onClick={() => void receber()} className="mt-4 w-full rounded-xl bg-gold py-3 font-semibold text-bg">
          Registrar pagamento
        </button>
      </Modal>
    </div>
  )
}
