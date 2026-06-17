import React, { useState, useCallback } from 'react';
import { Users, DollarSign, Layers, Crown } from 'lucide-react';

export default function OverviewTab({
	stats,
	transactions,
	categories,
	contestants,
	dataLoading,
	ShimmerLoader,
	getLeaderboardForCategory
}) {
	const [hoveredChartIndex, setHoveredChartIndex] = useState(null);
	const [hoveredDonutIndex, setHoveredDonutIndex] = useState(null);
	const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0, show: false, label: '', value: '' });

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
							color: 'var(--accent-pink)',
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
						background: 'var(--dash-panel-strong)',
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
							color='var(--accent-pink)'
							fill='var(--accent-pink)'
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
											borderBottom: '1px solid var(--dash-border)',
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
						background: 'var(--dash-panel-strong)',
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
									justifyContent: 'space-between',
									fontSize: '0.85rem',
									borderBottom: '1px solid var(--dash-border)',
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
}
