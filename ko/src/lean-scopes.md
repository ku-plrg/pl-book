# 타입 이름의 스코프

[대수적 데이터 타입](./algebraic-data-types.md)에서 만든 ATFAE는 TRFAE에 `enum`과 `match`, 그리고 여러 매개변수를 받는 함수를 더한 언어입니다. 그 장의 끝에서 우리는 τ-TypeDef 규칙을 두 번 고쳤습니다. 같은 타입 이름을 다시 정의하지 못하게 하고(수정(1)), 타입 이름이 자기 스코프(scope) 밖으로 새어 나가지 못하게 했지요(수정(2)). 반례(counterexample)를 보고 구멍을 막았지만, 그것으로 정말 충분한지는 아직 아무도 증명하지 않았습니다. 이 장에서 그 증명을 봅니다.

증명의 틀은 [연료와 결과 분류](./lean-fuel.md)의 것이고, 허용된 오류 `divZero`와 재귀 클로저 `rclo`는 [허용된 오류와 재귀](./lean-errors.md)에서 본 그대로입니다. 새로 생기는 어려움은 하나입니다. **값이 타입 이름 `t`의 값이라는 말은 `t`의 정의를 알아야 뜻이 정해지는데, 타입 이름의 정의는 프로그램 전체에 하나로 정해져 있지 않습니다.** 같은 이름이 서로 다른 스코프에서 다르게 정의될 수 있기 때문입니다.

이 장에서는 먼저 Lean으로 옮긴 ATFAE를 간단히 훑고, "타입 이름의 정의를 전역 맵 하나로 두자"는 첫 생각이 왜 실패하는지 예제로 확인합니다. 그다음 해결책인 **타입 정의 맵을 인자로 받는 값의 타입** `VT D v T`와, 맵을 바꿔 가며 값의 타입을 옮기는 핵심 보조정리 `VT.transport`를 봅니다. 마지막으로 두 수정이 증명의 어디에서 쓰이는지, 그리고 Lean 증명이 슬라이드의 형식 규칙에서 찾아낸 반례를 살펴봅니다.

## Lean으로 옮긴 ATFAE

### 값에는 타입 이름이 없다

타입에는 `enum`으로 정의한 이름 `Ty.name`이, 식에는 타입 정의 `tdef`와 패턴 매칭 `mtch`가 생겼습니다. 함수는 매개변수 목록을 받으므로 화살표 타입도 매개변수 타입의 목록을 가집니다.

```lean
inductive Ty where
  | num
  | bool
  | arrow (ptys : List Ty) (rty : Ty)
  | name (tn : String)
  deriving Repr, Inhabited
```

```lean
  | tdef (tn : String) (varts : List (String × List Ty)) (body : Expr)
  | mtch (e : Expr) (cases : List (String × List String × Expr))
```

값에는 두 가지가 더해집니다. `constr x`는 생성자 `x` 자체이고, `variant x vs`는 생성자 `x`를 인자 값 `vs`에 적용한 배리언트 값(variant value)입니다.

```lean
inductive Value where
  | num (n : Int)
  | bool (b : Bool)
  | clo (params : List String) (body : Expr) (env : List (String × Value))
  | rclo (f : String) (params : List String) (body : Expr) (env : List (String × Value))
  | constr (x : String)
  | variant (x : String) (vs : List Value)
  deriving Inhabited
```

여기서 꼭 짚고 넘어갈 점이 있습니다. **값에는 타입 이름이 없습니다.** `variant`는 생성자 이름만 알고, 자기가 어느 타입의 값인지는 모릅니다. 인터프리터도 `enum`을 만나면 생성자 이름마다 생성자 값을 환경에 넣을 뿐, 타입 이름 `t`는 버립니다.

```lean
    -- `env ++ ws.map(w => w.name -> ConstrV(w.name))`; the type name is unused.
    | .tdef _ ws b => eval n (addAll ρ (ws.map fun w => (w.1, .constr w.1))) b
```

생성자 값을 적용하면 배리언트 값이 되고, `match`는 배리언트 값의 이름과 같은 이름을 가진 **첫 번째** 경우를 `find?`로 고릅니다. 모두 [대수적 데이터 타입](./algebraic-data-types.md)의 인터프리터를 그대로 옮긴 것입니다. 오류도 늘어서 `notVariant`, `arity`, `noCase`가 생겼지만, 허용된 오류는 여전히 `divZero` 하나입니다.

### 타입 환경과 잘 형성된 타입

타입 환경은 [대수적 데이터 타입](./algebraic-data-types.md)에서처럼 두 부분의 쌍입니다. 변수의 타입 `vars`와, 타입 이름에서 배리언트 맵으로 가는 <a id="g-type-definition-map"></a>타입 정의 맵(type-definition map) `tys`입니다. 배리언트 맵은 생성자 이름에서 인자 타입 목록으로 가는 맵입니다.

```lean
/-- Variant map of one type: constructor name -> parameter types. -/
abbrev VMap := List (String × List Ty)

/-- Type definitions `tenv.tys`: type name -> variant map (often called `D`). -/
abbrev TyDefs := List (String × VMap)
```

```lean
/-- Type environment `TypeEnv(vars, tys)`. -/
structure TEnv where
  vars : List (String × Ty)
  tys : TyDefs
```

이 장에서는 타입 정의 맵을 흔히 `D`라고 부르겠습니다. 잘 형성된 타입(well-formed type) \\(\Gamma \vdash \tau\\)는 "\\(\tau\\)에 나오는 타입 이름이 모두 정의되어 있다"입니다. Lean은 이를 "타입 이름 `t`가 `T`에 나온다"는 관계 `Occ t T`로 적습니다.

```lean
/-- `Occ t T`: type name `t` occurs in `T`. -/
inductive Occ : String → Ty → Prop
  | name {t} : Occ t (.name t)
  | param {t p ps r} : p ∈ ps → Occ t p → Occ t (.arrow ps r)
  | ret {t ps r} : Occ t r → Occ t (.arrow ps r)

/-- `t` is a defined type name (`tenv.tys.contains(t)`). -/
def Defined (D : TyDefs) (t : String) : Prop := ∃ tm, lookup D t = some tm

/-- Well-formed type `Γ ⊢ τ` (`mustValid`): every type name in `T` is defined. -/
def Wf (D : TyDefs) (T : Ty) : Prop := ∀ t, Occ t T → Defined D t
```

### τ-TypeDef

타입 규칙의 중심은 두 번 고친 최종판 τ-TypeDef입니다. 규칙과 Lean 생성자를 나란히 놓아 봅시다.

\\[
\begin{prooftree}
\AxiomC{$\begin{array}{c} \Gamma^{\prime} = \Gamma[t = x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}) + \ldots + x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})] \\\\ t \notin \text{Dom}(\Gamma) \qquad \Gamma^{\prime} \vdash \tau_{1,1} \quad \ldots \quad \Gamma^{\prime} \vdash \tau_{n,m_n} \\\\ \Gamma^{\prime}[x_1 : (\tau_{1,1}, \ldots, \tau_{1,m_1}) \to t, \ldots, x_n : (\tau_{n,1}, \ldots, \tau_{n,m_n}) \to t] \vdash e : \tau \\\\ \Gamma \vdash \tau \end{array}$}
\LeftLabel{$\tau\texttt{-TypeDef}$}
\UnaryInfC{$\Gamma \vdash \mathtt{enum}\ t\ \\{\ \mathtt{case}\ x_1(\tau_{1,1}, \ldots, \tau_{1,m_1}); \ldots; \mathtt{case}\ x_n(\tau_{n,1}, \ldots, \tau_{n,m_n})\ \\};\ e : \tau$}
\end{prooftree}
\\]

```lean
  -- τ-TypeDef ("Revised (2)"), with Γ' = Γ[t = ws]
  | tdef {Γ t ws b T} :
      lookup Γ.tys t = none →                                    -- t ∉ dom(Γ)   (freshness)
      (∀ w ∈ ws, ∀ p ∈ w.2, Wf ((t, toMap ws) :: Γ.tys) p) →     -- Γ' ⊢ τᵢⱼ
      HasType ⟨addAll Γ.vars (ctorTys t ws), (t, toMap ws) :: Γ.tys⟩ b T
                                                    -- Γ'[x₁ : (τ₁…) => t, …] ⊢ e : τ
      → Wf Γ.tys T →                                             -- Γ ⊢ τ        (escape check)
      HasType Γ (.tdef t ws b) T
```

전제가 주석과 한 줄씩 대응합니다. 첫 전제가 수정(1)의 <a id="g-freshness"></a>신선성(freshness) 검사 \\(t \notin \text{Dom}(\Gamma)\\)이고, 마지막 전제가 수정(2)의 <a id="g-escape-check"></a>탈출 검사(escape check) \\(\Gamma \vdash \tau\\)입니다. `toMap ws`는 Scala의 `ws.map(...).toMap`처럼 배리언트 목록을 이름을 키로 하는 맵으로 바꿉니다. 생성자에 특별한 적용 규칙은 없습니다. 생성자 `x`는 타입 `(τ₁, …) => t`를 가진 변수로 환경에 들어가고(`ctorTys`), 적용은 일반 τ-App으로 검사됩니다.

τ-Match는 매치할 식의 타입이 `name t`이고 \\(\Gamma(t)\\)가 배리언트 맵 `tm`일 때, 구현의 `mustValidMatch`가 하는 네 검사를 `ValidMatch cs tm`으로 요구합니다.

```lean
/-- `mustValidMatch(t, cs, tmap)` succeeds. -/
structure ValidMatch (cs : List (String × List String × Expr)) (tm : VMap) : Prop where
  /-- no duplicate case -/
  nodup : (cs.map (·.1)).Nodup
  /-- no unknown case -/
  known : ∀ c ∈ cs, ∃ pts, lookup tm c.1 = some pts
  /-- no missing case -/
  cover : ∀ x pts, lookup tm x = some pts → ∃ c ∈ cs, c.1 = x
  /-- case arity matches variant arity -/
  arity : ∀ c ∈ cs, ∀ pts, lookup tm c.1 = some pts → pts.length = c.2.1.length
```

```lean
  -- τ-Match: each case body is checked with its params bound to the variant's types
  | mtch {Γ e t tm cs T} :
      HasType Γ e (.name t) →
      lookup Γ.tys t = some tm →                                 -- Γ(t) = tm
      ValidMatch cs tm →
      (∀ c ∈ cs, HasType (Γ.addVars (c.2.1.zip ((lookup tm c.1).getD []))) c.2.2 T) →
      cs ≠ [] →            -- the implementation's `tys.reduce` fails on an empty list
      HasType Γ (.mtch e cs) T
```

각 경우 `c = (x, ys, b)`의 본문은 매개변수 `ys`를 `tm`에서 **이름** `x`로 찾은 인자 타입에 묶어 검사합니다. 경우를 위치가 아니라 이름으로 찾는다는 점은 이 장 끝의 반례에서 다시 중요해집니다. ATFAE의 `HasType`은 처음부터 Scala의 `typeCheck`를 경우별로 옮겨 적었으므로, 앞의 두 장과 달리 별도의 `typeCheck_iff`는 두지 않습니다.

## 첫 생각: 타입 이름의 정의는 하나다?

### 값의 타입을 정하려면 정의가 필요하다

TFAE와 TRFAE의 `VT v T`는 값과 타입만 보면 됐습니다. ATFAE에서 "`variant x vs`는 `t` 타입이다"라고 말하려면 무엇을 알아야 할까요? `x`가 `t`의 생성자인지, 그리고 `vs`가 `x`의 인자 타입들에 맞는지 알아야 합니다. 둘 다 **`t`의 배리언트 맵**이 있어야 판단할 수 있습니다. 값에는 타입 이름이 없으니 값에서 알아낼 수도 없습니다.

가장 단순한 생각은 프로그램 전체에 "타입 이름 \\(\mapsto\\) 배리언트 맵"이 하나 있다고 놓는 것입니다. 신선성 검사가 같은 이름의 재정의를 막으니, 이름마다 정의가 하나뿐일 것 같지요. 그런데 신선성 검사는 **지금 보이는** 이름만 막습니다. 수정(2)에서 본 것처럼 블록 안에서 정의한 타입 이름은 블록이 끝나면 보이지 않으므로, 같은 이름을 **형제 스코프**에서 다시 정의할 수 있습니다.

### 형제 스코프와 빠져나가는 클로저

여기에 스코프를 빠져나가는 클로저가 겹치면 전역 맵은 성립하지 않습니다. `Examples.lean`의 `siblingProg`를 봅시다.

```atfae,run
/* ATFAE */
val f = {
  enum A { case X(Number) }
  (n: Number) => X(n) match { case X(m) => m + 1 }
};
enum A { case Y(Boolean) };
Y(true) match { case Y(b) => if (b) f(41) else 0 }    // 42
```

- 첫 `A`의 스코프는 `val`의 초기식 블록뿐입니다. 그래서 두 번째 `enum A`는 신선성 검사를 통과합니다.
- `f`의 타입은 `Number => Number`이므로 탈출 검사도 통과합니다. `A`는 `f`의 **타입**에는 나오지 않습니다. 하지만 `f`의 **본문**은 "`A = X(Number)`"를 가정하고 검사되었습니다.
- `f(41)`은 "`A = Y(Boolean)`"인 스코프 안에서 호출됩니다.

이 프로그램은 타입이 맞고, 실행하면 문제없이 `42`가 나옵니다. Lean에서도 둘 다 확인됩니다.

```lean
theorem siblingProg_typed : HasType ⟨[], []⟩ siblingProg .num := by
  ...
theorem siblingProg_eval : eval 20 [] siblingProg = some (.ok (.num 42)) := rfl
```

그런데 `f`의 본문을 실행하는 동안 만들어지는 `X(41)`은 첫 `A`의 값이고, 바깥의 `Y(true)`는 두 번째 `A`의 값입니다. 이름 `A` 하나에 정의 하나를 대응시키는 전역 맵으로는 두 값의 타입을 동시에 설명할 수 없습니다. 안전한 프로그램인데 증명에 쓸 불변식이 성립하지 않는 것입니다.

> **생각해 보기**: 그렇다면 이 프로그램을 거부하도록 타입 규칙을 더 엄격하게 바꾸면 되지 않을까요? 그럴 수도 있지만, 그러면 증명하려는 규칙이 강의와 구현의 규칙과 달라집니다. 이 책의 Lean 프로젝트는 규칙을 바꾸지 않고, 증명에 쓰는 **값의 타입**을 더 정교하게 정의하는 길을 택합니다.

## 해결: 지금 위치의 정의 맵을 보는 값의 타입

### `VT D v T`

해결책은 값의 타입이 **지금 위치의 타입 정의 맵** `D`를 인자로 받게 하는 것입니다. 앞 장들의 `VT v T`가 `VT D v T`가 됩니다. 생성자 값과 배리언트 값은 `D`를 보고 판정합니다.

```lean
  /-- Constructor `x` of type `t` with parameter types `pts`. -/
  | constr {D t tm x pts} :
      lookup D t = some tm → lookup tm x = some pts →
      VT D (.constr x) (.arrow pts (.name t))
  /-- Variant `x vs : t` whose arguments have the variant's parameter types. -/
  | variant {D t tm x pts vs} :
      lookup D t = some tm → lookup tm x = some pts →
      vs.length = pts.length → (∀ v p, (v, p) ∈ vs.zip pts → VT D v p) →
      VT D (.variant x vs) (.name t)
```

`variant x vs`가 `D`에서 `t` 타입이려면, `D`에서 `t`의 배리언트 맵이 `tm`이고, `tm`에서 `x`의 인자 타입이 `pts`이며, `vs`가 하나씩 `pts`의 타입을 가져야 합니다. `siblingProg`에서 `X(41)`은 첫 `A`의 맵에서, `Y(true)`는 두 번째 `A`의 맵에서 `A` 타입입니다. 같은 이름이 다른 뜻이어도 서로 다른 `D`에서 판정하니 충돌이 없습니다.

### 클로저는 자기 세계를 들고 다닌다

어려운 것은 클로저입니다. 클로저의 본문은 클로저가 **만들어진 곳**의 타입 환경 \\(\Gamma\\) 아래에서 검사되었습니다. `siblingProg`의 `f`라면 "`A = X(Number)`"인 환경이지요. 그런데 `f`는 그 스코프를 빠져나가 "`A = Y(Boolean)`"인 곳에서 쓰입니다. 그래서 `VT.clo`는 만들어진 곳의 \\(\Gamma\\)를 전제 안에 들고 다닙니다.

```lean
  | clo {D} {Γ : TEnv} {ρ : Env} {S : String → Prop} {ps pts b R} :
      WfEnv Γ →
      (∀ y U, lookup Γ.vars y = some U → (lookup ρ y).isSome) →
      (∀ y U v, lookup Γ.vars y = some U → lookup ρ y = some v → VT Γ.tys v U) →
      ps.length = pts.length →
      Wf Γ.tys (.arrow pts R) →
      HasType (Γ.addVars (ps.zip pts)) b R →
      (∀ t, Occ t (.arrow pts R) → S t) → Closed D S → AgreeOn D Γ.tys S →
      VT D (.clo ps b ρ) (.arrow pts R)
```

전제를 세 묶음으로 나누어 읽으면 다음과 같습니다.

1. **`WfEnv Γ`**: \\(\Gamma\\)는 타입 검사기가 만드는 올바른 환경입니다(아래에서 설명합니다).
2. **둘째부터 여섯째까지**: 앞 장들의 `VT.clo`와 같은 조건입니다. 클로저 환경 `ρ`가 `Γ.vars`를 구현하고, 매개변수 개수가 맞고, 함수 타입이 잘 형성되었고, 본문이 `R` 타입입니다. 단, `ρ`의 값들은 지금 위치의 `D`가 아니라 **클로저 자신의 맵 `Γ.tys`** 에서 타입이 맞습니다.
3. **마지막 세 전제**: 클로저의 맵 `Γ.tys`와 지금 위치의 맵 `D`를 잇는 다리입니다. 이름의 집합 `S`가 있어서, `S`는 클로저 타입에 나오는 이름을 모두 담고, `D`에서 닫혀 있으며, `D`와 `Γ.tys`는 `S` 위에서 같습니다. `S`는 전제에만 나오는 암묵적 인자이므로 "이런 `S`가 **있다**"는 뜻입니다.

핵심은 셋째 묶음입니다. `Γ.tys`는 `D`와 **달라도 됩니다.** 다만 클로저의 타입에서 닿을 수 있는 이름들 위에서만은 같아야 합니다. `siblingProg`의 `f`는 타입이 `Number => Number`라서 타입 이름이 하나도 없으므로, `S`를 빈 집합으로 잡을 수 있습니다. 그러면 두 맵이 `A`에서 달라도 아무 문제가 없습니다.

> **자주 하는 실수**: 둘째 묶음을 보고 "`ρ`가 `Γ.vars`를 구현한다"를 `EnvT` 한 줄로 쓰고 싶어집니다. 하지만 `EnvT`의 정의에는 `∃ v, ... ∧ VT D v U`가 들어 있고, Lean은 귀납 정의 중인 `VT`가 이런 자리에 들어가는 것을 받아 주지 않습니다. 그래서 앞 장들처럼 "값이 있다"와 "있으면 타입이 맞다"로 쪼개 씁니다.

### 닫힌 이름 집합

`S`에 대한 두 조건을 봅시다. Lean에서 집합은 술어 `String → Prop`으로 나타냅니다.

```lean
/-- `S` is closed under the variant parameter types of `D`. Sets are predicates. -/
def Closed (D : TyDefs) (S : String → Prop) : Prop :=
  ∀ t, S t → ∀ tm, lookup D t = some tm → ∀ x pts, lookup tm x = some pts →
    ∀ p ∈ pts, ∀ t', Occ t' p → S t'

/-- Two type-definition maps agree on the names in `S`. -/
def AgreeOn (D1 D2 : TyDefs) (S : String → Prop) : Prop :=
  ∀ t, S t → lookup D1 t = lookup D2 t
```

`AgreeOn D1 D2 S`는 말 그대로 `S`의 이름마다 두 맵이 같은 정의를 준다는 것입니다. `Closed D S`는 "`S`의 이름에서 출발해 배리언트의 인자 타입을 따라가도 `S` 밖으로 나가지 않는다"입니다.

왜 닫혀 있어야 할까요? 클로저의 타입이 `Tree => Number`이고 `Tree`의 배리언트가 `Node(Forest)`라고 해 봅시다. 인자로 들어온 `Node(fs)`를 클로저 쪽 맵에서 `Tree` 타입이라고 말하려면, 그 안의 값 `fs`도 클로저 쪽 맵에서 `Forest` 타입이어야 합니다. 그러려면 `Tree`뿐 아니라 `Forest`의 정의도 두 맵에서 같아야 합니다. 클로저 타입에 직접 나오지 않는 `Forest`까지 `S`에 넣으라는 것이 닫힘 조건입니다.

### `WfEnv`와 클로저를 만드는 순간

`WfEnv`는 타입 검사기가 만드는 정적 환경이 늘 만족하는 불변식(invariant)입니다.

```lean
structure WfEnv (Γ : TEnv) : Prop where
  vars : ∀ x T, lookup Γ.vars x = some T → Wf Γ.tys T
  tys : Closed Γ.tys (Defined Γ.tys)
```

`vars`는 변수의 타입이 모두 잘 형성되었다는 것이고, `tys`는 "정의된 이름 전체"의 집합이 닫혀 있다는 것, 곧 배리언트의 인자 타입에는 정의된 이름만 나온다는 것입니다. 후자는 τ-TypeDef의 전제 \\(\Gamma^{\prime} \vdash \tau_{i,j}\\) 덕분에 성립합니다.

이 불변식 덕분에 클로저를 **만드는 순간**에는 `S`를 정의된 이름 전체 `Defined Γ.tys`로 잡을 수 있습니다. 이때는 지금 위치의 맵이 바로 `Γ.tys`이므로 `AgreeOn`은 당연히 성립합니다(`fun _ _ => rfl`). 증명의 τ-Fun 경우가 정확히 이렇게 합니다.

```lean
      refine Sound.ret (VT.clo (Γ := Γ) (S := Defined Γ.tys) hw (envT_split hρ).1
        (envT_split hρ).2 (by simp) hA ?_ hA hw.tys (fun _ _ => rfl))
```

여기서 `hA`는 함수 타입이 잘 형성되었다는 사실로, "타입이 맞는 식의 타입은 잘 형성되었다"는 <a id="g-regularity"></a>정칙성(regularity) 보조정리 `HasType.wf`에서 얻습니다. 재귀 클로저 `VT.rclo`도 같은 모양이고, 본문의 타입 환경에 함수 자신 `f`가 하나 더 있을 뿐입니다.

## 핵심 보조정리: 맵을 바꿔 값의 타입 옮기기

이제 이 장의 중심인 보조정리입니다.

```lean
theorem VT.transport {D1 v T} (h : VT D1 v T) :
    ∀ {D2 S}, (∀ t, Occ t T → S t) → Closed D1 S → AgreeOn D1 D2 S → VT D2 v T := by
```

`T`의 이름을 모두 담은 집합 `S`가 `D1`에서 닫혀 있고 `D1`과 `D2`가 `S` 위에서 같으면, `D1`에서 매긴 값의 타입을 `D2`로 옮길 수 있습니다. 증명은 `VT` 유도에 대한 귀납법입니다.

- **`constr`, `variant`**: `t`는 `T`에 나오므로 `S`에 있고, 따라서 `D2`에서 `t`의 정의는 `D1`에서와 같습니다. 배리언트 안의 값들은 그 타입의 이름이 닫힘 조건으로 다시 `S` 안에 있으므로 귀납 가정으로 옮깁니다.
- **`clo`, `rclo`**: 클로저 **안쪽**(\\(\Gamma\\), `ρ`, 본문의 타입 유도)은 하나도 건드리지 않습니다. 바뀌는 것은 지금 위치의 맵과 `Γ.tys`를 잇는 마지막 세 전제뿐입니다. 새 집합으로 `S`와 원래 클로저의 집합 `S0`의 교집합을 쓰면, `D2`와 `Γ.tys`는 그 위에서 `D1`을 거쳐 같습니다.

클로저 경우를 실제 코드로 보면 다음과 같습니다.

```lean
  | @clo D Γ ρ S0 ps pts b R hw hρ1 hρ2 hlen hwf hb hS0 hc0 ha0 _ =>
    -- New name set: `S ∩ S0`.
    intro D2 S hS hc ha
    refine .clo (S := fun t => S t ∧ S0 t) hw hρ1 hρ2 hlen hwf hb
      (fun t ho => ⟨hS t ho, hS0 t ho⟩) ?_ ?_
    · intro t hs tm hl x pts' hx p hp t' ho
      rw [← ha t hs.1] at hl
      exact ⟨hc t hs.1 tm hl x pts' hx p hp t' ho, hc0 t hs.2 tm hl x pts' hx p hp t' ho⟩
    · intro t hs
      rw [← ha t hs.1]; exact ha0 t hs.2
```

`refine .clo ...`에 원래 전제 `hw hρ1 hρ2 hlen hwf hb`를 **그대로** 넘기고, 남은 두 목표(닫힘과 일치)만 새로 증명한다는 점을 보세요. 클로저 경우에서는 귀납 가정이 필요 없습니다. 클로저 안의 값들은 언제나 클로저 자신의 맵 `Γ.tys`를 기준으로 판정되므로, 바깥 맵이 바뀌어도 영향을 받지 않기 때문입니다. 이것이 클로저가 자기 세계를 들고 다니게 한 이유입니다.

## 증명의 큰 그림

일반화된 정리 `sound`는 앞 장들과 같은 모양입니다. 타입 환경에 `WfEnv Γ`를 가정하고, 값의 타입은 `Γ.tys` 아래에서 말한다는 점만 다릅니다.

```lean
theorem sound (n : Nat) {Γ : TEnv} {ρ : Env} {e : Expr} {T : Ty}
    (hw : WfEnv Γ) (hρ : EnvT Γ.tys ρ Γ.vars) (ht : HasType Γ e T) :
    Sound (eval n ρ e) (fun v => VT Γ.tys v T) := by
```

연료에 대한 귀납법이고, 각 타입 규칙마다 경우를 나눕니다. 경우가 길어서 새 경우들은 보조정리로 따로 뺐습니다. 이 보조정리들이 귀납 가정을 인자로 받을 수 있도록, 귀납 가정의 모양에 `SoundUpTo n`이라는 이름을 붙였습니다.

```lean
def SoundUpTo (n : Nat) : Prop :=
  ∀ {Γ : TEnv} {ρ : Env} {e : Expr} {T : Ty},
    WfEnv Γ → EnvT Γ.tys ρ Γ.vars → HasType Γ e T →
    Sound (eval n ρ e) (fun v => VT Γ.tys v T)
```

산술, τ-Val, τ-Id, τ-If 경우는 앞 장과 같습니다. 새로운 경우는 함수 적용, 생성자 적용, 타입 정의, 패턴 매칭 네 가지입니다.

### 함수 적용: 두 세계를 오가기

τ-App에서 함수 값이 클로저이면, 증명은 호출 지점의 세계와 클로저의 세계를 오갑니다(`sound_app_clo`).

1. 인자 값들은 호출 지점의 맵 `D`에서 타입이 맞습니다. 매개변수 타입의 이름은 함수 타입의 이름이므로 `S` 안에 있고, `VT.transport`로 클로저의 맵 `Γc.tys`로 옮깁니다(`VTList.transport_args`).
2. 이제 본문의 환경이 `Γc`에 매개변수를 더한 환경을 구현하므로, 클로저의 세계에서 귀납 가정을 씁니다.
3. 결과 값은 `Γc.tys`에서 반환 타입 `R`을 가집니다. 반환 타입의 이름도 `S` 안에 있으므로 다시 `D`로 되돌립니다(`VT.transport_ret`).

```lean
  cases hv with
  | @clo _ Γc _ S _ _ _ _ hwc hρ1 hρ2 hplen hwf hb hS hc ha =>
    rw [if_pos (hplen.trans hlen)]
    refine hargs.bind fun vs hvs => ?_
    have henv : EnvT Γc.tys (addAll fenv (ps.zip vs)) (addAll Γc.vars (ps.zip pts)) :=
      envT_addAll_zip ps vs pts _ _ (hvs.transport_args hS hc ha) (envT_of_split hρ1 hρ2)
    have hwc' : WfEnv (Γc.addVars (ps.zip pts)) :=
      wfEnv_addVars hwc (fun p hp => (wf_arrow hwf).1 _ (List.of_mem_zip hp).2)
    exact (ih hwc' henv hb).mono fun v hv => hv.transport_ret hS hc ha
```

`siblingProg`의 `f(41)`로 그림을 그리면 다음과 같습니다. 인자 `41 : Number`를 옮겨 들어가고, 본문을 첫 `A`의 세계에서 실행하고, 결과 `42 : Number`를 두 번째 `A`의 세계로 되돌립니다. 본문 안에서 만든 `X(41)`은 클로저 세계 안에서만 쓰이고 밖으로 나오지 않습니다.

<div style="text-align:center">
<svg viewBox="0 0 640 250" width="100%" style="max-width: 640px" role="img" aria-label="f(41) 호출: 호출 지점의 세계(A = Y(Boolean))에서 인자 41을 클로저의 세계(A = X(Number))로 옮기고, 본문을 실행한 결과 42를 다시 호출 지점의 세계로 되돌린다. 두 맵은 빈 집합 S 위에서 같다" font-family="sans-serif" fill="currentColor">
<defs><marker id="lean-scopes-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="130" y="30" text-anchor="middle" font-size="15" font-weight="bold">호출 지점의 세계</text>
<rect x="20" y="45" width="220" height="140" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="130" y="75" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">D</text>
<text x="130" y="100" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">A = Y(Boolean)</text>
<text x="130" y="150" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">f(41)</text>
<text x="510" y="30" text-anchor="middle" font-size="15" font-weight="bold">f의 클로저 세계</text>
<rect x="400" y="45" width="220" height="140" rx="4" fill="#2a408e" stroke="none"/>
<text x="510" y="75" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace" fill="#ffffff">Γc.tys</text>
<text x="510" y="100" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace" fill="#ffffff">A = X(Number)</text>
<text x="510" y="140" text-anchor="middle" font-size="13" fill="#ffffff">본문 실행(귀납 가정)</text>
<text x="510" y="162" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace" fill="#ffffff">X(41) match …</text>
<line x1="244" y1="95" x2="394" y2="95" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-scopes-1)"/>
<text x="320" y="70" text-anchor="middle" font-size="13">인자 옮기기</text>
<text x="320" y="86" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">41 : Number</text>
<line x1="396" y1="150" x2="246" y2="150" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-scopes-1)"/>
<text x="320" y="170" text-anchor="middle" font-size="13">결과 되돌리기</text>
<text x="320" y="141" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">42 : Number</text>
<text x="320" y="220" text-anchor="middle" font-size="13">f의 타입 Number =&gt; Number에는 타입 이름이 없으므로 S = ∅</text>
<text x="320" y="240" text-anchor="middle" font-size="13">두 맵은 S 위에서만 같으면 된다</text>
</svg>
</div>

재귀 클로저의 경우(`sound_app_rclo`)도 같습니다. 다만 본문 환경에 넣을 자기 자신의 타입을 클로저의 세계에서 `VT.rclo`로 다시 만들어 넣습니다. [허용된 오류와 재귀](./lean-errors.md)의 `envT_rec`가 하던 일입니다.

### 생성자 적용

함수 값이 생성자 `constr x`이면(`sound_app_constr`) 맵을 바꿀 일이 없습니다. `VT.constr`의 전제 "`D`에서 `t`의 `x`는 `pts`를 받는다"와 인자 값들의 타입으로 바로 `VT.variant`를 만듭니다.

```lean
  cases hv with
  | constr hl hx => exact hargs.bind fun vs ⟨hl', hvs⟩ => Sound.ret (VT.variant hl hx hl' hvs)
```

생성자는 일급 값이므로 다른 함수를 거쳐 적용될 수도 있습니다. `Examples.lean`의 `ctorProg`가 그런 예입니다.

```atfae,run
/* ATFAE */
enum Box { case B(Number) };
val app = (g: Number => Box, n: Number) => g(n);
app(B, 41) match { case B(m) => m + 1 }          // 42
```

`B`는 `VT.constr`로 `Number => Box` 타입을 얻고, 클로저 `app`의 본문 안에서 `g(n)`으로 적용됩니다. 이번에는 `app`의 타입 `(Number => Box, Number) => Box`에 `Box`가 나오므로 `S`에 `Box`가 들어갑니다. 호출 지점과 클로저의 `Box` 정의가 같다는 사실이 인자 `B`를 옮겨 들어가고 결과 `B(41)`을 되돌려 나올 때 쓰입니다.

### 타입 정의: 두 수정이 쓰이는 곳

τ-TypeDef 경우(`sound_tdef`)는 신선성과 탈출 검사가 실제로 쓰이는 곳입니다. 본문은 맵 `(t, toMap ws) :: Γ.tys`에서 검사되었습니다. 이 맵을 `D'`라고 부르면, 본문에 귀납 가정을 쓰려면 두 가지가 필요합니다.

- 본문의 값 환경이 `D'`의 세계에서 맞아야 합니다. 바깥 변수의 값들은 `Γ.tys`에서 타입이 매겨져 있으니 `D'`로 **옮겨 들어가야** 합니다.
- 본문의 결과는 `D'`에서 타입이 매겨지므로 `Γ.tys`로 **되돌려 나와야** 합니다.

**신선성.** 옮겨 들어가는 데 필요한 것은 다음 보조정리가 전부입니다.

```lean
/-- Freshness: if `t ∉ dom(D)`, then `D` and `(t, tm) :: D` agree on the names defined in `D`. -/
theorem agree_cons_fresh {D t tm} (h : lookup D t = none) :
    AgreeOn D ((t, tm) :: D) (Defined D) := by
  intro t' ⟨tm', h'⟩
  have : t ≠ t' := by intro e; subst e; rw [h] at h'; cases h'
  simp [lookup, this]
```

\\(t \notin \text{Dom}(D)\\)이면 `D`와 `D'`는 **옛 이름 전체** 위에서 같습니다. 바깥 변수의 타입에는 옛 이름만 나오고(`WfEnv.vars`), 옛 이름 전체는 닫혀 있으므로(`WfEnv.tys`), `VT.transport`로 바깥 값들을 `D'`로 옮길 수 있습니다. 보조정리 `tdef_envT`가 이 일을 하고, 새로 생긴 생성자 변수들은 `VT.constr`로 바로 타입이 맞습니다.

신선성 검사가 없으면 어떻게 될까요? `Examples.lean`의 `redefProg`를 봅시다.

```atfae,run
/* ATFAE */
enum A { case X(Number) };
val x = X(1);
enum A { case Y(Boolean) };
x match { case Y(b) => b }        // noCase 오류
```

신선성 검사를 빼면 `x : A`이고 매치 시점의 `A`는 `Y(Boolean)`이므로 이 프로그램은 `Boolean` 타입으로 검사됩니다. 그러나 `x`의 값은 `X(1)`입니다. 증명의 말로 하면, 바깥 값 `X(1) : A`를 새 맵으로 옮길 수 없습니다. 두 맵이 바로 그 이름 `A`에서 다르기 때문입니다. Lean 프로젝트는 이 프로그램이 실제로 `noCase` 오류를 내고, 신선성 검사가 있는 규칙은 이를 거부한다는 것을 둘 다 정리로 남겨 두었습니다.

```lean
theorem redefProg_goes_wrong : eval 20 [] redefProg = some (.error .noCase) := rfl

/-- The implementation rejects it ("already defined type: A"). -/
theorem redefProg_rejected (T : Ty) : ¬ HasType ⟨[], []⟩ redefProg T := by
```

**탈출 검사.** 본문의 결과 `v`는 `D'`에서 `T` 타입입니다. 이를 `Γ.tys`로 되돌릴 때 `S`로 다시 옛 이름 전체 `Defined Γ.tys`를 씁니다. `VT.transport`의 첫 조건 "`T`의 이름이 모두 `S` 안에 있다"가 바로 탈출 검사 `Wf Γ.tys T`이고, 두 맵이 그 위에서 같다는 것은 신선성에서 나옵니다.

```lean
theorem sound_tdef {n Γ ρ t ws b T} (ih : SoundUpTo n) (hw : WfEnv Γ)
    (hρ : EnvT Γ.tys ρ Γ.vars)
    (hfresh : lookup Γ.tys t = none)
    (hws : ∀ w ∈ ws, ∀ p ∈ w.2, Wf ((t, toMap ws) :: Γ.tys) p)
    (hb : HasType ⟨addAll Γ.vars (ctorTys t ws), (t, toMap ws) :: Γ.tys⟩ b T)
    (hescape : Wf Γ.tys T) :
    Sound (eval n (addAll ρ (ws.map fun w => (w.1, .constr w.1))) b) (fun v => VT Γ.tys v T) :=
  (ih (tdef_wfEnv hw hws) (tdef_envT hw hρ hfresh) hb).mono fun _ hv =>
    hv.transport (S := Defined Γ.tys) hescape
      (closed_of_agree hw.tys (agree_cons_fresh hfresh))
      (agree_symm (agree_cons_fresh hfresh))
```

증명은 식 하나입니다. 본문에 귀납 가정을 쓰고(`tdef_wfEnv`, `tdef_envT`로 전제를 채움), `Sound.mono`로 결과의 성질을 바꾸는데, 그 바꾸는 방법이 `hescape`와 `agree_cons_fresh`를 넘긴 `VT.transport`입니다. `closed_of_agree`와 `agree_symm`은 닫힘과 일치를 반대 방향 맵에 대해 쓰기 위한 작은 사실입니다.

탈출 검사가 없으면 어떻게 될까요? `escapeProg`를 봅시다.

```atfae,run
/* ATFAE */
val x = { enum A { case X(Number) }; X(1) };
enum A { case Y(Boolean) };
x match { case Y(b) => if (b) 1 else 0 }     // noCase 오류
```

초기식 블록의 타입 `A`가 스코프 밖으로 새어 나가고, 두 번째 `enum A`는(첫 `A`가 이미 스코프를 벗어났으므로) 신선성 검사를 통과합니다. 그러면 바깥의 `x : A`가 엉뚱한 `A`로 읽힙니다. 증명의 말로 하면, 결과 `X(1) : A`를 바깥 맵으로 되돌릴 수 없습니다. 바깥 맵에는 `A`가 아예 없기 때문입니다. `escapeProg_goes_wrong`과 `escapeProg_rejected`가 이를 확인합니다.

두 검사는 서로를 보완합니다. 신선성은 **안쪽**에서 바깥 이름을 가리지 못하게 해서 값을 옮겨 들어갈 수 있게 하고, 탈출 검사는 **바깥**으로 안쪽 이름이 새지 못하게 해서 결과를 되돌려 나올 수 있게 합니다. [대수적 데이터 타입](./algebraic-data-types.md)에서 반례를 보고 하나씩 더한 두 수정이, 증명에서는 `VT.transport`의 들어가는 방향과 나오는 방향에 정확히 하나씩 대응하는 셈입니다.

### 패턴 매칭

τ-Match 경우에서 매치할 값은 귀납 가정으로 `VT Γ.tys v (.name t)`입니다. `name t` 타입의 값은 `VT.variant`로만 만들어지므로 `v = variant x vs`이고, `Γ.tys`에서 `t`의 맵이 `tm`, `tm`에서 `x`의 인자 타입이 `pts`입니다. 값을 만든 정의와 지금 보이는 \\(\Gamma(t)\\)가 같은 `tm`이라는 점이 핵심인데, 이는 `VT`가 **지금 위치의** 맵으로 판정되기 때문에 공짜로 나옵니다. 전역 맵을 포기한 보람이 여기서 드러납니다.

그다음은 `ValidMatch`가 일을 합니다.

```lean
theorem ValidMatch.find_some {cs : List (String × List String × Expr)} {tm x pts}
    (hvm : ValidMatch cs tm) (hx : lookup tm x = some pts) :
    ∃ ps b, cs.find? (fun c => c.1 == x) = some (x, ps, b) ∧ (x, ps, b) ∈ cs ∧
      pts.length = ps.length := by
```

빠진 경우가 없으므로(`cover`) `find?`는 반드시 경우를 찾아 `noCase` 오류가 나지 않고, 인자 개수가 맞으므로(`arity`) `arity` 오류도 나지 않습니다. 찾은 경우의 본문은 매개변수를 `tm`에서 `x`의 인자 타입에 묶어 검사되었으므로, 환경을 넓혀 귀납 가정을 쓰면 끝입니다.

## 슬라이드 규칙의 반례

Lean으로 증명하는 과정에서 규칙의 숨은 구멍이 하나 더 드러났습니다. 슬라이드와 강의 명세의 **형식** 규칙은 한 `enum` 안에 같은 이름의 배리언트가 둘 있으면 타입 안전하지 않습니다.

형식 규칙의 τ-Match는 \\(i\\)번째 경우를 \\(\Gamma(t)\\)의 \\(i\\)번째 배리언트와 **위치로** 맞춥니다. 그리고 τ-TypeDef는 배리언트 이름이 서로 달라야 한다고 요구하지 않습니다. 그런데 실행 중의 `match`는 이름이 맞는 **첫** 경우를 고릅니다. 이 셋이 겹치면 다음 프로그램이 생깁니다. (이 책 2부의 τ-Match는 처음부터 경우를 이름으로 찾으라고 설명했습니다. 이 절은 그 설명이 왜 중요한지를 보여 주는 셈입니다.)

```atfae,run
/* ATFAE */
enum A { case X(Number); case X(Boolean) }
X(true) match { case X(n) => n + 1; case X(b) => if (b) 1 else 0 }
```

형식 규칙에서는 생성자 환경에서 나중의 `X : (Boolean) => A`가 보이므로 `X(true)`는 `A` 타입입니다. 그리고 첫 경우는 첫 배리언트에 맞춰 `n : Number`로, 둘째 경우는 둘째 배리언트에 맞춰 `b : Boolean`으로 검사되어, 전체가 `Number` 타입을 받습니다. 하지만 실행하면 `X(true)`가 이름이 맞는 첫 경우에 걸려 `true + 1`에서 타입 오류가 납니다.

`Counterexample.lean`은 형식 규칙을 그대로 옮긴 관계 `HasTypeS`를 정의합니다. `HasType`과 다른 곳은 τ-TypeDef가 배리언트 목록을 그대로 두고, τ-Match가 위치로 맞춘다는 두 군데뿐입니다.

```lean
  -- τ-Match: i-th case against i-th variant
  | mtch {Γ e t ws cs T} :
      HasTypeS Γ e (.name t) →
      lookup Γ.tys t = some ws →                    -- Γ(t) = x₁(τ₁…) + … + xₙ(τₙ…)
      cs.length = ws.length →
      (∀ c w, (c, w) ∈ cs.zip ws → c.1 = w.1 ∧ c.2.1.length = w.2.length) →
      (∀ c w, (c, w) ∈ cs.zip ws → HasTypeS (Γ.addVars (c.2.1.zip w.2)) c.2.2 T) →  -- Γᵢ ⊢ eᵢ : τ
      HasTypeS Γ (.mtch e cs) T
```

그리고 위 프로그램 `dupProg`가 이 규칙으로 `Number` 타입을 받지만 실행하면 `notNum` 오류를 낸다는 것을 정리로 보입니다.

```lean
/-- The slide/spec rules are unsound (contrast with `type_soundness`). -/
theorem slide_rules_unsound :
    ∃ (e : Expr) (T : Ty), HasTypeS ⟨[], []⟩ e T ∧
      ∃ (n : Nat) (err : Err), eval n [] e = some (.error err) ∧ err ≠ .divZero :=
  ⟨dupProg, .num, dupProg_slide_typed, 10, .notNum, dupProg_goes_wrong, by decide⟩
```

고친 규칙은 구현을 따른 `HasType`입니다. 배리언트 목록을 이름을 키로 하는 맵으로 바꾸고(`toMap`, 같은 이름이면 마지막 것이 이깁니다), τ-Match는 경우의 인자 타입을 **이름으로** 찾으며, `ValidMatch.nodup`으로 같은 이름의 경우가 두 번 나오는 것을 막습니다. `dupProg`의 두 경우는 모두 이름이 `X`이므로 바로 이 검사에 걸립니다.

```lean
/-- The implementation's rules reject it (`ValidMatch.nodup`). -/
theorem impl_rejects (T : Ty) : ¬ HasType ⟨[], []⟩ dupProg T := by
  intro h
  cases h with
  | tdef _ _ hb _ =>
    cases hb with
    | mtch _ _ hvm _ _ =>
      have := hvm.nodup
      simp at this
```

[대수적 데이터 타입](./algebraic-data-types.md)에서는 "한 `enum` 안의 배리언트 이름은 모두 달라야 한다"고 했고, 실제로 수업에서 쓰는 파서가 중복된 배리언트 이름을 거부합니다. 그래서 이 반례는 학생이 쓰는 언어에는 나타나지 않습니다. 하지만 형식 규칙만 놓고 보면 그 조건은 규칙 어디에도 적혀 있지 않았습니다. 손으로 쓴 증명이라면 "배리언트 이름은 당연히 다르다"고 넘어가기 쉬운 곳입니다. 반면 Lean 증명은 그 가정을 어딘가에 적어 두지 않으면 진행되지 않으므로, 숨은 가정이 드러났습니다. 덧붙여 `HasType`에 대한 `type_soundness`는 파서의 중복 검사를 **가정하지 않습니다**. 중복된 배리언트 이름이 있어도 구현의 규칙은 안전합니다.

> **생각해 보기**: 형식 규칙을 고치는 방법이 구현을 따르는 것 하나만 있는 것은 아닙니다. τ-TypeDef에 "배리언트 이름이 서로 다르다"는 전제를 더해도 반례는 사라집니다. 두 방법은 받아들이는 프로그램이 어떻게 다를까요?

## 정리

- ATFAE의 값에는 타입 이름이 없고, 같은 타입 이름이 형제 스코프에서 다르게 정의될 수 있습니다. 여기에 스코프를 빠져나가는 클로저가 겹치면(`siblingProg`) "타입 이름마다 정의가 하나"라는 전역 맵은 성립하지 않습니다.
- 그래서 값의 타입은 지금 위치의 타입 정의 맵을 인자로 받는 `VT D v T`입니다. 생성자 값과 배리언트 값은 `D`를 보고 판정합니다.
- 클로저는 만들어진 곳의 타입 환경 \\(\Gamma\\)를 들고 다니고, 그 안의 값들은 클로저 자신의 맵 `Γ.tys`로 판정됩니다. 지금 위치의 맵 `D`와는 클로저 타입에서 닿는 이름들의 닫힌 집합 `S` 위에서만 같으면 됩니다.
- 핵심 보조정리 `VT.transport`는 `S` 위에서 같은 두 맵 사이에서 값의 타입을 옮깁니다. 클로저 경우는 안쪽을 건드리지 않고 마지막 세 전제만 고칩니다.
- 함수 적용은 인자를 클로저의 세계로 옮기고, 본문을 그 세계에서 실행하고, 결과를 호출 지점의 세계로 되돌립니다.
- 신선성은 바깥 값을 본문의 세계로 옮겨 들어가게 하고(`agree_cons_fresh`), 탈출 검사는 본문의 결과를 바깥 세계로 되돌려 나오게 합니다. 둘 중 하나라도 없으면 `redefProg`, `escapeProg`처럼 타입이 맞는데 `noCase` 오류가 나는 프로그램이 생깁니다.
- 슬라이드의 형식 규칙은 같은 이름의 배리언트가 있으면 안전하지 않습니다(`slide_rules_unsound`). 구현처럼 경우를 이름으로 찾고 중복 경우를 거부하는 규칙은 이를 막고, 그 규칙에 대해 타입 안전성이 증명됩니다.

## 연습 문제

1. `HasType.tdef`에서 신선성 전제 `lookup Γ.tys t = none`을 지우고 `lake build`를 해 보세요. 증명의 어느 곳이 깨지나요? 고친 규칙으로 `redefProg`가 `Boolean` 타입을 받는다는 것을 Lean으로 보여 보세요.
2. 이번에는 탈출 검사 전제 `Wf Γ.tys T`를 지워 보세요. `HasType.wf`와 `sound_tdef` 중 어디가 먼저 깨지나요? 각각 왜 그 전제가 필요했는지 설명하세요.
3. `VT.clo`의 마지막 세 전제를 "`D`와 `Γ.tys`가 모든 이름에서 같다"(`AgreeOn D Γ.tys (fun _ => True)`)로 바꾸면 증명의 어디가 막히나요? `siblingProg`를 예로 설명하세요.
4. 다음 보조정리를 증명해 보세요. τ-Match 경우에서 `cases hv`가 해 준 일을 독립된 정리로 꺼낸 것입니다.
   ```lean
   theorem VT.name_inv {D v t} (h : VT D v (.name t)) :
       ∃ tm x pts vs, v = .variant x vs ∧ lookup D t = some tm ∧ lookup tm x = some pts := by
     sorry
   ```
5. `VT.transport`에서 닫힘 조건 `Closed D1 S`를 빼면 어느 경우의 증명이 막히나요? 막히는 상황을 보여 주는 두 맵 `D1`, `D2`와 값의 예를 만들어 보세요. (힌트: 본문에서 든 `Tree`와 `Forest`.)
6. 이 장 끝의 "생각해 보기"처럼, 형식 규칙의 τ-TypeDef에 배리언트 이름이 서로 다르다는 전제를 더한 관계를 `Counterexample.lean`의 `HasTypeS`를 고쳐 정의해 보세요. 이 관계로 `dupProg`가 거부된다는 것을 증명할 수 있나요? 이 관계에 대한 타입 안전성을 증명하려면 이 장의 증명에서 무엇을 바꿔야 할지 생각해 보세요.
