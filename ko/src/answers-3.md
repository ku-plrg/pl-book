# 3부 연습 문제 해답

## 유계 다형성과 변성

[유계 다형성과 변성](./bounded-polymorphism.md) 장의 연습 문제 해답입니다.

<a id="ans-bounded-polymorphism-7"></a>**7번.**

- (A) \\(\Gamma \vdash \tau_1 \quad \ldots \quad \Gamma \vdash \tau_n\\)
- (B) \\(\Gamma \vdash \tau_1 \quad \Gamma[\alpha <: \tau_1] \vdash \tau_2\\)
- (C) \\(\Gamma(\alpha) = \tau\\)
- (D) \\(\alpha \notin \text{Dom}(\Gamma) \quad \Gamma \vdash \tau_1' <: \tau_1 \quad \Gamma[\alpha <: \tau_1'] \vdash \tau_2 <: \tau_2'\\)
- (E) \\(\alpha \notin \text{Dom}(\Gamma) \quad \Gamma \vdash \tau_1 \quad \Gamma[\alpha <: \tau_1] \vdash e : \tau_2\\)
- (F) \\(\forall\alpha <: \tau_1.\tau_2\\)
- (G) \\(\Gamma \vdash e : \forall\alpha <: \tau_1.\tau_2 \quad \Gamma \vdash \tau \quad \Gamma \vdash \tau <: \tau_1\\)
- (H) \\(\tau_2[\alpha \leftarrow \tau]\\)

(A), (B), (C), (E)~(H)는 이 장의 규칙과 같고, (D)는 완전한 규칙 \\(\texttt{S-All}\_{\text{full}}\\)입니다. 먼저 통과해야 하는 식을 따라가 봅시다.

1. `f`: \\(\tau\texttt{-TypeAbs}\\)로 몸통을 \\([A <: \\{a : \top\\}]\\)에서 검사합니다. `x.a`는 노출(\\(\texttt{X-TVar}\\))로 \\(A\\)를 경계 \\(\\{a : \top\\}\\)로 올려 \\(\top\\) 타입이 되므로, `f`의 타입은 \\(\forall A <: \\{a : \top\\}.A \to \top\\)입니다.
2. `f[{a: Number => Number, b: Number}]`: 타입 인자가 올바른 형태이고 \\(\texttt{S-Record}\\)로 \\(\\{a : \mathtt{num} \to \mathtt{num}, b : \mathtt{num}\\} <: \\{a : \top\\}\\)이므로 \\(\tau\texttt{-TypeApp}\\)을 통과합니다. 결과 타입은 \\(\\{a : \mathtt{num} \to \mathtt{num}, b : \mathtt{num}\\} \to \top\\)이고, 넘기는 레코드의 타입이 정확히 매개변수 타입과 같습니다. `y`도 같습니다.
3. `g`: `z[Number]`는 \\(\mathtt{num} <: \mathtt{num}\\)(\\(\texttt{S-Refl}\\))이므로 통과하고 타입은 \\((A \to \mathtt{num})[A \leftarrow \mathtt{num}] = \mathtt{num} \to \mathtt{num}\\)입니다. 그래서 `g`의 타입은 \\((\forall A <: \mathtt{num}.A \to \mathtt{num}) \to \mathtt{num} \to \mathtt{num}\\)입니다.
4. `g(...)`: 인자의 타입은 \\(\forall A <: \top.A \to A\\)이므로, \\(\tau\texttt{-App}\\)이 통과하려면 \\(\varnothing \vdash \forall A <: \top.A \to A <: \forall A <: \mathtt{num}.A \to \mathtt{num}\\)이어야 합니다. 경계가 \\(\top\\)과 \\(\mathtt{num}\\)으로 다르므로 커널 규칙 \\(\texttt{S-All}\\)로는 안 되고, (D)가 필요합니다. (D)로 보면 경계는 \\(\mathtt{num} <: \top\\)으로 **반변** 방향이 성립하고, 몸통은 더 작은 경계를 가정한 \\([A <: \mathtt{num}]\\)에서 \\(A \to A <: A \to \mathtt{num}\\)을 확인합니다. 매개변수 쪽은 \\(A <: A\\)이고, 반환 쪽은 \\(\texttt{S-TVar}\\)로 \\(A <: \mathtt{num}\\)입니다. 만약 몸통을 왼쪽 경계 \\(\top\\)을 가정하고 비교했다면 \\(A <: \mathtt{num}\\)을 유도할 수 없어서 이 식이 거부되었을 것입니다. 그래서 (D)의 셋째 전제는 \\(\Gamma[\alpha <: \tau_1']\\)이어야 합니다.

이제 거부되어야 하는 여섯 식이 각각 어느 전제에서 막히는지 봅시다.

1. `(x: [A <: B] A) => x`: \\(\tau\texttt{-Fun}\\)은 매개변수 타입이 올바른 형태인지 검사하는데, (B)의 \\(\Gamma \vdash \tau_1\\)에서 \\(B \notin \text{Dom}(\Gamma)\\)이므로 막힙니다. 다형 타입의 경계도 검사해야 한다는 뜻입니다.
2. `(x: [A <: Number] A) => x[B]`: (G)의 \\(\Gamma \vdash \tau\\)에서 \\(B\\)가 정의되지 않았으므로 막힙니다(\\(\Gamma \vdash B <: \mathtt{num}\\)도 유도할 수 없습니다).
3. `(x: {a: A}) => x`: (A)에서 필드 타입 \\(A\\)가 올바른 형태가 아니므로 막힙니다. 레코드 타입은 필드 타입을 모두 검사해야 합니다.
4. `forall[A <: B] 42`: (E)의 \\(\Gamma \vdash \tau_1\\)에서 경계 \\(B\\)가 정의되지 않았으므로 막힙니다.
5. `forall[A <: Number] forall[A <: Number] 42`: 안쪽 타입 추상화에서 (E)의 \\(\alpha \notin \text{Dom}(\Gamma)\\)가 실패합니다. \\(\mathsf{PTFAE}\\)에서 찾은 구멍을 막기 위한 조건입니다.
6. `val f = (x: [A <: Top] Number) => x; f(forall[A <: Number] 42)`: 인자의 타입 \\(\forall A <: \mathtt{num}.\mathtt{num}\\)이 매개변수 타입 \\(\forall A <: \top.\mathtt{num}\\)의 서브타입이려면 (D)의 둘째 전제 \\(\top <: \mathtt{num}\\)이 필요한데, 성립하지 않으므로 막힙니다. 경계를 **공변**으로 비교했다면 \\(\mathtt{num} <: \top\\)이므로 통과했을 것입니다. 이 장의 `h[Number](1)` 예처럼 공변 비교는 안전하지 않으므로, 이 식이 경계를 반변으로 비교해야 함을 강제합니다.

정리하면, `g(...)`는 두 경계가 다를 수 있어야 한다는 것과 몸통을 더 작은 경계 \\(\tau_1'\\)을 가정하고 비교해야 한다는 것을, 여섯째 거부 식은 경계를 반변으로 비교해야 한다는 것을 보여 줍니다. 이 장에서 말했듯이 이 완전한 규칙을 쓰면 서브타입 판정이 결정 불가능해진다는 대가가 있습니다.

[← 문제로](./bounded-polymorphism.md#ex-bounded-polymorphism-7)

<a id="ans-bounded-polymorphism-8"></a>**8번.** 건전하지 않습니다. 반례는 다음 식입니다.

\\[
\begin{array}{l}
\mathtt{val}\ x : \langle\mathtt{num}\rangle[3] = \langle\mathtt{num}\rangle[7, 13, 42]; \\\\
\mathtt{val}\ y : \langle\top\rangle[3] = x; \\\\
y[0] = \lambda z\texttt{:}\mathtt{num}.z; \\\\
x[0] + 1
\end{array}
\\]

타입 검사를 따라가 봅시다.

1. 원소 `7`, `13`, `42`의 타입은 \\([7, 7]\\), \\([13, 13]\\), \\([42, 42]\\)이고 모두 \\(\mathtt{num}\\)의 서브타입이므로, 배열의 타입은 \\(\langle\mathtt{num}\rangle[3]\\)이고 `x`의 표기와 맞습니다.
2. 배열 타입은 원소 타입에 대해 공변이고 \\(\mathtt{num} <: \top\\)이므로 \\(\langle\mathtt{num}\rangle[3] <: \langle\top\rangle[3]\\)입니다. 그래서 `x`를 \\(\langle\top\rangle[3]\\) 타입의 `y`로 정의할 수 있습니다.
3. `y[0] = ...`: 인덱스 `0`의 타입은 \\([0, 0]\\)이고 \\(0 \leq 0\\), \\(0 < 3\\)입니다. 넣는 값의 타입 \\(\mathtt{num} \to \mathtt{num}\\)은 원소 타입 \\(\top\\)의 서브타입이므로 새 규칙을 통과합니다.
4. `x[0] + 1`: `x`의 타입은 여전히 \\(\langle\mathtt{num}\rangle[3]\\)이므로 `x[0]`의 타입은 \\(\mathtt{num}\\)이고, \\(\mathsf{add}(\mathtt{num}, [1, 1]) = \mathtt{num}\\)입니다. 전체 식의 타입은 \\(\mathtt{num}\\)입니다.

그런데 `x`와 `y`는 **같은 배열**을 가리키므로, 셋째 줄을 실행하면 `x`의 첫 원소가 클로저로 바뀝니다. 넷째 줄은 `클로저 + 1`을 계산하다가 타입 오류를 냅니다. 이 장의 Java 배열 예와 같은 구멍입니다. 원소를 **읽기만** 할 때는 공변이 안전합니다. \\(\langle\mathtt{num}\rangle[3]\\)에서 꺼낸 원소는 \\(\top\\)으로 봐도 되기 때문입니다. 하지만 **쓰기**까지 하면 \\(\langle\top\rangle[3]\\)이라는 이름으로 아무 값이나 넣을 수 있게 되어, 같은 배열을 \\(\langle\mathtt{num}\rangle[3]\\)으로 보는 쪽의 약속이 깨집니다. 원소 변경을 허락하려면 배열 타입을 **불변**으로 바꿔서, 원소 타입이 같을 때만 서브타입 관계를 인정해야 합니다.

구간 타입만으로도 비슷한 반례를 만들 수 있습니다. \\(\mathtt{val}\ x : \langle[0, 0]\rangle[1] = \langle[0, 0]\rangle[0];\ \mathtt{val}\ y : \langle\mathtt{num}\rangle[1] = x;\ y[0] = 5;\ \langle\mathtt{num}\rangle[7][x[0]]\\)은 `x[0]`의 타입이 \\([0, 0]\\)이라서 마지막 접근이 범위 안이라고 타입 검사를 통과하지만, 실행하면 `x[0]`이 `5`가 되어 길이 1인 배열의 범위를 벗어납니다. 이 언어의 타입 시스템이 막겠다고 약속한 범위 밖 접근이 일어나는 것입니다.

[← 문제로](./bounded-polymorphism.md#ex-bounded-polymorphism-8)

## 선형 타입과 소유권

[선형 타입과 소유권](./linear-types.md) 장의 연습 문제 해답입니다.

<a id="ans-linear-types-7"></a>**7번.**

\\[
\begin{prooftree}
\AxiomC{$x \in \text{Dom}(\Gamma)$}
\LeftLabel{$\texttt{A-Id}$}
\UnaryInfC{$\Gamma \vdash x : \Gamma(x) \dashv \Gamma \setminus \\{x\\}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \tau_1 \dashv \Gamma_1$}
\AxiomC{$\Gamma_1 \vdash e_2 : \tau_2 \dashv \Gamma_2$}
\LeftLabel{$\texttt{A-Pair}$}
\BinaryInfC{$\Gamma \vdash (e_1, e_2) : \tau_1 \times \tau_2 \dashv \Gamma_2$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \tau_1 \dashv \Gamma_1$}
\AxiomC{$\Gamma_1[x : \tau_1] \vdash e_2 : \tau_2 \dashv \Gamma_2$}
\AxiomC{$x \notin \text{Dom}(\Gamma_2)$}
\LeftLabel{$\texttt{A-Val}$}
\TrinaryInfC{$\Gamma \vdash \texttt{val}\ x\ \texttt{=}\ e_1;\ e_2 : \tau_2 \dashv \Gamma_2$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \tau_1 \times \tau_2 \dashv \Gamma_1$}
\AxiomC{$\Gamma_1[x : \tau_1, y : \tau_2] \vdash e_2 : \tau \dashv \Gamma_2$}
\AxiomC{$x, y \notin \text{Dom}(\Gamma_2)$}
\LeftLabel{$\texttt{A-ValPair}$}
\TrinaryInfC{$\Gamma \vdash \texttt{val}\ (x, y)\ \texttt{=}\ e_1;\ e_2 : \tau \dashv \Gamma_2$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma[x : \tau] \vdash e : \tau' \dashv \Gamma'$}
\AxiomC{$x \notin \text{Dom}(\Gamma')$}
\LeftLabel{$\texttt{A-Fun}$}
\BinaryInfC{$\Gamma \vdash \lambda x\texttt{:}\tau.e : \tau \to \tau' \dashv \Gamma'$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : \texttt{bool} \dashv \Gamma_0$}
\AxiomC{$\Gamma_0 \vdash e_1 : \tau \dashv \Gamma'$}
\AxiomC{$\Gamma_0 \vdash e_2 : \tau \dashv \Gamma'$}
\LeftLabel{$\texttt{A-If}$}
\TrinaryInfC{$\Gamma \vdash \texttt{if}\ (e_0)\ e_1\ \texttt{else}\ e_2 : \tau \dashv \Gamma'$}
\end{prooftree}
\\]

규칙마다 "두 번 쓰지 않기"와 "빠뜨리지 않기"를 어떻게 보장하는지 봅시다.

- **변수.** 모든 변수가 선형이므로, 변수를 쓰면 언제나 출력에서 지웁니다. 이 장의 \\(\texttt{A-IdLin}\\)과 같습니다. 같은 변수를 다시 쓰려 하면 그때는 \\(x \notin \text{Dom}(\Gamma)\\)라서 막힙니다. 예를 들어 `val y = 10; y + y`에서 첫 번째 `y`가 \\([y : \texttt{num}]\\)을 \\([]\\)로 바꾸고, 두 번째 `y`는 \\([]\\)에서 찾을 수 없습니다.
- **쌍.** 덧셈처럼 왼쪽이 남긴 \\(\Gamma_1\\)을 오른쪽에 넘깁니다. 그래서 같은 변수를 두 성분에서 모두 쓸 수 없습니다.
- **변수 정의와 쌍 분해.** 초기값이 남긴 \\(\Gamma_1\\)에 새 변수를 더해 본문을 검사하고, 본문이 끝난 뒤 출력 \\(\Gamma_2\\)에 새 변수가 **남아 있지 않은지** 확인합니다. 남아 있다면 본문에서 한 번도 쓰지 않은 것입니다. 예를 들어 `val x = 10; 42`는 본문의 출력이 \\([x : \texttt{num}]\\)이라서 막힙니다. 변수의 스코프가 끝나는 곳에서 약화 금지를 확인하는 것으로, 이 장 타입 검사기의 `leave`가 하는 일과 같습니다. 이름이 겹치지 않는다고 가정했으므로 바깥 변수를 되돌려 놓는 일은 필요 없습니다.
- **함수.** 매개변수를 더해 본문을 검사하고, 매개변수가 출력에 남아 있지 않은지 확인합니다. 본문이 쓴 바깥 변수는 출력 \\(\Gamma'\\)에서 빠진 채로 돌아가므로, 함수가 그 변수를 "가져간" 것이 됩니다. 이 언어에서는 함수 값도 변수에 담기면 한 번만 쓸 수 있고 재귀도 없으므로, 바깥 변수를 담은 함수가 여러 번 호출될 일이 없습니다. 바깥 변수를 아예 쓰지 못하게 \\(\Gamma' = \Gamma\\)를 요구하는 더 엄격한 설계도 가능합니다.
- **조건식.** 조건을 검사하고 남은 \\(\Gamma_0\\)에서 두 갈래를 **각각** 검사하고, 두 갈래의 출력이 **같은** \\(\Gamma'\\)이어야 합니다. 둘 중 하나만 실행되므로 같은 변수를 두 갈래에서 한 번씩 쓰는 것은 두 번 쓰는 것이 아닙니다. 하지만 출력이 다르면 한 갈래에서만 쓴 변수가 있다는 뜻이고, 다른 갈래가 실행되면 그 변수는 쓰이지 않습니다. 이 장의 \\(\tau\texttt{-If}\\)에서 두 갈래를 같은 \\(\Gamma_2\\)로 검사한 것, 타입 검사기에서 두 출력이 같은지 확인한 것과 같은 이유입니다.

마지막으로 프로그램 전체는 \\([] \vdash e : \tau \dashv []\\)이면 받아들입니다. 위의 규칙들은 정의한 변수를 스코프가 끝나는 곳에서 모두 확인하므로, 빈 타입 환경에서 시작하면 출력도 언제나 빈 타입 환경입니다.

[← 문제로](./linear-types.md#ex-linear-types-7)
