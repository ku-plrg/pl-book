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
\begin{prooftree}
\AxiomC{$\vdash e_1 \Rightarrow n_1$}
\AxiomC{$\vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\vdash e_1 + e_2 \Rightarrow n_1 + n_2$}
\end{prooftree}
\\]
