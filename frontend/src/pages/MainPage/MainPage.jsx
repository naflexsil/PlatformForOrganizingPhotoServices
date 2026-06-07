import React from "react";
import WelcomeSection from "./WelcomeSection/WelcomeSection.jsx";
import AboutSection from "./AboutSection/AboutSection.jsx";
import FeaturesSection from "./FeaturesSection/FeaturesSection.jsx";
import FeedSection from "./FeedSection/FeedSection.jsx";
import SoulSection from "./SoulSection/SoulSection.jsx";

const MainPage = ({ onOpenAuthModal }) => {
  return (
    <main>
      <WelcomeSection />
      <AboutSection />
      <FeaturesSection />
      <FeedSection />
      <SoulSection onOpenAuthModal={onOpenAuthModal} />
    </main>
  );
};

export default MainPage;
