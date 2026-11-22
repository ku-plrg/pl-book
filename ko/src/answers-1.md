# 1부 연습 문제 해답

1부 각 장의 연습 문제 중 해답이 있는 문제의 답과 풀이입니다. 먼저 스스로 풀어 본 뒤에 확인하기를 권합니다.

## [문법과 의미](./syntax-semantics.md)

<a id="ans-syntax-semantics-7"></a>
**7번.** (a) O, (b) X, (c) X, (d) X, (e) O

이 문법에서 눈여겨볼 곳은 두 군데입니다. `<expr> "+" <number>`이므로 `"+"`의 **오른쪽에는 정수만** 올 수 있고(왼쪽은 아무 식이나 됩니다), `<id> "=" <expr>`이므로 `"="`의 **왼쪽에는 식별자만** 올 수 있습니다(오른쪽은 아무 식이나 됩니다). 또 `<id>`는 알파벳으로만 이루어집니다.

- (a) `1`은 `<number>`이므로 `<expr>`이고, `-2`는 `"-"? <digit>+`에 맞는 `<number>`입니다. 따라서 `<expr> "+" <number>`에 맞습니다.
- (b) `"+"`의 오른쪽 `(1 + 2)`는 식이기는 하지만 `<number>`가 아닙니다. `"+"`가 들어가는 규칙은 `<expr> "+" <number>` 하나뿐이므로 맞지 않습니다.
- (c) `x0`에는 숫자 `0`이 들어 있어서 `<alphabet>+`인 `<id>`가 아닙니다. `<number>`도 아니므로 `x0`으로 시작하는 식을 만들 방법이 없습니다. (`3 + 5` 부분만 보면 올바른 식입니다.)
- (d) 바깥 `"="`의 왼쪽 `(x = y)`는 식이지만 `<id>`가 아닙니다. `"="`가 들어가는 규칙은 `<id> "=" <expr>` 하나뿐이므로 맞지 않습니다.
- (e) `(y = z)`는 `"(" <expr> ")"`이고, 거기에 정수 `3`을 더한 `(y = z) + 3`은 `<expr> "+" <number>`입니다. 이것이 `x = ...`의 오른쪽 식이 되므로 `<id> "=" <expr>`에 맞습니다. (`x = (y = z)`를 먼저 묶고 `+ 3`을 붙이는 방법으로도 맞으므로 이 문법은 모호하지만, 답은 O입니다.)

[← 문제로](./syntax-semantics.md#ex-syntax-semantics-7)

## [식별자](./identifiers.md)

<a id="ans-identifiers-5"></a>
**5번.**
- (a) 4, 11, 13
- (b) 5 → 3, 6 → 1, 8 → 7, 10 → 2, 12 → 0
- (c) 2 → 1, 3 → 1

먼저 묶는 출현마다 스코프를 정합니다.

| 묶는 출현 | 종류 | 스코프 | 그 안의 출현 |
|---|---|---|---|
| 0 `x` | `val` | 마지막 줄 `x + y` | 12, 13 |
| 1 `y` | 매개변수 | 함수 몸통 `{ ... }` 전체 | 2 ~ 11 |
| 2 `y` | `val` | `(x => x)(x => y)(x)` | 7 ~ 11 |
| 3 `y` | 매개변수 | `x + y` | 4, 5 |
| 7 `x` | 매개변수 | `x` | 8 |
| 9 `x` | 매개변수 | `y` | 10 |

핵심은 `val x = e1; e2`에서 `x`의 스코프가 `e2`뿐이라는 점입니다. 그래서 0번 `x`의 스코프에는 초기화 식인 함수 전체가 들어가지 않고, 2번 `y`의 스코프에는 초기화 식 `(y => x + y)(y)`가 들어가지 않습니다.

(a), (b) 각 묶인 출현에서 자신을 스코프 안에 품은 묶는 출현 중 가장 안쪽 것을 찾습니다.
- 4 `x`: 함수 몸통 안이지만 0번 `x`의 스코프 밖이고, 7번, 9번 `x`의 스코프에도 들지 않으므로 **자유 식별자**입니다.
- 5 `y`: 1번과 3번의 스코프 안에 있고, 가장 안쪽은 3번입니다.
- 6 `y`: `val y`의 초기화 식 안이라 2번의 스코프 밖입니다. 3번의 스코프(`x + y`)에도 들지 않으므로 1번을 가리킵니다.
- 8 `x`: 7번을 가리킵니다.
- 10 `y`: 1번과 2번의 스코프 안에 있고, 가장 안쪽은 2번입니다.
- 11 `x`: 7번, 9번 `x`의 스코프는 각 함수의 몸통뿐이므로 바깥에 있는 11번은 어느 쪽에도 들지 않고, 0번의 스코프에도 들지 않으므로 **자유 식별자**입니다.
- 12 `x`: 0번을 가리킵니다.
- 13 `y`: 1번 `y`의 스코프는 `}`에서 끝나므로 마지막 줄의 `y`는 **자유 식별자**입니다.

(c) 같은 이름의 다른 묶는 출현의 스코프 안에서 다시 정의된 묶는 출현이 가리는 식별자입니다. 2번 `y`와 3번 `y`는 모두 1번 `y`의 스코프(함수 몸통) 안에서 정의되므로 1번을 가립니다. 3번은 2번 `val y`의 초기화 식 안에 있어서 2번의 스코프 밖이므로 2번을 가리지 않습니다. 7번과 9번 `x`는 0번 `x`의 스코프 밖에 있으므로 아무것도 가리지 않습니다.

[← 문제로](./identifiers.md#ex-identifiers-5)

## [일급 함수](./first-class-functions.md)

<a id="ans-first-class-functions-6"></a>
**6번.** 첫 번째 프로그램은 정적 스코핑에서 `20`, 동적 스코핑에서 `15`입니다. 두 번째 프로그램은 정적 스코핑에서 오류(자유 식별자 `f`), 동적 스코핑에서 끝나지 않음입니다.

**첫 번째 프로그램.** \\( v_f = \langle \lambda \texttt{x}.\lambda \texttt{y}.(\texttt{x} \ast \texttt{y}), \varnothing \rangle \\)라 하면 마지막 줄은 \\( \sigma_1 = [\texttt{f} \mapsto v_f, \texttt{x} \mapsto 3] \\)에서 계산됩니다.
- 정적 스코핑: `f(4)`는 클로저의 환경 \\( \varnothing \\)을 확장한 \\( [\texttt{x} \mapsto 4] \\)에서 몸통 `y => x * y`를 계산하므로 클로저 \\( \langle \lambda \texttt{y}.(\texttt{x} \ast \texttt{y}), [\texttt{x} \mapsto 4] \rangle \\)가 됩니다. 이것을 `5`에 적용하면 몸통 `x * y`를 \\( [\texttt{x} \mapsto 4, \texttt{y} \mapsto 5] \\)에서 계산하므로 `20`입니다.
- 동적 스코핑: `f(4)`의 몸통은 호출 위치의 환경을 확장한 \\( \sigma_1[\texttt{x} \mapsto 4] \\)에서 계산되어 `y => x * y`의 클로저가 됩니다. 그런데 동적 스코핑에서는 클로저에 담긴 환경을 쓰지 않으므로 `x`가 4였다는 정보가 사라집니다. 이 클로저를 `5`에 적용할 때의 호출 위치 환경은 \\( \sigma_1 \\)이므로, 몸통 `x * y`는 \\( \sigma_1[\texttt{y} \mapsto 5] \\)에서 계산되어 `x`가 3이 되고 결과는 `15`입니다.

**두 번째 프로그램.** `val`의 초기화 식 `x => f(x)`는 `f`의 스코프가 아니므로, 클로저는 \\( \langle \lambda \texttt{x}.\texttt{f}(\texttt{x}), \varnothing \rangle \\)입니다.
- 정적 스코핑: `f(42)`는 몸통 `f(x)`를 클로저의 환경을 확장한 \\( [\texttt{x} \mapsto 42] \\)에서 계산합니다. 여기에는 `f`가 없으므로 자유 식별자 오류가 납니다.
- 동적 스코핑: 몸통을 호출 위치의 환경 \\( [\texttt{f} \mapsto \ldots, \texttt{x} \mapsto 42] \\)에서 계산하므로 `f`를 찾을 수 있습니다. 그 `f`는 자기 자신이므로 `f(x)`가 같은 환경에서 다시 `f(x)`를 부르기를 끝없이 되풀이해 계산이 끝나지 않습니다. 동적 스코핑에서는 재귀가 "우연히" 되는 셈입니다.

[← 문제로](./first-class-functions.md#ex-first-class-functions-6)

<a id="ans-first-class-functions-7"></a>
**7번.** \\( v = \langle \lambda \texttt{x}.\texttt{x}, \varnothing \rangle \\)라 쓰면 다음과 같습니다.

(A) 함수 식 `f(f)`의 계산:

\\[
\begin{prooftree}
\AxiomC{$\texttt{f} \in \text{Dom}(\sigma_0)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_0 \vdash \texttt{f} \Rightarrow v$}
\AxiomC{$\texttt{f} \in \text{Dom}(\sigma_0)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_0 \vdash \texttt{f} \Rightarrow v$}
\AxiomC{$\texttt{x} \in \text{Dom}(\sigma_1)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_1 \vdash \texttt{x} \Rightarrow v$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\sigma_0 \vdash \texttt{f}(\texttt{f}) \Rightarrow v$}
\end{prooftree}
\\]

(B) 인자 식 `1 + 2`의 계산:

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\sigma_0 \vdash 1 \Rightarrow 1$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\sigma_0 \vdash 2 \Rightarrow 2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma_0 \vdash 1 + 2 \Rightarrow 3$}
\end{prooftree}
\\]

(C) 몸통의 계산:

\\[
\begin{prooftree}
\AxiomC{$\texttt{x} \in \text{Dom}(\sigma_2)$}
\LeftLabel{$\texttt{Id}$}
\UnaryInfC{$\sigma_2 \vdash \texttt{x} \Rightarrow 3$}
\end{prooftree}
\qquad
\text{where} \quad \sigma_1 = [\texttt{x} \mapsto v], \quad \sigma_2 = [\texttt{x} \mapsto 3]
\\]

바깥 `App` 규칙의 세 전제는 차례로 함수 식 \\( e_0 = \texttt{f}(\texttt{f}) \\)가 클로저 \\( \langle \lambda x.e_2, \sigma' \rangle \\)로 계산되는 것, 인자 식 \\( e_1 = 1 + 2 \\)가 \\( v_1 \\)으로 계산되는 것, 몸통 \\( e_2 \\)를 \\( \sigma'[x \mapsto v_1] \\)에서 계산하는 것입니다.
- (A) `f(f)`도 함수 적용이므로 다시 `App` 규칙을 씁니다. 함수 식 `f`와 인자 식 `f`는 모두 \\( \sigma_0 \\)에서 \\( v \\)로 계산됩니다. 몸통 `x`는 클로저 \\( v \\)에 담긴 환경 \\( \varnothing \\)을 확장한 \\( \sigma_1 = [\texttt{x} \mapsto v] \\)에서 계산되어 \\( v \\)가 됩니다. 따라서 바깥 `App`에서 \\( \sigma' = \varnothing \\), \\( x = \texttt{x} \\), \\( e_2 = \texttt{x} \\)입니다.
- (B) `Add`와 `Num`으로 \\( 1 + 2 \Rightarrow 3 \\)입니다.
- (C) 몸통 `x`는 \\( \sigma' [\texttt{x} \mapsto 3] = [\texttt{x} \mapsto 3] \\)에서 계산합니다. \\( \sigma_0[\texttt{x} \mapsto 3] \\)이 아니라는 점이 중요합니다. 클로저의 환경이 비어 있기 때문입니다.

[← 문제로](./first-class-functions.md#ex-first-class-functions-7)

## [람다 계산](./lambda-calculus.md)

<a id="ans-lambda-calculus-7"></a>
**7번.**

(a) 새 변수 이름을 `p0`, `p1`, `c0`, `c1`처럼 고르면 다음과 같습니다.

```pl
/* FAE + conditionals */
val p0 = c0 => if (c0) 1 else (c1 => if (c1) 2 else 3);
val x = p0(true);
val y = p0(false);
val p1 = y;
val a = p1(true);
val b = p1(false);
x + a * b
```

첫 번째 `val (x, y) = ...`는 둘째 규칙으로 `val p0 = (1, (2, 3)); val x = p0(true); val y = p0(false); ...`가 되고, 그 안의 쌍 `(1, (2, 3))`과 `(2, 3)`이 첫째 규칙으로 `c0 => if (c0) 1 else ...`, `c1 => if (c1) 2 else 3`이 됩니다. 두 번째 `val (a, b) = y`도 같은 방식으로 바뀝니다. 새 변수는 서로 겹치지 않고 `x`, `y`, `a`, `b`와도 달라야 합니다.

(b) `7`입니다. `Pair` 규칙으로 `(1, (2, 3))`은 쌍 값 \\( (1, (2, 3)) \\)이 되고, `Match` 규칙으로 `x`는 1, `y`는 \\( (2, 3) \\)에 묶입니다. 다시 `Match`로 `a`는 2, `b`는 3에 묶이므로 `x + a * b`는 \\( 1 + 2 \times 3 = 7 \\)입니다. (a)의 결과를 계산해도 `p0(true)`는 1, `p0(false)`는 `c1 => ...`, `p1(true)`는 2, `p1(false)`는 3이 되어 같은 7이 나옵니다.

(c) 항상 같지는 않습니다. 반례는 `(42, x)`입니다.
- 새 규칙: `Pair` 규칙은 두 원소를 **곧바로** 계산합니다. 그런데 \\( \texttt{x} \notin \text{Dom}(\varnothing) \\)이므로 `x`에 `Id` 규칙을 쓸 수 없고, 자유 식별자 오류가 납니다.
- 설탕 제거: `c0 => if (c0) 42 else x`가 됩니다. 이것은 함수 정의이므로 몸통을 계산하지 않고 클로저 \\( \langle \lambda \texttt{c0}.\texttt{if}\ (\texttt{c0})\ 42\ \texttt{else}\ \texttt{x}, \varnothing \rangle \\)가 되어 오류 없이 끝납니다.

설탕 제거한 쌍은 원소를 \\( \lambda \\) 안에 넣어 두므로, 원소는 쌍을 만들 때가 아니라 `z(true)`나 `z(false)`로 **꺼낼 때마다** 계산됩니다. 그래서 오류가 나는 시점이 달라지고, 한 번도 꺼내지 않은 원소의 오류는 아예 나지 않습니다. 다른 반례로 `val (a, b) = (c => if (c) 1 else 2); a + b`도 있습니다. 새 규칙에서는 `=` 오른쪽이 쌍 값이 아니라 클로저이므로 `Match`를 쓸 수 없어 오류가 나지만, 설탕 제거하면 쌍과 함수를 구별할 수 없으므로 `3`이 됩니다.

[← 문제로](./lambda-calculus.md#ex-lambda-calculus-7)

<a id="ans-lambda-calculus-8"></a>
**8번.**

\\[
\begin{array}{lcl}
\mathcal{D}⟦ \texttt{foldr}\ e_0\ e_1\ e_2 ⟧ &=& \mathcal{D}⟦ e_0 ⟧(\mathcal{D}⟦ e_2 ⟧)(\mathcal{D}⟦ e_1 ⟧) \\\\
\mathcal{D}⟦ e_0\ \texttt{++}\ e_1 ⟧ &=& \lambda x.\lambda y.\mathcal{D}⟦ e_0 ⟧(x)(\mathcal{D}⟦ e_1 ⟧(x)(y))
\end{array}
\\]

둘째 규칙의 \\( x \\)와 \\( y \\)는 \\( e_0 \\), \\( e_1 \\)에 자유롭게 나타나지 않는 새 변수입니다.

주어진 두 규칙으로 리스트를 설탕 제거해 보면 무엇을 나타내는지 보입니다. 예를 들어 \\( 1\ \texttt{::}\ 2\ \texttt{::}\ \texttt{nil} \\)은 β-동치로 다음과 같습니다.

\\[
\begin{array}{rcl}
\mathcal{D}⟦ 1\ \texttt{::}\ 2\ \texttt{::}\ \texttt{nil} ⟧
&=& \lambda x.\lambda y.x(1)(\mathcal{D}⟦ 2\ \texttt{::}\ \texttt{nil} ⟧(x)(y)) \\\\
&=& \lambda x.\lambda y.x(1)(x(2)(\mathcal{D}⟦ \texttt{nil} ⟧(x)(y))) \\\\
&=& \lambda x.\lambda y.x(1)(x(2)(y))
\end{array}
\\]

즉 리스트는 "두 원소를 합치는 함수 \\( x \\)와 초깃값 \\( y \\)를 받아 리스트를 오른쪽부터 접은 결과를 내는 함수"이고, 리스트가 곧 자기 자신의 `foldr`입니다. 처치 수 \\( \mathcal{D}⟦ n ⟧ \\)이 "\\( f \\)를 \\( n \\)번 적용하는 함수"였던 것과 같은 생각입니다.
- `foldr`: 리스트에 합치는 함수 \\( \mathcal{D}⟦ e_2 ⟧ \\)를 먼저, 초깃값 \\( \mathcal{D}⟦ e_1 ⟧ \\)을 나중에 넘기면 됩니다. `foldr`의 인자 순서(리스트, 초깃값, 함수)와 리스트가 받는 인자 순서(함수, 초깃값)가 다르다는 점에 주의하세요. 첫 예는 \\( (\lambda x.\lambda y.x(1)(x(2)(x(3)(x(4)(y)))))(\lambda x.\lambda y.x + y)(0) \\)이 되어 \\( 1 + (2 + (3 + (4 + 0))) = 10 \\)입니다.
- `++`: \\( e_0 \\)의 원소들 뒤에 \\( e_1 \\)의 원소들이 오는 리스트를 접으면, 먼저 \\( e_1 \\)을 \\( x \\)와 \\( y \\)로 접은 결과 \\( \mathcal{D}⟦ e_1 ⟧(x)(y) \\)를 얻고, 그것을 초깃값으로 삼아 \\( e_0 \\)을 접은 것과 같습니다. 예를 들어 \\( [1] \texttt{ ++ } [2, 3] \\)은 \\( \lambda x.\lambda y.x(1)(x(2)(x(3)(y))) \\)와 β-동치입니다. 처치 수의 덧셈 \\( \lambda f.\lambda x.\mathcal{D}⟦ e_1 ⟧(f)(\mathcal{D}⟦ e_2 ⟧(f)(x)) \\)과 같은 꼴입니다.

FAE 인터프리터로 설탕 제거한 식을 실행하면 두 예는 각각 `10`과 `120`이 나오고, 순서를 확인하는 `foldr ((1 :: nil) ++ (2 :: 3 :: nil)) 0 (x => y => x + y * 10)`은 `321`(= \\( 1 + (2 + (3 + 0 \times 10) \times 10) \times 10 \\))이 나옵니다.

[← 문제로](./lambda-calculus.md#ex-lambda-calculus-8)

## [재귀 함수](./recursive-functions.md)

<a id="ans-recursive-functions-6"></a>
**6번.** `x => fY(fY)(x)` (매개변수 이름은 아무것이나 됩니다)

`g = fY => body(???)`라 하면 `mkRec(body)`는 `f(g)`, 곧 `g(g)`이고, 이것은 `fY`에 `g`를 묶고 `body(???)`를 계산합니다. 우리가 원하는 것은 `body`에 넘기는 인자가 재귀 함수 `fac` 자신이 되는 것입니다. 그런데 `fac`은 `mkRec(body)` = `g(g)` = `fY(fY)`이므로, `???` 자리에 `fY(fY)`와 같은 함수를 넣으면 됩니다.

하지만 `fY(fY)`를 그대로 넣으면 안 됩니다. 인자를 먼저 계산하는 언어이므로 `body(fY(fY))`를 계산하려면 먼저 `fY(fY)` = `g(g)`를 계산해야 하고, 그러려면 다시 `body(fY(fY))`의 인자 `fY(fY)`를 계산해야 하므로 끝없이 되풀이됩니다(실제로 실행하면 스택이 넘칩니다). 그래서 본문의 `mkRec`처럼 η-확장 `x => fY(fY)(x)`로 `fY(fY)`의 계산을 **함수가 실제로 호출될 때까지** 미룹니다. `x => fY(fY)(x)`는 이미 값(클로저)이므로 곧바로 `body`에 넘어가고, `fac(n + -1)`이 호출될 때에야 `fY(fY)`가 계산되어 다음 단계의 `fac`을 만듭니다. 실행하면 `720`이 나옵니다.

[← 문제로](./recursive-functions.md#ex-recursive-functions-6)

<a id="ans-recursive-functions-7"></a>
**7번.**

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \texttt{true}$}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1$}
\LeftLabel{$\texttt{And}_T$}
\BinaryInfC{$\sigma \vdash e_0\ \mathtt{\\&\\&}\ e_1 \Rightarrow v_1$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \texttt{false}$}
\LeftLabel{$\texttt{And}_F$}
\UnaryInfC{$\sigma \vdash e_0\ \mathtt{\\&\\&}\ e_1 \Rightarrow \texttt{false}$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \texttt{true}$}
\LeftLabel{$\texttt{Or}_T$}
\UnaryInfC{$\sigma \vdash e_0\ \texttt{||}\ e_1 \Rightarrow \texttt{true}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \texttt{false}$}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1$}
\LeftLabel{$\texttt{Or}_F$}
\BinaryInfC{$\sigma \vdash e_0\ \texttt{||}\ e_1 \Rightarrow v_1$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e \Rightarrow b$}
\LeftLabel{$\texttt{Not}$}
\UnaryInfC{$\sigma \vdash \texttt{!}\ e \Rightarrow \neg b$}
\end{prooftree}
\\]

요구 사항을 하나씩 확인해 봅시다.
- **단락 계산**: \\( \texttt{And}_F \\)와 \\( \texttt{Or}_T \\)에는 오른쪽 피연산자 \\( e_1 \\)의 계산이 전제에 없습니다. 그래서 `false && 1(2)`와 `true || 1(2)`에서는 `1(2)`를 계산하지 않고 각각 `false`, `true`가 됩니다. 조건식에서 계산하지 않는 갈래가 전제에 나타나지 않았던 것과 같습니다.
- **왼쪽은 불리언**: 네 규칙 모두 왼쪽 피연산자의 값이 `true`나 `false`여야 쓸 수 있습니다. `1 && 2`는 왼쪽 값이 1이라 쓸 수 있는 규칙이 없어 계산이 막히고, 인터프리터에서는 오류가 됩니다.
- **오른쪽은 아무 값이나**: \\( \texttt{And}_T \\)와 \\( \texttt{Or}_F \\)의 결과는 오른쪽 값 \\( v_1 \\) 그대로이고 \\( v_1 \\)이 불리언인지 따지지 않습니다. 그래서 `true && 1`은 `1`입니다.
- **부정**: 피연산자가 불리언 \\( b \\)일 때만 그 반대 \\( \neg b \\)가 됩니다.

같은 의미를 설탕 제거로 정의할 수도 있습니다. \\( \mathcal{D}⟦ e_1\ \mathtt{\\&\\&}\ e_2 ⟧ = \texttt{if}\ (\mathcal{D}⟦ e_1 ⟧)\ \mathcal{D}⟦ e_2 ⟧\ \texttt{else}\ \texttt{false} \\), \\( \mathcal{D}⟦ e_1\ \texttt{||}\ e_2 ⟧ = \texttt{if}\ (\mathcal{D}⟦ e_1 ⟧)\ \texttt{true}\ \texttt{else}\ \mathcal{D}⟦ e_2 ⟧ \\), \\( \mathcal{D}⟦ \texttt{!}\ e ⟧ = \texttt{if}\ (\mathcal{D}⟦ e ⟧)\ \texttt{false}\ \texttt{else}\ \texttt{true} \\)로 두면 `If`\\( _T \\), `If`\\( _F \\) 규칙 덕분에 위 규칙과 같은 결과가 나옵니다.

[← 문제로](./recursive-functions.md#ex-recursive-functions-7)

## [변경 가능한 자료 구조](./mutable-data-structures.md)

<a id="ans-mutable-data-structures-7"></a>
**7번.**

**(a)** 최적화 결과는 `b.set(1); f(42)`이고, 이 최적화는 **올바릅니다**.

바깥 `SetBox`의 상자 자리 `Box(b.set(1))`을 최적화하면 `NewBox(SetBox(Id(b), Num(1)))`이 그대로 나오므로(안쪽 `b.set(1)`의 상자 자리 `b`는 `NewBox`가 아닙니다) 첫 번째 경우에 걸려 `Seq(SetBox(Id(b), Num(1)), App(Id(f), Num(42)))`가 됩니다.

올바른 이유를 규칙으로 비교해 봅시다. 원래 식 `Box(e1).set(e2)`는 `SetBox`와 `NewBox` 규칙에 따라 다음과 같이 계산됩니다.
1. \\( \sigma, M \vdash e_1 \Rightarrow v_1, M_1 \\)
2. 새 주소 \\( a \notin \text{Dom}(M_1) \\)을 골라 \\( M_1[a \mapsto v_1] \\)을 만듭니다.
3. \\( \sigma, M_1[a \mapsto v_1] \vdash e_2 \Rightarrow v_2, M_2 \\)
4. 결과는 \\( v_2, M_2[a \mapsto v_2] \\)입니다.

최적화한 식 `e1; e2`는 `Seq` 규칙에 따라 1을 똑같이 한 뒤 \\( \sigma, M_1 \vdash e_2 \Rightarrow v_2', M_2' \\)를 계산하고 결과는 \\( v_2' \\)입니다. 두 계산의 차이는 주소 \\( a \\)의 칸 하나가 더 있느냐뿐입니다. \\( a \\)는 방금 만든 새 주소라서 환경 \\( \sigma \\)에도, 메모리에 들어 있는 어떤 값에도 나타나지 않습니다. 따라서 \\( e_2 \\)는 \\( a \\)의 칸을 읽거나 고칠 방법이 없고, 계산이 끝난 뒤에도 그 칸에 닿을 수 있는 식이 없습니다. `malloc`이 고르는 주소가 하나씩 밀릴 수는 있지만, BFAE에는 주소를 숫자처럼 비교하거나 꺼내 볼 방법이 없으므로 결과가 숫자이면 같은 숫자, 상자이면 상자, 함수이면 함수입니다. \\( e_1 \\)이나 \\( e_2 \\)가 오류를 내거나 끝나지 않는 경우도 두 식에서 똑같이 일어납니다. 원래 식에서 `Box(...)`와 `.set`은 그 자체로 오류를 낼 수 없기 때문입니다.

**(b)** 최적화 결과는 `x.set(42)`이고, 이 최적화는 **올바르지 않습니다**.

반례는 `{ Box(1).set(42); Box(1).get }`입니다. 원래 식에서 두 `Box(1)`은 **서로 다른** 상자를 만듭니다. 첫 상자의 내용을 42로 바꾼 뒤 둘째 상자의 내용을 읽으므로 결과는 `1`입니다. 최적화한 식 `Box(1).set(42)`의 결과는 `42`입니다.

조건 `b == b2`는 두 식이 **문법적으로** 같다는 뜻일 뿐, 두 식이 같은 상자로 계산된다는 보장이 없습니다. 또 최적화로 지운 `b2`의 계산이 부수 효과를 가질 수도 있습니다. 예를 들어 다음 식은 `f`를 부를 때마다 `count`를 1씩 늘립니다.

```bfae,run
/* BFAE */
val count = Box(0);
val f = x => { count.set(count.get + 1); x };
val b = Box(0);
{ f(b).set(42); f(b).get }; count.get
```

원래 식은 `f`를 두 번 불러 `2`가 되지만, 최적화한 식에서는 `f(b).get`이 사라져 `f`를 한 번만 부르므로 `1`이 됩니다.

[← 문제로](./mutable-data-structures.md#ex-mutable-data-structures-7)

## [변경 가능한 변수](./mutable-variables.md)

<a id="ans-mutable-variables-5"></a>
**5번.** `4`

빈 메모리에서 시작해 `malloc`이 0, 1, 2, ... 순서로 주소를 고른다고 하고 따라가 봅시다.
1. `var f = ...`: 초기화 식이 식별자가 아니므로 원래 `Var` 규칙을 씁니다. `f`는 주소 0에 클로저를 담습니다.
2. `var x = 1`: `x`는 주소 1에 1을 담습니다.
3. `var y = x`: 초기화 식이 식별자이므로 \\( \texttt{Var}\_x \\) 규칙을 씁니다. 새 칸을 만들지 않고 `y`를 `x`의 주소 1에 묶습니다. 이제 `x`와 `y`는 같은 칸을 가리키는 **별칭**입니다.
4. `f(x)`: 함수 호출은 원래 `App` 규칙(값에 의한 호출)이므로, 인자 `x`의 값 1을 새 주소 2에 복사하고 `z`를 주소 2에 묶습니다. `z = z * 5`는 주소 2를 5로 바꿀 뿐이고 주소 1은 그대로 1입니다.
5. `y++`: `Inc` 규칙으로 주소 1의 값 1을 돌려주고 주소 1을 2로 바꿉니다.
6. `y * x++`: 왼쪽 `y`는 주소 1의 값 2입니다. 오른쪽 `x++`는 같은 주소 1의 값 2를 돌려주고 주소 1을 3으로 바꿉니다. 결과는 \\( 2 \times 2 = 4 \\)입니다.

별칭이 없는 보통 MFAE였다면 `y++`가 `x`에 영향을 주지 않아 `y * x++` = \\( 2 \times 1 = 2 \\)였을 것입니다. 함수 인자는 값으로, 변수 정의는 참조로 넘긴다는 비대칭과, 후위 증가가 늘리기 전의 값을 돌려준다는 점을 함께 챙겨야 하는 문제입니다.

[← 문제로](./mutable-variables.md#ex-mutable-variables-5)

<a id="ans-mutable-variables-6"></a>
**6번.**

(a)

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Fun}$}
\UnaryInfC{$\sigma, M \vdash \lambda x.e \Rightarrow \langle \lambda (x\texttt{=}\bot).e, \sigma \rangle, M$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_0 \Rightarrow v_0, M_0$}
\LeftLabel{$\texttt{Fun}_d$}
\UnaryInfC{$\sigma, M \vdash \lambda (x\texttt{=}e_0).e_1 \Rightarrow \langle \lambda (x\texttt{=}v_0).e_1, \sigma \rangle, M_0$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow \langle \lambda (x\texttt{=}\\_).e_3, \sigma' \rangle, M_1$}
\AxiomC{$\sigma, M_1 \vdash e_2 \Rightarrow v_2, M_2$}
\noLine
\BinaryInfC{$a \notin \text{Dom}(M_2) \qquad \sigma'[x \mapsto a], M_2[a \mapsto v_2] \vdash e_3 \Rightarrow v_3, M_3$}
\LeftLabel{$\texttt{App}$}
\UnaryInfC{$\sigma, M \vdash e_1(e_2) \Rightarrow v_3, M_3$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow \langle \lambda (x\texttt{=}v_2).e_3, \sigma' \rangle, M_1 \qquad a \notin \text{Dom}(M_1)$}
\noLine
\UnaryInfC{$\sigma'[x \mapsto a], M_1[a \mapsto v_2] \vdash e_3 \Rightarrow v_3, M_3$}
\LeftLabel{$\texttt{App}_d$}
\UnaryInfC{$\sigma, M \vdash e_1() \Rightarrow v_3, M_3$}
\end{prooftree}
\\]

인터프리터의 네 경우를 그대로 옮긴 것입니다.
- `Fun`: 기본 인자가 없으면 \\( x\texttt{=}\bot \\)인 클로저를 만들고 메모리는 그대로입니다.
- \\( \texttt{Fun}\_d \\): 기본 인자 식 \\( e_0 \\)을 **함수를 정의할 때** 계산해 그 값 \\( v_0 \\)을 클로저에 담습니다. \\( e_0 \\)이 메모리를 바꿀 수 있으므로 결과 메모리는 \\( M_0 \\)입니다. 클로저의 몸통은 \\( e_1 \\)입니다.
- `App`: `CloV(param, _, body, fenv)`처럼 기본 인자가 있든 없든(\\( x\texttt{=}\\_ \\)) 받은 인자를 쓰고, 나머지는 MFAE의 `App` 규칙과 같습니다.
- \\( \texttt{App}\_d \\): 클로저에 기본 인자 값 \\( v_2 \\)가 있어야 하고(없으면 쓸 규칙이 없어 오류), 인자를 계산하지 않고 새 주소 \\( a \\)에 \\( v_2 \\)를 담아 몸통을 계산합니다.

(b) 첫 번째 식은 `42`, 두 번째 식은 `40`입니다.

**첫 번째 식.** `f`를 정의할 때 \\( \texttt{Fun}\_d \\)로 `Box(0)`이 **한 번** 계산되어 상자 \\( a_0 \\)이 만들어지고, `f`의 클로저에 기본 인자 값 \\( a_0 \\)이 담깁니다. `f()`를 두 번 부르면 \\( \texttt{App}\_d \\)가 매번 매개변수 `box`를 위한 새 칸을 만들지만, 두 칸에 담기는 값은 모두 **같은 상자** \\( a_0 \\)입니다. 따라서 `x`와 `y`는 상자 \\( a_0 \\)을 함께 씁니다.
- `{ x(1); x(2); x(3) }`: \\( a_0 \\)의 내용이 0 → 1 → 3 → 6이 되고, 블록의 값은 마지막 `set`의 값 6입니다.
- `{ y(10); y(20) }`: 이어서 \\( a_0 \\)의 내용이 6 → 16 → 36이 되고, 블록의 값은 36입니다.

결과는 \\( 6 + 36 = 42 \\)입니다. 호출할 때마다 새 상자가 만들어진다고 생각하면 \\( 6 + 30 = 36 \\)이라고 틀리기 쉽습니다. Python의 기본 인자에서 자주 만나는 함정과 같습니다.

**두 번째 식.**
- `var f = (k=0) => ...`: 기본 인자 0이 클로저에 담깁니다.
- `var g = f()`: `k`가 0인 채로 `f`의 몸통 `(box=Box(k)) => box`를 계산합니다. 이것은 \\( \texttt{Fun}\_d \\)이므로 여기서 `Box(k)`가 계산되어 내용이 0인 상자 \\( a \\)가 만들어지고, `g`는 기본 인자 값이 \\( a \\)인 클로저입니다.
- `var x = g()`, `var y = g()`: 둘 다 같은 상자 \\( a \\)입니다.
- `var z = f()()`: `f()`를 **다시** 부르므로 \\( \texttt{Fun}\_d \\)가 다시 계산되어 새 상자 \\( b \\)가 만들어지고, `z`는 \\( b \\)입니다.
- `{ inc(x); inc(x) }`: \\( a \\)가 0 → 1 → 2이고 값은 2입니다.
- `{ inc(y); inc(y); inc(y) }`: 같은 상자 \\( a \\)가 2 → 3 → 4 → 5이고 값은 5입니다.
- `{ inc(z); ... }`: 상자 \\( b \\)가 0 → 1 → 2 → 3 → 4이고 값은 4입니다.

곱셈은 왼쪽부터 계산하므로 결과는 \\( 2 \times 5 \times 4 = 40 \\)입니다.

[← 문제로](./mutable-variables.md#ex-mutable-variables-6)

## [쓰레기 수집](./garbage-collection.md)

<a id="ans-garbage-collection-6"></a>
**6번.** 굵게 표시한 칸은 그 줄을 실행하면서 값이 바뀐 칸입니다(해제되어 X가 된 칸은 따로 표시하지 않았습니다).

(A) `y = x`를 실행한 뒤:

스택:

| 주소 | 16 | 17 | 18 | 19 |
|---|---|---|---|---|
| 값 | 8 | **8** | X | X |

힙:

| 주소 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| 값 | X | X | X | X | X | 1 | 2 | 0 |
| **주소** | **8** | **9** | **10** | **11** | **12** | **13** | **14** | **15** |
| 값 | **2** | 7 | 11 | **1** | 1 | 5 | X | X |

(B) `x.tail = x.tail.tail`까지 실행한 뒤:

스택:

| 주소 | 16 | 17 | 18 | 19 |
|---|---|---|---|---|
| 값 | 8 | 8 | X | X |

힙:

| 주소 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| 값 | X | X | X | X | X | 1 | 2 | 0 |
| **주소** | **8** | **9** | **10** | **11** | **12** | **13** | **14** | **15** |
| 값 | 2 | 7 | **5** | X | X | X | X | X |

먼저 처음 메모리를 읽어 둡시다. 주소 8의 `Cons(7, ·)`(참조 횟수 1, `x`가 가리킴), 주소 1의 `Cons(5, ·)`(참조 횟수 1, `y`가 가리킴)는 둘 다 주소 11의 `Cons(1, ·)`을 가리키므로 11의 참조 횟수는 2입니다. 11은 주소 5의 `Cons(2, null)`을 가리키고, 5의 참조 횟수는 1입니다.

(A) 스택 주소 17의 값이 1에서 8로 바뀝니다.
- 새로 가리키는 8의 참조 횟수가 1 → 2가 됩니다.
- 원래 가리키던 1의 참조 횟수가 1 → 0이 되어 주소 1 ~ 3이 해제됩니다.
- 해제된 `Cons`는 11을 가리키고 있었으므로, 11의 참조 횟수가 2 → 1로 연쇄해서 줄어듭니다.

(B) `x.tail.tail`은 8 → 11 → 5를 따라가 주소 5이므로, 주소 10(8의 `tail` 칸)의 값을 11에서 5로 바꿉니다.
- 새로 가리키는 5의 참조 횟수가 1 → 2가 됩니다.
- 원래 가리키던 11의 참조 횟수가 1 → 0이 되어 주소 11 ~ 13이 해제됩니다.
- 해제된 `Cons`는 5를 가리키고 있었으므로 5의 참조 횟수가 2 → 1이 됩니다.

(B)에서 늘리기와 줄이기의 순서가 중요합니다. 11을 먼저 줄이면 11이 해제되면서 5의 참조 횟수가 1 → 0이 되어 5까지 해제되고, 그 뒤에 해제된 칸을 가리키게 됩니다.

[← 문제로](./garbage-collection.md#ex-garbage-collection-6)

<a id="ans-garbage-collection-7"></a>
**7번.** 굵게 표시한 칸은 GC가 고친 칸입니다.

레지스터: 16

from-space:

| 주소 | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
|---|---|---|---|---|---|---|---|---|
| 값 | 0 | 3 | 0 | **99** | **20** | **99** | **16** | 5 |
| **주소** | **8** | **9** | **10** | **11** | **12** | **13** | **14** | **15** |
| 값 | 5 | **99** | **18** | 2 | 9 | 11 | 2 | 5 |

to-space:

| 주소 | 16 | 17 | 18 | 19 | 20 | 21 | 22 | 23 |
|---|---|---|---|---|---|---|---|---|
| 값 | 4 | 18 | 7 | 20 | 8 | 16 | 0 | 0 |
| **주소** | **24** | **25** | **26** | **27** | **28** | **29** | **30** | **31** |
| 값 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |

처음 메모리에서 레지스터가 가리키는 주소 5의 `Node(4, ·)`은 9의 `Node(7, ·)`을, 9는 3의 `Node(8, ·)`을, 3은 다시 5를 가리키는 순환입니다. 주소 7의 `Node(5, ·)`(원래의 첫 노드)와 주소 1의 `Node(3, null)`은 도달할 수 없는 쓰레기입니다.

복사는 다음 순서로 일어납니다.
1. 뿌리가 가리키는 5를 16으로 복사합니다. to-space에 `4, 9`를 적고, from-space의 5, 6에 `99, 16`을 남기고, 레지스터를 16으로 고칩니다.
2. 16을 훑습니다. `next` 칸 17의 값 9에는 전달 포인터가 없으므로 9를 18로 복사합니다(`7, 3`, from-space의 9, 10에 `99, 18`). 17을 18로 고칩니다.
3. 18을 훑습니다. `next` 칸 19의 값 3을 20으로 복사합니다(`8, 5`, from-space의 3, 4에 `99, 20`). 19를 20으로 고칩니다.
4. 20을 훑습니다. `next` 칸 21의 값 5에는 **이미 전달 포인터**(주소 5의 99)가 있으므로 다시 복사하지 않고, 주소 6에 적힌 새 주소 16으로 21을 고칩니다.
5. 더 훑을 객체가 없으므로 끝납니다.

순환이 있어도 전달 포인터 덕분에 각 노드는 한 번씩만 복사되고, to-space의 16 ~ 21에 빈틈없이 놓입니다. from-space의 나머지 칸(쓰레기였던 노드들)은 손대지 않은 채 공간 전체가 한꺼번에 비워집니다.

[← 문제로](./garbage-collection.md#ex-garbage-collection-7)

## [지연 계산](./lazy-evaluation.md)

<a id="ans-lazy-evaluation-6"></a>
**6번.**

- (a) \\(\langle\mkern-3mu\langle \texttt{x}, [\texttt{x} \mapsto \langle\mkern-3mu\langle 2 \texttt{ \* } 3, \varnothing \rangle\mkern-3mu\rangle] \rangle\mkern-3mu\rangle\\)
- (b) \\(\langle\mkern-3mu\langle \texttt{z} \texttt{ + } \texttt{y}, \sigma_0[\texttt{z} \mapsto \langle\mkern-3mu\langle \texttt{y} \texttt{ + } 1, \sigma_0 \rangle\mkern-3mu\rangle] \rangle\mkern-3mu\rangle\\), 여기서 \\(\sigma_0 = [\texttt{f} \mapsto \langle \lambda \texttt{x}.\texttt{x}, \varnothing \rangle, \texttt{y} \mapsto 10]\\)

(a) 바깥 `App`에서 함수 위치는 클로저 \\(\langle \lambda \texttt{x}.(\lambda \texttt{y}.\texttt{y})(\texttt{x}), \varnothing \rangle\\)이고, 인자 `2 * 3`은 계산하지 않고 식 값으로 넘깁니다. 몸통은 \\(\sigma_1 = [\texttt{x} \mapsto \langle\mkern-3mu\langle 2 \texttt{ \* } 3, \varnothing \rangle\mkern-3mu\rangle]\\)에서 계산합니다. 안쪽 `App`에서도 인자 `x`를 계산하지 않고 \\(\langle\mkern-3mu\langle \texttt{x}, \sigma_1 \rangle\mkern-3mu\rangle\\)로 `y`에 묶습니다. 몸통 `y`는 `Id` 규칙으로 이 식 값을 그대로 돌려줍니다. `Id`는 엄격한 계산을 하지 않으므로 `2 * 3`도, `x`도 끝까지 계산되지 않습니다.

(b) `Val` 규칙으로 `f`에는 클로저 \\(\langle \lambda \texttt{x}.\texttt{x}, \varnothing \rangle\\)이 묶이고, `y`에는 `2 * 5`를 **곧바로** 계산한 값이 묶입니다. 곱셈은 피연산자에 엄격한 계산을 하므로 그 값은 식 값이 아니라 10입니다. 이렇게 \\(\sigma_0\\)이 만들어집니다. 마지막 줄의 함수 위치는 클로저 \\(\langle \lambda \texttt{z}.\texttt{f}(\texttt{z} \texttt{ + } \texttt{y}), \sigma_0 \rangle\\)이고, 인자 `y + 1`은 \\(\langle\mkern-3mu\langle \texttt{y} \texttt{ + } 1, \sigma_0 \rangle\mkern-3mu\rangle\\)로 `z`에 묶여 \\(\sigma_2 = \sigma_0[\texttt{z} \mapsto \langle\mkern-3mu\langle \texttt{y} \texttt{ + } 1, \sigma_0 \rangle\mkern-3mu\rangle]\\)이 됩니다. `f(z + y)`에서 함수 위치 `f`는 이미 클로저이고, 인자 `z + y`는 \\(\langle\mkern-3mu\langle \texttt{z} \texttt{ + } \texttt{y}, \sigma_2 \rangle\mkern-3mu\rangle\\)로 `x`에 묶입니다. 몸통 `x`는 이것을 그대로 돌려주므로 결과는 \\(\langle\mkern-3mu\langle \texttt{z} \texttt{ + } \texttt{y}, \sigma_2 \rangle\mkern-3mu\rangle\\)입니다. 덧셈 `z + y`는 결과 안에 미뤄진 채로 남습니다.

본문의 \\(\textsf{LFAE}\\)처럼 `val`을 설탕으로 보았다면 `f`와 `y`에도 식 값이 묶였을 것입니다. 이 문제에서 `y`가 10이라는 점은 `Val` 규칙을 바꾸지 않았기 때문입니다.

[← 문제로](./lazy-evaluation.md#ex-lazy-evaluation-6)

<a id="ans-lazy-evaluation-7"></a>
**7번.** 예를 들어 다음 식은 원래 FAE에서 `1`, 바뀐 의미에서 `2`입니다.

```pl
/* FAE */
val x = 1;
val f = x => y => y;
f(2)(x)
```

- 원래 FAE: 마지막 줄의 인자 `x`는 호출하는 쪽의 환경에서 곧바로 1로 계산되어 `y`에 묶이므로 결과는 1입니다.
- 바뀐 의미: `f(2)`를 계산하면 `x`에 \\(\langle\mkern-3mu\langle 2 \rangle\mkern-3mu\rangle\\)이 묶인 환경을 담은 클로저 \\(\langle \lambda \texttt{y}.\texttt{y}, [\texttt{x} \mapsto \langle\mkern-3mu\langle 2 \rangle\mkern-3mu\rangle] \rangle\\)가 나옵니다(`f`의 클로저 환경 \\([\texttt{x} \mapsto 1]\\)에 있던 `x`를 매개변수 `x`가 덮어씁니다). 이 클로저를 인자 `x`에 적용하면 인자는 계산되지 않고 식 \\(\langle\mkern-3mu\langle \texttt{x} \rangle\mkern-3mu\rangle\\)으로 `y`에 묶여, 몸통은 \\([\texttt{x} \mapsto \langle\mkern-3mu\langle 2 \rangle\mkern-3mu\rangle, \texttt{y} \mapsto \langle\mkern-3mu\langle \texttt{x} \rangle\mkern-3mu\rangle]\\)에서 계산됩니다. 몸통 `y`는 \\(\texttt{Id}\_E\\)로 식 `x`를 **이 환경에서** 계산하고, 그 `x`는 다시 \\(\texttt{Id}\_E\\)로 2가 됩니다. 결과는 2입니다.

인자 식 `x`는 원래 호출하는 쪽의 `x`(값 1)를 뜻했는데, 환경 없이 식만 들고 다니다 보니 함수 안에서 같은 이름으로 다시 묶인 `x`(값 2)로 계산되었습니다. 이처럼 미뤄 둔 식 속의 이름이 다른 곳의 같은 이름에 붙잡히는 것을 변수 포획이라고 하며, 결과적으로 동적 스코핑과 비슷하게 동작합니다. 본문의 \\(\textsf{LFAE}\\)가 식 값 \\(\langle\mkern-3mu\langle e, \sigma \rangle\mkern-3mu\rangle\\)에 **정의된 곳의 환경** \\(\sigma\\)를 함께 담는 이유가 바로 이것입니다. 클로저가 함수와 정의 환경을 함께 담는 것과 같은 생각입니다.

이 밖에도 인자 식의 이름이 함수 안에서 다른 값으로 다시 묶이는 식이면 모두 답이 됩니다.

[← 문제로](./lazy-evaluation.md#ex-lazy-evaluation-7)

## [컨티뉴에이션](./continuations.md)

<a id="ans-continuations-7"></a>
**7번.** \\(\kappa_0 = (\varnothing \vdash \lambda \texttt{y}.\texttt{y}) :: (\texttt{@}) :: \square\\)이고, \\(v = \langle \lambda \texttt{y}.\texttt{y}, \varnothing \rangle\\)이라 쓰면 처음부터 끝까지는 다음과 같습니다.

\\[
\begin{array}{rll}
& \langle (\varnothing \vdash (\texttt{vcc}\ \texttt{x};\ \texttt{x})(\lambda \texttt{y}.\texttt{y})) :: \square \mathrel{||} \blacksquare \rangle & \\\\
\to & \langle (\varnothing \vdash \texttt{vcc}\ \texttt{x};\ \texttt{x}) :: (\varnothing \vdash \lambda \texttt{y}.\texttt{y}) :: (\texttt{@}) :: \square \mathrel{||} \blacksquare \rangle & (\texttt{App}\_1) \\\\
\to & \langle ([\texttt{x} \mapsto \langle \kappa_0 \mathrel{||} \blacksquare \rangle] \vdash \texttt{x}) :: (\varnothing \vdash \lambda \texttt{y}.\texttt{y}) :: (\texttt{@}) :: \square \mathrel{||} \blacksquare \rangle & (\texttt{Vcc}) \\\\
\to & \langle (\varnothing \vdash \lambda \texttt{y}.\texttt{y}) :: (\texttt{@}) :: \square \mathrel{||} \langle \kappa_0 \mathrel{||} \blacksquare \rangle :: \blacksquare \rangle & (\texttt{Id}) \\\\
\to & \langle (\texttt{@}) :: \square \mathrel{||} v :: \langle \kappa_0 \mathrel{||} \blacksquare \rangle :: \blacksquare \rangle & (\texttt{Fun}) \\\\
\to & \langle (\varnothing \vdash \lambda \texttt{y}.\texttt{y}) :: (\texttt{@}) :: \square \mathrel{||} v :: \blacksquare \rangle & (\texttt{App}\_{2,\kappa}) \\\\
\to & \langle (\texttt{@}) :: \square \mathrel{||} v :: v :: \blacksquare \rangle & (\texttt{Fun}) \\\\
\to & \langle ([\texttt{y} \mapsto v] \vdash \texttt{y}) :: \square \mathrel{||} \blacksquare \rangle & (\texttt{App}\_2) \\\\
\to & \langle \square \mathrel{||} v :: \blacksquare \rangle & (\texttt{Id})
\end{array}
\\]

따라서 결과는 클로저 \\(\langle \lambda \texttt{y}.\texttt{y}, \varnothing \rangle\\)입니다.

- `Vcc` 걸음에서 맨 위의 할 일 \\((\varnothing \vdash \texttt{vcc}\ \texttt{x};\ \texttt{x})\\)를 뺀 나머지 \\(\kappa_0\\), 곧 "결과를 함수로 삼아 \\(\lambda \texttt{y}.\texttt{y}\\)에 적용하기"와 그때의 값 스택 \\(\blacksquare\\)이 `x`에 묶입니다. 본문 `e` = `x`의 컨티뉴에이션도 똑같이 \\(\kappa_0\\)입니다.
- 몸통 `x`의 값은 컨티뉴에이션 값이므로, 이것이 함수 자리의 값이 됩니다. 인자 \\(\lambda \texttt{y}.\texttt{y}\\)를 계산한 뒤 \\((\texttt{@})\\)에서 함수 자리에 컨티뉴에이션 값이 있으므로 \\(\texttt{App}\_{2,\kappa}\\)를 씁니다. 이 규칙은 지금의 컨티뉴에이션 \\(\square\\)과 값 스택을 버리고, 붙잡아 둔 \\(\kappa_0\\)과 \\(\blacksquare\\) 위에 인자 \\(v\\)를 올립니다. 마치 `vcc x; x` 전체의 결과가 \\(v\\)였던 것처럼 계산을 다시 이어 가는 것입니다.
- 그러면 \\(\lambda \texttt{y}.\texttt{y}\\)를 한 번 더 계산해 \\(v(v)\\)를 계산하게 되고, 항등 함수이므로 결과는 \\(v\\)입니다. 직관적으로는 \\((\texttt{vcc}\ \texttt{x};\ \texttt{x})(\lambda \texttt{y}.\texttt{y})\\)가 \\((\lambda \texttt{y}.\texttt{y})(\lambda \texttt{y}.\texttt{y})\\)로 바뀐 셈입니다.

[← 문제로](./continuations.md#ex-continuations-7)

## [일급 컨티뉴에이션](./first-class-continuations.md)

<a id="ans-first-class-continuations-6"></a>
**6번.** `35`

`val`을 설탕 제거하면 식 전체는 `(f => REST)({ vcc x; x })`이고, `REST`는 `(g => g(x => x)(5) * 7)(G)`입니다. 여기서 `G`는 `g`의 초기화 식 `{ vcc y; ... }`입니다. 작은 걸음 의미에서 `vcc`가 붙잡는 상태 \\(\langle \kappa \mathrel{||} s \rangle\\)에는 값 스택 \\(s\\)도 들어 있습니다. `val`의 초기화 식을 계산하는 동안 값 스택에는 `val` 뒤를 계산할 클로저(`f => REST`나 `g => ...`)가 놓여 있으므로, 이 컨티뉴에이션을 부르면 **같은 이름이 새 값으로 다시 묶인 채** `val` 뒤의 계산이 처음부터 다시 진행됩니다.

붙잡히는 컨티뉴에이션에 이름을 붙여 따라가 봅시다.
1. `{ vcc x; x }`: `x`에 \\(k_f\\) = "결과를 `f`에 묶고 `REST`를 계산하기"가 묶이고, 블록의 값은 \\(k_f\\) 자신입니다. 따라서 `f` = \\(k_f\\)입니다.
2. `g`의 초기화 식에서 `vcc y`: `y`에 \\(k_1\\) = "결과를 `g`에 묶고 마지막 줄을 계산하기(`f` = \\(k_f\\)인 환경에서)"가 묶입니다.
3. `val z = f(y) * 3`: `f(y)`는 \\(k_f(k_1)\\)이므로 곱셈과 `z`, `x` 정의를 모두 버리고 1의 지점으로 돌아갑니다. 이제 `f` = \\(k_1\\)인 채로 `REST`를 다시 계산합니다.
4. 다시 `vcc y`: 이번에는 `y`에 \\(k_2\\) = "결과를 `g`에 묶고 마지막 줄을 계산하기(`f` = \\(k_1\\)인 환경에서)"가 묶입니다.
5. `f(y)`는 이제 \\(k_1(k_2)\\)이므로 2의 지점으로 돌아가 `g` = \\(k_2\\)로 마지막 줄 `g(x => x)(5) * 7`을 계산합니다.
6. `g(x => x)`는 \\(k_2(\lambda \texttt{x}.\texttt{x})\\)이므로 4의 지점으로 돌아가 `g` = \\(\lambda \texttt{x}.\texttt{x}\\)로 마지막 줄을 다시 계산합니다.
7. 이번에는 `g`가 보통 함수이므로 `g(x => x)`는 \\(\lambda \texttt{x}.\texttt{x}\\), `(5)`를 적용하면 5, 여기에 7을 곱해 결과는 \\(35\\)입니다.

`val z = ...`, `val x = ...`, `y(x * 2) + 1`은 매번 `f(y)`에서 다른 곳으로 뛰어 버리므로 끝까지 한 번도 계산되지 않습니다. 컨티뉴에이션 값이 값 스택까지 담고 있어서, 다시 들어갈 때마다 `val`의 이름이 새로 묶인다는 점이 핵심입니다. \\(\textsf{KFAE}\\) 인터프리터로 실행해도 `35`가 나옵니다.

[← 문제로](./first-class-continuations.md#ex-first-class-continuations-6)
