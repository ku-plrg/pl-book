# 재귀 함수의 타입

[타입 있는 언어](./typed-languages.md)에서 우리는 FAE에 타입 시스템(type system)을 얹어 TFAE를 만들었습니다. 타입 규칙(typing rule)을 정의하고, 그 규칙을 그대로 옮긴 타입 검사기(type checker)를 Scala로 구현했지요. 그런데 TFAE에는 한 가지 아쉬운 점이 있습니다. [재귀 함수](./recursive-functions.md)에서 공들여 만든 `mkRec`을 TFAE에서는 쓸 수가 없다는 것입니다.

이 장에서는 먼저 왜 TFAE에서 `mkRec`을 정의할 수 없는지 직접 타입을 채워 보며 확인합니다. 그 과정에서 <a id="g-recursive-type"></a>재귀 타입(recursive type)이라는 개념을 만나게 됩니다. 그다음, 재귀 함수와 조건식을 가진 RFAE에 타입 시스템을 더한 TRFAE를 정의합니다. TRFAE의 타입 검사기를 만들려면 세 가지를 새로 고민해야 합니다.

1. <a id="g-arithmetic-comparison-operator"></a>산술 비교 연산자(arithmetic comparison operator) `<`
2. <a id="g-conditional-expression"></a>조건식(conditional expression) `if`-`else`
3. 재귀 함수 정의 `def`

TRFAE의 인터프리터와 자연 의미(natural semantics)는 타입을 무시한다는 점만 빼면 RFAE와 똑같으므로, 이 장은 타입 규칙과 타입 검사기에 집중합니다.

이 장에서 만들 `TRFAE` 인터프리터를 먼저 돌려 봅시다. 프로그램을 고쳐 가며 실행해 보세요.

<div class="playground" data-lang="TRFAE"></div>

## 재귀 함수의 타입

### 다시 보기: `mkRec`과 재귀 함수

재귀 함수(recursive function)는 자기 자신을 부르는 함수이고, 귀납적 자료 구조 위에서 반복적인 계산을 표현할 때 아주 유용합니다. 1부터 \\(n\\)까지의 합을 구하는 함수 `sum`을 Scala로 쓰면 다음과 같습니다.

```scala
def sum(n: Int): Int =
  if (n < 1) 0          // base case
  else n + sum(n - 1)   // recursive case

sum(10) // 10 + 9 + 8 + 7 + 6 + 5 + 4 + 3 + 2 + 1 + 0 = 55
```

우리는 재귀 함수를 지원하는 방법을 두 가지 배웠습니다. 첫째는 FAE에서 `mkRec`이라는 도우미 함수를 정의하는 방법입니다.

```fae
/* FAE + conditionals */
val mkRec = body => {
  val fX = fY => {
    val f = x => fY(fY)(x);
    body(f)
  };
  fX(fX)
};
val sum = mkRec(sum => n => if (n < 1) 0 else n + sum(n + -1)); sum(10)
```

둘째는 RFAE처럼 재귀 함수를 위한 새로운 문법을 아예 언어에 넣는 방법입니다.

```rfae,run
/* RFAE */
def sum(n) = if (n < 1) 0 else n + sum(n + -1); sum(10)
```

그렇다면 첫 번째 방법, 즉 `mkRec`을 TFAE에서도 정의할 수 있을까요? 답은 **아니요**입니다. 왜 그런지 직접 확인해 봅시다.

### TFAE에서 `mkRec` 정의해 보기

TFAE에서는 모든 함수의 매개변수에 타입을 적어야 합니다. 그러니 `mkRec`의 매개변수마다 타입 표기(type annotation)를 붙여야 하는데, 일단 모르는 자리는 `???`로 남겨 둡니다.

```tfae
/* TFAE + conditionals */
val mkRec = (body: ???) => {
  val fX = (fY: ???) => {
    val f = (x: ???) => fY(fY)(x);
    body(f)
  };
  fX(fX)
};
val sum = mkRec((sum: ???) => (n: ???) =>
  if (n < 1) 0
  else n + sum(n + -1));
sum(10)
```

쉬운 것부터 하나씩 채워 봅시다.

- `n`은 `n < 1`이나 `n + -1`처럼 쓰이므로 `Number`입니다.
- `sum`은 숫자를 받아(`sum(n + -1)`) 그 결과를 `n`에 더하므로 `Number => Number`입니다.
- `body`는 `sum`을 받아 `n`을 받는 함수를 돌려주므로 `(Number => Number) => Number => Number`입니다.
- `body(f)`가 타입 검사를 통과하려면 `f`의 타입은 `Number => Number`여야 합니다. 따라서 `x`는 `Number`이고, 본문 `fY(fY)(x)`의 결과도 `Number`여야 하므로 `fY(fY)`의 타입은 `Number => Number`입니다.

여기까지 채우면 다음과 같습니다.

```tfae
/* TFAE + conditionals */
val mkRec = (body: (Number => Number) => Number => Number) => {
  val fX = (fY: ???) => {
    val f = (x: Number) => fY(fY)(x);   // fY(fY): Number => Number
    body(f)                             // f: Number => Number
  };
  fX(fX)
};
val sum = mkRec((sum: Number => Number) => (n: Number) =>
  if (n < 1) 0
  else n + sum(n + -1));
sum(10)
```

이제 마지막 남은 `fY`의 타입이 문제입니다. 그 타입을 `T`라고 합시다. `fY(fY)`를 보면, `fY`는 자기 자신(타입 `T`)을 인자로 받아 `Number => Number`를 돌려주는 함수입니다. 그러니 `T`는 다음 등식을 만족해야 합니다.

```pl
T = T => Number => Number
```

이 등식을 풀려고 오른쪽의 `T`에 다시 `T => Number => Number`를 넣어 보면 어떻게 될까요?

```pl
T = T => Number => Number
  = (T => Number => Number) => Number => Number
  = ((T => Number => Number) => Number => Number) => Number => Number
  = (((T => Number => Number) => Number => Number) => Number => Number) => Number => Number
  = ...
```

`T`를 트리로 그려 보면, 매개변수 자리에 `T` 자신이 다시 들어가야 하므로 트리가 끝나지 않고 자기 자신으로 되돌아오는 순환이 생깁니다.

<div style="text-align:center">
<svg viewBox="0 0 420 220" width="100%" style="max-width: 420px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="재귀 타입 T = T =&gt; Number =&gt; Number를 트리로 그리면 매개변수 자리가 다시 T 자신을 가리키는 순환이 생긴다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="typing-recursive-functions-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="60" y="58" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">T</text>
<text x="84" y="57" text-anchor="middle" font-size="18">=</text>
<rect x="115" y="36" width="60" height="32" rx="4" fill="#2a408e"/>
<text x="145" y="58" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">=&gt;</text>
<polyline points="165,68 240,112" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#typing-recursive-functions-1)"/>
<rect x="230" y="114" width="60" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="260" y="136" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">=&gt;</text>
<polyline points="250,146 215,180" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#typing-recursive-functions-1)"/>
<polyline points="270,146 305,180" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#typing-recursive-functions-1)"/>
<text x="205" y="200" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Number</text>
<text x="315" y="200" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Number</text>
<path d="M128,68 C105,160 10,120 112,54" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#typing-recursive-functions-1)"/>
<text x="70" y="160" text-anchor="middle" font-size="13">매개변수 자리 = T 자신</text>
<text x="225" y="92" text-anchor="start" font-size="13">반환</text>
</svg>
</div>

아무리 펼쳐도 `T`가 사라지지 않습니다. 이처럼 자기 자신을 이용해 정의되는 타입을 재귀 타입(recursive type)이라고 하는데, TFAE의 타입은 `Number`, `Boolean`, 화살표 타입(arrow type)뿐이라 이런 타입을 표현할 방법이 없습니다. 그래서 TFAE에서는 `mkRec`을 정의할 수 없습니다.

> **생각해 보기**: 타입 없는 FAE에서는 `mkRec`이 잘 동작했습니다. 타입 시스템을 넣었더니 원래 잘 돌던 프로그램을 쓸 수 없게 된 것이지요. 타입 시스템은 안전한 대신 보수적이어서, 실행 중 오류가 나지 않는 프로그램 중 일부도 거부할 수 있습니다.

### Scala에서 `mkRec` 정의해 보기

그렇다면 Scala에서는 `mkRec`을 정의할 수 있을까요? **네!** Scala는 재귀 타입을 지원하기 때문입니다. 핵심은 `T = T => Number => Number`라는 등식을 case class로 표현하는 것입니다.

```scala
type Number = BigInt
case class T(self: T => Number => Number) // T = T => Number => Number

val mkRec = (body: (Number => Number) => Number => Number) => {
  val fX = (fY: T) => {
    val f = (x: Number) => fY.self(fY)(x);
    body(f)
  };
  fX(T(fX))
}
val sum = mkRec((sum: Number => Number) => (n: Number) =>
  if (n < 1) 0
  else n + sum(n + -1));
sum(10) // 55
```

이 코드는 2023년에 최민석, 최용욱 학생이 알려 준 코드를 조금 고친 것입니다. 원래 `mkRec`과 달라진 곳은 두 군데뿐입니다. `fY`를 함수로 쓰려면 `fY.self`로 안에 든 함수를 꺼내야 하고, `fX`를 `T` 타입 자리에 넘기려면 `T(fX)`로 감싸야 합니다.

Scala 3의 <a id="g-implicit-conversion"></a>암묵적 변환(implicit conversion)을 쓰면 이 감싸기와 꺼내기도 자동으로 하게 만들 수 있습니다(`import scala.language.implicitConversions`가 필요합니다). 그러면 원래 `mkRec`과 거의 똑같은 모양이 됩니다. 위 코드에서 달라지는 곳만 주석으로 표시했고, `sum`의 정의와 사용은 위와 같습니다.

```scala
import scala.language.implicitConversions                 // 추가

type Number = BigInt
case class T(self: T => Number => Number) // T = T => Number => Number
given Conversion[T, T => Number => Number] = _.self       // 추가: 꺼내기
given Conversion[T => Number => Number, T] = T(_)         // 추가: 감싸기
val mkRec = (body: (Number => Number) => Number => Number) => {
  val fX = (fY: T) => {
    val f = (x: Number) => fY(fY)(x);                      // fY.self 대신 fY
    body(f)
  };
  fX(fX)                                                   // T(fX) 대신 fX
}
```

case class `T`처럼 이름을 붙여 새 타입을 정의하는 기능은 다음 장 [대수적 데이터 타입](./algebraic-data-types.md)에서 우리 언어에도 넣어 봅니다. 그때 TFAE에서 실패했던 `mkRec`을 다시 정의해 보겠습니다.

## TRFAE: 타입 시스템을 갖춘 RFAE

`mkRec`을 쓸 수 없다면 두 번째 방법, 즉 재귀 함수를 위한 문법을 언어에 직접 넣어야 합니다. RFAE에 타입 시스템을 더한 TRFAE를 정의해 봅시다.

TRFAE를 정의하기 전에, 다음 RFAE 식의 타입이 무엇일지 추측해 봅시다.

```rfae,run
/* RFAE */ def f(n) = n; f
```

매개변수 `n`에 타입 표기가 없으니 `n`의 타입을 알 수 없고, 따라서 `f`의 타입도 알 수 없습니다. 매개변수에 타입을 적어 주면 어떨까요?

```rfae
/* RFAE */ def f(n: Number) = n; f
```

이제는 `f`가 `Number => Number`임을 알 수 있습니다. 그럼 이것은 어떨까요?

```rfae
/* RFAE */ def f(n: Number) = f(n); f
```

안타깝게도 이번에는 <a id="g-return-type"></a>반환 타입(return type)이 분명하지 않습니다. `f`의 본문은 `f(n)`이므로, `f`의 반환 타입을 알려면 `f`의 반환 타입을 알아야 합니다. 순환에 빠지는 셈이지요. 실제로 이 함수는 영원히 끝나지 않으므로, 반환 타입을 어떤 타입이라고 해도 됩니다. 그래서 재귀 함수에는 매개변수 타입뿐 아니라 **반환 타입도** 적도록 합니다.

```rfae
/* RFAE */ def f(n: Number): Number = f(n); f
```

이제 TRFAE 프로그램을 몇 개 보겠습니다. 합을 구하는 `sum`과 피보나치 수를 구하는 `fib`입니다.

```trfae,run
/* TRFAE */
def sum(n: Number): Number = {
  if (n < 1) 0
  else n + sum(n + -1)
};
sum(10) // 55
```

```trfae,run
/* TRFAE */
def fib(n: Number): Number = {
  if (n < 2) n
  else fib(n + -1) + fib(n + -2)
};
fib(7) // 13
```

TRFAE의 타입 시스템을 만들려면 TFAE에 없던 다음 세 가지 경우를 생각해야 합니다.

1. 산술 비교 연산자
2. 조건식
3. 재귀 함수 정의

### 구체 문법

RFAE의 구체 문법(concrete syntax)에 다음 두 가지를 더합니다.

1. 재귀 함수 정의의 타입 표기(매개변수 타입과 반환 타입)
2. 타입(숫자 타입, 불리언 타입, 화살표 타입)

```bnf
// expressions
<expr> ::= ...
         | <expr> "<" <expr>
         | "if" "(" <expr> ")" <expr> "else" <expr>
         | "def" <id> "(" <id> ":" <type> ")" ":" <type>
           "=" <expr> ";" <expr>

// types
<type> ::= "(" <type> ")"        // only for precedence
         | "Number"              // number type
         | "Boolean"             // boolean type
         | <type> "=>" <type>    // arrow type
```

### 추상 문법

추상 문법(abstract syntax)도 비슷하게 정의합니다. 식에는 비교(`Lt`), 조건식(`If`), 재귀 함수 정의(`Rec`)가 있고, `Rec`에는 매개변수 타입과 반환 타입이 들어갑니다.

\\[
\begin{array}{lrcll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots & \\\\
& & \mid & e \ \mathtt{\lt}\  e & (\texttt{Lt}) \\\\
& & \mid & \mathtt{if}\ (e)\ e\ \mathtt{else}\ e & (\texttt{If}) \\\\
& & \mid & \mathtt{def}\ x(x\mathtt{:}\tau)\mathtt{:}\tau\ \mathtt{=}\ e;\ e & (\texttt{Rec}) \\\\
\text{Types} & \mathbb{T} \ni \tau & ::= & \mathtt{num} & (\texttt{NumT}) \\\\
& & \mid & \mathtt{bool} & (\texttt{BoolT}) \\\\
& & \mid & \tau \to \tau & (\texttt{ArrowT})
\end{array}
\\]

Scala로는 다음과 같이 정의합니다. 타입을 나타내는 `Type`은 TFAE와 같습니다.

```scala
enum Expr:
  ...
  case Lt(left: Expr, right: Expr)
  case If(cond: Expr, thenExpr: Expr, elseExpr: Expr)
  case Rec(x: String, p: String, pty: Type, rty: Type, b: Expr, s: Expr)
enum Type:
  case NumT
  case BoolT
  case ArrowT(paramTy: Type, retTy: Type)
```

## 타입 검사기와 타입 규칙

TFAE 때와 마찬가지로 두 가지를 할 것입니다. 첫째, 식이 언제 타입이 맞는지(well-typed)를 다음 꼴의 타입 규칙으로 정의합니다.

\\[
\boxed{\Gamma \vdash e : \tau}
\\]

둘째, 이 타입 규칙을 따르는 타입 검사기를 Scala로 구현합니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = ???
```

타입 검사기는 \\(e\\)가 타입이 맞으면 그 타입을 돌려주고, 그렇지 않으면 식을 거부하며 타입 오류(type error)를 던집니다.

변수의 타입은 TFAE처럼 타입 환경(type environment) \\(\Gamma\\)로 관리합니다. 타입 환경은 변수 이름에서 타입으로 가는 유한 함수입니다.

\\[
\text{Type Environments} \quad \Gamma \in \mathbb{X} \xrightarrow{\text{fin}} \mathbb{T} \quad (\texttt{TypeEnv})
\\]

```scala
type TypeEnv = Map[String, Type]
```

숫자, 덧셈, `val`, 변수, 함수, 함수 적용의 타입 규칙은 TFAE와 똑같습니다. 아래에서는 새로 생긴 세 가지만 다룹니다. 코드에 나오는 `mustSame`은 두 타입이 같은지 확인하고 다르면 타입 오류를 던지는 도우미 함수입니다.

```scala
def mustSame(givenTy: Type, expectedTy: Type): Unit =
  if (givenTy != expectedTy)
    error(s"type mismatch: ${givenTy.str} != ${expectedTy.str}")
```

### 산술 비교 연산자

`<`는 두 숫자를 비교해 불리언을 돌려줍니다. 그러니 타입 검사기는 다음 두 가지를 하면 됩니다.

1. \\(\Gamma\\)에서 \\(e_1\\)과 \\(e_2\\)의 타입이 모두 \\(\mathtt{num}\\)인지 확인합니다.
2. \\(e_1 \mathbin{\mathtt{\lt}} e_2\\)의 타입으로 \\(\mathtt{bool}\\)을 돌려줍니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Lt(left, right) =>
    mustSame(typeCheck(left, tenv), NumT)
    mustSame(typeCheck(right, tenv), NumT)
    BoolT
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \mathtt{num}$}
\AxiomC{$\Gamma \vdash e_2 : \mathtt{num}$}
\LeftLabel{$\tau\texttt{-Lt}$}
\BinaryInfC{$\Gamma \vdash e_1 \mathbin{\mathtt{\lt}} e_2 : \mathtt{bool}$}
\end{prooftree}
\\]

덧셈의 규칙 \\(\tau\texttt{-Add}\\)와 비교하면 결과 타입만 \\(\mathtt{bool}\\)로 바뀌었습니다.

### 조건식

조건식은 조금 더 생각할 거리가 있습니다. 규칙의 전제와 결론의 타입을 모두 `???`로 두고 시작해 봅시다.

\\[
\begin{prooftree}
\AxiomC{$\texttt{???}$}
\LeftLabel{$\tau\texttt{-If}$}
\UnaryInfC{$\Gamma \vdash \mathtt{if}\ (e_0)\ e_1\ \mathtt{else}\ e_2 : \texttt{???}$}
\end{prooftree}
\\]

다음 TRFAE 식들의 타입이 무엇이어야 할지 생각해 봅시다.

- `if (true) 1 else 2`는 당연히 `Number`여야 합니다.
- `if (true) 1 else true`는 어떨까요? 조건이 `true`이니 결과는 언제나 `1`입니다. 그러니 `Number`라고 해도 될 것 같습니다.
- `(x: Boolean) => if (x) 1 else x`는 어떨까요? `x`가 `true`이면 `1`(숫자)을, `false`이면 `x`(불리언)를 돌려주므로 결과 타입을 하나로 정할 수가 없습니다.

두 번째와 세 번째의 차이는 조건의 **실제 값**을 아느냐 모르느냐에 있습니다. 그런데 타입 검사기는 프로그램을 실행하지 않으므로, 일반적으로 조건식의 실제 값을 알 수 없습니다. 그래서 간단하고 안전한 선택을 합니다. then 식과 else 식의 타입이 **같을 때만** 받아들이는 것입니다. 그러면 위의 두 번째, 세 번째 식은 모두 거부됩니다.

| 식 | 결과 |
|---|---|
| `if (true) 1 else 2` | `Number` |
| `if (true) 1 else true` | 거부 |
| `(x: Boolean) => if (x) 1 else x` | 거부 |

정리하면 타입 검사기는 다음을 합니다.

1. \\(\Gamma\\)에서 \\(e_0\\)의 타입이 \\(\mathtt{bool}\\)인지 확인합니다.
2. \\(\Gamma\\)에서 \\(e_1\\)과 \\(e_2\\)의 타입이 같은지 확인합니다.
3. \\(e_1\\)(또는 \\(e_2\\))의 타입을 돌려줍니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case If(cond, thenExpr, elseExpr) =>
    mustSame(typeCheck(cond, tenv), BoolT)
    val thenTy = typeCheck(thenExpr, tenv)
    val elseTy = typeCheck(elseExpr, tenv)
    mustSame(thenTy, elseTy)
    thenTy
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : \mathtt{bool}$}
\AxiomC{$\Gamma \vdash e_1 : \tau$}
\AxiomC{$\Gamma \vdash e_2 : \tau$}
\LeftLabel{$\tau\texttt{-If}$}
\TrinaryInfC{$\Gamma \vdash \mathtt{if}\ (e_0)\ e_1\ \mathtt{else}\ e_2 : \tau$}
\end{prooftree}
\\]

규칙에서 \\(e_1\\)과 \\(e_2\\)의 타입에 같은 메타변수 \\(\tau\\)를 썼다는 점에 주목하세요. 같은 문자를 쓰는 것만으로 "두 타입이 같아야 한다"는 조건이 표현됩니다.

> **자주 하는 실수**: 조건 \\(e_0\\)의 타입 검사를 빠뜨리는 경우가 있습니다. `if (1) 2 else 3`처럼 조건이 불리언이 아닌 식도 거부해야 합니다.

### 재귀 함수 정의

이제 가장 중요한 재귀 함수 정의 \\(\mathtt{def}\ x_0(x_1\mathtt{:}\tau_1)\mathtt{:}\tau_2\ \mathtt{=}\ e_2;\ e_3\\)입니다. \\(x_0\\)는 함수 이름, \\(x_1\\)은 매개변수, \\(\tau_1\\)은 매개변수 타입, \\(\tau_2\\)는 반환 타입, \\(e_2\\)는 함수 본문, \\(e_3\\)는 함수를 쓸 수 있는 스코프(scope)의 식입니다. 빈칸에서 출발해 하나씩 채워 봅시다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Rec(f, p, pty, rty, body, scope) =>
    ???
```

**첫째, 본문의 타입을 확인합니다.** 본문 \\(e_2\\)의 타입은 반환 타입 \\(\tau_2\\)와 같아야 합니다. 그런데 어떤 타입 환경에서 검사해야 할까요? 본문에서는 매개변수 \\(x_1\\)을 쓸 수 있으니, 적어도 \\(x_1 : \tau_1\\)은 넣어야 합니다.

```scala
    mustSame(typeCheck(body, tenv + (p -> pty)), rty)
```

하지만 이것만으로는 부족합니다. 재귀 함수의 본문에서는 함수 자신 \\(x_0\\)도 부를 수 있어야 하기 때문입니다. `sum`의 본문에 `sum(n + -1)`이 있었던 것을 떠올려 보세요. 다행히 우리는 함수의 타입을 이미 압니다. 매개변수 타입과 반환 타입이 모두 적혀 있으니 \\(x_0\\)의 타입은 \\(\tau_1 \to \tau_2\\)입니다. 반환 타입을 적게 한 이유가 바로 여기에 있습니다.

```scala
    val fty = ArrowT(pty, rty)
    mustSame(typeCheck(body, tenv + (f -> fty) + (p -> pty)), rty)
```

**둘째, 범위 식의 타입을 구합니다.** 전체 식의 타입은 \\(e_3\\)의 타입 \\(\tau_3\\)입니다. \\(e_3\\)에서는 함수 \\(x_0\\)를 쓸 수 있지만 매개변수 \\(x_1\\)은 쓸 수 없으므로, \\(x_0 : \tau_1 \to \tau_2\\)만 넣은 타입 환경에서 검사합니다.

완성된 코드와 규칙은 다음과 같습니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Rec(f, p, pty, rty, body, scope) =>
    val fty = ArrowT(pty, rty)
    mustSame(typeCheck(body, tenv + (f -> fty) + (p -> pty)), rty)
    typeCheck(scope, tenv + (f -> fty))
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma[x_0 : \tau_1 \to \tau_2, x_1 : \tau_1] \vdash e_2 : \tau_2$}
\AxiomC{$\Gamma[x_0 : \tau_1 \to \tau_2] \vdash e_3 : \tau_3$}
\LeftLabel{$\tau\texttt{-Rec}$}
\BinaryInfC{$\Gamma \vdash \mathtt{def}\ x_0(x_1\mathtt{:}\tau_1)\mathtt{:}\tau_2\ \mathtt{=}\ e_2;\ e_3 : \tau_3$}
\end{prooftree}
\\]

타입 검사기가 하는 일을 말로 정리하면 다음과 같습니다.

1. 함수의 타입 정보(\\(x_0 : \tau_1 \to \tau_2\\))와 매개변수의 타입 정보(\\(x_1 : \tau_1\\))로 확장한 타입 환경에서 \\(e_2\\)의 타입이 \\(\tau_2\\)인지 확인합니다.
2. 함수의 타입 정보(\\(x_0 : \tau_1 \to \tau_2\\))로 확장한 타입 환경에서 \\(e_3\\)의 타입을 구해 돌려줍니다.

> **생각해 보기**: 본문을 검사할 때 \\(x_0\\)가 \\(\tau_1 \to \tau_2\\)라고 "가정"하고, 그 가정 아래에서 본문이 정말 \\(\tau_2\\)를 돌려주는지 확인합니다. 수학적 귀납법의 귀납 가정과 닮지 않았나요? 앞에서 본 `def f(n: Number): Number = f(n)`도 이 가정 아래에서 본문 `f(n)`의 타입이 `Number`이므로 타입 검사를 통과합니다. 타입 시스템은 프로그램이 끝나는지까지는 보장하지 않습니다.

`sum`에 이 규칙을 적용해 봅시다. \\(\Gamma_1 = [\mathtt{sum} : \mathtt{num} \to \mathtt{num}, n : \mathtt{num}]\\)에서 본문을 검사하면, `n < 1`은 \\(\tau\texttt{-Lt}\\)로 \\(\mathtt{bool}\\), `0`은 \\(\mathtt{num}\\), `n + sum(n + -1)`은 `sum`이 \\(\mathtt{num} \to \mathtt{num}\\)이므로 \\(\mathtt{num}\\)입니다. 따라서 \\(\tau\texttt{-If}\\)로 본문의 타입은 \\(\mathtt{num}\\)이고 반환 타입과 일치합니다. 그다음 \\([\mathtt{sum} : \mathtt{num} \to \mathtt{num}]\\)에서 `sum(10)`의 타입은 \\(\mathtt{num}\\)이므로, 전체 프로그램의 타입은 `Number`입니다.

두 타입 환경이 각각 어느 부분을 검사할 때 쓰이는지 `sum`의 코드 위에 표시하면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 640 180" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="def sum의 본문은 sum과 n을 모두 아는 타입 환경에서, 범위 식 sum(10)은 sum만 아는 타입 환경에서 검사한다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="typing-recursive-functions-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="20.0" y="40" text-anchor="start" font-family="ui-monospace, Menlo, monospace">def sum(n: Number): Number = {</text>
<text x="38.1" y="66" text-anchor="start" font-family="ui-monospace, Menlo, monospace">if (n &lt; 1) 0</text>
<text x="38.1" y="92" text-anchor="start" font-family="ui-monospace, Menlo, monospace">else n + sum(n + -1)</text>
<text x="20.0" y="118" text-anchor="start" font-family="ui-monospace, Menlo, monospace">};</text>
<text x="20.0" y="156" text-anchor="start" font-family="ui-monospace, Menlo, monospace">sum(10)</text>
<rect x="32" y="48" width="214.66" height="52" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<rect x="12" y="136" width="79.21" height="28" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<polyline points="246.66,74 330,74" fill="none" stroke="currentColor" stroke-width="1.2"/>
<polyline points="91.21,150 330,150" fill="none" stroke="currentColor" stroke-width="1.2"/>
<text x="336" y="70" text-anchor="start" font-weight="bold">본문</text>
<text x="336" y="90" text-anchor="start" font-family="ui-monospace, Menlo, monospace" font-size="13">[sum : Number =&gt; Number, n : Number]</text>
<text x="336" y="146" text-anchor="start" font-weight="bold">범위</text>
<text x="336" y="166" text-anchor="start" font-family="ui-monospace, Menlo, monospace" font-size="13">[sum : Number =&gt; Number]</text>
</svg>
</div>

### 인터프리터

TRFAE의 인터프리터는 타입 표기를 무시한다는 점만 빼면 [재귀 함수](./recursive-functions.md)의 RFAE 인터프리터와 같습니다. 예를 들어 `Rec`의 경우 타입 두 개를 `_`로 버리고, 자기 자신을 가리키는 환경을 `lazy val`로 만듭니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Rec(n, p, _, _, b, s) =>
    lazy val newEnv: Env = env + (n -> CloV(p, b, () => newEnv))
    interp(s, newEnv)
```

## 정리

- TFAE에서는 `mkRec`을 정의할 수 없습니다. `fY`의 타입 `T`가 `T = T => Number => Number`를 만족하는 재귀 타입이어야 하는데, TFAE에는 이런 타입이 없기 때문입니다.
- Scala는 case class로 재귀 타입을 표현할 수 있어서 `mkRec`을 정의할 수 있습니다.
- TRFAE는 RFAE에 타입 시스템을 더한 언어로, 재귀 함수에 매개변수 타입과 **반환 타입**을 모두 적습니다.
- \\(\tau\texttt{-Lt}\\): 두 피연산자가 \\(\mathtt{num}\\)이면 결과는 \\(\mathtt{bool}\\)입니다.
- \\(\tau\texttt{-If}\\): 조건은 \\(\mathtt{bool}\\)이어야 하고, 타입 검사기는 조건의 실제 값을 모르므로 then 식과 else 식의 타입이 같아야 합니다.
- \\(\tau\texttt{-Rec}\\): 본문은 함수 자신과 매개변수의 타입을 넣은 환경에서, 범위 식은 함수의 타입만 넣은 환경에서 검사합니다.

## 연습 문제

1. 다음 TRFAE 식들의 타입을 구하거나, 타입 오류라면 어느 규칙에서 실패하는지 설명하세요.
   - `def f(n: Number): Boolean = if (n < 1) true else f(n + -1); f(3)`
   - `def f(n: Number): Number = if (n < 1) true else 0; f`
   - `def f(n: Number): Number = n; n`
2. `def fib(n: Number): Number = { if (n < 2) n else fib(n + -1) + fib(n + -2) }; fib(3)`의 타입 유도 트리를 그려 보세요.
3. \\(\tau\texttt{-Rec}\\)의 두 번째 전제에서 타입 환경에 \\(x_1 : \tau_1\\)도 넣는다면 어떤 문제가 생길까요? 타입 검사는 통과하지만 실행 중 오류가 나는 예를 만들어 보세요.
4. 반환 타입 표기를 없애고, 본문의 타입을 계산해서 반환 타입으로 쓰는 방식을 생각해 봅시다. 이 방식이 왜 잘 동작하지 않는지 `def f(n: Number) = f(n); f`를 예로 설명하세요.
5. 과제 [`trfae`](https://github.com/ku-plrg-classroom/docs/tree/main/cose212/trfae)의 `typeCheck`와 `interp` 함수를 구현해 보세요. 제출할 필요는 없지만, 시험 문제와 관련 있을 수 있으니 꼭 직접 풀어 보기를 권합니다.
