# 변경 가능한 자료 구조

지금까지 만든 언어들은 모두 <a id="g-purely-functional"></a>**순수 함수형(purely functional)** 언어였습니다. 모든 함수는 <a id="g-pure"></a>**순수(pure)** 해서 **부수 효과(side effect)** 가 없었고, 모든 자료 구조와 변수는 **불변(immutable)** 이라서 한 번 만들어지면 바뀌지 않았습니다. 같은 식은 언제 계산해도 같은 값을 냈지요.

하지만 현실의 프로그램에서는 **변경(mutation)** 이 아주 널리 쓰입니다. 특히 C, C++, Java, Python 같은 <a id="g-imperative-language"></a>**명령형 언어(imperative language)** 에서는 변경이 일상입니다. 변경을 쓰면 자료 구조나 변수를 만든 **뒤에** 그 내용을 고쳐서 프로그램의 <a id="g-state"></a>**상태(state)** 를 바꿀 수 있습니다. 변경에는 크게 두 종류가 있습니다.

- <a id="g-mutable-data-structure"></a>**변경 가능한 자료 구조(mutable data structure)**: 예를 들어 Scala의 `mutable.Map`
- **변경 가능한 변수(mutable variable)**: 예를 들어 Scala의 `var`

변경은 더 **효율적인** 프로그램을 쓰게 도와주지만, 프로그램을 **이해하기 어렵게** 만들고 **실수하기 쉽게** 만들기도 합니다. 이 장에서는 그중 변경 가능한 자료 구조를 배웁니다. FAE에 가장 단순한 변경 가능한 자료 구조인 <a id="g-box"></a>**상자(box)** 를 더한 언어 **BFAE**를 만들고, 그 의미를 정하기 위해 <a id="g-memory"></a>**메모리(memory)** 라는 새로운 개념을 도입합니다. 변경 가능한 변수는 다음 장 [변경 가능한 변수](./mutable-variables.md)에서 다룹니다.

이 장에서 만들 `BFAE` 인터프리터를 먼저 돌려 봅시다. 프로그램을 고쳐 가며 실행해 보세요.

<div class="playground" data-lang="BFAE"></div>

## 변경 가능한 자료 구조

**변경 가능한 자료 구조**는 만든 뒤에도 그 **내용**을 **고칠** 수 있는 자료 구조입니다. Scala에서 불변 맵과 변경 가능한 맵을 비교해 봅시다.

```scala
// immutable map
val imap = Map("x" -> 1, "y" -> 2)
imap + ("x" -> 3)   // Map(x -> 3, y -> 2)
imap                // Map(x -> 1, y -> 2)
// mutable map
val mmap = scala.collection.mutable.Map("x" -> 1, "y" -> 2)
mmap.update("x", 3)
mmap                // mutable.Map(x -> 3, y -> 2)
```

불변 맵 `imap`에 `+`를 하면 **새** 맵이 만들어질 뿐, `imap` 자체는 그대로입니다. 반면 변경 가능한 맵 `mmap`에 `update`를 하면 `mmap`의 내용 자체가 바뀝니다.

우리만의 변경 가능한 자료 구조도 만들 수 있습니다. 값 하나를 담는 **상자(Box)** 입니다.

```scala
case class Box(var content: Int)
val box: Box = Box(5)
box.content           // 5
box.content = 8
box.content           // 8
```

상자는 내용물 하나를 담고 있고, 그 내용물을 꺼내 보거나 다른 것으로 바꿔 넣을 수 있습니다. 가장 단순한 변경 가능한 자료 구조이지만, 배열이나 객체의 필드 같은 더 복잡한 자료 구조도 결국 이런 상자를 여러 개 모아 놓은 것이라고 볼 수 있습니다.

## BFAE: 변경 가능한 상자가 있는 FAE

이제 FAE를 **BFAE**로 확장해서 변경 가능한 상자를 지원해 봅시다.

```bfae,run
/* BFAE */
val box = Box(5);
box.get;        // 5
box.set(8);
box.get         // 8
```

```bfae,run
/* BFAE */
val box = Box(1);
val f   = x => x + box.get;
f(3);           // 3 + 1 = 4
box.set(2);
f(3)            // 3 + 2 = 5
```

(BFAE에서도 변수 정의 `val`은 [람다 계산](./lambda-calculus.md) 장에서 본 것처럼 문법 설탕으로 지원합니다.)

두 번째 예가 흥미롭습니다. `f(3)`을 두 번 호출했는데 결과가 다릅니다! 순수 함수형 언어에서는 있을 수 없는 일이지요. 함수 `f`가 기억하는 것은 상자 `box` 자체이고, 그 상자의 내용물이 중간에 `box.set(2)`로 바뀌었기 때문입니다.

BFAE를 만들려면 FAE의 식에 다음 세 가지를 더해야 합니다.

1. **상자 만들기**(`Box`)
2. **상자 연산**: 내용물 읽기(`get`)와 내용물 쓰기(`set`)
3. 식의 <a id="g-sequence"></a>**순차 실행(sequence)**

세 번째가 왜 필요한지 궁금할 수 있습니다. 순수한 언어에서는 식을 계산한 결과 값을 쓰지 않을 거라면 계산할 이유가 없었습니다. 하지만 이제는 `box.set(8)`처럼 값보다 **효과**(상자의 내용을 바꾸는 것)가 목적인 식이 생겼습니다. 그래서 "앞의 식을 계산하고(그 값은 버리고), 이어서 뒤의 식을 계산하라"는 `e1; e2`가 필요합니다.

### 구체 문법

BFAE의 구체 문법(concrete syntax)을 BNF로 정의하면 다음과 같습니다.

```bnf
// expressions
<expr> ::= ...
         | "Box" "(" <expr> ")"                // box creation
         | <expr> "." "get"                    // box content getter
         | <expr> "." "set" "(" <expr> ")"     // box content setter
         | <expr> ";" <expr>                   // sequence
```

### 추상 문법

BFAE의 추상 문법(abstract syntax)을 BNF로 정의하고, Scala의 대수적 데이터 타입으로 옮기면 다음과 같습니다.

\\[
\begin{array}{llcll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots & \\\\
& & \mid & \texttt{Box}(e) & (\texttt{NewBox}) \\\\
& & \mid & e\texttt{.get} & (\texttt{GetBox}) \\\\
& & \mid & e\texttt{.set}(e) & (\texttt{SetBox}) \\\\
& & \mid & e;\ e & (\texttt{Seq})
\end{array}
\\]

```scala
enum Expr:
  ...
  // box creation
  case NewBox(expr: Expr)
  // box content getter
  case GetBox(box: Expr)
  // box content setter
  case SetBox(box: Expr, expr: Expr)
  // sequence
  case Seq(left: Expr, right: Expr)
```

## BFAE의 인터프리터와 자연 의미

### 메모리를 이용한 계산

다음 BFAE 식은 어떻게 계산해야 할까요?

```bfae,run
/* BFAE */
val box = Box(5);
box.get;    // 5
box.set(8);
box.get     // 8
```

지금까지 쓴 환경만으로는 부족합니다. 환경은 이름을 값에 묶어 줄 뿐이고, 한 번 묶이면 바뀌지 않기 때문입니다. 그래서 **메모리**를 도입합니다. 메모리 \\( M \\)은 <a id="g-address"></a>**주소(address)** 를 그 주소에 저장된 **값**에 대응시키는 유한한 **매핑**입니다.

\\[
M \in \mathbb{A} \xrightarrow{\text{fin}} \mathbb{V}
\\]

상자는 메모리에 <a id="g-memory-cell"></a>**메모리 칸(memory cell)** 하나를 잡아 값을 저장합니다.

- **상자 만들기**는 메모리 칸을 새로 <a id="g-allocation"></a>**할당(allocation)** 하고 값을 저장합니다.
- **내용물 읽기**는 그 메모리 칸에서 값을 읽습니다.
- **내용물 쓰기**는 그 메모리 칸에 값을 씁니다.

그리고 상자 자체의 값은 그 메모리 칸의 **주소**입니다. 환경은 이름을 주소에 묶고, 메모리는 주소를 값에 묶는 두 단계 구조입니다. 위의 식을 한 줄씩 계산하며 환경 \\( \sigma \\)와 메모리 \\( M \\)이 어떻게 변하는지 따라가 봅시다. 바뀐 부분은 굵게 표시했습니다.

| 막 계산한 식 | \\( \sigma \\) | \\( M \\) |
|---|---|---|
| (시작) | \\( [] \\) | \\( [] \\) |
| `val box = Box(5);` | \\( [\texttt{box} \mapsto a_0] \\) | \\( [\boldsymbol{a_0 \mapsto 5}] \\) |
| `box.get;` (값 `5`) | \\( [\texttt{box} \mapsto a_0] \\) | \\( [a_0 \mapsto 5] \\) |
| `box.set(8);` | \\( [\texttt{box} \mapsto a_0] \\) | \\( [\boldsymbol{a_0 \mapsto 8}] \\) |
| `box.get` (값 `8`) | \\( [\texttt{box} \mapsto a_0] \\) | \\( [a_0 \mapsto 8] \\) |

`Box(5)`가 빈 주소 \\( a_0 \\)에 `5`를 저장하고, `box`는 그 주소 \\( a_0 \\)에 묶입니다. `box.set(8)`은 환경은 건드리지 않고 메모리의 \\( a_0 \\) 칸만 `8`로 고칩니다. 그래서 마지막 `box.get`은 `8`을 돌려줍니다.

조금 더 복잡한 예를 봅시다.

```bfae,run
/* BFAE */
val a = Box(1);
val f = x => x + a.get;
f(5);

a.set(2);
f(5);

val b = Box(a);
b.get.set(3);
f(5)
```

| 막 계산한 식 | \\( \sigma \\)에 새로 생긴 것 | \\( M \\) |
|---|---|---|
| (시작) | | \\( [] \\) |
| `val a = Box(1);` | \\( \texttt{a} \mapsto a_0 \\) | \\( [\boldsymbol{a_0 \mapsto 1}] \\) |
| `val f = x => x + a.get;` | \\( \texttt{f} \mapsto \langle \lambda \texttt{x}.\texttt{x}\ \texttt{+}\ \texttt{a.get}, [\texttt{a} \mapsto a_0] \rangle \\) | \\( [a_0 \mapsto 1] \\) |
| `f(5);` (값 `5 + 1 = 6`) | | \\( [a_0 \mapsto 1] \\) |
| `a.set(2);` | | \\( [\boldsymbol{a_0 \mapsto 2}] \\) |
| `f(5);` (값 `5 + 2 = 7`) | | \\( [a_0 \mapsto 2] \\) |
| `val b = Box(a);` | \\( \texttt{b} \mapsto a_1 \\) | \\( [a_0 \mapsto 2, \boldsymbol{a_1 \mapsto a_0}] \\) |
| `b.get.set(3);` | | \\( [\boldsymbol{a_0 \mapsto 3}, a_1 \mapsto a_0] \\) |
| `f(5)` (값 `5 + 3 = 8`) | | \\( [a_0 \mapsto 3, a_1 \mapsto a_0] \\) |

마지막 줄까지 계산한 뒤의 상태를 그림으로 그리면 다음과 같습니다. 환경은 이름을 주소에, 메모리는 주소를 값에 묶습니다. 메모리 칸 \\( a_1 \\)에는 다른 칸의 주소 \\( a_0 \\)가 들어 있습니다.

<div style="text-align:center">
<svg viewBox="0 0 640 230" width="100%" style="max-width: 640px; letter-spacing: normal; word-spacing: normal" font-family="monospace" font-size="16">
  <defs>
    <marker id="bfae-arr" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z" fill="currentColor"/>
    </marker>
  </defs>
  <text x="90" y="22" text-anchor="middle" fill="currentColor" font-family="serif" font-size="18">환경 σ</text>
  <rect x="20" y="40" width="140" height="170" rx="6" fill="none" stroke="currentColor"/>
  <text x="40" y="83" fill="currentColor">a ↦ a₀</text>
  <text x="40" y="133" fill="currentColor">f ↦ ⟨λx…⟩</text>
  <text x="40" y="183" fill="currentColor">b ↦ a₁</text>
  <text x="475" y="22" text-anchor="middle" fill="currentColor" font-family="serif" font-size="18">메모리 M</text>
  <rect rx="3" x="340" y="70" width="120" height="44" fill="#2a408e"/>
  <text x="400" y="98" text-anchor="middle" fill="white">3</text>
  <text x="400" y="136" text-anchor="middle" fill="currentColor">a₀</text>
  <rect rx="3" x="490" y="70" width="120" height="44" fill="#2a408e"/>
  <text x="550" y="98" text-anchor="middle" fill="white">a₀</text>
  <text x="550" y="136" text-anchor="middle" fill="currentColor">a₁</text>
  <path d="M112,78 C200,70 280,88 336,90" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#bfae-arr)"/>
  <path d="M112,178 C380,205 590,190 592,118" fill="none" stroke="currentColor" stroke-width="1.5" marker-end="url(#bfae-arr)"/>
  <path d="M530,70 C510,38 430,38 410,66" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" marker-end="url(#bfae-arr)"/>
</svg>
</div>

몇 가지를 눈여겨볼 만합니다.

- 클로저 `f`의 환경 \\( [\texttt{a} \mapsto a_0] \\)는 끝까지 바뀌지 않습니다. 그런데도 `f(5)`의 결과가 6, 7, 8로 바뀌는 이유는, 환경이 기억하는 것이 값이 아니라 **주소**이고 그 주소의 내용물이 바뀌기 때문입니다.
- `Box(a)`는 상자 `a`를 담는 상자입니다. `a`의 값은 주소 \\( a_0 \\)이므로, 새 칸 \\( a_1 \\)에는 **주소** \\( a_0 \\)가 저장됩니다. 상자도 값이므로 상자 안에 넣을 수 있습니다.
- `b.get.set(3)`에서 `b.get`은 \\( a_1 \\)의 내용물인 주소 \\( a_0 \\), 즉 상자 `a` 자체입니다. 그래서 `b.get.set(3)`은 `a.set(3)`과 같은 효과를 내고, 이름 `a`를 한 번도 쓰지 않았는데도 `a`의 내용물이 바뀝니다. 이처럼 같은 메모리 칸을 여러 경로로 가리키는 것을 <a id="g-aliasing"></a>**별칭(aliasing)** 이라고 합니다. 변경이 프로그램을 이해하기 어렵게 만드는 대표적인 이유입니다.

### 인터프리터와 자연 의미

BFAE를 위해서는 1) 환경과 **메모리**를 함께 쓰는 **인터프리터**를 구현해야 합니다. 핵심은 `interp`가 메모리를 인자로 받을 뿐 아니라, 계산 도중 **바뀐 메모리를 결과로 함께 돌려준다**는 점입니다.

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = ???
```

```scala
type Addr = Int
type Mem = Map[Addr, Value]
enum Value:
  ...
  case BoxV(addr: Addr)
```

주소는 정수로, 메모리는 주소에서 값으로 가는 맵으로 나타냅니다. 상자 값 `BoxV`는 주소 하나를 담습니다.

그리고 2) 환경과 **메모리**를 쓰는 **자연 의미**를 정의합니다. 판단의 모양이 \\( \sigma, M \vdash e \Rightarrow v, M \\)로 바뀝니다. "환경 \\( \sigma \\)와 메모리 \\( M \\)에서 식 \\( e \\)를 계산하면 값 \\( v \\)와 새 메모리가 나온다"는 뜻입니다.

\\[
\begin{array}{llcll}
\text{Addresses} & a & \in & \mathbb{A} & (\texttt{Addr}) \\\\
\text{Memories} & M & \in & \mathbb{A} \xrightarrow{\text{fin}} \mathbb{V} & (\texttt{Mem}) \\\\
\text{Values} & \mathbb{V} \ni v & ::= & \ldots \mid a & (\texttt{BoxV})
\end{array}
\\]

> **생각해 보기.** 환경 `env`는 결과로 돌려주지 않는데, 왜 메모리 `mem`은 돌려줘야 할까요? 환경은 정적 스코핑을 따르므로 부분식을 계산하고 나면 원래 환경으로 돌아오지만, 메모리의 변화는 계산이 끝난 뒤에도 **계속 남아야** 하기 때문입니다.

### 덧셈

덧셈부터 봅시다. 계산할 부분식이 여럿일 때는 메모리를 **순서대로 이어서** 넘겨 주는 것이 핵심입니다. 왼쪽 식을 \\( M \\)에서 계산해 \\( M_1 \\)을 얻고, 오른쪽 식은 \\( M \\)이 아니라 \\( M_1 \\)에서 계산합니다.

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case Add(l, r) =>
    val (lv, lmem) = interp(l, env, mem)
    val (rv, rmem) = interp(r, env, lmem)
    (numAdd(lv, rv), rmem)
```

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow n_1, M_1$}
\AxiomC{$\sigma, M_1 \vdash e_2 \Rightarrow n_2, M_2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\sigma, M \vdash e_1\ \texttt{+}\ e_2 \Rightarrow n_1 + n_2, M_2$}
\end{prooftree}
\\]

왜 이렇게까지 해야 할까요? 다음 예를 봅시다.

```bfae,run
/* BFAE */
val x = Box(5);
{ x.set(8); 2 } + x.get // 2 + 8 = 10 -- NOT 2 + 5 = 7
```

왼쪽 식 `{ x.set(8); 2 }`는 값 `2`를 내면서 동시에 `x`의 내용물을 `8`로 바꿉니다. 오른쪽 식 `x.get`은 그 바뀐 메모리에서 계산되어야 하므로 `8`을 읽습니다. 그래서 결과는 `10`입니다. 만약 오른쪽 식을 원래 메모리 \\( M \\)에서 계산했다면 `5`를 읽어 `7`이 나왔을 텐데, 이는 왼쪽 식의 효과가 사라져 버린 셈입니다. 이 규칙은 **왼쪽부터 오른쪽으로** 계산한다는 계산 순서도 정해 줍니다.

<div style="text-align:center">
<svg viewBox="0 0 650 175" width="100%" style="max-width: 620px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="메모리를 이어서 넘기기: M에서 왼쪽 식을 계산해 M1을 얻고, M1에서 오른쪽 식 x.get을 계산해 8을 읽는다. 결과는 2 + 8 = 10" font-family="sans-serif" fill="currentColor">
<defs><marker id="bfae-f2-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="52.0" y="34" text-anchor="middle" fill="currentColor" font-size="15" font-style="italic">M</text>
<rect x="10" y="44" width="84" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="52.0" y="67" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">0</tspan> ↦ 5</text>
<text x="366.0" y="34" text-anchor="middle" fill="currentColor" font-size="15" font-style="italic">M<tspan baseline-shift="sub" font-size="72%">1</tspan></text>
<rect x="324" y="44" width="84" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="366.0" y="67" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">0</tspan> ↦ 8</text>
<text x="602.0" y="34" text-anchor="middle" fill="currentColor" font-size="15" font-style="italic">M<tspan baseline-shift="sub" font-size="72%">2</tspan></text>
<rect x="560" y="44" width="84" height="36" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="602.0" y="67" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">a<tspan baseline-shift="sub" font-size="72%">0</tspan> ↦ 8</text>
<rect rx="3" x="124" y="44" width="170" height="36" fill="#2a408e"/>
<text x="209.0" y="67" text-anchor="middle" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">{ x.set(8); 2 }</text>
<rect rx="3" x="438" y="44" width="92" height="36" fill="#2a408e"/>
<text x="484.0" y="67" text-anchor="middle" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">x.get</text>
<path d="M94,62.0 L122,62.0" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#bfae-f2-m0)"/>
<path d="M294,62.0 L322,62.0" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#bfae-f2-m0)"/>
<path d="M408,62.0 L436,62.0" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#bfae-f2-m0)"/>
<path d="M530,62.0 L558,62.0" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#bfae-f2-m0)"/>
<rect x="270" y="128" width="150" height="34" rx="6" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="345" y="150" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">2 + 8 = 10</text>
<path d="M209,82 L280,126" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#bfae-f2-m0)"/>
<path d="M484,82 L410,126" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#bfae-f2-m0)"/>
<text x="232" y="112" text-anchor="end" fill="currentColor" font-size="13">값 2</text>
<text x="462" y="112" text-anchor="start" fill="currentColor" font-size="13">값 8</text>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 왼쪽 식이 바꾼 메모리 \( M_1 \)이 오른쪽 식으로 이어지므로, <code>x.get</code>은 8을 읽습니다.</p>

곱셈 `Mul`도 똑같은 방식으로 메모리를 이어서 넘깁니다. 숫자 `Num`, 식별자 `Id`, 함수 `Fun`은 메모리를 바꾸지 않으므로 받은 메모리를 그대로 돌려줍니다. 함수 호출 `App`은 함수 식, 인자 식, 몸통을 차례로 계산하며 메모리를 이어서 넘깁니다.

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case App(f, a) =>
    val (fv, fmem) = interp(f, env, mem)
    fv match
      case CloV(p, b, fenv) =>
        val (av, amem) = interp(a, env, fmem)
        interp(b, fenv + (p -> av), amem)
      case _ =>
        error(s"not a function: ${fv.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow \langle \lambda x.e_3, \sigma' \rangle, M_1$}
\AxiomC{$\sigma, M_1 \vdash e_2 \Rightarrow v_2, M_2$}
\AxiomC{$\sigma'[x \mapsto v_2], M_2 \vdash e_3 \Rightarrow v_3, M_3$}
\LeftLabel{$\texttt{App}$}
\TrinaryInfC{$\sigma, M \vdash e_1(e_2) \Rightarrow v_3, M_3$}
\end{prooftree}
\\]

### 상자 만들기

`Box(e)`는 먼저 \\( e \\)를 계산해 값 \\( v \\)와 메모리 \\( M_1 \\)을 얻습니다. 그다음 \\( M_1 \\)에서 아직 쓰이지 않은 주소 \\( a \\)를 골라 \\( v \\)를 저장하고, 그 주소 \\( a \\)를 상자의 값으로 돌려줍니다.

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case NewBox(c) =>
    val (cv, cmem) = interp(c, env, mem)
    val addr = malloc(cmem)
    (BoxV(addr), cmem + (addr -> cv))
```

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e \Rightarrow v, M_1$}
\AxiomC{$a \notin \text{Dom}(M_1)$}
\LeftLabel{$\texttt{NewBox}$}
\BinaryInfC{$\sigma, M \vdash \texttt{Box}(e) \Rightarrow a, M_1[a \mapsto v]$}
\end{prooftree}
\\]

규칙은 "\\( M_1 \\)의 정의역(domain)에 없는 아무 주소"라고만 말할 뿐, 어떤 주소를 고를지는 정하지 않습니다. 인터프리터에서는 `malloc` 함수가 이 일을 맡습니다. `malloc`을 구현하는 한 가지 방법은 메모리에서 가장 큰 주소를 찾아 1을 더하고, 메모리가 비어 있으면 `0`을 쓰는 것입니다.

```scala
def malloc(mem: Mem): Addr = mem.keySet.maxOption.fold(0)(_ + 1)
```

> **자주 하는 실수.** 새 주소는 \\( M \\)이 아니라 \\( e \\)를 계산한 **뒤의** 메모리 \\( M_1 \\)에서 골라야 합니다. 예를 들어 `Box(Box(1))`에서 안쪽 `Box(1)`이 이미 주소 `0`을 차지했는데 바깥 상자의 주소를 원래 메모리에서 고르면, 다시 `0`을 골라 안쪽 상자를 덮어써 버립니다.

### 내용물 읽기

`e.get`은 \\( e \\)를 계산해 주소 \\( a \\)를 얻은 뒤, 메모리에서 그 주소의 값 \\( M_1(a) \\)를 읽어 돌려줍니다. 메모리는 바뀌지 않습니다. \\( e \\)의 값이 상자가 아니면 오류입니다.

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case GetBox(b) =>
    val (bv, bmem) = interp(b, env, mem)
    bv match
      case BoxV(addr) => (bmem(addr), bmem)
      case _          => error(s"not a box: ${bv.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e \Rightarrow a, M_1$}
\LeftLabel{$\texttt{GetBox}$}
\UnaryInfC{$\sigma, M \vdash e\texttt{.get} \Rightarrow M_1(a), M_1$}
\end{prooftree}
\\]

### 내용물 쓰기

`e1.set(e2)`는 \\( e_1 \\)을 계산해 주소 \\( a \\)를 얻고, 이어서 \\( e_2 \\)를 계산해 값 \\( v \\)를 얻은 뒤, 메모리의 \\( a \\) 칸을 \\( v \\)로 고칩니다. 식 전체의 값은 새로 저장한 값 \\( v \\)입니다.

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case SetBox(b, c) =>
    val (bv, bmem) = interp(b, env, mem)
    bv match
      case BoxV(addr) =>
        val (cv, cmem) = interp(c, env, bmem)
        (cv, cmem + (addr -> cv))
      case _ =>
        error(s"not a box: ${bv.str}")
```

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow a, M_1$}
\AxiomC{$\sigma, M_1 \vdash e_2 \Rightarrow v, M_2$}
\LeftLabel{$\texttt{SetBox}$}
\BinaryInfC{$\sigma, M \vdash e_1\texttt{.set}(e_2) \Rightarrow v, M_2[a \mapsto v]$}
\end{prooftree}
\\]

메모리를 고치는 기준은 \\( M_1 \\)이 아니라 \\( e_2 \\)까지 계산한 뒤의 \\( M_2 \\)라는 점에 주의하세요. \\( e_2 \\)를 계산하는 동안 생긴 변화도 모두 살아 있어야 하니까요.

### 순차 실행

`e1; e2`는 \\( e_1 \\)을 계산하되 그 **값은 버리고** 메모리 \\( M_1 \\)만 챙긴 뒤, \\( M_1 \\)에서 \\( e_2 \\)를 계산합니다. 식 전체의 값과 메모리는 \\( e_2 \\)의 것입니다.

```scala
def interp(expr: Expr, env: Env, mem: Mem): (Value, Mem) = expr match
  ...
  case Seq(l, r) =>
    val (_, lmem) = interp(l, env, mem)
    interp(r, env, lmem)
```

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow \\_, M_1$}
\AxiomC{$\sigma, M_1 \vdash e_2 \Rightarrow v_2, M_2$}
\LeftLabel{$\texttt{Seq}$}
\BinaryInfC{$\sigma, M \vdash e_1;\ e_2 \Rightarrow v_2, M_2$}
\end{prooftree}
\\]

규칙의 \\( \\_ \\)는 "어떤 값이든 상관없다"는 뜻입니다. 순수한 언어였다면 \\( e_1 \\)의 계산은 완전히 헛수고였겠지만, 이제는 \\( e_1 \\)이 메모리를 바꿀 수 있으므로 의미가 있습니다.

> **생각해 보기.** 본문의 두 번째 예제 전체를 위의 규칙들로 계산해서, 마지막 값이 `8`이고 최종 메모리가 \\( [a_0 \mapsto 3, a_1 \mapsto a_0] \\)임을 확인해 보세요. `malloc`이 어떤 주소를 고르는지도 함께 따라가 보세요.

## 정리

- 지금까지의 언어는 순수 함수형이었지만, 현실에서는 **변경**이 널리 쓰입니다. 변경은 효율적인 프로그램을 돕지만 프로그램을 이해하기 어렵게 만듭니다.
- **BFAE**는 FAE에 상자 만들기, 내용물 읽기·쓰기, 순차 실행을 더한 언어입니다. 상자의 값은 메모리 칸의 **주소**입니다.

\\[
\begin{array}{llcll}
\text{Expressions} & \mathbb{E} \ni e & ::= & \ldots & \\\\
& & \mid & \texttt{Box}(e) & (\texttt{NewBox}) \\\\
& & \mid & e\texttt{.get} & (\texttt{GetBox}) \\\\
& & \mid & e\texttt{.set}(e) & (\texttt{SetBox}) \\\\
& & \mid & e;\ e & (\texttt{Seq}) \\\\
\text{Values} & \mathbb{V} \ni v & ::= & \ldots \mid a & (\texttt{BoxV})
\end{array}
\\]

- 의미를 정하려면 주소에서 값으로 가는 **메모리** \\( M \\)이 필요합니다. 판단은 \\( \sigma, M \vdash e \Rightarrow v, M \\) 모양이고, 인터프리터 `interp(expr, env, mem)`은 값과 함께 **바뀐 메모리를 돌려줍니다**. 부분식을 계산할 때는 메모리를 순서대로 이어서 넘겨야 합니다.

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e \Rightarrow v, M_1$}
\AxiomC{$a \notin \text{Dom}(M_1)$}
\LeftLabel{$\texttt{NewBox}$}
\BinaryInfC{$\sigma, M \vdash \texttt{Box}(e) \Rightarrow a, M_1[a \mapsto v]$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e \Rightarrow a, M_1$}
\LeftLabel{$\texttt{GetBox}$}
\UnaryInfC{$\sigma, M \vdash e\texttt{.get} \Rightarrow M_1(a), M_1$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow a, M_1$}
\AxiomC{$\sigma, M_1 \vdash e_2 \Rightarrow v, M_2$}
\LeftLabel{$\texttt{SetBox}$}
\BinaryInfC{$\sigma, M \vdash e_1\texttt{.set}(e_2) \Rightarrow v, M_2[a \mapsto v]$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\sigma, M \vdash e_1 \Rightarrow \\_, M_1$}
\AxiomC{$\sigma, M_1 \vdash e_2 \Rightarrow v_2, M_2$}
\LeftLabel{$\texttt{Seq}$}
\BinaryInfC{$\sigma, M \vdash e_1;\ e_2 \Rightarrow v_2, M_2$}
\end{prooftree}
\\]

## 연습 문제

1. 다음 BFAE 식의 결과 값과 최종 메모리를 구하세요(`malloc`은 본문의 구현을 쓴다고 합시다).
   ```pl
   /* BFAE */
   val b = Box(1); b.set(b.get + 1) * b.get
   ```
2. `Add` 규칙의 두 번째 전제를 \\( \sigma, M \vdash e_2 \Rightarrow n_2, M_2 \\)로 바꾸면(즉 \\( M_1 \\) 대신 \\( M \\)을 쓰면) 본문의 예 `{ x.set(8); 2 } + x.get`의 결과는 어떻게 달라지나요? 결론의 메모리는 \\( M_1 \\)과 \\( M_2 \\) 중 무엇이어야 할지도 생각해 보세요.
3. 오른쪽 피연산자를 먼저 계산하는 덧셈 규칙을 써 보세요. 어떤 BFAE 식에서 두 규칙의 결과가 달라지나요?
4. `Box(Box(1)).get.get`을 계산하는 증명 나무를 그려 보세요.
5. 상자를 쓰지 않는 BFAE 식, 즉 FAE 식에서는 메모리가 어떻게 되나요? 이 경우 BFAE의 결과 값이 FAE의 결과 값과 같다는 것을 직관적으로 설명해 보세요.
6. 수업 연습 문제 BFAE([과제 문서](https://github.com/ku-plrg-classroom/docs/tree/main/cose212/bfae))의 `interp` 함수를 구현해 보세요. 제출할 필요는 없지만 시험 문제와 관련될 수 있으니 직접 풀어 보기를 강하게 권합니다.
