import { AlertTriangle, Package, ShoppingCart, Wallet } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { estoqueBaixo } from '../lib/estoque'
import { brl, dataBR, fimDoDiaISO, hojeISO, inicioDoDiaISO, rotuloOrigem } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Venda } from '../lib/types'

export function Dashboard() {
  const { produtos, caixa, carregando } = useApp()
  const [vendas, setVendas] = useState<Venda[]>([])

  useEffect(() => {
    const dia = hojeISO()
    void supabase
      .from('historico_vendas')
      .select('*')
      .gte('criado_em', inicioDoDiaISO(dia))
      .lte('criado_em', fimDoDiaISO(dia))
      .order('criado_em', { ascending: false })
      .then(({ data }) => setVendas((data || []) as Venda[]))
  }, [])

  const vendasValidas = vendas.filter((v) => v.status !== 'aberta' && v.status !== 'cancelado')
  const totalHoje = vendasValidas.reduce((acc, venda) => acc + Number(venda.total), 0)
  const alertas = produtos.filter(estoqueBaixo)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm tracking-[0.18em] text-gold uppercase">Painel</p>
        <h1 className="titulo text-4xl">Sistema JBL</h1>
        <p className="mt-1 text-muted">Vendas, mesas, estoque e caixa no mesmo lugar.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card icon={Wallet} titulo="Caixa" valor={caixa ? 'Aberto' : 'Fechado'} detalhe={caixa ? dataBR(caixa.aberto_em) : 'Abra para vender'} />
        <Card icon={ShoppingCart} titulo="Vendas de hoje" valor={brl(totalHoje)} detalhe={`${vendasValidas.length} cupom(ns)`} />
        <Card icon={Package} titulo="Produtos" valor={String(produtos.length)} detalhe="Itens no catálogo" />
        <Card icon={AlertTriangle} titulo="Estoque baixo" valor={String(alertas.length)} detalhe="Abaixo do mínimo" />
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Atalho to="/balcao" titulo="Venda balcão" texto="PDV rápido com busca e código de barras" />
        <Atalho to="/mesas" titulo="Mesas" texto="Abra comanda, lance itens e feche a conta" />
        <Atalho to="/caixa" titulo="Abrir / fechar caixa" texto="Sangria, conferência e fechamento" />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <section className="rounded-2xl border border-line bg-panel p-4">
          <h2 className="titulo text-xl">Últimas vendas de hoje</h2>
          <div className="mt-3 space-y-2">
            {carregando && <p className="text-muted">Carregando...</p>}
            {!carregando && vendasValidas.length === 0 && <p className="text-muted">Nenhuma venda hoje.</p>}
            {vendasValidas.slice(0, 8).map((venda) => (
              <div key={venda.id} className="flex items-center justify-between rounded-xl bg-panel-2 px-3 py-2">
                <div>
                  <p className="text-sm font-medium">{rotuloOrigem(venda.origem)}</p>
                  <p className="text-xs text-muted">{dataBR(venda.criado_em)}</p>
                </div>
                <p className="text-gold">{brl(venda.total)}</p>
              </div>
            ))}
          </div>
        </section>
        <section className="rounded-2xl border border-line bg-panel p-4">
          <div className="flex items-center justify-between">
            <h2 className="titulo text-xl">Estoque baixo</h2>
            <Link to="/estoque" className="text-sm text-gold">
              Ver estoque
            </Link>
          </div>
          <div className="mt-3 space-y-2">
            {alertas.slice(0, 8).map((produto) => (
              <div key={produto.id} className="flex items-center justify-between rounded-xl bg-panel-2 px-3 py-2">
                <p className="text-sm">{produto.nome}</p>
                <p className="text-sm text-warn">
                  {produto.quantidade}/{produto.estoque_minimo}
                </p>
              </div>
            ))}
            {alertas.length === 0 && <p className="text-muted">Nenhum alerta no momento.</p>}
          </div>
        </section>
      </div>
    </div>
  )
}

function Card({
  icon: Icon,
  titulo,
  valor,
  detalhe,
}: {
  icon: typeof Wallet
  titulo: string
  valor: string
  detalhe: string
}) {
  return (
    <div className="rounded-2xl border border-line bg-panel p-4">
      <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-panel-2 text-gold">
        <Icon size={18} />
      </div>
      <p className="text-sm text-muted">{titulo}</p>
      <p className="titulo text-2xl">{valor}</p>
      <p className="text-xs text-muted">{detalhe}</p>
    </div>
  )
}

function Atalho({ to, titulo, texto }: { to: string; titulo: string; texto: string }) {
  return (
    <Link to={to} className="rounded-2xl border border-line bg-panel p-4 transition hover:border-gold">
      <p className="titulo text-xl">{titulo}</p>
      <p className="mt-1 text-sm text-muted">{texto}</p>
    </Link>
  )
}
