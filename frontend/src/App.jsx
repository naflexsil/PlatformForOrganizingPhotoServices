import React, { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Header from "./components/Header/Header";
import Footer from "./components/Footer/Footer";
import MainPage from "./pages/MainPage/MainPage";
import PhotographerProfile from "./pages/PhotographerProfile/PhotographerProfile";

function App() {
  const [isAuth, setIsAuth] = useState(true);

  return (
    <Router>
      <Header isAuthenticated={isAuth} />
      <Routes>
        <Route path="/" element={<MainPage />} />
        <Route
          path="/profile"
          element={<PhotographerProfile isMyProfile={true} />}
        />
      </Routes>
      <Footer />
    </Router>
  );
}

export default App;
