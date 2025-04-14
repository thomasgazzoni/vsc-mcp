import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { isPathAllowed } from "../utils/file-utils.js";

export const writeFileTool = {
  name: "write_file",
  description:
    "Creates a new file or overwrites an existing file with the provided content.",
  paramsSchema: {
    filePath: z.string().describe("Path to the file to create or overwrite"),
    newContent: z.string().describe("Content to write to the file"),
  },
};

export function writeFilePrompts(
  params: { filePath: string; newContent: string }
) {
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Write content to file ${params.filePath}. The file will be created if it doesn't exist or overwritten if it does.`,
        },
      },
    ],
  };
}

export async function writeFileHandler({
  filePath,
  newContent,
}: {
  filePath: string;
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
    
    // Create directory if it doesn't exist
    const directory = path.dirname(absolutePath);
    if (!fs.existsSync(directory)) {
      // Check if the directory path is allowed
      const dirPathCheck = isPathAllowed(directory);
      if (!dirPathCheck.allowed) {
        return {
          isError: true,
          content: [
            {
              type: "text" as const,
              text: dirPathCheck.error || "Access denied: Directory path is not within allowed directories",
            },
          ],
        };
      }
      
      fs.mkdirSync(directory, { recursive: true });
      logger.info(`Created directory: ${directory}`);
    }

    // Write the file
    fs.writeFileSync(absolutePath, newContent, "utf-8");
    
    const fileExists = fs.existsSync(absolutePath);
    const fileSize = fileExists ? fs.statSync(absolutePath).size : 0;

    logger.info(`File written successfully: ${absolutePath} (${fileSize} bytes)`);

    return {
      content: [
        {
          type: "text" as const,
          mimeType: "application/json",
          text: JSON.stringify({
            success: true,
            filePath: absolutePath,
            fileSize,
            action: fileExists ? "overwritten" : "created",
          }),
        },
      ],
    };
  } catch (error) {
    logger.error(`Error writing file: ${error instanceof Error ? error.message : String(error)}`);
    return {
      isError: true,
      content: [
        {
          type: "text" as const,
          text: `Error writing file: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
    };
  }
}
