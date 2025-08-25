// Firebase SDKをインポート
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebaseプロジェクトの設定
const firebaseConfig = {
  apiKey: "AIzaSyA2gevLi91iwMpInWYKE-kKdSkjZyYji1w",
  authDomain: "app3-taskshare.firebaseapp.com",
  projectId: "app3-taskshare",
  storageBucket: "app3-taskshare.appspot.com", // ← 修正
  messagingSenderId: "276847713334",
  appId: "1:276847713334:web:dd9f9a3c3ecd8f9cc1cc97",
  measurementId: "G-FGZ3BKDRZH" // Analyticsを使わないなら削除OK
};

// Firebaseアプリを初期化
const app = initializeApp(firebaseConfig);

// 認証とDBをエクスポート
export const auth = getAuth(app);
export const db = getFirestore(app);
