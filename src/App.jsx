import { Routes, Route } from "react-router-dom";
import Home from "./pages/Home/Home.jsx";
import Login from "./pages/Login/Login.jsx";
import Group from "./pages/Group/Group.jsx";
import GroupCreate from "./pages/GroupCreate/GroupCreate.jsx";
import Settings from "./pages/Settings/Settings.jsx";

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/home" element={<Home />} />
      <Route path="/group" element={<Group />} />
      <Route path="/group-create" element={<GroupCreate />} />
      <Route path="/settings" element={<Settings />} />
    </Routes>
  );
}

export default App;
