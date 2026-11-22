# 두 가지 서브타입 관계

이 장에서는 [서브타입 다형성](./subtype-polymorphism.md)에서 만든 \\(\mathsf{STFAE}\\)의 타입 안전성(type soundness)을 Lean으로 증명합니다. 증명의 뼈대는 [연료와 결과 분류](./lean-fuel.md)에서 본 것과 같습니다. 연료를 받는 인터프리터 `eval`, 타입 규칙을 옮긴 귀납적 관계 `HasType`, 값의 타입 `VT`와 환경 일치 `EnvT`, 결과를 분류하는 `Sound`, 그리고 연료에 대한 귀납법입니다. `exit`처럼 일부러 내는 오류를 허용하는 방법도 [허용된 오류와 재귀](./lean-errors.md)에서 이미 보았습니다.

그런데 서브타입이 들어오는 순간 새로 결정해야 할 것이 생깁니다. 강의에서는 서브타입 관계를 반사성과 추이성을 포함한 여러 규칙으로 정의했지만, 실제 타입 검사기의 `isSubType`에는 추이성 규칙이 없습니다. 둘 중 무엇을 Lean으로 옮겨야 할까요? 그리고 "값의 타입이 \\(T\\)"라는 말은 이제 무엇을 뜻해야 할까요? 이 장의 답은 다음과 같습니다.

- 서브타입 관계를 **두 개** 정의합니다. 구현을 그대로 옮긴 <a id="g-algorithmic"></a>알고리즘적(algorithmic) 관계 `Sub`와 강의의 규칙을 그대로 옮긴 <a id="g-declarative"></a>선언적(declarative) 관계 `SubD`입니다.
- 증명은 다루기 쉬운 `Sub`로 하고, `SubD`로 유도한 것은 모두 `Sub`로도 유도된다는 정리를 따로 보여서 결론을 옮겨 옵니다.
- 값의 타입 `VT v T`는 "`v`의 타입이 \\(T\\)의 서브타입"이라는 뜻이 되도록, 서브타입을 각 생성자 안에 녹여 넣습니다.

## 지금까지의 방법으로는 무엇이 부족할까

[연료와 결과 분류](./lean-fuel.md)의 \\(\mathsf{TFAE}\\) 증명을 그대로 가져와 보면 두 군데에서 막힙니다.

첫째는 값의 타입입니다. \\(\mathsf{TFAE}\\)의 `VT v T`는 "`v`의 타입이 **정확히** \\(T\\)"였습니다. 그런데 다음 프로그램을 봅시다.

```stfae,run
/* STFAE */
val y: {a: Number} = {a=1, b=2}; y.a
```

\\(\tau\texttt{-Val}\_{\tau}\\) 규칙 덕분에 이 프로그램은 타입 검사를 통과하고, 타입 환경에는 `y : {a: Number}`가 들어갑니다. 하지만 실행할 때 `y`에 묶이는 값은 필드가 두 개인 레코드입니다. 환경 일치 `EnvT`가 성립하려면 이 값이 `{a: Number}` 타입을 가져야 하는데, 이 값의 "정확한" 타입은 `{a: Number, b: Number}`입니다. 그래서 `VT`의 뜻부터 바꿔야 합니다.

둘째는 서브타입 관계 자체입니다. 강의의 추이성 규칙

\\[
\begin{prooftree}
\AxiomC{$\tau <: \tau'$}
\AxiomC{$\tau' <: \tau^{\prime\prime}$}
\BinaryInfC{$\tau <: \tau^{\prime\prime}$}
\end{prooftree}
\\]

은 가운데 타입 \\(\tau'\\)이 결론에 나타나지 않습니다. 증명 중에 "\\(\mathtt{num} <: T\\)"라는 가정을 받았다고 합시다. 추이성 규칙이 없다면 이 유도의 마지막 규칙은 반사성이나 \\(\top\\) 규칙뿐이므로 \\(T\\)는 \\(\mathtt{num}\\)이나 \\(\top\\)입니다. 하지만 추이성 규칙이 있으면 \\(\mathtt{num} <: X <: T\\)의 \\(X\\)가 무엇이든 될 수 있어서, 가정에서 \\(T\\)의 모양을 바로 알아낼 수 없습니다. 이렇게 가정의 마지막 규칙을 경우 분석해서 정보를 얻는 것을 역전(inversion)이라고 하는데, 추이성 규칙은 역전을 거의 쓸모없게 만듭니다.

증명하려는 정리부터 보겠습니다. 모양은 \\(\mathsf{TFAE}\\)와 같고, 결과가 `exit` 오류인 경우를 허용한다는 점만 다릅니다.

```lean
def Sound {α} (r : Res α) (P : α → Prop) : Prop :=
  match r with
  | none => True
  | some (.error e) => e = .exit
  | some (.ok a) => P a
```

```lean
theorem type_soundness {e : Expr} {T : Ty} (h : HasType Sub [] e T) (n : Nat) :
    Sound (eval n [] e) (fun v => VT v T) :=
  sound n Covers.nil h
```

```lean
theorem no_type_error {e : Expr} {T : Ty} (h : HasType Sub [] e T) (n : Nat) (err : Err) :
    eval n [] e = some (.error err) → err = .exit := by
```

타입 검사를 통과한 닫힌 식은 어떤 연료로 계산해도 연료가 떨어지거나, `exit`로 끝나거나, 타입이 \\(T\\)의 서브타입인 값을 냅니다. `invalid operation`, `free identifier`, `not a function`, `not a record`, `no such field` 같은 오류는 일어나지 않습니다. `exit`는 프로그래머가 일부러 쓴 것이므로 [허용된 오류와 재귀](./lean-errors.md)의 0으로 나누기처럼 허용된 오류로 다룹니다. `HasType Sub`의 `Sub`가 바로 이 장의 주인공인 알고리즘적 서브타입 관계입니다.

## STFAE를 Lean으로

\\(\mathsf{STFAE}\\)의 타입은 \\(\mathsf{TFAE}\\)의 타입에 레코드 타입, \\(\bot\\), \\(\top\\)을 더한 것입니다.

```lean
inductive Ty where
  | num
  | arrow (pty rty : Ty)
  | record (fs : List (String × Ty))
  | bot
  | top
  deriving Inhabited
```

식에는 레코드 `record`, 필드 접근 `access`, `exit`가 더해지고, `val`에는 선택적인 타입 표기 `Option Ty`가 붙습니다. 값에는 레코드 값이 더해집니다. Scala 구현은 레코드 타입의 필드, 레코드 값의 필드, 환경을 모두 `Map`으로 나타내는데, Lean에서는 셋 다 환경과 같은 연관 리스트 `List (String × α)`로 쓰고 `lookup`으로 찾습니다(앞쪽 항목이 이깁니다).

조심할 곳은 레코드를 만들 때 쓰는 Scala의 `toMap`입니다. `toMap`은 같은 이름이 여러 번 나오면 **마지막** 쌍을 남깁니다. Lean에서는 이것을 `addAll [] pairs`로 씁니다.

```lean
def addAll {α : Type} (m : List (String × α)) (kvs : List (String × α)) : List (String × α) :=
  kvs.foldl (fun acc p => p :: acc) m
```

쌍을 왼쪽부터 하나씩 맨 앞에 붙이므로 결과는 뒤집힌 리스트이고, 뒤에 있던 쌍이 앞으로 와서 `lookup`에서 이깁니다. 그래서 `{a=1, b=2}`의 타입은 Lean에서 `[("b", num), ("a", num)]`처럼 순서가 뒤집혀 있습니다. 인터프리터와 타입 규칙 \\(\tau\texttt{-Record}\\)가 **둘 다** `addAll []`을 쓰므로, `{a=1, a=2}`처럼 이름이 겹쳐도 값과 타입에서 같은 필드가 골라집니다.

인터프리터에서 새로 생긴 경우는 레코드, 필드 접근, `exit`입니다.

```lean
    | .record fs => bindR (evalList (eval n ρ) (fs.map Prod.snd)) fun vs =>
      ret (.record (addAll [] ((fs.map Prod.fst).zip vs)))
    | .access r f => bindR (eval n ρ r) fun rv =>
      match rv with
      | .record vs => match lookup vs f with
        | some v => ret v
        | none => err .noField
      | _ => err .notRecord
    | .exit => err .exit
```

`evalList`는 필드 식을 왼쪽부터 차례로 계산하고 처음 난 오류를 그대로 돌려줍니다. 오류의 종류 `Err`에는 `exit`, `notNum`, `freeId`, `notFun`, `notRecord`, `noField`가 있고, 이 가운데 `exit`만 타입 오류가 아닙니다.

### Covers: 세 번 나오는 모양

\\(\mathsf{STFAE}\\) 증명에는 같은 모양의 조건이 세 번 나옵니다. "오른쪽 리스트의 \\(f \mapsto r\\)마다 왼쪽 리스트에도 \\(f \mapsto l\\)이 있고 \\(P\ l\ r\\)이다"라는 조건입니다. 레코드 서브타입(\\(P\\)가 서브타입 관계), 레코드 값의 타입(\\(P\\)가 `VT`), 환경 일치(\\(P\\)가 `VT`)가 모두 이 모양이어서, 여기에 `Covers`라는 이름을 붙입니다.

```lean
def Covers {α β : Type} (P : α → β → Prop) (ls : List (String × α)) (rs : List (String × β)) :
    Prop :=
  ∀ f r, lookup rs f = some r → ∃ l, lookup ls f = some l ∧ P l r
```

```lean
abbrev EnvT (ρ : Env) (Γ : TEnv) : Prop := Covers VT ρ Γ
```

오른쪽에 없는 이름이 왼쪽에 더 있어도 상관없다는 점이 레코드에서는 필드 추가 규칙에, 환경에서는 "쓰지 않는 변수가 더 있어도 된다"에 해당합니다.

## 알고리즘적 서브타입 관계 Sub

`Sub`는 구현의 `isSubType`을 그대로 옮긴 귀납적 관계입니다. 생성자 하나가 `isSubType`의 `case` 하나에 대응합니다.

```lean
inductive Sub : Ty → Ty → Prop
  | bot {T} : Sub .bot T
  | top {T} : Sub T .top
  | refl {T} : Sub T T
  | arrow {P1 R1 P2 R2} : Sub P2 P1 → Sub R1 R2 → Sub (.arrow P1 R1) (.arrow P2 R2)
  | record {ls rs : List (String × Ty)} :
      (∀ f r, lookup rs f = some r → (lookup ls f).isSome) →
      (∀ f r l, lookup rs f = some r → lookup ls f = some l → Sub l r) →
      Sub (.record ls) (.record rs)
```

`bot`, `top`, `refl`, `arrow`는 [서브타입 다형성](./subtype-polymorphism.md)의 규칙과 같습니다(`arrow`의 매개변수 쪽 전제 `Sub P2 P1`은 방향이 반대인 반변(contravariant)입니다). 새로운 것은 `record` 하나입니다. 강의의 레코드 규칙 세 개(필드 추가, 필드 타입, 필드 순서) 대신, 구현의 `isSubType`처럼 "오른쪽 레코드 타입의 모든 필드가 왼쪽에 있고, 그 타입이 서브타입"인지 한 번에 확인합니다.

\\[
\begin{prooftree}
\AxiomC{$\forall (x : \tau') \in \mathit{rs}. \quad \mathit{ls}(x) = \tau \text{ and } \tau <: \tau'$}
\LeftLabel{$\texttt{record}$}
\UnaryInfC{$\\{\mathit{ls}\\} <: \\{\mathit{rs}\\}$}
\end{prooftree}
\\]

왼쪽에 남는 필드가 있어도 되고(필드 추가), 필드마다 서브타입이면 되고(필드 타입), `lookup`으로만 비교하므로 순서는 상관없습니다(필드 순서). 세 규칙이 한 생성자에 들어 있는 셈입니다.

전제가 두 개로 나뉘어 있는 이유는 Lean의 제약 때문입니다. 위 규칙을 그대로 `Covers Sub ls rs`, 즉 `∃ l, lookup ls f = some l ∧ Sub l r` 꼴의 전제 하나로 쓰면, 정의하고 있는 `Sub`가 `∃` 안에 들어가서 Lean이 "invalid nested inductive datatype" 오류로 거부합니다. 그래서 "이름이 있다"와 "찾은 타입이 서브타입이다"를 따로 적고, 두 꼴 사이는 보조정리 `covers_of_split`과 `covers_split`으로 오갑니다. 증명에서는 `Covers` 꼴이 편하므로 그 꼴의 생성자도 하나 만들어 둡니다.

```lean
theorem Sub.ofCovers {ls rs : List (String × Ty)} (h : Covers Sub ls rs) :
    Sub (.record ls) (.record rs) :=
  .record (covers_split h).1 (covers_split h).2
```

무엇보다 중요한 점은 `Sub`에 **추이성 생성자가 없다**는 것입니다. `isSubType`에 없기 때문입니다. 덕분에 `Sub S T`가 가정으로 주어지면 `cases`로 나눌 경우가 몇 개뿐이고, 앞에서 말한 역전이 잘 됩니다.

```lean
theorem Sub.num_inv {T} (h : Sub .num T) : T = .num ∨ T = .top := by
  cases h <;> simp
```

```lean
theorem Sub.top_inv {T} (h : Sub .top T) : T = .top := by
  cases h <;> rfl
```

`Sub .num T`를 만들 수 있는 생성자는 `top`과 `refl`뿐이므로 `cases h` 한 번으로 끝납니다(`<;>`는 앞 전술이 만든 모든 목표에 뒤 전술을 적용합니다).

## 선언적 서브타입 관계 SubD

강의의 서브타입 규칙을 하나씩 그대로 옮긴 것이 `SubD`입니다.

```lean
inductive SubD : Ty → Ty → Prop
  | bot {T} : SubD .bot T
  | top {T} : SubD T .top
  | refl {T} : SubD T T
  | trans {T1 T2 T3} : SubD T1 T2 → SubD T2 T3 → SubD T1 T3
  | arrow {P1 R1 P2 R2} : SubD P2 P1 → SubD R1 R2 → SubD (.arrow P1 R1) (.arrow P2 R2)
  | width {fs : List (String × Ty)} {x T} :
      SubD (.record (fs ++ [(x, T)])) (.record fs)
  | depth {fs gs : List (String × Ty)} :
      fs.map Prod.fst = gs.map Prod.fst →
      (∀ a b, (a, b) ∈ fs.zip gs → SubD a.2 b.2) →
      SubD (.record fs) (.record gs)
  | perm {fs gs : List (String × Ty)} :
      (fs.map Prod.fst).Nodup → fs.Perm gs →
      SubD (.record fs) (.record gs)
```

레코드 규칙 세 개가 강의의 규칙과 어떻게 대응하는지 보겠습니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{width}$}
\UnaryInfC{$\\{x_1 : \tau_1, \ldots, x_n : \tau_n, x : \tau\\} <: \\{x_1 : \tau_1, \ldots, x_n : \tau_n\\}$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\tau_1 <: \tau_1' \quad \ldots \quad \tau_n <: \tau_n'$}
\LeftLabel{$\texttt{depth}$}
\UnaryInfC{$\\{x_1 : \tau_1, \ldots, x_n : \tau_n\\} <: \\{x_1 : \tau_1', \ldots, x_n : \tau_n'\\}$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\\{x_1 : \tau_1, \ldots, x_n : \tau_n\\}\enspace \text{is a permutation of}\enspace \\{x_1' : \tau_1', \ldots, x_n' : \tau_n'\\}$}
\LeftLabel{$\texttt{perm}$}
\UnaryInfC{$\\{x_1 : \tau_1, \ldots, x_n : \tau_n\\} <: \\{x_1' : \tau_1', \ldots, x_n' : \tau_n'\\}$}
\end{prooftree}
\\]

- `width`는 강의처럼 맨 뒤에 필드 하나를 더하는 규칙입니다. 필드를 여러 개 더하거나 가운데에 더하는 것은 `perm`, `trans`와 섞어서 만듭니다.
- `depth`는 두 리스트의 이름 목록이 같고(`fs.map Prod.fst = gs.map Prod.fst`), 같은 자리의 타입끼리 서브타입이라는 뜻입니다. `fs.zip gs`는 두 리스트를 자리별로 짝지은 리스트입니다.
- `perm`에는 강의 규칙에 없던 조건 `Nodup`(이름이 겹치지 않음)이 붙었습니다. 이름이 겹치는 레코드 타입의 순서를 바꾸면 `lookup`이 고르는 항목이 달라져서 규칙이 거짓이 됩니다(연습 문제 3). 파서가 같은 필드 이름이 두 번 나오는 레코드 타입을 거부하므로, 이 조건을 붙여도 강의의 규칙과 어긋나지 않습니다.

`Examples.lean`에는 `SubD`로 유도한 판단의 예가 있습니다. 순서를 바꾼 뒤(`perm`) 필드를 빼고(`width`), 두 단계를 `trans`로 잇습니다.

```lean
example : SubD (.record [("b", .num), ("a", .num)]) (.record [("a", .num)]) :=
  .trans (.perm (by decide) (List.Perm.swap _ _ [])) (SubD.width (fs := [("a", .num)]))
```

같은 판단을 `Sub`로는 `record` 생성자 하나로 보일 수 있습니다. 두 관계는 이처럼 생김새가 전혀 다릅니다. `SubD`는 작은 규칙을 이어 붙이는 방식이라 사람이 읽고 믿기 쉽고, `Sub`는 타입 두 개만 보면 어떤 규칙을 쓸지 정해지는 방식이라 구현하기 쉽고 증명에서 역전하기 쉽습니다.

## 증명의 전체 계획

그러면 정리는 어느 관계로 증명할까요? 이 장의 계획은 다음 그림과 같습니다.

<div style="text-align:center">

<svg viewBox="0 0 640 270" width="100%" style="max-width: 620px" role="img" aria-label="증명 계획: SubD는 SubD.toSub로 Sub가 되고, HasType SubD는 HasType.mono로 HasType Sub가 되며, HasType Sub에서 type_soundness로 Sound가 나온다. Sub.trans는 SubD.toSub와 VT.sub에서 쓰인다" font-family="sans-serif" fill="currentColor">
<defs><marker id="lean-subtyping-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect rx="3" x="20" y="20" width="200" height="56" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="120" y="44" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="16">SubD</text>
<text x="120" y="64" text-anchor="middle" font-size="13">선언적(강의의 규칙)</text>
<rect rx="3" x="420" y="20" width="200" height="56" fill="#2a408e"/>
<text x="520" y="44" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="16" fill="#ffffff">Sub</text>
<text x="520" y="64" text-anchor="middle" font-size="13" fill="#ffffff">알고리즘적(isSubType)</text>
<polyline points="222,48 416,48" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#lean-subtyping-1)"/>
<text x="320" y="40" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">SubD.toSub</text>
<text x="320" y="68" text-anchor="middle" font-size="12">(trans 경우에 Sub.trans)</text>
<rect rx="3" x="20" y="120" width="200" height="44" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="120" y="147" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="15">HasType SubD</text>
<rect rx="3" x="420" y="120" width="200" height="44" fill="#2a408e"/>
<text x="520" y="147" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="15" fill="#ffffff">HasType Sub</text>
<polyline points="222,142 416,142" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#lean-subtyping-1)"/>
<text x="320" y="134" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">HasType.mono</text>
<line x1="120" y1="78" x2="120" y2="118" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<line x1="520" y1="78" x2="520" y2="118" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<rect rx="3" x="370" y="206" width="250" height="44" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="495" y="233" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="14">Sound (eval n [] e) ...</text>
<polyline points="520,166 520,202" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#lean-subtyping-1)"/>
<text x="510" y="190" text-anchor="end" font-family="ui-monospace, Menlo, monospace" font-size="14">type_soundness</text>
<text x="530" y="190" text-anchor="start" font-size="12">(VT.sub에 Sub.trans)</text>
<text x="20" y="233" font-size="13">점선: 서브타입 관계가 타입 규칙의 전제로 쓰임</text>
</svg>

</div>

1. 타입 규칙 `HasType`이 어떤 서브타입 관계를 쓸지 매개변수로 받게 합니다. 구현의 `typeCheck`는 `HasType Sub`, 강의의 규칙은 `HasType SubD`입니다.
2. 타입 안전성은 `HasType Sub`에 대해 증명합니다. 역전이 잘 되는 `Sub` 덕분에 증명이 단순해집니다.
3. `SubD`로 유도한 판단은 모두 `Sub`로도 유도된다는 정리 `SubD.toSub`를 증명합니다. 그러면 `HasType SubD`의 유도도 `HasType Sub`의 유도가 되어, 강의의 규칙에 대해서도 같은 결론을 얻습니다.

이 계획에서 추이성은 사라지지 않고 자리를 옮깁니다. `Sub`의 생성자가 아니라 **정리** `Sub.trans`가 되어, `SubD.toSub`의 `trans` 경우와 `VT.sub`(뒤에서 봄)에서 쓰입니다. 이렇게 규칙으로 넣지 않아도 증명할 수 있는 규칙을 <a id="g-admissible-rule"></a>허용 가능한 규칙(admissible rule)이라고 합니다.

## 추이성은 정리로: Sub.trans

`isSubType`이 추이적이라는 것은 당연해 보이지만 증명은 생각보다 까다롭습니다. `Sub A B`에 대한 귀납법으로 증명하는데, 다음 두 가지를 **함께** 보여야 합니다.

```lean
theorem Sub.trans_both {A B} (h : Sub A B) :
    (∀ C, Sub B C → Sub A C) ∧ (∀ Z, Sub Z A → Sub Z B) := by
```

```lean
theorem Sub.trans {A B C} (h1 : Sub A B) (h2 : Sub B C) : Sub A C :=
  (Sub.trans_both h1).1 C h2
```

첫째는 \\(A <: B\\)의 **오른쪽**에 판단 \\(B <: C\\)를 이어 붙이는 것이고, 둘째는 **왼쪽**에 \\(Z <: A\\)를 이어 붙이는 것입니다. 우리가 원하는 것은 첫째뿐인데 왜 둘째까지 필요할까요? 함수 타입의 매개변수가 반변이기 때문입니다.

\\(P_1 \to R_1 <: P_2 \to R_2\\)(전제 \\(P_2 <: P_1\\), \\(R_1 <: R_2\\))에 \\(P_2 \to R_2 <: P_3 \to R_3\\)(전제 \\(P_3 <: P_2\\), \\(R_2 <: R_3\\))를 이어 붙인다고 합시다. 반환 타입 쪽은 \\(R_1 <: R_2 <: R_3\\)이므로 귀납 대상 \\(R_1 <: R_2\\)의 오른쪽에 붙이면 됩니다. 그런데 매개변수 쪽은 \\(P_3 <: P_2 <: P_1\\)이므로 귀납 대상 \\(P_2 <: P_1\\)의 **왼쪽**에 붙여야 합니다. 첫째 성질만 귀납 가정(induction hypothesis)으로 가지고 있으면 이 경우를 처리할 수 없습니다.

```lean
  | arrow h1 h2 ih1 ih2 =>
    refine ⟨fun C hc => ?_, fun Z hz => ?_⟩
    · cases hc with
      | top => exact .top
      | refl => exact .arrow h1 h2
      | arrow h3 h4 =>
        exact .arrow (ih1.2 _ h3) (ih2.1 _ h4)
```

`ih1`은 매개변수 판단 `h1 : Sub P2 P1`에 대한 귀납 가정이고 `ih2`는 반환 판단 `h2 : Sub R1 R2`에 대한 귀납 가정입니다. 매개변수는 `h3 : Sub P3 P2`를 왼쪽에 붙이므로 둘째 부분 `ih1.2`를, 반환은 `h4 : Sub R2 R3`를 오른쪽에 붙이므로 첫째 부분 `ih2.1`을 씁니다. 두 번째 판단 `hc`를 `cases`로 나누면 `top`, `refl`, `arrow` 세 경우뿐이라는 점에서 다시 한번 추이성 생성자가 없는 덕을 봅니다.

나머지 경우도 두 번째 판단을 `cases`로 나누면 됩니다. `bot`과 `top`은 바로 끝나고, 레코드는 필드 \\(f\\)를 하나 잡아 세 리스트를 차례로 따라갑니다. 오른쪽 끝 레코드의 \\(f \mapsto r\\)에서 가운데 레코드의 \\(f \mapsto m\\)(\\(m <: r\\))로, 다시 왼쪽 레코드의 \\(f \mapsto l\\)(\\(l <: m\\))로 가서, 판단 \\(l <: m\\)에 대한 귀납 가정을 씁니다. 아래의 `hlm`은 귀납 대상 \\(\\{\mathit{ls}\\} <: \\{\mathit{ms}\\}\\)의 두 전제를 `Covers Sub ls ms` 꼴로 합쳐 둔 것입니다.

```lean
      | record hs' hsub' =>
        apply Sub.ofCovers
        intro f r hr
        obtain ⟨m, hm, hmr⟩ := covers_of_split hs' hsub' f r hr
        obtain ⟨l, hl, _⟩ := hlm f m hm
        exact ⟨l, hl, (ih f m l hm hl).1 r hmr⟩
```

`Ty`는 레코드 안에 타입의 리스트가 들어 있는 중첩 구조여서 타입에 대한 구조적 귀납법은 번거롭습니다. 하지만 여기서는 타입이 아니라 `Sub` **유도**에 대한 귀납법이므로, 레코드 생성자의 둘째 전제 `∀ f r l, ... → Sub l r`에 대한 귀납 가정 `ih`가 필드마다 바로 주어집니다. 이렇게 유도에 대해 귀납하면 중첩 구조가 문제되지 않습니다.

## 선언적 관계를 알고리즘적 관계로: SubD.toSub

이제 `SubD`로 유도한 판단이 모두 `Sub`로 유도된다는 것을 보입니다. 짧으니 전체를 봅시다.

```lean
theorem SubD.toSub {A B} (h : SubD A B) : Sub A B := by
  induction h with
  | bot => exact .bot
  | top => exact .top
  | refl => exact .refl
  | trans _ _ ih1 ih2 =>
    exact ih1.trans ih2
  | arrow _ _ ih1 ih2 => exact .arrow ih1 ih2
  | @width fs x T =>
    apply Sub.ofCovers
    intro f r hr
    refine ⟨r, ?_, .refl⟩
    rw [lookup_append, hr]; rfl
  | depth hk _ ih =>
    apply Sub.ofCovers
    intro f r hr
    obtain ⟨l, hl, hz⟩ := lookup_same_keys hk hr
    exact ⟨l, hl, ih _ _ hz⟩
  | perm hn hp =>
    apply Sub.ofCovers
    intro f r hr
    exact ⟨r, lookup_of_mem_nodup hn (hp.mem_iff.mpr (lookup_mem hr)), .refl⟩
```

`SubD` 유도에 대한 귀납법이고, 규칙마다 대응하는 `Sub`의 생성자를 씁니다. `trans` 경우가 바로 `Sub.trans`가 쓰이는 곳입니다. 레코드 규칙 세 개는 모두 `Sub.record` 하나(`Covers` 꼴인 `Sub.ofCovers`)로 보입니다. 오른쪽 레코드의 필드 \\(f \mapsto r\\)마다 왼쪽에서 짝을 찾아 주면 됩니다.

- `width`: \\(\mathit{fs}\\)에서 찾은 \\(f \mapsto r\\)은 \\(\mathit{fs} \mathbin{+\mkern-10mu+} [(x, T)]\\)에서도 그대로 찾힙니다(`lookup_append`, 앞쪽이 이김). \\(x\\)가 \\(\mathit{fs}\\)에 이미 있어도 성립합니다.
- `depth`: 이름 목록이 같으므로 \\(\mathit{gs}\\)의 \\(f \mapsto r\\)과 같은 자리에 \\(\mathit{fs}\\)의 \\(f \mapsto l\\)이 있고(`lookup_same_keys`), 그 둘에 대한 귀납 가정이 \\(l <: r\\)을 줍니다.
- `perm`: \\(\mathit{gs}\\)에서 찾은 \\(f \mapsto r\\)은 리스트 \\(\mathit{gs}\\)의 원소이고(`lookup_mem`), 순열인 \\(\mathit{fs}\\)의 원소이기도 합니다. \\(\mathit{fs}\\)는 이름이 겹치지 않으므로 `lookup fs f`는 바로 그 \\(r\\)입니다(`lookup_of_mem_nodup`). `Nodup` 조건은 여기서 쓰입니다.

남은 것은 타입 규칙으로 옮기는 일입니다. 타입 규칙 `HasType`은 서브타입 관계를 매개변수로 받으므로, 더 넓은 관계로 바꿔도 유도가 유지된다는 단조성 정리를 생성자마다 확인하면 됩니다.

```lean
theorem HasType.mono {s1 s2 : Ty → Ty → Prop} (hs : ∀ a b, s1 a b → s2 a b)
    {Γ e T} (h : HasType s1 Γ e T) : HasType s2 Γ e T := by
```

```lean
theorem type_soundness_decl {e : Expr} {T : Ty} (h : HasType SubD [] e T) (n : Nat) :
    Sound (eval n [] e) (fun v => VT v T) :=
  type_soundness (h.mono fun _ _ => SubD.toSub) n
```

`HasType.mono`에 `SubD.toSub`를 넣으면 강의의 규칙으로 타입 검사한 프로그램에 대해서도 같은 결론이 나옵니다. 타입 안전성 증명은 `Sub`로 한 번만 하면 되고, `SubD`는 이 세 줄짜리 따름 정리로 끝납니다.

> **생각해 보기** 반대 방향, 즉 `Sub`로 유도한 판단이 모두 `SubD`로 유도된다는 것은 이 책의 Lean 프로젝트에서 증명하지 않았습니다. 타입 안전성에는 필요 없기 때문입니다. 그런데 사실 반대 방향은 그대로는 **거짓**입니다. 이름이 겹치는 레코드 타입 \\(\\{a : \mathtt{num}\\}\\)과 \\(\\{a : \mathtt{num}, a : \bot\\}\\)을 생각해 보세요. `Sub`의 `record` 생성자는 오른쪽에서 `lookup`으로 찾히는 \\(a : \mathtt{num}\\)만 확인하므로 \\(\\{a : \mathtt{num}\\} <: \\{a : \mathtt{num}, a : \bot\\}\\)이 성립합니다. 하지만 `SubD`의 규칙은 레코드 타입의 필드 개수를 늘릴 수 없습니다(`width`는 줄이고 `depth`와 `perm`은 그대로 둡니다). 두 관계는 이름이 겹치지 않는 레코드 타입에 대해서만 같다고 기대할 수 있고, 그것을 증명하는 것은 도전 과제로 남겨 둡니다(연습 문제 5).

## 포섭 규칙 없는 타입 규칙

[서브타입 다형성](./subtype-polymorphism.md)에서는 먼저 포섭(subsumption) 규칙을 소개한 뒤, 그것이 알고리즘적이지 않으므로 서브타입 검사를 각 규칙에 직접 넣은 알고리즘적 타입 규칙을 만들었습니다. `HasType`은 이 두 번째 규칙을 옮긴 것이고 구현의 `typeCheck`와 같습니다. 서브타입을 검사하는 규칙은 \\(\tau\texttt{-Add}\\), \\(\tau\texttt{-Mul}\\), \\(\tau\texttt{-Val}\_{\tau}\\), \\(\tau\texttt{-App}\\) 네 개이고, 검사에 쓸 관계를 매개변수 `sub`로 받습니다. 다음은 그 일부입니다.

```lean
inductive HasType (sub : Ty → Ty → Prop) : TEnv → Expr → Ty → Prop
  ...
  /-- τ-Add (operands may be `Bot`, e.g. `1 + exit`) -/
  | add {Γ l r T1 T2} :
      HasType sub Γ l T1 → sub T1 .num → HasType sub Γ r T2 → sub T2 .num →
      HasType sub Γ (.add l r) .num
  ...
  /-- τ-Val_τ (annotation `T0`) -/
  | valT {Γ x T0 i b T1 T2} :
      HasType sub Γ i T1 → sub T1 T0 → HasType sub ((x, T0) :: Γ) b T2 →
      HasType sub Γ (.val x (some T0) i b) T2
  ...
  /-- τ-App -/
  | app {Γ f a P R T3} :
      HasType sub Γ f (.arrow P R) → HasType sub Γ a T3 → sub T3 P →
      HasType sub Γ (.app f a) R
  ...
  /-- τ-Access -/
  | access {Γ r f fs T} :
      HasType sub Γ r (.record fs) → lookup fs f = some T →
      HasType sub Γ (.access r f) T
  /-- τ-Exit -/
  | exit {Γ} : HasType sub Γ .exit .bot
```

\\(\tau\texttt{-App}\\)을 강의의 규칙과 나란히 놓아 봅시다.

\\[
\begin{prooftree}
\AxiomC{$\Gamma \vdash e_0 : \tau_1 \to \tau_2$}
\AxiomC{$\Gamma \vdash e_1 : \tau_3$}
\AxiomC{$\tau_3 <: \tau_1$}
\LeftLabel{$\tau\texttt{-App}$}
\TrinaryInfC{$\Gamma \vdash e_0(e_1) : \tau_2$}
\end{prooftree}
\\]

`f`, `a`, `P`, `R`, `T3`가 각각 \\(e_0\\), \\(e_1\\), \\(\tau_1\\), \\(\tau_2\\), \\(\tau_3\\)이고, 전제 \\(\tau_3 <: \tau_1\\)이 `sub T3 P`입니다.

포섭 규칙이 없다는 사실이 증명에서 큰 역할을 합니다. \\(\tau\texttt{-App}\\)의 첫째 전제에서 함수 식의 타입은 **글자 그대로** 화살표 타입 `.arrow P R`이고(구현의 `case ArrowT(...)`), \\(\tau\texttt{-Access}\\)에서 레코드 식의 타입은 글자 그대로 레코드 타입입니다. 포섭 규칙이 있었다면 "함수 식의 타입이 화살표"라는 사실조차 포섭 규칙의 사슬을 거꾸로 따라가야 알 수 있었을 것입니다.

> **생각해 보기** [연료와 결과 분류](./lean-fuel.md)에서는 타입 검사 함수 `typeCheck`를 Lean으로도 쓰고, `typeCheck_iff`로 타입 규칙과 같다는 것을 증명했습니다. \\(\mathsf{STFAE}\\) 프로젝트에는 `typeCheck` 함수가 없고, `HasType Sub`가 곧 `typeCheck`의 명세 역할을 합니다. `isSubType`을 Lean 함수로 쓰려면 레코드 안의 타입 리스트를 도는 중첩 재귀가 필요하고, 그것이 `Sub`와 같다는 증명도 따로 해야 합니다(연습 문제 6).

## 값의 타입: "타입이 T의 서브타입"

이제 앞에서 미뤄 둔 첫째 문제로 돌아갑시다. `VT v T`가 "`v`의 타입이 \\(T\\)의 서브타입"을 뜻해야 합니다.

가장 쉬운 방법은 \\(\mathsf{TFAE}\\)의 `VT`에 포섭 규칙 같은 생성자 `VT v S → Sub S T → VT v T`를 하나 더하는 것입니다. 하지만 그러면 타입 규칙에서 포섭 규칙을 뺀 이유가 그대로 돌아옵니다. `VT v (.arrow P R)`에서 `v`가 클로저라는 것을 알아내려면 이 생성자의 사슬을 거꾸로 따라가야 하기 때문입니다. 그래서 대신 생성자마다 서브타입을 미리 녹여 넣습니다.

```lean
inductive VT : Value → Ty → Prop
  | num {n} : VT (.num n) .num
  | top {v} : VT v .top
  /-- A closure checked at `P → R` under some `Γ` satisfied by `ρ` has every supertype `P' → R'`. -/
  | clo {Γ : TEnv} {ρ : Env} {p b P R P' R'} :
      (∀ y U, lookup Γ y = some U → (lookup ρ y).isSome) →
      (∀ y U v, lookup Γ y = some U → lookup ρ y = some v → VT v U) →
      HasType Sub ((p, P) :: Γ) b R → Sub P' P → Sub R R' →
      VT (.clo p b ρ) (.arrow P' R')
  /-- A record value has every record type whose fields it provides. -/
  | record {vs : List (String × Value)} {ts : List (String × Ty)} :
      (∀ f t, lookup ts f = some t → (lookup vs f).isSome) →
      (∀ f t v, lookup ts f = some t → lookup vs f = some v → VT v t) →
      VT (.record vs) (.record ts)
```

- `num`: 수의 타입은 \\(\mathtt{num}\\)입니다. \\(\mathtt{num}\\)의 슈퍼타입(supertype)은 \\(\top\\)뿐이고, 그것은 `top`이 맡습니다.
- `top`: 모든 값은 \\(\top\\) 타입을 가집니다.
- `clo`: 앞의 세 전제는 [연료와 결과 분류](./lean-fuel.md)의 `VT.clo`와 같습니다. 클로저의 환경 \\(\rho\\)가 어떤 \\(\Gamma\\)를 만족하고(`Covers VT ρ Γ`를 `Sub.record`처럼 두 전제로 나눈 것), \\(\Gamma[p : P] \vdash b : R\\)입니다. 이 \\(P \to R\\)을 클로저의 **자기 타입**이라고 부릅시다. 여기에 \\(P' <: P\\)와 \\(R <: R'\\)을 더해서, 자기 타입의 슈퍼타입인 화살표 타입 \\(P' \to R'\\)을 모두 가지게 합니다. 본문을 검사할 때 쓴 \\(P\\), \\(R\\)과 바깥에서 보는 \\(P'\\), \\(R'\\)이 다를 수 있으므로 둘 다 있어야 합니다.
- `record`: `Covers VT vs ts`를 두 전제로 나눈 것입니다. 레코드 값은 자기가 가진 필드로 채울 수 있는 레코드 타입을 모두 가집니다. 필드 추가, 필드 타입, 필드 순서가 모두 여기에 들어 있습니다.
- \\(\bot\\)을 결론으로 하는 생성자는 **없습니다**. \\(\bot\\) 타입의 값은 없다는 뜻입니다.

이제 앞의 예에서 `{a=1, b=2}`는 `record` 생성자로 `{a: Number}` 타입을 가지므로, `y`를 환경에 넣어도 `EnvT`가 유지됩니다.

### VT.sub: 서브타입으로 넓히기

이 정의에서 "서브타입이면 된다"는 생성자가 아니라 정리입니다. `Sub`의 추이성이 정리였던 것과 같은 관계입니다.

```lean
theorem VT.sub {v S} (h : VT v S) : ∀ {T}, Sub S T → VT v T := by
  induction h with
  | num =>
    intro T hs
    rcases hs.num_inv with rfl | rfl
    · exact .num
    · exact .top
  | top => intro T hs; rw [hs.top_inv]; exact .top
  | clo h1 h2 hb hP hR =>
    intro T hs
    cases hs with
    | top => exact .top
    | refl => exact .clo h1 h2 hb hP hR
    | arrow h3 h4 => exact .clo h1 h2 hb (h3.trans hP) (hR.trans h4)
  | @record vs ts h1 h2 ih =>
    ...
```

`VT v S`에 대한 귀납법이고, 경우마다 `Sub S T`를 `cases`로 나눕니다. 그러면 \\(T\\)는 \\(\top\\)이거나, \\(S\\) 자신(`refl`)이거나, \\(S\\)와 같은 모양의 타입입니다. 수는 `Sub.num_inv`로 \\(T\\)가 \\(\mathtt{num}\\) 또는 \\(\top\\)임을 압니다(`rcases ... with rfl | rfl`은 두 경우로 나누면서 등식을 바로 대입합니다). 클로저는 \\(P^{\prime\prime} <: P' <: P\\)와 \\(R <: R' <: R^{\prime\prime}\\)에 `Sub.trans`를 한 번씩 써서 자기 타입과의 관계를 갱신합니다. 레코드는 필드마다 귀납 가정을 씁니다(생략한 부분). 여기서도 `Sub`에 추이성 생성자가 없어서 `cases hs`가 몇 경우로 끝난다는 점이 중요합니다.

### 정준 형태

결론 타입이 화살표 타입일 수 있는 `VT` 생성자는 `clo` 하나, 레코드 타입일 수 있는 것은 `record` 하나뿐입니다. 그래서 `cases` 한 번으로 값의 모양을 압니다. 이런 보조정리를 정준 형태(canonical forms) 보조정리라고 합니다.

```lean
theorem VT.not_bot {v} (h : VT v .bot) : False := by cases h
```

```lean
theorem VT.arrow_inv {v P R} (h : VT v (.arrow P R)) :
    ∃ p b ρ Γ P0 R0, v = .clo p b ρ ∧ EnvT ρ Γ ∧ HasType Sub ((p, P0) :: Γ) b R0 ∧
      Sub P P0 ∧ Sub R0 R := by
  cases h with
  | clo h1 h2 hb hP hR => exact ⟨_, _, _, _, _, _, rfl, covers_of_split h1 h2, hb, hP, hR⟩
```

```lean
theorem VT.record_inv {v fs} (h : VT v (.record fs)) :
    ∃ vs, v = .record vs ∧ Covers VT vs fs := by
```

`VT.arrow_inv`는 "화살표 타입의 값은 클로저이고, 그 자기 타입 `P0 → R0`가 `P → R`의 서브타입"이라는 뜻입니다. 타입 규칙에 포섭 규칙이 없고 `VT`에도 포섭 생성자가 없기 때문에, 이 정리들이 `cases` 한 번으로 증명됩니다.

## 타입 안전성 증명

증명의 구조는 [연료와 결과 분류](./lean-fuel.md)와 같습니다. 열린 식으로 일반화한 정리 `sound`를 연료 \\(n\\)에 대한 귀납법으로 증명하고, 그 안에서 타입 유도를 경우 분석합니다. 긴 경우는 보조정리로 빼고, 귀납 가정의 모양에 `SoundAt`이라는 이름을 붙였습니다.

```lean
abbrev SoundAt (n : Nat) : Prop :=
  ∀ {Γ : TEnv} {ρ : Env} {e : Expr} {T : Ty},
    EnvT ρ Γ → HasType Sub Γ e T → Sound (eval n ρ e) (fun v => VT v T)
```

\\(\mathsf{TFAE}\\)와 달라진 경우만 골라 보겠습니다.

```lean
theorem sound (n : Nat) {Γ : TEnv} {ρ : Env} {e : Expr} {T : Ty}
    (hρ : EnvT ρ Γ) (ht : HasType Sub Γ e T) :
    Sound (eval n ρ e) (fun v => VT v T) := by
  induction n generalizing Γ ρ e T with
  | zero => simp [eval, Sound]
  | succ n ih =>
    cases ht with
    ...
    | add h1 s1 h2 s2 =>
      simp only [eval]
      exact (ih hρ h1).bind fun a ha => (ih hρ h2).bind fun b hb =>
        sound_numBOp (ha.sub s1) (hb.sub s2)
    ...
    -- τ-Val_τ
    | valT h1 s h2 =>
      simp only [eval]
      exact (ih hρ h1).bind fun v hv => ih (hρ.cons (hv.sub s)) h2
    ...
    -- τ-App
    | app hf ha s => exact sound_app ih hρ hf ha s
    -- τ-Record
    | record hl hfs => exact sound_record ih hρ hl hfs
    -- τ-Access
    | access hr hf => exact sound_access ih hρ hr hf
    -- τ-Exit
    | exit => rfl
```

- \\(\tau\texttt{-Add}\\), \\(\tau\texttt{-Mul}\\): 피연산자 값의 타입은 \\(T_1 <: \mathtt{num}\\)이므로 `VT.sub`로 \\(\mathtt{num}\\)까지 넓힌 뒤 \\(\mathsf{TFAE}\\)처럼 `sound_numBOp`을 씁니다. \\(T_1\\)이 \\(\bot\\)인 경우(`1 + exit`)는 따로 처리할 필요가 없습니다. 그 피연산자의 계산이 값을 내지 않으므로 `Sound.bind`가 알아서 넘깁니다.
- \\(\tau\texttt{-Val}\_{\tau}\\): 초기식 값의 타입 \\(T_1 <: T_0\\)을 `VT.sub`로 \\(T_0\\)까지 넓혀서 환경을 넓힙니다(`Covers.cons`). 이 장의 첫 예제 `val y: {a: Number} = {a=1, b=2}`가 바로 이 경우입니다.
- \\(\tau\texttt{-Record}\\)(`sound_record`): 필드 식마다 귀납 가정을 쓰고, 값과 타입이 모두 `addAll []`로 만든 리스트이므로 `Covers.addAll_zip`으로 레코드 값의 `VT`를 얻습니다.
- \\(\tau\texttt{-Access}\\)(`sound_access`): 레코드 식의 타입이 글자 그대로 `.record fs`이므로 `VT.record_inv`로 값이 레코드 값임을 압니다(`not a record` 없음). `fs`에 `f : T`가 있으니 `Covers`에 따라 값에도 필드 `f`가 있습니다(`no such field` 없음).
- \\(\tau\texttt{-Exit}\\): 결과는 `err .exit`이고 `Sound`의 정의에 따라 목표가 `.exit = .exit`이 되므로 `rfl`로 끝납니다.

### 함수 적용

가장 흥미로운 경우는 \\(\tau\texttt{-App}\\)입니다.

```lean
theorem sound_app {n : Nat} {Γ : TEnv} {ρ : Env} {f a : Expr} {P R T3 : Ty}
    (ih : SoundAt n) (hρ : EnvT ρ Γ)
    (hf : HasType Sub Γ f (.arrow P R)) (ha : HasType Sub Γ a T3) (s : Sub T3 P) :
    Sound (eval (n + 1) ρ (.app f a)) (fun v => VT v R) := by
  simp only [eval]
  refine (ih hρ hf).bind fun fv hfv => ?_
  obtain ⟨p, b, fenv, Γ', P0, R0, rfl, hfenv, hb, hP, hR⟩ := hfv.arrow_inv
  refine (ih hρ ha).bind fun av hav => ?_
  have hav' : VT av P0 := hav.sub (s.trans hP)
  exact (ih (hfenv.cons hav') hb).mono fun r hr => hr.sub hR
```

함수 값 `fv`에 정준 형태 `VT.arrow_inv`를 쓰면 `fv`가 클로저라는 것을 알 수 있으므로 `not a function` 오류는 없습니다. 이 증명에는 타입이 세 겹으로 나옵니다. 함수 식의 정적 타입 \\(P \to R\\), 인자 식의 정적 타입 \\(T_3\\), 그리고 클로저의 자기 타입 \\(P_0 \to R_0\\)입니다. 클로저 본문은 \\(\Gamma'[p : P_0] \vdash b : R_0\\)로 검사되었습니다. 이들 사이의 관계를 그림으로 보면 다음과 같습니다(화살표는 서브타입에서 슈퍼타입으로).

<div style="text-align:center">

<svg viewBox="0 0 640 250" width="100%" style="max-width: 620px" role="img" aria-label="τ-App 경우의 세 타입: 인자 타입 T3은 s로 P의, P는 hP로 P0의 서브타입이고, 결과 타입 R0는 hR로 R의 서브타입이다. 클로저의 자기 타입 P0 → R0는 f의 정적 타입 P → R의 서브타입이다" font-family="sans-serif" fill="currentColor">
<defs><marker id="lean-subtyping-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="130" y="22" text-anchor="middle" font-size="13">클로저의 자기 타입</text>
<rect rx="3" x="50" y="32" width="160" height="40" fill="#2a408e"/>
<text x="130" y="58" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="16" fill="#ffffff">P0 → R0</text>
<text x="420" y="22" text-anchor="middle" font-size="13">f의 정적 타입</text>
<rect rx="3" x="340" y="32" width="160" height="40" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="420" y="58" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="16">P → R</text>
<polyline points="212,52 336,52" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#lean-subtyping-2)"/>
<text x="274" y="44" text-anchor="middle" font-size="12">VT.arrow_inv</text>
<text x="20" y="128" font-size="13">매개변수</text>
<text x="130" y="128" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="16">P0</text>
<text x="420" y="128" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="16">P</text>
<text x="580" y="128" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="16">T3</text>
<polyline points="405,123 150,123" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#lean-subtyping-2)"/>
<text x="274" y="114" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">hP</text>
<polyline points="562,123 436,123" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#lean-subtyping-2)"/>
<text x="500" y="114" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">s</text>
<text x="580" y="150" text-anchor="middle" font-size="12">인자 식의 타입</text>
<text x="20" y="198" font-size="13">반환</text>
<text x="130" y="198" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="16">R0</text>
<text x="420" y="198" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="16">R</text>
<polyline points="150,193 405,193" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#lean-subtyping-2)"/>
<text x="274" y="184" text-anchor="middle" font-family="ui-monospace, Menlo, monospace" font-size="13">hR</text>
<text x="170" y="238" text-anchor="middle" font-size="13">인자 값: T3에서 P0까지 넓힘(VT.sub)</text>
<text x="470" y="238" text-anchor="middle" font-size="13">결과 값: R0에서 R까지 넓힘(VT.sub)</text>
</svg>

</div>

인자 값은 \\(T_3 <: P <: P_0\\)이므로 `VT.sub`와 `Sub.trans`로 \\(P_0\\) 타입을 가지고(`hav'`), 그래서 `fenv`에 인자를 더한 환경이 \\(\Gamma'[p : P_0]\\)을 만족합니다. 귀납 가정으로 본문의 결과는 \\(R_0\\) 타입을 가지고, 다시 `VT.sub`로 \\(R\\) 타입을 가집니다(`Sound.mono`는 `Sound`의 조건을 더 약한 조건으로 바꾸는 보조정리입니다). 매개변수 쪽 화살표가 왼쪽을 향하는 것이 바로 반변성입니다. `Sub.arrow`의 매개변수 전제가 거꾸로였다면 \\(P\\)와 \\(P_0\\) 사이 화살표의 방향이 뒤집혀서 인자 값을 \\(P_0\\)까지 넓힐 수 없습니다.

두 설계가 맞물려 있다는 점을 눈여겨보세요. 포섭 규칙이 없는 타입 규칙 덕분에 `f`의 타입이 처음부터 화살표이고, `VT`가 생성자 안에 서브타입을 품고 있는 덕분에 `VT.arrow_inv`가 `cases` 한 번입니다.

## exit와 Bot

`exit`의 타입은 \\(\bot\\)이고 \\(\bot\\)은 모든 타입의 서브타입이므로, `exit`는 `1 + exit`처럼 어느 자리에든 쓸 수 있습니다. \\(\tau\texttt{-Add}\\)의 전제 \\(\bot <: \mathtt{num}\\)은 `Sub.bot`입니다. `Examples.lean`에 이 예가 있습니다.

```lean
example : HasType Sub [] (.add (.num 1) .exit) .num := .add .num .refl .exit .bot

example : eval 10 [] (.add (.num 1) .exit) = err .exit := rfl
```

그렇다면 \\(\bot\\) 타입의 값이 계산 결과로 나올 수 있을까요? `VT`에 \\(\bot\\)을 결론으로 하는 생성자가 없으므로 `VT v .bot`은 거짓입니다(`VT.not_bot`). 그래서 타입 안전성 정리에서 바로 다음 따름 정리가 나옵니다.

```lean
theorem bot_program {e : Expr} (h : HasType Sub [] e .bot) (n : Nat) :
    eval n [] e = none ∨ eval n [] e = some (.error .exit) := by
```

타입이 \\(\bot\\)인 프로그램은 연료가 떨어지거나 `exit`로 끝날 뿐, 값을 내지 못합니다. 강의에서 \\(\bot\\)을 "값이 하나도 없는 타입", 곧 공집합으로 설명한 것이 Lean에서는 "`VT`에 \\(\bot\\)을 위한 생성자가 없다"로 나타납니다.

\\(\bot\\) 타입의 값이 계산 도중 다른 곳으로 흘러가는 일도 없습니다. 예를 들어 매개변수 타입이 \\(\bot\\)인 함수를 호출하려면 인자의 타입이 \\(\bot\\)의 서브타입, 즉 \\(\bot\\)이어야 하므로, 인자를 계산하는 동안 이미 연료가 떨어지거나 `exit`로 끝납니다. 증명에서는 이 경우를 따로 다루지 않습니다. `Sound.bind`는 값이 나온 경우에만 다음 단계로 넘어가는데, 값이 나왔다면 그 값에 대해 `VT`가 성립해야 하고 \\(\bot\\)에 대해서는 그런 값이 없기 때문입니다.

> **자주 하는 실수** \\(\bot <: T\\)가 모든 \\(T\\)에 대해 성립하므로 "\\(\bot\\) 타입의 식을 아무 데나 넣으면 위험하지 않을까"라고 걱정하기 쉽습니다. 하지만 위험한 것은 **값**이 잘못된 자리에 들어가는 경우뿐이고, \\(\bot\\) 타입의 값은 존재하지 않습니다. 타입 안전성 정리가 말하는 것도 "값이 나왔다면 그 값은 타입에 맞는다"입니다.

## 정리

- \\(\mathsf{STFAE}\\)에서는 서브타입 관계를 두 개 정의합니다. 구현의 `isSubType`을 옮긴 알고리즘적 관계 `Sub`와 강의의 규칙을 옮긴 선언적 관계 `SubD`입니다.
- `Sub`에는 추이성 생성자가 없고, 레코드 규칙 세 개가 `record` 생성자 하나에 들어 있습니다. 덕분에 `Sub S T`를 `cases`로 역전할 수 있습니다(`Sub.num_inv`, `Sub.top_inv`).
- `Sub`의 추이성은 정리 `Sub.trans`입니다. 함수 타입의 반변성 때문에 오른쪽과 왼쪽에 이어 붙이는 두 성질을 함께 귀납법으로 증명합니다(`Sub.trans_both`).
- `SubD.toSub`로 선언적 판단을 알고리즘적 판단으로 옮기고, `HasType.mono`로 타입 유도까지 옮겨서 강의의 규칙에 대해서도 타입 안전성을 얻습니다(`type_soundness_decl`). 반대 방향은 증명하지 않았고, 이름이 겹치는 레코드 타입에 대해서는 성립하지 않습니다.
- 타입 규칙 `HasType`은 포섭 규칙 없는 알고리즘적 규칙이고, 서브타입 검사에 쓸 관계를 매개변수로 받습니다. \\(\tau\texttt{-App}\\)에서 함수 식의 타입은 글자 그대로 화살표 타입입니다.
- `VT v T`는 "`v`의 타입이 \\(T\\)의 서브타입"입니다. 서브타입을 생성자마다 녹여 넣어서 `VT.sub`는 정리가 되고, 정준 형태(`VT.arrow_inv`, `VT.record_inv`)는 `cases` 한 번으로 나옵니다.
- \\(\tau\texttt{-App}\\) 경우에는 정적 타입, 인자 타입, 클로저의 자기 타입이 함께 나오고, `VT.sub`로 인자 값과 결과 값을 넓혀서 맞춥니다.
- `exit`는 허용된 오류이고, `VT`에 \\(\bot\\)을 위한 생성자가 없으므로 \\(\bot\\) 타입 프로그램은 값을 내지 못합니다(`bot_program`).

## 연습 문제

1. `Sub.arrow`의 매개변수 전제를 같은 방향, 즉 `Sub P1 P2`로 바꿔 보세요. `Sub.trans_both`는 여전히 증명될까요? 증명이 처음으로 깨지는 곳은 어디인가요? (힌트: `VT.sub`의 클로저 경우를 보세요.) 그리고 [서브타입 다형성](./subtype-polymorphism.md)의 "자주 하는 실수"에 나온 함수가 바뀐 규칙에서 실제로 타입 검사를 통과하고 `noField` 오류를 내는 프로그램을 만들어 `example`로 확인해 보세요.
2. `VT`에서 `clo`의 전제 `Sub P' P`, `Sub R R'`을 빼고, 대신 생성자 `VT v S → Sub S T → VT v T`를 더해 보세요. `VT.sub`는 쉬워지지만 `VT.arrow_inv`와 `VT.not_bot`의 증명은 어떻게 되나요? 무엇에 대한 귀납법이 필요하고, 그 과정에서 `Sub`의 어떤 성질이 필요한지 설명하세요.
3. `SubD.perm`에서 `Nodup` 조건을 빼 보세요. `SubD.toSub`의 어느 경우가 깨지나요? 그 규칙으로 유도되지만 `Sub`로는 유도되지 않는 판단을 찾으세요. 더 나아가, `Nodup` 없는 `SubD`로 `HasType`을 통과하지만 실행하면 타입 오류가 나는 식을 Lean의 `Expr`로 만들어 보세요. (힌트: 타입 표기에 같은 필드 이름이 두 번 나오는 `val`을 쓰고, 레코드 값과 타입이 모두 `addAll []`로 순서가 뒤집힌다는 점을 이용합니다.)
4. "`VT (.num n) T`이면 `T`는 `.num` 또는 `.top`"과 "`VT (.record vs) (.arrow P R)`은 거짓"을 증명하세요. 둘 다 `cases` 한 번이면 됩니다. 왜 그런지 `VT`의 생성자를 보고 설명하세요.
5. (도전) 반대 방향이 그대로는 거짓이라는 것을 Lean으로 보이세요. 먼저 `Sub (.record [("a", .num)]) (.record [("a", .num), ("a", .bot)])`을 증명하고, `SubD`의 유도에 대한 귀납법으로 "`SubD (.record ls) B`이면 `B`는 `.top`이거나 `ls`보다 길지 않은 레코드 타입"임을 보여서 같은 판단이 `SubD`로는 유도되지 않음을 증명하세요. (힌트: `trans` 경우의 가운데 타입이 `.top`일 수 있으므로 "`SubD .top B`이면 `B = .top`"도 따로 필요합니다.) 그다음, 레코드 타입 안의 이름이 모두 겹치지 않는다는 조건 아래에서는 `Sub`가 `SubD`에 들어간다는 것을 증명해 보세요.
6. (도전) `isSubType`을 `Ty → Ty → Bool` 함수로 쓰고, `isSubType S T = true ↔ Sub S T`를 증명하세요. 이어서 [연료와 결과 분류](./lean-fuel.md)의 `typeCheck_iff`처럼 \\(\mathsf{STFAE}\\)의 `typeCheck` 함수를 쓰고 `HasType Sub`와 같다는 것을 증명하세요. 레코드 안의 타입 리스트를 도는 재귀에서 Lean이 종료를 어떻게 확인하는지 살펴보세요.
