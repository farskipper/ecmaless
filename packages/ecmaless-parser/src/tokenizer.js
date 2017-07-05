var raw_toks = {
    ":": true,
    ",": true,
    ".": true,
    "..": true,//not actually used, this is just a hack
    "...": true,
    "?": true,
    "=": true,
    "(": true,
    ")": true,
    "[": true,
    "]": true,
    "{": true,
    "}": true,
    "==": true,
    "!=": true,
    "<": true,
    "<=": true,
    ">": true,
    ">=": true,
    "+": true,
    "-": true,
    "*": true,
    "/": true,
    "%": true,
};

module.exports = function(src, opts){
    opts = opts || {};

    var throwOnInvalidChar = function(c, message){
        var i = src.indexOf(c);
        if(i >= 0){
            throw {
                type: "InvalidCharacter",
                message: message,
                src: c,
                loc: {start: i, end: i + 1},
            };
        }
    };

    throwOnInvalidChar("\t", "Tabs (\\t) are not allowed. Just use 4 spaces instead.");
    throwOnInvalidChar("\r", "Carriage returns (\\r) are not allowed. Use newline (\\n) instead.");


    var tokens = [];

    var next_is_escaped;

    var c;
    var buff = "";
    var i = 0;
    var next_start = 0;

    var pushTok = function(type){
        var loc = {start: next_start, end: next_start + buff.length};
        tokens.push({
            type: type,
            src: buff,
            loc: loc
        });
        next_start = loc.end;
        buff = "";
    };

    while(i < src.length){
        c = src[i];

        ////////////////////////////////////////////////////////////////////////
        //spaces
        if(c === " "){
            buff = c;
            while(i < src.length){
                c = src[i];
                if(src[i + 1] !== " "){
                    break;
                }
                buff += c;
                i += 1;
            }
            if(buff.length > 0){
                pushTok("SPACES");
            }


        ////////////////////////////////////////////////////////////////////////
        //newline
        }else if(c === "\n"){
            buff = c;
            pushTok("NEWLINE");

        ////////////////////////////////////////////////////////////////////////
        //docstring
        }else if(c === "\"" && src[i + 1] === "\"" && src[i + 2] === "\""){
            buff = "\"\"\"";
            i += 3;
            next_is_escaped = false;
            while(i < src.length){
                c = src[i];
                buff += c;
                if(next_is_escaped){
                    next_is_escaped = false;
                }else{
                    if(c === "\\"){
                        next_is_escaped = true;
                    }
                    if(c === "\"" && src[i + 1] === "\"" && src[i + 2] === "\""){
                        buff += "\"\"";
                        i += 2;
                        break;
                    }
                }
                i += 1;
            }
            if( ! /"""$/.test(buff) || /\\"""$/.test(buff)){
                throw {
                    type: "UnterminatedString",
                    message: "Use \"\"\" to close your docstring",
                    src: buff,
                    loc: {start: i - 1, end: i},
                };
            }
            pushTok("DOCSTRING");



        ////////////////////////////////////////////////////////////////////////
        //string
        }else if(c === "\""){
            buff = c;
            i += 1;
            next_is_escaped = false;
            while(i < src.length){
                c = src[i];
                buff += c;
                if(c === "\n"){
                    throw {
                        type: "UnexpectedCharacter",
                        message: "Use \"\"\" for multiline strings",
                        src: c,
                        loc: {start: i, end: i + 1},
                    };
                }
                if(next_is_escaped){
                    next_is_escaped = false;
                }else{
                    if(c === "\\"){
                        next_is_escaped = true;
                    }
                    if(c === "\""){
                        break;
                    }
                }
                i += 1;
            }
            if( ! /"$/.test(buff) || /\\"$/.test(buff)){
                throw {
                    type: "UnterminatedString",
                    message: "Use \" to close your string",
                    src: buff,
                    loc: {start: i - 1, end: i},
                };
            }
            pushTok("STRING");


        ////////////////////////////////////////////////////////////////////////
        //number
        }else if(/^[0-9]$/.test(c) || (c === "." && /^[0-9]$/.test(src[i + 1]))){
            buff = "";
            var has_seen_decimal = c === ".";
            while(i < src.length){
                c = src[i];
                buff += c;
                if(!/^[0-9]$/.test(src[i + 1])){
                    if(src[i+1] === "." && !has_seen_decimal){
                        has_seen_decimal = true;
                    }else{
                        break;
                    }
                }
                i += 1;
            }
            if(buff[buff.length - 1] === "."){
                buff = buff.substring(0, buff.length - 1);
                pushTok("NUMBER");
                buff = ".";
            }else{
                pushTok("NUMBER");
            }


        ////////////////////////////////////////////////////////////////////////
        //symbol
        }else if(/^[a-zA-Z_]$/.test(c)){
            buff = "";
            while(i < src.length){
                c = src[i];
                buff += c;
                if(!/^[a-zA-Z0-9_]$/.test(src[i + 1])){
                    break;
                }
                i += 1;
            }
            if(/^[A-Z]$/.test(buff[0])){
                pushTok("TYPE");
            }else{
                pushTok("SYMBOL");
            }


        ////////////////////////////////////////////////////////////////////////
        //comment
        }else if(c === ";"){
            buff = c;
            i += 1;
            while(i < src.length){
                c = src[i];
                buff += c;
                if(src[i + 1] === "\n"){
                    break;
                }
                i += 1;
            }
            pushTok("COMMENT");


        ////////////////////////////////////////////////////////////////////////
        //raw
        }else{
            buff += c;

            while(i < src.length){
                if(!raw_toks.hasOwnProperty(buff + src[i + 1])){
                    break;
                }
                i += 1;
                buff += src[i];
            }

            pushTok("RAW");
        }
        i += 1;
    }

    return tokens;
};
