import { brl, dataBR, rotuloOrigem, rotuloPagamento } from './format'
import type { Venda } from './types'

export function imprimirRecibo(venda: Venda) {
  const linhas = venda.itens
    .map(
      (item) => `
      <tr>
        <td>${item.quantidade}x ${item.nome}</td>
        <td style="text-align:right">${brl(item.preco * item.quantidade)}</td>
      </tr>`,
    )
    .join('')

  const html = `<!doctype html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Recibo JBL</title>
      <style>
        body { font-family: ui-monospace, Consolas, monospace; padding: 16px; color: #111; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        p, td { font-size: 13px; }
        table { width: 100%; border-collapse: collapse; }
        hr { border: none; border-top: 1px dashed #999; margin: 12px 0; }
      </style>
    </head>
    <body>
      <h1>JBL Distribuidora</h1>
      <p>Recibo de venda</p>
      <hr />
      <p>${dataBR(venda.criado_em)}</p>
      <p>${rotuloOrigem(venda.origem)}${venda.cliente_nome ? ` · ${venda.cliente_nome}` : ''}</p>
      <table>${linhas}</table>
      <hr />
      <p><strong>Total: ${brl(venda.total)}</strong></p>
      <p>Pagamento: ${rotuloPagamento(venda.pagamento_tipo)}</p>
      ${venda.troco ? `<p>Troco: ${brl(venda.troco)}</p>` : ''}
      <hr />
      <p>Obrigado pela preferência</p>
      <script>window.print()</script>
    </body>
  </html>`

  const janela = window.open('', '_blank', 'width=360,height=640')
  if (!janela) return
  janela.document.write(html)
  janela.document.close()
}
