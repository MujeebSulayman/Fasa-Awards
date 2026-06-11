import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
	BarChart3,
	PlusCircle,
	Layers,
	Users,
	LogOut,
	Trash2,
	Edit3,
	History,
	ChevronLeft,
	ChevronRight,
	DollarSign,
	Trophy,
	Crown,
	Lock,
	Menu,
	Download,
	Search,
	AlertCircle,
	CheckCircle,
	Image as ImageIcon,
	Mail,
	LockKeyhole,
	Eye,
	EyeOff,
	LogIn,
} from 'lucide-react';

const CONTESTANT_LOGO = '/awards.jpg';

const ShimmerLoader = () => (
	<div className="shimmer-wrapper">
		<div className="shimmer-element"></div>
		<div className="shimmer-block header"></div>
		<div className="shimmer-block body-long"></div>
		<div className="shimmer-block body-med"></div>
		<div className="shimmer-block body-short"></div>
	</div>
);

export default function AdminPortal({ onNavigateToVoter, navigate }) {
	const [session, setSession] = useState(null);
	const [showPassword, setShowPassword] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [authLoading, setAuthLoading] = useState(false);

	// Active Admin Tabs: 'dashboard', 'categories', 'contestants', 'leaderboard', 'transactions'
	const [activeTab, setActiveTab] = useState('dashboard');
	const [sidebarOpen, setSidebarOpen] = useState(false);

	// Dashboard Data
	const [stats, setStats] = useState({
		totalVotes: 0,
		totalCash: 0,
		categoriesCount: 0,
		contestantsCount: 0,
	});

	// Lists
	const [categories, setCategories] = useState([]);
	const [contestants, setContestants] = useState([]);
	const [transactions, setTransactions] = useState([]);
	const [dataLoading, setDataLoading] = useState(false);

	// UI filters
	const [contestantSearch, setContestantSearch] = useState('');
	const [contestantCategoryFilter, setContestantCategoryFilter] =
		useState('all');

	// Category Forms State
	const [categoryName, setCategoryName] = useState('');
	const [categoryDesc, setCategoryDesc] = useState('');
	const [submittingCategory, setSubmittingCategory] = useState(false);
	const [editingCategory, setEditingCategory] = useState(null);

	// Contestant Forms State
	const [contestantName, setContestantName] = useState('');
	const [contestantBio, setContestantBio] = useState('');
	const [contestantCategoryId, setContestantCategoryId] = useState('');
	const [contestantImageUrl, setContestantImageUrl] = useState('');
	const [contestantImageFile, setContestantImageFile] = useState(null);
	const [submittingContestant, setSubmittingContestant] = useState(false);

	// Editing Contestant Modal/Form state
	const [editingContestant, setEditingContestant] = useState(null);

	// Toast
	const [toast, setToast] = useState(null);

	// Custom UI states
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
	const [txSearchQuery, setTxSearchQuery] = useState('');
	const [txCategoryFilter, setTxCategoryFilter] = useState('all');
	const [txDateFilter, setTxDateFilter] = useState('all');

	// Chart interactive states
	const [hoveredChartIndex, setHoveredChartIndex] = useState(null);
	const [hoveredDonutIndex, setHoveredDonutIndex] = useState(null);
	const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, show: false, label: '', value: '' });

	const showToast = (message, type = 'success') => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 4000);
	};

	// Group transactions by day for the line chart
	const getLineChartData = useCallback(() => {
		if (!transactions || transactions.length === 0) return [];
		const groups = {};
		transactions.forEach(tx => {
			if (!tx.created_at) return;
			const dateStr = new Date(tx.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
			if (!groups[dateStr]) {
				groups[dateStr] = { date: dateStr, votes: 0, revenue: 0, rawDate: new Date(tx.created_at) };
			}
			groups[dateStr].votes += tx.votes_count || 0;
			groups[dateStr].revenue += Number(tx.amount) || 0;
		});
		return Object.values(groups).sort((a, b) => a.rawDate - b.rawDate);
	}, [transactions]);

	// Calculate votes per category for the doughnut chart
	const getDonutChartData = useCallback(() => {
		if (!categories || categories.length === 0) return { data: [], totalVotes: 0 };
		let total = 0;
		const data = categories.map(cat => {
			const categoryVotes = contestants
				.filter(c => c.category_id === cat.id)
				.reduce((acc, curr) => acc + (curr.votes_count || 0), 0);
			total += categoryVotes;
			return {
				name: cat.name,
				votes: categoryVotes,
			};
		});
		return { data, totalVotes: total };
	}, [categories, contestants]);

	const loadAdminData = useCallback(async () => {
		try {
			setDataLoading(true);

			// Fetch Categories
			const { data: catData, error: catError } = await supabase
				.from('categories')
				.select('*')
				.order('created_at', { ascending: false });
			if (catError) throw catError;
			setCategories(catData || []);

			// Fetch Contestants
			const { data: conData, error: conError } = await supabase
				.from('contestants')
				.select('*, categories(name)')
				.order('votes_count', { ascending: false });
			if (conError) throw conError;
			setContestants(conData || []);

			// Fetch Transactions
			const { data: voteData, error: voteError } = await supabase
				.from('votes')
				.select('*, contestants(name)')
				.order('created_at', { ascending: false });
			if (voteError) throw voteError;
			setTransactions(voteData || []);

			// Calculate Stats
			const totalVotes = voteData
				? voteData.reduce((acc, curr) => acc + (curr.votes_count || 0), 0)
				: 0;
			const totalCash = voteData
				? voteData.reduce((acc, curr) => acc + (curr.amount || 0), 0)
				: 0;

			setStats({
				totalVotes,
				totalCash,
				categoriesCount: catData ? catData.length : 0,
				contestantsCount: conData ? conData.length : 0,
			});
		} catch (error) {
			console.error('Error loading admin data:', error);
			showToast('Error loading dashboard data. Please try again.', 'error');
		} finally {
			setDataLoading(false);
		}
	}, []);

	const exportTransactionsCsv = useCallback(() => {
		const filtered = transactions.filter(tx => {
			const matchesSearch = !txSearchQuery ||
				(tx.reference && tx.reference.toLowerCase().includes(txSearchQuery.toLowerCase())) ||
				(tx.email && tx.email.toLowerCase().includes(txSearchQuery.toLowerCase())) ||
				(tx.contestants?.name && tx.contestants.name.toLowerCase().includes(txSearchQuery.toLowerCase()));

			const matchesCategory = txCategoryFilter === 'all' ||
				(tx.contestants?.category_id === txCategoryFilter);

			let matchesDate = true;
			if (txDateFilter !== 'all') {
				const txTime = new Date(tx.created_at).getTime();
				const nowTime = Date.now();
				if (txDateFilter === '24h') {
					matchesDate = (nowTime - txTime) <= 24 * 60 * 60 * 1000;
				} else if (txDateFilter === '7d') {
					matchesDate = (nowTime - txTime) <= 7 * 24 * 60 * 60 * 1000;
				} else if (txDateFilter === '30d') {
					matchesDate = (nowTime - txTime) <= 30 * 24 * 60 * 60 * 1000;
				}
			}
			return matchesSearch && matchesCategory && matchesDate;
		});

		if (!filtered.length) {
			showToast('No filtered transactions to export.', 'error');
			return;
		}

		const header = [
			'date',
			'reference',
			'contestant',
			'votes',
			'amount',
			'email',
			'status',
		];
		const rows = filtered.map((tx) => [
			new Date(tx.created_at).toISOString(),
			tx.reference ?? '',
			tx.contestants?.name ?? '',
			tx.votes_count ?? 0,
			tx.amount ?? 0,
			tx.email ?? '',
			tx.status ?? '',
		]);

		const escape = (v) => `"${String(v).replaceAll('"', '""')}"`;
		const csv = [header, ...rows]
			.map((r) => r.map(escape).join(','))
			.join('\n');

		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `filtered-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
		document.body.appendChild(a);
		a.click();
		a.remove();
		URL.revokeObjectURL(url);
	}, [transactions, txSearchQuery, txCategoryFilter, txDateFilter]);

	useEffect(() => {
		supabase.auth.getSession().then(({ data: { session } }) => {
			setSession(session);
			if (session) loadAdminData();
		});

		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((_event, session) => {
			setSession(session);
			if (session) loadAdminData();
		});

		return () => subscription.unsubscribe();
	}, [loadAdminData]);

	// Reload data when switching tabs
	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		if (session) loadAdminData();
	}, [activeTab, loadAdminData, session]);

	const handleAuthSubmit = async (e) => {
		e.preventDefault();
		if (!email || !password) {
			showToast('Please fill out all fields.', 'error');
			return;
		}

		setAuthLoading(true);
		try {
			const { error } = await supabase.auth.signInWithPassword({
				email,
				password,
			});
			if (error) throw error;
			showToast('Welcome back, Admin!', 'success');
		} catch (error) {
			showToast(error.message || 'Authentication failed.', 'error');
		} finally {
			setAuthLoading(false);
		}
	};

	const handleLogout = async () => {
		await supabase.auth.signOut();
		setSession(null);
		showToast('Logged out successfully.', 'success');
	};

	// Create or Update Category
	const handleCategorySubmit = async (e) => {
		e.preventDefault();
		if (!categoryName) return;

		setSubmittingCategory(true);
		try {
			if (editingCategory) {
				// Edit Mode
				const { error } = await supabase
					.from('categories')
					.update({ name: categoryName, description: categoryDesc })
					.eq('id', editingCategory.id);

				if (error) throw error;
				showToast('Category updated successfully!');
			} else {
				// Create Mode
				const { error } = await supabase
					.from('categories')
					.insert([{ name: categoryName, description: categoryDesc }]);

				if (error) throw error;
				showToast('Category created successfully!');
			}

			setCategoryName('');
			setCategoryDesc('');
			setEditingCategory(null);
			loadAdminData();
		} catch (error) {
			showToast(error.message || 'Failed to submit category.', 'error');
		} finally {
			setSubmittingCategory(false);
		}
	};

	const handleStartEditCategory = (cat) => {
		setEditingCategory(cat);
		setCategoryName(cat.name);
		setCategoryDesc(cat.description || '');
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleDeleteCategory = async (id) => {
		if (
			!window.confirm(
				'Delete this category? This will delete all contestants in this category.',
			)
		)
			return;
		try {
			const { error } = await supabase.from('categories').delete().eq('id', id);
			if (error) throw error;
			showToast('Category deleted.');
			loadAdminData();
		} catch {
			showToast('Error deleting category.', 'error');
		}
	};

	// Create or Update Contestant
	const handleContestantSubmit = async (e) => {
		e.preventDefault();
		if (!contestantName || !contestantCategoryId) {
			showToast('Name and Category are required.', 'error');
			return;
		}

		setSubmittingContestant(true);
		try {
			let finalImageUrl = contestantImageUrl;

			// Handle Image File Upload to Supabase Storage
			if (contestantImageFile) {
				const fileExt = contestantImageFile.name.split('.').pop();
				const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
				const filePath = `${fileName}`;

				const { error: uploadError } = await supabase.storage
					.from('contestant-images')
					.upload(filePath, contestantImageFile);

				if (uploadError) {
					console.warn('Image bucket upload failed.', uploadError);
					showToast(
						'Image bucket upload failed. Falling back to url.',
						'error',
					);
				} else {
					const {
						data: { publicUrl },
					} = supabase.storage.from('contestant-images').getPublicUrl(filePath);

					finalImageUrl = publicUrl;
				}
			}

			if (editingContestant) {
				// Edit Mode
				const updateData = {
					name: contestantName,
					category_id: contestantCategoryId,
					bio: contestantBio,
				};
				// Only update image if new link or file was uploaded
				if (finalImageUrl) {
					updateData.image_url = finalImageUrl;
				}

				const { error } = await supabase
					.from('contestants')
					.update(updateData)
					.eq('id', editingContestant.id);

				if (error) throw error;
				showToast('Contestant updated successfully!');
			} else {
				// Create Mode
				const { error } = await supabase.from('contestants').insert([
					{
						name: contestantName,
						category_id: contestantCategoryId,
						bio: contestantBio,
						image_url: finalImageUrl,
					},
				]);

				if (error) throw error;
				showToast('Contestant added successfully!');
			}

			// Reset form
			setContestantName('');
			setContestantBio('');
			setContestantImageUrl('');
			setContestantImageFile(null);
			setContestantCategoryId('');
			setEditingContestant(null);
			loadAdminData();
		} catch (error) {
			showToast(error.message || 'Failed to submit contestant.', 'error');
		} finally {
			setSubmittingContestant(false);
		}
	};

	const handleStartEditContestant = (con) => {
		setEditingContestant(con);
		setContestantName(con.name);
		setContestantBio(con.bio || '');
		setContestantCategoryId(con.category_id);
		setContestantImageUrl(con.image_url || '');
		setContestantImageFile(null);
		window.scrollTo({ top: 0, behavior: 'smooth' });
	};

	const handleDeleteContestant = async (id) => {
		if (!window.confirm('Delete this contestant?')) return;
		try {
			const { error } = await supabase
				.from('contestants')
				.delete()
				.eq('id', id);
			if (error) throw error;
			showToast('Contestant removed.');
			loadAdminData();
		} catch {
			showToast('Error removing contestant.', 'error');
		}
	};

	// Helper: Get contestants sorted for leaderboard in a category
	const getLeaderboardForCategory = (categoryId) => {
		return contestants
			.filter((c) => c.category_id === categoryId)
			.sort((a, b) => b.votes_count - a.votes_count);
	};

	// Auth Wall View
	if (!session) {
		return (
			<div className='app-container'>
				{toast && (
					<div
						className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
						{toast.type === 'error' ? (
							<AlertCircle size={20} />
						) : (
							<CheckCircle size={20} />
						)}
						<span>{toast.message}</span>
					</div>
				)}

				<nav className='navbar'>
					<a
						href='#'
						className='nav-brand'
						onClick={(e) => {
							e.preventDefault();
							onNavigateToVoter();
						}}>
						<ChevronLeft size={20} />
						<img
							src='/logo.jpg'
							alt='FASA logo'
							className='nav-logo'
						/>
					</a>
					<button
						className='btn btn-secondary'
						onClick={onNavigateToVoter}>
						Voter Portal
					</button>
				</nav>

				<main className='admin-login-container'>
					<div className='admin-login-glow'></div>

					<div className='admin-login-card'>
						<div className='admin-login-header'>
							<div className='admin-login-logo-box'>
								<LockKeyhole size={32} />
							</div>
							<h2>Admin Console</h2>
							<p>
								Sign in to manage categories, contestants and view voting logs
							</p>
						</div>

						<form onSubmit={handleAuthSubmit}>
							<div className='admin-login-input-group'>
								<label className='admin-login-label'>Email Address</label>
								<div className='admin-login-field-wrapper'>
									<input
										type='email'
										className='admin-login-input'
										placeholder='admin@fasaawards.com'
										value={email}
										onChange={(e) => setEmail(e.target.value)}
										required
									/>
									<Mail
										size={18}
										className='admin-login-icon'
									/>
								</div>
							</div>

							<div className='admin-login-input-group'>
								<label className='admin-login-label'>Password</label>
								<div className='admin-login-field-wrapper'>
									<input
										type={showPassword ? 'text' : 'password'}
										className='admin-login-input has-toggle'
										placeholder='••••••••'
										value={password}
										onChange={(e) => setPassword(e.target.value)}
										required
									/>
									<Lock
										size={18}
										className='admin-login-icon'
									/>
									<button
										type='button'
										className='admin-login-toggle-btn'
										onClick={() => setShowPassword(!showPassword)}
										aria-label={
											showPassword ? 'Hide password' : 'Show password'
										}>
										{showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
									</button>
								</div>
							</div>

							<button
								type='submit'
								className='admin-login-submit-btn'
								disabled={authLoading}>
								{authLoading ? (
									<>
										<div
											className='spinner'
											style={{
												width: '18px',
												height: '18px',
												borderWidth: '2px',
												borderTopColor: '#2b1236',
											}}></div>
										<span>Signing in...</span>
									</>
								) : (
									<>
										<LogIn size={18} />
										<span>Access Console</span>
									</>
								)}
							</button>
						</form>

						<div className='admin-login-footer'>
							<a
								href='#'
								className='admin-login-back-link'
								onClick={(e) => {
									e.preventDefault();
									onNavigateToVoter();
								}}>
								<ChevronLeft size={16} />
								<span>Return to Voter Portal</span>
							</a>
						</div>
					</div>
				</main>
			</div>
		);
	}

	// Dashboard workspace
	return (
		<div className='dash-shell'>
			{/* Toast Notification */}
			{toast && (
				<div
					className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
					{toast.type === 'error' ? (
						<AlertCircle size={20} />
					) : (
						<CheckCircle size={20} />
					)}
					<span>{toast.message}</span>
				</div>
			)}

			<div className={`dash-layout ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
				{sidebarOpen && (
					<div
						className='dash-drawer-overlay'
						onClick={() => setSidebarOpen(false)}
						aria-hidden='true'
					/>
				)}

				<aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''} ${isSidebarCollapsed ? 'collapsed' : ''}`}>
					<div className='dash-brand'>
						<div
							className='stat-icon'
							style={{ width: 40, height: 40, flexShrink: 0 }}>
							<Crown size={18} />
						</div>
						<div className='dash-brand-title-wrap' style={{ minWidth: 0 }}>
							<div className='dash-brand-title' style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Admin Console</div>
							<div className='dash-brand-sub' style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>Voting management</div>
						</div>
					</div>

					<nav className='dash-nav'>
						<button
							type='button'
							className={`dash-nav-item ${activeTab === 'dashboard' ? 'active' : ''}`}
							onClick={() => {
								setActiveTab('dashboard');
								setSidebarOpen(false);
							}}>
							<BarChart3 size={18} style={{ flexShrink: 0 }} /> <span>Overview</span>
						</button>
						<button
							type='button'
							className={`dash-nav-item ${activeTab === 'categories' ? 'active' : ''}`}
							onClick={() => {
								setActiveTab('categories');
								setSidebarOpen(false);
							}}>
							<Layers size={18} style={{ flexShrink: 0 }} /> <span>Categories</span>{' '}
							<span className='dash-nav-badge'>{stats.categoriesCount}</span>
						</button>
						<button
							type='button'
							className={`dash-nav-item ${activeTab === 'contestants' ? 'active' : ''}`}
							onClick={() => {
								setActiveTab('contestants');
								setSidebarOpen(false);
							}}>
							<Users size={18} style={{ flexShrink: 0 }} /> <span>Contestants</span>{' '}
							<span className='dash-nav-badge'>{stats.contestantsCount}</span>
						</button>
						<button
							type='button'
							className={`dash-nav-item ${activeTab === 'leaderboard' ? 'active' : ''}`}
							onClick={() => {
								setActiveTab('leaderboard');
								setSidebarOpen(false);
							}}>
							<Trophy size={18} style={{ flexShrink: 0 }} /> <span>Leaderboards</span>
						</button>
						<button
							type='button'
							className={`dash-nav-item ${activeTab === 'transactions' ? 'active' : ''}`}
							onClick={() => {
								setActiveTab('transactions');
								setSidebarOpen(false);
							}}>
							<History size={18} style={{ flexShrink: 0 }} /> <span>Transactions</span>{' '}
							<span className='dash-nav-badge'>{transactions.length}</span>
						</button>
					</nav>

					<button
						type='button'
						className='sidebar-toggle-btn'
						style={{ margin: 'auto 6px 12px' }}
						onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}>
						{isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
						<span className='sidebar-toggle-text'>Collapse</span>
					</button>

					<div className='admin-profile-footer'>
						<div className='admin-profile-avatar'>
							{(session?.user?.email || 'AD').slice(0, 2).toUpperCase()}
						</div>
						<div className='admin-profile-details'>
							<div className='admin-profile-name'>Administrator</div>
							<div className='admin-profile-email'>{session?.user?.email || 'admin@fasaawards.com'}</div>
						</div>
					</div>
				</aside>

				<main className='dash-main'>
					<div className='dash-topbar'>
						<div className='dash-topbar-left'>
							<button
								type='button'
								className='icon-btn dash-mobile-btn'
								onClick={() => setSidebarOpen(true)}
								aria-label='Open menu'>
								<Menu size={18} />
							</button>
							<div className='dash-topbar-title'>
								<strong>
									{activeTab === 'dashboard'
										? 'Overview'
										: activeTab === 'categories'
											? 'Categories'
											: activeTab === 'contestants'
												? 'Contestants'
												: activeTab === 'leaderboard'
													? 'Leaderboards'
													: 'Transactions'}
								</strong>
								<span>
									{activeTab === 'dashboard'
										? 'Key metrics and recent activity'
										: activeTab === 'categories'
											? 'Organize contestants into groups'
											: activeTab === 'contestants'
												? 'Create contestants and assign categories'
												: activeTab === 'leaderboard'
													? 'Live rankings by category'
													: 'Payment and vote confirmations'}
								</span>
							</div>
						</div>
						<div className='dash-actions'>
							<button
								type='button'
								className='btn btn-secondary'
								onClick={onNavigateToVoter}>
								<ChevronLeft size={16} /> Public site
							</button>
							<span className='dash-pill'>
								{session?.user?.email || 'Admin'}
							</span>
							<button
								type='button'
								className='btn btn-danger'
								onClick={handleLogout}>
								<LogOut size={16} /> Logout
							</button>
						</div>
					</div>

					<div className='dash-content'>
						{dataLoading && (
							<div
								style={{
									display: 'flex',
									gap: '10px',
									alignItems: 'center',
									marginBottom: '20px',
									color: 'var(--accent-purple)',
								}}>
								<div
									className='spinner'
									style={{ width: '16px', height: '16px' }}></div>
								<span style={{ fontSize: '0.85rem' }}>
									Syncing data logs...
								</span>
							</div>
						)}

						{/* TAB: OVERVIEW */}
						{activeTab === 'dashboard' && (() => {
							if (dataLoading && transactions.length === 0) {
								return (
									<div className="page-fade-in">
										<h2 style={{ fontSize: '1.8rem', marginBottom: '25px' }}>
											Performance Metrics
										</h2>
										<ShimmerLoader />
									</div>
								);
							}
							return (
								<div className="page-fade-in">
									<h2 style={{ fontSize: '1.8rem', marginBottom: '25px' }}>
										Performance Metrics
									</h2>
									<div className='stats-grid'>
										<div className='stat-card glass-panel'>
											<div
												className='stat-icon'
												style={{
													color: '#ec4899',
													background: 'rgba(236,72,153,0.1)',
												}}>
												<Users size={24} />
											</div>
											<div className='stat-info'>
												<span className='stat-label'>Total Votes Cast</span>
												<span className='stat-value'>
													{stats.totalVotes.toLocaleString()}
												</span>
											</div>
										</div>

										<div className='stat-card glass-panel'>
											<div
												className='stat-icon'
												style={{
													color: '#10b981',
													background: 'rgba(16,185,129,0.1)',
												}}>
												<DollarSign size={24} />
											</div>
											<div className='stat-info'>
												<span className='stat-label'>Revenue Generated</span>
												<span className='stat-value'>
													₦{stats.totalCash.toLocaleString()}
												</span>
											</div>
										</div>

										<div className='stat-card glass-panel'>
											<div
												className='stat-icon'
												style={{
													color: '#3b82f6',
													background: 'rgba(59,130,246,0.1)',
												}}>
												<Layers size={24} />
											</div>
											<div className='stat-info'>
												<span className='stat-label'>Categories</span>
												<span className='stat-value'>
													{stats.categoriesCount}
												</span>
											</div>
										</div>

										<div className='stat-card glass-panel'>
											<div
												className='stat-icon'
												style={{
													color: '#8b5cf6',
													background: 'rgba(139,92,246,0.1)',
												}}>
												<Users size={24} />
											</div>
											<div className='stat-info'>
												<span className='stat-label'>Contestants</span>
												<span className='stat-value'>
													{stats.contestantsCount}
												</span>
											</div>
										</div>
									</div>

									{/* Custom interactive SVG charts section */}
									<div className="chart-card-grid">
										{/* SVG Line Chart: Revenue & Votes Trend */}
										<div className="chart-container-panel">
											<div className="chart-header">
												<div className="chart-header-title">Voting & Revenue Trend</div>
												<div className="chart-legend">
													<div className="chart-legend-item">
														<div className="chart-legend-dot" style={{ background: 'var(--accent-rose)' }}></div>
														<span>Votes cast</span>
													</div>
												</div>
											</div>
											<div className="chart-svg-wrap">
												{(() => {
													const lineData = getLineChartData();
													if (lineData.length === 0) {
														return (
															<div style={{ height: '100%', display: 'grid', placeItems: 'center', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
																No voting history to display trend yet.
															</div>
														);
													}

													const width = 500;
													const height = 200;
													const padLeft = 45;
													const padRight = 15;
													const padTop = 15;
													const padBottom = 30;
													const plotW = width - padLeft - padRight;
													const plotH = height - padTop - padBottom;

													const maxVotes = Math.max(...lineData.map(d => d.votes), 5);
													const minVotes = 0;

													// Generate points
													const points = lineData.map((d, i) => {
														const x = padLeft + (i * (plotW / (lineData.length - 1 || 1)));
														const y = padTop + plotH - ((d.votes - minVotes) / (maxVotes - minVotes)) * plotH;
														return { x, y, data: d, index: i };
													});

													const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
													const areaD = points.length > 0
														? `${pathD} L ${points[points.length - 1].x} ${padTop + plotH} L ${points[0].x} ${padTop + plotH} Z`
														: '';

													return (
														<>
															<svg viewBox={`0 0 ${width} ${height}`} width="100%" height="100%" preserveAspectRatio="none">
																<defs>
																	<linearGradient id="lineGrad" x1="0" y1="0" x2="0" y2="1">
																		<stop offset="0%" stopColor="var(--accent-rose)" />
																		<stop offset="100%" stopColor="var(--accent-pink)" />
																	</linearGradient>
																	<linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
																		<stop offset="0%" stopColor="var(--accent-rose)" stopOpacity="0.25" />
																		<stop offset="100%" stopColor="var(--accent-rose)" stopOpacity="0.0" />
																	</linearGradient>
																</defs>

																{/* Grid lines */}
																<line x1={padLeft} y1={padTop} x2={width - padRight} y2={padTop} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
																<line x1={padLeft} y1={padTop + plotH / 2} x2={width - padRight} y2={padTop + plotH / 2} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
																<line x1={padLeft} y1={padTop + plotH} x2={width - padRight} y2={padTop + plotH} stroke="rgba(255,255,255,0.15)" strokeWidth="1" />

																{/* Y Axis Labels */}
																<text x={padLeft - 10} y={padTop + 4} fill="var(--text-muted)" fontSize="8" textAnchor="end">{maxVotes}</text>
																<text x={padLeft - 10} y={padTop + plotH / 2 + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end">{Math.round(maxVotes / 2)}</text>
																<text x={padLeft - 10} y={padTop + plotH + 3} fill="var(--text-muted)" fontSize="8" textAnchor="end">0</text>

																{/* Area & Line */}
																{points.length > 0 && (
																	<>
																		<path d={areaD} fill="url(#areaGrad)" />
																		<path d={pathD} fill="none" stroke="url(#lineGrad)" strokeWidth="2.5" className="chart-line-path" />
																	</>
																)}

																{/* X Axis Labels & Dots */}
																{points.map((p, i) => (
																	<g key={i}>
																		<text x={p.x} y={height - 8} fill="var(--text-muted)" fontSize="8" textAnchor="middle">{p.data.date}</text>
																		<circle
																			cx={p.x}
																			cy={p.y}
																			r={hoveredChartIndex === i ? 6 : 3.5}
																			fill={hoveredChartIndex === i ? '#ffffff' : 'var(--accent-rose)'}
																			stroke={hoveredChartIndex === i ? 'var(--accent-amethyst)' : '#180920'}
																			strokeWidth="1.5"
																			className="chart-circle-node"
																			onMouseEnter={(e) => {
																				setHoveredChartIndex(i);
																				const rect = e.target.getBoundingClientRect();
																				const parentRect = e.target.parentElement.parentElement.getBoundingClientRect();
																				setTooltipPos({
																					x: rect.left - parentRect.left + 8,
																					y: rect.top - parentRect.top - 60,
																					show: true,
																					label: p.data.date,
																					value: `${p.data.votes.toLocaleString()} Votes (₦${p.data.revenue.toLocaleString()})`
																				});
																			}}
																			onMouseLeave={() => {
																				setHoveredChartIndex(null);
																				setTooltipPos(prev => ({ ...prev, show: false }));
																			}}
																		/>
																	</g>
																))}
															</svg>
															{tooltipPos.show && hoveredChartIndex !== null && (
																<div className="chart-tooltip-bubble" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
																	<strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tooltipPos.label}</strong>
																	<span style={{ fontWeight: 700, color: '#fff' }}>{tooltipPos.value}</span>
																</div>
															)}
														</>
													);
												})()}
											</div>
										</div>

										{/* SVG Doughnut Chart: Votes Share by Category */}
										<div className="chart-container-panel">
											<div className="chart-header">
												<div className="chart-header-title">Vote Distribution</div>
											</div>
											<div className="chart-svg-wrap" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: 'auto', minHeight: '240px' }}>
												{(() => {
													const donutResult = getDonutChartData();
													if (donutResult.totalVotes === 0) {
														return (
															<div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
																No votes recorded to build distribution map.
															</div>
														);
													}

													const total = donutResult.totalVotes;
													const slices = donutResult.data.filter(s => s.votes > 0);
													if (slices.length === 0) {
														return (
															<div style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textAlign: 'center', padding: '20px' }}>
																No votes recorded to build distribution map.
															</div>
														);
													}

													const CHART_COLORS = [
														'#f43f5e', // Accent Rose
														'#a855f7', // Accent Amethyst
														'#3b82f6', // Accent Blue
														'#10b981', // Accent Emerald
														'#f59e0b', // Accent Amber
														'#ec4899', // Pink
													];

													const r = 50;
													const circ = 2 * Math.PI * r;
													let accumPercent = 0;

													return (
														<div style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%', flexWrap: 'wrap', justifyContent: 'center' }}>
															<div style={{ position: 'relative', width: '130px', height: '130px' }}>
																<svg viewBox="0 0 200 200" width="100%" height="100%">
																	{slices.map((slice, i) => {
																		const percent = slice.votes / total;
																		const strokeLength = percent * circ;
																		const strokeOffset = circ - (accumPercent * circ);
																		accumPercent += percent;
																		const color = CHART_COLORS[i % CHART_COLORS.length];

																		return (
																			<circle
																				key={i}
																				cx="100"
																				cy="100"
																				r={r}
																				fill="transparent"
																				stroke={color}
																				strokeWidth="20"
																				strokeDasharray={circ}
																				strokeDashoffset={strokeOffset}
																				transform="rotate(-90 100 100)"
																				className="chart-donut-slice"
																				opacity={hoveredDonutIndex === null || hoveredDonutIndex === i ? 1 : 0.4}
																				onMouseEnter={(e) => {
																					setHoveredDonutIndex(i);
																					const rect = e.target.getBoundingClientRect();
																					const parentRect = e.target.parentElement.parentElement.getBoundingClientRect();
																					setTooltipPos({
																						x: rect.left - parentRect.left + 45,
																						y: rect.top - parentRect.top - 50,
																						show: true,
																						label: slice.name,
																						value: `${slice.votes.toLocaleString()} Votes (${Math.round(percent * 100)}%)`
																					});
																				}}
																				onMouseLeave={() => {
																					setHoveredDonutIndex(null);
																					setTooltipPos(prev => ({ ...prev, show: false }));
																				}}
																			/>
																		);
																	})}
																	{/* Center cut-out */}
																	<circle cx="100" cy="100" r="38" fill="var(--dash-panel)" />
																	{/* Center label */}
																	<text x="100" y="96" fill="var(--text-muted)" fontSize="11" textAnchor="middle" fontWeight="bold">TOTAL</text>
																	<text x="100" y="116" fill="#fff" fontSize="16" textAnchor="middle" fontWeight="950">{total.toLocaleString()}</text>
																</svg>
																{tooltipPos.show && hoveredDonutIndex !== null && (
																	<div className="chart-tooltip-bubble" style={{ left: tooltipPos.x, top: tooltipPos.y }}>
																		<strong style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{tooltipPos.label}</strong>
																		<span style={{ fontWeight: 700, color: '#fff' }}>{tooltipPos.value}</span>
																	</div>
																)}
															</div>

															<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexGrow: 1, minWidth: '120px', fontSize: '0.85rem' }}>
																{slices.map((slice, i) => (
																	<div key={i} style={{ display: 'flex', alignItems: 'center', gap: '8px', opacity: hoveredDonutIndex === null || hoveredDonutIndex === i ? 1 : 0.5, transition: 'opacity 0.2s' }}>
																		<div style={{ width: '8px', height: '8px', borderRadius: '50%', background: CHART_COLORS[i % CHART_COLORS.length], flexShrink: 0 }}></div>
																		<span style={{ color: 'var(--text-white)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '120px' }} title={slice.name}>{slice.name}</span>
																		<span style={{ color: 'var(--text-muted)', marginLeft: 'auto', fontWeight: 'bold' }}>{Math.round((slice.votes / total) * 100)}%</span>
																	</div>
																))}
															</div>
														</div>
													);
												})()}
											</div>
										</div>
									</div>

									<div className='responsive-double-grid'>

										<div
											className='glass-panel'
											style={{
												padding: '24px',
												background: 'rgba(13,9,38,0.2)',
											}}>
											<h3
												style={{
													fontSize: '1.2rem',
													marginBottom: '15px',
													display: 'flex',
													alignItems: 'center',
													gap: '10px',
												}}>
												<Crown
													size={20}
													color='#ec4899'
													fill='#ec4899'
												/>{' '}
												Category Leaders
											</h3>
											<div
												style={{
													display: 'flex',
													flexDirection: 'column',
													gap: '15px',
												}}>
												{categories.length === 0 ? (
													<p style={{ color: 'var(--text-muted)' }}>
														No categories created yet.
													</p>
												) : (
													categories.map((cat) => {
														const leaders = getLeaderboardForCategory(cat.id);
														const leader = leaders.length > 0 ? leaders[0] : null;

														return (
															<div
																key={cat.id}
																style={{
																	display: 'flex',
																	justifyContent: 'space-between',
																	alignItems: 'center',
																	borderBottom: '1px solid var(--border-glass)',
																	paddingBottom: '10px',
																}}>
																<div>
																	<h4 style={{ fontSize: '0.95rem' }}>
																		{cat.name}
																	</h4>
																	<span
																		style={{
																			fontSize: '0.8rem',
																			color: 'var(--text-muted)',
																		}}>
																		{leader
																			? `Leader: ${leader.name}`
																			: 'No contestants'}
																	</span>
																</div>
																{leader ? (
																	<div style={{ textAlign: 'right' }}>
																		<span
																			style={{
																				color: 'var(--accent-pink)',
																				fontWeight: 700,
																				fontSize: '0.9rem',
																			}}>
																			{leader.votes_count} votes
																		</span>
																		<div
																			style={{
																				fontSize: '0.75rem',
																				color: 'var(--text-muted)',
																			}}>
																			₦
																			{(
																				leader.votes_count * 100
																			).toLocaleString()}
																		</div>
																	</div>
																) : (
																	<span
																		style={{
																			fontSize: '0.8rem',
																			color: 'var(--text-muted)',
																		}}>
																		—
																	</span>
																)}
															</div>
														);
													})
												)}
											</div>
										</div>

										{/* Transaction feed summary */}
										<div
											className='glass-panel'
											style={{
												padding: '24px',
												background: 'rgba(13,9,38,0.2)',
											}}>
											<h3 style={{ fontSize: '1.2rem', marginBottom: '15px' }}>
												Recent Votes
											</h3>
											<div
												style={{
													display: 'flex',
													flexDirection: 'column',
													gap: '12px',
												}}>
												{transactions.slice(0, 4).map((tx) => (
													<div
														key={tx.id}
														style={{
															display: 'flex',
															justify: 'space-between',
															fontSize: '0.85rem',
															borderBottom: '1px solid var(--border-glass)',
															paddingBottom: '8px',
														}}>
														<div>
															<strong>{tx.contestants?.name || 'Deleted'}</strong>
															<div
																style={{
																	color: 'var(--text-muted)',
																	fontSize: '0.75rem',
																}}>
																{tx.email}
															</div>
														</div>
														<div style={{ textAlign: 'right' }}>
															<span
																style={{
																	color: 'var(--accent-purple)',
																	fontWeight: 600,
																}}>
																+{tx.votes_count} Votes
															</span>
															<div
																style={{
																	color: 'var(--text-muted)',
																	fontSize: '0.75rem',
																}}>
																₦{tx.amount.toLocaleString()}
															</div>
														</div>
													</div>
												))}
												{transactions.length === 0 && (
													<p
														style={{
															color: 'var(--text-muted)',
															fontSize: '0.85rem',
														}}>
														No votes cast yet.
													</p>
												)}
											</div>
										</div>
									</div>
								</div>
							);
						})()}

						{/* TAB: CATEGORIES */}
						{activeTab === 'categories' && (() => {
							if (dataLoading && categories.length === 0) {
								return (
									<div className="page-fade-in">
										<h2 style={{ fontSize: '1.8rem', marginBottom: '25px' }}>
											Manage Categories
										</h2>
										<ShimmerLoader />
									</div>
								);
							}
							return (
								<div className="page-fade-in">
									<h2 style={{ fontSize: '1.8rem', marginBottom: '25px' }}>
										{editingCategory ? 'Edit Category' : 'Manage Categories'}
									</h2>

									<form
										onSubmit={handleCategorySubmit}
										className='glass-panel'
										style={{
											padding: '20px',
											marginBottom: '30px',
											background: 'rgba(13,9,38,0.3)',
										}}>
										<h3
											style={{
												fontSize: '1.1rem',
												marginBottom: '15px',
												display: 'flex',
												alignItems: 'center',
												gap: '8px',
											}}>
											<PlusCircle
												size={18}
												className='text-accent-purple'
											/>
											{editingCategory
												? `Modify: ${editingCategory.name}`
												: 'Add New Category'}
										</h3>
										<div className='responsive-form-grid'>
											<div
												className='form-group'
												style={{ marginBottom: 0 }}>
												<label>Category Title</label>
												<input
													type='text'
													className='input-control'
													placeholder='e.g. Best Artist'
													value={categoryName}
													onChange={(e) => setCategoryName(e.target.value)}
													required
												/>
											</div>
											<div
												className='form-group'
												style={{ marginBottom: 0 }}>
												<label>Brief Description</label>
												<input
													type='text'
													className='input-control'
													placeholder='Short tagline for voters'
													value={categoryDesc}
													onChange={(e) => setCategoryDesc(e.target.value)}
												/>
											</div>
										</div>
										<div
											style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
											<button
												type='submit'
												className='btn btn-primary'
												disabled={submittingCategory}>
												{editingCategory ? 'Save Changes' : 'Create Category'}
											</button>
											{editingCategory && (
												<button
													type='button'
													className='btn btn-secondary'
													onClick={() => {
														setEditingCategory(null);
														setCategoryName('');
														setCategoryDesc('');
													}}>
													Cancel
												</button>
											)}
										</div>
									</form>

									<h3 style={{ fontSize: '1.3rem', marginBottom: '15px' }}>
										All Categories
									</h3>
									{categories.length === 0 ? (
										<p style={{ color: 'var(--text-muted)' }}>
											No categories configured yet.
										</p>
									) : (
										<div className='table-container'>
											<table className='data-table'>
												<thead>
													<tr>
														<th>Name</th>
														<th>Description</th>
														<th>Created At</th>
														<th style={{ textAlign: 'right' }}>Actions</th>
													</tr>
												</thead>
												<tbody>
													{categories.map((cat) => (
														<tr key={cat.id}>
															<td>
																<strong>{cat.name}</strong>
															</td>
															<td style={{ color: 'var(--text-muted)' }}>
																{cat.description || 'N/A'}
															</td>
															<td>
																{new Date(cat.created_at).toLocaleDateString()}
															</td>
															<td style={{ textAlign: 'right' }}>
																<div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
																	<button
																		className='btn btn-secondary'
																		style={{
																			padding: '6px 12px',
																			fontSize: '0.8rem',
																		}}
																		onClick={() => handleStartEditCategory(cat)}>
																		<Edit3 size={13} /> Edit
																	</button>
																	<button
																		className='btn btn-danger'
																		style={{
																			padding: '6px 12px',
																			fontSize: '0.8rem',
																		}}
																		onClick={() => handleDeleteCategory(cat.id)}>
																		<Trash2 size={13} /> Delete
																	</button>
																</div>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							);
						})()}

						{/* TAB: CONTESTANTS */}
						{activeTab === 'contestants' && (() => {
							if (dataLoading && contestants.length === 0) {
								return (
									<div className="page-fade-in">
										<h2 style={{ fontSize: '1.8rem', marginBottom: '25px' }}>
											Contestant Management
										</h2>
										<ShimmerLoader />
									</div>
								);
							}
							return (
								<div className="page-fade-in">
									<h2 style={{ fontSize: '1.8rem', marginBottom: '25px' }}>
										{editingContestant
											? `Edit Contestant: ${editingContestant.name}`
											: 'Contestant Management'}
									</h2>

									<form
										onSubmit={handleContestantSubmit}
										className='glass-panel'
										style={{
											padding: '20px',
											marginBottom: '30px',
											background: 'rgba(13,9,38,0.3)',
										}}>
										<h3
											style={{
												fontSize: '1.1rem',
												marginBottom: '15px',
												display: 'flex',
												alignItems: 'center',
												gap: '8px',
											}}>
											<PlusCircle
												size={18}
												className='text-accent-purple'
											/>
											{editingContestant
												? 'Modify Details'
												: 'Upload New Contestant'}
										</h3>

										<div className='responsive-form-grid'>
											<div className='form-group'>
												<label>Contestant Full Name</label>
												<input
													type='text'
													className='input-control'
													placeholder='e.g. Burna Boy'
													value={contestantName}
													onChange={(e) => setContestantName(e.target.value)}
													required
												/>
											</div>

											<div className='form-group'>
												<label>Category Group</label>
												<select
													className='input-control'
													value={contestantCategoryId}
													onChange={(e) =>
														setContestantCategoryId(e.target.value)
													}
													required>
													<option value=''>-- Choose Category --</option>
													{categories.map((cat) => (
														<option
															key={cat.id}
															value={cat.id}>
															{cat.name}
														</option>
													))}
												</select>
											</div>
										</div>

										<div className='form-group'>
											<label>Short Bio / Tagline</label>
											<textarea
												className='input-control'
												rows='2'
												placeholder='Brief details or campaign promise...'
												value={contestantBio}
												onChange={(e) =>
													setContestantBio(e.target.value)
												}></textarea>
										</div>

										<div className='responsive-form-grid mt-15'>
											<div className='form-group'>
												<label>Option A: Image URL Link</label>
												<div style={{ position: 'relative' }}>
													<ImageIcon
														style={{
															position: 'absolute',
															left: '12px',
															top: '50%',
															transform: 'translateY(-50%)',
															color: 'var(--text-muted)',
														}}
														size={16}
													/>
													<input
														type='url'
														className='input-control'
														placeholder='https://example.com/avatar.jpg'
														value={contestantImageUrl}
														style={{ paddingLeft: '40px' }}
														onChange={(e) =>
															setContestantImageUrl(e.target.value)
														}
														disabled={!!contestantImageFile}
													/>
												</div>
											</div>

											<div className='form-group'>
												<label>Option B: Upload Photo File</label>
												<input
													type='file'
													accept='image/*'
													className='input-control'
													style={{ padding: '10px 15px' }}
													onChange={(e) =>
														setContestantImageFile(e.target.files[0])
													}
													disabled={!!contestantImageUrl}
												/>
											</div>
										</div>

										<div
											style={{ display: 'flex', gap: '10px', marginTop: '20px' }}>
											<button
												type='submit'
												className='btn btn-primary'
												disabled={submittingContestant}>
												{submittingContestant
													? 'Saving details...'
													: editingContestant
														? 'Save Changes'
														: 'Upload Contestant'}
											</button>
											{editingContestant && (
												<button
													type='button'
													className='btn btn-secondary'
													onClick={() => {
														setEditingContestant(null);
														setContestantName('');
														setContestantBio('');
														setContestantImageUrl('');
														setContestantImageFile(null);
														setContestantCategoryId('');
													}}>
													Cancel Edit
												</button>
											)}
										</div>
									</form>

									<h3 style={{ fontSize: '1.3rem', marginBottom: '15px' }}>
										All Contestants
									</h3>
									{contestants.length === 0 ? (
										<p style={{ color: 'var(--text-muted)' }}>
											No contestants found. Add categories first, then add
											contestants.
										</p>
									) : (
										<>
											<div className='admin-toolbar'>
												<div className='admin-search'>
													<Search size={16} />
													<input
														className='input-control'
														placeholder='Search contestants...'
														value={contestantSearch}
														onChange={(e) => setContestantSearch(e.target.value)}
													/>
												</div>
												<select
													className='input-control'
													style={{ maxWidth: '320px' }}
													value={contestantCategoryFilter}
													onChange={(e) =>
														setContestantCategoryFilter(e.target.value)
													}>
													<option value='all'>All categories</option>
													{categories.map((cat) => (
														<option
															key={cat.id}
															value={cat.id}>
															{cat.name}
														</option>
													))}
												</select>
											</div>

											<div className='table-container'>
												<table className='data-table'>
													<thead>
														<tr>
															<th>Photo</th>
															<th>Name</th>
															<th>Category</th>
															<th>Votes Cast</th>
															<th>Revenue (₦)</th>
															<th style={{ textAlign: 'right' }}>Actions</th>
														</tr>
													</thead>
													<tbody>
														{contestants
															.filter((con) => {
																const q = contestantSearch.trim().toLowerCase();
																const matchesQuery =
																	!q ||
																	con.name?.toLowerCase().includes(q) ||
																	con.bio?.toLowerCase().includes(q) ||
																	con.categories?.name?.toLowerCase().includes(q);

																const matchesCategory =
																	contestantCategoryFilter === 'all' ||
																	String(con.category_id) ===
																	String(contestantCategoryFilter);

																return matchesQuery && matchesCategory;
															})
															.map((con) => (
																<tr key={con.id}>
																	<td>
																		<div
																			style={{
																				width: '40px',
																				height: '40px',
																				borderRadius: '8px',
																				overflow: 'hidden',
																				background: 'rgba(0,0,0,0.3)',
																			}}>
																			<img
																				src={CONTESTANT_LOGO}
																				alt=''
																				style={{
																					width: '100%',
																					height: '100%',
																					objectFit: 'cover',
																				}}
																			/>
																		</div>
																	</td>
																	<td>
																		<strong>{con.name}</strong>
																	</td>
																	<td>
																		<span
																			style={{
																				background: 'rgba(139,92,246,0.1)',
																				color: 'var(--accent-purple)',
																				padding: '4px 8px',
																				borderRadius: '6px',
																				fontSize: '0.8rem',
																				fontWeight: 500,
																			}}>
																			{con.categories?.name || 'Unassigned'}
																		</span>
																	</td>
																	<td>
																		<strong
																			style={{ color: 'var(--accent-pink)' }}>
																			{con.votes_count.toLocaleString()}
																		</strong>
																	</td>
																	<td>
																		<strong>
																			₦{(con.votes_count * 100).toLocaleString()}
																		</strong>
																	</td>
																	<td style={{ textAlign: 'right' }}>
																		<div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', flexWrap: 'wrap' }}>
																			<button
																				className='btn btn-secondary'
																				style={{
																					padding: '6px 12px',
																					fontSize: '0.8rem',
																				}}
																				onClick={() =>
																					handleStartEditContestant(con)
																				}>
																				<Edit3 size={13} /> Edit
																			</button>
																			<button
																				className='btn btn-danger'
																				style={{
																					padding: '6px 12px',
																					fontSize: '0.8rem',
																				}}
																				onClick={() =>
																					handleDeleteContestant(con.id)
																				}>
																				<Trash2 size={13} /> Delete
																			</button>
																		</div>
																	</td>
																</tr>
															))}
													</tbody>
												</table>
											</div>
										</>
									)}
								</div>
							);
						})()}

						{/* TAB: LEADERBOARD */}
						{activeTab === 'leaderboard' && (() => {
							if (dataLoading && categories.length === 0) {
								return (
									<div className="page-fade-in">
										<h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>
											Category Leaderboards
										</h2>
										<ShimmerLoader />
									</div>
								);
							}
							return (
								<div className="page-fade-in">
									<h2 style={{ fontSize: '1.8rem', marginBottom: '10px' }}>
										Category Leaderboards
									</h2>
									<p style={{ color: 'var(--text-muted)', marginBottom: '30px' }}>
										Auditing live rankings per category. Ratio: ₦100 = 1 Vote
										(₦1,000 = 10 Votes).
									</p>

									{categories.length === 0 ? (
										<p style={{ color: 'var(--text-muted)' }}>
											Please configure categories first to view standings.
										</p>
									) : (
										<div
											style={{
												display: 'flex',
												flexDirection: 'column',
												gap: '40px',
											}}>
											{categories.map((cat) => {
												const standings = getLeaderboardForCategory(cat.id);
												const maxVotesInCategory = standings[0] ? standings[0].votes_count : 0;

												return (
													<div
														key={cat.id}
														className='glass-panel page-fade-in'
														style={{
															padding: '24px',
															background: 'rgba(13,9,38,0.2)',
														}}>
														<div className='leaderboard-header'>
															<div>
																<h3
																	style={{
																		fontSize: '1.3rem',
																		color: 'var(--text-white)',
																	}}>
																	{cat.name}
																</h3>
																<p
																	style={{
																		fontSize: '0.85rem',
																		color: 'var(--text-muted)',
																	}}>
																	{cat.description || 'No category description'}
																</p>
															</div>
															<span
																style={{
																	fontSize: '0.8rem',
																	background: 'rgba(59,130,246,0.1)',
																	color: 'var(--accent-blue)',
																	padding: '5px 12px',
																	borderRadius: '50px',
																	fontWeight: 600,
																}}>
																{standings.length}{' '}
																{standings.length === 1
																	? 'Contestant'
																	: 'Contestants'}
															</span>
														</div>

														{standings.length === 0 ? (
															<p
																style={{
																	color: 'var(--text-muted)',
																	fontSize: '0.9rem',
																	fontStyle: 'italic',
																}}>
																No contestants added to this category yet.
															</p>
														) : (
															<div
																style={{
																	display: 'flex',
																	flexDirection: 'column',
																	gap: '12px',
																}}>
																{standings.map((con, index) => {
																	const isLeader =
																		index === 0 && con.votes_count > 0;
																	const pct = maxVotesInCategory > 0 ? (con.votes_count / maxVotesInCategory) * 100 : 0;

																	return (
																		<div
																			key={con.id}
																			className={`leaderboard-item ${isLeader ? 'is-leader' : ''}`}>
																			<div className='leaderboard-item-details' style={{ flexGrow: 1, minWidth: 0 }}>
																				<span
																					style={{
																						fontStyle: 'italic',
																						fontWeight: 700,
																						width: '20px',
																						color:
																							index === 0
																								? 'var(--accent-pink)'
																								: 'var(--text-muted)',
																					}}>
																					#{index + 1}
																				</span>
																				<div
																					style={{
																						width: '38px',
																						height: '38px',
																						borderRadius: '50%',
																						overflow: 'hidden',
																						background: 'var(--bg-deep)',
																						flexShrink: 0,
																						border: '1.5px solid rgba(255, 255, 255, 0.08)'
																					}}>
																					<img
																						src={con.image_url || CONTESTANT_LOGO}
																						alt={con.name}
																						style={{
																							width: '100%',
																							height: '100%',
																							objectFit: 'cover',
																						}}
																					/>
																				</div>
																				<div style={{ display: 'flex', flexDirection: 'column', flexGrow: 1, minWidth: 0 }}>
																					<div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px' }}>
																						<strong style={{ fontSize: '0.95rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
																							{con.name}
																						</strong>
																						{isLeader && (
																							<span
																								className='leader-badge'
																								style={{
																									display: 'inline-flex',
																									alignItems: 'center',
																									gap: '4px',
																									fontSize: '0.7rem',
																									color: 'var(--accent-pink)',
																									background:
																										'rgba(236,72,153,0.12)',
																									padding: '2px 8px',
																									borderRadius: '50px',
																									fontWeight: 700,
																								}}>
																								<Crown
																									size={10}
																									fill='var(--accent-pink)'
																								/>{' '}
																								Leader
																							</span>
																						)}
																					</div>
																					{maxVotesInCategory > 0 && (
																						<div className="vote-progress-container" style={{ width: '240px', maxWidth: '100%' }}>
																							<div className="vote-progress-bg">
																								<div className="vote-progress-fill" style={{ '--target-width': `${pct}%`, width: `${pct}%` }}></div>
																							</div>
																							<div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
																								{isLeader ? 'Leading standings' : `${(maxVotesInCategory - con.votes_count).toLocaleString()} votes behind leader`}
																							</div>
																						</div>
																					)}
																				</div>
																			</div>

																			<div className='leaderboard-item-stats' style={{ flexShrink: 0 }}>
																				<div style={{ textAlign: 'right' }}>
																					<span
																						style={{
																							fontWeight: 700,
																							color:
																								index === 0
																									? 'var(--accent-pink)'
																									: 'var(--text-white)',
																						}}>
																						{con.votes_count.toLocaleString()}
																					</span>
																					<span
																						style={{
																							fontSize: '0.8rem',
																							color: 'var(--text-muted)',
																						}}>
																						{' '}
																						{con.votes_count === 1
																							? 'vote'
																							: 'votes'}
																					</span>
																				</div>
																				<div
																					style={{
																						minWidth: '80px',
																						textAlign: 'right',
																					}}>
																					<span
																						style={{
																							color: 'var(--text-muted)',
																							fontSize: '0.85rem',
																						}}>
																						₦
																						{(
																							con.votes_count * 100
																						).toLocaleString()}
																					</span>
																				</div>
																			</div>
																		</div>
																	);
																})}
															</div>
														)}
													</div>
												);
											})}
										</div>
									)}
								</div>
							);
						})()}

						{/* TAB: TRANSACTIONS */}
						{activeTab === 'transactions' && (() => {
							const filtered = transactions.filter(tx => {
								const matchesSearch = !txSearchQuery ||
									(tx.reference && tx.reference.toLowerCase().includes(txSearchQuery.toLowerCase())) ||
									(tx.email && tx.email.toLowerCase().includes(txSearchQuery.toLowerCase())) ||
									(tx.contestants?.name && tx.contestants.name.toLowerCase().includes(txSearchQuery.toLowerCase()));

								const matchesCategory = txCategoryFilter === 'all' ||
									(tx.contestants?.category_id === txCategoryFilter);

								let matchesDate = true;
								if (txDateFilter !== 'all') {
									const txTime = new Date(tx.created_at).getTime();
									const nowTime = Date.now();
									if (txDateFilter === '24h') {
										matchesDate = (nowTime - txTime) <= 24 * 60 * 60 * 1000;
									} else if (txDateFilter === '7d') {
										matchesDate = (nowTime - txTime) <= 7 * 24 * 60 * 60 * 1000;
									} else if (txDateFilter === '30d') {
										matchesDate = (nowTime - txTime) <= 30 * 24 * 60 * 60 * 1000;
									}
								}
								return matchesSearch && matchesCategory && matchesDate;
							});

							const filteredVotes = filtered.reduce((acc, curr) => acc + (curr.votes_count || 0), 0);
							const filteredCash = filtered.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

							return (
								<div className="page-fade-in">
									<h2 style={{ fontSize: '1.8rem', marginBottom: '25px' }}>
										Transaction History Logs
									</h2>
									<p style={{ color: 'var(--text-muted)', marginBottom: '20px' }}>
										Review the latest verified votes.
									</p>

									{/* Advanced filters toolbar */}
									<div className="filter-toolbar">
										<div className="filter-item" style={{ flex: '2' }}>
											<label>Search Transactions</label>
											<input
												type="text"
												className="filter-input"
												placeholder="Search email, ref, or contestant..."
												value={txSearchQuery}
												onChange={(e) => setTxSearchQuery(e.target.value)}
											/>
										</div>

										<div className="filter-item">
											<label>Category</label>
											<select
												className="filter-select"
												value={txCategoryFilter}
												onChange={(e) => setTxCategoryFilter(e.target.value)}
											>
												<option value="all">All Categories</option>
												{categories.map(cat => (
													<option key={cat.id} value={cat.id}>{cat.name}</option>
												))}
											</select>
										</div>

										<div className="filter-item">
											<label>Date Range</label>
											<select
												className="filter-select"
												value={txDateFilter}
												onChange={(e) => setTxDateFilter(e.target.value)}
											>
												<option value="all">All Time</option>
												<option value="24h">Last 24 Hours</option>
												<option value="7d">Last 7 Days</option>
												<option value="30d">Last 30 Days</option>
											</select>
										</div>

										<div className="filter-actions">
											<button
												type='button'
												className='btn btn-secondary'
												onClick={exportTransactionsCsv}
												disabled={!filtered.length}
												style={{ height: '42px', padding: '0 20px' }}
											>
												<Download size={16} /> Export CSV
											</button>
										</div>
									</div>

				
									{transactions.length > 0 && (
										<div style={{ display: 'flex', gap: '15px', marginBottom: '18px', fontSize: '0.85rem', color: 'var(--text-muted)', flexWrap: 'wrap' }}>
											<span>Showing <strong>{filtered.length}</strong> of {transactions.length} transactions</span>
											<span>•</span>
											<span>Filtered Votes: <strong style={{ color: 'var(--accent-pink)' }}>{filteredVotes.toLocaleString()}</strong></span>
											<span>•</span>
											<span>Filtered Revenue: <strong style={{ color: 'var(--accent-emerald)' }}>₦{filteredCash.toLocaleString()}</strong></span>
										</div>
									)}

									{filtered.length === 0 ? (
										<div className="glass-panel" style={{ padding: '40px', textAlign: 'center', background: 'rgba(13,9,38,0.15)' }}>
											<p style={{ color: 'var(--text-muted)' }}>
												No transactions match the current filter settings.
											</p>
										</div>
									) : (
										<div className='table-container'>
											<table className='data-table'>
												<thead>
													<tr>
														<th>Date</th>
														<th>Reference ID</th>
														<th>Contestant</th>
														<th>Votes</th>
														<th>Amount Paid</th>
														<th>Voter Email</th>
														<th>Status</th>
													</tr>
												</thead>
												<tbody>
													{filtered.map((tx) => (
														<tr key={tx.id}>
															<td>{new Date(tx.created_at).toLocaleString()}</td>
															<td
																style={{
																	fontFamily: 'monospace',
																	fontSize: '0.8rem',
																}}>
																{tx.reference}
															</td>
															<td>
																<strong>
																	{tx.contestants?.name || 'Deleted Contestant'}
																</strong>
															</td>
															<td>{tx.votes_count}</td>
															<td>
																<strong style={{ color: 'var(--text-white)' }}>₦{tx.amount.toLocaleString()}</strong>
															</td>
															<td>{tx.email}</td>
															<td>
																<span className={`status-pill ${tx.status.toLowerCase() === 'success' ? 'success' : tx.status.toLowerCase() === 'pending' ? 'pending' : 'failed'}`}>
																	{tx.status}
																</span>
															</td>
														</tr>
													))}
												</tbody>
											</table>
										</div>
									)}
								</div>
							);
						})()}
					</div>
				</main>
			</div>
		</div>
	);
}
