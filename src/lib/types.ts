export type CaixaStatus = 'aberto' | 'fechado'

export type OrigemVenda = 'balcao' | 'comanda' | 'prazo'

export type TipoPagamento = 'dinheiro' | 'pix' | 'debito' | 'credito' | 'prazo'

export type TotaisPagamento = {
  dinheiro: number
  pix: number
  debito: number
  credito: number
}

export type Produto = {
  id: string
  nome: string
  descricao: string | null
  preco: number
  quantidade: number
  estoque_minimo: number
  custo: number
  imagem_url: string | null
  codigo_barras: string | null
  criado_em: string
  atualizado_em: string
}

export type ItemVenda = {
  produtoId: string
  nome: string
  preco: number
  quantidade: number
}

export type Caixa = {
  id: string
  status: CaixaStatus
  valor_inicial: number
  observacao_abertura: string | null
  aberto_em: string
  fechado_em: string | null
  total_informado_fechamento: TotaisPagamento | null
  total_calculado_sistema: TotaisPagamento | null
  diferenca_caixa: TotaisPagamento | null
  observacao_fechamento: string | null
  criado_em: string
  atualizado_em: string
}

export type Venda = {
  id: string
  caixa_id: string | null
  origem: OrigemVenda | string
  itens: ItemVenda[]
  total: number
  pagamento_tipo: string | null
  valor_cliente: number | null
  troco: number | null
  status: string | null
  cliente_id: string | null
  cliente_nome: string | null
  cliente_telefone: string | null
  cliente_endereco: string | null
  criado_em: string
  atualizado_em: string
}

export type Cliente = {
  id: string
  nome: string
  telefone: string | null
  email: string | null
  endereco: string | null
  criado_em: string
  atualizado_em: string
}

export type VendaPrazo = {
  id: string
  cliente_nome: string
  valor_total: number
  valor_pago: number
  valor_restante: number
  produtos: ItemVenda[]
  status: string
  criado_em: string
  atualizado_em: string
}

export type PagamentoPrazo = {
  id: string
  venda_prazo_id: string
  valor: number
  data_pagamento: string
  observacao: string | null
  criado_em: string
}

export type Sangria = {
  id: string
  caixa_id: string
  valor: number
  motivo: string
  criado_em: string
}
