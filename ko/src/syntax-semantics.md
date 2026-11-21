# 문법과 의미

코드 블록과 수식이 잘 보이는지 확인하는 샘플 페이지입니다.

```scala
enum Expr:
  case Num(n: BigInt)
  case Add(l: Expr, r: Expr)

def interp(expr: Expr): BigInt = expr match
  case Expr.Num(n)    => n
  case Expr.Add(l, r) => interp(l) + interp(r)
```

본문 수식: \\( \vdash e \Rightarrow n \\).

\\[
\frac{\vdash e_1 \Rightarrow n_1 \qquad \vdash e_2 \Rightarrow n_2}
     {\vdash e_1 + e_2 \Rightarrow n_1 + n_2}
\;\textsf{Add}
\\]
