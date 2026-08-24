"use strict";
// ═══════════════════════════════════════════════════════════════
// src/types/order.ts (Optional - for frontend use)
// ═══════════════════════════════════════════════════════════════
// Type definitions that match the backend Order model.
// Use these in your admin dashboard components.
// ═══════════════════════════════════════════════════════════════
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS_COLORS = exports.ORDER_STATUS_FLOW = void 0;
// Valid status transitions (mirror of backend)
exports.ORDER_STATUS_FLOW = {
    pending: ["confirmed", "cancelled"],
    confirmed: ["processing", "cancelled"],
    processing: ["shipped", "cancelled"],
    shipped: ["delivered"],
    delivered: [],
    cancelled: [],
};
// Status colors for UI
exports.STATUS_COLORS = {
    pending: { bg: "bg-yellow-50", text: "text-yellow-700", dot: "bg-yellow-500" },
    confirmed: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
    processing: { bg: "bg-purple-50", text: "text-purple-700", dot: "bg-purple-500" },
    shipped: { bg: "bg-indigo-50", text: "text-indigo-700", dot: "bg-indigo-500" },
    delivered: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
    cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-500" },
};
