# 클래스와 상속

[서브타입 다형성](./subtype-polymorphism.md)에서는 레코드에 필드를 더 가진 타입을 서브타입으로 보아, 더 많은 정보를 가진 값을 더 적은 정보를 요구하는 자리에 쓸 수 있게 했습니다. 그런데 Java, Scala, Kotlin 같은 객체 지향 언어에서 우리가 매일 쓰는 서브타입은 조금 다르게 생겼습니다. 필드가 같다고 서브타입이 되는 것이 아니라, 프로그래머가 `extends`로 **선언한** 클래스만 서브타입이 됩니다. 그리고 서브클래스는 슈퍼클래스의 메서드를 물려받거나 다시 정의하고, 프로그래머는 캐스트로 타입을 바꾸어 달라고 요구하기도 합니다.

이 장에서는 이런 클래스 기반 언어의 핵심만 남긴 작은 언어 **FJ**(Featherweight Java)를 다룹니다. FJ는 Igarashi, Pierce, Wadler가 Java의 타입 시스템을 엄밀하게 연구하려고 만든 언어로, 클래스, 상속, 메서드 오버라이드, 동적 디스패치, 캐스트만 남기고 나머지는 모두 덜어 냈습니다. FJ의 클래스 테이블, 자연 의미, 서브타입 관계, 타입 규칙을 차례로 정의하고 Scala로 인터프리터와 타입 검사기를 만든 뒤, FJ의 타입 안전성이 왜 "캐스트 실패를 빼면" 성립하는지 살펴봅니다.

## 클래스와 상속

### Java의 클래스

다음 Java 프로그램을 봅시다.

```java
// Java
class Animal {
  String sound() { return "..."; }
  String speak() { return "I say " + sound(); }
}
class Dog extends Animal {
  @Override String sound() { return "Woof"; }
}

Animal a = new Dog();     // a Dog is an Animal
a.speak();                // "I say Woof"
Object o = a;             // upcast: always safe
Dog d = (Dog) o;          // downcast: checked at run time, succeeds
String s = (String) o;    // compiles, but throws ClassCastException
```

이 짧은 프로그램에 객체 지향 언어의 중요한 기능이 거의 다 들어 있습니다.

- <a id="g-class"></a>**클래스**(class) `Animal`은 메서드 `sound`와 `speak`을 정의합니다. `new Dog()`는 클래스 `Dog`의 <a id="g-object"></a>**객체**(object)를 만듭니다.
- `Dog extends Animal`은 `Dog`가 `Animal`을 <a id="g-inheritance"></a>**상속**(inheritance)한다는 뜻입니다. `Dog`는 `speak`을 정의하지 않았지만 `Animal`의 `speak`을 물려받습니다. 이때 `Dog`를 `Animal`의 <a id="g-subclass"></a>**서브클래스**(subclass), `Animal`을 `Dog`의 <a id="g-superclass"></a>**슈퍼클래스**(superclass)라고 합니다.
- `Dog`는 `sound`를 다시 정의합니다. 이것을 메서드 <a id="g-override"></a>**오버라이드**(override)라고 합니다.
- `a.speak()`는 `Animal`의 `speak`을 실행하지만, 그 안의 `sound()`는 `Animal`의 것이 아니라 `Dog`의 것을 부릅니다. 실행 중에 객체의 실제 클래스를 보고 어떤 메서드를 실행할지 정하기 때문입니다. 이것을 <a id="g-dynamic-dispatch"></a>**동적 디스패치**(dynamic dispatch)라고 합니다.
- `(Dog) o`와 `(String) o`는 <a id="g-cast"></a>**캐스트**(cast)입니다. `Object` 타입의 식을 더 구체적인 타입으로 바꾸어 달라는 요구이고, 실제로 그 타입의 객체인지는 실행 중에 검사합니다. `o`는 실제로 `Dog` 객체이므로 첫 번째 캐스트는 성공하고, 두 번째 캐스트는 `ClassCastException`을 던집니다.

`Animal a = new Dog()`가 허용되는 이유는 `Dog`가 `Animal`의 서브타입이기 때문입니다. 이것은 [서브타입 다형성](./subtype-polymorphism.md)에서 본 서브타입 다형성 그대로입니다. 그런데 무엇이 무엇의 서브타입인지를 정하는 방식이 STFAE와 다릅니다.

### 이름으로 정하는 서브타입

STFAE에서는 레코드 타입의 **모양**, 즉 어떤 필드가 어떤 타입으로 있는지가 서브타입 관계를 정했습니다. `{a: Number, b: Number}`는 필드 `a`를 가지고 있으므로 `{a: Number}`의 서브타입이고, 이 사실은 누가 따로 선언하지 않아도 타입의 구조만 보고 알 수 있습니다. 이런 방식을 <a id="g-structural-subtyping"></a>**구조로 정하는 서브타입**(structural subtyping)이라고 합니다.

Java는 다릅니다.

```java
// Java
class Point { int x; int y; }
class Size  { int x; int y; }

Point p = new Size();     // error: incompatible types: Size cannot be converted to Point
```

`Point`와 `Size`는 필드가 똑같지만 서로 서브타입이 아닙니다. Java에서 `C`가 `D`의 서브타입이 되는 것은 `C`가 `extends D`라고 **선언했을 때**(그리고 그것을 이어 붙인 경우)뿐입니다. 타입의 이름과 선언된 관계만으로 서브타입을 정하는 이 방식을 <a id="g-nominal-subtyping"></a>**이름으로 정하는 서브타입**(nominal subtyping)이라고 합니다.

왜 굳이 이름으로 정할까요? 몇 가지 이유가 있습니다.

- **의도를 드러냅니다.** 화면 좌표와 크기는 우연히 같은 모양일 뿐 섞어 쓰면 안 되는 개념입니다. 이름으로 정하면 프로그래머가 허락한 관계만 서브타입이 됩니다.
- **검사가 쉽습니다.** 서브타입 검사가 슈퍼클래스를 따라 올라가며 이름을 비교하는 일로 바뀝니다. 재귀적인 타입이 얽혀도 구조를 끝없이 펼칠 필요가 없습니다.
- **구현이 효율적입니다.** 서브클래스의 객체는 슈퍼클래스의 필드를 같은 위치에 가지도록 만들 수 있어서, 필드와 메서드를 고정된 위치에서 찾을 수 있습니다.

> **생각해 보기.** STFAE의 레코드 타입 `{x: Number, y: Number}`로 `Point`와 `Size`를 표현하면 둘은 같은 타입이 됩니다. 이름으로 정하는 서브타입이 막아 주는 실수와, 반대로 이름으로 정하는 서브타입 때문에 불편해지는 경우를 하나씩 떠올려 보세요.

이제 클래스, 상속, 오버라이드, 동적 디스패치, 캐스트, 그리고 이름으로 정하는 서브타입을 모두 갖춘 가장 작은 언어를 만들어 봅시다.

## FJ: Featherweight Java

FJ(Featherweight Java)는 1999년 Igarashi, Pierce, Wadler가 발표한 Java의 핵심 계산 체계(core calculus)입니다. 람다 계산이 함수형 언어의 핵심만 남긴 것처럼, FJ는 Java에서 클래스와 관련된 핵심만 남깁니다. 얼마나 작은지 보면 놀랄 정도입니다.

- 수, 불리언, 문자열이 없습니다. 값은 오직 객체뿐입니다.
- 대입이 없습니다. 필드는 생성자에서 한 번 정해지면 바뀌지 않습니다. 그래서 FJ는 순수 함수형 언어입니다.
- 식은 다섯 가지뿐입니다. 변수, 필드 접근, 메서드 호출, 객체 생성, 캐스트입니다. `this`는 특별한 변수로 취급합니다.
- 인터페이스, 오버로딩, 정적 메서드, 예외, `super.m()` 호출 같은 것은 모두 없습니다.

STFAE와 비교하면, 레코드 값을 객체로, 레코드 타입을 클래스 이름으로, 구조로 정하는 서브타입을 `extends`로 선언한 서브타입으로 바꾸고, 함수 대신 메서드를 둔 언어라고 볼 수 있습니다. 대신 이 장에서는 이전 장들의 언어를 확장하지 않고 FJ를 새로 정의합니다. 수도 람다도 없는 언어이기 때문입니다.

### 예제 프로그램

FJ 프로그램은 클래스 선언들과 그 뒤에 오는 하나의 식으로 이루어집니다. FJ 논문에 나오는 고전적인 예제를 봅시다.

```fj
/* FJ */
class A extends Object {
  A() { super(); }
}
class B extends Object {
  B() { super(); }
}
class Pair extends Object {
  Object fst;
  Object snd;
  Pair(Object fst, Object snd) {
    super(); this.fst = fst; this.snd = snd;
  }
  Pair setfst(Object newfst) {
    return new Pair(newfst, this.snd);
  }
}

new Pair(new A(), new B()).setfst(new B())   // new Pair(new B(), new B())
```

`A`와 `B`는 필드도 메서드도 없는 클래스입니다. 수가 없는 FJ에서는 이런 클래스의 객체가 "서로 구별되는 값" 역할을 합니다. `Pair`는 두 필드 `fst`와 `snd`를 가진 쌍이고, 메서드 `setfst`는 첫 번째 필드만 바꾼 **새** 쌍을 돌려줍니다. 대입이 없으니 기존 객체를 고칠 수 없기 때문입니다.

FJ 프로그램은 모두 그대로 올바른 Java 프로그램이기도 합니다. 그래서 몇 가지 Java의 규칙이 FJ에도 그대로 남아 있습니다.

- 모든 클래스는 슈퍼클래스를 반드시 `extends`로 적습니다. 맨 꼭대기에는 미리 정의된 클래스 `Object`가 있습니다.
- 모든 클래스에는 생성자(constructor)가 정확히 하나 있고, 그 모양이 정해져 있습니다. 슈퍼클래스의 필드를 받아 `super(...)`에 넘기고, 자기 클래스에서 선언한 필드를 받아 `this.f = f;`로 초기화합니다.
- 메서드 몸통은 `return e;` 하나뿐입니다.
- 필드는 항상 `this.snd`처럼 받는 객체를 적어서 접근합니다. Java처럼 `snd`라고만 쓸 수는 없습니다.

생성자의 모양이 필드 선언으로부터 완전히 정해지므로 생성자는 사실 아무 정보도 더하지 않습니다. 그래도 FJ가 생성자를 남겨 둔 이유는 FJ 프로그램이 그대로 Java 프로그램이 되게 하려는 것입니다.

### 구체 문법

FJ의 구체 문법(concrete syntax)은 다음과 같습니다.

```bnf
<program> ::= <class>* <expr>
<class>   ::= "class" <cname> "extends" <cname> "{" <field>* <ctor> <method>* "}"
<field>   ::= <cname> <id> ";"
<ctor>    ::= <cname> "(" [<cname> <id>]*{","} ")" "{"
                "super" "(" [<id>]*{","} ")" ";"
                ["this" "." <id> "=" <id> ";"]*
              "}"
<method>  ::= <cname> <id> "(" [<cname> <id>]*{","} ")" "{" "return" <expr> ";" "}"
<expr>    ::= <id>                                   // including `this`
            | <expr> "." <id>                        // field access
            | <expr> "." <id> "(" [<expr>]*{","} ")" // method invocation
            | "new" <cname> "(" [<expr>]*{","} ")"   // object creation
            | "(" <cname> ")" <expr>                 // cast
            | "(" <expr> ")"
```

`<cname>`은 클래스 이름입니다. Java와 마찬가지로 캐스트는 필드 접근이나 메서드 호출보다 약하게 결합합니다. 즉 `(Pair) e.fst`는 `((Pair) e).fst`가 아니라 `(Pair) (e.fst)`입니다.

### 추상 문법

수식에서는 길이가 같은 목록을 줄여 쓰기 위해 윗줄을 씁니다. \\(\overline{e}\\)는 \\(e_1, \ldots, e_n\\)을, \\(\overline{C}\ \overline{f}\\)는 \\(C_1\ f_1, \ldots, C_n\ f_n\\)을, \\(\mathtt{this}.\overline{f} = \overline{f};\\)는 \\(\mathtt{this}.f_1 = f_1; \ldots; \mathtt{this}.f_n = f_n;\\)을 뜻합니다. 클래스 이름은 \\(A, B, C, D, E\\), 필드 이름은 \\(f, g\\), 메서드 이름은 \\(m\\), 변수는 \\(x\\)로 씁니다.

\\[
\begin{array}{lrcll}
\text{Classes} & L & \mathtt{::=} & \mathtt{class}\ C\ \mathtt{extends}\ D\ \\{\overline{C}\ \overline{f};\ K\ \overline{M}\\} \\\\
\text{Constructors} & K & \mathtt{::=} & C(\overline{C}\ \overline{f})\ \\{\mathtt{super}(\overline{f});\ \mathtt{this}.\overline{f} = \overline{f};\\} \\\\
\text{Methods} & M & \mathtt{::=} & C\ m(\overline{C}\ \overline{x})\ \\{\mathtt{return}\ e;\\} \\\\
\text{Expressions} & \mathbb{E} \ni e & \mathtt{::=} & x & (\texttt{Id}) \\\\
& & \mid & e.f & (\texttt{Field}) \\\\
& & \mid & e.m(\overline{e}) & (\texttt{Invoke}) \\\\
& & \mid & \mathtt{new}\ C(\overline{e}) & (\texttt{New}) \\\\
& & \mid & (C)\ e & (\texttt{Cast})
\end{array}
\\]

FJ에는 따로 타입의 문법이 없습니다. **타입은 클래스 이름 그 자체입니다.** 이것이 이름으로 정하는 서브타입의 출발점입니다. STFAE의 \\(\\{a : \mathtt{num}\\}\\) 같은 구조를 가진 타입은 없고, \\(\mathtt{Pair}\\), \\(\mathtt{Object}\\) 같은 이름만 있습니다.

Scala로는 다음과 같이 표현합니다.

```scala
type ClassName = String

enum Expr:
  case Id(name: String)                                     // x (including `this`)
  case Field(obj: Expr, field: String)                      // e.f
  case Invoke(obj: Expr, method: String, args: List[Expr])  // e.m(e, ..., e)
  case New(cls: ClassName, args: List[Expr])                // new C(e, ..., e)
  case Cast(cls: ClassName, expr: Expr)                     // (C) e

case class Ctor(
  name: ClassName,
  params: List[(String, ClassName)],
  superArgs: List[String],
  assigns: List[(String, String)],
)
case class Method(
  retTy: ClassName,
  name: String,
  params: List[(String, ClassName)],
  body: Expr,
)
case class ClassDecl(
  name: ClassName,
  parent: ClassName,
  fields: List[(String, ClassName)],
  ctor: Ctor,
  methods: List[Method],
)
case class Program(classes: List[ClassDecl], main: Expr)
```

필드와 매개변수는 이전 장들의 `Fun(param, paramTy, body)`처럼 (이름, 타입) 쌍으로 적었습니다. 필드와 매개변수는 순서가 중요하므로 `Map`이 아니라 `List`로 들고 있습니다. 생성자의 `assigns`는 `this.f = x;`들을 `(f, x)` 쌍의 목록으로 나타냅니다.

### 클래스 테이블

FJ의 식은 혼자서는 의미가 없습니다. `new Pair(...)`가 무슨 필드를 갖는지, `e.setfst(...)`가 무엇을 실행하는지는 클래스 선언을 보아야 알 수 있습니다. 그래서 프로그램의 클래스 선언들을 클래스 이름에서 클래스 선언으로 가는 유한 부분 함수로 모아 두고, 이를 <a id="g-class-table"></a>**클래스 테이블**(class table) \\(\mathit{CT}\\)라고 부릅니다.

\\[
\begin{array}{lcll}
\text{Class Tables} & \mathit{CT} & \in \mathbb{C} \xrightarrow{\text{fin}} \mathbb{L} & (\texttt{ClassTable})
\end{array}
\\]

```scala
type ClassTable = Map[ClassName, ClassDecl]
```

클래스 테이블은 프로그램 전체에서 고정되어 있습니다. 그래서 이 장의 모든 규칙은 하나의 \\(\mathit{CT}\\)를 바탕에 깔고 있다고 생각하며, 규칙에 \\(\mathit{CT}\\)를 따로 적지 않습니다. Scala 구현에서도 모든 함수를 `class FJ(ct: ClassTable)` 안에 두어, 각 함수가 `ct`를 그냥 쓸 수 있게 합니다.

FJ는 클래스 테이블이 다음 조건을 만족한다고 가정합니다.

1. \\(\mathtt{Object}\\)는 \\(\mathit{CT}\\)에 없습니다. 필드도 메서드도 없는 미리 정의된 클래스입니다.
2. \\(\mathit{CT}\\)에 나오는 모든 클래스 이름(슈퍼클래스, 필드 타입, 메서드의 매개변수·반환 타입, 식 안의 클래스)은 \\(\mathtt{Object}\\)이거나 \\(\mathit{CT}\\)에 정의되어 있습니다.
3. 상속 관계에 순환이 없습니다. `class A extends B`와 `class B extends A`를 함께 쓸 수는 없습니다.
4. 한 클래스의 필드 이름은 슈퍼클래스들의 필드 이름을 포함해 모두 서로 다르고, 한 클래스 안의 메서드 이름도 서로 다릅니다.

순환이 없고 슈퍼클래스가 하나뿐이므로, 클래스들은 \\(\mathtt{Object}\\)를 뿌리로 하는 나무를 이룹니다. 이 장에서 쓸 예제 클래스들을 모두 모아 그리면 다음과 같습니다. (`Triple`, `Animal`, `Dog`, `Bark`는 곧 등장합니다.)

<div style="text-align:center">
<svg viewBox="0 0 620 240" width="100%" style="max-width: 600px" role="img" aria-label="클래스 계층: Object 아래에 A, B, Pair, Animal, Bark가 있고, Pair 아래에 Triple, Animal 아래에 Dog가 있다. 화살표는 서브클래스에서 슈퍼클래스로 향한다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="classes-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="260" y="14" width="80" height="32" rx="4" fill="#2a408e"/>
<text x="300" y="35" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14" fill="#fff">Object</text>
<rect x="30" y="104" width="80" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="125" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">A</text>
<rect x="140" y="104" width="80" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="180" y="125" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">B</text>
<rect x="260" y="104" width="80" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="125" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Pair</text>
<rect x="380" y="104" width="80" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="420" y="125" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Animal</text>
<rect x="500" y="104" width="80" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="540" y="125" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Bark</text>
<rect x="260" y="184" width="80" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="205" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Triple</text>
<rect x="380" y="184" width="80" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="420" y="205" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Dog</text>
<polyline points="70,104 280,48" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#classes-1)"/>
<polyline points="180,104 288,48" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#classes-1)"/>
<polyline points="300,104 300,48" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#classes-1)"/>
<polyline points="420,104 312,48" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#classes-1)"/>
<polyline points="540,104 320,48" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#classes-1)"/>
<polyline points="300,184 300,138" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#classes-1)"/>
<polyline points="420,184 420,138" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#classes-1)"/>
<text x="480" y="205" text-anchor="start" font-size="13">C → D: C extends D</text>
</svg>
</div>

### 서브타입 관계

FJ의 서브타입 관계 \\(C <: D\\)는 클래스 테이블의 `extends` 선언에서 나옵니다. 규칙은 세 개뿐입니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{S-Refl}$}
\UnaryInfC{$C <: C$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$C <: D$}
\AxiomC{$D <: E$}
\LeftLabel{$\texttt{S-Trans}$}
\BinaryInfC{$C <: E$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\mathit{CT}(C) = \mathtt{class}\ C\ \mathtt{extends}\ D\ \\{\ldots\\}$}
\LeftLabel{$\texttt{S-Extends}$}
\UnaryInfC{$C <: D$}
\end{prooftree}
\\]

반사성(reflexivity)과 추이성(transitivity)은 STFAE와 같고, 새로운 규칙은 \\(\texttt{S-Extends}\\) 하나입니다. "\\(C\\)가 \\(D\\)를 상속한다고 선언했으면 \\(C\\)는 \\(D\\)의 서브타입이다." STFAE의 레코드 규칙처럼 필드의 모양을 들여다보는 규칙은 없습니다. 그래서 앞의 그림에서 화살표를 따라 위로 올라갈 수 있는 클래스끼리만 서브타입 관계가 성립합니다. 예를 들어 \\(\mathtt{Dog} <: \mathtt{Animal} <: \mathtt{Object}\\)이고 \\(\mathtt{Triple} <: \mathtt{Pair}\\)이지만, \\(\mathtt{A}\\)와 \\(\mathtt{B}\\)는 어느 쪽으로도 서브타입이 아닙니다.

STFAE에서는 추이성 규칙의 중간 타입 \\(\tau'\\)을 어떻게 고를지가 문제였습니다. FJ에서는 쉽습니다. 슈퍼클래스가 하나뿐이므로 \\(C\\)에서 시작해 `extends`를 따라 올라가며 \\(D\\)를 만나는지 보면 됩니다. \\(\mathtt{Object}\\)에 닿을 때까지 \\(D\\)를 못 만나면 서브타입이 아닙니다.

```scala
def isSubclass(c: ClassName, d: ClassName): Boolean =
  c == d || (c != "Object" && isSubclass(ct(c).parent, d))
```

순환이 없다는 가정 덕분에 이 재귀는 반드시 끝납니다.

> **생각해 보기.** FJ에는 최상위 타입이 있을까요? 최하위 타입은요? \\(\mathtt{Object}\\)는 어떤 역할을 하는지, 그리고 STFAE의 \\(\bot\\)에 해당하는 타입이 FJ에 없다는 점이 Java의 `null`과 어떻게 관련되는지 생각해 보세요.

## 인터프리터와 자연 의미

이전 장들과 마찬가지로 환경을 쓰는 인터프리터와 자연 의미 \\(\sigma \vdash e \Rightarrow v\\)를 정의합니다.

```scala
def interp(expr: Expr, env: Env): Value = ???
```

FJ 논문은 식을 한 단계씩 고쳐 쓰는 작은 걸음 의미(small-step semantics)와 치환으로 FJ를 정의합니다. 이 장에서는 이 책의 다른 장들과 같은 방식으로, 환경을 쓰는 큰 걸음 의미인 자연 의미로 정의합니다. 두 방식은 같은 결과를 냅니다. 둘의 차이가 드러나는 곳이 딱 한 군데 있는데, 뒤의 [엉뚱한 캐스트](#엉뚱한-캐스트는-왜-있는가)에서 다룹니다.

### 객체 값

FJ의 값은 객체 하나뿐입니다. 객체는 클래스 이름과 필드 값들의 목록으로 이루어지고, 객체를 만든 식의 모양 그대로 \\(\mathtt{new}\ C(\overline{v})\\)라고 씁니다. 환경은 변수(\\(\mathtt{this}\\) 포함)에서 값으로 가는 유한 부분 함수입니다.

\\[
\begin{array}{lrcll}
\text{Values} & \mathbb{V} \ni v & \mathtt{::=} & \mathtt{new}\ C(\overline{v}) & (\texttt{ObjV}) \\\\
\text{Environments} & \sigma & \in & \mathbb{X} \xrightarrow{\text{fin}} \mathbb{V} & (\texttt{Env})
\end{array}
\\]

```scala
enum Value:
  case ObjV(cls: ClassName, fields: List[Value])

type Env = Map[String, Value]
```

<a id="g-object-value"></a>**객체 값**(object value)에는 필드 이름이 없고 값만 순서대로 들어 있다는 점에 주목하세요. 어느 위치가 어느 필드인지는 클래스 테이블을 보고 알아냅니다. 클로저도 없습니다. 메서드는 객체 안에 들어 있지 않고 클래스 테이블에 있으며, 메서드 몸통에 나올 수 있는 변수는 매개변수와 \\(\mathtt{this}\\)뿐이므로 환경을 붙잡아 둘 필요가 없습니다.

### 필드 찾기

클래스 \\(C\\)의 객체가 가지는 필드는 \\(C\\)에서 선언한 필드만이 아닙니다. 슈퍼클래스들의 필드를 모두 물려받습니다. 보조 함수(helper function) \\(\mathit{fields}(C)\\)는 클래스 \\(C\\)의 모든 필드를 (타입, 이름) 목록으로 돌려줍니다. 정의는 추론 규칙으로 씁니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Fields-Object}$}
\UnaryInfC{$\mathit{fields}(\mathtt{Object}) = \bullet$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\mathit{CT}(C) = \mathtt{class}\ C\ \mathtt{extends}\ D\ \\{\overline{C}\ \overline{f};\ K\ \overline{M}\\}$}
\AxiomC{$\mathit{fields}(D) = \overline{D}\ \overline{g}$}
\LeftLabel{$\texttt{Fields-Class}$}
\BinaryInfC{$\mathit{fields}(C) = \overline{D}\ \overline{g}, \overline{C}\ \overline{f}$}
\end{prooftree}
\\]

\\(\bullet\\)는 빈 목록입니다. 슈퍼클래스의 필드가 **앞에**, 자기 클래스에서 선언한 필드가 **뒤에** 옵니다. 예를 들어 `Pair`를 상속해 필드 하나를 더한 `Triple`을 생각해 봅시다.

```fj
/* FJ */
class Triple extends Pair {
  Object thd;
  Triple(Object fst, Object snd, Object thd) {
    super(fst, snd); this.thd = thd;
  }
}
```

\\(\mathit{fields}(\mathtt{Triple}) = \mathtt{Object}\ \mathtt{fst}, \mathtt{Object}\ \mathtt{snd}, \mathtt{Object}\ \mathtt{thd}\\)입니다. 생성자는 슈퍼클래스의 필드 `fst`, `snd`를 먼저 받아 `super(fst, snd)`로 넘기고, 자기 필드 `thd`를 받아 초기화합니다. 그래서 생성자 매개변수의 순서가 곧 \\(\mathit{fields}\\)의 순서이고, 객체 값의 필드 순서이기도 합니다.

<div style="text-align:center">
<svg viewBox="0 0 620 230" width="100%" style="max-width: 600px" role="img" aria-label="Triple은 Pair를 상속한다. fields(Triple)은 fields(Pair)인 fst, snd 뒤에 Triple에서 선언한 thd를 붙인 것이고, new Triple(new A(), new B(), new A())의 필드 값도 같은 순서로 놓인다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="classes-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="20" y="20" width="180" height="78" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="34" y="44" font-family="ui-monospace, Menlo, monospace" font-size="14" font-weight="bold">class Pair</text>
<text x="34" y="68" font-family="ui-monospace, Menlo, monospace" font-size="14">Object fst;</text>
<text x="34" y="88" font-family="ui-monospace, Menlo, monospace" font-size="14">Object snd;</text>
<rect x="20" y="146" width="180" height="58" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="34" y="170" font-family="ui-monospace, Menlo, monospace" font-size="14" font-weight="bold">class Triple</text>
<text x="34" y="194" font-family="ui-monospace, Menlo, monospace" font-size="14">Object thd;</text>
<polyline points="110,146 110,100" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#classes-2)"/>
<text x="120" y="128" font-size="13">extends</text>
<text x="435" y="38" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">fields(Triple)</text>
<rect x="270" y="50" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="325" y="72" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">fst</text>
<rect x="380" y="50" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="435" y="72" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">snd</text>
<rect x="490" y="50" width="110" height="34" rx="3" fill="#2a408e" stroke="currentColor" stroke-width="1.5"/>
<text x="545" y="72" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14" fill="#fff">thd</text>
<path d="M272,92 v6 h216 v-6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="380" y="116" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">fields(Pair)</text>
<text x="545" y="116" text-anchor="middle" font-size="13">Triple에서 선언</text>
<rect x="270" y="140" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="325" y="162" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">new A()</text>
<rect x="380" y="140" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="435" y="162" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">new B()</text>
<rect x="490" y="140" width="110" height="34" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="545" y="162" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">new A()</text>
<text x="435" y="200" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">new Triple(new A(), new B(), new A())</text>
</svg>
</div>

슈퍼클래스의 필드가 앞에 온다는 사실은 생각보다 중요합니다. `Triple` 객체에서도 `fst`와 `snd`는 `Pair` 객체에서와 **같은 위치**에 있습니다. 그래서 `Pair`의 필드를 읽는 코드는 받은 객체가 실제로 `Triple`이어도 그대로 동작합니다. 실제 언어 구현이 객체를 메모리에 배치할 때도 흔히 이런 방식을 씁니다.

Scala 구현은 규칙을 그대로 옮깁니다.

```scala
def fields(c: ClassName): List[(String, ClassName)] =
  if (c == "Object") Nil
  else fields(ct(c).parent) ++ ct(c).fields
```

### 메서드 몸통 찾기

메서드 호출 \\(e.m(\overline{e})\\)을 계산하려면, 받는 객체의 클래스 \\(C\\)에서 메서드 \\(m\\)의 매개변수와 몸통을 찾아야 합니다. \\(C\\)에 \\(m\\)이 정의되어 있으면 그것을 쓰고, 없으면 슈퍼클래스에서 찾습니다. 보조 함수 \\(\mathit{mbody}(m, C)\\)는 찾은 매개변수 목록과 몸통의 쌍 \\((\overline{x}, e)\\)를 돌려줍니다.

\\[
\begin{prooftree}
\AxiomC{$\mathit{CT}(C) = \mathtt{class}\ C\ \mathtt{extends}\ D\ \\{\overline{C}\ \overline{f};\ K\ \overline{M}\\}$}
\noLine
\UnaryInfC{$B\ m(\overline{B}\ \overline{x})\ \\{\mathtt{return}\ e;\\} \in \overline{M}$}
\LeftLabel{$\texttt{MBody-Class}$}
\UnaryInfC{$\mathit{mbody}(m, C) = (\overline{x}, e)$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\mathit{CT}(C) = \mathtt{class}\ C\ \mathtt{extends}\ D\ \\{\ldots\ \overline{M}\\}$}
\noLine
\UnaryInfC{$m \text{ is not defined in } \overline{M}$}
\AxiomC{$\mathit{mbody}(m, D) = (\overline{x}, e)$}
\LeftLabel{$\texttt{MBody-Super}$}
\BinaryInfC{$\mathit{mbody}(m, C) = (\overline{x}, e)$}
\end{prooftree}
\\]

\\(\mathtt{Object}\\)에는 메서드가 없으므로 \\(\mathit{mbody}(m, \mathtt{Object})\\)를 정하는 규칙은 없습니다. 끝까지 올라가도 못 찾으면 \\(\mathit{mbody}(m, C)\\)는 정의되지 않습니다. Scala에서는 `Option`으로 나타냅니다.

```scala
def mbody(m: String, c: ClassName): Option[(List[String], Expr)] =
  if (c == "Object") None
  else ct(c).methods.find(_.name == m) match
    case Some(Method(_, _, ps, body)) => Some((ps.map(_._1), body))
    case None                         => mbody(m, ct(c).parent)
```

서브클래스에서 먼저 찾고 없을 때만 위로 올라가므로, 서브클래스가 오버라이드한 메서드가 슈퍼클래스의 메서드를 가립니다. 오버라이드는 이 찾는 순서 하나로 설명됩니다.

### 식의 의미

이제 다섯 가지 식의 자연 의미 규칙을 정의합니다. 변수는 환경에서 찾고, 객체 생성은 인자들을 계산해 객체 값을 만듭니다.

\\[
\begin{prooftree}
\AxiomC{$x \in \text{Dom}(\sigma)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma \vdash x \Rightarrow \sigma(x)$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1 \quad \ldots \quad \sigma \vdash e_n \Rightarrow v_n$}
\LeftLabel{$\texttt{New}$}
\UnaryInfC{$\sigma \vdash \mathtt{new}\ C(e_1, \ldots, e_n) \Rightarrow \mathtt{new}\ C(v_1, \ldots, v_n)$}
\end{prooftree}
\\]

필드 접근은 객체를 계산한 뒤, 그 객체의 클래스에서 \\(\mathit{fields}\\)를 구해 \\(f_i\\)의 위치에 있는 값을 꺼냅니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e \Rightarrow \mathtt{new}\ C(v_1, \ldots, v_n)$}
\AxiomC{$\mathit{fields}(C) = C_1\ f_1, \ldots, C_n\ f_n$}
\LeftLabel{$\texttt{Field}$}
\BinaryInfC{$\sigma \vdash e.f_i \Rightarrow v_i$}
\end{prooftree}
\\]

메서드 호출이 가장 중요합니다. 받는 객체 \\(e_0\\)와 인자들을 계산한 뒤, **받는 객체의 실제 클래스** \\(C\\)에서 메서드 몸통을 찾습니다. 그리고 매개변수를 인자 값에, \\(\mathtt{this}\\)를 받는 객체에 묶은 **새** 환경에서 몸통을 계산합니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow v_0 = \mathtt{new}\ C(\ldots)$}
\noLine
\UnaryInfC{$\sigma \vdash \overline{e} \Rightarrow \overline{v}$}
\AxiomC{$\mathit{mbody}(m, C) = (\overline{x}, e)$}
\noLine
\UnaryInfC{$[\overline{x} \mapsto \overline{v}, \mathtt{this} \mapsto v_0] \vdash e \Rightarrow v$}
\LeftLabel{$\texttt{Invoke}$}
\BinaryInfC{$\sigma \vdash e_0.m(\overline{e}) \Rightarrow v$}
\end{prooftree}
\\]

여기서 \\(\sigma \vdash \overline{e} \Rightarrow \overline{v}\\)는 모든 \\(i\\)에 대해 \\(\sigma \vdash e_i \Rightarrow v_i\\)라는 뜻이고, \\(\overline{x}\\)와 \\(\overline{v}\\)의 길이는 같아야 합니다. 몸통은 호출하는 쪽의 환경 \\(\sigma\\)가 아니라 매개변수와 \\(\mathtt{this}\\)만 있는 환경에서 계산합니다. 클로저가 없는 FJ에서는 이것이 정적 범위(static scope)를 지키는 방법입니다.

마지막으로 캐스트 \\((D)\ e\\)는 \\(e\\)를 계산한 뒤, 그 객체의 클래스 \\(C\\)가 \\(D\\)의 서브타입인지 **실행 중에** 확인합니다. 그렇다면 객체를 그대로 돌려줍니다. 캐스트는 값을 바꾸지 않고 검사만 합니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e \Rightarrow \mathtt{new}\ C(\overline{v})$}
\AxiomC{$C <: D$}
\LeftLabel{$\texttt{Cast}$}
\BinaryInfC{$\sigma \vdash (D)\ e \Rightarrow \mathtt{new}\ C(\overline{v})$}
\end{prooftree}
\\]

\\(C <: D\\)가 아니면 적용할 규칙이 없습니다. STFAE의 `exit`처럼 유도 트리를 만들 수 없고, 인터프리터는 Java의 `ClassCastException`에 해당하는 오류를 냅니다.

이 규칙들을 Scala로 옮기면 다음과 같습니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  case Id(x) => env.getOrElse(x, error(s"free identifier: $x"))
  case Field(obj, f) =>
    interp(obj, env) match
      case ObjV(c, vs) =>
        val i = fields(c).indexWhere(_._1 == f)
        if (i < 0 || i >= vs.length) error(s"no such field: $c.$f")
        vs(i)
  case Invoke(obj, m, args) =>
    interp(obj, env) match
      case v @ ObjV(c, _) =>
        val vs = args.map(interp(_, env))
        mbody(m, c) match
          case Some((params, body)) =>
            if (params.length != vs.length) error("arity mismatch")
            interp(body, (params zip vs).toMap + ("this" -> v))
          case None => error(s"no such method: $c.$m")
  case New(c, args) => ObjV(c, args.map(interp(_, env)))
  case Cast(c, e) =>
    interp(e, env) match
      case v @ ObjV(d, _) =>
        if (isSubclass(d, c)) v
        else error(s"ClassCastException: $d cannot be cast to $c")
```

인터프리터에는 오류를 내는 곳이 다섯 군데 있습니다. 자유 변수, 없는 필드, 없는 메서드, 인자 개수 불일치, 그리고 캐스트 실패입니다. 뒤에서 보겠지만, 타입 검사를 통과한 프로그램에서는 이 중 **캐스트 실패만** 일어날 수 있습니다.

> **자주 하는 실수.** `Invoke`에서 메서드 몸통을 `env`에 매개변수를 더한 환경에서 계산하면 안 됩니다. 그러면 호출한 쪽의 지역 변수가 메서드 몸통에 새어 들어가, [식별자](./identifiers.md)에서 본 동적 범위가 되어 버립니다. 몸통에는 매개변수와 `this`만 보여야 합니다.

### 동적 디스패치

메서드 호출 규칙에서 \\(\mathit{mbody}\\)를 찾을 때 쓰는 클래스 \\(C\\)는 식 \\(e_0\\)의 타입이 아니라 \\(e_0\\)을 계산해서 얻은 **객체의 클래스**입니다. 이것이 동적 디스패치입니다. 맨 처음의 Java 예제를 FJ로 옮겨 봅시다. 문자열이 없으므로 소리는 객체로 나타냅니다.

```fj
/* FJ */
class Bark extends Object {
  Bark() { super(); }
}
class Animal extends Object {
  Animal() { super(); }
  Object sound() { return new Object(); }
  Object speak() { return this.sound(); }
}
class Dog extends Animal {
  Dog() { super(); }
  Object sound() { return new Bark(); }
}

new Dog().speak()     // new Bark()
```

`new Dog().speak()`가 어떻게 계산되는지 따라가 봅시다.

1. 받는 객체는 \\(\mathtt{new}\ \mathtt{Dog}()\\)이므로 \\(\mathit{mbody}(\mathtt{speak}, \mathtt{Dog})\\)를 찾습니다. `Dog`에는 `speak`이 없으므로 \\(\texttt{MBody-Super}\\)로 `Animal`에서 찾습니다. 몸통은 `this.sound()`입니다.
2. 몸통을 \\([\mathtt{this} \mapsto \mathtt{new}\ \mathtt{Dog}()]\\)에서 계산합니다. `this.sound()`의 받는 객체는 여전히 \\(\mathtt{new}\ \mathtt{Dog}()\\)이므로, 이번에는 \\(\mathit{mbody}(\mathtt{sound}, \mathtt{Dog})\\)를 찾습니다. `Dog`에 `sound`가 있으므로 그것을 씁니다.
3. 결과는 \\(\mathtt{new}\ \mathtt{Bark}()\\)입니다.

<div style="text-align:center">
<svg viewBox="0 0 620 290" width="100%" style="max-width: 600px" role="img" aria-label="new Dog().speak()의 메서드 찾기: speak은 Dog에 없어서 Animal에서 찾고, 그 몸통의 this.sound()는 this가 Dog 객체이므로 다시 Dog부터 찾아 Dog의 sound를 실행한다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15" fill="currentColor">
<defs><marker id="classes-3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="30" y="16" width="230" height="36" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="44" y="39" font-family="ui-monospace, Menlo, monospace" font-size="14" font-weight="bold">Object</text>
<rect x="30" y="92" width="230" height="86" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="44" y="116" font-family="ui-monospace, Menlo, monospace" font-size="14" font-weight="bold">class Animal</text>
<text x="44" y="142" font-family="ui-monospace, Menlo, monospace" font-size="13">sound() = new Object()</text>
<text x="44" y="166" font-family="ui-monospace, Menlo, monospace" font-size="13">speak() = this.sound()</text>
<rect x="30" y="218" width="230" height="60" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="44" y="242" font-family="ui-monospace, Menlo, monospace" font-size="14" font-weight="bold">class Dog</text>
<text x="44" y="266" font-family="ui-monospace, Menlo, monospace" font-size="13">sound() = new Bark()</text>
<polyline points="145,92 145,54" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#classes-3)"/>
<polyline points="145,218 145,180" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#classes-3)"/>
<path d="M262,240 C330,240 330,162 264,162" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="6 4" marker-end="url(#classes-3)"/>
<circle cx="316" cy="201" r="11" fill="#2a408e"/>
<text x="316" y="206" text-anchor="middle" font-size="13" fill="#fff">1</text>
<path d="M262,166 C420,166 420,262 264,262" fill="none" stroke="#2f4fb8" stroke-width="1.8" marker-end="url(#classes-3)"/>
<circle cx="380" cy="214" r="11" fill="#2a408e"/>
<text x="380" y="219" text-anchor="middle" font-size="13" fill="#fff">2</text>
<text x="430" y="120" font-size="13">1. mbody(speak, Dog):</text>
<text x="430" y="140" font-size="13">Dog에 없어 Animal에서 찾음</text>
<text x="430" y="196" font-size="13">2. this = new Dog()이므로</text>
<text x="430" y="216" font-size="13">mbody(sound, Dog):</text>
<text x="430" y="236" font-size="13">Dog부터 다시 찾음</text>
</svg>
</div>

핵심은 2단계입니다. `speak`의 몸통은 `Animal` 안에 적혀 있지만, 그 안의 `this.sound()`는 `Animal`의 `sound`로 정해져 있지 않습니다. `this`가 가리키는 실제 객체의 클래스부터 다시 찾기 때문에, 슈퍼클래스의 메서드가 아직 존재하지도 않던 서브클래스의 메서드를 부를 수 있습니다. 이렇게 `this`를 통한 호출이 나중에 정의될 서브클래스까지 열려 있는 성질을 <a id="g-open-recursion"></a>**열린 재귀**(open recursion)라고 부릅니다. 객체 지향 설계에서 자주 쓰는 템플릿 메서드 패턴이 바로 이 성질을 이용합니다.

`new Animal().speak()`를 계산하면 2단계에서 \\(\mathit{mbody}(\mathtt{sound}, \mathtt{Animal})\\)을 찾으므로 결과는 \\(\mathtt{new}\ \mathtt{Object}()\\)입니다. 같은 몸통 `this.sound()`가 받는 객체에 따라 다른 메서드를 실행하는 것입니다.

> **생각해 보기.** [재귀 함수](./recursive-functions.md)에서는 함수가 자기 자신을 부르려면 `def`처럼 이름을 미리 묶어 두는 장치가 필요했습니다. FJ에는 그런 장치가 없는데도 메서드가 `this.m(...)`으로 자기 자신을 부를 수 있습니다. 어떤 규칙이 재귀를 가능하게 하는지 찾아보세요.

### 예제

앞의 예제 `new Pair(new A(), new B()).setfst(new B())`의 계산을 유도 트리로 그려 봅시다. 식이 길어지므로 몇 가지를 줄여 씁니다. 받는 식을 \\(e_p = \mathtt{new}\ \mathtt{Pair}(\mathtt{new}\ \mathtt{A}(), \mathtt{new}\ \mathtt{B}())\\), `setfst`의 몸통을 \\(e_b = \mathtt{new}\ \mathtt{Pair}(\mathtt{newfst}, \mathtt{this}.\mathtt{snd})\\), `Pair`의 필드 목록을 \\(F_P = \mathtt{Object}\ \mathtt{fst}, \mathtt{Object}\ \mathtt{snd}\\)라고 합시다. FJ의 값은 객체 생성 식과 모양이 같으므로, \\(e_p\\)의 값 \\(v_0\\)도 \\(\mathtt{new}\ \mathtt{Pair}(\mathtt{new}\ \mathtt{A}(), \mathtt{new}\ \mathtt{B}())\\)입니다. 몸통은 \\(\sigma' = [\mathtt{newfst} \mapsto \mathtt{new}\ \mathtt{B}(), \mathtt{this} \mapsto v_0]\\)에서 계산합니다. 먼저 몸통 안의 필드 접근 \\(\mathtt{this}.\mathtt{snd}\\)의 계산 \\(\mathcal{D}_1\\)입니다.

\\[
\begin{prooftree}
\AxiomC{$\mathtt{this} \in \text{Dom}(\sigma')$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma' \vdash \mathtt{this} \Rightarrow v_0$}
\AxiomC{$\mathit{fields}(\mathtt{Pair}) = F_P$}
\LeftLabel{$\texttt{Field}$}
\BinaryInfC{$\sigma' \vdash \mathtt{this}.\mathtt{snd} \Rightarrow \mathtt{new}\ \mathtt{B}()$}
\end{prooftree}
\\]

이것으로 몸통 \\(e_b\\)의 계산 \\(\mathcal{D}_2\\)를 얻습니다.

\\[
\begin{prooftree}
\AxiomC{$\mathtt{newfst} \in \text{Dom}(\sigma')$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma' \vdash \mathtt{newfst} \Rightarrow \mathtt{new}\ \mathtt{B}()$}
\AxiomC{$\mathcal{D}_1$}
\noLine
\UnaryInfC{$\sigma' \vdash \mathtt{this}.\mathtt{snd} \Rightarrow \mathtt{new}\ \mathtt{B}()$}
\LeftLabel{$\texttt{New}$}
\BinaryInfC{$\sigma' \vdash e_b \Rightarrow \mathtt{new}\ \mathtt{Pair}(\mathtt{new}\ \mathtt{B}(), \mathtt{new}\ \mathtt{B}())$}
\end{prooftree}
\\]

이것을 써서 전체 식의 계산을 유도합니다. 받는 객체와 인자의 계산은 \\(\texttt{New}\\) 규칙만 쓰므로 유도를 생략했습니다.

\\[
\begin{prooftree}
\AxiomC{$\varnothing \vdash e_p \Rightarrow v_0$}
\AxiomC{$\varnothing \vdash \mathtt{new}\ \mathtt{B}() \Rightarrow \mathtt{new}\ \mathtt{B}()$}
\noLine
\UnaryInfC{$\mathit{mbody}(\mathtt{setfst}, \mathtt{Pair}) = (\mathtt{newfst}, e_b)$}
\AxiomC{$\mathcal{D}_2$}
\LeftLabel{$\texttt{Invoke}$}
\TrinaryInfC{$\varnothing \vdash e_p.\mathtt{setfst}(\mathtt{new}\ \mathtt{B}()) \Rightarrow \mathtt{new}\ \mathtt{Pair}(\mathtt{new}\ \mathtt{B}(), \mathtt{new}\ \mathtt{B}())$}
\end{prooftree}
\\]

## 타입 검사기와 타입 규칙

이제 FJ의 타입 시스템을 정의합니다. 타입은 클래스 이름이므로 타입 환경 \\(\Gamma\\)는 변수(\\(\mathtt{this}\\) 포함)에서 클래스 이름으로 가는 유한 부분 함수이고, 타입 판단은 \\(\Gamma \vdash e : C\\)의 모양입니다.

\\[
\begin{array}{lcll}
\text{Type Environments} & \Gamma & \in \mathbb{X} \xrightarrow{\text{fin}} \mathbb{C} & (\texttt{TypeEnv})
\end{array}
\\]

```scala
type TypeEnv = Map[String, ClassName]

def typeCheck(expr: Expr, tenv: TypeEnv): ClassName = ???
```

FJ의 타입 시스템은 STFAE의 알고리즘적 타입 규칙과 같은 방식을 따릅니다. 포섭 규칙(subsumption) 없이, 어떤 타입이 필요한 자리에 다른 타입의 값이 들어가는 곳마다 서브타입 관계를 직접 검사합니다. FJ에서 그런 곳은 메서드 호출의 인자, 객체 생성의 인자, 메서드 몸통의 반환값 세 군데입니다. 서브타입 검사가 실패하면 오류를 내는 함수를 하나 만들어 둡시다.

```scala
def mustSubclass(c: ClassName, d: ClassName): Unit =
  if (!isSubclass(c, d)) error(s"type mismatch: $c </: $d")
```

### 메서드 타입 찾기

메서드 호출의 타입을 정하려면 메서드의 매개변수 타입과 반환 타입이 필요합니다. 보조 함수 \\(\mathit{mtype}(m, C)\\)는 \\(\mathit{mbody}\\)와 똑같이 \\(C\\)부터 위로 올라가며 \\(m\\)을 찾되, 몸통 대신 타입 \\(\overline{B} \to B\\)를 돌려줍니다.

\\[
\begin{prooftree}
\AxiomC{$\mathit{CT}(C) = \mathtt{class}\ C\ \mathtt{extends}\ D\ \\{\overline{C}\ \overline{f};\ K\ \overline{M}\\}$}
\noLine
\UnaryInfC{$B\ m(\overline{B}\ \overline{x})\ \\{\mathtt{return}\ e;\\} \in \overline{M}$}
\LeftLabel{$\texttt{MType-Class}$}
\UnaryInfC{$\mathit{mtype}(m, C) = \overline{B} \to B$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\mathit{CT}(C) = \mathtt{class}\ C\ \mathtt{extends}\ D\ \\{\ldots\ \overline{M}\\}$}
\noLine
\UnaryInfC{$m \text{ is not defined in } \overline{M}$}
\AxiomC{$\mathit{mtype}(m, D) = \overline{B} \to B$}
\LeftLabel{$\texttt{MType-Super}$}
\BinaryInfC{$\mathit{mtype}(m, C) = \overline{B} \to B$}
\end{prooftree}
\\]

```scala
def mtype(m: String, c: ClassName): Option[(List[ClassName], ClassName)] =
  if (c == "Object") None
  else ct(c).methods.find(_.name == m) match
    case Some(Method(retTy, _, ps, _)) => Some((ps.map(_._2), retTy))
    case None                          => mtype(m, ct(c).parent)
```

여기서 \\(\overline{B} \to B\\)는 TFAE의 화살표 타입처럼 보이지만 FJ의 타입은 아닙니다. 메서드는 일급 값이 아니므로, 이것은 단지 메서드의 서명(signature)을 적는 표기일 뿐입니다.

### 변수와 필드 접근

변수의 타입은 타입 환경에서 찾습니다. 필드 접근 \\(e.f_i\\)는 \\(e\\)의 타입 \\(C\\)에서 \\(\mathit{fields}(C)\\)를 구해 \\(f_i\\)의 타입을 꺼냅니다.

\\[
\begin{prooftree}
\AxiomC{$x \in \text{Dom}(\Gamma)$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma \vdash x : \Gamma(x)$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : C$}
\AxiomC{$\mathit{fields}(C) = C_1\ f_1, \ldots, C_n\ f_n$}
\LeftLabel{$\tau\texttt{-Field}$}
\BinaryInfC{$\Gamma \vdash e.f_i : C_i$}
\end{prooftree}
\\]

\\(\tau\texttt{-Field}\\)는 자연 의미의 \\(\texttt{Field}\\) 규칙과 꼭 닮았습니다. 차이는 \\(C\\)가 객체의 실제 클래스가 아니라 식의 **타입**이라는 것입니다. 실행 중에 \\(e\\)의 값은 \\(C\\)의 서브클래스 객체일 수도 있지만, 서브클래스의 \\(\mathit{fields}\\)는 \\(\mathit{fields}(C)\\)를 앞부분으로 포함하므로 \\(f_i\\)는 반드시 있고 타입도 같습니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): ClassName = expr match
  case Id(x) => tenv.getOrElse(x, error(s"free identifier: $x"))
  case Field(obj, f) =>
    val c = typeCheck(obj, tenv)
    fields(c).find(_._1 == f) match
      case Some((_, ty)) => ty
      case None          => error(s"no such field: $c.$f")
  ...
```

### 메서드 호출과 객체 생성

메서드 호출 \\(e_0.m(\overline{e})\\)는 받는 식의 타입 \\(C_0\\)에서 \\(m\\)의 서명 \\(\overline{D} \to C\\)를 찾고, 각 인자의 타입이 대응하는 매개변수 타입의 서브타입인지 확인합니다. 결과 타입은 반환 타입 \\(C\\)입니다. 객체 생성 \\(\mathtt{new}\ C(\overline{e})\\)는 생성자의 매개변수 타입, 즉 \\(\mathit{fields}(C)\\)의 타입들과 인자의 타입을 같은 방식으로 비교합니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : C_0$}
\AxiomC{$\mathit{mtype}(m, C_0) = \overline{D} \to C$}
\AxiomC{$\Gamma \vdash \overline{e} : \overline{C}$}
\AxiomC{$\overline{C} <: \overline{D}$}
\LeftLabel{$\tau\texttt{-Invoke}$}
\QuaternaryInfC{$\Gamma \vdash e_0.m(\overline{e}) : C$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\mathit{fields}(C) = \overline{D}\ \overline{f}$}
\AxiomC{$\Gamma \vdash \overline{e} : \overline{C}$}
\AxiomC{$\overline{C} <: \overline{D}$}
\LeftLabel{$\tau\texttt{-New}$}
\TrinaryInfC{$\Gamma \vdash \mathtt{new}\ C(\overline{e}) : C$}
\end{prooftree}
\\]

\\(\Gamma \vdash \overline{e} : \overline{C}\\)는 모든 \\(i\\)에 대해 \\(\Gamma \vdash e_i : C_i\\)라는 뜻이고, \\(\overline{C} <: \overline{D}\\)는 두 목록의 길이가 같고 모든 \\(i\\)에 대해 \\(C_i <: D_i\\)라는 뜻입니다. 인자를 검사하는 부분이 두 규칙에 공통이므로 함수 하나로 묶습니다.

```scala
def mustArgs(args: List[Expr], tys: List[ClassName], tenv: TypeEnv): Unit =
  if (args.length != tys.length) error("arity mismatch")
  for ((arg, ty) <- args zip tys) mustSubclass(typeCheck(arg, tenv), ty)

def typeCheck(expr: Expr, tenv: TypeEnv): ClassName = expr match
  ...
  case Invoke(obj, m, args) =>
    val c = typeCheck(obj, tenv)
    mtype(m, c) match
      case Some((paramTys, retTy)) =>
        mustArgs(args, paramTys, tenv)
        retTy
      case None => error(s"no such method: $c.$m")
  case New(c, args) =>
    mustExist(c)
    mustArgs(args, fields(c).map(_._2), tenv)
    c
  ...
```

`mustExist(c)`는 `c`가 `Object`이거나 클래스 테이블에 있는지 확인합니다.

\\(\tau\texttt{-Invoke}\\)에서 \\(\mathit{mtype}\\)을 찾는 클래스는 \\(C_0\\), 즉 받는 식의 **타입**입니다. 반면 자연 의미의 \\(\texttt{Invoke}\\)에서 \\(\mathit{mbody}\\)를 찾는 클래스는 받는 객체의 **실제 클래스**입니다. 타입 검사기는 `Animal`의 `sound`를 보고 타입을 정했는데 실행할 때는 `Dog`의 `sound`가 실행되는 것입니다. 이 둘이 어긋나지 않게 해 주는 것이 곧 볼 오버라이드 규칙입니다.

### 캐스트

캐스트 \\((C)\ e\\)의 타입은 언제나 \\(C\\)입니다. 문제는 \\(e\\)의 타입 \\(D\\)와 \\(C\\)의 관계에 따라 실행 중에 무슨 일이 일어나느냐입니다. FJ는 세 경우를 나누어 규칙을 셋 둡니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : D$}
\AxiomC{$D <: C$}
\LeftLabel{$\tau\texttt{-UCast}$}
\BinaryInfC{$\Gamma \vdash (C)\ e : C$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : D$}
\AxiomC{$C <: D$}
\AxiomC{$C \neq D$}
\LeftLabel{$\tau\texttt{-DCast}$}
\TrinaryInfC{$\Gamma \vdash (C)\ e : C$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : D$}
\AxiomC{$C \not<: D$}
\AxiomC{$D \not<: C$}
\AxiomC{$\textit{stupid warning}$}
\LeftLabel{$\tau\texttt{-SCast}$}
\QuaternaryInfC{$\Gamma \vdash (C)\ e : C$}
\end{prooftree}
\\]

- <a id="g-upcast"></a>**업캐스트**(upcast, \\(\tau\texttt{-UCast}\\)): 서브타입을 슈퍼타입으로 바꿉니다. 예를 들어 `(Object) new A()`입니다. \\(e\\)의 값은 \\(D\\)나 그 서브클래스의 객체이므로 \\(C\\)의 서브클래스 객체이기도 하고, 실행 중 검사는 **언제나** 성공합니다.
- <a id="g-downcast"></a>**다운캐스트**(downcast, \\(\tau\texttt{-DCast}\\)): 슈퍼타입을 서브타입으로 바꿉니다. 예를 들어 `(Pair) e.fst`입니다. \\(e\\)의 값이 실제로 \\(C\\)의 서브클래스 객체인지는 실행해 보아야 알 수 있으므로, 성공할 수도 실패할 수도 있습니다.
- <a id="g-stupid-cast"></a>**엉뚱한 캐스트**(stupid cast, \\(\tau\texttt{-SCast}\\)): 서로 관련 없는 클래스로 바꿉니다. 예를 들어 `(A) new B()`입니다. \\(e\\)의 값은 \\(D\\)의 서브클래스 객체인데 \\(D\\)와 \\(C\\)가 관련이 없으므로, 그 객체가 \\(C\\)의 서브클래스일 수는 없습니다. 슈퍼클래스가 하나뿐인 나무에서 \\(D\\)의 서브클래스이면서 \\(C\\)의 서브클래스인 클래스가 있으려면 \\(C\\)와 \\(D\\) 중 하나가 다른 하나의 조상이어야 하기 때문입니다. 따라서 실행 중 검사는 **언제나** 실패합니다.

엉뚱한 캐스트가 언제나 실패한다면 왜 타입 검사를 통과시킬까요? 실제로 Java 컴파일러는 이런 캐스트를 컴파일 오류로 거부합니다. FJ가 이 규칙을 두고 "*stupid warning*", 즉 경고만 내는 이유는 FJ의 작은 걸음 의미에서 타입 안전성을 증명하는 데 이 규칙이 필요하기 때문입니다. 자세한 이야기는 [뒤에서](#엉뚱한-캐스트는-왜-있는가) 합니다. 구현에서도 FJ를 따라 경고만 출력합니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): ClassName = expr match
  ...
  case Cast(c, e) =>
    mustExist(c)
    val d = typeCheck(e, tenv)
    if (!isSubclass(d, c) && !isSubclass(c, d))
      println(s"warning: stupid cast: $d to $c")
    c
```

세 규칙 모두 결론이 같으니, 업캐스트와 다운캐스트를 나누는 것은 타입 검사기에게는 의미가 없습니다. 이 구분은 실행 중 검사가 성공할지를 설명하기 위한 것입니다.

> **생각해 보기.** \\(\tau\texttt{-UCast}\\)가 있으면 업캐스트로 식의 타입을 슈퍼타입으로 바꿀 수 있습니다. 이것은 STFAE에서 알고리즘적이지 않다고 했던 포섭 규칙과 무엇이 다를까요? 업캐스트는 **프로그래머가 식에 직접 적는다**는 점에 주목해 보세요.

### 메서드 검사

식의 타입 규칙만으로는 부족합니다. 클래스 테이블의 메서드 몸통들도 타입이 맞아야 합니다. 판단 \\(M\ \mathtt{OK}\ \mathtt{in}\ C\\)는 "메서드 선언 \\(M\\)이 클래스 \\(C\\) 안에서 올바르다"라는 뜻입니다.

\\[
\small
\begin{prooftree}
\AxiomC{$[\overline{x} : \overline{C}, \mathtt{this} : C] \vdash e : E$}
\AxiomC{$E <: C_0$}
\AxiomC{$\mathit{override}(m, D, \overline{C} \to C_0)$}
\LeftLabel{$\texttt{Method}$}
\TrinaryInfC{$C_0\ m(\overline{C}\ \overline{x})\ \\{\mathtt{return}\ e;\\}\ \mathtt{OK}\ \mathtt{in}\ C$}
\end{prooftree}
\\]

몸통 \\(e\\)는 매개변수들과 \\(\mathtt{this}\\)만 있는 타입 환경에서 검사합니다. \\(\mathtt{this}\\)의 타입은 메서드를 정의한 클래스 \\(C\\)입니다. 몸통의 타입 \\(E\\)는 반환 타입 \\(C_0\\)과 같을 필요 없이 그 서브타입이면 됩니다. 규칙의 \\(D\\)는 \\(C\\)의 슈퍼클래스, 즉 \\(\mathit{CT}(C) = \mathtt{class}\ C\ \mathtt{extends}\ D\ \\{\ldots\\}\\)인 \\(D\\)입니다. 마지막 전제가 <a id="g-override-rule"></a>**오버라이드 규칙**(override rule)입니다.

\\[
\mathit{override}(m, D, \overline{C} \to C_0)
\quad \text{iff} \quad
\mathit{mtype}(m, D) = \overline{D} \to D_0 \text{ 이면 } \overline{C} = \overline{D} \text{ 이고 } C_0 = D_0
\\]

슈퍼클래스 \\(D\\)(와 그 조상들)에 같은 이름의 메서드가 있으면, 오버라이드하는 메서드는 매개변수 타입도 반환 타입도 **정확히 같아야** 합니다. 슈퍼클래스에 그런 메서드가 없으면 새 메서드이므로 아무 조건도 없습니다.

```scala
def checkMethod(md: Method, c: ClassName): Unit =
  val Method(retTy, m, params, body) = md
  params.foreach((_, ty) => mustExist(ty))
  mustExist(retTy)
  val tenv = params.toMap + ("this" -> c)
  mustSubclass(typeCheck(body, tenv), retTy)
  mtype(m, ct(c).parent) match
    case Some((ptys, rty)) =>
      if (ptys != params.map(_._2) || rty != retTy)
        error(s"invalid override: $c.$m")
    case None => ()
```

메서드는 자기를 정의한 클래스 \\(C\\)에서 **한 번만** 검사한다는 점도 눈여겨보세요. 서브클래스가 그 메서드를 물려받아도 다시 검사하지 않습니다. 서브클래스의 객체가 \\(\mathtt{this}\\)가 되더라도 그 객체는 \\(C\\)의 서브타입이므로, \\(\mathtt{this} : C\\)로 검사한 결과가 그대로 유효하기 때문입니다.

### 클래스 검사

클래스 선언이 올바르다는 판단 \\(L\ \mathtt{OK}\\)는 생성자가 정해진 모양인지, 그리고 모든 메서드가 올바른지 확인합니다.

\\[
\small
\begin{prooftree}
\AxiomC{$K = C(\overline{D}\ \overline{g}, \overline{C}\ \overline{f})\ \\{\mathtt{super}(\overline{g});\ \mathtt{this}.\overline{f} = \overline{f};\\}$}
\AxiomC{$\mathit{fields}(D) = \overline{D}\ \overline{g}$}
\AxiomC{$\overline{M}\ \mathtt{OK}\ \mathtt{in}\ C$}
\LeftLabel{$\texttt{Class}$}
\TrinaryInfC{$\mathtt{class}\ C\ \mathtt{extends}\ D\ \\{\overline{C}\ \overline{f};\ K\ \overline{M}\\}\ \mathtt{OK}$}
\end{prooftree}
\\]

생성자는 슈퍼클래스의 모든 필드 \\(\overline{D}\ \overline{g}\\)와 자기 필드 \\(\overline{C}\ \overline{f}\\)를 이 순서대로 받고, 앞의 것은 \\(\mathtt{super}\\)에 넘기고 뒤의 것은 자기 필드에 넣어야 합니다. \\(\overline{M}\ \mathtt{OK}\ \mathtt{in}\ C\\)는 모든 메서드가 \\(C\\) 안에서 올바르다는 뜻입니다.

```scala
def checkClass(cd: ClassDecl): Unit =
  val ClassDecl(c, d, fs, Ctor(k, ps, superArgs, assigns), ms) = cd
  val superFields = fields(d)
  if (k != c) error(s"wrong constructor name: $k")
  if (ps != superFields ++ fs) error(s"wrong constructor parameters: $c")
  if (superArgs != superFields.map(_._1)) error(s"wrong super call: $c")
  if (assigns != fs.map((f, _) => (f, f))) error(s"wrong field initialization: $c")
  ms.foreach(checkMethod(_, c))
```

마지막으로 프로그램 전체는, 클래스 테이블이 앞에서 말한 조건(순환 없음 등)을 만족하고, 모든 클래스 선언이 올바르며, 마지막 식이 빈 타입 환경에서 어떤 타입 \\(C\\)를 가질 때 타입이 맞습니다. 그 \\(C\\)가 프로그램의 타입입니다. 전체 구현은 클래스 테이블 조건을 검사하는 `checkClassTable`, 모든 클래스에 대한 `checkClass`, 그리고 `typeCheck(main, Map())`를 차례로 부릅니다.

## 예제

### 타입 유도

`new Pair(new A(), new B()).setfst(new B())`의 타입을 유도해 봅시다. 앞에서처럼 \\(e_p\\), \\(e_b\\), \\(F_P\\)로 줄여 씁니다. 먼저 받는 식의 타입 \\(\mathcal{D}_3\\)입니다. \\(\mathtt{A}\\)와 \\(\mathtt{B}\\)는 필드가 없으므로 \\(\mathit{fields}\\)가 빈 목록이고, 인자 없이 \\(\tau\texttt{-New}\\)를 쓸 수 있습니다. (안쪽 두 갈래도 \\(\tau\texttt{-New}\\)이지만 이름은 생략했습니다.)

\\[
\begin{prooftree}
\AxiomC{$\mathit{fields}(\mathtt{Pair}) = F_P$}
\noLine
\UnaryInfC{$\mathtt{A} <: \mathtt{Object} \quad \mathtt{B} <: \mathtt{Object}$}
\AxiomC{$\mathit{fields}(\mathtt{A}) = \bullet$}
\UnaryInfC{$\varnothing \vdash \mathtt{new}\ \mathtt{A}() : \mathtt{A}$}
\AxiomC{$\mathit{fields}(\mathtt{B}) = \bullet$}
\UnaryInfC{$\varnothing \vdash \mathtt{new}\ \mathtt{B}() : \mathtt{B}$}
\LeftLabel{$\tau\texttt{-New}$}
\TrinaryInfC{$\varnothing \vdash e_p : \mathtt{Pair}$}
\end{prooftree}
\\]

\\(\mathtt{A} <: \mathtt{Object}\\)는 \\(\texttt{S-Extends}\\)로 바로 얻습니다. 이제 \\(\tau\texttt{-Invoke}\\)로 전체 식의 타입을 얻습니다.

\\[
\begin{prooftree}
\AxiomC{$\mathcal{D}_3$}
\noLine
\UnaryInfC{$\varnothing \vdash e_p : \mathtt{Pair}$}
\AxiomC{$\mathit{mtype}(\mathtt{setfst}, \mathtt{Pair}) = \mathtt{Object} \to \mathtt{Pair}$}
\noLine
\UnaryInfC{$\varnothing \vdash \mathtt{new}\ \mathtt{B}() : \mathtt{B} \quad \mathtt{B} <: \mathtt{Object}$}
\LeftLabel{$\tau\texttt{-Invoke}$}
\BinaryInfC{$\varnothing \vdash e_p.\mathtt{setfst}(\mathtt{new}\ \mathtt{B}()) : \mathtt{Pair}$}
\end{prooftree}
\\]

물론 이 유도가 의미 있으려면 클래스 테이블도 올바라야 합니다. 예를 들어 `setfst`가 \\(\mathtt{Pair}\\) 안에서 올바름을 보이려면, \\(\Gamma = [\mathtt{newfst} : \mathtt{Object}, \mathtt{this} : \mathtt{Pair}]\\)에서 몸통 \\(e_b\\)의 타입을 구합니다. 먼저 필드 접근 \\(\mathcal{D}_4\\)입니다.

\\[
\begin{prooftree}
\AxiomC{$\mathtt{this} \in \text{Dom}(\Gamma)$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma \vdash \mathtt{this} : \mathtt{Pair}$}
\AxiomC{$\mathit{fields}(\mathtt{Pair}) = F_P$}
\LeftLabel{$\tau\texttt{-Field}$}
\BinaryInfC{$\Gamma \vdash \mathtt{this}.\mathtt{snd} : \mathtt{Object}$}
\end{prooftree}
\\]

그러면 \\(\tau\texttt{-New}\\)로 몸통의 타입을 얻습니다. 두 인자의 타입이 모두 \\(\mathtt{Object}\\)이므로 서브타입 조건은 \\(\texttt{S-Refl}\\)로 성립합니다.

\\[
\begin{prooftree}
\AxiomC{$\mathit{fields}(\mathtt{Pair}) = F_P$}
\noLine
\UnaryInfC{$\mathtt{Object} <: \mathtt{Object}$}
\AxiomC{$\mathtt{newfst} \in \text{Dom}(\Gamma)$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma \vdash \mathtt{newfst} : \mathtt{Object}$}
\AxiomC{$\mathcal{D}_4$}
\noLine
\UnaryInfC{$\Gamma \vdash \mathtt{this}.\mathtt{snd} : \mathtt{Object}$}
\LeftLabel{$\tau\texttt{-New}$}
\TrinaryInfC{$\Gamma \vdash e_b : \mathtt{Pair}$}
\end{prooftree}
\\]

몸통의 타입 \\(\mathtt{Pair}\\)는 반환 타입 \\(\mathtt{Pair}\\)의 서브타입이고(\\(\texttt{S-Refl}\\)), \\(\mathtt{Pair}\\)의 슈퍼클래스 \\(\mathtt{Object}\\)에는 `setfst`가 없으므로 오버라이드 규칙도 만족합니다. 따라서 `setfst`는 \\(\mathtt{Pair}\\) 안에서 올바릅니다.

전체 구현으로 확인하면 다음과 같습니다.

```fj
/* FJ */
new Pair(new A(), new B()).setfst(new B())
// type: Pair
// value: new Pair(new B(), new B())
```

### 거부되는 프로그램

이번에는 쌍 안에 쌍을 넣고, 안쪽 쌍의 두 번째 원소를 꺼내 봅시다.

```fj
/* FJ */
new Pair(new Pair(new A(), new B()), new A()).fst.snd
// type error: no such field: Object.snd
```

실행하면 `.fst`의 값이 \\(\mathtt{new}\ \mathtt{Pair}(\mathtt{new}\ \mathtt{A}(), \mathtt{new}\ \mathtt{B}())\\)이므로 `.snd`는 아무 문제 없이 \\(\mathtt{new}\ \mathtt{B}()\\)가 됩니다. 그런데도 타입 검사기는 이 프로그램을 거부합니다. \\(\tau\texttt{-Field}\\)에 따르면 `.fst`의 타입은 \\(\mathit{fields}(\mathtt{Pair})\\)에 적힌 \\(\mathtt{Object}\\)이고, \\(\mathit{fields}(\mathtt{Object})\\)에는 `snd`가 없기 때문입니다. 타입 검사기는 `fst`에 실제로 무엇이 들어 있는지 모르고, 선언된 타입만 봅니다. [타입 시스템](./type-systems.md)에서 말한 거짓 경보입니다.

FJ에는 제네릭이 없으므로 이런 컨테이너에서 꺼낸 값은 언제나 \\(\mathtt{Object}\\) 타입입니다. 이를 쓰려면 프로그래머가 다운캐스트로 "이 값은 사실 `Pair`다"라고 알려 주어야 합니다. 제네릭이 생기기 전(Java 5 이전)의 Java 프로그램이 바로 이렇게 생겼습니다.

```fj
/* FJ */
((Pair) new Pair(new Pair(new A(), new B()), new A()).fst).snd
// type: Object
// value: new B()
```

### 실행 중에 실패하는 캐스트

다운캐스트는 타입 검사기를 설득하는 대신 그 책임을 실행 시간으로 미룹니다. 프로그래머가 틀리면 실행 중에 캐스트가 실패합니다.

```fj
/* FJ */
(B) new Pair(new A(), new B()).fst
// type: B
// run-time error: ClassCastException: A cannot be cast to B
```

`.fst`의 타입은 \\(\mathtt{Object}\\)이고 \\(\mathtt{B} <: \mathtt{Object}\\)이므로 \\(\tau\texttt{-DCast}\\)로 타입 검사를 통과합니다. 하지만 실제 값은 \\(\mathtt{new}\ \mathtt{A}()\\)이고 \\(\mathtt{A} \not<: \mathtt{B}\\)이므로 \\(\texttt{Cast}\\) 규칙을 적용할 수 없습니다.

서브클래스와 오버라이드가 함께 있는 예도 봅시다. `Triple`에서 `setfst`를 오버라이드해 세 번째 필드를 잃지 않게 합니다.

```fj
/* FJ */
class Triple extends Pair {
  Object thd;
  Triple(Object fst, Object snd, Object thd) {
    super(fst, snd); this.thd = thd;
  }
  Pair setfst(Object newfst) {
    return new Triple(newfst, this.snd, this.thd);
  }
}
```

오버라이드 규칙 때문에 반환 타입은 `Pair` 그대로여야 하지만, 몸통의 타입 `Triple`은 `Pair`의 서브타입이므로 괜찮습니다. 이제 다음 두 식을 비교해 봅시다.

```fj
/* FJ */
((Triple) new Triple(new A(), new B(), new A()).setfst(new B())).thd
// type: Object
// value: new A()

((Triple) new Pair(new A(), new B()).setfst(new B())).thd
// type: Object
// run-time error: ClassCastException: Pair cannot be cast to Triple
```

두 식 모두 `setfst`의 결과 타입이 \\(\mathtt{Pair}\\)이므로 `(Triple)`은 다운캐스트이고, 타입 검사를 통과합니다. 첫 번째 식에서는 동적 디스패치로 `Triple`의 `setfst`가 실행되어 결과가 `Triple` 객체이므로 캐스트가 성공합니다. 두 번째 식에서는 `Pair`의 `setfst`가 실행되어 결과가 `Pair` 객체이므로 캐스트가 실패합니다. 타입 검사기는 둘을 구별할 수 없습니다.

## FJ의 타입 안전성

### 무엇을 보장하는가

[타입 시스템](./type-systems.md)에서 타입 안전성(type soundness)을 "타입이 맞는 프로그램은 실행 중에 타입 오류를 일으키지 않는다"로 정의했습니다. 그런데 FJ에서는 타입이 맞는 프로그램도 캐스트에서 실패할 수 있다는 것을 방금 보았습니다. 그래서 FJ의 타입 안전성은 이렇게 말해야 합니다.

> **정리(FJ의 타입 안전성).** 클래스 테이블이 올바르고 \\(\varnothing \vdash e : C\\)이면, \\(e\\)를 실행했을 때 다음 셋 중 하나가 일어납니다.
>
> 1. 값 \\(\mathtt{new}\ D(\overline{v})\\)로 끝나고, 이때 \\(D <: C\\)입니다.
> 2. 다운캐스트(또는 엉뚱한 캐스트)에서 실패합니다.
> 3. 끝나지 않습니다.

1번은 결과 값이 타입 검사기가 예측한 타입(의 서브타입)이라는 뜻입니다. 결과의 클래스가 정확히 \\(C\\)가 아니라 \\(C\\)의 서브타입이라는 점에 주목하세요. `((Pair) new Triple(...)).setfst(new B())`의 타입은 \\(\mathtt{Pair}\\)이지만 결과는 `Triple` 객체였습니다.

2번이 예외로 허용된다는 점이 중요합니다. 인터프리터에 있는 다섯 가지 오류 중 자유 변수, 없는 필드, 없는 메서드, 인자 개수 불일치는 **절대** 일어나지 않고, 일어날 수 있는 것은 캐스트 실패뿐입니다. 캐스트 실패는 프로그래머가 `(C)`라고 적어서 "이 검사를 실행 중에 해 달라"고 명시적으로 요구한 곳에서만 일어납니다. 그래서 캐스트 실패는 타입 오류라기보다, 0으로 나누기처럼 언어가 정해 놓은 실행 중 검사의 결과로 봅니다. Java에서 `ClassCastException`이 정해진 예외로 던져지고 잡을 수도 있는 것과 같습니다.

FJ 논문은 작은 걸음 의미로 이 정리를 두 개의 성질로 나누어 증명합니다. 타입이 맞는 식이 한 걸음 진행하면 타입이 보존되거나 서브타입으로 좁아진다는 <a id="g-preservation"></a>**보존**(preservation, 또는 subject reduction), 그리고 타입이 맞는 식은 값이거나, 한 걸음 더 진행할 수 있거나, 실패하는 캐스트에 막혀 있다는 <a id="g-progress"></a>**진행**(progress)입니다. 진행 성질에 "실패하는 캐스트"라는 예외가 붙는다는 점이 FJ의 특징입니다.

### 왜 성립하는가

전체 증명은 하지 않고, 증명의 뼈대가 되는 세 가지 사실만 살펴봅시다. 모두 "타입 검사기가 본 클래스 \\(C\\)"와 "실행 중의 실제 클래스 \\(C'\\)(\\(C' <: C\\))"가 어긋나지 않는다는 이야기입니다.

1. **필드는 물려받습니다.** \\(C' <: C\\)이면 \\(\mathit{fields}(C)\\)는 \\(\mathit{fields}(C')\\)의 앞부분입니다. \\(\texttt{Fields-Class}\\)가 슈퍼클래스의 필드를 앞에 두고, 필드 이름이 겹치지 않는다고 가정했기 때문입니다. 그래서 \\(\tau\texttt{-Field}\\)가 \\(C\\)에서 찾은 필드 \\(f_i\\)는 실제 객체에도 같은 타입으로 있습니다.
2. **메서드 서명도 물려받습니다.** \\(C' <: C\\)이고 \\(\mathit{mtype}(m, C) = \overline{D} \to D_0\\)이면 \\(\mathit{mtype}(m, C') = \overline{D} \to D_0\\)입니다. \\(C'\\)와 \\(C\\) 사이의 어떤 클래스가 \\(m\\)을 오버라이드하더라도 오버라이드 규칙이 서명을 똑같이 유지하게 하기 때문입니다. 그래서 \\(\tau\texttt{-Invoke}\\)가 \\(C\\)에서 본 서명은 실제로 실행될 메서드의 서명과 같습니다.
3. **실행될 몸통은 타입이 맞습니다.** \\(\mathit{mbody}(m, C') = (\overline{x}, e)\\)이고 \\(\mathit{mtype}(m, C') = \overline{D} \to D_0\\)이면, \\(m\\)을 실제로 정의한 \\(C'\\)의 조상 \\(C''\\)가 있어서 \\([\overline{x} : \overline{D}, \mathtt{this} : C''] \vdash e : E\\)이고 \\(E <: D_0\\)입니다. \\(\texttt{Method}\\) 규칙으로 검사했기 때문입니다. 실제로 \\(\mathtt{this}\\)에 들어가는 객체의 클래스 \\(C'\\)는 \\(C''\\)의 서브타입이고, 인자 값들의 클래스도 \\(\overline{D}\\)의 서브타입이므로, 몸통의 결과는 \\(E\\)의 서브타입, 따라서 \\(D_0\\)의 서브타입 객체가 됩니다.

이 세 사실이 있으면 자연 의미의 유도 트리에 대한 귀납법으로 "환경의 값들이 타입 환경과 맞으면, 계산 결과의 클래스는 식의 타입의 서브타입이다"를 보일 수 있습니다. 증명 중에 서브타입 관계가 끊어질 수 있는 곳은 \\(\texttt{Cast}\\) 규칙뿐인데, 그 규칙은 전제에서 \\(C <: D\\)를 직접 검사하므로 결과는 언제나 \\(D\\)의 서브타입입니다. 검사가 실패하면 값이 아예 나오지 않습니다.

### 엉뚱한 캐스트는 왜 있는가

이제 \\(\tau\texttt{-SCast}\\)의 수수께끼를 풀어 봅시다. FJ 논문은 식을 한 걸음씩 고쳐 쓰는 작은 걸음 의미를 씁니다. 캐스트에 대한 규칙은 이렇습니다.

\\[
\begin{prooftree}
\AxiomC{$C <: D$}
\UnaryInfC{$(D)\ (\mathtt{new}\ C(\overline{v})) \rightarrow \mathtt{new}\ C(\overline{v})$}
\end{prooftree}
\\]

그리고 다음 식을 봅시다.

```fj
/* FJ */
(A) (Object) new B()
```

이 식의 타입은 \\(\mathtt{A}\\)입니다. `(Object) new B()`는 업캐스트, 그 결과를 `(A)`로 바꾸는 것은 다운캐스트입니다. 엉뚱한 캐스트는 없습니다. 이제 안쪽 업캐스트를 한 걸음 계산하면 다음 식이 됩니다.

```fj
/* FJ */
(A) new B()
```

이 식은 엉뚱한 캐스트입니다. 만약 \\(\tau\texttt{-SCast}\\)가 없다면 이 식은 타입이 없습니다. 타입이 맞던 식이 한 걸음 진행했더니 타입이 없는 식이 된 것이니, 보존 성질이 깨집니다. 다운캐스트가 실패할 운명이었다는 사실이 이 단계에서 정적으로 드러났을 뿐인데, 타입 시스템이 이 중간 식을 받아 주지 못하는 것입니다. 그래서 FJ는 엉뚱한 캐스트를 "경고와 함께" 타입이 맞는 것으로 인정합니다. 프로그래머가 쓴 원래 프로그램에서는 거부해도 되지만(경고를 오류로 보면 됩니다), 계산 도중에 나타나는 식에서는 받아 주어야 보존 성질을 증명할 수 있기 때문입니다.

우리의 자연 의미는 식을 고쳐 쓰지 않고 환경에 값을 넣어 두므로, 이런 중간 식이 아예 생기지 않습니다. 앞에서 본 증명의 뼈대에도 \\(\tau\texttt{-SCast}\\)는 쓰이지 않았습니다. 그래서 큰 걸음 의미에서는 Java처럼 엉뚱한 캐스트를 거부해도 타입 안전성이 그대로 성립합니다. 의미를 정의하는 방식이 타입 규칙의 모양에까지 영향을 줄 수 있다는 좋은 예입니다.

전체 구현으로 확인해 보면, 두 식 모두 타입 \\(\mathtt{A}\\)를 얻고 실행 중에 같은 이유로 실패합니다. 엉뚱한 캐스트에만 경고가 붙습니다.

```fj
/* FJ */
(A) (Object) new B()
// type: A
// run-time error: ClassCastException: B cannot be cast to A

(A) new B()
// warning: stupid cast: B to A
// type: A
// run-time error: ClassCastException: B cannot be cast to A
```

### 오버라이드 규칙을 느슨하게 하면

FJ의 오버라이드 규칙은 매개변수 타입과 반환 타입이 모두 정확히 같기를 요구합니다. 너무 엄격해 보이지 않나요? 서브클래스의 메서드가 더 좁은 매개변수 타입을 받게 하면 어떨까요? 다음 프로그램을 봅시다.

```fj
/* FJ */
class Eater extends Object {
  Eater() { super(); }
  Object eat(Object x) { return x; }
}
class PairEater extends Eater {
  PairEater() { super(); }
  Object eat(Pair x) { return x.fst; }      // parameter type narrowed
}

((Eater) new PairEater()).eat(new A())
```

`PairEater`의 `eat`은 `Pair`만 받도록 매개변수 타입을 좁혔습니다. 몸통 `x.fst`는 \\(x : \mathtt{Pair}\\)에서 타입이 맞습니다. 마지막 식은 `Eater` 타입의 식에서 `eat`을 부르므로, 타입 검사기는 \\(\mathit{mtype}(\mathtt{eat}, \mathtt{Eater}) = \mathtt{Object} \to \mathtt{Object}\\)를 보고 `new A()`를 인자로 허락합니다. 하지만 실행하면 동적 디스패치로 `PairEater`의 `eat`이 실행되고, \\(x = \mathtt{new}\ \mathtt{A}()\\)에서 `x.fst`를 찾다가 실패합니다.

```fj
/* FJ */
// with the override check:    type error: invalid override: PairEater.eat
// without the override check: type: Object
//                             run-time error: no such field: A.fst
```

캐스트 실패가 아니라 "없는 필드"라는 진짜 타입 오류입니다. 오버라이드 규칙이 없으면 타입 안전성이 깨지는 것입니다. 앞에서 본 두 번째 사실, 즉 "메서드 서명은 서브클래스에서도 같다"가 무너졌기 때문입니다.

이것은 [서브타입 다형성](./subtype-polymorphism.md)의 함수 타입 규칙과 정확히 같은 이야기입니다. 오버라이드하는 메서드는 슈퍼클래스의 메서드 자리에 대신 들어가는 것이므로, 그 서명 \\(\overline{C} \to C_0\\)는 원래 서명 \\(\overline{D} \to D_0\\)의 "서브타입"이어야 합니다. 함수 타입의 서브타입 규칙에 따르면 매개변수는 반변, 반환은 공변이어야 합니다. 매개변수 타입을 좁히는 것은 공변으로 바꾸는 것이니 안전하지 않습니다. 반대로 다음 두 가지 완화는 안전합니다.

- 반환 타입을 서브타입으로 좁히는 것(공변 반환 타입). `Triple`의 `setfst`가 반환 타입을 `Triple`로 적을 수 있게 됩니다.
- 매개변수 타입을 슈퍼타입으로 넓히는 것(반변 매개변수 타입).

FJ는 단순함을 위해 둘 다 허락하지 않습니다. 앞의 증명 뼈대에서 2번 사실을 "서명이 같다" 대신 "서명이 서브타입이다"로 바꾸어야 하기 때문입니다.

> **자주 하는 실수.** 매개변수 타입을 좁히고 싶은 상황은 실제로 자주 생깁니다. `equals(Object o)`를 오버라이드하면서 `equals(Point p)`라고 적는 것이 대표적인 예입니다. Java에서는 이것이 타입 오류가 아니라 이름만 같은 **새 메서드**(오버로딩)가 되어, `Object` 타입으로 부르면 여전히 원래 `equals`가 실행됩니다. `@Override`를 붙여 두면 컴파일러가 이 실수를 잡아 줍니다.

## 실제 언어와 비교

**Java.** FJ는 Java의 부분 언어이므로 FJ의 규칙은 거의 그대로 Java의 규칙입니다. 차이도 있습니다.

- Java는 5부터 공변 반환 타입을 허락합니다. 매개변수 타입은 정확히 같아야 하고, 다르면 앞에서 본 것처럼 오버로딩이 됩니다.
- Java는 클래스 사이의 엉뚱한 캐스트를 컴파일 오류로 거부합니다. 다만 인터페이스로의 캐스트는 다릅니다. `final`이 아닌 클래스 `B`의 식을 인터페이스 `Runnable`로 캐스트하는 것은, `B`의 서브클래스 중 누군가가 `Runnable`을 구현할 수도 있으므로 허락됩니다.
- Java의 <a id="g-interface"></a>**인터페이스**(interface)는 이름으로 정하는 서브타입을 유지하면서 슈퍼타입을 여러 개 가질 수 있게 합니다. 그러면 서브타입 관계는 나무가 아니라 방향 있는 비순환 그래프가 되고, 엉뚱한 캐스트를 판단하는 기준도 앞에서 본 것처럼 복잡해집니다.
- Java의 배열은 공변이라서 `String[]`을 `Object[]`에 넣을 수 있고, 그 대가로 배열에 원소를 쓸 때마다 실행 중 검사를 하며 실패하면 `ArrayStoreException`을 던집니다. 캐스트처럼 "실행 중 검사로 메운 구멍"이 하나 더 있는 셈입니다.
- 앞의 `Pair`처럼 `Object`와 다운캐스트로 컨테이너를 쓰던 불편은 Java 5의 제네릭으로 해결되었습니다. FJ 논문은 FJ에 제네릭을 더한 FGJ(Featherweight Generic Java)도 함께 정의했는데, FGJ는 Java 제네릭의 바탕이 된 GJ를 본뜬 것입니다. 다음 장 [유계 다형성과 변성](./bounded-polymorphism.md)에서 이 이야기를 이어 갑니다.

**Scala와 Kotlin.** 두 언어 모두 클래스와 트레이트(인터페이스)에 대해 이름으로 정하는 서브타입을 씁니다. 메서드 오버라이드에는 `override`를 반드시 적어야 하고, 공변 반환 타입을 허락합니다. 캐스트는 Scala에서 `x.asInstanceOf[C]`, Kotlin에서 `x as C`로 적고 실패하면 `ClassCastException`이 납니다. 하지만 두 언어 모두 캐스트보다 안전한 방법을 권합니다. Scala의 패턴 매칭 `x match { case p: Pair => ... }`과 Kotlin의 `is` 검사 뒤 스마트 캐스트, 실패하면 `null`을 돌려주는 `x as? C`는 "검사"와 "변환"을 하나로 묶어 실패를 값으로 다루게 합니다. 또 Scala 3는 `{ def close(): Unit }` 같은 구조적 타입도 일부 지원해서, 이름으로 정하는 서브타입과 구조로 정하는 서브타입을 섞어 쓸 수 있습니다.

**TypeScript와 Go.** TypeScript는 구조로 정하는 서브타입을 씁니다. 클래스라도 마찬가지입니다.

```typescript
// TypeScript
class Point { constructor(public x: number, public y: number) {} }
class Size  { constructor(public x: number, public y: number) {} }

const p: Point = new Size(1, 2);   // OK: same structure
```

맨 처음 Java 예제에서 거부되었던 대입이 TypeScript에서는 통과합니다. JavaScript의 객체가 원래 필드의 묶음, 즉 레코드에 가깝기 때문에 STFAE식 서브타입이 더 잘 어울리는 것입니다. Go의 인터페이스도 구조로 정합니다. 어떤 타입이 인터페이스의 메서드를 모두 가지고 있으면, `implements` 같은 선언 없이도 그 인터페이스를 구현한 것으로 봅니다.

정리하면, 같은 "서브타입 다형성"이라도 서브타입 관계를 **선언**으로 정하느냐(FJ, Java, Scala, Kotlin) **구조**로 정하느냐(STFAE, TypeScript, Go)에 따라 타입 시스템의 모양과 프로그래밍 습관이 크게 달라집니다.

## 정리

- 객체 지향 언어의 클래스는 필드와 메서드를 묶고, 상속으로 슈퍼클래스의 필드와 메서드를 물려받으며, 오버라이드로 메서드를 다시 정의합니다. 메서드 호출은 받는 객체의 실제 클래스를 보고 실행할 메서드를 정합니다(동적 디스패치).
- STFAE의 서브타입은 타입의 구조로 정하고(구조로 정하는 서브타입), Java와 FJ의 서브타입은 `extends` 선언으로 정합니다(이름으로 정하는 서브타입). FJ의 서브타입 규칙은 반사성, 추이성, \\(\texttt{S-Extends}\\) 셋뿐입니다.
- FJ는 클래스 선언과 다섯 가지 식(변수, 필드 접근, 메서드 호출, 객체 생성, 캐스트)으로 이루어진 Java의 핵심 언어입니다. 타입은 클래스 이름이고, 값은 객체 \\(\mathtt{new}\ C(\overline{v})\\)뿐입니다.
- 클래스 테이블 \\(\mathit{CT}\\) 위에서 보조 함수 \\(\mathit{fields}\\), \\(\mathit{mbody}\\), \\(\mathit{mtype}\\)을 추론 규칙으로 정의합니다. 슈퍼클래스의 필드가 앞에 오고, 메서드는 서브클래스에서 먼저 찾습니다.
- 자연 의미에서 메서드 몸통은 매개변수와 \\(\mathtt{this}\\)만 묶은 환경에서 계산하고, 캐스트는 실행 중에 \\(C <: D\\)를 검사합니다.
- 타입 규칙은 인자와 반환값 자리에서 서브타입을 검사하는 알고리즘적 규칙이고, 캐스트는 업캐스트, 다운캐스트, 엉뚱한 캐스트로 나뉩니다. 메서드는 정의된 클래스에서 \\(\mathtt{this} : C\\)로 한 번 검사하며, 오버라이드는 서명이 정확히 같아야 합니다.
- FJ의 타입 안전성: 타입이 맞는 프로그램은 서브타입의 값으로 끝나거나, 끝나지 않거나, 캐스트에서 실패합니다. 엉뚱한 캐스트 규칙은 작은 걸음 의미에서 보존 성질을 지키려고 있는 것입니다. 오버라이드 규칙을 함부로 느슨하게 하면(매개변수 타입을 좁히면) 타입 안전성이 깨집니다.

## 연습 문제

1. 이 장의 클래스 테이블(`A`, `B`, `Pair`, `Triple`, `Animal`, `Dog`, `Bark`)에서 다음 관계가 성립하는지 판정하고, 성립하면 서브타입 규칙으로 유도해 보세요.
   - \\(\mathtt{Triple} <: \mathtt{Object}\\)
   - \\(\mathtt{Dog} <: \mathtt{Pair}\\)
   - \\(\mathtt{Animal} <: \mathtt{Dog}\\)
2. 다음 FJ 식의 타입을 구하고(또는 왜 거부되는지 설명하고), 타입이 맞으면 실행 결과도 구하세요. 캐스트는 업캐스트, 다운캐스트, 엉뚱한 캐스트 중 무엇인지도 적으세요.
   - `new Triple(new A(), new B(), new A()).setfst(new B()).thd`
   - `((Animal) new Dog()).speak()`
   - `(Dog) new Animal()`
   - `(Pair) new Dog()`
   - `new Pair(new A(), new B()).setfst(new Pair(new A(), new A())).fst.fst`
3. 다음 클래스로 불리언을 표현해 봅시다. `True`와 `False`가 `not`과 `and`를 오버라이드하도록 몸통을 채우고, 각 클래스가 \\(\mathtt{OK}\\)인지 확인하세요. `new True().and(new False().not())`의 결과는 무엇인가요? 조건문이 없는데 어떻게 "경우 나누기"가 가능한지 설명하세요.

   ```fj
   /* FJ */
   class Bool extends Object {
     Bool() { super(); }
     Bool not() { return this; }
     Bool and(Bool b) { return this; }
   }
   class True extends Bool { True() { super(); } /* ??? */ }
   class False extends Bool { False() { super(); } /* ??? */ }
   ```

4. 오버라이드 규칙을 고쳐 공변 반환 타입을 허락해 보세요. 즉 \\(\mathit{mtype}(m, D) = \overline{D} \to D_0\\)이면 \\(\overline{C} = \overline{D}\\)이고 \\(C_0 <: D_0\\)이기만 하면 되도록 바꿉니다. `checkMethod`를 고치고, 앞의 `Triple`에서 `setfst`의 반환 타입을 `Triple`로 적은 프로그램이 타입 검사를 통과하는지 확인하세요. 그리고 "왜 성립하는가"의 세 사실 중 어느 것을 어떻게 고쳐야 타입 안전성 논증이 다시 성립하는지 설명하세요.
5. 큰 걸음 의미를 쓰는 우리 언어에서는 엉뚱한 캐스트를 Java처럼 거부해도 타입 안전성이 성립한다고 했습니다. `typeCheck`의 `Cast` 경우를 고쳐 엉뚱한 캐스트를 타입 오류로 만들어 보세요. 그런 다음 작은 걸음 의미에서는 왜 같은 일을 할 수 없는지 `(A) (Object) new B()`를 예로 설명하세요.
6. 이 장의 Scala 조각들을 모아 FJ의 `typeCheck`와 `interp`를 완성하고, 클래스 테이블 조건(순환 없음, `Object`를 다시 정의하지 않음, 정의되지 않은 클래스 이름 없음, 필드와 메서드 이름 중복 없음)을 검사하는 `checkClassTable`도 구현하세요. 이 장의 모든 예제가 본문에 적힌 대로 동작하는지 확인해 보세요.

## 더 읽을거리

- Atsushi Igarashi, Benjamin C. Pierce, Philip Wadler. "Featherweight Java: A Minimal Core Calculus for Java and GJ." OOPSLA 1999. 확장판은 *ACM Transactions on Programming Languages and Systems* (TOPLAS) 23(3), 2001. FJ와 FGJ를 정의하고 타입 안전성을 증명한 원 논문입니다.
- Benjamin C. Pierce. *Types and Programming Languages*. MIT Press, 2002. 19장 "Case Study: Featherweight Java"가 이 장의 내용을 작은 걸음 의미로 다룹니다. 18장 "Case Study: Imperative Objects"는 클래스와 열린 재귀를 레코드와 참조로 풀어 설명합니다.
- Martín Abadi, Luca Cardelli. *A Theory of Objects*. Springer, 1996. 클래스가 아닌 객체를 기본 단위로 삼는 객체 계산 체계를 다룹니다.
