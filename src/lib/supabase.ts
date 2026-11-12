import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

/** true quando o build foi feito sem as variáveis do Supabase (ex.: faltou cadastrar no Netlify). */
export const configFaltando = !url || !key

// Com config faltando, cria um cliente "vazio" só para o app não quebrar ao carregar;
// o App mostra uma tela explicando o que configurar.
export const supabase = createClient(url || 'https://config-faltando.invalid', key || 'config-faltando')
