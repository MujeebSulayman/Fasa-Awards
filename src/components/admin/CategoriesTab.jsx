import React, { useState } from 'react';
import { PlusCircle, Edit3, Trash2 } from 'lucide-react';
import { supabase } from '../../supabaseClient';

export default function CategoriesTab({
	categories,
	dataLoading,
	ShimmerLoader,
	loadAdminData,
	showToast
}) {
	const [categoryName, setCategoryName] = useState('');
	const [categoryDesc, setCategoryDesc] = useState('');
	const [submittingCategory, setSubmittingCategory] = useState(false);
	const [editingCategory, setEditingCategory] = useState(null);

	const handleCategorySubmit = async (e) => {
		e.preventDefault();
		if (!categoryName) return;

		setSubmittingCategory(true);
		try {
			if (editingCategory) {
				const { error } = await supabase
					.from('categories')
					.update({ name: categoryName, description: categoryDesc })
					.eq('id', editingCategory.id);

				if (error) throw error;
				showToast('Category updated successfully!');
			} else {
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
					<table className='dash-table'>
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
}
