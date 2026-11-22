# 점진적 타입

[타입 시스템](./type-systems.md) 장에서 우리는 정적 타입 언어와 동적 타입 언어를 나란히 놓고 비교했습니다. 정적 타입 언어는 실행하기 전에 타입 오류를 모두 잡아 주지만, 안전한 프로그램도 일부 거부하고 프로그래머에게 타입 표기를 요구합니다. 동적 타입 언어는 무엇이든 실행해 주지만, 타입 오류는 실행해 봐야 알 수 있습니다. 지금까지 이 책의 언어는 모두 앞쪽, 즉 정적 타입 언어였습니다.

그런데 실제 프로그래밍에서는 둘 중 하나만 고르기 어려운 경우가 많습니다. 빨리 시험해 보는 스크립트는 동적 타입으로 쓰고 싶고, 그 스크립트가 자라서 큰 시스템이 되면 그때부터 조금씩 타입을 붙이고 싶습니다. 한 프로그램 안에서 타입이 있는 부분과 없는 부분을 섞어 쓰고, 타입을 **점점** 늘려 갈 수 있게 하자는 생각이 바로 <a id="g-gradual-typing"></a>**점진적 타입**(gradual typing)입니다.

이 장에서는 [타입 있는 언어](./typed-languages.md)의 TFAE에 "모르는 타입"을 뜻하는 **동적 타입** `?`를 더한 **GTFAE**를 정의합니다. 타입이 같은지 대신 **일관된지**를 묻는 새 관계, 타입 표기를 지워도 프로그램이 망가지지 않는다는 **점진적 보장**, 그리고 실행 중에 검사를 끼워 넣는 **캐스트 삽입**과 잘못을 누구에게 물을지 정하는 **블레임**을 차례로 살펴보고, 모두 Scala로 구현합니다.

## 동기: 정적 타입과 동적 타입 사이에서

### 둘 다 쓰고 싶다

정적 타입과 동적 타입은 각자 장점이 뚜렷합니다. 정적 타입은 오류를 일찍 잡고, 타입이 곧 문서 역할을 하며, 편집기의 자동 완성과 리팩터링을 가능하게 합니다. 동적 타입은 타입을 적을 필요가 없어 빠르게 시작할 수 있고, JSON처럼 모양이 미리 정해지지 않은 데이터를 다루기 편합니다.

그래서 오늘날 널리 쓰이는 언어 중 상당수가 두 방식을 섞습니다.

- **TypeScript**는 JavaScript에 타입을 더한 언어인데, 특별한 타입 `any`가 있습니다. `any` 타입의 값은 어떤 타입의 자리에도 쓸 수 있고, 어떤 타입의 값이든 `any` 자리에 넣을 수 있습니다.
- **Python**은 동적 타입 언어이지만 타입 힌트를 적을 수 있고, mypy 같은 별도의 타입 검사기가 이를 검사합니다. 타입을 모르는 곳에는 `typing.Any`를 씁니다.
- **Dart**에는 `dynamic` 타입이 있고, **C#**에도 4.0부터 `dynamic` 타입이 있습니다.

이 언어들의 `any`, `Any`, `dynamic`은 모두 "이 값의 타입은 정적으로 모른다, 실행해 보고 판단하자"라는 뜻입니다. 이 장의 `?`가 바로 이것입니다.

### `any`가 숨긴 오류

그런데 `any`는 조심해서 써야 합니다. 다음 TypeScript 프로그램을 봅시다.

```typescript
// TypeScript
function inc(x: number): number {
  return x + 1;
}
const input: any = "41";          // e.g. read from a JSON file
const n: number = inc(input);     // accepted by the type checker
console.log(n);                   // 411
console.log(n.toFixed(2));        // TypeError at run time
```

이 프로그램은 `tsc --strict`로 검사해도 오류가 하나도 없습니다. `input`이 `any`이므로 `number`를 받는 `inc`에 넘길 수 있기 때문입니다. 하지만 실행하면 `inc`가 문자열 `"41"`에 `1`을 이어 붙여 `"411"`을 돌려주고, 마지막 줄에서 `TypeError: n.toFixed is not a function`이 납니다. `n`의 타입이 분명히 `number`라고 적혀 있는데도 말이지요.

왜 이런 일이 생길까요? TypeScript는 타입 검사가 끝나면 타입을 모두 지우고 평범한 JavaScript로 바꿔서 실행합니다. 이것을 **타입 소거**(type erasure)라고 합니다. 실행 중에는 아무도 "`inc`에 정말 수가 들어왔는지" 확인하지 않습니다. 그래서 `any`를 통해 잘못된 값이 타입 있는 코드로 들어오면, 오류는 엉뚱한 곳에서, 한참 뒤에 터집니다. [타입 시스템](./type-systems.md) 장의 말로 하면 TypeScript의 타입 시스템은 **건전하지 않습니다**(unsound). 이것은 실수가 아니라 기존 JavaScript 코드와 잘 어울리기 위해 TypeScript가 일부러 고른 설계입니다.

Python도 사정이 같습니다.

```python
# Python
from typing import Any

def inc(x: int) -> int:
    return x + 1

data: Any = "41"        # e.g. json.loads(...)
n: int = inc(data)      # mypy: no error
```

mypy는 이 프로그램에서 아무 문제도 찾지 못하지만, 실행하면 `inc` 안의 `x + 1`에서 `TypeError`가 납니다. 잘못은 `inc`를 부른 쪽에 있는데, 오류는 타입을 성실하게 적은 `inc` 안에서 보고됩니다.

### 건전한 점진적 타입

다른 길도 있습니다. 정적으로 모르는 부분이 정적으로 아는 부분과 만나는 **경계**마다 실행 중 검사를 끼워 넣는 것입니다. 위 예에서라면 `inc(input)`을 부르는 순간 "`input`이 정말 수인가?"를 검사하고, 아니면 바로 그 자리에서 "`input`이 약속을 어겼다"고 보고합니다. 그러면 `number`라고 적힌 변수에는 언제나 정말로 수가 들어 있습니다. 즉 타입 시스템이 다시 건전해집니다.

이것이 Siek과 Taha(2006)가 처음 정리한 **건전한 점진적 타입**의 아이디어이고, 이 장에서 만들 GTFAE도 이 방식을 따릅니다. 정리하면 점진적 타입 언어는 다음 세 가지를 함께 갖추려고 합니다.

1. 타입 표기를 하나도 적지 않으면(모두 `?`로 두면) 동적 타입 언어처럼 동작합니다.
2. 타입 표기를 모두 적으면 정적 타입 언어(여기서는 TFAE)와 똑같이 동작합니다.
3. 그 사이 어디에서든 타입 표기를 하나씩 더하거나 빼도 프로그램이 이상하게 망가지지 않습니다.

> **생각해 보기.** TypeScript에는 `any` 말고 `unknown`이라는 타입도 있습니다. `unknown` 타입의 자리에는 어떤 값이든 넣을 수 있지만, `unknown` 값을 `number` 자리에 쓰려면 먼저 `typeof x === "number"` 같은 검사를 해야 합니다. [서브타입 다형성](./subtype-polymorphism.md)의 최상위 타입 `Top`과 비교하면 `unknown`과 `any` 중 어느 것이 `Top`에 가까울까요?

## GTFAE: 동적 타입을 더한 TFAE

GTFAE는 TFAE에 두 가지를 더한 언어입니다.

1. 정적으로 모르는 타입을 뜻하는 <a id="g-dynamic-type"></a>**동적 타입**(dynamic type) `?`
2. [서브타입 다형성](./subtype-polymorphism.md)의 STFAE처럼 `val`에 붙이는 **선택적 타입 표기**(optional type annotation)

```gtfae
/* GTFAE */
val f = (x: Number) => x + 1;  // fully static, just like TFAE
val g = (x: ?) => x + 1;       // `x` may be anything; checked at run time
val h: ? = f;                  // forget the static type of `f`
g(41) + h(1)                   // 44
```

`g`의 매개변수 `x`는 타입이 `?`이므로 무엇이든 받을 수 있고, 본문에서는 `x`를 수처럼 써도 됩니다. `h`는 `f`의 타입을 일부러 잊어버린 변수인데, 그래도 함수처럼 부를 수 있습니다.

### 구체 문법

TFAE의 구체 문법(concrete syntax)을 다음과 같이 확장합니다.

```bnf
// expressions
<expr> ::= ...
         | "val" <id> [":" <type>]? "=" <expr> ";" <expr>

// types
<type> ::= "(" <type> ")"        // only for precedence
         | "Number"              // number type
         | <type> "=>" <type>    // arrow type
         | "?"                   // dynamic type
```

### 추상 문법

추상 문법(abstract syntax)은 다음과 같습니다.

\\[
\begin{array}{lrrll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots \\\\
& & \mid & \lambda x\texttt{:}\tau.e & (\texttt{Fun}) \\\\
& & \mid & \texttt{val}\ x\ \texttt{=}\ e;\ e & (\texttt{Val}) \\\\
& & \mid & \texttt{val}\ x\texttt{:}\tau\ \texttt{=}\ e;\ e & (\texttt{Val}) \\\\
\text{Types} & \mathbb{T} \ni \tau & ::= & \texttt{num} & (\texttt{NumT}) \\\\
& & \mid & \tau \to \tau & (\texttt{ArrowT}) \\\\
& & \mid & \texttt{?} & (\texttt{DynT})
\end{array}
\\]

```scala
enum Expr:
  ...
  case Fun(param: String, ty: Type, body: Expr)
  case Val(name: String, ty: Option[Type], init: Expr, body: Expr)

enum Type:
  case NumT
  case ArrowT(paramTy: Type, retTy: Type)
  case DynT
```

`?`는 타입의 **어느 자리에든** 올 수 있다는 점이 중요합니다. `? => Number`는 "무엇이든 받아서 수를 돌려주는 함수"이고, `Number => ?`는 "수를 받아서 무엇인지 모를 값을 돌려주는 함수"입니다. 이렇게 일부만 알려진 타입이 있기 때문에 "점진적"으로 타입을 늘려 갈 수 있습니다.

## 타입 일관성

### 같음 대신 일관성

TFAE의 타입 검사기는 `mustSame`으로 두 타입이 **같은지** 확인했습니다. 예를 들어 덧셈 \\(e_1 + e_2\\)에서는 \\(e_1\\)의 타입이 \\(\texttt{num}\\)과 같아야 했습니다. 그런데 GTFAE의 `(x: ?) => x + 1`에서 `x`의 타입은 `?`이고, `?`는 \\(\texttt{num}\\)과 같지 않습니다. 같음을 고집하면 `?`를 쓸 곳이 없습니다.

`?`는 "모른다"는 뜻이므로, 모르는 쪽은 무엇과도 맞을 **수 있다**고 봐야 합니다. 그래서 두 타입이 "모르는 부분을 빼고 보면 서로 어긋나지 않는다"는 관계를 정의합니다. 이것을 <a id="g-type-consistency"></a>**타입 일관성**(type consistency)이라고 하고 \\(\tau \sim \tau'\\)이라고 씁니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{C-Num}$}
\UnaryInfC{$\texttt{num} \sim \texttt{num}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{C-DynL}$}
\UnaryInfC{$\texttt{?} \sim \tau$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{C-DynR}$}
\UnaryInfC{$\tau \sim \texttt{?}$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\tau_1 \sim \tau_3$}
\AxiomC{$\tau_2 \sim \tau_4$}
\LeftLabel{$\texttt{C-Arrow}$}
\BinaryInfC{$\tau_1 \to \tau_2 \sim \tau_3 \to \tau_4$}
\end{prooftree}
\\]

`?`는 어떤 타입과도 일관되고, 화살표 타입끼리는 매개변수 타입끼리, 반환 타입끼리 일관되면 일관됩니다. 몇 가지 예를 봅시다.

\\[
\begin{array}{lcl}
\texttt{num} \sim \texttt{?} & & \texttt{?} \to \texttt{num} \sim \texttt{num} \to \texttt{?} \\\\
\texttt{?} \sim \texttt{num} \to \texttt{num} & & \texttt{num} \not\sim \texttt{num} \to \texttt{num} \\\\
\texttt{num} \to \texttt{?} \sim \texttt{?} & & \texttt{num} \to \texttt{num} \not\sim \texttt{?} \to (\texttt{num} \to \texttt{num})
\end{array}
\\]

오른쪽 아래 예에서 매개변수 쪽은 \\(\texttt{num} \sim \texttt{?}\\)로 괜찮지만, 반환 타입 \\(\texttt{num}\\)과 \\(\texttt{num} \to \texttt{num}\\)이 어긋나므로 일관되지 않습니다. 모르는 부분이 있어도 **아는 부분끼리는** 여전히 정확히 맞아야 합니다.

Scala로는 규칙을 그대로 옮기면 됩니다.

```scala
def consistent(lty: Type, rty: Type): Boolean = (lty, rty) match
  case (DynT, _) | (_, DynT)            => true
  case (NumT, NumT)                     => true
  case (ArrowT(p1, r1), ArrowT(p2, r2)) => consistent(p1, p2) && consistent(r1, r2)
  case _                                => false

def mustConsistent(lty: Type, rty: Type): Unit =
  if (!consistent(lty, rty)) error(s"inconsistent types: ${lty.str} and ${rty.str}")
```

> **자주 하는 실수.** 서브타입 관계에서는 함수 타입의 매개변수 쪽이 **반변**(contravariant)이었습니다. 일관성 관계의 \\(\texttt{C-Arrow}\\)에서는 매개변수 쪽을 뒤집지 않습니다. 일관성은 대칭이라서 뒤집어도 같은 관계이기 때문입니다.

### 반사적이고 대칭적이지만 추이적이지 않다

일관성 관계는 **반사적**입니다(\\(\tau \sim \tau\\)). 그리고 규칙이 좌우 대칭이므로 **대칭적**입니다(\\(\tau \sim \tau'\\)이면 \\(\tau' \sim \tau\\)). 같음 관계와 닮았지요. 그런데 결정적인 차이가 하나 있습니다. 일관성은 **추이적이지 않습니다**.

\\[
\texttt{num} \sim \texttt{?} \qquad \texttt{?} \sim \texttt{num} \to \texttt{num} \qquad \text{but} \qquad \texttt{num} \not\sim \texttt{num} \to \texttt{num}
\\]

<div style="text-align:center">
<svg viewBox="0 0 560 170" width="100%" style="max-width: 560px" role="img" aria-label="Number와 ?는 일관되고 ?와 Number => Number도 일관되지만, Number와 Number => Number는 일관되지 않는다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<rect x="20" y="96" width="120" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="80" y="121" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Number</text>
<rect x="230" y="16" width="100" height="40" rx="4" fill="#2a408e"/>
<text x="280" y="41" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">?</text>
<rect x="380" y="96" width="170" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="465" y="121" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Number =&gt; Number</text>
<line x1="110" y1="96" x2="240" y2="56" stroke="currentColor" stroke-width="1.8"/>
<line x1="320" y1="56" x2="440" y2="96" stroke="currentColor" stroke-width="1.8"/>
<text x="150" y="66" text-anchor="middle">일관됨</text>
<text x="410" y="66" text-anchor="middle">일관됨</text>
<line x1="140" y1="116" x2="380" y2="116" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 5"/>
<text x="265" y="108" text-anchor="middle" font-size="22">×</text>
<text x="265" y="156" text-anchor="middle">일관되지 않음(추이성 없음)</text>
</svg>
</div>

만약 일관성이 추이적이라면, 어떤 두 타입 \\(\tau\\)와 \\(\tau'\\)이든 \\(\tau \sim \texttt{?}\\)와 \\(\texttt{?} \sim \tau'\\)이 성립하므로 \\(\tau \sim \tau'\\)이 됩니다. 즉 **모든 타입이 서로 일관되어** 버립니다. 그러면 `1 + ((x: Number) => x)` 같은 명백한 오류도 통과하고, 타입 검사기는 아무 일도 하지 않게 됩니다. `?`가 연결 고리가 되어 모든 것을 무너뜨리는 셈입니다.

그래서 점진적 타입의 타입 규칙은 서브타입 다형성처럼 "타입 \\(\tau\\)인 식은 \\(\tau\\)와 일관된 어떤 타입으로도 볼 수 있다"는 포섭(subsumption) 규칙을 두면 **안 됩니다**. 포섭 규칙을 두 번 연달아 쓰면 바로 추이성을 쓴 것과 같아지기 때문입니다. 대신 일관성은 타입이 만나는 자리(덧셈의 피연산자, 함수의 인자 등)에서 **한 번만** 확인합니다.

> **생각해 보기.** 서브타입 관계 \\(<:\\)는 추이적이어도 괜찮았습니다. 무엇이 다를까요? 서브타입 관계에서는 최상위 타입 `Top`의 값을 다른 타입 자리에 쓸 수 **없었습니다**. `?`는 위로도 아래로도 갈 수 있는 타입이라는 점을 떠올려 보세요.

## 타입 규칙과 타입 검사기

이제 TFAE의 타입 규칙에서 같음을 일관성으로 바꿉니다. 수, 식별자, 함수 정의 규칙은 TFAE와 똑같습니다.

### 덧셈과 곱셈

덧셈의 피연산자는 \\(\texttt{num}\\)과 **같을** 필요 없이 **일관되기만** 하면 됩니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \tau_1 \quad \tau_1 \sim \texttt{num}$}
\AxiomC{$\Gamma \vdash e_2 : \tau_2 \quad \tau_2 \sim \texttt{num}$}
\LeftLabel{$\tau\texttt{-Add}$}
\BinaryInfC{$\Gamma \vdash e_1 + e_2 : \texttt{num}$}
\end{prooftree}
\\]

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Add(left, right) =>
    mustConsistent(typeCheck(left, tenv), NumT)
    mustConsistent(typeCheck(right, tenv), NumT)
    NumT
```

곱셈 \\(\tau\texttt{-Mul}\\)도 같습니다. \\(\texttt{num}\\)과 일관된 타입은 \\(\texttt{num}\\)과 \\(\texttt{?}\\)뿐이므로, 이 규칙은 "피연산자가 수이거나, 수인지 모르는 것"을 허락합니다. 피연산자가 함수 타입이면 여전히 타입 오류입니다.

### 함수 적용

함수 적용은 조금 더 생각해야 합니다. \\(e_0(e_1)\\)에서 \\(e_0\\)의 타입이 \\(\tau_1 \to \tau_2\\)이면 TFAE처럼 처리하되, 인자의 타입이 \\(\tau_1\\)과 일관되는지 확인하면 됩니다. 그런데 \\(e_0\\)의 타입이 \\(\texttt{?}\\)이면 어떻게 할까요? 함수인지 모르지만 함수일 **수도** 있으므로 허락해야 합니다. 이때는 \\(e_0\\)를 \\(\texttt{?} \to \texttt{?}\\) 타입, 즉 "무엇이든 받아서 무엇인지 모를 값을 돌려주는 함수"로 봅니다.

이 두 경우를 묶어 주는 보조 관계를 <a id="g-matching"></a>**매칭**(matching)이라고 부르고 \\(\tau \triangleright \tau_1 \to \tau_2\\)라고 씁니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{M-Arrow}$}
\UnaryInfC{$\tau_1 \to \tau_2 \triangleright \tau_1 \to \tau_2$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{M-Dyn}$}
\UnaryInfC{$\texttt{?} \triangleright \texttt{?} \to \texttt{?}$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : \tau_0 \quad \tau_0 \triangleright \tau_1 \to \tau_2$}
\AxiomC{$\Gamma \vdash e_1 : \tau_3 \quad \tau_3 \sim \tau_1$}
\LeftLabel{$\tau\texttt{-App}$}
\BinaryInfC{$\Gamma \vdash e_0(e_1) : \tau_2$}
\end{prooftree}
\\]

```scala
def matchArrow(ty: Type): (Type, Type) = ty match
  case ArrowT(paramTy, retTy) => (paramTy, retTy)
  case DynT                   => (DynT, DynT)
  case _                      => error(s"not a function type: ${ty.str}")

def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case App(fun, arg) =>
    val (paramTy, retTy) = matchArrow(typeCheck(fun, tenv))
    mustConsistent(typeCheck(arg, tenv), paramTy)
    retTy
```

\\(e_0\\)가 \\(\texttt{num}\\) 타입이면 매칭이 실패하므로 `1(2)` 같은 식은 여전히 거부됩니다.

> **생각해 보기.** 매칭 대신 "\\(\tau_0 \sim \tau_3 \to \tau_2\\)"라는 전제 하나로 \\(\tau\texttt{-App}\\)을 쓸 수도 있을까요? 이때 결론의 타입 \\(\tau_2\\)는 어디서 오는지 생각해 보면, 매칭이 왜 편리한지 알 수 있습니다.

### 타입 표기가 있는 변수 정의

`val`에 타입 표기가 없으면 TFAE와 같습니다. 타입 표기 \\(\tau\\)가 있으면 초기값의 타입이 \\(\tau\\)와 일관되는지 확인하고, 변수에는 **표기한** 타입 \\(\tau\\)를 붙입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \tau_1 \quad \tau_1 \sim \tau$}
\AxiomC{$\Gamma[x : \tau] \vdash e_2 : \tau_2$}
\LeftLabel{$\tau\texttt{-Val}\_{\tau}$}
\BinaryInfC{$\Gamma \vdash \texttt{val}\ x\texttt{:}\tau\ \texttt{=}\ e_1;\ e_2 : \tau_2$}
\end{prooftree}
\\]

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Val(x, None, init, body) =>
    typeCheck(body, tenv + (x -> typeCheck(init, tenv)))
  case Val(x, Some(ty), init, body) =>
    mustConsistent(typeCheck(init, tenv), ty)
    typeCheck(body, tenv + (x -> ty))
```

그래서 `val h: ? = f; ...`라고 쓰면 `f`의 정적 타입을 잊고 `h`를 `?` 타입으로 다룹니다. 반대로 `val n: Number = d; ...`처럼 `?` 타입의 `d`를 `Number` 변수에 넣는 것도 허락됩니다.

### 예제

다음 식의 타입을 유도해 봅시다.

```gtfae
/* GTFAE */
((x: ?) => x + 1)(41)             // 42: Number
```

\\(\Gamma_1 = [x : \texttt{?}]\\)이라고 하면, 함수 부분의 유도는 다음과 같습니다(\\(\tau\texttt{-Id}\\)와 \\(\tau\texttt{-Num}\\)으로 끝나는 맨 위 가지는 생략했습니다).

\\[
\begin{prooftree}
\AxiomC{$\Gamma_1 \vdash x : \texttt{?} \quad \texttt{?} \sim \texttt{num}$}
\AxiomC{$\Gamma_1 \vdash 1 : \texttt{num} \quad \texttt{num} \sim \texttt{num}$}
\LeftLabel{$\tau\texttt{-Add}$}
\BinaryInfC{$\Gamma_1 \vdash x + 1 : \texttt{num}$}
\LeftLabel{$\tau\texttt{-Fun}$}
\UnaryInfC{$\varnothing \vdash \lambda x\texttt{:}\texttt{?}.x + 1 : \texttt{?} \to \texttt{num}$}
\end{prooftree}
\\]

이 함수의 타입 \\(\texttt{?} \to \texttt{num}\\)은 \\(\texttt{M-Arrow}\\)로 자기 자신과 매칭되고, 인자 `41`의 타입 \\(\texttt{num}\\)은 매개변수 타입 \\(\texttt{?}\\)와 일관되므로 \\(\tau\texttt{-App}\\)에 의해 전체 타입은 \\(\texttt{num}\\)입니다. `x`가 무엇인지 몰라도 `x + 1`의 결과는(계산이 성공한다면) 반드시 수이므로, 전체 타입을 \\(\texttt{num}\\)이라고 말할 수 있다는 점이 흥미롭습니다.

반면 다음 식들은 GTFAE에서도 거부됩니다.

```gtfae
/* GTFAE */
1 + ((x: Number) => x)            // Number => Number is not consistent with Number
((x: Number) => x)((y: ?) => y)   // ? => ? is not consistent with Number
```

두 번째 식의 인자 `(y: ?) => y`는 매개변수 타입이 `?`이지만, 적어도 **함수**라는 것은 압니다. 그리고 함수는 결코 수가 될 수 없으므로 \\(\texttt{?} \to \texttt{?} \not\sim \texttt{num}\\)입니다. `?`를 쓴다고 타입 검사가 꺼지는 것이 아니라, 정적으로 아는 정보만큼은 끝까지 검사합니다.

## 정확도와 점진적 보장

### 더 정확한 타입

`Number => Number`, `? => Number`, `?`는 모두 `(x: Number) => x + 1`에 붙일 수 있는 타입이지만, 담고 있는 정보의 양이 다릅니다. `Number => Number`가 가장 많이 알려 주고 `?`는 아무것도 알려 주지 않습니다. 타입의 일부를 `?`로 바꾸면 정보가 줄어드는데, 이 관계를 <a id="g-precision"></a>**정확도**(precision) 관계라고 하고 \\(\tau \sqsubseteq \tau'\\)이라고 씁니다. "\\(\tau\\)가 \\(\tau'\\)보다 더 정확하다(또는 같다)", 거꾸로 말해 "\\(\tau'\\)은 \\(\tau\\)의 일부를 \\(\texttt{?}\\)로 바꾼 것이다"라고 읽습니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{P-Num}$}
\UnaryInfC{$\texttt{num} \sqsubseteq \texttt{num}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{P-Dyn}$}
\UnaryInfC{$\tau \sqsubseteq \texttt{?}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\tau_1 \sqsubseteq \tau_3$}
\AxiomC{$\tau_2 \sqsubseteq \tau_4$}
\LeftLabel{$\texttt{P-Arrow}$}
\BinaryInfC{$\tau_1 \to \tau_2 \sqsubseteq \tau_3 \to \tau_4$}
\end{prooftree}
\\]

일관성과 달리 정확도는 반사적이고, 추이적이며, 반대칭적인 **부분 순서**입니다. 그림으로 그리면 \\(\texttt{?}\\)가 맨 위에 있고, 아래로 내려갈수록 더 정확한 타입이 됩니다.

<div style="text-align:center">
<svg viewBox="0 0 600 300" width="100%" style="max-width: 600px" role="img" aria-label="정확도 순서: 맨 위에 ?, 그 아래 Number와 ? => ?, ? => ? 아래에 Number => ?와 ? => Number, 맨 아래에 Number => Number. 아래로 갈수록 더 정확하다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="gradual-typing-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="230" y="16" width="100" height="36" rx="4" fill="#2a408e"/>
<text x="280" y="39" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">?</text>
<rect x="110" y="96" width="110" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="165" y="119" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Number</text>
<rect x="320" y="96" width="110" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="375" y="119" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">? =&gt; ?</text>
<rect x="220" y="176" width="130" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="285" y="199" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Number =&gt; ?</text>
<rect x="400" y="176" width="130" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="465" y="199" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">? =&gt; Number</text>
<rect x="290" y="254" width="170" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="375" y="277" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Number =&gt; Number</text>
<line x1="180" y1="96" x2="255" y2="52" stroke="currentColor" stroke-width="1.5"/>
<line x1="360" y1="96" x2="305" y2="52" stroke="currentColor" stroke-width="1.5"/>
<line x1="295" y1="176" x2="355" y2="132" stroke="currentColor" stroke-width="1.5"/>
<line x1="455" y1="176" x2="395" y2="132" stroke="currentColor" stroke-width="1.5"/>
<line x1="350" y1="254" x2="295" y2="212" stroke="currentColor" stroke-width="1.5"/>
<line x1="400" y1="254" x2="455" y2="212" stroke="currentColor" stroke-width="1.5"/>
<polyline points="40,50 40,270" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#gradual-typing-1)"/>
<text x="30" y="38" text-anchor="start" font-size="14">덜 정확함</text>
<text x="30" y="292" text-anchor="start" font-size="14">더 정확함</text>
</svg>
</div>
<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 정확도 순서의 일부. 선으로 이어진 두 타입 중 아래쪽이 더 정확합니다.</p>

이 그림으로 일관성을 다시 볼 수도 있습니다. 두 타입이 일관되는 것은 **둘보다 모두 더 정확한(또는 같은) 타입이 하나 있을 때**와 같습니다. 예를 들어 `Number => ?`와 `? => Number`는 둘 다 `Number => Number` 위에 있으므로 일관되고, `Number`와 `? => ?`는 둘 아래에 공통인 타입이 없으므로 일관되지 않습니다. 직관적으로 말하면 "두 타입의 `?`를 잘 채워서 같은 타입으로 만들 수 있으면 일관된다"는 뜻입니다.

> **자주 하는 실수.** 글마다 \\(\sqsubseteq\\)의 방향이 반대인 경우가 있습니다(\\(\texttt{?}\\)를 맨 아래에 두는 "정보 순서"). 이 장에서는 \\(\texttt{?}\\)가 맨 위이고 \\(\tau \sqsubseteq \tau'\\)은 "\\(\tau\\)가 더 정확하다"는 뜻입니다. 다른 글을 읽을 때는 정의부터 확인하세요.

프로그램끼리도 정확도를 정의할 수 있습니다. 프로그램 \\(e'\\)이 \\(e\\)와 모양이 같고 타입 표기만 같거나 덜 정확할 때 \\(e \sqsubseteq e'\\)이라고 씁니다. 예를 들어 `(f: Number => Number) => f(1)`보다 `(f: ? => Number) => f(1)`이, 그보다 `(f: ?) => f(1)`이 덜 정확합니다.

### 점진적 보장

이제 앞에서 바란 세 번째 성질, "타입 표기를 더하거나 빼도 프로그램이 이상하게 망가지지 않는다"를 정확히 말할 수 있습니다. Siek, Vitousek, Cimini, Boyland(2015)는 이를 <a id="g-gradual-guarantee"></a>**점진적 보장**(gradual guarantee)이라는 이름으로 정리했습니다. 먼저 타입 검사에 대한 성질입니다.

> <a id="g-static-gradual-guarantee"></a>**정적 점진적 보장(static gradual guarantee).** \\(\vdash e : \tau\\)이고 \\(e \sqsubseteq e'\\)이면, 어떤 \\(\tau'\\)에 대해 \\(\vdash e' : \tau'\\)이고 \\(\tau \sqsubseteq \tau'\\)이다.

즉 타입 검사를 통과한 프로그램에서 타입 표기를 **덜 정확하게** 바꿔도(일부를 `?`로 바꿔도) 여전히 타입 검사를 통과하고, 전체 타입은 원래 타입과 같거나 덜 정확해질 뿐입니다. 거꾸로 말하면, 타입 오류는 타입 표기를 **더 정확하게** 바꿔서 정보가 늘어날 때만 새로 생길 수 있습니다. 예를 들어 다음 세 프로그램은 (1)에서(3)으로 갈수록 덜 정확하며, 모두 타입 검사를 통과합니다.

```gtfae
/* GTFAE */
// (1) result: 3: Number
val twice = (f: Number => Number) => (x: Number) => f(f(x));
twice((y: Number) => y + 1)(1)

// (2) result: 3: ?
val twice = (f: ?) => (x: Number) => f(f(x));
twice((y: Number) => y + 1)(1)

// (3) result: 3: ?
val twice = (f: ?) => (x: ?) => f(f(x));
twice((y: ?) => y + 1)(1)
```

`f`가 `?`가 되자 `f(f(x))`의 타입이 `?`가 되어, 전체 타입이 \\(\texttt{num}\\)에서 \\(\texttt{?}\\)로 바뀌었습니다. \\(\texttt{num} \sqsubseteq \texttt{?}\\)이므로 정적 점진적 보장이 말한 그대로입니다.

실행에 대해서도 비슷한 성질이 있습니다. 다음 절에서 볼 실행 중 검사가 실패하는 것을 **캐스트 오류**라고 할 때, 다음이 성립합니다.

> <a id="g-dynamic-gradual-guarantee"></a>**동적 점진적 보장(dynamic gradual guarantee).** \\(\vdash e : \tau\\)이고 \\(e \sqsubseteq e'\\)이라고 하자.
> 1. \\(e\\)가 값 \\(v\\)로 계산되면, \\(e'\\)도 값 \\(v'\\)으로 계산되고 \\(v \sqsubseteq v'\\)이다. \\(e\\)가 끝나지 않으면 \\(e'\\)도 끝나지 않는다.
> 2. \\(e'\\)이 값 \\(v'\\)으로 계산되면, \\(e\\)는 \\(v \sqsubseteq v'\\)인 값 \\(v\\)로 계산되거나 **캐스트 오류**를 낸다. \\(e'\\)이 끝나지 않으면 \\(e\\)는 끝나지 않거나 캐스트 오류를 낸다.

(값의 정확도 \\(v \sqsubseteq v'\\)은 "실행 중 검사를 걷어 내면 같은 값"이라는 뜻으로 이해하면 충분합니다. 수라면 그냥 같은 수입니다.) 첫 번째는 타입 표기를 덜 정확하게 바꿔도 결과가 바뀌지 않는다는 뜻이고, 두 번째는 타입 표기를 더 정확하게 바꾸면 **캐스트 오류가 새로 생길 수는 있지만 그 밖의 결과는 바뀌지 않는다**는 뜻입니다. 더 정확한 타입은 더 많은 약속이고, 약속이 많으면 어길 기회도 많아지기 때문입니다.

```gtfae
/* GTFAE */
val bad = (f: ?) => f(f); bad((x: ?) => 1)        // 1: ?
val bad = (f: ?) => f(f); bad((x: Number) => 1)   // cast error
```

두 번째 프로그램은 `x`에 `Number`라는 더 정확한 타입을 붙였을 뿐인데 캐스트 오류가 납니다. `bad`가 함수 `f`에 함수 `f` 자신을 넘기는데, `f`는 수만 받겠다고 약속했기 때문입니다. 이 오류가 정확히 어디서, 누구의 잘못으로 보고되는지는 다음 절에서 봅니다.

> **생각해 보기.** 동적 점진적 보장은 그럴듯해 보이지만, 언어에 기능이 늘어나면 깨지기 쉽습니다. 예를 들어 값의 **정적 타입**을 실행 중에 물어볼 수 있는 연산(`typeOf(e)`)이 있으면 어떻게 될까요? `typeOf(f)`가 `Number => Number`일 때와 `?`일 때 서로 다른 일을 하는 프로그램을 떠올려 보세요.

## 캐스트 삽입과 캐스트 계산법

### 의미를 어떻게 줄까

타입 규칙은 정했으니 이제 의미를 정할 차례입니다. TFAE에서는 인터프리터가 타입 표기를 그냥 무시했습니다. GTFAE에서도 그렇게 하면 어떻게 될까요? 그것이 바로 TypeScript의 방식입니다. `((x: ?) => x + 1)((y: Number) => y)`는 타입 검사를 통과하지만, 실행하면 덧셈에서 함수를 만나 `invalid operation` 오류가 납니다. 타입 검사를 통과한 프로그램이 [타입 시스템](./type-systems.md) 장에서 말한 타입 오류를 일으키는 것이니, 타입 안전성이 깨집니다.

건전한 점진적 타입 언어는 대신 다음 두 단계를 거칩니다.

1. **캐스트 삽입**: 타입 검사를 하면서, 정적 타입이 일관되기만 하고 같지는 않은 곳마다 실행 중 검사를 끼워 넣은 새 프로그램을 만듭니다.
2. 그 새 프로그램을 실행 중 검사가 있는 언어, 즉 **캐스트 계산법**의 인터프리터로 실행합니다.

<div style="text-align:center">
<svg viewBox="0 0 640 150" width="100%" style="max-width: 640px" role="img" aria-label="GTFAE 프로그램을 타입 검사하고 캐스트를 끼워 넣은 뒤 interp로 실행하면 값 또는 캐스트 오류가 나온다. 타입 검사에 실패하면 타입 오류로 거부한다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="gradual-typing-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="40" y="76" text-anchor="middle" font-weight="bold">GTFAE</text>
<text x="40" y="96" text-anchor="middle" font-size="13">프로그램</text>
<polyline points="80,82 108,82" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#gradual-typing-2)"/>
<rect x="110" y="56" width="140" height="52" rx="4" fill="#2a408e"/>
<text x="180" y="78" text-anchor="middle" fill="#fff">타입 검사 +</text>
<text x="180" y="98" text-anchor="middle" fill="#fff">캐스트 삽입</text>
<polyline points="180,56 180,30 222,30" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#gradual-typing-2)"/>
<text x="230" y="35" text-anchor="start">타입 오류(거부)</text>
<polyline points="250,82 290,82" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#gradual-typing-2)"/>
<text x="345" y="76" text-anchor="middle" font-weight="bold">캐스트가 있는</text>
<text x="345" y="96" text-anchor="middle" font-weight="bold">프로그램</text>
<polyline points="400,82 428,82" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#gradual-typing-2)"/>
<rect x="430" y="56" width="100" height="52" rx="4" fill="#2a408e"/>
<text x="480" y="87" text-anchor="middle" fill="#fff">interp</text>
<polyline points="530,72 560,58" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#gradual-typing-2)"/>
<polyline points="530,92 560,106" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#gradual-typing-2)"/>
<text x="566" y="60" text-anchor="start">값</text>
<text x="566" y="112" text-anchor="start">캐스트 오류</text>
<text x="566" y="130" text-anchor="start" font-size="13">(블레임 ℓ)</text>
</svg>
</div>

### 캐스트

**캐스트**(cast)는 "이 값은 정적 타입이 \\(\tau\\)였는데, 이제부터 \\(\tau'\\)로 쓰겠다. 실행 중에 확인해 달라"는 표시입니다. <a id="g-cast-calculus"></a>**캐스트 계산법**(cast calculus)은 GTFAE의 식에 캐스트를 더한 언어입니다.

\\[
\begin{array}{lrrll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots \\\\
& & \mid & e : \tau \Rightarrow^{\ell} \tau & (\texttt{Cast})
\end{array}
\\]

\\(e : \tau \Rightarrow^{\ell} \tau'\\)은 "타입이 \\(\tau\\)인 식 \\(e\\)의 값을 타입 \\(\tau'\\)로 바꾸어 쓴다"는 뜻입니다. 이 화살표 \\(\Rightarrow\\)는 계산 판단 \\(\sigma \vdash e \Rightarrow v\\)의 화살표와 모양은 같지만 캐스트의 일부입니다. 헷갈리지 않도록 계산 규칙에서는 캐스트를 괄호로 감싸 씁니다. 위첨자 \\(\ell\\)은 <a id="g-blame-label"></a>**블레임 레이블**(blame label)로, 이 캐스트가 원래 프로그램의 **어디에** 끼워졌는지를 기억합니다. 캐스트가 실패하면 이 레이블로 누구의 잘못인지, 즉 누구에게 <a id="g-blame"></a>**블레임**(blame)을 돌릴지 보고합니다. 캐스트는 언제나 서로 **일관된** 두 타입 사이에만 넣습니다.

```scala
enum Expr:
  ...
  case Cast(expr: Expr, from: Type, to: Type, label: Label) // cast calculus only

case class Label(at: String, positive: Boolean = true):
  def neg: Label = copy(positive = !positive)
  def str: String = if (positive) s"`$at`" else s"the context of `$at`"
```

레이블에는 캐스트를 끼운 원래 식의 텍스트(`at`)와 **극성**(`positive`)이 들어 있습니다. 극성이 무엇인지는 함수 캐스트에서 설명합니다.

### 캐스트 삽입

<a id="g-cast-insertion"></a>**캐스트 삽입**(cast insertion)은 타입 검사와 같은 구조로 식을 훑으면서, 일관성을 확인한 자리마다 캐스트를 넣습니다. 판단은 \\(\Gamma \vdash e \rightsquigarrow e' : \tau\\)로 쓰고, "\\(\Gamma\\)에서 \\(e\\)는 타입 \\(\tau\\)이고 캐스트를 넣으면 \\(e'\\)이 된다"라고 읽습니다. 덧셈에서는 두 피연산자를 \\(\texttt{num}\\)으로 캐스트합니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 \rightsquigarrow e_1' : \tau_1$}
\AxiomC{$\Gamma \vdash e_2 \rightsquigarrow e_2' : \tau_2$}
\LeftLabel{$\texttt{I-Add}$}
\BinaryInfC{$\Gamma \vdash e_1 + e_2 \rightsquigarrow (e_1' : \tau_1 \Rightarrow^{\ell_1} \texttt{num}) + (e_2' : \tau_2 \Rightarrow^{\ell_2} \texttt{num}) : \texttt{num}$}
\end{prooftree}
\\]

함수 적용에서는 함수 쪽을 매칭된 화살표 타입으로, 인자 쪽을 매개변수 타입으로 캐스트합니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 \rightsquigarrow e_0' : \tau_0 \quad \tau_0 \triangleright \tau_1 \to \tau_2$}
\AxiomC{$\Gamma \vdash e_1 \rightsquigarrow e_1' : \tau_3$}
\LeftLabel{$\texttt{I-App}$}
\BinaryInfC{$\Gamma \vdash e_0(e_1) \rightsquigarrow (e_0' : \tau_0 \Rightarrow^{\ell_0} \tau_1 \to \tau_2)(e_1' : \tau_3 \Rightarrow^{\ell_1} \tau_1) : \tau_2$}
\end{prooftree}
\\]

여기서 레이블 \\(\ell_0\\), \\(\ell_1\\), \\(\ell_2\\)는 각각 원래 식 \\(e_0\\), \\(e_1\\), \\(e_2\\)의 위치를 가리킵니다. 규칙에 일관성 조건(\\(\tau_1 \sim \texttt{num}\\), \\(\tau_3 \sim \tau_1\\) 등)은 적지 않았지만, 타입 규칙과 같은 조건을 확인한다고 생각하면 됩니다. 타입 표기가 있는 `val`은 초기값을 표기한 타입으로 캐스트하고(\\(\texttt{I-Val}\_{\tau}\\)), 나머지 경우는 하위 식에 캐스트를 넣고 구조를 그대로 유지합니다. 구현에서는 두 타입이 **같으면** 캐스트를 생략합니다. 같은 타입 사이의 캐스트는 아무 일도 하지 않기 때문입니다.

```scala
def castTo(expr: Expr, from: Type, to: Type, l: Label): Expr =
  if (from == to) expr else Cast(expr, from, to, l)

def insert(expr: Expr, tenv: TypeEnv): (Expr, Type) = expr match
  case Num(n) => (Num(n), NumT)
  case Add(left, right) =>
    val (l, lty) = insert(left, tenv)
    val (r, rty) = insert(right, tenv)
    (Add(castTo(l, lty, NumT, Label(left.str)),
         castTo(r, rty, NumT, Label(right.str))), NumT)
  ...
  case Id(x) => (Id(x), tenv.getOrElse(x, error(s"free identifier: $x")))
  case Fun(param, paramTy, body) =>
    val (b, retTy) = insert(body, tenv + (param -> paramTy))
    (Fun(param, paramTy, b), ArrowT(paramTy, retTy))
  case App(fun, arg) =>
    val (f, fty) = insert(fun, tenv)
    val (a, aty) = insert(arg, tenv)
    val (paramTy, retTy) = matchArrow(fty)
    (App(castTo(f, fty, ArrowT(paramTy, retTy), Label(fun.str)),
         castTo(a, aty, paramTy, Label(arg.str))), retTy)
  case Val(x, Some(ty), init, body) =>
    val (i, ity) = insert(init, tenv)
    val (b, bty) = insert(body, tenv + (x -> ty))
    (Val(x, Some(ty), castTo(i, ity, ty, Label(init.str)), b), bty)
  ...
```

`insert`가 돌려주는 타입은 언제나 `typeCheck`의 결과와 같습니다. 이 장의 구현은 두 결과가 같은지 `assert`로 확인합니다. 일관성 검사 `mustConsistent`는 `typeCheck`에서 이미 했으므로 `insert`에서는 생략했습니다. 몇 가지 예를 봅시다(캐스트 \\(e : \tau \Rightarrow^{\ell} \tau'\\)은 `<e : τ ==> τ'>`로 출력합니다).

```scala
insert("val f = (x: Number) => x + 1; f(1) + f(2)")
// val f = (x: Number) => x + 1; f(1) + f(2)
insert("((x: ?) => x + 1)(41)")
// ((x: ?) => <x : ? ==> Number> + 1)(<41 : Number ==> ?>)
insert("((x: ?) => x + 1)((y: Number) => y)")
// ((x: ?) => <x : ? ==> Number> + 1)(<(y: Number) => y : (Number => Number) ==> ?>)
```

첫 번째 프로그램은 완전히 정적이라서 캐스트가 **하나도** 들어가지 않습니다. 그래서 TFAE와 똑같이 실행되고, 실행 중 검사 비용도 전혀 없습니다. 두 번째와 세 번째는 `?`와 정적인 타입이 만나는 두 곳, 즉 `x`를 수로 쓰는 곳과 인자를 `?` 매개변수에 넘기는 곳에 캐스트가 들어갔습니다.

### 값과 꼬리표

캐스트를 실행하려면 실행 중에 값이 어떤 타입인지 알 수 있어야 합니다. 수와 클로저만으로는 부족합니다. `?` 타입의 값이 원래 수였는지 함수였는지 표시해 두어야, 나중에 `? ==> Number` 캐스트에서 확인할 수 있기 때문입니다.

그래서 값이 `?`로 들어갈 때 **꼬리표**(tag)를 붙입니다. 꼬리표로는 타입 전체가 아니라 가장 바깥 모양만 기록하는 <a id="g-ground-type"></a>**그라운드 타입**(ground type) \\(G\\)를 씁니다.

\\[
\begin{array}{lrrl}
\text{Ground Types} & G & ::= & \texttt{num} \mid \texttt{?} \to \texttt{?} \\\\
\text{Values} & v & ::= & n \mid \langle \lambda x.e, \sigma \rangle \mid \langle v : \tau_1 \to \tau_2 \Rightarrow^{\ell} \tau_3 \to \tau_4 \rangle \mid \langle v : G \Rightarrow \texttt{?} \rangle
\end{array}
\\]

\\(\langle v : G \Rightarrow \texttt{?} \rangle\\)는 꼬리표 \\(G\\)가 붙은 `?` 타입의 값입니다. 화살표 타입은 무엇이든 꼬리표로는 \\(\texttt{?} \to \texttt{?}\\)를 씁니다. 함수의 매개변수와 반환 타입은 실행 중에 바로 확인할 수 없기 때문입니다(이것이 곧 볼 프록시가 필요한 이유입니다). \\(\langle v : \tau_1 \to \tau_2 \Rightarrow^{\ell} \tau_3 \to \tau_4 \rangle\\)은 함수 \\(v\\)를 감싼 <a id="g-proxy"></a>**프록시**(proxy)입니다.

```scala
enum Value:
  case NumV(n: BigInt)
  case CloV(param: String, body: Expr, env: Env)
  case ProxyV(fun: Value, from: Type, to: Type, label: Label)
  case DynV(value: Value, ground: Type)

def ground(ty: Type): Type = ty match
  case NumT         => NumT
  case ArrowT(_, _) => ArrowT(DynT, DynT)
  case DynT         => error("no ground type for ?")
```

### 캐스트의 실행

이제 값 \\(v\\)를 \\(\tau\\)에서 \\(\tau'\\)로 캐스트하는 함수 \\(\mathit{cast}(v, \tau, \tau', \ell)\\)을 정의합니다. 결과는 값이거나, 캐스트 오류 \\(\texttt{blame}\ \ell\\)입니다. 위에서부터 처음 맞는 줄을 씁니다.

\\[
\begin{array}{lcll}
\mathit{cast}(v, \tau, \tau, \ell) & = & v & \\\\
\mathit{cast}(v, \tau_1 \to \tau_2, \tau_3 \to \tau_4, \ell) & = & \langle v : \tau_1 \to \tau_2 \Rightarrow^{\ell} \tau_3 \to \tau_4 \rangle & \\\\
\mathit{cast}(v, \tau, \texttt{?}, \ell) & = & \langle \mathit{cast}(v, \tau, G, \ell) : G \Rightarrow \texttt{?} \rangle & \text{where } G = \mathit{ground}(\tau) \\\\
\mathit{cast}(\langle v : G \Rightarrow \texttt{?} \rangle, \texttt{?}, \tau, \ell) & = & \mathit{cast}(v, G, \tau, \ell) & \text{if } G = \mathit{ground}(\tau) \\\\
\mathit{cast}(\langle v : G \Rightarrow \texttt{?} \rangle, \texttt{?}, \tau, \ell) & = & \texttt{blame}\ \ell & \text{otherwise}
\end{array}
\\]

한 줄씩 읽어 봅시다.

1. 같은 타입 사이의 캐스트는 아무 일도 하지 않습니다.
2. 함수에서 함수로 가는 캐스트는 지금 당장 확인할 수 없습니다. 함수가 어떤 인자에 무엇을 돌려줄지는 불러 봐야 알기 때문입니다. 그래서 함수를 **프록시**로 감싸 두고, 나중에 불릴 때 확인합니다.
3. `?`로 가는 캐스트는 꼬리표를 붙입니다. 화살표 타입이면 먼저 \\(\texttt{?} \to \texttt{?}\\)로 캐스트(프록시로 감싸기)한 뒤 꼬리표를 붙입니다.
4. `?`에서 나오는 캐스트는 꼬리표를 확인합니다. 꼬리표가 목표 타입의 그라운드 타입과 같으면 꼬리표를 떼고 나머지 캐스트를 계속합니다.
5. 꼬리표가 다르면 실패하고, 레이블 \\(\ell\\)이 가리키는 곳에 잘못을 묻습니다.

```scala
def cast(v: Value, from: Type, to: Type, l: Label): Value = (from, to) match
  case _ if from == to              => v
  case (ArrowT(_, _), ArrowT(_, _)) => ProxyV(v, from, to, l)
  case (_, DynT) =>
    val g = ground(from)
    DynV(cast(v, from, g, l), g)
  case (DynT, _) => v match
    case DynV(w, g) if g == ground(to) => cast(w, g, to, l)
    case DynV(w, g) =>
      throw Blame(l, s"blame ${l.str}: expected ${to.str}, got ${g.str}")
    case _ => error(s"not a tagged value: ${v.str}")
  case _ => error(s"inconsistent cast: ${from.str} => ${to.str}")
```

마지막 두 `error`는 캐스트 삽입이 올바르다면 결코 실행되지 않습니다. `?` 타입의 값에는 언제나 꼬리표가 붙어 있고, 캐스트는 일관된 타입 사이에만 들어가기 때문입니다. 캐스트 오류는 `Blame`이라는 예외(`case class Blame(label: Label, msg: String) extends Exception(msg)`)로 던져서, 계산 중 어디서 나든 그대로 맨 밖까지 전파되게 합니다.

### 프록시와 블레임의 극성

함수 캐스트를 감싼 프록시는 불릴 때 다음과 같이 동작합니다. 프록시 \\(\langle v : \tau_1 \to \tau_2 \Rightarrow^{\ell} \tau_3 \to \tau_4 \rangle\\)는 바깥에서 보면 \\(\tau_3 \to \tau_4\\) 타입의 함수입니다. 그래서

1. 받은 인자(타입 \\(\tau_3\\))를 안쪽 함수가 기대하는 \\(\tau_1\\)로 캐스트해서 안쪽 함수 \\(v\\)에 넘기고,
2. 안쪽 함수의 결과(타입 \\(\tau_2\\))를 바깥에 약속한 \\(\tau_4\\)로 캐스트해서 돌려줍니다.

두 캐스트의 방향이 반대라는 데 주목하세요. 인자는 바깥에서 안으로, 결과는 안에서 바깥으로 흐릅니다. 결과 캐스트가 실패하면 **안쪽 함수**가 약속을 어긴 것이고, 인자 캐스트가 실패하면 함수를 **부른 쪽**(문맥)이 잘못된 인자를 넘긴 것입니다. 그래서 인자 캐스트에는 레이블 \\(\ell\\)의 극성을 뒤집은 \\(\bar{\ell}\\)을 씁니다. 원래 극성의 레이블로 받는 블레임을 <a id="g-positive-blame"></a>**양의 블레임**(positive blame), 뒤집힌 레이블로 받는 블레임을 <a id="g-negative-blame"></a>**음의 블레임**(negative blame)이라고 합니다. 양의 블레임은 캐스트 **안의 식**이, 음의 블레임은 그 식을 **쓰는 문맥**이 잘못했다는 뜻입니다.

<div style="text-align:center">
<svg viewBox="0 0 620 200" width="100%" style="max-width: 620px" role="img" aria-label="프록시는 안쪽 함수 g를 감싼다. 인자는 Number에서 ?로 캐스트되어 들어가고 실패하면 부른 쪽이 블레임받는다. 결과는 ?에서 Number로 캐스트되어 나오고 실패하면 g가 블레임받는다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="gradual-typing-3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="150" y="34" width="320" height="146" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="6 4"/>
<text x="310" y="22" text-anchor="middle" font-size="14">프록시: 바깥에서 보면 Number =&gt; Number (레이블 ℓ = g)</text>
<rect x="250" y="75" width="120" height="60" rx="4" fill="#2a408e"/>
<text x="310" y="100" text-anchor="middle" fill="#fff" font-family="ui-monospace, Menlo, monospace">g</text>
<text x="310" y="120" text-anchor="middle" fill="#fff" font-family="ui-monospace, Menlo, monospace" font-size="13">? =&gt; ?</text>
<text x="40" y="93" text-anchor="middle">인자</text>
<polyline points="70,88 248,88" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#gradual-typing-3)"/>
<text x="200" y="80" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">Number ⇒ ?</text>
<text x="160" y="162" text-anchor="start" font-size="13">실패하면 <tspan text-decoration="overline" font-style="italic">ℓ</tspan>: 부른 쪽의 잘못</text>
<polyline points="372,122 548,122" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#gradual-typing-3)"/>
<text x="420" y="114" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">? ⇒ Number</text>
<text x="580" y="127" text-anchor="middle">결과</text>
<text x="460" y="162" text-anchor="end" font-size="13">실패하면 ℓ: g의 잘못</text>
</svg>
</div>

### 인터프리터와 자연 의미

캐스트 계산법의 계산 결과는 값이거나 \\(\texttt{blame}\ \ell\\)입니다. 캐스트를 계산하는 규칙은 하위 식을 계산한 뒤 \\(\mathit{cast}\\)를 적용합니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e \Rightarrow v$}
\LeftLabel{$\texttt{Cast}$}
\UnaryInfC{$\sigma \vdash (e : \tau \Rightarrow^{\ell} \tau') \Rightarrow \mathit{cast}(v, \tau, \tau', \ell)$}
\end{prooftree}
\\]

함수 적용은 함수 값이 클로저일 수도, 프록시일 수도 있으므로 "값에 값을 적용한다"는 보조 판단 \\(\mathit{app}(v_0, v_1) \Rightarrow v\\)로 나눕니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow v_0$}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1$}
\AxiomC{$\mathit{app}(v_0, v_1) \Rightarrow v$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\sigma \vdash e_0(e_1) \Rightarrow v$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma'[x \mapsto v_1] \vdash e \Rightarrow v$}
\LeftLabel{$\texttt{App-Clo}$}
\UnaryInfC{$\mathit{app}(\langle \lambda x.e, \sigma' \rangle, v_1) \Rightarrow v$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\mathit{app}(v_0, \mathit{cast}(v_1, \tau_3, \tau_1, \bar{\ell})) \Rightarrow v_2$}
\LeftLabel{$\texttt{App-Proxy}$}
\UnaryInfC{$\mathit{app}(\langle v_0 : \tau_1 \to \tau_2 \Rightarrow^{\ell} \tau_3 \to \tau_4 \rangle, v_1) \Rightarrow \mathit{cast}(v_2, \tau_2, \tau_4, \ell)$}
\end{prooftree}
\\]

어느 단계에서든 결과가 \\(\texttt{blame}\ \ell\\)이면 그대로 전체 결과가 됩니다(예외처럼 전파되는 규칙들은 생략합니다). 나머지 규칙은 TFAE와 같고, 타입 표기는 여전히 무시합니다. 필요한 타입 정보는 이제 캐스트 안에 들어 있기 때문입니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  case Num(n)          => NumV(n)
  case Add(l, r)       => numAdd(interp(l, env), interp(r, env))
  case Mul(l, r)       => numMul(interp(l, env), interp(r, env))
  case Id(x)           => env.getOrElse(x, error(s"free identifier: $x"))
  case Fun(p, _, b)    => CloV(p, b, env)
  case App(f, a)       => app(interp(f, env), interp(a, env))
  case Val(x, _, i, b) => interp(b, env + (x -> interp(i, env)))
  case Cast(e, from, to, l) => cast(interp(e, env), from, to, l)

def app(fv: Value, av: Value): Value = fv match
  case CloV(p, b, fenv) => interp(b, fenv + (p -> av))
  case ProxyV(f, ArrowT(p1, r1), ArrowT(p2, r2), l) =>
    cast(app(f, cast(av, p2, p1, l.neg)), r1, r2, l)
  case v => error(s"not a function: ${v.str}")
```

마지막으로 `eval`은 파싱, 타입 검사, 캐스트 삽입, 실행을 차례로 합니다. 꼬리표가 붙은 값은 꼬리표를 뗀 값으로 출력합니다.

```scala
def eval(str: String): String =
  val expr = Expr(str)
  val ty = typeCheck(expr, Map.empty)
  val (cexpr, cty) = insert(expr, Map.empty)
  assert(ty == cty)
  try s"${interp(cexpr, Map.empty).str}: ${ty.str}"
  catch case Blame(_, msg) => s"cast error: $msg"
```

## 예제: 누구의 잘못인가

이제 여러 프로그램을 실제로 실행해 봅시다. 모든 결과는 이 장의 구현으로 확인한 것입니다.

### 완전히 정적인 프로그램

```scala
eval("val f = (x: Number) => x + 1; f(1) + f(2)")  // 5: Number
eval("1 + ((x: Number) => x)")
// type error: inconsistent types: Number => Number and Number
```

`?`가 하나도 없는 프로그램은 TFAE와 똑같이 타입 검사되고, 캐스트가 하나도 들어가지 않으므로 TFAE와 똑같이 실행됩니다.

### 수 자리에 함수가 올 때

```scala
eval("((x: ?) => x + 1)(41)")                // 42: Number
eval("((x: ?) => x + 1)((y: Number) => y)")
// cast error: blame `x`: expected Number, got ? => ?
```

두 번째 프로그램에서 인자 `(y: Number) => y`는 `(Number => Number) ==> ?` 캐스트를 지나며 프록시로 감싸지고 \\(\texttt{?} \to \texttt{?}\\) 꼬리표가 붙습니다. 그런 다음 본문의 `<x : ? ==> Number>`에서 꼬리표가 \\(\texttt{num}\\)이 아니므로 실패하고, 레이블 `x`가 블레임받습니다. "`?` 타입의 `x`를 수로 쓴 바로 그 자리"가 지목된 것입니다. TFAE처럼 타입을 무시하고 실행했다면 덧셈 안에서 `invalid operation` 오류가 났겠지만, 이제는 그런 일이 생기지 않습니다.

### 함수가 약속을 어길 때: 양의 블레임

다음 프로그램에서 `twice`는 완전히 정적인 함수이고, `g`는 `?` 타입으로 만든 함수입니다.

```gtfae
/* GTFAE */
val twice = (f: Number => Number) => (x: Number) => f(f(x));
val g: ? = (y: ?) => (z: ?) => z;      // returns a function, not a number
twice(g)(1)
```

`g`는 `?` 타입이므로 \\(\texttt{num} \to \texttt{num}\\) 자리에 넘길 수 있고, 타입 검사를 통과합니다. 캐스트를 넣으면 마지막 줄은 `twice(<g : ? ==> (Number => Number)>)(1)`이 됩니다. 실행하면 다음과 같습니다.

1. `g`의 값은 \\(\texttt{?} \to \texttt{?}\\) 꼬리표가 붙은 함수입니다. `? ==> (Number => Number)` 캐스트는 꼬리표를 확인해 통과시키고, 함수를 레이블 `g`의 프록시로 감쌉니다.
2. `twice` 안에서 `f(x)`, 즉 프록시에 `1`을 넘깁니다. 인자 `1`은 `Number ==> ?` 캐스트(레이블 \\(\bar{\ell}\\))를 문제없이 통과합니다.
3. 안쪽 함수가 `(z: ?) => z`라는 **함수**를 돌려줍니다. 결과 캐스트 `? ==> Number`(레이블 `g`)에서 꼬리표가 \\(\texttt{?} \to \texttt{?}\\)이므로 실패합니다.

```scala
eval("val twice = ...; val g: ? = (y: ?) => (z: ?) => z; twice(g)(1)")
// cast error: blame `g`: expected Number, got ? => ?
```

양의 블레임으로 `g`가 지목되었습니다. "수를 돌려주겠다"고 약속한 것은 `g`였고(`g`가 `Number => Number` 자리에 쓰였으니까요), 그 약속을 어긴 것도 `g`이기 때문입니다. 완전히 정적인 `twice`는 블레임받지 않습니다. 흥미롭게도 `twice(g)`까지만 실행하면 오류가 나지 않고 `<function>: Number => Number`가 됩니다. 프록시는 함수가 **실제로 불려서** 약속을 어기는 순간에만 오류를 냅니다.

### 문맥이 약속을 어길 때: 음의 블레임

이번에는 반대로 정적인 함수를 동적인 코드에 넘겨 봅시다.

```gtfae
/* GTFAE */
val inc = (x: Number) => x + 1;
val bad = (f: ?) => f(f);              // calls `f` with a function
bad(inc)
```

`bad(inc)`에서 `inc`는 `(Number => Number) ==> ?` 캐스트(레이블 `inc`)를 지나며 프록시로 감싸집니다. `bad` 안에서 `f(f)`를 부르면 프록시는 인자 `f`를 \\(\texttt{?}\\)에서 \\(\texttt{num}\\)으로 캐스트하는데, 이때 레이블은 뒤집힌 \\(\bar{\ell}\\)입니다. 인자가 함수이므로 실패합니다.

```scala
eval("val inc = (x: Number) => x + 1; val bad = (f: ?) => f(f); bad(inc)")
// cast error: blame the context of `inc`: expected Number, got ? => ?
```

음의 블레임이므로 `inc` 자신이 아니라 **`inc`를 받아 쓴 문맥**, 즉 `inc`에 함수를 넘긴 `bad`가 지목됩니다. `inc`는 "수를 주면 수를 돌려준다"고 약속했을 뿐이고, 수를 주지 않은 쪽이 잘못한 것입니다. 앞에서 본 Python 예에서는 `inc` 안의 `x + 1`에서 오류가 났던 것과 비교해 보세요.

### 타입이 맞는 프로그램은 블레임받지 않는다

세 예에서 블레임받은 쪽은 모두 `?`가 있는 쪽, 즉 타입이 **덜 정확한** 쪽이었습니다. 이것은 우연이 아닙니다. Wadler와 Findler(2009)의 <a id="g-blame-theorem"></a>**블레임 정리**(blame theorem)를 이 장의 언어에 맞게 비공식적으로 말하면 다음과 같습니다.

> **블레임 정리(비공식).** 더 정확한 타입에서 덜 정확한 타입으로 가는 캐스트(예: \\(\texttt{num} \to \texttt{num}\\)에서 \\(\texttt{?}\\)로)는 결코 양의 블레임을 받지 않고, 덜 정확한 타입에서 더 정확한 타입으로 가는 캐스트(예: \\(\texttt{?}\\)에서 \\(\texttt{num}\\)으로)는 결코 음의 블레임을 받지 않는다.

두 경우 모두 블레임은 **덜 정확한 쪽**으로 갑니다. 첫 번째 캐스트에서는 안의 식이 더 정확한 쪽이므로 그 문맥만, 두 번째 캐스트에서는 문맥이 더 정확한 쪽이므로 안의 식만 블레임받을 수 있습니다. 그래서 캐스트 오류가 났을 때 그 원인은 언제나 프로그램에서 타입이 덜 정확하게 붙은 부분에 있습니다. 완전히 정적인 부분은 동적인 부분과 아무리 섞여도 잘못을 뒤집어쓰지 않습니다. 이것이 논문 제목 "Well-Typed Programs Can't Be Blamed"(타입이 맞는 프로그램은 블레임받지 않는다)의 뜻입니다.

## 타입 안전성

점진적 타입 언어에서 타입 안전성은 무엇을 뜻할까요? `?`가 있는 한 실행 중 오류를 **모두** 없앨 수는 없습니다. 위에서 본 캐스트 오류가 그 예입니다. 대신 GTFAE는 다음을 보장합니다.

> **타입 안전성(GTFAE).** \\(\vdash e : \tau\\)이고 \\(\varnothing \vdash e \rightsquigarrow e' : \tau\\)이면, \\(e'\\)의 실행은 다음 셋 중 하나이다.
> 1. 타입 \\(\tau\\)의 값으로 끝난다.
> 2. 끝나지 않는다.
> 3. 어떤 레이블 \\(\ell\\)에 대한 캐스트 오류 \\(\texttt{blame}\ \ell\\)로 끝난다.

즉 `not a function`이나 `invalid operation` 같은 **타입 오류**는 절대 일어나지 않고, 실행 중 오류가 있다면 반드시 캐스트 오류이며, 그 오류는 원래 프로그램의 위치(레이블)를 가리킵니다. 특히 `Number`라고 적힌 변수에는 언제나 정말로 수가 들어 있습니다. TypeScript의 `n: number`에 문자열이 들어갔던 일은 일어나지 않습니다.

증명의 핵심은 두 가지입니다.

- **캐스트 삽입은 타입을 보존합니다.** 캐스트 계산법에 "\\(\Gamma \vdash e : \tau\\)이고 \\(\tau \sim \tau'\\)이면 \\(\Gamma \vdash (e : \tau \Rightarrow^{\ell} \tau') : \tau'\\)"이라는 규칙을 두고, 나머지 규칙은 TFAE처럼 **같음**으로 검사한다고 합시다. 그러면 캐스트 삽입의 결과 \\(e'\\)은 이 타입 시스템에서 같은 타입 \\(\tau\\)를 갖습니다. 일관성으로 느슨하게 허락했던 모든 자리에 캐스트가 들어가 있기 때문입니다.
- **캐스트 계산법은 TFAE처럼 안전합니다.** 같음으로 타입이 맞으므로, 덧셈의 피연산자는 \\(\texttt{num}\\) 타입의 값, 즉 정말 수이고, 함수 자리의 값은 클로저나 프록시입니다. 캐스트를 실행할 때 생길 수 있는 실패는 꼬리표가 맞지 않는 경우뿐이며, 그것이 바로 \\(\texttt{blame}\ \ell\\)입니다.

이 성질을 깨뜨리는 전형적인 실수도 알아 둡시다.

- **캐스트를 빠뜨리는 경우.** 예를 들어 \\(\texttt{I-App}\\)에서 함수 쪽 캐스트 `? ==> (? => ?)`를 넣지 않으면, `((x: ?) => x(1))(2)`에서 수 `2`를 부르려다 `not a function` 오류가 납니다. 캐스트를 제대로 넣으면 `blame` 메시지 `` blame `x`: expected ? => ?, got Number ``가 나옵니다.
- **일관성에 추이성이나 포섭 규칙을 넣는 경우.** 앞에서 본 것처럼 모든 타입이 서로 일관되어 정적 검사가 사라집니다. 그러면 \\(\texttt{num}\\)에서 \\(\texttt{num} \to \texttt{num}\\)으로 가는 것처럼 일관되지 않은 캐스트가 필요해지는데, 이런 캐스트는 어떤 값에 대해서도 성공할 수 없습니다.
- **프록시의 극성을 뒤집지 않는 경우.** 타입 안전성 자체는 유지되지만, 블레임이 엉뚱한 쪽으로 갑니다. `bad(inc)` 예에서 잘못이 없는 `inc`가 지목되어 블레임 정리가 깨집니다.

## 실제 언어에서는

### 선택적 타입: 검사하지 않는 길

TypeScript와 Python(mypy)은 타입 검사에서는 이 장과 거의 같은 일을 합니다. `any`나 `Any`는 어떤 타입과도 주고받을 수 있는데, 이것이 바로 일관성 관계입니다. Python의 타입 힌트 이론을 설명한 PEP 483은 점진적 타입을 직접 소개하며 이 관계를 "consistent with"라고 부릅니다.

하지만 두 언어 모두 **캐스트를 넣지 않습니다**. 타입을 지우고 그대로 실행합니다. 이런 방식을 <a id="g-optional-typing"></a>**선택적 타입**(optional typing)이라고 부릅니다. 타입은 오류를 일찍 찾고 도구를 돕는 데 쓰일 뿐, 실행 중 동작에는 아무 영향이 없습니다. 장점은 분명합니다. 실행 중 검사 비용이 전혀 없고, 기존 JavaScript, Python 코드와 아무 문제 없이 섞입니다. 대가는 건전성입니다. `any`를 거쳐 들어온 잘못된 값은 타입 있는 코드 깊숙이 들어가서, 원인과 동떨어진 곳에서 터집니다.

Dart와 C#은 다른 길을 갑니다. Dart 2부터는 `dynamic` 값을 정적 타입 자리에 쓰면 실행 중 검사를 넣어 타입 시스템을 건전하게 유지하고, C#의 `dynamic`도 정적 타입으로 바꿀 때 실행 중에 검사해서 맞지 않으면 예외를 던집니다. 다만 이 언어들은 이 장처럼 함수 값을 프록시로 감싸는 방식을 쓰지는 않습니다.

### 건전한 점진적 타입과 그 비용

캐스트를 넣는 건전한 점진적 타입의 대표적인 예는 **Typed Racket**입니다. 타입이 있는 모듈과 없는 모듈의 경계에서 계약(contract)을 만들어 값을 검사하고, 함수는 프록시처럼 감쌉니다. 그리고 실패하면 경계의 어느 쪽이 잘못했는지 블레임으로 알려 줍니다.

문제는 성능입니다. 캐스트에는 비용이 듭니다.

- 꼬리표를 붙이고 확인하는 비용이 계속 듭니다.
- 함수가 경계를 넘을 때마다 프록시가 하나씩 더 감싸집니다. 함수가 타입 있는 쪽과 없는 쪽을 여러 번 오가면 프록시가 겹겹이 쌓여, 부를 때마다 여러 번의 캐스트를 거치게 됩니다.
- 프록시는 원래 함수와 다른 값이라서, 같은 값인지 비교하는 연산 등에서 미묘한 문제를 일으키기도 합니다.

Takikawa 등(2016)은 Typed Racket 프로그램에서 일부 모듈에만 타입을 붙였을 때, 경계가 많은 구성에서는 실행이 수십 배 이상 느려지는 경우가 있음을 측정해 큰 반향을 일으켰습니다. 이후 겹친 캐스트를 하나로 합치는 공간 효율적인 표현, 더 빠른 구현 기법 등 많은 연구가 이어지고 있습니다.

### 가드 의미와 트랜지언트 의미

이 장에서 만든 방식, 즉 함수를 프록시로 감싸 깊이 검사하는 방식을 <a id="g-guarded-semantics"></a>**가드 의미**(guarded semantics)라고 합니다. Reticulated Python은 이와 다른 <a id="g-transient-semantics"></a>**트랜지언트 의미**(transient semantics)도 제안했습니다. 트랜지언트 의미는 프록시를 만들지 않고, 값을 쓰는 자리마다 가장 바깥 모양(그라운드 타입 수준)만 얕게 확인합니다. 예를 들어 `Number => Number` 자리에 오는 값은 "함수인가"만 확인하고, 그 함수가 수를 돌려주는지는 결과를 받는 쪽에서 다시 "수인가"를 확인합니다. 프록시가 없으니 값의 동일성이 유지되고 구현이 간단하지만, 검사가 프로그램 곳곳에 흩어지고, 블레임으로 원인을 정확히 짚기가 더 어려워집니다.

정리하면 점진적 타입 언어의 설계는 세 축 사이의 줄다리기입니다. **건전성**(타입을 믿을 수 있는가), **성능**(검사 비용이 얼마인가), **호환성**(타입 없는 기존 코드와 얼마나 자연스럽게 섞이는가). TypeScript는 호환성과 성능을, Typed Racket은 건전성을, 트랜지언트 의미는 그 중간을 택한 셈입니다.

## 정리

- **점진적 타입**은 한 프로그램 안에서 정적 타입과 동적 타입을 섞고, 타입 표기를 점점 늘려 갈 수 있게 합니다. TypeScript의 `any`, Python의 `Any`, Dart와 C#의 `dynamic`이 그 예입니다.
- **GTFAE**는 TFAE에 동적 타입 \\(\texttt{?}\\)와 `val`의 선택적 타입 표기를 더한 언어입니다. `?`는 타입의 어느 자리에든 올 수 있습니다.
- 타입 규칙은 같음 대신 **일관성** \\(\tau \sim \tau'\\)을 씁니다. `?`는 모든 타입과 일관됩니다. 일관성은 반사적이고 대칭적이지만 **추이적이지 않으며**, 추이적이면 모든 타입이 서로 일관되어 버립니다. 그래서 포섭 규칙을 두지 않고, 타입이 만나는 자리에서 한 번만 확인합니다.
- 함수 적용은 **매칭** \\(\tau \triangleright \tau_1 \to \tau_2\\)으로 함수 타입과 \\(\texttt{?}\\)를 함께 다룹니다(\\(\texttt{?} \triangleright \texttt{?} \to \texttt{?}\\)).
- **정확도** \\(\tau \sqsubseteq \tau'\\)은 \\(\tau'\\)이 \\(\tau\\)의 일부를 \\(\texttt{?}\\)로 바꾼 것이라는 부분 순서입니다. **점진적 보장**은 타입 표기를 덜 정확하게 바꿔도 타입 검사와 실행 결과가 망가지지 않고, 더 정확하게 바꾸면 캐스트 오류만 새로 생길 수 있다는 성질입니다.
- 의미는 **캐스트 삽입**으로 줍니다. 일관되지만 같지 않은 자리마다 캐스트 \\(e : \tau \Rightarrow^{\ell} \tau'\\)을 넣고, **캐스트 계산법**의 인터프리터로 실행합니다. `?`로 들어가는 값에는 그라운드 타입 **꼬리표**를 붙이고, 함수 캐스트는 **프록시**로 감싸 불릴 때 인자와 결과를 검사합니다.
- 캐스트가 실패하면 **블레임 레이블**이 잘못한 곳을 가리킵니다. 결과 캐스트의 실패는 함수의 잘못(양의 블레임), 인자 캐스트의 실패는 문맥의 잘못(음의 블레임)입니다. 블레임은 언제나 덜 정확한 쪽으로 가므로 **타입이 맞는 프로그램은 블레임받지 않습니다**.
- GTFAE의 타입 안전성: 타입이 맞는 프로그램은 값으로 끝나거나, 끝나지 않거나, 캐스트 오류로 끝나며, 타입 오류는 일어나지 않습니다.
- TypeScript와 Python은 캐스트를 넣지 않는 **선택적 타입**(건전하지 않음, 비용 없음)을, Typed Racket은 건전한 점진적 타입(비용 있음)을 택했습니다. 프록시로 깊이 검사하는 **가드 의미**와 얕게 검사하는 **트랜지언트 의미**도 있습니다.

## 연습 문제

1. 다음 각 쌍이 일관되는지 판단하고, 일관되면 두 타입보다 모두 더 정확한 타입을 하나 적어 보세요.

   ```text
   ? => Number            and   Number => ?
   (? => Number) => ?     and   (Number => ?) => Number
   ? => ?                 and   Number
   Number => ? => Number  and   ? => Number => ?
   ```

2. 다음 GTFAE 식이 타입 검사를 통과하는지 판단하고, 통과하면 타입과 캐스트를 넣은 결과, 그리고 실행 결과(값 또는 어느 레이블의 어떤 극성의 블레임인지)를 적어 보세요.

   ```gtfae
   /* GTFAE */
   ((f: ?) => f(1) + 2)((x: Number) => x * 10)
   ((f: ? => Number) => f(1))((x: ?) => x)
   ((f: Number => Number) => f(1))((x: ?) => (y: ?) => y)
   val x: ? = 1; x(2)
   ```

3. 일관성 대신 "\\(\Gamma \vdash e : \tau\\)이고 \\(\tau \sim \tau'\\)이면 \\(\Gamma \vdash e : \tau'\\)"라는 포섭 규칙을 두고 나머지 규칙은 TFAE처럼 같음을 쓰는 타입 시스템을 생각해 봅시다. 이 시스템에서 `1 + ((x: Number) => x)`의 타입 유도를 만들어, 왜 이 설계가 잘못인지 보이세요.

4. 정적 점진적 보장의 반대 방향, 즉 "\\(\vdash e' : \tau'\\)이고 \\(e \sqsubseteq e'\\)이면 \\(\vdash e : \tau\\)"는 성립하지 않습니다. 반례를 하나 들어 보세요. 이것이 점진적 타입 언어를 쓰는 프로그래머에게 무엇을 뜻하는지도 설명해 보세요.

5. **구현.** GTFAE에 조건식 `if0 e1 e2 e3`를 더해 보세요. 조건식의 두 가지의 타입이 다를 때(예: 한쪽은 `Number`, 다른 쪽은 `?`) 결과 타입을 무엇으로 정해야 할지, 그리고 캐스트를 어디에 넣어야 할지 설계하세요. (힌트: 일관된 두 타입에서 각 자리마다 더 정확한 쪽을 고르는 연산을 생각해 보세요.) 구현한 뒤 점진적 보장이 지켜지는지 몇 가지 예로 확인해 보세요.

6. **구현.** 이 장의 `cast`와 `app`을 고쳐 트랜지언트 의미를 구현해 보세요. 프록시를 만들지 않고, 함수 적용의 결과와 함수 본문에 들어온 인자를 그라운드 타입 수준에서만 검사합니다. `twice(g)(1)`과 `bad(inc)` 예에서 오류가 어디서, 어떤 메시지로 나는지 가드 의미와 비교해 보세요.

## 더 읽을거리

- Jeremy G. Siek, Walid Taha. "Gradual Typing for Functional Languages." *Scheme and Functional Programming Workshop*, 2006. 동적 타입 `?`, 일관성 관계, 캐스트 삽입을 처음 정리한 논문입니다.
- Philip Wadler, Robert Bruce Findler. "Well-Typed Programs Can't Be Blamed." *ESOP*, 2009. 블레임 레이블과 극성, 블레임 정리를 다룹니다. 이 장의 그라운드 타입과 꼬리표 표현도 이 논문의 블레임 계산법을 따랐습니다.
- Jeremy G. Siek, Michael M. Vitousek, Matteo Cimini, John Tang Boyland. "Refined Criteria for Gradual Typing." *SNAPL*, 2015. 정적, 동적 점진적 보장을 정의한 논문입니다.
- Sam Tobin-Hochstadt, Matthias Felleisen. "The Design and Implementation of Typed Scheme." *POPL*, 2008. Typed Racket의 출발점입니다.
- Michael M. Vitousek, Andrew M. Kent, Jeremy G. Siek, Jim Baker. "Design and Evaluation of Gradual Typing for Python." *DLS*, 2014. Reticulated Python과 트랜지언트 의미를 소개합니다.
- Asumu Takikawa, Daniel Feltey, Ben Greenman, Max S. New, Jan Vitek, Matthias Felleisen. "Is Sound Gradual Typing Dead?" *POPL*, 2016. 건전한 점진적 타입의 성능 문제를 체계적으로 측정했습니다.
