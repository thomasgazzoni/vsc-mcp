import * as path from "path";
import { logger } from "./logger.js";

/**
 * Checks if a file path is within allowed directories
 * @param filePath The absolute file path to check
 * @returns An object indicating if the path is allowed and an error message if not
 */
export function isPathAllowed(filePath: string): { allowed: boolean; error?: string } {
  // Get allowed directories from environment variables
  // Format: comma-separated list of directories
  const allowedDirsEnv = process.env.ALLOWED_DIRECTORIES;
  
  // If no allowed directories are specified, default to the current working directory
  if (!allowedDirsEnv) {
    logger.warn("ALLOWED_DIRECTORIES environment variable not set, defaulting to current working directory");
    const cwd = process.cwd();
    return isPathWithinDirectory(filePath, cwd);
  }
  
  // Split the comma-separated list of directories
  const allowedDirs = allowedDirsEnv.split(",").map(dir => dir.trim());
  
  // If the list is empty, default to the current working directory
  if (allowedDirs.length === 0) {
    logger.warn("ALLOWED_DIRECTORIES environment variable is empty, defaulting to current working directory");
    const cwd = process.cwd();
    return isPathWithinDirectory(filePath, cwd);
  }
  
  // Check if the file path is within any of the allowed directories
  for (const dir of allowedDirs) {
    const result = isPathWithinDirectory(filePath, dir);
    if (result.allowed) {
      return result;
    }
  }
  
  // If we get here, the path is not within any allowed directory
  return {
    allowed: false,
    error: `Access denied: ${filePath} is not within allowed directories: ${allowedDirs.join(", ")}`
  };
}

/**
 * Checks if a file path is within a specific directory
 * @param filePath The absolute file path to check
 * @param directory The directory to check against
 * @returns An object indicating if the path is within the directory and an error message if not
 */
function isPathWithinDirectory(filePath: string, directory: string): { allowed: boolean; error?: string } {
  // Normalize paths to handle different path formats
  const normalizedFilePath = path.normalize(filePath);
  const normalizedDirectory = path.normalize(directory);
  
  // Check if the normalized file path starts with the normalized directory
  // We need to ensure it's a proper subdirectory by checking for path separators
  if (normalizedFilePath === normalizedDirectory || 
      normalizedFilePath.startsWith(normalizedDirectory + path.sep)) {
    return { allowed: true };
  }
  
  return {
    allowed: false,
    error: `Access denied: ${filePath} is not within directory: ${directory}`
  };
}
