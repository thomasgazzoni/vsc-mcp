import { describe, it, beforeEach, afterEach, expect, vi } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { editSymbolHandler, editSymbolTool } from '../src/tools/edit-symbol.js';
import { 
  createFixture, 
  createJavaScriptTestFile, 
  createTypeScriptTestFile, 
  cleanupFixture 
} from './setup.js';

// Mock the LSP connection
vi.mock('../src/utils/lsp-utils.js', () => {
  return {
    findProjectRoot: () => process.cwd(),
    getLanguageIdFromPath: (filePath: string) => {
      if (filePath.endsWith('.ts')) return 'typescript';
      if (filePath.endsWith('.js')) return 'javascript';
      return 'plaintext';
    },
    getLSPInstance: vi.fn().mockImplementation(() => {
      return {
        connection: {
          sendNotification: vi.fn(),
          sendRequest: vi.fn().mockImplementation((method, params) => {
            // Simulate workspace/symbol request
            if (method === 'workspace/symbol') {
              const query = params.query;
              if (query === 'testFunction') {
                return [{
                  name: 'testFunction',
                  kind: 12, // Function
                  location: {
                    uri: `file://${path.resolve('tests/fixtures/edit-symbol-test/test.js')}`,
                    range: {
                      start: { line: 7, character: 0 },
                      end: { line: 10, character: 1 }
                    }
                  }
                }];
              } else if (query === 'TestClass') {
                return [{
                  name: 'TestClass',
                  kind: 5, // Class
                  location: {
                    uri: `file://${path.resolve('tests/fixtures/edit-symbol-test/test.ts')}`,
                    range: {
                      start: { line: 4, character: 0 },
                      end: { line: 25, character: 1 }
                    }
                  }
                }];
              } else if (query === 'processValue') {
                return [{
                  name: 'processValue',
                  kind: 6, // Method
                  location: {
                    uri: `file://${path.resolve('tests/fixtures/edit-symbol-test/test.ts')}`,
                    range: {
                      start: { line: 15, character: 2 },
                      end: { line: 17, character: 3 }
                    }
                  }
                }];
              } else if (query === 'helperFunction') {
                return [{
                  name: 'helperFunction',
                  kind: 12, // Function
                  location: {
                    uri: `file://${path.resolve('tests/fixtures/edit-symbol-test/test.ts')}`,
                    range: {
                      start: { line: 28, character: 0 },
                      end: { line: 30, character: 1 }
                    }
                  }
                }];
              }
              return [];
            }
            
            // Simulate textDocument/documentSymbol request
            if (method === 'textDocument/documentSymbol') {
              const uri = params.textDocument.uri;
              if (uri.includes('test.js')) {
                return [{
                  name: 'testFunction',
                  kind: 12, // Function
                  range: {
                    start: { line: 7, character: 0 },
                    end: { line: 10, character: 1 }
                  }
                }];
              } else if (uri.includes('test.ts')) {
                return [
                  {
                    name: 'TestClass',
                    kind: 5, // Class
                    range: {
                      start: { line: 4, character: 0 },
                      end: { line: 25, character: 1 }
                    },
                    children: [
                      {
                        name: 'processValue',
                        kind: 6, // Method
                        range: {
                          start: { line: 15, character: 2 },
                          end: { line: 17, character: 3 }
                        }
                      }
                    ]
                  },
                  {
                    name: 'helperFunction',
                    kind: 12, // Function
                    range: {
                      start: { line: 28, character: 0 },
                      end: { line: 30, character: 1 }
                    }
                  }
                ];
              }
              return [];
            }
            
            return null;
          }),
          dispose: vi.fn()
        },
        serverProcess: {
          kill: vi.fn()
        }
      };
    }),
    applyWorkspaceEdit: vi.fn().mockImplementation((edit) => {
      // Actually apply the edit to the test files
      for (const uri in edit.changes) {
        const filePath = uri.replace('file://', '');
        let content = fs.readFileSync(filePath, 'utf-8');
        
        for (const change of edit.changes[uri]) {
          const lines = content.split('\n');
          const startLine = change.range.start.line;
          const startChar = change.range.start.character;
          const endLine = change.range.end.line;
          const endChar = change.range.end.character;
          
          if (startLine === endLine) {
            // Single line edit
            const line = lines[startLine];
            lines[startLine] = line.substring(0, startChar) + change.newText + line.substring(endChar);
          } else {
            // Multi-line edit
            const startLineContent = lines[startLine];
            const endLineContent = lines[endLine];
            
            // Create new content
            const newStartLine = startLineContent.substring(0, startChar) + change.newText;
            
            // Replace the range with the new content
            lines.splice(startLine, endLine - startLine + 1, newStartLine);
          }
          
          content = lines.join('\n');
        }
        
        fs.writeFileSync(filePath, content);
      }
      
      return { changedFiles: Object.keys(edit.changes).length, totalChanges: 1 };
    })
  };
});

describe('editSymbol Tool', () => {
  const fixtureName = 'edit-symbol-test';
  let fixtureDir: string;
  let jsFilePath: string;
  let tsFilePath: string;
  
  beforeEach(() => {
    fixtureDir = createFixture(fixtureName);
    jsFilePath = createJavaScriptTestFile(fixtureDir, 'test.js', 'testFunction');
    tsFilePath = createTypeScriptTestFile(fixtureDir, 'test.ts', 'TestClass');
  });
  
  afterEach(() => {
    cleanupFixture(fixtureName);
    vi.clearAllMocks();
  });
  
  it('should have the correct name and description', () => {
    expect(editSymbolTool.name).toBe('editSymbol');
    expect(editSymbolTool.description).toContain('Edits a symbol');
  });
  
  it('should have the correct parameter schema', () => {
    expect(editSymbolTool.paramsSchema).toHaveProperty('filePath');
    expect(editSymbolTool.paramsSchema).toHaveProperty('name');
    expect(editSymbolTool.paramsSchema).toHaveProperty('type');
    expect(editSymbolTool.paramsSchema).toHaveProperty('newContent');
  });
  
  it('should edit a JavaScript function', async () => {
    const newContent = `function testFunction(param1, param2, param3) {
  console.log("Enhanced processing", param1, param2, param3);
  return param1.length > param2 && param3;
}`;
    
    const result = await editSymbolHandler({
      filePath: jsFilePath,
      name: 'testFunction',
      type: 'function',
      newContent
    });
    
    expect(result).toHaveProperty('content');
    expect(result.content[0].mimeType).toBe('application/json');
    
    // Verify the file was actually modified
    const fileContent = fs.readFileSync(jsFilePath, 'utf-8');
    expect(fileContent).toContain('param3');
    expect(fileContent).toContain('Enhanced processing');
  });
  
  it('should edit a TypeScript class method', async () => {
    const newContent = `  public processValue(input: number, modifier: string = ''): string {
    return this.value + modifier + input.toString();
  }`;
    
    const result = await editSymbolHandler({
      filePath: tsFilePath,
      name: 'processValue',
      type: 'method',
      newContent
    });
    
    expect(result).toHaveProperty('content');
    
    // Verify the file was actually modified
    const fileContent = fs.readFileSync(tsFilePath, 'utf-8');
    expect(fileContent).toContain('modifier: string = \'\'');
    expect(fileContent).toContain('modifier +');
  });
  
  it('should edit a TypeScript standalone function', async () => {
    const newContent = `export function helperFunction(param: string, extraParam: boolean = false): boolean {
  return extraParam ? true : param.length > 0;
}`;
    
    const result = await editSymbolHandler({
      filePath: tsFilePath,
      name: 'helperFunction',
      type: 'function',
      newContent
    });
    
    expect(result).toHaveProperty('content');
    
    // Verify the file was actually modified
    const fileContent = fs.readFileSync(tsFilePath, 'utf-8');
    expect(fileContent).toContain('extraParam: boolean = false');
    expect(fileContent).toContain('extraParam ? true :');
  });
  
  it('should return an error for a non-existent file', async () => {
    const result = await editSymbolHandler({
      filePath: path.join(fixtureDir, 'non-existent.ts'),
      name: 'testFunction',
      type: 'function',
      newContent: 'function testFunction() {}'
    });
    
    expect(result).toHaveProperty('isError', true);
    expect(result.content[0].text).toContain('File not found');
  });
  
  it('should return an error for a non-existent symbol', async () => {
    const result = await editSymbolHandler({
      filePath: jsFilePath,
      name: 'nonExistentFunction',
      type: 'function',
      newContent: 'function nonExistentFunction() {}'
    });
    
    expect(result).toHaveProperty('isError', true);
    expect(result.content[0].text).toContain('not found in file');
  });
});
