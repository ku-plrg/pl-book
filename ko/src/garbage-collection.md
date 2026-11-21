# 쓰레기 수집

지난 두 장에서 우리는 변경을 통해 프로그램의 **상태를 바꾸는** 방법을 배웠습니다. BFAE에서는 변경 가능한 상자를, MFAE에서는 변경 가능한 변수를 다루었고, 둘 다 주소를 값에 연결하는 유한 부분 함수인 **메모리**를 이용해 계산했습니다.

\\[
\begin{array}{ll}
\text{Memories} & M \in \mathbb{A} \xrightarrow{\text{fin}} \mathbb{V} \\\\
\text{Addresses} & a \in \mathbb{A}
\end{array}
\\]

그런데 지금까지의 인터프리터는 메모리에 칸을 **할당**하기만 하고 **해제**하지는 않았습니다. 실제 컴퓨터의 메모리는 유한하니, 더 이상 쓰지 않는 칸은 언젠가 돌려줘야 합니다. 이 장에서는 <a id="g-unreachable"></a>도달할 수 없는(unreachable) 메모리 칸을 해제하는 <a id="g-memory-management"></a>**메모리 관리(memory management)** 기법들을 살펴봅니다. 먼저 메모리를 <a id="g-stack"></a>**스택(stack)** 과 <a id="g-heap"></a>**힙(heap)** 으로 나누는 방법과 꼬리 호출 최적화를 보고, 이어서 프로그래머가 직접 해제하는 **수동 메모리 관리**, 마지막으로 해제를 자동으로 해 주는 <a id="g-garbage-collection"></a>**쓰레기 수집(garbage collection, GC)** 의 대표적인 알고리즘들을 배웁니다.

## 스택과 힙

[변경 가능한 변수](./mutable-variables.md)에서 다음 MFAE 식을 계산한 결과를 떠올려 봅시다.

```mfae
/* MFAE */
var y = 1;
var f = x => {
  x = x + y;
  x * x
};
f(5);        /* 36 */
y = 3;
f(5)         /* 64 */
```

계산이 끝났을 때의 환경과 메모리는 다음과 같았습니다. 여기서 \\( v = \langle \lambda \texttt{x}.(\texttt{x}\ \texttt{=}\ \texttt{x}\ \texttt{+}\ \texttt{y};\ \texttt{x} \ast \texttt{x}), [\texttt{y} \mapsto a_0] \rangle \\)입니다.

| 환경 \\( \sigma \\) | \\( a_0 \\) | \\( a_1 \\) | \\( a_2 \\) | \\( a_3 \\) |
|---|---|---|---|---|
| \\( [\texttt{y} \mapsto a_0, \texttt{f} \mapsto a_1] \\) | 3 | \\( v \\) | ~~6~~ | ~~8~~ |

\\( a_2 \\)와 \\( a_3 \\)은 두 번의 호출에서 매개변수 `x`를 위해 할당했던 칸입니다. 함수에서 빠져나온 뒤에는 환경에도, 남아 있는 어떤 값에도 이 주소들이 나오지 않으니 다시는 이 칸에 접근할 방법이 없습니다. 이런 칸을 **도달할 수 없는** 칸이라고 합니다. 그렇다면 도달할 수 없는 칸을 어떻게 **찾아내고** 어떻게 **해제**할 수 있을까요?

가장 먼저 떠오르는 생각은 이렇습니다. "함수에서 **빠져나올 때** 그 함수가 쓰던 칸을 지우자!"

### 스택 프레임

이 생각을 실현하기 위해 메모리를 두 부분으로 나눕니다.

- **스택(stack)**: **지역 변수**와 **함수 매개변수**를 위한 공간
- **힙(heap)**: **동적으로 할당한** 메모리 칸(예: 상자나 객체)을 위한 공간

0x00부터 0xFF까지 주소가 붙은 하나의 메모리가 있다고 해 봅시다. 흔히 낮은 주소 쪽부터 스택을 쌓아 올리고, 높은 주소 쪽부터 반대 방향으로 힙을 채웁니다. 그리고 프로그램이 함수에 **들어갈 때마다** 그 함수의 지역 변수와 매개변수를 담을 <a id="g-stack-frame"></a>**스택 프레임(stack frame)** 을 새로 만들고, 함수에서 **나올 때** 그 스택 프레임을 통째로 **지웁니다**.

다음 Scala 프로그램으로 확인해 봅시다.

```scala
case class Box(var k: Int)

def f(x: Int): Int =
  var y = Box(1)
  var z = g(2)
  x + y.k + z

def g(b: Int): Int =
  var c = Box(b)
  c.k + 3

var a = 1
var b = f(42)
a + b       // 49
```

실행하면서 메모리가 어떻게 변하는지 단계별로 보겠습니다.

1. `var a = 1`: 맨 바깥 프레임에 `a`를 위한 칸 0x00이 생기고 1이 저장됩니다.
2. `f(42)`를 호출하면 `f`의 **새 스택 프레임**이 만들어집니다. 매개변수 `x`는 0x01에 42로, 지역 변수 `y`는 0x02에 들어갑니다. 그런데 `Box(1)`은 동적으로 할당한 객체이므로 **힙**의 0xFF에 만들어지고, `y`의 칸 0x02에는 그 주소 `0xFF`가 저장됩니다.
3. `f` 안에서 `g(2)`를 호출하면 그 위에 `g`의 스택 프레임이 쌓입니다. 매개변수 `b`는 0x03에 2로, 지역 변수 `c`는 0x04에 들어가고, `Box(b)`는 힙의 0xFE에 만들어져 `c`에는 `0xFE`가 저장됩니다. `c.k + 3`의 값은 5입니다.
4. `g`에서 빠져나오면 `g`의 스택 프레임이 **지워지고** `b`와 `c`의 칸이 해제됩니다. 돌려받은 5는 `f`의 지역 변수 `z`에 저장되는데, 마침 비워진 0x03을 다시 씁니다. `x + y.k + z`의 값은 42 + 1 + 5 = 48입니다.
5. `f`에서 빠져나오면 `f`의 스택 프레임도 지워져 `x`, `y`, `z`의 칸이 해제됩니다. 맨 바깥의 `b`가 0x01에 48로 저장되고 `a + b`는 49입니다.

| 주소 | 3단계 (`g` 안) | 4단계 (`g`에서 나온 뒤) | 5단계 (`f`에서 나온 뒤) |
|---|---|---|---|
| 0x00 | 1 (`a`) | 1 (`a`) | 1 (`a`) |
| 0x01 | 42 (`f`의 `x`) | 42 (`f`의 `x`) | 48 (`b`) |
| 0x02 | 0xFF (`f`의 `y`) | 0xFF (`f`의 `y`) | |
| 0x03 | 2 (`g`의 `b`) | 5 (`f`의 `z`) | |
| 0x04 | 0xFE (`g`의 `c`) | | |
| ... | | | |
| 0xFE | `Box(2)` | `Box(2)` | `Box(2)` |
| 0xFF | `Box(1)` | `Box(1)` | `Box(1)` |

<div style="text-align:center">
<svg viewBox="0 0 520 290" width="100%" style="max-width: 480px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="g 안에 있을 때의 메모리: 0x00은 맨 바깥 프레임의 a, 0x01과 0x02는 f의 프레임, 0x03과 0x04는 g의 프레임이고, 0x02와 0x04에 저장된 주소가 힙의 0xFF와 0xFE를 가리킨다" font-family="sans-serif" fill="currentColor">
<defs><marker id="gc-f1-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="160" y="20" width="110" height="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="215" y="40" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">1</text>
<text x="150" y="40" text-anchor="end" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">0x00</text>
<text x="80" y="40" text-anchor="end" fill="currentColor" font-size="13">a</text>
<rect x="160" y="50" width="110" height="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="215" y="70" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">42</text>
<text x="150" y="70" text-anchor="end" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">0x01</text>
<text x="80" y="70" text-anchor="end" fill="currentColor" font-size="13">f의 x</text>
<rect x="160" y="80" width="110" height="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="215" y="100" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">0xFF</text>
<text x="150" y="100" text-anchor="end" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">0x02</text>
<text x="80" y="100" text-anchor="end" fill="currentColor" font-size="13">f의 y</text>
<rect x="160" y="110" width="110" height="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="215" y="130" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">2</text>
<text x="150" y="130" text-anchor="end" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">0x03</text>
<text x="80" y="130" text-anchor="end" fill="currentColor" font-size="13">g의 b</text>
<rect x="160" y="140" width="110" height="30" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="215" y="160" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">0xFE</text>
<text x="150" y="160" text-anchor="end" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">0x04</text>
<text x="80" y="160" text-anchor="end" fill="currentColor" font-size="13">g의 c</text>
<text x="215" y="190" text-anchor="middle" fill="currentColor" font-size="16">⋮</text>
<rect x="160" y="200" width="110" height="30" fill="#2a408e"/>
<text x="215" y="220" text-anchor="middle" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">Box(2)</text>
<text x="150" y="220" text-anchor="end" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">0xFE</text>
<rect x="160" y="230" width="110" height="30" fill="#2a408e"/>
<text x="215" y="250" text-anchor="middle" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">Box(1)</text>
<text x="150" y="250" text-anchor="end" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">0xFF</text>
<path d="M270,95 C335,95 335,245 274,245" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f1-m0)"/>
<path d="M270,155 C310,155 310,215 274,215" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f1-m0)"/>
<path d="M350,23 L358,23 L358,47 L350,47" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="368" y="40.0" text-anchor="start" fill="currentColor" font-size="13">맨 바깥 프레임</text>
<path d="M350,53 L358,53 L358,107 L350,107" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="368" y="85.0" text-anchor="start" fill="currentColor" font-size="13">f의 스택 프레임</text>
<path d="M350,113 L358,113 L358,167 L350,167" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="368" y="145.0" text-anchor="start" fill="currentColor" font-size="13">g의 스택 프레임</text>
<path d="M350,203 L358,203 L358,257 L350,257" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="368" y="235.0" text-anchor="start" fill="currentColor" font-size="13">힙</text>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 3단계(<code>g</code> 안)의 메모리. 스택 프레임은 낮은 주소부터 쌓이고, 동적으로 할당한 상자는 높은 주소 쪽 힙에 놓입니다.</p>

스택 쪽은 함수가 끝날 때마다 깔끔하게 정리되었습니다. 하지만 표의 마지막 두 줄을 보세요. 힙에 할당한 0xFE와 0xFF는 이제 아무도 가리키지 않는데도 그대로 남아 있습니다. 이 문제는 잠시 뒤 [수동 메모리 관리](#수동-메모리-관리)에서 다시 다룹니다.

### 꼬리 호출 최적화

스택 프레임에 관해 하나 더 짚고 넘어갈 것이 있습니다. 다음 재귀 함수를 봅시다.

```scala
def sum(x: Int, acc: Int): Int =
  if (x < 1) acc
  else sum(x - 1, x + acc)

sum(1000, 0)
```

호출할 때마다 스택 프레임을 하나씩 쌓는다면 스택에는 `x`와 `acc`의 쌍이 (1000, 0), (999, 1000), (998, 1999), ... 하는 식으로 계속 쌓여 갑니다. 스택 공간은 유한하므로, 스택 끝에 이르면(예를 들어 0xFE, 0xFF 칸에 (873, 118999)가 들어간 시점) 더 이상 프레임을 쌓을 수 없어 <a id="g-stack-overflow"></a>**스택 오버플로(stack overflow)** 오류로 실패하게 됩니다.

그런데 정말 **모든 스택 프레임**을 남겨 둘 필요가 있을까요? **아닙니다!** 그리고 Scala는 <a id="g-tail-call"></a><a id="g-tail-call-optimization"></a>**꼬리 호출 최적화(tail-call optimization, TCO)** 를 지원합니다.

```scala
def sum(x: Int, acc: Int): Int =
  if (x < 1) acc
  else sum(x - 1, x + acc) // tail-call

sum(1000, 0) // 500500
```

왜 그럴까요? 재귀 호출 `sum(x - 1, x + acc)`는 함수가 하는 **마지막 일**, 즉 **꼬리 위치(tail-call position)** 에 있습니다. 이 호출의 결과를 받아 더 계산할 것 없이 곧바로 돌려주기만 하면 된다는 뜻입니다. 그러니 호출하기 **전에** 현재 스택 프레임을 버려도 안전합니다. 이것이 꼬리 호출 최적화입니다. 실제로 이 최적화를 적용하면 스택에는 프레임이 하나만 남고, 그 안의 `x`와 `acc`가 (1000, 0), (999, 1000), ..., (0, 500500)으로 바뀌어 갈 뿐입니다.

이번에는 계승 함수를 봅시다.

```scala
def factorial(x: Int): Int =
  if (x < 2) 1
  else factorial(x - 1) * x
```

재귀 호출이 꼬리 위치에 있을까요? **아닙니다.** `factorial(x - 1)`을 계산한 뒤에 그 결과에 `x`를 곱해야 하기 때문입니다. 그러면 곱셈 순서를 바꾸면 어떨까요?

```scala
def factorial(x: Int): Int =
  if (x < 2) 1
  else x * factorial(x - 1)
```

이것도 **여전히 아닙니다!** 겉보기에는 재귀 호출이 맨 끝에 있지만, `factorial(x - 1)`의 결과에 `x`를 곱하는 일이 여전히 남아 있습니다.

> **자주 하는 실수** 재귀 호출이 코드의 맨 오른쪽에 **적혀 있다고** 꼬리 호출인 것은 아닙니다. 그 호출의 결과를 받아서 **아무 계산도 하지 않고** 그대로 돌려줄 때만 꼬리 호출입니다.

그렇다면 어떻게 재귀 호출을 꼬리 위치로 옮길 수 있을까요? 흔히 쓰는 방법은 지금까지의 계산 결과를 들고 다니는 <a id="g-accumulator"></a>**누산기(accumulator)** 를 매개변수로 추가하는 것입니다.

```scala
def factorial(x: Int, acc: Int): Int =
  if (x < 2) acc
  else factorial(x - 1, x * acc)

factorial(5, 1) // 120
```

곱셈을 재귀 호출 **전에** 미리 해서 `acc`에 넘기므로, 재귀 호출이 끝나면 할 일이 없습니다. 다만 부를 때마다 누산기의 초기값 `1`을 넘겨야 하니 사용하기에 편한 모양은 아닙니다. 이럴 때는 안쪽 함수를 정의해 추가 매개변수를 숨기면 됩니다.

```scala
def factorial(x: Int): Int =
  def aux(x: Int, acc: Int): Int =
    if (x < 2) acc
    else aux(x - 1, x * acc)
  aux(x, 1)

factorial(5) // 120
```

많은 프로그래밍 언어가 스택 오버플로를 피하기 위해 꼬리 호출 최적화를 지원합니다. 게다가 Scala에는 재귀 호출이 꼬리 위치에 있는지 **컴파일 시간에** 검사해 주는 `@tailrec` 표시가 있습니다.

```scala
import scala.annotation.tailrec

// Passes the tail-call position check
@tailrec
def factorial(x: Int, acc: Int): Int =
  if (x < 2) acc
  else factorial(x - 1, x * acc)

// Compile-time error
@tailrec
def factorial(x: Int): Int =
  if (x < 2) 1
  else x * factorial(x - 1)
```

두 번째 정의는 "Cannot rewrite recursive call: it is not in tail position"이라는 컴파일 오류를 냅니다. 꼬리 재귀라고 믿고 짠 함수에 `@tailrec`을 붙여 두면, 실수로 꼬리 위치를 벗어났을 때 바로 알 수 있습니다.

## 수동 메모리 관리

앞의 `f`와 `g` 예로 돌아가 봅시다. 프로그램이 끝날 무렵의 메모리는 다음과 같았습니다.

| 주소 | 0x00 | 0x01 | ... | 0xFE | 0xFF |
|---|---|---|---|---|---|
| 내용 | 1 (`a`) | 48 (`b`) | ... | `Box(2)` | `Box(1)` |

아쉽게도 스택 프레임을 지우는 것만으로는 **스택**이 아니라 **힙**에 동적으로 할당한 칸(0xFE와 0xFF)을 해제할 수 없습니다.

이를 해결하는 한 가지 방법은 <a id="g-manual-memory-management"></a>**수동 메모리 관리(manual memory management)** 입니다. 예를 들어 C++는 할당을 위한 `new`와 해제를 위한 `delete` 키워드를 제공합니다. 같은 프로그램을 C++로 쓰면 다음과 같습니다.

```cpp
// C++
struct Box { int k; Box(int k): k(k) {} };
int f(int x) {
  Box* y = new Box(1);    // alloc   0xFF
  int z = g(2);
  int k = y->k;
  return x + k + z;
}
int g(int b) {
  Box* c = new Box(b);    // alloc   0xFE
  int k = c->k;
  return k + 3;
}
int a = 1;     /* a -> 0x00 */
int b = f(42); /* b -> 0x01 */
a + b;         /* 49 */
```

여기서도 `new`로 할당한 0xFE와 0xFF는 프로그램이 끝날 때까지 남습니다. 이제 다 쓴 상자를 `delete`로 직접 해제해 봅시다.

```cpp
// C++
int f(int x) {
  Box* y = new Box(1);    // alloc   0xFF
  int z = g(2);
  int k = y->k; delete y; // dealloc 0xFF
  return x + k + z;
}
int g(int b) {
  Box* c = new Box(b);    // alloc   0xFE
  int k = c->k; delete c; // dealloc 0xFE
  return k + 3;
}
```

이렇게 하면 프로그램이 끝날 때 힙의 0xFE와 0xFF도 비어 있습니다.

수동 메모리 관리의 **장점**은 **효율**입니다. 사용자가 원하는 때에 힙에 할당한 칸을 **명시적으로** 해제할 수 있습니다.

반면 **단점**은 **실수하기 쉽다**는 것입니다. 힙에 할당한 칸을 해제할 **책임**이 전부 사용자에게 있기 때문에 다음과 같은 문제가 생기기 쉽습니다.

- <a id="g-memory-leak"></a>**메모리 누수(memory leak)**: 해제하는 것을 잊어버리면 생깁니다.
  ```cpp
  // C++
  b = new Box(42);  ...
  ```
- <a id="g-use-after-free"></a>**해제 후 사용(use after free, UAF)**: 이미 해제한 칸에 접근하려 하면 생깁니다.
  ```cpp
  // C++
  b = new Box(42);  ...  delete b;  ...  b->k;
  ```
- <a id="g-double-free"></a>**이중 해제(double free)**: 같은 칸을 두 번 이상 해제하면 생깁니다.
  ```cpp
  // C++
  b = new Box(42);  ...  delete b;  ...  delete b;
  ```

특히 해제 후 사용과 이중 해제는 단순히 프로그램이 멈추는 데 그치지 않고 심각한 보안 취약점으로 이어지기도 합니다.

## 쓰레기 수집

힙에 할당한 칸을 **자동으로** 해제할 방법은 없을까요? **있습니다!**

**쓰레기 수집(garbage collection, GC)** 은 <a id="g-automatic-memory-management"></a>**자동 메모리 관리(automatic memory management)** 의 대표적인 기법으로, 힙에서 더 이상 도달할 수 없는 칸을 자동으로 **찾아내고 해제**합니다. 이 절에서는 다음 GC 알고리즘들을 배웁니다.

- <a id="g-reference-counting"></a>**참조 횟수 세기(reference counting)**
- <a id="g-mark-and-sweep"></a>**표시하고 쓸기(mark-and-sweep) GC**
- <a id="g-copying"></a>**복사(copying) GC** (<a id="g-two-space"></a>두 공간(two-space) GC)
- 그 밖의 기법들

### 힙을 그림으로 나타내기

알고리즘을 설명하기 전에, 힙의 칸들을 실제 주소 없이 **그림으로** 나타내 보겠습니다. 칸은 상자로, 한 칸이 다른 칸을 가리키는 참조는 화살표로 그리고, `null`은 \\( \ast \\)로 적습니다. 스택에 있는 변수(여기서는 `a`와 `b`)도 힙을 가리킬 수 있습니다.

다음 Scala 프로그램을 따라가며 힙을 그려 봅시다. 이 장의 나머지 예는 모두 이 프로그램을 씁니다.

```scala
case class Box(var x: Box)
var a = Box(Box(Box(null)))
var b = Box(Box(null))
a.x.x.x = a.x
b.x = a
a.x = Box(null)
a = a.x
b = null
```

설명을 위해 칸에 이름을 붙이겠습니다. 첫 줄에서 만든 세 상자를 바깥부터 \\( A_1 \\), \\( A_2 \\), \\( A_3 \\), 둘째 줄의 두 상자를 \\( B_1 \\), \\( B_2 \\), 다섯째 줄에서 새로 만든 상자를 \\( C \\)라고 부릅니다.

| 실행한 줄 | 힙의 모양 |
|---|---|
| `var a = Box(Box(Box(null)))` | `a` → \\( A_1 \\) → \\( A_2 \\) → \\( A_3 \\) → \\( \ast \\) |
| `var b = Box(Box(null))` | `b` → \\( B_1 \\) → \\( B_2 \\) → \\( \ast \\) |
| `a.x.x.x = a.x` | \\( A_3 \\) → \\( A_2 \\): \\( A_2 \\)와 \\( A_3 \\)이 서로를 가리키는 **순환**이 생김 |
| `b.x = a` | \\( B_1 \\) → \\( A_1 \\): 이제 \\( B_2 \\)를 가리키는 것이 없음 |
| `a.x = Box(null)` | \\( A_1 \\) → \\( C \\) → \\( \ast \\): 이제 \\( A_2 \\)와 \\( A_3 \\)을 가리키는 것이 바깥에 없음 |
| `a = a.x` | `a` → \\( C \\): \\( A_1 \\)은 \\( B_1 \\)을 통해서만 도달 가능 |
| `b = null` | \\( B_1 \\)과 \\( A_1 \\)에도 도달할 수 없음 |

프로그램이 끝났을 때 힙은 아래 그림과 같습니다. 스택에서 출발해 화살표를 따라 도달할 수 있는 칸은 `a`가 가리키는 \\( C \\) 하나뿐이고, 빨간색으로 표시한 **다섯 칸**(\\( B_1 \\), \\( A_1 \\), \\( B_2 \\), 그리고 순환을 이루는 \\( A_2 \\)와 \\( A_3 \\))은 해제해야 할 쓰레기입니다.

<div style="text-align:center">
<svg viewBox="0 0 340 405" width="100%" style="max-width: 300px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="프로그램이 끝났을 때의 힙: 스택의 a는 C를 가리키고 b는 null이다. 도달할 수 없는 다섯 칸 B1, A1, B2와 서로를 가리키는 A2, A3이 빨간색으로 표시되어 있다" font-family="sans-serif" fill="currentColor">
<defs><marker id="gc-f2-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker><marker id="gc-f2-m1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#d9412b"/></marker></defs>
<text x="85" y="20" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">스택</text>
<rect x="10" y="28" width="150" height="72" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="50" y="47" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" font-weight="bold">a</text>
<rect x="22" y="54" width="56" height="38" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="50" cy="73" r="4.5" fill="currentColor"/>
<text x="120" y="47" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" font-weight="bold">b</text>
<rect x="92" y="54" width="56" height="38" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="120" y="80" text-anchor="middle" fill="currentColor" font-size="18" font-family="ui-monospace, Menlo, monospace">*</text>
<text x="200" y="70" text-anchor="start" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">* : null</text>
<rect x="10" y="120" width="310" height="275" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="310" y="142" text-anchor="end" fill="currentColor" font-size="14" font-weight="bold">힙</text>
<rect x="28" y="210" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="51.0" y="240" text-anchor="middle" fill="currentColor" font-size="18" font-family="ui-monospace, Menlo, monospace">*</text>
<text x="28" y="271" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">C</text>
<rect x="110" y="210" width="46" height="46" fill="none" stroke="#d9412b" stroke-width="2"/>
<circle cx="133.0" cy="233.0" r="4.5" fill="#d9412b"/>
<text x="110" y="271" text-anchor="start" fill="#d9412b" font-size="13" opacity="0.9">A<tspan baseline-shift="sub" font-size="72%">1</tspan></text>
<rect x="200" y="145" width="46" height="46" fill="none" stroke="#d9412b" stroke-width="2"/>
<circle cx="223.0" cy="168.0" r="4.5" fill="#d9412b"/>
<text x="250" y="191" text-anchor="start" fill="#d9412b" font-size="13" opacity="0.9">B<tspan baseline-shift="sub" font-size="72%">1</tspan></text>
<rect x="238" y="235" width="46" height="46" fill="none" stroke="#d9412b" stroke-width="2"/>
<text x="261.0" y="265" text-anchor="middle" fill="#d9412b" font-size="18" font-family="ui-monospace, Menlo, monospace">*</text>
<text x="238" y="296" text-anchor="start" fill="#d9412b" font-size="13" opacity="0.9">B<tspan baseline-shift="sub" font-size="72%">2</tspan></text>
<rect x="110" y="315" width="46" height="46" fill="none" stroke="#d9412b" stroke-width="2"/>
<circle cx="133.0" cy="338.0" r="4.5" fill="#d9412b"/>
<text x="110" y="376" text-anchor="start" fill="#d9412b" font-size="13" opacity="0.9">A<tspan baseline-shift="sub" font-size="72%">2</tspan></text>
<rect x="215" y="315" width="46" height="46" fill="none" stroke="#d9412b" stroke-width="2"/>
<circle cx="238.0" cy="338.0" r="4.5" fill="#d9412b"/>
<text x="215" y="376" text-anchor="start" fill="#d9412b" font-size="13" opacity="0.9">A<tspan baseline-shift="sub" font-size="72%">3</tspan></text>
<path d="M50,73 L51,207" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f2-m0)"/>
<path d="M133,233 L77,233" fill="none" stroke="#d9412b" stroke-width="1.6" marker-end="url(#gc-f2-m1)"/>
<path d="M223,168 C223,200 195,222 159,228" fill="none" stroke="#d9412b" stroke-width="1.6" marker-end="url(#gc-f2-m1)"/>
<path d="M133,338 C150,312 190,314 213,334" fill="none" stroke="#d9412b" stroke-width="1.6" marker-end="url(#gc-f2-m1)"/>
<path d="M238,338 C226,372 186,372 159,352" fill="none" stroke="#d9412b" stroke-width="1.6" marker-end="url(#gc-f2-m1)"/>
</svg>
</div>

### 참조 횟수 세기

**참조 횟수 세기(reference counting)** 는 힙의 각 칸을 가리키는 **참조의 개수**를 기록해 두는 간단한 GC 알고리즘입니다.

1. 각 칸의 참조 횟수를 0으로 **초기화**합니다.
2. 어떤 칸을 가리키는 참조가 생기면 그 칸의 참조 횟수를 **1 늘립니다**.
3. 어떤 칸을 가리키는 참조가 없어지면 그 칸의 참조 횟수를 **1 줄입니다**.
4. 어떤 칸의 참조 횟수가 0이 되면 그 칸을 **해제**합니다.

Python, Swift, Perl, Objective-C 같은 많은 언어가 참조 횟수 세기로 GC를 구현합니다.

앞의 프로그램을 참조 횟수 세기로 따라가 봅시다. 표의 숫자는 각 줄을 실행한 뒤의 참조 횟수이고, "해제"는 그 시점에 해제된 칸입니다.

| 실행한 줄 | \\( A_1 \\) | \\( A_2 \\) | \\( A_3 \\) | \\( B_1 \\) | \\( B_2 \\) | \\( C \\) |
|---|---|---|---|---|---|---|
| `var a = Box(Box(Box(null)))` | 1 | 1 | 1 | | | |
| `var b = Box(Box(null))` | 1 | 1 | 1 | 1 | 1 | |
| `a.x.x.x = a.x` | 1 | **2** | 1 | 1 | 1 | |
| `b.x = a` | **2** | 2 | 1 | 1 | **0** (해제) | |
| `a.x = Box(null)` | 2 | **1** | 1 | 1 | | **1** |
| `a = a.x` | **1** | 1 | 1 | 1 | | **2** |
| `b = null` | **0** (해제) | **1** | 1 | **0** (해제) | | **1** |

몇 단계를 자세히 보겠습니다.

- `a.x.x.x = a.x`에서 \\( A_3 \\)이 \\( A_2 \\)를 가리키게 되므로 \\( A_2 \\)의 참조 횟수는 \\( A_1 \\)과 \\( A_3 \\)에서 오는 2가 됩니다.
- `b.x = a`에서 \\( B_1 \\)이 \\( B_2 \\) 대신 \\( A_1 \\)을 가리키게 됩니다. \\( A_1 \\)은 2가 되고, \\( B_2 \\)는 0이 되어 **바로** 해제됩니다.
- `b = null`에서 \\( B_1 \\)이 0이 되어 해제되면, \\( B_1 \\)이 갖고 있던 참조도 사라지므로 \\( A_1 \\)이 0이 되어 해제되고, 다시 \\( A_1 \\)이 갖고 있던 참조가 사라져 \\( A_2 \\)와 \\( C \\)가 1씩 줄어듭니다. 이처럼 해제는 연쇄적으로 일어납니다.

그런데 마지막 상태를 보면 \\( A_2 \\)와 \\( A_3 \\)의 참조 횟수는 여전히 1입니다. 둘이 **서로를** 가리키고 있기 때문입니다. 스택에서는 도달할 수 없는데도 참조 횟수가 0이 되지 않으니 영영 해제되지 않습니다. 이처럼 참조 횟수 세기로는 도달할 수 없는 <a id="g-reference-cycle"></a>**참조 순환(reference cycle)** 을 해제할 수 없습니다.

<div style="text-align:center">
<svg viewBox="0 0 340 405" width="100%" style="max-width: 300px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="참조 횟수 세기를 마친 힙: C의 참조 횟수는 1이고, 서로를 가리키는 A2와 A3도 참조 횟수 1로 남아 참조 순환을 이룬다" font-family="sans-serif" fill="currentColor">
<defs><marker id="gc-f3-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="85" y="20" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">스택</text>
<rect x="10" y="28" width="150" height="72" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="50" y="47" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" font-weight="bold">a</text>
<rect x="22" y="54" width="56" height="38" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="50" cy="73" r="4.5" fill="currentColor"/>
<text x="120" y="47" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" font-weight="bold">b</text>
<rect x="92" y="54" width="56" height="38" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="120" y="80" text-anchor="middle" fill="currentColor" font-size="18" font-family="ui-monospace, Menlo, monospace">*</text>
<text x="200" y="70" text-anchor="start" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">* : null</text>
<rect x="10" y="120" width="310" height="275" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="310" y="142" text-anchor="end" fill="currentColor" font-size="14" font-weight="bold">힙</text>
<rect x="92" y="290" width="190" height="92" rx="4" fill="none" stroke="#d9412b" stroke-width="2"/>
<text x="187" y="284" text-anchor="middle" fill="#d9412b" font-size="14" font-weight="bold">참조 순환</text>
<rect x="28" y="210" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="51.0" y="240" text-anchor="middle" fill="currentColor" font-size="18" font-family="ui-monospace, Menlo, monospace">*</text>
<text x="28" y="271" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">C</text>
<rect x="18" y="200" width="20" height="20" fill="#2a408e"/>
<text x="28" y="215" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">1</text>
<rect x="110" y="315" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="133.0" cy="338.0" r="4.5" fill="currentColor"/>
<text x="110" y="376" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">A<tspan baseline-shift="sub" font-size="72%">2</tspan></text>
<rect x="100" y="305" width="20" height="20" fill="#2a408e"/>
<text x="110" y="320" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">1</text>
<rect x="215" y="315" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="238.0" cy="338.0" r="4.5" fill="currentColor"/>
<text x="215" y="376" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">A<tspan baseline-shift="sub" font-size="72%">3</tspan></text>
<rect x="251" y="305" width="20" height="20" fill="#2a408e"/>
<text x="261" y="320" text-anchor="middle" fill="#fff" font-size="13" font-weight="bold">1</text>
<path d="M50,73 L51,207" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f3-m0)"/>
<path d="M133,338 C150,312 190,314 213,334" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f3-m0)"/>
<path d="M238,338 C226,372 186,372 159,352" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f3-m0)"/>
</svg>
</div>

참조 횟수 세기의 장점은 다음과 같습니다.

- **구현하기 쉽습니다.** 참조가 생기거나 없어질 때 참조 횟수를 늘리거나 줄이기만 하면 됩니다.
- **멈춤이 없습니다.** 해제가 조금씩, 그리고 즉시 일어나므로 프로그램 전체를 멈추는 **stop-the-world** 멈춤이 없습니다.

단점은 다음과 같습니다.

- **참조 순환**: 도달할 수 없는 참조 순환을 해제하지 못합니다.
- **참조 횟수 비용**: 참조 횟수를 유지하는 데 추가 공간과 시간이 듭니다.
- <a id="g-free-list"></a>**빈 칸 목록(free list)과 <a id="g-fragmentation"></a>단편화(fragmentation)**: 힙에서 쓸 수 있는 빈 칸들을 추적하는 빈 칸 목록이 필요하고, 빈 칸이 여기저기 흩어지는 단편화 때문에 큰 객체를 할당하기 어려워집니다.

### 표시하고 쓸기 GC

**표시하고 쓸기(mark-and-sweep) GC** 는 <a id="g-tracing-gc"></a>**추적 GC(tracing GC)** 알고리즘의 하나입니다. 평소에는 아무 일도 하지 않다가, 어떤 조건(예를 들어 힙이 가득 참)에서 **실행되면** 힙을 **훑어서** 도달할 수 없는 객체를 찾습니다. 이때 각 칸을 세 가지 색으로 구분합니다.

1. 모든 칸을 **도달할 수 없음**(흰색)으로 표시합니다.
2. <a id="g-root"></a>뿌리(root), 즉 스택의 변수들이 가리키는 칸을 모두 **아직 훑지 않음**(회색)으로 표시합니다.
3. 회색 칸이 남아 있지 않을 때까지 다음을 반복합니다.
   1. 회색 칸을 하나 **고릅니다**.
   2. 고른 칸이 가리키는 칸들 중 흰색인 것을 회색으로 **표시합니다**.
   3. 고른 칸을 **다 훑음**(검은색)으로 **표시합니다**.
4. 여전히 흰색으로 표시된 칸을 모두 **해제**(쓸기, sweep)합니다.

앞의 프로그램에서 `a = a.x`를 실행한 직후, 즉 `b = null`을 실행하기 전에 GC가 실행되었다고 가정해 봅시다. 이때 `a`는 \\( C \\)를, `b`는 \\( B_1 \\)을 가리키고, \\( B_1 \\)은 \\( A_1 \\)을, \\( A_1 \\)은 \\( C \\)를 가리킵니다. \\( B_2 \\)와 순환을 이루는 \\( A_2 \\), \\( A_3 \\)은 이미 도달할 수 없습니다. 표시하고 쓸기 GC를 해 봅시다.

| 단계 | 흰색 | 회색 | 검은색 |
|---|---|---|---|
| 1. 모두 흰색 | \\( A_1, A_2, A_3, B_1, B_2, C \\) | | |
| 2. 뿌리가 가리키는 칸을 회색으로 | \\( A_1, A_2, A_3, B_2 \\) | \\( B_1, C \\) | |
| 3. \\( C \\)를 훑음: 가리키는 칸 없음 | \\( A_1, A_2, A_3, B_2 \\) | \\( B_1 \\) | \\( C \\) |
| 3. \\( B_1 \\)을 훑음: \\( A_1 \\)을 회색으로 | \\( A_2, A_3, B_2 \\) | \\( A_1 \\) | \\( B_1, C \\) |
| 3. \\( A_1 \\)을 훑음: \\( C \\)는 이미 검은색 | \\( A_2, A_3, B_2 \\) | | \\( A_1, B_1, C \\) |
| 4. 흰색 칸을 해제 | (해제됨) | | \\( A_1, B_1, C \\) |

아래 그림은 표시가 끝나고 쓸기 직전의 모습입니다. 각 칸 옆의 작은 네모가 색깔 표시입니다. 서로를 가리키는 두 칸은 참조 횟수 세기에서와 달리 흰색으로 남아, 마지막 단계에서 \\( B_2 \\)와 함께 해제됩니다.

<div style="text-align:center">
<svg viewBox="0 0 340 405" width="100%" style="max-width: 300px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="표시가 끝난 힙: 도달 가능한 세 칸 B1, A1, C는 검은색, B2와 순환을 이루는 A2, A3은 흰색으로 표시되어 있다" font-family="sans-serif" fill="currentColor">
<defs><marker id="gc-f4-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="85" y="20" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">스택</text>
<rect x="10" y="28" width="150" height="72" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="50" y="47" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" font-weight="bold">a</text>
<rect x="22" y="54" width="56" height="38" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="50" cy="73" r="4.5" fill="currentColor"/>
<text x="120" y="47" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" font-weight="bold">b</text>
<rect x="92" y="54" width="56" height="38" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="120" cy="73" r="4.5" fill="currentColor"/>
<text x="190" y="52" text-anchor="start" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">* : null</text>
<rect x="190" y="68" width="14" height="14" fill="currentColor"/>
<text x="210" y="80" text-anchor="start" fill="currentColor" font-size="13">검은색</text>
<rect x="260" y="68" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="280" y="80" text-anchor="start" fill="currentColor" font-size="13">흰색</text>
<rect x="10" y="120" width="310" height="275" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="310" y="142" text-anchor="end" fill="currentColor" font-size="14" font-weight="bold">힙</text>
<rect x="28" y="210" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="51.0" y="240" text-anchor="middle" fill="currentColor" font-size="18" font-family="ui-monospace, Menlo, monospace">*</text>
<text x="28" y="271" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">C</text>
<rect x="19" y="201" width="18" height="18" fill="currentColor"/>
<rect x="110" y="210" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="133.0" cy="233.0" r="4.5" fill="currentColor"/>
<text x="110" y="271" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">A<tspan baseline-shift="sub" font-size="72%">1</tspan></text>
<rect x="101" y="201" width="18" height="18" fill="currentColor"/>
<rect x="200" y="145" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="223.0" cy="168.0" r="4.5" fill="currentColor"/>
<text x="250" y="191" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">B<tspan baseline-shift="sub" font-size="72%">1</tspan></text>
<rect x="191" y="136" width="18" height="18" fill="currentColor"/>
<rect x="238" y="235" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="261.0" y="265" text-anchor="middle" fill="currentColor" font-size="18" font-family="ui-monospace, Menlo, monospace">*</text>
<text x="238" y="296" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">B<tspan baseline-shift="sub" font-size="72%">2</tspan></text>
<rect x="229" y="226" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="110" y="315" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="133.0" cy="338.0" r="4.5" fill="currentColor"/>
<text x="110" y="376" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">A<tspan baseline-shift="sub" font-size="72%">2</tspan></text>
<rect x="101" y="306" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="215" y="315" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="238.0" cy="338.0" r="4.5" fill="currentColor"/>
<text x="215" y="376" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">A<tspan baseline-shift="sub" font-size="72%">3</tspan></text>
<rect x="206" y="306" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"/>
<path d="M50,73 L51,207" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f4-m0)"/>
<path d="M120,73 L221,143" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f4-m0)"/>
<path d="M133,233 L77,233" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f4-m0)"/>
<path d="M223,168 C223,200 195,222 159,228" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f4-m0)"/>
<path d="M133,338 C150,312 190,314 213,334" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f4-m0)"/>
<path d="M238,338 C226,372 186,372 159,352" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f4-m0)"/>
</svg>
</div>

> **생각해 보기** 표시 단계에서 칸을 고르는 순서를 바꾸면 결과가 달라질까요? 회색에서 검은색이 되는 칸들의 집합은 순서와 상관없이 항상 같을까요?

표시하고 쓸기 GC의 장점은 **참조 순환을 처리할 수 있다**는 것입니다. 도달할 수 없는 참조 순환도 해제합니다.

단점은 다음과 같습니다.

- **stop-the-world**: GC를 하는 동안 프로그램 실행을 **멈춥니다**.
- **빈 칸 목록과 단편화**: 참조 횟수 세기와 마찬가지로 빈 칸 목록이 필요하고 단편화 때문에 큰 객체를 할당하기 어렵습니다.

### 복사 GC (두 공간 GC)

**복사(copying) GC**(두 공간(two-space) GC)도 표시하고 쓸기 GC처럼 **추적 GC** 알고리즘입니다. 다만 힙을 **from-space** 와 **to-space** 라는 두 공간으로 나누고, 도달할 수 있는 객체를 모두 to-space로 **복사**하면서 빈틈없이 **촘촘한** 배치로 다시 정리합니다.

- **할당**: 메모리 칸은 **from-space** 에서만 할당합니다.
- **해제**: 도달할 수 없는 객체는 다음과 같이 해제합니다.
  1. 모든 칸을 **도달할 수 없음**(흰색)으로 표시합니다.
  2. 뿌리가 가리키는 칸을 모두 to-space로 **복사**하고, 원래 칸에는 복사본을 가리키는 <a id="g-forwarding-pointer"></a>**전달 포인터(forwarding pointer)** 를 남깁니다. 복사본은 회색으로 표시하고, 뿌리가 복사본을 가리키도록 **고칩니다**.
  3. 회색 칸이 남아 있지 않을 때까지 다음을 반복합니다.
     1. to-space에서 회색 칸을 하나 **고릅니다**.
     2. 고른 칸이 가리키는 칸마다, 이미 전달 포인터가 있지 않으면 같은 방식으로 to-space에 **복사**합니다(회색).
     3. 고른 칸의 참조가 복사본을 가리키도록 **고칩니다**.
     4. 고른 칸을 **다 훑음**(검은색)으로 표시합니다.
  4. from-space와 to-space를 **맞바꿉니다**. 옛 from-space에 남은 칸은 모두 **해제**됩니다.

표시하고 쓸기 GC와 같은 시점(`a = a.x`를 실행한 직후)에 복사 GC를 해 봅시다. 복사본에는 \\( {}' \\)을 붙여 \\( A_1' \\)처럼 적습니다.

1. 처음에는 모든 칸이 from-space에 있고 to-space는 비어 있습니다.
2. 뿌리 `a`, `b`가 가리키는 \\( C \\)와 \\( B_1 \\)을 to-space에 복사해 \\( C' \\), \\( B_1' \\)(회색)을 만들고, 원래 칸에 전달 포인터를 남긴 뒤 `a`와 `b`가 복사본을 가리키게 고칩니다. 이 시점에 \\( B_1' \\)은 여전히 from-space의 \\( A_1 \\)을 가리킵니다.
3. \\( C' \\)을 훑습니다. 가리키는 칸이 없으니 바로 검은색이 됩니다.
4. \\( B_1' \\)을 훑습니다. \\( B_1' \\)이 가리키는 \\( A_1 \\)에는 전달 포인터가 없으므로 \\( A_1 \\)을 복사해 \\( A_1' \\)(회색)을 만들고 전달 포인터를 남깁니다. \\( B_1' \\)이 \\( A_1' \\)을 가리키게 고친 뒤 \\( B_1' \\)을 검은색으로 표시합니다. 이때 \\( A_1' \\)은 여전히 from-space의 \\( C \\)를 가리킵니다.
5. \\( A_1' \\)을 훑습니다. \\( A_1' \\)이 가리키는 \\( C \\)에는 **이미 전달 포인터가 있으므로** 다시 복사하지 않고, 전달 포인터를 따라가 \\( A_1' \\)이 \\( C' \\)을 가리키게 고칩니다. \\( A_1' \\)은 검은색이 됩니다.
6. 두 공간을 맞바꿉니다. 이제 to-space였던 쪽이 새 from-space가 되고, 그 안에는 \\( A_1' \\), \\( B_1' \\), \\( C' \\)이 빈틈없이 붙어 있습니다. 옛 from-space에 남은 \\( A_2 \\), \\( A_3 \\), \\( B_2 \\)와 옛 원본들은 한꺼번에 해제됩니다.

아래 그림은 5단계의 모습입니다. 점선은 from-space의 원래 칸에서 to-space의 복사본으로 가는 전달 포인터입니다.

<div style="text-align:center">
<svg viewBox="0 0 620 420" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="복사 GC 5단계의 힙: to-space에 C&#x27;, B1&#x27;, A1&#x27;이 복사되어 모두 검은색이고, B1&#x27;은 A1&#x27;을, A1&#x27;은 C&#x27;을 가리킨다. from-space의 원래 칸 C, B1, A1에서 복사본으로 점선 전달 포인터가 이어져 있고, B2와 A2, A3은 흰색으로 남아 있다" font-family="sans-serif" fill="currentColor">
<defs><marker id="gc-f5-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker><marker id="gc-f5-m1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#2f4fb8"/></marker></defs>
<text x="315" y="20" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">스택</text>
<rect x="240" y="28" width="150" height="72" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="280" y="47" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" font-weight="bold">a</text>
<rect x="252" y="54" width="56" height="38" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="280" cy="73" r="4.5" fill="currentColor"/>
<text x="350" y="47" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" font-weight="bold">b</text>
<rect x="322" y="54" width="56" height="38" fill="none" stroke="currentColor" stroke-width="1.6"/>
<circle cx="350" cy="73" r="4.5" fill="currentColor"/>
<text x="420" y="52" text-anchor="start" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">* : null</text>
<rect x="420" y="68" width="14" height="14" fill="currentColor"/>
<text x="440" y="80" text-anchor="start" fill="currentColor" font-size="13">검은색</text>
<rect x="490" y="68" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="510" y="80" text-anchor="start" fill="currentColor" font-size="13">흰색</text>
<rect x="10" y="120" width="295" height="290" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="20" y="400" text-anchor="start" fill="currentColor" font-size="14" font-weight="bold">from-space</text>
<rect x="315" y="120" width="295" height="290" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="600" y="400" text-anchor="end" fill="currentColor" font-size="14" font-weight="bold">to-space</text>
<rect x="36" y="200" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="59.0" cy="223.0" r="4.5" fill="currentColor"/>
<text x="36" y="261" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">C</text>
<rect x="27" y="191" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="116" y="200" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="139.0" cy="223.0" r="4.5" fill="currentColor"/>
<text x="116" y="261" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">A<tspan baseline-shift="sub" font-size="72%">1</tspan></text>
<rect x="107" y="191" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="196" y="150" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="219.0" cy="173.0" r="4.5" fill="currentColor"/>
<text x="246" y="196" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">B<tspan baseline-shift="sub" font-size="72%">1</tspan></text>
<rect x="187" y="141" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="226" y="228" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="249.0" y="258" text-anchor="middle" fill="currentColor" font-size="18" font-family="ui-monospace, Menlo, monospace">*</text>
<text x="226" y="289" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">B<tspan baseline-shift="sub" font-size="72%">2</tspan></text>
<rect x="217" y="219" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="106" y="315" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="129.0" cy="338.0" r="4.5" fill="currentColor"/>
<text x="106" y="376" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">A<tspan baseline-shift="sub" font-size="72%">2</tspan></text>
<rect x="97" y="306" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="211" y="315" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="234.0" cy="338.0" r="4.5" fill="currentColor"/>
<text x="211" y="376" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">A<tspan baseline-shift="sub" font-size="72%">3</tspan></text>
<rect x="202" y="306" width="18" height="18" fill="none" stroke="currentColor" stroke-width="1.5"/>
<rect x="345" y="165" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="368.0" y="195" text-anchor="middle" fill="currentColor" font-size="18" font-family="ui-monospace, Menlo, monospace">*</text>
<rect x="382" y="156" width="18" height="18" fill="currentColor"/>
<text x="395" y="211" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">C′</text>
<rect x="440" y="165" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="463.0" cy="188.0" r="4.5" fill="currentColor"/>
<rect x="477" y="156" width="18" height="18" fill="currentColor"/>
<text x="490" y="211" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">B<tspan baseline-shift="sub" font-size="72%">1</tspan>′</text>
<rect x="535" y="165" width="46" height="46" fill="none" stroke="currentColor" stroke-width="2"/>
<circle cx="558.0" cy="188.0" r="4.5" fill="currentColor"/>
<rect x="572" y="156" width="18" height="18" fill="currentColor"/>
<text x="585" y="211" text-anchor="start" fill="currentColor" font-size="13" opacity="0.9">A<tspan baseline-shift="sub" font-size="72%">1</tspan>′</text>
<path d="M280,73 L360,162" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f5-m0)"/>
<path d="M350,73 C390,80 455,110 460,162" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f5-m0)"/>
<path d="M463,188 L533,188" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f5-m0)"/>
<path d="M558,188 C560,272 400,272 372,214" fill="none" stroke="#2f4fb8" stroke-width="2" marker-end="url(#gc-f5-m1)"/>
<path d="M59,223 C59,95 300,92 350,162" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#gc-f5-m0)"/>
<path d="M219,173 C300,265 430,255 456,214" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#gc-f5-m0)"/>
<path d="M139,223 L139,296 L552,296 L552,214" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#gc-f5-m0)"/>
<path d="M129,338 C146,312 186,314 209,334" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f5-m0)"/>
<path d="M234,338 C222,372 182,372 155,352" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#gc-f5-m0)"/>
</svg>
</div>

> **자주 하는 실수** 전달 포인터를 남기지 않으면, 여러 칸이 같은 칸을 가리킬 때 그 칸이 여러 번 복사됩니다. 위의 5단계에서 \\( C \\)를 또 복사했다면 `a`와 \\( A_1' \\)이 서로 다른 복사본을 가리키게 되어, 원래 프로그램에서 공유하던 객체가 둘로 갈라졌을 것입니다. 순환이 있다면 복사가 끝나지도 않습니다.

복사 GC의 장점은 다음과 같습니다.

- **참조 순환을 처리할 수 있습니다.**
- **빈 칸 목록과 단편화가 없습니다.** GC가 끝나면 힙의 사용 중인 부분이 항상 **연속**되어 있습니다.
- **할당이 빠릅니다.** 첫 번째 빈 칸의 위치 하나만 기억하고 있다가 거기서부터 차례로 할당하면 됩니다.

단점은 다음과 같습니다.

- **stop-the-world**: GC를 하는 동안 프로그램 실행을 멈춥니다.
- **힙의 절반**(from-space)만 할당에 쓸 수 있습니다.
- **복사 비용이 큽니다.** GC를 할 때마다 도달할 수 있는 객체를 모두 복사합니다.

### 그 밖의 기법

실제 프로그래밍 언어들은 더 정교한 GC 알고리즘을 쓰거나, 여러 알고리즘을 섞거나, 사용자가 고를 수 있게 합니다.

- <a id="g-generational-gc"></a>**세대별 GC(generational GC)**: 대부분의 객체는 금방 쓸모가 없어진다는 관찰에 기대어, **젊은** 객체를 더 자주 수집합니다. 예: Java, Python(참조 순환을 처리하는 데 사용)
- <a id="g-concurrent-gc"></a>**동시 GC(concurrent GC)**: 멈춤을 줄이기 위해 GC를 프로그램과 **동시에** 실행합니다. 예: Java의 ZGC, Go

또한 **컴파일러 최적화**로 힙 할당 자체를 줄이기도 합니다.

- <a id="g-escape-analysis"></a>**탈출 분석(escape analysis)**: 객체가 함수 밖으로 **탈출**하지 않는다는 것을 알아내면, 그 객체를 힙 대신 **스택**에 할당합니다. 그러면 함수가 끝날 때 스택 프레임과 함께 저절로 해제됩니다. 예: Java, Go

마지막으로, Rust는 GC와는 전혀 다른 접근인 <a id="g-ownership"></a>**소유권(ownership)** 시스템을 씁니다. 각 값에 주인이 하나씩 있고 주인이 범위를 벗어나면 값이 해제되도록 하되, 이 규칙을 컴파일러가 검사해서 앞에서 본 해제 후 사용이나 이중 해제 같은 실수를 컴파일 시간에 막습니다.

더 알아보고 싶다면 다음 자료를 참고하세요.

- Java GC 기초: <https://www.oracle.com/webfolder/technetwork/tutorials/obe/java/gc01/index.html>
- Python GC: <https://github.com/python/cpython/blob/main/InternalDocs/garbage_collector.md>
- Java ZGC: <https://docs.oracle.com/en/java/javase/26/gctuning/z-garbage-collector1.html>
- Go GC 안내: <https://tip.golang.org/doc/gc-guide>
- Java HotSpot의 탈출 분석: <https://docs.oracle.com/en/java/javase/26/vm/java-hotspot-virtual-machine-performance-enhancements.html>
- Rust의 소유권: <https://doc.rust-lang.org/book/ch04-01-what-is-ownership.html>

## 정리

- **스택과 힙**: 함수의 스택 프레임은 함수에서 나올 때 지워지지만, 힙에 동적으로 할당한 칸은 다른 방법으로 해제해야 합니다.
  - **꼬리 호출 최적화**(TCO)는 꼬리 호출을 하기 전에 현재 스택 프레임을 버립니다. 누산기를 쓰면 재귀 호출을 꼬리 위치로 옮길 수 있고, Scala의 `@tailrec`은 이를 컴파일 시간에 검사합니다.
- **수동 메모리 관리**: 효율적이지만 실수하기 쉽습니다(메모리 누수, 해제 후 사용, 이중 해제).
- **쓰레기 수집**(GC): 힙에서 도달할 수 없는 칸을 자동으로 해제합니다.
  - **참조 횟수 세기**: 멈춤이 없지만 참조 순환을 처리하지 못합니다.
  - <a id="g-mark-and-sweep-gc"></a>**표시하고 쓸기 GC**: 참조 순환을 처리하지만 stop-the-world 멈춤과 단편화가 있습니다.
  - <a id="g-copying-gc"></a>**복사 GC**: 힙이 촘촘하고 할당이 빠르지만 힙의 절반만 씁니다.
  - **그 밖의 기법**: 세대별 GC, 동시 GC, 탈출 분석, 소유권.

## 연습 문제

1. 다음 함수의 재귀 호출은 꼬리 위치에 있나요? 아니라면 누산기를 써서 꼬리 재귀로 바꾸고 `@tailrec`으로 확인해 보세요.
   ```scala
   def length(xs: List[Int]): Int = xs match
     case Nil => 0
     case _ :: tl => 1 + length(tl)
   ```
2. 이 장의 `Box` 프로그램에서 마지막 줄 `b = null` 대신 `b.x = null`을 실행했다고 합시다. 참조 횟수 세기에서 각 칸의 참조 횟수는 어떻게 바뀌고, 어떤 칸이 해제되나요?
3. 표시하고 쓸기 GC가 `b = null`을 실행한 **뒤에** 실행되었다면 어떤 칸이 검은색이 되고 어떤 칸이 해제되나요? 참조 횟수 세기의 마지막 결과와 비교해 보세요.
4. 복사 GC에서 전달 포인터가 없다면 서로를 가리키는 두 칸에 도달할 수 있을 때 어떤 일이 벌어지는지 설명하세요.
5. [변경 가능한 변수](./mutable-variables.md)의 MFAE 인터프리터에서, 함수 호출이 끝난 뒤 매개변수를 위해 할당한 칸을 메모리에서 지워 버리면 어떤 문제가 생길 수 있을까요? (힌트: 함수 몸통이 매개변수를 기억하는 클로저를 돌려준다면?)
