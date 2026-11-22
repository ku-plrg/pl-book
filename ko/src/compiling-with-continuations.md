# 컨티뉴에이션으로 컴파일하기

지금까지 우리는 컨티뉴에이션(continuation), 즉 "남은 계산"이라는 개념을 여러 각도에서 살펴보았습니다. [컨티뉴에이션](./continuations.md) 장에서는 FAE 인터프리터를 컨티뉴에이션 전달 방식(continuation-passing style, CPS)으로 다시 쓰고, 컨티뉴에이션을 이용한 작은 걸음 의미를 정의했습니다. [일급 컨티뉴에이션](./first-class-continuations.md) 장에서는 KFAE에서 컨티뉴에이션을 값처럼 다루어 보았습니다.

그런데 이 개념이 정말 실용적인 쓸모가 있을까요? 이번 장에서는 그 대답으로 FAE를 어셈블리처럼 생긴 **저수준 중간 표현**으로 **컴파일**해 봅니다. 함수 호출, 반환, 조건 분기, 심지어 일급 컨티뉴에이션까지, 고수준 언어의 기능 대부분이 결국 "레이블로 점프하기" 하나로 정리되고, 그 다리를 놓아 주는 것이 바로 컨티뉴에이션입니다. 이번 장의 목표는 컴파일러를 완성하는 것이 아니라, 각 변환 단계가 **왜** 필요한지를 작은 예제로 하나씩 이해하는 것입니다.

## 컴파일러

**컴파일러**(compiler)는 한 언어로 쓰인 프로그램을 다른 언어로 쓰인 **동등한** 프로그램으로 번역하는 프로그램입니다. 번역 전의 언어를 <a id="g-source-language"></a>**원본 언어**(source language), 번역 후의 언어를 <a id="g-target-language"></a>**목표 언어**(target language)라고 부릅니다. 보통 원본 언어는 Scala, Python, JavaScript 같은 고수준 언어이고, 목표 언어는 JVM 바이트코드, LLVM IR, 어셈블리 같은 저수준 언어입니다.

<div style="text-align:center">
<svg viewBox="0 0 360 210" width="100%" style="max-width: 360px; letter-spacing: normal; word-spacing: normal" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15">
<defs><marker id="arr-cc1" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="180" y="22" text-anchor="middle" fill="currentColor" font-weight="bold">Source Code <tspan font-weight="normal">(String)</tspan></text>
<polyline points="180,30 180,62" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc1)"/>
<rect rx="3" x="110" y="64" width="140" height="80" fill="#2a408e"/>
<text x="180.0" y="109.0" text-anchor="middle" fill="#fff">Compiler</text>
<polyline points="180,144 180,176" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc1)"/>
<text x="180" y="198" text-anchor="middle" fill="currentColor" font-weight="bold">Machine Code <tspan font-weight="normal">(String)</tspan></text>
</svg>
</div>

전형적인 컴파일 과정은 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 760 520" width="100%" style="max-width: 760px; letter-spacing: normal; word-spacing: normal" xmlns="http://www.w3.org/2000/svg" font-family="sans-serif" font-size="15">
<defs><marker id="arr-cc2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<text x="380" y="26" text-anchor="middle" fill="currentColor" font-weight="bold">Source Code <tspan font-weight="normal">(String)</tspan></text>
<polyline points="380,34 380,56" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc2)"/>
<rect rx="3" x="295" y="58" width="170" height="42" fill="#2a408e"/>
<text x="380.0" y="84.0" text-anchor="middle" fill="#fff">Parser</text>
<rect rx="3" x="20" y="64" width="200" height="30" fill="currentColor" fill-opacity="0.12"/>
<text x="30" y="84" text-anchor="start" fill="currentColor" font-weight="bold">1D-to-2D</text>
<polyline points="222,79 293,79" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
<polyline points="380,102 380,124" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc2)"/>
<text x="380" y="142" text-anchor="middle" fill="currentColor" font-weight="bold">AST <tspan font-weight="normal">(Abstract Syntax Tree)</tspan></text>
<polyline points="380,150 380,172" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc2)"/>
<rect rx="3" x="295" y="174" width="170" height="42" fill="#2a408e"/>
<text x="380.0" y="200.0" text-anchor="middle" fill="#fff">IR Generator</text>
<rect rx="3" x="20" y="180" width="200" height="30" fill="currentColor" fill-opacity="0.12"/>
<text x="30" y="200" text-anchor="start" fill="currentColor" font-weight="bold">Simple-yet-General Form</text>
<polyline points="222,195 293,195" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
<polyline points="380,218 380,240" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc2)"/>
<text x="380" y="258" text-anchor="middle" fill="currentColor" font-weight="bold">IR <tspan font-weight="normal">(Intermediate Representation)</tspan></text>
<polyline points="380,266 380,288" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc2)"/>
<rect rx="3" x="295" y="290" width="170" height="42" fill="#2a408e"/>
<text x="380.0" y="316.0" text-anchor="middle" fill="#fff">Asm Generator</text>
<rect rx="3" x="20" y="296" width="200" height="30" fill="currentColor" fill-opacity="0.12"/>
<text x="30" y="316" text-anchor="start" fill="currentColor" font-weight="bold">Arch-specific Form</text>
<polyline points="222,311 293,311" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
<polyline points="380,334 380,356" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc2)"/>
<text x="380" y="374" text-anchor="middle" fill="currentColor" font-weight="bold">Assembly</text>
<polyline points="380,382 380,404" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc2)"/>
<rect rx="3" x="295" y="406" width="170" height="42" fill="#2a408e"/>
<text x="380.0" y="432.0" text-anchor="middle" fill="#fff">Printer</text>
<rect rx="3" x="20" y="412" width="200" height="30" fill="currentColor" fill-opacity="0.12"/>
<text x="30" y="432" text-anchor="start" fill="currentColor" font-weight="bold">Bit-Sequence</text>
<polyline points="222,427 293,427" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
<polyline points="380,450 380,472" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc2)"/>
<text x="380" y="490" text-anchor="middle" fill="currentColor" font-weight="bold">Machine Code <tspan font-weight="normal">(String)</tspan></text>
<polyline points="515,137 584,137" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc2)"/>
<rect rx="3" x="586" y="117" width="150" height="40" fill="#2a408e"/>
<text x="661.0" y="142.0" text-anchor="middle" fill="#fff">Type Checker</text>
<text x="661" y="177" text-anchor="middle" fill="currentColor">(Optional)</text>
<polyline points="545,246 604,246" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc2)"/>
<polyline points="604,260 545,260" fill="none" stroke="currentColor" stroke-width="2" marker-end="url(#arr-cc2)"/>
<rect rx="3" x="606" y="233" width="140" height="40" fill="#2a408e"/>
<text x="676.0" y="258.0" text-anchor="middle" fill="#fff">Optimization</text>
<polyline points="676,273 676,305" fill="none" stroke="currentColor" stroke-width="2" stroke-dasharray="4 4"/>
<rect rx="3" x="606" y="307" width="140" height="40" fill="#2a408e"/>
<text x="676.0" y="332.0" text-anchor="middle" fill="#fff">IR Analyzer</text>
</svg>
</div>

파서(parser)는 문자열을 추상 문법 트리(AST)로 바꿉니다. 이 과정은 이미 여러 번 보았습니다. <a id="g-type-checker"></a>타입 검사기(type checker)는 AST를 검사하는데, 이것은 다음 장인 [타입 시스템](./type-systems.md)부터 본격적으로 다룹니다. 이번 장에서 집중할 부분은 가운데의 **IR 생성기**(IR generator)입니다. 함수형 언어를 컨티뉴에이션을 이용해 저수준 IR로 바꾸는 방법을 배워 봅시다.

### 목표: 저수준 IR

<a id="g-intermediate-representation"></a>**중간 표현**(intermediate representation, IR)은 컴파일러가 기계어를 만들기 전에 프로그램을 번역해 두는 형태입니다. 우리가 쓸 IR은 어셈블리와 비슷하며, 명령어는 다음과 같습니다.

| 명령어 | 의미 |
|---|---|
| `mov d, s` | `s`를 `d`에 복사 |
| `add d, s1, s2` | `d` ← `s1` + `s2` |
| `mul d, s1, s2` | `d` ← `s1` × `s2` |
| `jmp s` | 레이블 `s`로(또는 `s`에 든 주소로) 점프 |
| `lt d, s1, s2` | `s1` < `s2`이면 `d` ← 1, 아니면 0 |
| `jz s, L` | `s`가 0이면 `L`로 점프 |
| `ld d, s, i` | `d` ← 주소 `s` + `i`의 메모리(**load**) |
| `st d, i, s` | 주소 `d` + `i`의 메모리 ← `s` (**store**) |
| `L:` | <a id="g-label"></a>**레이블**(label): 다음 줄의 주소에 붙인 이름 |

피연산자는 <a id="g-register"></a>**레지스터**(register, `r1`, `r2`, ...), **수**, 또는 **레이블**입니다. 프로그램은 `START`에서 시작하고, 맨 끝에 있는 빈 레이블 `HALT`에 도달하면 멈춥니다.

가장 간단한 예를 보겠습니다.

```text
START:
  add x1, 1, 2
  mov r1, x1
  jmp HALT
HALT:
```

`START`에서 출발해 `add x1, 1, 2`로 \\(1 + 2\\)를 계산해 `x1`에 넣고, `mov r1, x1`로 결과 3을 `r1`에 옮긴 뒤, `jmp HALT`로 `HALT`에 점프해 멈춥니다. 이 장에서는 프로그램의 최종 결과를 항상 `r1`에 남기기로 약속합니다.

### 함수형 언어를 컴파일하려면

FAE를 이 IR로 어떻게 컴파일할 수 있을까요? FAE에는 있지만 IR에는 없는 기능마다 그것을 메워 줄 단계가 하나씩 필요합니다.

| FAE | 저수준 IR | 필요한 단계 |
|---|---|---|
| 중첩된 식 | 명령어 하나에 연산 하나 | **ANF** |
| 분기(`if`) | 조건부 점프 | **ANF**, 레이블 |
| 함수와 호출 | 레이블과 점프 | **CPS**, **람다 끌어올리기** |
| 캡처된 변수 | 메모리의 배열 | **클로저 변환** |
| 무한히 많은 이름 | 몇 개 안 되는 레지스터 | **레지스터 할당** |
| 일급 컨티뉴에이션 | 점프할 레이블 | 추가 작업 없음 |

표의 마지막 줄이 흥미롭습니다. CPS로 바꾸고 나면 일급 컨티뉴에이션은 공짜로 따라옵니다. 이제 각 단계가 왜 필요한지 작은 예제로 하나씩 살펴보겠습니다.

## 식

### A-정규형

IR 명령어 하나는 연산을 **하나**만 하지만, FAE의 식은 얼마든지 **중첩**될 수 있습니다. `1 + 2 * 3`에서 덧셈의 오른쪽 피연산자는 그 자체로 곱셈입니다. 이 간극을 메우는 형태가 <a id="g-a-normal-form"></a>**A-정규형**(A-normal form, ANF)입니다. ANF에서는 모든 피연산자가 **변수**이거나 **상수**입니다.

```text
1 + 2 * 3
```

이 식을 ANF로 바꾸면 다음과 같습니다.

```pl
/* ANF */
val x1 = 2 * 3;
val x2 = 1 + x1;
x2
```

그리고 이것을 IR로 옮기면 다음과 같습니다.

```text
START:
  mul x1, 2, 3
  add x2, 1, x1
  mov r1, x2
  jmp HALT
HALT:
```

ANF는 모든 중간값에 **이름**을 붙이고 계산 **순서**를 고정합니다. 그러고 나면 ANF의 한 줄이 IR 명령어 하나에 그대로 대응하고, 마지막에 결과를 `r1`에 남기기만 하면 됩니다.

IR에서는 `x1`, `x2`, ... 같은 이름을 당분간 필요한 만큼 마음껏 쓰겠습니다. 실제 기계에는 레지스터가 몇 개뿐이지만, 이 이름들은 맨 마지막 단계에서 레지스터로 바뀝니다. 산술 연산만 있다면 이것으로 충분합니다. 그렇다면 **분기**는 어떨까요?

### 분기

FAE에 `if (e) e else e`와 `<`를 추가했다고 합시다.

```pl
/* FAE */
(if (1 < 2) 1 + 2 else 3 * 4) * 5
```

ANF로 바꾸면 조건, 두 갈래, 그 뒤의 계산이 모두 이름을 얻습니다.

```pl
/* ANF */
val x1 = 1 < 2;
val x2 = if (x1) {
  val x3 = 1 + 2;
  x3
} else {
  val x4 = 3 * 4;
  x4
};
val x5 = x2 * 5;
x5
```

이것을 IR로 옮기면 다음과 같습니다.

```text
START:
  lt x1, 1, 2
  jz x1, L1
  add x3, 1, 2
  mov x2, x3
  jmp L2
L1:
  mul x4, 3, 4
  mov x2, x4
L2:
  mul x5, x2, 5
  mov r1, x5
  jmp HALT
HALT:
```

`jz x1, L1`은 조건이 거짓(0)이면 `else` 갈래인 `L1`로 점프하고, 그렇지 않으면 바로 아래의 `then` 갈래를 실행합니다. 두 갈래는 모두 결과를 `x2`에 넣고 `L2`로 갑니다. 여기서 `L2`가 무엇인지 생각해 봅시다. `if` 식이 끝난 다음에 할 일, 즉 "결과에 5를 곱하고 끝내기"가 적힌 곳입니다. 다시 말해 `L2`는 `if`의 **컨티뉴에이션을 레이블로** 나타낸 것입니다.

<div style="text-align:center">
<svg viewBox="0 0 640 340" width="100%" style="max-width: 600px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="분기를 컴파일한 IR의 제어 흐름: START 블록에서 x1이 0이 아니면 바로 아래 then 갈래로, 0이면 L1로 점프한다. then 갈래는 jmp L2로, L1은 그대로 이어서 L2로 간다. L2는 if의 컨티뉴에이션이다" font-family="sans-serif" fill="currentColor">
<defs><marker id="cc-f3-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect rx="3" x="240" y="10" width="160" height="68" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="250" y="31" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">START:</text>
<text x="258" y="49" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">lt x1, 1, 2</text>
<text x="258" y="67" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">jz x1, L1</text>
<rect rx="3" x="60" y="120" width="170" height="68" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="78" y="141" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">add x3, 1, 2</text>
<text x="78" y="159" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">mov x2, x3</text>
<text x="78" y="177" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">jmp L2</text>
<rect rx="3" x="410" y="120" width="170" height="68" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="420" y="141" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">L1:</text>
<text x="428" y="159" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">mul x4, 3, 4</text>
<text x="428" y="177" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">mov x2, x4</text>
<rect rx="3" x="230" y="225" width="180" height="86" fill="#2a408e"/>
<text x="240" y="246" text-anchor="start" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">L2:</text>
<text x="248" y="264" text-anchor="start" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">mul x5, x2, 5</text>
<text x="248" y="282" text-anchor="start" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">mov r1, x5</text>
<text x="248" y="300" text-anchor="start" fill="#fff" font-size="13" font-family="ui-monospace, Menlo, monospace">jmp HALT</text>
<path d="M270,74 C250,95 180,95 160,117" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cc-f3-m0)"/>
<text x="188" y="100" text-anchor="end" fill="currentColor" font-size="12">x1 ≠ 0</text>
<path d="M370,74 C390,95 470,95 490,117" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cc-f3-m0)"/>
<text x="450" y="98" text-anchor="start" fill="currentColor" font-size="12">x1 = 0 (jz)</text>
<path d="M145,192 C150,230 190,260 227,262" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cc-f3-m0)"/>
<text x="150" y="238" text-anchor="end" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">jmp L2</text>
<path d="M495,186 C490,225 450,260 413,262" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cc-f3-m0)"/>
<text x="490" y="238" text-anchor="start" fill="currentColor" font-size="12">이어서 실행</text>
<text x="320" y="334" text-anchor="middle" fill="currentColor" font-size="13" font-weight="bold">L2 = if의 컨티뉴에이션</text>
</svg>
</div>

> **생각해 보기.** `then` 갈래 끝의 `jmp L2`가 없으면 어떻게 될까요? `then` 갈래를 실행한 뒤 `L1`의 `else` 갈래까지 이어서 실행해 `x2`가 12로 덮어써집니다. 레이블은 이름일 뿐 실행 흐름을 끊지 않는다는 점에 주의해야 합니다.

## 함수

### 다시 보기: 컨티뉴에이션 전달 방식

CPS에서 함수는 **반환하지 않습니다**. 대신 컨티뉴에이션 `k`를 받아서 결과를 넘기며 `k`를 호출합니다.

```scala
def double(x: Int): Int = x * 2                    // direct style
double(3) + 1                                      // 7

def doubleK(x: Int, k: Int => Int): Int = k(x * 2) // CPS
doubleK(3, y => y + 1)                             // 7
```

여기서 `y => y + 1`은 `double(3)`을 계산한 **다음에 남은 계산**입니다. 반환이란 결국 "남은 계산으로 결과를 넘기는 것"이라는 점이 CPS에서는 눈에 보이게 드러납니다. 바로 이 점이 함수 호출을 점프로 바꾸는 열쇠입니다.

### CPS 변환

다음 FAE 프로그램을 예로 들어 단계별로 바꾸어 보겠습니다.

```pl
/* FAE */
(x => x * 2)(3) + 1
```

첫째, 호출은 반드시 어딘가로 **돌아가야** 합니다. CPS는 **어디로 돌아갈지**를 함수로 만들어 줍니다. 우선 프로그램 전체의 결과는 `HALT`로 보내기로 합니다.

```pl
/* CPS */
HALT(
  (x => x * 2)(3) + 1
)
```

둘째, 호출 `(x => x * 2)(3)`이 끝난 **다음에** 할 일은 "결과에 1을 더해 `HALT`로 보내기", 즉 `y => HALT(y + 1)`입니다. 이것을 함수에 인자로 넘겨 줍니다.

```pl
/* CPS */
(x => x * 2)(
  3,
  y => HALT(y + 1)
)
```

셋째, 함수는 이 컨티뉴에이션을 매개변수 `k`로 받고, 결과를 `k`에 넘깁니다.

```pl
/* CPS */
((x, k) => k(x * 2))(
  3,
  y => HALT(y + 1)
)
```

넷째, 중간값에 이름을 붙여 ANF로 만듭니다. 이것이 **CPS** 형태입니다.

```pl
/* CPS */
((x, k) => {
  val x1 = x * 2;
  k(x1)
})(
  3,
  y => {
    val x2 = y + 1;
    HALT(x2)
  }
)
```

### 람다 끌어올리기

CPS 형태에는 함수가 두 개 **중첩**되어 있습니다. 하지만 IR에서 코드는 모두 <a id="g-top-level"></a>**최상위**(top level)에 **레이블**과 함께 있어야 합니다. 그래서 중첩된 함수를 하나씩 바깥으로 끌어올립니다.

먼저 `(x, k) => ...`를 최상위로 옮기고 `F1`이라는 이름을 붙인 뒤, 원래 자리에는 그 이름을 씁니다.

```pl
/* CPS */
val F1 = (x, k) => {
  val x1 = x * 2;
  k(x1)
};
F1(
  3,
  y => {
    val x2 = y + 1;
    HALT(x2)
  }
)
```

다음으로 `y => ...`도 같은 방식으로 끌어올려 `K1`이라고 이름 붙입니다.

```pl
/* CPS */
val F1 = (x, k) => {
  val x1 = x * 2;
  k(x1)
};
val K1 = y => {
  val x2 = y + 1;
  HALT(x2)
};
F1(3, K1)
```

이제 어떤 함수도 다른 함수 안에 들어 있지 않습니다. 이렇게 중첩된 함수를 최상위로 끌어올리는 변환을 <a id="g-lambda-lifting"></a>**람다 끌어올리기**(lambda lifting)라고 합니다.

### 호출은 점프

람다 끌어올리기까지 마친 프로그램은 IR로 거의 그대로 옮길 수 있습니다.

```text
F1:
  mul x1, r1, 2
  mov r1, x1
  jmp r2
K1:
  add x2, r1, 1
  mov r1, x2
  jmp HALT
START:
  mov r1, 3
  mov r2, K1
  jmp F1
HALT:
```

<div style="text-align:center">
<svg viewBox="0 0 600 290" width="100%" style="max-width: 560px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="함수 호출은 점프: START에서 r1에 3, r2에 K1을 넣고 F1로 점프한다. F1은 결과를 r1에 넣고 r2에 든 K1으로 점프해 반환한다. K1은 결과를 r1에 넣고 HALT로 점프한다" font-family="sans-serif" fill="currentColor">
<defs><marker id="cc-f4-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect rx="3" x="20" y="40" width="170" height="86" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="30" y="61" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">START:</text>
<text x="38" y="79" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">mov r1, 3</text>
<text x="38" y="97" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">mov r2, K1</text>
<text x="38" y="115" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">jmp F1</text>
<rect rx="3" x="330" y="40" width="170" height="86" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="340" y="61" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">F1:</text>
<text x="348" y="79" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">mul x1, r1, 2</text>
<text x="348" y="97" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">mov r1, x1</text>
<text x="348" y="115" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">jmp r2</text>
<rect rx="3" x="330" y="190" width="170" height="86" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="340" y="211" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">K1:</text>
<text x="348" y="229" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">add x2, r1, 1</text>
<text x="348" y="247" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">mov r1, x2</text>
<text x="348" y="265" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">jmp HALT</text>
<rect rx="3" x="20" y="210" width="170" height="32" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="30" y="231" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">HALT:</text>
<path d="M190,81 L327,81" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cc-f4-m0)"/>
<text x="258" y="72" text-anchor="middle" fill="currentColor" font-size="13">호출 = 점프</text>
<path d="M415,122 L415,187" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cc-f4-m0)"/>
<text x="425" y="152" text-anchor="start" fill="currentColor" font-size="13">반환도 점프</text>
<text x="425" y="170" text-anchor="start" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">(r2 = K1)</text>
<path d="M330,231 L193,231" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cc-f4-m0)"/>
<text x="262" y="222" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">jmp HALT</text>
</svg>
</div>

대응 관계를 정리하면 다음과 같습니다.

- **함수는 레이블**입니다. 인자는 `r1`, `r2`, ...에 담아 넘깁니다. 여기서 `F1`은 `x`를 `r1`으로, `k`를 `r2`로 받습니다.
- **호출은 점프**입니다. `F1(3, K1)`은 인자를 레지스터에 넣고 `jmp F1`을 하는 것입니다.
- **반환도 점프**입니다. `k(x1)`은 결과를 `r1`에 넣고 컨티뉴에이션이 든 `r2`로 `jmp r2`를 하는 것입니다.

CPS 덕분에 "돌아갈 곳"이 그냥 인자 하나가 되었고, 그래서 호출 스택 없이도 반환을 점프로 표현할 수 있습니다. 그렇다면 함수는 **언제나** 이렇게 끌어올릴 수 있을까요?

### 클로저 변환

그렇지 않습니다. 다음 프로그램에서는 안쪽 함수가 **바깥** 변수 `x`를 사용합니다.

```pl
/* FAE */
(x => y => x + y)(1)(2)
```

CPS로 바꾸면 다음과 같습니다.

```pl
/* CPS */
((x, k1) => {
  k1((y, k2) => {
    val z = x + y;
    k2(z)
  })
})(
  1,
  f => f(2, HALT)
)
```

`(y, k2) => ...`를 최상위로 끌어올리면 `x`는 어디서 가져와야 할까요? 이 함수는 나중에 `f(2, HALT)`로 호출되는데, 그 시점에는 `x`가 무엇이었는지 더 이상 알 수 없습니다. 그래서 함수 값 자체가 `x`를 **들고 다녀야** 합니다. [일급 함수](./first-class-functions.md) 장에서 보았던 바로 그 **클로저**입니다. 차이가 있다면, 인터프리터에서는 Scala의 `CloV`가 환경을 들고 다녔지만 이제는 그것을 IR 수준의 자료 구조로 직접 만들어야 한다는 점입니다.

단계별로 바꾸어 보겠습니다.

1. `(y, k2) => ...`는 `x`를 **캡처**합니다.
2. 이것을 `F1`로 끌어올립니다. 그런데 `F1`의 본문에 있는 `x`는 이제 어디서 오는지 알 수 없습니다.

   ```pl
   /* CPS */
   val F1 = (y, k2) => {
     val z = x + y;
     k2(z)
   };
   ((x, k1) => {
     k1(F1)
   })(
     1,
     f => f(2, HALT)
   )
   ```

3. 함수가 있던 자리에서 클로저 `[F1, x]`를 만듭니다. 클로저는 **레이블**과 **캡처한 값들**을 담은 **배열**입니다. 일반적으로는 `[F, x1, ..., xn]` 꼴입니다.

   ```pl
   /* CPS */
   ((x, k1) => {
     k1([F1, x])
   })( ... )
   ```

4. 호출하는 쪽은 `f`가 어떤 코드인지 모릅니다. 그러니 `f[0]`에 든 레이블로 점프하면서, `f` 자신도 인자로 넘겨 줍니다.

   ```pl
   /* CPS */
   f => f[0](f, 2, HALT)
   ```

5. `F1`은 클로저를 `c`로 받아서 `c[1]`에서 `x`를 읽어 옵니다.

   ```pl
   /* CPS */
   val F1 = (c, y, k2) => {
     val x = c[1];
     val z = x + y;
     k2(z)
   };
   ```

6. 나머지 두 함수는 아무것도 캡처하지 않으므로 그대로 `F2`와 `K1`으로 끌어올립니다.

최종 결과는 다음과 같습니다.

```pl
/* CPS */
val F1 = (c, y, k2) => {
  val x = c[1];
  val z = x + y;
  k2(z)
};
val F2 = (x, k1) => {
  k1([F1, x])
};
val K1 = f => {
  f[0](f, 2, HALT)
};
F2(1, K1)
```

이처럼 자유 변수를 쓰는 함수를 "코드 레이블 + 캡처한 값 배열"로 바꾸는 변환을 <a id="g-closure-conversion"></a>**클로저 변환**(closure conversion)이라고 합니다.

이제 IR로 옮겨 봅시다.

```text
F1:
  ld x, r1, 1
  add z, x, r2
  mov r1, z
  jmp r3
F2:
  mov x1, hp
  add hp, hp, 2
  st x1, 0, F1
  st x1, 1, r1
  mov r1, x1
  jmp r2
K1:
  ld x2, r1, 0
  mov r2, 2
  mov r3, HALT
  jmp x2
START:
  mov r1, 1
  mov r2, K1
  jmp F2
HALT:
```

배열을 만들려면 메모리가 필요합니다. 그래서 **비어 있는 메모리**를 가리키는 레지스터 `hp`(<a id="g-heap-pointer"></a>**힙 포인터**, heap pointer)를 하나 둡니다. `[F1, x]`는 원소가 두 개이므로 `hp`에서 칸 두 개를 **할당**하고(`mov x1, hp`로 시작 주소를 기억한 뒤 `add hp, hp, 2`), 그 칸에 `F1`과 `x`를 저장합니다(`st`). 반대로 `f[0]`은 클로저에서 레이블을 읽어 오는 것이므로 `ld`가 됩니다. `F1`은 클로저, `y`, `k2`를 차례로 `r1`, `r2`, `r3`로 받기 때문에 `c[1]`은 `ld x, r1, 1`이 되고 반환은 `jmp r3`가 됩니다.

<div style="text-align:center">
<svg viewBox="0 0 600 175" width="100%" style="max-width: 560px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="F2가 클로저 [F1, x]를 만든 뒤의 메모리: 할당 전 hp였던 주소 x1에서 두 칸에 F1과 1이 저장되고, r1은 x1을, hp는 그 다음 빈 칸을 가리킨다" font-family="sans-serif" fill="currentColor">
<defs><marker id="cc-f5-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect rx="3" x="111" y="62" width="98" height="40" fill="#2a408e"/>
<text x="160" y="88" text-anchor="middle" fill="#fff" font-size="15" font-family="ui-monospace, Menlo, monospace">F1</text>
<rect rx="3" x="211" y="62" width="98" height="40" fill="#2a408e"/>
<text x="260" y="88" text-anchor="middle" fill="#fff" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<rect rx="3" x="311" y="62" width="98" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<rect rx="3" x="411" y="62" width="98" height="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4"/>
<text x="80" y="88" text-anchor="middle" fill="currentColor" font-size="16">…</text>
<text x="530" y="88" text-anchor="middle" fill="currentColor" font-size="16">…</text>
<text x="160" y="26" text-anchor="middle" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">x1 = r1</text>
<path d="M160,32 L160,59" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cc-f5-m0)"/>
<text x="360" y="26" text-anchor="middle" fill="currentColor" font-size="13">hp (할당 뒤)</text>
<path d="M360,32 L360,59" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cc-f5-m0)"/>
<text x="160" y="124" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">st x1, 0, F1</text>
<text x="260" y="124" text-anchor="middle" fill="currentColor" font-size="12" font-family="ui-monospace, Menlo, monospace">st x1, 1, r1</text>
<text x="160" y="146" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.8">레이블</text>
<text x="260" y="146" text-anchor="middle" fill="currentColor" font-size="12" opacity="0.8">캡처한 x</text>
<path d="M112,160 L112,166 L308,166 L308,160" fill="none" stroke="currentColor" stroke-width="1.2"/>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 클로저 <code>[F1, x]</code>는 메모리의 연속된 두 칸입니다. <code>x1</code>은 할당하기 전의 <code>hp</code>이고, <code>add hp, hp, 2</code>로 <code>hp</code>가 두 칸 뒤로 옮겨 갑니다.</p>

> **생각해 보기.** `hp`는 늘어나기만 하고 줄어들지 않습니다. 더 이상 쓰지 않는 클로저의 메모리는 어떻게 되돌려 받을 수 있을까요? 이것이 바로 [쓰레기 수집](./garbage-collection.md) 장에서 다룬 문제입니다.

## 이름과 레지스터

### 알파 이름 바꾸기

람다 끌어올리기와 클로저 변환은 코드를 원래의 **스코프**(scope) 밖으로 옮깁니다. 그런데 서로 다른 두 변수가 **같은 이름**을 쓰고 있었다면 섞여 버릴 수 있습니다.

```pl
/* FVAE */
val x = 1;
(x => x * 2)(3) + x
```

이 프로그램의 결과는 \\(6 + 1 = 7\\)입니다. 하지만 스코프가 사라진 IR에서 두 `x`가 **하나의** 저장 위치가 되어 버리면, 함수 호출이 그 위치에 3을 넣고 결과가 \\(6 + 3 = 9\\)가 됩니다. 틀린 답입니다.

그래서 변환을 시작하기 **전에** 모든 변수에 **겹치지 않는** 이름을 붙여 줍니다.

```pl
/* FVAE */
val x1 = 1;
(x2 => x2 * 2)(3) + x1
```

이처럼 의미를 바꾸지 않고 변수 이름을 바꾸는 것을 <a id="g-alpha-renaming"></a>**알파 이름 바꾸기**(alpha renaming)라고 합니다.

> **자주 하는 실수.** 알파 이름 바꾸기를 변환 **뒤에** 하려고 하면 이미 늦습니다. 끌어올린 뒤에는 어떤 `x`가 어느 스코프에 속했는지 정보가 사라졌기 때문입니다. 반드시 다른 변환보다 먼저 해야 합니다.

### 레지스터 할당

지금까지 IR은 이름을 **필요한 만큼** 썼지만, 실제 기계에는 레지스터가 **몇 개뿐**입니다. 다음 명령어들을 봅시다.

```text
mul x1, 2, 3
add x2, 1, x1
mul x3, 4, 5
add x4, x2, x3
```

네 이름이 모두 **동시에 살아 있는** 것은 아닙니다. `x1`은 `x2`가 태어나는 곳에서 죽으므로 둘은 `r1`을 **함께** 쓸 수 있습니다. `x3`는 `x2`와 동시에 살아 있으므로 다른 레지스터 `r2`를 씁니다. 마지막 `x4`는 다시 `r1`을 재사용합니다.

<div style="text-align:center">
<svg viewBox="0 0 520 225" width="100%" style="max-width: 480px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="네 명령어에서 x1부터 x4가 살아 있는 구간. x1은 1행에서 2행까지, x2는 2행에서 4행까지, x3은 3행에서 4행까지, x4는 4행에서 산다. x1, x2, x4는 r1을, x3은 r2를 쓴다" font-family="sans-serif" fill="currentColor">
<text x="30" y="67" text-anchor="start" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">mul x1, 2, 3</text>
<text x="30" y="103" text-anchor="start" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">add x2, 1, x1</text>
<text x="30" y="139" text-anchor="start" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">mul x3, 4, 5</text>
<text x="30" y="175" text-anchor="start" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">add x4, x2, x3</text>
<text x="290" y="30" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">x1</text>
<rect x="281" y="51" width="18" height="58" rx="4" fill="#2a408e"/>
<text x="290" y="210" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" font-weight="bold">r1</text>
<text x="345" y="30" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">x2</text>
<rect x="336" y="87" width="18" height="94" rx="4" fill="#2a408e"/>
<text x="345" y="210" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" font-weight="bold">r1</text>
<text x="400" y="30" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">x3</text>
<rect x="391" y="123" width="18" height="58" rx="4" fill="none" stroke="currentColor" stroke-width="2"/>
<text x="400" y="210" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" font-weight="bold">r2</text>
<text x="455" y="30" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace">x4</text>
<rect x="446" y="159" width="18" height="22" rx="4" fill="#2a408e"/>
<text x="455" y="210" text-anchor="middle" fill="currentColor" font-size="14" font-family="ui-monospace, Menlo, monospace" font-weight="bold">r1</text>
<path d="M20,192 L500,192" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"/>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: 막대는 각 이름이 살아 있는 구간입니다. 겹치지 않는 <code>x1</code>, <code>x2</code>, <code>x4</code>는 <code>r1</code>을 함께 쓰고, <code>x2</code>와 겹치는 <code>x3</code>만 <code>r2</code>를 씁니다.</p>

```text
mul r1, 2, 3
add r1, 1, r1
mul r2, 4, 5
add r1, r1, r2
```

이름 네 개가 레지스터 두 개로 줄었습니다. 이것이 <a id="g-register-allocation"></a>**레지스터 할당**(register allocation)이며, 보통 "동시에 살아 있는 이름끼리는 다른 색을 칠한다"는 <a id="g-graph-coloring"></a>**그래프 색칠**(graph coloring) 문제로 풉니다.

### 최적화

이렇게 얻은 IR은 대개 더 **빠르고** **작게** 만들 수 있습니다. 대표적인 예를 몇 가지 보겠습니다.

<a id="g-constant-folding"></a>**상수 접기**(constant folding)는 컴파일 시간에 미리 계산합니다.

```text
add x1, 2, 3     =>     mov x1, 5
```

<a id="g-dead-code-elimination"></a>**죽은 코드 제거**(dead code elimination)는 쓰이지 않는 계산을 지웁니다. 아래에서 `x2`는 어디에도 쓰이지 않으므로 지울 수 있고, 그러고 나면 `x1`도 쓰이지 않게 되어 함께 지울 수 있습니다.

```text
mov x1, 5
mul x2, x1, 2              mov r1, 7
mov r1, 7          =>      jmp HALT
jmp HALT
```

<a id="g-common-subexpression-elimination"></a>**공통 부분식 제거**(common subexpression elimination)는 같은 결과를 다시 계산하지 않고 재사용합니다.

```text
add x1, r1, r2     =>     add x1, r1, r2
add x2, r1, r2            mov x2, x1
```

이 밖에도 많은 최적화가 있습니다.

## 일급 컨티뉴에이션

마지막으로, 처음에 "추가 작업 없음"이라고 했던 일급 컨티뉴에이션을 확인해 봅시다. [일급 컨티뉴에이션](./first-class-continuations.md) 장에서 본 KFAE 예제입니다. 결과는 \\(2 \times 5 = 10\\)이었습니다.

```pl
/* KFAE */
2 * { vcc k; 3 + k(5) }
```

1. 언제나처럼 프로그램 전체의 결과는 `HALT`로 보냅니다.

   ```pl
   /* CPS */
   HALT(
     2 * { vcc k; 3 + k(5) }
   )
   ```

2. 블록의 컨티뉴에이션은 "2를 곱해 `HALT`로 보내기"입니다. 이것을 `K1`이라고 부릅니다.

   ```pl
   /* CPS */
   val K1 = v => HALT(2 * v);
   K1({ vcc k; 3 + k(5) })
   ```

3. `vcc k`는 `K1`을 함수 `k`로 만들어 줍니다. 단, 이 함수는 CPS 함수답게 자기 컨티뉴에이션 `k2`도 받지만 그것을 **무시**하고 `K1`으로 갑니다.

   ```pl
   /* CPS */
   val K1 = v => HALT(2 * v);
   val k = (v, k2) => K1(v);
   K1(3 + k(5))
   ```

4. 이제 `3 + k(5)`는 **평소처럼** CPS로 바꿉니다. `k(5)`의 컨티뉴에이션은 `y => K1(3 + y)`입니다.

   ```pl
   /* CPS */
   val K1 = v => HALT(2 * v);
   val k = (v, k2) => K1(v);
   k(5, y => K1(3 + y))
   ```

5. 중간값에 이름을 붙여 ANF로 만들고,

   ```pl
   /* CPS */
   val K1 = v => {
     val x1 = 2 * v;
     HALT(x1)
   };
   val k = (v, k2) => K1(v);
   k(5, y => {
     val x2 = 3 + y;
     K1(x2)
   })
   ```

6. `k`와 `y => ...`를 `F1`, `K2`로 끌어올립니다.

   ```pl
   /* CPS */
   val K1 = v => {
     val x1 = 2 * v;
     HALT(x1)
   };
   val F1 = (v, k2) => K1(v);
   val K2 = y => {
     val x2 = 3 + y;
     K1(x2)
   };
   F1(5, K2)
   ```

IR로 옮기면 다음과 같습니다.

```text
K1:
  mul x1, 2, r1
  mov r1, x1
  jmp HALT
F1:
  jmp K1
K2:
  add x2, 3, r1
  mov r1, x2
  jmp K1
START:
  mov r1, 5
  mov r2, K2
  jmp F1
HALT:
```

`k`를 끌어올린 `F1`은 `K1`으로 점프할 뿐, 자기 컨티뉴에이션이 든 `r2`로는 절대 점프하지 않습니다. 따라서 `3 + _`를 계산하는 `K2`는 **한 번도** 실행되지 않는 **죽은 코드**이고, `K2`를 `r2`에 넣는 `mov r2, K2`도 마찬가지입니다. 앞에서 본 죽은 코드 제거로 이들을 지우면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 620 290" width="100%" style="max-width: 580px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="일급 컨티뉴에이션을 컴파일한 IR의 제어 흐름: START에서 F1로, F1은 r2를 무시하고 K1로, K1은 HALT로 점프한다. K2는 아무도 점프하지 않는 죽은 코드이다" font-family="sans-serif" fill="currentColor">
<defs><marker id="cc-f7-m0" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="currentColor"/></marker></defs>
<rect rx="3" x="20" y="30" width="170" height="86" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="30" y="51" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">START:</text>
<text x="38" y="69" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">mov r1, 5</text>
<text x="38" y="87" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" opacity="0.4">mov r2, K2</text>
<text x="38" y="105" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">jmp F1</text>
<rect rx="3" x="240" y="48" width="110" height="50" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="250" y="69" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">F1:</text>
<text x="258" y="87" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">jmp K1</text>
<rect rx="3" x="420" y="30" width="180" height="86" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="430" y="51" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">K1:</text>
<text x="438" y="69" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">mul x1, 2, r1</text>
<text x="438" y="87" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">mov r1, x1</text>
<text x="438" y="105" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace">jmp HALT</text>
<rect rx="3" x="450" y="200" width="120" height="32" fill="none" stroke="currentColor" stroke-width="1.5"/>
<text x="460" y="221" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold">HALT:</text>
<rect rx="3" x="160" y="180" width="170" height="86" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="5 4" opacity="0.5"/>
<text x="170" y="201" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" font-weight="bold" opacity="0.5">K2:</text>
<text x="178" y="219" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" opacity="0.5">add x2, 3, r1</text>
<text x="178" y="237" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" opacity="0.5">mov r1, x2</text>
<text x="178" y="255" text-anchor="start" fill="currentColor" font-size="13" font-family="ui-monospace, Menlo, monospace" opacity="0.5">jmp K1</text>
<path d="M190,71 L237,71" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cc-f7-m0)"/>
<path d="M350,71 L417,71" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cc-f7-m0)"/>
<path d="M510,112 L510,197" fill="none" stroke="currentColor" stroke-width="1.6" marker-end="url(#cc-f7-m0)"/>
<path d="M330,221 C380,221 400,150 440,115" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="5 4" marker-end="url(#cc-f7-m0)" opacity="0.5"/>
<text x="245" y="280" text-anchor="middle" fill="currentColor" font-size="13" opacity="0.8">아무도 점프하지 않음(죽은 코드)</text>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: <code>F1</code>은 자기 컨티뉴에이션이 든 <code>r2</code>로 점프하지 않으므로 <code>K2</code>(<code>3 + _</code>)에는 도달하지 않습니다.</p>

```text
K1:
  mul x1, 2, r1
  mov r1, x1
  jmp HALT
F1:
  jmp K1
START:
  mov r1, 5
  jmp F1
HALT:
```

`3 + ...` 부분이 컴파일된 코드에서 아예 사라졌습니다. 일급 컨티뉴에이션이 "남은 계산을 버리고 다른 곳으로 탈출한다"는 의미가, CPS로 바꾼 뒤에는 그저 **다른 레이블로 점프하기**가 되었습니다. 특별한 장치 없이 CPS 변환 하나로 해결된 셈입니다.

## 정리

- **컴파일러**는 원본 언어의 프로그램을 목표 언어의 동등한 프로그램으로 번역합니다. 이 장에서는 FAE를 어셈블리 같은 저수준 **IR**로 바꾸는 IR 생성기에 집중했습니다.
- **ANF**는 모든 중간값에 이름을 붙이고 순서를 고정해, 한 줄이 IR 명령어 하나가 되게 합니다. `if`는 조건부 점프와 레이블로 바뀌고, 두 갈래가 합류하는 레이블이 곧 `if`의 컨티뉴에이션입니다.
- **CPS**는 "돌아갈 곳"을 인자로 만들어, 호출과 반환을 모두 **점프**로 바꿀 수 있게 합니다. **람다 끌어올리기**는 중첩된 함수를 최상위의 레이블로 끌어올립니다.
- 바깥 변수를 캡처한 함수는 그냥 끌어올릴 수 없으므로, **클로저 변환**으로 `[레이블, 캡처한 값...]` 배열을 만들어 들고 다닙니다. 배열은 힙 포인터 `hp`로 할당하고 `st`와 `ld`로 쓰고 읽습니다.
- **알파 이름 바꾸기**는 변환 전에 모든 변수 이름을 겹치지 않게 만듭니다. **레지스터 할당**은 동시에 살아 있지 않은 이름끼리 레지스터를 공유하게 하며, 보통 그래프 색칠로 풉니다.
- 상수 접기, 죽은 코드 제거, 공통 부분식 제거 같은 **최적화**로 IR을 더 빠르고 작게 만들 수 있습니다.
- **일급 컨티뉴에이션**은 CPS 변환 뒤에는 자기 컨티뉴에이션을 무시하고 다른 레이블로 점프하는 함수일 뿐이므로, 추가 작업이 필요 없습니다.

## 연습 문제

1. 다음 FAE 식을 ANF로 바꾸고, 이 장의 IR로 옮겨 보세요. 결과는 `r1`에 남깁니다.

   ```text
   (1 + 2) * (3 + 4)
   ```

   그다음 레지스터 할당을 해 보세요. 레지스터가 최소 몇 개 필요할까요?

2. 다음 프로그램을 CPS로 바꾸고 람다 끌어올리기를 해 보세요.

   ```pl
   /* FAE */
   (f => f(1) + f(2))(x => x * 10)
   ```

   `f`를 두 번 호출하므로 컨티뉴에이션도 두 개가 필요합니다. 두 번째 호출의 컨티뉴에이션은 첫 번째 호출의 결과를 알아야 하는데, 이 값은 어떻게 전달해야 할까요? (힌트: 컨티뉴에이션도 클로저 변환의 대상입니다.)

3. `(x => y => z => x + y + z)(1)(2)(3)`에 클로저 변환을 하면 만들어지는 클로저 배열은 각각 원소가 몇 개일까요?

4. 다음 프로그램을 알파 이름 바꾸기 없이 끌어올리면 어떤 잘못된 결과가 나올 수 있는지 설명해 보세요.

   ```pl
   /* FVAE */
   val y = 10;
   (y => y + 1)(y * 2) + y
   ```

5. KFAE 식 `1 + { vcc k; k(2) * 100 }`을 이 장의 방법대로 컴파일하고, 죽은 코드 제거 후에 남는 IR을 적어 보세요.

6. **프로젝트.** 강의의 MiniPython 프로젝트(`mini-python`)에서 `step` 함수와 `locals` 함수를 구현해 보세요. 주어진 테스트만으로는 충분하지 않으니 직접 테스트도 작성해 보기를 권합니다.
