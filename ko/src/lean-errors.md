# 허용된 오류와 재귀

[연료와 결과 분류](./lean-fuel.md)에서는 TFAE의 타입 안전성을 Lean으로 증명했습니다. 연관 리스트 환경, 연료를 받는 `eval`, 귀납 관계로 쓴 타입 규칙, 값의 타입 `VT`와 환경의 타입 `EnvT`, 결과 분류 `Sound`와 `Sound.bind`, 그리고 연료에 대한 귀납법이 그 장에서 만든 틀이었습니다. 이 장의 언어는 [재귀 함수의 타입](./typing-recursive-functions.md)에서 만든 TRFAE입니다. TFAE에 불리언, 비교, 조건식, 재귀 함수가 더해졌고, 이 책의 Lean 프로젝트는 강의 명세를 따라 나눗셈 `/`과 나머지 `%`, 같음 비교 `==`도 넣었습니다.

언어가 조금 커졌을 뿐인데, 앞 장의 증명을 그대로 옮기려 하면 두 군데에서 막힙니다.

1. **정리 자체가 거짓이 됩니다.** `1 / 0`은 타입이 맞지만 실행하면 오류가 납니다. 앞 장의 정리는 "타입이 맞는 프로그램은 오류를 내지 않는다"였으니, TRFAE에서는 성립하지 않습니다.
2. **재귀 함수의 값을 Lean으로 쓸 수 없습니다.** 인터프리터는 재귀 함수를 위해 자기 자신을 가리키는 환경을 만드는데, Lean의 값으로는 이런 고리를 만들 수 없습니다.

이 장은 이 두 문제를 차례로 풉니다. 첫째는 정리에 **허용된 오류**(allowed error)를 넣는 것이고, 둘째는 호출할 때마다 **자기 자신을 다시 묶는 클로저**를 쓰는 것입니다. 마지막으로 재귀 함수 때문에 연료가 왜 이제 꼭 필요해지는지 살펴봅니다. 두 아이디어 모두 고칠 곳이 몇 줄뿐이라는 점도 함께 확인하겠습니다.

## 허용된 오류

### 모든 실행 중 오류가 타입 오류는 아니다

[타입 시스템](./type-systems.md)에서 이미 본 것처럼, 모든 실행 중 오류(run-time error)가 타입 오류(type error)인 것은 아닙니다. `42 / 0`에서 `0`은 수가 기대되는 자리에 놓인 수이므로 타입은 맞습니다. 실패의 원인은 타입이 아니라 **값**입니다.

TRFAE의 인터프리터가 낼 수 있는 오류는 다섯 가지입니다. Lean 프로젝트는 이를 귀납 타입 `Err`로 적습니다.

```lean
inductive Err where
  | divZero  -- invalid operation: _ / 0, _ % 0
  | notNum   -- invalid operation: non-numeric operand
  | notBool  -- not a boolean
  | notFun   -- not a function
  | freeId   -- free identifier
  deriving DecidableEq, Repr
```

이 가운데 `divZero`만 타입 오류가 아닙니다. 나눗셈의 타입 규칙 τ-Div는 두 피연산자가 수이기만 하면 통과시킵니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_1 : \texttt{num}$}
\AxiomC{$\Gamma \vdash e_2 : \texttt{num}$}
\LeftLabel{$\tau\texttt{-Div}$}
\BinaryInfC{$\Gamma \vdash e_1\ \texttt{/}\ e_2 : \texttt{num}$}
\end{prooftree}
\\]

```lean
  /-- τ-Div; the divisor is not checked for zero, so `divZero` remains possible. -/
  | div {Γ l r} : HasType Γ l .num → HasType Γ r .num → HasType Γ (.div l r) .num
```

정말 그런지 `Examples.lean`에서 확인할 수 있습니다. 타입 검사기는 `1 / 0`에 `num`을 주고, 인터프리터는 `divZero`를 냅니다.

```lean
example : typeCheck [] (.div (.num 1) (.num 0)) = some .num := by decide
example : eval 10 [] (.div (.num 1) (.num 0)) = some (.error .divZero) := rfl
```

`by decide`는 참·거짓을 계산할 수 있는 명제를 계산해서 증명하는 전술이고, `rfl`은 양쪽을 계산하면 같아진다는 증명입니다. 둘 다 Lean이 프로그램을 직접 실행해서 확인한 것입니다.

### `Sound`의 오류 칸 하나 바꾸기

그렇다면 정리를 어떻게 고쳐야 할까요? TFAE의 `Sound`는 결과를 세 칸으로 나누고, 오류 칸에 `False`를 두었습니다.

```lean
def Sound {α} (r : Res α) (P : α → Prop) : Prop :=
  match r with
  | none => True
  | some (.error _) => False
  | some (.ok a) => P a
```

TRFAE에서는 이 오류 칸 하나만 바꿉니다. 오류가 나도 되지만, 그 오류는 반드시 `divZero`여야 합니다.

```lean
/-- `r` is out of fuel, a `divZero` error, or a value satisfying `P`; type errors are excluded. -/
def Sound {α} (r : Res α) (P : α → Prop) : Prop :=
  match r with
  | none => True
  | some (.error e) => e = .divZero
  | some (.ok a) => P a
```

정리의 문장은 앞 장과 글자 하나 다르지 않습니다. 바뀐 것은 `Sound`의 뜻뿐입니다.

```lean
theorem type_soundness {e : Expr} {T : Ty} (h : HasType [] e T) (n : Nat) :
    Sound (eval n [] e) (fun v => VT v T) :=
  eval_sound n envT_nil h
```

`Sound`를 풀어 쓴 따름정리 `no_type_error`가 이 장 정리의 핵심을 한 줄로 말해 줍니다. 닫힌 식이 타입이 맞으면, 어떤 연료로 실행하든 나는 오류는 `divZero`뿐입니다. 즉 **타입 오류는 나지 않습니다.**

```lean
theorem no_type_error {e : Expr} {T : Ty} (h : HasType [] e T) (n : Nat) (err : Err) :
    eval n [] e = some (.error err) → err = .divZero := by
  intro he
  have hs := type_soundness h n
  rw [he] at hs
  exact hs
```

> **생각해 보기**: 오류 칸을 `True`로 두면, 즉 어떤 오류든 허용하면 증명은 훨씬 쉬워집니다. 하지만 그 정리는 "타입이 맞으면 오류가 나거나, 안 나면 타입이 맞는 값이 나온다"는 뜻이 되어, 타입 시스템이 막아야 할 `notNum`이나 `notFun`에 대해 아무것도 말해 주지 않습니다. 허용된 오류는 **타입 시스템이 막을 수 없는 오류만** 정확히 골라 적어야 의미가 있습니다.

### `Sound.bind`: 오류를 그대로 전달하기

`Sound`의 뜻이 바뀌었으니 `Sound`에 대한 보조정리도 다시 봐야 합니다. 가장 많이 쓰이는 것은 앞 장의 `Sound.bind`입니다. `bindR`로 두 계산을 이어 붙일 때, 앞 계산이 `Sound`이고 그 값으로 이어지는 계산도 `Sound`이면 전체도 `Sound`라는 정리였지요. TFAE에서는 앞 계산이 오류인 경우가 가정 `False`와 모순이었습니다(`exact False.elim h`). TRFAE에서는 이 경우가 모순이 아닙니다.

```lean
theorem Sound.bind {α β : Type} {r : Res α} {k : α → Res β} {P : α → Prop} {Q : β → Prop}
    (h : Sound r P) (hk : ∀ a, P a → Sound (k a) Q) : Sound (bindR r k) Q := by
  cases r with
  | none => trivial
  | some x =>
    cases x with
    | error e => exact h
    | ok a => exact hk a h
```

`error e` 경우에 가정 `h`는 `e = .divZero`입니다. 그리고 `bindR`은 오류를 그대로 전달하므로 목표도 `e = .divZero`입니다. 가정이 곧 목표이니 `exact h`로 끝납니다. 앞 계산에서 난 `divZero`는 이어 붙인 계산에서도 같은 `divZero`라는 뜻입니다. 이 보조정리가 성립하기 때문에, 증명 본체의 산술, `val`, 함수 적용 경우는 TFAE와 한 글자도 다르지 않습니다.

### 나눗셈: 오류가 실제로 생기는 곳

`divZero`가 실제로 생기는 곳은 산술 연산을 계산하는 `numBOp`입니다. Scala 구현의 `numBOp`는 `/`와 `%`이면 다른 검사보다 **먼저** 오른쪽 피연산자가 `0`인지 봅니다. Lean도 같은 순서로 씁니다.

```lean
def numBOp (isDiv : Bool) (op : Int → Int → Int) (l r : Value) : Res Value :=
  match isDiv, l, r with
  | true, _, .num 0 => err .divZero
  | _, .num a, .num b => ret (.num (op a b))
  | _, _, _ => err .notNum
```

이 순서 때문에 `true / 0`은 `notNum`이 아니라 `divZero`를 냅니다. 타입이 맞는 프로그램에서는 이런 식이 나오지 않으므로 증명에는 영향이 없지만, Lean의 인터프리터가 구현과 같은 결과를 내도록 순서까지 맞춘 것입니다. 정수 나눗셈도 Scala의 `BigInt`처럼 0 쪽으로 버리는 `Int.tdiv`, `Int.tmod`를 씁니다(`Examples.lean`에서 `-7 / 2 = -3`을 확인합니다).

TFAE의 `sound_numBOp`는 "수 두 개를 더하면 수"였습니다. TRFAE에서는 "수 두 개를 계산하면 수이거나 `divZero`"가 됩니다.

```lean
theorem sound_numBOp {d : Bool} {op : Int → Int → Int} {a b : Value}
    (ha : VT a .num) (hb : VT b .num) :
    Sound (numBOp d op a b) (fun v => VT v .num) := by
  cases ha
  cases hb
  unfold numBOp
  split
  · rfl
  · exact VT.num
  · rename_i hne
    simp at hne
```

`cases ha`, `cases hb`로 두 값이 `.num`임을 얻은 뒤, `split`으로 `numBOp`의 `match`를 세 줄에 따라 나눕니다. 첫 줄은 `divZero`이므로 `Sound`의 오류 칸 `.divZero = .divZero`가 `rfl`로 끝납니다. 둘째 줄은 결과가 수이므로 `VT.num`입니다. 셋째 줄은 "두 값이 모두 수인데 둘째 줄에 걸리지 않았다"는 모순된 가정 `hne`가 생기고, `simp`가 이를 확인합니다. `notNum` 오류가 증명에서 사라지는 곳이 바로 여기입니다.

### 불리언, 비교, 조건식

나머지 새 식들은 앞 장과 같은 방법으로 처리됩니다. 비교 `<`, `==`의 τ-Lt, τ-Eq는 τ-Add와 같은 모양이고, `sound_numCOp`가 "수 두 개를 비교하면 불리언"을 말합니다.

조건식은 조금 더 볼 만합니다. 먼저 τ-If 규칙과 Lean 생성자를 나란히 놓아 봅시다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : \texttt{bool}$}
\AxiomC{$\Gamma \vdash e_1 : \tau$}
\AxiomC{$\Gamma \vdash e_2 : \tau$}
\LeftLabel{$\tau\texttt{-If}$}
\TrinaryInfC{$\Gamma \vdash \texttt{if}\ (e_0)\ e_1\ \texttt{else}\ e_2 : \tau$}
\end{prooftree}
\\]

```lean
  /-- τ-If -/
  | ite {Γ c t e T} :
      HasType Γ c .bool → HasType Γ t T → HasType Γ e T → HasType Γ (.ite c t e) T
```

증명의 τ-If 경우는 조건의 값부터 다룹니다. 귀납 가정으로 조건의 값 `cv`는 `bool` 타입(`hcv : VT cv .bool`)입니다. `bool` 타입의 값을 만드는 `VT`의 생성자는 `VT.bool` 하나뿐이므로, `cases hcv`를 하면 `cv`가 `.bool b` 꼴이라는 사실만 남습니다. 인터프리터의 `notBool` 오류 경우가 증명에서 사라지는 순간입니다.

```lean
    | ite hc ht he =>
      -- τ-If: the condition is a boolean, so `not a boolean` cannot occur.
      simp only [eval]
      refine Sound.bind (ih hρ hc) fun cv hcv => ?_
      cases hcv with
      | @bool b =>
        cases b with
        | true => exact ih hρ ht
        | false => exact ih hρ he
```

`@bool b`의 `@`는 생성자의 암묵적 인자 `b`에도 이름을 붙이겠다는 표시입니다. `b`가 `true`이면 then 식을, `false`이면 else 식을 계산하므로, 각각 `ht`, `he`에 귀납 가정을 씁니다. τ-If가 두 갈래에 같은 타입 \\(\tau\\)를 요구하기 때문에 두 경우 모두 같은 목표 `VT v T`를 얻습니다.

## 재귀 함수: 자기 자신을 다시 묶는 클로저

### 구현은 순환 환경을 만든다

이제 두 번째 문제입니다. [재귀 함수](./recursive-functions.md)에서 본 것처럼, 인터프리터는 재귀 함수 정의를 만나면 자기 자신을 가리키는 환경을 만듭니다. TRFAE의 구현도 같습니다.

```scala
case Rec(n, p, _, _, b, s) =>
  lazy val newEnv: Env = env + (n -> CloV(p, b, () => newEnv))
  interp(s, newEnv)
case App(f, e) =>
  interp(f, env) match
    case CloV(p, b, fenv) => interp(b, fenv() + (p -> interp(e, env)))
```

클로저가 담는 환경 칸은 값이 아니라 함수 `() => newEnv`이고, `newEnv`는 다시 그 클로저를 담고 있습니다. 자연 의미로 쓰면 \\(\sigma' = \sigma[x_0 \mapsto \langle \lambda x_1.e_2, \sigma' \rangle]\\)입니다. \\(\sigma'\\)의 정의에 \\(\sigma'\\) 자신이 나오는, 환경과 클로저가 서로를 가리키는 <a id="g-cyclic-environment"></a>순환 환경(cyclic environment)입니다.

### Lean의 값은 유한하다

Lean의 귀납 타입 값은 유한한 나무입니다. 리스트 안에 자기 자신을 담는 리스트를 만들 수 없듯이, 자기 자신을 담는 환경도 만들 수 없습니다. 그래서 Lean 프로젝트는 값에 새 생성자 `rclo`를 더합니다.

```lean
inductive Value where
  | num (n : Int)
  | bool (b : Bool)
  | clo (p : String) (body : Expr) (env : List (String × Value))
  | rclo (f : String) (p : String) (body : Expr) (env : List (String × Value))
```

<a id="g-recursive-closure"></a>재귀 클로저(recursive closure) `rclo f p b ρ`는 순환된 `newEnv` 대신 **만들어질 때의 환경 `ρ`** 와 **자기 이름 `f`** 만 저장합니다. 그리고 고리가 필요한 순간에 고리를 한 겹씩 다시 만듭니다. `eval`의 두 경우를 보세요.

```lean
    -- `Rec`: evaluate the scope in `newEnv`, represented by binding `f ↦ rclo f p b ρ`.
    | .recd f p _ _ b s => eval n ((f, .rclo f p b ρ) :: ρ) s
    ...
        -- `fenv() = newEnv`: rebind the closure to its own name, unrolling the cycle once.
        | .rclo g p b fenv => bindR (eval n ρ a) fun v =>
            eval n ((p, v) :: (g, .rclo g p b fenv) :: fenv) b
```

- `def`를 만나면 범위 식 `s`를 `(f, .rclo f p b ρ) :: ρ`, 곧 \\(\rho[f \mapsto \texttt{rclo}\ f\ p\ b\ \rho]\\)에서 계산합니다. 구현의 `newEnv`를 한 겹 펼친 것입니다.
- `rclo`를 호출하면 본문을 `(p, v) :: (g, .rclo g p b fenv) :: fenv`에서 계산합니다. 호출할 때마다 **자기 자신을 다시 묶은** `newEnv`를 새로 만들고, 거기에 매개변수를 더하는 것입니다.

두 표현을 나란히 그리면 다음과 같습니다. 왼쪽의 고리가 오른쪽에서는 사라졌습니다.

<div style="text-align:center">
<svg viewBox="0 0 640 230" width="100%" style="max-width: 640px" role="img" aria-label="왼쪽: 구현에서는 환경 σ'의 f가 클로저를 가리키고 클로저가 다시 σ'를 가리키는 고리가 있다. 오른쪽: Lean에서는 f가 rclo f x b를 가리키고 rclo는 만들어질 때의 환경 ρ만 가리켜 고리가 없다" font-family="sans-serif" fill="currentColor">
<defs><marker id="lean-errors-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="150" y="22" text-anchor="middle" font-size="15" font-weight="bold">구현(Scala)</text>
<text x="20" y="62" font-size="15" font-style="italic">σ'</text>
<rect x="20" y="70" width="120" height="60" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="20" y1="100" x2="140" y2="100" stroke="currentColor" stroke-width="1.2"/>
<line x1="54" y1="70" x2="54" y2="130" stroke="currentColor" stroke-width="1.2"/>
<text x="37" y="90" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">…</text>
<text x="97" y="90" text-anchor="middle" font-size="13">σ의 바인딩</text>
<text x="37" y="120" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">f</text>
<circle cx="97" cy="115" r="4"/>
<line x1="101" y1="115" x2="176" y2="115" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-errors-1)"/>
<rect x="180" y="100" width="100" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="252" y1="100" x2="252" y2="130" stroke="currentColor" stroke-width="1.2"/>
<text x="216" y="120" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">λx.b</text>
<circle cx="266" cy="115" r="4"/>
<path d="M266,111 C266,40 90,40 82,66" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-errors-1)"/>
<text x="150" y="175" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">σ' = σ[f ↦ ⟨λx.b, σ'⟩]</text>
<text x="150" y="200" text-anchor="middle" font-size="13">환경과 클로저가 서로를 가리킨다</text>
<line x1="315" y1="15" x2="315" y2="215" stroke="currentColor" stroke-width="1" stroke-dasharray="4 4" opacity="0.5"/>
<text x="490" y="22" text-anchor="middle" font-size="15" font-weight="bold">Lean</text>
<text x="350" y="80" font-size="14" font-family="ui-monospace, Menlo, monospace">f ↦</text>
<rect x="390" y="60" width="180" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<line x1="540" y1="60" x2="540" y2="90" stroke="currentColor" stroke-width="1.2"/>
<text x="465" y="80" text-anchor="middle" font-size="14" font-family="ui-monospace, Menlo, monospace">rclo f x b</text>
<circle cx="555" cy="75" r="4"/>
<path d="M555,79 L555,135 L466,135" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#lean-errors-1)"/>
<rect x="390" y="120" width="72" height="30" rx="3" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="426" y="140" text-anchor="middle" font-size="15" font-style="italic">ρ</text>
<text x="562" y="118" font-size="13">만들 때의</text>
<text x="562" y="134" font-size="13">환경</text>
<text x="490" y="175" text-anchor="middle" font-size="13">호출할 때마다 새로 만드는 환경</text>
<text x="490" y="200" text-anchor="middle" font-size="13" font-family="ui-monospace, Menlo, monospace">(x, v) :: (f, rclo f x b ρ) :: ρ</text>
</svg>
</div>

### 왜 구현에 충실한가

한 겹씩 다시 만드는 것이 정말 구현과 같은 동작일까요? 구현의 `newEnv`는 `lazy val`이고 클로저 안에서는 `() => newEnv`로 감싸여 있으므로, 실제로 꺼내 쓰이는 때는 `fenv()`가 불리는 때, 곧 **호출할 때**뿐입니다. 그때 꺼낸 환경은 `env + (n -> 그 클로저)`이고, 거기서 `n`을 찾으면 다시 같은 클로저가 나옵니다. Lean의 `rclo`는 정확히 그 순간에 같은 모양의 환경을 다시 만듭니다.

따라서 프로그램이 관찰할 수 있는 모든 것, 즉 어떤 변수를 찾으면 어떤 값이 나오는지, 계산 결과가 무엇인지, 어떤 오류가 나는지가 같습니다. 다른 것은 환경이 메모리에서 공유되는지, 매번 새로 만들어지는지뿐이고, 이 차이는 언어 안에서 구별할 수 없습니다.

### 재귀 클로저의 타입

값이 하나 늘었으니 값의 타입 `VT`에도 경우가 하나 늘어야 합니다. 출발점은 τ-Rec 규칙입니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma[x_0 : \tau_1 \to \tau_2, x_1 : \tau_1] \vdash e_2 : \tau_2$}
\AxiomC{$\Gamma[x_0 : \tau_1 \to \tau_2] \vdash e_3 : \tau_3$}
\LeftLabel{$\tau\texttt{-Rec}$}
\BinaryInfC{$\Gamma \vdash \mathtt{def}\ x_0(x_1\mathtt{:}\tau_1)\mathtt{:}\tau_2\ \mathtt{=}\ e_2;\ e_3 : \tau_3$}
\end{prooftree}
\\]

```lean
  /-- τ-Rec; `Γ[f : T1 → T2, x : T1]` is the list `(x, T1) :: (f, T1 → T2) :: Γ`. -/
  | recd {Γ f x T1 T2 b s T3} :
      HasType ((x, T1) :: (f, .arrow T1 T2) :: Γ) b T2 →
      HasType ((f, .arrow T1 T2) :: Γ) s T3 →
      HasType Γ (.recd f x T1 T2 b s) T3
```

규칙의 \\(\Gamma[x_0 : \tau_1 \to \tau_2, x_1 : \tau_1]\\)은 연관 리스트로 `(x, T1) :: (f, .arrow T1 T2) :: Γ`입니다. 나중에 더한 것이 앞에 오므로 순서가 뒤집혀 보인다는 점만 주의하면 됩니다.

`VT.rclo`는 이 규칙의 첫 전제를 그대로 담습니다.

```lean
  | rclo {Γ : TEnv} {ρ : Env} {f x b T1 T2}
      (hdom : ∀ y U, lookup Γ y = some U → (lookup ρ y).isSome)
      (hval : ∀ y U v, lookup Γ y = some U → lookup ρ y = some v → VT v U)
      (hb : HasType ((x, T1) :: (f, .arrow T1 T2) :: Γ) b T2) :
      VT (.rclo f x b ρ) (.arrow T1 T2)
```

`hdom`과 `hval`은 앞 장의 `VT.clo`와 같이 "`ρ`가 `Γ`를 구현한다"를 둘로 나눈 것이고, `hb`는 본문이 `Γ`에 함수 자신과 매개변수를 더한 환경에서 `T2` 타입이라는 것입니다. `VT.clo`와 다른 점은 `hb`의 타입 환경에 `(f, .arrow T1 T2)`가 하나 더 있다는 것뿐입니다.

여기서 눈여겨볼 것은 **`f`에 대한 조건이 없다**는 점입니다. `ρ`는 `f`를 모르는 `Γ`만 구현하면 됩니다. `f`는 호출할 때 클로저 자신으로 다시 묶이므로 따로 요구할 필요가 없습니다.

순환 환경 \\(\sigma'\\)를 그대로 썼다면 어땠을까요? "\\(\sigma'\\)가 \\(\Gamma[x_0 : \tau_1 \to \tau_2]\\)를 구현한다"를 요구해야 하고, 그러려면 \\(\sigma'(x_0)\\), 곧 지금 타입을 매기려는 그 클로저 자신이 \\(\tau_1 \to \tau_2\\) 타입이라는 것을 먼저 알아야 합니다. 정의하려는 것을 정의 안에서 가정하는 순환 정의라서 귀납적 정의로는 쓸 수 없고, <a id="g-coinduction"></a>공귀납(coinduction) 같은 더 무거운 도구가 필요해집니다. `rclo` 표현은 이 문제를 통째로 없앱니다.

### `envT_rec`: 한 줄짜리 보조정리

그 덕분에 재귀 함수의 환경에 대한 보조정리가 한 줄로 끝납니다. `ρ`가 `Γ`를 구현하고 본문이 τ-Rec의 첫 전제를 만족하면, `newEnv`에 해당하는 `(f, .rclo f x b ρ) :: ρ`가 `(f, .arrow T1 T2) :: Γ`를 구현합니다.

```lean
theorem envT_rec {ρ : Env} {Γ : TEnv} {f x : String} {b : Expr} {T1 T2 : Ty}
    (h : EnvT ρ Γ) (hb : HasType ((x, T1) :: (f, .arrow T1 T2) :: Γ) b T2) :
    EnvT ((f, .rclo f x b ρ) :: ρ) ((f, .arrow T1 T2) :: Γ) :=
  envT_cons h (VT.rclo (envT_split h).1 (envT_split h).2 hb)
```

앞 장의 `envT_cons`(환경에 타입이 맞는 값을 하나 더하기)에 `VT.rclo`를 넘긴 것이 전부입니다. 순환 추론이 전혀 없습니다.

이 정리는 증명에서 두 곳에 쓰입니다. 하나는 τ-Rec 경우로, 범위 식을 `newEnv`에서 계산할 때입니다.

```lean
    | recd hb hs =>
      -- τ-Rec
      simp only [eval]
      exact ih (envT_rec hρ hb) hs
```

다른 하나는 τ-App에서 함수 값이 `rclo`인 경우로, 본문을 다시 만든 `newEnv`에 매개변수를 더한 환경에서 계산할 때입니다.

```lean
    | app hf ha =>
      simp only [eval]
      refine Sound.bind (ih hρ hf) fun fv hfv => ?_
      -- A value of arrow type is `clo` or `rclo`, so `not a function` cannot occur.
      cases hfv with
      | clo hdom hval hb =>
        exact Sound.bind (ih hρ ha) fun v hv =>
              ih (envT_cons (envT_of_split hdom hval) hv) hb
      | rclo hdom hval hb =>
        -- Body runs in `fenv[g ↦ rclo g p b fenv][p ↦ v]` (`envT_rec`, then `envT_cons`).
        exact Sound.bind (ih hρ ha) fun v hv =>
              ih (envT_cons (envT_rec (envT_of_split hdom hval) hb) hv) hb
```

`cases hfv`로 화살표 타입 값의 모양을 나누면 `VT.clo`와 `VT.rclo` 두 경우만 남습니다. 수나 불리언은 화살표 타입을 가질 수 없으니 `notFun` 오류가 증명에서 사라집니다. `rclo` 경우는 `VT.rclo`의 전제에서 `fenv`가 `Γ`를 구현한다는 사실을 되살리고(`envT_of_split`), `envT_rec`로 자기 자신을 더하고, `envT_cons`로 매개변수를 더합니다. 이 세 단계가 `eval`이 만드는 환경 `(p, v) :: (g, .rclo g p b fenv) :: fenv`의 세 겹과 정확히 맞아떨어집니다.

## 연료가 꼭 필요해진다

[연료와 결과 분류](./lean-fuel.md)에서 `eval`에 연료를 단 것은 Lean이 모든 함수가 끝나기를 요구하기 때문이었습니다. TFAE에서는 사실 타입이 맞는 프로그램이 모두 끝난다는 것이 알려져 있어서, 원한다면 그 사실을 따로 증명해 연료를 없앨 여지라도 있었습니다. TRFAE에서는 그럴 수 없습니다. 타입이 맞는데 끝나지 않는 프로그램이 있기 때문입니다.

```lean
/-- Well-typed but divergent: `def f(x: Number): Number = f(x); f(0)` yields `none` for any fuel. -/
def loopEx : Expr :=
  .recd "f" "x" .num .num (.app (.id "f") (.id "x")) (.app (.id "f") (.num 0))

example : typeCheck [] loopEx = some .num := by decide
example : eval 50 [] loopEx = none := rfl
```

이제 연료는 편의가 아니라 꼭 필요한 장치입니다. 그리고 이 프로그램은 연료에 대한 귀납법이 왜 맞는 도구인지도 보여 줍니다. `f(x)`를 호출하면 같은 본문 `f(x)`를 다시 계산하므로, 식의 크기도 타입 유도의 크기도 전혀 줄지 않습니다. 식이나 타입 유도에 대한 귀납법으로는 재귀 호출의 귀납 가정을 얻을 수 없습니다. 반면 연료는 `eval (n + 1)`이 본문을 `eval n`으로 부르므로 매번 확실히 줄어듭니다. 그래서 일반화된 정리 `eval_sound`의 증명 틀은 TFAE와 똑같습니다.

```lean
theorem eval_sound (n : Nat) {Γ : TEnv} {ρ : Env} {e : Expr} {T : Ty}
    (hρ : EnvT ρ Γ) (ht : HasType Γ e T) : Sound (eval n ρ e) (fun v => VT v T) := by
  induction n generalizing Γ ρ e T with
  | zero =>
    simp only [eval]
    trivial
  | succ n ih =>
    cases ht with
    | num => exact VT.num
    | bool => exact VT.bool
    | add h1 h2 | mul h1 h2 | div h1 h2 | mod h1 h2 =>
      -- τ-Add / τ-Mul / τ-Div / τ-Mod
      simp only [eval]
      exact Sound.bind (ih hρ h1) fun a ha =>
            Sound.bind (ih hρ h2) fun b hb =>
            sound_numBOp ha hb
    ...
```

`| add h1 h2 | mul h1 h2 | div h1 h2 | mod h1 h2 =>`처럼 여러 경우를 한 줄에 묶으면 같은 증명을 네 경우에 함께 씁니다. `...` 뒤에는 위에서 본 τ-Rec, τ-App, τ-If 경우와 앞 장과 같은 τ-Val, τ-Id, τ-Fun 경우가 이어집니다.

> **생각해 보기**: `loopEx`에 대해 `type_soundness`는 무엇을 말해 줄까요? 어떤 연료로 실행해도 결과는 `none`이므로, 정리는 `Sound none _ = True`라는 당연한 사실만 말합니다. 타입 안전성은 "끝나면 올바른 값이다"라는 정리이지, "끝난다"는 정리가 아닙니다.

## 타입 검사기와의 일치

앞 장의 `typeCheck_iff`는 TRFAE에도 있습니다. `TypeCheck.lean`이 Scala의 `typeCheck`를 한 줄씩 Lean 함수로 옮기고, 그것이 타입 규칙 `HasType`과 정확히 같다는 것을 두 방향으로 증명합니다. 새로 생긴 재귀 함수 경우만 보겠습니다. 주석의 Scala 코드와 한 줄씩 대응합니다.

```lean
  | .recd f p T1 T2 b s => do
    -- `mustSame(typeCheck(body, tenv + (name -> fty) + (param -> pty)), rty)`
    mustSame (← typeCheck ((p, T1) :: (f, .arrow T1 T2) :: Γ) b) T2
    -- `typeCheck(scope, tenv + (name -> fty))`
    typeCheck ((f, .arrow T1 T2) :: Γ) s
```

`typeCheck_correct`(검사기를 통과하면 규칙으로 유도된다)의 이 경우는, 가정을 "본문이 `B`로 검사되었고(`hb`), `mustSame B T2`가 통과했고(`hu`), 범위 식이 `T`로 검사되었다(`hs`)"로 풀어낸 뒤 τ-Rec을 적용합니다.

```lean
  | recd f p T1 T2 b s ihb ihs =>
    simp only [typeCheck, Option.bind_eq_bind, Option.bind_eq_some_iff] at h
    obtain ⟨B, hb, u, hu, hs⟩ := h
    cases mustSame_eq hu
    exact .recd (ihb hb) (ihs hs)
```

`cases mustSame_eq hu`는 `B = T2`라는 등식으로 `B`를 `T2`로 바꿔 줍니다. 그러면 귀납 가정 두 개가 τ-Rec의 두 전제와 정확히 맞습니다. 이 정리 덕분에 Scala 타입 검사기를 통과한 프로그램에 대해서도 같은 안전성을 말할 수 있습니다(`typeCheck_soundness`).

## 정리

- TRFAE에서는 `1 / 0`처럼 타입이 맞는데 실행 중 오류가 나는 프로그램이 있습니다. 그래서 정리는 **허용된 오류** `divZero`를 결과 분류 `Sound`의 오류 칸에 넣습니다. 바뀌는 것은 `False`가 `e = .divZero`로 바뀐 그 칸 하나입니다.
- `Sound.bind`의 오류 경우는 모순이 아니라 "앞에서 난 `divZero`가 그대로 전달된다"가 되고, `sound_numBOp`는 "수이거나 `divZero`"를 말합니다. 나머지 경우의 증명은 TFAE와 같습니다.
- 허용된 오류는 타입 시스템이 막을 수 없는 오류만 골라야 의미가 있습니다. 모든 오류를 허용하면 정리가 아무것도 보장하지 않습니다.
- 구현은 재귀 함수를 위해 순환 환경을 만들지만 Lean의 값은 유한합니다. 재귀 클로저 `rclo f p b ρ`는 만들어질 때의 환경과 자기 이름만 저장하고, 호출할 때마다 자기 자신을 다시 묶어 고리를 한 겹씩 펼칩니다. 관찰할 수 있는 동작은 구현과 같습니다.
- `VT.rclo`는 τ-Rec의 첫 전제를 담고 함수 자신에 대한 조건을 요구하지 않으므로 순환 정의가 생기지 않습니다. 그 결과 `envT_rec`는 한 줄이고, τ-Rec과 `rclo` 호출 두 곳에 쓰입니다.
- 타입이 맞는데 끝나지 않는 프로그램이 있으므로 연료는 꼭 필요합니다. 재귀 호출에서 식은 줄지 않지만 연료는 줄기 때문에, 연료에 대한 귀납법은 그대로 통합니다.

## 연습 문제

1. `Sound`의 오류 칸을 TFAE처럼 `False`로 되돌리고 `lake build`를 해 보세요. 증명이 가장 먼저 깨지는 곳은 어디인가요? 그 자리가 깨지는 이유를 `Examples.lean`의 `1 / 0` 예와 연결해 설명하세요.
2. `numBOp`를 "먼저 두 값이 수인지 보고, 그다음 0인지 보는" 순서로 고쳐 써 보세요. 타입이 맞는 프로그램의 결과는 달라질까요? `sound_numBOp`의 증명은 어떻게 바뀌어야 하나요? 결과가 달라지는(타입이 맞지 않는) 식의 예도 하나 들어 보세요.
3. [재귀 함수의 타입](./typing-recursive-functions.md)의 연습 문제처럼 τ-Rec의 두 번째 전제에 \\(x_1 : \tau_1\\)도 넣도록 `HasType.recd`를 고쳐 보세요. `eval_sound`의 어느 경우가 깨지나요? Lean이 보여 주는 남은 목표가 무엇을 요구하는지, 그리고 그것이 왜 성립하지 않는지 설명하세요.
4. 다음 보조정리를 증명해 보세요. `ite` 경우에서 `cases hcv`가 해 준 일을 독립된 정리로 꺼낸 것입니다.
   ```lean
   theorem VT.bool_inv {v : Value} (h : VT v .bool) : ∃ b, v = .bool b := by
     sorry
   ```
5. 모든 연료에 대해 `eval n [] loopEx = none`임을 증명해 보세요. (힌트: 몇 단계를 계산하면 같은 환경에서 같은 식 `f(x)`로 돌아옵니다. 그 식과 환경에 대한 명제를 먼저 연료에 대해 귀납법으로 증명하세요.)
6. TRFAE에 식 `assert(e)`를 더한다고 해 봅시다. `e`가 `true`이면 `true`를, `false`이면 새 오류 `assertFail`을 냅니다. 타입 규칙, `Err`, `eval`, `Sound`를 어떻게 고쳐야 할까요? `assertFail`은 타입 오류인가요, 허용된 오류인가요? 고친 뒤 증명에서 새로 필요한 경우를 채워 보세요.
