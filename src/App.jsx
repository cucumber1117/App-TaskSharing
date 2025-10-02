import { Routes, Route } from "react-router-dom";
import { useAuth } from "./contexts/AuthContext.jsx";
import ProtectedRoute from "./components/ProtectedRoute.jsx";
import Home from "./pages/Home/Home.jsx";
import Login from "./pages/Login/Login.jsx";
import Group from "./pages/Group/Group.jsx";
import GroupDetail from "./pages/GroupDetail/GroupDetail.jsx";
import GroupCreate from "./pages/GroupCreate/GroupCreate.jsx";
import Settings from "./pages/Settings/Settings.jsx";

function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={user ? <Home /> : <Login />} />
      <Route 
        path="/home" 
        element={
          <ProtectedRoute>
            <Home />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/group" 
        element={
          <ProtectedRoute>
            <Group />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/group/:groupId" 
        element={
          <ProtectedRoute>
            <GroupDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/group-create" 
        element={
          <ProtectedRoute>
            <GroupCreate />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/settings" 
        element={
          <ProtectedRoute>
            <Settings />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
}

export default App;
