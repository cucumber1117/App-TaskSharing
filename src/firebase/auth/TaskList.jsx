import React, { useEffect, useState } from "react";
import { db, auth } from "../firebaseConfig";
import { 
  collection, 
  addDoc, 
  onSnapshot, 
  serverTimestamp, 
  updateDoc, 
  deleteDoc, 
  doc,
  query,
  where,
  getDoc,
  getDocs
} from "firebase/firestore";
import "./TaskList.css";

const TaskList = ({ groupId = null }) => {
  const [tasks, setTasks] = useState([]);
  const [displayLimit, setDisplayLimit] = useState(14); // 2週間分のタスク数の目安
  const [selectedTasks, setSelectedTasks] = useState(new Set()); // 選択されたタスクのID
  const [isSelectMode, setIsSelectMode] = useState(false); // 選択モードか通常モードか
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    dueDate: "",
    dueTime: "",
    priority: "中",
    assignee: "",
    isRecurring: false,
    recurringType: "daily", // daily, weekly, monthly
    recurringEndDate: ""
  });
  const [editingTask, setEditingTask] = useState(null);
  const [filter, setFilter] = useState("all");
  const [userGroups, setUserGroups] = useState([]);
  const [showShareModal, setShowShareModal] = useState(null);

  const statusOptions = ["未着手", "進行中", "完了", "保留"];
  const priorityOptions = ["高", "中", "低"];
  const recurringOptions = [
    { value: "daily", label: "毎日" },
    { value: "weekly", label: "毎週" },
    { value: "monthly", label: "毎月" }
  ];

  // 定期的なタスクを作成する関数
  const createRecurringTasks = async (baseTaskData) => {
    // 日付文字列を確実にパースするため、年月日を分離して明示的にDateオブジェクトを作成
    const parseDate = (dateString) => {
      if (!dateString) return null;
      const [year, month, day] = dateString.split('-').map(Number);
      return new Date(year, month - 1, day); // monthは0ベースなので-1
    };

    const startDate = parseDate(baseTaskData.dueDate);
    const endDate = parseDate(baseTaskData.recurringEndDate);
    
    if (!startDate || !endDate) {
      console.error("Invalid date format:", baseTaskData.dueDate, baseTaskData.recurringEndDate);
      return;
    }

    const tasks = [];
    let currentDate = new Date(startDate.getTime()); // 開始日のコピーを作成
    
    while (currentDate <= endDate) {
      // 日付を YYYY-MM-DD 形式で確実にフォーマット
      const formatDate = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const taskData = {
        ...baseTaskData,
        dueDate: formatDate(currentDate),
        title: `${baseTaskData.title} (${currentDate.toLocaleDateString("ja-JP")})`,
        isRecurringInstance: true,
        originalStartDate: baseTaskData.dueDate, // 元の開始日を保存
        parentRecurringId: null // 後で設定
      };
      
      tasks.push(taskData);
      
      // 次の日付を計算（新しいDateオブジェクトを作成して安全に処理）
      const nextDate = new Date(currentDate.getTime());
      switch (baseTaskData.recurringType) {
        case "daily":
          nextDate.setDate(nextDate.getDate() + 1);
          break;
        case "weekly":
          nextDate.setDate(nextDate.getDate() + 7);
          break;
        case "monthly":
          nextDate.setMonth(nextDate.getMonth() + 1);
          break;
        default:
          console.error("Unknown recurring type:", baseTaskData.recurringType);
          return;
      }
      currentDate = nextDate;
    }

    // バッチで作成
    for (const task of tasks) {
      await addDoc(collection(db, "tasks"), task);
    }
  };

  useEffect(() => {
    let q;
    if (groupId) {
      q = query(collection(db, "tasks"), where("groupId", "==", groupId));
    } else {
      q = query(collection(db, "tasks"), where("createdBy", "==", auth.currentUser?.uid));
    }
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const taskList = snapshot.docs.map((doc) => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setTasks(taskList);
    });

    // ユーザーが参加しているグループを取得
    const fetchUserGroups = async () => {
      if (!groupId) { // 個人タスクページでのみグループを取得
        try {
          const groupsQuery = query(
            collection(db, "groups"),
            where("members", "array-contains", auth.currentUser?.uid)
          );
          const groupsSnapshot = await getDocs(groupsQuery);
          const groups = groupsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));
          setUserGroups(groups);
        } catch (error) {
          console.error("グループ取得エラー:", error);
        }
      }
    };

    fetchUserGroups();
    return unsubscribe;
  }, [groupId]);

  const addTask = async () => {
    if (!newTask.title.trim()) return;
    
    const taskData = {
      title: newTask.title.trim(),
      description: newTask.description.trim(),
      status: "未着手",
      priority: newTask.priority,
      dueDate: newTask.dueDate || null,
      dueTime: newTask.dueTime || null,
      assignee: newTask.assignee || auth.currentUser?.uid,
      createdBy: auth.currentUser?.uid,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      isRecurring: newTask.isRecurring,
      recurringType: newTask.isRecurring ? newTask.recurringType : null,
      recurringEndDate: newTask.isRecurring && newTask.recurringEndDate ? newTask.recurringEndDate : null,
    };

    if (groupId) {
      taskData.groupId = groupId;
    }

    // 定期的なタスクの場合、複数のタスクを作成
    if (newTask.isRecurring) {
      await createRecurringTasks(taskData);
    } else {
      await addDoc(collection(db, "tasks"), taskData);
    }
    
    setNewTask({
      title: "",
      description: "",
      dueDate: "",
      dueTime: "",
      priority: "中",
      assignee: "",
      isRecurring: false,
      recurringType: "daily",
      recurringEndDate: ""
    });
  };

  const updateTask = async (taskId, updates) => {
    await updateDoc(doc(db, "tasks", taskId), {
      ...updates,
      updatedAt: serverTimestamp()
    });
  };

  const deleteTask = async (taskId) => {
    if (window.confirm("この課題を削除しますか？")) {
      await deleteDoc(doc(db, "tasks", taskId));
    }
  };

  const shareToGroup = async (taskId, targetGroupId) => {
    try {
      const taskRef = doc(db, "tasks", taskId);
      const taskSnap = await getDoc(taskRef);
      
      if (taskSnap.exists()) {
        const originalTask = taskSnap.data();
        
        // グループタスクとして新しく作成
        const sharedTask = {
          ...originalTask,
          groupId: targetGroupId,
          sharedFrom: auth.currentUser?.uid,
          originalTaskId: taskId,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          title: `${originalTask.title} (共有)`
        };
        
        await addDoc(collection(db, "tasks"), sharedTask);
        alert("タスクをグループに共有しました！");
      }
    } catch (error) {
      console.error("共有エラー:", error);
      alert("共有に失敗しました");
    }
  };

  const handleStatusChange = async (taskId, newStatus) => {
    await updateTask(taskId, { status: newStatus });
  };

  const startEdit = (task) => {
    setEditingTask({ ...task });
  };

  const saveEdit = async () => {
    if (!editingTask.title.trim()) return;
    
    await updateTask(editingTask.id, {
      title: editingTask.title.trim(),
      description: editingTask.description.trim(),
      priority: editingTask.priority,
      dueDate: editingTask.dueDate || null,
    });
    setEditingTask(null);
  };

  const cancelEdit = () => {
    setEditingTask(null);
  };

  const filteredTasks = tasks.filter(task => {
    if (filter === "all") return true;
    return task.status === filter;
  });

  // 2週間以内のタスクのみ表示（期限日がある場合）
  const getTasksWithinTwoWeeks = (tasksArray) => {
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);
    
    return tasksArray.filter(task => {
      // 期限日がないタスクは常に表示
      if (!task.dueDate) return true;
      
      // 期限日が2週間以内のタスクのみ
      return new Date(task.dueDate) <= twoWeeksFromNow;
    });
  };

  const tasksWithinTwoWeeks = getTasksWithinTwoWeeks(filteredTasks);
  const remainingTasks = filteredTasks.filter(task => 
    task.dueDate && new Date(task.dueDate) > new Date(Date.now() + 14 * 24 * 60 * 60 * 1000)
  );

  // 表示するタスクを決定
  const tasksToDisplay = displayLimit === 14 
    ? tasksWithinTwoWeeks 
    : filteredTasks.slice(0, displayLimit);

  const loadMoreTasks = () => {
    setDisplayLimit(prev => prev + 20); // 20件ずつ追加
  };

  const showOnlyTwoWeeks = () => {
    setDisplayLimit(14);
  };

  // 選択関連の関数
  const toggleSelectMode = () => {
    setIsSelectMode(!isSelectMode);
    setSelectedTasks(new Set()); // 選択モード切り替え時にクリア
  };

  const handleTaskSelect = (taskId) => {
    const newSelected = new Set(selectedTasks);
    if (newSelected.has(taskId)) {
      newSelected.delete(taskId);
    } else {
      newSelected.add(taskId);
    }
    setSelectedTasks(newSelected);
  };

  const selectAllTasks = () => {
    const allTaskIds = new Set(tasksToDisplay.map(task => task.id));
    setSelectedTasks(allTaskIds);
  };

  const clearAllSelections = () => {
    setSelectedTasks(new Set());
  };

  const deleteSelectedTasks = async () => {
    if (selectedTasks.size === 0) return;
    
    const confirmMessage = `選択した${selectedTasks.size}件のタスクを削除しますか？`;
    if (window.confirm(confirmMessage)) {
      try {
        // 選択されたタスクを順次削除
        for (const taskId of selectedTasks) {
          await deleteDoc(doc(db, "tasks", taskId));
        }
        setSelectedTasks(new Set());
        setIsSelectMode(false);
      } catch (error) {
        console.error("一括削除エラー:", error);
        alert("削除に失敗しました");
      }
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "";
    return new Date(dateString).toLocaleDateString("ja-JP");
  };

  const isOverdue = (dueDate) => {
    if (!dueDate) return false;
    return new Date(dueDate) < new Date() && new Date(dueDate).toDateString() !== new Date().toDateString();
  };

  return (
    <div className="task-list">
      <h2>課題一覧 {groupId ? "（グループ）" : "（個人）"}</h2>
      
      {/* 新規課題追加フォーム */}
      <div className="task-form">
        <input
          type="text"
          placeholder="課題タイトル"
          value={newTask.title}
          onChange={(e) => setNewTask({...newTask, title: e.target.value})}
        />
        <textarea
          placeholder="説明（任意）"
          value={newTask.description}
          onChange={(e) => setNewTask({...newTask, description: e.target.value})}
        />
        
        <div className="date-time-row">
          <div className="date-time-group">
            <label>📅 期限日</label>
            <input
              type="date"
              value={newTask.dueDate}
              onChange={(e) => setNewTask({...newTask, dueDate: e.target.value})}
            />
          </div>
          <div className="date-time-group">
            <label>🕒 期限時刻</label>
            <input
              type="time"
              value={newTask.dueTime}
              onChange={(e) => setNewTask({...newTask, dueTime: e.target.value})}
            />
          </div>
        </div>



        <div className="priority-group">
          <label>🎯 優先度</label>
          <select
            value={newTask.priority}
            onChange={(e) => setNewTask({...newTask, priority: e.target.value})}
          >
            {priorityOptions.map(priority => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>
        </div>

        <div className="recurring-section">
          <label className="recurring-label">
            <input
              type="checkbox"
              checked={newTask.isRecurring}
              onChange={(e) => setNewTask({...newTask, isRecurring: e.target.checked})}
            />
            🔄 定期的な課題にする
          </label>
          
          {newTask.isRecurring && (
            <div className="recurring-options">
              <div>
                <label>繰り返しパターン</label>
                <select
                  value={newTask.recurringType}
                  onChange={(e) => setNewTask({...newTask, recurringType: e.target.value})}
                >
                  {recurringOptions.map(option => (
                    <option key={option.value} value={option.value}>{option.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>終了日</label>
                <input
                  type="date"
                  value={newTask.recurringEndDate}
                  onChange={(e) => setNewTask({...newTask, recurringEndDate: e.target.value})}
                />
              </div>
            </div>
          )}
        </div>

        <button onClick={addTask} className="add-btn">課題を追加</button>
      </div>

      {/* フィルター */}
      <div className="filter-buttons">
        <button 
          className={filter === "all" ? "active" : ""} 
          onClick={() => setFilter("all")}
        >
          すべて ({tasks.length})
        </button>
        {statusOptions.map(status => (
          <button 
            key={status}
            className={filter === status ? "active" : ""} 
            onClick={() => setFilter(status)}
          >
            {status} ({tasks.filter(t => t.status === status).length})
          </button>
        ))}
      </div>

      {/* 表示コントロール */}
      <div className="display-controls">
        <div className="task-summary">
          表示中: {tasksToDisplay.length}件
          {displayLimit === 14 && remainingTasks.length > 0 && (
            <span className="remaining-count"> (2週間以降に{remainingTasks.length}件)</span>
          )}
        </div>
        <div className="control-buttons">
          {displayLimit === 14 && remainingTasks.length > 0 && (
            <button onClick={loadMoreTasks} className="load-more-btn">
              さらに表示 (+{remainingTasks.length}件)
            </button>
          )}
          {displayLimit > 14 && (
            <button onClick={showOnlyTwoWeeks} className="show-two-weeks-btn">
              2週間以内のみ表示
            </button>
          )}
          <button onClick={toggleSelectMode} className={`select-mode-btn ${isSelectMode ? 'active' : ''}`}>
            {isSelectMode ? '選択を終了' : '複数選択'}
          </button>
        </div>
      </div>

      {/* 選択モード時のコントロール */}
      {isSelectMode && (
        <div className="selection-controls">
          <div className="selection-info">
            <span className="selected-count">
              {selectedTasks.size}件選択中
            </span>
            <div className="selection-actions">
              <button onClick={selectAllTasks} className="select-all-btn">
                すべて選択
              </button>
              <button onClick={clearAllSelections} className="clear-all-btn">
                選択解除
              </button>
              {selectedTasks.size > 0 && (
                <button onClick={deleteSelectedTasks} className="delete-selected-btn">
                  選択した{selectedTasks.size}件を削除
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 課題リスト */}
      <div className="tasks">
        {tasksToDisplay.length === 0 ? (
          <p className="no-tasks">課題がありません</p>
        ) : (
          tasksToDisplay.map((task) => (
            <div key={task.id} className={`task-item ${task.status} ${isOverdue(task.dueDate) ? 'overdue' : ''} ${selectedTasks.has(task.id) ? 'selected' : ''}`}>
              {editingTask?.id === task.id ? (
                <div className="edit-form">
                  <input
                    type="text"
                    value={editingTask.title}
                    onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                  />
                  <textarea
                    value={editingTask.description}
                    onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                  />
                  <input
                    type="date"
                    value={editingTask.dueDate || ""}
                    onChange={(e) => setEditingTask({...editingTask, dueDate: e.target.value})}
                  />
                  <select
                    value={editingTask.priority}
                    onChange={(e) => setEditingTask({...editingTask, priority: e.target.value})}
                  >
                    {priorityOptions.map(priority => (
                      <option key={priority} value={priority}>{priority}</option>
                    ))}
                  </select>
                  <div className="edit-actions">
                    <button onClick={saveEdit} className="save-btn">保存</button>
                    <button onClick={cancelEdit} className="cancel-btn">キャンセル</button>
                  </div>
                </div>
              ) : (
                <div className="task-content">
                  <div className="task-header">
                    {isSelectMode && (
                      <input
                        type="checkbox"
                        checked={selectedTasks.has(task.id)}
                        onChange={() => handleTaskSelect(task.id)}
                        className="task-checkbox"
                      />
                    )}
                    <h3 className={isSelectMode ? 'with-checkbox' : ''}>{task.title}</h3>
                    <span className={`priority priority-${task.priority}`}>
                      {task.priority}
                    </span>
                  </div>
                  {task.description && (
                    <p className="task-description">{task.description}</p>
                  )}
                  <div className="task-meta">
                    {task.dueDate && (
                      <span className="due-date">
                        期限: {formatDate(task.dueDate)}
                        {task.dueTime && ` ${task.dueTime}`}
                        {isOverdue(task.dueDate) && <span className="overdue-label">（期限切れ）</span>}
                      </span>
                    )}
                  </div>
                  <div className="task-actions">
                    <select
                      value={task.status}
                      onChange={(e) => handleStatusChange(task.id, e.target.value)}
                      className="status-select"
                    >
                      {statusOptions.map(status => (
                        <option key={status} value={status}>{status}</option>
                      ))}
                    </select>
                    <button onClick={() => startEdit(task)} className="edit-btn">編集</button>
                    {!groupId && userGroups.length > 0 && (
                      <button 
                        onClick={() => setShowShareModal(task.id)} 
                        className="share-btn"
                      >
                        共有
                      </button>
                    )}
                    <button onClick={() => deleteTask(task.id)} className="delete-btn">削除</button>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* グループ共有モーダル */}
      {showShareModal && (
        <div className="share-modal">
          <div className="share-modal-content">
            <h3>グループに共有</h3>
            <p>どのグループに共有しますか？</p>
            <div className="group-list">
              {userGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => {
                    shareToGroup(showShareModal, group.id);
                    setShowShareModal(null);
                  }}
                  className="group-share-btn"
                >
                  {group.name}
                </button>
              ))}
            </div>
            <button 
              onClick={() => setShowShareModal(null)}
              className="cancel-share-btn"
            >
              キャンセル
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskList;
