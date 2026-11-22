# 논리 관계

지금까지 [연료와 결과 분류](./lean-fuel.md)부터 [두 가지 서브타입 관계](./lean-subtyping.md)까지는 같은 틀로 타입 안전성을 증명했습니다. 값마다 "이 값은 이 타입을 가진다"를 귀납적 명제 `VT`로 **문법적으로** 정하고, 클로저라면 그 몸통이 타입 규칙으로 타입 검사된다는 사실을 값 안에 담아 두는 방식이었습니다. 이 장에서는 이 방법이 [매개변수 다형성](./parametric-polymorphism.md)의 \\(\mathsf{PTFAE}\\)에서 왜 막히는지 보고, 그 대신 타입을 **값의 집합**으로 해석하는 논리 관계(logical relation)로 증명을 다시 세웁니다. 그 과정에서 타입 변수를 번호로 바꾸지 않고 강의와 똑같이 이름 그대로 다루며, 그렇게 충실하게 옮긴 덕분에 강의 슬라이드 초판의 규칙 두 개가 안전하지 않다는 반례도 함께 얻습니다.

이 장의 코드는 모두 이 책의 Lean 프로젝트의 `PTFAE` 라이브러리에서 그대로 옮겼습니다. 연료를 쓰는 `eval`, 결과 타입 `Res`와 `bindR`, `Sound`와 그 성질 `Sound.bind`·`Sound.mono`는 [연료와 결과 분류](./lean-fuel.md)에서 본 것과 같으므로 다시 설명하지 않습니다.

## 실행은 타입을 보지 않는다

먼저 \\(\mathsf{PTFAE}\\)의 Lean 정의를 짧게 확인합시다. 타입에는 타입 변수 \\(\alpha\\)와 다형 타입 \\(\forall\alpha.\tau\\)가, 식에는 타입 추상화 `forall[α] e`와 타입 적용 `e[τ]`가, 값에는 타입 추상화 값 \\(\langle \forall\alpha.e, \sigma \rangle\\)가 더해집니다. 타입 변수는 de Bruijn 번호가 아니라 `String` 이름 그대로입니다.

```lean
inductive Ty where
  | num
  | arrow (p r : Ty)
  | var (a : String)
  | poly (a : String) (t : Ty)
  deriving Repr, DecidableEq, Inhabited
```

```lean
inductive Value where
  | num (n : Int)
  | clo (x : String) (body : Expr) (env : List (String × Value))
  | tabs (a : String) (body : Expr) (env : List (String × Value))
  deriving Inhabited
```

인터프리터에서 눈여겨볼 경우는 다음과 같습니다.

```lean
    | .fn x _ b => ret (.clo x b σ)            -- annotation discarded
    ...
    | .tabs a b => ret (.tabs a b σ)           -- body not evaluated yet
    | .tapp e _ => bindR (eval n σ e) fun v => -- type argument discarded
      match v with
      | .tabs _ b fenv => eval n fenv b
      | _ => err .notTAbs
```

[매개변수 다형성](./parametric-polymorphism.md)의 \\(\texttt{TypeApp}\\) 규칙 그대로, `e[τ]`를 실행할 때 타입 인자 \\(\tau\\)는 버려지고 타입 추상화 값 안의 몸통 \\(e'\\)가 **치환 없이** 그대로 실행됩니다. 함수의 매개변수 타입 표기도 버립니다. 이런 실행 방식을 타입 소거(type erasure)라고 합니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e \Rightarrow \langle \forall\alpha.e', \sigma' \rangle$}
\AxiomC{$\sigma' \vdash e' \Rightarrow v$}
\LeftLabel{$\texttt{TypeApp}$}
\BinaryInfC{$\sigma \vdash e[\tau] \Rightarrow v$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\Gamma \vdash e : \forall\alpha.\tau'$}
\AxiomC{$\Gamma \vdash \tau$}
\LeftLabel{$\tau\texttt{-TypeApp}$}
\BinaryInfC{$\Gamma \vdash e[\tau] : \tau'[\alpha \leftarrow \tau]$}
\end{prooftree}
\\]

그런데 타입 규칙 \\(\tau\texttt{-TypeApp}\\)은 `e[τ]`의 타입을 **치환한** 타입 \\(\tau'[\alpha \leftarrow \tau]\\)로 줍니다. 타입 안전성 증명은 이 간극, 즉 "치환하지 않고 실행한 결과가 치환한 타입을 가진다"를 설명해야 합니다.

Lean의 타입 규칙 `HasTypeG`는 앞 장들처럼 규칙 하나가 생성자 하나입니다. 새 규칙 두 개만 보면 다음과 같습니다.

```lean
  /-- τ-TypeAbs (corrected: `α ∉ dom(Γ)`) -/
  | tabs {Γ a b T} : a ∉ Γ.tys → HasTypeG eqv sub (Γ.addType a) b T →
      HasTypeG eqv sub Γ (.tabs a b) (.poly a T)
  /-- τ-TypeApp -/
  | tapp {Γ e a T T' R} : Wf Γ.tys T → HasTypeG eqv sub Γ e (.poly a T') →
      sub T' a T R → HasTypeG eqv sub Γ (.tapp e T) R
```

`Wf Γ.tys T`가 올바른 형태 \\(\Gamma \vdash \tau\\)이고, `sub T' a T R`이 "\\(R\\)은 \\(T'[a \leftarrow T]\\)이다"입니다. `HasTypeG`가 타입 동등성 `eqv`와 치환 `sub`를 매개변수로 받는 이유는 이 장 끝의 반례에서 밝혀집니다. 증명하는 타입 시스템은 고친 규칙을 끼운 `HasType := HasTypeG Equiv Subst`입니다.

## 문법적 값 타입이 막히는 곳

[연료와 결과 분류](./lean-fuel.md)의 방법을 그대로 써 본다고 합시다. 타입 추상화 값에는 클로저와 비슷하게 다음 같은 규칙을 주게 될 것입니다. (이것은 설명을 위해 지어낸 규칙이고, 이 책의 Lean 프로젝트에는 없습니다.)

\\[
\begin{prooftree}
\AxiomC{$\sigma \models \Gamma$}
\AxiomC{$\Gamma[\alpha] \vdash e : \tau$}
\BinaryInfC{$\vdash \langle \forall\alpha.e, \sigma \rangle : \forall\alpha.\tau$}
\end{prooftree}
\\]

여기서 \\(\sigma \models \Gamma\\)는 `EnvT`, 즉 \\(\Gamma\\)의 모든 변수가 \\(\sigma\\)에서 맞는 타입의 값에 묶여 있다는 뜻입니다. 이제 `e[τ]`의 경우를 증명하려고 하면 바로 두 가지 문제에 부딪힙니다.

첫째, 몸통 \\(e\\)는 \\(\alpha\\)가 자유로운 채로 타입 검사되었으므로, 실행해서 나온 값의 타입도 \\(\alpha\\)가 들어 있는 타입입니다. 그런데 "타입 \\(\alpha\\)의 값"을 문법적으로 정할 방법이 없습니다. \\(\alpha\\)는 수 타입도 함수 타입도 아니고, 실행 중에는 \\(\alpha\\)가 무엇으로 인스턴스화되었는지 기록조차 남지 않습니다.

둘째, 실행 결과로 나온 클로저는 타입 표기에 \\(\alpha\\)가 그대로 남은 몸통을 들고 있습니다. 다음 식을 봅시다.

```ptfae,run
/* PTFAE */
(forall[A] (x: A) => (y: Number) => (f: A => A) => f(x))[Number](1)
```

타입 검사기는 이 식에 \\(\mathtt{num} \to (\mathtt{num} \to \mathtt{num}) \to \mathtt{num}\\) 타입을 줍니다. 실행하면 타입 인자 `Number`는 버려지므로 결과는 클로저 \\(\langle \lambda y.\lambda f{:}A \to A.f(x), [x \mapsto 1] \rangle\\)입니다. 실제로 Lean에서 `eval`로 계산해 보면 몸통이 `fn "f" (arrow (var "A") (var "A")) ...`인 클로저가 나옵니다. 이 클로저가 `VT`의 클로저 규칙으로 타입 \\(\mathtt{num} \to (\mathtt{num} \to \mathtt{num}) \to \mathtt{num}\\)을 가지려면 몸통 `(f: A => A) => f(x)`가 \\(x : \mathtt{num}, y : \mathtt{num}\\)에서 \\((\mathtt{num} \to \mathtt{num}) \to \mathtt{num}\\) 타입을 가져야 합니다. 하지만 몸통에 적힌 것은 `A => A`이고, 이 타입 환경에는 \\(A\\)가 정의되어 있지도 않습니다. 실행이 치환을 하지 않았으니 값 안의 몸통도 치환되지 않은 것입니다.

이를 억지로 맞추려면 값마다 "아직 하지 않은 타입 치환 \\([A \leftarrow \mathtt{num}]\\)"을 들고 다니게 하고, 식에 대한 타입 치환 보조정리(\\(\Gamma[\alpha] \vdash e : \tau\\)이면 \\(\Gamma \vdash e[\alpha \leftarrow \tau'] : \tau[\alpha \leftarrow \tau']\\))를 증명하고, 이름 붙은 변수라서 생기는 포획 회피 이름 바꾸기까지 값 쪽과 식 쪽에서 맞춰야 합니다. 할 수는 있겠지만 매우 번거롭습니다.

> **생각해 보기** 앞 장들에서 `VT`의 클로저 규칙은 "몸통이 타입 검사된다"는 **타입 유도**를 값에 붙여 두었습니다. 함수를 호출할 때 그 유도가 필요했기 때문입니다. 만약 "몸통이 타입 검사된다" 대신 "어떤 좋은 인자를 넣어도 몸통이 안전하게 실행된다"를 붙여 두면 어떨까요? 그러면 타입 유도가 값에 남지 않으니 치환되지 않은 몸통도 문제가 되지 않습니다. 이것이 이 장의 출발점입니다.

## 타입을 값의 집합으로 해석하기

논리 관계는 타입마다 "그 타입답게 행동하는 값의 집합"을 정해 줍니다. Lean에서 값의 집합은 술어 `Value → Prop`입니다. 타입 변수 \\(\alpha\\)는 그 자체로는 어떤 집합인지 알 수 없으므로, 타입 변수마다 집합을 하나씩 정해 주는 <a id="g-type-variable-interpretation"></a>타입 변수 해석(type variable interpretation) \\(\rho\\)를 매개변수로 둡니다. (앞 장들의 Lean 코드에서는 \\(\rho\\)가 실행 환경의 이름이었지만, 이 장에서 실행 환경은 \\(\sigma\\)이고 \\(\rho\\)는 타입 변수 해석입니다.)

```lean
abbrev TInterp := String → Value → Prop

/-- `ρ[a ↦ P]` -/
def upd (ρ : TInterp) (a : String) (P : Value → Prop) : TInterp :=
  fun b => if b = a then P else ρ b
```

식에 대해서는 "어떤 연료로 실행해도 오류가 나지 않고, 값이 나오면 그 값이 \\(P\\)에 속한다"를 `E P σ e`로 정의합니다. [연료와 결과 분류](./lean-fuel.md)의 `Sound`를 모든 연료에 대해 요구한 것입니다.

```lean
def E (P : Value → Prop) (σ : Env) (e : Expr) : Prop := ∀ n, Sound (eval n σ e) P
```

그리고 타입의 해석 \\(\mathcal{V}⟦\tau⟧\_{\rho}\\)가 이 장의 주인공입니다.

```lean
def V : Ty → TInterp → Value → Prop
  | .num, _, v => ∃ k, v = .num k
  | .arrow p r, ρ, v => ∃ x b σ, v = .clo x b σ ∧ ∀ w, V p ρ w → E (V r ρ) ((x, w) :: σ) b
  | .var a, ρ, v => ρ a v
  | .poly a t, ρ, v => ∃ a' b σ, v = .tabs a' b σ ∧ ∀ P : Value → Prop, E (V t (upd ρ a P)) σ b
```

수식으로 쓰면 다음과 같습니다. \\(\mathcal{E}(P)\\)는 `E P`, 즉 \\((\sigma, e) \in \mathcal{E}(P)\\)는 "\\(\sigma\\)에서 \\(e\\)를 어떤 연료로 실행해도 오류 없이, 값이 나오면 \\(P\\)에 속한다"입니다.

\\[
\begin{array}{lcl}
\mathcal{V}⟦\mathtt{num}⟧\_{\rho} &=& \\{ n \mid n \in \mathbb{Z} \\} \\\\
\mathcal{V}⟦\tau\_1 \to \tau\_2⟧\_{\rho} &=& \\{ \langle \lambda x.e, \sigma \rangle \mid \forall w \in \mathcal{V}⟦\tau\_1⟧\_{\rho}.\ (\sigma[x \mapsto w], e) \in \mathcal{E}(\mathcal{V}⟦\tau\_2⟧\_{\rho}) \\} \\\\
\mathcal{V}⟦\alpha⟧\_{\rho} &=& \rho(\alpha) \\\\
\mathcal{V}⟦\forall\alpha.\tau⟧\_{\rho} &=& \\{ \langle \forall\alpha'.e, \sigma \rangle \mid \forall P \subseteq \mathbb{V}.\ (\sigma, e) \in \mathcal{E}(\mathcal{V}⟦\tau⟧\_{\rho[\alpha \mapsto P]}) \\}
\end{array}
\\]

한 줄씩 읽어 봅시다.

- 수 타입의 값은 수입니다.
- 함수 타입의 값은 클로저인데, \\(\tau\_1\\)답게 행동하는 **모든** 인자 \\(w\\)에 대해 몸통이 안전하게 실행되고 결과가 \\(\tau\_2\\)답게 행동해야 합니다. 몸통이 어떻게 타입 검사되었는지는 묻지 않습니다. 앞 절의 클로저 \\(\langle \lambda y.\lambda f{:}A \to A.f(x), [x \mapsto 1] \rangle\\)도 몸통에 `A`가 적혀 있든 말든, 행동만 보면 \\(\mathcal{V}⟦\mathtt{num} \to (\mathtt{num} \to \mathtt{num}) \to \mathtt{num}⟧\_{\rho}\\)에 속합니다.
- 타입 변수의 값은 해석 \\(\rho\\)가 정해 준 집합에 속하는 값입니다.
- 다형 타입의 값은 타입 추상화 값인데, \\(\alpha\\)를 **어떤 집합** \\(P\\)로 해석해도 몸통이 안전하게 실행되고 결과가 \\(\tau\\)답게 행동해야 합니다. 값에 저장된 이름 \\(\alpha'\\)는 해석에서 쓰이지 않습니다. 실행에서도 쓰이지 않으니 당연합니다.

마지막 줄이 핵심입니다. 다형 값은 타입 인자가 무엇일지 모르는 채로 실행되므로, 가능한 모든 집합에 대해 안전해야 한다는 것이 자연스럽습니다. 그리고 `e[τ]`를 증명할 때는 그 많은 \\(P\\) 가운데 \\(P := \mathcal{V}⟦\tau⟧\_{\rho}\\)를 골라 쓰면 됩니다. 실행이 \\(\tau\\)를 버리는 것과 정확히 맞습니다. 의미에서도 \\(\tau\\)를 식에 치환하지 않고, 해석 \\(\rho\\)만 바꿉니다.

<div style="text-align:center">
<svg viewBox="0 0 620 200" width="100%" style="max-width: 620px" role="img" aria-label="다형 타입의 해석과 타입 적용에서 P를 고르는 과정" font-family="sans-serif" fill="currentColor">
  <defs>
    <marker id="lean-logical-relations-arr1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker>
  </defs>
  <rect x="10" y="20" width="190" height="56" rx="4" fill="#2a408e"/>
  <text x="105" y="44" text-anchor="middle" font-size="15" fill="#ffffff" font-family="ui-monospace, Menlo, monospace">⟨∀α.e, σ⟩</text>
  <text x="105" y="64" text-anchor="middle" font-size="13" fill="#ffffff">∈ V⟦∀α.τ⟧ρ</text>
  <line x1="200" y1="48" x2="372" y2="48" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-logical-relations-arr1)"/>
  <text x="286" y="40" text-anchor="middle" font-size="13">모든 집합 P에 대해</text>
  <rect x="376" y="20" width="234" height="56" rx="4" fill="none" stroke="currentColor"/>
  <text x="493" y="44" text-anchor="middle" font-size="13">σ에서 e를 실행하면</text>
  <text x="493" y="64" text-anchor="middle" font-size="13">결과 ∈ V⟦τ⟧ρ[α ↦ P]</text>
  <line x1="493" y1="76" x2="493" y2="124" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-logical-relations-arr1)"/>
  <text x="485" y="105" text-anchor="end" font-size="13">e[τ']에서는 P := V⟦τ'⟧ρ로 고름</text>
  <rect x="376" y="128" width="234" height="56" rx="4" fill="none" stroke="currentColor"/>
  <text x="493" y="152" text-anchor="middle" font-size="13">결과 ∈ V⟦τ⟧ρ[α ↦ V⟦τ'⟧ρ]</text>
  <text x="493" y="172" text-anchor="middle" font-size="13">= V⟦τ[α ← τ']⟧ρ  (V_subst)</text>
</svg>
</div>
<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 다형 타입의 해석은 모든 P에 대해 몸통이 안전하다는 약속이고, 타입 적용은 그중 P := V⟦τ'⟧ρ를 꺼내 쓴다.</p>

예를 들어 다형 항등 함수 `forall[A] (x: A) => x`를 빈 환경에서 실행한 값은 \\(\mathcal{V}⟦\forall A.A \to A⟧\_{\rho}\\)에 속합니다. 어떤 \\(P\\)를 고르든 몸통 `(x: A) => x`는 클로저가 되고, 그 클로저에 \\(P\\)에 속하는 \\(w\\)를 넣으면 \\(w\\)가 그대로 나오므로 다시 \\(P\\)에 속하기 때문입니다. 거꾸로 "받은 값 대신 늘 `1`을 돌려주는" 타입 추상화 값은 이 집합에 속하지 않습니다. \\(P\\)를 \\(\\{0\\}\\)처럼 \\(1\\)이 들어 있지 않은 집합으로 고르면 약속이 깨지니까요. 이처럼 "모든 \\(P\\)"는 다형 함수가 타입 인자에 따라 다르게 행동할 수 없다는 매개변수성(parametricity)을 담고 있습니다(연습 문제 3, 4).

### Lean이 이 정의를 받아 주는 이유

`V`는 `Ty`에 대한 평범한 구조적 재귀입니다. 너무 당연해 보이지만, 여기에는 두 가지 선택이 숨어 있습니다.

첫째, \\(\forall\\)의 경우에 오른쪽은 몸통 `t`에 대한 재귀 호출뿐입니다. 만약 \\(\mathcal{V}⟦\forall\alpha.\tau⟧\\)를 "모든 **타입** \\(S\\)에 대해 \\(\mathcal{V}⟦\tau[\alpha \leftarrow S]⟧\\)"로 정의하려 했다면, \\(\tau[\alpha \leftarrow S]\\)는 \\(\forall\alpha.\tau\\)보다 클 수 있으므로(\\(S\\)가 \\(\forall\alpha.\tau\\) 자신일 수도 있습니다) 구조적 재귀가 되지 않습니다. 타입 대신 **임의의 값 집합** \\(P\\)로 양화하는 것이 Girard와 Reynolds의 방법이고, 덕분에 재귀가 항상 더 작은 타입으로 내려갑니다.

둘째, "모든 \\(P : \texttt{Value → Prop}\\)에 대해 ..."는 `Prop` 값을 내는 함수를 양화하는 명제입니다. Lean의 `Prop`은 <a id="g-impredicative"></a>비서술적(impredicative)이라서, 이런 명제도 다시 `Prop`에 들어갑니다. 그래서 `V`의 결과를 `Prop`으로 둘 수 있습니다. 만약 결과를 `Type`으로 두었다면 \\(\forall\\)의 경우가 한 단계 위 <a id="g-universe"></a>유니버스(universe)로 올라가서 `V : Ty → TInterp → Value → Type`이라는 정의가 유니버스 검사를 통과하지 못합니다.

> **생각해 보기** `V`는 귀납적 명제(`inductive`)가 아니라 함수(`def`)입니다. 앞 장들의 `VT`를 정의할 때 겪었던 중첩 귀납의 제약(`EnvT`처럼 `∃` 안에 `VT`를 두는 전제를 그대로 쓸 수 없어 나누어야 했던 일)이 여기서는 왜 생기지 않을까요?

## 기본 보조정리

이제 증명의 뼈대는 "문법적으로 타입이 맞으면 의미적으로도 맞다"는 한 문장입니다. 먼저 실행 환경이 타입 환경을 만족한다는 `EnvT`를 의미 해석으로 다시 정의합니다. [연료와 결과 분류](./lean-fuel.md)의 `EnvT`와 모양은 같고, `VT v T` 자리에 `V T ρ v`가 들어갔을 뿐입니다.

```lean
def EnvT (Γ : TEnv) (ρ : TInterp) (σ : Env) : Prop :=
  ∀ x T, lookup Γ.vars x = some T → ∃ v, lookup σ x = some v ∧ V T ρ v
```

<a id="g-fundamental-lemma"></a>기본 보조정리(fundamental lemma)는 다음과 같습니다.

```lean
theorem fundamental {Γ e T} (h : HasType Γ e T) :
    WfEnv Γ → ∀ ρ σ, EnvT Γ ρ σ → E (V T ρ) σ e := by
```

\\(\Gamma \vdash e : T\\)이면 \\(\Gamma\\)를 만족하는 모든 해석 \\(\rho\\)와 실행 환경 \\(\sigma\\)에 대해 \\((\sigma, e) \in \mathcal{E}(\mathcal{V}⟦T⟧\_{\rho})\\)라는 뜻입니다. `WfEnv Γ`는 \\(\Gamma\\)에 적힌 변수 타입의 자유 타입 변수가 모두 \\(\Gamma\\)에 정의되어 있다는 조건인데, 뒤에서 \\(\tau\texttt{-TypeAbs}\\)를 다룰 때 쓰입니다.

주정리는 빈 환경에 기본 보조정리를 적용한 것입니다.

```lean
theorem type_soundness {e : Expr} {T : Ty} (h : HasType ⟨[], []⟩ e T) (ρ : TInterp) (n : Nat) :
    Sound (eval n [] e) (V T ρ) :=
  fundamental h WfEnv.empty ρ [] (EnvT.empty ρ) n
```

```lean
theorem no_type_error {e : Expr} {T : Ty} (h : HasType ⟨[], []⟩ e T) (n : Nat) (er : Err) :
    eval n [] e ≠ some (.error er) := by
  intro he
  have := type_soundness h (fun _ _ => True) n
  rw [he] at this
  exact this
```

닫힌 타입에는 자유 타입 변수가 없으므로 \\(\rho\\)는 아무것이나 넣어도 됩니다. `no_type_error`는 모든 값을 받아들이는 해석 `fun _ _ => True`를 넣었습니다. \\(\mathsf{PTFAE}\\)에는 [허용된 오류와 재귀](./lean-errors.md)의 0으로 나누기 같은 허용된 오류가 없으므로, 어떤 오류도 일어나지 않는다는 것이 결론입니다.

### 연료가 아니라 타입 유도에 대한 귀납법

[연료와 결과 분류](./lean-fuel.md)에서는 정리를 일반화한 뒤 **연료에 대한 귀납법**으로 증명했습니다. 함수를 호출하면 클로저 몸통을 실행해야 하는데, 그 몸통은 지금 보고 있는 식의 부분식이 아니어서 식에 대한 귀납 가정을 쓸 수 없었기 때문입니다. 기본 보조정리는 `induction h`, 즉 **타입 유도에 대한 귀납법**으로 증명합니다. 함수 호출의 어려움이 사라진 이유는 `V`의 정의에 있습니다. 함수 타입의 해석이 이미 "좋은 인자를 넣으면 몸통이 안전하다"를 담고 있으므로, 호출하는 쪽은 그 약속을 꺼내 쓰기만 하면 됩니다. 그 대신 약속을 **만드는** 쪽인 \\(\tau\texttt{-Fun}\\)에서 약속이 정말 성립함을 보여야 하는데, 이것이 바로 몸통에 대한 귀납 가정입니다. 연료는 `E` 안에 "모든 `n`에 대해"로 들어 있고, 각 경우는 `E.of_succ`로 연료 `n + 1`에서 `eval`을 한 단계 펼쳐 증명합니다.

```lean
theorem E.of_succ {P : Value → Prop} {σ e} (h : ∀ n, Sound (eval (n + 1) σ e) P) : E P σ e
  | 0 => trivial
  | n + 1 => h n
```

\\(\tau\texttt{-Fun}\\)과 \\(\tau\texttt{-App}\\)의 경우를 봅시다.

```lean
  | @fn Γ x T b R hT _ ih =>
    -- τ-Fun
    intro hw ρ σ hσ
    exact E.of_succ fun n =>
      ⟨x, b, σ, rfl, fun w hw' => ih (hw.addVar hT.free_sub) ρ _ (hσ.cons hw')⟩
  | @app Γ f a T1 T2 T3 _ _ heq ih1 ih2 =>
    -- τ-App (argument moved across `T1 ≡ T3` by `V_equiv`)
    intro hw ρ σ hσ
    refine E.of_succ fun n => (ih1 hw ρ σ hσ n).bind fun fv hfv => ?_
    obtain ⟨x, b, σ', rfl, hf⟩ := hfv
    exact (ih2 hw ρ σ hσ n).bind fun av hav =>
      hf av ((V_equiv heq ρ av).2 hav) n
```

\\(\tau\texttt{-Fun}\\)에서는 `fn`이 한 단계 만에 클로저 `.clo x b σ`가 되므로, `V`의 함수 경우가 요구하는 칸들을 채웁니다. 마지막 칸 "모든 \\(w \in \mathcal{V}⟦T⟧\_{\rho}\\)에 대해 몸통이 안전하다"는 몸통의 귀납 가정 `ih`에 늘어난 환경(`hσ.cons hw'`)을 넣어 얻습니다. \\(\tau\texttt{-App}\\)에서는 함수 쪽 결과에서 그 약속 `hf`를 꺼내 인자 값에 적용합니다. 인자 타입 \\(T\_3\\)는 매개변수 타입 \\(T\_1\\)과 동등하기만 하므로, 인자 값이 \\(\mathcal{V}⟦T\_1⟧\_{\rho}\\)에도 속함을 `V_equiv`로 옮겨 줍니다. `V_equiv`는 다음 절에서 봅니다.

새로운 두 경우는 다음과 같습니다.

```lean
  | @tabs Γ a b T ha _ ih =>
    -- τ-TypeAbs
    intro hw ρ σ hσ
    exact E.of_succ fun n =>
      ⟨a, b, σ, rfl, fun P => ih hw.addType (upd ρ a P) σ (hσ.addType hw ha P)⟩
  | @tapp Γ e a T T' R hT _ hs ih =>
    -- τ-TypeApp (choose `P := V⟦T⟧ρ`, then `V_subst`)
    intro hw ρ σ hσ
    refine E.of_succ fun n => (ih hw ρ σ hσ n).bind fun v hv => ?_
    obtain ⟨a', b, σ', rfl, hb⟩ := hv
    exact (hb (V T ρ) n).mono fun w hw' => (V_subst hs ρ w).2 hw'
```

\\(\tau\texttt{-TypeAbs}\\)에서는 모든 \\(P\\)에 대해 몸통의 귀납 가정을 해석 \\(\rho[a \mapsto P]\\)에서 씁니다. 이때 \\(\sigma\\)가 여전히 \\(\Gamma[a]\\)를 만족한다는 것, 즉 \\(a\\)의 해석을 바꿔도 \\(\Gamma\\)에 있는 변수들의 해석이 그대로라는 것(`hσ.addType hw ha P`)이 필요합니다. \\(\tau\texttt{-TypeApp}\\)에서는 다형 값의 약속 `hb`에 \\(P := \mathcal{V}⟦T⟧\_{\rho}\\)를 넣고(`hb (V T ρ) n`), 결과가 속한 \\(\mathcal{V}⟦T'⟧\_{\rho[a \mapsto \mathcal{V}⟦T⟧\_{\rho}]}\\)를 `V_subst`로 \\(\mathcal{V}⟦T'[a \leftarrow T]⟧\_{\rho}\\)로 바꿉니다. 앞의 그림이 바로 이 네 줄입니다.

결국 기본 보조정리는 세 개의 보조정리로 줄어듭니다. \\(\tau\texttt{-App}\\)을 위한 `V_equiv`, \\(\tau\texttt{-TypeAbs}\\)를 위한 `EnvT.addType`, \\(\tau\texttt{-TypeApp}\\)을 위한 `V_subst`입니다. 셋 모두 타입 변수의 **이름**을 조심스럽게 다루는 일입니다.

## 이름 붙은 타입 변수에 충실하기

증명 보조 도구로 \\(\forall\\)를 다룰 때는 흔히 타입 변수를 de Bruijn 번호로 바꾸거나, "묶인 이름은 모두 서로 다르다"는 Barendregt 관례를 가정합니다. 이 책의 Lean 프로젝트는 그렇게 하지 않고 이름을 `String` 그대로 둡니다. 강의의 명세, 슬라이드, 구현이 모두 이름을 쓰므로, 그래야 증명이 다루는 타입 시스템이 강의의 것과 **같은** 대상이 되기 때문입니다. 그 대가로 치환, 타입 동등성, \\(\tau\texttt{-TypeAbs}\\) 세 곳에서 이름을 조심해서 다룹니다.

### 포획 회피 치환을 관계로

[매개변수 다형성](./parametric-polymorphism.md)에서 정의한 포획 회피 치환(capture-avoiding substitution)은 \\((\forall\alpha'.\tau')[\alpha \leftarrow \tau]\\)에서 \\(\alpha' \in \mathtt{free}(\tau)\\)이면 묶는 변수를 **새로운** 이름 \\(\alpha''\\)로 바꿉니다. 문제는 "새로운" 이름을 어떻게 고르느냐입니다. 정의는 조건만 말하고, 구현은 `fresh` 함수로 `T0`, `T1`, ... 중 하나를 고릅니다. 증명에서 특정한 고르는 함수를 정해 버리면 다른 선택에 대해서는 아무것도 말해 주지 못합니다.

그래서 치환을 함수가 아니라 **관계** `Subst t a s r`("\\(r\\)은 \\(t[a \leftarrow s]\\)의 **한** 결과")로 정의하고, 정의의 경우마다 생성자를 하나씩 둡니다. 이름을 바꾸는 경우는 다음과 같습니다.

```lean
  | poly_ren {a b c t s t1 t2} : b ≠ a → b ∈ free s →
      c ≠ a → c ∉ free s → c ∉ free (.poly b t) →
      Subst t b (.var c) t1 → Subst t1 a s t2 →
      Subst (.poly b t) a s (.poly c t2)
```

\\[
\begin{prooftree}
\AxiomC{$\beta \neq \alpha \quad \beta \in \mathtt{free}(s) \quad \gamma \neq \alpha \quad \gamma \notin \mathtt{free}(s) \quad \gamma \notin \mathtt{free}(\forall\beta.t)$}
\noLine
\UnaryInfC{$t[\beta \leftarrow \gamma] = t\_1 \qquad t\_1[\alpha \leftarrow s] = t\_2$}
\UnaryInfC{$(\forall\beta.t)[\alpha \leftarrow s] = \forall\gamma.t\_2$}
\end{prooftree}
\\]

새 이름 \\(\gamma\\)에는 증명에 실제로 필요한 세 조건만 요구합니다. 그 조건을 만족하는 이름이면 무엇이든 허용되므로, 이 관계는 모든 선택의 결과를 포함합니다. 구현의 `fresh`가 고르는 이름도 이 조건을 만족합니다. 예를 들어 \\((\forall B.A \to B)[A \leftarrow B]\\)의 결과로 \\(\forall C.B \to C\\)와 \\(\forall D.B \to D\\)가 모두 유도됩니다(`Examples.lean`). 아래의 보조정리는 모두 `Subst`에 대한 귀납법으로 증명되므로 **어떤 선택에 대해서도** 성립합니다.

### 의미 치환 보조정리

치환에 대한 기본 도구는 두 가지입니다. 먼저 `V_agree`는 \\(\mathcal{V}⟦\tau⟧\_{\rho}\\)가 \\(\mathtt{free}(\tau)\\) 위의 \\(\rho\\) 값에만 의존한다는 것입니다. 쓰이지 않는 변수의 해석을 바꾸거나 이름을 바꿀 때마다 씁니다.

```lean
theorem V_agree : ∀ (t : Ty) (ρ1 ρ2 : TInterp), (∀ d ∈ free t, ρ1 d = ρ2 d) →
    ∀ v, V t ρ1 v ↔ V t ρ2 v
```

다음으로 \\(\tau\texttt{-TypeApp}\\)을 위한 <a id="g-semantic-substitution-lemma"></a>의미 치환 보조정리(semantic substitution lemma) `V_subst`는 문법적으로 \\(s\\)를 넣는 것과 \\(a\\)를 \\(s\\)의 의미로 해석하는 것이 같다고 말합니다.

\\[
\mathcal{V}⟦t[a \leftarrow s]⟧\_{\rho} = \mathcal{V}⟦t⟧\_{\rho[a \mapsto \mathcal{V}⟦s⟧\_{\rho}]}
\\]

```lean
theorem V_subst {t a s r} (h : Subst t a s r) :
    ∀ ρ v, V r ρ v ↔ V t (upd ρ a (V s ρ)) v := by
  induction h with
  ...
```

`Subst`에 대한 귀납법이고, 어려운 경우는 이름을 바꾸는 `poly_ren`입니다. 증명은 `calc`(같음이나 동치를 한 줄씩 이어 가는 증명)로 다섯 단계를 잇습니다. 아래는 그 핵심 부분이고, 보조 사실 `hX`, `hc`, `hagree`를 준비하는 앞부분은 생략했습니다.

```lean
    calc V t2 (upd ρ c P) w
        ↔ V t1 (upd (upd ρ c P) a (V s (upd ρ c P))) w := ih2 _ w   -- t2 = t1[a ← s]
      _ ↔ V t1 X w := by rw [V_upd_not_free ρ P hcs, hX]              -- c ∉ free(s)
      _ ↔ V t (upd X b (V (.var c) X)) w := ih1 X w                  -- t1 = t[b ← c]
      _ ↔ V t (upd X b P) w := by rw [hc]
      _ ↔ V t (upd (upd ρ a (V s ρ)) b P) w := V_agree t _ _ hagree w
```

여기서 `X`는 \\(\rho[c \mapsto P][a \mapsto \mathcal{V}⟦s⟧\_{\rho}]\\)입니다. 두 번 쓰인 귀납 가정 사이에서, \\(c \notin \mathtt{free}(s)\\)이므로 \\(c\\)의 해석을 바꿔도 \\(\mathcal{V}⟦s⟧\\)가 그대로라는 것(`V_upd_not_free`)과, 마지막에 \\(c \notin \mathtt{free}(\forall b.t)\\)이므로 \\(c\\)의 해석이 \\(t\\)에 영향을 주지 않는다는 것(`V_agree`)을 씁니다. 새 이름에 대해 쓴 사실은 `poly_ren`의 세 조건뿐이므로, 이 증명은 어떤 새 이름을 골라도 성립합니다.

### 고친 타입 동등성

[매개변수 다형성](./parametric-polymorphism.md)의 타입 동등성(type equivalence)에서 다형 타입 규칙에는 옆조건 \\(\alpha \notin \mathtt{free}(\forall\alpha'.\tau')\\)가 있었습니다. Lean 생성자는 이 규칙을 그대로 옮깁니다.

```lean
inductive Equiv : Ty → Ty → Prop
  | num : Equiv .num .num
  | arrow {p r p' r'} : Equiv p p' → Equiv r r' → Equiv (.arrow p r) (.arrow p' r')
  | var {a} : Equiv (.var a) (.var a)
  | poly {a t a' t' r} : a ∉ free (.poly a' t') → Subst t' a' (.var a) r → Equiv t r →
      Equiv (.poly a t) (.poly a' t')
```

\\[
\begin{prooftree}
\AxiomC{$\alpha \notin \mathtt{free}(\forall\alpha'.\tau')$}
\AxiomC{$\tau \equiv \tau'[\alpha' \leftarrow \alpha]$}
\BinaryInfC{$\forall\alpha.\tau \equiv \forall\alpha'.\tau'$}
\end{prooftree}
\\]

\\(\tau\texttt{-App}\\)에 필요한 것은 동등한 타입이 같은 의미를 가진다는 `V_equiv`입니다.

```lean
theorem V_equiv {t t'} (h : Equiv t t') : ∀ ρ v, V t ρ v ↔ V t' ρ v := by
```

\\(\forall\\)의 경우에서는 `V_subst`로 \\(\tau'[\alpha' \leftarrow \alpha]\\)를 풀고, \\(\mathtt{free}(\tau')\\) 위에서 \\(\rho[\alpha \mapsto P][\alpha' \mapsto P]\\)와 \\(\rho[\alpha' \mapsto P]\\)가 같음을 보입니다. \\(\alpha'\\)가 아닌 자유 변수 \\(d\\)에 대해서는 \\(d \neq \alpha\\)를 알아야 \\(\rho[\alpha \mapsto P]\\)의 갱신이 \\(d\\)에 닿지 않는데, 바로 그 \\(d \neq \alpha\\)가 옆조건에서 나옵니다.

```lean
        have hda : d ≠ a := fun e => hfree (e ▸ mem_free_poly.2 ⟨hd, hda'⟩)
```

옆조건이 없으면 이 한 줄이 무너지고, 실제로 반례가 생깁니다(뒤의 반례 1).

### 타입 추상화의 옆조건

마지막으로 고친 \\(\tau\texttt{-TypeAbs}\\)의 옆조건 \\(\alpha \notin \text{Dom}(\Gamma)\\), Lean의 `a ∉ Γ.tys`입니다. [매개변수 다형성](./parametric-polymorphism.md)에서는 이 조건이 없으면 안전하지 않은 프로그램을 보았는데, 증명에서는 이 조건이 다음 보조정리에 쓰입니다.

```lean
theorem EnvT.addType {Γ : TEnv} {ρ σ a} (hw : WfEnv Γ) (ha : a ∉ Γ.tys) (h : EnvT Γ ρ σ)
    (P : Value → Prop) : EnvT (Γ.addType a) (upd ρ a P) σ := by
  intro y U hy
  obtain ⟨v, hv, hU⟩ := h y U hy
  have hfree : a ∉ free U := fun hmem => ha (hw y U hy a hmem)
  exact ⟨v, hv, by rw [V_upd_not_free ρ P hfree]; exact hU⟩
```

\\(\rho\\)를 \\(\rho[a \mapsto P]\\)로 바꿀 때 \\(\Gamma\\)의 변수 타입 \\(U\\)의 해석이 그대로이려면 \\(a \notin \mathtt{free}(U)\\)여야 합니다. `WfEnv Γ`가 \\(\mathtt{free}(U) \subseteq \text{Dom}(\Gamma)\\)를 주고, 옆조건이 \\(a \notin \text{Dom}(\Gamma)\\)를 주므로 `hfree`가 나옵니다. 옆조건이 없으면 바깥 \\(a\\) 타입을 가진 변수의 해석이 안쪽 \\(a\\)의 해석 \\(P\\)로 바뀌어 버리는데, 이것이 [매개변수 다형성](./parametric-polymorphism.md)의 반례에서 일어난 포획을 의미 쪽에서 본 모습입니다.

> **자주 하는 실수** "이름 문제는 귀찮으니 묶인 이름이 모두 다르다고 가정하자"는 손 증명에서 흔한 지름길입니다. 그런데 그렇게 가정하면 위의 세 곳이 증명에서 거의 보이지 않게 되고, 이어서 볼 두 반례 같은 구멍도 놓치기 쉽습니다. 이름을 그대로 다룬 증명은 강의의 규칙을 실제로 검사한 셈입니다.

## 슬라이드 초판 규칙의 반례

[매개변수 다형성](./parametric-polymorphism.md)에 실린 규칙은 이미 고친 규칙입니다. 강의 슬라이드의 초판에는 두 가지가 달랐습니다. 다형 타입의 동등성 규칙에 옆조건 \\(\alpha \notin \mathtt{free}(\forall\alpha'.\tau')\\)가 없었고, 슬라이드의 `subst` 코드는 포획을 피하지 않았습니다. 둘 다 Lean으로 증명을 쓰는 과정에서 드러났고, `Counterexample.lean`은 각각이 정말 안전하지 않다는 것을 Lean 정리로 남깁니다.

`HasTypeG`가 동등성과 치환을 매개변수로 받는 이유가 여기 있습니다. 같은 타입 규칙 틀에 초판의 규칙을 끼우면 초판의 타입 시스템이 됩니다.

```lean
/-- Type system with the original `≡`. -/
abbrev HasTypeS := HasTypeG EquivS Subst

/-- Type system with capturing substitution in τ-TypeApp (corrected `≡`). -/
abbrev HasTypeN := HasTypeG Equiv (fun t a s r => r = substN t a s)
```

### 반례 1: 옆조건 없는 동등성

`EquivS`는 `Equiv`에서 옆조건 `a ∉ free (.poly a' t')`만 뺀 것입니다. 치환은 포획을 피하는 `Subst` 그대로이므로, 옆조건 하나만 빠져도 안전하지 않음을 보여 줍니다.

```ptfae,run
/* PTFAE */
val t = forall[B] (g: [A] A => B) =>
          ((u: [B] B => B) => u[Number](1))(g);
t[Number => Number](forall[C] (x: C) => (y: Number) => y) + 1
```

안쪽 함수는 `u : [B](B => B)`를 기대하는데 `g : [A](A => B)`를 넘깁니다. 옛 규칙은 \\((A \to B)[A \leftarrow B] = B \to B\\)만 보고 두 타입이 동등하다고 판정합니다. 하지만 `[A](A => B)`의 `B`는 바깥 `forall[B]`의 자유 변수이고, `g`는 `A`에 무엇을 넣든 그 `B`의 값을 내는 함수입니다. 반면 `[B](B => B)`는 받은 타입의 값을 그대로 돌려주는 함수의 타입입니다. 그래서 타입 검사기는 `u[Number](1) : Number`라고 믿지만, 실제로는 바깥 `B`로 넘긴 `Number => Number`의 값, 즉 클로저 `(y: Number) => y`가 나오고, 여기에 `+ 1`을 하다가 오류가 납니다.

```lean
theorem progEquiv_slide_typed : HasTypeS ⟨[], []⟩ progEquiv .num := by
```

```lean
/-- Evaluation fails with `notNum` (`<function> + 1`). -/
theorem progEquiv_goes_wrong : eval 20 [] progEquiv = some (.error .notNum) := by rfl
```

```lean
theorem slide_equiv_unsound :
    ∃ e, HasTypeS ⟨[], []⟩ e .num ∧ ∃ n er, eval n [] e = some (.error er) :=
  ⟨progEquiv, progEquiv_slide_typed, 20, .notNum, progEquiv_goes_wrong⟩
```

`progEquiv_slide_typed`의 증명은 타입 유도를 손으로 쌓는 긴 증명이라 생략했습니다. 그 안에서 문제의 단계는 한 줄입니다.

```lean
    · -- the faulty step: [B](B => B) ≡ [A](A => B), ignoring B ∈ free([A](A => B))
      exact EquivS.poly (.arrow .var_eq (.var_ne (by decide))) (.arrow .var .var)
```

`progEquiv_goes_wrong`의 증명이 `rfl` 하나라는 점도 눈여겨볼 만합니다. 인터프리터가 Lean 함수이므로 연료 20으로 실제로 실행해 보면 그만입니다.

### 반례 2: 포획하는 치환

슬라이드의 `subst` 코드를 그대로 옮긴 `substN`은 \\((\forall x.\tau)[\alpha \leftarrow s]\\)에서 \\(x\\)가 \\(s\\)에 자유롭게 나타나도 이름을 바꾸지 않습니다.

```lean
def substN : Ty → String → Ty → Ty
  | .num, _, _ => .num
  | .arrow p r, a, s => .arrow (substN p a s) (substN r a s)
  | .var x, a, s => if a = x then s else .var x
  | .poly x t, a, s => if a = x then .poly x t else .poly x (substN t a s)
```

이번에는 동등성을 고친 `Equiv`로 두어도 안전하지 않습니다.

```ptfae,run
/* PTFAE */
val f = forall[A] (a: A) => forall[B] (x: A) => (y: B) => a;
val t = forall[B] (b: B) => f[B](b)[Number](1)(2) + 1;
t[Number => Number]((z: Number) => z)
```

`f`의 타입은 \\(\forall A.A \to \forall B.A \to B \to A\\)입니다. `f[B]`의 타입을 포획하며 계산하면 \\(B \to \forall B.B \to B \to B\\)가 되어, 넣은 `B`가 안쪽 `forall[B]`에 잡힙니다. 올바른 결과는 \\(B \to \forall B\_1.B \to B\_1 \to B\\)입니다.

```lean
theorem substN_capture :
    substN (arrow (var "A") (poly "B" (arrow (var "A") (arrow (var "B") (var "A"))))) "A" (var "B") =
      arrow (var "B") (poly "B" (arrow (var "B") (arrow (var "B") (var "B")))) := by decide
```

`decide`는 결정 가능한 명제를 계산으로 확인하는 전술입니다. 그 결과 타입 검사기는 `f[B](b)[Number](1)(2) : Number`라고 보지만, 실제로는 `b`, 즉 클로저 `(z: Number) => z`가 돌아오고 `+ 1`에서 오류가 납니다. 올바른 치환이라면 이 식의 타입은 `B`이고, `B` 타입의 식에 `+ 1`을 하는 프로그램은 타입 검사를 통과하지 못합니다.

```lean
theorem slide_substN_unsound :
    ∃ e, HasTypeN ⟨[], []⟩ e .num ∧ ∃ n er, eval n [] e = some (.error er) :=
  ⟨progCapture, progCapture_slide_typed, 20, .notNum, progCapture_goes_wrong⟩
```

### 고친 시스템은 둘 다 거부한다

두 프로그램이 고친 시스템에서는 어떤 타입으로도 타입 검사되지 않는다는 것도 정리로 남아 있습니다. 증명은 짧습니다. 타입 검사된다면 `no_type_error`에 의해 오류가 날 수 없는데, 실행해 보면 오류가 나니까요.

```lean
theorem progEquiv_rejected (T : Ty) : ¬ HasType ⟨[], []⟩ progEquiv T :=
  fun h => no_type_error h 20 .notNum progEquiv_goes_wrong
```

```lean
theorem progCapture_rejected (T : Ty) : ¬ HasType ⟨[], []⟩ progCapture T :=
  fun h => no_type_error h 20 .notNum progCapture_goes_wrong
```

주정리가 있으면 "이 프로그램은 타입 검사되지 않는다"를 타입 유도를 하나하나 따져 보지 않고도 증명할 수 있다는 점이 재미있습니다. 거꾸로 주정리를 초판의 규칙으로 증명하려 했다면, 반례 1에서는 `V_equiv`의 옆조건이 필요한 바로 그 줄에서, 반례 2에서는 `V_subst`의 `poly_ren` 경우에 해당하는 이름 바꾸기가 없어서 증명이 막혔을 것입니다.

### 더 나아가기

이 장의 `V`는 타입의 구조에 대한 재귀라서 잘 정의되었는데, 타입이 자기 자신을 가리키는 재귀 타입이 있는 언어(예를 들어 이 강의의 프로젝트 언어 \\(\mathsf{MiniScala}\\))에서는 그렇게 정의할 수 없어서 실행 걸음 수를 함께 세는 <a id="g-step-indexed-logical-relation"></a>단계 지표 논리 관계(step-indexed logical relation)가 필요합니다.

## 정리

- \\(\mathsf{PTFAE}\\)는 타입 소거로 실행하므로 `e[τ]`의 몸통은 치환 없이 실행되지만, \\(\tau\texttt{-TypeApp}\\)은 치환한 타입을 줍니다. 값에 타입 유도를 붙여 두는 문법적 `VT`로는 "타입 \\(\alpha\\)의 값"도, 치환되지 않은 몸통을 가진 클로저도 다루기 어렵습니다.
- 논리 관계는 타입을 값의 집합 \\(\mathcal{V}⟦\tau⟧\_{\rho}\\)로 해석합니다. 타입 변수의 뜻은 해석 \\(\rho\\)가 정하고, 함수 타입은 "좋은 인자에 대해 몸통이 안전함", 다형 타입은 "\\(\alpha\\)를 어떤 집합 \\(P\\)로 해석해도 몸통이 안전함"입니다.
- `V`는 `Ty`에 대한 구조적 재귀이고, 타입 대신 값 집합으로 양화하는 Girard와 Reynolds의 방법과 `Prop`의 비서술성 덕분에 Lean이 그대로 받아 줍니다.
- 기본 보조정리 `fundamental`은 "문법적으로 타입이 맞으면 의미적으로도 맞다"이고, 연료가 아니라 타입 유도에 대한 귀납법으로 증명합니다. 주정리 `type_soundness`와 `no_type_error`는 빈 환경에 적용한 따름정리입니다.
- 새 경우는 세 보조정리로 줄어듭니다. \\(\tau\texttt{-App}\\)은 `V_equiv`, \\(\tau\texttt{-TypeAbs}\\)는 `EnvT.addType`, \\(\tau\texttt{-TypeApp}\\)은 \\(P := \mathcal{V}⟦\tau⟧\_{\rho}\\)를 고른 뒤 `V_subst`입니다.
- 타입 변수를 이름 그대로 다루기 위해 치환을 모든 새 이름 선택을 포함하는 관계 `Subst`로 정의했고, 동등성의 옆조건과 \\(\tau\texttt{-TypeAbs}\\)의 옆조건이 증명의 정확히 어느 줄에 쓰이는지 확인했습니다.
- 슬라이드 초판의 두 규칙(옆조건 없는 동등성, 포획하는 치환)은 각각 타입 검사를 통과하지만 실행 중 오류가 나는 프로그램이 있어 안전하지 않음을 Lean으로 보였습니다.

## 연습 문제

1. `V_equiv`의 증명을 `EquivS`에 대해 그대로 시도해 보세요. 즉 `Semantics.lean`을 복사해 `V_equiv`의 `Equiv`를 `EquivS`로 바꾸고 다시 빌드해서, 어느 줄에서 어떤 목표가 남는지 확인하세요. 그 목표를 반례 1에 나오는 \\(\forall B.B \to B\\)와 \\(\forall A.A \to B\\)로 구체화하면 무슨 뜻인지 설명하세요.
2. `HasTypeG`의 `tabs` 생성자에서 `a ∉ Γ.tys`를 지우면 기본 보조정리의 어느 경우가, 어떤 보조정리의 어느 줄 때문에 깨지는지 찾아보세요. 이어서 [매개변수 다형성](./parametric-polymorphism.md)의 "PTFAE의 타입 안전성" 절에 나온 프로그램을 Lean 식으로 옮기고, 옆조건 없는 시스템에서 타입 검사되지만 `eval`이 오류를 낸다는 것을 `Counterexample.lean`처럼 증명해 보세요. (힌트: `HasTypeG`는 `tabs`의 옆조건을 매개변수로 받지 않으므로, 생성자 하나만 다른 새 귀납적 정의를 만들어야 합니다.)
3. 매개변수성을 하나 증명해 보세요. \\(\mathcal{V}⟦\forall A.A \to A⟧\_{\rho}\\)에 속하는 값은, 어떤 인자 \\(w\\)를 넣든 결과가 나오면 그 결과가 \\(w\\)라는 것입니다. 다음 정리를 증명하세요. (힌트: \\(P\\)로 `(· = w)`를 고르세요.)

   ```lean
   theorem id_param {ρ : TInterp} {v : Value}
       (hv : V (.poly "A" (.arrow (.var "A") (.var "A"))) ρ v) (w : Value) :
       ∃ a b σ, v = .tabs a b σ ∧ ∀ n, Sound (eval n σ b)
         (fun f => ∃ x c σ', f = .clo x c σ' ∧ ∀ m, Sound (eval m ((x, w) :: σ') c) (· = w))
   ```

4. 다형 항등 함수의 값이 정말 \\(\mathcal{V}⟦\forall A.A \to A⟧\_{\rho}\\)에 속함을, 기본 보조정리를 쓰지 않고 `V`의 정의만으로 직접 증명해 보세요.

   ```lean
   example (ρ : TInterp) :
       V (.poly "A" (.arrow (.var "A") (.var "A"))) ρ (.tabs "A" (.fn "x" (.var "A") (.id "x")) [])
   ```

   그다음 "늘 `1`을 돌려주는" 값 `.tabs "A" (.fn "x" (.var "A") (.num 1)) []`은 이 집합에 속하지 **않음**을 증명하세요. 어떤 \\(P\\)를 골라야 할까요? 아무 값도 없는 집합을 고르면 왜 안 될까요?
5. \\(\mathsf{PTFAE}\\)에 불 타입과 `if`를 더한다고 해 봅시다. `Ty`, `Expr`, `Value`, `eval`, `HasTypeG`에 무엇을 더해야 하는지 정하고, `V`에 \\(\mathcal{V}⟦\mathtt{bool}⟧\_{\rho}\\)를 정의한 뒤 기본 보조정리에서 새로 생기는 경우를 증명하세요. 앞 장들의 `VT` 방식으로 같은 확장을 할 때와 비교해, 어느 쪽이 손이 덜 가나요?
