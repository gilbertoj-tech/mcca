/* =============================================
   AUTH — Firebase Authentication Helper
   Usinagem e Solda de Precisão
   ============================================= */

import { auth } from './firebase-config.js';
import {
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

/**
 * Redireciona para login.html se o usuário não estiver autenticado.
 * Chame esta função no topo de admin.html.
 */
export function requireAuth(callback) {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      if (callback) callback(user);
    } else {
      window.location.href = 'login.html';
    }
  });
}

/**
 * Verifica se já está logado e redireciona para admin.html.
 * Chame esta função na página de login.
 */
export function redirectIfLoggedIn() {
  onAuthStateChanged(auth, (user) => {
    if (user) {
      window.location.href = 'admin.html';
    }
  });
}

/**
 * Realiza o login com email e senha.
 */
export async function login(email, password) {
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Realiza o logout e redireciona para login.html.
 */
export async function logout() {
  await signOut(auth);
  window.location.href = 'login.html';
}
