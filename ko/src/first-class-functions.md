# 일급 함수

[1차 함수](./first-order-functions.md) 장의 F1VAE에서 함수는 프로그램 맨 앞에 이름을 붙여 정의해 두고 그 이름으로 호출만 할 수 있었습니다. 함수를 변수에 담거나, 다른 함수에 넘기거나, 함수가 함수를 만들어 돌려주는 일은 할 수 없었지요. 하지만 Scala에서 `List(1, 2, 3).map(x => x * 2)`처럼 함수를 인자로 넘기는 코드는 너무나 흔합니다.

이 장에서는 함수를 숫자와 똑같은 **값**으로 다루는 **일급 함수(first-class function)** 를 배웁니다. 먼저 "일급"이 무슨 뜻인지 살펴보고, VAE에 일급 함수를 더한 언어 FVAE를 정의합니다. 함수가 값이 되려면 함수의 코드뿐 아니라 함수가 정의될 때의 환경도 함께 기억해야 한다는 사실을 발견하게 되는데, 이것이 바로 **클로저(closure)** 입니다. 클로저는 이 책의 나머지 부분 내내 등장하는 핵심 개념입니다.

이 장에서 만들 `FVAE` 인터프리터를 먼저 돌려 봅시다. 프로그램을 고쳐 가며 실행해 보세요.

<div class="playground" data-lang="FVAE"></div>

## 일급 함수

### 일급 시민

프로그래밍 언어에서 어떤 대상이 **값**으로 취급되면 그 대상을 **일급 시민(first-class citizen)** 이라고 부릅니다. 값으로 취급된다는 것은 다음 세 가지가 모두 가능하다는 뜻입니다.

1. **변수**에 **대입**할 수 있다.
2. 함수의 **인자**로 **넘길** 수 있다.
3. 함수의 결과로 **돌려줄** 수 있다.

예를 들어 Scala에서 정수는 당연히 일급 시민입니다.

```scala
// 1. We can assign an integer to a variable.
val n: Int = 3

// 2. We can pass an integer as an argument to a function.
def square(n: Int): Int = n * n
square(3)     // 3 * 3 = 9

// 3. We can return an integer from a function.
def five(): Int = 5
five()        // 5
```

### 일급 함수

Scala에서는 **함수**도 일급 시민입니다. 이런 함수를 **일급 함수**라고 합니다. 세 가지 조건을 하나씩 확인해 봅시다.

```scala
def inc(n: Int): Int = n + 1

// 1. We can assign a function to a variable.
val f: Int => Int = inc
val g: Int => Int = x => x + 1          // anonymous (lambda) function

// 2. We can pass a function as an argument to a function.
def twice(f: Int => Int, n: Int): Int = f(f(n))
twice(inc, 3)                           // inc(inc(3)) = 3 + 1 + 1 = 5
List(1, 2, 3).map(inc)                  // List(2, 3, 4)

// 3. We can return a function from a function.
def addN(n: Int): Int => Int = m => n + m
addN(3)(5)                              // 3 + 5 = 8
val add3: Int => Int = addN(3)
add3(5)                                 // 3 + 5 = 8
```

`x => x + 1`은 이름 없이 만든 함수로, <a id="g-anonymous-function"></a>**익명 함수(anonymous function)** 또는 <a id="g-lambda-function"></a>**람다 함수(lambda function)** 라고 부릅니다. `addN`은 정수 `n`을 받아 "`m`을 받아 `n + m`을 돌려주는 함수"를 돌려줍니다. 그래서 `addN(3)`은 그 자체로 함수이고, 여기에 다시 `5`를 넘기면 `8`이 됩니다. Scala에서는 같은 함수를 매개변수 목록을 여러 개 써서 다음과 같이 정의할 수도 있는데, 이렇게 인자를 하나씩 차례로 받는 함수를 만드는 것을 <a id="g-currying"></a>**커링(currying)** 이라고 합니다.

```scala
def addN(n: Int)(m: Int): Int = n + m   // or, currying
addN(3)(5)                              // 3 + 5 = 8
```

**함수형 프로그래밍(functional programming)** 패러다임을 지원하는 언어들은 함수를 일급 시민으로 다룹니다. 다음은 여러 언어에서 익명 함수를 `map`에 넘기는 예입니다.

```scala
// Scala
List(1, 2, 3).map(x => x * 2)                 // List(2, 4, 6)
```

```python
# Python
list(map(lambda x: x * 2, [1, 2, 3]))         # [2, 4, 6]
```

```rust
// Rust
[1, 2, 3].iter().map(|x| x * 2).collect::<Vec<_>>()  // [2, 4, 6]
```

```haskell
-- Haskell
map (\x -> x * 2) [1, 2, 3]                   -- [2, 4, 6]
```

## FVAE: 일급 함수가 있는 VAE

이제 VAE를 확장해, F1VAE의 1차 함수 대신 **일급 함수**가 있는 언어 **FVAE**를 만들겠습니다. FVAE 프로그램은 다음과 같이 생겼습니다.

```fvae,run
/* FVAE */
val addN = n => m => n + m;
val add3 = addN(3);
add3(5) // 3 + 5 = 8
```

```fvae,run
/* FVAE */
val inc = x => x + 1;
val twice = f => n => f(f(n));
twice(inc)(5) // 5 + 1 + 1 = 7
```

FVAE에는 `def`로 시작하는 함수 정의가 따로 없습니다. 함수는 그냥 **식**으로 만들어지고, 다른 값처럼 `val`로 이름을 붙입니다. 이를 위해 VAE의 식에 두 가지를 추가합니다.

1. **익명 함수**(람다 함수)
2. **함수 적용**

### 구체 문법

FVAE의 구체 문법(concrete syntax)은 VAE의 식에 다음 두 경우를 더한 것입니다.

```bnf
// expressions
<expr> ::= ...
         | <id> "=>" <expr>          // anonymous function
         | <expr> "(" <expr> ")"     // function application
```

F1VAE에서는 함수 적용이 `<id> "(" <expr> ")"`였는데, 여기서는 함수 자리에 아무 **식**이나 올 수 있습니다. 왜 F1VAE처럼 하면 안 될까요?

```text
         | <id> "(" <expr> ")"            // function application
```

이 문법으로는 **커링된 함수의 적용**을 쓸 수 없기 때문입니다.

```text
addN(3)(5)
```

`addN(3)(5)`에서 두 번째 적용의 함수 자리에 있는 것은 식별자가 아니라 `addN(3)`이라는 **식**입니다. 함수가 값이 되면 "함수를 계산해 내는 식"이 얼마든지 생길 수 있으므로, 함수 자리에도 임의의 식을 허용해야 합니다.

### 추상 문법

FVAE의 추상 문법(abstract syntax)과 Scala ADT는 다음과 같습니다.

\\[
\begin{array}{lrcll}
\text{Expressions} & e & ::= & \ldots \\\\
& & \mid & \texttt{val}\ x\ \texttt{=}\ e\texttt{;}\ e & (\texttt{Val}) \\\\
& & \mid & x & (\texttt{Id}) \\\\
& & \mid & \lambda x.e & (\texttt{Fun}) \\\\
& & \mid & e(e) & (\texttt{App})
\end{array}
\\]

```scala
enum Expr:
  ...
  case Val(name: String, init: Expr, body: Expr)
  case Id(name: String)
  // anonymous (lambda) functions
  case Fun(param: String, body: Expr)
  // function applications
  case App(fun: Expr, arg: Expr)
```

추상 문법에서는 익명 함수 `x => e`를 람다 계산의 전통을 따라 \\( \lambda x.e \\)로 씁니다. 매개변수가 \\( x \\)이고 몸통이 \\( e \\)인 함수라는 뜻입니다. F1VAE의 `App(fname: String, arg: Expr)`과 달리 FVAE의 `App`은 함수 자리에 `fun: Expr`을 가집니다.

예를 들어 다음 FVAE 프로그램을 **파싱**하면

```fvae,run
/* FVAE */
val addN = n => m => n + m;
val add3 = addN(3);
add3(5)
```

다음 추상 문법 트리(AST)가 만들어집니다.

```scala
Val("addN",
  Fun("n", Fun("m", Add(Id("n"), Id("m")))),
  Val("add3",
    App(Id("addN"), Num(3)),
    App(Id("add3"), Num(5))
  )
)
```

`n => m => n + m`이 `Fun("n", Fun("m", ...))`, 즉 함수를 돌려주는 함수로 파싱되는 것을 보세요.

## FVAE의 인터프리터와 자연 의미

### 클로저: 값으로서의 함수

위 프로그램을 계산해 봅시다.

```fvae,run
/* FVAE */
val addN = n => m => n + m;
val add3 = addN(3);
add3(5) // 3 + 5 = 8
```

함수 적용 `addN(3)`과 `add3(5)`는 어떻게 계산해야 할까요? 환경에 무엇이 들어 있어야 하는지부터 생각해 봅시다.

\\[
\begin{array}{lllll}
[\texttt{addN} \mapsto {\color{red}v_0}] & \vdash & \texttt{addN}(3) & \Rightarrow & {\color{red}v_1} \\\\
[\texttt{addN} \mapsto {\color{red}v_0}, \texttt{add3} \mapsto {\color{red}v_1}] & \vdash & \texttt{add3}(5) & \Rightarrow & {\color{red}v_2}
\end{array}
\\]

환경에 들어 있는 `addN`과 `add3`의 값 \\( v_0, v_1 \\)은 무엇일까요? 바로 **함수**입니다! VAE와 F1VAE에서는 값이 숫자뿐이었지만, 이제 함수도 값이 되어야 합니다. 그렇다면 **값**을 **숫자** 또는 **함수**로 정의해 봅시다.

\\[
\begin{array}{lrcrl}
\text{Values} & \mathbb{V} & \ni & v & ::= n \mid \lambda x.e
\end{array}
\\]

그런데 이것은 우리가 원하는 정의가 **아닙니다**. 왜일까요? 이 정의대로 계산을 진행해 봅시다.

\\[
\begin{array}{lllll}
[\texttt{addN} \mapsto v_0] & \vdash & \texttt{addN}(3) & \Rightarrow & \lambda \texttt{m}.(\texttt{n} + \texttt{m}) \\\\
[\texttt{addN} \mapsto v_0, \texttt{add3} \mapsto v_1] & \vdash & \texttt{add3}(5) & \Rightarrow & {\color{red}v_2}
\end{array}
\\]

\\[
\text{where} \quad
v_0 = \lambda \texttt{n}.\lambda \texttt{m}.(\texttt{n} + \texttt{m})
\quad\text{and}\quad
v_1 = \lambda \texttt{m}.(\texttt{n} + \texttt{m})
\\]

`addN(3)`의 결과는 `n`에 `3`을 넘긴 뒤의 몸통, 즉 함수 \\( \lambda \texttt{m}.(\texttt{n} + \texttt{m}) \\)입니다. 이제 `add3(5)`를 계산하면 몸통 `n + m`에서 `m`이 `5`라는 것은 압니다. 그런데 **`n`은 무엇일까요?** 함수 \\( \lambda \texttt{m}.(\texttt{n} + \texttt{m}) \\)만 봐서는 `n`이 `3`이었다는 정보가 어디에도 없습니다. `addN(3)`을 계산하는 동안 `n`이 `3`이었던 환경은 함수를 돌려주는 순간 사라져 버렸습니다.

해결책은 함수를 값으로 만들 때 **그 함수가 만들어진 환경도 함께** 담아 두는 것입니다. 함수와 그 환경의 쌍을 **클로저(closure)** 라고 합니다.

\\[
\begin{array}{lrcrl}
\text{Values} & \mathbb{V} & \ni & v & ::= n \mid \langle \lambda x.e, {\color{green}\sigma} \rangle
\end{array}
\\]

이 정의로 다시 계산해 보면 이번에는 잘 됩니다.

\\[
\begin{array}{lllll}
[\texttt{addN} \mapsto v_0] & \vdash & \texttt{addN}(3) & \Rightarrow & \langle \lambda \texttt{m}.(\texttt{n} + \texttt{m}), {\color{green}[\texttt{n} \mapsto 3]} \rangle \\\\
[\texttt{addN} \mapsto v_0, \texttt{add3} \mapsto v_1] & \vdash & \texttt{add3}(5) & \Rightarrow & 8
\end{array}
\\]

\\[
\text{where} \quad
v_0 = \langle \lambda \texttt{n}.\lambda \texttt{m}.(\texttt{n} + \texttt{m}), {\color{green}\varnothing} \rangle
\quad\text{and}\quad
v_1 = \langle \lambda \texttt{m}.(\texttt{n} + \texttt{m}), {\color{green}[\texttt{n} \mapsto 3]} \rangle
\\]

`add3`의 값 \\( v_1 \\)은 `n`이 `3`이라는 환경을 품고 있으므로, `add3(5)`의 몸통 `n + m`을 계산할 때 `n`을 거기서 찾으면 됩니다. "클로저(closure)"라는 이름은 함수 몸통의 자유 식별자들을 환경으로 "닫아 준다(close)"는 데서 왔습니다.

환경과 클로저의 관계를 그림으로 그리면 다음과 같습니다. 화살표는 "이 이름의 값이 저 클로저다"와 "이 클로저가 저 환경을 기억한다"를 나타냅니다.

<div style="text-align:center">
<svg viewBox="-8 -8 412 126" width="100%" style="max-width: 560px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="환경의 addN과 add3는 각각 클로저를 가리키고, add3의 클로저는 n ↦ 3인 환경을 기억한다" font-family="sans-serif" fill="currentColor">
<defs><marker id="first-class-functions-fig-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<rect rx="3" x="0.0" y="40.0" width="82.1" height="52.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="52.1" y1="40.0" x2="52.1" y2="92.0" stroke="currentColor" stroke-width="1.2"/>
<text x="26.1" y="58.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">addN</text>
<circle cx="67.1" cy="53.0" r="4"/>
<line x1="0.0" y1="66.0" x2="82.1" y2="66.0" stroke="currentColor" stroke-width="1.2"/>
<text x="26.1" y="84.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">add3</text>
<circle cx="67.1" cy="79.0" r="4"/>
<rect rx="3" x="140.0" y="0.0" width="163.4" height="30.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="275.4" y1="0.0" x2="275.4" y2="30.0" stroke="currentColor" stroke-width="1.2"/>
<text x="207.7" y="20.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">λn.λm.(n + m)</text>
<circle cx="289.4" cy="15.0" r="4"/>
<rect rx="3" x="140.0" y="80.0" width="136.3" height="30.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="248.3" y1="80.0" x2="248.3" y2="110.0" stroke="currentColor" stroke-width="1.2"/>
<text x="194.2" y="100.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">λm.(n + m)</text>
<circle cx="262.3" cy="95.0" r="4"/>
<path d="M67.1,53.0 C107.1,53.0 100,15 130,15" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#first-class-functions-fig-1)"/>
<path d="M67.1,79.0 C107.1,79.0 100,95 130,95" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#first-class-functions-fig-1)"/>
<line x1="289.4" y1="15.0" x2="359.4" y2="15.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#first-class-functions-fig-1)"/>
<text x="373.4" y="22.0" font-size="20">∅</text>
<line x1="262.3" y1="95.0" x2="332.3" y2="95.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#first-class-functions-fig-1)"/>
<rect rx="3" x="338.3" y="82.0" width="58.0" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="366.3" y1="82.0" x2="366.3" y2="108.0" stroke="currentColor" stroke-width="1.2"/>
<text x="352.3" y="100.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">n</text>
<text x="381.3" y="100.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="0.0" y="30.0" font-size="13" opacity="0.75">환경</text>
</svg>
</div>

VAE와 F1VAE에서 **값**은 **숫자**였습니다.

```scala
type Value = BigInt
```

FVAE에서 **값**은 (1) **숫자** \\( n \\)이거나(2) **클로저** \\( \langle \lambda x.e, \sigma \rangle \\)입니다.

```scala
enum Value:
  case NumV(n: BigInt)
  case CloV(param: String, body: Expr, env: Env)
type Env = Map[String, Value]
```

\\[
\begin{array}{lrcrll}
\text{Values} & \mathbb{V} & \ni & v & ::= & n & (\texttt{NumV}) \\\\
& & & & \mid & \langle \lambda x.e, \sigma \rangle & (\texttt{CloV})
\end{array}
\\]

`Value`와 `Env`가 서로를 참조하고 있다는 점에 주목하세요. 환경은 값을 담고, 값(클로저)은 다시 환경을 담습니다. 인터프리터는 식 \\( e \\)와 환경 \\( \sigma \\)를 받아 **값** \\( v \\)(숫자 또는 클로저)를 돌려줍니다.

```scala
def interp(expr: Expr, env: Env): Value = ???
```

\\[
\boxed{\sigma \vdash e \Rightarrow v}
\\]

### 의미 정의의 틀

FVAE를 위해 해야 할 일도 두 가지입니다. (1) 위에서 모양만 적어 둔 인터프리터 `interp`를 구현하고, (2) 환경을 이용하는 자연 의미(natural semantics)을 정의합니다.

\\[
\boxed{\sigma \vdash e \Rightarrow v}
\\]

\\[
\begin{array}{lrcrll}
\text{Expressions} & & & e & ::= & \ldots \\\\
& & & & \mid & \lambda x.e & (\texttt{Fun}) \\\\
& & & & \mid & e(e) & (\texttt{App}) \\\\
\text{Values} & \mathbb{V} & \ni & v & ::= & n & (\texttt{NumV}) \\\\
& & & & \mid & \langle \lambda x.e, \sigma \rangle & (\texttt{CloV})
\end{array}
\\]

\\[
\begin{array}{lrcll}
\text{Environments} & \sigma & \in & \mathbb{X} \xrightarrow{\text{fin}} \mathbb{V} & (\texttt{Env}) \\\\
\text{Numbers} & n & \in & \mathbb{Z} & (\texttt{BigInt}) \\\\
\text{Identifiers} & x & \in & \mathbb{X} & (\texttt{String})
\end{array}
\\]

환경이 이제 식별자를 정수가 아니라 **값** \\( \mathbb{V} \\)로 대응시킨다는 점이 VAE와 다릅니다. 숫자, 변수 정의, 변수 참조의 규칙은 VAE와 같은 모양이고 결과가 \\( n \\) 대신 \\( v \\)가 될 뿐입니다. 인터프리터에서는 숫자 `n`을 `NumV(n)`으로 감싸 돌려줍니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  case Num(n)       => NumV(n)
  case Val(x, e, b) => interp(b, env + (x -> interp(e, env)))
  case Id(x)        => env.getOrElse(x, error(s"free identifier: $x"))
  ...
```

### 덧셈과 곱셈

덧셈과 곱셈은 VAE의 규칙을 그대로 가져와 \\( n \\)을 \\( v \\)로 바꾸면 될까요?

```scala
  case Add(l, r) => interp(l, env) + interp(r, env)
  case Mul(l, r) => interp(l, env) * interp(r, env)
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow {\color{red}v_1}$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow {\color{red}v_2}$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma \vdash e_1 + e_2 \Rightarrow {\color{red}v_1} + {\color{red}v_2}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow {\color{red}v_1}$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow {\color{red}v_2}$}
\LeftLabel{$\texttt{Mul}$}
\BinaryInfC{$\sigma \vdash e_1 \ast e_2 \Rightarrow {\color{red}v_1} \times {\color{red}v_2}$}
\end{prooftree}
\\]

**아닙니다!** 더하거나 곱할 수 있는 것은 **숫자**뿐이지, 임의의 **값**이 아닙니다. 클로저 두 개를 더한다는 것은 의미가 없습니다. 실제로 위 Scala 코드는 `Value`에 `+`가 정의되어 있지 않아 컴파일조차 되지 않습니다. 두 값이 모두 숫자일 때만 계산하고, 그렇지 않으면 오류를 내야 합니다.

```scala
  case Add(l, r) => (interp(l, env), interp(r, env)) match
    case (NumV(l), NumV(r)) => NumV(l + r)
    case (l, r) => error(s"invalid operation: ${l.str} + ${r.str}")
  case Mul(l, r) => (interp(l, env), interp(r, env)) match
    case (NumV(l), NumV(r)) => NumV(l * r)
    case (l, r) => error(s"invalid operation: ${l.str} * ${r.str}")
```

(`str`은 값을 사람이 읽기 좋은 문자열로 바꿔 주는 메서드로, 과제 코드에 미리 정의되어 있습니다.) 규칙에서는 부분식의 결과가 **숫자** \\( n_1, n_2 \\)여야 한다고 적습니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma \vdash e_1 + e_2 \Rightarrow n_1 + n_2$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Mul}$}
\BinaryInfC{$\sigma \vdash e_1 \ast e_2 \Rightarrow n_1 \times n_2$}
\end{prooftree}
\\]

결과가 클로저라면 이 규칙들의 전제를 만족할 수 없으므로 계산이 막히고, 인터프리터는 `invalid operation` 오류를 냅니다.

### 보조 함수로 중복 없애기

그런데 `Add`와 `Mul`의 코드가 연산자만 빼고 똑같습니다. <a id="g-helper-function"></a>보조 함수(helper function)를 만들어 중복을 없애 봅시다. 이 함수는

- (1) **숫자**에 대한 이항 연산과 (2) 그 연산의 이름을 받아서,
- **값**에 대한 이항 연산을 돌려줍니다.

```scala
type BOp[T] = (T, T) => T
def numBOp(op: BOp[BigInt], x: String): BOp[Value] = (l, r) =>
  (l, r) match
    case (NumV(l), NumV(r)) => NumV(op(l, r))
    case (l, r) => error(s"invalid operation: ${l.str} $x ${r.str}")
```

`BOp[T]`는 `T` 두 개를 받아 `T`를 돌려주는 함수의 타입입니다. `numBOp`가 **함수를 받아 함수를 돌려주는** 고차 함수(higher-order function)라는 점이 재미있습니다. 우리가 지금 구현하려는 일급 함수를 Scala에서 바로 활용하고 있는 셈입니다.

이 코드는 Scala 문법을 이용해 더 짧게 쓸 수 있습니다.

- 받은 인자를 그대로 패턴 매칭하는 `(l, r) => (l, r) match`는 `(_, _) match`로 줄일 수 있습니다.
- 더 나아가 Scala에서는 기대하는 타입이 함수 타입이면 `case`들만 나열해서 패턴 매칭 익명 함수를 만들 수 있습니다. 그래서 `(_, _) match`마저 지우고 `=` 바로 아래에 `case` 두 줄만 남겨도 됩니다.

이제 값에 대한 덧셈과 곱셈을 `numBOp(_ + _, "+")`, `numBOp(_ * _, "*")`로 정의할 수 있습니다. `_ + _`는 `(a, b) => a + b`의 줄임말입니다. 줄인 `numBOp`와 이 보조 함수들로 인터프리터를 정리하면 다음과 같습니다. 규칙은 그대로입니다.

```scala
type BOp[T] = (T, T) => T
def numBOp(op: BOp[BigInt], x: String): BOp[Value] =
  case (NumV(l), NumV(r)) => NumV(op(l, r))
  case (l, r) => error(s"invalid operation: ${l.str} $x ${r.str}")

val numAdd: BOp[Value] = numBOp(_ + _, "+")
val numMul: BOp[Value] = numBOp(_ * _, "*")

def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Add(l, r) => numAdd(interp(l, env), interp(r, env))
  case Mul(l, r) => numMul(interp(l, env), interp(r, env))
```

### 익명 함수

익명 함수 \\( \lambda x.e \\)는 어떤 값으로 계산될까요? 앞에서 본 대로 함수와 **현재 환경**을 묶은 클로저를 만들면 됩니다.

```scala
  case Fun(p, b) => CloV(p, b, env)
```

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Fun}$}
\UnaryInfC{${\color{green}\sigma} \vdash \lambda x.e \Rightarrow \langle \lambda x.e, {\color{green}\sigma} \rangle$}
\end{prooftree}
\\]

함수 \\( \lambda x.e \\)를 만나면 그 몸통을 계산하지 않고, 현재 환경 \\( \sigma \\)와 함께 클로저 \\( \langle \lambda x.e, \sigma \rangle \\)로 포장해 둡니다. 현재 환경을 담는 이유는 **정적 스코핑**을 위해서입니다. 함수가 **정의되는** 곳의 환경을 기억해 두어야, 나중에 어디서 호출되든 정의된 곳을 기준으로 이름을 찾을 수 있습니다.

### 함수 적용

함수 적용 \\( e_0(e_1) \\)은 세 단계로 계산합니다. `case App(f, e) => ???`의 자리를 한 단계씩 채워 봅시다.

**첫째**, **함수 식** \\( e_0 \\)을 계산하고 그 결과가 **클로저** \\( \langle \lambda x.e_2, \sigma' \rangle \\)인지 확인합니다. 클로저가 아니라면, 예를 들어 `1(2)`처럼 숫자를 호출하려 한다면 `not a function` 오류를 냅니다.

```scala
  case App(f, e) => interp(f, env) match
    case CloV(p, b, fenv) => ...
    case v                => error(s"not a function: ${v.str}")
```

클로저 안의 환경 \\( \sigma' \\)는 정적 스코핑을 위해 함수가 **정의된 곳**에서 담아 둔 환경입니다. 현재 환경 \\( \sigma \\) 대신 다른 <a id="g-metavariable"></a>메타변수(metavariable) \\( \sigma' \\)를 쓰는 이유는 일반적으로 두 환경이 다를 수 있기 때문입니다. 코드에서 이 환경의 이름이 `fenv`인 것도 같은 이유입니다(F1VAE의 함수 환경과는 관계없이, "함수의 환경"이라는 뜻입니다).

**둘째**, **인자 식** \\( e_1 \\)을 현재 환경 \\( \sigma \\)에서 계산해 그 값을 \\( v_1 \\)이라고 합니다. 위 코드의 `...` 자리에 `interp(e, env)`가 들어갑니다.

**셋째**, **몸통 식** \\( e_2 \\)를 계산합니다. 이때 쓰는 환경은 현재 환경 \\( \sigma \\)가 아니라, **클로저에 담긴 환경** \\( \sigma' \\)에 매개변수 \\( x \mapsto v_1 \\)을 더한 \\( \sigma'[x \mapsto v_1] \\)입니다. 세 단계를 모두 채우면 다음과 같습니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case App(f, e) => interp(f, env) match
    case CloV(p, b, fenv) => interp(b, fenv + (p -> interp(e, env)))
    case v                => error(s"not a function: ${v.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \langle \lambda x.e_2, {\color{green}\sigma'} \rangle$}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1$}
\AxiomC{${\color{green}\sigma'}[x \mapsto v_1] \vdash e_2 \Rightarrow v_2$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\sigma \vdash e_0(e_1) \Rightarrow v_2$}
\end{prooftree}
\\]

함수가 정의된 곳에서 담아 둔 환경을 확장해 몸통을 계산하므로, 이것이 FVAE의 **정적 스코핑**입니다. F1VAE에서는 함수가 모두 프로그램 맨 앞에서 정의되어 정의 위치의 환경이 늘 비어 있었기 때문에 \\( [x_1 \mapsto n_1] \\)로 충분했습니다. FVAE에서는 함수가 어디서든 만들어질 수 있으므로 정의 위치의 환경을 클로저에 담아 들고 다녀야 하는 것입니다.

> **생각해 보기** `addN(3)(5)`를 이 규칙으로 계산해 보세요. 바깥 `App`의 함수 식 `addN(3)`을 계산하면 클로저 \\( \langle \lambda \texttt{m}.(\texttt{n} + \texttt{m}), [\texttt{n} \mapsto 3] \rangle \\)가 나오고, 몸통 `n + m`은 \\( [\texttt{n} \mapsto 3, \texttt{m} \mapsto 5] \\)에서 계산되어 `8`이 됩니다. 클로저가 `n`을 기억하고 있다는 것이 보이나요?

### 함수 적용(동적 스코핑)

[1차 함수](./first-order-functions.md) 장에서처럼 FVAE에도 **동적 스코핑**을 정의할 수 있습니다. 클로저에 담긴 환경 \\( \sigma' \\) 대신 함수 **호출 위치**의 현재 환경 \\( \sigma \\)를 확장해 몸통을 계산하면 됩니다. 정적 스코핑과 달라지는 곳은 `CloV` 경우의 한 줄뿐입니다.

```scala
  case App(f, e) => interp(f, env) match
    case CloV(p, b, fenv) => interp(b, env + (p -> interp(e, env)))   // fenv 대신 env
    case v                => error(s"not a function: ${v.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \langle \lambda x.e_2, \sigma' \rangle$}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1$}
\AxiomC{${\color{red}\sigma}[x \mapsto v_1] \vdash e_2 \Rightarrow v_2$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{${\color{red}\sigma} \vdash e_0(e_1) \Rightarrow v_2$}
\end{prooftree}
\\]

다음 프로그램으로 두 방식을 비교해 봅시다. 프로그램은 같고 결과만 다릅니다.

```fvae,run
/* FVAE (static scoping) */
val x = 3;
val f = y => x * y;
val x = 4;
f(5) // 3 * 5 = 15
```

```fvae,run
/* FVAE (dynamic scoping) */
val x = 3;
val f = y => x * y;
val x = 4;
f(5) // 4 * 5 = 20
```

`f`가 정의될 때 `x`는 `3`이었고, `f`가 호출될 때는 `x`가 `4`로 가려져 있습니다. **정적 스코핑**에서는 다음과 같이 클로저에 담긴 \\( \sigma_0 \\)를 확장해 몸통을 계산하므로 `x`가 `3`입니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma_1 \vdash \texttt{f} \Rightarrow \langle \lambda \texttt{y}.(\texttt{x} \ast \texttt{y}), {\color{green}\sigma_0} \rangle$}
\AxiomC{$\sigma_1 \vdash 5 \Rightarrow 5$}
\AxiomC{${\color{green}\sigma_0}[\texttt{y} \mapsto 5] \vdash \texttt{x} \ast \texttt{y} \Rightarrow 15$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\sigma_1 \vdash \texttt{f}(5) \Rightarrow 15$}
\end{prooftree}
\\]

**동적 스코핑**에서는 호출 위치의 환경 \\( \sigma_1 \\)을 확장해 몸통을 계산하므로 `x`가 `4`입니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma_1 \vdash \texttt{f} \Rightarrow \langle \lambda \texttt{y}.(\texttt{x} \ast \texttt{y}), \sigma_0 \rangle$}
\AxiomC{$\sigma_1 \vdash 5 \Rightarrow 5$}
\AxiomC{${\color{red}\sigma_1}[\texttt{y} \mapsto 5] \vdash \texttt{x} \ast \texttt{y} \Rightarrow 20$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{${\color{red}\sigma_1} \vdash \texttt{f}(5) \Rightarrow 20$}
\end{prooftree}
\\]

\\[
\text{where} \quad
\begin{array}{rcl}
{\color{green}\sigma_0} & = & [\texttt{x} \mapsto 3] \\\\
{\color{red}\sigma_1} & = & [\texttt{x} \mapsto 4, \texttt{f} \mapsto \langle \lambda \texttt{y}.(\texttt{x} \ast \texttt{y}), \sigma_0 \rangle]
\end{array}
\\]

두 방식에서 몸통을 계산하는 환경이 어디서 오는지 그림으로 비교하면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="-8 -2 481 258" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="f(5)의 몸통을 정적 스코핑은 클로저가 기억한 σ0을 확장해 계산하고(15), 동적 스코핑은 호출 위치의 σ1을 확장해 계산한다(20)" font-family="sans-serif" fill="currentColor">
<defs><marker id="first-class-functions-fig-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<rect rx="3" x="0.0" y="30.0" width="58.0" height="52.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="28.0" y1="30.0" x2="28.0" y2="82.0" stroke="currentColor" stroke-width="1.2"/>
<text x="14.0" y="48.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="43.0" y="48.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">4</text>
<line x1="0.0" y1="56.0" x2="58.0" y2="56.0" stroke="currentColor" stroke-width="1.2"/>
<text x="14.0" y="74.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">f</text>
<circle cx="43.0" cy="69.0" r="4"/>
<text x="0.0" y="22.0" font-size="16" font-family="Times New Roman, Times, serif" font-style="italic">σ<tspan baseline-shift="sub" font-size="11">1</tspan></text>
<text x="30.0" y="22.0" font-size="13" opacity="0.75">(호출 위치)</text>
<rect rx="3" x="130.0" y="41.0" width="136.3" height="30.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="238.3" y1="41.0" x2="238.3" y2="71.0" stroke="currentColor" stroke-width="1.2"/>
<text x="184.2" y="61.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">λy.(x * y)</text>
<circle cx="252.3" cy="56.0" r="4"/>
<path d="M43.0,69.0 C73.0,69.0 100,56 122,56" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#first-class-functions-fig-2)"/>
<line x1="252.3" y1="56.0" x2="312.3" y2="56.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#first-class-functions-fig-2)"/>
<rect rx="3" x="318.3" y="43.0" width="58.0" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="346.3" y1="43.0" x2="346.3" y2="69.0" stroke="currentColor" stroke-width="1.2"/>
<text x="332.3" y="61.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="361.3" y="61.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="318.3" y="35.0" font-size="16" font-family="Times New Roman, Times, serif" font-style="italic">σ<tspan baseline-shift="sub" font-size="11">0</tspan></text>
<rect rx="3" x="0.0" y="170.0" width="58.0" height="78.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="28.0" y1="170.0" x2="28.0" y2="248.0" stroke="currentColor" stroke-width="1.2"/>
<text x="14.0" y="188.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="43.0" y="188.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">4</text>
<line x1="0.0" y1="196.0" x2="58.0" y2="196.0" stroke="currentColor" stroke-width="1.2"/>
<text x="14.0" y="214.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">f</text>
<text x="43.0" y="214.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">…</text>
<line x1="0.0" y1="222.0" x2="58.0" y2="222.0" stroke="currentColor" stroke-width="1.2"/>
<text x="14.0" y="240.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="43.0" y="240.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">5</text>
<text x="0.0" y="160.0" font-size="15" font-family="Times New Roman, Times, serif">동적: σ<tspan baseline-shift="sub" font-size="10">1</tspan>[y ↦ 5]</text>
<text x="70.0" y="210.0" font-size="15">x * y ⇒ 20</text>
<line x1="30.0" y1="86.0" x2="30.0" y2="146.0" stroke="currentColor" stroke-width="1.8" stroke-dasharray="5,4" marker-end="url(#first-class-functions-fig-2)"/>
<rect rx="3" x="318.3" y="170.0" width="58.0" height="52.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="346.3" y1="170.0" x2="346.3" y2="222.0" stroke="currentColor" stroke-width="1.2"/>
<text x="332.3" y="188.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="361.3" y="188.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<line x1="318.3" y1="196.0" x2="376.3" y2="196.0" stroke="currentColor" stroke-width="1.2"/>
<text x="332.3" y="214.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="361.3" y="214.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">5</text>
<text x="318.3" y="160.0" font-size="15" font-family="Times New Roman, Times, serif">정적: σ<tspan baseline-shift="sub" font-size="10">0</tspan>[y ↦ 5]</text>
<text x="388.3" y="200.0" font-size="15">x * y ⇒ 15</text>
<line x1="348.3" y1="73.0" x2="348.3" y2="146.0" stroke="currentColor" stroke-width="1.8" stroke-dasharray="5,4" marker-end="url(#first-class-functions-fig-2)"/>
</svg>
</div>

동적 스코핑에서는 클로저에 담긴 환경 \\( \sigma_0 \\)가 전혀 쓰이지 않는다는 점에 주목하세요. 동적 스코핑만 지원한다면 애초에 클로저가 필요 없고, 함수 값으로 \\( \lambda x.e \\)만 들고 다녀도 됩니다. 거꾸로 말하면 클로저는 **일급 함수와 정적 스코핑을 함께** 지원하기 위한 장치입니다. 이 책에서는 앞으로도 정적 스코핑을 기본으로 사용합니다.

> **자주 하는 실수** `App` 규칙에서 인자 식 \\( e_1 \\)까지 클로저의 환경 \\( \sigma' \\)에서 계산하는 실수가 흔합니다. 인자는 **호출하는 쪽**의 식이므로 현재 환경 \\( \sigma \\)에서 계산해야 합니다. 클로저의 환경 \\( \sigma' \\)는 오직 **몸통** \\( e_2 \\)를 계산할 때만 씁니다. 코드에서도 `interp(e, env)`이지 `interp(e, fenv)`가 아닙니다.

## 정리

지금까지 만든 FVAE의 새 부분을 모으면 다음과 같습니다.

\\[
\begin{array}{lrcrll}
\text{Expressions} & & & e & ::= & \ldots \\\\
& & & & \mid & \lambda x.e & (\texttt{Fun}) \\\\
& & & & \mid & e(e) & (\texttt{App}) \\\\
\text{Values} & \mathbb{V} & \ni & v & ::= & n & (\texttt{NumV}) \\\\
& & & & \mid & \langle \lambda x.e, \sigma \rangle & (\texttt{CloV})
\end{array}
\\]

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Fun(p, b) => CloV(p, b, env)
  case App(f, e) => interp(f, env) match
    case CloV(p, b, fenv) => interp(b, fenv + (p -> interp(e, env)))
    case v                => error(s"not a function: ${v.str}")
```

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Fun}$}
\UnaryInfC{$\sigma \vdash \lambda x.e \Rightarrow \langle \lambda x.e, \sigma \rangle$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \langle \lambda x.e_2, \sigma' \rangle$}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1$}
\AxiomC{$\sigma'[x \mapsto v_1] \vdash e_2 \Rightarrow v_2$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\sigma \vdash e_0(e_1) \Rightarrow v_2$}
\end{prooftree}
\\]

- 어떤 대상을 변수에 대입하고, 인자로 넘기고, 결과로 돌려줄 수 있으면 그 대상은 **일급 시민**입니다. 함수가 일급 시민이면 **일급 함수**라고 합니다.
- **FVAE**는 VAE에 익명 함수 \\( \lambda x.e \\)와 함수 적용 \\( e(e) \\)를 더한 언어입니다. 커링된 적용 `addN(3)(5)`를 위해 함수 자리에 임의의 식을 허용합니다.
- 함수를 값으로 다루려면 함수가 정의된 곳의 환경을 함께 기억해야 합니다. 함수와 환경의 쌍 \\( \langle \lambda x.e, \sigma \rangle \\)를 **클로저**라고 하며, FVAE의 값은 숫자 또는 클로저입니다.
- 값이 숫자만이 아니므로 덧셈과 곱셈은 두 값이 모두 숫자인지 확인해야 합니다. `numBOp` 보조 함수로 이를 깔끔하게 처리했습니다.
- `Fun` 규칙은 현재 환경을 담은 클로저를 만들고, `App` 규칙은 클로저에 담긴 환경 \\( \sigma' \\)를 확장해 몸통을 계산합니다(정적 스코핑). 호출 위치의 환경 \\( \sigma \\)를 확장하면 동적 스코핑이 됩니다.

## 연습 문제

1. 이 장 처음의 두 번째 예제 `twice(inc)(5)`의 계산 과정을 따라가며, 각 단계에서 만들어지는 클로저와 그 환경을 적어 보세요.
2. 다음 FVAE 프로그램을 정적 스코핑과 동적 스코핑으로 각각 계산하면 어떻게 되나요? 동적 스코핑에서는 무슨 일이 일어나는지 설명해 보세요.
   ```pl
   /* FVAE */
   val addN = n => m => n + m;
   val add3 = addN(3);
   add3(5)
   ```
3. 다음 식들을 계산하면 각각 어떤 값이 나오거나 어떤 오류가 나나요?
   - `x => x + 1`
   - `(x => x)(y => y)`
   - `1 + (x => x)`
   - `1(2)`
4. F1VAE의 프로그램 `def f(x) = e1; e2`를 FVAE로 옮기려면 어떻게 써야 할까요? 함수 몸통 `e1` 안에서 `f`를 다시 부르는 재귀 함수도 이 방법으로 옮길 수 있을까요? (이 질문은 [재귀 함수](./recursive-functions.md) 장에서 다시 다룹니다.)
5. (Exercise #4, FVAE) 과제 문서 [`fvae`](https://github.com/ku-plrg-classroom/docs/tree/main/cose212/fvae)를 참고해 다음 함수를 구현해 보세요. 제출할 필요는 없지만 시험 문제와 관련이 있을 수 있으니 꼭 직접 풀어 보기를 권합니다.
   - `interp`: 정적 스코핑으로 FVAE 식을 계산합니다.
   - `interpDS`: 동적 스코핑으로 FVAE 식을 계산합니다.
