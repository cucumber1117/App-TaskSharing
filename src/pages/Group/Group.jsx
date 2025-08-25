import React, { useEffect, useState } from "react";
import { db, auth } from "../../firebase/firebaseConfig";
import { collection, onSnapshot, updateDoc, doc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import styles from "./Group.module.css";

const Group = () => {
  const [groups, setGroups] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const q = collection(db, "groups");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      // 自分がメンバーのグループのみ表示
      const myGroups = snapshot.docs
        .map((doc) => ({ id: doc.id, ...doc.data() }))
        .filter((group) => group.members?.includes(auth.currentUser.uid));
      setGroups(myGroups);
    });
    return unsubscribe;
  }, []);

  const toggleJoin = async (group) => {
    const userUid = auth.currentUser.uid;
    const groupRef = doc(db, "groups", group.id);

    if (group.members?.includes(userUid)) {
      await updateDoc(groupRef, {
        members: group.members.filter((uid) => uid !== userUid),
      });
    } else {
      await updateDoc(groupRef, {
        members: [...(group.members || []), userUid],
      });
    }
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>👥 グループ一覧</h1>

      <div className={styles.createGroupButton}>
        <button
          onClick={() => navigate("/group-create")}
          className={styles.button}
        >
          グループを作成
        </button>
      </div>

      {groups.length === 0 ? (
        <p className={styles.noGroup}>参加中のグループはありません</p>
      ) : (
        <ul className={styles.groupList}>
          {groups.map((group) => (
            <li key={group.id} className={styles.groupItem}>
              <button
                onClick={() => navigate(`/group/${group.id}`)}
                className={styles.groupButton}
              >
                {group.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};

export default Group;
