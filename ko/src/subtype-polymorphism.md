# 서브타입 다형성

[매개변수 다형성](./parametric-polymorphism.md)에서는 타입 변수를 두고 쓸 때 채워 넣는 방식으로 하나의 함수를 여러 타입에 쓸 수 있게 했습니다. 이 장에서는 다형성의 또 다른 큰 갈래인 서브타입 다형성(subtype polymorphism)을 배웁니다. "필드 `a`만 있으면 어떤 레코드든 받는 함수"처럼, 더 많은 정보를 가진 값을 더 적은 정보를 요구하는 자리에 쓰게 해 주는 방식입니다. 객체 지향 언어에서 서브클래스의 객체를 슈퍼클래스 자리에 넘기는 것이 바로 이 다형성입니다. [타입 있는 언어](./typed-languages.md)의 \\(\mathsf{TFAE}\\)에 레코드와 서브타입 다형성을 더한 \\(\mathsf{STFAE}\\)를 정의하고, 인터프리터와 자연 의미(natural semantics)을 만든 뒤, <a id="g-subtype-relation"></a>서브타입 관계(subtype relation)를 정의하고 이를 타입 규칙에 녹여 넣는 두 가지 방법을 비교해 봅니다.

이 장에서 만들 `STFAE` 인터프리터를 먼저 돌려 봅시다. 프로그램을 고쳐 가며 실행해 보세요.

<div class="playground" data-lang="STFAE"></div>

## 서브타입 다형성

서브타입 다형성을 쉽게 설명하기 위해 \\(\mathsf{TFAE}\\)에 <a id="g-record"></a>레코드(record)와 <a id="g-record-type"></a>레코드 타입(record type)을 더해 봅시다. (`val`에 타입을 적을 수 있게도 합니다.)

```stfae,run
/* STFAE */
// A record with two fields `a` and `b` whose types are `Number`
val x: {a: Number, b: Number} = {a=1, b=2}
x.a    // Access the field `a` of `x` and evaluate to `1`
```

레코드는 이름 붙은 <a id="g-field"></a>필드(field)들의 묶음입니다. `{a=1, b=2}`는 필드 `a`의 값이 `1`, 필드 `b`의 값이 `2`인 레코드이고, 그 타입은 `{a: Number, b: Number}`입니다. `x.a`처럼 점을 찍어 필드 값을 꺼냅니다.

이제 다음 식을 생각해 봅시다.

```stfae
/* STFAE */
val f = (x: ???) => x.a
f({a=1}) + f({a=2, b=3}) + f({c=4, a=5})
```

`f`는 받은 레코드의 필드 `a`만 꺼내 쓰므로, 필드 `a`만 있으면 어떤 레코드를 받아도 아무 문제가 없습니다. 그런데 안타깝게도 `x`에는 어떤 타입도 붙일 수 없습니다. `x`의 타입이 ① `{a: Number}`, ② `{a: Number, b: Number}`, ③ `{c: Number, a: Number}`가 동시에 되어야 하기 때문입니다.

이 문제를 어떻게 해결할까요? 바로 서브타입 다형성입니다.

> **정의(서브타입 다형성)** 서브타입 다형성은 타입 사이에 **서브타입 관계**(subtype relation)를 도입하는 방식의 다형성입니다.

```stfae,run
/* STFAE */
val f = (x: {a: Number}) => x.a     // Allow subtypes of `{a: Number}`
f({a=1}) + f({a=2, b=3}) + f({c=4, a=5})
```

`x`의 타입을 `{a: Number}`로 적고, 그 <a id="g-subtype"></a>서브타입(subtype)을 모두 허용하는 것입니다. 다음 타입은 모두 `{a: Number}`의 서브타입입니다.

```text
{a: Number}             {a: Number, b: Number}
{c: Number, a: Number}  ...
```

타입을 그 타입에 속하는 값들의 집합으로 보면, 서브타입 관계는 수학의 **부분집합 관계**에 해당합니다. `{a: Number, b: Number}` 타입의 값은 모두 필드 `a`에 수를 가지고 있으므로 `{a: Number}` 타입의 값이기도 합니다. 즉 `{a: Number, b: Number}`의 값 집합은 `{a: Number}`의 값 집합의 부분집합입니다. 대부분의 프로그래밍 언어가 이런 서브타입 다형성을 지원합니다.

서브타입 관계는 레코드뿐 아니라 함수, 리스트, 쌍, 데이터 타입 등 다른 타입에도 정의할 수 있습니다. 이 장에서는 레코드 타입과 함수 타입에 대해 정의해 봅니다.

## STFAE: 서브타입 다형성을 더한 TFAE

이제 \\(\mathsf{TFAE}\\)를 확장해 레코드와 `val`의 타입 표기를 지원하는 \\(\mathsf{STFAE}\\)를 만들어 봅시다.

```stfae
/* STFAE */
val x: {a: Number} = {a=1};              // A record with a field `a`
x.a                                      // Access the field `a` of x
val y: {a: Top, b: Top} = {a=1, b={}};   // `Top` is the top type
val z: Bot = exit; ...                   // Exit the program
```

`Top`과 `Bot`, `exit`이라는 낯선 것들이 보이는데, 곧 하나씩 설명합니다. \\(\mathsf{STFAE}\\)를 만들려면 \\(\mathsf{TFAE}\\)에 다음을 더해야 합니다.

1. `val`의 <a id="g-optional-type-annotation"></a>선택적 타입 표기(optional type annotation)
2. 레코드(record)
3. <a id="g-field-access"></a>필드 접근(field access)
4. `exit`: 프로그램을 즉시 끝냄
5. 레코드 타입(record type)
6. <a id="g-bottom-type"></a>최하위 타입(bottom type): 공집합에 해당
7. <a id="g-top-type"></a>최상위 타입(top type): 전체 집합에 해당

### 구체 문법

구체 문법(concrete syntax)은 다음과 같이 확장합니다.

```bnf
<expr>     ::= ...
             | "val" <id> [ ":" <type> ]? "=" <expr> ";"? <expr>
             | "{" [<id> "=" <expr>]*{","} "}"
             | <expr> "." <id>
             | "exit"
<type>     ::= ...
             | "{" [<id> ":" <type>]*{","} "}"
             | "Bot"
             | "Top"
```

여기서 `[...]?`는 있어도 되고 없어도 되는 부분, `[...]*{","}`는 쉼표로 구분해 0번 이상 반복하는 부분을 뜻합니다. 레코드와 레코드 타입에서 **같은 필드 이름을 두 번 쓸 수는 없습니다**.

### 추상 문법

추상 문법(abstract syntax)은 다음과 같습니다. 수식에서는 최하위 타입을 \\(\bot\\), 최상위 타입을 \\(\top\\)로 씁니다.

\\[
\begin{array}{lrcll}
\text{Expressions} & \mathbb{E} \ni e & \mathtt{::=} & \ldots & \\\\
& & \mid & \mathtt{val}\enspace x\enspace [:\tau]^?\enspace \mathtt{=}\enspace e;\enspace e & (\texttt{Val}) \\\\
& & \mid & \\{[x\enspace \mathtt{=}\enspace e]^{\ast}\\} & (\texttt{Record}) \\\\
& & \mid & e.x & (\texttt{Access}) \\\\
& & \mid & \mathtt{exit} & (\texttt{Exit}) \\\\
\text{Types} & \mathbb{T} \ni \tau & \mathtt{::=} & \ldots & \\\\
& & \mid & \\{[x:\tau]^{\ast}\\} & (\texttt{RecordT}) \\\\
& & \mid & \bot & (\texttt{BotT}) \\\\
& & \mid & \top & (\texttt{TopT})
\end{array}
\\]

```scala
enum Expr:
  ...
  case Val(name: String, tyOpt: Option[Type], init: Expr, body: Expr)
  case Record(fields: List[(String, Expr)])
  case Access(record: Expr, field: String)
  case Exit

enum Type:
  ...
  case RecordT(fields: Map[String, Type])
  case BotT
  case TopT
```

레코드 식은 필드를 적힌 순서대로 계산해야 하므로 `List`로, 레코드 타입은 필드 순서가 중요하지 않으므로 `Map`으로 표현했습니다. 이 차이는 뒤에서 다시 등장합니다.

## 인터프리터와 자연 의미

\\(\mathsf{TFAE}\\)와 마찬가지로 환경을 쓰는 인터프리터

```scala
def interp(expr: Expr, env: Env): Value = ???
```

와 환경을 쓰는 자연 의미 \\(\sigma \vdash e \Rightarrow v\\)를 정의합니다. 새로운 종류의 값으로 <a id="g-record-value"></a>**레코드 값**(record value)이 필요합니다.

\\[
\begin{array}{lrcll}
\text{Values} & \mathbb{V} \ni v & \mathtt{::=} & n & (\texttt{NumV}) \\\\
& & \mid & \langle \lambda x.e, \sigma \rangle & (\texttt{CloV}) \\\\
& & \mid & \\{[x\enspace \mathtt{=}\enspace v]^{\ast}\\} & (\texttt{RecordV})
\end{array}
\\]

```scala
enum Value:
  case NumV(number: BigInt)
  case CloV(param: String, body: Expr, env: Env)
  case RecordV(fields: Map[String, Value])
```

### 레코드와 필드 접근

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...

  case Record(fs) =>
    RecordV(fs.map { case (f, e) => (f, interp(e, env)) }.toMap)

  case Access(r, f) => interp(r, env) match
    case RecordV(fs) => fs.getOrElse(f, error(s"no such field: $f"))
    case v           => error(s"not a record: ${v.str}")
```

레코드 식은 각 필드의 식을 계산해 레코드 값을 만듭니다. 필드 접근은 식을 계산해 레코드 값을 얻은 뒤 해당 필드의 값을 꺼내고, 그런 필드가 없으면 오류를 냅니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1 \quad \ldots \quad \sigma \vdash e_n \Rightarrow v_n$}
\LeftLabel{$\texttt{Record}$}
\UnaryInfC{$\sigma \vdash \\{x_1\enspace \mathtt{=}\enspace e_1, \ldots, x_n\enspace \mathtt{=}\enspace e_n\\} \Rightarrow \\{x_1\enspace \mathtt{=}\enspace v_1, \ldots, x_n\enspace \mathtt{=}\enspace v_n\\}$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e \Rightarrow \\{\ldots, x\enspace \mathtt{=}\enspace v, \ldots\\}$}
\LeftLabel{$\texttt{Access}$}
\UnaryInfC{$\sigma \vdash e.x \Rightarrow v$}
\end{prooftree}
\\]

### Exit

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Exit => error("exit")
```

`exit`은 프로그램을 그 자리에서 끝냅니다. 그래서 `exit`에 대한 자연 의미 규칙은 **없습니다**. `exit`은 어떤 값도 만들어 내지 않기 때문입니다.

규칙이 없으니 다음 식의 유도 트리(derivation tree)는 그릴 수 없습니다.

```stfae,run
/* STFAE */ 1 + exit
```

하지만 다음 식의 유도 트리는 그릴 수 있습니다.

```stfae,run
/* STFAE */ (x: Number) => 1 + exit
```

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Fun}$}
\UnaryInfC{$\varnothing \vdash \lambda x\mathtt{:}\mathtt{num}.(1\enspace \mathtt{+}\enspace \mathtt{exit}) \Rightarrow \langle \lambda x.(1\enspace \mathtt{+}\enspace \mathtt{exit}), \varnothing \rangle$}
\end{prooftree}
\\]

함수의 몸통은 함수를 호출하기 전까지 계산하지 않으므로, 몸통에 `exit`이 있어도 함수 자체는 멀쩡한 클로저(closure) 값이 됩니다.

### 변경 불가능한 변수 정의

`val`은 타입 표기가 있든 없든 똑같이 동작합니다. 타입 표기는 타입 검사기만을 위한 정보이므로, 인터프리터는 이를 무시합니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...

  case Val(name, _, expr, body) =>
    interp(body, env + (name -> interp(expr, env)))
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1$}
\AxiomC{$\sigma[x \mapsto v_1] \vdash e_2 \Rightarrow v_2$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\sigma \vdash \mathtt{val}\enspace x\enspace \mathtt{=}\enspace e_1;\enspace e_2 \Rightarrow v_2$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1$}
\AxiomC{$\sigma[x \mapsto v_1] \vdash e_2 \Rightarrow v_2$}
\LeftLabel{$\texttt{Val}\_{\tau}$}
\BinaryInfC{$\sigma \vdash \mathtt{val}\enspace x:\tau_0\enspace \mathtt{=}\enspace e_1;\enspace e_2 \Rightarrow v_2$}
\end{prooftree}
\\]

## 서브타입 없이 만든 타입 검사기와 타입 규칙

먼저 서브타입 관계 없이 \\(\mathsf{STFAE}\\)의 타입 규칙 \\(\Gamma \vdash e : \tau\\)를 설계하고 타입 검사기를 구현해 봅시다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = ???
```

타입 검사기는 식이 타입 검사를 통과하면 그 타입을 돌려주고, 아니면 타입 오류를 던집니다. \\(\mathsf{TFAE}\\)와 마찬가지로 타입 환경(type environment) \\(\Gamma\\)로 변수의 타입을 기억합니다.

\\[
\begin{array}{lcll}
\text{Type Environments} & \Gamma & \in \mathbb{X} \xrightarrow{\text{fin}} \mathbb{T} & (\texttt{TypeEnv})
\end{array}
\\]

```scala
type TypeEnv = Map[String, Type]
```

### 레코드

레코드의 타입은 각 필드 식의 타입을 모은 레코드 타입입니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Record(fields) =>
    RecordT(fields.map { case (f, e) => (f, typeCheck(e, tenv)) }.toMap)
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \tau_1 \quad \ldots \quad \Gamma \vdash e_n : \tau_n$}
\LeftLabel{$\tau\texttt{-Record}$}
\UnaryInfC{$\Gamma \vdash \\{x_1\enspace \mathtt{=}\enspace e_1, \ldots, x_n\enspace \mathtt{=}\enspace e_n\\} : \\{x_1 : \tau_1, \ldots, x_n : \tau_n\\}$}
\end{prooftree}
\\]

### 필드 접근

필드 접근 \\(e.x\\)는 \\(e\\)의 타입이 필드 \\(x\\)를 가진 레코드 타입일 때만 허용하고, 그 필드의 타입이 결과 타입이 됩니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Access(record, f) => typeCheck(record, tenv) match
    case RecordT(fs) => fs.getOrElse(f, error(s"no such field: $f"))
    case ty          => error(s"not a record type: ${ty.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \\{\ldots, x : \tau, \ldots\\}$}
\LeftLabel{$\tau\texttt{-Access}$}
\UnaryInfC{$\Gamma \vdash e.x : \tau$}
\end{prooftree}
\\]

### Exit

`exit`은 어떤 값도 만들지 않으므로, 그 타입은 값이 하나도 없는 타입, 즉 최하위 타입 \\(\bot\\)입니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Exit => BotT
```

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\tau\texttt{-Exit}$}
\UnaryInfC{$\Gamma \vdash \mathtt{exit} : \bot$}
\end{prooftree}
\\]

### 변경 불가능한 변수 정의

타입 표기가 없는 `val`은 \\(\mathsf{TFAE}\\)와 같습니다. 초기화 식의 타입을 구해 그 타입으로 변수를 타입 환경에 넣습니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \tau_1$}
\AxiomC{$\Gamma[x : \tau_1] \vdash e_2 : \tau_2$}
\LeftLabel{$\tau\texttt{-Val}$}
\BinaryInfC{$\Gamma \vdash \mathtt{val}\enspace x\enspace \mathtt{=}\enspace e_1;\enspace e_2 : \tau_2$}
\end{prooftree}
\\]

타입 표기 \\(\tau_0\\)가 있으면, 초기화 식의 타입 \\(\tau_1\\)이 \\(\tau_0\\)과 같은지 확인하고, 변수는 표시된 타입 \\(\tau_0\\)으로 타입 환경에 넣습니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Val(name, tyOpt, expr, body) =>
    val ty = typeCheck(expr, tenv)
    tyOpt.foreach(givenTy => mustSame(ty, givenTy))
    val nameTy = tyOpt.getOrElse(ty)
    typeCheck(body, tenv + (name -> nameTy))
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \tau_1$}
\AxiomC{$\tau_1 = \tau_0$}
\AxiomC{$\Gamma[x : \tau_0] \vdash e_2 : \tau_2$}
\LeftLabel{$\tau\texttt{-Val}\_{\tau}$}
\TrinaryInfC{$\Gamma \vdash \mathtt{val}\enspace x:\tau_0\enspace \mathtt{=}\enspace e_1;\enspace e_2 : \tau_2$}
\end{prooftree}
\\]

그런데 다음 예제를 봅시다.

```stfae,run
/* STFAE */
val x: {a: Number} = {a=2, b=3}; x.a
```

이 프로그램은 타입 검사를 통과하지 못합니다.

\\[
\mathtt{\\{a: Number, b: Number\\}} \neq \mathtt{\\{a: Number\\}}
\\]

이기 때문입니다. 하지만 `x`로는 필드 `a`만 쓰므로 이 프로그램은 실행해도 아무 문제가 없습니다. 서브타입 다형성을 적용해 이 문제를 고쳐 봅시다. 그러려면 먼저 타입 사이의 **서브타입 관계** \\(<:\\)를 정의해야 합니다.

## 서브타입 관계

서브타입 다형성을 지원하려면 타입 사이의 서브타입 관계 \\(\tau <: \tau'\\)을 정의해야 합니다. \\(\tau <: \tau'\\)은 \\(\tau\\)가 \\(\tau'\\)의 **서브타입**(subtype)이라는 뜻이고, 거꾸로 \\(\tau'\\)이 \\(\tau\\)의 <a id="g-supertype"></a>**슈퍼타입**(supertype)이라고도 말합니다. 직관적으로는 "\\(\tau\\) 타입의 값은 \\(\tau'\\) 타입의 값이 필요한 곳 어디에나 써도 안전하다"라는 뜻입니다.

이 장 내내 타입을 값의 집합으로, \\(<:\\)를 부분집합 관계 \\(\subseteq\\)로 생각하면 규칙들이 자연스럽게 이해됩니다.

### 반사성과 추이성

먼저 서브타입 관계는 **반사적**(reflexive)이고 **추이적**(transitive)입니다. 이 두 성질을 각각 <a id="g-reflexivity"></a>**반사성**(reflexivity)과 <a id="g-transitivity"></a>**추이성**(transitivity)이라고 합니다.

\\[
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\tau <: \tau$}
\end{prooftree}
\qquad\qquad
\begin{prooftree}
\AxiomC{$\tau <: \tau'$}
\AxiomC{$\tau' <: \tau^{\prime\prime}$}
\BinaryInfC{$\tau <: \tau^{\prime\prime}$}
\end{prooftree}
\\]

집합으로 생각하면 당연합니다. 어떤 집합이든 자기 자신의 부분집합이고(\\(\tau \subseteq \tau\\)), \\(\tau \subseteq \tau'\\)이고 \\(\tau' \subseteq \tau^{\prime\prime}\\)이면 \\(\tau \subseteq \tau^{\prime\prime}\\)입니다. 작은 원이 중간 원에, 중간 원이 큰 원에 들어 있으면 작은 원은 큰 원에 들어 있는 것과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 640 190" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" xmlns="http://www.w3.org/2000/svg">
<text x="60" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">τ</text><text x="120" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">&lt;:</text><text x="180" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">τ</text>
<circle cx="60" cy="100" r="38" fill="none" stroke="currentColor" stroke-width="2.5"/><text x="120" y="107" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">⊆</text><circle cx="180" cy="100" r="38" fill="none" stroke="currentColor" stroke-width="2.5"/>
<text x="120" y="175" font-family="sans-serif" font-size="15" fill="currentColor" text-anchor="middle">Reflexivity</text>
<text x="330" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">τ</text><text x="390" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">&lt;:</text><text x="460" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">τ′</text><text x="525" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">&lt;:</text><text x="590" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">τ″</text>
<circle cx="330" cy="100" r="26" fill="none" stroke="currentColor" stroke-width="2.5"/><text x="390" y="107" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">⊆</text><circle cx="460" cy="100" r="38" fill="none" stroke="currentColor" stroke-width="2.5"/><text x="525" y="107" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">⊆</text><circle cx="590" cy="100" r="48" fill="none" stroke="currentColor" stroke-width="2.5"/>
<text x="460" y="175" font-family="sans-serif" font-size="15" fill="currentColor" text-anchor="middle">Transitivity</text>
</svg>
</div>

### 최하위 타입과 최상위 타입

최하위 타입 \\(\bot\\)은 값이 하나도 없는 **공집합**을, 최상위 타입 \\(\top\\)은 모든 값의 집합 \\(\mathbb{V}\\), 즉 **전체 집합**을 나타냅니다. 공집합은 모든 집합의 부분집합이고, 모든 집합은 전체 집합의 부분집합이므로 다음 규칙이 성립합니다.

\\[
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\bot <: \tau$}
\end{prooftree}
\qquad\qquad
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\tau <: \top$}
\end{prooftree}
\\]

\\[
\varnothing \subseteq \tau \subseteq \mathbb{V}
\qquad \text{즉} \qquad
\bot <: \tau <: \top
\\]

<div style="text-align:center">
<svg viewBox="0 0 460 200" width="100%" style="max-width: 460px; letter-spacing: normal; word-spacing: normal" xmlns="http://www.w3.org/2000/svg">
<text x="40" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">⊥</text><text x="110" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">&lt;:</text><text x="190" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">τ</text><text x="270" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">&lt;:</text><text x="370" y="30" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">⊤</text>
<text x="40" y="112" font-family="'Times New Roman', Times, serif" font-size="22" fill="currentColor" text-anchor="middle">∅</text><text x="110" y="112" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">⊆</text>
<circle cx="190" cy="105" r="45" fill="none" stroke="currentColor" stroke-width="2.5"/><text x="270" y="112" font-family="'Times New Roman', Times, serif" font-style="italic" font-size="20" fill="currentColor" text-anchor="middle">⊆</text>
<rect x="305" y="45" width="130" height="120" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/>
<text x="370" y="190" font-family="sans-serif" font-size="15" fill="currentColor" text-anchor="middle">Value Set 𝕍</text>
</svg>
</div>

`exit`의 타입이 \\(\bot\\)인 덕분에 `exit`은 어떤 타입이 필요한 자리에든 쓸 수 있습니다. 앞의 예제 `val z: Bot = exit`에서 `z`에 `Bot` 대신 아무 타입을 적어도 타입 검사를 통과하는 것이죠. 실제로 `exit`은 값을 돌려주지 않으므로 이것이 안전합니다. 반대로 \\(\top\\) 타입의 값으로는 아무것도 할 수 없지만, 어떤 값이든 \\(\top\\) 타입 자리에 넣을 수 있습니다.

> **생각해 보기** Scala에도 최하위 타입 `Nothing`과 최상위 타입 `Any`가 있습니다. `throw new Exception()`의 타입이 무엇일지, 그리고 왜 `val x: Int = throw new Exception()`이 타입 검사를 통과하는지 생각해 보세요.

### 레코드 타입

레코드 타입 사이의 서브타입 관계는 세 가지 경우로 나누어 생각해 봅시다.

**필드 추가.** 다음 프로그램을 봅시다.

```stfae,run
/* STFAE */
val f = (x: {a: Number}) => x.a
val y: {a: Number, b: Number} = {a=1, b=2}
f(y)
```

`f`는 필드 `a`만 쓰므로, 필드 `b`가 더 있는 `y`를 넘겨도 안전합니다. 일반적으로 레코드 타입에 새 필드를 **추가**한 타입은 원래 타입의 서브타입이어야 합니다. 필드가 많을수록 그 조건을 만족하는 값은 적어지므로, 값의 집합은 더 작아집니다.

\\[
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\\{x_1 : \tau_1, \ldots, x_n : \tau_n, x : \tau\\} <: \\{x_1 : \tau_1, \ldots, x_n : \tau_n\\}$}
\end{prooftree}
\\]

**필드 타입.** 다음 프로그램을 봅시다.

```stfae,run
/* STFAE */
val f = (x: {a: Top, b: Top}) => x
val x: {a: Number, b: Number} = {a=1, b=2}
f(x)
```

`f`는 필드 `a`와 `b`가 아무 타입이어도 되는 레코드를 원하고, `x`는 두 필드가 모두 수인 레코드입니다. `Number`가 `Top`의 서브타입이므로 `x`를 넘겨도 안전합니다. 일반적으로 한 레코드 타입의 모든 필드 타입이 다른 레코드 타입의 대응하는 필드 타입의 **서브타입**이면, 그 레코드 타입은 다른 레코드 타입의 서브타입이어야 합니다.

\\[
\begin{prooftree}
\AxiomC{$\tau_1 <: \tau_1' \quad \ldots \quad \tau_n <: \tau_n'$}
\UnaryInfC{$\\{x_1 : \tau_1, \ldots, x_n : \tau_n\\} <: \\{x_1 : \tau_1', \ldots, x_n : \tau_n'\\}$}
\end{prooftree}
\\]

**필드 순서.** 다음 프로그램을 봅시다.

```stfae,run
/* STFAE */
val f = (x: {a: Number, b: Number}) => x
val x: {b: Number, a: Number} = {a=1, b=2}
f(x)
```

필드는 이름으로 꺼내 쓰므로 순서는 아무 상관이 없습니다. 일반적으로 한 레코드 타입의 필드들이 다른 레코드 타입 필드들의 <a id="g-permutation"></a>**순열**(permutation)이면, 그 레코드 타입은 다른 레코드 타입의 서브타입이어야 합니다.

\\[
\begin{prooftree}
\AxiomC{$\\{x_1 : \tau_1, \ldots, x_n : \tau_n\\}\enspace \text{is a permutation of}\enspace \\{x_1' : \tau_1', \ldots, x_n' : \tau_n'\\}$}
\UnaryInfC{$\\{x_1 : \tau_1, \ldots, x_n : \tau_n\\} <: \\{x_1' : \tau_1', \ldots, x_n' : \tau_n'\\}$}
\end{prooftree}
\\]

순열 규칙은 양쪽 방향으로 성립하므로, 필드 순서만 다른 두 레코드 타입은 서로가 서로의 서브타입입니다. 사실 우리 구현에서는 `RecordT`가 필드를 `Map`으로 들고 있으므로 필드 순서가 처음부터 구별되지 않습니다. 순열 규칙이 자료 구조 선택만으로 공짜로 얻어지는 셈입니다.

세 규칙과 추이성을 함께 쓰면 더 복잡한 관계도 유도할 수 있습니다. 예를 들어 다음처럼 필드를 빼고, 필드 타입을 넓히고, 순서를 바꾸는 단계를 이어 붙이면 됩니다.

\\[
\\{c : \mathtt{num}, a : \mathtt{num}\\} <: \\{a : \mathtt{num}, c : \mathtt{num}\\} <: \\{a : \mathtt{num}\\} <: \\{a : \top\\}
\\]

레코드 타입 몇 개 사이의 관계를 그림으로 그리면 다음과 같습니다. 화살표는 서브타입에서 슈퍼타입으로 향합니다.

<div style="text-align:center">
<svg viewBox="0 0 540 320" width="100%" style="max-width: 520px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="레코드 타입 사이의 서브타입 관계: {a: Number, b: Number}는 필드를 빼면 {a: Number}, 필드 타입을 넓히면 {a: Top, b: Top}의 서브타입이고, 둘은 모두 {a: Top}의 서브타입이며, {a: Top}은 {}의 서브타입이다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="subtype-polymorphism-4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="240.0" y="19" width="60" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="270" y="41" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">{}</text>
<rect x="220.0" y="89" width="100" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="270" y="111" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">{a: Top}</text>
<rect x="80.0" y="159" width="120" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="140" y="181" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">{a: Number}</text>
<rect x="320.0" y="159" width="160" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="400" y="181" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">{a: Top, b: Top}</text>
<rect x="170.0" y="229" width="200" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="270" y="251" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">{a: Number, b: Number}</text>
<polyline points="270,89 270,55" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#subtype-polymorphism-4)"/>
<polyline points="172.5,159 237.5,125" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#subtype-polymorphism-4)"/>
<polyline points="367.5,159 302.5,125" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#subtype-polymorphism-4)"/>
<polyline points="237.5,229 172.5,195" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#subtype-polymorphism-4)"/>
<polyline points="302.5,229 367.5,195" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#subtype-polymorphism-4)"/>
<polyline points="110,300 150,300" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#subtype-polymorphism-4)"/>
<text x="156" y="305" text-anchor="start" font-size="13">필드 빼기</text>
<polyline points="260,300 300,300" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#subtype-polymorphism-4)"/>
<text x="306" y="305" text-anchor="start" font-size="13">필드 타입 넓히기</text>
<text x="440" y="40" text-anchor="start" font-size="13">A → B: A &lt;: B</text>
</svg>
</div>

> **생각해 보기** \\(\\{\\} \\)(필드가 하나도 없는 레코드 타입)은 어떤 타입들의 슈퍼타입일까요? \\(\top\\)과는 어떻게 다를까요?

### 함수 타입

이번에는 함수 타입 사이의 서브타입 관계를 생각해 봅시다. 다음 함수 `f`는 함수 `g`를 받아 `g(42)`의 필드 `a`를 꺼냅니다.

```pl
/* STFAE */
val f = (g: Number => {a: Top}) => g(42).a
```

`f`에는 어떤 함수들을 넘겨도 안전할까요? 먼저 다음 `h`를 봅시다.

```pl
/* STFAE */
val h: Top => {a: Top} = (x: Top) => {a=x}
// (Top => {a: Top}) <: (Number => {a: Top})
f(h)
```

`f`는 `g`에 수 `42`만 넘깁니다. `h`는 수뿐 아니라 아무 값이나 받을 수 있으니, `42`를 받는 데 아무 문제가 없습니다. 즉 매개변수 타입 \\(\tau_1\\)이 매개변수 타입 \\(\tau_1'\\)의 **슈퍼타입**이면 \\(\tau_1 \to \tau_2\\)는 \\(\tau_1' \to \tau_2\\)의 서브타입입니다. 더 많은 것을 받아 주는 함수가 더 좋은 함수입니다.

다음 `h`도 봅시다.

```pl
/* STFAE */
val h: Number => {a: Number} = (x: Number) => {a=x}
// (Number => {a: Number}) <: (Number => {a: Top})
f(h)
```

`f`는 `g`의 결과에서 필드 `a`를 꺼내 쓰기만 하므로, `h`가 돌려주는 레코드의 필드 `a`가 수라도 상관없습니다. 즉 반환 타입 \\(\tau_2\\)가 반환 타입 \\(\tau_2'\\)의 **서브타입**이면 \\(\tau_1 \to \tau_2\\)는 \\(\tau_1 \to \tau_2'\\)의 서브타입입니다. 더 구체적인 것을 돌려주는 함수가 더 좋은 함수입니다.

두 조건을 합치면, 다음을 모두 만족할 때 \\(\tau_1 \to \tau_2\\)는 \\(\tau_1' \to \tau_2'\\)의 서브타입입니다.

- 매개변수 타입 \\(\tau_1\\)이 매개변수 타입 \\(\tau_1'\\)의 **슈퍼타입**이다.
- 반환 타입 \\(\tau_2\\)가 반환 타입 \\(\tau_2'\\)의 **서브타입**이다.

\\[
\begin{prooftree}
\AxiomC{$\tau_1 :> \tau_1'$}
\AxiomC{$\tau_2 <: \tau_2'$}
\BinaryInfC{$(\tau_1 \to \tau_2) <: (\tau_1' \to \tau_2')$}
\end{prooftree}
\\]

여기서 \\(\tau_1 :> \tau_1'\\)은 \\(\tau_1' <: \tau_1\\)과 같은 뜻입니다. 매개변수 쪽은 관계의 방향이 뒤집히고, 반환 쪽은 방향이 그대로입니다. 이를 흔히 매개변수 타입은 <a id="g-contravariant"></a>반변(contravariant), 반환 타입은 <a id="g-covariant"></a>공변(covariant)이라고 부릅니다.

집합으로 보면 이렇습니다. 함수 타입 \\(\tau_1 \to \tau_2\\)는 \\(\\{ f \mid \forall v \in \tau_1. \enspace  f(v) \in \tau_2 \\}\\), 즉 "\\(\tau_1\\)의 모든 값을 받아 \\(\tau_2\\)의 값을 돌려주는 함수들"의 집합입니다. \\(\tau_1' \subseteq \tau_1\\)이고 \\(\tau_2 \subseteq \tau_2'\\)이라고 합시다. \\(\tau_1 \to \tau_2\\)에 속한 함수 \\(f\\)는 더 큰 집합 \\(\tau_1\\)의 모든 값을 받을 수 있으니 그 일부인 \\(\tau_1'\\)의 값도 당연히 받을 수 있고, 돌려주는 값은 \\(\tau_2\\)에 속하니 더 큰 집합 \\(\tau_2'\\)에도 속합니다. 따라서 \\(f\\)는 \\(\tau_1' \to \tau_2'\\)에도 속합니다.

<div style="text-align:center">
<svg viewBox="0 0 760 240" width="100%" style="max-width: 760px; letter-spacing: normal; word-spacing: normal" xmlns="http://www.w3.org/2000/svg">
<text x="60" y="62" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">τ₁</text>
<circle cx="60" cy="135" r="58" fill="#e8706a" fill-opacity="0.7" stroke="currentColor" stroke-width="2.5"/><circle cx="60" cy="150" r="34" fill="#5cc93a" fill-opacity="0.7" stroke="currentColor" stroke-width="2.5"/><text x="60" y="155" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">τ′₁</text>
<text x="140" y="142" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">∧</text>
<text x="210" y="90" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">τ′₂</text>
<circle cx="210" cy="140" r="38" fill="#5cc93a" fill-opacity="0.7" stroke="currentColor" stroke-width="2.5"/><circle cx="210" cy="150" r="20" fill="#e8706a" fill-opacity="0.7" stroke="currentColor" stroke-width="2.5"/><text x="210" y="156" font-family="'Times New Roman', Times, serif" font-size="15" fill="currentColor" text-anchor="middle">τ₂</text>
<text x="282" y="145" font-family="'Times New Roman', Times, serif" font-size="28" fill="currentColor" text-anchor="middle">⟹</text>
<text x="400" y="30" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">τ₁ → τ₂</text>
<text x="365" y="68" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">τ₁</text><circle cx="365" cy="135" r="55" fill="#e8706a" fill-opacity="0.7" stroke="currentColor" stroke-width="2.5"/>
<text x="436" y="142" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">→</text>
<text x="468" y="105" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">τ₂</text><circle cx="468" cy="135" r="20" fill="#e8706a" fill-opacity="0.7" stroke="currentColor" stroke-width="2.5"/>
<text x="525" y="30" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">&lt;:</text><text x="525" y="142" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">⊆</text>
<text x="650" y="30" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">τ′₁ → τ′₂</text>
<text x="590" y="88" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">τ′₁</text><circle cx="590" cy="135" r="36" fill="#5cc93a" fill-opacity="0.7" stroke="currentColor" stroke-width="2.5"/>
<text x="650" y="142" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">→</text>
<text x="710" y="88" font-family="'Times New Roman', Times, serif" font-size="19" fill="currentColor" text-anchor="middle">τ′₂</text><circle cx="710" cy="135" r="36" fill="#5cc93a" fill-opacity="0.7" stroke="currentColor" stroke-width="2.5"/>
<text x="410" y="225" font-family="'Times New Roman', Times, serif" font-size="16" fill="currentColor" text-anchor="middle">{ f | ∀v ∈ τ₁. f(v) ∈ τ₂ }</text>
<text x="650" y="225" font-family="'Times New Roman', Times, serif" font-size="16" fill="currentColor" text-anchor="middle">{ f | ∀v ∈ τ′₁. f(v) ∈ τ′₂ }</text>
</svg>
</div>

> **자주 하는 실수** 함수 타입의 서브타입 관계를 매개변수와 반환 타입 모두 같은 방향으로, 즉 \\(\tau_1 <: \tau_1'\\)이고 \\(\tau_2 <: \tau_2'\\)이면 \\(\tau_1 \to \tau_2 <: \tau_1' \to \tau_2'\\)이라고 정의하는 것입니다. 그러면 `{a: Number} => Number` 타입의 함수 `(x: {a: Number}) => x.a`를 `{} => Number` 타입 자리에 넘길 수 있게 되고, 그 함수에 `{}`를 넘겨 필드 `a`를 찾다가 실행 중에 오류가 납니다.

### 포섭 규칙을 쓴 타입 규칙

서브타입 관계를 정의했으니, 이제 타입 규칙에 반영해야 합니다. 한 가지 방법은 일반적인 <a id="g-subsumption"></a>**포섭**(subsumption) 규칙을 타입 규칙에 추가하는 것입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \tau$}
\AxiomC{$\tau <: \tau'$}
\BinaryInfC{$\Gamma \vdash e : \tau'$}
\end{prooftree}
\\]

"\\(e\\)의 타입이 \\(\tau\\)이고 \\(\tau\\)가 \\(\tau'\\)의 서브타입이면, \\(e\\)의 타입을 \\(\tau'\\)이라고 해도 된다"라는 뜻입니다. 이 규칙이 있으면 앞에서 거부되었던 다음 식도 타입 검사를 통과합니다.

```stfae,run
/* STFAE */
val x: {a: Number} = {a=2, b=3}; x.a
```

\\[
\small
\begin{prooftree}
\AxiomC{$\ldots$}
\UnaryInfC{$\varnothing \vdash \\{a\enspace \mathtt{=}\enspace 2, b\enspace \mathtt{=}\enspace 3\\} : \\{a : \mathtt{num}, b : \mathtt{num}\\}$}
\AxiomC{$\ldots$}
\UnaryInfC{$\\{a : \mathtt{num}, b : \mathtt{num}\\} <: \\{a : \mathtt{num}\\}$}
\BinaryInfC{$\varnothing \vdash \\{a\enspace \mathtt{=}\enspace 2, b\enspace \mathtt{=}\enspace 3\\} : \\{a : \mathtt{num}\\}$}
\AxiomC{$\ldots$}
\BinaryInfC{$\varnothing \vdash \mathtt{val}\enspace x : \\{a : \mathtt{num}\\}\enspace \mathtt{=}\enspace \\{a\enspace \mathtt{=}\enspace 2, b\enspace \mathtt{=}\enspace 3\\};\enspace x.a : \mathtt{num}$}
\end{prooftree}
\\]

포섭 규칙으로 레코드 \\(\\{a\enspace \mathtt{=}\enspace 2, b\enspace \mathtt{=}\enspace 3\\}\\)의 타입을 \\(\\{a : \mathtt{num}\\}\\)으로 바꾼 뒤, 표시된 타입과 같으므로 \\(\tau\texttt{-Val}\_{\tau}\\)을 쓸 수 있습니다.

하지만 이 방법은 **알고리즘적이지 않습니다**(not algorithmic). 포섭 규칙은 어떤 식에든, 언제든 쓸 수 있고, 결과 타입 \\(\tau'\\)은 \\(\tau\\)의 슈퍼타입이기만 하면 무엇이든 됩니다. 타입 검사기를 구현하려면 "언제 포섭 규칙을 쓰고, 그때 \\(\tau'\\)으로 어떤 타입을 골라야 하는가"를 정해야 하는데, 규칙 자체는 이에 대해 아무것도 알려 주지 않습니다. 위의 예에서도 \\(\\{a : \mathtt{num}\\}\\)을 고른 것은 사람이 결론을 보고 거꾸로 맞춘 것입니다.

### 포섭 규칙 없는 알고리즘적 타입 규칙

다른 방법은 포섭 규칙 없이, 서브타입 관계가 필요한 곳마다 각 타입 규칙에 **직접 적용**하는 것입니다. 이 방법은 알고리즘적입니다. 어디서 서브타입 관계를 검사할지가 규칙에 고정되어 있고, 비교할 두 타입도 모두 정해져 있기 때문입니다.

서브타입 관계가 필요한 곳은 "어떤 타입이 필요한 자리에 다른 타입의 값이 들어가는 곳"입니다. 덧셈과 곱셈의 피연산자, 타입 표기가 있는 `val`의 초기화 식, 함수 적용의 인자가 그렇습니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \tau_1 \quad \tau_1 <: \mathtt{num}$}
\AxiomC{$\Gamma \vdash e_2 : \tau_2 \quad \tau_2 <: \mathtt{num}$}
\LeftLabel{$\tau\texttt{-Add}$}
\BinaryInfC{$\Gamma \vdash e_1\enspace \mathtt{+}\enspace e_2 : \mathtt{num}$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \tau_1 \quad \tau_1 <: \mathtt{num}$}
\AxiomC{$\Gamma \vdash e_2 : \tau_2 \quad \tau_2 <: \mathtt{num}$}
\LeftLabel{$\tau\texttt{-Mul}$}
\BinaryInfC{$\Gamma \vdash e_1\enspace \mathtt{\ast}\enspace e_2 : \mathtt{num}$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \tau_1$}
\AxiomC{$\tau_1 <: \tau_0$}
\AxiomC{$\Gamma[x : \tau_0] \vdash e_2 : \tau_2$}
\LeftLabel{$\tau\texttt{-Val}\_{\tau}$}
\TrinaryInfC{$\Gamma \vdash \mathtt{val}\enspace x:\tau_0\enspace \mathtt{=}\enspace e_1;\enspace e_2 : \tau_2$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : \tau_1 \to \tau_2$}
\AxiomC{$\Gamma \vdash e_1 : \tau_3$}
\AxiomC{$\tau_3 <: \tau_1$}
\LeftLabel{$\tau\texttt{-App}$}
\TrinaryInfC{$\Gamma \vdash e_0(e_1) : \tau_2$}
\end{prooftree}
\\]

덧셈에서 피연산자의 타입이 꼭 \\(\mathtt{num}\\)일 필요 없이 \\(\mathtt{num}\\)의 서브타입이면 된다는 점에 주목하세요. 예를 들어 `1 + exit`은 `exit`의 타입이 \\(\bot <: \mathtt{num}\\)이므로 타입 검사를 통과하고, 그 타입은 \\(\mathtt{num}\\)입니다. 또 \\(\tau\texttt{-Val}\_{\tau}\\)에서는 서브타입 관계 \\(\tau_1 <: \tau_0\\)만 검사하면 되므로, 앞의 예제 `val x: {a: Number} = {a=2, b=3}; x.a`도 이제 포섭 규칙 없이 타입 검사를 통과합니다.

이 규칙들을 구현하려면 두 타입이 서브타입 관계인지 판정하는 함수가 필요합니다. 앞의 서브타입 규칙들을 바탕으로 `isSubType(lty: Type, rty: Type): Boolean`을 만들고, 타입 검사기의 `mustSame`을 알맞은 곳에서 서브타입 검사로 바꾸면 됩니다. 이것은 연습 문제로 남겨 둡니다.

> **생각해 보기** 알고리즘적 타입 규칙에서는 반사성과 추이성 규칙을 그대로 구현할 수 있을까요? 특히 추이성 규칙의 \\(\tau'\\)은 결론에 나타나지 않는다는 점에 주목해 보세요. 레코드 타입의 세 규칙(필드 추가, 필드 타입, 필드 순서)을 하나의 규칙으로 합쳐서, 추이성 없이도 같은 관계를 판정할 수 있게 만들어 보세요.

## 정리

- 서브타입 다형성은 타입 사이에 서브타입 관계 \\(<:\\)를 도입하는 방식의 다형성입니다. 타입을 값의 집합으로 보면 서브타입 관계는 부분집합 관계에 해당합니다.
- \\(\mathsf{STFAE}\\)는 \\(\mathsf{TFAE}\\)에 `val`의 선택적 타입 표기, 레코드, 필드 접근, `exit`, 레코드 타입, 최하위 타입 \\(\bot\\), 최상위 타입 \\(\top\\)을 더한 언어입니다.
- 인터프리터에는 레코드 값이 새로 생깁니다. `exit`은 값을 만들지 않으므로 자연 의미 규칙이 없고, 타입은 \\(\bot\\)입니다.
- 서브타입 관계는 반사적이고 추이적이며, \\(\bot\\)은 모든 타입의 서브타입, \\(\top\\)은 모든 타입의 슈퍼타입입니다.
- 레코드 타입은 필드를 추가하거나, 필드 타입을 서브타입으로 바꾸거나, 필드 순서를 바꾸면 서브타입이 됩니다.
- 함수 타입은 매개변수 타입이 슈퍼타입이고 반환 타입이 서브타입일 때 서브타입이 됩니다: \\(\tau_1 :> \tau_1'\\)이고 \\(\tau_2 <: \tau_2'\\)이면 \\((\tau_1 \to \tau_2) <: (\tau_1' \to \tau_2')\\).
- 서브타입 관계를 타입 규칙에 반영하는 방법으로, 일반적인 포섭 규칙을 추가하는 방법(알고리즘적이지 않음)과 각 규칙에서 필요한 곳에 직접 적용하는 방법(알고리즘적)이 있습니다.

## 연습 문제

1. 다음 관계가 성립하는지 판정하고, 성립하면 서브타입 규칙으로 유도해 보세요.
   - \\(\\{a : \mathtt{num}, b : \bot\\} <: \\{b : \mathtt{num}\\}\\)
   - \\((\top \to \bot) <: (\mathtt{num} \to \mathtt{num})\\)
   - \\((\mathtt{num} \to \mathtt{num}) <: (\top \to \top)\\)
   - \\((\\{a : \mathtt{num}\\} \to \mathtt{num}) <: (\\{a : \mathtt{num}, b : \mathtt{num}\\} \to \top)\\)
2. 다음 \\(\mathsf{STFAE}\\) 식이 알고리즘적 타입 규칙으로 타입 검사를 통과하는지 판정하고, 통과하면 그 타입을 구하세요.
   - `val f = (x: {a: Number}) => x.a; f({c=4, a=5})`
   - `val f = (g: Number => {a: Top}) => g(42).a; f((x: Top) => {a=x, b=x})`
   - `val x: {a: Number} = {a=1, b=2}; x.b`
   - `(x: Number) => x + exit`
3. 마지막 문제에서 `x.b`는 실행하면 값이 있는데도 타입 검사를 통과하지 못합니다. 이것이 타입 시스템이 안전하지 않다는 뜻인지, 아니면 다른 성질의 문제인지 설명하세요.
4. 서브타입 관계를 판정하는 함수 `isSubType(lty: Type, rty: Type): Boolean`을 구현하세요. \\(\bot\\)과 \\(\top\\), 함수 타입, 레코드 타입의 경우를 각각 처리해야 합니다. 레코드 타입은 `Map`으로 표현되어 있으므로, 오른쪽 레코드 타입의 모든 필드에 대해 왼쪽에 같은 이름의 필드가 있고 그 타입이 서브타입인지 확인하면 됩니다.
5. 강의 연습 과제 `stfae`(Exercise #15)에서 \\(\mathsf{STFAE}\\)의 `typeCheck`와 `interp`를 구현해 보세요.

6. <a id="ex-subtype-polymorphism-6"></a>★★★ 이 문제에서는 \\(\mathsf{STFAE}\\)에 불 타입 \\(\mathtt{bool}\\)(구체 문법 `Boolean`)과 `true`, `false`, 조건식 `if (e0) e1 else e2`를 더했다고 합시다. \\(\mathtt{bool}\\)은 서브타입 관계에서 \\(\mathtt{num}\\)처럼 다룹니다. 즉 자기 자신과 \\(\top\\)의 서브타입이고, \\(\bot\\)만 \\(\mathtt{bool}\\)의 서브타입입니다.

   (a) 다음 각 쌍의 빈칸에 \\(<:\\)(왼쪽이 오른쪽의 서브타입), \\(:>\\)(오른쪽이 왼쪽의 서브타입), X(어느 쪽으로도 서브타입 관계가 없음) 중 하나를 쓰세요.

   \\[
   \begin{array}{lcl}
   \\{a : \mathtt{num}, b : \mathtt{num}\\} & \square & \\{a : \mathtt{num}\\} \\\\
   \\{a : \top, b : \mathtt{num}\\} & \square & \\{b : \mathtt{num}, a : \mathtt{num}\\} \\\\
   \\{a : \top, b : \mathtt{num}\\} & \square & \\{a : \mathtt{num}\\} \\\\
   \mathtt{num} \to \mathtt{num} & \square & \top \to \mathtt{num} \\\\
   \mathtt{num} \to (\mathtt{num} \to \mathtt{num}) & \square & \bot \to (\top \to \top) \\\\
   (\bot \to \top) \to \bot & \square & (\mathtt{num} \to \mathtt{num}) \to \mathtt{num} \\\\
   \\{a : (\mathtt{num} \to \top) \to \mathtt{num}\\} \to \\{c : \top\\} & \square & \\{a : (\top \to \mathtt{num}) \to \top\\} \to \\{b : \mathtt{num}, c : \mathtt{num}\\}
   \end{array}
   \\]

   (b) 두 타입 \\(\tau\\)와 \\(\tau'\\)의 **최소 상계**(least upper bound)를 \\(\tau \sqcup \tau'\\)이라고 쓰고 조인(join)이라고 부릅니다. 즉 \\(\tau \sqcup \tau'\\)은 다음을 만족하는 타입입니다.
   - \\(\tau <: \tau \sqcup \tau'\\)이고 \\(\tau' <: \tau \sqcup \tau'\\)이다.
   - 어떤 타입 \\(\tau''\\)이든 \\(\tau <: \tau''\\)이고 \\(\tau' <: \tau''\\)이면 \\(\tau \sqcup \tau' <: \tau''\\)이다.

   다음 조인의 결과를 쓰세요. 결과가 없으면 X라고 쓰세요.

   \\[
   \begin{array}{lcl}
   \mathtt{num} \sqcup \mathtt{bool} & = & \square \\\\
   \\{a : \mathtt{num}, b : \mathtt{num}\\} \sqcup \\{a : \mathtt{bool}\\} & = & \square \\\\
   (\mathtt{num} \to \mathtt{num}) \sqcup (\mathtt{bool} \to \mathtt{bool}) & = & \square \\\\
   ((\mathtt{num} \to \top) \to \mathtt{bool}) \sqcup ((\bot \to \mathtt{bool}) \to \mathtt{num}) & = & \square \\\\
   (\\{a : \top, b : \mathtt{bool}\\} \to \mathtt{num}) \sqcup (\\{a : \mathtt{num}\\} \to \mathtt{bool}) & = & \square
   \end{array}
   \\]

   (c) 조건식의 타입 규칙이 다음과 같다고 합시다. 두 갈래의 타입이 같아야 합니다.

   \\[
   \begin{prooftree}
   \AxiomC{$\Gamma \vdash e_0 : \mathtt{bool}$}
   \AxiomC{$\Gamma \vdash e_1 : \tau$}
   \AxiomC{$\Gamma \vdash e_2 : \tau$}
   \LeftLabel{$\tau\texttt{-If}$}
   \TrinaryInfC{$\Gamma \vdash \mathtt{if}\ (e_0)\ e_1\ \mathtt{else}\ e_2 : \tau$}
   \end{prooftree}
   \\]

   포섭 규칙을 쓰면 다음 식도 타입 검사를 통과하지만, 포섭 규칙은 알고리즘적이지 않습니다. 포섭 규칙 **없이** 다음 식이 타입 검사를 통과하도록 \\(\tau\texttt{-If}\\)를 알고리즘적인 규칙으로 고치세요.

   ```stfae
   /* STFAE */
   val f = (x: Boolean) => if (x) {a = 1, b = true} else {a = 2};
   f(true).a * f(false).a
   ```

   <details><summary>힌트</summary>

   (a) 함수 타입은 매개변수 쪽에서 방향이 뒤집힙니다. 레코드 타입은 오른쪽의 필드가 모두 왼쪽에 있어야 합니다. (b) 함수 타입의 조인을 구하려면, 매개변수 쪽에서는 거꾸로 두 타입의 **최대 하계**(둘 모두의 서브타입 중 가장 큰 것)가 필요합니다. 레코드 타입의 조인은 공통 필드만 남깁니다. (c) 두 갈래의 타입을 모두 받아 줄 수 있는 가장 작은 타입이 무엇일까요?

   </details>

   [해답 →](./answers-2.md#ans-subtype-polymorphism-6)

7. <a id="ex-subtype-polymorphism-7"></a>★★ \\(\mathsf{STFAE}\\)의 함수 타입 서브타입 규칙을 왼쪽에서 오른쪽으로 바꾸었다고 합시다. 매개변수 타입의 관계 방향을 뒤집어, 매개변수도 공변으로 비교합니다.

   \\[
   \begin{prooftree}
   \AxiomC{$\tau_1 :> \tau_1'$}
   \AxiomC{$\tau_2 <: \tau_2'$}
   \BinaryInfC{$(\tau_1 \to \tau_2) <: (\tau_1' \to \tau_2')$}
   \end{prooftree}
   \qquad\qquad
   \begin{prooftree}
   \AxiomC{$\tau_1 <: \tau_1'$}
   \AxiomC{$\tau_2 <: \tau_2'$}
   \BinaryInfC{$(\tau_1 \to \tau_2) <: (\tau_1' \to \tau_2')$}
   \end{prooftree}
   \\]

   바꾼 서브타입 관계를 써도 \\(\mathsf{STFAE}\\)의 타입 시스템은 여전히 건전할까요? 건전하다면 이유를 설명하고, 건전하지 않다면 타입 검사를 통과하지만 이 변경 때문에 실행 중에 타입 오류가 나는 \\(\mathsf{STFAE}\\) 식을 만드세요.

   <details><summary>힌트</summary>

   "아무 값이나 받는 함수"가 필요한 자리에 "수만 받는 함수"를 넣을 수 있게 됩니다. 그 자리에서 함수에 수가 아닌 값을 넘기면 어떻게 될까요?

   </details>

   [해답 →](./answers-2.md#ans-subtype-polymorphism-7)
