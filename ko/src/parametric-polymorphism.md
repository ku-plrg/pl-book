# 매개변수 다형성

지금까지 만든 타입 있는 언어에서는 함수 매개변수마다 타입을 딱 하나씩 적어야 했습니다. 그런데 "받은 값을 그대로 돌려주는 함수"처럼 값의 타입과 상관없이 똑같이 동작하는 함수는 어떻게 해야 할까요? 숫자용, 함수용 항등 함수를 따로따로 만들어야 할까요? 이 장에서는 이 문제를 푸는 대표적인 방법인 <a id="g-parametric-polymorphism"></a>매개변수 다형성(parametric polymorphism)을 배웁니다. [타입 있는 언어](./typed-languages.md)에서 만든 \\(\mathsf{TFAE}\\)에 매개변수 다형성을 더한 언어 \\(\mathsf{PTFAE}\\)를 정의하고, 인터프리터와 자연 의미(natural semantics), 타입 검사기와 타입 규칙을 차례로 만들어 봅니다. 그 과정에서 타입 변수를 다룰 때 피할 수 없는 <a id="g-substitution"></a>치환(substitution)의 함정, 즉 섀도잉(shadowing)과 변수 <a id="g-capture"></a>포획(capture)을 꼼꼼히 살펴보고, 마지막으로 처음 만든 타입 시스템에 숨어 있던 구멍을 찾아 메웁니다.

이 장에서 만들 `PTFAE` 인터프리터를 먼저 돌려 봅시다. 프로그램을 고쳐 가며 실행해 보세요.

<div class="playground" data-lang="PTFAE"></div>

## 매개변수 다형성

### 다형성

다음 Scala 프로그램을 봅시다. `f`는 항등 함수이고, 여기에 ① `1`, ② `true`, ③ `(y: Int) => y + 1`을 차례로 넘기고 싶습니다.

```scala
def f(x: ???): ??? = x;
f(1); f(true); f((y: Int) => y + 1)
```

안타깝게도 `x`에는 어떤 타입도 붙일 수 없습니다. `x`의 타입이 ① `Int`, ② `Boolean`, ③ `Int => Int`가 동시에 되어야 하기 때문입니다. 하나만 고르면 나머지 두 호출이 타입 오류가 됩니다.

이 문제를 푸는 열쇠가 <a id="g-polymorphism"></a>다형성(polymorphism)입니다. 다형성이란 하나의 대상을 **여러 타입**으로 쓸 수 있게 하는 것입니다. 다형성에는 여러 종류가 있습니다.

- 매개변수 다형성(parametric polymorphism)
- <a id="g-subtype-polymorphism"></a>서브타입 다형성(subtype polymorphism)
- <a id="g-ad-hoc-polymorphism"></a>임시 다형성(ad-hoc polymorphism): Java의 <a id="g-overloading"></a>오버로딩(overloading), Haskell의 <a id="g-type-class"></a>타입 클래스(type class) 등
- 그 밖의 여러 가지

이 장에서는 이 중 매개변수 다형성을 다루고, 서브타입 다형성은 다음 장 [서브타입 다형성](./subtype-polymorphism.md)에서 다룹니다.

### 타입 변수와 타입 인자

> **정의(매개변수 다형성)** 매개변수 다형성은 <a id="g-type-variable"></a>**타입 변수**(type variable)를 도입하고, 이를 <a id="g-type-argument"></a>**타입 인자**(type argument)로 구체화(instantiate)하는 방식의 다형성입니다.

앞의 예제를 매개변수 다형성으로 고치면 다음과 같습니다.

```scala
def f[T](x: T): T = x;
f[Int](1); f[Boolean](true); f[Int => Int]((y: Int) => y)
```

여기서 `T`가 타입 변수(또는 <a id="g-type-parameter"></a>타입 매개변수(type parameter))입니다. `T`는 `Int`, `Boolean`, `Int => Int`처럼 아무 타입으로나 구체화될 수 있고, 그 방법은 원하는 타입을 타입 인자로 넘기는 것입니다. `f[Int]`라고 쓰는 순간 `f`는 `Int => Int` 타입의 함수가 되고, `f[Boolean]`이라고 쓰면 `Boolean => Boolean` 타입의 함수가 되는 셈입니다. 함수가 값을 인자로 받듯이, 타입을 인자로 받는다고 생각하면 됩니다.

<div style="text-align:center">
<svg viewBox="0 0 650 200" width="100%" style="max-width: 620px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="다형 함수 f : [T] T =&gt; T에 타입 인자 Int, Boolean, Int =&gt; Int를 넘기면 각각 Int =&gt; Int, Boolean =&gt; Boolean, (Int =&gt; Int) =&gt; (Int =&gt; Int) 타입의 함수가 된다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="parametric-polymorphism-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="80" width="190" height="40" rx="4" fill="#2a408e"/>
<text x="115" y="105" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">f : [T] T =&gt; T</text>
<polyline points="210,100 355,40" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#parametric-polymorphism-1)"/>
<text x="366" y="45" text-anchor="start" font-family="ui-monospace, Menlo, monospace">Int =&gt; Int</text>
<text x="300" y="54" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13" font-weight="bold">[Int]</text>
<polyline points="210,100 355,100" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#parametric-polymorphism-1)"/>
<text x="366" y="105" text-anchor="start" font-family="ui-monospace, Menlo, monospace">Boolean =&gt; Boolean</text>
<text x="300" y="91" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13" font-weight="bold">[Boolean]</text>
<polyline points="210,100 355,160" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#parametric-polymorphism-1)"/>
<text x="366" y="165" text-anchor="start" font-family="ui-monospace, Menlo, monospace">(Int =&gt; Int) =&gt; (Int =&gt; Int)</text>
<text x="255" y="157" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13" font-weight="bold">[Int =&gt; Int]</text>
</svg>
</div>

매개변수 다형성은 보통 함수와 데이터 타입에 적용되며, 각각을 <a id="g-generic-function"></a>제네릭 함수(generic function), <a id="g-generic-data-type"></a>제네릭 데이터 타입(generic data type)이라고 부르기도 합니다. Scala의 `List[T]`나 `Option[T]`가 제네릭 데이터 타입의 익숙한 예입니다.

요즘 타입 있는 언어는 대부분 매개변수 다형성을 지원합니다. 같은 항등 함수를 여러 언어로 써 보면 다음과 같습니다.

```scala
// Scala
def f[T](x: T): T = x
```

```cpp
// C++
template <typename T> T f(T x) { return x; }
```

```rust
// Rust
fn f<T>(x: T) -> T { return x; }
```

```haskell
-- Haskell
f :: a -> a
f x = x
```

문법은 제각각이지만 생각은 같습니다. 타입 자리에 변수를 하나 두고, 쓸 때 채워 넣는 것입니다. 위의 언어들에서는 `f(1)`처럼 타입 인자를 생략해도 되는데, 컴파일러가 타입 인자를 알아서 찾아 주기 때문입니다. 이 이야기는 [타입 추론](./type-inference.md)에서 다시 만납니다.

## PTFAE: 매개변수 다형성을 더한 TFAE

이제 \\(\mathsf{TFAE}\\)를 확장해 \\(\mathsf{PTFAE}\\)를 만들어 봅시다. 함수나 데이터 타입에만 타입 매개변수를 붙일 수 있게 하는 대신, \\(\mathsf{PTFAE}\\)에서는 **어떤 식이든** 타입 변수로 매개변수화할 수 있게 합니다.

```ptfae
/* PTFAE */
val f = forall[T] { (x: T) => x }       // [T](T => T)
val x = f[Number](42)                   // Number
val y = f[Number => Number](f[Number])  // Number => Number
val z = f[[T](T => T)](f)               // [T](T => T)
...
```

`forall[t] e`는 식 `e`를 타입 변수 `t`로 매개변수화하고, `e[t]`는 식 `e`의 타입 변수를 타입 `t`로 구체화합니다. `f`의 타입 `[T](T => T)`는 "어떤 타입 `T`를 주든 `T => T`가 되는 타입"이라고 읽습니다.

마지막 줄이 재미있습니다. `f`에 넘긴 타입 인자 `[T](T => T)`는 바로 `f` 자신의 타입입니다. 그래서 `f[[T](T => T)]`는 `[T](T => T)`를 받아 `[T](T => T)`를 돌려주는 함수가 되고, 여기에 `f` 자신을 넘길 수 있습니다. 다형 타입 자체도 타입 인자로 쓸 수 있는 것입니다.

\\(\mathsf{PTFAE}\\)를 만들려면 \\(\mathsf{TFAE}\\)에 다음 네 가지를 더해야 합니다.

1. <a id="g-type-abstraction"></a>타입 추상화(type abstraction): `forall`
2. <a id="g-type-application"></a>타입 적용(type application)
3. 타입 변수(type variable)
4. <a id="g-polymorphic-type"></a>다형 타입(polymorphic type)

앞의 둘은 식이고, 뒤의 둘은 타입입니다.

### 구체 문법

\\(\mathsf{TFAE}\\)의 구체 문법(concrete syntax)을 다음과 같이 확장합니다.

```bnf
// expressions
<expr> ::= ...
         | "forall" "[" <id> "]" <expr>
         | <expr> "[" <type> "]"

// types
<type> ::= ...
         | <id>
         | "[" <id> "]" <type>
```

식에는 타입 추상화 `forall[T] e`와 타입 적용 `e[τ]`가 생기고, 타입에는 타입 변수 `T`와 다형 타입 `[T]τ`가 생깁니다.

### 추상 문법

추상 문법(abstract syntax)은 다음과 같습니다. 수식에서는 타입 추상화와 다형 타입을 모두 \\(\forall\\)로 씁니다.

\\[
\begin{array}{lrcll}
\text{Expressions} & \mathbb{E} \ni e & \mathtt{::=} & \ldots & \\\\
& & \mid & \forall\alpha.e & (\texttt{TypeAbs}) \\\\
& & \mid & e[\tau] & (\texttt{TypeApp}) \\\\
\text{Types} & \mathbb{T} \ni \tau & \mathtt{::=} & \ldots & \\\\
& & \mid & \alpha & (\texttt{VarT}) \\\\
& & \mid & \forall\alpha.\tau & (\texttt{PolyT}) \\\\
\text{Type Variables} & \alpha \in \mathbb{X}\_{\alpha} & & & (\texttt{String})
\end{array}
\\]

Scala로는 이렇게 표현합니다.

```scala
enum Expr:
  ...
  case TypeAbs(name: String, body: Expr)
  case TypeApp(expr: Expr, ty: Type)

enum Type:
  ...
  case VarT(name: String)
  case PolyT(name: String, ty: Type)
```

## 인터프리터와 자연 의미

\\(\mathsf{TFAE}\\)와 마찬가지로 환경을 쓰는 인터프리터

```scala
def interp(expr: Expr, env: Env): Value = ???
```

와 환경을 쓰는 자연 의미 \\(\sigma \vdash e \Rightarrow v\\)를 정의합니다.

### 타입 추상화 값

여기서 새로운 종류의 값이 하나 필요합니다. 바로 <a id="g-type-abstraction-value"></a>**타입 추상화 값**(type abstraction value)입니다. 타입 추상화 `forall[T] e`의 몸통 `e`는 타입 인자가 주어졌을 때 계산해야 합니다. 그래서 함수가 클로저(closure)로 몸통의 계산을 미뤄 두듯, 타입 추상화도 몸통과 환경을 묶어 두고 타입 인자를 받을 때까지 계산을 **미룹니다**.

\\[
\begin{array}{lrcll}
\text{Values} & \mathbb{V} \ni v & \mathtt{::=} & n & (\texttt{NumV}) \\\\
& & \mid & \langle \lambda x.e, \sigma \rangle & (\texttt{CloV}) \\\\
& & \mid & \langle \forall\alpha.e, \sigma \rangle & (\texttt{TypeAbsV})
\end{array}
\\]

```scala
enum Value:
  case NumV(number: BigInt)
  case CloV(param: String, body: Expr, env: Env)
  case TypeAbsV(name: String, body: Expr, env: Env)
```

### 타입 추상화와 타입 적용

인터프리터는 다음과 같습니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...

  case TypeAbs(name, body) => TypeAbsV(name, body, env)

  case TypeApp(expr, ty) => interp(expr, env) match
    case TypeAbsV(name, body, fenv) => interp(body, fenv)
    case v => error(s"not a type abstraction: ${v.str}")
```

타입 추상화는 그대로 타입 추상화 값이 됩니다. 타입 적용은 먼저 식을 계산해 타입 추상화 값을 얻은 뒤, 그 안에 저장해 둔 환경 `fenv`에서 몸통을 계산합니다. 함수 적용과 아주 비슷하지만 한 가지가 다릅니다. 환경에 아무것도 추가하지 않는다는 점입니다. 타입 인자 `ty`는 실행 중에 전혀 쓰이지 않습니다. 타입은 오직 타입 검사기를 위한 정보이기 때문입니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{TypeAbs}$}
\UnaryInfC{$\sigma \vdash \forall\alpha.e \Rightarrow \langle \forall\alpha.e, \sigma \rangle$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e \Rightarrow \langle \forall\alpha.e', \sigma' \rangle$}
\AxiomC{$\sigma' \vdash e' \Rightarrow v$}
\LeftLabel{$\texttt{TypeApp}$}
\BinaryInfC{$\sigma \vdash e[\tau] \Rightarrow v$}
\end{prooftree}
\\]

> **생각해 보기** 항등 함수 `f = forall[T] { (x: T) => x }`에 대해 `f[Number]`와 `f[Number => Number]`를 계산하면 각각 어떤 값이 나올까요? 타입 인자가 실행에 쓰이지 않는다는 점을 떠올려 보세요.

## 타입 검사기와 타입 규칙

이제 \\(\mathsf{PTFAE}\\)의 타입 규칙 \\(\Gamma \vdash e : \tau\\)를 설계하고, 그에 맞춰 타입 검사기를 구현합니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = ???
```

타입 검사기는 식이 타입 검사를 통과하면(well-typed) 그 타입을 돌려주고, 아니면 타입 오류를 던집니다. \\(\mathsf{TFAE}\\)에서는 변수의 타입을 타입 환경(type environment) \\(\Gamma\\)로 기억했습니다.

\\[
\begin{array}{lcll}
\text{Type Environments} & \Gamma & \in \mathbb{X} \xrightarrow{\text{fin}} \mathbb{T} & (\texttt{TypeEnv})
\end{array}
\\]

```scala
type TypeEnv = Map[String, Type]
```

### 타입 변수를 위한 타입 환경

\\(\mathsf{PTFAE}\\)에서는 정보가 하나 더 필요합니다. 지금 위치에서 어떤 타입 변수가 타입 추상화로 정의되어 있는지 알아야 합니다. 그래서 타입 환경을 변수의 타입과 정의된 타입 변수 집합의 쌍으로 바꿉니다.

\\[
\begin{array}{lcll}
\text{Type Environments} & \Gamma & \in (\mathbb{X} \xrightarrow{\text{fin}} \mathbb{T}) \times \mathcal{P}(\mathbb{X}\_{\alpha}) & (\texttt{TypeEnv})
\end{array}
\\]

타입 변수 \\(\alpha\\)가 \\(\Gamma\\)에 정의되어 있으면 \\(\alpha \in \text{Dom}(\Gamma)\\)라고 쓰고, \\(\Gamma\\)에 \\(\alpha\\)를 추가한 환경을 \\(\Gamma[\alpha]\\)라고 씁니다.

```scala
case class TypeEnv(
  vars: Map[String, Type] = Map(),
  tys: Set[String] = Set(),
) {
  def addVar(pair: (String, Type)): TypeEnv =
    TypeEnv(vars + pair, tys)
  def addVars(pairs: Iterable[(String, Type)]): TypeEnv =
    TypeEnv(vars ++ pairs, tys)
  def addType(name: String): TypeEnv = TypeEnv(vars, tys + name)
}
```

### 타입의 올바른 형태

[대수적 데이터 타입](./algebraic-data-types.md)에서 그랬듯이, 정의되지 않은 타입 변수를 쓰지 못하게 하려면 타입 환경을 가지고 타입의 올바른 형태(well-formedness)를 검사해야 합니다. \\(\Gamma \vdash \tau\\)는 "\\(\Gamma\\)에서 \\(\tau\\)가 올바른 형태의 타입이다"라는 뜻입니다.

\\[
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\Gamma \vdash \mathtt{num}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma \vdash \tau$}
\AxiomC{$\Gamma \vdash \tau'$}
\BinaryInfC{$\Gamma \vdash \tau \to \tau'$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\alpha \in \text{Dom}(\Gamma)$}
\UnaryInfC{$\Gamma \vdash \alpha$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma[\alpha] \vdash \tau$}
\UnaryInfC{$\Gamma \vdash \forall\alpha.\tau$}
\end{prooftree}
\\]

타입 변수는 정의되어 있어야만 쓸 수 있고, 다형 타입 \\(\forall\alpha.\tau\\)는 그 안쪽 \\(\tau\\)에서 \\(\alpha\\)를 쓸 수 있게 해 줍니다. 구현도 규칙을 그대로 옮긴 것입니다.

```scala
def mustValid(ty: Type, tenv: TypeEnv): Type = ty match
  case NumT =>
    NumT
  case ArrowT(pty, rty) =>
    ArrowT(mustValid(pty, tenv), mustValid(rty, tenv))
  case VarT(name) =>
    if (!tenv.tys.contains(name)) error(s"unknown type: $name")
    VarT(name)
  case PolyT(name, ty) =>
    PolyT(name, mustValid(ty, tenv.addType(name)))
```

### 함수 정의

함수 정의에서는 \\(\mathsf{ATFAE}\\)와 마찬가지로 매개변수 타입의 올바른 형태를 검사합니다. 예를 들어 `(x: T) => x`가 어떤 `forall[T]` 안에도 있지 않다면 거부해야 합니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case Fun(param, paramTy, body) =>
    mustValid(paramTy, tenv)
    ArrowT(paramTy, typeCheck(body, tenv.addVar(param -> paramTy)))
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash \tau$}
\AxiomC{$\Gamma[x : \tau] \vdash e : \tau'$}
\LeftLabel{$\tau\texttt{-Fun}$}
\BinaryInfC{$\Gamma \vdash \lambda x\mathtt{:}\tau.e : \tau \to \tau'$}
\end{prooftree}
\\]

### 타입 추상화

타입 추상화 \\(\forall\alpha.e\\)의 타입은 무엇이어야 할까요? 한 걸음씩 채워 봅시다.

먼저 몸통 \\(e\\)의 타입을 검사해야 합니다. 어떤 타입 환경에서 검사해야 할까요? 몸통 안에서는 타입 변수 \\(\alpha\\)를 쓸 수 있어야 하므로, 타입 환경에 \\(\alpha\\)를 추가한 \\(\Gamma[\alpha]\\)에서 검사합니다. 그렇게 얻은 몸통의 타입이 \\(\tau\\)라면, 타입 추상화 전체의 타입은 "어떤 \\(\alpha\\)에 대해서든 \\(\tau\\)"인 다형 타입 \\(\forall\alpha.\tau\\)입니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case TypeAbs(name, body) =>
    PolyT(name, typeCheck(body, tenv.addType(name)))
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma[\alpha] \vdash e : \tau$}
\LeftLabel{$\tau\texttt{-TypeAbs}$}
\UnaryInfC{$\Gamma \vdash \forall\alpha.e : \forall\alpha.\tau$}
\end{prooftree}
\\]

그럴듯해 보이지만, 사실 이 규칙을 쓰면 타입 시스템이 **안전하지 않습니다**(unsound). 무엇이 문제인지는 이 장의 끝에서 살펴보고 고칩니다.

### 타입 적용

타입 적용 \\(e[\tau]\\)도 한 걸음씩 채워 봅시다.

먼저 주어진 타입 환경 \\(\Gamma\\)에서 \\(e\\)의 타입을 검사합니다. 타입 적용은 \\(e\\)의 타입이 **다형 타입**일 때만 허용해야 하므로, 그 타입이 \\(\forall\alpha.\tau'\\) 꼴인지 확인합니다. 다음으로 타입 인자 \\(\tau\\)의 올바른 형태도 검사해야 합니다. 마지막으로, 결과 타입은 몸통 타입 \\(\tau'\\)에서 타입 변수 \\(\alpha\\)를 타입 인자 \\(\tau\\)로 **치환**(substitution)한 \\(\tau'[\alpha \leftarrow \tau]\\)입니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case TypeApp(expr, ty) => typeCheck(expr, tenv) match
    case PolyT(name, bodyTy) => subst(bodyTy, name, mustValid(ty, tenv))
    case t => error(s"not a polymorphic type: ${t.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \forall\alpha.\tau'$}
\AxiomC{$\Gamma \vdash \tau$}
\LeftLabel{$\tau\texttt{-TypeApp}$}
\BinaryInfC{$\Gamma \vdash e[\tau] : \tau'[\alpha \leftarrow \tau]$}
\end{prooftree}
\\]

예를 들어 `f`의 타입이 \\(\forall T.T \to T\\)이면, `f[Number]`의 타입은 \\((T \to T)[T \leftarrow \mathtt{num}] = \mathtt{num} \to \mathtt{num}\\)입니다.

\\(\tau'[\alpha \leftarrow \tau]\\)는 \\(\tau'\\) 안의 **자유로운**(free) \\(\alpha\\)를 모두 \\(\tau\\)로 바꾼 타입입니다. 말은 쉽지만, 제대로 하려면 **가려짐**(shadowing)과 **포획 회피**(capture-avoiding)라는 두 가지를 신경 써야 합니다.

### 치환: 가려짐과 포획 회피

**가려짐.** 다음 치환을 봅시다.

\\[
(\alpha \to \beta \to (\forall\alpha.\alpha) \to \alpha)[\alpha \leftarrow \mathtt{num}]
\quad = \quad
\mathtt{num} \to \beta \to (\forall\alpha.\alpha) \to \mathtt{num}
\\]

바깥의 \\(\alpha\\) 두 개는 \\(\mathtt{num}\\)으로 바뀌었지만 \\(\forall\alpha.\alpha\\) 안의 \\(\alpha\\)는 그대로입니다. 안쪽의 <a id="g-binder"></a>묶는 자리(binder) \\(\forall\alpha\\)가 바깥의 \\(\alpha\\)를 **가리기** 때문입니다. \\(\forall\alpha.\alpha\\) 안의 \\(\alpha\\)는 바깥 \\(\alpha\\)와 이름만 같을 뿐 전혀 다른 타입 변수입니다. [식별자](./identifiers.md)에서 안쪽 `val x`가 바깥 `x`를 가리던 것과 똑같은 현상입니다.

어느 \\(\alpha\\)가 바뀌는지 표시하면 다음과 같습니다. 곡선 화살표는 변수에서 그 변수를 묶는 자리로 향합니다.

<div style="text-align:center">
<svg viewBox="0 0 480 170" width="100%" style="max-width: 480px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="α → β → (∀α.α) → α에서 바깥의 자유로운 α 두 개만 num으로 바뀌고, ∀α 안의 α는 안쪽 묶는 자리에 묶여 있어 그대로 남는다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="parametric-polymorphism-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="92" y="86" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">→</text>
<text x="124" y="86" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">β</text>
<text x="156" y="86" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">→</text>
<text x="178" y="86" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">(</text>
<text x="203" y="86" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">∀α.</text>
<text x="236" y="86" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">α</text>
<text x="254" y="86" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">)</text>
<text x="280" y="86" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">→</text>
<rect x="49" y="65" width="26" height="28" rx="4" fill="#2a408e"/>
<text x="62" y="86" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic" fill="#fff">α</text>
<rect x="297" y="65" width="26" height="28" rx="4" fill="#2a408e"/>
<text x="310" y="86" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic" fill="#fff">α</text>
<path d="M236,64 Q222,30 203,62" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#parametric-polymorphism-2)"/>
<text x="220" y="36" text-anchor="middle" font-size="13">가려짐: 안쪽 ∀α에 묶임</text>
<polyline points="62,96 62,124" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#parametric-polymorphism-2)"/>
<polyline points="310,96 310,124" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#parametric-polymorphism-2)"/>
<text x="62" y="146" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">num</text>
<text x="310" y="146" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">num</text>
<text x="360" y="91" text-anchor="start" font-family="'Times New Roman', Times, serif" font-size="18">[α ← num]</text>
</svg>
</div>

**포획 회피.** 이번에는 이 치환을 봅시다.

\\[
(\forall\beta.\alpha \to \beta)[\alpha \leftarrow \beta]
\quad = \quad
\forall\gamma.\beta \to \gamma
\\]

타입 인자 \\(\beta\\)는 자유로운 타입 변수입니다. 즉 바깥 어딘가에서 정의된 \\(\beta\\)를 가리킵니다. 이것을 아무 생각 없이 \\(\forall\beta\\) 안에 집어넣으면 이 \\(\beta\\)가 묶는 자리 \\(\forall\beta\\)에 **포획**(capture)되어 버립니다. 이를 피하려고, 먼저 묶인 \\(\beta\\)의 이름을 새로운(fresh) 타입 변수 \\(\gamma\\)로 **바꾼** 뒤 치환합니다. \\(\forall\beta.\alpha \to \beta\\)와 \\(\forall\gamma.\alpha \to \gamma\\)는 묶인 변수의 이름만 다를 뿐 같은 타입이므로, 이름을 바꿔도 의미가 변하지 않습니다.

이름을 바꾸지 않았다면 결과는 \\(\forall\beta.\beta \to \beta\\)가 됩니다. 이는 항등 함수의 타입으로, 원래 뜻한 "무엇을 받든 바깥의 \\(\beta\\)를 돌려주는 타입"과는 전혀 **다른** 타입입니다. 이런 치환을 쓰면 타입 시스템이 안전하지 않게 됩니다.

두 방법의 결과에서 각 변수가 어느 묶는 자리를 가리키는지 비교하면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 620 250" width="100%" style="max-width: 620px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="(∀β.α → β)[α ← β]: 이름을 바꾸지 않으면 넣은 β가 ∀β에 포획되어 ∀β.β → β가 되고, 묶인 변수를 γ로 바꾸면 ∀γ.β → γ가 되어 넣은 β는 바깥의 β를 그대로 가리킨다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="parametric-polymorphism-3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="20" y="72" text-anchor="start" font-weight="bold">이름을 바꾸지 않으면</text>
<text x="20" y="94" text-anchor="start" font-size="14">(틀림)</text>
<text x="270" y="80" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">∀β.</text>
<text x="360" y="80" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">→</text>
<rect x="309" y="59" width="26" height="28" rx="4" fill="#2a408e"/>
<text x="322" y="80" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic" fill="#fff">β</text>
<text x="398" y="80" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">β</text>
<path d="M322,57 Q300,28 274,56" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#parametric-polymorphism-3)"/>
<path d="M398,58 Q340,8 280,56" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#parametric-polymorphism-3)"/>
<text x="440" y="72" text-anchor="start" font-size="14">넣은 β가 ∀β에 포획됨</text>
<text x="440" y="94" text-anchor="start" font-size="14">= 항등 함수의 타입</text>
<text x="20" y="167" text-anchor="start" font-weight="bold">묶인 변수 이름을 바꾸면</text>
<text x="20" y="189" text-anchor="start" font-size="14">(포획 회피)</text>
<text x="270" y="175" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">∀γ.</text>
<text x="360" y="175" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">→</text>
<rect x="309" y="154" width="26" height="28" rx="4" fill="#2a408e"/>
<text x="322" y="175" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic" fill="#fff">β</text>
<text x="398" y="175" text-anchor="middle" font-family="'Times New Roman', Times, serif" font-size="22" font-style="italic">γ</text>
<path d="M398,153 Q340,113 278,151" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#parametric-polymorphism-3)"/>
<polyline points="322,184 322,207" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#parametric-polymorphism-3)"/>
<text x="322" y="227" text-anchor="middle" font-size="13">바깥의 β</text>
<text x="440" y="167" text-anchor="start" font-size="14">넣은 β는 바깥의 β를</text>
<text x="440" y="189" text-anchor="start" font-size="14">그대로 가리킴</text>
</svg>
</div>

> **자주 하는 실수** 치환을 "이름이 같은 것을 모두 바꾸기"로 구현하는 것입니다. 이렇게 하면 가려짐과 포획을 모두 놓칩니다. 치환은 문자열 바꾸기가 아니라, 각 변수가 어느 묶는 자리를 가리키는지를 지키는 연산입니다.

### 치환의 정의

이제 치환을 정확히 정의해 봅시다. 먼저 타입 \\(\tau\\) 안의 <a id="g-free-type-variable"></a>**자유 타입 변수**(free type variable) 집합 \\(\mathtt{free}(\tau)\\)를 정의합니다.

\\[
\begin{array}{lcllcl}
\mathtt{free}(\mathtt{num}) &=& \varnothing &
\qquad \mathtt{free}(\tau_1 \to \tau_2) &=& \mathtt{free}(\tau_1) \cup \mathtt{free}(\tau_2) \\\\
\mathtt{free}(\alpha) &=& \\{ \alpha \\} &
\qquad \mathtt{free}(\forall\alpha.\tau) &=& \mathtt{free}(\tau) \setminus \\{ \alpha \\}
\end{array}
\\]

다형 타입 \\(\forall\alpha.\tau\\)에서는 \\(\alpha\\)가 묶여 있으므로 자유 타입 변수에서 뺍니다. 예를 들어 \\(\mathtt{free}(\forall\beta.\alpha \to \beta) = \\{\alpha\\}\\)입니다.

그리고 <a id="g-capture-avoiding-substitution"></a>포획 회피 치환(capture-avoiding substitution) \\(\tau'[\alpha \leftarrow \tau]\\)를 다음과 같이 정의합니다.

\\[
\begin{array}{lcl}
\mathtt{num}[\alpha \leftarrow \tau] &=& \mathtt{num} \\\\
(\tau_1 \to \tau_2)[\alpha \leftarrow \tau] &=& \tau_1[\alpha \leftarrow \tau] \to \tau_2[\alpha \leftarrow \tau] \\\\
\alpha'[\alpha \leftarrow \tau] &=&
\left\\{
\begin{array}{ll}
\tau & \text{if } \alpha' = \alpha \\\\
\alpha' & \text{otherwise}
\end{array}
\right. \\\\
(\forall\alpha'.\tau')[\alpha \leftarrow \tau] &=&
\left\\{
\begin{array}{ll}
\forall\alpha'.\tau' & \text{if } \alpha' = \alpha \quad \text{(shadowing)} \\\\
\forall\alpha'.(\tau'[\alpha \leftarrow \tau]) & \text{if } \alpha' \neq \alpha \wedge \alpha' \notin \mathtt{free}(\tau) \\\\
\forall\alpha^{\prime\prime}.(\tau'[\alpha' \leftarrow \alpha^{\prime\prime}][\alpha \leftarrow \tau]) & \text{otherwise} \quad \text{(capture-avoiding)}
\end{array}
\right.
\end{array}
\\]

여기서 \\(\alpha^{\prime\prime}\\)는 **새로운** 타입 변수, 즉 \\(\alpha^{\prime\prime} \notin \mathtt{free}(\tau') \cup \mathtt{free}(\tau) \cup \\{\alpha\\}\\)인 타입 변수입니다.

다형 타입의 세 경우를 하나씩 읽어 봅시다.

- 묶는 변수 \\(\alpha'\\)가 바꾸려는 \\(\alpha\\)와 같으면, 안쪽의 \\(\alpha\\)는 모두 가려져 있으므로 아무것도 바꾸지 않습니다(가려짐).
- 다르고, \\(\alpha'\\)가 타입 인자 \\(\tau\\)에 자유롭게 나타나지 않으면 포획될 걱정이 없으므로 그냥 안쪽으로 치환을 밀어 넣습니다.
- 그렇지 않으면, 즉 \\(\tau\\) 안의 자유로운 \\(\alpha'\\)가 포획될 위험이 있으면, 묶는 변수를 새로운 \\(\alpha^{\prime\prime}\\)로 바꾼 다음 치환합니다(포획 회피).

새 변수 \\(\alpha^{\prime\prime}\\)의 조건에도 이유가 있습니다. \\(\mathtt{free}(\tau')\\)에 있는 이름을 쓰면 몸통에 원래 있던 다른 자유 변수와 섞이고, \\(\mathtt{free}(\tau)\\)에 있는 이름을 쓰면 또다시 포획이 일어나며, \\(\alpha\\)를 쓰면 이어지는 치환 \\([\alpha \leftarrow \tau]\\)가 원래 묶여 있던 변수까지 바꿔 버립니다.

> **생각해 보기** \\((\forall\beta.\alpha \to \beta)[\alpha \leftarrow \beta \to \alpha]\\)를 위 정의대로 계산해 보세요. 어느 경우에 해당하고, 새 변수는 어떤 이름을 피해야 할까요?

### 치환의 구현

구현은 정의를 그대로 따라갑니다.

```scala
def subst(bodyTy: Type, name: String, ty: Type): Type = bodyTy match
  case NumT             => NumT
  case ArrowT(pty, rty) => ArrowT(subst(pty, name, ty), subst(rty, name, ty))
  case VarT(x)          => if (name == x) ty else VarT(x)
  case PolyT(x, bodyTy) =>
    if (name == x) PolyT(x, bodyTy)  // shadowing
    else if (!free(ty).contains(x)) PolyT(x, subst(bodyTy, name, ty))
    else                             // capture-avoiding
      val y = fresh(free(bodyTy) ++ free(ty) + name)
      PolyT(y, subst(subst(bodyTy, x, VarT(y)), name, ty))

def free(ty: Type): Set[String] = ty match
  case NumT             => Set()
  case ArrowT(pty, rty) => free(pty) ++ free(rty)
  case VarT(x)          => Set(x)
  case PolyT(x, ty)     => free(ty) - x

def fresh(used: Set[String], k: Int = 0): String =
  if (used.contains(s"T$k")) fresh(used, k + 1) else s"T$k"
```

`fresh`는 `T0`, `T1`, `T2`, ... 중에서 `used`에 없는 첫 이름을 고릅니다. 앞의 두 예제를 실행해 보면 다음과 같습니다. (타입은 `[T]τ` 꼴로 출력한다고 합시다.)

```scala
val (a, b) = (VarT("a"), VarT("b"))
// shadowing
subst(ArrowT(a, ArrowT(b, ArrowT(PolyT("a", a), a))), "a", NumT)
// (Number => (b => ([a]a => Number)))

// capture-avoiding
subst(PolyT("b", ArrowT(a, b)), "a", b)
// [T0](b => T0)
```

두 번째 결과에서 새 변수의 이름이 \\(\gamma\\) 대신 `T0`가 되었을 뿐, 앞에서 손으로 계산한 \\(\forall\gamma.\beta \to \gamma\\)와 같은 타입입니다.

### 함수 적용

함수 적용은 \\(\mathsf{TFAE}\\)의 규칙을 그대로 쓸 수도 있습니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case App(fun, arg) => typeCheck(fun, tenv) match
    case ArrowT(paramTy, retTy) =>
      mustSame(typeCheck(arg, tenv), paramTy)
      retTy
    case t => error(s"not a function type: ${t.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : \tau_1 \to \tau_2$}
\AxiomC{$\Gamma \vdash e_1 : \tau_1$}
\LeftLabel{$\tau\texttt{-App}$}
\BinaryInfC{$\Gamma \vdash e_0(e_1) : \tau_2$}
\end{prooftree}
\\]

하지만 조금 더 나아질 여지가 있습니다. 다음 프로그램을 봅시다.

```ptfae,run
/* PTFAE */
val f = ((x: [T](T => T)) => x[Number](7)) // ([T](T => T)) => Number
val x = forall[U] (x: U) => x              // [U] (U => U)
f(x)                 // type checking failed: [T](T => T) != [U](U => U)
```

`f`는 \\(\forall T.T \to T\\) 타입의 인자를 원하고, `x`의 타입은 \\(\forall U.U \to U\\)입니다. 둘은 묶인 변수 이름만 다를 뿐 똑같이 "항등 함수의 타입"인데, 두 타입을 글자 그대로 비교하면 다르다고 판정해 거부해 버립니다.

### 타입의 동등성

그래서 <a id="g-type-equivalence"></a>타입 동등성(type equivalence) \\(\tau \equiv \tau'\\)을 따로 정의합니다.

\\[
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\mathtt{num} \equiv \mathtt{num}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\tau_1 \equiv \tau_1'$}
\AxiomC{$\tau_2 \equiv \tau_2'$}
\BinaryInfC{$(\tau_1 \to \tau_2) \equiv (\tau_1' \to \tau_2')$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\alpha \equiv \alpha$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\alpha \notin \mathtt{free}(\forall\alpha'.\tau')$}
\AxiomC{$\tau \equiv \tau'[\alpha' \leftarrow \alpha]$}
\BinaryInfC{$\forall\alpha.\tau \equiv \forall\alpha'.\tau'$}
\end{prooftree}
\\]

수 타입, 함수 타입, 타입 변수는 구조대로 비교합니다. 핵심은 마지막 규칙입니다. 두 다형 타입 \\(\forall\alpha.\tau\\)와 \\(\forall\alpha'.\tau'\\)를 비교할 때는 오른쪽의 묶인 변수 \\(\alpha'\\)를 왼쪽 이름 \\(\alpha\\)로 바꾼 \\(\tau'[\alpha' \leftarrow \alpha]\\)와 \\(\tau\\)를 비교합니다. 이름을 맞춘 뒤 몸통을 비교하는 것입니다.

조건 \\(\alpha \notin \mathtt{free}(\forall\alpha'.\tau')\\)는 왜 필요할까요? \\(\forall\beta.\beta \to \beta\\)와 \\(\forall\alpha.\alpha \to \beta\\)를 비교한다고 해 봅시다. 오른쪽의 \\(\beta\\)는 자유로운 타입 변수이므로 두 타입은 다릅니다. 왼쪽은 항등 함수의 타입이고, 오른쪽은 무엇을 받든 바깥의 \\(\beta\\)를 돌려주는 타입입니다. 그런데 조건 없이 \\(\alpha\\)를 \\(\beta\\)로 바꾸면 \\((\alpha \to \beta)[\alpha \leftarrow \beta] = \beta \to \beta\\)가 되어 같다고 잘못 판정합니다. 바꿔 넣은 이름 \\(\beta\\)가 오른쪽에 원래 있던 자유로운 \\(\beta\\)와 섞여 버린 것입니다. 따라서 왼쪽의 묶는 변수 이름이 오른쪽 타입에 자유롭게 나타나지 않을 때만 이름을 맞출 수 있습니다. 이 예에서는 \\(\beta \in \mathtt{free}(\forall\alpha.\alpha \to \beta) = \\{\beta\\}\\)이므로 규칙을 쓸 수 없고, 두 타입은 동등하지 않다고 올바르게 판정합니다.

구현은 다음과 같습니다.

```scala
def isSame(lty: Type, rty: Type): Boolean = (lty, rty) match
  case (NumT, NumT) => true
  case (ArrowT(lpty, lrty), ArrowT(rpty, rrty)) =>
    isSame(lpty, rpty) && isSame(lrty, rrty)
  case (VarT(lname), VarT(rname)) => lname == rname
  case (PolyT(lname, lty), PolyT(rname, rty)) =>
    !free(PolyT(rname, rty)).contains(lname) &&
    isSame(lty, subst(rty, rname, VarT(lname)))
  case _ => false

def mustSame(l: Type, r: Type): Unit =
  if (!isSame(l, r)) error(s"type mismatch: ${l.str} != ${r.str}")
```

```scala
val (t, u) = (VarT("T"), VarT("U"))
isSame(PolyT("T", ArrowT(t, t)), PolyT("U", ArrowT(u, u)))  // true

val (a, b) = (VarT("a"), VarT("b"))
isSame(PolyT("b", ArrowT(b, b)), PolyT("a", ArrowT(a, b)))  // false
```

### 함수 적용 다시 보기

이제 함수 적용 규칙을 동등성으로 고칩니다. 인자의 타입 \\(\tau_3\\)가 매개변수 타입 \\(\tau_1\\)과 글자 그대로 같을 필요 없이, 동등하기만 하면 됩니다. 코드에서는 `mustSame`이 이미 `isSame`을 쓰므로 그대로 두면 됩니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : \tau_1 \to \tau_2$}
\AxiomC{$\Gamma \vdash e_1 : \tau_3$}
\AxiomC{$\tau_1 \equiv \tau_3$}
\LeftLabel{$\tau\texttt{-App}$}
\TrinaryInfC{$\Gamma \vdash e_0(e_1) : \tau_2$}
\end{prooftree}
\\]

이제 앞의 예제는 문제없이 타입 검사를 통과합니다.

```ptfae,run
/* PTFAE */
val f = ((x: [T](T => T)) => x[Number](7)) // ([T](T => T)) => Number
val x = forall[U] (x: U) => x              // [U] (U => U)
f(x)                           // well-typed: [T](T => T) == [U](U => U)
```

## PTFAE의 타입 안전성

[타입 시스템](./type-systems.md)에서 배운 타입 안전성(type soundness)의 정의를 떠올려 봅시다.

> **정의(타입 안전성)** 타입 시스템이 안전하다(sound)는 것은, 타입 검사를 통과한 프로그램이 실행 중에 **절대** 타입 오류를 일으키지 않음을 보장한다는 뜻입니다.

그런데 지금까지 만든 타입 시스템에서는 다음 프로그램이 타입 검사를 통과합니다.

```ptfae,run
/* PTFAE */
val f = forall[U] (x: U) => {
  val y = forall[U] x           // [U](U)
  y[Number => Number]           // Number => Number
}                               // [U](U => (Number => Number))
val g = f[Number](1)            // Number => Number
g(2)                            // Number
```

무슨 일이 벌어지는지 따라가 봅시다. 바깥 `forall[U]` 안에서 `x`의 타입은 바깥 `U`입니다. 그런데 `forall[U] x`의 타입을 구하면 몸통 `x`의 타입 `U`에 다시 `forall[U]`를 씌운 \\(\forall U.U\\)가 됩니다. 바깥 `U`를 가리키던 `x`의 타입이 안쪽 `forall[U]`에 **포획**된 것입니다. 그 결과 타입 검사기는 `y`를 "아무 타입으로나 쓸 수 있는 값"이라고 잘못 믿게 되고, `y[Number => Number]`의 타입은 `Number => Number`가 됩니다. 결국 `g`는 `Number => Number` 타입이라고 판정되지만, 실제로 실행해 보면 `g`의 값은 `f[Number]`에 넘긴 `1`일 뿐입니다. 따라서 `g(2)`는 실행 중에 `1(2)`를 계산하다가 타입 오류를 냅니다. 타입 검사를 통과한 프로그램이 타입 오류를 낸 것이니, 이 타입 시스템은 안전하지 않습니다.

해결책은 간단합니다. 타입 추상화의 범위 안에서 **같은 타입 변수를 다시 정의하는 것을 금지**하면 됩니다.

### 타입 추상화 다시 보기

\\(\tau\texttt{-TypeAbs}\\) 규칙에 \\(\alpha\\)가 아직 정의되지 않았다는 조건 \\(\alpha \notin \text{Dom}(\Gamma)\\)를 더합니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  ...
  case TypeAbs(name, body) =>
    if (tenv.tys.contains(name)) error(s"already defined type: $name")
    PolyT(name, typeCheck(body, tenv.addType(name)))
```

\\[
\begin{prooftree}
\AxiomC{$\alpha \notin \text{Dom}(\Gamma)$}
\AxiomC{$\Gamma[\alpha] \vdash e : \tau$}
\LeftLabel{$\tau\texttt{-TypeAbs}$}
\BinaryInfC{$\Gamma \vdash \forall\alpha.e : \forall\alpha.\tau$}
\end{prooftree}
\\]

이제 앞의 프로그램은 안쪽 `forall[U]`에서 `already defined type: U` 오류로 거부됩니다. 같은 일을 하고 싶다면 안쪽 타입 변수의 이름을 다른 것(예를 들어 `V`)으로 바꾸면 됩니다. 그러면 `forall[V] x`의 타입은 \\(\forall V.U\\)가 되고, `y[Number => Number]`의 타입은 `U`로 바르게 계산됩니다.

> **생각해 보기** 이 문제는 치환에서 본 포획과 무엇이 같고 무엇이 다를까요? 치환에서는 묶는 변수의 이름을 바꾸어 포획을 피했습니다. 여기서는 왜 이름을 바꾸는 대신 아예 금지하는 쪽을 택했을까요? 타입 검사기가 몸통의 타입 `U`를 계산한 뒤에는, 그 `U`가 바깥 `U`인지 안쪽 `U`인지 구별할 방법이 없다는 점을 떠올려 보세요.

## 정리

- 다형성은 하나의 대상을 여러 타입으로 쓰게 하는 것으로, 매개변수 다형성, 서브타입 다형성, 임시 다형성 등이 있습니다.
- 매개변수 다형성은 타입 변수를 도입하고 타입 인자로 구체화합니다. 함수와 데이터 타입에 적용하면 각각 제네릭 함수, 제네릭 데이터 타입이 됩니다.
- \\(\mathsf{PTFAE}\\)는 \\(\mathsf{TFAE}\\)에 타입 추상화 \\(\forall\alpha.e\\), 타입 적용 \\(e[\tau]\\), 타입 변수 \\(\alpha\\), 다형 타입 \\(\forall\alpha.\tau\\)를 더한 언어입니다.
- 인터프리터는 타입 추상화를 타입 추상화 값 \\(\langle \forall\alpha.e, \sigma \rangle\\)로 만들어 몸통의 계산을 미루고, 타입 적용에서 저장된 환경으로 몸통을 계산합니다. 타입 인자는 실행에 쓰이지 않습니다.
- 타입 환경은 정의된 타입 변수 집합도 기억하며, 이를 이용해 타입의 올바른 형태 \\(\Gamma \vdash \tau\\)를 검사합니다.
- 타입 적용의 결과 타입은 \\(\tau'[\alpha \leftarrow \tau]\\)입니다. 이 치환은 자유 타입 변수만 바꾸며(가려짐), 타입 인자의 자유 변수가 포획될 위험이 있으면 묶는 변수를 새 이름으로 바꿉니다(포획 회피).
- 함수 적용은 글자 그대로의 같음 대신 타입의 동등성 \\(\equiv\\)을 써서, 묶인 변수 이름만 다른 다형 타입을 같은 타입으로 봅니다. 다형 타입의 동등성에는 \\(\alpha \notin \mathtt{free}(\forall\alpha'.\tau')\\) 조건이 필요합니다.
- 타입 추상화 안에서 같은 타입 변수를 다시 정의하면 타입 시스템이 안전하지 않으므로, \\(\tau\texttt{-TypeAbs}\\)에 \\(\alpha \notin \text{Dom}(\Gamma)\\) 조건을 더해 금지합니다.

## 연습 문제

1. 다음 치환의 결과를 정의에 따라 구하세요. 새 변수가 필요하면 \\(\gamma\\)를 쓰세요.
   - \\((\forall\alpha.\alpha \to \beta)[\beta \leftarrow \mathtt{num}]\\)
   - \\((\forall\alpha.\alpha \to \beta)[\alpha \leftarrow \mathtt{num}]\\)
   - \\((\forall\alpha.\alpha \to \beta)[\beta \leftarrow \alpha \to \alpha]\\)
2. 다음 두 타입이 동등한지 \\(\equiv\\)의 규칙으로 판정하세요. 첫 번째 쌍에서는 비교하는 도중에 포획 회피가 일어나는 것도 확인해 보세요.
   - \\(\forall\alpha.\forall\beta.\alpha \to \beta\\)와 \\(\forall\beta.\forall\alpha.\beta \to \alpha\\)
   - \\(\forall\alpha.\forall\beta.\alpha \to \beta\\)와 \\(\forall\beta.\forall\alpha.\alpha \to \beta\\)
3. 다음 \\(\mathsf{PTFAE}\\) 식의 타입을 구하거나, 타입 오류가 나는 이유를 설명하세요.
   - `forall[T] (x: T) => (y: T) => x`
   - `(forall[T] (x: T) => x)[Number => Number]`
   - `(x: T) => x`
   - `forall[T] forall[T] (x: T) => x`
4. 이 장의 첫 번째 \\(\mathsf{PTFAE}\\) 예제에서 `z = f[[T](T => T)](f)`의 타입이 \\(\forall T.T \to T\\)가 되는 과정을 \\(\tau\texttt{-TypeApp}\\)과 \\(\tau\texttt{-App}\\)으로 설명하세요.
5. 강의 연습 과제 `ptfae`(Exercise #14)에서 \\(\mathsf{PTFAE}\\)의 `typeCheck`와 `interp`를 구현해 보세요. 이어서 Scala를 본뜬 작은 언어 \\(\mathsf{MiniScala}\\)를 구현하는 프로젝트 `mini-scala`(Project #3)에도 도전해 보세요. 주어진 테스트만으로는 충분하지 않으니 직접 테스트를 더 작성하는 것이 좋습니다.

6. <a id="ex-parametric-polymorphism-6"></a>★★ 다음은 타입 없는 언어 FAE의 식입니다.

   ```fae,run
   /* FAE */
   val twice = f => x => f(f(x));
   val inc = x => x + 1;
   val x = twice(inc)(42);
   val y = twice(twice)(inc);
   twice(x => x)(twice)
   ```

   매개변수 다형성을 써서 같은 일을 하는 \\(\mathsf{PTFAE}\\) 식을 만들려고 합니다. 타입 검사를 통과하도록 빈칸 (A)~(G)를 채우세요.

   ```ptfae
   /* PTFAE */
   val twice = forall[A] (f: ???) => (x: ???) => f(f(x));   // (A), (B)
   val inc = (x: Number) => x + 1;
   val x = twice[???](inc)(42);                             // (C)
   val y = twice[???](twice[???])(inc);                     // (D), (E)
   twice[???]((x: ???) => x)(twice)                         // (F), (G)
   ```

   <details><summary>힌트</summary>

   `twice[τ]`의 타입은 \\((\tau \to \tau) \to \tau \to \tau\\)입니다. 각 줄에서 `twice[τ]`에 넘기는 첫 번째 인자의 타입이 \\(\tau \to \tau\\)가 되도록 \\(\tau\\)를 고르세요. 마지막 줄에서는 다형 타입 자체가 타입 인자가 됩니다.

   </details>

   [해답 →](./answers-2.md#ans-parametric-polymorphism-6)

7. <a id="ex-parametric-polymorphism-7"></a>★★ 처치 인코딩(Church encoding)은 자료 구조와 그 연산을 함수만으로 나타내는 방법입니다. 예를 들어 FAE에서는 두 값을 묶는 쌍과, 첫째와 둘째 값을 꺼내는 연산을 다음처럼 나타낼 수 있습니다.

   ```fae,run
   /* FAE */
   val pair = x => y => f => f(x)(y);
   val fst = p => p(x => y => x);
   val snd = p => p(x => y => y);
   val p = pair(1)(x => x + 2);
   val a = fst(p);
   val b = snd(p);
   b(a)
   ```

   같은 인코딩을 \\(\mathsf{PTFAE}\\)로 옮기려고 합니다. 타입 검사를 통과하도록 빈칸 (A)~(D)를 채우세요. 같은 기호의 빈칸에는 같은 것이 들어갑니다.

   ```ptfae
   /* PTFAE */
   val pair = forall[A] forall[B] (x: A) => (y: B) => ???;          // (A)
   val fst = forall[A] forall[B] (p: ???) => ???((x: A) => (y: B) => x);   // (B), (C)
   val snd = forall[A] forall[B] (p: ???) => ???((x: A) => (y: B) => y);   // (B), (D)
   val p = pair[Number][Number => Number](1)((x: Number) => x + 2);
   val a = fst[Number][Number => Number](p);
   val b = snd[Number][Number => Number](p);
   b(a)
   ```

   <details><summary>힌트</summary>

   쌍은 "두 값을 받아 무언가를 돌려주는 함수 `f`"를 받아 `f(x)(y)`를 돌려줍니다. 그 "무언가"의 타입은 쌍을 만들 때가 아니라 쌍을 **쓸 때** 정해집니다. `fst`는 \\(\alpha\\)를, `snd`는 \\(\beta\\)를 꺼내려고 하니까요.

   </details>

   [해답 →](./answers-2.md#ans-parametric-polymorphism-7)
