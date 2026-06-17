import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { Mail, Lock, EyeOff, Eye, LockKeyhole, AlertCircle, CheckCircle, ChevronLeft } from 'lucide-react';

import AdminSidebar from './admin/AdminSidebar';
import AdminTopbar from './admin/AdminTopbar';
import OverviewTab from './admin/OverviewTab';
import CategoriesTab from './admin/CategoriesTab';
import ContestantsTab from './admin/ContestantsTab';
import LeaderboardTab from './admin/LeaderboardTab';
import TransactionsTab from './admin/TransactionsTab';

const ShimmerLoader = () => (
	<div className='shimmer-wrapper'>
		<div className='shimmer-line' style={{ width: '60%', height: '30px' }}></div>
		<div className='shimmer-line' style={{ width: '80%', height: '20px' }}></div>
		<div className='shimmer-line' style={{ width: '100%', height: '120px' }}></div>
		<div className='shimmer-line' style={{ width: '90%', height: '120px' }}></div>
	</div>
);

export default function AdminPortal({ onNavigateToVoter }) {
	const [session, setSession] = useState(null);
	const [showPassword, setShowPassword] = useState(false);
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [authLoading, setAuthLoading] = useState(false);

	const [activeTab, setActiveTab] = useState('dashboard');
	const [sidebarOpen, setSidebarOpen] = useState(false);
	const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

	const [stats, setStats] = useState({ totalVotes: 0, totalCash: 0, categoriesCount: 0, contestantsCount: 0 });
	const [categories, setCategories] = useState([]);
	const [contestants, setContestants] = useState([]);
	const [transactions, setTransactions] = useState([]);
	const [dataLoading, setDataLoading] = useState(false);

	const [toast, setToast] = useState(null);

	const showToast = (message, type = 'success') => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 4000);
	};

	const loadAdminData = useCallback(async () => {
		try {
			setDataLoading(true);

			const { data: catData, error: catError } = await supabase
				.from('categories')
				.select('*')
				.order('created_at', { ascending: false });
			if (catError) throw catError;
			setCategories(catData || []);

			const { data: conData, error: conError } = await supabase
				.from('contestants')
				.select('*, categories(name)')
				.order('votes_count', { ascending: false });
			if (conError) throw conError;
			setContestants(conData || []);

			const { data: voteData, error: voteError } = await supabase
				.from('votes')
				.select('*, contestants(name)')
				.order('created_at', { ascending: false });
			if (voteError) throw voteError;
			setTransactions(voteData || []);

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

	useEffect(() => {
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

	const getLeaderboardForCategory = useCallback((categoryId) => {
		return contestants
			.filter((c) => c.category_id === categoryId)
			.sort((a, b) => b.votes_count - a.votes_count);
	}, [contestants]);

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
									<span>Login to Dashboard</span>
								)}
							</button>
						</form>
					</div>
				</main>
			</div>
		);
	}

	return (
		<div className='dash-layout'>
			{toast && (
				<div
					className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}
					style={{ zIndex: 10000 }}>
					{toast.type === 'error' ? (
						<AlertCircle size={20} />
					) : (
						<CheckCircle size={20} />
					)}
					<span>{toast.message}</span>
				</div>
			)}

			<AdminSidebar 
				session={session} 
				stats={stats} 
				transactions={transactions} 
				activeTab={activeTab} 
				setActiveTab={setActiveTab} 
				sidebarOpen={sidebarOpen} 
				setSidebarOpen={setSidebarOpen} 
				isSidebarCollapsed={isSidebarCollapsed} 
				setIsSidebarCollapsed={setIsSidebarCollapsed} 
			/>

			<div className={`dash-main ${isSidebarCollapsed ? 'expanded' : ''}`}>
				<AdminTopbar 
					activeTab={activeTab} 
					setSidebarOpen={setSidebarOpen} 
					session={session} 
					onNavigateToVoter={onNavigateToVoter} 
					handleLogout={handleLogout} 
				/>

				<div className='dash-content'>
					{activeTab === 'dashboard' && (
						<OverviewTab 
							stats={stats} 
							transactions={transactions} 
							categories={categories} 
							contestants={contestants} 
							dataLoading={dataLoading} 
							ShimmerLoader={ShimmerLoader} 
							getLeaderboardForCategory={getLeaderboardForCategory} 
						/>
					)}

					{activeTab === 'categories' && (
						<CategoriesTab 
							categories={categories} 
							dataLoading={dataLoading} 
							ShimmerLoader={ShimmerLoader} 
							loadAdminData={loadAdminData} 
							showToast={showToast} 
						/>
					)}

					{activeTab === 'contestants' && (
						<ContestantsTab 
							categories={categories} 
							contestants={contestants} 
							dataLoading={dataLoading} 
							ShimmerLoader={ShimmerLoader} 
							loadAdminData={loadAdminData} 
							showToast={showToast} 
						/>
					)}

					{activeTab === 'leaderboard' && (
						<LeaderboardTab 
							categories={categories} 
							dataLoading={dataLoading} 
							ShimmerLoader={ShimmerLoader} 
							getLeaderboardForCategory={getLeaderboardForCategory} 
						/>
					)}

					{activeTab === 'transactions' && (
						<TransactionsTab 
							transactions={transactions} 
							categories={categories} 
							showToast={showToast} 
						/>
					)}
				</div>
			</div>
		</div>
	);
}
