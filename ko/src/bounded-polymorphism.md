# 유계 다형성과 변성

[매개변수 다형성](./parametric-polymorphism.md)에서는 타입 변수를 두고 쓸 때 채워 넣는 방식으로, [서브타입 다형성](./subtype-polymorphism.md)에서는 더 많은 정보를 가진 값을 더 적은 정보를 요구하는 자리에 넣는 방식으로 하나의 코드를 여러 타입에 쓸 수 있게 했습니다. 두 방법은 따로 놓고 보면 각자 훌륭하지만, 실제 프로그램에서는 둘이 동시에 필요한 경우가 아주 많습니다. "필드 `x`가 있기만 하면 어떤 레코드든 받아서, 받은 레코드를 **그 타입 그대로** 돌려주는 함수"가 대표적입니다. 이 장에서는 두 다형성을 하나로 묶는 <a id="g-bounded-polymorphism"></a>유계 다형성(bounded polymorphism)을 배웁니다. \\(\mathsf{PTFAE}\\)와 \\(\mathsf{STFAE}\\)를 합치고 타입 변수에 <a id="g-bound"></a>경계(bound)를 붙인 언어 \\(\mathsf{BTFAE}\\)를 정의하고, 인터프리터와 자연 의미, 서브타입 관계와 타입 규칙, 그리고 Scala 타입 검사기를 차례로 만듭니다. 이 언어는 이론에서 System \\(\mathrm{F}\_{<:}\\)라고 부르는 체계의 작은 버전입니다.

장의 후반부에서는 `List[Cat]`과 `List[Animal]` 사이에 어떤 서브타입 관계가 있어야 하는가라는 질문, 즉 <a id="g-variance"></a>변성(variance)을 다룹니다. Java 배열이 왜 실행 중에 `ArrayStoreException`을 던지는지, Scala의 `List[+A]`에 붙은 `+`와 Java의 `? extends`가 무엇을 보장하는지, 그리고 강의 프로젝트 \\(\mathsf{MiniScala}\\)의 "양의 위치" 검사가 왜 필요한지를 같은 원리로 설명합니다.

## 두 다형성을 함께 쓰고 싶을 때

### 서브타입 다형성만으로는

[서브타입 다형성](./subtype-polymorphism.md)에서 만든 \\(\mathsf{STFAE}\\)로 다음 함수를 써 봅시다. `f`는 필드 `x`가 있는 레코드를 받아, 원래 레코드 `orig`와 `x`를 두 배 한 값 `twice`를 묶어 돌려줍니다.

```stfae,run
/* STFAE */
val f = (p: {x: Number}) => {orig = p, twice = p.x + p.x}
val r = f({x = 1, y = 2})
r.orig.y      // type error: no such field: y
```

`f`에 `{x = 1, y = 2}`를 넘기는 것은 아무 문제가 없습니다. \\(\\{x : \mathtt{num}, y : \mathtt{num}\\} <: \\{x : \mathtt{num}\\}\\)이기 때문입니다. 그런데 `f`의 반환 타입은 \\(\\{\mathit{orig} : \\{x : \mathtt{num}\\}, \mathit{twice} : \mathtt{num}\\}\\)이므로, 타입 검사기는 `r.orig`에 필드 `y`가 있다는 사실을 **잊어버립니다**. 실행해 보면 `r.orig`는 분명히 `{x = 1, y = 2}`이고 `r.orig.y`는 `2`인데도, 타입 검사기는 이 프로그램을 거부합니다.

문제는 `f`의 타입 \\(\\{x : \mathtt{num}\\} \to \ldots\\)가 "인자로 받은 레코드와 돌려준 `orig`가 같은 타입"이라는 정보를 표현하지 못한다는 데 있습니다. 서브타입 다형성은 인자를 슈퍼타입으로 **올려 보낼** 수만 있고, 나중에 원래 타입으로 되돌려 받을 방법은 없습니다.

### 매개변수 다형성만으로는

"같은 타입"이라는 정보는 [매개변수 다형성](./parametric-polymorphism.md)이 잘 표현합니다. \\(\mathsf{PTFAE}\\)에 레코드가 있다고 치고 써 봅시다.

```ptfae
/* PTFAE */
val f = forall[T] (p: T) => {orig = p, twice = p.x + p.x}
// type error: `p` of type `T` is not a record
```

이번에는 `f`의 정의부터 거부됩니다. `T`는 **아무** 타입이나 될 수 있으므로, `T` 타입의 값에 필드 `x`가 있다는 보장이 없습니다. `f[Number](42)`처럼 쓰면 `42.x`를 계산하게 될 테니 거부하는 것이 맞습니다.

정리하면, 서브타입 다형성은 "필드 `x`가 있다"는 **요구 조건**은 표현하지만 "같은 타입"은 표현하지 못하고, 매개변수 다형성은 그 반대입니다.

### 유계 다형성

두 장점을 합치는 방법은 간단합니다. 타입 변수 `T`가 아무 타입이나 되는 대신, 어떤 타입의 **서브타입만** 될 수 있도록 제한하는 것입니다.

> **정의(유계 다형성)** 유계 다형성은 타입 변수에 <a id="g-upper-bound"></a>상한 경계(upper bound)를 붙여, 그 타입 변수를 경계의 서브타입으로만 구체화할 수 있게 하는 방식의 다형성입니다. 이렇게 경계가 붙은 \\(\forall\\)를 <a id="g-bounded-quantification"></a>유계 정량화(bounded quantification)라고도 부릅니다.

```btfae
/* BTFAE */
val f = forall[T <: {x: Number}] (p: T) => {orig = p, twice = p.x + p.x}
// f: [T <: {x: Number}](T => {orig: T, twice: Number})
val r = f[{x: Number, y: Number}]({x = 1, y = 2})
r.orig.y      // 2
```

`forall[T <: {x: Number}]`은 "\\(\\{x : \mathtt{num}\\}\\)의 서브타입인 어떤 타입 `T`에 대해서든"이라는 뜻입니다. 몸통 안에서는 `T`가 \\(\\{x : \mathtt{num}\\}\\)의 서브타입이라는 것을 알고 있으므로 `p.x`를 쓸 수 있고, 반환 타입에는 `T`가 그대로 남아 있으므로 `f[{x: Number, y: Number}]`의 결과에서 `orig`의 타입은 \\(\\{x : \mathtt{num}, y : \mathtt{num}\\}\\)이 됩니다. 필드 `y`를 잊어버리지 않는 것이죠.

<div style="text-align:center">
<svg viewBox="0 0 730 200" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="STFAE에서는 {x=1, y=2}를 (p: {x: Number}) =&gt; ... 에 넘기면 결과의 orig 타입이 {x: Number}가 되어 y를 잊어버린다. BTFAE에서는 f[{x: Number, y: Number}]에 넘기면 orig 타입이 {x: Number, y: Number}로 남는다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="bounded-polymorphism-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="10" y="60" font-weight="bold">STFAE</text>
<rect x="75" y="38" width="120" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="135" y="60" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">{x=1, y=2}</text>
<polyline points="195,55 235,55" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#bounded-polymorphism-1)"/>
<rect x="240" y="38" width="215" height="34" rx="4" fill="#2a408e"/>
<text x="347" y="60" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13" fill="#fff">(p: {x: Number}) =&gt; ...</text>
<polyline points="455,55 495,55" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#bounded-polymorphism-1)"/>
<text x="502" y="60" font-family="ui-monospace, Menlo, monospace" font-size="13">orig: {x: Number}</text>
<text x="502" y="84" font-size="13">y를 잊어버림</text>
<text x="10" y="150" font-weight="bold">BTFAE</text>
<rect x="75" y="128" width="120" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="135" y="150" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">{x=1, y=2}</text>
<polyline points="195,145 235,145" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#bounded-polymorphism-1)"/>
<rect x="240" y="128" width="215" height="34" rx="4" fill="#2a408e"/>
<text x="347" y="150" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13" fill="#fff">f[{x: Number, y: Number}]</text>
<polyline points="455,145 495,145" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#bounded-polymorphism-1)"/>
<text x="502" y="150" font-family="ui-monospace, Menlo, monospace" font-size="13">orig: {x: Number, y: Number}</text>
<text x="502" y="174" font-size="13">T가 그대로 남아 y도 남음</text>
</svg>
</div>

유계 다형성은 Cardelli와 Wegner가 1985년 논문에서 객체 지향 언어의 타입을 설명하려고 처음 제안했고, 지금은 거의 모든 객체 지향 언어에 들어 있습니다. Scala에서는 `<:`로 상한 경계를 적습니다.

```scala
// Scala
trait Animal { def name: String }
case class Cat(name: String) extends Animal { def meow: String = s"$name: meow" }

def greet(a: Animal): Animal = { println(s"hi, ${a.name}"); a }
def greetB[T <: Animal](a: T): T = { println(s"hi, ${a.name}"); a }

greet(Cat("Nabi")).meow    // error: value meow is not a member of Animal
greetB(Cat("Nabi")).meow   // "Nabi: meow"
```

`greet`은 서브타입 다형성만 쓰므로 결과가 `Animal`이 되어 `meow`를 부를 수 없고, `greetB`는 `T`가 `Cat`으로 구체화되므로 결과도 `Cat`입니다. Java에서는 `extends`로 경계를 적습니다. 다음은 두 값 중 큰 것을 돌려주는 함수입니다.

```java
// Java
static <T extends Comparable<T>> T max(T a, T b) {
  return a.compareTo(b) >= 0 ? a : b;
}
String s = max("apple", "banana");   // no cast needed
```

경계 덕분에 몸통에서 `a.compareTo(b)`를 부를 수 있고, 결과 타입이 `T`이므로 `String`을 넘기면 `String`을 돌려받습니다. 경계 없이 `Comparable max(Comparable a, Comparable b)`로 썼다면 결과를 `(String)`으로 강제 변환(cast)해야 했을 것입니다. TypeScript의 문법은 우리 예제와 거의 같습니다.

```typescript
// TypeScript
function withTwice<T extends { x: number }>(p: T): { orig: T; twice: number } {
  return { orig: p, twice: p.x + p.x };
}
const r = withTwice({ x: 1, y: 2 });
console.log(r.orig.y);   // 2
```

TypeScript는 \\(\mathsf{STFAE}\\)처럼 레코드(객체) 타입을 구조로 비교하므로, \\(\mathsf{BTFAE}\\)와 특히 닮았습니다.

> **생각해 보기.** Java 예제의 경계 `Comparable<T>` 안에는 경계를 붙이는 타입 변수 `T` 자신이 들어 있습니다. 이런 경계를 F-유계(F-bounded)라고 부릅니다. 이 장에서 만들 \\(\mathsf{BTFAE}\\)에서도 `forall[T <: {cmp: T => Number}]`처럼 쓸 수 있을까요? 뒤에서 정의할 타입의 올바른 형태 규칙을 보고 답해 보세요.

## BTFAE: 유계 다형성을 더한 TFAE

이제 \\(\mathsf{BTFAE}\\)를 정의합시다. \\(\mathsf{BTFAE}\\)는 \\(\mathsf{TFAE}\\)에 다음을 더한 언어입니다.

1. \\(\mathsf{STFAE}\\)에서 가져온 것: 레코드, 필드 접근, 레코드 타입, 최상위 타입 `Top`, `val`의 선택적 타입 표기
2. \\(\mathsf{PTFAE}\\)에서 가져온 것: 타입 추상화, 타입 적용, 타입 변수, 다형 타입
3. 새로운 것: 타입 추상화와 다형 타입의 **경계**

경계를 생략한 `forall[T] e`는 `forall[T <: Top] e`의 줄임말입니다. 모든 타입이 \\(\top\\)의 서브타입이므로, 경계가 \\(\top\\)인 타입 변수는 \\(\mathsf{PTFAE}\\)의 타입 변수와 똑같이 아무 타입으로나 구체화할 수 있습니다. 즉 \\(\mathsf{PTFAE}\\)는 \\(\mathsf{BTFAE}\\)의 일부입니다.

\\(\mathsf{STFAE}\\)에 있던 최하위 타입 `Bot`과 `exit`은 뺍니다. 최하위 타입과 경계가 함께 있으면 \\(\alpha <: \bot\\)처럼 "값이 하나도 없는 타입 변수"가 생기는 등 메타 이론이 눈에 띄게 복잡해지기 때문입니다. 이 장의 주제와는 상관없는 복잡함이므로 덜어 냅니다.

### 구체 문법

```bnf
<expr> ::= <number> | <expr> "+" <expr> | <expr> "*" <expr>
         | "val" <id> [ ":" <type> ]? "=" <expr> ";"? <expr>
         | <id> | "(" <id> ":" <type> ")" "=>" <expr> | <expr> "(" <expr> ")"
         | "{" [<id> "=" <expr>]*{","} "}" | <expr> "." <id>
         | "forall" "[" <id> [ "<:" <type> ]? "]" <expr>
         | <expr> "[" <type> "]"
<type> ::= "Number" | <type> "=>" <type>
         | "{" [<id> ":" <type>]*{","} "}" | "Top"
         | <id>
         | "[" <id> [ "<:" <type> ]? "]" <type>
```

`forall`과 다형 타입의 `<:` 부분만 새롭고, 나머지는 두 언어의 문법을 합친 것입니다. 다형 타입도 \\(\mathsf{PTFAE}\\)처럼 `[T <: {x: Number}](T => T)`라고 씁니다.

### 추상 문법

수식에서는 경계가 붙은 타입 추상화를 \\(\forall\alpha <: \tau.e\\), 다형 타입을 \\(\forall\alpha <: \tau.\tau'\\)으로 씁니다.

\\[
\begin{array}{lrcll}
\text{Expressions} & \mathbb{E} \ni e & \mathtt{::=} & \ldots & \\\\
& & \mid & \\{[x\enspace \mathtt{=}\enspace e]^{\ast}\\} & (\texttt{Record}) \\\\
& & \mid & e.x & (\texttt{Access}) \\\\
& & \mid & \forall\alpha <: \tau.e & (\texttt{TypeAbs}) \\\\
& & \mid & e[\tau] & (\texttt{TypeApp}) \\\\
\text{Types} & \mathbb{T} \ni \tau & \mathtt{::=} & \mathtt{num} \mid \tau \to \tau & (\texttt{NumT}, \texttt{ArrowT}) \\\\
& & \mid & \\{[x:\tau]^{\ast}\\} & (\texttt{RecordT}) \\\\
& & \mid & \top & (\texttt{TopT}) \\\\
& & \mid & \alpha & (\texttt{VarT}) \\\\
& & \mid & \forall\alpha <: \tau.\tau & (\texttt{PolyT})
\end{array}
\\]

```scala
enum Expr:
  case Num(number: BigInt)
  case Add(left: Expr, right: Expr)
  case Mul(left: Expr, right: Expr)
  case Val(name: String, tyOpt: Option[Type], init: Expr, body: Expr)
  case Id(name: String)
  case Fun(param: String, ty: Type, body: Expr)
  case App(fun: Expr, arg: Expr)
  case Record(fields: List[(String, Expr)])
  case Access(record: Expr, field: String)
  case TypeAbs(name: String, bound: Type, body: Expr)
  case TypeApp(expr: Expr, ty: Type)

enum Type:
  case NumT
  case ArrowT(paramTy: Type, retTy: Type)
  case RecordT(fields: Map[String, Type])
  case TopT
  case VarT(name: String)
  case PolyT(name: String, bound: Type, ty: Type)
```

\\(\mathsf{PTFAE}\\)와 비교하면 `TypeAbs`와 `PolyT`에 `bound` 필드가 하나씩 생긴 것이 전부입니다.

## 인터프리터와 자연 의미

값은 \\(\mathsf{STFAE}\\)의 레코드 값과 \\(\mathsf{PTFAE}\\)의 타입 추상화 값을 모두 가집니다.

\\[
\begin{array}{lrcll}
\text{Values} & \mathbb{V} \ni v & \mathtt{::=} & n & (\texttt{NumV}) \\\\
& & \mid & \langle \lambda x.e, \sigma \rangle & (\texttt{CloV}) \\\\
& & \mid & \\{[x\enspace \mathtt{=}\enspace v]^{\ast}\\} & (\texttt{RecordV}) \\\\
& & \mid & \langle \forall\alpha.e, \sigma \rangle & (\texttt{TypeAbsV})
\end{array}
\\]

```scala
enum Value:
  case NumV(number: BigInt)
  case CloV(param: String, body: Expr, env: Env)
  case RecordV(fields: Map[String, Value])
  case TypeAbsV(name: String, body: Expr, env: Env)
```

타입 추상화 값에는 경계가 없다는 점에 주목하세요. \\(\mathsf{PTFAE}\\)에서 타입 인자가 실행에 전혀 쓰이지 않았던 것처럼, 경계도 오직 타입 검사기를 위한 정보입니다. 실행할 때는 타입에 관한 정보를 모두 지워 버리는 셈인데, 이를 <a id="g-type-erasure"></a>타입 소거(type erasure)라고 합니다. 레코드, 필드 접근, `val`, 함수에 관한 규칙은 \\(\mathsf{STFAE}\\)와 같고, 바뀌는 것은 타입 추상화 규칙에서 경계를 버리는 부분뿐입니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case TypeAbs(name, _, body) => TypeAbsV(name, body, env)
  case TypeApp(e, _) => interp(e, env) match
    case TypeAbsV(_, body, fenv) => interp(body, fenv)
    case v => error(s"not a type abstraction: ${v.str}")
```

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{TypeAbs}$}
\UnaryInfC{$\sigma \vdash \forall\alpha <: \tau.e \Rightarrow \langle \forall\alpha.e, \sigma \rangle$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\sigma \vdash e \Rightarrow \langle \forall\alpha.e', \sigma' \rangle$}
\AxiomC{$\sigma' \vdash e' \Rightarrow v$}
\LeftLabel{$\texttt{TypeApp}$}
\BinaryInfC{$\sigma \vdash e[\tau] \Rightarrow v$}
\end{prooftree}
\\]

Java도 실제로 이렇게 동작합니다. Java 컴파일러는 제네릭 타입 정보를 바이트코드에서 지우는데, 이때 타입 변수는 그 경계로 바뀝니다. 앞의 `max`는 바이트코드에서 `Comparable max(Comparable a, Comparable b)`가 되고, 호출하는 쪽에 `(String)` 변환이 자동으로 들어갑니다.

## 타입 검사기와 타입 규칙

### 경계를 기억하는 타입 환경

\\(\mathsf{PTFAE}\\)의 타입 환경은 변수의 타입과 함께 **정의된 타입 변수의 집합**을 기억했습니다. \\(\mathsf{BTFAE}\\)에서는 타입 변수마다 그 **경계**도 알아야 합니다. 몸통에서 `p.x`를 허락할지는 `T`의 경계를 봐야 정할 수 있기 때문입니다. 그래서 타입 변수 집합을 타입 변수에서 경계로 가는 유한 함수로 바꿉니다.

\\[
\begin{array}{lcll}
\text{Type Environments} & \Gamma & \in (\mathbb{X} \xrightarrow{\text{fin}} \mathbb{T}) \times (\mathbb{X}\_{\alpha} \xrightarrow{\text{fin}} \mathbb{T}) & (\texttt{TypeEnv})
\end{array}
\\]

\\(\Gamma\\)에 경계가 \\(\tau\\)인 타입 변수 \\(\alpha\\)를 추가한 환경을 \\(\Gamma[\alpha <: \tau]\\)라고 쓰고, \\(\alpha\\)의 경계를 \\(\Gamma(\alpha)\\)라고 씁니다.

```scala
case class TypeEnv(
  vars: Map[String, Type] = Map(),
  tys: Map[String, Type] = Map(),   // type variable -> its bound
) {
  def addVar(pair: (String, Type)): TypeEnv = TypeEnv(vars + pair, tys)
  def addType(name: String, bound: Type): TypeEnv =
    TypeEnv(vars, tys + (name -> bound))
}
```

### 타입의 올바른 형태

타입의 올바른 형태(well-formedness) \\(\Gamma \vdash \tau\\)는 \\(\mathsf{PTFAE}\\)와 거의 같습니다. 레코드 타입과 \\(\top\\)의 경우가 더해지고, 다형 타입에서는 경계도 검사합니다.

\\[
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\Gamma \vdash \mathtt{num}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\Gamma \vdash \top$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma \vdash \tau$}
\AxiomC{$\Gamma \vdash \tau'$}
\BinaryInfC{$\Gamma \vdash \tau \to \tau'$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma \vdash \tau_1 \quad \ldots \quad \Gamma \vdash \tau_n$}
\UnaryInfC{$\Gamma \vdash \\{x_1 : \tau_1, \ldots, x_n : \tau_n\\}$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\alpha \in \text{Dom}(\Gamma)$}
\UnaryInfC{$\Gamma \vdash \alpha$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma \vdash \tau_1$}
\AxiomC{$\Gamma[\alpha <: \tau_1] \vdash \tau_2$}
\BinaryInfC{$\Gamma \vdash \forall\alpha <: \tau_1.\tau_2$}
\end{prooftree}
\\]

마지막 규칙에서 경계 \\(\tau_1\\)은 \\(\alpha\\)를 추가하기 **전**의 환경 \\(\Gamma\\)에서 검사합니다. 즉 \\(\alpha\\)의 범위는 몸통 \\(\tau_2\\)뿐이고, 경계 안에서는 \\(\alpha\\) 자신을 쓸 수 없습니다. 그래서 앞의 "생각해 보기"에서 본 `forall[T <: {cmp: T => Number}]`는 `unknown type: T` 오류로 거부됩니다. <a id="g-f-bounded-polymorphism"></a>F-유계 다형성(F-bounded polymorphism)은 이 제한을 푼 것입니다.

```scala
def mustValid(ty: Type, tenv: TypeEnv): Type = ty match
  case NumT | TopT => ty
  case ArrowT(pty, rty) => ArrowT(mustValid(pty, tenv), mustValid(rty, tenv))
  case RecordT(fs) => RecordT(fs.map { case (f, t) => (f, mustValid(t, tenv)) })
  case VarT(name) =>
    if (!tenv.tys.contains(name)) error(s"unknown type: $name")
    ty
  case PolyT(name, bound, ty) =>
    val b = mustValid(bound, tenv)
    PolyT(name, b, mustValid(ty, tenv.addType(name, b)))
```

### 서브타입 관계

\\(\mathsf{STFAE}\\)의 서브타입 관계 \\(\tau <: \tau'\\)은 타입만 보고 판정할 수 있었습니다. 하지만 이제 타입 안에 타입 변수가 들어 있으므로, 타입 변수의 경계를 알려 주는 타입 환경이 필요합니다. 그래서 서브타입 관계를 \\(\Gamma \vdash \tau <: \tau'\\)으로 바꿉니다. "\\(\Gamma\\)에서 \\(\tau\\)는 \\(\tau'\\)의 서브타입이다"라고 읽습니다. 이번에는 규칙마다 이름을 붙여 둡시다.

반사성, 추이성, 최상위 타입, 함수 타입 규칙은 \\(\mathsf{STFAE}\\)와 같습니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{S-Refl}$}
\UnaryInfC{$\Gamma \vdash \tau <: \tau$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma \vdash \tau <: \tau'$}
\AxiomC{$\Gamma \vdash \tau' <: \tau^{\prime\prime}$}
\LeftLabel{$\texttt{S-Trans}$}
\BinaryInfC{$\Gamma \vdash \tau <: \tau^{\prime\prime}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{S-Top}$}
\UnaryInfC{$\Gamma \vdash \tau <: \top$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash \tau_1' <: \tau_1$}
\AxiomC{$\Gamma \vdash \tau_2 <: \tau_2'$}
\LeftLabel{$\texttt{S-Arrow}$}
\BinaryInfC{$\Gamma \vdash \tau_1 \to \tau_2 <: \tau_1' \to \tau_2'$}
\end{prooftree}
\\]

레코드 타입은 \\(\mathsf{STFAE}\\)의 "생각해 보기"에서 제안했던 대로, 필드 추가, 필드 타입, 필드 순서의 세 규칙을 하나로 합칩니다. 오른쪽 레코드 타입의 모든 필드가 왼쪽에도 있고, 그 타입이 서브타입이면 됩니다. 왼쪽에는 필드가 더 있어도 되고(\\(n \leq m\\)), 필드 순서는 상관없습니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash \tau_1 <: \tau_1' \quad \ldots \quad \Gamma \vdash \tau_n <: \tau_n'$}
\LeftLabel{$\texttt{S-Record}$}
\UnaryInfC{$\Gamma \vdash \\{x_1 : \tau_1, \ldots, x_n : \tau_n, \ldots, x_m : \tau_m\\} <: \\{x_1 : \tau_1', \ldots, x_n : \tau_n'\\}$}
\end{prooftree}
\\]

새로운 규칙은 두 개입니다. 첫째는 타입 변수에 관한 규칙입니다. 타입 변수 \\(\alpha\\)는 자신의 경계의 서브타입입니다. 경계가 바로 "\\(\alpha\\)가 될 수 있는 타입은 모두 이것의 서브타입"이라는 약속이기 때문입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma(\alpha) = \tau$}
\LeftLabel{$\texttt{S-TVar}$}
\UnaryInfC{$\Gamma \vdash \alpha <: \tau$}
\end{prooftree}
\\]

이 규칙이 타입 변수에 관해 알려 주는 것은 **위쪽** 방향뿐이라는 점이 중요합니다. \\(\Gamma = [T <: \\{x : \mathtt{num}\\}]\\)에서 \\(T <: \\{x : \mathtt{num}\\} <: \\{\\} <: \top\\)은 유도할 수 있지만, 어떤 구체적인 타입도 \\(T\\)의 서브타입이라고 유도할 수는 없습니다(\\(T\\) 자신은 빼고요). \\(T\\)가 나중에 \\(\\{x : \mathtt{num}, y : \mathtt{num}\\}\\)이 될지 \\(\\{x : \mathtt{num}, z : \top\\}\\)이 될지 모르기 때문입니다.

<div style="text-align:center">
<svg viewBox="0 0 560 340" width="100%" style="max-width: 540px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="환경 Γ = [T &lt;: {x: Number}]에서의 서브타입 관계: T는 S-TVar로 {x: Number}의 서브타입이고, {x: Number, y: Number}도 {x: Number}의 서브타입이며, {x: Number}는 {}의, {}는 Top의 서브타입이다. T와 {x: Number, y: Number} 사이에는 어느 방향으로도 관계가 없다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="bounded-polymorphism-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="15" y="30" font-family="ui-monospace, Menlo, monospace" font-size="14">Γ = [T &lt;: {x: Number}]</text>
<rect x="310" y="15" width="60" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="340" y="36" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Top</text>
<rect x="310" y="90" width="60" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="340" y="111" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">{}</text>
<rect x="280" y="165" width="120" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="340" y="186" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">{x: Number}</text>
<rect x="140" y="255" width="60" height="32" rx="4" fill="#2a408e"/>
<text x="170" y="276" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14" fill="#fff">T</text>
<rect x="340" y="255" width="205" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="442" y="276" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">{x: Number, y: Number}</text>
<polyline points="340,90 340,49" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#bounded-polymorphism-2)"/>
<polyline points="340,165 340,124" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#bounded-polymorphism-2)"/>
<polyline points="190,255 300,199" fill="none" stroke="currentColor" stroke-width="2.4" marker-end="url(#bounded-polymorphism-2)"/>
<text x="196" y="218" font-size="13" font-weight="bold">S-TVar</text>
<polyline points="425,255 378,199" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#bounded-polymorphism-2)"/>
<line x1="205" y1="271" x2="335" y2="271" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="270" y="312" text-anchor="middle" font-size="13">T와 {x: Number, y: Number}: 어느 방향으로도 관계 없음</text>
<text x="15" y="332" font-size="13">A → B: A &lt;: B</text>
</svg>
</div>

둘째는 다형 타입 사이의 규칙입니다. 이것은 절을 나누어 자세히 봅시다.

### 다형 타입 사이의 서브타입 관계

\\(\forall\alpha <: \tau_1.\tau_2\\)가 \\(\forall\alpha <: \tau_1'.\tau_2'\\)의 서브타입이 되려면 무엇이 필요할까요? 먼저 경계가 같은 경우를 생각해 봅시다. 두 다형 타입의 값은 모두 \\(\tau_1\\)의 서브타입인 타입 인자를 받습니다. 그러니 그런 타입 인자 \\(\alpha\\) 각각에 대해 \\(\tau_2\\)가 \\(\tau_2'\\)의 서브타입이면 충분합니다. 몸통을 비교할 때 \\(\alpha\\)의 경계가 \\(\tau_1\\)이라는 것을 알고 비교해야 하므로, 환경에 \\(\alpha <: \tau_1\\)을 추가합니다.

\\[
\begin{prooftree}
\AxiomC{$\alpha \notin \text{Dom}(\Gamma)$}
\AxiomC{$\Gamma[\alpha <: \tau_1] \vdash \tau_2 <: \tau_2'$}
\LeftLabel{$\texttt{S-All}$}
\BinaryInfC{$\Gamma \vdash \forall\alpha <: \tau_1.\tau_2 <: \forall\alpha <: \tau_1.\tau_2'$}
\end{prooftree}
\\]

두 다형 타입의 묶인 변수 이름이 다르거나 그 이름이 이미 \\(\text{Dom}(\Gamma)\\)에 있으면, \\(\mathsf{PTFAE}\\)의 타입 동등성에서 그랬듯이 두 이름을 \\(\Gamma\\)에도 두 타입에도 나타나지 않는 새 이름으로 맞춘 뒤 이 규칙을 씁니다. \\(\alpha \notin \text{Dom}(\Gamma)\\) 조건은 \\(\tau\texttt{-TypeAbs}\\)의 같은 조건처럼, 바깥 \\(\alpha\\)의 경계를 덮어쓰지 않기 위한 것입니다(뒤의 타입 안전성 절에서 이 조건이 없으면 생기는 문제를 봅니다). 예를 들어 다음이 성립합니다.

\\[
\varnothing \vdash \forall T <: \\{x : \mathtt{num}\\}.T \to T \enspace <: \enspace \forall U <: \\{x : \mathtt{num}\\}.U \to \\{x : \mathtt{num}\\}
\\]

이름을 맞춘 뒤 몸통을 비교하면 \\([T <: \\{x : \mathtt{num}\\}] \vdash T \to T <: T \to \\{x : \mathtt{num}\\}\\)이고, 반환 타입에서 \\(\texttt{S-TVar}\\)로 \\(T <: \\{x : \mathtt{num}\\}\\)을 얻기 때문입니다. "받은 것을 그대로 돌려주는 함수"는 "받은 것을 \\(\\{x : \mathtt{num}\\}\\)으로 돌려주는 함수"로 쓸 수 있다는 뜻입니다.

그럼 경계가 다르면 어떨까요? 경계를 **공변**으로, 즉 \\(\tau_1 <: \tau_1'\\)일 때 허락하면 큰일 납니다.

```btfae
/* BTFAE */
val h: [T](T => Number) = forall[T <: {x: Number}] (p: T) => p.x
h[Number](1)
```

경계가 공변이라면 \\(\\{x : \mathtt{num}\\} <: \top\\)이므로 첫 줄이 통과합니다. 그러면 `h`는 아무 타입이나 받는 다형 함수로 취급되고, `h[Number](1)`도 통과합니다. 하지만 실행하면 `1.x`를 계산하다가 `not a record: 1` 오류가 납니다. 경계가 작은 다형 함수는 받아들이는 타입 인자가 **적은** 함수인데, 그것을 더 많은 타입 인자를 받는 함수 자리에 넣었기 때문입니다.

거꾸로 경계를 **반변**으로, 즉 \\(\tau_1' <: \tau_1\\)일 때 허락하는 것은 안전합니다. 더 많은 타입 인자를 받는 함수를 더 적은 타입 인자를 받는 자리에 넣는 것이니, 함수 타입에서 매개변수 타입이 반변이었던 것과 같은 이치입니다.

\\[
\begin{prooftree}
\AxiomC{$\alpha \notin \text{Dom}(\Gamma)$}
\AxiomC{$\Gamma \vdash \tau_1' <: \tau_1$}
\AxiomC{$\Gamma[\alpha <: \tau_1'] \vdash \tau_2 <: \tau_2'$}
\LeftLabel{$\texttt{S-All}\_{\text{full}}$}
\TrinaryInfC{$\Gamma \vdash \forall\alpha <: \tau_1.\tau_2 <: \forall\alpha <: \tau_1'.\tau_2'$}
\end{prooftree}
\\]

몸통은 더 작은 경계 \\(\tau_1'\\)로 비교한다는 점에 주의하세요. 오른쪽 타입을 쓰는 쪽은 \\(\tau_1'\\)의 서브타입만 넘길 것이기 때문입니다.

이 규칙을 쓰는 체계를 완전한(full) \\(\mathrm{F}\_{<:}\\)라고 하고, 앞의 \\(\texttt{S-All}\\)처럼 경계가 같을 때만 비교하는 체계를 <a id="g-kernel"></a>커널(kernel) \\(\mathrm{F}\_{<:}\\)라고 합니다. 완전한 규칙이 더 많은 프로그램을 받아 주니 당연히 더 좋아 보입니다. 그런데 놀랍게도, Pierce는 1992년에 완전한 \\(\mathrm{F}\_{<:}\\)의 서브타입 관계가 <a id="g-undecidable"></a>**결정 불가능**(undecidable)하다는 것을 증명했습니다. 두 타입이 주어졌을 때 서브타입 관계인지 항상 유한 시간 안에 답하는 알고리즘이 존재하지 않는다는 뜻입니다. 직관적으로 보면, \\(\texttt{S-All}\_{\text{full}}\\)은 경계를 비교할 때 왼쪽과 오른쪽을 뒤집고, 몸통을 비교할 때는 환경 속 경계를 바꿔 넣습니다. 이 둘이 맞물리면 비교해야 할 문제가 줄어들지 않고 끝없이 다시 생겨나는 타입을 만들 수 있습니다. 그래서 이 장에서는 판정 알고리즘이 항상 끝나는 커널 규칙 \\(\texttt{S-All}\\)을 씁니다.

> **생각해 보기.** 커널 규칙을 쓰면 다음 프로그램은 거부됩니다. 실행하면 아무 문제가 없는데도 말이죠. 왜 거부되는지, 완전한 규칙이라면 통과하는지 확인해 보세요.
>
> ```btfae
> /* BTFAE */
> val h: [T <: {x: Number, y: Number}](T => Number) =
>   forall[T <: {x: Number}] (p: T) => p.x
> h[{x: Number, y: Number}]({x = 1, y = 2})
> ```

### 타입 추상화와 타입 적용

이제 식의 타입 규칙 \\(\Gamma \vdash e : \tau\\)를 봅시다. 수, 덧셈, 변수, 함수, 레코드 등의 규칙은 \\(\mathsf{STFAE}\\), \\(\mathsf{PTFAE}\\)와 같고, 새로운 것은 타입 추상화와 타입 적용입니다.

타입 추상화 \\(\forall\alpha <: \tau_1.e\\)는 경계 \\(\tau_1\\)이 올바른 형태인지 확인한 뒤, 몸통 \\(e\\)를 \\(\alpha <: \tau_1\\)을 추가한 환경에서 검사합니다. \\(\mathsf{PTFAE}\\)에서 찾은 구멍을 막기 위해 \\(\alpha \notin \text{Dom}(\Gamma)\\) 조건도 그대로 둡니다.

\\[
\begin{prooftree}
\AxiomC{$\alpha \notin \text{Dom}(\Gamma)$}
\AxiomC{$\Gamma \vdash \tau_1$}
\AxiomC{$\Gamma[\alpha <: \tau_1] \vdash e : \tau_2$}
\LeftLabel{$\tau\texttt{-TypeAbs}$}
\TrinaryInfC{$\Gamma \vdash \forall\alpha <: \tau_1.e : \forall\alpha <: \tau_1.\tau_2$}
\end{prooftree}
\\]

타입 적용 \\(e[\tau]\\)에서는 \\(\mathsf{PTFAE}\\)의 조건에 하나가 더해집니다. 타입 인자 \\(\tau\\)가 경계의 서브타입이어야 합니다. 이것이 유계 다형성의 핵심 조건입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \forall\alpha <: \tau_1.\tau_2$}
\AxiomC{$\Gamma \vdash \tau$}
\AxiomC{$\Gamma \vdash \tau <: \tau_1$}
\LeftLabel{$\tau\texttt{-TypeApp}$}
\TrinaryInfC{$\Gamma \vdash e[\tau] : \tau_2[\alpha \leftarrow \tau]$}
\end{prooftree}
\\]

### 포섭 규칙으로 쓴 타입 규칙

[서브타입 다형성](./subtype-polymorphism.md)에서 배운 대로, 서브타입 관계를 타입 규칙에 반영하는 가장 간단한 방법은 포섭(subsumption) 규칙을 더하는 것입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \tau$}
\AxiomC{$\Gamma \vdash \tau <: \tau'$}
\LeftLabel{$\tau\texttt{-Sub}$}
\BinaryInfC{$\Gamma \vdash e : \tau'$}
\end{prooftree}
\\]

포섭 규칙이 있으면 필드 접근 규칙은 \\(\mathsf{STFAE}\\)의 것 그대로 충분합니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \\{\ldots, x : \tau, \ldots\\}$}
\LeftLabel{$\tau\texttt{-Access}$}
\UnaryInfC{$\Gamma \vdash e.x : \tau$}
\end{prooftree}
\\]

예를 들어 \\(\Gamma = [T <: \\{x : \mathtt{num}\\}][p : T]\\)에서 \\(p\\)의 타입은 \\(T\\)이지만, \\(\texttt{S-TVar}\\)와 \\(\tau\texttt{-Sub}\\)로 \\(p\\)의 타입을 \\(\\{x : \mathtt{num}\\}\\)으로 올린 뒤 \\(\tau\texttt{-Access}\\)를 쓰면 \\(\Gamma \vdash p.x : \mathtt{num}\\)을 얻습니다.

하지만 \\(\mathsf{STFAE}\\)에서 보았듯이 포섭 규칙은 알고리즘적이지 않습니다. 언제 쓸지, 어떤 슈퍼타입으로 올릴지를 알려 주지 않기 때문입니다. 이제 이것을 알고리즘적 규칙으로 바꿔 봅시다.

### 노출: 타입 변수를 경계로 올리기

포섭 규칙이 꼭 필요한 곳을 살펴보면 두 종류입니다.

1. 어떤 타입이 **필요한 자리**에 다른 타입의 값이 들어가는 곳: 덧셈의 피연산자, 타입 표기가 있는 `val`, 함수 적용의 인자, 그리고 새로 생긴 타입 적용의 타입 인자. 여기서는 \\(\mathsf{STFAE}\\)처럼 그 자리에서 서브타입 관계를 직접 검사하면 됩니다.
2. 식의 타입이 **특정한 모양**이어야 하는 곳: 필드 접근은 레코드 타입을, 함수 적용은 함수 타입을, 타입 적용은 다형 타입을 요구합니다. \\(\mathsf{STFAE}\\)에서는 식의 타입이 그 모양이 아니면 바로 오류였습니다. 하지만 \\(\mathsf{BTFAE}\\)에서는 식의 타입이 타입 변수 \\(T\\)이더라도, 그 경계가 레코드 타입이면 필드에 접근할 수 있어야 합니다.

두 번째 경우를 위해 <a id="g-exposure"></a>노출(exposure)이라는 연산을 정의합니다. 타입이 타입 변수이면 그 경계로 바꾸고, 그 결과가 또 타입 변수이면 다시 그 경계로 바꾸기를 타입 변수가 아닌 타입이 나올 때까지 반복합니다. \\(\Gamma \vdash \tau \Uparrow \tau'\\)은 "\\(\Gamma\\)에서 \\(\tau\\)를 노출하면 \\(\tau'\\)이 된다"는 뜻입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash \Gamma(\alpha) \Uparrow \tau$}
\LeftLabel{$\texttt{X-TVar}$}
\UnaryInfC{$\Gamma \vdash \alpha \Uparrow \tau$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\tau \text{ is not a type variable}$}
\LeftLabel{$\texttt{X-Other}$}
\UnaryInfC{$\Gamma \vdash \tau \Uparrow \tau$}
\end{prooftree}
\\]

```scala
def expose(ty: Type, tenv: TypeEnv): Type = ty match
  case VarT(x) => expose(tenv.tys(x), tenv)
  case _ => ty
```

`tenv.tys(x)`가 실패하지 않는 이유는 올바른 형태 검사 덕분에 식에 나타나는 타입 변수가 모두 정의되어 있기 때문입니다. 반복도 반드시 끝납니다. 경계는 타입 변수를 추가하기 **전**의 환경에서 올바른 형태여야 하므로, 경계를 따라가면 점점 더 먼저 정의된 타입 변수로 가게 되고, 결국 타입 변수가 아닌 타입에 닿습니다. 노출은 \\(\texttt{S-TVar}\\)와 \\(\texttt{S-Trans}\\)를 원하는 모양이 나올 때까지 최소한으로 쓰는 것과 같습니다.

노출을 쓰면 필드 접근, 함수 적용, 타입 적용의 알고리즘적 규칙은 다음과 같습니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \tau_0$}
\AxiomC{$\Gamma \vdash \tau_0 \Uparrow \\{\ldots, x : \tau, \ldots\\}$}
\LeftLabel{$\tau\texttt{-Access}$}
\BinaryInfC{$\Gamma \vdash e.x : \tau$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : \tau_0$}
\AxiomC{$\Gamma \vdash \tau_0 \Uparrow \tau_1 \to \tau_2$}
\AxiomC{$\Gamma \vdash e_1 : \tau_3$}
\AxiomC{$\Gamma \vdash \tau_3 <: \tau_1$}
\LeftLabel{$\tau\texttt{-App}$}
\QuaternaryInfC{$\Gamma \vdash e_0(e_1) : \tau_2$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \tau_0$}
\AxiomC{$\Gamma \vdash \tau_0 \Uparrow \forall\alpha <: \tau_1.\tau_2$}
\AxiomC{$\Gamma \vdash \tau$}
\AxiomC{$\Gamma \vdash \tau <: \tau_1$}
\LeftLabel{$\tau\texttt{-TypeApp}$}
\QuaternaryInfC{$\Gamma \vdash e[\tau] : \tau_2[\alpha \leftarrow \tau]$}
\end{prooftree}
\\]

덧셈과 타입 표기가 있는 `val`은 \\(\mathsf{STFAE}\\)의 알고리즘적 규칙과 같습니다. 예를 들어 `forall[T <: Number] (x: T) => x + 1`에서 `x + 1`은 \\([T <: \mathtt{num}] \vdash T <: \mathtt{num}\\)이므로 통과합니다. 덧셈은 피연산자의 모양을 보는 것이 아니라 서브타입 관계만 검사하므로 노출이 필요 없습니다.

이렇게 만든 알고리즘적 타입 규칙은 포섭 규칙을 쓴 원래 규칙과 같은 프로그램을 받아 줍니다. 게다가 알고리즘적 규칙으로 구한 타입은 포섭 규칙으로 줄 수 있는 타입 중 **가장 작은** 타입입니다. 이것을 <a id="g-minimal-typing"></a>최소 타입(minimal typing) 성질이라고 합니다. 커널 \\(\mathrm{F}\_{<:}\\)에서 이 성질이 성립한다는 것은 TAPL 28장에 증명되어 있습니다.

### 알고리즘적 서브타입 판정

타입 검사기에 필요한 서브타입 판정 함수도 알고리즘적이어야 합니다. 앞의 서브타입 규칙 중 \\(\texttt{S-Refl}\\)과 \\(\texttt{S-Trans}\\)는 아무 타입에나 쓸 수 있으므로 그대로 구현할 수 없습니다. \\(\texttt{S-Trans}\\)의 가운데 타입 \\(\tau'\\)은 결론에 나타나지도 않습니다.

다행히 \\(\texttt{S-Record}\\)를 하나로 합친 덕분에, \\(\texttt{S-Trans}\\)가 정말로 필요한 곳은 타입 변수에서 출발하는 경우뿐입니다. \\(\alpha <: \tau\\)를 보이려면 \\(\alpha\\)의 경계에서 \\(\tau\\)까지 가면 되기 때문입니다. 그래서 \\(\texttt{S-TVar}\\)와 \\(\texttt{S-Trans}\\)를 하나로 합친 규칙을 씁니다. \\(\texttt{S-Refl}\\)은 수 타입과 타입 변수에 대해서만 남기면 충분합니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{SA-Top}$}
\UnaryInfC{$\Gamma \vdash \tau <: \top$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{SA-Num}$}
\UnaryInfC{$\Gamma \vdash \mathtt{num} <: \mathtt{num}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{SA-Refl-TVar}$}
\UnaryInfC{$\Gamma \vdash \alpha <: \alpha$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash \Gamma(\alpha) <: \tau$}
\LeftLabel{$\texttt{SA-Trans-TVar}$}
\UnaryInfC{$\Gamma \vdash \alpha <: \tau$}
\end{prooftree}
\\]

함수 타입, 레코드 타입, 다형 타입은 앞의 \\(\texttt{S-Arrow}\\), \\(\texttt{S-Record}\\), \\(\texttt{S-All}\\)을 그대로 씁니다(이름만 \\(\texttt{SA-}\\)로 바꿔 부릅시다). 이 규칙들에서는 어느 규칙을 쓸지가 두 타입의 모양만으로 정해지고, 전제에 나오는 타입은 모두 결론의 타입에서 얻을 수 있습니다. 그래서 그대로 재귀 함수로 옮길 수 있습니다.

```scala
def isSubType(lty: Type, rty: Type, tenv: TypeEnv): Boolean = (lty, rty) match
  case (_, TopT) => true
  case (NumT, NumT) => true
  case (VarT(x), VarT(y)) if x == y => true
  case (VarT(x), _) => isSubType(tenv.tys(x), rty, tenv)
  case (ArrowT(lp, lr), ArrowT(rp, rr)) =>
    isSubType(rp, lp, tenv) && isSubType(lr, rr, tenv)
  case (RecordT(lfs), RecordT(rfs)) =>
    rfs.forall { case (f, rt) =>
      lfs.get(f).exists(lt => isSubType(lt, rt, tenv))
    }
  case (PolyT(lx, lb, lt), PolyT(rx, rb, rt)) =>
    isSame(lb, rb, tenv) && {
      val x = fresh(tenv.tys.keySet ++ names(lty) ++ names(rty))
      isSubType(subst(lt, lx, VarT(x)), subst(rt, rx, VarT(x)),
                tenv.addType(x, lb))
    }
  case _ => false

def isSame(lty: Type, rty: Type, tenv: TypeEnv): Boolean =
  isSubType(lty, rty, tenv) && isSubType(rty, lty, tenv)

def mustSubType(lty: Type, rty: Type, tenv: TypeEnv): Unit =
  if (!isSubType(lty, rty, tenv))
    error(s"type mismatch: ${lty.str} </: ${rty.str}")
```

다형 타입의 경우를 자세히 봅시다. 두 경계가 같은지는 양쪽 방향의 서브타입 검사로 확인합니다(이 언어에서는 묶인 변수 이름만 다른 경우와 같습니다). 그다음 두 묶인 변수를 환경에도, 두 타입 안에도 없는 새 이름 `x`로 바꾸고, `x`의 경계를 환경에 추가해 몸통을 비교합니다. 새 이름을 쓰는 것이 중요합니다. 같은 이름의 타입 변수가 이미 환경에 있다면, 덮어쓰는 순간 그 변수를 경계로 쓰던 다른 타입 변수의 의미가 바뀌어 버리기 때문입니다. \\(\mathsf{PTFAE}\\)에서 본 포획과 같은 문제입니다.

`case (VarT(x), _)`가 \\(\texttt{SA-Trans-TVar}\\)입니다. 이 경우보다 `case (_, TopT)`와 `case (VarT(x), VarT(y)) if x == y`가 먼저 검사되므로, \\(\alpha <: \top\\)과 \\(\alpha <: \alpha\\)는 경계를 따라가지 않고 바로 판정됩니다.

이 함수는 항상 끝납니다. 재귀 호출마다 비교하는 타입이 작아지거나, 타입 변수가 그보다 먼저 정의된 경계로 바뀌기 때문입니다. 다형 타입의 경우에도 경계를 바꾸지 않고 그대로 환경에 넣으므로 이 논리가 유지됩니다. 완전한 규칙 \\(\texttt{S-All}\_{\text{full}}\\)을 구현하면 바로 이 부분이 무너집니다.

### 경계까지 고려한 치환

타입 적용의 결과 타입 \\(\tau_2[\alpha \leftarrow \tau]\\)를 구하는 치환도 경계를 다루도록 고칩니다. 다형 타입 \\(\forall\alpha' <: \tau_1.\tau_2\\)에서 경계 \\(\tau_1\\)은 \\(\alpha'\\)의 범위 **밖**에 있습니다. 그래서 자유 타입 변수와 치환은 다음과 같습니다.

\\[
\begin{array}{lcl}
\mathtt{free}(\forall\alpha' <: \tau_1.\tau_2) &=& \mathtt{free}(\tau_1) \cup (\mathtt{free}(\tau_2) \setminus \\{\alpha'\\}) \\\\
(\forall\alpha' <: \tau_1.\tau_2)[\alpha \leftarrow \tau] &=&
\left\\{
\begin{array}{ll}
\forall\alpha' <: \tau_1[\alpha \leftarrow \tau].\tau_2 & \text{if } \alpha' = \alpha \\\\
\forall\alpha' <: \tau_1[\alpha \leftarrow \tau].(\tau_2[\alpha \leftarrow \tau]) & \text{if } \alpha' \neq \alpha \wedge \alpha' \notin \mathtt{free}(\tau) \\\\
\forall\alpha^{\prime\prime} <: \tau_1[\alpha \leftarrow \tau].(\tau_2[\alpha' \leftarrow \alpha^{\prime\prime}][\alpha \leftarrow \tau]) & \text{otherwise}
\end{array}
\right.
\end{array}
\\]

가려짐이 일어나는 첫 번째 경우에도 경계에서는 치환을 한다는 점이 \\(\mathsf{PTFAE}\\)와 다릅니다. 레코드 타입과 \\(\top\\)의 경우는 당연하므로 생략합니다.

```scala
def subst(bodyTy: Type, name: String, ty: Type): Type = bodyTy match
  case NumT | TopT => bodyTy
  case ArrowT(pty, rty) => ArrowT(subst(pty, name, ty), subst(rty, name, ty))
  case RecordT(fs) => RecordT(fs.map { case (f, t) => (f, subst(t, name, ty)) })
  case VarT(x) => if (name == x) ty else bodyTy
  case PolyT(x, b, t) =>
    val b1 = subst(b, name, ty)                  // the bound is outside the scope of x
    if (name == x) PolyT(x, b1, t)               // shadowing
    else if (!free(ty).contains(x)) PolyT(x, b1, subst(t, name, ty))
    else                                         // capture-avoiding
      val y = fresh(names(t) ++ free(ty) + name)
      PolyT(y, b1, subst(subst(t, x, VarT(y)), name, ty))
```

`free`는 위의 정의를, `names`는 타입에 나타나는 모든 타입 변수 이름(자유롭든 묶여 있든)을, `fresh`는 \\(\mathsf{PTFAE}\\)처럼 `T0`, `T1`, ... 중 쓰이지 않은 첫 이름을 돌려줍니다. 예를 들어 \\((\forall\beta <: \alpha.\alpha \to \beta)[\alpha \leftarrow \beta]\\)를 계산하면 `[T0 <: b](b => T0)`가 나옵니다. 경계의 \\(\alpha\\)도 \\(\beta\\)로 바뀌었고, 몸통의 묶인 \\(\beta\\)는 포획을 피해 `T0`로 이름이 바뀌었습니다.

### 타입 검사기

이제 모든 조각을 모아 타입 검사기를 완성합니다. 규칙과 한 줄씩 대응한다는 것을 확인해 보세요.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): Type = expr match
  case Num(_) => NumT
  case Add(l, r) =>
    mustSubType(typeCheck(l, tenv), NumT, tenv)
    mustSubType(typeCheck(r, tenv), NumT, tenv)
    NumT
  case Mul(l, r) =>
    mustSubType(typeCheck(l, tenv), NumT, tenv)
    mustSubType(typeCheck(r, tenv), NumT, tenv)
    NumT
  case Val(name, tyOpt, init, body) =>
    val ty = typeCheck(init, tenv)
    tyOpt.foreach(givenTy => mustSubType(ty, mustValid(givenTy, tenv), tenv))
    typeCheck(body, tenv.addVar(name -> tyOpt.getOrElse(ty)))
  case Id(x) => tenv.vars.getOrElse(x, error(s"free identifier: $x"))
  case Fun(param, paramTy, body) =>
    mustValid(paramTy, tenv)
    ArrowT(paramTy, typeCheck(body, tenv.addVar(param -> paramTy)))
  case App(fun, arg) => expose(typeCheck(fun, tenv), tenv) match
    case ArrowT(paramTy, retTy) =>
      mustSubType(typeCheck(arg, tenv), paramTy, tenv)
      retTy
    case ty => error(s"not a function type: ${ty.str}")
  case Record(fields) =>
    RecordT(fields.map { case (f, e) => (f, typeCheck(e, tenv)) }.toMap)
  case Access(record, f) => expose(typeCheck(record, tenv), tenv) match
    case RecordT(fs) => fs.getOrElse(f, error(s"no such field: $f"))
    case ty => error(s"not a record type: ${ty.str}")
  case TypeAbs(name, bound, body) =>
    if (tenv.tys.contains(name)) error(s"already defined type: $name")
    mustValid(bound, tenv)
    PolyT(name, bound, typeCheck(body, tenv.addType(name, bound)))
  case TypeApp(expr, ty) => expose(typeCheck(expr, tenv), tenv) match
    case PolyT(name, bound, bodyTy) =>
      mustValid(ty, tenv)
      mustSubType(ty, bound, tenv)
      subst(bodyTy, name, ty)
    case t => error(s"not a polymorphic type: ${t.str}")
```

\\(\mathsf{STFAE}\\)의 검사기와 비교하면 `App`, `Access`, `TypeApp`에서 `expose`를 먼저 부르는 것, 그리고 모든 서브타입 검사에 `tenv`를 넘기는 것이 달라졌습니다. \\(\mathsf{PTFAE}\\)의 검사기와 비교하면 `TypeApp`에 `mustSubType(ty, bound, tenv)` 한 줄이 늘었습니다.

## 예제

### 유도 트리

경계가 있는 타입 변수의 필드에 접근하는 가장 작은 예를 봅시다.

```btfae
/* BTFAE */
val getX = forall[T <: {x: Number}] (p: T) => p.x
getX[{x: Number, y: Number}]({x = 1, y = 2})    // 1
```

먼저 `getX`의 타입을 구합니다. \\(\Gamma_0 = [T <: \\{x : \mathtt{num}\\}]\\), \\(\Gamma_1 = \Gamma_0[p : T]\\)라고 합시다. 몸통 `p.x`의 유도 트리 \\(\mathcal{D}\_1\\)은 다음과 같습니다. 노출로 \\(T\\)를 경계 \\(\\{x : \mathtt{num}\\}\\)으로 올리는 것이 핵심입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma_1(p) = T$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma_1 \vdash p : T$}
\AxiomC{$\Gamma_1 \vdash \\{x : \mathtt{num}\\} \Uparrow \\{x : \mathtt{num}\\}$}
\LeftLabel{$\texttt{X-TVar}$}
\UnaryInfC{$\Gamma_1 \vdash T \Uparrow \\{x : \mathtt{num}\\}$}
\LeftLabel{$\tau\texttt{-Access}$}
\BinaryInfC{$\Gamma_1 \vdash p.x : \mathtt{num}$}
\end{prooftree}
\\]

이것을 \\(\tau\texttt{-Fun}\\)과 \\(\tau\texttt{-TypeAbs}\\)로 감쌉니다.

\\[
\begin{prooftree}
\AxiomC{$T \notin \text{Dom}(\varnothing)$}
\AxiomC{$\varnothing \vdash \\{x : \mathtt{num}\\}$}
\AxiomC{$\Gamma_0 \vdash T$}
\AxiomC{$\mathcal{D}\_1$}
\LeftLabel{$\tau\texttt{-Fun}$}
\BinaryInfC{$\Gamma_0 \vdash \lambda p\mathtt{:}T.p.x : T \to \mathtt{num}$}
\LeftLabel{$\tau\texttt{-TypeAbs}$}
\TrinaryInfC{$\varnothing \vdash \forall T <: \\{x : \mathtt{num}\\}.\lambda p\mathtt{:}T.p.x : \forall T <: \\{x : \mathtt{num}\\}.T \to \mathtt{num}$}
\end{prooftree}
\\]

다음으로 둘째 줄입니다. \\(\rho = \\{x : \mathtt{num}, y : \mathtt{num}\\}\\), \\(\Gamma_2 = [\mathit{getX} : \forall T <: \\{x : \mathtt{num}\\}.T \to \mathtt{num}]\\)이라고 합시다. 타입 적용에서 타입 인자 \\(\rho\\)가 경계의 서브타입인지 검사하고, 몸통 \\(T \to \mathtt{num}\\)에서 \\(T\\)를 \\(\rho\\)로 치환합니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma_2 \vdash \mathit{getX} : \forall T <: \\{x : \mathtt{num}\\}.T \to \mathtt{num}$}
\AxiomC{$\Gamma_2 \vdash \rho$}
\AxiomC{$\Gamma_2 \vdash \rho <: \\{x : \mathtt{num}\\}$}
\LeftLabel{$\tau\texttt{-TypeApp}$}
\TrinaryInfC{$\Gamma_2 \vdash \mathit{getX}[\rho] : \rho \to \mathtt{num}$}
\end{prooftree}
\\]

(노출 \\(\Gamma_2 \vdash \forall T <: \ldots \Uparrow \forall T <: \ldots\\)은 \\(\texttt{X-Other}\\)로 바로 얻으므로 생략했습니다.) 마지막으로 \\(\tau\texttt{-App}\\)에서 인자 `{x = 1, y = 2}`의 타입 \\(\rho\\)가 매개변수 타입 \\(\rho\\)의 서브타입이므로 전체 타입은 \\(\mathtt{num}\\)입니다. 실행하면 타입 적용은 경계도 타입 인자도 무시하고 몸통의 클로저를 꺼내므로, 결과는 `1`입니다.

### 타입 변수의 사슬

경계 안에 다른 타입 변수가 들어 있으면 노출이 여러 번 일어납니다.

```btfae
/* BTFAE */
val f = forall[A <: {x: Number}] forall[B <: A] (b: B) => b.x
f[{x: Number, y: Number}][{x: Number, y: Number, z: Number}]({x = 7, y = 8, z = 9})
// 7
```

`b.x`에서 `b`의 타입 `B`를 노출하면 `B`의 경계 `A`, 다시 `A`의 경계 \\(\\{x : \mathtt{num}\\}\\)을 거쳐 레코드 타입에 닿습니다. 둘째 줄에서는 첫 번째 타입 적용이 `B`의 경계를 \\(\\{x : \mathtt{num}, y : \mathtt{num}\\}\\)으로 치환해 주므로, 두 번째 타입 인자 \\(\\{x : \mathtt{num}, y : \mathtt{num}, z : \mathtt{num}\\}\\)이 그 서브타입인지 검사하게 됩니다.

### 다형 함수를 인자로 넘기기

다형 함수도 값이므로 다른 다형 타입 자리에 넣을 수 있고, 이때 \\(\texttt{S-All}\\)이 쓰입니다.

```btfae
/* BTFAE */
val getP: [T <: {x: Number}](T => {x: Number}) =
  forall[T <: {x: Number}] (p: T) => p
getP[{x: Number, z: Number}]({x = 3, z = 4}).x    // 3
```

오른쪽의 타입은 \\(\forall T <: \\{x : \mathtt{num}\\}.T \to T\\)이고, 앞에서 본 대로 \\(\texttt{S-All}\\)과 \\(\texttt{S-TVar}\\)로 표시된 타입의 서브타입임을 보일 수 있습니다.

### 거부되는 프로그램

이제 경계를 어기는 프로그램을 봅시다.

```btfae
/* BTFAE */
val f = forall[T <: {x: Number}] (p: T) => {orig = p, twice = p.x + p.x}
f[{y: Number}]({y = 2})
// type error: type mismatch: {y: Number} </: {x: Number}
```

\\(\tau\texttt{-TypeApp}\\)의 전제 \\(\varnothing \vdash \\{y : \mathtt{num}\\} <: \\{x : \mathtt{num}\\}\\)이 성립하지 않으므로 거부됩니다. 이 검사가 없었다면 어떻게 될까요? 타입 소거 덕분에 인터프리터는 타입 인자를 쳐다보지도 않으므로, 몸통의 `p.x`를 `{y = 2}`에 대해 계산하다가 `no such field: x` 오류를 냅니다. 바로 타입 시스템이 막아야 할 실행 중 타입 오류입니다.

몸통 안에서 `T`를 구체적인 타입처럼 쓰는 것도 거부됩니다.

```btfae
/* BTFAE */
forall[T <: {x: Number}] (p: T) => { val q: T = {x = 1}; q }
// type error: type mismatch: {x: Number} </: T
```

`{x = 1}`의 타입 \\(\\{x : \mathtt{num}\\}\\)은 `T`의 **경계**일 뿐, `T`의 서브타입이 아닙니다. 앞의 그림에서 본 것처럼, 타입 변수에 관한 서브타입 관계는 위쪽 방향뿐입니다. 이 함수를 `T = {x: Number, y: Number}`로 구체화했는데 `q`가 필드 `y`가 없는 `{x = 1}`이라면 곤란하겠죠.

> **자주 하는 실수.** 경계를 "타입 변수의 기본값"처럼 생각하는 것입니다. `T <: {x: Number}`는 `T`가 \\(\\{x : \mathtt{num}\\}\\)**이라는** 뜻이 아니라, `T`가 무엇이든 그 값으로 \\(\\{x : \mathtt{num}\\}\\)이 할 수 있는 일은 다 할 수 있다는 뜻입니다. 그래서 `T` 타입의 값은 경계 자리에 넣을 수 있지만, 경계 타입의 값을 `T` 자리에 넣을 수는 없습니다.

### 구현으로 확인하기

이 장의 \\(\mathsf{BTFAE}\\) 예제들을 완전한 구현(파서, 타입 검사기, 인터프리터)으로 실행해 본 결과는 다음과 같습니다. 타입 검사에 실패한 프로그램은 타입을 지우고 억지로 실행해 보면 어떤 오류가 나는지 함께 적었습니다.

```text
f[{x: Number, y: Number}]({x = 1, y = 2}).orig.y   type: Number        value: 2
f[{y: Number}]({y = 2})                            type error (bound)  run: no such field: x
(forall[T <: {x: Number}] (p: T) => p.x)[Top]({})  type error (bound)  run: no such field: x
val h: [T](T => Number) = ...; h[Number](1)        type error (S-All)  run: not a record: 1
forall[T] (p: T) => p.x                            type error: not a record type: Top
forall[T <: {cmp: T => Number}] (p: T) => p        type error: unknown type: T
forall[F <: Number => Number] (f: F) => f(1)       type: [F <: Number => Number](F => Number)
```

경계를 생략한 `forall[T] (p: T) => p.x`의 오류 메시지가 `not a record type: Top`인 것은, `T`를 노출하면 경계 `Top`이 나오기 때문입니다. 마지막 줄은 함수 적용에서도 노출이 쓰인다는 것을 보여 줍니다.

## 타입 안전성

\\(\mathsf{BTFAE}\\)의 타입 안전성(type soundness)은 다음과 같습니다.

> **정리(타입 안전성)** \\(\varnothing \vdash e : \tau\\)이면, \\(e\\)를 계산할 때 실행 중 타입 오류(`not a function`, `not a record`, `no such field`, `not a type abstraction`, `invalid operation`)가 일어나지 않습니다. 계산이 값 \\(v\\)를 내면, \\(v\\)는 \\(\tau\\)에 맞는 모양입니다(예: \\(\tau\\)가 레코드 타입이면 \\(v\\)는 적어도 그 필드들을 가진 레코드 값입니다).

증명은 \\(\mathsf{STFAE}\\)나 \\(\mathsf{PTFAE}\\)와 같은 틀을 따르지만, 유계 다형성 때문에 두 가지 보조 정리가 새로 필요합니다. 둘 다 "경계에 관한 약속이 지켜진다"는 내용입니다.

1. **타입 치환 보조 정리.** \\(\Gamma[\alpha <: \tau_1] \vdash e : \tau_2\\)이고 \\(\Gamma \vdash \sigma <: \tau_1\\)이면, \\(e\\) 안의 \\(\alpha\\)를 \\(\sigma\\)로 바꾼 식도 \\(\tau_2[\alpha \leftarrow \sigma]\\) 타입을 가집니다. 몸통을 검사할 때 \\(\alpha\\) 타입의 값은 \\(\texttt{S-TVar}\\)로 경계 \\(\tau_1\\)처럼 쓰였을 수 있습니다. \\(\sigma <: \tau_1\\)이어야 \\(\sigma\\) 타입의 값도 그렇게 쓸 수 있습니다. 이 조건을 보장하는 것이 \\(\tau\texttt{-TypeApp}\\)의 \\(\Gamma \vdash \tau <: \tau_1\\) 전제입니다.
2. <a id="g-narrowing-lemma"></a>**좁히기 보조 정리**(narrowing lemma). \\(\Gamma[\alpha <: \tau_1]\\)에서 성립하는 판단은 경계를 더 작은 \\(\tau_1' <: \tau_1\\)로 바꾼 \\(\Gamma[\alpha <: \tau_1']\\)에서도 성립합니다. 경계가 작아지면 \\(\alpha\\)에 관해 아는 것이 많아질 뿐이기 때문입니다. 이 성질이 완전한 규칙 \\(\texttt{S-All}\_{\text{full}}\\)에서 경계를 반변으로 비교해도 안전한 이유입니다. 커널 규칙은 경계를 바꾸지 않으므로 당연히 안전합니다.

또한 노출이 올바르다는 것, 즉 \\(\Gamma \vdash \tau \Uparrow \tau'\\)이면 \\(\Gamma \vdash \tau <: \tau'\\)라는 것도 필요합니다. 노출은 \\(\texttt{S-TVar}\\)와 \\(\texttt{S-Trans}\\)를 이어 붙인 것이므로 이것은 바로 나옵니다. 이 덕분에 `p.x`에서 `p`의 실제 값은 \\(T\\)를 구체화한 어떤 타입의 값이고, 그 타입은 \\(\\{x : \mathtt{num}\\}\\)의 서브타입이므로 필드 `x`가 반드시 있습니다.

규칙을 조금만 바꿔도 안전성이 깨지는 곳들을 정리해 봅시다.

- **경계 검사를 빼면.** \\(\tau\texttt{-TypeApp}\\)에서 \\(\Gamma \vdash \tau <: \tau_1\\)을 빼면, 앞의 `f[{y: Number}]({y = 2})`가 통과하고 `no such field: x`가 납니다.
- **경계를 공변으로 비교하면.** \\(\texttt{S-All}\\)에서 \\(\tau_1 <: \tau_1'\\)일 때 허락하면, `h[Number](1)`이 통과하고 `not a record: 1`이 납니다.
- **타입 변수를 다시 정의하게 두면.** \\(\alpha \notin \text{Dom}(\Gamma)\\) 조건을 빼면 \\(\mathsf{PTFAE}\\)에서 본 포획 문제가 그대로 돌아옵니다. 경계가 있으면 더 위험합니다. 바깥 \\(\alpha\\)의 경계로 판단한 사실이 안쪽 \\(\alpha\\)에 잘못 적용될 수 있기 때문입니다.
- **서브타입 판정에서 이름을 덮어쓰면.** 다형 타입을 비교할 때 새 이름을 쓰지 않고 환경의 같은 이름을 덮어쓰면, 다른 타입 변수의 경계가 엉뚱한 변수를 가리키게 됩니다. 예를 들어 \\(\Gamma = [A <: \\{x : \mathtt{num}\\}][B <: A]\\)에서 \\(\texttt{S-All}\\)의 \\(\alpha \notin \text{Dom}(\Gamma)\\) 조건을 빼면, \\(\Gamma[A <: \top] \vdash B <: A\\)이므로 \\(\Gamma \vdash \forall A <: \top.B <: \forall A <: \top.A\\)가 됩니다. 그러면 `forall[A <: {x: Number}] forall[B <: A] (b: B) => (forall[C] b)[Number] + 1`이 통과하고, `[{x: Number}][{x: Number}]({x = 1})`을 붙여 실행하면 `invalid operation`이 납니다. 알고리즘적 판정은 늘 새 이름을 쓰므로 이 프로그램을 거부합니다.

## 변성

지금까지는 타입 변수에 경계를 붙여 "타입 인자가 될 수 있는 타입"을 제한했습니다. 이번에는 반대 방향의 질문을 해 봅시다. 타입 인자를 받아 타입을 만드는 것, 예를 들어 Scala의 `List`나 Java의 `ArrayList`를 <a id="g-type-constructor"></a>타입 생성자(type constructor)라고 합니다. `Cat <: Animal`일 때, `List[Cat]`과 `List[Animal]` 사이에는 어떤 관계가 있어야 할까요?

### 공변, 반변, 불변

타입 생성자 \\(F\\)에 대해 \\(\sigma_1 <: \sigma_2\\)라고 합시다.

- \\(F[\sigma_1] <: F[\sigma_2]\\)이면, 즉 관계의 방향이 그대로이면 \\(F\\)는 **공변**(covariant)입니다.
- \\(F[\sigma_2] <: F[\sigma_1]\\)이면, 즉 방향이 뒤집히면 \\(F\\)는 **반변**(contravariant)입니다.
- 두 타입 인자가 같을 때만 \\(F[\sigma_1] <: F[\sigma_2]\\)이면 \\(F\\)는 **불변**(invariant)입니다.

이 세 성질을 통틀어 \\(F\\)의 **변성**(variance)이라고 합니다. 우리는 이미 한 가지 예를 알고 있습니다. \\(\mathsf{STFAE}\\)의 함수 타입 \\(\tau_1 \to \tau_2\\)는 매개변수 타입에 대해 반변이고 반환 타입에 대해 공변입니다. 레코드 타입은 \\(\texttt{S-Record}\\)에 따라 각 필드 타입에 대해 공변입니다.

<div style="text-align:center">
<svg viewBox="0 0 660 260" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="Cat &lt;: Animal일 때 List의 변성에 따른 관계: 공변 List[+A]이면 List[Cat] &lt;: List[Animal], 반변 List[-A]이면 List[Animal] &lt;: List[Cat], 불변 List[A]이면 둘 사이에 관계가 없다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="bounded-polymorphism-3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="330" y="22" text-anchor="middle" font-size="14">Cat &lt;: Animal 일 때</text>
<text x="110" y="55" text-anchor="middle" font-weight="bold">공변</text>
<text x="110" y="75" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">List[+A]</text>
<rect x="45" y="95" width="130" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="116" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">List[Animal]</text>
<rect x="45" y="195" width="130" height="32" rx="4" fill="#2a408e"/>
<text x="110" y="216" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14" fill="#fff">List[Cat]</text>
<polyline points="110,195 110,130" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#bounded-polymorphism-3)"/>
<text x="330" y="55" text-anchor="middle" font-weight="bold">반변</text>
<text x="330" y="75" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">List[-A]</text>
<rect x="265" y="95" width="130" height="32" rx="4" fill="#2a408e"/>
<text x="330" y="116" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14" fill="#fff">List[Animal]</text>
<rect x="265" y="195" width="130" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="330" y="216" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">List[Cat]</text>
<polyline points="330,127 330,192" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#bounded-polymorphism-3)"/>
<text x="550" y="55" text-anchor="middle" font-weight="bold">불변</text>
<text x="550" y="75" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">List[A]</text>
<rect x="485" y="95" width="130" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="116" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">List[Animal]</text>
<rect x="485" y="195" width="130" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="550" y="216" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">List[Cat]</text>
<line x1="550" y1="132" x2="550" y2="190" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="560" y="166" font-size="13">관계 없음</text>
<text x="330" y="252" text-anchor="middle" font-size="13">A → B: A &lt;: B (색칠한 쪽이 서브타입)</text>
</svg>
</div>

어느 변성이 옳은지는 타입 생성자가 타입 인자를 **어떻게 쓰는지**에 달려 있습니다. 직관은 이렇습니다. 값을 **내놓기만** 하는 것(생산자)은 공변이어도 안전하고, 값을 **받기만** 하는 것(소비자)은 반변이어도 안전합니다. 둘 다 하면 불변이어야 합니다.

### 구조로 변성 알아내기

\\(\mathsf{BTFAE}\\)에는 타입 생성자를 정의하는 기능이 없지만, 타입에 이름을 붙이는 줄임말이 있다고 생각하면 변성을 정확히 따져 볼 수 있습니다. 예를 들어 다음 네 줄임말을 봅시다(\\(\mathsf{BTFAE}\\)에는 `Unit`이 없으므로, 돌려줄 것이 없는 연산은 의미 없는 수를 돌려준다고 합시다).

\\[
\begin{array}{lcl}
\mathtt{Get}[A] &=& \\{\mathit{get} : \mathtt{num} \to A\\} \\\\
\mathtt{Sink}[A] &=& \\{\mathit{put} : A \to \mathtt{num}\\} \\\\
\mathtt{Ref}[A] &=& \\{\mathit{get} : \mathtt{num} \to A, \enspace \mathit{set} : A \to \mathtt{num}\\} \\\\
\mathtt{Array}[A] &=& \\{\mathit{get} : \mathtt{num} \to A, \enspace \mathit{set} : \mathtt{num} \to A \to \mathtt{num}\\}
\end{array}
\\]

\\(\mathtt{Get}\\)은 값을 꺼내 주기만 하는 생산자, \\(\mathtt{Sink}\\)는 값을 받기만 하는 소비자, \\(\mathtt{Ref}\\)는 [변경 가능한 자료 구조](./mutable-data-structures.md)의 상자처럼 읽기와 쓰기를 모두 하는 칸, \\(\mathtt{Array}\\)는 번호로 읽고 쓰는 배열입니다. \\(\mathit{Cat} = \\{\mathit{name} : \mathtt{num}, \mathit{meow} : \mathtt{num}\\}\\), \\(\mathit{Animal} = \\{\mathit{name} : \mathtt{num}\\}\\)으로 두고 줄임말을 펼쳐서 \\(\mathsf{BTFAE}\\)의 서브타입 판정을 해 보면 다음과 같습니다.

- \\(\mathtt{Get}[\mathit{Cat}] <: \mathtt{Get}[\mathit{Animal}]\\): 레코드 필드 타입과 반환 타입이 모두 공변이므로 성립합니다. 따라서 \\(\mathtt{Get}\\)은 공변입니다.
- \\(\mathtt{Sink}[\mathit{Animal}] <: \mathtt{Sink}[\mathit{Cat}]\\): 매개변수 타입이 반변이므로 성립하고, 반대 방향은 성립하지 않습니다. 따라서 \\(\mathtt{Sink}\\)는 반변입니다.
- \\(\mathtt{Ref}\\)와 \\(\mathtt{Array}\\)는 어느 방향도 성립하지 않습니다. \\(\mathit{get}\\) 필드는 \\(\mathit{Cat} <: \mathit{Animal}\\)을, \\(\mathit{set}\\) 필드는 \\(\mathit{Animal} <: \mathit{Cat}\\)을 요구하기 때문입니다. 따라서 둘은 불변입니다.

이처럼 \\(\mathsf{STFAE}\\)나 \\(\mathsf{BTFAE}\\)처럼 타입을 **구조로** 비교하는 언어에서는, 변성을 따로 정할 필요 없이 줄임말을 펼치기만 하면 저절로 결정됩니다.

### 변경 가능한 배열은 왜 불변이어야 하는가

\\(\mathtt{Array}\\)를 억지로 공변으로 만들면 무슨 일이 일어날까요? 실제로 그렇게 한 언어가 있습니다. Java의 배열은 공변입니다. `String <: Object`이므로 `String[] <: Object[]`입니다.

```java
// Java
String[] strs = new String[1];
Object[] objs = strs;            // accepted: String[] <: Object[]
objs[0] = Integer.valueOf(42);   // accepted by the type checker
String s = strs[0];              // ... but strs[0] would now be an Integer!
```

셋째 줄은 타입 검사를 통과합니다. `objs`의 타입이 `Object[]`이고 `Integer`는 `Object`이니까요. 하지만 `objs`와 `strs`는 **같은 배열**을 가리키므로, 이 줄이 그대로 실행되면 `String[]` 타입의 배열에 `Integer`가 들어가고, 넷째 줄은 `Integer`를 `String`이라고 믿고 쓰게 됩니다. 타입 안전성이 깨지는 것이죠.

<div style="text-align:center">
<svg viewBox="0 0 640 230" width="100%" style="max-width: 620px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="String[] 타입의 변수 strs와 Object[] 타입의 변수 objs가 같은 배열 객체를 가리킨다. 배열 객체는 실제 타입 String[]을 기억하고, objs[0] = 42를 실행하면 JVM이 Integer가 String이 아님을 검사해 ArrayStoreException을 던진다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="bounded-polymorphism-4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="40" width="170" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="105" y="62" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">strs: String[]</text>
<rect x="20" y="120" width="170" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="105" y="142" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">objs: Object[]</text>
<rect x="330" y="60" width="200" height="84" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="430" y="82" text-anchor="middle" font-size="13">배열 객체</text>
<text x="430" y="101" text-anchor="middle" font-size="13">실제 타입: <tspan font-family="ui-monospace, Menlo, monospace">String[]</tspan></text>
<rect x="395" y="110" width="70" height="26" rx="3" fill="#2a408e"/>
<text x="430" y="128" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13" fill="#fff">[0]</text>
<polyline points="190,57 326,85" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#bounded-polymorphism-4)"/>
<polyline points="190,137 326,118" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#bounded-polymorphism-4)"/>
<text x="20" y="200" font-family="ui-monospace, Menlo, monospace" font-size="14">objs[0] = 42</text>
<polyline points="135,190 392,134" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#bounded-polymorphism-4)"/>
<text x="330" y="180" font-size="13">실행 중 검사: Integer는 String이 아님</text>
<text x="330" y="200" font-size="13" font-weight="bold">→ ArrayStoreException</text>
</svg>
</div>

Java는 이 구멍을 **실행 중 검사**로 막습니다. JVM의 배열 객체는 만들어질 때의 원소 타입(`String`)을 기억하고, 배열에 값을 저장할 때마다 그 값이 원소 타입에 맞는지 검사합니다. 그래서 셋째 줄은 실행 중에 `java.lang.ArrayStoreException: java.lang.Integer`를 던집니다. 타입 검사기가 해야 할 일을 실행 시간으로 미룬 셈이고, 그 대가로 모든 배열 저장이 조금씩 느려집니다. Java가 이렇게 설계된 것은 제네릭이 없던 시절, `Object[]`를 받는 정렬 함수 같은 것을 모든 배열에 쓰려면 배열의 공변성이 필요했기 때문입니다. 나중에 제네릭을 도입할 때는 같은 실수를 반복하지 않아서, `List<String>`은 `List<Object>`의 서브타입이 **아닙니다**.

```java
// Java
List<String> strs = new ArrayList<>();
List<Object> objs = strs;   // error: incompatible types
```

TypeScript는 한발 더 나아가, 배열을 공변으로 두면서 실행 중 검사도 하지 않습니다.

```typescript
// TypeScript
const cats: Cat[] = [new Cat()];
const animals: Animal[] = cats;   // accepted: arrays are covariant
animals.push(new Dog());          // accepted, no run-time check
cats[1].meow();                   // TypeError at run time
```

`--strict`로 검사해도 이 프로그램은 통과하고, 실행하면 마지막 줄에서 오류가 납니다. TypeScript는 편의를 위해 일부러 안전성을 포기한 곳이 있는 언어입니다. 이런 선택은 [점진적 타입](./gradual-typing.md)에서 다시 이야기합니다.

> **생각해 보기.** \\(\mathsf{STFAE}\\)와 \\(\mathsf{BTFAE}\\)의 레코드는 필드 타입에 대해 공변입니다. 레코드 필드에 값을 다시 쓸 수 있게(예: `r.x := e`) 언어를 바꾸면 이 규칙을 그대로 둬도 될까요? 위의 \\(\mathtt{Ref}\\)와 비교해 보세요.

### 위치로 변성 판정하기

앞에서는 서브타입 판정을 직접 해 보고 변성을 알아냈습니다. 하지만 타입을 들여다보기만 해도 변성을 알 수 있습니다. 핵심은 타입 변수가 나타나는 **위치**입니다. 함수 타입의 매개변수 자리에 들어가면 방향이 한 번 뒤집히고, 매개변수의 매개변수 자리에 들어가면 두 번 뒤집혀 다시 원래 방향이 됩니다. 이를 정확히 하기 위해, 타입 \\(\tau\\)의 <a id="g-positive-position"></a>양의 위치(positive position)에 자유롭게 나타나는 타입 변수의 집합 \\(\mathtt{occ}^{+}(\tau)\\)와 <a id="g-negative-position"></a>음의 위치(negative position)에 나타나는 집합 \\(\mathtt{occ}^{-}(\tau)\\)를 정의합니다. \\(\pm\\)는 \\(+\\)와 \\(-\\) 중 하나이고, \\(\mp\\)는 그 반대입니다.

\\[
\begin{array}{lcl}
\mathtt{occ}^{\pm}(\mathtt{num}) = \mathtt{occ}^{\pm}(\top) &=& \varnothing \\\\
\mathtt{occ}^{+}(\alpha) = \\{\alpha\\} \qquad \mathtt{occ}^{-}(\alpha) &=& \varnothing \\\\
\mathtt{occ}^{\pm}(\tau_1 \to \tau_2) &=& \mathtt{occ}^{\mp}(\tau_1) \cup \mathtt{occ}^{\pm}(\tau_2) \\\\
\mathtt{occ}^{\pm}(\\{x_1 : \tau_1, \ldots, x_n : \tau_n\\}) &=& \mathtt{occ}^{\pm}(\tau_1) \cup \ldots \cup \mathtt{occ}^{\pm}(\tau_n) \\\\
\mathtt{occ}^{\pm}(\forall\alpha' <: \tau_1.\tau_2) &=& \mathtt{occ}^{+}(\tau_1) \cup \mathtt{occ}^{-}(\tau_1) \cup (\mathtt{occ}^{\pm}(\tau_2) \setminus \\{\alpha'\\})
\end{array}
\\]

마지막 줄이 흥미롭습니다. 커널 규칙 \\(\texttt{S-All}\\)은 경계가 **같을** 때만 비교하므로, 경계는 공변도 반변도 아닌 불변 위치입니다. 그래서 경계에 나타나는 타입 변수는 양쪽 집합에 모두 넣습니다.

이 정의가 옳다는 것은 다음 보조 정리가 보장합니다.

> **보조 정리(변성)** \\(\Gamma \vdash \sigma_1 <: \sigma_2\\)라고 합시다.
> - \\(\alpha \notin \mathtt{occ}^{-}(\tau)\\)이면 \\(\Gamma \vdash \tau[\alpha \leftarrow \sigma_1] <: \tau[\alpha \leftarrow \sigma_2]\\)입니다.
> - \\(\alpha \notin \mathtt{occ}^{+}(\tau)\\)이면 \\(\Gamma \vdash \tau[\alpha \leftarrow \sigma_2] <: \tau[\alpha \leftarrow \sigma_1]\\)입니다.

증명은 \\(\tau\\)에 대한 귀납법으로, 두 명제를 함께 보입니다. \\(\tau = \alpha\\)이면 첫 명제는 가정 그대로이고, 둘째 명제는 \\(\alpha \in \mathtt{occ}^{+}(\alpha)\\)이므로 따질 필요가 없습니다. \\(\tau = \tau_1 \to \tau_2\\)이면 \\(\alpha \notin \mathtt{occ}^{-}(\tau)\\)는 \\(\alpha \notin \mathtt{occ}^{+}(\tau_1)\\)이고 \\(\alpha \notin \mathtt{occ}^{-}(\tau_2)\\)라는 뜻이므로, \\(\tau_1\\)에는 둘째 명제를, \\(\tau_2\\)에는 첫 명제를 귀납 가정으로 쓰고 \\(\texttt{S-Arrow}\\)로 합칩니다. 레코드는 필드마다 같은 명제를 쓰고, 다형 타입은 \\(\alpha\\)가 경계에 나타나지 않으므로 두 경계가 같아져 \\(\texttt{S-All}\\)을 쓸 수 있습니다.

이제 타입 생성자 \\(F[A] = \tau\\)의 변성은 이렇게 정하면 됩니다. \\(A \notin \mathtt{occ}^{-}(\tau)\\)이면 공변, \\(A \notin \mathtt{occ}^{+}(\tau)\\)이면 반변, 둘 다 아니면 불변입니다(둘 다이면, 즉 \\(A\\)가 아예 나타나지 않으면 양쪽 방향이 다 성립합니다). 구현은 정의를 그대로 옮긴 것입니다.

```scala
def occ(ty: Type, pos: Boolean): Set[String] = ty match
  case NumT | TopT      => Set()
  case VarT(x)          => if (pos) Set(x) else Set()
  case ArrowT(pty, rty) => occ(pty, !pos) ++ occ(rty, pos)
  case RecordT(fs)      => fs.values.flatMap(occ(_, pos)).toSet
  case PolyT(x, b, t)   => occ(b, true) ++ occ(b, false) ++ (occ(t, pos) - x)

def variance(name: String, body: Type): String =
  (occ(body, true).contains(name), occ(body, false).contains(name)) match
    case (_, false)    => "+"   // covariant (or unused)
    case (false, true) => "-"   // contravariant
    case (true, true)  => "="   // invariant
```

앞의 줄임말들과 몇 가지 예에 적용한 결과입니다.

```text
Get[A]   = {get: Number => A}                              "+"
Sink[A]  = {put: A => Number}                              "-"
Ref[A]   = {get: Number => A, set: A => Number}            "="
Array[A] = {get: Number => A, set: Number => A => Number}  "="
Weird[A] = (A => Number) => Number                         "+"
Poly[A]  = [X <: A](X => X)                                "="
```

`Weird`에서 \\(A\\)는 매개변수의 매개변수 자리에 있어 두 번 뒤집히므로 양의 위치입니다. `Poly`에서 \\(A\\)는 경계에 있으므로 불변입니다.

### 선언 지점 변성: Scala

Java나 Scala의 클래스는 이름으로 구별되는(nominal) 타입이어서, \\(\mathsf{BTFAE}\\)처럼 줄임말을 펼쳐 비교할 수가 없습니다. `List[Cat] <: List[Animal]`인지 알려면 `List`의 변성을 미리 알아야 합니다. Scala는 클래스를 **선언할 때** 타입 매개변수마다 변성을 적게 합니다. 이를 <a id="g-declaration-site-variance"></a>선언 지점 변성(declaration-site variance)이라고 합니다. `+`는 공변, `-`는 반변, 아무것도 없으면 불변입니다.

```scala
// Scala
sealed abstract class List[+A]          // covariant
trait Function1[-T1, +R]                // contravariant in T1, covariant in R
final class Array[T]                    // invariant
```

변성을 선언한 타입 생성자 \\(C\\)의 서브타입 규칙은 다음과 같습니다. \\(C\\)의 \\(i\\)번째 타입 매개변수의 변성이 \\(v_i\\)일 때,

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash \tau_1 \mathrel{\triangleleft_{v_1}} \tau_1' \quad \ldots \quad \Gamma \vdash \tau_n \mathrel{\triangleleft_{v_n}} \tau_n'$}
\LeftLabel{$\texttt{S-Ctor}$}
\UnaryInfC{$\Gamma \vdash C[\tau_1, \ldots, \tau_n] <: C[\tau_1', \ldots, \tau_n']$}
\end{prooftree}
\\]

여기서 \\(\triangleleft_{+}\\)는 \\(<:\\), \\(\triangleleft_{-}\\)는 \\(:>\\)이고, 불변인 경우의 \\(\triangleleft\\)는 양쪽 방향이 모두 성립해야 한다는 뜻입니다. 그런데 이 규칙을 쓰려면 선언된 변성이 **거짓말이 아니어야** 합니다. `class Box[+A]`라고 선언해 놓고 `A`를 받는 메서드를 두면 Java 배열과 같은 구멍이 생깁니다. 그래서 Scala 컴파일러는 클래스 정의를 검사할 때, 공변으로 선언된 타입 매개변수가 음의 위치에 나타나지 않는지, 반변으로 선언된 타입 매개변수가 양의 위치에 나타나지 않는지 확인합니다. 메서드 매개변수 타입은 음의 위치, 반환 타입은 양의 위치입니다. 공개된 변경 가능한 필드 `var x: A`는 읽기(양)와 쓰기(음)를 모두 하므로 양쪽 위치입니다.

```scala
// Scala
class Box[+A](init: A) {
  private var x: A = init
  def get: A = x
  def set(a: A): Unit = x = a
  // error: covariant type A occurs in contravariant position
  //        in type A of parameter a
}
```

이것이 바로 앞의 보조 정리가 요구하는 조건입니다. 위치 검사를 통과한 클래스는 모든 멤버 타입이 보조 정리의 조건을 만족하므로 \\(\texttt{S-Ctor}\\)가 안전합니다. 위치 검사는 클래스를 정의할 때 한 번만 하면 되고, 그 뒤로는 `List[Cat] <: List[Animal]`을 판정할 때 클래스 정의를 들여다볼 필요가 없습니다.

공변 리스트에 원소를 앞에 붙이는 메서드는 어떻게 쓸까요? `def prepend(x: A): List[A]`는 `A`가 매개변수 자리에 있으므로 거부됩니다. Scala 표준 라이브러리는 여기서 <a id="g-lower-bound"></a>하한 경계(lower bound) `>:`를 씁니다.

```scala
// Scala
enum MyList[+A]:
  case Nil
  case Cons(head: A, tail: MyList[A])
  def prepend[B >: A](x: B): MyList[B] = Cons(x, this)

val xs: MyList[Cat] = MyList.Cons(Cat("Nabi"), MyList.Nil)
val ys: MyList[Animal] = xs.prepend(Dog("Bori"))   // B = Animal
```

`B >: A`는 "`A`의 슈퍼타입인 어떤 `B`"라는 뜻입니다. 고양이 리스트에 개를 붙이면, 결과는 둘 모두의 슈퍼타입인 동물 리스트가 됩니다. 리스트를 바꾸지 않고 새 리스트를 만드니 안전합니다. 이때 Scala는 경계를 커널 규칙이 아니라 완전한 규칙처럼, 즉 상한 경계는 반변 위치로, 하한 경계는 공변 위치로 봅니다. 그래서 `A`가 하한 경계에 나타나는 것은 허락되고, `def f[B <: A](x: B)`처럼 상한 경계에 나타나면 `covariant type A occurs in contravariant position in type <: A of type B` 오류가 납니다.

### 사용 지점 변성: Java 와일드카드

Java는 다른 길을 택했습니다. 제네릭 클래스는 모두 불변으로 두고, 그 대신 타입을 **쓰는 곳에서** 변성을 고르게 합니다. 이를 <a id="g-use-site-variance"></a>사용 지점 변성(use-site variance)이라고 하고, <a id="g-wildcard"></a>와일드카드(wildcard) `?`로 적습니다.

```java
// Java
static double sum(List<? extends Number> xs) {   // read only
  double s = 0;
  for (Number n : xs) s += n.doubleValue();
  return s;
}
static void fill(List<? super Integer> xs) {     // write only
  xs.add(42);
}
sum(List.of(1, 2));                    // List<Integer> <: List<? extends Number>
fill(new ArrayList<Number>());         // List<Number>  <: List<? super Integer>
```

`List<? extends Number>`는 "원소 타입이 `Number`의 **어떤** 서브타입인 리스트"입니다. 원소를 꺼내면 적어도 `Number`이므로 읽기는 안전하지만, 원소 타입이 정확히 무엇인지 모르므로 `null` 말고는 아무것도 넣을 수 없습니다. 즉 `List`에서 생산자 부분(앞의 \\(\mathtt{Get}\\))만 남겨 공변으로 만든 것입니다. 반대로 `List<? super Integer>`는 "원소 타입이 `Integer`의 어떤 슈퍼타입인 리스트"로, `Integer`를 넣는 것은 안전하지만 꺼낸 원소는 `Object`라는 것밖에 모릅니다. 소비자 부분(\\(\mathtt{Sink}\\))만 남겨 반변으로 만든 것입니다.

Java 프로그래머들은 이를 "생산자는 `extends`, 소비자는 `super`"(Producer Extends, Consumer Super, 줄여서 PECS)라고 외웁니다. 표준 라이브러리의 `Collections.copy`가 좋은 예입니다.

```java
// Java
public static <T> void copy(List<? super T> dest, List<? extends T> src)
```

`src`에서는 읽기만 하고 `dest`에는 쓰기만 하므로, `List<Cat>`에서 `List<Animal>`로 복사할 수 있습니다. 와일드카드 뒤에는 이 장의 범위를 넘는 <a id="g-existential-type"></a>존재 타입(existential type)이라는 이론이 있습니다.

### MiniScala와의 관계

강의 프로젝트 \\(\mathsf{MiniScala}\\)를 구현해 보았다면 이 이야기가 낯설지 않을 것입니다. \\(\mathsf{MiniScala}\\)는 모든 `enum`의 타입 매개변수를 Scala의 `enum T[+A]`처럼 **공변**으로 취급합니다. 그래서 `enum` 정의를 검사하는 규칙은, 타입 매개변수가 배리언트(variant) 매개변수 타입의 양의 위치에만 나타나는지 확인합니다. 명세는 이를 위해 이 장의 \\(\mathtt{occ}^{+}\\), \\(\mathtt{occ}^{-}\\)와 같은 함수를 정의하고, 예를 들어 `enum Box[A] { case B(f: (A) => Number) }`를 거부합니다. `A`가 함수 매개변수 자리, 즉 음의 위치에 있기 때문입니다. 이 검사가 없으면 `Box[Cat] <: Box[Animal]`을 이용해 고양이만 받는 함수를 동물을 받는 함수처럼 부를 수 있게 되어, 앞의 보조 정리가 깨집니다. \\(\mathsf{MiniScala}\\)의 위치 검사와 Scala의 변성 검사는 정확히 같은 생각입니다.

## 실제 언어에서는

- **Java**는 `<T extends B>`로 상한 경계를 적고, `<T extends A & B>`처럼 경계를 여러 개 둘 수도 있습니다. `Comparable<T>` 같은 F-유계 다형성을 지원하며, 컴파일한 뒤에는 타입 변수를 경계로 지웁니다. 클래스는 모두 불변이고 와일드카드로 사용 지점 변성을 표현합니다. 배열만 예외적으로 공변이며, 실행 중 검사로 안전성을 지킵니다.
- **Scala**는 `<:`로 상한 경계를, `>:`로 하한 경계를 적고, 선언 지점 변성(`+`, `-`)과 위치 검사를 합니다. JVM 위에서 동작하므로 Java처럼 타입을 지웁니다. Scala의 `Array[T]`는 Java 배열과 달리 불변입니다.
- **Kotlin**과 **C#** 모두 선언 지점 변성을 지원하며, 키워드로 `out`(공변)과 `in`(반변)을 씁니다. 예를 들어 C#의 `IEnumerable<out T>`는 공변이고 `Action<in T>`는 반변입니다. "내놓기만 하면 `out`, 받기만 하면 `in`"이라는 이름 자체가 앞의 직관을 그대로 담고 있습니다.
- **TypeScript**는 `<T extends {x: number}>`로 경계를 적고 객체 타입을 구조로 비교하므로, 이 장의 \\(\mathsf{BTFAE}\\)와 가장 닮았습니다. 하지만 배열은 공변이면서 실행 중 검사가 없고, 메서드 매개변수는 공변과 반변을 모두 허락하는(bivariant) 등 일부러 안전성을 포기한 곳이 있습니다.
- **Rust**의 `fn max<T: Ord>(a: T, b: T) -> T`도 경계처럼 보이지만, `Ord`는 서브타입 관계가 아니라 [타입 클래스](./type-classes.md)와 같은 트레이트 제약입니다. Rust의 서브타입 관계는 <a id="g-lifetime"></a>수명(lifetime)에만 있고, 수명이 들어간 타입에도 변성이 있습니다. 예를 들어 `&'a T`는 `T`에 대해 공변이지만 `&'a mut T`는 `T`에 대해 불변입니다. 변경 가능한 참조가 불변이어야 하는 이유는 앞의 \\(\mathtt{Ref}\\)와 똑같습니다.
- **Haskell**에는 서브타입 관계가 없으므로 유계 다형성도 변성 문제도 없습니다. 비슷한 일은 `Ord a =>` 같은 타입 클래스 제약이 맡습니다.

실제 언어의 타입 시스템은 이 장의 \\(\mathsf{BTFAE}\\)보다 훨씬 복잡하고, 그만큼 구멍도 생깁니다. 예를 들어 Amin과 Tate는 2016년에 Java와 Scala의 타입 시스템이 `null`과 와일드카드, 경계가 얽히는 지점에서 안전하지 않다는 것을 보였습니다. 유계 다형성과 변성은 쓰기에는 자연스럽지만 메타 이론은 까다로운 기능입니다.

## 정리

- 서브타입 다형성은 "필드 `x`가 있다" 같은 요구 조건을, 매개변수 다형성은 "같은 타입"이라는 관계를 표현합니다. 유계 다형성은 타입 변수에 상한 경계를 붙여 둘을 함께 표현합니다.
- \\(\mathsf{BTFAE}\\)는 \\(\mathsf{PTFAE}\\)와 \\(\mathsf{STFAE}\\)(최하위 타입 제외)를 합치고, 타입 추상화 \\(\forall\alpha <: \tau.e\\)와 다형 타입 \\(\forall\alpha <: \tau.\tau'\\)에 경계를 붙인 언어입니다. 경계가 \\(\top\\)이면 \\(\mathsf{PTFAE}\\)와 같습니다.
- 인터프리터는 타입 소거를 따르므로 경계와 타입 인자를 무시합니다.
- 타입 환경은 타입 변수마다 경계를 기억하고, 서브타입 관계는 \\(\Gamma \vdash \tau <: \tau'\\)이 됩니다. 새 규칙 \\(\texttt{S-TVar}\\)는 타입 변수가 경계의 서브타입이라고 말하며, 타입 변수에 관해서는 위쪽 방향만 알려 줍니다.
- 다형 타입 사이의 서브타입 관계는, 경계가 같을 때만 비교하는 커널 규칙과 경계를 반변으로 비교하는 완전한 규칙이 있습니다. 경계를 공변으로 비교하면 안전하지 않고, 완전한 규칙을 쓰면 서브타입 관계가 결정 불가능해집니다.
- \\(\tau\texttt{-TypeApp}\\)은 타입 인자가 경계의 서브타입인지 검사합니다. 이 검사가 유계 다형성의 안전성을 지키는 핵심입니다.
- 알고리즘적 타입 규칙은 노출 \\(\Gamma \vdash \tau \Uparrow \tau'\\)로 타입 변수를 경계로 올려 필드 접근, 함수 적용, 타입 적용에 필요한 모양을 찾고, 알고리즘적 서브타입 판정은 \\(\texttt{S-TVar}\\)와 \\(\texttt{S-Trans}\\)를 합친 \\(\texttt{SA-Trans-TVar}\\)를 씁니다.
- 타입 생성자는 타입 인자를 내놓기만 하면 공변, 받기만 하면 반변, 둘 다 하면 불변이어야 합니다. Java 배열은 변경 가능한데도 공변이어서 실행 중 검사(`ArrayStoreException`)로 구멍을 막습니다.
- 변성은 타입 변수가 나타나는 양의 위치와 음의 위치로 판정할 수 있습니다. Scala의 선언 지점 변성 검사와 \\(\mathsf{MiniScala}\\)의 `enum` 검사는 모두 이 위치 검사이고, Java는 와일드카드로 사용 지점 변성을 표현합니다.

## 연습 문제

1. \\(\Gamma = [A <: \\{x : \mathtt{num}\\}][B <: A]\\)라고 합시다. 다음 관계가 커널 규칙으로 성립하는지 판정하고, 성립하면 알고리즘적 규칙으로 유도해 보세요.
   - \\(\Gamma \vdash B <: \\{\\}\\)
   - \\(\Gamma \vdash \\{x : \mathtt{num}\\} <: A\\)
   - \\(\Gamma \vdash A \to \mathtt{num} <: B \to \top\\)
   - \\(\Gamma \vdash \forall T <: A.T \to B <: \forall U <: A.U \to \\{x : \mathtt{num}\\}\\)
   - \\(\Gamma \vdash \forall T <: \top.T \to T <: \forall T <: \\{x : \mathtt{num}\\}.T \to T\\) (완전한 규칙이라면 어떻게 될까요?)
2. 다음 \\(\mathsf{BTFAE}\\) 식의 타입을 구하거나, 타입 오류가 나는 이유를 설명하세요.
   - `forall[T <: {x: Number}] (p: T) => (q: T) => p.x + q.x`
   - `forall[F <: {x: Number} => Number] (f: F) => f({x = 1, y = 2})`
   - `(forall[T <: Number => Number] (f: T) => f)[{x: Number} => Number]`
   - `forall[T <: {x: Number}] (p: T) => { val r: {x: Number, y: Number} = p; r.y }`
3. \\(\texttt{S-All}\\)에서 경계를 공변으로 비교하면 안전하지 않다는 것을 이 장과 **다른** 예로 보이세요. 이어서 경계를 반변으로 비교해도 안전한 이유를 좁히기 보조 정리로 설명하세요.
4. `isSubType`의 다형 타입 경우를 완전한 규칙 \\(\texttt{S-All}\_{\text{full}}\\)로 바꿔 구현하세요. 커널 규칙과 판정이 달라지는 예를 두 개 찾고, 이 구현이 왜 항상 끝난다고 장담할 수 없는지 설명하세요.
5. 다음 줄임말에서 \\(A\\)의 변성을 \\(\mathtt{occ}^{\pm}\\)로 구하고, `variance` 함수로 확인하세요.
   - \\(F[A] = (A \to \mathtt{num}) \to A\\)
   - \\(G[A] = \\{f : A \to A\\}\\)
   - \\(H[A] = \\{\mathit{run} : ((A \to \mathtt{num}) \to \mathtt{num}) \to \mathtt{num}\\}\\)
   - \\(K[A] = \forall X <: \top.(X \to A) \to X\\)
6. \\(\mathsf{BTFAE}\\)에 이름 붙은 타입 생성자 정의 `type F[+A] = τ; e`(변성 표시는 `+`, `-`, 없음)를 더한다고 합시다. 선언된 변성이 \\(\tau\\)와 맞는지 검사하는 규칙을 쓰고, 이 정의를 쓰는 곳에서 \\(\texttt{S-Ctor}\\)로 비교해도 안전한 이유를 변성 보조 정리로 설명하세요. 강의 프로젝트 `mini-scala`의 `enum` 검사를 구현했다면 그 코드와 비교해 보세요.

7. <a id="ex-bounded-polymorphism-7"></a>★★★ \\(\mathsf{BTFAE}\\)의 타입 시스템을 다음 규칙 틀의 빈칸 (A)~(H)를 채워 완성한다고 합시다. 다만 다형 타입 사이의 서브타입 규칙은 이 장의 \\(\texttt{S-All}\\)과 달리 두 경계 \\(\tau_1\\), \\(\tau_1'\\)이 다를 수도 있는 꼴로 둡니다.

   \\[
   \begin{prooftree}
   \AxiomC{$\texttt{(A)}$}
   \UnaryInfC{$\Gamma \vdash \\{x_1 : \tau_1, \ldots, x_n : \tau_n\\}$}
   \end{prooftree}
   \qquad
   \begin{prooftree}
   \AxiomC{$\texttt{(B)}$}
   \UnaryInfC{$\Gamma \vdash \forall\alpha <: \tau_1.\tau_2$}
   \end{prooftree}
   \qquad
   \begin{prooftree}
   \AxiomC{$\texttt{(C)}$}
   \LeftLabel{$\texttt{S-TVar}$}
   \UnaryInfC{$\Gamma \vdash \alpha <: \tau$}
   \end{prooftree}
   \\]

   \\[
   \begin{prooftree}
   \AxiomC{$\texttt{(D)}$}
   \UnaryInfC{$\Gamma \vdash \forall\alpha <: \tau_1.\tau_2 <: \forall\alpha <: \tau_1'.\tau_2'$}
   \end{prooftree}
   \\]

   \\[
   \begin{prooftree}
   \AxiomC{$\texttt{(E)}$}
   \LeftLabel{$\tau\texttt{-TypeAbs}$}
   \UnaryInfC{$\Gamma \vdash \forall\alpha <: \tau_1.e : \texttt{(F)}$}
   \end{prooftree}
   \qquad
   \begin{prooftree}
   \AxiomC{$\texttt{(G)}$}
   \LeftLabel{$\tau\texttt{-TypeApp}$}
   \UnaryInfC{$\Gamma \vdash e[\tau] : \texttt{(H)}$}
   \end{prooftree}
   \\]

   완성한 타입 시스템에서 다음 식은 타입 검사를 통과해야 합니다.

   ```btfae
   /* BTFAE */
   val f = forall[A <: {a: Top}] (x: A) => x.a;
   val x = f[{a: Number => Number, b: Number}]({a = (z: Number) => z + 1, b = 2});
   val y = f[{a: Number}]({a = 2});
   val g = (z: [A <: Number](A => Number)) => z[Number];
   g(forall[A <: Top] (z: A) => z)
   ```

   반면 다음 여섯 식은 모두 타입 검사를 통과하지 못해야 합니다.

   ```btfae
   /* BTFAE */
   (x: [A <: B] A) => x
   (x: [A <: Number] A) => x[B]
   (x: {a: A}) => x
   forall[A <: B] 42
   forall[A <: Number] forall[A <: Number] 42
   val f = (x: [A <: Top] Number) => x; f(forall[A <: Number] 42)
   ```

   <details><summary>힌트</summary>

   마지막 줄의 `g(...)`가 통과하려면 \\(\forall A <: \top.A \to A\\)가 \\(\forall A <: \mathtt{num}.A \to \mathtt{num}\\)의 서브타입이어야 합니다. 경계가 다르니 커널 규칙으로는 안 됩니다. 이때 두 경계를 어느 방향으로 비교해야 하는지, 몸통은 어느 경계를 가정하고 비교해야 하는지 생각해 보세요. 거부되어야 하는 여섯 식은 각각 어떤 전제 하나가 막아야 하는지 짝지어 보세요.

   </details>

   [해답 →](./answers-3.md#ans-bounded-polymorphism-7)

8. <a id="ex-bounded-polymorphism-8"></a>★★★ 배열과 구간 타입(interval type)을 가진 다음 타입 있는 언어를 생각해 봅시다. 구간 타입 \\([l, h]\\)는 \\(l\\) 이상 \\(h\\) 이하의 정수들의 타입이고, \\(\langle\tau\rangle[e_1, \ldots, e_n]\\)은 원소 타입이 \\(\tau\\)인 배열을 만들며, 그 타입 \\(\langle\tau\rangle[n]\\)은 길이 \\(n\\)까지 기억합니다. \\(e_1[e_2]\\)는 배열의 원소를 읽습니다.

   \\[
   \begin{array}{lrcl}
   \text{Expressions} & \mathbb{E} \ni e & ::= & n \mid e + e \mid \mathtt{val}\ x [: \tau]^{?} = e;\ e \mid x \\\\
   & & \mid & \lambda x\texttt{:}\tau.e \mid e(e) \mid \langle\tau\rangle[e, \ldots, e] \mid e[e] \\\\
   \text{Types} & \mathbb{T} \ni \tau & ::= & \mathtt{num} \mid [n, n] \mid \tau \to \tau \mid \langle\tau\rangle[n] \mid \top
   \end{array}
   \\]

   서브타입 관계와 주요 타입 규칙은 다음과 같습니다. 반사성, \\(\tau <: \top\\), 함수 타입 규칙은 \\(\mathsf{STFAE}\\)와 같고, `val`의 타입 표기와 함수 적용은 \\(\mathsf{STFAE}\\)의 알고리즘적 규칙처럼 서브타입 관계로 검사합니다.

   \\[
   \begin{prooftree}
   \AxiomC{$l \geq l'$}
   \AxiomC{$h \leq h'$}
   \BinaryInfC{$[l, h] <: [l', h']$}
   \end{prooftree}
   \qquad
   \begin{prooftree}
   \AxiomC{}
   \UnaryInfC{$[l, h] <: \mathtt{num}$}
   \end{prooftree}
   \qquad
   \begin{prooftree}
   \AxiomC{$\tau <: \tau'$}
   \UnaryInfC{$\langle\tau\rangle[n] <: \langle\tau'\rangle[n]$}
   \end{prooftree}
   \\]

   \\[
   \begin{prooftree}
   \AxiomC{}
   \UnaryInfC{$\Gamma \vdash n : [n, n]$}
   \end{prooftree}
   \qquad
   \begin{prooftree}
   \AxiomC{$\Gamma \vdash e_1 : \tau_1$}
   \AxiomC{$\Gamma \vdash e_2 : \tau_2$}
   \BinaryInfC{$\Gamma \vdash e_1 + e_2 : \mathsf{add}(\tau_1, \tau_2)$}
   \end{prooftree}
   \qquad
   \begin{prooftree}
   \AxiomC{$\Gamma \vdash e_i : \tau_i \quad \tau_i <: \tau \quad (1 \leq i \leq n)$}
   \UnaryInfC{$\Gamma \vdash \langle\tau\rangle[e_1, \ldots, e_n] : \langle\tau\rangle[n]$}
   \end{prooftree}
   \\]

   \\[
   \begin{prooftree}
   \AxiomC{$\Gamma \vdash e_a : \langle\tau\rangle[n]$}
   \AxiomC{$\Gamma \vdash e_i : [l, h]$}
   \AxiomC{$0 \leq l \quad h < n$}
   \TrinaryInfC{$\Gamma \vdash e_a[e_i] : \tau$}
   \end{prooftree}
   \\]

   여기서 \\(\mathsf{add}(\tau_1, \tau_2)\\)는 두 타입이 \\([l, h]\\)와 \\([l', h']\\)이면 \\([l + l', h + h']\\)이고, 그렇지 않고 둘 다 \\(\mathtt{num}\\)의 서브타입이면 \\(\mathtt{num}\\)이며, 그 밖에는 정의되지 않습니다. 이제 이 언어에 배열 원소를 바꾸는 식 \\(e_a[e_i] = e\\)를 다음 타입 규칙과 함께 더한다고 합시다. 두 식을 차례로 계산하는 \\(e_1; e_2\\)도 쓸 수 있습니다.

   \\[
   \begin{prooftree}
   \AxiomC{$\Gamma \vdash e_a : \langle\tau\rangle[n]$}
   \AxiomC{$\Gamma \vdash e_i : [l, h]$}
   \AxiomC{$\Gamma \vdash e : \tau' \quad \tau' <: \tau \quad 0 \leq l \quad h < n$}
   \TrinaryInfC{$\Gamma \vdash e_a[e_i] = e : \tau'$}
   \end{prooftree}
   \\]

   이 타입 시스템은 여전히 건전할까요? 건전하다면 이유를 설명하고, 건전하지 않다면 타입 검사를 통과하지만 원소 변경 때문에 실행 중에 타입 오류가 나는 식을 만드세요.

   <details><summary>힌트</summary>

   배열 타입은 원소 타입에 대해 공변입니다. 같은 배열을 서로 다른 타입의 두 이름으로 가리키게 한 뒤, 한 이름으로 원소를 바꾸고 다른 이름으로 읽어 보세요. 이 장의 Java 배열 예와 같은 구멍입니다.

   </details>

   [해답 →](./answers-3.md#ans-bounded-polymorphism-8)

## 더 읽을거리

- Luca Cardelli and Peter Wegner. "On Understanding Types, Data Abstraction, and Polymorphism." *ACM Computing Surveys*, 1985. 유계 정량화를 처음 제안한 논문으로, 다형성의 종류를 정리한 고전입니다.
- Benjamin C. Pierce. *Types and Programming Languages* (TAPL). MIT Press, 2002. 15장(서브타입), 23장(전칭 타입), 26장(유계 정량화), 28장(유계 정량화의 메타 이론)이 이 장의 내용을 훨씬 자세히 다룹니다. 커널과 완전한 \\(\mathrm{F}\_{<:}\\), 노출, 최소 타입이 모두 여기에 있습니다.
- Benjamin C. Pierce. "Bounded Quantification is Undecidable." *POPL*, 1992. 완전한 \\(\mathrm{F}\_{<:}\\)의 서브타입 관계가 결정 불가능하다는 증명입니다.
- Peter Canning, William Cook, Walter Hill, Walter Olthoff, and John C. Mitchell. "F-Bounded Polymorphism for Object-Oriented Programming." *FPCA*, 1989. 경계 안에 타입 변수 자신이 들어가는 F-유계 다형성을 제안했습니다.
- Atsushi Igarashi and Mirko Viroli. "On Variance-Based Subtyping for Parametric Types." *ECOOP*, 2002. 사용 지점 변성을 형식화한 논문으로, Java 와일드카드의 바탕이 되었습니다.
- Nada Amin and Ross Tate. "Java and Scala's Type Systems are Unsound: The Existential Crisis of Null Pointers." *OOPSLA*, 2016.
