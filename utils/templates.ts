import { MarketplaceTemplate } from '../types';

export type TemplateFilters = {
  category: string;
  searchTerm: string;
  priceFilter: 'all' | 'free' | 'paid';
  selectedTags: string[];
  sortBy: 'popular' | 'rating' | 'newest';
};

export const collectTemplateTags = (templates: MarketplaceTemplate[]): string[] => {
  const tags = new Set<string>();
  templates.forEach((template) => {
    template.tags?.forEach((tag) => tags.add(tag));
  });
  return Array.from(tags).sort((a, b) => a.localeCompare(b));
};

export const filterTemplates = (
  templates: MarketplaceTemplate[],
  { category, searchTerm, priceFilter, selectedTags, sortBy }: TemplateFilters
): MarketplaceTemplate[] => {
  const query = searchTerm.trim().toLowerCase();

  const filtered = templates.filter((template) => {
    const matchesCategory =
      category === 'All' ||
      template.category === category ||
      (category === 'Featured' && template.featured);

    const matchesSearch =
      !query ||
      template.name.toLowerCase().includes(query) ||
      template.description.toLowerCase().includes(query);

    const matchesPrice =
      priceFilter === 'all' || (priceFilter === 'free' ? template.price === 0 : template.price > 0);

    const matchesTags =
      selectedTags.length === 0 ||
      (template.tags || []).some((tag) => selectedTags.includes(tag));

    return matchesCategory && matchesSearch && matchesPrice && matchesTags;
  });

  const sorter = (a: MarketplaceTemplate, b: MarketplaceTemplate) => {
    switch (sortBy) {
      case 'rating':
        return (b.rating ?? 0) - (a.rating ?? 0);
      case 'newest':
        return (b.installCount || 0) - (a.installCount || 0);
      default:
        return (b.installCount || 0) - (a.installCount || 0);
    }
  };

  return filtered.sort(sorter);
};
