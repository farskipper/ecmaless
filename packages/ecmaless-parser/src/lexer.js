var nLeadingSpaces = function(str){
    var i = 0;
    while(i < str.length){
        if(str[i] !== " "){
            break;
        }
        i += 1;
    }
    return i;
};

var docstringSrcAndAssertIndents = function(tok, ind){

    var out_lines = [];

    var lines = tok.src.split("\n");

    var ind_cols = ind * 4;

    var start = tok.loc.start + lines[0].length + 1;


    var n_leading;

    var line;
    var i = 1;//skip line 1

    out_lines.push(lines[0]);

    while(i < lines.length){
        line = lines[i];

        n_leading = nLeadingSpaces(line);

        if(n_leading < ind_cols){
            throw {
                type: "InvalidIndentation",
                message: "Docstrings should match indentation. Don't worry, indentation is not included in the string.",
                src: line.substring(0, n_leading),
                loc: {
                    start: start,
                    end: start + n_leading + 1,
                },
            };
        }

        out_lines.push(line.substring(ind_cols));

        start += line.length + 1;
        i += 1;
    }

    return out_lines.join("\n");
};

module.exports = function(tokens, opts){

    var out = [];

    var pushDedent = function(index){
        out.push({
            type: "DEDENT",
            src: "",
            loc: {start: index, end: index},
        });
        out.push({
            type: "NEWLINE",
            src: "",
            loc: {start: index, end: index},
        });
    };

    var ind = 0;
    var indent_stack = [0];

    var curr;
    var next;

    var i = 0;
    while(i < tokens.length){
        curr = tokens[i];

        if(curr.type === "COMMENT"){
            //ignore
        }else if(curr.type === "SPACES"){
            //ignore
        }else if(curr.type === "NEWLINE"){
            out.push(curr);
            while(i < tokens.length){
                curr = tokens[i];
                next = tokens[i + 1];
                if(next
                    && next.type !== "NEWLINE"
                    && next.type !== "COMMENT"
                    && next.type !== "SPACES"
                ){
                    break;
                }
                i += 1;
            }
            if(curr.type === "SPACES"){
                ind = (curr.src.length % 4) === 0
                    ? curr.src.length / 4
                    : -1;
                if(ind < 0){
                    throw {
                        type: "InvalidIndentation",
                        message: "use 4 space indentation",
                        src: curr.src.substring(0, curr.src.length % 4),
                        loc: {
                            start: curr.loc.end - (curr.src.length % 4),
                            end: curr.loc.end,
                        },
                    };
                }
                while(ind > indent_stack[0]){
                    indent_stack.unshift(indent_stack[0] + 1);
                    out.push({
                        type: "INDENT",
                        src: "    ",
                        loc: {
                            start: curr.loc.start + 4 * (indent_stack[0] - 1),
                            end:   curr.loc.start + 4 * (indent_stack[0]),
                        },
                    });
                }
                while(ind < indent_stack[0]){
                    indent_stack.shift();
                    pushDedent(curr.loc.end);
                }
            }else{
                while(indent_stack.length > 1){
                    indent_stack.shift();
                    pushDedent(curr.loc.end);
                }
            }
        }else if(curr.type === "DOCSTRING"){
            out.push(Object.assign({}, curr, {
                src: docstringSrcAndAssertIndents(curr, ind),
            }));
        }else{
            out.push(curr);
        }
        i += 1;
    }

    var last = out.length > 0
        ? out[out.length - 1]
        : {};

    if(last.type !== "NEWLINE"){
        out.push({
            type: "NEWLINE",
            src: "",
            loc: {start: last.loc.end, end: last.loc.end},
        });
    }
    while(indent_stack.length > 1){
        indent_stack.shift();
        pushDedent(last.loc.end);
    }

    return out;
};
