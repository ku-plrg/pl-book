# 1차 함수

[식별자](./identifiers.md) 장에서 만든 VAE는 계산 결과에 이름을 붙일 수 있게 해 주었습니다. 하지만 이름이 붙는 것은 **값**뿐입니다. 같은 모양의 계산을 입력만 바꿔 여러 번 하고 싶을 때, 즉 **계산 자체**에 이름을 붙이고 싶을 때는 여전히 방법이 없습니다.

이 장에서는 <a id="g-first-order-function"></a>**1차 함수(first-order function)** 를 배웁니다. 먼저 1차 함수가 무엇인지 살펴보고, VAE에 1차 함수를 더한 언어 F1VAE의 문법을 정의합니다. 그다음 함수 정의를 찾아보기 위한 <a id="g-function-environment"></a>**함수 환경(function environment)** 을 도입해 인터프리터와 자연 의미를 만듭니다. 마지막으로 함수 몸통 안의 이름이 어느 정의를 가리키는지에 대한 두 가지 방식, <a id="g-static-scoping"></a>**정적 스코핑(static scoping)** 과 **동적 스코핑(dynamic scoping)** 을 비교합니다. 이 비교는 다음 장의 일급 함수와 클로저를 이해하는 열쇠가 되므로 꼼꼼히 봐 두기 바랍니다.

이 장에서 만들 `F1VAE` 인터프리터를 먼저 돌려 봅시다. 프로그램을 고쳐 가며 실행해 보세요.

<div class="playground" data-lang="F1VAE"></div>

## 1차 함수

Scala로 여러 숫자의 제곱을 계산해 봅시다.

```scala
3 * 3       // 9
42 * 42     // 1764
2434 * 2434 // 5924356
```

"어떤 수를 자기 자신과 곱한다"는 같은 계산을 세 번이나 적었습니다. 숫자가 길어지면 오타를 내기도 쉽습니다. **1차 함수**를 쓰면 이런 반복을 피할 수 있습니다.

```scala
// A `square` function that takes an integer `n` and returns its square.
def square(n: Int): Int = n * n

square(3)    // 9
square(42)   // 1764
square(2434) // 5924356
```

1차 함수는 (1) **함수 이름**, (2) **매개변수(parameter)** 목록, (3) <a id="g-function-body"></a>**함수 몸통(body)** 으로 이루어지며, <a id="g-argument"></a>**인자(argument)** 를 주어 <a id="g-invoke"></a>**호출(invoke)** 할 수 있습니다. `square`의 경우 함수 이름은 `square`, 매개변수는 `n` 하나, 몸통은 `n * n`이고, `square(3)`은 인자 `3`으로 함수를 호출한 것입니다.

대부분의 프로그래밍 언어가 1차 함수를 지원합니다. 문법은 조금씩 달라도 구성 요소는 똑같습니다.

```scala
// Scala
def square(n: Int): Int = n * n
square(3) // 9
```

```python
# Python
def square(n): return n * n
square(3) # 9
```

```cpp
// C++
int square(int n) { return n * n; }
square(3) // 9
```

```rust
// Rust
fn square(n: i32) -> i32 { return n * n; }
square(3) // 9
```

여기서 "1차"라는 말은 함수가 값처럼 자유롭게 다뤄지지 **않는다**는 뜻입니다. 1차 함수는 미리 이름을 붙여 정의해 두고 그 이름으로 호출만 할 수 있을 뿐, 변수에 담거나 다른 함수의 인자로 넘기거나 결과로 돌려줄 수는 없습니다. 이런 일까지 할 수 있는 함수는 다음 장 [일급 함수](./first-class-functions.md)에서 다룹니다.

## F1VAE: 1차 함수가 있는 VAE

이제 VAE를 확장해 1차 함수가 있는 언어 **F1VAE**를 만들겠습니다. F1VAE 프로그램은 다음과 같이 생겼습니다.

```f1vae,run
/* F1VAE */
def square(n) = n * n;
square(3) + 2 // 11
```

```f1vae,run
/* F1VAE */
def add3(n) = n + 3;
def mul2(m) = m * 2;
mul2(add3(4)) // 14
```

이 예제들에서 F1VAE의 특징 세 가지를 읽어 낼 수 있습니다.

- F1VAE **프로그램**은 (1) **함수 정의**의 목록과 (2) **식** 하나의 쌍입니다. 함수 정의들이 앞에 나오고, 마지막에 계산할 식이 옵니다.
- F1VAE의 **함수 정의**는 **매개변수를 딱 하나**만 가집니다. 매개변수가 여러 개인 함수는 문제를 복잡하게 만들 뿐 새로운 개념을 주지 않으므로 생략합니다.
- **식**에는 <a id="g-function-application"></a>**함수 적용(function application)**, 즉 함수 호출이 추가됩니다.

### 구체 문법

이 세 가지를 반영해 F1VAE의 구체 문법(concrete syntax)을 BNF로 정의합니다.

```bnf
// programs
<program> ::= <fdef>* <expr>
// function definitions
<fdef>    ::= "def" <id> "(" <id> ")" "=" <expr> ";"
// expressions
<expr>    ::= ...
            | "{" <expr> "}"                    // block
            | "val" <id> "=" <expr> ";" <expr>  // variable definition
            | <id>                              // identifier lookup
            | <id> "(" <expr> ")"               // function application
```

프로그램은 함수 정의 0개 이상 뒤에 식 하나가 오는 형태이고, 함수 정의는 `def 함수이름(매개변수) = 몸통;` 꼴입니다. 함수 적용 `<id> "(" <expr> ")"`에서 함수 자리에는 **식별자만** 올 수 있다는 점에 주목하세요. 1차 함수는 이름으로만 호출할 수 있기 때문입니다.

### 추상 문법

F1VAE의 추상 문법(abstract syntax)과 그에 대응하는 Scala ADT는 다음과 같습니다.

\\[
\begin{array}{lrcrll}
\text{Programs} & & & p & ::= & f^{\ast}\ e & (\texttt{Program}) \\\\
\text{Function Definitions} & \mathbb{F} & \ni & f & ::= & \texttt{def}\ x(x)\ \texttt{=}\ e & (\texttt{FunDef}) \\\\
\text{Expressions} & & & e & ::= & \ldots \\\\
& & & & \mid & \texttt{val}\ x\ \texttt{=}\ e\texttt{;}\ e & (\texttt{Val}) \\\\
& & & & \mid & x & (\texttt{Id}) \\\\
& & & & \mid & x(e) & (\texttt{App})
\end{array}
\\]

```scala
// programs
case class Program(fdefs: List[FunDef], expr: Expr)
// function definitions
case class FunDef(name: String, param: String, body: Expr)
// expressions
enum Expr:
  ...
  case Val(name: String, init: Expr, body: Expr)
  case Id(name: String)
  case App(fname: String, arg: Expr) // function application
```

함수 정의의 집합은 \\( \mathbb{F} \\)로 쓰고, \\( f^{\ast} \\)는 함수 정의 0개 이상의 목록을 뜻합니다. `App`의 첫 번째 필드가 `Expr`이 아니라 `String`인 것은, 앞에서 말했듯 함수 자리에 이름만 올 수 있기 때문입니다.

예를 들어 다음 F1VAE 프로그램을 **파싱**하면

```f1vae,run
/* F1VAE */
def add3(n) = n + 3;
def mul2(m) = m * 2;
mul2(add3(4))
```

다음과 같은 <a id="g-abstract-syntax-tree"></a>**추상 문법 트리(abstract syntax tree, AST)** 가 만들어집니다.

```scala
Program(
  List(
    FunDef("add3", "n", Add(Id("n"), Num(3))),
    FunDef("mul2", "m", Mul(Id("m"), Num(2)))
  ),
  App("mul2", App("add3", Num(4)))
)
```

## F1VAE의 인터프리터와 자연 의미

### 함수 환경을 이용한 계산

위의 F1VAE 프로그램을 계산해 봅시다.

```f1vae,run
/* F1VAE */
def add3(n) = n + 3;
def mul2(m) = m * 2;
mul2(add3(4)) // 14
```

`mul2(add3(4))`를 계산하려면 먼저 `add3`와 `mul2`가 어떤 함수인지 알아야 합니다. 함수 이름으로 함수 정의를 어떻게 찾을 수 있을까요?

변수의 값을 찾기 위해 환경을 썼던 것처럼, 함수 이름을 함수 정의로 대응시키는 **함수 환경**을 만들면 됩니다. 프로그램의 **함수 정의 목록**으로부터 다음과 같은 함수 환경을 만듭니다.

\\[
[\texttt{add3} \mapsto f_0, \texttt{mul2} \mapsto f_1]
\\]

\\[
\text{where} \quad
\begin{array}{rcl}
f_0 & = & \texttt{def}\ \texttt{add3}(\texttt{n})\ \texttt{=}\ \texttt{n} + 3 \\\\
f_1 & = & \texttt{def}\ \texttt{mul2}(\texttt{m})\ \texttt{=}\ \texttt{m} \ast 2
\end{array}
\\]

VAE의 인터프리터는 식 \\( e \\)와 환경 \\( \sigma \\)를 받아 숫자 \\( n \\)을 돌려주었습니다.

```scala
type Value = BigInt                           // values
type Env = Map[String, Value]                 // environments
def interp(expr: Expr, env: Env): Value = ... // interpreter
```

\\[
\boxed{\sigma \vdash e \Rightarrow n}
\\]

F1VAE에서는 이것을 확장해, 함수 이름에서 함수 정의로 가는 함수 환경 \\( \Lambda \\)도 함께 받도록 합니다. `Value`와 `Env`는 그대로이고, 함수 환경의 타입 `FEnv`가 새로 생기고 `interp`가 인자를 하나 더 받습니다.

```scala
type FEnv = Map[String, FunDef]               // function environments (새로 추가)
def interp(expr: Expr, env: Env, fenv: FEnv): Value = ... // fenv 인자 추가
```

\\[
\boxed{\sigma, \Lambda \vdash e \Rightarrow n}
\\]

"환경 \\( \sigma \\)와 함수 환경 \\( \Lambda \\) 아래에서 식 \\( e \\)는 숫자 \\( n \\)으로 계산된다"라고 읽습니다.

### 함수 환경 만들기

그런데 F1VAE 프로그램에 들어 있는 것은 함수 정의의 **목록**이지, 함수 이름에서 정의로 가는 **대응**이 아닙니다.

```scala
case class Program(fdefs: List[FunDef], expr: Expr)
type FEnv = Map[String, FunDef]
```

`List[FunDef]`로부터 `FEnv`를 어떻게 만들 수 있을까요? 빈 `Map`에서 시작해 함수 정의를 하나씩 추가하면 됩니다. Scala의 `foldLeft`가 바로 이런 일을 합니다.

```scala
def createFEnv(fdefs: List[FunDef]): FEnv =
  fdefs.foldLeft(Map.empty)((fenv: FEnv, fdef: FunDef) => {
    val fname: String = fdef.name
    if (fenv.contains(fname)) error(s"duplicate function: $fname")
    else fenv + (fname -> fdef)
  })
```

함수 정의를 추가할 때마다 같은 이름이 이미 있는지 확인하므로, **함수 이름이 중복되면** 오류를 냅니다.

```scala
createFEnv(List(
  FunDef("add3", "n", Add(Id("n"), Num(3))),
  FunDef("add3", "n", Add(Num(3), Id("n"))),
)) // error: duplicate function: add3
```

> **생각해 보기** 변수는 같은 이름으로 다시 정의하면 섀도잉이 일어났는데, 함수는 왜 중복 정의를 오류로 처리할까요? F1VAE의 함수 정의들은 중첩되지 않고 프로그램 맨 앞에 나란히 놓여 있습니다. 어느 하나가 다른 것의 "안쪽"이 아니므로 어느 쪽이 이겨야 하는지 정할 기준이 없습니다.

### 의미 정의의 틀

F1VAE를 위해 해야 할 일은 두 가지입니다. (1) 인터프리터를 구현하고,

```scala
def interp(expr: Expr, env: Env, fenv: FEnv): Value = ???
```

(2) 환경과 **함수 환경**을 이용하는 자연 의미(natural semantics)을 정의하는 것입니다.

\\[
\boxed{\sigma, \Lambda \vdash e \Rightarrow n}
\\]

\\[
\begin{array}{lrcrll}
\text{Programs} & & & p & ::= & f^{\ast}\ e & (\texttt{Program}) \\\\
\text{Function Definitions} & \mathbb{F} & \ni & f & ::= & \texttt{def}\ x(x)\ \texttt{=}\ e & (\texttt{FunDef}) \\\\
\text{Expressions} & & & e & ::= & \ldots \\\\
& & & & \mid & x(e) & (\texttt{App})
\end{array}
\\]

여기서 각 기호의 범위는 다음과 같습니다.

\\[
\begin{array}{lrcll}
\text{Numbers} & n & \in & \mathbb{Z} & (\texttt{BigInt}) \\\\
\text{Identifiers} & x & \in & \mathbb{X} & (\texttt{String}) \\\\
\text{Environments} & \sigma & \in & \mathbb{X} \xrightarrow{\text{fin}} \mathbb{Z} & (\texttt{Env}) \\\\
\text{Function Environments} & \Lambda & \in & \mathbb{X} \xrightarrow{\text{fin}} \mathbb{F} & (\texttt{FEnv})
\end{array}
\\]

### 함수 적용

새로 생긴 경우는 함수 적용 \\( x_0(e_1) \\)입니다. 이번에도 인터프리터와 규칙을 함께 조금씩 채워 나가겠습니다.

```scala
def interp(expr: Expr, env: Env, fenv: FEnv): Value = expr match
  ...
  case App(f, e) => ???
```

**첫째**, 함수 환경에서 함수 이름 \\( x_0 \\)의 정의를 찾습니다. \\( x_0 \\)가 함수 환경에 있어야 하고, 찾은 정의를 \\( \texttt{def}\ x_0(x_1)\ \texttt{=}\ e_2 \\)라고 합시다. 즉 매개변수가 \\( x_1 \\), 몸통이 \\( e_2 \\)입니다. 함수가 없으면 `unknown function` 오류를 냅니다.

```scala
  case App(f, e) =>
    val fdef = fenv.getOrElse(f, error(s"unknown function: $f"))
    ...
```

**둘째**, 인자 식 \\( e_1 \\)을 현재 환경 \\( \sigma \\)에서 계산해 그 값을 \\( n_1 \\)이라고 합니다. 위 코드의 `...` 자리에 `interp(e, env, fenv)`가 들어갑니다.

**셋째**, 매개변수 \\( x_1 \\)을 인자 값 \\( n_1 \\)에 대응시키는 환경 \\( [x_1 \mapsto n_1] \\)을 만듭니다. 코드로는 `Map(fdef.param -> interp(e, env, fenv))`입니다.

**넷째**, 그 환경에서 함수 몸통 \\( e_2 \\)를 계산한 값 \\( n_2 \\)가 함수 적용의 결과입니다. 그래서 `...` 자리는 결국 `interp(fdef.body, Map(fdef.param -> interp(e, env, fenv)), fenv)`가 됩니다. 완성된 `App` 경우는 뒤에서 전체 인터프리터와 함께 보겠습니다.

이 네 단계를 하나의 추론 규칙으로 쓰면 다음과 같습니다.

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{cc}
x_0 \in \text{Dom}(\Lambda) & \quad \Lambda(x_0) = \texttt{def}\ x_0(x_1)\ \texttt{=}\ e_2 \\\\
\sigma, \Lambda \vdash e_1 \Rightarrow n_1 & \quad [x_1 \mapsto n_1], \Lambda \vdash e_2 \Rightarrow n_2
\end{array}$}
\LeftLabel{$\texttt{App}$}
\UnaryInfC{$\sigma, \Lambda \vdash x_0(e_1) \Rightarrow n_2$}
\end{prooftree}
\\]

가장 눈여겨볼 곳은 마지막 전제입니다. 함수 몸통 \\( e_2 \\)는 호출하는 쪽의 환경 \\( \sigma \\)가 **아니라**, 매개변수 하나만 들어 있는 **새 환경** \\( [x_1 \mapsto n_1] \\)에서 계산됩니다. 함수 몸통 안에서 보이는 변수는 자기 매개변수뿐이라는 뜻입니다. 이 선택이 왜 중요한지는 잠시 뒤 정적 스코핑과 동적 스코핑에서 자세히 살펴봅니다.

나머지 경우들은 VAE와 똑같고 함수 환경 \\( \Lambda \\)를 그대로 넘겨주기만 하면 되므로 따로 설명하지 않겠습니다. 예를 들어 `Add` 규칙은 다음과 같이 \\( \Lambda \\)가 붙을 뿐입니다. 전체 규칙이 궁금하면 [F1VAE 명세](https://github.com/ku-plrg-classroom/docs/blob/main/cose212/f1vae/f1vae-spec.pdf)를 참고하세요.

\\[
\begin{prooftree}
\AxiomC{$\sigma, \Lambda \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\sigma, \Lambda \vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma, \Lambda \vdash e_1 + e_2 \Rightarrow n_1 + n_2$}
\end{prooftree}
\\]

모두 모은 인터프리터는 다음과 같습니다.

```scala
def interp(expr: Expr, env: Env, fenv: FEnv): Value = expr match
  case Num(n)       => n
  case Add(l, r)    => interp(l, env, fenv) + interp(r, env, fenv)
  case Mul(l, r)    => interp(l, env, fenv) * interp(r, env, fenv)
  case Val(x, e, b) => interp(b, env + (x -> interp(e, env, fenv)), fenv)
  case Id(x)        => env.getOrElse(x, error(s"free identifier: $x"))
  case App(f, e) =>
    val fdef = fenv.getOrElse(f, error(s"unknown function: $f"))
    interp(fdef.body, Map(fdef.param -> interp(e, env, fenv)), fenv)
```

프로그램 전체를 계산할 때는 함수 정의 목록으로 함수 환경을 만든 다음, 빈 환경에서 식을 계산합니다.

```scala
def eval(program: Program): Value =
  val fenv: FEnv = createFEnv(program.fdefs)
  interp(program.expr, Map.empty, fenv)
```

앞의 `add3`/`mul2` 프로그램을 넣으면 `14`가 나옵니다. 각 호출이 어떤 환경에서 몸통을 계산하는지 그려 보면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="-8 -2 568 226" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="mul2(add3(4))를 계산할 때 각 함수 호출은 매개변수 하나만 담은 새 환경에서 몸통을 계산한다" font-family="sans-serif" fill="currentColor">
<defs><marker id="first-order-functions-fig-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<rect rx="3" x="40.0" y="30.0" width="239.7" height="52.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="92.1" y1="30.0" x2="92.1" y2="82.0" stroke="currentColor" stroke-width="1.2"/>
<text x="66.1" y="48.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">add3</text>
<text x="185.9" y="48.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">def add3(n) = n + 3</text>
<line x1="40.0" y1="56.0" x2="279.7" y2="56.0" stroke="currentColor" stroke-width="1.2"/>
<text x="66.1" y="74.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">mul2</text>
<text x="185.9" y="74.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">def mul2(m) = m * 2</text>
<text x="40.0" y="22.0" font-size="16" font-family="Times New Roman, Times, serif" font-style="italic">Λ</text>
<text x="0.0" y="148.0" font-size="15" font-family="ui-monospace, Menlo, monospace" font-weight="bold">add3(4)</text>
<line x1="72.0" y1="143.0" x2="120.0" y2="143.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#first-order-functions-fig-1)"/>
<rect rx="3" x="130.0" y="130.0" width="58.0" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="158.0" y1="130.0" x2="158.0" y2="156.0" stroke="currentColor" stroke-width="1.2"/>
<text x="144.0" y="148.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">n</text>
<text x="173.0" y="148.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">4</text>
<text x="200.0" y="148.0" font-size="15">⊢  n + 3  ⇒  7</text>
<text x="0.0" y="208.0" font-size="15" font-family="ui-monospace, Menlo, monospace" font-weight="bold">mul2(7)</text>
<line x1="72.0" y1="203.0" x2="120.0" y2="203.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#first-order-functions-fig-1)"/>
<rect rx="3" x="130.0" y="190.0" width="58.0" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="158.0" y1="190.0" x2="158.0" y2="216.0" stroke="currentColor" stroke-width="1.2"/>
<text x="144.0" y="208.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">m</text>
<text x="173.0" y="208.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">7</text>
<text x="200.0" y="208.0" font-size="15">⊢  m * 2  ⇒  14</text>
<text x="380.0" y="148.0" font-size="13" opacity="0.75">Λ에서 add3를 찾고</text>
<text x="380.0" y="166.0" font-size="13" opacity="0.75">새 환경 [n ↦ 4]에서 몸통 계산</text>
<text x="380.0" y="208.0" font-size="13" opacity="0.75">결과 7을 인자로 mul2 호출</text>
</svg>
</div>

### 예제

간단한 프로그램 하나의 유도 트리를 그려 봅시다.

```f1vae,run
/* F1VAE */
def inc(x) = x + 1;
inc(2) // 3
```

\\[
\begin{prooftree}
\AxiomC{$\Lambda(\texttt{inc}) = f$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\varnothing, \Lambda \vdash 2 \Rightarrow 2$}
\AxiomC{$\texttt{x} \in \text{Dom}(\sigma)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma, \Lambda \vdash \texttt{x} \Rightarrow 2$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\sigma, \Lambda \vdash 1 \Rightarrow 1$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma, \Lambda \vdash \texttt{x} + 1 \Rightarrow 3$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\varnothing, \Lambda \vdash \texttt{inc}(2) \Rightarrow 3$}
\end{prooftree}
\\]

\\[
\text{where} \quad
\begin{array}{rcl}
\Lambda & = & [\texttt{inc} \mapsto f] \\\\
f & = & \texttt{def}\ \texttt{inc}(\texttt{x})\ \texttt{=}\ \texttt{x} + 1 \\\\
\sigma & = & [\texttt{x} \mapsto 2]
\end{array}
\\]

`App` 규칙의 전제 중 \\( \texttt{inc} \in \text{Dom}(\Lambda) \\)는 \\( \Lambda(\texttt{inc}) = f \\)에 포함된 것으로 보고 생략했습니다. 인자 `2`를 빈 환경에서 계산한 뒤, 매개변수 `x`를 `2`에 대응시킨 새 환경 \\( \sigma \\)에서 몸통 `x + 1`을 계산해 `3`을 얻습니다.

## 정적 스코핑과 동적 스코핑

### 두 가지 방식

지금까지 정의한 의미는 **정적 스코핑(static scoping)** 또는 <a id="g-lexical-scoping"></a>**어휘적 스코핑(lexical scoping)** 이라고 부릅니다. 식별자의 묶는 출현이 함수가 **호출되는** 곳이 아니라 함수가 **정의된** 곳에 따라, 즉 프로그램을 실행하지 않고 코드만 보고도 **정적으로** 정해지기 때문입니다.

다음 프로그램을 봅시다.

```f1vae,run
/* F1VAE */
def f(x) = x + y;       // y is a free variable
{ val y = 2; f(1) } + { val y = 4; f(3) }
```

함수 `f`의 몸통에 있는 `y`는 `f`의 정의에서 보면 어디에도 정의되지 않은 **자유 식별자**입니다. 정적 스코핑에서는 이 사실이 호출하는 쪽에 `y`가 있든 없든 바뀌지 않습니다. 앞에서 본 `App` 규칙이 몸통을 \\( [x_1 \mapsto n_1] \\)에서만 계산하므로, 호출하는 쪽의 `val y = 2`는 몸통에서 보이지 않습니다. 따라서 이 프로그램은 `free identifier: y` 오류를 냅니다.

하지만 F1VAE의 의미를 다른 방식으로 정의할 수도 있습니다. **동적 스코핑(dynamic scoping)** 에서는 묶는 출현이 함수가 적용되는 <a id="g-call-site"></a>**호출 위치(call site)** 의 환경에 따라 **동적으로** 정해집니다.

```f1vae,run
/* F1VAE */
def f(x) = x + y;       // y = 2 or y = 4 depending on the call-site
{ val y = 2; f(1) } + { val y = 4; f(3) } // (1 + 2) + (3 + 4) = 10
```

첫 번째 호출 `f(1)`에서는 호출 위치에 `y = 2`가 있으므로 `y`가 `2`이고, 두 번째 호출 `f(3)`에서는 `y = 4`이므로 `y`가 `4`입니다. 같은 함수 몸통의 같은 `y`가 호출할 때마다 다른 정의를 가리키는 것입니다.

### 동적 스코핑의 함수 적용

동적 스코핑은 함수 적용의 정의를 딱 한 곳만 바꾸면 얻을 수 있습니다. 몸통을 계산할 때 빈 환경에서 시작하는 대신, **호출 위치의 환경** `env`에 매개변수를 추가한 환경을 씁니다.

```scala
  case App(f, e) =>
    val fdef = fenv.getOrElse(f, error(s"unknown function: $f"))
    interp(fdef.body, env + (fdef.param -> interp(e, env, fenv)), fenv)  // Map(...) 대신 env + (...)
```

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{cc}
x_0 \in \text{Dom}(\Lambda) & \quad \Lambda(x_0) = \texttt{def}\ x_0(x_1)\ \texttt{=}\ e_2 \\\\
\sigma, \Lambda \vdash e_1 \Rightarrow n_1 & \quad {\color{red}\sigma}[x_1 \mapsto n_1], \Lambda \vdash e_2 \Rightarrow n_2
\end{array}$}
\LeftLabel{$\texttt{App}$}
\UnaryInfC{$\sigma, \Lambda \vdash x_0(e_1) \Rightarrow n_2$}
\end{prooftree}
\\]

빨간색으로 표시한 \\( \sigma \\) 하나가 차이의 전부입니다. 정적 스코핑에서는 \\( [x_1 \mapsto n_1] \\), 동적 스코핑에서는 \\( \sigma[x_1 \mapsto n_1] \\)입니다.

이렇게 두 방식이 모두 가능하지만, **이 책에서는 기본적으로 정적 스코핑을 사용합니다.**

> **생각해 보기** 동적 스코핑은 왜 기본값이 되지 못했을까요? 함수 `f`를 작성한 사람은 몸통의 `y`가 무엇인지 알 수 없고, `f`를 호출하는 사람은 자기가 정의한 지역 변수 이름 때문에 `f`의 동작이 바뀐다는 사실을 알기 어렵습니다. 함수의 의미가 그 함수의 코드만으로 정해지지 않으니 프로그램을 이해하고 고치기가 매우 어려워집니다. 초기 Lisp 등 일부 언어가 동적 스코핑을 썼지만, 오늘날 대부분의 언어는 정적 스코핑을 따릅니다.

### 예제

두 방식의 차이를 유도 트리로 확인해 봅시다.

```f1vae,run
/* F1VAE */
def add(x) = x + y;
val y = 2; add(1)
```

먼저 **정적 스코핑**으로 계산하면 다음과 같습니다.

몸통 `x + y`의 계산 부분은 \\( \mathcal{D} \\)로 따로 떼어 쓰겠습니다.

\\[
\mathcal{D} = \quad
\begin{prooftree}
\AxiomC{$\texttt{x} \in \text{Dom}(\sigma_1)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_1, \Lambda \vdash \texttt{x} \Rightarrow 1$}
\AxiomC{$\color{red}{\texttt{y} \notin \text{Dom}(\sigma_1)}$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_1, \Lambda \vdash \texttt{y} \Rightarrow \color{red}{\text{FAIL}}$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma_1, \Lambda \vdash \texttt{x} + \texttt{y} \Rightarrow \color{red}{\text{FAIL}}$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\varnothing, \Lambda \vdash 2 \Rightarrow 2$}
\AxiomC{$\Lambda(\texttt{add}) = f$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\sigma_0, \Lambda \vdash 1 \Rightarrow 1$}
\AxiomC{$\mathcal{D}$}
\noLine
\UnaryInfC{$\sigma_1, \Lambda \vdash \texttt{x} + \texttt{y} \Rightarrow \color{red}{\text{FAIL}}$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\sigma_0, \Lambda \vdash \texttt{add}(1) \Rightarrow \color{red}{\text{FAIL}}$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\varnothing, \Lambda \vdash \texttt{val}\ \texttt{y}\ \texttt{=}\ 2\texttt{;}\ \texttt{add}(1) \Rightarrow \color{red}{\text{FAIL}}$}
\end{prooftree}
\\]

\\[
\text{where} \quad
\begin{array}{rcl}
\Lambda & = & [\texttt{add} \mapsto f] \\\\
f & = & \texttt{def}\ \texttt{add}(\texttt{x})\ \texttt{=}\ \texttt{x} + \texttt{y} \\\\
\sigma_0 & = & [\texttt{y} \mapsto 2] \\\\
\sigma_1 & = & [\texttt{x} \mapsto 1]
\end{array}
\\]

함수 몸통은 \\( \sigma_1 = [\texttt{x} \mapsto 1] \\)에서 계산되는데, 여기에는 `y`가 없습니다. `y`는 `add` 함수 안에서 **자유 식별자**이므로 계산이 막힙니다.

이번에는 **동적 스코핑**으로 계산해 봅시다.

몸통 `x + y`의 계산 부분은 \\( \mathcal{D} \\)로 따로 떼어 쓰겠습니다.

\\[
\mathcal{D} = \quad
\begin{prooftree}
\AxiomC{$\texttt{x} \in \text{Dom}(\sigma_1)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_1, \Lambda \vdash \texttt{x} \Rightarrow 1$}
\AxiomC{$\texttt{y} \in \text{Dom}(\sigma_1)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_1, \Lambda \vdash \texttt{y} \Rightarrow 2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma_1, \Lambda \vdash \texttt{x} + \texttt{y} \Rightarrow 3$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\varnothing, \Lambda \vdash 2 \Rightarrow 2$}
\AxiomC{$\Lambda(\texttt{add}) = f$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\sigma_0, \Lambda \vdash 1 \Rightarrow 1$}
\AxiomC{$\mathcal{D}$}
\noLine
\UnaryInfC{$\sigma_1, \Lambda \vdash \texttt{x} + \texttt{y} \Rightarrow 3$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\sigma_0, \Lambda \vdash \texttt{add}(1) \Rightarrow 3$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\varnothing, \Lambda \vdash \texttt{val}\ \texttt{y}\ \texttt{=}\ 2\texttt{;}\ \texttt{add}(1) \Rightarrow 3$}
\end{prooftree}
\\]

\\[
\text{where} \quad
\begin{array}{rcl}
\Lambda & = & [\texttt{add} \mapsto f] \\\\
f & = & \texttt{def}\ \texttt{add}(\texttt{x})\ \texttt{=}\ \texttt{x} + \texttt{y} \\\\
\sigma_0 & = & [\texttt{y} \mapsto 2] \\\\
\sigma_1 & = & {\color{red}\sigma_0}[\texttt{x} \mapsto 1] = [{\color{red}\texttt{y} \mapsto 2}, \texttt{x} \mapsto 1]
\end{array}
\\]

이번에는 몸통이 호출 위치의 환경 \\( \sigma_0 \\)를 확장한 \\( \sigma_1 \\)에서 계산되므로 `y`가 **동적으로** `2`에 묶이고, 결과는 `3`입니다. 두 트리는 \\( \sigma_1 \\)의 정의 하나만 다를 뿐인데 결과는 오류와 `3`으로 갈립니다.

두 계산에서 함수 몸통이 쓰는 환경을 나란히 놓으면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="43 -2 439 250" width="100%" style="max-width: 560px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="정적 스코핑에서는 몸통을 [x ↦ 1]에서 계산해 y를 찾지 못하고, 동적 스코핑에서는 호출 위치 환경을 확장한 [y ↦ 2, x ↦ 1]에서 계산해 3이 된다" font-family="sans-serif" fill="currentColor">
<defs><marker id="first-order-functions-fig-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<rect rx="3" x="250.0" y="30.0" width="58.0" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="278.0" y1="30.0" x2="278.0" y2="56.0" stroke="currentColor" stroke-width="1.2"/>
<text x="264.0" y="48.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="293.0" y="48.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">2</text>
<text x="250.0" y="22.0" font-size="16" font-family="Times New Roman, Times, serif" font-style="italic">σ<tspan baseline-shift="sub" font-size="11">0</tspan></text>
<text x="320.0" y="48.0" font-size="15">⊢  add(1)   (호출 위치)</text>
<text x="100.0" y="120.0" text-anchor="middle" font-size="15" font-weight="bold">정적 스코핑</text>
<rect rx="3" x="80.0" y="140.0" width="58.0" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="108.0" y1="140.0" x2="108.0" y2="166.0" stroke="currentColor" stroke-width="1.2"/>
<text x="94.0" y="158.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="123.0" y="158.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<text x="100.0" y="210.0" text-anchor="middle" font-size="15">x + y  ⇒  오류</text>
<text x="100.0" y="230.0" text-anchor="middle" font-size="13" opacity="0.75">(y가 없음)</text>
<text x="150.0" y="160.0" font-size="13" opacity="0.75">빈 환경에서 시작</text>
<text x="420.0" y="120.0" text-anchor="middle" font-size="15" font-weight="bold">동적 스코핑</text>
<rect rx="3" x="400.0" y="140.0" width="58.0" height="52.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="428.0" y1="140.0" x2="428.0" y2="192.0" stroke="currentColor" stroke-width="1.2"/>
<text x="414.0" y="158.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="443.0" y="158.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">2</text>
<line x1="400.0" y1="166.0" x2="458.0" y2="166.0" stroke="currentColor" stroke-width="1.2"/>
<text x="414.0" y="184.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="443.0" y="184.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<text x="420.0" y="236.0" text-anchor="middle" font-size="15">x + y  ⇒  3</text>
<line x1="298.0" y1="60.0" x2="394.0" y2="166.0" stroke="currentColor" stroke-width="1.8" stroke-dasharray="5,4" marker-end="url(#first-order-functions-fig-2)"/>
<text x="332.0" y="112.0" text-anchor="end" font-size="13" opacity="0.75">호출 위치 환경을 확장</text>
</svg>
</div>

> **자주 하는 실수** 동적 스코핑을 구현할 때 `Val` 규칙까지 바꿔야 한다고 생각하기 쉽습니다. 하지만 `Val`은 원래부터 현재 환경을 확장해 몸통을 계산하므로 정적 스코핑과 동적 스코핑에서 똑같습니다. 둘의 차이는 오직 **함수 몸통을 어떤 환경에서 계산하느냐**, 즉 `App` 규칙에만 있습니다.

## 정리

- **1차 함수**는 함수 이름, 매개변수, 몸통으로 이루어지며 인자를 주어 호출할 수 있습니다. 반복되는 계산에 이름을 붙여 재사용하게 해 줍니다.
- **F1VAE** 프로그램은 함수 정의 목록과 식 하나의 쌍입니다. 함수 정의는 매개변수가 하나이고, 식에는 함수 적용 \\( x(e) \\)가 추가됩니다.
- 함수 이름으로 정의를 찾기 위해 **함수 환경** \\( \Lambda \in \mathbb{X} \xrightarrow{\text{fin}} \mathbb{F} \\)를 씁니다. `createFEnv`는 함수 정의 목록으로 함수 환경을 만들고, 이름이 중복되면 오류를 냅니다.
- 판단은 \\( \sigma, \Lambda \vdash e \Rightarrow n \\)이 되고, `App` 규칙은 인자를 계산한 뒤 **매개변수만 있는 새 환경** \\( [x_1 \mapsto n_1] \\)에서 함수 몸통을 계산합니다.
- 이것이 **정적 스코핑**입니다. 묶는 출현이 함수가 정의된 곳을 기준으로 정해집니다. 반면 **동적 스코핑**은 호출 위치의 환경을 확장한 \\( \sigma[x_1 \mapsto n_1] \\)에서 몸통을 계산하므로 묶는 출현이 호출할 때마다 달라질 수 있습니다.
- 이 책에서는 기본적으로 정적 스코핑을 사용합니다.

## 연습 문제

1. 다음 F1VAE 프로그램을 정적 스코핑과 동적 스코핑으로 각각 계산하면 결과가 어떻게 되나요?
   ```pl
   /* F1VAE */
   def f(x) = x + y;
   def g(y) = f(y * 10);
   g(1)
   ```
2. 다음 프로그램은 정적 스코핑과 동적 스코핑에서 결과가 같습니다. 이유를 설명해 보세요. 일반적으로 함수 몸통에 자유 식별자가 없으면 두 방식의 결과가 같다고 할 수 있을까요?
   ```pl
   /* F1VAE */
   def square(n) = n * n;
   val n = 10; square(3) + n
   ```
3. `def f(x) = f(x);`처럼 자기 자신을 부르는 함수를 정의하고 `f(1)`을 계산하면 인터프리터는 어떻게 동작할까요? 이때 유도 트리를 그릴 수 있나요?
4. (Exercise #3, F1VAE) 과제 문서 [`f1vae`](https://github.com/ku-plrg-classroom/docs/tree/main/cose212/f1vae)를 참고해 다음 함수를 구현해 보세요. 제출할 필요는 없지만 시험 문제와 관련이 있을 수 있으니 꼭 직접 풀어 보기를 권합니다.
   - `interp`: 정적 스코핑으로 F1VAE 식을 계산합니다.
   - `interpDS`: 동적 스코핑으로 F1VAE 식을 계산합니다.
