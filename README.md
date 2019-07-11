# ecmaless

[![Build Status](https://travis-ci.org/farskipper/ecmaless.svg)](https://travis-ci.org/farskipper/ecmaless)
[![stability - experimental](https://img.shields.io/badge/stability-experimental-orange.svg)](https://nodejs.org/api/documentation.html#documentation_stability_index)

A compile to JS language where less is more, worse is better, and reliability is king.

- functional, but not pure
- statically typed (structural, strong, generic/algebraic, and inferred minus function declarations)
- single-file modules (like CommonJS)
- no inheritance (no `class` and no `prototype`)
- no exceptions (errors are values)
- minimal syntax (but not as minimal as lisp, it's more like lua)
- ships with a code formatter (so we don't waste time arguing about style)
- designed for humans who understand skill comes from experience not from tooling and fancy language features

## Code samples

```
; only line comments are supported
; comments start with `;`

; types always start with an uppercase first character
; values always start with a lowercase variable

ann str = String  ; annotate a variable's type
def str = "hello" ; define a variable

def n = 1 ; type of n is inferred

; Map/Hash/Dict/Struct
ann foo = {a: Number}
def foo = {a: 1}

; function bodies are expressions
ann add = Fn(Number, Number) Number
def add = fn(a, b) a + b

; `do` blocks allow you to write statements
ann foo = Fn(Number) Number
def foo = fn(a) do
  def b = 2
  def c = 3
  return a + b + c
end

; tagged unions
def Something
  = #one
  | #two
  | #three
  | #four

def bar = #one
def barN =
  case bar
    when #one
      1
    when #two
      2
    when #three
      3
    when #four
      4
  end

; To say that something will maybe return a value
def Maybe<a>
  = #just(a)
  | #nil

; if expression
def a = if 1 == 1 then 1 else 2

; if statement
if 1 == 1 do
  ; ...
elseif 1 == 1 do
  ; ...
else
  ; ...
end

; while loops are pragmatic
while 1 == 1 do
  ; ...
end
```

There are no namespaces. Files are modules, similar to commonjs.

```
import "./file/path" * ; imports all variables exported
import "./some-file" (a as other, B) ; import just parts

def Type = #one | #two

def a = 1

export(a, Type)
```

### JavaScript Interop

In ecmaless:

```
import "./lib.js" (
  ; use `is` to annotate the type of the js object you import
  add is Fn(Number, Number) Number
)
```

### Style

The goal is clarity. Ecmaless will be one of many languages you use. So it shouldn't be too unfamiliar. It should be easy to read, understand, have consistent rules and that's it. Consistent style is important. We can all learn to read a syntax. There are so many languages and coding styles. Learning a new syntax is frustrating at first, but then you get used to it. And eventually people start loving it and defending it.

Ecmaless will ship with a code formatter that is not configurable. Simply following the lead of [gofmt](https://golang.org/cmd/gofmt/) and [elm-format](https://github.com/avh4/elm-format) which do all the work to keep code formatted, consistent, and avoids pointless arguments. I also recommend [prettier](https://prettier.io/).

Ecmaless decidedly has very little syntactic sugar. Syntatic sugar creates more things a programmer needs to know and can create confussion.

#### No tab character indentation

This is NOT a matter of taste, unless you enjoy the aroma of ascii x09. I used tabs as indentation before. Then I changed. It's not hard, you can too :)

The programming world is converging on spaces rather than tabs for indentation. Analysis of github repos definitely prove [spaces are used more than tabs](https://medium.com/@hoffa/400-000-github-repositories-1-billion-files-14-terabytes-of-code-spaces-or-tabs-7cfe0b5dd7fd) for indentation. Again [by language](http://sideeffect.kr/popularconvention/) and [again](https://ukupat.github.io/tabs-or-spaces/).

There are lots of reasons why the software world is converging on using spaces for indentation.

- [Atwood reasons why tabs are bad](https://blog.codinghorror.com/death-to-the-space-infidels/)
- [Google says no tabs](https://google.github.io/styleguide/)
- [Python says no tabs](https://www.python.org/dev/peps/pep-0008/#tabs-or-spaces)
- [Ruby says no tabs](https://github.com/bbatsov/ruby-style-guide#spaces-indentation)
- [JSLint](http://www.jslint.com/help.html), [standardJS](https://standardjs.com/), and [TypeScript](https://github.com/Microsoft/TypeScript/wiki/Coding-guidelines#style) all say no to tabs!
- [javaranch says no tabs](https://javaranch.com/styleLong.jsp#indent)
- [Zend says no tabs](https://framework.zend.com/manual/2.4/en/ref/coding.standard.html)
- [elm won't parse tabs](https://github.com/avh4/elm-format)

Yes, the language [go uses tabs](https://golang.org/cmd/gofmt/) but the important thing is they made a decision and the community simply adopts it. When I write `go` code, I use tabs! Ironically, their docs says use "tabs for indentation and blanks for alignment." For those who value simplicity, this is _the_ case-in-point against tabs.

Tabs are dead! Let's bury this one and move on with our lives!

#### Boolean operators

`!` is too terse; ecmaless uses `not` instead. It's too easy to overlook a `!` and waste time not understanding a piece of logic.

For example:

`if(!isConfirmed){}` looks almost like `if isConfimred`

Whereas `if not isConfirmed` makes it harder to miss the `not`

## Contributing

This project uses [lerna](https://www.npmjs.com/package/lerna) to manage several sub-packages.

- `packages/ecmaless-tokenizer` source code string -> token array
- `packages/ecmaless-parser` token array -> AST
- `packages/ecmaless-compiler` AST -> javascript EST and type information
- `packages/ecmaless` the main cli that ties everything together

Use `npm run setup` instead of `npm install`. This will use lerna to symlink each package together so changes are reflected between them as you develop.

Each package has it's own tests. Run `npm test -- -w` to watch files and run tests as you make changes.

The compiler is partially implemented. Take a look at the `packages/ecmaless-compiler/test.js` to see what is supported so far.

The parser uses the [Top Down Operator Precedence](http://crockford.com/javascript/tdop/tdop.html) technique.

The code formatter will not use the parser, but rather the tokenizer directly. [Here's why](http://beza1e1.tuxen.de/articles/formatting_code.html)

## Work-in-progress ...maybe not

Ecmaless is a distillation of what I view as my ideal programming language. One that is minimal, pragmatic, and reliable. However, as of 2019 I've had a mindset change and decided the benefits of having an ideal programming language is not worth the cost. Elm and TypeScript have been "good enough" for my needs.

When creating software we produce two artifacts:

1. The source code
2. The running application

Your customers only care about #2. They want an application that solves their problem, is intuitive, reliable, fast, secure etc. They don't care or even think about what language you used to get there. However, as programmers we are concerned with both the code and the running application. If code is messy it becomes increasingly costly and difficult to deliver a quality product.

How much should we invest in code quality vs user experience? Spending too much time on code quality causes us to loose focus on customers and results in a poor user experience and slow development time. Too much emphasis on building features may result in code that is messy, hard to maintain, and slows us down.

Balancing these concerns is not unique to programming. Stephen R. Covey calls it the "P/PC balance" Where P is production and PC is production capability. Striking this balance "is the very essence of effectiveness." For more on this, I recommend the his book, [7 habits](https://en.wikipedia.org/wiki/The_7_Habits_of_Highly_Effective_People).

My thoughts on how to achieve a good balance are centered around beginning with the user experience and working backwards to technology.

1. Understand the customer needs
2. Design the user experience
3. Design the UI
4. Architect the data model and flow
5. Write enough code to get it working
6. `goto` 1

Steps 1-4 involve no coding, but the decisions made there will save tremendous amounts of time. By the time you get to step 5 there is a fairly clear path to implement it. Bad planning makes bad code inevitable. Things like testing, static types, and consistent syntax help code quality a little bit. However, they are all tiny compared to proper design.

Here are some influences on my thinking:

- [Effective Programs - 10 Years of Clojure - Rich Hickey](https://www.youtube.com/watch?v=2V1FtfBDsLU)
- [Jonathan Blow - How to program independent games - CSUA Speech](https://www.youtube.com/watch?v=JjDsP5n2kSM)

## License

MIT
