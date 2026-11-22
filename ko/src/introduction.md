# 소개

여러분은 매일 쓰는 프로그래밍 언어를 얼마나 이해하고 있나요? 질문 하나로 확인해 봅시다.
다음 식의 결과는 무엇일까요?

```text
"2" * 3
```

여러분이 자주 쓰는 언어에서는 어떤 결과가 나오나요? 답을 정했다면 세 언어의 답과 비교해
보세요.

```javascript
// JavaScript
"2" * 3     // 6
```

```python
# Python
"2" * 3     # '222'
```

```rust
// Rust
"2" * 3     // 컴파일 오류: cannot multiply `&str` by `{integer}`
```

여러분이 예상한 답과 같았나요? 같은 식인데 답이 셋입니다. JavaScript는 문자열 `"2"`를 숫자로 바꾸어 곱하고, Python은
문자열을 세 번 이어 붙이고, Rust는 문자열에는 곱셈을 쓸 수 없다며 컴파일조차 해 주지
않습니다. 겉모습이 똑같은 식이라도 언어마다 뜻이 다릅니다. <a id="g-syntax"></a>문법(syntax)이 같다고
<a id="g-semantics"></a>의미(semantics)까지 같지는 않다는 것, 이것이 이 책의 출발점입니다.

그렇다면 언어를 "이해한다"는 것은 무엇일까요? 자주 써 봐서 결과를 맞힐 수 있다는 것만으로는
부족합니다. 이 짧은 식의 뜻을 누가 정했고 어디에 어떻게 적혀 있는지, 왜 하필 그렇게
동작하는지까지 설명할 수 있어야 합니다. 게다가 여러분이 쓰는 언어에는 한 번도 써 보지 않은
기능도 생각보다 많습니다. Python만 해도 클로저, 제너레이터, 패턴 매칭 같은 기능을 제공하지만,
이런 기능이 정확히 무엇을 하는지 설명할 수 있는 사람은 많지 않습니다.

물리학자 리처드 파인만(Richard Feynman)의 칠판에는 이런 말이 적혀 있었다고 합니다.

> *What I cannot create, I do not understand.*
>
> 내가 만들 수 없는 것은 이해하지 못한 것이다.

언어도 마찬가지입니다. 언어를 정말 이해하는 가장 확실한 방법은 그 언어를 직접 만들어 보는
것입니다. 식 하나하나가 무엇을 하는지 빈틈없이 적어 보고(**정의**), 그 정의대로 동작하는
인터프리터를 손수 만들어 보면(**구현**), 그 언어를 "써 본" 것을 넘어 "이해한" 것이 됩니다.

그래서 이 책의 목적은 특정 언어로 프로그램을 짜는 법을 넘어, 프로그래밍 **언어** 자체를
어떻게 정의하고 구현하는지 배우는 것입니다. 우리는 아주 작은 언어에서 출발해 장마다 기능을
하나씩 더해 가며 언어를 키워 나갑니다. 그 과정에서 함수와 클로저, 메모리와 상태,
컨티뉴에이션, 타입과 다형성처럼 실제 언어를 이루는 핵심 개념들을 하나씩 깊이 있게 이해하게
됩니다.

이 책은 **고려대학교 COSE212: 프로그래밍 언어** 강의의 교재로 쓰였으며, 강의 일정과 슬라이드는
[강의 홈페이지](https://plrg.korea.ac.kr/courses/cose212/)에서 볼 수 있습니다. 강의에서는 1부와
2부를 다루고, 3부와 4부는 더 깊이 공부하고 싶은 사람을 위한 심화 내용입니다.

## 이 프로그램은 무엇을 할까요

비슷한 퀴즈를 세 개 더 내 보겠습니다. 모두 몇 줄짜리 프로그램입니다. 답을
보기 전에 결과를 먼저 예상해 보세요.

### 퀴즈 1. 반복문 안에서 만든 함수

반복문을 돌면서 "지금의 `i`를 돌려주는 함수"를 세 개 만들고, 나중에 하나씩 불러 봅니다.

```python
# Python
fs = []
for i in range(3):
    fs.append(lambda: i)
[f() for f in fs]    # [2, 2, 2]
```

`[0, 1, 2]`를 기대했다면 놀랐을 것입니다. Python의 `for` 문은 반복마다 새 변수를 만들지 않고
**하나의 변수** `i`를 계속 고쳐 씁니다. 세 함수는 모두 그 변수를 붙잡고 있고, 함수를 부를
때는 반복문이 이미 끝나 `i`가 `2`가 된 뒤입니다.

JavaScript에서는 반복문의 변수를 어떻게 선언하느냐에 따라 결과가 갈립니다.

```javascript
// JavaScript
const fs = [], gs = [];
for (var i = 0; i < 3; i++) fs.push(() => i);
for (let j = 0; j < 3; j++) gs.push(() => j);
fs.map(f => f())    // [3, 3, 3]
gs.map(g => g())    // [0, 1, 2]
```

`var`로 선언하면 Python처럼 반복문 전체가 변수 하나를 함께 쓰고, `let`으로 선언하면 반복마다
새 변수가 생깁니다.

함수가 자기가 만들어진 곳의 변수를 붙잡아 두는 것을 <a id="g-closure"></a>클로저(closure)라고 합니다. 클로저가
*무엇을* 붙잡는지는 [일급 함수](./first-class-functions.md)에서, 여러 곳에서 함께 쓰는
변경 가능한 변수의 의미는 [변경 가능한 변수](./mutable-variables.md)에서 정확히 정의합니다.

### 퀴즈 2. 어느 `x`일까

함수 `f`는 바깥의 `x`를 읽습니다. `g` 안에서 `x`를 새로 만든 뒤 `f`를 부르면, `f`는 어느
`x`를 볼까요?

```scala
// Scala
val x = 1
def f() = x
def g() = { val x = 2; f() }
g()     // 1
```

```bash
# Bash
x=1
f() { echo $x; }
g() { local x=2; f; }
g       # 2
```

Scala에서 `f` 안의 `x`는 `f`가 **정의된** 곳의 `x`, 즉 `1`입니다. 반면 Bash에서는 `f`가
**호출된** 곳에서 가장 최근에 만든 `x`, 즉 `2`를 봅니다. 앞의 방식을 정적 스코핑(static
scoping), 뒤의 방식을 <a id="g-dynamic-scoping"></a>동적 스코핑(dynamic scoping)이라고 합니다. 둘의 차이는
[1차 함수](./first-order-functions.md)에서 추론 규칙 한 줄의 차이로 드러납니다.

### 퀴즈 3. 실행하기 전에 알 수 있을까

`b`가 거짓일 때만 문제가 되는 함수를 생각해 봅시다.

```python
# Python
def f(b):
    if b:
        return 1
    else:
        return 1 + "2"     # 이 줄이 실행될 때 TypeError

f(True)     # 1
f(False)    # TypeError
```

Python은 `f(True)`를 아무 문제 없이 실행합니다. 오류는 누군가 `f(False)`를 부르는
순간에야, 어쩌면 서비스가 배포된 뒤에야 드러납니다. 같은 실수를 Scala로 쓰면 어떨까요?

```scala
// Scala
def f(b: Boolean): Int =
  if b then 1
  else 1 + true     // 컴파일 오류: Int에 Boolean을 더할 수 없음
```

Scala 컴파일러는 프로그램을 **한 번도 실행하지 않고** 이 오류를 찾아내고, 실행 자체를
거부합니다. 이것이 <a id="g-type-system"></a>타입 시스템(type system)이 하는 일입니다. 어떻게 실행하지 않고도 오류를
알 수 있는지, 그리고 타입 검사를 통과한 프로그램은 정말 타입 오류를 내지 않는다고 어떻게
장담하는지가 2부의 주제입니다.

### 퀴즈가 말해 주는 것

세 퀴즈 모두 "그 언어를 써 봤다"는 경험만으로는 자신 있게 답하기 어렵습니다. 프로그램의
뜻은 생각보다 분명하지 않고, 언어마다 다르며, 미묘한 차이가 실제 버그로 이어집니다. 이
책은 이런 질문에 "아마 이렇겠지"가 아니라 **정확한 정의**로 답하는 방법을 가르칩니다.
이 밖에도 인자를 필요할 때까지 계산하지 않는 [지연 계산](./lazy-evaluation.md),
"남은 계산"을 값처럼 다루는 [컨티뉴에이션](./continuations.md)처럼 처음 보면 낯선 동작들을
같은 방법으로 하나씩 정의해 나갑니다.

## 프로그래밍 언어라는 분야

프로그래밍 언어(programming languages, PL)는 이름만 보면 언어 자체만 연구하는 분야 같지만,
실제로는 훨씬 넓습니다. 프로그램을 입력으로 받거나 출력으로 내놓는 모든 과정, 즉 **프로그램을
다루는 모든 것**이 이 분야의 연구 대상입니다. 프로그램을 실행하는 인터프리터, 다른 프로그램으로
바꾸는 컴파일러, 실행하지 않고 버그를 찾는 <a id="g-static-analyzer"></a>정적 분석기(static analyzer), 프로그램이 올바른지
증명하는 검증 도구, 버그를 찾을 입력을 만들어 내는 테스트 생성기, 명세나 예제로부터 프로그램을
만들어 내는 프로그램 합성기, 그리고 요즘의 AI 코드 생성기까지 모두 그렇습니다.

이런 도구들은 모두 몇 가지 기본 질문 위에 서 있습니다.

- **문법**(syntax): 어떤 글이 올바른 프로그램인가? 프로그램을 어떤 구조로 표현하는가?
- **의미**(semantics): 올바른 프로그램은 실행하면 무엇을 하는가?
- **타입 시스템**(type system): 실행하기 전에 어떤 잘못을 걸러 낼 수 있는가?
- **구현**(implementation): 인터프리터와 컴파일러를 어떻게 만드는가?
- <a id="g-verification"></a>**검증**(verification): 프로그램이, 또는 언어 자체가 원하는 성질을 정말 만족하는가?

이 질문들은 교실 밖에서도 생각보다 가까이 있습니다.

**요즘 언어의 기능.** 우리가 매일 쓰는 언어 기능의 상당수는 이 분야에서 연구되어 실제
언어로 들어간 것입니다. 이 책에서 그 기능들을 직접 정의하고 구현해 봅니다.

- [일급 함수](./first-class-functions.md) - JavaScript, Python, Kotlin, Rust의 람다와 클로저
- [쓰레기 수집](./garbage-collection.md) - Java, Python, JavaScript, Go가 메모리를 알아서 회수하는 방법
- [지연 계산](./lazy-evaluation.md) - Haskell과 Scala의 `lazy val`, 무한 스트림
- [컨티뉴에이션](./continuations.md) - 예외, 제너레이터, `async`/`await`의 바탕이 되는 개념
- [대수적 데이터 타입](./algebraic-data-types.md) - Rust의 `enum`과 `match`, Kotlin의 `sealed class`,
  Python의 `match`
- [매개변수 다형성](./parametric-polymorphism.md) - Java, C#, TypeScript, Rust의 제네릭
- [서브타입 다형성](./subtype-polymorphism.md) - Java와 C++의 상속, TypeScript의 구조적 타입
- [타입 추론](./type-inference.md) - Rust, Kotlin, TypeScript, Scala에서 `val x = 1`처럼 타입을
  적지 않아도 되는 이유

**언어의 구현과 설계.** V8, CPython, JVM은 각각 JavaScript, Python, Java 프로그램을 실행하는
인터프리터이자 컴파일러로, 이 분야의 지식이 모두 담긴 거대한 프로그램입니다. 이 책에서 만드는
작은 인터프리터들은 그 축소판입니다. 새로운 언어를 설계하는 일도 생각보다 흔합니다. SQL,
정규 표현식, 빌드 설정 파일처럼 특정 일에 맞춘 작은 언어인 도메인 특화 언어(domain-specific
language, DSL)도 모두 누군가 설계하고 구현한 언어입니다.

**버그를 찾는 도구와 보안.** 정적 분석기는 프로그램을 실행하지 않고 널 참조,
자원 누수, 보안 취약점 같은 버그를 찾습니다. Rust는 타입 시스템으로 메모리 안전성을
보장하고, 형식 검증으로 오류가 없음을 증명한 C 컴파일러 CompCert도 있습니다. 모두
프로그램의 의미를 정확히 정의하는 데서 출발합니다.

**실제 언어의 명세.** JavaScript 언어의 공식 명세인 [ECMA-262](https://tc39.es/ecma262/multipage/)는 수백 쪽에 이르고 해마다
개정됩니다. 이렇게 큰 명세에 모순은 없는지, 엔진들이 명세를 제대로 따르는지 사람의 눈만으로
확인하기는 어렵습니다. 그래서 명세에서 형식 의미를 뽑아내 기계로 검사하고 테스트를 만들어
내는 연구가 이루어지고 있습니다. [고려대학교 PLRG](https://plrg.korea.ac.kr/)에서 개발하는
[ESMeta](https://github.com/es-meta/esmeta)가 그 예입니다. ESMeta는 명세의 알고리즘을 그대로
실행할 수 있는 인터프리터로 바꾸고, 그 위에서 명세의 타입 오류를 찾거나 엔진을 시험할
JavaScript 프로그램을 만들어 냅니다. 그리고 이제는 공식 도구로 인정받아, ECMA-262와 공식 테스트 모음인
[Test262](https://github.com/tc39/test262)에 변경이 올라올 때마다 CI에서 자동으로 그 변경을
검사합니다. 연구실에서 만든 도구가 전 세계가 쓰는 JavaScript를 설계하고 검증하는 데 쓰이고
있는 셈입니다. 게다가 ESMeta는 이 책에서
쓰는 Scala로 쓰여 있어서, 이 책의 인터프리터들을 다 만들고 나면 그 코드가 꽤 낯익게 보일
것입니다. 관련 연구는 [PLRG 연구 소개](https://plrg.korea.ac.kr/research/#spec)에 모아
두었습니다.

한 걸음 더 나아가, 명세를 처음부터 기계가 읽을 수 있는 형식으로 쓰는 언어도 늘고 있습니다.
WebAssembly는 이 책과 같은 추론 규칙으로 의미를 정의하고, 2025년부터는
[SpecTec](https://webassembly.org/news/2025-03-27-spectec/)이라는 도구로 그 규칙에서 공식
명세 문서와 실행 가능한 인터프리터를 함께 만들어 냅니다. 네트워크 장비를 프로그래밍하는 언어
P4도 같은 방식의 P4-SpecTec을 공식 명세 작성 도구로 받아들이고 있습니다. 추론 규칙은 교과서
속 기호가 아니라 실제 언어의 표준을 쓰는 도구가 되어 가고 있습니다.

## 왜 지금 배워야 할까

지금까지 본 것은 주로 언어를 설계하고, 구현하고, 검사하는 사람들의 이야기였습니다. 그렇다면
언어를 *쓰기만* 하는 사람에게도 이 공부가 필요할까요? 요즘은 이 질문이 더 날카로워졌습니다.
코드의 상당 부분을 AI가 써 주기 때문입니다.

> AI가 코드를 써 준다면, 왜 굳이 **언어**를 깊이 배워야 할까요?

역설적이게도 AI가 코드를 많이 쓸수록 언어를 정확히 아는 일은 더 중요해집니다. 이유는 세
가지입니다.

첫째, **코드를 쓰는 일이 줄어든 만큼 읽고 판단하는 일이 늘어납니다.** AI가 만든 코드가
우리의 의도를 제대로 담고 있는지 확인하려면, 그 코드가 정확히 무엇을 *의미*하는지 알아야
합니다. 퀴즈 1의 코드도 그럴듯해 보였지만 기대와 전혀 다르게 동작했습니다. "대충 이런
뜻이겠지"로는 이런 버그를 잡아낼 수 없습니다.

둘째, **확실한 보장은 AI가 아니라 언어에서 나옵니다.** AI는 확률적으로 동작해서, 같은
요청에도 매번 조금씩 다른 코드를 내놓습니다. 반면 퀴즈 3의 Scala 컴파일러는 누가 쓴 코드든
같은 규칙으로 검사하고, 규칙에 어긋나면 실행 자체를 거부합니다. 이런 보장을 믿으려면 언어의
의미와 규칙이 직관이 아니라 **수학적으로** 정의되어 있어야 합니다. 이렇게 수학으로 정의한
의미를 <a id="g-formal-semantics"></a>형식 의미(formal semantics)라고 하고, 이 책이 내내 하는 일이 바로 이것입니다.

셋째, **AI가 만든 코드를 검사하는 것도 결국 프로그램입니다.** 요즘 AI 코딩 도구는 컴파일러,
타입 검사기, 테스트가 내놓는 결과를 보고 코드를 고칩니다. 이런 도구는 모두 프로그램을
*데이터*로 받아 분석하는 프로그램이고, 그런 도구를 만들고 제대로 쓰려면 언어를 정확히 알아야
합니다. 이 책에서 만드는 인터프리터와 타입 검사기가 그 가장 작은 예입니다.

정리하면, AI가 코드를 많이 쓸수록 사람에게 남는 일은 "이 코드가 정확히 무엇을 하는가"를
판단하는 일입니다. 이 책은 그 판단의 기준을 세우는 방법을 다룹니다.

## 이 책의 목표

처음에 말한 목적을 조금 더 구체적으로 적어 보겠습니다. 이 책을 다 읽고 나면 여러분은
다음과 같은 일을 할 수 있게 됩니다.

- 처음 보는 언어 기능이라도 그 의미를 추론 규칙으로 **정확히 적고**, 규칙을 따라 프로그램의
  결과를 손으로 계산할 수 있습니다.
- 추론 규칙을 보고 그 언어의 **인터프리터**와 **타입 검사기**를 직접 구현할 수 있습니다.
- 클로저, 지연 계산, 컨티뉴에이션, 제네릭, 타입 추론처럼 여러 언어에 흩어져 있는 기능을
  하나의 틀에서 이해하고 **비교**할 수 있습니다.
- 주어진 일에 맞는 언어를 평가해서 고르거나, 필요하다면 여러분만의 언어를 직접
  **설계**할 수 있습니다.

반대로 이 책이 다루지 *않는* 것도 분명히 해 두겠습니다. 이 책은 언어로 프로그램을 짜는
법이 아니라 **언어 자체**를 다룹니다. 그래서 **특정 언어를 배우지 않습니다.** Scala를 쓰기는
하지만 어디까지나 도구일 뿐이고, Python이나 Java의 문법을 익히는 책도 아닙니다. 또 이 책은
프로그래밍 입문서가 아닙니다. 프로그래밍 경험과
함께 이산 수학(특히 귀납법과 집합), 자료 구조, 계산 이론 정도는 이미 알고 있다고
가정합니다. Scala는 몰라도 괜찮습니다. 필요한 만큼은 [Scala 기초](./scala.md)에서 익힙니다.

## 인터프리터와 컴파일러

프로그램을 실행하는 방법은 크게 두 가지입니다.

<a id="g-interpreter"></a>**인터프리터**(interpreter)는 프로그램을 받아서 실행하고 그 결과를 내놓습니다.
`scala`, `python`, `bash` 같은 명령이나 탁상용 계산기가 그 예입니다. 인터프리터는
프로그램이 *어떻게 동작하는지* 이해하기에 좋고 구현하기도 쉽습니다.

<div style="text-align:center">
<svg viewBox="0 0 500 80" width="100%" style="max-width: 460px" role="img" aria-label="프로그램을 받아 결과를 내는 인터프리터" fill="currentColor" font-family="sans-serif">
<defs><marker id="arr-Interpreter" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<text x="60" y="30" text-anchor="middle" font-style="italic" font-family="serif" font-size="18">P</text>
<text x="60" y="54" text-anchor="middle" font-weight="bold" font-size="16">Program</text>
<line x1="108" y1="42" x2="158" y2="42" stroke="currentColor" stroke-width="2.5" marker-end="url(#arr-Interpreter)"/>
<rect rx="3" x="160" y="12" width="170" height="60" fill="#2a408e"/>
<text x="245" y="48" text-anchor="middle" fill="#ffffff" font-size="17">Interpreter</text>
<line x1="332" y1="42" x2="380" y2="42" stroke="currentColor" stroke-width="2.5" marker-end="url(#arr-Interpreter)"/>
<text x="430" y="47" text-anchor="middle" font-weight="bold" font-size="16">Result</text>
</svg>
</div>

<a id="g-compiler"></a>**컴파일러**(compiler)는 프로그램을 받아서 *다른 프로그램*을 만들어 냅니다. 예를 들어
`scalac`, `gcc`, `javac`는 소스 코드를 받아 바이트코드나 기계어로 된 프로그램을
만듭니다. 컴파일러가 만든 프로그램은 빠르게 실행되지만, 컴파일러를 구현하는 일은 훨씬
복잡합니다. 이 책에서도 [컨티뉴에이션으로 컴파일하기](./compiling-with-continuations.md)에서
컴파일 과정의 한 단계를 맛보지만, 컴파일러에 더 관심이 있다면 COSE312: 컴파일러 과목을
들어 보기를 권합니다.

<div style="text-align:center">
<svg viewBox="0 0 500 80" width="100%" style="max-width: 460px" role="img" aria-label="프로그램을 받아 다른 프로그램을 내는 컴파일러" fill="currentColor" font-family="sans-serif">
<defs><marker id="arr-Compiler" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<text x="60" y="30" text-anchor="middle" font-style="italic" font-family="serif" font-size="18">P</text>
<text x="60" y="54" text-anchor="middle" font-weight="bold" font-size="16">Program</text>
<line x1="108" y1="42" x2="158" y2="42" stroke="currentColor" stroke-width="2.5" marker-end="url(#arr-Compiler)"/>
<rect rx="3" x="160" y="12" width="170" height="60" fill="#2a408e"/>
<text x="245" y="48" text-anchor="middle" fill="#ffffff" font-size="17">Compiler</text>
<line x1="332" y1="42" x2="380" y2="42" stroke="currentColor" stroke-width="2.5" marker-end="url(#arr-Compiler)"/>
<text x="430" y="30" text-anchor="middle" font-style="italic" font-family="serif" font-size="18">P'</text>
<text x="430" y="54" text-anchor="middle" font-weight="bold" font-size="16">Program</text>
</svg>
</div>

인터프리터의 출력은 *결과 값*이고, 컴파일러의 출력은 *또 하나의 프로그램*이라는 점이 핵심
차이입니다. 컴파일러가 만든 프로그램은 다시 실행해야 비로소 결과가 나옵니다. 실제로는 둘을
섞어 쓰기도 합니다. Java는 소스 코드를 바이트코드로 컴파일한 뒤 JVM이 그 바이트코드를
실행하고, JVM은 자주 실행되는 부분을 실행 중에 다시 기계어로 컴파일합니다.

이 책에서는 인터프리터를 만드는 데 집중합니다. 인터프리터는 언어의 의미를 가장 직접적으로
드러내는 프로그램이어서, 언어를 이해하는 데 가장 좋은 도구이기 때문입니다. 그러면 인터프리터는
어떻게 만들까요?

## 이 책의 방법

이 책은 매 장 같은 일을 반복합니다. 언어의 **문법**을 정하고, **의미**를 수학으로 적고,
그 수학을 **코드로** 옮깁니다. 2부에서는 여기에 **타입 시스템**이 더해집니다. 그리고
다음 장에서 기능을 하나 더한 언어로 같은 일을 되풀이합니다.

<div style="text-align:center">
<svg viewBox="0 0 640 150" width="100%" style="max-width: 640px" role="img" aria-label="문법, 의미, 인터프리터, 타입 시스템의 네 단계를 장마다 되풀이하는 이 책의 방법" fill="currentColor" font-family="sans-serif">
<defs><marker id="arr-intro-method" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<rect x="10" y="16" width="130" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="75" y="42" text-anchor="middle" font-weight="bold" font-size="16">문법</text>
<text x="75" y="62" text-anchor="middle" font-size="12" opacity="0.85">BNF</text>
<line x1="142" y1="46" x2="168" y2="46" stroke="currentColor" stroke-width="2.2" marker-end="url(#arr-intro-method)"/>
<rect x="170" y="16" width="130" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.8"/>
<text x="235" y="42" text-anchor="middle" font-weight="bold" font-size="16">의미</text>
<text x="235" y="62" text-anchor="middle" font-size="12" opacity="0.85">추론 규칙</text>
<line x1="302" y1="46" x2="328" y2="46" stroke="currentColor" stroke-width="2.2" marker-end="url(#arr-intro-method)"/>
<rect x="330" y="16" width="130" height="60" rx="6" fill="#2a408e"/>
<text x="395" y="42" text-anchor="middle" font-weight="bold" font-size="16" fill="#ffffff">인터프리터</text>
<text x="395" y="62" text-anchor="middle" font-size="12" fill="#ffffff">Scala로 구현</text>
<line x1="462" y1="46" x2="488" y2="46" stroke="currentColor" stroke-width="2.2" marker-end="url(#arr-intro-method)"/>
<rect x="490" y="16" width="140" height="60" rx="6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-dasharray="6 4"/>
<text x="560" y="42" text-anchor="middle" font-weight="bold" font-size="16">타입 시스템</text>
<text x="560" y="62" text-anchor="middle" font-size="12" opacity="0.85">타입 규칙과 검사기(2부)</text>
<path d="M560,78 L560,108 L75,108 L75,80" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#arr-intro-method)"/>
<text x="318" y="132" text-anchor="middle" font-size="13">다음 장: 기능을 하나 더한 언어로 다시</text>
</svg>
</div>

예를 들어 1장에서는 "두 식을 각각 계산해서 나온 정수를 더한다"는 덧셈의 의미를 추론
규칙(inference rule) 하나로 적는데, 이 규칙은 Scala 인터프리터에서 `case` 한 줄이 됩니다. 이처럼
수학적 정의와 코드가 거의 한 줄씩 대응한다는 것을 이 책 내내 보게 될 텐데, 이 대응을 몸으로
익히는 것이 이 책에서 얻어 갈 가장 중요한 경험입니다. 언어가 아무리 커져도 이 방법은
그대로입니다.

## 이 책의 구성

이 책은 아주 단순한 산술 언어에서 출발해서, 장마다 기능을 하나씩 더해 가며 언어를
**키워 나가는** 방식으로 구성되어 있습니다. 앞 장의 언어와 인터프리터가 다음 장의
출발점이 되므로, 가능하면 순서대로 읽기를 권합니다. 아래 지도는 각 장에서 만나는 언어와
그 언어가 어디서 자라났는지를 보여 줍니다. 상자를 누르면 그 장으로, 주황색 상자(수업 프로젝트)를 누르면 과제 설명으로 갑니다.

<div style="text-align:center">
<svg class="lang-map" viewBox="0 0 680 652" width="100%" style="max-width: 640px" role="img" aria-label="AE에서 TIFAE까지 장마다 자라나는 언어의 지도와 세 가지 수업 프로젝트" fill="currentColor" font-family="sans-serif">
<defs><marker id="arr-intro-map" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<text x="10" y="18" font-size="13" font-weight="bold" opacity="0.85">1부. 타입 없는 언어</text>
<g font-family="ui-monospace, Menlo, monospace" text-anchor="middle">
<a href="./syntax-semantics.html"><rect x="10" y="28" width="74" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="47" y="49" font-size="14" font-weight="bold">AE</text><text x="47" y="65" font-size="11" font-family="sans-serif">1장</text></a>
<a href="./identifiers.html"><rect x="102" y="28" width="74" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="139" y="49" font-size="14" font-weight="bold">VAE</text><text x="139" y="65" font-size="11" font-family="sans-serif">2장</text></a>
<a href="./first-order-functions.html"><rect x="194" y="28" width="74" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="231" y="49" font-size="14" font-weight="bold">F1VAE</text><text x="231" y="65" font-size="11" font-family="sans-serif">3장</text></a>
<a href="./first-class-functions.html"><rect x="286" y="28" width="74" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="323" y="49" font-size="14" font-weight="bold">FVAE</text><text x="323" y="65" font-size="11" font-family="sans-serif">4장</text></a>
<a href="./lambda-calculus.html"><rect x="378" y="28" width="74" height="44" rx="5" fill="#2a408e"/><text x="415" y="49" font-size="14" font-weight="bold" fill="#ffffff">FAE</text><text x="415" y="65" font-size="11" font-family="sans-serif" fill="#ffffff">5장</text></a>
<a href="./recursive-functions.html"><rect x="470" y="28" width="74" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="507" y="49" font-size="14" font-weight="bold">RFAE</text><text x="507" y="65" font-size="11" font-family="sans-serif">6장</text></a>
<a href="./mutable-data-structures.html"><rect x="10" y="110" width="90" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="55" y="131" font-size="14" font-weight="bold">BFAE</text><text x="55" y="147" font-size="11" font-family="sans-serif">7장</text></a>
<a href="./mutable-variables.html"><rect x="118" y="110" width="90" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="163" y="131" font-size="14" font-weight="bold">MFAE</text><text x="163" y="147" font-size="11" font-family="sans-serif">8–9장</text></a>
<a href="./lazy-evaluation.html"><rect x="226" y="110" width="90" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="271" y="131" font-size="14" font-weight="bold">LFAE</text><text x="271" y="147" font-size="11" font-family="sans-serif">10장</text></a>
<a href="./continuations.html"><rect x="334" y="110" width="90" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="379" y="131" font-size="14" font-weight="bold">FAE-CPS</text><text x="379" y="147" font-size="11" font-family="sans-serif">11장</text></a>
<a href="./first-class-continuations.html"><rect x="442" y="110" width="90" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="487" y="131" font-size="14" font-weight="bold">KFAE</text><text x="487" y="147" font-size="11" font-family="sans-serif">12–13장</text></a>
<a href="./typed-languages.html"><rect x="10" y="208" width="90" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="55" y="229" font-size="14" font-weight="bold">TFAE</text><text x="55" y="245" font-size="11" font-family="sans-serif">14–15장</text></a>
<a href="./typing-recursive-functions.html"><rect x="170" y="208" width="90" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="215" y="229" font-size="14" font-weight="bold">TRFAE</text><text x="215" y="245" font-size="11" font-family="sans-serif">16장</text></a>
<a href="./algebraic-data-types.html"><rect x="330" y="208" width="90" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="375" y="229" font-size="14" font-weight="bold">ATFAE</text><text x="375" y="245" font-size="11" font-family="sans-serif">17장</text></a>
<a href="./parametric-polymorphism.html"><rect x="10" y="292" width="90" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="55" y="313" font-size="14" font-weight="bold">PTFAE</text><text x="55" y="329" font-size="11" font-family="sans-serif">18장</text></a>
<a href="./subtype-polymorphism.html"><rect x="120" y="292" width="90" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="165" y="313" font-size="14" font-weight="bold">STFAE</text><text x="165" y="329" font-size="11" font-family="sans-serif">19장</text></a>
<a href="./type-inference.html"><rect x="260" y="292" width="90" height="44" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="305" y="313" font-size="14" font-weight="bold">TIFAE</text><text x="305" y="329" font-size="11" font-family="sans-serif">20장</text></a>
<a class="proj" href="https://github.com/ku-plrg-classroom/docs/tree/main/cose212/mini-fsharp" target="_blank"><rect x="574" y="28" width="100" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="625" y="48" font-size="13">MiniFSharp</text><text x="625" y="64" font-size="11" font-family="sans-serif">5장 뒤 프로젝트</text></a>
<a class="proj" href="https://github.com/ku-plrg-classroom/docs/tree/main/cose212/mini-python" target="_blank"><rect x="574" y="110" width="100" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="625" y="130" font-size="13">MiniPython</text><text x="625" y="146" font-size="11" font-family="sans-serif">13장 뒤 프로젝트</text></a>
<a class="proj" href="https://github.com/ku-plrg-classroom/docs/tree/main/cose212/mini-scala" target="_blank"><rect x="574" y="292" width="100" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="625" y="312" font-size="13">MiniScala</text><text x="625" y="328" font-size="11" font-family="sans-serif">18장 뒤 프로젝트</text></a>
</g>
<g stroke="currentColor" stroke-width="1.6" fill="none">
<line x1="85" y1="50" x2="100" y2="50" marker-end="url(#arr-intro-map)"/>
<line x1="177" y1="50" x2="192" y2="50" marker-end="url(#arr-intro-map)"/>
<line x1="269" y1="50" x2="284" y2="50" marker-end="url(#arr-intro-map)"/>
<line x1="361" y1="50" x2="376" y2="50" marker-end="url(#arr-intro-map)"/>
<line x1="453" y1="50" x2="468" y2="50" marker-end="url(#arr-intro-map)"/>
<path d="M415,73 L415,91 M55,91 L487,91"/>
<line x1="55" y1="91" x2="55" y2="108" marker-end="url(#arr-intro-map)"/>
<line x1="163" y1="91" x2="163" y2="108" marker-end="url(#arr-intro-map)"/>
<line x1="271" y1="91" x2="271" y2="108" marker-end="url(#arr-intro-map)"/>
<line x1="379" y1="91" x2="379" y2="108" marker-end="url(#arr-intro-map)"/>
<line x1="487" y1="91" x2="487" y2="108" marker-end="url(#arr-intro-map)"/>
<line x1="425" y1="132" x2="440" y2="132" marker-end="url(#arr-intro-map)"/>
<line x1="101" y1="230" x2="168" y2="230" marker-end="url(#arr-intro-map)"/>
<line x1="261" y1="230" x2="328" y2="230" marker-end="url(#arr-intro-map)"/>
<line x1="55" y1="253" x2="55" y2="290" marker-end="url(#arr-intro-map)"/>
<line x1="85" y1="253" x2="150" y2="290" marker-end="url(#arr-intro-map)"/>
<line x1="240" y1="253" x2="290" y2="290" marker-end="url(#arr-intro-map)"/>
<line x1="10" y1="176" x2="672" y2="176" stroke-width="1" stroke-dasharray="3 4" opacity="0.5"/>
</g>
<text x="10" y="198" font-size="13" font-weight="bold" opacity="0.85">2부. 타입 있는 언어</text>
<rect x="450" y="214" width="14" height="14" rx="3" fill="#2a408e"/>
<text x="472" y="226" font-size="12">모든 언어의 바탕</text>
<g class="proj"><rect x="450" y="238" width="14" height="14" rx="5" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="472" y="250" font-size="12">수업 프로젝트</text></g>
<line x1="10" y1="358" x2="672" y2="358" stroke="currentColor" stroke-width="1" stroke-dasharray="3 4" opacity="0.5"/>
<text x="10" y="380" font-size="13" font-weight="bold" opacity="0.85">3부. 고급 타입 시스템</text>
<g font-family="ui-monospace, Menlo, monospace" text-anchor="middle">
<a href="./classes.html"><rect x="10" y="390" width="90" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="55" y="411" font-size="14" font-weight="bold">FJ</text><text x="55" y="427" font-size="11" font-family="sans-serif">21장</text></a>
<a href="./bounded-polymorphism.html"><rect x="120" y="390" width="90" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="165" y="411" font-size="14" font-weight="bold">BTFAE</text><text x="165" y="427" font-size="11" font-family="sans-serif">22장</text></a>
<a href="./type-classes.html"><rect x="230" y="390" width="90" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="275" y="411" font-size="14" font-weight="bold">TCFAE</text><text x="275" y="427" font-size="11" font-family="sans-serif">23장</text></a>
<a href="./linear-types.html"><rect x="340" y="390" width="90" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="385" y="411" font-size="14" font-weight="bold">LTFAE</text><text x="385" y="427" font-size="11" font-family="sans-serif">24장</text></a>
<a href="./gradual-typing.html"><rect x="450" y="390" width="90" height="44" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="495" y="411" font-size="14" font-weight="bold">GTFAE</text><text x="495" y="427" font-size="11" font-family="sans-serif">25장</text></a>
</g>
<line x1="10" y1="452" x2="672" y2="452" stroke="currentColor" stroke-width="1" stroke-dasharray="3 4" opacity="0.5"/>
<text x="10" y="474" font-size="13" font-weight="bold" opacity="0.85">4부. Lean으로 증명하는 타입 안전성</text>
<g font-family="sans-serif">
<a href="./lean-intro.html"><rect x="10" y="484" width="325" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="22" y="506" font-size="12" opacity="0.75">26장</text><text x="60" y="506" font-size="14" font-weight="bold">기계로 확인하는 증명</text></a>
<a href="./lean-fuel.html"><rect x="10" y="526" width="325" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="22" y="548" font-size="12" opacity="0.75">27장</text><text x="60" y="548" font-size="14" font-weight="bold">연료와 결과 분류</text><text x="323" y="548" font-size="12" text-anchor="end" font-family="ui-monospace, Menlo, monospace" opacity="0.75">TFAE</text></a>
<a href="./lean-errors.html"><rect x="10" y="568" width="325" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="22" y="590" font-size="12" opacity="0.75">28장</text><text x="60" y="590" font-size="14" font-weight="bold">허용된 오류와 재귀</text><text x="323" y="590" font-size="12" text-anchor="end" font-family="ui-monospace, Menlo, monospace" opacity="0.75">TRFAE</text></a>
<a href="./lean-scopes.html"><rect x="10" y="610" width="325" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="22" y="632" font-size="12" opacity="0.75">29장</text><text x="60" y="632" font-size="14" font-weight="bold">타입 이름의 스코프</text><text x="323" y="632" font-size="12" text-anchor="end" font-family="ui-monospace, Menlo, monospace" opacity="0.75">ATFAE</text></a>
<a href="./lean-subtyping.html"><rect x="345" y="484" width="325" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="357" y="506" font-size="12" opacity="0.75">30장</text><text x="395" y="506" font-size="14" font-weight="bold">두 가지 서브타입 관계</text><text x="658" y="506" font-size="12" text-anchor="end" font-family="ui-monospace, Menlo, monospace" opacity="0.75">STFAE</text></a>
<a href="./lean-logical-relations.html"><rect x="345" y="526" width="325" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="357" y="548" font-size="12" opacity="0.75">31장</text><text x="395" y="548" font-size="14" font-weight="bold">논리 관계</text><text x="658" y="548" font-size="12" text-anchor="end" font-family="ui-monospace, Menlo, monospace" opacity="0.75">PTFAE</text></a>
<a href="./lean-inference.html"><rect x="345" y="568" width="325" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/><text x="357" y="590" font-size="12" opacity="0.75">32장</text><text x="395" y="590" font-size="14" font-weight="bold">타입 추론의 건전성</text><text x="658" y="590" font-size="12" text-anchor="end" font-family="ui-monospace, Menlo, monospace" opacity="0.75">TIFAE</text></a>
</g>
</svg>
</div>

### Scala 기초

본격적으로 시작하기 전에 [Scala 기초](./scala.md)에서 이 책 전체에서 쓸 Scala의 핵심
기능을 익힙니다. 변경 불가능한 변수, 재귀, `case class`와 `enum`으로 만드는 대수적
데이터 타입, 패턴 매칭, 일급 함수, 그리고 `List`, `Option`, `Map` 같은 변경 불가능한
컬렉션을 다룹니다. 함수형 프로그래밍에 익숙하다면 빠르게 훑고 넘어가도 좋습니다.

### 1부. 타입 없는 언어

1부(1장부터 13장까지)에서는 타입 검사 없이 바로 실행하는 언어들을 다룹니다.

- **기초**: [문법과 의미](./syntax-semantics.md)에서 덧셈과 곱셈만 있는 산술 언어 `AE`로
  언어를 정의하는 방법(문법과 의미)과 인터프리터를 구현하는 방법을 배우고,
  [식별자](./identifiers.md)에서 변수를 더한 `VAE`를 만듭니다.
- **함수형 기능**: [1차 함수](./first-order-functions.md)(`F1VAE`),
  [일급 함수](./first-class-functions.md)와 클로저(`FVAE`), 모든 것을 함수만으로 표현하는
  [람다 계산](./lambda-calculus.md)(`FAE`), 그리고 [재귀 함수](./recursive-functions.md)(`RFAE`)를
  다룹니다.
- **명령형 기능**: [변경 가능한 자료 구조](./mutable-data-structures.md)(`BFAE`)와
  [변경 가능한 변수](./mutable-variables.md)(`MFAE`)로 메모리와 상태 변화를 모델링하고,
  [쓰레기 수집](./garbage-collection.md)에서 더 이상 쓰지 않는 메모리를 회수하는 방법을
  살펴봅니다.
- **고급 기능**: [지연 계산](./lazy-evaluation.md)(`LFAE`),
  [컨티뉴에이션](./continuations.md)(`FAE-CPS`), [일급 컨티뉴에이션](./first-class-continuations.md)(`KFAE`)을
  배우고, 마지막으로 [컨티뉴에이션으로 컴파일하기](./compiling-with-continuations.md)에서
  지금까지 배운 것을 모아 컴파일의 한 단계를 구현합니다.

### 2부. 타입 있는 언어

2부(14장부터 20장까지)에서는 프로그램을 실행하기 *전에* 잘못된 프로그램을 걸러 내는
타입 시스템을 다룹니다.

- [타입 시스템](./type-systems.md)에서 타입과 타입 규칙, 그리고 타입 안전성(type
  soundness)이라는 핵심 성질을 배우고, [타입 있는 언어](./typed-languages.md)(`TFAE`)와
  [재귀 함수의 타입](./typing-recursive-functions.md)(`TRFAE`)에서 1부의 언어에 타입을 붙입니다.
- [대수적 데이터 타입](./algebraic-data-types.md)(`ATFAE`)에서 배리언트와 패턴 매칭을 언어에
  더합니다.
- [매개변수 다형성](./parametric-polymorphism.md)(`PTFAE`)과
  [서브타입 다형성](./subtype-polymorphism.md)(`STFAE`)에서 하나의 코드를 여러 타입에 쓰는 두 가지
  방법을 배웁니다.
- [타입 추론](./type-inference.md)(`TIFAE`)에서 타입 변수와 타입 단일화를 써서, 프로그래머가 타입을
  적지 않아도 타입을 알아내는 방법을 배웁니다.

### 3부. 고급 타입 시스템

3부(21장부터 25장까지)는 강의에서 다루지 않는 심화 내용으로, 2부의 방법 그대로 실제 언어의
타입 기능을 하나씩 정의하고 구현합니다.

- [클래스와 상속](./classes.md)(`FJ`)에서 Java의 클래스, 상속, 캐스트를 Featherweight Java로
  정의합니다.
- [유계 다형성과 변성](./bounded-polymorphism.md)(`BTFAE`)에서 매개변수 다형성과 서브타입 다형성을
  합치고, `List[+A]` 같은 변성을 다룹니다.
- [타입 클래스](./type-classes.md)(`TCFAE`)에서 Haskell의 타입 클래스, Scala의 `given`, Rust의
  trait 뒤에 있는 임시 다형성을 다룹니다.
- [선형 타입과 소유권](./linear-types.md)(`LTFAE`)에서 값을 한 번만 쓰게 하는 타입으로 Rust의
  소유권이 막아 주는 메모리 버그를 설명합니다.
- [점진적 타입](./gradual-typing.md)(`GTFAE`)에서 TypeScript의 `any`처럼 정적 타입과 동적 타입을
  섞어 쓰는 방법을 다룹니다.

### 4부. Lean으로 증명하는 타입 안전성

2부에서는 "타입 검사를 통과한 프로그램은 실행 중에 타입 오류를 내지 않는다"는 타입
안전성을 배우지만, 그 증명은 손으로 따라가는 수준에 머뭅니다. 4부(26장부터 32장까지)에서는
증명 보조기 Lean 4로 2부 언어들의 타입 안전성을 기계로 검증되는 증명으로 씁니다. Lean 자체는
가르치지 않고, [기계로 확인하는 증명](./lean-intro.md)에서 알고 와야 할 것과 공부할 자료를
안내합니다. 장은 언어별이 아니라 새로 필요한 증명 아이디어별로 나뉩니다.

- [연료와 결과 분류](./lean-fuel.md): 모든 증명의 공통 틀(`TFAE`)
- [허용된 오류와 재귀](./lean-errors.md): 0으로 나누기와 재귀 클로저(`TRFAE`)
- [타입 이름의 스코프](./lean-scopes.md): 전역이 아닌 타입 이름(`ATFAE`)
- [두 가지 서브타입 관계](./lean-subtyping.md): 알고리즘적 규칙과 선언적 규칙(`STFAE`)
- [논리 관계](./lean-logical-relations.md): 귀납만으로는 부족할 때(`PTFAE`)
- [타입 추론의 건전성](./lean-inference.md): 추론 결과가 옳다는 증명(`TIFAE`)

## 이 책을 읽는 방법

이 책은 한 학기(16주) 강의에 맞추어 쓰였습니다. 강의에서는 대략 일주일에 한 장씩
나아가며, 1부의 [지연 계산](./lazy-evaluation.md)까지가 중간고사 범위, 그 뒤부터 2부 끝까지가
기말고사 범위에 해당합니다.

각 장은 새 기능이 왜 필요한지 묻는 데서 시작해, 앞에서 본 방법대로 **문법**을 정하고
**의미**를 추론 규칙으로 정의한 다음 **인터프리터**로 옮깁니다. 몇 가지 읽는 요령을
소개합니다.

- **코드는 직접 실행해 보세요.** 책에 나온 Scala 코드는 대부분 그대로 실행할 수 있습니다.
  [Scastie](https://scastie.scala-lang.org/)나 Scala REPL에 붙여 넣고 값을 바꿔 가며 돌려
  보면 훨씬 빨리 이해됩니다.
- **추론 규칙과 코드를 나란히 놓고 읽으세요.** 규칙 하나가 `match`의
  `case` 하나에 대응하는 경우가 많습니다. 이 대응이 눈에 들어오기 시작하면 새 언어의 인터프리터를 만드는 일이 훨씬 쉬워집니다.
- **규칙을 손으로 적용해 보세요.** 작은 프로그램 하나를 골라 추론 규칙을 차례로 적용해
  결과를 구해 보면, 규칙의 뜻이 머리가 아니라 손에 남습니다.
- **"생각해 보기"에서 잠깐 멈추세요.** 본문 중간의 질문은 바로 다음 문단을 읽기보다 잠시
  스스로 답해 본 뒤 넘어가는 것이 좋습니다.
- **연습 문제와 과제를 풀어 보세요.** 각 장 끝의 연습 문제와 강의 과제는 직접 인터프리터와
  타입 검사기를 구현해 보는 문제입니다. 과제는 위 지도의 언어마다 하나씩(`ae`, `vae`, ...,
  `tifae`) 있고, 그 사이사이에 MiniFSharp, MiniPython, MiniScala라는 작은 언어를 구현하는
  프로젝트 세 개가 있습니다. 과제 설명은
  [과제 문서 저장소](https://github.com/ku-plrg-classroom/docs/tree/main/cose212)에 모여 있습니다. 시험 문제와도
  밀접하게 연결되어 있으니 직접 풀어 보기를 강하게 권합니다.
- **용어가 헷갈리면 [용어집](./glossary.md)을 보세요.** 한국어 용어가 처음 나올 때는 괄호
  안에 영어를 함께 적었고, 용어집에 그 대응을 모아 두었습니다.

## 감사의 말

이 책은 UNIST [홍재민](https://hjaem.info/) 교수님과 KAIST [류석영](https://plrg.kaist.ac.kr/ryu)
교수님이 쓰신 [*Introduction to Programming Languages*](https://hjaem.info/itpl)에서 큰 영감을
받았습니다. 언어를 하나씩 키워 가며 의미를 정의하고 인터프리터를 구현하는 이 책의 흐름은
그 교재에 많은 빚을 지고 있습니다. 깊이 감사드립니다.

이 책의 내용은 고려대학교 COSE212 강의에서 나왔습니다. 그동안 이 강의를 들은 모든 학생에게
감사드립니다. 학생들의 질문과 답안에서 배운 것들이 책 곳곳에 녹아 있습니다. 또 강의를 함께
꾸려 온 모든 조교에게 감사드립니다.

잘못된 곳이나 고칠 점을 발견하면 [GitHub 이슈](https://github.com/ku-plrg/pl-book/issues)로
알려 주세요. 앞으로 이 책을 함께 고쳐 나갈 모든 분께 미리 감사드립니다.
