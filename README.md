# Sistema JBL

Sistema simples para a distribuidora: venda de balcão, mesas, estoque, caixa e relatórios. Usa o banco já existente no Supabase.

## Como abrir

```bash
npm install
npm run dev
```

Abra o endereço que aparecer no terminal, em geral `http://localhost:5173`.

## O que o sistema faz

- Abre e fecha caixa, com sangria e conferência por forma de pagamento
- Venda no balcão e venda a prazo
- Mesas/comandas: lança item, baixa estoque na hora e fecha a conta
- Controle de estoque: cadastro, ajuste e alerta de mínimo
- Relatórios por período, origem, pagamento e produtos mais vendidos
- Clientes e recebimento de vendas a prazo

Toda venda finalizada baixa o estoque do produto.

## Leitor de código de barras (câmera do tablet)

No Balcão, nas Mesas e no Estoque há um botão **Câmera** que lê o código de barras
(EAN-13, EAN-8, UPC, Code 128, Code 39, ITF e QR). Em Mesas/Balcão a câmera fica aberta
e cada leitura lança +1 do produto, com bipe e vibração.

O navegador só libera a câmera em **HTTPS**. O `npm run dev` já sobe em HTTPS com
certificado próprio: no tablet, abra `https://IP-DO-PC:5173` e aceite o aviso
"conexão não é particular" uma vez (Avançado → Continuar). Em produção, hospede em
um serviço com HTTPS (Vercel, Netlify etc.).

Leitores USB/Bluetooth também funcionam: eles digitam o código no campo de busca e dão Enter.

## Configuração

As chaves ficam no arquivo `.env`:

```
VITE_SUPABASE_URL=https://seu-projeto.supabase.co
VITE_SUPABASE_ANON_KEY=sua-chave-anon
```

Não coloque a chave `service_role` no frontend.
