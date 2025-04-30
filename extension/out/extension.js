"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.activate = activate;
// extension.ts
const net = __importStar(require("net"));
const path = __importStar(require("path"));
const vscode = __importStar(require("vscode"));
const node_1 = require("vscode-languageserver/node");
// Configuration
const PORT = vscode.workspace.getConfiguration("vscMcp").get("port", 5007);
let output;
/**
 * Simple logging function
 */
function log(message) {
    const line = `${new Date().toISOString()}  ${message}`;
    output.appendLine(line);
    console.log(line); // keep Debug Console
}
/**
 * Convert VS Code diagnostic to LSP diagnostic
 */
function convertDiagnostic(vsDiagnostic) {
    try {
        return {
            range: {
                start: {
                    line: vsDiagnostic.range.start.line,
                    character: vsDiagnostic.range.start.character,
                },
                end: {
                    line: vsDiagnostic.range.end.line,
                    character: vsDiagnostic.range.end.character,
                },
            },
            message: vsDiagnostic.message,
            severity: mapDiagnosticSeverity(vsDiagnostic.severity),
            source: vsDiagnostic.source ?? "VSCode",
            code: `${vsDiagnostic.code}`,
        };
    }
    catch (error) {
        log(`ERROR in convertDiagnostic: ${error instanceof Error ? error.message : String(error)}`);
        return {
            range: {
                start: { line: 0, character: 0 },
                end: { line: 0, character: 0 },
            },
            message: vsDiagnostic.message || "Error converting diagnostic",
            severity: node_1.DiagnosticSeverity.Error,
            source: "VSCode",
        };
    }
}
/**
 * Map VS Code diagnostic severity to LSP diagnostic severity
 */
function mapDiagnosticSeverity(severity) {
    try {
        switch (severity) {
            case vscode.DiagnosticSeverity.Error:
                return node_1.DiagnosticSeverity.Error;
            case vscode.DiagnosticSeverity.Warning:
                return node_1.DiagnosticSeverity.Warning;
            case vscode.DiagnosticSeverity.Information:
                return node_1.DiagnosticSeverity.Information;
            case vscode.DiagnosticSeverity.Hint:
                return node_1.DiagnosticSeverity.Hint;
            default:
                return node_1.DiagnosticSeverity.Information;
        }
    }
    catch (error) {
        log(`ERROR in mapDiagnosticSeverity: ${error instanceof Error ? error.message : String(error)}`);
        return node_1.DiagnosticSeverity.Information;
    }
}
/**
 * Map VS Code symbol kind to LSP symbol kind
 */
function mapSymbolKind(kind) {
    try {
        switch (kind) {
            case vscode.SymbolKind.File:
                return node_1.SymbolKind.File;
            case vscode.SymbolKind.Module:
                return node_1.SymbolKind.Module;
            case vscode.SymbolKind.Namespace:
                return node_1.SymbolKind.Namespace;
            case vscode.SymbolKind.Package:
                return node_1.SymbolKind.Package;
            case vscode.SymbolKind.Class:
                return node_1.SymbolKind.Class;
            case vscode.SymbolKind.Method:
                return node_1.SymbolKind.Method;
            case vscode.SymbolKind.Property:
                return node_1.SymbolKind.Property;
            case vscode.SymbolKind.Field:
                return node_1.SymbolKind.Field;
            case vscode.SymbolKind.Constructor:
                return node_1.SymbolKind.Constructor;
            case vscode.SymbolKind.Enum:
                return node_1.SymbolKind.Enum;
            case vscode.SymbolKind.Interface:
                return node_1.SymbolKind.Interface;
            case vscode.SymbolKind.Function:
                return node_1.SymbolKind.Function;
            case vscode.SymbolKind.Variable:
                return node_1.SymbolKind.Variable;
            case vscode.SymbolKind.Constant:
                return node_1.SymbolKind.Constant;
            case vscode.SymbolKind.String:
                return node_1.SymbolKind.String;
            case vscode.SymbolKind.Number:
                return node_1.SymbolKind.Number;
            case vscode.SymbolKind.Boolean:
                return node_1.SymbolKind.Boolean;
            case vscode.SymbolKind.Array:
                return node_1.SymbolKind.Array;
            case vscode.SymbolKind.Object:
                return node_1.SymbolKind.Object;
            case vscode.SymbolKind.Key:
                return node_1.SymbolKind.Key;
            case vscode.SymbolKind.Null:
                return node_1.SymbolKind.Null;
            case vscode.SymbolKind.EnumMember:
                return node_1.SymbolKind.EnumMember;
            case vscode.SymbolKind.Struct:
                return node_1.SymbolKind.Struct;
            case vscode.SymbolKind.Event:
                return node_1.SymbolKind.Event;
            case vscode.SymbolKind.Operator:
                return node_1.SymbolKind.Operator;
            case vscode.SymbolKind.TypeParameter:
                return node_1.SymbolKind.TypeParameter;
            default:
                return node_1.SymbolKind.Variable; // Default fallback
        }
    }
    catch (error) {
        log(`ERROR in mapSymbolKind: ${error instanceof Error ? error.message : String(error)}`);
        return node_1.SymbolKind.Variable; // Default fallback
    }
}
/**
 * Class to manage a language server connection
 */
class LanguageServerConnection {
    constructor(socket) {
        this.isActive = true;
        this.diagnosticSubscriptions = [];
        this.socket = socket;
        this.connection = (0, node_1.createConnection)(socket, socket);
        // Set up socket event handlers
        this.setupSocketEventHandlers();
        // Set up connection request handlers
        this.setupConnectionHandlers();
        // Start listening
        this.connection.listen();
        log(`Connection is now listening for requests`);
    }
    /**
     * Set up socket event handlers to track connection state
     */
    setupSocketEventHandlers() {
        this.socket.on("close", () => {
            log(`Socket closed, connection is no longer active`);
            this.isActive = false;
            this.cleanupSubscriptions();
        });
        this.socket.on("error", (err) => {
            log(`Socket error: ${err instanceof Error ? err.message : String(err)}`);
            if (err instanceof Error && err.stack) {
                log(`Stack trace: ${err.stack}`);
            }
            this.isActive = false;
        });
    }
    /**
     * Set up connection request handlers
     */
    setupConnectionHandlers() {
        // Handle initialize request
        this.connection.onInitialize(this.handleInitialize.bind(this));
        // Handle document open notification
        this.connection.onDidOpenTextDocument(this.handleDidOpenTextDocument.bind(this));
        // Handle diagnostic request
        this.connection.onRequest("textDocument/diagnostic", this.handleDiagnosticRequest.bind(this));
        // Handle workspace symbol request
        this.connection.onRequest("workspace/symbol", this.handleWorkspaceSymbolRequest.bind(this));
        // Handle document symbol request
        this.connection.onRequest("textDocument/documentSymbol", this.handleDocumentSymbolRequest.bind(this));
        // Handle implementation request
        this.connection.onRequest("textDocument/implementation", this.handleImplementationRequest.bind(this));
        // Handle shutdown
        this.connection.onShutdown(() => {
            log(`Shutting down connection, disposing diagnostic subscriptions`);
            this.cleanupSubscriptions();
        });
    }
    /**
     * Handle initialize request
     */
    handleInitialize(_params) {
        log(`Initializing LSP connection`);
        return {
            capabilities: {
                workspace: {
                    workspaceFolders: {
                        supported: true,
                    },
                },
                workspaceSymbolProvider: {
                    resolveProvider: true,
                },
                textDocumentSync: 1, // open / change / close
                diagnosticProvider: {
                    interFileDependencies: true,
                    workspaceDiagnostics: true,
                },
            },
        };
    }
    /**
     * Handle document open notification
     */
    async handleDidOpenTextDocument(params) {
        try {
            log(`Document opened: ${params.textDocument.uri}`);
            // Mirror the document inside VS Code so its language extension runs
            const doc = await vscode.workspace.openTextDocument(vscode.Uri.parse(params.textDocument.uri));
            const docText = doc.getText();
            log(`Document text: ${docText.substring(0, 10)}`);
            // Set up diagnostic change subscription
            // this.setupDiagnosticChangeSubscription(doc, params.textDocument.uri);
        }
        catch (error) {
            log(`ERROR in handleDidOpenTextDocument: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error && error.stack) {
                log(`Stack trace: ${error.stack}`);
            }
        }
    }
    /**
     * Set up subscription to diagnostic changes for a document
     */
    setupDiagnosticChangeSubscription(doc, uri) {
        const subscription = vscode.languages.onDidChangeDiagnostics((e) => {
            if (!this.isActive)
                return;
            if (e.uris.some((u) => u.toString() === doc.uri.toString())) {
                const updatedDiags = vscode.languages.getDiagnostics(doc.uri);
                log(`Updated diagnostics for ${uri}: ${updatedDiags.length} items`);
                this.sendDiagnostics(uri, updatedDiags);
            }
        });
        this.diagnosticSubscriptions.push(subscription);
    }
    /**
     * Send diagnostics to the client
     */
    sendDiagnostics(uri, diagnostics) {
        try {
            // Check if connection is still active before sending
            if (!this.isActive) {
                log(`Not sending diagnostics for ${uri} - connection is closed`);
                return;
            }
            log(`Sending ${diagnostics.length} diagnostics for ${uri}`);
            this.connection.sendNotification("textDocument/publishDiagnostics", {
                uri: uri,
                diagnostics: diagnostics.map(convertDiagnostic),
            });
        }
        catch (error) {
            log(`ERROR sending diagnostics: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error && error.stack) {
                log(`Stack trace: ${error.stack}`);
            }
            // If we get a "Connection is closed" error, mark the connection as inactive
            if (error instanceof Error &&
                error.message.includes("Connection is closed")) {
                this.isActive = false;
                this.cleanupSubscriptions();
            }
        }
    }
    /**
     * Handle diagnostic request
     */
    async handleDiagnosticRequest(params) {
        try {
            log(`textDocument/diagnostic request received for ${params.textDocument.uri}`);
            const uri = vscode.Uri.parse(params.textDocument.uri);
            // First load the document into memory
            const doc = await vscode.workspace.openTextDocument(uri);
            // Then actually open it in the editor
            await vscode.window.showTextDocument(doc, { preview: false });
            log(`Document opened in editor: ${params.textDocument.uri}`);
            log(`Document text: ${doc.getText().substring(0, 20)}...`);
            // wait for tsserver to start up
            await new Promise((resolve) => setTimeout(resolve, 2000));
            // Get diagnostics from VS Code
            const diagnostics = vscode.languages.getDiagnostics(uri);
            log(`Found ${diagnostics.length} diagnostics for ${params.textDocument.uri}`);
            // Convert diagnostics to LSP format
            const items = diagnostics.map(convertDiagnostic);
            // Log the actual diagnostics for debugging
            if (items.length > 0) {
                log(`Diagnostic details: ${JSON.stringify(items, null, 2)}`);
            }
            log(`Returning ${items.length} diagnostic items for ${params.textDocument.uri}`);
            return { kind: "full", items };
        }
        catch (error) {
            log(`ERROR in handleDiagnosticRequest: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error && error.stack) {
                log(`Stack trace: ${error.stack}`);
            }
            // Return empty diagnostics on error
            return { kind: "full", items: [] };
        }
    }
    /**
     * Handle workspace symbol request
     */
    async handleWorkspaceSymbolRequest(params) {
        try {
            log(`Workspace symbol request received`);
            const query = params.query;
            const symbols = await vscode.commands.executeCommand("vscode.executeWorkspaceSymbolProvider", query);
            if (!symbols) {
                return [];
            }
            log(`Found ${symbols.length} symbols for query ${query}`);
            // Convert VS Code SymbolInformation to LSP WorkspaceSymbol format
            return symbols.map((symbol) => ({
                name: symbol.name,
                kind: mapSymbolKind(symbol.kind),
                location: {
                    uri: symbol.location.uri.toString(),
                    range: {
                        start: {
                            line: symbol.location.range.start.line,
                            character: symbol.location.range.start.character,
                        },
                        end: {
                            line: symbol.location.range.end.line,
                            character: symbol.location.range.end.character,
                        },
                    },
                },
                containerName: symbol.containerName,
            }));
        }
        catch (error) {
            log(`ERROR in handleWorkspaceSymbolRequest: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error && error.stack) {
                log(`Stack trace: ${error.stack}`);
            }
            return [];
        }
    }
    /**
     * Handle document symbol request
     */
    async handleDocumentSymbolRequest(params) {
        try {
            log(`Document symbol request received for ${params.textDocument.uri}`);
            const uri = vscode.Uri.parse(params.textDocument.uri);
            const doc = await vscode.workspace.openTextDocument(uri);
            const symbols = await vscode.commands.executeCommand("vscode.executeDocumentSymbolProvider", doc.uri);
            if (!symbols || symbols.length === 0) {
                return [];
            }
            log(`Found ${symbols.length} symbols for document ${uri}`);
            // Convert VS Code DocumentSymbol or SymbolInformation to LSP DocumentSymbol format
            return symbols.map((symbol) => {
                if ("children" in symbol) {
                    // It's a DocumentSymbol
                    return this.convertDocumentSymbol(symbol);
                }
                else {
                    // It's a SymbolInformation
                    return {
                        name: symbol.name,
                        kind: mapSymbolKind(symbol.kind),
                        range: {
                            start: {
                                line: symbol.location.range.start.line,
                                character: symbol.location.range.start.character,
                            },
                            end: {
                                line: symbol.location.range.end.line,
                                character: symbol.location.range.end.character,
                            },
                        },
                        selectionRange: {
                            start: {
                                line: symbol.location.range.start.line,
                                character: symbol.location.range.start.character,
                            },
                            end: {
                                line: symbol.location.range.end.line,
                                character: symbol.location.range.end.character,
                            },
                        },
                        children: [],
                    };
                }
            });
        }
        catch (error) {
            log(`ERROR in handleDocumentSymbolRequest: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error && error.stack) {
                log(`Stack trace: ${error.stack}`);
            }
            return [];
        }
    }
    /**
     * Handle implementation request
     */
    async handleImplementationRequest(params) {
        try {
            log(`Implementation request received for ${params.textDocument.uri}`);
            const uri = vscode.Uri.parse(params.textDocument.uri);
            const doc = await vscode.workspace.openTextDocument(uri);
            const position = new vscode.Position(params.position.line, params.position.character);
            const implementations = await vscode.commands.executeCommand("vscode.executeImplementationProvider", doc.uri, position);
            if (!implementations) {
                return [];
            }
            log(`Found ${implementations.length} implementations for ${uri}`);
            // Convert VS Code Location to LSP Location format
            return implementations.map((location) => ({
                uri: location.uri.toString(),
                range: {
                    start: {
                        line: location.range.start.line,
                        character: location.range.start.character,
                    },
                    end: {
                        line: location.range.end.line,
                        character: location.range.end.character,
                    },
                },
            }));
        }
        catch (error) {
            log(`ERROR in handleImplementationRequest: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error && error.stack) {
                log(`Stack trace: ${error.stack}`);
            }
            return [];
        }
    }
    /**
     * Convert VS Code DocumentSymbol to LSP DocumentSymbol format
     */
    convertDocumentSymbol(symbol) {
        return {
            name: symbol.name,
            kind: mapSymbolKind(symbol.kind),
            range: {
                start: {
                    line: symbol.range.start.line,
                    character: symbol.range.start.character,
                },
                end: {
                    line: symbol.range.end.line,
                    character: symbol.range.end.character,
                },
            },
            selectionRange: {
                start: {
                    line: symbol.selectionRange.start.line,
                    character: symbol.selectionRange.start.character,
                },
                end: {
                    line: symbol.selectionRange.end.line,
                    character: symbol.selectionRange.end.character,
                },
            },
            children: symbol.children.map((child) => this.convertDocumentSymbol(child)),
        };
    }
    /**
     * Get language ID from file path
     */
    getLanguageIdFromPath(filePath) {
        const ext = path.extname(filePath).toLowerCase();
        switch (ext) {
            case ".ts":
                return "typescript";
            case ".tsx":
                return "typescriptreact";
            case ".js":
                return "javascript";
            case ".jsx":
                return "javascriptreact";
            case ".json":
                return "json";
            case ".html":
                return "html";
            case ".css":
                return "css";
            case ".md":
                return "markdown";
            default:
                return "plaintext";
        }
    }
    /**
     * Clean up all diagnostic subscriptions
     */
    cleanupSubscriptions() {
        for (const subscription of this.diagnosticSubscriptions) {
            subscription.dispose();
        }
        this.diagnosticSubscriptions = [];
    }
    /**
     * Dispose the connection
     */
    dispose() {
        this.isActive = false;
        this.cleanupSubscriptions();
        // Socket will be closed by the server
    }
}
/**
 * Activate the extension
 */
async function activate(ctx) {
    output = vscode.window.createOutputChannel("VSC-MCP");
    // show it automatically when you start, or delay until the first message
    output.show(true);
    ctx.subscriptions.push(output); // auto-dispose on deactivate
    log("Activating VSC-MCP extension");
    try {
        // Start the server
        const server = await startLanguageServer();
        // Add server to subscriptions for cleanup
        ctx.subscriptions.push({
            dispose() {
                log(`Disposing server`);
                server.close();
            },
        });
        log("VSC-MCP extension activated successfully");
    }
    catch (error) {
        log(`ERROR during extension activation: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log(`Stack trace: ${error.stack}`);
        }
        throw error; // Re-throw to show in UI
    }
}
/**
 * Start the language server
 */
async function startLanguageServer() {
    // Create connections set to track active connections
    const connections = new Set();
    // Create server
    const server = net.createServer((socket) => {
        log(`New client connection established`);
        try {
            // Create and track the connection
            const connection = new LanguageServerConnection(socket);
            connections.add(connection);
            // Remove connection when socket closes
            socket.on("close", () => {
                connections.delete(connection);
                log(`Connection removed from tracking, ${connections.size} active connections remaining`);
            });
        }
        catch (error) {
            log(`ERROR in server connection handler: ${error instanceof Error ? error.message : String(error)}`);
            if (error instanceof Error && error.stack) {
                log(`Stack trace: ${error.stack}`);
            }
            socket.end();
        }
    });
    // Set up server error handler
    server.on("error", (error) => {
        log(`Server error: ${error instanceof Error ? error.message : String(error)}`);
        if (error instanceof Error && error.stack) {
            log(`Stack trace: ${error.stack}`);
        }
    });
    // Start listening
    server.listen(PORT, "0.0.0.0", () => {
        log(`LSP server listening on port ${PORT}`);
    });
    // If we're running remotely, get external URI
    try {
        const external = await vscode.env.asExternalUri(vscode.Uri.parse(`http://localhost:${PORT}`));
        log(`Extension server listening at ${external.toString()}`);
    }
    catch (error) {
        log(`ERROR getting external URI: ${error instanceof Error ? error.message : String(error)}`);
    }
    return server;
}
//# sourceMappingURL=extension.js.map