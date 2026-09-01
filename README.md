# 🧩 Antoni — Histórias Mágicas & Alfabetização Infantil 📚

<div align="center">
  <img src="assets/logo.jpg" alt="Antoni Logo" width="220" style="border-radius: 28px; box-shadow: 0 10px 25px rgba(124, 58, 237, 0.3);" />

  <p><strong>Um aplicativo interativo para ajudar crianças a aprenderem a ler e a escrever a partir das suas próprias histórias!</strong></p>

  [![React Native](https://img.shields.io/badge/React%20Native-Expo%20Web-61DAFB?logo=react&logoColor=black)](https://reactnative.dev/)
  [![Node.js](https://img.shields.io/badge/Backend-Node.js%20Express-339933?logo=nodedotjs&logoColor=white)](https://nodejs.org/)
  [![Claude AI](https://img.shields.io/badge/AI-Claude%20Haiku-D97706?logo=anthropic&logoColor=white)](https://anthropic.com/)
  [![Docker](https://img.shields.io/badge/Deploy-Docker%20Compose-2496ED?logo=docker&logoColor=white)](https://www.docker.com/)
</div>

---

## 🌟 Sobre o Projeto

O **Antoni** foi projetado para crianças em fase de alfabetização (5 a 7 anos). Em vez de exercícios genéricos e repetitivos, a criança é a autora de suas próprias aventuras:

1. **A criança conta uma historinha com a própria voz** 🎤
2. **A IA organiza o texto e extrai palavras-chave ilustradas** 🧩
3. **A criança lê as sílabas, arrasta as figurinhas para os espaços certos e completa o livro** 🔤
4. **O app lê a história com voz brasileira e efeito karaokê** 🇧🇷
5. **A criança desenha a capa, grava sua própria leitura e guarda na sua estante** 🎨📚

---

## ✨ Funcionalidades Principais

### 🎤 1. Reconhecimento de Voz & Whisper AI
- Gravação direta do microfone via **Web Audio API** (PCM WAV 16kHz).
- Transcrição precisa em Português do Brasil com modelo **Whisper AI** no backend, sem depender de recursos externos de navegadores.

### 🧩 2. Motor de Lacunas Adaptáveis (3 a 6 Figurinhas)
- Para frases curtas: gera **3 figurinhas** essenciais (ex: `GALINHA`, `PINTINHOS`, `NINHO`).
- Para histórias longas e ricas: escala dinamicamente para **4, 5 ou até 6 figurinhas** com ícones temáticos coloridos.

### 🎲 3. Desafio Pedagógico de Embaralhamento
- Ao carregar o jogo, as figurinhas são apresentadas e, após um segundo, **embaralham-se em ordem aleatória**.
- Isso incentiva a criança a **ler ativamente a palavra e as sílabas**, impedindo cliques automáticos sem leitura.

### 🔤 4. Separação Silábica Precisa em Português
- Motor fonológico com suporte a dígrafos inseparáveis (`NH`, `LH`, `CH`, `GU`, `QU`), encontros consonantais (`BR`, `TR`, `CL`, etc.) e divisão de dígrafos separáveis (`RR`, `SS`):
  - `GALINHA` $\rightarrow$ `GA · LI · NHA`
  - `PINTINHOS` $\rightarrow$ `PIN · TI · NHOS`
  - `CACHORRO` $\rightarrow$ `CA · CHOR · RO`

### 🇧🇷 5. Voz Brasileira (`pt-BR`) & Karaokê Sincronizado
- Síntese de voz com seleção explícita de vozes brasileiras (*Google Português*, *Luciana*, *Felipe*).
- Destaque em amarelo (marca-texto) **sincronizado milissegundo a milissegundo** com a pronúncia via eventos nativos de limite de palavras (`onboundary`).

### 🔊 6. Efeitos Sonoros Lúdicos
- **Nudge suave:** Som de *"boop-boop"* acolhedor ao errar o espaço.
- **Pop cristalino:** Som satisfatório ao acertar a figurinha no lugar.
- **Fanfarra alegre:** Acorde musical de comemoração ao completar toda a historinha!

### 🎨 7. Desenho da Capa & Gravação da Voz da Criança
- Quadro de pintura digital com cores vibrantes e pincel responsivo.
- Opção para a própria criança tentar ler em voz alta e gravar o áudio no livro.

### 🧠 8. Seletor Multi-IA & BYOK (Bring Your Own Key)
- Permite que o usuário ou educador escolha a IA de sua preferência com 1 clique direto no topo do aplicativo:
  - 🟣 **Anthropic Claude** (`claude-3-5-haiku`, `claude-3-5-sonnet`)
  - 🔵 **Google Gemini / AI Studio** (`gemini-2.0-flash`, `gemini-1.5-pro`)
  - ⚪ **xAI Grok** (`grok-2-latest`, `grok-beta`)
  - 🟢 **OpenAI** (`gpt-4o-mini`, `gpt-4o`)
  - 🟠 **Devin / Custom** (compatível com OpenRouter, DeepSeek, Ollama e qualquer endpoint padrão OpenAI)
- **Segurança & Privacidade:** As chaves de API coladas no aplicativo são mantidas no navegador do usuário (`localStorage`), sem serem expostas ou compartilhadas.
- **Teste de Conexão em Tempo Real:** Botão para testar a comunicação com a API selecionada antes de começar a criar histórias.

### 📚 9. Minha Estante Infinita (IndexedDB)
- Armazenamento permanente via banco de dados nativo do navegador (**IndexedDB**), permitindo guardar **infinitas histórias** sem as restrições de 5MB do `localStorage`.
- Leitor interativo com capa personalizada, áudio do narrador e gravação da criança.

### 📦 10. Backup em ZIP & Compartilhamento via AirDrop
- **Exportação Completa da Coleção (.ZIP):** Empacota todas as historinhas com pastas organizadas:
  - `README.md` (resumo legível em Markdown)
  - `livros.json` (metadados estruturados para IAs e outros apps)
  - `capas/` (ilustrações em alta resolução)
  - `vozes/` (gravações de áudio em formato PCM WAV)
- **Compartilhamento por AirDrop:** Integração com a Folha de Compartilhamento Nativa do iOS e macOS para enviar livros individuais ou a biblioteca inteira instantaneamente por AirDrop ou WhatsApp.
- **Importador de Livros:** Restauração em 1 clique de arquivos `.zip` ou `.json` em outro navegador ou dispositivo.

---

## 🛠️ Arquitetura & Tecnologias

```
antoni/
├── assets/                     # Imagens e logo da aplicação
├── backend/                    # Servidor Node.js Express + Whisper STT + Multi-AI Router
│   ├── Dockerfile              # Imagem Node.js Slim com glibc para ONNX Runtime
│   ├── index.js                # Endpoints /api/parse (Claude, Gemini, Grok, OpenAI) e /api/transcribe
│   └── package.json
├── src/                        # Aplicação React Native (Expo Web)
│   ├── components/             # AudioBar, StickerCard, GapSlot, DrawingCover, AIProviderModal, etc.
│   ├── lib/                    # aiParser, soundEffects, syllables, tts, useSpeechRecorder, zipBackup
│   ├── screens/                # StoryRecorderScreen, GameCanvasScreen, BookshelfScreen
│   └── store/                  # Zustand (gameStore, bookshelfStore [IndexedDB], aiProviderStore)
├── docker-compose.yml          # Orquestração dos containers Web (Nginx), API (Node) e Cloudflare Tunnel
├── Dockerfile.web              # Build estático do Expo Web servido via Nginx
└── nginx.conf                  # Proxy reverso e headers anti-cache
```

---

## 🚀 Como Executar o Projeto

### Pré-requisitos
- [Docker](https://www.docker.com/) e Docker Compose instalados
- Pelo menos uma chave de API (Anthropic, Google Gemini, xAI ou OpenAI)

### 1. Configurar as Variáveis de Ambiente (Opcional)
Crie um arquivo `.env` na raiz do projeto para definir as chaves padrão do servidor (os usuários também podem colar suas próprias chaves direto na interface):

```env
# Provedor padrão (Claude)
ANTHROPIC_API_KEY=sua_chave_anthropic_aqui

# Provedores adicionais (opcional)
GEMINI_API_KEY=sua_chave_gemini_aqui
XAI_API_KEY=sua_chave_xai_grok_aqui
OPENAI_API_KEY=sua_chave_openai_aqui
```

### 2. Rodar com Docker Compose (Recomendado)
```bash
docker compose up --build -d
```

Abra seu navegador em:
👉 **[http://localhost:8080](http://localhost:8080)**

---

## 📄 Licença

Este projeto é de uso pessoal e educacional. Todos os direitos reservados.
