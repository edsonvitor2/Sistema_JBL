import { AvisoCaixa } from '../components/AvisoCaixa'
import { Checkout } from '../components/Checkout'
import { PdvShell } from '../components/PdvShell'
import { ProductPicker } from '../components/ProductPicker'
import { useApp } from '../context/AppContext'
import type { Produto } from '../lib/types'

export function Balcao() {
  const { produtos, caixa, clientes, recarregarProdutos, carrinhoBalcao: itens, setCarrinhoBalcao: setItens } = useApp()

  function adicionar(produto: Produto): boolean {
    const noCarrinho = itens.find((item) => item.produtoId === produto.id)?.quantidade || 0
    if (noCarrinho + 1 > Number(produto.quantidade)) return false
    setItens((atual) => {
      const existe = atual.find((item) => item.produtoId === produto.id)
      if (existe) {
        if (existe.quantidade + 1 > Number(produto.quantidade)) return atual
        return atual.map((item) =>
          item.produtoId === produto.id ? { ...item, quantidade: item.quantidade + 1 } : item,
        )
      }
      if (Number(produto.quantidade) <= 0) return atual
      return [...atual, { produtoId: produto.id, nome: produto.nome, preco: Number(produto.preco), quantidade: 1 }]
    })
    return true
  }

  if (!caixa) return <AvisoCaixa />

  return (
    <PdvShell
      titulo="Venda balcão"
      subtitulo="PDV"
      itens={itens}
      checkout={(fechar) => (
        <Checkout
          itens={itens}
          caixaId={caixa.id}
          origem="balcao"
          onMudarItens={setItens}
          clientes={clientes}
          onSucesso={() => {
            setItens([])
            fechar()
            void recarregarProdutos()
          }}
        />
      )}
    >
      <ProductPicker produtos={produtos} onEscolher={adicionar} />
    </PdvShell>
  )
}
