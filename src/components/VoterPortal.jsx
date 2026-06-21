import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import CategoryDropdown from './CategoryDropdown';
import {
	Search,
	Award,
	ThumbsUp,
	X,
	CheckCircle,
	Check,
	AlertCircle,
} from 'lucide-react';

const createTransactionReference = () =>
	`VOTE-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
const CONTESTANT_LOGO = '/awards.jpg';

export default function VoterPortal({ currentPath, navigate }) {
	const [categories, setCategories] = useState([]);
	const [contestants, setContestants] = useState([]);
	const [loading, setLoading] = useState(true);
	const [searchQuery, setSearchQuery] = useState('');
	const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('All');

	// Voting Modal State
	const [votingContestant, setVotingContestant] = useState(null);
	const [votesCount, setVotesCount] = useState(5);
	const [isProcessingPayment, setIsProcessingPayment] = useState(false);

	// Success Modal State
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [successDetails, setSuccessDetails] = useState(null);

	// Toast notifications
	const [toast, setToast] = useState(null);

	const showToast = (message, type = 'success') => {
		setToast({ message, type });
		setTimeout(() => setToast(null), 4000);
	};

	const fetchData = useCallback(async () => {
		try {
			setLoading(true);

			// Fetch Categories
			const { data: catData, error: catError } = await supabase
				.from('categories')
				.select('*')
				.order('name');

			if (catError) throw catError;
			setCategories(catData || []);

			const { data: conData, error: conError } = await supabase
				.from('contestants')
				.select('*, categories(name)')
				.order('name', { ascending: true });

			if (conError) throw conError;
			setContestants(conData || []);
		} catch (error) {
			console.error('Error fetching data:', error);
			showToast(
				'Unable to load contestants right now. Please try again later.',
				'error',
			);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		// eslint-disable-next-line react-hooks/set-state-in-effect
		fetchData();
	}, [fetchData]);

	// Sync contestant detail page with URL path
	useEffect(() => {
		const match = currentPath.match(/^\/contestant\/([a-zA-Z0-9-]+)$/);
		if (match) {
			const contestantId = match[1];
			if (contestants.length > 0) {
				const found = contestants.find((c) => c.id === contestantId);
				if (found) {
					setVotingContestant(found);
				} else {
					// If not found, revert back to contestants list
					navigate('/contestants');
				}
			}
		} else {
			setVotingContestant(null);
		}
	}, [currentPath, contestants, navigate]);

	const handleOpenVoteModal = (contestant) => {
		navigate(`/contestant/${contestant.id}`);
		setVotesCount(5); // Default to 5 votes
	};

	const handleCloseVoteModal = () => {
		if (isProcessingPayment) return;
		navigate('/contestants');
	};

	const handlePaystackPayment = () => {
		if (votesCount < 1) {
			showToast('You must purchase at least 1 vote.', 'error');
			return;
		}

		const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
		if (!paystackPublicKey) {
			showToast(
				'Payment is not available right now. Please try again later.',
				'error',
			);
			return;
		}

		const totalAmount = votesCount * 100; // 100 Naira per vote
		const amountInKobo = totalAmount * 100; // Paystack takes amount in kobo

		if (!window.PaystackPop) {
			showToast(
				'Payment service failed to load. Please refresh and try again.',
				'error',
			);
			return;
		}

		setIsProcessingPayment(true);

		const transactionReference = createTransactionReference();
		// Paystack requires a valid email format. .local is rejected by Paystack validation.
		const payerEmail = `anonymous+${transactionReference}@example.com`;

		if (typeof window.PaystackPop.setup !== 'function') {
			setIsProcessingPayment(false);
			showToast(
				'Payment service failed to initialize. Please refresh and try again.',
				'error',
			);
			return;
		}

		const handler = window.PaystackPop.setup({
			key: paystackPublicKey,
			email: payerEmail,
			amount: amountInKobo,
			currency: 'NGN',
			ref: transactionReference,
			metadata: {
				contestant_id: votingContestant.id,
				votes_count: votesCount,
				email: payerEmail,
				custom_fields: [
					{
						display_name: 'Contestant ID',
						variable_name: 'contestant_id',
						value: votingContestant.id,
					},
					{
						display_name: 'Votes Count',
						variable_name: 'votes_count',
						value: votesCount,
					},
					{
						display_name: 'Payer Email',
						variable_name: 'email',
						value: payerEmail,
					},
				],
			},
			callback: function (response) {
				// Use a non-async callback (some Paystack builds validate typeof === 'function')
				// Delegate to the async record function and handle errors there.
				handleRecordVote(
					votingContestant.id,
					payerEmail,
					response.reference,
					votesCount,
					totalAmount,
				).catch((err) => {
					console.error('Error recording vote after payment:', err);
					showToast(
						'Payment succeeded but recording failed. Contact support.',
						'error',
					);
				});
			},
			onClose: function () {
				setIsProcessingPayment(false);
				showToast('Payment cancelled by user.', 'error');
			},
		});

		try {
			if (!handler || typeof handler.openIframe !== 'function') {
				throw new Error('Payment handler not available');
			}
			handler.openIframe();
		} catch (err) {
			console.error('Paystack integration error:', err);
			setIsProcessingPayment(false);
			showToast(
				'Payment service failed to initialize. Please refresh and try again.',
				'error',
			);
		}
	};

	const handleRecordVote = async (
		contestantId,
		email,
		reference,
		votes,
		amount,
	) => {
		try {
			// Record vote via verify-payment Edge Function (calls secure RPC internally after validation)
			const { data, error } = await supabase.functions.invoke('verify-payment', {
				body: {
					reference,
					contestantId,
					votesCount: votes,
					email,
				},
			});

			if (error) throw error;

			if (data && data.success) {
				// Success details must be set before resetting path
				setSuccessDetails({
					contestantName: votingContestant.name,
					votesCount: votes,
					amount: amount,
					reference: reference,
					email: email,
				});

				setShowSuccessModal(true);
				showToast('Vote cast successfully!', 'success');
				navigate('/contestants');

				// Refresh Contestants data to show updated votes counts
				fetchData();
			} else {
				throw new Error(data?.message || 'Failed to record transaction log.');
			}
		} catch (error) {
			console.error('Error logging vote:', error);
			showToast(
				'Payment was completed, but we could not confirm your vote. Please contact support with your reference.',
				'error',
			);
		} finally {
			setIsProcessingPayment(false);
		}
	};

	// Filter contestants based on search query and category tab
	const filteredContestants = contestants.filter((con) => {
		const matchesSearch = con.name
			.toLowerCase()
			.includes(searchQuery.toLowerCase());

		const matchesCategory =
			selectedCategoryFilter === 'All' ||
			con.category_id === selectedCategoryFilter;

		return matchesSearch && matchesCategory;
	});

	// Group contestants by category for section layout (when viewing "All")
	const getContestantsByCategory = (catId) => {
		return filteredContestants.filter((c) => c.category_id === catId);
	};

	if (votingContestant) {
		return (
			<div className='app-container'>
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

				{/* Navigation Header */}
				<nav className='navbar'>
					<button
						className='btn btn-secondary'
						onClick={handleCloseVoteModal}
						disabled={isProcessingPayment}
						style={{
							padding: '8px 16px',
							display: 'inline-flex',
							alignItems: 'center',
							gap: '6px',
						}}>
						← Back to Nominees
					</button>
					<a
						href='#'
						className='nav-brand'
						onClick={(e) => {
							e.preventDefault();
							handleCloseVoteModal();
						}}>
						<img
							src='/logo.jpg'
							alt='FASA logo'
							className='nav-logo'
						/>
					</a>
				</nav>

				{/* Main Container */}
				<main className='main-content'>
					<div className='contestant-detail-layout'>
						{/* Left Column: Large Image & Info */}
						<div
							className='glass-panel'
							style={{
								padding: '24px',
								display: 'flex',
								flexDirection: 'column',
								gap: '20px',
								background: 'rgba(38, 17, 48, 0.4)',
							}}>
							<div
								style={{
									borderRadius: '16px',
									overflow: 'hidden',
									border: '1px solid var(--border-glass)',
									aspectRatio: '1/1',
									position: 'relative',
								}}>
								<img
									src={CONTESTANT_LOGO}
									alt={votingContestant.name}
									style={{ width: '100%', height: '100%', objectFit: 'cover' }}
								/>
								<div
									className='contestant-votes-badge glow'
									style={{ position: 'absolute', top: '16px', left: '16px' }}>
									<Award size={16} />
									<span>
										{votingContestant.votes_count.toLocaleString()} Votes
									</span>
								</div>
							</div>

							<div>
								{votingContestant.categories?.name && (
									<span
										className='dash-pill'
										style={{
											marginBottom: '12px',
											display: 'inline-flex',
											borderColor: 'var(--accent-pink)',
											color: '#ffffff',
											background: 'rgba(236, 72, 153, 0.15)',
											fontSize: '0.85rem',
											padding: '6px 14px',
										}}>
										{votingContestant.categories.name}
									</span>
								)}
								<h2
									style={{
										fontSize: '2.2rem',
										fontFamily: 'var(--font-display)',
										fontWeight: 900,
										marginTop: '5px',
									}}>
									{votingContestant.name}
								</h2>
								<p
									style={{
										color: 'var(--text-muted)',
										fontSize: '0.95rem',
										marginTop: '10px',
										lineHeight: 1.6,
									}}>
									Every vote costs ₦100. Casting votes supports your favorite
									contestant and helps them secure the win. Enter a vote count
									below to get started.
								</p>
							</div>
						</div>

						{/* Right Column: Voting Controls & Payment */}
						<div
							className='glass-panel vote-modal'
							style={{ padding: '30px', background: 'rgba(38, 17, 48, 0.4)' }}>
							<div
								style={{
									borderBottom: '1px solid var(--border-glass)',
									paddingBottom: '20px',
									marginBottom: '25px',
								}}>
								<h3
									style={{
										margin: 0,
										fontSize: '1.6rem',
										fontFamily: 'var(--font-display)',
									}}>
									Cast Your Vote
								</h3>
								<div
									className='vote-modal-subtitle'
									style={{ fontSize: '0.9rem' }}>
									Choose quantity and proceed to checkout securely
								</div>
							</div>

							<div
								className='vote-qty'
								style={{
									display: 'flex',
									flexDirection: 'column',
									gap: '20px',
								}}>
								<div className='vote-qty-row'>
									<div>
										<div
											className='vote-qty-label'
											style={{ fontSize: '1.1rem' }}>
											Quantity
										</div>
										<div
											className='vote-qty-help'
											style={{ fontSize: '0.85rem' }}>
											Set the number of votes to purchase
										</div>
									</div>

									<div className='vote-stepper'>
										<button
											type='button'
											className='stepper-btn'
											onClick={() => setVotesCount((v) => Math.max(1, v - 1))}
											disabled={isProcessingPayment || votesCount <= 1}
											aria-label='Decrease'
											style={{ width: '50px', height: '46px' }}>
											−
										</button>
										<div
											className='stepper-value'
											style={{ minWidth: '60px', fontSize: '1.2rem' }}>
											{votesCount}
										</div>
										<button
											type='button'
											className='stepper-btn'
											onClick={() => setVotesCount((v) => Math.min(1000, v + 1))}
											disabled={isProcessingPayment || votesCount >= 1000}
											aria-label='Increase'
											style={{ width: '50px', height: '46px' }}>
											+
										</button>
									</div>
								</div>

								{/* Preset buttons */}
								<div
									className='vote-shortcuts'
									style={{ gap: '12px' }}>
									{[1, 5, 10, 20, 50, 100, 200, 300, 500].map((val) => (
										<button
											key={val}
											type='button'
											className='shortcut-btn'
											style={{
												padding: '10px 20px',
												background:
													votesCount === val
														? 'var(--accent-purple)'
														: 'rgba(255,255,255,0.05)',
												borderColor: votesCount === val ? '#7b3e93' : undefined,
											}}
											onClick={() => setVotesCount(val)}
											disabled={isProcessingPayment}>
											{val}
										</button>
									))}
								</div>
							</div>

							{/* Cost Box */}
							<div
								className='vote-calculation-box'
								style={{ marginTop: '30px', padding: '20px', gap: '10px' }}>
								<span
									style={{
										fontSize: '0.85rem',
										textTransform: 'uppercase',
										letterSpacing: '0.08em',
										color: 'var(--text-muted)',
									}}>
									Total Payment Due
								</span>
								<span
									className='vote-price-display'
									style={{ fontSize: '2.4rem' }}>
									₦{(votesCount * 100).toLocaleString()}
								</span>
							</div>

							{/* Action buttons */}
							<div style={{ display: 'flex', gap: '15px', marginTop: '35px' }}>
								<button
									className='btn btn-secondary'
									style={{ flex: 1, padding: '14px' }}
									onClick={handleCloseVoteModal}
									disabled={isProcessingPayment}>
									Cancel
								</button>
								<button
									className='btn btn-primary'
									style={{ flex: 2, padding: '14px' }}
									onClick={handlePaystackPayment}
									disabled={isProcessingPayment}>
									{isProcessingPayment ? (
										<>
											<div
												className='spinner'
												style={{
													width: '18px',
													height: '18px',
													borderTopColor: 'white',
												}}></div>
											Connecting...
										</>
									) : (
										<>
											<ThumbsUp size={18} />
											Confirm & Pay
										</>
									)}
								</button>
							</div>
						</div>
					</div>
				</main>

				{/* Footer */}
				<footer
					className='footer'
					style={{ marginTop: '40px' }}>
					<p>&copy; {new Date().getFullYear()} Fasa Awards Portal.</p>
				</footer>

				{/* Success Modal */}
				{showSuccessModal && successDetails && (
					<div
						className='modal-overlay'
						onClick={() => setShowSuccessModal(false)}>
						<div
							className='modal-content glass-panel'
							style={{ textAlign: 'center' }}
							onClick={(e) => e.stopPropagation()}>
							<div className='modal-header'>
								<h3 style={{ width: '100%' }}>Thank You for Voting!</h3>
							</div>
							<div
								className='modal-body'
								style={{ padding: '35px 25px' }}>
								<div className='success-checkmark'>
									<Check
										size={40}
										strokeWidth={3}
									/>
								</div>

								<h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>
									Payment Confirmed
								</h2>
								<p
									style={{
										color: 'var(--text-muted)',
										fontSize: '0.95rem',
										marginBottom: '25px',
									}}>
									We successfully cast {successDetails.votesCount}{' '}
									{successDetails.votesCount === 1 ? 'vote' : 'votes'} for{' '}
									<strong style={{ color: 'var(--text-white)' }}>
										{successDetails.contestantName}
									</strong>
									.
								</p>

								<div
									style={{
										background: 'rgba(13, 9, 38, 0.6)',
										border: '1px solid var(--border-glass)',
										borderRadius: '12px',
										padding: '20px',
										textAlign: 'left',
										display: 'flex',
										flexDirection: 'column',
										gap: '10px',
										fontSize: '0.85rem',
									}}>
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
										}}>
										<span style={{ color: 'var(--text-muted)' }}>
											Contestant
										</span>
										<strong>{successDetails.contestantName}</strong>
									</div>
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
										}}>
										<span style={{ color: 'var(--text-muted)' }}>
											Votes Credited
										</span>
										<span
											style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>
											{successDetails.votesCount} Votes
										</span>
									</div>
									<div
										style={{
											display: 'flex',
											justifyContent: 'space-between',
										}}>
										<span style={{ color: 'var(--text-muted)' }}>
											Amount Paid
										</span>
										<strong>₦{successDetails.amount.toLocaleString()}</strong>
									</div>
									<div
										style={{
											borderTop: '1px solid var(--border-glass)',
											marginTop: '8px',
											paddingTop: '8px',
											display: 'flex',
											justifyContent: 'space-between',
											fontFamily: 'monospace',
											color: 'var(--text-muted)',
										}}>
										<span>Reference:</span>
										<span>{successDetails.reference.slice(0, 18)}...</span>
									</div>
								</div>

								<button
									className='btn btn-primary'
									style={{ width: '100%', marginTop: '30px' }}
									onClick={() => setShowSuccessModal(false)}>
									Close & Return
								</button>
							</div>
						</div>
					</div>
				)}
			</div>
		);
	}

	return (
		<div className='app-container'>
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

			{/* Navigation Header */}
			<nav className='navbar'>
				<a
					href='#'
					className='nav-brand'
					onClick={(e) => {
						e.preventDefault();
						fetchData();
					}}>
					<img
						src='/logo.jpg'
						alt='FASA logo'
						className='nav-logo'
					/>
				</a>
			</nav>

			{/* Main Container */}
			<main className='main-content'>
				{/* Hero Banner */}
				<section className='hero-section'>
					<h1 className='hero-title'>Support Your Favorites</h1>
				</section>

				{/* Search and Filters */}
				<div className='search-filter-container'>
					<div className='search-wrapper'>
						<Search
							className='search-icon'
							size={20}
						/>
						<input
							type='text'
							className='input-control'
							placeholder='Search contestants by name...'
							value={searchQuery}
							onChange={(e) => setSearchQuery(e.target.value)}
						/>
					</div>
					{/* Redesign: Custom Category Dropdown */}
					<CategoryDropdown
						categories={categories}
						selected={selectedCategoryFilter}
						onSelect={setSelectedCategoryFilter}
					/>
				</div>

				{/* Contestants Grid */}
				{loading ? (
					<div className='page-loader'>
						<div className='spinner'></div>
						<p>Loading contestants...</p>
					</div>
				) : filteredContestants.length === 0 ? (
					<div
						style={{
							textAlign: 'center',
							padding: '60px 20px',
							color: 'var(--text-muted)',
						}}>
						<Award
							size={48}
							style={{ marginBottom: '15px', strokeWidth: 1 }}
						/>
						<h3>No contestants found</h3>
						<p>Try resetting filters or searching for another keyword.</p>
					</div>
				) : (
					<div className='contestants-grid'>
						{filteredContestants.map((con) => (
							<ContestantCard
								key={con.id}
								contestant={con}
								onVote={handleOpenVoteModal}
							/>
						))}
					</div>
				)}
			</main>

			{/* Footer */}
			<footer className='footer'>
				<p>&copy; {new Date().getFullYear()} Fasa Awards Portal.</p>
			</footer>

			{/* Success Modal */}
			{showSuccessModal && successDetails && (
				<div
					className='modal-overlay'
					onClick={() => setShowSuccessModal(false)}>
					<div
						className='modal-content glass-panel'
						style={{ textAlign: 'center' }}
						onClick={(e) => e.stopPropagation()}>
						<div className='modal-header'>
							<h3 style={{ width: '100%' }}>Thank You for Voting!</h3>
						</div>
						<div
							className='modal-body'
							style={{ padding: '35px 25px' }}>
							<div className='success-checkmark'>
								<Check
									size={40}
									strokeWidth={3}
								/>
							</div>

							<h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>
								Payment Confirmed
							</h2>
							<p
								style={{
									color: 'var(--text-muted)',
									fontSize: '0.95rem',
									marginBottom: '25px',
								}}>
								We successfully cast {successDetails.votesCount}{' '}
								{successDetails.votesCount === 1 ? 'vote' : 'votes'} for{' '}
								<strong style={{ color: 'var(--text-white)' }}>
									{successDetails.contestantName}
								</strong>
								.
							</p>

							<div
								style={{
									background: 'rgba(13, 9, 38, 0.6)',
									border: '1px solid var(--border-glass)',
									borderRadius: '12px',
									padding: '20px',
									textAlign: 'left',
									display: 'flex',
									flexDirection: 'column',
									gap: '10px',
									fontSize: '0.85rem',
								}}>
								<div
									style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span style={{ color: 'var(--text-muted)' }}>Contestant</span>
									<strong>{successDetails.contestantName}</strong>
								</div>
								<div
									style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span style={{ color: 'var(--text-muted)' }}>
										Votes Credited
									</span>
									<span
										style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>
										{successDetails.votesCount} Votes
									</span>
								</div>
								<div
									style={{ display: 'flex', justifyContent: 'space-between' }}>
									<span style={{ color: 'var(--text-muted)' }}>
										Amount Paid
									</span>
									<strong>₦{successDetails.amount.toLocaleString()}</strong>
								</div>
								<div
									style={{
										borderTop: '1px solid var(--border-glass)',
										marginTop: '8px',
										paddingTop: '8px',
										display: 'flex',
										justifyContent: 'space-between',
										fontFamily: 'monospace',
										color: 'var(--text-muted)',
									}}>
									<span>Reference:</span>
									<span>{successDetails.reference.slice(0, 18)}...</span>
								</div>
							</div>

							<button
								className='btn btn-primary'
								style={{ width: '100%', marginTop: '30px' }}
								onClick={() => setShowSuccessModal(false)}>
								Close & Return
							</button>
						</div>
					</div>
				</div>
			)}
		</div>
	);
}

function ContestantCard({ contestant, onVote }) {
	return (
		<div
			className='contestant-card glass-panel'
			onClick={() => onVote(contestant)}
			style={{ cursor: 'pointer' }}>
			<div className='contestant-image-wrapper'>
				<img
					src={CONTESTANT_LOGO}
					alt={contestant.name}
					className='contestant-img'
				/>
			</div>

			<div className='contestant-info'>
				<div className='contestant-meta'>
					{contestant.categories?.name && (
						<span
							className='dash-pill'
							style={{
								marginBottom: '10px',
								display: 'inline-flex',
								borderColor: 'var(--accent-pink)',
								color: '#ffffff',
								background: 'rgba(236, 72, 153, 0.15)',
							}}>
							{contestant.categories.name}
						</span>
					)}
					<h3>{contestant.name}</h3>
				</div>

				<button
					className='btn btn-outline-glow'
					style={{ width: '100%', marginTop: '15px' }}
					onClick={(e) => {
						e.stopPropagation();
						onVote(contestant);
					}}>
					Vote For {(contestant?.name || 'Contestant').split(' ')[0]}
				</button>
			</div>
		</div>
	);
}
