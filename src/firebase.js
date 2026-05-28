import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// =========================================================================
// CONFIGURAÇÃO DO FIREBASE (FIRESTORE & AUTH)
// =========================================================================
// Substitua os placeholders abaixo pelas suas credenciais reais que você
// copiou do Console do Firebase (Configurações do Projeto > Seus Aplicativos).
// =========================================================================
const firebaseConfig = {
  apiKey: "AIzaSyAgMOpnuTTiPIrZKXTdXM-AmDLEsoJHYZI",
  authDomain: "thorneios-app.firebaseapp.com",
  projectId: "thorneios-app",
  storageBucket: "thorneios-app.firebasestorage.app",
  messagingSenderId: "1031744583078",
  appId: "1:1031744583078:web:43ab2bc8c9172a26d08b67"
};


let db = null;
let auth = null;
let isFirebaseConfigured = false;

// Verifica se o usuário substituiu as credenciais padrão antes de inicializar
if (firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY_AQUI") {
  try {
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    auth = getAuth(app);
    isFirebaseConfigured = true;
  } catch (e) {
    console.error("Erro ao inicializar o Firebase:", e);
  }
}

export { db, auth, isFirebaseConfigured };

