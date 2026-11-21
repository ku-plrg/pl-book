# 컨티뉴에이션

지금부터 세 장에 걸쳐 <a id="g-continuation"></a>**컨티뉴에이션**(continuation)을 다룹니다. 이번 장에서는 컨티뉴에이션이 무엇인지, 그리고 그것을 어떻게 눈에 보이게 드러낼 수 있는지를 배웁니다. 다음 장 [일급 컨티뉴에이션](./first-class-continuations.md)에서는 컨티뉴에이션을 값으로 다루어 프로그램의 제어 흐름을 마음대로 바꾸는 방법을, 그다음 장 [컨티뉴에이션으로 컴파일하기](./compiling-with-continuations.md)에서는 컨티뉴에이션을 컴파일에 활용하는 방법을 배웁니다.

이 장의 흐름은 다음과 같습니다. 먼저 컨티뉴에이션을 "남은 계산"으로 이해하고, 함수가 컨티뉴에이션을 인자로 받는 <a id="g-continuation-passing-style"></a>**컨티뉴에이션 전달 방식**(continuation-passing style, CPS)으로 프로그램을 바꿔 써 봅니다. 그 방법으로 \\(\textsf{FAE}\\) 인터프리터를 CPS로 다시 작성한 뒤, 컨티뉴에이션과 <a id="g-value-stack"></a>**값 스택**(value stack)을 이용해 \\(\textsf{FAE}\\)의 **작은 걸음 의미**(small-step operational semantics)를 정의합니다. 마지막으로 이 새 의미가 기존의 큰 걸음 의미와 같은 결과를 낸다는 것을 증명하고, 컨티뉴에이션을 함수가 아닌 자료 구조로 표현하는 <a id="g-first-order-representation"></a>**1차 표현**(first-order representation)을 살펴봅니다.

## 컨티뉴에이션이란

실제로 쓰이는 많은 언어는 프로그램의 <a id="g-control-flow"></a>**제어 흐름**(control flow)을 바꾸는 <a id="g-control-statement"></a>**제어문**(control statement)을 제공합니다. 예를 들어 C++에는 `break`, `continue`, `return`이 있습니다.

```cpp
// C++
int sumEvenUntilZero(int xs[], int len) {
  if (len <= 0) return 0;          // directly return 0 if len <= 0
  int sum = 0;
  for (int i = 0; i < len; i++) {
    if (xs[i] == 0) break;         // stop the loop if xs[i] == 0
    if (xs[i] % 2 != 0) continue;  // skip the rest if xs[i] is odd
    sum += xs[i];
  }
  return sum;                      // finally return the sum
}
int xs[] = {4, 1, 3, 2, 0, 6, 5, 8};
sumEvenUntilZero(xs, 8);           // 4 + 2 = 6
```

`return`은 함수의 나머지 부분을 건너뛰고, `break`는 반복문의 나머지를 건너뛰고, `continue`는 이번 반복의 나머지를 건너뜁니다. 그런데 함수형 언어에는 이런 문장이 없습니다. 함수형 언어에서는 이런 제어 흐름을 어떻게 나타낼 수 있을까요? 답은 **컨티뉴에이션**입니다.

### 남은 계산

직관적으로, 컨티뉴에이션은 <a id="g-the-rest-of-the-computation"></a>**남은 계산**(the rest of the computation)을 나타냅니다. 다음 \\(\textsf{FAE}\\) 식을 봅시다.

```fae
/* FAE */
(1 + 3) * 5
```

이 짧은 식에는 다음과 같은 계산 순서가 숨어 있습니다.

1. `1`을 계산한다. (결과: `1`)
2. `3`을 계산한다. (결과: `3`)
3. 1단계와 2단계의 결과를 더한다. (결과: `1 + 3 = 4`)
4. `5`를 계산한다. (결과: `5`)
5. 3단계와 4단계의 결과를 곱한다. (결과: `4 * 5 = 20`)

\\(k\\)번째 단계의 **컨티뉴에이션**은 \\(k+1\\)번째부터 마지막까지의 단계입니다. 예를 들어 3단계의 컨티뉴에이션은 4단계와 5단계, 즉 "5를 계산해서 지금 결과에 곱하기"입니다.

<div style="text-align:center">
<svg viewBox="0 0 640 130" width="100%" style="max-width: 620px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="(1 + 3) * 5의 다섯 계산 단계: 1을 계산, 3을 계산, 더하기, 5를 계산, 곱하기. 3단계가 강조되어 있고, 4단계와 5단계를 묶어 3단계의 컨티뉴에이션이라고 표시했다" font-family="sans-serif" fill="currentColor">
<defs><marker id="cont-f1-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="72.0" y="22" text-anchor="middle" fill="currentColor" font-size="13" opacity="0.8">1단계</text>
<rect x="17" y="32" width="110" height="42" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="72.0" y="58" text-anchor="middle" fill="currentColor" font-size="14">1을 계산</text>
<path d="M128,53 L140,53" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cont-f1-m0)"/>
<text x="196.0" y="22" text-anchor="middle" fill="currentColor" font-size="13" opacity="0.8">2단계</text>
<rect x="141" y="32" width="110" height="42" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="196.0" y="58" text-anchor="middle" fill="currentColor" font-size="14">3을 계산</text>
<path d="M252,53 L264,53" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cont-f1-m0)"/>
<text x="320.0" y="22" text-anchor="middle" fill="currentColor" font-size="13" opacity="0.8">3단계</text>
<rect x="265" y="32" width="110" height="42" fill="#2a408e"/>
<text x="320.0" y="58" text-anchor="middle" fill="#fff" font-size="14">더하기 (4)</text>
<path d="M376,53 L388,53" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cont-f1-m0)"/>
<text x="444.0" y="22" text-anchor="middle" fill="currentColor" font-size="13" opacity="0.8">4단계</text>
<rect x="389" y="32" width="110" height="42" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="444.0" y="58" text-anchor="middle" fill="currentColor" font-size="14">5를 계산</text>
<path d="M500,53 L512,53" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cont-f1-m0)"/>
<text x="568.0" y="22" text-anchor="middle" fill="currentColor" font-size="13" opacity="0.8">5단계</text>
<rect x="513" y="32" width="110" height="42" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="568.0" y="58" text-anchor="middle" fill="currentColor" font-size="14">곱하기 (20)</text>
<path d="M389,84 L389,92 L623,92 L623,84" fill="none" stroke="currentColor" stroke-width="1.4"/>
<text x="506.0" y="116" text-anchor="middle" fill="currentColor" font-size="14">3단계의 컨티뉴에이션</text>
</svg>
</div>

### 컨티뉴에이션을 드러내기

위 식에서 컨티뉴에이션은 **암묵적으로** 존재합니다. 이것을 식 안에 **명시적으로** 드러낼 수 있을까요? 네, 할 수 있습니다. \\(k\\)번째 단계의 컨티뉴에이션을 다음과 같은 **함수**로 나타내면 됩니다.

- \\(k\\)번째 단계의 결과를 인자로 **받아서**,
- \\(k+1\\)번째부터 마지막까지의 단계를 **수행**하는 함수.

식 \\(e\\) 안에서 지금 계산하고 있는 부분이 \\(e'\\)이라고 합시다.

\\[
e = (\ldots \ e' \ \ldots)
\\]

그러면 이 식을 다음과 같이 바꿔 쓸 수 있습니다.

\\[
(\lambda x.(\ldots \ x \ \ldots))(e')
\\]

여기서 \\(\lambda x.(\ldots \ x \ \ldots)\\)가 바로 \\(e'\\)의 컨티뉴에이션입니다. \\(e'\\)의 결과를 \\(x\\)로 받아서 나머지 일을 하니까요.

`(1 + 3) * 5`에 이 변환을 한 단계씩 적용해 봅시다. 1단계에서 계산하는 부분은 `1`이므로, `1` 자리를 `x1`로 비우고 함수로 감쌉니다.

```fae
/* FAE */
{
  x1 => (x1 + 3) * 5      // step 2-5 (continuation of step 1)
}(1)                      // step 1
```

이제 함수 본문 `(x1 + 3) * 5`에서 다음에 계산할 부분은 `3`입니다. 같은 방법을 적용합니다.

```fae
/* FAE */
{
  x1 => {
    x2 => (x1 + x2) * 5   // step 3-5 (continuation of step 2)
  }(3)                    // step 2
}(1)                      // step 1
```

다음은 `x1 + x2`입니다.

```fae
/* FAE */
{
  x1 => {
    x2 => {
      x3 => x3 * 5        // step 4-5 (continuation of step 3)
    }(x1 + x2)            // step 3
  }(3)                    // step 2
}(1)                      // step 1
```

다음은 `5`입니다.

```fae
/* FAE */
{
  x1 => {
    x2 => {
      x3 => {
        x4 => x3 * x4     // step 5 (continuation of step 4)
      }(5)                // step 4
    }(x1 + x2)            // step 3
  }(3)                    // step 2
}(1)                      // step 1
```

마지막으로 `x3 * x4`입니다. 5단계 뒤에는 더 할 일이 없으므로, 5단계의 컨티뉴에이션은 받은 값을 그대로 돌려주는 항등 함수 `x5 => x5`입니다.

```fae
/* FAE */
{
  x1 => {
    x2 => {
      x3 => {
        x4 => {
          x5 => x5        // no more steps (continuation of step 5)
        }(x3 * x4)        // step 5
      }(5)                // step 4
    }(x1 + x2)            // step 3
  }(3)                    // step 2
}(1)                      // step 1
```

중첩이 깊어 읽기 어렵지만, 변수 정의(`val`)를 위한 문법 설탕(syntactic sugar)

\\[
\mathcal{D}⟦ \texttt{val} \ x \ \texttt{=} \ e; \ e' ⟧ = (\lambda x.\mathcal{D}⟦ e' ⟧)(\mathcal{D}⟦ e ⟧)
\\]

을 거꾸로 적용하면 놀랄 만큼 깔끔해집니다.

```fae
/* FAE */
val x1 = 1;               // step 1
val x2 = 3;               // step 2
val x3 = x1 + x2;         // step 3
val x4 = 5;               // step 4
val x5 = x3 * x4;         // step 5
x5                        // no more steps (continuation of step 5)
```

각 줄이 한 단계이고, 어떤 줄 아래에 있는 모든 줄이 그 줄의 컨티뉴에이션입니다. 중간 결과마다 이름이 붙어 있고 계산 순서가 위에서 아래로 명확하게 드러납니다. 이런 형태는 컴파일러의 중간 표현에서 자주 볼 수 있는데, 이 이야기는 [컨티뉴에이션으로 컴파일하기](./compiling-with-continuations.md)에서 다시 합니다.

> **생각해 보기**: `1 + (2 * 3)`의 계산 단계를 나열하고, 위와 같은 `val` 형태로 바꿔 써 보세요. 2단계의 컨티뉴에이션은 무엇인가요?

## 컨티뉴에이션 전달 방식

지금까지 우리는 함수를 <a id="g-direct-style"></a>**직접 방식**(direct style)으로 작성했습니다. 함수의 결과를 호출한 쪽으로 **돌려주는** 방식입니다. 예를 들어 다음 Scala 함수 `sum`은 직접 방식입니다.

```scala
def sum(n: Int): Int =
  if (n <= 1) 1
  else sum(n - 1) + n

sum(3) * 5              // (1 + 2 + 3) * 5 = 30
```

**컨티뉴에이션 전달 방식**(CPS)은 컨티뉴에이션을 함수에 명시적인 매개변수로 넘기고, 함수가 결과를 돌려주는 대신 그 컨티뉴에이션을 **호출해서** 결과를 넘겨주는 프로그래밍 방식입니다. `sum`을 CPS로 다시 써 봅시다. 목표는 다음과 같습니다.

```scala
type Cont = Int => Int
def sumCPS(n: Int, k: Cont): Int = ???

sumCPS(3, x => x * 5)   // (1 + 2 + 3) * 5 = 30
```

`sumCPS(n, k)`는 "`n`까지의 합을 구한 다음, 그 결과로 `k`를 하라"는 뜻입니다. 위 예에서 `x => x * 5`는 `sum(3) * 5`에서 `sum(3)`의 컨티뉴에이션입니다.

가장 쉬운 첫걸음은 이렇습니다.

```scala
type Cont = Int => Int
def sumCPS(n: Int, k: Cont): Int = k(sum(n))
```

동작은 하지만 원래의 `sum`에 기대고 있으므로 올바른 CPS 구현이 아닙니다. `sum(n)`을 `sum`의 본문으로 바꿔 봅시다.

```scala
type Cont = Int => Int
def sumCPS(n: Int, k: Cont): Int = k(
  if (n <= 1) 1
  else sum(n - 1) + n
)
```

이제 다음 동치 관계를 이용해 `k`를 `if` 안으로 밀어 넣습니다.

```scala
e0(if (e1) e2 else e3)     ==    if (e1) e0(e2) else e0(e3)
```

```scala
type Cont = Int => Int
def sumCPS(n: Int, k: Cont): Int =
  if (n <= 1) k(1)
  else k(sum(n - 1) + n)
```

아직 `sum`에 기대는 부분이 남아 있습니다. 여기서 핵심 관찰을 합니다. `k(sum(n - 1) + n)`에서 지금 계산하는 부분은 `sum(n - 1)`이고, 그 컨티뉴에이션은 "결과에 `n`을 더해서 `k`에 넘기기", 즉 `x => k(x + n)`입니다.

```scala
k(sum(n - 1) + n)    ==    (x => k(x + n))(sum(n - 1))
                     ==    sumCPS(n - 1, x => k(x + n))
```

두 번째 줄은 첫 번째 단락에서 본 변환이고, 세 번째 줄은 `sumCPS`의 정의 "`sumCPS(m, k)` = `k(sum(m))`"을 거꾸로 쓴 것입니다. 이렇게 완성된 CPS 버전은 다음과 같습니다.

```scala
type Cont = Int => Int
def sumCPS(n: Int, k: Cont): Int =
  if (n <= 1) k(1)
  else sumCPS(n - 1, x => k(x + n))

sumCPS(3, x => x * 5)   // 30
```

`sumCPS(3, k0)`이 어떻게 계산되는지 따라가 보면 컨티뉴에이션이 점점 쌓이는 모습을 볼 수 있습니다. 여기서 `k0 = x => x * 5`입니다.

```scala
sumCPS(3, k0)
== sumCPS(2, x => k0(x + 3))
== sumCPS(1, y => (x => k0(x + 3))(y + 2))
== (y => (x => k0(x + 3))(y + 2))(1)
== (x => k0(x + 3))(3)
== k0(6)
== 30
```

모든 함수를 CPS로 작성하면 프로그램은 다음 성질을 만족합니다.

- 모든 함수가 컨티뉴에이션을 명시적인 매개변수로 받는다.
- 한 번의 함수 호출에서 컨티뉴에이션은 많아야 한 번 호출된다.
- 모든 함수 호출이 <a id="g-tail-position"></a>**꼬리 위치**(tail position)에 있다. 그래서 **꼬리 호출 최적화**(tail-call optimization)를 적용할 수 있다.
- 처음에 넘겨주는 컨티뉴에이션을 제외한 모든 함수는 함수 호출로 끝난다.

> **자주 하는 실수**: `sumCPS(n - 1, x => k(x + n))` 대신 `k(sumCPS(n - 1, x => x + n))`처럼 쓰면 안 됩니다. 이렇게 하면 `sumCPS`가 꼬리 위치에 있지 않고, 결과를 돌려받은 뒤에 `k`를 부르는 직접 방식으로 돌아가 버립니다. CPS에서 "그다음에 할 일"은 언제나 컨티뉴에이션 안으로 들어가야 합니다.

## CPS로 작성한 FAE 인터프리터

원래의 \\(\textsf{FAE}\\) 인터프리터는 직접 방식으로 작성되어 있고, 각 식을 계산한 뒤의 컨티뉴에이션은 **암묵적으로** 존재합니다.

```scala
def interp(expr: Expr, env: Env): Value = expr match
  case Num(n)    => NumV(n)
  case Add(l, r) => numAdd(interp(l, env), interp(r, env))
  case Mul(l, r) => numMul(interp(l, env), interp(r, env))
  case Id(x)     => env.getOrElse(x, error(s"free identifier: $x"))
  case Fun(p, b) => CloV(p, b, env)
  case App(f, a) => interp(f, env) match
    case CloV(p, b, fenv) => interp(b, fenv + (p -> interp(a, env)))
    case v                => error(s"not a function: ${v.str}")
```

예를 들어 `Add(l, r)`에서 `interp(l, env)`를 부를 때, "그 결과를 들고 `r`을 계산한 다음 둘을 더해서 돌려주기"라는 컨티뉴에이션은 Scala의 호출 스택 안에 숨어 있습니다. 이 컨티뉴에이션을 **명시적으로** 드러내기 위해 인터프리터를 CPS로 바꿔 봅시다.

```scala
type Cont = Value => Value
def interpCPS(expr: Expr, env: Env, k: Cont): Value = ???
```

`sumCPS`와 똑같은 전략을 씁니다. 먼저 `interpCPS(expr, env, k)`를 `k(interp(expr, env))`로 정의하고,

```scala
type Cont = Value => Value
def interpCPS(expr: Expr, env: Env, k: Cont): Value =
  k(interp(expr, env))
```

`interp(expr, env)`를 `interp`의 본문으로 바꿉니다.

```scala
type Cont = Value => Value
def interpCPS(expr: Expr, env: Env, k: Cont): Value = k(expr match
  case Num(n)    => NumV(n)
  case Add(l, r) => numAdd(interp(l, env), interp(r, env))
  case Mul(l, r) => numMul(interp(l, env), interp(r, env))
  case Id(x)     => env.getOrElse(x, error(s"free identifier: $x"))
  case Fun(p, b) => CloV(p, b, env)
  case App(f, a) => interp(f, env) match
    case CloV(p, b, fenv) => interp(b, fenv + (p -> interp(a, env)))
    case v                => error(s"not a function: ${v.str}")
)
```

`if`에서 그랬듯이 `k`를 `match`의 각 경우 안으로 밀어 넣습니다.

```scala
type Cont = Value => Value
def interpCPS(expr: Expr, env: Env, k: Cont): Value = expr match
  case Num(n)    => k(NumV(n))
  case Add(l, r) => k(numAdd(interp(l, env), interp(r, env)))
  case Mul(l, r) => k(numMul(interp(l, env), interp(r, env)))
  case Id(x)     => k(env.getOrElse(x, error(s"free identifier: $x")))
  case Fun(p, b) => k(CloV(p, b, env))
  case App(f, a) => k(interp(f, env) match
    case CloV(p, b, fenv) => interp(b, fenv + (p -> interp(a, env)))
    case v                => error(s"not a function: ${v.str}")
  )
```

`Num`, `Id`, `Fun` 경우는 이미 완성입니다. 하위 식을 계산하지 않고 바로 값을 만들어 `k`에 넘기기 때문입니다. 반면 `Add`, `Mul`, `App` 경우는 아직 원래의 `interp`를 부르고 있으므로 고쳐야 합니다.

### 덧셈과 곱셈

`Add` 경우를 봅시다.

```scala
  case Add(l, r) =>
    k(numAdd(interp(l, env), interp(r, env)))
```

지금 계산하는 부분은 `interp(l, env)`이고, 그 컨티뉴에이션은 `lv => k(numAdd(lv, interp(r, env)))`입니다. 앞에서 배운 대로 함수로 감싸면,

```scala
  case Add(l, r) =>
    {
      lv => k(numAdd(lv, interp(r, env)))   // cont. of `interp(l, env)`
    }(interp(l, env))
```

이고, 이것은 컨티뉴에이션을 `interpCPS`에 넘기는 것과 같습니다.

```scala
  case Add(l, r) =>
    interpCPS(l, env, {
      lv => k(numAdd(lv, interp(r, env)))   // cont. of `interp(l, env)`
    })
```

이제 안쪽에서 계산하는 부분은 `interp(r, env)`이고, 그 컨티뉴에이션은 `rv => k(numAdd(lv, rv))`입니다. 같은 변환을 한 번 더 합니다.

```scala
  case Add(l, r) =>
    interpCPS(l, env, {
      lv => {
        rv => k(numAdd(lv, rv))             // cont. of `interp(r, env)`
      }(interp(r, env))
    })
```

```scala
  case Add(l, r) =>
    interpCPS(l, env, {
      lv => interpCPS(r, env, {
        rv => k(numAdd(lv, rv))             // cont. of `interp(r, env)`
      })
    })
```

곱셈도 똑같습니다.

```scala
type Cont = Value => Value
def interpCPS(expr: Expr, env: Env, k: Cont): Value = expr match
  ...
  case Add(l, r) =>
    interpCPS(l, env, {
      lv => interpCPS(r, env, {
        rv => k(numAdd(lv, rv))
      })
    })
  case Mul(l, r) =>
    interpCPS(l, env, {
      lv => interpCPS(r, env, {
        rv => k(numMul(lv, rv))
      })
    })
  ...
```

코드를 읽어 보면 계산 순서가 그대로 드러납니다. "`l`을 계산해서 `lv`라 하고, `r`을 계산해서 `rv`라 하고, 둘을 더해서 `k`에 넘긴다." 앞에서 본 `val x1 = ...; val x2 = ...;` 형태와 똑같은 구조입니다.

### 함수 적용

함수 적용도 같은 방법으로 바꿉니다.

```scala
  case App(f, a) => k(interp(f, env) match
    case CloV(p, b, fenv) => interp(b, fenv + (p -> interp(a, env)))
    case v                => error(s"not a function: ${v.str}")
  )
```

먼저 계산하는 부분은 `interp(f, env)`입니다. 그 결과를 `fv`로 받는 컨티뉴에이션을 만들어 `interpCPS`에 넘깁니다.

```scala
  case App(f, a) => interpCPS(f, env, {
    // cont. of `interp(f, env)`
    fv => k(fv match
      case CloV(p, b, fenv) => interp(b, fenv + (p -> interp(a, env)))
      case v                => error(s"not a function: ${v.str}")
    )
  })
```

조금 줄여 쓰면 다음과 같습니다.

```scala
  case App(f, a) => interpCPS(f, env, fv => k(fv match
    case CloV(p, b, fenv) => interp(b, fenv + (p -> interp(a, env)))
    case v                => error(s"not a function: ${v.str}")
  ))
```

이제 `k(...)` 호출을 `match` 안으로 옮깁니다.

```scala
  case App(f, a) => interpCPS(f, env, fv => fv match
    case CloV(p, b, fenv) => k(interp(b, fenv + (p -> interp(a, env))))
    case v                => error(s"not a function: ${v.str}")
  )
```

`error(...)`는 `k`로 감쌀 필요가 없습니다. 값을 돌려주는 것이 아니라 예외를 던지므로, 그 뒤에 할 "남은 계산"이 없기 때문입니다. 다음으로 계산하는 부분은 `interp(a, env)`입니다.

```scala
  case App(f, a) => interpCPS(f, env, fv => fv match
    case CloV(p, b, fenv) =>
      interpCPS(a, env, {
        // cont. of `interp(a, env)`
        av => k(interp(b, fenv + (p -> av)))
      })
    case v => error(s"not a function: ${v.str}")
  )
```

```scala
  case App(f, a) => interpCPS(f, env, fv => fv match
    case CloV(p, b, fenv) =>
      interpCPS(a, env, av => k(interp(b, fenv + (p -> av))))
    case v => error(s"not a function: ${v.str}")
  )
```

마지막으로 계산하는 부분은 `interp(b, fenv + (p -> av))`이고, 그 컨티뉴에이션은 `x => k(x)`, 곧 `k` 자신입니다.

```scala
  case App(f, a) => interpCPS(f, env, fv => fv match
    case CloV(p, b, fenv) =>
      interpCPS(a, env, av => interpCPS(b, fenv + (p -> av), {
        // cont. of `interp(b, fenv + (p -> av))`
        k
      }))
    case v => error(s"not a function: ${v.str}")
  )
```

완성된 함수 적용 경우는 다음과 같습니다.

```scala
  case App(f, a) => interpCPS(f, env, fv => fv match
    case CloV(p, b, fenv) =>
      interpCPS(a, env, av => interpCPS(b, fenv + (p -> av), k))
    case v => error(s"not a function: ${v.str}")
  )
```

함수 본문을 계산할 때 원래의 컨티뉴에이션 `k`를 **그대로** 넘긴다는 점이 흥미롭습니다. 함수 본문의 결과가 곧 함수 적용 전체의 결과이므로, 본문을 다 계산한 뒤에 할 일은 함수 적용 뒤에 할 일과 정확히 같습니다. 이것이 꼬리 호출의 본질입니다.

전체 인터프리터를 모으면 다음과 같습니다. 프로그램 전체를 계산할 때는 처음 컨티뉴에이션으로 항등 함수를 넘깁니다.

```scala
type Cont = Value => Value
def interpCPS(expr: Expr, env: Env, k: Cont): Value = expr match
  case Num(n)    => k(NumV(n))
  case Add(l, r) =>
    interpCPS(l, env, {
      lv => interpCPS(r, env, {
        rv => k(numAdd(lv, rv))
      })
    })
  case Mul(l, r) =>
    interpCPS(l, env, {
      lv => interpCPS(r, env, {
        rv => k(numMul(lv, rv))
      })
    })
  case Id(x)     => k(lookupId(x, env))
  case Fun(p, b) => k(CloV(p, b, env))
  case App(f, a) => interpCPS(f, env, fv => fv match
    case CloV(p, b, fenv) =>
      interpCPS(a, env, av => interpCPS(b, fenv + (p -> av), k))
    case v => error(s"not a function: ${v.str}")
  )

// (x => 1 + x)(2)
interpCPS(App(Fun("x", Add(Num(1), Id("x"))), Num(2)), Map(), v => v) // NumV(3)
```

여기서 `lookupId(x, env)`는 `env.getOrElse(x, error(s"free identifier: $x"))`를 함수로 묶은 것입니다.

## 큰 걸음 의미와 작은 걸음 의미

앞에서 인터프리터에 컨티뉴에이션을 드러냈습니다. 이제 \\(\textsf{FAE}\\)의 **의미**에도 컨티뉴에이션을 드러내고 싶습니다. 앞 절의 인터프리터에서 쓴 정의들을 정리하면 다음과 같습니다.

```scala
enum Value:
  case NumV(number: BigInt)
  case CloV(param: String, body: Expr, env: Env)
type Env = Map[String, Value]
type Cont = Value => Value

def interpCPS(expr: Expr, env: Env, k: Cont): Value = ...
```

\\[
\begin{array}{lrcll}
\text{Values} & \mathbb{V} \ni v & ::= & n & (\texttt{NumV}) \\\\
& & \mid & \langle \lambda x.e, \sigma \rangle & (\texttt{CloV}) \\\\
\text{Environments} & \sigma & \in & \mathbb{X} \xrightarrow{\text{fin}} \mathbb{V} & (\texttt{Env}) \\\\
\text{Continuations} & & = & \texttt{???} &
\end{array}
\\]

값과 환경은 이미 의미에서 정의했습니다. 그렇다면 컨티뉴에이션은 의미에서 어떻게 정의해야 할까요?

지금까지 우리가 정의한 의미는 모두 **큰 걸음 의미**(big-step operational semantics), 곧 자연 의미(natural semantics)였습니다. 큰 걸음 의미의 유도는 **나무** 구조이고, 하나의 유도가 식 하나의 **계산 전체**를 설명합니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\varnothing \vdash 5 \Rightarrow 5$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\varnothing \vdash 1 \Rightarrow 1$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\varnothing \vdash 2 \Rightarrow 2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\varnothing \vdash 1 \texttt{ + } 2 \Rightarrow 3$}
\LeftLabel{$\texttt{Mul}$}
\BinaryInfC{$\varnothing \vdash 5 \texttt{ \* } (1 \texttt{ + } 2) \Rightarrow 15$}
\end{prooftree}
\\]

반면 **작은 걸음 의미**의 유도는 **일렬**로 늘어서 있고, 계산의 **각 걸음**을 하나씩 설명합니다.

\\[
5 \texttt{ \* } (1 \texttt{ + } 2) \quad\to\quad 5 \texttt{ \* } 3 \quad\to\quad 15
\\]

큰 걸음 의미에서 컨티뉴에이션을 표현하는 것도 가능은 하지만 간단하지 않습니다. 나무 모양의 유도에서 "지금 이 지점 다음에 할 일"은 나무의 위쪽 어딘가에 흩어져 있기 때문입니다. 그래서 컨티뉴에이션을 표현하기 위해 \\(\textsf{FAE}\\)의 **작은 걸음 의미**를 정의하겠습니다.

## FAE의 작은 걸음 의미

`5 * (1 + 2)`를 계산할 때 **각 걸음**에서 무슨 일이 일어나는지를, **컨티뉴에이션**과 **값 스택** 두 개의 스택으로 설명해 봅시다. 컨티뉴에이션 스택에는 "앞으로 할 일"이 위에서부터 차례로 쌓여 있고, 값 스택에는 "지금까지 계산한 중간 결과"가 쌓입니다. 아래에서 각 스택은 왼쪽이 맨 위이고, \\(\square\\)는 빈 컨티뉴에이션, \\(\blacksquare\\)는 빈 값 스택입니다.

\\[
\begin{array}{cll}
& \text{Continuation} & \text{Value Stack} \\\\
\hline
1 & (\varnothing \vdash 5 \texttt{ \* } (1 \texttt{ + } 2)) :: \square & \blacksquare \\\\
2 & (\varnothing \vdash 5) :: (\varnothing \vdash 1 \texttt{ + } 2) :: (\texttt{\*}) :: \square & \blacksquare \\\\
3 & (\varnothing \vdash 1 \texttt{ + } 2) :: (\texttt{\*}) :: \square & 5 :: \blacksquare \\\\
4 & (\varnothing \vdash 1) :: (\varnothing \vdash 2) :: (\texttt{+}) :: (\texttt{\*}) :: \square & 5 :: \blacksquare \\\\
5 & (\varnothing \vdash 2) :: (\texttt{+}) :: (\texttt{\*}) :: \square & 1 :: 5 :: \blacksquare \\\\
6 & (\texttt{+}) :: (\texttt{\*}) :: \square & 2 :: 1 :: 5 :: \blacksquare \\\\
7 & (\texttt{\*}) :: \square & 3 :: 5 :: \blacksquare \\\\
8 & \square & 15 :: \blacksquare
\end{array}
\\]

같은 과정을 두 스택의 그림으로 그리면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 640 330" width="100%" style="max-width: 620px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="5 * (1 + 2)를 계산하는 여덟 걸음 동안 컨티뉴에이션 스택과 값 스택의 모습. 각 스택은 위쪽이 맨 위이다" font-family="sans-serif" fill="currentColor">
<text x="80" y="18" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">1</text>
<rect x="14" y="108" width="92" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="60.0" y="124.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">5 * (1 + 2)</text>
<path d="M10,132 L110,132" fill="none" stroke="currentColor" stroke-width="2.2"/>
<path d="M116,132 L160,132" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="60" y="150" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">κ</text>
<text x="138" y="150" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">s</text>
<text x="240" y="18" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">2</text>
<rect x="174" y="60" width="92" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="220.0" y="76.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">5</text>
<rect x="174" y="84" width="92" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="220.0" y="100.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">1 + 2</text>
<rect x="174" y="108" width="92" height="24" fill="#2a408e"/>
<text x="220.0" y="124.5" text-anchor="middle" fill="#fff" font-size="12" font-family="ui-monospace, Menlo, monospace">(*)</text>
<path d="M170,132 L270,132" fill="none" stroke="currentColor" stroke-width="2.2"/>
<path d="M276,132 L320,132" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="220" y="150" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">κ</text>
<text x="298" y="150" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">s</text>
<text x="400" y="18" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">3</text>
<rect x="334" y="84" width="92" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="380.0" y="100.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">1 + 2</text>
<rect x="334" y="108" width="92" height="24" fill="#2a408e"/>
<text x="380.0" y="124.5" text-anchor="middle" fill="#fff" font-size="12" font-family="ui-monospace, Menlo, monospace">(*)</text>
<path d="M330,132 L430,132" fill="none" stroke="currentColor" stroke-width="2.2"/>
<rect x="440" y="108" width="36" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="458.0" y="124.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">5</text>
<path d="M436,132 L480,132" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="380" y="150" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">κ</text>
<text x="458" y="150" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">s</text>
<text x="560" y="18" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">4</text>
<rect x="494" y="36" width="92" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="540.0" y="52.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">1</text>
<rect x="494" y="60" width="92" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="540.0" y="76.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">2</text>
<rect x="494" y="84" width="92" height="24" fill="#2a408e"/>
<text x="540.0" y="100.5" text-anchor="middle" fill="#fff" font-size="12" font-family="ui-monospace, Menlo, monospace">(+)</text>
<rect x="494" y="108" width="92" height="24" fill="#2a408e"/>
<text x="540.0" y="124.5" text-anchor="middle" fill="#fff" font-size="12" font-family="ui-monospace, Menlo, monospace">(*)</text>
<path d="M490,132 L590,132" fill="none" stroke="currentColor" stroke-width="2.2"/>
<rect x="600" y="108" width="36" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="618.0" y="124.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">5</text>
<path d="M596,132 L640,132" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="540" y="150" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">κ</text>
<text x="618" y="150" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">s</text>
<text x="80" y="183" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">5</text>
<rect x="14" y="225" width="92" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="60.0" y="241.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">2</text>
<rect x="14" y="249" width="92" height="24" fill="#2a408e"/>
<text x="60.0" y="265.5" text-anchor="middle" fill="#fff" font-size="12" font-family="ui-monospace, Menlo, monospace">(+)</text>
<rect x="14" y="273" width="92" height="24" fill="#2a408e"/>
<text x="60.0" y="289.5" text-anchor="middle" fill="#fff" font-size="12" font-family="ui-monospace, Menlo, monospace">(*)</text>
<path d="M10,297 L110,297" fill="none" stroke="currentColor" stroke-width="2.2"/>
<rect x="120" y="249" width="36" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="138.0" y="265.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">1</text>
<rect x="120" y="273" width="36" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="138.0" y="289.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">5</text>
<path d="M116,297 L160,297" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="60" y="315" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">κ</text>
<text x="138" y="315" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">s</text>
<text x="240" y="183" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">6</text>
<rect x="174" y="249" width="92" height="24" fill="#2a408e"/>
<text x="220.0" y="265.5" text-anchor="middle" fill="#fff" font-size="12" font-family="ui-monospace, Menlo, monospace">(+)</text>
<rect x="174" y="273" width="92" height="24" fill="#2a408e"/>
<text x="220.0" y="289.5" text-anchor="middle" fill="#fff" font-size="12" font-family="ui-monospace, Menlo, monospace">(*)</text>
<path d="M170,297 L270,297" fill="none" stroke="currentColor" stroke-width="2.2"/>
<rect x="280" y="225" width="36" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="298.0" y="241.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">2</text>
<rect x="280" y="249" width="36" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="298.0" y="265.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">1</text>
<rect x="280" y="273" width="36" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="298.0" y="289.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">5</text>
<path d="M276,297 L320,297" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="220" y="315" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">κ</text>
<text x="298" y="315" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">s</text>
<text x="400" y="183" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">7</text>
<rect x="334" y="273" width="92" height="24" fill="#2a408e"/>
<text x="380.0" y="289.5" text-anchor="middle" fill="#fff" font-size="12" font-family="ui-monospace, Menlo, monospace">(*)</text>
<path d="M330,297 L430,297" fill="none" stroke="currentColor" stroke-width="2.2"/>
<rect x="440" y="249" width="36" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="458.0" y="265.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">3</text>
<rect x="440" y="273" width="36" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="458.0" y="289.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">5</text>
<path d="M436,297 L480,297" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="380" y="315" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">κ</text>
<text x="458" y="315" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">s</text>
<text x="560" y="183" text-anchor="middle" fill="currentColor" font-size="14" font-weight="bold">8</text>
<path d="M490,297 L590,297" fill="none" stroke="currentColor" stroke-width="2.2"/>
<rect x="600" y="273" width="36" height="24" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="618.0" y="289.5" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">15</text>
<path d="M596,297 L640,297" fill="none" stroke="currentColor" stroke-width="2.2"/>
<text x="540" y="315" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">κ</text>
<text x="618" y="315" text-anchor="middle" fill="currentColor" font-size="13" font-style="italic" opacity="0.8">s</text>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 각 걸음의 컨티뉴에이션 \( \kappa \)와 값 스택 \( s \) (위쪽이 맨 위). \( (\varnothing \vdash e) \)는 \( e \)로 줄여 적었고, 색칠한 칸은 연산 \( (\texttt{+}) \), \( (\texttt{*}) \)입니다.</p>

한 걸음씩 읽어 봅시다.

1. 처음에는 "빈 환경에서 `5 * (1 + 2)`를 계산하라"는 일 하나만 있습니다.
2. 곱셈을 계산하려면 왼쪽 피연산자를 계산하고, 오른쪽 피연산자를 계산하고, 둘을 곱해야 합니다. 이 세 가지 일을 컨티뉴에이션에 차례로 쌓습니다. \\((\texttt{\*})\\)는 "값 스택 위의 두 값을 꺼내 곱하라"는 뜻입니다.
3. `5`는 숫자이므로 바로 값 스택에 올립니다.
4. 덧셈도 곱셈처럼 세 가지 일로 쪼갭니다.
5. `1`을 값 스택에 올립니다.
6. `2`를 값 스택에 올립니다.
7. \\((\texttt{+})\\)를 만났으므로 값 스택에서 `2`와 `1`을 꺼내 더한 `3`을 올립니다.
8. \\((\texttt{\*})\\)를 만났으므로 `3`과 `5`를 꺼내 곱한 `15`를 올립니다. 할 일이 더 없으므로 끝입니다.

값 스택 맨 위에 최종 결과 `15`가 남았습니다. 각 시점의 컨티뉴에이션 스택이 바로 그 시점의 **남은 계산**이라는 점에 주목하세요.

이제 이것을 정식으로 정의합니다. 두 의미의 판단(judgment) 꼴을 비교해 보세요.

- 큰 걸음 의미: \\(\boxed{\sigma \vdash e \Rightarrow v}\\)
- 작은 걸음 의미: \\(\boxed{\langle \kappa \mathrel{||} s \rangle \to \langle \kappa \mathrel{||} s \rangle}\\)

여기서 \\(\to\ \subseteq (\mathbb{K} \times \mathbb{S}) \times (\mathbb{K} \times \mathbb{S})\\)는 **상태**(state) 사이의 <a id="g-small-step-relation"></a>**작은 걸음 관계**(small-step relation)이고, 상태 \\(\langle \kappa \mathrel{||} s \rangle\\)는 컨티뉴에이션 \\(\kappa\\)와 값 스택 \\(s\\)의 쌍입니다.

\\[
\begin{array}{lrcl}
\text{Continuations} & \mathbb{K} \ni \kappa & ::= & \square \\\\
& & \mid & (\sigma \vdash e) :: \kappa \\\\
& & \mid & (\texttt{+}) :: \kappa \\\\
& & \mid & (\texttt{\*}) :: \kappa \\\\
& & \mid & (\texttt{@}) :: \kappa \\\\
\text{Value Stacks} & \mathbb{S} \ni s & ::= & \blacksquare \mid v :: s
\end{array}
\\]

컨티뉴에이션은 할 일의 목록입니다. \\(\square\\)는 더 할 일이 없음을, \\((\sigma \vdash e) :: \kappa\\)는 "환경 \\(\sigma\\)에서 \\(e\\)를 계산한 뒤 \\(\kappa\\)를 하라"를, \\((\texttt{+}) :: \kappa\\), \\((\texttt{\*}) :: \kappa\\)는 "값 스택 위의 두 수를 더하거나 곱한 뒤 \\(\kappa\\)를 하라"를, \\((\texttt{@}) :: \kappa\\)는 "값 스택 위의 함수를 인자에 적용한 뒤 \\(\kappa\\)를 하라"를 뜻합니다.

이제 각 규칙을 `interpCPS`의 각 경우와 나란히 놓고 정의해 봅시다.

### 숫자

```scala
def interpCPS(expr: Expr, env: Env, k: Cont): Value = expr match
  ...
  case Num(n) => k(NumV(n))
```

\\[
\begin{array}{llcl}
\texttt{Num} & \langle (\sigma \vdash n) :: \kappa \mathrel{||} s \rangle & \to & \langle \kappa \mathrel{||} n :: s \rangle
\end{array}
\\]

숫자를 계산하는 일이 맨 위에 있으면, 그 숫자를 값 스택에 올리고 남은 일 \\(\kappa\\)로 넘어갑니다. `k(NumV(n))`이 "결과 `n`을 들고 `k`를 하라"였던 것과 같습니다.

### 덧셈

```scala
def interpCPS(expr: Expr, env: Env, k: Cont): Value = expr match
  ...
  case Add(l, r) =>
    interpCPS(l, env, {
      lv => interpCPS(r, env, {
        rv => k(numAdd(lv, rv))
      })
    })
```

\\[
\begin{array}{llcl}
\texttt{Add}\_1 & \langle (\sigma \vdash e_1 \texttt{ + } e_2) :: \kappa \mathrel{||} s \rangle & \to & \langle (\sigma \vdash e_1) :: (\sigma \vdash e_2) :: (\texttt{+}) :: \kappa \mathrel{||} s \rangle \\\\
\\\\
\texttt{Add}\_2 & \langle (\texttt{+}) :: \kappa \mathrel{||} n_2 :: n_1 :: s \rangle & \to & \langle \kappa \mathrel{||} (n_1 + n_2) :: s \rangle
\end{array}
\\]

덧셈은 규칙이 두 개로 나뉩니다. \\(\texttt{Add}\_1\\)은 덧셈을 "왼쪽 계산, 오른쪽 계산, 더하기"의 세 일로 쪼개고, \\(\texttt{Add}\_2\\)는 두 피연산자의 값이 모두 준비되었을 때 실제로 더합니다. 값 스택에서 **나중에 계산한 오른쪽 값 \\(n_2\\)가 위에** 있다는 점에 주의하세요. 결과는 \\(n_2 + n_1\\)이 아니라 \\(n_1 + n_2\\)입니다. 덧셈에서는 차이가 없지만, 뺄셈이었다면 중요합니다.

### 곱셈

```scala
def interpCPS(expr: Expr, env: Env, k: Cont): Value = expr match
  ...
  case Mul(l, r) =>
    interpCPS(l, env, {
      lv => interpCPS(r, env, {
        rv => k(numMul(lv, rv))
      })
    })
```

\\[
\begin{array}{llcl}
\texttt{Mul}\_1 & \langle (\sigma \vdash e_1 \texttt{ \* } e_2) :: \kappa \mathrel{||} s \rangle & \to & \langle (\sigma \vdash e_1) :: (\sigma \vdash e_2) :: (\texttt{\*}) :: \kappa \mathrel{||} s \rangle \\\\
\\\\
\texttt{Mul}\_2 & \langle (\texttt{\*}) :: \kappa \mathrel{||} n_2 :: n_1 :: s \rangle & \to & \langle \kappa \mathrel{||} (n_1 \times n_2) :: s \rangle
\end{array}
\\]

### 식별자 참조

```scala
def interpCPS(expr: Expr, env: Env, k: Cont): Value = expr match
  ...
  case Id(x) => k(lookupId(x, env))
```

\\[
\begin{array}{llcl}
\texttt{Id} & \langle (\sigma \vdash x) :: \kappa \mathrel{||} s \rangle & \to & \langle \kappa \mathrel{||} \sigma(x) :: s \rangle
\end{array}
\\]

### 함수 정의

```scala
def interpCPS(expr: Expr, env: Env, k: Cont): Value = expr match
  ...
  case Fun(p, b) => k(CloV(p, b, env))
```

\\[
\begin{array}{llcl}
\texttt{Fun} & \langle (\sigma \vdash \lambda x.e) :: \kappa \mathrel{||} s \rangle & \to & \langle \kappa \mathrel{||} \langle \lambda x.e, \sigma \rangle :: s \rangle
\end{array}
\\]

### 함수 적용

```scala
def interpCPS(expr: Expr, env: Env, k: Cont): Value = expr match
  ...
  case App(f, e) => interpCPS(f, env, v => v match
    case CloV(p, b, fenv) =>
      interpCPS(e, env, v => {
        interpCPS(b, fenv + (p -> v), k)
      })
    case v => error(s"not a function: ${v.str}")
  )
```

\\[
\begin{array}{llcl}
\texttt{App}\_1 & \langle (\sigma \vdash e_1(e_2)) :: \kappa \mathrel{||} s \rangle & \to & \langle (\sigma \vdash e_1) :: (\sigma \vdash e_2) :: (\texttt{@}) :: \kappa \mathrel{||} s \rangle \\\\
\\\\
\texttt{App}\_2 & \langle (\texttt{@}) :: \kappa \mathrel{||} v_2 :: \langle \lambda x.e, \sigma \rangle :: s \rangle & \to & \langle (\sigma[x \mapsto v_2] \vdash e) :: \kappa \mathrel{||} s \rangle
\end{array}
\\]

\\(\texttt{App}\_2\\)에서 값 스택 위에는 인자 값 \\(v_2\\)가, 그 아래에는 클로저가 있습니다. 클로저의 환경을 매개변수로 확장한 환경에서 본문 \\(e\\)를 계산하는 일을 컨티뉴에이션 맨 위에 올리고, 그 뒤에는 원래 남아 있던 일 \\(\kappa\\)를 그대로 둡니다. `interpCPS(b, fenv + (p -> v), k)`에서 `k`를 그대로 넘긴 것과 정확히 대응합니다. 값 스택 맨 위의 두 값이 이런 꼴이 아니면(예를 들어 함수 자리에 숫자가 있으면) 적용할 규칙이 없으므로 계산이 멈춥니다. 이것이 "not a function" 오류에 해당합니다.

### 반사 전이 폐포

\\(\to\\)는 한 걸음만 설명합니다. 식 하나의 **계산 전체**를 설명하려면 \\(\to\\)를 **0번 이상** 거듭 밟아야 합니다. 이를 위해 \\(\to\\)의 **반사 전이 폐포**(reflexive transitive closure) \\(\to^\ast\\)를 정의합니다.

\\[
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$\langle \kappa \mathrel{||} s \rangle \to^\ast \langle \kappa \mathrel{||} s \rangle$}
\end{prooftree}
\qquad\qquad
\begin{prooftree}
\AxiomC{$\langle \kappa \mathrel{||} s \rangle \to^\ast \langle \kappa' \mathrel{||} s' \rangle$}
\AxiomC{$\langle \kappa' \mathrel{||} s' \rangle \to \langle \kappa'' \mathrel{||} s'' \rangle$}
\BinaryInfC{$\langle \kappa \mathrel{||} s \rangle \to^\ast \langle \kappa'' \mathrel{||} s'' \rangle$}
\end{prooftree}
\\]

첫 번째 규칙은 0걸음(반사성), 두 번째 규칙은 "몇 걸음 간 뒤에 한 걸음 더"(전이성)를 뜻합니다. 그러면 식 \\(e\\)를 계산한 결과가 값 \\(v\\)라는 것은 다음과 같이 쓸 수 있습니다.

\\[
\langle (\varnothing \vdash e) :: \square \mathrel{||} \blacksquare \rangle \to^\ast \langle \square \mathrel{||} v :: \blacksquare \rangle
\\]

빈 환경에서 \\(e\\)를 계산하는 일 하나로 시작해서, 할 일이 모두 사라지고 값 스택에 값 하나만 남으면 그 값이 결과입니다.

### 예제

식 \\((\lambda x.(1 \texttt{ + } x))(2)\\)를 계산해 봅시다. 각 줄 오른쪽에 그 걸음에 쓴 규칙을 적었습니다.

\\[
\begin{array}{rll}
& \langle (\varnothing \vdash (\lambda x.(1 \texttt{ + } x))(2)) :: \square \mathrel{||} \blacksquare \rangle & \\\\
\to & \langle (\varnothing \vdash \lambda x.(1 \texttt{ + } x)) :: (\varnothing \vdash 2) :: (\texttt{@}) :: \square \mathrel{||} \blacksquare \rangle & (\texttt{App}\_1) \\\\
\to & \langle (\varnothing \vdash 2) :: (\texttt{@}) :: \square \mathrel{||} \langle \lambda x.(1 \texttt{ + } x), \varnothing \rangle :: \blacksquare \rangle & (\texttt{Fun}) \\\\
\to & \langle (\texttt{@}) :: \square \mathrel{||} 2 :: \langle \lambda x.(1 \texttt{ + } x), \varnothing \rangle :: \blacksquare \rangle & (\texttt{Num}) \\\\
\to & \langle ([x \mapsto 2] \vdash 1 \texttt{ + } x) :: \square \mathrel{||} \blacksquare \rangle & (\texttt{App}\_2) \\\\
\to & \langle ([x \mapsto 2] \vdash 1) :: ([x \mapsto 2] \vdash x) :: (\texttt{+}) :: \square \mathrel{||} \blacksquare \rangle & (\texttt{Add}\_1) \\\\
\to & \langle ([x \mapsto 2] \vdash x) :: (\texttt{+}) :: \square \mathrel{||} 1 :: \blacksquare \rangle & (\texttt{Num}) \\\\
\to & \langle (\texttt{+}) :: \square \mathrel{||} 2 :: 1 :: \blacksquare \rangle & (\texttt{Id}) \\\\
\to & \langle \square \mathrel{||} 3 :: \blacksquare \rangle & (\texttt{Add}\_2)
\end{array}
\\]

따라서 \\(\langle (\varnothing \vdash (\lambda x.(1 \texttt{ + } x))(2)) :: \square \mathrel{||} \blacksquare \rangle \to^\ast \langle \square \mathrel{||} 3 :: \blacksquare \rangle\\)이고, \\((\lambda x.(1 \texttt{ + } x))(2)\\)의 계산 결과는 \\(3\\)입니다.

> **생각해 보기**: \\(\texttt{App}\_2\\)를 적용한 직후 값 스택이 비어 있습니다. 함수 본문을 계산하기 시작할 때 값 스택에 무언가 남아 있는 경우도 있을까요? 있다면 그 값들은 언제 쓰일까요?

## 의미 동등성

이제 \\(\textsf{FAE}\\)에는 의미가 **두 개** 있습니다. 같은 예를 두 의미로 계산해 봅시다. 큰 걸음 의미로는

\\[
\begin{prooftree}
\AxiomC{$\varnothing \vdash \lambda x.(1 \texttt{ + } x) \Rightarrow \langle \lambda x.(1 \texttt{ + } x), \varnothing \rangle$}
\AxiomC{$\varnothing \vdash 2 \Rightarrow 2$}
\AxiomC{$[x \mapsto 2] \vdash 1 \texttt{ + } x \Rightarrow 3$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\varnothing \vdash (\lambda x.(1 \texttt{ + } x))(2) \Rightarrow 3$}
\end{prooftree}
\\]

이고, 작은 걸음 의미로는

\\[
\langle (\varnothing \vdash (\lambda x.(1 \texttt{ + } x))(2)) :: \square \mathrel{||} \blacksquare \rangle \to^\ast \langle \square \mathrel{||} 3 :: \blacksquare \rangle
\\]

입니다. 두 의미 모두 이 식에 대해 **같은 결과** \\(3\\)을 냅니다. 그렇다면 질문이 생깁니다. **모든** 식에 대해 두 의미가 **언제나** 같은 결과를 낼까요?

큰 걸음 의미와 작은 걸음 의미가 **동등하다**(equivalent)는 것은, 모든 \\(e \in \mathbb{E}\\)와 \\(v \in \mathbb{V}\\)에 대해 다음이 성립한다는 뜻입니다.

\\[
\varnothing \vdash e \Rightarrow v
\qquad\iff\qquad
\langle (\varnothing \vdash e) :: \square \mathrel{||} \blacksquare \rangle \to^\ast \langle \square \mathrel{||} v :: \blacksquare \rangle
\\]

이것은 다음의 **더 일반적인** 명제의 특수한 경우입니다. 모든 \\(\sigma \in \mathbb{X} \xrightarrow{\text{fin}} \mathbb{V}\\), \\(e \in \mathbb{E}\\), \\(v \in \mathbb{V}\\), \\(\kappa \in \mathbb{K}\\), \\(s \in \mathbb{S}\\)에 대해

\\[
\sigma \vdash e \Rightarrow v
\qquad\iff\qquad
\langle (\sigma \vdash e) :: \kappa \mathrel{||} s \rangle \to^\ast \langle \kappa \mathrel{||} v :: s \rangle
\\]

입니다. 오른쪽은 "\\(e\\)를 계산하는 일이 맨 위에 있으면, 아래에 어떤 일 \\(\kappa\\)가 남아 있든, 값 스택에 무엇이 쌓여 있든 상관없이, 몇 걸음 뒤에 \\(e\\)의 값 \\(v\\)가 값 스택 위에 올라가고 남은 일 \\(\kappa\\)로 넘어간다"는 뜻입니다. 이렇게 일반화하는 이유는 곧 보게 되듯 귀납 증명에서 \\(\kappa\\)와 \\(s\\)를 자유롭게 바꿔 써야 하기 때문입니다.

### 증명

한 방향(\\(\Rightarrow\\))을 증명해 봅시다.

> **정리**. \\(\sigma \vdash e \Rightarrow v\\)이면, 모든 \\(\kappa \in \mathbb{K}\\)와 \\(s \in \mathbb{S}\\)에 대해 \\(\langle (\sigma \vdash e) :: \kappa \mathrel{||} s \rangle \to^\ast \langle \kappa \mathrel{||} v :: s \rangle\\)이다.

**증명**은 \\(\sigma \vdash e \Rightarrow v\\)의 유도에 대한 <a id="g-induction"></a>**귀납법**(induction)으로 합니다. 큰 걸음 규칙마다 경우가 하나씩 있습니다.

**기본 경우**: `Num`, `Id`, `Fun`은 정확히 **한 걸음**에 끝납니다. 예를 들어 `Num`은

\\[
\langle (\sigma \vdash n) :: \kappa \mathrel{||} s \rangle \to \langle \kappa \mathrel{||} n :: s \rangle \quad (\texttt{Num})
\\]

이고, `Id`와 `Fun`도 같은 모양입니다.

**귀납 경우**: `Add`, `Mul`, `App`은 전제에 대해 <a id="g-induction-hypothesis"></a>**귀납 가정**(induction hypothesis, IH)을 씁니다.

**`Add` 경우.** 유도의 마지막 규칙이 다음과 같다고 합시다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow n_1$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma \vdash e_1 \texttt{ + } e_2 \Rightarrow n_1 + n_2$}
\end{prooftree}
\\]

그러면 다음과 같이 계산이 진행됩니다.

\\[
\begin{array}{rll}
& \langle (\sigma \vdash e_1 \texttt{ + } e_2) :: \kappa \mathrel{||} s \rangle & \\\\
\to & \langle (\sigma \vdash e_1) :: (\sigma \vdash e_2) :: (\texttt{+}) :: \kappa \mathrel{||} s \rangle & (\texttt{Add}\_1) \\\\
\to^\ast & \langle (\sigma \vdash e_2) :: (\texttt{+}) :: \kappa \mathrel{||} n_1 :: s \rangle & (\text{IH}) \\\\
\to^\ast & \langle (\texttt{+}) :: \kappa \mathrel{||} n_2 :: n_1 :: s \rangle & (\text{IH}) \\\\
\to & \langle \kappa \mathrel{||} (n_1 + n_2) :: s \rangle & (\texttt{Add}\_2)
\end{array}
\\]

여기서 일반화의 힘이 드러납니다.

- \\(e_1\\)에 대한 귀납 가정은 컨티뉴에이션 \\(\kappa\\)가 아니라 \\((\sigma \vdash e_2) :: (\texttt{+}) :: \kappa\\)로 씁니다.
- \\(e_2\\)에 대한 귀납 가정은 값 스택 \\(s\\)가 아니라 \\(n_1 :: s\\)로 씁니다.

귀납 가정이 "모든 \\(\kappa\\)와 \\(s\\)에 대해" 성립하므로 이렇게 쓸 수 있습니다. `Mul` 경우도 같습니다.

**`App` 경우.** 유도의 마지막 규칙이 다음과 같다고 합시다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_1 \Rightarrow \langle \lambda x.e, \sigma' \rangle$}
\AxiomC{$\sigma \vdash e_2 \Rightarrow v_2$}
\AxiomC{$\sigma'[x \mapsto v_2] \vdash e \Rightarrow v$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\sigma \vdash e_1(e_2) \Rightarrow v$}
\end{prooftree}
\\]

그러면

\\[
\begin{array}{rll}
& \langle (\sigma \vdash e_1(e_2)) :: \kappa \mathrel{||} s \rangle & \\\\
\to & \langle (\sigma \vdash e_1) :: (\sigma \vdash e_2) :: (\texttt{@}) :: \kappa \mathrel{||} s \rangle & (\texttt{App}\_1) \\\\
\to^\ast & \langle (\sigma \vdash e_2) :: (\texttt{@}) :: \kappa \mathrel{||} \langle \lambda x.e, \sigma' \rangle :: s \rangle & (\text{IH}) \\\\
\to^\ast & \langle (\texttt{@}) :: \kappa \mathrel{||} v_2 :: \langle \lambda x.e, \sigma' \rangle :: s \rangle & (\text{IH}) \\\\
\to & \langle (\sigma'[x \mapsto v_2] \vdash e) :: \kappa \mathrel{||} s \rangle & (\texttt{App}\_2) \\\\
\to^\ast & \langle \kappa \mathrel{||} v :: s \rangle & (\text{IH})
\end{array}
\\]

입니다. 세 전제 모두에 귀납 가정을 썼습니다. 이로써 (\\(\Rightarrow\\)) 방향의 증명이 끝납니다.

반대 방향(\\(\Leftarrow\\))도 성립하지만, 증명이 더 복잡하므로 이 책에서는 다루지 않습니다. (작은 걸음 계산 도중의 상태는 컨티뉴에이션과 값 스택이 뒤섞여 있어서, 그것을 큰 걸음 유도의 어느 부분과 대응시킬지 정하는 일이 까다롭습니다.)

> **생각해 보기**: `Mul` 경우의 증명을 직접 써 보세요. `Add` 경우와 어디가 다른가요?

## 컨티뉴에이션의 1차 표현

CPS로 작성한 \\(\textsf{FAE}\\) 인터프리터에서 우리는 컨티뉴에이션을 Scala의 **일급 함수**(first-class function)로 정의했습니다.

```scala
enum Value:
  case NumV(number: BigInt)
  case CloV(param: String, body: Expr, env: Env)
type Env = Map[String, Value]
type Cont = Value => Value

def interpCPS(expr: Expr, env: Env, k: Cont): Value = ...
```

그런데 일급 함수가 없는 언어, 예를 들어 C로 \\(\textsf{FAE}\\) 인터프리터를 CPS로 구현하려면 컨티뉴에이션을 어떻게 정의해야 할까요? 그런 언어에서는 컨티뉴에이션을 대수적 데이터 타입(algebraic data type) 같은 **자료 구조**로 정의하면 됩니다. 이것을 **컨티뉴에이션의 1차 표현**이라고 부릅니다. 사실 우리는 방금 작은 걸음 의미에서 그런 자료 구조를 이미 정의했습니다.

```scala
enum Cont:
  case EmptyK
  case EvalK(env: Env, expr: Expr, k: Cont)
  case AddK(k: Cont)
  case MulK(k: Cont)
  case AppK(k: Cont)

type Stack = List[Value]
```

\\[
\begin{array}{lrcll}
\text{Continuations} & \mathbb{K} \ni \kappa & ::= & \square & (\texttt{EmptyK}) \\\\
& & \mid & (\sigma \vdash e) :: \kappa & (\texttt{EvalK}) \\\\
& & \mid & (\texttt{+}) :: \kappa & (\texttt{AddK}) \\\\
& & \mid & (\texttt{\*}) :: \kappa & (\texttt{MulK}) \\\\
& & \mid & (\texttt{@}) :: \kappa & (\texttt{AppK}) \\\\
\text{Value Stacks} & \mathbb{S} \ni s & ::= & \blacksquare \mid v :: s & (\texttt{List[Value]})
\end{array}
\\]

이제 상태 \\(\langle \kappa \mathrel{||} s \rangle\\)를 받아, 앞에서 정의한 작은 걸음 관계 \\(\to\\)에 따라 다음 상태 \\(\langle \kappa' \mathrel{||} s' \rangle\\)로 한 걸음 나아가는 `step` 함수를 정의합니다.

```scala
def step(k: Cont, s: Stack): (Cont, Stack) = ???
```

그리고 `evalK` 함수는 빈 컨티뉴에이션 \\(\square\\)에 이를 때까지 상태를 **반복해서** 한 걸음씩 나아가게 한 뒤, 값 스택에 남은 하나의 값을 돌려줍니다. 이것이 \\(\langle (\varnothing \vdash e) :: \square \mathrel{||} \blacksquare \rangle \to^\ast \langle \square \mathrel{||} v :: \blacksquare \rangle\\)을 구현한 것입니다.

```scala
def evalK(str: String): String =
  import Cont.*
  def aux(k: Cont, s: Stack): Value = step(k, s) match
    case (EmptyK, List(v)) => v
    case (k, s)            => aux(k, s)
  aux(EvalK(Map.empty, Expr(str), EmptyK), List.empty).str
```

`step`의 덧셈 부분은 규칙 \\(\texttt{Add}\_1\\), \\(\texttt{Add}\_2\\)를 그대로 옮긴 것입니다.

```scala
def step(k: Cont, s: Stack): (Cont, Stack) = (k, s) match
  case (EvalK(env, expr, k), s) => expr match
    ...
    case Add(l, r) => (EvalK(env, l, EvalK(env, r, AddK(k))), s)
  ...
  case (AddK(k), r :: l :: s) => (k, numAdd(l, r) :: s)
  ...
```

\\[
\begin{array}{llcl}
\texttt{Add}\_1 & \langle (\sigma \vdash e_1 \texttt{ + } e_2) :: \kappa \mathrel{||} s \rangle & \to & \langle (\sigma \vdash e_1) :: (\sigma \vdash e_2) :: (\texttt{+}) :: \kappa \mathrel{||} s \rangle \\\\
\\\\
\texttt{Add}\_2 & \langle (\texttt{+}) :: \kappa \mathrel{||} n_2 :: n_1 :: s \rangle & \to & \langle \kappa \mathrel{||} (n_1 + n_2) :: s \rangle
\end{array}
\\]

값 스택 패턴 `r :: l :: s`에서 위에 있는 것이 오른쪽 값 `r`이라는 점, 그래서 `numAdd(l, r)` 순서로 부른다는 점에 주의하세요. 나머지 경우도 같은 방법으로 정의할 수 있습니다. 전체 `step` 함수를 완성하는 것은 이 장의 연습 문제로 남겨 둡니다.

### 왜 1차 표현일까

세 인터프리터에서 **남은 계산**이 각각 어디에 저장되는지 비교해 봅시다.

| 인터프리터 | 남은 계산 | Scala 호출 스택 |
|---|---|---|
| `interp` | 암묵적 (Scala 호출 스택 안) | 자람 |
| `interpCPS` | Scala 함수 (`Value => Value`) | 자람 |
| `evalK` | 데이터 (\\(\kappa\\)와 \\(s\\)) | 일정 |

`interpCPS`도 Scala 호출 스택이 자라는 이유는, Scala(JVM)가 일반적인 꼬리 호출 최적화를 해 주지 않기 때문입니다. 컨티뉴에이션 함수 안에서 `interpCPS`를 부르고, 그 안에서 다시 컨티뉴에이션을 부르는 식으로 호출이 계속 쌓입니다.

1차 표현에는 두 가지 큰 장점이 있습니다.

첫째, `evalK` 안의 `aux`는 <a id="g-tail-recursion"></a>**꼬리 재귀**(tail recursion) 함수라서 Scala 컴파일러가 <a id="g-loop"></a>**반복문**으로 바꿔 줍니다. 그래서 C에서도 `struct`와 `while` 반복문만으로 같은 인터프리터를 구현할 수 있고, 깊게 중첩된 식을 계산해도 Scala 호출 스택이 넘치지 않습니다. 실제로 `0 + 1 + 1 + ... + 1`처럼 덧셈이 10만 번 중첩된 식을 `interpCPS`로 계산하면 `StackOverflowError`가 나지만, `evalK`로는 문제없이 `100000`을 얻습니다.

둘째, 상태 \\(\langle \kappa \mathrel{||} s \rangle\\)는 그냥 **데이터**입니다. 그래서 언제든 출력하고, 저장하고, 나중에 **복원**할 수 있습니다. 계산을 잠시 멈췄다가 다시 이어 가는 것이 가능하다는 뜻입니다. 이 성질은 다음 장에서 컨티뉴에이션을 **값**으로 붙잡아 두는 일급 컨티뉴에이션의 바탕이 됩니다.

## 정리

- **컨티뉴에이션**은 **남은 계산**입니다. 지금 계산하는 부분 \\(e'\\)을 비우고 \\((\lambda x.(\ldots \ x \ \ldots))(e')\\)처럼 함수로 감싸면 컨티뉴에이션을 명시적으로 드러낼 수 있습니다.
- **컨티뉴에이션 전달 방식**(CPS)은 컨티뉴에이션을 매개변수로 넘기고, 결과를 돌려주는 대신 컨티뉴에이션을 호출합니다. CPS 프로그램에서는 모든 호출이 꼬리 위치에 있습니다.
- `interp`를 `interpCPS`로 바꾸는 방법: `k(interp(...))`에서 시작해, 지금 계산하는 부분의 컨티뉴에이션을 찾아 `interpCPS`에 넘기기를 반복합니다. 함수 본문은 원래의 `k`를 그대로 받습니다.
- 큰 걸음 의미의 유도는 나무, 작은 걸음 의미의 유도는 일렬입니다. 컨티뉴에이션을 드러내기 위해 상태 \\(\langle \kappa \mathrel{||} s \rangle\\)(컨티뉴에이션과 값 스택) 사이의 작은 걸음 관계 \\(\to\\)를 정의했습니다. 규칙은 `Num`, \\(\texttt{Add}\_1\\), \\(\texttt{Add}\_2\\), \\(\texttt{Mul}\_1\\), \\(\texttt{Mul}\_2\\), `Id`, `Fun`, \\(\texttt{App}\_1\\), \\(\texttt{App}\_2\\)입니다.
- 계산 전체는 반사 전이 폐포 \\(\to^\ast\\)로 나타냅니다: \\(\langle (\varnothing \vdash e) :: \square \mathrel{||} \blacksquare \rangle \to^\ast \langle \square \mathrel{||} v :: \blacksquare \rangle\\).
- 두 의미는 동등합니다. (\\(\Rightarrow\\)) 방향은 \\(\kappa\\)와 \\(s\\)를 일반화한 명제를 큰 걸음 유도에 대한 귀납법으로 증명합니다.
- 컨티뉴에이션을 자료 구조(`enum Cont`)로 나타낸 **1차 표현**을 쓰면, `step`과 꼬리 재귀 `aux`만으로 호출 스택을 쓰지 않는 인터프리터를 만들 수 있고, 상태를 데이터로 저장하고 복원할 수 있습니다.

## 연습 문제

1. 다음 Scala 함수를 CPS로 바꿔 쓰세요. 컨티뉴에이션 타입은 `Int => Int`로 합니다.
   ```scala
   def fib(n: Int): Int =
     if (n <= 1) n
     else fib(n - 1) + fib(n - 2)
   ```
2. \\((\lambda x.(x \texttt{ \* } x))(1 \texttt{ + } 2)\\)를 작은 걸음 의미로 끝까지 계산하고, 각 걸음에 쓴 규칙을 적으세요.
3. 의미 동등성 증명의 `Mul`, `Id`, `Fun` 경우를 직접 쓰세요.
4. \\(\textsf{FAE}\\)에 뺄셈 \\(e_1 \texttt{ - } e_2\\)를 추가할 때 필요한 작은 걸음 규칙을 쓰세요. 값 스택에서 두 값의 순서에 주의하세요.
5. 상태 \\(\langle (\texttt{@}) :: \square \mathrel{||} 2 :: 1 :: \blacksquare \rangle\\)에서는 어떤 규칙도 적용할 수 없습니다. 이 상태에 이르는 \\(\textsf{FAE}\\) 식을 하나 찾고, `step` 함수는 이 상태에서 어떻게 동작해야 할지 생각해 보세요.
6. 강의 연습 과제 **FAE-CPS**(`fae-cps`)의 `interpCPS` 함수와 `step` 함수를 직접 구현해 보세요.
