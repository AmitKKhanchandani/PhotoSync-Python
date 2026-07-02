import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Gallery from './pages/Gallery';
import Albums from './pages/Albums'; // <-- New Import
import AlbumDetail from './pages/AlbumDetail';
import Network from './pages/Network';
import Register from './pages/Register';

function App() {
  const isAuthenticated = !!localStorage.getItem('access_token');

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />

        <Route path="/register" element={<Register />} />
        
        <Route 
          path="/" 
          element={isAuthenticated ? <Gallery /> : <Navigate to="/login" replace />} 
        />
        
        {/* NEW ALBUMS ROUTE */}
        <Route 
          path="/albums" 
          element={isAuthenticated ? <Albums /> : <Navigate to="/login" replace />} 
        />

        <Route path="/albums/:id" element={isAuthenticated ? <AlbumDetail /> : <Navigate to="/login" replace />} />
        
        <Route path="/network" element={isAuthenticated ? <Network /> : <Navigate to="/login" replace />} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;