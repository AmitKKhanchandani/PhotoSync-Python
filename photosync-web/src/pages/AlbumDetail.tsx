import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { api } from '../api/apiClient';
import AuthImage from '../components/AuthImage';
import ConfirmDialog from '../components/ConfirmDialog';
import ShareAlbumModal from '../components/ShareAlbumModal';
import AlertDialog from '../components/AlertDialog';
import MediaInfoPanel from '../components/MediaInfoPanel';
import { ArrowLeft, Trash2, X, CheckCircle2, Circle, Play, Users, DownloadCloud, Download, Info, ChevronLeft, ChevronRight } from 'lucide-react';

const getMyUserId = () => {
  const token = localStorage.getItem('access_token');
  if (!token) return null;
  try { return parseInt(JSON.parse(atob(token.split('.')[1])).sub); } 
  catch (e) { return null; }
};

export default function AlbumDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const myUserId = getMyUserId();

  const [album, setAlbum] = useState<any>(null);
  const [photos, setPhotos] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [removeDialog, setRemoveDialog] = useState(false);
  const [itemsToRemove, setItemsToRemove] = useState<number[]>([]);
  
  const [importDialog, setImportDialog] = useState<{ isOpen: boolean, mode: 'all' | 'selected' }>({ isOpen: false, mode: 'all' });
  
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', type: 'success' as 'success'|'error' });
  const [isInfoPanelOpen, setIsInfoPanelOpen] = useState(false);

  const fetchDetails = async () => {
    try {
      const res = await api.get(`/albums/${id}`);
      setAlbum(res.data); 
      setPhotos(res.data.photos || []); 
    } catch (err) {
      console.error("Album load error", err);
      navigate('/albums');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { 
    fetchDetails(); 
  }, [id]);

  // 💥 KEYBOARD NAVIGATION FOR LIGHTBOX 💥
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isProcessing || removeDialog || isShareModalOpen || importDialog.isOpen) return;
      
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
  }, [isProcessing, removeDialog, isShareModalOpen, importDialog.isOpen, selectedMedia, photos]);

  const toggleSelection = (e: React.MouseEvent, photoId: number) => {
    e.stopPropagation(); 
    setSelectedIds(prev => 
      prev.includes(photoId) ? prev.filter(id => id !== photoId) : [...prev, photoId]
    );
  };

  const handleGridItemClick = (photo: any) => {
    if (selectedIds.length > 0) {
      setSelectedIds(prev => 
        prev.includes(photo.id) ? prev.filter(id => id !== photo.id) : [...prev, photo.id]
      );
    } else {
      setSelectedMedia(photo);
    }
  };

  const triggerRemove = (ids: number[]) => {
    setItemsToRemove(ids);
    setRemoveDialog(true);
  };

  const executeRemoveFromAlbum = async () => {
    setIsProcessing(true);
    try {
      await api.post(`/albums/${id}/remove-photos`, { photo_ids: itemsToRemove });
      setPhotos(prev => prev.filter(p => !itemsToRemove.includes(p.id)));
      setSelectedIds([]); 
      setSelectedMedia(null); 
      setRemoveDialog(false);
      setAlertState({ isOpen: true, title: "Success", message: "Photos removed from album.", type: "success" });
    } catch (err) {
      setAlertState({ isOpen: true, title: "Error", message: "Failed to remove items.", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const executeImport = async () => {
    setIsProcessing(true);
    try {
      if (importDialog.mode === 'all') {
        await api.post(`/albums/${id}/import-all`);
        setAlertState({ isOpen: true, title: "Success", message: "The entire album has been copied to your drive.", type: "success" });
        setTimeout(() => navigate('/albums'), 2000);
      } else {
        const importPromises = selectedIds.map(photoId => 
          api.post('/albums/import-photo', { photo_id: photoId })
        );
        await Promise.all(importPromises);
        setAlertState({ isOpen: true, title: "Success", message: `${selectedIds.length} photos copied to your drive!`, type: "success" });
        setSelectedIds([]); 
      }
    } catch(err) {
      setAlertState({ isOpen: true, title: "Error", message: "Failed to copy photos. They may already exist in your drive.", type: "error" });
    } finally {
      setIsProcessing(false);
      setImportDialog({ isOpen: false, mode: 'all' });
    }
  };

  const downloadSingle = async (photo: any) => {
    setIsProcessing(true);
    try {
      const response = await api.get(`/photos/file/${photo.id}`, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', photo.filename || 'download'); 
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err) {
      setAlertState({ isOpen: true, title: "Error", message: "Failed to download file.", type: "error" });
    } finally {
      setIsProcessing(false); 
    }
  };

  const downloadBatchZip = async () => {
    setIsProcessing(true);
    try {
      const response = await api.post('/photos/download-batch', { photo_ids: selectedIds }, { responseType: 'blob' });
      const blobUrl = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = blobUrl;
      link.setAttribute('download', `${album.name.replace(/\s+/g, '_')}_Export.zip`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(blobUrl); 
      setSelectedIds([]); 
    } catch (err) {
      setAlertState({ isOpen: true, title: "Error", message: "Failed to create zip file.", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const isSelectionMode = selectedIds.length > 0;
  const isOwner = album?.owner_id === myUserId;

  // Variables for Lightbox navigation
  const currentIndex = selectedMedia ? photos.findIndex(p => p.id === selectedMedia.id) : -1;
  const hasPrev = currentIndex > 0;
  const hasNext = currentIndex >= 0 && currentIndex < photos.length - 1;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col relative">
      
      {isProcessing && (
        <div className="fixed inset-0 z-[200] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center">
          <div className="bg-white p-6 rounded-2xl shadow-2xl flex flex-col items-center max-w-sm w-full mx-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mb-4"></div>
            <h3 className="text-xl font-bold text-slate-800">Processing...</h3>
          </div>
        </div>
      )}

      <AlertDialog 
        isOpen={alertState.isOpen} 
        title={alertState.title} 
        message={alertState.message} 
        type={alertState.type} 
        onClose={() => setAlertState(prev => ({...prev, isOpen: false}))} 
      />

      <header className={`sticky top-0 z-10 shadow-sm transition-colors ${isSelectionMode ? 'bg-indigo-600' : 'bg-white border-b border-slate-200'}`}>
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          {isSelectionMode ? (
            <div className="flex items-center gap-4 text-white w-full justify-between">
              <div className="flex items-center gap-4">
                <button onClick={() => setSelectedIds([])} className="p-2 hover:bg-indigo-700 rounded-full transition-colors"><X size={24}/></button>
                <span className="font-medium text-lg">{selectedIds.length} Selected</span>
              </div>
              
              <div className="flex items-center gap-2">
                <button onClick={downloadBatchZip} className="p-2 text-white hover:bg-indigo-700 rounded-full transition-colors" title="Download Zip">
                  <Download size={20} />
                </button>
                
                {isOwner ? (
                  <button onClick={() => triggerRemove(selectedIds)} className="p-2 text-white hover:bg-indigo-700 rounded-full transition-colors" title="Remove from Album">
                    <Trash2 size={20} />
                  </button>
                ) : (
                  <button onClick={() => setImportDialog({ isOpen: true, mode: 'selected' })} className="p-2 text-white hover:bg-indigo-700 rounded-full transition-colors" title="Save Selected to Drive">
                    <DownloadCloud size={20} />
                  </button>
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-4">
                <Link to="/albums" className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"><ArrowLeft size={24}/></Link>
                <div>
                  <h1 className="text-xl font-bold text-slate-900">{album?.name || 'Loading...'}</h1>
                  {!isOwner && album && (
                    <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100">
                      Shared with you
                    </span>
                  )}
                </div>
              </div>

              {album && (
                <div className="flex items-center gap-2">
                  {isOwner ? (
                    <button onClick={() => setIsShareModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 hover:bg-blue-100 rounded-lg font-medium transition-colors">
                      <Users size={18} /> Share
                    </button>
                  ) : (
                    <button onClick={() => setImportDialog({ isOpen: true, mode: 'all' })} className="flex items-center gap-2 px-4 py-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 rounded-lg font-medium transition-colors">
                      <DownloadCloud size={18} /> Save to Drive
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-7xl mx-auto px-4 py-8 w-full">
        {isLoading ? (
          <div className="flex justify-center items-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : photos.length === 0 ? (
          <div className="text-center py-24 bg-white rounded-2xl border border-slate-200 shadow-sm">
            <p className="text-slate-500">This album is currently empty.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-2 pb-24">
            {photos.map(photo => {
              const isSelected = selectedIds.includes(photo.id);
              return (
                <div 
                  key={photo.id} 
                  onClick={() => handleGridItemClick(photo)}
                  className={`relative aspect-square group rounded-lg overflow-hidden bg-slate-200 cursor-pointer transition-all duration-200 ${isSelected ? 'ring-4 ring-inset ring-indigo-500 scale-[0.95]' : 'shadow-sm hover:shadow-md'}`}
                >
                  <AuthImage photoId={photo.id} thumbnail={true} className="w-full h-full object-cover group-hover:scale-105" alt={photo.filename} />
                  
                  {isSelected && <div className="absolute inset-0 bg-indigo-500/20 mix-blend-multiply" />}
                  
                  <div 
                    onClick={(e) => toggleSelection(e, photo.id)}
                    className={`absolute top-2 left-2 rounded-full transition-opacity duration-200 p-1 ${isSelected ? 'opacity-100 text-indigo-600 bg-white shadow-sm' : 'opacity-0 group-hover:opacity-100 text-white/80 hover:text-white drop-shadow-md'}`}
                  >
                    {isSelected ? <CheckCircle2 size={24} fill="currentColor" className="text-white bg-indigo-600 rounded-full" /> : <Circle size={24} strokeWidth={2.5} />}
                  </div>

                  {photo.media_type === 'video' && (
                    <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md rounded-md px-2 py-1 text-white text-xs font-medium flex items-center gap-1">
                      <Play size={12} fill="currentColor" />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </main>

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
              <button onClick={() => downloadSingle(selectedMedia)} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors backdrop-blur-md" title="Download">
                <Download size={24} />
              </button>
              
              {isOwner ? (
                <button onClick={() => triggerRemove([selectedMedia.id])} className="p-2 text-red-400 hover:bg-red-500/20 rounded-full transition-colors backdrop-blur-md" title="Remove from Album">
                  <Trash2 size={24} />
                </button>
              ) : (
                <button onClick={() => {
                  setSelectedIds([selectedMedia.id]);
                  setSelectedMedia(null);
                  setImportDialog({ isOpen: true, mode: 'selected' });
                }} className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-full transition-colors backdrop-blur-md" title="Save to Drive">
                  <DownloadCloud size={24} />
                </button>
              )}

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

      <ConfirmDialog 
        isOpen={removeDialog}
        title="Remove from Album?"
        message={`This will remove ${itemsToRemove.length} photo(s) from this album. They will stay in your main library.`}
        confirmText="Remove Photos"
        onConfirm={executeRemoveFromAlbum}
        onCancel={() => { setRemoveDialog(false); setItemsToRemove([]); }}
        isProcessing={isProcessing}
      />

      <ConfirmDialog 
        isOpen={importDialog.isOpen}
        title={importDialog.mode === 'all' ? "Copy Entire Album?" : "Copy Selected Photos?"}
        message={importDialog.mode === 'all' 
          ? "This will physically copy all photos from this shared album into your personal storage drive." 
          : `This will physically copy the ${selectedIds.length} selected photo(s) into your personal storage drive.`}
        confirmText="Copy to My Drive"
        onConfirm={executeImport}
        onCancel={() => setImportDialog({ isOpen: false, mode: 'all' })}
        isProcessing={isProcessing}
      />

      <ShareAlbumModal 
        isOpen={isShareModalOpen}
        albumId={Number(id)}
        albumName={album?.name || ''}
        onClose={() => setIsShareModalOpen(false)}
      />
    </div>
  );
}