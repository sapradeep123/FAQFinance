import { API_BASE_URL } from '../config/clientEnv';
import { getAuthHeaders } from '../lib/auth';

export interface Category {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const categoryService = {
  async list(): Promise<Category[]> {
    const res = await fetch(`${API_BASE_URL}/faq/categories/list`, {
      headers: getAuthHeaders()
    });
    if (!res.ok) throw new Error('Failed to load categories');
    const json = await res.json();
    return json.data?.categories || [];
  },

  async create(payload: { name: string; sort_order?: number }): Promise<Category> {
    const res = await fetch(`${API_BASE_URL}/faq/categories`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to create category');
    return json.data.category as Category;
  },

  async update(id: string, payload: Partial<{ name: string; sort_order: number; is_active: boolean }>): Promise<Category> {
    const res = await fetch(`${API_BASE_URL}/faq/categories/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to update category');
    return json.data.category as Category;
  },

  async remove(id: string): Promise<void> {
    const res = await fetch(`${API_BASE_URL}/faq/categories/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders()
    });
    const json = await res.json();
    if (!res.ok) throw new Error(json.message || 'Failed to delete category');
  }
};

export default categoryService;


