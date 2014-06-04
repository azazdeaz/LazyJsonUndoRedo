LazyJsonUndoRedo
================

Makes a history with automatic undo/redo functionality for the specified javascript objects, using ES6 Object.observe().

 -- under construction --

Currently supported in Chrome 36(unstable) and Nodejs 11.13(unstable)

Usage
-----


```javascript

Init
 var o = {}, ljur = new LazyJsonUndoRedo(o);
 
 o.a = 1;
 ljur.undo();
 console.log(o.a); // undefined
 ljur.redo();
 console.log(o.a); // 1


Flagging
 o = {}, ljur = new LazyJsonUndoRedo(o);
 //the changes between the start- end endFlag calls will be treated as one step in the history  
 var endFlagId = ljur.startFlag();
 o.c = {}
 o.c.b = 1
 o.c.e = 2
 o.f = 4;
 ljur.endFlag(endFlagId);
 ljur.undo();
 console.log(o); //{}
 ljur.redo();
 console.log(o); //{c: {b: 1, e: 2}, f: 4}
 
 //or wrap a function between flags:
 var changerFn = ljur.wrap(function () {/*do changes on o*/});
 changerFn();//all changes are reversible with one redo() call


Force save
 //fast changes can be merged by the api
 o = {}, ljur = new LazyJsonUndoRedo(o);
 o.g = {};
 o.g.h = 1;
 ljur.redo();
 console.log(o); //{}

 //to avoid this, you can force the history save with ljur.deliverChangeRecords()
 o.i = {};
 ljur.deliverChangeRecords();
 o.i.j = 2;
 ljur.redo();
 console.log(o); // {i: {}}


Listen to more objects
 ljur.observeTree(o2);


Check support
 LazyJsonUndoRedo.checkSupport();//currently just in Chrome 36 and Nodejs 11.13

```

Todos
-----
    - more test case
    - add demos
    - test with polyfills
