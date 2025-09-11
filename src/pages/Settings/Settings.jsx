import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase/firebaseConfig";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import styles from "./Settings.module.css";

const Settings = () => {
  const [newName, setNewName] = useState("");
  const [loading, setLoading] = useState(false);
  const user = auth.currentUser;

  useEffect(() => {
    const fetchUserName = async () => {
      if (!user) return;
      try {
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          setNewName(userSnap.data().displayName || "");
        } else {
          // Firestore にユーザー情報がない場合はログイン側で作成済みの想定なので空白にしておく
          setNewName("");
        }
      } catch (error) {
        console.error("ユーザー情報の取得失敗:", error);
      }
    };

    fetchUserName();
  }, [user]);

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      alert("名前を入力してください");
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { displayName: newName });
      alert("名前を更新しました！（Googleアカウントには影響しません）");
    } catch (error) {
      console.error("名前の更新失敗:", error);
      alert("名前の更新に失敗しました");
    }
    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>⚙️ 設定</h2>

      <div className={styles.section}>
        <label className={styles.label}>名前の変更</label>
        <input
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          className={styles.input}
        />
        <button
          onClick={handleUpdateName}
          className={styles.button}
          disabled={loading}
        >
          {loading ? "更新中..." : "更新"}
        </button>
      </div>
    </div>
  );
};

export default Settings;
