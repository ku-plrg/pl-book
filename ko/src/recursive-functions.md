# 재귀 함수

[람다 계산](./lambda-calculus.md) 장 끝에서 우리는 함수만으로 모든 계산을 표현할 수 있다는 놀라운 이야기를 들었습니다. 그렇다면 "1부터 \\( n \\)까지 더하기"처럼 반복이 필요한 계산은 어떻게 할까요? 함수형 언어에서 반복의 주인공은 자기 자신을 부르는 <a id="g-recursive-function"></a>**재귀 함수**(recursive function)입니다.

이 장에서는 재귀 함수와 그 짝꿍인 <a id="g-conditional"></a>**조건문**(conditional)을 배웁니다. 먼저 지금까지 만든 언어들에서 재귀가 어떻게 되는지(또는 왜 안 되는지) 살펴봅니다. 그다음 FAE에서 재귀 함수를 만드는 두 가지 길을 걷습니다. 하나는 새 문법 없이 `mkRec`이라는 도우미 함수로 재귀를 만들어 내는 길이고, 다른 하나는 재귀 함수 정의 문법을 언어에 직접 추가해 **RFAE**라는 새 언어를 만드는 길입니다.

이 장에서 만들 `RFAE` 인터프리터를 먼저 돌려 봅시다. 프로그램을 고쳐 가며 실행해 보세요.

<div class="playground" data-lang="RFAE"></div>

## 재귀와 조건문

**재귀 함수**는 자기 자신을 호출하는 함수로, 리스트나 트리 같은 <a id="g-inductive-data-structure"></a>**귀납적 자료 구조**(inductive data structure)를 처리하는 **반복 과정**에 특히 유용합니다.

1부터 \\( n \\)까지의 정수를 모두 더하는 재귀 함수 `sum`을 Scala로 정의해 봅시다.

```scala
/* Scala */
def sum(n: Int): Int =
  if (n < 1) 0          // base case
  else n + sum(n - 1)   // recursive case

sum(10) // 10 + 9 + 8 + 7 + 6 + 5 + 4 + 3 + 2 + 1 + 0 = 55
```

이 함수에는 두 갈래가 있습니다. \\( n < 1 \\)이면 더 이상 자기 자신을 부르지 않고 `0`을 돌려주는 <a id="g-base-case"></a>**기저 사례**(base case)와, 그렇지 않으면 `sum(n - 1)`을 부르는 <a id="g-recursive-case"></a>**재귀 사례**(recursive case)입니다. 이 두 갈래를 나누려면 **조건문**이 꼭 필요합니다. 재귀 함수와 조건문이 늘 함께 다니는 이유입니다.

재귀 함수는 거의 모든 프로그래밍 언어가 지원합니다. 같은 `sum`을 여러 언어로 써 보면 다음과 같습니다.

```scala
// Scala
def sum(n: Int): Int = if (n < 1) 0 else n + sum(n - 1)
```

```cpp
// C++
int sum(int n) { return n < 1 ? 0 : n + sum(n - 1); }
```

```python
# Python
def sum(n): return 0 if n < 1 else n + sum(n - 1)
```

```rust
// Rust
fn sum(n: i32) -> i32 { if n < 1 {0} else {n + sum(n-1)} }
```

### F1VAE의 재귀

[1차 함수](./first-order-functions.md) 장의 F1VAE는 사실 이미 재귀 함수를 지원합니다.

```f1vae,run
/* F1VAE */
def sum(n) = n + sum(n + -1);
sum(10)
```

왜 그럴까요? F1VAE는 식을 계산하기 **전에** 모든 함수 정의를 **함수 환경(function environment)** \\( \Lambda \\)에 넣어 두기 때문입니다.

\\[
\Lambda = [\texttt{sum} \mapsto \texttt{def}\ \texttt{sum}(\texttt{n})\ \texttt{=}\ \texttt{n}\ \texttt{+}\ \texttt{sum}(\texttt{n}\ \texttt{+}\ \texttt{-1})]
\\]

그래서 `sum`의 몸통 안에서도 \\( \Lambda \\)에서 `sum`을 찾아 호출할 수 있습니다.

그런데 이것으로 충분할까요? **아닙니다!** 위의 예는 기저 사례가 없어서 `sum(10)`, `sum(9)`, ..., `sum(-100)`, ... 끝없이 자기 자신을 부르는 <a id="g-infinite-loop"></a>**무한 루프**(infinite loop)에 빠집니다. 재귀 함수를 쓸모 있게 만들려면 기저 사례와 재귀 사례를 나눌 **조건문**이 필요합니다.

F1VAE에 조건문만 더하면, 재귀를 위한 다른 확장 없이도 재귀 함수를 정의할 수 있습니다.

\\[
\begin{array}{llcll}
\text{Programs} & \mathbb{P} \ni p & ::= & f^{\ast}\ e & (\texttt{Program}) \\\\
\text{Function Definitions} & \mathbb{F} \ni f & ::= & \texttt{def}\ x(x)\ \texttt{=}\ e & (\texttt{FunDef}) \\\\
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots & \\\\
& & \mid & e\ \texttt{<}\ e & (\texttt{Lt}) \\\\
& & \mid & \texttt{if}\ (e)\ e\ \texttt{else}\ e & (\texttt{If}) \\\\
\text{Values} & \mathbb{V} \ni v & ::= & n \mid b &
\end{array}
\\]

\\[
\begin{array}{llcll}
\text{Function Environments} & \Lambda & \in & \mathbb{X} \xrightarrow{\text{fin}} \mathbb{F} & (\texttt{FEnv}) \\\\
\text{Booleans} & b & \in & \mathbb{B} = \\{ \texttt{true}, \texttt{false} \\} & (\texttt{Boolean})
\end{array}
\\]

비교 연산 `<`가 불리언 값을 만들고, 조건문 `if`가 그 값에 따라 갈래를 고릅니다. 이제 `sum`은 제대로 멈춥니다.

```f1vae
/* F1VAE + conditionals */
def sum(n) = if (n < 1) 0 else n + sum(n + -1);
sum(10) // 55
```

\\[
\Lambda = [\texttt{sum} \mapsto \texttt{def}\ \texttt{sum}(\texttt{n})\ \texttt{=}\ \texttt{if}\ (\texttt{n}\ \texttt{<}\ \texttt{1})\ \texttt{0}\ \texttt{else}\ \texttt{n}\ \texttt{+}\ \texttt{sum}(\texttt{n}\ \texttt{+}\ \texttt{-1})]
\\]

### FAE의 재귀

그렇다면 FAE에 조건문을 더하면 어떨까요? 다음 식을 봅시다.

```fae
/* FAE + conditionals */
val sum = n => {
  if (n < 1) 0
  else n + sum(n + -1)
};
sum(10)
```

이 식은 재귀 함수일까요? **아닙니다!** 몸통 안의 `sum`은 **자유 식별자**(free identifier)입니다. 왜 그럴까요?

FAE의 함수는 **정적 스코핑**(static scoping)를 따릅니다. 함수 `n => ...`가 만들어지는 **정의 시점**에 환경에는 아직 `sum`이 없습니다. `sum`은 `val sum = ...;`의 오른쪽 식을 다 계산한 **다음에야** 환경에 들어가니까요. 그래서 클로저가 기억하는 환경에는 `sum`이 없고, 몸통에서 `sum(n + -1)`을 계산하려는 순간 "free identifier" 오류가 납니다. ([람다 계산](./lambda-calculus.md) 장에서 본 것처럼 `val`은 함수 호출의 설탕이라는 점을 떠올려 보면 더 분명합니다. `(sum => sum(10))(n => ... sum(n + -1) ...)`에서 오른쪽 함수의 몸통에 있는 `sum`은 왼쪽 함수의 매개변수 `sum`과 아무 관계가 없습니다.)

그림으로 보면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="-8 1 512 132" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="val sum의 클로저는 sum이 아직 없는 빈 환경을 기억하므로 몸통의 sum은 자유 식별자가 된다" font-family="sans-serif" fill="currentColor">
<defs><marker id="recursive-functions-fig-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<rect rx="3" x="0.0" y="30.0" width="73.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="43.1" y1="30.0" x2="43.1" y2="56.0" stroke="currentColor" stroke-width="1.2"/>
<text x="21.5" y="48.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">sum</text>
<circle cx="58.1" cy="43.0" r="4"/>
<text x="0.0" y="22.0" font-size="13" opacity="0.75">val 다음의 환경</text>
<rect rx="3" x="130.0" y="28.0" width="366.3" height="30.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="468.3" y1="28.0" x2="468.3" y2="58.0" stroke="currentColor" stroke-width="1.2"/>
<text x="299.1" y="47.9" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">λn.(if (n &lt; 1) 0 else n + sum(n + -1))</text>
<circle cx="482.3" cy="43.0" r="4"/>
<line x1="58.1" y1="43.0" x2="122.0" y2="43.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#recursive-functions-fig-1)"/>
<line x1="482.3" y1="43.0" x2="482.3" y2="93.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#recursive-functions-fig-1)"/>
<text x="482.3" y="119.0" text-anchor="middle" font-size="20">∅</text>
<text x="466.3" y="117.0" text-anchor="end" font-size="14">클로저가 기억하는 환경: sum이 없음</text>
</svg>
</div>

그렇다면 FAE에서 재귀 함수를 어떻게 지원할 수 있을까요? 두 가지 방법이 있습니다.

1. **새 문법 없이**: 도우미 함수 `mkRec`을 써서 재귀 함수를 정의합니다.
2. **새 문법으로**: FAE에 재귀 함수 정의 문법을 추가합니다.

하나씩 살펴봅시다.

## 새 문법 없이 FAE에서 재귀하기

```fae
/* FAE + conditionals */
val sum = n => {
  if (n < 1) 0
  else n + sum(n + -1)
};
sum(10)
```

문제는 `sum`이 몸통 안에서 자기 자신을 모른다는 것입니다. 어떻게 하면 `sum`에게 자기 자신을 알려 줄 수 있을까요?

간단한 아이디어가 있습니다. **함수를 자기 자신에게 인자로 넘겨 주는 겁니다!**

```fae
/* FAE + conditionals */
val sumX = sumY => {
  n => {
    if (n < 1) 0
    else n + sumY(sumY)(n + -1)
  }
};
sumX(sumX)(10)
```

`sumX`는 "자기 자신" `sumY`를 받아서 원래의 `sum` 함수를 돌려주는 함수입니다. 몸통에서 재귀 호출을 할 때는 `sumY`에 다시 자기 자신을 넘겨 `sumY(sumY)`로 원래의 `sum`을 얻은 뒤 `n + -1`을 넘깁니다. 맨 처음 호출할 때도 `sumX(sumX)`로 자기 자신을 넘겨 줍니다. 이제 이 식은 정말로 `55`를 계산합니다.

> **생각해 보기.** `sumX(sumX)(10)`이 계산되는 과정을 따라가 보세요. 몸통 안의 `sumY`는 무엇에 묶여 있나요? 이번에는 왜 자유 식별자 오류가 나지 않을까요?

하지만 쓸 때마다 함수를 자기 자신에게 넘겨 주는 것은 번거롭습니다. 이것을 감싸서 원래의 `sum`을 되찾아 봅시다.

```fae
/* FAE + conditionals */
val sum = n => {
  val sumX = sumY => {
    n => {
      if (n < 1) 0
      else n + sumY(sumY)(n + -1)
    }
  };
  sumX(sumX)(n)
};
sum(10)
```

이제 바깥에서는 그냥 `sum(10)`이라고 쓰면 됩니다. 이 식은 <a id="g-reduction"></a>**η-축약**(η-reduction)으로 더 간단히 만들 수 있습니다.

\\[
\lambda x.e(x) \qquad\longrightarrow\qquad e
\qquad \text{단,} \qquad x\text{가 } e \text{ 안에서 자유롭지 않을 때만.}
\\]

"인자를 받아서 \\( e \\)에 그대로 넘기는 함수"는 그냥 \\( e \\)와 같다는 뜻입니다. 위의 `sum`은 `n => { ...; sumX(sumX)(n) }` 꼴이므로 `n =>`과 마지막의 `(n)`을 지울 수 있습니다.

```fae
/* FAE + conditionals */
val sum = {
  val sumX = sumY => {
    n => { // ALMOST the same as the original body
      if (n < 1) 0
      else n + sumY(sumY)(n + -1)
    }
  };
  sumX(sumX)
};
sum(10)
```

함수 몸통이 원래 버전과 **거의** 같아졌습니다. 다른 점은 재귀 호출을 `sum` 대신 `sumY(sumY)`로 해야 한다는 것뿐입니다. 그렇다면 `sum`이라는 변수를 `sumY(sumY)`로 정의해 버리면 어떨까요?

```fae
/* FAE + conditionals */
val sum = {
  val sumX = sumY => {
    val sum = sumY(sumY);
    n => { // EXACTLY the same as the original body
      if (n < 1) 0
      else n + sum(n + -1)
    }
  };
  sumX(sumX)
};
sum(10)
```

이제 몸통이 원래 버전과 **정확히** 같습니다. 그런데 안타깝게도 이 식은 **무한 루프**에 빠집니다!

```fae
/* FAE + conditionals */
val sum = {
  val sumX = sumY => {
    val sum = sumY(sumY); // INFINITE LOOP
    n => { // EXACTLY the same as the original body
      if (n < 1) 0
      else n + sum(n + -1)
    }
  };
  sumX(sumX)
};
sum(10)
```

이유를 따져 봅시다. `sumX(sumX)`를 계산하면 `sumX`의 몸통으로 들어가 가장 먼저 `val sum = sumY(sumY)`를 계산합니다. 그런데 `sumY`가 바로 `sumX`이므로 이는 다시 `sumX(sumX)`를 계산하는 것이고, 그러면 또 `val sum = sumY(sumY)`를 계산하고... 끝이 없습니다. 이전 버전에서는 `sumY(sumY)`가 함수 `n => ...` **안에** 있었기 때문에, 그 함수가 실제로 호출될 때까지 계산이 미뤄졌습니다. 이번에는 함수 밖으로 꺼내는 바람에 너무 일찍 계산된 것입니다.

> **자주 하는 실수.** \\( e \\)와 \\( \lambda x.e(x) \\)는 호출했을 때의 결과가 같으니 아무 데서나 바꿔 써도 된다고 생각하기 쉽습니다. 하지만 우리 언어처럼 식을 만나자마자 계산하는 언어에서는 **언제** 계산되는지가 다릅니다. \\( e \\)는 그 자리에서 바로 계산되지만, \\( \lambda x.e(x) \\)는 이미 값(함수)이므로 호출될 때까지 \\( e \\)가 계산되지 않습니다. \\( e \\)의 계산이 끝나지 않는 경우라면 이 차이가 곧 무한 루프와 정상 종료의 차이가 됩니다.

그래서 <a id="g-expansion"></a>**η-확장**(η-expansion)으로 `sum`의 계산을 **미뤄야**(delay)합니다.

\\[
e \qquad\longrightarrow\qquad \lambda x.e(x)
\qquad \text{단,} \qquad x\text{가 } e \text{ 안에서 자유롭지 않을 때만.}
\\]

```fae
/* FAE + conditionals */
val sum = {
  val sumX = sumY => {
    val sum = x => sumY(sumY)(x);
    n => { // EXACTLY the same as the original body
      if (n < 1) 0
      else n + sum(n + -1)
    }
  };
  sumX(sumX)
};
sum(10)
```

이제 `sum`은 `x => sumY(sumY)(x)`라는 함수이므로 정의할 때는 아무것도 계산하지 않고, 실제로 `sum(n + -1)`이 호출될 때 비로소 `sumY(sumY)`를 계산합니다. 무한 루프가 사라졌습니다.

그런데 재귀 함수를 만들 때마다 이 과정을 반복해야 할까요? 이런 반복적인 코드를 피하기 위해 도우미 함수 `mkRec`을 만들어 봅시다. 먼저 `sumX`와 `sumY`라는 이름을 `fX`와 `fY`로 바꿉니다. 이 이름들은 `sum`과 아무 관계가 없으니까요.

```fae
/* FAE + conditionals */
val sum = {
  val fX = fY => {
    val sum = x => fY(fY)(x);
    n => {
      if (n < 1) 0
      else n + sum(n + -1)
    }
  };
  fX(fX)
};
sum(10)
```

그다음, 안쪽의 변수 정의 `val sum = x => fY(fY)(x); n => { ... }`를 설탕 제거합니다. `val x = e1; e2`가 `(x => e2)(e1)`이었으니 다음과 같습니다.

```fae
/* FAE + conditionals */
val sum = {
  val fX = fY => {
    (sum => n => {
      if (n < 1) 0
      else n + sum(n + -1)
    })(x => fY(fY)(x))
  };
  fX(fX)
};
sum(10)
```

잘 보면 `sum => n => { ... }` 부분은 **재귀 함수의 몸통**만 담고 있고, 나머지는 `sum`과 전혀 상관없는 틀입니다. 이 틀을 함수로 뽑아내면 끝입니다.

### `mkRec`: 재귀를 위한 도우미 함수

재귀 함수의 몸통 `body`를 받아 재귀 함수를 돌려주는 도우미 함수 `mkRec`을 정의합시다.

```fae
/* FAE + conditionals */
val mkRec = body => {
  val fX = fY => body(x => fY(fY)(x));
  fX(fX)
};
val sum = mkRec(sum => n => {
  if (n < 1) 0
  else n + sum(n + -1)
});
sum(10)
```

`mkRec`에 넘기는 인자 `sum => n => ...`는 "재귀 호출에 쓸 함수 `sum`이 주어진다면, 원하는 함수는 이것이다"라는 뜻입니다. `mkRec`은 그 `sum` 자리에 진짜 자기 자신을 끼워 넣어 줍니다.

이제 다른 재귀 함수도 `mkRec`으로 손쉽게 정의할 수 있습니다. 예를 들어 다음 `fac`은 팩토리얼을 계산합니다.

```fae
/* FAE + conditionals */
val mkRec = ...;
val fac = mkRec(fac => n => if (n < 1) 1 else n * fac(n + -1));
fac(5) // 5 * 4 * 3 * 2 * 1 = 120
```

### 고정점 조합자

`mkRec`을 다시 들여다봅시다.

```fae,run
/* FAE + conditionals */
body => {
  val fX = fY => body(x => fY(fY)(x));
  fX(fX)
}
```

여기서 `val`을 펼치고 이름을 정리하면 다음과 같은 식이 되는데, 이것을 <a id="g-z-combinator"></a>**Z 조합자**(Z combinator)라고 부릅니다.

```fae,run
/* FAE + conditionals */
f => (x => f(v => x(x)(v))) (x => f(v => x(x)(v)))
```

<a id="g-combinator"></a>조합자(combinator)란 자유 변수가 없는 함수를 말합니다. Z 조합자는 함수 `f`를 받아서 `f(g)`와 같은 함수 `g`, 즉 `f`의 <a id="g-fixed-point"></a>**고정점**(fixed point)을 만들어 냅니다. 위의 예에서 `sum => n => ...`의 고정점이 바로 우리가 원하던 `sum` 함수입니다. 이런 일을 하는 조합자를 통틀어 <a id="g-fixed-point-combinator"></a>**고정점 조합자**(fixed-point combinator)라고 합니다([위키백과의 Fixed-point combinator 항목](https://en.wikipedia.org/wiki/Fixed-point_combinator)).

가장 유명한 고정점 조합자는 <a id="g-y-combinator"></a>**Y 조합자**(Y combinator)입니다. Z 조합자에서 η-확장(`v => ... (v)`)을 뺀 모양이고, <a id="g-non-strict"></a>비엄격(non-strict) 언어에서 쓰입니다.

```pl
/* non-strict languages */
f => (x => f(x(x))) (x => f(x(x)))
```

우리 언어처럼 인자를 먼저 계산하는 언어에서 Y 조합자를 쓰면, 앞에서 본 것처럼 `x(x)`가 너무 일찍 계산되어 무한 루프에 빠집니다. 그래서 η-확장으로 계산을 미룬 Z 조합자가 필요했던 것입니다. 인자를 필요할 때까지 계산하지 않는 비엄격(지연) 계산은 [지연 계산](./lazy-evaluation.md) 장에서 다룹니다.

## RFAE: 재귀와 조건문이 있는 FAE

FAE에서 재귀 함수를 지원하는 두 번째 방법은 언어에 **재귀 함수 정의** 문법을 직접 추가하는 것입니다. **RFAE**는 FAE에 **재귀**와 **조건문**을 더한 언어입니다.

```rfae,run
/* RFAE */
def sum(n) = if (n < 1) 0 else n + sum(n + -1);
sum(10) // 55
```

RFAE를 만들려면 FAE의 식에 다음 세 가지를 더해야 합니다.

1. **산술 비교 연산자**
2. **조건문**
3. **재귀 함수 정의**

재귀 함수 정의는 네 부분으로 이루어집니다.

- 함수 이름(위의 예에서 `sum`)
- 매개변수 이름(`n`)
- 함수 몸통 식(`if (n < 1) 0 else n + sum(n + -1)`)
- <a id="g-scope-expression"></a>스코프 식(scope expression) (`sum(10)`)

F1VAE의 함수 정의와 달리, RFAE의 재귀 함수 정의는 그 자체가 **식**이라는 점에 주의하세요. 따라서 식이 올 수 있는 곳이라면 어디에나 쓸 수 있습니다. 정의된 함수는 스코프 식 안에서만 쓸 수 있습니다.

```rfae,run
/* RFAE */
2 * {
  def sum(n) = if (n < 1) 0 else n + sum(n + -1);
  sum(10) // 55
} + 1 // 2 * 55 + 1 = 111
```

### 구체 문법

RFAE의 구체 문법(concrete syntax)을 BNF로 정의하면 다음과 같습니다. FAE에 세 줄이 더해졌습니다.

```bnf
// expressions
<expr> ::= ...
         | <expr> "<" <expr>                              // less-than
         | "if" "(" <expr> ")" <expr> "else" <expr>       // conditional
         | "def" <id> "(" <id> ")" "=" <expr> ";" <expr> // recursion
```

### 추상 문법

RFAE의 추상 문법(abstract syntax)을 BNF로 정의하고, Scala의 대수적 데이터 타입으로 옮기면 다음과 같습니다.

\\[
\begin{array}{llcll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots & \\\\
& & \mid & e\ \texttt{<}\ e & (\texttt{Lt}) \\\\
& & \mid & \texttt{if}\ (e)\ e\ \texttt{else}\ e & (\texttt{If}) \\\\
& & \mid & \texttt{def}\ x(x)\ \texttt{=}\ e;\ e & (\texttt{Rec})
\end{array}
\\]

```scala
enum Expr:
  ...
  // less-than
  case Lt(left: Expr, right: Expr)
  // conditional
  case If(cond: Expr, thenExpr: Expr, elseExpr: Expr)
  // recursive function definition
  case Rec(name: String, param: String, body: Expr, scope: Expr)
```

## RFAE의 인터프리터와 자연 의미

이제 1) **인터프리터**를 구현하고,

```scala
def interp(expr: Expr, env: Env): Value = ???
```

그리고 2) 재귀 함수 정의를 비롯한 새 식들의 **자연 의미**(natural semantics)를 정의해 봅시다. 판단의 모양은 FAE와 같은 \\( \sigma \vdash e \Rightarrow v \\)입니다.

비교 연산의 결과로 불리언이 생기므로 값에 불리언 \\( b \\)가 추가됩니다.

\\[
\begin{array}{llcl}
\text{Values} & \mathbb{V} \ni v & ::= & n \mid b \mid \langle \lambda x.e, \sigma \rangle
\end{array}
\\]

```scala
enum Value:
  case NumV(n: BigInt)
  case BoolV(bool: Boolean)
  case CloV(param: String, body: Expr, env: Env)
```

### 산술 비교 연산자

`<`는 두 피연산자를 계산해서 둘 다 숫자이면 비교 결과를 불리언 값으로 돌려줍니다. 덧셈과 곱셈에서 `numBOp`로 연산을 감쌌던 것처럼, 비교 연산은 `numCOp`로 감쌉니다.

```scala
type BOp[T] = (T, T) => T
type COp[T] = (T, T) => Boolean
def numCOp(op: COp[BigInt], x: String): BOp[Value] =
  case (NumV(l), NumV(r)) => BoolV(op(l, r))
  case (l, r) => error(s"invalid operation: ${l.str} $x ${r.str}")

val numLt: BOp[Value] = numCOp(_ < _, "<")

def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Lt(l, r) => numLt(interp(l, env), interp(r, env))
```

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Lt}$}
\BinaryInfC{$\sigma \vdash e_1\ \texttt{<}\ e_2 \Rightarrow n_1 < n_2$}
\end{prooftree}
\\]

### 조건문

조건문은 먼저 조건식을 계산합니다. 결과가 `true`이면 첫 번째 갈래만, `false`이면 두 번째 갈래만 계산합니다. 조건식의 값이 불리언이 아니면 오류입니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case If(c, t, e) => interp(c, env) match
    case BoolV(true)  => interp(t, env)
    case BoolV(false) => interp(e, env)
    case v            => error(s"not a boolean: ${v.str}")
```

규칙은 조건의 값에 따라 두 개로 나뉩니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \texttt{true}$}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1$}
\LeftLabel{$\texttt{If}_T$}
\BinaryInfC{$\sigma \vdash \texttt{if}\ (e_0)\ e_1\ \texttt{else}\ e_2 \Rightarrow v_1$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \texttt{false}$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow v_2$}
\LeftLabel{$\texttt{If}_F$}
\BinaryInfC{$\sigma \vdash \texttt{if}\ (e_0)\ e_1\ \texttt{else}\ e_2 \Rightarrow v_2$}
\end{prooftree}
\\]

계산하지 않는 갈래는 규칙의 전제에 아예 나타나지 않는다는 점에 주목하세요. 그래서 `sum`의 기저 사례에서는 재귀 사례 `n + sum(n + -1)`이 계산되지 않고, 재귀가 멈출 수 있습니다.

> **생각해 보기.** 만약 조건문이 두 갈래를 **모두** 계산한 다음 하나를 고른다면 `sum(10)`은 어떻게 될까요? [람다 계산](./lambda-calculus.md) 장의 처치 불리언 \\( \mathcal{D}⟦ \texttt{if}(e_1)\ e_2\ \texttt{else}\ e_3 ⟧ = \mathcal{D}⟦ e_1 ⟧(\mathcal{D}⟦ e_2 ⟧)(\mathcal{D}⟦ e_3 ⟧) \\)를 인자를 먼저 계산하는 언어에서 그대로 쓰면 어떤 문제가 생길지도 생각해 보세요.

### 재귀 함수 정의

드디어 핵심인 재귀 함수 정의입니다. \\( \texttt{def}\ x_0(x_1)\ \texttt{=}\ e_2;\ e_3 \\)는 새 환경 \\( \sigma' \\)를 만들고, 그 환경에서 스코프 식 \\( e_3 \\)를 계산하면 됩니다. 문제는 \\( \sigma' \\)를 어떻게 만드느냐입니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Rec(n, p, b, s) =>
    val newEnv: Env = ???
    interp(s, newEnv)
```

\\[
\begin{prooftree}
\AxiomC{$\sigma' = \texttt{???}$}
\AxiomC{$\sigma' \vdash e_3 \Rightarrow v_3$}
\LeftLabel{$\texttt{Rec}$}
\BinaryInfC{$\sigma \vdash \texttt{def}\ x_0(x_1)\ \texttt{=}\ e_2;\ e_3 \Rightarrow v_3$}
\end{prooftree}
\\]

새 환경에는 함수 이름 \\( x_0 \\)가 클로저 \\( \langle \lambda x_1.e_2, ? \rangle \\)에 묶여 있어야 합니다. 코드로는 `???` 줄이 `val newEnv: Env = env + (n -> CloV(p, b, ???))`가 됩니다. 그럼 이 클로저가 기억할 환경은 무엇이어야 할까요?

\\[
\begin{prooftree}
\AxiomC{$\sigma' = \sigma[x_0 \mapsto \langle \lambda x_1.e_2, \texttt{???} \rangle]$}
\AxiomC{$\sigma' \vdash e_3 \Rightarrow v_3$}
\LeftLabel{$\texttt{Rec}$}
\BinaryInfC{$\sigma \vdash \texttt{def}\ x_0(x_1)\ \texttt{=}\ e_2;\ e_3 \Rightarrow v_3$}
\end{prooftree}
\\]

FAE에서 재귀가 안 됐던 이유를 떠올려 봅시다. 클로저의 환경에 함수 자신의 이름이 없었기 때문이었죠. 그러니 클로저가 기억할 환경은 \\( x_0 \\)가 이미 들어 있는 환경, 즉 **\\( \sigma' \\) 자기 자신**이어야 합니다. 코드로는 남은 `???`에 `newEnv`를 넣어 `val newEnv: Env = env + (n -> CloV(p, b, newEnv))`라고 쓰고 싶지만, 이 코드는 동작하지 않습니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma' = \sigma[x_0 \mapsto \langle \lambda x_1.e_2, \sigma' \rangle]$}
\AxiomC{$\sigma' \vdash e_3 \Rightarrow v_3$}
\LeftLabel{$\texttt{Rec}$}
\BinaryInfC{$\sigma \vdash \texttt{def}\ x_0(x_1)\ \texttt{=}\ e_2;\ e_3 \Rightarrow v_3$}
\end{prooftree}
\\]

그림으로 그리면 환경과 클로저가 서로를 가리키는 고리가 생깁니다.

<div style="text-align:center">
<svg viewBox="-8 -28 428 118" width="100%" style="max-width: 440px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="σ′의 x0은 클로저를 가리키고, 그 클로저는 다시 σ′ 자신을 가리키는 순환 구조" font-family="sans-serif" fill="currentColor">
<defs><marker id="recursive-functions-fig-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<rect rx="3" x="0.0" y="30.0" width="144.1" height="52.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="34.1" y1="30.0" x2="34.1" y2="82.0" stroke="currentColor" stroke-width="1.2"/>
<text x="17.0" y="48.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">…</text>
<text x="89.1" y="48.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">σ의 바인딩</text>
<line x1="0.0" y1="56.0" x2="144.1" y2="56.0" stroke="currentColor" stroke-width="1.2"/>
<text x="17.0" y="74.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">x₀</text>
<circle cx="89.1" cy="69.0" r="4"/>
<text x="0.0" y="22.0" font-size="16" font-family="Times New Roman, Times, serif" font-style="italic">σ'</text>
<rect rx="3" x="220.0" y="41.0" width="100.2" height="30.0" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="292.2" y1="41.0" x2="292.2" y2="71.0" stroke="currentColor" stroke-width="1.2"/>
<text x="256.1" y="61.2" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">λx₁.e₂</text>
<circle cx="306.2" cy="56.0" r="4"/>
<line x1="89.1" y1="69.0" x2="212.0" y2="69.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#recursive-functions-fig-2)"/>
<path d="M306.2,56.0 C366.2,56.0 366.2,-20 92.0,-8 L72.0,10" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#recursive-functions-fig-2)"/>
<text x="358.2" y="30.0" font-size="13" opacity="0.75">자기 자신</text>
</svg>
</div>

\\( \sigma' \\)가 자기 자신을 포함하는 순환적인 정의입니다. 수학적인 자연 의미에서는 이런 방정식을 만족하는 \\( \sigma' \\)를 생각하면 되므로 문제가 없습니다. 하지만 앞의 Scala 코드는 동작하지 않습니다. `newEnv`를 정의하는 식 안에서 아직 정의되지 않은 `newEnv`를 쓰고 있기 때문입니다.

여기서 다시 **η-확장**으로 `newEnv`의 계산을 **미루는** 아이디어를 씁니다. 클로저가 환경(`Env`) 자체 대신, 부르면 환경을 만들어 주는 <a id="g-environment-factory"></a>**환경 팩토리(environment factory)** (`() => Env`)를 갖게 하는 것입니다.

```scala
enum Value:
  ...
  case CloV(param: String, body: Expr, env: () => Env)

def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Fun(p, b) => CloV(p, b, () => env)
  case App(f, e) => interp(f, env) match
    case CloV(p, b, fenv) => interp(b, fenv() + (p -> interp(e, env)))
    case v                => error(s"not a function: ${v.str}")
  case Rec(n, p, b, s) =>
    val newEnv: Env = env + (n -> CloV(p, b, () => newEnv)) // error
    interp(s, newEnv)
```

일반 함수 `Fun`은 `() => env`로 지금 환경을 그대로 돌려주는 팩토리를 넣고, 함수를 호출하는 `App`에서는 `fenv()`로 팩토리를 불러 환경을 얻습니다. 그런데 이것도 아직 동작하지 않습니다. Scala에서 지역 변수 `val newEnv`는 정의가 끝나기 전에 참조할 수 없기 때문에, `() => newEnv`처럼 함수 안에 넣어도 "forward reference" 컴파일 오류가 납니다.

마지막으로 <a id="g-lazy-value"></a>**지연 값(lazy value)**, 즉 Scala의 `lazy val`을 써서 `newEnv`의 계산을 미룹니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Rec(n, p, b, s) =>
    lazy val newEnv: Env = env + (n -> CloV(p, b, () => newEnv))
    interp(s, newEnv)
```

`lazy val`은 처음 쓰일 때 비로소 계산되고, 그 결과를 기억해 두는 변수입니다. 그래서 자기 자신을 참조하는 정의도 허용됩니다. 위 코드가 어떻게 동작하는지 따라가 봅시다.

1. `interp(s, newEnv)`가 `newEnv`를 처음 쓰는 순간 `env + (n -> CloV(p, b, () => newEnv))`가 계산됩니다. 이때 `() => newEnv`는 함수일 뿐이므로 `newEnv`를 아직 들여다보지 않습니다. 따라서 계산이 무사히 끝나고 그 결과가 `newEnv`에 기억됩니다.
2. 나중에 스코프 식 안에서 `sum(10)`을 호출하면 `App` 경우가 `fenv()`를 부르고, 이것은 이미 계산이 끝난 `newEnv`를 돌려줍니다. 그 환경에는 `sum`이 들어 있으므로 몸통 안의 재귀 호출 `sum(n + -1)`도 제대로 찾아집니다.

이 방식으로 실제 Scala 코드에서도 순환적인 환경 \\( \sigma' = \sigma[x_0 \mapsto \langle \lambda x_1.e_2, \sigma' \rangle] \\)를 만들 수 있습니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma' = \sigma[x_0 \mapsto \langle \lambda x_1.e_2, \sigma' \rangle]$}
\AxiomC{$\sigma' \vdash e_3 \Rightarrow v_3$}
\LeftLabel{$\texttt{Rec}$}
\BinaryInfC{$\sigma \vdash \texttt{def}\ x_0(x_1)\ \texttt{=}\ e_2;\ e_3 \Rightarrow v_3$}
\end{prooftree}
\\]

지연 값에 대해서는 [지연 계산](./lazy-evaluation.md) 장에서 더 자세히 배웁니다.

> **자주 하는 실수.** 클로저가 기억해야 하는 환경은 \\( \sigma \\)가 아니라 \\( \sigma' \\)입니다. `CloV(p, b, () => env)`처럼 바깥 환경 `env`를 넣으면 몸통 안에서 함수 이름을 찾지 못해, FAE에서 겪었던 "free identifier" 오류가 그대로 다시 나타납니다.

## 정리

- **재귀 함수**는 자기 자신을 호출하는 함수이고, 기저 사례와 재귀 사례를 나누려면 **조건문**이 필요합니다.
- F1VAE는 함수 환경 \\( \Lambda \\)에 모든 함수 정의를 미리 넣어 두므로 조건문만 더하면 재귀 함수를 쓸 수 있습니다. 반면 FAE에서는 정적 스코핑 때문에 `val sum = n => ... sum ...`의 몸통 안 `sum`이 자유 식별자가 됩니다.
- 새 문법 없이도, 함수를 자기 자신에게 넘기는 아이디어와 η-확장으로 계산을 미루는 기법을 합쳐 `mkRec`을 만들 수 있습니다. 이를 다듬은 것이 **Z 조합자**이고, 비엄격 언어에서는 **Y 조합자**를 씁니다. 이들을 **고정점 조합자**라고 합니다.
- **RFAE**는 FAE에 `<`, `if`-`else`, 재귀 함수 정의 `def x(x) = e; e`를 더한 언어입니다.

\\[
\begin{array}{llcll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots & \\\\
& & \mid & e\ \texttt{<}\ e & (\texttt{Lt}) \\\\
& & \mid & \texttt{if}\ (e)\ e\ \texttt{else}\ e & (\texttt{If}) \\\\
& & \mid & \texttt{def}\ x(x)\ \texttt{=}\ e;\ e & (\texttt{Rec}) \\\\
\text{Values} & \mathbb{V} \ni v & ::= & n \mid b \mid \langle \lambda x.e, \sigma \rangle &
\end{array}
\\]

- 재귀 함수 정의의 핵심은 클로저가 자기 자신이 들어 있는 환경 \\( \sigma' \\)를 기억하게 하는 것입니다. 인터프리터에서는 환경 팩토리 `() => Env`와 `lazy val`로 이 순환을 만듭니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  ...
  case Rec(n, p, b, s) =>
    lazy val newEnv: Env = env + (n -> CloV(p, b, () => newEnv))
    interp(s, newEnv)
```

\\[
\begin{prooftree}
\AxiomC{$\sigma' = \sigma[x_0 \mapsto \langle \lambda x_1.e_2, \sigma' \rangle]$}
\AxiomC{$\sigma' \vdash e_3 \Rightarrow v_3$}
\LeftLabel{$\texttt{Rec}$}
\BinaryInfC{$\sigma \vdash \texttt{def}\ x_0(x_1)\ \texttt{=}\ e_2;\ e_3 \Rightarrow v_3$}
\end{prooftree}
\\]

## 연습 문제

1. `mkRec`을 써서 \\( n \\)번째 피보나치 수를 계산하는 함수 `fib`를 FAE(조건문 포함)로 정의하세요. 같은 함수를 RFAE의 `def`로도 정의해 보세요.
2. 본문의 `val sum = sumY(sumY);` 버전이 무한 루프에 빠지는 이유를, `sumX(sumX)`의 계산 과정을 몇 단계 따라가며 설명하세요.
3. RFAE 식 `def f(n) = if (n < 1) 0 else f(n + -1); f(2)`의 값을 구하는 증명 나무를 `Rec`, `App`, `If`\\( _T \\), `If`\\( _F \\), `Lt` 규칙으로 그려 보세요.
4. `Rec` 규칙의 클로저 환경을 \\( \sigma' \\) 대신 \\( \sigma \\)로 바꾸면 어떤 RFAE 식의 결과가 달라지나요? 예를 들어 설명하세요.
5. 수업 연습 문제 RFAE([과제 문서](https://github.com/ku-plrg-classroom/docs/tree/main/cose212/rfae))의 `interp` 함수를 구현해 보세요. 제출할 필요는 없지만 시험 문제와 관련될 수 있으니 직접 풀어 보기를 강하게 권합니다.
6. <a id="ex-recursive-functions-6"></a>★★ 다음 식에서 `fac`은 팩토리얼을 계산하는 재귀 함수입니다. 전체 식의 값이 `720`(= 6!)이 되도록 `???`에 들어갈 식을 쓰세요.

   ```fae
   /* FAE + conditionals */
   val mkRec = body => {
     val f = fX => fX(fX);
     f(fY => body(???))
   };
   val fac = mkRec(fac => n => {
     if (n < 2) 1
     else n * fac(n + -1)
   });
   fac(6)
   ```

   <details><summary>힌트</summary>

   `f(fY => body(???))`를 한 걸음 계산하면 `fY`에는 `fY => body(???)` 자신이 묶이므로, `fY(fY)`는 `body(???)`와 같습니다. 그런데 `fY(fY)`를 그대로 넣으면 어떻게 될까요?

   </details>

   [해답 →](./answers-1.md#ans-recursive-functions-6)
7. <a id="ex-recursive-functions-7"></a>★★ RFAE에 논리곱 `&&`, 논리합 `||`, 부정 `!`을 더하려고 합니다.

   \\[
   \begin{array}{lrcll}
   \text{Expressions} & \mathbb{E} \ni e & ::= & \ldots \mid e\ \mathtt{\\&\\&}\ e \mid e\ \texttt{||}\ e \mid \texttt{!}\ e
   \end{array}
   \\]

   `&&`와 `||`는 <a id="g-short-circuit-evaluation"></a>**단락 계산**(short-circuit evaluation)을 해야 합니다. 즉 왼쪽 피연산자만 보고 결과가 정해지면 오른쪽은 계산하지 않습니다. 또 왼쪽 피연산자는 불리언이어야 하지만 오른쪽 피연산자는 아무 값이나 될 수 있습니다.
   - `true || 1(2)`는 `1(2)`를 계산하지 않고 `true`가 됩니다.
   - `false && 1(2)`는 `1(2)`를 계산하지 않고 `false`가 됩니다.
   - `1 && 2`는 `1`이 불리언이 아니므로 실행 중 오류입니다.
   - `true && 1`은 `1`이 불리언이 아니지만 `1`이 됩니다.

   세 연산자의 자연 의미 규칙을 쓰세요.

   <details><summary>힌트</summary>

   `If`\\( _T \\), `If`\\( _F \\)처럼 왼쪽 피연산자의 값에 따라 규칙을 둘로 나누고, 계산하지 않는 피연산자는 전제에 넣지 마세요.

   </details>

   [해답 →](./answers-1.md#ans-recursive-functions-7)
