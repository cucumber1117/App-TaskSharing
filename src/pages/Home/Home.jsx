import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth } from "../../firebase/firebaseConfig";
import { signOut } from "firebase/auth";
import TaskCalendar from "../../components/TaskCalendar";
import TaskList from "../../firebase/auth/TaskList";
import styles from "./Home.module.css";

const Home = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState("calendar");

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate("/");
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
            className={styles.button}
          >
            グループ
          </button>
          <button
            onClick={() => navigate("/settings")}
            className={styles.button}
          >
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

      <div className={styles.viewToggle}>
        <button
          onClick={() => setViewMode("calendar")}
          className={`${styles.toggleButton} ${viewMode === "calendar" ? styles.active : ""}`}
        >
          📅 カレンダー
        </button>
        <button
          onClick={() => setViewMode("list")}
          className={`${styles.toggleButton} ${viewMode === "list" ? styles.active : ""}`}
        >
          📋 リスト
        </button>
      </div>

      <main className={styles.main}>
        <div className={styles.contentContainer}>
          {viewMode === "calendar" ? (
            <TaskCalendar />
          ) : (
            <TaskList groupId={null} />
          )}
        </div>
      </main>
    </div>
  );
};

export default Home;
