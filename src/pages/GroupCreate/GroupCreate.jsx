import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase/firebaseConfig";
import {
  collection,
  addDoc,
  serverTimestamp,
  getDocs,
  query,
  where,
} from "firebase/firestore";
import styles from "./GroupCreate.module.css";

const GroupCreate = () => {
  const [groupName, setGroupName] = useState("");
  const [allUsers, setAllUsers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [friendsOnly, setFriendsOnly] = useState(false);
  const [selectedMembers, setSelectedMembers] = useState([]);
  const navigate = useNavigate();

  const currentUserUid = auth.currentUser.uid;

  // Firestoreから全ユーザー取得
  useEffect(() => {
    const fetchUsers = async () => {
      const snapshot = await getDocs(collection(db, "users"));
      const users = snapshot.docs
        .map((doc) => ({ uid: doc.id, ...doc.data() }))
        .filter((user) => user.uid !== currentUserUid); // 自分を除外
      setAllUsers(users);
    };
    fetchUsers();
  }, [currentUserUid]);

  // チェックボックスでメンバー選択
  const toggleSelectMember = (uid) => {
    setSelectedMembers((prev) =>
      prev.includes(uid)
        ? prev.filter((id) => id !== uid)
        : [...prev, uid]
    );
  };

  // グループ作成
  const createGroup = async () => {
    if (!groupName) return;

    // 同名チェック
    const q = query(collection(db, "groups"), where("name", "==", groupName));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      alert("同じ名前のグループは作成できません");
      return;
    }

    try {
      // 作成者もメンバーに追加
      const members = [currentUserUid, ...selectedMembers];

      await addDoc(collection(db, "groups"), {
        name: groupName,
        owner: currentUserUid,
        members,
        createdAt: serverTimestamp(),
      });
      navigate("/group");
    } catch (error) {
      console.error("グループ作成失敗:", error);
    }
  };

  // 表示用フィルタリング
  const filteredUsers = allUsers
    .filter((user) =>
      user.name.toLowerCase().includes(searchText.toLowerCase())
    )
    .filter((user) =>
      friendsOnly ? (auth.currentUser.friends || []).includes(user.uid) : true
    );

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>グループを作成</h1>

      <input
        type="text"
        placeholder="グループ名を入力"
        value={groupName}
        onChange={(e) => setGroupName(e.target.value)}
        className={styles.input}
      />

      <div className={styles.searchContainer}>
        <input
          type="text"
          placeholder="メンバーを検索"
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          className={styles.input}
        />
        <label>
          <input
            type="checkbox"
            checked={friendsOnly}
            onChange={() => setFriendsOnly(!friendsOnly)}
          />{" "}
          フレンドのみ
        </label>
      </div>

      <ul className={styles.userList}>
        {filteredUsers.map((user) => (
          <li key={user.uid} className={styles.userItem}>
            <label>
              <input
                type="checkbox"
                checked={selectedMembers.includes(user.uid)}
                onChange={() => toggleSelectMember(user.uid)}
              />
              {user.name}
            </label>
          </li>
        ))}
      </ul>

      <button onClick={createGroup} className={styles.button}>
        作成
      </button>
    </div>
  );
};

export default GroupCreate;
