# 지연 계산

앞 장 [변경 가능한 변수](./mutable-variables.md)에서 우리는 두 가지 <a id="g-evaluation-strategy"></a>계산 전략(evaluation strategy)을 만났습니다. 인자를 먼저 계산해서 그 값을 함수에 넘기는 **값에 의한 호출**(call-by-value, CBV)과, 인자의 주소를 넘기는 **참조에 의한 호출**(call-by-reference, CBR)입니다. 두 전략은 함수를 부르기 전에 인자를 "미리" 다 처리해 둔다는 점에서 <a id="g-eager-evaluation"></a>**즉시 계산**(eager evaluation)이라고 부릅니다.

이번 장에서는 정반대 방향의 전략인 <a id="g-lazy-evaluation"></a>**지연 계산**(lazy evaluation)을 다룹니다. "결과가 정말 필요해질 때까지 계산을 미룬다"는 단순한 아이디어인데, 이것만으로도 쓸데없는 계산을 피하고, 쓰지도 않을 식 때문에 오류가 나는 것을 막고, 심지어 무한히 긴 자료 구조까지 다룰 수 있게 됩니다. 지연 계산에는 두 가지 대표적인 방식이 있습니다.

- <a id="g-call-by-name"></a>**이름에 의한 호출**(call-by-name, CBN)
- <a id="g-call-by-need"></a>**필요에 의한 호출**(call-by-need, CBN')

이 장의 목표는 \\(\textsf{FAE}\\)를 지연 계산 언어 \\(\textsf{LFAE}\\)로 확장하면서 인터프리터와 자연 의미(natural semantics)를 함께 정의하고, 마지막에 두 지연 계산 방식의 차이를 살펴보는 것입니다.

## 지연 계산이란

지금까지 우리가 정의한 언어는 모두 즉시 계산을 따랐습니다. 어떤 식이 실제로 필요한지 따지지 않고 만나는 대로 계산합니다. 다음 두 \\(\textsf{FAE}\\) 프로그램을 봅시다. (`val`은 문법 설탕으로 지원한다고 가정합니다.)

```fae
/* FAE */
val x = 1 + 2;
val y = z + 3;                // error -- free identifier: z
x * 2
```

마지막 줄은 `x`만 쓰고 `y`는 전혀 쓰지 않습니다. 그런데도 `z + 3`을 계산하다가 자유 식별자 `z` 때문에 오류가 납니다. 다음 예는 오류는 아니지만 답답합니다.

```fae
/* FAE */
val f = x => y => x * 2;
f(1 + 2)(1 * 2 * ... * 10000000)  // too slow -- unnecessary computation
```

`f`는 두 번째 인자 `y`를 쓰지 않는데도, 천만까지 곱하는 거대한 계산을 꼬박 다 하고 나서야 결과를 돌려줍니다.

만약 식의 계산을 그 결과가 **쓰일 때까지 미룰** 수 있다면, 이런 불필요한 계산과 오류를 모두 피할 수 있습니다. 이것이 바로 **지연 계산**입니다.

### Scala의 지연 계산

Scala는 두 곳에서 지연 계산을 지원합니다. 첫째, 변경 불가능한 변수(`val`) 앞에 `lazy` 키워드를 붙이면 됩니다.

```scala
val x = 1 + 2;
lazy val y = 5 / 0        // delay its evaluation until `y` is used
x * 2                     // 6
```

둘째, 매개변수의 타입 앞에 `=>`를 붙이면 그 인자는 쓰일 때까지 계산되지 않습니다.

```scala
// delay the evaluation of the second argument until `y` is used
def f(x: Int, y: => Int): Int = x * 2

f(1 + 2, { Thread.sleep(5000); 42 })  // 6
```

첫 번째 예에서 0으로 나누는 `5 / 0`은 변수 `y`가 **쓰이지 않으므로** 아예 계산되지 않고, 오류도 나지 않습니다. 두 번째 예에서 5초가 걸리는 `{ Thread.sleep(5000); 42 }` 역시 매개변수 `y`가 쓰이지 않으므로 계산되지 않고, `6`이 곧바로 나옵니다.

### 지연 계산은 어디에 쓰일까

지연 계산은 생각보다 훨씬 많은 언어에, 여러 이유로 들어 있습니다.

<a id="g-short-circuit-evaluation"></a>**단락 계산**(short-circuit evaluation). 논리 연산에서 왼쪽 피연산자만 보고 결과가 정해지면 오른쪽은 계산하지 않습니다.

```scala
true  && ((5 / 0) < 1)        // error  -- division by zero
false && ((5 / 0) < 1)        // false  -- (5/0)<1 is not evaluated
true  || ((5 / 0) < 1)        // true   -- (5/0)<1 is not evaluated
false || ((5 / 0) < 1)        // error  -- division by zero
```

`false && ...`는 오른쪽이 무엇이든 `false`이고, `true || ...`는 오른쪽이 무엇이든 `true`이므로 오른쪽을 볼 필요가 없습니다. 한편 Scala의 `&`와 `|`는 `&&`, `||`와 비슷하지만 단락 계산을 하지 않습니다. 그래서 네 경우 모두 오류가 납니다.

```scala
true  & ((5 / 0) < 1)         // error  -- division by zero
false & ((5 / 0) < 1)         // error  -- division by zero
true  | ((5 / 0) < 1)         // error  -- division by zero
false | ((5 / 0) < 1)         // error  -- division by zero
```

C++, Java, Python, JavaScript, Scala 등 대부분의 언어가 논리 연산에 단락 계산을 지원합니다. `if (p != null && p.x > 0)` 같은 코드가 안전한 이유가 바로 이것입니다.

**최적화**. 필요 없는 계산을 건너뛰어 성능을 높일 수 있습니다.

```scala
def f(x: Int, y: => Int): Int = if (x < 0) 0 else x * y
f(42, { Thread.sleep(5000); 42 }) // second arg. is evaluated
f(-7, { Thread.sleep(5000); 42 }) // second arg. is NOT evaluated
```

사실 우리는 이미 인터프리터에서 지연 계산을 쓰고 있었습니다. `Map`의 `getOrElse` 메서드를 보세요.

```scala
// The definition of `getOrElse` method in `Map`
def getOrElse[V1 >: V](key: K, default: => V1): V1 = ...

// The implementation of interpreter
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Id(x) => env.getOrElse(x, error(s"free identifier: $x"))
```

두 번째 매개변수 `default`가 `=> V1` 타입이므로, `env`에 키 `x`가 있으면 `error(...)`는 계산되지 않습니다. 만약 즉시 계산이었다면 식별자를 찾을 때마다 무조건 오류가 났을 것입니다.

<a id="g-infinite-data-structure"></a>**무한 자료 구조**(infinite data structure). 지연 계산을 쓰면 무한히 긴 자료 구조를 정의하고 다룰 수 있습니다. Scala의 `LazyList`로 모든 자연수의 리스트를 만들어 봅시다.

```scala
val nats: LazyList[BigInt] = 0 #:: nats.map(_ + 1)
// nats = 0 #:: (... - [not yet eval])
```

`nats`는 "0 다음에 `nats`의 각 원소에 1을 더한 것이 오는 리스트"입니다. 자기 자신을 참조하지만, 꼬리 부분은 아직 계산되지 않은 채로 남아 있으므로 무한 루프에 빠지지 않습니다. 원소를 꺼내면 그 지점까지만 계산됩니다.

```scala
nats(3) // 3
// nats = 0 #:: 1 #:: 2 #:: 3 #:: (... - [not yet eval])
nats(1) // 1
// nats = 0 #:: 1 #:: 2 #:: 3 #:: (... - [not yet eval])
nats(4) // 4
// nats = 0 #:: 1 #:: 2 #:: 3 #:: 4 #:: (... - [not yet eval])
```

`nats(3)`을 부르면 앞의 네 원소가 계산되어 저장됩니다. 이어서 `nats(1)`을 부를 때는 이미 계산된 값을 그대로 쓰므로 아무것도 새로 계산하지 않고, `nats(4)`를 부르면 한 칸만 더 계산합니다. 이런 성질은 <a id="g-memoization"></a>메모이제이션(memoization) 같은 <a id="g-dynamic-programming"></a>**동적 계획법**(dynamic programming)이나, 끝없이 들어오는 데이터를 다루는 <a id="g-stream-processing"></a>**스트림 처리**(stream processing)에 유용합니다. Haskell 같은 함수형 언어는 아예 기본 계산 전략이 지연 계산이라서 이런 정의가 자연스럽습니다.

```haskell
-- Haskell
let nats = 0 : map (+1) nats
take 10 nats              -- [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
```

> **생각해 보기**: `nats`를 `LazyList` 대신 일반 `List`로 정의하면 어떻게 될까요? 왜 그럴까요?

## LFAE: 지연 계산을 하는 FAE

이제 \\(\textsf{FAE}\\)를 확장해 지연 계산을 지원하는 \\(\textsf{LFAE}\\)를 만들어 봅시다. 앞의 두 예제를 \\(\textsf{LFAE}\\)로 실행하면 결과가 달라져야 합니다.

```lfae
/* LFAE */
val x = 1 + 2;
val y = z + 3;
x * 2
// error (FAE) vs. 6 (LFAE)
```

```lfae
/* LFAE */
val f = x => y => x * 2;
f(1 + 2)(z + 3)
// error (FAE) vs. 6 (LFAE)
```

흥미롭게도 **문법은 전혀 바뀌지 않습니다**. 바뀌는 것은 의미뿐입니다. \\(\textsf{LFAE}\\)에서는 **인자 식**의 계산을, 그 값이 계산에 정말 **필요해질 때까지** 미루고 싶습니다. 또한 변경 불가능한 변수 `val`은 함수 정의와 함수 적용을 조합한 문법 설탕(syntactic sugar)으로 지원합니다. 즉 `val x = e; e'`은 `(x => e')(e)`이므로, 함수 적용의 인자 계산을 미루면 `val`의 초기화 식도 자연스럽게 미뤄집니다.

### 인터프리터와 자연 의미

\\(\textsf{LFAE}\\)를 위해 우리가 할 일은 두 가지입니다. 하나는 환경(environment)을 쓰는 **인터프리터**를 구현하는 것이고,

```scala
def interp(expr: Expr, env: Env): Value = ???
```

다른 하나는 환경을 쓰는 **자연 의미**를 정의하는 것입니다.

\\[
\boxed{\sigma \vdash e \Rightarrow v}
\\]

여기에 지연 계산을 위한 새로운 종류의 값, <a id="g-expression-value"></a>**식 값**(expression value)이 필요합니다. 식 값은 "아직 계산하지 않은 식"을 값처럼 들고 다니기 위한 장치입니다.

\\[
\begin{array}{lrrll}
\text{Values} & \mathbb{V} \ni v & ::= & n & (\texttt{NumV}) \\\\
& & \mid & \langle \lambda x.e, \sigma \rangle & (\texttt{CloV}) \\\\
& & \mid & \langle\mkern-3mu\langle e, \sigma \rangle\mkern-3mu\rangle & (\texttt{ExprV})
\end{array}
\\]

```scala
enum Value:
  case NumV(n: BigInt)
  case CloV(p: String, b: Expr, e: Env)
  case ExprV(e: Expr, env: Env)  // for lazy evaluation
```

식 값에는 식만이 아니라 **환경도 함께** 넣어야 올바르게 계산할 수 있습니다. 왜 그런지 예를 봅시다.

```lfae
/* LFAE */
val y = 3;
// [ y -> 3 ]
val inc = x => {
  // [ x -> y * 2, y -> 3 ]
  x + 1     // (3 * 2) + 1 = 7
};
val y = 5;
// [ y -> 5 ]
inc(y * 2)
```

만약 인자 식 `y * 2`만 넘긴다면, `inc`의 본문에서 `x`를 계산할 때 `y`는 `inc`가 정의될 당시의 환경에서 찾아져 `3`이 되고 결과는 `7`이 됩니다. 하지만 `inc(y * 2)`를 쓴 곳에서 `y`는 분명히 `5`였습니다. 정적 스코핑(static scoping)을 지키려면 인자 식이 **쓰인 곳의 환경**도 함께 넘겨야 합니다.

```lfae
/* LFAE */
val y = 3;
// [ y -> 3 ]
val inc = x => {
  // [ x -> (y * 2, [ y -> 5 ]), y -> 3 ]
  x + 1     // (5 * 2) + 1 = 11
};
val y = 5;
// [ y -> 5 ]
inc(y * 2)
```

즉, 클로저(closure)가 함수 정의 시점의 환경을 붙잡아 두듯, 식 값도 인자 식이 등장한 시점의 환경을 붙잡아 두어야 합니다. 식 값 \\(\langle\mkern-3mu\langle e, \sigma \rangle\mkern-3mu\rangle\\)은 "환경 \\(\sigma\\)에서 \\(e\\)를 계산하라"는 미뤄 둔 약속이라고 생각하면 됩니다.

<div style="text-align:center">
<svg viewBox="0 0 620 165" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="inc 본문의 환경에서 x는 식 값을 가리키고, 식 값은 식 y * 2와 인자를 쓴 곳의 환경 [y ↦ 5]를 함께 담고 있다. x가 필요해지면 y * 2를 [y ↦ 5]에서 계산해 10을 얻는다" font-family="sans-serif" fill="currentColor">
<defs><marker id="lfae-f1-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="85" y="26" text-anchor="middle" fill="currentColor" font-size="14">inc 본문의 환경</text>
<rect x="10" y="38" width="150" height="74" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="30" y="66" text-anchor="start" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">x ↦</text>
<circle cx="82" cy="61" r="4.5" fill="currentColor"/>
<text x="30" y="98" text-anchor="start" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">y ↦ 3</text>
<text x="325" y="26" text-anchor="middle" fill="currentColor" font-size="14">식 값</text>
<rect x="240" y="40" width="170" height="42" fill="#2a408e"/>
<text x="250" y="66" text-anchor="start" fill="#fff" font-size="14" font-family="ui-monospace, Menlo, monospace">⟨⟨ y * 2,</text>
<circle cx="350" cy="61" r="4.5" fill="#fff"/>
<text x="374" y="66" text-anchor="start" fill="#fff" font-size="14" font-family="ui-monospace, Menlo, monospace">⟩⟩</text>
<text x="530" y="26" text-anchor="middle" fill="currentColor" font-size="14">인자를 쓴 곳의 환경</text>
<rect x="470" y="40" width="120" height="42" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="66" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">[y ↦ 5]</text>
<path d="M86,61 L237,61" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#lfae-f1-m0)"/>
<path d="M354,61 L467,61" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#lfae-f1-m0)"/>
<path d="M325,82 L325,120" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#lfae-f1-m0)"/>
<text x="325" y="142" text-anchor="middle" fill="currentColor" font-size="13">x가 필요해지면 [y ↦ 5]에서 y * 2를 계산 → 10</text>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 식 값은 식과 함께 그 식이 쓰인 곳의 환경을 붙잡아 둡니다. 본문의 <code>y ↦ 3</code>은 <code>inc</code>가 정의될 때의 환경에서 온 것입니다.</p>

### 함수 적용

먼저 즉시 계산을 하는 \\(\textsf{FAE}\\)의 함수 적용을 떠올려 봅시다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case App(f, e) => interp(f, env) match
    case CloV(p, b, fenv) => interp(b, fenv + (p -> interp(e, env)))
    case v                => error(s"not a function: ${v.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \langle \lambda x.e_2, \sigma' \rangle$}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1$}
\AxiomC{$\sigma'[x \mapsto v_1] \vdash e_2 \Rightarrow v_2$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\sigma \vdash e_0(e_1) \Rightarrow v_2$}
\end{prooftree}
\\]

우리는 인자 식 \\(e_1\\)의 계산을, 본문 \\(e_2\\)에서 매개변수 \\(x\\)가 쓰일 때까지 미루고 싶습니다. 그래서 \\(e_1\\)을 계산하는 대신 식 값 \\(\langle\mkern-3mu\langle e_1, \sigma \rangle\mkern-3mu\rangle\\)로 감싸서 매개변수에 묶습니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case App(f, e) => interp(f, env) match
    case CloV(p, b, fenv) => interp(b, fenv + (p -> ExprV(e, env)))
    case v                => error(s"not a function: ${v.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \langle \lambda x.e_2, \sigma' \rangle$}
\AxiomC{$\sigma'[x \mapsto \langle\mkern-3mu\langle e_1, \sigma \rangle\mkern-3mu\rangle] \vdash e_2 \Rightarrow v_2$}
\LeftLabel{$\texttt{App}$}
\BinaryInfC{$\sigma \vdash e_0(e_1) \Rightarrow v_2$}
\end{prooftree}
\\]

그렇다면 미뤄 둔 식은 **언제** 계산될까요? 이것은 언어 설계자가 정하기 나름입니다. \\(\textsf{LFAE}\\)에서는 그 값이 **계산에 정말 필요할 때** 인자 식을 계산하기로 합니다.

### 값의 엄격한 계산

덧셈을 예로 들어 봅시다. \\(\textsf{FAE}\\)의 덧셈은 이렇게 생겼습니다.

```scala
type BOp[T] = (T, T) => T
def numBOp(op: BOp[BigInt], x: String): BOp[Value] = (l, r) =>
  (l, r) match
    case (NumV(l), NumV(r)) => NumV(op(l, r))
    case (l, r) => error(s"invalid operation: ${l.str} $x ${r.str}")
val numAdd: BOp[Value] = numBOp(_ + _, "+")

def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Add(l, r) => numAdd(interp(l, env), interp(r, env))
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma \vdash e_1 \texttt{ + } e_2 \Rightarrow n_1 + n_2$}
\end{prooftree}
\\]

\\(\textsf{LFAE}\\)에서도 이대로 괜찮을까요? 아닙니다. \\(e_1\\)이나 \\(e_2\\)를 계산한 결과가 식 값일 수 있기 때문입니다. 예를 들어 `(x => x + 1)(2)`에서 `x`를 계산하면 숫자 `2`가 아니라 식 값 \\(\langle\mkern-3mu\langle 2, \varnothing \rangle\mkern-3mu\rangle\\)이 나옵니다. 덧셈을 하려면 이 식 값을 실제로 계산해 숫자를 얻어야 합니다.

이를 위해 값의 <a id="g-strict-evaluation"></a>**엄격한 계산**(strict evaluation)을 정의합니다. 엄격한 계산은

1. 식 값이면 그 식을 계산해 실제 값을 얻고,
2. 그 밖의 값이면 그 값 자체를 돌려줍니다.

\\[
\boxed{v \Downarrow v}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e \Rightarrow v$}
\AxiomC{$v \Downarrow v'$}
\LeftLabel{$\texttt{StrictExpr}$}
\BinaryInfC{$\langle\mkern-3mu\langle e, \sigma \rangle\mkern-3mu\rangle \Downarrow v'$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{StrictNum}$}
\UnaryInfC{$n \Downarrow n$}
\end{prooftree}
\qquad\qquad
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{StrictClo}$}
\UnaryInfC{$\langle \lambda x.e, \sigma \rangle \Downarrow \langle \lambda x.e, \sigma \rangle$}
\end{prooftree}
\\]

`StrictExpr` 규칙에서 식 값 \\(\langle\mkern-3mu\langle e, \sigma \rangle\mkern-3mu\rangle\\)을 계산한 결과 \\(v\\)가 **또 식 값일 수 있다**는 점에 주의하세요. 예를 들어 \\(e\\)가 그냥 식별자이고 그 식별자가 식 값에 묶여 있다면 그렇습니다. 그래서 실제 값(숫자나 클로저)이 나올 때까지 재귀적으로 엄격한 계산을 반복합니다. 구현은 이 규칙을 그대로 옮긴 것입니다.

```scala
def strict(v: Value): Value = v match
  case ExprV(e, env) => strict(interp(e, env))
  case _             => v
```

### 덧셈과 곱셈

이제 덧셈의 두 피연산자 값에 엄격한 계산을 적용해 실제 값을 얻습니다.

```scala
type BOp[T] = (T, T) => T
def numBOp(op: BOp[BigInt], x: String): BOp[Value] = (l, r) =>
  (strict(l), strict(r)) match
    case (NumV(l), NumV(r)) => NumV(op(l, r))
    case (l, r) => error(s"invalid operation: ${l.str} $x ${r.str}")
val numAdd: BOp[Value] = numBOp(_ + _, "+")

def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Add(l, r) => numAdd(interp(l, env), interp(r, env))
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1 \quad v_1 \Downarrow n_1$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow v_2 \quad v_2 \Downarrow n_2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma \vdash e_1 \texttt{ + } e_2 \Rightarrow n_1 + n_2$}
\end{prooftree}
\\]

곱셈도 마찬가지로 두 피연산자 모두에 엄격한 계산을 합니다. `numBOp` 안에서 `strict`를 부르므로 `numMul`도 자동으로 그렇게 됩니다.

```scala
val numMul: BOp[Value] = numBOp(_ * _, "*")

def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Mul(l, r) => numMul(interp(l, env), interp(r, env))
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1 \quad v_1 \Downarrow n_1$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow v_2 \quad v_2 \Downarrow n_2$}
\LeftLabel{$\texttt{Mul}$}
\BinaryInfC{$\sigma \vdash e_1 \texttt{ \* } e_2 \Rightarrow n_1 \times n_2$}
\end{prooftree}
\\]

### 식별자 참조

식별자 참조는 바꿀 필요가 없습니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  case Id(x) => env.getOrElse(x, error(s"free identifier: $x"))
```

\\[
\begin{prooftree}
\AxiomC{$x \in \text{Dom}(\sigma)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma \vdash x \Rightarrow \sigma(x)$}
\end{prooftree}
\\]

식별자의 값이 식 값이어도 여기서는 엄격한 계산을 하지 않습니다. 식별자의 값을 다른 곳에 넘기기만 할 때는 그 실제 값을 알 필요가 없기 때문입니다. 예를 들어 `(x => (y => y)(x))(1 + 2)`에서 `x`를 그대로 `y`에 넘기는 동안에는 `1 + 2`를 계산할 이유가 없습니다.

### 함수 적용 다시 보기

함수 적용으로 돌아가 봅시다. 다음 예는 지금까지 만든 인터프리터에서 오류가 납니다.

```lfae
/* LFAE */
(f => f(1))(x => x+1) // error -- not a function (expression value in f)
```

왜 그럴까요? 인자 `x => x+1`이 계산되지 않은 채 식 값으로 넘어가므로, 본문에서 `f`의 값은 클로저가 아니라 식 값 \\(\langle\mkern-3mu\langle \lambda x.(x \texttt{ + } 1), \varnothing \rangle\mkern-3mu\rangle\\)입니다. 그런데 함수 적용은 함수 위치의 값이 `CloV`인지 확인하므로 "not a function" 오류가 납니다.

함수를 호출하려면 함수가 **무엇인지** 정말 알아야 합니다. 즉, 함수 위치의 값은 계산에 필요한 값입니다. 따라서 함수 식의 값에도 엄격한 계산을 해야 합니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case App(f, e) => strict(interp(f, env)) match
    case CloV(p, b, fenv) => interp(b, fenv + (p -> ExprV(e, env)))
    case v                => error(s"not a function: ${v.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow v_0$}
\AxiomC{$v_0 \Downarrow \langle \lambda x.e_2, \sigma' \rangle$}
\AxiomC{$\sigma'[x \mapsto \langle\mkern-3mu\langle e_1, \sigma \rangle\mkern-3mu\rangle] \vdash e_2 \Rightarrow v_2$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\sigma \vdash e_0(e_1) \Rightarrow v_2$}
\end{prooftree}
\\]

```lfae
/* LFAE */
(f => f(1))(x => x+1) // 2
```

정리하면, \\(\textsf{LFAE}\\)에서 미뤄 둔 식이 실제로 계산되는 곳은 **덧셈과 곱셈의 피연산자**, 그리고 **함수 적용의 함수 위치** 세 군데뿐입니다. 이 밖의 곳에서는 식 값을 그대로 들고 다닙니다.

> **자주 하는 실수**: 프로그램 전체의 결과가 식 값일 수도 있습니다. 예를 들어 `(x => x)(1 + 2)`의 결과는 \\(\langle\mkern-3mu\langle 1 \texttt{ + } 2, \varnothing \rangle\mkern-3mu\rangle\\)입니다. 사용자에게 `3`을 보여 주고 싶다면 맨 바깥에서 한 번 더 `strict`를 불러야 합니다.

> **생각해 보기**: 덧셈의 왼쪽 피연산자도 오류를 내는 식 값이고 오른쪽도 오류를 내는 식 값이라면, 어느 쪽 오류가 먼저 날까요? `numBOp`의 `(strict(l), strict(r))`를 보고 답해 보세요.

## 이름에 의한 호출과 필요에 의한 호출

지연 계산에는 두 가지 방식이 있습니다.

**이름에 의한 호출**(CBN)은 미뤄 둔 식이 여러 번 쓰이면 **쓰일 때마다 매번** 계산합니다. Scala에서 `=>`를 붙인 매개변수가 이렇게 동작합니다.

```scala
def inc(x: Int): Int = { println("inc"); x + 1 }
def mul5(x: => Int): Int = x + x + x + x + x
mul5(inc(1))        // 10 and prints "inc" 5 times
```

**필요에 의한 호출**(CBN')은 CBN을 **메모이제이션**한 버전입니다. 미뤄 둔 식을 처음 쓰일 때 **한 번만** 계산하고, 그 뒤로는 결과를 **재사용**합니다. Scala의 `lazy val`이 이렇게 동작합니다. 앞에서 본 `LazyList`의 원소도 마찬가지입니다.

```scala
def inc(x: Int): Int = { println("inc"); x + 1 }
lazy val x: Int = inc(1)
x + x + x + x + x   // 10 and prints "inc" only once
```

부작용이 없는 순수 함수형 언어에서는 CBN'과 CBN이 **똑같은 결과**를 냅니다. 같은 식은 몇 번을 계산해도 같은 값이 나오기 때문입니다. 이때 CBN'은 불필요한 재계산을 피하는 **성능상 이점**만 있습니다. Haskell이 CBN'을 택한 이유입니다.

하지만 **변경**(mutation)이 있으면 이야기가 달라집니다. CBN'은 함수 인자를 처음 쓰일 때 **한 번만** 계산하므로, 계산할 때마다 상태가 바뀌는 식에서는 결과가 달라질 수 있습니다.

```scala
var count: Int = 0
def get: Int = { count += 1; count }
def f(x: => Int): Int = { x + x + x }   // Call-by-Name
f(get)                                  // 1 + 2 + 3 = 6
```

```scala
var count: Int = 0
def get: Int = { count += 1; count }
lazy val x: Int = get                   // Call-by-Need
x + x + x                               // 1 + 1 + 1 = 3
```

CBN에서는 `x`를 쓸 때마다 `get`이 다시 불려 `count`가 1, 2, 3으로 늘어나지만, CBN'에서는 처음 한 번만 불리고 그 결과 `1`이 세 번 재사용됩니다.

<div style="text-align:center">
<svg viewBox="0 0 640 245" width="100%" style="max-width: 620px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="이름에 의한 호출에서는 x를 쓸 때마다 get을 실행해 1, 2, 3을 얻어 합이 6이다. 필요에 의한 호출에서는 처음 한 번만 get을 실행하고 결과 1을 캐시에 저장해 재사용하므로 합이 3이다" font-family="sans-serif" fill="currentColor">
<defs><marker id="lfae-f2-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="155" y="22" text-anchor="middle" fill="currentColor" font-size="15" font-weight="bold">이름에 의한 호출 (CBN)</text>
<rect x="90" y="40" width="130" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="155" y="65" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">⟨⟨get, σ⟩⟩</text>
<text x="55" y="192" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.8">첫째 x</text>
<rect x="25" y="140" width="60" height="34" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="55" y="163" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<text x="155" y="192" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.8">둘째 x</text>
<rect x="125" y="140" width="60" height="34" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="155" y="163" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">2</text>
<text x="255" y="192" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.8">셋째 x</text>
<rect x="225" y="140" width="60" height="34" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="255" y="163" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<path d="M120,80 L62,137" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#lfae-f2-m0)"/>
<path d="M155,80 L155,137" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#lfae-f2-m0)"/>
<path d="M190,80 L248,137" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#lfae-f2-m0)"/>
<text x="82" y="108" text-anchor="end" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">get</text>
<text x="160" y="112" text-anchor="start" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">get</text>
<text x="228" y="108" text-anchor="start" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">get</text>
<text x="155" y="228" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">1 + 2 + 3 = 6</text>
<path d="M320,40 L320,225" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/>
<text x="485" y="22" text-anchor="middle" fill="currentColor" font-size="15" font-weight="bold">필요에 의한 호출 (CBN′)</text>
<rect x="390" y="40" width="190" height="40" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="442" y="65" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">⟨⟨get, σ⟩⟩</text>
<rect x="495" y="40" width="85" height="40" fill="#2a408e"/>
<text x="537" y="65" text-anchor="middle" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">Some(1)</text>
<text x="537" y="96" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.8">캐시</text>
<text x="385" y="192" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.8">첫째 x</text>
<rect x="355" y="140" width="60" height="34" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="385" y="163" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<text x="485" y="192" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.8">둘째 x</text>
<rect x="455" y="140" width="60" height="34" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="485" y="163" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<text x="585" y="192" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.8">셋째 x</text>
<rect x="555" y="140" width="60" height="34" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="585" y="163" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<path d="M430,80 L390,137" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#lfae-f2-m0)"/>
<path d="M520,102 L490,137" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#lfae-f2-m0)"/>
<path d="M555,102 L580,137" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#lfae-f2-m0)"/>
<text x="404" y="108" text-anchor="end" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">get</text>
<text x="485" y="228" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">1 + 1 + 1 = 3</text>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: <code>x + x + x</code>에서 CBN은 <code>x</code>를 쓸 때마다 <code>get</code>을 다시 실행하고, CBN′은 처음 결과를 캐시에 넣어 재사용합니다.</p>

### 필요에 의한 호출 인터프리터

지금까지 만든 \\(\textsf{LFAE}\\)는 CBN 방식입니다. `strict`가 식 값을 만날 때마다 `interp`로 다시 계산하기 때문입니다. 이것을 CBN' 방식으로 바꾸기는 어렵지 않습니다. 식 값에 계산 결과를 저장해 둘 칸을 하나 추가하면 됩니다.

```scala
enum Value:
  ...
  case ExprV(e: Expr, env: Env, var value: Option[Value]) // For caching
def strict(v: Value): Value = v match
  case ev @ ExprV(e, env, cached) => cached match
    case Some(cache) => cache               // Reuse cached value
    case None =>                            // The first use
      val cache = strict(interp(e, env))    // Evaluate the expression
      ev.value = Some(cache)                // Cache the value
      cache                                 // Return the value
  case _ => v
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case App(f, e) => strict(interp(f, env)) match
    // Initialize `value` with `None` to represent no caching
    case CloV(p,b,fenv) => interp(b, fenv + (p -> ExprV(e, env, None)))
    case v              => error(s"not a function: ${v.str}")
```

`value` 필드는 처음에 `None`이어서 "아직 계산하지 않음"을 뜻합니다. `strict`가 처음 이 식 값을 만나면 식을 계산하고, 그 결과를 `value`에 `Some(...)`으로 저장합니다. 두 번째부터는 저장된 값을 그대로 돌려줍니다. 식 값이 환경을 통해 여러 곳에서 공유되더라도 같은 객체를 가리키므로 캐시도 함께 공유됩니다.

> **생각해 보기**: \\(\textsf{LFAE}\\)에는 변경 가능한 상태가 없습니다. 그렇다면 CBN 인터프리터와 CBN' 인터프리터가 다른 결과를 내는 \\(\textsf{LFAE}\\) 프로그램이 있을까요? 실행 시간은 어떨까요?

## 정리

- **즉시 계산**(CBV, CBR)은 인자를 미리 계산하고, **지연 계산**은 결과가 필요해질 때까지 계산을 미룹니다. 지연 계산은 불필요한 계산과 오류를 피하게 해 주며, 단락 계산, 최적화(`getOrElse`의 `default`), 무한 자료 구조(`LazyList`)에 쓰입니다.
- Scala는 `lazy val`과 `=>` 매개변수로 지연 계산을 지원합니다.
- \\(\textsf{LFAE}\\)는 \\(\textsf{FAE}\\)와 문법이 같고 의미만 다릅니다. 함수 적용에서 인자를 계산하지 않고 **식 값** \\(\langle\mkern-3mu\langle e, \sigma \rangle\mkern-3mu\rangle\\)으로 감싸서 넘기며, 정적 스코핑을 위해 환경도 함께 저장합니다.
- 값이 정말 필요한 곳(덧셈, 곱셈의 피연산자, 함수 적용의 함수 위치)에서는 **엄격한 계산** \\(v \Downarrow v'\\)으로 실제 값(숫자나 클로저)을 얻습니다. 식 값의 결과가 다시 식 값일 수 있으므로 재귀적으로 계산합니다.
- **이름에 의한 호출**(CBN)은 미룬 식을 쓸 때마다 계산하고, **필요에 의한 호출**(CBN')은 처음 한 번만 계산해 결과를 재사용합니다. 순수한 언어에서는 결과가 같지만, 변경이 있으면 달라질 수 있습니다.
- 식 값에 캐시 칸(`var value: Option[Value]`)을 추가하면 CBN 인터프리터를 CBN' 인터프리터로 바꿀 수 있습니다.

## 연습 문제

1. 다음 \\(\textsf{LFAE}\\) 식의 결과를 구하세요. 결과가 식 값이면 그 식 값을 그대로 쓰세요.
   - `(x => 42)(1(2))`
   - `(x => y => x)(1 + 2)(z)`
   - `(x => x)(1 + 2)`
   - `(f => f(f))(x => 7)`
2. `(x => x + x)((y => y * 2)(3))`을 CBN과 CBN'으로 각각 계산할 때, 곱셈 `y * 2`가 몇 번 계산되는지 세어 보세요.
3. \\(\textsf{LFAE}\\)에 조건식 `if0 e1 e2 e3`(e1의 값이 0이면 e2, 아니면 e3)을 추가하려고 합니다. 자연 의미 규칙과 `interp`의 해당 경우를 쓰세요. 어떤 하위 식에 엄격한 계산이 필요한가요?
4. 엄격한 계산 규칙 `StrictExpr`에서 두 번째 전제 \\(v \Downarrow v'\\)을 빼고 결과를 \\(v\\)로 두면 어떤 프로그램이 잘못 동작하는지 예를 들어 보세요.
5. 강의 연습 과제 **LFAE**(`lfae`)의 `interp` 함수를 직접 구현해 보세요.
