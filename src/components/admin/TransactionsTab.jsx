import React, { useState, useCallback } from 'react';
import { Download } from 'lucide-react';

export default function TransactionsTab({
	transactions,
	categories,
	showToast
}) {
	const [txSearchQuery, setTxSearchQuery] = useState('');
	const [txCategoryFilter, setTxCategoryFilter] = useState('all');
	const [txDateFilter, setTxDateFilter] = useState('all');

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
	}, [transactions, txSearchQuery, txCategoryFilter, txDateFilter, showToast]);

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
				<div className="glass-panel" style={{ padding: '40px', textAlign: 'center', background: 'var(--dash-panel-strong)' }}>
					<p style={{ color: 'var(--text-muted)' }}>
						No transactions match the current filter settings.
					</p>
				</div>
			) : (
				<div className='table-container'>
					<table className='dash-table'>
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
}
