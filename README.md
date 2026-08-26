🚀 Genesis Prospecção: Automação B2B com IA
Sistema open-source de prospecção B2B que automatiza da descoberta de leads ao disparo de WhatsApp, com CRM integrado e rate-limit inteligente para evitar banimentos.

⚡ Arquitetura do Sistema
flowchart LR    A[1. Pesquisa de Nicho] --> B[2. Coleta & Validação]    B --> C[3. CRM Pipeline]    C --> D[4. Disparo WhatsApp]        B -.->|CNPJ, Telefone, Site| E[(Leads Qualificados)]    D -.->|Aquecimento + Rate Limit| F[(Mensagens Enviadas)]

🎯 O que torna este projeto diferente?
Zero Custo de Início: Usa OpenStreetMap por padrão (sem chaves de API necessárias).
Anti-Banimento Nativo: Sistema de aquecimento de número e limitação de 60 ações/dia com pausas aleatórias.
Validação Real: Confirma se a empresa está ativa via CNPJ antes de qualquer contato.
Pipeline Testado: Lógica validada ponta a ponta com dados reais de exemplo.


🛠️ Stack Principal
Backend: Node.js, Playwright (Stealth)
WhatsApp: Baileys
CRM: Twenty (Open Source)
Orquestração: Opcional via n8n
