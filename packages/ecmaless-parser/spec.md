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
fn (a, b) :
    nil
{
    "type": "Function",
    "params": [
        {"type": "Identifier", "value": "a"},
        {"type": "Identifier", "value": "b"}
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
    "./a":
        a
        c as d
        Foo
        Bar as Baz

    "b":
        * as b

    "c":
        *
{
    "type": "ImportBlock",
    "modules": [
        {
            "type": "Import",
            "path": {"type": "String", "value": "./a"},
            "names": [
                {
                    "type": "ImportName",
                    "name": {"type": "Identifier", "value": "a"},
                    "as": null
                },
                {
                    "type": "ImportName",
                    "name": {"type": "Identifier", "value": "c"},
                    "as": {"type": "Identifier", "value": "d"}
                },
                {
                    "type": "ImportName",
                    "name": {"type": "Type", "value": "Foo", "params": []},
                    "as": null
                },
                {
                    "type": "ImportName",
                    "name": {"type": "Type", "value": "Bar", "params": []},
                    "as": {"type": "Type", "value": "Baz", "params": []}
                }
            ]
        },
        {
            "type": "Import",
            "path": {"type": "String", "value": "b"},
            "names": [
                {
                    "type": "ImportName",
                    "name": null,
                    "as": {"type": "Identifier", "value": "b"}
                }
            ]
        },
        {
            "type": "Import",
            "path": {"type": "String", "value": "c"},
            "names": [{"type": "ImportName", "name": null, "as": null}]
        }
    ]
}

export:
    a
    Foo
{
    "type": "ExportBlock",
    "names": [
        {"type": "ExportName", "name": {"type": "Identifier", "value": "a"}},
        {
            "type": "ExportName",
            "name": {"type": "Type", "value": "Foo", "params": []}
        }
    ]
}

export:
    *
{"type": "ExportBlock", "names": [{"type": "ExportName", "name": null}]}
```
