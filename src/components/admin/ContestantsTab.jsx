import React, { useState } from 'react';
import { Search, PlusCircle, Edit3, Trash2, Image as ImageIcon } from 'lucide-react';
import { supabase } from '../../supabaseClient';

const CONTESTANT_LOGO = '/awards.jpg';

export default function ContestantsTab({
	categories,
	contestants,
	dataLoading,
	ShimmerLoader,
	loadAdminData,
	showToast
}) {
	const [contestantSearch, setContestantSearch] = useState('');
	const [contestantCategoryFilter, setContestantCategoryFilter] = useState('all');

	const [contestantName, setContestantName] = useState('');
	const [contestantBio, setContestantBio] = useState('');
	const [contestantCategoryId, setContestantCategoryId] = useState('');
	const [contestantImageUrl, setContestantImageUrl] = useState('');
	const [contestantImageFile, setContestantImageFile] = useState(null);
	const [submittingContestant, setSubmittingContestant] = useState(false);
	const [editingContestant, setEditingContestant] = useState(null);

	const handleContestantSubmit = async (e) => {
		e.preventDefault();
		if (!contestantName || !contestantCategoryId) {
			showToast('Name and Category are required.', 'error');
			return;
		}

		setSubmittingContestant(true);
		try {
			let finalImageUrl = contestantImageUrl;

			if (contestantImageFile) {
				const fileExt = contestantImageFile.name.split('.').pop();
				const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
				const filePath = `${fileName}`;

				const { error: uploadError } = await supabase.storage
					.from('contestant-images')
					.upload(filePath, contestantImageFile);

				if (uploadError) {
					console.warn('Image bucket upload failed.', uploadError);
					showToast('Image bucket upload failed. Falling back to url.', 'error');
				} else {
					const {
						data: { publicUrl },
					} = supabase.storage.from('contestant-images').getPublicUrl(filePath);

					finalImageUrl = publicUrl;
				}
			}

			if (editingContestant) {
				const updateData = {
					name: contestantName,
					category_id: contestantCategoryId,
					bio: contestantBio,
				};
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
					background: 'var(--dash-panel-strong)',
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
						style={{ color: 'var(--accent-purple)' }}
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
					No contestants found. Add categories first, then add contestants.
				</p>
			) : (
				<>
					<div className='admin-toolbar' style={{ display: 'flex', gap: '12px', marginBottom: '16px', flexWrap: 'wrap' }}>
						<div className='dash-search' style={{ flex: 1 }}>
							<Search size={16} />
							<input
								className='input-control'
								style={{ border: 'none', background: 'transparent', padding: 0 }}
								placeholder='Search contestants...'
								value={contestantSearch}
								onChange={(e) => setContestantSearch(e.target.value)}
							/>
						</div>
						<select
							className='input-control'
							style={{ width: 'auto', minWidth: '200px' }}
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
						<table className='dash-table'>
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
														src={con.image_url || CONTESTANT_LOGO}
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
												<span className="dash-pill" style={{ color: 'var(--accent-purple)', background: 'rgba(139,92,246,0.1)', borderColor: 'transparent' }}>
													{con.categories?.name || 'Unassigned'}
												</span>
											</td>
											<td>
												<strong style={{ color: 'var(--accent-pink)' }}>
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
}
