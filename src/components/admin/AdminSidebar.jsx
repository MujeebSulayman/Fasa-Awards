import React from 'react';
import { BarChart3, Layers, Users, Trophy, History, Crown, ChevronLeft, ChevronRight } from 'lucide-react';

export default function AdminSidebar({
	session,
	stats,
	transactions,
	activeTab,
	setActiveTab,
	sidebarOpen,
	setSidebarOpen,
	isSidebarCollapsed,
	setIsSidebarCollapsed
}) {
	return (
		<>
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
						<span className='dash-nav-badge'>{stats?.categoriesCount || 0}</span>
					</button>
					<button
						type='button'
						className={`dash-nav-item ${activeTab === 'contestants' ? 'active' : ''}`}
						onClick={() => {
							setActiveTab('contestants');
							setSidebarOpen(false);
						}}>
						<Users size={18} style={{ flexShrink: 0 }} /> <span>Contestants</span>{' '}
						<span className='dash-nav-badge'>{stats?.contestantsCount || 0}</span>
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
						<span className='dash-nav-badge'>{transactions?.length || 0}</span>
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
		</>
	);
}
