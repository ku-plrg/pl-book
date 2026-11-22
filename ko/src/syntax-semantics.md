# 문법과 의미

이제 본격적으로 프로그래밍 언어의 세계로 들어갑니다. 이 책에서는 아주 단순한 언어에서
출발해 기능을 하나씩 더해 가며 언어를 키워 나갈 텐데, 그 첫 번째 언어가 덧셈과 곱셈만 있는
산술식 언어 `AE`(Arithmetic Expressions)입니다. 너무 단순해 보이지만, 이 장에서 `AE`로 익히는
방법이 이후 모든 장에서 그대로 되풀이됩니다.

이 장은 크게 두 부분으로 나뉩니다. 앞부분에서는 언어를 **설계**하는 방법, 즉 언어의
문법(syntax)과 의미(semantics)를 수학적으로 정의하는 방법을 배웁니다. 뒷부분에서는 그렇게
정의한 언어를 Scala로 **구현**합니다. 문자열을 트리로 바꾸는 <a id="g-parser"></a>파서(parser)와, 트리를 받아 결과
값을 계산하는 인터프리터(interpreter)를 만들어 봅니다.

이 장에서 만들 `AE` 인터프리터를 먼저 돌려 봅시다. 프로그램을 고쳐 가며 실행해 보세요.

<div class="playground" data-lang="AE"></div>

## 프로그래밍 언어란

프로그래밍 언어를 정의한다는 것은 무엇을 정한다는 뜻일까요? 이 책에서는 다음과 같이
봅니다.

> **프로그래밍 언어**는 다음 두 가지로 정의됩니다.
>
> - **문법**: 프로그램의 **구조**를 정하는 규칙
> - **의미**: 프로그램이 무엇을 **뜻하는지** 정하는 규칙

문법은 "어떤 글자들의 나열이 올바른 프로그램인가, 그리고 그 프로그램은 어떤 구조로 이루어져
있는가"에 답하고, 의미는 "그 프로그램을 실행하면 무슨 일이 일어나는가"에 답합니다.

이 두 가지는 인터프리터의 구조와 정확히 맞아떨어집니다. 프로그램을 실행하는 과정을 그려 보면
다음과 같습니다.

<div style="text-align:center">
<svg viewBox="0 0 760 250" width="100%" style="max-width: 720px" role="img" aria-label="프로그램이 파서를 거쳐 추상 문법 트리가 되고, 인터프리터를 거쳐 결과가 되는 과정" fill="currentColor" font-family="sans-serif" font-size="15">
<defs><marker id="arr-pipe" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<text x="60" y="40" text-anchor="middle" font-style="italic" font-family="serif" font-size="18">P</text>
<text x="60" y="62" text-anchor="middle" font-weight="bold">프로그램</text>
<line x1="105" y1="50" x2="148" y2="50" stroke="currentColor" stroke-width="2.2" marker-end="url(#arr-pipe)"/>
<rect rx="3" x="150" y="25" width="120" height="50" fill="#2a408e"/>
<text x="210" y="55" text-anchor="middle" fill="#ffffff">파서</text>
<line x1="272" y1="50" x2="318" y2="50" stroke="currentColor" stroke-width="2.2" marker-end="url(#arr-pipe)"/>
<text x="380" y="46" text-anchor="middle" font-weight="bold">추상 문법 트리</text>
<text x="380" y="66" text-anchor="middle" font-weight="bold">(AST)</text>
<line x1="442" y1="50" x2="488" y2="50" stroke="currentColor" stroke-width="2.2" marker-end="url(#arr-pipe)"/>
<rect rx="3" x="490" y="25" width="120" height="50" fill="#2a408e"/>
<text x="550" y="55" text-anchor="middle" fill="#ffffff">인터프리터</text>
<line x1="612" y1="50" x2="655" y2="50" stroke="currentColor" stroke-width="2.2" marker-end="url(#arr-pipe)"/>
<text x="700" y="55" text-anchor="middle" font-weight="bold">결과</text>
<line x1="60" y1="75" x2="60" y2="105" stroke="currentColor" stroke-width="2" stroke-dasharray="3,4"/>
<line x1="380" y1="75" x2="380" y2="105" stroke="currentColor" stroke-width="2" stroke-dasharray="3,4"/>
<line x1="700" y1="70" x2="700" y2="105" stroke="currentColor" stroke-width="2" stroke-dasharray="3,4"/>
<text x="60" y="128" text-anchor="middle" >어떤 문자열이</text>
<text x="60" y="148" text-anchor="middle" >올바른가?</text>
<text x="380" y="128" text-anchor="middle" >프로그램의</text>
<text x="380" y="148" text-anchor="middle" >핵심 구조</text>
<text x="700" y="128" text-anchor="middle" >기대하는</text>
<text x="700" y="148" text-anchor="middle" >결과는?</text>
<line x1="60" y1="160" x2="60" y2="190" stroke="currentColor" stroke-width="2" stroke-dasharray="3,4"/>
<line x1="380" y1="160" x2="380" y2="190" stroke="currentColor" stroke-width="2" stroke-dasharray="3,4"/>
<line x1="700" y1="160" x2="700" y2="190" stroke="currentColor" stroke-width="2" stroke-dasharray="3,4"/>
<text x="60" y="212" text-anchor="middle" font-weight="bold">구체 문법</text>
<text x="380" y="212" text-anchor="middle" font-weight="bold">추상 문법</text>
<text x="700" y="212" text-anchor="middle" font-weight="bold">연산 의미</text>
</svg>
</div>

먼저 **파서**가 소스 코드 문자열을 읽어 프로그램의 구조를 나타내는 트리, 즉 추상 문법
트리(abstract syntax tree, AST)를 만듭니다. 파서는 언어의 *문법*을 따라 만들어집니다. 그림에서 \\( P \\)는 입력 프로그램을 가리킵니다. 그다음
**인터프리터**가 이 트리를 받아 실행 결과를 계산합니다. 인터프리터는 언어의 *의미*를 따라
만들어집니다. 그러니 문법과 의미를 정확히 정의하면, 그것이 곧 파서와 인터프리터의 설계도가
됩니다.

### 예제: 산술식 언어 `AE`

정수의 **덧셈**과 **곱셈**만 지원하는 산술식 언어 `AE`를 생각해 봅시다. 예를 들면 이런
프로그램들이 있습니다.

```text
4 + 2
1 * 24
-42 + 4 * 10
(1 + 2) * (2 + 3)
...
```

`AE` 프로그램은 **무한히** 많습니다. 그러니 하나하나 나열해서 언어를 정의할 수는 없고, 유한한
규칙으로 무한히 많은 프로그램을 한꺼번에 다룰 방법이 필요합니다. 구체적으로는 앞의 그림 아래쪽에 적힌 세 가지 질문에
답해야 합니다.

1. 어떤 문자열이 올바른 `AE` 프로그램인가? 이것은 <a id="g-concrete-syntax"></a>**구체 문법**(concrete syntax)이 답합니다.
2. 각 `AE` 프로그램을 파싱한 결과는 어떤 모양인가? 이것은 <a id="g-abstract-syntax"></a>**추상 문법**(abstract syntax)이
   답합니다.
3. 각 `AE` 프로그램을 계산한 결과는 무엇인가? 이것은 <a id="g-operational-semantics"></a>**연산 의미**(operational semantics)가
   답합니다.

하나씩 살펴봅시다.

## 문법

### 확장 배커스-나우르 표기법

언어의 문법은 보통 <a id="g-extended-backus-naur-form"></a>**확장 배커스-나우르 표기법**(extended Backus-Naur form, EBNF)으로
정의합니다. 이 책에서는 EBNF를 조금 변형해서 쓰는데, 구체 문법과 추상 문법을 구별하기 위해
표기를 다르게 합니다.

| 설명 | 구체 문법 | 추상 문법 |
|---|---|---|
| <a id="g-terminal"></a>단말 기호(terminal) | `"a"` | \\( \texttt{a} \\) |
| <a id="g-nonterminal"></a>비단말 기호(nonterminal) | `<expr>` | \\( e \\) |
| 있거나 없음 | `<expr>?` | \\( e^? \\) |
| 0번 이상 반복 | `<expr>*` | \\( e^{\ast} \\) |
| 1번 이상 반복 | `<expr>+` | \\( e^+ \\) |

단말 기호는 프로그램에 글자 그대로 나타나는 기호이고, 비단말 기호는 다른 규칙으로 더 풀어
써야 하는 이름입니다. 예를 들어 정수의 구체 문법은 다음과 같이 정의할 수 있습니다.

```bnf
<digit>  ::= "0" | "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "9"
<number> ::= "-"? <digit>+
```

`::=`는 "왼쪽은 오른쪽과 같이 생겼다"는 뜻이고, `|`는 "또는"입니다. 즉 숫자(`<digit>`)는
`"0"`부터 `"9"` 중 하나이고, 정수(`<number>`)는 `"-"`가 있거나 없고 그 뒤에 숫자가 1개 이상
오는 것입니다. 그래서 `42`, `-7`, `007`은 정수이고, `--1`이나 `-`는 정수가 아닙니다.

### 구체 문법

이제 `AE`의 **구체 문법**을 정의해 봅시다.

```bnf
<expr> ::= <number>
         | <expr> "+" <expr>
         | <expr> "*" <expr>
         | "(" <expr> ")"
```

식(`<expr>`)은 정수이거나, 두 식 사이에 `"+"`나 `"*"`를 넣은 것이거나, 식을 괄호로 감싼
것입니다. `<expr>`의 정의 안에 다시 `<expr>`가 나오는 재귀적 정의라는 점을 보세요. 이 덕분에
유한한 규칙으로 무한히 많은 식을 정의할 수 있습니다.

구체 문법은 프로그램의 **겉모습**(surface-level)을 괄호나 공백 같은 세세한 부분까지 모두
담고 있어서, 주어진 문자열이 올바른 `AE`인지 아닌지를 판단할 수 있게 해 줍니다. 예를 들어
`(1+2)*3`이 올바른 `AE`라는 것은 `<expr>`에서 시작해 규칙을 하나씩 적용해서 이 문자열을 만들어
낼 수 있다는 것으로 보일 수 있습니다.

```pl
<expr> => <expr>*<expr>                => (<expr>)*<expr>
       => (<expr>+<expr>)*<expr>       => (<number>+<expr>)*<expr>
       => (1+<expr>)*<expr>            => (1+<number>)*<expr>
       => (1+2)*<expr>                 => (1+2)*<number>
       => (1+2)*3
```

각 단계에서 비단말 기호 하나를 규칙의 오른쪽 중 하나로 바꾸었습니다. 이런 과정을 유도
(derivation)라고 부릅니다.

### 모호성: 결합 방향과 우선순위

그런데 이 문법에는 문제가 하나 있습니다. `1 + 2 * 3`을 생각해 봅시다. 이 문자열은
`<expr> "+" <expr>`로 보고 오른쪽 `<expr>`를 `2 * 3`으로 풀 수도 있고, `<expr> "*" <expr>`로
보고 왼쪽 `<expr>`를 `1 + 2`로 풀 수도 있습니다. 같은 문자열을 두 가지 구조로 읽을 수 있는
것이지요. 이것을 문법이 **모호하다**(ambiguous)고 합니다. 앞의 구조라면 결과가 7, 뒤의 구조라면
9이니, 그냥 넘어갈 수 없는 문제입니다.

그래서 <a id="g-ambiguity"></a>모호성(ambiguity)을 없애는 규칙을 덧붙입니다.

- `"+"`와 `"*"`는 <a id="g-left-associative"></a>**왼쪽 결합**(left-associative)입니다. 같은 연산자가 이어지면 왼쪽부터 묶습니다.

  ```text
  "1 + 2 + 3"   ==   "(1 + 2) + 3"
  "1 * 2 * 3"   ==   "(1 * 2) * 3"
  ```

- `"*"`는 `"+"`보다 <a id="g-precedence"></a>**우선순위**(precedence)가 높습니다. 곱셈을 먼저 묶습니다.

  ```text
  "1 + 2 * 3"   ==   "1 + (2 * 3)"
  ```

우리가 학교에서 배운 산술의 관례 그대로입니다.

> **생각해 보기.** 덧셈과 곱셈은 결합 법칙이 성립하므로 `(1 + 2) + 3`과 `1 + (2 + 3)`의
> 결과가 같습니다. 그런데도 결합 방향을 정해야 하는 이유는 무엇일까요? 나중에 뺄셈처럼 결합
> 법칙이 성립하지 않는 연산을 더한다면 어떻게 될지 생각해 보세요.

### 추상 문법

구체 문법은 문자열이 올바른지 판단하기에는 좋지만, 프로그램의 *의미*를 정의하기에는 너무
자질구레합니다. 괄호나 공백, 결합 방향 같은 것은 프로그램을 읽어 들일 때만 필요하고, 일단 구조가
정해지고 나면 더는 필요 없습니다. 그래서 프로그램의 **핵심 구조**만 담은 **추상 문법**을 따로
정의합니다.

\\[
\begin{array}{lrcll}
\text{Numbers} & n & \in & \mathbb{Z} & (\texttt{BigInt}) \\\\
\text{Expressions} & e & ::= & n & (\texttt{Num}) \\\\
& & \mid & e \mathbin{\texttt{+}} e & (\texttt{Add}) \\\\
& & \mid & e \mathbin{\texttt{&#42;}} e & (\texttt{Mul})
\end{array}
\\]

정수 \\( n \\)은 정수 집합 \\( \mathbb{Z} \\)의 원소이고, 식 \\( e \\)는 정수 \\( n \\)이거나,
두 식의 덧셈 \\( e \mathbin{\texttt{+}} e \\)이거나, 두 식의 곱셈 \\( e \mathbin{\texttt{&#42;}} e \\)입니다.
오른쪽 괄호 안의 이름(`BigInt`, `Num`, `Add`, `Mul`)은 나중에 Scala로 구현할 때 쓸 타입과
생성자의 이름입니다. 괄호에 해당하는 경우가 없다는 점에 주목하세요. 괄호는 구조를 정하는 데만
쓰일 뿐, 구조가 정해진 뒤에는 트리 모양 자체에 그 정보가 들어 있기 때문입니다.

추상 문법에 따라 만든 트리를 **추상 문법 트리**(AST)라고 부릅니다. `"(1+2)*3"`과 `"1+2*3"`의
AST를 그려 보면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="-29 -13 399 220" width="100%" style="max-width: 480px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="&quot;(1+2)*3&quot;과 &quot;1+2*3&quot;의 추상 문법 트리. 앞의 것은 Mul이, 뒤의 것은 Add가 맨 위에 있다" font-family="sans-serif" fill="currentColor">
<line x1="70.0" y1="53.0" x2="28.0" y2="77.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="70.0" y1="53.0" x2="112.0" y2="77.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="28.0" y1="103.0" x2="0.0" y2="127.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="28.0" y1="103.0" x2="56.0" y2="127.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="0.0" y1="153.0" x2="0.0" y2="177.0" stroke="currentColor" stroke-width="1.4"/>
<text x="0.0" y="195.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<rect x="-20.5" y="127.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="0.0" y="145.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Num</text>
<line x1="56.0" y1="153.0" x2="56.0" y2="177.0" stroke="currentColor" stroke-width="1.4"/>
<text x="56.0" y="195.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">2</text>
<rect x="35.5" y="127.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="56.0" y="145.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Num</text>
<rect x="7.5" y="77.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="28.0" y="95.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Add</text>
<line x1="112.0" y1="103.0" x2="112.0" y2="127.0" stroke="currentColor" stroke-width="1.4"/>
<text x="112.0" y="145.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<rect x="91.5" y="77.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="112.0" y="95.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Num</text>
<rect x="49.5" y="27.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="70.0" y="45.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Mul</text>
<text x="70.0" y="10.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace" font-weight="bold">&quot;(1+2)*3&quot;</text>
<line x1="272.0" y1="53.0" x2="230.0" y2="77.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="272.0" y1="53.0" x2="314.0" y2="77.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="230.0" y1="103.0" x2="230.0" y2="127.0" stroke="currentColor" stroke-width="1.4"/>
<text x="230.0" y="145.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<rect x="209.5" y="77.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="230.0" y="95.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Num</text>
<line x1="314.0" y1="103.0" x2="286.0" y2="127.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="314.0" y1="103.0" x2="342.0" y2="127.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="286.0" y1="153.0" x2="286.0" y2="177.0" stroke="currentColor" stroke-width="1.4"/>
<text x="286.0" y="195.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">2</text>
<rect x="265.5" y="127.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="286.0" y="145.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Num</text>
<line x1="342.0" y1="153.0" x2="342.0" y2="177.0" stroke="currentColor" stroke-width="1.4"/>
<text x="342.0" y="195.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<rect x="321.5" y="127.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="342.0" y="145.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Num</text>
<rect x="293.5" y="77.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="314.0" y="95.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Mul</text>
<rect x="251.5" y="27.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="272.0" y="45.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Add</text>
<text x="272.0" y="10.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace" font-weight="bold">&quot;1+2*3&quot;</text>
</svg>
</div>

두 문자열은 글자만 보면 괄호 하나 차이지만, 트리로 보면 구조가 완전히 다릅니다. 왼쪽은
곱셈이 맨 위에 있고, 오른쪽은 덧셈이 맨 위에 있습니다. 앞에서 정한 우선순위 규칙 덕분에
`"1+2*3"`이 오른쪽 트리로 정해집니다.

### 구체 문법과 추상 문법

정리하면, **구체 문법**은 프로그램의 겉모습을 나타내고 **추상 문법**은 프로그램의 핵심 구조를
나타냅니다. 둘을 분리하면 좋은 점이 하나 있습니다. **같은 추상 문법**에 대해 **여러 구체
문법**을 둘 수 있다는 것입니다. 예를 들어 다음 세 가지 구체 문법은 모두 `AE`의 추상 문법과
대응합니다.

```bnf
<expr> ::= <number>
         | <expr> "+" <expr>
         | <expr> "*" <expr>
         | "(" <expr> ")"

<expr> ::= <number>
         | "(" "+" <expr> <expr> ")"
         | "(" "*" <expr> <expr> ")"

<expr> ::= <number>
         | "ADD[" <expr> ";" <expr> "]"
         | "MUL[" <expr> ";" <expr> "]"
```

첫 번째는 우리에게 익숙한 중위 표기법이고, 두 번째는 Lisp 계열 언어처럼 연산자를 앞에 쓰는
전위 표기법이며, 세 번째는 그냥 지어낸 표기법입니다. 하지만 세 문자열

```text
(1 + 2) * 3
(* (+ 1 2) 3)
MUL[ADD[1; 2]; 3]
```

은 모두 같은 AST `Mul(Add(Num(1), Num(2)), Num(3))`이 됩니다. 의미는 추상 문법 위에서
정의하므로, 겉모습을 어떻게 바꾸든 의미는 그대로입니다. 이 책에서 문법을 말할 때는 대부분 추상
문법을 가리킵니다.

그림으로 나타내면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="-8 2 461 194" width="100%" style="max-width: 560px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="서로 다른 세 구체 문법의 문자열이 모두 같은 추상 문법 트리 Mul(Add(Num(1), Num(2)), Num(3))이 되는 모습" font-family="sans-serif" fill="currentColor">
<defs><marker id="syntax-semantics-fig-2" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1,1 L9,5 L1,9" fill="none" stroke="currentColor" stroke-width="1.6"/></marker></defs>
<rect x="0.0" y="10.0" width="190.0" height="34.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="95.0" y="32.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">(1 + 2) * 3</text>
<line x1="192.0" y1="27.0" x2="300.0" y2="100.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#syntax-semantics-fig-2)"/>
<rect x="0.0" y="70.0" width="190.0" height="34.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="95.0" y="92.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">(* (+ 1 2) 3)</text>
<line x1="192.0" y1="87.0" x2="300.0" y2="100.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#syntax-semantics-fig-2)"/>
<rect x="0.0" y="130.0" width="190.0" height="34.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="95.0" y="152.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">MUL[ADD[1; 2]; 3]</text>
<line x1="192.0" y1="147.0" x2="300.0" y2="100.0" stroke="currentColor" stroke-width="1.8" marker-end="url(#syntax-semantics-fig-2)"/>
<text x="246.0" y="60.0" text-anchor="middle" font-size="14">파싱</text>
<line x1="385.0" y1="53.0" x2="346.0" y2="73.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="385.0" y1="53.0" x2="424.0" y2="73.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="346.0" y1="99.0" x2="320.0" y2="119.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="346.0" y1="99.0" x2="372.0" y2="119.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="320.0" y1="145.0" x2="320.0" y2="165.0" stroke="currentColor" stroke-width="1.4"/>
<text x="320.0" y="183.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<rect x="299.5" y="119.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="320.0" y="137.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Num</text>
<line x1="372.0" y1="145.0" x2="372.0" y2="165.0" stroke="currentColor" stroke-width="1.4"/>
<text x="372.0" y="183.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">2</text>
<rect x="351.5" y="119.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="372.0" y="137.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Num</text>
<rect x="325.5" y="73.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="346.0" y="91.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Add</text>
<line x1="424.0" y1="99.0" x2="424.0" y2="119.0" stroke="currentColor" stroke-width="1.4"/>
<text x="424.0" y="137.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<rect x="403.5" y="73.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="424.0" y="91.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Num</text>
<rect x="364.5" y="27.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="385.0" y="45.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Mul</text>
</svg>
</div>

## 의미

### 의미를 정의하는 여러 방법

이제 프로그램이 무엇을 뜻하는지 정의할 차례입니다. 프로그램의 의미를 정의하는 방법은 여러
가지가 있습니다.

- <a id="g-axiomatic-semantics"></a>**공리 의미**(axiomatic semantics)는 프로그램을 실행하기 **전**과 **후**에 무엇이 성립하는지로
  의미를 정의합니다. 예를 들어 다음은 "\\( x = n \\)이고 \\( y = m \\)인 상태에서 `z = x + y`를
  실행하면 \\( z = n + m \\)이 된다"는 뜻입니다.

  \\[
  \\{ x = n \land y = m \\} \quad z \mathbin{\texttt{=}} x \mathbin{\texttt{+}} y \quad \\{ z = n + m \\}
  \\]

- <a id="g-denotational-semantics"></a>**표시 의미**(denotational semantics)는 프로그램이 나타내는 **수학적 대상**으로 의미를
  정의합니다. 예를 들어 덧셈식의 의미는 두 부분식의 의미를 더한 수입니다.

  \\[
  ⟦ e_1 \mathbin{\texttt{+}} e_2 ⟧ = ⟦ e_1 ⟧ + ⟦ e_2 ⟧
  \\]

- **연산 의미**(operational semantics)는 프로그램이 기계에서 **어떻게** 실행되는지로 의미를
  정의합니다.

  \\[
  \begin{prooftree}
  \AxiomC{$\vdash e_1 \Rightarrow n_1$}
  \AxiomC{$\vdash e_2 \Rightarrow n_2$}
  \BinaryInfC{$\vdash e_1 \mathbin{\texttt{+}} e_2 \Rightarrow n_1 + n_2$}
  \end{prooftree}
  \\]

이 밖에도 여러 방법이 있습니다. 이 책에서는 **연산 의미**에 집중합니다. 연산 의미는
인터프리터와 아주 가까워서, 정의를 거의 그대로 코드로 옮길 수 있기 때문입니다.

### 연산 의미의 두 가지 스타일

연산 의미에는 대표적인 스타일이 두 가지 있습니다.

<a id="g-big-step-operational-semantics"></a>**큰 걸음 의미**(big-step operational semantics)는 프로그램을 **한 번에** 실행해서 최종
결과를 냅니다. <a id="g-natural-semantics"></a>자연 의미(natural semantics)라고도 부릅니다.

\\[
\begin{prooftree}
\AxiomC{$\ldots$}
\UnaryInfC{$\vdash e \Rightarrow n$}
\end{prooftree}
\\]

이것은 "\\( \ldots \\)이므로, 식 \\( e \\)를 실행한 결과는 \\( n \\)이다"라고 읽습니다.

<a id="g-small-step-operational-semantics"></a>**작은 걸음 의미**(small-step operational semantics)는 프로그램을 **한 걸음씩** 실행합니다.

\\[
e \to e' \to e'' \to \ldots \to n
\\]

이것은 "식 \\( e \\)가 \\( e' \\)로 줄고, 그것이 다시 \\( e'' \\)로 줄고, ... 마침내 \\( n \\)이
된다"라고 읽습니다.

두 스타일 모두 **추론 규칙**으로 정의하므로, 먼저 추론 규칙이 무엇인지 알아봅시다.

### 추론 규칙

<a id="g-inference-rule"></a>**추론 규칙**(inference rule)은 여러 개의 <a id="g-premise"></a>**전제**(premise)와 하나의 <a id="g-conclusion"></a>**결론**(conclusion)으로
이루어집니다. 가로줄 위에 전제를, 아래에 결론을 씁니다.

\\[
\begin{prooftree}
\AxiomC{$\mathit{premise}_1 \quad \mathit{premise}_2 \quad \ldots \quad \mathit{premise}_n$}
\UnaryInfC{$\mathit{conclusion}$}
\end{prooftree}
\\]

이 규칙은 "모든 전제가 참이면, 결론도 참이다"라는 뜻입니다. 논리식으로 쓰면 다음과 같습니다.

\\[
\mathit{premise}_1 \land \mathit{premise}_2 \land \ldots \land \mathit{premise}_n
\implies \mathit{conclusion}
\\]

예를 들어 다음 규칙은 "\\( A \\)이면 \\( B \\)이고, \\( B \\)이면 \\( C \\)이면, \\( A \\)이면
\\( C \\)이다"라는 뜻으로, 우리가 잘 아는 <a id="g-syllogism"></a>삼단논법(syllogism)입니다.

\\[
\begin{prooftree}
\AxiomC{$A \implies B$}
\AxiomC{$B \implies C$}
\BinaryInfC{$A \implies C$}
\end{prooftree}
\\]

전제가 하나도 없는 규칙도 있습니다. 이런 규칙은 아무 조건 없이 결론이 참이라는 뜻이고, 공리
(axiom)라고도 부릅니다.

### 큰 걸음 의미

`AE`의 큰 걸음 의미는 다음 모양의 <a id="g-judgment"></a>판단(judgment)을 정의합니다.

\\[
\boxed{\vdash e \Rightarrow n}
\\]

이것은 "식 \\( e \\)는 정수 \\( n \\)으로 계산된다"라는 뜻입니다. 이 판단을 정의하는 추론
규칙은 추상 문법의 경우마다 하나씩, 모두 세 개입니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\vdash n \Rightarrow n$}
\end{prooftree}
\\]

\\[
\begin{prooftree}
\AxiomC{$\vdash e_1 \Rightarrow n_1$}
\AxiomC{$\vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\vdash e_1 \mathbin{\texttt{+}} e_2 \Rightarrow n_1 + n_2$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\vdash e_1 \Rightarrow n_1$}
\AxiomC{$\vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Mul}$}
\BinaryInfC{$\vdash e_1 \mathbin{\texttt{&#42;}} e_2 \Rightarrow n_1 \times n_2$}
\end{prooftree}
\\]

하나씩 읽어 봅시다.

- \\( \texttt{Num} \\): 정수 \\( n \\)은 계산하면 그대로 \\( n \\)입니다. 전제가 없는 공리입니다.
- \\( \texttt{Add} \\): \\( e_1 \\)이 \\( n_1 \\)으로, \\( e_2 \\)가 \\( n_2 \\)로 계산된다면,
  \\( e_1 \mathbin{\texttt{+}} e_2 \\)는 \\( n_1 + n_2 \\)로 계산됩니다.
- \\( \texttt{Mul} \\): 마찬가지로 \\( e_1 \mathbin{\texttt{&#42;}} e_2 \\)는 \\( n_1 \times n_2 \\)로
  계산됩니다.

> **자주 하는 실수.** 규칙의 결론에 나오는 \\( \texttt{+} \\)와 \\( + \\)는 서로 다른 것입니다.
> 왼쪽의 \\( e_1 \mathbin{\texttt{+}} e_2 \\)에 있는 \\( \texttt{+} \\)는 `AE` 프로그램 안의 *기호*이고,
> 오른쪽의 \\( n_1 + n_2 \\)에 있는 \\( + \\)는 수학에서 정수를 더하는 *연산*입니다. 곱셈도
> 마찬가지로, 프로그램 안의 기호 \\( \texttt{&#42;} \\)와 수학의 \\( \times \\)를 구별해서
> 썼습니다. 의미를 정의한다는 것은 결국 프로그램의 기호를 우리가 이미 아는 수학 연산으로
> 설명하는 일입니다.

### 유도 트리

이 규칙들로 \\( \vdash (1 \mathbin{\texttt{+}} 2) \mathbin{\texttt{&#42;}} 3 \Rightarrow 9 \\)임을 증명해 봅시다.
맨 아래 결론에서 시작해서, 각 판단을 결론으로 가지는 규칙을 찾아 위로 쌓아 올리면 됩니다.

- 맨 위 연산이 곱셈이므로 \\( \texttt{Mul} \\) 규칙을 씁니다. 그러려면
  \\( \vdash 1 \mathbin{\texttt{+}} 2 \Rightarrow 3 \\)과 \\( \vdash 3 \Rightarrow 3 \\)이 필요합니다.
- \\( \vdash 1 \mathbin{\texttt{+}} 2 \Rightarrow 3 \\)은 \\( \texttt{Add} \\) 규칙으로 보이고, 그러려면
  \\( \vdash 1 \Rightarrow 1 \\)과 \\( \vdash 2 \Rightarrow 2 \\)가 필요합니다.
- 나머지는 모두 \\( \texttt{Num} \\) 규칙으로 바로 보일 수 있습니다.

이 과정을 한 그림으로 그린 것을 <a id="g-derivation"></a><a id="g-derivation-tree"></a>**유도 트리**(derivation tree)라고 부릅니다.

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\vdash 1 \Rightarrow 1$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\vdash 2 \Rightarrow 2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\vdash 1 \mathbin{\texttt{+}} 2 \Rightarrow 3$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\vdash 3 \Rightarrow 3$}
\LeftLabel{$\texttt{Mul}$}
\BinaryInfC{$\vdash (1 \mathbin{\texttt{+}} 2) \mathbin{\texttt{&#42;}} 3 \Rightarrow 9$}
\end{prooftree}
\\]

트리의 잎은 모두 전제가 없는 규칙(\\( \texttt{Num} \\))으로 끝나야 증명이 완성됩니다. 유도
트리의 모양이 앞에서 그린 AST의 모양과 똑같다는 점도 눈여겨보세요. 큰 보폭 의미는 AST를 따라
아래에서 위로 값을 모아 올리는 셈입니다.

> **생각해 보기.** 같은 방법으로 \\( \vdash 1 \mathbin{\texttt{+}} (2 \mathbin{\texttt{&#42;}} 3) \Rightarrow 7 \\)의
> 유도 트리를 직접 그려 보세요.

<details>
<summary>답 보기</summary>

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\vdash 1 \Rightarrow 1$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\vdash 2 \Rightarrow 2$}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\vdash 3 \Rightarrow 3$}
\LeftLabel{$\texttt{Mul}$}
\BinaryInfC{$\vdash 2 \mathbin{\texttt{&#42;}} 3 \Rightarrow 6$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\vdash 1 \mathbin{\texttt{+}} (2 \mathbin{\texttt{&#42;}} 3) \Rightarrow 7$}
\end{prooftree}
\\]

</details>

### 작은 걸음 의미

이번에는 작은 걸음 의미로 `AE`의 의미를 정의해 봅시다. 작은 보폭 의미는 다음 모양의
판단을 정의합니다.

\\[
\boxed{e_0 \to e_1}
\\]

이것은 "\\( e_0 \\)를 한 걸음 계산하면 \\( e_1 \\)이 된다", 다른 말로 \\( e_0 \\)가
\\( e_1 \\)로 **줄어든다**(reduce)는 뜻입니다. 덧셈에 대한 규칙은 세 개입니다.

\\[
\begin{prooftree}
\AxiomC{$e_1 \to e_1'$}
\UnaryInfC{$e_1 \mathbin{\texttt{+}} e_2 \to e_1' \mathbin{\texttt{+}} e_2$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$e_2 \to e_2'$}
\UnaryInfC{$n_1 \mathbin{\texttt{+}} e_2 \to n_1 \mathbin{\texttt{+}} e_2'$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$n_1 \mathbin{\texttt{+}} n_2 \to n_1 + n_2$}
\end{prooftree}
\\]

- 첫 번째 규칙: 왼쪽 식 \\( e_1 \\)이 한 걸음 줄어들 수 있으면, 덧셈식 전체도 왼쪽을 한 걸음
  줄입니다.
- 두 번째 규칙: 왼쪽이 이미 정수 \\( n_1 \\)이 되었다면, 이제 오른쪽 \\( e_2 \\)를 한 걸음
  줄입니다.
- 세 번째 규칙: 양쪽이 모두 정수가 되었다면, 비로소 실제로 더합니다.

이 세 규칙이 함께 "왼쪽부터 먼저 계산한다"는 <a id="g-evaluation-order"></a>계산 순서(evaluation order)를 정한다는 점이 흥미롭습니다. 큰 보폭
의미에서는 드러나지 않던 정보이지요. 곱셈도 같은 모양의 규칙 세 개로 정의합니다.

\\[
\begin{prooftree}
\AxiomC{$e_1 \to e_1'$}
\UnaryInfC{$e_1 \mathbin{\texttt{&#42;}} e_2 \to e_1' \mathbin{\texttt{&#42;}} e_2$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$e_2 \to e_2'$}
\UnaryInfC{$n_1 \mathbin{\texttt{&#42;}} e_2 \to n_1 \mathbin{\texttt{&#42;}} e_2'$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{}
\UnaryInfC{$n_1 \mathbin{\texttt{&#42;}} n_2 \to n_1 \times n_2$}
\end{prooftree}
\\]

정수 \\( n \\)에 대해서는 규칙이 없습니다. 정수는 이미 계산이 끝난 값이어서 더 줄어들 수 없기
때문입니다.

### 환원 과정

이 규칙들로 \\( (1 \mathbin{\texttt{+}} 2) \mathbin{\texttt{&#42;}} 3 \to^\ast 9 \\)임을 보여 봅시다. 여기서
\\( \to^\ast \\)는 \\( \to \\)의 <a id="g-reflexive-transitive-closure"></a>**반사 전이 폐포**(reflexive-transitive closure)로, "0번 이상
줄어든다"는 뜻입니다. 이것을 보이려면 한 걸음씩 줄어드는 <a id="g-reduction-sequence"></a>**환원 과정**(reduction sequence)을
보여 주면 됩니다.

\\[
(1 \mathbin{\texttt{+}} 2) \mathbin{\texttt{&#42;}} 3
\quad \to \quad 3 \mathbin{\texttt{&#42;}} 3
\quad \to \quad 9
\\]

첫 걸음에서는 곱셈의 첫 번째 규칙으로 왼쪽 \\( 1 \mathbin{\texttt{+}} 2 \\)를 줄였고(그 전제
\\( 1 \mathbin{\texttt{+}} 2 \to 3 \\)은 덧셈의 세 번째 규칙으로 보입니다), 둘째 걸음에서는 곱셈의
세 번째 규칙으로 실제 곱셈을 했습니다.

> **생각해 보기.** \\( 1 \mathbin{\texttt{+}} (2 \mathbin{\texttt{&#42;}} 3) \to^\ast 7 \\)의 환원 과정을 써
> 보세요. 이번에는 덧셈의 어느 규칙이 먼저 쓰이나요?

<details>
<summary>답 보기</summary>

\\[
1 \mathbin{\texttt{+}} (2 \mathbin{\texttt{&#42;}} 3)
\quad \to \quad 1 \mathbin{\texttt{+}} 6
\quad \to \quad 7
\\]

왼쪽이 이미 정수 \\( 1 \\)이므로 첫 걸음에는 덧셈의 두 번째 규칙으로 오른쪽
\\( 2 \mathbin{\texttt{&#42;}} 3 \\)을 \\( 6 \\)으로 줄이고, 둘째 걸음에 세 번째 규칙으로 더합니다.

</details>

`AE`의 문법과 의미 전체는 [`AE` 언어 명세](https://github.com/ku-plrg-classroom/docs/blob/main/cose212/ae/ae-spec.pdf)에도
정리되어 있습니다. 이 책에서는 앞으로 주로 큰 걸음 의미를 쓰고, 작은 보폭 의미는
[컨티뉴에이션](./continuations.md)과 [타입 시스템](./type-systems.md) 등에서 다시 만나게 됩니다.

## 파서

지금까지 `AE`를 수학적으로 **설계**했으니, 이제 Scala로 **구현**할 차례입니다. 앞에서 본 그림을
다시 떠올려 보면 두 가지를 만들어야 합니다.

- **파서**: **문자열**을 받아 **AST**를 만듭니다.
- **인터프리터**: **AST**를 받아 **값**을 계산합니다.

이 절에서 만드는 코드는 강의 과제
[`AE`](https://github.com/ku-plrg-classroom/docs/tree/main/cose212/ae)의 템플릿 코드와 같습니다.

### 추상 문법을 위한 ADT

먼저 AST를 Scala 값으로 나타내야 합니다. [Scala 기초](./scala.md)에서 배운 **대수적 데이터
타입**(algebraic data type, ADT)이 바로 이 일에 딱 맞습니다. 추상 문법의 경우 하나하나를 `enum`의
`case` 하나로 옮기면 됩니다.

\\[
\begin{array}{lrcll}
\text{Numbers} & n & \in & \mathbb{Z} & (\texttt{BigInt}) \\\\
\text{Expressions} & e & ::= & n & (\texttt{Num}) \\\\
& & \mid & e \mathbin{\texttt{+}} e & (\texttt{Add}) \\\\
& & \mid & e \mathbin{\texttt{&#42;}} e & (\texttt{Mul})
\end{array}
\\]

```scala
// expressions
enum Expr:
  // numbers
  case Num(number: BigInt) // `BigInt` rather than `Int` for integers
  // additions
  case Add(left: Expr, right: Expr)
  // multiplications
  case Mul(left: Expr, right: Expr)
```

정수에 `Int` 대신 `BigInt`를 쓴 이유는, 수학의 정수 집합 \\( \mathbb{Z} \\)처럼 크기 제한이 없는
정수를 쓰기 위해서입니다. `Int`는 32비트라서 너무 큰 수를 계산하면 넘쳐 버립니다. 이제
`AE` 식 \\( 1 \mathbin{\texttt{+}} (2 \mathbin{\texttt{&#42;}} 3) \\)은 다음 Scala 값으로 나타낼 수 있습니다.

```scala
Add(Num(1), Mul(Num(2), Num(3)))
```

앞에서 그린 AST 그림과 모양이 똑같지요?

### 파서 조합기

그러면 문자열 `"1 + 2 * 3"`을 받아 위의 값을 만들어 내는 **파서**는 어떻게 구현할까요? 이 책에서는
Scala의 <a id="g-parser-combinator"></a>**파서 조합기**(parser combinator)를 씁니다. 여기서는 기본 아이디어만 살펴보고, 자세한
내용은 [라이브러리 문서](https://github.com/scala/scala-parser-combinators)와
[<a id="g-parsing-expression-grammar"></a>파싱 표현 문법](https://en.wikipedia.org/wiki/Parsing_expression_grammar)(parsing expression
grammar, PEG)을 참고하세요.

파서 조합기에서 **파서**란 **문자열**을 받아 **결과**와 **남은 문자열**을 돌려주는 함수입니다.

```text
(입력 문자열)  ==[파서]==>  (결과, 남은 문자열)
```

예를 들어 문자열 맨 앞의 정수를 알아보는 파서는 다음처럼 동작합니다.

```text
"14 is integer"  ==[정수 파서]==>  (14, "is integer")
```

각 파서는 무언가를 알아보기 전에 **공백을 건너뜁니다**. 그래서 <a id="g-token"></a>토큰(token) 사이의 공백은 무시되고,
다음 세 문자열은 모두 똑같이 파싱됩니다.

```text
"1+2*3"      "1+2 * 3"      "1 + 2 * 3"
```

파서를 만드는 방법은 세 가지만 알면 됩니다.

첫째, **정규 표현식**(`"...".r`)이나 문자열은 그 자체로 파서입니다.

```scala
lazy val parser: Parser[String] = "-?[0-9]+".r // parsing integers
```

둘째, 파서들을 **순서**(`~`, `<~`, `~>`)와 **선택**(`|`)으로 **조합**합니다.

```scala
lazy val parser1: Parser[X] = ...
lazy val parser2: Parser[Y] = ...
lazy val parser3: Parser[X] = ...
parser1 ~ parser2   // Parser[X ~ Y]
parser1 <~ parser2  // Parser[X]  (discard the result of `parser2`)
parser1 ~> parser2  // Parser[Y]  (discard the result of `parser1`)
parser1 | parser3   // Parser[X]
```

`p1 ~ p2`는 `p1`으로 파싱한 다음 남은 문자열을 `p2`로 파싱하고, 두 결과를 모두 가집니다.
`<~`와 `~>`도 순서대로 파싱하지만, 화살표가 가리키는 쪽의 결과만 남기고 다른 쪽은 버립니다.
괄호나 쉼표처럼 알아보기만 하면 되고 결과로는 필요 없는 부분을 버릴 때 씁니다. `p1 | p3`는
`p1`을 먼저 시도하고, 실패하면 `p3`를 시도합니다.

셋째, `^^` 연산자로 파서의 결과를 **변환**합니다.

```scala
lazy val parser1: Parser[X] = ...
val f: X => Y = ...
parser1 ^^ f  // Parser[Y]  (apply `f` to the result of `parser1`)
```

### 예제: 정수 리스트 파서

연습 삼아 대괄호 안에 쉼표로 구분한 정수 리스트를 파싱해 봅시다.

```text
"[]"      "[7]"      "[-042, 4, 20]"
```

먼저 정수 하나를 파싱해서 `BigInt`로 바꾸는 파서 `num`부터 만듭니다.

```scala
type P[+T] = PackratParser[T]
lazy val num   : P[BigInt]       = "-?[0-9]+".r ^^ { BigInt(_) }
```

`P[T]`는 `PackratParser[T]`를 짧게 쓰려고 붙인 별명입니다. 정규 표현식으로 정수 모양의 문자열을
알아본 뒤, `^^`로 그 문자열을 `BigInt`로 바꿉니다.

다음으로 쉼표로 구분한 정수들을 파싱하는 `numSeq`를 만듭니다. 세 가지 경우가 있습니다. 정수
뒤에 쉼표가 있고 그 뒤에 다시 정수들이 오거나, 정수가 하나만 있거나, 아무것도 없는 경우입니다.

```scala
lazy val numSeq: P[List[BigInt]] =
  (num <~ ",") ~ numSeq ^^ { case x ~ xs => x :: xs } |
  num                   ^^ { case x      => List(x) } |
  ""                    ^^ { case _      => Nil     }
```

첫 줄의 `(num <~ ",") ~ numSeq`는 정수와 쉼표를 차례로 알아보되 쉼표는 버리고, 다시 `numSeq`로
나머지를 파싱합니다. 결과는 `x ~ xs` 모양이므로 패턴 매칭으로 꺼내 `x :: xs`로 이어 붙입니다.
마지막으로 대괄호로 감싸면 완성입니다.

```scala
lazy val list  : P[List[BigInt]] = "[" ~> numSeq <~ "]"

parseAll(list, "[]").get            // Nil              : List[BigInt]
parseAll(list, "[7]").get           // List(7)          : List[BigInt]
parseAll(list, "[-042, 4, 20]").get // List(-42, 4, 20) : List[BigInt]
```

`parseAll(p, s)`는 문자열 `s` 전체를 파서 `p`로 파싱하고, `.get`으로 그 결과를 꺼냅니다.
`-042`가 `BigInt`로 바뀌면서 `-42`가 된 것을 볼 수 있습니다.

사실 "무언가를 구분자로 나누어 0번 이상 반복"하는 패턴은 아주 흔해서, 라이브러리에 `repsep`이라는
도우미 함수가 준비되어 있습니다. 이걸 쓰면 `numSeq`가 한 줄로 줄어듭니다.

```scala
type P[+T] = PackratParser[T]
lazy val num   : P[BigInt]       = "-?[0-9]+".r ^^ { BigInt(_) }
lazy val numSeq: P[List[BigInt]] = repsep(num, ",")
lazy val list  : P[List[BigInt]] = "[" ~> numSeq <~ "]"

parseAll(list, "[]").get            // Nil              : List[BigInt]
parseAll(list, "[7]").get           // List(7)          : List[BigInt]
parseAll(list, "[-042, 4, 20]").get // List(-42, 4, 20) : List[BigInt]
```

이 밖에도 파서를 쉽게 쓰도록 돕는 함수가 여럿 있습니다.

### 파서 조합기로 만든 `AE` 파서

이제 `AE`의 구체 문법에 맞는 파서를 만들어 봅시다.

```bnf
<expr> ::= <number>
         | <expr> "+" <expr>
         | <expr> "*" <expr>
         | "(" <expr> ")"
```

```scala
lazy val num: P[BigInt] = "-?[0-9]+".r ^^ { BigInt(_) }
lazy val expr: P[Expr] =
  import Expr.*
  lazy val e0: P[Expr] = (e0<~"+")~e1 ^^ { case l~r => Add(l, r) } | e1
  lazy val e1: P[Expr] = (e1<~"*")~e2 ^^ { case l~r => Mul(l, r) } | e2
  lazy val e2: P[Expr] = num          ^^ { case n   => Num(n)    } | e3
  lazy val e3: P[Expr] = "(" ~> e0 <~ ")"
  e0

parseAll(expr, "42").get        // Num(42)                        : Expr
parseAll(expr, "-1 + 7").get    // Add(Num(-1),Num(7))            : Expr
parseAll(expr, "1 + 2 * 3").get // Add(Num(1),Mul(Num(2),Num(3))) : Expr
```

구체 문법은 규칙이 하나인데 파서는 `e0`부터 `e3`까지 네 단계로 나뉘어 있습니다. 바로 앞에서 본
**모호성** 문제를 풀기 위해서입니다.

- **우선순위**: 우선순위가 낮은 연산일수록 바깥 단계에 둡니다. 덧셈(`e0`)이 가장 바깥, 곱셈(`e1`)이
  그 안쪽, 정수(`e2`)와 괄호(`e3`)가 가장 안쪽입니다. 덧셈의 양쪽에는 곱셈식(`e1`)이 올 수 있지만,
  곱셈의 양쪽에는 덧셈식이 괄호 없이 올 수 없습니다. 그래서 `1 + 2 * 3`은 반드시
  `Add(Num(1), Mul(Num(2), Num(3)))`로 파싱됩니다.
- <a id="g-associativity"></a>**결합 방향**: `e0`의 정의 `(e0<~"+")~e1`에서 왼쪽에는 `e0`가, 오른쪽에는 한 단계 안쪽인 `e1`이
  옵니다. 그래서 `1 + 2 + 3`은 왼쪽부터 묶여 `Add(Add(Num(1), Num(2)), Num(3))`이 됩니다.
- **괄호**: `e3`는 괄호 안에서 다시 가장 바깥 단계인 `e0`부터 시작합니다. 괄호로 우선순위를 마음대로
  바꿀 수 있는 이유입니다.

`e0`의 정의가 자기 자신으로 시작한다(<a id="g-left-recursion"></a>왼쪽 재귀, left recursion)는 점이 걱정될 수도 있습니다.
평범한 재귀 하강 파서라면 무한 루프에 빠지지만, `PackratParser`는 왼쪽 재귀를 처리할 수 있도록
만들어져 있어서 괜찮습니다. 파서를 모두 `PackratParser`(`P`)로 선언한 것도 그 때문입니다.

### 제공되는 파서 쓰기

여기까지 읽고 파서 조합기가 조금 어렵게 느껴졌다면 안심하세요. 파서 조합기의 세부 사항은 **몰라도
됩니다.** 이 책과 강의 과제에서 다루는 모든 언어의 **파서는 미리 제공**됩니다. 파서를 쓰고 싶으면
다음처럼 `Expr`에 문자열을 넘기기만 하면 됩니다.

```scala
val x: Expr = Expr("42")        // Num(42)                        : Expr
val y: Expr = Expr("-1 + 7")    // Add(Num(-1),Num(7))            : Expr
val z: Expr = Expr("1 + 2 * 3") // Add(Num(1),Mul(Num(2),Num(3))) : Expr
```

거꾸로 AST를 사람이 읽기 쉬운 **문자열**로 보고 싶으면 `str` 메서드를 씁니다. 구조가 분명히
드러나도록 괄호를 모두 붙여 줍니다.

```scala
x.str    // "42"            : String
y.str    // "(-1 + 7)"      : String
z.str    // "(1 + (2 * 3))" : String
```

## 인터프리터

드디어 인터프리터입니다. 앞에서 정의한 `AE`의 큰 걸음 의미를 그대로 코드로 옮겨 봅시다.

\\[
\boxed{\vdash e \Rightarrow n}
\\]

\\[
\begin{prooftree}
\AxiomC{}
\LeftLabel{$\texttt{Num}$}
\UnaryInfC{$\vdash n \Rightarrow n$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\vdash e_1 \Rightarrow n_1$}
\AxiomC{$\vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Add}$}
\BinaryInfC{$\vdash e_1 \mathbin{\texttt{+}} e_2 \Rightarrow n_1 + n_2$}
\end{prooftree}
\qquad
\begin{prooftree}
\AxiomC{$\vdash e_1 \Rightarrow n_1$}
\AxiomC{$\vdash e_2 \Rightarrow n_2$}
\LeftLabel{$\texttt{Mul}$}
\BinaryInfC{$\vdash e_1 \mathbin{\texttt{&#42;}} e_2 \Rightarrow n_1 \times n_2$}
\end{prooftree}
\\]

판단 \\( \vdash e \Rightarrow n \\)은 "식을 받아 정수를 내놓는다"는 뜻이므로, 인터프리터는 `Expr`를
받아 값을 돌려주는 함수 `interp`가 됩니다. `AE`의 값은 정수뿐이므로 값의 타입 `Value`는 `BigInt`로
둡니다.

```scala
type Value = BigInt
def interp(expr: Expr): Value = expr match
  case Num(n)    => ???
  case Add(l, r) => ???
  case Mul(l, r) => ???
```

규칙이 추상 문법의 경우마다 하나씩 있었으니, `expr`를 패턴 매칭해서 경우마다 `case`를 하나씩
둡니다. `???`는 "아직 구현하지 않음"을 나타내는 Scala의 표현입니다. 이제 규칙을 하나씩 보면서 이
자리를 채워 봅시다.

- \\( \texttt{Num} \\) 규칙은 정수 \\( n \\)이 그대로 \\( n \\)이 된다고 말합니다. 그러니
  `case Num(n) => n`입니다.
- \\( \texttt{Add} \\) 규칙은 두 부분식을 각각 계산한 결과(전제)를 더한다(결론)고 말합니다. 전제의
  "부분식을 계산한다"는 `interp`를 재귀적으로 부르는 것에 해당하므로
  `case Add(l, r) => interp(l) + interp(r)`입니다.
- \\( \texttt{Mul} \\) 규칙도 마찬가지로 `case Mul(l, r) => interp(l) * interp(r)`입니다.

세 자리를 모두 채우면 다음과 같습니다.

```scala
type Value = BigInt
def interp(expr: Expr): Value = expr match
  case Num(n)    => n
  case Add(l, r) => interp(l) + interp(r)
  case Mul(l, r) => interp(l) * interp(r)
```

이것으로 `AE`의 인터프리터가 완성되었습니다. 실행해 봅시다.

```scala
interp(Expr("42"))    // interp(Num(42))                          = 42
interp(Expr("-1+7"))  // interp(Add(Num(-1), Num(7)))             = 6
interp(Expr("1+2*3")) // interp(Add(Num(1), Mul(Num(2), Num(3)))) = 7
```

마지막 예에서 `interp`가 트리의 각 노드에서 계산하는 값을 표시하면 다음과 같습니다.

<div style="text-align:center">
<svg viewBox="-29 -1 243 206" width="100%" style="max-width: 360px; letter-spacing: normal; word-spacing: normal" role="img" aria-label="interp가 Add(Num(1), Mul(Num(2), Num(3)))의 각 노드를 계산한 값. 잎에서 시작해 1, 2, 3, 6, 7 순서로 올라간다" font-family="sans-serif" fill="currentColor">
<line x1="60.0" y1="33.0" x2="0.0" y2="63.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="60.0" y1="33.0" x2="120.0" y2="63.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="0.0" y1="89.0" x2="0.0" y2="119.0" stroke="currentColor" stroke-width="1.4"/>
<text x="0.0" y="137.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">1</text>
<rect x="-20.5" y="63.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="0.0" y="81.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Num</text>
<rect x="26.5" y="66.0" width="19.5" height="20.0" fill="#2f4fb8" rx="4"/>
<text x="36.3" y="80.5" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">1</text>
<line x1="120.0" y1="89.0" x2="80.0" y2="119.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="120.0" y1="89.0" x2="160.0" y2="119.0" stroke="currentColor" stroke-width="1.4"/>
<line x1="80.0" y1="145.0" x2="80.0" y2="175.0" stroke="currentColor" stroke-width="1.4"/>
<text x="80.0" y="193.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">2</text>
<rect x="59.5" y="119.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="80.0" y="137.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Num</text>
<rect x="106.5" y="122.0" width="19.5" height="20.0" fill="#2f4fb8" rx="4"/>
<text x="116.3" y="136.5" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">2</text>
<line x1="160.0" y1="145.0" x2="160.0" y2="175.0" stroke="currentColor" stroke-width="1.4"/>
<text x="160.0" y="193.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">3</text>
<rect x="139.5" y="119.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="160.0" y="137.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Num</text>
<rect x="186.5" y="122.0" width="19.5" height="20.0" fill="#2f4fb8" rx="4"/>
<text x="196.3" y="136.5" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">3</text>
<rect x="99.5" y="63.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="120.0" y="81.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Mul</text>
<rect x="146.5" y="66.0" width="19.5" height="20.0" fill="#2f4fb8" rx="4"/>
<text x="156.3" y="80.5" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">6</text>
<rect x="39.5" y="7.0" width="41.1" height="26.0" fill="none" stroke="currentColor" stroke-width="1.5" rx="4"/>
<text x="60.0" y="25.0" text-anchor="middle" font-size="15" font-family="ui-monospace, Menlo, monospace">Add</text>
<rect x="86.5" y="10.0" width="19.5" height="20.0" fill="#2f4fb8" rx="4"/>
<text x="96.3" y="24.5" text-anchor="middle" font-size="13" font-weight="bold" fill="#ffffff">7</text>
</svg>
</div>

<p style="text-align:center; font-size:0.9em; opacity:0.8">그림: <code>interp</code>는 부분식을 재귀적으로 계산해 아래에서 위로 값을 모읍니다.</p>

추론 규칙과 코드를 나란히 놓고 보면, 규칙 하나가 `case` 하나에, 전제 하나가 재귀 호출 하나에,
결론이 `=>` 오른쪽의 계산에 정확히 대응합니다. 그리고 규칙의 \\( n_1 + n_2 \\)가 수학의 덧셈이었듯,
코드의 `interp(l) + interp(r)`에 있는 `+`도 `AE`의 기호가 아니라 Scala의 `BigInt` 덧셈입니다. 우리는
`AE`의 덧셈을 Scala의 덧셈으로 설명한 셈입니다.

> **생각해 보기.** 인터프리터가 `interp(l)`을 `interp(r)`보다 먼저 부르나요? Scala에서는
> 그렇습니다. 그런데 큰 보폭 의미의 \\( \texttt{Add} \\) 규칙은 두 전제의 순서를 정하지 않습니다.
> `AE`에서는 계산 순서가 결과에 영향을 주지 않으니 문제가 없지만, 나중에
> [변경 가능한 자료 구조](./mutable-data-structures.md)처럼 부수 효과가 있는 기능을 더하면 계산 순서가
> 중요해집니다.

이 장에서 본 "추상 문법을 ADT로, 추론 규칙을 `match`의 `case`로" 옮기는 방법이 앞으로 모든 장에서
되풀이됩니다. 다음 장 [식별자](./identifiers.md)에서는 `AE`에 변수를 더해서 언어를 한 단계 키워
봅니다.

## 정리

- 프로그래밍 언어는 **문법**(프로그램의 구조)과 **의미**(프로그램의 뜻)로 정의됩니다. 파서는
  문법을, 인터프리터는 의미를 따라 만들어집니다.
- 문법은 EBNF로 정의합니다. **구체 문법**은 프로그램의 겉모습을 모두 담아 문자열이 올바른지
  판단하며, 모호성을 없애기 위해 **결합 방향**과 **우선순위** 규칙이 필요합니다. **추상 문법**은
  핵심 구조만 담으며, 추상 문법에 따라 만든 트리가 **AST**입니다. 하나의 추상 문법에 여러 구체
  문법이 대응할 수 있습니다.
- 의미를 정의하는 방법에는 공리 의미, 표시 의미, 연산 의미 등이 있고, 이 책은 **연산 의미**를
  씁니다. 연산 의미는 **추론 규칙**(전제와 결론)으로 정의합니다.
- **큰 걸음 의미** \\( \vdash e \Rightarrow n \\)은 식을 한 번에 최종 값으로 계산하며, 증명은
  **유도 트리**로 보입니다. **작은 걸음 의미** \\( e \to e' \\)는 한 걸음씩 계산하며, 증명은
  **환원 과정**으로 보입니다.
- 구현에서는 추상 문법을 Scala `enum`(ADT)으로 정의하고, 파서는 **파서 조합기**로 만듭니다(이 책에서는
  미리 제공되며 `Expr("...")`로 씁니다). 인터프리터 `interp`는 큰 보폭 의미의 규칙 하나를 `case`
  하나로 옮겨 구현합니다.

## 연습 문제

1. 다음 각 식의 AST를 그리고, `interp`의 결과를 구해 보세요.
   `2 * 3 + 4`, `2 * (3 + 4)`, `1 + 2 + 3 * 4 * 5`
2. \\( \vdash (2 \mathbin{\texttt{+}} 3) \mathbin{\texttt{&#42;}} (4 \mathbin{\texttt{+}} 1) \Rightarrow 25 \\)의 유도 트리를
   그려 보세요.
3. 같은 식 \\( (2 \mathbin{\texttt{+}} 3) \mathbin{\texttt{&#42;}} (4 \mathbin{\texttt{+}} 1) \\)의 작은 보폭 의미에 따른 환원
   과정을 쓰고, 각 걸음에 어느 규칙이 쓰였는지 밝혀 보세요. 몇 걸음이 걸리나요?
4. 작은 보폭 의미의 덧셈 규칙을 고쳐서, 오른쪽 식부터 먼저 계산하도록 바꿔 보세요.
5. `AE`에 뺄셈 \\( e \mathbin{\texttt{-}} e \\)을 더한다고 합시다. 추상 문법, 큰 보폭 의미의 추론 규칙,
   `Expr`의 새 `case`, `interp`의 새 `case`를 각각 써 보세요. 구체 문법에서 뺄셈의 결합 방향을
   왼쪽으로 정해야 하는 이유도 설명해 보세요.
6. 강의 과제 Exercise #1
   ([`AE`](https://github.com/ku-plrg-classroom/docs/tree/main/cose212/ae))에서 `interp`와,
   식에 들어 있는 `Num` 노드의 개수를 세는 `countNums`를 구현해 보세요. 제출할 필요는 없지만, 시험
   문제와 직접 관련되어 있으니 꼭 직접 풀어 보기를 권합니다.
