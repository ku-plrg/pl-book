# 2부 연습 문제 해답

## 타입 시스템

[타입 시스템](./type-systems.md) 장의 연습 문제 해답입니다.

<a id="ans-type-systems-6"></a>**6번.** (a) X, (b) O, (c) X, (d) X

"타입 검사를 통과한다"를 \\(\vdash P\\), "실행 중에 타입 오류가 없다"를 \\(\vDash P\\)라고 놓으면, 타입 시스템이 건전하다는 것은 \\(\vdash P \Rightarrow \vDash P\\)이고, 완전하다는 것은 \\(\vDash P \Rightarrow \vdash P\\)입니다.

- (a) "정상적으로 끝나는 프로그램"은 타입 오류 없이 끝나는 프로그램이므로, 이 문장은 "\\(\vDash P\\)인 어떤 프로그램들은 \\(\vdash P\\)이다"라는 **완전성 쪽** 진술입니다. 타입 검사를 통과한 프로그램이 타입 오류를 일으키지 않는다는 말은 전혀 없습니다. 예를 들어 모든 프로그램을 받아들이는 타입 검사기는 (a)를 만족하지만, `1 + (x => x)` 같은 프로그램도 받아들이므로 건전하지 않습니다. 따라서 거짓입니다.
- (b) 건전성의 정의(타입 안전성) 그대로입니다. 참입니다.
- (c) 타입 오류가 없는 프로그램을 모두 받아들인다는 것은 완전성입니다. 정적 분석인 타입 검사는 일반적으로 건전하지만 완전하지 않아서, 이 장의 Scala 예처럼 실행해 보면 안전한 프로그램을 거부(거짓 경보)할 수 있습니다. 거짓입니다.
- (d) 이 장에서 "식 \\(e\\)의 타입은 \\(\tau\\)이다"의 정의에는 계산이 끝나지 않는 경우와 타입 오류가 **아닌** 실행 중 오류를 내는 경우가 들어 있었습니다. 건전한 타입 시스템은 타입 오류가 없다는 것만 약속합니다. 예를 들어 Scala의 `42 / 0`은 타입 검사를 통과하지만 실행 중에 `ArithmeticException`을 내고, [재귀 함수의 타입](./typing-recursive-functions.md)의 `def f(n: Number): Number = f(n); f(1)`은 타입 검사를 통과하지만 끝나지 않습니다. 거짓입니다.

[← 문제로](./type-systems.md#ex-type-systems-6)

## 타입 있는 언어

[타입 있는 언어](./typed-languages.md) 장의 연습 문제 해답입니다.

<a id="ans-typed-languages-7"></a>**7번.** (a) `(x: Number) => x`, (b) 건전하지 않음. 반례는 다음 식입니다.

```tfae,run
/* TFAE */
val x = 42;
val f = (x: Number) => x;
val g = (x: Number => Number) => x;
g(f) + 1
```

(a) 원래 규칙으로는 \\([x : \texttt{num}] \vdash x : \texttt{num}\\)이므로 `(x: Number) => x`의 타입은 \\(\texttt{num} \to \texttt{num}\\)입니다. 바꾼 규칙으로는 본문 `x`를 빈 타입 환경 \\(\varnothing\\)에서 검사해야 하는데, \\(x \notin \text{Dom}(\varnothing)\\)이므로 \\(\tau\texttt{-Id}\\)를 쓸 수 없어 타입 검사를 통과하지 못합니다. 매개변수를 본문에서 쓰는 함수라면 무엇이든 답이 됩니다.

(b) 바꾼 규칙에서 본문의 `x`는 매개변수가 아니라 **바깥의** `x`의 타입을 찾습니다. 위 식을 바꾼 규칙으로 검사해 봅시다. 바깥 타입 환경은 \\(\Gamma = [x : \texttt{num}]\\)입니다.

1. `f`의 본문 `x`는 \\(\Gamma\\)에서 \\(\texttt{num}\\)이므로 `f`의 타입은 \\(\texttt{num} \to \texttt{num}\\)입니다. 여기까지는 우연히 맞습니다.
2. `g`의 본문 `x`도 \\(\Gamma\\)에서 \\(\texttt{num}\\)이므로, 매개변수 타입이 \\(\texttt{num} \to \texttt{num}\\)인데도 `g`의 타입은 \\((\texttt{num} \to \texttt{num}) \to \texttt{num}\\)이 됩니다.
3. `g(f)`는 인자 `f`의 타입이 매개변수 타입과 같으므로 \\(\tau\texttt{-App}\\)으로 \\(\texttt{num}\\)이고, `g(f) + 1`도 \\(\tau\texttt{-Add}\\)로 \\(\texttt{num}\\)입니다.

그런데 실행하면 `g(f)`는 `g`의 매개변수 `x`에 묶인 `f`의 클로저를 그대로 돌려주고, `클로저 + 1`을 계산하다가 타입 오류가 납니다. 타입 검사기가 본 `x`(바깥의 `42`)와 실행할 때 쓰이는 `x`(매개변수)가 다르기 때문입니다. 참고로 원래 규칙으로는 `g`의 타입이 \\((\texttt{num} \to \texttt{num}) \to (\texttt{num} \to \texttt{num})\\)이므로 `g(f) + 1`이 \\(\tau\texttt{-Add}\\)에서 거부됩니다.

[← 문제로](./typed-languages.md#ex-typed-languages-7)

## 재귀 함수의 타입

[재귀 함수의 타입](./typing-recursive-functions.md) 장의 연습 문제 해답입니다.

<a id="ans-typing-recursive-functions-6"></a>**6번.** 타입 검사를 통과하고, 타입은 \\(\mathtt{num} \to \mathtt{num}\\)입니다. 본문은 \\(\Gamma_2\\)에서, 범위 식 `f`는 \\(\Gamma_0\\)에서 검사합니다.

\\(\tau\texttt{-Rec}\\)의 첫 번째 전제는 함수 자신과 매개변수의 타입을 모두 넣은 \\(\varnothing[f : \mathtt{num} \to \mathtt{num}, x : \mathtt{num}] = \Gamma_2\\)에서 본문 `f(x) * 7`의 타입이 반환 타입 \\(\mathtt{num}\\)인지 확인합니다. 그 유도 \\(\mathcal{D}\\)는 다음과 같습니다.

\\[
\begin{prooftree}
\AxiomC{$f \in \text{Dom}(\Gamma_2)$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma_2 \vdash f : \mathtt{num} \to \mathtt{num}$}
\AxiomC{$x \in \text{Dom}(\Gamma_2)$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma_2 \vdash x : \mathtt{num}$}
\LeftLabel{$\tau\texttt{-App}$}
\BinaryInfC{$\Gamma_2 \vdash f(x) : \mathtt{num}$}
\AxiomC{}
\LeftLabel{$\tau\texttt{-Num}$}
\UnaryInfC{$\Gamma_2 \vdash 7 : \mathtt{num}$}
\LeftLabel{$\tau\texttt{-Mul}$}
\BinaryInfC{$\Gamma_2 \vdash f(x) \times 7 : \mathtt{num}$}
\end{prooftree}
\\]

두 번째 전제는 함수만 넣은 \\(\varnothing[f : \mathtt{num} \to \mathtt{num}] = \Gamma_0\\)에서 범위 식 `f`의 타입을 구합니다. 매개변수 `x`는 범위 식에서 보이지 않으므로 \\(\Gamma_2\\)가 아닙니다. 전체 유도 트리는 다음과 같습니다.

\\[
\begin{prooftree}
\AxiomC{$\mathcal{D}$}
\noLine
\UnaryInfC{$\Gamma_2 \vdash f(x) \times 7 : \mathtt{num}$}
\AxiomC{$f \in \text{Dom}(\Gamma_0)$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma_0 \vdash f : \mathtt{num} \to \mathtt{num}$}
\LeftLabel{$\tau\texttt{-Rec}$}
\BinaryInfC{$\varnothing \vdash \mathtt{def}\ f(x\mathtt{:}\mathtt{num})\mathtt{:}\mathtt{num}\ \mathtt{=}\ f(x) \times 7;\ f : \mathtt{num} \to \mathtt{num}$}
\end{prooftree}
\\]

이 함수를 호출하면 `f(x)`가 자기 자신을 끝없이 다시 부르므로 계산이 끝나지 않습니다. 하지만 \\(\tau\texttt{-Rec}\\)은 "\\(f\\)가 \\(\mathtt{num} \to \mathtt{num}\\)이라고 가정하면 본문이 \\(\mathtt{num}\\)이다"만 확인할 뿐, 함수를 실제로 호출해 보지 않습니다. [타입 시스템](./type-systems.md) 장의 정의대로 계산이 끝나지 않는 식도 타입을 가질 수 있으므로 "통과하지 못한다"는 답이 아닙니다. \\(\Gamma_3\\), \\(\Gamma_5\\)처럼 \\(f\\)의 반환 타입이 \\(\mathtt{bool}\\)이면 \\(\tau\texttt{-Mul}\\)이 막히고, \\(\Gamma_1\\), \\(\Gamma_4\\)에는 \\(f\\)가 없습니다.

[← 문제로](./typing-recursive-functions.md#ex-typing-recursive-functions-6)

## 대수적 데이터 타입

[대수적 데이터 타입](./algebraic-data-types.md) 장의 연습 문제 해답입니다.

<a id="ans-algebraic-data-types-8"></a>**8번.**

| | 실행 결과 | 타입 |
|---|---|---|
| (a) | \\(B(42)\\) | 타입 없음 |
| (b) | \\(B(\mathtt{true})\\) | 타입 없음 |
| (c) | 끝나지 않음 | \\(\mathtt{num}\\) |
| (d) | \\(3\\) | \\(\mathtt{num}\\) |

(a) 실행하면 생성자 `B`에 `42`를 넘겨 배리언트 값 \\(B(42)\\)가 됩니다. 타입을 구하면, 본문 `B(42)`의 타입은 \\(A\\)입니다. 그런데 \\(\tau\texttt{-TypeDef}\\)의 마지막 전제(수정(2))는 본문의 타입이 \\(A\\)를 더하기 **전의** 타입 환경에서도 올바른 형태인지, 즉 \\(\varnothing \vdash A\\)를 확인합니다. 바깥 환경에는 \\(A\\)가 없으므로 이 전제가 실패합니다. 결과 타입 \\(A\\)가 자기 범위 밖으로 새어 나가는 경우입니다.

(b) 인터프리터는 `enum`을 만나면 생성자를 환경에 더할 뿐이므로, 두 번째 `enum A`를 지나도 첫 번째 `enum`이 정의한 `B`는 그대로 남아 있습니다. 그래서 실행 결과는 \\(B(\mathtt{true})\\)입니다. 타입 검사에서는 두 번째 `enum A`에서 \\(A \notin \text{Dom}(\Gamma)\\) 전제(수정(1))가 실패합니다. 같은 타입 이름을 다시 정의하므로 타입 없음입니다.

(c) `f(B(true))`를 계산하면 본문 `f(x)`가 다시 `f(x)`를 부르기를 끝없이 되풀이하므로, `(42)`를 적용할 함수 값이 끝내 나오지 않습니다. 끝나지 않습니다. 그래도 타입은 있습니다. \\(\tau\texttt{-Rec}\\)에서 `f`의 타입을 \\(A \to (\mathtt{num} \to \mathtt{num})\\)으로 가정하면 본문 `f(x)`의 타입은 반환 타입 \\(\mathtt{num} \to \mathtt{num}\\)과 같습니다. 범위 식에서 `B(true)`의 타입은 \\(A\\)이므로 `f(B(true))`는 \\(\mathtt{num} \to \mathtt{num}\\)이고, `f(B(true))(42)`는 \\(\mathtt{num}\\)입니다. 결과 타입 \\(\mathtt{num}\\)은 바깥에서도 올바른 형태이므로 \\(\tau\texttt{-TypeDef}\\)도 통과합니다.

(d) `f`는 트리의 높이를 구합니다. `B()`이면 \\(0\\)이고, `C(y, z)`이면 두 부분 트리의 높이 중 큰 것에 \\(1\\)을 더합니다. 안쪽부터 계산하면 `C(B(), B())`는 \\(1 + 0 = 1\\), `C(B(), C(B(), B()))`는 \\(1 + 1 = 2\\)이고, 전체는 \\(1 + \max(2, 1) = 3\\)입니다. 타입은 \\(\tau\texttt{-Match}\\)에서 두 경우의 타입이 모두 \\(\mathtt{num}\\)이므로 본문이 반환 타입 \\(\mathtt{num}\\)과 맞고, `f(...)`의 타입 \\(\mathtt{num}\\)은 바깥에서도 올바른 형태입니다.

[← 문제로](./algebraic-data-types.md#ex-algebraic-data-types-8)

<a id="ans-algebraic-data-types-9"></a>**9번.**

- (A) `T => Number => Number`
- (B) `(Number => Number) => Number => Number`
- (C) `T`
- (D) `Number`
- (E) `x match { case T(y) => y(x)(v) }`
- (F) `T(g)`

```atfae,run
/* ATFAE */
enum T { case T(T => Number => Number) };
val mkRec = (f: (Number => Number) => Number => Number) => {
  val g = (x: T) => {
    val h = (v: Number) => x match { case T(y) => y(x)(v) };
    f(h)
  };
  g(T(g))
};
val sum = mkRec((sum: Number => Number) => (n: Number) =>
  if (n < 1) 0 else n + sum(n + -1));
sum(10)                                       // 55
```

타입을 바깥에서 안쪽으로 정해 봅시다.

1. `mkRec`에 넘기는 인자는 `sum: Number => Number`를 받아 `n: Number`를 받는 함수를 돌려주므로, (B)는 \\((\mathtt{num} \to \mathtt{num}) \to \mathtt{num} \to \mathtt{num}\\)입니다.
2. `f(h)`가 통과하려면 `h`의 타입이 \\(\mathtt{num} \to \mathtt{num}\\)이어야 합니다. 그러니 (D)는 `Number`이고, (E)의 타입은 \\(\mathtt{num}\\)이어야 합니다. 그러면 `g`의 타입은 \\(T \to \mathtt{num} \to \mathtt{num}\\)이 됩니다.
3. 타입 없는 식의 `x(x)(v)`는 `x`를 자기 자신에게 적용합니다. 이 장의 예제 4에서 본 것처럼, 이렇게 하려면 `x`의 타입이 \\(T = T \to \mathtt{num} \to \mathtt{num}\\)을 만족하는 재귀 타입이어야 합니다. ATFAE에서 이런 타입을 직접 쓸 수는 없지만, 그 함수를 배리언트 하나에 감싼 `enum T { case T(T => Number => Number) }`를 정의할 수 있습니다. 그래서 (A)는 `T => Number => Number`, (C)는 `T`입니다. 배리언트 타입 안에서 \\(T\\) 자신을 쓰는 것은 \\(\tau\texttt{-TypeDef}\\)가 배리언트의 타입을 \\(T\\)를 더한 \\(\Gamma'\\)에서 검사하기 때문에 허락됩니다.
4. `x`는 이제 함수가 아니라 \\(T\\) 타입의 배리언트 값이므로 바로 호출할 수 없습니다. 패턴 매칭으로 감싼 함수 `y`(\\(T \to \mathtt{num} \to \mathtt{num}\\))를 꺼낸 다음 `x` 자신을 넘기면 `y(x)`는 \\(\mathtt{num} \to \mathtt{num}\\), `y(x)(v)`는 \\(\mathtt{num}\\)입니다. 이것이 (E)입니다.
5. 마지막으로 `g(g)`도 같은 이유로 `g`를 그대로 넘길 수 없습니다. `g`의 매개변수 타입은 \\(T\\)이므로 `g`를 생성자 `T`로 감싼 `T(g)`를 넘깁니다. 이것이 (F)입니다.

RFAE에서 `v => x(x)(v)`처럼 한 번 감싼 것은 값 호출 언어에서 `x(x)`가 바로 계산되어 끝나지 않는 일을 막기 위해서였는데, ATFAE 판에서도 `h`가 그 역할을 그대로 합니다. 실행하면 두 식 모두 `55`가 됩니다.

[← 문제로](./algebraic-data-types.md#ex-algebraic-data-types-9)

## 매개변수 다형성

[매개변수 다형성](./parametric-polymorphism.md) 장의 연습 문제 해답입니다.

<a id="ans-parametric-polymorphism-6"></a>**6번.**

- (A) `A => A`, (B) `A`
- (C) `Number`
- (D) `Number => Number`, (E) `Number`
- (F), (G) 모두 `[A]((A => A) => A => A)`

```ptfae,run
/* PTFAE */
val twice = forall[A] (f: A => A) => (x: A) => f(f(x));
val inc = (x: Number) => x + 1;
val x = twice[Number](inc)(42);
val y = twice[Number => Number](twice[Number])(inc);
twice[[A]((A => A) => A => A)]((x: [A]((A => A) => A => A)) => x)(twice)
```

(A), (B): `f(f(x))`에서 `f`의 결과가 다시 `f`의 인자가 되므로 `f`는 같은 타입을 받고 돌려주어야 하고, `x`는 그 타입이어야 합니다. 그래서 `twice`의 타입은 \\(\forall\alpha.(\alpha \to \alpha) \to \alpha \to \alpha\\)이고, \\(\tau\texttt{-TypeApp}\\)에 따라 `twice[τ]`의 타입은 \\((\tau \to \tau) \to \tau \to \tau\\)입니다.

(C): `inc`의 타입이 \\(\mathtt{num} \to \mathtt{num}\\)이므로 \\(\tau = \mathtt{num}\\)입니다. `x`는 `44`입니다.

(D), (E): 바깥 `twice[τ]`의 인자는 `twice[σ]`이고 그 타입은 \\((\sigma \to \sigma) \to \sigma \to \sigma\\)입니다. 이것이 \\(\tau \to \tau\\) 꼴이 되려면 \\(\tau = \sigma \to \sigma\\)여야 합니다. 그다음 인자 `inc`의 타입 \\(\mathtt{num} \to \mathtt{num}\\)이 \\(\tau\\)와 같아야 하므로 \\(\sigma = \mathtt{num}\\), \\(\tau = \mathtt{num} \to \mathtt{num}\\)입니다. `y`는 인자에 4를 더하는 함수입니다.

(F), (G): 마지막 줄은 `twice`에 항등 함수와 `twice` 자신을 넘깁니다. `twice`의 타입 \\(\forall\alpha.(\alpha \to \alpha) \to \alpha \to \alpha\\)를 \\(\tau\\)라고 하면, 항등 함수 `(x: τ) => x`의 타입은 \\(\tau \to \tau\\)이므로 `twice[τ]`에 넘길 수 있고, 그 결과 \\(\tau \to \tau\\)에 `twice`(타입 \\(\tau\\))를 넘길 수 있습니다. 다형 타입 자체를 타입 인자로 넘기는 것으로, 이 장 첫 예제의 `f[[T](T => T)](f)`와 같습니다. 전체 식의 타입은 \\(\forall\alpha.(\alpha \to \alpha) \to \alpha \to \alpha\\)입니다. 이 장의 \\(\mathsf{PTFAE}\\)는 타입을 동등성 \\(\equiv\\)로 비교하므로 (F), (G)에서 묶인 변수 이름을 바꿔 써도 됩니다.

[← 문제로](./parametric-polymorphism.md#ex-parametric-polymorphism-6)

<a id="ans-parametric-polymorphism-7"></a>**7번.**

- (A) `forall[C] (f: A => B => C) => f(x)(y)`
- (B) `[C]((A => B => C) => C)`
- (C) `p[A]`
- (D) `p[B]`

```ptfae,run
/* PTFAE */
val pair = forall[A] forall[B] (x: A) => (y: B) =>
  forall[C] (f: A => B => C) => f(x)(y);
val fst = forall[A] forall[B] (p: [C]((A => B => C) => C)) =>
  p[A]((x: A) => (y: B) => x);
val snd = forall[A] forall[B] (p: [C]((A => B => C) => C)) =>
  p[B]((x: A) => (y: B) => y);
val p = pair[Number][Number => Number](1)((x: Number) => x + 2);
val a = fst[Number][Number => Number](p);
val b = snd[Number][Number => Number](p);
b(a)                                          // 3
```

쌍 `f => f(x)(y)`는 \\(\alpha\\)와 \\(\beta\\)를 차례로 받는 함수 `f`를 받아 그 결과를 돌려줍니다. 문제는 `f`의 결과 타입입니다. `fst`는 `(x: A) => (y: B) => x`를 넘기므로 결과가 \\(\alpha\\)이고, `snd`는 `(x: A) => (y: B) => y`를 넘기므로 결과가 \\(\beta\\)입니다. 같은 쌍 `p`를 두 가지 결과 타입으로 써야 하므로, 결과 타입은 쌍을 만들 때 정하지 않고 쌍을 **쓰는 쪽이** 고르게 해야 합니다. 그래서 (A)에서 결과 타입 \\(\gamma\\)를 `forall[C]`로 묶습니다. `pair[α][β](x)(y)`의 타입은 \\(\forall\gamma.(\alpha \to \beta \to \gamma) \to \gamma\\)이고, 이것이 (B)입니다.

`fst`의 몸통에서 `p`의 타입은 (B)이므로, \\(\tau\texttt{-TypeApp}\\)으로 `p[A]`의 타입은 \\((\alpha \to \beta \to \alpha) \to \alpha\\)입니다. 여기에 `(x: A) => (y: B) => x`(타입 \\(\alpha \to \beta \to \alpha\\))를 넘기면 결과는 \\(\alpha\\)입니다. 그래서 (C)는 `p[A]`이고, `fst`의 타입은 \\(\forall\alpha.\forall\beta.(\forall\gamma.(\alpha \to \beta \to \gamma) \to \gamma) \to \alpha\\)입니다. 같은 이유로 (D)는 `p[B]`입니다.

만약 (A)에서 `forall[C]` 없이 \\(\gamma\\)를 바깥 `pair`의 타입 매개변수로 두었다면, `p`를 만들 때 \\(\gamma\\)를 하나로 정해야 해서 `fst`와 `snd` 중 하나는 타입 검사를 통과하지 못합니다. 이렇게 함수 매개변수의 타입 안에 \\(\forall\\)가 들어가는 것은 \\(\mathsf{PTFAE}\\)가 다형 타입을 일급으로 다루기 때문에 가능합니다. 실행하면 `a`는 `1`, `b`는 `x => x + 2`이므로 결과는 `3`입니다.

[← 문제로](./parametric-polymorphism.md#ex-parametric-polymorphism-7)

## 서브타입 다형성

[서브타입 다형성](./subtype-polymorphism.md) 장의 연습 문제 해답입니다.

<a id="ans-subtype-polymorphism-6"></a>**6번.**

(a) 차례로 \\(<:\\), \\(:>\\), X, \\(:>\\), X, \\(<:\\), \\(:>\\)

1. \\(\\{a : \mathtt{num}, b : \mathtt{num}\\} <: \\{a : \mathtt{num}\\}\\): 필드 추가 규칙입니다.
2. \\(\\{b : \mathtt{num}, a : \mathtt{num}\\}\\)은 순서를 바꾸면 \\(\\{a : \mathtt{num}, b : \mathtt{num}\\}\\)이고, 필드 타입 규칙으로 \\(\mathtt{num} <: \top\\)이므로 오른쪽이 왼쪽의 서브타입입니다.
3. 왼쪽이 서브타입이려면 \\(\top <: \mathtt{num}\\)이어야 하고, 오른쪽이 서브타입이려면 오른쪽에 필드 \\(b\\)가 있어야 합니다. 둘 다 아니므로 X입니다.
4. \\(\top \to \mathtt{num} <: \mathtt{num} \to \mathtt{num}\\)입니다. 매개변수 쪽은 반변이므로 \\(\top :> \mathtt{num}\\)이면 됩니다.
5. 왼쪽이 서브타입이려면 매개변수에서 \\(\mathtt{num} :> \bot\\)(성립)이고 반환에서 \\(\mathtt{num} \to \mathtt{num} <: \top \to \top\\)이어야 하는데, 이것은 다시 \\(\mathtt{num} :> \top\\)을 요구하므로 실패합니다. 오른쪽이 서브타입이려면 \\(\bot :> \mathtt{num}\\)이어야 하므로 실패합니다. X입니다.
6. 매개변수에서 \\(\bot \to \top :> \mathtt{num} \to \mathtt{num}\\)(\\(\bot <: \mathtt{num}\\), \\(\mathtt{num} <: \top\\)이므로 성립)이고, 반환에서 \\(\bot <: \mathtt{num}\\)이므로 \\(<:\\)입니다.
7. 오른쪽이 왼쪽의 서브타입입니다. 반환 쪽은 \\(\\{b : \mathtt{num}, c : \mathtt{num}\\} <: \\{c : \top\\}\\)이고, 매개변수 쪽은 \\(\\{a : (\mathtt{num} \to \top) \to \mathtt{num}\\} <: \\{a : (\top \to \mathtt{num}) \to \top\\}\\)이어야 합니다. 필드 \\(a\\)끼리 비교하면 \\((\mathtt{num} \to \top) \to \mathtt{num} <: (\top \to \mathtt{num}) \to \top\\)이고, 이것은 다시 매개변수에서 \\(\top \to \mathtt{num} <: \mathtt{num} \to \top\\)(\\(\mathtt{num} <: \top\\)이 두 번)과 반환에서 \\(\mathtt{num} <: \top\\)이므로 성립합니다. 반대 방향은 반환 쪽에서 \\(\\{c : \top\\}\\)에 필드 \\(b\\)가 없어 실패합니다.

(b) 차례로 \\(\top\\), \\(\\{a : \top\\}\\), \\(\bot \to \top\\), \\((\mathtt{num} \to \mathtt{bool}) \to \top\\), \\(\\{a : \mathtt{num}, b : \mathtt{bool}\\} \to \top\\)

이 서브타입 관계에는 \\(\top\\)이 있으므로 조인은 항상 있습니다. 조인을 구하려면 반대로 두 타입 **모두의 서브타입** 중 가장 큰 것인 최대 하계(greatest lower bound) \\(\tau \sqcap \tau'\\)도 필요합니다. \\(\bot\\)이 있으므로 이것도 항상 있습니다. 경우별로 정리하면 다음과 같습니다.

- 한쪽이 다른 쪽의 서브타입이면 조인은 큰 쪽, 최대 하계는 작은 쪽입니다. 그 밖에 종류가 다른 두 타입(예: \\(\mathtt{num}\\)과 \\(\mathtt{bool}\\))의 조인은 \\(\top\\), 최대 하계는 \\(\bot\\)입니다.
- 레코드 타입의 조인은 **공통 필드만** 남기고 각 필드 타입을 조인합니다. 최대 하계는 두 레코드의 필드를 **모두** 모으고, 공통 필드의 타입은 최대 하계로 합니다.
- 함수 타입의 조인은 \\((\tau_1 \to \tau_2) \sqcup (\tau_1' \to \tau_2') = (\tau_1 \sqcap \tau_1') \to (\tau_2 \sqcup \tau_2')\\)입니다. 매개변수 쪽은 반변이므로 거꾸로 최대 하계를 씁니다. 함수 타입의 최대 하계는 반대로 매개변수 쪽을 조인하고 반환 쪽을 최대 하계로 합니다.

이제 차례로 계산합니다.

1. \\(\mathtt{num}\\)과 \\(\mathtt{bool}\\)을 모두 받아 주는 타입은 \\(\top\\)뿐입니다.
2. 공통 필드는 \\(a\\)뿐이고 \\(\mathtt{num} \sqcup \mathtt{bool} = \top\\)이므로 \\(\\{a : \top\\}\\)입니다. \\(b\\)를 남기면 \\(\\{a : \mathtt{bool}\\}\\)이 그 서브타입이 될 수 없습니다.
3. 매개변수는 \\(\mathtt{num} \sqcap \mathtt{bool} = \bot\\), 반환은 \\(\mathtt{num} \sqcup \mathtt{bool} = \top\\)이므로 \\(\bot \to \top\\)입니다.
4. 반환은 \\(\mathtt{bool} \sqcup \mathtt{num} = \top\\)입니다. 매개변수는 \\((\mathtt{num} \to \top) \sqcap (\bot \to \mathtt{bool}) = (\mathtt{num} \sqcup \bot) \to (\top \sqcap \mathtt{bool}) = \mathtt{num} \to \mathtt{bool}\\)입니다. 따라서 \\((\mathtt{num} \to \mathtt{bool}) \to \top\\)입니다.
5. 반환은 \\(\mathtt{num} \sqcup \mathtt{bool} = \top\\)입니다. 매개변수는 \\(\\{a : \top, b : \mathtt{bool}\\} \sqcap \\{a : \mathtt{num}\\} = \\{a : \top \sqcap \mathtt{num}, b : \mathtt{bool}\\} = \\{a : \mathtt{num}, b : \mathtt{bool}\\}\\)입니다. 따라서 \\(\\{a : \mathtt{num}, b : \mathtt{bool}\\} \to \top\\)입니다.

(c) 조건의 타입은 \\(\mathtt{bool}\\)의 서브타입이면 되고, 결과 타입은 두 갈래 타입의 조인으로 합니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : \tau_0 \quad \tau_0 <: \mathtt{bool}$}
\AxiomC{$\Gamma \vdash e_1 : \tau_1$}
\AxiomC{$\Gamma \vdash e_2 : \tau_2$}
\LeftLabel{$\tau\texttt{-If}$}
\TrinaryInfC{$\Gamma \vdash \mathtt{if}\ (e_0)\ e_1\ \mathtt{else}\ e_2 : \tau_1 \sqcup \tau_2$}
\end{prooftree}
\\]

예제 식에서 두 갈래의 타입은 \\(\\{a : \mathtt{num}, b : \mathtt{bool}\\}\\)과 \\(\\{a : \mathtt{num}\\}\\)이고, 그 조인은 \\(\\{a : \mathtt{num}\\}\\)입니다. 그래서 `f`의 타입은 \\(\mathtt{bool} \to \\{a : \mathtt{num}\\}\\)이 되고 `f(true).a * f(false).a`는 \\(\mathtt{num}\\)입니다. 이 규칙은 전제마다 무엇을 검사할지 정해져 있고 결과 타입도 계산할 수 있으므로 알고리즘적입니다. 또 조인은 두 갈래의 타입을 모두 받아 주는 타입 중 가장 작은 것이므로, 포섭 규칙으로 두 갈래를 같은 타입으로 맞출 때 얻을 수 있는 어떤 결과 타입보다도 정확합니다. \\(\tau_0 <: \mathtt{bool}\\)은 조건이 `exit`(타입 \\(\bot\\))인 경우까지 받아 주려는 것으로, \\(\Gamma \vdash e_0 : \mathtt{bool}\\)로 써도 이 예제에는 상관없습니다.

[← 문제로](./subtype-polymorphism.md#ex-subtype-polymorphism-6)

<a id="ans-subtype-polymorphism-7"></a>**7번.** 건전하지 않습니다. 반례는 다음 식입니다.

```stfae,run
/* STFAE */
val f = (x: Top => Number) => x({});
f((y: Number) => y + 1)
```

`f`는 아무 값이나 받는 함수(\\(\top \to \mathtt{num}\\))를 받아 빈 레코드 `{}`를 넘깁니다. `f` 자신의 타입은 \\((\top \to \mathtt{num}) \to \mathtt{num}\\)으로 문제가 없습니다. 인자 `(y: Number) => y + 1`의 타입은 \\(\mathtt{num} \to \mathtt{num}\\)입니다. 바꾼 규칙으로는 \\(\mathtt{num} <: \top\\)이고 \\(\mathtt{num} <: \mathtt{num}\\)이므로 \\(\mathtt{num} \to \mathtt{num} <: \top \to \mathtt{num}\\)이 되어, 알고리즘적 \\(\tau\texttt{-App}\\)이 인자를 받아들이고 전체 식의 타입은 \\(\mathtt{num}\\)이 됩니다.

실행하면 `x({})`에서 `{}`가 `y`에 묶이고 `{} + 1`을 계산하다가 타입 오류가 납니다. "수만 받는 함수"는 "아무 값이나 받는 함수"보다 받아 주는 값이 **적으므로** 그 자리에 넣으면 안 되는데, 매개변수를 공변으로 비교하면 이것을 허락해 버립니다. 원래 규칙으로는 \\(\top <: \mathtt{num}\\)이 성립하지 않으므로 이 식이 거부됩니다. 불 타입이 있는 언어라면 `{}` 대신 `true`를 넘겨도 같은 반례가 됩니다.

[← 문제로](./subtype-polymorphism.md#ex-subtype-polymorphism-7)

## 타입 추론

[타입 추론](./type-inference.md) 장의 연습 문제 해답입니다.

<a id="ans-type-inference-7"></a>**7번.**

- (a) X
- (b) \\([\alpha \mapsto \beta, \beta \mapsto \gamma, \gamma \mapsto \mathtt{num}]\\)
- (c) \\([\alpha \mapsto \mathtt{num}, \beta \mapsto \mathtt{bool} \to \mathtt{num}]\\)
- (d) \\([\alpha \mapsto \mathtt{num}, \beta \mapsto \mathtt{num} \to \gamma, \gamma \mapsto \alpha]\\)
- (e) X

(a) 먼저 해소합니다. \\(\alpha\\)는 풀리지 않았으므로 \\(\alpha\\) 그대로이고, \\(\beta \to \mathtt{num}\\)은 \\(\beta\\)가 \\(\alpha\\)를 가리키므로 \\(\alpha \to \mathtt{num}\\)입니다. 왼쪽이 타입 변수 \\(\alpha\\)이지만 \\(\mathtt{occur}(\alpha, \alpha \to \mathtt{num})\\)이 참이므로 해를 정할 수 없고, 오른쪽은 타입 변수가 아니므로 마지막 경우도 해당하지 않습니다. \\(\alpha = \alpha \to \mathtt{num}\\)은 재귀 타입이 필요하므로 실패합니다. 해소하기 전의 \\(\beta \to \mathtt{num}\\)만 보면 \\(\alpha\\)가 없어 보이므로, 해소를 먼저 해야 한다는 점이 중요합니다.

(b) \\(\alpha\\)를 해소하면 \\(\alpha \to \beta \to \gamma\\)를 따라가 대표 타입 변수 \\(\gamma\\)를 얻습니다. \\(\gamma\\)는 \\(\mathtt{num}\\)에 나타나지 않으므로 \\(\gamma\\)의 해를 \\(\mathtt{num}\\)으로 정합니다. \\(\alpha\\)의 칸을 \\(\mathtt{num}\\)으로 덮어쓰지 않으므로 \\(\alpha\\)와 \\(\beta\\)는 그대로 각각 \\(\beta\\)와 \\(\gamma\\)를 가리키고, 셋 모두 \\(\mathtt{num}\\)으로 풀립니다. 이 장의 "타입 해소" 절의 예와 같습니다.

(c) 둘 다 화살표 타입이므로 매개변수끼리 \\(\mathtt{unify}(\alpha, \mathtt{num})\\)으로 \\(\alpha \mapsto \mathtt{num}\\)을 얻고, 그 해로 반환 타입끼리 \\(\mathtt{unify}(\beta, \mathtt{bool} \to \mathtt{num})\\)을 계산해 \\(\beta \mapsto \mathtt{bool} \to \mathtt{num}\\)을 얻습니다.

(d) 해소하면 왼쪽은 \\(\alpha \to \mathtt{num}\\)이고, 오른쪽은 \\(\beta\\)가 \\(\mathtt{num} \to \gamma\\)를, \\(\gamma\\)가 \\(\alpha\\)를 가리키므로 \\(\mathtt{num} \to \alpha\\)입니다. 둘 다 화살표 타입이므로 매개변수끼리 \\(\mathtt{unify}(\alpha, \mathtt{num})\\)을 계산해 \\(\alpha \mapsto \mathtt{num}\\)을 얻습니다. 반환 타입끼리는 \\(\mathtt{num}\\)과 \\(\gamma\\)를 갱신된 해로 단일화하는데, \\(\gamma\\)를 해소하면 \\(\gamma \to \alpha \to \mathtt{num}\\)을 따라가 \\(\mathtt{num}\\)이 되므로 \\(\mathtt{num}\\)끼리가 되어 해가 바뀌지 않습니다. 결과는 \\(\alpha\\)의 칸만 바뀐 해입니다. \\(\gamma\\)의 칸을 \\(\mathtt{num}\\)으로 덮어쓰지 않는다는 점에 주의하세요.

(e) 해소하면 왼쪽은 \\(\beta \to \beta\\), 오른쪽은 \\(\mathtt{num} \to \mathtt{bool}\\)입니다. 매개변수끼리 \\(\mathtt{unify}(\beta, \mathtt{num})\\)으로 \\(\beta \mapsto \mathtt{num}\\)을 얻은 뒤, 반환 타입끼리 \\(\beta\\)와 \\(\gamma\\)를 해소하면 \\(\mathtt{num}\\)과 \\(\mathtt{bool}\\)이 되어 어느 경우에도 해당하지 않으므로 실패합니다.

[← 문제로](./type-inference.md#ex-type-inference-7)

<a id="ans-type-inference-8"></a>**8번.**

(a) 코드를 그대로 옮기면 다음과 같습니다. `newTypeVar`는 해에 없는 새 타입 변수 \\(\alpha\\)를 만들어 \\(\bullet\\)으로 등록하는 것에 해당합니다.

\\[
\begin{prooftree}
\AxiomC{$\alpha \notin \mathrm{dom}(\psi)$}
\LeftLabel{$\tau\texttt{-Nil}$}
\UnaryInfC{$\Gamma, \psi \vdash \mathtt{nil} : \mathtt{List}[\alpha], \psi[\alpha \mapsto \bullet]$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c}
\Gamma, \psi \vdash e_1 : \tau_1, \psi_1 \qquad
\Gamma, \psi_1 \vdash e_2 : \tau_2, \psi_2 \\\\
\mathtt{unify}(\mathtt{List}[\tau_1], \tau_2, \psi_2) = \psi'
\end{array}$}
\LeftLabel{$\tau\texttt{-Cons}$}
\UnaryInfC{$\Gamma, \psi \vdash e_1 \mathbin{::} e_2 : \tau_2, \psi'$}
\end{prooftree}
\\]

(b) `e.head`와 `e.tail` 모두 `e`의 타입 \\(\tau\\)가 아직 타입 변수일 수 있으므로, 원소 타입을 위한 새 타입 변수 \\(\alpha\\)를 만들고 \\(\tau\\)를 \\(\mathtt{List}[\alpha]\\)와 단일화합니다. `head`는 원소 하나를 돌려주므로 결과가 \\(\alpha\\)이고, `tail`은 리스트를 돌려주므로 결과가 \\(\tau\\) 자신입니다(\\(\mathtt{List}[\alpha]\\)라고 써도 단일화한 뒤에는 같은 타입입니다).

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c}
\Gamma, \psi \vdash e : \tau, \psi_1 \qquad
\alpha \notin \mathrm{dom}(\psi_1) \\\\
\mathtt{unify}(\mathtt{List}[\alpha], \tau, \psi_1[\alpha \mapsto \bullet]) = \psi'
\end{array}$}
\LeftLabel{$\tau\texttt{-Head}$}
\UnaryInfC{$\Gamma, \psi \vdash e.\mathtt{head} : \alpha, \psi'$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c}
\Gamma, \psi \vdash e : \tau, \psi_1 \qquad
\alpha \notin \mathrm{dom}(\psi_1) \\\\
\mathtt{unify}(\mathtt{List}[\alpha], \tau, \psi_1[\alpha \mapsto \bullet]) = \psi'
\end{array}$}
\LeftLabel{$\tau\texttt{-Tail}$}
\UnaryInfC{$\Gamma, \psi \vdash e.\mathtt{tail} : \tau, \psi'$}
\end{prooftree}
\\]

\\(\tau\texttt{-App}\\)에서 결과 타입을 위한 새 타입 변수를 만들고 함수 타입과 단일화했던 것과 같은 방식입니다. \\(\tau\\)가 이미 \\(\mathtt{List}[\ldots]\\) 꼴인지 바로 검사하는 규칙으로는 `x.head`처럼 매개변수에 바로 쓰는 경우를 추론할 수 없습니다.

(c) \\(\mathtt{List}[\mathtt{num} \to \mathtt{num}] \to \mathtt{num}\\)

규칙대로 따라가면 다음과 같습니다(새 타입 변수의 이름은 편의상 붙인 것입니다).

1. `x`의 타입을 새 타입 변수 \\(\alpha\\)로 둡니다(\\(\tau\texttt{-Fun}\\)).
2. `x.head`: 새 \\(\beta\\)를 만들고 \\(\mathtt{unify}(\mathtt{List}[\beta], \alpha)\\)로 \\(\alpha \mapsto \mathtt{List}[\beta]\\). 결과 타입은 \\(\beta\\)입니다.
3. `x.head(42)`: 새 \\(\gamma\\)를 만들고 \\(\mathtt{unify}(\mathtt{num} \to \gamma, \beta)\\)로 \\(\beta \mapsto \mathtt{num} \to \gamma\\). `y`의 타입은 \\(\gamma\\)입니다.
4. `x.tail`: 새 \\(\delta\\)를 만들고 \\(\mathtt{unify}(\mathtt{List}[\delta], \alpha)\\)를 계산합니다. \\(\alpha\\)를 해소하면 \\(\mathtt{List}[\mathtt{num} \to \gamma]\\)이므로 \\(\delta \mapsto \mathtt{num} \to \gamma\\). `z`의 타입은 `x`의 타입 \\(\alpha\\)입니다.
5. `z.head`: 새 \\(\epsilon\\)을 만들고 \\(\mathtt{unify}(\mathtt{List}[\epsilon], \alpha)\\)로 \\(\epsilon \mapsto \mathtt{num} \to \gamma\\). 결과 타입은 \\(\epsilon\\)입니다.
6. `z.head(y)`: 새 \\(\zeta\\)를 만들고 \\(\mathtt{unify}(\gamma \to \zeta, \epsilon)\\)을 계산합니다. \\(\epsilon\\)을 해소하면 \\(\mathtt{num} \to \gamma\\)이므로, 매개변수끼리 \\(\gamma \mapsto \mathtt{num}\\), 반환 타입끼리 \\(\zeta \mapsto \mathtt{num}\\)입니다.
7. `f`의 타입은 \\(\alpha \to \zeta\\)이고, 해로 모두 해소하면 \\(\mathtt{List}[\mathtt{num} \to \mathtt{num}] \to \mathtt{num}\\)입니다.

즉 `x`는 "수를 받아 수를 돌려주는 함수들의 리스트"여야 합니다. 첫 원소에 `42`를 넘기므로 원소는 수를 받는 함수이고, 둘째 원소(`z.head`)에 첫 원소의 결과 `y`를 넘기므로 그 결과도 수여야 합니다.

[← 문제로](./type-inference.md#ex-type-inference-8)
