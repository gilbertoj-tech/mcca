/* =============================================
   CONFIGURAÇÃO DO FIREBASE
   Usinagem e Solda de Precisão
   
   ATENÇÃO: Substitua os valores abaixo pelas credenciais 
   do seu projeto Firebase.
   Consulte o arquivo SETUP.md para instruções detalhadas.
   ============================================= */

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

// ─── SUBSTITUA ESTAS CREDENCIAIS ─────────────────────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyDXo0JhTzWfNCrkfjK_qqc3N8Vfy10UVI8",
  authDomain:        "mcca-usinagem.firebaseapp.com",
  projectId:         "mcca-usinagem",
  storageBucket:     "mcca-usinagem.firebasestorage.app",
  messagingSenderId: "634453897974",
  appId:             "1:634453897974:web:3a7b2b80719d29281132d7"
};
// ─────────────────────────────────────────────────────────────────────────────

const app      = initializeApp(firebaseConfig);
export const db      = getFirestore(app);
export const auth    = getAuth(app);
