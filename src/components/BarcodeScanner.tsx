import { Flashlight, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

export type ResultadoLeitura = { ok: boolean; mensagem: string }

type Props = {
  aberto: boolean
  onFechar: () => void
  /** Chamado a cada código lido. Retorne uma mensagem para exibir na tela. */
  onLer: (codigo: string) => ResultadoLeitura | void | Promise<ResultadoLeitura | void>
  /** Se true, a câmera continua aberta para ler vários produtos seguidos. */
  continuo?: boolean
  titulo?: string
}

type DetectorNativo = {
  detect: (fonte: HTMLVideoElement) => Promise<Array<{ rawValue: string }>>
}

type DetectorNativoCtor = {
  new (opcoes?: { formats?: string[] }): DetectorNativo
  getSupportedFormats?: () => Promise<string[]>
}

const FORMATOS = ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'itf', 'qr_code']
const MESMO_CODIGO_MS = 2000
const ENTRE_LEITURAS_MS = 700

export function BarcodeScanner({ aberto, onFechar, onLer, continuo = true, titulo = 'Ler código de barras' }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const onLerRef = useRef(onLer)
  const onFecharRef = useRef(onFechar)
  const trackRef = useRef<MediaStreamTrack | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<ResultadoLeitura | null>(null)
  const [temLanterna, setTemLanterna] = useState(false)
  const [lanterna, setLanterna] = useState(false)

  useEffect(() => {
    onLerRef.current = onLer
    onFecharRef.current = onFechar
  })

  useEffect(() => {
    if (!aberto) return
    const videoEl = videoRef.current
    let cancelado = false
    let stream: MediaStream | null = null
    let pararLoop: (() => void) | null = null
    let ultimoCodigo = ''
    let ultimoEm = 0
    let processando = false
    let timerAviso: ReturnType<typeof setTimeout> | undefined

    setErro(null)
    setAviso(null)
    setLanterna(false)
    setTemLanterna(false)

    async function tratar(codigo: string) {
      const agora = Date.now()
      if (processando) return
      if (agora - ultimoEm < ENTRE_LEITURAS_MS) return
      if (codigo === ultimoCodigo && agora - ultimoEm < MESMO_CODIGO_MS) return
      ultimoCodigo = codigo
      ultimoEm = agora
      processando = true
      try {
        const resultado = await onLerRef.current(codigo)
        if (cancelado) return
        const final = resultado || { ok: true, mensagem: codigo }
        sinalizar(final.ok)
        setAviso(final)
        clearTimeout(timerAviso)
        timerAviso = setTimeout(() => setAviso(null), 2200)
        if (!continuo && final.ok) onFecharRef.current()
      } finally {
        processando = false
      }
    }

    async function iniciar() {
      if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
        setErro('A câmera só funciona com HTTPS (ou localhost). Abra o sistema por um endereço https://.')
        return
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
        })
      } catch (e) {
        const nome = e instanceof DOMException ? e.name : ''
        setErro(
          nome === 'NotAllowedError'
            ? 'Permissão da câmera negada. Libere a câmera nas configurações do navegador.'
            : 'Não foi possível abrir a câmera.',
        )
        return
      }
      if (cancelado) {
        stream.getTracks().forEach((t) => t.stop())
        return
      }

      const track = stream.getVideoTracks()[0]
      trackRef.current = track
      const caps = (track.getCapabilities?.() || {}) as MediaTrackCapabilities & { torch?: boolean; focusMode?: string[] }
      setTemLanterna(!!caps.torch)
      if (caps.focusMode?.includes('continuous')) {
        void track.applyConstraints({ advanced: [{ focusMode: 'continuous' } as MediaTrackConstraintSet] }).catch(() => {})
      }

      const video = videoEl
      if (!video) return
      video.srcObject = stream
      await video.play().catch(() => {})

      const Nativo = (window as unknown as { BarcodeDetector?: DetectorNativoCtor }).BarcodeDetector
      let detector: DetectorNativo | null = null
      if (Nativo) {
        try {
          const suportados = (await Nativo.getSupportedFormats?.()) || FORMATOS
          const formats = FORMATOS.filter((f) => suportados.includes(f))
          if (formats.length) detector = new Nativo({ formats })
        } catch {
          detector = null
        }
      }

      if (detector) {
        // Leitor nativo do Android/Chrome: rápido e leve.
        const d = detector
        let rodando = true
        pararLoop = () => {
          rodando = false
        }
        const loop = async () => {
          while (rodando && !cancelado) {
            if (video.readyState >= 2) {
              try {
                const achados = await d.detect(video)
                if (achados[0]?.rawValue) void tratar(achados[0].rawValue.trim())
              } catch {
                /* frame ruim, segue */
              }
            }
            await new Promise((r) => setTimeout(r, 120))
          }
        }
        void loop()
      } else {
        // Fallback (Safari/iPad, Firefox): ZXing em JavaScript.
        const { BrowserMultiFormatReader } = await import('@zxing/browser')
        const { BarcodeFormat, DecodeHintType } = await import('@zxing/library')
        if (cancelado) return
        const hints = new Map()
        hints.set(DecodeHintType.POSSIBLE_FORMATS, [
          BarcodeFormat.EAN_13,
          BarcodeFormat.EAN_8,
          BarcodeFormat.UPC_A,
          BarcodeFormat.UPC_E,
          BarcodeFormat.CODE_128,
          BarcodeFormat.CODE_39,
          BarcodeFormat.ITF,
          BarcodeFormat.QR_CODE,
        ])
        const leitor = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 120 })
        const controles = await leitor.decodeFromStream(stream, video, (resultado) => {
          if (resultado) void tratar(resultado.getText().trim())
        })
        pararLoop = () => controles.stop()
        if (cancelado) controles.stop()
      }
    }

    void iniciar()

    return () => {
      cancelado = true
      clearTimeout(timerAviso)
      pararLoop?.()
      stream?.getTracks().forEach((t) => t.stop())
      trackRef.current = null
      if (videoEl) videoEl.srcObject = null
    }
  }, [aberto, continuo])

  async function alternarLanterna() {
    const track = trackRef.current
    if (!track) return
    const novo = !lanterna
    try {
      await track.applyConstraints({ advanced: [{ torch: novo } as MediaTrackConstraintSet] })
      setLanterna(novo)
    } catch {
      setTemLanterna(false)
    }
  }

  if (!aberto) return null

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex shrink-0 items-center justify-between px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <p className="font-semibold text-ink">{titulo}</p>
        <div className="flex items-center gap-2">
          {temLanterna && (
            <button
              onClick={() => void alternarLanterna()}
              className={`rounded-xl p-2.5 ${lanterna ? 'bg-gold text-bg' : 'bg-panel-2 text-ink'}`}
              aria-label="Lanterna"
            >
              <Flashlight size={20} />
            </button>
          )}
          <button onClick={onFechar} className="rounded-xl bg-panel-2 p-2.5 text-ink" aria-label="Fechar câmera">
            <X size={20} />
          </button>
        </div>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        <video ref={videoRef} playsInline muted className="absolute inset-0 h-full w-full object-cover" />
        {!erro && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-[38%] w-[78%] max-w-xl rounded-2xl border-2 border-gold/90 shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
              <div className="absolute inset-x-4 top-1/2 h-0.5 -translate-y-1/2 animate-pulse bg-danger/80" />
            </div>
          </div>
        )}
        {erro && (
          <div className="absolute inset-0 flex items-center justify-center p-6">
            <p className="max-w-sm rounded-2xl border border-line bg-panel p-5 text-center text-ink">{erro}</p>
          </div>
        )}
        {aviso && (
          <div className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center px-4">
            <p
              className={`rounded-2xl px-5 py-3 text-center font-semibold shadow-xl ${
                aviso.ok ? 'bg-ok text-bg' : 'bg-danger text-ink'
              }`}
            >
              {aviso.mensagem}
            </p>
          </div>
        )}
      </div>

      <p className="shrink-0 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] text-center text-sm text-muted">
        {continuo ? 'Aponte para o código. A câmera continua aberta para o próximo item.' : 'Aponte para o código de barras.'}
      </p>
    </div>
  )
}

let audio: AudioContext | null = null

function sinalizar(ok: boolean) {
  try {
    navigator.vibrate?.(ok ? 60 : [80, 60, 80])
    audio = audio || new AudioContext()
    const osc = audio.createOscillator()
    const ganho = audio.createGain()
    osc.frequency.value = ok ? 1250 : 320
    ganho.gain.value = 0.12
    osc.connect(ganho).connect(audio.destination)
    osc.start()
    osc.stop(audio.currentTime + (ok ? 0.09 : 0.25))
  } catch {
    /* sem som, tudo bem */
  }
}
