"""Apogee Python Emitter — walks the typed AST and emits valid Python 3.11+."""

from __future__ import annotations
from typing import List, Optional
from .ast_nodes import *


class Emitter:
    def __init__(self):
        self.output: List[str] = []
        self.indent = 0
        self.needs_asyncio = False
        self.type_defs: dict[str, TypeDecl] = {}
        self.in_function = False

    def emit(self, program: Program) -> str:
        # First pass: collect type definitions
        for stmt in program.stmts:
            if isinstance(stmt, TypeDecl):
                self.type_defs[stmt.name] = stmt

        # Emit all statements
        for stmt in program.stmts:
            self._emit_stmt(stmt)

        lines = "\n".join(self.output)

        # Add imports header
        header_parts = []
        header_parts.append("from __future__ import annotations")
        header_parts.append("from dataclasses import dataclass")
        if self.needs_asyncio:
            header_parts.append("import asyncio")
        header = "\n".join(header_parts)

        return header + "\n\n" + lines + "\n"

    def _line(self, text: str):
        self.output.append("    " * self.indent + text)

    def _blank(self):
        self.output.append("")

    # --- Statements ---

    def _emit_stmt(self, stmt: Stmt):
        if isinstance(stmt, FnDecl):
            self._emit_fn_decl(stmt)
        elif isinstance(stmt, TypeDecl):
            self._emit_type_decl(stmt)
        elif isinstance(stmt, LetStmt):
            self._emit_let(stmt)
        elif isinstance(stmt, ExprStmt):
            self._line(self._emit_expr(stmt.expr))
        elif isinstance(stmt, ReturnStmt):
            if stmt.value:
                self._line(f"return {self._emit_expr(stmt.value)}")
            else:
                self._line("return")
        elif isinstance(stmt, ImportStmt):
            self._line(f"import {stmt.module}")
        elif isinstance(stmt, ForStmt):
            self._emit_for(stmt)
        elif isinstance(stmt, WhileStmt):
            self._emit_while(stmt)
        elif isinstance(stmt, IfStmt):
            self._emit_if_stmt(stmt)
        elif isinstance(stmt, AssignStmt):
            self._line(f"{self._emit_expr(stmt.target)} = {self._emit_expr(stmt.value)}")

    def _emit_fn_decl(self, fn: FnDecl):
        self._blank()
        params = ", ".join(self._emit_param(p) for p in fn.params)
        ret = ""
        if fn.return_type:
            ret = f" -> {self._emit_type_hint(fn.return_type)}"

        if fn.is_async:
            self.needs_asyncio = True
            self._line(f"async def {self._py_name(fn.name)}({params}){ret}:")
        else:
            self._line(f"def {self._py_name(fn.name)}({params}){ret}:")
        self.indent += 1

        # Emit @intent as docstring + assertion
        if fn.intent:
            self._line(f'"""Intent: {fn.intent}"""')

        prev = self.in_function
        self.in_function = True
        self._emit_block_body(fn.body)
        self.in_function = prev
        self.indent -= 1
        self._blank()

    def _emit_param(self, p: Param) -> str:
        s = p.name
        if p.type_ann:
            s += f": {self._emit_type_hint(p.type_ann)}"
        if p.default:
            s += f" = {self._emit_expr(p.default)}"
        return s

    def _emit_type_decl(self, td: TypeDecl):
        self._blank()
        self._line("@dataclass")
        self._line(f"class {td.name}:")
        self.indent += 1
        if not td.fields:
            self._line("pass")
        for f in td.fields:
            hint = self._emit_type_hint(f.type_ann)
            if f.default:
                self._line(f"{f.name}: {hint} = {self._emit_expr(f.default)}")
            else:
                self._line(f"{f.name}: {hint}")

            # Emit runtime constraint check in __post_init__
        has_constraints = any(isinstance(f.type_ann, ConstraintType) for f in td.fields)
        if has_constraints:
            self._blank()
            self._line("def __post_init__(self):")
            self.indent += 1
            for f in td.fields:
                if isinstance(f.type_ann, ConstraintType):
                    check = self._emit_constraint_check(f.name, f.type_ann)
                    self._line(f"if not ({check}):")
                    self.indent += 1
                    self._line(f'raise ValueError(f"Constraint violation on {f.name}: '
                               f'{{self.{f.name}}} does not satisfy {self._constraint_str(f.type_ann)}")')
                    self.indent -= 1
            self.indent -= 1

        self.indent -= 1
        self._blank()

    def _emit_constraint_check(self, field_name: str, ct: ConstraintType) -> str:
        """Emit a Python boolean expression for a constraint."""
        return self._emit_constraint_expr(ct.constraint, field_name)

    def _emit_constraint_expr(self, expr: Expr, var_name: str) -> str:
        """Emit constraint expression, replacing the constraint parameter with the variable name."""
        if isinstance(expr, BinaryOp):
            left = self._emit_constraint_expr(expr.left, var_name)
            right = self._emit_constraint_expr(expr.right, var_name)
            op = self._py_op(expr.op)
            return f"{left} {op} {right}"
        if isinstance(expr, Identifier):
            # The constraint variable refers to the field value
            return f"self.{var_name}"
        if isinstance(expr, IntLiteral):
            return str(expr.value)
        if isinstance(expr, FloatLiteral):
            return str(expr.value)
        return self._emit_expr(expr)

    def _constraint_str(self, ct: ConstraintType) -> str:
        if isinstance(ct.constraint, BinaryOp):
            return f"{ct.param_name} {ct.constraint.op} {self._emit_expr(ct.constraint.right)}"
        return "constraint"

    def _emit_let(self, stmt: LetStmt):
        value = self._emit_expr(stmt.value)
        if stmt.type_ann:
            hint = self._emit_type_hint(stmt.type_ann)
            self._line(f"{stmt.name}: {hint} = {value}")
        else:
            self._line(f"{stmt.name} = {value}")

    def _emit_for(self, stmt: ForStmt):
        self._line(f"for {stmt.var_name} in {self._emit_expr(stmt.iterable)}:")
        self.indent += 1
        self._emit_block_body(stmt.body)
        self.indent -= 1

    def _emit_while(self, stmt: WhileStmt):
        self._line(f"while {self._emit_expr(stmt.condition)}:")
        self.indent += 1
        self._emit_block_body(stmt.body)
        self.indent -= 1

    def _emit_if_stmt(self, stmt: IfStmt):
        self._line(f"if {self._emit_expr(stmt.condition)}:")
        self.indent += 1
        self._emit_block_body(stmt.then_body)
        self.indent -= 1
        if stmt.else_body:
            if isinstance(stmt.else_body, IfStmt):
                elif_stmt = stmt.else_body
                self._line(f"elif {self._emit_expr(elif_stmt.condition)}:")
                self.indent += 1
                self._emit_block_body(elif_stmt.then_body)
                self.indent -= 1
                if elif_stmt.else_body:
                    if isinstance(elif_stmt.else_body, IfStmt):
                        self._emit_if_stmt(IfStmt(
                            condition=Expr(), then_body=BlockExpr(),
                            else_body=elif_stmt.else_body
                        ))
                    else:
                        self._line("else:")
                        self.indent += 1
                        self._emit_block_body(elif_stmt.else_body)
                        self.indent -= 1
            else:
                self._line("else:")
                self.indent += 1
                self._emit_block_body(stmt.else_body)
                self.indent -= 1

    def _emit_block_body(self, block: BlockExpr):
        if not block.stmts and not block.final_expr:
            self._line("pass")
            return
        for s in block.stmts:
            self._emit_stmt(s)
        if block.final_expr:
            if self.in_function:
                self._line(f"return {self._emit_expr(block.final_expr)}")
            else:
                self._line(self._emit_expr(block.final_expr))

    # --- Expressions ---

    def _emit_expr(self, expr: Expr) -> str:
        if isinstance(expr, IntLiteral):
            return str(expr.value)
        if isinstance(expr, FloatLiteral):
            return str(expr.value)
        if isinstance(expr, StringLiteral):
            return self._emit_string(expr)
        if isinstance(expr, BoolLiteral):
            return "True" if expr.value else "False"
        if isinstance(expr, NullLiteral):
            return "None"
        if isinstance(expr, Identifier):
            return self._py_name(expr.name)
        if isinstance(expr, BinaryOp):
            left = self._emit_expr(expr.left)
            right = self._emit_expr(expr.right)
            op = self._py_op(expr.op)
            return f"({left} {op} {right})"
        if isinstance(expr, UnaryOp):
            operand = self._emit_expr(expr.operand)
            if expr.op == "!":
                return f"(not {operand})"
            return f"({expr.op}{operand})"
        if isinstance(expr, CallExpr):
            callee = self._emit_expr(expr.callee)
            args = ", ".join(self._emit_expr(a) for a in expr.args)
            return f"{callee}({args})"
        if isinstance(expr, MemberExpr):
            return f"{self._emit_expr(expr.obj)}.{expr.member}"
        if isinstance(expr, IndexExpr):
            return f"{self._emit_expr(expr.obj)}[{self._emit_expr(expr.index)}]"
        if isinstance(expr, StructLiteral):
            fields = ", ".join(f"{n}={self._emit_expr(v)}" for n, v in expr.fields)
            return f"{expr.type_name}({fields})"
        if isinstance(expr, ListLiteral):
            elems = ", ".join(self._emit_expr(e) for e in expr.elements)
            return f"[{elems}]"
        if isinstance(expr, MapLiteral):
            entries = ", ".join(f"{self._emit_expr(k)}: {self._emit_expr(v)}" for k, v in expr.entries)
            return "{" + entries + "}"
        if isinstance(expr, QueryExpr):
            return self._emit_query(expr)
        if isinstance(expr, SpawnExpr):
            return self._emit_spawn(expr)
        if isinstance(expr, IfExpr):
            then_s = self._emit_expr(expr.then_branch)
            else_s = self._emit_expr(expr.else_branch) if expr.else_branch else "None"
            cond = self._emit_expr(expr.condition)
            return f"({then_s} if {cond} else {else_s})"
        if isinstance(expr, BlockExpr):
            # Inline block — use the final expression
            if expr.final_expr:
                return self._emit_expr(expr.final_expr)
            return "None"
        if isinstance(expr, NullCheck):
            inner = self._emit_expr(expr.inner)
            return f"(None if {inner} is None else {inner})"
        if isinstance(expr, AwaitExpr):
            self.needs_asyncio = True
            return f"(await {self._emit_expr(expr.inner)})"
        if isinstance(expr, MatchExpr):
            return self._emit_match(expr)
        if isinstance(expr, LambdaExpr):
            params = ", ".join(n for n, _ in expr.params)
            body = self._emit_expr(expr.body)
            return f"(lambda {params}: {body})"
        return "None"

    def _emit_string(self, expr: StringLiteral) -> str:
        if not expr.interpolations:
            return repr(expr.value)
        # Build f-string
        raw = expr.value
        result = []
        i = 0
        for start_pos, expr_text in expr.interpolations:
            # Add text before this interpolation
            result.append(raw[i:start_pos])
            # Parse and emit the interpolation expression
            from .lexer import tokenize
            from .parser import parse as parse_tokens
            try:
                toks = tokenize(expr_text)
                prog = parse_tokens(toks)
                if prog.stmts and isinstance(prog.stmts[0], ExprStmt):
                    py_expr = self._emit_expr(prog.stmts[0].expr)
                    result.append("{" + py_expr + "}")
                else:
                    result.append("{" + expr_text + "}")
            except Exception:
                result.append("{" + expr_text + "}")
            i = start_pos + len(expr_text) + 3  # \( + expr + )
        result.append(raw[i:])
        return 'f"' + "".join(result).replace('"', '\\"') + '"'

    def _emit_query(self, expr: QueryExpr) -> str:
        src = self._emit_expr(expr.source)
        if expr.condition:
            cond = self._emit_expr(expr.condition)
            # Replace 'it' with the loop variable
            cond_replaced = cond.replace("it", "it")
            return f"[it for it in {src} if {cond_replaced}]"
        return f"list({src})"

    def _emit_spawn(self, expr: SpawnExpr) -> str:
        self.needs_asyncio = True
        tasks = ", ".join(self._emit_expr(t) for t in expr.tasks)
        return f"asyncio.gather({tasks})"

    def _emit_match(self, expr: MatchExpr) -> str:
        # Use a series of conditional expressions
        subject = self._emit_expr(expr.subject)
        parts = []
        for pattern, body in reversed(expr.arms):
            pat = self._emit_expr(pattern)
            bod = self._emit_expr(body)
            if parts:
                parts = [f"({bod} if {subject} == {pat} else {parts[0]})"]
            else:
                parts = [bod]
        if parts:
            # Re-build with proper nesting
            result = self._emit_expr(expr.arms[-1][1])  # default last arm
            for pattern, body in reversed(expr.arms[:-1]):
                pat = self._emit_expr(pattern)
                bod = self._emit_expr(body)
                result = f"({bod} if {subject} == {pat} else {result})"
            return result
        return "None"

    # --- Helpers ---

    def _py_name(self, name: str) -> str:
        """Convert multi-word backtick names to snake_case."""
        return name.replace(" ", "_").replace("-", "_")

    def _py_op(self, op: str) -> str:
        mapping = {"&&": "and", "||": "or", "!": "not "}
        return mapping.get(op, op)

    def _emit_type_hint(self, t: TypeNode) -> str:
        if isinstance(t, SimpleType):
            mapping = {"Int": "int", "Float": "float", "String": "str",
                       "Bool": "bool", "Void": "None", "Any": "object"}
            return mapping.get(t.name, t.name)
        if isinstance(t, NullableType):
            return f"{self._emit_type_hint(t.inner)} | None"
        if isinstance(t, ListType):
            return f"list[{self._emit_type_hint(t.element)}]"
        if isinstance(t, MapType):
            return f"dict[{self._emit_type_hint(t.key)}, {self._emit_type_hint(t.value)}]"
        if isinstance(t, FunctionType):
            # Can't express callable type hints simply, use Callable
            return "object"
        if isinstance(t, ConstraintType):
            return self._emit_type_hint(t.base)
        return "object"


def emit_python(program: Program) -> str:
    return Emitter().emit(program)
