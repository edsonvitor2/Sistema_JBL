import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { AppProvider, useApp } from './context/AppContext'
import { Balcao } from './pages/Balcao'
import { CaixaPage } from './pages/Caixa'
import { Clientes } from './pages/Clientes'
import { Dashboard } from './pages/Dashboard'
import { Estoque } from './pages/Estoque'
import { Mesas } from './pages/Mesas'
import { Prazo } from './pages/Prazo'
import { Relatorios } from './pages/Relatorios'

function AppRoutes() {
  const { carregando, erro, recarregar } = useApp()

  if (carregando) {
    return (
      <div className="grid min-h-svh place-items-center">
        <p className="text-muted">Carregando o sistema JBL...</p>
      </div>
    )
  }

  if (erro) {
    return (
      <div className="grid min-h-svh place-items-center p-6">
        <div className="max-w-md rounded-2xl border border-danger/40 bg-panel p-6 text-center">
          <h1 className="titulo text-2xl">Não foi possível conectar</h1>
          <p className="mt-2 text-sm text-muted">{erro}</p>
          <p className="mt-3 text-xs text-muted">
            Se o sistema ficou dias sem uso, o banco (Supabase, plano gratuito) pode estar pausado. Entre em supabase.com,
            abra o projeto e clique em "Restore project". Leva 1 a 2 minutos.
          </p>
          <button onClick={() => void recarregar()} className="mt-4 rounded-xl bg-gold px-4 py-2 font-semibold text-bg">
            Tentar de novo
          </button>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/balcao" element={<Balcao />} />
        <Route path="/mesas" element={<Mesas />} />
        <Route path="/estoque" element={<Estoque />} />
        <Route path="/caixa" element={<CaixaPage />} />
        <Route path="/relatorios" element={<Relatorios />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/prazo" element={<Prazo />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  )
}
