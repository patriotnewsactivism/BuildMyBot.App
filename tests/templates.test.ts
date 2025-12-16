import { describe, expect, it } from 'vitest';
import { filterTemplates, collectTemplateTags } from '../utils/templates';
import { MarketplaceTemplate } from '../types';

const templates: MarketplaceTemplate[] = [
  {
    id: '1',
    name: 'Real Estate Pro',
    category: 'Real Estate',
    description: 'Helps schedule showings and qualify buyers.',
    price: 0,
    installCount: 120,
    rating: 4.8,
    featured: true,
    botConfig: {},
    tags: ['Scheduling', 'Lead Gen'],
  },
  {
    id: '2',
    name: 'Dental Front Desk',
    category: 'Healthcare',
    description: 'Books appointments and handles emergencies.',
    price: 29,
    installCount: 90,
    rating: 4.7,
    featured: false,
    botConfig: {},
    tags: ['Healthcare', 'Booking'],
  },
  {
    id: '3',
    name: 'E-commerce Assistant',
    category: 'Retail',
    description: 'Guides shoppers and tracks orders.',
    price: 19,
    installCount: 200,
    rating: 4.6,
    featured: false,
    botConfig: {},
    tags: ['Support', 'Logistics'],
  },
];

describe('collectTemplateTags', () => {
  it('returns a sorted list of unique tags', () => {
    const tags = collectTemplateTags(templates);
    expect(tags).toEqual(['Booking', 'Healthcare', 'Lead Gen', 'Logistics', 'Scheduling', 'Support']);
  });
});

describe('filterTemplates', () => {
  it('filters by category and search', () => {
    const result = filterTemplates(templates, {
      category: 'Real Estate',
      searchTerm: 'schedule',
      priceFilter: 'all',
      selectedTags: [],
      sortBy: 'popular',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('filters by price and tags', () => {
    const result = filterTemplates(templates, {
      category: 'All',
      searchTerm: '',
      priceFilter: 'free',
      selectedTags: ['Scheduling'],
      sortBy: 'popular',
    });

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('1');
  });

  it('sorts by rating when requested', () => {
    const result = filterTemplates(templates, {
      category: 'All',
      searchTerm: '',
      priceFilter: 'all',
      selectedTags: [],
      sortBy: 'rating',
    });

    expect(result[0].id).toBe('1');
    expect(result[1].id).toBe('2');
  });
});
