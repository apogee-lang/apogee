"""Apogee Lexer — tokenizes .apg source into a clean token stream."""

from __future__ import annotations
from dataclasses import dataclass
from enum import Enum, auto
from typing import List


class TokenKind(Enum):
    # Literals
    INT_LIT = auto()
    FLOAT_LIT = auto()
    STRING_LIT = auto()
    BOOL_LIT = auto()

    # Identifiers & keywords
    IDENT = auto()
    BACKTICK_IDENT = auto()  # `multi word name`
    FN = auto()
    TYPE = auto()
    SPAWN = auto()
    LET = auto()
    FROM = auto()
    WHERE = auto()
    INTENT = auto()       # @intent
    IF = auto()
    ELSE = auto()
    RETURN = auto()
    IMPORT = auto()
    ASYNC = auto()
    AWAIT = auto()
    NULL = auto()
    TRUE = auto()
    FALSE = auto()
    IN = auto()
    FOR = auto()
    WHILE = auto()
    MATCH = auto()

    # Operators & punctuation
    PLUS = auto()
    MINUS = auto()
    STAR = auto()
    SLASH = auto()
    PERCENT = auto()
    EQ = auto()          # =
    EQEQ = auto()        # ==
    NEQ = auto()          # !=
    LT = auto()
    GT = auto()
    LTE = auto()          # <=
    GTE = auto()          # >=
    AND = auto()          # &&
    OR = auto()           # ||
    NOT = auto()          # !
    ARROW = auto()        # ->
    FAT_ARROW = auto()    # =>
    QUESTION = auto()     # ?
    DOT = auto()
    COMMA = auto()
    COLON = auto()
    SEMICOLON = auto()
    LPAREN = auto()
    RPAREN = auto()
    LBRACE = auto()
    RBRACE = auto()
    LBRACKET = auto()
    RBRACKET = auto()
    AT = auto()           # @ (for annotations)
    PIPE = auto()         # |
    AMPERSAND = auto()    # &

    # Special
    NEWLINE = auto()
    EOF = auto()


KEYWORDS = {
    "fn": TokenKind.FN,
    "type": TokenKind.TYPE,
    "spawn": TokenKind.SPAWN,
    "let": TokenKind.LET,
    "from": TokenKind.FROM,
    "where": TokenKind.WHERE,
    "if": TokenKind.IF,
    "else": TokenKind.ELSE,
    "return": TokenKind.RETURN,
    "import": TokenKind.IMPORT,
    "async": TokenKind.ASYNC,
    "await": TokenKind.AWAIT,
    "null": TokenKind.NULL,
    "true": TokenKind.TRUE,
    "false": TokenKind.FALSE,
    "in": TokenKind.IN,
    "for": TokenKind.FOR,
    "while": TokenKind.WHILE,
    "match": TokenKind.MATCH,
}


@dataclass
class Token:
    kind: TokenKind
    value: str
    line: int
    col: int

    def __repr__(self) -> str:
        return f"Token({self.kind.name}, {self.value!r}, {self.line}:{self.col})"


class LexError(Exception):
    def __init__(self, msg: str, line: int, col: int):
        self.msg = msg
        self.line = line
        self.col = col
        super().__init__(f"[{line}:{col}] Lex error: {msg}")


class Lexer:
    def __init__(self, source: str, filename: str = "<stdin>"):
        self.source = source
        self.filename = filename
        self.pos = 0
        self.line = 1
        self.col = 1
        self.tokens: List[Token] = []

    def _peek(self) -> str:
        if self.pos >= len(self.source):
            return "\0"
        return self.source[self.pos]

    def _peek_next(self) -> str:
        if self.pos + 1 >= len(self.source):
            return "\0"
        return self.source[self.pos + 1]

    def _advance(self) -> str:
        ch = self.source[self.pos]
        self.pos += 1
        if ch == "\n":
            self.line += 1
            self.col = 1
        else:
            self.col += 1
        return ch

    def _skip_whitespace_and_comments(self):
        while self.pos < len(self.source):
            ch = self._peek()
            if ch in (" ", "\t", "\r"):
                self._advance()
            elif ch == "/" and self._peek_next() == "/":
                # Line comment
                while self.pos < len(self.source) and self._peek() != "\n":
                    self._advance()
            elif ch == "/" and self._peek_next() == "*":
                # Block comment
                self._advance()
                self._advance()
                depth = 1
                while self.pos < len(self.source) and depth > 0:
                    if self._peek() == "/" and self._peek_next() == "*":
                        depth += 1
                        self._advance()
                        self._advance()
                    elif self._peek() == "*" and self._peek_next() == "/":
                        depth -= 1
                        self._advance()
                        self._advance()
                    else:
                        self._advance()
            else:
                break

    def _emit(self, kind: TokenKind, value: str, line: int, col: int):
        self.tokens.append(Token(kind, value, line, col))

    def _read_string(self) -> str:
        """Read a string literal, handling \\( ) interpolation markers."""
        start_line, start_col = self.line, self.col
        self._advance()  # skip opening "
        parts = []
        while self.pos < len(self.source) and self._peek() != '"':
            ch = self._peek()
            if ch == "\\":
                self._advance()
                esc = self._peek()
                if esc == "n":
                    parts.append("\n")
                elif esc == "t":
                    parts.append("\t")
                elif esc == "\\":
                    parts.append("\\")
                elif esc == '"':
                    parts.append('"')
                elif esc == "(":
                    # String interpolation marker: \(expr)
                    parts.append("\\(")
                    self._advance()
                    # Read until matching )
                    depth = 1
                    while self.pos < len(self.source) and depth > 0:
                        c = self._peek()
                        if c == "(":
                            depth += 1
                        elif c == ")":
                            depth -= 1
                            if depth == 0:
                                parts.append(")")
                                self._advance()
                                continue
                        parts.append(c)
                        self._advance()
                    continue
                else:
                    parts.append(esc)
                self._advance()
            elif ch == "\n":
                raise LexError("Unterminated string literal", start_line, start_col)
            else:
                parts.append(ch)
                self._advance()
        if self.pos >= len(self.source):
            raise LexError("Unterminated string literal", start_line, start_col)
        self._advance()  # skip closing "
        return "".join(parts)

    def _read_number(self) -> tuple[str, TokenKind]:
        buf = []
        is_float = False
        while self.pos < len(self.source) and (self._peek().isdigit() or self._peek() == "."):
            if self._peek() == ".":
                if is_float:
                    break
                # Check it's not a method call like 123.toString
                if self._peek_next().isdigit():
                    is_float = True
                else:
                    break
            buf.append(self._advance())
        return "".join(buf), TokenKind.FLOAT_LIT if is_float else TokenKind.INT_LIT

    def _read_ident(self) -> str:
        buf = []
        while self.pos < len(self.source) and (self._peek().isalnum() or self._peek() == "_"):
            buf.append(self._advance())
        return "".join(buf)

    def _read_backtick_ident(self) -> str:
        self._advance()  # skip opening `
        buf = []
        while self.pos < len(self.source) and self._peek() != "`":
            buf.append(self._advance())
        if self.pos >= len(self.source):
            raise LexError("Unterminated backtick identifier", self.line, self.col)
        self._advance()  # skip closing `
        return "".join(buf)

    def tokenize(self) -> List[Token]:
        while self.pos < len(self.source):
            self._skip_whitespace_and_comments()
            if self.pos >= len(self.source):
                break

            line, col = self.line, self.col
            ch = self._peek()

            if ch == "\n":
                self._advance()
                self._emit(TokenKind.NEWLINE, "\\n", line, col)
            elif ch == '"':
                s = self._read_string()
                self._emit(TokenKind.STRING_LIT, s, line, col)
            elif ch == '`':
                ident = self._read_backtick_ident()
                self._emit(TokenKind.BACKTICK_IDENT, ident, line, col)
            elif ch.isdigit():
                num, kind = self._read_number()
                self._emit(kind, num, line, col)
            elif ch.isalpha() or ch == "_":
                ident = self._read_ident()
                kind = KEYWORDS.get(ident, TokenKind.IDENT)
                if ident == "true" or ident == "false":
                    self._emit(TokenKind.BOOL_LIT, ident, line, col)
                else:
                    self._emit(kind, ident, line, col)
            elif ch == "@":
                self._advance()
                ident = self._read_ident()
                if ident == "intent":
                    self._emit(TokenKind.INTENT, "@intent", line, col)
                else:
                    self._emit(TokenKind.AT, "@", line, col)
                    self._emit(TokenKind.IDENT, ident, self.line, self.col - len(ident))
            elif ch == "+":
                self._advance()
                self._emit(TokenKind.PLUS, "+", line, col)
            elif ch == "-":
                self._advance()
                if self._peek() == ">":
                    self._advance()
                    self._emit(TokenKind.ARROW, "->", line, col)
                else:
                    self._emit(TokenKind.MINUS, "-", line, col)
            elif ch == "*":
                self._advance()
                self._emit(TokenKind.STAR, "*", line, col)
            elif ch == "/":
                self._advance()
                self._emit(TokenKind.SLASH, "/", line, col)
            elif ch == "%":
                self._advance()
                self._emit(TokenKind.PERCENT, "%", line, col)
            elif ch == "=":
                self._advance()
                if self._peek() == "=":
                    self._advance()
                    self._emit(TokenKind.EQEQ, "==", line, col)
                elif self._peek() == ">":
                    self._advance()
                    self._emit(TokenKind.FAT_ARROW, "=>", line, col)
                else:
                    self._emit(TokenKind.EQ, "=", line, col)
            elif ch == "!":
                self._advance()
                if self._peek() == "=":
                    self._advance()
                    self._emit(TokenKind.NEQ, "!=", line, col)
                else:
                    self._emit(TokenKind.NOT, "!", line, col)
            elif ch == "<":
                self._advance()
                if self._peek() == "=":
                    self._advance()
                    self._emit(TokenKind.LTE, "<=", line, col)
                else:
                    self._emit(TokenKind.LT, "<", line, col)
            elif ch == ">":
                self._advance()
                if self._peek() == "=":
                    self._advance()
                    self._emit(TokenKind.GTE, ">=", line, col)
                else:
                    self._emit(TokenKind.GT, ">", line, col)
            elif ch == "&":
                self._advance()
                if self._peek() == "&":
                    self._advance()
                    self._emit(TokenKind.AND, "&&", line, col)
                else:
                    self._emit(TokenKind.AMPERSAND, "&", line, col)
            elif ch == "|":
                self._advance()
                if self._peek() == "|":
                    self._advance()
                    self._emit(TokenKind.OR, "||", line, col)
                else:
                    self._emit(TokenKind.PIPE, "|", line, col)
            elif ch == "?":
                self._advance()
                self._emit(TokenKind.QUESTION, "?", line, col)
            elif ch == ".":
                self._advance()
                self._emit(TokenKind.DOT, ".", line, col)
            elif ch == ",":
                self._advance()
                self._emit(TokenKind.COMMA, ",", line, col)
            elif ch == ":":
                self._advance()
                self._emit(TokenKind.COLON, ":", line, col)
            elif ch == ";":
                self._advance()
                self._emit(TokenKind.SEMICOLON, ";", line, col)
            elif ch == "(":
                self._advance()
                self._emit(TokenKind.LPAREN, "(", line, col)
            elif ch == ")":
                self._advance()
                self._emit(TokenKind.RPAREN, ")", line, col)
            elif ch == "{":
                self._advance()
                self._emit(TokenKind.LBRACE, "{", line, col)
            elif ch == "}":
                self._advance()
                self._emit(TokenKind.RBRACE, "}", line, col)
            elif ch == "[":
                self._advance()
                self._emit(TokenKind.LBRACKET, "[", line, col)
            elif ch == "]":
                self._advance()
                self._emit(TokenKind.RBRACKET, "]", line, col)
            else:
                raise LexError(f"Unexpected character: {ch!r}", line, col)

        self._emit(TokenKind.EOF, "", self.line, self.col)
        return self.tokens


def tokenize(source: str, filename: str = "<stdin>") -> List[Token]:
    return Lexer(source, filename).tokenize()
