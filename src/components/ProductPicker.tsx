import { ScanBarcode, Search } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { buscarPorCodigo } from '../lib/codigo'
import { brl } from '../lib/format'
import { estoqueBaixo } from '../lib/estoque'
import type { Produto } from '../lib/types'
import { BarcodeScanner, type ResultadoLeitura } from './BarcodeScanner'

type Props = {
  produtos: Produto[]
  /** Retorne false (ou Promise<false>) se o item não pôde ser lançado. */
  onEscolher: (produto: Produto) => boolean | void | Promise<boolean | void>
}

export function ProductPicker({ produtos, onEscolher }: Props) {
  const [busca, setBusca] = useState('')
  const [camera, setCamera] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const filtrados = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    if (!termo) return produtos.slice(0, 48)
    return produtos
      .filter((produto) => {
        const nome = produto.nome.toLowerCase()
        const codigo = (produto.codigo_barras || '').toLowerCase()
        return nome.includes(termo) || codigo.includes(termo)
      })
      .slice(0, 48)
  }, [busca, produtos])

  function confirmarBusca() {
    const termo = busca.trim().toLowerCase()
    if (!termo) return
    const codigoExato = buscarPorCodigo(produtos, termo)
    if (codigoExato) {
      void onEscolher(codigoExato)
      setBusca('')
      inputRef.current?.focus()
      return
    }
    if (filtrados.length === 1) {
      void onEscolher(filtrados[0])
      setBusca('')
      inputRef.current?.focus()
    }
  }

  async function lerCodigo(codigo: string): Promise<ResultadoLeitura> {
    const produto = buscarPorCodigo(produtos, codigo)
    if (!produto) return { ok: false, mensagem: `Código ${codigo} não cadastrado` }
    if (Number(produto.quantidade) <= 0) return { ok: false, mensagem: `${produto.nome} sem estoque` }
    const lancou = await onEscolher(produto)
    if (lancou === false) return { ok: false, mensagem: `Não foi possível lançar ${produto.nome}` }
    return { ok: true, mensagem: `+1 ${produto.nome} · ${brl(produto.preco)}` }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-3.5 left-3 text-muted" size={18} />
          <input
            ref={inputRef}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') confirmarBusca()
            }}
            placeholder="Buscar produto ou código"
            className="w-full rounded-xl border border-line bg-panel-2 py-3 pr-3 pl-10 text-ink outline-none focus:border-gold"
            autoFocus
          />
        </div>
        <button
          type="button"
          onClick={() => setCamera(true)}
          className="flex shrink-0 items-center gap-2 rounded-xl bg-gold px-4 font-semibold text-bg"
          aria-label="Ler código de barras com a câmera"
        >
          <ScanBarcode size={20} />
          <span className="hidden sm:inline">Câmera</span>
        </button>
      </div>
      <div className="scroll-fino grid min-h-0 flex-1 auto-rows-min grid-cols-2 gap-2 overflow-auto md:grid-cols-3 xl:grid-cols-4">
        {filtrados.map((produto) => {
          const zerado = Number(produto.quantidade) <= 0
          return (
            <button
              key={produto.id}
              disabled={zerado}
              onClick={() => void onEscolher(produto)}
              className="rounded-xl border border-line bg-panel p-2.5 text-left transition hover:border-gold disabled:cursor-not-allowed disabled:opacity-40 lg:p-3"
            >
              <p className="line-clamp-2 text-[13px] leading-snug font-semibold lg:text-sm">{produto.nome}</p>
              <p className="mt-1.5 text-sm text-gold lg:mt-2 lg:text-base">{brl(produto.preco)}</p>
              <p className={`text-xs ${estoqueBaixo(produto) ? 'text-warn' : 'text-muted'}`}>
                Estoque {produto.quantidade}
              </p>
            </button>
          )
        })}
        {filtrados.length === 0 && (
          <p className="col-span-full py-10 text-center text-muted">Nenhum produto encontrado</p>
        )}
      </div>

      <BarcodeScanner aberto={camera} onFechar={() => setCamera(false)} onLer={lerCodigo} titulo="Adicionar por código" />
    </div>
  )
}
