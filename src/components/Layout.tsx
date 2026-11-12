import {
  ClipboardList,
  LayoutDashboard,
  MoreHorizontal,
  Package,
  Receipt,
  Store,
  Users,
  UtensilsCrossed,
  Wallet,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import { dataBR } from '../lib/format'
import { useStatusServidor } from '../lib/useStatusServidor'
import { AvisoServidorFora, StatusServidorBadge } from './StatusServidor'

const links = [
  { to: '/', label: 'Início', icon: LayoutDashboard },
  { to: '/balcao', label: 'Balcão', icon: Store },
  { to: '/mesas', label: 'Mesas', icon: UtensilsCrossed },
  { to: '/estoque', label: 'Estoque', icon: Package },
  { to: '/caixa', label: 'Caixa', icon: Wallet },
  { to: '/relatorios', label: 'Relatórios', icon: ClipboardList },
  { to: '/clientes', label: 'Clientes', icon: Users },
  { to: '/prazo', label: 'A prazo', icon: Receipt },
]

const atalhosMobile = [
  links[1],
  links[2],
  links[3],
  links[4],
]

const extrasMobile = [links[0], links[5], links[6], links[7]]

export function Layout() {
  const { caixa, carregando } = useApp()
  const location = useLocation()
  const [maisAberto, setMaisAberto] = useState(false)
  const servidor = useStatusServidor()
  const verificarServidor = () => void servidor.verificar()
  const pdv = location.pathname === '/balcao' || location.pathname === '/mesas'
  const extraAtivo = extrasMobile.some((link) =>
    link.to === '/' ? location.pathname === '/' : location.pathname.startsWith(link.to),
  )

  return (
    <div className="min-h-svh lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-line bg-panel/80 px-4 py-5 lg:flex lg:flex-col">
        <div className="mb-6 px-2">
          <p className="text-xs tracking-[0.22em] text-gold uppercase">Distribuidora</p>
          <h1 className="titulo text-3xl text-ink">JBL</h1>
          <div className="mt-3">
            <StatusServidorBadge
              status={servidor.status}
              latencia={servidor.latencia}
              verificadoEm={servidor.verificadoEm}
              onVerificar={verificarServidor}
            />
          </div>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {links.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition ${
                    isActive ? 'bg-gold text-bg font-semibold' : 'text-muted hover:bg-panel-2 hover:text-ink'
                  }`
                }
              >
                <Icon size={18} />
                {link.label}
              </NavLink>
            )
          })}
        </nav>
        <div className="mt-4 rounded-xl border border-line bg-panel-2 p-3">
          <p className="text-xs text-muted">Caixa</p>
          {carregando ? (
            <p className="text-sm">Carregando...</p>
          ) : caixa ? (
            <>
              <p className="font-semibold text-ok">Aberto</p>
              <p className="text-xs text-muted">{dataBR(caixa.aberto_em)}</p>
            </>
          ) : (
            <p className="font-semibold text-danger">Fechado</p>
          )}
        </div>
      </aside>

      <div className="flex min-h-svh flex-col">
        <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-bg/90 px-4 py-2 backdrop-blur lg:hidden">
          <div>
            <p className="text-[11px] tracking-[0.18em] text-gold uppercase">JBL</p>
            {!pdv && <p className="text-sm text-muted">{caixa ? 'Caixa aberto' : 'Caixa fechado'}</p>}
          </div>
          <div className="flex items-center gap-2">
            {pdv && (
              <p className={`text-xs font-semibold ${caixa ? 'text-ok' : 'text-danger'}`}>
                {caixa ? 'Caixa aberto' : 'Caixa fechado'}
              </p>
            )}
            <StatusServidorBadge
              status={servidor.status}
              latencia={servidor.latencia}
              verificadoEm={servidor.verificadoEm}
              onVerificar={verificarServidor}
              compacto
            />
          </div>
        </header>
        <AvisoServidorFora status={servidor.status} onVerificar={verificarServidor} />
        {/* pb extra: reserva o canto inferior para o selo "Powered by Netlify" não cobrir o sistema */}
        <main className={pdv ? 'flex-1 overflow-hidden p-2 pb-[8.5rem] lg:p-6 lg:pb-20' : 'flex-1 p-4 pb-[8.5rem] lg:p-6 lg:pb-20'}>
          <Outlet />
        </main>

        {maisAberto && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <button className="absolute inset-0 bg-black/55" onClick={() => setMaisAberto(false)} aria-label="Fechar menu" />
            <div className="absolute inset-x-3 bottom-[8.4rem] rounded-2xl border border-line bg-panel p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="text-sm font-semibold">Mais opções</p>
                <button onClick={() => setMaisAberto(false)} className="rounded-lg p-1 text-muted" aria-label="Fechar">
                  <X size={18} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {extrasMobile.map((link) => {
                  const Icon = link.icon
                  return (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      end={link.to === '/'}
                      onClick={() => setMaisAberto(false)}
                      className={({ isActive }) =>
                        `flex items-center gap-2 rounded-xl px-3 py-3 text-sm ${
                          isActive ? 'bg-gold text-bg font-semibold' : 'bg-panel-2 text-ink'
                        }`
                      }
                    >
                      <Icon size={16} />
                      {link.label}
                    </NavLink>
                  )
                })}
              </div>
            </div>
          </div>
        )}

        <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 gap-1 border-t border-line bg-panel/95 px-1 pt-1 pb-[calc(3.75rem+env(safe-area-inset-bottom))] backdrop-blur lg:hidden">
          {atalhosMobile.map((link) => {
            const Icon = link.icon
            return (
              <NavLink
                key={link.to}
                to={link.to}
                onClick={() => setMaisAberto(false)}
                className={({ isActive }) =>
                  `flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] ${
                    isActive ? 'bg-gold text-bg' : 'text-muted'
                  }`
                }
              >
                <Icon size={16} />
                {link.label}
              </NavLink>
            )
          })}
          <button
            type="button"
            onClick={() => setMaisAberto((atual) => !atual)}
            className={`flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] ${
              maisAberto || extraAtivo ? 'bg-gold text-bg' : 'text-muted'
            }`}
          >
            <MoreHorizontal size={16} />
            Mais
          </button>
        </nav>
      </div>
    </div>
  )
}
