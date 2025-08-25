import React from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import TaskList from "../../firebase/auth/TaskList";
import styles from "./Home.module.css";

const Home = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/login");
    } catch (error) {
      console.error("ログアウト失敗:", error);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.centerHeader}>
        <h1 className={styles.title}>📚 課題共有アプリ</h1>
        <div className={styles.navButtons}>
          <button
            onClick={() => navigate("/group")}
            className={styles.button}>
            グループ
          </button>
          <button
            onClick={() => navigate("/settings")}
            className={styles.button}>
            設定
          </button>
          <button
            onClick={handleLogout}
            className={`${styles.button} ${styles.logout}`}
          >
            ログアウト
          </button>
        </div>
      </div>

      <main className={styles.main}>
        <div className={styles.taskContainer}>
          <TaskList />
        </div>
      </main>
    </div>
  );
};

export default Home;
