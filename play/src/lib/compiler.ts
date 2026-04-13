/**
 * Apogee compiler — ported to TypeScript for browser/Edge execution.
 * Lexer → Parser → Type Checker → Python Emitter
 */

// ── Token types ──

export enum TokenKind {
  INT_LIT, FLOAT_LIT, STRING_LIT, BOOL_LIT,
  IDENT, BACKTICK_IDENT,
  FN, TYPE, SPAWN, LET, FROM, WHERE, INTENT,
  IF, ELSE, RETURN, IMPORT, ASYNC, AWAIT, NULL, TRUE, FALSE, IN, FOR, WHILE, MATCH,
  PLUS, MINUS, STAR, SLASH, PERCENT,
  EQ, EQEQ, NEQ, LT, GT, LTE, GTE, AND, OR, NOT,
  ARROW, FAT_ARROW, QUESTION, DOT, COMMA, COLON, SEMICOLON,
  LPAREN, RPAREN, LBRACE, RBRACE, LBRACKET, RBRACKET, AT, PIPE,
  NEWLINE, EOF,
}

const KEYWORDS: Record<string, TokenKind> = {
  fn: TokenKind.FN, type: TokenKind.TYPE, spawn: TokenKind.SPAWN, let: TokenKind.LET,
  from: TokenKind.FROM, where: TokenKind.WHERE,
  if: TokenKind.IF, else: TokenKind.ELSE, return: TokenKind.RETURN,
  import: TokenKind.IMPORT, async: TokenKind.ASYNC, await: TokenKind.AWAIT,
  null: TokenKind.NULL, true: TokenKind.TRUE, false: TokenKind.FALSE,
  in: TokenKind.IN, for: TokenKind.FOR, while: TokenKind.WHILE, match: TokenKind.MATCH,
};

interface Token {
  kind: TokenKind;
  value: string;
  line: number;
  col: number;
}

// ── Compiler Error ──

export interface CompilerError {
  msg: string;
  line: number;
  col: number;
  suggestion?: string;
  phase: "lex" | "parse" | "type";
}

// ── Lexer ──

class Lexer {
  private pos = 0;
  private line = 1;
  private col = 1;
  private tokens: Token[] = [];

  constructor(private source: string) {}

  private peek(): string {
    return this.pos < this.source.length ? this.source[this.pos] : "\0";
  }
  private peekNext(): string {
    return this.pos + 1 < this.source.length ? this.source[this.pos + 1] : "\0";
  }
  private advance(): string {
    const ch = this.source[this.pos++];
    if (ch === "\n") { this.line++; this.col = 1; } else { this.col++; }
    return ch;
  }
  private emit(kind: TokenKind, value: string, line: number, col: number) {
    this.tokens.push({ kind, value, line, col });
  }
  private skipWhitespaceAndComments() {
    while (this.pos < this.source.length) {
      const ch = this.peek();
      if (ch === " " || ch === "\t" || ch === "\r") { this.advance(); continue; }
      if (ch === "/" && this.peekNext() === "/") {
        while (this.pos < this.source.length && this.peek() !== "\n") this.advance();
        continue;
      }
      if (ch === "/" && this.peekNext() === "*") {
        this.advance(); this.advance();
        let depth = 1;
        while (this.pos < this.source.length && depth > 0) {
          if (this.peek() === "/" && this.peekNext() === "*") { depth++; this.advance(); this.advance(); }
          else if (this.peek() === "*" && this.peekNext() === "/") { depth--; this.advance(); this.advance(); }
          else this.advance();
        }
        continue;
      }
      break;
    }
  }

  tokenize(): Token[] {
    while (this.pos < this.source.length) {
      this.skipWhitespaceAndComments();
      if (this.pos >= this.source.length) break;
      const line = this.line, col = this.col;
      const ch = this.peek();

      if (ch === "\n") { this.advance(); this.emit(TokenKind.NEWLINE, "\\n", line, col); continue; }

      if (ch === '"') { this.readString(line, col); continue; }

      if (ch === '`') {
        this.advance();
        let buf = "";
        while (this.pos < this.source.length && this.peek() !== '`') buf += this.advance();
        if (this.pos >= this.source.length) throw this.err("Unterminated backtick identifier", line, col);
        this.advance();
        this.emit(TokenKind.BACKTICK_IDENT, buf, line, col);
        continue;
      }

      if (ch >= "0" && ch <= "9") {
        let num = "";
        let isFloat = false;
        while (this.pos < this.source.length && ((this.peek() >= "0" && this.peek() <= "9") || this.peek() === ".")) {
          if (this.peek() === ".") {
            if (isFloat || !(this.peekNext() >= "0" && this.peekNext() <= "9")) break;
            isFloat = true;
          }
          num += this.advance();
        }
        this.emit(isFloat ? TokenKind.FLOAT_LIT : TokenKind.INT_LIT, num, line, col);
        continue;
      }

      if ((ch >= "a" && ch <= "z") || (ch >= "A" && ch <= "Z") || ch === "_") {
        let ident = "";
        while (this.pos < this.source.length && ((this.peek() >= "a" && this.peek() <= "z") || (this.peek() >= "A" && this.peek() <= "Z") || (this.peek() >= "0" && this.peek() <= "9") || this.peek() === "_"))
          ident += this.advance();
        if (ident === "true" || ident === "false") this.emit(TokenKind.BOOL_LIT, ident, line, col);
        else this.emit(KEYWORDS[ident] ?? TokenKind.IDENT, ident, line, col);
        continue;
      }

      if (ch === "@") {
        this.advance();
        let ident = "";
        while (this.pos < this.source.length && ((this.peek() >= "a" && this.peek() <= "z") || (this.peek() >= "A" && this.peek() <= "Z") || this.peek() === "_"))
          ident += this.advance();
        if (ident === "intent") this.emit(TokenKind.INTENT, "@intent", line, col);
        else { this.emit(TokenKind.AT, "@", line, col); this.emit(TokenKind.IDENT, ident, line, col); }
        continue;
      }

      // Two-char operators
      this.advance();
      switch (ch) {
        case "+": this.emit(TokenKind.PLUS, "+", line, col); break;
        case "*": this.emit(TokenKind.STAR, "*", line, col); break;
        case "%": this.emit(TokenKind.PERCENT, "%", line, col); break;
        case ".": this.emit(TokenKind.DOT, ".", line, col); break;
        case ",": this.emit(TokenKind.COMMA, ",", line, col); break;
        case ":": this.emit(TokenKind.COLON, ":", line, col); break;
        case ";": this.emit(TokenKind.SEMICOLON, ";", line, col); break;
        case "(": this.emit(TokenKind.LPAREN, "(", line, col); break;
        case ")": this.emit(TokenKind.RPAREN, ")", line, col); break;
        case "{": this.emit(TokenKind.LBRACE, "{", line, col); break;
        case "}": this.emit(TokenKind.RBRACE, "}", line, col); break;
        case "[": this.emit(TokenKind.LBRACKET, "[", line, col); break;
        case "]": this.emit(TokenKind.RBRACKET, "]", line, col); break;
        case "|":
          if (this.peek() === "|") { this.advance(); this.emit(TokenKind.OR, "||", line, col); }
          else this.emit(TokenKind.PIPE, "|", line, col);
          break;
        case "&":
          if (this.peek() === "&") { this.advance(); this.emit(TokenKind.AND, "&&", line, col); }
          break;
        case "?": this.emit(TokenKind.QUESTION, "?", line, col); break;
        case "/": this.emit(TokenKind.SLASH, "/", line, col); break;
        case "-":
          if (this.peek() === ">") { this.advance(); this.emit(TokenKind.ARROW, "->", line, col); }
          else this.emit(TokenKind.MINUS, "-", line, col);
          break;
        case "=":
          if (this.peek() === "=") { this.advance(); this.emit(TokenKind.EQEQ, "==", line, col); }
          else if (this.peek() === ">") { this.advance(); this.emit(TokenKind.FAT_ARROW, "=>", line, col); }
          else this.emit(TokenKind.EQ, "=", line, col);
          break;
        case "!":
          if (this.peek() === "=") { this.advance(); this.emit(TokenKind.NEQ, "!=", line, col); }
          else this.emit(TokenKind.NOT, "!", line, col);
          break;
        case "<":
          if (this.peek() === "=") { this.advance(); this.emit(TokenKind.LTE, "<=", line, col); }
          else this.emit(TokenKind.LT, "<", line, col);
          break;
        case ">":
          if (this.peek() === "=") { this.advance(); this.emit(TokenKind.GTE, ">=", line, col); }
          else this.emit(TokenKind.GT, ">", line, col);
          break;
        default:
          throw this.err(`Unexpected character: ${ch}`, line, col);
      }
    }
    this.emit(TokenKind.EOF, "", this.line, this.col);
    return this.tokens;
  }

  private readString(startLine: number, startCol: number) {
    this.advance(); // skip "
    let buf = "";
    while (this.pos < this.source.length && this.peek() !== '"') {
      if (this.peek() === "\\") {
        this.advance();
        const esc = this.peek();
        if (esc === "n") { buf += "\n"; this.advance(); }
        else if (esc === "t") { buf += "\t"; this.advance(); }
        else if (esc === "\\") { buf += "\\"; this.advance(); }
        else if (esc === '"') { buf += '"'; this.advance(); }
        else if (esc === "(") {
          buf += "\\(";
          this.advance();
          let depth = 1;
          while (this.pos < this.source.length && depth > 0) {
            const c = this.peek();
            if (c === "(") depth++;
            else if (c === ")") { depth--; if (depth === 0) { buf += ")"; this.advance(); continue; } }
            buf += c;
            this.advance();
          }
        }
        else { buf += esc; this.advance(); }
      } else if (this.peek() === "\n") {
        throw this.err("Unterminated string literal", startLine, startCol);
      } else {
        buf += this.advance();
      }
    }
    if (this.pos >= this.source.length) throw this.err("Unterminated string literal", startLine, startCol);
    this.advance(); // skip closing "
    this.emit(TokenKind.STRING_LIT, buf, startLine, startCol);
  }

  private err(msg: string, line: number, col: number): CompilerError {
    return { msg, line, col, phase: "lex" };
  }
}

// ── AST Nodes ──

interface ASTNode { line: number; col: number; }

// Types
interface SimpleType extends ASTNode { kind: "SimpleType"; name: string; }
interface NullableType extends ASTNode { kind: "NullableType"; inner: TypeNode; }
interface ConstraintType extends ASTNode { kind: "ConstraintType"; base: TypeNode; paramName: string; constraint: Expr; }
interface ListTypeNode extends ASTNode { kind: "ListType"; element: TypeNode; }
interface FunctionTypeNode extends ASTNode { kind: "FunctionType"; params: TypeNode[]; ret: TypeNode; }
type TypeNode = SimpleType | NullableType | ConstraintType | ListTypeNode | FunctionTypeNode;

// Expressions
interface IntLit extends ASTNode { kind: "IntLit"; value: number; resolvedType?: TypeNode; }
interface FloatLit extends ASTNode { kind: "FloatLit"; value: number; resolvedType?: TypeNode; }
interface StringLit extends ASTNode { kind: "StringLit"; value: string; interpolations: [number, string][]; resolvedType?: TypeNode; }
interface BoolLit extends ASTNode { kind: "BoolLit"; value: boolean; resolvedType?: TypeNode; }
interface NullLit extends ASTNode { kind: "NullLit"; resolvedType?: TypeNode; }
interface Ident extends ASTNode { kind: "Ident"; name: string; resolvedType?: TypeNode; }
interface BinaryOp extends ASTNode { kind: "BinaryOp"; op: string; left: Expr; right: Expr; resolvedType?: TypeNode; }
interface UnaryOp extends ASTNode { kind: "UnaryOp"; op: string; operand: Expr; resolvedType?: TypeNode; }
interface CallExpr extends ASTNode { kind: "CallExpr"; callee: Expr; args: Expr[]; resolvedType?: TypeNode; }
interface MemberExpr extends ASTNode { kind: "MemberExpr"; obj: Expr; member: string; resolvedType?: TypeNode; }
interface IndexExpr extends ASTNode { kind: "IndexExpr"; obj: Expr; index: Expr; resolvedType?: TypeNode; }
interface StructLit extends ASTNode { kind: "StructLit"; typeName: string; fields: [string, Expr][]; resolvedType?: TypeNode; }
interface ListLit extends ASTNode { kind: "ListLit"; elements: Expr[]; resolvedType?: TypeNode; }
interface QueryExpr extends ASTNode { kind: "QueryExpr"; source: Expr; itemName: string; condition: Expr | null; resolvedType?: TypeNode; }
interface SpawnExpr extends ASTNode { kind: "SpawnExpr"; tasks: Expr[]; resolvedType?: TypeNode; }
interface IfExpr extends ASTNode { kind: "IfExpr"; condition: Expr; thenBranch: Expr; elseBranch: Expr | null; resolvedType?: TypeNode; }
interface BlockExpr extends ASTNode { kind: "BlockExpr"; stmts: Stmt[]; finalExpr: Expr | null; resolvedType?: TypeNode; }
interface NullCheck extends ASTNode { kind: "NullCheck"; inner: Expr; resolvedType?: TypeNode; }
interface AwaitExpr extends ASTNode { kind: "AwaitExpr"; inner: Expr; resolvedType?: TypeNode; }
interface MatchExpr extends ASTNode { kind: "MatchExpr"; subject: Expr; arms: [Expr, Expr][]; resolvedType?: TypeNode; }
type Expr = IntLit | FloatLit | StringLit | BoolLit | NullLit | Ident | BinaryOp | UnaryOp | CallExpr | MemberExpr | IndexExpr | StructLit | ListLit | QueryExpr | SpawnExpr | IfExpr | BlockExpr | NullCheck | AwaitExpr | MatchExpr;

// Statements
interface Param { name: string; typeAnn: TypeNode | null; dflt: Expr | null; line: number; col: number; }
interface FnDecl extends ASTNode { kind: "FnDecl"; name: string; params: Param[]; returnType: TypeNode | null; body: BlockExpr; isAsync: boolean; intent: string | null; }
interface TypeField { name: string; typeAnn: TypeNode; dflt: Expr | null; line: number; col: number; }
interface TypeDecl extends ASTNode { kind: "TypeDecl"; name: string; fields: TypeField[]; }
interface LetStmt extends ASTNode { kind: "LetStmt"; name: string; typeAnn: TypeNode | null; value: Expr; }
interface ExprStmt extends ASTNode { kind: "ExprStmt"; expr: Expr; }
interface ReturnStmt extends ASTNode { kind: "ReturnStmt"; value: Expr | null; }
interface ImportStmt extends ASTNode { kind: "ImportStmt"; module: string; }
interface ForStmt extends ASTNode { kind: "ForStmt"; varName: string; iterable: Expr; body: BlockExpr; }
interface WhileStmt extends ASTNode { kind: "WhileStmt"; condition: Expr; body: BlockExpr; }
interface IfStmt extends ASTNode { kind: "IfStmt"; condition: Expr; thenBody: BlockExpr; elseBody: BlockExpr | IfStmt | null; }
interface AssignStmt extends ASTNode { kind: "AssignStmt"; target: Expr; value: Expr; }
type Stmt = FnDecl | TypeDecl | LetStmt | ExprStmt | ReturnStmt | ImportStmt | ForStmt | WhileStmt | IfStmt | AssignStmt;

interface Program { stmts: Stmt[]; }

// ── Parser ──

class Parser {
  private pos = 0;
  constructor(private tokens: Token[]) {}

  private peek(): Token { return this.tokens[this.pos]; }
  private at(kind: TokenKind): boolean { return this.peek().kind === kind; }
  private atAny(...kinds: TokenKind[]): boolean { return kinds.includes(this.peek().kind); }
  private advance(): Token { return this.tokens[this.pos++]; }
  private expect(kind: TokenKind, msg?: string): Token {
    const t = this.peek();
    if (t.kind !== kind) throw this.err(msg || `Expected ${TokenKind[kind]}, got ${TokenKind[t.kind]}`, t.line, t.col);
    return this.advance();
  }
  private match(kind: TokenKind): Token | null { return this.at(kind) ? this.advance() : null; }
  private skipNL() { while (this.at(TokenKind.NEWLINE)) this.advance(); }
  private skipTerm() { while (this.atAny(TokenKind.NEWLINE, TokenKind.SEMICOLON)) this.advance(); }
  private err(msg: string, line: number, col: number): CompilerError { return { msg, line, col, phase: "parse" }; }

  parse(): Program {
    const stmts: Stmt[] = [];
    this.skipNL();
    while (!this.at(TokenKind.EOF)) { stmts.push(this.parseStmt()); this.skipNL(); }
    return { stmts };
  }

  private parseStmt(): Stmt {
    this.skipNL();
    const t = this.peek();
    if (t.kind === TokenKind.INTENT) return this.parseFnWithIntent();
    if (t.kind === TokenKind.FN) return this.parseFnDecl(false);
    if (t.kind === TokenKind.ASYNC) { this.advance(); return this.parseFnDecl(true); }
    if (t.kind === TokenKind.TYPE) return this.parseTypeDecl();
    if (t.kind === TokenKind.LET) return this.parseLet();
    if (t.kind === TokenKind.RETURN) return this.parseReturn();
    if (t.kind === TokenKind.IMPORT) return this.parseImport();
    if (t.kind === TokenKind.FOR) return this.parseFor();
    if (t.kind === TokenKind.WHILE) return this.parseWhile();
    if (t.kind === TokenKind.IF) return this.parseIfStmt();
    const expr = this.parseExpr();
    if (this.at(TokenKind.EQ)) { this.advance(); const val = this.parseExpr(); this.skipTerm(); return { kind: "AssignStmt", target: expr, value: val, line: t.line, col: t.col }; }
    this.skipTerm();
    return { kind: "ExprStmt", expr, line: t.line, col: t.col };
  }

  private parseFnWithIntent(): FnDecl {
    this.advance(); // @intent
    this.expect(TokenKind.LPAREN);
    const s = this.expect(TokenKind.STRING_LIT);
    this.expect(TokenKind.RPAREN);
    this.skipNL();
    const fn = this.parseFnDecl(false);
    fn.intent = s.value;
    return fn;
  }

  private parseFnDecl(isAsync: boolean): FnDecl {
    const t = this.expect(TokenKind.FN);
    let name: string;
    if (this.at(TokenKind.BACKTICK_IDENT)) name = this.advance().value;
    else name = this.expect(TokenKind.IDENT, "Expected function name").value;
    this.expect(TokenKind.LPAREN);
    const params = this.parseParams();
    this.expect(TokenKind.RPAREN);
    let returnType: TypeNode | null = null;
    if (this.match(TokenKind.ARROW)) returnType = this.parseType();
    const body = this.parseBlock();
    return { kind: "FnDecl", name, params, returnType, body, isAsync, intent: null, line: t.line, col: t.col };
  }

  private parseParams(): Param[] {
    const params: Param[] = [];
    this.skipNL();
    while (!this.at(TokenKind.RPAREN)) {
      const t = this.expect(TokenKind.IDENT);
      let typeAnn: TypeNode | null = null;
      let dflt: Expr | null = null;
      if (this.match(TokenKind.COLON)) typeAnn = this.parseType();
      if (this.match(TokenKind.EQ)) dflt = this.parseExpr();
      params.push({ name: t.value, typeAnn, dflt, line: t.line, col: t.col });
      this.skipNL();
      if (!this.match(TokenKind.COMMA)) break;
      this.skipNL();
    }
    return params;
  }

  private parseTypeDecl(): TypeDecl {
    const t = this.expect(TokenKind.TYPE);
    const name = this.expect(TokenKind.IDENT).value;
    this.skipNL();
    this.expect(TokenKind.LBRACE);
    const fields: TypeField[] = [];
    this.skipNL();
    while (!this.at(TokenKind.RBRACE)) {
      const ft = this.expect(TokenKind.IDENT);
      this.expect(TokenKind.COLON);
      const typeAnn = this.parseType();
      let dflt: Expr | null = null;
      if (this.match(TokenKind.EQ)) dflt = this.parseExpr();
      fields.push({ name: ft.value, typeAnn, dflt, line: ft.line, col: ft.col });
      this.skipNL(); this.match(TokenKind.COMMA); this.skipNL();
    }
    this.expect(TokenKind.RBRACE);
    return { kind: "TypeDecl", name, fields, line: t.line, col: t.col };
  }

  private parseLet(): LetStmt {
    const t = this.advance();
    const name = this.expect(TokenKind.IDENT).value;
    let typeAnn: TypeNode | null = null;
    if (this.match(TokenKind.COLON)) typeAnn = this.parseType();
    this.expect(TokenKind.EQ, `Expected '=' in let binding for '${name}'`);
    const value = this.parseExpr();
    this.skipTerm();
    return { kind: "LetStmt", name, typeAnn, value, line: t.line, col: t.col };
  }

  private parseReturn(): ReturnStmt {
    const t = this.advance();
    let value: Expr | null = null;
    if (!this.atAny(TokenKind.NEWLINE, TokenKind.RBRACE, TokenKind.EOF, TokenKind.SEMICOLON)) value = this.parseExpr();
    this.skipTerm();
    return { kind: "ReturnStmt", value, line: t.line, col: t.col };
  }

  private parseImport(): ImportStmt {
    const t = this.advance();
    let mod = this.expect(TokenKind.IDENT).value;
    while (this.match(TokenKind.DOT)) mod += "." + this.expect(TokenKind.IDENT).value;
    this.skipTerm();
    return { kind: "ImportStmt", module: mod, line: t.line, col: t.col };
  }

  private parseFor(): ForStmt {
    const t = this.advance();
    const varName = this.expect(TokenKind.IDENT).value;
    this.expect(TokenKind.IN);
    const iterable = this.parseExpr();
    const body = this.parseBlock();
    return { kind: "ForStmt", varName, iterable, body, line: t.line, col: t.col };
  }

  private parseWhile(): WhileStmt {
    const t = this.advance();
    const condition = this.parseExpr();
    const body = this.parseBlock();
    return { kind: "WhileStmt", condition, body, line: t.line, col: t.col };
  }

  private parseIfStmt(): IfStmt {
    const t = this.advance();
    const condition = this.parseExpr();
    const thenBody = this.parseBlock();
    let elseBody: BlockExpr | IfStmt | null = null;
    this.skipNL();
    if (this.match(TokenKind.ELSE)) {
      this.skipNL();
      if (this.at(TokenKind.IF)) elseBody = this.parseIfStmt();
      else elseBody = this.parseBlock();
    }
    return { kind: "IfStmt", condition, thenBody, elseBody, line: t.line, col: t.col };
  }

  private parseBlock(): BlockExpr {
    this.skipNL();
    const t = this.expect(TokenKind.LBRACE, "Expected '{' to open block");
    const stmts: Stmt[] = [];
    this.skipNL();
    while (!this.atAny(TokenKind.RBRACE, TokenKind.EOF)) { stmts.push(this.parseStmt()); this.skipNL(); }
    this.expect(TokenKind.RBRACE, "Expected '}' to close block");
    let finalExpr: Expr | null = null;
    if (stmts.length > 0 && stmts[stmts.length - 1].kind === "ExprStmt") {
      finalExpr = (stmts.pop() as ExprStmt).expr;
    }
    return { kind: "BlockExpr", stmts, finalExpr, line: t.line, col: t.col };
  }

  // ── Types ──
  private parseType(): TypeNode {
    const t = this.peek();
    let base: TypeNode;
    if (this.at(TokenKind.LBRACKET)) {
      this.advance();
      const elem = this.parseType();
      this.expect(TokenKind.RBRACKET);
      base = { kind: "ListType", element: elem, line: t.line, col: t.col };
    } else if (this.at(TokenKind.LPAREN)) {
      this.advance();
      const pts: TypeNode[] = [];
      while (!this.at(TokenKind.RPAREN)) { pts.push(this.parseType()); if (!this.match(TokenKind.COMMA)) break; }
      this.expect(TokenKind.RPAREN);
      this.expect(TokenKind.ARROW);
      const ret = this.parseType();
      base = { kind: "FunctionType", params: pts, ret, line: t.line, col: t.col };
    } else {
      const name = this.expect(TokenKind.IDENT, "Expected type name").value;
      base = { kind: "SimpleType", name, line: t.line, col: t.col };
    }
    if (this.at(TokenKind.QUESTION)) { this.advance(); base = { kind: "NullableType", inner: base, line: t.line, col: t.col }; }
    if (this.at(TokenKind.WHERE)) { this.advance(); const constraint = this.parseExpr(); base = { kind: "ConstraintType", base, paramName: "value", constraint, line: t.line, col: t.col }; }
    return base;
  }

  // ── Expressions (precedence climbing) ──
  private parseExpr(): Expr { return this.parseOr(); }
  private parseOr(): Expr {
    let left = this.parseAnd();
    while (this.at(TokenKind.OR)) { const t = this.advance(); left = { kind: "BinaryOp", op: "||", left, right: this.parseAnd(), line: t.line, col: t.col }; }
    return left;
  }
  private parseAnd(): Expr {
    let left = this.parseEquality();
    while (this.at(TokenKind.AND)) { const t = this.advance(); left = { kind: "BinaryOp", op: "&&", left, right: this.parseEquality(), line: t.line, col: t.col }; }
    return left;
  }
  private parseEquality(): Expr {
    let left = this.parseComparison();
    while (this.atAny(TokenKind.EQEQ, TokenKind.NEQ)) { const t = this.advance(); left = { kind: "BinaryOp", op: t.value, left, right: this.parseComparison(), line: t.line, col: t.col }; }
    return left;
  }
  private parseComparison(): Expr {
    let left = this.parseAddition();
    while (this.atAny(TokenKind.LT, TokenKind.GT, TokenKind.LTE, TokenKind.GTE)) { const t = this.advance(); left = { kind: "BinaryOp", op: t.value, left, right: this.parseAddition(), line: t.line, col: t.col }; }
    return left;
  }
  private parseAddition(): Expr {
    let left = this.parseMultiplication();
    while (this.atAny(TokenKind.PLUS, TokenKind.MINUS)) { const t = this.advance(); left = { kind: "BinaryOp", op: t.value, left, right: this.parseMultiplication(), line: t.line, col: t.col }; }
    return left;
  }
  private parseMultiplication(): Expr {
    let left = this.parseUnary();
    while (this.atAny(TokenKind.STAR, TokenKind.SLASH, TokenKind.PERCENT)) { const t = this.advance(); left = { kind: "BinaryOp", op: t.value, left, right: this.parseUnary(), line: t.line, col: t.col }; }
    return left;
  }
  private parseUnary(): Expr {
    if (this.atAny(TokenKind.MINUS, TokenKind.NOT)) { const t = this.advance(); return { kind: "UnaryOp", op: t.value, operand: this.parseUnary(), line: t.line, col: t.col }; }
    return this.parsePostfix();
  }
  private parsePostfix(): Expr {
    let expr = this.parsePrimary();
    while (true) {
      if (this.at(TokenKind.LPAREN)) {
        this.advance();
        const args: Expr[] = [];
        this.skipNL();
        while (!this.at(TokenKind.RPAREN)) { args.push(this.parseExpr()); this.skipNL(); if (!this.match(TokenKind.COMMA)) break; this.skipNL(); }
        this.expect(TokenKind.RPAREN);
        expr = { kind: "CallExpr", callee: expr, args, line: expr.line, col: expr.col };
      } else if (this.at(TokenKind.DOT)) {
        this.advance();
        const m = this.expect(TokenKind.IDENT).value;
        expr = { kind: "MemberExpr", obj: expr, member: m, line: expr.line, col: expr.col };
      } else if (this.at(TokenKind.LBRACKET)) {
        this.advance();
        const idx = this.parseExpr();
        this.expect(TokenKind.RBRACKET);
        expr = { kind: "IndexExpr", obj: expr, index: idx, line: expr.line, col: expr.col };
      } else if (this.at(TokenKind.QUESTION)) {
        this.advance();
        expr = { kind: "NullCheck", inner: expr, line: expr.line, col: expr.col };
      } else break;
    }
    return expr;
  }

  private parsePrimary(): Expr {
    const t = this.peek();
    if (t.kind === TokenKind.INT_LIT) { this.advance(); return { kind: "IntLit", value: parseInt(t.value), line: t.line, col: t.col }; }
    if (t.kind === TokenKind.FLOAT_LIT) { this.advance(); return { kind: "FloatLit", value: parseFloat(t.value), line: t.line, col: t.col }; }
    if (t.kind === TokenKind.STRING_LIT) { this.advance(); return this.processString(t); }
    if (t.kind === TokenKind.BOOL_LIT) { this.advance(); return { kind: "BoolLit", value: t.value === "true", line: t.line, col: t.col }; }
    if (t.kind === TokenKind.NULL) { this.advance(); return { kind: "NullLit", line: t.line, col: t.col }; }
    if (t.kind === TokenKind.IDENT) {
      this.advance();
      if (this.at(TokenKind.LBRACE) && t.value[0] >= "A" && t.value[0] <= "Z") return this.parseStructLit(t);
      return { kind: "Ident", name: t.value, line: t.line, col: t.col };
    }
    if (t.kind === TokenKind.BACKTICK_IDENT) { this.advance(); return { kind: "Ident", name: t.value, line: t.line, col: t.col }; }
    if (t.kind === TokenKind.LPAREN) { this.advance(); const e = this.parseExpr(); this.expect(TokenKind.RPAREN); return e; }
    if (t.kind === TokenKind.LBRACKET) return this.parseListLit();
    if (t.kind === TokenKind.IF) return this.parseIfExpr();
    if (t.kind === TokenKind.FROM) return this.parseQueryExpr();
    if (t.kind === TokenKind.SPAWN) return this.parseSpawnExpr();
    if (t.kind === TokenKind.MATCH) return this.parseMatchExpr();
    if (t.kind === TokenKind.AWAIT) { this.advance(); return { kind: "AwaitExpr", inner: this.parseExpr(), line: t.line, col: t.col }; }
    if (t.kind === TokenKind.LBRACE) return this.parseBlock();
    throw this.err(`Unexpected token: ${TokenKind[t.kind]} (${t.value})`, t.line, t.col);
  }

  private processString(t: Token): StringLit {
    const raw = t.value;
    const interps: [number, string][] = [];
    let i = 0;
    while (i < raw.length) {
      if (raw[i] === "\\" && raw[i + 1] === "(") {
        i += 2; let depth = 1; const start = i;
        while (i < raw.length && depth > 0) { if (raw[i] === "(") depth++; else if (raw[i] === ")") depth--; i++; }
        interps.push([start - 2, raw.substring(start, i - 1)]);
      } else i++;
    }
    return { kind: "StringLit", value: raw, interpolations: interps, line: t.line, col: t.col };
  }

  private parseStructLit(nameToken: Token): StructLit {
    this.advance(); // {
    const fields: [string, Expr][] = [];
    this.skipNL();
    while (!this.at(TokenKind.RBRACE)) {
      const fn = this.expect(TokenKind.IDENT).value;
      this.expect(TokenKind.COLON);
      fields.push([fn, this.parseExpr()]);
      this.skipNL(); if (!this.match(TokenKind.COMMA)) break; this.skipNL();
    }
    this.expect(TokenKind.RBRACE);
    return { kind: "StructLit", typeName: nameToken.value, fields, line: nameToken.line, col: nameToken.col };
  }

  private parseListLit(): ListLit {
    const t = this.advance();
    const elems: Expr[] = [];
    this.skipNL();
    while (!this.at(TokenKind.RBRACKET)) { elems.push(this.parseExpr()); this.skipNL(); if (!this.match(TokenKind.COMMA)) break; this.skipNL(); }
    this.expect(TokenKind.RBRACKET);
    return { kind: "ListLit", elements: elems, line: t.line, col: t.col };
  }

  private parseIfExpr(): IfExpr {
    const t = this.advance();
    const cond = this.parseExpr();
    this.skipNL(); this.expect(TokenKind.LBRACE);
    const then = this.parseExpr();
    this.skipNL(); this.expect(TokenKind.RBRACE);
    let elseBr: Expr | null = null;
    this.skipNL();
    if (this.match(TokenKind.ELSE)) { this.skipNL(); this.expect(TokenKind.LBRACE); elseBr = this.parseExpr(); this.skipNL(); this.expect(TokenKind.RBRACE); }
    return { kind: "IfExpr", condition: cond, thenBranch: then, elseBranch: elseBr, line: t.line, col: t.col };
  }

  private parseQueryExpr(): QueryExpr {
    const t = this.advance();
    const source = this.parseExpr();
    let condition: Expr | null = null;
    if (this.match(TokenKind.WHERE)) condition = this.parseExpr();
    return { kind: "QueryExpr", source, itemName: "it", condition, line: t.line, col: t.col };
  }

  private parseSpawnExpr(): SpawnExpr {
    const t = this.advance();
    this.expect(TokenKind.LBRACE);
    const tasks: Expr[] = [];
    this.skipNL();
    while (!this.at(TokenKind.RBRACE)) { tasks.push(this.parseExpr()); this.skipNL(); this.match(TokenKind.SEMICOLON); this.skipNL(); }
    this.expect(TokenKind.RBRACE);
    return { kind: "SpawnExpr", tasks, line: t.line, col: t.col };
  }

  private parseMatchExpr(): MatchExpr {
    const t = this.advance();
    const subject = this.parseExpr();
    this.skipNL(); this.expect(TokenKind.LBRACE);
    const arms: [Expr, Expr][] = [];
    this.skipNL();
    while (!this.at(TokenKind.RBRACE)) {
      const pat = this.parseExpr();
      this.expect(TokenKind.FAT_ARROW);
      const body = this.parseExpr();
      arms.push([pat, body]);
      this.skipNL(); this.match(TokenKind.COMMA); this.skipNL();
    }
    this.expect(TokenKind.RBRACE);
    return { kind: "MatchExpr", subject, arms, line: t.line, col: t.col };
  }
}

// ── Type Checker ──

interface TypeEnv {
  bindings: Map<string, TypeNode>;
  typeDefs: Map<string, TypeDecl>;
  parent: TypeEnv | null;
}

function newEnv(parent: TypeEnv | null = null): TypeEnv {
  return { bindings: new Map(), typeDefs: new Map(), parent };
}

function envLookup(env: TypeEnv, name: string): TypeNode | undefined {
  return env.bindings.get(name) ?? (env.parent ? envLookup(env.parent, name) : undefined);
}

function envLookupType(env: TypeEnv, name: string): TypeDecl | undefined {
  return env.typeDefs.get(name) ?? (env.parent ? envLookupType(env.parent, name) : undefined);
}

const ST = (name: string): SimpleType => ({ kind: "SimpleType", name, line: 0, col: 0 });

function typecheck(program: Program): CompilerError[] {
  const errors: CompilerError[] = [];
  const global = newEnv();
  global.bindings.set("print", { kind: "FunctionType", params: [ST("Any")], ret: ST("Void"), line: 0, col: 0 });
  global.bindings.set("len", { kind: "FunctionType", params: [ST("Any")], ret: ST("Int"), line: 0, col: 0 });
  global.bindings.set("str", { kind: "FunctionType", params: [ST("Any")], ret: ST("String"), line: 0, col: 0 });
  global.bindings.set("int", { kind: "FunctionType", params: [ST("Any")], ret: ST("Int"), line: 0, col: 0 });
  global.bindings.set("range", { kind: "FunctionType", params: [ST("Int")], ret: { kind: "ListType", element: ST("Int"), line: 0, col: 0 }, line: 0, col: 0 });
  global.bindings.set("input", { kind: "FunctionType", params: [ST("String")], ret: ST("String"), line: 0, col: 0 });

  function err(msg: string, line: number, col: number, suggestion?: string) {
    errors.push({ msg, line, col, suggestion, phase: "type" });
  }

  function extractLiteral(expr: Expr): number | null {
    if (expr.kind === "IntLit") return expr.value;
    if (expr.kind === "FloatLit") return expr.value;
    if (expr.kind === "UnaryOp" && expr.op === "-") { const v = extractLiteral(expr.operand); return v !== null ? -v : null; }
    return null;
  }

  function checkExpr(expr: Expr, env: TypeEnv): TypeNode | null {
    switch (expr.kind) {
      case "IntLit": return ST("Int");
      case "FloatLit": return ST("Float");
      case "StringLit": return ST("String");
      case "BoolLit": return ST("Bool");
      case "NullLit": return { kind: "NullableType", inner: ST("Any"), line: expr.line, col: expr.col };
      case "Ident": {
        const t = envLookup(env, expr.name);
        if (!t) { err(`Undefined variable: '${expr.name}'`, expr.line, expr.col, `Did you mean to declare it with 'let ${expr.name} = ...'?`); return ST("Any"); }
        return t;
      }
      case "BinaryOp": {
        checkExpr(expr.left, env);
        checkExpr(expr.right, env);
        if (["==", "!=", "<", ">", "<=", ">=", "&&", "||"].includes(expr.op)) return ST("Bool");
        return checkExpr(expr.left, env) ?? ST("Any");
      }
      case "UnaryOp": { const t = checkExpr(expr.operand, env); return expr.op === "!" ? ST("Bool") : t; }
      case "CallExpr": {
        const ct = checkExpr(expr.callee, env);
        for (const a of expr.args) checkExpr(a, env);
        return ct?.kind === "FunctionType" ? ct.ret : ST("Any");
      }
      case "MemberExpr": {
        const ot = checkExpr(expr.obj, env);
        if (ot?.kind === "SimpleType") {
          const td = envLookupType(env, ot.name);
          if (td) { const f = td.fields.find(f => f.name === expr.member); if (f) return f.typeAnn; err(`Type '${ot.name}' has no field '${expr.member}'`, expr.line, expr.col); }
        }
        return ST("Any");
      }
      case "IndexExpr": { const ot = checkExpr(expr.obj, env); checkExpr(expr.index, env); return ot?.kind === "ListType" ? ot.element : ST("Any"); }
      case "StructLit": {
        const td = envLookupType(env, expr.typeName);
        if (!td) { err(`Unknown type: '${expr.typeName}'`, expr.line, expr.col); }
        else {
          const provided = new Set(expr.fields.map(([n]) => n));
          const required = td.fields.filter(f => !f.dflt).map(f => f.name);
          const missing = required.filter(n => !provided.has(n));
          if (missing.length) err(`Missing fields in ${td.name}: ${missing.join(", ")}`, expr.line, expr.col);
          for (const [fn, fv] of expr.fields) {
            checkExpr(fv, env);
            const fd = td.fields.find(f => f.name === fn);
            if (!fd) err(`Unknown field '${fn}' in type '${td.name}'`, fv.line, fv.col);
            else if (fd.typeAnn.kind === "ConstraintType") {
              const lit = extractLiteral(fv);
              if (lit !== null) checkConstraint(fd.typeAnn, lit, fv.line, fv.col);
            }
          }
        }
        return ST(expr.typeName);
      }
      case "ListLit": { for (const e of expr.elements) checkExpr(e, env); return { kind: "ListType", element: ST("Any"), line: expr.line, col: expr.col }; }
      case "QueryExpr": {
        const st = checkExpr(expr.source, env);
        const inner = newEnv(env);
        inner.bindings.set(expr.itemName, st?.kind === "ListType" ? st.element : ST("Any"));
        if (expr.condition) checkExpr(expr.condition, inner);
        return st;
      }
      case "SpawnExpr": { for (const t of expr.tasks) checkExpr(t, env); return ST("Any"); }
      case "IfExpr": { checkExpr(expr.condition, env); const t = checkExpr(expr.thenBranch, env); if (expr.elseBranch) checkExpr(expr.elseBranch, env); return t; }
      case "BlockExpr": {
        const inner = newEnv(env);
        for (const s of expr.stmts) checkStmt(s, inner);
        return expr.finalExpr ? checkExpr(expr.finalExpr, inner) : null;
      }
      case "NullCheck": { checkExpr(expr.inner, env); return ST("Any"); }
      case "AwaitExpr": { return checkExpr(expr.inner, env); }
      case "MatchExpr": {
        checkExpr(expr.subject, env);
        let t: TypeNode | null = null;
        for (const [p, b] of expr.arms) { checkExpr(p, env); const bt = checkExpr(b, env); if (!t) t = bt; }
        return t;
      }
    }
  }

  function checkConstraint(ct: ConstraintType, val: number, line: number, col: number) {
    const c = ct.constraint;
    if (c.kind === "BinaryOp" && c.left.kind === "Ident" && (c.right.kind === "IntLit" || c.right.kind === "FloatLit")) {
      const threshold = c.right.kind === "IntLit" ? c.right.value : c.right.value;
      let ok = true;
      if (c.op === ">=" && !(val >= threshold)) ok = false;
      if (c.op === ">" && !(val > threshold)) ok = false;
      if (c.op === "<=" && !(val <= threshold)) ok = false;
      if (c.op === "<" && !(val < threshold)) ok = false;
      if (c.op === "==" && !(val === threshold)) ok = false;
      if (!ok) err(`Constraint violation: value ${val} does not satisfy ${c.left.name} ${c.op} ${threshold}`, line, col, `The value must satisfy: ${c.left.name} ${c.op} ${threshold}`);
    }
  }

  function checkStmt(stmt: Stmt, env: TypeEnv) {
    switch (stmt.kind) {
      case "FnDecl": {
        const pts: TypeNode[] = stmt.params.map(p => p.typeAnn ?? ST("Any"));
        const rt = stmt.returnType ?? ST("Any");
        env.bindings.set(stmt.name, { kind: "FunctionType", params: pts, ret: rt, line: stmt.line, col: stmt.col });
        const inner = newEnv(env);
        for (let i = 0; i < stmt.params.length; i++) inner.bindings.set(stmt.params[i].name, pts[i]);
        for (const s of stmt.body.stmts) checkStmt(s, inner);
        if (stmt.body.finalExpr) checkExpr(stmt.body.finalExpr, inner);
        break;
      }
      case "TypeDecl":
        env.typeDefs.set(stmt.name, stmt);
        env.bindings.set(stmt.name, ST(stmt.name));
        break;
      case "LetStmt": {
        const vt = checkExpr(stmt.value, env);
        env.bindings.set(stmt.name, stmt.typeAnn ?? vt ?? ST("Any"));
        break;
      }
      case "ExprStmt": checkExpr(stmt.expr, env); break;
      case "ReturnStmt": if (stmt.value) checkExpr(stmt.value, env); break;
      case "ForStmt": {
        const it = checkExpr(stmt.iterable, env);
        const inner = newEnv(env);
        inner.bindings.set(stmt.varName, it?.kind === "ListType" ? it.element : ST("Any"));
        for (const s of stmt.body.stmts) checkStmt(s, inner);
        if (stmt.body.finalExpr) checkExpr(stmt.body.finalExpr, inner);
        break;
      }
      case "WhileStmt":
        checkExpr(stmt.condition, env);
        for (const s of stmt.body.stmts) checkStmt(s, newEnv(env));
        break;
      case "IfStmt": {
        checkExpr(stmt.condition, env);
        for (const s of stmt.thenBody.stmts) checkStmt(s, newEnv(env));
        if (stmt.thenBody.finalExpr) checkExpr(stmt.thenBody.finalExpr, newEnv(env));
        if (stmt.elseBody) {
          if (stmt.elseBody.kind === "IfStmt") checkStmt(stmt.elseBody, env);
          else { for (const s of stmt.elseBody.stmts) checkStmt(s, newEnv(env)); }
        }
        break;
      }
      case "AssignStmt": checkExpr(stmt.target, env); checkExpr(stmt.value, env); break;
      case "ImportStmt": break;
    }
  }

  for (const s of program.stmts) checkStmt(s, global);
  return errors;
}

// ── Python Emitter ──

function emitPython(program: Program): string {
  const lines: string[] = [];
  let indent = 0;
  let inFunction = false;
  let needsAsyncio = false;
  const typeDefs = new Map<string, TypeDecl>();

  for (const s of program.stmts) if (s.kind === "TypeDecl") typeDefs.set(s.name, s);

  function line(text: string) { lines.push("    ".repeat(indent) + text); }
  function blank() { lines.push(""); }

  function pyName(name: string) { return name.replace(/ /g, "_").replace(/-/g, "_"); }
  function pyOp(op: string) { return op === "&&" ? "and" : op === "||" ? "or" : op === "!" ? "not " : op; }

  function typeHint(t: TypeNode): string {
    if (t.kind === "SimpleType") return ({ Int: "int", Float: "float", String: "str", Bool: "bool", Void: "None", Any: "object" }[t.name] ?? t.name);
    if (t.kind === "NullableType") return `${typeHint(t.inner)} | None`;
    if (t.kind === "ListType") return `list[${typeHint(t.element)}]`;
    if (t.kind === "ConstraintType") return typeHint(t.base);
    return "object";
  }

  function emitExpr(expr: Expr): string {
    switch (expr.kind) {
      case "IntLit": return String(expr.value);
      case "FloatLit": return String(expr.value);
      case "StringLit": return emitString(expr);
      case "BoolLit": return expr.value ? "True" : "False";
      case "NullLit": return "None";
      case "Ident": return pyName(expr.name);
      case "BinaryOp": return `(${emitExpr(expr.left)} ${pyOp(expr.op)} ${emitExpr(expr.right)})`;
      case "UnaryOp": return expr.op === "!" ? `(not ${emitExpr(expr.operand)})` : `(${expr.op}${emitExpr(expr.operand)})`;
      case "CallExpr": return `${emitExpr(expr.callee)}(${expr.args.map(emitExpr).join(", ")})`;
      case "MemberExpr": return `${emitExpr(expr.obj)}.${expr.member}`;
      case "IndexExpr": return `${emitExpr(expr.obj)}[${emitExpr(expr.index)}]`;
      case "StructLit": return `${expr.typeName}(${expr.fields.map(([n, v]) => `${n}=${emitExpr(v)}`).join(", ")})`;
      case "ListLit": return `[${expr.elements.map(emitExpr).join(", ")}]`;
      case "QueryExpr": {
        const src = emitExpr(expr.source);
        return expr.condition ? `[it for it in ${src} if ${emitExpr(expr.condition)}]` : `list(${src})`;
      }
      case "SpawnExpr": { needsAsyncio = true; return `asyncio.gather(${expr.tasks.map(emitExpr).join(", ")})`; }
      case "IfExpr": return `(${emitExpr(expr.thenBranch)} if ${emitExpr(expr.condition)} else ${expr.elseBranch ? emitExpr(expr.elseBranch) : "None"})`;
      case "BlockExpr": return expr.finalExpr ? emitExpr(expr.finalExpr) : "None";
      case "NullCheck": { const inner = emitExpr(expr.inner); return `(None if ${inner} is None else ${inner})`; }
      case "AwaitExpr": { needsAsyncio = true; return `(await ${emitExpr(expr.inner)})`; }
      case "MatchExpr": {
        let result = emitExpr(expr.arms[expr.arms.length - 1][1]);
        const subj = emitExpr(expr.subject);
        for (let i = expr.arms.length - 2; i >= 0; i--) {
          result = `(${emitExpr(expr.arms[i][1])} if ${subj} == ${emitExpr(expr.arms[i][0])} else ${result})`;
        }
        return result;
      }
    }
  }

  function emitString(expr: StringLit): string {
    if (!expr.interpolations.length) return repr(expr.value);
    const raw = expr.value;
    const parts: string[] = [];
    let i = 0;
    for (const [startPos, exprText] of expr.interpolations) {
      parts.push(raw.substring(i, startPos));
      try {
        const toks = new Lexer(exprText).tokenize();
        const prog = new Parser(toks).parse();
        if (prog.stmts.length && prog.stmts[0].kind === "ExprStmt") parts.push("{" + emitExpr(prog.stmts[0].expr) + "}");
        else parts.push("{" + exprText + "}");
      } catch (_e) { parts.push("{" + exprText + "}"); }
      i = startPos + exprText.length + 3;
    }
    parts.push(raw.substring(i));
    return 'f"' + parts.join("").replace(/"/g, '\\"') + '"';
  }

  function repr(s: string) { return "'" + s.replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\t/g, "\\t") + "'"; }

  function emitBlockBody(block: BlockExpr) {
    if (!block.stmts.length && !block.finalExpr) { line("pass"); return; }
    for (const s of block.stmts) emitStmt(s);
    if (block.finalExpr) {
      if (inFunction) line(`return ${emitExpr(block.finalExpr)}`);
      else line(emitExpr(block.finalExpr));
    }
  }

  function constraintCheck(fieldName: string, ct: ConstraintType): string {
    function go(e: Expr): string {
      if (e.kind === "BinaryOp") return `${go(e.left)} ${pyOp(e.op)} ${go(e.right)}`;
      if (e.kind === "Ident") return `self.${fieldName}`;
      if (e.kind === "IntLit") return String(e.value);
      if (e.kind === "FloatLit") return String(e.value);
      return emitExpr(e);
    }
    return go(ct.constraint);
  }

  function constraintStr(ct: ConstraintType): string {
    if (ct.constraint.kind === "BinaryOp") return `${ct.paramName} ${ct.constraint.op} ${emitExpr(ct.constraint.right)}`;
    return "constraint";
  }

  function emitStmt(stmt: Stmt) {
    switch (stmt.kind) {
      case "FnDecl": {
        blank();
        const params = stmt.params.map(p => {
          let s = p.name;
          if (p.typeAnn) s += `: ${typeHint(p.typeAnn)}`;
          if (p.dflt) s += ` = ${emitExpr(p.dflt)}`;
          return s;
        }).join(", ");
        const ret = stmt.returnType ? ` -> ${typeHint(stmt.returnType)}` : "";
        line(`${stmt.isAsync ? "async " : ""}def ${pyName(stmt.name)}(${params})${ret}:`);
        indent++;
        if (stmt.intent) line(`"""Intent: ${stmt.intent}"""`);
        const prev = inFunction; inFunction = true;
        emitBlockBody(stmt.body);
        inFunction = prev;
        indent--;
        blank();
        break;
      }
      case "TypeDecl": {
        blank();
        line("@dataclass");
        line(`class ${stmt.name}:`);
        indent++;
        if (!stmt.fields.length) { line("pass"); }
        for (const f of stmt.fields) {
          const h = typeHint(f.typeAnn);
          line(f.dflt ? `${f.name}: ${h} = ${emitExpr(f.dflt)}` : `${f.name}: ${h}`);
        }
        const constrained = stmt.fields.filter(f => f.typeAnn.kind === "ConstraintType");
        if (constrained.length) {
          blank();
          line("def __post_init__(self):");
          indent++;
          for (const f of constrained) {
            const ct = f.typeAnn as ConstraintType;
            line(`if not (${constraintCheck(f.name, ct)}):`);
            indent++;
            line(`raise ValueError(f"Constraint violation on ${f.name}: {self.${f.name}} does not satisfy ${constraintStr(ct)}")`);
            indent--;
          }
          indent--;
        }
        indent--;
        blank();
        break;
      }
      case "LetStmt": {
        const val = emitExpr(stmt.value);
        line(stmt.typeAnn ? `${stmt.name}: ${typeHint(stmt.typeAnn)} = ${val}` : `${stmt.name} = ${val}`);
        break;
      }
      case "ExprStmt": line(emitExpr(stmt.expr)); break;
      case "ReturnStmt": line(stmt.value ? `return ${emitExpr(stmt.value)}` : "return"); break;
      case "ImportStmt": line(`import ${stmt.module}`); break;
      case "ForStmt":
        line(`for ${stmt.varName} in ${emitExpr(stmt.iterable)}:`);
        indent++; emitBlockBody(stmt.body); indent--;
        break;
      case "WhileStmt":
        line(`while ${emitExpr(stmt.condition)}:`);
        indent++; emitBlockBody(stmt.body); indent--;
        break;
      case "IfStmt":
        line(`if ${emitExpr(stmt.condition)}:`);
        indent++; emitBlockBody(stmt.thenBody); indent--;
        if (stmt.elseBody) {
          if (stmt.elseBody.kind === "IfStmt") {
            line(`elif ${emitExpr(stmt.elseBody.condition)}:`);
            indent++; emitBlockBody(stmt.elseBody.thenBody); indent--;
            if (stmt.elseBody.elseBody && stmt.elseBody.elseBody.kind !== "IfStmt") {
              line("else:"); indent++; emitBlockBody(stmt.elseBody.elseBody); indent--;
            }
          } else { line("else:"); indent++; emitBlockBody(stmt.elseBody); indent--; }
        }
        break;
      case "AssignStmt": line(`${emitExpr(stmt.target)} = ${emitExpr(stmt.value)}`); break;
    }
  }

  for (const s of program.stmts) emitStmt(s);

  const header = ["from __future__ import annotations", "from dataclasses import dataclass"];
  if (needsAsyncio) header.push("import asyncio");
  return header.join("\n") + "\n\n" + lines.join("\n") + "\n";
}

// ── Public API ──

export interface CompileResult {
  python: string;
  output: string;
  errors: CompilerError[];
  timeMs: number;
}

export function compile(source: string): CompileResult {
  const start = performance.now();

  try {
    const tokens = new Lexer(source).tokenize();
    let program: Program;
    try {
      program = new Parser(tokens).parse();
    } catch (e) {
      const timeMs = performance.now() - start;
      if (isCompilerError(e)) return { python: "", output: "", errors: [e], timeMs };
      throw e;
    }

    const typeErrors = typecheck(program);
    if (typeErrors.length) return { python: "", output: "", errors: typeErrors, timeMs: performance.now() - start };

    const python = emitPython(program);
    const timeMs = performance.now() - start;
    return { python, output: "", errors: [], timeMs };
  } catch (e) {
    const timeMs = performance.now() - start;
    if (isCompilerError(e)) return { python: "", output: "", errors: [e], timeMs };
    return { python: "", output: "", errors: [{ msg: String(e), line: 0, col: 0, phase: "lex" }], timeMs };
  }
}

function isCompilerError(e: unknown): e is CompilerError {
  return typeof e === "object" && e !== null && "phase" in e && "msg" in e;
}
