import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Landing } from './pages/Landing';
import { DatasetBrowser } from './pages/DatasetBrowser';
import { DatasetDetail } from './pages/DatasetDetail';
import { Leaderboard } from './pages/Leaderboard';
import './index.css';

function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="min-h-screen flex flex-col">
        <Header />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/datasets" element={<DatasetBrowser />} />
            <Route path="/datasets/:name" element={<DatasetDetail />} />
            <Route path="/leaderboard" element={<Leaderboard />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
