const { useState, useEffect, useMemo } = React;

// Constants
const GENRES = ["Action", "Comedy", "Drama", "Horror", "Romance", "Sci-Fi", "Thriller", "Fantasy", "Mystery", "Anime"];

const RatingStars = ({ value, onChange, readOnly = false }) => {
    const [hover, setHover] = useState(null);
    const current = hover ?? value;

    return (
        <div className="rating-stars">
            <div className="rating-stars-row">
                {Array.from({ length: 10 }, (_, idx) => {
                    const score = idx + 1;
                    const active = score <= current;
                    return (
                        <button
                            key={score}
                            type="button"
                            className={`star-button ${active ? 'star-on' : 'star-off'} ${readOnly ? 'cursor-default' : 'cursor-pointer'}`}
                            onMouseEnter={!readOnly ? () => setHover(score) : undefined}
                            onMouseLeave={!readOnly ? () => setHover(null) : undefined}
                            onClick={!readOnly ? () => onChange(score) : undefined}
                            aria-label={`Rate ${score} out of 10`}
                        >
                            ★
                        </button>
                    );
                })}
            </div>
            <span className="text-xs font-semibold text-slate-500 rating-value">{current}/10</span>
        </div>
    );
};

const normalizeItem = (item) => {
    const status = item.status || (item.isWatched ? 'finished' : item.startDate ? 'started' : 'planned');
    const startDate = item.startDate || '';
    const endDate = item.endDate || '';
    return {
        ...item,
        status,
        startDate,
        endDate,
        isWatched: status === 'finished'
    };
};

const deriveStatus = (data) => {
    if (data.endDate) return 'finished';
    if (data.startDate) return 'started';
    return 'planned';
};

const Toast = ({ message, type, onClose }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 3000);
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-6 right-6 z-[100] toast-slide">
            <div className={`px-6 py-4 rounded-2xl shadow-2xl text-white font-bold flex items-center gap-3 ${
                type === 'success' ? 'bg-teal-600' : 'bg-rose-500'
            }`}>
                <span>{type === 'success' ? '✓' : '✕'}</span>
                {message}
            </div>
        </div>
    );
};

const App = () => {
    const [items, setItems] = useState(() => {
        const saved = localStorage.getItem('cineTrackElite');
        return saved ? JSON.parse(saved).map(normalizeItem) : [];
    });

    const [filter, setFilter] = useState('all');
    const [genreFilter, setGenreFilter] = useState('all');
    const [search, setSearch] = useState('');
    const [sortBy, setSortBy] = useState('date');
    const [toasts, setToasts] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState(null);

    const initialForm = { 
        title: '', startDate: '', endDate: '', rating: 5, 
        notes: '', status: 'planned', genres: [] 
    };
    const [formData, setFormData] = useState(initialForm);

    useEffect(() => {
        localStorage.setItem('cineTrackElite', JSON.stringify(items));
    }, [items]);

    const addToast = (message, type = 'success') => {
        const id = Date.now();
        setToasts([...toasts, { id, message, type }]);
    };

    const formatDate = (value) => value ? new Date(value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Not set';

    const todayISO = () => new Date().toISOString().split('T')[0];

    const handleSave = (e) => {
        e.preventDefault();
        const status = deriveStatus(formData);
        const entry = { ...formData, status, isWatched: status === 'finished', rating: Number(formData.rating) };
        if (editingId) {
            setItems(items.map(item => item.id === editingId ? { ...entry, id: editingId } : item));
            addToast("Collection updated successfully");
        } else {
            setItems([{ ...entry, id: Date.now() }, ...items]);
            addToast("New title added to your library");
        }
        closeModal();
    };

    const toggleGenre = (genre) => {
        const current = formData.genres;
        if (current.includes(genre)) {
            setFormData({...formData, genres: current.filter(g => g !== genre)});
        } else {
            setFormData({...formData, genres: [...current, genre]});
        }
    };

    const deleteItem = (id) => {
        if(confirm("Are you sure you want to delete this entry?")) {
            setItems(items.filter(item => item.id !== id));
            addToast("Item removed permanently", "error");
        }
    };

    const closeModal = () => {
        setShowModal(false);
        setEditingId(null);
        setFormData(initialForm);
    };

    const filteredItems = useMemo(() => {
        return items
            .filter(item => {
                const matchesSearch = item.title.toLowerCase().includes(search.toLowerCase());
                const matchesStatus = filter === 'all' 
                    ? true 
                    : filter === 'finished' 
                        ? item.status === 'finished' 
                        : filter === 'started'
                            ? item.status === 'started'
                            : item.status === 'planned';
                const matchesGenre = genreFilter === 'all' ? true : item.genres.includes(genreFilter);
                return matchesSearch && matchesStatus && matchesGenre;
            })
            .sort((a, b) => {
                if (sortBy === 'rating') return b.rating - a.rating;
                if (sortBy === 'title') return a.title.localeCompare(b.title);
                return new Date(b.endDate || b.startDate) - new Date(a.endDate || a.startDate);
            });
    }, [items, filter, genreFilter, search, sortBy]);

    const stats = {
        total: items.length,
        watched: items.filter(i => i.status === 'finished').length,
        percent: items.length ? Math.round((items.filter(i => i.status === 'finished').length / items.length) * 100) : 0,
        started: items.filter(i => i.status === 'started').length
    };

    const handleStart = (id) => {
        setItems(items.map(item => item.id === id 
            ? { ...item, startDate: item.startDate || todayISO(), status: 'started', isWatched: false, endDate: '' }
            : item
        ));
        addToast("Marked as started");
    };

    const handleFinish = (id) => {
        setItems(items.map(item => item.id === id 
            ? { ...item, startDate: item.startDate || todayISO(), endDate: todayISO(), status: 'finished', isWatched: true }
            : item
        ));
        addToast("Great! Marked as finished");
    };

    return (
        <div className="min-h-screen pb-24">
            {/* Navigation */}
            <nav className="sticky top-0 z-40 glass border-b border-slate-200/50 px-6 py-5">
                <div className="max-w-7xl mx-auto flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-teal-600 rounded-xl flex items-center justify-center text-white font-black italic">C</div>
                        <h1 className="text-xl font-extrabold tracking-tight text-slate-800">CINETRACK <span className="text-teal-600">ELITE</span></h1>
                    </div>
                    <button onClick={() => setShowModal(true)} className="bg-teal-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-teal-700 transition-all shadow-lg shadow-teal-200 flex items-center gap-2">
                        <span>+</span> Add Movie/Drama
                    </button>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-6 mt-10">
                {/* Executive Dashboard */}
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-12">
                    <div className="lg:col-span-3 bg-white p-8 rounded-[32px] shadow-sm border border-slate-100 relative overflow-hidden">
                        <div className="relative z-10">
                            <h2 className="text-slate-400 font-bold text-xs uppercase tracking-widest mb-2">Overall Progress</h2>
                            <div className="flex items-end gap-4 mb-6">
                                <span className="text-6xl font-black text-slate-800 leading-none">{stats.percent}%</span>
                                <span className="text-slate-500 font-medium mb-1 pb-1">Completion Rate</span>
                            </div>
                            <div className="w-full bg-slate-100 h-4 rounded-full overflow-hidden">
                                <div className="bg-gradient-to-r from-teal-500 via-cyan-400 to-emerald-400 h-full transition-all duration-1000 ease-out" style={{ width: `${stats.percent}%` }}></div>
                            </div>
                        </div>
                        <div className="absolute top-[-20%] right-[-5%] w-64 h-64 bg-teal-50 rounded-full blur-3xl opacity-50"></div>
                    </div>
                    <div className="bg-gradient-to-br from-cyan-500 via-teal-500 to-emerald-500 p-8 rounded-[32px] text-white flex flex-col justify-center shadow-xl shadow-teal-100">
                        <p className="opacity-90 font-bold text-xs uppercase tracking-widest mb-2">Total Library</p>
                        <h3 className="text-5xl font-black mb-1">{stats.total}</h3>
                        <p className="text-teal-50 text-sm font-medium">{stats.watched} finished • {stats.started} started</p>
                    </div>
                </div>

                {/* Filters Bar */}
                <div className="flex flex-wrap gap-4 mb-10 items-center justify-between">
                    <div className="flex flex-wrap gap-3 items-center">
                        <input 
                            className="bg-white px-6 py-3 rounded-2xl border-none ring-1 ring-slate-200 focus:ring-2 focus:ring-teal-500 outline-none w-full md:w-80 shadow-sm"
                            placeholder="Search by title..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <select className="bg-white px-4 py-3 rounded-2xl ring-1 ring-slate-200 outline-none font-semibold text-sm text-slate-600" value={filter} onChange={e => setFilter(e.target.value)}>
                            <option value="all">All Status</option>
                            <option value="finished">Finished</option>
                            <option value="started">Started</option>
                            <option value="planned">Queued</option>
                        </select>
                        <select className="bg-white px-4 py-3 rounded-2xl ring-1 ring-slate-200 outline-none font-semibold text-sm text-slate-600" value={genreFilter} onChange={e => setGenreFilter(e.target.value)}>
                            <option value="all">All Genres</option>
                            {GENRES.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                    </div>
                    <select className="bg-slate-100 px-4 py-3 rounded-2xl border-none outline-none font-bold text-xs uppercase tracking-widest text-slate-500" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                        <option value="date">Sort by Date</option>
                        <option value="rating">Sort by Rating</option>
                        <option value="title">Sort by Name</option>
                    </select>
                </div>

                {/* Library Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                    {filteredItems.map(item => (
                        <div key={item.id} className="movie-card bg-white rounded-[32px] border border-slate-100 p-8 flex flex-col fade-in">
                            <div className="flex justify-between items-start mb-5">
                                <div className="flex flex-wrap gap-2 max-w-[80%]">
                                    {item.genres.map(g => (
                                        <span key={g} className="genre-chip">
                                            {g}
                                        </span>
                                    ))}
                                    {item.genres.length === 0 && <span className="genre-chip muted">No Genre</span>}
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`status-pill ${item.status}`}>
                                        <span className="status-dot" />
                                        {item.status === 'finished' ? 'Finished' : item.status === 'started' ? 'Started' : 'Queued'}
                                    </span>
                                    <button onClick={() => { setFormData(item); setEditingId(item.id); setShowModal(true); }} className="p-2 hover:bg-slate-50 rounded-xl transition text-slate-300 hover:text-teal-600">
                                        ✎
                                    </button>
                                </div>
                            </div>
                            
                            <h3 className="text-2xl font-extrabold text-slate-800 mb-2 leading-tight group-hover:text-teal-600 transition">{item.title}</h3>
                            
                            <div className="flex items-center gap-3 mb-4 text-sm text-slate-500 font-semibold flex-wrap">
                                <RatingStars value={Number(item.rating)} readOnly onChange={() => {}} />
                                <span className="hidden sm:inline">•</span>
                                <span>{item.startDate ? `Started ${formatDate(item.startDate)}` : 'Not started'}</span>
                                <span className="hidden sm:inline">•</span>
                                <span>{item.endDate ? `Finished ${formatDate(item.endDate)}` : 'In progress'}</span>
                            </div>

                            <p className="text-slate-500 text-sm leading-relaxed mb-8 flex-grow">
                                {item.notes ? `"${item.notes}"` : "No review provided for this entry."}
                            </p>

                            <div className="flex items-center justify-between pt-6 border-t border-slate-50 gap-4">
                                <div className="flex gap-3 flex-1">
                                    <button
                                        type="button"
                                        onClick={() => handleStart(item.id)}
                                        disabled={item.status === 'started' || item.status === 'finished'}
                                        className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                            item.status === 'started' || item.status === 'finished'
                                                ? 'bg-amber-50 text-amber-500 cursor-not-allowed'
                                                : 'bg-slate-900 text-white shadow-lg shadow-slate-200 hover:-translate-y-0.5'
                                        }`}
                                    >
                                        {item.status === 'started' || item.status === 'finished' ? 'Started' : 'Start'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleFinish(item.id)}
                                        disabled={item.status === 'finished'}
                                        className={`flex-1 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
                                            item.status === 'finished'
                                                ? 'bg-emerald-50 text-emerald-600 cursor-not-allowed'
                                                : 'bg-teal-600 text-white shadow-lg shadow-teal-200 hover:bg-teal-700'
                                        }`}
                                    >
                                        {item.status === 'finished' ? 'Finished' : 'Finish'}
                                    </button>
                                </div>
                                <button onClick={() => deleteItem(item.id)} className="p-3 bg-rose-50 text-rose-500 rounded-2xl hover:bg-rose-100 transition">
                                    🗑
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
                
                {filteredItems.length === 0 && (
                    <div className="text-center py-32 bg-slate-100/50 rounded-[40px] border-2 border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold text-xl uppercase tracking-widest">Your library is empty</p>
                    </div>
                )}
            </main>

            {/* Premium Modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 sm:p-12">
                    <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-md" onClick={closeModal}></div>
                    <div className="bg-white w-full max-w-2xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-full">
                        <div className="p-10 overflow-y-auto">
                            <h2 className="text-3xl font-black text-slate-800 mb-8">{editingId ? 'Edit Collection' : 'Add Movie/Drama'}</h2>
                            <form onSubmit={handleSave} className="space-y-6">
                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Title</label>
                                    <input required className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none focus:ring-2 focus:ring-teal-500 font-semibold" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} placeholder="e.g. Reply 1988" />
                                </div>
                                
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Started</label>
                                        <input type="date" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-semibold" value={formData.startDate} onChange={e => setFormData({...formData, startDate: e.target.value})} />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Rating</label>
                                        <RatingStars value={Number(formData.rating)} onChange={(val) => setFormData({...formData, rating: val})} />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Finished</label>
                                    <input type="date" className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none font-semibold" value={formData.endDate} onChange={e => setFormData({...formData, endDate: e.target.value})} />
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Select Genres</label>
                                    <div className="flex flex-wrap gap-2">
                                        {GENRES.map(genre => (
                                            <button 
                                                key={genre}
                                                type="button"
                                                onClick={() => toggleGenre(genre)}
                                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                                                    formData.genres.includes(genre) 
                                                    ? 'bg-teal-600 text-white shadow-lg shadow-teal-200' 
                                                    : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                }`}
                                            >
                                                {genre}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Your Review</label>
                                    <textarea className="w-full px-6 py-4 bg-slate-50 rounded-2xl outline-none resize-none font-medium h-32" value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})} placeholder="What did you think about it?"></textarea>
                                </div>

                                <div className="flex items-center gap-3 pt-6">
                                    <button type="button" onClick={closeModal} className="flex-1 py-5 font-black text-slate-400 uppercase tracking-widest text-xs">Discard</button>
                                    <button type="submit" className="flex-[2] py-5 bg-teal-600 text-white rounded-[24px] font-black uppercase tracking-widest text-xs shadow-xl shadow-teal-200 hover:bg-teal-700">
                                        {editingId ? 'Update Entry' : 'Add to Library'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {toasts.map(toast => (
                <Toast key={toast.id} {...toast} onClose={() => setToasts(toasts.filter(t => t.id !== toast.id))} />
            ))}
        </div>
    );
};

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
