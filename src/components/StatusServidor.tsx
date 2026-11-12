import { RefreshCw } from 'lucide-react'
import type { StatusServidor } from '../lib/useStatusServidor'

const info: Record<StatusServidor, { texto: string; cor: string; ponto: string }> = {
  verificando: { texto: 'Verificando servidor', cor: 'text-muted', ponto: 'bg-muted animate-pulse' },
  online: { texto: 'Servidor online', cor: 'text-ok', ponto: 'bg-ok' },
  lento: { texto: 'Servidor lento', cor: 'text-warn', ponto: 'bg-warn' },
  'sem-internet': { texto: 'Sem internet', cor: 'text-danger', ponto: 'bg-danger animate-pulse' },
  fora: { texto: 'Servidor fora do ar', cor: 'text-danger', ponto: 'bg-danger animate-pulse' },
}

type Props = {
  status: StatusServidor
  latencia: number | null
  verificadoEm: Date | null
  onVerificar: () => void
  compacto?: boolean
}

export function StatusServidorBadge({ status, latencia, verificadoEm, onVerificar, compacto }: Props) {
  const { texto, cor, ponto } = info[status]
  const hora = verificadoEm?.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  return (
    <button
      type="button"
      onClick={onVerificar}
      title={hora ? `Verificado às ${hora} · toque para verificar agora` : 'Toque para verificar agora'}
      className={`flex items-center gap-2 rounded-full border border-line bg-panel-2 px-3 py-1 text-xs font-semibold ${cor}`}
    >
      <span className={`h-2 w-2 shrink-0 rounded-full ${ponto}`} />
      <span>{compacto && (status === 'online' || status === 'lento') ? 'Online' : texto}</span>
      {latencia !== null && !compacto && <span className="font-normal text-muted">{latencia} ms</span>}
    </button>
  )
}

export function AvisoServidorFora({ status, onVerificar }: { status: StatusServidor; onVerificar: () => void }) {
  if (status !== 'fora' && status !== 'sem-internet') return null
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-danger/40 bg-danger/15 px-4 py-2 text-sm text-ink">
      <p>
        {status === 'sem-internet' ? (
          <>
            <strong>Sem internet.</strong> Verifique o Wi-Fi do aparelho. As vendas não serão salvas até a conexão voltar.
          </>
        ) : (
          <>
            <strong>Servidor fora do ar.</strong> No plano gratuito o Supabase pausa após dias sem uso. Entre em
            supabase.com e clique em "Restore project".
          </>
        )}
      </p>
      <button
        type="button"
        onClick={onVerificar}
        className="flex items-center gap-1.5 rounded-lg bg-panel-2 px-3 py-1.5 text-xs font-semibold text-gold"
      >
        <RefreshCw size={14} />
        Verificar agora
      </button>
    </div>
  )
}
