var _ = require("lodash");
var test = require("tape");
var tokenizer = require("./tokenizer");

test("tokenizer", function(t){

    var tok1 = function(type, src){
        t.deepEquals(tokenizer(src), [
            {
                type: type,
                src: src,
                loc: {start: 0, end: src.length},
            },
        ]);
    };

    tok1("NUMBER", "0");
    tok1("NUMBER", "123");
    tok1("NUMBER", "123.45");
    tok1("NUMBER", ".45");

    tok1("STRING", "\"\"");
    tok1("STRING", "\"foo\"");
    tok1("STRING", "\"one \\\" two\"");

    tok1("SYMBOL", "foo");
    tok1("SYMBOL", "fooBar");
    tok1("SYMBOL", "Baz_qux");

    tok1("COMMENT", "; some comment");

    tok1("RAW", "{");
    tok1("RAW", "==");
    tok1("RAW", "!");
    tok1("RAW", "!=");
    tok1("RAW", "|");
    tok1("RAW", "||");


    var testOrder = function(src, tok_order){
        t.deepEquals(_.map(tokenizer(src), function(tok){
            if(tok.type === "RAW"){
                return tok.src;
            }
            return tok.type;
        }), tok_order);
    };

    testOrder("123 \"four\"\nblah", [
        "NUMBER",
        "SPACES",
        "STRING",
        "NEWLINE",
        "SYMBOL",
    ]);

    testOrder("10 0.1 1.0", [
        "NUMBER",
        "SPACES",
        "NUMBER",
        "SPACES",
        "NUMBER",
    ]);

    testOrder("({[]})", ["(", "{", "[", "]", "}", ")"]);


    testOrder("deps:\n    1", [
        "SYMBOL",
        ":",
        "NEWLINE",
        "INDENT",
        "NUMBER",
        "DEDENT",
    ]);

    testOrder("deps:\n        1", [
        "SYMBOL",
        ":",
        "NEWLINE",
        "INDENT",
        "INDENT",
        "NUMBER",
        "DEDENT",
        "DEDENT",
    ]);
    testOrder("deps:\n        1\n    2", [
        "SYMBOL",
        ":",
        "NEWLINE",
        "INDENT",
        "INDENT",
        "NUMBER",
        "NEWLINE",
        "DEDENT",
        "NUMBER",
        "DEDENT",
    ]);
    testOrder("deps:\n        1    3\n    2", [
        "SYMBOL",
        ":",
        "NEWLINE",
        "INDENT",
        "INDENT",
        "NUMBER",
        "SPACES",
        "NUMBER",
        "NEWLINE",
        "DEDENT",
        "NUMBER",
        "DEDENT",
    ]);

    var src = "";
    src += "deps:\n";
    src += "    a [\n";
    src += "        1\n";
    src += "    ]\n";
    testOrder(src, [
        "SYMBOL",
        ":",
        "NEWLINE",
        "INDENT",
        "SYMBOL",
        "SPACES",
        "[",
        "NEWLINE",
        "INDENT",
        "NUMBER",
        "NEWLINE",
        "DEDENT",
        "]",
        "NEWLINE",
        "DEDENT",
    ]);

    testOrder("1;some comment\n2", [
        "NUMBER",
        "COMMENT",
        "NEWLINE",
        "NUMBER",
    ]);

    testOrder("[\n    1,\n    2,\n]", [
        "[",
        "NEWLINE",
        "INDENT",
        "NUMBER", ",", "NEWLINE",
        "NUMBER", ",", "NEWLINE",
        "DEDENT",
        "]"
    ]);

    testOrder("1\n;some comment", [
        "NUMBER",
        "NEWLINE",
        "COMMENT",
    ]);

    testOrder("1\n;some comment\n2", [
        "NUMBER",
        "NEWLINE",
        "COMMENT",
        "NEWLINE",
        "NUMBER",
    ]);

    t.end();
});
