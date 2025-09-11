import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebaseConfig";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { doc, setDoc, getDoc } from "firebase/firestore";
import styles from "./Login.module.css";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // Googleでログイン or サインアップ
  const handleGoogleAuth = async () => {
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Firestoreにユーザー情報があるか確認
      const userRef = doc(db, "users", user.uid);
      const userSnap = await getDoc(userRef);

      if (!userSnap.exists()) {
        // 新規ユーザーならFirestoreに登録
        await setDoc(userRef, {
          name: user.displayName || "未設定",
          email: user.email,
          createdAt: new Date(),
          friends: [],  // フレンド用の空配列
          groups: [],   // 参加グループの空配列
        });
      }

      navigate("/home"); // ホームへ遷移
    } catch (error) {
      alert("認証失敗: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📚 課題共有アプリ</h1>
      <p className={styles.subtitle}>Googleアカウントでログイン / サインアップ</p>

      <div className={styles.buttonGroup}>
        <button
          onClick={handleGoogleAuth}
          className={styles.loginBtn}
          disabled={loading}
        >
          {loading ? "処理中..." : "Googleでログイン / サインアップ"}
        </button>
      </div>
    </div>
  );
};

export default Login;
