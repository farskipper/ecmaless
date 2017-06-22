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


    var testTokens = function(src, expected){
        var tokens = tokenizer(src);

        t.deepEquals(_.map(tokens, function(tok){
            var loc_src = src.substring(tok.loc.start, tok.loc.end);
            t.equals(tok.src, loc_src, "loc should point to the same src string");
            return _.padEnd(tok.type, 7) + "|" + tok.src;
        }), expected);
    };

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


    testTokens("deps:\n    1", [
        "SYMBOL |deps",
        "RAW    |:",
        "NEWLINE|\n",
        "INDENT |",
        "NUMBER |1",
        "DEDENT |",
    ]);

    testTokens("deps:\n        1", [
        "SYMBOL |deps",
        "RAW    |:",
        "NEWLINE|\n",
        "INDENT |",
        "INDENT |",
        "NUMBER |1",
        "DEDENT |",
        "DEDENT |",
    ]);
    testTokens("deps:\n        1\n    2", [
        "SYMBOL |deps",
        "RAW    |:",
        "NEWLINE|\n",
        "INDENT |",
        "INDENT |",
        "NUMBER |1",
        "NEWLINE|\n",
        "DEDENT |",
        "NUMBER |2",
        "DEDENT |",
    ]);
    testTokens("deps:\n        1    3\n    2", [
        "SYMBOL |deps",
        "RAW    |:",
        "NEWLINE|\n",
        "INDENT |",
        "INDENT |",
        "NUMBER |1",
        "SPACES |    ",
        "NUMBER |3",
        "NEWLINE|\n",
        "DEDENT |",
        "NUMBER |2",
        "DEDENT |",
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
        "INDENT |",
        "SYMBOL |a",
        "SPACES | ",
        "RAW    |[",
        "NEWLINE|\n",
        "INDENT |",
        "NUMBER |1",
        "NEWLINE|\n",
        "DEDENT |",
        "RAW    |]",
        "NEWLINE|\n",
        "DEDENT |",
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
        "INDENT |",
        "NUMBER |1",
        "RAW    |,",
        "NEWLINE|\n",
        "NUMBER |2",
        "RAW    |,",
        "NEWLINE|\n",
        "DEDENT |",
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

    t.end();
});
