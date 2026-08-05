"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuthReady } from "@/hooks/useAuthReady";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Bell, Check, Loader2 } from "lucide-react";
import Header from "@/components/Header/Header";

export default function NotificationsPage() {
  const { account, isAuthLoading } = useAuthReady();
  const router = useRouter();
  const queryClient = useQueryClient();

  // 1. Fetch notifications
  const { data: notifications = [], isLoading } = useQuery<
    Array<{
      id: string;
      type: string;
      message: string;
      read: boolean;
      createdAt: string;
      registrationId: string;
    }>
  >({
    queryKey: ["notifications", account?.address],
    queryFn: async () => {
      if (!account) return [];
      const res = await fetch("/api/notifications", {
        headers: { "x-owner-address": account.address },
      });
      if (!res.ok) throw new Error("Failed to fetch notifications");
      return res.json();
    },
    enabled: !!account?.address,
  });

  // 2. Mutation to mark all as read
  const markReadMutation = useMutation({
    mutationFn: async () => {
      if (!account) return;
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "x-owner-address": account.address },
      });
      if (!res.ok) throw new Error("Failed to mark notifications read");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications", account?.address] });
    },
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (isAuthLoading) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="flex justify-center items-center py-32">
          <Loader2 className="animate-spin h-8 w-8 text-primary" />
        </div>
      </main>
    );
  }

  if (!account) {
    return (
      <main className="min-h-screen bg-neutral-mist">
        <Header />
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-6">
          <div className="flex justify-center">
            <div className="bg-[#1e2a4a0a] p-4 rounded-full border border-neutral-mist">
              <Bell className="w-8 h-8 text-neutral-slate" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-primary font-display">Access Denied</h2>
          <p className="text-xs text-neutral-slate leading-relaxed">
            Please sign in to view your notification updates.
          </p>
          <button
            onClick={() => router.push("/")}
            className="inline-block bg-primary hover:bg-primary-light text-neutral-white font-semibold rounded-lg px-6 py-2.5 text-xs transition-colors cursor-pointer"
          >
            Go Home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-neutral-mist pb-16">
      <Header />

      <div className="max-w-3xl mx-auto px-4 pt-8">
        {/* Back navigation */}
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-xs text-neutral-slate hover:text-primary transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back</span>
        </button>

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-8 border-b border-neutral-mist pb-4">
          <div className="flex items-center gap-2.5 flex-wrap">
            <h1 className="text-xl sm:text-2xl font-bold text-primary font-display">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-critical/10 text-critical font-bold text-[10px] uppercase tracking-wide px-2 py-0.5 rounded-full shrink-0">
                {unreadCount} unread
              </span>
            )}
          </div>
          {unreadCount > 0 && (
            <button
              onClick={() => markReadMutation.mutate()}
              className="self-start sm:self-auto flex items-center gap-1.5 bg-neutral-white border border-neutral-mist hover:bg-neutral-mist text-xs text-accent font-semibold px-3 py-1.5 rounded-xl transition-colors cursor-pointer shadow-xs shrink-0 whitespace-nowrap"
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Mark all as read</span>
            </button>
          )}
        </div>

        {/* Content list */}
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-3">
            <Loader2 className="animate-spin h-6 w-6 text-primary" />
            <span className="text-xs text-neutral-slate font-medium">Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="bg-neutral-white border border-neutral-mist rounded-2xl p-12 text-center shadow-xs space-y-4">
            <div className="flex justify-center">
              <div className="bg-[#1e2a4a0a] p-4 rounded-full border border-neutral-mist">
                <Bell className="w-6 h-6 text-neutral-slate" />
              </div>
            </div>
            <h3 className="text-sm font-bold text-primary font-display">No Notifications</h3>
            <p className="text-xs text-neutral-slate max-w-sm mx-auto leading-relaxed">
              When physical sticker scans or reports are submitted, updates will appear here in real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            {notifications.map((n) => {
              const isShipment = n.type.startsWith("shipment_") || n.registrationId.startsWith("RCV-");

              const getBadgeStyle = (type: string) => {
                switch (type) {
                  case "shipment_scan":
                    return "bg-amber-100 text-amber-800 border border-amber-300";
                  case "shipment_created":
                    return "bg-indigo-100 text-indigo-800 border border-indigo-300";
                  case "shipment_intransit":
                    return "bg-blue-100 text-blue-800 border border-blue-300";
                  case "shipment_verified":
                    return "bg-emerald-100 text-emerald-800 border border-emerald-300";
                  case "shipment_disputed":
                    return "bg-rose-100 text-rose-800 border border-rose-300";
                  case "scan":
                    return "bg-amber-100 text-amber-800 border border-amber-300";
                  case "recovered":
                    return "bg-green-100 text-green-800 border border-green-300";
                  default:
                    return "bg-cyan-100 text-cyan-800 border border-cyan-300";
                }
              };

              const getBadgeLabel = (type: string) => {
                switch (type) {
                  case "shipment_scan":
                    return "Package Scanned 📱";
                  case "shipment_created":
                    return "Registered 📦";
                  case "shipment_intransit":
                    return "In Transit 🛵";
                  case "shipment_verified":
                    return "Delivered ✓";
                  case "shipment_disputed":
                    return "Disputed ⚠️";
                  default:
                    return type.replace(/_/g, " ");
                }
              };

              return (
                <div
                  key={n.id}
                  className={`bg-neutral-white border rounded-2xl p-5 shadow-xs transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    n.read ? "border-neutral-mist opacity-80" : "border-accent/40 bg-accent/5 ring-1 ring-accent/10"
                  }`}
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-3">
                      <span className={`text-[9px] uppercase font-bold tracking-wide px-2.5 py-0.5 rounded-full ${getBadgeStyle(n.type)}`}>
                        {getBadgeLabel(n.type)}
                      </span>
                      <span className="text-[10px] text-neutral-slate font-medium">
                        {new Date(n.createdAt).toLocaleDateString()} at {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-primary font-sans leading-relaxed">
                      {n.message}
                    </p>
                  </div>

                  {n.registrationId && (
                    <Link
                      href={isShipment ? `/shipments/${n.registrationId}` : `/items/${n.registrationId}`}
                      className="inline-flex items-center justify-center bg-primary hover:bg-primary-light text-neutral-white text-xs font-semibold px-4 py-2 rounded-xl transition-colors cursor-pointer shrink-0"
                    >
                      View Details
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
