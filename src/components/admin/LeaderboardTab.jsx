import React from 'react';
import { Crown } from 'lucide-react';

const CONTESTANT_LOGO = '/awards.jpg';

export default function LeaderboardTab({
	categories,
	dataLoading,
	ShimmerLoader,
	getLeaderboardForCategory
}) {
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
									background: 'var(--dash-panel-strong)',
								}}>
								<div className='leaderboard-header' style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
									<div>
										<h3
											style={{
												fontSize: '1.3rem',
												color: 'var(--text-white)',
												margin: 0
											}}>
											{cat.name}
										</h3>
										<p
											style={{
												fontSize: '0.85rem',
												color: 'var(--text-muted)',
												margin: '4px 0 0'
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
											const isLeader = index === 0 && con.votes_count > 0;
											const pct = maxVotesInCategory > 0 ? (con.votes_count / maxVotesInCategory) * 100 : 0;

											return (
												<div
													key={con.id}
													className={`leaderboard-item ${isLeader ? 'is-leader' : ''}`}
													style={{
														display: 'flex',
														alignItems: 'center',
														gap: '16px',
														padding: '12px',
														borderRadius: '12px',
														background: isLeader ? 'rgba(236,72,153,0.04)' : 'rgba(255,255,255,0.02)',
														border: isLeader ? '1px solid rgba(236,72,153,0.15)' : '1px solid transparent',
													}}>
													<div className='leaderboard-item-details' style={{ display: 'flex', alignItems: 'center', gap: '16px', flexGrow: 1, minWidth: 0 }}>
														<span
															style={{
																fontStyle: 'italic',
																fontWeight: 700,
																width: '24px',
																textAlign: 'center',
																color: index === 0 ? 'var(--accent-pink)' : 'var(--text-muted)',
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
																			background: 'rgba(236,72,153,0.12)',
																			padding: '2px 8px',
																			borderRadius: '50px',
																			fontWeight: 700,
																		}}>
																		<Crown size={10} fill='var(--accent-pink)' />{' '}
																		Leader
																	</span>
																)}
															</div>
															{maxVotesInCategory > 0 && (
																<div className="vote-progress-container" style={{ width: '240px', maxWidth: '100%', marginTop: '6px' }}>
																	<div className="vote-progress-bg" style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '4px', overflow: 'hidden' }}>
																		<div className="vote-progress-fill" style={{ width: `${pct}%`, height: '100%', background: isLeader ? 'var(--accent-pink)' : 'rgba(255,255,255,0.2)', borderRadius: '4px', transition: 'width 1s ease-out' }}></div>
																	</div>
																	<div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '4px' }}>
																		{isLeader ? 'Leading standings' : `${(maxVotesInCategory - con.votes_count).toLocaleString()} votes behind leader`}
																	</div>
																</div>
															)}
														</div>
													</div>

													<div className='leaderboard-item-stats' style={{ display: 'flex', gap: '16px', alignItems: 'center', flexShrink: 0 }}>
														<div style={{ textAlign: 'right' }}>
															<span
																style={{
																	fontWeight: 700,
																	color: index === 0 ? 'var(--accent-pink)' : 'var(--text-white)',
																}}>
																{con.votes_count.toLocaleString()}
															</span>
															<span
																style={{
																	fontSize: '0.8rem',
																	color: 'var(--text-muted)',
																}}>
																{' '}
																{con.votes_count === 1 ? 'vote' : 'votes'}
															</span>
														</div>
														<div style={{ minWidth: '80px', textAlign: 'right' }}>
															<span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
																₦{(con.votes_count * 100).toLocaleString()}
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
}
