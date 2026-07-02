import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/apiClient';
import CreateAlbumModal from '../components/CreateAlbumModal';
import DeleteAlbumDialog from '../components/DeleteAlbumDialog';
import { Cloud, LogOut, Image as ImageIcon, FolderHeart, Users, FolderPlus, Trash2 } from 'lucide-react';

interface AlbumData {
  id: number;
  name: string;
  owner_id?: number;
  owner_username?: string;
}

interface AlbumsResponse {
  owned: AlbumData[];
  shared_with_me: AlbumData[];
}

export default function Albums() {
  const [albums, setAlbums] = useState<AlbumsResponse>({ owned: [], shared_with_me: [] });
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal States
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [albumToDelete, setAlbumToDelete] = useState<AlbumData | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchAlbums = async () => {
    try {
      const response = await api.get('/albums/');
      setAlbums(response.data);
    } catch (err) {
      console.error("Failed to fetch albums", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAlbums();
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  };

  const handleDeleteAlbum = async (deleteFiles: boolean) => {
    if (!albumToDelete) return;
    
    setIsDeleting(true);
    try {
      // Calls your endpoint: /albums/{id}?delete_files=true|false
      await api.delete(`/albums/${albumToDelete.id}?delete_files=${deleteFiles}`);
      setAlbumToDelete(null);
      fetchAlbums(); // Refresh the list
    } catch (err) {
      console.error("Failed to delete album", err);
      alert("Failed to delete album.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* HEADER WITH NAVIGATION */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Cloud size={24} className="text-blue-600" />
              <span className="text-xl font-bold text-slate-900 hidden sm:block">PhotoSync</span>
            </div>
            <nav className="flex space-x-1 border border-slate-200 bg-slate-100 p-1 rounded-xl">
              <Link to="/" className="flex items-center gap-2 px-4 py-1.5 text-slate-600 hover:text-slate-900 font-medium text-sm transition-all rounded-lg">
                <ImageIcon size={16} /> Photos
              </Link>
              <Link to="/albums" className="flex items-center gap-2 px-4 py-1.5 bg-white shadow-sm rounded-lg text-blue-700 font-medium text-sm transition-all">
                <FolderHeart size={16} /> Albums
              </Link>
              <Link to="/network" className="flex items-center gap-2 px-4 py-1.5 text-slate-600 hover:text-slate-900 font-medium text-sm transition-all rounded-lg">
                <Users size={16} /> Network
              </Link>
            </nav>
          </div>

          <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <div className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Your Albums</h1>
            <p className="text-slate-500 mt-1">Organize and share your memories</p>
          </div>
          
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg shadow-sm transition-colors flex items-center gap-2"
          >
            <FolderPlus size={18} /> New Album
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-12">
            
            {/* MY ALBUMS */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <FolderHeart size={20} className="text-slate-400" /> My Albums
              </h2>
              {albums.owned.length === 0 ? (
                <div className="p-8 text-center bg-white border border-slate-200 rounded-xl shadow-sm">
                  <p className="text-slate-500">You haven't created any albums yet.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {albums.owned.map(album => (
                    <div key={album.id} className="relative group bg-white border border-slate-200 rounded-xl p-6 hover:shadow-md transition-all hover:border-blue-300">
                      <Link to={`/albums/${album.id}`} className="block pr-8">
                        <h3 className="font-semibold text-lg text-slate-900 truncate">{album.name}</h3>
                        <p className="text-sm text-slate-500 mt-1">Click to view contents</p>
                      </Link>
                      
                      <button 
                        onClick={(e) => {
                          e.preventDefault(); // Prevent navigating to the album
                          setAlbumToDelete(album);
                        }}
                        className="absolute top-4 right-4 p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-full opacity-0 group-hover:opacity-100 transition-all"
                        title="Delete Album"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* SHARED WITH ME */}
            <section>
              <h2 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
                <Users size={20} className="text-slate-400" /> Shared With Me
              </h2>
              {albums.shared_with_me.length === 0 ? (
                <div className="p-8 text-center bg-slate-100 rounded-xl border border-slate-200 border-dashed">
                  <p className="text-slate-500">No albums have been shared with you.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {albums.shared_with_me.map(album => (
                    <div key={album.id} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-6 hover:shadow-md transition-shadow">
                      <Link to={`/albums/${album.id}`} className="block">
                        <h3 className="font-semibold text-lg text-blue-900 truncate">{album.name}</h3>
                        <div className="flex items-center gap-1 mt-2 text-sm text-blue-600 font-medium">
                          <Users size={14} /> <span>By {album.owner_username}</span>
                        </div>
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </section>

          </div>
        )}
      </main>

      {/* Modals */}
      <CreateAlbumModal 
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onAlbumCreated={fetchAlbums} 
      />

      <DeleteAlbumDialog
        isOpen={albumToDelete !== null}
        albumName={albumToDelete?.name || ''}
        onClose={() => setAlbumToDelete(null)}
        onConfirm={handleDeleteAlbum}
        isProcessing={isDeleting}
      />

    </div>
  );
}