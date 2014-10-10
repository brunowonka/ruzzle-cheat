
var LineByLineReader = require('line-by-line');
var lr = new LineByLineReader('words');

var Q = require('q');
var readline = require('readline'), rl;


console.log("opening words");


var WORDS = [],
    WORDCOUNT = 0;
var PIVOTS = {};


lr.on('error', function (err) {
    // 'err' contains error object
    console.log("read error" + err);
});

lr.on('line', function (line) {
    lr.pause();
    // 'line' contains the current line without the trailing newline character.
    WORDS.push(line);
    WORDCOUNT++;
    lr.resume();
});

lr.on('end', function () {
    // All lines are read, file is closed now.
    console.log("done");


    Q.fcall(buildPivots)
        .then(function () {
            rl = readline.createInterface(process.stdin, process.stdout);
        })
        .then(promptTree)
        .then(loadTree)
        .then(run)
        .then(final)
        .then(function () {
            rl.close();
            process.stdin.destroy();
        })
        .done();
});


function buildPivots() {

    console.log("building pivots");
    var i, l = WORDS.length, c;
    var last = null;
    for (i = 0; i < l; i++) {
        c = WORDS[i][0];
        if (c != last) {
            last = c;
            PIVOTS[c] = i;
        }
    }


    console.log("done pivots");
}


function dims(letters) {
    var i = letters.length;
    var j = (Math.sqrt(i));
    if (j - Math.floor(j) == 0) {
        return j;
    } else {
        return null;
    }
}

function promptTree() {
    var deferred = Q.defer();
    console.log("prompting tree");
//    setTimeout(function(){
//        return deferred.resolve();
//    },1000);


    var ask;

    var cb = function (line) {
        line = line.trim();
        if (line.match(/^[a-z]+$/i) && dims(line) != null) {
//            console.log("valid line");
            deferred.resolve(line);
        } else {
            console.log("invalid entry");
            ask();
        }
    };

    ask = function () {
        rl.question("enter letter matrix> ", cb);
    };
    ask();
    return deferred.promise;
}


var MATRIX = [];

function printMatrix() {
    var i, j;
    for (i = 0; i < MATRIX.length; i++) {
        var ln = [];
        for (j = 0; j < MATRIX[i].length; j++) {
            ln.push(MATRIX[i][j]);
        }
        console.log(ln.join(" "));
    }
}

function loadTree(line) {
    if( ! line ) {
        line = "tnkheuihhcawtstr";
    }
    console.log("loading tree " + line);
    var dim = dims(line);
    var i, l = line.length;
    var acc = [];
    for (i = 0; i < l; i++) {
        if (i % dim == 0 && i != 0) {
            MATRIX.push(acc);
            acc = [];
        }
        acc.push(line[i]);
    }
    MATRIX.push(acc);
    printMatrix();
}


function samePoint(a, b) {
    return a[0] == b[0] && a[1] == b[1];
}

function pointInArray(point, a) {
    var i, l = a.length;
    for (i = 0; i < l; i++) {
        if (samePoint(a[i], point)) {
            return true;
        }
    }
    return false;
}

var FOUND = [];

function run() {

    var i, j;
    for (i = 0; i < MATRIX.length; i++) {
        for (j = 0; j < MATRIX[i].length; j++) {
            var used = [],
                c = MATRIX[i][j];
            used.push([i,j]);
            check(c, used, [i, j], 0, PIVOTS[c]);
        }
    }

}


function positionDelta(position, index) {
    var r = [position[0], position[1]];
    if (index == 2 || index ==  4 || index ==  7) {
        r[0] += 1;
    } else if (index == 0 || index ==  3 || index ==  5) {
        r[0] -= 1;
    }
    if (index < 3) {
        r[1] -= 1;
    } else if (index > 4) {
        r[1] += 1;
    }

    return validPosition(r) ? r : null;
}

function validPosition(r) {
    return r[0] < MATRIX[0].length && r[1] < MATRIX.length && r[0] >= 0 && r[1] >= 0;
}

var DELTA_COUNT = 8;


function findDictStart(from, base, look) {
    var i = from;
    while (i < WORDCOUNT && WORDS[i].indexOf(base) === 0) {
        if (WORDS[i].indexOf(look) === 0) {
            return i;
        }
        i++;
    }
    return -1;
}

function grabLetter(position) {
    return MATRIX[position[0]][position[1]];
}

function check(base, used, position, index, dictIndex) {
//    console.log(JSON.stringify(arguments));
    var nxt = positionDelta(position, index);
    var nextIndex = function () {
        index++;
        if (index < DELTA_COUNT) {
            check(base, used, position, index, dictIndex);
        }
    };


    if (nxt == null || pointInArray(nxt,used)) {
        nextIndex();
    } else {
        var exp = base + grabLetter(nxt);
        var st = findDictStart(dictIndex, base, exp);
        if (st < 0) {
            nextIndex();
        } else {

            var cp = used.slice();
            cp.push(nxt);

            if (WORDS[st] === exp) {
//                console.log("found " + exp);
                FOUND.push({
                    "word" : exp,
                    "used" : cp.slice()
                });
            }


            check(exp, cp, nxt, 0, st);

            nextIndex();
        }
    }
}


function printWord(obj) {
    var str = obj.word;
    var i,j = obj.used.length;
    for( i = 0 ; i < j ; i++ ) {
        str += " " + obj.used[i].join(",");
    }
    console.log(str);
}


function final() {
    console.log("FOUND " + FOUND.length);
    var f = [];
    FOUND.sort(function(a,b){
        if(a.word.length != b.word.length) {
            return -1*(a.word.length - b.word.length);
        } else {
            return a.word.localeCompare(b.word);
        }
    });
    FOUND = FOUND.filter(function(obj){
        if(f.indexOf(obj.word) >= 0 ) {
            return false;
        } else {
            f.push(obj.word);
            return true;
        }
    });
    for( var i = 0 ; i < FOUND.length ; i++ ) {
        console.log(">  " + FOUND[i].word);
    }
}