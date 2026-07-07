# 🚀 Guia de Configuração — Firebase & Hospedagem
**Usinagem e Solda de Precisão — Website**

---

## Pré-requisitos
- Conta Google (gmail.com)
- Navegador moderno

---

## Passo 1 — Criar Projeto no Firebase (~3 minutos)

1. Acesse [https://console.firebase.google.com/](https://console.firebase.google.com/)
2. Clique em **"Criar um projeto"**
3. Dê um nome ao projeto (ex: `usinagem-precisao`)
4. Desative o Google Analytics (opcional) → **Criar projeto**
5. Aguarde a criação e clique em **Continuar**

---

## Passo 2 — Configurar o Firestore (Banco de Dados)

1. No menu lateral, clique em **"Build"** → **"Firestore Database"**
2. Clique em **"Criar banco de dados"**
3. Selecione **"Iniciar no modo de produção"** → escolha a região `us-east1` → **Concluir**
4. Vá em **"Regras"** e substitua o conteúdo por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Leitura pública para o site
    match /company/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /services/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /testimonials/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /clients/{doc} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /contacts/{doc} {
      allow create: if true;
      allow read, update, delete: if request.auth != null;
    }
  }
}
```

5. Clique em **"Publicar"**

---

## Passo 3 — Configurar o Storage (Armazenamento de Imagens)

1. No menu lateral, clique em **"Build"** → **"Storage"**
2. Clique em **"Primeiros passos"** → **"Avançar"** → **"Concluir"**
3. Vá em **"Regras"** e substitua por:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

4. Clique em **"Publicar"**

---

## Passo 4 — Configurar a Autenticação (Login Admin)

1. No menu lateral, clique em **"Build"** → **"Authentication"**
2. Clique em **"Primeiros passos"**
3. Clique em **"E-mail/senha"** → Ative a primeira opção → **Salvar**
4. Clique na aba **"Usuários"** → **"Adicionar usuário"**
5. Digite o e-mail e senha do administrador → **Adicionar usuário**

> ⚠️ Guarde o e-mail e senha em local seguro. Você usará para fazer login no painel.

---

## Passo 5 — Obter as Credenciais do Firebase

1. Clique na engrenagem ⚙️ ao lado de **"Visão geral do projeto"** → **"Configurações do projeto"**
2. Role para baixo até **"Seus aplicativos"**
3. Clique em **"</"** (Web App) → Dê um nome (ex: `site-usinagem`) → **Registrar app**
4. Copie o objeto `firebaseConfig`:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "seu-projeto.firebaseapp.com",
  projectId: "seu-projeto",
  storageBucket: "seu-projeto.firebasestorage.app",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abc123"
};
```

---

## Passo 6 — Configurar o Arquivo `js/firebase-config.js`

Abra o arquivo `js/firebase-config.js` e substitua os valores:

```javascript
const firebaseConfig = {
  apiKey:            "COLE_AQUI",
  authDomain:        "COLE_AQUI",
  projectId:         "COLE_AQUI",
  storageBucket:     "COLE_AQUI",
  messagingSenderId: "COLE_AQUI",
  appId:             "COLE_AQUI"
};
```

---

## Passo 7 — Testar Localmente

Para testar o site localmente (necessário por causa dos ES Modules):

**Opção A — VS Code (recomendado):**
- Instale a extensão **"Live Server"**
- Clique com o botão direito em `index.html` → **"Open with Live Server"**

**Opção B — Terminal:**
```bash
npx serve .
```
Acesse: `http://localhost:3000`

---

## Passo 8 — Hospedar Gratuitamente

### Opção A: Firebase Hosting (recomendado)
```bash
npm install -g firebase-tools
firebase login
firebase init hosting   # selecione o projeto, pasta pública = ".", SPA = não
firebase deploy
```

### Opção B: Netlify (drag-and-drop)
1. Acesse [https://app.netlify.com/](https://app.netlify.com/)
2. Arraste a pasta do projeto para o painel
3. Pronto! URL gerada automaticamente

### Opção C: Vercel
```bash
npm install -g vercel
vercel
```

### Opção D: GitHub Pages
1. Suba o projeto para um repositório GitHub
2. Vá em Settings → Pages → selecione `main` branch
3. Acesse via `https://seuusuario.github.io/seu-repo`

---

## Resumo das URLs do site

| Página | URL |
|--------|-----|
| Site público | `index.html` (raiz) |
| Login Admin | `login.html` |
| Painel Admin | `admin.html` |

---

## Estrutura do Banco de Dados (Firestore)

```
company/main          → dados da empresa (único documento)
services/{id}         → serviços (coleção, ilimitados)
testimonials/{id}     → depoimentos (coleção, ilimitados)
clients/{id}          → clientes (coleção, ilimitados)
contacts/{id}         → mensagens do formulário de contato
```

---

## ❓ Suporte

Em caso de dúvidas, consulte a documentação oficial:
- Firebase: https://firebase.google.com/docs
- Netlify: https://docs.netlify.com/
