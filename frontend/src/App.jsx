import Header from "./components/Header/Header";
import WelcomeSection from "./components/WelcomeSection/WelcomeSection";
import AboutSection from "./components/AboutSection/AboutSection";
import FeaturesSection from "./components/FeaturesSection/FeaturesSection";
import FeedSection from "./components/FeedSection/FeedSection";
import SoulSection from "./components/SoulSection/SoulSection";
import Footer from "./components/Footer/Footer";

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <WelcomeSection />
        <AboutSection />
        <FeaturesSection />
        <FeedSection />
        <SoulSection />
      </main>
      <Footer />
    </div>
  );
}

export default App;
