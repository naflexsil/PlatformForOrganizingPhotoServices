import Header from "./components/Header/Header";
import WelcomeSection from "./components/WelcomeSection/WelcomeSection";
import AboutSection from "./components/AboutSection/AboutSection";
import FeaturesSection from "./components/FeaturesSection/FeaturesSection";
import FeedSection from "./components/FeedSection/FeedSection";

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <WelcomeSection />
        <AboutSection />
        <FeaturesSection />
        <FeedSection />
      </main>
    </div>
  );
}

export default App;
