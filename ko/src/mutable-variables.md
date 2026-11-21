# 변경 가능한 변수

[변경 가능한 자료 구조](./mutable-data-structures.md)에서는 변경(mutation)을 통해 프로그램의 **상태를 바꾸는** 첫 번째 방법으로 상자(box)를 배웠습니다. 상자라는 자료 구조의 **내용물**을 바꾸는 방식이었지요. 그리고 이를 지원하는 언어 BFAE를 정의하면서 **메모리(memory)** 를 이용해 계산하는 법, 그리고 메모리를 주고받는 인터프리터와 자연 의미(natural semantics)를 함께 살펴보았습니다.

이 장에서는 상태를 바꾸는 두 번째 방법인 **변경 가능한 변수(mutable variable)** 를 다룹니다. 상자 없이 변수 자체에 새 값을 대입하는 것입니다. FAE에 변경 가능한 변수를 더한 언어 MFAE를 정의하고, 그 구체 문법과 추상 문법, 인터프리터와 자연 의미를 차례로 만들어 봅니다. 마지막으로 함수에 인자를 넘기는 두 가지 방식인 <a id="g-call-by-value"></a>**값에 의한 호출(call-by-value)** 과 <a id="g-call-by-reference"></a>**참조에 의한 호출(call-by-reference)** 을 비교합니다. 둘의 차이는 변수를 바꿀 수 있을 때 비로소 눈에 보이기 시작합니다.

## 변경 가능한 변수란

**변경 가능한 변수**는 초기화한 뒤에도 값을 바꿀 수 있는 변수입니다. Scala에서는 `val` 대신 `var`로 변수를 정의하면 됩니다.

```scala
// A mutable variable `x` of type `Int` initialized with 1
var x: Int = 1
x + 2            // 1 + 2 == 3 : Int

// We can reassign a mutable variable `x`
x = 2            // x == 2
x + 2            // 2 + 2 == 4 : Int

// The function `f` is impure because it uses a mutable variable `y`
var y: Int = 1
def f(x: Int): Int = x + y
f(5)             // 5 + 1 == 6 : Int
y = 3
f(5)             // 5 + 3 == 8 : Int
```

똑같은 식 `x + 2`가 언제 계산하느냐에 따라 3이 되기도 하고 4가 되기도 합니다. 함수 `f`도 마찬가지입니다. `f(5)`를 두 번 불렀는데 결과가 6과 8로 다릅니다. `f`의 몸통이 바깥의 변경 가능한 변수 `y`를 읽기 때문입니다. 이렇게 같은 인자에 대해 항상 같은 결과를 낸다고 보장할 수 없는 함수를 <a id="g-impure"></a>**순수하지 않은(impure)** 함수라고 부릅니다.

## MFAE: 변경 가능한 변수를 더한 FAE

이제 FAE를 확장해 변경 가능한 변수를 지원하는 MFAE를 만들어 봅시다. 먼저 MFAE 프로그램이 어떻게 생겼는지 보겠습니다.

```mfae
/* MFAE */
var x = 5;
x;        // 5
x = 8;
x         // 8
```

```mfae
/* MFAE */
var y = 1;
var f = x => { x = x + y; x * x };
f(5);    // (5 + 1) * (5 + 1) = 36
y = 3;
f(5)     // (5 + 3) * (5 + 3) = 64
```

두 번째 예에서 눈여겨볼 점이 두 가지 있습니다. 첫째, 함수 몸통에서 **매개변수 `x`에도 대입**을 합니다. MFAE에서는 `var`로 정의한 변수뿐 아니라 매개변수를 포함한 **모든 변수가 변경 가능**합니다. 둘째, 앞의 Scala 예처럼 `f(5)`의 결과가 바깥 변수 `y`의 현재 값에 따라 달라집니다.

MFAE를 위해 FAE의 식에 다음 세 가지를 더합니다.

1. 변경할 수 없는 변수(`val`) 대신 **변경 가능한 변수**(`var`)의 정의. 앞서 말했듯 MFAE에서는 매개변수까지 포함해 모든 변수가 변경 가능합니다.
2. <a id="g-assignment"></a>**대입(assignment)** `=`. 대입은 오른쪽 결합입니다. 즉 `x = y = e`는 `x = (y = e)`와 같습니다.
3. 식의 **순차 실행(sequence)** `;`.

### 구체 문법

MFAE의 구체 문법(concrete syntax)을 BNF로 쓰면 다음과 같습니다. FAE의 식에 세 가지 경우가 더해졌습니다.

```bnf
// expressions
<expr> ::= ...
         | "var" <id> "=" <expr> ";" <expr>   // variable definition
         | <id> "=" <expr>                    // assignment
         | <expr> ";" <expr>                  // sequence
```

### 추상 문법

추상 문법(abstract syntax)은 다음과 같습니다.

\\[
\begin{array}{lrcll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots & \\\\
& & \mid & \texttt{var}\ x\ \texttt{=}\ e;\ e & (\texttt{Var}) \\\\
& & \mid & x\ \texttt{=}\ e & (\texttt{Assign}) \\\\
& & \mid & e;\ e & (\texttt{Seq})
\end{array}
\\]

이를 Scala의 대수적 데이터 타입으로 옮기면 다음과 같습니다.

```scala
enum Expr:
  ...
  // mutable variable definition
  case Var(name: String, init: Expr, body: Expr)
  // variable assignment
  case Assign(name: String, expr: Expr)
  // sequence
  case Seq(left: Expr, right: Expr)
```

`Var(name, init, body)`는 `init`의 값으로 변수 `name`을 만든 뒤 그 변수를 쓸 수 있는 범위인 `body`를 계산합니다. `Assign(name, expr)`은 `expr`의 값을 변수 `name`에 대입하고, `Seq(left, right)`는 `left`를 먼저 계산하고 이어서 `right`를 계산합니다.

## MFAE의 인터프리터와 자연 의미

### 메모리를 이용한 계산

변수의 값을 바꾸려면 어떻게 해야 할까요? 지금까지 환경(environment) \\( \sigma \\)는 이름을 **값**에 직접 연결했습니다. 그런데 정적 스코핑(static scoping)을 따르는 언어에서는 함수가 만들어질 때의 환경이 클로저 안에 그대로 갇혀 버립니다. 이름이 값에 직접 묶여 있으면, `y = 3`을 실행해도 이미 만들어진 클로저 안의 `y`는 여전히 1을 가리킬 것입니다.

해결책은 BFAE에서 상자를 다룰 때 썼던 메모리를 다시 꺼내는 것입니다. 각 변수에 서로 다른 **주소(address)** 를 하나씩 정해 환경에는 이름에서 주소로 가는 연결만 적고, 실제 값은 **메모리**의 그 주소에 저장합니다. 이렇게 하면 변수에 대입할 때 환경은 그대로 두고 메모리에서 그 주소의 내용만 바꾸면 됩니다. 같은 주소를 기억하는 모든 곳이 바뀐 값을 보게 되지요.

첫 번째 예를 한 줄씩 따라가 봅시다. 처음에는 환경과 메모리가 모두 비어 있습니다.

```mfae
/* MFAE */
var x = 5;
x;
x = 8;
x
```

| 실행한 줄 | 환경 \\( \sigma \\) | \\( a_0 \\) | 결과 |
|---|---|---|---|
| (시작) | \\( [] \\) | | |
| `var x = 5;` | \\( [\texttt{x} \mapsto a_0] \\) | **5** | |
| `x;` | \\( [\texttt{x} \mapsto a_0] \\) | 5 | 5 |
| `x = 8;` | \\( [\texttt{x} \mapsto a_0] \\) | **8** | |
| `x` | \\( [\texttt{x} \mapsto a_0] \\) | 8 | 8 |

`var x = 5`는 새 주소 \\( a_0 \\)를 할당해 환경에 \\( \texttt{x} \mapsto a_0 \\)를 추가하고 메모리의 \\( a_0 \\)에 5를 씁니다. 이후 `x`를 읽을 때는 환경에서 주소 \\( a_0 \\)를 찾은 다음 메모리에서 그 주소의 값을 꺼냅니다. `x = 8`은 환경을 건드리지 않고 \\( a_0 \\)의 내용만 8로 바꿉니다.

이번에는 함수가 섞인 두 번째 예를 따라가 봅시다.

```mfae
/* MFAE */
var y = 1;
var f = x => {
  x = x + y;
  x * x
};
f(5);
y = 3;
f(5)
```

아래 표에서 \\( v \\)는 `f`에 저장된 클로저 \\( v = \langle \lambda \texttt{x}.(\texttt{x}\ \texttt{=}\ \texttt{x}\ \texttt{+}\ \texttt{y};\ \texttt{x} \ast \texttt{x}), [\texttt{y} \mapsto a_0] \rangle \\) 입니다. 굵은 글씨는 그 단계에서 새로 쓰인 칸입니다.

| 실행 중인 곳 | 환경 \\( \sigma \\) | \\( a_0 \\) | \\( a_1 \\) | \\( a_2 \\) | \\( a_3 \\) | 결과 |
|---|---|---|---|---|---|---|
| `var y = 1;` | \\( [\texttt{y} \mapsto a_0] \\) | **1** | | | | |
| `var f = ...;` | \\( [\texttt{y} \mapsto a_0, \texttt{f} \mapsto a_1] \\) | 1 | **\\( v \\)** | | | |
| 첫 `f(5)`로 들어감 | \\( [\texttt{y} \mapsto a_0, \texttt{x} \mapsto a_2] \\) | 1 | \\( v \\) | **5** | | |
| `x = x + y;` | \\( [\texttt{y} \mapsto a_0, \texttt{x} \mapsto a_2] \\) | 1 | \\( v \\) | **6** | | 5 + 1 |
| `x * x` | \\( [\texttt{y} \mapsto a_0, \texttt{x} \mapsto a_2] \\) | 1 | \\( v \\) | 6 | | 6 * 6 |
| `f(5);` 끝 | \\( [\texttt{y} \mapsto a_0, \texttt{f} \mapsto a_1] \\) | 1 | \\( v \\) | 6 | | 36 |
| `y = 3;` | \\( [\texttt{y} \mapsto a_0, \texttt{f} \mapsto a_1] \\) | **3** | \\( v \\) | 6 | | |
| 둘째 `f(5)`로 들어감 | \\( [\texttt{y} \mapsto a_0, \texttt{x} \mapsto a_3] \\) | 3 | \\( v \\) | 6 | **5** | |
| `x = x + y;` | \\( [\texttt{y} \mapsto a_0, \texttt{x} \mapsto a_3] \\) | 3 | \\( v \\) | 6 | **8** | 5 + 3 |
| `x * x` | \\( [\texttt{y} \mapsto a_0, \texttt{x} \mapsto a_3] \\) | 3 | \\( v \\) | 6 | 8 | 8 * 8 |
| `f(5)` 끝 | \\( [\texttt{y} \mapsto a_0, \texttt{f} \mapsto a_1] \\) | 3 | \\( v \\) | 6 | 8 | 64 |

<div style="text-align:center">
<svg viewBox="0 0 580 215" width="100%" style="max-width: 560px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="두 번째 예를 다 계산한 뒤의 환경과 메모리: y는 a0, f는 a1에 묶여 있고, a1의 클로저 v는 환경 [y ↦ a0]를 통해 a0을 가리킨다. a2와 a3은 아무도 가리키지 않는다" font-family="sans-serif" fill="currentColor">
<defs><marker id="mfae-f1-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="75" y="22" text-anchor="middle" fill="currentColor" font-size="15">환경 σ</text>
<rect x="10" y="40" width="130" height="95" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="30" y="75" text-anchor="start" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">y ↦ a<tspan baseline-shift="sub" font-size="72%">0</tspan></text>
<text x="30" y="112" text-anchor="start" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">f ↦ a<tspan baseline-shift="sub" font-size="72%">1</tspan></text>
<text x="385" y="22" text-anchor="middle" fill="currentColor" font-size="15">메모리 M</text>
<text x="255" y="44" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">0</tspan></text>
<rect x="220" y="52" width="70" height="40" fill="#2a408e"/>
<text x="255" y="78" text-anchor="middle" fill="#fff" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="335" y="44" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">1</tspan></text>
<rect x="300" y="52" width="70" height="40" fill="#2a408e"/>
<text x="335" y="78" text-anchor="middle" fill="#fff" font-size="15" font-family="ui-monospace, Menlo, monospace">v</text>
<text x="435" y="44" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">2</tspan></text>
<rect x="400" y="52" width="70" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.6"/>
<text x="435" y="78" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace" opacity="0.6">6</text>
<text x="515" y="44" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">3</tspan></text>
<rect x="480" y="52" width="70" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.6"/>
<text x="515" y="78" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace" opacity="0.6">8</text>
<text x="475" y="115" text-anchor="middle" fill="currentColor" font-size="13" opacity="0.8">아무도 가리키지 않음</text>
<path d="M92,70 L217,70" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f1-m0)"/>
<path d="M92,107 C190,130 300,128 320,95" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f1-m0)"/>
<rect x="260" y="160" width="160" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="340" y="183" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">⟨λx.…, [y ↦ a<tspan baseline-shift="sub" font-size="72%">0</tspan>]⟩</text>
<path d="M345,92 L345,157" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#mfae-f1-m0)"/>
<text x="352" y="132" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">v</text>
<path d="M260,178 C230,178 245,130 252,95" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f1-m0)"/>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 클로저 \( v \)는 값 1이 아니라 주소 \( a_0 \)를 기억하므로 <code>y = 3</code>을 봅니다. \( a_2 \), \( a_3 \)은 호출이 끝난 뒤 남은 칸입니다.</p>

몇 가지를 짚어 보겠습니다.

- 클로저 \\( v \\)가 기억하는 환경은 \\( [\texttt{y} \mapsto a_0] \\)입니다. 값 1이 아니라 **주소** \\( a_0 \\)를 기억하므로, 나중에 `y = 3`으로 \\( a_0 \\)의 내용이 바뀌면 클로저도 바뀐 값 3을 보게 됩니다. 그래서 두 번째 호출의 결과가 64입니다.
- 함수를 부를 때마다 매개변수 `x`에 **새 주소**(첫 호출은 \\( a_2 \\), 둘째 호출은 \\( a_3 \\))가 할당됩니다. 매개변수도 변경 가능한 변수이므로 `x = x + y`는 그 주소의 내용을 바꿉니다.
- 함수에서 빠져나오면 환경은 호출하기 전 상태로 돌아가지만 메모리는 그렇지 않습니다. 메모리에는 \\( a_2 \\)의 6과 \\( a_3 \\)의 8이 그대로 남아 있습니다. 이제 아무도 이 주소들을 가리키지 않는데도 말입니다. 이 문제는 다음 장 [쓰레기 수집](./garbage-collection.md)의 출발점이 됩니다.

> **생각해 보기** 만약 환경이 이름을 주소 대신 값에 직접 연결했다면 두 번째 `f(5)`의 결과는 무엇이었을까요? `y = 3`이라는 대입은 어떻게 처리해야 했을까요?

### 인터프리터와 자연 의미

MFAE의 인터프리터는 환경과 함께 **메모리**를 받고, 계산 결과로 값과 함께 **바뀐 메모리**를 돌려줍니다. BFAE의 인터프리터와 같은 모양입니다.

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = ???
```

달라진 것은 환경의 정의입니다. 환경은 이제 이름을 값이 아닌 **주소**로 연결합니다.

```scala
type Env  = Map[String, Addr]
type Addr = Int
type Mem  = Map[Addr, Value]
```

```scala
enum Value:
  case NumV(n: BigInt)
  case CloV(p: String, b: Expr, e: Env)
```

자연 의미도 마찬가지로 환경과 메모리를 받아 값과 메모리를 내놓는 꼴입니다.

\\[
\boxed{\sigma, M \vdash e \Rightarrow v, M}
\\]

\\[
\begin{array}{llcll}
\text{Environments} & \sigma & \in & \mathbb{X} \xrightarrow{\text{fin}} \mathbb{A} & (\texttt{Env}) \\\\
\text{Addresses} & a & \in & \mathbb{A} & (\texttt{Addr}) \\\\
\text{Memories} & M & \in & \mathbb{A} \xrightarrow{\text{fin}} \mathbb{V} & (\texttt{Mem})
\end{array}
\\]

여기서 \\( \xrightarrow{\text{fin}} \\)은 유한 부분 함수(finite partial function)을 뜻합니다. 숫자, 덧셈, 곱셈, 함수 정의는 BFAE에서처럼 메모리를 왼쪽에서 오른쪽으로 차례로 넘겨 주기만 하면 되므로, 아래에서는 새로 생기거나 달라지는 경우만 살펴보겠습니다.

### 변수 정의

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case Var(name, init, body) =>
    val (iv, imem) = interp(init, env, mem)
    val addr = malloc(imem)
    interp(body, env + (name -> addr), imem + (addr -> iv))
```

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow v_1, M_1$}
\AxiomC{$a \notin \text{Dom}(M_1)$}
\AxiomC{$\sigma[x \mapsto a], M_1[a \mapsto v_1] \vdash e_2 \Rightarrow v_2, M_2$}
\LeftLabel{$\texttt{Var}$}
\TrinaryInfC{$\sigma, M \vdash \texttt{var}\ x\ \texttt{=}\ e_1;\ e_2 \Rightarrow v_2, M_2$}
\end{prooftree}
\\]

초기값 \\( e_1 \\)을 계산해 \\( v_1 \\)과 메모리 \\( M_1 \\)을 얻은 뒤, \\( M_1 \\)에서 아직 쓰지 않은 주소 \\( a \\)를 하나 고릅니다. 그리고 환경에 \\( x \mapsto a \\)를, 메모리에 \\( a \mapsto v_1 \\)을 추가한 상태에서 몸통 \\( e_2 \\)를 계산합니다. 규칙에서 "\\( a \notin \text{Dom}(M_1) \\)"이라고만 적은 부분을 코드에서는 `malloc`이 맡습니다. 앞 장에서 배운 구현을 그대로 쓰면 됩니다. 메모리에서 가장 큰 주소보다 1 큰 주소를 돌려주고, 메모리가 비어 있으면 0을 돌려줍니다.

```scala
def malloc(mem: Mem): Addr = mem.keySet.maxOption.fold(0)(_ + 1)
```

### 식별자 참조

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case Id(name) => (mem(lookupId(env, name)), mem)

def lookupId(env: Env, name: String): Addr =
  env.getOrElse(name, error(s"free identifier: $name"))
```

\\[
\begin{prooftree}
\AxiomC{$x \in \text{Dom}(\sigma)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma, M \vdash x \Rightarrow M(\sigma(x)), M$}
\end{prooftree}
\\]

식별자를 읽는 일은 이제 두 단계입니다. 환경에서 주소 \\( \sigma(x) \\)를 찾고, 메모리에서 그 주소의 값 \\( M(\sigma(x)) \\)를 꺼냅니다. `lookupId`가 값이 아니라 `Addr`를 돌려준다는 점에 주의하세요. 이 주소는 아래의 대입에서도 다시 쓰입니다.

### 함수 호출

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case App(fun, arg) =>
    val (fv, fmem) = interp(fun, env, mem)
    fv match
      case CloV(param, body, fenv) =>
        val (av, amem) = interp(arg, env, fmem)
        val addr = malloc(amem)
        interp(body, fenv + (param -> addr), amem + (addr -> av))
      case _ =>
        error(s"not a function: ${fv.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow \langle \lambda x.e_3, \sigma' \rangle, M_1$}
\AxiomC{$\sigma, M_1 \vdash e_2 \Rightarrow v_2, M_2$}
\noLine
\BinaryInfC{$a \notin \text{Dom}(M_2) \qquad \sigma'[x \mapsto a], M_2[a \mapsto v_2] \vdash e_3 \Rightarrow v_3, M_3$}
\LeftLabel{$\texttt{App}$}
\UnaryInfC{$\sigma, M \vdash e_1(e_2) \Rightarrow v_3, M_3$}
\end{prooftree}
\\]

함수와 인자를 차례로 계산한 다음, 매개변수 \\( x \\)를 위한 **새 주소** \\( a \\)를 할당하고 거기에 인자 값 \\( v_2 \\)를 저장합니다. 그리고 클로저의 환경 \\( \sigma' \\)에 \\( x \mapsto a \\)를 더해 몸통을 계산합니다. 매개변수도 변수 정의처럼 새 주소를 받기 때문에, 몸통 안에서 매개변수에 대입할 수 있습니다. (전제가 넷이라 두 줄로 나누어 적었습니다.)

### 대입

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case Assign(name, expr) =>
    val (ev, emem) = interp(expr, env, mem)
    (ev, emem + (lookupId(env, name) -> ev))
```

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e \Rightarrow v, M'$}
\AxiomC{$x \in \text{Dom}(\sigma)$}
\LeftLabel{$\texttt{Assign}$}
\BinaryInfC{$\sigma, M \vdash x\ \texttt{=}\ e \Rightarrow v, M'[\sigma(x) \mapsto v]$}
\end{prooftree}
\\]

오른쪽 식 \\( e \\)를 계산해 \\( v \\)를 얻고, 환경에서 찾은 \\( x \\)의 주소 \\( \sigma(x) \\)에 \\( v \\)를 덮어씁니다. 대입식 자체의 값은 대입한 값 \\( v \\)입니다. 덕분에 `x = y = 3`처럼 대입을 이어 쓰면 `y = 3`의 값 3이 다시 `x`에 대입됩니다.

> **자주 하는 실수** 대입할 때 환경을 `env + (name -> ...)`처럼 고치려고 하면 안 됩니다. 환경은 이름과 주소의 연결일 뿐이고, 대입은 그 연결을 그대로 둔 채 **메모리**만 바꿉니다. 환경을 바꾸면 같은 주소를 기억하고 있는 클로저들이 바뀐 값을 보지 못합니다.

### 순차 실행

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case Seq(left, right) =>
    val (_, lmem) = interp(left, env, mem)
    interp(right, env, lmem)
```

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow v_1, M_1$}
\AxiomC{$\sigma, M_1 \vdash e_2 \Rightarrow v_2, M_2$}
\LeftLabel{$\texttt{Seq}$}
\BinaryInfC{$\sigma, M \vdash e_1;\ e_2 \Rightarrow v_2, M_2$}
\end{prooftree}
\\]

\\( e_1 \\)의 값 \\( v_1 \\)은 버리고 메모리 \\( M_1 \\)만 \\( e_2 \\)에 넘겨 줍니다. 앞의 식은 오직 메모리를 바꾸는 **부수 효과(side effect)** 를 위해 계산하는 셈입니다.

## 값에 의한 호출과 참조에 의한 호출

지금까지 정의한 MFAE의 의미는 **값에 의한 호출**(call-by-value, CBV) 전략을 따릅니다. 인자 식을 항상 먼저 계산하고, 그 결과 **값**을 매개변수의 새 주소에 복사해 넘기기 때문입니다.

하지만 MFAE의 의미를 다르게 정의할 수도 있습니다. **참조에 의한 호출**(call-by-reference, CBR) 전략에서는 인자 식이 식별자일 때 새 주소를 만들지 않고, 매개변수가 그 식별자의 **주소**를 그대로 가리키게 합니다. 둘의 차이를 두 변수의 값을 맞바꾸려는 다음 프로그램으로 확인해 봅시다.

```mfae
/* MFAE */
var f = x => y => {
  var t = x;
  x = y;
  y = t
};
var a = 3;
var b = 7;
f(a)(b); a; b
```

`f(a)(b)`를 실행하기 직전까지는 두 전략의 상태가 같습니다. 주소 \\( a_0 \\)에 `f`의 클로저, \\( a_1 \\)에 `a`의 값 3, \\( a_2 \\)에 `b`의 값 7이 있고, 환경은 \\( [\texttt{f} \mapsto a_0, \texttt{a} \mapsto a_1, \texttt{b} \mapsto a_2] \\)입니다. 이제 함수 몸통에 들어갈 때부터 갈라집니다.

**CBV**에서는 `a`와 `b`의 **값**이 매개변수의 새 주소 \\( a_3 \\), \\( a_4 \\)에 복사됩니다.

| 실행 중인 곳 | 환경 | \\( a_1 \\) | \\( a_2 \\) | \\( a_3 \\) | \\( a_4 \\) | \\( a_5 \\) |
|---|---|---|---|---|---|---|
| 몸통으로 들어감 | \\( [\texttt{x} \mapsto a_3, \texttt{y} \mapsto a_4] \\) | 3 | 7 | **3** | **7** | |
| `var t = x;` | \\( [\texttt{x} \mapsto a_3, \texttt{y} \mapsto a_4, \texttt{t} \mapsto a_5] \\) | 3 | 7 | 3 | 7 | **3** |
| `x = y;` | 위와 같음 | 3 | 7 | **7** | 7 | 3 |
| `y = t` | 위와 같음 | 3 | 7 | 7 | **3** | 3 |
| `a; b` | \\( [\texttt{f} \mapsto a_0, \texttt{a} \mapsto a_1, \texttt{b} \mapsto a_2] \\) | 3 | 7 | 7 | 3 | 3 |

함수 안에서는 `x`와 `y`의 값이 잘 바뀌었지만, 바뀐 것은 복사본이 있는 \\( a_3 \\), \\( a_4 \\)뿐입니다. 원래 변수 `a`와 `b`의 주소 \\( a_1 \\), \\( a_2 \\)는 건드리지 않았으므로 마지막 `a`는 3, `b`는 7 그대로입니다.

**CBR**에서는 인자가 식별자 `a`, `b`이므로 매개변수 `x`, `y`가 각각 `a`, `b`의 **주소** \\( a_1 \\), \\( a_2 \\)를 그대로 가리킵니다.

| 실행 중인 곳 | 환경 | \\( a_1 \\) | \\( a_2 \\) | \\( a_3 \\) |
|---|---|---|---|---|
| 몸통으로 들어감 | \\( [\texttt{x} \mapsto a_1, \texttt{y} \mapsto a_2] \\) | 3 | 7 | |
| `var t = x;` | \\( [\texttt{x} \mapsto a_1, \texttt{y} \mapsto a_2, \texttt{t} \mapsto a_3] \\) | 3 | 7 | **3** |
| `x = y;` | 위와 같음 | **7** | 7 | 3 |
| `y = t` | 위와 같음 | 7 | **3** | 3 |
| `a; b` | \\( [\texttt{f} \mapsto a_0, \texttt{a} \mapsto a_1, \texttt{b} \mapsto a_2] \\) | 7 | 3 | 3 |

이번에는 `x`에 대입하는 것이 곧 `a`에 대입하는 것이므로, 함수가 끝난 뒤 `a`는 7, `b`는 3으로 정말 맞바뀌어 있습니다. 또한 매개변수를 위한 주소를 새로 만들지 않아서 메모리도 덜 씁니다.

<div style="text-align:center">
<svg viewBox="0 0 640 262" width="100%" style="max-width: 620px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="y = t까지 실행한 뒤의 상태. 값에 의한 호출에서는 x, y가 복사본 a3, a4를 가리켜 a, b의 칸 a1, a2는 3과 7 그대로이다. 참조에 의한 호출에서는 a와 x가 a1을, b와 y가 a2를 함께 가리켜 a1은 7, a2는 3으로 바뀐다" font-family="sans-serif" fill="currentColor">
<defs><marker id="mfae-f2-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="150" y="22" text-anchor="middle" fill="currentColor" font-size="15" font-weight="bold">값에 의한 호출 (CBV)</text>
<rect x="170" y="44" width="60" height="32" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="200" y="66" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="240" y="65" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">1</tspan></text>
<rect x="170" y="86" width="60" height="32" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="200" y="108" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">7</text>
<text x="240" y="107" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">2</tspan></text>
<rect x="170" y="128" width="60" height="32" fill="#2a408e"/>
<text x="200" y="150" text-anchor="middle" fill="#fff" font-size="15" font-family="ui-monospace, Menlo, monospace">7</text>
<text x="240" y="149" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">3</tspan></text>
<rect x="170" y="170" width="60" height="32" fill="#2a408e"/>
<text x="200" y="192" text-anchor="middle" fill="#fff" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="240" y="191" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">4</tspan></text>
<rect x="170" y="212" width="60" height="32" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="200" y="234" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="240" y="233" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">5</tspan></text>
<text x="50" y="65" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">a</text>
<path d="M64,60 L167,60" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f2-m0)"/>
<text x="50" y="107" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">b</text>
<path d="M64,102 L167,102" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f2-m0)"/>
<text x="50" y="149" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<path d="M64,144 L167,144" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f2-m0)"/>
<text x="50" y="191" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">y</text>
<path d="M64,186 L167,186" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f2-m0)"/>
<text x="50" y="233" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">t</text>
<path d="M64,228 L167,228" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f2-m0)"/>
<path d="M320,40 L320,250" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/>
<text x="480" y="22" text-anchor="middle" fill="currentColor" font-size="15" font-weight="bold">참조에 의한 호출 (CBR)</text>
<rect x="500" y="62" width="60" height="32" fill="#2a408e"/>
<text x="530" y="84" text-anchor="middle" fill="#fff" font-size="15" font-family="ui-monospace, Menlo, monospace">7</text>
<text x="570" y="83" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">1</tspan></text>
<rect x="500" y="146" width="60" height="32" fill="#2a408e"/>
<text x="530" y="168" text-anchor="middle" fill="#fff" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="570" y="167" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">2</tspan></text>
<rect x="500" y="212" width="60" height="32" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="530" y="234" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="570" y="233" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">3</tspan></text>
<text x="380" y="60" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">a</text>
<path d="M394,55 L497,78" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f2-m0)"/>
<text x="380" y="105" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<path d="M394,100 L497,78" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f2-m0)"/>
<text x="380" y="145" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">b</text>
<path d="M394,140 L497,162" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f2-m0)"/>
<text x="380" y="190" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">y</text>
<path d="M394,185 L497,162" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f2-m0)"/>
<text x="380" y="233" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace">t</text>
<path d="M394,228 L497,228" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#mfae-f2-m0)"/>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: <code>y = t</code>까지 실행한 뒤. 색칠한 칸은 <code>x = y</code>와 <code>y = t</code>가 고친 칸입니다. CBV는 복사본을, CBR은 <code>a</code>와 <code>b</code>의 칸 자체를 고칩니다.</p>

### 참조에 의한 호출의 함수 호출

CBR 전략은 함수 호출의 인자가 식별자인 경우를 따로 처리하는 것으로 정의할 수 있습니다.

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case App(fun, arg) =>
    val (fv, fmem) = interp(fun, env, mem)
    fv match
      case CloV(param, body, fenv) => arg match
        case Id(name) =>
          val addr = lookupId(env, name)
          interp(body, fenv + (param -> addr), fmem)
        case _ => ...
      case _ => error(s"not a function: ${fv.str}")
    ...
```

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow \langle \lambda x'.e_2, \sigma' \rangle, M_1$}
\AxiomC{$x \in \text{Dom}(\sigma)$}
\AxiomC{$\sigma'[x' \mapsto \sigma(x)], M_1 \vdash e_2 \Rightarrow v_2, M_2$}
\LeftLabel{$\texttt{App}_x$}
\TrinaryInfC{$\sigma, M \vdash e_1(x) \Rightarrow v_2, M_2$}
\end{prooftree}
\\]

인자가 식별자 \\( x \\)이면 인자를 계산하지 않고, 매개변수 \\( x' \\)를 \\( x \\)의 주소 \\( \sigma(x) \\)에 묶습니다. 메모리에는 아무것도 추가하지 않습니다. 인자가 식별자가 아닌 경우(`case _ => ...`)는 원래의 \\( \texttt{App} \\) 규칙과 똑같이 처리합니다.

> **생각해 보기** CBR에서 `f(a)(a)`를 실행하면 어떻게 될까요? 매개변수 `x`와 `y`가 같은 주소를 가리키게 됩니다. 이렇게 한 메모리 칸을 여러 이름이 가리키는 현상을 별칭(aliasing)이라고 합니다. 그때 `a`의 최종 값을 직접 따라가 보세요.

## 정리

- **변경 가능한 변수**는 초기화한 뒤에도 값을 바꿀 수 있는 변수입니다. MFAE는 FAE에 변수 정의(\\( \texttt{Var} \\)), 대입(\\( \texttt{Assign} \\)), 순차 실행(\\( \texttt{Seq} \\))을 더한 언어이며, 매개변수를 포함한 모든 변수가 변경 가능합니다.

\\[
\begin{array}{lrcll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots & \\\\
& & \mid & \texttt{var}\ x\ \texttt{=}\ e;\ e & (\texttt{Var}) \\\\
& & \mid & x\ \texttt{=}\ e & (\texttt{Assign}) \\\\
& & \mid & e;\ e & (\texttt{Seq}) \\\\
\text{Environments} & \sigma & \in & \mathbb{X} \xrightarrow{\text{fin}} \mathbb{A} & (\texttt{Env}) \\\\
\text{Memories} & M & \in & \mathbb{A} \xrightarrow{\text{fin}} \mathbb{V} & (\texttt{Mem})
\end{array}
\\]

- 환경은 이름을 **주소**에, 메모리는 주소를 **값**에 연결합니다. 변수를 정의하거나 함수를 호출할 때 새 주소를 할당하고(\\( \texttt{Var} \\), \\( \texttt{App} \\)), 변수를 읽을 때는 \\( M(\sigma(x)) \\)를 꺼내며(\\( \texttt{Id} \\)), 대입은 환경은 그대로 두고 메모리의 \\( \sigma(x) \\) 칸만 바꿉니다(\\( \texttt{Assign} \\)).
- 클로저는 값이 아니라 주소를 기억하므로, 바깥 변수가 나중에 바뀌면 클로저도 바뀐 값을 봅니다.
- **값에 의한 호출**(CBV)은 인자의 값을 새 주소에 복사해 넘기고, **참조에 의한 호출**(CBR)은 인자가 식별자이면 그 주소를 그대로 넘깁니다(\\( \texttt{App}_x \\)). CBR에서는 함수 안의 대입이 호출한 쪽의 변수에도 보입니다.
- 함수 호출이 끝난 뒤에도 매개변수를 위해 할당한 메모리 칸은 그대로 남습니다. 이를 치우는 방법은 [쓰레기 수집](./garbage-collection.md)에서 다룹니다.

## 연습 문제

1. 다음 MFAE 식의 결과와 계산이 끝났을 때의 메모리를 구하세요. 메모리는 비어 있는 상태에서 시작한다고 가정합니다.
   ```text
   var x = 1; var y = 2; x = y = x + y; x * y
   ```
2. 원래 \\( \texttt{App} \\) 규칙과 \\( \texttt{App}_x \\) 규칙을 함께 쓰면, 인자가 식별자인 식에는 두 규칙이 모두 적용될 수 있습니다. 두 규칙이 겹치지 않도록 원래 \\( \texttt{App} \\) 규칙에 조건을 더해 고쳐 쓰세요.
3. 다음 식을 CBV와 CBR로 각각 계산한 결과를 구하세요.
   ```pl
   /* MFAE */
   var a = 1; var f = x => { x = x + 1; x }; f(a) + a
   ```
4. 관련 과제 **MFAE**에서 CBV 전략을 따르는 `interp`와 CBR 전략을 따르는 `interpCBR`를 구현해 보세요. 제출할 필요는 없는 연습 과제이지만, 시험 문제와 관련될 수 있으니 직접 풀어 보기를 권합니다.
