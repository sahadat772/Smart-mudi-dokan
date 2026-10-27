import React, { useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  AlertTriangle,
  Edit2,
  Package,
  Layers,
  ArrowUpDown,
  Check,
} from 'lucide-react';
import { Product, ProductCategory, ProductUnit, UserRole } from '../../types';
import { Modal } from '../../components/common/Modal';

interface ProductsPageProps {
  products: Product[];
  currentRole: UserRole;
  onAddProduct: (product: Product) => void;
  onUpdateProduct: (product: Product) => void;
}

export const ProductsPage: React.FC<ProductsPageProps> = ({
  products,
  currentRole,
  onAddProduct,
  onUpdateProduct,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [isLowStockOnly, setIsLowStockOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    category: 'চাল ও ডাল' as ProductCategory,
    unit: 'কেজি' as ProductUnit,
    sku: '',
    barcode: '',
    costPrice: 0,
    sellingPrice: 0,
    stockQuantity: 0,
    lowStockThreshold: 10,
    shelfLocation: '',
  });

  const categories: ProductCategory[] = [
    'চাল ও ডাল',
    'তেল ও ঘি',
    'মসলা ও গুঁড়া',
    'বিস্কুট ও স্ন্যাক্স',
    'চা, কফি ও পানীয়',
    'সাবান ও প্রসাধন',
    'দুগ্ধজাত পণ্য ও ডিম',
    'পরিষ্কারক সামগ্রী',
    'অন্যান্য',
  ];

  const units: ProductUnit[] = [
    'কেজি',
    'গ্রাম',
    'লিটার',
    'মিলি',
    'প্যাকেট',
    'পিস',
    'ডজন',
    'বস্তা',
    'কার্টুন',
  ];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    const matchesCategory =
      selectedCategory === 'all' || p.category === selectedCategory;
    const matchesLowStock = !isLowStockOnly || p.stockQuantity <= p.lowStockThreshold;

    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const handleOpenAddModal = () => {
    setEditingProduct(null);
    setFormData({
      name: '',
      category: 'চাল ও ডাল',
      unit: 'কেজি',
      sku: `PROD-${Date.now().toString().slice(-4)}`,
      barcode: '',
      costPrice: 0,
      sellingPrice: 0,
      stockQuantity: 10,
      lowStockThreshold: 10,
      shelfLocation: '',
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (product: Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      category: product.category,
      unit: product.unit,
      sku: product.sku,
      barcode: product.barcode || '',
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      stockQuantity: product.stockQuantity,
      lowStockThreshold: product.lowStockThreshold,
      shelfLocation: product.shelfLocation || '',
    });
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    if (editingProduct) {
      onUpdateProduct({
        ...editingProduct,
        ...formData,
        updatedAt: '২০২৬-১০-২৭',
      });
    } else {
      onAddProduct({
        id: `prod-${Date.now()}`,
        ...formData,
        updatedAt: '২০২৬-১০-২৭',
      });
    }

    setIsModalOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Add Product Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            পণ্য ও স্টক তালিকা
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            দোকানের সকল পণ্য, ক্রয়মূল্য, বিক্রয়মূল্য ও বর্তমান ইনভেন্টরি
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors self-start sm:self-auto cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>নতুন পণ্য যুক্ত করুন</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          {/* Search box */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পণ্যের নাম, বারকোড বা SKU দিয়ে খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>

          {/* Category Dropdown */}
          <div className="w-full md:w-56 shrink-0">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full py-2 px-3 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="all">সব ক্যাটাগরি ({products.length})</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Low stock toggle */}
          <button
            onClick={() => setIsLowStockOnly(!isLowStockOnly)}
            className={`px-3 py-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0 ${
              isLowStockOnly
                ? 'bg-amber-100 text-amber-900 border-amber-300 font-semibold'
                : 'bg-slate-50 text-slate-600 border-slate-300 hover:bg-slate-100'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
            <span>শুধু স্বল্প স্টক</span>
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 text-[11px] border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-medium">পণ্যের নাম ও বিবরণ</th>
                <th className="px-4 py-3 font-medium">ক্যাটাগরি</th>
                <th className="px-4 py-3 font-medium text-center">একক</th>
                {currentRole === 'owner' && (
                  <th className="px-4 py-3 font-medium text-right text-indigo-900">
                    ক্রয়মূল্য (COGS)
                  </th>
                )}
                <th className="px-4 py-3 font-medium text-right">বিক্রয়মূল্য</th>
                <th className="px-4 py-3 font-medium text-center">বর্তমান স্টক</th>
                <th className="px-4 py-3 font-medium">অবস্থান</th>
                <th className="px-4 py-3 font-medium text-right">অ্যাকশন</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400">
                    কোন পণ্য পাওয়া যায়নি
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stockQuantity <= p.lowStockThreshold;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 text-sm">
                          {p.name}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          SKU: {p.sku} {p.barcode && `· বারকোড: ${p.barcode}`}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        <span className="text-slate-600 text-[11px]">
                          {p.category}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-center text-slate-600">
                        {p.unit}
                      </td>

                      {currentRole === 'owner' && (
                        <td className="px-4 py-3 text-right font-medium text-indigo-900 tabular-nums">
                          ৳{p.costPrice}
                        </td>
                      )}

                      <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                        ৳{p.sellingPrice}
                      </td>

                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-xs font-bold tabular-nums ${
                            isLow
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-emerald-50 text-emerald-800'
                          }`}
                        >
                          {isLow && <AlertTriangle className="w-3 h-3 text-rose-600" />}
                          {p.stockQuantity} {p.unit}
                        </span>
                      </td>

                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {p.shelfLocation || '—'}
                      </td>

                      <td className="px-4 py-3 text-right">
                        <button
                          onClick={() => handleOpenEditModal(p)}
                          className="p-1.5 text-slate-600 hover:text-emerald-700 hover:bg-slate-100 rounded transition-colors cursor-pointer"
                          title="সম্পাদনা করুন"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <span>মোট প্রদর্শিত পণ্য: {filteredProducts.length} টি</span>
          <span>
            {currentRole === 'employee' &&
              '* কর্মচারী মোডে ক্রয়মূল্য গোপন রাখা হয়েছে (মালিক মোডে সুইচ করে ক্রয়মূল্য দেখতে পারবেন)।'}
          </span>
        </div>
      </div>

      {/* Add / Edit Product Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingProduct ? 'পণ্য সম্পাদনা' : 'নতুন পণ্য যোগ করুন'}
        subtitle="মুদি দোকানের স্টক ও মূল্য তালিকা নির্ধারণ (Phase 1 UI)"
      >
        <form onSubmit={handleFormSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-700 mb-1">
              পণ্যের নাম *
            </label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              placeholder="যেমন: মিনিকেট চাল (৫ কেজি প্যাকেট)"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                ক্যাটাগরি
              </label>
              <select
                value={formData.category}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    category: e.target.value as ProductCategory,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                পরিমাপের একক (Unit)
              </label>
              <select
                value={formData.unit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    unit: e.target.value as ProductUnit,
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                ক্রয়মূল্য (টাকা / একক) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={formData.costPrice || ''}
                onChange={(e) =>
                  setFormData({ ...formData, costPrice: Number(e.target.value) })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="৳ যেমন: ৭০"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                বিক্রয়মূল্য (টাকা / একক) *
              </label>
              <input
                type="number"
                min="0"
                step="any"
                required
                value={formData.sellingPrice || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    sellingPrice: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="৳ যেমন: ৮০"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                বর্তমান স্টক পরিমাণ
              </label>
              <input
                type="number"
                min="0"
                value={formData.stockQuantity || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    stockQuantity: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="যেমন: ৫০"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                স্বল্প স্টকের অ্যালার্ট সীমা
              </label>
              <input
                type="number"
                min="1"
                value={formData.lowStockThreshold || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    lowStockThreshold: Number(e.target.value),
                  })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="যেমন: ১০"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-700 mb-1">
                SKU / কোড
              </label>
              <input
                type="text"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block font-medium text-slate-700 mb-1">
                দোকানের অবস্থান / তাক
              </label>
              <input
                type="text"
                value={formData.shelfLocation}
                onChange={(e) =>
                  setFormData({ ...formData, shelfLocation: e.target.value })
                }
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="যেমন: শেলফ A-3"
              />
            </div>
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-medium cursor-pointer"
            >
              বাতিল
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-xs cursor-pointer"
            >
              {editingProduct ? 'আপডেট করুন' : 'সংরক্ষণ করুন (ডেমো)'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
