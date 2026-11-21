# 식별자

지금까지 다룬 AE는 숫자와 덧셈, 곱셈만 있는 아주 작은 언어였습니다. 이 언어로는 `(1 + 2) * (1 + 2)`처럼 같은 계산을 두 번 적어야 하고, 중간 결과에 이름을 붙여 다시 쓸 수도 없습니다. 실제 프로그래밍에서 우리가 가장 먼저 하는 일 중 하나가 바로 "이 값을 `x`라고 부르자"인데 말이죠.

이 장에서는 이름, 즉 <a id="g-identifier"></a>**식별자(identifier)** 를 다룹니다. 먼저 식별자가 프로그램 안에서 어떤 역할을 하는지, 어디서 정의되고 어디서 쓰이며 어디까지 유효한지를 정확한 용어로 정리합니다. 그다음 AE에 변수를 더한 언어 VAE를 정의하고, 변수의 값을 기억해 두는 <a id="g-environment"></a>**환경(environment)** 을 이용해 인터프리터와 자연 의미(natural semantics)을 함께 만들어 봅니다. 여기서 익히는 개념들(묶는 출현, 스코프, 자유 식별자, 섀도잉, 환경)은 앞으로 함수, 클로저, 타입 시스템을 다룰 때까지 계속 쓰이므로 이 장을 단단히 다져 두는 것이 좋습니다.

## 식별자란

**식별자**는 프로그램 안의 어떤 요소에 붙인 **이름**입니다. Scala만 봐도 여러 종류의 식별자가 있습니다.

```scala
/* Scala */

// variable names
val x: Int = 42

// function and parameter names
def f(a: Int, b: Int): Int = a + b

// class and field names
case class Person(name: String, age: Int)
```

변수 이름 `x`, 함수 이름 `f`와 <a id="g-parameter"></a>매개변수(parameter) 이름 `a`, `b`, 클래스 이름 `Person`과 필드 이름 `name`, `age`가 모두 식별자입니다. 종류는 달라도 "어딘가에서 이름을 정의하고, 다른 곳에서 그 이름을 써서 정의된 것을 가리킨다"는 구조는 같습니다. 이 구조를 정확히 말하기 위해 몇 가지 용어를 도입하겠습니다.

### 묶인 식별자

다음 Scala 프로그램을 예로 들겠습니다. 이 절의 모든 설명은 이 프로그램을 기준으로 합니다.

```scala
/* Scala */
val x: Int = 3

val y: Int = x + z

def add(a: Int, b: Int): Int =
  val x: Int = a + b
  x + add(y, z)

add(x, b)
```

<a id="g-bound-identifier"></a>**묶인 식별자(bound identifier)** 는 프로그램 안에서 **정의된** 식별자입니다. 묶인 식별자를 이야기할 때는 세 가지를 구분합니다.

- <a id="g-binding-occurrence"></a>**묶는 출현(binding occurrence)**: 식별자가 **정의되는** 위치입니다.
- <a id="g-scope"></a>**스코프(scope)**: 그 식별자를 **쓸 수 있는** 범위입니다.
- <a id="g-bound-occurrence"></a>**묶인 출현(bound occurrence)**: 식별자의 값을 **찾아 쓰는(lookup)** 위치입니다.

먼저 묶는 출현을 찾아봅시다. 위 프로그램에서 이름을 새로 정의하는 곳은 다음 여섯 군데입니다.

1. 첫 줄 `val x: Int = 3`의 `x`
2. `val y: Int = x + z`의 `y`
3. `def add(...)`의 함수 이름 `add`
4. 매개변수 `a`
5. 매개변수 `b`
6. 함수 본문 안의 `val x: Int = a + b`의 `x`

다음으로 각각의 스코프를 살펴봅시다.

1. 첫 번째 `x`의 스코프는 그 정의 **다음 줄부터 프로그램 끝까지**, 즉 `val y ...`부터 마지막 줄 `add(x, b)`까지입니다.
2. `y`의 스코프도 그 정의 다음부터 프로그램 끝까지입니다. 그래서 `add`의 본문에서도 `y`를 쓸 수 있습니다.
3. 함수 이름 `add`의 스코프는 조금 특별합니다. 함수 **본문**(`val x ...`와 `x + add(y, z)`)과 함수 정의 **이후**(`add(x, b)`)를 합친 범위입니다. 본문이 스코프에 들어가기 때문에 `add`가 자기 자신을 부르는 재귀 호출이 가능합니다.
4. 매개변수 `a`의 스코프는 함수 본문 전체입니다.
5. 매개변수 `b`의 스코프도 함수 본문 전체입니다. 함수 바깥의 `add(x, b)`는 `b`의 스코프가 아니라는 점을 기억해 두세요.
6. 본문 안 `x`의 스코프는 그 정의 다음 줄인 `x + add(y, z)`뿐입니다.

아래 그림은 여섯 묶는 출현의 스코프를 왼쪽 위부터 순서대로 파란 영역으로 표시한 것입니다. `add`의 스코프(셋째 그림)가 두 조각으로 나뉘어 있는 것과, 매개변수 `b`의 스코프(다섯째 그림)에 마지막 줄이 들어가지 않는 것을 확인해 보세요.

<div style="text-align:center">
<svg viewBox="-8 -8 572 682" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="여섯 묶는 출현 각각의 스코프. 묶는 출현은 채운 상자, 스코프는 파란 영역" font-family="sans-serif" fill="currentColor">
<rect x="0.0" y="0.0" width="272.0" height="214.0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="12.0" y="20.0" font-size="14" font-weight="bold">1. 첫 줄의 x</text>
<rect x="8.0" y="63.7" width="242.8" height="136.2" fill="#2f4fb8" fill-opacity="0.12" stroke="#2f4fb8" stroke-width="1.6" rx="3"/>
<text x="240.8" y="195.9" text-anchor="end" font-size="12" font-weight="bold" fill="#2f4fb8">스코프</text>
<rect x="41.3" y="27.6" width="11.8" height="18.2" fill="#2a408e" rx="2"/>
<text x="12.0" y="41.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="43.3" y="41.0" font-size="13" font-family="ui-monospace, Menlo, monospace" fill="#ffffff">x</text>
<text x="51.1" y="41.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="66.8" y="41.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="98.1" y="41.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="113.7" y="41.0" font-size="13" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="12.0" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="43.3" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="51.1" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="66.8" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="98.1" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="113.7" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="129.4" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="145.0" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="12.0" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">def</text>
<text x="43.3" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="66.8" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="74.6" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="82.4" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="98.1" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="121.6" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="137.2" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="145.0" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="160.7" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="184.2" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="192.0" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="207.6" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="239.0" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="27.7" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="59.0" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="66.8" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="82.4" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="113.7" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="129.4" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="145.0" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="160.7" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="27.7" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="43.3" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="59.0" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="82.4" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="90.3" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="98.1" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="113.7" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="121.6" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="12.0" y="193.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="35.5" y="193.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="43.3" y="193.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="51.1" y="193.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="66.8" y="193.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="74.6" y="193.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<rect x="284.0" y="0.0" width="272.0" height="214.0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="296.0" y="20.0" font-size="14" font-weight="bold">2. y</text>
<rect x="292.0" y="101.7" width="242.8" height="98.2" fill="#2f4fb8" fill-opacity="0.12" stroke="#2f4fb8" stroke-width="1.6" rx="3"/>
<text x="524.8" y="195.9" text-anchor="end" font-size="12" font-weight="bold" fill="#2f4fb8">스코프</text>
<rect x="325.3" y="65.7" width="11.8" height="18.2" fill="#2a408e" rx="2"/>
<text x="296.0" y="41.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="327.3" y="41.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="335.1" y="41.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="350.8" y="41.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="382.1" y="41.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="397.7" y="41.0" font-size="13" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="296.0" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="327.3" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace" fill="#ffffff">y</text>
<text x="335.1" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="350.8" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="382.1" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="397.7" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="413.4" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="429.0" y="79.0" font-size="13" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="296.0" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">def</text>
<text x="327.3" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="350.8" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="358.6" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="366.4" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="382.1" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="405.6" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="421.2" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="429.0" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="444.7" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="468.2" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="476.0" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="491.6" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="523.0" y="117.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="311.7" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="343.0" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="350.8" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="366.4" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="397.7" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="413.4" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="429.0" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="444.7" y="136.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="311.7" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="327.3" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="343.0" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="366.4" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="374.3" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="382.1" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="397.7" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="405.6" y="155.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="296.0" y="193.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="319.5" y="193.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="327.3" y="193.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="335.1" y="193.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="350.8" y="193.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="358.6" y="193.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<rect x="0.0" y="226.0" width="272.0" height="214.0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="12.0" y="246.0" font-size="14" font-weight="bold">3. 함수 이름 add</text>
<rect x="23.7" y="346.6" width="148.9" height="41.2" fill="#2f4fb8" fill-opacity="0.12" stroke="#2f4fb8" stroke-width="1.6" rx="3"/>
<rect x="8.0" y="403.6" width="78.4" height="22.2" fill="#2f4fb8" fill-opacity="0.12" stroke="#2f4fb8" stroke-width="1.6" rx="3"/>
<text x="88.4" y="421.9" font-size="12" font-weight="bold" fill="#2f4fb8">스코프</text>
<rect x="41.3" y="329.6" width="27.5" height="18.2" fill="#2a408e" rx="2"/>
<text x="12.0" y="267.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="43.3" y="267.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="51.1" y="267.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="66.8" y="267.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="98.1" y="267.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="113.7" y="267.0" font-size="13" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="12.0" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="43.3" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="51.1" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="66.8" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="98.1" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="113.7" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="129.4" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="145.0" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="12.0" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">def</text>
<text x="43.3" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace" fill="#ffffff">add</text>
<text x="66.8" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="74.6" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="82.4" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="98.1" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="121.6" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="137.2" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="145.0" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="160.7" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="184.2" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="192.0" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="207.6" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="239.0" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="27.7" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="59.0" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="66.8" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="82.4" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="113.7" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="129.4" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="145.0" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="160.7" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="27.7" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="43.3" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="59.0" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="82.4" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="90.3" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="98.1" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="113.7" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="121.6" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="12.0" y="419.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="35.5" y="419.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="43.3" y="419.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="51.1" y="419.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="66.8" y="419.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="74.6" y="419.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="96.4" y="402.0" text-anchor="middle" font-size="18" font-weight="bold" fill="#2f4fb8">+</text>
<rect x="284.0" y="226.0" width="272.0" height="214.0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="296.0" y="246.0" font-size="14" font-weight="bold">4. 매개변수 a</text>
<rect x="307.7" y="346.6" width="148.9" height="41.2" fill="#2f4fb8" fill-opacity="0.12" stroke="#2f4fb8" stroke-width="1.6" rx="3"/>
<text x="458.5" y="383.9" font-size="12" font-weight="bold" fill="#2f4fb8">스코프</text>
<rect x="356.6" y="329.6" width="11.8" height="18.2" fill="#2a408e" rx="2"/>
<text x="296.0" y="267.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="327.3" y="267.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="335.1" y="267.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="350.8" y="267.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="382.1" y="267.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="397.7" y="267.0" font-size="13" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="296.0" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="327.3" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="335.1" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="350.8" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="382.1" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="397.7" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="413.4" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="429.0" y="305.0" font-size="13" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="296.0" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">def</text>
<text x="327.3" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="350.8" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="358.6" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace" fill="#ffffff">a</text>
<text x="366.4" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="382.1" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="405.6" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="421.2" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="429.0" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="444.7" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="468.2" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="476.0" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="491.6" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="523.0" y="343.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="311.7" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="343.0" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="350.8" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="366.4" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="397.7" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="413.4" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="429.0" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="444.7" y="362.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="311.7" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="327.3" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="343.0" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="366.4" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="374.3" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="382.1" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="397.7" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="405.6" y="381.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="296.0" y="419.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="319.5" y="419.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="327.3" y="419.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="335.1" y="419.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="350.8" y="419.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="358.6" y="419.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<rect x="0.0" y="452.0" width="272.0" height="214.0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="12.0" y="472.0" font-size="14" font-weight="bold">5. 매개변수 b</text>
<rect x="23.7" y="572.6" width="148.9" height="41.2" fill="#2f4fb8" fill-opacity="0.12" stroke="#2f4fb8" stroke-width="1.6" rx="3"/>
<text x="174.5" y="609.9" font-size="12" font-weight="bold" fill="#2f4fb8">스코프</text>
<rect x="135.2" y="555.6" width="11.8" height="18.2" fill="#2a408e" rx="2"/>
<text x="12.0" y="493.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="43.3" y="493.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="51.1" y="493.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="66.8" y="493.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="98.1" y="493.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="113.7" y="493.0" font-size="13" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="12.0" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="43.3" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="51.1" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="66.8" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="98.1" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="113.7" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="129.4" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="145.0" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="12.0" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">def</text>
<text x="43.3" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="66.8" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="74.6" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="82.4" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="98.1" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="121.6" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="137.2" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace" fill="#ffffff">b</text>
<text x="145.0" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="160.7" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="184.2" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="192.0" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="207.6" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="239.0" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="27.7" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="59.0" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="66.8" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="82.4" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="113.7" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="129.4" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="145.0" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="160.7" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="27.7" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="43.3" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="59.0" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="82.4" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="90.3" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="98.1" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="113.7" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="121.6" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="12.0" y="645.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="35.5" y="645.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="43.3" y="645.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="51.1" y="645.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="66.8" y="645.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="74.6" y="645.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<rect x="284.0" y="452.0" width="272.0" height="214.0" fill="none" stroke="currentColor" stroke-width="1"/>
<text x="296.0" y="472.0" font-size="14" font-weight="bold">6. 본문 안의 x</text>
<rect x="307.7" y="591.6" width="109.7" height="22.2" fill="#2f4fb8" fill-opacity="0.12" stroke="#2f4fb8" stroke-width="1.6" rx="3"/>
<text x="419.4" y="609.9" font-size="12" font-weight="bold" fill="#2f4fb8">스코프</text>
<rect x="341.0" y="574.6" width="11.8" height="18.2" fill="#2a408e" rx="2"/>
<text x="296.0" y="493.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="327.3" y="493.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="335.1" y="493.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="350.8" y="493.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="382.1" y="493.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="397.7" y="493.0" font-size="13" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="296.0" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="327.3" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="335.1" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="350.8" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="382.1" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="397.7" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="413.4" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="429.0" y="531.0" font-size="13" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="296.0" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">def</text>
<text x="327.3" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="350.8" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="358.6" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="366.4" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="382.1" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="405.6" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="421.2" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="429.0" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="444.7" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="468.2" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="476.0" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="491.6" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="523.0" y="569.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="311.7" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="343.0" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace" fill="#ffffff">x</text>
<text x="350.8" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="366.4" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="397.7" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="413.4" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="429.0" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="444.7" y="588.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="311.7" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="327.3" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="343.0" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="366.4" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="374.3" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="382.1" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="397.7" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="405.6" y="607.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="296.0" y="645.0" font-size="13" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="319.5" y="645.0" font-size="13" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="327.3" y="645.0" font-size="13" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="335.1" y="645.0" font-size="13" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="350.8" y="645.0" font-size="13" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="358.6" y="645.0" font-size="13" font-family="ui-monospace, Menlo, monospace">)</text>
</svg>
</div>

이제 묶인 출현마다 그것이 가리키는 묶는 출현으로 화살표를 그린다고 생각해 봅시다. 결과는 다음과 같습니다.

| 묶인 출현 | 가리키는 묶는 출현 |
|---|---|
| `val y: Int = x + z`의 `x` | 첫 줄의 `x` |
| `val x: Int = a + b`의 `a` | 매개변수 `a` |
| `val x: Int = a + b`의 `b` | 매개변수 `b` |
| `x + add(y, z)`의 `x` | 본문 안의 `x` (첫 줄의 `x`가 **아님**) |
| `x + add(y, z)`의 `add` | 함수 이름 `add` |
| `x + add(y, z)`의 `y` | 둘째 줄의 `y` |
| 마지막 줄 `add(x, b)`의 `add` | 함수 이름 `add` |
| 마지막 줄 `add(x, b)`의 `x` | 첫 줄의 `x` |

그림으로 그리면 다음과 같습니다. 상자로 표시한 것이 묶인 출현이고, 화살표 끝이 그것을 정의한 묶는 출현입니다.

<div style="text-align:center">
<svg viewBox="-20 -10 387 318" width="100%" style="max-width: 460px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="묶인 출현(상자)에서 그것을 정의한 묶는 출현으로 그린 화살표" font-family="sans-serif" fill="currentColor">
<defs><marker id="identifiers-fig-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<rect x="143.2" y="97.8" width="13.6" height="22.0" fill="none" stroke="#2f4fb8" stroke-width="2" rx="2"/>
<rect x="162.5" y="187.8" width="13.6" height="22.0" fill="none" stroke="#2f4fb8" stroke-width="2" rx="2"/>
<rect x="201.0" y="187.8" width="13.6" height="22.0" fill="none" stroke="#2f4fb8" stroke-width="2" rx="2"/>
<rect x="37.3" y="217.8" width="13.6" height="22.0" fill="none" stroke="#2f4fb8" stroke-width="2" rx="2"/>
<rect x="75.8" y="217.8" width="32.9" height="22.0" fill="none" stroke="#2f4fb8" stroke-width="2" rx="2"/>
<rect x="114.3" y="217.8" width="13.6" height="22.0" fill="none" stroke="#2f4fb8" stroke-width="2" rx="2"/>
<rect x="18.0" y="277.8" width="32.9" height="22.0" fill="none" stroke="#2f4fb8" stroke-width="2" rx="2"/>
<rect x="56.5" y="277.8" width="13.6" height="22.0" fill="none" stroke="#2f4fb8" stroke-width="2" rx="2"/>
<text x="20.0" y="24.0" font-size="16" font-family="ui-monospace, Menlo, monospace" opacity="0.6">/* Scala */</text>
<text x="20.0" y="54.0" font-size="16" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="58.5" y="54.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="68.2" y="54.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="87.4" y="54.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="126.0" y="54.0" font-size="16" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="145.2" y="54.0" font-size="16" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="20.0" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="58.5" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="68.2" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="87.4" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="126.0" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="145.2" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="164.5" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="183.7" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="20.0" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace" font-weight="bold">def</text>
<text x="58.5" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="87.4" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="97.1" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="106.7" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="126.0" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="154.8" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="174.1" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="183.7" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="203.0" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="231.9" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="241.5" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="260.8" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="299.3" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="39.3" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="77.8" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="87.4" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="106.7" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="145.2" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="164.5" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="183.7" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="203.0" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="39.3" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="58.5" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="77.8" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="106.7" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="116.3" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="126.0" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="145.2" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="154.8" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="20.0" y="294.0" font-size="16" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="48.9" y="294.0" font-size="16" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="58.5" y="294.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="68.2" y="294.0" font-size="16" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="87.4" y="294.0" font-size="16" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="97.1" y="294.0" font-size="16" font-family="ui-monospace, Menlo, monospace">)</text>
<path d="M150.0,97.8 Q96.7,78.8 63.3,61.8" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#identifiers-fig-2)"/>
<path d="M169.3,187.8 Q127.6,183.8 101.9,181.8" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#identifiers-fig-2)"/>
<path d="M207.8,187.8 Q199.4,183.8 178.9,181.8" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#identifiers-fig-2)"/>
<path d="M44.1,217.8 Q55.3,213.8 82.6,211.8" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#identifiers-fig-2)"/>
<path d="M92.2,217.8 Q94.6,198.8 73.0,181.8" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#identifiers-fig-2)"/>
<path d="M121.1,217.8 Q106.2,168.8 63.3,121.8" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#identifiers-fig-2)"/>
<path d="M18.0,288.8 C-12.0,277.8 -12.0,199.8 54.5,175.8" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#identifiers-fig-2)"/>
<path d="M63.3,299.8 C348.6,339.8 368.6,-22.2 63.3,35.8" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#identifiers-fig-2)"/>
</svg>
</div>

묶인 출현은 언제나 자신을 스코프 안에 품고 있는 묶는 출현을 가리킵니다. 표에서 넷째 줄의 `x`는 첫 줄 `x`의 스코프 안에도, 본문 안 `x`의 스코프 안에도 있습니다. 이럴 때 어느 쪽을 가리키는지는 잠시 뒤 섀도잉에서 다룹니다.

### 자유 식별자

표에 빠진 출현이 있습니다. `val y: Int = x + z`의 `z`, `x + add(y, z)`의 `z`, 그리고 마지막 줄 `add(x, b)`의 `b`입니다. 이들은 화살표를 그릴 곳이 없습니다.

<a id="g-free-identifier"></a>**자유 식별자(free identifier)** 는 프로그램의 현재 스코프에서 **정의되지 않은** 식별자입니다. `z`는 프로그램 어디에서도 정의되지 않았으니 자유 식별자입니다. 마지막 줄의 `b`는 조금 더 흥미롭습니다. 프로그램에 `b`라는 매개변수가 있기는 하지만, 그 스코프는 `add`의 본문뿐이므로 마지막 줄에서는 정의되지 않은 이름입니다. 즉 "자유롭다"는 것은 이름 자체의 성질이 아니라 **그 출현이 놓인 위치**의 성질입니다.

<div style="text-align:center">
<svg viewBox="12 0 336 271" width="100%" style="max-width: 420px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="자유 식별자 z, z, b에 X 표시" font-family="sans-serif" fill="currentColor">
<text x="20.0" y="24.0" font-size="16" font-family="ui-monospace, Menlo, monospace" opacity="0.6">/* Scala */</text>
<text x="20.0" y="50.0" font-size="16" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="58.5" y="50.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="68.2" y="50.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="87.4" y="50.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="126.0" y="50.0" font-size="16" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="145.2" y="50.0" font-size="16" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="20.0" y="102.0" font-size="16" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="58.5" y="102.0" font-size="16" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="68.2" y="102.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="87.4" y="102.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="126.0" y="102.0" font-size="16" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="145.2" y="102.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="164.5" y="102.0" font-size="16" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="183.7" y="102.0" font-size="16" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="20.0" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace" font-weight="bold">def</text>
<text x="58.5" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="87.4" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="97.1" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="106.7" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="126.0" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="154.8" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="174.1" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="183.7" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="203.0" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="231.9" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="241.5" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="260.8" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="299.3" y="154.0" font-size="16" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="39.3" y="180.0" font-size="16" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="77.8" y="180.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="87.4" y="180.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="106.7" y="180.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="145.2" y="180.0" font-size="16" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="164.5" y="180.0" font-size="16" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="183.7" y="180.0" font-size="16" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="203.0" y="180.0" font-size="16" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="39.3" y="206.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="58.5" y="206.0" font-size="16" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="77.8" y="206.0" font-size="16" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="106.7" y="206.0" font-size="16" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="116.3" y="206.0" font-size="16" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="126.0" y="206.0" font-size="16" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="145.2" y="206.0" font-size="16" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="154.8" y="206.0" font-size="16" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="20.0" y="258.0" font-size="16" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="48.9" y="258.0" font-size="16" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="58.5" y="258.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="68.2" y="258.0" font-size="16" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="87.4" y="258.0" font-size="16" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="97.1" y="258.0" font-size="16" font-family="ui-monospace, Menlo, monospace">)</text>
<line x1="181.7" y1="86.8" x2="195.4" y2="106.8" stroke="#2f4fb8" stroke-width="3"/>
<line x1="195.4" y1="86.8" x2="181.7" y2="106.8" stroke="#2f4fb8" stroke-width="3"/>
<line x1="143.2" y1="190.8" x2="156.8" y2="210.8" stroke="#2f4fb8" stroke-width="3"/>
<line x1="156.8" y1="190.8" x2="143.2" y2="210.8" stroke="#2f4fb8" stroke-width="3"/>
<line x1="85.4" y1="242.8" x2="99.1" y2="262.8" stroke="#2f4fb8" stroke-width="3"/>
<line x1="99.1" y1="242.8" x2="85.4" y2="262.8" stroke="#2f4fb8" stroke-width="3"/>
<rect x="201.3" y="34.8" width="138.2" height="24.0" fill="#2a408e" rx="4"/>
<text x="270.4" y="51.8" text-anchor="middle" font-size="14" fill="#ffffff">자유 식별자: z, z, b</text>
</svg>
</div>

> **생각해 보기** 위 프로그램을 실제로 Scala 컴파일러에 넣으면 어떤 일이 일어날까요? 자유 식별자 `z`와 `b` 때문에 `Not found: z` 같은 오류가 납니다. 자유 식별자를 찾는 일은 컴파일러가 가장 먼저 해 주는 검사 중 하나입니다.

### 섀도잉

앞의 표에서 `x + add(y, z)`의 `x`는 첫 줄의 `x`와 본문 안의 `x` 두 스코프에 모두 들어 있었습니다. 이 경우 가장 안쪽의 정의가 이깁니다.

<a id="g-shadowing"></a>**섀도잉(shadowing)** 이란 같은 이름에 대해 가장 안쪽의 묶는 출현이 바깥쪽 묶는 출현들을 가리는 것을 말합니다.

- <a id="g-shadowing-identifier"></a>**가리는 식별자(shadowing identifier)** 는 다른 식별자를 가리는 식별자입니다. 예제에서는 본문 안의 `val x: Int = a + b`의 `x`입니다.
- <a id="g-shadowed-identifier"></a>**가려진 식별자(shadowed identifier)** 는 다른 식별자에 의해 가려진 식별자입니다. 예제에서는 첫 줄의 `x`입니다.

<div style="text-align:center">
<svg viewBox="12 -1 305 308" width="100%" style="max-width: 440px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="본문 안의 x가 첫 줄의 x를 가리는 섀도잉" font-family="sans-serif" fill="currentColor">
<defs><marker id="identifiers-fig-4" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<rect x="56.5" y="37.8" width="13.6" height="22.0" fill="#2a408e" rx="2"/>
<rect x="75.8" y="187.8" width="13.6" height="22.0" fill="#2a408e" rx="2"/>
<text x="20.0" y="24.0" font-size="16" font-family="ui-monospace, Menlo, monospace" opacity="0.6">/* Scala */</text>
<text x="20.0" y="54.0" font-size="16" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="58.5" y="54.0" font-size="16" font-family="ui-monospace, Menlo, monospace" fill="#ffffff">x</text>
<text x="68.2" y="54.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="87.4" y="54.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="126.0" y="54.0" font-size="16" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="145.2" y="54.0" font-size="16" font-family="ui-monospace, Menlo, monospace">3</text>
<text x="20.0" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="58.5" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="68.2" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="87.4" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="126.0" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="145.2" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="164.5" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="183.7" y="114.0" font-size="16" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="20.0" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace" font-weight="bold">def</text>
<text x="58.5" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="87.4" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="97.1" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="106.7" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="126.0" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="154.8" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="174.1" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="183.7" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="203.0" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="231.9" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="241.5" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="260.8" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="299.3" y="174.0" font-size="16" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="39.3" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace" font-weight="bold">val</text>
<text x="77.8" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace" fill="#ffffff">x</text>
<text x="87.4" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">:</text>
<text x="106.7" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">Int</text>
<text x="145.2" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">=</text>
<text x="164.5" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">a</text>
<text x="183.7" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="203.0" y="204.0" font-size="16" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="39.3" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="58.5" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">+</text>
<text x="77.8" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="106.7" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="116.3" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="126.0" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="145.2" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">z</text>
<text x="154.8" y="234.0" font-size="16" font-family="ui-monospace, Menlo, monospace">)</text>
<text x="20.0" y="294.0" font-size="16" font-family="ui-monospace, Menlo, monospace">add</text>
<text x="48.9" y="294.0" font-size="16" font-family="ui-monospace, Menlo, monospace">(</text>
<text x="58.5" y="294.0" font-size="16" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="68.2" y="294.0" font-size="16" font-family="ui-monospace, Menlo, monospace">,</text>
<text x="87.4" y="294.0" font-size="16" font-family="ui-monospace, Menlo, monospace">b</text>
<text x="97.1" y="294.0" font-size="16" font-family="ui-monospace, Menlo, monospace">)</text>
<path d="M74.8,191.8 C53.7,181.8 53.7,99.8 62.3,62.8" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="6,4" marker-end="url(#identifiers-fig-4)"/>
<text x="68.2" y="140.0" font-size="14" font-weight="bold">섀도잉</text>
<rect x="162.5" y="6.8" width="100.3" height="24.0" fill="#2a408e" rx="4"/>
<text x="212.6" y="23.8" text-anchor="middle" font-size="14" fill="#ffffff">가려진 식별자</text>
<line x1="70.2" y1="39.8" x2="162.5" y2="18.8" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4,3"/>
<rect x="181.8" y="250.0" width="100.3" height="24.0" fill="#2a408e" rx="4"/>
<text x="231.9" y="267.0" text-anchor="middle" font-size="14" fill="#ffffff">가리는 식별자</text>
<path d="M89.4,212.8 L178.9,212.8 L178.9,262.0 L181.8,262.0" fill="none" stroke="currentColor" stroke-width="1.4" stroke-dasharray="4,3"/>
</svg>
</div>

그래서 `add`의 본문 안에서 `x`라고 쓰면 본문 안의 `x`(즉 `a + b`)를 가리키고, 첫 줄의 `x`(즉 `3`)는 보이지 않습니다. 하지만 함수 바깥 마지막 줄의 `x`는 다시 첫 줄의 `x`를 가리킵니다.

> **자주 하는 실수** 섀도잉은 <a id="g-mutation"></a>변경(mutation)이 **아닙니다**. 본문 안의 `val x: Int = a + b`는 첫 줄 `x`의 값을 `a + b`로 바꾸는 것이 아니라, 이름만 같은 **새로운** 변수를 만드는 것입니다. 첫 줄의 `x`는 여전히 `3`이고, 본문 바깥으로 나오면 다시 그 값이 보입니다. 마지막 줄 `add(x, b)`의 `x`가 `3`인 이유가 바로 이것입니다.

## VAE: 변수가 있는 AE

이제 이 개념들을 우리의 언어에 적용해 봅시다. AE를 확장해 **변수**가 있는 언어 **VAE**를 만들겠습니다. VAE 프로그램은 다음과 같이 생겼습니다.

```vae
/* VAE */
val x = 1 + 2;  // x = 1 + 2 = 3
val y = x + 3;  // y = x + 3 = 3 + 3 = 6
y + 4           // 6 + 4 = 10
```

`val x = e1; e2`는 `e1`의 값을 `x`라고 부르기로 하고 `e2`를 계산하라는 뜻입니다.

### 식별자의 구체 문법

먼저 VAE에서 쓸 수 있는 식별자의 **구체 문법(concrete syntax)** 을 BNF로 정의합니다.

```bnf
<digit>    ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
<number>   ::= "-"? <digit>+
<alphabet> ::= "A" | "B" | "C" | ... | "Z" | "a" | "b" | "c" | ... | "z"
<idstart>  ::= <alphabet> | "_"
<idcont>   ::= <alphabet> | "_" | <digit>
<keyword>  ::= "val"
<id>       ::= <idstart> <idcont>* butnot <keyword>
```

식별자는 알파벳이나 밑줄(`_`)로 시작하고, 그 뒤로 알파벳, 밑줄, 숫자가 0개 이상 이어집니다. 단, 키워드인 `val`은 식별자로 쓸 수 없다는 것이 `butnot <keyword>`의 뜻입니다. 예를 들어 다음은 모두 올바른 식별자입니다.

```text
x    y    get_name    getName    add42
```

반면 `42add`(숫자로 시작), `get-name`(`-`는 허용되지 않음), `val`(키워드)은 식별자가 아닙니다.

### 구체 문법

이제 VAE 식의 구체 문법을 정의합니다. AE에 세 가지 경우가 더해졌습니다.

```bnf
<expr> ::= <number>
         | <expr> "+" <expr>
         | <expr> "*" <expr>
         | "(" <expr> ")"
         | "{" <expr> "}"
         | "val" <id> "=" <expr> ";" <expr>
         | <id>
```

중괄호 블록 `{ e }`, 변수 정의 `val x = e; e`, 그리고 변수 이름 `x`입니다. 블록이 왜 필요한지는 변수 정의의 스코프를 보면 알 수 있습니다. **변수 정의는 새로운 스코프를 만듭니다.** `val x = e1; e2`에서 `x`의 스코프는 `;` 뒤의 `e2` 전체입니다. 그래서 앞의 예제는

```vae
/* VAE */
val x = 1 + 2;
val y = x + 3;
y + 4
```

다음과 같은 뜻입니다.

```vae
/* VAE */
val x = 1 + 2;
{ // scope of x
  val y = x + 3;
  { // scope of y
    y + 4
  }
}
```

변수 정의의 몸통은 기본적으로 할 수 있는 한 멀리(식의 끝까지) 이어지므로, 스코프를 중간에 끝내고 싶을 때는 중괄호로 범위를 직접 표시합니다. 예를 들어 `{ val x = 1; x } + 2`에서 `x`의 스코프는 중괄호 안의 `x`까지뿐입니다.

### 추상 문법

VAE의 **추상 문법(abstract syntax)** 은 다음과 같습니다.

\\[
\begin{array}[t]{lrcl}
\text{Numbers} & n & \in & \mathbb{Z} \quad (\texttt{BigInt}) \\\\
\text{Identifiers} & x & \in & \mathbb{X} \quad (\texttt{String})
\end{array}
\qquad
\begin{array}[t]{lrcll}
\text{Expressions} & e & ::= & n & (\texttt{Num}) \\\\
& & \mid & e \ \texttt{+}\  e & (\texttt{Add}) \\\\
& & \mid & e \ast e & (\texttt{Mul}) \\\\
& & \mid & \texttt{val}\ x\ \texttt{=}\ e\texttt{;}\ e & (\texttt{Val}) \\\\
& & \mid & x & (\texttt{Id})
\end{array}
\\]

괄호와 중괄호는 식의 구조를 정하는 데만 쓰이므로 추상 문법에는 나타나지 않습니다. 식별자의 집합은 \\( \mathbb{X} \\)로 쓰고, Scala에서는 `String`으로 표현합니다. 이 추상 문법을 Scala의 대수적 데이터 타입(algebraic data type, ADT)으로 옮기면 다음과 같습니다.

```scala
enum Expr:
  case Num(number: BigInt)
  case Add(left: Expr, right: Expr)
  case Mul(left: Expr, right: Expr)
  // variable definition
  case Val(name: String, init: Expr, body: Expr)
  // variable lookup
  case Id(name: String)
```

`Val`은 변수 이름 `name`, 초기화 식 `init`, 그리고 변수를 쓸 수 있는 몸통 `body`를 가집니다. `Id`는 변수의 값을 찾아 쓰는 식입니다. 앞에서 배운 용어로 말하면, `Val`의 `name`이 묶는 출현이고, `body`가 그 스코프이며, `body` 안의 `Id`들이 묶인 출현(또는 자유 식별자)입니다.

파서는 미리 구현되어 있으므로 직접 만들 필요는 없습니다. `Expr`에 문자열을 주면 VAE 프로그램을 파싱할 수 있습니다.

```scala
Expr("val x = 1; x + 2")
// Val("x", Num(1), Add(Id("x"), Num(2)))

Expr("val a = 1; val b = 2; a + b")
// Val("a", Num(1), Val("b", Num(2), Add(Id("a"), Id("b"))))
```

두 번째 예에서 `Val("b", ...)`이 `Val("a", ...)`의 `body` 안에 들어 있는 것을 보세요. 앞에서 "변수 정의는 새로운 스코프를 만든다"고 한 것이 추상 문법 트리의 중첩 구조로 그대로 드러납니다.

### 예제: 화살표 그리기

다음 세 VAE 프로그램에 대해 직접 그려 보세요.

- 각 **묶인 출현**에서 그것의 **묶는 출현**으로 가는 **화살표**
- 각 **가리는 식별자**에서 그것이 **가리는 식별자**로 가는 **점선 화살표**
- 각 **자유 식별자**에 **X 표시**

```vae
/* VAE */
val x = 1; x
```

```vae
/* VAE */
val x = x + 1;
val y = x * 2;
val x = y + x;
x * z
```

```vae
/* VAE */
val x = 1;
val y = {
  val x = 2 * x;
  { val y = x; y } + { val y = 3; y }
};
x + y
```

<details>
<summary>풀이</summary>

**첫 번째 프로그램.** 두 번째 `x`가 첫 번째 `x`(묶는 출현)를 가리킵니다. 섀도잉도 자유 식별자도 없습니다.

**두 번째 프로그램.** 줄마다 살펴보겠습니다.

- 첫 줄 `val x = x + 1;`의 초기화 식 `x + 1`에 있는 `x`는 **자유 식별자**입니다(X 표시). `x`의 스코프는 `;` 뒤부터이고 초기화 식은 포함하지 않기 때문입니다.
- 둘째 줄의 `x`는 첫 줄의 `x`를 가리킵니다.
- 셋째 줄 `val x = y + x;`의 `y`는 둘째 줄의 `y`를, 초기화 식의 `x`는 **첫 줄의** `x`를 가리킵니다. 셋째 줄의 새 `x`는 아직 스코프가 시작되지 않았기 때문입니다. 그리고 셋째 줄의 `x`는 첫 줄의 `x`를 가립니다(점선 화살표).
- 마지막 줄의 `x`는 셋째 줄의 `x`를 가리키고, `z`는 자유 식별자입니다(X 표시).

**세 번째 프로그램.** 정의되는 이름을 차례로 \\( \texttt{x}\_1 \\)(첫 줄), \\( \texttt{y}\_1 \\)(둘째 줄), \\( \texttt{x}\_2 \\)(셋째 줄), \\( \texttt{y}\_2 \\)(`{ val y = x; y }`), \\( \texttt{y}\_3 \\)(`{ val y = 3; y }`)이라고 부르겠습니다.

- 셋째 줄 `val x = 2 * x;`의 초기화 식 속 `x`는 \\( \texttt{x}\_1 \\)을 가리키고, \\( \texttt{x}\_2 \\)는 \\( \texttt{x}\_1 \\)을 가립니다(점선 화살표).
- `{ val y = x; y }`의 `x`는 \\( \texttt{x}\_2 \\)를, `y`는 \\( \texttt{y}\_2 \\)를 가리킵니다.
- `{ val y = 3; y }`의 `y`는 \\( \texttt{y}\_3 \\)을 가리킵니다.
- 마지막 줄의 `x`는 \\( \texttt{x}\_1 \\)을, `y`는 \\( \texttt{y}\_1 \\)을 가리킵니다.
- 자유 식별자는 없습니다.

여기서 함정이 하나 있습니다. \\( \texttt{y}\_2 \\)와 \\( \texttt{y}\_3 \\)은 \\( \texttt{y}\_1 \\)을 가릴까요? **아닙니다.** \\( \texttt{y}\_1 \\)의 스코프는 `;` 뒤의 `x + y`뿐이고, \\( \texttt{y}\_2 \\)와 \\( \texttt{y}\_3 \\)은 \\( \texttt{y}\_1 \\)의 **초기화 식** 안에 있으므로 \\( \texttt{y}\_1 \\)의 스코프 바깥입니다. 가릴 대상이 애초에 보이지 않으니 섀도잉도 아닙니다.

</details>

## 환경을 이용한 계산

이제 VAE의 의미를 정의할 차례입니다. 다음 VAE 식을 계산해 봅시다.

```vae
/* VAE */
val x = 1; {      // [ x -> 1 ]
  val y = 2; {    // [ x -> 1, y -> 2 ]
    x + y         // x + y = 1 + 2 = 3
  }
}
```

맨 안쪽의 `x + y`를 어떻게 `3`으로 계산할 수 있을까요? AE에서처럼 식만 보고 판단하려 하면 막힙니다.

\\[
\vdash \texttt{x} \ \texttt{+}\  \texttt{y} \Rightarrow 3 \quad ???
\\]

`x + y`라는 식만으로는 `x`와 `y`가 무엇인지 알 수 없기 때문입니다. 지금까지 어떤 이름이 어떤 값으로 정의되었는지를 함께 들고 다녀야 합니다. 이렇게 식별자를 값으로 대응시키는 정보를 **환경**이라고 합니다. 환경을 \\( \sigma \\)로 쓰고, 위 상황을 다음과 같이 표현합니다.

\\[
[\texttt{x} \mapsto 1, \texttt{y} \mapsto 2] \vdash \texttt{x} \ \texttt{+}\  \texttt{y} \Rightarrow 3
\\]

`val`을 하나 지날 때마다 환경이 어떻게 자라는지 그려 보면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="2 26 564 79" width="100%" style="max-width: 560px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="빈 환경에서 시작해 val을 만날 때마다 환경에 이름과 값이 하나씩 더해지는 모습" font-family="sans-serif" fill="currentColor">
<defs><marker id="identifiers-fig-5" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<text x="20.0" y="64.0" text-anchor="middle" font-size="22">∅</text>
<line x1="40.0" y1="58.0" x2="140.0" y2="58.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#identifiers-fig-5)"/>
<text x="90.0" y="48.0" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">val x = 1</text>
<rect x="150.0" y="45.0" width="58.0" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="178.0" y1="45.0" x2="178.0" y2="71.0" stroke="currentColor" stroke-width="1.2"/>
<text x="164.0" y="63.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="193.0" y="63.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<line x1="218.0" y1="58.0" x2="318.0" y2="58.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#identifiers-fig-5)"/>
<text x="268.0" y="48.0" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">val y = 2</text>
<rect x="328.0" y="45.0" width="58.0" height="52.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="356.0" y1="45.0" x2="356.0" y2="97.0" stroke="currentColor" stroke-width="1.2"/>
<text x="342.0" y="63.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="371.0" y="63.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<line x1="328.0" y1="71.0" x2="386.0" y2="71.0" stroke="currentColor" stroke-width="1.2"/>
<text x="342.0" y="89.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">y</text>
<text x="371.0" y="89.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">2</text>
<text x="402.0" y="76.0" font-size="15">⊢  x + y  ⇒  1 + 2 = 3</text>
</svg>
</div>

AE의 인터프리터는 식 하나를 받아 숫자를 돌려주었습니다.

```scala
type Value = BigInt                 // values
def interp(expr: Expr): Value = ... // interpreter
```

이를 수학적으로 쓰면 \\( \vdash e \Rightarrow n \\)이었습니다. VAE에서는 인터프리터가 **환경**도 함께 받도록 확장합니다.

```scala
type Value = BigInt                           // values
type Env = Map[String, Value]                 // environments
def interp(expr: Expr, env: Env): Value = ... // interpreter
```

\\[
\boxed{\sigma \vdash e \Rightarrow n}
\\]

이것을 "환경 \\( \sigma \\) 아래에서 식 \\( e \\)는 숫자 \\( n \\)으로 계산된다"라고 읽습니다. 예를 들어 인터프리터는 다음과 같이 동작해야 합니다.

```scala
val env : Env   = Map("x" -> 1, "y" -> 2)   // [ x -> 1, y -> 2 ]
val expr: Expr  = Expr("x + y")             // Add(Id("x"), Id("y"))
val v   : Value = interp(expr, env)         // 3
```

\\[
[\texttt{x} \mapsto 1, \texttt{y} \mapsto 2] \vdash \texttt{x} \ \texttt{+}\  \texttt{y} \Rightarrow 3
\\]

## VAE의 인터프리터와 자연 의미

VAE를 위해 해야 할 일은 두 가지입니다. 하나는 환경을 받는 **인터프리터**를 구현하는 것이고,

```scala
def interp(expr: Expr, env: Env): Value = ???
```

다른 하나는 환경을 이용한 **자연 의미**을 정의하는 것입니다.

\\[
\boxed{\sigma \vdash e \Rightarrow n}
\\]

\\[
\begin{array}{lrcll}
\text{Expressions} & e & ::= & n & (\texttt{Num}) \\\\
& & \mid & e \ \texttt{+}\  e & (\texttt{Add}) \\\\
& & \mid & e \ast e & (\texttt{Mul}) \\\\
& & \mid & \texttt{val}\ x\ \texttt{=}\ e\texttt{;}\ e & (\texttt{Val}) \\\\
& & \mid & x & (\texttt{Id})
\end{array}
\\]

여기서 각 기호의 범위는 다음과 같습니다.

\\[
\begin{array}{lrcll}
\text{Environments} & \sigma & \in & \mathbb{X} \xrightarrow{\text{fin}} \mathbb{Z} & (\texttt{Env}) \\\\
\text{Numbers} & n & \in & \mathbb{Z} & (\texttt{BigInt}) \\\\
\text{Identifiers} & x & \in & \mathbb{X} & (\texttt{String})
\end{array}
\\]

\\( \mathbb{X} \xrightarrow{\text{fin}} \mathbb{Z} \\)는 식별자에서 정수로 가는 <a id="g-finite-partial-function"></a>**유한 부분 함수(finite partial function)**, 즉 유한한 개수의 식별자에만 값이 정해진 함수를 뜻합니다. Scala의 `Map[String, BigInt]`가 정확히 이런 것입니다.

인터프리터의 뼈대는 식의 다섯 가지 경우에 대한 패턴 매칭이고, 자연 의미도 경우마다 추론 규칙(inference rule)이 하나씩 있습니다. 인터프리터의 각 경우와 추론 규칙을 짝지어 하나씩 채워 나가 봅시다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  case Num(n)       => ???
  case Add(l, r)    => ???
  case Mul(l, r)    => ???
  case Val(x, e, b) => ???
  case Id(x)        => ???
```

### 숫자

숫자는 환경과 상관없이 그 숫자 자신으로 계산됩니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  case Num(n)       => n
  ...
```

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\sigma \vdash n \Rightarrow n$}
\end{prooftree}
\\]

"환경 \\( \sigma \\) 아래에서 식 \\( n \\)은 숫자 \\( n \\)으로 계산된다." 전제가 없는 <a id="g-axiom"></a>공리(axiom)입니다.

### 덧셈과 곱셈

덧셈은 두 부분식을 **같은 환경**에서 계산한 뒤 결과를 더합니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Add(l, r)    => interp(l, env) + interp(r, env)
  ...
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma \vdash e_1 \ \texttt{+}\  e_2 \Rightarrow n_1 + n_2$}
\end{prooftree}
\\]

이 규칙은 "환경 \\( \sigma \\) 아래에서 식 \\( e_1 \ \texttt{+}\  e_2 \\)는 숫자 \\( n_1 + n_2 \\)로 계산된다. 단, 환경 \\( \sigma \\) 아래에서 \\( e_1 \\)이 \\( n_1 \\)으로 계산되고, 환경 \\( \sigma \\) 아래에서 \\( e_2 \\)가 \\( n_2 \\)로 계산될 때"라고 읽습니다. 왼쪽의 \\( \texttt{+} \\)는 VAE 문법의 기호이고, 결과의 \\( + \\)는 수학의 덧셈이라는 차이에 주의하세요.

곱셈도 똑같습니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Mul(l, r)    => interp(l, env) * interp(r, env)
  ...
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Mul}$}
\BinaryInfC{$\sigma \vdash e_1 \ast e_2 \Rightarrow n_1 \times n_2$}
\end{prooftree}
\\]

"환경 \\( \sigma \\) 아래에서 \\( e_1 \ast e_2 \\)는 \\( n_1 \times n_2 \\)로 계산된다. 단, \\( \sigma \\) 아래에서 \\( e_1 \\)이 \\( n_1 \\)으로, \\( e_2 \\)가 \\( n_2 \\)로 계산될 때."

### 변수 정의

이제 VAE에서 새로 생긴 경우입니다. \\( \texttt{val}\ x\ \texttt{=}\ e_1\texttt{;}\ e_2 \\)는 어떻게 계산해야 할까요? 차근차근 생각해 봅시다.

먼저 초기화 식 \\( e_1 \\)을 현재 환경 \\( \sigma \\)에서 계산해 그 값을 \\( n_1 \\)이라고 합니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Val(x, e, b) => ... interp(e, env) ...
  ...
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\ldots$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\sigma \vdash \texttt{val}\ x\ \texttt{=}\ e_1\texttt{;}\ e_2 \Rightarrow \texttt{???}$}
\end{prooftree}
\\]

다음으로 현재 환경에 \\( x \mapsto n_1 \\)을 더한 새 환경을 만듭니다. 이를 \\( \sigma[x \mapsto n_1] \\)로 씁니다. 이 환경은 \\( x \\)에는 \\( n_1 \\)을, 나머지 식별자에는 \\( \sigma \\)와 같은 값을 대응시킵니다. \\( \sigma \\)에 이미 \\( x \\)가 있었다면 새 값으로 덮어씁니다. Scala에서는 `env + (x -> interp(e, env))`입니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Val(x, e, b) => ... env + (x -> interp(e, env)) ...
  ...
```

마지막으로 몸통 \\( e_2 \\)를 이 새 환경에서 계산한 값 \\( n_2 \\)가 전체 결과입니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Val(x, e, b) => interp(b, env + (x -> interp(e, env)))
  ...
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\sigma[x \mapsto n_1] \vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\sigma \vdash \texttt{val}\ x\ \texttt{=}\ e_1\texttt{;}\ e_2 \Rightarrow n_2$}
\end{prooftree}
\\]

정리하면 "환경 \\( \sigma \\) 아래에서 \\( \texttt{val}\ x\ \texttt{=}\ e_1\texttt{;}\ e_2 \\)는 \\( n_2 \\)로 계산된다. 단, (1) 환경 \\( \sigma \\) 아래에서 \\( e_1 \\)이 \\( n_1 \\)으로 계산되고, (2) 환경 \\( \sigma[x \mapsto n_1] \\) 아래에서 \\( e_2 \\)가 \\( n_2 \\)로 계산될 때"입니다.

이 규칙에는 앞에서 배운 스코프와 섀도잉이 그대로 담겨 있습니다. \\( e_1 \\)은 \\( x \\)가 추가되기 **전의** 환경 \\( \sigma \\)에서 계산되므로 \\( x \\)의 스코프가 아닙니다. \\( e_2 \\)만 \\( x \\)가 추가된 환경에서 계산되므로 \\( e_2 \\)가 \\( x \\)의 스코프입니다. 또 \\( \sigma[x \mapsto n_1] \\)은 바깥의 \\( x \\)를 덮어쓰므로 섀도잉이 일어납니다. 그런데 이것은 **새 환경을 만드는** 것이지 \\( \sigma \\) 자체를 바꾸는 것이 아니므로, 섀도잉이 변경이 아니라는 점도 자연스럽게 드러납니다. Scala의 `Map`이 <a id="g-immutable"></a>불변(immutable)이라 `env + (...)`가 새 `Map`을 돌려준다는 점과 딱 맞아떨어집니다.

### 변수 참조

마지막으로 변수 \\( x \\)의 값은 환경에서 찾습니다. 환경에 \\( x \\)가 없다면 \\( x \\)는 자유 식별자이므로 오류를 냅니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Id(x)        => env.getOrElse(x, error(s"free identifier: $x"))
  ...
```

\\[
\begin{prooftree}
\AxiomC{$x \in \text{Dom}(\sigma)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma \vdash x \Rightarrow \sigma(x)$}
\end{prooftree}
\\]

"환경 \\( \sigma \\) 아래에서 식 \\( x \\)는 숫자 \\( \sigma(x) \\)로 계산된다. 단, 변수 \\( x \\)가 환경 \\( \sigma \\)의 <a id="g-domain"></a>정의역(domain) \\( \text{Dom}(\sigma) \\)에 있을 때." 전제가 만족되지 않으면 이 규칙을 쓸 수 없고, 다른 규칙도 없으므로 계산이 진행되지 않습니다. 인터프리터에서는 이것이 `free identifier` 오류에 해당합니다.

## 예제

이제 규칙들을 조합해 유도 트리(derivation tree)를 그려 봅시다. 프로그램 전체는 빈 환경 \\( \varnothing \\)에서 시작합니다.

### 예제 1

`val x = 1; x + 2`의 유도 트리는 다음과 같습니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\varnothing \vdash 1 \Rightarrow 1$}
\AxiomC{$\texttt{x} \in \text{Dom}([\texttt{x} \mapsto 1])$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$[\texttt{x} \mapsto 1] \vdash \texttt{x} \Rightarrow 1$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$[\texttt{x} \mapsto 1] \vdash 2 \Rightarrow 2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$[\texttt{x} \mapsto 1] \vdash \texttt{x} \ \texttt{+}\  2 \Rightarrow 3$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\varnothing \vdash \texttt{val}\ \texttt{x}\ \texttt{=}\ 1\texttt{;}\ \texttt{x} \ \texttt{+}\  2 \Rightarrow 3$}
\end{prooftree}
\\]

환경을 매번 풀어 쓰면 트리가 금방 넓어집니다. 그래서 환경에 \\( \sigma_0, \sigma_1, \ldots \\) 같은 이름을 붙여 간결하게 쓰곤 합니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\varnothing \vdash 1 \Rightarrow 1$}
\AxiomC{$\texttt{x} \in \text{Dom}(\sigma_0)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_0 \vdash \texttt{x} \Rightarrow 1$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\sigma_0 \vdash 2 \Rightarrow 2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma_0 \vdash \texttt{x} \ \texttt{+}\  2 \Rightarrow 3$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\varnothing \vdash \texttt{val}\ \texttt{x}\ \texttt{=}\ 1\texttt{;}\ \texttt{x} \ \texttt{+}\  2 \Rightarrow 3$}
\end{prooftree}
\\]

\\[
\text{where} \quad \sigma_0 = [\texttt{x} \mapsto 1]
\\]

### 예제 2

이번에는 변수 정의가 두 번 중첩된 `val x = 1; { val y = 2; x + y }`입니다. 바깥 `val`에서 \\( \sigma_0 \\)가 만들어지고, 안쪽 `val`에서 \\( \sigma_0 \\)에 `y`가 더해진 \\( \sigma_1 \\)이 만들어집니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\varnothing \vdash 1 \Rightarrow 1$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\sigma_0 \vdash 2 \Rightarrow 2$}
\AxiomC{$\texttt{x} \in \text{Dom}(\sigma_1)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_1 \vdash \texttt{x} \Rightarrow 1$}
\AxiomC{$\texttt{y} \in \text{Dom}(\sigma_1)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_1 \vdash \texttt{y} \Rightarrow 2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma_1 \vdash \texttt{x} \ \texttt{+}\  \texttt{y} \Rightarrow 3$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\sigma_0 \vdash \texttt{val}\ \texttt{y}\ \texttt{=}\ 2\texttt{;}\ \texttt{x} \ \texttt{+}\  \texttt{y} \Rightarrow 3$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\varnothing \vdash \texttt{val}\ \texttt{x}\ \texttt{=}\ 1\texttt{;}\ \\{ \texttt{val}\ \texttt{y}\ \texttt{=}\ 2\texttt{;}\ \texttt{x} \ \texttt{+}\  \texttt{y} \\} \Rightarrow 3$}
\end{prooftree}
\\]

\\[
\text{where} \quad
\begin{array}{rcl}
\sigma_0 & = & [\texttt{x} \mapsto 1] \\\\
\sigma_1 & = & [\texttt{x} \mapsto 1, \texttt{y} \mapsto 2]
\end{array}
\\]

### 예제 3

섀도잉이 일어나는 `val x = 1; { val x = 2; x } + x`입니다. 결과가 얼마일지 먼저 예상해 보세요.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\varnothing \vdash 1 \Rightarrow 1$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\sigma_0 \vdash 2 \Rightarrow 2$}
\AxiomC{$\texttt{x} \in \text{Dom}(\sigma_1)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_1 \vdash \texttt{x} \Rightarrow 2$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\sigma_0 \vdash \texttt{val}\ \texttt{x}\ \texttt{=}\ 2\texttt{;}\ \texttt{x} \Rightarrow 2$}
\AxiomC{$\texttt{x} \in \text{Dom}(\sigma_0)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_0 \vdash \texttt{x} \Rightarrow 1$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma_0 \vdash \\{ \texttt{val}\ \texttt{x}\ \texttt{=}\ 2\texttt{;}\ \texttt{x} \\} \ \texttt{+}\  \texttt{x} \Rightarrow 3$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\varnothing \vdash \texttt{val}\ \texttt{x}\ \texttt{=}\ 1\texttt{;}\ \\{ \texttt{val}\ \texttt{x}\ \texttt{=}\ 2\texttt{;}\ \texttt{x} \\} \ \texttt{+}\  \texttt{x} \Rightarrow 3$}
\end{prooftree}
\\]

\\[
\text{where} \quad
\begin{array}{rcl}
\sigma_0 & = & [\texttt{x} \mapsto 1] \\\\
\sigma_1 & = & [\texttt{x} \mapsto 2]
\end{array}
\\]

두 환경의 관계를 그림으로 보면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="2 -10 565 202" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="섀도잉은 새 환경 σ1을 만들 뿐 σ0을 바꾸지 않는다" font-family="sans-serif" fill="currentColor">
<defs><marker id="identifiers-fig-6" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<text x="20.0" y="92.0" text-anchor="middle" font-size="22">∅</text>
<line x1="40.0" y1="86.0" x2="130.0" y2="86.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#identifiers-fig-6)"/>
<text x="85.0" y="76.0" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">val x = 1</text>
<rect x="140.0" y="73.0" width="58.0" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="168.0" y1="73.0" x2="168.0" y2="99.0" stroke="currentColor" stroke-width="1.2"/>
<text x="154.0" y="91.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="183.0" y="91.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<text x="140.0" y="65.0" font-size="16" font-family="Times New Roman, Times, serif" font-style="italic">σ<tspan baseline-shift="sub" font-size="11">0</tspan></text>
<line x1="206.0" y1="80.0" x2="290.0" y2="40.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#identifiers-fig-6)"/>
<text x="222.0" y="44.0" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">val x = 2</text>
<rect x="300.0" y="22.0" width="58.0" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="328.0" y1="22.0" x2="328.0" y2="48.0" stroke="currentColor" stroke-width="1.2"/>
<text x="314.0" y="40.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="343.0" y="40.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">2</text>
<text x="300.0" y="14.0" font-size="16" font-family="Times New Roman, Times, serif" font-style="italic">σ<tspan baseline-shift="sub" font-size="11">1</tspan></text>
<text x="370.0" y="40.0" font-size="15">⊢  x  ⇒  2   (중괄호 안의 x)</text>
<line x1="206.0" y1="92.0" x2="290.0" y2="132.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#identifiers-fig-6)"/>
<text x="222.0" y="136.0" text-anchor="middle" font-size="14">그대로</text>
<rect x="300.0" y="120.0" width="58.0" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="328.0" y1="120.0" x2="328.0" y2="146.0" stroke="currentColor" stroke-width="1.2"/>
<text x="314.0" y="138.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">x</text>
<text x="343.0" y="138.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<text x="370.0" y="138.0" font-size="15">⊢  x  ⇒  1   (중괄호 밖의 x)</text>
<text x="300.0" y="180.0" font-size="15" font-weight="bold">결과:  2 + 1 = 3</text>
</svg>
</div>

중괄호 안의 `x`는 안쪽 정의가 바깥 정의를 가려 \\( \sigma_1 = \sigma_0[\texttt{x} \mapsto 2] = [\texttt{x} \mapsto 2] \\)에서 `2`가 됩니다. 하지만 중괄호 바깥의 `x`는 여전히 \\( \sigma_0 \\)에서 계산되므로 `1`입니다. 안쪽 `val`이 바깥 `x`를 바꾼 것이 아니라는 점이 유도 트리에서 분명히 보입니다. 그래서 답은 `4`가 아니라 `3`입니다.

### 예제 4

마지막으로 자유 식별자가 있는 `{ val x = 1; x } + x`입니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\varnothing \vdash 1 \Rightarrow 1$}
\AxiomC{$\texttt{x} \in \text{Dom}(\sigma_0)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_0 \vdash \texttt{x} \Rightarrow 1$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\varnothing \vdash \texttt{val}\ \texttt{x}\ \texttt{=}\ 1\texttt{;}\ \texttt{x} \Rightarrow 1$}
\AxiomC{$\color{red}{\texttt{x} \notin \text{Dom}(\varnothing)}$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\varnothing \vdash \texttt{x} \Rightarrow \color{red}{\text{FAIL}}$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\varnothing \vdash \\{ \texttt{val}\ \texttt{x}\ \texttt{=}\ 1\texttt{;}\ \texttt{x} \\} \ \texttt{+}\  \texttt{x} \Rightarrow \color{red}{\text{FAIL}}$}
\end{prooftree}
\\]

\\[
\text{where} \quad \sigma_0 = [\texttt{x} \mapsto 1]
\\]

덧셈의 오른쪽 `x`는 자유 식별자이므로 이 예제에 대해서는 **유도 트리를 그릴 수 없습니다**. 위에서 빨간 부분은 진짜 유도가 아니라, **어떤 규칙도 적용할 수 없는** 지점을 표시한 것입니다. `Id` 규칙은 \\( \texttt{x} \in \text{Dom}(\varnothing) \\)을 요구하지만 이것이 성립하지 않습니다. \\( \text{FAIL} \\)은 계산이 거기서 **막힌다(stuck)** 는 것을 나타낼 뿐입니다. 인터프리터는 이때 `free identifier: x` 오류를 냅니다.

> **자주 하는 실수** 왼쪽 `{ val x = 1; x }`에서 `x`를 정의했으니 오른쪽 `x`도 `1`이라고 생각하기 쉽습니다. 하지만 `x`의 스코프는 중괄호 안까지입니다. `Add` 규칙이 두 부분식을 **같은 환경** \\( \sigma \\)(여기서는 \\( \varnothing \\))에서 계산한다는 점을 떠올리면, 왼쪽에서 만든 환경이 오른쪽으로 새어 나갈 방법이 없다는 것을 알 수 있습니다.

## 전체 인터프리터

지금까지 만든 VAE 인터프리터를 모으면 다음과 같습니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  case Num(n)       => n
  case Add(l, r)    => interp(l, env) + interp(r, env)
  case Mul(l, r)    => interp(l, env) * interp(r, env)
  case Val(x, e, b) => interp(b, env + (x -> interp(e, env)))
  case Id(x)        => env.getOrElse(x, error(s"free identifier: $x"))
```

위 예제들을 실제로 돌려 보면 기대한 결과가 나옵니다.

```scala
interp(Val("x", Num(1), Add(Id("x"), Num(2))), Map.empty)                     // 3
interp(Val("x", Num(1), Val("y", Num(2), Add(Id("x"), Id("y")))), Map.empty)  // 3
interp(Val("x", Num(1), Add(Val("x", Num(2), Id("x")), Id("x"))), Map.empty)  // 3
interp(Add(Val("x", Num(1), Id("x")), Id("x")), Map.empty)
// error: free identifier: x
```

자연 의미의 규칙도 모아 보겠습니다.

\\[
\boxed{\sigma \vdash e \Rightarrow n}
\\]

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\sigma \vdash n \Rightarrow n$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma \vdash e_1 \ \texttt{+}\  e_2 \Rightarrow n_1 + n_2$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Mul}$}
\BinaryInfC{$\sigma \vdash e_1 \ast e_2 \Rightarrow n_1 \times n_2$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\sigma[x \mapsto n_1] \vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Val}$}
\BinaryInfC{$\sigma \vdash \texttt{val}\ x\ \texttt{=}\ e_1\texttt{;}\ e_2 \Rightarrow n_2$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$x \in \text{Dom}(\sigma)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma \vdash x \Rightarrow \sigma(x)$}
\end{prooftree}
\\]

## 정리

- **식별자**는 프로그램 안의 요소에 붙인 이름입니다. 식별자가 정의되는 곳이 **묶는 출현**, 쓸 수 있는 범위가 **스코프**, 값을 찾아 쓰는 곳이 **묶인 출현**입니다.
- 현재 스코프에서 정의되지 않은 식별자는 **자유 식별자**입니다. 같은 이름이라도 놓인 위치에 따라 묶인 출현일 수도, 자유 식별자일 수도 있습니다.
- 같은 이름의 정의가 겹치면 가장 안쪽 정의가 바깥 정의를 가리는 **섀도잉**이 일어납니다. 섀도잉은 변경이 아닙니다.
- VAE는 AE에 변수 정의 `val x = e1; e2`와 변수 참조 `x`를 더한 언어입니다. `x`의 스코프는 `e2`이고 `e1`은 포함하지 않습니다.
- 변수의 값을 알려면 식별자를 값으로 대응시키는 **환경** \\( \sigma \in \mathbb{X} \xrightarrow{\text{fin}} \mathbb{Z} \\)가 필요합니다. 인터프리터는 `interp(expr, env)`가 되고, 자연 의미의 판단은 \\( \sigma \vdash e \Rightarrow n \\)이 됩니다.
- `Val` 규칙은 \\( \sigma[x \mapsto n_1] \\)로 새 환경을 만들어 몸통을 계산하고, `Id` 규칙은 \\( x \in \text{Dom}(\sigma) \\)일 때 \\( \sigma(x) \\)를 돌려줍니다. 자유 식별자를 만나면 계산이 막힙니다.

## 연습 문제

1. 이 장 처음의 Scala 예제에서 마지막 줄을 `add(x, y)`로 바꾸면 자유 식별자는 무엇이 남나요? 각 묶인 출현이 가리키는 묶는 출현도 다시 정리해 보세요.
2. 다음 VAE 식의 결과를 예상하고, 유도 트리를 그려서 확인해 보세요.
   ```pl
   /* VAE */
   val x = 2; val y = x * 3; val x = y + x; x * y
   ```
3. `val x = x; x`를 빈 환경에서 계산하면 어떻게 되나요? 유도 트리의 어느 지점에서 막히는지 설명해 보세요.
4. (Exercise #2, VAE) 과제 문서 [`vae`](https://github.com/ku-plrg-classroom/docs/tree/main/cose212/vae)를 참고해 다음 함수를 구현해 보세요. 제출할 필요는 없지만 시험 문제와 관련이 있을 수 있으니 꼭 직접 풀어 보기를 권합니다.
   - `interp`: 환경을 이용해 VAE 식을 계산합니다.
   - `freeIds`: 식에 나타나는 자유 식별자의 집합을 구합니다.
   - `bindingIds`: 식에 나타나는 묶는 출현의 식별자 집합을 구합니다.
   - `boundIds`: 식에 나타나는 묶인 출현의 식별자 집합을 구합니다.
   - `shadowedIds`: 식에서 가려진 식별자의 집합을 구합니다.

   힌트: `freeIds`를 구현할 때는 `Val(x, e, b)`에서 `e`와 `b`를 서로 다르게 다뤄야 합니다. 어떤 식별자가 어디까지 "정의된" 상태인지를 인자로 들고 다니는 보조 함수를 만들면 편합니다.
