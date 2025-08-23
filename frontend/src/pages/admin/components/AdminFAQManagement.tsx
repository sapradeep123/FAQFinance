import React, { useState, useEffect } from 'react';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';
import { Textarea } from '../../../components/ui/textarea';
import { Label } from '../../../components/ui/label';
import { useToast } from '../../../hooks/use-toast';
import { faqService, FAQ, CreateFAQRequest, UpdateFAQRequest } from '../../../services/faqService';
import { PlusIcon, PencilIcon, TrashIcon, MagnifyingGlassIcon, EyeIcon } from '@heroicons/react/24/outline';

const categoryOptions = [
  { value: 'BANKING', label: 'Banking', icon: '🏦' },
  { value: 'LOANS', label: 'Loans', icon: '💰' },
  { value: 'INVESTMENTS', label: 'Investments', icon: '📈' },
  { value: 'TAX', label: 'Tax', icon: '📊' },
  { value: 'CARDS', label: 'Cards', icon: '💳' },
  { value: 'GENERAL', label: 'General', icon: '❓' }
];

const statusOptions = [
  { value: 'ACTIVE', label: 'Active', color: 'bg-green-100 text-green-800' },
  { value: 'INACTIVE', label: 'Inactive', color: 'bg-red-100 text-red-800' },
  { value: 'DRAFT', label: 'Draft', color: 'bg-yellow-100 text-yellow-800' }
];

interface FAQFormData {
  category: string;
  question: string;
  answer: string;
  keywords: string;
  sortOrder: string;
  status: string;
}

const initialFormData: FAQFormData = {
  category: 'GENERAL',
  question: '',
  answer: '',
  keywords: '',
  sortOrder: '0',
  status: 'ACTIVE'
};

export function AdminFAQManagement() {
  const [faqs, setFaqs] = useState<FAQ[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isViewDialogOpen, setIsViewDialogOpen] = useState(false);
  const [editingFaq, setEditingFaq] = useState<FAQ | null>(null);
  const [viewingFaq, setViewingFaq] = useState<FAQ | null>(null);
  const [formData, setFormData] = useState<FAQFormData>(initialFormData);
  const [formErrors, setFormErrors] = useState<Partial<FAQFormData>>({});
  const { toast } = useToast();

  useEffect(() => {
    loadFAQs();
  }, []);

  const loadFAQs = async () => {
    try {
      setLoading(true);
      const response = await faqService.getFAQs({ 
        status: 'ALL',
        limit: 100 
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

  const validateForm = (data: FAQFormData): boolean => {
    const errors: Partial<FAQFormData> = {};

    if (!data.question.trim()) {
      errors.question = 'Question is required';
    } else if (data.question.length < 10) {
      errors.question = 'Question must be at least 10 characters';
    } else if (data.question.length > 500) {
      errors.question = 'Question must be less than 500 characters';
    }

    if (!data.answer.trim()) {
      errors.answer = 'Answer is required';
    } else if (data.answer.length < 10) {
      errors.answer = 'Answer must be at least 10 characters';
    } else if (data.answer.length > 2000) {
      errors.answer = 'Answer must be less than 2000 characters';
    }

    if (data.keywords && data.keywords.length > 500) {
      errors.keywords = 'Keywords must be less than 500 characters';
    }

    const sortOrder = parseInt(data.sortOrder);
    if (isNaN(sortOrder) || sortOrder < 0) {
      errors.sortOrder = 'Sort order must be a non-negative number';
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleCreateFAQ = async () => {
    if (!validateForm(formData)) return;

    try {
      const createData: CreateFAQRequest = {
        category: formData.category as any,
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        keywords: formData.keywords.trim() || undefined,
        sortOrder: parseInt(formData.sortOrder),
        status: formData.status as any
      };

      await faqService.createFAQ(createData);
      toast({
        title: 'Success',
        description: 'FAQ created successfully'
      });
      
      setIsCreateDialogOpen(false);
      setFormData(initialFormData);
      setFormErrors({});
      loadFAQs();
    } catch (error) {
      console.error('Failed to create FAQ:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create FAQ',
        variant: 'destructive'
      });
    }
  };

  const handleEditFAQ = async () => {
    if (!editingFaq || !validateForm(formData)) return;

    try {
      const updateData: UpdateFAQRequest = {
        category: formData.category as any,
        question: formData.question.trim(),
        answer: formData.answer.trim(),
        keywords: formData.keywords.trim() || undefined,
        sortOrder: parseInt(formData.sortOrder),
        status: formData.status as any
      };

      await faqService.updateFAQ(editingFaq.id, updateData);
      toast({
        title: 'Success',
        description: 'FAQ updated successfully'
      });
      
      setIsEditDialogOpen(false);
      setEditingFaq(null);
      setFormData(initialFormData);
      setFormErrors({});
      loadFAQs();
    } catch (error) {
      console.error('Failed to update FAQ:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to update FAQ',
        variant: 'destructive'
      });
    }
  };

  const handleDeleteFAQ = async (faq: FAQ) => {
    if (!confirm(`Are you sure you want to delete this FAQ: "${faq.question}"?`)) {
      return;
    }

    try {
      await faqService.deleteFAQ(faq.id);
      toast({
        title: 'Success',
        description: 'FAQ deleted successfully'
      });
      loadFAQs();
    } catch (error) {
      console.error('Failed to delete FAQ:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to delete FAQ',
        variant: 'destructive'
      });
    }
  };

  const openEditDialog = (faq: FAQ) => {
    setEditingFaq(faq);
    setFormData({
      category: faq.category,
      question: faq.question,
      answer: faq.answer,
      keywords: (() => {
        if (!faq.keywords) return '';
        if (Array.isArray(faq.keywords)) {
          return faq.keywords.join(', ');
        }
        return typeof faq.keywords === 'string' ? faq.keywords : '';
      })(),
      sortOrder: faq.sort_order.toString(),
      status: faq.status
    });
    setFormErrors({});
    setIsEditDialogOpen(true);
  };

  const openViewDialog = (faq: FAQ) => {
    setViewingFaq(faq);
    setIsViewDialogOpen(true);
  };

  const openCreateDialog = () => {
    setFormData(initialFormData);
    setFormErrors({});
    setIsCreateDialogOpen(true);
  };

  const filteredFaqs = faqs.filter(faq => {
    const matchesSearch = !searchQuery || 
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (() => {
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
    const matchesStatus = selectedStatus === 'ALL' || faq.status === selectedStatus;
    
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getCategoryIcon = (category: string) => {
    return categoryOptions.find(opt => opt.value === category)?.icon || '❓';
  };

  const getCategoryLabel = (category: string) => {
    return categoryOptions.find(opt => opt.value === category)?.label || category;
  };

  const getStatusBadge = (status: string) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return (
      <Badge className={statusOption?.color || 'bg-gray-100 text-gray-800'}>
        {statusOption?.label || status}
      </Badge>
    );
  };

  const renderFormFields = () => (
    <div className="space-y-4">
      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
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

      <div>
        <Label htmlFor="question">Question</Label>
        <Textarea
          id="question"
          value={formData.question}
          onChange={(e) => setFormData({...formData, question: e.target.value})}
          placeholder="Enter the FAQ question..."
          className={formErrors.question ? 'border-red-500' : ''}
          rows={2}
        />
        {formErrors.question && (
          <p className="text-sm text-red-500 mt-1">{formErrors.question}</p>
        )}
      </div>

      <div>
        <Label htmlFor="answer">Answer</Label>
        <Textarea
          id="answer"
          value={formData.answer}
          onChange={(e) => setFormData({...formData, answer: e.target.value})}
          placeholder="Enter the FAQ answer..."
          className={formErrors.answer ? 'border-red-500' : ''}
          rows={4}
        />
        {formErrors.answer && (
          <p className="text-sm text-red-500 mt-1">{formErrors.answer}</p>
        )}
      </div>

      <div>
        <Label htmlFor="keywords">Keywords (comma-separated)</Label>
        <Input
          id="keywords"
          value={formData.keywords}
          onChange={(e) => setFormData({...formData, keywords: e.target.value})}
          placeholder="keyword1, keyword2, keyword3"
          className={formErrors.keywords ? 'border-red-500' : ''}
        />
        {formErrors.keywords && (
          <p className="text-sm text-red-500 mt-1">{formErrors.keywords}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="sortOrder">Sort Order</Label>
          <Input
            id="sortOrder"
            type="number"
            min="0"
            value={formData.sortOrder}
            onChange={(e) => setFormData({...formData, sortOrder: e.target.value})}
            className={formErrors.sortOrder ? 'border-red-500' : ''}
          />
          {formErrors.sortOrder && (
            <p className="text-sm text-red-500 mt-1">{formErrors.sortOrder}</p>
          )}
        </div>

        <div>
          <Label htmlFor="status">Status</Label>
          <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {statusOptions.map(option => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-gray-200 h-16 rounded-lg mb-4"></div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">FAQ Management</h3>
          <p className="text-sm text-gray-600">Manage frequently asked questions</p>
        </div>
        <Button onClick={openCreateDialog} className="bg-blue-600 hover:bg-blue-700">
          <PlusIcon className="h-4 w-4 mr-2" />
          Add FAQ
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
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
        <Select value={selectedStatus} onValueChange={setSelectedStatus}>
          <SelectTrigger className="w-full sm:w-32">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All Status</SelectItem>
            {statusOptions.map(option => (
              <SelectItem key={option.value} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* FAQ List */}
      <div className="space-y-3">
        {filteredFaqs.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-gray-500">
              {searchQuery || selectedCategory !== 'ALL' || selectedStatus !== 'ALL' 
                ? 'No FAQs found matching your filters.' 
                : 'No FAQs available. Create your first FAQ to get started.'}
            </CardContent>
          </Card>
        ) : (
          filteredFaqs.map((faq) => (
            <Card key={faq.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-lg">{getCategoryIcon(faq.category)}</span>
                      <Badge variant="outline" className="text-xs">
                        {getCategoryLabel(faq.category)}
                      </Badge>
                      {getStatusBadge(faq.status)}
                      <span className="text-xs text-gray-500">Order: {faq.sort_order}</span>
                    </div>
                    <h4 className="font-medium text-gray-900 mb-1 line-clamp-2">
                      {faq.question}
                    </h4>
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {faq.answer}
                    </p>
                    {faq.keywords && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {(() => {
                          const keywordsArray = Array.isArray(faq.keywords) 
                            ? faq.keywords 
                            : (typeof faq.keywords === 'string' && faq.keywords.trim()) 
                              ? faq.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
                              : [];
                          
                          if (keywordsArray.length === 0) return null;
                          
                          return (
                            <>
                              {keywordsArray.slice(0, 3).map((keyword, index) => (
                                <Badge key={index} variant="secondary" className="text-xs">
                                  {keyword}
                                </Badge>
                              ))}
                              {keywordsArray.length > 3 && (
                                <Badge variant="secondary" className="text-xs">
                                  +{keywordsArray.length - 3} more
                                </Badge>
                              )}
                            </>
                          );
                        })()} 
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openViewDialog(faq)}
                    >
                      <EyeIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openEditDialog(faq)}
                    >
                      <PencilIcon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteFAQ(faq)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Create FAQ Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New FAQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {renderFormFields()}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFAQ} className="bg-blue-600 hover:bg-blue-700">
                Create FAQ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit FAQ Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit FAQ</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {renderFormFields()}
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleEditFAQ} className="bg-blue-600 hover:bg-blue-700">
                Update FAQ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* View FAQ Dialog */}
      <Dialog open={isViewDialogOpen} onOpenChange={setIsViewDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>View FAQ</DialogTitle>
          </DialogHeader>
          {viewingFaq && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">{getCategoryIcon(viewingFaq.category)}</span>
                <Badge variant="outline">{getCategoryLabel(viewingFaq.category)}</Badge>
                {getStatusBadge(viewingFaq.status)}
                <span className="text-sm text-gray-500">Order: {viewingFaq.sort_order}</span>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700">Question</Label>
                <p className="mt-1 text-gray-900">{viewingFaq.question}</p>
              </div>
              
              <div>
                <Label className="text-sm font-medium text-gray-700">Answer</Label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{viewingFaq.answer}</p>
              </div>
              
              {viewingFaq.keywords && (
                <div>
                  <Label className="text-sm font-medium text-gray-700">Keywords</Label>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {(() => {
                      const keywordsArray = Array.isArray(viewingFaq.keywords) 
                        ? viewingFaq.keywords 
                        : (typeof viewingFaq.keywords === 'string' && viewingFaq.keywords.trim()) 
                          ? viewingFaq.keywords.split(',').map(k => k.trim()).filter(k => k.length > 0)
                          : [];
                      
                      return keywordsArray.map((keyword, index) => (
                        <Badge key={index} variant="secondary">{keyword}</Badge>
                      ));
                    })()} 
                  </div>
                </div>
              )}
              
              <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <Label className="text-sm font-medium text-gray-700">Created</Label>
                  <p>{new Date(viewingFaq.created_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium text-gray-700">Updated</Label>
                  <p>{new Date(viewingFaq.updated_at).toLocaleString()}</p>
                </div>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => setIsViewDialogOpen(false)}>
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