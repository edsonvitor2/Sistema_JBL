import { Link } from 'react-router-dom'

export function AvisoCaixa() {
  return (
    <div className="rounded-2xl border border-danger/40 bg-danger/10 p-6">
      <h2 className="titulo text-2xl text-ink">Caixa fechado</h2>
      <p className="mt-2 text-muted">Abra o caixa para registrar vendas de balcão ou mesa.</p>
      <Link to="/caixa" className="mt-4 inline-flex rounded-xl bg-gold px-4 py-2 font-semibold text-bg">
        Ir para o caixa
      </Link>
    </div>
  )
}
