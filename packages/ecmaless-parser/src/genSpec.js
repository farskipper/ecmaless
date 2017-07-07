var _ = require("lodash");
var rmLoc = require("./rmLoc");
var parser = require("./");
var stringify = require("json-stringify-pretty-compact");

console.log("# AST Specification");
console.log("All AST nodes will have a `loc` property. It's identical to the [estree loc](https://github.com/estree/estree/blob/master/spec.md#node-objects). These examples omit `loc` for brevity.");
_.each({
    "### Literals": [
        "100.25",
        "\"Hi!\"",
        "foo",
        "nil",
        "true",
        "false",
        "[1, 2, 3]",
        "{\"a\": 1, b: 2}",
    ],
    "### Functions": [
        "fn args:\n    nil",
        "fn [a, b...]:\n    nil",
        "return a",
        "add(1, 2)",
    ],
    "### Operators": [
        "-1",
        "not a",
        "1 + 2 * 3",
        "a and b or c",
    ],
    "### Control Flow": [
        "if a:\n    b\nelse:\n    c",
        "cond:\n    a == 1:\n        b\n    c == 3:\n        d\n    else:\n        e",
        "case a:\n    1:\n        b\n    2:\n        c\n    else:\n        d",
        "while a:\n    b",
        "break",
        "continue",
        "try:\n    a\ncatch err:\n    b\nfinally:\n    c",
    ],
    "### Variables": [
        "def a",
        "def a = 1",
        "a = 2",
    ],
    "### Data Access": [
        "a.b.c",
        "matrix[i][j]",
        "obj[key]",
    ],
    "### Module": [
        [
            "import:",
            "    \"./a\":",
            "        a",
            "        c as d",
            "        Foo",
            "        Bar as Baz",
            "",
            "    \"b\":",
            "        * as b",
            "",
            "    \"c\":",
            "        *",
        ].join("\n"),

        [
            "export:",
            "    a",
            "    Foo",
        ].join("\n"),

        [
            "export:",
            "    *",
        ].join("\n"),
    ]
}, function(srcs, head){
    console.log();
    console.log(head);
    if(_.isEmpty(srcs)){
        return;
    }
    console.log();
    console.log("```js\n" + _.map(srcs, function(src){
        var ast = rmLoc(parser(src));
        if(ast["import"].length === 0 && !ast["export"]){
            ast = ast.body;
        }
        ast = _.isArray(ast) && _.size(ast) === 1 ? _.head(ast) : ast;
        if(ast.type === "ExpressionStatement"){
            ast = ast.expression;
        }
        return src + "\n" + stringify(ast, {maxLength: 80, indent: 4});
    }).join("\n\n") + "\n```");
});
