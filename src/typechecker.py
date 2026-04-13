"""Apogee Type Checker — walks the AST and enforces type safety."""

from __future__ import annotations
from typing import Dict, List, Optional
from .ast_nodes import *


class TypeError_(Exception):
    def __init__(self, msg: str, line: int, col: int, suggestion: str = ""):
        self.msg = msg
        self.line = line
        self.col = col
        self.suggestion = suggestion
        full = f"[{line}:{col}] Type error: {msg}"
        if suggestion:
            full += f"\n  Suggestion: {suggestion}"
        super().__init__(full)


# Built-in type names
BUILTIN_TYPES = {"Int", "Float", "String", "Bool", "Void", "Any"}


class TypeEnv:
    """Scope-based type environment."""

    def __init__(self, parent: Optional[TypeEnv] = None):
        self.parent = parent
        self.bindings: Dict[str, TypeNode] = {}
        self.type_defs: Dict[str, TypeDecl] = {}

    def define(self, name: str, typ: TypeNode):
        self.bindings[name] = typ

    def lookup(self, name: str) -> Optional[TypeNode]:
        if name in self.bindings:
            return self.bindings[name]
        if self.parent:
            return self.parent.lookup(name)
        return None

    def define_type(self, name: str, decl: TypeDecl):
        self.type_defs[name] = decl

    def lookup_type(self, name: str) -> Optional[TypeDecl]:
        if name in self.type_defs:
            return self.type_defs[name]
        if self.parent:
            return self.parent.lookup_type(name)
        return None

    def child(self) -> TypeEnv:
        return TypeEnv(parent=self)


class TypeChecker:
    def __init__(self):
        self.errors: List[TypeError_] = []
        self.global_env = TypeEnv()
        # Register builtins
        self.global_env.define("print", FunctionType(
            params=[SimpleType(name="Any")], ret=SimpleType(name="Void")))
        self.global_env.define("len", FunctionType(
            params=[SimpleType(name="Any")], ret=SimpleType(name="Int")))
        self.global_env.define("str", FunctionType(
            params=[SimpleType(name="Any")], ret=SimpleType(name="String")))
        self.global_env.define("int", FunctionType(
            params=[SimpleType(name="Any")], ret=SimpleType(name="Int")))
        self.global_env.define("float", FunctionType(
            params=[SimpleType(name="Any")], ret=SimpleType(name="Float")))
        self.global_env.define("input", FunctionType(
            params=[SimpleType(name="String")], ret=SimpleType(name="String")))
        self.global_env.define("range", FunctionType(
            params=[SimpleType(name="Int")], ret=ListType(element=SimpleType(name="Int"))))

    def check(self, program: Program) -> List[TypeError_]:
        self.errors = []
        env = self.global_env
        for stmt in program.stmts:
            self._check_stmt(stmt, env)
        return self.errors

    def _error(self, msg: str, line: int, col: int, suggestion: str = ""):
        self.errors.append(TypeError_(msg, line, col, suggestion))

    def _resolve_type(self, node: TypeNode) -> TypeNode:
        """Return the node as-is; mainly for future expansion."""
        return node

    def _types_compatible(self, expected: TypeNode, actual: TypeNode) -> bool:
        """Check if actual is assignable to expected."""
        if isinstance(expected, SimpleType) and expected.name == "Any":
            return True
        if isinstance(actual, SimpleType) and actual.name == "Any":
            return True
        if isinstance(expected, SimpleType) and isinstance(actual, SimpleType):
            return expected.name == actual.name
        if isinstance(expected, NullableType):
            if isinstance(actual, NullableType):
                return self._types_compatible(expected.inner, actual.inner)
            # Non-nullable assignable to nullable
            return self._types_compatible(expected.inner, actual)
        if isinstance(expected, ListType) and isinstance(actual, ListType):
            return self._types_compatible(expected.element, actual.element)
        if isinstance(expected, ConstraintType):
            return self._types_compatible(expected.base, actual)
        if isinstance(actual, ConstraintType):
            return self._types_compatible(expected, actual.base)
        return True  # Allow for unresolved types

    def _type_name(self, t: Optional[TypeNode]) -> str:
        if t is None:
            return "unknown"
        if isinstance(t, SimpleType):
            return t.name
        if isinstance(t, NullableType):
            return f"{self._type_name(t.inner)}?"
        if isinstance(t, ListType):
            return f"[{self._type_name(t.element)}]"
        if isinstance(t, ConstraintType):
            return f"{self._type_name(t.base)} where ..."
        if isinstance(t, FunctionType):
            params = ", ".join(self._type_name(p) for p in t.params)
            return f"({params}) -> {self._type_name(t.ret)}"
        return "unknown"

    # --- Statement checking ---

    def _check_stmt(self, stmt: Stmt, env: TypeEnv):
        if isinstance(stmt, FnDecl):
            self._check_fn_decl(stmt, env)
        elif isinstance(stmt, TypeDecl):
            self._check_type_decl(stmt, env)
        elif isinstance(stmt, LetStmt):
            self._check_let(stmt, env)
        elif isinstance(stmt, ExprStmt):
            self._check_expr(stmt.expr, env)
        elif isinstance(stmt, ReturnStmt):
            if stmt.value:
                self._check_expr(stmt.value, env)
        elif isinstance(stmt, ForStmt):
            self._check_for(stmt, env)
        elif isinstance(stmt, WhileStmt):
            cond_type = self._check_expr(stmt.condition, env)
            inner = env.child()
            self._check_block(stmt.body, inner)
        elif isinstance(stmt, IfStmt):
            self._check_if_stmt(stmt, env)
        elif isinstance(stmt, AssignStmt):
            self._check_expr(stmt.target, env)
            self._check_expr(stmt.value, env)
        elif isinstance(stmt, ImportStmt):
            pass  # Imports handled at a higher level

    def _check_fn_decl(self, fn: FnDecl, env: TypeEnv):
        param_types = []
        inner = env.child()
        for p in fn.params:
            pt = p.type_ann or SimpleType(name="Any")
            param_types.append(pt)
            inner.define(p.name, pt)

        ret_type = fn.return_type or SimpleType(name="Any")
        fn_type = FunctionType(params=param_types, ret=ret_type)
        env.define(fn.name, fn_type)

        self._check_block(fn.body, inner)

        # Check return type consistency
        if fn.body.final_expr:
            expr_type = self._check_expr(fn.body.final_expr, inner)
            if fn.return_type and expr_type and not self._types_compatible(fn.return_type, expr_type):
                self._error(
                    f"Function '{fn.name}' returns {self._type_name(expr_type)} "
                    f"but declared return type is {self._type_name(fn.return_type)}",
                    fn.body.final_expr.line, fn.body.final_expr.col
                )

    def _check_type_decl(self, td: TypeDecl, env: TypeEnv):
        env.define_type(td.name, td)
        # Register the type constructor
        env.define(td.name, SimpleType(name=td.name))

        # Check constraint types for fields
        for field in td.fields:
            if isinstance(field.type_ann, ConstraintType):
                self._validate_constraint(field.type_ann, field.line, field.col)

    def _validate_constraint(self, ct: ConstraintType, line: int, col: int):
        """Validate that a constraint expression is well-formed."""
        pass  # Constraints are validated at value assignment time

    def _check_let(self, stmt: LetStmt, env: TypeEnv):
        val_type = self._check_expr(stmt.value, env)
        if stmt.type_ann:
            if val_type and not self._types_compatible(stmt.type_ann, val_type):
                self._error(
                    f"Cannot assign {self._type_name(val_type)} to variable "
                    f"'{stmt.name}' of type {self._type_name(stmt.type_ann)}",
                    stmt.line, stmt.col
                )
            env.define(stmt.name, stmt.type_ann)
        else:
            env.define(stmt.name, val_type or SimpleType(name="Any"))

    def _check_for(self, stmt: ForStmt, env: TypeEnv):
        iter_type = self._check_expr(stmt.iterable, env)
        inner = env.child()
        if isinstance(iter_type, ListType):
            inner.define(stmt.var_name, iter_type.element)
        else:
            inner.define(stmt.var_name, SimpleType(name="Any"))
        self._check_block(stmt.body, inner)

    def _check_if_stmt(self, stmt: IfStmt, env: TypeEnv):
        self._check_expr(stmt.condition, env)
        self._check_block(stmt.then_body, env.child())
        if stmt.else_body:
            if isinstance(stmt.else_body, IfStmt):
                self._check_if_stmt(stmt.else_body, env)
            else:
                self._check_block(stmt.else_body, env.child())

    def _check_block(self, block: BlockExpr, env: TypeEnv):
        for s in block.stmts:
            self._check_stmt(s, env)
        if block.final_expr:
            self._check_expr(block.final_expr, env)

    # --- Expression checking ---

    def _check_expr(self, expr: Expr, env: TypeEnv) -> Optional[TypeNode]:
        if isinstance(expr, IntLiteral):
            t = SimpleType(name="Int")
            expr.resolved_type = t
            return t

        if isinstance(expr, FloatLiteral):
            t = SimpleType(name="Float")
            expr.resolved_type = t
            return t

        if isinstance(expr, StringLiteral):
            t = SimpleType(name="String")
            expr.resolved_type = t
            # Check interpolation expressions
            for _, expr_text in expr.interpolations:
                from .lexer import tokenize as lex
                from .parser import parse as parse_tokens
                try:
                    toks = lex(expr_text)
                    mini_prog = parse_tokens(toks)
                    for s in mini_prog.stmts:
                        if isinstance(s, ExprStmt):
                            self._check_expr(s.expr, env)
                except Exception:
                    pass
            return t

        if isinstance(expr, BoolLiteral):
            t = SimpleType(name="Bool")
            expr.resolved_type = t
            return t

        if isinstance(expr, NullLiteral):
            t = NullableType(inner=SimpleType(name="Any"))
            expr.resolved_type = t
            return t

        if isinstance(expr, Identifier):
            t = env.lookup(expr.name)
            if t is None:
                self._error(f"Undefined variable: '{expr.name}'", expr.line, expr.col,
                            f"Did you mean to declare it with 'let {expr.name} = ...'?")
                t = SimpleType(name="Any")
            expr.resolved_type = t
            return t

        if isinstance(expr, BinaryOp):
            left_t = self._check_expr(expr.left, env)
            right_t = self._check_expr(expr.right, env)
            if expr.op in ("==", "!=", "<", ">", "<=", ">=", "&&", "||"):
                t = SimpleType(name="Bool")
            elif expr.op == "+" and self._is_string(left_t):
                t = SimpleType(name="String")
            else:
                t = left_t or SimpleType(name="Any")
            expr.resolved_type = t
            return t

        if isinstance(expr, UnaryOp):
            inner_t = self._check_expr(expr.operand, env)
            if expr.op == "!":
                t = SimpleType(name="Bool")
            else:
                t = inner_t
            expr.resolved_type = t
            return t

        if isinstance(expr, CallExpr):
            callee_t = self._check_expr(expr.callee, env)
            for arg in expr.args:
                self._check_expr(arg, env)
            if isinstance(callee_t, FunctionType):
                t = callee_t.ret
            else:
                t = SimpleType(name="Any")
            expr.resolved_type = t
            return t

        if isinstance(expr, MemberExpr):
            obj_t = self._check_expr(expr.obj, env)
            t = self._resolve_member_type(obj_t, expr.member, expr.line, expr.col, env)
            expr.resolved_type = t
            return t

        if isinstance(expr, IndexExpr):
            obj_t = self._check_expr(expr.obj, env)
            self._check_expr(expr.index, env)
            if isinstance(obj_t, ListType):
                t = obj_t.element
            else:
                t = SimpleType(name="Any")
            expr.resolved_type = t
            return t

        if isinstance(expr, StructLiteral):
            td = env.lookup_type(expr.type_name)
            if td is None:
                self._error(f"Unknown type: '{expr.type_name}'", expr.line, expr.col)
            else:
                self._check_struct_fields(expr, td, env)
            t = SimpleType(name=expr.type_name)
            expr.resolved_type = t
            return t

        if isinstance(expr, ListLiteral):
            elem_type = SimpleType(name="Any")
            for e in expr.elements:
                et = self._check_expr(e, env)
                if et and not isinstance(et, SimpleType) or (isinstance(et, SimpleType) and et.name != "Any"):
                    elem_type = et
            t = ListType(element=elem_type)
            expr.resolved_type = t
            return t

        if isinstance(expr, QueryExpr):
            src_t = self._check_expr(expr.source, env)
            inner = env.child()
            if isinstance(src_t, ListType):
                inner.define(expr.item_name, src_t.element)
            else:
                inner.define(expr.item_name, SimpleType(name="Any"))
            if expr.condition:
                self._check_expr(expr.condition, inner)
            t = src_t or ListType(element=SimpleType(name="Any"))
            expr.resolved_type = t
            return t

        if isinstance(expr, SpawnExpr):
            for task in expr.tasks:
                self._check_expr(task, env)
            t = SimpleType(name="Any")
            expr.resolved_type = t
            return t

        if isinstance(expr, IfExpr):
            self._check_expr(expr.condition, env)
            then_t = self._check_expr(expr.then_branch, env)
            if expr.else_branch:
                self._check_expr(expr.else_branch, env)
            expr.resolved_type = then_t
            return then_t

        if isinstance(expr, BlockExpr):
            inner = env.child()
            for s in expr.stmts:
                self._check_stmt(s, inner)
            t = None
            if expr.final_expr:
                t = self._check_expr(expr.final_expr, inner)
            expr.resolved_type = t
            return t

        if isinstance(expr, NullCheck):
            inner_t = self._check_expr(expr.inner, env)
            if inner_t and not isinstance(inner_t, NullableType):
                self._error(
                    f"Null check '?' used on non-nullable type {self._type_name(inner_t)}",
                    expr.line, expr.col,
                    "The '?' operator is only needed for nullable types (Type?)"
                )
            if isinstance(inner_t, NullableType):
                t = NullableType(inner=inner_t.inner)
            else:
                t = inner_t
            expr.resolved_type = t
            return t

        if isinstance(expr, AwaitExpr):
            inner_t = self._check_expr(expr.inner, env)
            expr.resolved_type = inner_t
            return inner_t

        if isinstance(expr, MatchExpr):
            self._check_expr(expr.subject, env)
            t = None
            for pattern, body in expr.arms:
                self._check_expr(pattern, env)
                arm_t = self._check_expr(body, env)
                if t is None:
                    t = arm_t
            expr.resolved_type = t
            return t

        if isinstance(expr, MapLiteral):
            for k, v in expr.entries:
                self._check_expr(k, env)
                self._check_expr(v, env)
            t = SimpleType(name="Any")
            expr.resolved_type = t
            return t

        if isinstance(expr, LambdaExpr):
            inner = env.child()
            for pname, ptype in expr.params:
                inner.define(pname, ptype or SimpleType(name="Any"))
            ret_t = self._check_expr(expr.body, inner)
            t = FunctionType(
                params=[p or SimpleType(name="Any") for _, p in expr.params],
                ret=ret_t or SimpleType(name="Any")
            )
            expr.resolved_type = t
            return t

        return None

    def _is_string(self, t: Optional[TypeNode]) -> bool:
        return isinstance(t, SimpleType) and t.name == "String"

    def _resolve_member_type(self, obj_t: Optional[TypeNode], member: str,
                             line: int, col: int, env: TypeEnv) -> TypeNode:
        if isinstance(obj_t, SimpleType):
            td = env.lookup_type(obj_t.name)
            if td:
                for f in td.fields:
                    if f.name == member:
                        return f.type_ann
                self._error(f"Type '{obj_t.name}' has no field '{member}'", line, col)
        return SimpleType(name="Any")

    def _check_struct_fields(self, expr: StructLiteral, td: TypeDecl, env: TypeEnv):
        provided = {name for name, _ in expr.fields}
        required = {f.name for f in td.fields if f.default is None}
        missing = required - provided
        if missing:
            self._error(
                f"Missing fields in {td.name}: {', '.join(sorted(missing))}",
                expr.line, expr.col
            )
        for fname, fexpr in expr.fields:
            val_type = self._check_expr(fexpr, env)
            field_def = next((f for f in td.fields if f.name == fname), None)
            if field_def is None:
                self._error(f"Unknown field '{fname}' in type '{td.name}'", fexpr.line, fexpr.col)
            elif field_def.type_ann:
                if val_type and not self._types_compatible(field_def.type_ann, val_type):
                    self._error(
                        f"Field '{fname}' expects {self._type_name(field_def.type_ann)}, "
                        f"got {self._type_name(val_type)}",
                        fexpr.line, fexpr.col
                    )
                # Check constraints at compile time for literals
                if isinstance(field_def.type_ann, ConstraintType):
                    lit_val = self._extract_literal_value(fexpr)
                    if lit_val is not None:
                        self._check_constraint_value(field_def.type_ann, lit_val, fexpr.line, fexpr.col)

    def _extract_literal_value(self, expr: Expr):
        """Extract a numeric value from a literal or negated literal."""
        if isinstance(expr, IntLiteral):
            return expr.value
        if isinstance(expr, FloatLiteral):
            return expr.value
        if isinstance(expr, UnaryOp) and expr.op == "-":
            inner = self._extract_literal_value(expr.operand)
            if inner is not None:
                return -inner
        return None

    def _check_constraint_value(self, ct: ConstraintType, val: int | float, line: int, col: int):
        """Check if a literal value satisfies a constraint at compile time."""

        constraint = ct.constraint
        if isinstance(constraint, BinaryOp):
            if isinstance(constraint.left, Identifier) and isinstance(constraint.right, (IntLiteral, FloatLiteral)):
                threshold = constraint.right.value if isinstance(constraint.right, IntLiteral) else constraint.right.value
                op = constraint.op
                ok = True
                if op == ">=" and not (val >= threshold):
                    ok = False
                elif op == ">" and not (val > threshold):
                    ok = False
                elif op == "<=" and not (val <= threshold):
                    ok = False
                elif op == "<" and not (val < threshold):
                    ok = False
                elif op == "==" and not (val == threshold):
                    ok = False

                if not ok:
                    self._error(
                        f"Constraint violation: value {val} does not satisfy "
                        f"{constraint.left.name} {op} {threshold}",
                        line, col,
                        f"The value must satisfy: {constraint.left.name} {op} {threshold}"
                    )


def typecheck(program: Program) -> List[TypeError_]:
    return TypeChecker().check(program)
