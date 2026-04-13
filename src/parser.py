"""Apogee Parser — builds an AST from the token stream."""

from __future__ import annotations
from typing import List, Optional

from .lexer import Token, TokenKind, LexError
from .ast_nodes import *


class ParseError(Exception):
    def __init__(self, msg: str, line: int, col: int, suggestion: str = ""):
        self.msg = msg
        self.line = line
        self.col = col
        self.suggestion = suggestion
        full = f"[{line}:{col}] Parse error: {msg}"
        if suggestion:
            full += f"\n  Suggestion: {suggestion}"
        super().__init__(full)


class Parser:
    def __init__(self, tokens: List[Token], filename: str = "<stdin>"):
        self.tokens = tokens
        self.filename = filename
        self.pos = 0

    # --- Utilities ---

    def _peek(self) -> Token:
        return self.tokens[self.pos]

    def _at(self, kind: TokenKind) -> bool:
        return self._peek().kind == kind

    def _at_any(self, *kinds: TokenKind) -> bool:
        return self._peek().kind in kinds

    def _advance(self) -> Token:
        tok = self.tokens[self.pos]
        self.pos += 1
        return tok

    def _expect(self, kind: TokenKind, msg: str = "") -> Token:
        tok = self._peek()
        if tok.kind != kind:
            if not msg:
                msg = f"Expected {kind.name}, got {tok.kind.name} ({tok.value!r})"
            raise ParseError(msg, tok.line, tok.col)
        return self._advance()

    def _skip_newlines(self):
        while self._at(TokenKind.NEWLINE):
            self._advance()

    def _match(self, kind: TokenKind) -> Optional[Token]:
        if self._at(kind):
            return self._advance()
        return None

    # --- Top-level ---

    def parse(self) -> Program:
        stmts: List[Stmt] = []
        self._skip_newlines()
        while not self._at(TokenKind.EOF):
            stmts.append(self._parse_stmt())
            self._skip_newlines()
        return Program(stmts=stmts, filename=self.filename)

    # --- Statements ---

    def _parse_stmt(self) -> Stmt:
        self._skip_newlines()
        tok = self._peek()

        if tok.kind == TokenKind.INTENT:
            return self._parse_fn_with_intent()
        if tok.kind == TokenKind.FN:
            return self._parse_fn_decl()
        if tok.kind == TokenKind.ASYNC:
            return self._parse_async_fn_decl()
        if tok.kind == TokenKind.TYPE:
            return self._parse_type_decl()
        if tok.kind == TokenKind.LET:
            return self._parse_let()
        if tok.kind == TokenKind.RETURN:
            return self._parse_return()
        if tok.kind == TokenKind.IMPORT:
            return self._parse_import()
        if tok.kind == TokenKind.FOR:
            return self._parse_for()
        if tok.kind == TokenKind.WHILE:
            return self._parse_while()
        if tok.kind == TokenKind.IF:
            return self._parse_if_stmt()

        # Expression statement or assignment
        expr = self._parse_expr()
        if self._at(TokenKind.EQ):
            self._advance()
            value = self._parse_expr()
            self._skip_terminators()
            return AssignStmt(target=expr, value=value, line=tok.line, col=tok.col)
        self._skip_terminators()
        return ExprStmt(expr=expr, line=tok.line, col=tok.col)

    def _skip_terminators(self):
        while self._at_any(TokenKind.NEWLINE, TokenKind.SEMICOLON):
            self._advance()

    def _parse_fn_with_intent(self) -> FnDecl:
        intent_tok = self._advance()  # @intent
        self._expect(TokenKind.LPAREN, "Expected '(' after @intent")
        intent_str_tok = self._expect(TokenKind.STRING_LIT, "Expected string after @intent(")
        self._expect(TokenKind.RPAREN, "Expected ')' after @intent string")
        self._skip_newlines()
        fn = self._parse_fn_decl()
        fn.intent = intent_str_tok.value
        return fn

    def _parse_fn_decl(self, is_async: bool = False) -> FnDecl:
        tok = self._expect(TokenKind.FN)
        if self._at(TokenKind.BACKTICK_IDENT):
            name = self._advance().value
        else:
            name = self._expect(TokenKind.IDENT, "Expected function name").value

        self._expect(TokenKind.LPAREN, f"Expected '(' after function name '{name}'")
        params = self._parse_params()
        self._expect(TokenKind.RPAREN, "Expected ')' after parameters")

        ret_type = None
        if self._match(TokenKind.ARROW):
            ret_type = self._parse_type()

        body = self._parse_block()
        return FnDecl(
            name=name, params=params, return_type=ret_type,
            body=body, is_async=is_async, line=tok.line, col=tok.col
        )

    def _parse_async_fn_decl(self) -> FnDecl:
        self._advance()  # async
        return self._parse_fn_decl(is_async=True)

    def _parse_params(self) -> List[Param]:
        params = []
        self._skip_newlines()
        while not self._at(TokenKind.RPAREN):
            tok = self._expect(TokenKind.IDENT, "Expected parameter name")
            type_ann = None
            default = None
            if self._match(TokenKind.COLON):
                type_ann = self._parse_type()
            if self._match(TokenKind.EQ):
                default = self._parse_expr()
            params.append(Param(name=tok.value, type_ann=type_ann, default=default, line=tok.line, col=tok.col))
            self._skip_newlines()
            if not self._match(TokenKind.COMMA):
                break
            self._skip_newlines()
        return params

    def _parse_type_decl(self) -> TypeDecl:
        tok = self._expect(TokenKind.TYPE)
        name = self._expect(TokenKind.IDENT, "Expected type name").value
        self._skip_newlines()
        self._expect(TokenKind.LBRACE, f"Expected '{{' after type name '{name}'")
        fields = []
        self._skip_newlines()
        while not self._at(TokenKind.RBRACE):
            ftok = self._expect(TokenKind.IDENT, "Expected field name")
            self._expect(TokenKind.COLON, f"Expected ':' after field name '{ftok.value}'")
            ftype = self._parse_type()
            default = None
            if self._match(TokenKind.EQ):
                default = self._parse_expr()
            fields.append(TypeField(name=ftok.value, type_ann=ftype, default=default, line=ftok.line, col=ftok.col))
            self._skip_newlines()
            self._match(TokenKind.COMMA)
            self._skip_newlines()
        self._expect(TokenKind.RBRACE, "Expected '}' to close type definition")
        return TypeDecl(name=name, fields=fields, line=tok.line, col=tok.col)

    def _parse_let(self) -> LetStmt:
        tok = self._advance()  # let
        name = self._expect(TokenKind.IDENT, "Expected variable name after 'let'").value
        type_ann = None
        if self._match(TokenKind.COLON):
            type_ann = self._parse_type()
        self._expect(TokenKind.EQ, f"Expected '=' in let binding for '{name}'")
        value = self._parse_expr()
        self._skip_terminators()
        return LetStmt(name=name, type_ann=type_ann, value=value, line=tok.line, col=tok.col)

    def _parse_return(self) -> ReturnStmt:
        tok = self._advance()  # return
        value = None
        if not self._at_any(TokenKind.NEWLINE, TokenKind.RBRACE, TokenKind.EOF, TokenKind.SEMICOLON):
            value = self._parse_expr()
        self._skip_terminators()
        return ReturnStmt(value=value, line=tok.line, col=tok.col)

    def _parse_import(self) -> ImportStmt:
        tok = self._advance()  # import
        module = self._expect(TokenKind.IDENT, "Expected module name").value
        while self._match(TokenKind.DOT):
            module += "." + self._expect(TokenKind.IDENT).value
        self._skip_terminators()
        return ImportStmt(module=module, line=tok.line, col=tok.col)

    def _parse_for(self) -> ForStmt:
        tok = self._advance()  # for
        var_name = self._expect(TokenKind.IDENT, "Expected loop variable").value
        self._expect(TokenKind.IN, "Expected 'in' after for variable")
        iterable = self._parse_expr()
        body = self._parse_block()
        return ForStmt(var_name=var_name, iterable=iterable, body=body, line=tok.line, col=tok.col)

    def _parse_while(self) -> WhileStmt:
        tok = self._advance()  # while
        condition = self._parse_expr()
        body = self._parse_block()
        return WhileStmt(condition=condition, body=body, line=tok.line, col=tok.col)

    def _parse_if_stmt(self) -> IfStmt:
        tok = self._advance()  # if
        condition = self._parse_expr()
        then_body = self._parse_block()
        else_body = None
        self._skip_newlines()
        if self._match(TokenKind.ELSE):
            self._skip_newlines()
            if self._at(TokenKind.IF):
                else_body = self._parse_if_stmt()
            else:
                else_body = self._parse_block()
        return IfStmt(condition=condition, then_body=then_body, else_body=else_body,
                       line=tok.line, col=tok.col)

    # --- Block ---

    def _parse_block(self) -> BlockExpr:
        self._skip_newlines()
        tok = self._expect(TokenKind.LBRACE, "Expected '{' to open block")
        stmts: List[Stmt] = []
        self._skip_newlines()
        while not self._at_any(TokenKind.RBRACE, TokenKind.EOF):
            stmts.append(self._parse_stmt())
            self._skip_newlines()
        self._expect(TokenKind.RBRACE, "Expected '}' to close block")

        # The last expression statement becomes the block's implicit return
        final_expr = None
        if stmts and isinstance(stmts[-1], ExprStmt):
            final_expr = stmts.pop().expr

        return BlockExpr(stmts=stmts, final_expr=final_expr, line=tok.line, col=tok.col)

    # --- Types ---

    def _parse_type(self) -> TypeNode:
        tok = self._peek()
        if self._at(TokenKind.LBRACKET):
            self._advance()
            elem = self._parse_type()
            self._expect(TokenKind.RBRACKET)
            base = ListType(element=elem, line=tok.line, col=tok.col)
        elif self._at(TokenKind.IDENT):
            name = self._advance().value
            base = SimpleType(name=name, line=tok.line, col=tok.col)
        elif self._at(TokenKind.LPAREN):
            # Function type: (A, B) -> C
            self._advance()
            param_types = []
            while not self._at(TokenKind.RPAREN):
                param_types.append(self._parse_type())
                if not self._match(TokenKind.COMMA):
                    break
            self._expect(TokenKind.RPAREN)
            self._expect(TokenKind.ARROW)
            ret = self._parse_type()
            base = FunctionType(params=param_types, ret=ret, line=tok.line, col=tok.col)
        else:
            raise ParseError(f"Expected type, got {tok.kind.name}", tok.line, tok.col,
                             "Types start with a name like 'String', 'Int', or '[Element]'")

        # Nullable suffix
        if self._at(TokenKind.QUESTION):
            self._advance()
            base = NullableType(inner=base, line=tok.line, col=tok.col)

        # Constraint: where ...
        if self._at(TokenKind.WHERE):
            self._advance()
            constraint = self._parse_expr()
            base = ConstraintType(base=base, param_name="value", constraint=constraint,
                                  line=tok.line, col=tok.col)

        return base

    # --- Expressions (Pratt parser) ---

    def _parse_expr(self) -> Expr:
        return self._parse_or()

    def _parse_or(self) -> Expr:
        left = self._parse_and()
        while self._at(TokenKind.OR):
            op_tok = self._advance()
            right = self._parse_and()
            left = BinaryOp(op="||", left=left, right=right, line=op_tok.line, col=op_tok.col)
        return left

    def _parse_and(self) -> Expr:
        left = self._parse_equality()
        while self._at(TokenKind.AND):
            op_tok = self._advance()
            right = self._parse_equality()
            left = BinaryOp(op="&&", left=left, right=right, line=op_tok.line, col=op_tok.col)
        return left

    def _parse_equality(self) -> Expr:
        left = self._parse_comparison()
        while self._at_any(TokenKind.EQEQ, TokenKind.NEQ):
            op_tok = self._advance()
            right = self._parse_comparison()
            left = BinaryOp(op=op_tok.value, left=left, right=right, line=op_tok.line, col=op_tok.col)
        return left

    def _parse_comparison(self) -> Expr:
        left = self._parse_addition()
        while self._at_any(TokenKind.LT, TokenKind.GT, TokenKind.LTE, TokenKind.GTE):
            op_tok = self._advance()
            right = self._parse_addition()
            left = BinaryOp(op=op_tok.value, left=left, right=right, line=op_tok.line, col=op_tok.col)
        return left

    def _parse_addition(self) -> Expr:
        left = self._parse_multiplication()
        while self._at_any(TokenKind.PLUS, TokenKind.MINUS):
            op_tok = self._advance()
            right = self._parse_multiplication()
            left = BinaryOp(op=op_tok.value, left=left, right=right, line=op_tok.line, col=op_tok.col)
        return left

    def _parse_multiplication(self) -> Expr:
        left = self._parse_unary()
        while self._at_any(TokenKind.STAR, TokenKind.SLASH, TokenKind.PERCENT):
            op_tok = self._advance()
            right = self._parse_unary()
            left = BinaryOp(op=op_tok.value, left=left, right=right, line=op_tok.line, col=op_tok.col)
        return left

    def _parse_unary(self) -> Expr:
        if self._at_any(TokenKind.MINUS, TokenKind.NOT):
            op_tok = self._advance()
            operand = self._parse_unary()
            return UnaryOp(op=op_tok.value, operand=operand, line=op_tok.line, col=op_tok.col)
        return self._parse_postfix()

    def _parse_postfix(self) -> Expr:
        expr = self._parse_primary()
        while True:
            if self._at(TokenKind.LPAREN):
                expr = self._parse_call(expr)
            elif self._at(TokenKind.DOT):
                self._advance()
                member = self._expect(TokenKind.IDENT, "Expected member name after '.'").value
                expr = MemberExpr(obj=expr, member=member, line=expr.line, col=expr.col)
            elif self._at(TokenKind.LBRACKET):
                self._advance()
                index = self._parse_expr()
                self._expect(TokenKind.RBRACKET, "Expected ']'")
                expr = IndexExpr(obj=expr, index=index, line=expr.line, col=expr.col)
            elif self._at(TokenKind.QUESTION):
                self._advance()
                expr = NullCheck(inner=expr, line=expr.line, col=expr.col)
            else:
                break
        return expr

    def _parse_call(self, callee: Expr) -> CallExpr:
        self._advance()  # (
        args: List[Expr] = []
        self._skip_newlines()
        while not self._at(TokenKind.RPAREN):
            args.append(self._parse_expr())
            self._skip_newlines()
            if not self._match(TokenKind.COMMA):
                break
            self._skip_newlines()
        self._expect(TokenKind.RPAREN, "Expected ')' after arguments")
        return CallExpr(callee=callee, args=args, line=callee.line, col=callee.col)

    def _parse_primary(self) -> Expr:
        tok = self._peek()

        if tok.kind == TokenKind.INT_LIT:
            self._advance()
            return IntLiteral(value=int(tok.value), line=tok.line, col=tok.col)

        if tok.kind == TokenKind.FLOAT_LIT:
            self._advance()
            return FloatLiteral(value=float(tok.value), line=tok.line, col=tok.col)

        if tok.kind == TokenKind.STRING_LIT:
            self._advance()
            return self._process_string(tok)

        if tok.kind == TokenKind.BOOL_LIT:
            self._advance()
            return BoolLiteral(value=(tok.value == "true"), line=tok.line, col=tok.col)

        if tok.kind == TokenKind.NULL:
            self._advance()
            return NullLiteral(line=tok.line, col=tok.col)

        if tok.kind == TokenKind.IDENT:
            self._advance()
            # Check for struct literal: TypeName { ... }
            if self._at(TokenKind.LBRACE) and tok.value[0].isupper():
                return self._parse_struct_literal(tok)
            return Identifier(name=tok.value, line=tok.line, col=tok.col)

        if tok.kind == TokenKind.BACKTICK_IDENT:
            self._advance()
            return Identifier(name=tok.value, line=tok.line, col=tok.col)

        if tok.kind == TokenKind.LPAREN:
            self._advance()
            expr = self._parse_expr()
            self._expect(TokenKind.RPAREN, "Expected ')'")
            return expr

        if tok.kind == TokenKind.LBRACKET:
            return self._parse_list_literal()

        if tok.kind == TokenKind.IF:
            return self._parse_if_expr()

        if tok.kind == TokenKind.FROM:
            return self._parse_query_expr()

        if tok.kind == TokenKind.SPAWN:
            return self._parse_spawn_expr()

        if tok.kind == TokenKind.MATCH:
            return self._parse_match_expr()

        if tok.kind == TokenKind.AWAIT:
            self._advance()
            inner = self._parse_expr()
            return AwaitExpr(inner=inner, line=tok.line, col=tok.col)

        if tok.kind == TokenKind.LBRACE:
            return self._parse_block()

        raise ParseError(
            f"Unexpected token: {tok.kind.name} ({tok.value!r})",
            tok.line, tok.col,
            "Expected an expression (number, string, variable, function call, etc.)"
        )

    def _process_string(self, tok: Token) -> Expr:
        """Handle string interpolation: \\(expr) patterns."""
        raw = tok.value
        interpolations = []
        i = 0
        while i < len(raw):
            if raw[i:i+2] == "\\(" :
                # Find the matching )
                i += 2
                depth = 1
                start = i
                while i < len(raw) and depth > 0:
                    if raw[i] == "(":
                        depth += 1
                    elif raw[i] == ")":
                        depth -= 1
                    i += 1
                expr_text = raw[start:i-1]
                interpolations.append((start - 2, expr_text))
            else:
                i += 1
        return StringLiteral(value=raw, interpolations=interpolations, line=tok.line, col=tok.col)

    def _parse_struct_literal(self, name_tok: Token) -> StructLiteral:
        self._advance()  # {
        fields = []
        self._skip_newlines()
        while not self._at(TokenKind.RBRACE):
            fname = self._expect(TokenKind.IDENT, "Expected field name in struct literal").value
            self._expect(TokenKind.COLON, f"Expected ':' after field '{fname}'")
            fvalue = self._parse_expr()
            fields.append((fname, fvalue))
            self._skip_newlines()
            if not self._match(TokenKind.COMMA):
                break
            self._skip_newlines()
        self._expect(TokenKind.RBRACE, "Expected '}' to close struct literal")
        return StructLiteral(type_name=name_tok.value, fields=fields, line=name_tok.line, col=name_tok.col)

    def _parse_list_literal(self) -> ListLiteral:
        tok = self._advance()  # [
        elements = []
        self._skip_newlines()
        while not self._at(TokenKind.RBRACKET):
            elements.append(self._parse_expr())
            self._skip_newlines()
            if not self._match(TokenKind.COMMA):
                break
            self._skip_newlines()
        self._expect(TokenKind.RBRACKET, "Expected ']'")
        return ListLiteral(elements=elements, line=tok.line, col=tok.col)

    def _parse_if_expr(self) -> IfExpr:
        tok = self._advance()  # if
        condition = self._parse_expr()
        self._skip_newlines()
        self._expect(TokenKind.LBRACE)
        then_branch = self._parse_expr()
        self._skip_newlines()
        self._expect(TokenKind.RBRACE)
        else_branch = None
        self._skip_newlines()
        if self._match(TokenKind.ELSE):
            self._skip_newlines()
            self._expect(TokenKind.LBRACE)
            else_branch = self._parse_expr()
            self._skip_newlines()
            self._expect(TokenKind.RBRACE)
        return IfExpr(condition=condition, then_branch=then_branch,
                      else_branch=else_branch, line=tok.line, col=tok.col)

    def _parse_query_expr(self) -> QueryExpr:
        tok = self._advance()  # from
        source = self._parse_expr()
        condition = None
        if self._match(TokenKind.WHERE):
            condition = self._parse_expr()
        return QueryExpr(source=source, condition=condition, item_name="it",
                         line=tok.line, col=tok.col)

    def _parse_spawn_expr(self) -> SpawnExpr:
        tok = self._advance()  # spawn
        self._expect(TokenKind.LBRACE, "Expected '{' after spawn")
        tasks = []
        self._skip_newlines()
        while not self._at(TokenKind.RBRACE):
            tasks.append(self._parse_expr())
            self._skip_newlines()
            self._match(TokenKind.SEMICOLON)
            self._skip_newlines()
        self._expect(TokenKind.RBRACE)
        return SpawnExpr(tasks=tasks, line=tok.line, col=tok.col)

    def _parse_match_expr(self) -> MatchExpr:
        tok = self._advance()  # match
        subject = self._parse_expr()
        self._skip_newlines()
        self._expect(TokenKind.LBRACE)
        arms = []
        self._skip_newlines()
        while not self._at(TokenKind.RBRACE):
            pattern = self._parse_expr()
            self._expect(TokenKind.FAT_ARROW)
            body = self._parse_expr()
            arms.append((pattern, body))
            self._skip_newlines()
            self._match(TokenKind.COMMA)
            self._skip_newlines()
        self._expect(TokenKind.RBRACE)
        return MatchExpr(subject=subject, arms=arms, line=tok.line, col=tok.col)


def parse(tokens: List[Token], filename: str = "<stdin>") -> Program:
    return Parser(tokens, filename).parse()
