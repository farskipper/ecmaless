var _ = require("lodash");
var test = require("tape");
var lexer = require("./lexer");
var tokenizer = require("./tokenizer");

test("lexer", function(t){

    var testLex = function(src, expected){
        var tokens = lexer(tokenizer(src));

        t.deepEquals(_.map(tokens, function(tok){
            var loc_src = src.substring(tok.loc.start, tok.loc.end);
            t.equals(tok.src, loc_src, "loc should point to the same src string");
            return _.padEnd(tok.type, 7) + "|" + tok.src;
        }), expected);
    };

    testLex("a\n;comment\n    \n\nb", [
        "SYMBOL |a",
        "NEWLINE|\n",
        "SYMBOL |b",
    ]);

    testLex("a\n;comment\n    \n\n    b", [
        "SYMBOL |a",
        "NEWLINE|\n",
        "INDENT |    ",
        "SYMBOL |b",
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

    t.end();
});
