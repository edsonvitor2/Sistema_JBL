import { ScanBarcode } from 'lucide-react'
import { useMemo, useState } from 'react'
import { BarcodeScanner } from '../components/BarcodeScanner'
import { Modal } from '../components/Modal'
import { buscarPorCodigo } from '../lib/codigo'
import { useApp } from '../context/AppContext'
import { estoqueBaixo } from '../lib/estoque'
import { agoraISO, brl } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Produto } from '../lib/types'

const vazio = {
  nome: '',
  descricao: '',
  preco: '',
  custo: '',
  quantidade: '',
  estoque_minimo: '5',
  codigo_barras: '',
}

export function Estoque() {
  const { produtos, recarregarProdutos } = useApp()
  const [busca, setBusca] = useState('')
  const [soBaixos, setSoBaixos] = useState(false)
  const [form, setForm] = useState(vazio)
  const [editando, setEditando] = useState<Produto | null>(null)
  const [aberto, setAberto] = useState(false)
  const [ajuste, setAjuste] = useState<Produto | null>(null)
  const [qtdAjuste, setQtdAjuste] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [camera, setCamera] = useState<'busca' | 'form' | null>(null)

  function lerCodigo(codigo: string) {
    if (camera === 'busca') {
      setBusca(codigo)
      return { ok: true, mensagem: codigo }
    }
    const outro = buscarPorCodigo(produtos, codigo)
    if (outro && outro.id !== editando?.id) {
      return { ok: false, mensagem: `Código já usado em ${outro.nome}` }
    }
    setForm((atual) => ({ ...atual, codigo_barras: codigo }))
    return { ok: true, mensagem: codigo }
  }

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase()
    return produtos.filter((produto) => {
      const bate = !termo || produto.nome.toLowerCase().includes(termo) || (produto.codigo_barras || '').includes(termo)
      return bate && (!soBaixos || estoqueBaixo(produto))
    })
  }, [busca, produtos, soBaixos])

  function abrirNovo() {
    setEditando(null)
    setForm(vazio)
    setAberto(true)
  }

  function abrirEdicao(produto: Produto) {
    setEditando(produto)
    setForm({
      nome: produto.nome,
      descricao: produto.descricao || '',
      preco: String(produto.preco),
      custo: String(produto.custo),
      quantidade: String(produto.quantidade),
      estoque_minimo: String(produto.estoque_minimo),
      codigo_barras: produto.codigo_barras || '',
    })
    setAberto(true)
  }

  async function salvar() {
    setErro(null)
    const payload = {
      nome: form.nome.trim(),
      descricao: form.descricao.trim(),
      preco: Number(form.preco || 0),
      custo: Number(form.custo || 0),
      quantidade: Number(form.quantidade || 0),
      estoque_minimo: Number(form.estoque_minimo || 0),
      codigo_barras: form.codigo_barras.trim(),
      atualizado_em: agoraISO(),
    }
    if (!payload.nome) {
      setErro('Informe o nome do produto')
      return
    }
    const query = editando
      ? supabase.from('produtos').update(payload).eq('id', editando.id)
      : supabase.from('produtos').insert({ ...payload, criado_em: agoraISO() })
    const { error } = await query
    if (error) {
      setErro(error.message)
      return
    }
    setAberto(false)
    await recarregarProdutos()
  }

  async function aplicarAjuste() {
    if (!ajuste) return
    const { error } = await supabase
      .from('produtos')
      .update({ quantidade: Number(qtdAjuste || 0), atualizado_em: agoraISO() })
      .eq('id', ajuste.id)
    if (error) {
      setErro(error.message)
      return
    }
    setAjuste(null)
    await recarregarProdutos()
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-gold">Catálogo</p>
          <h1 className="titulo text-3xl">Estoque</h1>
        </div>
        <button onClick={abrirNovo} className="rounded-xl bg-gold px-4 py-2 font-semibold text-bg">
          Novo produto
        </button>
      </div>

      <div className="flex flex-wrap gap-3">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar produto"
          className="min-w-64 flex-1 rounded-xl border border-line bg-panel px-3 py-2"
        />
        <button
          onClick={() => setCamera('busca')}
          className="flex items-center gap-2 rounded-xl border border-line bg-panel px-3 py-2 text-gold"
          aria-label="Buscar pela câmera"
        >
          <ScanBarcode size={18} />
          Câmera
        </button>
        <label className="flex items-center gap-2 text-sm text-muted">
          <input type="checkbox" checked={soBaixos} onChange={(e) => setSoBaixos(e.target.checked)} />
          Só estoque baixo
        </label>
      </div>

      <div className="overflow-hidden rounded-2xl border border-line">
        <div className="scroll-fino max-h-[70vh] overflow-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="sticky top-0 bg-panel-2 text-muted">
              <tr>
                <th className="px-3 py-3 font-medium">Produto</th>
                <th className="px-3 py-3 font-medium">Preço</th>
                <th className="px-3 py-3 font-medium">Custo</th>
                <th className="px-3 py-3 font-medium">Estoque</th>
                <th className="px-3 py-3 font-medium">Mínimo</th>
                <th className="px-3 py-3 font-medium">Código</th>
                <th className="px-3 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {lista.map((produto) => (
                <tr key={produto.id} className="border-t border-line bg-panel">
                  <td className="px-3 py-3">{produto.nome}</td>
                  <td className="px-3 py-3 text-gold">{brl(produto.preco)}</td>
                  <td className="px-3 py-3">{brl(produto.custo)}</td>
                  <td className={`px-3 py-3 ${estoqueBaixo(produto) ? 'text-warn' : ''}`}>{produto.quantidade}</td>
                  <td className="px-3 py-3">{produto.estoque_minimo}</td>
                  <td className="px-3 py-3 text-muted">{produto.codigo_barras || '—'}</td>
                  <td className="px-3 py-3 text-right">
                    <button className="mr-2 text-gold" onClick={() => abrirEdicao(produto)}>
                      Editar
                    </button>
                    <button
                      className="text-muted"
                      onClick={() => {
                        setAjuste(produto)
                        setQtdAjuste(String(produto.quantidade))
                      }}
                    >
                      Ajustar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-sm text-muted">{lista.length} produto(s)</p>

      <Modal aberto={aberto} titulo={editando ? 'Editar produto' : 'Novo produto'} onFechar={() => setAberto(false)}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} className="sm:col-span-2" />
          <Campo label="Descrição" value={form.descricao} onChange={(v) => setForm({ ...form, descricao: v })} className="sm:col-span-2" />
          <Campo label="Preço" value={form.preco} onChange={(v) => setForm({ ...form, preco: v })} tipo="number" />
          <Campo label="Custo" value={form.custo} onChange={(v) => setForm({ ...form, custo: v })} tipo="number" />
          <Campo label="Quantidade" value={form.quantidade} onChange={(v) => setForm({ ...form, quantidade: v })} tipo="number" />
          <Campo label="Estoque mínimo" value={form.estoque_minimo} onChange={(v) => setForm({ ...form, estoque_minimo: v })} tipo="number" />
          <div className="flex items-end gap-2 sm:col-span-2">
            <Campo label="Código de barras" value={form.codigo_barras} onChange={(v) => setForm({ ...form, codigo_barras: v })} className="flex-1" />
            <button
              type="button"
              onClick={() => setCamera('form')}
              className="rounded-xl bg-gold p-2.5 text-bg"
              aria-label="Ler código pela câmera"
            >
              <ScanBarcode size={20} />
            </button>
          </div>
        </div>
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
        <button onClick={() => void salvar()} className="mt-4 w-full rounded-xl bg-gold py-3 font-semibold text-bg">
          Salvar
        </button>
      </Modal>

      <Modal aberto={!!ajuste} titulo={`Ajustar estoque · ${ajuste?.nome || ''}`} onFechar={() => setAjuste(null)}>
        <Campo label="Nova quantidade" value={qtdAjuste} onChange={setQtdAjuste} tipo="number" />
        <button onClick={() => void aplicarAjuste()} className="mt-4 w-full rounded-xl bg-gold py-3 font-semibold text-bg">
          Confirmar
        </button>
      </Modal>

      <BarcodeScanner
        aberto={camera !== null}
        continuo={false}
        titulo={camera === 'busca' ? 'Buscar produto' : 'Código do produto'}
        onFechar={() => setCamera(null)}
        onLer={lerCodigo}
      />
    </div>
  )
}

function Campo({
  label,
  value,
  onChange,
  tipo = 'text',
  className = '',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  tipo?: string
  className?: string
}) {
  return (
    <label className={`block text-sm text-muted ${className}`}>
      {label}
      <input
        type={tipo}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border border-line bg-panel-2 px-3 py-2 text-ink"
      />
    </label>
  )
}
