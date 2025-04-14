import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { isPathAllowed } from "../utils/file-utils.js";

export const searchReplaceFileTool = {
  name: "search_replace_file",
  description:
    "Searches for content in a file and replaces it with new content, ignoring whitespace differences.",
  paramsSchema: {
    filePath: z.string().describe("Path to the file to modify"),
    oldContent: z.string().describe("Content to search for (whitespace differences are ignored)"),
    newContent: z.string().describe("Content to replace the old content with"),
  },
};

export function searchReplaceFilePrompts(
  params: { filePath: string; oldContent: string; newContent: string }
) {
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Search for content in file ${params.filePath} and replace it with new content. Whitespace differences will be ignored when searching.`,
        },
      },
    ],
  };
}

/**
 * Normalizes whitespace in a string to make whitespace-insensitive comparisons
 * @param text The text to normalize
 * @returns Normalized text with consistent whitespace
 */
function normalizeWhitespace(text: string): string {
  // Replace all whitespace sequences (spaces, tabs, newlines) with a single space
  return text.replace(/\s+/g, ' ').trim();
}

export async function searchReplaceFileHandler({
  filePath,
  oldContent,
  newContent,
}: {
  filePath: string;
  oldContent: string;
  newContent: string;
}) {
  try {
    const absolutePath = path.resolve(filePath);
    
    // Check if the path is allowed
    const pathCheck = isPathAllowed(absolutePath);
    if (!pathCheck.allowed) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: pathCheck.error || "Access denied: File path is not within allowed directories",
          },
        ],
      };
    }
    
    if (!fs.existsSync(absolutePath)) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `File not found: ${absolutePath}`,
          },
        ],
      };
    }

    // Read the file content
    const fileContent = fs.readFileSync(absolutePath, "utf-8");
    
    // Normalize the old content for comparison
    const normalizedOldContent = normalizeWhitespace(oldContent);
    
    // Create a regex pattern that will match the normalized pattern
    // but with flexible whitespace
    const escapeRegExp = (string: string) => {
      return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    };
    
    // Convert the normalized content back to a regex pattern
    // that allows for flexible whitespace
    const pattern = normalizedOldContent
      .split(' ')
      .map(part => escapeRegExp(part))
      .join('\\s+');
    
    const regex = new RegExp(pattern, 'g');
    
    // Check if the pattern exists in the file
    if (!regex.test(fileContent)) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Content not found in file: ${absolutePath}. The search is whitespace-insensitive, but the content must otherwise match exactly.`,
          },
        ],
      };
    }
    
    // Reset regex lastIndex
    regex.lastIndex = 0;
    
    // Replace the content
    const newFileContent = fileContent.replace(regex, newContent);
    
    // Write the updated content back to the file
    fs.writeFileSync(absolutePath, newFileContent, "utf-8");
    
    // Count the number of replacements
    const replacementCount = (fileContent.match(regex) || []).length;
    
    logger.info(`Successfully replaced ${replacementCount} occurrences in file: ${absolutePath}`);

    return {
      content: [
        {
          type: "text" as const,
          mimeType: "application/json",
          text: JSON.stringify({
            success: true,
            filePath: absolutePath,
            replacementCount,
          }),
        },
      ],
    };
  } catch (error) {
    logger.error(`Error replacing content in file: ${error instanceof Error ? error.message : String(error)}`);
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Error replacing content in file: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}
