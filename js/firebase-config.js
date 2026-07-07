/* =============================================
   CONFIGURAÇÃO DO FIREBASE
   Usinagem e Solda de Precisão
   
   ATENÇÃO: Substitua os valores abaixo pelas credenciais 
   do seu projeto Firebase.
   Consulte o arquivo SETUP.md para instruções detalhadas.
   ============================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getStorage } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ─── SUBSTITUA ESTAS CREDENCIAIS ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "SUA_API_KEY_AQUI",
  authDomain:        "SEU_PROJETO.firebaseapp.com",
  projectId:         "SEU_PROJETO_ID",
  storageBucket:     "SEU_PROJETO.firebasestorage.app",
  messagingSenderId: "SEU_MESSAGING_SENDER_ID",
  appId:             "SEU_APP_ID"
};
// ─────────────────────────────────────────────────────────────────────────────

const app      = initializeApp(firebaseConfig);
export const db      = getFirestore(app);
export const storage = getStorage(app);
export const auth    = getAuth(app);
