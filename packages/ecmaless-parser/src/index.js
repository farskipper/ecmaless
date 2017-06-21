var nearley = require("nearley");
var grammar = require("./grammar.js");
var tokenizer = require("./tokenizer");
var excerptAtLineCol = require("excerpt-at-line-col");

var fmtErrorWithExcerpt = function(err, info){
    var msg = "" + err;
    msg = msg.replace(/Error\s*:/g, "");
    msg = msg.replace(/nearley\s*:/g, "");
    msg = msg.replace(/\(@.*\)/g, "");
    msg = msg.replace(/\./g, "");
    msg = msg.trim();

    msg += "\n" + (info.filepath  || "") + ":" + (info.line + 1) + ":" + info.col;

    msg += "\n \n" + excerptAtLineCol(info.src, info.line, info.col, 0);

    err.message = msg;
    err.where = {
        filepath: info.filepath,
        line: info.line + 1,
        col: info.col,
        excerpt: excerptAtLineCol(info.src, info.line, info.col, 3)
    };
    return err;
};

module.exports = function(src, opts){
    opts = opts || {};

    var tokens;
    try{
        tokens = tokenizer(src, {filepath: opts.filepath});
    }catch(e){
        if(e.tokenizer2){
            throw fmtErrorWithExcerpt(e, {
                src: src,
                filepath: opts.filepath,
                line: e.tokenizer2.line - 1,
                col: e.tokenizer2.col - 1
            });
        }
        throw e;
    }

    var p = new nearley.Parser(grammar.ParserRules, grammar.ParserStart);
    try{
        p.feed(tokens);
    }catch(e){
        if(typeof e.offset === "number"){
            var tok = tokens[e.offset];
            if(tok && tok.loc){
                throw fmtErrorWithExcerpt(e, {
                    src: src,
                    filepath: opts.filepath,
                    line: tok.loc.start.line - 1,
                    col: tok.loc.start.column
                });
            }
        }
        throw e;
    }

    if(p.results.length !== 1){
        throw new Error(
            "Parsing Ambiguity: " + p.results.length + " parsings found"
        );
    }
    return p.results[0];
};
