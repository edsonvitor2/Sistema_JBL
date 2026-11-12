const moeda = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
})

const dataHora = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})

const soData = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'short',
  timeZone: 'America/Sao_Paulo',
})

export function brl(valor: number | null | undefined) {
  return moeda.format(Number(valor || 0))
}

export function dataBR(iso: string | null | undefined) {
  if (!iso) return '—'
  return dataHora.format(new Date(iso))
}

export function diaBR(iso: string | null | undefined) {
  if (!iso) return '—'
  return soData.format(new Date(iso))
}

export function hojeISO() {
  const now = new Date()
  const tz = now.toLocaleString('en-CA', { timeZone: 'America/Sao_Paulo', hour12: false })
  return tz.slice(0, 10)
}

export function inicioDoDiaISO(dia: string) {
  return new Date(`${dia}T00:00:00-03:00`).toISOString()
}

export function fimDoDiaISO(dia: string) {
  return new Date(`${dia}T23:59:59.999-03:00`).toISOString()
}

export function agoraISO() {
  return new Date().toISOString()
}

export function rotuloOrigem(origem: string | null | undefined) {
  if (origem === 'balcao') return 'Balcão'
  if (origem === 'comanda') return 'Mesa'
  if (origem === 'entrega') return 'Entrega'
  if (origem === 'prazo') return 'A prazo'
  return origem || '—'
}

export function rotuloPagamento(tipo: string | null | undefined) {
  if (tipo === 'dinheiro') return 'Dinheiro'
  if (tipo === 'pix') return 'Pix'
  if (tipo === 'debito') return 'Débito'
  if (tipo === 'credito') return 'Crédito'
  if (tipo === 'prazo') return 'A prazo'
  return tipo || '—'
}

export function numeroMesa(nome: string | null | undefined) {
  if (!nome) return null
  const match = nome.match(/^Mesa\s+(\d+)$/i)
  return match ? Number(match[1]) : null
}
