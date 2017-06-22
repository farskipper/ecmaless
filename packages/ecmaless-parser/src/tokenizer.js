module.exports = function(src, opts){
    opts = opts || {};

    var tokens = [];

    var ind;
    var indent_stack = [0];

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
    var ctxChange = function(){
        if(buff.length > 0){
            pushTok("RAW");
        }
        buff = c;
    };

    while(i < src.length){
        c = src[i];

        ////////////////////////////////////////////////////////////////////////
        //spaces
        if(c === " "){
            ctxChange();
            while(i < src.length){
                c = src[i];
                if(src[i + 1] !== " "){
                    break;
                }
                buff += c;
                i++;
            }
            if(buff.length > 0){
                pushTok("SPACES");
            }


        ////////////////////////////////////////////////////////////////////////
        //newlines and indentation
        }else if(c === "\n"){
            ctxChange();
            pushTok("NEWLINE");
            ind = 0;
            if(src[i + 1] === " "){
                i++;
                while(i < src.length){
                    c = src[i];
                    buff += c;
                    if(buff === "    "){
                        ind++;
                        buff = "";
                    }
                    if(src[i + 1] !== " "){
                        break;
                    }
                    i++;
                }
            }
            while(ind > indent_stack[0]){
                indent_stack.unshift(indent_stack[0] + 1);
                pushTok("INDENT");
            }
            while(ind < indent_stack[0]){
                pushTok("DEDENT");
                indent_stack.shift();
            }
            if(buff.length > 0){
                pushTok("SPACES");
            }

        ////////////////////////////////////////////////////////////////////////
        //string
        }else if(c === "\""){
            ctxChange();
            i++;
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
                    if(c === "\""){
                        break;
                    }
                }
                i++;
            }
            pushTok("STRING");


        ////////////////////////////////////////////////////////////////////////
        //number
        }else if(/^[0-9]$/.test(c) || (c === "." && /^[0-9]$/.test(src[i + 1]))){
            ctxChange();
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
                i++;
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
        }else if(/^[a-zA-Z_$]$/.test(c)){
            ctxChange();
            buff = "";
            while(i < src.length){
                c = src[i];
                buff += c;
                if(!/^[a-zA-Z0-9_$]$/.test(src[i + 1])){
                    break;
                }
                i++;
            }
            pushTok("SYMBOL");


        ////////////////////////////////////////////////////////////////////////
        //comment
        }else if(c === ";"){
            ctxChange();
            i++;
            while(i < src.length){
                c = src[i];
                buff += c;
                if(src[i + 1] === "\n"){
                    break;
                }
                i++;
            }
            pushTok("COMMENT");


        ////////////////////////////////////////////////////////////////////////
        //raw
        }else if("(){}[]".indexOf(c) >= 0){//single char groups
            ctxChange();
            pushTok("RAW");
        }else{
            buff += c;
        }
        i++;
    }
    ctxChange();

    while(0 < indent_stack[0]){
        pushTok("DEDENT");
        indent_stack.shift();
    }

    return tokens;
};
