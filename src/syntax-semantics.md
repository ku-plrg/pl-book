# Syntax and Semantics

A sample page to check code blocks and math rendering.

```scala
enum Expr:
  case Num(n: BigInt)
  case Add(l: Expr, r: Expr)

def interp(expr: Expr): BigInt = expr match
  case Expr.Num(n)    => n
  case Expr.Add(l, r) => interp(l) + interp(r)
```

Inline math: \\( \vdash e \Rightarrow n \\).

\\[
\frac{\vdash e_1 \Rightarrow n_1 \qquad \vdash e_2 \Rightarrow n_2}
     {\vdash e_1 + e_2 \Rightarrow n_1 + n_2}
\;\textsf{Add}
\\]
