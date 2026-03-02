// src/utils/logger.ts
import winston from "winston";
import path from "path";

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

winston.addColors(colors);

const level = () => {
  const env = process.env.NODE_ENV || "development";
  return env === "development" ? "debug" : "warn";
};

const format = winston.format.combine(
  winston.format.timestamp({ format: "YYYY-MM-DD HH:mm:ss:ms" }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

const transports: winston.transport[] = [new winston.transports.Console()];

if (process.env.NODE_ENV !== "production") {
  transports.push(
    new winston.transports.File({
      filename: path.join("logs", "error.log"),
      level: "error",
    }),
    new winston.transports.File({
      filename: path.join("logs", "combined.log"),
    }),
  );
}

export const logger = winston.createLogger({
  level: level(),
  levels,
  format,
  transports,
  exitOnError: false,
});

export const morganStream = {
  write: (message: string) => {
    logger.http(message.trim());
  },
};

export const logError = (message: string, error?: any) => {
  logger.error(message, error);
};

export const logInfo = (message: string) => {
  logger.info(message);
};

export const logWarn = (message: string) => {
  logger.warn(message);
};

export const logDebug = (message: string) => {
  logger.debug(message);
};
