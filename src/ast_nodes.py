"""Apogee AST node definitions."""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import List, Optional


# --- Type nodes ---

@dataclass
class TypeNode:
    line: int = 0
    col: int = 0

@dataclass
class SimpleType(TypeNode):
    name: str = ""

@dataclass
class NullableType(TypeNode):
    inner: TypeNode = field(default_factory=TypeNode)

@dataclass
class ConstraintType(TypeNode):
    base: TypeNode = field(default_factory=TypeNode)
    param_name: str = ""
    constraint: Expr = field(default_factory=lambda: Expr())

@dataclass
class ListType(TypeNode):
    element: TypeNode = field(default_factory=TypeNode)

@dataclass
class MapType(TypeNode):
    key: TypeNode = field(default_factory=TypeNode)
    value: TypeNode = field(default_factory=TypeNode)

@dataclass
class FunctionType(TypeNode):
    params: List[TypeNode] = field(default_factory=list)
    ret: TypeNode = field(default_factory=TypeNode)


# --- Expression nodes ---

@dataclass
class Expr:
    line: int = 0
    col: int = 0
    resolved_type: Optional[TypeNode] = field(default=None, repr=False)

@dataclass
class IntLiteral(Expr):
    value: int = 0

@dataclass
class FloatLiteral(Expr):
    value: float = 0.0

@dataclass
class StringLiteral(Expr):
    value: str = ""
    interpolations: List[tuple] = field(default_factory=list)
    # interpolations: list of (start_pos_in_value, expr_text)

@dataclass
class BoolLiteral(Expr):
    value: bool = False

@dataclass
class NullLiteral(Expr):
    pass

@dataclass
class Identifier(Expr):
    name: str = ""

@dataclass
class BinaryOp(Expr):
    op: str = ""
    left: Expr = field(default_factory=Expr)
    right: Expr = field(default_factory=Expr)

@dataclass
class UnaryOp(Expr):
    op: str = ""
    operand: Expr = field(default_factory=Expr)

@dataclass
class CallExpr(Expr):
    callee: Expr = field(default_factory=Expr)
    args: List[Expr] = field(default_factory=list)

@dataclass
class MemberExpr(Expr):
    obj: Expr = field(default_factory=Expr)
    member: str = ""

@dataclass
class IndexExpr(Expr):
    obj: Expr = field(default_factory=Expr)
    index: Expr = field(default_factory=Expr)

@dataclass
class StructLiteral(Expr):
    type_name: str = ""
    fields: List[tuple[str, Expr]] = field(default_factory=list)

@dataclass
class ListLiteral(Expr):
    elements: List[Expr] = field(default_factory=list)

@dataclass
class MapLiteral(Expr):
    entries: List[tuple[Expr, Expr]] = field(default_factory=list)

@dataclass
class LambdaExpr(Expr):
    params: List[tuple[str, Optional[TypeNode]]] = field(default_factory=list)
    body: Expr = field(default_factory=Expr)

@dataclass
class QueryExpr(Expr):
    """from X where Y  →  [item for item in X if Y]"""
    source: Expr = field(default_factory=Expr)
    item_name: str = "it"
    condition: Optional[Expr] = None

@dataclass
class SpawnExpr(Expr):
    """spawn { a(); b() }  →  asyncio.gather(a(), b())"""
    tasks: List[Expr] = field(default_factory=list)

@dataclass
class IfExpr(Expr):
    condition: Expr = field(default_factory=Expr)
    then_branch: Expr = field(default_factory=Expr)
    else_branch: Optional[Expr] = None

@dataclass
class BlockExpr(Expr):
    stmts: List[Stmt] = field(default_factory=list)
    final_expr: Optional[Expr] = None

@dataclass
class MatchExpr(Expr):
    subject: Expr = field(default_factory=Expr)
    arms: List[tuple[Expr, Expr]] = field(default_factory=list)

@dataclass
class NullCheck(Expr):
    """expr? — safe access on nullable"""
    inner: Expr = field(default_factory=Expr)

@dataclass
class AwaitExpr(Expr):
    inner: Expr = field(default_factory=Expr)


# --- Statement nodes ---

@dataclass
class Stmt:
    line: int = 0
    col: int = 0

@dataclass
class LetStmt(Stmt):
    name: str = ""
    type_ann: Optional[TypeNode] = None
    value: Expr = field(default_factory=Expr)
    mutable: bool = False

@dataclass
class ExprStmt(Stmt):
    expr: Expr = field(default_factory=Expr)

@dataclass
class ReturnStmt(Stmt):
    value: Optional[Expr] = None

@dataclass
class Param:
    name: str = ""
    type_ann: Optional[TypeNode] = None
    default: Optional[Expr] = None
    line: int = 0
    col: int = 0

@dataclass
class FnDecl(Stmt):
    name: str = ""
    params: List[Param] = field(default_factory=list)
    return_type: Optional[TypeNode] = None
    body: BlockExpr = field(default_factory=BlockExpr)
    is_async: bool = False
    intent: Optional[str] = None

@dataclass
class TypeField:
    name: str = ""
    type_ann: TypeNode = field(default_factory=TypeNode)
    default: Optional[Expr] = None
    line: int = 0
    col: int = 0

@dataclass
class TypeDecl(Stmt):
    name: str = ""
    fields: List[TypeField] = field(default_factory=list)

@dataclass
class ImportStmt(Stmt):
    module: str = ""
    names: List[str] = field(default_factory=list)  # empty = import all

@dataclass
class ForStmt(Stmt):
    var_name: str = ""
    iterable: Expr = field(default_factory=Expr)
    body: BlockExpr = field(default_factory=BlockExpr)

@dataclass
class WhileStmt(Stmt):
    condition: Expr = field(default_factory=Expr)
    body: BlockExpr = field(default_factory=BlockExpr)

@dataclass
class IfStmt(Stmt):
    condition: Expr = field(default_factory=Expr)
    then_body: BlockExpr = field(default_factory=BlockExpr)
    else_body: Optional[BlockExpr | IfStmt] = None

@dataclass
class AssignStmt(Stmt):
    target: Expr = field(default_factory=Expr)
    value: Expr = field(default_factory=Expr)


# --- Program ---

@dataclass
class Program:
    stmts: List[Stmt] = field(default_factory=list)
    filename: str = "<stdin>"
