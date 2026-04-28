import Header from "./components/Header/Header";
import WelcomeSection from "./components/WelcomeSection/WelcomeSection";
import AboutSection from "./components/AboutSection/AboutSection";
import FeaturesSection from "./components/FeaturesSection/FeaturesSection";

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <WelcomeSection />
        <AboutSection />
        <FeaturesSection />
      </main>
    </div>
  );
}

export default App;
