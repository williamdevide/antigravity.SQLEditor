import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, type Auth } from 'firebase/auth';
import { getFirestore, type Firestore } from 'firebase/firestore';

// Lê variáveis de ambiente injetadas pelo Vite com suporte flexível a variações de casing
const env = import.meta.env;

const firebaseConfig = {
  apiKey:
    env.FIREBASE_API_KEY ||
    env.VITE_FIREBASE_API_KEY ||
    'AIzaSyDeNzpl0v76nvJcWZx3txKces6G9GeOQ_4',
  authDomain:
    env.FIREBASE_AUTHDOMAIN ||
    env.FIREBASE_AUTH_DOMAIN ||
    env.VITE_FIREBASE_AUTH_DOMAIN ||
    'antigravitysqleditor.firebaseapp.com',
  projectId:
    env.FIREBASE_projectId ||
    env.FIREBASE_PROJECT_ID ||
    env.VITE_FIREBASE_PROJECT_ID ||
    'antigravitysqleditor',
  storageBucket:
    env.FIREBASE_storageBucket ||
    env.FIREBASE_STORAGE_BUCKET ||
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    'antigravitysqleditor.firebasestorage.app',
  messagingSenderId:
    env.FIREBASE_messagingSenderId ||
    env.FIREBASE_MESSAGING_SENDER_ID ||
    env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    '482370429090',
  appId:
    env.FIREBASE_appId ||
    env.FIREBASE_APP_ID ||
    env.VITE_FIREBASE_APP_ID ||
    '1:482370429090:web:63d5b234eb72d8ce21f7fb',
};

// Inicialização Singleton do Firebase
export const firebaseApp: FirebaseApp =
  getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth: Auth = getAuth(firebaseApp);
export const db: Firestore = getFirestore(firebaseApp);

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Tradução amigável de erros do Firebase Auth e Firestore para o Português do Brasil
export function getFirebaseErrorMessage(errorCode: string): string {
  switch (errorCode) {
    case 'auth/user-not-found':
      return 'Nenhum usuário cadastrado com este e-mail.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'E-mail ou senha incorretos. Verifique suas credenciais.';
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso por outra conta.';
    case 'auth/weak-password':
      return 'A senha é muito fraca. Escolha uma senha com no mínimo 6 caracteres.';
    case 'auth/invalid-email':
      return 'Formato de e-mail inválido.';
    case 'auth/user-disabled':
      return 'Esta conta de usuário foi temporariamente desativada.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas consecutivas. Aguarde alguns instantes e tente novamente.';
    case 'auth/popup-closed-by-user':
      return 'A janela de autenticação do Google foi fechada antes da conclusão.';
    case 'auth/popup-blocked':
      return 'A janela pop-up do Google foi bloqueada pelo navegador. Permita pop-ups para autenticar.';
    case 'auth/requires-recent-login':
      return 'Para realizar esta ação de segurança, faça login novamente no portal.';
    case 'auth/network-request-failed':
      return 'Falha na conexão de rede. Verifique o acesso à internet.';
    case 'auth/operation-not-allowed':
      return 'Provedor desativado: ative o método de login (E-mail/Senha ou Google) no Console do Firebase (Authentication > Sign-in method).';
    case 'auth/unauthorized-domain':
      return 'Domínio não autorizado: adicione este domínio no Console do Firebase (Authentication > Settings > Authorized domains).';
    case 'auth/invalid-api-key':
      return 'Chave de API do Firebase inválida no arquivo .env.';
    case 'auth/cancelled-popup-request':
      return 'Abertura de pop-up cancelada devido a outra tentativa simultânea.';
    case 'permission-denied':
      return 'Permissão negada no Firestore: configure as Regras de Segurança (Firestore Rules) no console para permitir acesso à coleção users.';
    case 'unavailable':
      return 'Serviço do Firebase temporariamente indisponível. Verifique sua conexão.';
    default:
      if (errorCode) {
        return `Erro no serviço (${errorCode}). Pressione F12 para inspecionar os detalhes no console.`;
      }
      return 'Ocorreu um erro no serviço de autenticação. Verifique as configurações no Console do Firebase.';
  }
}

