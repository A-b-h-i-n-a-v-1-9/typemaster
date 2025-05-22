import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainLayout from "./layouts/MainLayout";
import Home from "./pages/Home";
import CreateRoom from "./pages/CreateRoom";
import Room from "./pages/Room";
import JoinRoom from "./pages/JoinRoom"; // ✅ This line is retained from HEAD

function App() {
  return (
    <Router>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/create-room" element={<CreateRoom />} />
          <Route path="/room/:roomId" element={<Room />} />
          <Route path="/join-room" element={<JoinRoom />} /> {/* ✅ Route added */}
        </Routes>
      </MainLayout>
    </Router>
  );
}

export default App;