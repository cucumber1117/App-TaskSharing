import React, { useState, useEffect } from "react";
import { db, auth } from "../firebase/firebaseConfig.js";
import { 
  collection, 
  query, 
  where, 
  onSnapshot 
} from "firebase/firestore";
import styles from "./TaskCalendar.module.css";

const TaskCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [tasks, setTasks] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);

  useEffect(() => {
    if (!auth.currentUser) return;

    const fetchAllTasks = async () => {
      try {
        // まず、ユーザーが参加しているグループを取得
        const groupsQuery = query(
          collection(db, "groups"),
          where("members", "array-contains", auth.currentUser.uid)
        );

        const unsubscribeGroups = onSnapshot(groupsQuery, (groupSnapshot) => {
          const userGroupIds = groupSnapshot.docs.map(doc => doc.id);

          // 個人タスクを取得（グループIDがnullまたは未定義のもの）
          const personalTasksQuery = query(
            collection(db, "tasks"), 
            where("createdBy", "==", auth.currentUser.uid)
          );
          
          const unsubscribePersonal = onSnapshot(personalTasksQuery, (personalSnapshot) => {
            const personalTasks = personalSnapshot.docs
              .map(doc => ({
                id: doc.id,
                ...doc.data(),
                type: "personal"
              }))
              .filter(task => !task.groupId); // groupIdがないもののみ

            // グループタスクを取得
            if (userGroupIds.length > 0) {
              const groupTasksQuery = query(
                collection(db, "tasks"), 
                where("groupId", "in", userGroupIds)
              );
              
              const unsubscribeGroup = onSnapshot(groupTasksQuery, (groupSnapshot) => {
                const groupTasks = groupSnapshot.docs.map(doc => ({
                  id: doc.id,
                  ...doc.data(),
                  type: "group"
                }));

                // 重複を避けるため、IDでユニーク化
                const allTasks = [...personalTasks, ...groupTasks];
                const uniqueTasks = allTasks.filter((task, index, self) => 
                  index === self.findIndex(t => t.id === task.id)
                );
                
                setTasks(uniqueTasks);
              });

              return () => {
                unsubscribeGroup();
              };
            } else {
              // グループがない場合は個人タスクのみ
              setTasks(personalTasks);
            }
          });

          return () => {
            unsubscribePersonal();
          };
        });

        return () => {
          unsubscribeGroups();
        };
      } catch (error) {
        console.error("タスク取得エラー:", error);
      }
    };

    fetchAllTasks();
  }, [auth.currentUser]);

  // カレンダーの日付生成
  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    
    const days = [];
    const currentDateObj = new Date(startDate);
    
    while (days.length < 42) { // 6週間分
      days.push(new Date(currentDateObj));
      currentDateObj.setDate(currentDateObj.getDate() + 1);
    }
    
    return days;
  };

  // 指定した日付のタスクを取得
  const getTasksForDate = (date) => {
    return tasks.filter(task => {
      if (!task.dueDate) return false;
      
      const taskDate = new Date(task.dueDate);
      return (
        taskDate.getFullYear() === date.getFullYear() &&
        taskDate.getMonth() === date.getMonth() &&
        taskDate.getDate() === date.getDate()
      );
    });
  };

  // 月の移動
  const navigateMonth = (direction) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + direction);
    setCurrentDate(newDate);
  };

  // 今日の日付をチェック
  const isToday = (date) => {
    const today = new Date();
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    );
  };

  // 現在の月かどうかチェック
  const isCurrentMonth = (date) => {
    return date.getMonth() === currentDate.getMonth();
  };

  // 期限切れかどうかチェック
  const isOverdue = (date) => {
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return date < today;
  };

  const calendarDays = generateCalendarDays();
  const monthNames = [
    "1月", "2月", "3月", "4月", "5月", "6月",
    "7月", "8月", "9月", "10月", "11月", "12月"
  ];
  const dayNames = ["日", "月", "火", "水", "木", "金", "土"];

  return (
    <div className={styles.calendarContainer}>
      <div className={styles.calendarHeader}>
        <button 
          onClick={() => navigateMonth(-1)}
          className={styles.navButton}
        >
          ‹
        </button>
        <h2 className={styles.monthYear}>
          {currentDate.getFullYear()}年 {monthNames[currentDate.getMonth()]}
        </h2>
        <button 
          onClick={() => navigateMonth(1)}
          className={styles.navButton}
        >
          ›
        </button>
      </div>

      <div className={styles.calendar}>
        <div className={styles.weekDays}>
          {dayNames.map((day, index) => (
            <div key={index} className={styles.weekDay}>
              {day}
            </div>
          ))}
        </div>

        <div className={styles.calendarGrid}>
          {calendarDays.map((day, index) => {
            const dayTasks = getTasksForDate(day);
            const hasOverdueTasks = dayTasks.some(task => 
              task.status !== "完了" && isOverdue(new Date(task.dueDate))
            );
            
            return (
              <div
                key={index}
                className={`
                  ${styles.calendarDay}
                  ${isToday(day) ? styles.today : ''}
                  ${!isCurrentMonth(day) ? styles.otherMonth : ''}
                  ${dayTasks.length > 0 ? styles.hasTask : ''}
                  ${hasOverdueTasks ? styles.overdue : ''}
                `}
                onClick={() => setSelectedDate(selectedDate?.getTime() === day.getTime() ? null : day)}
              >
                <span className={styles.dayNumber}>
                  {day.getDate()}
                </span>
                
                {dayTasks.length > 0 && (
                  <div className={styles.taskIndicators}>
                    {dayTasks.slice(0, 3).map((task, taskIndex) => (
                      <div
                        key={task.id}
                        className={`
                          ${styles.taskIndicator}
                          ${styles[`priority${task.priority}`]}
                          ${task.status === "完了" ? styles.completed : ''}
                        `}
                        title={`${task.title} (${task.priority})`}
                      />
                    ))}
                    {dayTasks.length > 3 && (
                      <div className={styles.moreIndicator}>
                        +{dayTasks.length - 3}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {selectedDate && (
        <div className={styles.taskDetails}>
          <h3 className={styles.selectedDateTitle}>
            {selectedDate.getMonth() + 1}月{selectedDate.getDate()}日のタスク
          </h3>
          <div className={styles.taskList}>
            {getTasksForDate(selectedDate).length === 0 ? (
              <p className={styles.noTasks}>この日にはタスクがありません</p>
            ) : (
              getTasksForDate(selectedDate).map((task) => (
                <div 
                  key={task.id} 
                  className={`
                    ${styles.taskItem}
                    ${task.status === "完了" ? styles.completedTask : ''}
                    ${task.status !== "完了" && isOverdue(new Date(task.dueDate)) ? styles.overdueTask : ''}
                  `}
                >
                  <div className={styles.taskHeader}>
                    <span className={styles.taskTitle}>{task.title}</span>
                    <span className={`${styles.taskPriority} ${styles[`priority${task.priority}`]}`}>
                      {task.priority}
                    </span>
                  </div>
                  <div className={styles.taskMeta}>
                    <span className={styles.taskStatus}>{task.status}</span>
                    <span className={styles.taskType}>
                      {task.type === "personal" ? "個人" : "グループ"}
                    </span>
                    {task.dueTime && (
                      <span className={styles.taskTime}>
                        🕒 {task.dueTime}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className={styles.taskDescription}>{task.description}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskCalendar;