import { agoraISO } from './format'
import { supabase } from './supabase'
import type { ItemVenda, Produto } from './types'

export function estoqueBaixo(produto: Produto) {
  return Number(produto.quantidade) <= Number(produto.estoque_minimo)
}

export async function baixarEstoque(itens: ItemVenda[]) {
  const aplicados: ItemVenda[] = []

  try {
    for (const item of itens) {
      const { data, error } = await supabase
        .from('produtos')
        .select('id, quantidade, nome')
        .eq('id', item.produtoId)
        .single()

      if (error || !data) {
        throw new Error(`Produto não encontrado: ${item.nome}`)
      }

      const atual = Number(data.quantidade)
      if (atual < item.quantidade) {
        throw new Error(`Estoque insuficiente de ${data.nome}. Disponível: ${atual}`)
      }

      const { error: updateError } = await supabase
        .from('produtos')
        .update({
          quantidade: atual - item.quantidade,
          atualizado_em: agoraISO(),
        })
        .eq('id', item.produtoId)

      if (updateError) throw updateError
      aplicados.push(item)
    }
  } catch (erro) {
    await devolverEstoque(aplicados)
    throw erro
  }
}

export async function devolverEstoque(itens: ItemVenda[]) {
  for (const item of itens) {
    const { data } = await supabase
      .from('produtos')
      .select('quantidade')
      .eq('id', item.produtoId)
      .single()

    const atual = Number(data?.quantidade || 0)
    await supabase
      .from('produtos')
      .update({
        quantidade: atual + item.quantidade,
        atualizado_em: agoraISO(),
      })
      .eq('id', item.produtoId)
  }
}

export function totalItens(itens: ItemVenda[]) {
  return itens.reduce((acc, item) => acc + Number(item.preco) * Number(item.quantidade), 0)
}
