import Header from "./components/Header/Header";
import WelcomeSection from "./components/WelcomeSection/WelcomeSection";
import AboutSection from "./components/AboutSection/AboutSection";

function App() {
  return (
    <div className="App">
      <Header />
      <main>
        <WelcomeSection />
        <AboutSection />
      </main>
    </div>
  );
}

export default App;
