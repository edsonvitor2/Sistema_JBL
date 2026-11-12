import { useState } from 'react'
import { Modal } from '../components/Modal'
import { useApp } from '../context/AppContext'
import { agoraISO } from '../lib/format'
import { supabase } from '../lib/supabase'
import type { Cliente } from '../lib/types'

const vazio = { nome: '', telefone: '', email: '', endereco: '' }

export function Clientes() {
  const { clientes, recarregar } = useApp()
  const [aberto, setAberto] = useState(false)
  const [form, setForm] = useState(vazio)
  const [editando, setEditando] = useState<Cliente | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  function abrir(cliente?: Cliente) {
    setEditando(cliente || null)
    setForm(
      cliente
        ? {
            nome: cliente.nome,
            telefone: cliente.telefone || '',
            email: cliente.email || '',
            endereco: cliente.endereco || '',
          }
        : vazio,
    )
    setAberto(true)
  }

  async function salvar() {
    if (!form.nome.trim()) {
      setErro('Informe o nome')
      return
    }
    const payload = {
      nome: form.nome.trim(),
      telefone: form.telefone,
      email: form.email,
      endereco: form.endereco,
      atualizado_em: agoraISO(),
    }
    const query = editando
      ? supabase.from('clientes').update(payload).eq('id', editando.id)
      : supabase.from('clientes').insert({ ...payload, criado_em: agoraISO() })
    const { error } = await query
    if (error) {
      setErro(error.message)
      return
    }
    setAberto(false)
    await recarregar()
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-gold">Cadastro</p>
          <h1 className="titulo text-3xl">Clientes</h1>
        </div>
        <button onClick={() => abrir()} className="rounded-xl bg-gold px-4 py-2 font-semibold text-bg">
          Novo cliente
        </button>
      </div>
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {clientes.map((cliente) => (
          <button
            key={cliente.id}
            onClick={() => abrir(cliente)}
            className="rounded-2xl border border-line bg-panel p-4 text-left hover:border-gold"
          >
            <p className="font-semibold">{cliente.nome}</p>
            <p className="text-sm text-muted">{cliente.telefone || 'Sem telefone'}</p>
            <p className="text-sm text-muted">{cliente.endereco || 'Sem endereço'}</p>
          </button>
        ))}
        {clientes.length === 0 && <p className="text-muted">Nenhum cliente cadastrado.</p>}
      </div>

      <Modal aberto={aberto} titulo={editando ? 'Editar cliente' : 'Novo cliente'} onFechar={() => setAberto(false)}>
        <div className="space-y-3">
          <Campo label="Nome" value={form.nome} onChange={(v) => setForm({ ...form, nome: v })} />
          <Campo label="Telefone" value={form.telefone} onChange={(v) => setForm({ ...form, telefone: v })} />
          <Campo label="E-mail" value={form.email} onChange={(v) => setForm({ ...form, email: v })} />
          <Campo label="Endereço" value={form.endereco} onChange={(v) => setForm({ ...form, endereco: v })} />
        </div>
        {erro && <p className="mt-3 text-sm text-danger">{erro}</p>}
        <button onClick={() => void salvar()} className="mt-4 w-full rounded-xl bg-gold py-3 font-semibold text-bg">
          Salvar
        </button>
      </Modal>
    </div>
  )
}

function Campo({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block text-sm text-muted">
      {label}
      <input value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border border-line bg-panel-2 px-3 py-2 text-ink" />
    </label>
  )
}
