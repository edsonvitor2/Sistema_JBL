import type { Produto } from './types'

export function normalizarCodigo(codigo: string) {
  return codigo.trim().toLowerCase()
}

/** Acha o produto pelo código de barras exato (tolerando zeros à esquerda, ex.: UPC-A x EAN-13). */
export function buscarPorCodigo(produtos: Produto[], codigo: string) {
  const alvo = normalizarCodigo(codigo)
  if (!alvo) return undefined
  const exato = produtos.find((produto) => normalizarCodigo(produto.codigo_barras || '') === alvo)
  if (exato) return exato
  const semZeros = alvo.replace(/^0+/, '')
  return produtos.find((produto) => {
    const codigoProduto = normalizarCodigo(produto.codigo_barras || '').replace(/^0+/, '')
    return codigoProduto !== '' && codigoProduto === semZeros
  })
}
