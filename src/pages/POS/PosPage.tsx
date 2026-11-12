import React, { useState } from "react";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  CheckCircle,
  User,
  Banknote,
  Smartphone,
  Landmark,
  Percent,
  RotateCcw,
} from "lucide-react";
import {
  Product,
  CartItem,
  PaymentMethod,
  Sale,
  Customer,
  UserRole,
} from "../../types";
import { apiFetch } from "../../api/client";

interface PosPageProps {
  products: Product[];
  customers: Customer[];
  currentRole: UserRole;
  permissions?: {
    view: boolean;
    manage: boolean;
  };
  onCompleteSale: (
    sale: Sale,
    updatedProducts?: { id: string; stockQuantity: number }[],
  ) => void;
  shopName: string;
}

export const PosPage: React.FC<PosPageProps> = ({
  products,
  customers,
  currentRole,
  permissions,
  onCompleteSale,
  shopName,
}) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<PaymentMethod>("নগদ (Cash)");
  const [isMixedPayment, setIsMixedPayment] = useState(false);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [walkInName, setWalkInName] = useState<string>("");
  const [walkInPhone, setWalkInPhone] = useState<string>("");
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const categories = [
    "all",
    "চাল ও ডাল",
    "তেল ও ঘি",
    "মসলা ও গুঁড়া",
    "বিস্কুট ও স্ন্যাক্স",
    "চা, কফি ও পানীয়",
    "সাবান ও প্রসাধন",
    "দুগ্ধজাত পণ্য ও ডিম",
    "পরিষ্কারক সামগ্রী",
    "অন্যান্য",
  ];

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.barcode && p.barcode.includes(searchQuery));
    const matchesCategory =
      selectedCategory === "all" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const addToCart = (product: Product) => {
    setCart((prevCart) => {
      const existing = prevCart.find((item) => item.product.id === product.id);
      if (existing) {
        if (existing.quantity + 1 > product.stockQuantity) {
          return prevCart;
        }
        return prevCart.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
                total: (item.quantity + 1) * item.unitPrice,
              }
            : item,
        );
      }

      if (product.stockQuantity <= 0) return prevCart;

      const newItem: CartItem = {
        product,
        quantity: 1,
        unitPrice: product.sellingPrice,
        discount: 0,
        total: product.sellingPrice,
        costAtSale: product.costPrice ?? 0,
      };
      return [...prevCart, newItem];
    });
  };

  const updateQuantity = (productId: string, newQty: number) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }

    const product = products.find((p) => p.id === productId);
    if (product && newQty > product.stockQuantity) {
      return;
    }

    setCart((prevCart) =>
      prevCart.map((item) =>
        item.product.id === productId
          ? {
              ...item,
              quantity: newQty,
              total: newQty * item.unitPrice,
            }
          : item,
      ),
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prevCart) =>
      prevCart.filter((item) => item.product.id !== productId),
    );
  };

  const clearCart = () => {
    setCart([]);
    setDiscountAmount(0);
    setSelectedCustomer(null);
    setWalkInName("");
    setWalkInPhone("");
    setIsMixedPayment(false);
    setCheckoutError(null);
  };

  const subtotal = cart.reduce((acc, item) => acc + item.total, 0);
  const grandTotal = Math.max(0, subtotal - discountAmount);
  const effectivePaidAmount = isMixedPayment ? paidAmount : grandTotal;
  const dueAmount = Math.max(0, grandTotal - effectivePaidAmount);

  const canManagePOS = currentRole === "owner" || permissions?.manage === true;

  const handleCheckout = async () => {
    if (!canManagePOS) {
      alert("আপনার বিক্রি সম্পন্ন করার অনুমতি নেই।");
      return;
    }

    if (cart.length === 0) return;

    setCheckoutError(null);
    setIsCheckingOut(true);

    try {
      const data = await apiFetch<{
        sale: Sale;
        updatedProducts?: { id: string; stockQuantity: number }[];
      }>("/api/sales", {
        method: "POST",
        body: JSON.stringify({
          items: cart.map((item) => ({
            productId: item.product.id,
            quantity: item.quantity,
          })),
          discount: discountAmount,
          paidAmount: effectivePaidAmount,
          paymentMethod: selectedPaymentMethod,
          customerId: selectedCustomer?.id,
          customerName:
            selectedCustomer?.name || walkInName.trim() || "সাধারণ ক্রেতা",
          customerPhone:
            selectedCustomer?.phone || walkInPhone.trim() || undefined,
        }),
      });

      onCompleteSale(data.sale, data.updatedProducts);
      clearCart();
    } catch (err) {
      setCheckoutError(
        err instanceof Error ? err.message : "বিক্রি সম্পন্ন করা যায়নি।",
      );
    } finally {
      setIsCheckingOut(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div className="lg:col-span-7 space-y-4">
        <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="পণ্য বা বারকোড খুঁজুন..."
              className="w-full pl-9 pr-3 py-2 text-xs sm:text-sm bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white"
            />
          </div>
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap shrink-0 transition-colors ${
                selectedCategory === cat
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {cat === "all" ? "সব পণ্য" : cat}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[620px] overflow-y-auto pr-1">
          {filteredProducts.map((p) => {
            const inCart = cart.find((i) => i.product.id === p.id);
            const isOutOfStock = p.stockQuantity <= 0;

            return (
              <div
                key={p.id}
                onClick={() => !isOutOfStock && addToCart(p)}
                className={`p-3 rounded-xl border transition-all text-left flex flex-col justify-between cursor-pointer select-none ${
                  inCart
                    ? "border-emerald-500 bg-emerald-50/40 shadow-xs ring-1 ring-emerald-500"
                    : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs"
                } ${isOutOfStock ? "opacity-50 pointer-events-none" : ""}`}
              >
                <div>
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-[11px] text-slate-500 truncate">
                      {p.category}
                    </span>
                    {inCart && (
                      <span className="text-[10px] font-bold bg-emerald-600 text-white px-1.5 py-0.2 rounded-full tabular-nums">
                        {inCart.quantity}x
                      </span>
                    )}
                  </div>
                  <h3 className="font-semibold text-xs text-slate-900 leading-snug line-clamp-2">
                    {p.name}
                  </h3>
                </div>

                <div className="mt-3 pt-2 border-t border-slate-100 flex items-baseline justify-between">
                  <div className="text-sm font-bold text-slate-900 tabular-nums">
                    ৳{p.sellingPrice}
                    <span className="text-[10px] text-slate-500 font-normal">
                      /{p.unit}
                    </span>
                  </div>
                  <span
                    className={`text-[10px] tabular-nums ${
                      p.stockQuantity <= p.lowStockThreshold
                        ? "text-rose-600 font-semibold"
                        : "text-slate-500"
                    }`}
                  >
                    স্টক: {p.stockQuantity}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="lg:col-span-5 bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden flex flex-col sticky top-20">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50/70">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4 text-emerald-600" />
            <h2 className="font-bold text-sm text-slate-900">বিক্রয় ঝুড়ি</h2>
            <span className="text-xs bg-slate-200/80 px-2 py-0.5 rounded-full font-semibold tabular-nums text-slate-700">
              {cart.reduce((sum, item) => sum + item.quantity, 0)}
            </span>
          </div>

          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="text-xs text-rose-600 hover:text-rose-800 flex items-center gap-1"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>রিসেট</span>
            </button>
          )}
        </div>

        <div className="p-3 bg-slate-50/50 border-b border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-500 shrink-0" />
            <select
              value={selectedCustomer?.id || ""}
              onChange={(e) => {
                const found = customers.find((c) => c.id === e.target.value);
                setSelectedCustomer(found || null);
              }}
              className="w-full text-xs py-1.5 px-2 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">সাধারণ নগদ ক্রেতা (Walk-in)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} {c.currentDue > 0 ? `(বাকি: ৳${c.currentDue})` : ""}
                </option>
              ))}
            </select>
          </div>

          {!selectedCustomer && (
            <div className="grid grid-cols-2 gap-2 text-xs">
              <input
                type="text"
                placeholder="ক্রেতার নাম (ঐচ্ছিক)"
                value={walkInName}
                onChange={(e) => setWalkInName(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs"
              />
              <input
                type="tel"
                placeholder="মোবাইল নং (ঐচ্ছিক)"
                value={walkInPhone}
                onChange={(e) => setWalkInPhone(e.target.value)}
                className="px-2 py-1 bg-white border border-slate-300 rounded text-xs tabular-nums"
              />
            </div>
          )}
        </div>

        <div className="p-3 divide-y divide-slate-100 max-h-[260px] overflow-y-auto flex-1">
          {cart.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs">
              <ShoppingCart className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p>ঝুড়ি খালি। বাম পাশ থেকে পণ্য নির্বাচন করুন।</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="py-2.5 flex items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-xs text-slate-900 truncate">
                    {item.product.name}
                  </div>
                  <div className="text-[11px] text-slate-500 tabular-nums">
                    ৳{item.unitPrice} × {item.quantity} {item.product.unit}
                  </div>
                </div>

                <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.product.id, item.quantity - 1)
                    }
                    className="w-6 h-6 flex items-center justify-center text-slate-600"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="w-7 text-center font-bold text-xs tabular-nums">
                    {item.quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateQuantity(item.product.id, item.quantity + 1)
                    }
                    className="w-6 h-6 flex items-center justify-center text-slate-600"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="w-16 text-right font-bold text-xs tabular-nums">
                  ৳{item.total}
                </div>

                <button
                  type="button"
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="p-4 bg-slate-50 border-t border-slate-200 space-y-3 text-xs">
          <div className="space-y-1.5 text-slate-600">
            <div className="flex justify-between">
              <span>সাব-টোটাল:</span>
              <span className="font-semibold tabular-nums text-slate-900">
                ৳{subtotal}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="flex items-center gap-1">
                <Percent className="w-3 h-3 text-emerald-600" />
                <span>ডিসকাউন্ট:</span>
              </span>
              <div className="flex items-center gap-1">
                <span>৳</span>
                <input
                  type="number"
                  min="0"
                  value={discountAmount || ""}
                  onChange={(e) =>
                    setDiscountAmount(Number(e.target.value) || 0)
                  }
                  placeholder="০"
                  className="w-16 px-1.5 py-0.5 bg-white border border-slate-300 rounded text-right tabular-nums text-xs"
                />
              </div>
            </div>
          </div>

          <div className="pt-2 border-t border-slate-200 flex justify-between items-baseline">
            <span className="text-sm font-bold text-slate-900">সর্বমোট:</span>
            <span className="text-lg font-extrabold text-emerald-700 tabular-nums">
              ৳{grandTotal}
            </span>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
              পেমেন্ট মাধ্যম:
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("নগদ (Cash)")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 ${
                  selectedPaymentMethod === "নগদ (Cash)"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                <Banknote className="w-3.5 h-3.5" />
                নগদ
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("বিকাশ (bKash)")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 ${
                  selectedPaymentMethod === "বিকাশ (bKash)"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                বিকাশ
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("নগদ (Nagad)")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 ${
                  selectedPaymentMethod === "নগদ (Nagad)"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                নগদ
              </button>
              <button
                type="button"
                onClick={() => setSelectedPaymentMethod("ব্যাংক / কার্ড (Bank)")}
                className={`py-1.5 px-2 rounded-lg text-xs font-medium border flex items-center justify-center gap-1.5 ${
                  selectedPaymentMethod === "ব্যাংক / কার্ড (Bank)"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-white text-slate-700 border-slate-300"
                }`}
              >
                <Landmark className="w-3.5 h-3.5" />
                ব্যাংক
              </button>
            </div>
          </div>

          <div className="pt-1">
            <button
              type="button"
              onClick={() => {
                setIsMixedPayment(!isMixedPayment);
                setPaidAmount(grandTotal);
              }}
              className="text-[11px] text-emerald-800 hover:underline font-medium"
            >
              {isMixedPayment
                ? "পূর্ণ পরিশোধ মোডে ফিরুন"
                : "+ আংশিক বা বাকি বিক্রি যুক্ত করুন"}
            </button>

            {isMixedPayment && (
              <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded-lg space-y-1.5 text-[11px]">
                <div className="flex justify-between items-center">
                  <span>পরিশোধিত:</span>
                  <div className="flex items-center gap-1">
                    <span>৳</span>
                    <input
                      type="number"
                      value={paidAmount}
                      onChange={(e) =>
                        setPaidAmount(Number(e.target.value) || 0)
                      }
                      className="w-20 px-2 py-0.5 bg-white border border-amber-300 rounded text-right tabular-nums font-bold"
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center text-rose-700 font-bold">
                  <span>বাকি:</span>
                  <span className="tabular-nums">৳{dueAmount}</span>
                </div>
              </div>
            )}
          </div>

          {checkoutError && (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-[11px]">
              {checkoutError}
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleCheckout()}
            disabled={cart.length === 0 || !canManagePOS || isCheckingOut}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-5 h-5" />
            <span>
              {isCheckingOut
                ? "সংরক্ষণ হচ্ছে..."
                : `বিক্রি সম্পন্ন ও রসিদ (৳${grandTotal})`}
            </span>
          </button>

          <p className="text-[10px] text-slate-400 text-center">{shopName}</p>
        </div>
      </div>
    </div>
  );
};
