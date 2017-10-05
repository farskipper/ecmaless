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
    tok1("STRING", "\"one\\ntwo\"");
    try{
        tokenizer("\"one\ntwo\"");
        t.fail("strings must be on one line");
    }catch(e){
        t.deepEquals(e, {
            type: "UnexpectedCharacter",
            message: "Use \"\"\" for multiline strings",
            src: "\n",
            loc: {start: 4, end: 5},
        }, "no ");
    }
    try{
        tokenizer("\"foo");
        t.fail("string must be terminated");
    }catch(e){
        t.deepEquals(e, {
            type: "UnterminatedString",
            message: "Use \" to close your string",
            src: "\"foo",
            loc: {start: 3, end: 4},
        }, "no ");
    }
    try{
        tokenizer("\"foo\\\"");
        t.fail("string must be terminated");
    }catch(e){
        t.deepEquals(e, {
            type: "UnterminatedString",
            message: "Use \" to close your string",
            src: "\"foo\\\"",
            loc: {start: 5, end: 6},
        }, "no ");
    }

    tok1("DOCSTRING", "\"\"\"one\"\"\"");
    tok1("DOCSTRING", "\"\"\"\none\n\"\"\"");
    tok1("DOCSTRING", "\"\"\"one\"\"\"");
    tok1("DOCSTRING", "\"\"\"one\\\"\"\" two \"\\\"\" three \"\"\"");
    try{
        tokenizer("\"\"\"one\"\"");
        t.fail("docstring must be terminated");
    }catch(e){
        t.deepEquals(e, {
            type: "UnterminatedString",
            message: "Use \"\"\" to close your docstring",
            src: "\"\"\"one\"\"",
            loc: {start: 7, end: 8},
        }, "no ");
    }
    try{
        tokenizer("\"\"\"one\\\"\"\"");
        t.fail("docstring must be terminated");
    }catch(e){
        t.deepEquals(e, {
            type: "UnterminatedString",
            message: "Use \"\"\" to close your docstring",
            src: "\"\"\"one\\\"\"\"",
            loc: {start: 9, end: 10},
        }, "no ");
    }
    tokenizer("\"\"\"one\\\"\"\"\"");

    tok1("SYMBOL", "foo");
    tok1("SYMBOL", "fooBar");
    tok1("SYMBOL", "foo_bar");
    tok1("SYMBOL", "a1");
    tok1("SYMBOL", "_B");
    tok1("TYPE", "Foo");
    tok1("TYPE", "Foo_bar");
    tok1("TYPE", "A1");

    tok1("COMMENT", "; some comment");

    tok1("RAW", "{");
    tok1("RAW", "==");
    tok1("RAW", "!=");
    tok1("RAW", "|");


    var testTokens = function(src, expected, message){
        var tokens = tokenizer(src);

        t.deepEquals(_.map(tokens, function(tok){
            var loc_src = src.substring(tok.loc.start, tok.loc.end);
            t.equals(tok.src, loc_src, "loc should point to the same src string");
            return _.padEnd(tok.type, 7) + "|" + tok.src;
        }), expected, message);

        t.equals(_.map(tokens, "src").join(""), src, "all src should be tokenized");
    };

    testTokens("foo$", [
        "SYMBOL |foo",
        "RAW    |$",
    ], "$ is not part of a symbol");

    testTokens("123 \"four\"\nblah", [
        "NUMBER |123",
        "SPACES | ",
        "STRING |\"four\"",
        "NEWLINE|\n",
        "SYMBOL |blah",
    ]);

    testTokens("10 0.1 1.0", [
        "NUMBER |10",
        "SPACES | ",
        "NUMBER |0.1",
        "SPACES | ",
        "NUMBER |1.0",
    ]);

    testTokens("({[]})", [
        "RAW    |(",
        "RAW    |{",
        "RAW    |[",
        "RAW    |]",
        "RAW    |}",
        "RAW    |)",
    ]);

    testTokens("*:", [
        "RAW    |*",
        "RAW    |:",
    ]);

    testTokens("<", [
        "RAW    |<",
    ]);
    testTokens("<=", [
        "RAW    |<=",
    ]);
    testTokens("<!==", [
        "RAW    |<",
        "RAW    |!=",
        "RAW    |=",
    ]);


    var src = "";
    src += "deps:\n";
    src += "    a [\n";
    src += "        1\n";
    src += "    ]\n";
    testTokens(src, [
        "SYMBOL |deps",
        "RAW    |:",
        "NEWLINE|\n",
        "SPACES |    ",
        "SYMBOL |a",
        "SPACES | ",
        "RAW    |[",
        "NEWLINE|\n",
        "SPACES |        ",
        "NUMBER |1",
        "NEWLINE|\n",
        "SPACES |    ",
        "RAW    |]",
        "NEWLINE|\n",
    ]);

    testTokens("1;some comment\n2", [
        "NUMBER |1",
        "COMMENT|;some comment",
        "NEWLINE|\n",
        "NUMBER |2",
    ]);

    testTokens("[\n    1,\n    2,\n]", [
        "RAW    |[",
        "NEWLINE|\n",
        "SPACES |    ",
        "NUMBER |1",
        "RAW    |,",
        "NEWLINE|\n",
        "SPACES |    ",
        "NUMBER |2",
        "RAW    |,",
        "NEWLINE|\n",
        "RAW    |]"
    ]);

    testTokens("1\n;some comment", [
        "NUMBER |1",
        "NEWLINE|\n",
        "COMMENT|;some comment",
    ]);

    testTokens("1\n;some comment\n2", [
        "NUMBER |1",
        "NEWLINE|\n",
        "COMMENT|;some comment",
        "NEWLINE|\n",
        "NUMBER |2",
    ]);

    testTokens("\"\"\"foo\"\"\"a", [
        "DOCSTRING|\"\"\"foo\"\"\"",
        "SYMBOL |a",
    ]);

    try{
        tokenizer("a:\n\tb");
        t.fail("should throw on tabs");
    }catch(e){
        t.deepEquals(e, {
            type: "InvalidCharacter",
            message: "Tabs (\\t) are not allowed. Just use 4 spaces instead.",
            src: "\t",
            loc: {start: 3, end: 4},
        }, "no tabs");
    }

    try{
        tokenizer("a:\r\n    b");
        t.fail("should throw on \\r");
    }catch(e){
        t.deepEquals(e, {
            type: "InvalidCharacter",
            message: "Carriage returns (\\r) are not allowed. Use newline (\\n) instead.",
            src: "\r",
            loc: {start: 2, end: 3},
        }, "no \\r");
    }


    t.end();
});
