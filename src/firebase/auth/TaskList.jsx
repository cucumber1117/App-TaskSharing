import React, { useEffect, useState } from "react";
import { db } from "../../firebase/firebaseConfig";
import { collection, addDoc, onSnapshot, serverTimestamp } from "firebase/firestore";

const TaskList = () => {
  const [tasks, setTasks] = useState([]);
  const [newTask, setNewTask] = useState("");

  useEffect(() => {
    const q = collection(db, "tasks");
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setTasks(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const addTask = async () => {
    if (!newTask) return;
    await addDoc(collection(db, "tasks"), {
      title: newTask,
      status: "未着手",
      createdAt: serverTimestamp(),
    });
    setNewTask("");
  };

  return (
    <div>
      <h2>課題一覧</h2>
      <div>
        <input
          type="text"
          placeholder="新しい課題"
          value={newTask}
          onChange={(e) => setNewTask(e.target.value)}
        />
        <button onClick={addTask}>追加</button>
      </div>
      <ul>
        {tasks.map((task) => (
          <li key={task.id}>
            {task.title} ({task.status})
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TaskList;
