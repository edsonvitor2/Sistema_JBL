import { agoraISO } from './format'
import { supabase } from './supabase'
import { baixarEstoque, devolverEstoque, totalItens } from './estoque'
import type { ItemVenda, OrigemVenda, TipoPagamento, Venda } from './types'

export type NovaVenda = {
  caixa_id: string
  origem: OrigemVenda
  itens: ItemVenda[]
  pagamento_tipo: TipoPagamento | null
  valor_cliente?: number | null
  troco?: number | null
  status?: string | null
  cliente_id?: string | null
  cliente_nome?: string | null
  cliente_telefone?: string | null
  cliente_endereco?: string | null
  baixar?: boolean
}

function exigirClientePrazo(dados: { pagamento_tipo?: TipoPagamento | null; cliente_id?: string | null }) {
  if (dados.pagamento_tipo === 'prazo' && !dados.cliente_id) {
    throw new Error('Selecione o cliente para vender a prazo')
  }
}

export async function registrarVenda(dados: NovaVenda) {
  exigirClientePrazo(dados)
  const payload = {
    caixa_id: dados.caixa_id,
    origem: dados.origem,
    itens: dados.itens,
    total: totalItens(dados.itens),
    pagamento_tipo: dados.pagamento_tipo,
    valor_cliente: dados.valor_cliente ?? null,
    troco: dados.troco ?? null,
    status: dados.status ?? 'finalizado',
    cliente_id: dados.cliente_id ?? null,
    cliente_nome: dados.cliente_nome ?? null,
    cliente_telefone: dados.cliente_telefone ?? null,
    cliente_endereco: dados.cliente_endereco ?? null,
    criado_em: agoraISO(),
    atualizado_em: agoraISO(),
  }

  if (dados.baixar !== false) {
    await baixarEstoque(dados.itens)
  }

  const { data, error } = await supabase.from('historico_vendas').insert(payload).select().single()

  if (error) {
    if (dados.baixar !== false) {
      await devolverEstoque(dados.itens)
    }
    throw error
  }

  if (dados.pagamento_tipo === 'prazo') {
    const { error: prazoError } = await supabase.from('vendas_prazo').insert({
      cliente_nome: dados.cliente_nome,
      valor_total: payload.total,
      valor_pago: 0,
      valor_restante: payload.total,
      produtos: dados.itens,
      status: 'ativa',
      criado_em: agoraISO(),
      atualizado_em: agoraISO(),
    })
    if (prazoError) {
      console.error(prazoError)
    }
  }

  return data as Venda
}

export async function atualizarComanda(id: string, itens: ItemVenda[]) {
  const { data, error } = await supabase
    .from('historico_vendas')
    .update({
      itens,
      total: totalItens(itens),
      atualizado_em: agoraISO(),
    })
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Venda
}

export async function finalizarVendaExistente(
  id: string,
  dados: Omit<NovaVenda, 'caixa_id' | 'baixar'>,
) {
  exigirClientePrazo(dados)
  const update = {
    origem: dados.origem,
    itens: dados.itens,
    total: totalItens(dados.itens),
    pagamento_tipo: dados.pagamento_tipo,
    valor_cliente: dados.valor_cliente ?? null,
    troco: dados.troco ?? null,
    status: dados.status ?? 'finalizado',
    cliente_id: dados.cliente_id ?? null,
    cliente_nome: dados.cliente_nome ?? null,
    cliente_telefone: dados.cliente_telefone ?? null,
    cliente_endereco: dados.cliente_endereco ?? null,
    atualizado_em: agoraISO(),
  }

  const { data, error } = await supabase.from('historico_vendas').update(update).eq('id', id).select().single()
  if (error) throw error

  if (dados.pagamento_tipo === 'prazo') {
    await supabase.from('vendas_prazo').insert({
      cliente_nome: dados.cliente_nome,
      valor_total: update.total,
      valor_pago: 0,
      valor_restante: update.total,
      produtos: dados.itens,
      status: 'ativa',
      criado_em: agoraISO(),
      atualizado_em: agoraISO(),
    })
  }

  return data as Venda
}

export function totaisPorPagamento(vendas: Venda[]) {
  const totais = { dinheiro: 0, pix: 0, debito: 0, credito: 0 }
  for (const venda of vendas) {
    if (venda.status === 'aberta' || venda.status === 'cancelado') continue
    const tipo = venda.pagamento_tipo
    if (tipo === 'dinheiro' || tipo === 'pix' || tipo === 'debito' || tipo === 'credito') {
      totais[tipo] += Number(venda.total)
    }
  }
  return totais
}
