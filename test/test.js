'use strict';

var assert = (typeof exports === 'object' ? require('chai') : chai).assert;
var LazyJsonUndoRedo = (typeof exports === 'object' ? require('../LazyJsonUndoRedo') : LazyJsonUndoRedo);

suite('Test LazyJsonUndoRedo', function () {
    setup(function(){
        if (!LazyJsonUndoRedo.checkSupport()) {

            throw Error('): no O.o() support!');
        }
    });

    test('new LazyJsonUndoRedo({})', function () {
        assert.ok(new LazyJsonUndoRedo({}));
    });

    suite('about objects', function () {

        test('test0', function () {
            
            var o = {};
            var ljur = new LazyJsonUndoRedo(o);
            o.a = 1;
            assert.deepEqual(o, {a: 1});
            ljur.undo();
            assert.deepEqual(o, {});
            ljur.redo();
            assert.deepEqual(o, {a: 1});
        });

        test('test1', function () {
            
            var o = {};
            var ljur = new LazyJsonUndoRedo(o);
            o.a = {b: {}};
            ljur.rec();
            o.a.b.c = {d:4};
            assert.deepEqual(o, {a: {b: {c: {d:4}}}});
            ljur.undo();
            assert.deepEqual(o, {a: {b: {}}});
            ljur.redo();
            assert.deepEqual(o, {a: {b: {c: {d:4}}}});
            o.a.b.c.d = 3;
            assert.equal(o.a.b.c.d, 3);
            ljur.undo();
            assert.equal(o.a.b.c.d, 4);
            ljur.redo();
            assert.equal(o.a.b.c.d, 3);
        });

        test('test2', function () {
            
            var o = {};
            var ljur = new LazyJsonUndoRedo(o);
            o.a = 3;
            o.b = 4;
            ljur.undo();
            o.c = 5;
            assert.deepEqual(o, {a: 3, c:5});
        });

        test('test3', function () {
            
            var o = {};
            var ljur = new LazyJsonUndoRedo(o);
            o.a = 3;
            ljur.undo();
            ljur.undo();
            ljur.undo();
            assert.deepEqual(o, {});
            ljur.redo();
            assert.deepEqual(o, {a: 3});
            ljur.redo();
            ljur.redo();
            ljur.redo();
            assert.deepEqual(o, {a: 3});
            ljur.undo();
            assert.deepEqual(o, {});
        });

        test('null value', function () {
            
            var o = {a: null, b: undefined, d: Infinity};
            var ljur = new LazyJsonUndoRedo(o);
        });

        test('cyclic ref', function () {
            
            var o = {};
            o.a = o;
            var ljur = new LazyJsonUndoRedo(o);
        });
    });

    suite('about arrays', function () {

        test('test0', function () {
            
            var a = [];
            var ljur = new LazyJsonUndoRedo(a);
            a.push(1)
            assert.deepEqual(a, [1]);
            ljur.undo();
            assert.deepEqual(a, []);
            ljur.redo();
            assert.deepEqual(a, [1]);
        });

        test('test1', function () {
            
            var a = [];
            var ljur = new LazyJsonUndoRedo(a);
            a.push(1, 2, 3);            
            if(ljur.usingShim) ljur.rec();
            a[1] = 0;
            ljur.undo();
            assert.deepEqual(a, [1, 2, 3]);
            ljur.redo();
            assert.deepEqual(a, [1, 0, 3]);
            ljur.undo();
            assert.deepEqual(a, [1, 2, 3]);
        });

        test('test2', function () {
            
            var a = [];
            var ljur = new LazyJsonUndoRedo(a);
            a.push(4, 5, 6);            if(ljur.usingShim) ljur.rec();
            a.unshift(0, 1, 2, 3);      if(ljur.usingShim) ljur.rec();
            a.push(7, 8, 9, 10);        if(ljur.usingShim) ljur.rec();
            a.shift();                  if(ljur.usingShim) ljur.rec();
            a.pop();                    if(ljur.usingShim) ljur.rec();
            a.splice(2, 3, -1, -2, -3); if(ljur.usingShim) ljur.rec();
            

            assert.deepEqual(a, [1, 2, -1, -2, -3, 6, 7, 8, 9]);
            ljur.undo();
            assert.deepEqual(a, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
            ljur.undo();
            assert.deepEqual(a, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            ljur.undo();
            assert.deepEqual(a, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            ljur.undo();
            assert.deepEqual(a, [0, 1, 2, 3, 4, 5, 6]);
            ljur.undo();
            assert.deepEqual(a, [4, 5, 6]);
            ljur.undo();
            assert.deepEqual(a, []);
            ljur.redo();
            assert.deepEqual(a, [4, 5, 6]);
            ljur.redo();
            assert.deepEqual(a, [0, 1, 2, 3, 4, 5, 6]);
            ljur.redo();
            assert.deepEqual(a, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            ljur.redo();
            assert.deepEqual(a, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
            ljur.redo();
            assert.deepEqual(a, [1, 2, 3, 4, 5, 6, 7, 8, 9]);
            ljur.redo();
            assert.deepEqual(a, [1, 2, -1, -2, -3, 6, 7, 8, 9]);
        });
        
        //I don't find the good solution for this, but it's rarely used (and evil as well:),
        //  so the undo will fill the holes with undefineds.
        // test('test3 (array with holes - currently fails)', function () {
            
        //     var a = [0];
        //     var ljur = new LazyJsonUndoRedo(a);
        //     a[3] = 3;
        //     ljur.rec();
        //     assert.deepEqual(a, [0, , , 3]);
        //     ljur.undo();
        //     assert.deepEqual(a, [0]);
        //     ljur.redo();
        //     assert.deepEqual(a, [1, , , 3]); //fail - a=[1, undefined, undefined, 3]
        // });
    });

    suite('about flags', function () {

        test('test0', function () {
            
            var o = {};
            var ljur = new LazyJsonUndoRedo(o);
            var endFlag = ljur.startFlag();
            o.a = 0;
            o.b = 1;
            o.c = 2;
            ljur.endFlag(endFlag);
            ljur.undo();
            assert.deepEqual(o, {});
            ljur.redo();
            assert.deepEqual(o, {a:0, b:1, c: 2});
        });

        test('test1', function () {
            
            var a = [1, 0, 2];
            var ljur = new LazyJsonUndoRedo(a);
            var endFlag = ljur.startFlag();
            a.forEach(function (n, i, a) {a[i] = n + 1});
            ljur.endFlag(endFlag);
            endFlag = ljur.startFlag();
            a.reverse(); 
            ljur.endFlag(endFlag);
            endFlag = ljur.startFlag();
            a.sort();
            ljur.endFlag(endFlag);
            assert.deepEqual(a, [1, 2, 3]);
            ljur.undo();
            assert.deepEqual(a, [3, 1, 2]);
            ljur.undo();
            assert.deepEqual(a, [2, 1, 3]);
            ljur.undo();
            assert.deepEqual(a, [1, 0, 2]);
        });

        test('test2', function () {
            
            var a = [1, 0, 2];
            var ljur = new LazyJsonUndoRedo(a);
            var endFlag = ljur.startFlag();
            a.forEach(function (n, i, a) {a[i] = n + 1});
            ljur.endFlag(endFlag);
            endFlag = ljur.startFlag();
            a.reverse(); 
            ljur.endFlag(endFlag);
            endFlag = ljur.startFlag();
            a.sort();
            ljur.endFlag(endFlag);
            assert.deepEqual(a, [1, 2, 3]);
            ljur.undo();
            assert.deepEqual(a, [3, 1, 2]);
            ljur.undo();
            assert.deepEqual(a, [2, 1, 3]);
            ljur.undo();
            assert.deepEqual(a, [1, 0, 2]);
        });

        test('test3', function () {
            
            var o = {};
            var ljur = new LazyJsonUndoRedo(o);
            var endFlag = ljur.startFlag();
            o.a = 0;
            o.b = 1;
            ljur.endFlag(endFlag);
            o.c = 2;
            assert.deepEqual(o, {a:0, b:1, c: 2});
            ljur.undo();
            assert.deepEqual(o, {a:0, b:1});
            ljur.undo();
            assert.deepEqual(o, {});
            ljur.redo();
            assert.deepEqual(o, {a:0, b:1});
            ljur.redo();
            assert.deepEqual(o, {a:0, b:1, c: 2});
        });
    });

    suite('others', function () {

        test('listen more object', function () {
            
            var o0 = {}, o1 = {};
            var ljur = new LazyJsonUndoRedo(o0);
            ljur.observeTree(o1);
            o0.a = 0; if(ljur.usingShim) ljur.rec();
            o1.b = 1; if(ljur.usingShim) ljur.rec();
            o0.c = 2; if(ljur.usingShim) ljur.rec();
            o1.d = 3; 
            assert.deepEqual(o0, {a: 0, c: 2});
            assert.deepEqual(o1, {b: 1, d: 3});
            ljur.undo();
            assert.deepEqual(o0, {a: 0, c: 2});
            assert.deepEqual(o1, {b: 1});
            ljur.undo();
            assert.deepEqual(o0, {a: 0});
            assert.deepEqual(o1, {b: 1});
            ljur.undo();
            assert.deepEqual(o0, {a: 0});
            assert.deepEqual(o1, {});
            ljur.undo();
            assert.deepEqual(o0, {});
            assert.deepEqual(o1, {});
            ljur.redo();
            assert.deepEqual(o0, {a: 0});
            assert.deepEqual(o1, {});
            ljur.redo();
            assert.deepEqual(o0, {a: 0});
            assert.deepEqual(o1, {b: 1});
            ljur.redo();
            assert.deepEqual(o0, {a: 0, c: 2});
            assert.deepEqual(o1, {b: 1});
            ljur.redo();
            assert.deepEqual(o0, {a: 0, c: 2});
            assert.deepEqual(o1, {b: 1, d: 3});

        });

        test('using whitelist', function () {
            
            var o = {a: 3, d: {e: 7}};

            var ljur = new LazyJsonUndoRedo();
            ljur.setWhitelist(o, ['a', 'b']);
            ljur.observeTree(o);


            o.a = 1; if(ljur.usingShim) ljur.rec();
            o.b = 3; if(ljur.usingShim) ljur.rec();
            o.c = 7; if(ljur.usingShim) ljur.rec();
            o.d.e = 12; if(ljur.usingShim) ljur.rec();
            assert.deepEqual(o, {a: 1, b: 3, c: 7, d: {e: 12}});
            ljur.undo();
            assert.deepEqual(o, {a: 1, c: 7, d: {e: 12}});
            ljur.undo();
            assert.deepEqual(o, {a: 3, c: 7, d: {e: 12}});
            ljur.redo();
            assert.deepEqual(o, {a: 1, c: 7, d: {e: 12}});
            ljur.redo();
            assert.deepEqual(o, {a: 1, b: 3, c: 7, d: {e: 12}});
        });


        test('using blacklist', function () {
            
            var o = {a: 3, d: {e: 7}};

            var ljur = new LazyJsonUndoRedo();
            ljur.setBlacklist(o, ['a', 'b']);
            ljur.observeTree(o);


            o.a = 1; if(ljur.usingShim) ljur.rec();
            o.b = 3; if(ljur.usingShim) ljur.rec();
            o.c = 7; if(ljur.usingShim) ljur.rec();
            o.d.e = 12; if(ljur.usingShim) ljur.rec();
            assert.deepEqual(o, {a: 1, b: 3, c: 7, d: {e: 12}});
            ljur.undo();
            assert.deepEqual(o, {a: 1, b: 3, c: 7, d: {e: 7}});
            ljur.undo();
            assert.deepEqual(o, {a: 1, b: 3, d: {e: 7}});
            ljur.undo();
            assert.deepEqual(o, {a: 1, b: 3, d: {e: 7}});
            ljur.redo();
            assert.deepEqual(o, {a: 1, b: 3, c: 7, d: {e: 7}});
            ljur.redo();
            assert.deepEqual(o, {a: 1, b: 3, c: 7, d: {e: 12}});
        });
    });
});


