import { ShoppingCart, X } from 'lucide-react'
import { useState, type ReactNode } from 'react'
import { totalItens } from '../lib/estoque'
import { brl } from '../lib/format'
import type { ItemVenda } from '../lib/types'

type Props = {
  titulo: string
  subtitulo?: string
  topo?: ReactNode
  itens: ItemVenda[]
  checkout: (fechar: () => void) => ReactNode
  children: ReactNode
}

export function PdvShell({ titulo, subtitulo, topo, itens, checkout, children }: Props) {
  const [aberto, setAberto] = useState(false)
  const total = totalItens(itens)
  const qtd = itens.reduce((acc, item) => acc + Number(item.quantidade), 0)

  function fechar() {
    setAberto(false)
  }

  return (
    <div className="flex h-[calc(100svh-12rem)] flex-col gap-2 lg:h-[calc(100svh-6.5rem)] lg:gap-4">
      <div className="flex shrink-0 items-end justify-between gap-2">
        <div className="min-w-0">
          {subtitulo && <p className="text-[11px] tracking-wide text-gold uppercase lg:text-sm">{subtitulo}</p>}
          <h1 className="titulo truncate text-xl lg:text-3xl">{titulo}</h1>
        </div>
        {topo}
      </div>

      <div className="grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_360px]">
        <div className="flex min-h-0 rounded-2xl border border-line bg-panel p-2 lg:p-3">{children}</div>
        <div className="hidden min-h-0 lg:block">{checkout(fechar)}</div>
      </div>

      <button
        type="button"
        onClick={() => setAberto(true)}
        className="flex shrink-0 items-center justify-between rounded-2xl bg-gold px-4 py-3 text-bg lg:hidden"
      >
        <span className="flex items-center gap-2 font-semibold">
          <ShoppingCart size={18} />
          {qtd === 0 ? 'Carrinho vazio' : `${qtd} ${qtd === 1 ? 'item' : 'itens'}`}
        </span>
        <span className="font-bold">{brl(total)}</span>
      </button>

      {aberto && (
        <div className="fixed inset-0 z-50 bg-black/65 lg:hidden">
          <button className="absolute inset-0" onClick={fechar} aria-label="Fechar carrinho" />
          <div className="absolute inset-x-0 bottom-0 z-10 flex h-[min(78svh,680px)] flex-col rounded-t-3xl border-t border-line bg-panel">
            <div className="flex shrink-0 items-center justify-between px-4 pt-3 pb-1">
              <p className="font-semibold">Fechar venda</p>
              <button onClick={fechar} className="rounded-lg p-2 text-muted" aria-label="Fechar">
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-hidden px-3 pb-[calc(4rem+env(safe-area-inset-bottom))]">
              {checkout(fechar)}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
