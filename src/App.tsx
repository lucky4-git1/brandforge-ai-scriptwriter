import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Layout } from './components/layout/Layout';
import { Dashboard } from './pages/Dashboard';
import { ContentGenerator } from './pages/ContentGenerator';
import { Trends } from './pages/Trends';
import { Workspace } from './pages/Workspace';
import { Settings } from './pages/Settings';
import { Skills } from './pages/Skills';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/generate" element={<ContentGenerator />} />
          <Route path="/trends" element={<Trends />} />
          <Route path="/workspace" element={<Workspace />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/settings" element={<Settings />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
