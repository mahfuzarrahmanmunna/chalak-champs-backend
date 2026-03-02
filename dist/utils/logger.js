"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDebug = exports.logWarn = exports.logInfo = exports.logError = exports.morganStream = exports.logger = void 0;
// src/utils/logger.ts
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
// Define log levels
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
// Define colors for each level
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "white",
};
// Tell winston that you want to link the colors
winston_1.default.addColors(colors);
// Define which level to log based on environment
const level = () => {
    const env = process.env.NODE_ENV || "development";
    const isDevelopment = env === "development";
    return isDevelopment ? "debug" : "warn";
};
// Define format for logs
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
// Define transports
const transports = [
    // Console transport
    new winston_1.default.transports.Console(),
    // File transport for errors
    new winston_1.default.transports.File({
        filename: path_1.default.join("logs", "error.log"),
        level: "error",
    }),
    // File transport for all logs
    new winston_1.default.transports.File({
        filename: path_1.default.join("logs", "combined.log"),
    }),
];
// Create the logger
exports.logger = winston_1.default.createLogger({
    level: level(),
    levels,
    format,
    transports,
    exitOnError: false,
});
// Create a stream object for Morgan HTTP logger
exports.morganStream = {
    write: (message) => {
        exports.logger.http(message.trim());
    },
};
// Helper functions for logging
const logError = (message, error) => {
    exports.logger.error(message, error);
};
exports.logError = logError;
const logInfo = (message) => {
    exports.logger.info(message);
};
exports.logInfo = logInfo;
const logWarn = (message) => {
    exports.logger.warn(message);
};
exports.logWarn = logWarn;
const logDebug = (message) => {
    exports.logger.debug(message);
};
exports.logDebug = logDebug;
