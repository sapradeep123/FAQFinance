import { useState, useEffect } from 'react'
import { ChevronDown, ChevronRight, HelpCircle, Search } from 'lucide-react'
import { Button } from '../ui/button'
import { Input } from '../ui/input'
import { useToast } from '../../hooks/use-toast'
import { cn } from '../../lib/cn'
import { faqService, FAQ } from '../../services/faqService'

interface SimpleFaqSidebarProps {
  onFAQSelect?: (faq: FAQ) => void
}

const categoryOptions = [
  { value: 'BANKING', label: 'Banking', icon: '🏦' },
  { value: 'LOANS', label: 'Loans', icon: '💰' },
  { value: 'INVESTMENTS', label: 'Investments', icon: '📈' },
  { value: 'TAX', label: 'Tax', icon: '📊' },
  { value: 'CARDS', label: 'Cards', icon: '💳' },
  { value: 'GENERAL', label: 'General', icon: '❓' }
]

export function SimpleFaqSidebar({ onFAQSelect }: SimpleFaqSidebarProps) {
  const [faqs, setFaqs] = useState<FAQ[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedCategories, setExpandedCategories] = useState<string[]>(['BANKING', 'INVESTMENTS'])
  const { toast } = useToast()

  useEffect(() => {
    loadFAQs()
  }, [])

  const loadFAQs = async () => {
    try {
      setLoading(true)
      const response = await faqService.getFAQs({ 
        status: 'ACTIVE',
        limit: 50
      })
      setFaqs(response.data.faqs)
    } catch (error) {
      console.error('Failed to load FAQs:', error)
      toast({
        title: 'Error',
        description: 'Failed to load FAQs',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleCategory = (categoryValue: string) => {
    setExpandedCategories(prev => 
      prev.includes(categoryValue)
        ? prev.filter(c => c !== categoryValue)
        : [...prev, categoryValue]
    )
  }

  const handleFAQClick = (faq: FAQ) => {
    if (onFAQSelect) {
      onFAQSelect(faq)
      toast({
        title: 'FAQ Added',
        description: 'The FAQ has been added to your conversation.'
      })
    }
  }

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
      })()
    return matchesSearch
  })

  const getFAQsByCategory = () => {
    return categoryOptions.map(category => ({
      ...category,
      faqs: filteredFaqs.filter(faq => faq.category === category.value)
    })).filter(category => category.faqs.length > 0)
  }

  if (loading) {
    return (
      <div className="h-full flex flex-col">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle className="h-5 w-5 text-primary" />
            <h2 className="font-semibold text-foreground">Finance FAQ</h2>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
            <p className="text-sm text-muted-foreground">Loading FAQs...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2 mb-3">
          <HelpCircle className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">Finance FAQ</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          Click any question to add it to your chat
        </p>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search FAQs..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 text-sm"
          />
        </div>
      </div>

      {/* Categories and FAQs */}
      <div className="flex-1 overflow-y-auto p-2">
        {getFAQsByCategory().map((category) => {
          const isExpanded = expandedCategories.includes(category.value)
          
          return (
            <div key={category.value} className="mb-2">
              {/* Category Header */}
              <Button
                variant="ghost"
                className="w-full justify-start p-2 h-auto"
                onClick={() => toggleCategory(category.value)}
              >
                <div className="flex items-center gap-2 w-full">
                  {isExpanded ? (
                    <ChevronDown className="h-4 w-4" />
                  ) : (
                    <ChevronRight className="h-4 w-4" />
                  )}
                  <span className="text-lg">{category.icon}</span>
                  <span className="font-medium">{category.label}</span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {category.faqs.length}
                  </span>
                </div>
              </Button>

              {/* FAQs */}
              {isExpanded && (
                <div className="ml-6 mt-1 space-y-1">
                  {category.faqs.map((faq) => (
                    <Button
                      key={faq.id}
                      variant="ghost"
                      className={cn(
                        "w-full justify-start p-2 h-auto text-left",
                        "hover:bg-accent hover:text-accent-foreground",
                        "text-sm text-muted-foreground hover:text-foreground"
                      )}
                      onClick={() => handleFAQClick(faq)}
                    >
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
                        <span className="text-left leading-relaxed">
                          {faq.question}
                        </span>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </div>
          )
        })}
        
        {/* No Results */}
        {getFAQsByCategory().length === 0 && (
          <div className="text-center py-8">
            <div className="text-muted-foreground mb-2">
              <HelpCircle className="h-8 w-8 mx-auto mb-2 opacity-50" />
            </div>
            <p className="text-sm text-muted-foreground">
              {searchQuery ? 'No FAQs found matching your search.' : 'No FAQs available.'}
            </p>
            {searchQuery && (
              <Button 
                variant="outline" 
                size="sm"
                className="mt-2"
                onClick={() => setSearchQuery('')}
              >
                Clear search
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}