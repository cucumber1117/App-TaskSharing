import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { db, auth } from "../../firebase/firebaseConfig";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import TaskList from "../../firebase/auth/TaskList";
import styles from "./GroupDetail.module.css";

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const [group, setGroup] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchGroupDetails = async () => {
      try {
        // グループ情報を取得
        const groupDoc = await getDoc(doc(db, "groups", groupId));
        
        if (!groupDoc.exists()) {
          setError("グループが見つかりません");
          return;
        }

        const groupData = { id: groupDoc.id, ...groupDoc.data() };
        
        // メンバーかどうかをチェック
        if (!groupData.members?.includes(auth.currentUser.uid)) {
          setError("このグループにアクセする権限がありません");
          return;
        }

        setGroup(groupData);

        // メンバー情報を取得
        if (groupData.members?.length > 0) {
          const memberPromises = groupData.members.map(async (memberId) => {
            const memberDoc = await getDoc(doc(db, "users", memberId));
            return memberDoc.exists() 
              ? { uid: memberId, ...memberDoc.data() }
              : { uid: memberId, name: "不明なユーザー" };
          });
          
          const memberList = await Promise.all(memberPromises);
          setMembers(memberList);
        }

      } catch (error) {
        console.error("グループ詳細取得エラー:", error);
        setError("グループ情報の取得に失敗しました");
      } finally {
        setLoading(false);
      }
    };

    if (groupId) {
      fetchGroupDetails();
    }
  }, [groupId]);

  if (loading) {
    return (
      <div className={styles.container}>
        <p>読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.container}>
        <div className={styles.error}>
          <p>{error}</p>
          <button onClick={() => navigate("/group")} className={styles.backBtn}>
            グループ一覧に戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate("/group")} className={styles.backBtn}>
          ← グループ一覧に戻る
        </button>
        <div className={styles.groupInfo}>
          <h1 className={styles.title}>{group.name}</h1>
          <p className={styles.memberCount}>メンバー: {members.length}人</p>
        </div>
      </div>

      <div className={styles.content}>
        <div className={styles.sidebar}>
          <div className={styles.memberList}>
            <h3>メンバー一覧</h3>
            <ul>
              {members.map((member) => (
                <li key={member.uid} className={styles.memberItem}>
                  <span className={styles.memberName}>{member.name}</span>
                  {member.uid === group.owner && (
                    <span className={styles.ownerBadge}>管理者</span>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <div className={styles.groupActions}>
            <button 
              onClick={() => navigate("/home")} 
              className={styles.homeBtn}
            >
              ホームに戻る
            </button>
          </div>
        </div>

        <div className={styles.mainContent}>
          <TaskList groupId={groupId} />
        </div>
      </div>
    </div>
  );
};

export default GroupDetail;