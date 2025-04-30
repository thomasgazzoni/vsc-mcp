import {
  Diagnostic,
  DocumentDiagnosticReport,
  DocumentDiagnosticReportKind,
  DocumentDiagnosticRequest
} from "vscode-languageserver-protocol";
import { z } from "zod";
import { logger } from "../utils/logger.js";
import { setupLSPTool } from "../utils/tool-utils.js";

export const getErrorsTool = {
  name: "get_errors",
  description:
    "Fetches code errors and issues for a specific file using the LSP textDocument/diagnostic API.",
  paramsSchema: {
    filePath: z.string().describe("Path to the file to check for errors"),
  },
};

export function getErrorsPrompts(params: { filePath: string }) {
  return {
    messages: [
      {
        role: "user" as const,
        content: {
          type: "text" as const,
          text: `Get errors and diagnostics for file ${params.filePath}`,
        },
      },
    ],
  };
}

export async function getErrorsHandler({ filePath }: { filePath: string }) {
  return await setupLSPTool(getErrorsTool.name, filePath, async (params) => {
    // Request diagnostics using textDocument/diagnostic
    logger.debug(`Requesting diagnostics using textDocument/diagnostic`);
    const diagnosticsResponse =
      await params.connection.sendRequest<DocumentDiagnosticReport>(
        DocumentDiagnosticRequest.type.method,
        {
          textDocument: { uri: params.fileRelativeUri },
          previousResultId: undefined, // For incremental updates, not needed for first request
        }
      );

    logger.debug(
      `Received diagnostics response: ${JSON.stringify(diagnosticsResponse)}`
    );

    // Extract diagnostics from the response
    let diagnostics: Diagnostic[] = [];

    if (diagnosticsResponse.kind === DocumentDiagnosticReportKind.Full) {
      diagnostics = diagnosticsResponse.items || [];
      logger.debug(
        `Extracted ${diagnostics.length} diagnostics from full report`
      );
    } else {
      logger.debug(`Received unchanged diagnostics report`);
    }

    // Format the diagnostics for better readability
    const formattedDiagnostics = diagnostics.map((diagnostic) => {
      return {
        range: diagnostic.range,
        severity: diagnostic.severity,
        code: diagnostic.code,
        source: diagnostic.source,
        message: diagnostic.message,
        relatedInformation: diagnostic.relatedInformation,
      };
    });

    logger.debug(
      `Returning ${formattedDiagnostics.length} formatted diagnostics`
    );

    return {
      content: [
        {
          type: "text" as const,
          mimeType: "application/json",
          text: JSON.stringify({
            success: true,
            filePath,
            diagnostics: formattedDiagnostics,
            source: "lsp-diagnostic-request",
          }),
        },
      ],
    };
  });
}
