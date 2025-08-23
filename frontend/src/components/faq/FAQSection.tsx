import React, { useState, useEffect } from 'react';
import { ChevronDownIcon, ChevronUpIcon, MagnifyingGlassIcon } from '@heroicons/react/24/outline';
import { faqService, FAQ, FAQCategory } from '../../services/faqService';
import { useToast } from '../../hooks/useToast';

interface FAQSectionProps {
  showSearch?: boolean;
  maxItems?: number;
  categories?: string[];
  className?: string;
}

const categoryLabels: Record<string, string> = {
  BANKING: 'Banking',
  LOANS: 'Loans',
  INVESTMENTS: 'Investments',
  TAX: 'Tax',
  CARDS: 'Cards',
  GENERAL: 'General'
};

const categoryIcons: Record<string, string> = {
  BANKING: '🏦',
  LOANS: '💰',
  INVESTMENTS: '📈',
  TAX: '📊',
  CARDS: '💳',
  GENERAL: '❓'
};

export default function FAQSection({ 
  showSearch = true, 
  maxItems = 10, 
  categories,
  className = '' 
}: FAQSectionProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [filteredFaqs, setFilteredFaqs] = useState<FAQ[]>([]);
  const [faqCategories, setFaqCategories] = useState<FAQCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToast();

  useEffect(() => {
    loadFAQs();
    loadCategories();
  }, []);

  useEffect(() => {
    filterFAQs();
  }, [faqs, selectedCategory, searchQuery, categories]);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const response = await faqService.getFAQs({ 
        status: 'ACTIVE',
        limit: maxItems * 2 // Load more to account for filtering
      });
      setFaqs(response.data.faqs);
    } catch (error) {
      console.error('Failed to load FAQs:', error);
      addToast('Failed to load FAQs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadCategories = async () => {
    try {
      const response = await faqService.getCategories();
      setFaqCategories(response.data.categories);
    } catch (error) {
      console.error('Failed to load FAQ categories:', error);
    }
  };

  const filterFAQs = () => {
    let filtered = faqs;

    // Filter by allowed categories if specified
    if (categories && categories.length > 0) {
      filtered = filtered.filter(faq => categories.includes(faq.category));
    }

    // Filter by selected category
    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(faq => faq.category === selectedCategory);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(faq => 
        faq.question.toLowerCase().includes(query) ||
        faq.answer.toLowerCase().includes(query) ||
        (faq.keywords && faq.keywords.some(keyword => 
          keyword.toLowerCase().includes(query)
        ))
      );
    }

    // Limit results
    filtered = filtered.slice(0, maxItems);

    setFilteredFaqs(filtered);
  };

  const handleSearch = async (query: string) => {
    if (query.trim().length < 2) {
      setSearchQuery('');
      return;
    }

    try {
      setLoading(true);
      const response = await faqService.searchFAQs(query, 
        selectedCategory !== 'ALL' ? selectedCategory : undefined,
        maxItems
      );
      setFilteredFaqs(response.data.faqs);
      setSearchQuery(query);
    } catch (error) {
      console.error('Failed to search FAQs:', error);
      addToast('Failed to search FAQs', 'error');
    } finally {
      setLoading(false);
    }
  };

  const toggleFaq = (faqId: string) => {
    setExpandedFaq(expandedFaq === faqId ? null : faqId);
  };

  const getAvailableCategories = () => {
    const availableCategories = categories 
      ? faqCategories.filter(cat => categories.includes(cat.category))
      : faqCategories;
    
    return availableCategories.filter(cat => cat.active_count > 0);
  };

  if (loading && faqs.length === 0) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-16 rounded-lg"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Frequently Asked Questions
        </h2>
        <p className="text-gray-600">
          Find answers to common questions about our financial services
        </p>
      </div>

      {/* Search */}
      {showSearch && (
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Search FAQs..."
            className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500"
            onChange={(e) => {
              const value = e.target.value;
              if (value.length === 0) {
                setSearchQuery('');
                loadFAQs();
              } else if (value.length >= 2) {
                handleSearch(value);
              }
            }}
          />
        </div>
      )}

      {/* Category Filter */}
      {getAvailableCategories().length > 1 && (
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-blue-100 text-blue-800 border border-blue-200'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
            }`}
          >
            All Categories
          </button>
          {getAvailableCategories().map((category) => (
            <button
              key={category.category}
              onClick={() => setSelectedCategory(category.category)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-colors flex items-center gap-1 ${
                selectedCategory === category.category
                  ? 'bg-blue-100 text-blue-800 border border-blue-200'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 border border-gray-200'
              }`}
            >
              <span>{categoryIcons[category.category]}</span>
              <span>{categoryLabels[category.category]}</span>
              <span className="text-xs opacity-75">({category.active_count})</span>
            </button>
          ))}
        </div>
      )}

      {/* FAQ List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            {searchQuery ? 'No FAQs found matching your search.' : 'No FAQs available.'}
          </div>
        ) : (
          filteredFaqs.map((faq) => (
            <div
              key={faq.id}
              className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
            >
              <button
                onClick={() => toggleFaq(faq.id)}
                className="w-full px-4 py-3 text-left bg-white hover:bg-gray-50 focus:outline-none focus:bg-gray-50 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <span className="text-lg">{categoryIcons[faq.category]}</span>
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900 text-sm">
                        {faq.question}
                      </h3>
                      <span className="text-xs text-gray-500 mt-1">
                        {categoryLabels[faq.category]}
                      </span>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    {expandedFaq === faq.id ? (
                      <ChevronUpIcon className="h-5 w-5 text-gray-400" />
                    ) : (
                      <ChevronDownIcon className="h-5 w-5 text-gray-400" />
                    )}
                  </div>
                </div>
              </button>
              
              {expandedFaq === faq.id && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                  <div className="pt-3 text-sm text-gray-700 leading-relaxed">
                    {faq.answer}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Load More */}
      {filteredFaqs.length === maxItems && (
        <div className="text-center">
          <button
            onClick={() => {
              // Implement load more functionality if needed
              addToast('Load more functionality coming soon', 'info');
            }}
            className="text-blue-600 hover:text-blue-800 font-medium text-sm"
          >
            View More FAQs
          </button>
        </div>
      )}
    </div>
  );
}