"use client";

import React, { useState } from "react";
import {
  Plus,
  Trash2,
  ShoppingBag,
  Zap,
  CreditCard,
  Banknote,
  ArrowRight,
  Truck,
  Clock,
  User,
  Phone,
  Calendar,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuthReady } from "@/hooks/useAuthReady";
import toast from "react-hot-toast";
import ReceiptIssuedModal, { ReceiptIssuedData } from "./ReceiptIssuedModal";
import { useTeam } from "@/context/TeamContext";

interface CartLineItem {
  id: string;
  name: string;
  quantity: number;
  unitPrice: number;
}

interface ProductPreset {
  _id: string;
  name: string;
  defaultPrice: number;
  salesCount: number;
}

export type POSPaymentMethod = "Cash" | "Bank Transfer" | "Card/POS" | "Credit" | "Other";

export default function POSScreen() {
  const { account } = useAuthReady();
  const { can, isStaffMode, workspaceSession } = useTeam();
  const effectiveAddress = workspaceSession?.merchantAddress || account?.address;
  const canIssueCredit = can("issue_credit_receipt");
  const queryClient = useQueryClient();

  const [items, setItems] = useState<CartLineItem[]>([
    { id: "item-1", name: "", quantity: 1, unitPrice: 0 },
  ]);
  const [discount, setDiscount] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<POSPaymentMethod>("Cash");
  const [fulfillmentType, setFulfillmentType] = useState<"spot" | "dispatch">("spot");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [showCustomerFields, setShowCustomerFields] = useState(false);

  // Credit / Debt specific states
  const [creditDueDatePreset, setCreditDueDatePreset] = useState<"7" | "14" | "30" | "custom">("14");
  const [customDueDate, setCustomDueDate] = useState("");
  const [initialDeposit, setInitialDeposit] = useState<number>(0);
  const [creditNotes, setCreditNotes] = useState("");

  // Success modal state
  const [issuedReceipt, setIssuedReceipt] = useState<ReceiptIssuedData | null>(null);

  // 1. Fetch Product Presets for instant quick-pick
  const { data: presetsData } = useQuery<{ success: boolean; presets: ProductPreset[] }>({
    queryKey: ["receipt-presets", effectiveAddress],
    queryFn: async () => {
      if (!effectiveAddress && !isStaffMode) return { success: true, presets: [] };
      const headers: Record<string, string> = {};
      if (effectiveAddress) headers["x-owner-address"] = effectiveAddress;
      const res = await fetch("/api/v1/receipts/presets", { headers });
      if (!res.ok) throw new Error("Could not fetch presets");
      return res.json();
    },
    enabled: !!effectiveAddress || isStaffMode,
  });

  const presets = presetsData?.presets || [];

  // Quick-Pick Preset Click
  const handleSelectPreset = (preset: ProductPreset) => {
    setItems((prev) => {
      const existingIdx = prev.findIndex(
        (it) => it.name.trim().toLowerCase() === preset.name.trim().toLowerCase()
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].quantity += 1;
        return updated;
      }
      if (prev.length === 1 && !prev[0].name.trim() && prev[0].unitPrice === 0) {
        return [{ id: prev[0].id, name: preset.name, quantity: 1, unitPrice: preset.defaultPrice }];
      }
      return [
        ...prev,
        { id: `item-${Date.now()}`, name: preset.name, quantity: 1, unitPrice: preset.defaultPrice },
      ];
    });
  };

  const updateItem = (id: string, field: keyof CartLineItem, value: unknown) => {
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, [field]: value } : it))
    );
  };

  const addItemRow = () => {
    setItems((prev) => [
      ...prev,
      { id: `item-${Date.now()}`, name: "", quantity: 1, unitPrice: 0 },
    ]);
  };

  const removeItemRow = (id: string) => {
    setItems((prev) => {
      if (prev.length <= 1) {
        return [{ id: "item-1", name: "", quantity: 1, unitPrice: 0 }];
      }
      return prev.filter((it) => it.id !== id);
    });
  };

  // Calculations
  const subtotal = items.reduce(
    (acc, it) => acc + (it.quantity > 0 ? it.quantity * Math.max(0, it.unitPrice) : 0),
    0
  );
  const grandTotal = Math.max(0, subtotal - Math.max(0, discount) + Math.max(0, tax));
  const remainingCreditBalance = Math.max(0, grandTotal - Math.max(0, initialDeposit));

  // Switch payment method with helper for Credit
  const handlePaymentMethodChange = (method: POSPaymentMethod) => {
    setPaymentMethod(method);
    if (method === "Credit") {
      setShowCustomerFields(true);
    }
  };

  // Calculate computed due date
  const getComputedDueDate = (): string | null => {
    if (paymentMethod !== "Credit") return null;
    if (creditDueDatePreset === "custom") {
      return customDueDate ? new Date(customDueDate).toISOString() : null;
    }
    const days = parseInt(creditDueDatePreset, 10);
    const d = new Date();
    d.setDate(d.getDate() + days);
    return d.toISOString();
  };

  // 2. Issue Receipt Mutation
  const issueMutation = useMutation({
    mutationFn: async () => {
      if (!effectiveAddress && !isStaffMode) throw new Error("Wallet account or staff session required.");

      const validItems = items
        .filter((it) => it.name.trim().length > 0)
        .map((it) => ({
          name: it.name.trim(),
          quantity: Math.max(1, Math.floor(it.quantity)),
          unitPrice: Math.max(0, it.unitPrice),
        }));

      if (validItems.length === 0) {
        throw new Error("Please enter at least one item name.");
      }

      if (paymentMethod === "Credit" && !customerName.trim()) {
        throw new Error("Customer name is required for Credit / Pay Later sales to track the debt.");
      }

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (effectiveAddress) headers["x-owner-address"] = effectiveAddress;

      const res = await fetch("/api/v1/receipts", {
        method: "POST",
        headers,
        body: JSON.stringify({
          items: validItems,
          discount: Math.max(0, Number(discount) || 0),
          tax: Math.max(0, Number(tax) || 0),
          paymentMethod,
          fulfillmentType,
          customerName: customerName.trim() || null,
          customerPhone: customerPhone.trim() || null,
          amountPaid: paymentMethod === "Credit" ? Math.max(0, Number(initialDeposit) || 0) : grandTotal,
          creditDueDate: getComputedDueDate(),
          creditNotes: creditNotes.trim() || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to issue receipt");
      }

      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["receipts"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-presets"] });
      queryClient.invalidateQueries({ queryKey: ["receipt-analytics"] });
      if (effectiveAddress) {
        queryClient.invalidateQueries({ queryKey: ["receipts", effectiveAddress] });
        queryClient.invalidateQueries({ queryKey: ["receipt-presets", effectiveAddress] });
        queryClient.invalidateQueries({ queryKey: ["receipt-analytics", effectiveAddress] });
      }
      toast.success(
        paymentMethod === "Credit"
          ? "Credit sale recorded! Customer debt added to ledger."
          : "Digital receipt issued successfully!"
      );
      setIssuedReceipt(data.receipt);
    },
    onError: (err: Error) => {
      toast.error(err.message || "Could not issue receipt.");
    },
  });

  const resetForm = () => {
    setItems([{ id: "item-1", name: "", quantity: 1, unitPrice: 0 }]);
    setDiscount(0);
    setTax(0);
    setCustomerName("");
    setCustomerPhone("");
    setInitialDeposit(0);
    setCreditNotes("");
    setIssuedReceipt(null);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Top Banner / Presets */}
      {presets.length > 0 && (
        <div className="p-3 sm:p-4 bg-slate-900/60 rounded-2xl border border-slate-800/80 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-bold text-white tracking-wide uppercase">
              Quick-Pick Products
            </span>
            <span className="text-[11px] text-slate-400 hidden sm:inline">
              (Tap to add without typing)
            </span>
          </div>
          <div className="flex overflow-x-auto pb-1.5 gap-2 scrollbar-none touch-pan-x">
            {presets.slice(0, 10).map((p) => (
              <button
                key={p._id}
                type="button"
                onClick={() => handleSelectPreset(p)}
                className="inline-flex items-center gap-1.5 px-3 py-2 sm:py-1.5 bg-slate-950 hover:bg-slate-900 border border-slate-800 hover:border-blue-500/60 rounded-lg text-xs font-medium text-slate-300 hover:text-white transition-all active:scale-95 cursor-pointer whitespace-nowrap shrink-0 shadow-2xs min-h-10 sm:min-h-0"
              >
                <span>{p.name}</span>
                <span className="font-semibold text-blue-400 font-mono">
                  ₦{p.defaultPrice.toLocaleString()}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Layout: Cart Table & Summary Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column: Cart Rows */}
        <div className="lg:col-span-2 bg-slate-900/60 rounded-2xl border border-slate-800/80 shadow-sm p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 text-blue-400" />
              <h2 className="text-sm sm:text-base font-bold text-white">
                Cart Items ({items.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={addItemRow}
              className="inline-flex items-center gap-1 text-xs font-bold text-blue-400 hover:text-blue-300 transition-colors cursor-pointer py-1 px-2 rounded-lg hover:bg-blue-950/40"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>
          </div>

          {/* Cart Items List */}
          <div className="space-y-3">
            {items.map((item, index) => {
              const lineTotal = item.quantity * Math.max(0, item.unitPrice);
              return (
                <div
                  key={item.id}
                  className="p-3 sm:p-3.5 bg-slate-950/60 rounded-xl border border-slate-800/80 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 sm:gap-3 transition-all"
                >
                  <span className="text-xs font-bold text-slate-500 w-5 text-center hidden sm:block">
                    {index + 1}
                  </span>

                  {/* Name Input */}
                  <div className="flex-1 w-full">
                    <label className="block text-[10px] font-semibold text-slate-400 uppercase sm:hidden mb-1">
                      Item #{index + 1} Name
                    </label>
                    <input
                      type="text"
                      placeholder="Product or service name..."
                      value={item.name}
                      onChange={(e) => updateItem(item.id, "name", e.target.value)}
                      className="w-full text-xs sm:text-sm font-medium px-3 py-2 bg-slate-900/80 border border-slate-800 rounded-lg focus:outline-hidden focus:border-blue-500 text-white placeholder-slate-500 transition-all"
                    />
                  </div>

                  {/* Mobile Row: Quantity + Unit Price + Delete */}
                  <div className="flex items-center justify-between gap-2 w-full sm:w-auto">
                    {/* Quantity Stepper */}
                    <div className="flex items-center border border-slate-800 rounded-lg bg-slate-900 overflow-hidden shadow-2xs shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          updateItem(item.id, "quantity", Math.max(1, item.quantity - 1))
                        }
                        className="w-10 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white text-base sm:text-sm font-bold transition-colors cursor-pointer"
                        aria-label="Decrease quantity"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) =>
                          updateItem(item.id, "quantity", Math.max(1, parseInt(e.target.value) || 1))
                        }
                        className="w-11 sm:w-12 text-center text-xs sm:text-sm font-semibold border-x border-slate-800 py-1.5 focus:outline-hidden text-white bg-slate-900"
                      />
                      <button
                        type="button"
                        onClick={() => updateItem(item.id, "quantity", item.quantity + 1)}
                        className="w-10 h-9 sm:w-8 sm:h-8 flex items-center justify-center text-slate-400 hover:bg-slate-800 hover:text-white text-base sm:text-sm font-bold transition-colors cursor-pointer"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>

                    {/* Unit Price Input */}
                    <div className="flex-1 sm:w-28 relative min-w-22.5">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                        ₦
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="100"
                        placeholder="Price"
                        value={item.unitPrice === 0 ? "" : item.unitPrice}
                        onChange={(e) =>
                          updateItem(item.id, "unitPrice", Math.max(0, parseFloat(e.target.value) || 0))
                        }
                        className="w-full text-xs sm:text-sm font-semibold pl-6 pr-2 py-2 bg-slate-900/80 border border-slate-800 rounded-lg focus:outline-hidden focus:border-blue-500 text-white placeholder-slate-500"
                      />
                    </div>

                    {/* Line Total on desktop, Delete button */}
                    <div className="hidden sm:block w-24 text-right">
                      <span className="text-xs sm:text-sm font-bold text-white font-mono">
                        ₦{lineTotal.toLocaleString()}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeItemRow(item.id)}
                      className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Remove item"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Mobile Subtotal Banner */}
                  <div className="flex sm:hidden items-center justify-between px-1 text-xs text-slate-400 pt-1 border-t border-slate-800/40">
                    <span>Line Total:</span>
                    <span className="font-bold text-white font-mono">
                      ₦{lineTotal.toLocaleString()}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Add Row Button */}
          <button
            type="button"
            onClick={addItemRow}
            className="w-full py-2.5 border-2 border-dashed border-slate-800 hover:border-blue-500/50 rounded-xl text-xs font-bold text-slate-400 hover:text-blue-400 flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-11"
          >
            <Plus className="w-4 h-4" />
            <span>Add Another Product</span>
          </button>
        </div>

        {/* Right Column: Checkout Summary & Issuance */}
        <div className="space-y-4">
          <div className="bg-slate-900/60 rounded-2xl border border-slate-800/80 shadow-sm p-4 sm:p-5 space-y-4">
            <h3 className="text-sm font-bold text-white border-b border-slate-800/80 pb-2">
              Payment & Fulfillment
            </h3>

            {/* Payment Method Selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">
                Payment Channel
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {(
                  [
                    { id: "Cash", label: "Cash", icon: Banknote },
                    { id: "Bank Transfer", label: "Transfer", icon: ArrowRight },
                    { id: "Card/POS", label: "Card/POS", icon: CreditCard },
                    ...(canIssueCredit ? [{ id: "Credit", label: "Store Credit", icon: Clock } as const] : []),
                    { id: "Other", label: "Other", icon: ShoppingBag },
                  ] as const
                ).map(({ id, label, icon: Icon }) => {
                  const isSelected = paymentMethod === id;
                  const isCredit = id === "Credit";

                  let buttonStyles = "bg-slate-950 border-slate-800 text-slate-400 hover:text-white hover:bg-slate-900";
                  if (isSelected) {
                    if (isCredit) {
                      buttonStyles = "bg-purple-950/80 text-purple-300 border-purple-600 shadow-xs";
                    } else {
                      buttonStyles = "bg-blue-600 text-white border-blue-500 shadow-xs";
                    }
                  }

                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handlePaymentMethodChange(id)}
                      className={`py-2 px-2 text-xs font-bold rounded-lg border flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-10.5 ${buttonStyles}`}
                    >
                      <Icon className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Credit Notice Banner */}
            {paymentMethod === "Credit" && (
              <div className="p-3 bg-purple-950/30 border border-purple-800/50 rounded-xl space-y-2">
                <div className="flex items-start gap-2">
                  <Clock className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-purple-200">
                    <span className="font-bold">Customer Credit (Pay Later):</span> Customer details are required below to track this debt in your ledger.
                  </div>
                </div>

                {/* Due Date Presets */}
                <div className="pt-1">
                  <label className="flex items-center gap-1 text-[11px] font-semibold text-purple-300 mb-1">
                    <Calendar className="w-3 h-3" />
                    <span>Repayment Due Date</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: "7", label: "7 Days" },
                        { id: "14", label: "14 Days" },
                        { id: "30", label: "30 Days" },
                        { id: "custom", label: "Custom" },
                      ] as const
                    ).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => setCreditDueDatePreset(t.id)}
                        className={`py-1 px-1.5 text-[11px] font-bold rounded border cursor-pointer text-center transition-all ${
                          creditDueDatePreset === t.id
                            ? "bg-purple-600 text-white border-purple-500"
                            : "bg-slate-950/80 border-slate-800 text-slate-300 hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>

                  {creditDueDatePreset === "custom" && (
                    <input
                      type="date"
                      value={customDueDate}
                      onChange={(e) => setCustomDueDate(e.target.value)}
                      className="w-full mt-1.5 text-xs px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white outline-hidden focus:border-purple-500"
                    />
                  )}
                </div>

                {/* Initial Deposit / Down Payment (Optional) */}
                <div className="pt-1">
                  <label className="block text-[11px] font-semibold text-purple-300 mb-1">
                    Initial Deposit Paid (₦) - Optional
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 (full amount on credit)"
                    value={initialDeposit === 0 ? "" : initialDeposit}
                    onChange={(e) => setInitialDeposit(Math.max(0, parseFloat(e.target.value) || 0))}
                    className="w-full text-xs px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white font-mono outline-hidden focus:border-purple-500"
                  />
                  {initialDeposit > 0 && (
                    <div className="text-[11px] text-purple-300 mt-1">
                      Balance Owed: ₦{remainingCreditBalance.toLocaleString()}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Fulfillment Mode */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">
                Fulfillment Mode
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFulfillmentType("spot")}
                  className={`p-2.5 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer min-h-11 ${
                    fulfillmentType === "spot"
                      ? "bg-slate-950 border-blue-500 ring-2 ring-blue-500/20 shadow-2xs"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold text-white">Spot Handover</div>
                  <div className="text-[10px] text-slate-400">Instant counter QR</div>
                </button>

                <button
                  type="button"
                  onClick={() => setFulfillmentType("dispatch")}
                  className={`p-2.5 text-xs font-semibold rounded-lg border text-left transition-all cursor-pointer min-h-11 ${
                    fulfillmentType === "dispatch"
                      ? "bg-slate-950 border-blue-500 ring-2 ring-blue-500/20 shadow-2xs"
                      : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <div className="font-bold text-white flex items-center gap-1">
                    <Truck className="w-3 h-3 text-blue-400" />
                    <span>Dispatch</span>
                  </div>
                  <div className="text-[10px] text-slate-400">Courier tracking label</div>
                </button>
              </div>
            </div>

            {/* Customer Details Section */}
            <div className="border-t border-slate-800/80 pt-3">
              <button
                type="button"
                onClick={() => setShowCustomerFields(!showCustomerFields)}
                className="text-xs font-semibold text-blue-400 hover:underline flex items-center justify-between w-full cursor-pointer py-1"
              >
                <span>
                  {showCustomerFields
                    ? "− Hide Customer Info"
                    : paymentMethod === "Credit"
                    ? "+ Customer Info (Required for Credit)"
                    : "+ Add Customer Name/Phone (Optional)"}
                </span>
              </button>

              {showCustomerFields && (
                <div className="mt-2.5 space-y-2 animate-in fade-in duration-150">
                  <div className="relative">
                    <User className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      placeholder={paymentMethod === "Credit" ? "Customer Name * (Required for Credit)" : "Customer Name (optional)"}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className={`w-full text-xs pl-8 pr-3 py-2 bg-slate-950 border rounded-lg focus:outline-hidden text-white placeholder-slate-500 ${
                        paymentMethod === "Credit" && !customerName.trim()
                          ? "border-purple-600 focus:border-purple-500"
                          : "border-slate-800 focus:border-blue-500"
                      }`}
                    />
                  </div>

                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="tel"
                      placeholder="Customer Phone (recommended for debt tracking)"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full text-xs pl-8 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-hidden focus:border-blue-500 text-white placeholder-slate-500"
                    />
                  </div>

                  {paymentMethod === "Credit" && (
                    <input
                      type="text"
                      placeholder="Credit agreement note (e.g. Promised next Friday)"
                      value={creditNotes}
                      onChange={(e) => setCreditNotes(e.target.value)}
                      className="w-full text-xs px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg focus:outline-hidden focus:border-blue-500 text-white placeholder-slate-500"
                    />
                  )}
                </div>
              )}
            </div>

            {/* Order Totals */}
            <div className="border-t border-slate-800/80 pt-3 space-y-2 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Subtotal</span>
                <span className="font-mono text-white">₦{subtotal.toLocaleString()}</span>
              </div>

              <div className="flex items-center justify-between text-slate-400">
                <span>Discount (₦)</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={discount === 0 ? "" : discount}
                  onChange={(e) => setDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-24 text-right text-xs px-2.5 py-1.5 bg-slate-950 border border-slate-800 rounded focus:outline-hidden text-white font-mono"
                />
              </div>

              <div className="flex justify-between items-center pt-2 border-t border-slate-800/80 text-base font-bold text-white">
                <span>TOTAL</span>
                <span className="text-blue-400 font-mono text-xl font-black">
                  ₦{grandTotal.toLocaleString()}
                </span>
              </div>

              {paymentMethod === "Credit" && (
                <div className="flex justify-between items-center text-xs font-bold text-purple-300 pt-1">
                  <span>Balance Owed By Customer:</span>
                  <span className="font-mono text-sm">
                    ₦{remainingCreditBalance.toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Issue Receipt Button */}
            <button
              type="button"
              disabled={issueMutation.isPending || subtotal <= 0}
              onClick={() => issueMutation.mutate()}
              className={`w-full py-3 px-4 rounded-xl text-white font-bold text-sm shadow-sm transition-all flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 min-h-12 ${
                paymentMethod === "Credit"
                  ? "bg-purple-600 hover:bg-purple-500 disabled:bg-slate-800"
                  : "bg-blue-600 hover:bg-blue-500 disabled:bg-slate-800"
              }`}
            >
              <span>
                {issueMutation.isPending
                  ? "Recording Sale..."
                  : paymentMethod === "Credit"
                  ? `Record Credit Sale (₦${remainingCreditBalance.toLocaleString()} Owed)`
                  : "Issue Digital Receipt"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Success Modal */}
      {issuedReceipt && (
        <ReceiptIssuedModal
          receipt={issuedReceipt}
          onClose={() => setIssuedReceipt(null)}
          onNewSale={resetForm}
        />
      )}
    </div>
  );
}
