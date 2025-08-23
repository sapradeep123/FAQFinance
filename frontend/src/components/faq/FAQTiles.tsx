import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { useToast } from '../../hooks/use-toast';
import { faqService, FAQ } from '../../services/faqService';
import { MagnifyingGlassIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import { cn } from '../../lib/cn';

const categoryOptions = [
  { value: 'BANKING', label: 'Banking', icon: '🏦', color: 'bg-blue-50 border-blue-200 hover:bg-blue-100' },
  { value: 'LOANS', label: 'Loans', icon: '💰', color: 'bg-green-50 border-green-200 hover:bg-green-100' },
  { value: 'INVESTMENTS', label: 'Investments', icon: '📈', color: 'bg-purple-50 border-purple-200 hover:bg-purple-100' },
  { value: 'TAX', label: 'Tax', icon: '📊', color: 'bg-orange-50 border-orange-200 hover:bg-orange-100' },
  { value: 'CARDS', label: 'Cards', icon: '💳', color: 'bg-pink-50 border-pink-200 hover:bg-pink-100' },
  { value: 'GENERAL', label: 'General', icon: '❓', color: 'bg-gray-50 border-gray-200 hover:bg-gray-100' }
];

interface FAQTilesProps {
  onFAQSelect?: (faq: FAQ) => void;
  className?: string;
  showSearch?: boolean;
  maxItems?: number;
}

export function FAQTiles({ onFAQSelect, className, showSearch = true, maxItems = 12 }: FAQTilesProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedFAQ, setSelectedFAQ] = useState<FAQ | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFAQs();
  }, []);

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
      toast({
        title: 'Error',
        description: 'Failed to load FAQs',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFAQClick = (faq: FAQ) => {
    if (onFAQSelect) {
      onFAQSelect(faq);
    } else {
      setSelectedFAQ(faq);
      setIsDialogOpen(true);
    }
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = !searchQuery || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (() => {
        if (!faq.keywords) return false;
        const keywordsArray = Array.isArray(faq.keywords) 
          ? faq.keywords 
          : (typeof faq.keywords === 'string' && faq.keywords.trim()) 
            ? faq.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
            : [];
        return keywordsArray.some(keyword =>
          keyword.toLowerCase().includes(searchQuery.toLowerCase())
        );
      })();
    
    const matchesCategory = selectedCategory === 'ALL' || faq.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  }).slice(0, maxItems);

  const getCategoryOption = (category: string) => {
    return categoryOptions.find(opt => opt.value === category) || categoryOptions[5]; // Default to General
  };

  const getFAQsByCategory = () => {
    const categories = categoryOptions.map(cat => ({
      ...cat,
      faqs: filteredFaqs.filter(faq => faq.category === cat.value)
    })).filter(cat => cat.faqs.length > 0);
    
    return categories;
  };

  if (loading) {
    return (
      <div className={cn('space-y-6', className)}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-20"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-full"></div>
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={cn('space-y-6', className)}>
      {/* Header */}
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold text-gray-900">Frequently Asked Questions</h2>
        <p className="text-gray-600">Find quick answers to common financial questions</p>
      </div>

      {/* Search and Filter */}
      {showSearch && (
        <div className="flex flex-col sm:flex-row gap-4 max-w-2xl mx-auto">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search FAQs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full sm:w-48">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              {categoryOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  <span className="flex items-center gap-2">
                    <span>{option.icon}</span>
                    <span>{option.label}</span>
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* FAQ Tiles */}
      {selectedCategory === 'ALL' ? (
        // Show by category when viewing all
        <div className="space-y-8">
          {getFAQsByCategory().map(category => (
            <div key={category.value} className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="text-2xl">{category.icon}</span>
                <h3 className="text-xl font-semibold text-gray-900">{category.label}</h3>
                <Badge variant="secondary" className="ml-2">
                  {category.faqs.length} {category.faqs.length === 1 ? 'question' : 'questions'}
                </Badge>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {category.faqs.map((faq) => {
                  const categoryOption = getCategoryOption(faq.category);
                  return (
                    <Card 
                      key={faq.id} 
                      className={cn(
                        'cursor-pointer transition-all duration-200 hover:shadow-md border-2',
                        categoryOption.color
                      )}
                      onClick={() => handleFAQClick(faq)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-2 mb-3">
                          <div className="flex items-center gap-2">
                            <span className="text-lg">{categoryOption.icon}</span>
                            <Badge variant="outline" className="text-xs">
                              {categoryOption.label}
                            </Badge>
                          </div>
                          <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                        </div>
                        <h4 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm leading-tight">
                          {faq.question}
                        </h4>
                        <p className="text-xs text-gray-600 line-clamp-2">
                          {faq.answer}
                        </p>
                        {faq.keywords && faq.keywords.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1">
                            {faq.keywords.slice(0, 2).map((keyword, index) => (
                              <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">
                                {keyword}
                              </Badge>
                            ))}
                            {faq.keywords.length > 2 && (
                              <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                                +{faq.keywords.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      ) : (
        // Show filtered results in a grid
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredFaqs.map((faq) => {
            const categoryOption = getCategoryOption(faq.category);
            return (
              <Card 
                key={faq.id} 
                className={cn(
                  'cursor-pointer transition-all duration-200 hover:shadow-md border-2',
                  categoryOption.color
                )}
                onClick={() => handleFAQClick(faq)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{categoryOption.icon}</span>
                      <Badge variant="outline" className="text-xs">
                        {categoryOption.label}
                      </Badge>
                    </div>
                    <ChevronRightIcon className="h-4 w-4 text-gray-400 flex-shrink-0" />
                  </div>
                  <h4 className="font-medium text-gray-900 mb-2 line-clamp-2 text-sm leading-tight">
                    {faq.question}
                  </h4>
                  <p className="text-xs text-gray-600 line-clamp-2">
                    {faq.answer}
                  </p>
                  {faq.keywords && faq.keywords.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {faq.keywords.slice(0, 2).map((keyword, index) => (
                        <Badge key={index} variant="secondary" className="text-xs px-1.5 py-0.5">
                          {keyword}
                        </Badge>
                      ))}
                      {faq.keywords.length > 2 && (
                        <Badge variant="secondary" className="text-xs px-1.5 py-0.5">
                          +{faq.keywords.length - 2}
                        </Badge>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* No Results */}
      {filteredFaqs.length === 0 && !loading && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <MagnifyingGlassIcon className="h-12 w-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No FAQs found</h3>
          <p className="text-gray-600 mb-4">
            {searchQuery || selectedCategory !== 'ALL' 
              ? 'Try adjusting your search or filter criteria.' 
              : 'No FAQs are currently available.'}
          </p>
          {(searchQuery || selectedCategory !== 'ALL') && (
            <Button 
              variant="outline" 
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
            >
              Clear filters
            </Button>
          )}
        </div>
      )}

      {/* FAQ Detail Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedFAQ && (
                <>
                  <span className="text-lg">{getCategoryOption(selectedFAQ.category).icon}</span>
                  <span>{selectedFAQ.question}</span>
                </>
              )}
            </DialogTitle>
          </DialogHeader>
          {selectedFAQ && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{getCategoryOption(selectedFAQ.category).label}</Badge>
                {selectedFAQ.keywords && selectedFAQ.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedFAQ.keywords.map((keyword, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="prose prose-sm max-w-none">
                <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                  {selectedFAQ.answer}
                </p>
              </div>
              
              <div className="flex justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default FAQTiles;