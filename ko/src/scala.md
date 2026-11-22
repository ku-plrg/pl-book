# Scala 기초

이 책에서는 여러 언어를 설계하고, 그 언어의 인터프리터를 Scala로 구현합니다. 그러니
프로그래밍 언어의 세계로 들어가기 전에 먼저 도구부터 손에 익혀 두어야겠지요. 이 장에서는
이 책 전체에서 쓰게 될 Scala의 기능을 빠르게 훑어봅니다. Scala의 모든 것을 다루지는
않고, 인터프리터를 구현하는 데 꼭 필요한 부분만 골랐습니다. 더 자세한 내용이 궁금하다면
[Scala 3 Book](https://docs.scala-lang.org/scala3/book/introduction.html)을 참고하세요.

## Scala란

Scala라는 이름은 **Sca**lable **La**nguage(확장 가능한 언어)에서 왔습니다. Scala의 특징을
간단히 정리하면 다음과 같습니다.

- <a id="g-general-purpose"></a>범용(general-purpose) 프로그래밍 언어입니다.
- 자바 가상 머신(Java Virtual Machine, JVM) 위에서 동작합니다. 그래서 Java 라이브러리를
  그대로 가져다 쓸 수 있습니다.
- <a id="g-statically-typed"></a>정적 타입(statically typed) 언어입니다. 프로그램을 실행하기 전에 타입 검사를 합니다.
- <a id="g-object-oriented-programming"></a>객체 지향 프로그래밍(object-oriented programming, OOP) 언어입니다.
- <a id="g-functional-programming"></a>함수형 프로그래밍(functional programming, FP) 언어이기도 합니다.

### REPL로 시작하기

Scala 코드를 가장 쉽게 실행해 보는 방법은 REPL(Read-Eval-Print-Loop)입니다. REPL은 이름
그대로 코드 한 줄을 읽고(read), 계산하고(eval), 결과를 <a id="g-print"></a>출력하는(print) 일을 반복하는(loop)
대화형 환경입니다. 두 가지 방법이 있습니다.

- 웹 브라우저에서 [Scastie](https://scastie.scala-lang.org/)(Scala Playground)를 씁니다.
  아무것도 설치할 필요가 없습니다.
- 내 컴퓨터에 Scala REPL을 설치합니다.
  [설치 안내](https://github.com/ku-plrg-classroom/docs/blob/main/INSTALL.md#scala-repl-optional)를
  따라 하면 됩니다.

REPL에 `1 + 2`를 입력하면 `val res0: Int = 3`처럼 결과 값과 그 타입이 함께 출력됩니다.
이 장의 코드 예제에서는 이 결과를 `// 3 : Int`처럼 주석으로 적어 두었습니다.

### 왜 함수형 프로그래밍인가

Scala는 객체 지향과 함수형을 모두 지원하지만, 이 책에서는 **함수형 프로그래밍**
방식으로 코드를 씁니다. 이유는 간단합니다. 앞으로 배울 언어의 **의미 규칙**(semantic
rule)이 함수형 코드로 거의 그대로 옮겨지기 때문입니다. 구체적으로는 다음 기능들이 그
역할을 합니다.

- <a id="g-immutable-variable"></a>**변경 불가능한 변수**(immutable variable): 숨은 상태가 없으니 프로그램을 따져 볼 때
  추적할 것이 줄어듭니다.
- <a id="g-pure-function"></a>**순수 함수**(pure function): 같은 입력에는 언제나 같은 결과를 냅니다.
- <a id="g-first-class-function"></a>**일급 함수**(first-class function): 함수도 값이므로 인자로 넘기거나 결과로 돌려줄 수
  있습니다.
- <a id="g-algebraic-data-type"></a>**대수적 데이터 타입**(algebraic data type): 언어의 **문법**을 데이터로 정의합니다.
- <a id="g-pattern-matching"></a>**패턴 매칭**(pattern matching): **의미 규칙** 하나를 `match`의 `case` 하나로 옮깁니다.
- **함수형 오류 처리**: 실패를 `Option` 같은 값으로 표현합니다.

지금은 이 목록이 막연하게 느껴져도 괜찮습니다. 이 장을 다 읽고, 다음 장
[문법과 의미](./syntax-semantics.md)에서 첫 인터프리터를 만들어 보면 왜 이런 기능이
필요한지 곧바로 와닿을 것입니다.

## 기본 기능

### 기본 데이터 타입

Scala의 기본 데이터 타입부터 살펴봅시다.

```scala
42            // 42   : Int     (32-bit signed integer)
3.7           // 3.7  : Double  (64-bit double-precision floating-point)
true          // true : Boolean
false         // false: Boolean
'c'           // 'c'  : Char    (16-bit Unicode character)
"abc"         // "abc": String  (a sequence of characters)
()            // ()   : Unit    (meaningless value - similar to `void`)
```

`Int`는 32비트 정수, `Double`은 64비트 부동소수점 수, `Char`는 16비트 유니코드 문자,
`String`은 문자열입니다. 조금 낯선 것은 `Unit`일 텐데, `Unit` 타입의 값은 `()` 하나뿐이며
"의미 있는 값이 없음"을 나타냅니다. 다른 언어의 `void`와 비슷한 역할입니다.

이 값들에는 다음과 같은 연산을 할 수 있습니다.

```scala
1 + 2 * 3     // 7      : Int     (addition and multiplication)
11 / 3        // 3      : Int     (quotient of division)
11 % 3        // 2      : Int     (remainder of division)
1 < 2         // true   : Boolean (comparison)
1 == 3        // false  : Boolean (equality)
true && false // false  : Boolean (logical AND)
true || false // true   : Boolean (logical OR)
!true         // false  : Boolean (logical NOT)
"abc".length  // 3      : Int     (length of a string)
"he" + "llo"  // "hello": String  (string concatenation)
println("Hi") // ()     : Unit    (side effect: printing "Hi")
```

마지막 줄의 `println("Hi")`는 화면에 `Hi`를 출력하지만, 식 자체의 값은 `()`입니다. 화면
출력처럼 값을 계산하는 것 말고 바깥 세계에 영향을 주는 일을 <a id="g-side-effect"></a>부수 효과(side effect)라고
부릅니다.

### 변경 불가능한 변수

`val`은 **변경 불가능한 변수**를 만듭니다. 한 번 값을 정하면 바꿀 수 없습니다.

<div style="text-align:center">
<svg viewBox="-46 -4 281 155" width="100%" style="max-width: 360px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="val 선언의 구성: 변수 이름, 변수 타입, 초기 값" font-family="sans-serif" fill="currentColor">
<rect x="40.3" y="60.9" width="16.8" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="48.8" y1="60.9" x2="-1.2" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="-38.1" y="4.0" width="73.7" height="24.0" fill="#2a408e" rx="4"/>
<text x="-1.2" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">변수 이름</text>
<rect x="72.9" y="60.9" width="38.5" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="92.1" y1="87.4" x2="92.1" y2="119.4" stroke="currentColor" stroke-width="1.5"/>
<rect x="55.3" y="119.4" width="73.7" height="24.0" fill="#2a408e" rx="4"/>
<text x="92.1" y="136.4" text-anchor="middle" font-size="14" fill="#ffffff">변수 타입</text>
<rect x="137.9" y="60.9" width="16.8" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="146.3" y1="60.9" x2="196.3" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="166.1" y="4.0" width="60.4" height="24.0" fill="#2a408e" rx="4"/>
<text x="196.3" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">초기 값</text>
<text x="0.0" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="43.3" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="54.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="75.9" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="119.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="140.9" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">1</text>
</svg>
</div>

```scala
// An immutable variable `x` of type `Int` with 1
val x: Int = 1
x + 2            // 1 + 2 == 3 : Int
x = 2            // Compile Error: Reassignment to val `x`

// Type Inference: `Int` is inferred from `1`
val y = 1        // y: Int

// Type Mismatch Error: `Boolean` required but `Int` found: 42
val c: Boolean = 42
```

`val x: Int = 1`에서 `x`는 변수 이름, `Int`는 타입, `1`은 초기 값입니다. 타입은 생략해도
됩니다. `val y = 1`이라고 쓰면 Scala가 `1`을 보고 `y`의 타입이 `Int`라는 것을 알아냅니다.
이를 <a id="g-type-inference"></a>타입 추론(type inference)이라고 하는데, 이 책의 마지막 장인
[타입 추론](./type-inference.md)에서 이것이 어떻게 가능한지 직접 구현해 봅니다. 반면
`Boolean` 타입으로 선언한 변수에 `42`를 넣으려 하면 타입이 맞지 않는다는 오류가 납니다.

### 변경 가능한 변수

Scala는 `var`로 <a id="g-mutable-variable"></a>**변경 가능한 변수**(mutable variable)도 지원합니다.

<div style="text-align:center">
<svg viewBox="-35 -4 195 99" width="100%" style="max-width: 280px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="var 선언: 다시 대입할 수 있는 변수" font-family="sans-serif" fill="currentColor">
<rect x="-3.0" y="60.9" width="38.5" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="16.3" y1="60.9" x2="56.3" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="-27.2" y="4.0" width="166.9" height="24.0" fill="#2a408e" rx="4"/>
<text x="56.3" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">다시 대입할 수 있는 변수</text>
<text x="0.0" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace" font-weight="bold">var</text>
<text x="43.3" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="54.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="75.9" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="119.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="140.9" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">1</text>
</svg>
</div>

```scala
// A mutable variable `x` of type `Int` with 1
var x: Int = 1
x + 2            // 1 + 2 == 3 : Int

// You can reassign a mutable variable `x`
x = 2            // x == 2
x + 2            // 2 + 2 == 4 : Int
```

하지만 **이 책에서는 변경 가능한 변수를 쓰지 않습니다.** 함수형 프로그래밍 방식에 어긋나기
때문입니다. 같은 `x + 2`가 언제 계산하느냐에 따라 `3`이 되기도 하고 `4`가 되기도 한다는
점을 보세요. 이런 숨은 상태가 프로그램을 따져 보기 어렵게 만듭니다. 흥미롭게도 이 책의
[변경 가능한 변수](./mutable-variables.md) 장에서는 `var` 같은 기능을 가진 언어를 *설계*하게
되는데, 그때도 인터프리터 자체는 `var` 없이 구현합니다.

### 메서드

`def`로 <a id="g-method"></a>**메서드**(method)를 정의합니다.

<div style="text-align:center">
<svg viewBox="-32 -4 466 155" width="100%" style="max-width: 560px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="메서드 정의의 구성: 메서드 이름, 매개변수 이름과 타입, 반환 타입, 메서드 본문" font-family="sans-serif" fill="currentColor">
<rect x="40.3" y="60.9" width="38.5" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="59.6" y1="60.9" x2="19.6" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="-23.9" y="4.0" width="87.0" height="24.0" fill="#2a408e" rx="4"/>
<text x="19.6" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">메서드 이름</text>
<rect x="83.7" y="60.9" width="16.8" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="92.1" y1="87.4" x2="62.1" y2="119.4" stroke="currentColor" stroke-width="1.5"/>
<rect x="12.0" y="119.4" width="100.3" height="24.0" fill="#2a408e" rx="4"/>
<text x="62.1" y="136.4" text-anchor="middle" font-size="14" fill="#ffffff">매개변수 이름</text>
<rect x="116.2" y="60.9" width="38.5" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="135.4" y1="60.9" x2="180.4" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="130.3" y="4.0" width="100.3" height="24.0" fill="#2a408e" rx="4"/>
<text x="180.4" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">매개변수 타입</text>
<rect x="267.9" y="60.9" width="38.5" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="287.2" y1="87.4" x2="287.2" y2="119.4" stroke="currentColor" stroke-width="1.5"/>
<rect x="250.3" y="119.4" width="73.7" height="24.0" fill="#2a408e" rx="4"/>
<text x="287.2" y="136.4" text-anchor="middle" font-size="14" fill="#ffffff">반환 타입</text>
<rect x="332.9" y="60.9" width="60.2" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="363.0" y1="60.9" x2="383.0" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="339.5" y="4.0" width="87.0" height="24.0" fill="#2a408e" rx="4"/>
<text x="383.0" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">메서드 본문</text>
<text x="0.0" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace" font-weight="bold">def</text>
<text x="43.3" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="75.9" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="86.7" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="97.5" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="119.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="151.7" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="173.4" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="184.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="205.9" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="238.4" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="249.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="270.9" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="314.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="335.9" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="357.6" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="379.3" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">y</text>
</svg>
</div>

```scala
// A method `add` of type `(Int, Int) => Int`
// It means that `add` takes two `Int` arguments and returns an `Int`
def add(x: Int, y: Int): Int = x + y
add(1, 2)        // 1 + 2 == 3  : Int
add(5, 6)        // 5 + 6 == 11 : Int

// Compile Error: wrong number of arguments
add(1)           // Too few arguments
add(1, 2, 3)     // Too many arguments

// Type Mismatch Error: `Int` required but `String` found: "abc"
add(1, "abc")
```

`def add(x: Int, y: Int): Int = x + y`는 `Int` 인자 두 개 `x`, `y`를 받아 `Int`를 돌려주는
메서드 `add`를 정의하고, 그 본문은 `x + y`입니다. 이런 메서드의 타입을
`(Int, Int) => Int`라고 씁니다. 인자 개수가 맞지 않거나 인자의 타입이 맞지 않으면 실행하기
전에 컴파일 오류가 납니다.

### 조건식

`if`-`else`로 조건에 따라 다른 값을 계산합니다.

<div style="text-align:center">
<svg viewBox="-8 -4 295 155" width="100%" style="max-width: 400px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="조건식의 구성: 조건, then 본문, else 본문" font-family="sans-serif" fill="currentColor">
<rect x="40.3" y="60.9" width="60.2" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="70.4" y1="60.9" x2="50.4" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="29.1" y="4.0" width="42.6" height="24.0" fill="#2a408e" rx="4"/>
<text x="50.4" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">조건</text>
<rect x="116.2" y="60.9" width="27.7" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="130.0" y1="87.4" x2="130.0" y2="119.4" stroke="currentColor" stroke-width="1.5"/>
<rect x="90.3" y="119.4" width="79.6" height="24.0" fill="#2a408e" rx="4"/>
<text x="130.0" y="136.4" text-anchor="middle" font-size="14" fill="#ffffff">then 본문</text>
<rect x="202.9" y="60.9" width="16.8" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="211.3" y1="60.9" x2="241.3" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="203.3" y="4.0" width="75.9" height="24.0" fill="#2a408e" rx="4"/>
<text x="241.3" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">else 본문</text>
<text x="0.0" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace" font-weight="bold">if</text>
<text x="32.5" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="43.3" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="65.0" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">&lt;</text>
<text x="86.7" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">0</text>
<text x="97.5" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="119.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">-</text>
<text x="130.0" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="151.7" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace" font-weight="bold">else</text>
<text x="205.9" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">x</text>
</svg>
</div>

```scala
// A method `abs` which takes an `Int` and returns its absolute value
def abs(x: Int): Int = if (x < 0) -x else x

abs(42)          // 42 : Int
abs(-42)         // 42 : Int
```

주의할 점이 있습니다. Scala의 `if`는 <a id="g-statement"></a>문장(statement)이 아니라 <a id="g-expression"></a>**식**(expression)입니다.
즉 `if` 전체가 하나의 값을 가집니다. 다른 언어의 삼항 연산자 `x ? y : z`와 비슷하다고 보면
됩니다. 그래서 다음처럼 `if` 식을 다른 식 안에 넣을 수도 있습니다.

```scala
2 * (if (true) 3 else 5)   // 2 * 3 == 6  : Int
```

### 재귀

조건식과 메서드를 함께 쓰면 메서드가 자기 자신을 부르는 <a id="g-recursion"></a>**재귀**(recursion)를 쓸 수
있습니다.

```scala
// A recursive method `sum` that adds all the integers from 1 to n
def sum(n: Int): Int =
  if (n < 1) 0
  else sum(n - 1) + n

sum(10)                       // 55       : Int
sum(100)                      // 5050     : Int
```

`sum(n)`은 `n`이 1보다 작으면 `0`이고, 그렇지 않으면 `sum(n - 1)`에 `n`을 더한 값입니다.
Scala 3에서는 위처럼 **들여쓰기**로 블록을 나타낼 수도 있고, 아래처럼 **중괄호**를 쓸 수도
있습니다. 둘은 같은 뜻입니다.

```scala
def sum(n: Int): Int = {
  if (n < 1) 0
  else sum(n - 1) + n
}
```

Scala에도 `while` 반복문이 있어서, 같은 메서드를 이렇게 쓸 수도 있습니다.

```scala
// Sum of all the numbers from 1 to n
def sum(n: Int): Int = {
  var s: Int = 0
  var k: Int = 1
  while (k <= n) {
    s = s + k
    k = k + 1
  }
  s
}

sum(10)  // 55   : Int
sum(100) // 5050 : Int
```

하지만 **이 책에서는 `while` 반복문을 쓰지 않습니다.** 반복문은 변경 가능한 변수 없이는
의미가 없고, 역시 함수형 프로그래밍 방식에 어긋나기 때문입니다. 반복이 필요하면 언제나
재귀를 씁니다.

> **생각해 보기.** 재귀로 쓴 `sum`과 `while`로 쓴 `sum` 중 어느 쪽이 "`sum(n)`은 1부터
> `n`까지의 합이다"라는 정의에 더 가까워 보이나요? 재귀 버전은 `sum(0) = 0`,
> `sum(n) = sum(n-1) + n`이라는 수학적 정의를 거의 그대로 옮긴 것입니다.

## 사용자 정의 데이터 타입

인터프리터는 프로그램을 데이터로 다룹니다. 그러려면 프로그램의 구조를 나타낼 데이터
타입을 직접 정의할 수 있어야 합니다. Scala에서는 `case class`와 `enum`이 그 역할을 합니다.

### 곱 타입: `case class`

`case class`는 여러 값을 하나로 묶은 <a id="g-product-type"></a>**곱 타입**(product type)을 정의합니다. 예를 들어
좌표 `x`, `y`와 색깔 `color`를 가진 점은 다음과 같이 정의합니다.

```scala
// A case class `Point` having `x`, `y`, and `color` fields
// whose types are `Int`, `Int`, and `String`, respectively
case class Point(x: Int, y: Int, color: String)
```

<div style="text-align:center">
<svg viewBox="-8 -4 525 155" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="case class 정의의 구성: 타입 이름이자 생성자, 필드 이름, 필드 타입" font-family="sans-serif" fill="currentColor">
<rect x="116.2" y="60.9" width="60.2" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="146.3" y1="60.9" x2="126.3" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="54.0" y="4.0" width="144.7" height="24.0" fill="#2a408e" rx="4"/>
<text x="126.3" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">타입 이름이자 생성자</text>
<rect x="267.9" y="60.9" width="16.8" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="276.3" y1="87.4" x2="276.3" y2="119.4" stroke="currentColor" stroke-width="1.5"/>
<rect x="239.5" y="119.4" width="73.7" height="24.0" fill="#2a408e" rx="4"/>
<text x="276.3" y="136.4" text-anchor="middle" font-size="14" fill="#ffffff">필드 이름</text>
<rect x="300.4" y="60.9" width="38.5" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="319.7" y1="60.9" x2="359.7" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="322.8" y="4.0" width="73.7" height="24.0" fill="#2a408e" rx="4"/>
<text x="359.7" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">필드 타입</text>
<text x="0.0" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace" font-weight="bold">case</text>
<text x="54.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace" font-weight="bold">class</text>
<text x="119.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Point</text>
<text x="173.4" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="184.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="195.0" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="216.7" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="249.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="270.9" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="281.7" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="303.4" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="335.9" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="357.6" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">color</text>
<text x="411.8" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="433.4" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">String</text>
<text x="498.5" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">)</text>
</svg>
</div>

이 한 줄로 두 가지가 생깁니다. 하나는 **타입 이름** `Point`이고, 다른 하나는 그 타입의 값을
만드는 <a id="g-constructor"></a>**생성자**(constructor) `Point`입니다. 이름이 같지만 쓰이는 자리가 다릅니다.

```scala
// A `Point` instance whose fields: x = 3, y = 4, and color = "RED"
val p: Point = Point(3, 4, "RED")

// You can access fields using the dot operator
p.x             // 3      : Int
p.color         // "RED"  : String

// Fields are immutable by default
p.x = 5         // Compile Error: Reassignment to val `x`
```

필드는 점(`.`)으로 꺼내 쓰며, 기본적으로 변경할 수 없습니다. "곱"이라는 이름은 가능한 값의
집합이 각 필드 타입의 곱집합(`Int × Int × String`)이라는 데서 왔습니다.

### 대수적 데이터 타입: `enum`

`enum`은 여러 <a id="g-variant"></a>**배리언트**(variant) 중 하나인 값을 나타내는 **대수적 데이터 타입**(algebraic data
type, ADT)을 정의합니다. 예를 들어 정수를 담은 이진 트리는 잎(`Leaf`)이거나 가지
(`Branch`) 둘 중 하나입니다.

```scala
// An algebraic data type (ADT) for trees
enum Tree:
  case Leaf(value: Int)
  case Branch(left: Tree, value: Int, right: Tree)
```

<div style="text-align:center">
<svg viewBox="-8 -4 561 153" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="enum 정의의 구성: 타입 이름과 배리언트들" font-family="sans-serif" fill="currentColor">
<rect x="51.2" y="60.9" width="49.3" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="75.9" y1="60.9" x2="75.9" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="39.0" y="4.0" width="73.7" height="24.0" fill="#2a408e" rx="4"/>
<text x="75.9" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">타입 이름</text>
<rect x="72.9" y="87.9" width="471.9" height="53.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="388.8" y1="87.9" x2="388.8" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="327.6" y="4.0" width="122.5" height="24.0" fill="#2a408e" rx="4"/>
<text x="388.8" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">배리언트(생성자)</text>
<text x="0.0" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace" font-weight="bold">enum</text>
<text x="54.2" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Tree</text>
<text x="97.5" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="21.7" y="107.0" font-size="18" font-family="ui-monospace, Menlo, monospace" font-weight="bold">case</text>
<text x="75.9" y="107.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Leaf</text>
<text x="119.2" y="107.0" font-size="18" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="130.0" y="107.0" font-size="18" font-family="ui-monospace, Menlo, monospace">value</text>
<text x="184.2" y="107.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="205.9" y="107.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="238.4" y="107.0" font-size="18" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="21.7" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace" font-weight="bold">case</text>
<text x="75.9" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Branch</text>
<text x="140.9" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="151.7" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">left</text>
<text x="195.0" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="216.7" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Tree</text>
<text x="260.1" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="281.7" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">value</text>
<text x="335.9" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="357.6" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="390.1" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="411.8" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">right</text>
<text x="465.9" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="487.6" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Tree</text>
<text x="531.0" y="134.0" font-size="18" font-family="ui-monospace, Menlo, monospace">)</text>
</svg>
</div>

여기서 **타입 이름**은 `Tree`이고, 각 배리언트의 **생성자**는 `Leaf`와 `Branch`입니다. `Leaf`는
정수 하나를, `Branch`는 왼쪽 트리, 정수, 오른쪽 트리를 가집니다. `Branch`의 필드에 다시
`Tree`가 들어가는 것을 보세요. 이렇게 자기 자신을 포함하는 재귀적 정의 덕분에 얼마든지 큰
트리를 표현할 수 있습니다.

```scala
import Tree.* // Import all constructors for variants of `Tree`
val tree1: Tree = Leaf(1)
val tree2: Tree = Branch(Leaf(1), 2, Leaf(3))
val tree3: Tree = Branch(Leaf(2), 4, Branch(Leaf(3), 1, Leaf(5)))
```

`import Tree.*`는 `Tree.Leaf` 대신 `Leaf`라고 짧게 쓸 수 있게 해 줍니다. 세 트리를 그림으로
그리면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="-31 -15 392 230" width="100%" style="max-width: 440px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="세 트리 tree1, tree2, tree3의 모양. 가지는 채운 상자, 잎은 빈 상자" font-family="sans-serif" fill="currentColor">
<rect x="-11.6" y="27.0" width="23.3" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="0.0" y="45.0" text-anchor="middle" font-size="16">1</text>
<text x="0.0" y="8.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace" font-weight="bold">tree1</text>
<line x1="113.0" y1="53.0" x2="90.0" y2="77.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="113.0" y1="53.0" x2="136.0" y2="77.0" stroke="currentColor" stroke-width="1.4"/>
<rect x="78.4" y="77.0" width="23.3" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="90.0" y="95.0" text-anchor="middle" font-size="16">1</text>
<rect x="124.4" y="77.0" width="23.3" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="136.0" y="95.0" text-anchor="middle" font-size="16">3</text>
<rect x="101.4" y="27.0" width="23.3" height="26.0" fill="#2a408e" rx="4"/>
<text x="113.0" y="45.0" text-anchor="middle" font-size="16" fill="#ffffff">2</text>
<text x="113.0" y="8.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace" font-weight="bold">tree2</text>
<line x1="284.5" y1="53.0" x2="250.0" y2="77.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="284.5" y1="53.0" x2="319.0" y2="77.0" stroke="currentColor" stroke-width="1.4"/>
<rect x="238.4" y="77.0" width="23.3" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="250.0" y="95.0" text-anchor="middle" font-size="16">2</text>
<line x1="319.0" y1="103.0" x2="296.0" y2="127.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="319.0" y1="103.0" x2="342.0" y2="127.0" stroke="currentColor" stroke-width="1.4"/>
<rect x="284.4" y="127.0" width="23.3" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="296.0" y="145.0" text-anchor="middle" font-size="16">3</text>
<rect x="330.4" y="127.0" width="23.3" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="342.0" y="145.0" text-anchor="middle" font-size="16">5</text>
<rect x="307.4" y="77.0" width="23.3" height="26.0" fill="#2a408e" rx="4"/>
<text x="319.0" y="95.0" text-anchor="middle" font-size="16" fill="#ffffff">1</text>
<rect x="272.9" y="27.0" width="23.3" height="26.0" fill="#2a408e" rx="4"/>
<text x="284.5" y="45.0" text-anchor="middle" font-size="16" fill="#ffffff">4</text>
<text x="284.5" y="8.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace" font-weight="bold">tree3</text>
<rect x="0.0" y="185.0" width="26.0" height="22.0" fill="#2a408e" rx="4"/>
<text x="32.0" y="201.0" font-size="14" font-family="ui-monospace, Menlo, monospace">Branch</text>
<rect x="110.0" y="185.0" width="26.0" height="22.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="142.0" y="201.0" font-size="14" font-family="ui-monospace, Menlo, monospace">Leaf</text>
</svg>
</div>

곱 타입이 "이것 *그리고* 저것"이라면, 대수적 데이터 타입은 "이것 *또는* 저것"을 표현할 수
있습니다. 다음 장에서 보겠지만, 프로그램의 문법이 바로 이런 "또는"의 구조를 가지고 있습니다.
"식은 숫자이거나, 두 식의 덧셈이거나, 두 식의 곱셈이다"처럼요.

### 패턴 매칭

대수적 데이터 타입의 값은 **패턴 매칭**으로 분해합니다. 트리에 들어 있는 모든 값을 더하는
메서드를 봅시다.

```scala
// A recursive method computes the sum of all the values in a tree
def sum(t: Tree): Int = t match
  case Leaf(n)         => n
  case Branch(l, n, r) => sum(l) + n + sum(r)

sum(Branch(Leaf(1), 2, Leaf(3)))                      // 6  : Int
sum(Branch(Branch(Leaf(1), 2, Leaf(3)), 4, Leaf(5)))  // 15 : Int
```

`t match`는 `t`가 어떤 모양인지 위에서부터 차례로 비교합니다. `t`가 `Leaf(n)` 모양이면 그 안의
정수를 `n`이라는 이름으로 꺼내서 `n`을 돌려주고, `Branch(l, n, r)` 모양이면 세 필드를 각각
`l`, `n`, `r`로 꺼내서 `sum(l) + n + sum(r)`을 돌려줍니다. 배리언트마다 `case`가 하나씩
있다는 점을 눈여겨보세요. 이 모양이 이 책의 모든 인터프리터에서 되풀이됩니다.

필요 없는 부분은 밑줄(`_`)로 무시할 수 있고, 패턴 뒤에 `if` <a id="g-guard"></a>가드(guard)를 붙여 조건을 더할
수도 있습니다.

```scala
// A method checks whether a tree is a branch whose value is even
def isEvenBranch(t: Tree): Boolean = t match
  case Branch(_, n, _) if n % 2 == 0 => true
  case _                             => false

isEvenBranch(Leaf(1))                                 // false : Boolean
isEvenBranch(Branch(Leaf(1), 2, Leaf(3)))             // true  : Boolean
```

첫 번째 `case`는 "가운데 값 `n`이 짝수인 `Branch`"에만 맞고, 두 번째 `case _`는 그 밖의 모든
경우에 맞습니다.

다른 예로 자연수를 대수적 데이터 타입으로 정의해 봅시다. 자연수는 0(`Z`)이거나, 어떤
자연수의 다음 수(`S`, successor)입니다.

```scala
// An ADT for natural numbers
enum Nat:
  case Z          // Zero
  case S(n: Nat)  // Successor of a natural number

import Nat.* // Import constructors `Z` and `S` for variants of `Nat`
```

`S(S(Z))`는 0의 다음 수의 다음 수, 즉 2입니다. 패턴 안에 패턴을 넣는 **중첩 패턴
매칭**(nested pattern matching)을 쓰면 짝수 판별을 깔끔하게 쓸 수 있습니다.

```scala
// A recursive method checks whether a natural number is even
def isEven(x: Nat): Boolean = x match
  case Z       => true
  case S(S(y)) => isEven(y)   // nested pattern matching
  case _       => false

isEven(Z)                     // true  : Boolean
isEven(S(Z))                  // false : Boolean
isEven(S(S(Z)))               // true  : Boolean
```

`S(S(y))`는 "2 이상인 수"에 맞고, 그 수에서 2를 뺀 값을 `y`로 꺼냅니다. 0은 짝수, 1은
홀수이고, 2 이상이면 2를 뺀 수가 짝수인지 보면 됩니다.

> **자주 하는 실수.** `case`의 순서가 중요합니다. `match`는 위에서부터 차례로 맞는 패턴을
> 찾으므로, `isEven`에서 `case _ => false`를 맨 위에 두면 모든 입력에 `false`를 돌려줍니다.
> 넓은 패턴일수록 아래에 두세요.

### 데이터 타입 안의 메서드

`case class`나 `enum` 안에도 메서드를 정의할 수 있습니다.

```scala
case class Point(x: Int, y: Int, color: String):
  // A method that returns a new point moved by (dx, dy)
  def move(dx: Int, dy: Int): Point = Point(x + dx, y + dy, color)

Point(3, 4, "RED").move(1, -2)     // Point(4, 2, "RED"): Point
```

`move`는 기존 점을 고치지 않고, 옮겨진 **새 점**을 만들어 돌려준다는 점에 주목하세요. 변경
불가능한 데이터를 다룰 때의 전형적인 방식입니다.

메서드 안에서 `this`는 현재 값 자신을 가리킵니다. 그래서 `enum` 안에서 `this match`로 자기
자신을 패턴 매칭할 수 있습니다.

```scala
enum Tree:
  ...
  // A recursive method counts the number of the given integer in a tree
  def count(x: Int): Int = this match
    case Leaf(n)         if n == x  => 1
    case Leaf(_)                    => 0
    case Branch(l, n, r) if n == x  => l.count(x) + 1 + r.count(x)
    case Branch(l, _, r)            => l.count(x) + r.count(x)

import Tree.* // Import all constructors for variants of `Tree`
Branch(Leaf(7), 3, Branch(Leaf(7), 7, Leaf(42))).count(7) // 3 : Int
```

(`...` 자리에는 앞에서 본 `Leaf`와 `Branch` 정의가 들어갑니다.)

## 일급 함수

Scala에서 함수는 <a id="g-first-class-citizen"></a>**일급 시민**(first-class citizen)입니다. 즉 함수도 정수나 문자열처럼 하나의
**값**입니다. 이름 없이 함수를 바로 만들 수도 있습니다.

```scala
// A function that increments its input
(x: Int) => x + 1                       // a function `Int => Int`
((x: Int) => x + 1)(3)                  // 3 + 1 = 4 : Int
```

<div style="text-align:center">
<svg viewBox="-72 -4 294 155" width="100%" style="max-width: 380px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="익명 함수의 구성: 매개변수 이름, 매개변수 타입, 함수 본문" font-family="sans-serif" fill="currentColor">
<rect x="7.8" y="60.9" width="16.8" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="16.3" y1="60.9" x2="-13.7" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="-63.9" y="4.0" width="100.3" height="24.0" fill="#2a408e" rx="4"/>
<text x="-13.7" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">매개변수 이름</text>
<rect x="40.3" y="60.9" width="38.5" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="59.6" y1="87.4" x2="59.6" y2="119.4" stroke="currentColor" stroke-width="1.5"/>
<rect x="9.5" y="119.4" width="100.3" height="24.0" fill="#2a408e" rx="4"/>
<text x="59.6" y="136.4" text-anchor="middle" font-size="14" fill="#ffffff">매개변수 타입</text>
<rect x="127.0" y="60.9" width="60.2" height="26.5" fill="none" stroke="#2f4fb8" stroke-width="2" rx="3"/>
<line x1="157.1" y1="60.9" x2="177.1" y2="28.0" stroke="currentColor" stroke-width="1.5"/>
<rect x="140.3" y="4.0" width="73.7" height="24.0" fill="#2a408e" rx="4"/>
<text x="177.1" y="21.0" text-anchor="middle" font-size="14" fill="#ffffff">함수 본문</text>
<text x="0.0" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="10.8" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="21.7" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="43.3" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="75.9" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="97.5" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="108.4" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">&gt;</text>
<text x="130.0" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="151.7" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="173.4" y="80.0" font-size="18" font-family="ui-monospace, Menlo, monospace">1</text>
</svg>
</div>

`(x: Int) => x + 1`은 `Int`를 받아 1을 더한 값을 돌려주는 함수이고, 타입은 `Int => Int`입니다.
값이니까 변수에 **저장**할 수 있습니다.

```scala
val inc: Int => Int = (x: Int) => x + 1
val inc: Int => Int = x => x + 1        // Type Inference: `x` is `Int`
val inc: Int => Int = _ + 1             // Placeholder Syntax
inc(3)                                  // 3 + 1 = 4 : Int
```

세 줄은 모두 같은 함수를 정의하는 다른 표기법입니다. 변수 타입에서 인자가 `Int`라는 것을
알 수 있으므로 `x => x + 1`처럼 인자 타입을 생략할 수 있고, 인자를 한 번만 쓴다면
`_ + 1`처럼 밑줄로 줄여 쓸 수도 있습니다(placeholder 문법). 참고로 같은 이름 `inc`를 여러 번
정의하는 것은 REPL에서만 허용됩니다. 파일에서는 셋 중 하나만 쓰세요.

함수를 다른 메서드나 함수에 **인자로 넘길** 수도 있습니다.

```scala
// A method `twice` that applies the function `f` twice to `x`
def twice(f: Int => Int, x: Int): Int = f(f(x))
twice(inc, 5)                // inc(inc(5)) = 5 + 1 + 1 = 7 : Int

// You can pass a function to `twice`
twice((x: Int) => x + 1, 5)  // 7 : Int
twice(x => x + 1, 5)         // 7 : Int - Type Inference: `x` is `Int`
twice(_ + 1, 5)              // 7 : Int - Placeholder Syntax
```

그리고 함수를 **결과로 돌려줄** 수도 있습니다.

```scala
// A function `addN` returns a function that adds `n`
val addN = (n: Int) => (x: Int) => x + n
val add2 = addN(2)           // add2:          Int => Int
add2(3)                      // 3 + 2 = 5     : Int
addN(7)(5)                   // 5 + 7 = 12    : Int
twice(add2, 5)               // 5 + 2 + 2 = 9 : Int
twice(addN(7), 5)            // 5 + 7 + 7 = 19: Int
```

`twice`처럼 함수를 인자로 받거나 `addN`처럼 함수를 결과로 돌려주는 함수를 <a id="g-higher-order-function"></a>**고차 함수**(higher-order function)라고 합니다. `addN(2)`는 "받은 수에 2를 더하는 함수"를 돌려줍니다. 이 함수는 만들어질 때의 `n`이 `2`였다는
사실을 기억하고 있습니다. 함수가 어떻게 이런 것을 기억할 수 있는지는
[일급 함수](./first-class-functions.md) 장에서 클로저라는 이름으로 자세히 다룹니다.

## 변경 불가능한 컬렉션

### 리스트

`List[T]`는 `T` 타입 원소들이 늘어선 **변경 불가능한** 리스트입니다.

```scala
val list: List[Int] = List(3, 1, 2, 4)
```

리스트는 `::`(cons)와 `Nil`(빈 리스트)로도 만들 수 있습니다. 사실 리스트는 "빈 리스트이거나,
원소 하나와 나머지 리스트의 쌍"인 대수적 데이터 타입입니다.

```scala
val list = 3 :: 1 :: 2 :: 4 :: Nil
```

리스트는 변경할 수 없으므로, 앞에 원소를 붙이면 원래 리스트는 그대로 두고 새 리스트가
만들어집니다.

```scala
val list2 = 5 :: list   // List(5, 3, 1, 2, 4): List[Int]
val list3 = 6 :: list   // List(6, 3, 1, 2, 4): List[Int]
```

이때 `list2`와 `list3`는 `list`의 원소들을 복사하지 않고 **공유**합니다. `list`가 절대 바뀌지
않으므로 안심하고 공유할 수 있는 것이지요.

<div style="text-align:center">
<svg viewBox="-8 6 689 158" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="list2와 list3가 list의 원소들을 공유하는 모습" font-family="sans-serif" fill="currentColor">
<defs><marker id="scala-fig-8" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<rect rx="3" x="200.0" y="70.0" width="44.0" height="36.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect rx="3" x="244.0" y="70.0" width="12.0" height="36.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="222.0" y="94.0" text-anchor="middle" font-size="17">3</text>
<rect rx="3" x="310.0" y="70.0" width="44.0" height="36.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect rx="3" x="354.0" y="70.0" width="12.0" height="36.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="332.0" y="94.0" text-anchor="middle" font-size="17">1</text>
<rect rx="3" x="420.0" y="70.0" width="44.0" height="36.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect rx="3" x="464.0" y="70.0" width="12.0" height="36.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="442.0" y="94.0" text-anchor="middle" font-size="17">2</text>
<rect rx="3" x="530.0" y="70.0" width="44.0" height="36.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect rx="3" x="574.0" y="70.0" width="12.0" height="36.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="552.0" y="94.0" text-anchor="middle" font-size="17">4</text>
<line x1="256.0" y1="88.0" x2="308.0" y2="88.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#scala-fig-8)"/>
<line x1="366.0" y1="88.0" x2="418.0" y2="88.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#scala-fig-8)"/>
<line x1="476.0" y1="88.0" x2="528.0" y2="88.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#scala-fig-8)"/>
<line x1="586.0" y1="88.0" x2="636.0" y2="88.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#scala-fig-8)"/>
<text x="644.0" y="94.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Nil</text>
<rect rx="3" x="70.0" y="20.0" width="44.0" height="36.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect rx="3" x="114.0" y="20.0" width="12.0" height="36.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="92.0" y="44.0" text-anchor="middle" font-size="17">5</text>
<rect rx="3" x="70.0" y="120.0" width="44.0" height="36.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect rx="3" x="114.0" y="120.0" width="12.0" height="36.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="92.0" y="144.0" text-anchor="middle" font-size="17">6</text>
<line x1="126.0" y1="38.0" x2="198.0" y2="80.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#scala-fig-8)"/>
<line x1="126.0" y1="138.0" x2="198.0" y2="96.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#scala-fig-8)"/>
<text x="0.0" y="44.0" font-size="16" font-family="ui-monospace, Menlo, monospace">list2</text>
<line x1="52.0" y1="38.0" x2="68.0" y2="38.0" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3,3"/>
<text x="0.0" y="144.0" font-size="16" font-family="ui-monospace, Menlo, monospace">list3</text>
<line x1="52.0" y1="138.0" x2="68.0" y2="138.0" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3,3"/>
<text x="228.0" y="30.0" text-anchor="middle" font-size="16" font-family="ui-monospace, Menlo, monospace">list</text>
<line x1="228.0" y1="36.0" x2="228.0" y2="68.0" stroke="currentColor" stroke-width="1.8" stroke-dasharray="3,3"/>
</svg>
</div>

리스트도 패턴 매칭할 수 있습니다.

```scala
val list: List[Int] = 3 :: 1 :: 2 :: 4 :: Nil

// Get the second element of the list or 0
def getSnd(list: List[Int]): Int = list match
  case _ :: x :: _ => x
  case _           => 0

getSnd(list)                // 1 : Int

// Filter odd integers and double them in the list
def filterOddAndDouble(list: List[Int]): List[Int] = list match
  case Nil                    => Nil
  case x :: xs if x % 2 == 1  => x * 2 :: filterOddAndDouble(xs)
  case _ :: xs                => filterOddAndDouble(xs)

filterOddAndDouble(list)   // List(6, 2) : List[Int]
```

`_ :: x :: _`는 "원소가 두 개 이상인 리스트"에 맞고 두 번째 원소를 `x`로 꺼냅니다.
`filterOddAndDouble`은 홀수만 골라서 두 배로 만든 리스트를 돌려줍니다.

리스트에는 편리한 연산이 많이 준비되어 있습니다.

```scala
// A list of integers: 3, 1, 2, 4
val list: List[Int] = List(3, 1, 2, 4)

// Operations/functions on lists
list.length                        // 4                      : Int
list.map(_ * 2)                    // List(6, 2, 4, 8)       : List[Int]
list.filter(_ % 2 == 1)            // List(3, 1)             : List[Int]
list.foldLeft(0)(_ + _)            // 0 + 3 + 1 + 2 + 4 = 10 : Int
list.flatMap(x => List(x, -x))     // List(3, -3, ..., 4, -4): List[Int]
list.map(x => List(x, -x)).flatten // List(3, -3, ..., 4, -4): List[Int]
```

`map`은 각 원소에 함수를 적용하고, `filter`는 조건을 만족하는 원소만 남기고, `foldLeft`는
초기 값에서 시작해 왼쪽부터 원소를 하나씩 합쳐 나갑니다. `flatMap`은 각 원소를 리스트로 바꾼
뒤 이어 붙이는데, `map`한 다음 `flatten`한 것과 같습니다. 이 연산들은 모두 함수를 인자로
받는 고차 함수이고, 일급 함수가 얼마나 유용한지 잘 보여 줍니다. `filter`와 `map`을 쓰면
`filterOddAndDouble`을 훨씬 짧게 쓸 수 있습니다.

```scala
def filterOddAndDouble(list: List[Int]): List[Int] =
  list
    .filter(_ % 2 == 1)
    .map(_ * 2)

filterOddAndDouble(list)       // List(6, 2)                 : List[Int]
```

### 옵션

Scala에도 "값이 없음"을 나타내는 `null`이 있지만, **이 책에서는 `null`을 쓰지 않습니다.**
`null`은 아무 타입의 자리에나 슬쩍 들어갈 수 있어서, 깜빡하고 검사하지 않으면 실행 중에
오류가 터지기 때문입니다.

대신 **옵션** `Option[T]`를 씁니다. `Option[T]`는 `T` 타입 값을 하나 담고 있거나, 아무것도
담고 있지 않은 상자입니다.

1. `Some(x)`는 값 `x`가 있음을 나타냅니다.
2. `None`은 값이 없음을 나타냅니다.

```scala
val some: Option[Int] = Some(42)
val none: Option[Int] = None

// Operations/functions on options
some.map(_ + 1)     // Some(43)      : Option[Int]
none.map(_ + 1)     // None          : Option[Int]
some.getOrElse(7)   // 42            : Int
none.getOrElse(7)   // 7             : Int
some.fold(7)(_ * 2) // 42 * 2 = 84   : Int
none.fold(7)(_ * 2) // 7             : Int
```

`map`은 값이 있을 때만 함수를 적용하고, `getOrElse(7)`은 값이 없으면 `7`을 대신 돌려주며,
`fold(7)(f)`는 값이 없으면 `7`을, 있으면 그 값에 `f`를 적용한 결과를 돌려줍니다. 값이 없을 수도
있다는 사실이 타입(`Option[Int]`)에 드러나므로, 그 경우를 처리하지 않고 넘어가기가 어렵습니다.

### 쌍

<a id="g-pair"></a>**쌍**(pair) `(T, U)`는 `T` 타입 값과 `U` 타입 값을 하나씩 담습니다.

```scala
val pair: (Int, String) = (42, "foo")

// You can construct pairs using `->`
42 -> "foo" == pair  // true        : Boolean
true -> 42           // (true, 42)  : (Boolean, Int)

// Operations/functions on pairs
pair(0)              // 42          : Int     - NOT RECOMMENDED
pair(1)              // "foo"       : String  - NOT RECOMMENDED

// Pattern matching on pairs
val (x, y) = pair    // x == 42 and y == "foo"
```

`a -> b`는 `(a, b)`를 만드는 또 다른 표기법입니다. `pair(0)`처럼 번호로 원소를 꺼낼 수도
있지만 권하지 않습니다. 대신 `val (x, y) = pair`처럼 패턴 매칭으로 꺼내 이름을 붙이는 편이
읽기 좋습니다.

### 맵과 집합

<a id="g-map"></a>**맵**(map) `Map[K, V]`는 `K` 타입 키를 `V` 타입 값에 대응시킵니다.

```scala
val map: Map[String, Int] = Map("a" -> 1, "b" -> 2)

map + ("c" -> 3) // Map("a" -> 1, "b" -> 2, "c" -> 3) : Map[String, Int]
map - "a"        // Map("b" -> 2)                     : Map[String, Int]
map.get("a")     // Some(1)                           : Option[Int]
map.get("c")     // None                              : Option[Int]
```

맵도 변경 불가능하므로 `+`와 `-`는 새 맵을 만듭니다. `get`은 키가 없을 수도 있으니
`Option`을 돌려준다는 점을 보세요. 맵은 다음 장부터 아주 중요해집니다.
[식별자](./identifiers.md)에서 변수 이름을 값에 대응시키는 환경을 바로 이 `Map`으로 구현하기
때문입니다.

<a id="g-set"></a>**집합**(set) `Set[T]`는 중복 없는 `T` 타입 원소들의 모음입니다.

```scala
val set1: Set[Int] = Set(1, 2, 3)
val set2: Set[Int] = Set(2, 3, 5)

set1 + 4               // Set(1, 2, 3, 4) : Set[Int]
set1 + 2               // Set(1, 2, 3)    : Set[Int]
set1 - 2               // Set(1, 3)       : Set[Int]
set1.contains(2)       // true            : Boolean
set1 ++ set2           // Set(1, 2, 3, 5) : Set[Int]
set1.intersect(set2)   // Set(2, 3)       : Set[Int]
```

이미 있는 원소 `2`를 더해도 집합은 그대로입니다. `++`는 합집합, `intersect`는 교집합입니다.

### for 컴프리헨션

두 리스트에서 원소를 하나씩 골라, 합이 짝수인 쌍만 남기고 곱을 구한다고 해 봅시다.
`flatMap`, `filter`, `map`을 겹쳐 쓰면 다음과 같습니다.

```scala
val xlist = List(1, 2, 3)
val ylist = List(4, 5, 6)

// Filter pairs of elements whose sum is even and multiply them
xlist.flatMap(x =>
  ylist
    .filter(y => (x + y) % 2 == 0)
    .map(y => x * y)
)                          // List(5, 8, 12, 15)         : List[Int]
```

잘 동작하지만 읽기가 조금 힘듭니다. <a id="g-for-comprehension"></a>**for 컴프리헨션**(for comprehension)을 쓰면 같은 계산을
훨씬 읽기 쉽게 쓸 수 있습니다.

```scala
for {
  x <- xlist
  y <- ylist
  if (x + y) % 2 == 0
} yield x * y              // List(5, 8, 12, 15)         : List[Int]
```

"`xlist`에서 `x`를 고르고, `ylist`에서 `y`를 고르고, `x + y`가 짝수이면, `x * y`를 내놓는다"고
그대로 읽힙니다. for 컴프리헨션은 새로운 기능이 아니라, 컴파일러가 앞의 `flatMap`, `filter`,
`map` 코드로 바꾸어 주는 <a id="g-syntactic-sugar"></a>**문법 설탕**(syntactic sugar)입니다. 이름은 반복문 같지만 변경
가능한 변수는 전혀 쓰이지 않습니다. 더 자세한 내용은
[Scala 문서](https://docs.scala-lang.org/tour/for-comprehensions.html)를 참고하세요.

## 정리

- Scala는 JVM 위에서 동작하는 정적 타입 언어로, 객체 지향과 함수형 프로그래밍을 모두
  지원합니다. 이 책에서는 의미 규칙을 코드로 옮기기 쉬운 **함수형** 방식으로 씁니다.
- 기본 기능: 기본 데이터 타입, 변경 불가능한 변수 `val`, 메서드 `def`, 식으로서의 `if`, 재귀.
  `var`, `while`, `null`은 이 책에서 쓰지 않습니다.
- 사용자 정의 데이터 타입: `case class`는 곱 타입, `enum`은 대수적 데이터 타입을 정의하고,
  패턴 매칭(`_`, `if` 가드, 중첩 패턴)으로 분해합니다. 데이터 타입 안에 메서드를 정의할 수
  있고, `this`는 현재 값을 가리킵니다.
- 일급 함수: 함수는 값이므로 저장하고, 인자로 넘기고, 결과로 돌려줄 수 있습니다.
- 변경 불가능한 컬렉션: `List`, `Option`, 쌍, `Map`, `Set`, 그리고 `map`, `filter`, `flatMap`을
  읽기 쉽게 써 주는 for 컴프리헨션.

## 연습 문제

1. 정수 리스트를 받아 모든 원소의 곱을 돌려주는 메서드 `product(list: List[Int]): Int`를
   패턴 매칭과 재귀로 구현해 보세요. 그다음 `foldLeft`로 다시 구현해 보세요.
2. 이 장의 `Tree`에 대해, 트리의 높이를 구하는 메서드 `height(t: Tree): Int`를 구현해
   보세요. `Leaf`의 높이는 1입니다.
3. 이 장의 `Nat`에 대해, 두 자연수를 더하는 메서드 `add(x: Nat, y: Nat): Nat`를 구현해
   보세요. 예를 들어 `add(S(Z), S(S(Z)))`는 `S(S(S(Z)))`여야 합니다.
4. `Map[String, Int]`와 키 리스트를 받아, 맵에 있는 키의 값만 모두 더하는 메서드를
   구현해 보세요. `get`이 돌려주는 `Option`을 어떻게 다룰지 생각해 보세요.
5. for 컴프리헨션으로 1 이상 20 이하의 정수 중 \\( a^2 + b^2 = c^2 \\)을 만족하는
   \\( a \le b \\)인 세 수 `(a, b, c)`를 모두 구해 보세요.
6. 강의 과제 Exercise #0
   ([scala-tutorial](https://github.com/ku-plrg-classroom/docs/tree/main/scala/scala-tutorial))을
   풀어 보세요. 제출할 필요는 없지만 앞으로의 모든 과제를 위한 준비 운동입니다. JDK와 sbt가
   필요하며, [설치 안내](https://github.com/ku-plrg-classroom/docs/blob/main/INSTALL.md)에 VS Code
   설정 방법도 있습니다.
