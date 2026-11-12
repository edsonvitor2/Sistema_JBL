import type { ReactNode } from 'react'

type ModalProps = {
  aberto: boolean
  titulo: string
  onFechar: () => void
  children: ReactNode
  largura?: string
}

export function Modal({ aberto, titulo, onFechar, children, largura = 'max-w-lg' }: ModalProps) {
  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 pb-20 sm:items-center">
      <button className="absolute inset-0 cursor-default" onClick={onFechar} aria-label="Fechar" />
      <div className={`relative w-full ${largura} rounded-2xl border border-line bg-panel p-5 shadow-2xl`}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <h2 className="titulo text-xl text-ink">{titulo}</h2>
          <button onClick={onFechar} className="rounded-lg px-2 py-1 text-muted hover:bg-panel-2">
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
