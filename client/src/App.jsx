import { Route, Routes } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import ModulePage from './pages/ModulePage';
import QuizPage from './pages/QuizPage';
import ScenarioPage from './pages/ScenarioPage';
import CapstonePage from './pages/CapstonePage';
import GlossaryPage from './pages/GlossaryPage';
import AchievementsPage from './pages/AchievementsPage';
import Layout from './components/Layout';

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/module/:moduleId" element={<ModulePage />} />
        <Route path="/module/:moduleId/quiz" element={<QuizPage />} />
        <Route path="/module/:moduleId/scenario" element={<ScenarioPage />} />
        <Route path="/capstone" element={<CapstonePage />} />
        <Route path="/glossary" element={<GlossaryPage />} />
        <Route path="/achievements" element={<AchievementsPage />} />
      </Route>
    </Routes>
  );
}
