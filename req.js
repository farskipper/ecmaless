function require(mdefs, main){
  var loadModule = function loadModule(mid) {
    var m = mdefs[mid];
    var args = [];
    var i = 1;
    while (i < m.length) {
      args.push(require(m[i]));
      i++;
    }
    return m[0].apply(void 0, args);
  };
  var cache = {};
  var require = function(mid){
    if(!cache.hasOwnProperty(mid)){
      cache[mid] = loadModule(mid);
    }
    return cache[mid];
  };
  return require(main);
};
