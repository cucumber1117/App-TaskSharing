import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginWithGoogle } from "../../firebase/auth/login";
import { signUpWithGoogle } from "../../firebase/auth/sign-up";
import styles from "./Login.module.css";

const Login = () => {
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async () => {
    setLoading(true);
    try {
      await loginWithGoogle();
      navigate("/"); // ホームへ遷移
    } catch (error) {
      alert("ログイン失敗: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    setLoading(true);
    try {
      await signUpWithGoogle();
      navigate("/"); // ホームへ遷移
    } catch (error) {
      alert("サインアップ失敗: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>📚 課題共有アプリ</h1>
      <p className={styles.subtitle}>Googleアカウントでログイン / サインアップ</p>

      <div className={styles.buttonGroup}>
        <button onClick={handleLogin} className={styles.loginBtn} disabled={loading}>
          {loading ? "処理中..." : "Googleでログイン"}
        </button>
        <button onClick={handleSignUp} className={styles.signupBtn} disabled={loading}>
          {loading ? "処理中..." : "Googleでサインアップ"}
        </button>
      </div>
    </div>
  );
};

export default Login;
