# 일급 컨티뉴에이션

앞 장 [컨티뉴에이션](./continuations.md)에서 우리는 컨티뉴에이션이 **남은 계산**이라는 것을 배웠고, 컨티뉴에이션 전달 방식(continuation-passing style, CPS)으로 \\(\textsf{FAE}\\) 인터프리터를 다시 쓴 뒤, 컨티뉴에이션과 값 스택(value stack)을 이용해 \\(\textsf{FAE}\\)의 작은 걸음 의미(small-step operational semantics)를 정의했습니다. 그 장의 끝에서, 컨티뉴에이션을 자료 구조로 나타내면 계산 상태를 **데이터**로 저장했다가 나중에 **복원**할 수 있다는 점도 보았습니다.

이번 장에서는 이 아이디어를 언어 안으로 끌어들입니다. 프로그래머가 컨티뉴에이션을 **값**으로 붙잡아 변수에 담고, 나중에 그 값을 호출해서 프로그램의 **제어 흐름**(control flow)을 바꿀 수 있게 하는 것, 이것이 <a id="g-first-class-continuation"></a>**일급 컨티뉴에이션**(first-class continuation)입니다. 우리는 \\(\textsf{FAE}\\)에 일급 컨티뉴에이션을 더한 \\(\textsf{KFAE}\\)를 정의하고, 그 인터프리터와 작은 걸음 의미를 만든 뒤, 일급 컨티뉴에이션으로 `return`, `break`, `continue` 같은 **제어문**(control statement)을 표현하는 방법을 살펴봅니다.

이 장에서 만들 `KFAE` 인터프리터를 먼저 돌려 봅시다. 프로그램을 고쳐 가며 실행해 보세요.

<div class="playground" data-lang="KFAE"></div>

## 일급 컨티뉴에이션

### 다시 보기: 일급 시민

프로그래밍 언어에서 어떤 대상이 **값**으로 다뤄지면 그 대상을 **일급 시민**(first-class citizen)이라고 합니다. 다시 말해, 그 대상을

1. **변수**에 **담을** 수 있고,
2. 함수에 **인자**로 **넘길** 수 있고,
3. 함수에서 **돌려줄** 수 있다

는 뜻입니다. 예를 들어 Scala는 [일급 함수](./first-class-functions.md)(first-class function)를 지원합니다.

```scala
def inc(n: Int): Int = n + 1
// 1. We can assign a function to a variable.
val f: Int => Int = inc
// 2. We can pass a function as an argument to a function.
List(1, 2, 3).map(inc)                  // List(2, 3, 4)
// 3. We can return a function from a function.
def addN(n: Int): Int => Int = m => n + m
val add3: Int => Int = addN(3)
add3(5)                                 // 3 + 5 = 8
```

### 컨티뉴에이션을 값으로

마찬가지로 **일급 컨티뉴에이션**은 컨티뉴에이션을 **값**으로 다룰 수 있다는 뜻입니다. 예를 들어 Racket은 일급 컨티뉴에이션을 지원합니다. Racket에서는

1. `let/cc`로 현재 컨티뉴에이션을 **붙잡고**,
2. 붙잡은 컨티뉴에이션을 이용해 프로그램의 **제어 흐름을 바꿀** 수 있습니다.

다음 프로그램의 제어 흐름을 바꿔 봅시다. (Racket은 `1 + 2` 같은 중위 표기 대신 `(+ 1 2)` 같은 전위 표기를 씁니다.)

```text
; Racket
(* 2 (+ 3 5))
```

`let/cc`(<a id="g-current-continuation"></a>현재 컨티뉴에이션(current continuation)을 묶는 `let`)를 써서 다음과 같이 바꿉니다.

```text
; Racket
(* 2 (let/cc k (+ 3 (k 5))))   ; first-class continuation with `let/cc`
```

두 식이 어떻게 계산되는지 비교해 봅시다. 원래 식은 다음 순서로 계산됩니다.

1. `2`를 계산한다. (결과: `2`)
2. `3`을 계산한다. (결과: `3`)
3. `5`를 계산한다. (결과: `5`)
4. 2단계와 3단계의 결과를 더한다. (결과: `3 + 5 = 8`)
5. 1단계의 결과와 2~4단계의 결과를 곱한다. (결과: `2 * 8 = 16`)

식 `(+ 3 5)`의 컨티뉴에이션은 무엇일까요? 5단계입니다. 그렇다면 식 `5`의 컨티뉴에이션은? 4단계와 5단계입니다.

이제 1) `let/cc`로 `(+ 3 5)`의 컨티뉴에이션(5단계)을 **붙잡아 두고**, 2) `5`를 계산한 뒤에 원래의 컨티뉴에이션(4단계와 5단계) 대신 붙잡아 둔 컨티뉴에이션을 쓰도록 **제어 흐름을 바꿔** 봅시다. 바뀐 식은 다음 순서로 계산됩니다.

1. `2`를 계산한다. (결과: `2`)
2. `k`를 2~7단계의 컨티뉴에이션으로 정한다. (`k`는 8단계)
3. `3`을 계산한다. (결과: `3`)
4. `k`를 계산한다. (결과: 8단계)
5. `5`를 계산한다. (결과: `5`)
6. 4단계의 결과를 5단계의 결과로 호출한다. (**컨티뉴에이션 교체**)
7. 3단계의 결과와 4~6단계의 결과를 더한다. (**도달하지 않음**)
8. 1단계의 결과와 2~7단계의 결과를 곱한다. (결과: `2 * 5 = 10`)

즉,

- 2단계는 2~7단계의 컨티뉴에이션(곧 8단계)을 값으로 만들어 `k`에 담고,
- 6단계는 5단계의 컨티뉴에이션을 `k`로 **바꿔치기**합니다.

그래서 7단계의 덧셈은 영영 일어나지 않고, `5`가 곧바로 8단계로 넘어가 결과는 `10`이 됩니다.

일급 컨티뉴에이션을 지원하는 함수형 언어는 Racket 말고도 여럿 있습니다. Ruby에는 `callcc`가 있습니다.

```ruby
# Ruby
2 * (callcc { |k| 3 + k.call(5) })       # 2 * 5 = 10
```

Haskell에서는 컨티뉴에이션 모나드의 `callCC`를 씁니다.

```haskell
-- Haskell
do
  x <- callCC $ \k -> do
    y <- k 5
    return $ 3 + y
  return $ 2 * x                       -- 2 * 5 = 10
```

## KFAE: 일급 컨티뉴에이션을 더한 FAE

이제 \\(\textsf{FAE}\\)에 일급 컨티뉴에이션을 붙잡는 새 키워드 `vcc`를 더해 \\(\textsf{KFAE}\\)로 확장해 봅시다. 앞의 Racket 예는 \\(\textsf{KFAE}\\)로 이렇게 씁니다.

```kfae,run
/* KFAE */
2 * { vcc k; 3 + k(5) }
```

조금 더 복잡한 예도 있습니다. 이 예는 뒤에서 자세히 살펴봅니다.

```kfae,run
/* KFAE */
{
  vcc done;
  val f = {
    vcc exit;
    2 * done(1 + {
      vcc k;
      exit(k)
    })
  };
  f(3) * 5
}
```

### 구체 문법과 추상 문법

\\(\textsf{KFAE}\\)를 위해 \\(\textsf{FAE}\\)의 **식**에 다음 하나를 더합니다.

1. 일급 컨티뉴에이션(`vcc`)

구체 문법(concrete syntax)은 다음과 같이 확장합니다.

```bnf
// expressions
<expr> ::= ... | "vcc" <id> ";" <expr>
```

추상 문법(abstract syntax)은 다음과 같습니다.

\\[
\begin{array}{lrcll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots \mid \texttt{vcc}\ x;\ e & (\texttt{Vcc})
\end{array}
\\]

```scala
enum Expr:
  ...
  // first-class continuations
  case Vcc(name: String, body: Expr)
```

`vcc x; e`는 "지금 이 `vcc` 식 전체의 컨티뉴에이션을 `x`에 담고 `e`를 계산하라"는 뜻입니다.

### 함수 호출과 컨티뉴에이션 호출

다음 \\(\textsf{KFAE}\\) 식의 결과는 무엇일까요?

```kfae,run
/* KFAE */
2 * { vcc k; 3 + k(5) }
```

`k`는 `{ vcc k; ... }` 블록의 컨티뉴에이션, 곧 "블록의 결과에 2를 곱하기"입니다. 이것을 함수로 쓰면 `x => 2 * x`입니다.

```kfae,run
/* KFAE */
// k is a continuation that can be represented as `x => 2 * x`
2 * { vcc k; 3 + k(5) } // 2 * 5 = 10
```

결과는 `10`입니다. 이것을 똑같은 일을 하는 **함수**와 비교해 보면 차이가 선명해집니다.

```fae,run
/* FAE */
2 * { val k = x => 2 * x; 3 + k(5) } // 2 * (3 + 10) = 26
```

- **함수 호출**은 결과를 **호출한 곳으로 돌려줍니다**. `k(5)`는 `10`이 되고, 그 뒤의 계산 `3 + ...`과 `2 * ...`이 이어져 `26`이 됩니다.
- **컨티뉴에이션 호출**은 **돌아오지 않습니다**. 그 대신 `{ vcc k; ... }` 블록 전체의 값이 인자로 **바뀝니다**. 블록이 `5`가 되므로 `2 * 5 = 10`입니다.

`k(5)`를 부를 때 **남아 있던 계산**에 무슨 일이 생기는지 그림으로 그려 보면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 640 250" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="함수 호출에서는 k(5)가 본문 2 * x를 계산해 10을 들고 돌아와 3 + ...과 2 * ...을 마저 해서 26이 된다. 컨티뉴에이션 호출에서는 남은 계산 3 + ...과 2 * ...을 버리고 k에 저장된 2 * ...으로 갈아타서 10이 된다" font-family="sans-serif" fill="currentColor">
<defs><marker id="kfae-f1-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="150" y="22" text-anchor="middle" fill="currentColor" font-size="15" font-weight="bold">함수 호출</text>
<text x="60" y="62" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">k(5)</text>
<path d="M86,57 L158,57" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#kfae-f1-m0)"/>
<text x="122" y="50" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">5</text>
<rect rx="3" x="160" y="38" width="100" height="38" fill="#2a408e"/>
<text x="210" y="62" text-anchor="middle" fill="#fff" font-size="14" font-family="ui-monospace, Menlo, monospace">2 * x</text>
<path d="M210,76 C210,110 140,118 96,118" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#kfae-f1-m0)"/>
<text x="222" y="104" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">10</text>
<text x="60" y="124" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">3 + …</text>
<path d="M60,132 L60,160" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#kfae-f1-m0)"/>
<text x="60" y="178" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">2 * …</text>
<path d="M60,186 L60,214" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#kfae-f1-m0)"/>
<text x="60" y="236" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace" font-weight="bold">26</text>
<path d="M320,30 L320,240" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/>
<text x="480" y="22" text-anchor="middle" fill="currentColor" font-size="15" font-weight="bold">컨티뉴에이션 호출</text>
<text x="390" y="62" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">k(5)</text>
<path d="M416,57 L488,57" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#kfae-f1-m0)"/>
<text x="452" y="50" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">5</text>
<rect rx="3" x="490" y="38" width="100" height="38" fill="#2a408e"/>
<text x="540" y="62" text-anchor="middle" fill="#fff" font-size="14" font-family="ui-monospace, Menlo, monospace">2 * …</text>
<text x="540" y="94" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.8">k에 저장된 남은 계산</text>
<text x="390" y="124" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" opacity="0.45">3 + …</text>
<path d="M360,119 L420,119" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="390" y="178" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" opacity="0.45">2 * …</text>
<path d="M360,173 L420,173" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="390" y="205" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.8">버려짐</text>
<path d="M540,102 L540,214" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#kfae-f1-m0)"/>
<text x="540" y="236" text-anchor="middle" fill="currentColor" font-size="15" font-family="ui-monospace, Menlo, monospace" font-weight="bold">10</text>
</svg>
</div>

함수 호출에서는 본문 `2 * x`가 끝나면 `10`을 들고 원래 자리로 돌아와 남은 계산(`3 + ...`, `2 * ...`)을 마저 합니다. 컨티뉴에이션 호출에서는 원래의 남은 계산을 **버리고**, `k`에 저장해 둔 남은 계산(`2 * ...`)으로 갈아탑니다.

> **자주 하는 실수**: 컨티뉴에이션 `k`를 "`x => 2 * x`라는 함수"라고 설명했지만, 그것은 `k`가 **무슨 일을 하는지** 보여 주기 위한 비유일 뿐입니다. 진짜 함수라면 호출 뒤에 돌아와야 하지만, 컨티뉴에이션은 호출하면 지금까지의 남은 계산을 통째로 버리고 다시는 돌아오지 않습니다.

### 더 복잡한 예

이제 앞에서 미뤄 둔 예를 봅시다.

```kfae,run
/* KFAE */
{
  vcc done;        // done = x => x
  val f = {
    vcc exit;      // exit = y => val f = y; f(3) * 5
    2 * done(1 + {
      vcc k;       // k    = z => val f = { 2 * done(1 + z) }; f(3) * 5
      exit(k)
    })
  };
  f(3) * 5
}                  // 4 (= 1 + 3)
```

세 컨티뉴에이션이 각각 무엇인지부터 정리합시다.

- `done`은 프로그램 전체 블록의 컨티뉴에이션입니다. 프로그램 바깥에는 더 할 일이 없으므로 `x => x`입니다. 즉 `done(v)`를 부르면 `v`가 곧바로 프로그램 전체의 결과가 됩니다.
- `exit`은 `val f = { ... }`의 초기화 블록의 컨티뉴에이션입니다. 블록의 결과를 `f`에 담고 `f(3) * 5`를 계산하는 일이므로 `y => val f = y; f(3) * 5`입니다.
- `k`는 가장 안쪽 `{ vcc k; ... }` 블록의 컨티뉴에이션입니다. 블록의 결과 `z`에 1을 더해 `done`을 부르고, 그 결과에 2를 곱한 것을 `f`에 담고, `f(3) * 5`를 계산하는 일이므로 `z => val f = { 2 * done(1 + z) }; f(3) * 5`입니다.

이제 계산을 따라가 봅시다.

1. 가장 안쪽 블록에서 `exit(k)`를 부릅니다. 남은 계산(`1 + ...`, `done(...)`, `2 * ...`)은 모두 버려지고, `exit`으로 갈아탑니다. 즉 `f`가 컨티뉴에이션 `k`에 묶이고 `f(3) * 5`를 계산하기 시작합니다.
2. `f(3)`은 곧 `k(3)`입니다. 컨티뉴에이션 호출이므로 남은 계산 `... * 5`는 버려지고, `k`로 갈아탑니다. 즉 가장 안쪽 블록의 결과가 `3`인 것처럼 계산을 이어 갑니다.
3. `1 + 3 = 4`를 계산하고 `done(4)`를 부릅니다. 역시 컨티뉴에이션 호출이므로 남은 계산(`2 * ...`, `val f = ...`, `f(3) * 5`)은 모두 버려지고, `done`으로 갈아탑니다.
4. `done`은 `x => x`이므로 프로그램 전체의 결과는 `4`입니다.

> **생각해 보기**: 위 프로그램에서 `done(1 + { ... })`을 `(1 + { ... })`로 바꾸면 결과가 어떻게 될까요? 2단계 이후를 다시 따라가 보세요.

## KFAE의 인터프리터와 작은 걸음 의미

### 다시 보기: FAE의 인터프리터와 작은 걸음 의미

앞 장에서 우리는 컨티뉴에이션의 **1차 표현**(first-order representation)과 **값 스택**을 정의했습니다.

```scala
enum Cont:
  case EmptyK
  case EvalK(env: Env, expr: Expr, k: Cont)
  case AddK(k: Cont)
  case MulK(k: Cont)
  case AppK(k: Cont)

type Stack = List[Value]
```

\\[
\begin{array}{lrcll}
\text{Continuations} & \mathbb{K} \ni \kappa & ::= & \square & (\texttt{EmptyK}) \\\\
& & \mid & (\sigma \vdash e) :: \kappa & (\texttt{EvalK}) \\\\
& & \mid & (\texttt{+}) :: \kappa & (\texttt{AddK}) \\\\
& & \mid & (\texttt{\*}) :: \kappa & (\texttt{MulK}) \\\\
& & \mid & (\texttt{@}) :: \kappa & (\texttt{AppK}) \\\\
\text{Value Stacks} & \mathbb{S} \ni s & ::= & \blacksquare \mid v :: s & (\texttt{List[Value]})
\end{array}
\\]

그리고 컨티뉴에이션과 값 스택의 쌍인 **상태**(state) 사이의 작은 걸음 관계 \\(\to\ \subseteq (\mathbb{K} \times \mathbb{S}) \times (\mathbb{K} \times \mathbb{S})\\)를 정의하고, 그것을 `step` 함수로 구현했습니다.

```scala
def step(k: Cont, s: Stack): (Cont, Stack) = ???
```

\\[
\langle \kappa \mathrel{||} s \rangle \to \langle \kappa' \mathrel{||} s' \rangle
\\]

`eval` 함수는 빈 컨티뉴에이션 \\(\square\\)에 이를 때까지 상태를 **반복해서** 한 걸음씩 나아가게 한 뒤, 값 스택에 남은 하나의 값을 돌려줍니다.

```scala
def eval(str: String): String =
  import Cont.*
  def aux(k: Cont, s: Stack): Value = step(k, s) match
    case (EmptyK, List(v)) => v
    case (k, s) => aux(k, s)
  aux(EvalK(Map.empty, Expr(str), EmptyK), List.empty).str
```

\\[
\langle (\varnothing \vdash e) :: \square \mathrel{||} \blacksquare \rangle \to^\ast \langle \square \mathrel{||} v :: \blacksquare \rangle
\\]

### 컨티뉴에이션 값

이제 \\(\textsf{FAE}\\)의 인터프리터와 작은 걸음 의미에 일급 컨티뉴에이션을 더해 \\(\textsf{KFAE}\\)로 확장합니다. 먼저 값에 <a id="g-continuation-value"></a>**컨티뉴에이션 값**(continuation value)을 더합니다. 컨티뉴에이션 값은 컨티뉴에이션과 값 스택의 쌍, 곧 하나의 **상태**입니다.

```scala
// values
enum Value:
  case NumV(number: BigInt)
  case CloV(param: String, body: Expr, env: Env)
  case ContV(cont: Cont, stack: Stack)
```

\\[
\begin{array}{lrcll}
\text{Values} & \mathbb{V} \ni v & ::= & n & (\texttt{NumV}) \\\\
& & \mid & \langle \lambda x.e, \sigma \rangle & (\texttt{CloV}) \\\\
& & \mid & \langle \kappa \mathrel{||} s \rangle & (\texttt{ContV})
\end{array}
\\]

왜 컨티뉴에이션만이 아니라 값 스택까지 저장할까요? 앞 장의 예에서 보았듯이, 어떤 시점의 "남은 계산"은 할 일 목록 \\(\kappa\\)만으로는 완성되지 않습니다. \\((\texttt{+})\\) 같은 할 일은 값 스택에 이미 쌓여 있는 중간 결과를 꺼내 쓰기 때문입니다. 그래서 계산을 나중에 그대로 이어 가려면 그 시점의 값 스택도 함께 저장해 두어야 합니다.

이제 `step` 함수와 작은 걸음 관계 \\(\to\\)에 빠진 경우를 채워 봅시다.

### 일급 컨티뉴에이션 붙잡기

```scala
def step(k: Cont, s: Stack): (Cont, Stack) = (k, s) match
  case (EvalK(env, expr, k), s) => expr match
    ...
    case Vcc(x, b) => (EvalK(env + (x -> ContV(k, s)), b, k), s)
```

\\[
\begin{array}{llcl}
\texttt{Vcc} & \langle (\sigma \vdash \texttt{vcc}\ x;\ e) :: \kappa \mathrel{||} s \rangle & \to & \langle (\sigma[x \mapsto \langle \kappa \mathrel{||} s \rangle] \vdash e) :: \kappa \mathrel{||} s \rangle
\end{array}
\\]

이 규칙은 환경 \\(\sigma\\)에 새로운 변경 불가능한 이름 \\(x\\)를 만들어 **컨티뉴에이션 값** \\(\langle \kappa \mathrel{||} s \rangle\\)에 묶고, 확장된 환경 \\(\sigma[x \mapsto \langle \kappa \mathrel{||} s \rangle]\\)에서 본문 \\(e\\)를 계산합니다. 붙잡는 \\(\kappa\\)와 \\(s\\)는 `vcc` 식을 다 계산한 **뒤에** 할 일과 그때의 값 스택, 곧 `vcc` 식의 컨티뉴에이션입니다. 본문 \\(e\\)의 컨티뉴에이션도 똑같이 \\(\kappa\\)라는 점에 주목하세요. 본문을 끝까지 평범하게 계산하면 그 결과가 곧 `vcc` 식의 결과가 됩니다.

### 함수 적용

```scala
def step(k: Cont, s: Stack): (Cont, Stack) = (k, s) match
  case (EvalK(env, expr, k), s) => expr match
    ...
    case App(f, e) => (EvalK(env, f, EvalK(env, e, AppK(k))), s)
  ...
  case (AppK(k), a :: f :: s) => f match
    case CloV(p, b, fenv) => (EvalK(fenv + (p -> a), b, k), s)
    case ContV(k1, s1)    => (k1, a :: s1)
    case v                => error(s"not a function: ${v.str}")
```

\\[
\begin{array}{llcl}
\texttt{App}\_1 & \langle (\sigma \vdash e_1(e_2)) :: \kappa \mathrel{||} s \rangle & \to & \langle (\sigma \vdash e_1) :: (\sigma \vdash e_2) :: (\texttt{@}) :: \kappa \mathrel{||} s \rangle \\\\
\texttt{App}\_{2,\lambda} & \langle (\texttt{@}) :: \kappa \mathrel{||} v_2 :: \langle \lambda x.e, \sigma \rangle :: s \rangle & \to & \langle (\sigma[x \mapsto v_2] \vdash e) :: \kappa \mathrel{||} s \rangle \\\\
\texttt{App}\_{2,\kappa} & \langle (\texttt{@}) :: \kappa \mathrel{||} v_2 :: \langle \kappa' \mathrel{||} s' \rangle :: s \rangle & \to & \langle \kappa' \mathrel{||} v_2 :: s' \rangle
\end{array}
\\]

\\(\texttt{App}\_1\\)과 \\(\texttt{App}\_{2,\lambda}\\)는 앞 장의 \\(\texttt{App}\_1\\), \\(\texttt{App}\_2\\)와 같습니다. 새로 생긴 \\(\texttt{App}\_{2,\kappa}\\) 규칙은 함수 식의 값이 컨티뉴에이션 값 \\(\langle \kappa' \mathrel{||} s' \rangle\\)일 때를 다룹니다. 이 규칙은 지금의 컨티뉴에이션 \\(\kappa\\)와 값 스택 \\(s\\)를 **통째로 버리고**, 붙잡아 두었던 컨티뉴에이션 \\(\kappa'\\)과 값 스택 \\(s'\\)으로 제어 흐름을 바꿉니다. 이때 인자 값 \\(v_2\\)를 \\(s'\\) 위에 올리는데, 이것은 붙잡았던 `vcc` 식의 결과가 \\(v_2\\)인 것처럼 계산을 이어 간다는 뜻입니다.

\\(\texttt{App}\_{2,\lambda}\\)와 비교해 보면 차이가 분명합니다. 함수 호출은 원래의 \\(\kappa\\)를 남겨 두므로 본문을 다 계산한 뒤 **돌아옵니다**. 컨티뉴에이션 호출은 \\(\kappa\\)를 버리므로 **돌아오지 않습니다**.

### 예제 1

식 \\(2 \texttt{ \* } (\texttt{vcc}\ \texttt{x};\ (3 \texttt{ + } \texttt{x}(5)))\\)를 계산해 봅시다. 앞에서 본 `2 * { vcc k; 3 + k(5) }`와 같은 식입니다.

\\[
\begin{array}{rll}
& \langle (\varnothing \vdash 2 \texttt{ \* } (\texttt{vcc}\ \texttt{x};\ (3 \texttt{ + } \texttt{x}(5)))) :: \square \mathrel{||} \blacksquare \rangle & \\\\
\to & \langle (\varnothing \vdash 2) :: (\varnothing \vdash \texttt{vcc}\ \texttt{x};\ (3 \texttt{ + } \texttt{x}(5))) :: (\texttt{\*}) :: \square \mathrel{||} \blacksquare \rangle & (\texttt{Mul}\_1) \\\\
\to & \langle (\varnothing \vdash \texttt{vcc}\ \texttt{x};\ (3 \texttt{ + } \texttt{x}(5))) :: (\texttt{\*}) :: \square \mathrel{||} 2 :: \blacksquare \rangle & (\texttt{Num}) \\\\
\to & \langle (\sigma_0 \vdash 3 \texttt{ + } \texttt{x}(5)) :: (\texttt{\*}) :: \square \mathrel{||} 2 :: \blacksquare \rangle & (\texttt{Vcc}) \\\\
\to & \langle (\sigma_0 \vdash 3) :: (\sigma_0 \vdash \texttt{x}(5)) :: (\texttt{+}) :: (\texttt{\*}) :: \square \mathrel{||} 2 :: \blacksquare \rangle & (\texttt{Add}\_1) \\\\
\to & \langle (\sigma_0 \vdash \texttt{x}(5)) :: (\texttt{+}) :: (\texttt{\*}) :: \square \mathrel{||} 3 :: 2 :: \blacksquare \rangle & (\texttt{Num}) \\\\
\to & \langle (\sigma_0 \vdash \texttt{x}) :: (\sigma_0 \vdash 5) :: (\texttt{@}) :: (\texttt{+}) :: (\texttt{\*}) :: \square \mathrel{||} 3 :: 2 :: \blacksquare \rangle & (\texttt{App}\_1) \\\\
\to & \langle (\sigma_0 \vdash 5) :: (\texttt{@}) :: (\texttt{+}) :: (\texttt{\*}) :: \square \mathrel{||} \langle \kappa_0 \mathrel{||} s_0 \rangle :: 3 :: 2 :: \blacksquare \rangle & (\texttt{Id}) \\\\
\to & \langle (\texttt{@}) :: (\texttt{+}) :: (\texttt{\*}) :: \square \mathrel{||} 5 :: \langle \kappa_0 \mathrel{||} s_0 \rangle :: 3 :: 2 :: \blacksquare \rangle & (\texttt{Num}) \\\\
\to & \langle (\texttt{\*}) :: \square \mathrel{||} 5 :: 2 :: \blacksquare \rangle & (\texttt{App}\_{2,\kappa}) \\\\
\to & \langle \square \mathrel{||} 10 :: \blacksquare \rangle & (\texttt{Mul}\_2)
\end{array}
\\]

여기서

\\[
\sigma_0 = [\texttt{x} \mapsto \langle \kappa_0 \mathrel{||} s_0 \rangle] \qquad
\kappa_0 = (\texttt{\*}) :: \square \qquad
s_0 = 2 :: \blacksquare
\\]

입니다. `Vcc` 걸음에서 붙잡은 상태 \\(\langle \kappa_0 \mathrel{||} s_0 \rangle\\)은 "값 스택에 2가 있고, 그 위에 올라올 값과 곱하라"는 남은 계산입니다. \\(\texttt{App}\_{2,\kappa}\\) 걸음에서 그때까지의 컨티뉴에이션 \\((\texttt{+}) :: (\texttt{\*}) :: \square\\)과 값 스택의 `3`이 한꺼번에 버려지고, 붙잡아 둔 상태 위에 `5`가 올라갑니다. 그래서 덧셈은 일어나지 않고 결과는 \\(2 \times 5 = 10\\)입니다.

<div style="text-align:center">
<svg viewBox="0 0 640 215" width="100%" style="max-width: 620px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="예제 1의 App2,κ 걸음. 직전 상태의 값 스택에는 5, 붙잡은 컨티뉴에이션 값, 3, 2가 있다. 그 컨티뉴에이션 값은 Vcc에서 붙잡은 상태 κ0 = (*) :: □, s0 = 2 :: ■이다. 직후에는 지금의 κ와 s를 버리고 붙잡은 상태 위에 5를 올린다" font-family="sans-serif" fill="currentColor">
<defs><marker id="kfae-f2-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="100" y="24" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">App<tspan baseline-shift="sub" font-size="72%">2</tspan>,κ 직전</text>
<rect rx="3" x="14" y="82" width="76" height="26" fill="#2a408e"/>
<text x="52.0" y="99.5" text-anchor="middle" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">(@)</text>
<rect rx="3" x="14" y="108" width="76" height="26" fill="#2a408e"/>
<text x="52.0" y="125.5" text-anchor="middle" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">(+)</text>
<rect rx="3" x="14" y="134" width="76" height="26" fill="#2a408e"/>
<text x="52.0" y="151.5" text-anchor="middle" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">(*)</text>
<path d="M10,160 L94,160" fill="none" stroke="currentColor" stroke-width="2.2"/>
<rect rx="3" x="104" y="56" width="92" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="150.0" y="73.5" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">5</text>
<rect rx="3" x="104" y="82" width="92" height="26" fill="#2a408e"/>
<text x="150.0" y="99.5" text-anchor="middle" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">⟨κ<tspan baseline-shift="sub" font-size="72%">0</tspan> ‖ s<tspan baseline-shift="sub" font-size="72%">0</tspan>⟩</text>
<rect rx="3" x="104" y="108" width="92" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="150.0" y="125.5" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">3</text>
<rect rx="3" x="104" y="134" width="92" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="150.0" y="151.5" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">2</text>
<path d="M100,160 L200,160" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="52" y="180" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">κ</text>
<text x="150" y="180" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">s</text>
<rect x="256" y="52" width="130" height="136" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="321" y="24" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">붙잡아 둔 상태</text>
<text x="321" y="44" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.8">(Vcc에서)</text>
<rect rx="3" x="268" y="134" width="50" height="26" fill="#2a408e"/>
<text x="293.0" y="151.5" text-anchor="middle" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">(*)</text>
<path d="M264,160 L322,160" fill="none" stroke="currentColor" stroke-width="2.2"/>
<rect rx="3" x="330" y="134" width="44" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="352.0" y="151.5" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">2</text>
<path d="M326,160 L378,160" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="293" y="180" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">κ<tspan baseline-shift="sub" font-size="72%">0</tspan></text>
<text x="352" y="180" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">s<tspan baseline-shift="sub" font-size="72%">0</tspan></text>
<path d="M196,95 C225,95 230,110 254,110" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#kfae-f2-m0)"/>
<path d="M390,120 L450,120" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#kfae-f2-m0)"/>
<text x="420" y="112" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.9">5를 올림</text>
<text x="540" y="24" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">App<tspan baseline-shift="sub" font-size="72%">2</tspan>,κ 직후</text>
<rect rx="3" x="470" y="134" width="60" height="26" fill="#2a408e"/>
<text x="500.0" y="151.5" text-anchor="middle" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">(*)</text>
<path d="M466,160 L534,160" fill="none" stroke="currentColor" stroke-width="2.2"/>
<rect rx="3" x="556" y="108" width="60" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="586.0" y="125.5" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">5</text>
<rect rx="3" x="556" y="134" width="60" height="26" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="586.0" y="151.5" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">2</text>
<path d="M552,160 L620,160" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="500" y="180" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">κ<tspan baseline-shift="sub" font-size="72%">0</tspan></text>
<text x="586" y="180" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">5 :: s<tspan baseline-shift="sub" font-size="72%">0</tspan></text>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: \( \texttt{App}_{2,\kappa} \)는 지금의 \( \kappa \)와 \( s \)를 통째로 버리고, 붙잡아 둔 \( \langle \kappa_0 \mathrel{||} s_0 \rangle \) 위에 인자 5를 올립니다.</p>

### 예제 2

식 \\((\lambda \texttt{x}.(\texttt{vcc}\ \texttt{r};\ \texttt{r}(\texttt{x} \texttt{ + } 1) \texttt{ \* } 2))(3)\\)을 계산해 봅시다. 여기서 \\(\to^\ast\\)는 여러 걸음을 한꺼번에 건너뛴 것입니다.

\\[
\begin{array}{rll}
& \langle (\varnothing \vdash (\lambda \texttt{x}.(\texttt{vcc}\ \texttt{r};\ \texttt{r}(\texttt{x} \texttt{ + } 1) \texttt{ \* } 2))(3)) :: \square \mathrel{||} \blacksquare \rangle & \\\\
\to^\ast & \langle (\texttt{@}) :: \square \mathrel{||} 3 :: \langle \lambda \texttt{x}.e_0, \varnothing \rangle :: \blacksquare \rangle & \\\\
\to & \langle (\sigma_0 \vdash \texttt{vcc}\ \texttt{r};\ \texttt{r}(\texttt{x} \texttt{ + } 1) \texttt{ \* } 2) :: \square \mathrel{||} \blacksquare \rangle & (\texttt{App}\_{2,\lambda}) \\\\
\to & \langle (\sigma_1 \vdash \texttt{r}(\texttt{x} \texttt{ + } 1) \texttt{ \* } 2) :: \square \mathrel{||} \blacksquare \rangle & (\texttt{Vcc}) \\\\
\to & \langle (\sigma_1 \vdash \texttt{r}(\texttt{x} \texttt{ + } 1)) :: (\sigma_1 \vdash 2) :: (\texttt{\*}) :: \square \mathrel{||} \blacksquare \rangle & (\texttt{Mul}\_1) \\\\
\to & \langle (\sigma_1 \vdash \texttt{r}) :: (\sigma_1 \vdash \texttt{x} \texttt{ + } 1) :: (\texttt{@}) :: (\sigma_1 \vdash 2) :: (\texttt{\*}) :: \square \mathrel{||} \blacksquare \rangle & (\texttt{App}\_1) \\\\
\to^\ast & \langle (\texttt{@}) :: (\sigma_1 \vdash 2) :: (\texttt{\*}) :: \square \mathrel{||} 4 :: \langle \square \mathrel{||} \blacksquare \rangle :: \blacksquare \rangle & \\\\
\to & \langle \square \mathrel{||} 4 :: \blacksquare \rangle & (\texttt{App}\_{2,\kappa})
\end{array}
\\]

여기서

\\[
e_0 = \texttt{vcc}\ \texttt{r};\ \texttt{r}(\texttt{x} \texttt{ + } 1) \texttt{ \* } 2 \qquad
\sigma_0 = [\texttt{x} \mapsto 3] \qquad
\sigma_1 = \sigma_0[\texttt{r} \mapsto \langle \square \mathrel{||} \blacksquare \rangle]
\\]

입니다. 함수 본문의 맨 앞에서 붙잡은 `r`은 함수 호출이 끝난 뒤의 남은 계산, 곧 "호출한 쪽으로 돌아가기"입니다. 여기서는 프로그램 전체가 이 함수 호출이므로 \\(\langle \square \mathrel{||} \blacksquare \rangle\\)입니다. 그래서 `r`은 **`return`** 문처럼 동작합니다. `r(x + 1)`은 `4`를 곧바로 호출한 쪽에 돌려주고, 뒤에 남은 `* 2`는 건너뜁니다.

> **생각해 보기**: 예제 2에서 \\(\to^\ast\\)로 건너뛴 두 구간을 직접 채워 보세요. 각각 몇 걸음이고, 어떤 규칙을 쓰나요?

## 제어문

이 장의 앞부분에서, 그리고 앞 장의 첫머리에서 본 C++ 프로그램을 다시 봅시다.

```cpp
// C++
int sumEvenUntilZero(int xs[], int len) {
  if (len <= 0) return 0;          // directly return 0 if len <= 0
  int sum = 0;
  for (int i = 0; i < len; i++) {
    if (xs[i] == 0) break;         // stop the loop if xs[i] == 0
    if (xs[i] % 2 == 1) continue;  // skip the rest if xs[i] is odd
    sum += xs[i];
  }
  return sum;                      // finally return the sum
}
int xs[] = {4, 1, 3, 2, 0, 6, 5, 8};
sumEvenUntilZero(xs, 8);           // 4 + 2 = 6
```

이제 이 제어문들을 **일급 컨티뉴에이션**으로 표현할 수 있습니다.

**`return` 문.** 함수

```pl
/* KFAE */
x => body
```

는 다음과 같이 이해할 수 있습니다.

```pl
/* KFAE */
x => { vcc return;
  body // return(e) directly returns e to the caller
}
```

함수 본문의 맨 앞에서 붙잡은 컨티뉴에이션은 "함수 호출이 끝난 뒤의 남은 계산"입니다. 그래서 본문 어디서든 `return(e)`를 부르면, 본문의 나머지를 건너뛰고 `e`의 값을 곧바로 호출한 쪽으로 돌려줍니다. 예제 2의 `r`이 바로 이것이었습니다.

**`break` 문과 `continue` 문.** 반복문

```text
while (cond) body
```

는 다음과 같이 이해할 수 있습니다.

```pl
/* KFAE */
{ vcc break;
  while (cond) { vcc continue;
    body // continue(e)/break(e) jumps to the next/end of the loop
  }
}
```

반복문 전체를 감싸는 블록에서 붙잡은 `break`는 "반복문이 끝난 뒤의 남은 계산"이고, 반복문 본문을 감싸는 블록에서 붙잡은 `continue`는 "이번 반복의 본문이 끝난 뒤의 남은 계산", 곧 다음 반복으로 넘어가기입니다. 그래서 `break(e)`는 반복문 끝으로, `continue(e)`는 다음 반복으로 뛰어갑니다.

<div style="text-align:center">
<svg viewBox="0 0 540 300" width="100%" style="max-width: 500px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="반복문의 제어 흐름: 조건이 참이면 본문으로 들어가고, 본문이 끝나거나 continue(e)를 부르면 다시 조건으로 돌아간다. 조건이 거짓이거나 break(e)를 부르면 반복문 다음 계산으로 간다" font-family="sans-serif" fill="currentColor">
<defs><marker id="kfae-f3-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="60" y="18" width="380" height="210" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="72" y="38" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">vcc break;</text>
<rect x="190" y="50" width="120" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="250" y="72" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">cond</text>
<rect x="130" y="120" width="240" height="86" rx="6" fill="#2a408e"/>
<text x="142" y="140" text-anchor="start" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">vcc continue;</text>
<text x="250" y="178" text-anchor="middle" fill="#fff" font-size="15" font-family="ui-monospace, Menlo, monospace">body</text>
<path d="M250,84 L250,117" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#kfae-f3-m0)"/>
<text x="258" y="106" text-anchor="start" fill="currentColor" font-size="13">참</text>
<path d="M370,150 L405,150 L405,67 L313,67" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#kfae-f3-m0)"/>
<text x="414" y="104" text-anchor="start" fill="currentColor" font-size="12">본문 끝,</text>
<text x="414" y="122" text-anchor="start" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">continue(e)</text>
<rect x="180" y="252" width="150" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="255" y="275" text-anchor="middle" fill="currentColor" font-size="13">반복문 다음 계산</text>
<path d="M190,67 L88,67 L88,262 L177,262" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#kfae-f3-m0)"/>
<text x="100" y="60" text-anchor="start" fill="currentColor" font-size="13">거짓</text>
<path d="M130,185 L108,185 L108,278 L177,278" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#kfae-f3-m0)"/>
<text x="116" y="222" text-anchor="start" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">break(e)</text>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: <code>continue</code>는 본문을 감싼 블록의 컨티뉴에이션(다음 반복)으로, <code>break</code>는 반복문 전체를 감싼 블록의 컨티뉴에이션(반복문 다음)으로 갑니다.</p>

다른 제어문도 비슷한 방법으로 표현할 수 있습니다. 어떻게 할지는 스스로 생각해 보세요.

- Python의 <a id="g-exception"></a>예외(exception)

  ```python
  # Python
  try:
      x = y / z
  except ZeroDivisionError:
      x = 0
  ```

- JavaScript의 <a id="g-generator"></a>생성기(generator)

  ```javascript
  // JavaScript
  const foo = function* () { yield 'a'; yield 'b'; yield 'c'; };
  let str = '';
  for (const c of foo()) { str = str + c; }
  str // 'abc'
  ```

- Kotlin의 <a id="g-coroutine"></a>코루틴(coroutine)
- C#의 `async`/`await`
- 그 밖의 여러 제어 구조

> **생각해 보기**: 예외의 `try` 블록은 `vcc`로 무엇을 붙잡아 두어야 할까요? `raise`(또는 `throw`)는 그것을 어떻게 써야 할까요? 생성기의 `yield`는 왜 컨티뉴에이션을 **두 개** 필요로 할까요?

## 정리

- 어떤 대상을 변수에 담고, 인자로 넘기고, 결과로 돌려줄 수 있으면 그 대상은 **일급 시민**입니다. **일급 컨티뉴에이션**은 컨티뉴에이션을 값으로 다루는 것으로, Racket의 `let/cc`, Ruby의 `callcc`, Haskell의 `callCC`가 그 예입니다.
- \\(\textsf{KFAE}\\)는 \\(\textsf{FAE}\\)에 `vcc x; e`를 더한 언어입니다. `vcc x; e`는 `vcc` 식 자신의 컨티뉴에이션을 `x`에 담고 `e`를 계산합니다.
- **함수 호출**은 결과를 호출한 곳으로 돌려주지만, **컨티뉴에이션 호출**은 돌아오지 않고 지금의 남은 계산을 버린 뒤 붙잡아 둔 남은 계산으로 갈아탑니다.
- **컨티뉴에이션 값** \\(\langle \kappa \mathrel{||} s \rangle\\)은 컨티뉴에이션과 값 스택의 쌍(`ContV`)입니다.
- 새 규칙은 두 개입니다. `Vcc`는 현재 상태를 붙잡아 환경에 묶고, \\(\texttt{App}\_{2,\kappa}\\)는 현재 상태를 버리고 붙잡아 둔 상태 위에 인자 값을 올립니다.
- 일급 컨티뉴에이션으로 `return`, `break`, `continue` 같은 제어문을 표현할 수 있고, 예외, 생성기, 코루틴, `async`/`await` 같은 제어 구조도 비슷하게 표현할 수 있습니다.

## 연습 문제

1. 다음 \\(\textsf{KFAE}\\) 식의 결과를 구하세요.
   - `1 + { vcc k; 2 + 3 }`
   - `1 + { vcc k; 2 + k(3) }`
   - `{ vcc k; k(1) + k(2) }`
   - `(x => { vcc r; r(x) * 100 })(7) + 1`
2. \\(\texttt{3} \texttt{ + } (\texttt{vcc}\ \texttt{k};\ \texttt{k}(1) \texttt{ \* } 10)\\)을 작은 걸음 의미로 끝까지 계산하고, 각 걸음에 쓴 규칙과 붙잡은 컨티뉴에이션 값을 적으세요.
3. `Vcc` 규칙에서 컨티뉴에이션 값을 \\(\langle \kappa \mathrel{||} s \rangle\\) 대신 \\(\langle \kappa \mathrel{||} \blacksquare \rangle\\)로 만들면 예제 1의 결과는 어떻게 될까요? 값 스택까지 저장해야 하는 이유를 설명하세요.
4. \\(\textsf{KFAE}\\)에 일급 컨티뉴에이션을 그대로 두고, 앞 장의 CPS 인터프리터 `interpCPS`(컨티뉴에이션을 Scala 함수 `Value => Value`로 나타낸 것)를 확장해 `Vcc`를 지원하려면 `ContV`에 무엇을 저장해야 할까요? `App`의 함수 위치에 `ContV`가 오면 어떻게 해야 할까요?
5. 강의 연습 과제 **KFAE**(`kfae`)의 `step` 함수를 직접 구현해 보세요.
