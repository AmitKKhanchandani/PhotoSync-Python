import React, { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import AuthImage from '../components/AuthImage';
import UploadModal from '../components/UploadModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AddToAlbumModal from '../components/AddToAlbumModal';
import AlertDialog from '../components/AlertDialog';
import MediaInfoPanel from '../components/MediaInfoPanel';
import NavBar from '../components/NavBar'; // NEW NAVBAR
import { Cloud, LogOut, X, Play, Plus, Trash2, Download, CheckCircle2, Circle, FolderPlus, Info, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Gallery() {
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMedia, setSelectedMedia] = useState<any | null>(null);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isProcessingAction, setIsProcessingAction] = useState(false);
  const [deleteDialog, setDeleteDialog] = useState<{ isOpen: boolean, ids: number[] }>({ isOpen: false, ids: [] });
  const [isAddToAlbumOpen, setIsAddToAlbumOpen] = useState(false);
  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', type: 'success' as 'success'|'error' });
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  const fetchPhotos = async () => {
    try {
      const response = await api.get('/photos/list');
      setPhotos(response.data.photos);
    } catch (err) {
      console.error("Failed to load gallery", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPhotos();
  }, []);

  // 💥 KEYBOARD NAVIGATION FOR LIGHTBOX 💥
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isProcessingAction || deleteDialog.isOpen || isAddToAlbumOpen || isUploadModalOpen) return;
      
      if (e.key === 'Escape') {
        setSelectedMedia(null);
        setIsInfoPanelOpen(false);
      }
      
      if (selectedMedia) {
        const currentIndex = photos.findIndex(p => p.id === selectedMedia.id);
        if (e.key === 'ArrowRight' && currentIndex < photos.length - 1) {
          setSelectedMedia(photos[currentIndex + 1]);
        } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
          setSelectedMedia(photos[currentIndex - 1]);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isProcessingAction, deleteDialog.isOpen, isAddToAlbumOpen, isUploadModalOpen, selectedMedia, photos]);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  };

  const toggleSelection = (e: React.MouseEvent, id: number) => {
    e.stopPropagation(); 
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const handleGridItemClick = (photo: any) => {
    if (selectedIds.size > 0) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(photo.id)) next.delete(photo.id); else next.add(photo.id);
        return next;
      });
    } else {
      setSelectedMedia(photo);
    }
  };

  const executeDelete = async () => {
    setIsProcessingAction(true);
    try {
      await api.post('/photos/delete-batch', { photo_ids: deleteDialog.ids });
      setPhotos(prev => prev.filter(p => !deleteDialog.ids.includes(p.id)));
      setSelectedIds(new Set()); 
      setSelectedMedia(null);    
      setDeleteDialog({ isOpen: false, ids: [] });
    } catch (err) {
      setAlertState({ isOpen: true, title: "Error", message: "Failed to delete items.", type: "error" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const downloadSingle = async (photo: any) => {
    setIsProcessingAction(true);
    try {
      const response = await api.get(`/photos/file/${photo.id}`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', photo.filename); 
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setAlertState({ isOpen: true, title: "Error", message: "Failed to download file.", type: "error" });
    } finally {
      setIsProcessingAction(false); 
    }
  };

  const downloadBatchZip = async () => {
    setIsProcessingAction(true);
    try {
      const idsArray = Array.from(selectedIds);
      const response = await api.post('/photos/download-batch', { photo_ids: idsArray }, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', 'PhotoSync_Export.zip');
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl); 
      setSelectedIds(new Set()); 
    } catch (err) {
      setAlertState({ isOpen: true, title: "Error", message: "Failed to create zip file.", type: "error" });
    } finally {
      setIsProcessingAction(false);
    }
  };

  const isSelectionMode = selectedIds.size > 0;

  // Variables for Lightbox navigation
  const currentIndex = selectedMedia ? photos.findIndex(p => p.id === selectedMedia.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < photos.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      
      {isProcessingAction && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
            <h3 className="text-xl font-bold text-slate-800">Processing...</h3>
          </div>
        </div>
      )}

      <ConfirmDialog 
        isOpen={deleteDialog.isOpen}
        title="Delete Media?"
        message={`Are you sure you want to permanently delete ${deleteDialog.ids.length} item(s)?`}
        confirmText="Delete Permanently"
        onConfirm={executeDelete}
        onCancel={() => setDeleteDialog({ isOpen: false, ids: [] })}
      />

      <AddToAlbumModal
        isOpen={isAddToAlbumOpen}
        onClose={() => setIsAddToAlbumOpen(false)}
        photoIds={Array.from(selectedIds)}
        onComplete={() => {
          setSelectedIds(new Set()); 
          setAlertState({ isOpen: true, title: "Success", message: "Photos successfully added to the album!", type: "success" });
        }}
      />

      <AlertDialog 
        isOpen={alertState.isOpen} 
        title={alertState.title} 
        message={alertState.message} 
        type={alertState.type} 
        onClose={() => setAlertState(prev => ({...prev, isOpen: false}))} 
      />

      <header className={`sticky top-0 z-10 shadow-sm transition-colors ${isSelectionMode ? 'bg-blue-600' : 'bg-white border-b border-slate-200'}`}>
        <div className="w-full px-4 sm:px-8 h-16 flex items-center justify-between">
          {isSelectionMode ? (
            <>
              <div className="flex items-center gap-4 text-white">
                <button onClick={() => setSelectedIds(new Set())} className="p-2 hover:bg-blue-700 rounded-full transition-colors" title="Deselect All">
                  <X size={24} />
                </button>
                <span className="text-lg font-medium">{selectedIds.size} Selected</span>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setIsAddToAlbumOpen(true)} className="p-2 text-white hover:bg-blue-700 rounded-full transition-colors" title="Add to Album">
                  <FolderPlus size={20} />
                </button>
                <button onClick={downloadBatchZip} className="p-2 text-white hover:bg-blue-700 rounded-full transition-colors" title="Download Zip">
                  <Download size={20} />
                </button>
                <button onClick={() => setDeleteDialog({ isOpen: true, ids: Array.from(selectedIds) })} className="p-2 text-white hover:bg-blue-700 rounded-full transition-colors" title="Delete Selected">
                  <Trash2 size={20} />
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <Cloud size={24} className="text-blue-600" />
                  <span className="text-xl font-bold text-slate-900 hidden sm:block">PhotoSync</span>
                </div>
                <NavBar /> {/* 💥 CLEAN REUSABLE NAVBAR */}
              </div>
              <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100">
                <LogOut size={20} />
              </button>
            </>
          )}
        </div>
      </header>

      <main className="flex-1 w-full px-4 sm:px-8 py-8 w-full">
        {!isSelectionMode && (
          <div className="mb-8 flex justify-between items-end">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Your Photos</h1>
              <p className="text-slate-500 mt-1">Viewing all synchronized media</p>
            </div>
            <div className="text-sm font-medium text-slate-400 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm">
              {photos.length} items
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-500">No photos found. Upload some from your PC!</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 pb-24">
            {photos.map((photo) => {
              const isSelected = selectedIds.has(photo.id);
              return (
                <div key={photo.id} onClick={() => handleGridItemClick(photo)} className={`relative aspect-square group rounded-lg overflow-hidden bg-slate-200 cursor-pointer transition-all duration-200 ${isSelected ? 'ring-4 ring-inset ring-blue-500 scale-[0.95]' : 'shadow-sm hover:shadow-md'}`}>
                  <AuthImage photoId={photo.id} thumbnail={true} className="w-full h-full object-cover group-hover:scale-105" alt={photo.filename} />
                  {isSelected && <div className="absolute inset-0 bg-blue-500/20 mix-blend-multiply" />}
                  <div onClick={(e) => toggleSelection(e, photo.id)} className={`absolute top-2 left-2 rounded-full transition-opacity duration-200 p-1 ${isSelected ? 'opacity-100 text-blue-600 bg-white shadow-sm' : 'opacity-0 group-hover:opacity-100 text-white/80 hover:text-white drop-shadow-md'}`}>
                    {isSelected ? <CheckCircle2 size={24} fill="currentColor" className="text-white bg-blue-600 rounded-full" /> : <Circle size={24} strokeWidth={2.5} />}
                  </div>
                  {photo.media_type === 'video' && (
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md rounded-md px-2 py-1 text-white text-xs font-medium flex items-center gap-1">
                      <Play size={12} fill="currentColor" />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>

      {!isSelectionMode && (
        <button onClick={() => setIsUploadModalOpen(true)} className="fixed bottom-8 right-8 p-4 bg-blue-600 text-white rounded-full shadow-xl shadow-blue-600/30 hover:bg-blue-700 hover:scale-105 active:scale-95 transition-all z-40">
          <Plus size={28} />
        </button>
      )}

      <UploadModal isOpen={isUploadModalOpen} onClose={() => setIsUploadModalOpen(false)} onUploadComplete={fetchPhotos} />

      {/* 💥 UPGRADED LIGHTBOX OVERLAY */}
      {selectedMedia && (
        <div className="fixed inset-0 z-[150] bg-black/95 backdrop-blur-sm flex items-center justify-center p-4 sm:p-8 overflow-hidden">
          
          <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-center bg-gradient-to-b from-black/60 to-transparent z-50">
            <div className="text-white drop-shadow-md">
              <p className="font-medium text-lg">{selectedMedia.filename}</p>
            </div>
            <div className="flex items-center gap-3">
              <button onClick={() => setIsInfoPanelOpen(!isInfoPanelOpen)} className={`p-2 rounded-full transition-colors backdrop-blur-md ${isInfoPanelOpen ? 'bg-blue-600 text-white' : 'text-white hover:bg-white/20'}`} title="Info">
                <Info size={24} />
              </button>
              <button onClick={() => downloadSingle(selectedMedia)} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors backdrop-blur-md" title="Download Original">
                <Download size={24} />
              </button>
              <button onClick={() => setDeleteDialog({ isOpen: true, ids: [selectedMedia.id] })} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition-colors backdrop-blur-md" title="Delete File">
                <Trash2 size={24} />
              </button>
              <div className="w-px h-6 bg-white/20 mx-1"></div>
              <button onClick={() => { setSelectedMedia(null); setIsInfoPanelOpen(false); }} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors backdrop-blur-md" title="Close">
                <X size={28} />
              </button>
            </div>
          </div>

          {/* 💥 LEFT / RIGHT ARROWS */}
          {hasPrev && (
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedMedia(photos[currentIndex - 1]); }}
              className="absolute left-4 sm:left-8 top-1/2 -translate-y-1/2 z-50 p-3 text-white hover:bg-white/20 rounded-full transition-all backdrop-blur-md hover:scale-110 active:scale-95"
            >
              <ChevronLeft size={36} strokeWidth={2} />
            </button>
          )}

          {hasNext && (
            <button 
              onClick={(e) => { e.stopPropagation(); setSelectedMedia(photos[currentIndex + 1]); }}
              className={`absolute top-1/2 -translate-y-1/2 z-50 p-3 text-white hover:bg-white/20 rounded-full transition-all backdrop-blur-md hover:scale-110 active:scale-95 ${isInfoPanelOpen ? 'right-[340px]' : 'right-4 sm:right-8'}`}
            >
              <ChevronRight size={36} strokeWidth={2} />
            </button>
          )}

          <div className={`w-full h-full flex items-center justify-center max-w-7xl mx-auto pt-16 pb-8 transition-all duration-300 ${isInfoPanelOpen ? 'pr-80' : ''}`}>
            {selectedMedia.media_type === 'video' ? (
              <video 
                key={selectedMedia.id} 
                className="max-w-full max-h-full rounded-md shadow-2xl bg-black" 
                controls 
                autoPlay 
                playsInline 
                src={`${import.meta.env.DEV ? (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000') : window.location.origin}/photos/file/${selectedMedia.id}?token=${localStorage.getItem('access_token')}`}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <AuthImage key={selectedMedia.id} photoId={selectedMedia.id} thumbnail={false} className="max-w-full max-h-full object-contain rounded-md shadow-2xl" alt={selectedMedia.filename} />
            )}
          </div>

          <MediaInfoPanel 
            photoId={selectedMedia.id} 
            isOpen={isInfoPanelOpen} 
            onClose={() => setIsInfoPanelOpen(false)} 
          />

        </div>
      )}
    </div>
  );
}