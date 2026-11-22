# 타입 추론의 건전성

4부의 마지막 장입니다. 이번에 증명할 언어는 [타입 추론](./type-inference.md) 장의 `TIFAE`입니다. `TIFAE`는 [`TRFAE`](./typing-recursive-functions.md)에서 타입 표기를 모두 지우고, 타입 검사기가 타입 변수와 해를 들고 다니며 타입을 스스로 찾게 한 언어였습니다. 실행 의미는 `TRFAE`와 똑같으므로, 연료 기반 인터프리터와 결과 분류 `Sound`, 연료에 대한 귀납법은 [연료와 결과 분류](./lean-fuel.md) 장의 틀을, `def`가 만드는 재귀 클로저와 허용된 오류 `divZero`는 [허용된 오류와 재귀](./lean-errors.md) 장의 방법을 그대로 씁니다. 이 장은 **타입 추론 때문에 새로 생기는 문제**만 다룹니다.

새로 생기는 문제는 셋입니다. 첫째, 추론이 낸 타입에는 타입 변수가 남아 있고 그 뜻은 해가 정하는데, 해는 추론이 진행될수록 자랍니다. 그러면 "값 \\(v\\)가 타입 \\(\tau\\)를 가진다"는 말을 어느 해에 대고 해야 할까요? 둘째, 타입을 해소하는 `resolve`는 해에 순환이 있으면 끝나지 않습니다. 정리를 말하려면 결과 타입이 정말로 있다는 것부터 보여야 합니다. 셋째, let-다형성 덕분에 `val`로 묶은 값 하나가 여러 타입으로 쓰입니다. 일반화한 타입 변수가 나중에 엉뚱하게 풀리지 않는다는 것을 어떻게 보장할까요? 이 장에서는 이 세 질문에 각각 <a id="g-model"></a>**모델**(model), **좋은 해와 출현 검사**, **불변식**(invariant) `Step`과 좋은 환경 `EnvOK`로 답하고, 이것들을 모아 주정리를 증명합니다. 마지막에는 4부 전체를 돌아봅니다.

## 앞 장의 방법으로는 왜 부족한가

지금까지의 증명은 모두 같은 모양이었습니다. 타입 규칙을 귀납적 관계 `HasType Γ e T`로 옮기고, 값의 타입 `VT v T`와 환경의 타입 `EnvT`를 정의한 뒤, 연료에 대한 귀납법으로 "`HasType Γ e T`이면 `eval n ρ e`의 결과는 `Sound`하고 값은 타입 `T`를 가진다"를 보였습니다. 여기서 `T`는 언제나 **완성된 타입**이었습니다. `TFAE`의 `Number => Number`처럼, 그 자체로 뜻이 정해진 타입이지요.

`TIFAE`의 타입 규칙은 사정이 다릅니다. 판단의 모양부터 \\(\Gamma, \psi \vdash e : \tau, \psi'\\)로, 해 \\(\psi\\)를 받아 갱신한 해 \\(\psi'\\)를 돌려줍니다. 이것은 "이 식은 이 타입을 가진다"를 선언하는 규칙이라기보다 해를 넣고 빼는 **알고리즘**입니다. 결과 타입 \\(\tau\\)는 아직 풀리지 않은 타입 변수일 수도 있고, 그 변수의 뜻은 나중의 단일화가 정합니다. 예를 들어 `x => x`를 검사하면 \\(\alpha_0 \to \alpha_0\\)을 얻는데, \\(\alpha_0\\)은 "아무 타입"이라는 뜻일까요, "아직 모르는 어떤 한 타입"이라는 뜻일까요?

교과서에서 흔히 보는 Hindley-Milner 타입 추론의 안전성 증명은 이 문제를 두 단계로 나눕니다. (1) 타입 변수가 없는 <a id="g-declarative-type-system"></a>**선언적 타입 체계**(declarative type system)에서 타입 안전성(type soundness)을 증명하고, (2) 추론 알고리즘이 낸 답에 해를 대입하면 선언적 유도가 생긴다는 알고리즘의 건전성(soundness)을 증명합니다. 그런데 [타입 추론](./type-inference.md) 장의 `TIFAE`에는 선언적 체계가 따로 없습니다. 규칙 자체가 알고리즘이지요. 그래서 이 장의 증명은 두 단계를 합쳐, **알고리즘 판단에 대해 곧바로** 타입 안전성을 증명합니다. 그 대가로, 추론 도중의 타입과 해가 무엇을 뜻하는지를 증명 안에서 직접 다루어야 합니다.

먼저 목표인 주정리를 보겠습니다.

```lean
theorem type_soundness {e t σ} (h : Infer [] σ₀ e t σ) :
    ∃ t', Resolve σ t t' ∧ ∀ n, Sound (eval n [] e) (fun v => VT v t') := by
```

```lean
theorem no_type_error {e t σ} (h : Infer [] σ₀ e t σ) :
    ∀ n er, eval n [] e = some (.error er) → er = .divZero := by
```

`Infer [] σ₀ e t σ`는 판단 \\(\varnothing, \varnothing \vdash e : \tau, \psi\\), 즉 "빈 타입 환경과 빈 해에서 \\(e\\)를 검사하면 타입 \\(\tau\\)와 해 \\(\psi\\)를 얻는다"입니다. 주정리는 두 가지를 말합니다. 먼저 \\(\mathtt{resolve}(\tau, \psi) = \tau'\\)이 **정의된다**는 것, 그리고 어떤 연료로 실행하든 결과가 `Sound`하고 값은 타입 \\(\tau'\\)를 가진다는 것입니다. `Sound`는 [허용된 오류와 재귀](./lean-errors.md) 장과 같아서, `1 / 0`의 `divZero`만 허용된 오류이고 `notNum`, `notBool`, `notFun`, `freeId` 같은 타입 오류는 일어나지 않습니다. 이 장의 Lean 코드는 해를 `σ`로, 값 환경을 `ρ`로 씁니다. 본문의 수식은 [타입 추론](./type-inference.md) 장을 따라 해를 \\(\psi\\), 풀리지 않은 상태를 \\(\bullet\\)으로 적겠습니다.

이 장의 코드는 이 책의 Lean 프로젝트에서 가져왔습니다. 파일은 크게 두 층으로 나뉩니다. 위층은 실행과 상관없는 **타입 추론만의 성질**(해는 커지기만 하고, 순환이 없고, 추론은 어떤 변수만 건드리는가)이고, 아래층은 그 성질을 써서 실행과 타입을 잇는, 앞 장들과 같은 모양의 증명입니다.

<div style="text-align:center">
<svg viewBox="0 0 640 220" width="100%" style="max-width: 640px" role="img" aria-label="TIFAE 증명의 파일 구성: 위층은 Typing, Lemmas, Step, EnvOK, Inference 순으로 실행과 무관한 타입 추론의 성질을 쌓고, 아래층은 ValueTyping, Soundness, Examples 순으로 실행과 타입을 잇는다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" fill="currentColor">
<defs><marker id="lean-inference-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="10" y="24" font-size="14" font-weight="bold">실행과 무관한 타입 추론의 성질</text>
<rect x="10" y="40" width="112" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="66" y="62" text-anchor="middle" font-size="14" font-weight="bold">Typing</text>
<text x="66" y="84" text-anchor="middle" font-size="12" font-family="ui-monospace, Menlo, monospace">Unify, Infer</text>
<polyline points="122,68 134,68" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-inference-1)"/>
<rect x="136" y="40" width="112" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="192" y="62" text-anchor="middle" font-size="14" font-weight="bold">Lemmas</text>
<text x="192" y="84" text-anchor="middle" font-size="12" font-family="ui-monospace, Menlo, monospace">Model, SolOK</text>
<polyline points="248,68 260,68" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-inference-1)"/>
<rect x="262" y="40" width="112" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="318" y="62" text-anchor="middle" font-size="14" font-weight="bold">Step</text>
<text x="318" y="84" text-anchor="middle" font-size="12" font-family="ui-monospace, Menlo, monospace">unify_step</text>
<polyline points="374,68 386,68" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-inference-1)"/>
<rect x="388" y="40" width="112" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="444" y="62" text-anchor="middle" font-size="14" font-weight="bold">EnvOK</text>
<text x="444" y="84" text-anchor="middle" font-size="12" font-family="ui-monospace, Menlo, monospace">EnvOK</text>
<polyline points="500,68 512,68" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-inference-1)"/>
<rect x="514" y="40" width="116" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="572" y="62" text-anchor="middle" font-size="14" font-weight="bold">Inference</text>
<text x="572" y="84" text-anchor="middle" font-size="12" font-family="ui-monospace, Menlo, monospace">infer_inv</text>
<polyline points="572,96 572,124 318,124 318,148" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-inference-1)"/>
<text x="10" y="172" font-size="14" font-weight="bold">실행과 타입을</text>
<text x="10" y="192" font-size="14" font-weight="bold">잇는 증명</text>
<rect x="262" y="150" width="112" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="318" y="172" text-anchor="middle" font-size="14" font-weight="bold">ValueTyping</text>
<text x="318" y="194" text-anchor="middle" font-size="12" font-family="ui-monospace, Menlo, monospace">VT, SchemeOK</text>
<polyline points="374,178 386,178" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-inference-1)"/>
<rect x="388" y="150" width="112" height="56" rx="4" fill="#2a408e"/>
<text x="444" y="172" text-anchor="middle" font-size="14" font-weight="bold" fill="#fff">Soundness</text>
<text x="444" y="194" text-anchor="middle" font-size="12" font-family="ui-monospace, Menlo, monospace" fill="#fff">sound_infer</text>
<polyline points="500,178 512,178" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-inference-1)"/>
<rect x="514" y="150" width="116" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="572" y="172" text-anchor="middle" font-size="14" font-weight="bold">Examples</text>
<text x="572" y="194" text-anchor="middle" font-size="12" font-family="ui-monospace, Menlo, monospace">ex_poly2</text>
</svg>
</div>
<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 각 상자는 같은 이름의 <code>.lean</code> 파일이고, 화살표는 import 순서입니다. 아래 칸은 그 파일의 대표 정의나 정리입니다.</p>

## 해와 보조 함수를 Lean으로

### 해: 세 가지 상태

[타입 추론](./type-inference.md) 장에서 해 \\(\psi\\)는 타입 변수에서 "타입 또는 \\(\bullet\\)"으로 가는 유한 사상이었고, Scala로는 `Map[Int, Option[Type]]`였습니다. Lean에서는 이렇게 둡니다.

```lean
abbrev Sol := Nat → Option (Option Ty)
```

타입 변수는 자연수이고, 변수마다 세 가지 상태가 있습니다. `σ α = none`이면 \\(\alpha \notin \mathrm{dom}(\psi)\\), 즉 아직 쓰지 않아 새 타입 변수로 고를 수 있는 변수입니다. `σ α = some none`이면 \\(\psi(\alpha) = \bullet\\), 즉 만들었지만 아직 풀리지 않은 변수입니다. `σ α = some (some τ)`이면 \\(\psi(\alpha) = \tau\\)로 풀린 변수입니다. Scala의 `Map[Int, Option[Type]]`을 조회하면 `Option[Option[Type]]`이 나오는 것과 정확히 같은 모양이지요. 유한 맵 대신 함수로 둔 덕분에 새 변수 추가 \\(\psi[\alpha \mapsto \bullet]\\)(`freshUpd`)와 변수 풀기 \\(\psi[\alpha \mapsto \tau]\\)(`setS`)를 `if` 하나로 쓸 수 있습니다.

```lean
def freshUpd (σ : Sol) (l : List Nat) : Sol := fun a => if a ∈ l then some none else σ a
```

```lean
def setS (σ : Sol) (a : Nat) (t : Ty) : Sol := fun b => if b = a then some (some t) else σ b
```

타입 `Ty`에는 `num`, `bool`, `arrow` 말고 타입 변수 `var (k : Nat)`가 더해지고, 타입 스킴 \\(\forall(\alpha_1, \ldots, \alpha_m).\tau\\)는 변수 목록과 타입의 쌍 `Scheme := List Nat × Ty`입니다. 타입 환경 `TEnv`는 이름에서 스킴으로 가는 연관 리스트입니다.

### 부분 함수는 관계로

`resolve`와 `unify`는 부분 함수입니다. `unify`는 실패할 수 있고, `resolve`는 해에 \\(\alpha \mapsto \alpha \to \alpha\\) 같은 순환이 있으면 끝나지 않습니다. Lean에서 함수를 정의하려면 끝난다는 것을 먼저 보여야 하는데, `resolve`가 끝나는지는 해가 좋은지에 달려 있어서 정의하는 시점에는 알 수 없습니다. 그래서 "결과가 이것이다"를 **귀납적 관계**로 씁니다. 타입 규칙을 관계로 옮긴 것과 같은 요령입니다.

\\[
\mathtt{resolve}(\tau, \psi) = \left\\{
\begin{array}{ll}
\mathtt{resolve}(\tau', \psi) & \text{if}\ \tau = \alpha \land \psi(\alpha) = \tau' \\\\
\mathtt{resolve}(\tau_p, \psi) \to \mathtt{resolve}(\tau_r, \psi) & \text{if}\ \tau = (\tau_p \to \tau_r) \\\\
\tau & \text{otherwise}
\end{array}
\right.
\\]

```lean
inductive Resolve (σ : Sol) : Ty → Ty → Prop
  | num : Resolve σ .num .num
  | bool : Resolve σ .bool .bool
  | arrow {p r p' r'} : Resolve σ p p' → Resolve σ r r' → Resolve σ (.arrow p r) (.arrow p' r')
  | solved {a t t'} : σ a = some (some t) → Resolve σ t t' → Resolve σ (.var a) t'
  | unsolved {a} : (∀ t, σ a ≠ some (some t)) → Resolve σ (.var a) (.var a)
```

`Resolve σ τ τ'`는 "\\(\mathtt{resolve}(\tau, \psi)\\)가 \\(\tau'\\)을 낸다"입니다. 수식의 세 경우가 생성자로 옮겨졌고, "otherwise"는 `num`, `bool`, 풀리지 않은 변수(`unsolved`)로 나뉘었습니다. 관계로 정의했으니 성질 두 개를 따로 증명해야 합니다. 결과가 하나뿐이라는 것(`Resolve.det`)은 쉽고, 결과가 반드시 있다는 것(`resolve_total`)은 좋은 해에서만 성립하며 뒤에서 다룹니다. 자유 타입 변수 \\(\mathtt{free}\_{\tau}\\), \\(\mathtt{free}\_{\Gamma}\\)도 같은 방식으로 관계 `FreeT`, `FreeEnv`가 되었습니다.

`unify`도 [타입 추론](./type-inference.md) 장의 여섯 경우를 그대로 생성자로 옮긴 관계입니다.

```lean
inductive Unify : Ty → Ty → Sol → Sol → Prop
  | num {t1 t2 σ} : Resolve σ t1 .num → Resolve σ t2 .num → Unify t1 t2 σ σ
  | bool {t1 t2 σ} : Resolve σ t1 .bool → Resolve σ t2 .bool → Unify t1 t2 σ σ
  | arrow {t1 t2 σ σ1 σ2 p1 r1 p2 r2} :
      Resolve σ t1 (.arrow p1 r1) → Resolve σ t2 (.arrow p2 r2) →
      Unify p1 p2 σ σ1 → Unify r1 r2 σ1 σ2 → Unify t1 t2 σ σ2
  | same {t1 t2 σ a} : Resolve σ t1 (.var a) → Resolve σ t2 (.var a) → Unify t1 t2 σ σ
  | left {t1 t2 σ a t2'} : Resolve σ t1 (.var a) → Resolve σ t2 t2' →
      occurs a t2' = false → Unify t1 t2 σ (setS σ a t2')
  | right {t1 t2 σ a t1'} : Resolve σ t1 t1' → Resolve σ t2 (.var a) →
      occurs a t1' = false → Unify t1 t2 σ (setS σ a t1')
```

한 가지 눈여겨볼 점이 있습니다. 두 인자를 해소한 결과가 서로 다른 변수 \\(\alpha \neq \beta\\)이면 `left`(\\(\alpha \mapsto \beta\\))와 `right`(\\(\beta \mapsto \alpha\\))가 둘 다 적용됩니다. Scala의 `match`는 위에서부터 고르므로 언제나 `left`이지요. 즉 이 관계는 구현보다 **너그럽습니다**. 그래도 괜찮은 이유는, 안전성을 "모든 유도에 대해" 증명하기 때문입니다. 구현이 실제로 만드는 유도도 그중 하나이니 함께 덮입니다. 너그럽게 정의해도 증명이 어려워지지 않는 것은, 증명이 쓰는 `unify`의 성질(뒤에 나올 `unify_model`, `unify_step`)이 어느 쪽을 고르든 성립하기 때문입니다.

> **생각해 보기.** 거꾸로 관계를 구현보다 **좁게** 정의했다면 어떻게 될까요? 정리 자체는 증명될지 몰라도, 구현이 만드는 유도가 관계 밖에 있을 수 있으니 구현에 대해서는 아무 말도 하지 못합니다. 규칙을 옮길 때는 "구현이 할 수 있는 일은 모두 관계도 허용하는가"를 확인해야 합니다.

일반화와 인스턴스화도 관계로 씁니다. 수식의 정의와 나란히 보면 거의 글자 그대로입니다.

```lean
def Gen (t : Ty) (Γ : TEnv) (σ : Sol) (as : List Nat) : Prop :=
  as.Nodup ∧ ∀ a, a ∈ as ↔ FreeT σ t a ∧ ¬ FreeEnv σ Γ a
```

```lean
def Inst (s : Scheme) (σ : Sol) (t : Ty) (σ' : Sol) : Prop :=
  ∃ as' : List Nat, as'.length = s.1.length ∧ as'.Nodup ∧ (∀ a ∈ as', σ a = none) ∧
    Resolve (updS σ (s.1.zip as')) s.2 t ∧ σ' = freshUpd σ as'
```

`Gen`은 \\(\mathtt{free}\_{\tau}(\tau, \psi) \setminus \mathtt{free}\_{\Gamma}(\Gamma, \psi)\\)를 중복 없이 아무 순서로나 나열한 목록을 허용합니다. `Inst`는 해에 없는 서로 다른 새 변수 `as'`을 **아무것이나** 고르도록 열어 둡니다. 책의 `newTypeVar`가 `sol.size`를 고르는 것은 이 조건을 만족하는 한 가지 선택일 뿐입니다. `updS σ (as.zip as')`는 \\(\psi[\alpha_1 \mapsto \alpha'\_1, \ldots, \alpha_m \mapsto \alpha'\_m]\\)이라는 임시 해입니다.

### 판단 `Infer`

이제 타입 규칙입니다. 생성자 하나가 규칙 하나이고, 이름도 `HasType` 대신 `Infer`로 두었습니다. 해가 \\(\psi_0 \to \psi_1 \to \psi_2\\)처럼 실로 꿰듯 이어지는 것이 앞 장들과 다른 점입니다. 두 규칙을 수식과 나란히 보겠습니다. 먼저 \\(\tau\\)-`App`입니다.

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c}
\Gamma, \psi \vdash e_f : \tau_f, \psi_f \qquad
\Gamma, \psi_f \vdash e_a : \tau_a, \psi_a \\\\
\alpha_r \notin \mathrm{dom}(\psi_a) \qquad
\mathtt{unify}(\tau_a \to \alpha_r, \tau_f, \psi_a[\alpha_r \mapsto \bullet]) = \psi'
\end{array}$}
\LeftLabel{$\tau\texttt{-App}$}
\UnaryInfC{$\Gamma, \psi \vdash e_f(e_a) : \alpha_r, \psi'$}
\end{prooftree}
\\]

```lean
  | app {Γ σ σf σa σ' f e tf ta r} :
      Infer Γ σ f tf σf → Infer Γ σf e ta σa → σa r = none →
      Unify (.arrow ta (.var r)) tf (freshUpd σa [r]) σ' →
      Infer Γ σ (.app f e) (.var r) σ'
```

다음은 let-다형성이 생기는 \\(\tau\\)-`Val`입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma, \psi_0 \vdash e_1 : \tau_1, \psi_1$}
\AxiomC{$\mathtt{gen}(\tau_1, \Gamma, \psi_1) = \tau^{\forall}\_1$}
\AxiomC{$\Gamma[x : \tau^{\forall}\_1], \psi_1 \vdash e_2 : \tau_2, \psi_2$}
\LeftLabel{$\tau\texttt{-Val}$}
\TrinaryInfC{$\Gamma, \psi_0 \vdash \mathtt{val}\ x\ \mathtt{=}\ e_1\mathtt{;}\ e_2 : \tau_2, \psi_2$}
\end{prooftree}
\\]

```lean
  | val {Γ σ0 σ1 σ2 x e1 e2 t1 t2 as} :
      Infer Γ σ0 e1 t1 σ1 → Gen t1 Γ σ1 as →
      Infer ((x, (as, t1)) :: Γ) σ1 e2 t2 σ2 →
      Infer Γ σ0 (.val x e1 e2) t2 σ2
```

나머지 규칙(\\(\tau\\)-`Num`, \\(\tau\\)-`Add` 등, \\(\tau\\)-`Id`, \\(\tau\\)-`Fun`, \\(\tau\\)-`Rec`, \\(\tau\\)-`If`)도 같은 식으로 옮겨져 있고, 생성자마다 주석에 규칙 이름이 붙어 있습니다. 여섯 개의 이항 연산은 타입 규칙과 실행 모양이 같아서 생성자 `bin` 하나로 합쳤습니다. 함수 매개변수와 재귀 함수는 타입 매개변수가 없는 스킴 `([], .var a)`로 환경에 들어가므로 일반화되지 않습니다. `def`로 만든 재귀 함수가 단형(monomorphic)인 것도 이 때문입니다.

## 열쇠: 모델

### 타입 변수의 뜻은 마지막 해가 정한다

첫 번째 질문으로 돌아갑시다. 추론 도중의 타입 \\(\tau\\)는 무엇을 뜻할까요? 이 증명의 답은 **모델**입니다.

```lean
def subst (m : Nat → Ty) : Ty → Ty
  | .num => .num
  | .bool => .bool
  | .arrow p r => .arrow (subst m p) (subst m r)
  | .var a => m a
```

```lean
def Model (M : Nat → Ty) (σ : Sol) : Prop := ∀ a t, σ a = some (some t) → M a = subst M t
```

`subst M τ`는 \\(\tau\\)의 타입 변수 \\(\alpha\\)를 모두 `M α`로 바꾼 타입입니다. 모델 `M`은 타입 변수마다 실제 타입을 정해 주는 함수인데, 해의 방정식 \\(\alpha = \psi(\alpha)\\)를 **모두 만족해야** 합니다. 풀리지 않은 변수에는 아무 조건이 없으니 마음대로 정해도 됩니다. 모델은 "해가 말하는 것을 어기지 않는 해석"인 셈입니다.

이 개념으로 증명의 중심인 **기본 보조정리**(fundamental lemma)를 이렇게 씁니다.

```lean
theorem sound_infer : ∀ (n : Nat) {Γ σ e t σ'}, Infer Γ σ e t σ' → SolOK σ → EnvOK Γ σ →
    ∀ {M}, Model M σ' → ∀ {ρ}, EnvT σ M ρ Γ → Sound (eval n ρ e) (fun v => VT v (subst M t))
```

읽어 보면 "좋은 해 `σ`와 좋은 환경 `Γ`에서 \\(e\\)를 추론해 `t`와 `σ'`를 얻었다면, 마지막 해 `σ'`의 **모든 모델** `M`에 대해, 환경이 `M`으로 해석한 타입과 맞을 때 \\(e\\)의 값은 타입 `subst M t`를 가진다"입니다. `SolOK`와 `EnvOK`, 그리고 스킴까지 다루는 환경의 타입 `EnvT σ M ρ Γ`는 뒤에서 차례로 정의합니다. 핵심은 타입의 뜻을 **마지막 해의 모델**로 읽는다는 점입니다. 이렇게 하면 추론 도중의 타입이 무엇을 뜻하는지 따로 물을 필요가 없습니다. \\(\tau\\)-`App`에서 함수 부분의 타입 `tf`는 검사 직후에는 아직 변수일 수 있지만, 마지막 해의 모델 `M`에서는 실제 타입 `subst M tf`가 되니까요.

이 방식이 동작하는 이유는 두 가지입니다.

첫째, **해는 커지기만 합니다**. 정의역이 넓어지고, 한 번 풀린 변수의 답은 바뀌지 않습니다. 이것을 `Ext σ σ'`로 쓰고, 그러면 마지막 해의 모델은 중간 해들의 모델이기도 합니다.

```lean
theorem Model.mono {M σ σ'} (h : Model M σ') (he : Ext σ σ') : Model M σ :=
  fun a t hs => h a t (he.sol a t hs)
```

그래서 부분식에 귀납 가정을 쓸 때 같은 `M`을 그대로 넘길 수 있습니다.

둘째, **`unify`는 모델에서 두 타입을 같게 만듭니다**.

```lean
theorem unify_model {t1 t2 σ σ' M} (h : Unify t1 t2 σ σ') (hM : Model M σ') :
    subst M t1 = subst M t2 := by
```

\\(\tau\\)-`App`의 \\(\mathtt{unify}(\tau_a \to \alpha_r, \tau_f, \ldots)\\)에 이 정리를 쓰면 `subst M tf = subst M ta → M r`를 얻습니다. 함수 부분의 값이 화살표 타입을 가진다는 것, 즉 클로저라서 호출할 수 있다는 것을 바로 이 등식이 알려 줍니다. 앞 장들에서 "타입 규칙의 전제가 \\(\tau_f = \tau_1 \to \tau_2\\)라고 말해 준다"던 자리를, 이제는 단일화와 모델이 채우는 것이지요. 증명은 `Unify`에 대한 귀납법이고, `left`와 `right` 경우는 새로 푼 변수의 방정식이 모델에서 성립한다는 것에서 바로 나옵니다. 그 밖에 모델은 해소 전후를 구별하지 못한다는 `Resolve.model`(\\(M(\mathtt{resolve}(\tau, \psi)) = M(\tau)\\))도 자주 씁니다.

### 주정리에서는 표준 모델을 고른다

기본 보조정리는 모든 모델에 대해 성립하니, 주정리에서는 마지막 해 \\(\psi\\)의 모델 하나를 골라 넣으면 됩니다. 어떤 모델을 고를까요? 주정리가 말하는 타입은 \\(\mathtt{resolve}(\tau, \psi)\\)이므로, 그것과 맞아떨어지는 모델이 좋습니다.

```lean
noncomputable def canon (σ : Sol) (N : Nat → Ty) (b : Nat) : Ty :=
  if h : ∃ t', Resolve σ (.var b) t' then subst N (Classical.choose h) else N b
```

<a id="g-canonical-model"></a>**표준 모델**(canonical model) `canon σ N`은 변수 \\(\alpha\\)를 \\(N(\mathtt{resolve}(\alpha, \psi))\\)로 보냅니다. `Resolve`가 관계라서 결과를 꺼낼 때 `Classical.choose`를 쓰고, 그래서 정의가 `noncomputable`입니다(증명에만 쓰는 정의라 계산할 필요는 없습니다). 좋은 해에서는 이것이 언제나 모델이고(`canon_model`), \\(\tau\\)에 적용하면 정확히 \\(N(\mathtt{resolve}(\tau, \psi))\\)가 됩니다(`canon_resolve`). 주정리에서는 \\(N\\)을 `Ty.var`로 두어, 풀리지 않은 변수는 자기 자신으로 해석합니다. 주정리의 증명 전체가 몇 줄입니다.

```lean
theorem type_soundness {e t σ} (h : Infer [] σ₀ e t σ) :
    ∃ t', Resolve σ t t' ∧ ∀ n, Sound (eval n [] e) (fun v => VT v t') := by
  have R := infer_inv h solOK_empty envOK_empty
  obtain ⟨t', ht'⟩ := resolve_total R.step.ok t
  refine ⟨t', ht', fun n => ?_⟩
  have := sound_infer n h solOK_empty envOK_empty (canon_model (N := Ty.var) R.step.ok)
    (envT_empty (ρ := []))
  rw [canon_resolve ht', subst_id] at this
  exact this
```

추론의 불변식 `infer_inv`로 마지막 해가 좋다는 것을 얻고, `resolve_total`로 \\(\tau'\\)을 꺼내고, 표준 모델에서 기본 보조정리를 쓴 뒤 `canon_resolve`와 `subst_id`(`subst Ty.var t = t`)로 타입을 정리합니다. `no_type_error`는 이 정리에서 바로 나옵니다. 이제 남은 일은 여기 쓰인 부품들, 즉 좋은 해 `SolOK`와 `resolve_total`, 불변식 `infer_inv`, 그리고 `EnvT`와 `sound_infer`를 채우는 것입니다.

## 좋은 해: 출현 검사가 `resolve`를 끝나게 한다

두 번째 질문은 `resolve`가 끝나느냐였습니다. 끝나려면 해에 순환이 없어야 합니다. 이것을 <a id="g-good-solution"></a>**좋은 해**(good solution)라는 성질로 씁니다.

```lean
structure SolOK (σ : Sol) : Prop where
  closed : ∀ a t, σ a = some (some t) → ∀ b, occurs b t = true → σ b ≠ none
  acyc : ∃ r : Nat → Nat, ∀ a t, σ a = some (some t) → ∀ b, occurs b t = true → r b < r a
```

`closed`는 답에 나오는 변수가 모두 정의역 안에 있다는 것이고, `acyc`는 순환이 없다는 것입니다. "순환이 없다"를 직접 쓰기는 번거로우므로, 대신 <a id="g-rank-function"></a>**랭크 함수**(rank function) `r`이 있어서 풀린 변수의 답에 나오는 변수는 랭크가 더 작다고 씁니다. 그러면 `resolve`가 풀린 변수를 따라갈 때마다 랭크가 줄어드니 반드시 끝납니다.

```lean
theorem resolve_total {σ : Sol} (hσ : SolOK σ) (t : Ty) : ∃ t', Resolve σ t t' := by
```

증명은 랭크의 상한 \\(k\\)에 대한 강한 귀납법(`Nat.strongRecOn`) 안에 타입의 구조에 대한 귀납법을 넣은 모양입니다. 변수 \\(\alpha\\)가 풀려 있으면 그 답의 변수들은 랭크가 \\(r(\alpha)\\)보다 작으니 바깥 귀납 가정을 쓰고, 화살표 타입이면 안쪽 귀납 가정을 씁니다.

그러면 해가 계속 좋은 해로 남는다는 것은 누가 보장할까요? 바로 `unify`의 **출현 검사**(occurrence checking)입니다. `unify`가 \\(\alpha \mapsto \tau'\\)로 변수를 풀 때, \\(\tau'\\)은 이미 해소한 결과라 풀리지 않은 변수만 들어 있고, 출현 검사 덕분에 \\(\alpha\\)는 \\(\tau'\\)에 나타나지 않습니다. 이 두 사실로 새 랭크 함수를 만들 수 있습니다.

```lean
def rankSet (σ : Sol) (r : Nat → Nat) (b : Nat) : Nat :=
  match σ b with
  | some (some _) => r b + 1
  | _ => 0
```

옛 해에서 풀려 있던 변수는 옛 랭크에 1을 더하고, 풀리지 않은 변수는 0으로 둡니다. 새 해에서 확인할 부등식은 두 종류입니다.

- 새로 푼 \\(\alpha\\)의 답 \\(\tau'\\)에 나오는 변수 \\(\gamma\\)는 옛 해에서 풀리지 않았고 \\(\alpha\\)도 아니므로 새 랭크가 0입니다. 그리고 \\(0 \lt r(\alpha) + 1\\)입니다.
- 원래 풀려 있던 \\(\beta\\)의 답에 나오는 \\(\gamma\\)에 대해서는 옛 부등식 \\(r(\gamma) \lt r(\beta)\\)에서 \\(\mathit{rankSet}(\gamma) \le r(\gamma) + 1 \lt r(\beta) + 1\\)입니다.

이 논증이 `Step.setS`의 `acyc` 부분이고, 마지막의 산술은 `omega`가 처리합니다(`omega`는 정수와 자연수의 선형 산술을 자동으로 푸는 전술입니다). 출현 검사가 없으면 \\(\alpha \mapsto \alpha \to \alpha\\)가 생길 수 있고, 그런 해에는 랭크 함수가 있을 수 없습니다. 실제로 Scala의 `resolve`도 그런 해에서는 끝나지 않습니다. 주정리의 "\\(\mathtt{resolve}(\tau, \psi)\\)가 정의된다"는 결국 출현 검사가 주는 선물입니다.

> **생각해 보기.** [타입 추론](./type-inference.md) 장에서는 출현 검사의 이유를 "재귀 타입이 필요한 제약을 거부하기 위해서"라고 설명했습니다. 증명의 눈으로 보면 같은 검사가 "해에 순환을 만들지 않아 `resolve`가 끝나게 한다"는 일을 합니다. 두 설명은 같은 사실의 두 얼굴입니다. 재귀 타입 \\(\alpha = \mathtt{num} \to \alpha\\)를 허용한다는 것은 곧 순환하는 해를 허용한다는 뜻이니까요.

## 불변식 `Step`: 추론은 어떤 변수만 건드리는가

### let-다형성의 위험

세 번째 질문으로 넘어갑시다. let-다형성이 안전하려면 `gen`이 묶은 변수가 나중에 바뀌면 안 됩니다. 예를 들어 `val id = x => x`에서 `id : ∀α. α → α`로 묶어 놓았는데, 뒤에서 어떤 단일화가 \\(\alpha \mapsto \mathtt{num}\\)으로 풀어 버린다고 해 봅시다. 그러면 스킴의 뜻이 몰래 바뀌어, `id(true)`에 쓴 인스턴스와 맞지 않게 됩니다. 또 환경의 자유 변수 \\(\beta\\)가 \\(\beta \mapsto \alpha \to \alpha\\)로 풀려서 묶인 변수 \\(\alpha\\)를 **붙잡아도** 문제입니다. \\(\alpha\\)는 "아무 타입"이어야 하는데, \\(\beta\\)를 통해 바깥 문맥과 엮여 버리니까요.

다행히 이런 일은 일어나지 않습니다. 직관적으로, 추론은 **환경의 자유 변수와 새로 만든 변수만** 건드리기 때문입니다. 묶인 변수는 정의상 환경의 자유 변수가 아니고(그래서 일반화했지요), 새 변수도 아닙니다. 이 직관을 정확히 쓴 것이 불변식 `Step`입니다.

### `Step σ σ' V`

```lean
structure Step (σ σ' : Sol) (V : Nat → Prop) : Prop where
  ext : Ext σ σ'
  ok : SolOK σ'
  keep : ∀ a, σ a = some none → ¬ V a → σ' a = some none
  grow : ∀ a, σ a = some none → ∀ t, Resolve σ' (.var a) t →
    ∀ b, occurs b t = true → b = a ∨ V b ∨ σ b = none
```

`Step σ σ' V`는 "해 \\(\psi\\)에서 \\(\psi'\\)으로 가는 계산은 변수 집합 \\(V\\)와 새 변수만 건드린다"는 뜻입니다. 네 필드를 풀어 보면 이렇습니다. `ext`: \\(\psi'\\)은 \\(\psi\\)를 확장한다. `ok`: \\(\psi'\\)은 좋은 해다. `keep`: \\(V\\) 밖에서 \\(\bullet\\)이던 변수는 계속 \\(\bullet\\)이다. `grow`: \\(\bullet\\)이던 변수를 새 해에서 해소하면 그 결과에는 자기 자신, \\(V\\)의 변수, 새 변수(\\(\psi\\)에 없던 변수)만 나온다. 그림으로 보면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 640 262" width="100%" style="max-width: 640px" role="img" aria-label="Step 불변식: V 안의 풀리지 않은 변수 β는 새 해에서 풀릴 수 있지만 그 답에는 β, V의 변수, 새 변수만 나온다. V 밖의 풀리지 않은 변수 α는 계속 풀리지 않은 상태로 남는다. 해에 없던 새 변수 γ는 새로 생길 수 있다." xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" fill="currentColor">
<defs><marker id="lean-inference-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="190" y="12" width="130" height="28" rx="4" fill="#2a408e"/>
<text x="255" y="31" text-anchor="middle" font-size="14" fill="#fff">ψ (걸음 전)</text>
<rect x="410" y="12" width="180" height="28" rx="4" fill="#2a408e"/>
<text x="500" y="31" text-anchor="middle" font-size="14" fill="#fff">ψ' (걸음 뒤)</text>
<text x="10" y="76" font-size="14">V 안의 변수</text>
<rect x="190" y="56" width="130" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="255" y="78" text-anchor="middle" font-size="15">β ↦ •</text>
<polyline points="320,73 406,73" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#lean-inference-2)"/>
<rect x="410" y="56" width="180" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="500" y="78" text-anchor="middle" font-size="15">β ↦ γ → num</text>
<text x="500" y="108" text-anchor="middle" font-size="12">grow: 답에는 β, V의 변수, 새 변수만</text>
<text x="10" y="146" font-size="14">V 밖의 변수</text>
<text x="10" y="164" font-size="12">(예: 묶인 변수)</text>
<rect x="190" y="126" width="130" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="255" y="148" text-anchor="middle" font-size="15">α ↦ •</text>
<polyline points="320,143 406,143" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#lean-inference-2)"/>
<rect x="410" y="126" width="180" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="500" y="148" text-anchor="middle" font-size="15">α ↦ •</text>
<text x="500" y="178" text-anchor="middle" font-size="12">keep: 그대로 풀리지 않음</text>
<text x="10" y="216" font-size="14">새 변수</text>
<rect x="190" y="196" width="130" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="255" y="218" text-anchor="middle" font-size="15">γ ∉ dom ψ</text>
<polyline points="320,213 406,213" fill="none" stroke="currentColor" stroke-width="1.8" marker-end="url(#lean-inference-2)"/>
<rect x="410" y="196" width="180" height="34" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="500" y="218" text-anchor="middle" font-size="15">γ ↦ •</text>
<text x="500" y="248" text-anchor="middle" font-size="12">새로 만든 변수는 자유롭게 쓸 수 있음</text>
</svg>
</div>

기본이 되는 걸음은 셋입니다. 새 변수 만들기 \\(\psi[\alpha \mapsto \bullet]\\)는 어떤 \\(V\\)에 대해서도 걸음입니다(`Step.fresh`). 변수 하나 풀기 \\(\psi[\alpha \mapsto \tau']\\)는, 출현 검사를 통과했다면 \\(\alpha\\)와 \\(\tau'\\)의 변수를 \\(V\\)로 하는 걸음입니다(`Step.setS`, 앞 절에서 본 랭크 논증이 이 정리의 일부입니다). 그리고 이 둘로 이루어진 `unify`는 두 인자를 해소한 결과에 나오는 변수들을 \\(V\\)로 하는 걸음입니다.

```lean
theorem unify_step {t1 t2 σ σ'} (h : Unify t1 t2 σ σ') :
    SolOK σ → InDom σ t1 → InDom σ t2 → Step σ σ' (UnifyVars σ t1 t2) := by
```

`InDom σ t`는 `t`의 변수가 모두 정의역 안에 있다는 조건이고, `UnifyVars σ t1 t2`는 \\(\mathtt{resolve}(\tau_1, \psi)\\)나 \\(\mathtt{resolve}(\tau_2, \psi)\\)에 나오는 변수들의 집합입니다. 걸음은 `Step.trans`로 이어 붙입니다. 이어 붙일 때는 두 번째 걸음의 \\(V\\)가 첫 걸음 기준으로 "\\(V\\)의 변수이거나 새 변수"라는 것을 보여야 해서, 증명 곳곳에 `OrNew V σ`(\\(V\\)에 있거나 \\(\psi\\)에 없는 변수)라는 집합이 등장합니다.

### 추론의 불변식 `infer_inv`

이제 추론 판단 전체가 `Step`을 만족한다는 것을 보입니다. 이때 \\(V\\)는 **타입 환경의 자유 변수** `EnvFV Γ σ`입니다.

```lean
structure InferInv (Γ : TEnv) (σ0 : Sol) (t : Ty) (σ1 : Sol) : Prop where
  step : Step σ0 σ1 (EnvFV Γ σ0)
  dom : InDom σ1 t
  rt : VarsIn σ1 t (OrNew (EnvFV Γ σ0) σ0)
```

```lean
theorem infer_inv {Γ σ0 e t σ1} (h : Infer Γ σ0 e t σ1) :
    SolOK σ0 → EnvOK Γ σ0 → InferInv Γ σ0 t σ1 := by
```

`step`이 핵심이고, 나머지 두 필드는 귀납을 돌리기 위해 함께 들고 다니는 정보입니다. 특히 `rt`는 "결과 타입을 해소하면 환경의 자유 변수나 새 변수만 나온다"는 것인데, 이것이 있어야 규칙 끝의 `unify`가 \\(V\\) 밖을 건드리지 않는다는 것을 보일 수 있습니다. 예를 들어 \\(\tau\\)-`App`에서 \\(\mathtt{unify}(\tau_a \to \alpha_r, \tau_f, \ldots)\\)가 건드리는 변수는 \\(\tau_a\\), \\(\tau_f\\), \\(\alpha_r\\)를 해소한 결과의 변수들인데, `rt` 덕분에 이것들이 모두 환경의 자유 변수이거나 새 변수입니다. 이 논증을 묶은 보조정리가 `Step.unify_after`입니다.

`infer_inv`는 `Infer`에 대한 귀납법으로 증명하며, 경우마다 하위 판단의 걸음을 `Step.trans`로 잇는 일을 반복합니다. 이 성질은 **실행과 전혀 상관이 없다**는 점을 기억해 두세요. 타입 추론이라는 알고리즘 자체의 성질이고, 아래층의 안전성 증명은 이것을 블랙박스처럼 가져다 씁니다.

## 좋은 환경 `EnvOK`

`Step`이 "추론은 환경의 자유 변수만 건드린다"를 말해 주었으니, 남은 것은 "묶인 변수는 환경의 자유 변수가 아니다"를 불변식으로 지키는 일입니다. 이것이 <a id="g-good-environment"></a>**좋은 환경** `EnvOK`입니다.

```lean
structure EnvOK (Γ : TEnv) (σ : Sol) : Prop where
  dom : ∀ x as t, lookup Γ x = some (as, t) → InDom σ t
  bnd : ∀ x as t, lookup Γ x = some (as, t) → ∀ a ∈ as, σ a = some none
  disj : ∀ x as t, lookup Γ x = some (as, t) → ∀ a ∈ as, ¬ EnvFV Γ σ a
```

환경의 스킴 \\(\forall(\alpha_1, \ldots, \alpha_m).\tau\\)마다, \\(\tau\\)의 변수는 정의역 안에 있고(`dom`), 묶인 변수 \\(\alpha_i\\)는 \\(\bullet\\) 상태이며(`bnd`), 환경의 자유 변수가 아닙니다(`disj`). `gen`이 만든 스킴은 정의상 이 조건을 만족합니다. 묶인 변수는 \\(\mathtt{free}\_{\tau}\\)의 원소라 \\(\bullet\\)이고, \\(\mathtt{free}\_{\Gamma}\\)에서 뺐으니 환경의 자유 변수가 아니지요. 이것이 `envOK_val`입니다.

이제 `x : ∀α.τ`가 환경에 있는 동안 추론이 한 걸음 나아간다고 합시다. 그 걸음은 `Step _ _ (EnvFV Γ σ)`입니다.

- \\(\alpha\\)는 환경의 자유 변수가 아니므로(`disj`), `keep`에 따라 계속 \\(\bullet\\)입니다. 즉 **풀리지 않습니다**.
- 환경의 자유 변수 \\(\beta\\)를 새 해에서 해소하면, `grow`에 따라 \\(\beta\\) 자신, 환경의 자유 변수, 새 변수만 나옵니다. \\(\alpha\\)는 셋 중 어느 것도 아닙니다. 새 변수가 아닌 것은 `bnd`(이미 정의역에 있음) 때문이고, 자유 변수가 아닌 것은 `disj` 때문입니다. 즉 \\(\alpha\\)는 **붙잡히지 않습니다**. 이것이 `envFV_forward`("자유 변수의 답에는 자유 변수만 나온다")입니다.
- 그러니 걸음 뒤에도 `EnvOK`가 유지됩니다(`envOK_step`).

```lean
theorem envOK_step {Γ σ0 σ1 V} (hσ : SolOK σ0) (hΓ : EnvOK Γ σ0) (S : Step σ0 σ1 V)
    (hv : ∀ b, V b → OrNew (EnvFV Γ σ0) σ0 b) : EnvOK Γ σ1 where
```

`inst`는 묶인 변수를 새 변수로 이름만 바꿔 꺼내므로, 묶인 변수 자체는 `x`를 쓰는 곳의 `unify`에 들어가지도 않습니다. 이것을 정리로 쓴 것이 `inst_shape`입니다. 인스턴스는 \\(\mathtt{resolve}(\tau, \psi)\\)에서 묶인 변수 `as`를 새 변수 `as'`으로 바꾼 것(`subst (ren (as.zip as')) t0`)입니다.

```lean
theorem inst_shape {σ : Sol} {as as' : List Nat} {ts t} (hσ : SolOK σ)
    (hfr : ∀ a ∈ as', σ a = none) (hbnd : ∀ a ∈ as, σ a = some none)
    (hres : Resolve (updS σ (as.zip as')) ts t) :
    ∃ t0, Resolve σ ts t0 ∧ t = subst (ren (as.zip as')) t0 := by
```

뒤에 볼 예제 `ex_poly2`에서도 이 모습을 확인할 수 있습니다. 묶인 변수 \\(\alpha_0\\)은 끝까지 \\(\bullet\\)이고, `id`의 두 인스턴스는 각각 새 변수 \\(\alpha_1\\)과 \\(\alpha_3\\)을 씁니다.

> **자주 하는 실수.** "묶인 변수는 \\(\forall\\) 아래에 있으니 해와 상관없다"고 생각하기 쉽지만, `TIFAE`의 스킴은 해 바깥의 별도 이름 공간이 아니라 **같은 해의 변수**를 묶습니다. `Gen`이 묶는 \\(\alpha_0\\)은 해에 \\(\alpha_0 \mapsto \bullet\\)으로 그대로 남아 있습니다. 그래서 "다른 계산이 이 변수를 건드리지 않는다"를 `Step`과 `EnvOK`로 따로 증명해야 합니다.

## 값의 타입과 스킴의 해석

이제 아래층, 실행과 타입을 잇는 쪽으로 내려갑니다. [연료와 결과 분류](./lean-fuel.md) 장과 같이 값의 타입 `VT`와 환경의 타입 `EnvT`를 정의하는데, 두 가지가 달라집니다. 클로저가 무엇을 들고 다니는지, 그리고 환경의 스킴을 어떻게 해석하는지입니다.

### 클로저는 추론 유도와 모델을 들고 다닌다

```lean
inductive VT : Value → Ty → Prop
  | num {n} : VT (.num n) .num
  | bool {b} : VT (.bool b) .bool
  | clo {x b ρ Γ σ a tb σb M} :
      Infer ((x, ([], .var a)) :: Γ) σ b tb σb → SolOK σ →
      EnvOK ((x, ([], .var a)) :: Γ) σ → σ a = some none → Model M σb →
      EnvDom ρ Γ → EnvTF VT σ M ρ Γ →
      VT (.clo x b ρ) (.arrow (M a) (subst M tb))
```

`TFAE`의 `VT.clo`가 몸통의 `HasType` 유도를 들고 다녔듯이, 여기서는 몸통의 `Infer` 유도와 **그 마지막 해의 모델** `M`을 함께 들고 다닙니다. 클로저의 타입은 매개변수 변수 \\(\alpha\\)와 몸통 타입을 그 모델로 해석한 `M a → subst M tb`입니다. 환경 조건을 `EnvDom`과 `EnvTF VT`로 쪼갠 것은 [연료와 결과 분류](./lean-fuel.md) 장에서 본 것과 같은 이유(Lean의 양성 조건)입니다. 재귀 클로저 `rclo`도 같은 모양인데, \\(\tau\\)-`Rec`의 몸통 유도와 \\(\mathtt{unify}(\tau_b, \alpha_r)\\), 그리고 그 결과 해의 모델을 들고 다니며, 호출할 때 자기 자신을 다시 묶는 방식은 [허용된 오류와 재귀](./lean-errors.md) 장과 같습니다.

\\(\tau\\)-`Fun` 경우에서는 바깥의 모델을 그대로 넣어 클로저를 만들고, \\(\tau\\)-`App` 경우에서는 함수 값의 `VT`를 `cases`로 열어 그 안의 유도와 모델 `Mc`에 귀납 가정을 씁니다. 바깥 모델 `M`과 클로저 안의 모델 `Mc`가 다르다는 점이 재미있습니다. 둘을 잇는 것은 `unify_model`이 준 등식 `subst M tf = subst M ta → M r`와 `VT.clo`의 타입 `Mc a → subst Mc tb`를 맞춘 결과입니다. 모델이 달라도 **타입이 같으면** 충분한 것이지요.

### 스킴의 해석: 모든 인스턴스에서

환경에는 스킴이 들어 있습니다. 값 \\(v\\)가 스킴 \\(\forall(\alpha_1, \ldots, \alpha_m).\tau\\)를 만족한다는 것은 무슨 뜻일까요?

```lean
def SchemeOKF (P : Value → Ty → Prop) (σ : Sol) (M : Nat → Ty) (v : Value) (s : Scheme) :
    Prop :=
  ∀ (as' : List Nat) (ti : Ty), as'.length = s.1.length → (∀ a ∈ as', σ a = none) →
    Resolve (updS σ (s.1.zip as')) s.2 ti →
    ∀ M' : Nat → Ty, (∀ b, b ∉ as' → M' b = M b) → P v (subst M' ti)
```

`inst`가 낼 수 있는 **모든 인스턴스** `ti`(새 변수 `as'` 사용)에 대해, 그리고 새 변수를 **아무렇게나** 해석하되 나머지는 `M`대로 해석하는 **모든** `M'`에 대해, \\(v\\)가 타입 `subst M' ti`를 가진다는 것입니다. "아무 타입에서나 쓸 수 있다"는 \\(\forall\\)의 뜻을, 새 변수의 해석을 자유롭게 바꾸는 것으로 표현했습니다. 이것은 [논리 관계](./lean-logical-relations.md) 장에서 \\(\forall\\) 타입을 "모든 타입 해석에서"로 읽은 것과 같은 정신입니다. 다만 `TIFAE`의 \\(\forall\\)은 맨 바깥에만 있으므로, 타입의 구조를 따라 해석을 정의할 필요 없이 스킴 한 겹만 이렇게 풀면 됩니다.

정의를 `inst`의 모양 그대로 쓴 덕분에 \\(\tau\\)-`Id` 경우는 정의를 펼치고 `M' := M`을 넣는 것으로 끝납니다. 환경의 타입은 환경의 모든 항목이 이 해석을 만족한다는 것입니다.

```lean
def EnvT (σ : Sol) (M : Nat → Ty) (ρ : Env) (Γ : TEnv) : Prop :=
  ∀ x s, lookup Γ x = some s → ∃ v, lookup ρ x = some v ∧ SchemeOK σ M v s
```

`EnvT`에 대한 성질 두 개가 증명의 이음매 역할을 합니다.

```lean
theorem envT_step {Γ σ0 σ1 V M ρ} (hσ : SolOK σ0) (hΓ : EnvOK Γ σ0) (S : Step σ0 σ1 V)
    (hv : ∀ b, V b → OrNew (EnvFV Γ σ0) σ0 b) (hM : Model M σ1) (h : EnvT σ0 M ρ Γ) :
    EnvT σ1 M ρ Γ := by
```

```lean
theorem envT_congr {Γ σ M1 M2 ρ} (hσ : SolOK σ) (hΓ : EnvOK Γ σ)
    (hM : ∀ b, EnvFV Γ σ b → M1 b = M2 b) (h : EnvT σ M1 ρ Γ) : EnvT σ M2 ρ Γ := by
```

`envT_step`은 환경의 자유 변수만 건드린 걸음 뒤의 해로 `EnvT`를 옮겨 줍니다. 새 해에서의 해소 결과는 옛 결과에 자유 변수의 답이 채워진 것뿐이고, 모델은 그 차이를 구별하지 못합니다(`Resolve.model`). 묶인 변수는 풀리지도 붙잡히지도 않으니 이름 바꾸기와도 충돌하지 않습니다. `envT_congr`는 `EnvT`가 모델의 **환경의 자유 변수 위의 값에만** 의존한다는 것입니다. 묶인 변수와 새 변수의 해석은 어차피 `SchemeOKF`의 `M'`이 마음대로 바꾸니까요.

## \\(\tau\\)-`Val`: 귀납 가정을 여러 번 쓴다

증명에서 가장 흥미로운 곳은 let-다형성의 \\(\tau\\)-`Val`입니다. `val x = e1; e2`에서 `x`를 환경에 스킴 `(as, t1)`으로 넣었으니, `e1`의 값 \\(v\\)가 그 스킴을 만족한다는 것, 즉 `SchemeOK σ1 M v (as, t1)`을 보여야 합니다.

교과서의 Hindley-Milner 안전성 증명에서는 여기에 <a id="g-substitution-lemma"></a>**대입 보조정리**(substitution lemma), 즉 "타입 유도는 타입 변수 대입에 대해 닫혀 있다"가 필요합니다. 다형적인 `x`를 특정 타입에서 쓸 때, `e1`의 유도에 대입을 적용해 그 타입의 유도를 만들기 때문입니다. 그런데 `TIFAE`의 판단은 해를 들고 다니는 알고리즘이라, 유도에 대입을 적용한다는 것부터가 까다롭습니다. 이 증명은 대입 보조정리 대신 **귀납 가정을 인스턴스마다 한 번씩** 씁니다.

```lean
theorem schemeOK_gen {Γ σ σ1 e1 t1 as M ρ n v}
    (hσ : SolOK σ) (hΓ : EnvOK Γ σ) (S : Step σ σ1 (EnvFV Γ σ)) (hg : Gen t1 Γ σ1 as)
    (hM1 : Model M σ1) (hρ : EnvT σ M ρ Γ)
    (IH : ∀ {N}, Model N σ1 → EnvT σ N ρ Γ → Sound (eval n ρ e1) (fun v => VT v (subst N t1)))
    (hv : eval n ρ e1 = some (.ok v)) : SchemeOK σ1 M v (as, t1) := by
  intro as' ti hlen hfr hres M' hM'
  have hbnd : ∀ a ∈ as, σ1 a = some none :=
    fun a ha => freeT_unsolved ((hg.2 a).mp ha).1
  obtain ⟨t1', h1', rfl⟩ := inst_shape S.ok hfr hbnd hres
  have IH' := IH (canon_model S.ok) (envT_congr hσ hΓ (gen_agree hσ hΓ S hM1 hg hfr hM') hρ)
  rw [hv] at IH'
  change VT v _ at IH'
  rw [canon_resolve h1'] at IH'
  rw [subst_subst]; exact IH'
```

`e1`을 실행한 값 \\(v\\)는 하나뿐이지만, 귀납 가정 `IH`는 `σ1`의 **모든 모델** `N`에 대해 성립합니다. 기본 보조정리를 "모든 모델에 대해"로 일반화해 둔 것이 여기서 빛을 봅니다. 증명의 흐름은 세 걸음입니다.

1. `inst_shape`로 인스턴스 `ti`가 \\(\mathtt{resolve}(t_1, \psi_1)\\)에서 묶인 변수를 새 변수로 바꾼 것임을 압니다.
2. 인스턴스마다 다른 모델을 고릅니다. 표준 모델 \\(N = \mathtt{canon}\ \psi_1\ (M' \circ \mathit{ren})\\)인데, 변수 \\(\alpha\\)를 \\(M'(\mathit{ren}(\mathtt{resolve}(\alpha, \psi_1)))\\)로 보냅니다. 좋은 해에서는 언제나 모델이고(`canon_model`), `subst N t1`이 정확히 `subst M' ti`가 됩니다(`canon_resolve`와 대입의 합성 `subst_subst`).
3. 이 \\(N\\)은 환경의 자유 변수에서 `M`과 같습니다(`gen_agree`). 자유 변수의 답에는 자유 변수만 나오고(`envFV_forward`), 자유 변수는 묶인 변수도 새 변수도 아니기 때문입니다. 그러니 `envT_congr`로 `EnvT σ N ρ Γ`를 얻고, `IH`를 쓰면 끝납니다.

3번에서 "일반화된 변수는 풀리지도 붙잡히지도 않는다"가 결정적으로 쓰입니다. 묶인 변수를 `M'`이 아무 타입으로 보내도 자유 변수의 해석이 그대로여야 환경의 타입이 유지되는데, 묶인 변수가 자유 변수의 답에 붙잡혀 있었다면 이것이 깨집니다. 앞 절의 `Step`과 `EnvOK`가 모두 이 한 줄을 위해 준비된 셈입니다.

실행 쪽에서 보면 이 방식은 아주 자연스럽습니다. 인터프리터는 `e1`을 **한 번만** 계산하고, 그 값 하나를 `x`의 모든 쓰임이 나눠 씁니다. 증명도 값 \\(v\\)는 하나로 두고, 그 값이 여러 타입을 가진다는 것을 귀납 가정을 여러 번 불러 보입니다. 이 귀납 가정은 `sound_infer` 자신을 재귀 호출하는 것입니다. `sound_infer`는 `induction` 전술 대신 연료에 대한 패턴 매칭으로 정의한 재귀 정리라서, 더 작은 연료 `n`으로 다른 모델과 환경에 대해 자유롭게 부를 수 있습니다. 실제 \\(\tau\\)-`Val` 경우는 이렇습니다.

```lean
    | @val _ _ σ1 _ x e1 e2 t1 t2 as h1 hg h2 =>
      have R1 := infer_inv h1 hσ hΓ
      have hσ1 := R1.step.ok
      have hΓ1 := envOK_step hσ hΓ R1.step (fun _ h => Or.inl h)
      have hΓ' := envOK_val hσ1 hΓ1 hg R1.dom (x := x)
      have R2 := infer_inv h2 hσ1 hΓ'
      have hM1 := hM.mono R2.step.ext
      have hρ1 := envT_step hσ hΓ R1.step (fun _ h => Or.inl h) hM1 hρ
      have IH1 := sound_infer n h1 hσ hΓ hM1 hρ
      simp only [eval]
      cases hr : eval n ρ e1 with
      | none => simp [bindR, Sound]
      | some r =>
        cases r with
        | error er => rw [hr] at IH1; exact IH1
        | ok v =>
          simp only [bindR]
          refine sound_infer n h2 hσ1 hΓ' hM (envT_cons hρ1 ?_)
          exact schemeOK_gen hσ hΓ R1.step hg hM1 hρ
            (fun hN hρN => sound_infer n h1 hσ hΓ hN hρN) hr
```

마지막 줄의 `fun hN hρN => sound_infer n h1 hσ hΓ hN hρN`가 "모든 모델에 대한 귀납 가정"을 `schemeOK_gen`에 넘기는 부분입니다.

## 기본 보조정리의 큰 그림

`sound_infer`의 나머지 경우도 모두 같은 네 단계를 밟습니다.

1. `infer_inv`로 하위 판단의 해가 좋은 해(`SolOK`)이고 환경이 좋은 환경(`EnvOK`)임을 얻습니다.
2. 마지막 모델 `M`을 `Model.mono`로 중간 해들에 내려 보냅니다.
3. `unify` 전제를 `unify_model`로 `M`에서의 등식으로 바꿉니다.
4. 환경의 타입을 `envT_step`으로 하위 판단의 출발 해로 옮기고, 귀납 가정을 씁니다.

경우마다 더할 것은 많지 않습니다. \\(\tau\\)-`Add` 등과 \\(\tau\\)-`If`는 3번의 등식으로 피연산자와 조건 값의 모양(수인지, 불인지)을 압니다. \\(\tau\\)-`Id`는 스킴 해석의 정의 그대로입니다. \\(\tau\\)-`Fun`과 \\(\tau\\)-`Rec`는 클로저를 만들어 유도와 모델을 담습니다. \\(\tau\\)-`App`는 함수 값의 `VT`를 열어 클로저 안의 유도에 귀납 가정을 씁니다. \\(\tau\\)-`Val`은 앞 절에서 본 `schemeOK_gen`입니다. \\(\tau\\)-`App` 경우의 앞부분만 보면 네 단계가 그대로 보입니다(뒷부분은 `...`로 줄였습니다).

```lean
    | @app _ _ σf σa _ f ea tf ta r hf ha hr hu =>
      have Rf := infer_inv hf hσ hΓ
      have hΓf := envOK_step hσ hΓ Rf.step (fun _ h => Or.inl h)
      have Ra := infer_inv ha Rf.step.ok hΓf
      have hl : ∀ c ∈ [r], σa c = none := by simp [hr]
      have Sar := Step.fresh (V := fun _ => False) Ra.step.ok hl
      have hMr := hM.mono (unify_ext hu)
      have hMa := hMr.mono Sar.ext
      have hMf := hMa.mono Ra.step.ext
      have hρf := envT_step hσ hΓ Rf.step (fun _ h => Or.inl h) hMf hρ
      have e : Ty.arrow (subst M ta) (M r) = subst M tf := unify_model hu hM
      have IHa := sound_infer n ha Rf.step.ok hΓf hMa hρf
      simp only [eval]
      refine (sound_infer n hf hσ hΓ hMf hρ).bind fun fv hfv => ?_
      rw [← e] at hfv
      generalize hT : Ty.arrow (subst M ta) (M r) = T at hfv
      cases hfv with
      | num => cases hT
      | bool => cases hT
      ...
```

`hMr`, `hMa`, `hMf`가 2번, `e`가 3번, `hρf`가 4번입니다. 함수 값의 타입이 화살표라는 등식 `e`를 써서 `VT`를 열면, `num`과 `bool` 경우는 타입이 맞지 않아(`cases hT`) 바로 사라지고 `clo`와 `rclo` 경우만 남습니다. 앞 장들과 마찬가지로 이것이 "함수가 아닌 값을 호출하는 오류 `notFun`은 일어나지 않는다"는 말의 증명입니다.

## 예제: 손으로 만든 유도

추상적인 정의만 보면 유도가 실제로 어떻게 생겼는지 감이 잘 오지 않습니다. 이 책의 Lean 프로젝트에는 `TIFAE` 유도 세 개를 손으로 만든 예제가 있습니다. 가장 큰 것은 같은 `id`를 `bool`과 `num`에서 모두 쓰는 let-다형성 예제 `val id = x => x; if (id(true)) id(1) else 0`입니다.

```lean
def ePoly2 : Expr :=
  .val "id" eId (.ite (.app (.id "id") (.bool true)) (.app (.id "id") (.num 1)) (.num 0))
```

```lean
def σPoly2 : Sol := setS (setS (freshUpd (freshUpd σPoly [3]) [4]) 3 .num) 4 .num
```

```lean
theorem ex_poly2 : Infer [] σ₀ ePoly2 (.var 4) σPoly2 := by
  refine Infer.val ex_id gen_id ?_
  refine Infer.ite (tc := .var 2) (σc := σPoly) (σt := σPoly2) (σe := σPoly2) (σ' := σPoly2) ?_ ?_ Infer.num ?_ ?_
  · -- condition `id(true) : α₂` (instance `α₁ → α₁`)
    refine Infer.app (Infer.id rfl (inst_id (k := 1) rfl (by decide))) Infer.bool (r := 2) rfl ?_
    exact unify_app rfl rfl (by decide) (fun _ => .bool) rfl rfl
  · -- then-branch `id(1) : α₄` (instance `α₃ → α₃`)
    refine Infer.app (Infer.id rfl (inst_id (k := 3) rfl (by decide))) Infer.num (r := 4) rfl ?_
    exact unify_app rfl rfl (by decide) (fun _ => .num) rfl rfl
  · -- `unify(α₂, bool)`
    exact Unify.bool (.solved rfl .bool) .bool
  · -- `unify(α₄, num)`
    exact Unify.num (.solved rfl .num) .num
```

`ex_id`는 `x => x : α₀ → α₀`의 유도, `gen_id`는 \\(\mathtt{gen}(\alpha_0 \to \alpha_0, \varnothing, \psi) = \forall \alpha_0. \alpha_0 \to \alpha_0\\), `inst_id`는 그 스킴을 새 변수 \\(\alpha_k\\)로 꺼내는 인스턴스화, `unify_app`은 `id(e)`의 단일화가 \\(\alpha_k\\)와 \\(\alpha_{k+1}\\)을 인자 타입으로 푼다는 보조정리입니다. 해가 구체적인 함수이므로 `σ a`의 값을 `rfl`로 계산할 수 있고, 그래서 새 변수 조건, \\(\bullet\\) 상태, 출현 검사 같은 옆 조건을 모두 `rfl`과 `decide`로 채웁니다(`decide`는 결정 가능한 명제를 계산으로 확인하는 전술입니다). 마지막 해 `σPoly2`에서 \\(\alpha_1, \alpha_2\\)는 `bool`, \\(\alpha_3, \alpha_4\\)는 `num`으로 풀리고, 묶인 변수 \\(\alpha_0\\)은 끝까지 \\(\bullet\\)으로 남습니다. 앞 절의 `Step`과 `EnvOK`가 말한 그대로입니다.

예제 파일은 실행 결과도 `rfl`로 확인하고(`eval 10 [] ePoly2 = ret (.num 1)`), 주정리를 예제에 적용해 보기도 합니다. 손으로 유도를 만들어 보면, 같은 `id`의 두 쓰임이 서로 다른 새 변수를 받는다는 let-다형성의 핵심이 눈에 보입니다.

## 구현과의 대응

[연료와 결과 분류](./lean-fuel.md) 장에서는 Lean으로 옮긴 타입 검사기가 타입 규칙과 일치한다는 것(`typeCheck_iff`)까지 증명했습니다. `TIFAE`에서는 Scala의 `typeCheck`를 Lean으로 옮기지 않았습니다. 그래서 "구현의 `typeCheck`가 결과를 내면 `Infer` 판단이 성립한다"는 Lean 정리가 아니라, 정의를 나란히 읽어서 확인하는 대응입니다. 나란히 읽을 때 차이 나는 곳은 다음 정도이고, 모두 관계 쪽이 더 너그러워서 구현의 유도를 덮습니다.

- `Unify`는 서로 다른 두 변수에서 `left`와 `right`를 모두 허용합니다(구현은 `left`).
- 새 변수는 "해에 없는 아무 변수"입니다. 구현의 `sol.size`는 그중 한 가지 선택입니다.
- `Gen`은 묶을 변수의 순서를 따지지 않습니다.
- `Sol`은 유한 맵이 아니라 `Nat`에서의 함수입니다. 증명은 정의역이 유한하다는 사실을 쓰지 않습니다.

> **생각해 보기.** 이 장의 정리는 "추론이 **성공하면** 안전하다"만 말합니다. 반대 방향, 즉 "선언적으로 타입이 있는 프로그램이면 추론이 성공하고, 가장 일반적인 타입인 <a id="g-principal-type"></a>주 타입(principal type)을 낸다"는 **완전성**(completeness)은 다루지 않았습니다. 안전성만으로는 모든 프로그램을 거부하는 추론기도 통과한다는 점을 생각하면, 완전성도 꽤 중요한 성질입니다. 연습 문제에서 다시 다룹니다.

## 4부를 마치며

4부에서는 2부의 타입 있는 언어들이 타입 안전하다는 것을 Lean으로 증명했습니다. 돌아보면 모든 증명이 같은 뼈대 위에 서 있었고, 장마다 그 뼈대에 **새 아이디어 하나**를 더했습니다.

- [기계로 확인하는 증명](./lean-intro.md): 왜 기계로 확인하는지, 정리의 모양, 이 부에 필요한 Lean.
- [연료와 결과 분류](./lean-fuel.md)(`TFAE`): 연료 기반 인터프리터, 타입 규칙을 귀납적 관계로, 값의 타입 `VT`와 환경의 타입 `EnvT`, 결과 분류 `Sound`, 연료에 대한 귀납법. 이후 모든 장의 뼈대입니다.
- [허용된 오류와 재귀](./lean-errors.md)(`TRFAE`): 타입 오류가 아닌 오류를 `Sound`에 허용하기, 순환 환경 대신 자기 자신을 다시 묶는 재귀 클로저.
- [타입 이름의 스코프](./lean-scopes.md)(`ATFAE`): 타입 이름은 전역이 아니므로 값의 타입을 타입 정의 맵에 매개변수화하기.
- [두 가지 서브타입 관계](./lean-subtyping.md)(`STFAE`): 선언적 서브타입 관계의 유도를 알고리즘적 관계로 옮겨 안전성을 얻고, 값의 타입을 "서브타입"으로 읽기.
- [논리 관계](./lean-logical-relations.md)(`PTFAE`): 문법적 값의 타입으로는 다형성을 다룰 수 없어서, 타입을 의미로 해석하는 논리 관계와 기본 보조정리.
- 이 장(`TIFAE`): 알고리즘 판단에 대해 직접 증명하기 위한 모델, 출현 검사와 좋은 해, 불변식 `Step`과 좋은 환경 `EnvOK`, 대입 보조정리 대신 귀납 가정을 여러 번 쓰는 let-다형성.

뼈대가 같다는 것은 중요한 교훈입니다. 언어가 바뀌어도 "값의 타입을 정의하고, 실행 결과를 분류하고, 연료에 대해 귀납한다"는 틀은 그대로이고, 언어의 새 기능이 요구하는 것은 대개 **값의 타입을 무엇으로 정의할지**와 **귀납 가정을 얼마나 강하게 일반화할지**입니다. 이 장에서도 `VT`가 모델을 들고 다니게 하고, 기본 보조정리를 모든 모델에 대해 일반화한 것이 핵심이었습니다.

또 하나의 교훈은 기계가 우리 대신 **빈틈을 찾아 준다**는 것입니다. [타입 이름의 스코프](./lean-scopes.md)과 [논리 관계](./lean-logical-relations.md) 장에서 보았듯, 그럴듯해 보이던 규칙 초안의 반례가 증명을 시도하는 과정에서 드러났습니다. 손으로 쓴 증명이라면 "같은 방식으로"라는 한 마디에 묻혔을 경우들입니다.

3부의 언어들, 즉 [클래스와 상속](./classes.md), [유계 다형성과 변성](./bounded-polymorphism.md), [타입 클래스](./type-classes.md), [선형 타입과 소유권](./linear-types.md), [점진적 타입](./gradual-typing.md)의 타입 안전성 증명은 이 부에 나중에 더할 예정입니다(준비 중). 그 증명들도 같은 뼈대에서 출발해, 언어마다 "앞 장의 방법으로는 왜 부족한가"를 묻는 방식으로 쓰일 것입니다.

## 정리

- `TIFAE`의 타입 규칙 \\(\Gamma, \psi \vdash e : \tau, \psi'\\)은 해를 넣고 빼는 알고리즘입니다. 이 장의 증명은 선언적 체계를 거치지 않고 알고리즘 판단 `Infer`에 대해 곧바로 타입 안전성을 증명합니다.
- 해는 `Nat → Option (Option Ty)`이고, `resolve`, `unify`, `gen`, `inst`는 끝남을 미리 보일 필요가 없도록 귀납적 관계로 정의합니다. `Unify`는 구현보다 너그러워서 구현의 유도를 덮습니다.
- 추론 도중의 타입은 **마지막 해의 모델**로 해석합니다. 해는 커지기만 하므로(`Model.mono`) 같은 모델을 하위 식에 넘길 수 있고, `unify_model`이 단일화를 모델에서의 등식으로 바꿉니다. 주정리에서는 표준 모델 `canon`을 고릅니다.
- **좋은 해** `SolOK`는 닫혀 있고 랭크 함수로 순환이 없음을 표현합니다. 출현 검사가 이것을 지키고(`Step.setS`), 덕분에 `resolve`가 끝납니다(`resolve_total`).
- 불변식 `Step σ σ' V`는 계산이 \\(V\\)와 새 변수만 건드린다는 것이고, 추론 판단은 \\(V\\)를 환경의 자유 변수로 하여 이를 만족합니다(`infer_inv`). **좋은 환경** `EnvOK`와 함께, 일반화된 변수는 풀리지도 붙잡히지도 않음을 보장합니다.
- 클로저의 값 타입은 몸통의 추론 유도와 모델을 들고 다니고, 스킴은 "모든 인스턴스와 새 변수의 모든 해석에서"로 해석합니다.
- \\(\tau\\)-`Val`은 대입 보조정리 대신, 모든 모델에 대해 일반화한 귀납 가정을 인스턴스마다 표준 모델로 불러 해결합니다(`schemeOK_gen`).
- 4부의 모든 증명은 같은 뼈대 위에 언어마다 새 아이디어 하나를 더한 것입니다.

## 연습 문제

1. `Unify`의 `left`와 `right`에서 출현 검사 조건 `occurs a t2' = false`(와 `occurs a t1' = false`)를 지워 보세요. `lake build`를 돌리면 어느 정리가 처음 깨지나요? `Step.setS`의 `acyc` 부분, 그리고 그에 기대는 `resolve_total`과 주정리의 \\(\exists \tau'\\)이 어떻게 영향을 받는지 설명하고, 출현 검사 없이 추론이 성공하게 되는 `TIFAE` 식을 하나 찾아보세요(힌트: `x => x(x)`).
2. `Gen`의 조건 `¬ FreeEnv σ Γ a`를 지워서 환경의 자유 변수까지 일반화하게 바꾸면 어디가 깨지나요? `envOK_val`과 `gen_agree`를 살펴보세요. 그리고 이렇게 바꾼 규칙에서는 타입 검사를 통과하지만 실행하면 `notFun` 오류가 나는 닫힌 식, 예를 들어 `(x => { val y = x; y(1) })(42)`의 추론 과정을 손으로 따라가 보세요.
3. `Unify`에서 `right` 생성자를 지워 Scala 구현과 똑같이 만들어 보세요. 증명은 그대로 통과하나요? 어떤 증명에서 경우가 줄어드나요?
4. `Resolve.model`과 방향만 반대인 보조정리 `theorem model_resolve_eq {M σ t t'} (hM : Model M σ) (h : Resolve σ t t') : subst M t = subst M t'`를, `Resolve.model`을 쓰지 않고 `Resolve`에 대한 귀납법으로 직접 증명해 보세요.
5. 예제 파일을 본떠 `val id = x => x; id(id)(1)`의 `Infer` 유도를 손으로 만들어 보세요. `id`의 두 인스턴스가 각각 어떤 새 변수를 받는지, 마지막 해가 무엇인지 먼저 종이에 적은 뒤 Lean으로 옮기면 쉽습니다.
6. (도전) \\(\tau\\)-`Rec`를 바꿔서, 재귀 함수의 몸통을 검사한 뒤 `f`의 타입을 `Gen`으로 일반화해 `e_s`의 환경에 넣도록 해 보세요(몸통 안에서는 여전히 단형). 이 규칙도 안전할까요? `infer_inv`, `VT.rclo`, `sound_infer`의 \\(\tau\\)-`Rec` 경우에서 무엇을 고쳐야 하는지 찾아보세요.
7. (도전) `¬ ∃ t σ, Infer [] σ₀ (.fn "x" (.app (.id "x") (.id "x"))) t σ`, 즉 `x => x(x)`는 추론에 실패한다는 것을 증명해 보세요. 유도를 거꾸로 따라가며 `Unify`가 출현 검사에 걸리는 지점을 찾아야 합니다.
8. (프로젝트) Scala의 `typeCheck`를 Lean 함수로 옮기고, 그 함수가 결과를 내는 것과 `Infer` 유도가 있는 것이 일치함을 증명해 보세요(`TFAE`의 `typeCheck_iff`에 해당). 함수 정의 단계에서 `resolve`가 끝난다는 것을 보여야 하므로, 좋은 해를 타입에 담는 등의 설계가 필요합니다. 더 나아가 주 타입 성질, 즉 추론이 낸 타입이 가장 일반적이라는 완전성을 어떻게 진술할지 생각해 보세요.
