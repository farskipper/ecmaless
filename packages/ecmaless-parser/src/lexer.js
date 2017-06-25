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

    var ind;
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
                i++;
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
        }else{
            out.push(curr);
        }
        i++;
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
