import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SearchBar } from '../src/components/email/SearchBar';

describe('SearchBar Component', () => {
  it('renders search input with placeholder and responds to change', () => {
    const handleChange = vi.fn();
    render(
      <SearchBar
        value=""
        onChange={handleChange}
        isLoading={false}
        totalResults={0}
        isSearching={false}
      />
    );

    const input = screen.getByPlaceholderText(/Search subject, body, sender with Elasticsearch/i);
    expect(input).toBeInTheDocument();

    fireEvent.change(input, { target: { value: 'demo request' } });
    expect(handleChange).toHaveBeenCalledWith('demo request');
  });

  it('displays clear button when value is present and clears on click', () => {
    const handleChange = vi.fn();
    render(
      <SearchBar
        value="demo"
        onChange={handleChange}
        isLoading={false}
        totalResults={5}
        isSearching={true}
      />
    );

    const clearBtn = screen.getByTitle('Clear search');
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(handleChange).toHaveBeenCalledWith('');
  });

  it('displays search query feedback and hit count when isSearching is true', () => {
    render(
      <SearchBar
        value="pricing"
        onChange={vi.fn()}
        isLoading={false}
        totalResults={12}
        isSearching={true}
      />
    );

    expect(screen.getByText(/"pricing"/i)).toBeInTheDocument();
    expect(screen.getByText('12 hits')).toBeInTheDocument();
  });
});
