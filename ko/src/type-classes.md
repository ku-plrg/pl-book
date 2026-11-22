# 타입 클래스

`==`는 수에도, 불에도, 리스트에도 쓸 수 있습니다. 그런데 수 두 개를 비교하는 코드와 리스트 두 개를 비교하는 코드는 전혀 다릅니다. 이름은 하나인데 타입마다 다른 코드가 실행되는 것, 이런 다형성을 어떻게 타입 시스템 안에서 깔끔하게 다룰 수 있을까요? 이 장에서는 Haskell이 처음 도입하고 Scala의 `given`/`using`, Rust의 <a id="g-trait"></a>트레이트(trait)로 이어진 타입 클래스(type class)를 배웁니다. [매개변수 다형성](./parametric-polymorphism.md)의 \\(\mathsf{PTFAE}\\)에 타입 클래스를 더한 언어 \\(\mathsf{TCFAE}\\)를 정의하고, 그 의미를 <a id="g-dictionary-passing"></a>딕셔너리 전달(dictionary passing)이라는 번역으로 정합니다. 타입 검사기가 타입을 검사하면서 동시에 "어느 인스턴스의 코드를 쓸지"를 찾아 프로그램에 끼워 넣는 과정을 규칙과 Scala 코드로 따라가 보고, 마지막으로 <a id="g-coherence"></a>일관성(coherence), 모호성(ambiguity) 같은 실제 언어 설계의 쟁점을 살펴봅니다.

## 임시 다형성

### 같은 이름, 다른 코드

[매개변수 다형성](./parametric-polymorphism.md)에서 다형성의 여러 갈래를 소개했습니다. 매개변수 다형성은 그 장에서, 서브타입 다형성은 [서브타입 다형성](./subtype-polymorphism.md)에서 다루었고, 임시 다형성(ad-hoc polymorphism)이 남아 있습니다.

임시 다형성은 **하나의 이름이 여러 타입에서 쓰이지만, 타입마다 다른 코드로 동작하는** 다형성입니다. 다음과 같은 예가 모두 여기에 속합니다.

- 같음 비교 `==`: 수는 기계어 비교 한 번으로, 문자열은 글자를 하나씩, 리스트는 원소를 하나씩 비교합니다.
- 덧셈 `+`: 정수 덧셈, 실수 덧셈, (어떤 언어에서는) 문자열 이어 붙이기가 모두 `+`입니다.
- 문자열로 바꾸기 `show`(Java의 `toString`): 타입마다 출력 형식이 다릅니다.
- 순서 비교 `compare`: 수는 크기로, 문자열은 사전 순으로 비교합니다.

매개변수 다형성과 비교해 보면 차이가 분명합니다. 항등 함수 `forall[T] (x: T) => x`는 `T`가 무엇이든 **똑같은 코드 하나**가 실행됩니다. 반면 `==`는 타입마다 **다른 코드**가 실행되어야 합니다. "임시(ad hoc)"라는 이름은 타입마다 그때그때 따로 정의한다는 뜻에서 왔습니다.

가장 오래된 해결책은 오버로딩(overloading)입니다. Java에서는 이름이 같고 매개변수 타입이 다른 메서드를 여러 개 정의할 수 있고, 컴파일러가 인자의 정적 타입을 보고 하나를 고릅니다.

```java
// Java
static String show(int n)     { return Integer.toString(n); }
static String show(boolean b) { return b ? "true" : "false"; }

show(42);    // show(int)를 고름
show(true);  // show(boolean)을 고름
```

하지만 오버로딩은 **추상화할 수 없습니다**. "`show`할 수 있는 어떤 타입 `T`에 대해서든 `show`를 두 번 부르는 함수"를 쓰고 싶다고 합시다.

```java
// Java
static <T> String twice(T x) {
  return show(x) + show(x);   // error: no suitable method found for show(T)
}
```

`twice` 안에서 `x`의 타입은 `T`일 뿐이라서 컴파일러는 어느 `show`를 골라야 할지 모릅니다. 오버로딩은 타입이 구체적으로 다 보이는 자리에서만 해소되는 장치이고, 다형 함수 안으로는 들어갈 수 없습니다. 우리가 원하는 것은 "`show`가 정의된 타입이면 무엇이든"이라는 **조건**을 타입에 적고, 그 조건 아래에서 다형 함수를 쓰는 방법입니다.

### 매개변수 다형성으로는 왜 안 될까

\\(\mathsf{PTFAE}\\)로 "같지 않음" 함수 `neq`를 써 봅시다.

```ptfae
/* PTFAE */
val neq = forall[T] (x: T) => (y: T) => ???   // x와 y가 다르면 true
```

`???` 자리에 쓸 수 있는 것이 없습니다. `T`는 아무 타입이나 될 수 있으므로, 몸통 안에서 `x`와 `y`에 대해 할 수 있는 일이 아무것도 없기 때문입니다. `x == y`라고 쓰면 `==`가 수에만 쓸 수 있는 연산이라서 타입 오류가 납니다.

이것은 매개변수 다형성의 **약점이 아니라 본질**입니다. \\(\forall T.T \to T \to \mathtt{bool}\\) 타입의 함수는 `T`가 무엇인지 들여다볼 수 없으므로, 모든 `T`에 대해 똑같은 방식으로 동작해야 합니다. 그래서 이 타입의 함수는 사실상 인자를 무시하고 늘 같은 불 값을 돌려주는 상수 함수뿐입니다. 이런 성질을 <a id="g-parametricity"></a>매개변수성(parametricity)이라고 부르며, 타입만 보고도 함수에 대해 많은 것을 알 수 있게 해 주는 고마운 성질입니다. 하지만 같은 이유로 "타입마다 다르게 동작하는 함수"는 매개변수 다형성만으로는 만들 수 없습니다.

### 서브타입 다형성으로는 왜 안 될까

객체 지향 언어는 이 문제를 서브타입 다형성으로 풉니다. 모든 객체가 `equals`라는 메서드를 갖게 하고, 각 클래스가 자기 방식대로 재정의(override)하는 것입니다. Java의 `Object.equals`가 그렇습니다.

```java
// Java
class Point {
  int x, y;
  @Override public boolean equals(Object o) {
    if (!(o instanceof Point)) return false;   // 실행 중 타입 검사
    Point p = (Point) o;                       // 다운캐스트
    return x == p.x && y == p.y;
  }
}
```

잘 동작하지만 어색한 부분이 있습니다. `equals`의 매개변수 타입이 `Point`가 아니라 `Object`입니다. 슈퍼클래스 `Object`의 메서드를 재정의하려면 매개변수 타입을 그대로 두어야 하기 때문입니다. `equals(Point p)`라고 쓰면 재정의가 아니라 이름만 같은 새 메서드(오버로딩)가 됩니다. [서브타입 다형성](./subtype-polymorphism.md)에서 본 대로 함수 타입은 매개변수 자리에서 반공변이므로, 매개변수 타입을 좁힌 메서드는 원래 메서드의 서브타입이 될 수 없습니다. 그래서 `new Point(1, 2).equals("hello")` 같은 엉뚱한 비교도 타입 검사를 통과하고, 실행 중에 `instanceof`와 캐스트로 다시 확인해야 합니다. 이처럼 같은 타입의 값 **두 개**를 받아야 하는 메서드를 <a id="g-binary-method"></a>이항 메서드(binary method)라고 하는데, 이항 메서드는 서브타입 다형성과 잘 맞지 않기로 유명합니다.

문제는 이것만이 아닙니다.

- **받는 객체가 없는 연산.** "그 타입의 0"을 돌려주는 `zero`나, 문자열을 읽어 그 타입의 값을 만드는 `read`를 생각해 봅시다. 이런 연산은 인자로 그 타입의 값을 받지 않으므로 메서드를 호출할 객체가 없습니다. 어느 코드를 실행할지가 **반환 타입**으로 정해지는 것입니다. 서브타입 다형성은 객체에 붙은 메서드를 찾아가는 방식이라 이런 연산을 표현할 수 없습니다.
- **나중에 덧붙이기.** Java에서 `Integer`가 내가 새로 만든 인터페이스 `Show`를 구현하게 할 방법은 없습니다. 클래스가 어떤 인터페이스를 구현하는지는 클래스를 정의할 때 정해지기 때문입니다.

> **생각해 보기.** Java의 `Comparable<T>` 인터페이스는 `compareTo(T o)`처럼 매개변수 타입을 `T`로 두어 이항 메서드 문제를 피하려 합니다. `class Point implements Comparable<Point>`처럼 쓰지요. 이 방법으로 위의 세 문제 가운데 무엇이 해결되고 무엇이 남을까요? 이런 타입 매개변수의 쓰임은 [유계 다형성과 변성](./bounded-polymorphism.md)에서 자세히 다룹니다.

### 타입 클래스

타입 클래스는 Wadler와 Blott가 1989년 논문 "How to make ad-hoc polymorphism less ad hoc"에서 제안한 방법으로, Haskell에 처음 들어갔습니다. Haskell의 `Eq` 클래스를 봅시다. (실제 표준 라이브러리의 `Eq`에는 `/=`도 있지만 여기서는 `==`만 둡니다.)

```haskell
-- Haskell
class Eq a where
  (==) :: a -> a -> Bool

instance Eq Bool where
  True  == True  = True
  False == False = True
  _     == _     = False

instance Eq a => Eq [a] where
  []     == []     = True
  (x:xs) == (y:ys) = x == y && xs == ys
  _      == _      = False

elem :: Eq a => a -> [a] -> Bool
elem _ []     = False
elem x (y:ys) = x == y || elem x ys
```

네 가지 요소가 있습니다.

1. <a id="g-class-declaration"></a>**클래스 선언**(class declaration) `class Eq a where ...`는 타입 매개변수 `a`에 대한 <a id="g-method-signature"></a>메서드 시그니처(method signature)들의 묶음입니다. "`a`가 `Eq`에 속한다는 것은 `a -> a -> Bool` 타입의 `==`가 있다는 뜻이다"라는 약속입니다. 객체 지향의 클래스와는 다른 개념으로, 오히려 "약속을 지키는 타입들의 집합"에 가깝습니다.
2. <a id="g-instance-declaration"></a>**인스턴스 선언**(instance declaration) `instance Eq Bool where ...`은 특정 타입이 그 약속을 어떻게 지키는지, 즉 그 타입의 `==` 코드를 줍니다.
3. `instance Eq a => Eq [a]`처럼 인스턴스에도 조건이 붙을 수 있습니다. "`a`를 비교할 수 있으면 `[a]`도 비교할 수 있다"는 뜻이고, 몸통의 `x == y`가 바로 `a`의 `==`를 씁니다.
4. `elem :: Eq a => a -> [a] -> Bool`의 `Eq a =>`는 타입 제약(type constraint)입니다. `elem`은 `a`가 무엇이든 쓸 수 있지만, `a`가 `Eq`의 인스턴스여야 한다는 조건이 붙습니다. 이렇게 제약이 붙은 타입을 <a id="g-qualified-type"></a>한정 타입(qualified type)이라고 합니다.

`elem (3 :: Int) [1, 2, 3]`이라고 쓰면 컴파일러가 `Eq Int` 인스턴스를, `elem [True] [[False], [True]]`라고 쓰면 `Eq [Bool]`을 알아서 찾습니다. 후자는 `Eq a => Eq [a]`에 `Eq Bool`을 끼워 맞춰 **조립**한 것입니다. 앞에서 Java의 `twice`가 하지 못한 일, 즉 다형 함수 안에서 타입마다 다른 코드를 부르는 일이 여기서는 `Eq a =>`라는 제약 덕분에 가능합니다.

Scala 3에서는 트레이트와 `given`/`using`으로 같은 구조를 씁니다.

```scala
// Scala 3
trait Show[A]:
  def show(a: A): String

given Show[Int] with
  def show(a: Int): String = a.toString

given [A](using s: Show[A]): Show[List[A]] with
  def show(as: List[A]): String = as.map(s.show).mkString("[", ", ", "]")

def display[A](a: A)(using s: Show[A]): String = "<" + s.show(a) + ">"

display(List(1, 2, 3))   // "<[1, 2, 3]>"
```

`trait Show[A]`가 클래스 선언, `given`이 인스턴스 선언, `(using s: Show[A])`가 제약입니다. `display[A: Show](a: A)`처럼 <a id="g-context-bound"></a>문맥 바운드(context bound)로 줄여 쓸 수도 있습니다. Rust에서는 트레이트와 `impl`이 그 역할을 합니다.

```rust
// Rust
trait Show { fn show(&self) -> String; }

impl Show for i32 { fn show(&self) -> String { self.to_string() } }

impl<T: Show> Show for Vec<T> {
    fn show(&self) -> String {
        let items: Vec<String> = self.iter().map(|x| x.show()).collect();
        format!("[{}]", items.join(", "))
    }
}

fn display<T: Show>(x: &T) -> String { format!("<{}>", x.show()) }
```

문법은 달라도 구조는 같습니다. 그런데 Scala 코드에서 눈여겨볼 점이 있습니다. `using s: Show[A]`에서 `s`는 **보통의 매개변수**이고, `given`으로 만든 인스턴스는 **보통의 값**입니다. 컴파일러가 하는 일은 `display(List(1, 2, 3))`를 보고 빠진 인자를 채워 `display(List(1, 2, 3))(using given_Show_List(using given_Show_Int))`로 바꾸는 것뿐입니다. 실제로 이렇게 직접 써도 똑같이 동작합니다. 바로 이것이 이 장의 핵심 아이디어인 딕셔너리 전달입니다.

> **정의(딕셔너리 전달)** 타입 클래스의 인스턴스를 메서드 구현들을 담은 레코드 값, 즉 <a id="g-dictionary"></a>**딕셔너리**(dictionary)로 만들고, 제약 \\(C\ \alpha\\)가 붙은 다형 함수는 \\(C\\)의 딕셔너리를 **추가 인자**로 받도록 번역합니다. 다형 함수를 쓰는 자리에서는 타입 검사기가 알맞은 딕셔너리를 찾아 인자로 넘깁니다.

Wadler와 Blott의 논문이 보여 준 것이 바로 이것입니다. 타입 클래스가 있는 프로그램은 타입 검사를 하면서 딕셔너리를 넘기는 평범한 프로그램으로 번역할 수 있고, 따라서 타입 클래스는 실행기에 새로운 기능을 전혀 요구하지 않습니다.

## TCFAE: 타입 클래스를 더한 PTFAE

이제 \\(\mathsf{PTFAE}\\)를 확장해 \\(\mathsf{TCFAE}\\)를 만들어 봅시다. 예제가 너무 심심하지 않도록 \\(\mathsf{PTFAE}\\)에 불(`Bool`: `true`, `false`, `if`)과 수 비교(`==`, `<`), 그리고 쌍(`(e1, e2)`, `e.1`, `e.2`)을 먼저 더해 두고, 그 위에 타입 클래스를 더합니다. 수 비교 `==`는 **수에만** 쓸 수 있는 기본 연산입니다. 다른 타입의 같음 비교는 타입 클래스로 정의해야 합니다.

```tcfae
/* TCFAE */
class Eq[T] { eq: T => T => Bool }
instance Eq[Number] { eq = (x: Number) => (y: Number) => x == y }
instance Eq[Bool] {
  eq = (x: Bool) => (y: Bool) => if (x) y else (if (y) false else true)
}
instance [A: Eq, B: Eq] Eq[(A, B)] {
  eq = (p: (A, B)) => (q: (A, B)) =>
    if (eq[A](p.1)(q.1)) eq[B](p.2)(q.2) else false
}
val neq = forall[T: Eq] (x: T) => (y: T) => if (eq[T](x)(y)) false else true;
neq[(Number, Bool)]((1, true))((1, false))     // true
```

하나씩 읽어 봅시다.

- `class Eq[T] { eq: T => T => Bool }`은 클래스 `Eq`를 선언합니다. `Eq`에 속하는 타입 `T`에는 `T => T => Bool` 타입의 메서드 `eq`가 있어야 합니다.
- `instance Eq[Number] { ... }`와 `instance Eq[Bool] { ... }`은 수와 불의 인스턴스입니다. 인스턴스의 몸통이 `{eq = ...}`처럼 **레코드 모양**인 것은 우연이 아닙니다. 곧 이것이 정말로 레코드가 됩니다.
- `instance [A: Eq, B: Eq] Eq[(A, B)]`는 Haskell의 `instance (Eq a, Eq b) => Eq (a, b)`에 해당합니다. `A`와 `B`가 `Eq`에 속하면 쌍 타입 `(A, B)`도 `Eq`에 속합니다.
- `forall[T: Eq] e`는 **제약이 있는** 타입 추상화입니다. `T`는 아무 타입이 아니라 `Eq`에 속하는 타입으로만 구체화할 수 있고, 그 대가로 몸통에서 `eq[T]`를 쓸 수 있습니다. Scala의 문맥 바운드 `[T: Eq]`와 같은 모양입니다. `neq`의 타입은 `[T: Eq] T => T => Bool`입니다.
- 메서드 `eq`는 그 자체로 타입이 `[T: Eq] T => T => Bool`인 다형 값처럼 쓰입니다. `eq[A]`, `eq[T]`처럼 타입 인자를 주어 구체화합니다.

\\(\mathsf{TCFAE}\\)는 \\(\mathsf{PTFAE}\\)처럼 타입 인자를 **명시적으로** 씁니다. 그래서 `eq[A]`를 보면 어느 타입의 `eq`인지 늘 분명하고, 타입 검사기가 할 일은 "그 타입의 `Eq` 인스턴스를 찾는 것"으로 좁혀집니다. Haskell처럼 타입 인자까지 추론하는 이야기는 이 장의 뒤에서 잠깐 다룹니다.

한 타입 변수에 제약을 여러 개 붙일 때는 Rust처럼 `+`로 잇습니다. 예를 들어 `forall[T: Eq + Ord] e`는 `T`가 `Eq`와 `Ord`에 모두 속해야 한다는 뜻입니다.

### 구체 문법

\\(\mathsf{TCFAE}\\)의 프로그램은 클래스와 인스턴스 선언 여러 개 뒤에 식 하나가 오는 꼴입니다. 불과 쌍을 더한 \\(\mathsf{PTFAE}\\)의 구체 문법(concrete syntax)을 다음과 같이 확장합니다.

```bnf
// programs and declarations
<program> ::= <decl>* <expr>
<decl>    ::= "class" <cid> "[" <id> "]" "{" [<id> ":" <type> ("," <id> ":" <type>)*] "}"
            | "instance" ["[" <tparam> ("," <tparam>)* "]"] <cid> "[" <type> "]"
              "{" [<id> "=" <expr> ("," <id> "=" <expr>)*] "}"
<tparam>  ::= <id> [":" <cid> ("+" <cid>)*]

// expressions
<expr> ::= ...
         | "forall" "[" <tparam> "]" <expr>
         | <expr> "[" <type> "]"

// types
<type> ::= ...
         | "[" <tparam> "]" <type>
```

`<cid>`는 클래스 이름입니다. 식과 타입에서 \\(\mathsf{PTFAE}\\)와 달라진 점은 `forall[T]`와 다형 타입 `[T] τ`의 타입 매개변수에 `T: Eq + Ord`처럼 제약을 붙일 수 있다는 것뿐이고, 제약이 없으면 \\(\mathsf{PTFAE}\\)와 똑같습니다.

인스턴스의 대상 타입에는 간단하게 하려고 제한을 둡니다. `Number`, `Bool`이거나, `(A, B)`나 `A => B`처럼 타입 생성자에 **서로 다른 타입 변수**를 넣은 꼴이어야 하고, 그 타입 변수들이 정확히 인스턴스의 타입 매개변수여야 합니다. Haskell 98의 규칙과 같은 제한으로, 덕분에 인스턴스를 찾을 때 타입의 맨 바깥 생성자만 보면 됩니다.

### 추상 문법

추상 문법(abstract syntax)은 다음과 같습니다. 클래스 이름은 \\(C\\)로 쓰고, 제약 목록 \\(C\_1, \ldots, C\_k\\)를 줄여 \\(\overline{C}\\)로 씁니다. 쌍 타입은 \\(\tau\_1 \times \tau\_2\\)로 씁니다.

\\[
\begin{array}{lrcll}
\text{Programs} & \mathbb{P} \ni P & \mathtt{::=} & \mathit{decl}^{\ast}\enspace e & (\texttt{Program}) \\\\
\text{Declarations} & \mathit{decl} & \mathtt{::=} & \mathtt{class}\ C[\alpha]\ \\{[m : \tau]^{\ast}\\} & (\texttt{ClassDecl}) \\\\
& & \mid & \mathtt{instance}\ [\beta\_1\mathtt{:}\overline{C}\_1, \ldots, \beta\_n\mathtt{:}\overline{C}\_n]\ C[\tau]\ \\{[m = e]^{\ast}\\} & (\texttt{InstDecl}) \\\\
\text{Expressions} & \mathbb{E} \ni e & \mathtt{::=} & \ldots & \\\\
& & \mid & \forall\alpha\mathtt{:}\overline{C}.e & (\texttt{TypeAbs}) \\\\
& & \mid & e[\tau] & (\texttt{TypeApp}) \\\\
\text{Types} & \mathbb{T} \ni \tau & \mathtt{::=} & \ldots \mid \mathtt{bool} \mid \tau \times \tau & \\\\
& & \mid & \forall\alpha.\overline{C}\ \alpha \Rightarrow \tau & (\texttt{PolyT}) \\\\
\text{Classes} & C \in \mathbb{X}\_{C} & & & (\texttt{String})
\end{array}
\\]

\\(\forall\alpha.\overline{C}\ \alpha \Rightarrow \tau\\)는 \\(\forall\alpha.(C\_1\ \alpha, \ldots, C\_k\ \alpha) \Rightarrow \tau\\)를 줄인 것으로, "\\(C\_1, \ldots, C\_k\\)에 모두 속하는 어떤 타입 \\(\alpha\\)에 대해서든 \\(\tau\\)"라고 읽습니다. Haskell의 `Eq a => a -> a -> Bool`을 \\(\forall\alpha.\mathtt{Eq}\ \alpha \Rightarrow \alpha \to \alpha \to \mathtt{bool}\\)로 쓰는 셈입니다. \\(k = 0\\)이면 \\(\mathsf{PTFAE}\\)의 다형 타입 \\(\forall\alpha.\tau\\)와 같습니다. (이 장에서 타입 안의 \\(\Rightarrow\\)는 한정 타입의 화살표입니다. 계산 관계 \\(\sigma \vdash e \Rightarrow v\\)와 기호는 같지만 쓰이는 자리가 달라 헷갈릴 일은 없습니다.)

Scala로는 이렇게 표현합니다. 다형 타입과 타입 추상화에 제약 목록 `cls`가 생겼고, 선언과 프로그램이 새로 생겼습니다.

```scala
enum Type:
  ...
  case BoolT
  case PairT(fty: Type, sty: Type)
  case VarT(name: String)
  case PolyT(name: String, cls: List[String], ty: Type) // [T: C1 + ... + Ck] ty

enum Expr:
  ...
  case TypeAbs(name: String, cls: List[String], body: Expr)
  case TypeApp(expr: Expr, ty: Type)

enum Decl:
  case ClassDecl(name: String, tvar: String, sigs: List[(String, Type)])
  case InstDecl(params: List[(String, List[String])], cls: String, ty: Type,
                defs: List[(String, Expr)])

case class Program(decls: List[Decl], body: Expr)
```

## 딕셔너리 전달

\\(\mathsf{TCFAE}\\)의 타입 규칙을 만들기 전에, 우리가 **어디로** 가려는지부터 봅시다. 인터프리터를 새로 만드는 대신, \\(\mathsf{TCFAE}\\) 프로그램을 레코드가 있는 \\(\mathsf{PTFAE}\\) 프로그램으로 번역하고 그것을 실행할 것입니다.

### 아이디어

번역은 다섯 군데에서 일어납니다. 아래 그림에서 각 항목의 위 줄은 \\(\mathsf{TCFAE}\\), 아래 줄은 번역된 \\(\mathsf{PTFAE}\\)이고, 테두리 친 부분이 번역하면서 새로 생긴 부분입니다.

<div style="text-align:center">
<svg viewBox="0 0 640 400" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="딕셔너리 전달 번역의 다섯 가지 경우: 클래스 선언은 레코드에서 메서드를 꺼내는 함수가 되고, 인스턴스 선언은 레코드 값이 되고, 제약 있는 타입 추상화는 딕셔너리를 받는 함수가 되고, 메서드 사용과 타입 적용에는 딕셔너리 인자가 끼어든다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14" fill="currentColor">
<defs><marker id="type-classes-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<g font-family="ui-monospace, Menlo, monospace" font-size="12.5">
<text x="10" y="30" font-family="sans-serif" font-size="14" font-weight="bold">클래스</text>
<text x="128" y="30">class Eq[T] { eq: T =&gt; T =&gt; Bool }</text>
<polyline points="112,38 112,55 124,55" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#type-classes-1)"/>
<text x="128" y="60" xml:space="preserve">val eq = </text>
<text x="199.9" y="60">forall[T] (d: {eq: T =&gt; T =&gt; Bool}) =&gt; d.eq</text>
<rect x="196.9" y="45" width="330.6" height="21" rx="3" fill="none" stroke="#2f4fb8" stroke-width="1.6"/>
<text x="10" y="108" font-family="sans-serif" font-size="14" font-weight="bold">인스턴스</text>
<text x="128" y="108">instance Eq[Number] { eq = ... }</text>
<polyline points="112,116 112,133 124,133" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#type-classes-1)"/>
<text x="132" y="138">val instEqNumber = {eq = ...}</text>
<rect x="129" y="123" width="224.9" height="21" rx="3" fill="none" stroke="#2f4fb8" stroke-width="1.6"/>
<text x="10" y="186" font-family="sans-serif" font-size="14" font-weight="bold">제약 있는</text>
<text x="10" y="204" font-family="sans-serif" font-size="14" font-weight="bold">타입 추상화</text>
<text x="128" y="186">forall[T: Eq] (x: T) =&gt; ...</text>
<polyline points="112,194 112,211 124,211" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#type-classes-1)"/>
<text x="128" y="216" xml:space="preserve">forall[T] </text>
<text x="207.5" y="216">(dEqT: {eq: T =&gt; T =&gt; Bool}) =&gt;</text>
<text x="445.5" y="216" xml:space="preserve"> (x: T) =&gt; ...</text>
<rect x="204.5" y="201" width="240.0" height="21" rx="3" fill="none" stroke="#2f4fb8" stroke-width="1.6"/>
<text x="10" y="264" font-family="sans-serif" font-size="14" font-weight="bold">메서드 사용</text>
<text x="128" y="264">eq[T](x)(y)</text>
<polyline points="112,272 112,289 124,289" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#type-classes-1)"/>
<text x="128" y="294" xml:space="preserve">eq[T]</text>
<text x="169.8" y="294">(dEqT)</text>
<text x="219.1" y="294" xml:space="preserve">(x)(y)</text>
<rect x="166.8" y="279" width="51.3" height="21" rx="3" fill="none" stroke="#2f4fb8" stroke-width="1.6"/>
<text x="10" y="342" font-family="sans-serif" font-size="14" font-weight="bold">타입 적용</text>
<text x="128" y="342">neq[Number](1)(2)</text>
<polyline points="112,350 112,367 124,367" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#type-classes-1)"/>
<text x="128" y="372" xml:space="preserve">neq[Number]</text>
<text x="215.1" y="372">(instEqNumber)</text>
<text x="324.8" y="372" xml:space="preserve">(1)(2)</text>
<rect x="212.1" y="357" width="111.7" height="21" rx="3" fill="none" stroke="#2f4fb8" stroke-width="1.6"/>
</g>
</svg>
</div>
<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 딕셔너리 전달 번역. 각 항목의 위는 TCFAE, 아래는 번역된 PTFAE</p>

1. **클래스**는 딕셔너리의 **모양**을 정합니다. `Eq[T]`의 딕셔너리는 레코드 타입 `{eq: T => T => Bool}`의 값입니다. 메서드 `eq`는 "딕셔너리를 받아 그 안의 `eq` 필드를 꺼내는 함수"가 됩니다.
2. **인스턴스**는 딕셔너리 **값**이 됩니다. `instance Eq[Number] {eq = ...}`는 레코드 `{eq = ...}`에 `instEqNumber`라는 이름을 붙인 것입니다.
3. **제약 있는 타입 추상화** `forall[T: Eq] e`는 타입 인자를 받은 뒤 `Eq[T]`의 딕셔너리 `dEqT`를 **추가 인자로** 받는 함수가 됩니다.
4. **메서드 사용** `eq[T]`에는 `T`의 `Eq` 딕셔너리가 인자로 붙습니다. 몸통 안에서 `T`의 딕셔너리는 바로 3에서 받은 `dEqT`입니다.
5. **제약 있는 다형 값의 타입 적용** `neq[Number]`에도 `Number`의 `Eq` 딕셔너리, 즉 `instEqNumber`가 붙습니다.

4와 5는 사실 같은 경우입니다. 메서드 `eq`도 타입이 `[T: Eq] T => T => Bool`인 제약 있는 다형 값이기 때문입니다. 결국 번역의 핵심은 두 가지입니다. **제약 하나가 딕셔너리 매개변수 하나가 되고**, **제약 있는 다형 값을 구체화할 때마다 타입 검사기가 딕셔너리를 찾아 넘긴다**는 것입니다. 이 "딕셔너리를 찾는" 일을 <a id="g-instance-resolution"></a>인스턴스 해소(instance resolution)라고 합니다.

> **생각해 보기.** 앞의 예제에서 `neq[(Number, Bool)]`에는 어떤 딕셔너리를 넘겨야 할까요? `instEqPair`라는 이름의 무언가가 필요하다는 것은 짐작할 수 있지만, 그것은 레코드일까요, 함수일까요? 쌍의 `eq`를 계산하려면 `A`와 `B`의 `eq`가 필요하다는 점을 떠올려 보세요.

### 번역 대상 언어

번역 대상은 \\(\mathsf{PTFAE}\\)에 불, 쌍, 그리고 [서브타입 다형성](./subtype-polymorphism.md)의 레코드를 더한 언어입니다. 서브타입은 필요 없습니다. 레코드 식 \\(\\{x\_1 = e\_1, \ldots, x\_n = e\_n\\}\\), 필드 접근 \\(e.x\\), 레코드 타입 \\(\\{x\_1 : \tau\_1, \ldots, x\_n : \tau\_n\\}\\)의 의미와 타입 규칙은 \\(\mathsf{STFAE}\\)에서 본 것과 같습니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e\_1 \Rightarrow v\_1 \quad \ldots \quad \sigma \vdash e\_n \Rightarrow v\_n$}
\LeftLabel{$\texttt{Record}$}
\UnaryInfC{$\sigma \vdash \\{x\_1 = e\_1, \ldots, x\_n = e\_n\\} \Rightarrow \\{x\_1 = v\_1, \ldots, x\_n = v\_n\\}$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e \Rightarrow \\{\ldots, x = v, \ldots\\}$}
\LeftLabel{$\texttt{Access}$}
\UnaryInfC{$\sigma \vdash e.x \Rightarrow v$}
\end{prooftree}
\\]

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Record(fs) => RecordV(fs.map((f, e) => (f, interp(e, env))).toMap)
  case Access(r, f) => interp(r, env) match
    case RecordV(fs) => fs.getOrElse(f, error(s"no such field: $f"))
    case v => error(s"not a record: ${v.str}")
```

불, `if`, 쌍의 규칙은 짐작하는 그대로이므로 생략합니다. 중요한 것은 이 언어에는 **타입 클래스가 전혀 없다**는 점입니다. 타입 추상화와 다형 타입에도 제약이 없습니다. 그래도 번역 결과는 잘 실행되고, 타입 검사도 통과합니다. 타입 클래스는 오로지 타입 검사기와 번역기만의 일입니다.

### 딕셔너리 타입과 타입의 번역

번역은 식뿐만 아니라 **타입**도 바꿉니다. 제약 있는 다형 타입이 대상 언어에는 없기 때문입니다. 먼저 클래스 \\(C\\)의 딕셔너리 타입을 정의합니다. \\(\mathtt{class}\ C[\alpha]\ \\{m\_1 : \tau\_1, \ldots, m\_k : \tau\_k\\}\\)일 때, 타입 \\(\tau\\)에 대한 \\(C\\)의 딕셔너리 타입 \\(D\_C(\tau)\\)는 메서드 타입의 \\(\alpha\\)를 \\(\tau\\)로 바꾼 레코드 타입입니다.

\\[
D\_C(\tau) = \\{ m\_1 : |\tau\_1[\alpha \leftarrow \tau]|, \ldots, m\_k : |\tau\_k[\alpha \leftarrow \tau]| \\}
\\]

예를 들어 \\(D\_{\mathtt{Eq}}(\mathtt{num}) = \\{\mathtt{eq} : \mathtt{num} \to \mathtt{num} \to \mathtt{bool}\\}\\)입니다. 여기서 \\(|\tau|\\)는 \\(\mathsf{TCFAE}\\)의 타입 \\(\tau\\)를 대상 언어의 타입으로 옮긴 것으로, 제약 하나하나를 딕셔너리 매개변수로 바꿉니다.

\\[
|\forall\alpha.(C\_1\ \alpha, \ldots, C\_k\ \alpha) \Rightarrow \tau| = \forall\alpha.D\_{C\_1}(\alpha) \to \cdots \to D\_{C\_k}(\alpha) \to |\tau|
\\]

나머지 타입은 구조를 따라 그대로 옮깁니다(\\(|\tau\_1 \to \tau\_2| = |\tau\_1| \to |\tau\_2|\\) 등). 예를 들어 `neq`의 타입은 이렇게 바뀝니다.

\\[
|\forall T.\mathtt{Eq}\ T \Rightarrow T \to T \to \mathtt{bool}|
= \forall T.\\{\mathtt{eq} : T \to T \to \mathtt{bool}\\} \to T \to T \to \mathtt{bool}
\\]

구현은 정의를 그대로 옮깁니다. 클래스 정보는 타입 환경에 들어 있습니다(다음 절).

```scala
// translation of types: |ty|
def trans(ty: Type, tenv: TypeEnv): Type = ty match
  case NumT | BoolT | VarT(_) => ty
  case ArrowT(p, r)    => ArrowT(trans(p, tenv), trans(r, tenv))
  case PairT(f, s)     => PairT(trans(f, tenv), trans(s, tenv))
  case PolyT(x, cs, t) =>
    val dictTys = cs.map(c => dictT(c, VarT(x), tenv))
    PolyT(x, Nil, dictTys.foldRight(trans(t, tenv))(ArrowT(_, _)))

// dictionary type D_C(ty)
def dictT(cls: String, ty: Type, tenv: TypeEnv): Type =
  val ClassDecl(_, tvar, sigs) = tenv.classes(cls)
  RecordT(sigs.map((m, s) => (m, trans(subst(s, tvar, ty), tenv))).toMap)
```

## 타입 규칙과 번역

이제 \\(\mathsf{TCFAE}\\)의 타입 규칙을 만듭니다. 지금까지의 타입 규칙 \\(\Gamma \vdash e : \tau\\)는 식의 타입만 알려 주었습니다. 이번에는 식을 번역한 결과도 함께 내놓도록 판단(judgment)을 넓힙니다.

\\[
\Gamma \vdash e : \tau \rightsquigarrow e'
\\]

"타입 환경 \\(\Gamma\\)에서 \\(e\\)의 타입은 \\(\tau\\)이고, \\(e\\)를 번역하면 \\(e'\\)이다"라고 읽습니다. 이렇게 타입 검사를 하면서 동시에 프로그램을 더 명시적인 프로그램으로 옮기는 것을 <a id="g-elaboration"></a>정교화(elaboration)라고 부릅니다. 딕셔너리를 **어디에** 넣을지는 타입을 알아야만 정할 수 있으므로, 이 번역은 타입 검사와 따로 떼어 할 수 없습니다. 구현도 타입과 번역된 식을 함께 돌려줍니다.

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): (Type, Expr) = ???
```

### 타입 환경

타입 환경 \\(\Gamma\\)는 네 가지 정보를 담습니다.

- 변수의 타입 \\(x : \tau\\) (\\(\mathsf{PTFAE}\\)와 같음)
- 정의된 타입 변수와 그 제약 \\(\alpha : \overline{C}\\). \\(\mathsf{PTFAE}\\)에서는 타입 변수의 집합이었는데, 이제 각 타입 변수가 어느 클래스에 속한다고 가정해도 되는지도 기억합니다.
- 클래스 선언 \\(\mathtt{class}\ C[\alpha]\ \\{\ldots\\}\\)
- 인스턴스 정보 \\(x : \forall\beta\_1 \ldots \beta\_n.(C'\_1\ \beta'\_1, \ldots, C'\_m\ \beta'\_m) \Rightarrow C\ \tau\_h\\). 이름이 \\(x\\)인 딕셔너리가 "\\(C'\_j\ \beta'\_j\\)들이 성립하면 \\(C\ \tau\_h\\)가 성립한다"는 사실을 보증한다는 뜻입니다. 각 \\(\beta'\_j\\)는 \\(\beta\_1, \ldots, \beta\_n\\) 중 하나입니다.

\\(\Gamma\\)에 타입 변수 \\(\alpha\\)를 제약 \\(\overline{C}\\)와 함께 추가한 환경을 \\(\Gamma[\alpha : \overline{C}]\\)라고 씁니다. 그리고 제약 \\(C\ \alpha\\)마다 그 딕셔너리를 담을 변수 이름을 하나씩 정해 \\(d\_{C,\alpha}\\)라고 씁니다. 구현에서는 `dEqT`처럼 클래스 이름과 타입 변수 이름을 이어 붙입니다. 이 이름들은 서로 겹치지 않아야 하고, 프로그램의 변수·메서드 이름이나 인스턴스 딕셔너리의 이름(`instEqNumber` 등, 뒤의 인스턴스 선언 절)과도 겹치지 않아야 합니다. 겹치면 안쪽에서 묶은 이름이 바깥의 딕셔너리를 가려 엉뚱한 딕셔너리가 넘어갑니다. \\(\mathsf{PTFAE}\\)에서처럼 같은 타입 변수를 다시 정의하는 것은 금지하지만 그것만으로는 부족합니다. 이름을 단순히 이어 붙이면 클래스 `E`와 타입 변수 `qT`의 이름도 `dEqT`가 되어, `forall[qT: E] forall[T: Eq] e[qT]`에서 `e[qT]`가 `Eq`의 딕셔너리를 받게 됩니다. 그래서 이런 이름들은 서로 겹치지 않고, 프로그래머가 이런 이름을 변수나 메서드 이름으로 쓰지 않는다고 가정합니다.

```scala
case class TypeEnv(
  vars: Map[String, Type] = Map(),           // x -> type
  tys: Map[String, List[String]] = Map(),    // type variable -> its classes
  classes: Map[String, ClassDecl] = Map(),   // class declarations
  insts: List[InstInfo] = Nil,               // instance declarations
) {
  def addVar(pair: (String, Type)): TypeEnv = copy(vars = vars + pair)
  def addType(name: String, cls: List[String]): TypeEnv = copy(tys = tys + (name -> cls))
}

case class InstInfo(name: String, params: List[(String, List[String])],
                    cls: String, ty: Type)

def dictName(cls: String, tvar: String): String = s"d$cls$tvar"
```

타입의 올바른 형태 \\(\Gamma \vdash \tau\\)는 \\(\mathsf{PTFAE}\\)와 같고, 다형 타입 \\(\forall\alpha.\overline{C}\ \alpha \Rightarrow \tau\\)에서 \\(\overline{C}\\)가 모두 선언된 클래스인지만 더 확인합니다.

### 그대로 옮기는 규칙

대부분의 규칙은 \\(\mathsf{PTFAE}\\)의 규칙에 번역 결과를 덧붙인 것뿐입니다. 식별자는 그대로, 함수 적용은 양쪽을 번역해 다시 적용으로 만듭니다.

\\[
\begin{prooftree}
\AxiomC{$x \in \text{Dom}(\Gamma)$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma \vdash x : \Gamma(x) \rightsquigarrow x$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e\_0 : \tau\_1 \to \tau\_2 \rightsquigarrow e'\_0$}
\AxiomC{$\Gamma \vdash e\_1 : \tau\_3 \rightsquigarrow e'\_1$}
\AxiomC{$\tau\_1 \equiv \tau\_3$}
\LeftLabel{$\tau\texttt{-App}$}
\TrinaryInfC{$\Gamma \vdash e\_0(e\_1) : \tau\_2 \rightsquigarrow e'\_0(e'\_1)$}
\end{prooftree}
\\]

함수 정의에서는 매개변수의 타입 표기도 번역해야 합니다. 매개변수 타입이 제약 있는 다형 타입일 수도 있기 때문입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash \tau$}
\AxiomC{$\Gamma[x : \tau] \vdash e : \tau' \rightsquigarrow e'$}
\LeftLabel{$\tau\texttt{-Fun}$}
\BinaryInfC{$\Gamma \vdash \lambda x\mathtt{:}\tau.e : \tau \to \tau' \rightsquigarrow \lambda x\mathtt{:}|\tau|.e'$}
\end{prooftree}
\\]

```scala
def typeCheck(expr: Expr, tenv: TypeEnv): (Type, Expr) = expr match
  ...
  case Id(x) => (tenv.vars.getOrElse(x, error(s"free identifier: $x")), Id(x))
  case Fun(p, pty, b) =>
    mustValid(pty, tenv)
    val (bty, b1) = typeCheck(b, tenv.addVar(p -> pty))
    (ArrowT(pty, bty), Fun(p, trans(pty, tenv), b1))
  case App(f, a) => typeCheck(f, tenv) match
    case (ArrowT(pty, rty), f1) => (rty, App(f1, check(a, pty, tenv)))
    case (t, _) => error(s"not a function type: ${t.str}")
```

`check`는 식을 검사·번역하고 그 타입이 기대한 타입과 동등한지 확인하는 작은 도우미입니다.

```scala
def check(expr: Expr, ty: Type, tenv: TypeEnv): Expr =
  val (ety, e) = typeCheck(expr, tenv)
  mustSame(ety, ty)
  e
```

수, 덧셈, 비교, `if`, `val`, 쌍도 모두 같은 방식이라 생략합니다.

### 제약 있는 타입 추상화

이제 새로운 부분입니다. \\(\forall\alpha\mathtt{:}\overline{C}.e\\)의 타입은 무엇이고 무엇으로 번역해야 할까요?

몸통 \\(e\\) 안에서는 \\(\alpha\\)가 \\(C\_1, \ldots, C\_k\\)에 속한다고 **가정**해도 됩니다. 그래서 \\(\Gamma[\alpha : \overline{C}]\\)에서 몸통을 검사합니다. 몸통의 타입이 \\(\tau\\)이면 전체 타입은 \\(\forall\alpha.\overline{C}\ \alpha \Rightarrow \tau\\)입니다. 이 가정은 공짜가 아닙니다. 번역 결과에서는 가정 하나마다 딕셔너리를 하나씩 **받아야** 합니다. 몸통 안에서 \\(C\_i\ \alpha\\)가 필요할 때 쓸 딕셔너리가 바로 이 매개변수 \\(d\_{C\_i,\alpha}\\)입니다.

\\[
\begin{prooftree}
\AxiomC{$\alpha \notin \text{Dom}(\Gamma)$}
\AxiomC{$\Gamma[\alpha : \overline{C}] \vdash e : \tau \rightsquigarrow e'$}
\LeftLabel{$\tau\texttt{-TypeAbs}$}
\BinaryInfC{$\Gamma \vdash \forall\alpha\mathtt{:}\overline{C}.e : \forall\alpha.\overline{C}\ \alpha \Rightarrow \tau \rightsquigarrow \forall\alpha.\lambda d\_1\mathtt{:}D\_{C\_1}(\alpha).\cdots\lambda d\_k\mathtt{:}D\_{C\_k}(\alpha).e'$}
\end{prooftree}
\\]

여기서 \\(d\_i = d\_{C\_i,\alpha}\\)입니다. 번역 결과의 타입이 \\(|\forall\alpha.\overline{C}\ \alpha \Rightarrow \tau|\\)와 정확히 맞는다는 것을 확인해 보세요. 제약이 없으면(\\(k = 0\\)) \\(\mathsf{PTFAE}\\)의 \\(\tau\texttt{-TypeAbs}\\)와 같습니다.

```scala
  case TypeAbs(name, cls, body) =>
    if (tenv.tys.contains(name)) error(s"already defined type: $name")
    cls.foreach(mustClass(_, tenv))
    val (bty, body1) = typeCheck(body, tenv.addType(name, cls))
    val dictFuns = cls.foldRight(body1) {
      (c, b) => Fun(dictName(c, name), dictT(c, VarT(name), tenv), b)
    }
    (PolyT(name, cls, bty), TypeAbs(name, Nil, dictFuns))
```

### 타입 적용과 인스턴스 해소

반대로 \\(e[\tau]\\)에서 \\(e\\)의 타입이 \\(\forall\alpha.\overline{C}\ \alpha \Rightarrow \tau'\\)이면, \\(\alpha\\)를 \\(\tau\\)로 구체화하는 대가로 \\(C\_1\ \tau, \ldots, C\_k\ \tau\\)가 정말 성립하는지 **보여야** 합니다. 그리고 그 증거인 딕셔너리를 인자로 넘깁니다. "현재 환경 \\(\Gamma\\)에서 \\(C\ \tau\\)가 성립하고, 그 딕셔너리는 \\(d\\)다"라는 판단을 \\(\Gamma \Vdash C\ \tau \rightsquigarrow d\\)로 씁니다. 이 판단을 <a id="g-entailment"></a>함의(entailment)라고 부르며, 규칙은 다음 절에서 정합니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \forall\alpha.\overline{C}\ \alpha \Rightarrow \tau' \rightsquigarrow e'$}
\AxiomC{$\Gamma \vdash \tau$}
\AxiomC{$\Gamma \Vdash C\_i\ \tau \rightsquigarrow d\_i \quad (1 \leq i \leq k)$}
\LeftLabel{$\tau\texttt{-TypeApp}$}
\TrinaryInfC{$\Gamma \vdash e[\tau] : \tau'[\alpha \leftarrow \tau] \rightsquigarrow e'[|\tau|]{}(d\_1)\cdots(d\_k)$}
\end{prooftree}
\\]

타입은 \\(\mathsf{PTFAE}\\)와 똑같이 \\(\tau'[\alpha \leftarrow \tau]\\)이고, 번역 결과에는 타입 적용 뒤에 딕셔너리 적용이 \\(k\\)번 붙습니다.

```scala
  case TypeApp(e, ty) => typeCheck(e, tenv) match
    case (PolyT(name, cls, bty), e1) =>
      mustValid(ty, tenv)
      val dicts = cls.map(c => resolve(c, ty, tenv))
      (subst(bty, name, ty), dicts.foldLeft(TypeApp(e1, trans(ty, tenv)))(App(_, _)))
    case (t, _) => error(s"not a polymorphic type: ${t.str}")
```

타입 추상화와 타입 적용이 짝을 이룬다는 점에 주목하세요. 추상화 쪽에서 딕셔너리 **매개변수**를 만들고, 적용 쪽에서 딕셔너리 **인자**를 채웁니다. 함수의 매개변수와 인자처럼 순서도 맞아야 하므로, 같은 제약 목록 \\(\overline{C}\\)를 같은 순서로 씁니다. (그래서 구현의 타입 동등성 검사는 두 다형 타입의 제약 목록이 순서까지 같을 것을 요구합니다.)

### 인스턴스 해소 규칙

\\(\Gamma \Vdash C\ \tau \rightsquigarrow d\\)를 만족하는 딕셔너리 \\(d\\)는 어디서 올까요? 두 군데입니다.

**첫째, 가정에서.** \\(\tau\\)가 타입 변수 \\(\alpha\\)이고 \\(\Gamma\\)에서 \\(\alpha\\)가 \\(C\\)에 속한다고 가정되어 있다면, 바깥의 \\(\forall\alpha\mathtt{:}\ldots\\)가 받아 둔 딕셔너리 매개변수 \\(d\_{C,\alpha}\\)를 쓰면 됩니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma(\alpha) = \overline{C}$}
\AxiomC{$C \in \overline{C}$}
\LeftLabel{$\texttt{Ent-Var}$}
\BinaryInfC{$\Gamma \Vdash C\ \alpha \rightsquigarrow d\_{C,\alpha}$}
\end{prooftree}
\\]

**둘째, 인스턴스에서.** \\(\tau\\)가 어떤 인스턴스의 대상 타입 \\(\tau\_h\\)와 맞으면, 즉 \\(\tau = \theta(\tau\_h)\\)가 되는 치환 \\(\theta = [\beta\_1 \leftarrow \tau\_1, \ldots, \beta\_n \leftarrow \tau\_n]\\)가 있으면 그 인스턴스를 씁니다. 단, 인스턴스에 조건 \\(C'\_j\ \beta'\_j\\)가 붙어 있으면 그것들도 \\(\theta\\)를 적용해 **재귀적으로** 해소해야 합니다. (규칙에서 \\(\overline{\beta}\\)는 \\(\beta\_1 \ldots \beta\_n\\)을 줄인 것입니다.)

\\[
\begin{prooftree}
\AxiomC{$x : \forall\overline{\beta}.(C'\_1\ \beta'\_1, \ldots, C'\_m\ \beta'\_m) \Rightarrow C\ \tau\_h \in \Gamma$}
\AxiomC{$\Gamma \Vdash C'\_j\ \theta(\beta'\_j) \rightsquigarrow d\_j \quad (1 \leq j \leq m)$}
\LeftLabel{$\texttt{Ent-Inst}$}
\BinaryInfC{$\Gamma \Vdash C\ \theta(\tau\_h) \rightsquigarrow x[|\theta(\beta\_1)|]\cdots[|\theta(\beta\_n)|]{}(d\_1)\cdots(d\_m)$}
\end{prooftree}
\\]

번역 결과를 보면 인스턴스 딕셔너리 \\(x\\)의 정체가 드러납니다. 조건 없는 인스턴스(\\(n = m = 0\\))라면 \\(x\\)는 그냥 레코드입니다. 조건 있는 인스턴스라면 \\(x\\)는 **타입 인자와 딕셔너리를 받아 딕셔너리를 만드는 함수**입니다. 앞의 "생각해 보기"의 답이 이것입니다. `instEqPair`는 `A`와 `B`의 `Eq` 딕셔너리를 받아 `(A, B)`의 `Eq` 딕셔너리를 돌려주는 함수입니다.

구현에서는 대상 타입의 맨 바깥 생성자만 보고 인스턴스를 찾고(`matchHead`), 인스턴스의 타입 매개변수에 대응하는 타입(`args`, 곧 \\(\theta\\))을 얻습니다.

```scala
// instance resolution: a dictionary expression for `cls[ty]`
def resolve(cls: String, ty: Type, tenv: TypeEnv): Expr = ty match
  case VarT(x) =>
    if (tenv.tys.getOrElse(x, Nil).contains(cls)) Id(dictName(cls, x))
    else error(s"no instance: $cls[${ty.str}]")
  case _ =>
    val inst = tenv.insts.find(i => i.cls == cls && matchHead(i.ty, ty).isDefined)
      .getOrElse(error(s"no instance: $cls[${ty.str}]"))
    val args = matchHead(inst.ty, ty).get
    val tyApps = inst.params.foldLeft[Expr](Id(inst.name)) {
      case (e, (b, _)) => TypeApp(e, trans(args(b), tenv))
    }
    inst.params.foldLeft(tyApps) {
      case (e, (b, cs)) => cs.foldLeft(e)((e, c) => App(e, resolve(c, args(b), tenv)))
    }

def matchHead(head: Type, ty: Type): Option[Map[String, Type]] = (head, ty) match
  case (NumT, NumT) | (BoolT, BoolT) => Some(Map())
  case (PairT(VarT(a), VarT(b)), PairT(t1, t2))   => Some(Map(a -> t1, b -> t2))
  case (ArrowT(VarT(a), VarT(b)), ArrowT(t1, t2)) => Some(Map(a -> t1, b -> t2))
  case _ => None
```

인스턴스 해소는 일종의 **증명 탐색**입니다. 함의 판단의 유도 트리가 곧 딕셔너리 식의 모양이 됩니다. 예를 들어 \\(\mathtt{Eq}\ (\mathtt{num} \times \mathtt{bool})\\)의 유도는 다음과 같습니다. (줄이려고 \\(\mathtt{iN} = \mathtt{instEqNumber}\\), \\(\mathtt{iB} = \mathtt{instEqBool}\\), \\(\mathtt{iP} = \mathtt{instEqPair}\\)로 씁니다.)

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Ent-Inst}$}
\UnaryInfC{$\Gamma \Vdash \mathtt{Eq}\ \mathtt{num} \rightsquigarrow \mathtt{iN}$}
\AxiomC{}
\LeftLabel{$\texttt{Ent-Inst}$}
\UnaryInfC{$\Gamma \Vdash \mathtt{Eq}\ \mathtt{bool} \rightsquigarrow \mathtt{iB}$}
\LeftLabel{$\texttt{Ent-Inst}$}
\BinaryInfC{$\Gamma \Vdash \mathtt{Eq}\ (\mathtt{num} \times \mathtt{bool}) \rightsquigarrow \mathtt{iP}[\mathtt{num}][\mathtt{bool}]{}(\mathtt{iN})(\mathtt{iB})$}
\end{prooftree}
\\]

그림으로 그리면 유도 트리와 딕셔너리 식이 같은 모양이라는 것이 잘 보입니다.

<div style="text-align:center">
<svg viewBox="0 0 600 250" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="Eq[(Number, Bool)]의 인스턴스 해소 트리: 쌍 인스턴스 instEqPair가 두 하위 목표 Eq[Number]와 Eq[Bool]을 만들고, 각각 instEqNumber와 instEqBool로 해소된다. 결과 딕셔너리 식은 instEqPair[Number][Bool](instEqNumber)(instEqBool)" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14" fill="currentColor">
<defs><marker id="type-classes-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="200" y="15" width="200" height="34" rx="4" fill="#2a408e"/>
<text x="300" y="37" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">Eq[(Number, Bool)]</text>
<text x="410" y="30" font-size="13">instance [A: Eq, B: Eq]</text>
<text x="410" y="47" font-size="13">Eq[(A, B)] 사용</text>
<polyline points="260,49 160,104" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#type-classes-2)"/>
<polyline points="340,49 440,104" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#type-classes-2)"/>
<text x="195" y="82" text-anchor="end" font-size="13">A = Number</text>
<text x="405" y="82" font-size="13">B = Bool</text>
<rect x="80" y="106" width="160" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="160" y="128" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Eq[Number]</text>
<rect x="360" y="106" width="160" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="440" y="128" text-anchor="middle" font-family="ui-monospace, Menlo, monospace">Eq[Bool]</text>
<text x="160" y="162" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">⇝ instEqNumber</text>
<text x="440" y="162" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">⇝ instEqBool</text>
<line x1="40" y1="190" x2="560" y2="190" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
<text x="300" y="222" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13.5">instEqPair[Number][Bool](instEqNumber)(instEqBool)</text>
</svg>
</div>
<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: Eq[(Number, Bool)]의 인스턴스 해소. 트리의 모양이 곧 딕셔너리 식의 모양이다</p>

> **자주 하는 실수.** 인스턴스를 고를 때 조건 \\(C'\_j\ \beta'\_j\\)를 확인하지 않는 것입니다. 그러면 `Eq[(Number, Number => Number)]`처럼 함수를 담은 쌍도 쌍 인스턴스로 해소되는 것처럼 보이지만, 정작 `Number => Number`의 `Eq` 딕셔너리는 만들 수 없으므로 번역 결과를 완성할 수 없습니다. 함의 규칙의 전제가 바로 이 확인입니다.

### 클래스 선언

이제 선언을 처리할 차례입니다. 선언은 타입 환경을 넓히고, 번역 결과에 `val` 정의를 몇 개 내놓습니다.

\\(\mathtt{class}\ C[\alpha]\ \\{m\_1 : \tau\_1, \ldots, m\_k : \tau\_k\\}\\)는 다음 일을 합니다.

1. \\(C\\)가 처음 선언되는 클래스인지, 메서드 타입 \\(\tau\_i\\)가 \\(\alpha\\)만 쓰는 올바른 타입인지 확인합니다.
2. 각 메서드 \\(m\_i\\)를 타입 환경에 \\(m\_i : \forall\alpha.C\ \alpha \Rightarrow \tau\_i\\)로 넣습니다. 이 덕분에 메서드 사용 `eq[T]`는 별도 규칙 없이 \\(\tau\texttt{-Id}\\)와 \\(\tau\texttt{-TypeApp}\\)으로 처리됩니다.
3. 각 메서드를 딕셔너리에서 필드를 꺼내는 <a id="g-selector"></a>선택 함수(selector)로 정의합니다.

\\[
\mathtt{val}\ m\_i = \forall\alpha.\lambda d\mathtt{:}D\_C(\alpha).d.m\_i
\\]

이 선택 함수의 타입은 \\(\forall\alpha.D\_C(\alpha) \to |\tau\_i|\\)이고, 이는 정확히 \\(|\forall\alpha.C\ \alpha \Rightarrow \tau\_i|\\)입니다. 타입 환경에 적어 둔 타입과 번역 결과가 서로 맞는 것이지요.

```scala
def checkDecl(decl: Decl, tenv: TypeEnv): (TypeEnv, List[(String, Expr)]) = decl match
  case d @ ClassDecl(name, tvar, sigs) =>
    if (tenv.classes.contains(name)) error(s"already defined class: $name")
    val ms = sigs.map(_._1)
    if (ms.distinct != ms) error(s"duplicate methods in $name")
    sigs.foreach((m, s) => mustValid(s, tenv.addType(tvar, Nil)))
    val tenv1 = tenv.copy(classes = tenv.classes + (name -> d))
    // methods become selectors: m = forall[T] (d: D_C(T)) => d.m
    val tenv2 = sigs.foldLeft(tenv1) {
      case (te, (m, s)) => te.addVar(m -> PolyT(tvar, List(name), s))
    }
    val dty = dictT(name, VarT(tvar), tenv1)
    val sels = sigs.map((m, _) =>
      (m, TypeAbs(tvar, Nil, Fun("d", dty, Access(Id("d"), m)))))
    (tenv2, sels)
  ...
```

### 인스턴스 선언

\\(\mathtt{instance}\ [\beta\_1\mathtt{:}\overline{C}\_1, \ldots, \beta\_n\mathtt{:}\overline{C}\_n]\ C[\tau\_h]\ \\{m\_1 = e\_1, \ldots, m\_k = e\_k\\}\\)는 조금 더 할 일이 많습니다. 클래스가 \\(\mathtt{class}\ C[\alpha]\ \\{m\_1 : \tau\_1, \ldots, m\_k : \tau\_k\\}\\)라고 합시다.

1. \\(\tau\_h\\)가 앞에서 정한 모양(맨 바깥 생성자에 서로 다른 타입 변수 \\(\beta\_1, \ldots, \beta\_n\\))인지 확인합니다.
2. **겹침 검사.** 같은 클래스 \\(C\\)에 같은 생성자의 인스턴스가 이미 있으면 거부합니다. 이 검사의 의미는 뒤의 일관성 절에서 자세히 봅니다.
3. 메서드 이름이 클래스의 메서드와 정확히 일치하는지 확인합니다.
4. 각 몸통 \\(e\_i\\)를 \\(\Gamma' = \Gamma[\beta\_1 : \overline{C}\_1]\cdots[\beta\_n : \overline{C}\_n]\\)에서 검사하고, 그 타입이 클래스가 약속한 \\(\tau\_i[\alpha \leftarrow \tau\_h]\\)와 동등한지 확인합니다. 인스턴스의 조건이 몸통 안에서 가정으로 쓰인다는 점이 \\(\tau\texttt{-TypeAbs}\\)와 똑같습니다.
5. 딕셔너리를 만듭니다. 타입 매개변수와 조건마다 \\(\forall\\)와 \\(\lambda\\)를 씌운 레코드입니다.

\\[
\mathtt{val}\ x = \forall\beta\_1.\cdots\forall\beta\_n.\lambda d\_1\mathtt{:}D\_{C'\_1}(\beta'\_1).\cdots\lambda d\_m\mathtt{:}D\_{C'\_m}(\beta'\_m).\\{m\_1 = e'\_1, \ldots, m\_k = e'\_k\\}
\\]

여기서 \\(d\_j = d\_{C'\_j,\beta'\_j}\\)이고 \\(e'\_i\\)는 4에서 얻은 번역 결과입니다. 마지막으로 \\(x : \forall\beta\_1 \ldots \beta\_n.(C'\_1\ \beta'\_1, \ldots) \Rightarrow C\ \tau\_h\\)를 타입 환경에 등록합니다. 딕셔너리의 이름 \\(x\\)는 `instEqPair`처럼 클래스와 생성자 이름으로 짓습니다(앞에서 가정한 대로 이 이름은 변수·메서드 이름과 겹치지 않습니다).

```scala
  case InstDecl(params, cls, ty, defs) =>
    mustClass(cls, tenv)
    val ClassDecl(_, tvar, sigs) = tenv.classes(cls)
    val ps = params.map(_._1)
    if (ps.distinct != ps) error("duplicate type parameters")
    if (ty.isInstanceOf[VarT] || matchHead(ty, ty).isEmpty || free(ty) != ps.toSet ||
        (ty match { case PairT(l, r) => l == r; case ArrowT(l, r) => l == r; case _ => false }))
      error(s"invalid instance type: ${ty.str}")
    if (tenv.insts.exists(i => i.cls == cls && headName(i.ty) == headName(ty)))
      error(s"overlapping instance: $cls[${ty.str}]")
    val inner = params.foldLeft(tenv) {
      case (te, (b, cs)) => cs.foreach(mustClass(_, te)); te.addType(b, cs)
    }
    if (defs.map(_._1).sorted != sigs.map(_._1).sorted)
      error(s"methods do not match class $cls")
    val fields = sigs.map((m, s) =>
      (m, check(defs.find(_._1 == m).get._2, subst(s, tvar, ty), inner)))
    val withDicts = params.foldRight[Expr](Record(fields)) {
      case ((b, cs), e) =>
        cs.foldRight(e)((c, e) => Fun(dictName(c, b), dictT(c, VarT(b), tenv), e))
    }
    val dict = params.foldRight(withDicts) { case ((b, _), e) => TypeAbs(b, Nil, e) }
    val name = instName(cls, ty)
    (tenv.copy(insts = tenv.insts :+ InstInfo(name, params, cls, ty)), List(name -> dict))
```

인스턴스는 몸통을 검사한 **뒤에** 등록하므로, 인스턴스 몸통에서는 그보다 앞에 선언된 인스턴스만 쓸 수 있습니다. 이 언어에는 재귀가 없으니 충분합니다. 하지만 Haskell의 `instance Eq a => Eq [a]`에서 `xs == ys`는 `Eq [a]` 자기 자신을 씁니다. 이런 인스턴스를 지원하려면 딕셔너리를 재귀적으로 정의해야 합니다(연습 문제).

### 프로그램

프로그램은 선언을 차례로 처리하며 타입 환경을 넓히고, 마지막 식을 그 환경에서 검사합니다. 선언이 내놓은 정의들은 `val`로 이어 붙여 식 앞에 둡니다. 선언 하나를 검사해 정의 목록 \\(\overline{b}\\)(\\(x = e\\) 꼴)와 넓어진 환경 \\(\Gamma'\\)를 얻는 것을 \\(\Gamma \vdash \mathit{decl} \rightsquigarrow \overline{b}, \Gamma'\\)로 쓰면 다음과 같습니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma\_{i-1} \vdash \mathit{decl}\_i \rightsquigarrow \overline{b}\_i, \Gamma\_i \quad (1 \leq i \leq n,\ \Gamma\_0 = \varnothing)$}
\AxiomC{$\Gamma\_n \vdash e : \tau \rightsquigarrow e'$}
\LeftLabel{$\tau\texttt{-Program}$}
\BinaryInfC{$\vdash \mathit{decl}\_1 \cdots \mathit{decl}\_n\ e : \tau \rightsquigarrow \mathtt{val}\ \overline{b}\_1;\ \cdots;\ \mathtt{val}\ \overline{b}\_n;\ e'$}
\end{prooftree}
\\]

```scala
def typeCheckProgram(prog: Program): (Type, Expr, TypeEnv) =
  val (tenv, binds) = prog.decls.foldLeft((TypeEnv(), List[(String, Expr)]())) {
    case ((te, bs), d) =>
      val (te1, bs1) = checkDecl(d, te)
      (te1, bs ++ bs1)
  }
  val (ty, body) = typeCheck(prog.body, tenv)
  (ty, binds.foldRight(body) { case ((x, e), b) => Val(x, e, b) }, tenv)
```

## 예제

### 번역 따라가기

이 장 맨 앞의 예제를 번역해 봅시다. 먼저 `neq`의 몸통에서 `eq[T]`를 검사하는 부분입니다. 몸통은 \\(\Gamma\_1 = \Gamma[T : \mathtt{Eq}][x : T][y : T]\\)에서 검사하고, \\(\Gamma\\)에는 클래스 선언이 넣어 둔 \\(\mathtt{eq} : \forall T.\mathtt{Eq}\ T \Rightarrow T \to T \to \mathtt{bool}\\)이 있습니다. 먼저 `eq` 자체의 유도를 \\(\mathcal{D}\_1\\)이라고 합시다.

\\[
\mathcal{D}\_1 = 
\begin{prooftree}
\AxiomC{$\mathtt{eq} \in \text{Dom}(\Gamma\_1)$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma\_1 \vdash \mathtt{eq} : \forall T.\mathtt{Eq}\ T \Rightarrow T \to T \to \mathtt{bool} \rightsquigarrow \mathtt{eq}$}
\end{prooftree}
\\]

그러면 `eq[T]`의 유도는 다음과 같습니다.

\\[
\begin{prooftree}
\AxiomC{$\mathcal{D}\_1$}
\AxiomC{$\Gamma\_1 \vdash T$}
\AxiomC{$\Gamma\_1(T) = \mathtt{Eq}$}
\LeftLabel{$\texttt{Ent-Var}$}
\UnaryInfC{$\Gamma\_1 \Vdash \mathtt{Eq}\ T \rightsquigarrow d\_{\mathtt{Eq},T}$}
\LeftLabel{$\tau\texttt{-TypeApp}$}
\TrinaryInfC{$\Gamma\_1 \vdash \mathtt{eq}[T] : T \to T \to \mathtt{bool} \rightsquigarrow \mathtt{eq}[T]{}(d\_{\mathtt{Eq},T})$}
\end{prooftree}
\\]

`eq[T]`의 딕셔너리는 가정에서 왔습니다(\\(\texttt{Ent-Var}\\)). 그리고 \\(\tau\texttt{-TypeAbs}\\)가 몸통 바깥에 \\(\lambda d\_{\mathtt{Eq},T}\\)를 씌워 이 이름을 묶어 줍니다. 반면 맨 아래 `neq[(Number, Bool)]`의 딕셔너리는 앞에서 본 \\(\texttt{Ent-Inst}\\) 유도로 인스턴스들을 조립해 만듭니다.

구현으로 번역한 전체 결과는 다음과 같습니다. (출력을 보기 좋게 줄만 바꾸었습니다.)

```ptfae
/* PTFAE */
val eq = forall[T] (d: {eq: T => T => Bool}) => d.eq;
val instEqNumber = {eq = (x: Number) => (y: Number) => x == y};
val instEqBool = {eq = (x: Bool) => (y: Bool) =>
                    if (x) y else (if (y) false else true)};
val instEqPair = forall[A] forall[B]
  (dEqA: {eq: A => A => Bool}) => (dEqB: {eq: B => B => Bool}) =>
  {eq = (p: (A, B)) => (q: (A, B)) =>
          if (eq[A](dEqA)(p.1)(q.1)) eq[B](dEqB)(p.2)(q.2) else false};
val neq = forall[T] (dEqT: {eq: T => T => Bool}) =>
  (x: T) => (y: T) => if (eq[T](dEqT)(x)(y)) false else true;
neq[(Number, Bool)](instEqPair[Number][Bool](instEqNumber)(instEqBool))
  ((1, true))((1, false))
```

타입 클래스의 흔적이 하나도 남지 않았습니다. 레코드와 함수, 타입 추상화만 있는 평범한 \\(\mathsf{PTFAE}\\) 프로그램입니다. 이 프로그램은 \\(\mathsf{PTFAE}\\)의 타입 검사기를 통과하고(타입은 `Bool`), 실행하면 `true`가 나옵니다. 실행 과정을 따라가 보면, `instEqPair[Number][Bool](instEqNumber)(instEqBool)`이 쌍 비교용 딕셔너리 레코드를 만들고, `neq`는 그 안의 `eq`로 `(1, true)`와 `(1, false)`를 비교합니다. 쌍의 `eq`는 첫 성분을 `dEqA`, 즉 `instEqNumber`로 비교하고(`1 == 1`이므로 `true`), 둘째 성분을 `dEqB`, 즉 `instEqBool`로 비교해(`false`) 결국 `false`를 돌려주고, `neq`는 이를 뒤집어 `true`를 돌려줍니다.

### 제약이 둘인 함수

제약이 여러 개면 딕셔너리도 여러 개입니다. 순서 비교 클래스 `Ord`를 더해 "작거나 같다" 함수 `le`를 만들어 봅시다. (앞의 `Eq` 선언들이 있다고 합시다.)

```tcfae
/* TCFAE */
class Ord[T] { lt: T => T => Bool }
instance Ord[Number] { lt = (x: Number) => (y: Number) => x < y }
val le = forall[T: Eq + Ord] (x: T) => (y: T) => if (lt[T](x)(y)) true else eq[T](x)(y);
le[Number](3)(3)     // true
```

`le`의 타입은 \\(\forall T.(\mathtt{Eq}\ T, \mathtt{Ord}\ T) \Rightarrow T \to T \to \mathtt{bool}\\)이고, 번역 결과는 딕셔너리 두 개를 제약 순서대로 받습니다.

```ptfae
/* PTFAE */
val le = forall[T] (dEqT: {eq: T => T => Bool}) => (dOrdT: {lt: T => T => Bool}) =>
  (x: T) => (y: T) => if (lt[T](dOrdT)(x)(y)) true else eq[T](dEqT)(x)(y);
le[Number](instEqNumber)(instOrdNumber)(3)(3)
```

### 거부되는 프로그램

번역이 실패하는 곳이 곧 타입 오류가 나는 곳입니다. 다음 세 프로그램을 봅시다. (역시 앞의 `Eq` 선언들이 있다고 합시다.)

```tcfae
/* TCFAE */
eq[Number => Number]((x: Number) => x)((x: Number) => x + 0)
// no instance: Eq[Number => Number]
```

함수 타입의 `Eq` 인스턴스가 없으므로 \\(\Gamma \Vdash \mathtt{Eq}\ (\mathtt{num} \to \mathtt{num}) \rightsquigarrow d\\)를 만족하는 \\(d\\)가 없습니다. \\(\tau\texttt{-TypeApp}\\)의 전제를 만족할 수 없으니 타입 오류입니다. 두 함수가 같은지 판정하는 일반적인 방법은 없으므로, 이 오류는 정확히 우리가 원하는 것입니다.

```tcfae
/* TCFAE */
forall[T] (x: T) => eq[T](x)(x)
// no instance: Eq[T]
```

`T`에 제약이 없으므로 \\(\texttt{Ent-Var}\\)를 쓸 수 없고, `T`는 타입 변수라서 어떤 인스턴스와도 맞지 않습니다. 앞에서 본 매개변수성 그대로입니다. 아무 타입이나 될 수 있는 `T`에 대해서는 같음 비교조차 할 수 없습니다. `forall[T: Eq]`로 고치면 통과합니다.

```tcfae
/* TCFAE */
class Eq[T] { eq: T => T => Bool }
instance [A, B] Eq[(A, B)] {
  eq = (p: (A, B)) => (q: (A, B)) => eq[A](p.1)(q.1)
}
1
// no instance: Eq[A]
```

인스턴스에 조건 `A: Eq`를 빠뜨렸습니다. 인스턴스 몸통은 `A`와 `B`에 아무 제약도 없는 환경에서 검사하므로, 이번에도 `eq[A]`의 딕셔너리를 찾을 수 없습니다. 인스턴스의 조건은 몸통에서 쓸 수 있는 가정이고, 동시에 그 인스턴스를 쓰는 쪽이 채워 주어야 할 의무입니다.

## 의미와 타입 안전성

### 번역으로 정의하는 의미

\\(\mathsf{TCFAE}\\) 프로그램의 의미는 번역 결과의 의미로 정의합니다. 즉 따로 인터프리터를 만들지 않고, 번역한 뒤 \\(\mathsf{PTFAE}\\)의 자연 의미로 계산합니다.

\\[
\begin{prooftree}
\AxiomC{$\vdash P : \tau \rightsquigarrow e'$}
\AxiomC{$\varnothing \vdash e' \Rightarrow v$}
\LeftLabel{$\texttt{Program}$}
\BinaryInfC{$\vdash P \Rightarrow v$}
\end{prooftree}
\\]

<div style="text-align:center">
<svg viewBox="0 0 620 170" width="100%" style="max-width: 620px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="TCFAE 프로그램은 타입 검사와 번역을 거쳐 타입 τ와 PTFAE 프로그램 e'이 되고, PTFAE 인터프리터가 e'을 계산해 값 v를 얻는다. PTFAE 타입 검사기로 e'을 검사하면 타입 |τ|가 나온다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14" fill="currentColor">
<defs><marker id="type-classes-3" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="10" y="40" width="120" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="70" y="60" text-anchor="middle">TCFAE</text>
<text x="70" y="77" text-anchor="middle" font-size="13">프로그램 P</text>
<polyline points="130,62 238,62" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#type-classes-3)"/>
<rect x="138" y="10" width="96" height="26" rx="3" fill="#2a408e"/>
<text x="186" y="28" text-anchor="middle" fill="#fff" font-size="13">타입 검사·번역</text>
<rect x="240" y="40" width="120" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="300" y="60" text-anchor="middle">PTFAE</text>
<text x="300" y="77" text-anchor="middle" font-size="13">프로그램 e'</text>
<polyline points="360,62 478,62" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#type-classes-3)"/>
<rect x="381" y="10" width="76" height="26" rx="3" fill="#2a408e"/>
<text x="419" y="28" text-anchor="middle" fill="#fff" font-size="13">interp</text>
<rect x="480" y="40" width="120" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="540" y="67" text-anchor="middle">값 v</text>
<polyline points="70,84 70,124" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#type-classes-3)"/>
<text x="70" y="146" text-anchor="middle">타입 τ</text>
<polyline points="300,84 300,124" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#type-classes-3)"/>
<text x="300" y="146" text-anchor="middle">타입 |τ|</text>
<text x="310" y="108" font-size="12.5">PTFAE typeCheck</text>
<line x1="110" y1="141" x2="262" y2="141" stroke="currentColor" stroke-width="1.2" stroke-dasharray="4 3"/>
<text x="186" y="160" text-anchor="middle" font-size="12.5">번역이 타입을 보존</text>
</svg>
</div>
<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: TCFAE의 의미는 번역 결과의 의미</p>

구현도 정의 그대로입니다. 검증 삼아 번역 결과를 \\(\mathsf{PTFAE}\\)의 타입 검사기로 다시 검사해, 그 타입이 \\(|\tau|\\)와 같은지도 확인합니다.

```scala
// the meaning of a TCFAE program: elaborate, then run in PTFAE
def eval(src: String): String =
  val (ty, target, tenv) = typeCheckProgram(Parser(src))
  val tty = PTFAE.typeCheck(target, PTFAE.TEnv())
  mustSame(tty, trans(ty, tenv))   // the translation preserves types
  s"${PTFAE.interp(target, Map()).str} : ${ty.str}"
```

이 장의 예제들을 실행하면 모두 `true : Bool`이 나옵니다. 마지막 식 대신 `neq`만 두면 `<type-abstraction> : [T: Eq] T => T => Bool`처럼 제약 있는 타입이 나오고, 그 번역 결과의 \\(\mathsf{PTFAE}\\) 타입은 딕셔너리를 받는 \\(|\tau|\\)입니다.

이렇게 언어의 의미를 다른 언어로의 번역으로 정하는 방식은 처음이 아닙니다. 문법 설탕을 \\(\mathcal{D}⟦\cdot⟧\\)로 풀 때나 [컨티뉴에이션으로 컴파일하기](./compiling-with-continuations.md)에서도 같은 생각을 썼습니다. 다른 점은, 이번 번역은 **타입 검사의 결과에 의존한다**는 것입니다. 문법 설탕은 구문만 보고 풀 수 있었지만, 딕셔너리 전달은 타입을 알아야만 할 수 있습니다. 그래서 타입 검사를 통과하지 못한 프로그램에는 의미가 아예 없습니다.

### 타입 안전성

\\(\mathsf{TCFAE}\\)의 타입 안전성은 무엇을 뜻할까요? 의미가 번역으로 정해지므로, "타입 검사를 통과한 프로그램의 번역 결과가 실행 중 타입 오류를 일으키지 않는다"는 뜻입니다. 이것은 두 사실로부터 나옵니다.

1. **번역이 타입을 보존한다.** \\(\Gamma \vdash e : \tau \rightsquigarrow e'\\)이면 \\(\mathsf{PTFAE}\\)에서 \\(|\Gamma| \vdash e' : |\tau|\\)입니다. 여기서 \\(|\Gamma|\\)는 \\(\Gamma\\)의 변수 타입을 모두 번역하고, \\(\Gamma\\)에 가정된 제약 \\(\alpha : \overline{C}\\)마다 \\(d\_{C,\alpha} : D\_C(\alpha)\\)를, 인스턴스 정보 \\(x : \forall\overline{\beta}.(C'\_1\ \beta'\_1, \ldots, C'\_m\ \beta'\_m) \Rightarrow C\ \tau\_h\\)마다 \\(x : \forall\overline{\beta}.D\_{C'\_1}(\beta'\_1) \to \cdots \to D\_{C'\_m}(\beta'\_m) \to D\_C(\tau\_h)\\)를 더한 환경입니다. 핵심 보조 정리는 함의에 대한 것입니다. \\(\Gamma \Vdash C\ \tau \rightsquigarrow d\\)이면 \\(|\Gamma| \vdash d : D\_C(|\tau|)\\), 즉 **해소가 찾아 준 딕셔너리는 언제나 올바른 타입의 딕셔너리**라는 것입니다. \\(\texttt{Ent-Var}\\)는 \\(|\Gamma|\\)에 넣어 둔 \\(d\_{C,\alpha}\\)가 다른 이름에 가려지지 않는다는 가정 덕분에, \\(\texttt{Ent-Inst}\\)는 인스턴스 선언을 검사할 때 몸통의 타입을 클래스의 약속과 맞춰 본 덕분에 성립합니다. 나머지 규칙은 규칙마다 확인하면 됩니다.
2. **\\(\mathsf{PTFAE}\\)는 안전하다.** 레코드, 불, 쌍을 더해도 [매개변수 다형성](./parametric-polymorphism.md)에서 본 타입 안전성은 그대로 성립합니다.

두 사실을 이으면, 타입 검사를 통과한 \\(\mathsf{TCFAE}\\) 프로그램의 번역 결과는 타입이 \\(|\tau|\\)인 올바른 \\(\mathsf{PTFAE}\\) 프로그램이고, 따라서 실행 중 타입 오류를 일으키지 않습니다. 구현의 `eval`이 확인하는 `mustSame(tty, trans(ty, tenv))`가 바로 첫째 사실을 예제마다 시험해 보는 것입니다.

어떤 규칙을 잘못 바꾸면 이 성질이 깨지는지 보면 규칙의 각 부분이 왜 필요한지 알 수 있습니다.

- **인스턴스 몸통의 타입을 확인하지 않으면.** `instance Eq[Number] { eq = (x: Number) => x }`를 받아들인다고 해 봅시다. 그러면 `instEqNumber`는 `{eq: Number => Number}` 타입의 레코드가 되고, `eq[Number](1)(2)`는 번역되어 `instEqNumber`의 `eq` 필드에 `1`과 `2`를 차례로 넘기므로, 결국 `1(2)`를 계산하다가 실행 중 오류를 냅니다. 함의 보조 정리의 "올바른 타입의 딕셔너리"가 깨진 것입니다. 우리 구현은 이 프로그램을 `type mismatch: Number => Number != Number => Number => Bool`로 거부합니다.
- **인스턴스의 조건을 몸통에 가정으로 넣지 않거나, 해소할 때 조건을 확인하지 않으면.** 앞의 "자주 하는 실수"에서 본 대로 딕셔너리 식을 완성할 수 없게 되거나, 있지도 않은 딕셔너리 변수를 참조하게 됩니다.
- **타입 변수 재정의를 허용하면.** `forall[T: Eq] (x: T) => forall[T: Eq] (y: T) => eq[T](x)(y)`를 생각해 봅시다. 타입 검사기는 `x`와 `y`의 타입을 둘 다 `T`라고 보므로 이 식을 받아들이고, `eq[T]`에는 안쪽 `T`의 딕셔너리를 넘깁니다. 그런데 이것을 `[Number](1)[Bool](true)`로 쓰면, 바깥 `T`의 값인 `1`이 `instEqBool`의 `eq`에 들어가 `if (1) ...`을 계산하다가 실행 중 오류(`not a boolean: 1`)가 납니다. \\(\mathsf{PTFAE}\\)에서 본 포획 문제가 딕셔너리와 함께 다시 나타나는 셈이고, 그래서 \\(\tau\texttt{-TypeAbs}\\)의 \\(\alpha \notin \text{Dom}(\Gamma)\\) 조건이 여기서도 필요합니다.

### 타입이 실행에 영향을 준다

[매개변수 다형성](./parametric-polymorphism.md)의 인터프리터에서 타입 인자는 실행에 전혀 쓰이지 않았습니다. 타입을 모두 지워도 프로그램의 결과가 같았지요. 이 성질을 타입 소거(type erasure)라고 합니다.

\\(\mathsf{TCFAE}\\)에서는 사정이 다릅니다. `eq[Number](1)(1)`과 `eq[Bool](true)(true)`에서 어떤 코드가 실행될지는 타입 인자에 따라 달라집니다. 타입 인자를 지우면 어느 `eq`를 불러야 할지 알 수 없습니다. 딕셔너리 전달은 이 문제를 **타입을 값으로 바꾸어** 풉니다. 실행에 필요한 타입 정보, 즉 "이 타입의 `eq`는 이 코드다"라는 정보만 딕셔너리라는 값으로 만들어 넘기고, 나머지 타입은 \\(\mathsf{PTFAE}\\)에서처럼 지워도 됩니다.

> **생각해 보기.** 딕셔너리 대신 타입 자체를 실행 중에 넘기고, `eq`가 넘겨받은 타입을 보고 `match`로 코드를 고르게 할 수도 있습니다. 이 방식과 딕셔너리 전달을 비교해 보세요. 프로그램에 새 인스턴스를 더할 때 어느 쪽이 기존 코드를 고치지 않아도 될까요?

## 일관성, 모호성, 추론

지금까지 만든 \\(\mathsf{TCFAE}\\)는 일부러 단순하게 설계했습니다. 실제 언어에서는 이 단순함이 깨지는 지점마다 중요한 설계 결정이 숨어 있습니다.

### 일관성

인스턴스 선언에서 겹침 검사를 빼면 어떻게 될까요?

```tcfae
/* TCFAE */
class Eq[T] { eq: T => T => Bool }
instance Eq[Number] { eq = (x: Number) => (y: Number) => x == y }
instance Eq[Number] { eq = (x: Number) => (y: Number) => true }
eq[Number](1)(2)
```

`Eq[Number]`를 해소할 수 있는 인스턴스가 둘입니다. 첫째를 고르면 결과는 `false`, 둘째를 고르면 `true`입니다. 두 번역 모두 타입은 올바르므로 타입 안전성은 깨지지 않습니다. 하지만 **같은 프로그램의 의미가 타입 검사기가 어느 유도를 고르느냐에 따라 달라집니다.** 의미가 하나로 정해지지 않는 것입니다.

타입 검사를 통과한 프로그램의 번역이 여러 가지일 수 있더라도 그 의미는 모두 같다는 성질을 일관성(coherence)이라고 합니다. 가장 간단하게 일관성을 보장하는 방법은 \\(\mathsf{TCFAE}\\)처럼 **한 타입에 대해 한 클래스의 인스턴스는 많아야 하나**로 제한하는 것입니다. 그러면 인스턴스 해소의 유도가 하나뿐이므로 번역도 하나뿐입니다. 우리 구현은 위 프로그램을 `overlapping instance: Eq[Number]`로 거부합니다.

일관성은 단순히 깔끔함의 문제가 아닙니다. Haskell의 `Data.Set`은 원소를 `Ord` 인스턴스의 순서대로 정렬된 트리에 저장합니다. 만약 같은 타입에 `Ord` 인스턴스가 두 개 있어서, 집합을 만들 때와 원소를 찾을 때 서로 다른 인스턴스가 쓰인다면 어떻게 될까요? 오름차순으로 만든 트리에서 내림차순 기준으로 원소를 찾게 되어, 분명히 들어 있는 원소를 못 찾게 됩니다. 타입 오류는 아니지만 자료 구조의 불변식이 조용히 깨지는 것입니다.

### 겹치는 인스턴스와 고아 인스턴스

일관성을 지키는 방법은 언어마다 다릅니다.

**Haskell**은 원칙적으로 프로그램 전체에서 한 타입에 한 인스턴스만 허용합니다. 그런데 "일반적인 인스턴스와 더 구체적인 인스턴스"를 함께 두고 싶을 때가 있습니다. 예를 들어 모든 리스트의 `Show`와 문자 리스트(문자열)의 `Show`를 따로 두는 것입니다. 이런 <a id="g-overlapping-instance"></a>겹치는 인스턴스(overlapping instance)는 GHC 확장(`{-# OVERLAPPING #-}` 같은 표시)으로만 허용되고, 더 구체적인 쪽을 고르는 규칙이 따로 있습니다. 또 클래스도 타입도 정의하지 않은 모듈에서 선언한 인스턴스를 <a id="g-orphan-instance"></a>고아 인스턴스(orphan instance)라고 하는데, 서로 모르는 두 라이브러리가 같은 고아 인스턴스를 선언하면 둘을 함께 쓸 수 없게 되므로 GHC는 이를 경고합니다.

**Rust**는 이 문제를 언어 규칙으로 엄격하게 막습니다. 겹치는 `impl`은 거부하고,

```rust
// Rust
trait Show { fn show(&self) -> String; }
impl<T> Show for T { fn show(&self) -> String { String::from("?") } }
impl Show for i32 { fn show(&self) -> String { self.to_string() } }
// error[E0119]: conflicting implementations of trait `Show` for type `i32`
```

<a id="g-orphan-rule"></a>고아 규칙(orphan rule)으로 트레이트와 타입 중 적어도 하나가 현재 크레이트(crate)에 정의된 경우에만 `impl`을 허용합니다.

```rust
// Rust
use std::fmt;
impl fmt::Display for Vec<i32> { /* ... */ }
// error[E0117]: only traits defined in the current crate can be
//               implemented for types defined outside of the crate
```

덕분에 어떤 크레이트들을 조합하더라도 한 타입에 한 트레이트의 `impl`이 둘 생기는 일이 없습니다. Rust도 이 전역적인 성질을 트레이트 일관성(coherence)이라고 부릅니다.

**Scala**는 반대 방향을 택했습니다. `given`은 보통의 값이라서 지역적으로 정의하거나 `import`로 가져올 수 있고, 여러 후보가 있으면 범위와 우선순위 규칙으로 하나를 고르며, 직접 `using`으로 넘길 수도 있습니다. 같은 타입에 여러 인스턴스를 상황에 따라 골라 쓸 수 있어 유연하지만, 그만큼 일관성은 보장되지 않습니다. 그래서 Scala 라이브러리는 대개 딕셔너리를 자료 구조 안에 **저장**하는 방식으로 앞의 집합 문제를 피합니다.

```scala
// Scala 3
import scala.collection.immutable.TreeSet
val s1 = TreeSet(3, 1, 2)                               // Ordering[Int]
val s2 = TreeSet(3, 1, 2)(using Ordering.Int.reverse)   // reversed order
s1.toList   // List(1, 2, 3)
s2.toList   // List(3, 2, 1)
```

`TreeSet`은 만들 때 받은 `Ordering` 딕셔너리를 안에 들고 다니므로, 이후 연산은 늘 같은 순서를 씁니다.

### 모호성

Haskell에서 다음 함수는 타입 오류입니다.

```haskell
-- Haskell
f :: String -> String
f s = show (read s)
-- error: Ambiguous type variable 'a0' arising from a use of 'show'
--        prevents the constraint '(Show a0)' from being solved.
```

`read :: Read a => String -> a`는 문자열을 읽어 `a` 타입의 값을 만들고, `show :: Show a => a -> String`은 그 값을 다시 문자열로 만듭니다. 그런데 중간의 `a`가 무엇인지 정해 줄 단서가 어디에도 없습니다. 함수의 타입 `String -> String`에도 `a`는 나타나지 않습니다. `a`가 `Int`이면 `"1"`을 읽어 `"1"`을 내놓고, `Bool`이면 `"1"`을 읽다가 실패하니, `a`를 무엇으로 정하느냐에 따라 의미가 달라집니다. 즉 어떤 딕셔너리를 넘길지 정할 수 없습니다. 이처럼 제약에만 나타나고 타입에는 나타나지 않는 타입 변수 때문에 번역이 정해지지 않는 상황을 모호성(ambiguity)이라고 하며, Haskell은 이런 프로그램을 거부합니다. `show (read s :: Int)`처럼 타입을 적어 주면 해결됩니다.

다만 Haskell에는 수 클래스에 한해 <a id="g-defaulting"></a>기본 타입 지정(defaulting) 규칙이 있어서, `show (read "1" + 1)`처럼 `Num` 제약이 함께 붙은 경우에는 `a`를 `Integer`로 정하고 `"2"`를 내놓습니다. 편리하지만 언어 규칙에 특별한 예외를 하나 더 두는 셈입니다.

\\(\mathsf{TCFAE}\\)에는 모호성이 없습니다. 타입 인자를 모두 명시적으로 쓰므로, 문자열과 `Read`, `Show` 클래스가 있었다면 `show[Int](read[Int](s))`처럼 중간 타입이 항상 적혀 있었을 것이기 때문입니다. 모호성은 타입 인자를 **추론**할 때 생기는 문제입니다.

### 타입 추론과 제약

Haskell 프로그래머는 `forall`도, 타입 인자도, 대부분의 타입 표기도 쓰지 않습니다. [타입 추론](./type-inference.md)에서 본 let-다형성 추론에 제약을 더한 방식으로 이것들을 모두 찾아내기 때문입니다. 간단히 말하면 다음과 같습니다.

- 추론하는 동안 타입 변수에 대한 단일화 제약과 함께 `Eq α` 같은 **클래스 제약**도 모읍니다. `x == y`를 만나면 `x`와 `y`의 타입이 같다는 제약과 그 타입이 `Eq`에 속해야 한다는 제약이 함께 생깁니다.
- `val`(Haskell의 `let`)에서 타입을 일반화할 때, 일반화하는 타입 변수에 걸린 클래스 제약을 타입 스킴 안으로 옮겨 \\(\forall\alpha.\mathtt{Eq}\ \alpha \Rightarrow \alpha \to \alpha \to \mathtt{bool}\\) 같은 한정 타입 스킴을 만듭니다. 이때 \\(\mathsf{TCFAE}\\)의 \\(\tau\texttt{-TypeAbs}\\)처럼 딕셔너리 매개변수를 끼워 넣습니다.
- 식별자를 인스턴스화할 때 새 타입 변수에 걸린 제약은, 단일화가 끝나 타입이 정해진 뒤 인스턴스 해소로 풉니다. 이때 \\(\tau\texttt{-TypeApp}\\)처럼 딕셔너리 인자를 끼워 넣습니다.
- 일반화할 때 제약에는 있지만 타입에는 나타나지 않는 타입 변수가 남으면, 그것이 바로 앞의 모호성입니다.

이 체계를 정리한 것이 Mark P. Jones의 한정 타입(qualified types) 이론입니다. \\(\mathsf{TCFAE}\\)는 이 추론이 **끝난 뒤의 모습**, 즉 추론기가 찾아 준 타입 인자와 제약을 모두 적어 넣은 프로그램이라고 볼 수 있습니다.

## 실제 언어의 타입 클래스

### 딕셔너리와 가상 메서드 테이블

딕셔너리는 객체 지향 언어의 <a id="g-virtual-method-table"></a>가상 메서드 테이블(virtual method table, vtable)과 아주 닮았습니다. 둘 다 "이 타입의 메서드 구현들"을 담은 표입니다. 결정적인 차이는 그 표가 **어디에** 붙어 있느냐입니다.

<div style="text-align:center">
<svg viewBox="0 0 640 230" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="왼쪽: 객체 지향에서는 각 객체가 자기 vtable을 가리키는 포인터를 들고 다닌다. 오른쪽: 타입 클래스에서는 값 1과 2는 그냥 값이고, Eq[Number] 딕셔너리는 값과 따로 함수 neq에 인자로 전달된다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14" fill="currentColor">
<defs><marker id="type-classes-4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="156" y="22" text-anchor="middle" font-weight="bold">가상 메서드 테이블</text>
<rect x="20" y="50" width="110" height="84" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="75" y="44" text-anchor="middle" font-size="13">객체 p</text>
<text x="34" y="74" font-family="ui-monospace, Menlo, monospace" font-size="13">vptr</text>
<line x1="20" y1="84" x2="130" y2="84" stroke="currentColor" stroke-width="1"/>
<text x="34" y="104" font-family="ui-monospace, Menlo, monospace" font-size="13">x = 1</text>
<text x="34" y="124" font-family="ui-monospace, Menlo, monospace" font-size="13">y = 2</text>
<circle cx="110" cy="69" r="3"/>
<polyline points="110,69 170,69" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#type-classes-4)"/>
<rect x="172" y="50" width="120" height="58" rx="4" fill="#2a408e"/>
<text x="232" y="44" text-anchor="middle" font-size="13">Point의 vtable</text>
<text x="186" y="74" font-family="ui-monospace, Menlo, monospace" font-size="13" fill="#fff">equals</text>
<text x="186" y="96" font-family="ui-monospace, Menlo, monospace" font-size="13" fill="#fff">hashCode</text>
<text x="156" y="168" text-anchor="middle" font-size="13">값마다 표를 들고 다닌다</text>
<text x="156" y="188" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">p.equals(q)</text>
<line x1="320" y1="15" x2="320" y2="215" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.6"/>
<text x="485" y="22" text-anchor="middle" font-weight="bold">딕셔너리 전달</text>
<rect x="350" y="56" width="44" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="372" y="77" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">1</text>
<rect x="404" y="56" width="44" height="32" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="426" y="77" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">2</text>
<text x="399" y="44" text-anchor="middle" font-size="13">그냥 값</text>
<rect x="490" y="50" width="130" height="44" rx="4" fill="#2a408e"/>
<text x="555" y="44" text-anchor="middle" font-size="13">instEqNumber</text>
<text x="555" y="77" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13" fill="#fff">{eq = ...}</text>
<rect x="400" y="130" width="180" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="490" y="152" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">neq[Number]</text>
<polyline points="555,94 520,128" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#type-classes-4)"/>
<polyline points="399,88 460,128" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#type-classes-4)"/>
<text x="485" y="188" text-anchor="middle" font-size="13">표는 값과 따로, 함수에 넘긴다</text>
<text x="485" y="208" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">neq[Number](instEqNumber)(1)(2)</text>
</svg>
</div>
<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: vtable은 값에 붙어 다니고, 딕셔너리는 값과 따로 전달된다</p>

vtable은 **값마다** 붙어 있습니다. 그래서 메서드를 부르려면 그 표를 들고 있는 받는 객체가 있어야 하고, 두 객체를 비교할 때는 `p`의 표만 보게 되어 `q`가 같은 타입이라는 보장이 없습니다. 반면 딕셔너리는 값과 **따로**, 타입마다 하나씩 전달됩니다. 그래서 같은 딕셔너리 하나로 같은 타입의 두 값을 다룰 수 있고(이항 메서드), 값이 아예 없어도 딕셔너리만 있으면 메서드를 부를 수 있습니다(`zero`, `read` 같은 반환 타입 다형성). 앞에서 본 서브타입 다형성의 세 가지 어려움 중 둘이 이 차이에서 풀립니다. 나머지 하나인 "나중에 덧붙이기"는 인스턴스 선언이 타입 정의와 떨어져 있다는 점에서 풀립니다. 객체 지향의 클래스와 메서드 찾기는 [클래스와 상속](./classes.md)에서 더 자세히 다룹니다.

### Haskell, Scala, Rust

- **Haskell**은 이 장의 \\(\mathsf{TCFAE}\\)에 가장 가깝습니다. GHC는 실제로 타입 클래스를 딕셔너리 전달로 번역합니다. 여기에 슈퍼클래스(superclass, `class Eq a => Ord a`: 모든 `Ord` 인스턴스는 `Eq` 인스턴스이기도 하다), 기본 메서드 구현, `deriving`에 의한 인스턴스 자동 생성, 여러 타입 매개변수를 받는 클래스 같은 기능이 더해집니다. 성능을 위해 GHC는 자주 쓰이는 타입에 대해 함수를 <a id="g-specialization"></a>특수화(specialization)해서 딕셔너리 전달을 없애기도 합니다.
- **Scala**는 타입 클래스를 언어의 별도 기능으로 두지 않고, 트레이트(딕셔너리의 타입), `given`(딕셔너리 값), `using`(딕셔너리 매개변수)이라는 보다 일반적인 장치로 **딕셔너리 전달 자체를** 언어에 드러냈습니다. Scala 2에서는 같은 일을 `implicit`으로 했습니다. 이 장의 번역 결과를 프로그래머가 직접 쓰되, 인자 채우기만 컴파일러에 맡기는 셈입니다. 그래서 유연하지만 일관성은 프로그래머가 책임져야 합니다.
- **Rust**의 트레이트는 타입 클래스와 거의 같은 설계이고, 앞에서 본 것처럼 일관성을 엄격하게 지킵니다. 구현 방식은 다릅니다. `fn display<T: Show>(x: &T)` 같은 제네릭 함수는 딕셔너리를 넘기는 대신 쓰이는 타입마다 함수를 따로 만들어 컴파일하는 <a id="g-monomorphization"></a>단형화(monomorphization)를 씁니다. 딕셔너리 인자가 컴파일 시간에 상수로 정해져 모두 인라인되는 것과 같습니다. 반면 `&dyn Show` 같은 트레이트 객체는 값과 vtable 포인터를 함께 들고 다니는 객체 지향 방식으로 구현됩니다.

Java와 TypeScript에는 타입 클래스가 없습니다. 비슷한 일을 하려면 `Comparator<T>` 같은 딕셔너리 객체를 직접 만들어 인자로 넘겨야 합니다. 말하자면 손으로 하는 딕셔너리 전달입니다.

### 매개변수 다형성과의 관계

타입 클래스는 매개변수 다형성을 버리는 것이 아니라 **정제하는** 것입니다. \\(\forall\alpha.\tau\\)는 "모든 타입 \\(\alpha\\)"를, \\(\forall\alpha.\mathtt{Eq}\ \alpha \Rightarrow \tau\\)는 "`Eq`에 속하는 모든 타입 \\(\alpha\\)"를 뜻합니다. 범위를 좁힌 대신 그 범위의 타입들이 공통으로 갖는 연산을 쓸 수 있게 되었습니다. 그리고 번역 결과를 보면, 제약 있는 다형 함수도 결국 **모든 타입에 대해 같은 코드**를 실행합니다. 타입마다 달라지는 부분은 딕셔너리라는 인자로 빠져나갔기 때문입니다. 임시 다형성을 매개변수 다형성과 딕셔너리 인자로 환원했다는 것, 이것이 "임시 다형성을 덜 임시적으로(less ad hoc)" 만든다는 논문 제목의 뜻입니다.

[유계 다형성과 변성](./bounded-polymorphism.md)의 유계 다형성(bounded polymorphism)도 "타입 매개변수에 조건을 붙인다"는 점에서 비슷해 보입니다. 하지만 유계 다형성의 조건은 서브타입 관계(`T extends Comparable<T>`)이고 연산은 값에 붙은 메서드로 찾는 반면, 타입 클래스의 조건은 클래스 소속이고 연산은 따로 전달된 딕셔너리로 찾습니다. Rust의 `T: Show`와 Java의 `T extends Comparable<T>`는 문법이 닮았지만 그 아래 구현은 이렇게 다릅니다.

## 정리

- 임시 다형성은 하나의 이름이 타입마다 다른 코드로 동작하는 다형성입니다. 오버로딩은 다형 함수 안으로 추상화할 수 없고, 매개변수 다형성은 타입을 들여다볼 수 없으며(매개변수성), 서브타입 다형성은 이항 메서드, 반환 타입으로 정해지는 연산, 나중에 덧붙이기에 약합니다.
- 타입 클래스는 클래스 선언(메서드 시그니처), 인스턴스 선언(타입별 구현), 제약 있는 다형 타입 \\(\forall\alpha.\overline{C}\ \alpha \Rightarrow \tau\\)로 이루어집니다. Haskell의 `class`/`instance`, Scala 3의 트레이트와 `given`/`using`, Rust의 트레이트와 `impl`이 모두 같은 구조입니다.
- \\(\mathsf{TCFAE}\\)는 \\(\mathsf{PTFAE}\\)(+ 불, 쌍)에 클래스·인스턴스 선언과 제약 있는 타입 추상화 \\(\forall\alpha\mathtt{:}\overline{C}.e\\)를 더한 언어입니다.
- 의미는 딕셔너리 전달 번역으로 정합니다. 인스턴스는 레코드(조건이 있으면 딕셔너리를 받아 딕셔너리를 만드는 함수)가 되고, 메서드는 선택 함수가 되며, 제약 하나는 딕셔너리 매개변수 하나가 됩니다.
- 번역은 타입 검사와 함께 이루어집니다(\\(\Gamma \vdash e : \tau \rightsquigarrow e'\\)). \\(\tau\texttt{-TypeAbs}\\)는 딕셔너리 매개변수를 만들고, \\(\tau\texttt{-TypeApp}\\)은 인스턴스 해소 \\(\Gamma \Vdash C\ \tau \rightsquigarrow d\\)로 딕셔너리 인자를 채웁니다. 해소는 가정(\\(\texttt{Ent-Var}\\))이나 인스턴스(\\(\texttt{Ent-Inst}\\), 조건은 재귀적으로 해소)에서 딕셔너리를 찾습니다.
- 타입 안전성은 "번역이 타입을 보존한다"와 "\\(\mathsf{PTFAE}\\)는 안전하다"로부터 나옵니다. 핵심은 해소가 언제나 올바른 타입의 딕셔너리를 내놓는다는 것이고, 이를 위해 인스턴스 몸통을 클래스의 약속과 맞춰 검사합니다.
- 일관성은 번역이 여러 가지여도 의미가 같다는 성질로, 한 타입에 인스턴스 하나라는 규칙으로 보장합니다. Haskell은 겹치는 인스턴스와 고아 인스턴스를 제한하고, Rust는 고아 규칙과 겹침 금지로 강제하며, Scala는 유연성을 위해 일관성을 보장하지 않습니다.
- 타입 인자를 추론하면 제약에만 나타나는 타입 변수 때문에 모호성이 생길 수 있습니다(`show (read s)`). 타입 인자를 명시하는 \\(\mathsf{TCFAE}\\)에는 모호성이 없습니다.

## 연습 문제

1. 이 장의 `Eq` 선언들 아래에서 다음 식을 손으로 번역하세요. 인스턴스 해소의 유도 트리도 그리세요.
   - `eq[(Bool, (Number, Number))]`
   - `forall[T: Eq] (x: T) => neq[(T, T)]((x, x))((x, x))` (`neq`는 이 장의 정의를 씁니다.)
2. 반환 타입으로 정해지는 연산을 확인해 봅시다. 클래스 `class Default[T] { default: T }`와 `Number`, `Bool`, 쌍에 대한 인스턴스를 \\(\mathsf{TCFAE}\\)로 쓰고, `default[(Number, (Bool, Number))]`가 어떻게 번역되는지 보이세요. 이 연산을 Java 인터페이스로 표현하기 어려운 이유를 설명하세요.
3. 슈퍼클래스를 더해 봅시다. `class [T: Eq] Ord[T] { lt: T => T => Bool }`처럼 "모든 `Ord` 인스턴스는 `Eq` 인스턴스이기도 하다"는 선언을 허용하려고 합니다.
   - `Ord`의 딕셔너리에 `Eq`의 딕셔너리를 필드로 넣는 번역을 설계하고, \\(D\_{\mathtt{Ord}}(\tau)\\)를 정의하세요.
   - \\(\Gamma(\alpha) = \mathtt{Ord}\\)일 때 \\(\Gamma \Vdash \mathtt{Eq}\ \alpha\\)를 유도할 수 있도록 함의 규칙을 하나 더하고, 그 번역 결과를 쓰세요. 그러면 `forall[T: Ord]`만 써도 몸통에서 `eq[T]`를 쓸 수 있습니다.
   - 인스턴스 선언에는 어떤 검사가 더 필요할까요?
4. 구현에서 인스턴스 겹침 검사를 지우고, `resolve`가 인스턴스 목록에서 **마지막으로** 맞는 인스턴스를 고르도록 바꾸어 보세요. 일관성 절의 예제가 바꾸기 전과 후에 어떤 값을 내놓는지 확인하고, 이것이 타입 안전성과 일관성 중 무엇을 깨는지 설명하세요.
5. Haskell의 `instance Eq a => Eq [a]`처럼 자기 자신을 쓰는 인스턴스를 지원하려면 무엇이 필요할까요? [재귀 함수의 타입](./typing-recursive-functions.md)의 재귀 정의를 이용해, 리스트가 있는 언어에서 이 인스턴스의 딕셔너리가 어떻게 번역될지 쓰세요. 딕셔너리가 "타입 인자와 딕셔너리를 받아 딕셔너리를 만드는 **재귀** 함수"가 된다는 점을 확인하세요.
6. 다음 Scala 코드에서 컴파일러가 채워 넣는 인자를 모두 직접 써서, 인자를 생략하지 않고 같은 결과를 내는 코드로 바꾸세요. 이 장의 번역과 비교해 보세요.
   ```scala
   // Scala 3
   def display[A: Show](a: A): String = "<" + summon[Show[A]].show(a) + ">"
   display(List(List(1), List(2, 3)))
   ```

## 더 읽을거리

- Philip Wadler, Stephen Blott. "How to make ad-hoc polymorphism less ad hoc." POPL 1989. 타입 클래스와 딕셔너리 전달 번역을 처음 제안한 논문입니다. 이 장의 번역 규칙은 이 논문의 생각을 명시적 타입 언어로 옮긴 것입니다.
- Mark P. Jones. *Qualified Types: Theory and Practice*. Cambridge University Press, 1994. 한정 타입과 그 추론, 딕셔너리 번역의 일관성을 체계적으로 다룹니다.
- Cordelia V. Hall, Kevin Hammond, Simon L. Peyton Jones, Philip L. Wadler. "Type classes in Haskell." *ACM TOPLAS*, 1996. Haskell 타입 클래스의 타입 규칙과 번역을 정리한 논문입니다.
- Simon Peyton Jones, Mark Jones, Erik Meijer. "Type classes: an exploration of the design space." Haskell Workshop, 1997. 여러 타입 매개변수, 겹치는 인스턴스 등 설계 선택지를 살펴봅니다.
- Bruno C. d. S. Oliveira, Adriaan Moors, Martin Odersky. "Type classes as objects and implicits." OOPSLA 2010. Scala의 암묵적 인자로 타입 클래스를 표현하는 방법을 다룹니다.
- Steve Klabnik, Carol Nichols. *The Rust Programming Language*. 10장에서 제네릭과 트레이트를 설명합니다.
