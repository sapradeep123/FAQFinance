import { API_BASE_URL } from '../config/clientEnv';

export interface FAQ {
  id: string;
  category: 'BANKING' | 'LOANS' | 'INVESTMENTS' | 'TAX' | 'CARDS' | 'GENERAL';
  question: string;
  answer: string;
  keywords?: string[];
  status: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
  sort_order: number;
  view_count: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface FAQCategory {
  category: string;
  total_count: number;
  active_count: number;
}

export interface FAQResponse {
  success: boolean;
  data: {
    faqs: FAQ[];
    pagination?: {
      limit: number;
      offset: number;
      hasMore: boolean;
    };
    filters?: {
      category?: string;
      status?: string;
    };
  };
}

export interface FAQSearchResponse {
  success: boolean;
  data: {
    faqs: FAQ[];
    query: string;
    category?: string;
    limit: number;
  };
}

export interface FAQCategoriesResponse {
  success: boolean;
  data: {
    categories: FAQCategory[];
  };
}

export interface CreateFAQRequest {
  category: 'BANKING' | 'LOANS' | 'INVESTMENTS' | 'TAX' | 'CARDS' | 'GENERAL';
  question: string;
  answer: string;
  keywords?: string;
  sortOrder?: number;
  status?: 'ACTIVE' | 'INACTIVE' | 'DRAFT';
}

export interface UpdateFAQRequest extends Partial<CreateFAQRequest> {}

class FAQService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    };
  }

  // Public FAQ endpoints
  async getFAQs(params?: {
    category?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<FAQResponse> {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.append('category', params.category);
    if (params?.status) searchParams.append('status', params.status);
    if (params?.limit) searchParams.append('limit', params.limit.toString());
    if (params?.offset) searchParams.append('offset', params.offset.toString());

    const response = await fetch(`${API_BASE_URL}/api/faq?${searchParams}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch FAQs: ${response.statusText}`);
    }

    return response.json();
  }

  async searchFAQs(query: string, category?: string, limit?: number): Promise<FAQSearchResponse> {
    const searchParams = new URLSearchParams({ q: query });
    if (category) searchParams.append('category', category);
    if (limit) searchParams.append('limit', limit.toString());

    const response = await fetch(`${API_BASE_URL}/api/faq/search?${searchParams}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to search FAQs: ${response.statusText}`);
    }

    return response.json();
  }

  async getCategories(): Promise<FAQCategoriesResponse> {
    const response = await fetch(`${API_BASE_URL}/api/faq/categories`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch FAQ categories: ${response.statusText}`);
    }

    return response.json();
  }

  async getFAQById(id: string): Promise<{ success: boolean; data: { faq: FAQ } }> {
    const response = await fetch(`${API_BASE_URL}/api/faq/${id}`, {
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch FAQ: ${response.statusText}`);
    }

    return response.json();
  }

  // Admin-only FAQ endpoints
  async createFAQ(faqData: CreateFAQRequest): Promise<{ success: boolean; message: string; data: { faq: FAQ } }> {
    const response = await fetch(`${API_BASE_URL}/api/faq`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(faqData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to create FAQ: ${response.statusText}`);
    }

    return response.json();
  }

  async updateFAQ(id: string, faqData: UpdateFAQRequest): Promise<{ success: boolean; message: string; data: { faq: FAQ } }> {
    const response = await fetch(`${API_BASE_URL}/api/faq/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(faqData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to update FAQ: ${response.statusText}`);
    }

    return response.json();
  }

  async deleteFAQ(id: string): Promise<{ success: boolean; message: string }> {
    const response = await fetch(`${API_BASE_URL}/api/faq/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders()
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || `Failed to delete FAQ: ${response.statusText}`);
    }

    return response.json();
  }
}

export const faqService = new FAQService();
export default faqService;