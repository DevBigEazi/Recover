"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Loader2,
  Download,
  Globe,
  ChevronRight,
  ChevronLeft,
  AlertCircle,
  ArrowRightLeft,
  X,
  Share2,
  Search,
} from "lucide-react";
import { Shipment, HandoverResult } from "./types";
import { formatTrackingCode } from "@/lib/format";

interface ShipmentsTableProps {
  shipments: Shipment[];
  isLoading: boolean;
  error: unknown;
  onHandover: (shipment: Shipment) => void;
  onShowLinks: (result: HandoverResult) => void;
  onShowSticker: (shipment: Shipment) => void;
}

const ITEMS_PER_PAGE = 10;

export default function ShipmentsTable({
  shipments,
  isLoading,
  error,
  onHandover,
  onShowLinks,
  onShowSticker,
}: ShipmentsTableProps) {
  const [statusFilter, setStatusFilter] = useState<"all" | "Created" | "InTransit" | "Verified" | "Disputed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredShipments = shipments.filter((s) => {
    if (statusFilter !== "all" && s.status !== statusFilter) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const nameMatch = ((s.metadata?.name as string) || "").toLowerCase().includes(q);
      const trackingStr = s.trackingCode || (s._id ? formatTrackingCode(s._id) : "");
      const codeMatch = trackingStr.toLowerCase().includes(q);
      const idMatch = Boolean(s._id && String(s._id).toLowerCase().includes(q));
      return nameMatch || codeMatch || idMatch;
    }

    return true;
  });

  const totalPages = Math.max(1, Math.ceil(filteredShipments.length / ITEMS_PER_PAGE));
  const paginatedShipments = filteredShipments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const createdCount = shipments.filter((s) => s.status === "Created").length;
  const inTransitCount = shipments.filter((s) => s.status === "InTransit").length;
  const verifiedCount = shipments.filter((s) => s.status === "Verified").length;
  const disputedCount = shipments.filter((s) => s.status === "Disputed").length;

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold tracking-tight text-white">
            Shipments Log ({filteredShipments.length} / {shipments.length})
          </h2>
        </div>

        {/* Instant Search Bar */}
        {shipments.length > 0 && (
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search packages by reference name or tracking code (e.g. RCV-AF791413)..."
              className="w-full bg-slate-900/80 border border-slate-800 focus:border-blue-500 rounded-xl pl-9 pr-8 py-2.5 text-xs text-white placeholder-slate-500 outline-none transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setCurrentPage(1);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white text-xs p-1 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        )}

        {/* Delivery Status Filter Tabs */}
        {shipments.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-slate-800/80">
            <button
              type="button"
              onClick={() => {
                setStatusFilter("all");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "all"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800"
              }`}
            >
              All Packages
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  statusFilter === "all" ? "bg-blue-800 text-blue-100" : "bg-slate-800 text-slate-400"
                }`}
              >
                {shipments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter("Created");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "Created"
                  ? "bg-slate-700 text-white shadow-sm"
                  : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800"
              }`}
            >
              Registered
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  statusFilter === "Created" ? "bg-slate-600 text-white" : "bg-slate-800 text-slate-400"
                }`}
              >
                {createdCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter("InTransit");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "InTransit"
                  ? "bg-blue-950 text-blue-300 border border-blue-800 shadow-sm"
                  : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800"
              }`}
            >
              In Transit 🛵
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  statusFilter === "InTransit" ? "bg-blue-900 text-blue-200" : "bg-slate-800 text-slate-400"
                }`}
              >
                {inTransitCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter("Verified");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "Verified"
                  ? "bg-emerald-950 text-emerald-300 border border-emerald-800 shadow-sm"
                  : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800"
              }`}
            >
              Delivered (Verified) ✓
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  statusFilter === "Verified" ? "bg-emerald-800 text-emerald-100" : "bg-slate-800 text-slate-400"
                }`}
              >
                {verifiedCount}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setStatusFilter("Disputed");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                statusFilter === "Disputed"
                  ? "bg-rose-950 text-rose-300 border border-rose-800 shadow-sm"
                  : "text-slate-400 hover:text-white bg-slate-900/60 hover:bg-slate-800/80 border border-slate-800"
              }`}
            >
              Disputed ⚠
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] font-extrabold ${
                  statusFilter === "Disputed" ? "bg-rose-800 text-rose-100" : "bg-slate-800 text-slate-400"
                }`}
              >
                {disputedCount}
              </span>
            </button>
          </div>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center items-center py-16">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
        </div>
      ) : error ? (
        <div className="bg-red-950/20 border border-red-900/50 p-4 rounded-lg flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-400" />
          <p className="text-red-300 text-sm">Failed to load shipments. Please try reloading.</p>
        </div>
      ) : filteredShipments.length === 0 ? (
        <div className="text-center py-16 bg-slate-900/20 border border-slate-800/80 rounded-xl space-y-3">
          <Globe className="w-12 h-12 text-slate-600 mx-auto" />
          <p className="text-slate-400 text-sm">
            {statusFilter === "all"
              ? "No shipments registered yet."
              : `No packages found under '${statusFilter}' status.`}
          </p>
          {statusFilter !== "all" && (
            <button
              type="button"
              onClick={() => setStatusFilter("all")}
              className="text-xs font-bold text-blue-400 hover:text-blue-300 underline cursor-pointer"
            >
              View All Packages ({shipments.length})
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-4">
            {paginatedShipments.map((shipment, idx) => (
              <div
                key={String(shipment._id || idx)}
                className="bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/80 transition-all rounded-xl p-5 backdrop-blur-sm shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="font-bold text-sm text-white">
                      {(shipment.metadata?.name as string) || "General Package"}
                    </h3>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        shipment.status === "Verified"
                          ? "bg-emerald-950/80 text-emerald-400 border border-emerald-900/50"
                          : shipment.status === "Disputed"
                          ? "bg-rose-950/80 text-rose-400 border border-rose-900/50"
                          : shipment.status === "InTransit"
                          ? "bg-blue-950/80 text-blue-400 border border-blue-900/50"
                          : "bg-slate-800 text-slate-300"
                      }`}
                    >
                      {shipment.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span className="font-mono bg-slate-800/80 px-1.5 py-0.5 rounded select-all text-slate-300">
                      {shipment.trackingCode || formatTrackingCode(shipment._id)}
                    </span>
                    <span>·</span>
                    <span>Registered: {new Date(shipment.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {shipment.status !== "Verified" &&
                    shipment.status !== "Delivered" &&
                    shipment.status !== "Disputed" && (
                      <>
                        <button
                          type="button"
                          onClick={() => onHandover(shipment)}
                          className="bg-blue-950/80 hover:bg-blue-900 text-blue-300 text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors border border-blue-800/60 cursor-pointer"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" /> Handover
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            const trackingCode = shipment.trackingCode || formatTrackingCode(shipment._id);
                            const pin = (shipment.metadata?.courierPin as string) || "";
                            const origin = typeof window !== "undefined" ? window.location.origin : "";
                            onShowLinks({
                              riderLink: `${origin}/scan/${trackingCode}${pin ? `?pin=${pin}` : ""}`,
                              recipientLink: `${origin}/scan/${trackingCode}${pin ? `?pin=${pin}` : ""}`,
                              courierPin: pin || "Not Generated",
                              riderPhone: (shipment.metadata?.riderPhone as string) || null,
                              riderName: (shipment.metadata?.riderName as string) || null,
                            });
                          }}
                          className="bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors border border-indigo-800/60 cursor-pointer"
                        >
                          <Share2 className="w-3.5 h-3.5" /> Links
                        </button>
                        <button
                          type="button"
                          onClick={() => onShowSticker(shipment)}
                          className="bg-slate-800 hover:bg-slate-700 text-xs font-semibold py-2 px-3 rounded-lg flex items-center gap-1.5 transition-colors border border-slate-700 cursor-pointer text-slate-300"
                        >
                          <Download className="w-3.5 h-3.5" /> Label
                        </button>
                      </>
                    )}
                  <Link
                    href={`/shipments/${shipment.trackingCode || formatTrackingCode(shipment._id)}`}
                    className="bg-blue-600 hover:bg-blue-500 text-xs font-semibold py-2 px-3.5 rounded-lg flex items-center gap-1 transition-colors shadow-sm cursor-pointer text-white"
                  >
                    Track <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>

          {/* Pagination Bar */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between gap-2 pt-4 border-t border-slate-800/80 flex-wrap">
              <p className="text-xs text-slate-400 font-medium">
                Showing <span className="font-bold text-white">{(currentPage - 1) * ITEMS_PER_PAGE + 1}</span>–
                <span className="font-bold text-white">
                  {Math.min(currentPage * ITEMS_PER_PAGE, filteredShipments.length)}
                </span>{" "}
                of <span className="font-bold text-white">{filteredShipments.length}</span> packages
              </p>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" /> Prev
                </button>

                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                  <button
                    key={pageNum}
                    type="button"
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pageNum
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                ))}

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors flex items-center gap-1 cursor-pointer"
                >
                  Next <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
