import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home.jsx";
import Login from "./pages/Login/Login.jsx";
import Group from "./pages/Group/Group.jsx";
import GroupCreate from "./pages/GroupCreate/GroupCreate.jsx";

function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />
      <Route path="/group" element={<Group />} />
      <Route path="/group-create" element={<GroupCreate />} />
    </Routes>
  );
}

export default App;
