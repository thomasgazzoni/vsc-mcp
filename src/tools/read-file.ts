import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { isPathAllowed } from "../utils/file-utils.js";

export const readFileTool = {
  name: "read_file",
  description:
    "Reads the content of a file.",
  paramsSchema: {
    filePath: z.string().describe("Path to the file to read"),
  },
};

export function readFilePrompts(
  params: { filePath: string }
) {
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Read content from file ${params.filePath}.`,
        },
      },
    ],
  };
}

export async function readFileHandler({
  filePath,
}: {
  filePath: string;
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

    // Check if it's a directory
    if (fs.statSync(absolutePath).isDirectory()) {
      return {
        isError: true,
        content: [
          {
            type: "text" as const,
            text: `Cannot read directory as a file: ${absolutePath}`,
          },
        ],
      };
    }

    // Read the file content
    const fileContent = fs.readFileSync(absolutePath, "utf-8");
    const fileSize = fs.statSync(absolutePath).size;
    const fileExtension = path.extname(absolutePath).slice(1);
    
    logger.info(`Successfully read file: ${absolutePath} (${fileSize} bytes)`);

    return {
      content: [
        {
          type: "text" as const,
          mimeType: getMimeType(fileExtension),
          text: fileContent,
        },
      ],
    };
  } catch (error) {
    logger.error(`Error reading file: ${error instanceof Error ? error.message : String(error)}`);
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Error reading file: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}

/**
 * Get the MIME type based on file extension
 */
function getMimeType(extension: string): string {
  const mimeTypes: Record<string, string> = {
    // Text files
    'txt': 'text/plain',
    'md': 'text/markdown',
    'html': 'text/html',
    'htm': 'text/html',
    'css': 'text/css',
    
    // Programming languages
    'js': 'application/javascript',
    'ts': 'application/typescript',
    'jsx': 'application/javascript',
    'tsx': 'application/typescript',
    'json': 'application/json',
    'py': 'text/x-python',
    'java': 'text/x-java',
    'c': 'text/x-c',
    'cpp': 'text/x-c++',
    'cs': 'text/x-csharp',
    'go': 'text/x-go',
    'rb': 'text/x-ruby',
    'php': 'text/x-php',
    'swift': 'text/x-swift',
    'rs': 'text/x-rust',
    
    // Config files
    'xml': 'application/xml',
    'yaml': 'text/yaml',
    'yml': 'text/yaml',
    'toml': 'text/toml',
    'ini': 'text/plain',
    'env': 'text/plain',
    
    // Other common formats
    'csv': 'text/csv',
    'svg': 'image/svg+xml',
  };
  
  return mimeTypes[extension.toLowerCase()] || 'text/plain';
}
