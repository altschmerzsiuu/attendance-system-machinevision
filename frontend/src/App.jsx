import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Dashboard from './pages/Dashboard';
import Register from './pages/Register';
import Capture from './pages/Capture';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<MainLayout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/register" element={<Register />} />
          <Route path="/capture" element={<Capture />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
