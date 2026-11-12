import { useMemo, useState } from 'react'
import { brl } from '../lib/format'
import { totalItens } from '../lib/estoque'
import { imprimirRecibo } from '../lib/recibo'
import { finalizarVendaExistente, registrarVenda } from '../lib/vendas'
import type { Cliente, ItemVenda, OrigemVenda, TipoPagamento, Venda } from '../lib/types'

type Props = {
  itens: ItemVenda[]
  caixaId: string
  origem: OrigemVenda
  clienteNome?: string
  onMudarItens: (itens: ItemVenda[]) => void
  onSucesso: () => void
  baixarEstoque?: boolean
  vendaId?: string
  clientes?: Cliente[]
}

const pagamentos: { id: TipoPagamento; label: string }[] = [
  { id: 'dinheiro', label: 'Dinheiro' },
  { id: 'pix', label: 'Pix' },
  { id: 'debito', label: 'Débito' },
  { id: 'credito', label: 'Crédito' },
  { id: 'prazo', label: 'A prazo' },
]

export function Checkout({
  itens,
  caixaId,
  origem,
  clienteNome,
  onMudarItens,
  onSucesso,
  baixarEstoque = true,
  vendaId,
  clientes = [],
}: Props) {
  const [pagamento, setPagamento] = useState<TipoPagamento>('dinheiro')
  const [valorCliente, setValorCliente] = useState('')
  const [nomeCliente, setNomeCliente] = useState(clienteNome || '')
  const [clienteId, setClienteId] = useState('')
  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  const total = useMemo(() => totalItens(itens), [itens])
  const troco = pagamento === 'dinheiro' ? Math.max(0, Number(valorCliente || 0) - total) : 0

  function mudarQtd(produtoId: string, delta: number) {
    const proximo = itens
      .map((item) =>
        item.produtoId === produtoId ? { ...item, quantidade: item.quantidade + delta } : item,
      )
      .filter((item) => item.quantidade > 0)
    onMudarItens(proximo)
  }

  const clienteSelecionado = clientes.find((c) => c.id === clienteId) || null
  const prazoSemCliente = pagamento === 'prazo' && !clienteSelecionado

  async function finalizar() {
    if (itens.length === 0) return
    if (prazoSemCliente) {
      setErro('Selecione o cliente para vender a prazo')
      return
    }
    setSalvando(true)
    setErro(null)
    try {
      const payload = {
        origem,
        itens,
        pagamento_tipo: pagamento,
        valor_cliente: pagamento === 'dinheiro' ? Number(valorCliente || total) : null,
        troco: pagamento === 'dinheiro' ? troco : null,
        status: 'finalizado',
        cliente_id: clienteSelecionado?.id || null,
        cliente_nome: clienteSelecionado?.nome || nomeCliente || null,
        cliente_telefone: clienteSelecionado?.telefone || null,
        cliente_endereco: clienteSelecionado?.endereco || null,
      }
      const venda = vendaId
        ? await finalizarVendaExistente(vendaId, payload)
        : await registrarVenda({
            ...payload,
            caixa_id: caixaId,
            baixar: baixarEstoque,
          })
      imprimirRecibo(venda as Venda)
      onSucesso()
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Não foi possível finalizar a venda')
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col rounded-2xl border border-line bg-panel">
      <div className="border-b border-line px-4 py-3">
        <p className="text-sm text-muted">Carrinho</p>
        <p className="titulo text-2xl">{brl(total)}</p>
      </div>
      <div className="scroll-fino min-h-0 flex-1 space-y-2 overflow-auto p-3">
        {itens.length === 0 && <p className="py-8 text-center text-sm text-muted">Nenhum item</p>}
        {itens.map((item) => (
          <div key={item.produtoId} className="rounded-xl bg-panel-2 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-medium">{item.nome}</p>
              <p className="text-sm text-gold">{brl(item.preco * item.quantidade)}</p>
            </div>
            <div className="mt-2 flex items-center gap-2">
              <button className="h-8 w-8 rounded-lg bg-bg" onClick={() => mudarQtd(item.produtoId, -1)}>
                -
              </button>
              <span className="min-w-6 text-center">{item.quantidade}</span>
              <button className="h-8 w-8 rounded-lg bg-bg" onClick={() => mudarQtd(item.produtoId, 1)}>
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <div className="shrink-0 space-y-3 border-t border-line p-4">
        {pagamento === 'prazo' && (
          <div className="space-y-2">
            {clientes.length > 0 ? (
              <select
                value={clienteId}
                onChange={(e) => {
                  setClienteId(e.target.value)
                  setErro(null)
                  const cliente = clientes.find((c) => c.id === e.target.value)
                  if (cliente) setNomeCliente(cliente.nome)
                }}
                className="w-full rounded-xl border border-line bg-panel-2 px-3 py-2"
              >
                <option value="">Selecione o cliente</option>
                {clientes.map((cliente) => (
                  <option key={cliente.id} value={cliente.id}>
                    {cliente.nome}
                  </option>
                ))}
              </select>
            ) : (
              <p className="text-sm text-danger">Cadastre um cliente para vender a prazo.</p>
            )}
            {prazoSemCliente && clientes.length > 0 && (
              <p className="text-sm text-danger">Selecione o cliente para vender a prazo</p>
            )}
          </div>
        )}
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {pagamentos.map((opcao) => (
            <button
              key={opcao.id}
              onClick={() => setPagamento(opcao.id)}
              className={`rounded-xl px-2 py-2.5 text-sm ${
                pagamento === opcao.id ? 'bg-gold text-bg font-semibold' : 'bg-panel-2 text-muted'
              }`}
            >
              {opcao.label}
            </button>
          ))}
        </div>
        {pagamento === 'dinheiro' && (
          <input
            type="number"
            min="0"
            step="0.01"
            value={valorCliente}
            onChange={(e) => setValorCliente(e.target.value)}
            placeholder="Valor recebido"
            className="w-full rounded-xl border border-line bg-panel-2 px-3 py-2"
          />
        )}
        {pagamento === 'dinheiro' && Number(valorCliente) > 0 && (
          <p className="text-sm text-muted">Troco: {brl(troco)}</p>
        )}
        {erro && <p className="text-sm text-danger">{erro}</p>}
        <button
          disabled={salvando || itens.length === 0 || prazoSemCliente}
          onClick={() => void finalizar()}
          className="w-full rounded-xl bg-gold py-3 font-semibold text-bg disabled:opacity-50"
        >
          {salvando ? 'Salvando...' : `Finalizar ${brl(total)}`}
        </button>
      </div>
    </div>
  )
}
