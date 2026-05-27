import { useState, useRef, useEffect } from 'react';

/**
 * CategoryDropdown – a custom, responsive dropdown for category selection.
 * Props:
 *   - categories: array of category objects { id, name }
 *   - selected: currently selected category id or 'All'
 *   - onSelect: callback(selectedId) when a selection is made
 */
export default function CategoryDropdown({ categories = [], selected, onSelect }) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOpen = () => setOpen((prev) => !prev);

  const handleSelect = (value) => {
    onSelect(value);
    setOpen(false);
  };

  return (
    <div className="category-dropdown" ref={dropdownRef}>
      {/* Toggle button */}
      <button
        type="button"
        className="dropdown-toggle"
        onClick={toggleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        {selected === 'All' ? 'All Categories' : categories.find((c) => c.id === selected)?.name || 'Select'}
        <span style={{ marginLeft: '8px' }}>{open ? '▲' : '▼'}</span>
      </button>

      {/* Options list */}
      {open && (
        <ul
          className="dropdown-list"
          role="listbox"
          tabIndex={-1}
        >
          <li
            className={`dropdown-item ${selected === 'All' ? 'selected' : ''}`}
            onClick={() => handleSelect('All')}
          >
            All Categories
          </li>
          {categories.map((cat) => (
            <li
              key={cat.id}
              className={`dropdown-item ${selected === cat.id ? 'selected' : ''}`}
              onClick={() => handleSelect(cat.id)}
            >
              {cat.name}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
