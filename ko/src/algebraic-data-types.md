# 대수적 데이터 타입

지금까지 우리 언어의 타입은 `Number`, `Boolean`, 그리고 함수 타입뿐이었습니다. 그런데 실제로 프로그램을 짜다 보면 "<a id="g-tree"></a>나무(tree)", "식(expression)", "숫자 리스트"처럼 문제에 맞는 새로운 타입을 만들고 싶어집니다. 이 책에서 계속 써 온 Scala의 `enum Expr`가 바로 그런 예입니다. 이 장에서는 기존 타입을 조합해 새로운 타입을 만드는 방법, 특히 대수적 데이터 타입(algebraic data type, ADT)과 그 값을 분해하는 패턴 매칭(pattern matching)을 배웁니다.

이 장의 흐름은 다음과 같습니다.

1. 곱 타입, 합집합 타입, 합 타입을 차례로 살펴보고, 이들을 조합한 대수적 데이터 타입이 무엇인지 알아봅니다.
2. [재귀 함수의 타입](./typing-recursive-functions.md)에서 만든 TRFAE에 대수적 데이터 타입과 패턴 매칭을 더해 ATFAE를 정의합니다.
3. ATFAE의 인터프리터와 자연 의미(natural semantics)를 정의합니다.
4. ATFAE의 타입 검사기(type checker)와 타입 규칙(typing rule)을 정의합니다.
5. 마지막으로, 처음 만든 타입 시스템에 숨어 있는 구멍을 찾아 타입 안전성(type soundness)을 회복합니다.

이 장에서 만들 `ATFAE` 인터프리터를 먼저 돌려 봅시다. 프로그램을 고쳐 가며 실행해 보세요.

<div class="playground" data-lang="ATFAE"></div>

## 대수적 데이터 타입과 패턴 매칭

### 다시 보기: 타입

[타입 시스템](./type-systems.md)에서 타입을 다음과 같이 정의했습니다.

> **정의(타입)**: 타입(type)은 값들의 집합입니다.

예를 들어 Scala의 `Int`, `Boolean`, `Int => Int` 타입은 각각 다음과 같은 값들의 집합입니다.

\\[
\begin{array}{lcl}
\texttt{Int} &=& \\{ n \in \mathbb{Z} \mid -2^{31} \leq n \lt 2^{31} \\} \\\\
\texttt{Boolean} &=& \\{ \texttt{true}, \texttt{false} \\} \\\\
\texttt{Int => Int} &=& \\{ f \mid f \text{ is a function from } \texttt{Int} \text{ to } \texttt{Int} \\}
\end{array}
\\]

```scala
val n: Int = 42             // 42   : Int
val b: Boolean = n > 10     // true : Boolean
def f(x: Int): Int = x + 1  // f    : Int => Int
f(42)                       // 43   : Int
```

그렇다면 이미 있는 타입들을 **조합해서** 새로운 타입을 만들 수는 없을까요? 물론 있습니다! 곱 타입, 합집합 타입, 합 타입, 그리고 대수적 데이터 타입이 그 방법입니다. 타입이 값들의 집합이라는 관점을 붙잡고 있으면, 각각이 집합의 어떤 연산에 해당하는지 자연스럽게 보입니다.

### 곱 타입

> **정의(곱 타입)**: 곱 타입(product type) \\((\tau_1, \ldots, \tau_n)\\)은 각 \\(1 \leq i \leq n\\)에 대해 \\(v_i\\)의 타입이 \\(\tau_i\\)인 값 \\((v_1, \ldots, v_n)\\)들의 집합입니다.

곱 타입은 집합의 <a id="g-cartesian-product"></a>데카르트 곱(Cartesian product)에 해당합니다.

\\[
(\tau_1, \ldots, \tau_n) = \tau_1 \times \ldots \times \tau_n
\\]

Scala에서는 튜플로 곱 타입을 만듭니다.

```scala
// A product type consisting of three different types
val triple: (Int, Boolean, String) = (42, true, "abc")

// A rectangle type with its width and height
type Rectangle = (Int, Int)
val rectangle: Rectangle = (10, 20)
val (w, h) = rectangle
val perimeter: Int = 2 * (w + h)      // 2 * (10 + 20) = 60
```

곱 타입의 값은 "이것 **그리고** 저것"을 모두 가지고 있습니다. 직사각형은 너비 **그리고** 높이를 가지지요.

### 합집합 타입

> **정의(합집합 타입)**: <a id="g-union-type"></a>합집합 타입(union type) \\(\tau_1 \mid \ldots \mid \tau_n\\)은 타입이 \\(\tau_1, \ldots, \tau_n\\) 중 하나인 값들의 집합입니다.

이름 그대로 집합의 합집합에 해당합니다.

\\[
\tau_1 \mid \ldots \mid \tau_n = \tau_1 \cup \ldots \cup \tau_n
\\]

Scala 3에서는 `|`로 합집합 타입을 만들 수 있습니다.

```scala
val a: Int | Boolean | String = 42
val b: Int | Boolean | String = true
val c: Int | Boolean | String = "abc"

type Square = Int                 // A square type
type Triangle = Int               // An equilateral triangle type
val x: Square | Triangle = 42     // Is this a square or a triangle?
```

합집합 타입의 값은 "이것 **또는** 저것"입니다. 그런데 마지막 예를 보세요. 정사각형은 한 변의 길이로, 정삼각형도 한 변의 길이로 나타냈습니다. 둘 다 `Int`이므로 `Square | Triangle`은 그냥 `Int`와 같은 집합입니다. 그러면 `x`가 정사각형인지 정삼각형인지 **구별**할 방법이 없습니다. 어떻게 하면 구별할 수 있을까요? 답은 합 타입입니다.

### 합 타입

> **정의(합 타입)**: <a id="g-sum-type"></a>합 타입(sum type) \\(x_1(\tau_1) + \ldots + x_n(\tau_n)\\)은 배리언트(variant) \\(x_i(\tau_i)\\) (\\(1 \leq i \leq n\\))들로 이루어집니다. 각 배리언트 \\(x_i(\tau_i)\\)에서 \\(x_i\\)는 생성자(constructor)로, 타입 \\(\tau_i\\)의 값 \\(v\\)를 받아 합 타입의 값 \\(x_i(v)\\)를 만드는 함수입니다.

합 타입은 값마다 어느 배리언트에서 왔는지 <a id="g-tag"></a>꼬리표(tag)를 붙여 둔 합집합, 즉 <a id="g-tagged-union"></a>꼬리표 붙은 합집합(tagged union)에 해당합니다.

\\[
x_1(\tau_1) + \ldots + x_n(\tau_n) = \\{ x_i(v) \mid \exists 1 \leq i \leq n.\ \text{s.t.}\ v \in \tau_i \\}
\\]

Scala에서는 `enum`으로 합 타입을 만듭니다.

```scala
enum Shape:
  case Square(side: Int)                  // A variant for squares
  case Triangle(side: Int)                // A variant for triangles
val x: Shape = Square(42)                 // It is a square
val y: Shape = Triangle(42)               // It is a triangle
```

이제 `Square(42)`와 `Triangle(42)`는 안에 든 숫자가 같아도 꼬리표가 달라서 서로 다른 값입니다. 드디어 정사각형과 정삼각형을 구별할 수 있게 되었습니다! 용어를 다시 정리하면 다음과 같습니다.

- `Square`는 `Int`를 받아 `Shape`를 만드는 **생성자**입니다. 즉 `Square`의 타입은 `Int => Shape`입니다.
- `Square(42)`는 생성자 `Square`로 만든 `Shape` 타입의 **값**입니다.

앞의 합집합 타입과 이 합 타입을 값의 집합으로 그려 비교하면 차이가 잘 보입니다.

<div style="text-align:center">
<svg viewBox="0 0 620 230" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="합집합 타입 Square | Triangle은 Int와 같은 집합이라 42가 정사각형인지 삼각형인지 구별할 수 없지만, 합 타입 Shape에서는 Square(42)와 Triangle(42)가 꼬리표로 구별된다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="algebraic-data-types-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="150" y="28" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-weight="bold">Square | Triangle</text>
<ellipse cx="150" cy="115" rx="115" ry="68" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="150" y="72" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14" opacity="0.8">Int</text>
<text x="110" y="112" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">42</text>
<text x="190" y="112" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">7</text>
<text x="150" y="148" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">...</text>
<text x="150" y="212" text-anchor="middle" font-size="14">= Int: 42는 정사각형? 삼각형?</text>
<text x="465" y="28" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-weight="bold">Shape</text>
<rect x="330" y="45" width="270" height="140" rx="4" fill="none" stroke="currentColor" stroke-width="1.8"/>
<polyline points="465,52 465,178" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 4"/>
<text x="397" y="70" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13" opacity="0.8">Square(Int)</text>
<text x="533" y="70" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13" opacity="0.8">Triangle(Int)</text>
<text x="397" y="108" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Square(42)</text>
<text x="533" y="108" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Triangle(42)</text>
<text x="397" y="138" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Square(7)</text>
<text x="533" y="138" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Triangle(7)</text>
<text x="397" y="166" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">...</text>
<text x="533" y="166" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">...</text>
<text x="465" y="212" text-anchor="middle" font-size="14">꼬리표 Square, Triangle로 구별</text>
</svg>
</div>

### 대수적 데이터 타입

> **정의(대수적 데이터 타입)**: 대수적 데이터 타입 \\(x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}) + \ldots + x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})\\)은 곱 타입들의 **재귀적인** 합 타입입니다.

정의를 하나씩 뜯어 보면, 각 배리언트가 여러 값을 묶은 곱 타입을 담고(\\(x_i(\tau_{i,1}, \ldots, \tau_{i,m_i})\\)), 그런 배리언트들을 합 타입으로 모았으며, 배리언트 안에 자기 자신의 타입이 다시 나올 수 있다는(재귀적) 뜻입니다. "대수적"이라는 이름도 곱(\\(\times\\))과 합(\\(+\\))으로 타입을 만든다는 데서 왔습니다.

예를 들어 이진 트리를 대수적 데이터 타입으로 정의해 봅시다.

```scala
enum Tree:
  case Leaf(v: Int)
  case Node(l: Tree, v: Int, r: Tree)

val t1: Tree = Node(Leaf(1), 2, Leaf(3))
val t2: Tree = Node(Leaf(1), 2, Node(Leaf(3), 4, Leaf(5)))
```

`Node` 배리언트 안에 `Tree`가 다시 등장한다는 점에 주목하세요. `t1`과 `t2`를 그림으로 그리면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 620 250" width="100%" style="max-width: 560px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="t1 = Node(Leaf(1), 2, Leaf(3))과 t2 = Node(Leaf(1), 2, Node(Leaf(3), 4, Leaf(5)))를 배리언트 값의 트리로 그린 그림" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="algebraic-data-types-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="130" y="24" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-weight="bold">t1</text>
<rect x="90" y="40" width="80" height="30" rx="4" fill="#2a408e"/>
<text x="130" y="60" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">Node 2</text>
<rect x="30" y="120" width="80" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="140" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Leaf 1</text>
<rect x="150" y="120" width="80" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="190" y="140" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Leaf 3</text>
<polyline points="115,70 75,118" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#algebraic-data-types-2)"/>
<text x="83.0" y="95.0" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12" opacity="0.8">l</text>
<polyline points="145,70 185,118" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#algebraic-data-types-2)"/>
<text x="177.0" y="95.0" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12" opacity="0.8">r</text>
<text x="420" y="24" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-weight="bold">t2</text>
<rect x="380" y="40" width="80" height="30" rx="4" fill="#2a408e"/>
<text x="420" y="60" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">Node 2</text>
<rect x="310" y="120" width="80" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="350" y="140" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Leaf 1</text>
<rect x="450" y="120" width="80" height="30" rx="4" fill="#2a408e"/>
<text x="490" y="140" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">Node 4</text>
<rect x="390" y="200" width="80" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="430" y="220" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Leaf 3</text>
<rect x="510" y="200" width="80" height="30" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="220" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Leaf 5</text>
<polyline points="405,70 355,118" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#algebraic-data-types-2)"/>
<text x="368.0" y="95.0" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12" opacity="0.8">l</text>
<polyline points="435,70 485,118" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#algebraic-data-types-2)"/>
<text x="472.0" y="95.0" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12" opacity="0.8">r</text>
<polyline points="475,150 435,198" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#algebraic-data-types-2)"/>
<text x="443.0" y="175.0" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12" opacity="0.8">l</text>
<polyline points="505,150 545,198" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#algebraic-data-types-2)"/>
<text x="537.0" y="175.0" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="12" opacity="0.8">r</text>
</svg>
</div>

### 패턴 매칭

값을 만들었으면 다시 분해할 수도 있어야겠지요.

> **정의(패턴 매칭)**: 패턴 매칭(pattern matching)은 대수적 데이터 타입의 값이 합 타입의 어느 배리언트에 속하는지 알아내고, 그 안에 든 데이터를 꺼내는 방법입니다.

예를 들어 트리에 든 모든 값을 더하는 함수 `sum`을 `Tree` 타입에 대한 패턴 매칭(`match`)으로 정의할 수 있습니다.

```scala
enum Tree:
  case Leaf(v: Int)
  case Node(l: Tree, v: Int, r: Tree)

def sum(t: Tree): Int = t match
  case Leaf(v)       => v
  case Node(l, v, r) => sum(l) + v + sum(r)

sum(Node(Leaf(1), 2, Leaf(3)))                         // 6
sum(Node(Leaf(1), 2, Node(Leaf(3), 4, Leaf(5))))       // 15
```

재귀적인 데이터 타입은 재귀 함수와 아주 잘 어울립니다. `Node`의 두 하위 트리에 대해 `sum`을 다시 부르기만 하면 됩니다.

많은 함수형 언어가 대수적 데이터 타입을 지원합니다. 같은 `Tree` 타입을 여러 언어로 쓰면 다음과 같습니다.

```scala
// Scala
enum Tree { case Leaf(v:Int); case Node(l:Tree, v:Int, r:Tree) }
```

```haskell
-- Haskell
data Tree = Leaf Int | Node Tree Int Tree
```

```rust
// Rust
enum Tree { Leaf(i32), Node(Box<Tree>, i32, Box<Tree>) }
```

```ocaml
(* OCaml *)
type tree = Leaf of int | Node of tree * int * tree
```

문법은 조금씩 달라도 "배리언트 이름과 그 안에 든 값들의 타입을 나열한다"는 핵심은 모두 같습니다.

## ATFAE: 대수적 데이터 타입과 패턴 매칭을 갖춘 TRFAE

이제 TRFAE를 확장해 대수적 데이터 타입과 패턴 매칭을 지원하는 ATFAE를 만들어 봅시다. ATFAE 프로그램은 다음과 같이 생겼습니다.

```atfae,run
/* ATFAE */
enum Tree {
  case Leaf(Number)
  case Node(Tree, Number, Tree)
}
Leaf(42) match {
  case Leaf(v)       => v
  case Node(l, v, r) => v
}
```

ATFAE를 만들려면 TRFAE의 식을 다음 네 가지로 확장해야 합니다.

1. 여러 매개변수를 받는 함수(예: `Node(l, v, r)`처럼 생성자는 여러 값을 받습니다)
2. 대수적 데이터 타입
3. 패턴 매칭
4. <a id="g-type-name"></a>타입 이름(type name) (예: 매개변수 타입으로 쓰는 `Tree`)

### 여러 매개변수를 받는 함수

생성자 `Node`는 값 세 개를 받습니다. 그러니 함수도 여러 매개변수를 받을 수 있게 하는 것이 자연스럽습니다.

```atfae,run
/* ATFAE */
def add(x: Number, y: Number): Number = x + y;
val twice = (f: (Number, Number) => Number, n: Number) => f(n, n);
twice(add, 21)                                      // 42
```

함수, 재귀 함수, 함수 적용, 화살표 타입의 구체 문법(concrete syntax)을 다음과 같이 확장합니다.

```bnf
// expressions
<expr> ::= ...
         | "(" <params> ")" "=>" <expr>                // function
         | "def" <id> "(" <params> ")" ":" <type>      // recursive
           "=" <expr> ";" <expr>                       // function
         | <expr> "(" [ <expr> [ "," <expr> ]* ]? ")"  // application
// parameters
<params> ::= [ <id> ":" <type> [ "," <id> ":" <type> ]* ]?
// types
<type> ::= ...
         | "(" [ <type> [ "," <type> ]* ]? ")" "=>" <type> // arrow type
```

추상 문법(abstract syntax)도 매개변수, 인자, 매개변수 타입이 여러 개가 되도록 바꿉니다.

\\[
\begin{array}{lrcll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots & \\\\
& & \mid & \lambda(x\mathtt{:}\tau, \ldots, x\mathtt{:}\tau).e & (\texttt{Fun}) \\\\
& & \mid & \mathtt{def}\ x(x\mathtt{:}\tau, \ldots, x\mathtt{:}\tau)\mathtt{:}\tau\ \mathtt{=}\ e;\ e & (\texttt{Rec}) \\\\
& & \mid & e(e, \ldots, e) & (\texttt{App}) \\\\
\text{Types} & \mathbb{T} \ni \tau & ::= & \ldots & \\\\
& & \mid & (\tau, \ldots, \tau) \to \tau & (\texttt{ArrowT})
\end{array}
\\]

```scala
enum Expr:
  ...
  case Fun(params: List[Param], body: Expr)
  case Rec(name: String, params: List[Param], rty: Type,
           body: Expr, scope: Expr)
  case App(fun: Expr, args: List[Expr])
case class Param(name: String, ty: Type)
enum Type:
  ...
  case ArrowT(paramTys: List[Type], retTy: Type)
```

### 구체 문법

이제 TRFAE의 구체 문법에 대수적 데이터 타입(`enum`), 패턴 매칭(`match`), 타입 이름을 더합니다.

```bnf
// expressions
<expr> ::= ...
         | "enum" <id> "{" [ <variant> ";"? ]+ "}" ";"? <expr>
         | <expr> "match" "{" [ <mcase> ";"? ]+ "}"
// variants
<variant> ::= "case" <id> "(" ")"
            | "case" <id> "(" <type> [ "," <type> ]* ")"
// match cases
<mcase> ::= "case" <id> "(" ")" "=>" <expr>
          | "case" <id> "(" <id> [ "," <id> ]* ")" "=>" <expr>
// types
<type> ::= ... | <id>       // type names
```

`enum` 정의 뒤에는 그 타입을 쓸 수 있는 본문 식이 이어집니다. `val`처럼 스코프(scope)를 가진 정의인 셈입니다. 한 가지 주의할 점이 있습니다. 하나의 `enum` 정의 안에서 **배리언트 이름은 모두 달라야** 합니다. 예를 들어 `enum A { case X(Number); case X(Boolean) }`은 파서가 거부합니다. 같은 이름의 생성자가 두 개 있으면 `X(1)`이 어느 쪽인지 알 수 없기 때문입니다.

### 추상 문법

추상 문법은 다음과 같습니다. \\(\tau^{\ast}\\)는 타입이 0개 이상 나열된 것, \\([\ldots]^{+}\\)는 대괄호 안의 내용이 1번 이상 반복된 것을 뜻합니다.

\\[
\begin{array}{lrcll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots & \\\\
& & \mid & \mathtt{enum}\ t\ \\{\ [\mathtt{case}\ x(\tau^{\ast})]^{+}\ \\};\ e & (\texttt{TypeDef}) \\\\
& & \mid & e\ \mathtt{match}\ \\{\ [\mathtt{case}\ x(x^{\ast})\ \mathtt{=>}\ e]^{+}\ \\} & (\texttt{Match}) \\\\
\text{Types} & \mathbb{T} \ni \tau & ::= & \ldots & \\\\
& & \mid & t & (\texttt{NameT}) \\\\
\text{Type Names} & & & t \in \mathbb{X}_t & (\texttt{String})
\end{array}
\\]

```scala
enum Expr:
  ...
  case TypeDef(name: String, varts: List[Variant], body: Expr)
  case Match(expr: Expr, mcases: List[MatchCase])

case class Variant(name: String, ptys: List[Type])
case class MatchCase(name: String, params: List[String], body: Expr)
enum Type:
  ...
  case NameT(name: String)
```

예를 들어 다음 ATFAE 프로그램은

```atfae,run
/* ATFAE */
enum Tree { case Leaf(Number); case Node(Tree, Number, Tree) }
Leaf(42) match { case Leaf(v) => v; case Node(l, v, r) => v }
```

다음과 같은 추상 문법 트리(abstract syntax tree, AST)로 파싱됩니다.

```scala
TypeDef("Tree", List(
    Variant("Leaf", List(NumT)),
    Variant("Node", List(NameT("Tree"), NumT, NameT("Tree")))
  ),
  Match(App(Id("Leaf"), List(Num(42))), List(
    MatchCase("Leaf", List("v"), Id("v")),
    MatchCase("Node", List("l", "v", "r"), Id("v")))))
```

생성자 적용 `Leaf(42)`가 특별한 문법이 아니라 평범한 함수 적용 `App(Id("Leaf"), ...)`로 파싱된다는 점을 기억해 두세요. 생성자는 그냥 이름이 붙은 값입니다.

## ATFAE의 인터프리터와 자연 의미

먼저 프로그램이 어떻게 실행되는지부터 정의합시다. 환경을 쓰는 인터프리터를 구현하고

```scala
def interp(expr: Expr, env: Env): Value = ???
```

다음 꼴의 자연 의미를 정의합니다.

\\[
\boxed{\sigma \vdash e \Rightarrow v}
\\]

ATFAE에는 두 종류의 새로운 값이 필요합니다. 생성자 자체를 나타내는 <a id="g-constructor-value"></a>생성자 값(constructor value)과, 생성자로 만든 <a id="g-variant-value"></a>배리언트 값(variant value)입니다. 클로저도 여러 매개변수를 받도록 바뀝니다.

\\[
\begin{array}{lrcll}
\text{Values} & \mathbb{V} \ni v & ::= & n & (\texttt{NumV}) \\\\
& & \mid & b & (\texttt{BoolV}) \\\\
& & \mid & \langle \lambda(x, \ldots, x).e, \sigma \rangle & (\texttt{CloV}) \\\\
& & \mid & \langle x \rangle & (\texttt{ConstrV}) \\\\
& & \mid & x(v^{\ast}) & (\texttt{VariantV})
\end{array}
\\]

```scala
enum Value:
  ...
  case ConstrV(name: String)
  case VariantV(name: String, values: List[Value])
```

생성자 값 \\(\langle x \rangle\\)는 배리언트 이름 \\(x\\)만 기억하고, 배리언트 값 \\(x(v_1, \ldots, v_n)\\)은 꼬리표 \\(x\\)와 그 안에 든 값들을 가집니다. 합 타입이 꼬리표 붙은 합집합이라는 정의를 그대로 옮긴 모양입니다.

### 대수적 데이터 타입

`enum` 정의를 만나면 무엇을 해야 할까요? 각 배리언트 이름 \\(x_i\\)를 생성자 값 \\(\langle x_i \rangle\\)에 묶은 환경에서 본문을 계산하면 됩니다. 배리언트에 적힌 타입들은 실행할 때는 쓸모가 없으므로 무시합니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case TypeDef(_, ws, body) =>
    interp(body, env ++ ws.map(w => w.name -> ConstrV(w.name)))
```

\\[
\begin{prooftree}
\AxiomC{$\sigma[x_1 \mapsto \langle x_1 \rangle, \ldots, x_n \mapsto \langle x_n \rangle] \vdash e \Rightarrow v$}
\LeftLabel{$\texttt{TypeDef}$}
\UnaryInfC{$\sigma \vdash \mathtt{enum}\ t\ \\{\ \mathtt{case}\ x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}); \ldots; \mathtt{case}\ x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})\ \\};\ e \Rightarrow v$}
\end{prooftree}
\\]

예를 들어 `enum Tree { case Leaf(Number); case Node(Tree, Number, Tree) }` 다음의 본문은 \\(\sigma[\texttt{Leaf} \mapsto \langle \texttt{Leaf} \rangle, \texttt{Node} \mapsto \langle \texttt{Node} \rangle]\\)에서 계산됩니다.

### 함수 적용

함수 적용 \\(e_0(e_1, \ldots, e_n)\\)에서 \\(e_0\\)의 값이 클로저이면 예전처럼 함수를 부릅니다(다만 인자 개수가 매개변수 개수와 같은지 확인합니다). 새로 생긴 경우는 \\(e_0\\)의 값이 생성자 값 \\(\langle x \rangle\\)일 때입니다. 이때는 인자들을 모두 계산한 뒤, 꼬리표 \\(x\\)를 붙인 배리언트 값 \\(x(v_1, \ldots, v_n)\\)을 만듭니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case App(f, es) => interp(f, env) match
    case CloV(ps, b, fenv) => ...
    case ConstrV(name) => VariantV(name, es.map(interp(_, env)))
    case v             => error(s"not a function: ${v.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \langle x \rangle \quad \sigma \vdash e_1 \Rightarrow v_1 \quad \ldots \quad \sigma \vdash e_n \Rightarrow v_n$}
\LeftLabel{$\texttt{App}_{\langle - \rangle}$}
\UnaryInfC{$\sigma \vdash e_0(e_1, \ldots, e_n) \Rightarrow x(v_1, \ldots, v_n)$}
\end{prooftree}
\\]

생성자는 클로저처럼 <a id="g-first-class-value"></a>일급 값(first-class value)이라는 점이 재미있습니다. 변수에 담았다가 나중에 부를 수도 있습니다.

```atfae,run
/* ATFAE */
enum Tree { case Leaf(Number); case Node(Tree, Number, Tree) }
val mk = Leaf;       // mk -> <Leaf> (constructor value)
val t = mk(42);      // t -> Leaf(42) (variant value)
t match { case Leaf(v) => v; case Node(l, v, r) => v }   // 42
```

### 패턴 매칭

패턴 매칭 \\(e\ \mathtt{match}\ \\{ \ldots \\}\\)은 먼저 \\(e\\)를 계산해 배리언트 값 \\(x(v_1, \ldots, v_m)\\)을 얻습니다. 그다음 이름이 \\(x\\)인 첫 번째 <a id="g-match-case"></a>매치 경우(match case)를 찾아, 그 경우의 매개변수들을 \\(v_1, \ldots, v_m\\)에 묶은 환경에서 본문을 계산합니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Match(expr, cases) => interp(expr, env) match
    case VariantV(wname, vs) => cases.find(_.name == wname) match
      case Some(MatchCase(_, ps, b)) =>
        if (ps.length != vs.length) error("arity mismatch")
        interp(b, env ++ (ps zip vs))
      case None => error(s"no such case: $wname")
    case v => error(s"not a variant: ${v.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c} 1 \leq i \leq n \qquad \sigma \vdash e \Rightarrow x_i(v_1, \ldots, v_{m_i}) \qquad \forall j \lt i.\ x_j \neq x_i \\\\ \sigma[x_{i,1} \mapsto v_1, \ldots, x_{i,m_i} \mapsto v_{m_i}] \vdash e_i \Rightarrow v \end{array}$}
\LeftLabel{$\texttt{Match}$}
\UnaryInfC{$\sigma \vdash e\ \mathtt{match}\ \\{\ \mathtt{case}\ x_1(x_{1,1}, \ldots, x_{1,m_1})\ \mathtt{=>}\ e_1; \ldots; \mathtt{case}\ x_n(x_{n,1}, \ldots, x_{n,m_n})\ \mathtt{=>}\ e_n\ \\} \Rightarrow v$}
\end{prooftree}
\\]

전제의 \\(\forall j \lt i.\ x_j \neq x_i\\)에 주목하세요. \\(i\\)번째 경우를 고르려면 그보다 앞선 경우들의 이름은 모두 \\(x_i\\)와 달라야 합니다. 즉 매치 경우들 사이에는 **순서**가 있고, **먼저 맞는 경우가 이깁니다**(first match wins). 코드에서 `cases.find`가 앞에서부터 찾는 것과 정확히 같습니다. 그래서 다음 함수에서 표시한 두 경우는 절대 선택되지 않습니다.

```atfae
/* ATFAE */
enum Tree { case Leaf(Number); case Node(Tree, Number, Tree) }
def f(t: Tree): Number = t match {
  case Leaf(v)       => v
  case Leaf(v)       => v + 1       // ignored
  case Node(l, v, r) => v
  case Node(l, v, r) => v + 1       // ignored
}; ...
```

### 예제

**예제 1.** 다음 프로그램의 실행을 자연 의미로 따라가 봅시다.

```atfae,run
/* ATFAE */
enum A { case B(Boolean); case C(Number) }
C(42) match { case B(b) => b; case C(n) => n < 0 }
```

\\(e\\)를 `match` 식 전체, \\(\sigma_1 = [B \mapsto \langle B \rangle, C \mapsto \langle C \rangle]\\), \\(\sigma_2 = \sigma_1[n \mapsto 42]\\)라고 합시다.

먼저 매치할 식 `C(42)`의 계산 \\(\mathcal{D}_1\\)과 두 번째 경우의 본문 `n < 0`의 계산 \\(\mathcal{D}_2\\)입니다.

\\[
\begin{prooftree}
\AxiomC{$C \in \text{Dom}(\sigma_1)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_1 \vdash C \Rightarrow \langle C \rangle$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\sigma_1 \vdash 42 \Rightarrow 42$}
\LeftLabel{$\texttt{App}_{\langle - \rangle}$}
\BinaryInfC{$\sigma_1 \vdash C(42) \Rightarrow C(42)$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$n \in \text{Dom}(\sigma_2)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_2 \vdash n \Rightarrow 42$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\sigma_2 \vdash 0 \Rightarrow 0$}
\LeftLabel{$\texttt{Lt}$}
\BinaryInfC{$\sigma_2 \vdash n \mathbin{\mathtt{\lt}} 0 \Rightarrow \mathtt{false}$}
\end{prooftree}
\\]

이 둘을 이용하면 전체 유도 트리는 다음과 같습니다.

\\[
\begin{prooftree}
\AxiomC{$\mathcal{D}_1$}
\noLine
\UnaryInfC{$\sigma_1 \vdash C(42) \Rightarrow C(42)$}
\AxiomC{$B \neq C$}
\AxiomC{$\mathcal{D}_2$}
\noLine
\UnaryInfC{$\sigma_2 \vdash n \mathbin{\mathtt{\lt}} 0 \Rightarrow \mathtt{false}$}
\LeftLabel{$\texttt{Match}$}
\TrinaryInfC{$\sigma_1 \vdash e \Rightarrow \mathtt{false}$}
\LeftLabel{$\texttt{TypeDef}$}
\UnaryInfC{$\varnothing \vdash \mathtt{enum}\ A\ \\{\ \mathtt{case}\ B(\mathtt{bool}); \mathtt{case}\ C(\mathtt{num})\ \\};\ e \Rightarrow \mathtt{false}$}
\end{prooftree}
\\]

`C(42)`는 배리언트 값 \\(C(42)\\)가 되고, 첫 번째 경우 `B`는 이름이 다르므로(\\(B \neq C\\)) 건너뛰고 두 번째 경우 `C`가 선택됩니다. \\(n\\)이 \\(42\\)에 묶인 채로 `n < 0`을 계산하니 결과는 `false`입니다.

**예제 2.** 대수적 데이터 타입으로 AE의 추상 문법을 정의하고, 재귀 함수와 패턴 매칭으로 그 인터프리터를 ATFAE 안에서 구현할 수 있습니다.

```atfae,run
/* ATFAE */
enum Expr {
  case Num(Number)
  case Add(Expr, Expr)
  case Mul(Expr, Expr)
};
def interp(e: Expr): Number = e match {
  case Num(n)    => n
  case Add(l, r) => interp(l) + interp(r)
  case Mul(l, r) => interp(l) * interp(r)
};
interp(Add(Num(1), Mul(Num(2), Num(3))))      // 1 + 2 * 3 = 7
```

Scala로 짰던 인터프리터와 거의 똑같지요? 이처럼 어떤 언어의 구현을 그 언어 자신으로 작성할 수도 있습니다(예를 들어 Scala 컴파일러는 Scala로 작성되어 있습니다). 이것을 <a id="g-bootstrapping"></a>부트스트래핑(bootstrapping)이라고 합니다.

**예제 3.** 숫자 리스트 타입과 그 원소의 합을 구하는 함수도 정의할 수 있습니다.

```atfae,run
/* ATFAE */
enum NumList {
  case Nil()
  case Cons(Number, NumList)
};
def sum(l: NumList): Number = l match {
  case Nil()      => 0
  case Cons(h, t) => h + sum(t)
};
sum(Cons(1, Cons(2, Cons(3, Nil()))))         // 1 + 2 + 3 = 6
```

`Nil()`처럼 값을 하나도 담지 않는 배리언트도 만들 수 있습니다. 다만 이 리스트는 숫자만 담을 수 있는 <a id="g-monomorphic"></a>단형(monomorphic) 리스트입니다. 불리언 리스트가 필요하면 `BoolList`를 또 만들어야 하지요. 원소 타입을 매개변수로 받는 리스트는 [매개변수 다형성](./parametric-polymorphism.md)에서 다룹니다.

**예제 4.** [재귀 함수의 타입](./typing-recursive-functions.md)에서 TFAE로는 `mkRec`을 정의할 수 없었습니다. `fY`의 타입 `T`가 `T = T => Number => Number`라는 재귀 타입이어야 했기 때문입니다. 그런데 대수적 데이터 타입은 재귀 타입이므로, 이제 ATFAE에서는 `mkRec`을 정의할 수 있습니다!

```atfae,run
/* ATFAE */
enum T { case T(T => Number => Number) }
val mkRec = (body: (Number => Number) => Number => Number) => {
  val fX = (fY: T) => {
    val f = (x: Number) => fY match { case T(fZ) => fZ(fY)(x) };
    body(f)
  };
  fX(T(fX))
};
val sum = mkRec((sum: Number => Number) => (n: Number) =>
  if (n < 1) 0
  else n + sum(n + -1));
sum(10)                                       // 55
```

Scala 버전과 비교해 보면, `fY.self`로 꺼내던 것을 패턴 매칭 `fY match { case T(fZ) => ... }`로 꺼낸다는 점만 다릅니다. 타입 이름과 배리언트 이름이 둘 다 `T`인데, 타입 이름과 변수(생성자) 이름은 서로 다른 곳에 쓰이므로 헷갈리지 않습니다.

### 실행 중 오류

`enum A { case B(Boolean); case C(Number) }` 다음 본문으로 아래 식들을 넣으면 ATFAE 인터프리터는 실행 중 오류(run-time error)를 냅니다.

```atfae
/* ATFAE */
enum A { case B(Boolean); case C(Number) }; ...
```

```pl
/* ATFAE */
42 match { case C(n) => n }                        // not a variant
B(true) match { case C(n) => n }                   // no such case
C(42) match { case B(b) => 0; case C(x, y) => x }  // arity mismatch
```

더 고약한 경우도 있습니다. 다음 식은 오류 없이 끝나지만, `C`는 숫자를 받아야 하는데 불리언을 받았습니다.

```pl
/* ATFAE */
C(true) match { case C(n) => n }        // true (not a number!)
```

인터프리터는 타입을 모두 무시하므로 이런 실수를 잡아 주지 못합니다. 이런 식들을 실행하기 **전에** 거부하는 것이 다음 절에서 만들 타입 검사기의 일입니다.

## 타입 검사기와 타입 규칙

ATFAE의 자연 의미는 타입을 모두 무시합니다. `Leaf`와 `Node`는 타입이 아니라 **배리언트 이름**이고, 리스트로 받은 값들에 배리언트 이름을 꼬리표로 붙여 배리언트 값을 만드는 **생성자**입니다. 그리고 패턴 매칭은 배리언트 값을 받아 그 값의 배리언트 이름과 같은 이름을 가진 첫 번째 매치 경우를 찾습니다. 이제 타입을 진지하게 다룰 차례입니다.

지금까지처럼 두 가지를 합니다. 첫째, 식이 언제 타입이 맞는지(well-typed)를 다음 꼴의 타입 규칙으로 정의하고

\\[
\boxed{\Gamma \vdash e : \tau}
\\]

둘째, 그 규칙을 따르는 타입 검사기를 Scala로 구현합니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = ???
```

타입 검사기는 \\(e\\)가 타입이 맞으면 그 타입을 돌려주고, 아니면 타입 오류(type error)를 던집니다. TRFAE처럼 변수의 타입은 타입 환경(type environment) \\(\Gamma\\)로 관리합니다.

### 대수적 데이터 타입을 위한 타입 환경

그런데 ATFAE에서는 변수의 타입만으로는 부족합니다. `enum`으로 정의한 새로운 타입에 어떤 배리언트가 있고 각 배리언트가 어떤 타입의 값을 담는지도 기억해야 합니다. 그래서 타입 환경을 두 부분의 쌍으로 확장합니다. 앞부분은 지금까지처럼 변수에서 타입으로 가는 함수이고, 뒷부분은 타입 이름에서 "배리언트 이름에서 타입 리스트로 가는 함수"로 가는 함수입니다.

\\[
\text{Type Environments} \quad \Gamma \in (\mathbb{X} \xrightarrow{\text{fin}} \mathbb{T}) \times (\mathbb{X}_t \xrightarrow{\text{fin}} (\mathbb{X} \xrightarrow{\text{fin}} \mathbb{T}^{\ast})) \quad (\texttt{TypeEnv})
\\]

타입 이름 \\(t\\)의 정보는 다음과 같이 합 타입 꼴로 씁니다.

\\[
\Gamma(t) = x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}) + \ldots + x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})
\\]

뒷부분이 배리언트 이름을 키로 하는 맵이므로 배리언트의 순서는 의미가 없습니다. 즉 합 타입은 교환 법칙이 성립합니다. 예를 들어 \\(B(\mathtt{bool}) + C(\mathtt{num})\\)과 \\(C(\mathtt{num}) + B(\mathtt{bool})\\)은 같습니다.

```scala
case class TypeEnv(
  vars: Map[String, Type] = Map(),
  tys: Map[String, Map[String, List[Type]]] = Map()
) {
  def addVar(pair: (String, Type)): TypeEnv = TypeEnv(vars + pair, tys)
  def addVars(pairs: Iterable[(String, Type)]): TypeEnv =
    TypeEnv(vars ++ pairs, tys)
  def addType(tname: String, ws: Map[String, List[Type]]): TypeEnv =
    TypeEnv(vars, tys + (tname -> ws))
}
```

예를 들어 이진 트리 타입을 정의했다면

```atfae
/* ATFAE */
enum Tree {
  case Leaf(Number)
  case Node(Tree, Number, Tree)
} ...
```

기존 타입 환경 \\(\Gamma\\)(코드에서는 `tenv`)에 `Tree`의 정보를 다음과 같이 더합니다.

\\[
\Gamma[\texttt{Tree} = \texttt{Leaf}(\mathtt{num}) + \texttt{Node}(\texttt{Tree}, \mathtt{num}, \texttt{Tree})]
\\]

```scala
val newTEnv = tenv.addType("Tree", Map(
  "Leaf" -> List(NumT),
  "Node" -> List(NameT("Tree"), NumT, NameT("Tree"))
))
```

### 타입의 올바른 형태

다음 ATFAE 식은 타입이 맞습니다.

```atfae
/* ATFAE */
enum Tree {
  case Leaf(Number)
  case Node(Tree, Number, Tree)
}
def f(t: Tree): Tree = t
...
```

그럼 `enum` 정의를 빼면 어떨까요?

```atfae
/* ATFAE */
def f(t: Tree): Tree = t
...
```

이 식은 문법적으로는 올바르지만, `Tree`라는 타입은 **정의된 적이 없습니다**. 그러니 거부해야 합니다. 이렇게 타입 표기에 나온 타입이 실제로 존재하는 타입인지, <a id="g-well-formed"></a>즉 <a id="g-well-formed-type"></a>잘 형성된 타입(well-formed type)인지를 타입 환경을 보고 확인해야 합니다. 이것을 타입의 <a id="g-well-formedness"></a>올바른 형태(well-formedness)라고 하고, 다음 꼴의 판단으로 나타냅니다.

\\[
\boxed{\Gamma \vdash \tau}
\\]

\\(\mathtt{num}\\)과 \\(\mathtt{bool}\\)은 언제나 잘 형성된 타입이고, 화살표 타입은 매개변수 타입들과 반환 타입이 모두 잘 형성되었을 때 잘 형성된 타입입니다. 타입 이름 \\(t\\)는 타입 환경에 그 정보가 있을 때만 잘 형성된 타입입니다.

\\[
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\Gamma \vdash \mathtt{num}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\Gamma \vdash \mathtt{bool}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma \vdash \tau_1 \quad \ldots \quad \Gamma \vdash \tau_n$}
\AxiomC{$\Gamma \vdash \tau$}
\BinaryInfC{$\Gamma \vdash (\tau_1, \ldots, \tau_n) \to \tau$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma(t) = x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}) + \ldots + x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})$}
\UnaryInfC{$\Gamma \vdash t$}
\end{prooftree}
\\]

이 규칙을 그대로 구현한 것이 `mustValid`입니다. 잘 형성된 타입이면 그 타입을 그대로 돌려주고, 아니면 오류를 던집니다.

```scala
def mustValid(ty: Type, tenv: TypeEnv): Type = ty match
  case NumT => NumT
  case BoolT => BoolT
  case ArrowT(ptys, rty) =>
    ArrowT(ptys.map(mustValid(_, tenv)), mustValid(rty, tenv))
  case NameT(tn) =>
    if (!tenv.tys.contains(tn)) error(s"invalid type name: $tn")
    NameT(tn)
```

### 함수 정의와 적용

**함수 정의.** 매개변수가 여러 개라는 점 말고 TRFAE와 달라진 것은, 매개변수 타입들이 잘 형성되었는지 확인한다는 것입니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Fun(params, body) =>
    val ptys = params.map(_.ty)
    for (pty <- ptys) mustValid(pty, tenv)
    val newTEnv = tenv.addVars(params.map(p => p.name -> p.ty))
    ArrowT(ptys, typeCheck(body, newTEnv))
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash \tau_1 \quad \ldots \quad \Gamma \vdash \tau_n$}
\AxiomC{$\Gamma[x_1 : \tau_1, \ldots, x_n : \tau_n] \vdash e : \tau$}
\LeftLabel{$\tau\texttt{-Fun}$}
\BinaryInfC{$\Gamma \vdash \lambda(x_1\mathtt{:}\tau_1, \ldots, x_n\mathtt{:}\tau_n).e : (\tau_1, \ldots, \tau_n) \to \tau$}
\end{prooftree}
\\]

원칙은 간단합니다. **사용자가 적은 타입 표기는 모두 잘 형성된 타입이어야 합니다!**

**재귀 함수 정의.** 마찬가지로 매개변수 타입들과 반환 타입이 잘 형성되었는지 확인합니다. 나머지는 TRFAE의 \\(\tau\texttt{-Rec}\\)과 같습니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Rec(name, params, rty, body, scope) =>
    val ptys = params.map(_.ty)
    for (ty <- rty :: ptys) mustValid(ty, tenv)
    val fty = ArrowT(ptys, rty)
    val bty = typeCheck(body, tenv.addVar(name -> fty)
      .addVars(params.map(p => p.name -> p.ty)))
    mustSame(bty, rty)
    typeCheck(scope, tenv.addVar(name -> fty))
```

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c} \Gamma \vdash \tau_1 \quad \ldots \quad \Gamma \vdash \tau_n \qquad \Gamma \vdash \tau \\\\ \Gamma[x_0 : (\tau_1, \ldots, \tau_n) \to \tau, x_1 : \tau_1, \ldots, x_n : \tau_n] \vdash e : \tau \\\\ \Gamma[x_0 : (\tau_1, \ldots, \tau_n) \to \tau] \vdash e^{\prime} : \tau^{\prime} \end{array}$}
\LeftLabel{$\tau\texttt{-Rec}$}
\UnaryInfC{$\Gamma \vdash \mathtt{def}\ x_0(x_1\mathtt{:}\tau_1, \ldots, x_n\mathtt{:}\tau_n)\mathtt{:}\tau\ \mathtt{=}\ e;\ e^{\prime} : \tau^{\prime}$}
\end{prooftree}
\\]

**함수 적용.** TRFAE와 비슷하지만, 이제는 <a id="g-arity"></a>인자 개수(arity)가 매개변수의 개수와 같은지도 확인합니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case App(fun, args) => typeCheck(fun, tenv) match
    case ArrowT(ptys, retTy) =>
      if (ptys.length != args.length) error("arity mismatch")
      (ptys zip args).map((p, a) => mustSame(typeCheck(a, tenv), p))
      retTy
    case ty => error(s"not a function type: ${ty.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : (\tau_1, \ldots, \tau_n) \to \tau \quad \Gamma \vdash e_1 : \tau_1 \quad \ldots \quad \Gamma \vdash e_n : \tau_n$}
\LeftLabel{$\tau\texttt{-App}$}
\UnaryInfC{$\Gamma \vdash e_0(e_1, \ldots, e_n) : \tau$}
\end{prooftree}
\\]

생성자 적용을 위한 규칙이 따로 없다는 점이 흥미롭습니다. 곧 보겠지만 생성자를 평범한 함수 타입을 가진 변수로 타입 환경에 넣기 때문에, 생성자 적용은 이 \\(\tau\texttt{-App}\\) 규칙 하나로 충분합니다.

### 대수적 데이터 타입

이제 `enum` 정의 \\(\mathtt{enum}\ t\ \\{ \ldots \\};\ e\\)의 타입 규칙을 만들어 봅시다. 빈칸에서 출발합니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case TypeDef(tn, ws, body) =>
    ???
```

**첫째**, 새 타입 이름 \\(t\\)와 그 배리언트들의 정보를 타입 환경에 더해 \\(\Gamma^{\prime}\\)을 만듭니다.

\\[
\Gamma^{\prime} = \Gamma[t = x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}) + \ldots + x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})]
\\]

```scala
    val newTEnv = tenv.addType(tn, ws.map(w => w.name -> w.ptys).toMap)
```

**둘째**, 배리언트들의 매개변수 타입 \\(\tau_{1,1}, \ldots, \tau_{n,m_n}\\)이 잘 형성되었는지 확인합니다. 이때 \\(\Gamma\\)가 아니라 \\(\Gamma^{\prime}\\)에서 확인한다는 점이 중요합니다. 그래야 `Node(Tree, Number, Tree)`처럼 매개변수 타입에 타입 이름 \\(t\\) 자신이 **재귀적으로** 나오는 경우를 허용할 수 있습니다.

```scala
    for (w <- ws; pty <- w.ptys) mustValid(pty, newTEnv)
```

**셋째**, 각 생성자 \\(x_i\\)의 타입을 넣은 타입 환경에서 본문 \\(e\\)의 타입을 구합니다. 생성자 \\(x_i\\)는 \\(\tau_{i,1}, \ldots, \tau_{i,m_i}\\) 타입의 값들을 받아 \\(t\\) 타입의 값을 만드는 함수이므로 타입은 \\((\tau_{i,1}, \ldots, \tau_{i,m_i}) \to t\\)입니다.

```scala
    val ctors = ws.map(w => w.name -> ArrowT(w.ptys, NameT(tn)))
    typeCheck(body, newTEnv.addVars(ctors))
```

예를 들어 앞의 `Tree`를 정의했다면, 본문을 검사하는 타입 환경의 두 부분은 다음과 같이 채워집니다.

<div style="text-align:center">
<svg viewBox="0 0 670 170" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="enum Tree의 본문을 검사하는 타입 환경: 변수 부분에는 생성자 Leaf와 Node의 타입이, 타입 이름 부분에는 Tree의 배리언트 정보가 들어 있다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="algebraic-data-types-3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="175" y="24" text-anchor="middle" font-weight="bold">변수의 타입(vars)</text>
<text x="500" y="24" text-anchor="middle" font-weight="bold">타입 이름의 배리언트(tys)</text>
<rect x="20" y="40" width="310" height="72" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<polyline points="20,76 330,76" fill="none" stroke="currentColor" stroke-width="1.5"/>
<polyline points="78,40 78,112" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="49" y="63" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Leaf</text>
<text x="204" y="63" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">(Number) =&gt; Tree</text>
<text x="49" y="99" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Node</text>
<text x="204" y="99" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">(Tree, Number, Tree) =&gt; Tree</text>
<rect x="350" y="40" width="300" height="72" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<polyline points="408,40 408,112" fill="none" stroke="currentColor" stroke-width="1.5"/>
<polyline points="408,76 650,76" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="379" y="81" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14" font-weight="bold">Tree</text>
<text x="529" y="63" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">Leaf ↦ [Number]</text>
<text x="529" y="99" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">Node ↦ [Tree, Number, Tree]</text>
<text x="335" y="148" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Tree = Leaf(num) + Node(Tree, num, Tree)</text>
</svg>
</div>

모두 모으면 다음과 같습니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case TypeDef(tn, ws, body) =>
    val newTEnv = tenv.addType(tn, ws.map(w => w.name -> w.ptys).toMap)
    for (w <- ws; pty <- w.ptys) mustValid(pty, newTEnv)
    val ctors = ws.map(w => w.name -> ArrowT(w.ptys, NameT(tn)))
    typeCheck(body, newTEnv.addVars(ctors))
```

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c} \Gamma^{\prime} = \Gamma[t = x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}) + \ldots + x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})] \\\\ \Gamma^{\prime} \vdash \tau_{1,1} \quad \ldots \quad \Gamma^{\prime} \vdash \tau_{n,m_n} \\\\ \Gamma^{\prime}[x_1 : (\tau_{1,1}, \ldots, \tau_{1,m_1}) \to t, \ldots, x_n : (\tau_{n,1}, \ldots, \tau_{n,m_n}) \to t] \vdash e : \tau \end{array}$}
\LeftLabel{$\tau\texttt{-TypeDef}$}
\UnaryInfC{$\Gamma \vdash \mathtt{enum}\ t\ \\{\ \mathtt{case}\ x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}); \ldots; \mathtt{case}\ x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})\ \\};\ e : \tau$}
\end{prooftree}
\\]

그럴듯해 보이지요? 하지만 미리 말해 두자면, **이 규칙은 사실 타입 안전하지 않습니다.** 어디가 문제인지는 이 장의 마지막 절에서 찾아 고치겠습니다. 어디에 구멍이 있을지 미리 생각해 보면서 읽어 보세요.

### 패턴 매칭

마지막으로 패턴 매칭 \\(e\ \mathtt{match}\ \\{ \ldots \\}\\)입니다. 역시 빈칸에서 출발합니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Match(expr, cs) => ???
```

**첫째**, 매치할 식 \\(e\\)의 타입을 구하고, 그것이 타입 이름 \\(t\\)인지 확인합니다. 숫자나 함수에는 패턴 매칭을 할 수 없으니까요.

```scala
  case Match(expr, cs) => typeCheck(expr, tenv) match
    case NameT(t) =>
      ???
    case _ => error("not a variant")
```

**둘째**, 타입 환경에서 \\(t\\)의 정보 \\(\Gamma(t)\\)를 찾고, 매치 경우들이 올바른지 확인합니다.

```scala
    case NameT(t) =>
      val tmap = tenv.tys.getOrElse(t, error(s"unknown type: $t"))
      mustValidMatch(t, cs, tmap)
      ???
```

매치 경우가 올바른지는 `mustValidMatch` 함수가 확인합니다.

```scala
def mustValidMatch(
  t: String, cs: List[MatchCase], tmap: Map[String, List[Type]],
): Unit =
  val xs = cs.map(_.name)
  val ys = tmap.keySet
  for (x <- xs if xs.count(_ == x)>1) error(s"duplicate case $x for $t")
  for (x <- xs if !ys.contains(x))    error(s"unknown case $x for $t")
  for (y <- ys if !xs.contains(y))    error(s"missing case $y for $t")
  for (MatchCase(x, ps, _) <- cs if tmap(x).size != ps.size)
    error(s"arity mismatch in case $x for $t")
```

네 줄의 검사가 각각 다음을 막습니다.

- 같은 이름의 경우가 두 번 나오는 것(duplicate case)
- \\(t\\)에 없는 배리언트 이름의 경우(unknown case)
- \\(t\\)의 배리언트 중 <a id="g-missing-case"></a>빠진 경우(missing case)
- 경우의 매개변수 개수가 배리언트가 담는 값의 개수와 다른 것(arity mismatch)

즉 매치 경우들은 \\(t\\)의 배리언트들과 **정확히** 일대일로 대응해야 하고 인자 개수도 같아야 합니다. 그래서 타입이 맞는 식에서는 매치 경우의 **순서가 상관없습니다**. 같은 이름이 두 번 나올 수 없으니 "먼저 맞는 경우가 이긴다"는 규칙이 결과를 바꿀 일이 없기 때문입니다. 앞에서 본 `// ignored` 경우가 있던 함수 `f`는 이제 duplicate case로 거부됩니다.

**셋째**, 각 경우의 본문 \\(e_i\\)의 타입을 구합니다. 이때 경우의 매개변수 \\(x_{i,1}, \ldots, x_{i,m_i}\\)는 배리언트 \\(x_i\\)가 담는 값의 타입 \\(\tau_{i,1}, \ldots, \tau_{i,m_i}\\)를 가집니다.

```scala
      val tys = for (MatchCase(x, ps, b) <- cs)
        yield typeCheck(b, tenv.addVars((ps zip tmap(x))))
```

**넷째**, 조건식의 then 식과 else 식처럼, 모든 본문 \\(e_i\\)는 **같은 타입** \\(\tau\\)를 가져야 하고, 그것이 `match` 식 전체의 타입입니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Match(expr, cs) => typeCheck(expr, tenv) match
    case NameT(t) =>
      val tmap = tenv.tys.getOrElse(t, error(s"unknown type: $t"))
      mustValidMatch(t, cs, tmap)
      val tys = for (MatchCase(x, ps, b) <- cs)
        yield typeCheck(b, tenv.addVars((ps zip tmap(x))))
      tys.reduce((lty, rty) => { mustSame(lty, rty); lty })
    case _ => error("not a variant")
```

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c} \Gamma \vdash e : t \qquad \Gamma(t) = x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}) + \ldots + x_n(\tau_{n,1}, \ldots, \tau_{n,m_n}) \\\\ \forall 1 \leq i \leq n.\ \Gamma[x_{i,1} : \tau_{i,1}, \ldots, x_{i,m_i} : \tau_{i,m_i}] \vdash e_i : \tau \end{array}$}
\LeftLabel{$\tau\texttt{-Match}$}
\UnaryInfC{$\Gamma \vdash e\ \mathtt{match}\ \\{\ \mathtt{case}\ x_1(x_{1,1}, \ldots, x_{1,m_1})\ \mathtt{=>}\ e_1; \ldots; \mathtt{case}\ x_n(x_{n,1}, \ldots, x_{n,m_n})\ \mathtt{=>}\ e_n\ \\} : \tau$}
\end{prooftree}
\\]

규칙에서 \\(\Gamma(t)\\)의 배리언트와 매치 경우가 같은 이름 \\(x_1, \ldots, x_n\\)과 같은 개수 \\(m_1, \ldots, m_n\\)을 쓴다는 점이 `mustValidMatch`의 검사를 표현합니다. 합 타입은 교환 법칙이 성립하므로, 매치 경우가 어떤 순서로 나오든 \\(\Gamma(t)\\)를 그 순서에 맞춰 쓰면 됩니다.

> **자주 하는 실수**: 경우의 매개변수에 타입을 줄 때, 경우의 **순서**대로 \\(i\\)번째 경우를 \\(\Gamma(t)\\)의 \\(i\\)번째 배리언트에 대응시키면 안 됩니다. 매치 경우는 어떤 순서로 써도 되므로, 코드의 `tmap(x)`처럼 반드시 배리언트 **이름**으로 찾아야 합니다.

### 예제

다음 프로그램의 타입을 유도해 봅시다.

```atfae,run
/* ATFAE */
enum A { case B(Boolean); case C(Number, Number) }
C(1, 2) match { case B(b) => b; case C(x, y) => x < y }
```

쓰이는 타입 환경은 다음과 같습니다.

\\[
\begin{array}{lcl}
\Gamma^{\prime} &=& \varnothing[A = B(\mathtt{bool}) + C(\mathtt{num}, \mathtt{num})] \\\\
\Gamma^{\prime\prime} &=& \Gamma^{\prime}[B : (\mathtt{bool}) \to A, C : (\mathtt{num}, \mathtt{num}) \to A] \\\\
\Gamma_1 &=& \Gamma^{\prime\prime}[b : \mathtt{bool}] \\\\
\Gamma_2 &=& \Gamma^{\prime\prime}[x : \mathtt{num}, y : \mathtt{num}]
\end{array}
\\]

먼저 작은 조각 두 개를 유도합니다. \\(\mathcal{D}_1\\)은 매치할 식 `C(1, 2)`의 타입, \\(\mathcal{D}_2\\)는 두 번째 경우의 본문 `x < y`의 타입입니다. 생성자 `C`는 \\(\Gamma^{\prime\prime}\\)에 함수 타입으로 들어 있으므로 \\(\tau\texttt{-App}\\)으로 충분합니다.

\\(\mathcal{D}_1\\)은 다음과 같습니다.

\\[
\begin{prooftree}
\AxiomC{$C \in \text{Dom}(\Gamma^{\prime\prime})$}
\UnaryInfC{$\Gamma^{\prime\prime} \vdash C : (\mathtt{num}, \mathtt{num}) \to A$}
\AxiomC{}
\UnaryInfC{$\Gamma^{\prime\prime} \vdash 1 : \mathtt{num}$}
\AxiomC{}
\UnaryInfC{$\Gamma^{\prime\prime} \vdash 2 : \mathtt{num}$}
\LeftLabel{$\tau\texttt{-App}$}
\TrinaryInfC{$\Gamma^{\prime\prime} \vdash C(1, 2) : A$}
\end{prooftree}
\\]

\\(\mathcal{D}_2\\)는 다음과 같습니다.

\\[
\begin{prooftree}
\AxiomC{$x \in \text{Dom}(\Gamma_2)$}
\UnaryInfC{$\Gamma_2 \vdash x : \mathtt{num}$}
\AxiomC{$y \in \text{Dom}(\Gamma_2)$}
\UnaryInfC{$\Gamma_2 \vdash y : \mathtt{num}$}
\LeftLabel{$\tau\texttt{-Lt}$}
\BinaryInfC{$\Gamma_2 \vdash x \mathbin{\mathtt{\lt}} y : \mathtt{bool}$}
\end{prooftree}
\\]

매치 식 전체를 \\(e_m = C(1, 2)\ \mathtt{match}\ \\{\ \mathtt{case}\ B(b)\ \mathtt{=>}\ b; \mathtt{case}\ C(x, y)\ \mathtt{=>}\ x \mathbin{\mathtt{\lt}} y\ \\}\\)라고 합시다. 두 조각을 이용하면 \\(\tau\texttt{-Match}\\)로 \\(e_m\\)의 타입을 유도할 수 있습니다. 이 유도를 \\(\mathcal{D}_3\\)이라고 합시다.

\\[
\small
\begin{prooftree}
\AxiomC{$\mathcal{D}_1$}
\noLine
\UnaryInfC{$\Gamma^{\prime\prime} \vdash C(1, 2) : A$}
\AxiomC{$\Gamma^{\prime\prime}(A) = B(\mathtt{bool}) + C(\mathtt{num}, \mathtt{num})$}
\AxiomC{$b \in \text{Dom}(\Gamma_1)$}
\UnaryInfC{$\Gamma_1 \vdash b : \mathtt{bool}$}
\AxiomC{$\mathcal{D}_2$}
\noLine
\UnaryInfC{$\Gamma_2 \vdash x \mathbin{\mathtt{\lt}} y : \mathtt{bool}$}
\LeftLabel{$\tau\texttt{-Match}$}
\QuaternaryInfC{$\Gamma^{\prime\prime} \vdash e_m : \mathtt{bool}$}
\end{prooftree}
\\]

마지막으로 \\(\tau\texttt{-TypeDef}\\)로 전체 프로그램의 타입을 유도합니다. 배리언트들의 매개변수 타입 \\(\mathtt{bool}\\)과 \\(\mathtt{num}\\)은 \\(\Gamma^{\prime}\\)에서 잘 형성된 타입입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma^{\prime} \vdash \mathtt{bool}$}
\AxiomC{$\Gamma^{\prime} \vdash \mathtt{num}$}
\AxiomC{$\mathcal{D}_3$}
\noLine
\UnaryInfC{$\Gamma^{\prime\prime} \vdash e_m : \mathtt{bool}$}
\LeftLabel{$\tau\texttt{-TypeDef}$}
\TrinaryInfC{$\varnothing \vdash \mathtt{enum}\ A\ \\{\ \mathtt{case}\ B(\mathtt{bool}); \mathtt{case}\ C(\mathtt{num}, \mathtt{num})\ \\};\ e_m : \mathtt{bool}$}
\end{prooftree}
\\]

두 경우의 본문이 모두 \\(\mathtt{bool}\\)이므로 전체 프로그램의 타입은 `Boolean`입니다.

### 다시 보기: 실행 중 오류

앞에서 인터프리터가 실행 중 오류를 내거나 엉뚱한 값을 내던 식들을 다시 봅시다.

```atfae
/* ATFAE */
enum A { case B(Boolean); case C(Number) }; ...
42 match { case C(n) => n }                        // (1)
B(true) match { case C(n) => n }                   // (2)
C(42) match { case B(b) => 0; case C(x, y) => x }  // (3)
C(true) match { case C(n) => n }                   // (4)
```

이제 타입 검사기는 이들을 모두 실행하기 **전에** 거부합니다.

| | 인터프리터 | | 타입 검사기 |
|---|---|---|---|
| (1) | not a variant | \\(\Rightarrow\\) | 타입 이름이 아님 |
| (2) | no such case | \\(\Rightarrow\\) | missing case `B` |
| (3) | arity mismatch | \\(\Rightarrow\\) | arity mismatch |
| (4) | `true` (숫자가 아님!) | \\(\Rightarrow\\) | \\(\mathtt{bool} \neq \mathtt{num}\\) |

(2)에서 타입 검사기는 `B(true)`라는 값을 보고 판단하는 것이 아닙니다. 매치할 식의 타입이 `A`라는 것만 알고, `A`의 배리언트 `B`에 대한 경우가 빠졌다는 이유로 거부합니다. 값이 `B(...)`인지 `C(...)`인지는 일반적으로 실행해 보기 전에는 모르므로, 모든 배리언트에 대한 경우가 있어야 안전하기 때문입니다. 그래서 `C(42) match { case C(n) => n }`처럼 실제로는 아무 문제 없이 실행되는 식도 같은 이유로 거부됩니다.

## ATFAE의 타입 안전성

### 다시 보기: 타입 안전성

> **정의(타입 안전성)**: 타입이 맞는 프로그램이 실행 중에 **절대** 타입 오류를 일으키지 않음을 보장하면, 그 타입 시스템은 안전하다(sound)고 합니다.

앞에서 \\(\tau\texttt{-TypeDef}\\) 규칙이 타입 안전하지 않다고 했습니다. 그 증거를 보겠습니다.

```atfae,run
/* ATFAE */
enum A { case X(Number) }                    // X: Number => A
val f = (a: A) => a match { case X(n) => n } // f: A => Number
enum A { case X(Boolean) }                   // X: Boolean => A
f(X(true)) + 1                               // Number
```

지금까지의 규칙으로 이 식의 타입을 구하면 `Number`가 나옵니다. 하지만 실행하면 `f(X(true))`의 값이 `true`가 되어 `true + 1`을 계산하다가 타입 오류가 납니다. 타입이 맞는데 실행 중 타입 오류가 나니, 안전하지 않은 타입 시스템입니다.

무엇이 문제였을까요? **같은 타입 이름** `A`가 두 번 정의되면서 앞의 `A`를 가리고(shadowing), 배리언트 `X`가 담는 값의 타입이 **다르게** 바뀌었기 때문입니다. `f`는 첫 번째 `A`를 받는 함수로 타입을 얻었는데, 마지막 줄에서는 두 번째 `A`의 값을 받습니다. 그런데 둘 다 똑같이 `NameT("A")`라서 타입 검사기는 둘을 구별하지 못합니다.

해결책은 간단합니다. **이미 정의된 타입 이름은 그 범위 안에서 다시 정의하지 못하게 합시다!**

### 수정(1): 같은 타입 이름 다시 정의 금지

타입 환경에 이미 \\(t\\)가 있으면 오류를 냅니다. 규칙에는 \\(t \notin \text{Dom}(\Gamma)\\)라는 전제가 추가됩니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case TypeDef(tn, ws, body) =>
    if (tenv.tys.contains(tn)) error(s"already defined type: $tn")
    val newTEnv = tenv.addType(tn, ws.map(w => w.name -> w.ptys).toMap)
    for (w <- ws; pty <- w.ptys) mustValid(pty, newTEnv)
    val ctors = ws.map(w => w.name -> ArrowT(w.ptys, NameT(tn)))
    typeCheck(body, newTEnv.addVars(ctors))
```

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c} \Gamma^{\prime} = \Gamma[t = x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}) + \ldots + x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})] \\\\ t \notin \text{Dom}(\Gamma) \qquad \Gamma^{\prime} \vdash \tau_{1,1} \quad \ldots \quad \Gamma^{\prime} \vdash \tau_{n,m_n} \\\\ \Gamma^{\prime}[x_1 : (\tau_{1,1}, \ldots, \tau_{1,m_1}) \to t, \ldots, x_n : (\tau_{n,1}, \ldots, \tau_{n,m_n}) \to t] \vdash e : \tau \end{array}$}
\LeftLabel{$\tau\texttt{-TypeDef}$}
\UnaryInfC{$\Gamma \vdash \mathtt{enum}\ t\ \\{\ \mathtt{case}\ x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}); \ldots; \mathtt{case}\ x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})\ \\};\ e : \tau$}
\end{prooftree}
\\]

이제 앞의 예는 두 번째 `enum A`에서 거부됩니다. 이것으로 충분할까요? 아쉽게도 아닙니다. 다음 식을 보세요.

```atfae,run
/* ATFAE */
val f = {
  enum A { case X(Number) }                       // X: Number => A
  (a: A) => a match { case X(n) => n }
}                                                 // f: A => Number
enum A { case X(Boolean) }                        // X: Boolean => A
f(X(true)) + 1                                    // Number
```

첫 번째 `A`는 중괄호 안에서만 정의되어 있으므로, 두 번째 `A`를 정의하는 시점의 타입 환경에는 `A`가 없습니다. 두 번째 `A`가 첫 번째를 가리는 것이 아니므로 수정(1)의 검사를 통과합니다. 그런데 실행하면 또다시 `true + 1`에서 타입 오류가 납니다.

이번에는 무엇이 문제일까요? 첫 번째 `A` 타입이 **자기 범위 밖으로 새어 나갔기** 때문입니다. 중괄호 블록의 타입이 `A => Number`가 되어 `f`의 타입으로 밖에 드러났고, 그 `A`가 두 번째 `A`의 범위 안에서도 여전히 보입니다.

두 `A`의 범위를 코드 위에 표시하면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 640 200" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="블록 안에서 정의한 첫 번째 A가 f의 타입 A =&gt; Number를 통해 범위 밖으로 새어 나가, 두 번째 A의 범위에서 섞인다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="algebraic-data-types-4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="30.0" y="30" text-anchor="start" font-family="ui-monospace, Menlo, monospace" font-size="14">val f = {</text>
<text x="46.9" y="58" text-anchor="start" font-family="ui-monospace, Menlo, monospace" font-size="14">enum A { case X(Number) }</text>
<text x="46.9" y="86" text-anchor="start" font-family="ui-monospace, Menlo, monospace" font-size="14">(a: A) =&gt; a match { case X(n) =&gt; n }</text>
<text x="30.0" y="114" text-anchor="start" font-family="ui-monospace, Menlo, monospace" font-size="14">}</text>
<text x="30.0" y="152" text-anchor="start" font-family="ui-monospace, Menlo, monospace" font-size="14">enum A { case X(Boolean) }</text>
<text x="30.0" y="180" text-anchor="start" font-family="ui-monospace, Menlo, monospace" font-size="14">f(X(true)) + 1</text>
<rect x="40.86" y="40" width="323.90999999999997" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<rect x="24" y="134" width="231.18" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<text x="376.77" y="64" text-anchor="start" font-size="14">첫 번째 A의 범위</text>
<text x="267.18" y="158" text-anchor="start" font-size="14">두 번째 A의 범위</text>
<text x="50" y="114" text-anchor="start" font-size="13">← 블록의 타입 A =&gt; Number가 f의 타입으로 밖에 드러남</text>
<path d="M54,119 C22,124 12,166 26,175" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#algebraic-data-types-4)"/>
</svg>
</div>

그러니 이번에는 **대수적 데이터 타입이 자기 범위 밖으로 새어 나가지 못하게 합시다!**

### 수정(2): 범위 밖으로 새어 나가는 것 금지

`enum` 정의 전체의 타입은 본문의 타입 \\(\tau\\)입니다. 이 \\(\tau\\)가 범위 밖으로 나가도 괜찮으려면, \\(t\\)를 더하기 **전의** 타입 환경 \\(\Gamma\\)에서 잘 형성된 타입이어야 합니다. 즉 \\(\Gamma \vdash \tau\\)를 확인합니다. 위 예에서 블록 본문의 타입 `A => Number`는 바깥 환경에 `A`가 없으므로 잘 형성된 타입이 아니고, 따라서 거부됩니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case TypeDef(tn, ws, body) =>
    if (tenv.tys.contains(tn)) error(s"already defined type: $tn")
    val newTEnv = tenv.addType(tn, ws.map(w => w.name -> w.ptys).toMap)
    for (w <- ws; pty <- w.ptys) mustValid(pty, newTEnv)
    val ctors = ws.map(w => w.name -> ArrowT(w.ptys, NameT(tn)))
    mustValid(typeCheck(body, newTEnv.addVars(ctors)), tenv)
```

`mustValid`가 잘 형성된 타입을 그대로 돌려주도록 만들어 둔 덕분에, 본문의 타입을 확인하고 돌려주는 일을 한 줄로 쓸 수 있습니다. 최종 규칙은 다음과 같습니다.

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c} \Gamma^{\prime} = \Gamma[t = x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}) + \ldots + x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})] \\\\ t \notin \text{Dom}(\Gamma) \qquad \Gamma^{\prime} \vdash \tau_{1,1} \quad \ldots \quad \Gamma^{\prime} \vdash \tau_{n,m_n} \\\\ \Gamma^{\prime}[x_1 : (\tau_{1,1}, \ldots, \tau_{1,m_1}) \to t, \ldots, x_n : (\tau_{n,1}, \ldots, \tau_{n,m_n}) \to t] \vdash e : \tau \\\\ \Gamma \vdash \tau \end{array}$}
\LeftLabel{$\tau\texttt{-TypeDef}$}
\UnaryInfC{$\Gamma \vdash \mathtt{enum}\ t\ \\{\ \mathtt{case}\ x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}); \ldots; \mathtt{case}\ x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})\ \\};\ e : \tau$}
\end{prooftree}
\\]

> **생각해 보기**: 수정(2)만 있으면 수정(1)은 필요 없을까요? 첫 번째 예에서 두 번째 `enum A`의 본문 `f(X(true)) + 1`의 타입은 `Number`라서 수정(2)의 검사는 통과합니다. 문제는 본문 **안에서** 두 `A`가 섞인다는 것이므로, 두 수정이 모두 필요합니다.

## 정리

- 타입은 값들의 집합이고, 기존 타입을 조합해 새 타입을 만들 수 있습니다.
  - 곱 타입 \\((\tau_1, \ldots, \tau_n)\\)은 데카르트 곱입니다.
  - 합집합 타입 \\(\tau_1 \mid \ldots \mid \tau_n\\)은 합집합이지만, 값이 어느 쪽에서 왔는지 구별할 수 없습니다.
  - 합 타입 \\(x_1(\tau_1) + \ldots + x_n(\tau_n)\\)은 꼬리표 붙은 합집합이고, 생성자 \\(x_i\\)가 꼬리표 역할을 합니다.
  - 대수적 데이터 타입은 곱 타입들의 재귀적인 합 타입이며, 패턴 매칭으로 배리언트를 구별하고 안의 데이터를 꺼냅니다.
- ATFAE는 TRFAE에 여러 매개변수를 받는 함수, `enum`, `match`, 타입 이름을 더한 언어입니다. 한 `enum` 안의 배리언트 이름은 모두 달라야 합니다.
- 인터프리터에서 `enum`은 배리언트 이름을 생성자 값 \\(\langle x \rangle\\)에 묶고, 생성자를 적용하면 배리언트 값 \\(x(v_1, \ldots, v_n)\\)이 됩니다. 패턴 매칭은 먼저 맞는 경우가 이깁니다.
- 타입 환경은 변수의 타입과 함께 타입 이름별 배리언트 정보 \\(\Gamma(t)\\)를 기억합니다.
- 사용자가 적은 타입 표기는 모두 잘 형성된 타입(\\(\Gamma \vdash \tau\\))이어야 합니다.
- \\(\tau\texttt{-TypeDef}\\)는 생성자 \\(x_i\\)에 함수 타입 \\((\tau_{i,1}, \ldots, \tau_{i,m_i}) \to t\\)를 줍니다. 재귀적인 정의를 허용하려고 배리언트 타입은 \\(\Gamma^{\prime}\\)에서 검사합니다.
- \\(\tau\texttt{-Match}\\)는 매치 경우가 배리언트와 정확히 일대일로 대응하고 인자 개수가 같으며, 모든 본문의 타입이 같기를 요구합니다.
- 타입 안전성을 지키려면 같은 타입 이름을 다시 정의하지 못하게 하고(\\(t \notin \text{Dom}(\Gamma)\\)), 타입 이름이 범위 밖으로 새어 나가지 못하게 해야 합니다(\\(\Gamma \vdash \tau\\)).

## 연습 문제

1. Scala의 `Option[Int]`를 합 타입으로 생각하면 어떤 배리언트들로 이루어질까요? 같은 타입을 ATFAE의 `enum`으로 정의하고, `Option`에 든 숫자가 있으면 그 숫자를, 없으면 `0`을 돌려주는 함수를 작성하세요.
2. 예제 3의 `NumList`에 대해 리스트의 길이를 구하는 함수 `length`와, 두 리스트를 이어 붙이는 함수 `append`를 ATFAE로 작성하세요.
3. 다음 식들의 타입을 구하거나, 타입 오류라면 어떤 검사에서 실패하는지 설명하세요.
   - `enum A { case B(); case C(A) }; C(C(B()))`
   - `enum A { case B(Number) }; B(1) match { case B(x) => x; case B(y) => y }`
   - `enum A { case B(Number) }; (x: A) => x match { case B(n, m) => n }`
   - `enum A { case B(C) }; 1`
4. 예제 4의 `mkRec` 프로그램 전체의 타입이 `Number`임을 확인해 보세요. 특히 `fY match { case T(fZ) => fZ(fY)(x) }`에서 `fZ`의 타입은 무엇인가요?
5. \\(\tau\texttt{-TypeDef}\\)에서 배리언트 타입의 올바른 형태를 \\(\Gamma^{\prime}\\) 대신 \\(\Gamma\\)에서 검사한다면 어떤 프로그램이 거부될까요?
6. 수정(2)의 \\(\Gamma \vdash \tau\\) 검사가 없을 때 타입 안전성이 깨지는 예를 이 장에 나온 것과 다르게 하나 더 만들어 보세요.
7. 과제 [`atfae`](https://github.com/ku-plrg-classroom/docs/tree/main/cose212/atfae)의 `typeCheck`와 `interp` 함수를 구현해 보세요. 제출할 필요는 없지만, 시험 문제와 관련 있을 수 있으니 꼭 직접 풀어 보기를 권합니다.
