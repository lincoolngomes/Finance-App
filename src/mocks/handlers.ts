import { setupServer } from 'msw'
import { rest } from 'msw'

export const server = setupServer(
  rest.get('/.netlify/functions/cvm-fundos', (req, res, ctx) => {
    const cnpj = req.url.searchParams.get('cnpj')
    
    console.log('[MSW] Mock handler chamado para CNPJ:', cnpj)
    
    // Base de fundos local
    const fundosLocais: Record<string, any> = {
      '37110110000116': {
        cnpj: '37.110.110/0001-16',
        nome: 'Fundo Previdência Privada',
        valorCota: 10.5234,
        dataReferencia: '15/01/2026',
        patrimonioLiquido: 150000000,
      },
    }
    
    const fundo = fundosLocais[cnpj || '']
    
    if (fundo) {
      console.log('[MSW] Fundo encontrado:', fundo)
      return res(ctx.json(fundo))
    }
    
    console.log('[MSW] Fundo não encontrado')
    return res(
      ctx.status(404),
      ctx.json({
        error: 'Fundo não encontrado',
        cnpj,
        mensagem: 'O CNPJ não foi encontrado na base de dados.',
      })
    )
  })
)
