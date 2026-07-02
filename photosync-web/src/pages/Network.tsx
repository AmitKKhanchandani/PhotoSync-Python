import { useState, useEffect } from 'react';
import { api } from '../api/apiClient';
import AlertDialog from '../components/AlertDialog';
import ConfirmDialog from '../components/ConfirmDialog';
import { Cloud, LogOut, Image as Users, UserPlus, Check, X, UserCheck, ShieldCheck, Search, UserMinus, Send } from 'lucide-react';
import NavBar from '../components/NavBar';

interface Connection {
  user_id: number;
  username: string;
}

interface PendingRequest {
  request_id: number;
  user_id: number;
  username: string;
}

interface SearchUser {
  id: number;
  username: string;
}

export default function Network() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [pendingRequests, setPendingRequests] = useState<PendingRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<PendingRequest[]>([]); // NEW
  const [isLoading, setIsLoading] = useState(true);
  
  // LIVE SEARCH STATE
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchUser[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  
  // DIALOG STATES
  const [alertState, setAlertState] = useState({ isOpen: false, title: '', message: '', type: 'success' as 'success'|'error' });
  const [unfollowTarget, setUnfollowTarget] = useState<Connection | null>(null); // NEW

  const fetchNetworkData = async () => {
    try {
      const [connRes, pendingRes, sentRes] = await Promise.all([
        api.get('/network/connections'),
        api.get('/network/requests/pending'),
        api.get('/network/requests/sent') // NEW
      ]);
      setConnections(connRes.data);
      setPendingRequests(pendingRes.data);
      setSentRequests(sentRes.data);
    } catch (err) {
      console.error("Failed to load network data", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchNetworkData();
  }, []);

  // THE LIVE SEARCH ENGINE
  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.length < 3) {
        setSearchResults([]);
        return;
      }
      setIsSearching(true);
      try {
        const response = await api.get(`/albums/available-users?q=${searchQuery}`);
        // Filter out people we are already connected to
        const existingUsernames = connections.map(c => c.username);
        const filteredResults = response.data.filter((u: SearchUser) => !existingUsernames.includes(u.username));
        setSearchResults(filteredResults);
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsSearching(false);
      }
    };

    const timeoutId = setTimeout(() => { searchUsers(); }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, connections]);

  const handleSendRequest = async (targetUsername: string) => {
    setIsProcessing(true);
    try {
      const res = await api.post(`/network/follow/${targetUsername}`);
      setAlertState({ 
        isOpen: true, 
        title: res.data.status === 'info' ? "Notice" : "Success", 
        message: res.data.message, 
        type: "success" 
      });
      setSearchQuery(''); 
      setSearchResults([]); 
      await fetchNetworkData(); // Refresh to show in Sent Requests
    } catch (err: any) {
      setAlertState({ isOpen: true, title: "Error", message: err.response?.data?.detail || "Failed to send request.", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleResolveRequest = async (requestId: number, action: 'accept' | 'reject') => {
    setIsProcessing(true);
    try {
      await api.post(`/network/requests/${requestId}/${action}`);
      await fetchNetworkData(); 
    } catch (err) {
      setAlertState({ isOpen: true, title: "Error", message: "Failed to process request.", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  // NEW: Cancel a request you sent
  const handleCancelRequest = async (requestId: number) => {
    setIsProcessing(true);
    try {
      await api.delete(`/network/requests/${requestId}/cancel`);
      await fetchNetworkData(); 
    } catch (err) {
      setAlertState({ isOpen: true, title: "Error", message: "Failed to cancel request.", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  // NEW: Execute the unfollow after dialog confirmation
  const executeUnfollow = async () => {
    if (!unfollowTarget) return;
    setIsProcessing(true);
    try {
      await api.delete(`/network/connections/${unfollowTarget.user_id}`);
      setUnfollowTarget(null);
      await fetchNetworkData();
      setAlertState({ isOpen: true, title: "Disconnected", message: `You are no longer connected to ${unfollowTarget.username}.`, type: "success" });
    } catch (err) {
      setAlertState({ isOpen: true, title: "Error", message: "Failed to remove connection.", type: "error" });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    window.location.href = '/login';
  };

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

      {/* NEW: Unfollow Confirm Dialog */}
      <ConfirmDialog 
        isOpen={unfollowTarget !== null}
        title="Remove Connection?"
        message={`Are you sure you want to disconnect from ${unfollowTarget?.username}? They will lose access to any albums you shared with them, and you will lose access to theirs.`}
        confirmText="Remove Connection"
        onConfirm={executeUnfollow}
        onCancel={() => setUnfollowTarget(null)}
        isProcessing={isProcessing}
      />

      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="w-full px-4 sm:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2">
              <Cloud size={24} className="text-blue-600" />
              <span className="text-xl font-bold text-slate-900 hidden sm:block">PhotoSync</span>
            </div>
            <NavBar />
            
          </div>

          <button onClick={handleLogout} className="p-2 text-slate-500 hover:text-slate-900 transition-colors rounded-full hover:bg-slate-100">
            <LogOut size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-12 w-full">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-slate-900">Family Network</h1>
          <p className="text-slate-500 mt-2">Manage your connections to share albums seamlessly.</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* LEFT COLUMN: Add Friends & Connections */}
            <div className="lg:col-span-2 space-y-8">
              
              {/* SEARCH & INVITE DROPDOWN BOX */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <UserPlus size={20} className="text-blue-600" /> Send Invite
                </h2>
                
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600/20 focus:border-blue-600 transition-all text-slate-900"
                    placeholder="Search for family members (min 3 chars)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    disabled={isProcessing}
                  />
                  {isSearching && (
                    <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    </div>
                  )}

                  {searchQuery.length >= 3 && (
                    <div className="absolute z-20 mt-2 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200">
                      {searchResults.length === 0 && !isSearching ? (
                        <div className="p-4 text-center text-sm text-slate-500">No matching users found.</div>
                      ) : (
                        searchResults.map(user => (
                          <div key={user.id} className="flex items-center justify-between p-3 hover:bg-slate-50 border-b border-slate-100 last:border-0">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs">
                                {user.username.charAt(0).toUpperCase()}
                              </div>
                              <span className="font-medium text-slate-700">{user.username}</span>
                            </div>
                            <button 
                              onClick={() => handleSendRequest(user.username)}
                              disabled={isProcessing}
                              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-1 disabled:opacity-50 shadow-sm shadow-blue-600/20"
                            >
                              <UserPlus size={16} /> Connect
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              </section>

              {/* My Connections Box */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <ShieldCheck size={20} className="text-emerald-500" /> Approved Connections
                </h2>
                
                {connections.length === 0 ? (
                  <div className="text-center py-8 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                    <Users size={32} className="mx-auto text-slate-300 mb-3" />
                    <p className="text-slate-500">You haven't connected with anyone yet.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {connections.map(user => (
                      <div key={user.user_id} className="flex items-center justify-between p-4 border border-slate-100 bg-slate-50 rounded-xl group transition-colors hover:border-slate-300">
                        <div className="flex items-center gap-4 min-w-0">
                          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 font-bold text-lg shrink-0">
                            {user.username.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-slate-800 truncate">{user.username}</p>
                            <p className="text-xs font-medium text-emerald-600 uppercase tracking-wider flex items-center gap-1 mt-0.5">
                              <UserCheck size={12} /> Connected
                            </p>
                          </div>
                        </div>
                        {/* 💥 NEW: Hover to reveal Disconnect button */}
                        <button 
                          onClick={() => setUnfollowTarget(user)}
                          className="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                          title="Remove Connection"
                        >
                          <UserMinus size={20} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT COLUMN: Requests (Pending & Sent) */}
            <div className="lg:col-span-1 space-y-6">
              
              {/* Received Requests */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Users size={20} className="text-amber-500" /> Pending Invites
                </h2>

                {pendingRequests.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                    <p className="text-slate-500 text-sm">No pending requests.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {pendingRequests.map(req => (
                      <div key={req.request_id} className="p-4 border border-slate-100 bg-amber-50/30 rounded-xl">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 font-bold shrink-0">
                            {req.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-bold text-slate-800 leading-tight">{req.username}</p>
                            <p className="text-xs text-slate-500">Wants to connect</p>
                          </div>
                        </div>
                        
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleResolveRequest(req.request_id, 'accept')}
                            disabled={isProcessing}
                            className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <Check size={16} /> Accept
                          </button>
                          <button 
                            onClick={() => handleResolveRequest(req.request_id, 'reject')}
                            disabled={isProcessing}
                            className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-medium rounded-lg transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                          >
                            <X size={16} /> Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* 💥 NEW: Sent Requests Box */}
              <section className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
                <h2 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                  <Send size={18} className="text-slate-400" /> Sent Requests
                </h2>

                {sentRequests.length === 0 ? (
                  <div className="text-center py-6 bg-slate-50 border border-slate-200 border-dashed rounded-xl">
                    <p className="text-slate-400 text-sm">You haven't sent any invites.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {sentRequests.map(req => (
                      <div key={req.request_id} className="flex items-center justify-between p-3 border border-slate-100 bg-slate-50 rounded-xl">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-xs shrink-0">
                            {req.username.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="font-medium text-slate-700 leading-tight">{req.username}</p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mt-0.5">Pending</p>
                          </div>
                        </div>
                        <button 
                          onClick={() => handleCancelRequest(req.request_id)}
                          disabled={isProcessing}
                          className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                        >
                          Cancel
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </section>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}