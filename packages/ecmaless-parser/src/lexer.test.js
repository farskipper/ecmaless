var _ = require("lodash");
var test = require("tape");
var lexer = require("./lexer");
var tokenizer = require("./tokenizer");

test("lexer", function(t){

    var testLex = function(src, expected){
        var tokens = lexer(tokenizer(src));

        t.deepEquals(_.map(tokens, function(tok){
            var loc_src = src.substring(tok.loc.start, tok.loc.end);
            if(tok.type !== "DOCSTRING"){
                t.equals(tok.src, loc_src, "loc should point to the same src string");
            }
            return _.padEnd(tok.type, 7) + "|" + tok.src;
        }), expected);
    };

    testLex("a\n;comment\n    \n\nb", [
        "SYMBOL |a",
        "NEWLINE|\n",
        "SYMBOL |b",
        "NEWLINE|",
    ]);

    testLex("a\n;comment\n    \n\n    b", [
        "SYMBOL |a",
        "NEWLINE|\n",
        "INDENT |    ",
        "SYMBOL |b",
        "NEWLINE|",
        "DEDENT |",
        "NEWLINE|",
    ]);

    testLex("a\n\n    ;comment\n    \n    b", [
        "SYMBOL |a",
        "NEWLINE|\n",
        "INDENT |    ",
        "SYMBOL |b",
        "NEWLINE|",
        "DEDENT |",
        "NEWLINE|",
    ]);

    testLex("a\n        b\n    c", [
        "SYMBOL |a",
        "NEWLINE|\n",
        "INDENT |    ",
        "INDENT |    ",
        "SYMBOL |b",
        "NEWLINE|\n",
        "DEDENT |",
        "NEWLINE|",
        "SYMBOL |c",
        "NEWLINE|",
        "DEDENT |",
        "NEWLINE|",
    ]);

    testLex("def a\n    b    c", [
        "SYMBOL |def",
        "SYMBOL |a",
        "NEWLINE|\n",
        "INDENT |    ",
        "SYMBOL |b",
        "SYMBOL |c",
        "NEWLINE|",
        "DEDENT |",
        "NEWLINE|",
    ]);

    testLex("[\n    a\n    b\n]", [
        "RAW    |[",
        "NEWLINE|\n",
        "INDENT |    ",
        "SYMBOL |a",
        "NEWLINE|\n",
        "SYMBOL |b",
        "NEWLINE|\n",
        "DEDENT |",
        "NEWLINE|",
        "RAW    |]",
        "NEWLINE|",
    ]);

    testLex("fn args:\n    a", [
        "SYMBOL |fn",
        "SYMBOL |args",
        "RAW    |:",
        "NEWLINE|\n",
        "INDENT |    ",
        "SYMBOL |a",
        "NEWLINE|",
        "DEDENT |",
        "NEWLINE|",
    ]);

    testLex("a\n;comment", [
        "SYMBOL |a",
        "NEWLINE|\n",
    ]);

    testLex("a\n    b\nc", [
        "SYMBOL |a",
        "NEWLINE|\n",
        "INDENT |    ",
        "SYMBOL |b",
        "NEWLINE|\n",
        "DEDENT |",
        "NEWLINE|",
        "SYMBOL |c",
        "NEWLINE|",
    ]);

    testLex("\"\"\"\nhello world\n\"\"\"", [
        "DOCSTRING|\"\"\"\nhello world\n\"\"\"",
        "NEWLINE|",
    ]);

    testLex("\"\"\"\nhello\n     world\n\"\"\"", [
        "DOCSTRING|\"\"\"\nhello\n     world\n\"\"\"",
        "NEWLINE|",
    ]);

    testLex("a:\n    \"\"\"\n    hello world\n         ?\n    \"\"\"\n", [
        "SYMBOL |a",
        "RAW    |:",
        "NEWLINE|\n",
        "INDENT |    ",
        "DOCSTRING|\"\"\"\nhello world\n     ?\n\"\"\"",
        "NEWLINE|\n",
        "DEDENT |",
        "NEWLINE|",
    ]);

    try{
        lexer(tokenizer("a:\n  b"));
        t.fail("should throw on invalid indent");
    }catch(e){
        t.deepEquals(e, {
            type: "InvalidIndentation",
            message: "use 4 space indentation",
            src: "  ",
            loc: {start: 3, end: 5},
        }, "throw on invalid indent");
    }

    try{
        lexer(tokenizer("a:\n     b"));
        t.fail("should throw on invalid indent");
    }catch(e){
        t.deepEquals(e, {
            type: "InvalidIndentation",
            message: "use 4 space indentation",
            src: " ",
            loc: {start: 7, end: 8},
        }, "throw on invalid indent");
    }

    try{
        lexer(tokenizer("a:\n    b\n   c"));
        t.fail("should throw on invalid indent");
    }catch(e){
        t.deepEquals(e, {
            type: "InvalidIndentation",
            message: "use 4 space indentation",
            src: "   ",
            loc: {start: 9, end: 12},
        }, "throw on invalid indent");
    }

    try{
        lexer(tokenizer("a:\n    \"\"\"\n    hello world\n   \"\"\"\n"));
        t.fail("Dosctrings should match indentation");
    }catch(e){
        t.deepEquals(e, {
            type: "InvalidIndentation",
            message: "Docstrings should match indentation. Don't worry, indentation is not included in the string.",
            src: "   ",
            loc: {start: 27, end: 31},
        }, "Dosctrings should match indentation");
    }

    t.end();
});
