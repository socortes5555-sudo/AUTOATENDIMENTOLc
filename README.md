# La Corte Barbearia — sistema novo

Projeto independente para desenvolver o sistema de autoatendimento da La Corte Barbearia. Este repositório é separado do sistema antigo.

## Estado atual
Esta é uma estrutura inicial de interface e banco de dados. Ainda não possui autenticação real, sincronização de fila em tempo real, pagamentos, nem publicação configurada.

## Estrutura
- `index.html`: interface inicial
- `src/styles.css`: estilos responsivos
- `src/app.js`: comportamento inicial da interface
- `supabase/migrations/001_initial_schema.sql`: rascunho inicial do esquema SQL

## Próximas etapas
Configurar e testar o backend, autenticação, políticas de segurança (RLS), fila compartilhada, painéis e publicação gratuita. Nenhum serviço pago deve ser ativado sem autorização explícita.
