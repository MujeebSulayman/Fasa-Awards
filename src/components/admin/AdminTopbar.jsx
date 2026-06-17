import React from 'react';
import { Menu, ChevronLeft, LogOut } from 'lucide-react';

export default function AdminTopbar({
	activeTab,
	setSidebarOpen,
	session,
	onNavigateToVoter,
	handleLogout
}) {
	return (
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
	);
}
