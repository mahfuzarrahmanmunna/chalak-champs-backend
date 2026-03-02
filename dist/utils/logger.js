"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.logDebug = exports.logWarn = exports.logInfo = exports.logError = exports.morganStream = exports.logger = void 0;
// src/utils/logger.ts
const winston_1 = __importDefault(require("winston"));
const path_1 = __importDefault(require("path"));
const levels = {
    error: 0,
    warn: 1,
    info: 2,
    http: 3,
    debug: 4,
};
const colors = {
    error: "red",
    warn: "yellow",
    info: "green",
    http: "magenta",
    debug: "white",
};
winston_1.default.addColors(colors);
const level = () => {
    const env = process.env.NODE_ENV || "development";
    return env === "development" ? "debug" : "warn";
};
const format = winston_1.default.format.combine(winston_1.default.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }), winston_1.default.format.colorize({ all: true }), winston_1.default.format.printf((info) => `${info.timestamp} ${info.level}: ${info.message}`));
const transports = [new winston_1.default.transports.Console()];
if (process.env.NODE_ENV !== "production") {
    transports.push(new winston_1.default.transports.File({
        filename: path_1.default.join("logs", "error.log"),
        level: "error",
    }), new winston_1.default.transports.File({
        filename: path_1.default.join("logs", "combined.log"),
    }));
}
exports.logger = winston_1.default.createLogger({
    level: level(),
    levels,
    format,
    transports,
    exitOnError: false,
});
exports.morganStream = {
    write: (message) => {
        exports.logger.http(message.trim());
    },
};
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
