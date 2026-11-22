# 기계로 확인하는 증명

2부에서 우리는 여러 타입 있는 언어를 만들고, 그때마다 "이 타입 시스템은 건전하다"고 말했습니다. 타입 검사를 통과한 프로그램은 실행 중에 타입 오류를 내지 않는다는 뜻이었지요. 그런데 정말 그럴까요? 2부에서 이 주장은 규칙 몇 개를 짚어 보는 손 증명이나 직관적인 설명으로 끝났습니다. 4부에서는 이 주장을 끝까지, 빠짐없이 증명합니다. 그리고 그 증명이 맞는지는 사람이 아니라 컴퓨터가 확인합니다.

이 장은 4부 전체의 입구입니다. 왜 증명을 기계로 확인하는지, 타입 안전성(type soundness)을 어떤 모양의 정리로 쓰는지, 4부의 각 장이 어떤 증명 아이디어를 다루는지 살펴봅니다. 마지막으로 4부를 읽기 전에 알고 와야 할 만큼의 Lean을 점검표로 정리하고, 공부할 자료와 코드를 직접 돌려 보는 방법을 안내합니다.

## 손으로 쓴 증명을 믿을 수 있을까

[타입 시스템](./type-systems.md) 장에서 타입 안전성을 "타입이 맞는 프로그램은 실행 중에 타입 오류를 절대 일으키지 않는다"로 정의했습니다. 이 문장은 짧지만, 증명은 그렇지 않습니다. 타입 규칙 하나하나에 대해, 그 규칙으로 타입이 맞은 식을 실행하면 어떤 일이 일어나는지 따져야 합니다. 규칙이 열 개면 경우가 열 개이고, 각 경우 안에서 다시 값의 모양, 환경의 내용, 함수 호출이 부르는 클로저의 몸통까지 따라가야 합니다.

강의나 교과서의 증명은 보통 이 가운데 흥미로운 경우 두세 개만 보여 주고 "나머지는 비슷하다"로 끝납니다. 대부분은 정말로 비슷합니다. 문제는 **비슷하지 않은 경우가 숨어 있을 때**입니다. 이 책의 4부를 쓰면서 실제로 그런 일이 있었습니다.

- [대수적 데이터 타입](./algebraic-data-types.md)의 \\(\mathsf{ATFAE}\\)에 대해 강의 슬라이드와 명세에 적힌 형식 규칙을 그대로 옮기면, 한 `enum` 안에 같은 이름의 배리언트가 두 개 있는 프로그램, 예를 들어 `enum A { case X(Number); case X(Boolean) }`을 쓰는 프로그램이 타입 검사를 통과하고도 실행 중에 타입 오류를 냅니다. 규칙은 매치 경우를 배리언트와 **위치**로 맞추는데, 실행 중의 `match`는 **이름**이 맞는 첫 경우를 고르기 때문입니다. 수업에서 쓰는 파서가 중복된 배리언트 이름을 아예 거부하므로 학생이 쓰는 언어에서는 드러나지 않았지만, 규칙만 놓고 보면 건전하지 않습니다.
- [매개변수 다형성](./parametric-polymorphism.md)의 \\(\mathsf{PTFAE}\\)는 슬라이드 초판의 규칙 두 개가 건전하지 않았습니다. 하나는 두 다형 타입이 같은지 판단하는 규칙에서 <a id="g-side-condition"></a>옆조건(side condition) 하나가 빠진 것이고, 다른 하나는 타입 적용에서 쓰는 치환이 변수를 포획(capture)하는 것이었습니다. 둘 다 타입 검사를 통과하지만 실행하면 클로저에 `+ 1`을 하려다 오류가 나는 프로그램을 만들 수 있습니다.

두 경우 모두 Lean으로 증명을 쓰다가 **증명이 막혀서** 발견했습니다. 막힌 자리를 들여다보니 규칙이 틀려 있었고, 실제로 오류가 나는 <a id="g-counterexample"></a>반례(counterexample) 프로그램을 만들 수 있었습니다. 규칙을 고친 다음에야 증명이 끝났습니다. 반례 자체도 Lean으로 "이 프로그램은 옛 규칙으로 타입이 맞고, 실행하면 오류가 난다"는 정리로 남겼습니다. 자세한 이야기는 [타입 이름의 스코프](./lean-scopes.md)과 [논리 관계](./lean-logical-relations.md)에서 합니다.

이처럼 증명의 모든 단계를 컴퓨터가 검사해 주는 도구를 <a id="g-proof-assistant"></a>증명 보조기(proof assistant)라고 합니다. 우리는 증명 보조기이자 함수형 프로그래밍 언어인 **Lean 4**를 씁니다. Lean에서 정의와 정리를 쓰면, Lean의 작은 핵심부인 커널(kernel)이 모든 증명을 처음부터 끝까지 검사합니다. 사람이 "나머지는 비슷하다"고 넘어간 자리도 커널은 넘어가 주지 않습니다. 증명을 잠시 미뤄 두는 `sorry`라는 명령이 있지만, 쓰면 경고가 뜨고 마지막에 확인하는 방법도 있습니다(`#print axioms`, [연료와 결과 분류](./lean-fuel.md)에서 봅니다). 4부에서 다루는 모든 정리는 `sorry` 없이 끝까지 검사되었습니다.

> **생각해 보기.** 기계가 확인했다고 해서 무엇이든 믿어도 될까요? 커널이 보장하는 것은 "이 정리가 이 정의에 대해 참"이라는 것뿐입니다. 정의 자체가 강의의 언어와 다르다면, 아무리 잘 증명해도 엉뚱한 언어에 대한 정리가 됩니다. 그래서 4부에서는 Lean 정의를 2부의 인터프리터와 규칙에 거의 한 줄씩 맞추어 썼습니다. Lean 정의가 원래 언어와 같은 동작을 한다는 이 성질을 <a id="g-faithfulness"></a>충실성(faithfulness)이라고 부릅니다.

## 타입 안전성을 정리로 쓰면

### 두 가지 증명 방식

교과서에서 흔히 보는 타입 안전성 증명은 작은 걸음 의미(small-step operational semantics) 위에서 두 정리를 증명합니다.

- **진행**(progress): \\(\vdash e : \tau\\)이면 \\(e\\)는 값이거나 한 걸음 더 갈 수 있다.
- **보존**(preservation): \\(\vdash e : \tau\\)이고 \\(e\\)가 한 걸음 가서 \\(e'\\)이 되면 \\(\vdash e' : \tau\\)이다.

둘을 합치면 "타입이 맞는 식은 몇 걸음을 가든 막히지 않는다"가 됩니다.

그런데 이 책의 언어들은 작은 걸음 의미로 정의하지 않았습니다. 1부부터 우리는 환경과 클로저를 쓰는 큰 걸음 의미(big-step operational semantics), 즉 자연 의미 \\(\sigma \vdash e \Rightarrow v\\)와 이를 옮긴 Scala 인터프리터 `interp(expr, env)`로 언어를 정의했습니다. 4부는 의미를 바꾸지 않고 **바로 그 인터프리터에 대해** 타입 안전성을 증명합니다. 그래야 정리가 2부에서 정의한 언어, 여러분이 과제로 구현한 바로 그 인터프리터에 대한 말이 됩니다.

큰 걸음 의미에는 한 가지 곤란한 점이 있습니다. 판단 \\(\sigma \vdash e \Rightarrow v\\)를 만족하는 \\(v\\)가 없을 때, 그 이유가 실행이 **오류로 멈춰서**인지 **끝나지 않아서**인지 판단 자체로는 구별할 수 없습니다. 타입 안전성은 바로 이 둘을 구별해야 하는 성질입니다. 오류로 멈추는 것은 막아야 하고, 끝나지 않는 것은(재귀가 있는 언어라면) 막을 수 없기 때문입니다. 4부는 이 문제를 **연료**로 풉니다.

### 연료와 결과의 세 갈래

Lean의 인터프리터는 Scala의 `interp`에 자연수 인자 \\(n\\) 하나를 더 받습니다. 이것을 <a id="g-fuel"></a>연료(fuel)라고 부릅니다. 재귀 호출을 할 때마다 연료를 하나씩 쓰고, 다 떨어지면 "아직 모름"을 돌려줍니다. 그래서 `eval n ρ e`의 결과는 세 가지 중 하나입니다.

| 결과 | 뜻 |
|---|---|
| `none` | 연료가 떨어졌다. 계산이 아직 끝나지 않았을 수 있다. |
| `some (.error e)` | 오류 `e`로 끝났다. Scala의 `error(...)`에 해당한다. |
| `some (.ok v)` | 값 `v`로 끝났다. |

그리고 결과가 "안전하다"는 것을 술어 `Sound r P`로 정의합니다.

| 결과 `r` | `Sound r P`의 뜻 |
|---|---|
| `none` | 참. 연료가 떨어진 경우에는 아무것도 주장하지 않는다. |
| `some (.error e)` | `e`가 허용된 오류이다. 타입 오류는 허용되지 않는다. |
| `some (.ok v)` | `P v`. 값이 기대한 성질(대개 "타입 \\(\tau\\)의 값")을 가진다. |

<a id="g-allowed-error"></a>허용된 오류(allowed error)는 언어마다 다릅니다. 모든 실행 중 오류가 타입 오류는 아니기 때문입니다. 예를 들어 [재귀 함수의 타입](./typing-recursive-functions.md)의 \\(\mathsf{TRFAE}\\)에서 `1 / 0`은 타입 검사를 통과하지만 0으로 나누기 오류를 냅니다. 타입 시스템은 수의 **값**을 보지 않으니까요. 4부의 언어들에서 허용된 오류는 다음과 같습니다.

| 언어 | 허용된 오류 |
|---|---|
| \\(\mathsf{TFAE}\\), \\(\mathsf{PTFAE}\\) | 없음(`False`) |
| \\(\mathsf{TRFAE}\\), \\(\mathsf{ATFAE}\\), \\(\mathsf{TIFAE}\\) | 0으로 나누기(`e = .divZero`) |
| \\(\mathsf{STFAE}\\) | 프로그래머가 부르는 `exit` (`e = .exit`) |

이제 4부의 모든 언어에 대한 <a id="g-main-theorem"></a>주정리는 같은 모양입니다. 다음은 \\(\mathsf{TFAE}\\)의 주정리입니다.

```lean
theorem type_soundness {e : Expr} {T : Ty} (h : HasType [] e T) (n : Nat) :
    Sound (eval n [] e) (fun v => VT v T)
```

"빈 타입 환경에서 \\(e\\)의 타입이 \\(T\\)이면(`h`), **어떤** 연료 `n`으로 실행해도 결과는 연료 부족이거나, 허용된 오류이거나, 타입 \\(T\\)의 값이다." 여기서 `HasType`은 2부의 타입 규칙, `eval`은 인터프리터, `VT v T`는 "값 `v`의 타입이 `T`"라는 뜻입니다. 이 정리에서 바로 따라 나오는 따름정리가 "타입 오류가 없다"입니다.

```lean
theorem no_type_error {e : Expr} {T : Ty} (h : HasType [] e T) (n : Nat) (err : Err) :
    eval n [] e ≠ some (.error err)
```

\\(\mathsf{TFAE}\\)에서는 허용된 오류가 없으므로 "어떤 오류도 나지 않는다"가 됩니다. 0으로 나누기를 허용하는 언어에서는 이 자리가 "오류가 났다면 그것은 0으로 나누기이다"로 바뀝니다.

### 왜 연료로 충분한가

연료를 붙이면 원래 인터프리터와 다른 함수가 되는데, 그래도 원래 인터프리터에 대한 정리라고 할 수 있을까요? 답은 정리가 **모든** `n`에 대해 성립한다는 데 있습니다.

- 실제 실행이 값이나 오류로 끝난다면, 그 실행의 재귀 깊이는 유한합니다. 그보다 큰 연료를 주면 `eval`도 같은 결과를 냅니다. 정리는 그 연료에서도 성립하므로, 그 오류는 허용된 오류이고 그 값은 기대한 타입을 가집니다.
- 실제 실행이 끝나지 않는다면, 모든 연료에서 결과는 `none`이고 정리는 아무것도 주장하지 않습니다. 원래 타입 안전성도 끝나지 않는 실행은 막지 않습니다.

즉 연료는 "끝나는 실행에 대해서는 정확한 말을 하고, 끝나지 않는 실행에 대해서는 침묵하는" 정리를 Lean으로 쓰는 방법입니다. 진행과 보존으로 말하는 "막히지 않는다"와 같은 내용입니다.

연료가 필요한 더 직접적인 이유도 있습니다. Lean의 함수는 반드시 끝나야 합니다. 끝나지 않는 함수를 허락하면 거짓을 "증명"할 수 있기 때문입니다. 그런데 `interp`는 함수 호출 `f(a)`에서 클로저의 몸통을 실행하고, 그 몸통은 `f(a)`의 부분식이 아닙니다. Lean은 이런 재귀가 끝나는지 알 수 없으므로 정의를 거부합니다. 연료를 하나씩 줄이며 재귀하면 Lean이 받아 줍니다. 그리고 연료는 증명에도 결정적인 도움을 줍니다. 이 모든 이야기는 [연료와 결과 분류](./lean-fuel.md)에서 자세히 합니다.

## 4부의 지도

4부의 장은 언어별이 아니라 **새로 필요한 증명 아이디어별로** 나뉩니다. 각 장은 "앞 장의 방법이 여기서는 왜 부족한가"로 시작해 새 아이디어를 소개하고, 그 아이디어가 처음 필요해지는 언어에서 보여 줍니다. 앞 장에서 설명한 것은 다시 설명하지 않고 링크로만 가리킵니다.

<div style="text-align:center">
<svg viewBox="0 0 640 330" width="100%" style="max-width: 640px" role="img" aria-label="4부의 장 지도: 26장에서 시작해 27장 TFAE에서 기본 틀을 세우고, 28장 TRFAE, 30장 STFAE, 31장 PTFAE로 갈라진다. 28장의 재귀 클로저는 29장 ATFAE와 32장 TIFAE가 이어받는다. 31장만 논리 관계를 쓰고 나머지는 문법적 값의 타입을 쓴다" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="14" fill="currentColor">
<defs><marker id="lean-intro-1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<g text-anchor="middle">
<rect x="10" y="140" width="96" height="50" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="58" y="161" font-weight="bold">26장</text>
<text x="58" y="179" font-size="12">기계로 확인</text>
<rect x="136" y="132" width="132" height="66" rx="4" fill="#2a408e"/>
<text x="202" y="154" font-weight="bold" fill="#fff">27장 TFAE</text>
<text x="202" y="172" font-size="12" fill="#fff">연료, 결과 분류,</text>
<text x="202" y="188" font-size="12" fill="#fff">연료에 대한 귀납법</text>
<rect x="320" y="20" width="150" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="395" y="42" font-weight="bold">28장 TRFAE</text>
<text x="395" y="62" font-size="12">허용된 오류, 재귀 클로저</text>
<rect x="490" y="20" width="140" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="560" y="42" font-weight="bold">29장 ATFAE</text>
<text x="560" y="62" font-size="12">타입 이름의 스코프</text>
<rect x="490" y="96" width="140" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="560" y="118" font-weight="bold">32장 TIFAE</text>
<text x="560" y="138" font-size="12">추론의 건전성</text>
<rect x="320" y="166" width="150" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="395" y="188" font-weight="bold">30장 STFAE</text>
<text x="395" y="208" font-size="12">두 가지 서브타입 관계</text>
<rect x="320" y="252" width="150" height="56" rx="4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 3"/>
<text x="395" y="274" font-weight="bold">31장 PTFAE</text>
<text x="395" y="294" font-size="12">논리 관계</text>
</g>
<g fill="none" stroke="currentColor" stroke-width="1.6">
<line x1="106" y1="165" x2="133" y2="165" marker-end="url(#lean-intro-1)"/>
<polyline points="268,150 294,150 294,48 317,48" marker-end="url(#lean-intro-1)"/>
<polyline points="268,165 294,165 294,194 317,194" marker-end="url(#lean-intro-1)"/>
<polyline points="268,180 294,180 294,280 317,280" marker-end="url(#lean-intro-1)"/>
<line x1="470" y1="48" x2="487" y2="48" marker-end="url(#lean-intro-1)"/>
<polyline points="470,62 480,62 480,124 487,124" marker-end="url(#lean-intro-1)"/>
</g>
<g font-size="12" opacity="0.85">
<rect x="490" y="186" width="14" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.6"/>
<text x="512" y="198">문법적 값의 타입</text>
<rect x="490" y="212" width="14" height="14" rx="3" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="4 2"/>
<text x="512" y="224">의미적 논리 관계</text>
</g>
</svg>
</div>
<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 4부의 장 지도. 화살표는 "앞 장의 무엇을 이어받는가"를 나타냅니다.</p>

장마다 다루는 내용은 다음과 같습니다.

- [연료와 결과 분류](./lean-fuel.md)(\\(\mathsf{TFAE}\\)): 모든 증명의 공통 틀을 세웁니다. 연관 리스트 환경, 연료로 움직이는 인터프리터, 귀납적 관계로 쓴 타입 규칙, 값의 타입과 환경의 타입, 결과 분류 `Sound`, 그리고 연료에 대한 귀납법입니다. 구현의 타입 검사기가 타입 규칙과 정확히 같다는 것도 증명합니다.
- [허용된 오류와 재귀](./lean-errors.md)(\\(\mathsf{TRFAE}\\)): 0으로 나누기처럼 타입 시스템이 막지 않는 오류를 정리에 넣는 법과, 순환 환경 없이 재귀 함수를 다루는 재귀 클로저를 봅니다.
- [타입 이름의 스코프](./lean-scopes.md)(\\(\mathsf{ATFAE}\\)): `enum`으로 정의한 타입 이름은 전역이 아니라 영역을 가집니다. 값의 타입을 타입 정의에 따라 매개변수화하고, 앞에서 말한 반례도 여기서 봅니다.
- [두 가지 서브타입 관계](./lean-subtyping.md)(\\(\mathsf{STFAE}\\)): 구현과 같은 알고리즘적 서브타입 관계와 추이성을 가진 선언적 관계를 함께 다룹니다. 선언적 관계의 유도를 알고리즘적 관계의 유도로 옮겨서, 선언적 규칙에 대해서도 타입 안전성을 얻는 법을 봅니다.
- [논리 관계](./lean-logical-relations.md)(\\(\mathsf{PTFAE}\\)): 다형성 앞에서는 문법적으로 정의한 값의 타입이 무너집니다. 타입을 값의 집합으로 해석하는 <a id="g-logical-relation"></a>논리 관계(logical relation)로 넘어가고, 슬라이드 초판 규칙의 반례를 봅니다.
- [타입 추론의 건전성](./lean-inference.md)(\\(\mathsf{TIFAE}\\)): 타입 검사가 아니라 타입 추론 알고리즘이 낸 결과가 옳다는 것을 증명합니다. 단일화와 let 다형성을 다루고, 4부를 마무리합니다.

증명 기법으로 보면 크게 두 갈래입니다. 31장을 뺀 모든 장은 값의 타입을 귀납적 명제로 정의하고 연료에 대한 귀납법으로 증명하는 **문법적** 방법을 씁니다. 31장은 타입마다 "그 타입답게 행동하는 값의 집합"을 정의하는 **의미적** 방법, 즉 논리 관계를 씁니다. 27장은 모든 장의 바탕이므로 꼭 먼저 읽기를 권합니다. 그다음은 지도의 화살표를 따라 관심 있는 장으로 가도 됩니다.

지금은 2부의 언어만 다루지만, 3부(21장부터 25장까지)의 언어들(\\(\mathsf{FJ}\\), \\(\mathsf{BTFAE}\\), \\(\mathsf{TCFAE}\\), \\(\mathsf{LTFAE}\\), \\(\mathsf{GTFAE}\\))에 대한 Lean 타입 안전성 증명도 나중에 4부에 더할 예정입니다(준비 중).

## 이만큼의 Lean은 알고 오세요

4부는 Lean을 가르치지 않습니다. Lean 문법이나 <a id="g-tactic"></a>전술(tactic)이 처음 나올 때 한 문장 정도로 짚기는 하지만, 그 이상의 설명은 다음 절에 소개하는 좋은 자료들에 맡깁니다. 다음 점검표의 항목을 대략 알고 있다면 4부를 따라오는 데 충분합니다.

**프로그래밍 언어로서의 Lean**

- `inductive`로 정의하는 <a id="g-inductive-type"></a>귀납 타입(inductive type)과 그 생성자. Scala의 `enum`과 같은 역할입니다. 예를 들어 타입 `Ty`는 `num`과 `arrow` 두 생성자로 정의됩니다.
- `def`와 패턴 매칭(`match`, 또는 `| 패턴 => 결과`를 나열하는 정의). 리스트나 자연수에 대한 <a id="g-structural-recursion"></a>구조적 재귀(structural recursion)는 Lean이 끝난다는 것을 알아서 확인합니다.
- `Option`, `List`, 쌍 `α × β`, `Except ε α` 같은 기본 타입. 암묵적 인자 `{α : Type}`와 점 표기 `.num`(기대하는 타입에서 생성자 이름을 찾음).

**논리로서의 Lean**

- 명제는 `Prop` 타입의 값이고, 증명은 그 명제 타입의 값입니다. `∀`, `∃`, `∧`, `∨`, `→`, `¬`, `↔`를 읽을 수 있어야 합니다.
- `Prop`과 `Bool`의 차이. `Bool`은 계산해서 `true`나 `false`가 나오는 값이고, `Prop`은 참인지 거짓인지를 증명으로 보여야 하는 문장입니다. `Bool` 값이 명제 자리에 오면 Lean은 `= true`를 붙여 읽습니다.
- 결과가 `Prop`인 `inductive`, 곧 <a id="g-inductive-proposition"></a>귀납적 명제(inductive proposition). 생성자 하나가 추론 규칙 하나입니다. 4부의 타입 규칙은 모두 이렇게 정의합니다.
- `theorem 이름 (가정) : 결론 := 증명`. 증명을 항으로 바로 쓰거나, `by` 뒤에 전술을 나열해 만듭니다.

**4부에서 주로 쓰는 전술**

- `intro x h`: 목표 `∀ x, A → B`에서 `x`와 가정 `h : A`를 꺼냅니다.
- `exact t`: 항 `t`로 목표를 바로 증명합니다.
- `apply f`, `refine t`: 결론이 목표와 맞는 `f`를 적용하고 전제를 새 목표로 남깁니다. `refine`은 `t` 안의 `?_` 자리를 새 목표로 남깁니다.
- `constructor`: 목표에 맞는 생성자를 적용합니다. 목표가 `A ∧ B`이면 두 목표로 나눕니다.
- `cases h`: `h`를 생성자별로 나눕니다. 가정이 타입 유도이면 마지막 규칙으로 나누는 <a id="g-inversion"></a>역전(inversion)이 됩니다.
- `induction n generalizing x`: `n`에 대한 귀납법입니다. `generalizing`은 귀납 가정이 모든 `x`에 대해 성립하도록 일반화합니다.
- `obtain ⟨v, h1, h2⟩ := h`: `h : ∃ v, A ∧ B`를 풀어 이름을 붙입니다.
- `by_cases h : P`: `P`인 경우와 아닌 경우로 나눕니다.
- `subst h`, `rw [h]`: 등식 `h`로 변수를 없애거나 다시 씁니다.
- `simp`, `simp only [f]`: 정의 `f`와 단순화 규칙으로 목표를 계산합니다.
- `rfl`, `decide`, `trivial`: 계산하면 양변이 같은 등식, 계산으로 판정할 수 있는 명제, `True` 같은 자명한 목표를 닫습니다.

이 정도면 됩니다. 처음에는 전술이 하는 일을 정확히 몰라도 괜찮습니다. 아래에서 소개하는 대로 VS Code에서 증명 한 줄 한 줄에 커서를 두고 목표가 어떻게 바뀌는지 보면 금세 익숙해집니다.

## 공부할 자료

Lean을 처음 접한다면 다음 공식 자료들을 권합니다. 모두 무료로 온라인에서 읽을 수 있습니다.

- [Functional Programming in Lean](https://lean-lang.org/functional_programming_in_lean/): Lean을 프로그래밍 언어로 쓰는 법을 설명하는 공식 입문서입니다. 귀납 타입, 패턴 매칭, 구조적 재귀를 여기서 익히면 됩니다.
- [Theorem Proving in Lean 4](https://lean-lang.org/theorem_proving_in_lean4/): Lean의 논리와 증명, 전술을 체계적으로 설명하는 공식 입문서입니다. 명제와 증명, 귀납 타입, 전술을 다루는 장이 4부와 가장 관련이 깊습니다.
- [Natural Number Game](https://adam.math.hhu.de/#/g/leanprover-community/nng4): 자연수의 성질을 하나씩 증명하며 `rw`, `induction` 같은 전술을 게임처럼 익히는 브라우저 게임입니다. 설치 없이 바로 해 볼 수 있습니다.
- [Lean 학습 자료 모음](https://lean-lang.org/learn/)과 [Lean 언어 레퍼런스](https://lean-lang.org/doc/reference/latest/): Lean 공식 사이트의 문서 모음입니다. 특정 문법이나 전술의 정확한 뜻이 궁금할 때 찾아봅니다.

프로그래밍 언어 이론을 증명 보조기로 다루는 다른 교재도 있습니다. Coq(지금의 Rocq)로 쓴 [Software Foundations](https://softwarefoundations.cis.upenn.edu/)의 1, 2권과 Agda로 쓴 [Programming Language Foundations in Agda](https://plfa.github.io/)는 4부와 같은 종류의 증명을 다른 도구로 보여 줍니다. 진행과 보존 방식의 증명이 궁금하다면 이쪽을 보면 됩니다.

## 코드 실행하기

4부에서 인용하는 코드는 모두 이 책의 Lean 프로젝트에서 그대로 가져온 것입니다(코드 공개 준비 중). 언어마다 독립된 프로젝트가 하나씩 있고, Lean v4.24.0을 쓰며 외부 라이브러리에 기대지 않습니다. 긴 증명은 책에서 뼈대만 보여 주고 나머지를 `...`로 줄였으니, 전체는 프로젝트 파일에서 읽기 바랍니다.

**설치.** [Lean 설치 안내](https://lean-lang.org/install/)를 따라 VS Code와 [Lean 4 확장](https://marketplace.visualstudio.com/items?itemName=leanprover.lean4)을 설치합니다. 확장이 Lean의 버전 관리자인 elan도 함께 설치해 줍니다. elan은 프로젝트 폴더의 `lean-toolchain` 파일을 보고 맞는 버전의 Lean을 자동으로 내려받습니다.

**빌드.** 프로젝트 폴더에서 Lean의 빌드 도구 `lake`로 전체를 검사합니다. 예를 들어 \\(\mathsf{TFAE}\\) 프로젝트에서는 다음과 같습니다.

```text
$ lake build
...
info: TFAE/Soundness.lean:92:0: 'TFAE.no_type_error' depends on axioms: [propext]
...
Build completed successfully (11 jobs).
```

`Build completed successfully`가 나오면 그 프로젝트의 모든 정의와 정리를 Lean 커널이 검사한 것입니다. 중간에 보이는 `depends on axioms` 줄은 정리가 기대는 공리를 보여 주는데, 무엇을 뜻하는지는 [연료와 결과 분류](./lean-fuel.md)에서 설명합니다.

**대화형으로 읽기.** VS Code에서 프로젝트 폴더를 열고 `.lean` 파일을 엽니다. 오른쪽에 Infoview 창이 뜹니다(뜨지 않으면 명령 팔레트에서 "Lean 4: Infoview: Toggle Infoview"). 증명의 `by` 블록 안에 커서를 두면 Infoview에 그 지점의 <a id="g-goal"></a>목표(goal)가 보입니다. `⊢` 위의 줄들이 지금 쓸 수 있는 가정이고, `⊢` 뒤가 증명해야 할 명제입니다. 증명을 한 줄씩 내려가며 목표가 어떻게 바뀌는지 보는 것이 Lean 증명을 읽는 가장 좋은 방법입니다. 이름 위에 마우스를 올리면 타입과 설명이 보이고, F12로 정의를 찾아갈 수 있습니다. `→`, `∀`, `Γ`, `τ` 같은 기호는 `\to`, `\forall`, `\G`, `\t`처럼 역슬래시로 입력합니다.

각 프로젝트는 대략 다음 파일들로 이루어져 있습니다. 위에서 아래로 읽으면 됩니다.

```text
Syntax.lean        타입, 식, 값, 환경
Eval.lean          연료로 움직이는 인터프리터
Typing.lean        타입 규칙
ValueTyping.lean   값의 타입, 환경의 타입, 결과 분류
Lemmas.lean        보조정리
Soundness.lean     주정리
Examples.lean      작은 예제
```

언어에 따라 서브타입 관계(`Subtype.lean`), 논리 관계(`Semantics.lean`), 반례(`Counterexample.lean`) 같은 파일이 더 있습니다.

## 정리

- 손으로 쓴 타입 안전성 증명은 "나머지는 비슷하다"로 넘어간 자리에 구멍이 숨어 있을 수 있습니다. 실제로 \\(\mathsf{ATFAE}\\)의 형식 규칙과 \\(\mathsf{PTFAE}\\) 슬라이드 초판의 규칙 두 개가 건전하지 않았고, Lean으로 증명하다 막힌 자리에서 반례를 찾았습니다.
- **증명 보조기** Lean 4는 커널이 모든 증명을 끝까지 검사합니다. 다만 정리가 의미 있으려면 Lean 정의가 강의의 언어에 **충실**해야 합니다.
- 4부는 작은 걸음 의미의 진행과 보존 대신, 2부의 큰 걸음 인터프리터에 **연료**를 붙여 그 인터프리터에 대해 직접 증명합니다.
- 결과는 연료 부족(`none`), 오류, 값의 세 갈래이고, `Sound r P`는 각각 "아무 주장 없음", "허용된 오류", "`P`를 만족하는 값"을 뜻합니다. 주정리는 "타입이 맞는 <a id="g-closed-expression"></a>닫힌 식은 어떤 연료로 실행해도 `Sound`"이고, 따름정리는 타입 오류가 없다는 것입니다.
- 정리가 모든 연료에 대해 성립하므로, 끝나는 실행에 대해서는 원래 인터프리터에 대한 정리가 됩니다.
- 4부의 장은 증명 아이디어별로 나뉩니다. 27장이 공통 틀을 세우고, 28장부터 32장까지가 허용된 오류와 재귀, 타입 이름의 스코프, 두 가지 서브타입 관계, 논리 관계, 타입 추론의 건전성을 차례로 다룹니다.

## 연습 문제

1. 다음 각 프로그램에 대해 Lean의 주정리가 무엇을 말해 주는지(또는 아무것도 말해 주지 않는지) 설명해 보세요. 결과의 세 갈래 가운데 어느 것이 가능한지로 답하면 됩니다.

   ```pl
   /* TFAE */  ((x: Number) => x + 1)(41)
   /* TRFAE */ 10 / 0
   /* TRFAE */ def f(x: Number): Number = f(x); f(0)
   /* TFAE */  1(2)
   ```

2. `Sound`의 연료 부족 칸을 `True` 대신 `False`로 바꾸면, "모든 연료 `n`에 대해 `Sound`"라는 주정리는 왜 어떤 언어에서도 거짓이 되나요? 대신 "충분히 큰 연료 `n`이 **있어서** `Sound`"라고 바꾸면 무엇을 주장하게 되나요? 이 정리가 \\(\mathsf{TRFAE}\\)에서 거짓인 이유를 예로 들어 설명해 보세요.

3. 진행과 보존 방식의 증명과 이 책의 연료 방식의 증명이 각각 어떤 의미 정의를 요구하는지 비교해 보세요. 이미 큰 걸음 인터프리터가 있는 언어에서 연료 방식이 편한 이유는 무엇인가요?

4. 이 장에서 말한 \\(\mathsf{ATFAE}\\)의 반례 프로그램 `enum A { case X(Number); case X(Boolean) }`을 쓰는 식을 하나 만들어, 타입 검사를 통과하지만 실행하면 타입 오류가 나도록 해 보세요. τ-Match 규칙이 매치 경우를 배리언트와 위치로 맞추고, 같은 이름의 배리언트를 막지 않는다고 가정합니다. 답은 [타입 이름의 스코프](./lean-scopes.md)에서 확인할 수 있습니다.

5. 이 장의 Lean 점검표에서 잘 모르는 항목을 골라, [Theorem Proving in Lean 4](https://lean-lang.org/theorem_proving_in_lean4/)나 [Natural Number Game](https://adam.math.hhu.de/#/g/leanprover-community/nng4)에서 해당하는 부분을 찾아 공부해 보세요.
