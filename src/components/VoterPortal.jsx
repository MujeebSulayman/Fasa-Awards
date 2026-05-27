import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import { 
  Search, 
  Award, 
  ThumbsUp, 
  X, 
  CheckCircle, 
  Check,
  AlertCircle
} from 'lucide-react';

const createTransactionReference = () =>
  `VOTE-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;
const CONTESTANT_LOGO = '/logo.jpg';

export default function VoterPortal() {
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

      // Fetch Contestants
      const { data: conData, error: conError } = await supabase
        .from('contestants')
        .select('*, categories(name)')
        .order('votes_count', { ascending: false });
        
      if (conError) throw conError;
      setContestants(conData || []);

    } catch (error) {
      console.error('Error fetching data:', error);
      showToast('Unable to load contestants right now. Please try again later.', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchData();
  }, [fetchData]);

  const handleOpenVoteModal = (contestant) => {
    setVotingContestant(contestant);
    setVotesCount(5); // Default to 5 votes
  };

  const handleCloseVoteModal = () => {
    if (isProcessingPayment) return;
    setVotingContestant(null);
  };

  const handlePaystackPayment = () => {
    if (votesCount < 1) {
      showToast('You must purchase at least 1 vote.', 'error');
      return;
    }

    const paystackPublicKey = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY;
    if (!paystackPublicKey) {
      showToast('Payment is not available right now. Please try again later.', 'error');
      return;
    }

    const totalAmount = votesCount * 100; // 100 Naira per vote
    const amountInKobo = totalAmount * 100; // Paystack takes amount in kobo

    if (!window.PaystackPop) {
      showToast('Payment service failed to load. Please refresh and try again.', 'error');
      return;
    }

    setIsProcessingPayment(true);

    const transactionReference = createTransactionReference();
    const payerEmail = `anonymous+${transactionReference}@fasa.local`;

    const handler = window.PaystackPop.setup({
      key: paystackPublicKey,
      email: payerEmail,
      amount: amountInKobo,
      currency: 'NGN',
      ref: transactionReference,
      callback: async (response) => {
        // Payment successful - record vote
        await handleRecordVote(
          votingContestant.id,
          payerEmail,
          response.reference,
          votesCount,
          totalAmount
        );
      },
      onClose: () => {
        setIsProcessingPayment(false);
        showToast('Payment cancelled by user.', 'error');
      }
    });

    handler.openIframe();
  };

  const handleRecordVote = async (contestantId, email, reference, votes, amount) => {
    try {
      // Record vote (secure RPC)
      const { data, error } = await supabase.rpc('record_vote', {
        p_contestant_id: contestantId,
        p_email: email,
        p_reference: reference,
        p_votes_count: votes,
        p_amount: amount
      });

      if (error) throw error;

      if (data && data.success) {
        // Success
        setSuccessDetails({
          contestantName: votingContestant.name,
          votesCount: votes,
          amount: amount,
          reference: reference,
          email: email
        });
        
        setVotingContestant(null);
        setShowSuccessModal(true);
        showToast('Vote cast successfully!', 'success');
        
        // Refresh Contestants data to show updated votes counts
        fetchData();
      } else {
        throw new Error(data?.message || 'Failed to record transaction log.');
      }
    } catch (error) {
      console.error('Error logging vote:', error);
      showToast('Payment was completed, but we could not confirm your vote. Please contact support with your reference.', 'error');
    } finally {
      setIsProcessingPayment(false);
    }
  };

  // Filter contestants based on search query and category tab
  const filteredContestants = contestants.filter(con => {
    const matchesSearch = con.name.toLowerCase().includes(searchQuery.toLowerCase());
      
    const matchesCategory = selectedCategoryFilter === 'All' || con.category_id === selectedCategoryFilter;
    
    return matchesSearch && matchesCategory;
  });

  // Group contestants by category for section layout (when viewing "All")
  const getContestantsByCategory = (catId) => {
    return filteredContestants.filter(c => c.category_id === catId);
  };

  return (
    <div className="app-container">
      {/* Toast Notification */}
      {toast && (
        <div className={`toast ${toast.type === 'error' ? 'toast-error' : 'toast-success'}`}>
          {toast.type === 'error' ? <AlertCircle size={20} /> : <CheckCircle size={20} />}
          <span>{toast.message}</span>
        </div>
      )}

      {/* Navigation Header */}
      <nav className="navbar">
        <a href="#" className="nav-brand" onClick={(e) => { e.preventDefault(); fetchData(); }}>
          <img src="/logo.jpg" alt="FASA logo" className="nav-logo" />
        </a>
      </nav>

      {/* Main Container */}
      <main className="main-content">
        {/* Hero Banner */}
        <section className="hero-section">
          <h1 className="hero-title">Support Your Favorites</h1>
          <p className="hero-subtitle">
            Cast your votes securely. Each vote is ₦100. 
            Vote as many times as you like to push your favorite contestant to the top!
          </p>
        </section>

        {/* Search and Filters */}
        <div className="search-filter-container">
          <div className="search-wrapper">
            <Search className="search-icon" size={20} />
            <input 
              type="text" 
              className="input-control" 
              placeholder="Search contestants by name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button 
              className={`shortcut-btn ${selectedCategoryFilter === 'All' ? 'btn-primary' : ''}`}
              style={{ background: selectedCategoryFilter === 'All' ? undefined : 'rgba(255,255,255,0.05)' }}
              onClick={() => setSelectedCategoryFilter('All')}
            >
              All Categories
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                className={`shortcut-btn ${selectedCategoryFilter === cat.id ? 'btn-primary' : ''}`}
                style={{ background: selectedCategoryFilter === cat.id ? undefined : 'rgba(255,255,255,0.05)' }}
                onClick={() => setSelectedCategoryFilter(cat.id)}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Categories/Contestants Grid */}
        {loading ? (
          <div className="page-loader">
            <div className="spinner"></div>
            <p>Loading contestants...</p>
          </div>
        ) : filteredContestants.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-muted)' }}>
            <Award size={48} style={{ marginBottom: '15px', strokeWidth: 1 }} />
            <h3>No contestants found</h3>
            <p>Try resetting filters or searching for another keyword.</p>
          </div>
        ) : (
          <div className="categories-container">
            {/* If a specific category is selected, render its cards */}
            {selectedCategoryFilter !== 'All' ? (
              <div className="category-block">
                <div className="category-header">
                  <h2>{categories.find(c => c.id === selectedCategoryFilter)?.name}</h2>
                  <p>{categories.find(c => c.id === selectedCategoryFilter)?.description}</p>
                </div>
                <div className="contestants-grid">
                  {filteredContestants.map(con => (
                    <ContestantCard key={con.id} contestant={con} onVote={handleOpenVoteModal} />
                  ))}
                </div>
              </div>
            ) : (
              // If "All" categories is selected, group by categories that have contestants matching filters
              categories.map(cat => {
                const catContestants = getContestantsByCategory(cat.id);
                if (catContestants.length === 0) return null;
                return (
                  <div key={cat.id} className="category-block">
                    <div className="category-header">
                      <h2>{cat.name}</h2>
                      <p>{cat.description}</p>
                    </div>
                    <div className="contestants-grid">
                      {catContestants.map(con => (
                        <ContestantCard key={con.id} contestant={con} onVote={handleOpenVoteModal} />
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="footer">
        <p>&copy; {new Date().getFullYear()} Fasa Awards Portal.</p>
      </footer>

      {/* Vote Modal */}
      {votingContestant && (
        <div className="modal-overlay" onClick={handleCloseVoteModal}>
          <div className="modal-content glass-panel vote-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header vote-modal-header">
              <div>
                <h3 style={{ margin: 0 }}>Cast your vote</h3>
                <div className="vote-modal-subtitle">Choose quantity and confirm payment</div>
              </div>
              <button className="modal-close" onClick={handleCloseVoteModal} disabled={isProcessingPayment}>
                <X size={24} />
              </button>
            </div>
            <div className="modal-body">
              <div className="vote-modal-contestant">
                <div className="vote-modal-avatar">
                  <img src={CONTESTANT_LOGO} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <div>
                  <div className="vote-modal-name">{votingContestant.name}</div>
                  <div className="vote-modal-category">{votingContestant.categories?.name || 'Category'}</div>
                </div>
              </div>

              <div className="vote-qty">
                <div className="vote-qty-row">
                  <div>
                    <div className="vote-qty-label">Quantity</div>
                    <div className="vote-qty-help">Each vote costs ₦100</div>
                  </div>
                  <div className="vote-stepper">
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setVotesCount((v) => Math.max(1, v - 1))}
                      disabled={isProcessingPayment || votesCount <= 1}
                      aria-label="Decrease"
                    >
                      −
                    </button>
                    <div className="stepper-value">{votesCount}</div>
                    <button
                      type="button"
                      className="stepper-btn"
                      onClick={() => setVotesCount((v) => Math.min(100, v + 1))}
                      disabled={isProcessingPayment || votesCount >= 100}
                      aria-label="Increase"
                    >
                      +
                    </button>
                  </div>
                </div>

              {/* Preset buttons */}
              <div className="vote-shortcuts">
                {[1, 3, 5, 10, 20].map(val => (
                  <button
                    key={val}
                    type="button"
                    className="shortcut-btn"
                    style={{ background: votesCount === val ? 'var(--accent-purple)' : undefined }}
                    onClick={() => setVotesCount(val)}
                    disabled={isProcessingPayment}
                  >
                    {val}
                  </button>
                ))}
              </div>
              </div>

              {/* Cost Box */}
              <div className="vote-calculation-box">
                <span style={{ fontSize: '0.85rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Total
                </span>
                <span className="vote-price-display">₦{(votesCount * 100).toLocaleString()}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  Payment confirms your vote instantly
                </span>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '15px', marginTop: '25px' }}>
                <button 
                  className="btn btn-secondary" 
                  style={{ flex: 1 }} 
                  onClick={handleCloseVoteModal}
                  disabled={isProcessingPayment}
                >
                  Cancel
                </button>
                <button 
                  className="btn btn-primary" 
                  style={{ flex: 2 }}
                  onClick={handlePaystackPayment}
                  disabled={isProcessingPayment}
                >
                  {isProcessingPayment ? (
                    <>
                      <div className="spinner" style={{ width: '18px', height: '18px', borderTopColor: 'white' }}></div>
                      Connecting payment...
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
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && successDetails && (
        <div className="modal-overlay" onClick={() => setShowSuccessModal(false)}>
          <div className="modal-content glass-panel" style={{ textAlign: 'center' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3 style={{ width: '100%' }}>Thank You for Voting!</h3>
            </div>
            <div className="modal-body" style={{ padding: '35px 25px' }}>
              <div className="success-checkmark">
                <Check size={40} strokeWidth={3} />
              </div>
              
              <h2 style={{ fontSize: '1.6rem', marginBottom: '8px' }}>Payment Confirmed</h2>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', marginBottom: '25px' }}>
                We successfully cast {successDetails.votesCount} {successDetails.votesCount === 1 ? 'vote' : 'votes'} for <strong style={{ color: 'var(--text-white)' }}>{successDetails.contestantName}</strong>.
              </p>

              <div style={{ background: 'rgba(13, 9, 38, 0.6)', border: '1px solid var(--border-glass)', borderRadius: '12px', padding: '20px', textAlign: 'left', display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.85rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Contestant</span>
                  <strong>{successDetails.contestantName}</strong>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Votes Credited</span>
                  <span style={{ color: 'var(--accent-pink)', fontWeight: 600 }}>{successDetails.votesCount} Votes</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Amount Paid</span>
                  <strong>₦{successDetails.amount.toLocaleString()}</strong>
                </div>
                <div style={{ borderTop: '1px solid var(--border-glass)', marginTop: '8px', paddingTop: '8px', display: 'flex', justifyContent: 'space-between', fontFamily: 'monospace', color: 'var(--text-muted)' }}>
                  <span>Reference:</span>
                  <span>{successDetails.reference.slice(0, 18)}...</span>
                </div>
              </div>

              <button 
                className="btn btn-primary" 
                style={{ width: '100%', marginTop: '30px' }}
                onClick={() => setShowSuccessModal(false)}
              >
                Close & Return
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Contestant Card Component
function ContestantCard({ contestant, onVote }) {
  return (
    <div className="contestant-card glass-panel">
      <div className="contestant-image-wrapper">
        <img src={CONTESTANT_LOGO} alt={contestant.name} className="contestant-img" />
      </div>
      
      <div className="contestant-info">
        <div className="contestant-meta">
          <h3>{contestant.name}</h3>
        </div>
        
        <button 
          className="btn btn-outline-glow" 
          style={{ width: '100%', marginTop: '15px' }}
          onClick={() => onVote(contestant)}
        >
          Vote For {(contestant?.name || 'Contestant').split(' ')[0]}
        </button>
      </div>
    </div>
  );
}
