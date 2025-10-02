import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { auth, db } from "../../firebase/firebaseConfig";
import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where,
  arrayUnion,
  arrayRemove 
} from "firebase/firestore";
import styles from "./Settings.module.css";

const Settings = () => {
  const [userInfo, setUserInfo] = useState({});
  const [newName, setNewName] = useState("");
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [searchText, setSearchText] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("profile");
  
  const navigate = useNavigate();
  const user = auth.currentUser;

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      try {
        // ユーザー情報を取得
        const userRef = doc(db, "users", user.uid);
        const userSnap = await getDoc(userRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUserInfo(userData);
          setNewName(userData.name || "");
          
          // フレンド情報を取得
          if (userData.friends?.length > 0) {
            const friendPromises = userData.friends.map(async (friendId) => {
              const friendDoc = await getDoc(doc(db, "users", friendId));
              return friendDoc.exists() 
                ? { uid: friendId, ...friendDoc.data() }
                : { uid: friendId, name: "不明なユーザー" };
            });
            
            const friendList = await Promise.all(friendPromises);
            setFriends(friendList);
          }
        }

        // 全ユーザーを取得（フレンド追加用）
        const usersSnapshot = await getDocs(collection(db, "users"));
        const users = usersSnapshot.docs
          .map((doc) => ({ uid: doc.id, ...doc.data() }))
          .filter((u) => u.uid !== user.uid); // 自分を除外
        setAllUsers(users);
        
      } catch (error) {
        console.error("データ取得失敗:", error);
      }
    };

    fetchData();
  }, [user]);

  const handleUpdateName = async () => {
    if (!newName.trim()) {
      alert("名前を入力してください");
      return;
    }

    setLoading(true);
    try {
      const userRef = doc(db, "users", user.uid);
      await updateDoc(userRef, { name: newName.trim() });
      setUserInfo(prev => ({ ...prev, name: newName.trim() }));
      alert("名前を更新しました！");
    } catch (error) {
      console.error("名前の更新失敗:", error);
      alert("名前の更新に失敗しました");
    }
    setLoading(false);
  };

  const addFriend = async (friendId) => {
    try {
      const userRef = doc(db, "users", user.uid);
      const friendRef = doc(db, "users", friendId);
      
      // 両方のユーザーのフレンドリストに追加
      await updateDoc(userRef, {
        friends: arrayUnion(friendId)
      });
      await updateDoc(friendRef, {
        friends: arrayUnion(user.uid)
      });

      // UIを更新
      const friendDoc = await getDoc(friendRef);
      if (friendDoc.exists()) {
        setFriends(prev => [...prev, { uid: friendId, ...friendDoc.data() }]);
      }
      
      alert("フレンドを追加しました！");
    } catch (error) {
      console.error("フレンド追加失敗:", error);
      alert("フレンドの追加に失敗しました");
    }
  };

  const removeFriend = async (friendId) => {
    if (!window.confirm("このフレンドを削除しますか？")) return;
    
    try {
      const userRef = doc(db, "users", user.uid);
      const friendRef = doc(db, "users", friendId);
      
      // 両方のユーザーのフレンドリストから削除
      await updateDoc(userRef, {
        friends: arrayRemove(friendId)
      });
      await updateDoc(friendRef, {
        friends: arrayRemove(user.uid)
      });

      // UIを更新
      setFriends(prev => prev.filter(f => f.uid !== friendId));
      
      alert("フレンドを削除しました");
    } catch (error) {
      console.error("フレンド削除失敗:", error);
      alert("フレンドの削除に失敗しました");
    }
  };

  // フレンド検索用のフィルタリング
  const searchResults = allUsers.filter(user => 
    user.name?.toLowerCase().includes(searchText.toLowerCase()) &&
    !friends.some(friend => friend.uid === user.uid) &&
    searchText.trim() !== ""
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button onClick={() => navigate("/home")} className={styles.backBtn}>
          ← ホームに戻る
        </button>
        <h1 className={styles.title}>⚙️ 設定</h1>
      </div>

      <div className={styles.tabs}>
        <button 
          className={activeTab === "profile" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("profile")}
        >
          プロフィール
        </button>
        <button 
          className={activeTab === "friends" ? styles.activeTab : styles.tab}
          onClick={() => setActiveTab("friends")}
        >
          フレンド
        </button>
      </div>

      {activeTab === "profile" && (
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <h2>プロフィール情報</h2>
            <div className={styles.infoGroup}>
              <label>メールアドレス</label>
              <p className={styles.infoText}>{userInfo.email}</p>
            </div>
            <div className={styles.infoGroup}>
              <label>表示名</label>
              <input
                type="text"
                placeholder="表示名を入力"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                className={styles.input}
              />
              <button
                onClick={handleUpdateName}
                disabled={loading}
                className={styles.button}
              >
                {loading ? "更新中..." : "名前を更新"}
              </button>
            </div>
            <div className={styles.infoGroup}>
              <label>登録日</label>
              <p className={styles.infoText}>
                {userInfo.createdAt ? new Date(userInfo.createdAt.seconds * 1000).toLocaleDateString("ja-JP") : "不明"}
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "friends" && (
        <div className={styles.tabContent}>
          <div className={styles.section}>
            <h2>フレンド一覧 ({friends.length}人)</h2>
            {friends.length === 0 ? (
              <p className={styles.noFriends}>まだフレンドがいません</p>
            ) : (
              <div className={styles.friendsList}>
                {friends.map((friend) => (
                  <div key={friend.uid} className={styles.friendItem}>
                    <span className={styles.friendName}>{friend.name}</span>
                    <button
                      onClick={() => removeFriend(friend.uid)}
                      className={styles.removeBtn}
                    >
                      削除
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className={styles.section}>
            <h2>フレンドを追加</h2>
            <input
              type="text"
              placeholder="ユーザー名で検索..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className={styles.searchInput}
            />
            
            {searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map((user) => (
                  <div key={user.uid} className={styles.userItem}>
                    <span className={styles.userName}>{user.name}</span>
                    <button
                      onClick={() => addFriend(user.uid)}
                      className={styles.addBtn}
                    >
                      追加
                    </button>
                  </div>
                ))}
              </div>
            )}
            
            {searchText.trim() !== "" && searchResults.length === 0 && (
              <p className={styles.noResults}>該当するユーザーが見つかりません</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Settings;
