# 연료와 결과 분류

[기계로 확인하는 증명](./lean-intro.md)에서 4부의 정리가 어떤 모양인지 보았습니다. 이 장에서는 그 정리를 가장 작은 타입 있는 언어인 [타입 있는 언어](./typed-languages.md)의 \\(\mathsf{TFAE}\\)에 대해 처음부터 끝까지 증명합니다. 수, 덧셈과 곱셈, `val`, 타입 표기가 붙은 일급 함수만 있는 언어라서 증명 자체는 짧습니다. 하지만 여기서 세우는 틀, 즉 연관 리스트 환경, 연료로 움직이는 인터프리터, 귀납적 관계로 쓴 타입 규칙, 값의 타입, 결과 분류 `Sound`, 연료에 대한 귀납법은 4부의 모든 장이 그대로 이어받습니다. 그래서 이 장은 천천히 갑니다.

이 장의 순서는 정리 한 줄에 나오는 낱말을 하나씩 정의하는 순서입니다. 먼저 정리를 보고, 그 정리에 나오는 `eval`, `HasType`, `VT`, `Sound`를 차례로 정의한 다음, 증명으로 넘어갑니다. 마지막으로 구현의 타입 검사기가 타입 규칙과 정확히 같다는 것도 증명합니다.

## 증명하려는 정리

\\(\mathsf{TFAE}\\)의 인터프리터가 내는 실행 중 오류는 세 가지뿐입니다. 피연산자가 수가 아닌 덧셈이나 곱셈(`invalid operation`), 함수가 아닌 값의 호출(`not a function`), 환경에 없는 변수(`free identifier`)입니다. 셋 다 타입 오류이므로, \\(\mathsf{TFAE}\\)의 타입 안전성(type soundness)은 "타입이 맞는 닫힌 식은 어떤 오류도 내지 않고, 끝나면 그 타입의 값을 낸다"입니다. Lean으로는 다음 두 정리입니다.

```lean
theorem type_soundness {e : Expr} {T : Ty} (h : HasType [] e T) (n : Nat) :
    Sound (eval n [] e) (fun v => VT v T)

theorem no_type_error {e : Expr} {T : Ty} (h : HasType [] e T) (n : Nat) (err : Err) :
    eval n [] e ≠ some (.error err)
```

첫 정리는 "빈 타입 환경에서 \\(e\\)의 타입이 \\(T\\)이면, 어떤 연료 `n`으로 실행하든 결과는 `Sound`하다"로 읽습니다. 둘째 정리는 그 <a id="g-corollary"></a>따름정리(corollary)로, 어떤 오류도 나지 않는다는 것입니다. 이제 `Expr`, `eval`, `HasType`, `VT`, `Sound`를 하나씩 만나 봅시다.

코드는 이 책의 Lean 프로젝트 가운데 \\(\mathsf{TFAE}\\) 프로젝트에서 가져왔습니다. 파일은 다음 순서로 읽으면 됩니다.

| 파일 | 내용 |
|---|---|
| `Syntax.lean` | 타입 `Ty`, 식 `Expr`, 값 `Value`, 환경 `Env`, `lookup` |
| `Eval.lean` | 오류 `Err`, 결과 `Res`, 인터프리터 `eval` |
| `Typing.lean` | 타입 규칙 `HasType` |
| `ValueTyping.lean` | 값의 타입 `VT`, 환경의 타입 `EnvT`, 결과 분류 `Sound` |
| `Lemmas.lean` | 보조정리 |
| `Soundness.lean` | `eval_sound`, `type_soundness`, `no_type_error` |
| `TypeCheck.lean` | 구현의 타입 검사기 `typeCheck`와 `typeCheck_iff` |
| `Examples.lean` | 작은 예제 |

## 문법과 연관 리스트 환경

타입과 식은 Scala 구현의 `enum`을 그대로 Lean의 `inductive`로 옮깁니다.

```lean
inductive Ty where
  | num
  | arrow (pty rty : Ty)
  deriving DecidableEq, Repr

inductive Expr where
  | num (n : Int)
  | add (l r : Expr)
  | mul (l r : Expr)
  | val (x : String) (init body : Expr)
  | id (x : String)
  | fn (p : String) (pty : Ty) (body : Expr)
  | app (fn arg : Expr)
  deriving Repr
```

`Ty`는 \\(\texttt{num}\\)과 화살표 타입 \\(\tau_1 \to \tau_2\\)이고, `Expr`의 생성자는 Scala의 `Num`, `Add`, `Mul`, `Val`, `Id`, `Fun`, `App`에 하나씩 대응합니다. 수는 크기 제한이 없는 정수 `Int`로, Scala의 `BigInt`에 해당합니다. `deriving DecidableEq`는 두 타입이 같은지 계산으로 판정하는 함수를 자동으로 만들라는 뜻인데, 타입 검사기의 `mustSame`에 필요합니다.

값은 수와 클로저입니다.

```lean
inductive Value where
  | num (n : Int)
  | clo (p : String) (body : Expr) (env : List (String × Value))
```

클로저 `.clo p b ρ`는 Scala의 `CloV(p, b, env)`, 수학 표기로는 \\(\langle \lambda p.b, \sigma \rangle\\)입니다. 함수가 **만들어질 때의** 환경을 함께 들고 다닙니다.

### 환경은 연관 리스트

Scala에서 환경은 `Map[String, Value]`였습니다. Lean에서는 이름과 값의 쌍을 늘어놓은 리스트, 즉 <a id="g-association-list"></a>연관 리스트(association list)로 씁니다.

```lean
def lookup {α : Type} : List (String × α) → String → Option α
  | [], _ => none
  | (k, v) :: l, x => if k = x then some v else lookup l x

abbrev Env := List (String × Value)
```

- 새 바인딩은 리스트 **앞에** 붙입니다. Scala의 `env + (x -> v)`가 Lean에서는 `(x, v) :: env`입니다.
- `lookup`은 앞에서부터 찾으므로, 나중에 붙인 바인딩이 같은 이름의 앞 바인딩을 가립니다. Scala `Map`에서 나중 것이 이기는 것과 같은 동작입니다.
- `lookup`은 원소 타입 `α`를 암묵적 인자로 받으므로 값 환경(`α = Value`)과 타입 환경(`α = Ty`)에 모두 씁니다. 수학 표기 \\(\sigma(x)\\)와 \\(\Gamma(x)\\)가 둘 다 `lookup`입니다.

왜 함수 `String → Option Value`가 아니라 리스트일까요? 클로저가 환경을 **값으로** 들고 다녀야 하기 때문입니다. 리스트는 귀납 타입이라 `Value`의 정의 안에 넣을 수 있고, 계산해서 출력해 볼 수도 있습니다. `Value` 안에 `Value`의 리스트가 들어가는 정의를 중첩된(nested) 귀납 정의라고 하는데, Lean은 이 정의를 받아 줍니다. (`Env`라는 이름은 `Value`보다 뒤에 정의되므로 `Value` 안에서는 `List (String × Value)`로 풀어 썼습니다.)

환경에 대한 증명은 거의 다음 두 계산 규칙으로 해결됩니다. "방금 넣은 이름은 그 값으로 찾아진다"와 "다른 이름은 그 뒤에서 찾는다"입니다.

```lean
theorem lookup_cons_self {α : Type} (x : String) (v : α) (l : List (String × α)) :
    lookup ((x, v) :: l) x = some v := by
  simp [lookup]

theorem lookup_cons_ne {α : Type} {x y : String} {v : α} {l : List (String × α)}
    (h : x ≠ y) : lookup ((x, v) :: l) y = lookup l y := by
  simp [lookup, h]
```

`simp [lookup]`은 `lookup`의 정의를 펼쳐 `if x = x then ...`을 계산합니다.

## 연료로 움직이는 인터프리터

### 결과의 세 갈래

인터프리터의 결과 타입은 다음과 같습니다.

```lean
abbrev Res (α : Type) := Option (Except Err α)
```

`none`은 연료 부족, `some (.error e)`는 오류 `e`, `some (.ok v)`는 값 `v`입니다. `Except ε α`는 실패 `.error e`나 성공 `.ok a` 중 하나로, Scala의 `Either`와 비슷합니다. 오류의 종류 `Err`는 세 생성자 `notNum`(invalid operation), `notFun`(not a function), `freeId`(free identifier)를 가집니다. Scala에서는 오류 메시지가 문자열이었지만, 증명에서는 오류의 **종류**만 구별하면 충분합니다.

Scala에서 `interp(left, env)`가 오류를 던지면 그 뒤는 실행되지 않고 오류가 위로 전파됩니다. 이 동작을 `bindR`로 흉내 냅니다.

```lean
def bindR {α β : Type} (r : Res α) (k : α → Res β) : Res β :=
  match r with
  | none => none
  | some (.error e) => some (.error e)
  | some (.ok a) => k a
```

앞 계산 `r`이 값 `a`를 내면 나머지 계산 `k a`를 이어서 하고, 연료 부족이나 오류이면 그대로 돌려줍니다. 줄임말 `ret a`는 `some (.ok a)`, `err e`는 `some (.error e)`입니다. 산술 연산은 Scala의 `numBOp`처럼 두 값이 모두 수일 때만 계산합니다.

```lean
def numBOp (op : Int → Int → Int) (l r : Value) : Res Value :=
  match l, r with
  | .num a, .num b => ret (.num (op a b))
  | _, _ => err .notNum
```

### 인터프리터

이제 인터프리터입니다. 첫 인자가 연료입니다.

```lean
def eval : Nat → Env → Expr → Res Value
  | 0, _, _ => none
  | n + 1, ρ, e =>
    match e with
    | .num k => ret (.num k)
    | .add l r => bindR (eval n ρ l) fun a => bindR (eval n ρ r) fun b => numBOp (· + ·) a b
    | .mul l r => bindR (eval n ρ l) fun a => bindR (eval n ρ r) fun b => numBOp (· * ·) a b
    | .val x i b => bindR (eval n ρ i) fun v => eval n ((x, v) :: ρ) b
    | .id x =>
      match lookup ρ x with
      | some v => ret v
      | none => err .freeId
    | .fn p _ b => ret (.clo p b ρ)
    | .app f a =>
      bindR (eval n ρ f) fun fv =>
        match fv with
        | .clo p b fenv => bindR (eval n ρ a) fun v => eval n ((p, v) :: fenv) b
        | .num _ => err .notFun
```

연료가 0이면 `none`이고, `n + 1`이면 한 단계 계산하면서 **모든** 재귀 호출에 `n`을 넘깁니다. 이것만 빼면 Scala의 `interp`를 한 줄씩 옮긴 것입니다. `.add` 줄은 "`l`을 계산해서 `a`, `r`을 계산해서 `b`, 그다음 `numBOp`"로 읽으면 됩니다. 함수 적용은 [일급 함수](./first-class-functions.md) 장의 자연 의미 규칙과 나란히 놓고 보면 좋습니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma \vdash e_0 \Rightarrow \langle \lambda x.e_2, \sigma' \rangle$}
\AxiomC{$\sigma \vdash e_1 \Rightarrow v_1$}
\AxiomC{$\sigma'[x \mapsto v_1] \vdash e_2 \Rightarrow v_2$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\sigma \vdash e_0(e_1) \Rightarrow v_2$}
\end{prooftree}
\\]

세 전제가 `.app` 경우의 세 재귀 호출 `eval n ρ f`, `eval n ρ a`, `eval n ((p, v) :: fenv) b`에 그대로 대응합니다. 평가 순서(함수 다음 인자), 함수 자리가 클로저일 때만 인자를 계산한다는 점, 몸통을 호출한 쪽의 환경 `ρ`가 아니라 클로저의 환경 `fenv`에서 계산한다는 점(정적 스코프)까지 Scala 코드와 같습니다. 이런 세부가 중요한 이유는 정리가 **이** `eval`에 대한 것이기 때문입니다. 평가 순서가 다르면 어떤 오류가 먼저 나는지가 달라지고, 그러면 다른 언어에 대한 정리가 됩니다.

### 왜 연료인가

연료 없이 `eval : Env → Expr → Res Value`로 정의하면 어떻게 될까요? Lean의 `def`는 반드시 끝나야 하므로, Lean은 재귀 호출마다 어떤 인자가 줄어드는지 확인합니다. 이것을 <a id="g-termination-check"></a>종료 검사(termination check)라고 합니다. `.add l r`의 재귀 호출은 부분식 `l`, `r`에 대한 것이라 문제없습니다. 그러나 `.app f a`의 마지막 호출 `eval ... b`의 `b`는 클로저 안에 들어 있던 몸통이고, `f(a)`의 부분식이 아닙니다. 실제로 이 언어에 재귀가 있다면 이 호출은 끝나지 않을 수도 있습니다. Lean은 정의를 거부합니다.

연료를 넣으면 모든 재귀 호출에서 연료가 `n + 1`에서 `n`으로 줄어들므로, 자연수에 대한 구조적 재귀가 되어 Lean이 받아 줍니다. [기계로 확인하는 증명](./lean-intro.md#왜-연료로-충분한가)에서 보았듯이 정리가 모든 연료에 대해 성립하므로 잃는 것은 없습니다.

연료를 넉넉히 주면 실제로 계산해 볼 수도 있습니다. `Examples.lean`에는 다음 예가 있습니다.

```lean
/-- `((x: Number) => x + 1)(41)` -/
def ex1 : Expr := .app (.fn "x" .num (.add (.id "x") (.num 1))) (.num 41)
```

```lean
/-- With enough fuel the result is `42`. -/
example : eval 10 [] ex1 = some (.ok (.num 42)) := rfl

/-- With too little fuel the result is `none`. -/
example : eval 2 [] ex1 = none := rfl
```

`example`은 이름 없는 정리이고, `rfl`은 양변을 끝까지 계산해서 같은지 확인합니다. 연료 10이면 충분해서 `42`가 나오고, 연료 2로는 모자라서 `none`이 나옵니다.

> **생각해 보기.** `ex1`을 계산하려면 연료가 최소 얼마 있어야 할까요? `eval`이 한 번 호출될 때마다 연료가 하나씩 줄어드는 것은 "재귀의 깊이"만큼 연료를 쓴다는 뜻입니다. 호출 횟수가 아니라 깊이라는 점에 주의하세요.

## 타입 규칙은 귀납적 관계

[타입 있는 언어](./typed-languages.md) 장에서 타입 규칙은 추론 규칙으로 정의했습니다. Lean에서는 판단 \\(\Gamma \vdash e : \tau\\)를 명제 `HasType Γ e T`로 두고, 추론 규칙 하나를 생성자 하나로 씁니다. 결과가 `Prop`인 이런 `inductive`를 귀납적 명제(inductive proposition)라고 합니다.

```lean
abbrev TEnv := List (String × Ty)

inductive HasType : TEnv → Expr → Ty → Prop
  /-- τ-Num -/
  | num {Γ n} : HasType Γ (.num n) .num
  /-- τ-Add -/
  | add {Γ l r} : HasType Γ l .num → HasType Γ r .num → HasType Γ (.add l r) .num
  /-- τ-Mul -/
  | mul {Γ l r} : HasType Γ l .num → HasType Γ r .num → HasType Γ (.mul l r) .num
  /-- τ-Val -/
  | val {Γ x i b T1 T2} :
      HasType Γ i T1 → HasType ((x, T1) :: Γ) b T2 → HasType Γ (.val x i b) T2
  /-- τ-Id -/
  | id {Γ x T} : lookup Γ x = some T → HasType Γ (.id x) T
  /-- τ-Fun -/
  | fn {Γ p T b R} : HasType ((p, T) :: Γ) b R → HasType Γ (.fn p T b) (.arrow T R)
  /-- τ-App -/
  | app {Γ f a T1 T2} :
      HasType Γ f (.arrow T1 T2) → HasType Γ a T1 → HasType Γ (.app f a) T2
```

타입 환경 `TEnv`는 이름과 타입의 연관 리스트이고, \\(\Gamma[x : \tau]\\)는 `(x, T) :: Γ`입니다. 생성자 위의 문서 주석 `/-- τ-App -/`이 2부의 규칙 이름입니다. 생성자를 읽는 법은 간단합니다. 화살표 `→` 왼쪽들이 규칙의 전제(가로줄 위)이고, 마지막이 결론(가로줄 아래)입니다. 중괄호 `{Γ f a T1 T2}`는 규칙에 나오는 메타 변수들로, 쓸 때 Lean이 알아서 채우는 암묵적 인자입니다. 예를 들어 `app` 생성자와 τ-App 규칙을 나란히 놓으면 다음과 같습니다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : \tau_1 \to \tau_2$}
\AxiomC{$\Gamma \vdash e_1 : \tau_1$}
\LeftLabel{$\tau\texttt{-App}$}
\BinaryInfC{$\Gamma \vdash e_0(e_1) : \tau_2$}
\end{prooftree}
\\]

τ-Id는 모양이 조금 다릅니다. 2부에서는 전제가 \\(x \in \text{Dom}(\Gamma)\\)이고 결론이 \\(\Gamma \vdash x : \Gamma(x)\\)였습니다.

\\[
\begin{prooftree}
\AxiomC{$x \in \text{Dom}(\Gamma)$}
\LeftLabel{$\tau\texttt{-Id}$}
\UnaryInfC{$\Gamma \vdash x : \Gamma(x)$}
\end{prooftree}
\\]

Lean의 `id` 생성자는 두 조건을 `lookup Γ x = some T` 하나로 합쳤습니다. "\\(x\\)가 \\(\Gamma\\)에 있고 그 타입이 \\(T\\)이다"라는 뜻이니 같은 규칙입니다.

이렇게 정의하면 몇 가지가 자연스럽게 따라옵니다.

- **유도 트리는 증명 항입니다.** `HasType [] ex1 .num`의 증명은 생성자를 쌓은 트리입니다. `Examples.lean`에는 앞의 `ex1`, 곧 \\((\lambda x\texttt{:}\texttt{num}.x + 1)(41)\\)의 유도 트리를 항으로 직접 적은 예가 있습니다.

  ```lean
  example : HasType [] ex1 .num :=
    .app (.fn (.add (.id rfl) .num)) .num
  ```

  바깥부터 τ-App, τ-Fun, τ-Add, τ-Id, τ-Num, 그리고 인자 `41`에 대한 τ-Num입니다. `.id rfl`의 `rfl`은 τ-Id의 전제 `lookup [("x", .num)] "x" = some .num`을 계산으로 증명합니다.
- **역전은 `cases`입니다.** 가정 `h : HasType Γ (.add l r) T`가 있으면, 결론이 `.add l r` 모양인 규칙은 τ-Add뿐이므로 `cases h`로 전제 두 개를 꺼낼 수 있습니다. 이렇게 가정의 마지막 규칙으로 경우를 나누는 것을 역전(inversion)이라고 합니다.
- **규칙에 대한 귀납법은 `induction h`입니다.** 이 장에서는 타입 검사기의 완전성 증명에서 씁니다.

## 값의 타입과 환경의 타입

정리의 결론 "결과가 타입 \\(T\\)의 값이다"를 말하려면 **값**의 타입이 필요합니다. 2부의 타입 규칙은 식의 타입만 정의하므로, <a id="g-value-typing"></a>값의 타입(value typing)은 증명을 위해 새로 정의해야 합니다.

### 값의 타입 `VT`

수는 \\(\texttt{num}\\) 타입입니다. 클로저는 조금 생각해야 합니다. 클로저 \\(\langle \lambda x.e, \sigma \rangle\\)가 \\(\tau_1 \to \tau_2\\) 타입이라는 것은 무슨 뜻일까요? 함수가 만들어질 때 몸통 \\(e\\)는 **어떤** 타입 환경 \\(\Gamma\\)에서 \\(\Gamma[x : \tau_1] \vdash e : \tau_2\\)로 타입 검사를 통과했고, 그때의 값 환경 \\(\sigma\\)는 \\(\Gamma\\)의 약속을 지킵니다. 이 사실을 클로저 값에 기록해 두면 됩니다. 수식으로 쓰면 다음 두 규칙입니다. (2부의 표기를 따라 값 환경을 \\(\sigma\\)로 씁니다. Lean 코드에서는 `ρ`입니다.)

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{VT-Num}$}
\UnaryInfC{$\vdash n : \texttt{num}$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\sigma \models \Gamma$}
\AxiomC{$\Gamma[x : \tau_1] \vdash e : \tau_2$}
\LeftLabel{$\texttt{VT-Clo}$}
\BinaryInfC{$\vdash \langle \lambda x.e, \sigma \rangle : \tau_1 \to \tau_2$}
\end{prooftree}
\\]

여기서 \\(\sigma \models \Gamma\\)는 "값 환경 \\(\sigma\\)가 타입 환경 \\(\Gamma\\)를 구현한다", 즉 \\(\Gamma\\)의 모든 변수 \\(x\\)가 \\(\sigma\\)에 있고 \\(\vdash \sigma(x) : \Gamma(x)\\)라는 뜻입니다. \\(\Gamma\\)는 결론에 나오지 않으므로 "그런 \\(\Gamma\\)가 있다"는 존재 양화입니다. Lean으로는 다음과 같습니다.

```lean
inductive VT : Value → Ty → Prop
  | num {n} : VT (.num n) .num
  | clo {Γ : TEnv} {ρ : Env} {x b T1 T2}
      (hdom : ∀ y U, lookup Γ y = some U → (lookup ρ y).isSome)
      (hval : ∀ y U v, lookup Γ y = some U → lookup ρ y = some v → VT v U)
      (hb : HasType ((x, T1) :: Γ) b T2) :
      VT (.clo x b ρ) (.arrow T1 T2)
```

`hb`가 둘째 전제이고, 첫째 전제 \\(\sigma \models \Gamma\\)는 `hdom`과 `hval` 두 조건으로 나뉘어 있습니다. `hdom`은 "\\(\Gamma\\)에 있는 변수는 \\(\sigma\\)에도 있다", `hval`은 "그 변수를 \\(\sigma\\)에서 찾은 값은 \\(\Gamma\\)가 말하는 타입이다"입니다. `(lookup ρ y).isSome`은 `lookup` 결과가 `some _`이면 `true`인 `Bool` 값인데, 명제 자리에 왔으므로 `= true`가 붙어 읽힙니다.

### 환경의 타입 `EnvT`

<a id="g-environment-typing"></a>환경의 타입(environment typing) \\(\sigma \models \Gamma\\)를 한 번에 쓰면 다음과 같습니다.

```lean
def EnvT (ρ : Env) (Γ : TEnv) : Prop :=
  ∀ y U, lookup Γ y = some U → ∃ v, lookup ρ y = some v ∧ VT v U
```

"\\(\Gamma\\)에 `y : U`가 있으면, \\(\sigma\\)에서 `y`를 찾을 수 있고 그 값의 타입이 `U`이다." 이것은 귀납적으로 정의할 필요가 없으므로 `Prop`을 내는 보통의 `def`입니다.

> **자주 하는 실수.** 그렇다면 `VT.clo`의 전제에 그냥 `EnvT ρ Γ`를 쓰면 되지 않을까요? 그렇게 쓰면 Lean이 정의를 거부합니다. `EnvT`를 펼치면 정의 중인 `VT`가 `∃`와 `∧` 안에 들어가는데, `∃`(`Exists`)와 `∧`(`And`)는 그 자체가 귀납 타입이라서 정의 중인 타입이 다른 귀납 타입의 인자로 들어가는 <a id="g-nested-inductive"></a>중첩 귀납(nested inductive)이 됩니다. Lean 커널은 인자에 지역 변수(여기서는 `v`)가 들어간 이런 중첩을 받아 주지 않습니다. 정의 중인 타입은 화살표의 오른쪽 끝, 곧 <a id="g-strictly-positive-position"></a>엄격하게 양의 위치(strictly positive position)에 직접 나와야 합니다. 그래서 `∃`와 `∧` 없이 같은 내용을 `hdom`과 `hval` 두 전제로 풀어 썼습니다. `Value` 안의 `List (String × Value)`도 중첩이지만 지역 변수가 없어서 괜찮습니다.

풀어 쓴 꼴과 `EnvT`가 같다는 것은 <a id="g-lemma"></a>보조정리(lemma) 두 개로 오갑니다. τ-Fun에서 클로저를 만들 때는 `EnvT`를 두 조건으로 나누고(`envT_split`), τ-App에서 클로저를 부를 때는 두 조건에서 `EnvT`를 다시 만듭니다(`envT_of_split`).

```lean
theorem envT_split {ρ : Env} {Γ : TEnv} (h : EnvT ρ Γ) :
    (∀ y U, lookup Γ y = some U → (lookup ρ y).isSome) ∧
    (∀ y U v, lookup Γ y = some U → lookup ρ y = some v → VT v U) := by
  ...

theorem envT_of_split {ρ : Env} {Γ : TEnv}
    (hdom : ∀ y U, lookup Γ y = some U → (lookup ρ y).isSome)
    (hval : ∀ y U v, lookup Γ y = some U → lookup ρ y = some v → VT v U) :
    EnvT ρ Γ := by
  ...
```

증명은 짧으니 프로젝트 파일에서 읽어 보세요. 환경에 대한 보조정리가 두 개 더 있습니다. 빈 환경은 빈 타입 환경을 구현한다는 `envT_nil : EnvT [] []`와, 환경을 넓혀도 \\(\models\\)가 유지된다는 `envT_cons`입니다. `envT_cons`는 증명 전체를 보겠습니다. 4부의 증명에서 아주 자주 보는 모양이기 때문입니다.

```lean
theorem envT_cons {ρ : Env} {Γ : TEnv} {x : String} {v : Value} {T : Ty}
    (h : EnvT ρ Γ) (hv : VT v T) : EnvT ((x, v) :: ρ) ((x, T) :: Γ) := by
  intro y U hy
  by_cases hxy : x = y
  · subst hxy
    rw [lookup_cons_self] at hy
    cases hy
    exact ⟨v, lookup_cons_self _ _ _, hv⟩
  · rw [lookup_cons_ne hxy] at hy ⊢
    exact h y U hy
```

`EnvT`가 `∀ y U, ... → ...`이므로 `intro`로 `y`, `U`, `hy : lookup ((x, T) :: Γ) y = some U`를 꺼냅니다. 그리고 `by_cases`로 찾는 이름 `y`가 방금 넣은 `x`인지 나눕니다.

- 같으면 `subst`로 `y`를 `x`로 바꾸고, `lookup_cons_self`로 `hy`를 `some T = some U`로 만든 뒤 `cases hy`로 `U`를 `T`로 바꿉니다. 그러면 답은 값 `v`와 그 증거들입니다. 꺾쇠 괄호 `⟨v, _, _⟩`는 `∃`와 `∧`의 증명을 한꺼번에 만듭니다.
- 다르면 `lookup_cons_ne`로 가정과 목표(`⊢`) 양쪽에서 맨 앞 바인딩을 지웁니다. 그러면 원래 가정 `h`가 그대로 답입니다.

## 결과 분류 `Sound`와 bind 보조정리

[기계로 확인하는 증명](./lean-intro.md#연료와-결과의-세-갈래)에서 본 <a id="g-result-classification"></a>결과 분류(result classification) `Sound`의 정의는 다음과 같습니다.

```lean
def Sound {α} (r : Res α) (P : α → Prop) : Prop :=
  match r with
  | none => True
  | some (.error _) => False
  | some (.ok a) => P a
```

연료가 떨어지면 아무것도 주장하지 않고(`True`), 오류는 불가능하며(`False`), 값이면 성질 `P`를 만족합니다. 주정리에서 `P`는 `fun v => VT v T`입니다. \\(\mathsf{TFAE}\\)의 실행 중 오류는 모두 타입 오류이므로 오류 칸이 `False`입니다. 다른 언어에서는 이 칸 하나만 바뀝니다.

`eval`의 거의 모든 경우가 `bindR`로 이어져 있으므로, 가장 많이 쓰는 보조정리는 `bindR`에 대한 것입니다.

```lean
theorem Sound.bind {α β : Type} {r : Res α} {k : α → Res β} {P : α → Prop} {Q : β → Prop}
    (h : Sound r P) (hk : ∀ a, P a → Sound (k a) Q) : Sound (bindR r k) Q := by
  cases r with
  | none => trivial
  | some x =>
    cases x with
    | error e => exact False.elim h
    | ok a => exact hk a h
```

"앞 계산 `r`이 `P`에 대해 안전하고, `P`를 만족하는 값이면 무엇이든 뒤 계산 `k a`가 `Q`에 대해 안전하다면, 이어 붙인 계산도 `Q`에 대해 안전하다." 증명은 `r`의 세 갈래로 나눕니다. 연료 부족이면 결과도 `none`이라 자명하고(`trivial`), 오류이면 `h`가 정의상 `False`라서 모순이며(`False.elim`), 값 `a`이면 `bindR`이 `k a`로 계산되므로 `hk a h`가 바로 답입니다. 마지막 줄에서 목표 `Sound (bindR (some (.ok a)) k) Q`와 `Sound (k a) Q`가 계산하면 같으므로 Lean이 둘을 같은 것으로 받아 준다는 점에 주목하세요.

연산 하나에 대한 보조정리도 있습니다. 두 피연산자가 \\(\texttt{num}\\) 타입 값이면 `numBOp`는 오류 없이 수를 냅니다.

```lean
theorem sound_numBOp {op : Int → Int → Int} {a b : Value}
    (ha : VT a .num) (hb : VT b .num) :
    Sound (numBOp op a b) (fun v => VT v .num) := by
  cases ha
  cases hb
  exact VT.num
```

`cases ha`가 핵심입니다. `VT a .num`의 마지막 규칙이 될 수 있는 것은 `VT.num`뿐입니다(`VT.clo`의 결론은 화살표 타입이니까요). 그래서 `cases`를 하면 `a`가 `.num _` 꼴로 바뀝니다. "타입이 이러하면 값의 모양은 이러하다"는 이런 사실을 <a id="g-canonical-forms"></a>정준 형태(canonical forms)라고 부르는데, Lean에서는 `cases` 한 번으로 얻습니다. 두 값이 수라는 것을 알면 `numBOp`이 `ret (.num _)`으로 계산되어 `VT.num`으로 끝납니다.

## 일반화된 정리와 연료에 대한 귀납법

### 열린 식으로 일반화

주정리는 빈 환경에서의 닫힌 식에 대한 것이지만, 이대로는 귀납법이 돌아가지 않습니다. `val x = i; b`의 몸통 `b`나 함수 몸통은 자유 변수가 있는 <a id="g-open-expression"></a>열린 식(open expression)이기 때문입니다. 그래서 먼저 임의의 환경에 대한 정리를 증명합니다.

\\[
\sigma \models \Gamma \ \text{이고} \ \Gamma \vdash e : \tau \ \text{이면, 모든 연료} \ n \ \text{에 대해} \ \texttt{eval}\ n\ \sigma\ e \ \text{는} \ \tau \ \text{에 대해 Sound}
\\]

```lean
theorem eval_sound (n : Nat) {Γ : TEnv} {ρ : Env} {e : Expr} {T : Ty}
    (hρ : EnvT ρ Γ) (ht : HasType Γ e T) : Sound (eval n ρ e) (fun v => VT v T)
```

### 무엇에 대한 귀납법인가

자연스러운 첫 시도는 타입 유도 `ht`에 대한 귀납법입니다. τ-Add나 τ-Val은 잘 됩니다. 그런데 τ-App에서 막힙니다. `f(a)`를 실행하면 클로저의 몸통을 실행하는데, 몸통의 타입 유도는 `ht`의 일부가 아닙니다. 그것은 함수 값의 `VT.clo` 안에 들어 있던 `hb`이고, `ht`보다 작다는 보장이 없으므로 귀납 가정을 쓸 수 없습니다. 식 `e`에 대한 귀납법도 같은 이유로 막힙니다. 몸통은 `f(a)`의 부분식이 아니니까요. Lean이 연료 없는 `eval`을 거부한 것과 정확히 같은 이유입니다.

해결책도 같습니다. **연료에 대한 귀납법**을 씁니다. `eval (n+1)`의 모든 재귀 호출은 `eval n`이므로, 귀납 가정을 "연료 `n`으로는 **모든** 환경, 식, 타입에서 안전하다"로 세우면 클로저의 몸통에도 쓸 수 있습니다.

<div style="text-align:center">
<svg viewBox="0 0 640 250" width="100%" style="max-width: 640px" role="img" aria-label="eval (n+1) ρ (f(a))는 연료 n으로 세 번 재귀한다. 함수와 인자는 부분식이지만 몸통 b는 부분식이 아니고, 그 타입 유도는 VT.clo에서 꺼낸다. 세 호출 모두 연료가 n이므로 귀납 가정 ih를 쓸 수 있다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14" fill="currentColor">
<defs><marker id="lean-fuel-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect x="210" y="14" width="220" height="40" rx="4" fill="#2a408e"/>
<text x="320" y="39" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" fill="#fff">eval (n+1) ρ (f(a))</text>
<g fill="none" stroke="currentColor" stroke-width="1.6">
<polyline points="260,54 110,104" marker-end="url(#lean-fuel-1)"/>
<polyline points="320,54 320,104" marker-end="url(#lean-fuel-1)"/>
<polyline points="380,54 530,104" marker-end="url(#lean-fuel-1)"/>
</g>
<g font-family="ui-monospace, Menlo, monospace" text-anchor="middle">
<rect x="20" y="106" width="180" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="110" y="131">eval n ρ f</text>
<rect x="230" y="106" width="180" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="320" y="131">eval n ρ a</text>
<rect x="430" y="106" width="206" height="40" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="533" y="131" font-size="13">eval n ((p,v)::fenv) b</text>
</g>
<g text-anchor="middle" font-size="13">
<text x="110" y="170">부분식 f</text>
<text x="110" y="188">유도: ht의 전제 hf</text>
<text x="320" y="170">부분식 a</text>
<text x="320" y="188">유도: ht의 전제 ha</text>
<text x="535" y="170">부분식이 아닌 몸통 b</text>
<text x="535" y="188">유도: f의 값의 VT.clo 안 hb</text>
</g>
<line x1="20" y1="208" x2="630" y2="208" stroke="currentColor" stroke-width="1" stroke-dasharray="4 3" opacity="0.6"/>
<text x="320" y="234" text-anchor="middle" font-size="14">세 호출 모두 연료가 n이므로 귀납 가정 ih를 쓸 수 있다</text>
</svg>
</div>
<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: τ-App 경우에서 연료에 대한 귀납법이 필요한 이유</p>

증명은 다음처럼 시작합니다.

```lean
  induction n generalizing Γ ρ e T with
  | zero =>
    simp only [eval]
    trivial
  | succ n ih =>
    cases ht with
    ...
```

연료가 0이면 `eval 0 ρ e = none`이고 `Sound none _`는 `True`이므로, 정의를 펼치고(`simp only [eval]`) `trivial`로 끝납니다. `succ` 경우의 귀납 가정 `ih`는 Infoview에서 다음처럼 보입니다.

```lean
ih : ∀ {Γ ρ e T}, EnvT ρ Γ → HasType Γ e T → Sound (eval n ρ e) (fun v => VT v T)
```

`generalizing Γ ρ e T`가 이 `∀`를 만들어 줍니다. 이것을 빼면 `ih`는 처음에 주어진 `Γ ρ e T` 하나에 대해서만 성립해서, 다른 환경에서 다른 식(몸통)을 실행하는 τ-App이나 τ-Val에서 쓸 수 없습니다. 그다음 `cases ht`로 마지막 타입 규칙에 따라 경우를 나눕니다. 각 경우에서 `e`와 `T`가 그 규칙의 모양으로 바뀌고 전제들에 이름이 붙습니다.

### 각 경우

산술부터 봅시다.

```lean
    | num =>
      -- τ-Num
      exact VT.num
    | add h1 h2 | mul h1 h2 =>
      -- τ-Add / τ-Mul
      simp only [eval]
      exact Sound.bind (ih hρ h1) fun a ha =>
            Sound.bind (ih hρ h2) fun b hb =>
            sound_numBOp ha hb
```

τ-Num에서는 `eval`이 `ret (.num k)`를 내므로 목표가 계산하면 `VT (.num k) .num`이고 `VT.num`으로 끝납니다. τ-Add와 τ-Mul은 증명이 같아서 한 줄에 묶었습니다. `simp only [eval]`로 `eval (n+1) ρ (.add l r)`을 한 단계 펼치면 목표는 `Sound (bindR (eval n ρ l) fun a => ...) _`가 됩니다. 그러면 증명은 `eval`의 모양을 그대로 따라갑니다. 왼쪽 계산은 귀납 가정으로 안전하고(`ih hρ h1`), 그 값 `a`가 \\(\texttt{num}\\) 타입이라는 `ha`를 받아, 오른쪽 계산도 귀납 가정으로 안전하고, 마지막 `numBOp`는 `sound_numBOp`으로 안전합니다. **계산의 구조와 증명의 구조가 일대일로 맞는다**는 것이 이 방식의 가장 큰 장점입니다.

```lean
    | val h1 h2 =>
      -- τ-Val
      simp only [eval]
      exact Sound.bind (ih hρ h1) fun v hv =>
            ih (envT_cons hρ hv) h2
    | id hx =>
      -- τ-Id: `ρ ⊨ Γ` rules out `free identifier`.
      obtain ⟨v, hv, hvT⟩ := hρ _ _ hx
      simp only [eval, hv]
      exact hvT
    | fn hb =>
      -- τ-Fun
      exact VT.clo (envT_split hρ).1 (envT_split hρ).2 hb
```

- τ-Val: 초기값의 값 `v`를 `x`로 환경에 넣고 몸통을 계산하므로, 넓힌 환경이 넓힌 타입 환경을 구현한다는 `envT_cons`가 필요합니다. 몸통은 다른 환경에서 실행되지만 귀납 가정이 모든 환경에 대해 성립하므로 문제없습니다.
- τ-Id: \\(\Gamma(x) = T\\)이므로 \\(\sigma \models \Gamma\\)에서 \\(\sigma(x) = v\\)와 \\(\vdash v : T\\)를 꺼냅니다(`obtain`). 변수가 반드시 환경에 있으므로 `free identifier` 오류가 날 수 없습니다. `simp only [eval, hv]`는 `eval`을 펼치고 `lookup ρ x`를 `some v`로 바꾸어 결과를 `ret v`로 만듭니다.
- τ-Fun: 계산 결과는 곧바로 클로저 \\(\langle \lambda p.b, \sigma \rangle\\)입니다. `VT.clo`의 \\(\Gamma\\)로 지금의 \\(\Gamma\\)를 쓰면, 필요한 조건은 \\(\sigma \models \Gamma\\)(두 조건으로 나눈 것)와 τ-Fun의 전제 `hb`뿐입니다. 클로저를 만드는 순간에 몸통의 타입 유도를 값 안에 넣어 두는 것입니다.

마지막으로 핵심인 τ-App입니다.

```lean
    | app hf ha =>
      -- τ-App: a value of arrow type is a closure, so `not a function` cannot occur.
      simp only [eval]
      refine Sound.bind (ih hρ hf) fun fv hfv => ?_
      cases hfv with
      | clo hdom hval hb =>
        -- The body is not a subterm, but it runs with fuel `n`, so `ih` applies.
        exact Sound.bind (ih hρ ha) fun v hv =>
              ih (envT_cons (envT_of_split hdom hval) hv) hb
```

1. 함수 자리를 계산합니다. 귀납 가정에 의해 그 값 `fv`는 \\(\tau_1 \to \tau_2\\) 타입입니다(`hfv`). `refine ... ?_`는 나머지를 새 목표로 남깁니다.
2. `cases hfv`: 정준 형태입니다. 화살표 타입의 값은 클로저뿐이므로 `VT.num` 경우는 Lean이 알아서 지웁니다. 그래서 `not a function` 오류가 나지 않습니다. 클로저의 `VT`에서 그 환경에 대한 조건 `hdom`, `hval`과 몸통의 타입 유도 `hb`를 꺼냅니다.
3. 인자를 계산합니다. 귀납 가정으로 그 값 `v`는 \\(\tau_1\\) 타입입니다(`hv`).
4. 클로저의 환경에 `p ↦ v`를 더해 몸통을 계산합니다. `envT_of_split`과 `envT_cons`로 넓힌 환경이 넓힌 타입 환경을 구현함을 보이고, 몸통에 귀납 가정을 씁니다. 몸통은 `f(a)`의 부분식이 아니지만, 연료가 `n`이므로 문제없습니다.

이것으로 `eval_sound`가 끝났습니다. 경우마다 `eval`을 한 단계 펼치고, `Sound.bind`로 `bindR` 사슬을 따라가며, 값을 받은 뒤에는 `cases`로 정준 형태를 얻는 것이 4부 전체에 걸쳐 반복되는 모양입니다.

> **생각해 보기.** τ-Fun 경우에서 `VT.clo`에 넣은 \\(\Gamma\\)는 함수가 **정의된 곳**의 타입 환경이고, τ-App 경우에서 꺼낸 \\(\Gamma\\)(코드에서는 이름 없이 숨어 있음)는 호출하는 곳의 \\(\Gamma\\)와 다를 수 있습니다. 그래도 증명이 되는 이유는 몸통을 클로저의 환경 `fenv`에서 실행하기 때문입니다. 정적 스코프가 타입 안전성에 어떻게 기여하는지 연습 문제에서 확인해 보세요.

## 주정리와 따름정리

주정리는 빈 환경을 넣기만 하면 됩니다.

```lean
theorem type_soundness {e : Expr} {T : Ty} (h : HasType [] e T) (n : Nat) :
    Sound (eval n [] e) (fun v => VT v T) :=
  eval_sound n envT_nil h
```

`by` 없이 `:=` 뒤에 증명 항을 바로 썼습니다. 따름정리 `no_type_error`는 `Sound`의 오류 칸이 `False`라는 데서 나옵니다.

```lean
theorem no_type_error {e : Expr} {T : Ty} (h : HasType [] e T) (n : Nat) (err : Err) :
    eval n [] e ≠ some (.error err) := by
  intro he
  have hs := type_soundness h n
  rw [he] at hs
  exact hs
```

`a ≠ b`는 `a = b → False`이므로, `intro he`로 결과가 오류라고 가정하고 모순을 이끌어 냅니다. 주정리 `hs`의 `eval n [] e`를 `he`로 다시 쓰면 `hs : Sound (some (.error err)) _`가 되는데, 이것은 정의상 `False`입니다.

같은 파일에는 `Sound`를 풀어 쓴 `type_soundness_explicit`도 있습니다. "결과가 `none`이거나, 어떤 `v`가 있어 결과가 `some (.ok v)`이고 `VT v T`"라는 꼴이라 `Sound`의 정의를 몰라도 읽을 수 있습니다.

```lean
theorem type_soundness_explicit {e : Expr} {T : Ty} (h : HasType [] e T) (n : Nat) :
    eval n [] e = none ∨ ∃ v, eval n [] e = some (.ok v) ∧ VT v T := by
  ...
```

## 타입 검사기와 타입 규칙은 같다

주정리는 타입 **규칙** `HasType`에 대한 것입니다. 그런데 2부에서 과제로 구현한 것은 타입 **검사기** `typeCheck`였습니다. 둘이 같은 프로그램을 받아들일까요? `TypeCheck.lean`은 Scala의 `typeCheck`를 Lean 함수로 옮기고, 이것을 증명합니다.

```lean
def mustSame (T U : Ty) : Option Unit := if T = U then some () else none

def typeCheck (Γ : TEnv) : Expr → Option Ty
  | .num _ => some .num
  | .add l r => do mustSame (← typeCheck Γ l) .num; mustSame (← typeCheck Γ r) .num; pure .num
  | .mul l r => do mustSame (← typeCheck Γ l) .num; mustSame (← typeCheck Γ r) .num; pure .num
  | .val x i b => do let T1 ← typeCheck Γ i; typeCheck ((x, T1) :: Γ) b
  | .id x => lookup Γ x
  | .fn p T b => do let R ← typeCheck ((p, T) :: Γ) b; pure (.arrow T R)
  | .app f a => do
    match ← typeCheck Γ f with
    | .arrow T1 T2 => mustSame (← typeCheck Γ a) T1; pure T2
    | .num => none
```

Scala에서 타입 오류를 던지는 자리가 `none`이 됩니다. `do` 블록 안의 `← t`는 "`t`가 `none`이면 즉시 전체가 `none`, `some a`이면 `a`를 꺼내 계속"이라는 뜻으로, Scala에서 `error(...)`가 예외로 전파되는 것과 같습니다. [타입 있는 언어](./typed-languages.md)의 Scala 코드와 한 줄씩 비교해 보세요. 그리고 다음 정리를 증명합니다.

```lean
theorem typeCheck_iff {Γ : TEnv} {e : Expr} {T : Ty} :
    typeCheck Γ e = some T ↔ HasType Γ e T :=
  ⟨typeCheck_correct, typeCheck_complete⟩
```

`↔`의 두 방향을 따로 증명해 꺾쇠 괄호로 묶었습니다.

- **옳음** `typeCheck_correct` (`→`): 타입 검사기가 `T`를 내면 규칙으로도 \\(\Gamma \vdash e : T\\)입니다. 식 `e`에 대한 귀납법으로 증명합니다. `do` 블록은 `Option.bind`로 풀리므로, `Option.bind_eq_some_iff`(`o.bind f = some b ↔ ∃ a, o = some a ∧ f a = some b`)로 가정을 "각 하위 검사가 무엇을 냈는가"로 바꾸고, `mustSame`이 통과했으면 두 타입이 같다는 `mustSame_eq`를 쓴 다음, 귀납 가정과 해당 규칙을 적용합니다.
- **완전함** `typeCheck_complete` (`←`): 규칙으로 \\(\Gamma \vdash e : T\\)이면 타입 검사기도 `T`를 냅니다. 이번에는 타입 유도에 대한 귀납법(`induction h`)입니다. 각 경우에 하위 식의 검사 결과(귀납 가정)를 넣고 `simp`로 `do` 블록을 계산합니다. `mustSame T T`는 `if T = T`라서 `some ()`이 됩니다.

완전함 쪽의 증명은 짧으니 전체를 보겠습니다.

```lean
theorem typeCheck_complete {Γ : TEnv} {e : Expr} {T : Ty} (h : HasType Γ e T) :
    typeCheck Γ e = some T := by
  induction h with
  | num => rfl
  | add _ _ ih1 ih2 | mul _ _ ih1 ih2 => simp [typeCheck, ih1, ih2, mustSame]
  | val _ _ ih1 ih2 => simp [typeCheck, ih1, ih2]
  | id hx => exact hx
  | fn _ ih => simp [typeCheck, ih]
  | app _ _ ih1 ih2 => simp [typeCheck, ih1, ih2, mustSame]
```

옳음 방향만 있어도 "Scala 타입 검사기를 통과하면 안전하다"를 말할 수 있습니다.

```lean
theorem typeCheck_soundness {e : Expr} {T : Ty} (h : typeCheck [] e = some T) (n : Nat) :
    Sound (eval n [] e) (fun v => VT v T) :=
  type_soundness (typeCheck_iff.mp h) n
```

완전함 방향은 타입 검사기가 규칙보다 엄격하지도 않다는 것, 즉 둘이 **정확히 같은** 프로그램을 받아들인다는 것을 보장합니다. 이 정리 덕분에 "규칙에 대한 타입 안전성"이 여러분이 구현한 바로 그 타입 검사기에 대한 정리가 됩니다. [기계로 확인하는 증명](./lean-intro.md)에서 말한 충실성(faithfulness)을 증명으로 확인하는 한 가지 방법입니다.

## `#print axioms`로 마무리

증명이 정말 끝났는지는 어떻게 확인할까요? 빌드가 성공하는 것만으로는 부족합니다. 어딘가에 `sorry`가 남아 있어도 경고만 뜨고 빌드는 성공하기 때문입니다. 그래서 `Soundness.lean`의 끝에는 다음 명령들이 있습니다.

```lean
#print axioms TFAE.type_soundness
#print axioms TFAE.type_soundness_explicit
#print axioms TFAE.no_type_error
#print axioms TFAE.typeCheck_soundness
```

`#print axioms thm`은 정리 `thm`이 직접 또는 간접으로 기대는 공리(axiom)를 모두 보여 줍니다. `lake build`를 하면 다음이 출력됩니다.

```text
info: TFAE/TypeCheck.lean:81:0: 'TFAE.typeCheck_iff' depends on axioms: [propext, Quot.sound]
info: TFAE/Soundness.lean:90:0: 'TFAE.type_soundness' depends on axioms: [propext]
info: TFAE/Soundness.lean:91:0: 'TFAE.type_soundness_explicit' depends on axioms: [propext]
info: TFAE/Soundness.lean:92:0: 'TFAE.no_type_error' depends on axioms: [propext]
info: TFAE/Soundness.lean:93:0: 'TFAE.typeCheck_soundness' depends on axioms: [propext, Quot.sound]
```

증명 어딘가에 `sorry`가 있다면 이 목록에 `sorryAx`가 나타납니다. 여기 보이는 `propext`(명제 외연성)와 `Quot.sound`는 Lean 표준 라이브러리 자체가 쓰는 표준 공리로, `simp` 같은 전술을 쓰면 자연스럽게 들어옵니다. 새로 선언한 공리는 하나도 없습니다. 4부의 모든 프로젝트는 이렇게 주정리마다 `#print axioms`를 실행해 `sorryAx`가 없고 표준 공리만 있는지 확인합니다.

## 정리

- \\(\mathsf{TFAE}\\)의 타입 안전성은 "타입이 맞는 닫힌 식은 어떤 연료로 실행해도 연료 부족이거나 그 타입의 값"(`type_soundness`)이고, 따름정리로 어떤 실행 중 오류도 나지 않습니다(`no_type_error`).
- 환경은 **연관 리스트**입니다. 새 바인딩은 앞에 붙이고 `lookup`은 앞에서부터 찾으므로 Scala `Map`처럼 나중 바인딩이 이깁니다. 클로저가 환경을 값으로 들고 다녀야 해서 함수가 아니라 리스트를 씁니다.
- 인터프리터 `eval`은 Scala의 `interp`를 한 줄씩 옮기되 **연료**를 받습니다. 함수 호출이 부분식이 아닌 몸통을 실행하므로 연료 없이는 Lean의 종료 검사를 통과하지 못합니다. 결과 `Res`는 `none`, 오류, 값의 세 갈래이고, `bindR`이 Scala의 예외 전파를 흉내 냅니다.
- 타입 규칙은 **귀납적 명제** `HasType`이고, 추론 규칙 하나가 생성자 하나입니다. 유도 트리는 증명 항, 역전은 `cases`입니다.
- 증명을 위해 **값의 타입** `VT`와 **환경의 타입** `EnvT`(\\(\sigma \models \Gamma\\))를 정의합니다. 클로저의 `VT`는 만들어질 때 몸통이 타입 검사되었다는 사실을 기록합니다. 중첩 귀납 제한 때문에 `VT.clo`의 \\(\sigma \models \Gamma\\)는 두 전제로 풀어 썼습니다.
- `Sound`의 오류 칸이 언어마다 허용된 오류를 정합니다. `Sound.bind`로 `bindR` 사슬을 따라가고, `cases`로 정준 형태를 얻습니다.
- 정리를 열린 식으로 일반화한 `eval_sound`를 **연료에 대한 귀납법**(`generalizing Γ ρ e T`)으로 증명합니다. 타입 유도나 식에 대한 귀납법은 τ-App에서 클로저 몸통 때문에 막히지만, 연료는 모든 재귀 호출에서 줄어듭니다.
- `typeCheck_iff`로 구현의 타입 검사기가 타입 규칙과 정확히 같은 프로그램을 받아들임을 증명했고, `#print axioms`로 `sorry`가 없음을 확인했습니다.

## 연습 문제

1. `eval_sound`의 증명에서 `generalizing Γ ρ e T`를 지우면 어느 경우가 깨지나요? 깨지는 경우마다, 귀납 가정을 어떤 환경과 식에 대해 쓰고 싶었는지 적어 보세요.

2. `eval`의 `.app` 경우에서 몸통을 클로저의 환경 `fenv` 대신 호출한 쪽의 환경 `ρ`에서 계산하도록(동적 스코프) 바꾸면, `eval_sound`의 어느 단계가 깨지나요? 깨지는 이유를 `VT.clo` 안의 \\(\Gamma\\)와 연결해 설명하고, 동적 스코프에서 타입 검사를 통과하지만 `free identifier` 오류가 나는 \\(\mathsf{TFAE}\\) 프로그램을 하나 만들어 보세요.

3. 뺄셈 `.sub l r`을 `Expr`, `eval`, `HasType`, `typeCheck`에 더하고 모든 증명을 고쳐 보세요. `Sound.bind`와 `sound_numBOp` 덕분에 `eval_sound`에서 고칠 곳이 얼마나 적은지 확인해 보세요. (힌트: `| add h1 h2 | mul h1 h2 =>` 줄에 경우 하나를 더 묶을 수 있습니다.)

4. τ-App 규칙을 일부러 틀리게 바꿔 봅시다. 인자의 타입을 검사하지 않는 규칙 `HasType Γ f (.arrow T1 T2) → HasType Γ (.app f a) T2`로 바꾸면 증명의 어디가 깨지나요? 이 규칙으로 타입 검사를 통과하지만 실행 중 오류가 나는 프로그램을 만들고, `rfl`로 실행 결과가 오류임을 확인해 보세요.

5. 다음 보조정리를 증명해 보세요. 타입 환경에서 같은 이름이 가려지는 경우에도 \\(\models\\)가 유지된다는 뜻입니다.

   ```lean
   theorem envT_shadow {ρ : Env} {Γ : TEnv} {x : String} {v : Value} {T U : Ty}
       (h : EnvT ρ ((x, U) :: Γ)) (hv : VT v T) :
       EnvT ((x, v) :: ρ) ((x, T) :: (x, U) :: Γ)
   ```

   (힌트: `envT_cons`를 그대로 쓸 수 있는지 먼저 생각해 보세요.)

6. `typeCheck_correct`의 증명을 프로젝트 파일에서 읽고, `.app` 경우에서 `cases F with | num => ... | arrow T1 T2 => ...`가 Scala `typeCheck`의 어느 부분에 대응하는지 설명해 보세요.
