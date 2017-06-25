module.exports = function(tokens, opts){

    var out = [];

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
                    loc: curr.loc,
                });
            }
            while(ind < indent_stack[0]){
                indent_stack.shift();
                out.push({
                    type: "DEDENT",
                    src: "",
                    loc: curr.loc,
                });
            }
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
                i--;
            }
        }else{
            out.push(curr);
        }
        i++;
    }

    return out;
};
