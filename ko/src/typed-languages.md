# 타입 있는 언어

[타입 시스템](./type-systems.md) 장에서 우리는 왜 타입 시스템이 필요한지, 그리고 타입, 타입 오류, 타입 검사, 타입 안전성이 무엇인지 살펴보았습니다. 하지만 아직 개념뿐입니다. 이번 장에서는 드디어 우리의 첫 번째 <a id="g-typed-language"></a>**타입 있는 언어**를 직접 정의합니다.

그 언어는 **TFAE**, 즉 [일급 함수](./first-class-functions.md) 장의 FAE에 **타입 시스템**을 더한 언어입니다. TFAE를 만들면서 두 가지를 함께 정의합니다. 하나는 식이 언제 타입이 맞는지를 정하는 <a id="g-typing-rule"></a>**타입 규칙**(typing rule)이고, 다른 하나는 그 규칙대로 동작하는 Scala **타입 검사기** `typeCheck`입니다. 마지막으로 인터프리터와 자연 의미(natural semantics)를 어떻게 고치면 되는지, 그리고 연산 의미와 타입 규칙이 어떻게 닮았고 어떻게 다른지 비교해 봅니다.

이 장에서 만들 `TFAE` 인터프리터를 먼저 돌려 봅시다. 프로그램을 고쳐 가며 실행해 보세요.

<div class="playground" data-lang="TFAE"></div>

## TFAE: 타입 시스템을 더한 FAE

TFAE를 정의하기 전에, 다음 FAE 식들의 타입을 짐작해 봅시다.

```fae,run
/* FAE */ 42
```

이 식은 **수**를 만들어 내므로, 타입을 `Number`라고 부르기로 합시다.

```fae,run
/* FAE */ x => x + 1
```

이 식은 함수 값을 만들어 냅니다. 그냥 "함수"라고만 하면 될까요? 아닙니다. 더 자세히 말할 수 있습니다. 이 함수는 **수** 타입의 인자를 받아서 **수**를 돌려주어야 합니다. 이런 타입을 `Number => Number`라고 쓰고 <a id="g-arrow-type"></a>**화살표 타입**(arrow type)이라고 부릅니다.

```fae,run
/* FAE */ x => x
```

이것은 어떨까요? 매개변수 `x`에 대한 정보가 전혀 없습니다. `x`는 수일 수도, 함수일 수도 있습니다. 간단한 해결책은 매개변수의 타입을 프로그래머가 **명시적으로** 적게 하는 것, 즉 <a id="g-type-annotation"></a>**타입 표기**(type annotation)를 붙이는 것입니다.

그래서 FAE를 확장해, 함수 매개변수에 타입 표기를 붙이는 TFAE를 만듭니다.

```tfae
/* TFAE */
(x: Number) => x            // x is `Number` type
(f: Number => Number) => f  // f is `Number => Number` type
```

변경 불가능한 변수 정의 `val`은 어떻게 할까요? 이전처럼 **문법 설탕**(syntactic sugar)으로 정의한다면 함수로 풀어 쓰게 되므로 타입 표기가 필요합니다.

\\[
\mathcal{D}⟦ \texttt{val}\ x\texttt{:}\tau\ \texttt{=}\ e;\ e^{\prime} ⟧ = (\lambda x\texttt{:}\tau.\mathcal{D}⟦ e^{\prime} ⟧)(\mathcal{D}⟦ e ⟧)
\\]

```tfae
/* TFAE */
val x: Number = 42; x + 1    // == `((x: Number) => x + 1)(42)`
```

하지만 `val`을 문법 설탕이 아니라 언어의 기능으로 **직접 정의**한다면, 변수의 타입을 초기값으로부터 짐작할 수 있습니다. `42`가 `Number`이니 `x`도 당연히 `Number`입니다.

```tfae,run
/* TFAE */
val x = 42; x + 1            // x is `Number` type because of `42`
```

TFAE에서는 이 방식을 택합니다.

### 구체 문법

TFAE를 위해 FAE의 **식**을 다음과 같이 확장합니다.

1. **타입 표기**가 있는 **함수 정의**
2. **타입 표기가 없는** **변경 불가능한 변수 정의**
3. **타입**

FAE의 **구체 문법**(concrete syntax)을 다음과 같이 확장합니다.

```bnf
// expressions
<expr> ::= ...
         | "(" <id> ":" <type> ")" "=>" <expr>
         | "val" <id> "=" <expr> ";" <expr>

// types
<type> ::= "(" <type> ")"        // only for precedence
         | "Number"              // number type
         | <type> "=>" <type>    // arrow type
```

함수는 일급 값이므로 매개변수 타입과 반환 타입이 다시 화살표 타입일 수 있습니다. 그리고 `=>`는 <a id="g-right-associative"></a>**오른쪽 결합**(right-associative)입니다. 즉 `Number => Number => Number`는 `Number => (Number => Number)`, 다시 말해 "수를 받아서 '수를 받아 수를 돌려주는 함수'를 돌려주는 함수"의 타입입니다. 함수를 **받는** 함수의 타입을 쓰려면 `(Number => Number) => Number`처럼 괄호가 필요합니다.

### 추상 문법

TFAE의 **추상 문법**(abstract syntax)은 FAE를 다음과 같이 확장한 것입니다.

\\[
\begin{array}{lrrll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots \\\\
& & \mid & \lambda x\texttt{:}\tau.e & (\texttt{Fun}) \\\\
& & \mid & \texttt{val}\ x\ \texttt{=}\ e;\ e & (\texttt{Val}) \\\\
\text{Types} & \mathbb{T} \ni \tau & ::= & \texttt{num} & (\texttt{NumT}) \\\\
& & \mid & \tau \to \tau & (\texttt{ArrowT})
\end{array}
\\]

수식에서는 구체 문법의 `Number`를 \\(\texttt{num}\\)으로, `=>`를 \\(\to\\)로 씁니다. Scala로는 다음과 같이 정의합니다.

```scala
enum Expr:
  ...
  case Fun(param: String, ty: Type, body: Expr)
  case Val(name: String, init: Expr, body: Expr)

enum Type:
  case NumT
  case ArrowT(paramTy: Type, retTy: Type)
```

`Fun`에는 매개변수의 타입 `ty`가 추가되었고, `Val`은 타입 표기 없이 초기값 `init`만 갖습니다.

## 타입 검사기와 타입 규칙

### 다시 보기: 타입 검사

식 \\(e\\)가 타입 \\(\tau\\)의 값으로 계산되거나, 계산이 끝나지 않거나, 타입 오류가 아닌 실행 중 오류를 내면 "식 \\(e\\)의 타입은 \\(\tau\\)이다"라고 하고, 다음과 같이 써서 \\(e\\)가 **타입이 맞는다**(well-typed)고 했습니다.

\\[
\vdash e : \tau
\\]

**타입 검사**는 주어진 식 \\(e\\)가 타입이 맞는지 검사하는 정적 분석이고, **타입 검사기**는 \\(e\\)가 타입이 맞으면 그 타입을 돌려주고 그렇지 않으면 타입 오류를 보고합니다. 이제 해야 할 일은 두 가지입니다.

1. 식이 언제 타입이 맞는지 정의하는 **타입 규칙**을 설계합니다.
2. 그 타입 규칙에 따라 Scala로 **타입 검사기**를 구현합니다.

### 타입 환경

처음에는 타입 규칙을 \\(\vdash e : \tau\\) 꼴로, 타입 검사기를 다음과 같은 꼴로 만들면 될 것 같습니다.

```scala
def typeCheck(expr: Expr): Type = ???
```

타입 검사기는 \\(e\\)가 타입이 맞으면 그 **타입**을 돌려주고, 그렇지 않으면 **타입 오류**를 던집니다. 그런데 `x + 1`의 타입을 알려면 `x`의 타입을 알아야 합니다. 인터프리터가 환경(environment) \\(\sigma\\)로 변수의 **값**을 기억했듯이, 타입 검사기도 변수의 **타입**을 기억해야 합니다.

그래서 변수 이름을 타입으로 보내는 유한 부분 함수인 <a id="g-type-environment"></a>**타입 환경**(type environment) \\(\Gamma\\)를 정의하고, 이것을 타입 검사기에 넘겨 줍니다.

\\[
\begin{array}{lrcll}
\text{Type Environments} & \Gamma & \in & \mathbb{X} \xrightarrow{\text{fin}} \mathbb{T} & (\texttt{TypeEnv})
\end{array}
\\]

```scala
type TypeEnv = Map[String, Type]
```

이제 타입 규칙은 다음 꼴이 되고,

\\[
\Gamma \vdash e : \tau
\\]

타입 검사기는 다음 꼴이 됩니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = ???
```

\\(\Gamma \vdash e : \tau\\)는 "타입 환경 \\(\Gamma\\)에서 식 \\(e\\)의 타입은 \\(\tau\\)이다"라고 읽습니다. 인터프리터의 \\(\sigma \vdash e \Rightarrow v\\)와 모양이 꼭 닮았다는 점을 기억해 두세요. 이 장의 끝에서 둘을 비교합니다.

### 수

가장 간단한 경우부터 시작합시다. 수 \\(n\\)의 타입은 무엇일까요?

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  case Num(_) => NumT
  ...
```

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\tau\texttt{-Num}$}
\UnaryInfC{$\Gamma \vdash n : \texttt{num}$}
\end{prooftree}
\\]

수 리터럴 \\(n\\)은 어떤 타입 환경 \\(\Gamma\\)에서든 \\(\texttt{num}\\) 타입입니다. 전제가 없는 공리입니다.

### 덧셈과 곱셈

덧셈 \\(e_1 + e_2\\)는 조금 더 생각해야 합니다. 타입 검사기가 할 일을 하나씩 채워 봅시다.

먼저 \\(\Gamma\\)에서 \\(e_1\\)의 타입을 구합니다. 그런데 아무 타입이나 되는 것이 아니라, 덧셈을 하려면 \\(e_1\\)의 타입이 반드시 \\(\texttt{num}\\)이어야 합니다. 그래서 두 타입이 같은지 확인하고, 다르면 타입 오류를 던지는 보조 함수 `mustSame`을 만듭니다.

```scala
def mustSame(lty: Type, rty: Type): Unit =
  if (lty != rty) error(s"type mismatch: ${lty.str} != ${rty.str}")
```

\\(e_2\\)도 마찬가지로 \\(\texttt{num}\\)인지 확인합니다. 둘 다 통과하면 \\(e_1 + e_2\\)의 결과도 수이므로 \\(\texttt{num}\\)을 돌려줍니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Add(left, right) =>
    mustSame(typeCheck(left, tenv), NumT)
    mustSame(typeCheck(right, tenv), NumT)
    NumT
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \texttt{num}$}
\AxiomC{$\Gamma \vdash e_2 : \texttt{num}$}
\LeftLabel{$\tau\texttt{-Add}$}
\BinaryInfC{$\Gamma \vdash e_1 + e_2 : \texttt{num}$}
\end{prooftree}
\\]

정리하면 타입 검사기는 (1) \\(\Gamma\\)에서 \\(e_1\\)과 \\(e_2\\)의 타입이 \\(\texttt{num}\\)인지 확인하고, (2) \\(e_1 + e_2\\)의 타입으로 \\(\texttt{num}\\)을 돌려줍니다. 규칙의 전제 두 개가 코드의 `mustSame` 두 줄에, 결론의 \\(\texttt{num}\\)이 마지막 줄의 `NumT`에 그대로 대응합니다.

곱셈도 완전히 같습니다. 위 코드의 `case Add(left, right) =>`를 `case Mul(left, right) =>`로 바꾸기만 하면 됩니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \texttt{num}$}
\AxiomC{$\Gamma \vdash e_2 : \texttt{num}$}
\LeftLabel{$\tau\texttt{-Mul}$}
\BinaryInfC{$\Gamma \vdash e_1 \times e_2 : \texttt{num}$}
\end{prooftree}
\\]

> **자주 하는 실수.** 인터프리터에서는 `interp(left, env)`가 실제로 수를 돌려주는지 값을 열어 보고 확인했습니다. 타입 검사기에서는 값이 없습니다. 오직 **타입**만 비교합니다. 그래서 `typeCheck(left, tenv)`의 결과를 버리지 말고 반드시 `NumT`와 비교해야 합니다. 비교를 빠뜨리면 `1 + (x: Number) => x` 같은 식이 통과해 버립니다.

### 변경 불가능한 변수 정의와 식별자

`val`은 초기값의 타입을 구해서, 그 타입을 변수에 붙여 둔 채로 본문을 검사합니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Val(x, init, body) =>
    val initTy = typeCheck(init, tenv)
    typeCheck(body, tenv + (x -> initTy))
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \tau_1$}
\AxiomC{$\Gamma[x : \tau_1] \vdash e_2 : \tau_2$}
\LeftLabel{$\tau\texttt{-Val}$}
\BinaryInfC{$\Gamma \vdash \texttt{val}\ x\ \texttt{=}\ e_1;\ e_2 : \tau_2$}
\end{prooftree}
\\]

이 규칙은 초기값에서 알아낸 \\(x\\)의 타입을 \\(\Gamma\\)에 저장합니다. 예를 들어 다음 식에서는 `1: Number`이므로 `tenv`에 `x: Number`가 들어갑니다.

```tfae,run
/* TFAE */ val x = 1; x + 2      // `x: Number` in `tenv` <- `1: Number`
```

인터프리터의 환경 \\(\sigma\\)와 나란히 놓고 보면, 같은 식에서 두 환경은 같은 이름 `x`를 각각 값과 타입에 묶습니다.

<div style="text-align:center">
<svg viewBox="0 0 560 200" width="100%" style="max-width: 560px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="val x = 1; x + 2에서 인터프리터의 환경은 x를 1에, 타입 검사기의 타입 환경은 x를 Number에 묶는다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="typed-languages-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="280" y="28" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="16">val x = 1; x + 2</text>
<polyline points="245,38 160,62" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#typed-languages-1)"/>
<polyline points="315,38 400,62" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#typed-languages-1)"/>
<text x="140" y="82" text-anchor="middle" font-weight="bold">인터프리터: 환경 σ</text>
<text x="420" y="82" text-anchor="middle" font-weight="bold">타입 검사기: 타입 환경 Γ</text>
<rect x="70" y="96" width="140" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<polyline points="110,96 110,132" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="90" y="120" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="160" y="120" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">1</text>
<rect x="340" y="96" width="160" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<polyline points="380,96 380,132" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="360" y="120" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="440" y="120" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Number</text>
<polyline points="140,134 140,160" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#typed-languages-1)"/>
<polyline points="420,134 420,160" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#typed-languages-1)"/>
<text x="140" y="184" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">x + 2 ⇒ 3</text>
<text x="420" y="184" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">x + 2 : Number</text>
</svg>
</div>

식별자는 저장해 둔 타입을 꺼내 쓰기만 하면 됩니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Id(x) =>
    tenv.getOrElse(x, error(s"free identifier: $x"))
```

\\[
\begin{prooftree}
\AxiomC{$x \in \text{Dom}(\Gamma)$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma \vdash x : \Gamma(x)$}
\end{prooftree}
\\]

이 규칙은 \\(\Gamma\\)에서 \\(x\\)의 타입을 찾습니다. 위 예에서 본문 `x + 2`의 `x`는 \\(\Gamma\\)에서 `Number`를 찾아냅니다. \\(x\\)가 \\(\Gamma\\)에 없으면 자유 식별자이므로, 어떤 규칙도 적용되지 않아 타입 오류가 됩니다. 앞 장에서 실행 중 오류였던 `x * 42`를 이제는 실행하기 전에 잡아낼 수 있습니다.

### 함수 정의와 적용

함수 정의에서는 타입 표기가 빛을 발합니다. 매개변수의 타입을 알고 있으므로, 그 타입을 \\(\Gamma\\)에 붙여 본문을 검사하면 반환 타입을 알 수 있습니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Fun(param, paramTy, body) =>
    val retTy = typeCheck(body, tenv + (param -> paramTy))
    ArrowT(paramTy, retTy)
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma[x : \tau] \vdash e : \tau^{\prime}$}
\LeftLabel{$\tau\texttt{-Fun}$}
\UnaryInfC{$\Gamma \vdash \lambda x\texttt{:}\tau.e : \tau \to \tau^{\prime}$}
\end{prooftree}
\\]

```tfae,run
/* TFAE */ (x: Number) => x     // Number => Number
```

인터프리터에서는 함수 정의를 만나면 본문을 계산하지 않고 클로저로 감싸 두었습니다. 반면 타입 검사기는 함수 정의를 만나는 **즉시** 본문을 검사합니다. 실제 인자 값은 모르지만 인자의 **타입**은 알기 때문입니다.

함수 적용 \\(e_0(e_1)\\)에서는 먼저 \\(e_0\\)의 타입을 구합니다. 그것이 화살표 타입 \\(\tau_1 \to \tau_2\\)이면, 인자 \\(e_1\\)의 타입이 매개변수 타입 \\(\tau_1\\)과 같은지 확인하고 반환 타입 \\(\tau_2\\)를 돌려줍니다. 화살표 타입이 아니면 함수가 아닌 것을 호출하려는 것이므로 타입 오류입니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case App(fun, arg) => typeCheck(fun, tenv) match
    case ArrowT(paramTy, retTy) =>
      mustSame(typeCheck(arg, tenv), paramTy)
      retTy
    case ty => error(s"not a function type: ${ty.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : \tau_1 \to \tau_2$}
\AxiomC{$\Gamma \vdash e_1 : \tau_1$}
\LeftLabel{$\tau\texttt{-App}$}
\BinaryInfC{$\Gamma \vdash e_0(e_1) : \tau_2$}
\end{prooftree}
\\]

```tfae,run
/* TFAE */ ((x: Number) => x)(1) // Number
```

함수 본문의 타입은 여기서 다시 검사하지 않아도 됩니다. 함수가 **정의될 때** 이미 검사했고, 그 결과가 화살표 타입 안에 담겨 있기 때문입니다. 인터프리터는 함수를 호출할 **때마다** 본문을 계산하지만, 타입 검사기는 본문을 **한 번만** 봅니다.

예를 들어 `val f = (x: Number) => x + 1; f(1) + f(2)`에서 인터프리터와 타입 검사기가 본문을 다루는 방식을 비교하면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 620 250" width="100%" style="max-width: 620px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="interp는 f(1)과 f(2)를 부를 때마다 본문 x + 1을 계산하지만, typeCheck는 함수를 정의할 때 본문을 한 번만 검사한다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="typed-languages-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="310" y="26" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">val f = (x: Number) =&gt; x + 1; f(1) + f(2)</text>
<polyline points="310,48 310,236" fill="none" stroke="currentColor" stroke-width="1.2" stroke-dasharray="6 4"/>
<text x="160" y="66" text-anchor="middle" font-weight="bold">interp: 호출할 때마다</text>
<text x="465" y="66" text-anchor="middle" font-weight="bold">typeCheck: 정의할 때 한 번</text>
<text x="48" y="115" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">f(1)</text>
<polyline points="76,110 104,110" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#typed-languages-2)"/>
<rect x="108" y="88" width="180" height="46" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="198" y="108" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">x + 1 ⇒ 2</text>
<text x="198" y="126" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">[x ↦ 1]</text>
<text x="48" y="185" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">f(2)</text>
<polyline points="76,180 104,180" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#typed-languages-2)"/>
<rect x="108" y="158" width="180" height="46" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="198" y="178" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">x + 1 ⇒ 3</text>
<text x="198" y="196" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">[x ↦ 2]</text>
<text x="342" y="115" text-anchor="start">정의</text>
<polyline points="374,110 398,110" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#typed-languages-2)"/>
<rect x="402" y="88" width="190" height="46" rx="4" fill="#2a408e"/>
<text x="497" y="108" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">x + 1 : Number</text>
<text x="497" y="126" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13" fill="#fff">[x : Number]</text>
<polyline points="497,136 497,156" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#typed-languages-2)"/>
<text x="497" y="174" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">f : Number =&gt; Number</text>
<text x="465" y="206" text-anchor="middle">f(1), f(2): 인자 타입만 비교</text>
<text x="465" y="228" text-anchor="middle" font-size="13">(본문은 다시 보지 않음)</text>
</svg>
</div>

> **생각해 보기.** \\(\tau\texttt{-App}\\) 규칙에서 첫 번째 전제의 \\(\tau_1\\)과 두 번째 전제의 \\(\tau_1\\)이 **같은 기호**라는 점이 바로 "인자 타입과 매개변수 타입이 같아야 한다"는 조건입니다. 코드에서는 이 조건이 `mustSame(typeCheck(arg, tenv), paramTy)` 한 줄로 나타납니다.

### 예제

규칙을 이어 붙여 <a id="g-typing-derivation-tree"></a>**타입 유도 트리**를 그려 보면 식 전체의 타입을 확인할 수 있습니다. 먼저 다음 식을 봅시다.

```tfae,run
/* TFAE */ val x = 1; x + 2              // 3: Number
```

\\[
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\varnothing \vdash 1 : \texttt{num}$}
\AxiomC{$x \in \text{Dom}([x : \texttt{num}])$}
\UnaryInfC{$[x : \texttt{num}] \vdash x : \texttt{num}$}
\AxiomC{}
\UnaryInfC{$[x : \texttt{num}] \vdash 2 : \texttt{num}$}
\BinaryInfC{$[x : \texttt{num}] \vdash x + 2 : \texttt{num}$}
\BinaryInfC{$\varnothing \vdash \texttt{val}\ x\ \texttt{=}\ 1;\ x + 2 : \texttt{num}$}
\end{prooftree}
\\]

맨 아래의 결론에는 \\(\tau\texttt{-Val}\\) 규칙이 쓰였습니다. 왼쪽 가지는 초기값 `1`이 \\(\texttt{num}\\)임을 보이고(\\(\tau\texttt{-Num}\\)), 오른쪽 가지는 \\(x\\)를 \\(\texttt{num}\\)으로 기억한 타입 환경 \\([x : \texttt{num}]\\)에서 본문 `x + 2`를 검사합니다(\\(\tau\texttt{-Add}\\), \\(\tau\texttt{-Id}\\), \\(\tau\texttt{-Num}\\)).

다음은 함수 적용이 들어간 식입니다.

```tfae,run
/* TFAE */ ((x: Number) => x)(2) * 3     // 6: Number
```

\\[
\begin{prooftree}
\AxiomC{$x \in \text{Dom}([x : \texttt{num}])$}
\UnaryInfC{$[x : \texttt{num}] \vdash x : \texttt{num}$}
\UnaryInfC{$\varnothing \vdash \lambda x\texttt{:}\texttt{num}.x : \texttt{num} \to \texttt{num}$}
\AxiomC{}
\UnaryInfC{$\varnothing \vdash 2 : \texttt{num}$}
\BinaryInfC{$\varnothing \vdash (\lambda x\texttt{:}\texttt{num}.x)(2) : \texttt{num}$}
\AxiomC{}
\UnaryInfC{$\varnothing \vdash 3 : \texttt{num}$}
\BinaryInfC{$\varnothing \vdash (\lambda x\texttt{:}\texttt{num}.x)(2) \times 3 : \texttt{num}$}
\end{prooftree}
\\]

\\(\tau\texttt{-Fun}\\)으로 함수의 타입이 \\(\texttt{num} \to \texttt{num}\\)임을 얻고, \\(\tau\texttt{-App}\\)에서 인자 `2`의 타입 \\(\texttt{num}\\)이 매개변수 타입과 같은지 확인한 뒤, 마지막으로 \\(\tau\texttt{-Mul}\\)로 전체 타입 \\(\texttt{num}\\)을 얻습니다.

## 타입 검사기가 있는 인터프리터

이제 타입 검사기와 인터프리터를 이어 붙입니다. 문자열을 파싱한 뒤, 실행하기 **전에** 먼저 빈 타입 환경에서 타입을 검사합니다. 타입 검사를 통과한 프로그램만 빈 환경에서 실행합니다.

<div style="text-align:center">
<svg viewBox="0 0 620 190" width="100%" style="max-width: 620px" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15">
<defs><marker id="arr-tc19" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect rx="3" x="100" y="40" width="140" height="62" fill="#2a408e"/>
<text x="170.0" y="67.0" text-anchor="middle" fill="#fff">Type</text>
<text x="170.0" y="85.0" text-anchor="middle" fill="#fff">Checker</text>
<polyline points="240,52 500,52" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-tc19)"/>
<text x="270" y="44" text-anchor="start" fill="currentColor" font-weight="bold">Reject</text>
<text x="510" y="57" text-anchor="start" fill="currentColor" font-weight="bold">TypeError</text>
<polyline points="240,92 500,92" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-tc19)"/>
<text x="270" y="84" text-anchor="start" fill="currentColor" font-weight="bold">Accept</text>
<text x="510" y="97" text-anchor="start" fill="currentColor" font-weight="bold">Type</text>
<polyline points="320,92 320,126 368,126" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-tc19)"/>
<text x="40" y="152" text-anchor="middle" fill="currentColor" font-weight="bold"><tspan font-style="italic" font-family="serif" font-weight="normal">P</tspan></text>
<text x="40" y="170" text-anchor="middle" fill="currentColor" font-weight="bold">Program</text>
<polyline points="80,140 170,140 170,104" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-tc19)"/>
<polyline points="80,164 368,164" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-tc19)"/>
<rect rx="3" x="370" y="114" width="140" height="62" fill="#2a408e"/>
<text x="440.0" y="150.0" text-anchor="middle" fill="#fff">Interpreter</text>
<polyline points="510,145 540,145" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-tc19)"/>
<text x="548" y="150" text-anchor="start" fill="currentColor" font-weight="bold">Result</text>
</svg>
</div>

```scala
def eval(str: String): String =
  val expr = Expr(str)
  val ty = typeCheck(expr, Map.empty)
  val v = interp(expr, Map.empty)
  s"${v.str}: ${ty.str}"
```

```scala
eval("val x = 1; x + 2")          // 3: Number
eval("((x: Number) => x)(2) * 3") // 6: Number
eval("1 + (x: Number) => x")      // a type error thrown by `typeCheck`
```

세 번째 식은 FAE였다면 덧셈을 하려는 순간 실행 중 오류가 났을 것입니다. TFAE에서는 `typeCheck`가 `type mismatch: Number => Number != Number`라는 타입 오류를 던지므로 `interp`는 아예 실행되지 않습니다. 결과는 `3: Number`처럼 값과 타입을 함께 보여 줍니다. 함수 값은 `<function>`으로 출력되므로, 예를 들어 `eval("(f: Number => Number) => f")`는 `<function>: (Number => Number) => Number => Number`가 됩니다.

### 인터프리터와 자연 의미

TFAE의 인터프리터와 자연 의미는 FAE의 것에서 **함수 정의** 부분만 고치면 됩니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Fun(p, t, b) => CloV(p, b, env)
```

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Fun}$}
\UnaryInfC{$\sigma \vdash \lambda x\texttt{:}\tau.e \Rightarrow \langle \lambda x.e, \sigma \rangle$}
\end{prooftree}
\\]

보다시피 타입 표기 `t`는 인터프리터와 자연 의미에서 **무시됩니다**. 타입은 실행 전에 검사할 때만 쓰이고, 실행 중에는 아무 역할도 하지 않습니다. 나머지 경우(`Val`을 포함해)는 FAE의 인터프리터와 같습니다.

> **생각해 보기.** 타입 검사를 통과한 프로그램이라면, 인터프리터 안에 있는 `error(s"not a function: ...")` 같은 검사는 영영 실행되지 않을까요? 이것이 바로 [타입 시스템](./type-systems.md) 장에서 정의한 타입 안전성이 TFAE에서 성립하는지 묻는 질문입니다.

### 연산 의미와 타입 규칙

**연산 의미**(operational semantics)와 **타입 규칙**은 무엇이 다를까요?

\\[
\sigma \vdash e \Rightarrow v \qquad \text{vs} \qquad \Gamma \vdash e : \tau
\\]

두 판단은 생김새가 매우 닮았습니다. 둘 다 왼쪽에 변수 정보(값 또는 타입)를 담은 환경이 있고, 가운데에 식이 있으며, 오른쪽에 결과(값 또는 타입)가 있습니다. 하지만 성격은 정반대입니다.

| | 연산 의미 | 타입 규칙 |
|---|---|---|
| 수학 표기 | \\(\sigma \vdash e \Rightarrow v\\) | \\(\Gamma \vdash e : \tau\\) |
| 동적 / 정적 | 동적 | 정적 |
| 구체 / 추상 | 구체 | 추상 |
| 목적 | 계산 | 타입 검사 |
| 구현 | 인터프리터 | 타입 검사기 |
| 결과 | 값 | 타입 |

연산 의미는 프로그램을 실제로 **실행**하며 **구체적인** 값을 다루고, 타입 규칙은 실행하지 **않고** 값의 집합인 **추상적인** 타입을 다룹니다. [타입 시스템](./type-systems.md) 장의 말로 하면, 타입 규칙은 연산 의미를 추상화한 정적 분석인 셈입니다.

## 정리

- **TFAE**는 FAE에 타입 시스템을 더한 언어입니다. 함수 매개변수에 **타입 표기**를 붙이고(\\(\lambda x\texttt{:}\tau.e\\)), `val`은 초기값에서 변수의 타입을 알아내므로 타입 표기가 없습니다.
- 타입은 \\(\texttt{num}\\)(`Number`)과 **화살표 타입** \\(\tau \to \tau\\)(`=>`, 오른쪽 결합)입니다. Scala로는 `NumT`와 `ArrowT`입니다.
- 변수의 타입을 기억하는 **타입 환경** \\(\Gamma\\)를 두고, 타입 규칙 \\(\Gamma \vdash e : \tau\\)와 타입 검사기 `typeCheck(expr, tenv)`를 함께 정의했습니다.
- 규칙: \\(\tau\texttt{-Num}\\), \\(\tau\texttt{-Add}\\), \\(\tau\texttt{-Mul}\\)(피연산자가 \\(\texttt{num}\\)이어야 함), \\(\tau\texttt{-Val}\\)(초기값의 타입을 \\(\Gamma\\)에 저장), \\(\tau\texttt{-Id}\\)(\\(\Gamma\\)에서 찾기), \\(\tau\texttt{-Fun}\\)(매개변수 타입으로 본문 검사), \\(\tau\texttt{-App}\\)(화살표 타입인지, 인자 타입이 같은지 확인). 타입 비교는 `mustSame`이 합니다.
- `eval`은 파싱, 타입 검사, 실행을 차례로 하며, 타입 오류가 있으면 실행하기 전에 거부합니다.
- 인터프리터와 자연 의미는 FAE와 같고, 타입 표기는 무시합니다.
- 연산 의미는 동적이고 구체적인 계산이며, 타입 규칙은 정적이고 추상적인 타입 검사입니다.

## 연습 문제

1. 다음 TFAE 식이 타입 검사를 통과하는지 판단하고, 통과하면 타입을, 통과하지 못하면 어느 규칙에서 막히는지 적어 보세요.

   ```pl
   /* TFAE */
   (f: Number => Number) => (x: Number) => f(f(x))
   ((f: Number => Number) => f(1))((x: Number) => x * 3)
   ((f: Number => Number) => f(1))(2)
   (x: Number) => x(1)
   val f = (x: Number) => (y: Number) => x + y; f(1)(2)
   ```

2. 연습 문제 1의 마지막 식에 대한 타입 유도 트리를 그려 보세요.

3. `Number => Number => Number`와 `(Number => Number) => Number`의 차이를 설명하고, 각 타입을 갖는 TFAE 식을 하나씩 만들어 보세요.

4. 다음 식은 실행하면 오류 없이 `1`이 됩니다. 그런데도 TFAE의 타입 검사기는 이 식을 거부합니다. 왜 그런지 설명하고, [타입 시스템](./type-systems.md) 장의 용어로 이런 경우를 무엇이라고 부르는지 답해 보세요.

   ```pl
   /* TFAE */
   ((x: Number) => 1)((y: Number) => y)
   ```

5. TFAE에서 `val`을 문법 설탕이 아니라 직접 정의한 덕분에 얻는 장점은 무엇인가요? 반대로 `val x: Number = 42; ...`처럼 타입 표기를 요구하는 방식에는 어떤 장점이 있을까요?

6. **과제.** 강의의 `tfae` 과제에서 `typeCheck` 함수와 `interp` 함수를 구현해 보세요. 제출할 필요는 없지만 시험 문제와 관련될 수 있으니 직접 풀어 보기를 강력히 권합니다.

7. <a id="ex-typed-languages-7"></a>★★★ TFAE의 \\(\tau\texttt{-Fun}\\) 규칙을 왼쪽에서 오른쪽으로 바꾸었다고 합시다. 바꾼 규칙은 함수 본문 \\(e\\)를 검사할 때 매개변수의 타입 정보 \\(x : \tau\\)를 타입 환경에 넣지 않습니다.

   \\[
   \begin{prooftree}
   \AxiomC{$\Gamma[x : \tau] \vdash e : \tau^{\prime}$}
   \LeftLabel{$\tau\texttt{-Fun}$}
   \UnaryInfC{$\Gamma \vdash \lambda x\texttt{:}\tau.e : \tau \to \tau^{\prime}$}
   \end{prooftree}
   \qquad\qquad
   \begin{prooftree}
   \AxiomC{$\Gamma \vdash e : \tau^{\prime}$}
   \LeftLabel{$\tau\texttt{-Fun}^{\prime}$}
   \UnaryInfC{$\Gamma \vdash \lambda x\texttt{:}\tau.e : \tau \to \tau^{\prime}$}
   \end{prooftree}
   \\]

   (a) 원래 규칙으로는 타입 검사를 통과하지만, 바꾼 규칙으로는 통과하지 못하는 TFAE 식을 하나 만드세요.

   (b) 바꾼 규칙을 쓰는 타입 시스템은 건전한가요? 건전하다면 그 이유를 설명하고, 건전하지 않다면 타입 검사를 통과하지만 실행 중에 타입 오류가 나는 TFAE 식을 만드세요.

   <details><summary>힌트</summary>

   바꾼 규칙에서 본문의 \\(x\\)는 타입을 어디서 찾을까요? 함수 바깥에 같은 이름 \\(x\\)가 다른 타입으로 정의되어 있으면, 타입 검사기가 믿는 \\(x\\)의 타입과 실행할 때 \\(x\\)에 실제로 묶이는 값이 어긋납니다.

   </details>

   [해답 →](./answers-2.md#ans-typed-languages-7)
