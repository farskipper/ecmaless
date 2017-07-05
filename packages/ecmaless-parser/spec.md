# AST Specification
All AST nodes will have a `loc` property. It's identical to the [estree loc](https://github.com/estree/estree/blob/master/spec.md#node-objects). These examples omit `loc` for brevity.

### Literals

```js
100.25
{"type": "Number", "value": 100.25}

"Hi!"
{"type": "String", "value": "Hi!"}

foo
{"type": "Identifier", "value": "foo"}

nil
{"type": "Nil"}

true
{"type": "Boolean", "value": true}

false
{"type": "Boolean", "value": false}

[1, 2, 3]
{
    "type": "Array",
    "value": [
        {"type": "Number", "value": 1},
        {"type": "Number", "value": 2},
        {"type": "Number", "value": 3}
    ]
}

{"a": 1, b: 2}
{
    "type": "Struct",
    "value": [
        {"type": "String", "value": "a"},
        {"type": "Number", "value": 1},
        {"type": "Symbol", "value": "b"},
        {"type": "Number", "value": 2}
    ]
}
```

### Functions

```js
fn args:
    nil
{
    "type": "Function",
    "params": {"type": "Identifier", "value": "args"},
    "block": {
        "type": "Block",
        "body": [{"type": "ExpressionStatement", "expression": {"type": "Nil"}}]
    }
}

fn [a, b...]:
    nil
{
    "type": "Function",
    "params": [
        {"type": "Identifier", "value": "a"},
        {"type": "DotDotDot", "value": {"type": "Identifier", "value": "b"}}
    ],
    "block": {
        "type": "Block",
        "body": [{"type": "ExpressionStatement", "expression": {"type": "Nil"}}]
    }
}

return a
{"type": "Return", "expression": {"type": "Identifier", "value": "a"}}

add(1, 2)
{
    "type": "Application",
    "callee": {"type": "Identifier", "value": "add"},
    "args": [{"type": "Number", "value": 1}, {"type": "Number", "value": 2}]
}
```

### Operators

```js
-1
{"type": "UnaryOperator", "op": "-", "arg": {"type": "Number", "value": 1}}

not a
{
    "type": "UnaryOperator",
    "op": "not",
    "arg": {"type": "Identifier", "value": "a"}
}

1 + 2 * 3
{
    "type": "InfixOperator",
    "op": "+",
    "left": {"type": "Number", "value": 1},
    "right": {
        "type": "InfixOperator",
        "op": "*",
        "left": {"type": "Number", "value": 2},
        "right": {"type": "Number", "value": 3}
    }
}

a and b or c
{
    "type": "InfixOperator",
    "op": "or",
    "left": {
        "type": "InfixOperator",
        "op": "and",
        "left": {"type": "Identifier", "value": "a"},
        "right": {"type": "Identifier", "value": "b"}
    },
    "right": {"type": "Identifier", "value": "c"}
}
```

### Control Flow

```js
if a:
    b
else:
    c
{
    "type": "If",
    "test": {"type": "Identifier", "value": "a"},
    "then": {
        "type": "Block",
        "body": [
            {
                "type": "ExpressionStatement",
                "expression": {"type": "Identifier", "value": "b"}
            }
        ]
    },
    "else": {
        "type": "Block",
        "body": [
            {
                "type": "ExpressionStatement",
                "expression": {"type": "Identifier", "value": "c"}
            }
        ]
    }
}

cond:
    a == 1:
        b
    c == 3:
        d
    else:
        e
{
    "type": "Cond",
    "blocks": [
        {
            "type": "CondBlock",
            "test": {
                "type": "InfixOperator",
                "op": "==",
                "left": {"type": "Identifier", "value": "a"},
                "right": {"type": "Number", "value": 1}
            },
            "block": {
                "type": "Block",
                "body": [
                    {
                        "type": "ExpressionStatement",
                        "expression": {"type": "Identifier", "value": "b"}
                    }
                ]
            }
        },
        {
            "type": "CondBlock",
            "test": {
                "type": "InfixOperator",
                "op": "==",
                "left": {"type": "Identifier", "value": "c"},
                "right": {"type": "Number", "value": 3}
            },
            "block": {
                "type": "Block",
                "body": [
                    {
                        "type": "ExpressionStatement",
                        "expression": {"type": "Identifier", "value": "d"}
                    }
                ]
            }
        }
    ],
    "else": {
        "type": "Block",
        "body": [
            {
                "type": "ExpressionStatement",
                "expression": {"type": "Identifier", "value": "e"}
            }
        ]
    }
}

case a:
    1:
        b
    2:
        c
    else:
        d
{
    "type": "Case",
    "to_test": {"type": "Identifier", "value": "a"},
    "blocks": [
        {
            "type": "CaseBlock",
            "value": {"type": "Number", "value": 1},
            "block": {
                "type": "Block",
                "body": [
                    {
                        "type": "ExpressionStatement",
                        "expression": {"type": "Identifier", "value": "b"}
                    }
                ]
            }
        },
        {
            "type": "CaseBlock",
            "value": {"type": "Number", "value": 2},
            "block": {
                "type": "Block",
                "body": [
                    {
                        "type": "ExpressionStatement",
                        "expression": {"type": "Identifier", "value": "c"}
                    }
                ]
            }
        }
    ],
    "else": {
        "type": "Block",
        "body": [
            {
                "type": "ExpressionStatement",
                "expression": {"type": "Identifier", "value": "d"}
            }
        ]
    }
}

while a:
    b
{
    "type": "While",
    "test": {"type": "Identifier", "value": "a"},
    "block": {
        "type": "Block",
        "body": [
            {
                "type": "ExpressionStatement",
                "expression": {"type": "Identifier", "value": "b"}
            }
        ]
    }
}

break
{"type": "Break"}

continue
{"type": "Continue"}

try:
    a
catch err:
    b
finally:
    c
{
    "type": "TryCatch",
    "try_block": {
        "type": "Block",
        "body": [
            {
                "type": "ExpressionStatement",
                "expression": {"type": "Identifier", "value": "a"}
            }
        ]
    },
    "catch_id": {"type": "Identifier", "value": "err"},
    "catch_block": {
        "type": "Block",
        "body": [
            {
                "type": "ExpressionStatement",
                "expression": {"type": "Identifier", "value": "b"}
            }
        ]
    },
    "finally_block": {
        "type": "Block",
        "body": [
            {
                "type": "ExpressionStatement",
                "expression": {"type": "Identifier", "value": "c"}
            }
        ]
    }
}
```

### Variables

```js
def a
{"type": "Define", "id": {"type": "Identifier", "value": "a"}}

def a = 1
{
    "type": "Define",
    "id": {"type": "Identifier", "value": "a"},
    "init": {"type": "Number", "value": 1}
}

a = 2
{
    "type": "AssignmentExpression",
    "op": "=",
    "left": {"type": "Identifier", "value": "a"},
    "right": {"type": "Number", "value": 2}
}
```

### Data Access

```js
a.b.c
{
    "type": "MemberExpression",
    "object": {
        "type": "MemberExpression",
        "object": {"type": "Identifier", "value": "a"},
        "path": {"type": "Identifier", "value": "b"},
        "method": "dot"
    },
    "path": {"type": "Identifier", "value": "c"},
    "method": "dot"
}

matrix[i][j]
{
    "type": "MemberExpression",
    "object": {
        "type": "MemberExpression",
        "object": {"type": "Identifier", "value": "matrix"},
        "path": {"type": "Identifier", "value": "i"},
        "method": "index"
    },
    "path": {"type": "Identifier", "value": "j"},
    "method": "index"
}

obj[key]
{
    "type": "MemberExpression",
    "object": {"type": "Identifier", "value": "obj"},
    "path": {"type": "Identifier", "value": "key"},
    "method": "index"
}
```

### Module

```js
import:
    a "./a"
    b "./b"

a(b)
{
    "type": "Module",
    "import": [
        {
            "type": "Import",
            "id": {"type": "Identifier", "value": "a"},
            "path": {"type": "String", "value": "./a"}
        },
        {
            "type": "Import",
            "id": {"type": "Identifier", "value": "b"},
            "path": {"type": "String", "value": "./b"}
        }
    ],
    "body": [
        {
            "type": "ExpressionStatement",
            "expression": {
                "type": "Application",
                "callee": {"type": "Identifier", "value": "a"},
                "args": [{"type": "Identifier", "value": "b"}]
            }
        }
    ],
    "export": null
}

export a
{
    "type": "Module",
    "import": [],
    "body": [],
    "export": {"type": "Identifier", "value": "a"}
}
```
