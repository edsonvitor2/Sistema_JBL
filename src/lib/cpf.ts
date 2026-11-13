/** Só os números do CPF (até 11 dígitos). */
export function soDigitosCpf(valor: string) {
  return valor.replace(/\D/g, '').slice(0, 11)
}

/** Formata enquanto digita: 000.000.000-00 */
export function formatarCpf(valor: string | null | undefined) {
  const d = soDigitosCpf(valor || '')
  if (d.length <= 3) return d
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`
}

/** Confere os dígitos verificadores do CPF. */
export function cpfValido(valor: string) {
  const d = soDigitosCpf(valor)
  if (d.length !== 11 || /^(\d)\1{10}$/.test(d)) return false
  const digito = (base: string) => {
    let soma = 0
    for (let i = 0; i < base.length; i++) soma += Number(base[i]) * (base.length + 1 - i)
    const resto = (soma * 10) % 11
    return resto === 10 ? 0 : resto
  }
  return digito(d.slice(0, 9)) === Number(d[9]) && digito(d.slice(0, 10)) === Number(d[10])
}
