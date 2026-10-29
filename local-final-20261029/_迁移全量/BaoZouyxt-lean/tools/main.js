window.__require = function e(t, i, r) {
function n(s, o) {
if (!i[s]) {
if (!t[s]) {
var c = s.split("/");
c = c[c.length - 1];
if (!t[c]) {
var f = "function" == typeof __require && __require;
if (!o && f) return f(c, !0);
if (a) return a(c, !0);
throw new Error("Cannot find module '" + s + "'");
}
s = c;
}
var h = i[s] = {
exports: {}
};
t[s][0].call(h.exports, function(e) {
return n(t[s][1][e] || e);
}, h, h.exports, e, t, i, r);
}
return i[s].exports;
}
for (var a = "function" == typeof __require && __require, s = 0; s < r.length; s++) n(r[s]);
return n;
}({
1: [ function(e, t, i) {
"use strict";
const r = i;
r.bignum = e("bn.js");
r.define = e("./asn1/api").define;
r.base = e("./asn1/base");
r.constants = e("./asn1/constants");
r.decoders = e("./asn1/decoders");
r.encoders = e("./asn1/encoders");
}, {
"./asn1/api": 2,
"./asn1/base": 4,
"./asn1/constants": 8,
"./asn1/decoders": 10,
"./asn1/encoders": 13,
"bn.js": 15
} ],
2: [ function(e, t, i) {
"use strict";
const r = e("./encoders"), n = e("./decoders"), a = e("inherits");
i.define = function(e, t) {
return new s(e, t);
};
function s(e, t) {
this.name = e;
this.body = t;
this.decoders = {};
this.encoders = {};
}
s.prototype._createNamed = function(e) {
const t = this.name;
function i(e) {
this._initNamed(e, t);
}
a(i, e);
i.prototype._initNamed = function(t, i) {
e.call(this, t, i);
};
return new i(this);
};
s.prototype._getDecoder = function(e) {
e = e || "der";
this.decoders.hasOwnProperty(e) || (this.decoders[e] = this._createNamed(n[e]));
return this.decoders[e];
};
s.prototype.decode = function(e, t, i) {
return this._getDecoder(t).decode(e, i);
};
s.prototype._getEncoder = function(e) {
e = e || "der";
this.encoders.hasOwnProperty(e) || (this.encoders[e] = this._createNamed(r[e]));
return this.encoders[e];
};
s.prototype.encode = function(e, t, i) {
return this._getEncoder(t).encode(e, i);
};
}, {
"./decoders": 10,
"./encoders": 13,
inherits: 138
} ],
3: [ function(e, t, i) {
"use strict";
const r = e("inherits"), n = e("../base/reporter").Reporter, a = e("safer-buffer").Buffer;
function s(e, t) {
n.call(this, t);
if (a.isBuffer(e)) {
this.base = e;
this.offset = 0;
this.length = e.length;
} else this.error("Input not Buffer");
}
r(s, n);
i.DecoderBuffer = s;
s.isDecoderBuffer = function(e) {
return e instanceof s || "object" == typeof e && a.isBuffer(e.base) && "DecoderBuffer" === e.constructor.name && "number" == typeof e.offset && "number" == typeof e.length && "function" == typeof e.save && "function" == typeof e.restore && "function" == typeof e.isEmpty && "function" == typeof e.readUInt8 && "function" == typeof e.skip && "function" == typeof e.raw;
};
s.prototype.save = function() {
return {
offset: this.offset,
reporter: n.prototype.save.call(this)
};
};
s.prototype.restore = function(e) {
const t = new s(this.base);
t.offset = e.offset;
t.length = this.offset;
this.offset = e.offset;
n.prototype.restore.call(this, e.reporter);
return t;
};
s.prototype.isEmpty = function() {
return this.offset === this.length;
};
s.prototype.readUInt8 = function(e) {
return this.offset + 1 <= this.length ? this.base.readUInt8(this.offset++, !0) : this.error(e || "DecoderBuffer overrun");
};
s.prototype.skip = function(e, t) {
if (!(this.offset + e <= this.length)) return this.error(t || "DecoderBuffer overrun");
const i = new s(this.base);
i._reporterState = this._reporterState;
i.offset = this.offset;
i.length = this.offset + e;
this.offset += e;
return i;
};
s.prototype.raw = function(e) {
return this.base.slice(e ? e.offset : this.offset, this.length);
};
function o(e, t) {
if (Array.isArray(e)) {
this.length = 0;
this.value = e.map(function(e) {
o.isEncoderBuffer(e) || (e = new o(e, t));
this.length += e.length;
return e;
}, this);
} else if ("number" == typeof e) {
if (!(0 <= e && e <= 255)) return t.error("non-byte EncoderBuffer value");
this.value = e;
this.length = 1;
} else if ("string" == typeof e) {
this.value = e;
this.length = a.byteLength(e);
} else {
if (!a.isBuffer(e)) return t.error("Unsupported type: " + typeof e);
this.value = e;
this.length = e.length;
}
}
i.EncoderBuffer = o;
o.isEncoderBuffer = function(e) {
return e instanceof o || "object" == typeof e && "EncoderBuffer" === e.constructor.name && "number" == typeof e.length && "function" == typeof e.join;
};
o.prototype.join = function(e, t) {
e || (e = a.alloc(this.length));
t || (t = 0);
if (0 === this.length) return e;
if (Array.isArray(this.value)) this.value.forEach(function(i) {
i.join(e, t);
t += i.length;
}); else {
"number" == typeof this.value ? e[t] = this.value : "string" == typeof this.value ? e.write(this.value, t) : a.isBuffer(this.value) && this.value.copy(e, t);
t += this.length;
}
return e;
};
}, {
"../base/reporter": 6,
inherits: 138,
"safer-buffer": 183
} ],
4: [ function(e, t, i) {
"use strict";
const r = i;
r.Reporter = e("./reporter").Reporter;
r.DecoderBuffer = e("./buffer").DecoderBuffer;
r.EncoderBuffer = e("./buffer").EncoderBuffer;
r.Node = e("./node");
}, {
"./buffer": 3,
"./node": 5,
"./reporter": 6
} ],
5: [ function(e, t) {
"use strict";
const i = e("../base/reporter").Reporter, r = e("../base/buffer").EncoderBuffer, n = e("../base/buffer").DecoderBuffer, a = e("minimalistic-assert"), s = [ "seq", "seqof", "set", "setof", "objid", "bool", "gentime", "utctime", "null_", "enum", "int", "objDesc", "bitstr", "bmpstr", "charstr", "genstr", "graphstr", "ia5str", "iso646str", "numstr", "octstr", "printstr", "t61str", "unistr", "utf8str", "videostr" ], o = [ "key", "obj", "use", "optional", "explicit", "implicit", "def", "choice", "any", "contains" ].concat(s);
function c(e, t, i) {
const r = {};
this._baseState = r;
r.name = i;
r.enc = e;
r.parent = t || null;
r.children = null;
r.tag = null;
r.args = null;
r.reverseArgs = null;
r.choice = null;
r.optional = !1;
r.any = !1;
r.obj = !1;
r.use = null;
r.useDecoder = null;
r.key = null;
r.default = null;
r.explicit = null;
r.implicit = null;
r.contains = null;
if (!r.parent) {
r.children = [];
this._wrap();
}
}
t.exports = c;
const f = [ "enc", "parent", "children", "tag", "args", "reverseArgs", "choice", "optional", "any", "obj", "use", "alteredUse", "key", "default", "explicit", "implicit", "contains" ];
c.prototype.clone = function() {
const e = this._baseState, t = {};
f.forEach(function(i) {
t[i] = e[i];
});
const i = new this.constructor(t.parent);
i._baseState = t;
return i;
};
c.prototype._wrap = function() {
const e = this._baseState;
o.forEach(function(t) {
this[t] = function() {
const i = new this.constructor(this);
e.children.push(i);
return i[t].apply(i, arguments);
};
}, this);
};
c.prototype._init = function(e) {
const t = this._baseState;
a(null === t.parent);
e.call(this);
t.children = t.children.filter(function(e) {
return e._baseState.parent === this;
}, this);
a.equal(t.children.length, 1, "Root node can have only one child");
};
c.prototype._useArgs = function(e) {
const t = this._baseState, i = e.filter(function(e) {
return e instanceof this.constructor;
}, this);
e = e.filter(function(e) {
return !(e instanceof this.constructor);
}, this);
if (0 !== i.length) {
a(null === t.children);
t.children = i;
i.forEach(function(e) {
e._baseState.parent = this;
}, this);
}
if (0 !== e.length) {
a(null === t.args);
t.args = e;
t.reverseArgs = e.map(function(e) {
if ("object" != typeof e || e.constructor !== Object) return e;
const t = {};
Object.keys(e).forEach(function(i) {
i == (0 | i) && (i |= 0);
const r = e[i];
t[r] = i;
});
return t;
});
}
};
[ "_peekTag", "_decodeTag", "_use", "_decodeStr", "_decodeObjid", "_decodeTime", "_decodeNull", "_decodeInt", "_decodeBool", "_decodeList", "_encodeComposite", "_encodeStr", "_encodeObjid", "_encodeTime", "_encodeNull", "_encodeInt", "_encodeBool" ].forEach(function(e) {
c.prototype[e] = function() {
const t = this._baseState;
throw new Error(e + " not implemented for encoding: " + t.enc);
};
});
s.forEach(function(e) {
c.prototype[e] = function() {
const t = this._baseState, i = Array.prototype.slice.call(arguments);
a(null === t.tag);
t.tag = e;
this._useArgs(i);
return this;
};
});
c.prototype.use = function(e) {
a(e);
const t = this._baseState;
a(null === t.use);
t.use = e;
return this;
};
c.prototype.optional = function() {
this._baseState.optional = !0;
return this;
};
c.prototype.def = function(e) {
const t = this._baseState;
a(null === t.default);
t.default = e;
t.optional = !0;
return this;
};
c.prototype.explicit = function(e) {
const t = this._baseState;
a(null === t.explicit && null === t.implicit);
t.explicit = e;
return this;
};
c.prototype.implicit = function(e) {
const t = this._baseState;
a(null === t.explicit && null === t.implicit);
t.implicit = e;
return this;
};
c.prototype.obj = function() {
const e = this._baseState, t = Array.prototype.slice.call(arguments);
e.obj = !0;
0 !== t.length && this._useArgs(t);
return this;
};
c.prototype.key = function(e) {
const t = this._baseState;
a(null === t.key);
t.key = e;
return this;
};
c.prototype.any = function() {
this._baseState.any = !0;
return this;
};
c.prototype.choice = function(e) {
const t = this._baseState;
a(null === t.choice);
t.choice = e;
this._useArgs(Object.keys(e).map(function(t) {
return e[t];
}));
return this;
};
c.prototype.contains = function(e) {
const t = this._baseState;
a(null === t.use);
t.contains = e;
return this;
};
c.prototype._decode = function(e, t) {
const i = this._baseState;
if (null === i.parent) return e.wrapResult(i.children[0]._decode(e, t));
let r, a = i.default, s = !0, o = null;
null !== i.key && (o = e.enterKey(i.key));
if (i.optional) {
let r = null;
null !== i.explicit ? r = i.explicit : null !== i.implicit ? r = i.implicit : null !== i.tag && (r = i.tag);
if (null !== r || i.any) {
s = this._peekTag(e, r, i.any);
if (e.isError(s)) return s;
} else {
const r = e.save();
try {
null === i.choice ? this._decodeGeneric(i.tag, e, t) : this._decodeChoice(e, t);
s = !0;
} catch (e) {
s = !1;
}
e.restore(r);
}
}
i.obj && s && (r = e.enterObject());
if (s) {
if (null !== i.explicit) {
const t = this._decodeTag(e, i.explicit);
if (e.isError(t)) return t;
e = t;
}
const r = e.offset;
if (null === i.use && null === i.choice) {
let t;
i.any && (t = e.save());
const r = this._decodeTag(e, null !== i.implicit ? i.implicit : i.tag, i.any);
if (e.isError(r)) return r;
i.any ? a = e.raw(t) : e = r;
}
t && t.track && null !== i.tag && t.track(e.path(), r, e.length, "tagged");
t && t.track && null !== i.tag && t.track(e.path(), e.offset, e.length, "content");
i.any || (a = null === i.choice ? this._decodeGeneric(i.tag, e, t) : this._decodeChoice(e, t));
if (e.isError(a)) return a;
i.any || null !== i.choice || null === i.children || i.children.forEach(function(i) {
i._decode(e, t);
});
if (i.contains && ("octstr" === i.tag || "bitstr" === i.tag)) {
const r = new n(a);
a = this._getUse(i.contains, e._reporterState.obj)._decode(r, t);
}
}
i.obj && s && (a = e.leaveObject(r));
null === i.key || null === a && !0 !== s ? null !== o && e.exitKey(o) : e.leaveKey(o, i.key, a);
return a;
};
c.prototype._decodeGeneric = function(e, t, i) {
const r = this._baseState;
return "seq" === e || "set" === e ? null : "seqof" === e || "setof" === e ? this._decodeList(t, e, r.args[0], i) : /str$/.test(e) ? this._decodeStr(t, e, i) : "objid" === e && r.args ? this._decodeObjid(t, r.args[0], r.args[1], i) : "objid" === e ? this._decodeObjid(t, null, null, i) : "gentime" === e || "utctime" === e ? this._decodeTime(t, e, i) : "null_" === e ? this._decodeNull(t, i) : "bool" === e ? this._decodeBool(t, i) : "objDesc" === e ? this._decodeStr(t, e, i) : "int" === e || "enum" === e ? this._decodeInt(t, r.args && r.args[0], i) : null !== r.use ? this._getUse(r.use, t._reporterState.obj)._decode(t, i) : t.error("unknown tag: " + e);
};
c.prototype._getUse = function(e, t) {
const i = this._baseState;
i.useDecoder = this._use(e, t);
a(null === i.useDecoder._baseState.parent);
i.useDecoder = i.useDecoder._baseState.children[0];
if (i.implicit !== i.useDecoder._baseState.implicit) {
i.useDecoder = i.useDecoder.clone();
i.useDecoder._baseState.implicit = i.implicit;
}
return i.useDecoder;
};
c.prototype._decodeChoice = function(e, t) {
const i = this._baseState;
let r = null, n = !1;
Object.keys(i.choice).some(function(a) {
const s = e.save(), o = i.choice[a];
try {
const i = o._decode(e, t);
if (e.isError(i)) return !1;
r = {
type: a,
value: i
};
n = !0;
} catch (t) {
e.restore(s);
return !1;
}
return !0;
}, this);
return n ? r : e.error("Choice not matched");
};
c.prototype._createEncoderBuffer = function(e) {
return new r(e, this.reporter);
};
c.prototype._encode = function(e, t, i) {
const r = this._baseState;
if (null !== r.default && r.default === e) return;
const n = this._encodeValue(e, t, i);
return void 0 === n || this._skipDefault(n, t, i) ? void 0 : n;
};
c.prototype._encodeValue = function(e, t, r) {
const n = this._baseState;
if (null === n.parent) return n.children[0]._encode(e, t || new i());
let a = null;
this.reporter = t;
if (n.optional && void 0 === e) {
if (null === n.default) return;
e = n.default;
}
let s = null, o = !1;
if (n.any) a = this._createEncoderBuffer(e); else if (n.choice) a = this._encodeChoice(e, t); else if (n.contains) {
s = this._getUse(n.contains, r)._encode(e, t);
o = !0;
} else if (n.children) {
s = n.children.map(function(i) {
if ("null_" === i._baseState.tag) return i._encode(null, t, e);
if (null === i._baseState.key) return t.error("Child should have a key");
const r = t.enterKey(i._baseState.key);
if ("object" != typeof e) return t.error("Child expected, but input is not object");
const n = i._encode(e[i._baseState.key], t, e);
t.leaveKey(r);
return n;
}, this).filter(function(e) {
return e;
});
s = this._createEncoderBuffer(s);
} else if ("seqof" === n.tag || "setof" === n.tag) {
if (!n.args || 1 !== n.args.length) return t.error("Too many args for : " + n.tag);
if (!Array.isArray(e)) return t.error("seqof/setof, but data is not Array");
const i = this.clone();
i._baseState.implicit = null;
s = this._createEncoderBuffer(e.map(function(i) {
const r = this._baseState;
return this._getUse(r.args[0], e)._encode(i, t);
}, i));
} else if (null !== n.use) a = this._getUse(n.use, r)._encode(e, t); else {
s = this._encodePrimitive(n.tag, e);
o = !0;
}
if (!n.any && null === n.choice) {
const e = null !== n.implicit ? n.implicit : n.tag, i = null === n.implicit ? "universal" : "context";
null === e ? null === n.use && t.error("Tag could be omitted only for .use()") : null === n.use && (a = this._encodeComposite(e, o, i, s));
}
null !== n.explicit && (a = this._encodeComposite(n.explicit, !1, "context", a));
return a;
};
c.prototype._encodeChoice = function(e, t) {
const i = this._baseState, r = i.choice[e.type];
r || a(!1, e.type + " not found in " + JSON.stringify(Object.keys(i.choice)));
return r._encode(e.value, t);
};
c.prototype._encodePrimitive = function(e, t) {
const i = this._baseState;
if (/str$/.test(e)) return this._encodeStr(t, e);
if ("objid" === e && i.args) return this._encodeObjid(t, i.reverseArgs[0], i.args[1]);
if ("objid" === e) return this._encodeObjid(t, null, null);
if ("gentime" === e || "utctime" === e) return this._encodeTime(t, e);
if ("null_" === e) return this._encodeNull();
if ("int" === e || "enum" === e) return this._encodeInt(t, i.args && i.reverseArgs[0]);
if ("bool" === e) return this._encodeBool(t);
if ("objDesc" === e) return this._encodeStr(t, e);
throw new Error("Unsupported tag: " + e);
};
c.prototype._isNumstr = function(e) {
return /^[0-9 ]*$/.test(e);
};
c.prototype._isPrintstr = function(e) {
return /^[A-Za-z0-9 '()+,-./:=?]*$/.test(e);
};
}, {
"../base/buffer": 3,
"../base/reporter": 6,
"minimalistic-assert": 142
} ],
6: [ function(e, t, i) {
"use strict";
const r = e("inherits");
function n(e) {
this._reporterState = {
obj: null,
path: [],
options: e || {},
errors: []
};
}
i.Reporter = n;
n.prototype.isError = function(e) {
return e instanceof a;
};
n.prototype.save = function() {
const e = this._reporterState;
return {
obj: e.obj,
pathLen: e.path.length
};
};
n.prototype.restore = function(e) {
const t = this._reporterState;
t.obj = e.obj;
t.path = t.path.slice(0, e.pathLen);
};
n.prototype.enterKey = function(e) {
return this._reporterState.path.push(e);
};
n.prototype.exitKey = function(e) {
const t = this._reporterState;
t.path = t.path.slice(0, e - 1);
};
n.prototype.leaveKey = function(e, t, i) {
const r = this._reporterState;
this.exitKey(e);
null !== r.obj && (r.obj[t] = i);
};
n.prototype.path = function() {
return this._reporterState.path.join("/");
};
n.prototype.enterObject = function() {
const e = this._reporterState, t = e.obj;
e.obj = {};
return t;
};
n.prototype.leaveObject = function(e) {
const t = this._reporterState, i = t.obj;
t.obj = e;
return i;
};
n.prototype.error = function(e) {
let t;
const i = this._reporterState, r = e instanceof a;
t = r ? e : new a(i.path.map(function(e) {
return "[" + JSON.stringify(e) + "]";
}).join(""), e.message || e, e.stack);
if (!i.options.partial) throw t;
r || i.errors.push(t);
return t;
};
n.prototype.wrapResult = function(e) {
const t = this._reporterState;
return t.options.partial ? {
result: this.isError(e) ? null : e,
errors: t.errors
} : e;
};
function a(e, t) {
this.path = e;
this.rethrow(t);
}
r(a, Error);
a.prototype.rethrow = function(e) {
this.message = e + " at: " + (this.path || "(shallow)");
Error.captureStackTrace && Error.captureStackTrace(this, a);
if (!this.stack) try {
throw new Error(this.message);
} catch (e) {
this.stack = e.stack;
}
return this;
};
}, {
inherits: 138
} ],
7: [ function(e, t, i) {
"use strict";
function r(e) {
const t = {};
Object.keys(e).forEach(function(i) {
(0 | i) == i && (i |= 0);
const r = e[i];
t[r] = i;
});
return t;
}
i.tagClass = {
0: "universal",
1: "application",
2: "context",
3: "private"
};
i.tagClassByName = r(i.tagClass);
i.tag = {
0: "end",
1: "bool",
2: "int",
3: "bitstr",
4: "octstr",
5: "null_",
6: "objid",
7: "objDesc",
8: "external",
9: "real",
10: "enum",
11: "embed",
12: "utf8str",
13: "relativeOid",
16: "seq",
17: "set",
18: "numstr",
19: "printstr",
20: "t61str",
21: "videostr",
22: "ia5str",
23: "utctime",
24: "gentime",
25: "graphstr",
26: "iso646str",
27: "genstr",
28: "unistr",
29: "charstr",
30: "bmpstr"
};
i.tagByName = r(i.tag);
}, {} ],
8: [ function(e, t, i) {
"use strict";
const r = i;
r._reverse = function(e) {
const t = {};
Object.keys(e).forEach(function(i) {
(0 | i) == i && (i |= 0);
const r = e[i];
t[r] = i;
});
return t;
};
r.der = e("./der");
}, {
"./der": 7
} ],
9: [ function(e, t) {
"use strict";
const i = e("inherits"), r = e("bn.js"), n = e("../base/buffer").DecoderBuffer, a = e("../base/node"), s = e("../constants/der");
function o(e) {
this.enc = "der";
this.name = e.name;
this.entity = e;
this.tree = new c();
this.tree._init(e.body);
}
t.exports = o;
o.prototype.decode = function(e, t) {
n.isDecoderBuffer(e) || (e = new n(e, t));
return this.tree._decode(e, t);
};
function c(e) {
a.call(this, "der", e);
}
i(c, a);
c.prototype._peekTag = function(e, t, i) {
if (e.isEmpty()) return !1;
const r = e.save(), n = f(e, 'Failed to peek tag: "' + t + '"');
if (e.isError(n)) return n;
e.restore(r);
return n.tag === t || n.tagStr === t || n.tagStr + "of" === t || i;
};
c.prototype._decodeTag = function(e, t, i) {
const r = f(e, 'Failed to decode tag of "' + t + '"');
if (e.isError(r)) return r;
let n = h(e, r.primitive, 'Failed to get length of "' + t + '"');
if (e.isError(n)) return n;
if (!i && r.tag !== t && r.tagStr !== t && r.tagStr + "of" !== t) return e.error('Failed to match tag: "' + t + '"');
if (r.primitive || null !== n) return e.skip(n, 'Failed to match body of: "' + t + '"');
const a = e.save(), s = this._skipUntilEnd(e, 'Failed to skip indefinite length body: "' + this.tag + '"');
if (e.isError(s)) return s;
n = e.offset - a.offset;
e.restore(a);
return e.skip(n, 'Failed to match body of: "' + t + '"');
};
c.prototype._skipUntilEnd = function(e, t) {
for (;;) {
const i = f(e, t);
if (e.isError(i)) return i;
const r = h(e, i.primitive, t);
if (e.isError(r)) return r;
let n;
n = i.primitive || null !== r ? e.skip(r) : this._skipUntilEnd(e, t);
if (e.isError(n)) return n;
if ("end" === i.tagStr) break;
}
};
c.prototype._decodeList = function(e, t, i, r) {
const n = [];
for (;!e.isEmpty(); ) {
const t = this._peekTag(e, "end");
if (e.isError(t)) return t;
const a = i.decode(e, "der", r);
if (e.isError(a) && t) break;
n.push(a);
}
return n;
};
c.prototype._decodeStr = function(e, t) {
if ("bitstr" === t) {
const t = e.readUInt8();
return e.isError(t) ? t : {
unused: t,
data: e.raw()
};
}
if ("bmpstr" === t) {
const t = e.raw();
if (t.length % 2 == 1) return e.error("Decoding of string type: bmpstr length mismatch");
let i = "";
for (let e = 0; e < t.length / 2; e++) i += String.fromCharCode(t.readUInt16BE(2 * e));
return i;
}
if ("numstr" === t) {
const t = e.raw().toString("ascii");
return this._isNumstr(t) ? t : e.error("Decoding of string type: numstr unsupported characters");
}
if ("octstr" === t) return e.raw();
if ("objDesc" === t) return e.raw();
if ("printstr" === t) {
const t = e.raw().toString("ascii");
return this._isPrintstr(t) ? t : e.error("Decoding of string type: printstr unsupported characters");
}
return /str$/.test(t) ? e.raw().toString() : e.error("Decoding of string type: " + t + " unsupported");
};
c.prototype._decodeObjid = function(e, t, i) {
let r;
const n = [];
let a = 0, s = 0;
for (;!e.isEmpty(); ) {
a <<= 7;
a |= 127 & (s = e.readUInt8());
if (0 == (128 & s)) {
n.push(a);
a = 0;
}
}
128 & s && n.push(a);
const o = n[0] / 40 | 0, c = n[0] % 40;
r = i ? n : [ o, c ].concat(n.slice(1));
if (t) {
let e = t[r.join(" ")];
void 0 === e && (e = t[r.join(".")]);
void 0 !== e && (r = e);
}
return r;
};
c.prototype._decodeTime = function(e, t) {
const i = e.raw().toString();
let r, n, a, s, o, c;
if ("gentime" === t) {
r = 0 | i.slice(0, 4);
n = 0 | i.slice(4, 6);
a = 0 | i.slice(6, 8);
s = 0 | i.slice(8, 10);
o = 0 | i.slice(10, 12);
c = 0 | i.slice(12, 14);
} else {
if ("utctime" !== t) return e.error("Decoding " + t + " time is not supported yet");
r = 0 | i.slice(0, 2);
n = 0 | i.slice(2, 4);
a = 0 | i.slice(4, 6);
s = 0 | i.slice(6, 8);
o = 0 | i.slice(8, 10);
c = 0 | i.slice(10, 12);
r = r < 70 ? 2e3 + r : 1900 + r;
}
return Date.UTC(r, n - 1, a, s, o, c, 0);
};
c.prototype._decodeNull = function() {
return null;
};
c.prototype._decodeBool = function(e) {
const t = e.readUInt8();
return e.isError(t) ? t : 0 !== t;
};
c.prototype._decodeInt = function(e, t) {
const i = e.raw();
let n = new r(i);
t && (n = t[n.toString(10)] || n);
return n;
};
c.prototype._use = function(e, t) {
"function" == typeof e && (e = e(t));
return e._getDecoder("der").tree;
};
function f(e, t) {
let i = e.readUInt8(t);
if (e.isError(i)) return i;
const r = s.tagClass[i >> 6], n = 0 == (32 & i);
if (31 == (31 & i)) {
let r = i;
i = 0;
for (;128 == (128 & r); ) {
r = e.readUInt8(t);
if (e.isError(r)) return r;
i <<= 7;
i |= 127 & r;
}
} else i &= 31;
return {
cls: r,
primitive: n,
tag: i,
tagStr: s.tag[i]
};
}
function h(e, t, i) {
let r = e.readUInt8(i);
if (e.isError(r)) return r;
if (!t && 128 === r) return null;
if (0 == (128 & r)) return r;
const n = 127 & r;
if (n > 4) return e.error("length octect is too long");
r = 0;
for (let t = 0; t < n; t++) {
r <<= 8;
const t = e.readUInt8(i);
if (e.isError(t)) return t;
r |= t;
}
return r;
}
}, {
"../base/buffer": 3,
"../base/node": 5,
"../constants/der": 7,
"bn.js": 15,
inherits: 138
} ],
10: [ function(e, t, i) {
"use strict";
const r = i;
r.der = e("./der");
r.pem = e("./pem");
}, {
"./der": 9,
"./pem": 11
} ],
11: [ function(e, t) {
"use strict";
const i = e("inherits"), r = e("safer-buffer").Buffer, n = e("./der");
function a(e) {
n.call(this, e);
this.enc = "pem";
}
i(a, n);
t.exports = a;
a.prototype.decode = function(e, t) {
const i = e.toString().split(/[\r\n]+/g), a = t.label.toUpperCase(), s = /^-----(BEGIN|END) ([^-]+)-----$/;
let o = -1, c = -1;
for (let e = 0; e < i.length; e++) {
const t = i[e].match(s);
if (null !== t && t[2] === a) {
if (-1 !== o) {
if ("END" !== t[1]) break;
c = e;
break;
}
if ("BEGIN" !== t[1]) break;
o = e;
}
}
if (-1 === o || -1 === c) throw new Error("PEM section not found for: " + a);
const f = i.slice(o + 1, c).join("");
f.replace(/[^a-z0-9+/=]+/gi, "");
const h = r.from(f, "base64");
return n.prototype.decode.call(this, h, t);
};
}, {
"./der": 9,
inherits: 138,
"safer-buffer": 183
} ],
12: [ function(e, t) {
"use strict";
const i = e("inherits"), r = e("safer-buffer").Buffer, n = e("../base/node"), a = e("../constants/der");
function s(e) {
this.enc = "der";
this.name = e.name;
this.entity = e;
this.tree = new o();
this.tree._init(e.body);
}
t.exports = s;
s.prototype.encode = function(e, t) {
return this.tree._encode(e, t).join();
};
function o(e) {
n.call(this, "der", e);
}
i(o, n);
o.prototype._encodeComposite = function(e, t, i, n) {
const a = f(e, t, i, this.reporter);
if (n.length < 128) {
const e = r.alloc(2);
e[0] = a;
e[1] = n.length;
return this._createEncoderBuffer([ e, n ]);
}
let s = 1;
for (let e = n.length; e >= 256; e >>= 8) s++;
const o = r.alloc(2 + s);
o[0] = a;
o[1] = 128 | s;
for (let e = 1 + s, t = n.length; t > 0; e--, t >>= 8) o[e] = 255 & t;
return this._createEncoderBuffer([ o, n ]);
};
o.prototype._encodeStr = function(e, t) {
if ("bitstr" === t) return this._createEncoderBuffer([ 0 | e.unused, e.data ]);
if ("bmpstr" === t) {
const t = r.alloc(2 * e.length);
for (let i = 0; i < e.length; i++) t.writeUInt16BE(e.charCodeAt(i), 2 * i);
return this._createEncoderBuffer(t);
}
return "numstr" === t ? this._isNumstr(e) ? this._createEncoderBuffer(e) : this.reporter.error("Encoding of string type: numstr supports only digits and space") : "printstr" === t ? this._isPrintstr(e) ? this._createEncoderBuffer(e) : this.reporter.error("Encoding of string type: printstr supports only latin upper and lower case letters, digits, space, apostrophe, left and rigth parenthesis, plus sign, comma, hyphen, dot, slash, colon, equal sign, question mark") : /str$/.test(t) ? this._createEncoderBuffer(e) : "objDesc" === t ? this._createEncoderBuffer(e) : this.reporter.error("Encoding of string type: " + t + " unsupported");
};
o.prototype._encodeObjid = function(e, t, i) {
if ("string" == typeof e) {
if (!t) return this.reporter.error("string objid given, but no values map found");
if (!t.hasOwnProperty(e)) return this.reporter.error("objid not found in values map");
e = t[e].split(/[\s.]+/g);
for (let t = 0; t < e.length; t++) e[t] |= 0;
} else if (Array.isArray(e)) {
e = e.slice();
for (let t = 0; t < e.length; t++) e[t] |= 0;
}
if (!Array.isArray(e)) return this.reporter.error("objid() should be either array or string, got: " + JSON.stringify(e));
if (!i) {
if (e[1] >= 40) return this.reporter.error("Second objid identifier OOB");
e.splice(0, 2, 40 * e[0] + e[1]);
}
let n = 0;
for (let t = 0; t < e.length; t++) {
let i = e[t];
for (n++; i >= 128; i >>= 7) n++;
}
const a = r.alloc(n);
let s = a.length - 1;
for (let t = e.length - 1; t >= 0; t--) {
let i = e[t];
a[s--] = 127 & i;
for (;(i >>= 7) > 0; ) a[s--] = 128 | 127 & i;
}
return this._createEncoderBuffer(a);
};
function c(e) {
return e < 10 ? "0" + e : e;
}
o.prototype._encodeTime = function(e, t) {
let i;
const r = new Date(e);
"gentime" === t ? i = [ c(r.getUTCFullYear()), c(r.getUTCMonth() + 1), c(r.getUTCDate()), c(r.getUTCHours()), c(r.getUTCMinutes()), c(r.getUTCSeconds()), "Z" ].join("") : "utctime" === t ? i = [ c(r.getUTCFullYear() % 100), c(r.getUTCMonth() + 1), c(r.getUTCDate()), c(r.getUTCHours()), c(r.getUTCMinutes()), c(r.getUTCSeconds()), "Z" ].join("") : this.reporter.error("Encoding " + t + " time is not supported yet");
return this._encodeStr(i, "octstr");
};
o.prototype._encodeNull = function() {
return this._createEncoderBuffer("");
};
o.prototype._encodeInt = function(e, t) {
if ("string" == typeof e) {
if (!t) return this.reporter.error("String int or enum given, but no values map");
if (!t.hasOwnProperty(e)) return this.reporter.error("Values map doesn't contain: " + JSON.stringify(e));
e = t[e];
}
if ("number" != typeof e && !r.isBuffer(e)) {
const t = e.toArray();
!e.sign && 128 & t[0] && t.unshift(0);
e = r.from(t);
}
if (r.isBuffer(e)) {
let t = e.length;
0 === e.length && t++;
const i = r.alloc(t);
e.copy(i);
0 === e.length && (i[0] = 0);
return this._createEncoderBuffer(i);
}
if (e < 128) return this._createEncoderBuffer(e);
if (e < 256) return this._createEncoderBuffer([ 0, e ]);
let i = 1;
for (let t = e; t >= 256; t >>= 8) i++;
const n = new Array(i);
for (let t = n.length - 1; t >= 0; t--) {
n[t] = 255 & e;
e >>= 8;
}
128 & n[0] && n.unshift(0);
return this._createEncoderBuffer(r.from(n));
};
o.prototype._encodeBool = function(e) {
return this._createEncoderBuffer(e ? 255 : 0);
};
o.prototype._use = function(e, t) {
"function" == typeof e && (e = e(t));
return e._getEncoder("der").tree;
};
o.prototype._skipDefault = function(e, t, i) {
const r = this._baseState;
let n;
if (null === r.default) return !1;
const a = e.join();
void 0 === r.defaultBuffer && (r.defaultBuffer = this._encodeValue(r.default, t, i).join());
if (a.length !== r.defaultBuffer.length) return !1;
for (n = 0; n < a.length; n++) if (a[n] !== r.defaultBuffer[n]) return !1;
return !0;
};
function f(e, t, i, r) {
let n;
"seqof" === e ? e = "seq" : "setof" === e && (e = "set");
if (a.tagByName.hasOwnProperty(e)) n = a.tagByName[e]; else {
if ("number" != typeof e || (0 | e) !== e) return r.error("Unknown tag: " + e);
n = e;
}
if (n >= 31) return r.error("Multi-octet tag encoding unsupported");
t || (n |= 32);
return n | a.tagClassByName[i || "universal"] << 6;
}
}, {
"../base/node": 5,
"../constants/der": 7,
inherits: 138,
"safer-buffer": 183
} ],
13: [ function(e, t, i) {
"use strict";
const r = i;
r.der = e("./der");
r.pem = e("./pem");
}, {
"./der": 12,
"./pem": 14
} ],
14: [ function(e, t) {
"use strict";
const i = e("inherits"), r = e("./der");
function n(e) {
r.call(this, e);
this.enc = "pem";
}
i(n, r);
t.exports = n;
n.prototype.encode = function(e, t) {
const i = r.prototype.encode.call(this, e).toString("base64"), n = [ "-----BEGIN " + t.label + "-----" ];
for (let e = 0; e < i.length; e += 64) n.push(i.slice(e, e + 64));
n.push("-----END " + t.label + "-----");
return n.join("\n");
};
}, {
"./der": 12,
inherits: 138
} ],
15: [ function(e, t) {
(function(t, i) {
"use strict";
function r(e, t) {
if (!e) throw new Error(t || "Assertion failed");
}
function n(e, t) {
e.super_ = t;
var i = function() {};
i.prototype = t.prototype;
e.prototype = new i();
e.prototype.constructor = e;
}
function a(e, t, i) {
if (a.isBN(e)) return e;
this.negative = 0;
this.words = null;
this.length = 0;
this.red = null;
if (null !== e) {
if ("le" === t || "be" === t) {
i = t;
t = 10;
}
this._init(e || 0, t || 10, i || "be");
}
}
"object" == typeof t ? t.exports = a : i.BN = a;
a.BN = a;
a.wordSize = 26;
var s;
try {
s = "undefined" != typeof window && "undefined" != typeof window.Buffer ? window.Buffer : e("buffer").Buffer;
} catch (e) {}
a.isBN = function(e) {
return e instanceof a || null !== e && "object" == typeof e && e.constructor.wordSize === a.wordSize && Array.isArray(e.words);
};
a.max = function(e, t) {
return e.cmp(t) > 0 ? e : t;
};
a.min = function(e, t) {
return e.cmp(t) < 0 ? e : t;
};
a.prototype._init = function(e, t, i) {
if ("number" == typeof e) return this._initNumber(e, t, i);
if ("object" == typeof e) return this._initArray(e, t, i);
"hex" === t && (t = 16);
r(t === (0 | t) && t >= 2 && t <= 36);
var n = 0;
if ("-" === (e = e.toString().replace(/\s+/g, ""))[0]) {
n++;
this.negative = 1;
}
if (n < e.length) if (16 === t) this._parseHex(e, n, i); else {
this._parseBase(e, t, n);
"le" === i && this._initArray(this.toArray(), t, i);
}
};
a.prototype._initNumber = function(e, t, i) {
if (e < 0) {
this.negative = 1;
e = -e;
}
if (e < 67108864) {
this.words = [ 67108863 & e ];
this.length = 1;
} else if (e < 4503599627370496) {
this.words = [ 67108863 & e, e / 67108864 & 67108863 ];
this.length = 2;
} else {
r(e < 9007199254740992);
this.words = [ 67108863 & e, e / 67108864 & 67108863, 1 ];
this.length = 3;
}
"le" === i && this._initArray(this.toArray(), t, i);
};
a.prototype._initArray = function(e, t, i) {
r("number" == typeof e.length);
if (e.length <= 0) {
this.words = [ 0 ];
this.length = 1;
return this;
}
this.length = Math.ceil(e.length / 3);
this.words = new Array(this.length);
for (var n = 0; n < this.length; n++) this.words[n] = 0;
var a, s, o = 0;
if ("be" === i) for (n = e.length - 1, a = 0; n >= 0; n -= 3) {
s = e[n] | e[n - 1] << 8 | e[n - 2] << 16;
this.words[a] |= s << o & 67108863;
this.words[a + 1] = s >>> 26 - o & 67108863;
if ((o += 24) >= 26) {
o -= 26;
a++;
}
} else if ("le" === i) for (n = 0, a = 0; n < e.length; n += 3) {
s = e[n] | e[n + 1] << 8 | e[n + 2] << 16;
this.words[a] |= s << o & 67108863;
this.words[a + 1] = s >>> 26 - o & 67108863;
if ((o += 24) >= 26) {
o -= 26;
a++;
}
}
return this.strip();
};
function o(e, t) {
var i = e.charCodeAt(t);
return i >= 65 && i <= 70 ? i - 55 : i >= 97 && i <= 102 ? i - 87 : i - 48 & 15;
}
function c(e, t, i) {
var r = o(e, i);
i - 1 >= t && (r |= o(e, i - 1) << 4);
return r;
}
a.prototype._parseHex = function(e, t, i) {
this.length = Math.ceil((e.length - t) / 6);
this.words = new Array(this.length);
for (var r = 0; r < this.length; r++) this.words[r] = 0;
var n, a = 0, s = 0;
if ("be" === i) for (r = e.length - 1; r >= t; r -= 2) {
n = c(e, t, r) << a;
this.words[s] |= 67108863 & n;
if (a >= 18) {
a -= 18;
s += 1;
this.words[s] |= n >>> 26;
} else a += 8;
} else for (r = (e.length - t) % 2 == 0 ? t + 1 : t; r < e.length; r += 2) {
n = c(e, t, r) << a;
this.words[s] |= 67108863 & n;
if (a >= 18) {
a -= 18;
s += 1;
this.words[s] |= n >>> 26;
} else a += 8;
}
this.strip();
};
function f(e, t, i, r) {
for (var n = 0, a = Math.min(e.length, i), s = t; s < a; s++) {
var o = e.charCodeAt(s) - 48;
n *= r;
n += o >= 49 ? o - 49 + 10 : o >= 17 ? o - 17 + 10 : o;
}
return n;
}
a.prototype._parseBase = function(e, t, i) {
this.words = [ 0 ];
this.length = 1;
for (var r = 0, n = 1; n <= 67108863; n *= t) r++;
r--;
n = n / t | 0;
for (var a = e.length - i, s = a % r, o = Math.min(a, a - s) + i, c = 0, h = i; h < o; h += r) {
c = f(e, h, h + r, t);
this.imuln(n);
this.words[0] + c < 67108864 ? this.words[0] += c : this._iaddn(c);
}
if (0 !== s) {
var u = 1;
c = f(e, h, e.length, t);
for (h = 0; h < s; h++) u *= t;
this.imuln(u);
this.words[0] + c < 67108864 ? this.words[0] += c : this._iaddn(c);
}
this.strip();
};
a.prototype.copy = function(e) {
e.words = new Array(this.length);
for (var t = 0; t < this.length; t++) e.words[t] = this.words[t];
e.length = this.length;
e.negative = this.negative;
e.red = this.red;
};
a.prototype.clone = function() {
var e = new a(null);
this.copy(e);
return e;
};
a.prototype._expand = function(e) {
for (;this.length < e; ) this.words[this.length++] = 0;
return this;
};
a.prototype.strip = function() {
for (;this.length > 1 && 0 === this.words[this.length - 1]; ) this.length--;
return this._normSign();
};
a.prototype._normSign = function() {
1 === this.length && 0 === this.words[0] && (this.negative = 0);
return this;
};
a.prototype.inspect = function() {
return (this.red ? "<BN-R: " : "<BN: ") + this.toString(16) + ">";
};
var h = [ "", "0", "00", "000", "0000", "00000", "000000", "0000000", "00000000", "000000000", "0000000000", "00000000000", "000000000000", "0000000000000", "00000000000000", "000000000000000", "0000000000000000", "00000000000000000", "000000000000000000", "0000000000000000000", "00000000000000000000", "000000000000000000000", "0000000000000000000000", "00000000000000000000000", "000000000000000000000000", "0000000000000000000000000" ], u = [ 0, 0, 25, 16, 12, 11, 10, 9, 8, 8, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5 ], d = [ 0, 0, 33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216, 43046721, 1e7, 19487171, 35831808, 62748517, 7529536, 11390625, 16777216, 24137569, 34012224, 47045881, 64e6, 4084101, 5153632, 6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149, 243e5, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176 ];
a.prototype.toString = function(e, t) {
t = 0 | t || 1;
var i;
if (16 === (e = e || 10) || "hex" === e) {
i = "";
for (var n = 0, a = 0, s = 0; s < this.length; s++) {
var o = this.words[s], c = (16777215 & (o << n | a)).toString(16);
i = 0 != (a = o >>> 24 - n & 16777215) || s !== this.length - 1 ? h[6 - c.length] + c + i : c + i;
if ((n += 2) >= 26) {
n -= 26;
s--;
}
}
0 !== a && (i = a.toString(16) + i);
for (;i.length % t != 0; ) i = "0" + i;
0 !== this.negative && (i = "-" + i);
return i;
}
if (e === (0 | e) && e >= 2 && e <= 36) {
var f = u[e], l = d[e];
i = "";
var p = this.clone();
p.negative = 0;
for (;!p.isZero(); ) {
var b = p.modn(l).toString(e);
i = (p = p.idivn(l)).isZero() ? b + i : h[f - b.length] + b + i;
}
this.isZero() && (i = "0" + i);
for (;i.length % t != 0; ) i = "0" + i;
0 !== this.negative && (i = "-" + i);
return i;
}
r(!1, "Base should be between 2 and 36");
};
a.prototype.toNumber = function() {
var e = this.words[0];
2 === this.length ? e += 67108864 * this.words[1] : 3 === this.length && 1 === this.words[2] ? e += 4503599627370496 + 67108864 * this.words[1] : this.length > 2 && r(!1, "Number can only safely store up to 53 bits");
return 0 !== this.negative ? -e : e;
};
a.prototype.toJSON = function() {
return this.toString(16);
};
a.prototype.toBuffer = function(e, t) {
r("undefined" != typeof s);
return this.toArrayLike(s, e, t);
};
a.prototype.toArray = function(e, t) {
return this.toArrayLike(Array, e, t);
};
a.prototype.toArrayLike = function(e, t, i) {
var n = this.byteLength(), a = i || Math.max(1, n);
r(n <= a, "byte array longer than desired length");
r(a > 0, "Requested array length <= 0");
this.strip();
var s, o, c = "le" === t, f = new e(a), h = this.clone();
if (c) {
for (o = 0; !h.isZero(); o++) {
s = h.andln(255);
h.iushrn(8);
f[o] = s;
}
for (;o < a; o++) f[o] = 0;
} else {
for (o = 0; o < a - n; o++) f[o] = 0;
for (o = 0; !h.isZero(); o++) {
s = h.andln(255);
h.iushrn(8);
f[a - o - 1] = s;
}
}
return f;
};
Math.clz32 ? a.prototype._countBits = function(e) {
return 32 - Math.clz32(e);
} : a.prototype._countBits = function(e) {
var t = e, i = 0;
if (t >= 4096) {
i += 13;
t >>>= 13;
}
if (t >= 64) {
i += 7;
t >>>= 7;
}
if (t >= 8) {
i += 4;
t >>>= 4;
}
if (t >= 2) {
i += 2;
t >>>= 2;
}
return i + t;
};
a.prototype._zeroBits = function(e) {
if (0 === e) return 26;
var t = e, i = 0;
if (0 == (8191 & t)) {
i += 13;
t >>>= 13;
}
if (0 == (127 & t)) {
i += 7;
t >>>= 7;
}
if (0 == (15 & t)) {
i += 4;
t >>>= 4;
}
if (0 == (3 & t)) {
i += 2;
t >>>= 2;
}
0 == (1 & t) && i++;
return i;
};
a.prototype.bitLength = function() {
var e = this.words[this.length - 1], t = this._countBits(e);
return 26 * (this.length - 1) + t;
};
function l(e) {
for (var t = new Array(e.bitLength()), i = 0; i < t.length; i++) {
var r = i / 26 | 0, n = i % 26;
t[i] = (e.words[r] & 1 << n) >>> n;
}
return t;
}
a.prototype.zeroBits = function() {
if (this.isZero()) return 0;
for (var e = 0, t = 0; t < this.length; t++) {
var i = this._zeroBits(this.words[t]);
e += i;
if (26 !== i) break;
}
return e;
};
a.prototype.byteLength = function() {
return Math.ceil(this.bitLength() / 8);
};
a.prototype.toTwos = function(e) {
return 0 !== this.negative ? this.abs().inotn(e).iaddn(1) : this.clone();
};
a.prototype.fromTwos = function(e) {
return this.testn(e - 1) ? this.notn(e).iaddn(1).ineg() : this.clone();
};
a.prototype.isNeg = function() {
return 0 !== this.negative;
};
a.prototype.neg = function() {
return this.clone().ineg();
};
a.prototype.ineg = function() {
this.isZero() || (this.negative ^= 1);
return this;
};
a.prototype.iuor = function(e) {
for (;this.length < e.length; ) this.words[this.length++] = 0;
for (var t = 0; t < e.length; t++) this.words[t] = this.words[t] | e.words[t];
return this.strip();
};
a.prototype.ior = function(e) {
r(0 == (this.negative | e.negative));
return this.iuor(e);
};
a.prototype.or = function(e) {
return this.length > e.length ? this.clone().ior(e) : e.clone().ior(this);
};
a.prototype.uor = function(e) {
return this.length > e.length ? this.clone().iuor(e) : e.clone().iuor(this);
};
a.prototype.iuand = function(e) {
var t;
t = this.length > e.length ? e : this;
for (var i = 0; i < t.length; i++) this.words[i] = this.words[i] & e.words[i];
this.length = t.length;
return this.strip();
};
a.prototype.iand = function(e) {
r(0 == (this.negative | e.negative));
return this.iuand(e);
};
a.prototype.and = function(e) {
return this.length > e.length ? this.clone().iand(e) : e.clone().iand(this);
};
a.prototype.uand = function(e) {
return this.length > e.length ? this.clone().iuand(e) : e.clone().iuand(this);
};
a.prototype.iuxor = function(e) {
var t, i;
if (this.length > e.length) {
t = this;
i = e;
} else {
t = e;
i = this;
}
for (var r = 0; r < i.length; r++) this.words[r] = t.words[r] ^ i.words[r];
if (this !== t) for (;r < t.length; r++) this.words[r] = t.words[r];
this.length = t.length;
return this.strip();
};
a.prototype.ixor = function(e) {
r(0 == (this.negative | e.negative));
return this.iuxor(e);
};
a.prototype.xor = function(e) {
return this.length > e.length ? this.clone().ixor(e) : e.clone().ixor(this);
};
a.prototype.uxor = function(e) {
return this.length > e.length ? this.clone().iuxor(e) : e.clone().iuxor(this);
};
a.prototype.inotn = function(e) {
r("number" == typeof e && e >= 0);
var t = 0 | Math.ceil(e / 26), i = e % 26;
this._expand(t);
i > 0 && t--;
for (var n = 0; n < t; n++) this.words[n] = 67108863 & ~this.words[n];
i > 0 && (this.words[n] = ~this.words[n] & 67108863 >> 26 - i);
return this.strip();
};
a.prototype.notn = function(e) {
return this.clone().inotn(e);
};
a.prototype.setn = function(e, t) {
r("number" == typeof e && e >= 0);
var i = e / 26 | 0, n = e % 26;
this._expand(i + 1);
this.words[i] = t ? this.words[i] | 1 << n : this.words[i] & ~(1 << n);
return this.strip();
};
a.prototype.iadd = function(e) {
var t, i, r;
if (0 !== this.negative && 0 === e.negative) {
this.negative = 0;
t = this.isub(e);
this.negative ^= 1;
return this._normSign();
}
if (0 === this.negative && 0 !== e.negative) {
e.negative = 0;
t = this.isub(e);
e.negative = 1;
return t._normSign();
}
if (this.length > e.length) {
i = this;
r = e;
} else {
i = e;
r = this;
}
for (var n = 0, a = 0; a < r.length; a++) {
t = (0 | i.words[a]) + (0 | r.words[a]) + n;
this.words[a] = 67108863 & t;
n = t >>> 26;
}
for (;0 !== n && a < i.length; a++) {
t = (0 | i.words[a]) + n;
this.words[a] = 67108863 & t;
n = t >>> 26;
}
this.length = i.length;
if (0 !== n) {
this.words[this.length] = n;
this.length++;
} else if (i !== this) for (;a < i.length; a++) this.words[a] = i.words[a];
return this;
};
a.prototype.add = function(e) {
var t;
if (0 !== e.negative && 0 === this.negative) {
e.negative = 0;
t = this.sub(e);
e.negative ^= 1;
return t;
}
if (0 === e.negative && 0 !== this.negative) {
this.negative = 0;
t = e.sub(this);
this.negative = 1;
return t;
}
return this.length > e.length ? this.clone().iadd(e) : e.clone().iadd(this);
};
a.prototype.isub = function(e) {
if (0 !== e.negative) {
e.negative = 0;
var t = this.iadd(e);
e.negative = 1;
return t._normSign();
}
if (0 !== this.negative) {
this.negative = 0;
this.iadd(e);
this.negative = 1;
return this._normSign();
}
var i, r, n = this.cmp(e);
if (0 === n) {
this.negative = 0;
this.length = 1;
this.words[0] = 0;
return this;
}
if (n > 0) {
i = this;
r = e;
} else {
i = e;
r = this;
}
for (var a = 0, s = 0; s < r.length; s++) {
a = (t = (0 | i.words[s]) - (0 | r.words[s]) + a) >> 26;
this.words[s] = 67108863 & t;
}
for (;0 !== a && s < i.length; s++) {
a = (t = (0 | i.words[s]) + a) >> 26;
this.words[s] = 67108863 & t;
}
if (0 === a && s < i.length && i !== this) for (;s < i.length; s++) this.words[s] = i.words[s];
this.length = Math.max(this.length, s);
i !== this && (this.negative = 1);
return this.strip();
};
a.prototype.sub = function(e) {
return this.clone().isub(e);
};
function p(e, t, i) {
i.negative = t.negative ^ e.negative;
var r = e.length + t.length | 0;
i.length = r;
r = r - 1 | 0;
var n = 0 | e.words[0], a = 0 | t.words[0], s = n * a, o = 67108863 & s, c = s / 67108864 | 0;
i.words[0] = o;
for (var f = 1; f < r; f++) {
for (var h = c >>> 26, u = 67108863 & c, d = Math.min(f, t.length - 1), l = Math.max(0, f - e.length + 1); l <= d; l++) {
var p = f - l | 0;
h += (s = (n = 0 | e.words[p]) * (a = 0 | t.words[l]) + u) / 67108864 | 0;
u = 67108863 & s;
}
i.words[f] = 0 | u;
c = 0 | h;
}
0 !== c ? i.words[f] = 0 | c : i.length--;
return i.strip();
}
var b = function(e, t, i) {
var r, n, a, s = e.words, o = t.words, c = i.words, f = 0, h = 0 | s[0], u = 8191 & h, d = h >>> 13, l = 0 | s[1], p = 8191 & l, b = l >>> 13, g = 0 | s[2], m = 8191 & g, v = g >>> 13, y = 0 | s[3], _ = 8191 & y, w = y >>> 13, S = 0 | s[4], k = 8191 & S, M = S >>> 13, A = 0 | s[5], I = 8191 & A, E = A >>> 13, P = 0 | s[6], C = 8191 & P, x = P >>> 13, O = 0 | s[7], N = 8191 & O, T = O >>> 13, j = 0 | s[8], D = 8191 & j, R = j >>> 13, B = 0 | s[9], L = 8191 & B, U = B >>> 13, q = 0 | o[0], F = 8191 & q, z = q >>> 13, H = 0 | o[1], J = 8191 & H, K = H >>> 13, W = 0 | o[2], V = 8191 & W, G = W >>> 13, Y = 0 | o[3], X = 8191 & Y, Z = Y >>> 13, Q = 0 | o[4], $ = 8191 & Q, ee = Q >>> 13, te = 0 | o[5], ie = 8191 & te, re = te >>> 13, ne = 0 | o[6], ae = 8191 & ne, se = ne >>> 13, oe = 0 | o[7], ce = 8191 & oe, fe = oe >>> 13, he = 0 | o[8], ue = 8191 & he, de = he >>> 13, le = 0 | o[9], pe = 8191 & le, be = le >>> 13;
i.negative = e.negative ^ t.negative;
i.length = 19;
var ge = (f + (r = Math.imul(u, F)) | 0) + ((8191 & (n = (n = Math.imul(u, z)) + Math.imul(d, F) | 0)) << 13) | 0;
f = ((a = Math.imul(d, z)) + (n >>> 13) | 0) + (ge >>> 26) | 0;
ge &= 67108863;
r = Math.imul(p, F);
n = (n = Math.imul(p, z)) + Math.imul(b, F) | 0;
a = Math.imul(b, z);
var me = (f + (r = r + Math.imul(u, J) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, K) | 0) + Math.imul(d, J) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, K) | 0) + (n >>> 13) | 0) + (me >>> 26) | 0;
me &= 67108863;
r = Math.imul(m, F);
n = (n = Math.imul(m, z)) + Math.imul(v, F) | 0;
a = Math.imul(v, z);
r = r + Math.imul(p, J) | 0;
n = (n = n + Math.imul(p, K) | 0) + Math.imul(b, J) | 0;
a = a + Math.imul(b, K) | 0;
var ve = (f + (r = r + Math.imul(u, V) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, G) | 0) + Math.imul(d, V) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, G) | 0) + (n >>> 13) | 0) + (ve >>> 26) | 0;
ve &= 67108863;
r = Math.imul(_, F);
n = (n = Math.imul(_, z)) + Math.imul(w, F) | 0;
a = Math.imul(w, z);
r = r + Math.imul(m, J) | 0;
n = (n = n + Math.imul(m, K) | 0) + Math.imul(v, J) | 0;
a = a + Math.imul(v, K) | 0;
r = r + Math.imul(p, V) | 0;
n = (n = n + Math.imul(p, G) | 0) + Math.imul(b, V) | 0;
a = a + Math.imul(b, G) | 0;
var ye = (f + (r = r + Math.imul(u, X) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, Z) | 0) + Math.imul(d, X) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, Z) | 0) + (n >>> 13) | 0) + (ye >>> 26) | 0;
ye &= 67108863;
r = Math.imul(k, F);
n = (n = Math.imul(k, z)) + Math.imul(M, F) | 0;
a = Math.imul(M, z);
r = r + Math.imul(_, J) | 0;
n = (n = n + Math.imul(_, K) | 0) + Math.imul(w, J) | 0;
a = a + Math.imul(w, K) | 0;
r = r + Math.imul(m, V) | 0;
n = (n = n + Math.imul(m, G) | 0) + Math.imul(v, V) | 0;
a = a + Math.imul(v, G) | 0;
r = r + Math.imul(p, X) | 0;
n = (n = n + Math.imul(p, Z) | 0) + Math.imul(b, X) | 0;
a = a + Math.imul(b, Z) | 0;
var _e = (f + (r = r + Math.imul(u, $) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, ee) | 0) + Math.imul(d, $) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, ee) | 0) + (n >>> 13) | 0) + (_e >>> 26) | 0;
_e &= 67108863;
r = Math.imul(I, F);
n = (n = Math.imul(I, z)) + Math.imul(E, F) | 0;
a = Math.imul(E, z);
r = r + Math.imul(k, J) | 0;
n = (n = n + Math.imul(k, K) | 0) + Math.imul(M, J) | 0;
a = a + Math.imul(M, K) | 0;
r = r + Math.imul(_, V) | 0;
n = (n = n + Math.imul(_, G) | 0) + Math.imul(w, V) | 0;
a = a + Math.imul(w, G) | 0;
r = r + Math.imul(m, X) | 0;
n = (n = n + Math.imul(m, Z) | 0) + Math.imul(v, X) | 0;
a = a + Math.imul(v, Z) | 0;
r = r + Math.imul(p, $) | 0;
n = (n = n + Math.imul(p, ee) | 0) + Math.imul(b, $) | 0;
a = a + Math.imul(b, ee) | 0;
var we = (f + (r = r + Math.imul(u, ie) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, re) | 0) + Math.imul(d, ie) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, re) | 0) + (n >>> 13) | 0) + (we >>> 26) | 0;
we &= 67108863;
r = Math.imul(C, F);
n = (n = Math.imul(C, z)) + Math.imul(x, F) | 0;
a = Math.imul(x, z);
r = r + Math.imul(I, J) | 0;
n = (n = n + Math.imul(I, K) | 0) + Math.imul(E, J) | 0;
a = a + Math.imul(E, K) | 0;
r = r + Math.imul(k, V) | 0;
n = (n = n + Math.imul(k, G) | 0) + Math.imul(M, V) | 0;
a = a + Math.imul(M, G) | 0;
r = r + Math.imul(_, X) | 0;
n = (n = n + Math.imul(_, Z) | 0) + Math.imul(w, X) | 0;
a = a + Math.imul(w, Z) | 0;
r = r + Math.imul(m, $) | 0;
n = (n = n + Math.imul(m, ee) | 0) + Math.imul(v, $) | 0;
a = a + Math.imul(v, ee) | 0;
r = r + Math.imul(p, ie) | 0;
n = (n = n + Math.imul(p, re) | 0) + Math.imul(b, ie) | 0;
a = a + Math.imul(b, re) | 0;
var Se = (f + (r = r + Math.imul(u, ae) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, se) | 0) + Math.imul(d, ae) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, se) | 0) + (n >>> 13) | 0) + (Se >>> 26) | 0;
Se &= 67108863;
r = Math.imul(N, F);
n = (n = Math.imul(N, z)) + Math.imul(T, F) | 0;
a = Math.imul(T, z);
r = r + Math.imul(C, J) | 0;
n = (n = n + Math.imul(C, K) | 0) + Math.imul(x, J) | 0;
a = a + Math.imul(x, K) | 0;
r = r + Math.imul(I, V) | 0;
n = (n = n + Math.imul(I, G) | 0) + Math.imul(E, V) | 0;
a = a + Math.imul(E, G) | 0;
r = r + Math.imul(k, X) | 0;
n = (n = n + Math.imul(k, Z) | 0) + Math.imul(M, X) | 0;
a = a + Math.imul(M, Z) | 0;
r = r + Math.imul(_, $) | 0;
n = (n = n + Math.imul(_, ee) | 0) + Math.imul(w, $) | 0;
a = a + Math.imul(w, ee) | 0;
r = r + Math.imul(m, ie) | 0;
n = (n = n + Math.imul(m, re) | 0) + Math.imul(v, ie) | 0;
a = a + Math.imul(v, re) | 0;
r = r + Math.imul(p, ae) | 0;
n = (n = n + Math.imul(p, se) | 0) + Math.imul(b, ae) | 0;
a = a + Math.imul(b, se) | 0;
var ke = (f + (r = r + Math.imul(u, ce) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, fe) | 0) + Math.imul(d, ce) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, fe) | 0) + (n >>> 13) | 0) + (ke >>> 26) | 0;
ke &= 67108863;
r = Math.imul(D, F);
n = (n = Math.imul(D, z)) + Math.imul(R, F) | 0;
a = Math.imul(R, z);
r = r + Math.imul(N, J) | 0;
n = (n = n + Math.imul(N, K) | 0) + Math.imul(T, J) | 0;
a = a + Math.imul(T, K) | 0;
r = r + Math.imul(C, V) | 0;
n = (n = n + Math.imul(C, G) | 0) + Math.imul(x, V) | 0;
a = a + Math.imul(x, G) | 0;
r = r + Math.imul(I, X) | 0;
n = (n = n + Math.imul(I, Z) | 0) + Math.imul(E, X) | 0;
a = a + Math.imul(E, Z) | 0;
r = r + Math.imul(k, $) | 0;
n = (n = n + Math.imul(k, ee) | 0) + Math.imul(M, $) | 0;
a = a + Math.imul(M, ee) | 0;
r = r + Math.imul(_, ie) | 0;
n = (n = n + Math.imul(_, re) | 0) + Math.imul(w, ie) | 0;
a = a + Math.imul(w, re) | 0;
r = r + Math.imul(m, ae) | 0;
n = (n = n + Math.imul(m, se) | 0) + Math.imul(v, ae) | 0;
a = a + Math.imul(v, se) | 0;
r = r + Math.imul(p, ce) | 0;
n = (n = n + Math.imul(p, fe) | 0) + Math.imul(b, ce) | 0;
a = a + Math.imul(b, fe) | 0;
var Me = (f + (r = r + Math.imul(u, ue) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, de) | 0) + Math.imul(d, ue) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, de) | 0) + (n >>> 13) | 0) + (Me >>> 26) | 0;
Me &= 67108863;
r = Math.imul(L, F);
n = (n = Math.imul(L, z)) + Math.imul(U, F) | 0;
a = Math.imul(U, z);
r = r + Math.imul(D, J) | 0;
n = (n = n + Math.imul(D, K) | 0) + Math.imul(R, J) | 0;
a = a + Math.imul(R, K) | 0;
r = r + Math.imul(N, V) | 0;
n = (n = n + Math.imul(N, G) | 0) + Math.imul(T, V) | 0;
a = a + Math.imul(T, G) | 0;
r = r + Math.imul(C, X) | 0;
n = (n = n + Math.imul(C, Z) | 0) + Math.imul(x, X) | 0;
a = a + Math.imul(x, Z) | 0;
r = r + Math.imul(I, $) | 0;
n = (n = n + Math.imul(I, ee) | 0) + Math.imul(E, $) | 0;
a = a + Math.imul(E, ee) | 0;
r = r + Math.imul(k, ie) | 0;
n = (n = n + Math.imul(k, re) | 0) + Math.imul(M, ie) | 0;
a = a + Math.imul(M, re) | 0;
r = r + Math.imul(_, ae) | 0;
n = (n = n + Math.imul(_, se) | 0) + Math.imul(w, ae) | 0;
a = a + Math.imul(w, se) | 0;
r = r + Math.imul(m, ce) | 0;
n = (n = n + Math.imul(m, fe) | 0) + Math.imul(v, ce) | 0;
a = a + Math.imul(v, fe) | 0;
r = r + Math.imul(p, ue) | 0;
n = (n = n + Math.imul(p, de) | 0) + Math.imul(b, ue) | 0;
a = a + Math.imul(b, de) | 0;
var Ae = (f + (r = r + Math.imul(u, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, be) | 0) + Math.imul(d, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, be) | 0) + (n >>> 13) | 0) + (Ae >>> 26) | 0;
Ae &= 67108863;
r = Math.imul(L, J);
n = (n = Math.imul(L, K)) + Math.imul(U, J) | 0;
a = Math.imul(U, K);
r = r + Math.imul(D, V) | 0;
n = (n = n + Math.imul(D, G) | 0) + Math.imul(R, V) | 0;
a = a + Math.imul(R, G) | 0;
r = r + Math.imul(N, X) | 0;
n = (n = n + Math.imul(N, Z) | 0) + Math.imul(T, X) | 0;
a = a + Math.imul(T, Z) | 0;
r = r + Math.imul(C, $) | 0;
n = (n = n + Math.imul(C, ee) | 0) + Math.imul(x, $) | 0;
a = a + Math.imul(x, ee) | 0;
r = r + Math.imul(I, ie) | 0;
n = (n = n + Math.imul(I, re) | 0) + Math.imul(E, ie) | 0;
a = a + Math.imul(E, re) | 0;
r = r + Math.imul(k, ae) | 0;
n = (n = n + Math.imul(k, se) | 0) + Math.imul(M, ae) | 0;
a = a + Math.imul(M, se) | 0;
r = r + Math.imul(_, ce) | 0;
n = (n = n + Math.imul(_, fe) | 0) + Math.imul(w, ce) | 0;
a = a + Math.imul(w, fe) | 0;
r = r + Math.imul(m, ue) | 0;
n = (n = n + Math.imul(m, de) | 0) + Math.imul(v, ue) | 0;
a = a + Math.imul(v, de) | 0;
var Ie = (f + (r = r + Math.imul(p, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(p, be) | 0) + Math.imul(b, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(b, be) | 0) + (n >>> 13) | 0) + (Ie >>> 26) | 0;
Ie &= 67108863;
r = Math.imul(L, V);
n = (n = Math.imul(L, G)) + Math.imul(U, V) | 0;
a = Math.imul(U, G);
r = r + Math.imul(D, X) | 0;
n = (n = n + Math.imul(D, Z) | 0) + Math.imul(R, X) | 0;
a = a + Math.imul(R, Z) | 0;
r = r + Math.imul(N, $) | 0;
n = (n = n + Math.imul(N, ee) | 0) + Math.imul(T, $) | 0;
a = a + Math.imul(T, ee) | 0;
r = r + Math.imul(C, ie) | 0;
n = (n = n + Math.imul(C, re) | 0) + Math.imul(x, ie) | 0;
a = a + Math.imul(x, re) | 0;
r = r + Math.imul(I, ae) | 0;
n = (n = n + Math.imul(I, se) | 0) + Math.imul(E, ae) | 0;
a = a + Math.imul(E, se) | 0;
r = r + Math.imul(k, ce) | 0;
n = (n = n + Math.imul(k, fe) | 0) + Math.imul(M, ce) | 0;
a = a + Math.imul(M, fe) | 0;
r = r + Math.imul(_, ue) | 0;
n = (n = n + Math.imul(_, de) | 0) + Math.imul(w, ue) | 0;
a = a + Math.imul(w, de) | 0;
var Ee = (f + (r = r + Math.imul(m, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(m, be) | 0) + Math.imul(v, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(v, be) | 0) + (n >>> 13) | 0) + (Ee >>> 26) | 0;
Ee &= 67108863;
r = Math.imul(L, X);
n = (n = Math.imul(L, Z)) + Math.imul(U, X) | 0;
a = Math.imul(U, Z);
r = r + Math.imul(D, $) | 0;
n = (n = n + Math.imul(D, ee) | 0) + Math.imul(R, $) | 0;
a = a + Math.imul(R, ee) | 0;
r = r + Math.imul(N, ie) | 0;
n = (n = n + Math.imul(N, re) | 0) + Math.imul(T, ie) | 0;
a = a + Math.imul(T, re) | 0;
r = r + Math.imul(C, ae) | 0;
n = (n = n + Math.imul(C, se) | 0) + Math.imul(x, ae) | 0;
a = a + Math.imul(x, se) | 0;
r = r + Math.imul(I, ce) | 0;
n = (n = n + Math.imul(I, fe) | 0) + Math.imul(E, ce) | 0;
a = a + Math.imul(E, fe) | 0;
r = r + Math.imul(k, ue) | 0;
n = (n = n + Math.imul(k, de) | 0) + Math.imul(M, ue) | 0;
a = a + Math.imul(M, de) | 0;
var Pe = (f + (r = r + Math.imul(_, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(_, be) | 0) + Math.imul(w, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(w, be) | 0) + (n >>> 13) | 0) + (Pe >>> 26) | 0;
Pe &= 67108863;
r = Math.imul(L, $);
n = (n = Math.imul(L, ee)) + Math.imul(U, $) | 0;
a = Math.imul(U, ee);
r = r + Math.imul(D, ie) | 0;
n = (n = n + Math.imul(D, re) | 0) + Math.imul(R, ie) | 0;
a = a + Math.imul(R, re) | 0;
r = r + Math.imul(N, ae) | 0;
n = (n = n + Math.imul(N, se) | 0) + Math.imul(T, ae) | 0;
a = a + Math.imul(T, se) | 0;
r = r + Math.imul(C, ce) | 0;
n = (n = n + Math.imul(C, fe) | 0) + Math.imul(x, ce) | 0;
a = a + Math.imul(x, fe) | 0;
r = r + Math.imul(I, ue) | 0;
n = (n = n + Math.imul(I, de) | 0) + Math.imul(E, ue) | 0;
a = a + Math.imul(E, de) | 0;
var Ce = (f + (r = r + Math.imul(k, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(k, be) | 0) + Math.imul(M, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(M, be) | 0) + (n >>> 13) | 0) + (Ce >>> 26) | 0;
Ce &= 67108863;
r = Math.imul(L, ie);
n = (n = Math.imul(L, re)) + Math.imul(U, ie) | 0;
a = Math.imul(U, re);
r = r + Math.imul(D, ae) | 0;
n = (n = n + Math.imul(D, se) | 0) + Math.imul(R, ae) | 0;
a = a + Math.imul(R, se) | 0;
r = r + Math.imul(N, ce) | 0;
n = (n = n + Math.imul(N, fe) | 0) + Math.imul(T, ce) | 0;
a = a + Math.imul(T, fe) | 0;
r = r + Math.imul(C, ue) | 0;
n = (n = n + Math.imul(C, de) | 0) + Math.imul(x, ue) | 0;
a = a + Math.imul(x, de) | 0;
var xe = (f + (r = r + Math.imul(I, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(I, be) | 0) + Math.imul(E, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(E, be) | 0) + (n >>> 13) | 0) + (xe >>> 26) | 0;
xe &= 67108863;
r = Math.imul(L, ae);
n = (n = Math.imul(L, se)) + Math.imul(U, ae) | 0;
a = Math.imul(U, se);
r = r + Math.imul(D, ce) | 0;
n = (n = n + Math.imul(D, fe) | 0) + Math.imul(R, ce) | 0;
a = a + Math.imul(R, fe) | 0;
r = r + Math.imul(N, ue) | 0;
n = (n = n + Math.imul(N, de) | 0) + Math.imul(T, ue) | 0;
a = a + Math.imul(T, de) | 0;
var Oe = (f + (r = r + Math.imul(C, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(C, be) | 0) + Math.imul(x, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(x, be) | 0) + (n >>> 13) | 0) + (Oe >>> 26) | 0;
Oe &= 67108863;
r = Math.imul(L, ce);
n = (n = Math.imul(L, fe)) + Math.imul(U, ce) | 0;
a = Math.imul(U, fe);
r = r + Math.imul(D, ue) | 0;
n = (n = n + Math.imul(D, de) | 0) + Math.imul(R, ue) | 0;
a = a + Math.imul(R, de) | 0;
var Ne = (f + (r = r + Math.imul(N, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(N, be) | 0) + Math.imul(T, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(T, be) | 0) + (n >>> 13) | 0) + (Ne >>> 26) | 0;
Ne &= 67108863;
r = Math.imul(L, ue);
n = (n = Math.imul(L, de)) + Math.imul(U, ue) | 0;
a = Math.imul(U, de);
var Te = (f + (r = r + Math.imul(D, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(D, be) | 0) + Math.imul(R, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(R, be) | 0) + (n >>> 13) | 0) + (Te >>> 26) | 0;
Te &= 67108863;
var je = (f + (r = Math.imul(L, pe)) | 0) + ((8191 & (n = (n = Math.imul(L, be)) + Math.imul(U, pe) | 0)) << 13) | 0;
f = ((a = Math.imul(U, be)) + (n >>> 13) | 0) + (je >>> 26) | 0;
je &= 67108863;
c[0] = ge;
c[1] = me;
c[2] = ve;
c[3] = ye;
c[4] = _e;
c[5] = we;
c[6] = Se;
c[7] = ke;
c[8] = Me;
c[9] = Ae;
c[10] = Ie;
c[11] = Ee;
c[12] = Pe;
c[13] = Ce;
c[14] = xe;
c[15] = Oe;
c[16] = Ne;
c[17] = Te;
c[18] = je;
if (0 !== f) {
c[19] = f;
i.length++;
}
return i;
};
Math.imul || (b = p);
function g(e, t, i) {
i.negative = t.negative ^ e.negative;
i.length = e.length + t.length;
for (var r = 0, n = 0, a = 0; a < i.length - 1; a++) {
var s = n;
n = 0;
for (var o = 67108863 & r, c = Math.min(a, t.length - 1), f = Math.max(0, a - e.length + 1); f <= c; f++) {
var h = a - f, u = (0 | e.words[h]) * (0 | t.words[f]), d = 67108863 & u;
o = 67108863 & (d = d + o | 0);
n += (s = (s = s + (u / 67108864 | 0) | 0) + (d >>> 26) | 0) >>> 26;
s &= 67108863;
}
i.words[a] = o;
r = s;
s = n;
}
0 !== r ? i.words[a] = r : i.length--;
return i.strip();
}
function m(e, t, i) {
return new v().mulp(e, t, i);
}
a.prototype.mulTo = function(e, t) {
var i = this.length + e.length;
return 10 === this.length && 10 === e.length ? b(this, e, t) : i < 63 ? p(this, e, t) : i < 1024 ? g(this, e, t) : m(this, e, t);
};
function v(e, t) {
this.x = e;
this.y = t;
}
v.prototype.makeRBT = function(e) {
for (var t = new Array(e), i = a.prototype._countBits(e) - 1, r = 0; r < e; r++) t[r] = this.revBin(r, i, e);
return t;
};
v.prototype.revBin = function(e, t, i) {
if (0 === e || e === i - 1) return e;
for (var r = 0, n = 0; n < t; n++) {
r |= (1 & e) << t - n - 1;
e >>= 1;
}
return r;
};
v.prototype.permute = function(e, t, i, r, n, a) {
for (var s = 0; s < a; s++) {
r[s] = t[e[s]];
n[s] = i[e[s]];
}
};
v.prototype.transform = function(e, t, i, r, n, a) {
this.permute(a, e, t, i, r, n);
for (var s = 1; s < n; s <<= 1) for (var o = s << 1, c = Math.cos(2 * Math.PI / o), f = Math.sin(2 * Math.PI / o), h = 0; h < n; h += o) for (var u = c, d = f, l = 0; l < s; l++) {
var p = i[h + l], b = r[h + l], g = i[h + l + s], m = r[h + l + s], v = u * g - d * m;
m = u * m + d * g;
g = v;
i[h + l] = p + g;
r[h + l] = b + m;
i[h + l + s] = p - g;
r[h + l + s] = b - m;
if (l !== o) {
v = c * u - f * d;
d = c * d + f * u;
u = v;
}
}
};
v.prototype.guessLen13b = function(e, t) {
var i = 1 | Math.max(t, e), r = 1 & i, n = 0;
for (i = i / 2 | 0; i; i >>>= 1) n++;
return 1 << n + 1 + r;
};
v.prototype.conjugate = function(e, t, i) {
if (!(i <= 1)) for (var r = 0; r < i / 2; r++) {
var n = e[r];
e[r] = e[i - r - 1];
e[i - r - 1] = n;
n = t[r];
t[r] = -t[i - r - 1];
t[i - r - 1] = -n;
}
};
v.prototype.normalize13b = function(e, t) {
for (var i = 0, r = 0; r < t / 2; r++) {
var n = 8192 * Math.round(e[2 * r + 1] / t) + Math.round(e[2 * r] / t) + i;
e[r] = 67108863 & n;
i = n < 67108864 ? 0 : n / 67108864 | 0;
}
return e;
};
v.prototype.convert13b = function(e, t, i, n) {
for (var a = 0, s = 0; s < t; s++) {
a += 0 | e[s];
i[2 * s] = 8191 & a;
a >>>= 13;
i[2 * s + 1] = 8191 & a;
a >>>= 13;
}
for (s = 2 * t; s < n; ++s) i[s] = 0;
r(0 === a);
r(0 == (-8192 & a));
};
v.prototype.stub = function(e) {
for (var t = new Array(e), i = 0; i < e; i++) t[i] = 0;
return t;
};
v.prototype.mulp = function(e, t, i) {
var r = 2 * this.guessLen13b(e.length, t.length), n = this.makeRBT(r), a = this.stub(r), s = new Array(r), o = new Array(r), c = new Array(r), f = new Array(r), h = new Array(r), u = new Array(r), d = i.words;
d.length = r;
this.convert13b(e.words, e.length, s, r);
this.convert13b(t.words, t.length, f, r);
this.transform(s, a, o, c, r, n);
this.transform(f, a, h, u, r, n);
for (var l = 0; l < r; l++) {
var p = o[l] * h[l] - c[l] * u[l];
c[l] = o[l] * u[l] + c[l] * h[l];
o[l] = p;
}
this.conjugate(o, c, r);
this.transform(o, c, d, a, r, n);
this.conjugate(d, a, r);
this.normalize13b(d, r);
i.negative = e.negative ^ t.negative;
i.length = e.length + t.length;
return i.strip();
};
a.prototype.mul = function(e) {
var t = new a(null);
t.words = new Array(this.length + e.length);
return this.mulTo(e, t);
};
a.prototype.mulf = function(e) {
var t = new a(null);
t.words = new Array(this.length + e.length);
return m(this, e, t);
};
a.prototype.imul = function(e) {
return this.clone().mulTo(e, this);
};
a.prototype.imuln = function(e) {
r("number" == typeof e);
r(e < 67108864);
for (var t = 0, i = 0; i < this.length; i++) {
var n = (0 | this.words[i]) * e, a = (67108863 & n) + (67108863 & t);
t >>= 26;
t += n / 67108864 | 0;
t += a >>> 26;
this.words[i] = 67108863 & a;
}
if (0 !== t) {
this.words[i] = t;
this.length++;
}
return this;
};
a.prototype.muln = function(e) {
return this.clone().imuln(e);
};
a.prototype.sqr = function() {
return this.mul(this);
};
a.prototype.isqr = function() {
return this.imul(this.clone());
};
a.prototype.pow = function(e) {
var t = l(e);
if (0 === t.length) return new a(1);
for (var i = this, r = 0; r < t.length && 0 === t[r]; r++, i = i.sqr()) ;
if (++r < t.length) for (var n = i.sqr(); r < t.length; r++, n = n.sqr()) 0 !== t[r] && (i = i.mul(n));
return i;
};
a.prototype.iushln = function(e) {
r("number" == typeof e && e >= 0);
var t, i = e % 26, n = (e - i) / 26, a = 67108863 >>> 26 - i << 26 - i;
if (0 !== i) {
var s = 0;
for (t = 0; t < this.length; t++) {
var o = this.words[t] & a, c = (0 | this.words[t]) - o << i;
this.words[t] = c | s;
s = o >>> 26 - i;
}
if (s) {
this.words[t] = s;
this.length++;
}
}
if (0 !== n) {
for (t = this.length - 1; t >= 0; t--) this.words[t + n] = this.words[t];
for (t = 0; t < n; t++) this.words[t] = 0;
this.length += n;
}
return this.strip();
};
a.prototype.ishln = function(e) {
r(0 === this.negative);
return this.iushln(e);
};
a.prototype.iushrn = function(e, t, i) {
r("number" == typeof e && e >= 0);
var n;
n = t ? (t - t % 26) / 26 : 0;
var a = e % 26, s = Math.min((e - a) / 26, this.length), o = 67108863 ^ 67108863 >>> a << a, c = i;
n -= s;
n = Math.max(0, n);
if (c) {
for (var f = 0; f < s; f++) c.words[f] = this.words[f];
c.length = s;
}
if (0 === s) ; else if (this.length > s) {
this.length -= s;
for (f = 0; f < this.length; f++) this.words[f] = this.words[f + s];
} else {
this.words[0] = 0;
this.length = 1;
}
var h = 0;
for (f = this.length - 1; f >= 0 && (0 !== h || f >= n); f--) {
var u = 0 | this.words[f];
this.words[f] = h << 26 - a | u >>> a;
h = u & o;
}
c && 0 !== h && (c.words[c.length++] = h);
if (0 === this.length) {
this.words[0] = 0;
this.length = 1;
}
return this.strip();
};
a.prototype.ishrn = function(e, t, i) {
r(0 === this.negative);
return this.iushrn(e, t, i);
};
a.prototype.shln = function(e) {
return this.clone().ishln(e);
};
a.prototype.ushln = function(e) {
return this.clone().iushln(e);
};
a.prototype.shrn = function(e) {
return this.clone().ishrn(e);
};
a.prototype.ushrn = function(e) {
return this.clone().iushrn(e);
};
a.prototype.testn = function(e) {
r("number" == typeof e && e >= 0);
var t = e % 26, i = (e - t) / 26, n = 1 << t;
return !(this.length <= i || !(this.words[i] & n));
};
a.prototype.imaskn = function(e) {
r("number" == typeof e && e >= 0);
var t = e % 26, i = (e - t) / 26;
r(0 === this.negative, "imaskn works only with positive numbers");
if (this.length <= i) return this;
0 !== t && i++;
this.length = Math.min(i, this.length);
if (0 !== t) {
var n = 67108863 ^ 67108863 >>> t << t;
this.words[this.length - 1] &= n;
}
return this.strip();
};
a.prototype.maskn = function(e) {
return this.clone().imaskn(e);
};
a.prototype.iaddn = function(e) {
r("number" == typeof e);
r(e < 67108864);
if (e < 0) return this.isubn(-e);
if (0 !== this.negative) {
if (1 === this.length && (0 | this.words[0]) < e) {
this.words[0] = e - (0 | this.words[0]);
this.negative = 0;
return this;
}
this.negative = 0;
this.isubn(e);
this.negative = 1;
return this;
}
return this._iaddn(e);
};
a.prototype._iaddn = function(e) {
this.words[0] += e;
for (var t = 0; t < this.length && this.words[t] >= 67108864; t++) {
this.words[t] -= 67108864;
t === this.length - 1 ? this.words[t + 1] = 1 : this.words[t + 1]++;
}
this.length = Math.max(this.length, t + 1);
return this;
};
a.prototype.isubn = function(e) {
r("number" == typeof e);
r(e < 67108864);
if (e < 0) return this.iaddn(-e);
if (0 !== this.negative) {
this.negative = 0;
this.iaddn(e);
this.negative = 1;
return this;
}
this.words[0] -= e;
if (1 === this.length && this.words[0] < 0) {
this.words[0] = -this.words[0];
this.negative = 1;
} else for (var t = 0; t < this.length && this.words[t] < 0; t++) {
this.words[t] += 67108864;
this.words[t + 1] -= 1;
}
return this.strip();
};
a.prototype.addn = function(e) {
return this.clone().iaddn(e);
};
a.prototype.subn = function(e) {
return this.clone().isubn(e);
};
a.prototype.iabs = function() {
this.negative = 0;
return this;
};
a.prototype.abs = function() {
return this.clone().iabs();
};
a.prototype._ishlnsubmul = function(e, t, i) {
var n, a, s = e.length + i;
this._expand(s);
var o = 0;
for (n = 0; n < e.length; n++) {
a = (0 | this.words[n + i]) + o;
var c = (0 | e.words[n]) * t;
o = ((a -= 67108863 & c) >> 26) - (c / 67108864 | 0);
this.words[n + i] = 67108863 & a;
}
for (;n < this.length - i; n++) {
o = (a = (0 | this.words[n + i]) + o) >> 26;
this.words[n + i] = 67108863 & a;
}
if (0 === o) return this.strip();
r(-1 === o);
o = 0;
for (n = 0; n < this.length; n++) {
o = (a = -(0 | this.words[n]) + o) >> 26;
this.words[n] = 67108863 & a;
}
this.negative = 1;
return this.strip();
};
a.prototype._wordDiv = function(e, t) {
var i = (this.length, e.length), r = this.clone(), n = e, s = 0 | n.words[n.length - 1];
if (0 != (i = 26 - this._countBits(s))) {
n = n.ushln(i);
r.iushln(i);
s = 0 | n.words[n.length - 1];
}
var o, c = r.length - n.length;
if ("mod" !== t) {
(o = new a(null)).length = c + 1;
o.words = new Array(o.length);
for (var f = 0; f < o.length; f++) o.words[f] = 0;
}
var h = r.clone()._ishlnsubmul(n, 1, c);
if (0 === h.negative) {
r = h;
o && (o.words[c] = 1);
}
for (var u = c - 1; u >= 0; u--) {
var d = 67108864 * (0 | r.words[n.length + u]) + (0 | r.words[n.length + u - 1]);
d = Math.min(d / s | 0, 67108863);
r._ishlnsubmul(n, d, u);
for (;0 !== r.negative; ) {
d--;
r.negative = 0;
r._ishlnsubmul(n, 1, u);
r.isZero() || (r.negative ^= 1);
}
o && (o.words[u] = d);
}
o && o.strip();
r.strip();
"div" !== t && 0 !== i && r.iushrn(i);
return {
div: o || null,
mod: r
};
};
a.prototype.divmod = function(e, t, i) {
r(!e.isZero());
if (this.isZero()) return {
div: new a(0),
mod: new a(0)
};
var n, s, o;
if (0 !== this.negative && 0 === e.negative) {
o = this.neg().divmod(e, t);
"mod" !== t && (n = o.div.neg());
if ("div" !== t) {
s = o.mod.neg();
i && 0 !== s.negative && s.iadd(e);
}
return {
div: n,
mod: s
};
}
if (0 === this.negative && 0 !== e.negative) {
o = this.divmod(e.neg(), t);
"mod" !== t && (n = o.div.neg());
return {
div: n,
mod: o.mod
};
}
if (0 != (this.negative & e.negative)) {
o = this.neg().divmod(e.neg(), t);
if ("div" !== t) {
s = o.mod.neg();
i && 0 !== s.negative && s.isub(e);
}
return {
div: o.div,
mod: s
};
}
return e.length > this.length || this.cmp(e) < 0 ? {
div: new a(0),
mod: this
} : 1 === e.length ? "div" === t ? {
div: this.divn(e.words[0]),
mod: null
} : "mod" === t ? {
div: null,
mod: new a(this.modn(e.words[0]))
} : {
div: this.divn(e.words[0]),
mod: new a(this.modn(e.words[0]))
} : this._wordDiv(e, t);
};
a.prototype.div = function(e) {
return this.divmod(e, "div", !1).div;
};
a.prototype.mod = function(e) {
return this.divmod(e, "mod", !1).mod;
};
a.prototype.umod = function(e) {
return this.divmod(e, "mod", !0).mod;
};
a.prototype.divRound = function(e) {
var t = this.divmod(e);
if (t.mod.isZero()) return t.div;
var i = 0 !== t.div.negative ? t.mod.isub(e) : t.mod, r = e.ushrn(1), n = e.andln(1), a = i.cmp(r);
return a < 0 || 1 === n && 0 === a ? t.div : 0 !== t.div.negative ? t.div.isubn(1) : t.div.iaddn(1);
};
a.prototype.modn = function(e) {
r(e <= 67108863);
for (var t = (1 << 26) % e, i = 0, n = this.length - 1; n >= 0; n--) i = (t * i + (0 | this.words[n])) % e;
return i;
};
a.prototype.idivn = function(e) {
r(e <= 67108863);
for (var t = 0, i = this.length - 1; i >= 0; i--) {
var n = (0 | this.words[i]) + 67108864 * t;
this.words[i] = n / e | 0;
t = n % e;
}
return this.strip();
};
a.prototype.divn = function(e) {
return this.clone().idivn(e);
};
a.prototype.egcd = function(e) {
r(0 === e.negative);
r(!e.isZero());
var t = this, i = e.clone();
t = 0 !== t.negative ? t.umod(e) : t.clone();
for (var n = new a(1), s = new a(0), o = new a(0), c = new a(1), f = 0; t.isEven() && i.isEven(); ) {
t.iushrn(1);
i.iushrn(1);
++f;
}
for (var h = i.clone(), u = t.clone(); !t.isZero(); ) {
for (var d = 0, l = 1; 0 == (t.words[0] & l) && d < 26; ++d, l <<= 1) ;
if (d > 0) {
t.iushrn(d);
for (;d-- > 0; ) {
if (n.isOdd() || s.isOdd()) {
n.iadd(h);
s.isub(u);
}
n.iushrn(1);
s.iushrn(1);
}
}
for (var p = 0, b = 1; 0 == (i.words[0] & b) && p < 26; ++p, b <<= 1) ;
if (p > 0) {
i.iushrn(p);
for (;p-- > 0; ) {
if (o.isOdd() || c.isOdd()) {
o.iadd(h);
c.isub(u);
}
o.iushrn(1);
c.iushrn(1);
}
}
if (t.cmp(i) >= 0) {
t.isub(i);
n.isub(o);
s.isub(c);
} else {
i.isub(t);
o.isub(n);
c.isub(s);
}
}
return {
a: o,
b: c,
gcd: i.iushln(f)
};
};
a.prototype._invmp = function(e) {
r(0 === e.negative);
r(!e.isZero());
var t = this, i = e.clone();
t = 0 !== t.negative ? t.umod(e) : t.clone();
for (var n, s = new a(1), o = new a(0), c = i.clone(); t.cmpn(1) > 0 && i.cmpn(1) > 0; ) {
for (var f = 0, h = 1; 0 == (t.words[0] & h) && f < 26; ++f, h <<= 1) ;
if (f > 0) {
t.iushrn(f);
for (;f-- > 0; ) {
s.isOdd() && s.iadd(c);
s.iushrn(1);
}
}
for (var u = 0, d = 1; 0 == (i.words[0] & d) && u < 26; ++u, d <<= 1) ;
if (u > 0) {
i.iushrn(u);
for (;u-- > 0; ) {
o.isOdd() && o.iadd(c);
o.iushrn(1);
}
}
if (t.cmp(i) >= 0) {
t.isub(i);
s.isub(o);
} else {
i.isub(t);
o.isub(s);
}
}
(n = 0 === t.cmpn(1) ? s : o).cmpn(0) < 0 && n.iadd(e);
return n;
};
a.prototype.gcd = function(e) {
if (this.isZero()) return e.abs();
if (e.isZero()) return this.abs();
var t = this.clone(), i = e.clone();
t.negative = 0;
i.negative = 0;
for (var r = 0; t.isEven() && i.isEven(); r++) {
t.iushrn(1);
i.iushrn(1);
}
for (;;) {
for (;t.isEven(); ) t.iushrn(1);
for (;i.isEven(); ) i.iushrn(1);
var n = t.cmp(i);
if (n < 0) {
var a = t;
t = i;
i = a;
} else if (0 === n || 0 === i.cmpn(1)) break;
t.isub(i);
}
return i.iushln(r);
};
a.prototype.invm = function(e) {
return this.egcd(e).a.umod(e);
};
a.prototype.isEven = function() {
return 0 == (1 & this.words[0]);
};
a.prototype.isOdd = function() {
return 1 == (1 & this.words[0]);
};
a.prototype.andln = function(e) {
return this.words[0] & e;
};
a.prototype.bincn = function(e) {
r("number" == typeof e);
var t = e % 26, i = (e - t) / 26, n = 1 << t;
if (this.length <= i) {
this._expand(i + 1);
this.words[i] |= n;
return this;
}
for (var a = n, s = i; 0 !== a && s < this.length; s++) {
var o = 0 | this.words[s];
a = (o += a) >>> 26;
o &= 67108863;
this.words[s] = o;
}
if (0 !== a) {
this.words[s] = a;
this.length++;
}
return this;
};
a.prototype.isZero = function() {
return 1 === this.length && 0 === this.words[0];
};
a.prototype.cmpn = function(e) {
var t, i = e < 0;
if (0 !== this.negative && !i) return -1;
if (0 === this.negative && i) return 1;
this.strip();
if (this.length > 1) t = 1; else {
i && (e = -e);
r(e <= 67108863, "Number is too big");
var n = 0 | this.words[0];
t = n === e ? 0 : n < e ? -1 : 1;
}
return 0 !== this.negative ? 0 | -t : t;
};
a.prototype.cmp = function(e) {
if (0 !== this.negative && 0 === e.negative) return -1;
if (0 === this.negative && 0 !== e.negative) return 1;
var t = this.ucmp(e);
return 0 !== this.negative ? 0 | -t : t;
};
a.prototype.ucmp = function(e) {
if (this.length > e.length) return 1;
if (this.length < e.length) return -1;
for (var t = 0, i = this.length - 1; i >= 0; i--) {
var r = 0 | this.words[i], n = 0 | e.words[i];
if (r !== n) {
r < n ? t = -1 : r > n && (t = 1);
break;
}
}
return t;
};
a.prototype.gtn = function(e) {
return 1 === this.cmpn(e);
};
a.prototype.gt = function(e) {
return 1 === this.cmp(e);
};
a.prototype.gten = function(e) {
return this.cmpn(e) >= 0;
};
a.prototype.gte = function(e) {
return this.cmp(e) >= 0;
};
a.prototype.ltn = function(e) {
return -1 === this.cmpn(e);
};
a.prototype.lt = function(e) {
return -1 === this.cmp(e);
};
a.prototype.lten = function(e) {
return this.cmpn(e) <= 0;
};
a.prototype.lte = function(e) {
return this.cmp(e) <= 0;
};
a.prototype.eqn = function(e) {
return 0 === this.cmpn(e);
};
a.prototype.eq = function(e) {
return 0 === this.cmp(e);
};
a.red = function(e) {
return new A(e);
};
a.prototype.toRed = function(e) {
r(!this.red, "Already a number in reduction context");
r(0 === this.negative, "red works only with positives");
return e.convertTo(this)._forceRed(e);
};
a.prototype.fromRed = function() {
r(this.red, "fromRed works only with numbers in reduction context");
return this.red.convertFrom(this);
};
a.prototype._forceRed = function(e) {
this.red = e;
return this;
};
a.prototype.forceRed = function(e) {
r(!this.red, "Already a number in reduction context");
return this._forceRed(e);
};
a.prototype.redAdd = function(e) {
r(this.red, "redAdd works only with red numbers");
return this.red.add(this, e);
};
a.prototype.redIAdd = function(e) {
r(this.red, "redIAdd works only with red numbers");
return this.red.iadd(this, e);
};
a.prototype.redSub = function(e) {
r(this.red, "redSub works only with red numbers");
return this.red.sub(this, e);
};
a.prototype.redISub = function(e) {
r(this.red, "redISub works only with red numbers");
return this.red.isub(this, e);
};
a.prototype.redShl = function(e) {
r(this.red, "redShl works only with red numbers");
return this.red.shl(this, e);
};
a.prototype.redMul = function(e) {
r(this.red, "redMul works only with red numbers");
this.red._verify2(this, e);
return this.red.mul(this, e);
};
a.prototype.redIMul = function(e) {
r(this.red, "redMul works only with red numbers");
this.red._verify2(this, e);
return this.red.imul(this, e);
};
a.prototype.redSqr = function() {
r(this.red, "redSqr works only with red numbers");
this.red._verify1(this);
return this.red.sqr(this);
};
a.prototype.redISqr = function() {
r(this.red, "redISqr works only with red numbers");
this.red._verify1(this);
return this.red.isqr(this);
};
a.prototype.redSqrt = function() {
r(this.red, "redSqrt works only with red numbers");
this.red._verify1(this);
return this.red.sqrt(this);
};
a.prototype.redInvm = function() {
r(this.red, "redInvm works only with red numbers");
this.red._verify1(this);
return this.red.invm(this);
};
a.prototype.redNeg = function() {
r(this.red, "redNeg works only with red numbers");
this.red._verify1(this);
return this.red.neg(this);
};
a.prototype.redPow = function(e) {
r(this.red && !e.red, "redPow(normalNum)");
this.red._verify1(this);
return this.red.pow(this, e);
};
var y = {
k256: null,
p224: null,
p192: null,
p25519: null
};
function _(e, t) {
this.name = e;
this.p = new a(t, 16);
this.n = this.p.bitLength();
this.k = new a(1).iushln(this.n).isub(this.p);
this.tmp = this._tmp();
}
_.prototype._tmp = function() {
var e = new a(null);
e.words = new Array(Math.ceil(this.n / 13));
return e;
};
_.prototype.ireduce = function(e) {
var t, i = e;
do {
this.split(i, this.tmp);
t = (i = (i = this.imulK(i)).iadd(this.tmp)).bitLength();
} while (t > this.n);
var r = t < this.n ? -1 : i.ucmp(this.p);
if (0 === r) {
i.words[0] = 0;
i.length = 1;
} else r > 0 ? i.isub(this.p) : void 0 !== i.strip ? i.strip() : i._strip();
return i;
};
_.prototype.split = function(e, t) {
e.iushrn(this.n, 0, t);
};
_.prototype.imulK = function(e) {
return e.imul(this.k);
};
function w() {
_.call(this, "k256", "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f");
}
n(w, _);
w.prototype.split = function(e, t) {
for (var i = Math.min(e.length, 9), r = 0; r < i; r++) t.words[r] = e.words[r];
t.length = i;
if (e.length <= 9) {
e.words[0] = 0;
e.length = 1;
} else {
var n = e.words[9];
t.words[t.length++] = 4194303 & n;
for (r = 10; r < e.length; r++) {
var a = 0 | e.words[r];
e.words[r - 10] = (4194303 & a) << 4 | n >>> 22;
n = a;
}
n >>>= 22;
e.words[r - 10] = n;
0 === n && e.length > 10 ? e.length -= 10 : e.length -= 9;
}
};
w.prototype.imulK = function(e) {
e.words[e.length] = 0;
e.words[e.length + 1] = 0;
e.length += 2;
for (var t = 0, i = 0; i < e.length; i++) {
var r = 0 | e.words[i];
t += 977 * r;
e.words[i] = 67108863 & t;
t = 64 * r + (t / 67108864 | 0);
}
if (0 === e.words[e.length - 1]) {
e.length--;
0 === e.words[e.length - 1] && e.length--;
}
return e;
};
function S() {
_.call(this, "p224", "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001");
}
n(S, _);
function k() {
_.call(this, "p192", "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff");
}
n(k, _);
function M() {
_.call(this, "25519", "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed");
}
n(M, _);
M.prototype.imulK = function(e) {
for (var t = 0, i = 0; i < e.length; i++) {
var r = 19 * (0 | e.words[i]) + t, n = 67108863 & r;
r >>>= 26;
e.words[i] = n;
t = r;
}
0 !== t && (e.words[e.length++] = t);
return e;
};
a._prime = function(e) {
if (y[e]) return y[e];
var t;
if ("k256" === e) t = new w(); else if ("p224" === e) t = new S(); else if ("p192" === e) t = new k(); else {
if ("p25519" !== e) throw new Error("Unknown prime " + e);
t = new M();
}
y[e] = t;
return t;
};
function A(e) {
if ("string" == typeof e) {
var t = a._prime(e);
this.m = t.p;
this.prime = t;
} else {
r(e.gtn(1), "modulus must be greater than 1");
this.m = e;
this.prime = null;
}
}
A.prototype._verify1 = function(e) {
r(0 === e.negative, "red works only with positives");
r(e.red, "red works only with red numbers");
};
A.prototype._verify2 = function(e, t) {
r(0 == (e.negative | t.negative), "red works only with positives");
r(e.red && e.red === t.red, "red works only with red numbers");
};
A.prototype.imod = function(e) {
return this.prime ? this.prime.ireduce(e)._forceRed(this) : e.umod(this.m)._forceRed(this);
};
A.prototype.neg = function(e) {
return e.isZero() ? e.clone() : this.m.sub(e)._forceRed(this);
};
A.prototype.add = function(e, t) {
this._verify2(e, t);
var i = e.add(t);
i.cmp(this.m) >= 0 && i.isub(this.m);
return i._forceRed(this);
};
A.prototype.iadd = function(e, t) {
this._verify2(e, t);
var i = e.iadd(t);
i.cmp(this.m) >= 0 && i.isub(this.m);
return i;
};
A.prototype.sub = function(e, t) {
this._verify2(e, t);
var i = e.sub(t);
i.cmpn(0) < 0 && i.iadd(this.m);
return i._forceRed(this);
};
A.prototype.isub = function(e, t) {
this._verify2(e, t);
var i = e.isub(t);
i.cmpn(0) < 0 && i.iadd(this.m);
return i;
};
A.prototype.shl = function(e, t) {
this._verify1(e);
return this.imod(e.ushln(t));
};
A.prototype.imul = function(e, t) {
this._verify2(e, t);
return this.imod(e.imul(t));
};
A.prototype.mul = function(e, t) {
this._verify2(e, t);
return this.imod(e.mul(t));
};
A.prototype.isqr = function(e) {
return this.imul(e, e.clone());
};
A.prototype.sqr = function(e) {
return this.mul(e, e);
};
A.prototype.sqrt = function(e) {
if (e.isZero()) return e.clone();
var t = this.m.andln(3);
r(t % 2 == 1);
if (3 === t) {
var i = this.m.add(new a(1)).iushrn(2);
return this.pow(e, i);
}
for (var n = this.m.subn(1), s = 0; !n.isZero() && 0 === n.andln(1); ) {
s++;
n.iushrn(1);
}
r(!n.isZero());
var o = new a(1).toRed(this), c = o.redNeg(), f = this.m.subn(1).iushrn(1), h = this.m.bitLength();
h = new a(2 * h * h).toRed(this);
for (;0 !== this.pow(h, f).cmp(c); ) h.redIAdd(c);
for (var u = this.pow(h, n), d = this.pow(e, n.addn(1).iushrn(1)), l = this.pow(e, n), p = s; 0 !== l.cmp(o); ) {
for (var b = l, g = 0; 0 !== b.cmp(o); g++) b = b.redSqr();
r(g < p);
var m = this.pow(u, new a(1).iushln(p - g - 1));
d = d.redMul(m);
u = m.redSqr();
l = l.redMul(u);
p = g;
}
return d;
};
A.prototype.invm = function(e) {
var t = e._invmp(this.m);
if (0 !== t.negative) {
t.negative = 0;
return this.imod(t).redNeg();
}
return this.imod(t);
};
A.prototype.pow = function(e, t) {
if (t.isZero()) return new a(1).toRed(this);
if (0 === t.cmpn(1)) return e.clone();
var i = new Array(16);
i[0] = new a(1).toRed(this);
i[1] = e;
for (var r = 2; r < i.length; r++) i[r] = this.mul(i[r - 1], e);
var n = i[0], s = 0, o = 0, c = t.bitLength() % 26;
0 === c && (c = 26);
for (r = t.length - 1; r >= 0; r--) {
for (var f = t.words[r], h = c - 1; h >= 0; h--) {
var u = f >> h & 1;
n !== i[0] && (n = this.sqr(n));
if (0 !== u || 0 !== s) {
s <<= 1;
s |= u;
if (4 == ++o || 0 === r && 0 === h) {
n = this.mul(n, i[s]);
o = 0;
s = 0;
}
} else o = 0;
}
c = 26;
}
return n;
};
A.prototype.convertTo = function(e) {
var t = e.umod(this.m);
return t === e ? t.clone() : t;
};
A.prototype.convertFrom = function(e) {
var t = e.clone();
t.red = null;
return t;
};
a.mont = function(e) {
return new I(e);
};
function I(e) {
A.call(this, e);
this.shift = this.m.bitLength();
this.shift % 26 != 0 && (this.shift += 26 - this.shift % 26);
this.r = new a(1).iushln(this.shift);
this.r2 = this.imod(this.r.sqr());
this.rinv = this.r._invmp(this.m);
this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
this.minv = this.minv.umod(this.r);
this.minv = this.r.sub(this.minv);
}
n(I, A);
I.prototype.convertTo = function(e) {
return this.imod(e.ushln(this.shift));
};
I.prototype.convertFrom = function(e) {
var t = this.imod(e.mul(this.rinv));
t.red = null;
return t;
};
I.prototype.imul = function(e, t) {
if (e.isZero() || t.isZero()) {
e.words[0] = 0;
e.length = 1;
return e;
}
var i = e.imul(t), r = i.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m), n = i.isub(r).iushrn(this.shift), a = n;
n.cmp(this.m) >= 0 ? a = n.isub(this.m) : n.cmpn(0) < 0 && (a = n.iadd(this.m));
return a._forceRed(this);
};
I.prototype.mul = function(e, t) {
if (e.isZero() || t.isZero()) return new a(0)._forceRed(this);
var i = e.mul(t), r = i.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m), n = i.isub(r).iushrn(this.shift), s = n;
n.cmp(this.m) >= 0 ? s = n.isub(this.m) : n.cmpn(0) < 0 && (s = n.iadd(this.m));
return s._forceRed(this);
};
I.prototype.invm = function(e) {
return this.imod(e._invmp(this.m).mul(this.r2))._forceRed(this);
};
})("undefined" == typeof t || t, this);
}, {
buffer: 19
} ],
16: [ function(e, t, i) {
"use strict";
i.byteLength = function(e) {
var t = f(e), i = t[0], r = t[1];
return 3 * (i + r) / 4 - r;
};
i.toByteArray = function(e) {
var t, i, r = f(e), s = r[0], o = r[1], c = new a(h(0, s, o)), u = 0, d = o > 0 ? s - 4 : s;
for (i = 0; i < d; i += 4) {
t = n[e.charCodeAt(i)] << 18 | n[e.charCodeAt(i + 1)] << 12 | n[e.charCodeAt(i + 2)] << 6 | n[e.charCodeAt(i + 3)];
c[u++] = t >> 16 & 255;
c[u++] = t >> 8 & 255;
c[u++] = 255 & t;
}
if (2 === o) {
t = n[e.charCodeAt(i)] << 2 | n[e.charCodeAt(i + 1)] >> 4;
c[u++] = 255 & t;
}
if (1 === o) {
t = n[e.charCodeAt(i)] << 10 | n[e.charCodeAt(i + 1)] << 4 | n[e.charCodeAt(i + 2)] >> 2;
c[u++] = t >> 8 & 255;
c[u++] = 255 & t;
}
return c;
};
i.fromByteArray = function(e) {
for (var t, i = e.length, n = i % 3, a = [], s = 0, o = i - n; s < o; s += 16383) a.push(u(e, s, s + 16383 > o ? o : s + 16383));
if (1 === n) {
t = e[i - 1];
a.push(r[t >> 2] + r[t << 4 & 63] + "==");
} else if (2 === n) {
t = (e[i - 2] << 8) + e[i - 1];
a.push(r[t >> 10] + r[t >> 4 & 63] + r[t << 2 & 63] + "=");
}
return a.join("");
};
for (var r = [], n = [], a = "undefined" != typeof Uint8Array ? Uint8Array : Array, s = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", o = 0, c = s.length; o < c; ++o) {
r[o] = s[o];
n[s.charCodeAt(o)] = o;
}
n["-".charCodeAt(0)] = 62;
n["_".charCodeAt(0)] = 63;
function f(e) {
var t = e.length;
if (t % 4 > 0) throw new Error("Invalid string. Length must be a multiple of 4");
var i = e.indexOf("=");
-1 === i && (i = t);
return [ i, i === t ? 0 : 4 - i % 4 ];
}
function h(e, t, i) {
return 3 * (t + i) / 4 - i;
}
function u(e, t, i) {
for (var n, a, s = [], o = t; o < i; o += 3) {
n = (e[o] << 16 & 16711680) + (e[o + 1] << 8 & 65280) + (255 & e[o + 2]);
s.push(r[(a = n) >> 18 & 63] + r[a >> 12 & 63] + r[a >> 6 & 63] + r[63 & a]);
}
return s.join("");
}
}, {} ],
17: [ function(e, t) {
(function(t, i) {
"use strict";
function r(e, t) {
if (!e) throw new Error(t || "Assertion failed");
}
function n(e, t) {
e.super_ = t;
var i = function() {};
i.prototype = t.prototype;
e.prototype = new i();
e.prototype.constructor = e;
}
function a(e, t, i) {
if (a.isBN(e)) return e;
this.negative = 0;
this.words = null;
this.length = 0;
this.red = null;
if (null !== e) {
if ("le" === t || "be" === t) {
i = t;
t = 10;
}
this._init(e || 0, t || 10, i || "be");
}
}
"object" == typeof t ? t.exports = a : i.BN = a;
a.BN = a;
a.wordSize = 26;
var s;
try {
s = "undefined" != typeof window && "undefined" != typeof window.Buffer ? window.Buffer : e("buffer").Buffer;
} catch (e) {}
a.isBN = function(e) {
return e instanceof a || null !== e && "object" == typeof e && e.constructor.wordSize === a.wordSize && Array.isArray(e.words);
};
a.max = function(e, t) {
return e.cmp(t) > 0 ? e : t;
};
a.min = function(e, t) {
return e.cmp(t) < 0 ? e : t;
};
a.prototype._init = function(e, t, i) {
if ("number" == typeof e) return this._initNumber(e, t, i);
if ("object" == typeof e) return this._initArray(e, t, i);
"hex" === t && (t = 16);
r(t === (0 | t) && t >= 2 && t <= 36);
var n = 0;
if ("-" === (e = e.toString().replace(/\s+/g, ""))[0]) {
n++;
this.negative = 1;
}
if (n < e.length) if (16 === t) this._parseHex(e, n, i); else {
this._parseBase(e, t, n);
"le" === i && this._initArray(this.toArray(), t, i);
}
};
a.prototype._initNumber = function(e, t, i) {
if (e < 0) {
this.negative = 1;
e = -e;
}
if (e < 67108864) {
this.words = [ 67108863 & e ];
this.length = 1;
} else if (e < 4503599627370496) {
this.words = [ 67108863 & e, e / 67108864 & 67108863 ];
this.length = 2;
} else {
r(e < 9007199254740992);
this.words = [ 67108863 & e, e / 67108864 & 67108863, 1 ];
this.length = 3;
}
"le" === i && this._initArray(this.toArray(), t, i);
};
a.prototype._initArray = function(e, t, i) {
r("number" == typeof e.length);
if (e.length <= 0) {
this.words = [ 0 ];
this.length = 1;
return this;
}
this.length = Math.ceil(e.length / 3);
this.words = new Array(this.length);
for (var n = 0; n < this.length; n++) this.words[n] = 0;
var a, s, o = 0;
if ("be" === i) for (n = e.length - 1, a = 0; n >= 0; n -= 3) {
s = e[n] | e[n - 1] << 8 | e[n - 2] << 16;
this.words[a] |= s << o & 67108863;
this.words[a + 1] = s >>> 26 - o & 67108863;
if ((o += 24) >= 26) {
o -= 26;
a++;
}
} else if ("le" === i) for (n = 0, a = 0; n < e.length; n += 3) {
s = e[n] | e[n + 1] << 8 | e[n + 2] << 16;
this.words[a] |= s << o & 67108863;
this.words[a + 1] = s >>> 26 - o & 67108863;
if ((o += 24) >= 26) {
o -= 26;
a++;
}
}
return this._strip();
};
function o(e, t) {
var i = e.charCodeAt(t);
if (i >= 48 && i <= 57) return i - 48;
if (i >= 65 && i <= 70) return i - 55;
if (i >= 97 && i <= 102) return i - 87;
r(!1, "Invalid character in " + e);
}
function c(e, t, i) {
var r = o(e, i);
i - 1 >= t && (r |= o(e, i - 1) << 4);
return r;
}
a.prototype._parseHex = function(e, t, i) {
this.length = Math.ceil((e.length - t) / 6);
this.words = new Array(this.length);
for (var r = 0; r < this.length; r++) this.words[r] = 0;
var n, a = 0, s = 0;
if ("be" === i) for (r = e.length - 1; r >= t; r -= 2) {
n = c(e, t, r) << a;
this.words[s] |= 67108863 & n;
if (a >= 18) {
a -= 18;
s += 1;
this.words[s] |= n >>> 26;
} else a += 8;
} else for (r = (e.length - t) % 2 == 0 ? t + 1 : t; r < e.length; r += 2) {
n = c(e, t, r) << a;
this.words[s] |= 67108863 & n;
if (a >= 18) {
a -= 18;
s += 1;
this.words[s] |= n >>> 26;
} else a += 8;
}
this._strip();
};
function f(e, t, i, n) {
for (var a = 0, s = 0, o = Math.min(e.length, i), c = t; c < o; c++) {
var f = e.charCodeAt(c) - 48;
a *= n;
s = f >= 49 ? f - 49 + 10 : f >= 17 ? f - 17 + 10 : f;
r(f >= 0 && s < n, "Invalid character");
a += s;
}
return a;
}
a.prototype._parseBase = function(e, t, i) {
this.words = [ 0 ];
this.length = 1;
for (var r = 0, n = 1; n <= 67108863; n *= t) r++;
r--;
n = n / t | 0;
for (var a = e.length - i, s = a % r, o = Math.min(a, a - s) + i, c = 0, h = i; h < o; h += r) {
c = f(e, h, h + r, t);
this.imuln(n);
this.words[0] + c < 67108864 ? this.words[0] += c : this._iaddn(c);
}
if (0 !== s) {
var u = 1;
c = f(e, h, e.length, t);
for (h = 0; h < s; h++) u *= t;
this.imuln(u);
this.words[0] + c < 67108864 ? this.words[0] += c : this._iaddn(c);
}
this._strip();
};
a.prototype.copy = function(e) {
e.words = new Array(this.length);
for (var t = 0; t < this.length; t++) e.words[t] = this.words[t];
e.length = this.length;
e.negative = this.negative;
e.red = this.red;
};
function h(e, t) {
e.words = t.words;
e.length = t.length;
e.negative = t.negative;
e.red = t.red;
}
a.prototype._move = function(e) {
h(e, this);
};
a.prototype.clone = function() {
var e = new a(null);
this.copy(e);
return e;
};
a.prototype._expand = function(e) {
for (;this.length < e; ) this.words[this.length++] = 0;
return this;
};
a.prototype._strip = function() {
for (;this.length > 1 && 0 === this.words[this.length - 1]; ) this.length--;
return this._normSign();
};
a.prototype._normSign = function() {
1 === this.length && 0 === this.words[0] && (this.negative = 0);
return this;
};
if ("undefined" != typeof Symbol && "function" == typeof Symbol.for) try {
a.prototype[Symbol.for("nodejs.util.inspect.custom")] = u;
} catch (e) {
a.prototype.inspect = u;
} else a.prototype.inspect = u;
function u() {
return (this.red ? "<BN-R: " : "<BN: ") + this.toString(16) + ">";
}
var d = [ "", "0", "00", "000", "0000", "00000", "000000", "0000000", "00000000", "000000000", "0000000000", "00000000000", "000000000000", "0000000000000", "00000000000000", "000000000000000", "0000000000000000", "00000000000000000", "000000000000000000", "0000000000000000000", "00000000000000000000", "000000000000000000000", "0000000000000000000000", "00000000000000000000000", "000000000000000000000000", "0000000000000000000000000" ], l = [ 0, 0, 25, 16, 12, 11, 10, 9, 8, 8, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5, 5 ], p = [ 0, 0, 33554432, 43046721, 16777216, 48828125, 60466176, 40353607, 16777216, 43046721, 1e7, 19487171, 35831808, 62748517, 7529536, 11390625, 16777216, 24137569, 34012224, 47045881, 64e6, 4084101, 5153632, 6436343, 7962624, 9765625, 11881376, 14348907, 17210368, 20511149, 243e5, 28629151, 33554432, 39135393, 45435424, 52521875, 60466176 ];
a.prototype.toString = function(e, t) {
t = 0 | t || 1;
var i;
if (16 === (e = e || 10) || "hex" === e) {
i = "";
for (var n = 0, a = 0, s = 0; s < this.length; s++) {
var o = this.words[s], c = (16777215 & (o << n | a)).toString(16);
i = 0 != (a = o >>> 24 - n & 16777215) || s !== this.length - 1 ? d[6 - c.length] + c + i : c + i;
if ((n += 2) >= 26) {
n -= 26;
s--;
}
}
0 !== a && (i = a.toString(16) + i);
for (;i.length % t != 0; ) i = "0" + i;
0 !== this.negative && (i = "-" + i);
return i;
}
if (e === (0 | e) && e >= 2 && e <= 36) {
var f = l[e], h = p[e];
i = "";
var u = this.clone();
u.negative = 0;
for (;!u.isZero(); ) {
var b = u.modrn(h).toString(e);
i = (u = u.idivn(h)).isZero() ? b + i : d[f - b.length] + b + i;
}
this.isZero() && (i = "0" + i);
for (;i.length % t != 0; ) i = "0" + i;
0 !== this.negative && (i = "-" + i);
return i;
}
r(!1, "Base should be between 2 and 36");
};
a.prototype.toNumber = function() {
var e = this.words[0];
2 === this.length ? e += 67108864 * this.words[1] : 3 === this.length && 1 === this.words[2] ? e += 4503599627370496 + 67108864 * this.words[1] : this.length > 2 && r(!1, "Number can only safely store up to 53 bits");
return 0 !== this.negative ? -e : e;
};
a.prototype.toJSON = function() {
return this.toString(16, 2);
};
s && (a.prototype.toBuffer = function(e, t) {
return this.toArrayLike(s, e, t);
});
a.prototype.toArray = function(e, t) {
return this.toArrayLike(Array, e, t);
};
var b = function(e, t) {
return e.allocUnsafe ? e.allocUnsafe(t) : new e(t);
};
a.prototype.toArrayLike = function(e, t, i) {
this._strip();
var n = this.byteLength(), a = i || Math.max(1, n);
r(n <= a, "byte array longer than desired length");
r(a > 0, "Requested array length <= 0");
var s = b(e, a);
this["_toArrayLike" + ("le" === t ? "LE" : "BE")](s, n);
return s;
};
a.prototype._toArrayLikeLE = function(e) {
for (var t = 0, i = 0, r = 0, n = 0; r < this.length; r++) {
var a = this.words[r] << n | i;
e[t++] = 255 & a;
t < e.length && (e[t++] = a >> 8 & 255);
t < e.length && (e[t++] = a >> 16 & 255);
if (6 === n) {
t < e.length && (e[t++] = a >> 24 & 255);
i = 0;
n = 0;
} else {
i = a >>> 24;
n += 2;
}
}
if (t < e.length) {
e[t++] = i;
for (;t < e.length; ) e[t++] = 0;
}
};
a.prototype._toArrayLikeBE = function(e) {
for (var t = e.length - 1, i = 0, r = 0, n = 0; r < this.length; r++) {
var a = this.words[r] << n | i;
e[t--] = 255 & a;
t >= 0 && (e[t--] = a >> 8 & 255);
t >= 0 && (e[t--] = a >> 16 & 255);
if (6 === n) {
t >= 0 && (e[t--] = a >> 24 & 255);
i = 0;
n = 0;
} else {
i = a >>> 24;
n += 2;
}
}
if (t >= 0) {
e[t--] = i;
for (;t >= 0; ) e[t--] = 0;
}
};
Math.clz32 ? a.prototype._countBits = function(e) {
return 32 - Math.clz32(e);
} : a.prototype._countBits = function(e) {
var t = e, i = 0;
if (t >= 4096) {
i += 13;
t >>>= 13;
}
if (t >= 64) {
i += 7;
t >>>= 7;
}
if (t >= 8) {
i += 4;
t >>>= 4;
}
if (t >= 2) {
i += 2;
t >>>= 2;
}
return i + t;
};
a.prototype._zeroBits = function(e) {
if (0 === e) return 26;
var t = e, i = 0;
if (0 == (8191 & t)) {
i += 13;
t >>>= 13;
}
if (0 == (127 & t)) {
i += 7;
t >>>= 7;
}
if (0 == (15 & t)) {
i += 4;
t >>>= 4;
}
if (0 == (3 & t)) {
i += 2;
t >>>= 2;
}
0 == (1 & t) && i++;
return i;
};
a.prototype.bitLength = function() {
var e = this.words[this.length - 1], t = this._countBits(e);
return 26 * (this.length - 1) + t;
};
function g(e) {
for (var t = new Array(e.bitLength()), i = 0; i < t.length; i++) {
var r = i / 26 | 0, n = i % 26;
t[i] = e.words[r] >>> n & 1;
}
return t;
}
a.prototype.zeroBits = function() {
if (this.isZero()) return 0;
for (var e = 0, t = 0; t < this.length; t++) {
var i = this._zeroBits(this.words[t]);
e += i;
if (26 !== i) break;
}
return e;
};
a.prototype.byteLength = function() {
return Math.ceil(this.bitLength() / 8);
};
a.prototype.toTwos = function(e) {
return 0 !== this.negative ? this.abs().inotn(e).iaddn(1) : this.clone();
};
a.prototype.fromTwos = function(e) {
return this.testn(e - 1) ? this.notn(e).iaddn(1).ineg() : this.clone();
};
a.prototype.isNeg = function() {
return 0 !== this.negative;
};
a.prototype.neg = function() {
return this.clone().ineg();
};
a.prototype.ineg = function() {
this.isZero() || (this.negative ^= 1);
return this;
};
a.prototype.iuor = function(e) {
for (;this.length < e.length; ) this.words[this.length++] = 0;
for (var t = 0; t < e.length; t++) this.words[t] = this.words[t] | e.words[t];
return this._strip();
};
a.prototype.ior = function(e) {
r(0 == (this.negative | e.negative));
return this.iuor(e);
};
a.prototype.or = function(e) {
return this.length > e.length ? this.clone().ior(e) : e.clone().ior(this);
};
a.prototype.uor = function(e) {
return this.length > e.length ? this.clone().iuor(e) : e.clone().iuor(this);
};
a.prototype.iuand = function(e) {
var t;
t = this.length > e.length ? e : this;
for (var i = 0; i < t.length; i++) this.words[i] = this.words[i] & e.words[i];
this.length = t.length;
return this._strip();
};
a.prototype.iand = function(e) {
r(0 == (this.negative | e.negative));
return this.iuand(e);
};
a.prototype.and = function(e) {
return this.length > e.length ? this.clone().iand(e) : e.clone().iand(this);
};
a.prototype.uand = function(e) {
return this.length > e.length ? this.clone().iuand(e) : e.clone().iuand(this);
};
a.prototype.iuxor = function(e) {
var t, i;
if (this.length > e.length) {
t = this;
i = e;
} else {
t = e;
i = this;
}
for (var r = 0; r < i.length; r++) this.words[r] = t.words[r] ^ i.words[r];
if (this !== t) for (;r < t.length; r++) this.words[r] = t.words[r];
this.length = t.length;
return this._strip();
};
a.prototype.ixor = function(e) {
r(0 == (this.negative | e.negative));
return this.iuxor(e);
};
a.prototype.xor = function(e) {
return this.length > e.length ? this.clone().ixor(e) : e.clone().ixor(this);
};
a.prototype.uxor = function(e) {
return this.length > e.length ? this.clone().iuxor(e) : e.clone().iuxor(this);
};
a.prototype.inotn = function(e) {
r("number" == typeof e && e >= 0);
var t = 0 | Math.ceil(e / 26), i = e % 26;
this._expand(t);
i > 0 && t--;
for (var n = 0; n < t; n++) this.words[n] = 67108863 & ~this.words[n];
i > 0 && (this.words[n] = ~this.words[n] & 67108863 >> 26 - i);
return this._strip();
};
a.prototype.notn = function(e) {
return this.clone().inotn(e);
};
a.prototype.setn = function(e, t) {
r("number" == typeof e && e >= 0);
var i = e / 26 | 0, n = e % 26;
this._expand(i + 1);
this.words[i] = t ? this.words[i] | 1 << n : this.words[i] & ~(1 << n);
return this._strip();
};
a.prototype.iadd = function(e) {
var t, i, r;
if (0 !== this.negative && 0 === e.negative) {
this.negative = 0;
t = this.isub(e);
this.negative ^= 1;
return this._normSign();
}
if (0 === this.negative && 0 !== e.negative) {
e.negative = 0;
t = this.isub(e);
e.negative = 1;
return t._normSign();
}
if (this.length > e.length) {
i = this;
r = e;
} else {
i = e;
r = this;
}
for (var n = 0, a = 0; a < r.length; a++) {
t = (0 | i.words[a]) + (0 | r.words[a]) + n;
this.words[a] = 67108863 & t;
n = t >>> 26;
}
for (;0 !== n && a < i.length; a++) {
t = (0 | i.words[a]) + n;
this.words[a] = 67108863 & t;
n = t >>> 26;
}
this.length = i.length;
if (0 !== n) {
this.words[this.length] = n;
this.length++;
} else if (i !== this) for (;a < i.length; a++) this.words[a] = i.words[a];
return this;
};
a.prototype.add = function(e) {
var t;
if (0 !== e.negative && 0 === this.negative) {
e.negative = 0;
t = this.sub(e);
e.negative ^= 1;
return t;
}
if (0 === e.negative && 0 !== this.negative) {
this.negative = 0;
t = e.sub(this);
this.negative = 1;
return t;
}
return this.length > e.length ? this.clone().iadd(e) : e.clone().iadd(this);
};
a.prototype.isub = function(e) {
if (0 !== e.negative) {
e.negative = 0;
var t = this.iadd(e);
e.negative = 1;
return t._normSign();
}
if (0 !== this.negative) {
this.negative = 0;
this.iadd(e);
this.negative = 1;
return this._normSign();
}
var i, r, n = this.cmp(e);
if (0 === n) {
this.negative = 0;
this.length = 1;
this.words[0] = 0;
return this;
}
if (n > 0) {
i = this;
r = e;
} else {
i = e;
r = this;
}
for (var a = 0, s = 0; s < r.length; s++) {
a = (t = (0 | i.words[s]) - (0 | r.words[s]) + a) >> 26;
this.words[s] = 67108863 & t;
}
for (;0 !== a && s < i.length; s++) {
a = (t = (0 | i.words[s]) + a) >> 26;
this.words[s] = 67108863 & t;
}
if (0 === a && s < i.length && i !== this) for (;s < i.length; s++) this.words[s] = i.words[s];
this.length = Math.max(this.length, s);
i !== this && (this.negative = 1);
return this._strip();
};
a.prototype.sub = function(e) {
return this.clone().isub(e);
};
function m(e, t, i) {
i.negative = t.negative ^ e.negative;
var r = e.length + t.length | 0;
i.length = r;
r = r - 1 | 0;
var n = 0 | e.words[0], a = 0 | t.words[0], s = n * a, o = 67108863 & s, c = s / 67108864 | 0;
i.words[0] = o;
for (var f = 1; f < r; f++) {
for (var h = c >>> 26, u = 67108863 & c, d = Math.min(f, t.length - 1), l = Math.max(0, f - e.length + 1); l <= d; l++) {
var p = f - l | 0;
h += (s = (n = 0 | e.words[p]) * (a = 0 | t.words[l]) + u) / 67108864 | 0;
u = 67108863 & s;
}
i.words[f] = 0 | u;
c = 0 | h;
}
0 !== c ? i.words[f] = 0 | c : i.length--;
return i._strip();
}
var v = function(e, t, i) {
var r, n, a, s = e.words, o = t.words, c = i.words, f = 0, h = 0 | s[0], u = 8191 & h, d = h >>> 13, l = 0 | s[1], p = 8191 & l, b = l >>> 13, g = 0 | s[2], m = 8191 & g, v = g >>> 13, y = 0 | s[3], _ = 8191 & y, w = y >>> 13, S = 0 | s[4], k = 8191 & S, M = S >>> 13, A = 0 | s[5], I = 8191 & A, E = A >>> 13, P = 0 | s[6], C = 8191 & P, x = P >>> 13, O = 0 | s[7], N = 8191 & O, T = O >>> 13, j = 0 | s[8], D = 8191 & j, R = j >>> 13, B = 0 | s[9], L = 8191 & B, U = B >>> 13, q = 0 | o[0], F = 8191 & q, z = q >>> 13, H = 0 | o[1], J = 8191 & H, K = H >>> 13, W = 0 | o[2], V = 8191 & W, G = W >>> 13, Y = 0 | o[3], X = 8191 & Y, Z = Y >>> 13, Q = 0 | o[4], $ = 8191 & Q, ee = Q >>> 13, te = 0 | o[5], ie = 8191 & te, re = te >>> 13, ne = 0 | o[6], ae = 8191 & ne, se = ne >>> 13, oe = 0 | o[7], ce = 8191 & oe, fe = oe >>> 13, he = 0 | o[8], ue = 8191 & he, de = he >>> 13, le = 0 | o[9], pe = 8191 & le, be = le >>> 13;
i.negative = e.negative ^ t.negative;
i.length = 19;
var ge = (f + (r = Math.imul(u, F)) | 0) + ((8191 & (n = (n = Math.imul(u, z)) + Math.imul(d, F) | 0)) << 13) | 0;
f = ((a = Math.imul(d, z)) + (n >>> 13) | 0) + (ge >>> 26) | 0;
ge &= 67108863;
r = Math.imul(p, F);
n = (n = Math.imul(p, z)) + Math.imul(b, F) | 0;
a = Math.imul(b, z);
var me = (f + (r = r + Math.imul(u, J) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, K) | 0) + Math.imul(d, J) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, K) | 0) + (n >>> 13) | 0) + (me >>> 26) | 0;
me &= 67108863;
r = Math.imul(m, F);
n = (n = Math.imul(m, z)) + Math.imul(v, F) | 0;
a = Math.imul(v, z);
r = r + Math.imul(p, J) | 0;
n = (n = n + Math.imul(p, K) | 0) + Math.imul(b, J) | 0;
a = a + Math.imul(b, K) | 0;
var ve = (f + (r = r + Math.imul(u, V) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, G) | 0) + Math.imul(d, V) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, G) | 0) + (n >>> 13) | 0) + (ve >>> 26) | 0;
ve &= 67108863;
r = Math.imul(_, F);
n = (n = Math.imul(_, z)) + Math.imul(w, F) | 0;
a = Math.imul(w, z);
r = r + Math.imul(m, J) | 0;
n = (n = n + Math.imul(m, K) | 0) + Math.imul(v, J) | 0;
a = a + Math.imul(v, K) | 0;
r = r + Math.imul(p, V) | 0;
n = (n = n + Math.imul(p, G) | 0) + Math.imul(b, V) | 0;
a = a + Math.imul(b, G) | 0;
var ye = (f + (r = r + Math.imul(u, X) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, Z) | 0) + Math.imul(d, X) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, Z) | 0) + (n >>> 13) | 0) + (ye >>> 26) | 0;
ye &= 67108863;
r = Math.imul(k, F);
n = (n = Math.imul(k, z)) + Math.imul(M, F) | 0;
a = Math.imul(M, z);
r = r + Math.imul(_, J) | 0;
n = (n = n + Math.imul(_, K) | 0) + Math.imul(w, J) | 0;
a = a + Math.imul(w, K) | 0;
r = r + Math.imul(m, V) | 0;
n = (n = n + Math.imul(m, G) | 0) + Math.imul(v, V) | 0;
a = a + Math.imul(v, G) | 0;
r = r + Math.imul(p, X) | 0;
n = (n = n + Math.imul(p, Z) | 0) + Math.imul(b, X) | 0;
a = a + Math.imul(b, Z) | 0;
var _e = (f + (r = r + Math.imul(u, $) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, ee) | 0) + Math.imul(d, $) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, ee) | 0) + (n >>> 13) | 0) + (_e >>> 26) | 0;
_e &= 67108863;
r = Math.imul(I, F);
n = (n = Math.imul(I, z)) + Math.imul(E, F) | 0;
a = Math.imul(E, z);
r = r + Math.imul(k, J) | 0;
n = (n = n + Math.imul(k, K) | 0) + Math.imul(M, J) | 0;
a = a + Math.imul(M, K) | 0;
r = r + Math.imul(_, V) | 0;
n = (n = n + Math.imul(_, G) | 0) + Math.imul(w, V) | 0;
a = a + Math.imul(w, G) | 0;
r = r + Math.imul(m, X) | 0;
n = (n = n + Math.imul(m, Z) | 0) + Math.imul(v, X) | 0;
a = a + Math.imul(v, Z) | 0;
r = r + Math.imul(p, $) | 0;
n = (n = n + Math.imul(p, ee) | 0) + Math.imul(b, $) | 0;
a = a + Math.imul(b, ee) | 0;
var we = (f + (r = r + Math.imul(u, ie) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, re) | 0) + Math.imul(d, ie) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, re) | 0) + (n >>> 13) | 0) + (we >>> 26) | 0;
we &= 67108863;
r = Math.imul(C, F);
n = (n = Math.imul(C, z)) + Math.imul(x, F) | 0;
a = Math.imul(x, z);
r = r + Math.imul(I, J) | 0;
n = (n = n + Math.imul(I, K) | 0) + Math.imul(E, J) | 0;
a = a + Math.imul(E, K) | 0;
r = r + Math.imul(k, V) | 0;
n = (n = n + Math.imul(k, G) | 0) + Math.imul(M, V) | 0;
a = a + Math.imul(M, G) | 0;
r = r + Math.imul(_, X) | 0;
n = (n = n + Math.imul(_, Z) | 0) + Math.imul(w, X) | 0;
a = a + Math.imul(w, Z) | 0;
r = r + Math.imul(m, $) | 0;
n = (n = n + Math.imul(m, ee) | 0) + Math.imul(v, $) | 0;
a = a + Math.imul(v, ee) | 0;
r = r + Math.imul(p, ie) | 0;
n = (n = n + Math.imul(p, re) | 0) + Math.imul(b, ie) | 0;
a = a + Math.imul(b, re) | 0;
var Se = (f + (r = r + Math.imul(u, ae) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, se) | 0) + Math.imul(d, ae) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, se) | 0) + (n >>> 13) | 0) + (Se >>> 26) | 0;
Se &= 67108863;
r = Math.imul(N, F);
n = (n = Math.imul(N, z)) + Math.imul(T, F) | 0;
a = Math.imul(T, z);
r = r + Math.imul(C, J) | 0;
n = (n = n + Math.imul(C, K) | 0) + Math.imul(x, J) | 0;
a = a + Math.imul(x, K) | 0;
r = r + Math.imul(I, V) | 0;
n = (n = n + Math.imul(I, G) | 0) + Math.imul(E, V) | 0;
a = a + Math.imul(E, G) | 0;
r = r + Math.imul(k, X) | 0;
n = (n = n + Math.imul(k, Z) | 0) + Math.imul(M, X) | 0;
a = a + Math.imul(M, Z) | 0;
r = r + Math.imul(_, $) | 0;
n = (n = n + Math.imul(_, ee) | 0) + Math.imul(w, $) | 0;
a = a + Math.imul(w, ee) | 0;
r = r + Math.imul(m, ie) | 0;
n = (n = n + Math.imul(m, re) | 0) + Math.imul(v, ie) | 0;
a = a + Math.imul(v, re) | 0;
r = r + Math.imul(p, ae) | 0;
n = (n = n + Math.imul(p, se) | 0) + Math.imul(b, ae) | 0;
a = a + Math.imul(b, se) | 0;
var ke = (f + (r = r + Math.imul(u, ce) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, fe) | 0) + Math.imul(d, ce) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, fe) | 0) + (n >>> 13) | 0) + (ke >>> 26) | 0;
ke &= 67108863;
r = Math.imul(D, F);
n = (n = Math.imul(D, z)) + Math.imul(R, F) | 0;
a = Math.imul(R, z);
r = r + Math.imul(N, J) | 0;
n = (n = n + Math.imul(N, K) | 0) + Math.imul(T, J) | 0;
a = a + Math.imul(T, K) | 0;
r = r + Math.imul(C, V) | 0;
n = (n = n + Math.imul(C, G) | 0) + Math.imul(x, V) | 0;
a = a + Math.imul(x, G) | 0;
r = r + Math.imul(I, X) | 0;
n = (n = n + Math.imul(I, Z) | 0) + Math.imul(E, X) | 0;
a = a + Math.imul(E, Z) | 0;
r = r + Math.imul(k, $) | 0;
n = (n = n + Math.imul(k, ee) | 0) + Math.imul(M, $) | 0;
a = a + Math.imul(M, ee) | 0;
r = r + Math.imul(_, ie) | 0;
n = (n = n + Math.imul(_, re) | 0) + Math.imul(w, ie) | 0;
a = a + Math.imul(w, re) | 0;
r = r + Math.imul(m, ae) | 0;
n = (n = n + Math.imul(m, se) | 0) + Math.imul(v, ae) | 0;
a = a + Math.imul(v, se) | 0;
r = r + Math.imul(p, ce) | 0;
n = (n = n + Math.imul(p, fe) | 0) + Math.imul(b, ce) | 0;
a = a + Math.imul(b, fe) | 0;
var Me = (f + (r = r + Math.imul(u, ue) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, de) | 0) + Math.imul(d, ue) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, de) | 0) + (n >>> 13) | 0) + (Me >>> 26) | 0;
Me &= 67108863;
r = Math.imul(L, F);
n = (n = Math.imul(L, z)) + Math.imul(U, F) | 0;
a = Math.imul(U, z);
r = r + Math.imul(D, J) | 0;
n = (n = n + Math.imul(D, K) | 0) + Math.imul(R, J) | 0;
a = a + Math.imul(R, K) | 0;
r = r + Math.imul(N, V) | 0;
n = (n = n + Math.imul(N, G) | 0) + Math.imul(T, V) | 0;
a = a + Math.imul(T, G) | 0;
r = r + Math.imul(C, X) | 0;
n = (n = n + Math.imul(C, Z) | 0) + Math.imul(x, X) | 0;
a = a + Math.imul(x, Z) | 0;
r = r + Math.imul(I, $) | 0;
n = (n = n + Math.imul(I, ee) | 0) + Math.imul(E, $) | 0;
a = a + Math.imul(E, ee) | 0;
r = r + Math.imul(k, ie) | 0;
n = (n = n + Math.imul(k, re) | 0) + Math.imul(M, ie) | 0;
a = a + Math.imul(M, re) | 0;
r = r + Math.imul(_, ae) | 0;
n = (n = n + Math.imul(_, se) | 0) + Math.imul(w, ae) | 0;
a = a + Math.imul(w, se) | 0;
r = r + Math.imul(m, ce) | 0;
n = (n = n + Math.imul(m, fe) | 0) + Math.imul(v, ce) | 0;
a = a + Math.imul(v, fe) | 0;
r = r + Math.imul(p, ue) | 0;
n = (n = n + Math.imul(p, de) | 0) + Math.imul(b, ue) | 0;
a = a + Math.imul(b, de) | 0;
var Ae = (f + (r = r + Math.imul(u, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(u, be) | 0) + Math.imul(d, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(d, be) | 0) + (n >>> 13) | 0) + (Ae >>> 26) | 0;
Ae &= 67108863;
r = Math.imul(L, J);
n = (n = Math.imul(L, K)) + Math.imul(U, J) | 0;
a = Math.imul(U, K);
r = r + Math.imul(D, V) | 0;
n = (n = n + Math.imul(D, G) | 0) + Math.imul(R, V) | 0;
a = a + Math.imul(R, G) | 0;
r = r + Math.imul(N, X) | 0;
n = (n = n + Math.imul(N, Z) | 0) + Math.imul(T, X) | 0;
a = a + Math.imul(T, Z) | 0;
r = r + Math.imul(C, $) | 0;
n = (n = n + Math.imul(C, ee) | 0) + Math.imul(x, $) | 0;
a = a + Math.imul(x, ee) | 0;
r = r + Math.imul(I, ie) | 0;
n = (n = n + Math.imul(I, re) | 0) + Math.imul(E, ie) | 0;
a = a + Math.imul(E, re) | 0;
r = r + Math.imul(k, ae) | 0;
n = (n = n + Math.imul(k, se) | 0) + Math.imul(M, ae) | 0;
a = a + Math.imul(M, se) | 0;
r = r + Math.imul(_, ce) | 0;
n = (n = n + Math.imul(_, fe) | 0) + Math.imul(w, ce) | 0;
a = a + Math.imul(w, fe) | 0;
r = r + Math.imul(m, ue) | 0;
n = (n = n + Math.imul(m, de) | 0) + Math.imul(v, ue) | 0;
a = a + Math.imul(v, de) | 0;
var Ie = (f + (r = r + Math.imul(p, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(p, be) | 0) + Math.imul(b, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(b, be) | 0) + (n >>> 13) | 0) + (Ie >>> 26) | 0;
Ie &= 67108863;
r = Math.imul(L, V);
n = (n = Math.imul(L, G)) + Math.imul(U, V) | 0;
a = Math.imul(U, G);
r = r + Math.imul(D, X) | 0;
n = (n = n + Math.imul(D, Z) | 0) + Math.imul(R, X) | 0;
a = a + Math.imul(R, Z) | 0;
r = r + Math.imul(N, $) | 0;
n = (n = n + Math.imul(N, ee) | 0) + Math.imul(T, $) | 0;
a = a + Math.imul(T, ee) | 0;
r = r + Math.imul(C, ie) | 0;
n = (n = n + Math.imul(C, re) | 0) + Math.imul(x, ie) | 0;
a = a + Math.imul(x, re) | 0;
r = r + Math.imul(I, ae) | 0;
n = (n = n + Math.imul(I, se) | 0) + Math.imul(E, ae) | 0;
a = a + Math.imul(E, se) | 0;
r = r + Math.imul(k, ce) | 0;
n = (n = n + Math.imul(k, fe) | 0) + Math.imul(M, ce) | 0;
a = a + Math.imul(M, fe) | 0;
r = r + Math.imul(_, ue) | 0;
n = (n = n + Math.imul(_, de) | 0) + Math.imul(w, ue) | 0;
a = a + Math.imul(w, de) | 0;
var Ee = (f + (r = r + Math.imul(m, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(m, be) | 0) + Math.imul(v, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(v, be) | 0) + (n >>> 13) | 0) + (Ee >>> 26) | 0;
Ee &= 67108863;
r = Math.imul(L, X);
n = (n = Math.imul(L, Z)) + Math.imul(U, X) | 0;
a = Math.imul(U, Z);
r = r + Math.imul(D, $) | 0;
n = (n = n + Math.imul(D, ee) | 0) + Math.imul(R, $) | 0;
a = a + Math.imul(R, ee) | 0;
r = r + Math.imul(N, ie) | 0;
n = (n = n + Math.imul(N, re) | 0) + Math.imul(T, ie) | 0;
a = a + Math.imul(T, re) | 0;
r = r + Math.imul(C, ae) | 0;
n = (n = n + Math.imul(C, se) | 0) + Math.imul(x, ae) | 0;
a = a + Math.imul(x, se) | 0;
r = r + Math.imul(I, ce) | 0;
n = (n = n + Math.imul(I, fe) | 0) + Math.imul(E, ce) | 0;
a = a + Math.imul(E, fe) | 0;
r = r + Math.imul(k, ue) | 0;
n = (n = n + Math.imul(k, de) | 0) + Math.imul(M, ue) | 0;
a = a + Math.imul(M, de) | 0;
var Pe = (f + (r = r + Math.imul(_, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(_, be) | 0) + Math.imul(w, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(w, be) | 0) + (n >>> 13) | 0) + (Pe >>> 26) | 0;
Pe &= 67108863;
r = Math.imul(L, $);
n = (n = Math.imul(L, ee)) + Math.imul(U, $) | 0;
a = Math.imul(U, ee);
r = r + Math.imul(D, ie) | 0;
n = (n = n + Math.imul(D, re) | 0) + Math.imul(R, ie) | 0;
a = a + Math.imul(R, re) | 0;
r = r + Math.imul(N, ae) | 0;
n = (n = n + Math.imul(N, se) | 0) + Math.imul(T, ae) | 0;
a = a + Math.imul(T, se) | 0;
r = r + Math.imul(C, ce) | 0;
n = (n = n + Math.imul(C, fe) | 0) + Math.imul(x, ce) | 0;
a = a + Math.imul(x, fe) | 0;
r = r + Math.imul(I, ue) | 0;
n = (n = n + Math.imul(I, de) | 0) + Math.imul(E, ue) | 0;
a = a + Math.imul(E, de) | 0;
var Ce = (f + (r = r + Math.imul(k, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(k, be) | 0) + Math.imul(M, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(M, be) | 0) + (n >>> 13) | 0) + (Ce >>> 26) | 0;
Ce &= 67108863;
r = Math.imul(L, ie);
n = (n = Math.imul(L, re)) + Math.imul(U, ie) | 0;
a = Math.imul(U, re);
r = r + Math.imul(D, ae) | 0;
n = (n = n + Math.imul(D, se) | 0) + Math.imul(R, ae) | 0;
a = a + Math.imul(R, se) | 0;
r = r + Math.imul(N, ce) | 0;
n = (n = n + Math.imul(N, fe) | 0) + Math.imul(T, ce) | 0;
a = a + Math.imul(T, fe) | 0;
r = r + Math.imul(C, ue) | 0;
n = (n = n + Math.imul(C, de) | 0) + Math.imul(x, ue) | 0;
a = a + Math.imul(x, de) | 0;
var xe = (f + (r = r + Math.imul(I, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(I, be) | 0) + Math.imul(E, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(E, be) | 0) + (n >>> 13) | 0) + (xe >>> 26) | 0;
xe &= 67108863;
r = Math.imul(L, ae);
n = (n = Math.imul(L, se)) + Math.imul(U, ae) | 0;
a = Math.imul(U, se);
r = r + Math.imul(D, ce) | 0;
n = (n = n + Math.imul(D, fe) | 0) + Math.imul(R, ce) | 0;
a = a + Math.imul(R, fe) | 0;
r = r + Math.imul(N, ue) | 0;
n = (n = n + Math.imul(N, de) | 0) + Math.imul(T, ue) | 0;
a = a + Math.imul(T, de) | 0;
var Oe = (f + (r = r + Math.imul(C, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(C, be) | 0) + Math.imul(x, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(x, be) | 0) + (n >>> 13) | 0) + (Oe >>> 26) | 0;
Oe &= 67108863;
r = Math.imul(L, ce);
n = (n = Math.imul(L, fe)) + Math.imul(U, ce) | 0;
a = Math.imul(U, fe);
r = r + Math.imul(D, ue) | 0;
n = (n = n + Math.imul(D, de) | 0) + Math.imul(R, ue) | 0;
a = a + Math.imul(R, de) | 0;
var Ne = (f + (r = r + Math.imul(N, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(N, be) | 0) + Math.imul(T, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(T, be) | 0) + (n >>> 13) | 0) + (Ne >>> 26) | 0;
Ne &= 67108863;
r = Math.imul(L, ue);
n = (n = Math.imul(L, de)) + Math.imul(U, ue) | 0;
a = Math.imul(U, de);
var Te = (f + (r = r + Math.imul(D, pe) | 0) | 0) + ((8191 & (n = (n = n + Math.imul(D, be) | 0) + Math.imul(R, pe) | 0)) << 13) | 0;
f = ((a = a + Math.imul(R, be) | 0) + (n >>> 13) | 0) + (Te >>> 26) | 0;
Te &= 67108863;
var je = (f + (r = Math.imul(L, pe)) | 0) + ((8191 & (n = (n = Math.imul(L, be)) + Math.imul(U, pe) | 0)) << 13) | 0;
f = ((a = Math.imul(U, be)) + (n >>> 13) | 0) + (je >>> 26) | 0;
je &= 67108863;
c[0] = ge;
c[1] = me;
c[2] = ve;
c[3] = ye;
c[4] = _e;
c[5] = we;
c[6] = Se;
c[7] = ke;
c[8] = Me;
c[9] = Ae;
c[10] = Ie;
c[11] = Ee;
c[12] = Pe;
c[13] = Ce;
c[14] = xe;
c[15] = Oe;
c[16] = Ne;
c[17] = Te;
c[18] = je;
if (0 !== f) {
c[19] = f;
i.length++;
}
return i;
};
Math.imul || (v = m);
function y(e, t, i) {
i.negative = t.negative ^ e.negative;
i.length = e.length + t.length;
for (var r = 0, n = 0, a = 0; a < i.length - 1; a++) {
var s = n;
n = 0;
for (var o = 67108863 & r, c = Math.min(a, t.length - 1), f = Math.max(0, a - e.length + 1); f <= c; f++) {
var h = a - f, u = (0 | e.words[h]) * (0 | t.words[f]), d = 67108863 & u;
o = 67108863 & (d = d + o | 0);
n += (s = (s = s + (u / 67108864 | 0) | 0) + (d >>> 26) | 0) >>> 26;
s &= 67108863;
}
i.words[a] = o;
r = s;
s = n;
}
0 !== r ? i.words[a] = r : i.length--;
return i._strip();
}
function _(e, t, i) {
return y(e, t, i);
}
a.prototype.mulTo = function(e, t) {
var i = this.length + e.length;
return 10 === this.length && 10 === e.length ? v(this, e, t) : i < 63 ? m(this, e, t) : i < 1024 ? y(this, e, t) : _(this, e, t);
};
function w(e, t) {
this.x = e;
this.y = t;
}
w.prototype.makeRBT = function(e) {
for (var t = new Array(e), i = a.prototype._countBits(e) - 1, r = 0; r < e; r++) t[r] = this.revBin(r, i, e);
return t;
};
w.prototype.revBin = function(e, t, i) {
if (0 === e || e === i - 1) return e;
for (var r = 0, n = 0; n < t; n++) {
r |= (1 & e) << t - n - 1;
e >>= 1;
}
return r;
};
w.prototype.permute = function(e, t, i, r, n, a) {
for (var s = 0; s < a; s++) {
r[s] = t[e[s]];
n[s] = i[e[s]];
}
};
w.prototype.transform = function(e, t, i, r, n, a) {
this.permute(a, e, t, i, r, n);
for (var s = 1; s < n; s <<= 1) for (var o = s << 1, c = Math.cos(2 * Math.PI / o), f = Math.sin(2 * Math.PI / o), h = 0; h < n; h += o) for (var u = c, d = f, l = 0; l < s; l++) {
var p = i[h + l], b = r[h + l], g = i[h + l + s], m = r[h + l + s], v = u * g - d * m;
m = u * m + d * g;
g = v;
i[h + l] = p + g;
r[h + l] = b + m;
i[h + l + s] = p - g;
r[h + l + s] = b - m;
if (l !== o) {
v = c * u - f * d;
d = c * d + f * u;
u = v;
}
}
};
w.prototype.guessLen13b = function(e, t) {
var i = 1 | Math.max(t, e), r = 1 & i, n = 0;
for (i = i / 2 | 0; i; i >>>= 1) n++;
return 1 << n + 1 + r;
};
w.prototype.conjugate = function(e, t, i) {
if (!(i <= 1)) for (var r = 0; r < i / 2; r++) {
var n = e[r];
e[r] = e[i - r - 1];
e[i - r - 1] = n;
n = t[r];
t[r] = -t[i - r - 1];
t[i - r - 1] = -n;
}
};
w.prototype.normalize13b = function(e, t) {
for (var i = 0, r = 0; r < t / 2; r++) {
var n = 8192 * Math.round(e[2 * r + 1] / t) + Math.round(e[2 * r] / t) + i;
e[r] = 67108863 & n;
i = n < 67108864 ? 0 : n / 67108864 | 0;
}
return e;
};
w.prototype.convert13b = function(e, t, i, n) {
for (var a = 0, s = 0; s < t; s++) {
a += 0 | e[s];
i[2 * s] = 8191 & a;
a >>>= 13;
i[2 * s + 1] = 8191 & a;
a >>>= 13;
}
for (s = 2 * t; s < n; ++s) i[s] = 0;
r(0 === a);
r(0 == (-8192 & a));
};
w.prototype.stub = function(e) {
for (var t = new Array(e), i = 0; i < e; i++) t[i] = 0;
return t;
};
w.prototype.mulp = function(e, t, i) {
var r = 2 * this.guessLen13b(e.length, t.length), n = this.makeRBT(r), a = this.stub(r), s = new Array(r), o = new Array(r), c = new Array(r), f = new Array(r), h = new Array(r), u = new Array(r), d = i.words;
d.length = r;
this.convert13b(e.words, e.length, s, r);
this.convert13b(t.words, t.length, f, r);
this.transform(s, a, o, c, r, n);
this.transform(f, a, h, u, r, n);
for (var l = 0; l < r; l++) {
var p = o[l] * h[l] - c[l] * u[l];
c[l] = o[l] * u[l] + c[l] * h[l];
o[l] = p;
}
this.conjugate(o, c, r);
this.transform(o, c, d, a, r, n);
this.conjugate(d, a, r);
this.normalize13b(d, r);
i.negative = e.negative ^ t.negative;
i.length = e.length + t.length;
return i._strip();
};
a.prototype.mul = function(e) {
var t = new a(null);
t.words = new Array(this.length + e.length);
return this.mulTo(e, t);
};
a.prototype.mulf = function(e) {
var t = new a(null);
t.words = new Array(this.length + e.length);
return _(this, e, t);
};
a.prototype.imul = function(e) {
return this.clone().mulTo(e, this);
};
a.prototype.imuln = function(e) {
var t = e < 0;
t && (e = -e);
r("number" == typeof e);
r(e < 67108864);
for (var i = 0, n = 0; n < this.length; n++) {
var a = (0 | this.words[n]) * e, s = (67108863 & a) + (67108863 & i);
i >>= 26;
i += a / 67108864 | 0;
i += s >>> 26;
this.words[n] = 67108863 & s;
}
if (0 !== i) {
this.words[n] = i;
this.length++;
}
return t ? this.ineg() : this;
};
a.prototype.muln = function(e) {
return this.clone().imuln(e);
};
a.prototype.sqr = function() {
return this.mul(this);
};
a.prototype.isqr = function() {
return this.imul(this.clone());
};
a.prototype.pow = function(e) {
var t = g(e);
if (0 === t.length) return new a(1);
for (var i = this, r = 0; r < t.length && 0 === t[r]; r++, i = i.sqr()) ;
if (++r < t.length) for (var n = i.sqr(); r < t.length; r++, n = n.sqr()) 0 !== t[r] && (i = i.mul(n));
return i;
};
a.prototype.iushln = function(e) {
r("number" == typeof e && e >= 0);
var t, i = e % 26, n = (e - i) / 26, a = 67108863 >>> 26 - i << 26 - i;
if (0 !== i) {
var s = 0;
for (t = 0; t < this.length; t++) {
var o = this.words[t] & a, c = (0 | this.words[t]) - o << i;
this.words[t] = c | s;
s = o >>> 26 - i;
}
if (s) {
this.words[t] = s;
this.length++;
}
}
if (0 !== n) {
for (t = this.length - 1; t >= 0; t--) this.words[t + n] = this.words[t];
for (t = 0; t < n; t++) this.words[t] = 0;
this.length += n;
}
return this._strip();
};
a.prototype.ishln = function(e) {
r(0 === this.negative);
return this.iushln(e);
};
a.prototype.iushrn = function(e, t, i) {
r("number" == typeof e && e >= 0);
var n;
n = t ? (t - t % 26) / 26 : 0;
var a = e % 26, s = Math.min((e - a) / 26, this.length), o = 67108863 ^ 67108863 >>> a << a, c = i;
n -= s;
n = Math.max(0, n);
if (c) {
for (var f = 0; f < s; f++) c.words[f] = this.words[f];
c.length = s;
}
if (0 === s) ; else if (this.length > s) {
this.length -= s;
for (f = 0; f < this.length; f++) this.words[f] = this.words[f + s];
} else {
this.words[0] = 0;
this.length = 1;
}
var h = 0;
for (f = this.length - 1; f >= 0 && (0 !== h || f >= n); f--) {
var u = 0 | this.words[f];
this.words[f] = h << 26 - a | u >>> a;
h = u & o;
}
c && 0 !== h && (c.words[c.length++] = h);
if (0 === this.length) {
this.words[0] = 0;
this.length = 1;
}
return this._strip();
};
a.prototype.ishrn = function(e, t, i) {
r(0 === this.negative);
return this.iushrn(e, t, i);
};
a.prototype.shln = function(e) {
return this.clone().ishln(e);
};
a.prototype.ushln = function(e) {
return this.clone().iushln(e);
};
a.prototype.shrn = function(e) {
return this.clone().ishrn(e);
};
a.prototype.ushrn = function(e) {
return this.clone().iushrn(e);
};
a.prototype.testn = function(e) {
r("number" == typeof e && e >= 0);
var t = e % 26, i = (e - t) / 26, n = 1 << t;
return !(this.length <= i || !(this.words[i] & n));
};
a.prototype.imaskn = function(e) {
r("number" == typeof e && e >= 0);
var t = e % 26, i = (e - t) / 26;
r(0 === this.negative, "imaskn works only with positive numbers");
if (this.length <= i) return this;
0 !== t && i++;
this.length = Math.min(i, this.length);
if (0 !== t) {
var n = 67108863 ^ 67108863 >>> t << t;
this.words[this.length - 1] &= n;
}
return this._strip();
};
a.prototype.maskn = function(e) {
return this.clone().imaskn(e);
};
a.prototype.iaddn = function(e) {
r("number" == typeof e);
r(e < 67108864);
if (e < 0) return this.isubn(-e);
if (0 !== this.negative) {
if (1 === this.length && (0 | this.words[0]) <= e) {
this.words[0] = e - (0 | this.words[0]);
this.negative = 0;
return this;
}
this.negative = 0;
this.isubn(e);
this.negative = 1;
return this;
}
return this._iaddn(e);
};
a.prototype._iaddn = function(e) {
this.words[0] += e;
for (var t = 0; t < this.length && this.words[t] >= 67108864; t++) {
this.words[t] -= 67108864;
t === this.length - 1 ? this.words[t + 1] = 1 : this.words[t + 1]++;
}
this.length = Math.max(this.length, t + 1);
return this;
};
a.prototype.isubn = function(e) {
r("number" == typeof e);
r(e < 67108864);
if (e < 0) return this.iaddn(-e);
if (0 !== this.negative) {
this.negative = 0;
this.iaddn(e);
this.negative = 1;
return this;
}
this.words[0] -= e;
if (1 === this.length && this.words[0] < 0) {
this.words[0] = -this.words[0];
this.negative = 1;
} else for (var t = 0; t < this.length && this.words[t] < 0; t++) {
this.words[t] += 67108864;
this.words[t + 1] -= 1;
}
return this._strip();
};
a.prototype.addn = function(e) {
return this.clone().iaddn(e);
};
a.prototype.subn = function(e) {
return this.clone().isubn(e);
};
a.prototype.iabs = function() {
this.negative = 0;
return this;
};
a.prototype.abs = function() {
return this.clone().iabs();
};
a.prototype._ishlnsubmul = function(e, t, i) {
var n, a, s = e.length + i;
this._expand(s);
var o = 0;
for (n = 0; n < e.length; n++) {
a = (0 | this.words[n + i]) + o;
var c = (0 | e.words[n]) * t;
o = ((a -= 67108863 & c) >> 26) - (c / 67108864 | 0);
this.words[n + i] = 67108863 & a;
}
for (;n < this.length - i; n++) {
o = (a = (0 | this.words[n + i]) + o) >> 26;
this.words[n + i] = 67108863 & a;
}
if (0 === o) return this._strip();
r(-1 === o);
o = 0;
for (n = 0; n < this.length; n++) {
o = (a = -(0 | this.words[n]) + o) >> 26;
this.words[n] = 67108863 & a;
}
this.negative = 1;
return this._strip();
};
a.prototype._wordDiv = function(e, t) {
var i = (this.length, e.length), r = this.clone(), n = e, s = 0 | n.words[n.length - 1];
if (0 != (i = 26 - this._countBits(s))) {
n = n.ushln(i);
r.iushln(i);
s = 0 | n.words[n.length - 1];
}
var o, c = r.length - n.length;
if ("mod" !== t) {
(o = new a(null)).length = c + 1;
o.words = new Array(o.length);
for (var f = 0; f < o.length; f++) o.words[f] = 0;
}
var h = r.clone()._ishlnsubmul(n, 1, c);
if (0 === h.negative) {
r = h;
o && (o.words[c] = 1);
}
for (var u = c - 1; u >= 0; u--) {
var d = 67108864 * (0 | r.words[n.length + u]) + (0 | r.words[n.length + u - 1]);
d = Math.min(d / s | 0, 67108863);
r._ishlnsubmul(n, d, u);
for (;0 !== r.negative; ) {
d--;
r.negative = 0;
r._ishlnsubmul(n, 1, u);
r.isZero() || (r.negative ^= 1);
}
o && (o.words[u] = d);
}
o && o._strip();
r._strip();
"div" !== t && 0 !== i && r.iushrn(i);
return {
div: o || null,
mod: r
};
};
a.prototype.divmod = function(e, t, i) {
r(!e.isZero());
if (this.isZero()) return {
div: new a(0),
mod: new a(0)
};
var n, s, o;
if (0 !== this.negative && 0 === e.negative) {
o = this.neg().divmod(e, t);
"mod" !== t && (n = o.div.neg());
if ("div" !== t) {
s = o.mod.neg();
i && 0 !== s.negative && s.iadd(e);
}
return {
div: n,
mod: s
};
}
if (0 === this.negative && 0 !== e.negative) {
o = this.divmod(e.neg(), t);
"mod" !== t && (n = o.div.neg());
return {
div: n,
mod: o.mod
};
}
if (0 != (this.negative & e.negative)) {
o = this.neg().divmod(e.neg(), t);
if ("div" !== t) {
s = o.mod.neg();
i && 0 !== s.negative && s.isub(e);
}
return {
div: o.div,
mod: s
};
}
return e.length > this.length || this.cmp(e) < 0 ? {
div: new a(0),
mod: this
} : 1 === e.length ? "div" === t ? {
div: this.divn(e.words[0]),
mod: null
} : "mod" === t ? {
div: null,
mod: new a(this.modrn(e.words[0]))
} : {
div: this.divn(e.words[0]),
mod: new a(this.modrn(e.words[0]))
} : this._wordDiv(e, t);
};
a.prototype.div = function(e) {
return this.divmod(e, "div", !1).div;
};
a.prototype.mod = function(e) {
return this.divmod(e, "mod", !1).mod;
};
a.prototype.umod = function(e) {
return this.divmod(e, "mod", !0).mod;
};
a.prototype.divRound = function(e) {
var t = this.divmod(e);
if (t.mod.isZero()) return t.div;
var i = 0 !== t.div.negative ? t.mod.isub(e) : t.mod, r = e.ushrn(1), n = e.andln(1), a = i.cmp(r);
return a < 0 || 1 === n && 0 === a ? t.div : 0 !== t.div.negative ? t.div.isubn(1) : t.div.iaddn(1);
};
a.prototype.modrn = function(e) {
var t = e < 0;
t && (e = -e);
r(e <= 67108863);
for (var i = (1 << 26) % e, n = 0, a = this.length - 1; a >= 0; a--) n = (i * n + (0 | this.words[a])) % e;
return t ? -n : n;
};
a.prototype.modn = function(e) {
return this.modrn(e);
};
a.prototype.idivn = function(e) {
var t = e < 0;
t && (e = -e);
r(e <= 67108863);
for (var i = 0, n = this.length - 1; n >= 0; n--) {
var a = (0 | this.words[n]) + 67108864 * i;
this.words[n] = a / e | 0;
i = a % e;
}
this._strip();
return t ? this.ineg() : this;
};
a.prototype.divn = function(e) {
return this.clone().idivn(e);
};
a.prototype.egcd = function(e) {
r(0 === e.negative);
r(!e.isZero());
var t = this, i = e.clone();
t = 0 !== t.negative ? t.umod(e) : t.clone();
for (var n = new a(1), s = new a(0), o = new a(0), c = new a(1), f = 0; t.isEven() && i.isEven(); ) {
t.iushrn(1);
i.iushrn(1);
++f;
}
for (var h = i.clone(), u = t.clone(); !t.isZero(); ) {
for (var d = 0, l = 1; 0 == (t.words[0] & l) && d < 26; ++d, l <<= 1) ;
if (d > 0) {
t.iushrn(d);
for (;d-- > 0; ) {
if (n.isOdd() || s.isOdd()) {
n.iadd(h);
s.isub(u);
}
n.iushrn(1);
s.iushrn(1);
}
}
for (var p = 0, b = 1; 0 == (i.words[0] & b) && p < 26; ++p, b <<= 1) ;
if (p > 0) {
i.iushrn(p);
for (;p-- > 0; ) {
if (o.isOdd() || c.isOdd()) {
o.iadd(h);
c.isub(u);
}
o.iushrn(1);
c.iushrn(1);
}
}
if (t.cmp(i) >= 0) {
t.isub(i);
n.isub(o);
s.isub(c);
} else {
i.isub(t);
o.isub(n);
c.isub(s);
}
}
return {
a: o,
b: c,
gcd: i.iushln(f)
};
};
a.prototype._invmp = function(e) {
r(0 === e.negative);
r(!e.isZero());
var t = this, i = e.clone();
t = 0 !== t.negative ? t.umod(e) : t.clone();
for (var n, s = new a(1), o = new a(0), c = i.clone(); t.cmpn(1) > 0 && i.cmpn(1) > 0; ) {
for (var f = 0, h = 1; 0 == (t.words[0] & h) && f < 26; ++f, h <<= 1) ;
if (f > 0) {
t.iushrn(f);
for (;f-- > 0; ) {
s.isOdd() && s.iadd(c);
s.iushrn(1);
}
}
for (var u = 0, d = 1; 0 == (i.words[0] & d) && u < 26; ++u, d <<= 1) ;
if (u > 0) {
i.iushrn(u);
for (;u-- > 0; ) {
o.isOdd() && o.iadd(c);
o.iushrn(1);
}
}
if (t.cmp(i) >= 0) {
t.isub(i);
s.isub(o);
} else {
i.isub(t);
o.isub(s);
}
}
(n = 0 === t.cmpn(1) ? s : o).cmpn(0) < 0 && n.iadd(e);
return n;
};
a.prototype.gcd = function(e) {
if (this.isZero()) return e.abs();
if (e.isZero()) return this.abs();
var t = this.clone(), i = e.clone();
t.negative = 0;
i.negative = 0;
for (var r = 0; t.isEven() && i.isEven(); r++) {
t.iushrn(1);
i.iushrn(1);
}
for (;;) {
for (;t.isEven(); ) t.iushrn(1);
for (;i.isEven(); ) i.iushrn(1);
var n = t.cmp(i);
if (n < 0) {
var a = t;
t = i;
i = a;
} else if (0 === n || 0 === i.cmpn(1)) break;
t.isub(i);
}
return i.iushln(r);
};
a.prototype.invm = function(e) {
return this.egcd(e).a.umod(e);
};
a.prototype.isEven = function() {
return 0 == (1 & this.words[0]);
};
a.prototype.isOdd = function() {
return 1 == (1 & this.words[0]);
};
a.prototype.andln = function(e) {
return this.words[0] & e;
};
a.prototype.bincn = function(e) {
r("number" == typeof e);
var t = e % 26, i = (e - t) / 26, n = 1 << t;
if (this.length <= i) {
this._expand(i + 1);
this.words[i] |= n;
return this;
}
for (var a = n, s = i; 0 !== a && s < this.length; s++) {
var o = 0 | this.words[s];
a = (o += a) >>> 26;
o &= 67108863;
this.words[s] = o;
}
if (0 !== a) {
this.words[s] = a;
this.length++;
}
return this;
};
a.prototype.isZero = function() {
return 1 === this.length && 0 === this.words[0];
};
a.prototype.cmpn = function(e) {
var t, i = e < 0;
if (0 !== this.negative && !i) return -1;
if (0 === this.negative && i) return 1;
this._strip();
if (this.length > 1) t = 1; else {
i && (e = -e);
r(e <= 67108863, "Number is too big");
var n = 0 | this.words[0];
t = n === e ? 0 : n < e ? -1 : 1;
}
return 0 !== this.negative ? 0 | -t : t;
};
a.prototype.cmp = function(e) {
if (0 !== this.negative && 0 === e.negative) return -1;
if (0 === this.negative && 0 !== e.negative) return 1;
var t = this.ucmp(e);
return 0 !== this.negative ? 0 | -t : t;
};
a.prototype.ucmp = function(e) {
if (this.length > e.length) return 1;
if (this.length < e.length) return -1;
for (var t = 0, i = this.length - 1; i >= 0; i--) {
var r = 0 | this.words[i], n = 0 | e.words[i];
if (r !== n) {
r < n ? t = -1 : r > n && (t = 1);
break;
}
}
return t;
};
a.prototype.gtn = function(e) {
return 1 === this.cmpn(e);
};
a.prototype.gt = function(e) {
return 1 === this.cmp(e);
};
a.prototype.gten = function(e) {
return this.cmpn(e) >= 0;
};
a.prototype.gte = function(e) {
return this.cmp(e) >= 0;
};
a.prototype.ltn = function(e) {
return -1 === this.cmpn(e);
};
a.prototype.lt = function(e) {
return -1 === this.cmp(e);
};
a.prototype.lten = function(e) {
return this.cmpn(e) <= 0;
};
a.prototype.lte = function(e) {
return this.cmp(e) <= 0;
};
a.prototype.eqn = function(e) {
return 0 === this.cmpn(e);
};
a.prototype.eq = function(e) {
return 0 === this.cmp(e);
};
a.red = function(e) {
return new P(e);
};
a.prototype.toRed = function(e) {
r(!this.red, "Already a number in reduction context");
r(0 === this.negative, "red works only with positives");
return e.convertTo(this)._forceRed(e);
};
a.prototype.fromRed = function() {
r(this.red, "fromRed works only with numbers in reduction context");
return this.red.convertFrom(this);
};
a.prototype._forceRed = function(e) {
this.red = e;
return this;
};
a.prototype.forceRed = function(e) {
r(!this.red, "Already a number in reduction context");
return this._forceRed(e);
};
a.prototype.redAdd = function(e) {
r(this.red, "redAdd works only with red numbers");
return this.red.add(this, e);
};
a.prototype.redIAdd = function(e) {
r(this.red, "redIAdd works only with red numbers");
return this.red.iadd(this, e);
};
a.prototype.redSub = function(e) {
r(this.red, "redSub works only with red numbers");
return this.red.sub(this, e);
};
a.prototype.redISub = function(e) {
r(this.red, "redISub works only with red numbers");
return this.red.isub(this, e);
};
a.prototype.redShl = function(e) {
r(this.red, "redShl works only with red numbers");
return this.red.shl(this, e);
};
a.prototype.redMul = function(e) {
r(this.red, "redMul works only with red numbers");
this.red._verify2(this, e);
return this.red.mul(this, e);
};
a.prototype.redIMul = function(e) {
r(this.red, "redMul works only with red numbers");
this.red._verify2(this, e);
return this.red.imul(this, e);
};
a.prototype.redSqr = function() {
r(this.red, "redSqr works only with red numbers");
this.red._verify1(this);
return this.red.sqr(this);
};
a.prototype.redISqr = function() {
r(this.red, "redISqr works only with red numbers");
this.red._verify1(this);
return this.red.isqr(this);
};
a.prototype.redSqrt = function() {
r(this.red, "redSqrt works only with red numbers");
this.red._verify1(this);
return this.red.sqrt(this);
};
a.prototype.redInvm = function() {
r(this.red, "redInvm works only with red numbers");
this.red._verify1(this);
return this.red.invm(this);
};
a.prototype.redNeg = function() {
r(this.red, "redNeg works only with red numbers");
this.red._verify1(this);
return this.red.neg(this);
};
a.prototype.redPow = function(e) {
r(this.red && !e.red, "redPow(normalNum)");
this.red._verify1(this);
return this.red.pow(this, e);
};
var S = {
k256: null,
p224: null,
p192: null,
p25519: null
};
function k(e, t) {
this.name = e;
this.p = new a(t, 16);
this.n = this.p.bitLength();
this.k = new a(1).iushln(this.n).isub(this.p);
this.tmp = this._tmp();
}
k.prototype._tmp = function() {
var e = new a(null);
e.words = new Array(Math.ceil(this.n / 13));
return e;
};
k.prototype.ireduce = function(e) {
var t, i = e;
do {
this.split(i, this.tmp);
t = (i = (i = this.imulK(i)).iadd(this.tmp)).bitLength();
} while (t > this.n);
var r = t < this.n ? -1 : i.ucmp(this.p);
if (0 === r) {
i.words[0] = 0;
i.length = 1;
} else r > 0 ? i.isub(this.p) : void 0 !== i.strip ? i.strip() : i._strip();
return i;
};
k.prototype.split = function(e, t) {
e.iushrn(this.n, 0, t);
};
k.prototype.imulK = function(e) {
return e.imul(this.k);
};
function M() {
k.call(this, "k256", "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f");
}
n(M, k);
M.prototype.split = function(e, t) {
for (var i = Math.min(e.length, 9), r = 0; r < i; r++) t.words[r] = e.words[r];
t.length = i;
if (e.length <= 9) {
e.words[0] = 0;
e.length = 1;
} else {
var n = e.words[9];
t.words[t.length++] = 4194303 & n;
for (r = 10; r < e.length; r++) {
var a = 0 | e.words[r];
e.words[r - 10] = (4194303 & a) << 4 | n >>> 22;
n = a;
}
n >>>= 22;
e.words[r - 10] = n;
0 === n && e.length > 10 ? e.length -= 10 : e.length -= 9;
}
};
M.prototype.imulK = function(e) {
e.words[e.length] = 0;
e.words[e.length + 1] = 0;
e.length += 2;
for (var t = 0, i = 0; i < e.length; i++) {
var r = 0 | e.words[i];
t += 977 * r;
e.words[i] = 67108863 & t;
t = 64 * r + (t / 67108864 | 0);
}
if (0 === e.words[e.length - 1]) {
e.length--;
0 === e.words[e.length - 1] && e.length--;
}
return e;
};
function A() {
k.call(this, "p224", "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001");
}
n(A, k);
function I() {
k.call(this, "p192", "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff");
}
n(I, k);
function E() {
k.call(this, "25519", "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed");
}
n(E, k);
E.prototype.imulK = function(e) {
for (var t = 0, i = 0; i < e.length; i++) {
var r = 19 * (0 | e.words[i]) + t, n = 67108863 & r;
r >>>= 26;
e.words[i] = n;
t = r;
}
0 !== t && (e.words[e.length++] = t);
return e;
};
a._prime = function(e) {
if (S[e]) return S[e];
var t;
if ("k256" === e) t = new M(); else if ("p224" === e) t = new A(); else if ("p192" === e) t = new I(); else {
if ("p25519" !== e) throw new Error("Unknown prime " + e);
t = new E();
}
S[e] = t;
return t;
};
function P(e) {
if ("string" == typeof e) {
var t = a._prime(e);
this.m = t.p;
this.prime = t;
} else {
r(e.gtn(1), "modulus must be greater than 1");
this.m = e;
this.prime = null;
}
}
P.prototype._verify1 = function(e) {
r(0 === e.negative, "red works only with positives");
r(e.red, "red works only with red numbers");
};
P.prototype._verify2 = function(e, t) {
r(0 == (e.negative | t.negative), "red works only with positives");
r(e.red && e.red === t.red, "red works only with red numbers");
};
P.prototype.imod = function(e) {
if (this.prime) return this.prime.ireduce(e)._forceRed(this);
h(e, e.umod(this.m)._forceRed(this));
return e;
};
P.prototype.neg = function(e) {
return e.isZero() ? e.clone() : this.m.sub(e)._forceRed(this);
};
P.prototype.add = function(e, t) {
this._verify2(e, t);
var i = e.add(t);
i.cmp(this.m) >= 0 && i.isub(this.m);
return i._forceRed(this);
};
P.prototype.iadd = function(e, t) {
this._verify2(e, t);
var i = e.iadd(t);
i.cmp(this.m) >= 0 && i.isub(this.m);
return i;
};
P.prototype.sub = function(e, t) {
this._verify2(e, t);
var i = e.sub(t);
i.cmpn(0) < 0 && i.iadd(this.m);
return i._forceRed(this);
};
P.prototype.isub = function(e, t) {
this._verify2(e, t);
var i = e.isub(t);
i.cmpn(0) < 0 && i.iadd(this.m);
return i;
};
P.prototype.shl = function(e, t) {
this._verify1(e);
return this.imod(e.ushln(t));
};
P.prototype.imul = function(e, t) {
this._verify2(e, t);
return this.imod(e.imul(t));
};
P.prototype.mul = function(e, t) {
this._verify2(e, t);
return this.imod(e.mul(t));
};
P.prototype.isqr = function(e) {
return this.imul(e, e.clone());
};
P.prototype.sqr = function(e) {
return this.mul(e, e);
};
P.prototype.sqrt = function(e) {
if (e.isZero()) return e.clone();
var t = this.m.andln(3);
r(t % 2 == 1);
if (3 === t) {
var i = this.m.add(new a(1)).iushrn(2);
return this.pow(e, i);
}
for (var n = this.m.subn(1), s = 0; !n.isZero() && 0 === n.andln(1); ) {
s++;
n.iushrn(1);
}
r(!n.isZero());
var o = new a(1).toRed(this), c = o.redNeg(), f = this.m.subn(1).iushrn(1), h = this.m.bitLength();
h = new a(2 * h * h).toRed(this);
for (;0 !== this.pow(h, f).cmp(c); ) h.redIAdd(c);
for (var u = this.pow(h, n), d = this.pow(e, n.addn(1).iushrn(1)), l = this.pow(e, n), p = s; 0 !== l.cmp(o); ) {
for (var b = l, g = 0; 0 !== b.cmp(o); g++) b = b.redSqr();
r(g < p);
var m = this.pow(u, new a(1).iushln(p - g - 1));
d = d.redMul(m);
u = m.redSqr();
l = l.redMul(u);
p = g;
}
return d;
};
P.prototype.invm = function(e) {
var t = e._invmp(this.m);
if (0 !== t.negative) {
t.negative = 0;
return this.imod(t).redNeg();
}
return this.imod(t);
};
P.prototype.pow = function(e, t) {
if (t.isZero()) return new a(1).toRed(this);
if (0 === t.cmpn(1)) return e.clone();
var i = new Array(16);
i[0] = new a(1).toRed(this);
i[1] = e;
for (var r = 2; r < i.length; r++) i[r] = this.mul(i[r - 1], e);
var n = i[0], s = 0, o = 0, c = t.bitLength() % 26;
0 === c && (c = 26);
for (r = t.length - 1; r >= 0; r--) {
for (var f = t.words[r], h = c - 1; h >= 0; h--) {
var u = f >> h & 1;
n !== i[0] && (n = this.sqr(n));
if (0 !== u || 0 !== s) {
s <<= 1;
s |= u;
if (4 == ++o || 0 === r && 0 === h) {
n = this.mul(n, i[s]);
o = 0;
s = 0;
}
} else o = 0;
}
c = 26;
}
return n;
};
P.prototype.convertTo = function(e) {
var t = e.umod(this.m);
return t === e ? t.clone() : t;
};
P.prototype.convertFrom = function(e) {
var t = e.clone();
t.red = null;
return t;
};
a.mont = function(e) {
return new C(e);
};
function C(e) {
P.call(this, e);
this.shift = this.m.bitLength();
this.shift % 26 != 0 && (this.shift += 26 - this.shift % 26);
this.r = new a(1).iushln(this.shift);
this.r2 = this.imod(this.r.sqr());
this.rinv = this.r._invmp(this.m);
this.minv = this.rinv.mul(this.r).isubn(1).div(this.m);
this.minv = this.minv.umod(this.r);
this.minv = this.r.sub(this.minv);
}
n(C, P);
C.prototype.convertTo = function(e) {
return this.imod(e.ushln(this.shift));
};
C.prototype.convertFrom = function(e) {
var t = this.imod(e.mul(this.rinv));
t.red = null;
return t;
};
C.prototype.imul = function(e, t) {
if (e.isZero() || t.isZero()) {
e.words[0] = 0;
e.length = 1;
return e;
}
var i = e.imul(t), r = i.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m), n = i.isub(r).iushrn(this.shift), a = n;
n.cmp(this.m) >= 0 ? a = n.isub(this.m) : n.cmpn(0) < 0 && (a = n.iadd(this.m));
return a._forceRed(this);
};
C.prototype.mul = function(e, t) {
if (e.isZero() || t.isZero()) return new a(0)._forceRed(this);
var i = e.mul(t), r = i.maskn(this.shift).mul(this.minv).imaskn(this.shift).mul(this.m), n = i.isub(r).iushrn(this.shift), s = n;
n.cmp(this.m) >= 0 ? s = n.isub(this.m) : n.cmpn(0) < 0 && (s = n.iadd(this.m));
return s._forceRed(this);
};
C.prototype.invm = function(e) {
return this.imod(e._invmp(this.m).mul(this.r2))._forceRed(this);
};
})("undefined" == typeof t || t, this);
}, {
buffer: 19
} ],
18: [ function(e, t) {
var i;
t.exports = function(e) {
i || (i = new r(null));
return i.generate(e);
};
function r(e) {
this.rand = e;
}
t.exports.Rand = r;
r.prototype.generate = function(e) {
return this._rand(e);
};
r.prototype._rand = function(e) {
if (this.rand.getBytes) return this.rand.getBytes(e);
for (var t = new Uint8Array(e), i = 0; i < t.length; i++) t[i] = this.rand.getByte();
return t;
};
if ("object" == typeof self) self.crypto && self.crypto.getRandomValues ? r.prototype._rand = function(e) {
var t = new Uint8Array(e);
self.crypto.getRandomValues(t);
return t;
} : self.msCrypto && self.msCrypto.getRandomValues ? r.prototype._rand = function(e) {
var t = new Uint8Array(e);
self.msCrypto.getRandomValues(t);
return t;
} : "object" == typeof window && (r.prototype._rand = function() {
throw new Error("Not implemented yet");
}); else try {
var n = e("crypto");
if ("function" != typeof n.randomBytes) throw new Error("Not supported");
r.prototype._rand = function(e) {
return n.randomBytes(e);
};
} catch (e) {}
}, {
crypto: 19
} ],
19: [ function() {}, {} ],
20: [ function(e, t) {
var i = e("safe-buffer").Buffer;
function r(e) {
i.isBuffer(e) || (e = i.from(e));
for (var t = e.length / 4 | 0, r = new Array(t), n = 0; n < t; n++) r[n] = e.readUInt32BE(4 * n);
return r;
}
function n(e) {
for (;0 < e.length; e++) e[0] = 0;
}
function a(e, t, i, r, n) {
for (var a, s, o, c, f = i[0], h = i[1], u = i[2], d = i[3], l = e[0] ^ t[0], p = e[1] ^ t[1], b = e[2] ^ t[2], g = e[3] ^ t[3], m = 4, v = 1; v < n; v++) {
a = f[l >>> 24] ^ h[p >>> 16 & 255] ^ u[b >>> 8 & 255] ^ d[255 & g] ^ t[m++];
s = f[p >>> 24] ^ h[b >>> 16 & 255] ^ u[g >>> 8 & 255] ^ d[255 & l] ^ t[m++];
o = f[b >>> 24] ^ h[g >>> 16 & 255] ^ u[l >>> 8 & 255] ^ d[255 & p] ^ t[m++];
c = f[g >>> 24] ^ h[l >>> 16 & 255] ^ u[p >>> 8 & 255] ^ d[255 & b] ^ t[m++];
l = a;
p = s;
b = o;
g = c;
}
a = (r[l >>> 24] << 24 | r[p >>> 16 & 255] << 16 | r[b >>> 8 & 255] << 8 | r[255 & g]) ^ t[m++];
s = (r[p >>> 24] << 24 | r[b >>> 16 & 255] << 16 | r[g >>> 8 & 255] << 8 | r[255 & l]) ^ t[m++];
o = (r[b >>> 24] << 24 | r[g >>> 16 & 255] << 16 | r[l >>> 8 & 255] << 8 | r[255 & p]) ^ t[m++];
c = (r[g >>> 24] << 24 | r[l >>> 16 & 255] << 16 | r[p >>> 8 & 255] << 8 | r[255 & b]) ^ t[m++];
return [ a >>>= 0, s >>>= 0, o >>>= 0, c >>>= 0 ];
}
var s = [ 0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54 ], o = function() {
for (var e = new Array(256), t = 0; t < 256; t++) e[t] = t < 128 ? t << 1 : t << 1 ^ 283;
for (var i = [], r = [], n = [ [], [], [], [] ], a = [ [], [], [], [] ], s = 0, o = 0, c = 0; c < 256; ++c) {
var f = o ^ o << 1 ^ o << 2 ^ o << 3 ^ o << 4;
f = f >>> 8 ^ 255 & f ^ 99;
i[s] = f;
r[f] = s;
var h = e[s], u = e[h], d = e[u], l = 257 * e[f] ^ 16843008 * f;
n[0][s] = l << 24 | l >>> 8;
n[1][s] = l << 16 | l >>> 16;
n[2][s] = l << 8 | l >>> 24;
n[3][s] = l;
l = 16843009 * d ^ 65537 * u ^ 257 * h ^ 16843008 * s;
a[0][f] = l << 24 | l >>> 8;
a[1][f] = l << 16 | l >>> 16;
a[2][f] = l << 8 | l >>> 24;
a[3][f] = l;
if (0 === s) s = o = 1; else {
s = h ^ e[e[e[d ^ h]]];
o ^= e[e[o]];
}
}
return {
SBOX: i,
INV_SBOX: r,
SUB_MIX: n,
INV_SUB_MIX: a
};
}();
function c(e) {
this._key = r(e);
this._reset();
}
c.blockSize = 16;
c.keySize = 32;
c.prototype.blockSize = c.blockSize;
c.prototype.keySize = c.keySize;
c.prototype._reset = function() {
for (var e = this._key, t = e.length, i = t + 6, r = 4 * (i + 1), n = [], a = 0; a < t; a++) n[a] = e[a];
for (a = t; a < r; a++) {
var c = n[a - 1];
if (a % t == 0) {
c = c << 8 | c >>> 24;
c = o.SBOX[c >>> 24] << 24 | o.SBOX[c >>> 16 & 255] << 16 | o.SBOX[c >>> 8 & 255] << 8 | o.SBOX[255 & c];
c ^= s[a / t | 0] << 24;
} else t > 6 && a % t == 4 && (c = o.SBOX[c >>> 24] << 24 | o.SBOX[c >>> 16 & 255] << 16 | o.SBOX[c >>> 8 & 255] << 8 | o.SBOX[255 & c]);
n[a] = n[a - t] ^ c;
}
for (var f = [], h = 0; h < r; h++) {
var u = r - h, d = n[u - (h % 4 ? 0 : 4)];
f[h] = h < 4 || u <= 4 ? d : o.INV_SUB_MIX[0][o.SBOX[d >>> 24]] ^ o.INV_SUB_MIX[1][o.SBOX[d >>> 16 & 255]] ^ o.INV_SUB_MIX[2][o.SBOX[d >>> 8 & 255]] ^ o.INV_SUB_MIX[3][o.SBOX[255 & d]];
}
this._nRounds = i;
this._keySchedule = n;
this._invKeySchedule = f;
};
c.prototype.encryptBlockRaw = function(e) {
return a(e = r(e), this._keySchedule, o.SUB_MIX, o.SBOX, this._nRounds);
};
c.prototype.encryptBlock = function(e) {
var t = this.encryptBlockRaw(e), r = i.allocUnsafe(16);
r.writeUInt32BE(t[0], 0);
r.writeUInt32BE(t[1], 4);
r.writeUInt32BE(t[2], 8);
r.writeUInt32BE(t[3], 12);
return r;
};
c.prototype.decryptBlock = function(e) {
var t = (e = r(e))[1];
e[1] = e[3];
e[3] = t;
var n = a(e, this._invKeySchedule, o.INV_SUB_MIX, o.INV_SBOX, this._nRounds), s = i.allocUnsafe(16);
s.writeUInt32BE(n[0], 0);
s.writeUInt32BE(n[3], 4);
s.writeUInt32BE(n[2], 8);
s.writeUInt32BE(n[1], 12);
return s;
};
c.prototype.scrub = function() {
n(this._keySchedule);
n(this._invKeySchedule);
n(this._key);
};
t.exports.AES = c;
}, {
"safe-buffer": 182
} ],
21: [ function(e, t) {
var i = e("./aes"), r = e("safe-buffer").Buffer, n = e("cipher-base"), a = e("inherits"), s = e("./ghash"), o = e("buffer-xor"), c = e("./incr32");
function f(e, t) {
var i = 0;
e.length !== t.length && i++;
for (var r = Math.min(e.length, t.length), n = 0; n < r; ++n) i += e[n] ^ t[n];
return i;
}
function h(e, t, i) {
if (12 === t.length) {
e._finID = r.concat([ t, r.from([ 0, 0, 0, 1 ]) ]);
return r.concat([ t, r.from([ 0, 0, 0, 2 ]) ]);
}
var n = new s(i), a = t.length, o = a % 16;
n.update(t);
if (o) {
o = 16 - o;
n.update(r.alloc(o, 0));
}
n.update(r.alloc(8, 0));
var f = 8 * a, h = r.alloc(8);
h.writeUIntBE(f, 0, 8);
n.update(h);
e._finID = n.state;
var u = r.from(e._finID);
c(u);
return u;
}
function u(e, t, a, o) {
n.call(this);
var c = r.alloc(4, 0);
this._cipher = new i.AES(t);
var f = this._cipher.encryptBlock(c);
this._ghash = new s(f);
a = h(this, a, f);
this._prev = r.from(a);
this._cache = r.allocUnsafe(0);
this._secCache = r.allocUnsafe(0);
this._decrypt = o;
this._alen = 0;
this._len = 0;
this._mode = e;
this._authTag = null;
this._called = !1;
}
a(u, n);
u.prototype._update = function(e) {
if (!this._called && this._alen) {
var t = 16 - this._alen % 16;
if (t < 16) {
t = r.alloc(t, 0);
this._ghash.update(t);
}
}
this._called = !0;
var i = this._mode.encrypt(this, e);
this._decrypt ? this._ghash.update(e) : this._ghash.update(i);
this._len += e.length;
return i;
};
u.prototype._final = function() {
if (this._decrypt && !this._authTag) throw new Error("Unsupported state or unable to authenticate data");
var e = o(this._ghash.final(8 * this._alen, 8 * this._len), this._cipher.encryptBlock(this._finID));
if (this._decrypt && f(e, this._authTag)) throw new Error("Unsupported state or unable to authenticate data");
this._authTag = e;
this._cipher.scrub();
};
u.prototype.getAuthTag = function() {
if (this._decrypt || !r.isBuffer(this._authTag)) throw new Error("Attempting to get auth tag in unsupported state");
return this._authTag;
};
u.prototype.setAuthTag = function(e) {
if (!this._decrypt) throw new Error("Attempting to set auth tag in unsupported state");
this._authTag = e;
};
u.prototype.setAAD = function(e) {
if (this._called) throw new Error("Attempting to set AAD in unsupported state");
this._ghash.update(e);
this._alen += e.length;
};
t.exports = u;
}, {
"./aes": 20,
"./ghash": 25,
"./incr32": 26,
"buffer-xor": 64,
"cipher-base": 67,
inherits: 138,
"safe-buffer": 182
} ],
22: [ function(e, t, i) {
var r = e("./encrypter"), n = e("./decrypter"), a = e("./modes/list.json");
i.createCipher = i.Cipher = r.createCipher;
i.createCipheriv = i.Cipheriv = r.createCipheriv;
i.createDecipher = i.Decipher = n.createDecipher;
i.createDecipheriv = i.Decipheriv = n.createDecipheriv;
i.listCiphers = i.getCiphers = function() {
return Object.keys(a);
};
}, {
"./decrypter": 23,
"./encrypter": 24,
"./modes/list.json": 34
} ],
23: [ function(e, t, i) {
var r = e("./authCipher"), n = e("safe-buffer").Buffer, a = e("./modes"), s = e("./streamCipher"), o = e("cipher-base"), c = e("./aes"), f = e("evp_bytestokey");
function h(e, t, i) {
o.call(this);
this._cache = new u();
this._last = void 0;
this._cipher = new c.AES(t);
this._prev = n.from(i);
this._mode = e;
this._autopadding = !0;
}
e("inherits")(h, o);
h.prototype._update = function(e) {
this._cache.add(e);
for (var t, i, r = []; t = this._cache.get(this._autopadding); ) {
i = this._mode.decrypt(this, t);
r.push(i);
}
return n.concat(r);
};
h.prototype._final = function() {
var e = this._cache.flush();
if (this._autopadding) return d(this._mode.decrypt(this, e));
if (e) throw new Error("data not multiple of block length");
};
h.prototype.setAutoPadding = function(e) {
this._autopadding = !!e;
return this;
};
function u() {
this.cache = n.allocUnsafe(0);
}
u.prototype.add = function(e) {
this.cache = n.concat([ this.cache, e ]);
};
u.prototype.get = function(e) {
var t;
if (e) {
if (this.cache.length > 16) {
t = this.cache.slice(0, 16);
this.cache = this.cache.slice(16);
return t;
}
} else if (this.cache.length >= 16) {
t = this.cache.slice(0, 16);
this.cache = this.cache.slice(16);
return t;
}
return null;
};
u.prototype.flush = function() {
if (this.cache.length) return this.cache;
};
function d(e) {
var t = e[15];
if (t < 1 || t > 16) throw new Error("unable to decrypt data");
for (var i = -1; ++i < t; ) if (e[i + (16 - t)] !== t) throw new Error("unable to decrypt data");
if (16 !== t) return e.slice(0, 16 - t);
}
function l(e, t, i) {
var o = a[e.toLowerCase()];
if (!o) throw new TypeError("invalid suite type");
"string" == typeof i && (i = n.from(i));
if ("GCM" !== o.mode && i.length !== o.iv) throw new TypeError("invalid iv length " + i.length);
"string" == typeof t && (t = n.from(t));
if (t.length !== o.key / 8) throw new TypeError("invalid key length " + t.length);
return "stream" === o.type ? new s(o.module, t, i, !0) : "auth" === o.type ? new r(o.module, t, i, !0) : new h(o.module, t, i);
}
i.createDecipher = function(e, t) {
var i = a[e.toLowerCase()];
if (!i) throw new TypeError("invalid suite type");
var r = f(t, !1, i.key, i.iv);
return l(e, r.key, r.iv);
};
i.createDecipheriv = l;
}, {
"./aes": 20,
"./authCipher": 21,
"./modes": 33,
"./streamCipher": 36,
"cipher-base": 67,
evp_bytestokey: 105,
inherits: 138,
"safe-buffer": 182
} ],
24: [ function(e, t, i) {
var r = e("./modes"), n = e("./authCipher"), a = e("safe-buffer").Buffer, s = e("./streamCipher"), o = e("cipher-base"), c = e("./aes"), f = e("evp_bytestokey");
function h(e, t, i) {
o.call(this);
this._cache = new d();
this._cipher = new c.AES(t);
this._prev = a.from(i);
this._mode = e;
this._autopadding = !0;
}
e("inherits")(h, o);
h.prototype._update = function(e) {
this._cache.add(e);
for (var t, i, r = []; t = this._cache.get(); ) {
i = this._mode.encrypt(this, t);
r.push(i);
}
return a.concat(r);
};
var u = a.alloc(16, 16);
h.prototype._final = function() {
var e = this._cache.flush();
if (this._autopadding) {
e = this._mode.encrypt(this, e);
this._cipher.scrub();
return e;
}
if (!e.equals(u)) {
this._cipher.scrub();
throw new Error("data not multiple of block length");
}
};
h.prototype.setAutoPadding = function(e) {
this._autopadding = !!e;
return this;
};
function d() {
this.cache = a.allocUnsafe(0);
}
d.prototype.add = function(e) {
this.cache = a.concat([ this.cache, e ]);
};
d.prototype.get = function() {
if (this.cache.length > 15) {
var e = this.cache.slice(0, 16);
this.cache = this.cache.slice(16);
return e;
}
return null;
};
d.prototype.flush = function() {
for (var e = 16 - this.cache.length, t = a.allocUnsafe(e), i = -1; ++i < e; ) t.writeUInt8(e, i);
return a.concat([ this.cache, t ]);
};
function l(e, t, i) {
var o = r[e.toLowerCase()];
if (!o) throw new TypeError("invalid suite type");
"string" == typeof t && (t = a.from(t));
if (t.length !== o.key / 8) throw new TypeError("invalid key length " + t.length);
"string" == typeof i && (i = a.from(i));
if ("GCM" !== o.mode && i.length !== o.iv) throw new TypeError("invalid iv length " + i.length);
return "stream" === o.type ? new s(o.module, t, i) : "auth" === o.type ? new n(o.module, t, i) : new h(o.module, t, i);
}
i.createCipheriv = l;
i.createCipher = function(e, t) {
var i = r[e.toLowerCase()];
if (!i) throw new TypeError("invalid suite type");
var n = f(t, !1, i.key, i.iv);
return l(e, n.key, n.iv);
};
}, {
"./aes": 20,
"./authCipher": 21,
"./modes": 33,
"./streamCipher": 36,
"cipher-base": 67,
evp_bytestokey: 105,
inherits: 138,
"safe-buffer": 182
} ],
25: [ function(e, t) {
var i = e("safe-buffer").Buffer, r = i.alloc(16, 0);
function n(e) {
var t = i.allocUnsafe(16);
t.writeUInt32BE(e[0] >>> 0, 0);
t.writeUInt32BE(e[1] >>> 0, 4);
t.writeUInt32BE(e[2] >>> 0, 8);
t.writeUInt32BE(e[3] >>> 0, 12);
return t;
}
function a(e) {
this.h = e;
this.state = i.alloc(16, 0);
this.cache = i.allocUnsafe(0);
}
a.prototype.ghash = function(e) {
for (var t = -1; ++t < e.length; ) this.state[t] ^= e[t];
this._multiply();
};
a.prototype._multiply = function() {
for (var e, t, i, r = [ (e = this.h).readUInt32BE(0), e.readUInt32BE(4), e.readUInt32BE(8), e.readUInt32BE(12) ], a = [ 0, 0, 0, 0 ], s = -1; ++s < 128; ) {
if (0 != (this.state[~~(s / 8)] & 1 << 7 - s % 8)) {
a[0] ^= r[0];
a[1] ^= r[1];
a[2] ^= r[2];
a[3] ^= r[3];
}
i = 0 != (1 & r[3]);
for (t = 3; t > 0; t--) r[t] = r[t] >>> 1 | (1 & r[t - 1]) << 31;
r[0] = r[0] >>> 1;
i && (r[0] = r[0] ^ 225 << 24);
}
this.state = n(a);
};
a.prototype.update = function(e) {
this.cache = i.concat([ this.cache, e ]);
for (var t; this.cache.length >= 16; ) {
t = this.cache.slice(0, 16);
this.cache = this.cache.slice(16);
this.ghash(t);
}
};
a.prototype.final = function(e, t) {
this.cache.length && this.ghash(i.concat([ this.cache, r ], 16));
this.ghash(n([ 0, e, 0, t ]));
return this.state;
};
t.exports = a;
}, {
"safe-buffer": 182
} ],
26: [ function(e, t) {
t.exports = function(e) {
for (var t, i = e.length; i--; ) {
if (255 !== (t = e.readUInt8(i))) {
t++;
e.writeUInt8(t, i);
break;
}
e.writeUInt8(0, i);
}
};
}, {} ],
27: [ function(e, t, i) {
var r = e("buffer-xor");
i.encrypt = function(e, t) {
var i = r(t, e._prev);
e._prev = e._cipher.encryptBlock(i);
return e._prev;
};
i.decrypt = function(e, t) {
var i = e._prev;
e._prev = t;
var n = e._cipher.decryptBlock(t);
return r(n, i);
};
}, {
"buffer-xor": 64
} ],
28: [ function(e, t, i) {
var r = e("safe-buffer").Buffer, n = e("buffer-xor");
function a(e, t, i) {
var a = t.length, s = n(t, e._cache);
e._cache = e._cache.slice(a);
e._prev = r.concat([ e._prev, i ? t : s ]);
return s;
}
i.encrypt = function(e, t, i) {
for (var n, s = r.allocUnsafe(0); t.length; ) {
if (0 === e._cache.length) {
e._cache = e._cipher.encryptBlock(e._prev);
e._prev = r.allocUnsafe(0);
}
if (!(e._cache.length <= t.length)) {
s = r.concat([ s, a(e, t, i) ]);
break;
}
n = e._cache.length;
s = r.concat([ s, a(e, t.slice(0, n), i) ]);
t = t.slice(n);
}
return s;
};
}, {
"buffer-xor": 64,
"safe-buffer": 182
} ],
29: [ function(e, t, i) {
var r = e("safe-buffer").Buffer;
function n(e, t, i) {
for (var r, n, s = -1, o = 0; ++s < 8; ) {
r = t & 1 << 7 - s ? 128 : 0;
o += (128 & (n = e._cipher.encryptBlock(e._prev)[0] ^ r)) >> s % 8;
e._prev = a(e._prev, i ? r : n);
}
return o;
}
function a(e, t) {
var i = e.length, n = -1, a = r.allocUnsafe(e.length);
e = r.concat([ e, r.from([ t ]) ]);
for (;++n < i; ) a[n] = e[n] << 1 | e[n + 1] >> 7;
return a;
}
i.encrypt = function(e, t, i) {
for (var a = t.length, s = r.allocUnsafe(a), o = -1; ++o < a; ) s[o] = n(e, t[o], i);
return s;
};
}, {
"safe-buffer": 182
} ],
30: [ function(e, t, i) {
var r = e("safe-buffer").Buffer;
function n(e, t, i) {
var n = e._cipher.encryptBlock(e._prev)[0] ^ t;
e._prev = r.concat([ e._prev.slice(1), r.from([ i ? t : n ]) ]);
return n;
}
i.encrypt = function(e, t, i) {
for (var a = t.length, s = r.allocUnsafe(a), o = -1; ++o < a; ) s[o] = n(e, t[o], i);
return s;
};
}, {
"safe-buffer": 182
} ],
31: [ function(e, t, i) {
var r = e("buffer-xor"), n = e("safe-buffer").Buffer, a = e("../incr32");
function s(e) {
var t = e._cipher.encryptBlockRaw(e._prev);
a(e._prev);
return t;
}
i.encrypt = function(e, t) {
var i = Math.ceil(t.length / 16), a = e._cache.length;
e._cache = n.concat([ e._cache, n.allocUnsafe(16 * i) ]);
for (var o = 0; o < i; o++) {
var c = s(e), f = a + 16 * o;
e._cache.writeUInt32BE(c[0], f + 0);
e._cache.writeUInt32BE(c[1], f + 4);
e._cache.writeUInt32BE(c[2], f + 8);
e._cache.writeUInt32BE(c[3], f + 12);
}
var h = e._cache.slice(0, t.length);
e._cache = e._cache.slice(t.length);
return r(t, h);
};
}, {
"../incr32": 26,
"buffer-xor": 64,
"safe-buffer": 182
} ],
32: [ function(e, t, i) {
i.encrypt = function(e, t) {
return e._cipher.encryptBlock(t);
};
i.decrypt = function(e, t) {
return e._cipher.decryptBlock(t);
};
}, {} ],
33: [ function(e, t) {
var i = {
ECB: e("./ecb"),
CBC: e("./cbc"),
CFB: e("./cfb"),
CFB8: e("./cfb8"),
CFB1: e("./cfb1"),
OFB: e("./ofb"),
CTR: e("./ctr"),
GCM: e("./ctr")
}, r = e("./list.json");
for (var n in r) r[n].module = i[r[n].mode];
t.exports = r;
}, {
"./cbc": 27,
"./cfb": 28,
"./cfb1": 29,
"./cfb8": 30,
"./ctr": 31,
"./ecb": 32,
"./list.json": 34,
"./ofb": 35
} ],
34: [ function(e, t) {
t.exports = {
"aes-128-ecb": {
cipher: "AES",
key: 128,
iv: 0,
mode: "ECB",
type: "block"
},
"aes-192-ecb": {
cipher: "AES",
key: 192,
iv: 0,
mode: "ECB",
type: "block"
},
"aes-256-ecb": {
cipher: "AES",
key: 256,
iv: 0,
mode: "ECB",
type: "block"
},
"aes-128-cbc": {
cipher: "AES",
key: 128,
iv: 16,
mode: "CBC",
type: "block"
},
"aes-192-cbc": {
cipher: "AES",
key: 192,
iv: 16,
mode: "CBC",
type: "block"
},
"aes-256-cbc": {
cipher: "AES",
key: 256,
iv: 16,
mode: "CBC",
type: "block"
},
aes128: {
cipher: "AES",
key: 128,
iv: 16,
mode: "CBC",
type: "block"
},
aes192: {
cipher: "AES",
key: 192,
iv: 16,
mode: "CBC",
type: "block"
},
aes256: {
cipher: "AES",
key: 256,
iv: 16,
mode: "CBC",
type: "block"
},
"aes-128-cfb": {
cipher: "AES",
key: 128,
iv: 16,
mode: "CFB",
type: "stream"
},
"aes-192-cfb": {
cipher: "AES",
key: 192,
iv: 16,
mode: "CFB",
type: "stream"
},
"aes-256-cfb": {
cipher: "AES",
key: 256,
iv: 16,
mode: "CFB",
type: "stream"
},
"aes-128-cfb8": {
cipher: "AES",
key: 128,
iv: 16,
mode: "CFB8",
type: "stream"
},
"aes-192-cfb8": {
cipher: "AES",
key: 192,
iv: 16,
mode: "CFB8",
type: "stream"
},
"aes-256-cfb8": {
cipher: "AES",
key: 256,
iv: 16,
mode: "CFB8",
type: "stream"
},
"aes-128-cfb1": {
cipher: "AES",
key: 128,
iv: 16,
mode: "CFB1",
type: "stream"
},
"aes-192-cfb1": {
cipher: "AES",
key: 192,
iv: 16,
mode: "CFB1",
type: "stream"
},
"aes-256-cfb1": {
cipher: "AES",
key: 256,
iv: 16,
mode: "CFB1",
type: "stream"
},
"aes-128-ofb": {
cipher: "AES",
key: 128,
iv: 16,
mode: "OFB",
type: "stream"
},
"aes-192-ofb": {
cipher: "AES",
key: 192,
iv: 16,
mode: "OFB",
type: "stream"
},
"aes-256-ofb": {
cipher: "AES",
key: 256,
iv: 16,
mode: "OFB",
type: "stream"
},
"aes-128-ctr": {
cipher: "AES",
key: 128,
iv: 16,
mode: "CTR",
type: "stream"
},
"aes-192-ctr": {
cipher: "AES",
key: 192,
iv: 16,
mode: "CTR",
type: "stream"
},
"aes-256-ctr": {
cipher: "AES",
key: 256,
iv: 16,
mode: "CTR",
type: "stream"
},
"aes-128-gcm": {
cipher: "AES",
key: 128,
iv: 12,
mode: "GCM",
type: "auth"
},
"aes-192-gcm": {
cipher: "AES",
key: 192,
iv: 12,
mode: "GCM",
type: "auth"
},
"aes-256-gcm": {
cipher: "AES",
key: 256,
iv: 12,
mode: "GCM",
type: "auth"
}
};
}, {} ],
35: [ function(e, t, i) {
(function(t) {
var r = e("buffer-xor");
function n(e) {
e._prev = e._cipher.encryptBlock(e._prev);
return e._prev;
}
i.encrypt = function(e, i) {
for (;e._cache.length < i.length; ) e._cache = t.concat([ e._cache, n(e) ]);
var a = e._cache.slice(0, i.length);
e._cache = e._cache.slice(i.length);
return r(i, a);
};
}).call(this, e("buffer").Buffer);
}, {
buffer: 65,
"buffer-xor": 64
} ],
36: [ function(e, t) {
var i = e("./aes"), r = e("safe-buffer").Buffer, n = e("cipher-base");
function a(e, t, a, s) {
n.call(this);
this._cipher = new i.AES(t);
this._prev = r.from(a);
this._cache = r.allocUnsafe(0);
this._secCache = r.allocUnsafe(0);
this._decrypt = s;
this._mode = e;
}
e("inherits")(a, n);
a.prototype._update = function(e) {
return this._mode.encrypt(this, e, this._decrypt);
};
a.prototype._final = function() {
this._cipher.scrub();
};
t.exports = a;
}, {
"./aes": 20,
"cipher-base": 67,
inherits: 138,
"safe-buffer": 182
} ],
37: [ function(e, t, i) {
var r = e("browserify-des"), n = e("browserify-aes/browser"), a = e("browserify-aes/modes"), s = e("browserify-des/modes"), o = e("evp_bytestokey");
function c(e, t, i) {
e = e.toLowerCase();
if (a[e]) return n.createCipheriv(e, t, i);
if (s[e]) return new r({
key: t,
iv: i,
mode: e
});
throw new TypeError("invalid suite type");
}
function f(e, t, i) {
e = e.toLowerCase();
if (a[e]) return n.createDecipheriv(e, t, i);
if (s[e]) return new r({
key: t,
iv: i,
mode: e,
decrypt: !0
});
throw new TypeError("invalid suite type");
}
i.createCipher = i.Cipher = function(e, t) {
e = e.toLowerCase();
var i, r;
if (a[e]) {
i = a[e].key;
r = a[e].iv;
} else {
if (!s[e]) throw new TypeError("invalid suite type");
i = 8 * s[e].key;
r = s[e].iv;
}
var n = o(t, !1, i, r);
return c(e, n.key, n.iv);
};
i.createCipheriv = i.Cipheriv = c;
i.createDecipher = i.Decipher = function(e, t) {
e = e.toLowerCase();
var i, r;
if (a[e]) {
i = a[e].key;
r = a[e].iv;
} else {
if (!s[e]) throw new TypeError("invalid suite type");
i = 8 * s[e].key;
r = s[e].iv;
}
var n = o(t, !1, i, r);
return f(e, n.key, n.iv);
};
i.createDecipheriv = i.Decipheriv = f;
i.listCiphers = i.getCiphers = function() {
return Object.keys(s).concat(n.getCiphers());
};
}, {
"browserify-aes/browser": 22,
"browserify-aes/modes": 33,
"browserify-des": 38,
"browserify-des/modes": 39,
evp_bytestokey: 105
} ],
38: [ function(e, t) {
var i = e("cipher-base"), r = e("des.js"), n = e("inherits"), a = e("safe-buffer").Buffer, s = {
"des-ede3-cbc": r.CBC.instantiate(r.EDE),
"des-ede3": r.EDE,
"des-ede-cbc": r.CBC.instantiate(r.EDE),
"des-ede": r.EDE,
"des-cbc": r.CBC.instantiate(r.DES),
"des-ecb": r.DES
};
s.des = s["des-cbc"];
s.des3 = s["des-ede3-cbc"];
t.exports = o;
n(o, i);
function o(e) {
i.call(this);
var t, r = e.mode.toLowerCase(), n = s[r];
t = e.decrypt ? "decrypt" : "encrypt";
var o = e.key;
a.isBuffer(o) || (o = a.from(o));
"des-ede" !== r && "des-ede-cbc" !== r || (o = a.concat([ o, o.slice(0, 8) ]));
var c = e.iv;
a.isBuffer(c) || (c = a.from(c));
this._des = n.create({
key: o,
iv: c,
type: t
});
}
o.prototype._update = function(e) {
return a.from(this._des.update(e));
};
o.prototype._final = function() {
return a.from(this._des.final());
};
}, {
"cipher-base": 67,
"des.js": 76,
inherits: 138,
"safe-buffer": 182
} ],
39: [ function(e, t, i) {
i["des-ecb"] = {
key: 8,
iv: 0
};
i["des-cbc"] = i.des = {
key: 8,
iv: 8
};
i["des-ede3-cbc"] = i.des3 = {
key: 24,
iv: 8
};
i["des-ede3"] = {
key: 24,
iv: 0
};
i["des-ede-cbc"] = {
key: 16,
iv: 8
};
i["des-ede"] = {
key: 16,
iv: 0
};
}, {} ],
40: [ function(e, t) {
(function(i) {
var r = e("bn.js"), n = e("randombytes");
function a(e) {
var t = s(e);
return {
blinder: t.toRed(r.mont(e.modulus)).redPow(new r(e.publicExponent)).fromRed(),
unblinder: t.invm(e.modulus)
};
}
function s(e) {
var t, i = e.modulus.byteLength();
do {
t = new r(n(i));
} while (t.cmp(e.modulus) >= 0 || !t.umod(e.prime1) || !t.umod(e.prime2));
return t;
}
function o(e, t) {
var n = a(t), s = t.modulus.byteLength(), o = new r(e).mul(n.blinder).umod(t.modulus), c = o.toRed(r.mont(t.prime1)), f = o.toRed(r.mont(t.prime2)), h = t.coefficient, u = t.prime1, d = t.prime2, l = c.redPow(t.exponent1).fromRed(), p = f.redPow(t.exponent2).fromRed(), b = l.isub(p).imul(h).umod(u).imul(d);
return p.iadd(b).imul(n.unblinder).umod(t.modulus).toArrayLike(i, "be", s);
}
o.getr = s;
t.exports = o;
}).call(this, e("buffer").Buffer);
}, {
"bn.js": 17,
buffer: 65,
randombytes: 164
} ],
41: [ function(e, t) {
t.exports = e("./browser/algorithms.json");
}, {
"./browser/algorithms.json": 42
} ],
42: [ function(e, t) {
t.exports = {
sha224WithRSAEncryption: {
sign: "rsa",
hash: "sha224",
id: "302d300d06096086480165030402040500041c"
},
"RSA-SHA224": {
sign: "ecdsa/rsa",
hash: "sha224",
id: "302d300d06096086480165030402040500041c"
},
sha256WithRSAEncryption: {
sign: "rsa",
hash: "sha256",
id: "3031300d060960864801650304020105000420"
},
"RSA-SHA256": {
sign: "ecdsa/rsa",
hash: "sha256",
id: "3031300d060960864801650304020105000420"
},
sha384WithRSAEncryption: {
sign: "rsa",
hash: "sha384",
id: "3041300d060960864801650304020205000430"
},
"RSA-SHA384": {
sign: "ecdsa/rsa",
hash: "sha384",
id: "3041300d060960864801650304020205000430"
},
sha512WithRSAEncryption: {
sign: "rsa",
hash: "sha512",
id: "3051300d060960864801650304020305000440"
},
"RSA-SHA512": {
sign: "ecdsa/rsa",
hash: "sha512",
id: "3051300d060960864801650304020305000440"
},
"RSA-SHA1": {
sign: "rsa",
hash: "sha1",
id: "3021300906052b0e03021a05000414"
},
"ecdsa-with-SHA1": {
sign: "ecdsa",
hash: "sha1",
id: ""
},
sha256: {
sign: "ecdsa",
hash: "sha256",
id: ""
},
sha224: {
sign: "ecdsa",
hash: "sha224",
id: ""
},
sha384: {
sign: "ecdsa",
hash: "sha384",
id: ""
},
sha512: {
sign: "ecdsa",
hash: "sha512",
id: ""
},
"DSA-SHA": {
sign: "dsa",
hash: "sha1",
id: ""
},
"DSA-SHA1": {
sign: "dsa",
hash: "sha1",
id: ""
},
DSA: {
sign: "dsa",
hash: "sha1",
id: ""
},
"DSA-WITH-SHA224": {
sign: "dsa",
hash: "sha224",
id: ""
},
"DSA-SHA224": {
sign: "dsa",
hash: "sha224",
id: ""
},
"DSA-WITH-SHA256": {
sign: "dsa",
hash: "sha256",
id: ""
},
"DSA-SHA256": {
sign: "dsa",
hash: "sha256",
id: ""
},
"DSA-WITH-SHA384": {
sign: "dsa",
hash: "sha384",
id: ""
},
"DSA-SHA384": {
sign: "dsa",
hash: "sha384",
id: ""
},
"DSA-WITH-SHA512": {
sign: "dsa",
hash: "sha512",
id: ""
},
"DSA-SHA512": {
sign: "dsa",
hash: "sha512",
id: ""
},
"DSA-RIPEMD160": {
sign: "dsa",
hash: "rmd160",
id: ""
},
ripemd160WithRSA: {
sign: "rsa",
hash: "rmd160",
id: "3021300906052b2403020105000414"
},
"RSA-RIPEMD160": {
sign: "rsa",
hash: "rmd160",
id: "3021300906052b2403020105000414"
},
md5WithRSAEncryption: {
sign: "rsa",
hash: "md5",
id: "3020300c06082a864886f70d020505000410"
},
"RSA-MD5": {
sign: "rsa",
hash: "md5",
id: "3020300c06082a864886f70d020505000410"
}
};
}, {} ],
43: [ function(e, t) {
t.exports = {
"1.3.132.0.10": "secp256k1",
"1.3.132.0.33": "p224",
"1.2.840.10045.3.1.1": "p192",
"1.2.840.10045.3.1.7": "p256",
"1.3.132.0.34": "p384",
"1.3.132.0.35": "p521"
};
}, {} ],
44: [ function(e, t) {
var i = e("safe-buffer").Buffer, r = e("create-hash"), n = e("readable-stream"), a = e("inherits"), s = e("./sign"), o = e("./verify"), c = e("./algorithms.json");
Object.keys(c).forEach(function(e) {
c[e].id = i.from(c[e].id, "hex");
c[e.toLowerCase()] = c[e];
});
function f(e) {
n.Writable.call(this);
var t = c[e];
if (!t) throw new Error("Unknown message digest");
this._hashType = t.hash;
this._hash = r(t.hash);
this._tag = t.id;
this._signType = t.sign;
}
a(f, n.Writable);
f.prototype._write = function(e, t, i) {
this._hash.update(e);
i();
};
f.prototype.update = function(e, t) {
"string" == typeof e && (e = i.from(e, t));
this._hash.update(e);
return this;
};
f.prototype.sign = function(e, t) {
this.end();
var i = this._hash.digest(), r = s(i, e, this._hashType, this._signType, this._tag);
return t ? r.toString(t) : r;
};
function h(e) {
n.Writable.call(this);
var t = c[e];
if (!t) throw new Error("Unknown message digest");
this._hash = r(t.hash);
this._tag = t.id;
this._signType = t.sign;
}
a(h, n.Writable);
h.prototype._write = function(e, t, i) {
this._hash.update(e);
i();
};
h.prototype.update = function(e, t) {
"string" == typeof e && (e = i.from(e, t));
this._hash.update(e);
return this;
};
h.prototype.verify = function(e, t, r) {
"string" == typeof t && (t = i.from(t, r));
this.end();
var n = this._hash.digest();
return o(t, n, e, this._signType, this._tag);
};
function u(e) {
return new f(e);
}
function d(e) {
return new h(e);
}
t.exports = {
Sign: u,
Verify: d,
createSign: u,
createVerify: d
};
}, {
"./algorithms.json": 42,
"./sign": 45,
"./verify": 46,
"create-hash": 71,
inherits: 138,
"readable-stream": 61,
"safe-buffer": 62
} ],
45: [ function(e, t) {
var i = e("safe-buffer").Buffer, r = e("create-hmac"), n = e("browserify-rsa"), a = e("elliptic").ec, s = e("bn.js"), o = e("parse-asn1"), c = e("./curves.json");
function f(e, t) {
var r = c[t.curve.join(".")];
if (!r) throw new Error("unknown curve " + t.curve.join("."));
var n = new a(r).keyFromPrivate(t.privateKey).sign(e);
return i.from(n.toDER());
}
function h(e, t, i) {
for (var r, n = t.params.priv_key, a = t.params.p, o = t.params.q, c = t.params.g, f = new s(0), h = l(e, o).mod(o), p = !1, m = d(n, o, e, i); !1 === p; ) {
f = g(c, r = b(o, m, i), a, o);
if (0 === (p = r.invm(o).imul(h.add(n.mul(f))).mod(o)).cmpn(0)) {
p = !1;
f = new s(0);
}
}
return u(f, p);
}
function u(e, t) {
e = e.toArray();
t = t.toArray();
128 & e[0] && (e = [ 0 ].concat(e));
128 & t[0] && (t = [ 0 ].concat(t));
var r = [ 48, e.length + t.length + 4, 2, e.length ];
r = r.concat(e, [ 2, t.length ], t);
return i.from(r);
}
function d(e, t, n, a) {
if ((e = i.from(e.toArray())).length < t.byteLength()) {
var s = i.alloc(t.byteLength() - e.length);
e = i.concat([ s, e ]);
}
var o = n.length, c = p(n, t), f = i.alloc(o);
f.fill(1);
var h = i.alloc(o);
h = r(a, h).update(f).update(i.from([ 0 ])).update(e).update(c).digest();
f = r(a, h).update(f).digest();
return {
k: h = r(a, h).update(f).update(i.from([ 1 ])).update(e).update(c).digest(),
v: f = r(a, h).update(f).digest()
};
}
function l(e, t) {
var i = new s(e), r = (e.length << 3) - t.bitLength();
r > 0 && i.ishrn(r);
return i;
}
function p(e, t) {
e = (e = l(e, t)).mod(t);
var r = i.from(e.toArray());
if (r.length < t.byteLength()) {
var n = i.alloc(t.byteLength() - r.length);
r = i.concat([ n, r ]);
}
return r;
}
function b(e, t, n) {
var a, s;
do {
a = i.alloc(0);
for (;8 * a.length < e.bitLength(); ) {
t.v = r(n, t.k).update(t.v).digest();
a = i.concat([ a, t.v ]);
}
s = l(a, e);
t.k = r(n, t.k).update(t.v).update(i.from([ 0 ])).digest();
t.v = r(n, t.k).update(t.v).digest();
} while (-1 !== s.cmp(e));
return s;
}
function g(e, t, i, r) {
return e.toRed(s.mont(i)).redPow(t).fromRed().mod(r);
}
t.exports = function(e, t, r, a, s) {
var c = o(t);
if (c.curve) {
if ("ecdsa" !== a && "ecdsa/rsa" !== a) throw new Error("wrong private key type");
return f(e, c);
}
if ("dsa" === c.type) {
if ("dsa" !== a) throw new Error("wrong private key type");
return h(e, c, r);
}
if ("rsa" !== a && "ecdsa/rsa" !== a) throw new Error("wrong private key type");
e = i.concat([ s, e ]);
for (var u = c.modulus.byteLength(), d = [ 0, 1 ]; e.length + d.length + 1 < u; ) d.push(255);
d.push(0);
for (var l = -1; ++l < e.length; ) d.push(e[l]);
return n(d, c);
};
t.exports.getKey = d;
t.exports.makeKey = b;
}, {
"./curves.json": 43,
"bn.js": 17,
"browserify-rsa": 40,
"create-hmac": 73,
elliptic: 87,
"parse-asn1": 148,
"safe-buffer": 62
} ],
46: [ function(e, t) {
var i = e("safe-buffer").Buffer, r = e("bn.js"), n = e("elliptic").ec, a = e("parse-asn1"), s = e("./curves.json");
function o(e, t, i) {
var r = s[i.data.algorithm.curve.join(".")];
if (!r) throw new Error("unknown curve " + i.data.algorithm.curve.join("."));
var a = new n(r), o = i.data.subjectPrivateKey.data;
return a.verify(t, e, o);
}
function c(e, t, i) {
var n = i.data.p, s = i.data.q, o = i.data.g, c = i.data.pub_key, h = a.signature.decode(e, "der"), u = h.s, d = h.r;
f(u, s);
f(d, s);
var l = r.mont(n), p = u.invm(s);
return 0 === o.toRed(l).redPow(new r(t).mul(p).mod(s)).fromRed().mul(c.toRed(l).redPow(d.mul(p).mod(s)).fromRed()).mod(n).mod(s).cmp(d);
}
function f(e, t) {
if (e.cmpn(0) <= 0) throw new Error("invalid sig");
if (e.cmp(t) >= t) throw new Error("invalid sig");
}
t.exports = function(e, t, n, s, f) {
var h = a(n);
if ("ec" === h.type) {
if ("ecdsa" !== s && "ecdsa/rsa" !== s) throw new Error("wrong public key type");
return o(e, t, h);
}
if ("dsa" === h.type) {
if ("dsa" !== s) throw new Error("wrong public key type");
return c(e, t, h);
}
if ("rsa" !== s && "ecdsa/rsa" !== s) throw new Error("wrong public key type");
t = i.concat([ f, t ]);
for (var u = h.modulus.byteLength(), d = [ 1 ], l = 0; t.length + d.length + 2 < u; ) {
d.push(255);
l++;
}
d.push(0);
for (var p = -1; ++p < t.length; ) d.push(t[p]);
d = i.from(d);
var b = r.mont(h.modulus);
e = (e = new r(e).toRed(b)).redPow(new r(h.publicExponent));
e = i.from(e.fromRed().toArray());
var g = l < 8 ? 1 : 0;
u = Math.min(e.length, d.length);
e.length !== d.length && (g = 1);
p = -1;
for (;++p < u; ) g |= e[p] ^ d[p];
return 0 === g;
};
}, {
"./curves.json": 43,
"bn.js": 17,
elliptic: 87,
"parse-asn1": 148,
"safe-buffer": 62
} ],
47: [ function(e, t) {
"use strict";
function i(e, t) {
e.prototype = Object.create(t.prototype);
e.prototype.constructor = e;
e.__proto__ = t;
}
var r = {};
function n(e, t, n) {
n || (n = Error);
function a(e, i, r) {
return "string" == typeof t ? t : t(e, i, r);
}
var s = function(e) {
i(t, e);
function t(t, i, r) {
return e.call(this, a(t, i, r)) || this;
}
return t;
}(n);
s.prototype.name = n.name;
s.prototype.code = e;
r[e] = s;
}
function a(e, t) {
if (Array.isArray(e)) {
var i = e.length;
e = e.map(function(e) {
return String(e);
});
return i > 2 ? "one of ".concat(t, " ").concat(e.slice(0, i - 1).join(", "), ", or ") + e[i - 1] : 2 === i ? "one of ".concat(t, " ").concat(e[0], " or ").concat(e[1]) : "of ".concat(t, " ").concat(e[0]);
}
return "of ".concat(t, " ").concat(String(e));
}
function s(e, t, i) {
(void 0 === i || i > e.length) && (i = e.length);
return e.substring(i - t.length, i) === t;
}
function o(e, t, i) {
"number" != typeof i && (i = 0);
return !(i + t.length > e.length) && -1 !== e.indexOf(t, i);
}
n("ERR_INVALID_OPT_VALUE", function(e, t) {
return 'The value "' + t + '" is invalid for option "' + e + '"';
}, TypeError);
n("ERR_INVALID_ARG_TYPE", function(e, t, i) {
var r, n;
if ("string" == typeof t && ("not ", "not " === t.substr(0, "not ".length))) {
r = "must not be";
t = t.replace(/^not /, "");
} else r = "must be";
if (s(e, " argument")) n = "The ".concat(e, " ").concat(r, " ").concat(a(t, "type")); else {
var c = o(e, ".") ? "property" : "argument";
n = 'The "'.concat(e, '" ').concat(c, " ").concat(r, " ").concat(a(t, "type"));
}
return n + ". Received type ".concat(typeof i);
}, TypeError);
n("ERR_STREAM_PUSH_AFTER_EOF", "stream.push() after EOF");
n("ERR_METHOD_NOT_IMPLEMENTED", function(e) {
return "The " + e + " method is not implemented";
});
n("ERR_STREAM_PREMATURE_CLOSE", "Premature close");
n("ERR_STREAM_DESTROYED", function(e) {
return "Cannot call " + e + " after a stream was destroyed";
});
n("ERR_MULTIPLE_CALLBACK", "Callback called multiple times");
n("ERR_STREAM_CANNOT_PIPE", "Cannot pipe, not readable");
n("ERR_STREAM_WRITE_AFTER_END", "write after end");
n("ERR_STREAM_NULL_VALUES", "May not write null values to stream", TypeError);
n("ERR_UNKNOWN_ENCODING", function(e) {
return "Unknown encoding: " + e;
}, TypeError);
n("ERR_STREAM_UNSHIFT_AFTER_END_EVENT", "stream.unshift() after end event");
t.exports.codes = r;
}, {} ],
48: [ function(e, t) {
(function(i) {
"use strict";
var r = Object.keys || function(e) {
var t = [];
for (var i in e) t.push(i);
return t;
};
t.exports = f;
var n = e("./_stream_readable"), a = e("./_stream_writable");
e("inherits")(f, n);
for (var s = r(a.prototype), o = 0; o < s.length; o++) {
var c = s[o];
f.prototype[c] || (f.prototype[c] = a.prototype[c]);
}
function f(e) {
if (!(this instanceof f)) return new f(e);
n.call(this, e);
a.call(this, e);
this.allowHalfOpen = !0;
if (e) {
!1 === e.readable && (this.readable = !1);
!1 === e.writable && (this.writable = !1);
if (!1 === e.allowHalfOpen) {
this.allowHalfOpen = !1;
this.once("end", h);
}
}
}
Object.defineProperty(f.prototype, "writableHighWaterMark", {
enumerable: !1,
get: function() {
return this._writableState.highWaterMark;
}
});
Object.defineProperty(f.prototype, "writableBuffer", {
enumerable: !1,
get: function() {
return this._writableState && this._writableState.getBuffer();
}
});
Object.defineProperty(f.prototype, "writableLength", {
enumerable: !1,
get: function() {
return this._writableState.length;
}
});
function h() {
this._writableState.ended || i.nextTick(u, this);
}
function u(e) {
e.end();
}
Object.defineProperty(f.prototype, "destroyed", {
enumerable: !1,
get: function() {
return void 0 !== this._readableState && void 0 !== this._writableState && this._readableState.destroyed && this._writableState.destroyed;
},
set: function(e) {
if (void 0 !== this._readableState && void 0 !== this._writableState) {
this._readableState.destroyed = e;
this._writableState.destroyed = e;
}
}
});
}).call(this, e("_process"));
}, {
"./_stream_readable": 50,
"./_stream_writable": 52,
_process: 156,
inherits: 138
} ],
49: [ function(e, t) {
"use strict";
t.exports = r;
var i = e("./_stream_transform");
e("inherits")(r, i);
function r(e) {
if (!(this instanceof r)) return new r(e);
i.call(this, e);
}
r.prototype._transform = function(e, t, i) {
i(null, e);
};
}, {
"./_stream_transform": 51,
inherits: 138
} ],
50: [ function(e, t) {
(function(i, r) {
"use strict";
t.exports = E;
var n;
E.ReadableState = I;
e("events").EventEmitter;
var a = function(e, t) {
return e.listeners(t).length;
}, s = e("./internal/streams/stream"), o = e("buffer").Buffer, c = r.Uint8Array || function() {};
function f(e) {
return o.from(e);
}
var h, u = e("util");
h = u && u.debuglog ? u.debuglog("stream") : function() {};
var d, l, p, b = e("./internal/streams/buffer_list"), g = e("./internal/streams/destroy"), m = e("./internal/streams/state").getHighWaterMark, v = e("../errors").codes, y = v.ERR_INVALID_ARG_TYPE, _ = v.ERR_STREAM_PUSH_AFTER_EOF, w = v.ERR_METHOD_NOT_IMPLEMENTED, S = v.ERR_STREAM_UNSHIFT_AFTER_END_EVENT;
e("inherits")(E, s);
var k = g.errorOrDestroy, M = [ "error", "close", "destroy", "pause", "resume" ];
function A(e, t, i) {
if ("function" == typeof e.prependListener) return e.prependListener(t, i);
e._events && e._events[t] ? Array.isArray(e._events[t]) ? e._events[t].unshift(i) : e._events[t] = [ i, e._events[t] ] : e.on(t, i);
}
function I(t, i, r) {
n = n || e("./_stream_duplex");
t = t || {};
"boolean" != typeof r && (r = i instanceof n);
this.objectMode = !!t.objectMode;
r && (this.objectMode = this.objectMode || !!t.readableObjectMode);
this.highWaterMark = m(this, t, "readableHighWaterMark", r);
this.buffer = new b();
this.length = 0;
this.pipes = null;
this.pipesCount = 0;
this.flowing = null;
this.ended = !1;
this.endEmitted = !1;
this.reading = !1;
this.sync = !0;
this.needReadable = !1;
this.emittedReadable = !1;
this.readableListening = !1;
this.resumeScheduled = !1;
this.paused = !0;
this.emitClose = !1 !== t.emitClose;
this.autoDestroy = !!t.autoDestroy;
this.destroyed = !1;
this.defaultEncoding = t.defaultEncoding || "utf8";
this.awaitDrain = 0;
this.readingMore = !1;
this.decoder = null;
this.encoding = null;
if (t.encoding) {
d || (d = e("string_decoder/").StringDecoder);
this.decoder = new d(t.encoding);
this.encoding = t.encoding;
}
}
function E(t) {
n = n || e("./_stream_duplex");
if (!(this instanceof E)) return new E(t);
var i = this instanceof n;
this._readableState = new I(t, this, i);
this.readable = !0;
if (t) {
"function" == typeof t.read && (this._read = t.read);
"function" == typeof t.destroy && (this._destroy = t.destroy);
}
s.call(this);
}
Object.defineProperty(E.prototype, "destroyed", {
enumerable: !1,
get: function() {
return void 0 !== this._readableState && this._readableState.destroyed;
},
set: function(e) {
this._readableState && (this._readableState.destroyed = e);
}
});
E.prototype.destroy = g.destroy;
E.prototype._undestroy = g.undestroy;
E.prototype._destroy = function(e, t) {
t(e);
};
E.prototype.push = function(e, t) {
var i, r = this._readableState;
if (r.objectMode) i = !0; else if ("string" == typeof e) {
if ((t = t || r.defaultEncoding) !== r.encoding) {
e = o.from(e, t);
t = "";
}
i = !0;
}
return P(this, e, t, !1, i);
};
E.prototype.unshift = function(e) {
return P(this, e, null, !0, !1);
};
function P(e, t, i, r, n) {
h("readableAddChunk", t);
var a = e._readableState;
if (null === t) {
a.reading = !1;
j(e, a);
} else {
var s;
n || (s = x(a, t));
if (s) k(e, s); else if (a.objectMode || t && t.length > 0) {
"string" == typeof t || a.objectMode || Object.getPrototypeOf(t) === o.prototype || (t = f(t));
if (r) a.endEmitted ? k(e, new S()) : C(e, a, t, !0); else if (a.ended) k(e, new _()); else {
if (a.destroyed) return !1;
a.reading = !1;
if (a.decoder && !i) {
t = a.decoder.write(t);
a.objectMode || 0 !== t.length ? C(e, a, t, !1) : B(e, a);
} else C(e, a, t, !1);
}
} else if (!r) {
a.reading = !1;
B(e, a);
}
}
return !a.ended && (a.length < a.highWaterMark || 0 === a.length);
}
function C(e, t, i, r) {
if (t.flowing && 0 === t.length && !t.sync) {
t.awaitDrain = 0;
e.emit("data", i);
} else {
t.length += t.objectMode ? 1 : i.length;
r ? t.buffer.unshift(i) : t.buffer.push(i);
t.needReadable && D(e);
}
B(e, t);
}
function x(e, t) {
var i, r;
(r = t, o.isBuffer(r) || r instanceof c) || "string" == typeof t || void 0 === t || e.objectMode || (i = new y("chunk", [ "string", "Buffer", "Uint8Array" ], t));
return i;
}
E.prototype.isPaused = function() {
return !1 === this._readableState.flowing;
};
E.prototype.setEncoding = function(t) {
d || (d = e("string_decoder/").StringDecoder);
var i = new d(t);
this._readableState.decoder = i;
this._readableState.encoding = this._readableState.decoder.encoding;
for (var r = this._readableState.buffer.head, n = ""; null !== r; ) {
n += i.write(r.data);
r = r.next;
}
this._readableState.buffer.clear();
"" !== n && this._readableState.buffer.push(n);
this._readableState.length = n.length;
return this;
};
var O = 1073741824;
function N(e) {
if (e >= O) e = O; else {
e--;
e |= e >>> 1;
e |= e >>> 2;
e |= e >>> 4;
e |= e >>> 8;
e |= e >>> 16;
e++;
}
return e;
}
function T(e, t) {
if (e <= 0 || 0 === t.length && t.ended) return 0;
if (t.objectMode) return 1;
if (e != e) return t.flowing && t.length ? t.buffer.head.data.length : t.length;
e > t.highWaterMark && (t.highWaterMark = N(e));
if (e <= t.length) return e;
if (!t.ended) {
t.needReadable = !0;
return 0;
}
return t.length;
}
E.prototype.read = function(e) {
h("read", e);
e = parseInt(e, 10);
var t = this._readableState, i = e;
0 !== e && (t.emittedReadable = !1);
if (0 === e && t.needReadable && ((0 !== t.highWaterMark ? t.length >= t.highWaterMark : t.length > 0) || t.ended)) {
h("read: emitReadable", t.length, t.ended);
0 === t.length && t.ended ? W(this) : D(this);
return null;
}
if (0 === (e = T(e, t)) && t.ended) {
0 === t.length && W(this);
return null;
}
var r, n = t.needReadable;
h("need readable", n);
(0 === t.length || t.length - e < t.highWaterMark) && h("length less than watermark", n = !0);
if (t.ended || t.reading) h("reading or ended", n = !1); else if (n) {
h("do read");
t.reading = !0;
t.sync = !0;
0 === t.length && (t.needReadable = !0);
this._read(t.highWaterMark);
t.sync = !1;
t.reading || (e = T(i, t));
}
if (null === (r = e > 0 ? K(e, t) : null)) {
t.needReadable = t.length <= t.highWaterMark;
e = 0;
} else {
t.length -= e;
t.awaitDrain = 0;
}
if (0 === t.length) {
t.ended || (t.needReadable = !0);
i !== e && t.ended && W(this);
}
null !== r && this.emit("data", r);
return r;
};
function j(e, t) {
h("onEofChunk");
if (!t.ended) {
if (t.decoder) {
var i = t.decoder.end();
if (i && i.length) {
t.buffer.push(i);
t.length += t.objectMode ? 1 : i.length;
}
}
t.ended = !0;
if (t.sync) D(e); else {
t.needReadable = !1;
if (!t.emittedReadable) {
t.emittedReadable = !0;
R(e);
}
}
}
}
function D(e) {
var t = e._readableState;
h("emitReadable", t.needReadable, t.emittedReadable);
t.needReadable = !1;
if (!t.emittedReadable) {
h("emitReadable", t.flowing);
t.emittedReadable = !0;
i.nextTick(R, e);
}
}
function R(e) {
var t = e._readableState;
h("emitReadable_", t.destroyed, t.length, t.ended);
if (!t.destroyed && (t.length || t.ended)) {
e.emit("readable");
t.emittedReadable = !1;
}
t.needReadable = !t.flowing && !t.ended && t.length <= t.highWaterMark;
J(e);
}
function B(e, t) {
if (!t.readingMore) {
t.readingMore = !0;
i.nextTick(L, e, t);
}
}
function L(e, t) {
for (;!t.reading && !t.ended && (t.length < t.highWaterMark || t.flowing && 0 === t.length); ) {
var i = t.length;
h("maybeReadMore read 0");
e.read(0);
if (i === t.length) break;
}
t.readingMore = !1;
}
E.prototype._read = function() {
k(this, new w("_read()"));
};
E.prototype.pipe = function(e, t) {
var r = this, n = this._readableState;
switch (n.pipesCount) {
case 0:
n.pipes = e;
break;

case 1:
n.pipes = [ n.pipes, e ];
break;

default:
n.pipes.push(e);
}
n.pipesCount += 1;
h("pipe count=%d opts=%j", n.pipesCount, t);
var s = t && !1 === t.end || e === i.stdout || e === i.stderr ? m : c;
n.endEmitted ? i.nextTick(s) : r.once("end", s);
e.on("unpipe", o);
function o(e, t) {
h("onunpipe");
if (e === r && t && !1 === t.hasUnpiped) {
t.hasUnpiped = !0;
d();
}
}
function c() {
h("onend");
e.end();
}
var f = U(r);
e.on("drain", f);
var u = !1;
function d() {
h("cleanup");
e.removeListener("close", b);
e.removeListener("finish", g);
e.removeListener("drain", f);
e.removeListener("error", p);
e.removeListener("unpipe", o);
r.removeListener("end", c);
r.removeListener("end", m);
r.removeListener("data", l);
u = !0;
!n.awaitDrain || e._writableState && !e._writableState.needDrain || f();
}
r.on("data", l);
function l(t) {
h("ondata");
var i = e.write(t);
h("dest.write", i);
if (!1 === i) {
if ((1 === n.pipesCount && n.pipes === e || n.pipesCount > 1 && -1 !== G(n.pipes, e)) && !u) {
h("false write response, pause", n.awaitDrain);
n.awaitDrain++;
}
r.pause();
}
}
function p(t) {
h("onerror", t);
m();
e.removeListener("error", p);
0 === a(e, "error") && k(e, t);
}
A(e, "error", p);
function b() {
e.removeListener("finish", g);
m();
}
e.once("close", b);
function g() {
h("onfinish");
e.removeListener("close", b);
m();
}
e.once("finish", g);
function m() {
h("unpipe");
r.unpipe(e);
}
e.emit("pipe", r);
if (!n.flowing) {
h("pipe resume");
r.resume();
}
return e;
};
function U(e) {
return function() {
var t = e._readableState;
h("pipeOnDrain", t.awaitDrain);
t.awaitDrain && t.awaitDrain--;
if (0 === t.awaitDrain && a(e, "data")) {
t.flowing = !0;
J(e);
}
};
}
E.prototype.unpipe = function(e) {
var t = this._readableState, i = {
hasUnpiped: !1
};
if (0 === t.pipesCount) return this;
if (1 === t.pipesCount) {
if (e && e !== t.pipes) return this;
e || (e = t.pipes);
t.pipes = null;
t.pipesCount = 0;
t.flowing = !1;
e && e.emit("unpipe", this, i);
return this;
}
if (!e) {
var r = t.pipes, n = t.pipesCount;
t.pipes = null;
t.pipesCount = 0;
t.flowing = !1;
for (var a = 0; a < n; a++) r[a].emit("unpipe", this, {
hasUnpiped: !1
});
return this;
}
var s = G(t.pipes, e);
if (-1 === s) return this;
t.pipes.splice(s, 1);
t.pipesCount -= 1;
1 === t.pipesCount && (t.pipes = t.pipes[0]);
e.emit("unpipe", this, i);
return this;
};
E.prototype.on = function(e, t) {
var r = s.prototype.on.call(this, e, t), n = this._readableState;
if ("data" === e) {
n.readableListening = this.listenerCount("readable") > 0;
!1 !== n.flowing && this.resume();
} else if ("readable" === e && !n.endEmitted && !n.readableListening) {
n.readableListening = n.needReadable = !0;
n.flowing = !1;
n.emittedReadable = !1;
h("on readable", n.length, n.reading);
n.length ? D(this) : n.reading || i.nextTick(F, this);
}
return r;
};
E.prototype.addListener = E.prototype.on;
E.prototype.removeListener = function(e, t) {
var r = s.prototype.removeListener.call(this, e, t);
"readable" === e && i.nextTick(q, this);
return r;
};
E.prototype.removeAllListeners = function(e) {
var t = s.prototype.removeAllListeners.apply(this, arguments);
"readable" !== e && void 0 !== e || i.nextTick(q, this);
return t;
};
function q(e) {
var t = e._readableState;
t.readableListening = e.listenerCount("readable") > 0;
t.resumeScheduled && !t.paused ? t.flowing = !0 : e.listenerCount("data") > 0 && e.resume();
}
function F(e) {
h("readable nexttick read 0");
e.read(0);
}
E.prototype.resume = function() {
var e = this._readableState;
if (!e.flowing) {
h("resume");
e.flowing = !e.readableListening;
z(this, e);
}
e.paused = !1;
return this;
};
function z(e, t) {
if (!t.resumeScheduled) {
t.resumeScheduled = !0;
i.nextTick(H, e, t);
}
}
function H(e, t) {
h("resume", t.reading);
t.reading || e.read(0);
t.resumeScheduled = !1;
e.emit("resume");
J(e);
t.flowing && !t.reading && e.read(0);
}
E.prototype.pause = function() {
h("call pause flowing=%j", this._readableState.flowing);
if (!1 !== this._readableState.flowing) {
h("pause");
this._readableState.flowing = !1;
this.emit("pause");
}
this._readableState.paused = !0;
return this;
};
function J(e) {
var t = e._readableState;
h("flow", t.flowing);
for (;t.flowing && null !== e.read(); ) ;
}
E.prototype.wrap = function(e) {
var t = this, i = this._readableState, r = !1;
e.on("end", function() {
h("wrapped end");
if (i.decoder && !i.ended) {
var e = i.decoder.end();
e && e.length && t.push(e);
}
t.push(null);
});
e.on("data", function(n) {
h("wrapped data");
i.decoder && (n = i.decoder.write(n));
if ((!i.objectMode || null != n) && (i.objectMode || n && n.length) && !t.push(n)) {
r = !0;
e.pause();
}
});
for (var n in e) void 0 === this[n] && "function" == typeof e[n] && (this[n] = function(t) {
return function() {
return e[t].apply(e, arguments);
};
}(n));
for (var a = 0; a < M.length; a++) e.on(M[a], this.emit.bind(this, M[a]));
this._read = function(t) {
h("wrapped _read", t);
if (r) {
r = !1;
e.resume();
}
};
return this;
};
"function" == typeof Symbol && (E.prototype[Symbol.asyncIterator] = function() {
void 0 === l && (l = e("./internal/streams/async_iterator"));
return l(this);
});
Object.defineProperty(E.prototype, "readableHighWaterMark", {
enumerable: !1,
get: function() {
return this._readableState.highWaterMark;
}
});
Object.defineProperty(E.prototype, "readableBuffer", {
enumerable: !1,
get: function() {
return this._readableState && this._readableState.buffer;
}
});
Object.defineProperty(E.prototype, "readableFlowing", {
enumerable: !1,
get: function() {
return this._readableState.flowing;
},
set: function(e) {
this._readableState && (this._readableState.flowing = e);
}
});
E._fromList = K;
Object.defineProperty(E.prototype, "readableLength", {
enumerable: !1,
get: function() {
return this._readableState.length;
}
});
function K(e, t) {
if (0 === t.length) return null;
var i;
if (t.objectMode) i = t.buffer.shift(); else if (!e || e >= t.length) {
i = t.decoder ? t.buffer.join("") : 1 === t.buffer.length ? t.buffer.first() : t.buffer.concat(t.length);
t.buffer.clear();
} else i = t.buffer.consume(e, t.decoder);
return i;
}
function W(e) {
var t = e._readableState;
h("endReadable", t.endEmitted);
if (!t.endEmitted) {
t.ended = !0;
i.nextTick(V, t, e);
}
}
function V(e, t) {
h("endReadableNT", e.endEmitted, e.length);
if (!e.endEmitted && 0 === e.length) {
e.endEmitted = !0;
t.readable = !1;
t.emit("end");
if (e.autoDestroy) {
var i = t._writableState;
(!i || i.autoDestroy && i.finished) && t.destroy();
}
}
}
"function" == typeof Symbol && (E.from = function(t, i) {
void 0 === p && (p = e("./internal/streams/from"));
return p(E, t, i);
});
function G(e, t) {
for (var i = 0, r = e.length; i < r; i++) if (e[i] === t) return i;
return -1;
}
}).call(this, e("_process"), "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
}, {
"../errors": 47,
"./_stream_duplex": 48,
"./internal/streams/async_iterator": 53,
"./internal/streams/buffer_list": 54,
"./internal/streams/destroy": 55,
"./internal/streams/from": 57,
"./internal/streams/state": 59,
"./internal/streams/stream": 60,
_process: 156,
buffer: 65,
events: 104,
inherits: 138,
"string_decoder/": 63,
util: 19
} ],
51: [ function(e, t) {
"use strict";
t.exports = f;
var i = e("../errors").codes, r = i.ERR_METHOD_NOT_IMPLEMENTED, n = i.ERR_MULTIPLE_CALLBACK, a = i.ERR_TRANSFORM_ALREADY_TRANSFORMING, s = i.ERR_TRANSFORM_WITH_LENGTH_0, o = e("./_stream_duplex");
e("inherits")(f, o);
function c(e, t) {
var i = this._transformState;
i.transforming = !1;
var r = i.writecb;
if (null === r) return this.emit("error", new n());
i.writechunk = null;
i.writecb = null;
null != t && this.push(t);
r(e);
var a = this._readableState;
a.reading = !1;
(a.needReadable || a.length < a.highWaterMark) && this._read(a.highWaterMark);
}
function f(e) {
if (!(this instanceof f)) return new f(e);
o.call(this, e);
this._transformState = {
afterTransform: c.bind(this),
needTransform: !1,
transforming: !1,
writecb: null,
writechunk: null,
writeencoding: null
};
this._readableState.needReadable = !0;
this._readableState.sync = !1;
if (e) {
"function" == typeof e.transform && (this._transform = e.transform);
"function" == typeof e.flush && (this._flush = e.flush);
}
this.on("prefinish", h);
}
function h() {
var e = this;
"function" != typeof this._flush || this._readableState.destroyed ? u(this, null, null) : this._flush(function(t, i) {
u(e, t, i);
});
}
f.prototype.push = function(e, t) {
this._transformState.needTransform = !1;
return o.prototype.push.call(this, e, t);
};
f.prototype._transform = function(e, t, i) {
i(new r("_transform()"));
};
f.prototype._write = function(e, t, i) {
var r = this._transformState;
r.writecb = i;
r.writechunk = e;
r.writeencoding = t;
if (!r.transforming) {
var n = this._readableState;
(r.needTransform || n.needReadable || n.length < n.highWaterMark) && this._read(n.highWaterMark);
}
};
f.prototype._read = function() {
var e = this._transformState;
if (null === e.writechunk || e.transforming) e.needTransform = !0; else {
e.transforming = !0;
this._transform(e.writechunk, e.writeencoding, e.afterTransform);
}
};
f.prototype._destroy = function(e, t) {
o.prototype._destroy.call(this, e, function(e) {
t(e);
});
};
function u(e, t, i) {
if (t) return e.emit("error", t);
null != i && e.push(i);
if (e._writableState.length) throw new s();
if (e._transformState.transforming) throw new a();
return e.push(null);
}
}, {
"../errors": 47,
"./_stream_duplex": 48,
inherits: 138
} ],
52: [ function(e, t) {
(function(i, r) {
"use strict";
t.exports = I;
function n(e) {
var t = this;
this.next = null;
this.entry = null;
this.finish = function() {
H(t, e);
};
}
var a;
I.WritableState = A;
var s = {
deprecate: e("util-deprecate")
}, o = e("./internal/streams/stream"), c = e("buffer").Buffer, f = r.Uint8Array || function() {};
function h(e) {
return c.from(e);
}
var u, d = e("./internal/streams/destroy"), l = e("./internal/streams/state").getHighWaterMark, p = e("../errors").codes, b = p.ERR_INVALID_ARG_TYPE, g = p.ERR_METHOD_NOT_IMPLEMENTED, m = p.ERR_MULTIPLE_CALLBACK, v = p.ERR_STREAM_CANNOT_PIPE, y = p.ERR_STREAM_DESTROYED, _ = p.ERR_STREAM_NULL_VALUES, w = p.ERR_STREAM_WRITE_AFTER_END, S = p.ERR_UNKNOWN_ENCODING, k = d.errorOrDestroy;
e("inherits")(I, o);
function M() {}
function A(t, i, r) {
a = a || e("./_stream_duplex");
t = t || {};
"boolean" != typeof r && (r = i instanceof a);
this.objectMode = !!t.objectMode;
r && (this.objectMode = this.objectMode || !!t.writableObjectMode);
this.highWaterMark = l(this, t, "writableHighWaterMark", r);
this.finalCalled = !1;
this.needDrain = !1;
this.ending = !1;
this.ended = !1;
this.finished = !1;
this.destroyed = !1;
var s = !1 === t.decodeStrings;
this.decodeStrings = !s;
this.defaultEncoding = t.defaultEncoding || "utf8";
this.length = 0;
this.writing = !1;
this.corked = 0;
this.sync = !0;
this.bufferProcessing = !1;
this.onwrite = function(e) {
j(i, e);
};
this.writecb = null;
this.writelen = 0;
this.bufferedRequest = null;
this.lastBufferedRequest = null;
this.pendingcb = 0;
this.prefinished = !1;
this.errorEmitted = !1;
this.emitClose = !1 !== t.emitClose;
this.autoDestroy = !!t.autoDestroy;
this.bufferedRequestCount = 0;
this.corkedRequestsFree = new n(this);
}
A.prototype.getBuffer = function() {
for (var e = this.bufferedRequest, t = []; e; ) {
t.push(e);
e = e.next;
}
return t;
};
(function() {
try {
Object.defineProperty(A.prototype, "buffer", {
get: s.deprecate(function() {
return this.getBuffer();
}, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
});
} catch (e) {}
})();
if ("function" == typeof Symbol && Symbol.hasInstance && "function" == typeof Function.prototype[Symbol.hasInstance]) {
u = Function.prototype[Symbol.hasInstance];
Object.defineProperty(I, Symbol.hasInstance, {
value: function(e) {
return !!u.call(this, e) || this === I && e && e._writableState instanceof A;
}
});
} else u = function(e) {
return e instanceof this;
};
function I(t) {
var i = this instanceof (a = a || e("./_stream_duplex"));
if (!i && !u.call(I, this)) return new I(t);
this._writableState = new A(t, this, i);
this.writable = !0;
if (t) {
"function" == typeof t.write && (this._write = t.write);
"function" == typeof t.writev && (this._writev = t.writev);
"function" == typeof t.destroy && (this._destroy = t.destroy);
"function" == typeof t.final && (this._final = t.final);
}
o.call(this);
}
I.prototype.pipe = function() {
k(this, new v());
};
function E(e, t) {
var r = new w();
k(e, r);
i.nextTick(t, r);
}
function P(e, t, r, n) {
var a;
null === r ? a = new _() : "string" == typeof r || t.objectMode || (a = new b("chunk", [ "string", "Buffer" ], r));
if (a) {
k(e, a);
i.nextTick(n, a);
return !1;
}
return !0;
}
I.prototype.write = function(e, t, i) {
var r, n = this._writableState, a = !1, s = !n.objectMode && (r = e, c.isBuffer(r) || r instanceof f);
s && !c.isBuffer(e) && (e = h(e));
if ("function" == typeof t) {
i = t;
t = null;
}
s ? t = "buffer" : t || (t = n.defaultEncoding);
"function" != typeof i && (i = M);
if (n.ending) E(this, i); else if (s || P(this, n, e, i)) {
n.pendingcb++;
a = x(this, n, s, e, t, i);
}
return a;
};
I.prototype.cork = function() {
this._writableState.corked++;
};
I.prototype.uncork = function() {
var e = this._writableState;
if (e.corked) {
e.corked--;
e.writing || e.corked || e.bufferProcessing || !e.bufferedRequest || B(this, e);
}
};
I.prototype.setDefaultEncoding = function(e) {
"string" == typeof e && (e = e.toLowerCase());
if (!([ "hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw" ].indexOf((e + "").toLowerCase()) > -1)) throw new S(e);
this._writableState.defaultEncoding = e;
return this;
};
Object.defineProperty(I.prototype, "writableBuffer", {
enumerable: !1,
get: function() {
return this._writableState && this._writableState.getBuffer();
}
});
function C(e, t, i) {
e.objectMode || !1 === e.decodeStrings || "string" != typeof t || (t = c.from(t, i));
return t;
}
Object.defineProperty(I.prototype, "writableHighWaterMark", {
enumerable: !1,
get: function() {
return this._writableState.highWaterMark;
}
});
function x(e, t, i, r, n, a) {
if (!i) {
var s = C(t, r, n);
if (r !== s) {
i = !0;
n = "buffer";
r = s;
}
}
var o = t.objectMode ? 1 : r.length;
t.length += o;
var c = t.length < t.highWaterMark;
c || (t.needDrain = !0);
if (t.writing || t.corked) {
var f = t.lastBufferedRequest;
t.lastBufferedRequest = {
chunk: r,
encoding: n,
isBuf: i,
callback: a,
next: null
};
f ? f.next = t.lastBufferedRequest : t.bufferedRequest = t.lastBufferedRequest;
t.bufferedRequestCount += 1;
} else O(e, t, !1, o, r, n, a);
return c;
}
function O(e, t, i, r, n, a, s) {
t.writelen = r;
t.writecb = s;
t.writing = !0;
t.sync = !0;
t.destroyed ? t.onwrite(new y("write")) : i ? e._writev(n, t.onwrite) : e._write(n, a, t.onwrite);
t.sync = !1;
}
function N(e, t, r, n, a) {
--t.pendingcb;
if (r) {
i.nextTick(a, n);
i.nextTick(F, e, t);
e._writableState.errorEmitted = !0;
k(e, n);
} else {
a(n);
e._writableState.errorEmitted = !0;
k(e, n);
F(e, t);
}
}
function T(e) {
e.writing = !1;
e.writecb = null;
e.length -= e.writelen;
e.writelen = 0;
}
function j(e, t) {
var r = e._writableState, n = r.sync, a = r.writecb;
if ("function" != typeof a) throw new m();
T(r);
if (t) N(e, r, n, t, a); else {
var s = L(r) || e.destroyed;
s || r.corked || r.bufferProcessing || !r.bufferedRequest || B(e, r);
n ? i.nextTick(D, e, r, s, a) : D(e, r, s, a);
}
}
function D(e, t, i, r) {
i || R(e, t);
t.pendingcb--;
r();
F(e, t);
}
function R(e, t) {
if (0 === t.length && t.needDrain) {
t.needDrain = !1;
e.emit("drain");
}
}
function B(e, t) {
t.bufferProcessing = !0;
var i = t.bufferedRequest;
if (e._writev && i && i.next) {
var r = t.bufferedRequestCount, a = new Array(r), s = t.corkedRequestsFree;
s.entry = i;
for (var o = 0, c = !0; i; ) {
a[o] = i;
i.isBuf || (c = !1);
i = i.next;
o += 1;
}
a.allBuffers = c;
O(e, t, !0, t.length, a, "", s.finish);
t.pendingcb++;
t.lastBufferedRequest = null;
if (s.next) {
t.corkedRequestsFree = s.next;
s.next = null;
} else t.corkedRequestsFree = new n(t);
t.bufferedRequestCount = 0;
} else {
for (;i; ) {
var f = i.chunk, h = i.encoding, u = i.callback;
O(e, t, !1, t.objectMode ? 1 : f.length, f, h, u);
i = i.next;
t.bufferedRequestCount--;
if (t.writing) break;
}
null === i && (t.lastBufferedRequest = null);
}
t.bufferedRequest = i;
t.bufferProcessing = !1;
}
I.prototype._write = function(e, t, i) {
i(new g("_write()"));
};
I.prototype._writev = null;
I.prototype.end = function(e, t, i) {
var r = this._writableState;
if ("function" == typeof e) {
i = e;
e = null;
t = null;
} else if ("function" == typeof t) {
i = t;
t = null;
}
null != e && this.write(e, t);
if (r.corked) {
r.corked = 1;
this.uncork();
}
r.ending || z(this, r, i);
return this;
};
Object.defineProperty(I.prototype, "writableLength", {
enumerable: !1,
get: function() {
return this._writableState.length;
}
});
function L(e) {
return e.ending && 0 === e.length && null === e.bufferedRequest && !e.finished && !e.writing;
}
function U(e, t) {
e._final(function(i) {
t.pendingcb--;
i && k(e, i);
t.prefinished = !0;
e.emit("prefinish");
F(e, t);
});
}
function q(e, t) {
if (!t.prefinished && !t.finalCalled) if ("function" != typeof e._final || t.destroyed) {
t.prefinished = !0;
e.emit("prefinish");
} else {
t.pendingcb++;
t.finalCalled = !0;
i.nextTick(U, e, t);
}
}
function F(e, t) {
var i = L(t);
if (i) {
q(e, t);
if (0 === t.pendingcb) {
t.finished = !0;
e.emit("finish");
if (t.autoDestroy) {
var r = e._readableState;
(!r || r.autoDestroy && r.endEmitted) && e.destroy();
}
}
}
return i;
}
function z(e, t, r) {
t.ending = !0;
F(e, t);
r && (t.finished ? i.nextTick(r) : e.once("finish", r));
t.ended = !0;
e.writable = !1;
}
function H(e, t, i) {
var r = e.entry;
e.entry = null;
for (;r; ) {
var n = r.callback;
t.pendingcb--;
n(i);
r = r.next;
}
t.corkedRequestsFree.next = e;
}
Object.defineProperty(I.prototype, "destroyed", {
enumerable: !1,
get: function() {
return void 0 !== this._writableState && this._writableState.destroyed;
},
set: function(e) {
this._writableState && (this._writableState.destroyed = e);
}
});
I.prototype.destroy = d.destroy;
I.prototype._undestroy = d.undestroy;
I.prototype._destroy = function(e, t) {
t(e);
};
}).call(this, e("_process"), "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
}, {
"../errors": 47,
"./_stream_duplex": 48,
"./internal/streams/destroy": 55,
"./internal/streams/state": 59,
"./internal/streams/stream": 60,
_process: 156,
buffer: 65,
inherits: 138,
"util-deprecate": 194
} ],
53: [ function(e, t) {
(function(i) {
"use strict";
var r;
function n(e, t, i) {
t in e ? Object.defineProperty(e, t, {
value: i,
enumerable: !0,
configurable: !0,
writable: !0
}) : e[t] = i;
return e;
}
var a = e("./end-of-stream"), s = Symbol("lastResolve"), o = Symbol("lastReject"), c = Symbol("error"), f = Symbol("ended"), h = Symbol("lastPromise"), u = Symbol("handlePromise"), d = Symbol("stream");
function l(e, t) {
return {
value: e,
done: t
};
}
function p(e) {
var t = e[s];
if (null !== t) {
var i = e[d].read();
if (null !== i) {
e[h] = null;
e[s] = null;
e[o] = null;
t(l(i, !1));
}
}
}
function b(e) {
i.nextTick(p, e);
}
function g(e, t) {
return function(i, r) {
e.then(function() {
t[f] ? i(l(void 0, !0)) : t[u](i, r);
}, r);
};
}
var m = Object.getPrototypeOf(function() {}), v = Object.setPrototypeOf((n(r = {
get stream() {
return this[d];
},
next: function() {
var e = this, t = this[c];
if (null !== t) return Promise.reject(t);
if (this[f]) return Promise.resolve(l(void 0, !0));
if (this[d].destroyed) return new Promise(function(t, r) {
i.nextTick(function() {
e[c] ? r(e[c]) : t(l(void 0, !0));
});
});
var r, n = this[h];
if (n) r = new Promise(g(n, this)); else {
var a = this[d].read();
if (null !== a) return Promise.resolve(l(a, !1));
r = new Promise(this[u]);
}
this[h] = r;
return r;
}
}, Symbol.asyncIterator, function() {
return this;
}), n(r, "return", function() {
var e = this;
return new Promise(function(t, i) {
e[d].destroy(null, function(e) {
e ? i(e) : t(l(void 0, !0));
});
});
}), r), m);
t.exports = function(e) {
var t, i = Object.create(v, (n(t = {}, d, {
value: e,
writable: !0
}), n(t, s, {
value: null,
writable: !0
}), n(t, o, {
value: null,
writable: !0
}), n(t, c, {
value: null,
writable: !0
}), n(t, f, {
value: e._readableState.endEmitted,
writable: !0
}), n(t, u, {
value: function(e, t) {
var r = i[d].read();
if (r) {
i[h] = null;
i[s] = null;
i[o] = null;
e(l(r, !1));
} else {
i[s] = e;
i[o] = t;
}
},
writable: !0
}), t));
i[h] = null;
a(e, function(e) {
if (e && "ERR_STREAM_PREMATURE_CLOSE" !== e.code) {
var t = i[o];
if (null !== t) {
i[h] = null;
i[s] = null;
i[o] = null;
t(e);
}
i[c] = e;
} else {
var r = i[s];
if (null !== r) {
i[h] = null;
i[s] = null;
i[o] = null;
r(l(void 0, !0));
}
i[f] = !0;
}
});
e.on("readable", b.bind(null, i));
return i;
};
}).call(this, e("_process"));
}, {
"./end-of-stream": 56,
_process: 156
} ],
54: [ function(e, t) {
"use strict";
function i(e, t) {
var i = Object.keys(e);
if (Object.getOwnPropertySymbols) {
var r = Object.getOwnPropertySymbols(e);
t && (r = r.filter(function(t) {
return Object.getOwnPropertyDescriptor(e, t).enumerable;
}));
i.push.apply(i, r);
}
return i;
}
function r(e) {
for (var t = 1; t < arguments.length; t++) {
var r = null != arguments[t] ? arguments[t] : {};
t % 2 ? i(Object(r), !0).forEach(function(t) {
n(e, t, r[t]);
}) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e, Object.getOwnPropertyDescriptors(r)) : i(Object(r)).forEach(function(t) {
Object.defineProperty(e, t, Object.getOwnPropertyDescriptor(r, t));
});
}
return e;
}
function n(e, t, i) {
t in e ? Object.defineProperty(e, t, {
value: i,
enumerable: !0,
configurable: !0,
writable: !0
}) : e[t] = i;
return e;
}
function a(e, t) {
if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
}
function s(e, t) {
for (var i = 0; i < t.length; i++) {
var r = t[i];
r.enumerable = r.enumerable || !1;
r.configurable = !0;
"value" in r && (r.writable = !0);
Object.defineProperty(e, r.key, r);
}
}
function o(e, t, i) {
t && s(e.prototype, t);
i && s(e, i);
return e;
}
var c = e("buffer").Buffer, f = e("util").inspect, h = f && f.custom || "inspect";
t.exports = function() {
function e() {
a(this, e);
this.head = null;
this.tail = null;
this.length = 0;
}
o(e, [ {
key: "push",
value: function(e) {
var t = {
data: e,
next: null
};
this.length > 0 ? this.tail.next = t : this.head = t;
this.tail = t;
++this.length;
}
}, {
key: "unshift",
value: function(e) {
var t = {
data: e,
next: this.head
};
0 === this.length && (this.tail = t);
this.head = t;
++this.length;
}
}, {
key: "shift",
value: function() {
if (0 !== this.length) {
var e = this.head.data;
1 === this.length ? this.head = this.tail = null : this.head = this.head.next;
--this.length;
return e;
}
}
}, {
key: "clear",
value: function() {
this.head = this.tail = null;
this.length = 0;
}
}, {
key: "join",
value: function(e) {
if (0 === this.length) return "";
for (var t = this.head, i = "" + t.data; t = t.next; ) i += e + t.data;
return i;
}
}, {
key: "concat",
value: function(e) {
if (0 === this.length) return c.alloc(0);
for (var t, i, r, n = c.allocUnsafe(e >>> 0), a = this.head, s = 0; a; ) {
t = a.data, i = n, r = s, c.prototype.copy.call(t, i, r);
s += a.data.length;
a = a.next;
}
return n;
}
}, {
key: "consume",
value: function(e, t) {
var i;
if (e < this.head.data.length) {
i = this.head.data.slice(0, e);
this.head.data = this.head.data.slice(e);
} else i = e === this.head.data.length ? this.shift() : t ? this._getString(e) : this._getBuffer(e);
return i;
}
}, {
key: "first",
value: function() {
return this.head.data;
}
}, {
key: "_getString",
value: function(e) {
var t = this.head, i = 1, r = t.data;
e -= r.length;
for (;t = t.next; ) {
var n = t.data, a = e > n.length ? n.length : e;
a === n.length ? r += n : r += n.slice(0, e);
if (0 == (e -= a)) {
if (a === n.length) {
++i;
t.next ? this.head = t.next : this.head = this.tail = null;
} else {
this.head = t;
t.data = n.slice(a);
}
break;
}
++i;
}
this.length -= i;
return r;
}
}, {
key: "_getBuffer",
value: function(e) {
var t = c.allocUnsafe(e), i = this.head, r = 1;
i.data.copy(t);
e -= i.data.length;
for (;i = i.next; ) {
var n = i.data, a = e > n.length ? n.length : e;
n.copy(t, t.length - e, 0, a);
if (0 == (e -= a)) {
if (a === n.length) {
++r;
i.next ? this.head = i.next : this.head = this.tail = null;
} else {
this.head = i;
i.data = n.slice(a);
}
break;
}
++r;
}
this.length -= r;
return t;
}
}, {
key: h,
value: function(e, t) {
return f(this, r({}, t, {
depth: 0,
customInspect: !1
}));
}
} ]);
return e;
}();
}, {
buffer: 65,
util: 19
} ],
55: [ function(e, t) {
(function(e) {
"use strict";
function i(e, t) {
n(e, t);
r(e);
}
function r(e) {
e._writableState && !e._writableState.emitClose || e._readableState && !e._readableState.emitClose || e.emit("close");
}
function n(e, t) {
e.emit("error", t);
}
t.exports = {
destroy: function(t, a) {
var s = this, o = this._readableState && this._readableState.destroyed, c = this._writableState && this._writableState.destroyed;
if (o || c) {
if (a) a(t); else if (t) if (this._writableState) {
if (!this._writableState.errorEmitted) {
this._writableState.errorEmitted = !0;
e.nextTick(n, this, t);
}
} else e.nextTick(n, this, t);
return this;
}
this._readableState && (this._readableState.destroyed = !0);
this._writableState && (this._writableState.destroyed = !0);
this._destroy(t || null, function(t) {
if (!a && t) if (s._writableState) if (s._writableState.errorEmitted) e.nextTick(r, s); else {
s._writableState.errorEmitted = !0;
e.nextTick(i, s, t);
} else e.nextTick(i, s, t); else if (a) {
e.nextTick(r, s);
a(t);
} else e.nextTick(r, s);
});
return this;
},
undestroy: function() {
if (this._readableState) {
this._readableState.destroyed = !1;
this._readableState.reading = !1;
this._readableState.ended = !1;
this._readableState.endEmitted = !1;
}
if (this._writableState) {
this._writableState.destroyed = !1;
this._writableState.ended = !1;
this._writableState.ending = !1;
this._writableState.finalCalled = !1;
this._writableState.prefinished = !1;
this._writableState.finished = !1;
this._writableState.errorEmitted = !1;
}
},
errorOrDestroy: function(e, t) {
var i = e._readableState, r = e._writableState;
i && i.autoDestroy || r && r.autoDestroy ? e.destroy(t) : e.emit("error", t);
}
};
}).call(this, e("_process"));
}, {
_process: 156
} ],
56: [ function(e, t) {
"use strict";
var i = e("../../../errors").codes.ERR_STREAM_PREMATURE_CLOSE;
function r(e) {
var t = !1;
return function() {
if (!t) {
t = !0;
for (var i = arguments.length, r = new Array(i), n = 0; n < i; n++) r[n] = arguments[n];
e.apply(this, r);
}
};
}
function n() {}
function a(e) {
return e.setHeader && "function" == typeof e.abort;
}
t.exports = function e(t, s, o) {
if ("function" == typeof s) return e(t, null, s);
s || (s = {});
o = r(o || n);
var c = s.readable || !1 !== s.readable && t.readable, f = s.writable || !1 !== s.writable && t.writable, h = function() {
t.writable || d();
}, u = t._writableState && t._writableState.finished, d = function() {
f = !1;
u = !0;
c || o.call(t);
}, l = t._readableState && t._readableState.endEmitted, p = function() {
c = !1;
l = !0;
f || o.call(t);
}, b = function(e) {
o.call(t, e);
}, g = function() {
var e;
if (c && !l) {
t._readableState && t._readableState.ended || (e = new i());
return o.call(t, e);
}
if (f && !u) {
t._writableState && t._writableState.ended || (e = new i());
return o.call(t, e);
}
}, m = function() {
t.req.on("finish", d);
};
if (a(t)) {
t.on("complete", d);
t.on("abort", g);
t.req ? m() : t.on("request", m);
} else if (f && !t._writableState) {
t.on("end", h);
t.on("close", h);
}
t.on("end", p);
t.on("finish", d);
!1 !== s.error && t.on("error", b);
t.on("close", g);
return function() {
t.removeListener("complete", d);
t.removeListener("abort", g);
t.removeListener("request", m);
t.req && t.req.removeListener("finish", d);
t.removeListener("end", h);
t.removeListener("close", h);
t.removeListener("finish", d);
t.removeListener("end", p);
t.removeListener("error", b);
t.removeListener("close", g);
};
};
}, {
"../../../errors": 47
} ],
57: [ function(e, t) {
t.exports = function() {
throw new Error("Readable.from is not available in the browser");
};
}, {} ],
58: [ function(e, t) {
"use strict";
var i;
function r(e) {
var t = !1;
return function() {
if (!t) {
t = !0;
e.apply(void 0, arguments);
}
};
}
var n = e("../../../errors").codes, a = n.ERR_MISSING_ARGS, s = n.ERR_STREAM_DESTROYED;
function o(e) {
if (e) throw e;
}
function c(e) {
return e.setHeader && "function" == typeof e.abort;
}
function f(t, n, a, o) {
o = r(o);
var f = !1;
t.on("close", function() {
f = !0;
});
void 0 === i && (i = e("./end-of-stream"));
i(t, {
readable: n,
writable: a
}, function(e) {
if (e) return o(e);
f = !0;
o();
});
var h = !1;
return function(e) {
if (!f && !h) {
h = !0;
if (c(t)) return t.abort();
if ("function" == typeof t.destroy) return t.destroy();
o(e || new s("pipe"));
}
};
}
function h(e) {
e();
}
function u(e, t) {
return e.pipe(t);
}
function d(e) {
return e.length ? "function" != typeof e[e.length - 1] ? o : e.pop() : o;
}
t.exports = function() {
for (var e = arguments.length, t = new Array(e), i = 0; i < e; i++) t[i] = arguments[i];
var r, n = d(t);
Array.isArray(t[0]) && (t = t[0]);
if (t.length < 2) throw new a("streams");
var s = t.map(function(e, i) {
var a = i < t.length - 1;
return f(e, a, i > 0, function(e) {
r || (r = e);
e && s.forEach(h);
if (!a) {
s.forEach(h);
n(r);
}
});
});
return t.reduce(u);
};
}, {
"../../../errors": 47,
"./end-of-stream": 56
} ],
59: [ function(e, t) {
"use strict";
var i = e("../../../errors").codes.ERR_INVALID_OPT_VALUE;
function r(e, t, i) {
return null != e.highWaterMark ? e.highWaterMark : t ? e[i] : null;
}
t.exports = {
getHighWaterMark: function(e, t, n, a) {
var s = r(t, a, n);
if (null != s) {
if (!isFinite(s) || Math.floor(s) !== s || s < 0) throw new i(a ? n : "highWaterMark", s);
return Math.floor(s);
}
return e.objectMode ? 16 : 16384;
}
};
}, {
"../../../errors": 47
} ],
60: [ function(e, t) {
t.exports = e("events").EventEmitter;
}, {
events: 104
} ],
61: [ function(e, t, i) {
(i = t.exports = e("./lib/_stream_readable.js")).Stream = i;
i.Readable = i;
i.Writable = e("./lib/_stream_writable.js");
i.Duplex = e("./lib/_stream_duplex.js");
i.Transform = e("./lib/_stream_transform.js");
i.PassThrough = e("./lib/_stream_passthrough.js");
i.finished = e("./lib/internal/streams/end-of-stream.js");
i.pipeline = e("./lib/internal/streams/pipeline.js");
}, {
"./lib/_stream_duplex.js": 48,
"./lib/_stream_passthrough.js": 49,
"./lib/_stream_readable.js": 50,
"./lib/_stream_transform.js": 51,
"./lib/_stream_writable.js": 52,
"./lib/internal/streams/end-of-stream.js": 56,
"./lib/internal/streams/pipeline.js": 58
} ],
62: [ function(e, t, i) {
var r = e("buffer"), n = r.Buffer;
function a(e, t) {
for (var i in e) t[i] = e[i];
}
if (n.from && n.alloc && n.allocUnsafe && n.allocUnsafeSlow) t.exports = r; else {
a(r, i);
i.Buffer = s;
}
function s(e, t, i) {
return n(e, t, i);
}
s.prototype = Object.create(n.prototype);
a(n, s);
s.from = function(e, t, i) {
if ("number" == typeof e) throw new TypeError("Argument must not be a number");
return n(e, t, i);
};
s.alloc = function(e, t, i) {
if ("number" != typeof e) throw new TypeError("Argument must be a number");
var r = n(e);
void 0 !== t ? "string" == typeof i ? r.fill(t, i) : r.fill(t) : r.fill(0);
return r;
};
s.allocUnsafe = function(e) {
if ("number" != typeof e) throw new TypeError("Argument must be a number");
return n(e);
};
s.allocUnsafeSlow = function(e) {
if ("number" != typeof e) throw new TypeError("Argument must be a number");
return r.SlowBuffer(e);
};
}, {
buffer: 65
} ],
63: [ function(e, t, i) {
"use strict";
var r = e("safe-buffer").Buffer, n = r.isEncoding || function(e) {
switch ((e = "" + e) && e.toLowerCase()) {
case "hex":
case "utf8":
case "utf-8":
case "ascii":
case "binary":
case "base64":
case "ucs2":
case "ucs-2":
case "utf16le":
case "utf-16le":
case "raw":
return !0;

default:
return !1;
}
};
function a(e) {
if (!e) return "utf8";
for (var t; ;) switch (e) {
case "utf8":
case "utf-8":
return "utf8";

case "ucs2":
case "ucs-2":
case "utf16le":
case "utf-16le":
return "utf16le";

case "latin1":
case "binary":
return "latin1";

case "base64":
case "ascii":
case "hex":
return e;

default:
if (t) return;
e = ("" + e).toLowerCase();
t = !0;
}
}
function s(e) {
var t = a(e);
if ("string" != typeof t && (r.isEncoding === n || !n(e))) throw new Error("Unknown encoding: " + e);
return t || e;
}
i.StringDecoder = o;
function o(e) {
this.encoding = s(e);
var t;
switch (this.encoding) {
case "utf16le":
this.text = d;
this.end = l;
t = 4;
break;

case "utf8":
this.fillLast = u;
t = 4;
break;

case "base64":
this.text = p;
this.end = b;
t = 3;
break;

default:
this.write = g;
this.end = m;
return;
}
this.lastNeed = 0;
this.lastTotal = 0;
this.lastChar = r.allocUnsafe(t);
}
o.prototype.write = function(e) {
if (0 === e.length) return "";
var t, i;
if (this.lastNeed) {
if (void 0 === (t = this.fillLast(e))) return "";
i = this.lastNeed;
this.lastNeed = 0;
} else i = 0;
return i < e.length ? t ? t + this.text(e, i) : this.text(e, i) : t || "";
};
o.prototype.end = function(e) {
var t = e && e.length ? this.write(e) : "";
return this.lastNeed ? t + "�" : t;
};
o.prototype.text = function(e, t) {
var i = f(this, e, t);
if (!this.lastNeed) return e.toString("utf8", t);
this.lastTotal = i;
var r = e.length - (i - this.lastNeed);
e.copy(this.lastChar, 0, r);
return e.toString("utf8", t, r);
};
o.prototype.fillLast = function(e) {
if (this.lastNeed <= e.length) {
e.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, this.lastNeed);
return this.lastChar.toString(this.encoding, 0, this.lastTotal);
}
e.copy(this.lastChar, this.lastTotal - this.lastNeed, 0, e.length);
this.lastNeed -= e.length;
};
function c(e) {
return e <= 127 ? 0 : e >> 5 == 6 ? 2 : e >> 4 == 14 ? 3 : e >> 3 == 30 ? 4 : e >> 6 == 2 ? -1 : -2;
}
function f(e, t, i) {
var r = t.length - 1;
if (r < i) return 0;
var n = c(t[r]);
if (n >= 0) {
n > 0 && (e.lastNeed = n - 1);
return n;
}
if (--r < i || -2 === n) return 0;
if ((n = c(t[r])) >= 0) {
n > 0 && (e.lastNeed = n - 2);
return n;
}
if (--r < i || -2 === n) return 0;
if ((n = c(t[r])) >= 0) {
n > 0 && (2 === n ? n = 0 : e.lastNeed = n - 3);
return n;
}
return 0;
}
function h(e, t) {
if (128 != (192 & t[0])) {
e.lastNeed = 0;
return "�";
}
if (e.lastNeed > 1 && t.length > 1) {
if (128 != (192 & t[1])) {
e.lastNeed = 1;
return "�";
}
if (e.lastNeed > 2 && t.length > 2 && 128 != (192 & t[2])) {
e.lastNeed = 2;
return "�";
}
}
}
function u(e) {
var t = this.lastTotal - this.lastNeed, i = h(this, e);
if (void 0 !== i) return i;
if (this.lastNeed <= e.length) {
e.copy(this.lastChar, t, 0, this.lastNeed);
return this.lastChar.toString(this.encoding, 0, this.lastTotal);
}
e.copy(this.lastChar, t, 0, e.length);
this.lastNeed -= e.length;
}
function d(e, t) {
if ((e.length - t) % 2 == 0) {
var i = e.toString("utf16le", t);
if (i) {
var r = i.charCodeAt(i.length - 1);
if (r >= 55296 && r <= 56319) {
this.lastNeed = 2;
this.lastTotal = 4;
this.lastChar[0] = e[e.length - 2];
this.lastChar[1] = e[e.length - 1];
return i.slice(0, -1);
}
}
return i;
}
this.lastNeed = 1;
this.lastTotal = 2;
this.lastChar[0] = e[e.length - 1];
return e.toString("utf16le", t, e.length - 1);
}
function l(e) {
var t = e && e.length ? this.write(e) : "";
if (this.lastNeed) {
var i = this.lastTotal - this.lastNeed;
return t + this.lastChar.toString("utf16le", 0, i);
}
return t;
}
function p(e, t) {
var i = (e.length - t) % 3;
if (0 === i) return e.toString("base64", t);
this.lastNeed = 3 - i;
this.lastTotal = 3;
if (1 === i) this.lastChar[0] = e[e.length - 1]; else {
this.lastChar[0] = e[e.length - 2];
this.lastChar[1] = e[e.length - 1];
}
return e.toString("base64", t, e.length - i);
}
function b(e) {
var t = e && e.length ? this.write(e) : "";
return this.lastNeed ? t + this.lastChar.toString("base64", 0, 3 - this.lastNeed) : t;
}
function g(e) {
return e.toString(this.encoding);
}
function m(e) {
return e && e.length ? this.write(e) : "";
}
}, {
"safe-buffer": 62
} ],
64: [ function(e, t) {
(function(e) {
t.exports = function(t, i) {
for (var r = Math.min(t.length, i.length), n = new e(r), a = 0; a < r; ++a) n[a] = t[a] ^ i[a];
return n;
};
}).call(this, e("buffer").Buffer);
}, {
buffer: 65
} ],
65: [ function(e, t, i) {
(function(t) {
"use strict";
var r = e("base64-js"), n = e("ieee754"), a = e("isarray");
i.Buffer = c;
i.SlowBuffer = function(e) {
+e != e && (e = 0);
return c.alloc(+e);
};
i.INSPECT_MAX_BYTES = 50;
c.TYPED_ARRAY_SUPPORT = void 0 !== t.TYPED_ARRAY_SUPPORT ? t.TYPED_ARRAY_SUPPORT : function() {
try {
var e = new Uint8Array(1);
e.__proto__ = {
__proto__: Uint8Array.prototype,
foo: function() {
return 42;
}
};
return 42 === e.foo() && "function" == typeof e.subarray && 0 === e.subarray(1, 1).byteLength;
} catch (e) {
return !1;
}
}();
i.kMaxLength = s();
function s() {
return c.TYPED_ARRAY_SUPPORT ? 2147483647 : 1073741823;
}
function o(e, t) {
if (s() < t) throw new RangeError("Invalid typed array length");
if (c.TYPED_ARRAY_SUPPORT) (e = new Uint8Array(t)).__proto__ = c.prototype; else {
null === e && (e = new c(t));
e.length = t;
}
return e;
}
function c(e, t, i) {
if (!(c.TYPED_ARRAY_SUPPORT || this instanceof c)) return new c(e, t, i);
if ("number" == typeof e) {
if ("string" == typeof t) throw new Error("If encoding is specified then the first argument must be a string");
return d(this, e);
}
return f(this, e, t, i);
}
c.poolSize = 8192;
c._augment = function(e) {
e.__proto__ = c.prototype;
return e;
};
function f(e, t, i, r) {
if ("number" == typeof t) throw new TypeError('"value" argument must not be a number');
return "undefined" != typeof ArrayBuffer && t instanceof ArrayBuffer ? b(e, t, i, r) : "string" == typeof t ? l(e, t, i) : g(e, t);
}
c.from = function(e, t, i) {
return f(null, e, t, i);
};
if (c.TYPED_ARRAY_SUPPORT) {
c.prototype.__proto__ = Uint8Array.prototype;
c.__proto__ = Uint8Array;
"undefined" != typeof Symbol && Symbol.species && c[Symbol.species] === c && Object.defineProperty(c, Symbol.species, {
value: null,
configurable: !0
});
}
function h(e) {
if ("number" != typeof e) throw new TypeError('"size" argument must be a number');
if (e < 0) throw new RangeError('"size" argument must not be negative');
}
function u(e, t, i, r) {
h(t);
return t <= 0 ? o(e, t) : void 0 !== i ? "string" == typeof r ? o(e, t).fill(i, r) : o(e, t).fill(i) : o(e, t);
}
c.alloc = function(e, t, i) {
return u(null, e, t, i);
};
function d(e, t) {
h(t);
e = o(e, t < 0 ? 0 : 0 | m(t));
if (!c.TYPED_ARRAY_SUPPORT) for (var i = 0; i < t; ++i) e[i] = 0;
return e;
}
c.allocUnsafe = function(e) {
return d(null, e);
};
c.allocUnsafeSlow = function(e) {
return d(null, e);
};
function l(e, t, i) {
"string" == typeof i && "" !== i || (i = "utf8");
if (!c.isEncoding(i)) throw new TypeError('"encoding" must be a valid string encoding');
var r = 0 | v(t, i), n = (e = o(e, r)).write(t, i);
n !== r && (e = e.slice(0, n));
return e;
}
function p(e, t) {
var i = t.length < 0 ? 0 : 0 | m(t.length);
e = o(e, i);
for (var r = 0; r < i; r += 1) e[r] = 255 & t[r];
return e;
}
function b(e, t, i, r) {
t.byteLength;
if (i < 0 || t.byteLength < i) throw new RangeError("'offset' is out of bounds");
if (t.byteLength < i + (r || 0)) throw new RangeError("'length' is out of bounds");
t = void 0 === i && void 0 === r ? new Uint8Array(t) : void 0 === r ? new Uint8Array(t, i) : new Uint8Array(t, i, r);
c.TYPED_ARRAY_SUPPORT ? (e = t).__proto__ = c.prototype : e = p(e, t);
return e;
}
function g(e, t) {
if (c.isBuffer(t)) {
var i = 0 | m(t.length);
if (0 === (e = o(e, i)).length) return e;
t.copy(e, 0, 0, i);
return e;
}
if (t) {
if ("undefined" != typeof ArrayBuffer && t.buffer instanceof ArrayBuffer || "length" in t) return "number" != typeof t.length || (r = t.length) != r ? o(e, 0) : p(e, t);
if ("Buffer" === t.type && a(t.data)) return p(e, t.data);
}
var r;
throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.");
}
function m(e) {
if (e >= s()) throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x" + s().toString(16) + " bytes");
return 0 | e;
}
c.isBuffer = function(e) {
return !(null == e || !e._isBuffer);
};
c.compare = function(e, t) {
if (!c.isBuffer(e) || !c.isBuffer(t)) throw new TypeError("Arguments must be Buffers");
if (e === t) return 0;
for (var i = e.length, r = t.length, n = 0, a = Math.min(i, r); n < a; ++n) if (e[n] !== t[n]) {
i = e[n];
r = t[n];
break;
}
return i < r ? -1 : r < i ? 1 : 0;
};
c.isEncoding = function(e) {
switch (String(e).toLowerCase()) {
case "hex":
case "utf8":
case "utf-8":
case "ascii":
case "latin1":
case "binary":
case "base64":
case "ucs2":
case "ucs-2":
case "utf16le":
case "utf-16le":
return !0;

default:
return !1;
}
};
c.concat = function(e, t) {
if (!a(e)) throw new TypeError('"list" argument must be an Array of Buffers');
if (0 === e.length) return c.alloc(0);
var i;
if (void 0 === t) {
t = 0;
for (i = 0; i < e.length; ++i) t += e[i].length;
}
var r = c.allocUnsafe(t), n = 0;
for (i = 0; i < e.length; ++i) {
var s = e[i];
if (!c.isBuffer(s)) throw new TypeError('"list" argument must be an Array of Buffers');
s.copy(r, n);
n += s.length;
}
return r;
};
function v(e, t) {
if (c.isBuffer(e)) return e.length;
if ("undefined" != typeof ArrayBuffer && "function" == typeof ArrayBuffer.isView && (ArrayBuffer.isView(e) || e instanceof ArrayBuffer)) return e.byteLength;
"string" != typeof e && (e = "" + e);
var i = e.length;
if (0 === i) return 0;
for (var r = !1; ;) switch (t) {
case "ascii":
case "latin1":
case "binary":
return i;

case "utf8":
case "utf-8":
case void 0:
return V(e).length;

case "ucs2":
case "ucs-2":
case "utf16le":
case "utf-16le":
return 2 * i;

case "hex":
return i >>> 1;

case "base64":
return X(e).length;

default:
if (r) return V(e).length;
t = ("" + t).toLowerCase();
r = !0;
}
}
c.byteLength = v;
function y(e, t, i) {
var r = !1;
(void 0 === t || t < 0) && (t = 0);
if (t > this.length) return "";
(void 0 === i || i > this.length) && (i = this.length);
if (i <= 0) return "";
if ((i >>>= 0) <= (t >>>= 0)) return "";
e || (e = "utf8");
for (;;) switch (e) {
case "hex":
return D(this, t, i);

case "utf8":
case "utf-8":
return x(this, t, i);

case "ascii":
return T(this, t, i);

case "latin1":
case "binary":
return j(this, t, i);

case "base64":
return C(this, t, i);

case "ucs2":
case "ucs-2":
case "utf16le":
case "utf-16le":
return R(this, t, i);

default:
if (r) throw new TypeError("Unknown encoding: " + e);
e = (e + "").toLowerCase();
r = !0;
}
}
c.prototype._isBuffer = !0;
function _(e, t, i) {
var r = e[t];
e[t] = e[i];
e[i] = r;
}
c.prototype.swap16 = function() {
var e = this.length;
if (e % 2 != 0) throw new RangeError("Buffer size must be a multiple of 16-bits");
for (var t = 0; t < e; t += 2) _(this, t, t + 1);
return this;
};
c.prototype.swap32 = function() {
var e = this.length;
if (e % 4 != 0) throw new RangeError("Buffer size must be a multiple of 32-bits");
for (var t = 0; t < e; t += 4) {
_(this, t, t + 3);
_(this, t + 1, t + 2);
}
return this;
};
c.prototype.swap64 = function() {
var e = this.length;
if (e % 8 != 0) throw new RangeError("Buffer size must be a multiple of 64-bits");
for (var t = 0; t < e; t += 8) {
_(this, t, t + 7);
_(this, t + 1, t + 6);
_(this, t + 2, t + 5);
_(this, t + 3, t + 4);
}
return this;
};
c.prototype.toString = function() {
var e = 0 | this.length;
return 0 === e ? "" : 0 === arguments.length ? x(this, 0, e) : y.apply(this, arguments);
};
c.prototype.equals = function(e) {
if (!c.isBuffer(e)) throw new TypeError("Argument must be a Buffer");
return this === e || 0 === c.compare(this, e);
};
c.prototype.inspect = function() {
var e = "", t = i.INSPECT_MAX_BYTES;
if (this.length > 0) {
e = this.toString("hex", 0, t).match(/.{2}/g).join(" ");
this.length > t && (e += " ... ");
}
return "<Buffer " + e + ">";
};
c.prototype.compare = function(e, t, i, r, n) {
if (!c.isBuffer(e)) throw new TypeError("Argument must be a Buffer");
void 0 === t && (t = 0);
void 0 === i && (i = e ? e.length : 0);
void 0 === r && (r = 0);
void 0 === n && (n = this.length);
if (t < 0 || i > e.length || r < 0 || n > this.length) throw new RangeError("out of range index");
if (r >= n && t >= i) return 0;
if (r >= n) return -1;
if (t >= i) return 1;
if (this === e) return 0;
for (var a = (n >>>= 0) - (r >>>= 0), s = (i >>>= 0) - (t >>>= 0), o = Math.min(a, s), f = this.slice(r, n), h = e.slice(t, i), u = 0; u < o; ++u) if (f[u] !== h[u]) {
a = f[u];
s = h[u];
break;
}
return a < s ? -1 : s < a ? 1 : 0;
};
function w(e, t, i, r, n) {
if (0 === e.length) return -1;
if ("string" == typeof i) {
r = i;
i = 0;
} else i > 2147483647 ? i = 2147483647 : i < -2147483648 && (i = -2147483648);
i = +i;
isNaN(i) && (i = n ? 0 : e.length - 1);
i < 0 && (i = e.length + i);
if (i >= e.length) {
if (n) return -1;
i = e.length - 1;
} else if (i < 0) {
if (!n) return -1;
i = 0;
}
"string" == typeof t && (t = c.from(t, r));
if (c.isBuffer(t)) return 0 === t.length ? -1 : S(e, t, i, r, n);
if ("number" == typeof t) {
t &= 255;
return c.TYPED_ARRAY_SUPPORT && "function" == typeof Uint8Array.prototype.indexOf ? n ? Uint8Array.prototype.indexOf.call(e, t, i) : Uint8Array.prototype.lastIndexOf.call(e, t, i) : S(e, [ t ], i, r, n);
}
throw new TypeError("val must be string, number or Buffer");
}
function S(e, t, i, r, n) {
var a, s = 1, o = e.length, c = t.length;
if (void 0 !== r && ("ucs2" === (r = String(r).toLowerCase()) || "ucs-2" === r || "utf16le" === r || "utf-16le" === r)) {
if (e.length < 2 || t.length < 2) return -1;
s = 2;
o /= 2;
c /= 2;
i /= 2;
}
function f(e, t) {
return 1 === s ? e[t] : e.readUInt16BE(t * s);
}
if (n) {
var h = -1;
for (a = i; a < o; a++) if (f(e, a) === f(t, -1 === h ? 0 : a - h)) {
-1 === h && (h = a);
if (a - h + 1 === c) return h * s;
} else {
-1 !== h && (a -= a - h);
h = -1;
}
} else {
i + c > o && (i = o - c);
for (a = i; a >= 0; a--) {
for (var u = !0, d = 0; d < c; d++) if (f(e, a + d) !== f(t, d)) {
u = !1;
break;
}
if (u) return a;
}
}
return -1;
}
c.prototype.includes = function(e, t, i) {
return -1 !== this.indexOf(e, t, i);
};
c.prototype.indexOf = function(e, t, i) {
return w(this, e, t, i, !0);
};
c.prototype.lastIndexOf = function(e, t, i) {
return w(this, e, t, i, !1);
};
function k(e, t, i, r) {
i = Number(i) || 0;
var n = e.length - i;
r ? (r = Number(r)) > n && (r = n) : r = n;
var a = t.length;
if (a % 2 != 0) throw new TypeError("Invalid hex string");
r > a / 2 && (r = a / 2);
for (var s = 0; s < r; ++s) {
var o = parseInt(t.substr(2 * s, 2), 16);
if (isNaN(o)) return s;
e[i + s] = o;
}
return s;
}
function M(e, t, i, r) {
return Z(V(t, e.length - i), e, i, r);
}
function A(e, t, i, r) {
return Z(G(t), e, i, r);
}
function I(e, t, i, r) {
return A(e, t, i, r);
}
function E(e, t, i, r) {
return Z(X(t), e, i, r);
}
function P(e, t, i, r) {
return Z(Y(t, e.length - i), e, i, r);
}
c.prototype.write = function(e, t, i, r) {
if (void 0 === t) {
r = "utf8";
i = this.length;
t = 0;
} else if (void 0 === i && "string" == typeof t) {
r = t;
i = this.length;
t = 0;
} else {
if (!isFinite(t)) throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");
t |= 0;
if (isFinite(i)) {
i |= 0;
void 0 === r && (r = "utf8");
} else {
r = i;
i = void 0;
}
}
var n = this.length - t;
(void 0 === i || i > n) && (i = n);
if (e.length > 0 && (i < 0 || t < 0) || t > this.length) throw new RangeError("Attempt to write outside buffer bounds");
r || (r = "utf8");
for (var a = !1; ;) switch (r) {
case "hex":
return k(this, e, t, i);

case "utf8":
case "utf-8":
return M(this, e, t, i);

case "ascii":
return A(this, e, t, i);

case "latin1":
case "binary":
return I(this, e, t, i);

case "base64":
return E(this, e, t, i);

case "ucs2":
case "ucs-2":
case "utf16le":
case "utf-16le":
return P(this, e, t, i);

default:
if (a) throw new TypeError("Unknown encoding: " + r);
r = ("" + r).toLowerCase();
a = !0;
}
};
c.prototype.toJSON = function() {
return {
type: "Buffer",
data: Array.prototype.slice.call(this._arr || this, 0)
};
};
function C(e, t, i) {
return 0 === t && i === e.length ? r.fromByteArray(e) : r.fromByteArray(e.slice(t, i));
}
function x(e, t, i) {
i = Math.min(e.length, i);
for (var r = [], n = t; n < i; ) {
var a = e[n], s = null, o = a > 239 ? 4 : a > 223 ? 3 : a > 191 ? 2 : 1;
if (n + o <= i) {
var c, f, h, u;
switch (o) {
case 1:
a < 128 && (s = a);
break;

case 2:
128 == (192 & (c = e[n + 1])) && (u = (31 & a) << 6 | 63 & c) > 127 && (s = u);
break;

case 3:
c = e[n + 1];
f = e[n + 2];
128 == (192 & c) && 128 == (192 & f) && (u = (15 & a) << 12 | (63 & c) << 6 | 63 & f) > 2047 && (u < 55296 || u > 57343) && (s = u);
break;

case 4:
c = e[n + 1];
f = e[n + 2];
h = e[n + 3];
128 == (192 & c) && 128 == (192 & f) && 128 == (192 & h) && (u = (15 & a) << 18 | (63 & c) << 12 | (63 & f) << 6 | 63 & h) > 65535 && u < 1114112 && (s = u);
}
}
if (null === s) {
s = 65533;
o = 1;
} else if (s > 65535) {
s -= 65536;
r.push(s >>> 10 & 1023 | 55296);
s = 56320 | 1023 & s;
}
r.push(s);
n += o;
}
return N(r);
}
var O = 4096;
function N(e) {
var t = e.length;
if (t <= O) return String.fromCharCode.apply(String, e);
for (var i = "", r = 0; r < t; ) i += String.fromCharCode.apply(String, e.slice(r, r += O));
return i;
}
function T(e, t, i) {
var r = "";
i = Math.min(e.length, i);
for (var n = t; n < i; ++n) r += String.fromCharCode(127 & e[n]);
return r;
}
function j(e, t, i) {
var r = "";
i = Math.min(e.length, i);
for (var n = t; n < i; ++n) r += String.fromCharCode(e[n]);
return r;
}
function D(e, t, i) {
var r, n = e.length;
(!t || t < 0) && (t = 0);
(!i || i < 0 || i > n) && (i = n);
for (var a = "", s = t; s < i; ++s) a += (r = e[s]) < 16 ? "0" + r.toString(16) : r.toString(16);
return a;
}
function R(e, t, i) {
for (var r = e.slice(t, i), n = "", a = 0; a < r.length; a += 2) n += String.fromCharCode(r[a] + 256 * r[a + 1]);
return n;
}
c.prototype.slice = function(e, t) {
var i, r = this.length;
(e = ~~e) < 0 ? (e += r) < 0 && (e = 0) : e > r && (e = r);
(t = void 0 === t ? r : ~~t) < 0 ? (t += r) < 0 && (t = 0) : t > r && (t = r);
t < e && (t = e);
if (c.TYPED_ARRAY_SUPPORT) (i = this.subarray(e, t)).__proto__ = c.prototype; else {
var n = t - e;
i = new c(n, void 0);
for (var a = 0; a < n; ++a) i[a] = this[a + e];
}
return i;
};
function B(e, t, i) {
if (e % 1 != 0 || e < 0) throw new RangeError("offset is not uint");
if (e + t > i) throw new RangeError("Trying to access beyond buffer length");
}
c.prototype.readUIntLE = function(e, t, i) {
e |= 0;
t |= 0;
i || B(e, t, this.length);
for (var r = this[e], n = 1, a = 0; ++a < t && (n *= 256); ) r += this[e + a] * n;
return r;
};
c.prototype.readUIntBE = function(e, t, i) {
e |= 0;
t |= 0;
i || B(e, t, this.length);
for (var r = this[e + --t], n = 1; t > 0 && (n *= 256); ) r += this[e + --t] * n;
return r;
};
c.prototype.readUInt8 = function(e, t) {
t || B(e, 1, this.length);
return this[e];
};
c.prototype.readUInt16LE = function(e, t) {
t || B(e, 2, this.length);
return this[e] | this[e + 1] << 8;
};
c.prototype.readUInt16BE = function(e, t) {
t || B(e, 2, this.length);
return this[e] << 8 | this[e + 1];
};
c.prototype.readUInt32LE = function(e, t) {
t || B(e, 4, this.length);
return (this[e] | this[e + 1] << 8 | this[e + 2] << 16) + 16777216 * this[e + 3];
};
c.prototype.readUInt32BE = function(e, t) {
t || B(e, 4, this.length);
return 16777216 * this[e] + (this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3]);
};
c.prototype.readIntLE = function(e, t, i) {
e |= 0;
t |= 0;
i || B(e, t, this.length);
for (var r = this[e], n = 1, a = 0; ++a < t && (n *= 256); ) r += this[e + a] * n;
r >= (n *= 128) && (r -= Math.pow(2, 8 * t));
return r;
};
c.prototype.readIntBE = function(e, t, i) {
e |= 0;
t |= 0;
i || B(e, t, this.length);
for (var r = t, n = 1, a = this[e + --r]; r > 0 && (n *= 256); ) a += this[e + --r] * n;
a >= (n *= 128) && (a -= Math.pow(2, 8 * t));
return a;
};
c.prototype.readInt8 = function(e, t) {
t || B(e, 1, this.length);
return 128 & this[e] ? -1 * (255 - this[e] + 1) : this[e];
};
c.prototype.readInt16LE = function(e, t) {
t || B(e, 2, this.length);
var i = this[e] | this[e + 1] << 8;
return 32768 & i ? 4294901760 | i : i;
};
c.prototype.readInt16BE = function(e, t) {
t || B(e, 2, this.length);
var i = this[e + 1] | this[e] << 8;
return 32768 & i ? 4294901760 | i : i;
};
c.prototype.readInt32LE = function(e, t) {
t || B(e, 4, this.length);
return this[e] | this[e + 1] << 8 | this[e + 2] << 16 | this[e + 3] << 24;
};
c.prototype.readInt32BE = function(e, t) {
t || B(e, 4, this.length);
return this[e] << 24 | this[e + 1] << 16 | this[e + 2] << 8 | this[e + 3];
};
c.prototype.readFloatLE = function(e, t) {
t || B(e, 4, this.length);
return n.read(this, e, !0, 23, 4);
};
c.prototype.readFloatBE = function(e, t) {
t || B(e, 4, this.length);
return n.read(this, e, !1, 23, 4);
};
c.prototype.readDoubleLE = function(e, t) {
t || B(e, 8, this.length);
return n.read(this, e, !0, 52, 8);
};
c.prototype.readDoubleBE = function(e, t) {
t || B(e, 8, this.length);
return n.read(this, e, !1, 52, 8);
};
function L(e, t, i, r, n, a) {
if (!c.isBuffer(e)) throw new TypeError('"buffer" argument must be a Buffer instance');
if (t > n || t < a) throw new RangeError('"value" argument is out of bounds');
if (i + r > e.length) throw new RangeError("Index out of range");
}
c.prototype.writeUIntLE = function(e, t, i, r) {
e = +e;
t |= 0;
i |= 0;
r || L(this, e, t, i, Math.pow(2, 8 * i) - 1, 0);
var n = 1, a = 0;
this[t] = 255 & e;
for (;++a < i && (n *= 256); ) this[t + a] = e / n & 255;
return t + i;
};
c.prototype.writeUIntBE = function(e, t, i, r) {
e = +e;
t |= 0;
i |= 0;
r || L(this, e, t, i, Math.pow(2, 8 * i) - 1, 0);
var n = i - 1, a = 1;
this[t + n] = 255 & e;
for (;--n >= 0 && (a *= 256); ) this[t + n] = e / a & 255;
return t + i;
};
c.prototype.writeUInt8 = function(e, t, i) {
e = +e;
t |= 0;
i || L(this, e, t, 1, 255, 0);
c.TYPED_ARRAY_SUPPORT || (e = Math.floor(e));
this[t] = 255 & e;
return t + 1;
};
function U(e, t, i, r) {
t < 0 && (t = 65535 + t + 1);
for (var n = 0, a = Math.min(e.length - i, 2); n < a; ++n) e[i + n] = (t & 255 << 8 * (r ? n : 1 - n)) >>> 8 * (r ? n : 1 - n);
}
c.prototype.writeUInt16LE = function(e, t, i) {
e = +e;
t |= 0;
i || L(this, e, t, 2, 65535, 0);
if (c.TYPED_ARRAY_SUPPORT) {
this[t] = 255 & e;
this[t + 1] = e >>> 8;
} else U(this, e, t, !0);
return t + 2;
};
c.prototype.writeUInt16BE = function(e, t, i) {
e = +e;
t |= 0;
i || L(this, e, t, 2, 65535, 0);
if (c.TYPED_ARRAY_SUPPORT) {
this[t] = e >>> 8;
this[t + 1] = 255 & e;
} else U(this, e, t, !1);
return t + 2;
};
function q(e, t, i, r) {
t < 0 && (t = 4294967295 + t + 1);
for (var n = 0, a = Math.min(e.length - i, 4); n < a; ++n) e[i + n] = t >>> 8 * (r ? n : 3 - n) & 255;
}
c.prototype.writeUInt32LE = function(e, t, i) {
e = +e;
t |= 0;
i || L(this, e, t, 4, 4294967295, 0);
if (c.TYPED_ARRAY_SUPPORT) {
this[t + 3] = e >>> 24;
this[t + 2] = e >>> 16;
this[t + 1] = e >>> 8;
this[t] = 255 & e;
} else q(this, e, t, !0);
return t + 4;
};
c.prototype.writeUInt32BE = function(e, t, i) {
e = +e;
t |= 0;
i || L(this, e, t, 4, 4294967295, 0);
if (c.TYPED_ARRAY_SUPPORT) {
this[t] = e >>> 24;
this[t + 1] = e >>> 16;
this[t + 2] = e >>> 8;
this[t + 3] = 255 & e;
} else q(this, e, t, !1);
return t + 4;
};
c.prototype.writeIntLE = function(e, t, i, r) {
e = +e;
t |= 0;
if (!r) {
var n = Math.pow(2, 8 * i - 1);
L(this, e, t, i, n - 1, -n);
}
var a = 0, s = 1, o = 0;
this[t] = 255 & e;
for (;++a < i && (s *= 256); ) {
e < 0 && 0 === o && 0 !== this[t + a - 1] && (o = 1);
this[t + a] = (e / s >> 0) - o & 255;
}
return t + i;
};
c.prototype.writeIntBE = function(e, t, i, r) {
e = +e;
t |= 0;
if (!r) {
var n = Math.pow(2, 8 * i - 1);
L(this, e, t, i, n - 1, -n);
}
var a = i - 1, s = 1, o = 0;
this[t + a] = 255 & e;
for (;--a >= 0 && (s *= 256); ) {
e < 0 && 0 === o && 0 !== this[t + a + 1] && (o = 1);
this[t + a] = (e / s >> 0) - o & 255;
}
return t + i;
};
c.prototype.writeInt8 = function(e, t, i) {
e = +e;
t |= 0;
i || L(this, e, t, 1, 127, -128);
c.TYPED_ARRAY_SUPPORT || (e = Math.floor(e));
e < 0 && (e = 255 + e + 1);
this[t] = 255 & e;
return t + 1;
};
c.prototype.writeInt16LE = function(e, t, i) {
e = +e;
t |= 0;
i || L(this, e, t, 2, 32767, -32768);
if (c.TYPED_ARRAY_SUPPORT) {
this[t] = 255 & e;
this[t + 1] = e >>> 8;
} else U(this, e, t, !0);
return t + 2;
};
c.prototype.writeInt16BE = function(e, t, i) {
e = +e;
t |= 0;
i || L(this, e, t, 2, 32767, -32768);
if (c.TYPED_ARRAY_SUPPORT) {
this[t] = e >>> 8;
this[t + 1] = 255 & e;
} else U(this, e, t, !1);
return t + 2;
};
c.prototype.writeInt32LE = function(e, t, i) {
e = +e;
t |= 0;
i || L(this, e, t, 4, 2147483647, -2147483648);
if (c.TYPED_ARRAY_SUPPORT) {
this[t] = 255 & e;
this[t + 1] = e >>> 8;
this[t + 2] = e >>> 16;
this[t + 3] = e >>> 24;
} else q(this, e, t, !0);
return t + 4;
};
c.prototype.writeInt32BE = function(e, t, i) {
e = +e;
t |= 0;
i || L(this, e, t, 4, 2147483647, -2147483648);
e < 0 && (e = 4294967295 + e + 1);
if (c.TYPED_ARRAY_SUPPORT) {
this[t] = e >>> 24;
this[t + 1] = e >>> 16;
this[t + 2] = e >>> 8;
this[t + 3] = 255 & e;
} else q(this, e, t, !1);
return t + 4;
};
function F(e, t, i, r) {
if (i + r > e.length) throw new RangeError("Index out of range");
if (i < 0) throw new RangeError("Index out of range");
}
function z(e, t, i, r, a) {
a || F(e, 0, i, 4);
n.write(e, t, i, r, 23, 4);
return i + 4;
}
c.prototype.writeFloatLE = function(e, t, i) {
return z(this, e, t, !0, i);
};
c.prototype.writeFloatBE = function(e, t, i) {
return z(this, e, t, !1, i);
};
function H(e, t, i, r, a) {
a || F(e, 0, i, 8);
n.write(e, t, i, r, 52, 8);
return i + 8;
}
c.prototype.writeDoubleLE = function(e, t, i) {
return H(this, e, t, !0, i);
};
c.prototype.writeDoubleBE = function(e, t, i) {
return H(this, e, t, !1, i);
};
c.prototype.copy = function(e, t, i, r) {
i || (i = 0);
r || 0 === r || (r = this.length);
t >= e.length && (t = e.length);
t || (t = 0);
r > 0 && r < i && (r = i);
if (r === i) return 0;
if (0 === e.length || 0 === this.length) return 0;
if (t < 0) throw new RangeError("targetStart out of bounds");
if (i < 0 || i >= this.length) throw new RangeError("sourceStart out of bounds");
if (r < 0) throw new RangeError("sourceEnd out of bounds");
r > this.length && (r = this.length);
e.length - t < r - i && (r = e.length - t + i);
var n, a = r - i;
if (this === e && i < t && t < r) for (n = a - 1; n >= 0; --n) e[n + t] = this[n + i]; else if (a < 1e3 || !c.TYPED_ARRAY_SUPPORT) for (n = 0; n < a; ++n) e[n + t] = this[n + i]; else Uint8Array.prototype.set.call(e, this.subarray(i, i + a), t);
return a;
};
c.prototype.fill = function(e, t, i, r) {
if ("string" == typeof e) {
if ("string" == typeof t) {
r = t;
t = 0;
i = this.length;
} else if ("string" == typeof i) {
r = i;
i = this.length;
}
if (1 === e.length) {
var n = e.charCodeAt(0);
n < 256 && (e = n);
}
if (void 0 !== r && "string" != typeof r) throw new TypeError("encoding must be a string");
if ("string" == typeof r && !c.isEncoding(r)) throw new TypeError("Unknown encoding: " + r);
} else "number" == typeof e && (e &= 255);
if (t < 0 || this.length < t || this.length < i) throw new RangeError("Out of range index");
if (i <= t) return this;
t >>>= 0;
i = void 0 === i ? this.length : i >>> 0;
e || (e = 0);
var a;
if ("number" == typeof e) for (a = t; a < i; ++a) this[a] = e; else {
var s = c.isBuffer(e) ? e : V(new c(e, r).toString()), o = s.length;
for (a = 0; a < i - t; ++a) this[a + t] = s[a % o];
}
return this;
};
var J = /[^+\/0-9A-Za-z-_]/g;
function K(e) {
if ((e = W(e).replace(J, "")).length < 2) return "";
for (;e.length % 4 != 0; ) e += "=";
return e;
}
function W(e) {
return e.trim ? e.trim() : e.replace(/^\s+|\s+$/g, "");
}
function V(e, t) {
t = t || Infinity;
for (var i, r = e.length, n = null, a = [], s = 0; s < r; ++s) {
if ((i = e.charCodeAt(s)) > 55295 && i < 57344) {
if (!n) {
if (i > 56319) {
(t -= 3) > -1 && a.push(239, 191, 189);
continue;
}
if (s + 1 === r) {
(t -= 3) > -1 && a.push(239, 191, 189);
continue;
}
n = i;
continue;
}
if (i < 56320) {
(t -= 3) > -1 && a.push(239, 191, 189);
n = i;
continue;
}
i = 65536 + (n - 55296 << 10 | i - 56320);
} else n && (t -= 3) > -1 && a.push(239, 191, 189);
n = null;
if (i < 128) {
if ((t -= 1) < 0) break;
a.push(i);
} else if (i < 2048) {
if ((t -= 2) < 0) break;
a.push(i >> 6 | 192, 63 & i | 128);
} else if (i < 65536) {
if ((t -= 3) < 0) break;
a.push(i >> 12 | 224, i >> 6 & 63 | 128, 63 & i | 128);
} else {
if (!(i < 1114112)) throw new Error("Invalid code point");
if ((t -= 4) < 0) break;
a.push(i >> 18 | 240, i >> 12 & 63 | 128, i >> 6 & 63 | 128, 63 & i | 128);
}
}
return a;
}
function G(e) {
for (var t = [], i = 0; i < e.length; ++i) t.push(255 & e.charCodeAt(i));
return t;
}
function Y(e, t) {
for (var i, r, n, a = [], s = 0; s < e.length && !((t -= 2) < 0); ++s) {
r = (i = e.charCodeAt(s)) >> 8;
n = i % 256;
a.push(n);
a.push(r);
}
return a;
}
function X(e) {
return r.toByteArray(K(e));
}
function Z(e, t, i, r) {
for (var n = 0; n < r && !(n + i >= t.length || n >= e.length); ++n) t[n + i] = e[n];
return n;
}
}).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
}, {
"base64-js": 16,
ieee754: 137,
isarray: 66
} ],
66: [ function(e, t) {
var i = {}.toString;
t.exports = Array.isArray || function(e) {
return "[object Array]" == i.call(e);
};
}, {} ],
67: [ function(e, t) {
var i = e("safe-buffer").Buffer, r = e("stream").Transform, n = e("string_decoder").StringDecoder;
function a(e) {
r.call(this);
this.hashMode = "string" == typeof e;
this.hashMode ? this[e] = this._finalOrDigest : this.final = this._finalOrDigest;
if (this._final) {
this.__final = this._final;
this._final = null;
}
this._decoder = null;
this._encoding = null;
}
e("inherits")(a, r);
a.prototype.update = function(e, t, r) {
"string" == typeof e && (e = i.from(e, t));
var n = this._update(e);
if (this.hashMode) return this;
r && (n = this._toString(n, r));
return n;
};
a.prototype.setAutoPadding = function() {};
a.prototype.getAuthTag = function() {
throw new Error("trying to get auth tag in unsupported state");
};
a.prototype.setAuthTag = function() {
throw new Error("trying to set auth tag in unsupported state");
};
a.prototype.setAAD = function() {
throw new Error("trying to set aad in unsupported state");
};
a.prototype._transform = function(e, t, i) {
var r;
try {
this.hashMode ? this._update(e) : this.push(this._update(e));
} catch (e) {
r = e;
} finally {
i(r);
}
};
a.prototype._flush = function(e) {
var t;
try {
this.push(this.__final());
} catch (e) {
t = e;
}
e(t);
};
a.prototype._finalOrDigest = function(e) {
var t = this.__final() || i.alloc(0);
e && (t = this._toString(t, e, !0));
return t;
};
a.prototype._toString = function(e, t, i) {
if (!this._decoder) {
this._decoder = new n(t);
this._encoding = t;
}
if (this._encoding !== t) throw new Error("can't switch encodings");
var r = this._decoder.write(e);
i && (r += this._decoder.end());
return r;
};
t.exports = a;
}, {
inherits: 138,
"safe-buffer": 182,
stream: 192,
string_decoder: 193
} ],
68: [ function(e, t, i) {
i.isArray = function(e) {
return Array.isArray ? Array.isArray(e) : "[object Array]" === r(e);
};
i.isBoolean = function(e) {
return "boolean" == typeof e;
};
i.isNull = function(e) {
return null === e;
};
i.isNullOrUndefined = function(e) {
return null == e;
};
i.isNumber = function(e) {
return "number" == typeof e;
};
i.isString = function(e) {
return "string" == typeof e;
};
i.isSymbol = function(e) {
return "symbol" == typeof e;
};
i.isUndefined = function(e) {
return void 0 === e;
};
i.isRegExp = function(e) {
return "[object RegExp]" === r(e);
};
i.isObject = function(e) {
return "object" == typeof e && null !== e;
};
i.isDate = function(e) {
return "[object Date]" === r(e);
};
i.isError = function(e) {
return "[object Error]" === r(e) || e instanceof Error;
};
i.isFunction = function(e) {
return "function" == typeof e;
};
i.isPrimitive = function(e) {
return null === e || "boolean" == typeof e || "number" == typeof e || "string" == typeof e || "symbol" == typeof e || "undefined" == typeof e;
};
i.isBuffer = e("buffer").Buffer.isBuffer;
function r(e) {
return Object.prototype.toString.call(e);
}
}, {
buffer: 65
} ],
69: [ function(e, t) {
(function(i) {
var r = e("elliptic"), n = e("bn.js");
t.exports = function(e) {
return new s(e);
};
var a = {
secp256k1: {
name: "secp256k1",
byteLength: 32
},
secp224r1: {
name: "p224",
byteLength: 28
},
prime256v1: {
name: "p256",
byteLength: 32
},
prime192v1: {
name: "p192",
byteLength: 24
},
ed25519: {
name: "ed25519",
byteLength: 32
},
secp384r1: {
name: "p384",
byteLength: 48
},
secp521r1: {
name: "p521",
byteLength: 66
}
};
a.p224 = a.secp224r1;
a.p256 = a.secp256r1 = a.prime256v1;
a.p192 = a.secp192r1 = a.prime192v1;
a.p384 = a.secp384r1;
a.p521 = a.secp521r1;
function s(e) {
this.curveType = a[e];
this.curveType || (this.curveType = {
name: e
});
this.curve = new r.ec(this.curveType.name);
this.keys = void 0;
}
s.prototype.generateKeys = function(e, t) {
this.keys = this.curve.genKeyPair();
return this.getPublicKey(e, t);
};
s.prototype.computeSecret = function(e, t, r) {
t = t || "utf8";
i.isBuffer(e) || (e = new i(e, t));
return o(this.curve.keyFromPublic(e).getPublic().mul(this.keys.getPrivate()).getX(), r, this.curveType.byteLength);
};
s.prototype.getPublicKey = function(e, t) {
var i = this.keys.getPublic("compressed" === t, !0);
"hybrid" === t && (i[i.length - 1] % 2 ? i[0] = 7 : i[0] = 6);
return o(i, e);
};
s.prototype.getPrivateKey = function(e) {
return o(this.keys.getPrivate(), e);
};
s.prototype.setPublicKey = function(e, t) {
t = t || "utf8";
i.isBuffer(e) || (e = new i(e, t));
this.keys._importPublic(e);
return this;
};
s.prototype.setPrivateKey = function(e, t) {
t = t || "utf8";
i.isBuffer(e) || (e = new i(e, t));
var r = new n(e);
r = r.toString(16);
this.keys = this.curve.genKeyPair();
this.keys._importPrivate(r);
return this;
};
function o(e, t, r) {
Array.isArray(e) || (e = e.toArray());
var n = new i(e);
if (r && n.length < r) {
var a = new i(r - n.length);
a.fill(0);
n = i.concat([ a, n ]);
}
return t ? n.toString(t) : n;
}
}).call(this, e("buffer").Buffer);
}, {
"bn.js": 70,
buffer: 65,
elliptic: 87
} ],
70: [ function(e, t, i) {
arguments[4][15][0].apply(i, arguments);
}, {
buffer: 19,
dup: 15
} ],
71: [ function(e, t) {
"use strict";
var i = e("inherits"), r = e("md5.js"), n = e("ripemd160"), a = e("sha.js"), s = e("cipher-base");
function o(e) {
s.call(this, "digest");
this._hash = e;
}
i(o, s);
o.prototype._update = function(e) {
this._hash.update(e);
};
o.prototype._final = function() {
return this._hash.digest();
};
t.exports = function(e) {
return "md5" === (e = e.toLowerCase()) ? new r() : "rmd160" === e || "ripemd160" === e ? new n() : new o(a(e));
};
}, {
"cipher-base": 67,
inherits: 138,
"md5.js": 139,
ripemd160: 181,
"sha.js": 185
} ],
72: [ function(e, t) {
var i = e("md5.js");
t.exports = function(e) {
return new i().update(e).digest();
};
}, {
"md5.js": 139
} ],
73: [ function(e, t) {
"use strict";
var i = e("inherits"), r = e("./legacy"), n = e("cipher-base"), a = e("safe-buffer").Buffer, s = e("create-hash/md5"), o = e("ripemd160"), c = e("sha.js"), f = a.alloc(128);
function h(e, t) {
n.call(this, "digest");
"string" == typeof t && (t = a.from(t));
var i = "sha512" === e || "sha384" === e ? 128 : 64;
this._alg = e;
this._key = t;
t.length > i ? t = ("rmd160" === e ? new o() : c(e)).update(t).digest() : t.length < i && (t = a.concat([ t, f ], i));
for (var r = this._ipad = a.allocUnsafe(i), s = this._opad = a.allocUnsafe(i), h = 0; h < i; h++) {
r[h] = 54 ^ t[h];
s[h] = 92 ^ t[h];
}
this._hash = "rmd160" === e ? new o() : c(e);
this._hash.update(r);
}
i(h, n);
h.prototype._update = function(e) {
this._hash.update(e);
};
h.prototype._final = function() {
var e = this._hash.digest();
return ("rmd160" === this._alg ? new o() : c(this._alg)).update(this._opad).update(e).digest();
};
t.exports = function(e, t) {
return "rmd160" === (e = e.toLowerCase()) || "ripemd160" === e ? new h("rmd160", t) : "md5" === e ? new r(s, t) : new h(e, t);
};
}, {
"./legacy": 74,
"cipher-base": 67,
"create-hash/md5": 72,
inherits: 138,
ripemd160: 181,
"safe-buffer": 182,
"sha.js": 185
} ],
74: [ function(e, t) {
"use strict";
var i = e("inherits"), r = e("safe-buffer").Buffer, n = e("cipher-base"), a = r.alloc(128), s = 64;
function o(e, t) {
n.call(this, "digest");
"string" == typeof t && (t = r.from(t));
this._alg = e;
this._key = t;
t.length > s ? t = e(t) : t.length < s && (t = r.concat([ t, a ], s));
for (var i = this._ipad = r.allocUnsafe(s), o = this._opad = r.allocUnsafe(s), c = 0; c < s; c++) {
i[c] = 54 ^ t[c];
o[c] = 92 ^ t[c];
}
this._hash = [ i ];
}
i(o, n);
o.prototype._update = function(e) {
this._hash.push(e);
};
o.prototype._final = function() {
var e = this._alg(r.concat(this._hash));
return this._alg(r.concat([ this._opad, e ]));
};
t.exports = o;
}, {
"cipher-base": 67,
inherits: 138,
"safe-buffer": 182
} ],
75: [ function(e, t, i) {
"use strict";
i.randomBytes = i.rng = i.pseudoRandomBytes = i.prng = e("randombytes");
i.createHash = i.Hash = e("create-hash");
i.createHmac = i.Hmac = e("create-hmac");
var r = e("browserify-sign/algos"), n = Object.keys(r), a = [ "sha1", "sha224", "sha256", "sha384", "sha512", "md5", "rmd160" ].concat(n);
i.getHashes = function() {
return a;
};
var s = e("pbkdf2");
i.pbkdf2 = s.pbkdf2;
i.pbkdf2Sync = s.pbkdf2Sync;
var o = e("browserify-cipher");
i.Cipher = o.Cipher;
i.createCipher = o.createCipher;
i.Cipheriv = o.Cipheriv;
i.createCipheriv = o.createCipheriv;
i.Decipher = o.Decipher;
i.createDecipher = o.createDecipher;
i.Decipheriv = o.Decipheriv;
i.createDecipheriv = o.createDecipheriv;
i.getCiphers = o.getCiphers;
i.listCiphers = o.listCiphers;
var c = e("diffie-hellman");
i.DiffieHellmanGroup = c.DiffieHellmanGroup;
i.createDiffieHellmanGroup = c.createDiffieHellmanGroup;
i.getDiffieHellman = c.getDiffieHellman;
i.createDiffieHellman = c.createDiffieHellman;
i.DiffieHellman = c.DiffieHellman;
var f = e("browserify-sign");
i.createSign = f.createSign;
i.Sign = f.Sign;
i.createVerify = f.createVerify;
i.Verify = f.Verify;
i.createECDH = e("create-ecdh");
var h = e("public-encrypt");
i.publicEncrypt = h.publicEncrypt;
i.privateEncrypt = h.privateEncrypt;
i.publicDecrypt = h.publicDecrypt;
i.privateDecrypt = h.privateDecrypt;
var u = e("randomfill");
i.randomFill = u.randomFill;
i.randomFillSync = u.randomFillSync;
i.createCredentials = function() {
throw new Error([ "sorry, createCredentials is not implemented yet", "we accept pull requests", "https://github.com/crypto-browserify/crypto-browserify" ].join("\n"));
};
i.constants = {
DH_CHECK_P_NOT_SAFE_PRIME: 2,
DH_CHECK_P_NOT_PRIME: 1,
DH_UNABLE_TO_CHECK_GENERATOR: 4,
DH_NOT_SUITABLE_GENERATOR: 8,
NPN_ENABLED: 1,
ALPN_ENABLED: 1,
RSA_PKCS1_PADDING: 1,
RSA_SSLV23_PADDING: 2,
RSA_NO_PADDING: 3,
RSA_PKCS1_OAEP_PADDING: 4,
RSA_X931_PADDING: 5,
RSA_PKCS1_PSS_PADDING: 6,
POINT_CONVERSION_COMPRESSED: 2,
POINT_CONVERSION_UNCOMPRESSED: 4,
POINT_CONVERSION_HYBRID: 6
};
}, {
"browserify-cipher": 37,
"browserify-sign": 44,
"browserify-sign/algos": 41,
"create-ecdh": 69,
"create-hash": 71,
"create-hmac": 73,
"diffie-hellman": 82,
pbkdf2: 149,
"public-encrypt": 157,
randombytes: 164,
randomfill: 165
} ],
76: [ function(e, t, i) {
"use strict";
i.utils = e("./des/utils");
i.Cipher = e("./des/cipher");
i.DES = e("./des/des");
i.CBC = e("./des/cbc");
i.EDE = e("./des/ede");
}, {
"./des/cbc": 77,
"./des/cipher": 78,
"./des/des": 79,
"./des/ede": 80,
"./des/utils": 81
} ],
77: [ function(e, t, i) {
"use strict";
var r = e("minimalistic-assert"), n = e("inherits"), a = {};
function s(e) {
r.equal(e.length, 8, "Invalid IV length");
this.iv = new Array(8);
for (var t = 0; t < this.iv.length; t++) this.iv[t] = e[t];
}
i.instantiate = function(e) {
function t(t) {
e.call(this, t);
this._cbcInit();
}
n(t, e);
for (var i = Object.keys(a), r = 0; r < i.length; r++) {
var s = i[r];
t.prototype[s] = a[s];
}
t.create = function(e) {
return new t(e);
};
return t;
};
a._cbcInit = function() {
var e = new s(this.options.iv);
this._cbcState = e;
};
a._update = function(e, t, i, r) {
var n = this._cbcState, a = this.constructor.super_.prototype, s = n.iv;
if ("encrypt" === this.type) {
for (var o = 0; o < this.blockSize; o++) s[o] ^= e[t + o];
a._update.call(this, s, 0, i, r);
for (o = 0; o < this.blockSize; o++) s[o] = i[r + o];
} else {
a._update.call(this, e, t, i, r);
for (o = 0; o < this.blockSize; o++) i[r + o] ^= s[o];
for (o = 0; o < this.blockSize; o++) s[o] = e[t + o];
}
};
}, {
inherits: 138,
"minimalistic-assert": 142
} ],
78: [ function(e, t) {
"use strict";
var i = e("minimalistic-assert");
function r(e) {
this.options = e;
this.type = this.options.type;
this.blockSize = 8;
this._init();
this.buffer = new Array(this.blockSize);
this.bufferOff = 0;
}
t.exports = r;
r.prototype._init = function() {};
r.prototype.update = function(e) {
return 0 === e.length ? [] : "decrypt" === this.type ? this._updateDecrypt(e) : this._updateEncrypt(e);
};
r.prototype._buffer = function(e, t) {
for (var i = Math.min(this.buffer.length - this.bufferOff, e.length - t), r = 0; r < i; r++) this.buffer[this.bufferOff + r] = e[t + r];
this.bufferOff += i;
return i;
};
r.prototype._flushBuffer = function(e, t) {
this._update(this.buffer, 0, e, t);
this.bufferOff = 0;
return this.blockSize;
};
r.prototype._updateEncrypt = function(e) {
var t = 0, i = 0, r = (this.bufferOff + e.length) / this.blockSize | 0, n = new Array(r * this.blockSize);
if (0 !== this.bufferOff) {
t += this._buffer(e, t);
this.bufferOff === this.buffer.length && (i += this._flushBuffer(n, i));
}
for (var a = e.length - (e.length - t) % this.blockSize; t < a; t += this.blockSize) {
this._update(e, t, n, i);
i += this.blockSize;
}
for (;t < e.length; t++, this.bufferOff++) this.buffer[this.bufferOff] = e[t];
return n;
};
r.prototype._updateDecrypt = function(e) {
for (var t = 0, i = 0, r = Math.ceil((this.bufferOff + e.length) / this.blockSize) - 1, n = new Array(r * this.blockSize); r > 0; r--) {
t += this._buffer(e, t);
i += this._flushBuffer(n, i);
}
t += this._buffer(e, t);
return n;
};
r.prototype.final = function(e) {
var t, i;
e && (t = this.update(e));
i = "encrypt" === this.type ? this._finalEncrypt() : this._finalDecrypt();
return t ? t.concat(i) : i;
};
r.prototype._pad = function(e, t) {
if (0 === t) return !1;
for (;t < e.length; ) e[t++] = 0;
return !0;
};
r.prototype._finalEncrypt = function() {
if (!this._pad(this.buffer, this.bufferOff)) return [];
var e = new Array(this.blockSize);
this._update(this.buffer, 0, e, 0);
return e;
};
r.prototype._unpad = function(e) {
return e;
};
r.prototype._finalDecrypt = function() {
i.equal(this.bufferOff, this.blockSize, "Not enough data to decrypt");
var e = new Array(this.blockSize);
this._flushBuffer(e, 0);
return this._unpad(e);
};
}, {
"minimalistic-assert": 142
} ],
79: [ function(e, t) {
"use strict";
var i = e("minimalistic-assert"), r = e("inherits"), n = e("./utils"), a = e("./cipher");
function s() {
this.tmp = new Array(2);
this.keys = null;
}
function o(e) {
a.call(this, e);
var t = new s();
this._desState = t;
this.deriveKeys(t, e.key);
}
r(o, a);
t.exports = o;
o.create = function(e) {
return new o(e);
};
var c = [ 1, 1, 2, 2, 2, 2, 2, 2, 1, 2, 2, 2, 2, 2, 2, 1 ];
o.prototype.deriveKeys = function(e, t) {
e.keys = new Array(32);
i.equal(t.length, this.blockSize, "Invalid key length");
var r = n.readUInt32BE(t, 0), a = n.readUInt32BE(t, 4);
n.pc1(r, a, e.tmp, 0);
r = e.tmp[0];
a = e.tmp[1];
for (var s = 0; s < e.keys.length; s += 2) {
var o = c[s >>> 1];
r = n.r28shl(r, o);
a = n.r28shl(a, o);
n.pc2(r, a, e.keys, s);
}
};
o.prototype._update = function(e, t, i, r) {
var a = this._desState, s = n.readUInt32BE(e, t), o = n.readUInt32BE(e, t + 4);
n.ip(s, o, a.tmp, 0);
s = a.tmp[0];
o = a.tmp[1];
"encrypt" === this.type ? this._encrypt(a, s, o, a.tmp, 0) : this._decrypt(a, s, o, a.tmp, 0);
s = a.tmp[0];
o = a.tmp[1];
n.writeUInt32BE(i, s, r);
n.writeUInt32BE(i, o, r + 4);
};
o.prototype._pad = function(e, t) {
for (var i = e.length - t, r = t; r < e.length; r++) e[r] = i;
return !0;
};
o.prototype._unpad = function(e) {
for (var t = e[e.length - 1], r = e.length - t; r < e.length; r++) i.equal(e[r], t);
return e.slice(0, e.length - t);
};
o.prototype._encrypt = function(e, t, i, r, a) {
for (var s = t, o = i, c = 0; c < e.keys.length; c += 2) {
var f = e.keys[c], h = e.keys[c + 1];
n.expand(o, e.tmp, 0);
f ^= e.tmp[0];
h ^= e.tmp[1];
var u = n.substitute(f, h), d = o;
o = (s ^ n.permute(u)) >>> 0;
s = d;
}
n.rip(o, s, r, a);
};
o.prototype._decrypt = function(e, t, i, r, a) {
for (var s = i, o = t, c = e.keys.length - 2; c >= 0; c -= 2) {
var f = e.keys[c], h = e.keys[c + 1];
n.expand(s, e.tmp, 0);
f ^= e.tmp[0];
h ^= e.tmp[1];
var u = n.substitute(f, h), d = s;
s = (o ^ n.permute(u)) >>> 0;
o = d;
}
n.rip(s, o, r, a);
};
}, {
"./cipher": 78,
"./utils": 81,
inherits: 138,
"minimalistic-assert": 142
} ],
80: [ function(e, t) {
"use strict";
var i = e("minimalistic-assert"), r = e("inherits"), n = e("./cipher"), a = e("./des");
function s(e, t) {
i.equal(t.length, 24, "Invalid key length");
var r = t.slice(0, 8), n = t.slice(8, 16), s = t.slice(16, 24);
this.ciphers = "encrypt" === e ? [ a.create({
type: "encrypt",
key: r
}), a.create({
type: "decrypt",
key: n
}), a.create({
type: "encrypt",
key: s
}) ] : [ a.create({
type: "decrypt",
key: s
}), a.create({
type: "encrypt",
key: n
}), a.create({
type: "decrypt",
key: r
}) ];
}
function o(e) {
n.call(this, e);
var t = new s(this.type, this.options.key);
this._edeState = t;
}
r(o, n);
t.exports = o;
o.create = function(e) {
return new o(e);
};
o.prototype._update = function(e, t, i, r) {
var n = this._edeState;
n.ciphers[0]._update(e, t, i, r);
n.ciphers[1]._update(i, r, i, r);
n.ciphers[2]._update(i, r, i, r);
};
o.prototype._pad = a.prototype._pad;
o.prototype._unpad = a.prototype._unpad;
}, {
"./cipher": 78,
"./des": 79,
inherits: 138,
"minimalistic-assert": 142
} ],
81: [ function(e, t, i) {
"use strict";
i.readUInt32BE = function(e, t) {
return (e[0 + t] << 24 | e[1 + t] << 16 | e[2 + t] << 8 | e[3 + t]) >>> 0;
};
i.writeUInt32BE = function(e, t, i) {
e[0 + i] = t >>> 24;
e[1 + i] = t >>> 16 & 255;
e[2 + i] = t >>> 8 & 255;
e[3 + i] = 255 & t;
};
i.ip = function(e, t, i, r) {
for (var n = 0, a = 0, s = 6; s >= 0; s -= 2) {
for (var o = 0; o <= 24; o += 8) {
n <<= 1;
n |= t >>> o + s & 1;
}
for (o = 0; o <= 24; o += 8) {
n <<= 1;
n |= e >>> o + s & 1;
}
}
for (s = 6; s >= 0; s -= 2) {
for (o = 1; o <= 25; o += 8) {
a <<= 1;
a |= t >>> o + s & 1;
}
for (o = 1; o <= 25; o += 8) {
a <<= 1;
a |= e >>> o + s & 1;
}
}
i[r + 0] = n >>> 0;
i[r + 1] = a >>> 0;
};
i.rip = function(e, t, i, r) {
for (var n = 0, a = 0, s = 0; s < 4; s++) for (var o = 24; o >= 0; o -= 8) {
n <<= 1;
n |= t >>> o + s & 1;
n <<= 1;
n |= e >>> o + s & 1;
}
for (s = 4; s < 8; s++) for (o = 24; o >= 0; o -= 8) {
a <<= 1;
a |= t >>> o + s & 1;
a <<= 1;
a |= e >>> o + s & 1;
}
i[r + 0] = n >>> 0;
i[r + 1] = a >>> 0;
};
i.pc1 = function(e, t, i, r) {
for (var n = 0, a = 0, s = 7; s >= 5; s--) {
for (var o = 0; o <= 24; o += 8) {
n <<= 1;
n |= t >> o + s & 1;
}
for (o = 0; o <= 24; o += 8) {
n <<= 1;
n |= e >> o + s & 1;
}
}
for (o = 0; o <= 24; o += 8) {
n <<= 1;
n |= t >> o + s & 1;
}
for (s = 1; s <= 3; s++) {
for (o = 0; o <= 24; o += 8) {
a <<= 1;
a |= t >> o + s & 1;
}
for (o = 0; o <= 24; o += 8) {
a <<= 1;
a |= e >> o + s & 1;
}
}
for (o = 0; o <= 24; o += 8) {
a <<= 1;
a |= e >> o + s & 1;
}
i[r + 0] = n >>> 0;
i[r + 1] = a >>> 0;
};
i.r28shl = function(e, t) {
return e << t & 268435455 | e >>> 28 - t;
};
var r = [ 14, 11, 17, 4, 27, 23, 25, 0, 13, 22, 7, 18, 5, 9, 16, 24, 2, 20, 12, 21, 1, 8, 15, 26, 15, 4, 25, 19, 9, 1, 26, 16, 5, 11, 23, 8, 12, 7, 17, 0, 22, 3, 10, 14, 6, 20, 27, 24 ];
i.pc2 = function(e, t, i, n) {
for (var a = 0, s = 0, o = r.length >>> 1, c = 0; c < o; c++) {
a <<= 1;
a |= e >>> r[c] & 1;
}
for (c = o; c < r.length; c++) {
s <<= 1;
s |= t >>> r[c] & 1;
}
i[n + 0] = a >>> 0;
i[n + 1] = s >>> 0;
};
i.expand = function(e, t, i) {
var r = 0, n = 0;
r = (1 & e) << 5 | e >>> 27;
for (var a = 23; a >= 15; a -= 4) {
r <<= 6;
r |= e >>> a & 63;
}
for (a = 11; a >= 3; a -= 4) {
n |= e >>> a & 63;
n <<= 6;
}
n |= (31 & e) << 1 | e >>> 31;
t[i + 0] = r >>> 0;
t[i + 1] = n >>> 0;
};
var n = [ 14, 0, 4, 15, 13, 7, 1, 4, 2, 14, 15, 2, 11, 13, 8, 1, 3, 10, 10, 6, 6, 12, 12, 11, 5, 9, 9, 5, 0, 3, 7, 8, 4, 15, 1, 12, 14, 8, 8, 2, 13, 4, 6, 9, 2, 1, 11, 7, 15, 5, 12, 11, 9, 3, 7, 14, 3, 10, 10, 0, 5, 6, 0, 13, 15, 3, 1, 13, 8, 4, 14, 7, 6, 15, 11, 2, 3, 8, 4, 14, 9, 12, 7, 0, 2, 1, 13, 10, 12, 6, 0, 9, 5, 11, 10, 5, 0, 13, 14, 8, 7, 10, 11, 1, 10, 3, 4, 15, 13, 4, 1, 2, 5, 11, 8, 6, 12, 7, 6, 12, 9, 0, 3, 5, 2, 14, 15, 9, 10, 13, 0, 7, 9, 0, 14, 9, 6, 3, 3, 4, 15, 6, 5, 10, 1, 2, 13, 8, 12, 5, 7, 14, 11, 12, 4, 11, 2, 15, 8, 1, 13, 1, 6, 10, 4, 13, 9, 0, 8, 6, 15, 9, 3, 8, 0, 7, 11, 4, 1, 15, 2, 14, 12, 3, 5, 11, 10, 5, 14, 2, 7, 12, 7, 13, 13, 8, 14, 11, 3, 5, 0, 6, 6, 15, 9, 0, 10, 3, 1, 4, 2, 7, 8, 2, 5, 12, 11, 1, 12, 10, 4, 14, 15, 9, 10, 3, 6, 15, 9, 0, 0, 6, 12, 10, 11, 1, 7, 13, 13, 8, 15, 9, 1, 4, 3, 5, 14, 11, 5, 12, 2, 7, 8, 2, 4, 14, 2, 14, 12, 11, 4, 2, 1, 12, 7, 4, 10, 7, 11, 13, 6, 1, 8, 5, 5, 0, 3, 15, 15, 10, 13, 3, 0, 9, 14, 8, 9, 6, 4, 11, 2, 8, 1, 12, 11, 7, 10, 1, 13, 14, 7, 2, 8, 13, 15, 6, 9, 15, 12, 0, 5, 9, 6, 10, 3, 4, 0, 5, 14, 3, 12, 10, 1, 15, 10, 4, 15, 2, 9, 7, 2, 12, 6, 9, 8, 5, 0, 6, 13, 1, 3, 13, 4, 14, 14, 0, 7, 11, 5, 3, 11, 8, 9, 4, 14, 3, 15, 2, 5, 12, 2, 9, 8, 5, 12, 15, 3, 10, 7, 11, 0, 14, 4, 1, 10, 7, 1, 6, 13, 0, 11, 8, 6, 13, 4, 13, 11, 0, 2, 11, 14, 7, 15, 4, 0, 9, 8, 1, 13, 10, 3, 14, 12, 3, 9, 5, 7, 12, 5, 2, 10, 15, 6, 8, 1, 6, 1, 6, 4, 11, 11, 13, 13, 8, 12, 1, 3, 4, 7, 10, 14, 7, 10, 9, 15, 5, 6, 0, 8, 15, 0, 14, 5, 2, 9, 3, 2, 12, 13, 1, 2, 15, 8, 13, 4, 8, 6, 10, 15, 3, 11, 7, 1, 4, 10, 12, 9, 5, 3, 6, 14, 11, 5, 0, 0, 14, 12, 9, 7, 2, 7, 2, 11, 1, 4, 14, 1, 7, 9, 4, 12, 10, 14, 8, 2, 13, 0, 15, 6, 12, 10, 9, 13, 0, 15, 3, 3, 5, 5, 6, 8, 11 ];
i.substitute = function(e, t) {
for (var i = 0, r = 0; r < 4; r++) {
i <<= 4;
i |= n[64 * r + (e >>> 18 - 6 * r & 63)];
}
for (r = 0; r < 4; r++) {
i <<= 4;
i |= n[256 + 64 * r + (t >>> 18 - 6 * r & 63)];
}
return i >>> 0;
};
var a = [ 16, 25, 12, 11, 3, 20, 4, 15, 31, 17, 9, 6, 27, 14, 1, 22, 30, 24, 8, 18, 0, 5, 29, 23, 13, 19, 2, 26, 10, 21, 28, 7 ];
i.permute = function(e) {
for (var t = 0, i = 0; i < a.length; i++) {
t <<= 1;
t |= e >>> a[i] & 1;
}
return t >>> 0;
};
i.padSplit = function(e, t, i) {
for (var r = e.toString(2); r.length < t; ) r = "0" + r;
for (var n = [], a = 0; a < t; a += i) n.push(r.slice(a, a + i));
return n.join(" ");
};
}, {} ],
82: [ function(e, t, i) {
(function(t) {
var r = e("./lib/generatePrime"), n = e("./lib/primes.json"), a = e("./lib/dh"), s = {
binary: !0,
hex: !0,
base64: !0
};
i.DiffieHellmanGroup = i.createDiffieHellmanGroup = i.getDiffieHellman = function(e) {
var i = new t(n[e].prime, "hex"), r = new t(n[e].gen, "hex");
return new a(i, r);
};
i.createDiffieHellman = i.DiffieHellman = function e(i, n, o, c) {
if (t.isBuffer(n) || void 0 === s[n]) return e(i, "binary", n, o);
n = n || "binary";
c = c || "binary";
o = o || new t([ 2 ]);
t.isBuffer(o) || (o = new t(o, c));
if ("number" == typeof i) return new a(r(i, o), o, !0);
t.isBuffer(i) || (i = new t(i, n));
return new a(i, o, !0);
};
}).call(this, e("buffer").Buffer);
}, {
"./lib/dh": 83,
"./lib/generatePrime": 84,
"./lib/primes.json": 85,
buffer: 65
} ],
83: [ function(e, t) {
(function(i) {
var r = e("bn.js"), n = new (e("miller-rabin"))(), a = new r(24), s = new r(11), o = new r(10), c = new r(3), f = new r(7), h = e("./generatePrime"), u = e("randombytes");
t.exports = g;
function d(e, t) {
t = t || "utf8";
i.isBuffer(e) || (e = new i(e, t));
this._pub = new r(e);
return this;
}
function l(e, t) {
t = t || "utf8";
i.isBuffer(e) || (e = new i(e, t));
this._priv = new r(e);
return this;
}
var p = {};
function b(e, t) {
var i = t.toString("hex"), r = [ i, e.toString(16) ].join("_");
if (r in p) return p[r];
var u, d = 0;
if (e.isEven() || !h.simpleSieve || !h.fermatTest(e) || !n.test(e)) {
d += 1;
d += "02" === i || "05" === i ? 8 : 4;
p[r] = d;
return d;
}
n.test(e.shrn(1)) || (d += 2);
switch (i) {
case "02":
e.mod(a).cmp(s) && (d += 8);
break;

case "05":
(u = e.mod(o)).cmp(c) && u.cmp(f) && (d += 8);
break;

default:
d += 4;
}
p[r] = d;
return d;
}
function g(e, t, i) {
this.setGenerator(t);
this.__prime = new r(e);
this._prime = r.mont(this.__prime);
this._primeLen = e.length;
this._pub = void 0;
this._priv = void 0;
this._primeCode = void 0;
if (i) {
this.setPublicKey = d;
this.setPrivateKey = l;
} else this._primeCode = 8;
}
Object.defineProperty(g.prototype, "verifyError", {
enumerable: !0,
get: function() {
"number" != typeof this._primeCode && (this._primeCode = b(this.__prime, this.__gen));
return this._primeCode;
}
});
g.prototype.generateKeys = function() {
this._priv || (this._priv = new r(u(this._primeLen)));
this._pub = this._gen.toRed(this._prime).redPow(this._priv).fromRed();
return this.getPublicKey();
};
g.prototype.computeSecret = function(e) {
var t = (e = (e = new r(e)).toRed(this._prime)).redPow(this._priv).fromRed(), n = new i(t.toArray()), a = this.getPrime();
if (n.length < a.length) {
var s = new i(a.length - n.length);
s.fill(0);
n = i.concat([ s, n ]);
}
return n;
};
g.prototype.getPublicKey = function(e) {
return m(this._pub, e);
};
g.prototype.getPrivateKey = function(e) {
return m(this._priv, e);
};
g.prototype.getPrime = function(e) {
return m(this.__prime, e);
};
g.prototype.getGenerator = function(e) {
return m(this._gen, e);
};
g.prototype.setGenerator = function(e, t) {
t = t || "utf8";
i.isBuffer(e) || (e = new i(e, t));
this.__gen = e;
this._gen = new r(e);
return this;
};
function m(e, t) {
var r = new i(e.toArray());
return t ? r.toString(t) : r;
}
}).call(this, e("buffer").Buffer);
}, {
"./generatePrime": 84,
"bn.js": 86,
buffer: 65,
"miller-rabin": 140,
randombytes: 164
} ],
84: [ function(e, t) {
var i = e("randombytes");
t.exports = m;
m.simpleSieve = b;
m.fermatTest = g;
var r = e("bn.js"), n = new r(24), a = new (e("miller-rabin"))(), s = new r(1), o = new r(2), c = new r(5), f = (new r(16), 
new r(8), new r(10)), h = new r(3), u = (new r(7), new r(11)), d = new r(4), l = (new r(12), 
null);
function p() {
if (null !== l) return l;
var e = [];
e[0] = 2;
for (var t = 1, i = 3; i < 1048576; i += 2) {
for (var r = Math.ceil(Math.sqrt(i)), n = 0; n < t && e[n] <= r && i % e[n] != 0; n++) ;
t !== n && e[n] <= r || (e[t++] = i);
}
l = e;
return e;
}
function b(e) {
for (var t = p(), i = 0; i < t.length; i++) if (0 === e.modn(t[i])) return 0 === e.cmpn(t[i]);
return !0;
}
function g(e) {
var t = r.mont(e);
return 0 === o.toRed(t).redPow(e.subn(1)).fromRed().cmpn(1);
}
function m(e, t) {
if (e < 16) return new r(2 === t || 5 === t ? [ 140, 123 ] : [ 140, 39 ]);
t = new r(t);
for (var l, p; ;) {
l = new r(i(Math.ceil(e / 8)));
for (;l.bitLength() > e; ) l.ishrn(1);
l.isEven() && l.iadd(s);
l.testn(1) || l.iadd(o);
if (t.cmp(o)) {
if (!t.cmp(c)) for (;l.mod(f).cmp(h); ) l.iadd(d);
} else for (;l.mod(n).cmp(u); ) l.iadd(d);
if (b(p = l.shrn(1)) && b(l) && g(p) && g(l) && a.test(p) && a.test(l)) return l;
}
}
}, {
"bn.js": 86,
"miller-rabin": 140,
randombytes: 164
} ],
85: [ function(e, t) {
t.exports = {
modp1: {
gen: "02",
prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a63a3620ffffffffffffffff"
},
modp2: {
gen: "02",
prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece65381ffffffffffffffff"
},
modp5: {
gen: "02",
prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca237327ffffffffffffffff"
},
modp14: {
gen: "02",
prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aacaa68ffffffffffffffff"
},
modp15: {
gen: "02",
prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aaac42dad33170d04507a33a85521abdf1cba64ecfb850458dbef0a8aea71575d060c7db3970f85a6e1e4c7abf5ae8cdb0933d71e8c94e04a25619dcee3d2261ad2ee6bf12ffa06d98a0864d87602733ec86a64521f2b18177b200cbbe117577a615d6c770988c0bad946e208e24fa074e5ab3143db5bfce0fd108e4b82d120a93ad2caffffffffffffffff"
},
modp16: {
gen: "02",
prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aaac42dad33170d04507a33a85521abdf1cba64ecfb850458dbef0a8aea71575d060c7db3970f85a6e1e4c7abf5ae8cdb0933d71e8c94e04a25619dcee3d2261ad2ee6bf12ffa06d98a0864d87602733ec86a64521f2b18177b200cbbe117577a615d6c770988c0bad946e208e24fa074e5ab3143db5bfce0fd108e4b82d120a92108011a723c12a787e6d788719a10bdba5b2699c327186af4e23c1a946834b6150bda2583e9ca2ad44ce8dbbbc2db04de8ef92e8efc141fbecaa6287c59474e6bc05d99b2964fa090c3a2233ba186515be7ed1f612970cee2d7afb81bdd762170481cd0069127d5b05aa993b4ea988d8fddc186ffb7dc90a6c08f4df435c934063199ffffffffffffffff"
},
modp17: {
gen: "02",
prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aaac42dad33170d04507a33a85521abdf1cba64ecfb850458dbef0a8aea71575d060c7db3970f85a6e1e4c7abf5ae8cdb0933d71e8c94e04a25619dcee3d2261ad2ee6bf12ffa06d98a0864d87602733ec86a64521f2b18177b200cbbe117577a615d6c770988c0bad946e208e24fa074e5ab3143db5bfce0fd108e4b82d120a92108011a723c12a787e6d788719a10bdba5b2699c327186af4e23c1a946834b6150bda2583e9ca2ad44ce8dbbbc2db04de8ef92e8efc141fbecaa6287c59474e6bc05d99b2964fa090c3a2233ba186515be7ed1f612970cee2d7afb81bdd762170481cd0069127d5b05aa993b4ea988d8fddc186ffb7dc90a6c08f4df435c93402849236c3fab4d27c7026c1d4dcb2602646dec9751e763dba37bdf8ff9406ad9e530ee5db382f413001aeb06a53ed9027d831179727b0865a8918da3edbebcf9b14ed44ce6cbaced4bb1bdb7f1447e6cc254b332051512bd7af426fb8f401378cd2bf5983ca01c64b92ecf032ea15d1721d03f482d7ce6e74fef6d55e702f46980c82b5a84031900b1c9e59e7c97fbec7e8f323a97a7e36cc88be0f1d45b7ff585ac54bd407b22b4154aacc8f6d7ebf48e1d814cc5ed20f8037e0a79715eef29be32806a1d58bb7c5da76f550aa3d8a1fbff0eb19ccb1a313d55cda56c9ec2ef29632387fe8d76e3c0468043e8f663f4860ee12bf2d5b0b7474d6e694f91e6dcc4024ffffffffffffffff"
},
modp18: {
gen: "02",
prime: "ffffffffffffffffc90fdaa22168c234c4c6628b80dc1cd129024e088a67cc74020bbea63b139b22514a08798e3404ddef9519b3cd3a431b302b0a6df25f14374fe1356d6d51c245e485b576625e7ec6f44c42e9a637ed6b0bff5cb6f406b7edee386bfb5a899fa5ae9f24117c4b1fe649286651ece45b3dc2007cb8a163bf0598da48361c55d39a69163fa8fd24cf5f83655d23dca3ad961c62f356208552bb9ed529077096966d670c354e4abc9804f1746c08ca18217c32905e462e36ce3be39e772c180e86039b2783a2ec07a28fb5c55df06f4c52c9de2bcbf6955817183995497cea956ae515d2261898fa051015728e5a8aaac42dad33170d04507a33a85521abdf1cba64ecfb850458dbef0a8aea71575d060c7db3970f85a6e1e4c7abf5ae8cdb0933d71e8c94e04a25619dcee3d2261ad2ee6bf12ffa06d98a0864d87602733ec86a64521f2b18177b200cbbe117577a615d6c770988c0bad946e208e24fa074e5ab3143db5bfce0fd108e4b82d120a92108011a723c12a787e6d788719a10bdba5b2699c327186af4e23c1a946834b6150bda2583e9ca2ad44ce8dbbbc2db04de8ef92e8efc141fbecaa6287c59474e6bc05d99b2964fa090c3a2233ba186515be7ed1f612970cee2d7afb81bdd762170481cd0069127d5b05aa993b4ea988d8fddc186ffb7dc90a6c08f4df435c93402849236c3fab4d27c7026c1d4dcb2602646dec9751e763dba37bdf8ff9406ad9e530ee5db382f413001aeb06a53ed9027d831179727b0865a8918da3edbebcf9b14ed44ce6cbaced4bb1bdb7f1447e6cc254b332051512bd7af426fb8f401378cd2bf5983ca01c64b92ecf032ea15d1721d03f482d7ce6e74fef6d55e702f46980c82b5a84031900b1c9e59e7c97fbec7e8f323a97a7e36cc88be0f1d45b7ff585ac54bd407b22b4154aacc8f6d7ebf48e1d814cc5ed20f8037e0a79715eef29be32806a1d58bb7c5da76f550aa3d8a1fbff0eb19ccb1a313d55cda56c9ec2ef29632387fe8d76e3c0468043e8f663f4860ee12bf2d5b0b7474d6e694f91e6dbe115974a3926f12fee5e438777cb6a932df8cd8bec4d073b931ba3bc832b68d9dd300741fa7bf8afc47ed2576f6936ba424663aab639c5ae4f5683423b4742bf1c978238f16cbe39d652de3fdb8befc848ad922222e04a4037c0713eb57a81a23f0c73473fc646cea306b4bcbc8862f8385ddfa9d4b7fa2c087e879683303ed5bdd3a062b3cf5b3a278a66d2a13f83f44f82ddf310ee074ab6a364597e899a0255dc164f31cc50846851df9ab48195ded7ea1b1d510bd7ee74d73faf36bc31ecfa268359046f4eb879f924009438b481c6cd7889a002ed5ee382bc9190da6fc026e479558e4475677e9aa9e3050e2765694dfc81f56e880b96e7160c980dd98edd3dfffffffffffffffff"
}
};
}, {} ],
86: [ function(e, t, i) {
arguments[4][15][0].apply(i, arguments);
}, {
buffer: 19,
dup: 15
} ],
87: [ function(e, t, i) {
"use strict";
var r = i;
r.version = e("../package.json").version;
r.utils = e("./elliptic/utils");
r.rand = e("brorand");
r.curve = e("./elliptic/curve");
r.curves = e("./elliptic/curves");
r.ec = e("./elliptic/ec");
r.eddsa = e("./elliptic/eddsa");
}, {
"../package.json": 103,
"./elliptic/curve": 90,
"./elliptic/curves": 93,
"./elliptic/ec": 94,
"./elliptic/eddsa": 97,
"./elliptic/utils": 101,
brorand: 18
} ],
88: [ function(e, t) {
"use strict";
var i = e("bn.js"), r = e("../utils"), n = r.getNAF, a = r.getJSF, s = r.assert;
function o(e, t) {
this.type = e;
this.p = new i(t.p, 16);
this.red = t.prime ? i.red(t.prime) : i.mont(this.p);
this.zero = new i(0).toRed(this.red);
this.one = new i(1).toRed(this.red);
this.two = new i(2).toRed(this.red);
this.n = t.n && new i(t.n, 16);
this.g = t.g && this.pointFromJSON(t.g, t.gRed);
this._wnafT1 = new Array(4);
this._wnafT2 = new Array(4);
this._wnafT3 = new Array(4);
this._wnafT4 = new Array(4);
this._bitLength = this.n ? this.n.bitLength() : 0;
var r = this.n && this.p.div(this.n);
if (!r || r.cmpn(100) > 0) this.redN = null; else {
this._maxwellTrick = !0;
this.redN = this.n.toRed(this.red);
}
}
t.exports = o;
o.prototype.point = function() {
throw new Error("Not implemented");
};
o.prototype.validate = function() {
throw new Error("Not implemented");
};
o.prototype._fixedNafMul = function(e, t) {
s(e.precomputed);
var i = e._getDoubles(), r = n(t, 1, this._bitLength), a = (1 << i.step + 1) - (i.step % 2 == 0 ? 2 : 1);
a /= 3;
var o, c, f = [];
for (o = 0; o < r.length; o += i.step) {
c = 0;
for (var h = o + i.step - 1; h >= o; h--) c = (c << 1) + r[h];
f.push(c);
}
for (var u = this.jpoint(null, null, null), d = this.jpoint(null, null, null), l = a; l > 0; l--) {
for (o = 0; o < f.length; o++) (c = f[o]) === l ? d = d.mixedAdd(i.points[o]) : c === -l && (d = d.mixedAdd(i.points[o].neg()));
u = u.add(d);
}
return u.toP();
};
o.prototype._wnafMul = function(e, t) {
var i = 4, r = e._getNAFPoints(i);
i = r.wnd;
for (var a = r.points, o = n(t, i, this._bitLength), c = this.jpoint(null, null, null), f = o.length - 1; f >= 0; f--) {
for (var h = 0; f >= 0 && 0 === o[f]; f--) h++;
f >= 0 && h++;
c = c.dblp(h);
if (f < 0) break;
var u = o[f];
s(0 !== u);
c = "affine" === e.type ? u > 0 ? c.mixedAdd(a[u - 1 >> 1]) : c.mixedAdd(a[-u - 1 >> 1].neg()) : u > 0 ? c.add(a[u - 1 >> 1]) : c.add(a[-u - 1 >> 1].neg());
}
return "affine" === e.type ? c.toP() : c;
};
o.prototype._wnafMulAdd = function(e, t, i, r, s) {
var o, c, f, h = this._wnafT1, u = this._wnafT2, d = this._wnafT3, l = 0;
for (o = 0; o < r; o++) {
var p = (f = t[o])._getNAFPoints(e);
h[o] = p.wnd;
u[o] = p.points;
}
for (o = r - 1; o >= 1; o -= 2) {
var b = o - 1, g = o;
if (1 === h[b] && 1 === h[g]) {
var m = [ t[b], null, null, t[g] ];
if (0 === t[b].y.cmp(t[g].y)) {
m[1] = t[b].add(t[g]);
m[2] = t[b].toJ().mixedAdd(t[g].neg());
} else if (0 === t[b].y.cmp(t[g].y.redNeg())) {
m[1] = t[b].toJ().mixedAdd(t[g]);
m[2] = t[b].add(t[g].neg());
} else {
m[1] = t[b].toJ().mixedAdd(t[g]);
m[2] = t[b].toJ().mixedAdd(t[g].neg());
}
var v = [ -3, -1, -5, -7, 0, 7, 5, 1, 3 ], y = a(i[b], i[g]);
l = Math.max(y[0].length, l);
d[b] = new Array(l);
d[g] = new Array(l);
for (c = 0; c < l; c++) {
var _ = 0 | y[0][c], w = 0 | y[1][c];
d[b][c] = v[3 * (_ + 1) + (w + 1)];
d[g][c] = 0;
u[b] = m;
}
} else {
d[b] = n(i[b], h[b], this._bitLength);
d[g] = n(i[g], h[g], this._bitLength);
l = Math.max(d[b].length, l);
l = Math.max(d[g].length, l);
}
}
var S = this.jpoint(null, null, null), k = this._wnafT4;
for (o = l; o >= 0; o--) {
for (var M = 0; o >= 0; ) {
var A = !0;
for (c = 0; c < r; c++) {
k[c] = 0 | d[c][o];
0 !== k[c] && (A = !1);
}
if (!A) break;
M++;
o--;
}
o >= 0 && M++;
S = S.dblp(M);
if (o < 0) break;
for (c = 0; c < r; c++) {
var I = k[c];
if (0 !== I) {
I > 0 ? f = u[c][I - 1 >> 1] : I < 0 && (f = u[c][-I - 1 >> 1].neg());
S = "affine" === f.type ? S.mixedAdd(f) : S.add(f);
}
}
}
for (o = 0; o < r; o++) u[o] = null;
return s ? S : S.toP();
};
function c(e, t) {
this.curve = e;
this.type = t;
this.precomputed = null;
}
o.BasePoint = c;
c.prototype.eq = function() {
throw new Error("Not implemented");
};
c.prototype.validate = function() {
return this.curve.validate(this);
};
o.prototype.decodePoint = function(e, t) {
e = r.toArray(e, t);
var i = this.p.byteLength();
if ((4 === e[0] || 6 === e[0] || 7 === e[0]) && e.length - 1 == 2 * i) {
6 === e[0] ? s(e[e.length - 1] % 2 == 0) : 7 === e[0] && s(e[e.length - 1] % 2 == 1);
return this.point(e.slice(1, 1 + i), e.slice(1 + i, 1 + 2 * i));
}
if ((2 === e[0] || 3 === e[0]) && e.length - 1 === i) return this.pointFromX(e.slice(1, 1 + i), 3 === e[0]);
throw new Error("Unknown point format");
};
c.prototype.encodeCompressed = function(e) {
return this.encode(e, !0);
};
c.prototype._encode = function(e) {
var t = this.curve.p.byteLength(), i = this.getX().toArray("be", t);
return e ? [ this.getY().isEven() ? 2 : 3 ].concat(i) : [ 4 ].concat(i, this.getY().toArray("be", t));
};
c.prototype.encode = function(e, t) {
return r.encode(this._encode(t), e);
};
c.prototype.precompute = function(e) {
if (this.precomputed) return this;
var t = {
doubles: null,
naf: null,
beta: null
};
t.naf = this._getNAFPoints(8);
t.doubles = this._getDoubles(4, e);
t.beta = this._getBeta();
this.precomputed = t;
return this;
};
c.prototype._hasDoubles = function(e) {
if (!this.precomputed) return !1;
var t = this.precomputed.doubles;
return !!t && t.points.length >= Math.ceil((e.bitLength() + 1) / t.step);
};
c.prototype._getDoubles = function(e, t) {
if (this.precomputed && this.precomputed.doubles) return this.precomputed.doubles;
for (var i = [ this ], r = this, n = 0; n < t; n += e) {
for (var a = 0; a < e; a++) r = r.dbl();
i.push(r);
}
return {
step: e,
points: i
};
};
c.prototype._getNAFPoints = function(e) {
if (this.precomputed && this.precomputed.naf) return this.precomputed.naf;
for (var t = [ this ], i = (1 << e) - 1, r = 1 === i ? null : this.dbl(), n = 1; n < i; n++) t[n] = t[n - 1].add(r);
return {
wnd: e,
points: t
};
};
c.prototype._getBeta = function() {
return null;
};
c.prototype.dblp = function(e) {
for (var t = this, i = 0; i < e; i++) t = t.dbl();
return t;
};
}, {
"../utils": 101,
"bn.js": 102
} ],
89: [ function(e, t) {
"use strict";
var i = e("../utils"), r = e("bn.js"), n = e("inherits"), a = e("./base"), s = i.assert;
function o(e) {
this.twisted = 1 != (0 | e.a);
this.mOneA = this.twisted && -1 == (0 | e.a);
this.extended = this.mOneA;
a.call(this, "edwards", e);
this.a = new r(e.a, 16).umod(this.red.m);
this.a = this.a.toRed(this.red);
this.c = new r(e.c, 16).toRed(this.red);
this.c2 = this.c.redSqr();
this.d = new r(e.d, 16).toRed(this.red);
this.dd = this.d.redAdd(this.d);
s(!this.twisted || 0 === this.c.fromRed().cmpn(1));
this.oneC = 1 == (0 | e.c);
}
n(o, a);
t.exports = o;
o.prototype._mulA = function(e) {
return this.mOneA ? e.redNeg() : this.a.redMul(e);
};
o.prototype._mulC = function(e) {
return this.oneC ? e : this.c.redMul(e);
};
o.prototype.jpoint = function(e, t, i, r) {
return this.point(e, t, i, r);
};
o.prototype.pointFromX = function(e, t) {
(e = new r(e, 16)).red || (e = e.toRed(this.red));
var i = e.redSqr(), n = this.c2.redSub(this.a.redMul(i)), a = this.one.redSub(this.c2.redMul(this.d).redMul(i)), s = n.redMul(a.redInvm()), o = s.redSqrt();
if (0 !== o.redSqr().redSub(s).cmp(this.zero)) throw new Error("invalid point");
var c = o.fromRed().isOdd();
(t && !c || !t && c) && (o = o.redNeg());
return this.point(e, o);
};
o.prototype.pointFromY = function(e, t) {
(e = new r(e, 16)).red || (e = e.toRed(this.red));
var i = e.redSqr(), n = i.redSub(this.c2), a = i.redMul(this.d).redMul(this.c2).redSub(this.a), s = n.redMul(a.redInvm());
if (0 === s.cmp(this.zero)) {
if (t) throw new Error("invalid point");
return this.point(this.zero, e);
}
var o = s.redSqrt();
if (0 !== o.redSqr().redSub(s).cmp(this.zero)) throw new Error("invalid point");
o.fromRed().isOdd() !== t && (o = o.redNeg());
return this.point(o, e);
};
o.prototype.validate = function(e) {
if (e.isInfinity()) return !0;
e.normalize();
var t = e.x.redSqr(), i = e.y.redSqr(), r = t.redMul(this.a).redAdd(i), n = this.c2.redMul(this.one.redAdd(this.d.redMul(t).redMul(i)));
return 0 === r.cmp(n);
};
function c(e, t, i, n, s) {
a.BasePoint.call(this, e, "projective");
if (null === t && null === i && null === n) {
this.x = this.curve.zero;
this.y = this.curve.one;
this.z = this.curve.one;
this.t = this.curve.zero;
this.zOne = !0;
} else {
this.x = new r(t, 16);
this.y = new r(i, 16);
this.z = n ? new r(n, 16) : this.curve.one;
this.t = s && new r(s, 16);
this.x.red || (this.x = this.x.toRed(this.curve.red));
this.y.red || (this.y = this.y.toRed(this.curve.red));
this.z.red || (this.z = this.z.toRed(this.curve.red));
this.t && !this.t.red && (this.t = this.t.toRed(this.curve.red));
this.zOne = this.z === this.curve.one;
if (this.curve.extended && !this.t) {
this.t = this.x.redMul(this.y);
this.zOne || (this.t = this.t.redMul(this.z.redInvm()));
}
}
}
n(c, a.BasePoint);
o.prototype.pointFromJSON = function(e) {
return c.fromJSON(this, e);
};
o.prototype.point = function(e, t, i, r) {
return new c(this, e, t, i, r);
};
c.fromJSON = function(e, t) {
return new c(e, t[0], t[1], t[2]);
};
c.prototype.inspect = function() {
return this.isInfinity() ? "<EC Point Infinity>" : "<EC Point x: " + this.x.fromRed().toString(16, 2) + " y: " + this.y.fromRed().toString(16, 2) + " z: " + this.z.fromRed().toString(16, 2) + ">";
};
c.prototype.isInfinity = function() {
return 0 === this.x.cmpn(0) && (0 === this.y.cmp(this.z) || this.zOne && 0 === this.y.cmp(this.curve.c));
};
c.prototype._extDbl = function() {
var e = this.x.redSqr(), t = this.y.redSqr(), i = this.z.redSqr();
i = i.redIAdd(i);
var r = this.curve._mulA(e), n = this.x.redAdd(this.y).redSqr().redISub(e).redISub(t), a = r.redAdd(t), s = a.redSub(i), o = r.redSub(t), c = n.redMul(s), f = a.redMul(o), h = n.redMul(o), u = s.redMul(a);
return this.curve.point(c, f, u, h);
};
c.prototype._projDbl = function() {
var e, t, i, r, n, a, s = this.x.redAdd(this.y).redSqr(), o = this.x.redSqr(), c = this.y.redSqr();
if (this.curve.twisted) {
var f = (r = this.curve._mulA(o)).redAdd(c);
if (this.zOne) {
e = s.redSub(o).redSub(c).redMul(f.redSub(this.curve.two));
t = f.redMul(r.redSub(c));
i = f.redSqr().redSub(f).redSub(f);
} else {
n = this.z.redSqr();
a = f.redSub(n).redISub(n);
e = s.redSub(o).redISub(c).redMul(a);
t = f.redMul(r.redSub(c));
i = f.redMul(a);
}
} else {
r = o.redAdd(c);
n = this.curve._mulC(this.z).redSqr();
a = r.redSub(n).redSub(n);
e = this.curve._mulC(s.redISub(r)).redMul(a);
t = this.curve._mulC(r).redMul(o.redISub(c));
i = r.redMul(a);
}
return this.curve.point(e, t, i);
};
c.prototype.dbl = function() {
return this.isInfinity() ? this : this.curve.extended ? this._extDbl() : this._projDbl();
};
c.prototype._extAdd = function(e) {
var t = this.y.redSub(this.x).redMul(e.y.redSub(e.x)), i = this.y.redAdd(this.x).redMul(e.y.redAdd(e.x)), r = this.t.redMul(this.curve.dd).redMul(e.t), n = this.z.redMul(e.z.redAdd(e.z)), a = i.redSub(t), s = n.redSub(r), o = n.redAdd(r), c = i.redAdd(t), f = a.redMul(s), h = o.redMul(c), u = a.redMul(c), d = s.redMul(o);
return this.curve.point(f, h, d, u);
};
c.prototype._projAdd = function(e) {
var t, i, r = this.z.redMul(e.z), n = r.redSqr(), a = this.x.redMul(e.x), s = this.y.redMul(e.y), o = this.curve.d.redMul(a).redMul(s), c = n.redSub(o), f = n.redAdd(o), h = this.x.redAdd(this.y).redMul(e.x.redAdd(e.y)).redISub(a).redISub(s), u = r.redMul(c).redMul(h);
if (this.curve.twisted) {
t = r.redMul(f).redMul(s.redSub(this.curve._mulA(a)));
i = c.redMul(f);
} else {
t = r.redMul(f).redMul(s.redSub(a));
i = this.curve._mulC(c).redMul(f);
}
return this.curve.point(u, t, i);
};
c.prototype.add = function(e) {
return this.isInfinity() ? e : e.isInfinity() ? this : this.curve.extended ? this._extAdd(e) : this._projAdd(e);
};
c.prototype.mul = function(e) {
return this._hasDoubles(e) ? this.curve._fixedNafMul(this, e) : this.curve._wnafMul(this, e);
};
c.prototype.mulAdd = function(e, t, i) {
return this.curve._wnafMulAdd(1, [ this, t ], [ e, i ], 2, !1);
};
c.prototype.jmulAdd = function(e, t, i) {
return this.curve._wnafMulAdd(1, [ this, t ], [ e, i ], 2, !0);
};
c.prototype.normalize = function() {
if (this.zOne) return this;
var e = this.z.redInvm();
this.x = this.x.redMul(e);
this.y = this.y.redMul(e);
this.t && (this.t = this.t.redMul(e));
this.z = this.curve.one;
this.zOne = !0;
return this;
};
c.prototype.neg = function() {
return this.curve.point(this.x.redNeg(), this.y, this.z, this.t && this.t.redNeg());
};
c.prototype.getX = function() {
this.normalize();
return this.x.fromRed();
};
c.prototype.getY = function() {
this.normalize();
return this.y.fromRed();
};
c.prototype.eq = function(e) {
return this === e || 0 === this.getX().cmp(e.getX()) && 0 === this.getY().cmp(e.getY());
};
c.prototype.eqXToP = function(e) {
var t = e.toRed(this.curve.red).redMul(this.z);
if (0 === this.x.cmp(t)) return !0;
for (var i = e.clone(), r = this.curve.redN.redMul(this.z); ;) {
i.iadd(this.curve.n);
if (i.cmp(this.curve.p) >= 0) return !1;
t.redIAdd(r);
if (0 === this.x.cmp(t)) return !0;
}
};
c.prototype.toP = c.prototype.normalize;
c.prototype.mixedAdd = c.prototype.add;
}, {
"../utils": 101,
"./base": 88,
"bn.js": 102,
inherits: 138
} ],
90: [ function(e, t, i) {
"use strict";
var r = i;
r.base = e("./base");
r.short = e("./short");
r.mont = e("./mont");
r.edwards = e("./edwards");
}, {
"./base": 88,
"./edwards": 89,
"./mont": 91,
"./short": 92
} ],
91: [ function(e, t) {
"use strict";
var i = e("bn.js"), r = e("inherits"), n = e("./base"), a = e("../utils");
function s(e) {
n.call(this, "mont", e);
this.a = new i(e.a, 16).toRed(this.red);
this.b = new i(e.b, 16).toRed(this.red);
this.i4 = new i(4).toRed(this.red).redInvm();
this.two = new i(2).toRed(this.red);
this.a24 = this.i4.redMul(this.a.redAdd(this.two));
}
r(s, n);
t.exports = s;
s.prototype.validate = function(e) {
var t = e.normalize().x, i = t.redSqr(), r = i.redMul(t).redAdd(i.redMul(this.a)).redAdd(t);
return 0 === r.redSqrt().redSqr().cmp(r);
};
function o(e, t, r) {
n.BasePoint.call(this, e, "projective");
if (null === t && null === r) {
this.x = this.curve.one;
this.z = this.curve.zero;
} else {
this.x = new i(t, 16);
this.z = new i(r, 16);
this.x.red || (this.x = this.x.toRed(this.curve.red));
this.z.red || (this.z = this.z.toRed(this.curve.red));
}
}
r(o, n.BasePoint);
s.prototype.decodePoint = function(e, t) {
return this.point(a.toArray(e, t), 1);
};
s.prototype.point = function(e, t) {
return new o(this, e, t);
};
s.prototype.pointFromJSON = function(e) {
return o.fromJSON(this, e);
};
o.prototype.precompute = function() {};
o.prototype._encode = function() {
return this.getX().toArray("be", this.curve.p.byteLength());
};
o.fromJSON = function(e, t) {
return new o(e, t[0], t[1] || e.one);
};
o.prototype.inspect = function() {
return this.isInfinity() ? "<EC Point Infinity>" : "<EC Point x: " + this.x.fromRed().toString(16, 2) + " z: " + this.z.fromRed().toString(16, 2) + ">";
};
o.prototype.isInfinity = function() {
return 0 === this.z.cmpn(0);
};
o.prototype.dbl = function() {
var e = this.x.redAdd(this.z).redSqr(), t = this.x.redSub(this.z).redSqr(), i = e.redSub(t), r = e.redMul(t), n = i.redMul(t.redAdd(this.curve.a24.redMul(i)));
return this.curve.point(r, n);
};
o.prototype.add = function() {
throw new Error("Not supported on Montgomery curve");
};
o.prototype.diffAdd = function(e, t) {
var i = this.x.redAdd(this.z), r = this.x.redSub(this.z), n = e.x.redAdd(e.z), a = e.x.redSub(e.z).redMul(i), s = n.redMul(r), o = t.z.redMul(a.redAdd(s).redSqr()), c = t.x.redMul(a.redISub(s).redSqr());
return this.curve.point(o, c);
};
o.prototype.mul = function(e) {
for (var t = e.clone(), i = this, r = this.curve.point(null, null), n = []; 0 !== t.cmpn(0); t.iushrn(1)) n.push(t.andln(1));
for (var a = n.length - 1; a >= 0; a--) if (0 === n[a]) {
i = i.diffAdd(r, this);
r = r.dbl();
} else {
r = i.diffAdd(r, this);
i = i.dbl();
}
return r;
};
o.prototype.mulAdd = function() {
throw new Error("Not supported on Montgomery curve");
};
o.prototype.jumlAdd = function() {
throw new Error("Not supported on Montgomery curve");
};
o.prototype.eq = function(e) {
return 0 === this.getX().cmp(e.getX());
};
o.prototype.normalize = function() {
this.x = this.x.redMul(this.z.redInvm());
this.z = this.curve.one;
return this;
};
o.prototype.getX = function() {
this.normalize();
return this.x.fromRed();
};
}, {
"../utils": 101,
"./base": 88,
"bn.js": 102,
inherits: 138
} ],
92: [ function(e, t) {
"use strict";
var i = e("../utils"), r = e("bn.js"), n = e("inherits"), a = e("./base"), s = i.assert;
function o(e) {
a.call(this, "short", e);
this.a = new r(e.a, 16).toRed(this.red);
this.b = new r(e.b, 16).toRed(this.red);
this.tinv = this.two.redInvm();
this.zeroA = 0 === this.a.fromRed().cmpn(0);
this.threeA = 0 === this.a.fromRed().sub(this.p).cmpn(-3);
this.endo = this._getEndomorphism(e);
this._endoWnafT1 = new Array(4);
this._endoWnafT2 = new Array(4);
}
n(o, a);
t.exports = o;
o.prototype._getEndomorphism = function(e) {
if (this.zeroA && this.g && this.n && 1 === this.p.modn(3)) {
var t, i;
if (e.beta) t = new r(e.beta, 16).toRed(this.red); else {
var n = this._getEndoRoots(this.p);
t = (t = n[0].cmp(n[1]) < 0 ? n[0] : n[1]).toRed(this.red);
}
if (e.lambda) i = new r(e.lambda, 16); else {
var a = this._getEndoRoots(this.n);
if (0 === this.g.mul(a[0]).x.cmp(this.g.x.redMul(t))) i = a[0]; else {
i = a[1];
s(0 === this.g.mul(i).x.cmp(this.g.x.redMul(t)));
}
}
return {
beta: t,
lambda: i,
basis: e.basis ? e.basis.map(function(e) {
return {
a: new r(e.a, 16),
b: new r(e.b, 16)
};
}) : this._getEndoBasis(i)
};
}
};
o.prototype._getEndoRoots = function(e) {
var t = e === this.p ? this.red : r.mont(e), i = new r(2).toRed(t).redInvm(), n = i.redNeg(), a = new r(3).toRed(t).redNeg().redSqrt().redMul(i);
return [ n.redAdd(a).fromRed(), n.redSub(a).fromRed() ];
};
o.prototype._getEndoBasis = function(e) {
for (var t, i, n, a, s, o, c, f, h, u = this.n.ushrn(Math.floor(this.n.bitLength() / 2)), d = e, l = this.n.clone(), p = new r(1), b = new r(0), g = new r(0), m = new r(1), v = 0; 0 !== d.cmpn(0); ) {
var y = l.div(d);
f = l.sub(y.mul(d));
h = g.sub(y.mul(p));
var _ = m.sub(y.mul(b));
if (!n && f.cmp(u) < 0) {
t = c.neg();
i = p;
n = f.neg();
a = h;
} else if (n && 2 == ++v) break;
c = f;
l = d;
d = f;
g = p;
p = h;
m = b;
b = _;
}
s = f.neg();
o = h;
var w = n.sqr().add(a.sqr());
if (s.sqr().add(o.sqr()).cmp(w) >= 0) {
s = t;
o = i;
}
if (n.negative) {
n = n.neg();
a = a.neg();
}
if (s.negative) {
s = s.neg();
o = o.neg();
}
return [ {
a: n,
b: a
}, {
a: s,
b: o
} ];
};
o.prototype._endoSplit = function(e) {
var t = this.endo.basis, i = t[0], r = t[1], n = r.b.mul(e).divRound(this.n), a = i.b.neg().mul(e).divRound(this.n), s = n.mul(i.a), o = a.mul(r.a), c = n.mul(i.b), f = a.mul(r.b);
return {
k1: e.sub(s).sub(o),
k2: c.add(f).neg()
};
};
o.prototype.pointFromX = function(e, t) {
(e = new r(e, 16)).red || (e = e.toRed(this.red));
var i = e.redSqr().redMul(e).redIAdd(e.redMul(this.a)).redIAdd(this.b), n = i.redSqrt();
if (0 !== n.redSqr().redSub(i).cmp(this.zero)) throw new Error("invalid point");
var a = n.fromRed().isOdd();
(t && !a || !t && a) && (n = n.redNeg());
return this.point(e, n);
};
o.prototype.validate = function(e) {
if (e.inf) return !0;
var t = e.x, i = e.y, r = this.a.redMul(t), n = t.redSqr().redMul(t).redIAdd(r).redIAdd(this.b);
return 0 === i.redSqr().redISub(n).cmpn(0);
};
o.prototype._endoWnafMulAdd = function(e, t, i) {
for (var r = this._endoWnafT1, n = this._endoWnafT2, a = 0; a < e.length; a++) {
var s = this._endoSplit(t[a]), o = e[a], c = o._getBeta();
if (s.k1.negative) {
s.k1.ineg();
o = o.neg(!0);
}
if (s.k2.negative) {
s.k2.ineg();
c = c.neg(!0);
}
r[2 * a] = o;
r[2 * a + 1] = c;
n[2 * a] = s.k1;
n[2 * a + 1] = s.k2;
}
for (var f = this._wnafMulAdd(1, r, n, 2 * a, i), h = 0; h < 2 * a; h++) {
r[h] = null;
n[h] = null;
}
return f;
};
function c(e, t, i, n) {
a.BasePoint.call(this, e, "affine");
if (null === t && null === i) {
this.x = null;
this.y = null;
this.inf = !0;
} else {
this.x = new r(t, 16);
this.y = new r(i, 16);
if (n) {
this.x.forceRed(this.curve.red);
this.y.forceRed(this.curve.red);
}
this.x.red || (this.x = this.x.toRed(this.curve.red));
this.y.red || (this.y = this.y.toRed(this.curve.red));
this.inf = !1;
}
}
n(c, a.BasePoint);
o.prototype.point = function(e, t, i) {
return new c(this, e, t, i);
};
o.prototype.pointFromJSON = function(e, t) {
return c.fromJSON(this, e, t);
};
c.prototype._getBeta = function() {
if (this.curve.endo) {
var e = this.precomputed;
if (e && e.beta) return e.beta;
var t = this.curve.point(this.x.redMul(this.curve.endo.beta), this.y);
if (e) {
var i = this.curve, r = function(e) {
return i.point(e.x.redMul(i.endo.beta), e.y);
};
e.beta = t;
t.precomputed = {
beta: null,
naf: e.naf && {
wnd: e.naf.wnd,
points: e.naf.points.map(r)
},
doubles: e.doubles && {
step: e.doubles.step,
points: e.doubles.points.map(r)
}
};
}
return t;
}
};
c.prototype.toJSON = function() {
return this.precomputed ? [ this.x, this.y, this.precomputed && {
doubles: this.precomputed.doubles && {
step: this.precomputed.doubles.step,
points: this.precomputed.doubles.points.slice(1)
},
naf: this.precomputed.naf && {
wnd: this.precomputed.naf.wnd,
points: this.precomputed.naf.points.slice(1)
}
} ] : [ this.x, this.y ];
};
c.fromJSON = function(e, t, i) {
"string" == typeof t && (t = JSON.parse(t));
var r = e.point(t[0], t[1], i);
if (!t[2]) return r;
function n(t) {
return e.point(t[0], t[1], i);
}
var a = t[2];
r.precomputed = {
beta: null,
doubles: a.doubles && {
step: a.doubles.step,
points: [ r ].concat(a.doubles.points.map(n))
},
naf: a.naf && {
wnd: a.naf.wnd,
points: [ r ].concat(a.naf.points.map(n))
}
};
return r;
};
c.prototype.inspect = function() {
return this.isInfinity() ? "<EC Point Infinity>" : "<EC Point x: " + this.x.fromRed().toString(16, 2) + " y: " + this.y.fromRed().toString(16, 2) + ">";
};
c.prototype.isInfinity = function() {
return this.inf;
};
c.prototype.add = function(e) {
if (this.inf) return e;
if (e.inf) return this;
if (this.eq(e)) return this.dbl();
if (this.neg().eq(e)) return this.curve.point(null, null);
if (0 === this.x.cmp(e.x)) return this.curve.point(null, null);
var t = this.y.redSub(e.y);
0 !== t.cmpn(0) && (t = t.redMul(this.x.redSub(e.x).redInvm()));
var i = t.redSqr().redISub(this.x).redISub(e.x), r = t.redMul(this.x.redSub(i)).redISub(this.y);
return this.curve.point(i, r);
};
c.prototype.dbl = function() {
if (this.inf) return this;
var e = this.y.redAdd(this.y);
if (0 === e.cmpn(0)) return this.curve.point(null, null);
var t = this.curve.a, i = this.x.redSqr(), r = e.redInvm(), n = i.redAdd(i).redIAdd(i).redIAdd(t).redMul(r), a = n.redSqr().redISub(this.x.redAdd(this.x)), s = n.redMul(this.x.redSub(a)).redISub(this.y);
return this.curve.point(a, s);
};
c.prototype.getX = function() {
return this.x.fromRed();
};
c.prototype.getY = function() {
return this.y.fromRed();
};
c.prototype.mul = function(e) {
e = new r(e, 16);
return this.isInfinity() ? this : this._hasDoubles(e) ? this.curve._fixedNafMul(this, e) : this.curve.endo ? this.curve._endoWnafMulAdd([ this ], [ e ]) : this.curve._wnafMul(this, e);
};
c.prototype.mulAdd = function(e, t, i) {
var r = [ this, t ], n = [ e, i ];
return this.curve.endo ? this.curve._endoWnafMulAdd(r, n) : this.curve._wnafMulAdd(1, r, n, 2);
};
c.prototype.jmulAdd = function(e, t, i) {
var r = [ this, t ], n = [ e, i ];
return this.curve.endo ? this.curve._endoWnafMulAdd(r, n, !0) : this.curve._wnafMulAdd(1, r, n, 2, !0);
};
c.prototype.eq = function(e) {
return this === e || this.inf === e.inf && (this.inf || 0 === this.x.cmp(e.x) && 0 === this.y.cmp(e.y));
};
c.prototype.neg = function(e) {
if (this.inf) return this;
var t = this.curve.point(this.x, this.y.redNeg());
if (e && this.precomputed) {
var i = this.precomputed, r = function(e) {
return e.neg();
};
t.precomputed = {
naf: i.naf && {
wnd: i.naf.wnd,
points: i.naf.points.map(r)
},
doubles: i.doubles && {
step: i.doubles.step,
points: i.doubles.points.map(r)
}
};
}
return t;
};
c.prototype.toJ = function() {
return this.inf ? this.curve.jpoint(null, null, null) : this.curve.jpoint(this.x, this.y, this.curve.one);
};
function f(e, t, i, n) {
a.BasePoint.call(this, e, "jacobian");
if (null === t && null === i && null === n) {
this.x = this.curve.one;
this.y = this.curve.one;
this.z = new r(0);
} else {
this.x = new r(t, 16);
this.y = new r(i, 16);
this.z = new r(n, 16);
}
this.x.red || (this.x = this.x.toRed(this.curve.red));
this.y.red || (this.y = this.y.toRed(this.curve.red));
this.z.red || (this.z = this.z.toRed(this.curve.red));
this.zOne = this.z === this.curve.one;
}
n(f, a.BasePoint);
o.prototype.jpoint = function(e, t, i) {
return new f(this, e, t, i);
};
f.prototype.toP = function() {
if (this.isInfinity()) return this.curve.point(null, null);
var e = this.z.redInvm(), t = e.redSqr(), i = this.x.redMul(t), r = this.y.redMul(t).redMul(e);
return this.curve.point(i, r);
};
f.prototype.neg = function() {
return this.curve.jpoint(this.x, this.y.redNeg(), this.z);
};
f.prototype.add = function(e) {
if (this.isInfinity()) return e;
if (e.isInfinity()) return this;
var t = e.z.redSqr(), i = this.z.redSqr(), r = this.x.redMul(t), n = e.x.redMul(i), a = this.y.redMul(t.redMul(e.z)), s = e.y.redMul(i.redMul(this.z)), o = r.redSub(n), c = a.redSub(s);
if (0 === o.cmpn(0)) return 0 !== c.cmpn(0) ? this.curve.jpoint(null, null, null) : this.dbl();
var f = o.redSqr(), h = f.redMul(o), u = r.redMul(f), d = c.redSqr().redIAdd(h).redISub(u).redISub(u), l = c.redMul(u.redISub(d)).redISub(a.redMul(h)), p = this.z.redMul(e.z).redMul(o);
return this.curve.jpoint(d, l, p);
};
f.prototype.mixedAdd = function(e) {
if (this.isInfinity()) return e.toJ();
if (e.isInfinity()) return this;
var t = this.z.redSqr(), i = this.x, r = e.x.redMul(t), n = this.y, a = e.y.redMul(t).redMul(this.z), s = i.redSub(r), o = n.redSub(a);
if (0 === s.cmpn(0)) return 0 !== o.cmpn(0) ? this.curve.jpoint(null, null, null) : this.dbl();
var c = s.redSqr(), f = c.redMul(s), h = i.redMul(c), u = o.redSqr().redIAdd(f).redISub(h).redISub(h), d = o.redMul(h.redISub(u)).redISub(n.redMul(f)), l = this.z.redMul(s);
return this.curve.jpoint(u, d, l);
};
f.prototype.dblp = function(e) {
if (0 === e) return this;
if (this.isInfinity()) return this;
if (!e) return this.dbl();
var t;
if (this.curve.zeroA || this.curve.threeA) {
var i = this;
for (t = 0; t < e; t++) i = i.dbl();
return i;
}
var r = this.curve.a, n = this.curve.tinv, a = this.x, s = this.y, o = this.z, c = o.redSqr().redSqr(), f = s.redAdd(s);
for (t = 0; t < e; t++) {
var h = a.redSqr(), u = f.redSqr(), d = u.redSqr(), l = h.redAdd(h).redIAdd(h).redIAdd(r.redMul(c)), p = a.redMul(u), b = l.redSqr().redISub(p.redAdd(p)), g = p.redISub(b), m = l.redMul(g);
m = m.redIAdd(m).redISub(d);
var v = f.redMul(o);
t + 1 < e && (c = c.redMul(d));
a = b;
o = v;
f = m;
}
return this.curve.jpoint(a, f.redMul(n), o);
};
f.prototype.dbl = function() {
return this.isInfinity() ? this : this.curve.zeroA ? this._zeroDbl() : this.curve.threeA ? this._threeDbl() : this._dbl();
};
f.prototype._zeroDbl = function() {
var e, t, i;
if (this.zOne) {
var r = this.x.redSqr(), n = this.y.redSqr(), a = n.redSqr(), s = this.x.redAdd(n).redSqr().redISub(r).redISub(a);
s = s.redIAdd(s);
var o = r.redAdd(r).redIAdd(r), c = o.redSqr().redISub(s).redISub(s), f = a.redIAdd(a);
f = (f = f.redIAdd(f)).redIAdd(f);
e = c;
t = o.redMul(s.redISub(c)).redISub(f);
i = this.y.redAdd(this.y);
} else {
var h = this.x.redSqr(), u = this.y.redSqr(), d = u.redSqr(), l = this.x.redAdd(u).redSqr().redISub(h).redISub(d);
l = l.redIAdd(l);
var p = h.redAdd(h).redIAdd(h), b = p.redSqr(), g = d.redIAdd(d);
g = (g = g.redIAdd(g)).redIAdd(g);
e = b.redISub(l).redISub(l);
t = p.redMul(l.redISub(e)).redISub(g);
i = (i = this.y.redMul(this.z)).redIAdd(i);
}
return this.curve.jpoint(e, t, i);
};
f.prototype._threeDbl = function() {
var e, t, i;
if (this.zOne) {
var r = this.x.redSqr(), n = this.y.redSqr(), a = n.redSqr(), s = this.x.redAdd(n).redSqr().redISub(r).redISub(a);
s = s.redIAdd(s);
var o = r.redAdd(r).redIAdd(r).redIAdd(this.curve.a), c = o.redSqr().redISub(s).redISub(s);
e = c;
var f = a.redIAdd(a);
f = (f = f.redIAdd(f)).redIAdd(f);
t = o.redMul(s.redISub(c)).redISub(f);
i = this.y.redAdd(this.y);
} else {
var h = this.z.redSqr(), u = this.y.redSqr(), d = this.x.redMul(u), l = this.x.redSub(h).redMul(this.x.redAdd(h));
l = l.redAdd(l).redIAdd(l);
var p = d.redIAdd(d), b = (p = p.redIAdd(p)).redAdd(p);
e = l.redSqr().redISub(b);
i = this.y.redAdd(this.z).redSqr().redISub(u).redISub(h);
var g = u.redSqr();
g = (g = (g = g.redIAdd(g)).redIAdd(g)).redIAdd(g);
t = l.redMul(p.redISub(e)).redISub(g);
}
return this.curve.jpoint(e, t, i);
};
f.prototype._dbl = function() {
var e = this.curve.a, t = this.x, i = this.y, r = this.z, n = r.redSqr().redSqr(), a = t.redSqr(), s = i.redSqr(), o = a.redAdd(a).redIAdd(a).redIAdd(e.redMul(n)), c = t.redAdd(t), f = (c = c.redIAdd(c)).redMul(s), h = o.redSqr().redISub(f.redAdd(f)), u = f.redISub(h), d = s.redSqr();
d = (d = (d = d.redIAdd(d)).redIAdd(d)).redIAdd(d);
var l = o.redMul(u).redISub(d), p = i.redAdd(i).redMul(r);
return this.curve.jpoint(h, l, p);
};
f.prototype.trpl = function() {
if (!this.curve.zeroA) return this.dbl().add(this);
var e = this.x.redSqr(), t = this.y.redSqr(), i = this.z.redSqr(), r = t.redSqr(), n = e.redAdd(e).redIAdd(e), a = n.redSqr(), s = this.x.redAdd(t).redSqr().redISub(e).redISub(r), o = (s = (s = (s = s.redIAdd(s)).redAdd(s).redIAdd(s)).redISub(a)).redSqr(), c = r.redIAdd(r);
c = (c = (c = c.redIAdd(c)).redIAdd(c)).redIAdd(c);
var f = n.redIAdd(s).redSqr().redISub(a).redISub(o).redISub(c), h = t.redMul(f);
h = (h = h.redIAdd(h)).redIAdd(h);
var u = this.x.redMul(o).redISub(h);
u = (u = u.redIAdd(u)).redIAdd(u);
var d = this.y.redMul(f.redMul(c.redISub(f)).redISub(s.redMul(o)));
d = (d = (d = d.redIAdd(d)).redIAdd(d)).redIAdd(d);
var l = this.z.redAdd(s).redSqr().redISub(i).redISub(o);
return this.curve.jpoint(u, d, l);
};
f.prototype.mul = function(e, t) {
e = new r(e, t);
return this.curve._wnafMul(this, e);
};
f.prototype.eq = function(e) {
if ("affine" === e.type) return this.eq(e.toJ());
if (this === e) return !0;
var t = this.z.redSqr(), i = e.z.redSqr();
if (0 !== this.x.redMul(i).redISub(e.x.redMul(t)).cmpn(0)) return !1;
var r = t.redMul(this.z), n = i.redMul(e.z);
return 0 === this.y.redMul(n).redISub(e.y.redMul(r)).cmpn(0);
};
f.prototype.eqXToP = function(e) {
var t = this.z.redSqr(), i = e.toRed(this.curve.red).redMul(t);
if (0 === this.x.cmp(i)) return !0;
for (var r = e.clone(), n = this.curve.redN.redMul(t); ;) {
r.iadd(this.curve.n);
if (r.cmp(this.curve.p) >= 0) return !1;
i.redIAdd(n);
if (0 === this.x.cmp(i)) return !0;
}
};
f.prototype.inspect = function() {
return this.isInfinity() ? "<EC JPoint Infinity>" : "<EC JPoint x: " + this.x.toString(16, 2) + " y: " + this.y.toString(16, 2) + " z: " + this.z.toString(16, 2) + ">";
};
f.prototype.isInfinity = function() {
return 0 === this.z.cmpn(0);
};
}, {
"../utils": 101,
"./base": 88,
"bn.js": 102,
inherits: 138
} ],
93: [ function(e, t, i) {
"use strict";
var r, n = i, a = e("hash.js"), s = e("./curve"), o = e("./utils").assert;
function c(e) {
"short" === e.type ? this.curve = new s.short(e) : "edwards" === e.type ? this.curve = new s.edwards(e) : this.curve = new s.mont(e);
this.g = this.curve.g;
this.n = this.curve.n;
this.hash = e.hash;
o(this.g.validate(), "Invalid curve");
o(this.g.mul(this.n).isInfinity(), "Invalid curve, G*N != O");
}
n.PresetCurve = c;
function f(e, t) {
Object.defineProperty(n, e, {
configurable: !0,
enumerable: !0,
get: function() {
var i = new c(t);
Object.defineProperty(n, e, {
configurable: !0,
enumerable: !0,
value: i
});
return i;
}
});
}
f("p192", {
type: "short",
prime: "p192",
p: "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff",
a: "ffffffff ffffffff ffffffff fffffffe ffffffff fffffffc",
b: "64210519 e59c80e7 0fa7e9ab 72243049 feb8deec c146b9b1",
n: "ffffffff ffffffff ffffffff 99def836 146bc9b1 b4d22831",
hash: a.sha256,
gRed: !1,
g: [ "188da80e b03090f6 7cbf20eb 43a18800 f4ff0afd 82ff1012", "07192b95 ffc8da78 631011ed 6b24cdd5 73f977a1 1e794811" ]
});
f("p224", {
type: "short",
prime: "p224",
p: "ffffffff ffffffff ffffffff ffffffff 00000000 00000000 00000001",
a: "ffffffff ffffffff ffffffff fffffffe ffffffff ffffffff fffffffe",
b: "b4050a85 0c04b3ab f5413256 5044b0b7 d7bfd8ba 270b3943 2355ffb4",
n: "ffffffff ffffffff ffffffff ffff16a2 e0b8f03e 13dd2945 5c5c2a3d",
hash: a.sha256,
gRed: !1,
g: [ "b70e0cbd 6bb4bf7f 321390b9 4a03c1d3 56c21122 343280d6 115c1d21", "bd376388 b5f723fb 4c22dfe6 cd4375a0 5a074764 44d58199 85007e34" ]
});
f("p256", {
type: "short",
prime: null,
p: "ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff ffffffff",
a: "ffffffff 00000001 00000000 00000000 00000000 ffffffff ffffffff fffffffc",
b: "5ac635d8 aa3a93e7 b3ebbd55 769886bc 651d06b0 cc53b0f6 3bce3c3e 27d2604b",
n: "ffffffff 00000000 ffffffff ffffffff bce6faad a7179e84 f3b9cac2 fc632551",
hash: a.sha256,
gRed: !1,
g: [ "6b17d1f2 e12c4247 f8bce6e5 63a440f2 77037d81 2deb33a0 f4a13945 d898c296", "4fe342e2 fe1a7f9b 8ee7eb4a 7c0f9e16 2bce3357 6b315ece cbb64068 37bf51f5" ]
});
f("p384", {
type: "short",
prime: null,
p: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe ffffffff 00000000 00000000 ffffffff",
a: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe ffffffff 00000000 00000000 fffffffc",
b: "b3312fa7 e23ee7e4 988e056b e3f82d19 181d9c6e fe814112 0314088f 5013875a c656398d 8a2ed19d 2a85c8ed d3ec2aef",
n: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff c7634d81 f4372ddf 581a0db2 48b0a77a ecec196a ccc52973",
hash: a.sha384,
gRed: !1,
g: [ "aa87ca22 be8b0537 8eb1c71e f320ad74 6e1d3b62 8ba79b98 59f741e0 82542a38 5502f25d bf55296c 3a545e38 72760ab7", "3617de4a 96262c6f 5d9e98bf 9292dc29 f8f41dbd 289a147c e9da3113 b5f0b8c0 0a60b1ce 1d7e819d 7a431d7c 90ea0e5f" ]
});
f("p521", {
type: "short",
prime: null,
p: "000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff",
a: "000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffc",
b: "00000051 953eb961 8e1c9a1f 929a21a0 b68540ee a2da725b 99b315f3 b8b48991 8ef109e1 56193951 ec7e937b 1652c0bd 3bb1bf07 3573df88 3d2c34f1 ef451fd4 6b503f00",
n: "000001ff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffa 51868783 bf2f966b 7fcc0148 f709a5d0 3bb5c9b8 899c47ae bb6fb71e 91386409",
hash: a.sha512,
gRed: !1,
g: [ "000000c6 858e06b7 0404e9cd 9e3ecb66 2395b442 9c648139 053fb521 f828af60 6b4d3dba a14b5e77 efe75928 fe1dc127 a2ffa8de 3348b3c1 856a429b f97e7e31 c2e5bd66", "00000118 39296a78 9a3bc004 5c8a5fb4 2c7d1bd9 98f54449 579b4468 17afbd17 273e662c 97ee7299 5ef42640 c550b901 3fad0761 353c7086 a272c240 88be9476 9fd16650" ]
});
f("curve25519", {
type: "mont",
prime: "p25519",
p: "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed",
a: "76d06",
b: "1",
n: "1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed",
hash: a.sha256,
gRed: !1,
g: [ "9" ]
});
f("ed25519", {
type: "edwards",
prime: "p25519",
p: "7fffffffffffffff ffffffffffffffff ffffffffffffffff ffffffffffffffed",
a: "-1",
c: "1",
d: "52036cee2b6ffe73 8cc740797779e898 00700a4d4141d8ab 75eb4dca135978a3",
n: "1000000000000000 0000000000000000 14def9dea2f79cd6 5812631a5cf5d3ed",
hash: a.sha256,
gRed: !1,
g: [ "216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51a", "6666666666666666666666666666666666666666666666666666666666666658" ]
});
try {
r = e("./precomputed/secp256k1");
} catch (e) {
r = void 0;
}
f("secp256k1", {
type: "short",
prime: "k256",
p: "ffffffff ffffffff ffffffff ffffffff ffffffff ffffffff fffffffe fffffc2f",
a: "0",
b: "7",
n: "ffffffff ffffffff ffffffff fffffffe baaedce6 af48a03b bfd25e8c d0364141",
h: "1",
hash: a.sha256,
beta: "7ae96a2b657c07106e64479eac3434e99cf0497512f58995c1396c28719501ee",
lambda: "5363ad4cc05c30e0a5261c028812645a122e22ea20816678df02967c1b23bd72",
basis: [ {
a: "3086d221a7d46bcde86c90e49284eb15",
b: "-e4437ed6010e88286f547fa90abfe4c3"
}, {
a: "114ca50f7a8e2f3f657c1108d9d44cfd8",
b: "3086d221a7d46bcde86c90e49284eb15"
} ],
gRed: !1,
g: [ "79be667ef9dcbbac55a06295ce870b07029bfcdb2dce28d959f2815b16f81798", "483ada7726a3c4655da4fbfc0e1108a8fd17b448a68554199c47d08ffb10d4b8", r ]
});
}, {
"./curve": 90,
"./precomputed/secp256k1": 100,
"./utils": 101,
"hash.js": 124
} ],
94: [ function(e, t) {
"use strict";
var i = e("bn.js"), r = e("hmac-drbg"), n = e("../utils"), a = e("../curves"), s = e("brorand"), o = n.assert, c = e("./key"), f = e("./signature");
function h(e) {
if (!(this instanceof h)) return new h(e);
if ("string" == typeof e) {
o(Object.prototype.hasOwnProperty.call(a, e), "Unknown curve " + e);
e = a[e];
}
e instanceof a.PresetCurve && (e = {
curve: e
});
this.curve = e.curve.curve;
this.n = this.curve.n;
this.nh = this.n.ushrn(1);
this.g = this.curve.g;
this.g = e.curve.g;
this.g.precompute(e.curve.n.bitLength() + 1);
this.hash = e.hash || e.curve.hash;
}
t.exports = h;
h.prototype.keyPair = function(e) {
return new c(this, e);
};
h.prototype.keyFromPrivate = function(e, t) {
return c.fromPrivate(this, e, t);
};
h.prototype.keyFromPublic = function(e, t) {
return c.fromPublic(this, e, t);
};
h.prototype.genKeyPair = function(e) {
e || (e = {});
for (var t = new r({
hash: this.hash,
pers: e.pers,
persEnc: e.persEnc || "utf8",
entropy: e.entropy || s(this.hash.hmacStrength),
entropyEnc: e.entropy && e.entropyEnc || "utf8",
nonce: this.n.toArray()
}), n = this.n.byteLength(), a = this.n.sub(new i(2)); ;) {
var o = new i(t.generate(n));
if (!(o.cmp(a) > 0)) {
o.iaddn(1);
return this.keyFromPrivate(o);
}
}
};
h.prototype._truncateToN = function(e, t) {
var i = 8 * e.byteLength() - this.n.bitLength();
i > 0 && (e = e.ushrn(i));
return !t && e.cmp(this.n) >= 0 ? e.sub(this.n) : e;
};
h.prototype.sign = function(e, t, n, a) {
if ("object" == typeof n) {
a = n;
n = null;
}
a || (a = {});
t = this.keyFromPrivate(t, n);
e = this._truncateToN(new i(e, 16));
for (var s = this.n.byteLength(), o = t.getPrivate().toArray("be", s), c = e.toArray("be", s), h = new r({
hash: this.hash,
entropy: o,
nonce: c,
pers: a.pers,
persEnc: a.persEnc || "utf8"
}), u = this.n.sub(new i(1)), d = 0; ;d++) {
var l = a.k ? a.k(d) : new i(h.generate(this.n.byteLength()));
if (!((l = this._truncateToN(l, !0)).cmpn(1) <= 0 || l.cmp(u) >= 0)) {
var p = this.g.mul(l);
if (!p.isInfinity()) {
var b = p.getX(), g = b.umod(this.n);
if (0 !== g.cmpn(0)) {
var m = l.invm(this.n).mul(g.mul(t.getPrivate()).iadd(e));
if (0 !== (m = m.umod(this.n)).cmpn(0)) {
var v = (p.getY().isOdd() ? 1 : 0) | (0 !== b.cmp(g) ? 2 : 0);
if (a.canonical && m.cmp(this.nh) > 0) {
m = this.n.sub(m);
v ^= 1;
}
return new f({
r: g,
s: m,
recoveryParam: v
});
}
}
}
}
}
};
h.prototype.verify = function(e, t, r, n) {
e = this._truncateToN(new i(e, 16));
r = this.keyFromPublic(r, n);
var a = (t = new f(t, "hex")).r, s = t.s;
if (a.cmpn(1) < 0 || a.cmp(this.n) >= 0) return !1;
if (s.cmpn(1) < 0 || s.cmp(this.n) >= 0) return !1;
var o, c = s.invm(this.n), h = c.mul(e).umod(this.n), u = c.mul(a).umod(this.n);
return this.curve._maxwellTrick ? !(o = this.g.jmulAdd(h, r.getPublic(), u)).isInfinity() && o.eqXToP(a) : !(o = this.g.mulAdd(h, r.getPublic(), u)).isInfinity() && 0 === o.getX().umod(this.n).cmp(a);
};
h.prototype.recoverPubKey = function(e, t, r, n) {
o((3 & r) === r, "The recovery param is more than two bits");
t = new f(t, n);
var a = this.n, s = new i(e), c = t.r, h = t.s, u = 1 & r, d = r >> 1;
if (c.cmp(this.curve.p.umod(this.curve.n)) >= 0 && d) throw new Error("Unable to find sencond key candinate");
c = d ? this.curve.pointFromX(c.add(this.curve.n), u) : this.curve.pointFromX(c, u);
var l = t.r.invm(a), p = a.sub(s).mul(l).umod(a), b = h.mul(l).umod(a);
return this.g.mulAdd(p, c, b);
};
h.prototype.getKeyRecoveryParam = function(e, t, i, r) {
if (null !== (t = new f(t, r)).recoveryParam) return t.recoveryParam;
for (var n = 0; n < 4; n++) {
var a;
try {
a = this.recoverPubKey(e, t, n);
} catch (e) {
continue;
}
if (a.eq(i)) return n;
}
throw new Error("Unable to find valid recovery factor");
};
}, {
"../curves": 93,
"../utils": 101,
"./key": 95,
"./signature": 96,
"bn.js": 102,
brorand: 18,
"hmac-drbg": 136
} ],
95: [ function(e, t) {
"use strict";
var i = e("bn.js"), r = e("../utils").assert;
function n(e, t) {
this.ec = e;
this.priv = null;
this.pub = null;
t.priv && this._importPrivate(t.priv, t.privEnc);
t.pub && this._importPublic(t.pub, t.pubEnc);
}
t.exports = n;
n.fromPublic = function(e, t, i) {
return t instanceof n ? t : new n(e, {
pub: t,
pubEnc: i
});
};
n.fromPrivate = function(e, t, i) {
return t instanceof n ? t : new n(e, {
priv: t,
privEnc: i
});
};
n.prototype.validate = function() {
var e = this.getPublic();
return e.isInfinity() ? {
result: !1,
reason: "Invalid public key"
} : e.validate() ? e.mul(this.ec.curve.n).isInfinity() ? {
result: !0,
reason: null
} : {
result: !1,
reason: "Public key * N != O"
} : {
result: !1,
reason: "Public key is not a point"
};
};
n.prototype.getPublic = function(e, t) {
if ("string" == typeof e) {
t = e;
e = null;
}
this.pub || (this.pub = this.ec.g.mul(this.priv));
return t ? this.pub.encode(t, e) : this.pub;
};
n.prototype.getPrivate = function(e) {
return "hex" === e ? this.priv.toString(16, 2) : this.priv;
};
n.prototype._importPrivate = function(e, t) {
this.priv = new i(e, t || 16);
this.priv = this.priv.umod(this.ec.curve.n);
};
n.prototype._importPublic = function(e, t) {
if (e.x || e.y) {
"mont" === this.ec.curve.type ? r(e.x, "Need x coordinate") : "short" !== this.ec.curve.type && "edwards" !== this.ec.curve.type || r(e.x && e.y, "Need both x and y coordinate");
this.pub = this.ec.curve.point(e.x, e.y);
} else this.pub = this.ec.curve.decodePoint(e, t);
};
n.prototype.derive = function(e) {
e.validate() || r(e.validate(), "public point not validated");
return e.mul(this.priv).getX();
};
n.prototype.sign = function(e, t, i) {
return this.ec.sign(e, this, t, i);
};
n.prototype.verify = function(e, t) {
return this.ec.verify(e, t, this);
};
n.prototype.inspect = function() {
return "<Key priv: " + (this.priv && this.priv.toString(16, 2)) + " pub: " + (this.pub && this.pub.inspect()) + " >";
};
}, {
"../utils": 101,
"bn.js": 102
} ],
96: [ function(e, t) {
"use strict";
var i = e("bn.js"), r = e("../utils"), n = r.assert;
function a(e, t) {
if (e instanceof a) return e;
if (!this._importDER(e, t)) {
n(e.r && e.s, "Signature without r or s");
this.r = new i(e.r, 16);
this.s = new i(e.s, 16);
void 0 === e.recoveryParam ? this.recoveryParam = null : this.recoveryParam = e.recoveryParam;
}
}
t.exports = a;
function s() {
this.place = 0;
}
function o(e, t) {
var i = e[t.place++];
if (!(128 & i)) return i;
var r = 15 & i;
if (0 === r || r > 4) return !1;
for (var n = 0, a = 0, s = t.place; a < r; a++, s++) {
n <<= 8;
n |= e[s];
n >>>= 0;
}
if (n <= 127) return !1;
t.place = s;
return n;
}
function c(e) {
for (var t = 0, i = e.length - 1; !e[t] && !(128 & e[t + 1]) && t < i; ) t++;
return 0 === t ? e : e.slice(t);
}
a.prototype._importDER = function(e, t) {
e = r.toArray(e, t);
var n = new s();
if (48 !== e[n.place++]) return !1;
var a = o(e, n);
if (!1 === a) return !1;
if (a + n.place !== e.length) return !1;
if (2 !== e[n.place++]) return !1;
var c = o(e, n);
if (!1 === c) return !1;
var f = e.slice(n.place, c + n.place);
n.place += c;
if (2 !== e[n.place++]) return !1;
var h = o(e, n);
if (!1 === h) return !1;
if (e.length !== h + n.place) return !1;
var u = e.slice(n.place, h + n.place);
if (0 === f[0]) {
if (!(128 & f[1])) return !1;
f = f.slice(1);
}
if (0 === u[0]) {
if (!(128 & u[1])) return !1;
u = u.slice(1);
}
this.r = new i(f);
this.s = new i(u);
this.recoveryParam = null;
return !0;
};
function f(e, t) {
if (t < 128) e.push(t); else {
var i = 1 + (Math.log(t) / Math.LN2 >>> 3);
e.push(128 | i);
for (;--i; ) e.push(t >>> (i << 3) & 255);
e.push(t);
}
}
a.prototype.toDER = function(e) {
var t = this.r.toArray(), i = this.s.toArray();
128 & t[0] && (t = [ 0 ].concat(t));
128 & i[0] && (i = [ 0 ].concat(i));
t = c(t);
i = c(i);
for (;!(i[0] || 128 & i[1]); ) i = i.slice(1);
var n = [ 2 ];
f(n, t.length);
(n = n.concat(t)).push(2);
f(n, i.length);
var a = n.concat(i), s = [ 48 ];
f(s, a.length);
s = s.concat(a);
return r.encode(s, e);
};
}, {
"../utils": 101,
"bn.js": 102
} ],
97: [ function(e, t) {
"use strict";
var i = e("hash.js"), r = e("../curves"), n = e("../utils"), a = n.assert, s = n.parseBytes, o = e("./key"), c = e("./signature");
function f(e) {
a("ed25519" === e, "only tested with ed25519 so far");
if (!(this instanceof f)) return new f(e);
e = r[e].curve;
this.curve = e;
this.g = e.g;
this.g.precompute(e.n.bitLength() + 1);
this.pointClass = e.point().constructor;
this.encodingLength = Math.ceil(e.n.bitLength() / 8);
this.hash = i.sha512;
}
t.exports = f;
f.prototype.sign = function(e, t) {
e = s(e);
var i = this.keyFromSecret(t), r = this.hashInt(i.messagePrefix(), e), n = this.g.mul(r), a = this.encodePoint(n), o = this.hashInt(a, i.pubBytes(), e).mul(i.priv()), c = r.add(o).umod(this.curve.n);
return this.makeSignature({
R: n,
S: c,
Rencoded: a
});
};
f.prototype.verify = function(e, t, i) {
e = s(e);
t = this.makeSignature(t);
var r = this.keyFromPublic(i), n = this.hashInt(t.Rencoded(), r.pubBytes(), e), a = this.g.mul(t.S());
return t.R().add(r.pub().mul(n)).eq(a);
};
f.prototype.hashInt = function() {
for (var e = this.hash(), t = 0; t < arguments.length; t++) e.update(arguments[t]);
return n.intFromLE(e.digest()).umod(this.curve.n);
};
f.prototype.keyFromPublic = function(e) {
return o.fromPublic(this, e);
};
f.prototype.keyFromSecret = function(e) {
return o.fromSecret(this, e);
};
f.prototype.makeSignature = function(e) {
return e instanceof c ? e : new c(this, e);
};
f.prototype.encodePoint = function(e) {
var t = e.getY().toArray("le", this.encodingLength);
t[this.encodingLength - 1] |= e.getX().isOdd() ? 128 : 0;
return t;
};
f.prototype.decodePoint = function(e) {
var t = (e = n.parseBytes(e)).length - 1, i = e.slice(0, t).concat(-129 & e[t]), r = 0 != (128 & e[t]), a = n.intFromLE(i);
return this.curve.pointFromY(a, r);
};
f.prototype.encodeInt = function(e) {
return e.toArray("le", this.encodingLength);
};
f.prototype.decodeInt = function(e) {
return n.intFromLE(e);
};
f.prototype.isPoint = function(e) {
return e instanceof this.pointClass;
};
}, {
"../curves": 93,
"../utils": 101,
"./key": 98,
"./signature": 99,
"hash.js": 124
} ],
98: [ function(e, t) {
"use strict";
var i = e("../utils"), r = i.assert, n = i.parseBytes, a = i.cachedProperty;
function s(e, t) {
this.eddsa = e;
this._secret = n(t.secret);
e.isPoint(t.pub) ? this._pub = t.pub : this._pubBytes = n(t.pub);
}
s.fromPublic = function(e, t) {
return t instanceof s ? t : new s(e, {
pub: t
});
};
s.fromSecret = function(e, t) {
return t instanceof s ? t : new s(e, {
secret: t
});
};
s.prototype.secret = function() {
return this._secret;
};
a(s, "pubBytes", function() {
return this.eddsa.encodePoint(this.pub());
});
a(s, "pub", function() {
return this._pubBytes ? this.eddsa.decodePoint(this._pubBytes) : this.eddsa.g.mul(this.priv());
});
a(s, "privBytes", function() {
var e = this.eddsa, t = this.hash(), i = e.encodingLength - 1, r = t.slice(0, e.encodingLength);
r[0] &= 248;
r[i] &= 127;
r[i] |= 64;
return r;
});
a(s, "priv", function() {
return this.eddsa.decodeInt(this.privBytes());
});
a(s, "hash", function() {
return this.eddsa.hash().update(this.secret()).digest();
});
a(s, "messagePrefix", function() {
return this.hash().slice(this.eddsa.encodingLength);
});
s.prototype.sign = function(e) {
r(this._secret, "KeyPair can only verify");
return this.eddsa.sign(e, this);
};
s.prototype.verify = function(e, t) {
return this.eddsa.verify(e, t, this);
};
s.prototype.getSecret = function(e) {
r(this._secret, "KeyPair is public only");
return i.encode(this.secret(), e);
};
s.prototype.getPublic = function(e) {
return i.encode(this.pubBytes(), e);
};
t.exports = s;
}, {
"../utils": 101
} ],
99: [ function(e, t) {
"use strict";
var i = e("bn.js"), r = e("../utils"), n = r.assert, a = r.cachedProperty, s = r.parseBytes;
function o(e, t) {
this.eddsa = e;
"object" != typeof t && (t = s(t));
Array.isArray(t) && (t = {
R: t.slice(0, e.encodingLength),
S: t.slice(e.encodingLength)
});
n(t.R && t.S, "Signature without R or S");
e.isPoint(t.R) && (this._R = t.R);
t.S instanceof i && (this._S = t.S);
this._Rencoded = Array.isArray(t.R) ? t.R : t.Rencoded;
this._Sencoded = Array.isArray(t.S) ? t.S : t.Sencoded;
}
a(o, "S", function() {
return this.eddsa.decodeInt(this.Sencoded());
});
a(o, "R", function() {
return this.eddsa.decodePoint(this.Rencoded());
});
a(o, "Rencoded", function() {
return this.eddsa.encodePoint(this.R());
});
a(o, "Sencoded", function() {
return this.eddsa.encodeInt(this.S());
});
o.prototype.toBytes = function() {
return this.Rencoded().concat(this.Sencoded());
};
o.prototype.toHex = function() {
return r.encode(this.toBytes(), "hex").toUpperCase();
};
t.exports = o;
}, {
"../utils": 101,
"bn.js": 102
} ],
100: [ function(e, t) {
t.exports = {
doubles: {
step: 4,
points: [ [ "e60fce93b59e9ec53011aabc21c23e97b2a31369b87a5ae9c44ee89e2a6dec0a", "f7e3507399e595929db99f34f57937101296891e44d23f0be1f32cce69616821" ], [ "8282263212c609d9ea2a6e3e172de238d8c39cabd5ac1ca10646e23fd5f51508", "11f8a8098557dfe45e8256e830b60ace62d613ac2f7b17bed31b6eaff6e26caf" ], [ "175e159f728b865a72f99cc6c6fc846de0b93833fd2222ed73fce5b551e5b739", "d3506e0d9e3c79eba4ef97a51ff71f5eacb5955add24345c6efa6ffee9fed695" ], [ "363d90d447b00c9c99ceac05b6262ee053441c7e55552ffe526bad8f83ff4640", "4e273adfc732221953b445397f3363145b9a89008199ecb62003c7f3bee9de9" ], [ "8b4b5f165df3c2be8c6244b5b745638843e4a781a15bcd1b69f79a55dffdf80c", "4aad0a6f68d308b4b3fbd7813ab0da04f9e336546162ee56b3eff0c65fd4fd36" ], [ "723cbaa6e5db996d6bf771c00bd548c7b700dbffa6c0e77bcb6115925232fcda", "96e867b5595cc498a921137488824d6e2660a0653779494801dc069d9eb39f5f" ], [ "eebfa4d493bebf98ba5feec812c2d3b50947961237a919839a533eca0e7dd7fa", "5d9a8ca3970ef0f269ee7edaf178089d9ae4cdc3a711f712ddfd4fdae1de8999" ], [ "100f44da696e71672791d0a09b7bde459f1215a29b3c03bfefd7835b39a48db0", "cdd9e13192a00b772ec8f3300c090666b7ff4a18ff5195ac0fbd5cd62bc65a09" ], [ "e1031be262c7ed1b1dc9227a4a04c017a77f8d4464f3b3852c8acde6e534fd2d", "9d7061928940405e6bb6a4176597535af292dd419e1ced79a44f18f29456a00d" ], [ "feea6cae46d55b530ac2839f143bd7ec5cf8b266a41d6af52d5e688d9094696d", "e57c6b6c97dce1bab06e4e12bf3ecd5c981c8957cc41442d3155debf18090088" ], [ "da67a91d91049cdcb367be4be6ffca3cfeed657d808583de33fa978bc1ec6cb1", "9bacaa35481642bc41f463f7ec9780e5dec7adc508f740a17e9ea8e27a68be1d" ], [ "53904faa0b334cdda6e000935ef22151ec08d0f7bb11069f57545ccc1a37b7c0", "5bc087d0bc80106d88c9eccac20d3c1c13999981e14434699dcb096b022771c8" ], [ "8e7bcd0bd35983a7719cca7764ca906779b53a043a9b8bcaeff959f43ad86047", "10b7770b2a3da4b3940310420ca9514579e88e2e47fd68b3ea10047e8460372a" ], [ "385eed34c1cdff21e6d0818689b81bde71a7f4f18397e6690a841e1599c43862", "283bebc3e8ea23f56701de19e9ebf4576b304eec2086dc8cc0458fe5542e5453" ], [ "6f9d9b803ecf191637c73a4413dfa180fddf84a5947fbc9c606ed86c3fac3a7", "7c80c68e603059ba69b8e2a30e45c4d47ea4dd2f5c281002d86890603a842160" ], [ "3322d401243c4e2582a2147c104d6ecbf774d163db0f5e5313b7e0e742d0e6bd", "56e70797e9664ef5bfb019bc4ddaf9b72805f63ea2873af624f3a2e96c28b2a0" ], [ "85672c7d2de0b7da2bd1770d89665868741b3f9af7643397721d74d28134ab83", "7c481b9b5b43b2eb6374049bfa62c2e5e77f17fcc5298f44c8e3094f790313a6" ], [ "948bf809b1988a46b06c9f1919413b10f9226c60f668832ffd959af60c82a0a", "53a562856dcb6646dc6b74c5d1c3418c6d4dff08c97cd2bed4cb7f88d8c8e589" ], [ "6260ce7f461801c34f067ce0f02873a8f1b0e44dfc69752accecd819f38fd8e8", "bc2da82b6fa5b571a7f09049776a1ef7ecd292238051c198c1a84e95b2b4ae17" ], [ "e5037de0afc1d8d43d8348414bbf4103043ec8f575bfdc432953cc8d2037fa2d", "4571534baa94d3b5f9f98d09fb990bddbd5f5b03ec481f10e0e5dc841d755bda" ], [ "e06372b0f4a207adf5ea905e8f1771b4e7e8dbd1c6a6c5b725866a0ae4fce725", "7a908974bce18cfe12a27bb2ad5a488cd7484a7787104870b27034f94eee31dd" ], [ "213c7a715cd5d45358d0bbf9dc0ce02204b10bdde2a3f58540ad6908d0559754", "4b6dad0b5ae462507013ad06245ba190bb4850f5f36a7eeddff2c27534b458f2" ], [ "4e7c272a7af4b34e8dbb9352a5419a87e2838c70adc62cddf0cc3a3b08fbd53c", "17749c766c9d0b18e16fd09f6def681b530b9614bff7dd33e0b3941817dcaae6" ], [ "fea74e3dbe778b1b10f238ad61686aa5c76e3db2be43057632427e2840fb27b6", "6e0568db9b0b13297cf674deccb6af93126b596b973f7b77701d3db7f23cb96f" ], [ "76e64113f677cf0e10a2570d599968d31544e179b760432952c02a4417bdde39", "c90ddf8dee4e95cf577066d70681f0d35e2a33d2b56d2032b4b1752d1901ac01" ], [ "c738c56b03b2abe1e8281baa743f8f9a8f7cc643df26cbee3ab150242bcbb891", "893fb578951ad2537f718f2eacbfbbbb82314eef7880cfe917e735d9699a84c3" ], [ "d895626548b65b81e264c7637c972877d1d72e5f3a925014372e9f6588f6c14b", "febfaa38f2bc7eae728ec60818c340eb03428d632bb067e179363ed75d7d991f" ], [ "b8da94032a957518eb0f6433571e8761ceffc73693e84edd49150a564f676e03", "2804dfa44805a1e4d7c99cc9762808b092cc584d95ff3b511488e4e74efdf6e7" ], [ "e80fea14441fb33a7d8adab9475d7fab2019effb5156a792f1a11778e3c0df5d", "eed1de7f638e00771e89768ca3ca94472d155e80af322ea9fcb4291b6ac9ec78" ], [ "a301697bdfcd704313ba48e51d567543f2a182031efd6915ddc07bbcc4e16070", "7370f91cfb67e4f5081809fa25d40f9b1735dbf7c0a11a130c0d1a041e177ea1" ], [ "90ad85b389d6b936463f9d0512678de208cc330b11307fffab7ac63e3fb04ed4", "e507a3620a38261affdcbd9427222b839aefabe1582894d991d4d48cb6ef150" ], [ "8f68b9d2f63b5f339239c1ad981f162ee88c5678723ea3351b7b444c9ec4c0da", "662a9f2dba063986de1d90c2b6be215dbbea2cfe95510bfdf23cbf79501fff82" ], [ "e4f3fb0176af85d65ff99ff9198c36091f48e86503681e3e6686fd5053231e11", "1e63633ad0ef4f1c1661a6d0ea02b7286cc7e74ec951d1c9822c38576feb73bc" ], [ "8c00fa9b18ebf331eb961537a45a4266c7034f2f0d4e1d0716fb6eae20eae29e", "efa47267fea521a1a9dc343a3736c974c2fadafa81e36c54e7d2a4c66702414b" ], [ "e7a26ce69dd4829f3e10cec0a9e98ed3143d084f308b92c0997fddfc60cb3e41", "2a758e300fa7984b471b006a1aafbb18d0a6b2c0420e83e20e8a9421cf2cfd51" ], [ "b6459e0ee3662ec8d23540c223bcbdc571cbcb967d79424f3cf29eb3de6b80ef", "67c876d06f3e06de1dadf16e5661db3c4b3ae6d48e35b2ff30bf0b61a71ba45" ], [ "d68a80c8280bb840793234aa118f06231d6f1fc67e73c5a5deda0f5b496943e8", "db8ba9fff4b586d00c4b1f9177b0e28b5b0e7b8f7845295a294c84266b133120" ], [ "324aed7df65c804252dc0270907a30b09612aeb973449cea4095980fc28d3d5d", "648a365774b61f2ff130c0c35aec1f4f19213b0c7e332843967224af96ab7c84" ], [ "4df9c14919cde61f6d51dfdbe5fee5dceec4143ba8d1ca888e8bd373fd054c96", "35ec51092d8728050974c23a1d85d4b5d506cdc288490192ebac06cad10d5d" ], [ "9c3919a84a474870faed8a9c1cc66021523489054d7f0308cbfc99c8ac1f98cd", "ddb84f0f4a4ddd57584f044bf260e641905326f76c64c8e6be7e5e03d4fc599d" ], [ "6057170b1dd12fdf8de05f281d8e06bb91e1493a8b91d4cc5a21382120a959e5", "9a1af0b26a6a4807add9a2daf71df262465152bc3ee24c65e899be932385a2a8" ], [ "a576df8e23a08411421439a4518da31880cef0fba7d4df12b1a6973eecb94266", "40a6bf20e76640b2c92b97afe58cd82c432e10a7f514d9f3ee8be11ae1b28ec8" ], [ "7778a78c28dec3e30a05fe9629de8c38bb30d1f5cf9a3a208f763889be58ad71", "34626d9ab5a5b22ff7098e12f2ff580087b38411ff24ac563b513fc1fd9f43ac" ], [ "928955ee637a84463729fd30e7afd2ed5f96274e5ad7e5cb09eda9c06d903ac", "c25621003d3f42a827b78a13093a95eeac3d26efa8a8d83fc5180e935bcd091f" ], [ "85d0fef3ec6db109399064f3a0e3b2855645b4a907ad354527aae75163d82751", "1f03648413a38c0be29d496e582cf5663e8751e96877331582c237a24eb1f962" ], [ "ff2b0dce97eece97c1c9b6041798b85dfdfb6d8882da20308f5404824526087e", "493d13fef524ba188af4c4dc54d07936c7b7ed6fb90e2ceb2c951e01f0c29907" ], [ "827fbbe4b1e880ea9ed2b2e6301b212b57f1ee148cd6dd28780e5e2cf856e241", "c60f9c923c727b0b71bef2c67d1d12687ff7a63186903166d605b68baec293ec" ], [ "eaa649f21f51bdbae7be4ae34ce6e5217a58fdce7f47f9aa7f3b58fa2120e2b3", "be3279ed5bbbb03ac69a80f89879aa5a01a6b965f13f7e59d47a5305ba5ad93d" ], [ "e4a42d43c5cf169d9391df6decf42ee541b6d8f0c9a137401e23632dda34d24f", "4d9f92e716d1c73526fc99ccfb8ad34ce886eedfa8d8e4f13a7f7131deba9414" ], [ "1ec80fef360cbdd954160fadab352b6b92b53576a88fea4947173b9d4300bf19", "aeefe93756b5340d2f3a4958a7abbf5e0146e77f6295a07b671cdc1cc107cefd" ], [ "146a778c04670c2f91b00af4680dfa8bce3490717d58ba889ddb5928366642be", "b318e0ec3354028add669827f9d4b2870aaa971d2f7e5ed1d0b297483d83efd0" ], [ "fa50c0f61d22e5f07e3acebb1aa07b128d0012209a28b9776d76a8793180eef9", "6b84c6922397eba9b72cd2872281a68a5e683293a57a213b38cd8d7d3f4f2811" ], [ "da1d61d0ca721a11b1a5bf6b7d88e8421a288ab5d5bba5220e53d32b5f067ec2", "8157f55a7c99306c79c0766161c91e2966a73899d279b48a655fba0f1ad836f1" ], [ "a8e282ff0c9706907215ff98e8fd416615311de0446f1e062a73b0610d064e13", "7f97355b8db81c09abfb7f3c5b2515888b679a3e50dd6bd6cef7c73111f4cc0c" ], [ "174a53b9c9a285872d39e56e6913cab15d59b1fa512508c022f382de8319497c", "ccc9dc37abfc9c1657b4155f2c47f9e6646b3a1d8cb9854383da13ac079afa73" ], [ "959396981943785c3d3e57edf5018cdbe039e730e4918b3d884fdff09475b7ba", "2e7e552888c331dd8ba0386a4b9cd6849c653f64c8709385e9b8abf87524f2fd" ], [ "d2a63a50ae401e56d645a1153b109a8fcca0a43d561fba2dbb51340c9d82b151", "e82d86fb6443fcb7565aee58b2948220a70f750af484ca52d4142174dcf89405" ], [ "64587e2335471eb890ee7896d7cfdc866bacbdbd3839317b3436f9b45617e073", "d99fcdd5bf6902e2ae96dd6447c299a185b90a39133aeab358299e5e9faf6589" ], [ "8481bde0e4e4d885b3a546d3e549de042f0aa6cea250e7fd358d6c86dd45e458", "38ee7b8cba5404dd84a25bf39cecb2ca900a79c42b262e556d64b1b59779057e" ], [ "13464a57a78102aa62b6979ae817f4637ffcfed3c4b1ce30bcd6303f6caf666b", "69be159004614580ef7e433453ccb0ca48f300a81d0942e13f495a907f6ecc27" ], [ "bc4a9df5b713fe2e9aef430bcc1dc97a0cd9ccede2f28588cada3a0d2d83f366", "d3a81ca6e785c06383937adf4b798caa6e8a9fbfa547b16d758d666581f33c1" ], [ "8c28a97bf8298bc0d23d8c749452a32e694b65e30a9472a3954ab30fe5324caa", "40a30463a3305193378fedf31f7cc0eb7ae784f0451cb9459e71dc73cbef9482" ], [ "8ea9666139527a8c1dd94ce4f071fd23c8b350c5a4bb33748c4ba111faccae0", "620efabbc8ee2782e24e7c0cfb95c5d735b783be9cf0f8e955af34a30e62b945" ], [ "dd3625faef5ba06074669716bbd3788d89bdde815959968092f76cc4eb9a9787", "7a188fa3520e30d461da2501045731ca941461982883395937f68d00c644a573" ], [ "f710d79d9eb962297e4f6232b40e8f7feb2bc63814614d692c12de752408221e", "ea98e67232d3b3295d3b535532115ccac8612c721851617526ae47a9c77bfc82" ] ]
},
naf: {
wnd: 7,
points: [ [ "f9308a019258c31049344f85f89d5229b531c845836f99b08601f113bce036f9", "388f7b0f632de8140fe337e62a37f3566500a99934c2231b6cb9fd7584b8e672" ], [ "2f8bde4d1a07209355b4a7250a5c5128e88b84bddc619ab7cba8d569b240efe4", "d8ac222636e5e3d6d4dba9dda6c9c426f788271bab0d6840dca87d3aa6ac62d6" ], [ "5cbdf0646e5db4eaa398f365f2ea7a0e3d419b7e0330e39ce92bddedcac4f9bc", "6aebca40ba255960a3178d6d861a54dba813d0b813fde7b5a5082628087264da" ], [ "acd484e2f0c7f65309ad178a9f559abde09796974c57e714c35f110dfc27ccbe", "cc338921b0a7d9fd64380971763b61e9add888a4375f8e0f05cc262ac64f9c37" ], [ "774ae7f858a9411e5ef4246b70c65aac5649980be5c17891bbec17895da008cb", "d984a032eb6b5e190243dd56d7b7b365372db1e2dff9d6a8301d74c9c953c61b" ], [ "f28773c2d975288bc7d1d205c3748651b075fbc6610e58cddeeddf8f19405aa8", "ab0902e8d880a89758212eb65cdaf473a1a06da521fa91f29b5cb52db03ed81" ], [ "d7924d4f7d43ea965a465ae3095ff41131e5946f3c85f79e44adbcf8e27e080e", "581e2872a86c72a683842ec228cc6defea40af2bd896d3a5c504dc9ff6a26b58" ], [ "defdea4cdb677750a420fee807eacf21eb9898ae79b9768766e4faa04a2d4a34", "4211ab0694635168e997b0ead2a93daeced1f4a04a95c0f6cfb199f69e56eb77" ], [ "2b4ea0a797a443d293ef5cff444f4979f06acfebd7e86d277475656138385b6c", "85e89bc037945d93b343083b5a1c86131a01f60c50269763b570c854e5c09b7a" ], [ "352bbf4a4cdd12564f93fa332ce333301d9ad40271f8107181340aef25be59d5", "321eb4075348f534d59c18259dda3e1f4a1b3b2e71b1039c67bd3d8bcf81998c" ], [ "2fa2104d6b38d11b0230010559879124e42ab8dfeff5ff29dc9cdadd4ecacc3f", "2de1068295dd865b64569335bd5dd80181d70ecfc882648423ba76b532b7d67" ], [ "9248279b09b4d68dab21a9b066edda83263c3d84e09572e269ca0cd7f5453714", "73016f7bf234aade5d1aa71bdea2b1ff3fc0de2a887912ffe54a32ce97cb3402" ], [ "daed4f2be3a8bf278e70132fb0beb7522f570e144bf615c07e996d443dee8729", "a69dce4a7d6c98e8d4a1aca87ef8d7003f83c230f3afa726ab40e52290be1c55" ], [ "c44d12c7065d812e8acf28d7cbb19f9011ecd9e9fdf281b0e6a3b5e87d22e7db", "2119a460ce326cdc76c45926c982fdac0e106e861edf61c5a039063f0e0e6482" ], [ "6a245bf6dc698504c89a20cfded60853152b695336c28063b61c65cbd269e6b4", "e022cf42c2bd4a708b3f5126f16a24ad8b33ba48d0423b6efd5e6348100d8a82" ], [ "1697ffa6fd9de627c077e3d2fe541084ce13300b0bec1146f95ae57f0d0bd6a5", "b9c398f186806f5d27561506e4557433a2cf15009e498ae7adee9d63d01b2396" ], [ "605bdb019981718b986d0f07e834cb0d9deb8360ffb7f61df982345ef27a7479", "2972d2de4f8d20681a78d93ec96fe23c26bfae84fb14db43b01e1e9056b8c49" ], [ "62d14dab4150bf497402fdc45a215e10dcb01c354959b10cfe31c7e9d87ff33d", "80fc06bd8cc5b01098088a1950eed0db01aa132967ab472235f5642483b25eaf" ], [ "80c60ad0040f27dade5b4b06c408e56b2c50e9f56b9b8b425e555c2f86308b6f", "1c38303f1cc5c30f26e66bad7fe72f70a65eed4cbe7024eb1aa01f56430bd57a" ], [ "7a9375ad6167ad54aa74c6348cc54d344cc5dc9487d847049d5eabb0fa03c8fb", "d0e3fa9eca8726909559e0d79269046bdc59ea10c70ce2b02d499ec224dc7f7" ], [ "d528ecd9b696b54c907a9ed045447a79bb408ec39b68df504bb51f459bc3ffc9", "eecf41253136e5f99966f21881fd656ebc4345405c520dbc063465b521409933" ], [ "49370a4b5f43412ea25f514e8ecdad05266115e4a7ecb1387231808f8b45963", "758f3f41afd6ed428b3081b0512fd62a54c3f3afbb5b6764b653052a12949c9a" ], [ "77f230936ee88cbbd73df930d64702ef881d811e0e1498e2f1c13eb1fc345d74", "958ef42a7886b6400a08266e9ba1b37896c95330d97077cbbe8eb3c7671c60d6" ], [ "f2dac991cc4ce4b9ea44887e5c7c0bce58c80074ab9d4dbaeb28531b7739f530", "e0dedc9b3b2f8dad4da1f32dec2531df9eb5fbeb0598e4fd1a117dba703a3c37" ], [ "463b3d9f662621fb1b4be8fbbe2520125a216cdfc9dae3debcba4850c690d45b", "5ed430d78c296c3543114306dd8622d7c622e27c970a1de31cb377b01af7307e" ], [ "f16f804244e46e2a09232d4aff3b59976b98fac14328a2d1a32496b49998f247", "cedabd9b82203f7e13d206fcdf4e33d92a6c53c26e5cce26d6579962c4e31df6" ], [ "caf754272dc84563b0352b7a14311af55d245315ace27c65369e15f7151d41d1", "cb474660ef35f5f2a41b643fa5e460575f4fa9b7962232a5c32f908318a04476" ], [ "2600ca4b282cb986f85d0f1709979d8b44a09c07cb86d7c124497bc86f082120", "4119b88753c15bd6a693b03fcddbb45d5ac6be74ab5f0ef44b0be9475a7e4b40" ], [ "7635ca72d7e8432c338ec53cd12220bc01c48685e24f7dc8c602a7746998e435", "91b649609489d613d1d5e590f78e6d74ecfc061d57048bad9e76f302c5b9c61" ], [ "754e3239f325570cdbbf4a87deee8a66b7f2b33479d468fbc1a50743bf56cc18", "673fb86e5bda30fb3cd0ed304ea49a023ee33d0197a695d0c5d98093c536683" ], [ "e3e6bd1071a1e96aff57859c82d570f0330800661d1c952f9fe2694691d9b9e8", "59c9e0bba394e76f40c0aa58379a3cb6a5a2283993e90c4167002af4920e37f5" ], [ "186b483d056a033826ae73d88f732985c4ccb1f32ba35f4b4cc47fdcf04aa6eb", "3b952d32c67cf77e2e17446e204180ab21fb8090895138b4a4a797f86e80888b" ], [ "df9d70a6b9876ce544c98561f4be4f725442e6d2b737d9c91a8321724ce0963f", "55eb2dafd84d6ccd5f862b785dc39d4ab157222720ef9da217b8c45cf2ba2417" ], [ "5edd5cc23c51e87a497ca815d5dce0f8ab52554f849ed8995de64c5f34ce7143", "efae9c8dbc14130661e8cec030c89ad0c13c66c0d17a2905cdc706ab7399a868" ], [ "290798c2b6476830da12fe02287e9e777aa3fba1c355b17a722d362f84614fba", "e38da76dcd440621988d00bcf79af25d5b29c094db2a23146d003afd41943e7a" ], [ "af3c423a95d9f5b3054754efa150ac39cd29552fe360257362dfdecef4053b45", "f98a3fd831eb2b749a93b0e6f35cfb40c8cd5aa667a15581bc2feded498fd9c6" ], [ "766dbb24d134e745cccaa28c99bf274906bb66b26dcf98df8d2fed50d884249a", "744b1152eacbe5e38dcc887980da38b897584a65fa06cedd2c924f97cbac5996" ], [ "59dbf46f8c94759ba21277c33784f41645f7b44f6c596a58ce92e666191abe3e", "c534ad44175fbc300f4ea6ce648309a042ce739a7919798cd85e216c4a307f6e" ], [ "f13ada95103c4537305e691e74e9a4a8dd647e711a95e73cb62dc6018cfd87b8", "e13817b44ee14de663bf4bc808341f326949e21a6a75c2570778419bdaf5733d" ], [ "7754b4fa0e8aced06d4167a2c59cca4cda1869c06ebadfb6488550015a88522c", "30e93e864e669d82224b967c3020b8fa8d1e4e350b6cbcc537a48b57841163a2" ], [ "948dcadf5990e048aa3874d46abef9d701858f95de8041d2a6828c99e2262519", "e491a42537f6e597d5d28a3224b1bc25df9154efbd2ef1d2cbba2cae5347d57e" ], [ "7962414450c76c1689c7b48f8202ec37fb224cf5ac0bfa1570328a8a3d7c77ab", "100b610ec4ffb4760d5c1fc133ef6f6b12507a051f04ac5760afa5b29db83437" ], [ "3514087834964b54b15b160644d915485a16977225b8847bb0dd085137ec47ca", "ef0afbb2056205448e1652c48e8127fc6039e77c15c2378b7e7d15a0de293311" ], [ "d3cc30ad6b483e4bc79ce2c9dd8bc54993e947eb8df787b442943d3f7b527eaf", "8b378a22d827278d89c5e9be8f9508ae3c2ad46290358630afb34db04eede0a4" ], [ "1624d84780732860ce1c78fcbfefe08b2b29823db913f6493975ba0ff4847610", "68651cf9b6da903e0914448c6cd9d4ca896878f5282be4c8cc06e2a404078575" ], [ "733ce80da955a8a26902c95633e62a985192474b5af207da6df7b4fd5fc61cd4", "f5435a2bd2badf7d485a4d8b8db9fcce3e1ef8e0201e4578c54673bc1dc5ea1d" ], [ "15d9441254945064cf1a1c33bbd3b49f8966c5092171e699ef258dfab81c045c", "d56eb30b69463e7234f5137b73b84177434800bacebfc685fc37bbe9efe4070d" ], [ "a1d0fcf2ec9de675b612136e5ce70d271c21417c9d2b8aaaac138599d0717940", "edd77f50bcb5a3cab2e90737309667f2641462a54070f3d519212d39c197a629" ], [ "e22fbe15c0af8ccc5780c0735f84dbe9a790badee8245c06c7ca37331cb36980", "a855babad5cd60c88b430a69f53a1a7a38289154964799be43d06d77d31da06" ], [ "311091dd9860e8e20ee13473c1155f5f69635e394704eaa74009452246cfa9b3", "66db656f87d1f04fffd1f04788c06830871ec5a64feee685bd80f0b1286d8374" ], [ "34c1fd04d301be89b31c0442d3e6ac24883928b45a9340781867d4232ec2dbdf", "9414685e97b1b5954bd46f730174136d57f1ceeb487443dc5321857ba73abee" ], [ "f219ea5d6b54701c1c14de5b557eb42a8d13f3abbcd08affcc2a5e6b049b8d63", "4cb95957e83d40b0f73af4544cccf6b1f4b08d3c07b27fb8d8c2962a400766d1" ], [ "d7b8740f74a8fbaab1f683db8f45de26543a5490bca627087236912469a0b448", "fa77968128d9c92ee1010f337ad4717eff15db5ed3c049b3411e0315eaa4593b" ], [ "32d31c222f8f6f0ef86f7c98d3a3335ead5bcd32abdd94289fe4d3091aa824bf", "5f3032f5892156e39ccd3d7915b9e1da2e6dac9e6f26e961118d14b8462e1661" ], [ "7461f371914ab32671045a155d9831ea8793d77cd59592c4340f86cbc18347b5", "8ec0ba238b96bec0cbdddcae0aa442542eee1ff50c986ea6b39847b3cc092ff6" ], [ "ee079adb1df1860074356a25aa38206a6d716b2c3e67453d287698bad7b2b2d6", "8dc2412aafe3be5c4c5f37e0ecc5f9f6a446989af04c4e25ebaac479ec1c8c1e" ], [ "16ec93e447ec83f0467b18302ee620f7e65de331874c9dc72bfd8616ba9da6b5", "5e4631150e62fb40d0e8c2a7ca5804a39d58186a50e497139626778e25b0674d" ], [ "eaa5f980c245f6f038978290afa70b6bd8855897f98b6aa485b96065d537bd99", "f65f5d3e292c2e0819a528391c994624d784869d7e6ea67fb18041024edc07dc" ], [ "78c9407544ac132692ee1910a02439958ae04877151342ea96c4b6b35a49f51", "f3e0319169eb9b85d5404795539a5e68fa1fbd583c064d2462b675f194a3ddb4" ], [ "494f4be219a1a77016dcd838431aea0001cdc8ae7a6fc688726578d9702857a5", "42242a969283a5f339ba7f075e36ba2af925ce30d767ed6e55f4b031880d562c" ], [ "a598a8030da6d86c6bc7f2f5144ea549d28211ea58faa70ebf4c1e665c1fe9b5", "204b5d6f84822c307e4b4a7140737aec23fc63b65b35f86a10026dbd2d864e6b" ], [ "c41916365abb2b5d09192f5f2dbeafec208f020f12570a184dbadc3e58595997", "4f14351d0087efa49d245b328984989d5caf9450f34bfc0ed16e96b58fa9913" ], [ "841d6063a586fa475a724604da03bc5b92a2e0d2e0a36acfe4c73a5514742881", "73867f59c0659e81904f9a1c7543698e62562d6744c169ce7a36de01a8d6154" ], [ "5e95bb399a6971d376026947f89bde2f282b33810928be4ded112ac4d70e20d5", "39f23f366809085beebfc71181313775a99c9aed7d8ba38b161384c746012865" ], [ "36e4641a53948fd476c39f8a99fd974e5ec07564b5315d8bf99471bca0ef2f66", "d2424b1b1abe4eb8164227b085c9aa9456ea13493fd563e06fd51cf5694c78fc" ], [ "336581ea7bfbbb290c191a2f507a41cf5643842170e914faeab27c2c579f726", "ead12168595fe1be99252129b6e56b3391f7ab1410cd1e0ef3dcdcabd2fda224" ], [ "8ab89816dadfd6b6a1f2634fcf00ec8403781025ed6890c4849742706bd43ede", "6fdcef09f2f6d0a044e654aef624136f503d459c3e89845858a47a9129cdd24e" ], [ "1e33f1a746c9c5778133344d9299fcaa20b0938e8acff2544bb40284b8c5fb94", "60660257dd11b3aa9c8ed618d24edff2306d320f1d03010e33a7d2057f3b3b6" ], [ "85b7c1dcb3cec1b7ee7f30ded79dd20a0ed1f4cc18cbcfcfa410361fd8f08f31", "3d98a9cdd026dd43f39048f25a8847f4fcafad1895d7a633c6fed3c35e999511" ], [ "29df9fbd8d9e46509275f4b125d6d45d7fbe9a3b878a7af872a2800661ac5f51", "b4c4fe99c775a606e2d8862179139ffda61dc861c019e55cd2876eb2a27d84b" ], [ "a0b1cae06b0a847a3fea6e671aaf8adfdfe58ca2f768105c8082b2e449fce252", "ae434102edde0958ec4b19d917a6a28e6b72da1834aff0e650f049503a296cf2" ], [ "4e8ceafb9b3e9a136dc7ff67e840295b499dfb3b2133e4ba113f2e4c0e121e5", "cf2174118c8b6d7a4b48f6d534ce5c79422c086a63460502b827ce62a326683c" ], [ "d24a44e047e19b6f5afb81c7ca2f69080a5076689a010919f42725c2b789a33b", "6fb8d5591b466f8fc63db50f1c0f1c69013f996887b8244d2cdec417afea8fa3" ], [ "ea01606a7a6c9cdd249fdfcfacb99584001edd28abbab77b5104e98e8e3b35d4", "322af4908c7312b0cfbfe369f7a7b3cdb7d4494bc2823700cfd652188a3ea98d" ], [ "af8addbf2b661c8a6c6328655eb96651252007d8c5ea31be4ad196de8ce2131f", "6749e67c029b85f52a034eafd096836b2520818680e26ac8f3dfbcdb71749700" ], [ "e3ae1974566ca06cc516d47e0fb165a674a3dabcfca15e722f0e3450f45889", "2aeabe7e4531510116217f07bf4d07300de97e4874f81f533420a72eeb0bd6a4" ], [ "591ee355313d99721cf6993ffed1e3e301993ff3ed258802075ea8ced397e246", "b0ea558a113c30bea60fc4775460c7901ff0b053d25ca2bdeee98f1a4be5d196" ], [ "11396d55fda54c49f19aa97318d8da61fa8584e47b084945077cf03255b52984", "998c74a8cd45ac01289d5833a7beb4744ff536b01b257be4c5767bea93ea57a4" ], [ "3c5d2a1ba39c5a1790000738c9e0c40b8dcdfd5468754b6405540157e017aa7a", "b2284279995a34e2f9d4de7396fc18b80f9b8b9fdd270f6661f79ca4c81bd257" ], [ "cc8704b8a60a0defa3a99a7299f2e9c3fbc395afb04ac078425ef8a1793cc030", "bdd46039feed17881d1e0862db347f8cf395b74fc4bcdc4e940b74e3ac1f1b13" ], [ "c533e4f7ea8555aacd9777ac5cad29b97dd4defccc53ee7ea204119b2889b197", "6f0a256bc5efdf429a2fb6242f1a43a2d9b925bb4a4b3a26bb8e0f45eb596096" ], [ "c14f8f2ccb27d6f109f6d08d03cc96a69ba8c34eec07bbcf566d48e33da6593", "c359d6923bb398f7fd4473e16fe1c28475b740dd098075e6c0e8649113dc3a38" ], [ "a6cbc3046bc6a450bac24789fa17115a4c9739ed75f8f21ce441f72e0b90e6ef", "21ae7f4680e889bb130619e2c0f95a360ceb573c70603139862afd617fa9b9f" ], [ "347d6d9a02c48927ebfb86c1359b1caf130a3c0267d11ce6344b39f99d43cc38", "60ea7f61a353524d1c987f6ecec92f086d565ab687870cb12689ff1e31c74448" ], [ "da6545d2181db8d983f7dcb375ef5866d47c67b1bf31c8cf855ef7437b72656a", "49b96715ab6878a79e78f07ce5680c5d6673051b4935bd897fea824b77dc208a" ], [ "c40747cc9d012cb1a13b8148309c6de7ec25d6945d657146b9d5994b8feb1111", "5ca560753be2a12fc6de6caf2cb489565db936156b9514e1bb5e83037e0fa2d4" ], [ "4e42c8ec82c99798ccf3a610be870e78338c7f713348bd34c8203ef4037f3502", "7571d74ee5e0fb92a7a8b33a07783341a5492144cc54bcc40a94473693606437" ], [ "3775ab7089bc6af823aba2e1af70b236d251cadb0c86743287522a1b3b0dedea", "be52d107bcfa09d8bcb9736a828cfa7fac8db17bf7a76a2c42ad961409018cf7" ], [ "cee31cbf7e34ec379d94fb814d3d775ad954595d1314ba8846959e3e82f74e26", "8fd64a14c06b589c26b947ae2bcf6bfa0149ef0be14ed4d80f448a01c43b1c6d" ], [ "b4f9eaea09b6917619f6ea6a4eb5464efddb58fd45b1ebefcdc1a01d08b47986", "39e5c9925b5a54b07433a4f18c61726f8bb131c012ca542eb24a8ac07200682a" ], [ "d4263dfc3d2df923a0179a48966d30ce84e2515afc3dccc1b77907792ebcc60e", "62dfaf07a0f78feb30e30d6295853ce189e127760ad6cf7fae164e122a208d54" ], [ "48457524820fa65a4f8d35eb6930857c0032acc0a4a2de422233eeda897612c4", "25a748ab367979d98733c38a1fa1c2e7dc6cc07db2d60a9ae7a76aaa49bd0f77" ], [ "dfeeef1881101f2cb11644f3a2afdfc2045e19919152923f367a1767c11cceda", "ecfb7056cf1de042f9420bab396793c0c390bde74b4bbdff16a83ae09a9a7517" ], [ "6d7ef6b17543f8373c573f44e1f389835d89bcbc6062ced36c82df83b8fae859", "cd450ec335438986dfefa10c57fea9bcc521a0959b2d80bbf74b190dca712d10" ], [ "e75605d59102a5a2684500d3b991f2e3f3c88b93225547035af25af66e04541f", "f5c54754a8f71ee540b9b48728473e314f729ac5308b06938360990e2bfad125" ], [ "eb98660f4c4dfaa06a2be453d5020bc99a0c2e60abe388457dd43fefb1ed620c", "6cb9a8876d9cb8520609af3add26cd20a0a7cd8a9411131ce85f44100099223e" ], [ "13e87b027d8514d35939f2e6892b19922154596941888336dc3563e3b8dba942", "fef5a3c68059a6dec5d624114bf1e91aac2b9da568d6abeb2570d55646b8adf1" ], [ "ee163026e9fd6fe017c38f06a5be6fc125424b371ce2708e7bf4491691e5764a", "1acb250f255dd61c43d94ccc670d0f58f49ae3fa15b96623e5430da0ad6c62b2" ], [ "b268f5ef9ad51e4d78de3a750c2dc89b1e626d43505867999932e5db33af3d80", "5f310d4b3c99b9ebb19f77d41c1dee018cf0d34fd4191614003e945a1216e423" ], [ "ff07f3118a9df035e9fad85eb6c7bfe42b02f01ca99ceea3bf7ffdba93c4750d", "438136d603e858a3a5c440c38eccbaddc1d2942114e2eddd4740d098ced1f0d8" ], [ "8d8b9855c7c052a34146fd20ffb658bea4b9f69e0d825ebec16e8c3ce2b526a1", "cdb559eedc2d79f926baf44fb84ea4d44bcf50fee51d7ceb30e2e7f463036758" ], [ "52db0b5384dfbf05bfa9d472d7ae26dfe4b851ceca91b1eba54263180da32b63", "c3b997d050ee5d423ebaf66a6db9f57b3180c902875679de924b69d84a7b375" ], [ "e62f9490d3d51da6395efd24e80919cc7d0f29c3f3fa48c6fff543becbd43352", "6d89ad7ba4876b0b22c2ca280c682862f342c8591f1daf5170e07bfd9ccafa7d" ], [ "7f30ea2476b399b4957509c88f77d0191afa2ff5cb7b14fd6d8e7d65aaab1193", "ca5ef7d4b231c94c3b15389a5f6311e9daff7bb67b103e9880ef4bff637acaec" ], [ "5098ff1e1d9f14fb46a210fada6c903fef0fb7b4a1dd1d9ac60a0361800b7a00", "9731141d81fc8f8084d37c6e7542006b3ee1b40d60dfe5362a5b132fd17ddc0" ], [ "32b78c7de9ee512a72895be6b9cbefa6e2f3c4ccce445c96b9f2c81e2778ad58", "ee1849f513df71e32efc3896ee28260c73bb80547ae2275ba497237794c8753c" ], [ "e2cb74fddc8e9fbcd076eef2a7c72b0ce37d50f08269dfc074b581550547a4f7", "d3aa2ed71c9dd2247a62df062736eb0baddea9e36122d2be8641abcb005cc4a4" ], [ "8438447566d4d7bedadc299496ab357426009a35f235cb141be0d99cd10ae3a8", "c4e1020916980a4da5d01ac5e6ad330734ef0d7906631c4f2390426b2edd791f" ], [ "4162d488b89402039b584c6fc6c308870587d9c46f660b878ab65c82c711d67e", "67163e903236289f776f22c25fb8a3afc1732f2b84b4e95dbda47ae5a0852649" ], [ "3fad3fa84caf0f34f0f89bfd2dcf54fc175d767aec3e50684f3ba4a4bf5f683d", "cd1bc7cb6cc407bb2f0ca647c718a730cf71872e7d0d2a53fa20efcdfe61826" ], [ "674f2600a3007a00568c1a7ce05d0816c1fb84bf1370798f1c69532faeb1a86b", "299d21f9413f33b3edf43b257004580b70db57da0b182259e09eecc69e0d38a5" ], [ "d32f4da54ade74abb81b815ad1fb3b263d82d6c692714bcff87d29bd5ee9f08f", "f9429e738b8e53b968e99016c059707782e14f4535359d582fc416910b3eea87" ], [ "30e4e670435385556e593657135845d36fbb6931f72b08cb1ed954f1e3ce3ff6", "462f9bce619898638499350113bbc9b10a878d35da70740dc695a559eb88db7b" ], [ "be2062003c51cc3004682904330e4dee7f3dcd10b01e580bf1971b04d4cad297", "62188bc49d61e5428573d48a74e1c655b1c61090905682a0d5558ed72dccb9bc" ], [ "93144423ace3451ed29e0fb9ac2af211cb6e84a601df5993c419859fff5df04a", "7c10dfb164c3425f5c71a3f9d7992038f1065224f72bb9d1d902a6d13037b47c" ], [ "b015f8044f5fcbdcf21ca26d6c34fb8197829205c7b7d2a7cb66418c157b112c", "ab8c1e086d04e813744a655b2df8d5f83b3cdc6faa3088c1d3aea1454e3a1d5f" ], [ "d5e9e1da649d97d89e4868117a465a3a4f8a18de57a140d36b3f2af341a21b52", "4cb04437f391ed73111a13cc1d4dd0db1693465c2240480d8955e8592f27447a" ], [ "d3ae41047dd7ca065dbf8ed77b992439983005cd72e16d6f996a5316d36966bb", "bd1aeb21ad22ebb22a10f0303417c6d964f8cdd7df0aca614b10dc14d125ac46" ], [ "463e2763d885f958fc66cdd22800f0a487197d0a82e377b49f80af87c897b065", "bfefacdb0e5d0fd7df3a311a94de062b26b80c61fbc97508b79992671ef7ca7f" ], [ "7985fdfd127c0567c6f53ec1bb63ec3158e597c40bfe747c83cddfc910641917", "603c12daf3d9862ef2b25fe1de289aed24ed291e0ec6708703a5bd567f32ed03" ], [ "74a1ad6b5f76e39db2dd249410eac7f99e74c59cb83d2d0ed5ff1543da7703e9", "cc6157ef18c9c63cd6193d83631bbea0093e0968942e8c33d5737fd790e0db08" ], [ "30682a50703375f602d416664ba19b7fc9bab42c72747463a71d0896b22f6da3", "553e04f6b018b4fa6c8f39e7f311d3176290d0e0f19ca73f17714d9977a22ff8" ], [ "9e2158f0d7c0d5f26c3791efefa79597654e7a2b2464f52b1ee6c1347769ef57", "712fcdd1b9053f09003a3481fa7762e9ffd7c8ef35a38509e2fbf2629008373" ], [ "176e26989a43c9cfeba4029c202538c28172e566e3c4fce7322857f3be327d66", "ed8cc9d04b29eb877d270b4878dc43c19aefd31f4eee09ee7b47834c1fa4b1c3" ], [ "75d46efea3771e6e68abb89a13ad747ecf1892393dfc4f1b7004788c50374da8", "9852390a99507679fd0b86fd2b39a868d7efc22151346e1a3ca4726586a6bed8" ], [ "809a20c67d64900ffb698c4c825f6d5f2310fb0451c869345b7319f645605721", "9e994980d9917e22b76b061927fa04143d096ccc54963e6a5ebfa5f3f8e286c1" ], [ "1b38903a43f7f114ed4500b4eac7083fdefece1cf29c63528d563446f972c180", "4036edc931a60ae889353f77fd53de4a2708b26b6f5da72ad3394119daf408f9" ] ]
}
};
}, {} ],
101: [ function(e, t, i) {
"use strict";
var r = i, n = e("bn.js"), a = e("minimalistic-assert"), s = e("minimalistic-crypto-utils");
r.assert = a;
r.toArray = s.toArray;
r.zero2 = s.zero2;
r.toHex = s.toHex;
r.encode = s.encode;
r.getNAF = function(e, t, i) {
var r = new Array(Math.max(e.bitLength(), i) + 1);
r.fill(0);
for (var n = 1 << t + 1, a = e.clone(), s = 0; s < r.length; s++) {
var o, c = a.andln(n - 1);
if (a.isOdd()) {
o = c > (n >> 1) - 1 ? (n >> 1) - c : c;
a.isubn(o);
} else o = 0;
r[s] = o;
a.iushrn(1);
}
return r;
};
r.getJSF = function(e, t) {
var i = [ [], [] ];
e = e.clone();
t = t.clone();
for (var r, n = 0, a = 0; e.cmpn(-n) > 0 || t.cmpn(-a) > 0; ) {
var s, o, c = e.andln(3) + n & 3, f = t.andln(3) + a & 3;
3 === c && (c = -1);
3 === f && (f = -1);
s = 0 == (1 & c) ? 0 : 3 != (r = e.andln(7) + n & 7) && 5 !== r || 2 !== f ? c : -c;
i[0].push(s);
o = 0 == (1 & f) ? 0 : 3 != (r = t.andln(7) + a & 7) && 5 !== r || 2 !== c ? f : -f;
i[1].push(o);
2 * n === s + 1 && (n = 1 - n);
2 * a === o + 1 && (a = 1 - a);
e.iushrn(1);
t.iushrn(1);
}
return i;
};
r.cachedProperty = function(e, t, i) {
var r = "_" + t;
e.prototype[t] = function() {
return void 0 !== this[r] ? this[r] : this[r] = i.call(this);
};
};
r.parseBytes = function(e) {
return "string" == typeof e ? r.toArray(e, "hex") : e;
};
r.intFromLE = function(e) {
return new n(e, "hex", "le");
};
}, {
"bn.js": 102,
"minimalistic-assert": 142,
"minimalistic-crypto-utils": 143
} ],
102: [ function(e, t, i) {
arguments[4][15][0].apply(i, arguments);
}, {
buffer: 19,
dup: 15
} ],
103: [ function(e, t) {
t.exports = {
_from: "elliptic@^6.5.3",
_id: "elliptic@6.5.4",
_inBundle: !1,
_integrity: "sha512-iLhC6ULemrljPZb+QutR5TQGB+pdW6KGD5RSegS+8sorOZT+rdQFbsQFJgvN3eRqNALqJer4oQ16YvJHlU8hzQ==",
_location: "/elliptic",
_phantomChildren: {},
_requested: {
type: "range",
registry: !0,
raw: "elliptic@^6.5.3",
name: "elliptic",
escapedName: "elliptic",
rawSpec: "^6.5.3",
saveSpec: null,
fetchSpec: "^6.5.3"
},
_requiredBy: [ "/browserify-sign", "/create-ecdh" ],
_resolved: "https://registry.npmjs.org/elliptic/-/elliptic-6.5.4.tgz",
_shasum: "da37cebd31e79a1367e941b592ed1fbebd58abbb",
_spec: "elliptic@^6.5.3",
_where: "/Users/nantas/fireball-x/fireball_2.4.8/dist/CocosCreator.app/Contents/Resources/app/node_modules/browserify-sign",
author: {
name: "Fedor Indutny",
email: "fedor@indutny.com"
},
bugs: {
url: "https://github.com/indutny/elliptic/issues"
},
bundleDependencies: !1,
dependencies: {
"bn.js": "^4.11.9",
brorand: "^1.1.0",
"hash.js": "^1.0.0",
"hmac-drbg": "^1.0.1",
inherits: "^2.0.4",
"minimalistic-assert": "^1.0.1",
"minimalistic-crypto-utils": "^1.0.1"
},
deprecated: !1,
description: "EC cryptography",
devDependencies: {
brfs: "^2.0.2",
coveralls: "^3.1.0",
eslint: "^7.6.0",
grunt: "^1.2.1",
"grunt-browserify": "^5.3.0",
"grunt-cli": "^1.3.2",
"grunt-contrib-connect": "^3.0.0",
"grunt-contrib-copy": "^1.0.0",
"grunt-contrib-uglify": "^5.0.0",
"grunt-mocha-istanbul": "^5.0.2",
"grunt-saucelabs": "^9.0.1",
istanbul: "^0.4.5",
mocha: "^8.0.1"
},
files: [ "lib" ],
homepage: "https://github.com/indutny/elliptic",
keywords: [ "EC", "Elliptic", "curve", "Cryptography" ],
license: "MIT",
main: "lib/elliptic.js",
name: "elliptic",
repository: {
type: "git",
url: "git+ssh://git@github.com/indutny/elliptic.git"
},
scripts: {
lint: "eslint lib test",
"lint:fix": "npm run lint -- --fix",
test: "npm run lint && npm run unit",
unit: "istanbul test _mocha --reporter=spec test/index.js",
version: "grunt dist && git add dist/"
},
version: "6.5.4"
};
}, {} ],
104: [ function(e, t) {
function i() {
this._events = this._events || {};
this._maxListeners = this._maxListeners || void 0;
}
t.exports = i;
i.EventEmitter = i;
i.prototype._events = void 0;
i.prototype._maxListeners = void 0;
i.defaultMaxListeners = 10;
i.prototype.setMaxListeners = function(e) {
if (!(t = e, "number" == typeof t) || e < 0 || isNaN(e)) throw TypeError("n must be a positive number");
var t;
this._maxListeners = e;
return this;
};
i.prototype.emit = function(e) {
var t, i, s, o, c, f;
this._events || (this._events = {});
if ("error" === e && (!this._events.error || n(this._events.error) && !this._events.error.length)) {
if ((t = arguments[1]) instanceof Error) throw t;
var h = new Error('Uncaught, unspecified "error" event. (' + t + ")");
h.context = t;
throw h;
}
if (a(i = this._events[e])) return !1;
if (r(i)) switch (arguments.length) {
case 1:
i.call(this);
break;

case 2:
i.call(this, arguments[1]);
break;

case 3:
i.call(this, arguments[1], arguments[2]);
break;

default:
o = Array.prototype.slice.call(arguments, 1);
i.apply(this, o);
} else if (n(i)) {
o = Array.prototype.slice.call(arguments, 1);
s = (f = i.slice()).length;
for (c = 0; c < s; c++) f[c].apply(this, o);
}
return !0;
};
i.prototype.addListener = function(e, t) {
var s;
if (!r(t)) throw TypeError("listener must be a function");
this._events || (this._events = {});
this._events.newListener && this.emit("newListener", e, r(t.listener) ? t.listener : t);
this._events[e] ? n(this._events[e]) ? this._events[e].push(t) : this._events[e] = [ this._events[e], t ] : this._events[e] = t;
if (n(this._events[e]) && !this._events[e].warned && (s = a(this._maxListeners) ? i.defaultMaxListeners : this._maxListeners) && s > 0 && this._events[e].length > s) {
this._events[e].warned = !0;
console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.", this._events[e].length);
"function" == typeof console.trace && console.trace();
}
return this;
};
i.prototype.on = i.prototype.addListener;
i.prototype.once = function(e, t) {
if (!r(t)) throw TypeError("listener must be a function");
var i = !1;
function n() {
this.removeListener(e, n);
if (!i) {
i = !0;
t.apply(this, arguments);
}
}
n.listener = t;
this.on(e, n);
return this;
};
i.prototype.removeListener = function(e, t) {
var i, a, s, o;
if (!r(t)) throw TypeError("listener must be a function");
if (!this._events || !this._events[e]) return this;
s = (i = this._events[e]).length;
a = -1;
if (i === t || r(i.listener) && i.listener === t) {
delete this._events[e];
this._events.removeListener && this.emit("removeListener", e, t);
} else if (n(i)) {
for (o = s; o-- > 0; ) if (i[o] === t || i[o].listener && i[o].listener === t) {
a = o;
break;
}
if (a < 0) return this;
if (1 === i.length) {
i.length = 0;
delete this._events[e];
} else i.splice(a, 1);
this._events.removeListener && this.emit("removeListener", e, t);
}
return this;
};
i.prototype.removeAllListeners = function(e) {
var t, i;
if (!this._events) return this;
if (!this._events.removeListener) {
0 === arguments.length ? this._events = {} : this._events[e] && delete this._events[e];
return this;
}
if (0 === arguments.length) {
for (t in this._events) "removeListener" !== t && this.removeAllListeners(t);
this.removeAllListeners("removeListener");
this._events = {};
return this;
}
if (r(i = this._events[e])) this.removeListener(e, i); else if (i) for (;i.length; ) this.removeListener(e, i[i.length - 1]);
delete this._events[e];
return this;
};
i.prototype.listeners = function(e) {
return this._events && this._events[e] ? r(this._events[e]) ? [ this._events[e] ] : this._events[e].slice() : [];
};
i.prototype.listenerCount = function(e) {
if (this._events) {
var t = this._events[e];
if (r(t)) return 1;
if (t) return t.length;
}
return 0;
};
i.listenerCount = function(e, t) {
return e.listenerCount(t);
};
function r(e) {
return "function" == typeof e;
}
function n(e) {
return "object" == typeof e && null !== e;
}
function a(e) {
return void 0 === e;
}
}, {} ],
105: [ function(e, t) {
var i = e("safe-buffer").Buffer, r = e("md5.js");
t.exports = function(e, t, n, a) {
i.isBuffer(e) || (e = i.from(e, "binary"));
if (t) {
i.isBuffer(t) || (t = i.from(t, "binary"));
if (8 !== t.length) throw new RangeError("salt should be Buffer with 8 byte length");
}
for (var s = n / 8, o = i.alloc(s), c = i.alloc(a || 0), f = i.alloc(0); s > 0 || a > 0; ) {
var h = new r();
h.update(f);
h.update(e);
t && h.update(t);
f = h.digest();
var u = 0;
if (s > 0) {
var d = o.length - s;
u = Math.min(s, f.length);
f.copy(o, d, 0, u);
s -= u;
}
if (u < f.length && a > 0) {
var l = c.length - a, p = Math.min(a, f.length - u);
f.copy(c, l, u, u + p);
a -= p;
}
}
f.fill(0);
return {
key: o,
iv: c
};
};
}, {
"md5.js": 139,
"safe-buffer": 182
} ],
106: [ function(e, t) {
"use strict";
var i = e("safe-buffer").Buffer, r = e("readable-stream").Transform;
function n(e, t) {
if (!i.isBuffer(e) && "string" != typeof e) throw new TypeError(t + " must be a string or a buffer");
}
function a(e) {
r.call(this);
this._block = i.allocUnsafe(e);
this._blockSize = e;
this._blockOffset = 0;
this._length = [ 0, 0, 0, 0 ];
this._finalized = !1;
}
e("inherits")(a, r);
a.prototype._transform = function(e, t, i) {
var r = null;
try {
this.update(e, t);
} catch (e) {
r = e;
}
i(r);
};
a.prototype._flush = function(e) {
var t = null;
try {
this.push(this.digest());
} catch (e) {
t = e;
}
e(t);
};
a.prototype.update = function(e, t) {
n(e, "Data");
if (this._finalized) throw new Error("Digest already called");
i.isBuffer(e) || (e = i.from(e, t));
for (var r = this._block, a = 0; this._blockOffset + e.length - a >= this._blockSize; ) {
for (var s = this._blockOffset; s < this._blockSize; ) r[s++] = e[a++];
this._update();
this._blockOffset = 0;
}
for (;a < e.length; ) r[this._blockOffset++] = e[a++];
for (var o = 0, c = 8 * e.length; c > 0; ++o) {
this._length[o] += c;
(c = this._length[o] / 4294967296 | 0) > 0 && (this._length[o] -= 4294967296 * c);
}
return this;
};
a.prototype._update = function() {
throw new Error("_update is not implemented");
};
a.prototype.digest = function(e) {
if (this._finalized) throw new Error("Digest already called");
this._finalized = !0;
var t = this._digest();
void 0 !== e && (t = t.toString(e));
this._block.fill(0);
this._blockOffset = 0;
for (var i = 0; i < 4; ++i) this._length[i] = 0;
return t;
};
a.prototype._digest = function() {
throw new Error("_digest is not implemented");
};
t.exports = a;
}, {
inherits: 138,
"readable-stream": 121,
"safe-buffer": 122
} ],
107: [ function(e, t, i) {
arguments[4][47][0].apply(i, arguments);
}, {
dup: 47
} ],
108: [ function(e, t, i) {
arguments[4][48][0].apply(i, arguments);
}, {
"./_stream_readable": 110,
"./_stream_writable": 112,
_process: 156,
dup: 48,
inherits: 138
} ],
109: [ function(e, t, i) {
arguments[4][49][0].apply(i, arguments);
}, {
"./_stream_transform": 111,
dup: 49,
inherits: 138
} ],
110: [ function(e, t, i) {
arguments[4][50][0].apply(i, arguments);
}, {
"../errors": 107,
"./_stream_duplex": 108,
"./internal/streams/async_iterator": 113,
"./internal/streams/buffer_list": 114,
"./internal/streams/destroy": 115,
"./internal/streams/from": 117,
"./internal/streams/state": 119,
"./internal/streams/stream": 120,
_process: 156,
buffer: 65,
dup: 50,
events: 104,
inherits: 138,
"string_decoder/": 123,
util: 19
} ],
111: [ function(e, t, i) {
arguments[4][51][0].apply(i, arguments);
}, {
"../errors": 107,
"./_stream_duplex": 108,
dup: 51,
inherits: 138
} ],
112: [ function(e, t, i) {
arguments[4][52][0].apply(i, arguments);
}, {
"../errors": 107,
"./_stream_duplex": 108,
"./internal/streams/destroy": 115,
"./internal/streams/state": 119,
"./internal/streams/stream": 120,
_process: 156,
buffer: 65,
dup: 52,
inherits: 138,
"util-deprecate": 194
} ],
113: [ function(e, t, i) {
arguments[4][53][0].apply(i, arguments);
}, {
"./end-of-stream": 116,
_process: 156,
dup: 53
} ],
114: [ function(e, t, i) {
arguments[4][54][0].apply(i, arguments);
}, {
buffer: 65,
dup: 54,
util: 19
} ],
115: [ function(e, t, i) {
arguments[4][55][0].apply(i, arguments);
}, {
_process: 156,
dup: 55
} ],
116: [ function(e, t, i) {
arguments[4][56][0].apply(i, arguments);
}, {
"../../../errors": 107,
dup: 56
} ],
117: [ function(e, t, i) {
arguments[4][57][0].apply(i, arguments);
}, {
dup: 57
} ],
118: [ function(e, t, i) {
arguments[4][58][0].apply(i, arguments);
}, {
"../../../errors": 107,
"./end-of-stream": 116,
dup: 58
} ],
119: [ function(e, t, i) {
arguments[4][59][0].apply(i, arguments);
}, {
"../../../errors": 107,
dup: 59
} ],
120: [ function(e, t, i) {
arguments[4][60][0].apply(i, arguments);
}, {
dup: 60,
events: 104
} ],
121: [ function(e, t, i) {
arguments[4][61][0].apply(i, arguments);
}, {
"./lib/_stream_duplex.js": 108,
"./lib/_stream_passthrough.js": 109,
"./lib/_stream_readable.js": 110,
"./lib/_stream_transform.js": 111,
"./lib/_stream_writable.js": 112,
"./lib/internal/streams/end-of-stream.js": 116,
"./lib/internal/streams/pipeline.js": 118,
dup: 61
} ],
122: [ function(e, t, i) {
arguments[4][62][0].apply(i, arguments);
}, {
buffer: 65,
dup: 62
} ],
123: [ function(e, t, i) {
arguments[4][63][0].apply(i, arguments);
}, {
dup: 63,
"safe-buffer": 122
} ],
124: [ function(e, t, i) {
var r = i;
r.utils = e("./hash/utils");
r.common = e("./hash/common");
r.sha = e("./hash/sha");
r.ripemd = e("./hash/ripemd");
r.hmac = e("./hash/hmac");
r.sha1 = r.sha.sha1;
r.sha256 = r.sha.sha256;
r.sha224 = r.sha.sha224;
r.sha384 = r.sha.sha384;
r.sha512 = r.sha.sha512;
r.ripemd160 = r.ripemd.ripemd160;
}, {
"./hash/common": 125,
"./hash/hmac": 126,
"./hash/ripemd": 127,
"./hash/sha": 128,
"./hash/utils": 135
} ],
125: [ function(e, t, i) {
"use strict";
var r = e("./utils"), n = e("minimalistic-assert");
function a() {
this.pending = null;
this.pendingTotal = 0;
this.blockSize = this.constructor.blockSize;
this.outSize = this.constructor.outSize;
this.hmacStrength = this.constructor.hmacStrength;
this.padLength = this.constructor.padLength / 8;
this.endian = "big";
this._delta8 = this.blockSize / 8;
this._delta32 = this.blockSize / 32;
}
i.BlockHash = a;
a.prototype.update = function(e, t) {
e = r.toArray(e, t);
this.pending ? this.pending = this.pending.concat(e) : this.pending = e;
this.pendingTotal += e.length;
if (this.pending.length >= this._delta8) {
var i = (e = this.pending).length % this._delta8;
this.pending = e.slice(e.length - i, e.length);
0 === this.pending.length && (this.pending = null);
e = r.join32(e, 0, e.length - i, this.endian);
for (var n = 0; n < e.length; n += this._delta32) this._update(e, n, n + this._delta32);
}
return this;
};
a.prototype.digest = function(e) {
this.update(this._pad());
n(null === this.pending);
return this._digest(e);
};
a.prototype._pad = function() {
var e = this.pendingTotal, t = this._delta8, i = t - (e + this.padLength) % t, r = new Array(i + this.padLength);
r[0] = 128;
for (var n = 1; n < i; n++) r[n] = 0;
e <<= 3;
if ("big" === this.endian) {
for (var a = 8; a < this.padLength; a++) r[n++] = 0;
r[n++] = 0;
r[n++] = 0;
r[n++] = 0;
r[n++] = 0;
r[n++] = e >>> 24 & 255;
r[n++] = e >>> 16 & 255;
r[n++] = e >>> 8 & 255;
r[n++] = 255 & e;
} else {
r[n++] = 255 & e;
r[n++] = e >>> 8 & 255;
r[n++] = e >>> 16 & 255;
r[n++] = e >>> 24 & 255;
r[n++] = 0;
r[n++] = 0;
r[n++] = 0;
r[n++] = 0;
for (a = 8; a < this.padLength; a++) r[n++] = 0;
}
return r;
};
}, {
"./utils": 135,
"minimalistic-assert": 142
} ],
126: [ function(e, t) {
"use strict";
var i = e("./utils"), r = e("minimalistic-assert");
function n(e, t, r) {
if (!(this instanceof n)) return new n(e, t, r);
this.Hash = e;
this.blockSize = e.blockSize / 8;
this.outSize = e.outSize / 8;
this.inner = null;
this.outer = null;
this._init(i.toArray(t, r));
}
t.exports = n;
n.prototype._init = function(e) {
e.length > this.blockSize && (e = new this.Hash().update(e).digest());
r(e.length <= this.blockSize);
for (var t = e.length; t < this.blockSize; t++) e.push(0);
for (t = 0; t < e.length; t++) e[t] ^= 54;
this.inner = new this.Hash().update(e);
for (t = 0; t < e.length; t++) e[t] ^= 106;
this.outer = new this.Hash().update(e);
};
n.prototype.update = function(e, t) {
this.inner.update(e, t);
return this;
};
n.prototype.digest = function(e) {
this.outer.update(this.inner.digest());
return this.outer.digest(e);
};
}, {
"./utils": 135,
"minimalistic-assert": 142
} ],
127: [ function(e, t, i) {
"use strict";
var r = e("./utils"), n = e("./common"), a = r.rotl32, s = r.sum32, o = r.sum32_3, c = r.sum32_4, f = n.BlockHash;
function h() {
if (!(this instanceof h)) return new h();
f.call(this);
this.h = [ 1732584193, 4023233417, 2562383102, 271733878, 3285377520 ];
this.endian = "little";
}
r.inherits(h, f);
i.ripemd160 = h;
h.blockSize = 512;
h.outSize = 160;
h.hmacStrength = 192;
h.padLength = 64;
h.prototype._update = function(e, t) {
for (var i = this.h[0], r = this.h[1], n = this.h[2], f = this.h[3], h = this.h[4], v = i, y = r, _ = n, w = f, S = h, k = 0; k < 80; k++) {
var M = s(a(c(i, u(k, r, n, f), e[p[k] + t], d(k)), g[k]), h);
i = h;
h = f;
f = a(n, 10);
n = r;
r = M;
M = s(a(c(v, u(79 - k, y, _, w), e[b[k] + t], l(k)), m[k]), S);
v = S;
S = w;
w = a(_, 10);
_ = y;
y = M;
}
M = o(this.h[1], n, w);
this.h[1] = o(this.h[2], f, S);
this.h[2] = o(this.h[3], h, v);
this.h[3] = o(this.h[4], i, y);
this.h[4] = o(this.h[0], r, _);
this.h[0] = M;
};
h.prototype._digest = function(e) {
return "hex" === e ? r.toHex32(this.h, "little") : r.split32(this.h, "little");
};
function u(e, t, i, r) {
return e <= 15 ? t ^ i ^ r : e <= 31 ? t & i | ~t & r : e <= 47 ? (t | ~i) ^ r : e <= 63 ? t & r | i & ~r : t ^ (i | ~r);
}
function d(e) {
return e <= 15 ? 0 : e <= 31 ? 1518500249 : e <= 47 ? 1859775393 : e <= 63 ? 2400959708 : 2840853838;
}
function l(e) {
return e <= 15 ? 1352829926 : e <= 31 ? 1548603684 : e <= 47 ? 1836072691 : e <= 63 ? 2053994217 : 0;
}
var p = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13 ], b = [ 5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11 ], g = [ 11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6 ], m = [ 8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11 ];
}, {
"./common": 125,
"./utils": 135
} ],
128: [ function(e, t, i) {
"use strict";
i.sha1 = e("./sha/1");
i.sha224 = e("./sha/224");
i.sha256 = e("./sha/256");
i.sha384 = e("./sha/384");
i.sha512 = e("./sha/512");
}, {
"./sha/1": 129,
"./sha/224": 130,
"./sha/256": 131,
"./sha/384": 132,
"./sha/512": 133
} ],
129: [ function(e, t) {
"use strict";
var i = e("../utils"), r = e("../common"), n = e("./common"), a = i.rotl32, s = i.sum32, o = i.sum32_5, c = n.ft_1, f = r.BlockHash, h = [ 1518500249, 1859775393, 2400959708, 3395469782 ];
function u() {
if (!(this instanceof u)) return new u();
f.call(this);
this.h = [ 1732584193, 4023233417, 2562383102, 271733878, 3285377520 ];
this.W = new Array(80);
}
i.inherits(u, f);
t.exports = u;
u.blockSize = 512;
u.outSize = 160;
u.hmacStrength = 80;
u.padLength = 64;
u.prototype._update = function(e, t) {
for (var i = this.W, r = 0; r < 16; r++) i[r] = e[t + r];
for (;r < i.length; r++) i[r] = a(i[r - 3] ^ i[r - 8] ^ i[r - 14] ^ i[r - 16], 1);
var n = this.h[0], f = this.h[1], u = this.h[2], d = this.h[3], l = this.h[4];
for (r = 0; r < i.length; r++) {
var p = ~~(r / 20), b = o(a(n, 5), c(p, f, u, d), l, i[r], h[p]);
l = d;
d = u;
u = a(f, 30);
f = n;
n = b;
}
this.h[0] = s(this.h[0], n);
this.h[1] = s(this.h[1], f);
this.h[2] = s(this.h[2], u);
this.h[3] = s(this.h[3], d);
this.h[4] = s(this.h[4], l);
};
u.prototype._digest = function(e) {
return "hex" === e ? i.toHex32(this.h, "big") : i.split32(this.h, "big");
};
}, {
"../common": 125,
"../utils": 135,
"./common": 134
} ],
130: [ function(e, t) {
"use strict";
var i = e("../utils"), r = e("./256");
function n() {
if (!(this instanceof n)) return new n();
r.call(this);
this.h = [ 3238371032, 914150663, 812702999, 4144912697, 4290775857, 1750603025, 1694076839, 3204075428 ];
}
i.inherits(n, r);
t.exports = n;
n.blockSize = 512;
n.outSize = 224;
n.hmacStrength = 192;
n.padLength = 64;
n.prototype._digest = function(e) {
return "hex" === e ? i.toHex32(this.h.slice(0, 7), "big") : i.split32(this.h.slice(0, 7), "big");
};
}, {
"../utils": 135,
"./256": 131
} ],
131: [ function(e, t) {
"use strict";
var i = e("../utils"), r = e("../common"), n = e("./common"), a = e("minimalistic-assert"), s = i.sum32, o = i.sum32_4, c = i.sum32_5, f = n.ch32, h = n.maj32, u = n.s0_256, d = n.s1_256, l = n.g0_256, p = n.g1_256, b = r.BlockHash, g = [ 1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298 ];
function m() {
if (!(this instanceof m)) return new m();
b.call(this);
this.h = [ 1779033703, 3144134277, 1013904242, 2773480762, 1359893119, 2600822924, 528734635, 1541459225 ];
this.k = g;
this.W = new Array(64);
}
i.inherits(m, b);
t.exports = m;
m.blockSize = 512;
m.outSize = 256;
m.hmacStrength = 192;
m.padLength = 64;
m.prototype._update = function(e, t) {
for (var i = this.W, r = 0; r < 16; r++) i[r] = e[t + r];
for (;r < i.length; r++) i[r] = o(p(i[r - 2]), i[r - 7], l(i[r - 15]), i[r - 16]);
var n = this.h[0], b = this.h[1], g = this.h[2], m = this.h[3], v = this.h[4], y = this.h[5], _ = this.h[6], w = this.h[7];
a(this.k.length === i.length);
for (r = 0; r < i.length; r++) {
var S = c(w, d(v), f(v, y, _), this.k[r], i[r]), k = s(u(n), h(n, b, g));
w = _;
_ = y;
y = v;
v = s(m, S);
m = g;
g = b;
b = n;
n = s(S, k);
}
this.h[0] = s(this.h[0], n);
this.h[1] = s(this.h[1], b);
this.h[2] = s(this.h[2], g);
this.h[3] = s(this.h[3], m);
this.h[4] = s(this.h[4], v);
this.h[5] = s(this.h[5], y);
this.h[6] = s(this.h[6], _);
this.h[7] = s(this.h[7], w);
};
m.prototype._digest = function(e) {
return "hex" === e ? i.toHex32(this.h, "big") : i.split32(this.h, "big");
};
}, {
"../common": 125,
"../utils": 135,
"./common": 134,
"minimalistic-assert": 142
} ],
132: [ function(e, t) {
"use strict";
var i = e("../utils"), r = e("./512");
function n() {
if (!(this instanceof n)) return new n();
r.call(this);
this.h = [ 3418070365, 3238371032, 1654270250, 914150663, 2438529370, 812702999, 355462360, 4144912697, 1731405415, 4290775857, 2394180231, 1750603025, 3675008525, 1694076839, 1203062813, 3204075428 ];
}
i.inherits(n, r);
t.exports = n;
n.blockSize = 1024;
n.outSize = 384;
n.hmacStrength = 192;
n.padLength = 128;
n.prototype._digest = function(e) {
return "hex" === e ? i.toHex32(this.h.slice(0, 12), "big") : i.split32(this.h.slice(0, 12), "big");
};
}, {
"../utils": 135,
"./512": 133
} ],
133: [ function(e, t) {
"use strict";
var i = e("../utils"), r = e("../common"), n = e("minimalistic-assert"), a = i.rotr64_hi, s = i.rotr64_lo, o = i.shr64_hi, c = i.shr64_lo, f = i.sum64, h = i.sum64_hi, u = i.sum64_lo, d = i.sum64_4_hi, l = i.sum64_4_lo, p = i.sum64_5_hi, b = i.sum64_5_lo, g = r.BlockHash, m = [ 1116352408, 3609767458, 1899447441, 602891725, 3049323471, 3964484399, 3921009573, 2173295548, 961987163, 4081628472, 1508970993, 3053834265, 2453635748, 2937671579, 2870763221, 3664609560, 3624381080, 2734883394, 310598401, 1164996542, 607225278, 1323610764, 1426881987, 3590304994, 1925078388, 4068182383, 2162078206, 991336113, 2614888103, 633803317, 3248222580, 3479774868, 3835390401, 2666613458, 4022224774, 944711139, 264347078, 2341262773, 604807628, 2007800933, 770255983, 1495990901, 1249150122, 1856431235, 1555081692, 3175218132, 1996064986, 2198950837, 2554220882, 3999719339, 2821834349, 766784016, 2952996808, 2566594879, 3210313671, 3203337956, 3336571891, 1034457026, 3584528711, 2466948901, 113926993, 3758326383, 338241895, 168717936, 666307205, 1188179964, 773529912, 1546045734, 1294757372, 1522805485, 1396182291, 2643833823, 1695183700, 2343527390, 1986661051, 1014477480, 2177026350, 1206759142, 2456956037, 344077627, 2730485921, 1290863460, 2820302411, 3158454273, 3259730800, 3505952657, 3345764771, 106217008, 3516065817, 3606008344, 3600352804, 1432725776, 4094571909, 1467031594, 275423344, 851169720, 430227734, 3100823752, 506948616, 1363258195, 659060556, 3750685593, 883997877, 3785050280, 958139571, 3318307427, 1322822218, 3812723403, 1537002063, 2003034995, 1747873779, 3602036899, 1955562222, 1575990012, 2024104815, 1125592928, 2227730452, 2716904306, 2361852424, 442776044, 2428436474, 593698344, 2756734187, 3733110249, 3204031479, 2999351573, 3329325298, 3815920427, 3391569614, 3928383900, 3515267271, 566280711, 3940187606, 3454069534, 4118630271, 4000239992, 116418474, 1914138554, 174292421, 2731055270, 289380356, 3203993006, 460393269, 320620315, 685471733, 587496836, 852142971, 1086792851, 1017036298, 365543100, 1126000580, 2618297676, 1288033470, 3409855158, 1501505948, 4234509866, 1607167915, 987167468, 1816402316, 1246189591 ];
function v() {
if (!(this instanceof v)) return new v();
g.call(this);
this.h = [ 1779033703, 4089235720, 3144134277, 2227873595, 1013904242, 4271175723, 2773480762, 1595750129, 1359893119, 2917565137, 2600822924, 725511199, 528734635, 4215389547, 1541459225, 327033209 ];
this.k = m;
this.W = new Array(160);
}
i.inherits(v, g);
t.exports = v;
v.blockSize = 1024;
v.outSize = 512;
v.hmacStrength = 192;
v.padLength = 128;
v.prototype._prepareBlock = function(e, t) {
for (var i = this.W, r = 0; r < 32; r++) i[r] = e[t + r];
for (;r < i.length; r += 2) {
var n = C(i[r - 4], i[r - 3]), a = x(i[r - 4], i[r - 3]), s = i[r - 14], o = i[r - 13], c = E(i[r - 30], i[r - 29]), f = P(i[r - 30], i[r - 29]), h = i[r - 32], u = i[r - 31];
i[r] = d(n, a, s, o, c, f, h, u);
i[r + 1] = l(n, a, s, o, c, f, h, u);
}
};
v.prototype._update = function(e, t) {
this._prepareBlock(e, t);
var i = this.W, r = this.h[0], a = this.h[1], s = this.h[2], o = this.h[3], c = this.h[4], d = this.h[5], l = this.h[6], g = this.h[7], m = this.h[8], v = this.h[9], E = this.h[10], P = this.h[11], C = this.h[12], x = this.h[13], O = this.h[14], N = this.h[15];
n(this.k.length === i.length);
for (var T = 0; T < i.length; T += 2) {
var j = O, D = N, R = A(m, v), B = I(m, v), L = y(m, 0, E, 0, C), U = _(0, v, 0, P, 0, x), q = this.k[T], F = this.k[T + 1], z = i[T], H = i[T + 1], J = p(j, D, R, B, L, U, q, F, z, H), K = b(j, D, R, B, L, U, q, F, z, H);
j = k(r, a);
D = M(r, a);
R = w(r, 0, s, 0, c);
B = S(0, a, 0, o, 0, d);
var W = h(j, D, R, B), V = u(j, D, R, B);
O = C;
N = x;
C = E;
x = P;
E = m;
P = v;
m = h(l, g, J, K);
v = u(g, g, J, K);
l = c;
g = d;
c = s;
d = o;
s = r;
o = a;
r = h(J, K, W, V);
a = u(J, K, W, V);
}
f(this.h, 0, r, a);
f(this.h, 2, s, o);
f(this.h, 4, c, d);
f(this.h, 6, l, g);
f(this.h, 8, m, v);
f(this.h, 10, E, P);
f(this.h, 12, C, x);
f(this.h, 14, O, N);
};
v.prototype._digest = function(e) {
return "hex" === e ? i.toHex32(this.h, "big") : i.split32(this.h, "big");
};
function y(e, t, i, r, n) {
var a = e & i ^ ~e & n;
a < 0 && (a += 4294967296);
return a;
}
function _(e, t, i, r, n, a) {
var s = t & r ^ ~t & a;
s < 0 && (s += 4294967296);
return s;
}
function w(e, t, i, r, n) {
var a = e & i ^ e & n ^ i & n;
a < 0 && (a += 4294967296);
return a;
}
function S(e, t, i, r, n, a) {
var s = t & r ^ t & a ^ r & a;
s < 0 && (s += 4294967296);
return s;
}
function k(e, t) {
var i = a(e, t, 28) ^ a(t, e, 2) ^ a(t, e, 7);
i < 0 && (i += 4294967296);
return i;
}
function M(e, t) {
var i = s(e, t, 28) ^ s(t, e, 2) ^ s(t, e, 7);
i < 0 && (i += 4294967296);
return i;
}
function A(e, t) {
var i = a(e, t, 14) ^ a(e, t, 18) ^ a(t, e, 9);
i < 0 && (i += 4294967296);
return i;
}
function I(e, t) {
var i = s(e, t, 14) ^ s(e, t, 18) ^ s(t, e, 9);
i < 0 && (i += 4294967296);
return i;
}
function E(e, t) {
var i = a(e, t, 1) ^ a(e, t, 8) ^ o(e, t, 7);
i < 0 && (i += 4294967296);
return i;
}
function P(e, t) {
var i = s(e, t, 1) ^ s(e, t, 8) ^ c(e, t, 7);
i < 0 && (i += 4294967296);
return i;
}
function C(e, t) {
var i = a(e, t, 19) ^ a(t, e, 29) ^ o(e, t, 6);
i < 0 && (i += 4294967296);
return i;
}
function x(e, t) {
var i = s(e, t, 19) ^ s(t, e, 29) ^ c(e, t, 6);
i < 0 && (i += 4294967296);
return i;
}
}, {
"../common": 125,
"../utils": 135,
"minimalistic-assert": 142
} ],
134: [ function(e, t, i) {
"use strict";
var r = e("../utils").rotr32;
i.ft_1 = function(e, t, i, r) {
return 0 === e ? n(t, i, r) : 1 === e || 3 === e ? s(t, i, r) : 2 === e ? a(t, i, r) : void 0;
};
function n(e, t, i) {
return e & t ^ ~e & i;
}
i.ch32 = n;
function a(e, t, i) {
return e & t ^ e & i ^ t & i;
}
i.maj32 = a;
function s(e, t, i) {
return e ^ t ^ i;
}
i.p32 = s;
i.s0_256 = function(e) {
return r(e, 2) ^ r(e, 13) ^ r(e, 22);
};
i.s1_256 = function(e) {
return r(e, 6) ^ r(e, 11) ^ r(e, 25);
};
i.g0_256 = function(e) {
return r(e, 7) ^ r(e, 18) ^ e >>> 3;
};
i.g1_256 = function(e) {
return r(e, 17) ^ r(e, 19) ^ e >>> 10;
};
}, {
"../utils": 135
} ],
135: [ function(e, t, i) {
"use strict";
var r = e("minimalistic-assert"), n = e("inherits");
i.inherits = n;
function a(e, t) {
return 55296 == (64512 & e.charCodeAt(t)) && !(t < 0 || t + 1 >= e.length) && 56320 == (64512 & e.charCodeAt(t + 1));
}
i.toArray = function(e, t) {
if (Array.isArray(e)) return e.slice();
if (!e) return [];
var i = [];
if ("string" == typeof e) if (t) {
if ("hex" === t) {
(e = e.replace(/[^a-z0-9]+/gi, "")).length % 2 != 0 && (e = "0" + e);
for (n = 0; n < e.length; n += 2) i.push(parseInt(e[n] + e[n + 1], 16));
}
} else for (var r = 0, n = 0; n < e.length; n++) {
var s = e.charCodeAt(n);
if (s < 128) i[r++] = s; else if (s < 2048) {
i[r++] = s >> 6 | 192;
i[r++] = 63 & s | 128;
} else if (a(e, n)) {
s = 65536 + ((1023 & s) << 10) + (1023 & e.charCodeAt(++n));
i[r++] = s >> 18 | 240;
i[r++] = s >> 12 & 63 | 128;
i[r++] = s >> 6 & 63 | 128;
i[r++] = 63 & s | 128;
} else {
i[r++] = s >> 12 | 224;
i[r++] = s >> 6 & 63 | 128;
i[r++] = 63 & s | 128;
}
} else for (n = 0; n < e.length; n++) i[n] = 0 | e[n];
return i;
};
i.toHex = function(e) {
for (var t = "", i = 0; i < e.length; i++) t += o(e[i].toString(16));
return t;
};
function s(e) {
return (e >>> 24 | e >>> 8 & 65280 | e << 8 & 16711680 | (255 & e) << 24) >>> 0;
}
i.htonl = s;
i.toHex32 = function(e, t) {
for (var i = "", r = 0; r < e.length; r++) {
var n = e[r];
"little" === t && (n = s(n));
i += c(n.toString(16));
}
return i;
};
function o(e) {
return 1 === e.length ? "0" + e : e;
}
i.zero2 = o;
function c(e) {
return 7 === e.length ? "0" + e : 6 === e.length ? "00" + e : 5 === e.length ? "000" + e : 4 === e.length ? "0000" + e : 3 === e.length ? "00000" + e : 2 === e.length ? "000000" + e : 1 === e.length ? "0000000" + e : e;
}
i.zero8 = c;
i.join32 = function(e, t, i, n) {
var a = i - t;
r(a % 4 == 0);
for (var s = new Array(a / 4), o = 0, c = t; o < s.length; o++, c += 4) {
var f;
f = "big" === n ? e[c] << 24 | e[c + 1] << 16 | e[c + 2] << 8 | e[c + 3] : e[c + 3] << 24 | e[c + 2] << 16 | e[c + 1] << 8 | e[c];
s[o] = f >>> 0;
}
return s;
};
i.split32 = function(e, t) {
for (var i = new Array(4 * e.length), r = 0, n = 0; r < e.length; r++, n += 4) {
var a = e[r];
if ("big" === t) {
i[n] = a >>> 24;
i[n + 1] = a >>> 16 & 255;
i[n + 2] = a >>> 8 & 255;
i[n + 3] = 255 & a;
} else {
i[n + 3] = a >>> 24;
i[n + 2] = a >>> 16 & 255;
i[n + 1] = a >>> 8 & 255;
i[n] = 255 & a;
}
}
return i;
};
i.rotr32 = function(e, t) {
return e >>> t | e << 32 - t;
};
i.rotl32 = function(e, t) {
return e << t | e >>> 32 - t;
};
i.sum32 = function(e, t) {
return e + t >>> 0;
};
i.sum32_3 = function(e, t, i) {
return e + t + i >>> 0;
};
i.sum32_4 = function(e, t, i, r) {
return e + t + i + r >>> 0;
};
i.sum32_5 = function(e, t, i, r, n) {
return e + t + i + r + n >>> 0;
};
i.sum64 = function(e, t, i, r) {
var n = e[t], a = r + e[t + 1] >>> 0, s = (a < r ? 1 : 0) + i + n;
e[t] = s >>> 0;
e[t + 1] = a;
};
i.sum64_hi = function(e, t, i, r) {
return (t + r >>> 0 < t ? 1 : 0) + e + i >>> 0;
};
i.sum64_lo = function(e, t, i, r) {
return t + r >>> 0;
};
i.sum64_4_hi = function(e, t, i, r, n, a, s, o) {
var c = 0, f = t;
c += (f = f + r >>> 0) < t ? 1 : 0;
c += (f = f + a >>> 0) < a ? 1 : 0;
return e + i + n + s + (c += (f = f + o >>> 0) < o ? 1 : 0) >>> 0;
};
i.sum64_4_lo = function(e, t, i, r, n, a, s, o) {
return t + r + a + o >>> 0;
};
i.sum64_5_hi = function(e, t, i, r, n, a, s, o, c, f) {
var h = 0, u = t;
h += (u = u + r >>> 0) < t ? 1 : 0;
h += (u = u + a >>> 0) < a ? 1 : 0;
h += (u = u + o >>> 0) < o ? 1 : 0;
return e + i + n + s + c + (h += (u = u + f >>> 0) < f ? 1 : 0) >>> 0;
};
i.sum64_5_lo = function(e, t, i, r, n, a, s, o, c, f) {
return t + r + a + o + f >>> 0;
};
i.rotr64_hi = function(e, t, i) {
return (t << 32 - i | e >>> i) >>> 0;
};
i.rotr64_lo = function(e, t, i) {
return (e << 32 - i | t >>> i) >>> 0;
};
i.shr64_hi = function(e, t, i) {
return e >>> i;
};
i.shr64_lo = function(e, t, i) {
return (e << 32 - i | t >>> i) >>> 0;
};
}, {
inherits: 138,
"minimalistic-assert": 142
} ],
136: [ function(e, t) {
"use strict";
var i = e("hash.js"), r = e("minimalistic-crypto-utils"), n = e("minimalistic-assert");
function a(e) {
if (!(this instanceof a)) return new a(e);
this.hash = e.hash;
this.predResist = !!e.predResist;
this.outLen = this.hash.outSize;
this.minEntropy = e.minEntropy || this.hash.hmacStrength;
this._reseed = null;
this.reseedInterval = null;
this.K = null;
this.V = null;
var t = r.toArray(e.entropy, e.entropyEnc || "hex"), i = r.toArray(e.nonce, e.nonceEnc || "hex"), s = r.toArray(e.pers, e.persEnc || "hex");
n(t.length >= this.minEntropy / 8, "Not enough entropy. Minimum is: " + this.minEntropy + " bits");
this._init(t, i, s);
}
t.exports = a;
a.prototype._init = function(e, t, i) {
var r = e.concat(t).concat(i);
this.K = new Array(this.outLen / 8);
this.V = new Array(this.outLen / 8);
for (var n = 0; n < this.V.length; n++) {
this.K[n] = 0;
this.V[n] = 1;
}
this._update(r);
this._reseed = 1;
this.reseedInterval = 281474976710656;
};
a.prototype._hmac = function() {
return new i.hmac(this.hash, this.K);
};
a.prototype._update = function(e) {
var t = this._hmac().update(this.V).update([ 0 ]);
e && (t = t.update(e));
this.K = t.digest();
this.V = this._hmac().update(this.V).digest();
if (e) {
this.K = this._hmac().update(this.V).update([ 1 ]).update(e).digest();
this.V = this._hmac().update(this.V).digest();
}
};
a.prototype.reseed = function(e, t, i, a) {
if ("string" != typeof t) {
a = i;
i = t;
t = null;
}
e = r.toArray(e, t);
i = r.toArray(i, a);
n(e.length >= this.minEntropy / 8, "Not enough entropy. Minimum is: " + this.minEntropy + " bits");
this._update(e.concat(i || []));
this._reseed = 1;
};
a.prototype.generate = function(e, t, i, n) {
if (this._reseed > this.reseedInterval) throw new Error("Reseed is required");
if ("string" != typeof t) {
n = i;
i = t;
t = null;
}
if (i) {
i = r.toArray(i, n || "hex");
this._update(i);
}
for (var a = []; a.length < e; ) {
this.V = this._hmac().update(this.V).digest();
a = a.concat(this.V);
}
var s = a.slice(0, e);
this._update(i);
this._reseed++;
return r.encode(s, t);
};
}, {
"hash.js": 124,
"minimalistic-assert": 142,
"minimalistic-crypto-utils": 143
} ],
137: [ function(e, t, i) {
i.read = function(e, t, i, r, n) {
var a, s, o = 8 * n - r - 1, c = (1 << o) - 1, f = c >> 1, h = -7, u = i ? n - 1 : 0, d = i ? -1 : 1, l = e[t + u];
u += d;
a = l & (1 << -h) - 1;
l >>= -h;
h += o;
for (;h > 0; a = 256 * a + e[t + u], u += d, h -= 8) ;
s = a & (1 << -h) - 1;
a >>= -h;
h += r;
for (;h > 0; s = 256 * s + e[t + u], u += d, h -= 8) ;
if (0 === a) a = 1 - f; else {
if (a === c) return s ? NaN : Infinity * (l ? -1 : 1);
s += Math.pow(2, r);
a -= f;
}
return (l ? -1 : 1) * s * Math.pow(2, a - r);
};
i.write = function(e, t, i, r, n, a) {
var s, o, c, f = 8 * a - n - 1, h = (1 << f) - 1, u = h >> 1, d = 23 === n ? Math.pow(2, -24) - Math.pow(2, -77) : 0, l = r ? 0 : a - 1, p = r ? 1 : -1, b = t < 0 || 0 === t && 1 / t < 0 ? 1 : 0;
t = Math.abs(t);
if (isNaN(t) || Infinity === t) {
o = isNaN(t) ? 1 : 0;
s = h;
} else {
s = Math.floor(Math.log(t) / Math.LN2);
if (t * (c = Math.pow(2, -s)) < 1) {
s--;
c *= 2;
}
if ((t += s + u >= 1 ? d / c : d * Math.pow(2, 1 - u)) * c >= 2) {
s++;
c /= 2;
}
if (s + u >= h) {
o = 0;
s = h;
} else if (s + u >= 1) {
o = (t * c - 1) * Math.pow(2, n);
s += u;
} else {
o = t * Math.pow(2, u - 1) * Math.pow(2, n);
s = 0;
}
}
for (;n >= 8; e[i + l] = 255 & o, l += p, o /= 256, n -= 8) ;
s = s << n | o;
f += n;
for (;f > 0; e[i + l] = 255 & s, l += p, s /= 256, f -= 8) ;
e[i + l - p] |= 128 * b;
};
}, {} ],
138: [ function(e, t) {
"function" == typeof Object.create ? t.exports = function(e, t) {
if (t) {
e.super_ = t;
e.prototype = Object.create(t.prototype, {
constructor: {
value: e,
enumerable: !1,
writable: !0,
configurable: !0
}
});
}
} : t.exports = function(e, t) {
if (t) {
e.super_ = t;
var i = function() {};
i.prototype = t.prototype;
e.prototype = new i();
e.prototype.constructor = e;
}
};
}, {} ],
139: [ function(e, t) {
"use strict";
var i = e("inherits"), r = e("hash-base"), n = e("safe-buffer").Buffer, a = new Array(16);
function s() {
r.call(this, 64);
this._a = 1732584193;
this._b = 4023233417;
this._c = 2562383102;
this._d = 271733878;
}
i(s, r);
s.prototype._update = function() {
for (var e = a, t = 0; t < 16; ++t) e[t] = this._block.readInt32LE(4 * t);
var i = this._a, r = this._b, n = this._c, s = this._d;
i = c(i, r, n, s, e[0], 3614090360, 7);
s = c(s, i, r, n, e[1], 3905402710, 12);
n = c(n, s, i, r, e[2], 606105819, 17);
r = c(r, n, s, i, e[3], 3250441966, 22);
i = c(i, r, n, s, e[4], 4118548399, 7);
s = c(s, i, r, n, e[5], 1200080426, 12);
n = c(n, s, i, r, e[6], 2821735955, 17);
r = c(r, n, s, i, e[7], 4249261313, 22);
i = c(i, r, n, s, e[8], 1770035416, 7);
s = c(s, i, r, n, e[9], 2336552879, 12);
n = c(n, s, i, r, e[10], 4294925233, 17);
r = c(r, n, s, i, e[11], 2304563134, 22);
i = c(i, r, n, s, e[12], 1804603682, 7);
s = c(s, i, r, n, e[13], 4254626195, 12);
n = c(n, s, i, r, e[14], 2792965006, 17);
i = f(i, r = c(r, n, s, i, e[15], 1236535329, 22), n, s, e[1], 4129170786, 5);
s = f(s, i, r, n, e[6], 3225465664, 9);
n = f(n, s, i, r, e[11], 643717713, 14);
r = f(r, n, s, i, e[0], 3921069994, 20);
i = f(i, r, n, s, e[5], 3593408605, 5);
s = f(s, i, r, n, e[10], 38016083, 9);
n = f(n, s, i, r, e[15], 3634488961, 14);
r = f(r, n, s, i, e[4], 3889429448, 20);
i = f(i, r, n, s, e[9], 568446438, 5);
s = f(s, i, r, n, e[14], 3275163606, 9);
n = f(n, s, i, r, e[3], 4107603335, 14);
r = f(r, n, s, i, e[8], 1163531501, 20);
i = f(i, r, n, s, e[13], 2850285829, 5);
s = f(s, i, r, n, e[2], 4243563512, 9);
n = f(n, s, i, r, e[7], 1735328473, 14);
i = h(i, r = f(r, n, s, i, e[12], 2368359562, 20), n, s, e[5], 4294588738, 4);
s = h(s, i, r, n, e[8], 2272392833, 11);
n = h(n, s, i, r, e[11], 1839030562, 16);
r = h(r, n, s, i, e[14], 4259657740, 23);
i = h(i, r, n, s, e[1], 2763975236, 4);
s = h(s, i, r, n, e[4], 1272893353, 11);
n = h(n, s, i, r, e[7], 4139469664, 16);
r = h(r, n, s, i, e[10], 3200236656, 23);
i = h(i, r, n, s, e[13], 681279174, 4);
s = h(s, i, r, n, e[0], 3936430074, 11);
n = h(n, s, i, r, e[3], 3572445317, 16);
r = h(r, n, s, i, e[6], 76029189, 23);
i = h(i, r, n, s, e[9], 3654602809, 4);
s = h(s, i, r, n, e[12], 3873151461, 11);
n = h(n, s, i, r, e[15], 530742520, 16);
i = u(i, r = h(r, n, s, i, e[2], 3299628645, 23), n, s, e[0], 4096336452, 6);
s = u(s, i, r, n, e[7], 1126891415, 10);
n = u(n, s, i, r, e[14], 2878612391, 15);
r = u(r, n, s, i, e[5], 4237533241, 21);
i = u(i, r, n, s, e[12], 1700485571, 6);
s = u(s, i, r, n, e[3], 2399980690, 10);
n = u(n, s, i, r, e[10], 4293915773, 15);
r = u(r, n, s, i, e[1], 2240044497, 21);
i = u(i, r, n, s, e[8], 1873313359, 6);
s = u(s, i, r, n, e[15], 4264355552, 10);
n = u(n, s, i, r, e[6], 2734768916, 15);
r = u(r, n, s, i, e[13], 1309151649, 21);
i = u(i, r, n, s, e[4], 4149444226, 6);
s = u(s, i, r, n, e[11], 3174756917, 10);
n = u(n, s, i, r, e[2], 718787259, 15);
r = u(r, n, s, i, e[9], 3951481745, 21);
this._a = this._a + i | 0;
this._b = this._b + r | 0;
this._c = this._c + n | 0;
this._d = this._d + s | 0;
};
s.prototype._digest = function() {
this._block[this._blockOffset++] = 128;
if (this._blockOffset > 56) {
this._block.fill(0, this._blockOffset, 64);
this._update();
this._blockOffset = 0;
}
this._block.fill(0, this._blockOffset, 56);
this._block.writeUInt32LE(this._length[0], 56);
this._block.writeUInt32LE(this._length[1], 60);
this._update();
var e = n.allocUnsafe(16);
e.writeInt32LE(this._a, 0);
e.writeInt32LE(this._b, 4);
e.writeInt32LE(this._c, 8);
e.writeInt32LE(this._d, 12);
return e;
};
function o(e, t) {
return e << t | e >>> 32 - t;
}
function c(e, t, i, r, n, a, s) {
return o(e + (t & i | ~t & r) + n + a | 0, s) + t | 0;
}
function f(e, t, i, r, n, a, s) {
return o(e + (t & r | i & ~r) + n + a | 0, s) + t | 0;
}
function h(e, t, i, r, n, a, s) {
return o(e + (t ^ i ^ r) + n + a | 0, s) + t | 0;
}
function u(e, t, i, r, n, a, s) {
return o(e + (i ^ (t | ~r)) + n + a | 0, s) + t | 0;
}
t.exports = s;
}, {
"hash-base": 106,
inherits: 138,
"safe-buffer": 182
} ],
140: [ function(e, t) {
var i = e("bn.js"), r = e("brorand");
function n(e) {
this.rand = e || new r.Rand();
}
t.exports = n;
n.create = function(e) {
return new n(e);
};
n.prototype._randbelow = function(e) {
var t = e.bitLength(), r = Math.ceil(t / 8);
do {
var n = new i(this.rand.generate(r));
} while (n.cmp(e) >= 0);
return n;
};
n.prototype._randrange = function(e, t) {
var i = t.sub(e);
return e.add(this._randbelow(i));
};
n.prototype.test = function(e, t, r) {
var n = e.bitLength(), a = i.mont(e), s = new i(1).toRed(a);
t || (t = Math.max(1, n / 48 | 0));
for (var o = e.subn(1), c = 0; !o.testn(c); c++) ;
for (var f = e.shrn(c), h = o.toRed(a); t > 0; t--) {
var u = this._randrange(new i(2), o);
r && r(u);
var d = u.toRed(a).redPow(f);
if (0 !== d.cmp(s) && 0 !== d.cmp(h)) {
for (var l = 1; l < c; l++) {
if (0 === (d = d.redSqr()).cmp(s)) return !1;
if (0 === d.cmp(h)) break;
}
if (l === c) return !1;
}
}
return !0;
};
n.prototype.getDivisor = function(e, t) {
var r = e.bitLength(), n = i.mont(e), a = new i(1).toRed(n);
t || (t = Math.max(1, r / 48 | 0));
for (var s = e.subn(1), o = 0; !s.testn(o); o++) ;
for (var c = e.shrn(o), f = s.toRed(n); t > 0; t--) {
var h = this._randrange(new i(2), s), u = e.gcd(h);
if (0 !== u.cmpn(1)) return u;
var d = h.toRed(n).redPow(c);
if (0 !== d.cmp(a) && 0 !== d.cmp(f)) {
for (var l = 1; l < o; l++) {
if (0 === (d = d.redSqr()).cmp(a)) return d.fromRed().subn(1).gcd(e);
if (0 === d.cmp(f)) break;
}
if (l === o) return (d = d.redSqr()).fromRed().subn(1).gcd(e);
}
}
return !1;
};
}, {
"bn.js": 141,
brorand: 18
} ],
141: [ function(e, t, i) {
arguments[4][15][0].apply(i, arguments);
}, {
buffer: 19,
dup: 15
} ],
142: [ function(e, t) {
t.exports = i;
function i(e, t) {
if (!e) throw new Error(t || "Assertion failed");
}
i.equal = function(e, t, i) {
if (e != t) throw new Error(i || "Assertion failed: " + e + " != " + t);
};
}, {} ],
143: [ function(e, t, i) {
"use strict";
var r = i;
r.toArray = function(e, t) {
if (Array.isArray(e)) return e.slice();
if (!e) return [];
var i = [];
if ("string" != typeof e) {
for (var r = 0; r < e.length; r++) i[r] = 0 | e[r];
return i;
}
if ("hex" === t) {
(e = e.replace(/[^a-z0-9]+/gi, "")).length % 2 != 0 && (e = "0" + e);
for (r = 0; r < e.length; r += 2) i.push(parseInt(e[r] + e[r + 1], 16));
} else for (r = 0; r < e.length; r++) {
var n = e.charCodeAt(r), a = n >> 8, s = 255 & n;
a ? i.push(a, s) : i.push(s);
}
return i;
};
function n(e) {
return 1 === e.length ? "0" + e : e;
}
r.zero2 = n;
function a(e) {
for (var t = "", i = 0; i < e.length; i++) t += n(e[i].toString(16));
return t;
}
r.toHex = a;
r.encode = function(e, t) {
return "hex" === t ? a(e) : e;
};
}, {} ],
144: [ function(e, t) {
t.exports = {
"2.16.840.1.101.3.4.1.1": "aes-128-ecb",
"2.16.840.1.101.3.4.1.2": "aes-128-cbc",
"2.16.840.1.101.3.4.1.3": "aes-128-ofb",
"2.16.840.1.101.3.4.1.4": "aes-128-cfb",
"2.16.840.1.101.3.4.1.21": "aes-192-ecb",
"2.16.840.1.101.3.4.1.22": "aes-192-cbc",
"2.16.840.1.101.3.4.1.23": "aes-192-ofb",
"2.16.840.1.101.3.4.1.24": "aes-192-cfb",
"2.16.840.1.101.3.4.1.41": "aes-256-ecb",
"2.16.840.1.101.3.4.1.42": "aes-256-cbc",
"2.16.840.1.101.3.4.1.43": "aes-256-ofb",
"2.16.840.1.101.3.4.1.44": "aes-256-cfb"
};
}, {} ],
145: [ function(e, t, i) {
"use strict";
var r = e("asn1.js");
i.certificate = e("./certificate");
var n = r.define("RSAPrivateKey", function() {
this.seq().obj(this.key("version").int(), this.key("modulus").int(), this.key("publicExponent").int(), this.key("privateExponent").int(), this.key("prime1").int(), this.key("prime2").int(), this.key("exponent1").int(), this.key("exponent2").int(), this.key("coefficient").int());
});
i.RSAPrivateKey = n;
var a = r.define("RSAPublicKey", function() {
this.seq().obj(this.key("modulus").int(), this.key("publicExponent").int());
});
i.RSAPublicKey = a;
var s = r.define("SubjectPublicKeyInfo", function() {
this.seq().obj(this.key("algorithm").use(o), this.key("subjectPublicKey").bitstr());
});
i.PublicKey = s;
var o = r.define("AlgorithmIdentifier", function() {
this.seq().obj(this.key("algorithm").objid(), this.key("none").null_().optional(), this.key("curve").objid().optional(), this.key("params").seq().obj(this.key("p").int(), this.key("q").int(), this.key("g").int()).optional());
}), c = r.define("PrivateKeyInfo", function() {
this.seq().obj(this.key("version").int(), this.key("algorithm").use(o), this.key("subjectPrivateKey").octstr());
});
i.PrivateKey = c;
var f = r.define("EncryptedPrivateKeyInfo", function() {
this.seq().obj(this.key("algorithm").seq().obj(this.key("id").objid(), this.key("decrypt").seq().obj(this.key("kde").seq().obj(this.key("id").objid(), this.key("kdeparams").seq().obj(this.key("salt").octstr(), this.key("iters").int())), this.key("cipher").seq().obj(this.key("algo").objid(), this.key("iv").octstr()))), this.key("subjectPrivateKey").octstr());
});
i.EncryptedPrivateKey = f;
var h = r.define("DSAPrivateKey", function() {
this.seq().obj(this.key("version").int(), this.key("p").int(), this.key("q").int(), this.key("g").int(), this.key("pub_key").int(), this.key("priv_key").int());
});
i.DSAPrivateKey = h;
i.DSAparam = r.define("DSAparam", function() {
this.int();
});
var u = r.define("ECPrivateKey", function() {
this.seq().obj(this.key("version").int(), this.key("privateKey").octstr(), this.key("parameters").optional().explicit(0).use(d), this.key("publicKey").optional().explicit(1).bitstr());
});
i.ECPrivateKey = u;
var d = r.define("ECParameters", function() {
this.choice({
namedCurve: this.objid()
});
});
i.signature = r.define("signature", function() {
this.seq().obj(this.key("r").int(), this.key("s").int());
});
}, {
"./certificate": 146,
"asn1.js": 1
} ],
146: [ function(e, t) {
"use strict";
var i = e("asn1.js"), r = i.define("Time", function() {
this.choice({
utcTime: this.utctime(),
generalTime: this.gentime()
});
}), n = i.define("AttributeTypeValue", function() {
this.seq().obj(this.key("type").objid(), this.key("value").any());
}), a = i.define("AlgorithmIdentifier", function() {
this.seq().obj(this.key("algorithm").objid(), this.key("parameters").optional(), this.key("curve").objid().optional());
}), s = i.define("SubjectPublicKeyInfo", function() {
this.seq().obj(this.key("algorithm").use(a), this.key("subjectPublicKey").bitstr());
}), o = i.define("RelativeDistinguishedName", function() {
this.setof(n);
}), c = i.define("RDNSequence", function() {
this.seqof(o);
}), f = i.define("Name", function() {
this.choice({
rdnSequence: this.use(c)
});
}), h = i.define("Validity", function() {
this.seq().obj(this.key("notBefore").use(r), this.key("notAfter").use(r));
}), u = i.define("Extension", function() {
this.seq().obj(this.key("extnID").objid(), this.key("critical").bool().def(!1), this.key("extnValue").octstr());
}), d = i.define("TBSCertificate", function() {
this.seq().obj(this.key("version").explicit(0).int().optional(), this.key("serialNumber").int(), this.key("signature").use(a), this.key("issuer").use(f), this.key("validity").use(h), this.key("subject").use(f), this.key("subjectPublicKeyInfo").use(s), this.key("issuerUniqueID").implicit(1).bitstr().optional(), this.key("subjectUniqueID").implicit(2).bitstr().optional(), this.key("extensions").explicit(3).seqof(u).optional());
}), l = i.define("X509Certificate", function() {
this.seq().obj(this.key("tbsCertificate").use(d), this.key("signatureAlgorithm").use(a), this.key("signatureValue").bitstr());
});
t.exports = l;
}, {
"asn1.js": 1
} ],
147: [ function(e, t) {
var i = /Proc-Type: 4,ENCRYPTED[\n\r]+DEK-Info: AES-((?:128)|(?:192)|(?:256))-CBC,([0-9A-H]+)[\n\r]+([0-9A-z\n\r+/=]+)[\n\r]+/m, r = /^-----BEGIN ((?:.*? KEY)|CERTIFICATE)-----/m, n = /^-----BEGIN ((?:.*? KEY)|CERTIFICATE)-----([0-9A-z\n\r+/=]+)-----END \1-----$/m, a = e("evp_bytestokey"), s = e("browserify-aes"), o = e("safe-buffer").Buffer;
t.exports = function(e, t) {
var c, f = e.toString(), h = f.match(i);
if (h) {
var u = "aes" + h[1], d = o.from(h[2], "hex"), l = o.from(h[3].replace(/[\r\n]/g, ""), "base64"), p = a(t, d.slice(0, 8), parseInt(h[1], 10)).key, b = [], g = s.createDecipheriv(u, p, d);
b.push(g.update(l));
b.push(g.final());
c = o.concat(b);
} else {
var m = f.match(n);
c = o.from(m[2].replace(/[\r\n]/g, ""), "base64");
}
return {
tag: f.match(r)[1],
data: c
};
};
}, {
"browserify-aes": 22,
evp_bytestokey: 105,
"safe-buffer": 182
} ],
148: [ function(e, t) {
var i = e("./asn1"), r = e("./aesid.json"), n = e("./fixProc"), a = e("browserify-aes"), s = e("pbkdf2"), o = e("safe-buffer").Buffer;
t.exports = c;
function c(e) {
var t;
if ("object" == typeof e && !o.isBuffer(e)) {
t = e.passphrase;
e = e.key;
}
"string" == typeof e && (e = o.from(e));
var r, a, s = n(e, t), c = s.tag, h = s.data;
switch (c) {
case "CERTIFICATE":
a = i.certificate.decode(h, "der").tbsCertificate.subjectPublicKeyInfo;

case "PUBLIC KEY":
a || (a = i.PublicKey.decode(h, "der"));
switch (r = a.algorithm.algorithm.join(".")) {
case "1.2.840.113549.1.1.1":
return i.RSAPublicKey.decode(a.subjectPublicKey.data, "der");

case "1.2.840.10045.2.1":
a.subjectPrivateKey = a.subjectPublicKey;
return {
type: "ec",
data: a
};

case "1.2.840.10040.4.1":
a.algorithm.params.pub_key = i.DSAparam.decode(a.subjectPublicKey.data, "der");
return {
type: "dsa",
data: a.algorithm.params
};

default:
throw new Error("unknown key id " + r);
}

case "ENCRYPTED PRIVATE KEY":
h = f(h = i.EncryptedPrivateKey.decode(h, "der"), t);

case "PRIVATE KEY":
switch (r = (a = i.PrivateKey.decode(h, "der")).algorithm.algorithm.join(".")) {
case "1.2.840.113549.1.1.1":
return i.RSAPrivateKey.decode(a.subjectPrivateKey, "der");

case "1.2.840.10045.2.1":
return {
curve: a.algorithm.curve,
privateKey: i.ECPrivateKey.decode(a.subjectPrivateKey, "der").privateKey
};

case "1.2.840.10040.4.1":
a.algorithm.params.priv_key = i.DSAparam.decode(a.subjectPrivateKey, "der");
return {
type: "dsa",
params: a.algorithm.params
};

default:
throw new Error("unknown key id " + r);
}

case "RSA PUBLIC KEY":
return i.RSAPublicKey.decode(h, "der");

case "RSA PRIVATE KEY":
return i.RSAPrivateKey.decode(h, "der");

case "DSA PRIVATE KEY":
return {
type: "dsa",
params: i.DSAPrivateKey.decode(h, "der")
};

case "EC PRIVATE KEY":
return {
curve: (h = i.ECPrivateKey.decode(h, "der")).parameters.value,
privateKey: h.privateKey
};

default:
throw new Error("unknown key type " + c);
}
}
c.signature = i.signature;
function f(e, t) {
var i = e.algorithm.decrypt.kde.kdeparams.salt, n = parseInt(e.algorithm.decrypt.kde.kdeparams.iters.toString(), 10), c = r[e.algorithm.decrypt.cipher.algo.join(".")], f = e.algorithm.decrypt.cipher.iv, h = e.subjectPrivateKey, u = parseInt(c.split("-")[1], 10) / 8, d = s.pbkdf2Sync(t, i, n, u, "sha1"), l = a.createDecipheriv(c, d, f), p = [];
p.push(l.update(h));
p.push(l.final());
return o.concat(p);
}
}, {
"./aesid.json": 144,
"./asn1": 145,
"./fixProc": 147,
"browserify-aes": 22,
pbkdf2: 149,
"safe-buffer": 182
} ],
149: [ function(e, t, i) {
i.pbkdf2 = e("./lib/async");
i.pbkdf2Sync = e("./lib/sync");
}, {
"./lib/async": 150,
"./lib/sync": 153
} ],
150: [ function(e, t) {
(function(i) {
var r, n, a = e("safe-buffer").Buffer, s = e("./precondition"), o = e("./default-encoding"), c = e("./sync"), f = e("./to-buffer"), h = i.crypto && i.crypto.subtle, u = {
sha: "SHA-1",
"sha-1": "SHA-1",
sha1: "SHA-1",
sha256: "SHA-256",
"sha-256": "SHA-256",
sha384: "SHA-384",
"sha-384": "SHA-384",
"sha-512": "SHA-512",
sha512: "SHA-512"
}, d = [];
function l(e) {
if (i.process && !i.process.browser) return Promise.resolve(!1);
if (!h || !h.importKey || !h.deriveBits) return Promise.resolve(!1);
if (void 0 !== d[e]) return d[e];
var t = b(r = r || a.alloc(8), r, 10, 128, e).then(function() {
return !0;
}).catch(function() {
return !1;
});
d[e] = t;
return t;
}
function p() {
return n || (n = i.process && i.process.nextTick ? i.process.nextTick : i.queueMicrotask ? i.queueMicrotask : i.setImmediate ? i.setImmediate : i.setTimeout);
}
function b(e, t, i, r, n) {
return h.importKey("raw", e, {
name: "PBKDF2"
}, !1, [ "deriveBits" ]).then(function(e) {
return h.deriveBits({
name: "PBKDF2",
salt: t,
iterations: i,
hash: {
name: n
}
}, e, r << 3);
}).then(function(e) {
return a.from(e);
});
}
function g(e, t) {
e.then(function(e) {
p()(function() {
t(null, e);
});
}, function(e) {
p()(function() {
t(e);
});
});
}
t.exports = function(e, t, r, n, a, h) {
if ("function" == typeof a) {
h = a;
a = void 0;
}
var d = u[(a = a || "sha1").toLowerCase()];
if (d && "function" == typeof i.Promise) {
s(r, n);
e = f(e, o, "Password");
t = f(t, o, "Salt");
if ("function" != typeof h) throw new Error("No callback provided to pbkdf2");
g(l(d).then(function(i) {
return i ? b(e, t, r, n, d) : c(e, t, r, n, a);
}), h);
} else p()(function() {
var i;
try {
i = c(e, t, r, n, a);
} catch (e) {
return h(e);
}
h(null, i);
});
};
}).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
}, {
"./default-encoding": 151,
"./precondition": 152,
"./sync": 153,
"./to-buffer": 154,
"safe-buffer": 182
} ],
151: [ function(e, t) {
(function(e, i) {
var r;
r = i.process && i.process.browser ? "utf-8" : i.process && i.process.version ? parseInt(e.version.split(".")[0].slice(1), 10) >= 6 ? "utf-8" : "binary" : "utf-8";
t.exports = r;
}).call(this, e("_process"), "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
}, {
_process: 156
} ],
152: [ function(e, t) {
var i = Math.pow(2, 30) - 1;
t.exports = function(e, t) {
if ("number" != typeof e) throw new TypeError("Iterations not a number");
if (e < 0) throw new TypeError("Bad iterations");
if ("number" != typeof t) throw new TypeError("Key length not a number");
if (t < 0 || t > i || t != t) throw new TypeError("Bad key length");
};
}, {} ],
153: [ function(e, t) {
var i = e("create-hash/md5"), r = e("ripemd160"), n = e("sha.js"), a = e("safe-buffer").Buffer, s = e("./precondition"), o = e("./default-encoding"), c = e("./to-buffer"), f = a.alloc(128), h = {
md5: 16,
sha1: 20,
sha224: 28,
sha256: 32,
sha384: 48,
sha512: 64,
rmd160: 20,
ripemd160: 20
};
function u(e, t, i) {
var r = d(e), n = "sha512" === e || "sha384" === e ? 128 : 64;
t.length > n ? t = r(t) : t.length < n && (t = a.concat([ t, f ], n));
for (var s = a.allocUnsafe(n + h[e]), o = a.allocUnsafe(n + h[e]), c = 0; c < n; c++) {
s[c] = 54 ^ t[c];
o[c] = 92 ^ t[c];
}
var u = a.allocUnsafe(n + i + 4);
s.copy(u, 0, 0, n);
this.ipad1 = u;
this.ipad2 = s;
this.opad = o;
this.alg = e;
this.blocksize = n;
this.hash = r;
this.size = h[e];
}
u.prototype.run = function(e, t) {
e.copy(t, this.blocksize);
this.hash(t).copy(this.opad, this.blocksize);
return this.hash(this.opad);
};
function d(e) {
return "rmd160" === e || "ripemd160" === e ? function(e) {
return new r().update(e).digest();
} : "md5" === e ? i : function(t) {
return n(e).update(t).digest();
};
}
t.exports = function(e, t, i, r, n) {
s(i, r);
var f = new u(n = n || "sha1", e = c(e, o, "Password"), (t = c(t, o, "Salt")).length), d = a.allocUnsafe(r), l = a.allocUnsafe(t.length + 4);
t.copy(l, 0, 0, t.length);
for (var p = 0, b = h[n], g = Math.ceil(r / b), m = 1; m <= g; m++) {
l.writeUInt32BE(m, t.length);
for (var v = f.run(l, f.ipad1), y = v, _ = 1; _ < i; _++) {
y = f.run(y, f.ipad2);
for (var w = 0; w < b; w++) v[w] ^= y[w];
}
v.copy(d, p);
p += b;
}
return d;
};
}, {
"./default-encoding": 151,
"./precondition": 152,
"./to-buffer": 154,
"create-hash/md5": 72,
ripemd160: 181,
"safe-buffer": 182,
"sha.js": 185
} ],
154: [ function(e, t) {
var i = e("safe-buffer").Buffer;
t.exports = function(e, t, r) {
if (i.isBuffer(e)) return e;
if ("string" == typeof e) return i.from(e, t);
if (ArrayBuffer.isView(e)) return i.from(e.buffer);
throw new TypeError(r + " must be a string, a Buffer, a typed array or a DataView");
};
}, {
"safe-buffer": 182
} ],
155: [ function(e, t) {
(function(e) {
"use strict";
"undefined" == typeof e || !e.version || 0 === e.version.indexOf("v0.") || 0 === e.version.indexOf("v1.") && 0 !== e.version.indexOf("v1.8.") ? t.exports = {
nextTick: function(t, i, r, n) {
if ("function" != typeof t) throw new TypeError('"callback" argument must be a function');
var a, s, o = arguments.length;
switch (o) {
case 0:
case 1:
return e.nextTick(t);

case 2:
return e.nextTick(function() {
t.call(null, i);
});

case 3:
return e.nextTick(function() {
t.call(null, i, r);
});

case 4:
return e.nextTick(function() {
t.call(null, i, r, n);
});

default:
a = new Array(o - 1);
s = 0;
for (;s < a.length; ) a[s++] = arguments[s];
return e.nextTick(function() {
t.apply(null, a);
});
}
}
} : t.exports = e;
}).call(this, e("_process"));
}, {
_process: 156
} ],
156: [ function(e, t) {
var i, r, n = t.exports = {};
function a() {
throw new Error("setTimeout has not been defined");
}
function s() {
throw new Error("clearTimeout has not been defined");
}
(function() {
try {
i = "function" == typeof setTimeout ? setTimeout : a;
} catch (e) {
i = a;
}
try {
r = "function" == typeof clearTimeout ? clearTimeout : s;
} catch (e) {
r = s;
}
})();
function o(e) {
if (i === setTimeout) return setTimeout(e, 0);
if ((i === a || !i) && setTimeout) {
i = setTimeout;
return setTimeout(e, 0);
}
try {
return i(e, 0);
} catch (t) {
try {
return i.call(null, e, 0);
} catch (t) {
return i.call(this, e, 0);
}
}
}
function c(e) {
if (r === clearTimeout) return clearTimeout(e);
if ((r === s || !r) && clearTimeout) {
r = clearTimeout;
return clearTimeout(e);
}
try {
return r(e);
} catch (t) {
try {
return r.call(null, e);
} catch (t) {
return r.call(this, e);
}
}
}
var f, h = [], u = !1, d = -1;
function l() {
if (u && f) {
u = !1;
f.length ? h = f.concat(h) : d = -1;
h.length && p();
}
}
function p() {
if (!u) {
var e = o(l);
u = !0;
for (var t = h.length; t; ) {
f = h;
h = [];
for (;++d < t; ) f && f[d].run();
d = -1;
t = h.length;
}
f = null;
u = !1;
c(e);
}
}
n.nextTick = function(e) {
var t = new Array(arguments.length - 1);
if (arguments.length > 1) for (var i = 1; i < arguments.length; i++) t[i - 1] = arguments[i];
h.push(new b(e, t));
1 !== h.length || u || o(p);
};
function b(e, t) {
this.fun = e;
this.array = t;
}
b.prototype.run = function() {
this.fun.apply(null, this.array);
};
n.title = "browser";
n.browser = !0;
n.env = {};
n.argv = [];
n.version = "";
n.versions = {};
function g() {}
n.on = g;
n.addListener = g;
n.once = g;
n.off = g;
n.removeListener = g;
n.removeAllListeners = g;
n.emit = g;
n.prependListener = g;
n.prependOnceListener = g;
n.listeners = function() {
return [];
};
n.binding = function() {
throw new Error("process.binding is not supported");
};
n.cwd = function() {
return "/";
};
n.chdir = function() {
throw new Error("process.chdir is not supported");
};
n.umask = function() {
return 0;
};
}, {} ],
157: [ function(e, t, i) {
i.publicEncrypt = e("./publicEncrypt");
i.privateDecrypt = e("./privateDecrypt");
i.privateEncrypt = function(e, t) {
return i.publicEncrypt(e, t, !0);
};
i.publicDecrypt = function(e, t) {
return i.privateDecrypt(e, t, !0);
};
}, {
"./privateDecrypt": 160,
"./publicEncrypt": 161
} ],
158: [ function(e, t) {
var i = e("create-hash"), r = e("safe-buffer").Buffer;
t.exports = function(e, t) {
for (var a, s = r.alloc(0), o = 0; s.length < t; ) {
a = n(o++);
s = r.concat([ s, i("sha1").update(e).update(a).digest() ]);
}
return s.slice(0, t);
};
function n(e) {
var t = r.allocUnsafe(4);
t.writeUInt32BE(e, 0);
return t;
}
}, {
"create-hash": 71,
"safe-buffer": 182
} ],
159: [ function(e, t, i) {
arguments[4][15][0].apply(i, arguments);
}, {
buffer: 19,
dup: 15
} ],
160: [ function(e, t) {
var i = e("parse-asn1"), r = e("./mgf"), n = e("./xor"), a = e("bn.js"), s = e("browserify-rsa"), o = e("create-hash"), c = e("./withPublic"), f = e("safe-buffer").Buffer;
t.exports = function(e, t, r) {
var n;
n = e.padding ? e.padding : r ? 1 : 4;
var o, d = i(e), l = d.modulus.byteLength();
if (t.length > l || new a(t).cmp(d.modulus) >= 0) throw new Error("decryption error");
o = r ? c(new a(t), d) : s(t, d);
var p = f.alloc(l - o.length);
o = f.concat([ p, o ], l);
if (4 === n) return h(d, o);
if (1 === n) return u(0, o, r);
if (3 === n) return o;
throw new Error("unknown padding");
};
function h(e, t) {
var i = e.modulus.byteLength(), a = o("sha1").update(f.alloc(0)).digest(), s = a.length;
if (0 !== t[0]) throw new Error("decryption error");
var c = t.slice(1, s + 1), h = t.slice(s + 1), u = n(c, r(h, s)), l = n(h, r(u, i - s - 1));
if (d(a, l.slice(0, s))) throw new Error("decryption error");
for (var p = s; 0 === l[p]; ) p++;
if (1 !== l[p++]) throw new Error("decryption error");
return l.slice(p);
}
function u(e, t, i) {
for (var r = t.slice(0, 2), n = 2, a = 0; 0 !== t[n++]; ) if (n >= t.length) {
a++;
break;
}
var s = t.slice(2, n - 1);
("0002" !== r.toString("hex") && !i || "0001" !== r.toString("hex") && i) && a++;
s.length < 8 && a++;
if (a) throw new Error("decryption error");
return t.slice(n);
}
function d(e, t) {
e = f.from(e);
t = f.from(t);
var i = 0, r = e.length;
if (e.length !== t.length) {
i++;
r = Math.min(e.length, t.length);
}
for (var n = -1; ++n < r; ) i += e[n] ^ t[n];
return i;
}
}, {
"./mgf": 158,
"./withPublic": 162,
"./xor": 163,
"bn.js": 159,
"browserify-rsa": 40,
"create-hash": 71,
"parse-asn1": 148,
"safe-buffer": 182
} ],
161: [ function(e, t) {
var i = e("parse-asn1"), r = e("randombytes"), n = e("create-hash"), a = e("./mgf"), s = e("./xor"), o = e("bn.js"), c = e("./withPublic"), f = e("browserify-rsa"), h = e("safe-buffer").Buffer;
t.exports = function(e, t, r) {
var n;
n = e.padding ? e.padding : r ? 1 : 4;
var a, s = i(e);
if (4 === n) a = u(s, t); else if (1 === n) a = d(s, t, r); else {
if (3 !== n) throw new Error("unknown padding");
if ((a = new o(t)).cmp(s.modulus) >= 0) throw new Error("data too long for modulus");
}
return r ? f(a, s) : c(a, s);
};
function u(e, t) {
var i = e.modulus.byteLength(), c = t.length, f = n("sha1").update(h.alloc(0)).digest(), u = f.length, d = 2 * u;
if (c > i - d - 2) throw new Error("message too long");
var l = h.alloc(i - c - d - 2), p = i - u - 1, b = r(u), g = s(h.concat([ f, l, h.alloc(1, 1), t ], p), a(b, p)), m = s(b, a(g, u));
return new o(h.concat([ h.alloc(1), m, g ], i));
}
function d(e, t, i) {
var r, n = t.length, a = e.modulus.byteLength();
if (n > a - 11) throw new Error("message too long");
r = i ? h.alloc(a - n - 3, 255) : l(a - n - 3);
return new o(h.concat([ h.from([ 0, i ? 1 : 2 ]), r, h.alloc(1), t ], a));
}
function l(e) {
for (var t, i = h.allocUnsafe(e), n = 0, a = r(2 * e), s = 0; n < e; ) {
if (s === a.length) {
a = r(2 * e);
s = 0;
}
(t = a[s++]) && (i[n++] = t);
}
return i;
}
}, {
"./mgf": 158,
"./withPublic": 162,
"./xor": 163,
"bn.js": 159,
"browserify-rsa": 40,
"create-hash": 71,
"parse-asn1": 148,
randombytes: 164,
"safe-buffer": 182
} ],
162: [ function(e, t) {
var i = e("bn.js"), r = e("safe-buffer").Buffer;
t.exports = function(e, t) {
return r.from(e.toRed(i.mont(t.modulus)).redPow(new i(t.publicExponent)).fromRed().toArray());
};
}, {
"bn.js": 159,
"safe-buffer": 182
} ],
163: [ function(e, t) {
t.exports = function(e, t) {
for (var i = e.length, r = -1; ++r < i; ) e[r] ^= t[r];
return e;
};
}, {} ],
164: [ function(e, t) {
(function(i, r) {
"use strict";
var n = e("safe-buffer").Buffer, a = r.crypto || r.msCrypto;
a && a.getRandomValues ? t.exports = function(e, t) {
if (e > 4294967295) throw new RangeError("requested too many random bytes");
var r = n.allocUnsafe(e);
if (e > 0) if (e > 65536) for (var s = 0; s < e; s += 65536) a.getRandomValues(r.slice(s, s + 65536)); else a.getRandomValues(r);
return "function" == typeof t ? i.nextTick(function() {
t(null, r);
}) : r;
} : t.exports = function() {
throw new Error("Secure random number generation is not supported by this browser.\nUse Chrome, Firefox or Internet Explorer 11");
};
}).call(this, e("_process"), "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
}, {
_process: 156,
"safe-buffer": 182
} ],
165: [ function(e, t, i) {
(function(t, r) {
"use strict";
function n() {
throw new Error("secure random number generation not supported by this browser\nuse chrome, FireFox or Internet Explorer 11");
}
var a = e("safe-buffer"), s = e("randombytes"), o = a.Buffer, c = a.kMaxLength, f = r.crypto || r.msCrypto, h = Math.pow(2, 32) - 1;
function u(e, t) {
if ("number" != typeof e || e != e) throw new TypeError("offset must be a number");
if (e > h || e < 0) throw new TypeError("offset must be a uint32");
if (e > c || e > t) throw new RangeError("offset out of range");
}
function d(e, t, i) {
if ("number" != typeof e || e != e) throw new TypeError("size must be a number");
if (e > h || e < 0) throw new TypeError("size must be a uint32");
if (e + t > i || e > c) throw new RangeError("buffer too small");
}
if (f && f.getRandomValues || !t.browser) {
i.randomFill = function(e, t, i, n) {
if (!(o.isBuffer(e) || e instanceof r.Uint8Array)) throw new TypeError('"buf" argument must be a Buffer or Uint8Array');
if ("function" == typeof t) {
n = t;
t = 0;
i = e.length;
} else if ("function" == typeof i) {
n = i;
i = e.length - t;
} else if ("function" != typeof n) throw new TypeError('"cb" argument must be a function');
u(t, e.length);
d(i, t, e.length);
return l(e, t, i, n);
};
i.randomFillSync = function(e, t, i) {
"undefined" == typeof t && (t = 0);
if (!(o.isBuffer(e) || e instanceof r.Uint8Array)) throw new TypeError('"buf" argument must be a Buffer or Uint8Array');
u(t, e.length);
void 0 === i && (i = e.length - t);
d(i, t, e.length);
return l(e, t, i);
};
} else {
i.randomFill = n;
i.randomFillSync = n;
}
function l(e, i, r, n) {
if (t.browser) {
var a = e.buffer, o = new Uint8Array(a, i, r);
f.getRandomValues(o);
if (n) {
t.nextTick(function() {
n(null, e);
});
return;
}
return e;
}
if (!n) {
s(r).copy(e, i);
return e;
}
s(r, function(t, r) {
if (t) return n(t);
r.copy(e, i);
n(null, e);
});
}
}).call(this, e("_process"), "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
}, {
_process: 156,
randombytes: 164,
"safe-buffer": 182
} ],
166: [ function(e, t) {
t.exports = e("./lib/_stream_duplex.js");
}, {
"./lib/_stream_duplex.js": 167
} ],
167: [ function(e, t) {
"use strict";
var i = e("process-nextick-args"), r = Object.keys || function(e) {
var t = [];
for (var i in e) t.push(i);
return t;
};
t.exports = h;
var n = Object.create(e("core-util-is"));
n.inherits = e("inherits");
var a = e("./_stream_readable"), s = e("./_stream_writable");
n.inherits(h, a);
for (var o = r(s.prototype), c = 0; c < o.length; c++) {
var f = o[c];
h.prototype[f] || (h.prototype[f] = s.prototype[f]);
}
function h(e) {
if (!(this instanceof h)) return new h(e);
a.call(this, e);
s.call(this, e);
e && !1 === e.readable && (this.readable = !1);
e && !1 === e.writable && (this.writable = !1);
this.allowHalfOpen = !0;
e && !1 === e.allowHalfOpen && (this.allowHalfOpen = !1);
this.once("end", u);
}
Object.defineProperty(h.prototype, "writableHighWaterMark", {
enumerable: !1,
get: function() {
return this._writableState.highWaterMark;
}
});
function u() {
this.allowHalfOpen || this._writableState.ended || i.nextTick(d, this);
}
function d(e) {
e.end();
}
Object.defineProperty(h.prototype, "destroyed", {
get: function() {
return void 0 !== this._readableState && void 0 !== this._writableState && this._readableState.destroyed && this._writableState.destroyed;
},
set: function(e) {
if (void 0 !== this._readableState && void 0 !== this._writableState) {
this._readableState.destroyed = e;
this._writableState.destroyed = e;
}
}
});
h.prototype._destroy = function(e, t) {
this.push(null);
this.end();
i.nextTick(t, e);
};
}, {
"./_stream_readable": 169,
"./_stream_writable": 171,
"core-util-is": 68,
inherits: 138,
"process-nextick-args": 155
} ],
168: [ function(e, t) {
"use strict";
t.exports = n;
var i = e("./_stream_transform"), r = Object.create(e("core-util-is"));
r.inherits = e("inherits");
r.inherits(n, i);
function n(e) {
if (!(this instanceof n)) return new n(e);
i.call(this, e);
}
n.prototype._transform = function(e, t, i) {
i(null, e);
};
}, {
"./_stream_transform": 170,
"core-util-is": 68,
inherits: 138
} ],
169: [ function(e, t) {
(function(i, r) {
"use strict";
var n = e("process-nextick-args");
t.exports = w;
var a, s = e("isarray");
w.ReadableState = _;
e("events").EventEmitter;
var o = function(e, t) {
return e.listeners(t).length;
}, c = e("./internal/streams/stream"), f = e("safe-buffer").Buffer, h = r.Uint8Array || function() {};
function u(e) {
return f.from(e);
}
var d = Object.create(e("core-util-is"));
d.inherits = e("inherits");
var l = e("util"), p = void 0;
p = l && l.debuglog ? l.debuglog("stream") : function() {};
var b, g = e("./internal/streams/BufferList"), m = e("./internal/streams/destroy");
d.inherits(w, c);
var v = [ "error", "close", "destroy", "pause", "resume" ];
function y(e, t, i) {
if ("function" == typeof e.prependListener) return e.prependListener(t, i);
e._events && e._events[t] ? s(e._events[t]) ? e._events[t].unshift(i) : e._events[t] = [ i, e._events[t] ] : e.on(t, i);
}
function _(t, i) {
t = t || {};
var r = i instanceof (a = a || e("./_stream_duplex"));
this.objectMode = !!t.objectMode;
r && (this.objectMode = this.objectMode || !!t.readableObjectMode);
var n = t.highWaterMark, s = t.readableHighWaterMark, o = this.objectMode ? 16 : 16384;
this.highWaterMark = n || 0 === n ? n : r && (s || 0 === s) ? s : o;
this.highWaterMark = Math.floor(this.highWaterMark);
this.buffer = new g();
this.length = 0;
this.pipes = null;
this.pipesCount = 0;
this.flowing = null;
this.ended = !1;
this.endEmitted = !1;
this.reading = !1;
this.sync = !0;
this.needReadable = !1;
this.emittedReadable = !1;
this.readableListening = !1;
this.resumeScheduled = !1;
this.destroyed = !1;
this.defaultEncoding = t.defaultEncoding || "utf8";
this.awaitDrain = 0;
this.readingMore = !1;
this.decoder = null;
this.encoding = null;
if (t.encoding) {
b || (b = e("string_decoder/").StringDecoder);
this.decoder = new b(t.encoding);
this.encoding = t.encoding;
}
}
function w(t) {
a = a || e("./_stream_duplex");
if (!(this instanceof w)) return new w(t);
this._readableState = new _(t, this);
this.readable = !0;
if (t) {
"function" == typeof t.read && (this._read = t.read);
"function" == typeof t.destroy && (this._destroy = t.destroy);
}
c.call(this);
}
Object.defineProperty(w.prototype, "destroyed", {
get: function() {
return void 0 !== this._readableState && this._readableState.destroyed;
},
set: function(e) {
this._readableState && (this._readableState.destroyed = e);
}
});
w.prototype.destroy = m.destroy;
w.prototype._undestroy = m.undestroy;
w.prototype._destroy = function(e, t) {
this.push(null);
t(e);
};
w.prototype.push = function(e, t) {
var i, r = this._readableState;
if (r.objectMode) i = !0; else if ("string" == typeof e) {
if ((t = t || r.defaultEncoding) !== r.encoding) {
e = f.from(e, t);
t = "";
}
i = !0;
}
return S(this, e, t, !1, i);
};
w.prototype.unshift = function(e) {
return S(this, e, null, !0, !1);
};
function S(e, t, i, r, n) {
var a = e._readableState;
if (null === t) {
a.reading = !1;
C(e, a);
} else {
var s;
n || (s = M(a, t));
if (s) e.emit("error", s); else if (a.objectMode || t && t.length > 0) {
"string" == typeof t || a.objectMode || Object.getPrototypeOf(t) === f.prototype || (t = u(t));
if (r) a.endEmitted ? e.emit("error", new Error("stream.unshift() after end event")) : k(e, a, t, !0); else if (a.ended) e.emit("error", new Error("stream.push() after EOF")); else {
a.reading = !1;
if (a.decoder && !i) {
t = a.decoder.write(t);
a.objectMode || 0 !== t.length ? k(e, a, t, !1) : N(e, a);
} else k(e, a, t, !1);
}
} else r || (a.reading = !1);
}
return A(a);
}
function k(e, t, i, r) {
if (t.flowing && 0 === t.length && !t.sync) {
e.emit("data", i);
e.read(0);
} else {
t.length += t.objectMode ? 1 : i.length;
r ? t.buffer.unshift(i) : t.buffer.push(i);
t.needReadable && x(e);
}
N(e, t);
}
function M(e, t) {
var i, r;
(r = t, f.isBuffer(r) || r instanceof h) || "string" == typeof t || void 0 === t || e.objectMode || (i = new TypeError("Invalid non-string/buffer chunk"));
return i;
}
function A(e) {
return !e.ended && (e.needReadable || e.length < e.highWaterMark || 0 === e.length);
}
w.prototype.isPaused = function() {
return !1 === this._readableState.flowing;
};
w.prototype.setEncoding = function(t) {
b || (b = e("string_decoder/").StringDecoder);
this._readableState.decoder = new b(t);
this._readableState.encoding = t;
return this;
};
var I = 8388608;
function E(e) {
if (e >= I) e = I; else {
e--;
e |= e >>> 1;
e |= e >>> 2;
e |= e >>> 4;
e |= e >>> 8;
e |= e >>> 16;
e++;
}
return e;
}
function P(e, t) {
if (e <= 0 || 0 === t.length && t.ended) return 0;
if (t.objectMode) return 1;
if (e != e) return t.flowing && t.length ? t.buffer.head.data.length : t.length;
e > t.highWaterMark && (t.highWaterMark = E(e));
if (e <= t.length) return e;
if (!t.ended) {
t.needReadable = !0;
return 0;
}
return t.length;
}
w.prototype.read = function(e) {
p("read", e);
e = parseInt(e, 10);
var t = this._readableState, i = e;
0 !== e && (t.emittedReadable = !1);
if (0 === e && t.needReadable && (t.length >= t.highWaterMark || t.ended)) {
p("read: emitReadable", t.length, t.ended);
0 === t.length && t.ended ? H(this) : x(this);
return null;
}
if (0 === (e = P(e, t)) && t.ended) {
0 === t.length && H(this);
return null;
}
var r, n = t.needReadable;
p("need readable", n);
(0 === t.length || t.length - e < t.highWaterMark) && p("length less than watermark", n = !0);
if (t.ended || t.reading) p("reading or ended", n = !1); else if (n) {
p("do read");
t.reading = !0;
t.sync = !0;
0 === t.length && (t.needReadable = !0);
this._read(t.highWaterMark);
t.sync = !1;
t.reading || (e = P(i, t));
}
if (null === (r = e > 0 ? U(e, t) : null)) {
t.needReadable = !0;
e = 0;
} else t.length -= e;
if (0 === t.length) {
t.ended || (t.needReadable = !0);
i !== e && t.ended && H(this);
}
null !== r && this.emit("data", r);
return r;
};
function C(e, t) {
if (!t.ended) {
if (t.decoder) {
var i = t.decoder.end();
if (i && i.length) {
t.buffer.push(i);
t.length += t.objectMode ? 1 : i.length;
}
}
t.ended = !0;
x(e);
}
}
function x(e) {
var t = e._readableState;
t.needReadable = !1;
if (!t.emittedReadable) {
p("emitReadable", t.flowing);
t.emittedReadable = !0;
t.sync ? n.nextTick(O, e) : O(e);
}
}
function O(e) {
p("emit readable");
e.emit("readable");
L(e);
}
function N(e, t) {
if (!t.readingMore) {
t.readingMore = !0;
n.nextTick(T, e, t);
}
}
function T(e, t) {
for (var i = t.length; !t.reading && !t.flowing && !t.ended && t.length < t.highWaterMark; ) {
p("maybeReadMore read 0");
e.read(0);
if (i === t.length) break;
i = t.length;
}
t.readingMore = !1;
}
w.prototype._read = function() {
this.emit("error", new Error("_read() is not implemented"));
};
w.prototype.pipe = function(e, t) {
var r = this, a = this._readableState;
switch (a.pipesCount) {
case 0:
a.pipes = e;
break;

case 1:
a.pipes = [ a.pipes, e ];
break;

default:
a.pipes.push(e);
}
a.pipesCount += 1;
p("pipe count=%d opts=%j", a.pipesCount, t);
var s = t && !1 === t.end || e === i.stdout || e === i.stderr ? _ : f;
a.endEmitted ? n.nextTick(s) : r.once("end", s);
e.on("unpipe", c);
function c(e, t) {
p("onunpipe");
if (e === r && t && !1 === t.hasUnpiped) {
t.hasUnpiped = !0;
d();
}
}
function f() {
p("onend");
e.end();
}
var h = j(r);
e.on("drain", h);
var u = !1;
function d() {
p("cleanup");
e.removeListener("close", m);
e.removeListener("finish", v);
e.removeListener("drain", h);
e.removeListener("error", g);
e.removeListener("unpipe", c);
r.removeListener("end", f);
r.removeListener("end", _);
r.removeListener("data", b);
u = !0;
!a.awaitDrain || e._writableState && !e._writableState.needDrain || h();
}
var l = !1;
r.on("data", b);
function b(t) {
p("ondata");
l = !1;
if (!1 === e.write(t) && !l) {
if ((1 === a.pipesCount && a.pipes === e || a.pipesCount > 1 && -1 !== K(a.pipes, e)) && !u) {
p("false write response, pause", r._readableState.awaitDrain);
r._readableState.awaitDrain++;
l = !0;
}
r.pause();
}
}
function g(t) {
p("onerror", t);
_();
e.removeListener("error", g);
0 === o(e, "error") && e.emit("error", t);
}
y(e, "error", g);
function m() {
e.removeListener("finish", v);
_();
}
e.once("close", m);
function v() {
p("onfinish");
e.removeListener("close", m);
_();
}
e.once("finish", v);
function _() {
p("unpipe");
r.unpipe(e);
}
e.emit("pipe", r);
if (!a.flowing) {
p("pipe resume");
r.resume();
}
return e;
};
function j(e) {
return function() {
var t = e._readableState;
p("pipeOnDrain", t.awaitDrain);
t.awaitDrain && t.awaitDrain--;
if (0 === t.awaitDrain && o(e, "data")) {
t.flowing = !0;
L(e);
}
};
}
w.prototype.unpipe = function(e) {
var t = this._readableState, i = {
hasUnpiped: !1
};
if (0 === t.pipesCount) return this;
if (1 === t.pipesCount) {
if (e && e !== t.pipes) return this;
e || (e = t.pipes);
t.pipes = null;
t.pipesCount = 0;
t.flowing = !1;
e && e.emit("unpipe", this, i);
return this;
}
if (!e) {
var r = t.pipes, n = t.pipesCount;
t.pipes = null;
t.pipesCount = 0;
t.flowing = !1;
for (var a = 0; a < n; a++) r[a].emit("unpipe", this, i);
return this;
}
var s = K(t.pipes, e);
if (-1 === s) return this;
t.pipes.splice(s, 1);
t.pipesCount -= 1;
1 === t.pipesCount && (t.pipes = t.pipes[0]);
e.emit("unpipe", this, i);
return this;
};
w.prototype.on = function(e, t) {
var i = c.prototype.on.call(this, e, t);
if ("data" === e) !1 !== this._readableState.flowing && this.resume(); else if ("readable" === e) {
var r = this._readableState;
if (!r.endEmitted && !r.readableListening) {
r.readableListening = r.needReadable = !0;
r.emittedReadable = !1;
r.reading ? r.length && x(this) : n.nextTick(D, this);
}
}
return i;
};
w.prototype.addListener = w.prototype.on;
function D(e) {
p("readable nexttick read 0");
e.read(0);
}
w.prototype.resume = function() {
var e = this._readableState;
if (!e.flowing) {
p("resume");
e.flowing = !0;
R(this, e);
}
return this;
};
function R(e, t) {
if (!t.resumeScheduled) {
t.resumeScheduled = !0;
n.nextTick(B, e, t);
}
}
function B(e, t) {
if (!t.reading) {
p("resume read 0");
e.read(0);
}
t.resumeScheduled = !1;
t.awaitDrain = 0;
e.emit("resume");
L(e);
t.flowing && !t.reading && e.read(0);
}
w.prototype.pause = function() {
p("call pause flowing=%j", this._readableState.flowing);
if (!1 !== this._readableState.flowing) {
p("pause");
this._readableState.flowing = !1;
this.emit("pause");
}
return this;
};
function L(e) {
var t = e._readableState;
p("flow", t.flowing);
for (;t.flowing && null !== e.read(); ) ;
}
w.prototype.wrap = function(e) {
var t = this, i = this._readableState, r = !1;
e.on("end", function() {
p("wrapped end");
if (i.decoder && !i.ended) {
var e = i.decoder.end();
e && e.length && t.push(e);
}
t.push(null);
});
e.on("data", function(n) {
p("wrapped data");
i.decoder && (n = i.decoder.write(n));
if ((!i.objectMode || null != n) && (i.objectMode || n && n.length) && !t.push(n)) {
r = !0;
e.pause();
}
});
for (var n in e) void 0 === this[n] && "function" == typeof e[n] && (this[n] = function(t) {
return function() {
return e[t].apply(e, arguments);
};
}(n));
for (var a = 0; a < v.length; a++) e.on(v[a], this.emit.bind(this, v[a]));
this._read = function(t) {
p("wrapped _read", t);
if (r) {
r = !1;
e.resume();
}
};
return this;
};
Object.defineProperty(w.prototype, "readableHighWaterMark", {
enumerable: !1,
get: function() {
return this._readableState.highWaterMark;
}
});
w._fromList = U;
function U(e, t) {
if (0 === t.length) return null;
var i;
if (t.objectMode) i = t.buffer.shift(); else if (!e || e >= t.length) {
i = t.decoder ? t.buffer.join("") : 1 === t.buffer.length ? t.buffer.head.data : t.buffer.concat(t.length);
t.buffer.clear();
} else i = q(e, t.buffer, t.decoder);
return i;
}
function q(e, t, i) {
var r;
if (e < t.head.data.length) {
r = t.head.data.slice(0, e);
t.head.data = t.head.data.slice(e);
} else r = e === t.head.data.length ? t.shift() : i ? F(e, t) : z(e, t);
return r;
}
function F(e, t) {
var i = t.head, r = 1, n = i.data;
e -= n.length;
for (;i = i.next; ) {
var a = i.data, s = e > a.length ? a.length : e;
s === a.length ? n += a : n += a.slice(0, e);
if (0 == (e -= s)) {
if (s === a.length) {
++r;
i.next ? t.head = i.next : t.head = t.tail = null;
} else {
t.head = i;
i.data = a.slice(s);
}
break;
}
++r;
}
t.length -= r;
return n;
}
function z(e, t) {
var i = f.allocUnsafe(e), r = t.head, n = 1;
r.data.copy(i);
e -= r.data.length;
for (;r = r.next; ) {
var a = r.data, s = e > a.length ? a.length : e;
a.copy(i, i.length - e, 0, s);
if (0 == (e -= s)) {
if (s === a.length) {
++n;
r.next ? t.head = r.next : t.head = t.tail = null;
} else {
t.head = r;
r.data = a.slice(s);
}
break;
}
++n;
}
t.length -= n;
return i;
}
function H(e) {
var t = e._readableState;
if (t.length > 0) throw new Error('"endReadable()" called on non-empty stream');
if (!t.endEmitted) {
t.ended = !0;
n.nextTick(J, t, e);
}
}
function J(e, t) {
if (!e.endEmitted && 0 === e.length) {
e.endEmitted = !0;
t.readable = !1;
t.emit("end");
}
}
function K(e, t) {
for (var i = 0, r = e.length; i < r; i++) if (e[i] === t) return i;
return -1;
}
}).call(this, e("_process"), "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
}, {
"./_stream_duplex": 167,
"./internal/streams/BufferList": 172,
"./internal/streams/destroy": 173,
"./internal/streams/stream": 174,
_process: 156,
"core-util-is": 68,
events: 104,
inherits: 138,
isarray: 175,
"process-nextick-args": 155,
"safe-buffer": 182,
"string_decoder/": 176,
util: 19
} ],
170: [ function(e, t) {
"use strict";
t.exports = a;
var i = e("./_stream_duplex"), r = Object.create(e("core-util-is"));
r.inherits = e("inherits");
r.inherits(a, i);
function n(e, t) {
var i = this._transformState;
i.transforming = !1;
var r = i.writecb;
if (!r) return this.emit("error", new Error("write callback called multiple times"));
i.writechunk = null;
i.writecb = null;
null != t && this.push(t);
r(e);
var n = this._readableState;
n.reading = !1;
(n.needReadable || n.length < n.highWaterMark) && this._read(n.highWaterMark);
}
function a(e) {
if (!(this instanceof a)) return new a(e);
i.call(this, e);
this._transformState = {
afterTransform: n.bind(this),
needTransform: !1,
transforming: !1,
writecb: null,
writechunk: null,
writeencoding: null
};
this._readableState.needReadable = !0;
this._readableState.sync = !1;
if (e) {
"function" == typeof e.transform && (this._transform = e.transform);
"function" == typeof e.flush && (this._flush = e.flush);
}
this.on("prefinish", s);
}
function s() {
var e = this;
"function" == typeof this._flush ? this._flush(function(t, i) {
o(e, t, i);
}) : o(this, null, null);
}
a.prototype.push = function(e, t) {
this._transformState.needTransform = !1;
return i.prototype.push.call(this, e, t);
};
a.prototype._transform = function() {
throw new Error("_transform() is not implemented");
};
a.prototype._write = function(e, t, i) {
var r = this._transformState;
r.writecb = i;
r.writechunk = e;
r.writeencoding = t;
if (!r.transforming) {
var n = this._readableState;
(r.needTransform || n.needReadable || n.length < n.highWaterMark) && this._read(n.highWaterMark);
}
};
a.prototype._read = function() {
var e = this._transformState;
if (null !== e.writechunk && e.writecb && !e.transforming) {
e.transforming = !0;
this._transform(e.writechunk, e.writeencoding, e.afterTransform);
} else e.needTransform = !0;
};
a.prototype._destroy = function(e, t) {
var r = this;
i.prototype._destroy.call(this, e, function(e) {
t(e);
r.emit("close");
});
};
function o(e, t, i) {
if (t) return e.emit("error", t);
null != i && e.push(i);
if (e._writableState.length) throw new Error("Calling transform done when ws.length != 0");
if (e._transformState.transforming) throw new Error("Calling transform done when still transforming");
return e.push(null);
}
}, {
"./_stream_duplex": 167,
"core-util-is": 68,
inherits: 138
} ],
171: [ function(e, t) {
(function(i, r) {
"use strict";
var n = e("process-nextick-args");
t.exports = v;
function a(e) {
var t = this;
this.next = null;
this.entry = null;
this.finish = function() {
D(t, e);
};
}
var s, o = !i.browser && [ "v0.10", "v0.9." ].indexOf(i.version.slice(0, 5)) > -1 ? setImmediate : n.nextTick;
v.WritableState = m;
var c = Object.create(e("core-util-is"));
c.inherits = e("inherits");
var f = {
deprecate: e("util-deprecate")
}, h = e("./internal/streams/stream"), u = e("safe-buffer").Buffer, d = r.Uint8Array || function() {};
function l(e) {
return u.from(e);
}
var p, b = e("./internal/streams/destroy");
c.inherits(v, h);
function g() {}
function m(t, i) {
s = s || e("./_stream_duplex");
t = t || {};
var r = i instanceof s;
this.objectMode = !!t.objectMode;
r && (this.objectMode = this.objectMode || !!t.writableObjectMode);
var n = t.highWaterMark, o = t.writableHighWaterMark, c = this.objectMode ? 16 : 16384;
this.highWaterMark = n || 0 === n ? n : r && (o || 0 === o) ? o : c;
this.highWaterMark = Math.floor(this.highWaterMark);
this.finalCalled = !1;
this.needDrain = !1;
this.ending = !1;
this.ended = !1;
this.finished = !1;
this.destroyed = !1;
var f = !1 === t.decodeStrings;
this.decodeStrings = !f;
this.defaultEncoding = t.defaultEncoding || "utf8";
this.length = 0;
this.writing = !1;
this.corked = 0;
this.sync = !0;
this.bufferProcessing = !1;
this.onwrite = function(e) {
I(i, e);
};
this.writecb = null;
this.writelen = 0;
this.bufferedRequest = null;
this.lastBufferedRequest = null;
this.pendingcb = 0;
this.prefinished = !1;
this.errorEmitted = !1;
this.bufferedRequestCount = 0;
this.corkedRequestsFree = new a(this);
}
m.prototype.getBuffer = function() {
for (var e = this.bufferedRequest, t = []; e; ) {
t.push(e);
e = e.next;
}
return t;
};
(function() {
try {
Object.defineProperty(m.prototype, "buffer", {
get: f.deprecate(function() {
return this.getBuffer();
}, "_writableState.buffer is deprecated. Use _writableState.getBuffer instead.", "DEP0003")
});
} catch (e) {}
})();
if ("function" == typeof Symbol && Symbol.hasInstance && "function" == typeof Function.prototype[Symbol.hasInstance]) {
p = Function.prototype[Symbol.hasInstance];
Object.defineProperty(v, Symbol.hasInstance, {
value: function(e) {
return !!p.call(this, e) || this === v && e && e._writableState instanceof m;
}
});
} else p = function(e) {
return e instanceof this;
};
function v(t) {
s = s || e("./_stream_duplex");
if (!(p.call(v, this) || this instanceof s)) return new v(t);
this._writableState = new m(t, this);
this.writable = !0;
if (t) {
"function" == typeof t.write && (this._write = t.write);
"function" == typeof t.writev && (this._writev = t.writev);
"function" == typeof t.destroy && (this._destroy = t.destroy);
"function" == typeof t.final && (this._final = t.final);
}
h.call(this);
}
v.prototype.pipe = function() {
this.emit("error", new Error("Cannot pipe, not readable"));
};
function y(e, t) {
var i = new Error("write after end");
e.emit("error", i);
n.nextTick(t, i);
}
function _(e, t, i, r) {
var a = !0, s = !1;
null === i ? s = new TypeError("May not write null values to stream") : "string" == typeof i || void 0 === i || t.objectMode || (s = new TypeError("Invalid non-string/buffer chunk"));
if (s) {
e.emit("error", s);
n.nextTick(r, s);
a = !1;
}
return a;
}
v.prototype.write = function(e, t, i) {
var r, n = this._writableState, a = !1, s = !n.objectMode && (r = e, u.isBuffer(r) || r instanceof d);
s && !u.isBuffer(e) && (e = l(e));
if ("function" == typeof t) {
i = t;
t = null;
}
s ? t = "buffer" : t || (t = n.defaultEncoding);
"function" != typeof i && (i = g);
if (n.ended) y(this, i); else if (s || _(this, n, e, i)) {
n.pendingcb++;
a = S(this, n, s, e, t, i);
}
return a;
};
v.prototype.cork = function() {
this._writableState.corked++;
};
v.prototype.uncork = function() {
var e = this._writableState;
if (e.corked) {
e.corked--;
e.writing || e.corked || e.finished || e.bufferProcessing || !e.bufferedRequest || C(this, e);
}
};
v.prototype.setDefaultEncoding = function(e) {
"string" == typeof e && (e = e.toLowerCase());
if (!([ "hex", "utf8", "utf-8", "ascii", "binary", "base64", "ucs2", "ucs-2", "utf16le", "utf-16le", "raw" ].indexOf((e + "").toLowerCase()) > -1)) throw new TypeError("Unknown encoding: " + e);
this._writableState.defaultEncoding = e;
return this;
};
function w(e, t, i) {
e.objectMode || !1 === e.decodeStrings || "string" != typeof t || (t = u.from(t, i));
return t;
}
Object.defineProperty(v.prototype, "writableHighWaterMark", {
enumerable: !1,
get: function() {
return this._writableState.highWaterMark;
}
});
function S(e, t, i, r, n, a) {
if (!i) {
var s = w(t, r, n);
if (r !== s) {
i = !0;
n = "buffer";
r = s;
}
}
var o = t.objectMode ? 1 : r.length;
t.length += o;
var c = t.length < t.highWaterMark;
c || (t.needDrain = !0);
if (t.writing || t.corked) {
var f = t.lastBufferedRequest;
t.lastBufferedRequest = {
chunk: r,
encoding: n,
isBuf: i,
callback: a,
next: null
};
f ? f.next = t.lastBufferedRequest : t.bufferedRequest = t.lastBufferedRequest;
t.bufferedRequestCount += 1;
} else k(e, t, !1, o, r, n, a);
return c;
}
function k(e, t, i, r, n, a, s) {
t.writelen = r;
t.writecb = s;
t.writing = !0;
t.sync = !0;
i ? e._writev(n, t.onwrite) : e._write(n, a, t.onwrite);
t.sync = !1;
}
function M(e, t, i, r, a) {
--t.pendingcb;
if (i) {
n.nextTick(a, r);
n.nextTick(T, e, t);
e._writableState.errorEmitted = !0;
e.emit("error", r);
} else {
a(r);
e._writableState.errorEmitted = !0;
e.emit("error", r);
T(e, t);
}
}
function A(e) {
e.writing = !1;
e.writecb = null;
e.length -= e.writelen;
e.writelen = 0;
}
function I(e, t) {
var i = e._writableState, r = i.sync, n = i.writecb;
A(i);
if (t) M(e, i, r, t, n); else {
var a = x(i);
a || i.corked || i.bufferProcessing || !i.bufferedRequest || C(e, i);
r ? o(E, e, i, a, n) : E(e, i, a, n);
}
}
function E(e, t, i, r) {
i || P(e, t);
t.pendingcb--;
r();
T(e, t);
}
function P(e, t) {
if (0 === t.length && t.needDrain) {
t.needDrain = !1;
e.emit("drain");
}
}
function C(e, t) {
t.bufferProcessing = !0;
var i = t.bufferedRequest;
if (e._writev && i && i.next) {
var r = t.bufferedRequestCount, n = new Array(r), s = t.corkedRequestsFree;
s.entry = i;
for (var o = 0, c = !0; i; ) {
n[o] = i;
i.isBuf || (c = !1);
i = i.next;
o += 1;
}
n.allBuffers = c;
k(e, t, !0, t.length, n, "", s.finish);
t.pendingcb++;
t.lastBufferedRequest = null;
if (s.next) {
t.corkedRequestsFree = s.next;
s.next = null;
} else t.corkedRequestsFree = new a(t);
t.bufferedRequestCount = 0;
} else {
for (;i; ) {
var f = i.chunk, h = i.encoding, u = i.callback;
k(e, t, !1, t.objectMode ? 1 : f.length, f, h, u);
i = i.next;
t.bufferedRequestCount--;
if (t.writing) break;
}
null === i && (t.lastBufferedRequest = null);
}
t.bufferedRequest = i;
t.bufferProcessing = !1;
}
v.prototype._write = function(e, t, i) {
i(new Error("_write() is not implemented"));
};
v.prototype._writev = null;
v.prototype.end = function(e, t, i) {
var r = this._writableState;
if ("function" == typeof e) {
i = e;
e = null;
t = null;
} else if ("function" == typeof t) {
i = t;
t = null;
}
null != e && this.write(e, t);
if (r.corked) {
r.corked = 1;
this.uncork();
}
r.ending || r.finished || j(this, r, i);
};
function x(e) {
return e.ending && 0 === e.length && null === e.bufferedRequest && !e.finished && !e.writing;
}
function O(e, t) {
e._final(function(i) {
t.pendingcb--;
i && e.emit("error", i);
t.prefinished = !0;
e.emit("prefinish");
T(e, t);
});
}
function N(e, t) {
if (!t.prefinished && !t.finalCalled) if ("function" == typeof e._final) {
t.pendingcb++;
t.finalCalled = !0;
n.nextTick(O, e, t);
} else {
t.prefinished = !0;
e.emit("prefinish");
}
}
function T(e, t) {
var i = x(t);
if (i) {
N(e, t);
if (0 === t.pendingcb) {
t.finished = !0;
e.emit("finish");
}
}
return i;
}
function j(e, t, i) {
t.ending = !0;
T(e, t);
i && (t.finished ? n.nextTick(i) : e.once("finish", i));
t.ended = !0;
e.writable = !1;
}
function D(e, t, i) {
var r = e.entry;
e.entry = null;
for (;r; ) {
var n = r.callback;
t.pendingcb--;
n(i);
r = r.next;
}
t.corkedRequestsFree ? t.corkedRequestsFree.next = e : t.corkedRequestsFree = e;
}
Object.defineProperty(v.prototype, "destroyed", {
get: function() {
return void 0 !== this._writableState && this._writableState.destroyed;
},
set: function(e) {
this._writableState && (this._writableState.destroyed = e);
}
});
v.prototype.destroy = b.destroy;
v.prototype._undestroy = b.undestroy;
v.prototype._destroy = function(e, t) {
this.end();
t(e);
};
}).call(this, e("_process"), "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
}, {
"./_stream_duplex": 167,
"./internal/streams/destroy": 173,
"./internal/streams/stream": 174,
_process: 156,
"core-util-is": 68,
inherits: 138,
"process-nextick-args": 155,
"safe-buffer": 182,
"util-deprecate": 194
} ],
172: [ function(e, t) {
"use strict";
function i(e, t) {
if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
}
var r = e("safe-buffer").Buffer, n = e("util");
t.exports = function() {
function e() {
i(this, e);
this.head = null;
this.tail = null;
this.length = 0;
}
e.prototype.push = function(e) {
var t = {
data: e,
next: null
};
this.length > 0 ? this.tail.next = t : this.head = t;
this.tail = t;
++this.length;
};
e.prototype.unshift = function(e) {
var t = {
data: e,
next: this.head
};
0 === this.length && (this.tail = t);
this.head = t;
++this.length;
};
e.prototype.shift = function() {
if (0 !== this.length) {
var e = this.head.data;
1 === this.length ? this.head = this.tail = null : this.head = this.head.next;
--this.length;
return e;
}
};
e.prototype.clear = function() {
this.head = this.tail = null;
this.length = 0;
};
e.prototype.join = function(e) {
if (0 === this.length) return "";
for (var t = this.head, i = "" + t.data; t = t.next; ) i += e + t.data;
return i;
};
e.prototype.concat = function(e) {
if (0 === this.length) return r.alloc(0);
if (1 === this.length) return this.head.data;
for (var t, i, n = r.allocUnsafe(e >>> 0), a = this.head, s = 0; a; ) {
t = n, i = s, a.data.copy(t, i);
s += a.data.length;
a = a.next;
}
return n;
};
return e;
}();
n && n.inspect && n.inspect.custom && (t.exports.prototype[n.inspect.custom] = function() {
var e = n.inspect({
length: this.length
});
return this.constructor.name + " " + e;
});
}, {
"safe-buffer": 182,
util: 19
} ],
173: [ function(e, t) {
"use strict";
var i = e("process-nextick-args");
function r(e, t) {
e.emit("error", t);
}
t.exports = {
destroy: function(e, t) {
var n = this, a = this._readableState && this._readableState.destroyed, s = this._writableState && this._writableState.destroyed;
if (a || s) {
t ? t(e) : !e || this._writableState && this._writableState.errorEmitted || i.nextTick(r, this, e);
return this;
}
this._readableState && (this._readableState.destroyed = !0);
this._writableState && (this._writableState.destroyed = !0);
this._destroy(e || null, function(e) {
if (!t && e) {
i.nextTick(r, n, e);
n._writableState && (n._writableState.errorEmitted = !0);
} else t && t(e);
});
return this;
},
undestroy: function() {
if (this._readableState) {
this._readableState.destroyed = !1;
this._readableState.reading = !1;
this._readableState.ended = !1;
this._readableState.endEmitted = !1;
}
if (this._writableState) {
this._writableState.destroyed = !1;
this._writableState.ended = !1;
this._writableState.ending = !1;
this._writableState.finished = !1;
this._writableState.errorEmitted = !1;
}
}
};
}, {
"process-nextick-args": 155
} ],
174: [ function(e, t, i) {
arguments[4][60][0].apply(i, arguments);
}, {
dup: 60,
events: 104
} ],
175: [ function(e, t, i) {
arguments[4][66][0].apply(i, arguments);
}, {
dup: 66
} ],
176: [ function(e, t, i) {
arguments[4][63][0].apply(i, arguments);
}, {
dup: 63,
"safe-buffer": 182
} ],
177: [ function(e, t) {
t.exports = e("./readable").PassThrough;
}, {
"./readable": 178
} ],
178: [ function(e, t, i) {
(i = t.exports = e("./lib/_stream_readable.js")).Stream = i;
i.Readable = i;
i.Writable = e("./lib/_stream_writable.js");
i.Duplex = e("./lib/_stream_duplex.js");
i.Transform = e("./lib/_stream_transform.js");
i.PassThrough = e("./lib/_stream_passthrough.js");
}, {
"./lib/_stream_duplex.js": 167,
"./lib/_stream_passthrough.js": 168,
"./lib/_stream_readable.js": 169,
"./lib/_stream_transform.js": 170,
"./lib/_stream_writable.js": 171
} ],
179: [ function(e, t) {
t.exports = e("./readable").Transform;
}, {
"./readable": 178
} ],
180: [ function(e, t) {
t.exports = e("./lib/_stream_writable.js");
}, {
"./lib/_stream_writable.js": 171
} ],
181: [ function(e, t) {
"use strict";
var i = e("buffer").Buffer, r = e("inherits"), n = e("hash-base"), a = new Array(16), s = [ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13 ], o = [ 5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11 ], c = [ 11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6 ], f = [ 8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11 ], h = [ 0, 1518500249, 1859775393, 2400959708, 2840853838 ], u = [ 1352829926, 1548603684, 1836072691, 2053994217, 0 ];
function d() {
n.call(this, 64);
this._a = 1732584193;
this._b = 4023233417;
this._c = 2562383102;
this._d = 271733878;
this._e = 3285377520;
}
r(d, n);
d.prototype._update = function() {
for (var e = a, t = 0; t < 16; ++t) e[t] = this._block.readInt32LE(4 * t);
for (var i = 0 | this._a, r = 0 | this._b, n = 0 | this._c, d = 0 | this._d, y = 0 | this._e, _ = 0 | this._a, w = 0 | this._b, S = 0 | this._c, k = 0 | this._d, M = 0 | this._e, A = 0; A < 80; A += 1) {
var I, E;
if (A < 16) {
I = p(i, r, n, d, y, e[s[A]], h[0], c[A]);
E = v(_, w, S, k, M, e[o[A]], u[0], f[A]);
} else if (A < 32) {
I = b(i, r, n, d, y, e[s[A]], h[1], c[A]);
E = m(_, w, S, k, M, e[o[A]], u[1], f[A]);
} else if (A < 48) {
I = g(i, r, n, d, y, e[s[A]], h[2], c[A]);
E = g(_, w, S, k, M, e[o[A]], u[2], f[A]);
} else if (A < 64) {
I = m(i, r, n, d, y, e[s[A]], h[3], c[A]);
E = b(_, w, S, k, M, e[o[A]], u[3], f[A]);
} else {
I = v(i, r, n, d, y, e[s[A]], h[4], c[A]);
E = p(_, w, S, k, M, e[o[A]], u[4], f[A]);
}
i = y;
y = d;
d = l(n, 10);
n = r;
r = I;
_ = M;
M = k;
k = l(S, 10);
S = w;
w = E;
}
var P = this._b + n + k | 0;
this._b = this._c + d + M | 0;
this._c = this._d + y + _ | 0;
this._d = this._e + i + w | 0;
this._e = this._a + r + S | 0;
this._a = P;
};
d.prototype._digest = function() {
this._block[this._blockOffset++] = 128;
if (this._blockOffset > 56) {
this._block.fill(0, this._blockOffset, 64);
this._update();
this._blockOffset = 0;
}
this._block.fill(0, this._blockOffset, 56);
this._block.writeUInt32LE(this._length[0], 56);
this._block.writeUInt32LE(this._length[1], 60);
this._update();
var e = i.alloc ? i.alloc(20) : new i(20);
e.writeInt32LE(this._a, 0);
e.writeInt32LE(this._b, 4);
e.writeInt32LE(this._c, 8);
e.writeInt32LE(this._d, 12);
e.writeInt32LE(this._e, 16);
return e;
};
function l(e, t) {
return e << t | e >>> 32 - t;
}
function p(e, t, i, r, n, a, s, o) {
return l(e + (t ^ i ^ r) + a + s | 0, o) + n | 0;
}
function b(e, t, i, r, n, a, s, o) {
return l(e + (t & i | ~t & r) + a + s | 0, o) + n | 0;
}
function g(e, t, i, r, n, a, s, o) {
return l(e + ((t | ~i) ^ r) + a + s | 0, o) + n | 0;
}
function m(e, t, i, r, n, a, s, o) {
return l(e + (t & r | i & ~r) + a + s | 0, o) + n | 0;
}
function v(e, t, i, r, n, a, s, o) {
return l(e + (t ^ (i | ~r)) + a + s | 0, o) + n | 0;
}
t.exports = d;
}, {
buffer: 65,
"hash-base": 106,
inherits: 138
} ],
182: [ function(e, t, i) {
var r = e("buffer"), n = r.Buffer;
function a(e, t) {
for (var i in e) t[i] = e[i];
}
if (n.from && n.alloc && n.allocUnsafe && n.allocUnsafeSlow) t.exports = r; else {
a(r, i);
i.Buffer = s;
}
function s(e, t, i) {
return n(e, t, i);
}
a(n, s);
s.from = function(e, t, i) {
if ("number" == typeof e) throw new TypeError("Argument must not be a number");
return n(e, t, i);
};
s.alloc = function(e, t, i) {
if ("number" != typeof e) throw new TypeError("Argument must be a number");
var r = n(e);
void 0 !== t ? "string" == typeof i ? r.fill(t, i) : r.fill(t) : r.fill(0);
return r;
};
s.allocUnsafe = function(e) {
if ("number" != typeof e) throw new TypeError("Argument must be a number");
return n(e);
};
s.allocUnsafeSlow = function(e) {
if ("number" != typeof e) throw new TypeError("Argument must be a number");
return r.SlowBuffer(e);
};
}, {
buffer: 65
} ],
183: [ function(e, t) {
(function(i) {
"use strict";
var r, n = e("buffer"), a = n.Buffer, s = {};
for (r in n) n.hasOwnProperty(r) && "SlowBuffer" !== r && "Buffer" !== r && (s[r] = n[r]);
var o = s.Buffer = {};
for (r in a) a.hasOwnProperty(r) && "allocUnsafe" !== r && "allocUnsafeSlow" !== r && (o[r] = a[r]);
s.Buffer.prototype = a.prototype;
o.from && o.from !== Uint8Array.from || (o.from = function(e, t, i) {
if ("number" == typeof e) throw new TypeError('The "value" argument must not be of type number. Received type ' + typeof e);
if (e && "undefined" == typeof e.length) throw new TypeError("The first argument must be one of type string, Buffer, ArrayBuffer, Array, or Array-like Object. Received type " + typeof e);
return a(e, t, i);
});
o.alloc || (o.alloc = function(e, t, i) {
if ("number" != typeof e) throw new TypeError('The "size" argument must be of type number. Received type ' + typeof e);
if (e < 0 || e >= 2 * (1 << 30)) throw new RangeError('The value "' + e + '" is invalid for option "size"');
var r = a(e);
t && 0 !== t.length ? "string" == typeof i ? r.fill(t, i) : r.fill(t) : r.fill(0);
return r;
});
if (!s.kStringMaxLength) try {
s.kStringMaxLength = i.binding("buffer").kStringMaxLength;
} catch (e) {}
if (!s.constants) {
s.constants = {
MAX_LENGTH: s.kMaxLength
};
s.kStringMaxLength && (s.constants.MAX_STRING_LENGTH = s.kStringMaxLength);
}
t.exports = s;
}).call(this, e("_process"));
}, {
_process: 156,
buffer: 65
} ],
184: [ function(e, t) {
var i = e("safe-buffer").Buffer;
function r(e, t) {
this._block = i.alloc(e);
this._finalSize = t;
this._blockSize = e;
this._len = 0;
}
r.prototype.update = function(e, t) {
if ("string" == typeof e) {
t = t || "utf8";
e = i.from(e, t);
}
for (var r = this._block, n = this._blockSize, a = e.length, s = this._len, o = 0; o < a; ) {
for (var c = s % n, f = Math.min(a - o, n - c), h = 0; h < f; h++) r[c + h] = e[o + h];
o += f;
(s += f) % n == 0 && this._update(r);
}
this._len += a;
return this;
};
r.prototype.digest = function(e) {
var t = this._len % this._blockSize;
this._block[t] = 128;
this._block.fill(0, t + 1);
if (t >= this._finalSize) {
this._update(this._block);
this._block.fill(0);
}
var i = 8 * this._len;
if (i <= 4294967295) this._block.writeUInt32BE(i, this._blockSize - 4); else {
var r = (4294967295 & i) >>> 0, n = (i - r) / 4294967296;
this._block.writeUInt32BE(n, this._blockSize - 8);
this._block.writeUInt32BE(r, this._blockSize - 4);
}
this._update(this._block);
var a = this._hash();
return e ? a.toString(e) : a;
};
r.prototype._update = function() {
throw new Error("_update must be implemented by subclass");
};
t.exports = r;
}, {
"safe-buffer": 182
} ],
185: [ function(e, t, i) {
(i = t.exports = function(e) {
e = e.toLowerCase();
var t = i[e];
if (!t) throw new Error(e + " is not supported (we accept pull requests)");
return new t();
}).sha = e("./sha");
i.sha1 = e("./sha1");
i.sha224 = e("./sha224");
i.sha256 = e("./sha256");
i.sha384 = e("./sha384");
i.sha512 = e("./sha512");
}, {
"./sha": 186,
"./sha1": 187,
"./sha224": 188,
"./sha256": 189,
"./sha384": 190,
"./sha512": 191
} ],
186: [ function(e, t) {
var i = e("inherits"), r = e("./hash"), n = e("safe-buffer").Buffer, a = [ 1518500249, 1859775393, -1894007588, -899497514 ], s = new Array(80);
function o() {
this.init();
this._w = s;
r.call(this, 64, 56);
}
i(o, r);
o.prototype.init = function() {
this._a = 1732584193;
this._b = 4023233417;
this._c = 2562383102;
this._d = 271733878;
this._e = 3285377520;
return this;
};
function c(e) {
return e << 30 | e >>> 2;
}
function f(e, t, i, r) {
return 0 === e ? t & i | ~t & r : 2 === e ? t & i | t & r | i & r : t ^ i ^ r;
}
o.prototype._update = function(e) {
for (var t, i = this._w, r = 0 | this._a, n = 0 | this._b, s = 0 | this._c, o = 0 | this._d, h = 0 | this._e, u = 0; u < 16; ++u) i[u] = e.readInt32BE(4 * u);
for (;u < 80; ++u) i[u] = i[u - 3] ^ i[u - 8] ^ i[u - 14] ^ i[u - 16];
for (var d = 0; d < 80; ++d) {
var l = ~~(d / 20), p = ((t = r) << 5 | t >>> 27) + f(l, n, s, o) + h + i[d] + a[l] | 0;
h = o;
o = s;
s = c(n);
n = r;
r = p;
}
this._a = r + this._a | 0;
this._b = n + this._b | 0;
this._c = s + this._c | 0;
this._d = o + this._d | 0;
this._e = h + this._e | 0;
};
o.prototype._hash = function() {
var e = n.allocUnsafe(20);
e.writeInt32BE(0 | this._a, 0);
e.writeInt32BE(0 | this._b, 4);
e.writeInt32BE(0 | this._c, 8);
e.writeInt32BE(0 | this._d, 12);
e.writeInt32BE(0 | this._e, 16);
return e;
};
t.exports = o;
}, {
"./hash": 184,
inherits: 138,
"safe-buffer": 182
} ],
187: [ function(e, t) {
var i = e("inherits"), r = e("./hash"), n = e("safe-buffer").Buffer, a = [ 1518500249, 1859775393, -1894007588, -899497514 ], s = new Array(80);
function o() {
this.init();
this._w = s;
r.call(this, 64, 56);
}
i(o, r);
o.prototype.init = function() {
this._a = 1732584193;
this._b = 4023233417;
this._c = 2562383102;
this._d = 271733878;
this._e = 3285377520;
return this;
};
function c(e) {
return e << 5 | e >>> 27;
}
function f(e) {
return e << 30 | e >>> 2;
}
function h(e, t, i, r) {
return 0 === e ? t & i | ~t & r : 2 === e ? t & i | t & r | i & r : t ^ i ^ r;
}
o.prototype._update = function(e) {
for (var t, i = this._w, r = 0 | this._a, n = 0 | this._b, s = 0 | this._c, o = 0 | this._d, u = 0 | this._e, d = 0; d < 16; ++d) i[d] = e.readInt32BE(4 * d);
for (;d < 80; ++d) i[d] = (t = i[d - 3] ^ i[d - 8] ^ i[d - 14] ^ i[d - 16]) << 1 | t >>> 31;
for (var l = 0; l < 80; ++l) {
var p = ~~(l / 20), b = c(r) + h(p, n, s, o) + u + i[l] + a[p] | 0;
u = o;
o = s;
s = f(n);
n = r;
r = b;
}
this._a = r + this._a | 0;
this._b = n + this._b | 0;
this._c = s + this._c | 0;
this._d = o + this._d | 0;
this._e = u + this._e | 0;
};
o.prototype._hash = function() {
var e = n.allocUnsafe(20);
e.writeInt32BE(0 | this._a, 0);
e.writeInt32BE(0 | this._b, 4);
e.writeInt32BE(0 | this._c, 8);
e.writeInt32BE(0 | this._d, 12);
e.writeInt32BE(0 | this._e, 16);
return e;
};
t.exports = o;
}, {
"./hash": 184,
inherits: 138,
"safe-buffer": 182
} ],
188: [ function(e, t) {
var i = e("inherits"), r = e("./sha256"), n = e("./hash"), a = e("safe-buffer").Buffer, s = new Array(64);
function o() {
this.init();
this._w = s;
n.call(this, 64, 56);
}
i(o, r);
o.prototype.init = function() {
this._a = 3238371032;
this._b = 914150663;
this._c = 812702999;
this._d = 4144912697;
this._e = 4290775857;
this._f = 1750603025;
this._g = 1694076839;
this._h = 3204075428;
return this;
};
o.prototype._hash = function() {
var e = a.allocUnsafe(28);
e.writeInt32BE(this._a, 0);
e.writeInt32BE(this._b, 4);
e.writeInt32BE(this._c, 8);
e.writeInt32BE(this._d, 12);
e.writeInt32BE(this._e, 16);
e.writeInt32BE(this._f, 20);
e.writeInt32BE(this._g, 24);
return e;
};
t.exports = o;
}, {
"./hash": 184,
"./sha256": 189,
inherits: 138,
"safe-buffer": 182
} ],
189: [ function(e, t) {
var i = e("inherits"), r = e("./hash"), n = e("safe-buffer").Buffer, a = [ 1116352408, 1899447441, 3049323471, 3921009573, 961987163, 1508970993, 2453635748, 2870763221, 3624381080, 310598401, 607225278, 1426881987, 1925078388, 2162078206, 2614888103, 3248222580, 3835390401, 4022224774, 264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, 2554220882, 2821834349, 2952996808, 3210313671, 3336571891, 3584528711, 113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291, 1695183700, 1986661051, 2177026350, 2456956037, 2730485921, 2820302411, 3259730800, 3345764771, 3516065817, 3600352804, 4094571909, 275423344, 430227734, 506948616, 659060556, 883997877, 958139571, 1322822218, 1537002063, 1747873779, 1955562222, 2024104815, 2227730452, 2361852424, 2428436474, 2756734187, 3204031479, 3329325298 ], s = new Array(64);
function o() {
this.init();
this._w = s;
r.call(this, 64, 56);
}
i(o, r);
o.prototype.init = function() {
this._a = 1779033703;
this._b = 3144134277;
this._c = 1013904242;
this._d = 2773480762;
this._e = 1359893119;
this._f = 2600822924;
this._g = 528734635;
this._h = 1541459225;
return this;
};
function c(e, t, i) {
return i ^ e & (t ^ i);
}
function f(e, t, i) {
return e & t | i & (e | t);
}
function h(e) {
return (e >>> 2 | e << 30) ^ (e >>> 13 | e << 19) ^ (e >>> 22 | e << 10);
}
function u(e) {
return (e >>> 6 | e << 26) ^ (e >>> 11 | e << 21) ^ (e >>> 25 | e << 7);
}
function d(e) {
return (e >>> 7 | e << 25) ^ (e >>> 18 | e << 14) ^ e >>> 3;
}
o.prototype._update = function(e) {
for (var t, i = this._w, r = 0 | this._a, n = 0 | this._b, s = 0 | this._c, o = 0 | this._d, l = 0 | this._e, p = 0 | this._f, b = 0 | this._g, g = 0 | this._h, m = 0; m < 16; ++m) i[m] = e.readInt32BE(4 * m);
for (;m < 64; ++m) i[m] = (((t = i[m - 2]) >>> 17 | t << 15) ^ (t >>> 19 | t << 13) ^ t >>> 10) + i[m - 7] + d(i[m - 15]) + i[m - 16] | 0;
for (var v = 0; v < 64; ++v) {
var y = g + u(l) + c(l, p, b) + a[v] + i[v] | 0, _ = h(r) + f(r, n, s) | 0;
g = b;
b = p;
p = l;
l = o + y | 0;
o = s;
s = n;
n = r;
r = y + _ | 0;
}
this._a = r + this._a | 0;
this._b = n + this._b | 0;
this._c = s + this._c | 0;
this._d = o + this._d | 0;
this._e = l + this._e | 0;
this._f = p + this._f | 0;
this._g = b + this._g | 0;
this._h = g + this._h | 0;
};
o.prototype._hash = function() {
var e = n.allocUnsafe(32);
e.writeInt32BE(this._a, 0);
e.writeInt32BE(this._b, 4);
e.writeInt32BE(this._c, 8);
e.writeInt32BE(this._d, 12);
e.writeInt32BE(this._e, 16);
e.writeInt32BE(this._f, 20);
e.writeInt32BE(this._g, 24);
e.writeInt32BE(this._h, 28);
return e;
};
t.exports = o;
}, {
"./hash": 184,
inherits: 138,
"safe-buffer": 182
} ],
190: [ function(e, t) {
var i = e("inherits"), r = e("./sha512"), n = e("./hash"), a = e("safe-buffer").Buffer, s = new Array(160);
function o() {
this.init();
this._w = s;
n.call(this, 128, 112);
}
i(o, r);
o.prototype.init = function() {
this._ah = 3418070365;
this._bh = 1654270250;
this._ch = 2438529370;
this._dh = 355462360;
this._eh = 1731405415;
this._fh = 2394180231;
this._gh = 3675008525;
this._hh = 1203062813;
this._al = 3238371032;
this._bl = 914150663;
this._cl = 812702999;
this._dl = 4144912697;
this._el = 4290775857;
this._fl = 1750603025;
this._gl = 1694076839;
this._hl = 3204075428;
return this;
};
o.prototype._hash = function() {
var e = a.allocUnsafe(48);
function t(t, i, r) {
e.writeInt32BE(t, r);
e.writeInt32BE(i, r + 4);
}
t(this._ah, this._al, 0);
t(this._bh, this._bl, 8);
t(this._ch, this._cl, 16);
t(this._dh, this._dl, 24);
t(this._eh, this._el, 32);
t(this._fh, this._fl, 40);
return e;
};
t.exports = o;
}, {
"./hash": 184,
"./sha512": 191,
inherits: 138,
"safe-buffer": 182
} ],
191: [ function(e, t) {
var i = e("inherits"), r = e("./hash"), n = e("safe-buffer").Buffer, a = [ 1116352408, 3609767458, 1899447441, 602891725, 3049323471, 3964484399, 3921009573, 2173295548, 961987163, 4081628472, 1508970993, 3053834265, 2453635748, 2937671579, 2870763221, 3664609560, 3624381080, 2734883394, 310598401, 1164996542, 607225278, 1323610764, 1426881987, 3590304994, 1925078388, 4068182383, 2162078206, 991336113, 2614888103, 633803317, 3248222580, 3479774868, 3835390401, 2666613458, 4022224774, 944711139, 264347078, 2341262773, 604807628, 2007800933, 770255983, 1495990901, 1249150122, 1856431235, 1555081692, 3175218132, 1996064986, 2198950837, 2554220882, 3999719339, 2821834349, 766784016, 2952996808, 2566594879, 3210313671, 3203337956, 3336571891, 1034457026, 3584528711, 2466948901, 113926993, 3758326383, 338241895, 168717936, 666307205, 1188179964, 773529912, 1546045734, 1294757372, 1522805485, 1396182291, 2643833823, 1695183700, 2343527390, 1986661051, 1014477480, 2177026350, 1206759142, 2456956037, 344077627, 2730485921, 1290863460, 2820302411, 3158454273, 3259730800, 3505952657, 3345764771, 106217008, 3516065817, 3606008344, 3600352804, 1432725776, 4094571909, 1467031594, 275423344, 851169720, 430227734, 3100823752, 506948616, 1363258195, 659060556, 3750685593, 883997877, 3785050280, 958139571, 3318307427, 1322822218, 3812723403, 1537002063, 2003034995, 1747873779, 3602036899, 1955562222, 1575990012, 2024104815, 1125592928, 2227730452, 2716904306, 2361852424, 442776044, 2428436474, 593698344, 2756734187, 3733110249, 3204031479, 2999351573, 3329325298, 3815920427, 3391569614, 3928383900, 3515267271, 566280711, 3940187606, 3454069534, 4118630271, 4000239992, 116418474, 1914138554, 174292421, 2731055270, 289380356, 3203993006, 460393269, 320620315, 685471733, 587496836, 852142971, 1086792851, 1017036298, 365543100, 1126000580, 2618297676, 1288033470, 3409855158, 1501505948, 4234509866, 1607167915, 987167468, 1816402316, 1246189591 ], s = new Array(160);
function o() {
this.init();
this._w = s;
r.call(this, 128, 112);
}
i(o, r);
o.prototype.init = function() {
this._ah = 1779033703;
this._bh = 3144134277;
this._ch = 1013904242;
this._dh = 2773480762;
this._eh = 1359893119;
this._fh = 2600822924;
this._gh = 528734635;
this._hh = 1541459225;
this._al = 4089235720;
this._bl = 2227873595;
this._cl = 4271175723;
this._dl = 1595750129;
this._el = 2917565137;
this._fl = 725511199;
this._gl = 4215389547;
this._hl = 327033209;
return this;
};
function c(e, t, i) {
return i ^ e & (t ^ i);
}
function f(e, t, i) {
return e & t | i & (e | t);
}
function h(e, t) {
return (e >>> 28 | t << 4) ^ (t >>> 2 | e << 30) ^ (t >>> 7 | e << 25);
}
function u(e, t) {
return (e >>> 14 | t << 18) ^ (e >>> 18 | t << 14) ^ (t >>> 9 | e << 23);
}
function d(e, t) {
return (e >>> 1 | t << 31) ^ (e >>> 8 | t << 24) ^ e >>> 7;
}
function l(e, t) {
return (e >>> 1 | t << 31) ^ (e >>> 8 | t << 24) ^ (e >>> 7 | t << 25);
}
function p(e, t) {
return (e >>> 19 | t << 13) ^ (t >>> 29 | e << 3) ^ e >>> 6;
}
function b(e, t) {
return (e >>> 19 | t << 13) ^ (t >>> 29 | e << 3) ^ (e >>> 6 | t << 26);
}
function g(e, t) {
return e >>> 0 < t >>> 0 ? 1 : 0;
}
o.prototype._update = function(e) {
for (var t = this._w, i = 0 | this._ah, r = 0 | this._bh, n = 0 | this._ch, s = 0 | this._dh, o = 0 | this._eh, m = 0 | this._fh, v = 0 | this._gh, y = 0 | this._hh, _ = 0 | this._al, w = 0 | this._bl, S = 0 | this._cl, k = 0 | this._dl, M = 0 | this._el, A = 0 | this._fl, I = 0 | this._gl, E = 0 | this._hl, P = 0; P < 32; P += 2) {
t[P] = e.readInt32BE(4 * P);
t[P + 1] = e.readInt32BE(4 * P + 4);
}
for (;P < 160; P += 2) {
var C = t[P - 30], x = t[P - 30 + 1], O = d(C, x), N = l(x, C), T = p(C = t[P - 4], x = t[P - 4 + 1]), j = b(x, C), D = t[P - 14], R = t[P - 14 + 1], B = t[P - 32], L = t[P - 32 + 1], U = N + R | 0, q = O + D + g(U, N) | 0;
q = (q = q + T + g(U = U + j | 0, j) | 0) + B + g(U = U + L | 0, L) | 0;
t[P] = q;
t[P + 1] = U;
}
for (var F = 0; F < 160; F += 2) {
q = t[F];
U = t[F + 1];
var z = f(i, r, n), H = f(_, w, S), J = h(i, _), K = h(_, i), W = u(o, M), V = u(M, o), G = a[F], Y = a[F + 1], X = c(o, m, v), Z = c(M, A, I), Q = E + V | 0, $ = y + W + g(Q, E) | 0;
$ = ($ = ($ = $ + X + g(Q = Q + Z | 0, Z) | 0) + G + g(Q = Q + Y | 0, Y) | 0) + q + g(Q = Q + U | 0, U) | 0;
var ee = K + H | 0, te = J + z + g(ee, K) | 0;
y = v;
E = I;
v = m;
I = A;
m = o;
A = M;
o = s + $ + g(M = k + Q | 0, k) | 0;
s = n;
k = S;
n = r;
S = w;
r = i;
w = _;
i = $ + te + g(_ = Q + ee | 0, Q) | 0;
}
this._al = this._al + _ | 0;
this._bl = this._bl + w | 0;
this._cl = this._cl + S | 0;
this._dl = this._dl + k | 0;
this._el = this._el + M | 0;
this._fl = this._fl + A | 0;
this._gl = this._gl + I | 0;
this._hl = this._hl + E | 0;
this._ah = this._ah + i + g(this._al, _) | 0;
this._bh = this._bh + r + g(this._bl, w) | 0;
this._ch = this._ch + n + g(this._cl, S) | 0;
this._dh = this._dh + s + g(this._dl, k) | 0;
this._eh = this._eh + o + g(this._el, M) | 0;
this._fh = this._fh + m + g(this._fl, A) | 0;
this._gh = this._gh + v + g(this._gl, I) | 0;
this._hh = this._hh + y + g(this._hl, E) | 0;
};
o.prototype._hash = function() {
var e = n.allocUnsafe(64);
function t(t, i, r) {
e.writeInt32BE(t, r);
e.writeInt32BE(i, r + 4);
}
t(this._ah, this._al, 0);
t(this._bh, this._bl, 8);
t(this._ch, this._cl, 16);
t(this._dh, this._dl, 24);
t(this._eh, this._el, 32);
t(this._fh, this._fl, 40);
t(this._gh, this._gl, 48);
t(this._hh, this._hl, 56);
return e;
};
t.exports = o;
}, {
"./hash": 184,
inherits: 138,
"safe-buffer": 182
} ],
192: [ function(e, t) {
t.exports = r;
var i = e("events").EventEmitter;
e("inherits")(r, i);
r.Readable = e("readable-stream/readable.js");
r.Writable = e("readable-stream/writable.js");
r.Duplex = e("readable-stream/duplex.js");
r.Transform = e("readable-stream/transform.js");
r.PassThrough = e("readable-stream/passthrough.js");
r.Stream = r;
function r() {
i.call(this);
}
r.prototype.pipe = function(e, t) {
var r = this;
function n(t) {
e.writable && !1 === e.write(t) && r.pause && r.pause();
}
r.on("data", n);
function a() {
r.readable && r.resume && r.resume();
}
e.on("drain", a);
if (!(e._isStdio || t && !1 === t.end)) {
r.on("end", o);
r.on("close", c);
}
var s = !1;
function o() {
if (!s) {
s = !0;
e.end();
}
}
function c() {
if (!s) {
s = !0;
"function" == typeof e.destroy && e.destroy();
}
}
function f(e) {
h();
if (0 === i.listenerCount(this, "error")) throw e;
}
r.on("error", f);
e.on("error", f);
function h() {
r.removeListener("data", n);
e.removeListener("drain", a);
r.removeListener("end", o);
r.removeListener("close", c);
r.removeListener("error", f);
e.removeListener("error", f);
r.removeListener("end", h);
r.removeListener("close", h);
e.removeListener("close", h);
}
r.on("end", h);
r.on("close", h);
e.on("close", h);
e.emit("pipe", r);
return e;
};
}, {
events: 104,
inherits: 138,
"readable-stream/duplex.js": 166,
"readable-stream/passthrough.js": 177,
"readable-stream/readable.js": 178,
"readable-stream/transform.js": 179,
"readable-stream/writable.js": 180
} ],
193: [ function(e, t, i) {
var r = e("buffer").Buffer, n = r.isEncoding || function(e) {
switch (e && e.toLowerCase()) {
case "hex":
case "utf8":
case "utf-8":
case "ascii":
case "binary":
case "base64":
case "ucs2":
case "ucs-2":
case "utf16le":
case "utf-16le":
case "raw":
return !0;

default:
return !1;
}
};
function a(e) {
if (e && !n(e)) throw new Error("Unknown encoding: " + e);
}
var s = i.StringDecoder = function(e) {
this.encoding = (e || "utf8").toLowerCase().replace(/[-_]/, "");
a(e);
switch (this.encoding) {
case "utf8":
this.surrogateSize = 3;
break;

case "ucs2":
case "utf16le":
this.surrogateSize = 2;
this.detectIncompleteChar = c;
break;

case "base64":
this.surrogateSize = 3;
this.detectIncompleteChar = f;
break;

default:
this.write = o;
return;
}
this.charBuffer = new r(6);
this.charReceived = 0;
this.charLength = 0;
};
s.prototype.write = function(e) {
for (var t = ""; this.charLength; ) {
var i = e.length >= this.charLength - this.charReceived ? this.charLength - this.charReceived : e.length;
e.copy(this.charBuffer, this.charReceived, 0, i);
this.charReceived += i;
if (this.charReceived < this.charLength) return "";
e = e.slice(i, e.length);
if (!((r = (t = this.charBuffer.slice(0, this.charLength).toString(this.encoding)).charCodeAt(t.length - 1)) >= 55296 && r <= 56319)) {
this.charReceived = this.charLength = 0;
if (0 === e.length) return t;
break;
}
this.charLength += this.surrogateSize;
t = "";
}
this.detectIncompleteChar(e);
var r, n = e.length;
if (this.charLength) {
e.copy(this.charBuffer, 0, e.length - this.charReceived, n);
n -= this.charReceived;
}
n = (t += e.toString(this.encoding, 0, n)).length - 1;
if ((r = t.charCodeAt(n)) >= 55296 && r <= 56319) {
var a = this.surrogateSize;
this.charLength += a;
this.charReceived += a;
this.charBuffer.copy(this.charBuffer, a, 0, a);
e.copy(this.charBuffer, 0, 0, a);
return t.substring(0, n);
}
return t;
};
s.prototype.detectIncompleteChar = function(e) {
for (var t = e.length >= 3 ? 3 : e.length; t > 0; t--) {
var i = e[e.length - t];
if (1 == t && i >> 5 == 6) {
this.charLength = 2;
break;
}
if (t <= 2 && i >> 4 == 14) {
this.charLength = 3;
break;
}
if (t <= 3 && i >> 3 == 30) {
this.charLength = 4;
break;
}
}
this.charReceived = t;
};
s.prototype.end = function(e) {
var t = "";
e && e.length && (t = this.write(e));
if (this.charReceived) {
var i = this.charReceived, r = this.charBuffer, n = this.encoding;
t += r.slice(0, i).toString(n);
}
return t;
};
function o(e) {
return e.toString(this.encoding);
}
function c(e) {
this.charReceived = e.length % 2;
this.charLength = this.charReceived ? 2 : 0;
}
function f(e) {
this.charReceived = e.length % 3;
this.charLength = this.charReceived ? 3 : 0;
}
}, {
buffer: 65
} ],
194: [ function(e, t) {
(function(e) {
t.exports = function(e, t) {
if (i("noDeprecation")) return e;
var r = !1;
return function() {
if (!r) {
if (i("throwDeprecation")) throw new Error(t);
i("traceDeprecation") ? console.trace(t) : console.warn(t);
r = !0;
}
return e.apply(this, arguments);
};
};
function i(t) {
try {
if (!e.localStorage) return !1;
} catch (e) {
return !1;
}
var i = e.localStorage[t];
return null != i && "true" === String(i).toLowerCase();
}
}).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
}, {} ],
DotAction: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "77f5fvgmbtCG5jvJKr3Sx6D", "DotAction");
var r, n = this && this.__extends || (r = function(e, t) {
return (r = Object.setPrototypeOf || {
__proto__: []
} instanceof Array && function(e, t) {
e.__proto__ = t;
} || function(e, t) {
for (var i in t) Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
})(e, t);
}, function(e, t) {
r(e, t);
function i() {
this.constructor = e;
}
e.prototype = null === t ? Object.create(t) : (i.prototype = t.prototype, new i());
}), a = this && this.__decorate || function(e, t, i, r) {
var n, a = arguments.length, s = a < 3 ? t : null === r ? r = Object.getOwnPropertyDescriptor(t, i) : r;
if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) s = Reflect.decorate(e, t, i, r); else for (var o = e.length - 1; o >= 0; o--) (n = e[o]) && (s = (a < 3 ? n(s) : a > 3 ? n(t, i, s) : n(t, i)) || s);
return a > 3 && s && Object.defineProperty(t, i, s), s;
};
Object.defineProperty(i, "__esModule", {
value: !0
});
i.DotAction = void 0;
var s = cc._decorator.ccclass, o = function(e) {
n(t, e);
function t() {
var t = null !== e && e.apply(this, arguments) || this;
t.timer = 0;
t.originalStr = "";
return t;
}
t.prototype.onLoad = function() {
var e = this.node.getComponent(cc.Label);
this.originalStr = e.string;
};
t.prototype.update = function(e) {
this.timer += 2 * e;
for (var t = Math.floor(this.timer) % 4, i = this.originalStr, r = 0; r < t; ++r) i += ".";
if (t < 3) for (r = t; r < 3; ++r) i += " ";
this.node.getComponent(cc.Label).string = i;
};
return a([ s ], t);
}(cc.Component);
i.DotAction = o;
cc._RF.pop();
}, {} ],
SESDKHelper: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "5e204KX0V5KvruvaqBuOUCd", "SESDKHelper");
Object.defineProperty(i, "__esModule", {
value: !0
});
i.SESDKHelper = void 0;
var r = function() {
function e() {}
Object.defineProperty(e, "sdk", {
get: function() {
var e;
return null === (e = globalThis.PlatformApi) || void 0 === e ? void 0 : e.se;
},
enumerable: !1,
configurable: !0
});
e.reportRegister = function() {
var e = this.sdk;
e && e.trackRegister && e.trackRegister();
};
e.connectTE = function(e) {
var t = this.sdk;
t && t.setSuperProperties && t.setSuperProperties("te_distinct_id", e);
};
return e;
}();
i.SESDKHelper = r;
cc._RF.pop();
}, {} ],
TESDKHelper: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "9cc2cf0we9GtLph5QhT4tp8", "TESDKHelper");
var r = this && this.__awaiter || function(e, t, i, r) {
return new (i || (i = Promise))(function(n, a) {
function s(e) {
try {
c(r.next(e));
} catch (e) {
a(e);
}
}
function o(e) {
try {
c(r.throw(e));
} catch (e) {
a(e);
}
}
function c(e) {
e.done ? n(e.value) : (t = e.value, t instanceof i ? t : new i(function(e) {
e(t);
})).then(s, o);
var t;
}
c((r = r.apply(e, t || [])).next());
});
}, n = this && this.__generator || function(e, t) {
var i, r, n, a, s = {
label: 0,
sent: function() {
if (1 & n[0]) throw n[1];
return n[1];
},
trys: [],
ops: []
};
return a = {
next: o(0),
throw: o(1),
return: o(2)
}, "function" == typeof Symbol && (a[Symbol.iterator] = function() {
return this;
}), a;
function o(e) {
return function(t) {
return c([ e, t ]);
};
}
function c(a) {
if (i) throw new TypeError("Generator is already executing.");
for (;s; ) try {
if (i = 1, r && (n = 2 & a[0] ? r.return : a[0] ? r.throw || ((n = r.return) && n.call(r), 
0) : r.next) && !(n = n.call(r, a[1])).done) return n;
(r = 0, n) && (a = [ 2 & a[0], n.value ]);
switch (a[0]) {
case 0:
case 1:
n = a;
break;

case 4:
s.label++;
return {
value: a[1],
done: !1
};

case 5:
s.label++;
r = a[1];
a = [ 0 ];
continue;

case 7:
a = s.ops.pop();
s.trys.pop();
continue;

default:
if (!(n = s.trys, n = n.length > 0 && n[n.length - 1]) && (6 === a[0] || 2 === a[0])) {
s = 0;
continue;
}
if (3 === a[0] && (!n || a[1] > n[0] && a[1] < n[3])) {
s.label = a[1];
break;
}
if (6 === a[0] && s.label < n[1]) {
s.label = n[1];
n = a;
break;
}
if (n && s.label < n[2]) {
s.label = n[2];
s.ops.push(a);
break;
}
n[2] && s.ops.pop();
s.trys.pop();
continue;
}
a = t.call(e, s);
} catch (e) {
a = [ 6, e ];
r = 0;
} finally {
i = n = 0;
}
if (5 & a[0]) throw a[1];
return {
value: a[0] ? a[1] : void 0,
done: !0
};
}
};
Object.defineProperty(i, "__esModule", {
value: !0
});
i.TESDKHelper = i.TEEnum = void 0;
var a, s = e("./SESDKHelper");
(function(e) {
e.Sdk_Login = "sdk_login";
e.Login = "login";
e.Logout = "logout";
e.Role_Login = "role_login";
e.Guide = "guide";
e.Skip_Anim = "skip_animation";
e.Init_Order = "init_order";
e.Button_Click = "button_click";
e.File_Error = "file_error";
e.Net_Error = "net_err";
})(a = i.TEEnum || (i.TEEnum = {}));
var o = function() {
function t() {}
Object.defineProperty(t, "deviceId", {
get: function() {
this._deviceId || (this._deviceId = this.ta ? this.ta.getDeviceId() : TDAnalytics.getDeviceId());
return this._deviceId;
},
enumerable: !1,
configurable: !0
});
t.init = function(e, t) {
var i = t.pkgv;
e && (this.type = e);
if (!this.inited && !this.ta) {
var r = {
appId: "",
serverUrl: "https://up-te.maple-game.com"
};
if ((cc.sys.os == cc.sys.OS_ANDROID || cc.sys.os == cc.sys.OS_IOS) && this.checkPlv("3.0.0", i)) {
r.enableNative = !0;
r.autoTrack = {};
r.autoTrack.appInstall = !0;
r.autoTrack.appCrash = !0;
r.autoTrack.appStart = !0;
r.autoTrack.appEnd = !0;
r.autoTrack.appShow = !0;
r.autoTrack.appHide = !0;
}
switch (this.type) {
case 0:
r.appId = "32b2a812ac194692ba36e9b7e88f93a9";
break;

case 1:
r.appId = "96c33b6e6e714ea28fe03e7e42941264";
break;

case 2:
case 3:
r.appId = "2d7616eab7d345d9937cf4ebf0bb289e";
}
try {
if (this.checkPlv("3.1.4", i)) {
TDAnalytics.init(r);
TDAnalytics.logout();
this.inited = !0;
} else {
this.ta = new ThinkingAnalyticsAPI(r);
this.ta.init();
this.ta.logout();
}
} catch (e) {
console.error(e.stack);
this.inited = !1;
this.ta = null;
return;
}
}
if (this.ta) {
this.distinctId = this.ta.getDistinctId();
this.ta.clearSuperProperties();
} else {
this.distinctId = TDAnalytics.getDistinctId();
TDAnalytics.clearSuperProperties();
}
this.userSet();
this.ta ? this.ta.trackFirstEvent({
eventName: "new_device",
first_check_id: this.deviceId
}) : TDAnalytics.trackFirst({
eventName: "new_device",
properties: {
first_check_id: this.deviceId
}
});
s.SESDKHelper.connectTE(this.distinctId);
};
t.checkPlv = function(e, t) {
for (var i = e.split("."), r = t.split("."), n = 0; n < r.length; n++) {
var a = parseInt(r[n]), s = parseInt(i[n]);
if (a > s) return !0;
if (a < s) return !1;
}
return !1;
};
t.userSet = function() {
if (this.ta) {
this.zoneoffset = this.ta.getPresetProperties().zoneOffset;
this.ta.userSetOnce({
os: cc.sys.os
});
} else {
this.zoneoffset = TDAnalytics.getPresetProperties().zoneOffset;
TDAnalytics.userSetOnce({
properties: {
os: cc.sys.os
}
});
}
};
t.onLogin = function(e) {
if (this.ta || this.inited) {
this.isRoleLogin = !0;
if (this.ta) {
this.ta.login(e);
this.ta.timeEvent(a.Logout);
} else {
TDAnalytics.login(e);
TDAnalytics.timeEvent({
eventName: a.Logout
});
}
}
};
t.onSdkLogin = function() {
if (this.ta || this.inited) {
this.isLogin = !0;
this.isRoleLogin = !1;
this.trackEvent(a.Sdk_Login);
}
};
t.loginSet = function(t) {
return r(this, void 0, void 0, function() {
var i, r, a, s, o, c, f, h;
return n(this, function(n) {
switch (n.label) {
case 0:
return this.inited || this.ta ? [ 4, Promise.resolve().then(function() {
return e("../scripts/models/vos/RoleBaseInfo");
}) ] : [ 3, 7 ];

case 1:
i = n.sent().RoleBaseInfo;
return [ 4, Promise.resolve().then(function() {
return e("../scripts/models/ColorVerModel");
}) ];

case 2:
r = n.sent().ColorVerModel;
return [ 4, Promise.resolve().then(function() {
return e("../scripts/mgrs/GameSettings");
}) ];

case 3:
a = n.sent().default;
(s = {}).os = cc.sys.os;
s.zone_offset = this.zoneoffset;
s.distinct_id = this.distinctId;
this.deviceId && (s.device_id = "" + this.deviceId);
s.server_id = i.serverName;
s.color = "" + r.colorState;
s.aMode = "" + a.actionMode;
return [ 4, Promise.resolve().then(function() {
return e("../scripts/gameconfigs/AppData");
}) ];

case 4:
return 8 == (o = n.sent()).platformID && 8008 == o.platfStr ? [ 4, Promise.resolve().then(function() {
return e("../scripts/mgrs/LoginMgr");
}) ] : [ 3, 6 ];

case 5:
c = n.sent().LoginMgr;
f = c.getLoginParam();
h = f.checkObj.sdk;
s.huaweiAcc = h;
n.label = 6;

case 6:
t.TEObj = s;
n.label = 7;

case 7:
return [ 2, t ];
}
});
});
};
t.talkSet = function(t) {
return r(this, void 0, void 0, function() {
var i, r, a, s, o, c, f;
return n(this, function(n) {
switch (n.label) {
case 0:
return this.inited || this.ta ? [ 4, Promise.resolve().then(function() {
return e("../scripts/mgrs/LoginMgr");
}) ] : [ 3, 3 ];

case 1:
i = n.sent().LoginMgr;
return [ 4, Promise.resolve().then(function() {
return e("../scripts/gameconfigs/AppData");
}) ];

case 2:
r = n.sent();
a = 8 == r.platformID && 8008 == r.platfStr;
s = i.getLoginParam();
o = 0 == r.platformID ? this.checkTfyChannel(s.channel, r.lang) : s.channel;
(c = {}).channel = o;
c.distinct_id = this.distinctId;
c.os = cc.sys.os;
if (a) {
f = s.checkObj.sdk;
c.huaweiAcc = f;
}
t.TEObj = c;
n.label = 3;

case 3:
return [ 2, t ];
}
});
});
};
t.onLogout = function() {
if (this.ta || this.inited) {
this.trackEvent(a.Logout);
this.ta ? this.ta.logout() : TDAnalytics.logout();
}
};
t.onFileError = function() {
if ((this.ta || this.inited) && !this.fileError) {
this.fileError = !0;
this.updateSuperProperties();
this.ta ? this.ta.track(a.File_Error) : TDAnalytics.track({
eventName: a.File_Error
});
}
};
t.updateSuperProperties = function() {
return r(this, void 0, void 0, function() {
var t, i, r, a, s, o, c, f, h, u, d, l, p, b, g, m;
return n(this, function(n) {
switch (n.label) {
case 0:
return this.isLogin ? [ 4, Promise.resolve().then(function() {
return e("../scripts/mgrs/LoginMgr");
}) ] : [ 2 ];

case 1:
t = n.sent().LoginMgr;
return [ 4, Promise.resolve().then(function() {
return e("../scripts/models/UserModel");
}) ];

case 2:
i = n.sent().UserModel;
return [ 4, Promise.resolve().then(function() {
return e("../scripts/gameconfigs/AppData");
}) ];

case 3:
r = n.sent();
a = 8 == r.platformID && 8008 == r.platfStr;
s = t.getLoginParam();
o = a ? s.checkObj.sdk : s.account;
c = 0 == r.platformID ? this.checkTfyChannel(s.channel, r.lang) : s.channel;
if (!this.isRoleLogin || !i.entity) {
this.ta ? this.ta.setSuperProperties({
channel: c,
open_id: o
}) : TDAnalytics.setSuperProperties({
channel: c,
open_id: o
});
return [ 2 ];
}
return [ 4, Promise.resolve().then(function() {
return e("../scripts/models/vos/RoleBaseInfo");
}) ];

case 4:
f = n.sent().RoleBaseInfo;
return [ 4, Promise.resolve().then(function() {
return e("../scripts/models/RoleOtherInfo");
}) ];

case 5:
h = n.sent().RoleOtherInfo;
return [ 4, Promise.resolve().then(function() {
return e("../scripts/models/SkillTable");
}) ];

case 6:
u = n.sent().SkillTable;
return [ 4, Promise.resolve().then(function() {
return e("../scripts/gameconfigs/LangMgr");
}) ];

case 7:
d = n.sent();
return [ 4, Promise.resolve().then(function() {
return e("../scripts/models/JinmaiModel");
}) ];

case 8:
l = n.sent().JinmaiModel;
return [ 4, Promise.resolve().then(function() {
return e("../scripts/models/ColorVerModel");
}) ];

case 9:
p = n.sent().ColorVerModel;
return [ 4, Promise.resolve().then(function() {
return e("../scripts/mgrs/GameSettings");
}) ];

case 10:
b = n.sent().default;
g = "人妖";
0 == f.sexId ? g = "男" : 1 == f.sexId && (g = "女");
m = {
channel: c,
open_id: o,
server_id: f.serverName,
golds_num: f.yuanbao,
bars_num: f.gold,
total_pay: h.chargeNum,
tael: f.coins,
prowess: f.exp,
exp: f.potentials,
aveskills_level: u.getMyRoleArtLv(),
effectiveskills_level: u.getMySkEvalLv(),
sect: d.getSchool(f.school),
metempsychosis_num: h.reBirthTime,
gender: g,
Vitalia: f.zhenyuan,
Meridians: l.getAcpObj(),
game_graphics: "" + p.colorState,
battle_animation: "" + b.actionMode
};
this.ta ? this.ta.setSuperProperties(m) : TDAnalytics.setSuperProperties(m);
return [ 2 ];
}
});
});
};
t.trackEvent = function(e, t) {
var i = this;
(this.inited || this.ta) && this.updateSuperProperties().then(function() {
i.ta ? i.ta.track(e, t) : TDAnalytics.track({
eventName: e,
properties: t
});
});
};
t.checkTfyChannel = function(e, t) {
if ("meple" == e) switch (cc.sys.os) {
case cc.sys.OS_ANDROID:
e += 1002;
1 == this.type && "tw" == t && (e += "_TW");
break;

case cc.sys.OS_IOS:
e += 1001;
1 == this.type && "tw" == t && (e += "_TW");
}
return e;
};
t.ta = null;
t.isLogin = !1;
t.isRoleLogin = !1;
t.battleInfo = null;
t.zoneoffset = 8;
t._deviceId = "";
t.isInWhiteList = !1;
t.fileError = !1;
t.type = 0;
t.distinctId = "";
t.inited = !1;
return t;
}();
i.TESDKHelper = o;
cc._RF.pop();
}, {
"../scripts/gameconfigs/AppData": void 0,
"../scripts/gameconfigs/LangMgr": void 0,
"../scripts/mgrs/GameSettings": void 0,
"../scripts/mgrs/LoginMgr": void 0,
"../scripts/models/ColorVerModel": void 0,
"../scripts/models/JinmaiModel": void 0,
"../scripts/models/RoleOtherInfo": void 0,
"../scripts/models/SkillTable": void 0,
"../scripts/models/UserModel": void 0,
"../scripts/models/vos/RoleBaseInfo": void 0,
"./SESDKHelper": "SESDKHelper"
} ],
UpdateMgr: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "8750daZRPBDurpBjlkmSLxg", "UpdateMgr");
Object.defineProperty(i, "__esModule", {
value: !0
});
i.UpdateMgr = i.UpdateOverState = void 0;
var r, n = e("./crypto-js"), a = e("./DotAction"), s = e("./TESDKHelper");
(function(e) {
e[e.FAILED = 0] = "FAILED";
e[e.UP_TO_DATE = 1] = "UP_TO_DATE";
e[e.SUCCEED = 2] = "SUCCEED";
e[e.SUCCEED_TO_REBOOT = 3] = "SUCCEED_TO_REBOOT";
})(r = i.UpdateOverState || (i.UpdateOverState = {}));
jsb.EventAssetsManager.DOWNLOAD_COMPLETE = 11;
jsb.EventAssetsManager.FINALIZING_PROGRESS = 12;
var o = function() {
function e(e, t, i, r) {
this.verificationRequired = !0;
this.displayLabel = null;
this.msgLabel = null;
this._updating = !1;
this._canRetry = !1;
this._storagePath = "";
this._am = null;
this._completeCb = null;
this._failCount = 0;
this._manifestNativUrl = "";
this.versionCompareHandle = null;
this._manifestNativUrl = e;
this._storagePath = t;
this._completeCb = r;
this.versionCompareHandle = function(e, t) {
console.log("JS Custom Version Compare: version A is " + e + ", version B is " + t);
var i = Number(e) - Number(t);
return i > 0 ? 1 : i < 0 ? -1 : 0;
};
this._am = new jsb.AssetsManager(i, this._manifestNativUrl, this._storagePath, this.versionCompareHandle);
var a = this;
this._am.setVerifyCallback(function(e, t) {
if (a.verificationRequired) {
var i = jsb.fileUtils.getDataFromFile(e);
return n.MD5(a.byteArrayToWordArray(i)).toString(n.enc.Hex) === t.md5.toString();
}
return !0;
});
}
e.prototype.byteArrayToWordArray = function(e) {
for (var t = [], i = 0; i < e.length; i++) t[i / 4 | 0] |= e[i] << 24 - 8 * i;
return n.lib.WordArray.create(t, e.length);
};
e.prototype.checkCb = function(e) {
console.log("Code: " + e.getEventCode());
var t = 0;
switch (e.getEventCode()) {
case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
this.displayLabel.string = "No local manifest file found, hot fix skipped.";
break;

case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
this.displayLabel.string = "Fail to download manifest file, hot fix skipped.";
break;

case jsb.EventAssetsManager.UPDATE_FINISHED:
case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
this.displayLabel.string = "up-to-date.";
t = 1;
break;

case jsb.EventAssetsManager.NEW_VERSION_FOUND:
t = 2;
break;

default:
return;
}
this._am.setEventCallback(null);
this._updating = !1;
switch (t) {
case 1:
this.updateOver(r.UP_TO_DATE);
break;

case 2:
this.hotUpdate();
break;

default:
this.updateOver(r.FAILED);
}
};
e.prototype.updateCb = function(e) {
var t = !1, i = !1, n = !1;
switch (e.getEventCode()) {
case jsb.EventAssetsManager.ERROR_DOWNLOAD_MANIFEST:
case jsb.EventAssetsManager.ERROR_PARSE_MANIFEST:
case jsb.EventAssetsManager.ERROR_NO_LOCAL_MANIFEST:
this.displayLabel.string = "No local manifest file found, hot fix skipped.";
i = !0;
break;

case jsb.EventAssetsManager.UPDATE_PROGRESSION:
var o = e.getPercentByFile();
isNaN(o) || (this.displayLabel.string = "Loading....." + Math.floor(100 * o) + "%");
break;

case jsb.EventAssetsManager.DOWNLOAD_COMPLETE:
this.displayLabel.string = "Preparing, plz wait";
this.displayLabel.node.addComponent(a.DotAction);
break;

case jsb.EventAssetsManager.FINALIZING_PROGRESS:
this.displayLabel.getComponent(a.DotAction) && this.displayLabel.node.removeComponent(a.DotAction);
this.displayLabel.string = "Decompressing..." + e.getMessage() + "%";
break;

case jsb.EventAssetsManager.ALREADY_UP_TO_DATE:
n = !0;
break;

case jsb.EventAssetsManager.UPDATE_FINISHED:
this.displayLabel.string = "Done!";
t = !0;
break;

case jsb.EventAssetsManager.UPDATE_FAILED:
this._updating = !1;
this._canRetry = this._failCount++ < 3;
i = !this._canRetry;
break;

case jsb.EventAssetsManager.ERROR_UPDATING:
if (this.msgLabel) {
var c = e.getAssetId() + "";
this.msgLabel.string = "update: " + c;
s.TESDKHelper.onFileError(c);
}
break;

case jsb.EventAssetsManager.ERROR_DECOMPRESS:
this.msgLabel && (this.msgLabel.string = e.getMessage());
}
this._canRetry ? this.retry() : i ? this.updateOver(r.FAILED) : t ? "restart" === e.getMessage() ? this.updateOver(r.SUCCEED_TO_REBOOT) : this.updateOver(r.SUCCEED) : n && this.updateOver(r.UP_TO_DATE);
};
e.prototype.retry = function() {
if (!this._updating && this._canRetry) {
this._canRetry = !1;
this._am.downloadFailedAssets();
}
};
e.prototype.checkUpdate = function() {
if (!this._updating) if (this._am.getLocalManifest() && this._am.getLocalManifest().isLoaded()) {
this._am.setEventCallback(this.checkCb.bind(this));
this._am.checkUpdate();
this._updating = !0;
} else this.displayLabel.string = "Failed to load local manifest ...";
};
e.prototype.hotUpdate = function() {
if (this._am && !this._updating) {
this._am.setEventCallback(this.updateCb.bind(this));
this._failCount = 0;
this._am.update();
this._updating = !0;
}
};
e.prototype.updateOver = function(e) {
var t = jsb.fileUtils.getSearchPaths(), i = [];
if (t && t.length > 0) for (var r = 0; r < t.length; ++r) {
var n = t[r];
i.indexOf(n) < 0 && i.push(n);
}
(t = i).indexOf(this._storagePath) < 0 && t.unshift(this._storagePath);
jsb.fileUtils.setSearchPaths(t);
this._completeCb(e);
this.dispose();
};
e.prototype.dispose = function() {
this._updating = !1;
this._completeCb = null;
this._am.setEventCallback(null);
this.displayLabel = null;
};
return e;
}();
i.UpdateMgr = o;
cc._RF.pop();
}, {
"./DotAction": "DotAction",
"./TESDKHelper": "TESDKHelper",
"./crypto-js": "crypto-js"
} ],
"crypto-js": [ function(e, t, i) {
(function(r) {
"use strict";
cc._RF.push(t, "8345fpw42xF+7A68++M0bYQ", "crypto-js");
n = function() {
var t, i, n, a, s, o = o || function(t) {
var i;
"undefined" != typeof window && window.crypto && (i = window.crypto);
"undefined" != typeof self && self.crypto && (i = self.crypto);
"undefined" != typeof globalThis && globalThis.crypto && (i = globalThis.crypto);
!i && "undefined" != typeof window && window.msCrypto && (i = window.msCrypto);
!i && "undefined" != typeof r && r.crypto && (i = r.crypto);
if (!i && "function" == typeof e) try {
i = e("crypto");
} catch (e) {}
var n = function() {
if (i) {
if ("function" == typeof i.getRandomValues) try {
return i.getRandomValues(new Uint32Array(1))[0];
} catch (e) {}
if ("function" == typeof i.randomBytes) try {
return i.randomBytes(4).readInt32LE();
} catch (e) {}
}
throw new Error("Native crypto module could not be used to get secure random number.");
}, a = Object.create || function() {
function e() {}
return function(t) {
var i;
e.prototype = t;
i = new e();
e.prototype = null;
return i;
};
}(), s = {}, o = s.lib = {}, c = o.Base = {
extend: function(e) {
var t = a(this);
e && t.mixIn(e);
t.hasOwnProperty("init") && this.init !== t.init || (t.init = function() {
t.$super.init.apply(this, arguments);
});
t.init.prototype = t;
t.$super = this;
return t;
},
create: function() {
var e = this.extend();
e.init.apply(e, arguments);
return e;
},
init: function() {},
mixIn: function(e) {
for (var t in e) e.hasOwnProperty(t) && (this[t] = e[t]);
e.hasOwnProperty("toString") && (this.toString = e.toString);
},
clone: function() {
return this.init.prototype.extend(this);
}
}, f = o.WordArray = c.extend({
init: function(e, t) {
e = this.words = e || [];
this.sigBytes = null != t ? t : 4 * e.length;
},
toString: function(e) {
return (e || u).stringify(this);
},
concat: function(e) {
var t = this.words, i = e.words, r = this.sigBytes, n = e.sigBytes;
this.clamp();
if (r % 4) for (var a = 0; a < n; a++) {
var s = i[a >>> 2] >>> 24 - a % 4 * 8 & 255;
t[r + a >>> 2] |= s << 24 - (r + a) % 4 * 8;
} else for (var o = 0; o < n; o += 4) t[r + o >>> 2] = i[o >>> 2];
this.sigBytes += n;
return this;
},
clamp: function() {
var e = this.words, i = this.sigBytes;
e[i >>> 2] &= 4294967295 << 32 - i % 4 * 8;
e.length = t.ceil(i / 4);
},
clone: function() {
var e = c.clone.call(this);
e.words = this.words.slice(0);
return e;
},
random: function(e) {
for (var t = [], i = 0; i < e; i += 4) t.push(n());
return new f.init(t, e);
}
}), h = s.enc = {}, u = h.Hex = {
stringify: function(e) {
for (var t = e.words, i = e.sigBytes, r = [], n = 0; n < i; n++) {
var a = t[n >>> 2] >>> 24 - n % 4 * 8 & 255;
r.push((a >>> 4).toString(16));
r.push((15 & a).toString(16));
}
return r.join("");
},
parse: function(e) {
for (var t = e.length, i = [], r = 0; r < t; r += 2) i[r >>> 3] |= parseInt(e.substr(r, 2), 16) << 24 - r % 8 * 4;
return new f.init(i, t / 2);
}
}, d = h.Latin1 = {
stringify: function(e) {
for (var t = e.words, i = e.sigBytes, r = [], n = 0; n < i; n++) {
var a = t[n >>> 2] >>> 24 - n % 4 * 8 & 255;
r.push(String.fromCharCode(a));
}
return r.join("");
},
parse: function(e) {
for (var t = e.length, i = [], r = 0; r < t; r++) i[r >>> 2] |= (255 & e.charCodeAt(r)) << 24 - r % 4 * 8;
return new f.init(i, t);
}
}, l = h.Utf8 = {
stringify: function(e) {
try {
return decodeURIComponent(escape(d.stringify(e)));
} catch (e) {
throw new Error("Malformed UTF-8 data");
}
},
parse: function(e) {
return d.parse(unescape(encodeURIComponent(e)));
}
}, p = o.BufferedBlockAlgorithm = c.extend({
reset: function() {
this._data = new f.init();
this._nDataBytes = 0;
},
_append: function(e) {
"string" == typeof e && (e = l.parse(e));
this._data.concat(e);
this._nDataBytes += e.sigBytes;
},
_process: function(e) {
var i, r = this._data, n = r.words, a = r.sigBytes, s = this.blockSize, o = a / (4 * s), c = (o = e ? t.ceil(o) : t.max((0 | o) - this._minBufferSize, 0)) * s, h = t.min(4 * c, a);
if (c) {
for (var u = 0; u < c; u += s) this._doProcessBlock(n, u);
i = n.splice(0, c);
r.sigBytes -= h;
}
return new f.init(i, h);
},
clone: function() {
var e = c.clone.call(this);
e._data = this._data.clone();
return e;
},
_minBufferSize: 0
}), b = (o.Hasher = p.extend({
cfg: c.extend(),
init: function(e) {
this.cfg = this.cfg.extend(e);
this.reset();
},
reset: function() {
p.reset.call(this);
this._doReset();
},
update: function(e) {
this._append(e);
this._process();
return this;
},
finalize: function(e) {
e && this._append(e);
return this._doFinalize();
},
blockSize: 16,
_createHelper: function(e) {
return function(t, i) {
return new e.init(i).finalize(t);
};
},
_createHmacHelper: function(e) {
return function(t, i) {
return new b.HMAC.init(e, i).finalize(t);
};
}
}), s.algo = {});
return s;
}(Math);
i = (t = o).lib, n = i.Base, a = i.WordArray, (s = t.x64 = {}).Word = n.extend({
init: function(e, t) {
this.high = e;
this.low = t;
}
}), s.WordArray = n.extend({
init: function(e, t) {
e = this.words = e || [];
this.sigBytes = null != t ? t : 8 * e.length;
},
toX32: function() {
for (var e = this.words, t = e.length, i = [], r = 0; r < t; r++) {
var n = e[r];
i.push(n.high);
i.push(n.low);
}
return a.create(i, this.sigBytes);
},
clone: function() {
for (var e = n.clone.call(this), t = e.words = this.words.slice(0), i = t.length, r = 0; r < i; r++) t[r] = t[r].clone();
return e;
}
});
(function() {
if ("function" == typeof ArrayBuffer) {
var e = o.lib.WordArray, t = e.init;
(e.init = function(e) {
e instanceof ArrayBuffer && (e = new Uint8Array(e));
(e instanceof Int8Array || "undefined" != typeof Uint8ClampedArray && e instanceof Uint8ClampedArray || e instanceof Int16Array || e instanceof Uint16Array || e instanceof Int32Array || e instanceof Uint32Array || e instanceof Float32Array || e instanceof Float64Array) && (e = new Uint8Array(e.buffer, e.byteOffset, e.byteLength));
if (e instanceof Uint8Array) {
for (var i = e.byteLength, r = [], n = 0; n < i; n++) r[n >>> 2] |= e[n] << 24 - n % 4 * 8;
t.call(this, r, i);
} else t.apply(this, arguments);
}).prototype = e;
}
})();
(function() {
var e = o, t = e.lib.WordArray, i = e.enc;
i.Utf16 = i.Utf16BE = {
stringify: function(e) {
for (var t = e.words, i = e.sigBytes, r = [], n = 0; n < i; n += 2) {
var a = t[n >>> 2] >>> 16 - n % 4 * 8 & 65535;
r.push(String.fromCharCode(a));
}
return r.join("");
},
parse: function(e) {
for (var i = e.length, r = [], n = 0; n < i; n++) r[n >>> 1] |= e.charCodeAt(n) << 16 - n % 2 * 16;
return t.create(r, 2 * i);
}
};
i.Utf16LE = {
stringify: function(e) {
for (var t = e.words, i = e.sigBytes, n = [], a = 0; a < i; a += 2) {
var s = r(t[a >>> 2] >>> 16 - a % 4 * 8 & 65535);
n.push(String.fromCharCode(s));
}
return n.join("");
},
parse: function(e) {
for (var i = e.length, n = [], a = 0; a < i; a++) n[a >>> 1] |= r(e.charCodeAt(a) << 16 - a % 2 * 16);
return t.create(n, 2 * i);
}
};
function r(e) {
return e << 8 & 4278255360 | e >>> 8 & 16711935;
}
})();
(function() {
var e = o, t = e.lib.WordArray;
e.enc.Base64 = {
stringify: function(e) {
var t = e.words, i = e.sigBytes, r = this._map;
e.clamp();
for (var n = [], a = 0; a < i; a += 3) for (var s = (t[a >>> 2] >>> 24 - a % 4 * 8 & 255) << 16 | (t[a + 1 >>> 2] >>> 24 - (a + 1) % 4 * 8 & 255) << 8 | t[a + 2 >>> 2] >>> 24 - (a + 2) % 4 * 8 & 255, o = 0; o < 4 && a + .75 * o < i; o++) n.push(r.charAt(s >>> 6 * (3 - o) & 63));
var c = r.charAt(64);
if (c) for (;n.length % 4; ) n.push(c);
return n.join("");
},
parse: function(e) {
var t = e.length, r = this._map, n = this._reverseMap;
if (!n) {
n = this._reverseMap = [];
for (var a = 0; a < r.length; a++) n[r.charCodeAt(a)] = a;
}
var s = r.charAt(64);
if (s) {
var o = e.indexOf(s);
-1 !== o && (t = o);
}
return i(e, t, n);
},
_map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/="
};
function i(e, i, r) {
for (var n = [], a = 0, s = 0; s < i; s++) if (s % 4) {
var o = r[e.charCodeAt(s - 1)] << s % 4 * 2 | r[e.charCodeAt(s)] >>> 6 - s % 4 * 2;
n[a >>> 2] |= o << 24 - a % 4 * 8;
a++;
}
return t.create(n, a);
}
})();
(function() {
var e = o, t = e.lib.WordArray;
e.enc.Base64url = {
stringify: function(e, t) {
void 0 === t && (t = !0);
var i = e.words, r = e.sigBytes, n = t ? this._safe_map : this._map;
e.clamp();
for (var a = [], s = 0; s < r; s += 3) for (var o = (i[s >>> 2] >>> 24 - s % 4 * 8 & 255) << 16 | (i[s + 1 >>> 2] >>> 24 - (s + 1) % 4 * 8 & 255) << 8 | i[s + 2 >>> 2] >>> 24 - (s + 2) % 4 * 8 & 255, c = 0; c < 4 && s + .75 * c < r; c++) a.push(n.charAt(o >>> 6 * (3 - c) & 63));
var f = n.charAt(64);
if (f) for (;a.length % 4; ) a.push(f);
return a.join("");
},
parse: function(e, t) {
void 0 === t && (t = !0);
var r = e.length, n = t ? this._safe_map : this._map, a = this._reverseMap;
if (!a) {
a = this._reverseMap = [];
for (var s = 0; s < n.length; s++) a[n.charCodeAt(s)] = s;
}
var o = n.charAt(64);
if (o) {
var c = e.indexOf(o);
-1 !== c && (r = c);
}
return i(e, r, a);
},
_map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
_safe_map: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_"
};
function i(e, i, r) {
for (var n = [], a = 0, s = 0; s < i; s++) if (s % 4) {
var o = r[e.charCodeAt(s - 1)] << s % 4 * 2 | r[e.charCodeAt(s)] >>> 6 - s % 4 * 2;
n[a >>> 2] |= o << 24 - a % 4 * 8;
a++;
}
return t.create(n, a);
}
})();
(function(e) {
var t = o, i = t.lib, r = i.WordArray, n = i.Hasher, a = t.algo, s = [];
(function() {
for (var t = 0; t < 64; t++) s[t] = 4294967296 * e.abs(e.sin(t + 1)) | 0;
})();
var c = a.MD5 = n.extend({
_doReset: function() {
this._hash = new r.init([ 1732584193, 4023233417, 2562383102, 271733878 ]);
},
_doProcessBlock: function(e, t) {
for (var i = 0; i < 16; i++) {
var r = t + i, n = e[r];
e[r] = 16711935 & (n << 8 | n >>> 24) | 4278255360 & (n << 24 | n >>> 8);
}
var a = this._hash.words, o = e[t + 0], c = e[t + 1], l = e[t + 2], p = e[t + 3], b = e[t + 4], g = e[t + 5], m = e[t + 6], v = e[t + 7], y = e[t + 8], _ = e[t + 9], w = e[t + 10], S = e[t + 11], k = e[t + 12], M = e[t + 13], A = e[t + 14], I = e[t + 15], E = a[0], P = a[1], C = a[2], x = a[3];
E = f(E, P, C, x, o, 7, s[0]);
x = f(x, E, P, C, c, 12, s[1]);
C = f(C, x, E, P, l, 17, s[2]);
P = f(P, C, x, E, p, 22, s[3]);
E = f(E, P, C, x, b, 7, s[4]);
x = f(x, E, P, C, g, 12, s[5]);
C = f(C, x, E, P, m, 17, s[6]);
P = f(P, C, x, E, v, 22, s[7]);
E = f(E, P, C, x, y, 7, s[8]);
x = f(x, E, P, C, _, 12, s[9]);
C = f(C, x, E, P, w, 17, s[10]);
P = f(P, C, x, E, S, 22, s[11]);
E = f(E, P, C, x, k, 7, s[12]);
x = f(x, E, P, C, M, 12, s[13]);
C = f(C, x, E, P, A, 17, s[14]);
E = h(E, P = f(P, C, x, E, I, 22, s[15]), C, x, c, 5, s[16]);
x = h(x, E, P, C, m, 9, s[17]);
C = h(C, x, E, P, S, 14, s[18]);
P = h(P, C, x, E, o, 20, s[19]);
E = h(E, P, C, x, g, 5, s[20]);
x = h(x, E, P, C, w, 9, s[21]);
C = h(C, x, E, P, I, 14, s[22]);
P = h(P, C, x, E, b, 20, s[23]);
E = h(E, P, C, x, _, 5, s[24]);
x = h(x, E, P, C, A, 9, s[25]);
C = h(C, x, E, P, p, 14, s[26]);
P = h(P, C, x, E, y, 20, s[27]);
E = h(E, P, C, x, M, 5, s[28]);
x = h(x, E, P, C, l, 9, s[29]);
C = h(C, x, E, P, v, 14, s[30]);
E = u(E, P = h(P, C, x, E, k, 20, s[31]), C, x, g, 4, s[32]);
x = u(x, E, P, C, y, 11, s[33]);
C = u(C, x, E, P, S, 16, s[34]);
P = u(P, C, x, E, A, 23, s[35]);
E = u(E, P, C, x, c, 4, s[36]);
x = u(x, E, P, C, b, 11, s[37]);
C = u(C, x, E, P, v, 16, s[38]);
P = u(P, C, x, E, w, 23, s[39]);
E = u(E, P, C, x, M, 4, s[40]);
x = u(x, E, P, C, o, 11, s[41]);
C = u(C, x, E, P, p, 16, s[42]);
P = u(P, C, x, E, m, 23, s[43]);
E = u(E, P, C, x, _, 4, s[44]);
x = u(x, E, P, C, k, 11, s[45]);
C = u(C, x, E, P, I, 16, s[46]);
E = d(E, P = u(P, C, x, E, l, 23, s[47]), C, x, o, 6, s[48]);
x = d(x, E, P, C, v, 10, s[49]);
C = d(C, x, E, P, A, 15, s[50]);
P = d(P, C, x, E, g, 21, s[51]);
E = d(E, P, C, x, k, 6, s[52]);
x = d(x, E, P, C, p, 10, s[53]);
C = d(C, x, E, P, w, 15, s[54]);
P = d(P, C, x, E, c, 21, s[55]);
E = d(E, P, C, x, y, 6, s[56]);
x = d(x, E, P, C, I, 10, s[57]);
C = d(C, x, E, P, m, 15, s[58]);
P = d(P, C, x, E, M, 21, s[59]);
E = d(E, P, C, x, b, 6, s[60]);
x = d(x, E, P, C, S, 10, s[61]);
C = d(C, x, E, P, l, 15, s[62]);
P = d(P, C, x, E, _, 21, s[63]);
a[0] = a[0] + E | 0;
a[1] = a[1] + P | 0;
a[2] = a[2] + C | 0;
a[3] = a[3] + x | 0;
},
_doFinalize: function() {
var t = this._data, i = t.words, r = 8 * this._nDataBytes, n = 8 * t.sigBytes;
i[n >>> 5] |= 128 << 24 - n % 32;
var a = e.floor(r / 4294967296), s = r;
i[15 + (n + 64 >>> 9 << 4)] = 16711935 & (a << 8 | a >>> 24) | 4278255360 & (a << 24 | a >>> 8);
i[14 + (n + 64 >>> 9 << 4)] = 16711935 & (s << 8 | s >>> 24) | 4278255360 & (s << 24 | s >>> 8);
t.sigBytes = 4 * (i.length + 1);
this._process();
for (var o = this._hash, c = o.words, f = 0; f < 4; f++) {
var h = c[f];
c[f] = 16711935 & (h << 8 | h >>> 24) | 4278255360 & (h << 24 | h >>> 8);
}
return o;
},
clone: function() {
var e = n.clone.call(this);
e._hash = this._hash.clone();
return e;
}
});
function f(e, t, i, r, n, a, s) {
var o = e + (t & i | ~t & r) + n + s;
return (o << a | o >>> 32 - a) + t;
}
function h(e, t, i, r, n, a, s) {
var o = e + (t & r | i & ~r) + n + s;
return (o << a | o >>> 32 - a) + t;
}
function u(e, t, i, r, n, a, s) {
var o = e + (t ^ i ^ r) + n + s;
return (o << a | o >>> 32 - a) + t;
}
function d(e, t, i, r, n, a, s) {
var o = e + (i ^ (t | ~r)) + n + s;
return (o << a | o >>> 32 - a) + t;
}
t.MD5 = n._createHelper(c);
t.HmacMD5 = n._createHmacHelper(c);
})(Math);
(function() {
var e = o, t = e.lib, i = t.WordArray, r = t.Hasher, n = e.algo, a = [], s = n.SHA1 = r.extend({
_doReset: function() {
this._hash = new i.init([ 1732584193, 4023233417, 2562383102, 271733878, 3285377520 ]);
},
_doProcessBlock: function(e, t) {
for (var i = this._hash.words, r = i[0], n = i[1], s = i[2], o = i[3], c = i[4], f = 0; f < 80; f++) {
if (f < 16) a[f] = 0 | e[t + f]; else {
var h = a[f - 3] ^ a[f - 8] ^ a[f - 14] ^ a[f - 16];
a[f] = h << 1 | h >>> 31;
}
var u = (r << 5 | r >>> 27) + c + a[f];
u += f < 20 ? 1518500249 + (n & s | ~n & o) : f < 40 ? 1859775393 + (n ^ s ^ o) : f < 60 ? (n & s | n & o | s & o) - 1894007588 : (n ^ s ^ o) - 899497514;
c = o;
o = s;
s = n << 30 | n >>> 2;
n = r;
r = u;
}
i[0] = i[0] + r | 0;
i[1] = i[1] + n | 0;
i[2] = i[2] + s | 0;
i[3] = i[3] + o | 0;
i[4] = i[4] + c | 0;
},
_doFinalize: function() {
var e = this._data, t = e.words, i = 8 * this._nDataBytes, r = 8 * e.sigBytes;
t[r >>> 5] |= 128 << 24 - r % 32;
t[14 + (r + 64 >>> 9 << 4)] = Math.floor(i / 4294967296);
t[15 + (r + 64 >>> 9 << 4)] = i;
e.sigBytes = 4 * t.length;
this._process();
return this._hash;
},
clone: function() {
var e = r.clone.call(this);
e._hash = this._hash.clone();
return e;
}
});
e.SHA1 = r._createHelper(s);
e.HmacSHA1 = r._createHmacHelper(s);
})();
(function(e) {
var t = o, i = t.lib, r = i.WordArray, n = i.Hasher, a = t.algo, s = [], c = [];
(function() {
function t(t) {
for (var i = e.sqrt(t), r = 2; r <= i; r++) if (!(t % r)) return !1;
return !0;
}
function i(e) {
return 4294967296 * (e - (0 | e)) | 0;
}
for (var r = 2, n = 0; n < 64; ) {
if (t(r)) {
n < 8 && (s[n] = i(e.pow(r, .5)));
c[n] = i(e.pow(r, 1 / 3));
n++;
}
r++;
}
})();
var f = [], h = a.SHA256 = n.extend({
_doReset: function() {
this._hash = new r.init(s.slice(0));
},
_doProcessBlock: function(e, t) {
for (var i = this._hash.words, r = i[0], n = i[1], a = i[2], s = i[3], o = i[4], h = i[5], u = i[6], d = i[7], l = 0; l < 64; l++) {
if (l < 16) f[l] = 0 | e[t + l]; else {
var p = f[l - 15], b = (p << 25 | p >>> 7) ^ (p << 14 | p >>> 18) ^ p >>> 3, g = f[l - 2], m = (g << 15 | g >>> 17) ^ (g << 13 | g >>> 19) ^ g >>> 10;
f[l] = b + f[l - 7] + m + f[l - 16];
}
var v = r & n ^ r & a ^ n & a, y = (r << 30 | r >>> 2) ^ (r << 19 | r >>> 13) ^ (r << 10 | r >>> 22), _ = d + ((o << 26 | o >>> 6) ^ (o << 21 | o >>> 11) ^ (o << 7 | o >>> 25)) + (o & h ^ ~o & u) + c[l] + f[l];
d = u;
u = h;
h = o;
o = s + _ | 0;
s = a;
a = n;
n = r;
r = _ + (y + v) | 0;
}
i[0] = i[0] + r | 0;
i[1] = i[1] + n | 0;
i[2] = i[2] + a | 0;
i[3] = i[3] + s | 0;
i[4] = i[4] + o | 0;
i[5] = i[5] + h | 0;
i[6] = i[6] + u | 0;
i[7] = i[7] + d | 0;
},
_doFinalize: function() {
var t = this._data, i = t.words, r = 8 * this._nDataBytes, n = 8 * t.sigBytes;
i[n >>> 5] |= 128 << 24 - n % 32;
i[14 + (n + 64 >>> 9 << 4)] = e.floor(r / 4294967296);
i[15 + (n + 64 >>> 9 << 4)] = r;
t.sigBytes = 4 * i.length;
this._process();
return this._hash;
},
clone: function() {
var e = n.clone.call(this);
e._hash = this._hash.clone();
return e;
}
});
t.SHA256 = n._createHelper(h);
t.HmacSHA256 = n._createHmacHelper(h);
})(Math);
(function() {
var e = o, t = e.lib.WordArray, i = e.algo, r = i.SHA256, n = i.SHA224 = r.extend({
_doReset: function() {
this._hash = new t.init([ 3238371032, 914150663, 812702999, 4144912697, 4290775857, 1750603025, 1694076839, 3204075428 ]);
},
_doFinalize: function() {
var e = r._doFinalize.call(this);
e.sigBytes -= 4;
return e;
}
});
e.SHA224 = r._createHelper(n);
e.HmacSHA224 = r._createHmacHelper(n);
})();
(function() {
var e = o, t = e.lib.Hasher, i = e.x64, r = i.Word, n = i.WordArray, a = e.algo;
function s() {
return r.create.apply(r, arguments);
}
var c = [ s(1116352408, 3609767458), s(1899447441, 602891725), s(3049323471, 3964484399), s(3921009573, 2173295548), s(961987163, 4081628472), s(1508970993, 3053834265), s(2453635748, 2937671579), s(2870763221, 3664609560), s(3624381080, 2734883394), s(310598401, 1164996542), s(607225278, 1323610764), s(1426881987, 3590304994), s(1925078388, 4068182383), s(2162078206, 991336113), s(2614888103, 633803317), s(3248222580, 3479774868), s(3835390401, 2666613458), s(4022224774, 944711139), s(264347078, 2341262773), s(604807628, 2007800933), s(770255983, 1495990901), s(1249150122, 1856431235), s(1555081692, 3175218132), s(1996064986, 2198950837), s(2554220882, 3999719339), s(2821834349, 766784016), s(2952996808, 2566594879), s(3210313671, 3203337956), s(3336571891, 1034457026), s(3584528711, 2466948901), s(113926993, 3758326383), s(338241895, 168717936), s(666307205, 1188179964), s(773529912, 1546045734), s(1294757372, 1522805485), s(1396182291, 2643833823), s(1695183700, 2343527390), s(1986661051, 1014477480), s(2177026350, 1206759142), s(2456956037, 344077627), s(2730485921, 1290863460), s(2820302411, 3158454273), s(3259730800, 3505952657), s(3345764771, 106217008), s(3516065817, 3606008344), s(3600352804, 1432725776), s(4094571909, 1467031594), s(275423344, 851169720), s(430227734, 3100823752), s(506948616, 1363258195), s(659060556, 3750685593), s(883997877, 3785050280), s(958139571, 3318307427), s(1322822218, 3812723403), s(1537002063, 2003034995), s(1747873779, 3602036899), s(1955562222, 1575990012), s(2024104815, 1125592928), s(2227730452, 2716904306), s(2361852424, 442776044), s(2428436474, 593698344), s(2756734187, 3733110249), s(3204031479, 2999351573), s(3329325298, 3815920427), s(3391569614, 3928383900), s(3515267271, 566280711), s(3940187606, 3454069534), s(4118630271, 4000239992), s(116418474, 1914138554), s(174292421, 2731055270), s(289380356, 3203993006), s(460393269, 320620315), s(685471733, 587496836), s(852142971, 1086792851), s(1017036298, 365543100), s(1126000580, 2618297676), s(1288033470, 3409855158), s(1501505948, 4234509866), s(1607167915, 987167468), s(1816402316, 1246189591) ], f = [];
(function() {
for (var e = 0; e < 80; e++) f[e] = s();
})();
var h = a.SHA512 = t.extend({
_doReset: function() {
this._hash = new n.init([ new r.init(1779033703, 4089235720), new r.init(3144134277, 2227873595), new r.init(1013904242, 4271175723), new r.init(2773480762, 1595750129), new r.init(1359893119, 2917565137), new r.init(2600822924, 725511199), new r.init(528734635, 4215389547), new r.init(1541459225, 327033209) ]);
},
_doProcessBlock: function(e, t) {
for (var i = this._hash.words, r = i[0], n = i[1], a = i[2], s = i[3], o = i[4], h = i[5], u = i[6], d = i[7], l = r.high, p = r.low, b = n.high, g = n.low, m = a.high, v = a.low, y = s.high, _ = s.low, w = o.high, S = o.low, k = h.high, M = h.low, A = u.high, I = u.low, E = d.high, P = d.low, C = l, x = p, O = b, N = g, T = m, j = v, D = y, R = _, B = w, L = S, U = k, q = M, F = A, z = I, H = E, J = P, K = 0; K < 80; K++) {
var W, V, G = f[K];
if (K < 16) {
V = G.high = 0 | e[t + 2 * K];
W = G.low = 0 | e[t + 2 * K + 1];
} else {
var Y = f[K - 15], X = Y.high, Z = Y.low, Q = (X >>> 1 | Z << 31) ^ (X >>> 8 | Z << 24) ^ X >>> 7, $ = (Z >>> 1 | X << 31) ^ (Z >>> 8 | X << 24) ^ (Z >>> 7 | X << 25), ee = f[K - 2], te = ee.high, ie = ee.low, re = (te >>> 19 | ie << 13) ^ (te << 3 | ie >>> 29) ^ te >>> 6, ne = (ie >>> 19 | te << 13) ^ (ie << 3 | te >>> 29) ^ (ie >>> 6 | te << 26), ae = f[K - 7], se = ae.high, oe = ae.low, ce = f[K - 16], fe = ce.high, he = ce.low;
V = (V = (V = Q + se + ((W = $ + oe) >>> 0 < $ >>> 0 ? 1 : 0)) + re + ((W += ne) >>> 0 < ne >>> 0 ? 1 : 0)) + fe + ((W += he) >>> 0 < he >>> 0 ? 1 : 0);
G.high = V;
G.low = W;
}
var ue, de = B & U ^ ~B & F, le = L & q ^ ~L & z, pe = C & O ^ C & T ^ O & T, be = x & N ^ x & j ^ N & j, ge = (C >>> 28 | x << 4) ^ (C << 30 | x >>> 2) ^ (C << 25 | x >>> 7), me = (x >>> 28 | C << 4) ^ (x << 30 | C >>> 2) ^ (x << 25 | C >>> 7), ve = (B >>> 14 | L << 18) ^ (B >>> 18 | L << 14) ^ (B << 23 | L >>> 9), ye = (L >>> 14 | B << 18) ^ (L >>> 18 | B << 14) ^ (L << 23 | B >>> 9), _e = c[K], we = _e.high, Se = _e.low, ke = H + ve + ((ue = J + ye) >>> 0 < J >>> 0 ? 1 : 0), Me = me + be;
H = F;
J = z;
F = U;
z = q;
U = B;
q = L;
B = D + (ke = (ke = (ke = ke + de + ((ue += le) >>> 0 < le >>> 0 ? 1 : 0)) + we + ((ue += Se) >>> 0 < Se >>> 0 ? 1 : 0)) + V + ((ue += W) >>> 0 < W >>> 0 ? 1 : 0)) + ((L = R + ue | 0) >>> 0 < R >>> 0 ? 1 : 0) | 0;
D = T;
R = j;
T = O;
j = N;
O = C;
N = x;
C = ke + (ge + pe + (Me >>> 0 < me >>> 0 ? 1 : 0)) + ((x = ue + Me | 0) >>> 0 < ue >>> 0 ? 1 : 0) | 0;
}
p = r.low = p + x;
r.high = l + C + (p >>> 0 < x >>> 0 ? 1 : 0);
g = n.low = g + N;
n.high = b + O + (g >>> 0 < N >>> 0 ? 1 : 0);
v = a.low = v + j;
a.high = m + T + (v >>> 0 < j >>> 0 ? 1 : 0);
_ = s.low = _ + R;
s.high = y + D + (_ >>> 0 < R >>> 0 ? 1 : 0);
S = o.low = S + L;
o.high = w + B + (S >>> 0 < L >>> 0 ? 1 : 0);
M = h.low = M + q;
h.high = k + U + (M >>> 0 < q >>> 0 ? 1 : 0);
I = u.low = I + z;
u.high = A + F + (I >>> 0 < z >>> 0 ? 1 : 0);
P = d.low = P + J;
d.high = E + H + (P >>> 0 < J >>> 0 ? 1 : 0);
},
_doFinalize: function() {
var e = this._data, t = e.words, i = 8 * this._nDataBytes, r = 8 * e.sigBytes;
t[r >>> 5] |= 128 << 24 - r % 32;
t[30 + (r + 128 >>> 10 << 5)] = Math.floor(i / 4294967296);
t[31 + (r + 128 >>> 10 << 5)] = i;
e.sigBytes = 4 * t.length;
this._process();
return this._hash.toX32();
},
clone: function() {
var e = t.clone.call(this);
e._hash = this._hash.clone();
return e;
},
blockSize: 32
});
e.SHA512 = t._createHelper(h);
e.HmacSHA512 = t._createHmacHelper(h);
})();
(function() {
var e = o, t = e.x64, i = t.Word, r = t.WordArray, n = e.algo, a = n.SHA512, s = n.SHA384 = a.extend({
_doReset: function() {
this._hash = new r.init([ new i.init(3418070365, 3238371032), new i.init(1654270250, 914150663), new i.init(2438529370, 812702999), new i.init(355462360, 4144912697), new i.init(1731405415, 4290775857), new i.init(2394180231, 1750603025), new i.init(3675008525, 1694076839), new i.init(1203062813, 3204075428) ]);
},
_doFinalize: function() {
var e = a._doFinalize.call(this);
e.sigBytes -= 16;
return e;
}
});
e.SHA384 = a._createHelper(s);
e.HmacSHA384 = a._createHmacHelper(s);
})();
(function(e) {
var t = o, i = t.lib, r = i.WordArray, n = i.Hasher, a = t.x64.Word, s = t.algo, c = [], f = [], h = [];
(function() {
for (var e = 1, t = 0, i = 0; i < 24; i++) {
c[e + 5 * t] = (i + 1) * (i + 2) / 2 % 64;
var r = (2 * e + 3 * t) % 5;
e = t % 5;
t = r;
}
for (e = 0; e < 5; e++) for (t = 0; t < 5; t++) f[e + 5 * t] = t + (2 * e + 3 * t) % 5 * 5;
for (var n = 1, s = 0; s < 24; s++) {
for (var o = 0, u = 0, d = 0; d < 7; d++) {
if (1 & n) {
var l = (1 << d) - 1;
l < 32 ? u ^= 1 << l : o ^= 1 << l - 32;
}
128 & n ? n = n << 1 ^ 113 : n <<= 1;
}
h[s] = a.create(o, u);
}
})();
var u = [];
(function() {
for (var e = 0; e < 25; e++) u[e] = a.create();
})();
var d = s.SHA3 = n.extend({
cfg: n.cfg.extend({
outputLength: 512
}),
_doReset: function() {
for (var e = this._state = [], t = 0; t < 25; t++) e[t] = new a.init();
this.blockSize = (1600 - 2 * this.cfg.outputLength) / 32;
},
_doProcessBlock: function(e, t) {
for (var i = this._state, r = this.blockSize / 2, n = 0; n < r; n++) {
var a = e[t + 2 * n], s = e[t + 2 * n + 1];
a = 16711935 & (a << 8 | a >>> 24) | 4278255360 & (a << 24 | a >>> 8);
s = 16711935 & (s << 8 | s >>> 24) | 4278255360 & (s << 24 | s >>> 8);
(P = i[n]).high ^= s;
P.low ^= a;
}
for (var o = 0; o < 24; o++) {
for (var d = 0; d < 5; d++) {
for (var l = 0, p = 0, b = 0; b < 5; b++) {
l ^= (P = i[d + 5 * b]).high;
p ^= P.low;
}
var g = u[d];
g.high = l;
g.low = p;
}
for (d = 0; d < 5; d++) {
var m = u[(d + 4) % 5], v = u[(d + 1) % 5], y = v.high, _ = v.low;
for (l = m.high ^ (y << 1 | _ >>> 31), p = m.low ^ (_ << 1 | y >>> 31), b = 0; b < 5; b++) {
(P = i[d + 5 * b]).high ^= l;
P.low ^= p;
}
}
for (var w = 1; w < 25; w++) {
var S = (P = i[w]).high, k = P.low, M = c[w];
if (M < 32) {
l = S << M | k >>> 32 - M;
p = k << M | S >>> 32 - M;
} else {
l = k << M - 32 | S >>> 64 - M;
p = S << M - 32 | k >>> 64 - M;
}
var A = u[f[w]];
A.high = l;
A.low = p;
}
var I = u[0], E = i[0];
I.high = E.high;
I.low = E.low;
for (d = 0; d < 5; d++) for (b = 0; b < 5; b++) {
var P = i[w = d + 5 * b], C = u[w], x = u[(d + 1) % 5 + 5 * b], O = u[(d + 2) % 5 + 5 * b];
P.high = C.high ^ ~x.high & O.high;
P.low = C.low ^ ~x.low & O.low;
}
P = i[0];
var N = h[o];
P.high ^= N.high;
P.low ^= N.low;
}
},
_doFinalize: function() {
var t = this._data, i = t.words, n = (this._nDataBytes, 8 * t.sigBytes), a = 32 * this.blockSize;
i[n >>> 5] |= 1 << 24 - n % 32;
i[(e.ceil((n + 1) / a) * a >>> 5) - 1] |= 128;
t.sigBytes = 4 * i.length;
this._process();
for (var s = this._state, o = this.cfg.outputLength / 8, c = o / 8, f = [], h = 0; h < c; h++) {
var u = s[h], d = u.high, l = u.low;
d = 16711935 & (d << 8 | d >>> 24) | 4278255360 & (d << 24 | d >>> 8);
l = 16711935 & (l << 8 | l >>> 24) | 4278255360 & (l << 24 | l >>> 8);
f.push(l);
f.push(d);
}
return new r.init(f, o);
},
clone: function() {
for (var e = n.clone.call(this), t = e._state = this._state.slice(0), i = 0; i < 25; i++) t[i] = t[i].clone();
return e;
}
});
t.SHA3 = n._createHelper(d);
t.HmacSHA3 = n._createHmacHelper(d);
})(Math);
(function() {
var e = o, t = e.lib, i = t.WordArray, r = t.Hasher, n = e.algo, a = i.create([ 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8, 3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12, 1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2, 4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13 ]), s = i.create([ 5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12, 6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2, 15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13, 8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14, 12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11 ]), c = i.create([ 11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8, 7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12, 11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5, 11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12, 9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6 ]), f = i.create([ 8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6, 9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11, 9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5, 15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8, 8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11 ]), h = i.create([ 0, 1518500249, 1859775393, 2400959708, 2840853838 ]), u = i.create([ 1352829926, 1548603684, 1836072691, 2053994217, 0 ]), d = n.RIPEMD160 = r.extend({
_doReset: function() {
this._hash = i.create([ 1732584193, 4023233417, 2562383102, 271733878, 3285377520 ]);
},
_doProcessBlock: function(e, t) {
for (var i = 0; i < 16; i++) {
var r = t + i, n = e[r];
e[r] = 16711935 & (n << 8 | n >>> 24) | 4278255360 & (n << 24 | n >>> 8);
}
var o, d, y, _, w, S, k, M, A, I, E, P = this._hash.words, C = h.words, x = u.words, O = a.words, N = s.words, T = c.words, j = f.words;
S = o = P[0];
k = d = P[1];
M = y = P[2];
A = _ = P[3];
I = w = P[4];
for (i = 0; i < 80; i += 1) {
E = o + e[t + O[i]] | 0;
E += i < 16 ? l(d, y, _) + C[0] : i < 32 ? p(d, y, _) + C[1] : i < 48 ? b(d, y, _) + C[2] : i < 64 ? g(d, y, _) + C[3] : m(d, y, _) + C[4];
E = (E = v(E |= 0, T[i])) + w | 0;
o = w;
w = _;
_ = v(y, 10);
y = d;
d = E;
E = S + e[t + N[i]] | 0;
E += i < 16 ? m(k, M, A) + x[0] : i < 32 ? g(k, M, A) + x[1] : i < 48 ? b(k, M, A) + x[2] : i < 64 ? p(k, M, A) + x[3] : l(k, M, A) + x[4];
E = (E = v(E |= 0, j[i])) + I | 0;
S = I;
I = A;
A = v(M, 10);
M = k;
k = E;
}
E = P[1] + y + A | 0;
P[1] = P[2] + _ + I | 0;
P[2] = P[3] + w + S | 0;
P[3] = P[4] + o + k | 0;
P[4] = P[0] + d + M | 0;
P[0] = E;
},
_doFinalize: function() {
var e = this._data, t = e.words, i = 8 * this._nDataBytes, r = 8 * e.sigBytes;
t[r >>> 5] |= 128 << 24 - r % 32;
t[14 + (r + 64 >>> 9 << 4)] = 16711935 & (i << 8 | i >>> 24) | 4278255360 & (i << 24 | i >>> 8);
e.sigBytes = 4 * (t.length + 1);
this._process();
for (var n = this._hash, a = n.words, s = 0; s < 5; s++) {
var o = a[s];
a[s] = 16711935 & (o << 8 | o >>> 24) | 4278255360 & (o << 24 | o >>> 8);
}
return n;
},
clone: function() {
var e = r.clone.call(this);
e._hash = this._hash.clone();
return e;
}
});
function l(e, t, i) {
return e ^ t ^ i;
}
function p(e, t, i) {
return e & t | ~e & i;
}
function b(e, t, i) {
return (e | ~t) ^ i;
}
function g(e, t, i) {
return e & i | t & ~i;
}
function m(e, t, i) {
return e ^ (t | ~i);
}
function v(e, t) {
return e << t | e >>> 32 - t;
}
e.RIPEMD160 = r._createHelper(d);
e.HmacRIPEMD160 = r._createHmacHelper(d);
})(Math);
(function() {
var e = o, t = e.lib.Base, i = e.enc.Utf8;
e.algo.HMAC = t.extend({
init: function(e, t) {
e = this._hasher = new e.init();
"string" == typeof t && (t = i.parse(t));
var r = e.blockSize, n = 4 * r;
t.sigBytes > n && (t = e.finalize(t));
t.clamp();
for (var a = this._oKey = t.clone(), s = this._iKey = t.clone(), o = a.words, c = s.words, f = 0; f < r; f++) {
o[f] ^= 1549556828;
c[f] ^= 909522486;
}
a.sigBytes = s.sigBytes = n;
this.reset();
},
reset: function() {
var e = this._hasher;
e.reset();
e.update(this._iKey);
},
update: function(e) {
this._hasher.update(e);
return this;
},
finalize: function(e) {
var t = this._hasher, i = t.finalize(e);
t.reset();
return t.finalize(this._oKey.clone().concat(i));
}
});
})();
(function() {
var e = o, t = e.lib, i = t.Base, r = t.WordArray, n = e.algo, a = n.SHA1, s = n.HMAC, c = n.PBKDF2 = i.extend({
cfg: i.extend({
keySize: 4,
hasher: a,
iterations: 1
}),
init: function(e) {
this.cfg = this.cfg.extend(e);
},
compute: function(e, t) {
for (var i = this.cfg, n = s.create(i.hasher, e), a = r.create(), o = r.create([ 1 ]), c = a.words, f = o.words, h = i.keySize, u = i.iterations; c.length < h; ) {
var d = n.update(t).finalize(o);
n.reset();
for (var l = d.words, p = l.length, b = d, g = 1; g < u; g++) {
b = n.finalize(b);
n.reset();
for (var m = b.words, v = 0; v < p; v++) l[v] ^= m[v];
}
a.concat(d);
f[0]++;
}
a.sigBytes = 4 * h;
return a;
}
});
e.PBKDF2 = function(e, t, i) {
return c.create(i).compute(e, t);
};
})();
(function() {
var e = o, t = e.lib, i = t.Base, r = t.WordArray, n = e.algo, a = n.MD5, s = n.EvpKDF = i.extend({
cfg: i.extend({
keySize: 4,
hasher: a,
iterations: 1
}),
init: function(e) {
this.cfg = this.cfg.extend(e);
},
compute: function(e, t) {
for (var i, n = this.cfg, a = n.hasher.create(), s = r.create(), o = s.words, c = n.keySize, f = n.iterations; o.length < c; ) {
i && a.update(i);
i = a.update(e).finalize(t);
a.reset();
for (var h = 1; h < f; h++) {
i = a.finalize(i);
a.reset();
}
s.concat(i);
}
s.sigBytes = 4 * c;
return s;
}
});
e.EvpKDF = function(e, t, i) {
return s.create(i).compute(e, t);
};
})();
o.lib.Cipher || function(e) {
var t = o, i = t.lib, r = i.Base, n = i.WordArray, a = i.BufferedBlockAlgorithm, s = t.enc, c = (s.Utf8, 
s.Base64), f = t.algo.EvpKDF, h = i.Cipher = a.extend({
cfg: r.extend(),
createEncryptor: function(e, t) {
return this.create(this._ENC_XFORM_MODE, e, t);
},
createDecryptor: function(e, t) {
return this.create(this._DEC_XFORM_MODE, e, t);
},
init: function(e, t, i) {
this.cfg = this.cfg.extend(i);
this._xformMode = e;
this._key = t;
this.reset();
},
reset: function() {
a.reset.call(this);
this._doReset();
},
process: function(e) {
this._append(e);
return this._process();
},
finalize: function(e) {
e && this._append(e);
return this._doFinalize();
},
keySize: 4,
ivSize: 4,
_ENC_XFORM_MODE: 1,
_DEC_XFORM_MODE: 2,
_createHelper: function() {
function e(e) {
return "string" == typeof e ? y : m;
}
return function(t) {
return {
encrypt: function(i, r, n) {
return e(r).encrypt(t, i, r, n);
},
decrypt: function(i, r, n) {
return e(r).decrypt(t, i, r, n);
}
};
};
}()
}), u = (i.StreamCipher = h.extend({
_doFinalize: function() {
return this._process(!0);
},
blockSize: 1
}), t.mode = {}), d = i.BlockCipherMode = r.extend({
createEncryptor: function(e, t) {
return this.Encryptor.create(e, t);
},
createDecryptor: function(e, t) {
return this.Decryptor.create(e, t);
},
init: function(e, t) {
this._cipher = e;
this._iv = t;
}
}), l = u.CBC = function() {
var t = d.extend();
t.Encryptor = t.extend({
processBlock: function(e, t) {
var r = this._cipher, n = r.blockSize;
i.call(this, e, t, n);
r.encryptBlock(e, t);
this._prevBlock = e.slice(t, t + n);
}
});
t.Decryptor = t.extend({
processBlock: function(e, t) {
var r = this._cipher, n = r.blockSize, a = e.slice(t, t + n);
r.decryptBlock(e, t);
i.call(this, e, t, n);
this._prevBlock = a;
}
});
function i(t, i, r) {
var n, a = this._iv;
if (a) {
n = a;
this._iv = e;
} else n = this._prevBlock;
for (var s = 0; s < r; s++) t[i + s] ^= n[s];
}
return t;
}(), p = (t.pad = {}).Pkcs7 = {
pad: function(e, t) {
for (var i = 4 * t, r = i - e.sigBytes % i, a = r << 24 | r << 16 | r << 8 | r, s = [], o = 0; o < r; o += 4) s.push(a);
var c = n.create(s, r);
e.concat(c);
},
unpad: function(e) {
var t = 255 & e.words[e.sigBytes - 1 >>> 2];
e.sigBytes -= t;
}
}, b = (i.BlockCipher = h.extend({
cfg: h.cfg.extend({
mode: l,
padding: p
}),
reset: function() {
var e;
h.reset.call(this);
var t = this.cfg, i = t.iv, r = t.mode;
if (this._xformMode == this._ENC_XFORM_MODE) e = r.createEncryptor; else {
e = r.createDecryptor;
this._minBufferSize = 1;
}
if (this._mode && this._mode.__creator == e) this._mode.init(this, i && i.words); else {
this._mode = e.call(r, this, i && i.words);
this._mode.__creator = e;
}
},
_doProcessBlock: function(e, t) {
this._mode.processBlock(e, t);
},
_doFinalize: function() {
var e, t = this.cfg.padding;
if (this._xformMode == this._ENC_XFORM_MODE) {
t.pad(this._data, this.blockSize);
e = this._process(!0);
} else {
e = this._process(!0);
t.unpad(e);
}
return e;
},
blockSize: 4
}), i.CipherParams = r.extend({
init: function(e) {
this.mixIn(e);
},
toString: function(e) {
return (e || this.formatter).stringify(this);
}
})), g = (t.format = {}).OpenSSL = {
stringify: function(e) {
var t = e.ciphertext, i = e.salt;
return (i ? n.create([ 1398893684, 1701076831 ]).concat(i).concat(t) : t).toString(c);
},
parse: function(e) {
var t, i = c.parse(e), r = i.words;
if (1398893684 == r[0] && 1701076831 == r[1]) {
t = n.create(r.slice(2, 4));
r.splice(0, 4);
i.sigBytes -= 16;
}
return b.create({
ciphertext: i,
salt: t
});
}
}, m = i.SerializableCipher = r.extend({
cfg: r.extend({
format: g
}),
encrypt: function(e, t, i, r) {
r = this.cfg.extend(r);
var n = e.createEncryptor(i, r), a = n.finalize(t), s = n.cfg;
return b.create({
ciphertext: a,
key: i,
iv: s.iv,
algorithm: e,
mode: s.mode,
padding: s.padding,
blockSize: e.blockSize,
formatter: r.format
});
},
decrypt: function(e, t, i, r) {
r = this.cfg.extend(r);
t = this._parse(t, r.format);
return e.createDecryptor(i, r).finalize(t.ciphertext);
},
_parse: function(e, t) {
return "string" == typeof e ? t.parse(e, this) : e;
}
}), v = (t.kdf = {}).OpenSSL = {
execute: function(e, t, i, r) {
r || (r = n.random(8));
var a = f.create({
keySize: t + i
}).compute(e, r), s = n.create(a.words.slice(t), 4 * i);
a.sigBytes = 4 * t;
return b.create({
key: a,
iv: s,
salt: r
});
}
}, y = i.PasswordBasedCipher = m.extend({
cfg: m.cfg.extend({
kdf: v
}),
encrypt: function(e, t, i, r) {
var n = (r = this.cfg.extend(r)).kdf.execute(i, e.keySize, e.ivSize);
r.iv = n.iv;
var a = m.encrypt.call(this, e, t, n.key, r);
a.mixIn(n);
return a;
},
decrypt: function(e, t, i, r) {
r = this.cfg.extend(r);
t = this._parse(t, r.format);
var n = r.kdf.execute(i, e.keySize, e.ivSize, t.salt);
r.iv = n.iv;
return m.decrypt.call(this, e, t, n.key, r);
}
});
}();
o.mode.CFB = function() {
var e = o.lib.BlockCipherMode.extend();
e.Encryptor = e.extend({
processBlock: function(e, i) {
var r = this._cipher, n = r.blockSize;
t.call(this, e, i, n, r);
this._prevBlock = e.slice(i, i + n);
}
});
e.Decryptor = e.extend({
processBlock: function(e, i) {
var r = this._cipher, n = r.blockSize, a = e.slice(i, i + n);
t.call(this, e, i, n, r);
this._prevBlock = a;
}
});
function t(e, t, i, r) {
var n, a = this._iv;
if (a) {
n = a.slice(0);
this._iv = void 0;
} else n = this._prevBlock;
r.encryptBlock(n, 0);
for (var s = 0; s < i; s++) e[t + s] ^= n[s];
}
return e;
}();
o.mode.CTR = function() {
var e = o.lib.BlockCipherMode.extend(), t = e.Encryptor = e.extend({
processBlock: function(e, t) {
var i = this._cipher, r = i.blockSize, n = this._iv, a = this._counter;
if (n) {
a = this._counter = n.slice(0);
this._iv = void 0;
}
var s = a.slice(0);
i.encryptBlock(s, 0);
a[r - 1] = a[r - 1] + 1 | 0;
for (var o = 0; o < r; o++) e[t + o] ^= s[o];
}
});
e.Decryptor = t;
return e;
}();
o.mode.CTRGladman = function() {
var e = o.lib.BlockCipherMode.extend();
function t(e) {
if (255 == (e >> 24 & 255)) {
var t = e >> 16 & 255, i = e >> 8 & 255, r = 255 & e;
if (255 === t) {
t = 0;
if (255 === i) {
i = 0;
255 === r ? r = 0 : ++r;
} else ++i;
} else ++t;
e = 0;
e += t << 16;
e += i << 8;
e += r;
} else e += 1 << 24;
return e;
}
function i(e) {
0 === (e[0] = t(e[0])) && (e[1] = t(e[1]));
return e;
}
var r = e.Encryptor = e.extend({
processBlock: function(e, t) {
var r = this._cipher, n = r.blockSize, a = this._iv, s = this._counter;
if (a) {
s = this._counter = a.slice(0);
this._iv = void 0;
}
i(s);
var o = s.slice(0);
r.encryptBlock(o, 0);
for (var c = 0; c < n; c++) e[t + c] ^= o[c];
}
});
e.Decryptor = r;
return e;
}();
o.mode.OFB = function() {
var e = o.lib.BlockCipherMode.extend(), t = e.Encryptor = e.extend({
processBlock: function(e, t) {
var i = this._cipher, r = i.blockSize, n = this._iv, a = this._keystream;
if (n) {
a = this._keystream = n.slice(0);
this._iv = void 0;
}
i.encryptBlock(a, 0);
for (var s = 0; s < r; s++) e[t + s] ^= a[s];
}
});
e.Decryptor = t;
return e;
}();
o.mode.ECB = function() {
var e = o.lib.BlockCipherMode.extend();
e.Encryptor = e.extend({
processBlock: function(e, t) {
this._cipher.encryptBlock(e, t);
}
});
e.Decryptor = e.extend({
processBlock: function(e, t) {
this._cipher.decryptBlock(e, t);
}
});
return e;
}();
o.pad.AnsiX923 = {
pad: function(e, t) {
var i = e.sigBytes, r = 4 * t, n = r - i % r, a = i + n - 1;
e.clamp();
e.words[a >>> 2] |= n << 24 - a % 4 * 8;
e.sigBytes += n;
},
unpad: function(e) {
var t = 255 & e.words[e.sigBytes - 1 >>> 2];
e.sigBytes -= t;
}
};
o.pad.Iso10126 = {
pad: function(e, t) {
var i = 4 * t, r = i - e.sigBytes % i;
e.concat(o.lib.WordArray.random(r - 1)).concat(o.lib.WordArray.create([ r << 24 ], 1));
},
unpad: function(e) {
var t = 255 & e.words[e.sigBytes - 1 >>> 2];
e.sigBytes -= t;
}
};
o.pad.Iso97971 = {
pad: function(e, t) {
e.concat(o.lib.WordArray.create([ 2147483648 ], 1));
o.pad.ZeroPadding.pad(e, t);
},
unpad: function(e) {
o.pad.ZeroPadding.unpad(e);
e.sigBytes--;
}
};
o.pad.ZeroPadding = {
pad: function(e, t) {
var i = 4 * t;
e.clamp();
e.sigBytes += i - (e.sigBytes % i || i);
},
unpad: function(e) {
var t = e.words, i = e.sigBytes - 1;
for (i = e.sigBytes - 1; i >= 0; i--) if (t[i >>> 2] >>> 24 - i % 4 * 8 & 255) {
e.sigBytes = i + 1;
break;
}
}
};
o.pad.NoPadding = {
pad: function() {},
unpad: function() {}
};
(function() {
var e = o, t = e.lib.CipherParams, i = e.enc.Hex;
e.format.Hex = {
stringify: function(e) {
return e.ciphertext.toString(i);
},
parse: function(e) {
var r = i.parse(e);
return t.create({
ciphertext: r
});
}
};
})();
(function() {
var e = o, t = e.lib.BlockCipher, i = e.algo, r = [], n = [], a = [], s = [], c = [], f = [], h = [], u = [], d = [], l = [];
(function() {
for (var e = [], t = 0; t < 256; t++) e[t] = t < 128 ? t << 1 : t << 1 ^ 283;
var i = 0, o = 0;
for (t = 0; t < 256; t++) {
var p = o ^ o << 1 ^ o << 2 ^ o << 3 ^ o << 4;
p = p >>> 8 ^ 255 & p ^ 99;
r[i] = p;
n[p] = i;
var b = e[i], g = e[b], m = e[g], v = 257 * e[p] ^ 16843008 * p;
a[i] = v << 24 | v >>> 8;
s[i] = v << 16 | v >>> 16;
c[i] = v << 8 | v >>> 24;
f[i] = v;
v = 16843009 * m ^ 65537 * g ^ 257 * b ^ 16843008 * i;
h[p] = v << 24 | v >>> 8;
u[p] = v << 16 | v >>> 16;
d[p] = v << 8 | v >>> 24;
l[p] = v;
if (i) {
i = b ^ e[e[e[m ^ b]]];
o ^= e[e[o]];
} else i = o = 1;
}
})();
var p = [ 0, 1, 2, 4, 8, 16, 32, 64, 128, 27, 54 ], b = i.AES = t.extend({
_doReset: function() {
if (!this._nRounds || this._keyPriorReset !== this._key) {
for (var e = this._keyPriorReset = this._key, t = e.words, i = e.sigBytes / 4, n = 4 * ((this._nRounds = i + 6) + 1), a = this._keySchedule = [], s = 0; s < n; s++) if (s < i) a[s] = t[s]; else {
f = a[s - 1];
if (s % i) i > 6 && s % i == 4 && (f = r[f >>> 24] << 24 | r[f >>> 16 & 255] << 16 | r[f >>> 8 & 255] << 8 | r[255 & f]); else {
f = r[(f = f << 8 | f >>> 24) >>> 24] << 24 | r[f >>> 16 & 255] << 16 | r[f >>> 8 & 255] << 8 | r[255 & f];
f ^= p[s / i | 0] << 24;
}
a[s] = a[s - i] ^ f;
}
for (var o = this._invKeySchedule = [], c = 0; c < n; c++) {
s = n - c;
if (c % 4) var f = a[s]; else f = a[s - 4];
o[c] = c < 4 || s <= 4 ? f : h[r[f >>> 24]] ^ u[r[f >>> 16 & 255]] ^ d[r[f >>> 8 & 255]] ^ l[r[255 & f]];
}
}
},
encryptBlock: function(e, t) {
this._doCryptBlock(e, t, this._keySchedule, a, s, c, f, r);
},
decryptBlock: function(e, t) {
var i = e[t + 1];
e[t + 1] = e[t + 3];
e[t + 3] = i;
this._doCryptBlock(e, t, this._invKeySchedule, h, u, d, l, n);
i = e[t + 1];
e[t + 1] = e[t + 3];
e[t + 3] = i;
},
_doCryptBlock: function(e, t, i, r, n, a, s, o) {
for (var c = this._nRounds, f = e[t] ^ i[0], h = e[t + 1] ^ i[1], u = e[t + 2] ^ i[2], d = e[t + 3] ^ i[3], l = 4, p = 1; p < c; p++) {
var b = r[f >>> 24] ^ n[h >>> 16 & 255] ^ a[u >>> 8 & 255] ^ s[255 & d] ^ i[l++], g = r[h >>> 24] ^ n[u >>> 16 & 255] ^ a[d >>> 8 & 255] ^ s[255 & f] ^ i[l++], m = r[u >>> 24] ^ n[d >>> 16 & 255] ^ a[f >>> 8 & 255] ^ s[255 & h] ^ i[l++], v = r[d >>> 24] ^ n[f >>> 16 & 255] ^ a[h >>> 8 & 255] ^ s[255 & u] ^ i[l++];
f = b;
h = g;
u = m;
d = v;
}
b = (o[f >>> 24] << 24 | o[h >>> 16 & 255] << 16 | o[u >>> 8 & 255] << 8 | o[255 & d]) ^ i[l++], 
g = (o[h >>> 24] << 24 | o[u >>> 16 & 255] << 16 | o[d >>> 8 & 255] << 8 | o[255 & f]) ^ i[l++], 
m = (o[u >>> 24] << 24 | o[d >>> 16 & 255] << 16 | o[f >>> 8 & 255] << 8 | o[255 & h]) ^ i[l++], 
v = (o[d >>> 24] << 24 | o[f >>> 16 & 255] << 16 | o[h >>> 8 & 255] << 8 | o[255 & u]) ^ i[l++];
e[t] = b;
e[t + 1] = g;
e[t + 2] = m;
e[t + 3] = v;
},
keySize: 8
});
e.AES = t._createHelper(b);
})();
(function() {
var e = o, t = e.lib, i = t.WordArray, r = t.BlockCipher, n = e.algo, a = [ 57, 49, 41, 33, 25, 17, 9, 1, 58, 50, 42, 34, 26, 18, 10, 2, 59, 51, 43, 35, 27, 19, 11, 3, 60, 52, 44, 36, 63, 55, 47, 39, 31, 23, 15, 7, 62, 54, 46, 38, 30, 22, 14, 6, 61, 53, 45, 37, 29, 21, 13, 5, 28, 20, 12, 4 ], s = [ 14, 17, 11, 24, 1, 5, 3, 28, 15, 6, 21, 10, 23, 19, 12, 4, 26, 8, 16, 7, 27, 20, 13, 2, 41, 52, 31, 37, 47, 55, 30, 40, 51, 45, 33, 48, 44, 49, 39, 56, 34, 53, 46, 42, 50, 36, 29, 32 ], c = [ 1, 2, 4, 6, 8, 10, 12, 14, 15, 17, 19, 21, 23, 25, 27, 28 ], f = [ {
0: 8421888,
268435456: 32768,
536870912: 8421378,
805306368: 2,
1073741824: 512,
1342177280: 8421890,
1610612736: 8389122,
1879048192: 8388608,
2147483648: 514,
2415919104: 8389120,
2684354560: 33280,
2952790016: 8421376,
3221225472: 32770,
3489660928: 8388610,
3758096384: 0,
4026531840: 33282,
134217728: 0,
402653184: 8421890,
671088640: 33282,
939524096: 32768,
1207959552: 8421888,
1476395008: 512,
1744830464: 8421378,
2013265920: 2,
2281701376: 8389120,
2550136832: 33280,
2818572288: 8421376,
3087007744: 8389122,
3355443200: 8388610,
3623878656: 32770,
3892314112: 514,
4160749568: 8388608,
1: 32768,
268435457: 2,
536870913: 8421888,
805306369: 8388608,
1073741825: 8421378,
1342177281: 33280,
1610612737: 512,
1879048193: 8389122,
2147483649: 8421890,
2415919105: 8421376,
2684354561: 8388610,
2952790017: 33282,
3221225473: 514,
3489660929: 8389120,
3758096385: 32770,
4026531841: 0,
134217729: 8421890,
402653185: 8421376,
671088641: 8388608,
939524097: 512,
1207959553: 32768,
1476395009: 8388610,
1744830465: 2,
2013265921: 33282,
2281701377: 32770,
2550136833: 8389122,
2818572289: 514,
3087007745: 8421888,
3355443201: 8389120,
3623878657: 0,
3892314113: 33280,
4160749569: 8421378
}, {
0: 1074282512,
16777216: 16384,
33554432: 524288,
50331648: 1074266128,
67108864: 1073741840,
83886080: 1074282496,
100663296: 1073758208,
117440512: 16,
134217728: 540672,
150994944: 1073758224,
167772160: 1073741824,
184549376: 540688,
201326592: 524304,
218103808: 0,
234881024: 16400,
251658240: 1074266112,
8388608: 1073758208,
25165824: 540688,
41943040: 16,
58720256: 1073758224,
75497472: 1074282512,
92274688: 1073741824,
109051904: 524288,
125829120: 1074266128,
142606336: 524304,
159383552: 0,
176160768: 16384,
192937984: 1074266112,
209715200: 1073741840,
226492416: 540672,
243269632: 1074282496,
260046848: 16400,
268435456: 0,
285212672: 1074266128,
301989888: 1073758224,
318767104: 1074282496,
335544320: 1074266112,
352321536: 16,
369098752: 540688,
385875968: 16384,
402653184: 16400,
419430400: 524288,
436207616: 524304,
452984832: 1073741840,
469762048: 540672,
486539264: 1073758208,
503316480: 1073741824,
520093696: 1074282512,
276824064: 540688,
293601280: 524288,
310378496: 1074266112,
327155712: 16384,
343932928: 1073758208,
360710144: 1074282512,
377487360: 16,
394264576: 1073741824,
411041792: 1074282496,
427819008: 1073741840,
444596224: 1073758224,
461373440: 524304,
478150656: 0,
494927872: 16400,
511705088: 1074266128,
528482304: 540672
}, {
0: 260,
1048576: 0,
2097152: 67109120,
3145728: 65796,
4194304: 65540,
5242880: 67108868,
6291456: 67174660,
7340032: 67174400,
8388608: 67108864,
9437184: 67174656,
10485760: 65792,
11534336: 67174404,
12582912: 67109124,
13631488: 65536,
14680064: 4,
15728640: 256,
524288: 67174656,
1572864: 67174404,
2621440: 0,
3670016: 67109120,
4718592: 67108868,
5767168: 65536,
6815744: 65540,
7864320: 260,
8912896: 4,
9961472: 256,
11010048: 67174400,
12058624: 65796,
13107200: 65792,
14155776: 67109124,
15204352: 67174660,
16252928: 67108864,
16777216: 67174656,
17825792: 65540,
18874368: 65536,
19922944: 67109120,
20971520: 256,
22020096: 67174660,
23068672: 67108868,
24117248: 0,
25165824: 67109124,
26214400: 67108864,
27262976: 4,
28311552: 65792,
29360128: 67174400,
30408704: 260,
31457280: 65796,
32505856: 67174404,
17301504: 67108864,
18350080: 260,
19398656: 67174656,
20447232: 0,
21495808: 65540,
22544384: 67109120,
23592960: 256,
24641536: 67174404,
25690112: 65536,
26738688: 67174660,
27787264: 65796,
28835840: 67108868,
29884416: 67109124,
30932992: 67174400,
31981568: 4,
33030144: 65792
}, {
0: 2151682048,
65536: 2147487808,
131072: 4198464,
196608: 2151677952,
262144: 0,
327680: 4198400,
393216: 2147483712,
458752: 4194368,
524288: 2147483648,
589824: 4194304,
655360: 64,
720896: 2147487744,
786432: 2151678016,
851968: 4160,
917504: 4096,
983040: 2151682112,
32768: 2147487808,
98304: 64,
163840: 2151678016,
229376: 2147487744,
294912: 4198400,
360448: 2151682112,
425984: 0,
491520: 2151677952,
557056: 4096,
622592: 2151682048,
688128: 4194304,
753664: 4160,
819200: 2147483648,
884736: 4194368,
950272: 4198464,
1015808: 2147483712,
1048576: 4194368,
1114112: 4198400,
1179648: 2147483712,
1245184: 0,
1310720: 4160,
1376256: 2151678016,
1441792: 2151682048,
1507328: 2147487808,
1572864: 2151682112,
1638400: 2147483648,
1703936: 2151677952,
1769472: 4198464,
1835008: 2147487744,
1900544: 4194304,
1966080: 64,
2031616: 4096,
1081344: 2151677952,
1146880: 2151682112,
1212416: 0,
1277952: 4198400,
1343488: 4194368,
1409024: 2147483648,
1474560: 2147487808,
1540096: 64,
1605632: 2147483712,
1671168: 4096,
1736704: 2147487744,
1802240: 2151678016,
1867776: 4160,
1933312: 2151682048,
1998848: 4194304,
2064384: 4198464
}, {
0: 128,
4096: 17039360,
8192: 262144,
12288: 536870912,
16384: 537133184,
20480: 16777344,
24576: 553648256,
28672: 262272,
32768: 16777216,
36864: 537133056,
40960: 536871040,
45056: 553910400,
49152: 553910272,
53248: 0,
57344: 17039488,
61440: 553648128,
2048: 17039488,
6144: 553648256,
10240: 128,
14336: 17039360,
18432: 262144,
22528: 537133184,
26624: 553910272,
30720: 536870912,
34816: 537133056,
38912: 0,
43008: 553910400,
47104: 16777344,
51200: 536871040,
55296: 553648128,
59392: 16777216,
63488: 262272,
65536: 262144,
69632: 128,
73728: 536870912,
77824: 553648256,
81920: 16777344,
86016: 553910272,
90112: 537133184,
94208: 16777216,
98304: 553910400,
102400: 553648128,
106496: 17039360,
110592: 537133056,
114688: 262272,
118784: 536871040,
122880: 0,
126976: 17039488,
67584: 553648256,
71680: 16777216,
75776: 17039360,
79872: 537133184,
83968: 536870912,
88064: 17039488,
92160: 128,
96256: 553910272,
100352: 262272,
104448: 553910400,
108544: 0,
112640: 553648128,
116736: 16777344,
120832: 262144,
124928: 537133056,
129024: 536871040
}, {
0: 268435464,
256: 8192,
512: 270532608,
768: 270540808,
1024: 268443648,
1280: 2097152,
1536: 2097160,
1792: 268435456,
2048: 0,
2304: 268443656,
2560: 2105344,
2816: 8,
3072: 270532616,
3328: 2105352,
3584: 8200,
3840: 270540800,
128: 270532608,
384: 270540808,
640: 8,
896: 2097152,
1152: 2105352,
1408: 268435464,
1664: 268443648,
1920: 8200,
2176: 2097160,
2432: 8192,
2688: 268443656,
2944: 270532616,
3200: 0,
3456: 270540800,
3712: 2105344,
3968: 268435456,
4096: 268443648,
4352: 270532616,
4608: 270540808,
4864: 8200,
5120: 2097152,
5376: 268435456,
5632: 268435464,
5888: 2105344,
6144: 2105352,
6400: 0,
6656: 8,
6912: 270532608,
7168: 8192,
7424: 268443656,
7680: 270540800,
7936: 2097160,
4224: 8,
4480: 2105344,
4736: 2097152,
4992: 268435464,
5248: 268443648,
5504: 8200,
5760: 270540808,
6016: 270532608,
6272: 270540800,
6528: 270532616,
6784: 8192,
7040: 2105352,
7296: 2097160,
7552: 0,
7808: 268435456,
8064: 268443656
}, {
0: 1048576,
16: 33555457,
32: 1024,
48: 1049601,
64: 34604033,
80: 0,
96: 1,
112: 34603009,
128: 33555456,
144: 1048577,
160: 33554433,
176: 34604032,
192: 34603008,
208: 1025,
224: 1049600,
240: 33554432,
8: 34603009,
24: 0,
40: 33555457,
56: 34604032,
72: 1048576,
88: 33554433,
104: 33554432,
120: 1025,
136: 1049601,
152: 33555456,
168: 34603008,
184: 1048577,
200: 1024,
216: 34604033,
232: 1,
248: 1049600,
256: 33554432,
272: 1048576,
288: 33555457,
304: 34603009,
320: 1048577,
336: 33555456,
352: 34604032,
368: 1049601,
384: 1025,
400: 34604033,
416: 1049600,
432: 1,
448: 0,
464: 34603008,
480: 33554433,
496: 1024,
264: 1049600,
280: 33555457,
296: 34603009,
312: 1,
328: 33554432,
344: 1048576,
360: 1025,
376: 34604032,
392: 33554433,
408: 34603008,
424: 0,
440: 34604033,
456: 1049601,
472: 1024,
488: 33555456,
504: 1048577
}, {
0: 134219808,
1: 131072,
2: 134217728,
3: 32,
4: 131104,
5: 134350880,
6: 134350848,
7: 2048,
8: 134348800,
9: 134219776,
10: 133120,
11: 134348832,
12: 2080,
13: 0,
14: 134217760,
15: 133152,
2147483648: 2048,
2147483649: 134350880,
2147483650: 134219808,
2147483651: 134217728,
2147483652: 134348800,
2147483653: 133120,
2147483654: 133152,
2147483655: 32,
2147483656: 134217760,
2147483657: 2080,
2147483658: 131104,
2147483659: 134350848,
2147483660: 0,
2147483661: 134348832,
2147483662: 134219776,
2147483663: 131072,
16: 133152,
17: 134350848,
18: 32,
19: 2048,
20: 134219776,
21: 134217760,
22: 134348832,
23: 131072,
24: 0,
25: 131104,
26: 134348800,
27: 134219808,
28: 134350880,
29: 133120,
30: 2080,
31: 134217728,
2147483664: 131072,
2147483665: 2048,
2147483666: 134348832,
2147483667: 133152,
2147483668: 32,
2147483669: 134348800,
2147483670: 134217728,
2147483671: 134219808,
2147483672: 134350880,
2147483673: 134217760,
2147483674: 134219776,
2147483675: 0,
2147483676: 133120,
2147483677: 2080,
2147483678: 131104,
2147483679: 134350848
} ], h = [ 4160749569, 528482304, 33030144, 2064384, 129024, 8064, 504, 2147483679 ], u = n.DES = r.extend({
_doReset: function() {
for (var e = this._key.words, t = [], i = 0; i < 56; i++) {
var r = a[i] - 1;
t[i] = e[r >>> 5] >>> 31 - r % 32 & 1;
}
for (var n = this._subKeys = [], o = 0; o < 16; o++) {
var f = n[o] = [], h = c[o];
for (i = 0; i < 24; i++) {
f[i / 6 | 0] |= t[(s[i] - 1 + h) % 28] << 31 - i % 6;
f[4 + (i / 6 | 0)] |= t[28 + (s[i + 24] - 1 + h) % 28] << 31 - i % 6;
}
f[0] = f[0] << 1 | f[0] >>> 31;
for (i = 1; i < 7; i++) f[i] = f[i] >>> 4 * (i - 1) + 3;
f[7] = f[7] << 5 | f[7] >>> 27;
}
var u = this._invSubKeys = [];
for (i = 0; i < 16; i++) u[i] = n[15 - i];
},
encryptBlock: function(e, t) {
this._doCryptBlock(e, t, this._subKeys);
},
decryptBlock: function(e, t) {
this._doCryptBlock(e, t, this._invSubKeys);
},
_doCryptBlock: function(e, t, i) {
this._lBlock = e[t];
this._rBlock = e[t + 1];
d.call(this, 4, 252645135);
d.call(this, 16, 65535);
l.call(this, 2, 858993459);
l.call(this, 8, 16711935);
d.call(this, 1, 1431655765);
for (var r = 0; r < 16; r++) {
for (var n = i[r], a = this._lBlock, s = this._rBlock, o = 0, c = 0; c < 8; c++) o |= f[c][((s ^ n[c]) & h[c]) >>> 0];
this._lBlock = s;
this._rBlock = a ^ o;
}
var u = this._lBlock;
this._lBlock = this._rBlock;
this._rBlock = u;
d.call(this, 1, 1431655765);
l.call(this, 8, 16711935);
l.call(this, 2, 858993459);
d.call(this, 16, 65535);
d.call(this, 4, 252645135);
e[t] = this._lBlock;
e[t + 1] = this._rBlock;
},
keySize: 2,
ivSize: 2,
blockSize: 2
});
function d(e, t) {
var i = (this._lBlock >>> e ^ this._rBlock) & t;
this._rBlock ^= i;
this._lBlock ^= i << e;
}
function l(e, t) {
var i = (this._rBlock >>> e ^ this._lBlock) & t;
this._lBlock ^= i;
this._rBlock ^= i << e;
}
e.DES = r._createHelper(u);
var p = n.TripleDES = r.extend({
_doReset: function() {
var e = this._key.words;
if (2 !== e.length && 4 !== e.length && e.length < 6) throw new Error("Invalid key length - 3DES requires the key length to be 64, 128, 192 or >192.");
var t = e.slice(0, 2), r = e.length < 4 ? e.slice(0, 2) : e.slice(2, 4), n = e.length < 6 ? e.slice(0, 2) : e.slice(4, 6);
this._des1 = u.createEncryptor(i.create(t));
this._des2 = u.createEncryptor(i.create(r));
this._des3 = u.createEncryptor(i.create(n));
},
encryptBlock: function(e, t) {
this._des1.encryptBlock(e, t);
this._des2.decryptBlock(e, t);
this._des3.encryptBlock(e, t);
},
decryptBlock: function(e, t) {
this._des3.decryptBlock(e, t);
this._des2.encryptBlock(e, t);
this._des1.decryptBlock(e, t);
},
keySize: 6,
ivSize: 2,
blockSize: 2
});
e.TripleDES = r._createHelper(p);
})();
(function() {
var e = o, t = e.lib.StreamCipher, i = e.algo, r = i.RC4 = t.extend({
_doReset: function() {
for (var e = this._key, t = e.words, i = e.sigBytes, r = this._S = [], n = 0; n < 256; n++) r[n] = n;
n = 0;
for (var a = 0; n < 256; n++) {
var s = n % i, o = t[s >>> 2] >>> 24 - s % 4 * 8 & 255;
a = (a + r[n] + o) % 256;
var c = r[n];
r[n] = r[a];
r[a] = c;
}
this._i = this._j = 0;
},
_doProcessBlock: function(e, t) {
e[t] ^= n.call(this);
},
keySize: 8,
ivSize: 0
});
function n() {
for (var e = this._S, t = this._i, i = this._j, r = 0, n = 0; n < 4; n++) {
i = (i + e[t = (t + 1) % 256]) % 256;
var a = e[t];
e[t] = e[i];
e[i] = a;
r |= e[(e[t] + e[i]) % 256] << 24 - 8 * n;
}
this._i = t;
this._j = i;
return r;
}
e.RC4 = t._createHelper(r);
var a = i.RC4Drop = r.extend({
cfg: r.cfg.extend({
drop: 192
}),
_doReset: function() {
r._doReset.call(this);
for (var e = this.cfg.drop; e > 0; e--) n.call(this);
}
});
e.RC4Drop = t._createHelper(a);
})();
(function() {
var e = o, t = e.lib.StreamCipher, i = e.algo, r = [], n = [], a = [], s = i.Rabbit = t.extend({
_doReset: function() {
for (var e = this._key.words, t = this.cfg.iv, i = 0; i < 4; i++) e[i] = 16711935 & (e[i] << 8 | e[i] >>> 24) | 4278255360 & (e[i] << 24 | e[i] >>> 8);
var r = this._X = [ e[0], e[3] << 16 | e[2] >>> 16, e[1], e[0] << 16 | e[3] >>> 16, e[2], e[1] << 16 | e[0] >>> 16, e[3], e[2] << 16 | e[1] >>> 16 ], n = this._C = [ e[2] << 16 | e[2] >>> 16, 4294901760 & e[0] | 65535 & e[1], e[3] << 16 | e[3] >>> 16, 4294901760 & e[1] | 65535 & e[2], e[0] << 16 | e[0] >>> 16, 4294901760 & e[2] | 65535 & e[3], e[1] << 16 | e[1] >>> 16, 4294901760 & e[3] | 65535 & e[0] ];
this._b = 0;
for (i = 0; i < 4; i++) c.call(this);
for (i = 0; i < 8; i++) n[i] ^= r[i + 4 & 7];
if (t) {
var a = t.words, s = a[0], o = a[1], f = 16711935 & (s << 8 | s >>> 24) | 4278255360 & (s << 24 | s >>> 8), h = 16711935 & (o << 8 | o >>> 24) | 4278255360 & (o << 24 | o >>> 8), u = f >>> 16 | 4294901760 & h, d = h << 16 | 65535 & f;
n[0] ^= f;
n[1] ^= u;
n[2] ^= h;
n[3] ^= d;
n[4] ^= f;
n[5] ^= u;
n[6] ^= h;
n[7] ^= d;
for (i = 0; i < 4; i++) c.call(this);
}
},
_doProcessBlock: function(e, t) {
var i = this._X;
c.call(this);
r[0] = i[0] ^ i[5] >>> 16 ^ i[3] << 16;
r[1] = i[2] ^ i[7] >>> 16 ^ i[5] << 16;
r[2] = i[4] ^ i[1] >>> 16 ^ i[7] << 16;
r[3] = i[6] ^ i[3] >>> 16 ^ i[1] << 16;
for (var n = 0; n < 4; n++) {
r[n] = 16711935 & (r[n] << 8 | r[n] >>> 24) | 4278255360 & (r[n] << 24 | r[n] >>> 8);
e[t + n] ^= r[n];
}
},
blockSize: 4,
ivSize: 2
});
function c() {
for (var e = this._X, t = this._C, i = 0; i < 8; i++) n[i] = t[i];
t[0] = t[0] + 1295307597 + this._b | 0;
t[1] = t[1] + 3545052371 + (t[0] >>> 0 < n[0] >>> 0 ? 1 : 0) | 0;
t[2] = t[2] + 886263092 + (t[1] >>> 0 < n[1] >>> 0 ? 1 : 0) | 0;
t[3] = t[3] + 1295307597 + (t[2] >>> 0 < n[2] >>> 0 ? 1 : 0) | 0;
t[4] = t[4] + 3545052371 + (t[3] >>> 0 < n[3] >>> 0 ? 1 : 0) | 0;
t[5] = t[5] + 886263092 + (t[4] >>> 0 < n[4] >>> 0 ? 1 : 0) | 0;
t[6] = t[6] + 1295307597 + (t[5] >>> 0 < n[5] >>> 0 ? 1 : 0) | 0;
t[7] = t[7] + 3545052371 + (t[6] >>> 0 < n[6] >>> 0 ? 1 : 0) | 0;
this._b = t[7] >>> 0 < n[7] >>> 0 ? 1 : 0;
for (i = 0; i < 8; i++) {
var r = e[i] + t[i], s = 65535 & r, o = r >>> 16, c = ((s * s >>> 17) + s * o >>> 15) + o * o, f = ((4294901760 & r) * r | 0) + ((65535 & r) * r | 0);
a[i] = c ^ f;
}
e[0] = a[0] + (a[7] << 16 | a[7] >>> 16) + (a[6] << 16 | a[6] >>> 16) | 0;
e[1] = a[1] + (a[0] << 8 | a[0] >>> 24) + a[7] | 0;
e[2] = a[2] + (a[1] << 16 | a[1] >>> 16) + (a[0] << 16 | a[0] >>> 16) | 0;
e[3] = a[3] + (a[2] << 8 | a[2] >>> 24) + a[1] | 0;
e[4] = a[4] + (a[3] << 16 | a[3] >>> 16) + (a[2] << 16 | a[2] >>> 16) | 0;
e[5] = a[5] + (a[4] << 8 | a[4] >>> 24) + a[3] | 0;
e[6] = a[6] + (a[5] << 16 | a[5] >>> 16) + (a[4] << 16 | a[4] >>> 16) | 0;
e[7] = a[7] + (a[6] << 8 | a[6] >>> 24) + a[5] | 0;
}
e.Rabbit = t._createHelper(s);
})();
(function() {
var e = o, t = e.lib.StreamCipher, i = e.algo, r = [], n = [], a = [], s = i.RabbitLegacy = t.extend({
_doReset: function() {
var e = this._key.words, t = this.cfg.iv, i = this._X = [ e[0], e[3] << 16 | e[2] >>> 16, e[1], e[0] << 16 | e[3] >>> 16, e[2], e[1] << 16 | e[0] >>> 16, e[3], e[2] << 16 | e[1] >>> 16 ], r = this._C = [ e[2] << 16 | e[2] >>> 16, 4294901760 & e[0] | 65535 & e[1], e[3] << 16 | e[3] >>> 16, 4294901760 & e[1] | 65535 & e[2], e[0] << 16 | e[0] >>> 16, 4294901760 & e[2] | 65535 & e[3], e[1] << 16 | e[1] >>> 16, 4294901760 & e[3] | 65535 & e[0] ];
this._b = 0;
for (var n = 0; n < 4; n++) c.call(this);
for (n = 0; n < 8; n++) r[n] ^= i[n + 4 & 7];
if (t) {
var a = t.words, s = a[0], o = a[1], f = 16711935 & (s << 8 | s >>> 24) | 4278255360 & (s << 24 | s >>> 8), h = 16711935 & (o << 8 | o >>> 24) | 4278255360 & (o << 24 | o >>> 8), u = f >>> 16 | 4294901760 & h, d = h << 16 | 65535 & f;
r[0] ^= f;
r[1] ^= u;
r[2] ^= h;
r[3] ^= d;
r[4] ^= f;
r[5] ^= u;
r[6] ^= h;
r[7] ^= d;
for (n = 0; n < 4; n++) c.call(this);
}
},
_doProcessBlock: function(e, t) {
var i = this._X;
c.call(this);
r[0] = i[0] ^ i[5] >>> 16 ^ i[3] << 16;
r[1] = i[2] ^ i[7] >>> 16 ^ i[5] << 16;
r[2] = i[4] ^ i[1] >>> 16 ^ i[7] << 16;
r[3] = i[6] ^ i[3] >>> 16 ^ i[1] << 16;
for (var n = 0; n < 4; n++) {
r[n] = 16711935 & (r[n] << 8 | r[n] >>> 24) | 4278255360 & (r[n] << 24 | r[n] >>> 8);
e[t + n] ^= r[n];
}
},
blockSize: 4,
ivSize: 2
});
function c() {
for (var e = this._X, t = this._C, i = 0; i < 8; i++) n[i] = t[i];
t[0] = t[0] + 1295307597 + this._b | 0;
t[1] = t[1] + 3545052371 + (t[0] >>> 0 < n[0] >>> 0 ? 1 : 0) | 0;
t[2] = t[2] + 886263092 + (t[1] >>> 0 < n[1] >>> 0 ? 1 : 0) | 0;
t[3] = t[3] + 1295307597 + (t[2] >>> 0 < n[2] >>> 0 ? 1 : 0) | 0;
t[4] = t[4] + 3545052371 + (t[3] >>> 0 < n[3] >>> 0 ? 1 : 0) | 0;
t[5] = t[5] + 886263092 + (t[4] >>> 0 < n[4] >>> 0 ? 1 : 0) | 0;
t[6] = t[6] + 1295307597 + (t[5] >>> 0 < n[5] >>> 0 ? 1 : 0) | 0;
t[7] = t[7] + 3545052371 + (t[6] >>> 0 < n[6] >>> 0 ? 1 : 0) | 0;
this._b = t[7] >>> 0 < n[7] >>> 0 ? 1 : 0;
for (i = 0; i < 8; i++) {
var r = e[i] + t[i], s = 65535 & r, o = r >>> 16, c = ((s * s >>> 17) + s * o >>> 15) + o * o, f = ((4294901760 & r) * r | 0) + ((65535 & r) * r | 0);
a[i] = c ^ f;
}
e[0] = a[0] + (a[7] << 16 | a[7] >>> 16) + (a[6] << 16 | a[6] >>> 16) | 0;
e[1] = a[1] + (a[0] << 8 | a[0] >>> 24) + a[7] | 0;
e[2] = a[2] + (a[1] << 16 | a[1] >>> 16) + (a[0] << 16 | a[0] >>> 16) | 0;
e[3] = a[3] + (a[2] << 8 | a[2] >>> 24) + a[1] | 0;
e[4] = a[4] + (a[3] << 16 | a[3] >>> 16) + (a[2] << 16 | a[2] >>> 16) | 0;
e[5] = a[5] + (a[4] << 8 | a[4] >>> 24) + a[3] | 0;
e[6] = a[6] + (a[5] << 16 | a[5] >>> 16) + (a[4] << 16 | a[4] >>> 16) | 0;
e[7] = a[7] + (a[6] << 8 | a[6] >>> 24) + a[5] | 0;
}
e.RabbitLegacy = t._createHelper(s);
})();
return o;
}, "object" == typeof i ? t.exports = i = n() : "function" == typeof define && define.amd ? define([], n) : (void 0).CryptoJS = n();
var n;
cc._RF.pop();
}).call(this, "undefined" != typeof global ? global : "undefined" != typeof self ? self : "undefined" != typeof window ? window : {});
}, {
crypto: 75
} ],
startscreen: [ function(e, t, i) {
"use strict";
cc._RF.push(t, "ad361LEuwJBYrSfUuCwIYib", "startscreen");
var r, n = this && this.__extends || (r = function(e, t) {
return (r = Object.setPrototypeOf || {
__proto__: []
} instanceof Array && function(e, t) {
e.__proto__ = t;
} || function(e, t) {
for (var i in t) Object.prototype.hasOwnProperty.call(t, i) && (e[i] = t[i]);
})(e, t);
}, function(e, t) {
r(e, t);
function i() {
this.constructor = e;
}
e.prototype = null === t ? Object.create(t) : (i.prototype = t.prototype, new i());
}), a = this && this.__decorate || function(e, t, i, r) {
var n, a = arguments.length, s = a < 3 ? t : null === r ? r = Object.getOwnPropertyDescriptor(t, i) : r;
if ("object" == typeof Reflect && "function" == typeof Reflect.decorate) s = Reflect.decorate(e, t, i, r); else for (var o = e.length - 1; o >= 0; o--) (n = e[o]) && (s = (a < 3 ? n(s) : a > 3 ? n(t, i, s) : n(t, i)) || s);
return a > 3 && s && Object.defineProperty(t, i, s), s;
};
Object.defineProperty(i, "__esModule", {
value: !0
});
i.Startscreen = void 0;
var s = e("./TESDKHelper"), o = e("./UpdateMgr"), c = cc._decorator, f = c.ccclass, h = c.property, u = function(e) {
n(t, e);
function t() {
var t = null !== e && e.apply(this, arguments) || this;
t.percentage = null;
t.msgLabel = null;
t.rebootPanel = null;
t.restartBtn = null;
t.forceUpdatePanel = null;
t.hotfixEnabled = !1;
t.logoSceneName = "gamelogo";
t.pkgVer = "";
t.forceUpdateUrl = "";
t.gconfig = null;
t.hfixUrl = "";
t.verificationRqd = !0;
t.pkgName = "";
t.updateMgr = null;
t.isEn = !1;
t.currentIndex = 0;
t.pollingNum = 0;
return t;
}
i = t;
t.prototype.onLoad = function() {
this.restartBtn.on("click", function() {
cc.audioEngine.stopAll();
cc.game.restart();
}, this);
};
t.prototype.start = function() {
var e = this;
cc.macro.ENABLE_MULTI_TOUCH = !1;
cc.macro.CLEANUP_IMAGE_CACHE = !0;
cc.dynamicAtlasManager.enabled = !1;
console.log("search paths>>>>" + JSON.stringify(jsb.fileUtils.getSearchPaths()));
var t = new Promise(function(e, t) {
cc.assetManager.loadBundle("donttouchme", function(i, r) {
i ? t(i) : e(r);
});
}).then(function(t) {
return new Promise(function(i, r) {
t.load("gameconfigs", cc.JsonAsset, function(n, a) {
if (n) r(n); else {
var o = a.json;
e.gconfig = o;
e.pkgVer = o.pkgv;
var c = 1;
e.isEn ? c = 2 : cc.sys.platform != cc.sys.BYTEDANCE_GAME && cc.sys.platform != cc.sys.WECHAT_GAME && cc.sys.platform != cc.sys.VIVO_GAME || (c = o.WXIosVer ? 0 : 3);
s.TESDKHelper.init(c, o);
e.checkAndroidApk(o);
i(t);
}
});
});
}).then(function(t) {
return new Promise(function(i, r) {
e.percentage.string = "downloading upgrade file...";
e.tryLoadingUpFile().then(function(n) {
var a = "";
cc.sys.os === cc.sys.OS_IOS ? a = "ios" : cc.sys.os === cc.sys.OS_ANDROID ? a = jsb.reflection.callStaticMethod("com/maple/madherogo/AppActivity", "jsGetPackageName", "()Ljava/lang/String;") : "OpenHarmony" === cc.sys.os && (a = "harmonyos-next");
var s = n[a], o = s ? s.pkgver : "1.0.0";
if (e.pkgVer < o) {
e.forceUpdatePanel.active = !0;
var c = cc.find("Button", e.forceUpdatePanel);
e.forceUpdateUrl = s.url;
c.active = "" != e.forceUpdateUrl;
r("force update");
} else {
if (jsb.fileUtils.isFileExist("project.manifest")) {
var f = JSON.parse(jsb.fileUtils.getStringFromFile("project.manifest"));
if (Number(f.version) < Number(n.cleanVer)) {
jsb.fileUtils.removeDirectory(e.storagePath);
jsb.fileUtils.removeDirectory(e.storagePath + "_temp");
}
}
e.verificationRqd = n.verificationReqd;
e.pkgName = n.pkgName;
t.load("project", cc.Asset, function(e, t) {
e ? r(e) : i(t);
});
}
}).catch(function(t) {
e.percentage.string = "Failed to load upgrade file!";
r(t);
});
});
}).then(function(t) {
e.percentage.string = "Checking for updates...";
return new Promise(function(r, n) {
i.hotUpdateUrl = e.hfixUrl + e.pkgName + "/";
var a = new o.UpdateMgr(t.nativeUrl, e.storagePath, e.hfixUrl + e.pkgName + "/", function(t) {
switch (t) {
case o.UpdateOverState.FAILED:
n("update failed");
break;

case o.UpdateOverState.SUCCEED_TO_REBOOT:
e.rebootPanel.active = !0;
break;

default:
r();
}
});
e.updateMgr = a;
a.displayLabel = e.percentage;
a.msgLabel = e.msgLabel;
a.verificationRequired = e.verificationRqd;
a.checkUpdate();
});
}).then(function() {
e.updateMgr = null;
return new Promise(function(e, t) {
cc.assetManager.loadBundle("common", function(i) {
i ? t(i) : e();
});
});
}).then(function() {
return new Promise(function(t, i) {
cc.assetManager.loadBundle("launchscreen", function(r, n) {
r ? i(r) : n.loadScene(e.logoSceneName, function(e, i) {
t(i);
});
});
});
}), r = new Promise(function(t) {
e.scheduleOnce(function() {
t();
}, 2);
});
Promise.all([ t, r ]).then(function(e) {
cc.director.runScene(e[0]);
}).catch(function(e) {
console.log(e);
e instanceof Error && console.log(e.stack);
});
};
Object.defineProperty(t.prototype, "storagePath", {
get: function() {
return (jsb.fileUtils ? jsb.fileUtils.getWritablePath() : "/") + "hotfix/";
},
enumerable: !1,
configurable: !0
});
t.prototype.tryLoadingUpFile = function() {
var e = this;
return new Promise(function(t, i) {
var r = e.gconfig.hotfixurls[e.gconfig.hID], n = e.gconfig.hentry;
n || (n = "upgrade.json");
if (r.length > 1) {
e.startPolling(r, n);
"" == e.hfixUrl && (e.hfixUrl = r[0]);
} else e.hfixUrl = r[0];
e.loadJson(e.hfixUrl + n).then(function(e) {
t(e);
}).catch(function(a) {
if (r.length < 2) i(a); else {
e.hfixUrl = r[1];
e.loadJson(e.hfixUrl + n).then(function(e) {
t(e);
}).catch(function(e) {
i(e);
});
}
});
});
};
t.prototype.loadJson = function(e) {
return new Promise(function(t, i) {
e += "?v=" + Date.now();
cc.assetManager.loadRemote(e, function(r, n) {
if (r) i(r); else {
var a = n.json;
cc.assetManager.cacheManager && cc.assetManager.cacheManager.removeCache(e);
t(a);
}
});
});
};
t.prototype.onForceUpdateClick = function() {
cc.sys.openURL(this.forceUpdateUrl);
};
t.prototype.startPolling = function(e, t) {
var i = e[this.currentIndex] + t;
this.currentIndex = (this.currentIndex + 1) % e.length;
this.pollingNum++;
var r = new XMLHttpRequest();
r.timeout = 2e3;
var n = this;
r.onreadystatechange = function() {
4 == r.readyState && r.status >= 200 && r.status <= 207 ? n.hfixUrl = i : 4 == r.readyState && 0 == r.status && n.pollingNum <= e.length && n.startPolling(e, t);
};
r.open("GET", i, !0);
r.send(null);
};
t.prototype.checkAndroidApk = function(e) {
if (cc.sys.os === cc.sys.OS_ANDROID && e.hasOwnProperty("androidApkCode")) {
var t = e.androidHotVer;
if (cc.sys.localStorage.getItem("androidApkCode") != t.tostring()) {
jsb.fileUtils.removeDirectory(this.storagePath);
jsb.fileUtils.removeDirectory(this.storagePath + "_temp");
cc.sys.localStorage.setItem("androidApkCode", t);
}
}
};
var i;
t.hotUpdateUrl = "";
a([ h(cc.Label) ], t.prototype, "percentage", void 0);
a([ h(cc.Label) ], t.prototype, "msgLabel", void 0);
a([ h(cc.Node) ], t.prototype, "rebootPanel", void 0);
a([ h(cc.Node) ], t.prototype, "restartBtn", void 0);
a([ h(cc.Node) ], t.prototype, "forceUpdatePanel", void 0);
a([ h(cc.Boolean) ], t.prototype, "hotfixEnabled", void 0);
a([ h(cc.String) ], t.prototype, "logoSceneName", void 0);
return i = a([ f ], t);
}(cc.Component);
i.Startscreen = u;
cc._RF.pop();
}, {
"./TESDKHelper": "TESDKHelper",
"./UpdateMgr": "UpdateMgr"
} ],
"tdanalytics.mg.cocoscreator.min": [ function(e, t) {
"use strict";
cc._RF.push(t, "79002wUmDRMZqgnhI0P2BV0", "tdanalytics.mg.cocoscreator.min");
function i(e) {
return (i = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e) {
return typeof e;
} : function(e) {
return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
})(e);
}
function r(e, t) {
if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
}
function n(e, t) {
for (var i = 0; i < t.length; i++) {
var r = t[i];
r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), 
Object.defineProperty(e, r.key, r);
}
}
function a(e, t, i) {
return t && n(e.prototype, t), i && n(e, i), e;
}
var s = {}, o = Array.prototype, c = Object.prototype, f = o.slice, h = c.toString, u = Object.prototype.hasOwnProperty, d = o.forEach, l = Array.isArray, p = {}, b = [ "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term" ];
s.each = function(e, t, i) {
if (null == e) return !1;
if (d && e.forEach === d) e.forEach(t, i); else if (e.length === +e.length) {
for (var r = 0, n = e.length; r < n; r++) if (r in e && t.call(i, e[r], r, e) === p) return !1;
} else for (var a in e) if (u.call(e, a) && t.call(i, e[a], a, e) === p) return !1;
}, s.extend = function(e) {
return s.each(f.call(arguments, 1), function(t) {
for (var i in t) void 0 !== t[i] && (e[i] = t[i]);
}), e;
}, s.extend2Layers = function(e) {
return s.each(f.call(arguments, 1), function(t) {
for (var i in t) void 0 !== t[i] && (s.isObject(t[i]) && s.isObject(e[i]) ? s.extend(e[i], t[i]) : e[i] = t[i]);
}), e;
}, s.isArray = l || function(e) {
return "[object Array]" === h.call(e);
}, s.isFunction = function(e) {
try {
return "function" == typeof e;
} catch (e) {
return !1;
}
}, s.isPromise = function(e) {
return "[object Promise]" === h.call(e) && null != e;
}, s.isObject = function(e) {
return "[object Object]" === h.call(e) && null != e;
}, s.isEmptyObject = function(e) {
if (s.isObject(e)) {
for (var t in e) if (u.call(e, t)) return !1;
return !0;
}
return !1;
}, s.isUndefined = function(e) {
return void 0 === e;
}, s.isString = function(e) {
return "[object String]" === h.call(e);
}, s.isDate = function(e) {
return "[object Date]" === h.call(e);
}, s.isBoolean = function(e) {
return "[object Boolean]" === h.call(e);
}, s.isNumber = function(e) {
return "[object Number]" === h.call(e) && /[\d\.]+/.test(String(e));
}, s.isJSONString = function(e) {
try {
JSON.parse(e);
} catch (e) {
return !1;
}
return !0;
}, s.decodeURIComponent = function(e) {
var t = "";
try {
t = decodeURIComponent(e);
} catch (i) {
t = e;
}
return t;
}, s.encodeURIComponent = function(e) {
var t = "";
try {
t = encodeURIComponent(e);
} catch (i) {
t = e;
}
return t;
}, s.utf8Encode = function(e) {
for (var t, i = "", r = t = 0, n = (e = (e + "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")).length, a = 0; a < n; a++) {
var s = e.charCodeAt(a), o = null;
s < 128 ? t++ : o = 127 < s && s < 2048 ? String.fromCharCode(s >> 6 | 192, 63 & s | 128) : String.fromCharCode(s >> 12 | 224, s >> 6 & 63 | 128, 63 & s | 128), 
null !== o && (r < t && (i += e.substring(r, t)), i += o, r = t = a + 1);
}
return r < t && (i += e.substring(r, e.length)), i;
}, s.base64Encode = function(e) {
var t, i, r, n, a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", o = 0, c = 0, f = "", h = [];
if (!e) return e;
for (e = s.utf8Encode(e); t = (n = e.charCodeAt(o++) << 16 | e.charCodeAt(o++) << 8 | e.charCodeAt(o++)) >> 18 & 63, 
i = n >> 12 & 63, r = n >> 6 & 63, n &= 63, h[c++] = a.charAt(t) + a.charAt(i) + a.charAt(r) + a.charAt(n), 
o < e.length; ) ;
switch (f = h.join(""), e.length % 3) {
case 1:
f = f.slice(0, -2) + "==";
break;

case 2:
f = f.slice(0, -1) + "=";
}
return f;
}, s.encodeDates = function(e) {
return s.each(e, function(t, i) {
if (s.isDate(t)) e[i] = s.formatDate(t); else if (s.isObject(t)) e[i] = s.encodeDates(t); else if (s.isArray(t)) for (var r = 0; r < t.length; r++) s.isDate(t[r]) && (e[i][r] = s.formatDate(t[r]));
}), e;
}, s.formatDate = function(e) {
function t(e) {
return e < 10 ? "0" + e : e;
}
return e.getFullYear() + "-" + t(e.getMonth() + 1) + "-" + t(e.getDate()) + " " + t(e.getHours()) + ":" + t(e.getMinutes()) + ":" + t(e.getSeconds()) + "." + ((i = e.getMilliseconds()) < 100 && 9 < i ? "0" + i : i < 10 ? "00" + i : i);
var i;
}, s.searchObjDate = function(e) {
try {
(s.isObject(e) || s.isArray(e)) && s.each(e, function(t, i) {
s.isObject(t) || s.isArray(t) ? s.searchObjDate(e[i]) : s.isDate(t) && (e[i] = s.formatDate(t));
});
} catch (e) {
g.warn(e);
}
}, s.UUID = function() {
var e = new Date().getTime();
return String(Math.random()).replace(".", "").slice(1, 11) + "-" + e;
}, s.UUIDv4 = function() {
return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(e) {
var t = 16 * Math.random() | 0;
return ("x" === e ? t : 3 & t | 8).toString(16);
});
}, s.setMpPlatform = function(e) {
s.mpPlatform = e;
}, s.getMpPlatform = function() {
return s.mpPlatform;
}, s.createExtraHeaders = function() {
return {
"TA-Integration-Type": "MG",
"TA-Integration-Version": "3.0.1",
"TA-Integration-Count": "1",
"TA-Integration-Extra": s.getMpPlatform()
};
}, s.checkAppId = function(e) {
return e.replace(/\s*/g, "");
}, s.checkUrl = function(e) {
return e = e.replace(/\s*/g, ""), s.url("basic", e);
}, s.url = function() {
function e() {
return new RegExp(/(.*?)\.?([^.]*?)\.(com|net|org|biz|ws|in|me|co\.uk|co|org\.uk|ltd\.uk|plc\.uk|me\.uk|edu|mil|br\.com|cn\.com|eu\.com|hu\.com|no\.com|qc\.com|sa\.com|se\.com|se\.net|us\.com|uy\.com|ac|co\.ac|gv\.ac|or\.ac|ac\.ac|af|am|as|at|ac\.at|co\.at|gv\.at|or\.at|asn\.au|com\.au|edu\.au|org\.au|net\.au|id\.au|be|ac\.be|adm\.br|adv\.br|am\.br|arq\.br|art\.br|bio\.br|cng\.br|cnt\.br|com\.br|ecn\.br|eng\.br|esp\.br|etc\.br|eti\.br|fm\.br|fot\.br|fst\.br|g12\.br|gov\.br|ind\.br|inf\.br|jor\.br|lel\.br|med\.br|mil\.br|net\.br|nom\.br|ntr\.br|odo\.br|org\.br|ppg\.br|pro\.br|psc\.br|psi\.br|rec\.br|slg\.br|tmp\.br|tur\.br|tv\.br|vet\.br|zlg\.br|br|ab\.ca|bc\.ca|mb\.ca|nb\.ca|nf\.ca|ns\.ca|nt\.ca|on\.ca|pe\.ca|qc\.ca|sk\.ca|yk\.ca|ca|cc|ac\.cn|net\.cn|com\.cn|edu\.cn|gov\.cn|org\.cn|bj\.cn|sh\.cn|tj\.cn|cq\.cn|he\.cn|nm\.cn|ln\.cn|jl\.cn|hl\.cn|js\.cn|zj\.cn|ah\.cn|gd\.cn|gx\.cn|hi\.cn|sc\.cn|gz\.cn|yn\.cn|xz\.cn|sn\.cn|gs\.cn|qh\.cn|nx\.cn|xj\.cn|tw\.cn|hk\.cn|mo\.cn|cn|cx|cz|de|dk|fo|com\.ec|tm\.fr|com\.fr|asso\.fr|presse\.fr|fr|gf|gs|co\.il|net\.il|ac\.il|k12\.il|gov\.il|muni\.il|ac\.in|co\.in|org\.in|ernet\.in|gov\.in|net\.in|res\.in|is|it|ac\.jp|co\.jp|go\.jp|or\.jp|ne\.jp|ac\.kr|co\.kr|go\.kr|ne\.kr|nm\.kr|or\.kr|li|lt|lu|asso\.mc|tm\.mc|com\.mm|org\.mm|net\.mm|edu\.mm|gov\.mm|ms|nl|no|nu|pl|ro|org\.ro|store\.ro|tm\.ro|firm\.ro|www\.ro|arts\.ro|rec\.ro|info\.ro|nom\.ro|nt\.ro|se|si|com\.sg|org\.sg|net\.sg|gov\.sg|sk|st|tf|ac\.th|co\.th|go\.th|mi\.th|net\.th|or\.th|tm|to|com\.tr|edu\.tr|gov\.tr|k12\.tr|net\.tr|org\.tr|com\.tw|org\.tw|net\.tw|ac\.uk|uk\.com|uk\.net|gb\.com|gb\.net|vg|sh|kz|ch|info|ua|gov|name|pro|ie|hk|com\.hk|org\.hk|net\.hk|edu\.hk|us|tk|cd|by|ad|lv|eu\.lv|bz|es|jp|cl|ag|mobi|eu|co\.nz|org\.nz|net\.nz|maori\.nz|iwi\.nz|io|la|md|sc|sg|vc|tw|travel|my|se|tv|pt|com\.pt|edu\.pt|asia|fi|com\.ve|net\.ve|fi|org\.ve|web\.ve|info\.ve|co\.ve|tel|im|gr|ru|net\.ru|org\.ru|hr|com\.hr|ly|xyz)$/);
}
function t(e, t) {
var i = e.charAt(0);
t = t.split(i);
return i === e ? t : t[(e = parseInt(e.substring(1), 10)) < 0 ? t.length + e : e - 1];
}
function i(e, t) {
for (var i, r, n = e.charAt(0), a = t.split("&"), o = [], c = {}, f = e.substring(1), h = 0, u = a.length; h < u; h++) if ("" !== (o = (o = a[h].match(/(.*?)=(.*)/)) || [ a[h], a[h], "" ])[1].replace(/\s/g, "")) {
if (o[2] = (r = o[2] || "", s.decodeURIComponent(r.replace(/\+/g, " "))), f === o[1]) return o[2];
(i = o[1].match(/(.*)\[([0-9]+)\]/)) ? (c[i[1]] = c[i[1]] || [], c[i[1]][i[2]] = o[2]) : c[o[1]] = o[2];
}
return n === e ? c : c[f];
}
return function(r, n) {
var a = {};
if ("tld?" === r) return e();
if (n = n || window.location.toString(), !r) return n;
if (r = r.toString(), n.match(/^mailto:([^/].+)/)) s = n.match(/^mailto:([^/].+)/), 
a.protocol = "mailto", a.email = s[1]; else {
if (n.match(/(.*?)\/#!(.*)/) && (n = (s = n.match(/(.*?)\/#!(.*)/))[1] + s[2]), 
n.match(/(.*?)#(.*)/) && (s = n.match(/(.*?)#(.*)/), a.hash = s[2], n = s[1]), a.hash && r.match(/^#/)) return i(r, a.hash);
if (n.match(/(.*?)\?(.*)/) && (s = n.match(/(.*?)\?(.*)/), a.query = s[2], n = s[1]), 
a.query && r.match(/^\?/)) return i(r, a.query);
if (n.match(/(.*?):?\/\/(.*)/) && (s = n.match(/(.*?):?\/\/(.*)/), a.protocol = s[1].toLowerCase(), 
n = s[2]), n.match(/(.*?)(\/.*)/) && (s = n.match(/(.*?)(\/.*)/), a.path = s[2], 
n = s[1]), a.path = (a.path || "").replace(/^([^/])/, "/$1").replace(/\/$/, ""), 
r.match(/^[-0-9]+$/) && (r = r.replace(/^([^/])/, "/$1")), r.match(/^\//)) return t(r, a.path.substring(1));
if ((s = (s = t("/-1", a.path.substring(1))) && s.match(/(.*?)\.(.*)/)) && (a.file = s[0], 
a.filename = s[1], a.fileext = s[2]), n.match(/(.*):([0-9]+)$/) && (s = n.match(/(.*):([0-9]+)$/), 
a.port = s[2], n = s[1]), n.match(/(.*?)@(.*)/) && (s = n.match(/(.*?)@(.*)/), a.auth = s[1], 
n = s[2]), a.auth && (s = a.auth.match(/(.*):(.*)/), a.user = s ? s[1] : a.auth, 
a.pass = s ? s[2] : void 0), a.hostname = n.toLowerCase(), "." === r.charAt(0)) return t(r, a.hostname);
e() && (s = a.hostname.match(e())) && (a.tld = s[3], a.domain = s[2] ? s[2] + "." + s[3] : void 0, 
a.sub = s[1] || void 0);
var s = a.port ? ":" + a.port : "";
a.protocol = a.protocol || window.location.protocol.replace(":", ""), a.port = a.port || ("https" === a.protocol ? "443" : "80"), 
a.protocol = a.protocol || ("443" === a.port ? "https" : "http"), a.basic = a.protocol + "://" + a.hostname + s;
}
return r in a ? a[r] : "{}" === r ? a : "";
};
}(), s.createString = function(e) {
for (var t = e, i = Math.random().toString(36).substr(2); i.length < t; ) i += Math.random().toString(36).substr(2);
return i.substr(0, e);
}, s.createAesKey = function() {
return s.createString(16);
}, s.generateEncryptyData = function(e, t) {
if (void 0 === t) return e;
var i = t.publicKey, r = t.version;
if (void 0 === i || void 0 === r) return e;
if ("undefined" == typeof CryptoJS || "undefined" == typeof JSEncrypt) return e;
var n = s.createAesKey();
try {
var a = CryptoJS.enc.Utf8.parse(n), o = CryptoJS.enc.Utf8.parse(JSON.stringify(e)), c = s.isUndefined(CryptoJS.pad.Pkcs7) ? CryptoJS.pad.PKCS7 : CryptoJS.pad.Pkcs7;
a = CryptoJS.AES.encrypt(o, a, {
mode: CryptoJS.mode.ECB,
padding: c
}).toString();
(c = new JSEncrypt()).setPublicKey(i);
return !1 === (c = c.encrypt(n)) ? (g.warn("Encryption failed, return the original data"), 
e) : {
pkv: r,
ekey: c,
payload: a
};
} catch (e) {
g.warn("Encryption failed, return the original data: " + e);
}
return e;
}, s.getUtm = function() {
var e = {};
return s.each(b, function(t) {
try {
var i = s.getQueryParam(location.href, t);
i.length && (e[t] = i);
} catch (t) {
g.warn("get utm fail: " + t);
}
}), JSON.stringify(e);
}, s.getQueryParam = function(e, t) {
t = t.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]"), e = s.decodeURIComponent(e);
return null === (e = new RegExp("[\\?&]" + t + "=([^&#]*)").exec(e)) || e && "string" != typeof e[1] && e[1].length ? "" : s.decodeURIComponent(e[1]);
}, s.getUtmFromQuery = function(e) {
var t = {};
return s.each(b, function(i) {
e[i] && (t[i] = e[i]);
}), JSON.stringify(t);
}, s.indexOf = function(e, t) {
var i = e.indexOf;
if (i) return i.call(e, t);
for (var r = 0; r < e.length; r++) if (t === e[r]) return r;
return -1;
}, s.checkCalibration = function(e) {
return e;
};
var g = "object" === i(g) ? g : {};
g.info = function() {
if ("object" === ("undefined" == typeof console ? "undefined" : i(console)) && console.log && g.enabled) try {
return arguments[0] = "[ThinkingData] Info: " + arguments[0], console.log.apply(console, arguments);
} catch (e) {
console.log("[ThinkingData] Info: " + arguments[0]);
}
}, g.warn = function() {
if ("object" === ("undefined" == typeof console ? "undefined" : i(console)) && console.log && g.enabled) try {
return arguments[0] = "[ThinkingData] Warning: " + arguments[0], console.warn.apply(console, arguments);
} catch (e) {
console.warn("[ThinkingData] Warning: " + arguments[0]);
}
};
var m = function() {
function e() {
r(this, e), this.config = {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_mg"
};
}
return a(e, [ {
key: "getConfig",
value: function() {
return this.config;
}
}, {
key: "getStorage",
value: function(e, t, i) {
e = localStorage.getItem(e);
if (!t) return s.isJSONString(e) ? JSON.parse(e) : {};
s.isJSONString(e) ? i(JSON.parse(e)) : i({});
}
}, {
key: "setStorage",
value: function(e, t) {
localStorage.setItem(e, t);
}
}, {
key: "removeStorage",
value: function(e) {
localStorage.removeItem(e);
}
}, {
key: "_setSystemProxy",
value: function(e) {
this._sysCallback = e;
}
}, {
key: "getSystemInfo",
value: function(e) {
var t = {
mp_platform: "web",
system: this._getOs(),
screenWidth: window.screen.width,
screenHeight: window.screen.height,
systemLanguage: navigator.language
};
this._sysCallback && (t = s.extend(t, this._sysCallback(e))), e.success(t), e.complete();
}
}, {
key: "_getOs",
value: function() {
var e = navigator.userAgent;
return /Windows/i.test(e) ? /Phone/.test(e) || /WPDesktop/.test(e) ? "Windows Phone" : "Windows" : /(iPhone|iPad|iPod)/.test(e) ? "iOS" : /Android/.test(e) ? "Android" : /(BlackBerry|PlayBook|BB10)/i.test(e) ? "BlackBerry" : /Mac/i.test(e) ? "MacOS" : /Linux/.test(e) ? "Linux" : /CrOS/.test(e) ? "ChromeOS" : "";
}
}, {
key: "getNetworkType",
value: function(e) {
e.complete();
}
}, {
key: "onNetworkStatusChange",
value: function() {}
}, {
key: "request",
value: function(e) {
var t = {}, i = new XMLHttpRequest();
if (i.open(e.method, e.url), e.header) for (var r in e.header) i.setRequestHeader(r, e.header[r]);
return i.onreadystatechange = function() {
4 === i.readyState && 200 === i.status ? (t.statusCode = 200, s.isJSONString(i.responseText) && (t.data = JSON.parse(i.responseText)), 
e.success(t)) : 200 !== i.status && (t.errMsg = "network error", e.fail(t));
}, i.ontimeout = function() {
t.errMsg = "timeout", e.fail(t);
}, i.send(e.data), i;
}
}, {
key: "initAutoTrackInstance",
value: function(e, t) {
this.instance = e, this.autoTrack = t.autoTrack;
var i = this;
i.onPageShow(), i.autoTrack.appHide && i.instance.timeEvent("ta_page_hide"), "onvisibilitychange" in document && (document.onvisibilitychange = function() {
document.hidden ? i.onPageHide(!0) : (i.onPageShow(), i.autoTrack.appHide && i.instance.timeEvent("ta_page_hide"));
});
}
}, {
key: "setGlobal",
value: function(e, t) {
window[t] = e;
}
}, {
key: "getAppOptions",
value: function() {}
}, {
key: "showToast",
value: function() {}
}, {
key: "onPageShow",
value: function() {
var e;
this.autoTrack.appShow && (e = {}, s.extend(e, this.autoTrack.properties), s.isFunction(this.autoTrack.callback) && s.extend(e, this.autoTrack.callback("appShow")), 
this.instance._internalTrack("ta_page_show", e));
}
}, {
key: "onPageHide",
value: function(e) {
var t;
this.autoTrack.appHide && (t = {}, s.extend(t, this.autoTrack.properties), s.isFunction(this.autoTrack.callback) && s.extend(t, this.autoTrack.callback("appHide")), 
this.instance._internalTrack("ta_page_hide", t, new Date(), null, e));
}
} ], [ {
key: "createInstance",
value: function() {
return new e();
}
} ]), e;
}(), v = function() {
function e(t, i) {
r(this, e), this.taInstance = t, this.config = i || {}, this.referrer = "Directly open", 
this.config.isPlugin ? (t.App = function() {
App.apply(this, arguments);
}, inension(t.Page)) : (t = App, App = this._initAppExtention(t), t = Page, Page = this._initPageExtension(t));
}
return a(e, [ {
key: "_initPageExtension",
value: function(e) {
var t = this;
return function(i) {
var r = i.onShow, n = i.onShareAppMessage;
return i.onShow = function(e) {
t.onPageShow(), "function" == typeof r && r.call(this, e);
}, "function" == typeof n && (i.onShareAppMessage = function(e) {
e = n.call(this, e);
return t.onPageShare(e);
}), e(i);
};
}
}, {
key: "_initAppExtention",
value: function(e) {
var t = this;
return function(i) {
var r = i.onLaunch, n = i.onShow, a = i.onHide;
return i.onLaunch = function(e) {
t.onAppLaunch(e, this), "function" == typeof r && r.call(this, e);
}, i.onShow = function(e) {
t.onAppShow(e), "function" == typeof n && n.call(this, e);
}, i.onHide = function() {
t.onAppHide(), "function" == typeof a && a.call(this);
}, e(i);
};
}
}, {
key: "onAppLaunch",
value: function(e, t) {
this._setAutoTrackProperties(e), s.isUndefined(t) || (t[this.taInstance.name] = this.taInstance), 
this.config.appLaunch && (t = {}, e && e.path && (t["#url_path"] = this._getPath(e.path)), 
e && e.query && (t["#utm"] = s.getUtmFromQuery(e.query)), this.taInstance._internalTrack("ta_mp_launch", t));
}
}, {
key: "onAppShow",
value: function(e) {
var t;
this.config.appHide && this.taInstance.timeEvent("ta_mp_hide"), this._setAutoTrackProperties(e), 
this.config.appShow && (t = {}, e && e.path && (t["#url_path"] = this._getPath(e.path)), 
e && e.query && (t["#utm"] = s.getUtmFromQuery(e.query)), s.extend(t, this.config.properties), 
s.isFunction(this.config.callback) && s.extend(t, this.config.callback("appShow")), 
this.taInstance._internalTrack("ta_mp_show", t));
}
}, {
key: "onAppHide",
value: function() {
var e;
this.config.appHide && (e = {
"#url_path": this._getCurrentPath()
}, s.extend(e, this.config.properties), s.isFunction(this.config.callback) && s.extend(e, this.config.callback("appHide")), 
this.taInstance._internalTrack("ta_mp_hide", e));
}
}, {
key: "_getCurrentPath",
value: function() {
var e = "Not to get";
try {
var t = getCurrentPages();
e = t[t.length - 1].route;
} catch (e) {
g.info(e);
}
return e;
}
}, {
key: "_setAutoTrackProperties",
value: function(e) {
e = {
"#scene": e.scene
};
this.taInstance._setAutoTrackProperties(e);
}
}, {
key: "_getPath",
value: function(e) {
return "string" == typeof e ? e.replace(/^\//, "") : "Abnormal values";
}
}, {
key: "onPageShare",
value: function(e) {
return this.config.pageShare && this.taInstance._internalTrack("ta_mp_share", {
"#url_path": this._getCurrentPath()
}), s.isObject(e) ? e : {};
}
}, {
key: "onPageShow",
value: function() {
var e, t;
this.config.pageShow && (t = {
"#url_path": (e = this._getCurrentPath()) || "The system did not get a value",
"#referrer": this.referrer
}, this.referrer = e, this.taInstance._internalTrack("ta_mp_view", t));
}
} ]), e;
}(), y = function() {
function e(t, i, n) {
var a = this;
r(this, e), this.taInstance = t, this.config = i || {};
i = n.getLaunchOptionsSync();
this._onShow(i), this.startTracked = !0, n.onShow(function(e) {
a._onShow(e);
}), n.onHide(function() {
var e;
a.startTracked = !1, a.config.appHide && (e = {}, s.extend(e, a.config.properties), 
s.isFunction(a.config.callback) && s.extend(e, a.config.callback("appHide")), a.taInstance._internalTrack("ta_mg_hide", e));
});
}
return a(e, [ {
key: "_onShow",
value: function(e) {
this.startTracked || (this.config.appHide && this.taInstance.timeEvent("ta_mg_hide"), 
e && e.scene && this.taInstance._setAutoTrackProperties({
"#scene": e.scene
}), this.config.appShow && (e = {}, s.extend(e, this.config.properties), s.isFunction(this.config.callback) && s.extend(e, this.config.callback("appShow")), 
this.taInstance._internalTrack("ta_mg_show", e)));
}
} ]), e;
}(), _ = function() {
function e(t, i, n) {
r(this, e), this.api = t, this.config = i, this._config = n;
}
return a(e, [ {
key: "getConfig",
value: function() {
return this.config;
}
}, {
key: "getStorage",
value: function(e, t, i) {
if (!t) {
if ("dd_mp" === this._config.platform) {
var r = this.api.getStorageSync({
key: e
});
return s.isJSONString(r.data) ? JSON.parse(r.data) : {};
}
r = this.api.getStorageSync(e);
return s.isJSONString(r) ? JSON.parse(r) : {};
}
this.api.getStorage({
key: e,
success: function(e) {
e = s.isJSONString(e.data) ? JSON.parse(e.data) : {};
i(e);
},
fail: function() {
g.warn("getStorage faild"), i({});
}
});
}
}, {
key: "setStorage",
value: function(e, t) {
"ali_mp" === this._config.platform || "tb_mp" === this._config.platform || "dd_mp" === this._config.platform ? this.api.setStorageSync({
key: e,
data: t
}) : this.api.setStorageSync(e, t);
}
}, {
key: "removeStorage",
value: function(e) {
s.isFunction(this.api.removeStorage) ? this.api.removeStorage({
key: e
}) : s.isFunction(this.api.deleteStorage) && this.api.deleteStorage({
key: e
});
}
}, {
key: "_getPlatform",
value: function() {
return "";
}
}, {
key: "getSystemInfo",
value: function(e) {
var t = this._config.mpPlatform;
this.api.getSystemInfo({
success: function(i) {
s.isFunction(t) ? i.mp_platform = t(i) : i.mp_platform = t, e.success(i), "wechat" === t && e.complete();
},
complete: function() {
e.complete();
}
});
}
}, {
key: "getNetworkType",
value: function(e) {
s.isFunction(this.api.getNetworkType) ? this.api.getNetworkType({
success: function(t) {
e.success(t);
},
complete: function() {
e.complete();
}
}) : (e.success({}), e.complete());
}
}, {
key: "onNetworkStatusChange",
value: function(e) {
s.isFunction(this.api.onNetworkStatusChange) ? this.api.onNetworkStatusChange(e) : e({});
}
}, {
key: "request",
value: function(e) {
if ("ali_mp" !== this._config.platform && "dd_mp" !== this._config.platform) return this.api.request(e);
var t = s.extend({}, e);
return t.headers = e.header, t.success = function(t) {
t.statusCode = t.status, e.success(t);
}, t.fail = function(t) {
t.errMsg = t.errorMessage, e.fail(t);
}, "dd_mp" === this._config.platform ? this.api.httpRequest(t) : this.api.request(t);
}
}, {
key: "initAutoTrackInstance",
value: function(e, t) {
return s.isObject(t.autoTrack) && (t.autoTrack.isPlugin = t.is_plugin), new (this._config.mp ? v : y)(e, t.autoTrack, this.api);
}
}, {
key: "setGlobal",
value: function(e, t) {
this._config.mp ? g.warn("ThinkingAnalytics: we do not set global name for TA instance when you do not enable auto track.") : GameGlobal[t] = e;
}
}, {
key: "getAppOptions",
value: function(e) {
var t = {};
try {
t = this.api.getLaunchOptionsSync();
} catch (e) {
g.warn("Cannot get launch options.");
}
if (s.isFunction(e)) try {
this._config.mp ? this.api.onAppShow(e) : this.api.onShow(e);
} catch (e) {
g.warn("Cannot register onShow callback.");
}
return t;
}
}, {
key: "showToast",
value: function(e) {
var t;
s.isFunction(this.api.showToast) && (t = {
title: e
}, "dd_mp" !== this._config.platform && "ali_mp" !== this._config.platform || (t.content = e), 
this.api.showToast(t));
}
} ], [ {
key: "createInstance",
value: function() {
return this._createInstance("R_CURRENT_PLATFORM");
}
}, {
key: "_createInstance",
value: function(t) {
switch (t) {
case "wechat_mp":
return new e(wx, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_wechat"
}, {
mpPlatform: "wechat",
mp: !0,
platform: t
});

case "wechat_mg":
return new e(wx, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_wechat_game"
}, {
mpPlatform: "wechat",
platform: t
});

case "qq_mp":
return new e(qq, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qq"
}, {
mpPlatform: "qq",
mp: !0,
platform: t
});

case "qq_mg":
return new e(qq, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qq_game"
}, {
mpPlatform: "qq",
platform: t
});

case "baidu_mp":
return new e(swan, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_swan"
}, {
mpPlatform: function(e) {
return e.host;
},
mp: !0,
platform: t
});

case "baidu_mg":
return new e(swan, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_swan_game"
}, {
mpPlatform: function(e) {
return e.host;
},
platform: t
});

case "tt_mg":
return new e(tt, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_tt_game"
}, {
mpPlatform: function(e) {
return e.appName;
},
platform: t
});

case "tt_mp":
return new e(tt, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_tt"
}, {
mpPlatform: function(e) {
return e.appName;
},
mp: !0,
platform: t
});

case "ali_mp":
return new e(my, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_ali"
}, {
mpPlatform: function(e) {
return e.app;
},
mp: !0,
platform: t
});

case "dd_mp":
return new e(dd, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_dd"
}, {
mpPlatform: "dingding",
mp: !0,
platform: t
});

case "bl_mg":
return new e(bl, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_mg"
}, {
mpPlatform: "bilibili",
platform: t
});

case "kuaishou_mp":
return new e(ks, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_kuaishou"
}, {
mpPlatform: "kuaishou",
mp: !0,
platform: t
});

case "qh360_mg":
return new e(qh, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qh360"
}, {
mpPlatform: "qh360",
platform: t
});

case "tb_mp":
return new e(my, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_tb"
}, {
mpPlatform: "tb",
mp: !0,
platform: t
});

case "jd_mp":
return new e(jd, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_jd"
}, {
mpPlatform: "jd",
mp: !0,
platform: t
});

case "qh360_mp":
return new e(qh, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qh360"
}, {
mpPlatform: "qh360",
mp: !0,
platform: t
});

case "WEB":
return new m.createInstance();
}
}
} ]), e;
}(), w = function e(t, i) {
var n = this;
r(this, e), this.taInstance = t, this.config = i || {}, this.config.appShow && this.taInstance._internalTrack("ta_mg_show"), 
this.config.appHide && this.taInstance.timeEvent("ta_mg_hide"), qg.onShow(function() {
var e;
n.config.appHide && n.taInstance.timeEvent("ta_mg_hide"), n.config.appShow && (e = {}, 
s.extend(e, n.config.properties), s.isFunction(n.config.callback) && s.extend(e, n.config.callback("appShow")), 
n.taInstance._internalTrack("ta_mg_show"));
}), qg.onHide(function() {
var e;
n.config.appHide && (e = {}, s.extend(e, n.config.properties), s.isFunction(n.config.callback) && s.extend(e, n.config.callback("appHide")), 
n.taInstance._internalTrack("ta_mg_hide"));
});
}, S = function() {
function e() {
r(this, e), this.config = {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qg_vivo_game",
asyncPersistence: !0
};
}
return a(e, [ {
key: "getConfig",
value: function() {
return this.config || {};
}
}, {
key: "getStorage",
value: function(e, t, i) {
if (!t) {
t = qg.getStorageSync({
key: e
});
return s.isJSONString(t) ? JSON.parse(t) : {};
}
qg.getStorage({
key: e,
success: function(e) {
e = s.isJSONString(e) ? JSON.parse(e) : {};
i(e);
},
fail: function() {
i({});
}
});
}
}, {
key: "setStorage",
value: function(e, t) {
qg.setStorage({
key: e,
value: t
});
}
}, {
key: "removeStorage",
value: function(e) {
qg.deleteStorage({
key: e
});
}
}, {
key: "getSystemInfo",
value: function(e) {
qg.getSystemInfo({
success: function(t) {
var i = t, r = [ t.osType, t.osVersionName ].join(" ");
i.brand = t.manufacturer, i.system = r, i.mp_platform = "vivo_qg", e.success(i);
},
complete: function() {
e.complete();
}
});
}
}, {
key: "getNetworkType",
value: function(e) {
qg.getNetworkType({
success: function(t) {
var i = t;
i.networkType = t.type, e.success(i);
},
complete: function() {
e.complete();
}
});
}
}, {
key: "onNetworkStatusChange",
value: function(e) {
qg.subscribeNetworkStatus({
callback: function(t) {
var i = t;
i.networkType = t.type, e(i);
}
});
}
}, {
key: "request",
value: function(e) {
return qg.request({
url: e.url,
data: e.data,
method: e.method,
header: e.header,
success: function(t) {
e.success(t);
},
fail: function(t) {
e.fail(t);
}
});
}
}, {
key: "initAutoTrackInstance",
value: function(e, t) {
return new w(e, t.autoTrack);
}
}, {
key: "setGlobal",
value: function(e, t) {
globalThis[t] = e;
}
}, {
key: "getAppOptions",
value: function() {
return {};
}
}, {
key: "showToast",
value: function(e) {
qg.showToast({
message: e,
duration: 0
});
}
} ], [ {
key: "createInstance",
value: function() {
return new e();
}
} ]), e;
}(), k = function e(t, i, n) {
var a = this;
r(this, e), this.taInstance = t, this.config = i || {}, this.config.appShow && (i = {}, 
s.extend(i, this.config.properties), s.isFunction(this.config.callback) && s.extend(i, this.config.callback("appShow")), 
this.taInstance._internalTrack("ta_mg_show", i)), this.config.appHide && this.taInstance.timeEvent("ta_mg_hide"), 
n.onShow(function() {
var e;
a.config.appHide && a.taInstance.timeEvent("ta_mg_hide"), a.config.appShow && (e = {}, 
s.extend(e, a.config.properties), s.isFunction(a.config.callback) && s.extend(e, a.config.callback("appShow")), 
a.taInstance._internalTrack("ta_mg_show", e));
}), n.onHide(function() {
var e;
a.config.appHide && (e = {}, s.extend(e, a.config.properties), s.isFunction(a.config.callback) && s.extend(e, a.config.callback("appHide")), 
a.taInstance._internalTrack("ta_mg_hide", e));
});
}, M = function() {
function e(t, i, n) {
r(this, e), this.api = t, this.config = i, this._config = n;
}
return a(e, [ {
key: "getConfig",
value: function() {
return this.config || {};
}
}, {
key: "getStorage",
value: function(e, t, i) {
e = localStorage.getItem(e);
if (!t) return s.isJSONString(e) ? JSON.parse(e) : {};
s.isJSONString(e) ? i(JSON.parse(e)) : i({});
}
}, {
key: "setStorage",
value: function(e, t) {
localStorage.setItem(e, t);
}
}, {
key: "removeStorage",
value: function(e) {
localStorage.removeItem(e);
}
}, {
key: "getSystemInfo",
value: function(e) {
var t = this._config.mpPlatform;
this.api.getSystemInfo({
success: function(i) {
i.mp_platform = t, e.success(i);
},
complete: function() {
e.complete();
}
});
}
}, {
key: "getNetworkType",
value: function(e) {
this.api.getNetworkType({
success: function(t) {
e.success(t);
},
complete: function() {
e.complete();
}
});
}
}, {
key: "onNetworkStatusChange",
value: function(e) {
this.api.onNetworkStatusChange({
callback: function(t) {
e(t);
}
});
}
}, {
key: "request",
value: function(e) {
var t = {}, i = new XMLHttpRequest();
if (i.open(e.method, e.url), e.header) for (var r in e.header) i.setRequestHeader(r, e.header[r]);
return i.onreadystatechange = function() {
4 === i.readyState && 200 === i.status ? (t.statusCode = 200, s.isJSONString(i.responseText) && (t.data = JSON.parse(i.responseText)), 
e.success(t)) : 200 !== i.status && (t.errMsg = "network error", e.fail(t));
}, i.ontimeout = function() {
t.errMsg = "timeout", e.fail(t);
}, i.send(e.data), i;
}
}, {
key: "initAutoTrackInstance",
value: function(e, t) {
return new k(e, t.autoTrack, this.api);
}
}, {
key: "setGlobal",
value: function(e, t) {
globalThis[t] = e;
}
}, {
key: "getAppOptions",
value: function() {
return this.api.getLaunchOptionsSync();
}
}, {
key: "showToast",
value: function(e) {
this.api.showToast({
title: e,
icon: "none",
duration: 2e3
});
}
} ], [ {
key: "createInstance",
value: function() {
return this._createInstance("R_CURRENT_PLATFORM");
}
}, {
key: "_createInstance",
value: function(t) {
switch (t) {
case "oppo":
return new e(qg, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qg_oppo_game"
}, {
mpPlatform: "oppo_qg"
});

case "huawei":
return new e(hbs, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qg_huawei_game"
}, {
mpPlatform: "huawei_qg"
});

case "mz":
return new e(qg, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qg_mz_game"
}, {
mpPlatform: "mz"
});

case "xiaomi":
return new e(qg, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qg"
}, {
mpPlatform: "xiaomi"
});
}
}
} ]), e;
}(), A = function() {
function e() {
r(this, e);
}
return a(e, null, [ {
key: "createInstance",
value: function() {
var e = Object.freeze({
WECHAT_GAME: 104,
QQ_PLAY: 105,
BAIDU_GAME: 107,
VIVO_GAME: 108,
OPPO_GAME: 109,
HUAWEI_GAME: 110,
XIAOMI_GAME: 111,
BYTEDANCE_GAME: 117,
QTT_GAME: 116,
LINKSURE: 119,
WECHAT_MINI_GAME: "WECHAT_GAME",
BAIDU_MINI_GAME: "BAIDU_MINI_GAME",
XIAOMI_QUICK_GAME: "XIAOMI_QUICK_GAME",
OPPO_MINI_GAME: "OPPO_MINI_GAME",
VIVO_MINI_GAME: "VIVO_MINI_GAME",
HUAWEI_QUICK_GAME: "HUAWEI_QUICK_GAME",
BYTEDANCE_MINI_GAME: "BYTEDANCE_MINI_GAME",
QTT_MINI_GAME: "QTT_MINI_GAME",
LINKSURE_MINI_GAME: "LINKSURE_MINI_GAME"
});
if (cc.sys.platform === e.WECHAT_GAME || cc.sys.platform === e.WECHAT_MINI_GAME) return _._createInstance("wechat_mg");
if (cc.sys.platform === e.BAIDU_GAME || cc.sys.platform === e.BAIDU_MIN_GAME) return _._createInstance("baidu_mg");
if (cc.sys.platform === e.VIVO_GAME || cc.sys.platform === e.VIVO_MINI_GAME) return S.createInstance();
if (cc.sys.platform === e.QQ_PLAY) return _._createInstance("qq_mg");
if (cc.sys.platform === e.OPPO_GAME || cc.sys.platform === e.OPPO_MINI_GAME) return M._createInstance("oppo");
if (cc.sys.platform === e.HUAWEI_GAME || cc.sys.platform === e.HUAWEI_QUICK_GAME) return M._createInstance("huawei");
if (cc.sys.platform === e.XIAOMI_GAME || cc.sys.platform === e.XIAOMI_QUICK_GAME) return M._createInstance("xiaomi");
if (cc.sys.platform === e.BYTEDANCE_GAME || cc.sys.platform === e.BYTEDANCE_MINI_GAME) return _._createInstance("tt_mg");
var t = m.createInstance();
return t._sysCallback = function() {
return {
system: cc.sys.os.replace(" ", "") + " " + cc.sys.osVersion
};
}, t.getNetworkType = function(e) {
var t = {};
switch (cc.sys.getNetworkType()) {
case cc.sys.NetworkType.LAN:
t.networkType = "WIFI";
break;

case cc.sys.NetworkType.WWAN:
t.networkType = "WWAN";
break;

default:
t.networkType = "NONE";
}
e.success(t), e.complete();
}, t.getSystemInfo = function(e) {
var i = {
mp_platform: cc.sys.platform.toString(),
system: t._getOs(),
screenWidth: window.screen.width,
screenHeight: window.screen.height
};
t._sysCallback && (i = s.extend(i, t._sysCallback(e))), e.success(i), e.complete();
}, t;
}
} ]), e;
}(), I = function() {
function e() {
r(this, e);
}
return a(e, null, [ {
key: "_getCurrentPlatform",
value: function() {
return this.currentPlatform || (this.currentPlatform = A.createInstance());
}
}, {
key: "getConfig",
value: function() {
return this._getCurrentPlatform().getConfig();
}
}, {
key: "getStorage",
value: function(e, t, i) {
return this._getCurrentPlatform().getStorage(e, t, i);
}
}, {
key: "setStorage",
value: function(e, t) {
return this._getCurrentPlatform().setStorage(e, t);
}
}, {
key: "removeStorage",
value: function(e) {
return this._getCurrentPlatform().removeStorage(e);
}
}, {
key: "getSystemInfo",
value: function(e) {
return this._getCurrentPlatform().getSystemInfo(e);
}
}, {
key: "getNetworkType",
value: function(e) {
return this._getCurrentPlatform().getNetworkType(e);
}
}, {
key: "onNetworkStatusChange",
value: function(e) {
this._getCurrentPlatform().onNetworkStatusChange(e);
}
}, {
key: "request",
value: function(e) {
return this._getCurrentPlatform().request(e);
}
}, {
key: "initAutoTrackInstance",
value: function(e, t) {
return this._getCurrentPlatform().initAutoTrackInstance(e, t);
}
}, {
key: "setGlobal",
value: function(e, t) {
e && t && this._getCurrentPlatform().setGlobal(e, t);
}
}, {
key: "getAppOptions",
value: function(e) {
return this._getCurrentPlatform().getAppOptions(e);
}
}, {
key: "showDebugToast",
value: function(e) {
this._getCurrentPlatform().showToast(e);
}
} ]), e;
}(), E = /^[a-zA-Z][a-zA-Z0-9_]{0,49}$/, P = function() {
function e() {
r(this, e);
}
return a(e, null, [ {
key: "stripProperties",
value: function(e) {
return s.isObject(e) && s.each(e, function(e, t) {
s.isString(e) || s.isNumber(e) || s.isDate(e) || s.isBoolean(e) || s.isArray(e) || s.isObject(e) || g.warn("Your data -", t, e, "- format does not meet requirements and may not be stored correctly. Attribute values only support String, Number, Date, Boolean, Array, Object");
}), e;
}
}, {
key: "_checkPropertiesKey",
value: function(e) {
var t = !0;
return s.each(e, function(e, i) {
E.test(i) || (g.warn("Invalid KEY: " + i), t = !1);
}), t;
}
}, {
key: "event",
value: function(e) {
return !(!s.isString(e) || !E.test(e)) || (g.warn("Check the parameter format. The eventName must start with an English letter and contain no more than 50 characters including letters, digits, and underscores: " + e), 
!1);
}
}, {
key: "propertyName",
value: function(e) {
return !(!s.isString(e) || !E.test(e)) || (g.warn("Check the parameter format. PropertyName must start with a letter and contain letters, digits, and underscores (_). The value is a string of no more than 50 characters: " + e), 
!1);
}
}, {
key: "properties",
value: function(e) {
return this.stripProperties(e), !(e && (s.isObject(e) ? !this._checkPropertiesKey(e) && (g.warn("Check the parameter format. The properties key must start with a letter, contain digits, letters, and underscores (_), and contain a maximum of 50 characters"), 
1) : (g.warn("properties can be none, but it must be an object"), 1)));
}
}, {
key: "propertiesMust",
value: function(e) {
return this.stripProperties(e), void 0 === e || !s.isObject(e) || s.isEmptyObject(e) ? (g.warn("properties must be an object with a value"), 
!1) : !!this._checkPropertiesKey(e) || (g.warn("Check the parameter format. The properties key must start with a letter, contain digits, letters, and underscores (_), and contain a maximum of 50 characters"), 
!1);
}
}, {
key: "userId",
value: function(e) {
return !(!s.isString(e) || !/^.{1,64}$/.test(e)) || (g.warn("The user ID must be a string of less than 64 characters and cannot be null"), 
!1);
}
}, {
key: "userAddProperties",
value: function(e) {
if (!this.propertiesMust(e)) return !1;
for (var t in e) if (!s.isNumber(e[t])) return g.warn("The attributes of userAdd need to be Number"), 
!1;
return !0;
}
}, {
key: "userAppendProperties",
value: function(e) {
if (!this.propertiesMust(e)) return !1;
for (var t in e) if (!s.isArray(e[t])) return g.warn("The attribute of userAppend must be Array"), 
!1;
return !0;
}
} ]), e;
}(), C = function() {
function e(t, i, n, a, o) {
r(this, e), this.data = t, this.serverUrl = i, this.callback = o, this.tryCount = s.isNumber(n) ? n : 1, 
this.timeout = s.isNumber(a) ? a : 3e3, this.taClassName = "HttpTask";
}
return a(e, [ {
key: "run",
value: function() {
var e = this, t = s.createExtraHeaders();
t["content-type"] = "application/json";
var i = I.request({
url: this.serverUrl,
method: "POST",
data: this.data,
header: t,
success: function(t) {
e.onSuccess(t), clearTimeout(r);
},
fail: function(t) {
e.onFailed(t), clearTimeout(r);
}
}), r = setTimeout(function() {
(s.isObject(i) || s.isPromise(i)) && s.isFunction(i.abort) && i.abort();
}, this.timeout);
}
}, {
key: "onSuccess",
value: function(e) {
if (200 === e.statusCode) {
var t;
switch (e.data.code) {
case 0:
t = "success";
break;

case -1:
t = "invalid data";
break;

case -2:
t = "invalid APP ID";
break;

default:
t = "Unknown return code";
}
this.callback({
code: e.data.code,
msg: t
});
} else this.callback({
code: -3,
msg: e.statusCode
});
}
}, {
key: "onFailed",
value: function(e) {
0 < --this.tryCount ? this.run() : this.callback({
code: -3,
msg: e.errMsg
});
}
} ]), e;
}(), x = function() {
function e(t, i, n, a, o, c, f) {
r(this, e), this.data = t, this.serverDebugUrl = i, this.callback = f, this.tryCount = s.isNumber(n) ? n : 1, 
this.timeout = s.isNumber(a) ? a : 3e3, this.dryrun = o, this.deviceId = c, this.taClassName = "HttpTaskDebug";
}
return a(e, [ {
key: "run",
value: function() {
var e = this, t = "appid=" + this.data["#app_id"] + "&source=client&dryRun=" + this.dryrun + "&deviceId=" + this.deviceId + "&data=" + encodeURIComponent(JSON.stringify(this.data.data[0])), i = s.createExtraHeaders();
i["content-type"] = "application/x-www-form-urlencoded";
var r = I.request({
url: this.serverDebugUrl,
method: "POST",
data: t,
header: i,
success: function(t) {
e.onSuccess(t), clearTimeout(n);
},
fail: function(t) {
e.onFailed(t), clearTimeout(n);
}
}), n = setTimeout(function() {
(s.isObject(r) || s.isPromise(r)) && s.isFunction(r.abort) && r.abort();
}, this.timeout);
}
}, {
key: "onSuccess",
value: function(e) {
if (200 === e.statusCode) {
var t;
if (0 === e.data.errorLevel) t = "Verify data success."; else if (1 === e.data.errorLevel) {
for (var i = e.data.errorProperties, r = "", n = 0; n < i.length; n++) {
var a = i[n].errorReason;
r = r + " propertyName:" + i[n].propertyName + " errorReasons:" + a + "\n";
}
t = "Debug data error. errorLevel:" + e.data.errorLevel + " reason:" + r;
} else 2 !== e.data.errorLevel && -1 !== e.data.errorLevel || (t = "Debug data error. errorLevel:" + e.data.errorLevel + " reason:" + e.data.errorReasons);
g.info(t), this.callback({
code: e.data.errorLevel,
msg: t
});
} else this.callback({
code: -3,
msg: e.statusCode
});
}
}, {
key: "onFailed",
value: function(e) {
0 < --this.tryCount ? this.run() : this.callback({
code: -3,
msg: e.errMsg
});
}
} ]), e;
}(), O = new (function() {
function e() {
r(this, e), this.items = [], this.isRunning = !1, this.showDebug = !1;
}
return a(e, [ {
key: "enqueue",
value: function(e, t, i, r) {
r = !(3 < arguments.length && void 0 !== r) || r;
var n = this;
t = "debug" === i.debugMode ? new x(e, t, i.maxRetries, i.sendTimeout, 0, i.deviceId, function(e) {
n.isRunning = !1, s.isFunction(i.callback) && i.callback(e), n._runNext(), !1 === n.showDebug && (0 !== e.code && 1 !== e.code && 2 !== e.code || (n.showDebug = !0, 
s.isFunction(I.showDebugToast) && I.showDebugToast("The current mode is Debug")));
}) : "debugOnly" === i.debugMode ? new x(e, t, i.maxRetries, i.sendTimeout, 1, i.deviceId, function(e) {
n.isRunning = !1, s.isFunction(i.callback) && i.callback(e), n._runNext(), !1 === n.showDebug && (0 !== e.code && 1 !== e.code && 2 !== e.code || (n.showDebug = !0, 
s.isFunction(I.showDebugToast) && I.showDebugToast("The current mode is debugOnly")));
}) : new C(JSON.stringify(e), t, i.maxRetries, i.sendTimeout, function(e) {
n.isRunning = !1, s.isFunction(i.callback) && i.callback(e), n._runNext();
});
!0 === r ? (this.items.push(t), this._runNext()) : t.run();
}
}, {
key: "_dequeue",
value: function() {
return this.items.shift();
}
}, {
key: "_runNext",
value: function() {
if (0 < this.items.length && !this.isRunning) if (this.isRunning = !0, "HttpTask" !== this.items[0].taClassName) this._dequeue().run(); else {
var e = this.items.splice(0, this.items.length), t = e[0], i = JSON.parse(t.data), r = i["#app_id"], n = [];
n.push(t.callback);
for (var a = 1; a < e.length; a++) {
var s = e[a], o = JSON.parse(s.data);
o["#app_id"] === r && t.serverUrl === s.serverUrl ? (i.data = i.data.concat(o.data), 
n.push(s.callback)) : this.items.push(s);
}
var c = new Date().getTime();
i["#flush_time"] = c, new C(JSON.stringify(i), t.serverUrl, t.tryCount, t.timeout, function(e) {
for (var t in n) Object.hasOwnProperty.call(n, t) && (0, n[t])(e);
}).run();
}
}
} ]), e;
}())(), N = {
name: "thinkingdata",
is_plugin: !1,
maxRetries: 3,
sendTimeout: 3e3,
enablePersistence: !0,
asyncPersistence: !1,
enableLog: !0,
strict: !1,
debugMode: "none",
enableCalibrationTime: !1
}, T = {
properties: {
"#lib": "MG",
"#lib_version": "3.0.1"
},
initDeviceId: function(e) {
s.isString(e) && (this.properties["#device_id"] = e);
},
getSystemInfo: function(e) {
var t = this;
I.onNetworkStatusChange(function(e) {
t.properties["#network_type"] = e.networkType;
}), I.getNetworkType({
success: function(e) {
t.properties["#network_type"] = e.networkType;
},
complete: function() {
I.getSystemInfo({
success: function(e) {
var i = e.system ? e.system.replace(/\s+/g, " ").split(" ") : [];
i = {
"#manufacturer": e.brand,
"#device_model": e.model,
"#screen_width": Number(e.screenWidth),
"#screen_height": Number(e.screenHeight),
"#os": i[0],
"#os_version": i[1],
"#mp_platform": e.mp_platform,
"#system_language": e.systemLanguage
};
s.extend(t.properties, i), s.setMpPlatform(e.mp_platform);
},
complete: function() {
e();
}
});
}
});
}
}, j = function() {
function e(t, i) {
var n = this;
r(this, e), this.enabled = t.enablePersistence, this.enabled ? (t.isChildInstance ? (this.name = t.persistenceName + "_" + t.name, 
this.nameOld = t.persistenceNameOld + "_" + t.name) : (this.name = t.persistenceName, 
this.nameOld = t.persistenceNameOld), t.asyncPersistence ? (this._state = {}, I.getStorage(this.name, !0, function(e) {
s.isEmptyObject(e) ? I.getStorage(n.nameOld, !0, function(e) {
n._state = s.extend2Layers({}, e, n._state), n._init(t, i), n._save();
}) : (n._state = s.extend2Layers({}, e, n._state), n._init(t, i), n._save());
})) : (this._state = I.getStorage(this.name) || {}, s.isEmptyObject(this._state) && (this._state = I.getStorage(this.nameOld) || {}), 
this._init(t, i))) : (this._state = {}, this._init(t, i));
}
return a(e, [ {
key: "_init",
value: function(e, t) {
this.getDistinctId() || this.setDistinctId(s.UUID()), e.isChildInstance || (this.getDeviceId() || this._setDeviceId(s.UUID()), 
T.initDeviceId(this.getDeviceId())), this.initComplete = !0, "function" == typeof t && t(), 
this._save();
}
}, {
key: "_save",
value: function() {
this.enabled && this.initComplete && I.setStorage(this.name, JSON.stringify(this._state));
}
}, {
key: "_set",
value: function(e, t) {
var r, n = this;
"string" == typeof e ? (r = {})[e] = t : "object" === i(e) && (r = e), s.each(r, function(e, t) {
n._state[t] = e;
}), this._save();
}
}, {
key: "_get",
value: function(e) {
return this._state[e];
}
}, {
key: "setEventTimer",
value: function(e, t) {
var i = this._state.event_timers || {};
i[e] = t, this._set("event_timers", i);
}
}, {
key: "removeEventTimer",
value: function(e) {
var t = (this._state.event_timers || {})[e];
return s.isUndefined(t) || (delete this._state.event_timers[e], this._save()), t;
}
}, {
key: "getDeviceId",
value: function() {
return this._state.device_id;
}
}, {
key: "_setDeviceId",
value: function(e) {
this.getDeviceId() ? g.warn("cannot modify the device id.") : this._set("device_id", e);
}
}, {
key: "getDistinctId",
value: function() {
return this._state.distinct_id;
}
}, {
key: "setDistinctId",
value: function(e) {
this._set("distinct_id", e);
}
}, {
key: "getAccountId",
value: function() {
return this._state.account_id;
}
}, {
key: "setAccountId",
value: function(e) {
this._set("account_id", e);
}
}, {
key: "getSuperProperties",
value: function() {
return this._state.props || {};
}
}, {
key: "setSuperProperties",
value: function(e, t) {
e = t ? e : s.extend(this.getSuperProperties(), e);
this._set("props", e);
}
} ]), e;
}(), D = "tab_tampsdk_", R = function() {
function e(t, i) {
r(this, e), this.config = t, this.ta = i, this.timer = null, this.batchConfig = s.extend({
size: 5,
interval: 5e3,
storageLimit: 200
}, this.config.batchConfig), this.batchConfig.size < 1 && (this.batchConfig.size = 1), 
30 < this.batchConfig.size && (this.batchConfig.size = 30), this.tabKey = D + this.config.appId, 
this.storageLimit = this.batchConfig.storageLimit, this.isRequest = !1, this.trackList = [], 
this.needFlush = !1;
}
return a(e, [ {
key: "batchInterval",
value: function() {
var e = this;
e.timer = setTimeout(function() {
e.recycle(), e.send(), clearTimeout(e.timer), e.batchInterval();
}, this.batchConfig.interval);
}
}, {
key: "add",
value: function(e) {
if (this.isRequest) this.trackList.push(e); else {
var t = e, i = "tampsdk_" + this.config.appId + "_" + String(s.UUID());
e = I.getStorage(this.tabKey);
if (s.isArray(e) || (e = []), e.length <= this.storageLimit) e.push(i), I.setStorage(this.tabKey, JSON.stringify(e)), 
I.setStorage(i, JSON.stringify(t)); else {
var r = e.splice(0, 20);
console.log("deleted events data:" + r), e.push(i), I.setStorage(this.tabKey, JSON.stringify(e)), 
I.setStorage(i, JSON.stringify(t));
t = {};
for (var n = [], a = 0; a < r.length; a++) {
var o = I.getStorage(r[a]);
n.push(o);
}
t.data = n, t["#app_id"] = this.config.appId, this.request(t, r);
}
}
}
}, {
key: "flush",
value: function() {
clearTimeout(this.timer), this.send(), this.batchInterval();
}
}, {
key: "send",
value: function() {
if (this.isRequest) this.needFlush = !0; else {
var e = I.getStorage(this.tabKey);
if (e && e.length) {
for (var t = {}, i = [], r = [], n = e.length < this.batchConfig.size ? e.length : this.batchConfig.size, a = 0; a < n; a++) {
var s = I.getStorage(e[a]);
i.push(s), r.push(e[a]);
}
t.data = i, t["#app_id"] = this.config.appId, this.request(t, r);
}
}
}
}, {
key: "request",
value: function(e, t) {
var i = this;
g.info("Flush data: " + JSON.stringify(e)), i.isRequest = !0, O.enqueue(e, this.ta.serverUrl, {
maxRetries: this.config.maxRetries,
sendTimeout: this.config.sendTimeout,
callback: function(e) {
0 === e.code && i.remove(t), i.isRequest = !1;
for (var r = 0; r < i.trackList.length; r++) i.add(i.trackList[r]);
i.trackList = [], i.needFlush && (i.needFlush = !1, i.flush());
},
debugMode: this.config.debugMode,
deviceId: this.ta.getDeviceId()
});
}
}, {
key: "remove",
value: function(e) {
var t = I.getStorage(this.tabKey);
if (t) {
for (var i = 0; i < e.length; i++) {
var r = s.indexOf(t, e[i]);
-1 < r && t.splice(r, 1), I.removeStorage(e[i]);
}
I.setStorage(this.tabKey, JSON.stringify(t));
}
}
}, {
key: "recycle",
value: function() {}
} ]), e;
}(), B = function() {
function e(t) {
r(this, e), t.appId = t.appId ? s.checkAppId(t.appId) : s.checkAppId(t.appid), t.serverUrl = t.serverUrl ? s.checkUrl(t.serverUrl) : s.checkUrl(t.server_url);
var i = s.extend({}, N, I.getConfig());
s.isObject(t) ? this.config = s.extend(i, t) : this.config = i, this._init(this.config);
}
return a(e, [ {
key: "_init",
value: function(e) {
var t = this;
this.name = e.name, this.appId = e.appId || e.appid;
var i = e.serverUrl || e.server_url;
this.serverUrl = i + "/sync_xcx", this.serverDebugUrl = i + "/data_debug", this.configUrl = i + "/config", 
this.autoTrackProperties = {}, this._queue = [], this.updateConfig(this.configUrl, this.appId), 
e.isChildInstance ? this._state = {} : (g.enabled = e.enableLog, this.instances = [], 
this._state = {
getSystemInfo: !1,
initComplete: !1
}, I.setGlobal(this, this.name)), this.store = new j(e, function() {
t.config.asyncPersistence && s.isFunction(t.config.persistenceComplete) && t.config.persistenceComplete(t), 
t._updateState();
}), this.enabled = !s.isBoolean(this.store._get("ta_enabled")) || this.store._get("ta_enabled"), 
this.isOptOut = !!s.isBoolean(this.store._get("ta_isOptOut")) && this.store._get("ta_isOptOut"), 
!e.isChildInstance && e.autoTrack && (this.autoTrack = I.initAutoTrackInstance(this, e)), 
void 0 !== this.config.enableBatch && !1 !== this.config.enableBatch && (this.batchConsumer = new R(this.config, this), 
this.batchConsumer.batchInterval());
}
}, {
key: "initSystemInfo",
value: function() {
var e = this;
this.config.isChildInstance || T.getSystemInfo(function() {
e._updateState({
getSystemInfo: !0
});
});
}
}, {
key: "updateConfig",
value: function(e, t) {
var i = this, r = s.createExtraHeaders();
r["content-type"] = "application/json";
var n = I.request({
url: e + "?appid=" + t,
method: "GET",
header: r,
success: function(e) {
s.isUndefined(e) || s.isUndefined(e.data) || (g.info("Get remote config success(" + t + ") :" + JSON.stringify(e.data)), 
s.isUndefined(e.data.data) || (i.config.syncBatchSize = e.data.data.sync_batch_size, 
i.config.syncInterval = e.data.data.sync_interval, i.config.disableEventList = e.data.data.disable_event_list, 
s.isUndefined(e.data.data.secret_key) || (e = e.data.data.secret_key, i.config.secretKey = {
publicKey: e.key,
version: e.version
})));
},
fail: function(e) {
g.info("Get remote config fail(" + t + ") :" + e.errMsg);
}
});
setTimeout(function() {
(s.isObject(n) || s.isPromise(n)) && s.isFunction(n.abort) && n.abort();
}, 3e3);
}
}, {
key: "initInstance",
value: function(t, i) {
if (this.config.isChildInstance) g.warn("initInstance() cannot be called on child instance"); else {
if (s.isString(t) && t !== this.name && s.isUndefined(this[t])) {
i = new e(s.extend({}, this.config, {
enablePersistence: !1,
isChildInstance: !0,
name: t
}, i));
return this[t] = i, this.instances.push(t), this[t]._state = this._state, i;
}
g.warn("initInstance() failed due to the name is invalid: " + t);
}
}
}, {
key: "lightInstance",
value: function(e) {
return this[e];
}
}, {
key: "_setAutoTrackProperties",
value: function(e) {
s.extend(this.autoTrackProperties, e);
}
}, {
key: "init",
value: function() {
if (this.initSystemInfo(), this._state.initComplete) return !1;
this._updateState({
initComplete: !0
}), g.info("TDAnalytics SDK initialize success, AppId = " + this.config.appId + ", ServerUrl = " + this.config.serverUrl + ", Mode = " + this.config.model + ", DeviceId = " + this.getDeviceId() + ", Lib = MG, LibVersion = 3.0.1");
}
}, {
key: "_isReady",
value: function() {
return this._state.getSystemInfo && this._state.initComplete && this.store.initComplete && this.getDeviceId();
}
}, {
key: "_updateState",
value: function(e) {
var t = this;
s.isObject(e) && s.extend(this._state, e), this._onStateChange(), s.each(this.instances, function(e) {
t[e]._onStateChange();
});
}
}, {
key: "_onStateChange",
value: function() {
var e = this;
this._isReady() && this._queue && 0 < this._queue.length && (s.each(this._queue, function(t) {
e[t[0]].apply(e, f.call(t[1]));
}), this._queue = []);
}
}, {
key: "_hasDisabled",
value: function() {
var e = !this.enabled || this.isOptOut;
return e && g.info("SDK is Pause or Stop!"), e;
}
}, {
key: "_sendRequest",
value: function(e, t, i) {
if (!this._hasDisabled()) if (s.isUndefined(this.config.disableEventList) || !this.config.disableEventList.includes(e.eventName)) {
t = s.isDate(t) ? t : new Date();
var r = {
data: [ {
"#type": e.type,
"#time": s.formatDate(t),
"#distinct_id": this.store.getDistinctId()
} ]
};
this.store.getAccountId() && (r.data[0]["#account_id"] = this.store.getAccountId()), 
"track" === e.type || "track_update" === e.type || "track_overwrite" === e.type ? (r.data[0]["#event_name"] = e.eventName, 
"track_update" === e.type || "track_overwrite" === e.type ? r.data[0]["#event_id"] = e.extraId : e.firstCheckId && (r.data[0]["#first_check_id"] = e.firstCheckId), 
r.data[0].properties = s.extend({
"#zone_offset": 0 - t.getTimezoneOffset() / 60
}, T.properties, this.autoTrackProperties, this.store.getSuperProperties(), this.dynamicProperties ? this.dynamicProperties() : {}), 
t = this.store.removeEventTimer(e.eventName), s.isUndefined(t) || (n = new Date().getTime() - t, 
86400 < (n = parseFloat((n / 1e3).toFixed(3))) ? n = 86400 : n < 0 && (n = 0), r.data[0].properties["#duration"] = n)) : r.data[0].properties = {}, 
s.isObject(e.properties) && !s.isEmptyObject(e.properties) && s.extend(r.data[0].properties, e.properties), 
s.searchObjDate(r.data[0]), 1 < this.config.maxRetries && (r.data[0]["#uuid"] = s.UUIDv4()), 
r["#app_id"] = this.appId, g.info("Tracking data, " + JSON.stringify(r, null, 4));
var n = "debug" === this.config.debugMode || "debugOnly" === this.config.debugMode ? this.serverDebugUrl : this.serverUrl;
if (s.isBoolean(this.config.enableEncrypt) && !0 === this.config.enableEncrypt && (r.data[0] = s.generateEncryptyData(r.data[0], this.config.secretKey)), 
this.batchConsumer && "none" === this.config.debugMode && !i) return this.batchConsumer.add(r.data[0]), 
void (s.isFunction(e.onComplete) && e.onComplete({
code: 0,
msg: "success"
}));
i ? (i = new FormData(), "debug" === this.config.debugMode || "debugOnly" === this.config.debugMode ? (i.append("source", "client"), 
i.append("appid", this.appId), i.append("dryRun", "debugOnly" === this.config.debugMode ? 1 : 0), 
i.append("deviceId", this.getDeviceId()), i.append("data", JSON.stringify(r.data[0])), 
navigator.sendBeacon(n, i)) : (i = new Date().getTime(), r["#flush_time"] = i, navigator.sendBeacon(n, JSON.stringify(r))), 
s.isFunction(e.onComplete) && e.onComplete({
statusCode: 200
})) : O.enqueue(r, n, {
maxRetries: this.config.maxRetries,
sendTimeout: this.config.sendTimeout,
callback: e.onComplete,
debugMode: this.config.debugMode,
deviceId: this.getDeviceId()
});
} else g.info("Disabled Event : " + e.eventName);
}
}, {
key: "_isObjectParams",
value: function(e) {
return s.isObject(e) && s.isFunction(e.onComplete);
}
}, {
key: "track",
value: function(e, t, i, r) {
var n;
this._hasDisabled() || (this._isObjectParams(e) && (e = (n = e).eventName, t = n.properties, 
i = n.time, r = n.onComplete), P.event(e) && P.properties(t) || !this.config.strict ? this._internalTrack(e, t, i, r) : s.isFunction(r) && r({
code: -1,
msg: "invalid parameters"
}));
}
}, {
key: "trackUpdate",
value: function(e) {
var t, i;
this._hasDisabled() || (e && e.eventId && (P.event(e.eventName) && P.properties(e.properties) || !this.config.strict) ? this._isReady() ? (t = s.checkCalibration(e.properties, e.time, this.config.enableCalibrationTime), 
i = s.isDate(e.time) ? e.time : new Date(), this._sendRequest({
type: "track_update",
eventName: e.eventName,
properties: t,
onComplete: e.onComplete,
extraId: e.eventId
}, i)) : this._queue.push([ "trackUpdate", [ e ] ]) : (g.warn("Invalide parameter for trackUpdate: you should pass an object contains eventId to trackUpdate()"), 
s.isFunction(e.onComplete) && e.onComplete({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "trackOverwrite",
value: function(e) {
var t, i;
this._hasDisabled() || (e && e.eventId && (P.event(e.eventName) && P.properties(e.properties) || !this.config.strict) ? this._isReady() ? (t = s.checkCalibration(e.properties, e.time, this.config.enableCalibrationTime), 
i = s.isDate(e.time) ? e.time : new Date(), this._sendRequest({
type: "track_overwrite",
eventName: e.eventName,
properties: t,
onComplete: e.onComplete,
extraId: e.eventId
}, i)) : this._queue.push([ "trackOverwrite", [ e ] ]) : (g.warn("Invalide parameter for trackOverwrite: you should pass an object contains eventId to trackOverwrite()"), 
s.isFunction(e.onComplete) && e.onComplete({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "trackFirstEvent",
value: function(e) {
var t, i;
this._hasDisabled() || (e && e.eventName && (P.event(e.eventName) && P.properties(e.properties) || !this.config.strict) ? this._isReady() ? (t = s.checkCalibration(e.properties, e.time, this.config.enableCalibrationTime), 
i = s.isDate(e.time) ? e.time : new Date(), this._sendRequest({
type: "track",
eventName: e.eventName,
properties: t,
onComplete: e.onComplete,
firstCheckId: e.firstCheckId || this.getDeviceId()
}, i)) : this._queue.push([ "trackFirstEvent", [ e ] ]) : (g.warn("Invalide parameter for trackFirstEvent: you should pass an object contains eventName to trackFirstEvent()"), 
s.isFunction(e.onComplete) && e.onComplete({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "_internalTrack",
value: function(e, t, i, r, n) {
var a;
this._hasDisabled() || (a = s.checkCalibration(t, i, this.config.enableCalibrationTime), 
i = s.isDate(i) ? i : new Date(), this._isReady() ? this._sendRequest({
type: "track",
eventName: e,
properties: a,
onComplete: r
}, i, n) : this._queue.push([ "_internalTrack", [ e, t, i, r ] ]));
}
}, {
key: "userSet",
value: function(e, t, i) {
var r;
this._hasDisabled() || (this._isObjectParams(e) && (e = (r = e).properties, t = r.time, 
i = r.onComplete), P.propertiesMust(e) || !this.config.strict ? (t = s.isDate(t) ? t : new Date(), 
this._isReady() ? this._sendRequest({
type: "user_set",
properties: e,
onComplete: i
}, t) : this._queue.push([ "userSet", [ e, t, i ] ])) : (g.warn("calling userSet failed due to invalid arguments"), 
s.isFunction(i) && i({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "userSetOnce",
value: function(e, t, i) {
var r;
this._hasDisabled() || (this._isObjectParams(e) && (e = (r = e).properties, t = r.time, 
i = r.onComplete), P.propertiesMust(e) || !this.config.strict ? (t = s.isDate(t) ? t : new Date(), 
this._isReady() ? this._sendRequest({
type: "user_setOnce",
properties: e,
onComplete: i
}, t) : this._queue.push([ "userSetOnce", [ e, t, i ] ])) : (g.warn("calling userSetOnce failed due to invalid arguments"), 
s.isFunction(i) && i({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "userUnset",
value: function(e, t, i) {
var r;
this._hasDisabled() || (this._isObjectParams(r) && (e = r.property, t = r.time, 
i = r.onComplete), P.propertyName(e) || !this.config.strict ? (t = s.isDate(t) ? t : new Date(), 
this._isReady() ? ((r = {})[e] = 0, this._sendRequest({
type: "user_unset",
properties: r,
onComplete: i
}, t)) : this._queue.push([ "userUnset", [ e, i, t ] ])) : (g.warn("calling userUnset failed due to invalid arguments"), 
s.isFunction(i) && i({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "userDel",
value: function(e, t) {
var i;
this._hasDisabled() || (this._isObjectParams(e) && (e = (i = e).time, t = i.onComplete), 
e = s.isDate(e) ? e : new Date(), this._isReady() ? this._sendRequest({
type: "user_del",
onComplete: t
}, e) : this._queue.push([ "userDel", [ e, t ] ]));
}
}, {
key: "userAdd",
value: function(e, t, i) {
var r;
this._hasDisabled() || (this._isObjectParams(e) && (e = (r = e).properties, t = r.time, 
i = r.onComplete), P.userAddProperties(e) || !this.config.strict ? (t = s.isDate(t) ? t : new Date(), 
this._isReady() ? this._sendRequest({
type: "user_add",
properties: e,
onComplete: i
}, t) : this._queue.push([ "userAdd", [ e, t, i ] ])) : (g.warn("calling userAdd failed due to invalid arguments"), 
s.isFunction(i) && i({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "userAppend",
value: function(e, t, i) {
var r;
this._hasDisabled() || (this._isObjectParams(e) && (e = (r = e).properties, t = r.time, 
i = r.onComplete), P.userAppendProperties(e) || !this.config.strict ? (t = s.isDate(t) ? t : new Date(), 
this._isReady() ? this._sendRequest({
type: "user_append",
properties: e,
onComplete: i
}, t) : this._queue.push([ "userAppend", [ e, t, i ] ])) : (g.warn("calling userAppend failed due to invalid arguments"), 
s.isFunction(i) && i({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "userUniqAppend",
value: function(e, t, i) {
var r;
this._hasDisabled() || (this._isObjectParams(e) && (e = (r = e).properties, t = r.time, 
i = r.onComplete), P.userAppendProperties(e) || !this.config.strict ? (t = s.isDate(t) ? t : new Date(), 
this._isReady() ? this._sendRequest({
type: "user_uniq_append",
properties: e,
onComplete: i
}, t) : this._queue.push([ "userUniqAppend", [ e, t, i ] ])) : (g.warn("calling userAppend failed due to invalid arguments"), 
s.isFunction(i) && i({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "flush",
value: function() {
this.batchConsumer && "none" === this.config.debugMode && this.batchConsumer.flush();
}
}, {
key: "authorizeOpenID",
value: function(e) {
this.identify(e);
}
}, {
key: "identify",
value: function(e) {
if (!this._hasDisabled()) {
if ("number" == typeof e) e = String(e); else if ("string" != typeof e) return !1;
this.store.setDistinctId(e), g.info("Setting distinct ID, DistinctId = " + e);
}
}
}, {
key: "getDistinctId",
value: function() {
return this.store.getDistinctId();
}
}, {
key: "login",
value: function(e) {
if (!this._hasDisabled()) {
if ("number" == typeof e) e = String(e); else if ("string" != typeof e) return !1;
this.store.setAccountId(e), g.info("Login SDK, AccountId = " + e);
}
}
}, {
key: "getAccountId",
value: function() {
return this.store.getAccountId();
}
}, {
key: "logout",
value: function() {
this._hasDisabled() || (this.store.setAccountId(null), g.info("Logout SDK"));
}
}, {
key: "setSuperProperties",
value: function(e) {
this._hasDisabled() || (P.propertiesMust(e) || !this.config.strict ? this.store.setSuperProperties(e) : g.warn("setSuperProperties parameter must be a valid property value"));
}
}, {
key: "clearSuperProperties",
value: function() {
this._hasDisabled() || this.store.setSuperProperties({}, !0);
}
}, {
key: "unsetSuperProperty",
value: function(e) {
var t;
this._hasDisabled() || s.isString(e) && (delete (t = this.getSuperProperties())[e], 
this.store.setSuperProperties(t, !0));
}
}, {
key: "getSuperProperties",
value: function() {
return this.store.getSuperProperties();
}
}, {
key: "getPresetProperties",
value: function() {
var e = T.properties, t = {}, i = e["#os"];
t.os = s.isUndefined(i) ? "" : i;
i = e["#screen_width"];
t.screenWidth = s.isUndefined(i) ? 0 : i;
i = e["#screen_height"];
t.screenHeight = s.isUndefined(i) ? 0 : i;
i = e["#network_type"];
t.networkType = s.isUndefined(i) ? "" : i;
i = e["#device_model"];
t.deviceModel = s.isUndefined(i) ? "" : i;
i = e["#os_version"];
t.osVersion = s.isUndefined(i) ? "" : i, t.deviceId = this.getDeviceId();
var r = 0 - new Date().getTimezoneOffset() / 60;
t.zoneOffset = r;
e = e["#manufacturer"];
return t.manufacturer = s.isUndefined(e) ? "" : e, t.toEventPresetProperties = function() {
return {
"#device_model": t.deviceModel,
"#device_id": t.deviceId,
"#screen_width": t.screenWidth,
"#screen_height": t.screenHeight,
"#os": t.os,
"#os_version": t.osVersion,
"#network_type": t.networkType,
"#zone_offset": r,
"#manufacturer": t.manufacturer
};
}, t;
}
}, {
key: "setDynamicSuperProperties",
value: function(e) {
this._hasDisabled() || ("function" == typeof e ? P.properties(e()) || !this.config.strict ? this.dynamicProperties = e : g.warn("A dynamic public property must return a valid property value") : g.warn("setDynamicSuperProperties parameter must be a function type"));
}
}, {
key: "timeEvent",
value: function(e, t) {
this._hasDisabled() || (t = s.isDate(t) ? t : new Date(), this._isReady() ? P.event(e) || !this.config.strict ? this.store.setEventTimer(e, t.getTime()) : g.warn("calling timeEvent failed due to invalid eventName: " + e) : this._queue.push([ "timeEvent", [ e, t ] ]));
}
}, {
key: "getDeviceId",
value: function() {
return T.properties["#device_id"];
}
}, {
key: "enableTracking",
value: function(e) {
this.enabled = e, this.store._set("ta_enabled", e);
}
}, {
key: "optOutTracking",
value: function() {
this.store.setSuperProperties({}, !0), this.store.setDistinctId(s.UUID()), this.store.setAccountId(null), 
this._queue.splice(0, this._queue.length), this.isOptOut = !0, this.store._set("ta_isOptOut", !0);
}
}, {
key: "optOutTrackingAndDeleteUser",
value: function() {
var e = new Date();
this._sendRequest({
type: "user_del"
}, e), this.optOutTracking();
}
}, {
key: "optInTracking",
value: function() {
this.isOptOut = !1, this.store._set("ta_isOptOut", !1);
}
}, {
key: "setTrackStatus",
value: function(e) {
switch (e) {
case "PAUSE":
this.eventSaveOnly = !1, this.optInTracking(), this.enableTracking(!1);
break;

case "STOP":
this.eventSaveOnly = !1, this.optOutTracking(!0);
break;

case "SAVE_ONLY":
break;

case "NORMAL":
default:
this.eventSaveOnly = !1, this.optInTracking(), this.enableTracking(!0);
}
g.info("Change Status to " + e);
}
} ]), e;
}(), L = {
name: "thinkingdata",
enableLog: !0,
enableNative: !1
}, U = function() {
function e(t) {
r(this, e), t.appId = t.appId ? s.checkAppId(t.appId) : s.checkAppId(t.appid), t.serverUrl = t.serverUrl ? s.checkUrl(t.serverUrl) : s.checkUrl(t.server_url);
var i = s.extend({}, L, I.getConfig());
s.isObject(t) ? this.config = s.extend(i, t) : this.config = i, this._init(this.config);
}
return a(e, [ {
key: "_isNativePlatform",
value: function() {
return !(!this._isIOS() && !this._isAndroid() || !this.config.enableNative);
}
}, {
key: "_isIOS",
value: function() {
return !(!cc.sys.isNative || "iOS" !== cc.sys.os);
}
}, {
key: "_isAndroid",
value: function() {
return !(!cc.sys.isNative || "Android" !== cc.sys.os);
}
}, {
key: "_init",
value: function(e) {
this.name = e.name, this.appId = e.appId || e.appid, this._isNativePlatform() ? (this.initInstanceForNative(e), 
this._readStorage(e)) : this.taJs = new ThinkingAnalyticsAPIForJS(e);
}
}, {
key: "_readStorage",
value: function(e) {
var t = this, i = e.persistenceName, r = e.persistenceNameOld;
e.isChildInstance && (i = e.persistenceName + "_" + e.name, r = e.persistenceNameOld + "_" + e.name), 
this._state = I.getStorage(i) || {}, s.isEmptyObject(this._state) && (this._state = I.getStorage(r) || {}), 
s.isEmptyObject(this._state) ? I.getStorage(i, !0, function(e) {
s.isEmptyObject(e) ? I.getStorage(r, !0, function(e) {
t._state = s.extend2Layers({}, e, t._state);
}) : t._state = s.extend2Layers({}, e, t._state), t._state.distinct_id && t.identifyForNative(t._state.distinct_id), 
t._state.account_id && t.loginForNative(t._state.account_id);
}) : (this._state.distinct_id && this.identifyForNative(this._state.distinct_id), 
this._state.account_id && this.loginForNative(this._state.account_id));
}
}, {
key: "initInstance",
value: function(e, t) {
return this._isNativePlatform() ? s.isUndefined(t) ? this[e] = new ThinkingAnalyticsAPI(this.config) : this[e] = new ThinkingAnalyticsAPI(t) : this[e] = this.taJs.initInstance(e, t), 
this[e];
}
}, {
key: "lightInstance",
value: function() {
return this._isNativePlatform() ? this.lightInstanceForNative(this.appId) : this;
}
}, {
key: "init",
value: function() {
if (this._isNativePlatform()) {
var e = window, t = this;
return e.__autoTrackCallback = function(e) {
if (s.isFunction(t.config.autoTrack.callback)) {
e = t.config.autoTrack.callback(e);
return JSON.stringify(e);
}
return "{}";
}, void this.startThinkingAnalyticsForNative(this.appId);
}
this.taJs.init();
}
}, {
key: "track",
value: function(e, t, i, r) {
this._isNativePlatform() ? this.trackForNative(e, t, i, this.appId) : this.taJs.track(e, t, i, r);
}
}, {
key: "trackUpdate",
value: function(e) {
this._isNativePlatform() ? this.trackUpdateForNative(e, this.appId) : this.taJs.trackUpdate(e);
}
}, {
key: "trackOverwrite",
value: function(e) {
this._isNativePlatform() ? this.trackOverwriteForNative(e, this.appId) : this.taJs.trackOverwrite(e);
}
}, {
key: "trackFirstEvent",
value: function(e) {
this._isNativePlatform() ? this.trackFirstEventForNative(e, this.appId) : this.taJs.trackFirstEvent(e);
}
}, {
key: "userSet",
value: function(e, t, i) {
this._isNativePlatform() ? this.userSetForNative(e, this.appId) : this.taJs.userSet(e, t, i);
}
}, {
key: "userSetOnce",
value: function(e, t, i) {
this._isNativePlatform() ? this.userSetOnceForNative(e, this.appId) : this.taJs.userSetOnce(e, t, i);
}
}, {
key: "userUnset",
value: function(e, t, i) {
this._isNativePlatform() ? this.userUnsetForNative(e, this.appId) : this.taJs.userUnset(e, t, i);
}
}, {
key: "userDel",
value: function(e, t) {
this._isNativePlatform() ? this.userDelForNative(this.appId) : this.taJs.userDel(e, t);
}
}, {
key: "userAdd",
value: function(e, t, i) {
this._isNativePlatform() ? this.userAddForNative(e, this.appId) : this.taJs.userAdd(e, t, i);
}
}, {
key: "userAppend",
value: function(e, t, i) {
this._isNativePlatform() ? this.userAppendForNative(e, this.appId) : this.taJs.userAppend(e, t, i);
}
}, {
key: "userUniqAppend",
value: function(e, t, i) {
this._isNativePlatform() ? this.userUniqAppendForNative(e, this.appId) : this.taJs.userUniqAppend(e, t, i);
}
}, {
key: "flush",
value: function() {
this._isNativePlatform() ? this.flushForNative(this.appId) : this.taJs.flush();
}
}, {
key: "authorizeOpenID",
value: function(e) {
this.identify(e);
}
}, {
key: "identify",
value: function(e) {
this._isNativePlatform() ? this.identifyForNative(e, this.appId) : this.taJs.identify(e);
}
}, {
key: "getDistinctId",
value: function() {
return this._isNativePlatform() ? this.getDistinctIdForNative(this.appId) : this.taJs.getDistinctId();
}
}, {
key: "login",
value: function(e) {
this._isNativePlatform() ? this.loginForNative(e, this.appId) : this.taJs.login(e);
}
}, {
key: "getAccountId",
value: function() {
return this._isNativePlatform() ? this.getAccountIdForNative(this.appId) : this.taJs.getAccountId();
}
}, {
key: "logout",
value: function() {
this._isNativePlatform() ? this.logoutForNative(this.appId) : this.taJs.logout();
}
}, {
key: "setSuperProperties",
value: function(e) {
this._isNativePlatform() ? this.setSuperPropertiesForNative(e, this.appId) : this.taJs.setSuperProperties(e);
}
}, {
key: "clearSuperProperties",
value: function() {
this._isNativePlatform() ? this.clearSuperPropertiesForNative(this.appId) : this.taJs.clearSuperProperties();
}
}, {
key: "unsetSuperProperty",
value: function(e) {
this._isNativePlatform() ? this.unsetSuperPropertyForNative(e, this.appId) : this.taJs.unsetSuperProperty(e);
}
}, {
key: "getSuperProperties",
value: function() {
return this._isNativePlatform() ? this.getSuperPropertiesForNative(this.appId) : this.taJs.getSuperProperties();
}
}, {
key: "getPresetProperties",
value: function() {
if (this._isNativePlatform()) {
var e = this.getPresetPropertiesForNative(this.appId), t = {}, i = e["#os"];
t.os = s.isUndefined(i) ? "" : i;
i = e["#screen_width"];
t.screenWidth = s.isUndefined(i) ? 0 : i;
i = e["#screen_height"];
t.screenHeight = s.isUndefined(i) ? 0 : i;
i = e["#network_type"];
t.networkType = s.isUndefined(i) ? "" : i;
i = e["#device_model"];
t.deviceModel = s.isUndefined(i) ? "" : i;
i = e["#os_version"];
t.osVersion = s.isUndefined(i) ? "" : i, t.deviceId = this.getDeviceId();
var r = 0 - new Date().getTimezoneOffset() / 60;
t.zoneOffset = r;
e = e["#manufacturer"];
return t.manufacturer = s.isUndefined(e) ? "" : e, t.toEventPresetProperties = function() {
return {
"#device_model": t.deviceModel,
"#device_id": t.deviceId,
"#screen_width": t.screenWidth,
"#screen_height": t.screenHeight,
"#os": t.os,
"#os_version": t.osVersion,
"#network_type": t.networkType,
"#zone_offset": r,
"#manufacturer": t.manufacturer
};
}, t;
}
return this.taJs.getPresetProperties();
}
}, {
key: "setDynamicSuperProperties",
value: function(e) {
this._isNativePlatform() ? "function" == typeof e ? (this.dynamicProperties = e, 
window.__dynamicPropertiesForNative = function(t) {
console.log("__dynamicPropertiesForNative: native msg: ", t);
t = e(), t = s.encodeDates(t);
return JSON.stringify(t);
}, this.setDynamicSuperPropertiesForNative("__dynamicPropertiesForNative")) : logger.warn("setDynamicSuperProperties parameter must be a function type") : this.taJs.setDynamicSuperProperties(e);
}
}, {
key: "timeEvent",
value: function(e, t) {
return this._isNativePlatform() ? this.timeEventForNative(e, this.appId) : this.taJs.timeEvent(e, t);
}
}, {
key: "getDeviceId",
value: function() {
return this._isNativePlatform() ? this.getDeviceIdForNative(this.appId) : this.taJs.getDeviceId();
}
}, {
key: "enableTracking",
value: function(e) {
this._isNativePlatform() ? this.enableTrackingForNative(e, this.appId) : this.taJs.enableTracking(e);
}
}, {
key: "optOutTracking",
value: function() {
this._isNativePlatform() ? this.optOutTrackingForNative(this.appId) : this.taJs.optOutTracking();
}
}, {
key: "optOutTrackingAndDeleteUser",
value: function() {
this._isNativePlatform() ? this.optOutTrackingAndDeleteUserForNative(this.appId) : this.taJs.optOutTrackingAndDeleteUser();
}
}, {
key: "optInTracking",
value: function() {
this._isNativePlatform() ? this.optInTrackingForNative(this.appId) : this.taJs.optInTracking();
}
}, {
key: "setTrackStatus",
value: function(e) {
this._isNativePlatform() ? this.setTrackStatusForNative(e, this.appId) : this.taJs.setTrackStatus(e);
}
}, {
key: "trackForNative",
value: function(e, t, i, r) {
i = s.isDate(i) ? s.formatDate(i) : "";
s.isUndefined(t) && (t = {}), t = s.extend(t, this.dynamicProperties ? this.dynamicProperties() : {}), 
t = s.encodeDates(t), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "track", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V", e, JSON.stringify(t), i, r) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "track:properties:time:appId:", e, JSON.stringify(t), i, r);
}
}, {
key: "trackUpdateForNative",
value: function(e, t) {
e.properties = s.extend(s.isUndefined(e.properties) ? {} : e.properties, this.dynamicProperties ? this.dynamicProperties() : {}), 
e = s.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "trackUpdate", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "trackUpdate:appId:", JSON.stringify(e), t);
}
}, {
key: "trackFirstEventForNative",
value: function(e, t) {
e.properties = s.extend(s.isUndefined(e.properties) ? {} : e.properties, this.dynamicProperties ? this.dynamicProperties() : {}), 
e = s.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "trackFirstEvent", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "trackFirstEvent:appId:", JSON.stringify(e), t);
}
}, {
key: "trackOverwriteForNative",
value: function(e, t) {
e.properties = s.extend(s.isUndefined(e.properties) ? {} : e.properties, this.dynamicProperties ? this.dynamicProperties() : {}), 
e = s.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "trackOverwrite", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "trackOverwrite:appId:", JSON.stringify(e), t);
}
}, {
key: "timeEventForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "timeEvent", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "timeEvent:appId:", e, t);
}
}, {
key: "loginForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "login", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "login:appId:", e, t);
}
}, {
key: "logoutForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "logout", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "logout:", e);
}
}, {
key: "setSuperPropertiesForNative",
value: function(e, t) {
e = s.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "setSuperProperties", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "setSuperProperties:appId:", JSON.stringify(e), t);
}
}, {
key: "getSuperPropertiesForNative",
value: function(e) {
var t = "{}";
return this._isAndroid() ? t = jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "getSuperProperties", "(Ljava/lang/String;)Ljava/lang/String;", e) : this._isIOS() && (t = jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "getSuperProperties:", e)), 
JSON.parse(t);
}
}, {
key: "unsetSuperPropertyForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "unsetSuperProperty", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "unsetSuperProperty:appId:", e, t);
}
}, {
key: "clearSuperPropertiesForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "clearSuperProperties", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "clearSuperProperties:", e);
}
}, {
key: "userSetForNative",
value: function(e, t) {
e = s.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userSet", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userSet:appId:", JSON.stringify(e), t);
}
}, {
key: "userSetOnceForNative",
value: function(e, t) {
e = s.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userSetOnce", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userSetOnce:appId:", JSON.stringify(e), t);
}
}, {
key: "userAppendForNative",
value: function(e, t) {
e = s.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userAppend", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userAppend:appId:", JSON.stringify(e), t);
}
}, {
key: "userUniqAppendForNative",
value: function(e, t) {
e = s.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userUniqAppend", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userUniqAppend:appId:", JSON.stringify(e), t);
}
}, {
key: "userAddForNative",
value: function(e, t) {
e = s.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userAdd", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userAdd:appId:", JSON.stringify(e), t);
}
}, {
key: "userUnsetForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userUnset", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userUnset:appId:", e, t);
}
}, {
key: "userDelForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userDel", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userDel:", e);
}
}, {
key: "flushForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "flush", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "flush:", e);
}
}, {
key: "authorizeOpenIDForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "authorizeOpenID", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "authorizeOpenID:appId:", e, t);
}
}, {
key: "identifyForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "identify", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "identify:appId:", e, t);
}
}, {
key: "initInstanceForNative",
value: function(e) {
this._isAndroid() ? (jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "setCustomerLibInfo", "(Ljava/lang/String;Ljava/lang/String;)V", "MG", "3.0.1"), 
jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "initWithConfig", "(Ljava/lang/String;)V", JSON.stringify(e))) : this._isIOS() && (jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "setCustomerLibInfoWithLibName:libVersion:", "MG", "3.0.1"), 
jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "initWithConfig:", JSON.stringify(e)));
}
}, {
key: "lightInstanceForNative",
value: function(e) {
return this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "lightInstance", "(Ljava/lang/String;)Ljava/lang/String;", e) : this._isIOS() ? jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "lightInstance:", e) : void 0;
}
}, {
key: "startThinkingAnalyticsForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "startThinkingAnalytics", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "startThinkingAnalytics:", e);
}
}, {
key: "setDynamicSuperPropertiesForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "setDynamicSuperProperties", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "setDynamicSuperProperties:appId:", e, t);
}
}, {
key: "getDeviceIdForNative",
value: function(e) {
return this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "getDeviceId", "(Ljava/lang/String;)Ljava/lang/String;", e) : this._isIOS() ? jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "getDeviceId:", e) : void 0;
}
}, {
key: "getDistinctIdForNative",
value: function(e) {
return this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "getDistinctId", "(Ljava/lang/String;)Ljava/lang/String;", e) : this._isIOS() ? jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "getDistinctId:", e) : void 0;
}
}, {
key: "getAccountIdForNative",
value: function(e) {
return this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "getAccountId", "(Ljava/lang/String;)Ljava/lang/String;", e) : this._isIOS() ? jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "getAccountId:", e) : void 0;
}
}, {
key: "getPresetPropertiesForNative",
value: function(e) {
var t = "{}";
return this._isAndroid() ? t = jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "getPresetProperties", "(Ljava/lang/String;)Ljava/lang/String;", e) : this._isIOS() && (t = jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "getPresetProperties:", e)), 
JSON.parse(t);
}
}, {
key: "enableTrackingForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "enableTracking", "(Ljava/lang/String;Ljava/lang/String;)V", e.toString(), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "enableTracking:appId:", e.toString(), t);
}
}, {
key: "optOutTrackingForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "optOutTracking", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "optOutTracking:", e);
}
}, {
key: "optOutTrackingAndDeleteUserForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "optOutTrackingAndDeleteUser", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "optOutTrackingAndDeleteUser:", e);
}
}, {
key: "optInTrackingForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "optInTracking", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "optInTracking:", e);
}
}, {
key: "setTrackStatusForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "setTrackStatus", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "setTrackStatus:appId:", e, t);
}
} ]), e;
}();
window.ThinkingAnalyticsAPI = U, window.ThinkingAnalyticsAPIForJS = B;
var q = function() {
function e() {
r(this, e);
}
return a(e, null, [ {
key: "_shareInstance",
value: function(e) {
return void 0 !== this._instanceMaps[e] ? this._instanceMaps[e] : void 0 !== this._defaultInstance ? this._defaultInstance : void 0;
}
}, {
key: "init",
value: function(e) {
var t = new U(e);
t.init(), void 0 !== t && (void 0 === this._defaultInstance && (this._defaultInstance = t, 
this._instanceMaps = {}), this._instanceMaps[e.appId] = t);
}
}, {
key: "lightInstance",
value: function(e) {
return this._shareInstance(e).lightInstance();
}
}, {
key: "track",
value: function(e, t) {
e = 0 < arguments.length && void 0 !== e ? e : {}, t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).track(e.eventName, e.properties, e.time, e.onComplete);
}
}, {
key: "trackFirst",
value: function(e, t) {
e = 0 < arguments.length && void 0 !== e ? e : {}, t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).trackFirstEvent(e);
}
}, {
key: "trackUpdate",
value: function(e, t) {
e = 0 < arguments.length && void 0 !== e ? e : {}, t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).trackUpdate(e);
}
}, {
key: "trackOverwrite",
value: function(e, t) {
e = 0 < arguments.length && void 0 !== e ? e : {}, t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).trackOverwrite(e);
}
}, {
key: "timeEvent",
value: function(e, t) {
e = 0 < arguments.length && void 0 !== e ? e : {}, t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).timeEvent(e.eventName, e.time);
}
}, {
key: "userSet",
value: function(e, t) {
e = 0 < arguments.length && void 0 !== e ? e : {}, t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).userSet(e.properties, e.time, e.onComplete);
}
}, {
key: "userSetOnce",
value: function(e, t) {
e = 0 < arguments.length && void 0 !== e ? e : {}, t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).userSetOnce(e.properties, e.time, e.onComplete);
}
}, {
key: "userUnset",
value: function(e, t) {
e = 0 < arguments.length && void 0 !== e ? e : {}, t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).userUnset(e.property, e.time, e.onComplete);
}
}, {
key: "userAdd",
value: function(e, t) {
e = 0 < arguments.length && void 0 !== e ? e : {}, t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).userAdd(e.properties, e.time, e.onComplete);
}
}, {
key: "userAppend",
value: function(e, t) {
e = 0 < arguments.length && void 0 !== e ? e : {}, t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).userAppend(e.properties, e.time, e.onComplete);
}
}, {
key: "userUniqAppend",
value: function(e, t) {
e = 0 < arguments.length && void 0 !== e ? e : {}, t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).userUniqAppend(e.properties, e.time, e.onComplete);
}
}, {
key: "userDelete",
value: function(e, t) {
e = 0 < arguments.length && void 0 !== e ? e : {}, t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).userDel(e.time, e.onComplete);
}
}, {
key: "setSuperProperties",
value: function(e, t) {
t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).setSuperProperties(e);
}
}, {
key: "unsetSuperProperty",
value: function(e, t) {
t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).unsetSuperProperty(e);
}
}, {
key: "clearSuperProperties",
value: function(e) {
this._shareInstance(e).clearSuperProperties();
}
}, {
key: "getSuperProperties",
value: function(e) {
return this._shareInstance(e).getSuperProperties();
}
}, {
key: "setDynamicSuperProperties",
value: function(e, t) {
t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).setDynamicSuperProperties(e);
}
}, {
key: "getPresetProperties",
value: function(e) {
return this._shareInstance(e).getPresetProperties();
}
}, {
key: "login",
value: function(e, t) {
t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).login(e);
}
}, {
key: "logout",
value: function(e) {
this._shareInstance(e).logout();
}
}, {
key: "setDistinctId",
value: function(e, t) {
t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).identify(e);
}
}, {
key: "getDistinctId",
value: function(e) {
return this._shareInstance(e).getDistinctId();
}
}, {
key: "getSDKVersion",
value: function() {
return "1.0.0";
}
}, {
key: "getDeviceId",
value: function(e) {
return this._shareInstance(e).getDeviceId();
}
}, {
key: "flush",
value: function(e) {
this._shareInstance(e).flush();
}
}, {
key: "setTrackStatus",
value: function(e, t) {
t = 1 < arguments.length && void 0 !== t ? t : "";
this._shareInstance(t).setTrackStatus(e);
}
}, {
key: "ThinkingDataAPI",
value: function() {
return U;
}
} ]), e;
}();
window.TDAnalytics = q, t.exports = q;
cc._RF.pop();
}, {} ],
"thinkingdata.mg.cocoscreator.min": [ function(e, t) {
"use strict";
cc._RF.push(t, "4cfe4N2sLxOr48ttY16GDH0", "thinkingdata.mg.cocoscreator.min");
function i(e) {
return (i = "function" == typeof Symbol && "symbol" == typeof Symbol.iterator ? function(e) {
return typeof e;
} : function(e) {
return e && "function" == typeof Symbol && e.constructor === Symbol && e !== Symbol.prototype ? "symbol" : typeof e;
})(e);
}
function r(e, t) {
if (!(e instanceof t)) throw new TypeError("Cannot call a class as a function");
}
function n(e, t) {
for (var i = 0; i < t.length; i++) {
var r = t[i];
r.enumerable = r.enumerable || !1, r.configurable = !0, "value" in r && (r.writable = !0), 
Object.defineProperty(e, o(r.key), r);
}
}
function a(e, t, i) {
return t && n(e.prototype, t), i && n(e, i), Object.defineProperty(e, "prototype", {
writable: !1
}), e;
}
function s(e, t) {
if ("object" != typeof e || null === e) return e;
var i = e[Symbol.toPrimitive];
if (void 0 === i) return ("string" === t ? String : Number)(e);
if ("object" != typeof (i = i.call(e, t || "default"))) return i;
throw new TypeError("@@toPrimitive must return a primitive value.");
}
function o(e) {
return "symbol" == typeof (e = s(e, "string")) ? e : String(e);
}
var c = {}, f = Array.prototype, h = Object.prototype, u = f.slice, d = h.toString, l = Object.prototype.hasOwnProperty, p = f.forEach, b = Array.isArray, g = {}, m = [ "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term" ], v = (c.each = function(e, t, i) {
if (null == e) return !1;
if (p && e.forEach === p) e.forEach(t, i); else if (e.length === +e.length) {
for (var r = 0, n = e.length; r < n; r++) if (r in e && t.call(i, e[r], r, e) === g) return !1;
} else for (var a in e) if (l.call(e, a) && t.call(i, e[a], a, e) === g) return !1;
}, c.extend = function(e) {
return c.each(u.call(arguments, 1), function(t) {
for (var i in t) void 0 !== t[i] && (e[i] = t[i]);
}), e;
}, c.extend2Layers = function(e) {
return c.each(u.call(arguments, 1), function(t) {
for (var i in t) void 0 !== t[i] && (c.isObject(t[i]) && c.isObject(e[i]) ? c.extend(e[i], t[i]) : e[i] = t[i]);
}), e;
}, c.isArray = b || function(e) {
return "[object Array]" === d.call(e);
}, c.isFunction = function(e) {
try {
return "function" == typeof e;
} catch (e) {
return !1;
}
}, c.isPromise = function(e) {
return "[object Promise]" === d.call(e) && null != e;
}, c.isObject = function(e) {
return "[object Object]" === d.call(e) && null != e;
}, c.isEmptyObject = function(e) {
if (c.isObject(e)) {
for (var t in e) if (l.call(e, t)) return !1;
return !0;
}
return !1;
}, c.isUndefined = function(e) {
return void 0 === e;
}, c.isString = function(e) {
return "[object String]" === d.call(e);
}, c.isDate = function(e) {
return "[object Date]" === d.call(e);
}, c.isBoolean = function(e) {
return "[object Boolean]" === d.call(e);
}, c.isNumber = function(e) {
return "[object Number]" === d.call(e) && /[\d\.]+/.test(String(e));
}, c.isJSONString = function(e) {
try {
JSON.parse(e);
} catch (e) {
return !1;
}
return !0;
}, c.decodeURIComponent = function(e) {
var t = "";
try {
t = decodeURIComponent(e);
} catch (i) {
t = e;
}
return t;
}, c.encodeURIComponent = function(e) {
var t = "";
try {
t = encodeURIComponent(e);
} catch (i) {
t = e;
}
return t;
}, c.utf8Encode = function(e) {
for (var t, i = "", r = t = 0, n = (e = (e + "").replace(/\r\n/g, "\n").replace(/\r/g, "\n")).length, a = 0; a < n; a++) {
var s = e.charCodeAt(a), o = null;
s < 128 ? t++ : o = 127 < s && s < 2048 ? String.fromCharCode(s >> 6 | 192, 63 & s | 128) : String.fromCharCode(s >> 12 | 224, s >> 6 & 63 | 128, 63 & s | 128), 
null !== o && (r < t && (i += e.substring(r, t)), i += o, r = t = a + 1);
}
return r < t && (i += e.substring(r, e.length)), i;
}, c.base64Encode = function(e) {
var t, i, r, n, a = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=", s = 0, o = 0, f = "", h = [];
if (!e) return e;
for (e = c.utf8Encode(e); t = (n = e.charCodeAt(s++) << 16 | e.charCodeAt(s++) << 8 | e.charCodeAt(s++)) >> 12 & 63, 
i = n >> 6 & 63, r = 63 & n, h[o++] = a.charAt(n >> 18 & 63) + a.charAt(t) + a.charAt(i) + a.charAt(r), 
s < e.length; ) ;
switch (f = h.join(""), e.length % 3) {
case 1:
f = f.slice(0, -2) + "==";
break;

case 2:
f = f.slice(0, -1) + "=";
}
return f;
}, c.encodeDates = function(e) {
return c.each(e, function(t, i) {
if (c.isDate(t)) e[i] = c.formatDate(t); else if (c.isObject(t)) e[i] = c.encodeDates(t); else if (c.isArray(t)) for (var r = 0; r < t.length; r++) c.isDate(t[r]) && (e[i][r] = c.formatDate(t[r]));
}), e;
}, c.formatDate = function(e) {
function t(e) {
return e < 10 ? "0" + e : e;
}
return e.getFullYear() + "-" + t(e.getMonth() + 1) + "-" + t(e.getDate()) + " " + t(e.getHours()) + ":" + t(e.getMinutes()) + ":" + t(e.getSeconds()) + "." + ((e = e.getMilliseconds()) < 100 && 9 < e ? "0" + e : e < 10 ? "00" + e : e);
}, c.searchObjDate = function(e) {
try {
(c.isObject(e) || c.isArray(e)) && c.each(e, function(t, i) {
c.isObject(t) || c.isArray(t) ? c.searchObjDate(e[i]) : c.isDate(t) && (e[i] = c.formatDate(t));
});
} catch (e) {
v.warn(e);
}
}, c.UUID = function() {
var e = new Date().getTime();
return String(Math.random()).replace(".", "").slice(1, 11) + "-" + e;
}, c.UUIDv4 = function() {
return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(e) {
var t = 16 * Math.random() | 0;
return ("x" === e ? t : 3 & t | 8).toString(16);
});
}, c.setMpPlatform = function(e) {
c.mpPlatform = e;
}, c.getMpPlatform = function() {
return c.mpPlatform;
}, c.createExtraHeaders = function() {
return {
"TA-Integration-Type": "MG",
"TA-Integration-Version": "2.2.1",
"TA-Integration-Count": "1",
"TA-Integration-Extra": c.getMpPlatform()
};
}, c.checkAppId = function(e) {
return e.replace(/\s*/g, "");
}, c.checkUrl = function(e) {
return e = e.replace(/\s*/g, ""), c.url("basic", e);
}, c.url = function() {
function e() {
return new RegExp(/(.*?)\.?([^.]*?)\.(com|net|org|biz|ws|in|me|co\.uk|co|org\.uk|ltd\.uk|plc\.uk|me\.uk|edu|mil|br\.com|cn\.com|eu\.com|hu\.com|no\.com|qc\.com|sa\.com|se\.com|se\.net|us\.com|uy\.com|ac|co\.ac|gv\.ac|or\.ac|ac\.ac|af|am|as|at|ac\.at|co\.at|gv\.at|or\.at|asn\.au|com\.au|edu\.au|org\.au|net\.au|id\.au|be|ac\.be|adm\.br|adv\.br|am\.br|arq\.br|art\.br|bio\.br|cng\.br|cnt\.br|com\.br|ecn\.br|eng\.br|esp\.br|etc\.br|eti\.br|fm\.br|fot\.br|fst\.br|g12\.br|gov\.br|ind\.br|inf\.br|jor\.br|lel\.br|med\.br|mil\.br|net\.br|nom\.br|ntr\.br|odo\.br|org\.br|ppg\.br|pro\.br|psc\.br|psi\.br|rec\.br|slg\.br|tmp\.br|tur\.br|tv\.br|vet\.br|zlg\.br|br|ab\.ca|bc\.ca|mb\.ca|nb\.ca|nf\.ca|ns\.ca|nt\.ca|on\.ca|pe\.ca|qc\.ca|sk\.ca|yk\.ca|ca|cc|ac\.cn|net\.cn|com\.cn|edu\.cn|gov\.cn|org\.cn|bj\.cn|sh\.cn|tj\.cn|cq\.cn|he\.cn|nm\.cn|ln\.cn|jl\.cn|hl\.cn|js\.cn|zj\.cn|ah\.cn|gd\.cn|gx\.cn|hi\.cn|sc\.cn|gz\.cn|yn\.cn|xz\.cn|sn\.cn|gs\.cn|qh\.cn|nx\.cn|xj\.cn|tw\.cn|hk\.cn|mo\.cn|cn|cx|cz|de|dk|fo|com\.ec|tm\.fr|com\.fr|asso\.fr|presse\.fr|fr|gf|gs|co\.il|net\.il|ac\.il|k12\.il|gov\.il|muni\.il|ac\.in|co\.in|org\.in|ernet\.in|gov\.in|net\.in|res\.in|is|it|ac\.jp|co\.jp|go\.jp|or\.jp|ne\.jp|ac\.kr|co\.kr|go\.kr|ne\.kr|nm\.kr|or\.kr|li|lt|lu|asso\.mc|tm\.mc|com\.mm|org\.mm|net\.mm|edu\.mm|gov\.mm|ms|nl|no|nu|pl|ro|org\.ro|store\.ro|tm\.ro|firm\.ro|www\.ro|arts\.ro|rec\.ro|info\.ro|nom\.ro|nt\.ro|se|si|com\.sg|org\.sg|net\.sg|gov\.sg|sk|st|tf|ac\.th|co\.th|go\.th|mi\.th|net\.th|or\.th|tm|to|com\.tr|edu\.tr|gov\.tr|k12\.tr|net\.tr|org\.tr|com\.tw|org\.tw|net\.tw|ac\.uk|uk\.com|uk\.net|gb\.com|gb\.net|vg|sh|kz|ch|info|ua|gov|name|pro|ie|hk|com\.hk|org\.hk|net\.hk|edu\.hk|us|tk|cd|by|ad|lv|eu\.lv|bz|es|jp|cl|ag|mobi|eu|co\.nz|org\.nz|net\.nz|maori\.nz|iwi\.nz|io|la|md|sc|sg|vc|tw|travel|my|se|tv|pt|com\.pt|edu\.pt|asia|fi|com\.ve|net\.ve|fi|org\.ve|web\.ve|info\.ve|co\.ve|tel|im|gr|ru|net\.ru|org\.ru|hr|com\.hr|ly|xyz)$/);
}
function t(e, t) {
var i = e.charAt(0);
t = t.split(i);
return i === e ? t : t[(e = parseInt(e.substring(1), 10)) < 0 ? t.length + e : e - 1];
}
function i(e, t) {
for (var i, r = e.charAt(0), n = t.split("&"), a = [], s = {}, o = e.substring(1), f = 0, h = n.length; f < h; f++) if ("" !== (a = (a = n[f].match(/(.*?)=(.*)/)) || [ n[f], n[f], "" ])[1].replace(/\s/g, "")) {
if (a[2] = (i = a[2] || "", c.decodeURIComponent(i.replace(/\+/g, " "))), o === a[1]) return a[2];
(i = a[1].match(/(.*)\[([0-9]+)\]/)) ? (s[i[1]] = s[i[1]] || [], s[i[1]][i[2]] = a[2]) : s[a[1]] = a[2];
}
return r === e ? s : s[o];
}
return function(r, n) {
var a, s = {};
if ("tld?" === r) return e();
if (n = n || window.location.toString(), !r) return n;
if (r = r.toString(), n.match(/^mailto:([^/].+)/)) a = n.match(/^mailto:([^/].+)/), 
s.protocol = "mailto", s.email = a[1]; else {
if ((n = n.match(/(.*?)\/#!(.*)/) ? (a = n.match(/(.*?)\/#!(.*)/))[1] + a[2] : n).match(/(.*?)#(.*)/) && (a = n.match(/(.*?)#(.*)/), 
s.hash = a[2], n = a[1]), s.hash && r.match(/^#/)) return i(r, s.hash);
if (n.match(/(.*?)\?(.*)/) && (a = n.match(/(.*?)\?(.*)/), s.query = a[2], n = a[1]), 
s.query && r.match(/^\?/)) return i(r, s.query);
if (n.match(/(.*?):?\/\/(.*)/) && (a = n.match(/(.*?):?\/\/(.*)/), s.protocol = a[1].toLowerCase(), 
n = a[2]), n.match(/(.*?)(\/.*)/) && (a = n.match(/(.*?)(\/.*)/), s.path = a[2], 
n = a[1]), s.path = (s.path || "").replace(/^([^/])/, "/$1").replace(/\/$/, ""), 
(r = r.match(/^[-0-9]+$/) ? r.replace(/^([^/])/, "/$1") : r).match(/^\//)) return t(r, s.path.substring(1));
if ((a = (a = t("/-1", s.path.substring(1))) && a.match(/(.*?)\.(.*)/)) && (s.file = a[0], 
s.filename = a[1], s.fileext = a[2]), n.match(/(.*):([0-9]+)$/) && (a = n.match(/(.*):([0-9]+)$/), 
s.port = a[2], n = a[1]), n.match(/(.*?)@(.*)/) && (a = n.match(/(.*?)@(.*)/), s.auth = a[1], 
n = a[2]), s.auth && (a = s.auth.match(/(.*):(.*)/), s.user = a ? a[1] : s.auth, 
s.pass = a ? a[2] : void 0), s.hostname = n.toLowerCase(), "." === r.charAt(0)) return t(r, s.hostname);
e() && (a = s.hostname.match(e())) && (s.tld = a[3], s.domain = a[2] ? a[2] + "." + a[3] : void 0, 
s.sub = a[1] || void 0);
n = s.port ? ":" + s.port : "";
s.protocol = s.protocol || window.location.protocol.replace(":", ""), s.port = s.port || ("https" === s.protocol ? "443" : "80"), 
s.protocol = s.protocol || ("443" === s.port ? "https" : "http"), s.basic = s.protocol + "://" + s.hostname + n;
}
return r in s ? s[r] : "{}" === r ? s : "";
};
}(), c.createString = function(e) {
for (var t = e, i = Math.random().toString(36).substr(2); i.length < t; ) i += Math.random().toString(36).substr(2);
return i.substr(0, e);
}, c.createAesKey = function() {
return c.createString(16);
}, c.generateEncryptyData = function(e, t) {
if (void 0 !== t) {
var i = t.publicKey;
t = t.version;
if (void 0 !== i && void 0 !== t && "undefined" != typeof CryptoJS && "undefined" != typeof JSEncrypt) {
var r = c.createAesKey();
try {
var n = CryptoJS.enc.Utf8.parse(r), a = CryptoJS.enc.Utf8.parse(JSON.stringify(e)), s = c.isUndefined(CryptoJS.pad.Pkcs7) ? CryptoJS.pad.PKCS7 : CryptoJS.pad.Pkcs7, o = CryptoJS.AES.encrypt(a, n, {
mode: CryptoJS.mode.ECB,
padding: s
}).toString(), f = new JSEncrypt(), h = (f.setPublicKey(i), f.encrypt(r));
return !1 === h ? (v.warn("Encryption failed, return the original data"), e) : {
pkv: t,
ekey: h,
payload: o
};
} catch (e) {
v.warn("Encryption failed, return the original data: " + e);
}
}
}
return e;
}, c.getUtm = function() {
var e = {};
return c.each(m, function(t) {
try {
var i = c.getQueryParam(location.href, t);
i.length && (e[t] = i);
} catch (t) {
v.warn("get utm fail: " + t);
}
}), JSON.stringify(e);
}, c.getQueryParam = function(e, t) {
t = t.replace(/[\[]/, "\\[").replace(/[\]]/, "\\]"), e = c.decodeURIComponent(e);
return null === (t = new RegExp("[\\?&]" + t + "=([^&#]*)").exec(e)) || t && "string" != typeof t[1] && t[1].length ? "" : c.decodeURIComponent(t[1]);
}, c.getUtmFromQuery = function(e) {
var t = {};
return c.each(m, function(i) {
e[i] && (t[i] = e[i]);
}), JSON.stringify(t);
}, c.indexOf = function(e, t) {
var i = e.indexOf;
if (i) return i.call(e, t);
for (var r = 0; r < e.length; r++) if (t === e[r]) return r;
return -1;
}, c.checkCalibration = function(e) {
return e;
}, "object" === i(v) ? v : {}), y = (v.info = function() {
if ("object" === ("undefined" == typeof console ? "undefined" : i(console)) && console.log && v.enabled) try {
return console.log.apply(console, arguments);
} catch (e) {
console.log(arguments[0]);
}
}, v.warn = function() {
if ("object" === ("undefined" == typeof console ? "undefined" : i(console)) && console.log && v.enabled) try {
return console.warn.apply(console, arguments);
} catch (e) {
console.warn(arguments[0]);
}
}, function() {
function e() {
r(this, e), this.config = {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_mg"
};
}
return a(e, [ {
key: "getConfig",
value: function() {
return this.config;
}
}, {
key: "getStorage",
value: function(e, t, i) {
e = localStorage.getItem(e);
if (!t) return c.isJSONString(e) ? JSON.parse(e) : {};
c.isJSONString(e) ? i(JSON.parse(e)) : i({});
}
}, {
key: "setStorage",
value: function(e, t) {
localStorage.setItem(e, t);
}
}, {
key: "removeStorage",
value: function(e) {
localStorage.removeItem(e);
}
}, {
key: "_setSystemProxy",
value: function(e) {
this._sysCallback = e;
}
}, {
key: "getSystemInfo",
value: function(e) {
var t = {
mp_platform: "web",
system: this._getOs(),
screenWidth: window.screen.width,
screenHeight: window.screen.height,
systemLanguage: navigator.language
};
this._sysCallback && (t = c.extend(t, this._sysCallback(e))), e.success(t), e.complete();
}
}, {
key: "_getOs",
value: function() {
var e = navigator.userAgent;
return /Windows/i.test(e) ? /Phone/.test(e) || /WPDesktop/.test(e) ? "Windows Phone" : "Windows" : /(iPhone|iPad|iPod)/.test(e) ? "iOS" : /Android/.test(e) ? "Android" : /(BlackBerry|PlayBook|BB10)/i.test(e) ? "BlackBerry" : /Mac/i.test(e) ? "MacOS" : /Linux/.test(e) ? "Linux" : /CrOS/.test(e) ? "ChromeOS" : "";
}
}, {
key: "getNetworkType",
value: function(e) {
e.complete();
}
}, {
key: "onNetworkStatusChange",
value: function() {}
}, {
key: "request",
value: function(e) {
var t = {}, i = new XMLHttpRequest();
if (i.open(e.method, e.url), e.header) for (var r in e.header) i.setRequestHeader(r, e.header[r]);
return i.onreadystatechange = function() {
4 === i.readyState && 200 === i.status ? (t.statusCode = 200, c.isJSONString(i.responseText) && (t.data = JSON.parse(i.responseText)), 
e.success(t)) : 200 !== i.status && (t.errMsg = "network error", e.fail(t));
}, i.ontimeout = function() {
t.errMsg = "timeout", e.fail(t);
}, i.send(e.data), i;
}
}, {
key: "initAutoTrackInstance",
value: function(e, t) {
this.instance = e, this.autoTrack = t.autoTrack;
var i = this;
"onpagehide" in window ? window.onpagehide = function() {
i.onPageHide(!0);
} : window.onbeforeunload = function() {
i.onPageHide(!0);
}, i.onPageShow(), i.autoTrack.appHide && i.instance.timeEvent("ta_page_hide"), 
"onvisibilitychange" in document && (document.onvisibilitychange = function() {
document.hidden ? i.onPageHide(!1) : (i.onPageShow(), i.autoTrack.appHide && i.instance.timeEvent("ta_page_hide"));
});
}
}, {
key: "setGlobal",
value: function(e, t) {
window[t] = e;
}
}, {
key: "getAppOptions",
value: function() {}
}, {
key: "showToast",
value: function() {}
}, {
key: "onPageShow",
value: function() {
var e;
this.autoTrack.appShow && (c.extend(e = {}, this.autoTrack.properties), c.isFunction(this.autoTrack.callback) && c.extend(e, this.autoTrack.callback("appShow")), 
this.instance._internalTrack("ta_page_show", e));
}
}, {
key: "onPageHide",
value: function(e) {
var t;
this.autoTrack.appHide && (c.extend(t = {}, this.autoTrack.properties), c.isFunction(this.autoTrack.callback) && c.extend(t, this.autoTrack.callback("appHide")), 
this.instance._internalTrack("ta_page_hide", t, new Date(), null, e));
}
} ], [ {
key: "createInstance",
value: function() {
return new e();
}
} ]), e;
}()), _ = function() {
function e(t, i) {
r(this, e), this.taInstance = t, this.config = i || {}, this.referrer = "Directly open", 
this.config.isPlugin ? (t.App = function() {
App.apply(this, arguments);
}, inension(t.Page)) : (i = App, App = this._initAppExtention(i), t = Page, Page = this._initPageExtension(t));
}
return a(e, [ {
key: "_initPageExtension",
value: function(e) {
var t = this;
return function(i) {
var r = i.onShow, n = i.onShareAppMessage;
return i.onShow = function(e) {
t.onPageShow(), "function" == typeof r && r.call(this, e);
}, "function" == typeof n && (i.onShareAppMessage = function(e) {
e = n.call(this, e);
return t.onPageShare(e);
}), e(i);
};
}
}, {
key: "_initAppExtention",
value: function(e) {
var t = this;
return function(i) {
var r = i.onLaunch, n = i.onShow, a = i.onHide;
return i.onLaunch = function(e) {
t.onAppLaunch(e, this), "function" == typeof r && r.call(this, e);
}, i.onShow = function(e) {
t.onAppShow(e), "function" == typeof n && n.call(this, e);
}, i.onHide = function() {
t.onAppHide(), "function" == typeof a && a.call(this);
}, e(i);
};
}
}, {
key: "onAppLaunch",
value: function(e, t) {
this._setAutoTrackProperties(e), c.isUndefined(t) || (t[this.taInstance.name] = this.taInstance), 
this.config.appLaunch && (t = {}, e && e.path && (t["#url_path"] = this._getPath(e.path)), 
e && e.query && (t["#utm"] = c.getUtmFromQuery(e.query)), this.taInstance._internalTrack("ta_mp_launch", t));
}
}, {
key: "onAppShow",
value: function(e) {
var t;
this.config.appHide && this.taInstance.timeEvent("ta_mp_hide"), this._setAutoTrackProperties(e), 
this.config.appShow && (t = {}, e && e.path && (t["#url_path"] = this._getPath(e.path)), 
e && e.query && (t["#utm"] = c.getUtmFromQuery(e.query)), c.extend(t, this.config.properties), 
c.isFunction(this.config.callback) && c.extend(t, this.config.callback("appShow")), 
this.taInstance._internalTrack("ta_mp_show", t));
}
}, {
key: "onAppHide",
value: function() {
var e;
this.config.appHide && (e = {
"#url_path": this._getCurrentPath()
}, c.extend(e, this.config.properties), c.isFunction(this.config.callback) && c.extend(e, this.config.callback("appHide")), 
this.taInstance._internalTrack("ta_mp_hide", e));
}
}, {
key: "_getCurrentPath",
value: function() {
var e = "Not to get";
try {
var t = getCurrentPages();
e = t[t.length - 1].route;
} catch (e) {
v.info(e);
}
return e;
}
}, {
key: "_setAutoTrackProperties",
value: function(e) {
e = {
"#scene": e.scene
};
this.taInstance._setAutoTrackProperties(e);
}
}, {
key: "_getPath",
value: function(e) {
return "string" == typeof e ? e.replace(/^\//, "") : "Abnormal values";
}
}, {
key: "onPageShare",
value: function(e) {
return this.config.pageShare && this.taInstance._internalTrack("ta_mp_share", {
"#url_path": this._getCurrentPath()
}), c.isObject(e) ? e : {};
}
}, {
key: "onPageShow",
value: function() {
var e, t;
this.config.pageShow && (t = {
"#url_path": (e = this._getCurrentPath()) || "The system did not get a value",
"#referrer": this.referrer
}, this.referrer = e, this.taInstance._internalTrack("ta_mp_view", t));
}
} ]), e;
}(), w = function() {
function e(t, i, n) {
var a = this;
t = (r(this, e), this.taInstance = t, this.config = i || {}, n.getLaunchOptionsSync());
this._onShow(t), this.startTracked = !0, n.onShow(function(e) {
a._onShow(e);
}), n.onHide(function() {
var e;
a.startTracked = !1, a.config.appHide && (c.extend(e = {}, a.config.properties), 
c.isFunction(a.config.callback) && c.extend(e, a.config.callback("appHide")), a.taInstance._internalTrack("ta_mg_hide", e));
});
}
return a(e, [ {
key: "_onShow",
value: function(e) {
this.startTracked || (this.config.appHide && this.taInstance.timeEvent("ta_mg_hide"), 
e && e.scene && this.taInstance._setAutoTrackProperties({
"#scene": e.scene
}), this.config.appShow && (c.extend(e = {}, this.config.properties), c.isFunction(this.config.callback) && c.extend(e, this.config.callback("appShow")), 
this.taInstance._internalTrack("ta_mg_show", e)));
}
} ]), e;
}(), S = function() {
function e(t, i, n) {
r(this, e), this.api = t, this.config = i, this._config = n;
}
return a(e, [ {
key: "getConfig",
value: function() {
return this.config;
}
}, {
key: "getStorage",
value: function(e, t, i) {
if (!t) return "dd_mp" === this._config.platform ? (t = this.api.getStorageSync({
key: e
}), c.isJSONString(t.data) ? JSON.parse(t.data) : {}) : (t = this.api.getStorageSync(e), 
c.isJSONString(t) ? JSON.parse(t) : {});
this.api.getStorage({
key: e,
success: function(e) {
e = c.isJSONString(e.data) ? JSON.parse(e.data) : {};
i(e);
},
fail: function() {
v.warn("getStorage faild"), i({});
}
});
}
}, {
key: "setStorage",
value: function(e, t) {
this.api.setStorage({
key: e,
data: t
});
}
}, {
key: "removeStorage",
value: function(e) {
c.isFunction(this.api.removeStorage) ? this.api.removeStorage({
key: e
}) : c.isFunction(this.api.deleteStorage) && this.api.deleteStorage({
key: e
});
}
}, {
key: "_getPlatform",
value: function() {
return "";
}
}, {
key: "getSystemInfo",
value: function(e) {
var t = this._config.mpPlatform;
this.api.getSystemInfo({
success: function(i) {
c.isFunction(t) ? i.mp_platform = t(i) : i.mp_platform = t, e.success(i), "wechat" === t && e.complete();
},
complete: function() {
e.complete();
}
});
}
}, {
key: "getNetworkType",
value: function(e) {
c.isFunction(this.api.getNetworkType) ? this.api.getNetworkType({
success: function(t) {
e.success(t);
},
complete: function() {
e.complete();
}
}) : (e.success({}), e.complete());
}
}, {
key: "onNetworkStatusChange",
value: function(e) {
c.isFunction(this.api.onNetworkStatusChange) ? this.api.onNetworkStatusChange(e) : e({});
}
}, {
key: "request",
value: function(e) {
var t;
return "ali_mp" === this._config.platform || "dd_mp" === this._config.platform ? ((t = c.extend({}, e)).headers = e.header, 
t.success = function(t) {
t.statusCode = t.status, e.success(t);
}, t.fail = function(t) {
t.errMsg = t.errorMessage, e.fail(t);
}, "dd_mp" === this._config.platform ? this.api.httpRequest(t) : this.api.request(t)) : this.api.request(e);
}
}, {
key: "initAutoTrackInstance",
value: function(e, t) {
return c.isObject(t.autoTrack) && (t.autoTrack.isPlugin = t.is_plugin), new (this._config.mp ? _ : w)(e, t.autoTrack, this.api);
}
}, {
key: "setGlobal",
value: function(e, t) {
this._config.mp ? v.warn("ThinkingAnalytics: we do not set global name for TA instance when you do not enable auto track.") : GameGlobal[t] = e;
}
}, {
key: "getAppOptions",
value: function(e) {
var t = {};
try {
t = this.api.getLaunchOptionsSync();
} catch (e) {
v.warn("Cannot get launch options.");
}
if (c.isFunction(e)) try {
this._config.mp ? this.api.onAppShow(e) : this.api.onShow(e);
} catch (e) {
v.warn("Cannot register onShow callback.");
}
return t;
}
}, {
key: "showToast",
value: function(e) {
var t;
c.isFunction(this.api.showToast) && (t = {
title: e
}, "dd_mp" !== this._config.platform && "ali_mp" !== this._config.platform || (t.content = e), 
this.api.showToast(t));
}
} ], [ {
key: "createInstance",
value: function() {
return this._createInstance("R_CURRENT_PLATFORM");
}
}, {
key: "_createInstance",
value: function(t) {
switch (t) {
case "wechat_mp":
return new e(wx, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_wechat"
}, {
mpPlatform: "wechat",
mp: !0,
platform: t
});

case "wechat_mg":
return new e(wx, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_wechat_game"
}, {
mpPlatform: "wechat",
platform: t
});

case "qq_mp":
return new e(qq, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qq"
}, {
mpPlatform: "qq",
mp: !0,
platform: t
});

case "qq_mg":
return new e(qq, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qq_game"
}, {
mpPlatform: "qq",
platform: t
});

case "baidu_mp":
return new e(swan, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_swan"
}, {
mpPlatform: function(e) {
return e.host;
},
mp: !0,
platform: t
});

case "baidu_mg":
return new e(swan, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_swan_game"
}, {
mpPlatform: function(e) {
return e.host;
},
platform: t
});

case "tt_mg":
return new e(tt, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_tt_game"
}, {
mpPlatform: function(e) {
return e.appName;
},
platform: t
});

case "tt_mp":
return new e(tt, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_tt"
}, {
mpPlatform: function(e) {
return e.appName;
},
mp: !0,
platform: t
});

case "ali_mp":
return new e(my, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_ali"
}, {
mpPlatform: function(e) {
return e.app;
},
mp: !0,
platform: t
});

case "dd_mp":
return new e(dd, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_dd"
}, {
mpPlatform: "dingding",
mp: !0,
platform: t
});

case "bl_mg":
return new e(bl, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_mg"
}, {
mpPlatform: "bilibili",
platform: t
});

case "kuaishou_mp":
return new e(ks, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_kuaishou"
}, {
mpPlatform: "kuaishou",
mp: !0,
platform: t
});

case "qh360_mg":
return new e(qh, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qh360"
}, {
mpPlatform: "qh360",
platform: t
});

case "tb_mp":
return new e(my, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_tb"
}, {
mpPlatform: "tb",
mp: !0,
platform: t
});

case "jd_mp":
return new e(jd, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_jd"
}, {
mpPlatform: "jd",
mp: !0,
platform: t
});

case "qh360_mp":
return new e(qh, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qh360"
}, {
mpPlatform: "qh360",
mp: !0,
platform: t
});

case "WEB":
return new y.createInstance();
}
}
} ]), e;
}(), k = a(function e(t, i) {
var n = this;
r(this, e), this.taInstance = t, this.config = i || {}, this.config.appShow && this.taInstance._internalTrack("ta_mg_show"), 
this.config.appHide && this.taInstance.timeEvent("ta_mg_hide"), qg.onShow(function() {
var e;
n.config.appHide && n.taInstance.timeEvent("ta_mg_hide"), n.config.appShow && (c.extend(e = {}, n.config.properties), 
c.isFunction(n.config.callback) && c.extend(e, n.config.callback("appShow")), n.taInstance._internalTrack("ta_mg_show"));
}), qg.onHide(function() {
var e;
n.config.appHide && (c.extend(e = {}, n.config.properties), c.isFunction(n.config.callback) && c.extend(e, n.config.callback("appHide")), 
n.taInstance._internalTrack("ta_mg_hide"));
});
}), M = function() {
function e() {
r(this, e), this.config = {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qg_vivo_game",
asyncPersistence: !0
};
}
return a(e, [ {
key: "getConfig",
value: function() {
return this.config || {};
}
}, {
key: "getStorage",
value: function(e, t, i) {
if (!t) return t = qg.getStorageSync({
key: e
}), c.isJSONString(t) ? JSON.parse(t) : {};
qg.getStorage({
key: e,
success: function(e) {
e = c.isJSONString(e) ? JSON.parse(e) : {};
i(e);
},
fail: function() {
i({});
}
});
}
}, {
key: "setStorage",
value: function(e, t) {
qg.setStorage({
key: e,
value: t
});
}
}, {
key: "removeStorage",
value: function(e) {
qg.deleteStorage({
key: e
});
}
}, {
key: "getSystemInfo",
value: function(e) {
qg.getSystemInfo({
success: function(t) {
var i = t, r = [ t.osType, t.osVersionName ].join(" ");
i.brand = t.manufacturer, i.system = r, i.mp_platform = "vivo_qg", e.success(i);
},
complete: function() {
e.complete();
}
});
}
}, {
key: "getNetworkType",
value: function(e) {
qg.getNetworkType({
success: function(t) {
var i = t;
i.networkType = t.type, e.success(i);
},
complete: function() {
e.complete();
}
});
}
}, {
key: "onNetworkStatusChange",
value: function(e) {
qg.subscribeNetworkStatus({
callback: function(t) {
var i = t;
i.networkType = t.type, e(i);
}
});
}
}, {
key: "request",
value: function(e) {
return qg.request({
url: e.url,
data: e.data,
method: e.method,
header: e.header,
success: function(t) {
e.success(t);
},
fail: function(t) {
e.fail(t);
}
});
}
}, {
key: "initAutoTrackInstance",
value: function(e, t) {
return new k(e, t.autoTrack);
}
}, {
key: "setGlobal",
value: function(e, t) {
globalThis[t] = e;
}
}, {
key: "getAppOptions",
value: function() {
return {};
}
}, {
key: "showToast",
value: function(e) {
qg.showToast({
message: e,
duration: 0
});
}
} ], [ {
key: "createInstance",
value: function() {
return new e();
}
} ]), e;
}(), A = a(function e(t, i, n) {
var a = this;
r(this, e), this.taInstance = t, this.config = i || {}, this.config.appShow && (c.extend(t = {}, this.config.properties), 
c.isFunction(this.config.callback) && c.extend(t, this.config.callback("appShow")), 
this.taInstance._internalTrack("ta_mg_show", t)), this.config.appHide && this.taInstance.timeEvent("ta_mg_hide"), 
n.onShow(function() {
var e;
a.config.appHide && a.taInstance.timeEvent("ta_mg_hide"), a.config.appShow && (c.extend(e = {}, a.config.properties), 
c.isFunction(a.config.callback) && c.extend(e, a.config.callback("appShow")), a.taInstance._internalTrack("ta_mg_show", e));
}), n.onHide(function() {
var e;
a.config.appHide && (c.extend(e = {}, a.config.properties), c.isFunction(a.config.callback) && c.extend(e, a.config.callback("appHide")), 
a.taInstance._internalTrack("ta_mg_hide", e));
});
}), I = function() {
function e(t, i, n) {
r(this, e), this.api = t, this.config = i, this._config = n;
}
return a(e, [ {
key: "getConfig",
value: function() {
return this.config || {};
}
}, {
key: "getStorage",
value: function(e, t, i) {
e = localStorage.getItem(e);
if (!t) return c.isJSONString(e) ? JSON.parse(e) : {};
c.isJSONString(e) ? i(JSON.parse(e)) : i({});
}
}, {
key: "setStorage",
value: function(e, t) {
localStorage.setItem(e, t);
}
}, {
key: "removeStorage",
value: function(e) {
localStorage.removeItem(e);
}
}, {
key: "getSystemInfo",
value: function(e) {
var t = this._config.mpPlatform;
this.api.getSystemInfo({
success: function(i) {
i.mp_platform = t, e.success(i);
},
complete: function() {
e.complete();
}
});
}
}, {
key: "getNetworkType",
value: function(e) {
this.api.getNetworkType({
success: function(t) {
e.success(t);
},
complete: function() {
e.complete();
}
});
}
}, {
key: "onNetworkStatusChange",
value: function(e) {
this.api.onNetworkStatusChange({
callback: function(t) {
e(t);
}
});
}
}, {
key: "request",
value: function(e) {
var t = {}, i = new XMLHttpRequest();
if (i.open(e.method, e.url), e.header) for (var r in e.header) i.setRequestHeader(r, e.header[r]);
return i.onreadystatechange = function() {
4 === i.readyState && 200 === i.status ? (t.statusCode = 200, c.isJSONString(i.responseText) && (t.data = JSON.parse(i.responseText)), 
e.success(t)) : 200 !== i.status && (t.errMsg = "network error", e.fail(t));
}, i.ontimeout = function() {
t.errMsg = "timeout", e.fail(t);
}, i.send(e.data), i;
}
}, {
key: "initAutoTrackInstance",
value: function(e, t) {
return new A(e, t.autoTrack, this.api);
}
}, {
key: "setGlobal",
value: function(e, t) {
globalThis[t] = e;
}
}, {
key: "getAppOptions",
value: function() {
return this.api.getLaunchOptionsSync();
}
}, {
key: "showToast",
value: function(e) {
this.api.showToast({
title: e,
icon: "none",
duration: 2e3
});
}
} ], [ {
key: "createInstance",
value: function() {
return this._createInstance("R_CURRENT_PLATFORM");
}
}, {
key: "_createInstance",
value: function(t) {
switch (t) {
case "oppo":
return new e(qg, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qg_oppo_game"
}, {
mpPlatform: "oppo_qg"
});

case "huawei":
return new e(hbs, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qg_huawei_game"
}, {
mpPlatform: "huawei_qg"
});

case "mz":
return new e(qg, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qg_mz_game"
}, {
mpPlatform: "mz"
});

case "xiaomi":
return new e(qg, {
persistenceName: "thinkingdata",
persistenceNameOld: "thinkingdata_qg"
}, {
mpPlatform: "xiaomi"
});
}
}
} ]), e;
}(), E = function() {
function e() {
r(this, e);
}
return a(e, null, [ {
key: "createInstance",
value: function() {
var e, t = Object.freeze({
WECHAT_GAME: 104,
QQ_PLAY: 105,
BAIDU_GAME: 107,
VIVO_GAME: 108,
OPPO_GAME: 109,
HUAWEI_GAME: 110,
XIAOMI_GAME: 111,
BYTEDANCE_GAME: 117,
QTT_GAME: 116,
LINKSURE: 119,
WECHAT_MINI_GAME: "WECHAT_GAME",
BAIDU_MINI_GAME: "BAIDU_MINI_GAME",
XIAOMI_QUICK_GAME: "XIAOMI_QUICK_GAME",
OPPO_MINI_GAME: "OPPO_MINI_GAME",
VIVO_MINI_GAME: "VIVO_MINI_GAME",
HUAWEI_QUICK_GAME: "HUAWEI_QUICK_GAME",
BYTEDANCE_MINI_GAME: "BYTEDANCE_MINI_GAME",
QTT_MINI_GAME: "QTT_MINI_GAME",
LINKSURE_MINI_GAME: "LINKSURE_MINI_GAME"
});
return cc.sys.platform === t.WECHAT_GAME || cc.sys.platform === t.WECHAT_MINI_GAME ? S._createInstance("wechat_mg") : cc.sys.platform === t.BAIDU_GAME || cc.sys.platform === t.BAIDU_MIN_GAME ? S._createInstance("baidu_mg") : cc.sys.platform === t.VIVO_GAME || cc.sys.platform === t.VIVO_MINI_GAME ? M.createInstance() : cc.sys.platform === t.QQ_PLAY ? S._createInstance("qq_mg") : cc.sys.platform === t.OPPO_GAME || cc.sys.platform === t.OPPO_MINI_GAME ? I._createInstance("oppo") : cc.sys.platform === t.HUAWEI_GAME || cc.sys.platform === t.HUAWEI_QUICK_GAME ? I._createInstance("huawei") : cc.sys.platform === t.XIAOMI_GAME || cc.sys.platform === t.XIAOMI_QUICK_GAME ? I._createInstance("xiaomi") : cc.sys.platform === t.BYTEDANCE_GAME || cc.sys.platform === t.BYTEDANCE_MINI_GAME ? S._createInstance("tt_mg") : ((e = y.createInstance())._sysCallback = function() {
return {
system: cc.sys.os.replace(" ", "") + " " + cc.sys.osVersion
};
}, e.getNetworkType = function(e) {
var t = {};
switch (cc.sys.getNetworkType()) {
case cc.sys.NetworkType.LAN:
t.networkType = "WIFI";
break;

case cc.sys.NetworkType.WWAN:
t.networkType = "WWAN";
break;

default:
t.networkType = "NONE";
}
e.success(t), e.complete();
}, e.getSystemInfo = function(t) {
var i = {
mp_platform: cc.sys.platform.toString(),
system: e._getOs(),
screenWidth: window.screen.width,
screenHeight: window.screen.height
};
e._sysCallback && (i = c.extend(i, e._sysCallback(t))), t.success(i), t.complete();
}, e);
}
} ]), e;
}(), P = function() {
function e() {
r(this, e);
}
return a(e, null, [ {
key: "_getCurrentPlatform",
value: function() {
return this.currentPlatform || (this.currentPlatform = E.createInstance());
}
}, {
key: "getConfig",
value: function() {
return this._getCurrentPlatform().getConfig();
}
}, {
key: "getStorage",
value: function(e, t, i) {
return this._getCurrentPlatform().getStorage(e, t, i);
}
}, {
key: "setStorage",
value: function(e, t) {
return this._getCurrentPlatform().setStorage(e, t);
}
}, {
key: "removeStorage",
value: function(e) {
return this._getCurrentPlatform().removeStorage(e);
}
}, {
key: "getSystemInfo",
value: function(e) {
return this._getCurrentPlatform().getSystemInfo(e);
}
}, {
key: "getNetworkType",
value: function(e) {
return this._getCurrentPlatform().getNetworkType(e);
}
}, {
key: "onNetworkStatusChange",
value: function(e) {
this._getCurrentPlatform().onNetworkStatusChange(e);
}
}, {
key: "request",
value: function(e) {
return this._getCurrentPlatform().request(e);
}
}, {
key: "initAutoTrackInstance",
value: function(e, t) {
return this._getCurrentPlatform().initAutoTrackInstance(e, t);
}
}, {
key: "setGlobal",
value: function(e, t) {
e && t && this._getCurrentPlatform().setGlobal(e, t);
}
}, {
key: "getAppOptions",
value: function(e) {
return this._getCurrentPlatform().getAppOptions(e);
}
}, {
key: "showDebugToast",
value: function(e) {
this._getCurrentPlatform().showToast(e);
}
} ]), e;
}(), C = /^[a-zA-Z][a-zA-Z0-9_]{0,49}$/, x = function() {
function e() {
r(this, e);
}
return a(e, null, [ {
key: "stripProperties",
value: function(e) {
return c.isObject(e) && c.each(e, function(e, t) {
c.isString(e) || c.isNumber(e) || c.isDate(e) || c.isBoolean(e) || c.isArray(e) || c.isObject(e) || v.warn("Your data -", t, e, "- format does not meet requirements and may not be stored correctly. Attribute values only support String, Number, Date, Boolean, Array, Object");
}), e;
}
}, {
key: "_checkPropertiesKey",
value: function(e) {
var t = !0;
return c.each(e, function(e, i) {
C.test(i) || (v.warn("Invalid KEY: " + i), t = !1);
}), t;
}
}, {
key: "event",
value: function(e) {
return !(!c.isString(e) || !C.test(e)) || (v.warn("Check the parameter format. The eventName must start with an English letter and contain no more than 50 characters including letters, digits, and underscores: " + e), 
!1);
}
}, {
key: "propertyName",
value: function(e) {
return !(!c.isString(e) || !C.test(e)) || (v.warn("Check the parameter format. PropertyName must start with a letter and contain letters, digits, and underscores (_). The value is a string of no more than 50 characters: " + e), 
!1);
}
}, {
key: "properties",
value: function(e) {
return this.stripProperties(e), !(e && (c.isObject(e) ? !this._checkPropertiesKey(e) && (v.warn("Check the parameter format. The properties key must start with a letter, contain digits, letters, and underscores (_), and contain a maximum of 50 characters"), 
1) : (v.warn("properties can be none, but it must be an object"), 1)));
}
}, {
key: "propertiesMust",
value: function(e) {
return this.stripProperties(e), void 0 === e || !c.isObject(e) || c.isEmptyObject(e) ? (v.warn("properties must be an object with a value"), 
!1) : !!this._checkPropertiesKey(e) || (v.warn("Check the parameter format. The properties key must start with a letter, contain digits, letters, and underscores (_), and contain a maximum of 50 characters"), 
!1);
}
}, {
key: "userId",
value: function(e) {
return !(!c.isString(e) || !/^.{1,64}$/.test(e)) || (v.warn("The user ID must be a string of less than 64 characters and cannot be null"), 
!1);
}
}, {
key: "userAddProperties",
value: function(e) {
if (!this.propertiesMust(e)) return !1;
for (var t in e) if (!c.isNumber(e[t])) return v.warn("The attributes of userAdd need to be Number"), 
!1;
return !0;
}
}, {
key: "userAppendProperties",
value: function(e) {
if (!this.propertiesMust(e)) return !1;
for (var t in e) if (!c.isArray(e[t])) return v.warn("The attribute of userAppend must be Array"), 
!1;
return !0;
}
} ]), e;
}(), O = function() {
function e(t, i, n, a, s) {
r(this, e), this.data = t, this.serverUrl = i, this.callback = s, this.tryCount = c.isNumber(n) ? n : 1, 
this.timeout = c.isNumber(a) ? a : 3e3, this.taClassName = "HttpTask";
}
return a(e, [ {
key: "run",
value: function() {
var e = this, t = c.createExtraHeaders(), i = (t["content-type"] = "application/json", 
P.request({
url: this.serverUrl,
method: "POST",
data: this.data,
header: t,
success: function(t) {
e.onSuccess(t);
},
fail: function(t) {
e.onFailed(t);
}
}));
setTimeout(function() {
(c.isObject(i) || c.isPromise(i)) && c.isFunction(i.abort) && i.abort();
}, this.timeout);
}
}, {
key: "onSuccess",
value: function(e) {
if (200 === e.statusCode) {
var t;
switch (e.data.code) {
case 0:
t = "success";
break;

case -1:
t = "invalid data";
break;

case -2:
t = "invalid APP ID";
break;

default:
t = "Unknown return code";
}
this.callback({
code: e.data.code,
msg: t
});
} else this.callback({
code: -3,
msg: e.statusCode
});
}
}, {
key: "onFailed",
value: function(e) {
0 < --this.tryCount ? this.run() : this.callback({
code: -3,
msg: e.errMsg
});
}
} ]), e;
}(), N = function() {
function e(t, i, n, a, s, o, f) {
r(this, e), this.data = t, this.serverDebugUrl = i, this.callback = f, this.tryCount = c.isNumber(n) ? n : 1, 
this.timeout = c.isNumber(a) ? a : 3e3, this.dryrun = s, this.deviceId = o, this.taClassName = "HttpTaskDebug";
}
return a(e, [ {
key: "run",
value: function() {
var e = this, t = "appid=" + this.data["#app_id"] + "&source=client&dryRun=" + this.dryrun + "&deviceId=" + this.deviceId + "&data=" + encodeURIComponent(JSON.stringify(this.data.data[0])), i = c.createExtraHeaders(), r = (i["content-type"] = "application/x-www-form-urlencoded", 
P.request({
url: this.serverDebugUrl,
method: "POST",
data: t,
header: i,
success: function(t) {
e.onSuccess(t);
},
fail: function(t) {
e.onFailed(t);
}
}));
setTimeout(function() {
(c.isObject(r) || c.isPromise(r)) && c.isFunction(r.abort) && r.abort();
}, this.timeout);
}
}, {
key: "onSuccess",
value: function(e) {
if (200 === e.statusCode) {
var t;
if (0 === e.data.errorLevel) t = "Verify data success."; else if (1 === e.data.errorLevel) {
for (var i = e.data.errorProperties, r = "", n = 0; n < i.length; n++) {
var a = i[n].errorReason;
r = r + " propertyName:" + i[n].propertyName + " errorReasons:" + a + "\n";
}
t = "Debug data error. errorLevel:" + e.data.errorLevel + " reason:" + r;
} else 2 !== e.data.errorLevel && -1 !== e.data.errorLevel || (t = "Debug data error. errorLevel:" + e.data.errorLevel + " reason:" + e.data.errorReasons);
v.info(t), this.callback({
code: e.data.errorLevel,
msg: t
});
} else this.callback({
code: -3,
msg: e.statusCode
});
}
}, {
key: "onFailed",
value: function(e) {
0 < --this.tryCount ? this.run() : this.callback({
code: -3,
msg: e.errMsg
});
}
} ]), e;
}(), T = new (function() {
function e() {
r(this, e), this.items = [], this.isRunning = !1, this.showDebug = !1;
}
return a(e, [ {
key: "enqueue",
value: function(e, t, i) {
var r = !(3 < arguments.length && void 0 !== arguments[3]) || arguments[3], n = this;
e = "debug" === i.debugMode ? new N(e, t, i.maxRetries, i.sendTimeout, 0, i.deviceId, function(e) {
n.isRunning = !1, c.isFunction(i.callback) && i.callback(e), n._runNext(), !1 !== n.showDebug || 0 !== e.code && 1 !== e.code && 2 !== e.code || (n.showDebug = !0, 
c.isFunction(P.showDebugToast) && P.showDebugToast("The current mode is Debug"));
}) : "debugOnly" === i.debugMode ? new N(e, t, i.maxRetries, i.sendTimeout, 1, i.deviceId, function(e) {
n.isRunning = !1, c.isFunction(i.callback) && i.callback(e), n._runNext(), !1 !== n.showDebug || 0 !== e.code && 1 !== e.code && 2 !== e.code || (n.showDebug = !0, 
c.isFunction(P.showDebugToast) && P.showDebugToast("The current mode is debugOnly"));
}) : new O(JSON.stringify(e), t, i.maxRetries, i.sendTimeout, function(e) {
n.isRunning = !1, c.isFunction(i.callback) && i.callback(e), n._runNext();
});
!0 === r ? (this.items.push(e), this._runNext()) : e.run();
}
}, {
key: "_dequeue",
value: function() {
return this.items.shift();
}
}, {
key: "_runNext",
value: function() {
if (0 < this.items.length && !this.isRunning) if (this.isRunning = !0, "HttpTask" !== this.items[0].taClassName) this._dequeue().run(); else {
var e = this.items.splice(0, this.items.length), t = e[0], i = JSON.parse(t.data), r = i["#app_id"], n = [];
n.push(t.callback);
for (var a = 1; a < e.length; a++) {
var s = e[a], o = JSON.parse(s.data);
o["#app_id"] === r && t.serverUrl === s.serverUrl ? (i.data = i.data.concat(o.data), 
n.push(s.callback)) : this.items.push(s);
}
var c = new Date().getTime();
i["#flush_time"] = c, new O(JSON.stringify(i), t.serverUrl, t.tryCount, t.timeout, function(e) {
for (var t in n) Object.hasOwnProperty.call(n, t) && (0, n[t])(e);
}).run();
}
}
} ]), e;
}())(), j = {
name: "thinkingdata",
is_plugin: !1,
maxRetries: 3,
sendTimeout: 3e3,
enablePersistence: !0,
asyncPersistence: !1,
enableLog: !0,
strict: !1,
debugMode: "none",
enableCalibrationTime: !1
}, D = {
properties: {
"#lib": "MG",
"#lib_version": "2.2.1"
},
initDeviceId: function(e) {
c.isString(e) && (this.properties["#device_id"] = e);
},
getSystemInfo: function(e) {
var t = this;
P.onNetworkStatusChange(function(e) {
t.properties["#network_type"] = e.networkType;
}), P.getNetworkType({
success: function(e) {
t.properties["#network_type"] = e.networkType;
},
complete: function() {
P.getSystemInfo({
success: function(e) {
v.info(JSON.stringify(e, null, 4));
var i = e.system ? e.system.replace(/\s+/g, " ").split(" ") : [];
i = {
"#manufacturer": e.brand,
"#device_model": e.model,
"#screen_width": Number(e.screenWidth),
"#screen_height": Number(e.screenHeight),
"#os": i[0],
"#os_version": i[1],
"#mp_platform": e.mp_platform,
"#system_language": e.systemLanguage
};
c.extend(t.properties, i), c.setMpPlatform(e.mp_platform);
},
complete: function() {
e();
}
});
}
});
}
}, R = function() {
function e(t, i) {
var n = this;
r(this, e), this.enabled = t.enablePersistence, this.enabled ? (t.isChildInstance ? (this.name = t.persistenceName + "_" + t.name, 
this.nameOld = t.persistenceNameOld + "_" + t.name) : (this.name = t.persistenceName, 
this.nameOld = t.persistenceNameOld), t.asyncPersistence ? (this._state = {}, P.getStorage(this.name, !0, function(e) {
c.isEmptyObject(e) ? P.getStorage(n.nameOld, !0, function(e) {
n._state = c.extend2Layers({}, e, n._state), n._init(t, i), n._save();
}) : (n._state = c.extend2Layers({}, e, n._state), n._init(t, i), n._save());
})) : (this._state = P.getStorage(this.name) || {}, c.isEmptyObject(this._state) && (this._state = P.getStorage(this.nameOld) || {}), 
this._init(t, i))) : (this._state = {}, this._init(t, i));
}
return a(e, [ {
key: "_init",
value: function(e, t) {
this.getDistinctId() || this.setDistinctId(c.UUID()), e.isChildInstance || (this.getDeviceId() || this._setDeviceId(c.UUID()), 
D.initDeviceId(this.getDeviceId())), this.initComplete = !0, "function" == typeof t && t(), 
this._save();
}
}, {
key: "_save",
value: function() {
this.enabled && this.initComplete && P.setStorage(this.name, JSON.stringify(this._state));
}
}, {
key: "_set",
value: function(e, t) {
var r, n = this;
"string" == typeof e ? (r = {})[e] = t : "object" === i(e) && (r = e), c.each(r, function(e, t) {
n._state[t] = e;
}), this._save();
}
}, {
key: "_get",
value: function(e) {
return this._state[e];
}
}, {
key: "setEventTimer",
value: function(e, t) {
var i = this._state.event_timers || {};
i[e] = t, this._set("event_timers", i);
}
}, {
key: "removeEventTimer",
value: function(e) {
var t = (this._state.event_timers || {})[e];
return c.isUndefined(t) || (delete this._state.event_timers[e], this._save()), t;
}
}, {
key: "getDeviceId",
value: function() {
return this._state.device_id;
}
}, {
key: "_setDeviceId",
value: function(e) {
this.getDeviceId() ? v.warn("cannot modify the device id.") : this._set("device_id", e);
}
}, {
key: "getDistinctId",
value: function() {
return this._state.distinct_id;
}
}, {
key: "setDistinctId",
value: function(e) {
this._set("distinct_id", e);
}
}, {
key: "getAccountId",
value: function() {
return this._state.account_id;
}
}, {
key: "setAccountId",
value: function(e) {
this._set("account_id", e);
}
}, {
key: "getSuperProperties",
value: function() {
return this._state.props || {};
}
}, {
key: "setSuperProperties",
value: function(e, t) {
t = t ? e : c.extend(this.getSuperProperties(), e);
this._set("props", t);
}
} ]), e;
}(), B = "tab_tampsdk_", L = function() {
function e(t, i) {
r(this, e), this.config = t, this.ta = i, this.timer = null, this.batchConfig = c.extend({
size: 5,
interval: 5e3,
storageLimit: 200
}, this.config.batchConfig), this.batchConfig.size < 1 && (this.batchConfig.size = 1), 
30 < this.batchConfig.size && (this.batchConfig.size = 30), this.tabKey = B + this.config.appId, 
this.storageLimit = this.batchConfig.storageLimit;
}
return a(e, [ {
key: "batchInterval",
value: function() {
var e = this;
e.timer = setTimeout(function() {
e.recycle(), e.send(), clearTimeout(e.timer), e.batchInterval();
}, this.batchConfig.interval);
}
}, {
key: "add",
value: function(e) {
var t = "tampsdk_" + this.config.appId + "_" + String(c.UUID()), i = P.getStorage(this.tabKey);
if ((i = c.isArray(i) ? i : []).length <= this.storageLimit) i.push(t), P.setStorage(this.tabKey, JSON.stringify(i)), 
P.setStorage(t, JSON.stringify(e)); else {
for (var r = i.splice(0, 20), n = (i = (console.log("deleted events data:" + r), 
i.push(t), P.setStorage(this.tabKey, JSON.stringify(i)), P.setStorage(t, JSON.stringify(e)), 
{}), []), a = 0; a < r.length; a++) {
var s = P.getStorage(r[a]);
n.push(s);
}
i.data = n, i["#app_id"] = this.config.appId, this.request(i, r);
}
}
}, {
key: "flush",
value: function() {
clearTimeout(this.timer), this.send(), this.batchInterval();
}
}, {
key: "send",
value: function() {
var e = P.getStorage(this.tabKey);
if (e && e.length) {
for (var t = {}, i = [], r = [], n = e.length < this.batchConfig.size ? e.length : this.batchConfig.size, a = 0; a < n; a++) {
var s = P.getStorage(e[a]);
i.push(s), r.push(e[a]);
}
t.data = i, t["#app_id"] = this.config.appId, this.request(t, r);
}
}
}, {
key: "request",
value: function(e, t) {
var i = this;
v.info("flush data: " + JSON.stringify(e)), T.enqueue(e, this.ta.serverUrl, {
maxRetries: this.config.maxRetries,
sendTimeout: this.config.sendTimeout,
callback: function() {
i.remove(t);
},
debugMode: this.config.debugMode,
deviceId: this.ta.getDeviceId()
});
}
}, {
key: "remove",
value: function(e) {
var t = P.getStorage(this.tabKey);
if (t) {
for (var i = 0; i < e.length; i++) {
var r = c.indexOf(t, e[i]);
-1 < r && t.splice(r, 1), P.removeStorage(e[i]);
}
P.setStorage(this.tabKey, JSON.stringify(t));
}
}
}, {
key: "recycle",
value: function() {}
} ]), e;
}(), U = function() {
function e(t) {
r(this, e), t.appId = t.appId ? c.checkAppId(t.appId) : c.checkAppId(t.appid), t.serverUrl = t.serverUrl ? c.checkUrl(t.serverUrl) : c.checkUrl(t.server_url);
var i = c.extend({}, j, P.getConfig());
c.isObject(t) ? this.config = c.extend(i, t) : this.config = i, this._init(this.config);
}
return a(e, [ {
key: "_init",
value: function(e) {
var t = this, i = (this.name = e.name, this.appId = e.appId || e.appid, e.serverUrl || e.server_url);
this.serverUrl = i + "/sync_xcx", this.serverDebugUrl = i + "/data_debug", this.configUrl = i + "/config", 
this.autoTrackProperties = {}, this._queue = [], this.updateConfig(this.configUrl, this.appId), 
e.isChildInstance ? this._state = {} : (v.enabled = e.enableLog, this.instances = [], 
this._state = {
getSystemInfo: !1,
initComplete: !1
}, P.setGlobal(this, this.name)), this.store = new R(e, function() {
t.config.asyncPersistence && c.isFunction(t.config.persistenceComplete) && t.config.persistenceComplete(t), 
t._updateState();
}), this.enabled = !c.isBoolean(this.store._get("ta_enabled")) || this.store._get("ta_enabled"), 
this.isOptOut = !!c.isBoolean(this.store._get("ta_isOptOut")) && this.store._get("ta_isOptOut"), 
!e.isChildInstance && e.autoTrack && (this.autoTrack = P.initAutoTrackInstance(this, e)), 
void 0 !== this.config.enableBatch && !1 !== this.config.enableBatch && (this.batchConsumer = new L(this.config, this), 
this.batchConsumer.batchInterval());
}
}, {
key: "initSystemInfo",
value: function() {
var e = this;
this.config.isChildInstance || D.getSystemInfo(function() {
e._updateState({
getSystemInfo: !0
});
});
}
}, {
key: "updateConfig",
value: function(e, t) {
var i = this, r = c.createExtraHeaders(), n = (r["content-type"] = "application/json", 
P.request({
url: e + "?appid=" + t,
method: "GET",
header: r,
success: function(e) {
c.isUndefined(e) || c.isUndefined(e.data) || (v.info("config update success(" + t + ") :" + JSON.stringify(e.data)), 
c.isUndefined(e.data.data)) || (i.config.syncBatchSize = e.data.data.sync_batch_size, 
i.config.syncInterval = e.data.data.sync_interval, i.config.disableEventList = e.data.data.disable_event_list, 
c.isUndefined(e.data.data.secret_key)) || (e = e.data.data.secret_key, i.config.secretKey = {
publicKey: e.key,
version: e.version
});
},
fail: function(e) {
v.info("config update fail(" + t + ") :" + e.errMsg);
}
}));
setTimeout(function() {
(c.isObject(n) || c.isPromise(n)) && c.isFunction(n.abort) && n.abort();
}, 3e3);
}
}, {
key: "initInstance",
value: function(t, i) {
if (!this.config.isChildInstance) return c.isString(t) && t !== this.name && c.isUndefined(this[t]) ? (i = new e(c.extend({}, this.config, {
enablePersistence: !1,
isChildInstance: !0,
name: t
}, i)), this[t] = i, this.instances.push(t), this[t]._state = this._state, i) : void v.warn("initInstance() failed due to the name is invalid: " + t);
v.warn("initInstance() cannot be called on child instance");
}
}, {
key: "lightInstance",
value: function(e) {
return this[e];
}
}, {
key: "_setAutoTrackProperties",
value: function(e) {
c.extend(this.autoTrackProperties, e);
}
}, {
key: "init",
value: function() {
if (this.initSystemInfo(), this._state.initComplete) return !1;
this._updateState({
initComplete: !0
}), v.info("Thinking Analytics SDK initialized successfully with mode: " + this.config.debugMode + ", APP ID : " + this.config.appId + ", server url: " + this.config.serverUrl + ", libversion: 2.2.1");
}
}, {
key: "_isReady",
value: function() {
return this._state.getSystemInfo && this._state.initComplete && this.store.initComplete && this.getDeviceId();
}
}, {
key: "_updateState",
value: function(e) {
var t = this;
c.isObject(e) && c.extend(this._state, e), this._onStateChange(), c.each(this.instances, function(e) {
t[e]._onStateChange();
});
}
}, {
key: "_onStateChange",
value: function() {
var e = this;
this._isReady() && this._queue && 0 < this._queue.length && (c.each(this._queue, function(t) {
e[t[0]].apply(e, u.call(t[1]));
}), this._queue = []);
}
}, {
key: "_hasDisabled",
value: function() {
var e = !this.enabled || this.isOptOut;
return e && v.info("ThinkingData is Pause or Stop!"), e;
}
}, {
key: "_sendRequest",
value: function(e, t, i) {
var r, n;
this._hasDisabled() || (!c.isUndefined(this.config.disableEventList) && this.config.disableEventList.includes(e.eventName) ? v.info("disabled Event : " + e.eventName) : (t = c.isDate(t) ? t : new Date(), 
r = {
data: [ {
"#type": e.type,
"#time": c.formatDate(t),
"#distinct_id": this.store.getDistinctId()
} ]
}, this.store.getAccountId() && (r.data[0]["#account_id"] = this.store.getAccountId()), 
"track" === e.type || "track_update" === e.type || "track_overwrite" === e.type ? (r.data[0]["#event_name"] = e.eventName, 
"track_update" === e.type || "track_overwrite" === e.type ? r.data[0]["#event_id"] = e.extraId : e.firstCheckId && (r.data[0]["#first_check_id"] = e.firstCheckId), 
r.data[0].properties = c.extend({
"#zone_offset": 0 - t.getTimezoneOffset() / 60
}, D.properties, this.autoTrackProperties, this.store.getSuperProperties(), this.dynamicProperties ? this.dynamicProperties() : {}), 
t = this.store.removeEventTimer(e.eventName), c.isUndefined(t) || (t = new Date().getTime() - t, 
86400 < (t = parseFloat((t / 1e3).toFixed(3))) ? t = 86400 : t < 0 && (t = 0), r.data[0].properties["#duration"] = t)) : r.data[0].properties = {}, 
c.isObject(e.properties) && !c.isEmptyObject(e.properties) && c.extend(r.data[0].properties, e.properties), 
c.searchObjDate(r.data[0]), 1 < this.config.maxRetries && (r.data[0]["#uuid"] = c.UUIDv4()), 
r["#app_id"] = this.appId, v.info(JSON.stringify(r, null, 4)), t = "debug" === this.config.debugMode || "debugOnly" === this.config.debugMode ? this.serverDebugUrl : this.serverUrl, 
c.isBoolean(this.config.enableEncrypt) && !0 === this.config.enableEncrypt && (r.data[0] = c.generateEncryptyData(r.data[0], this.config.secretKey)), 
this.batchConsumer && "none" === this.config.debugMode && !i ? (this.batchConsumer.add(r.data[0]), 
c.isFunction(e.onComplete) && e.onComplete({
code: 0,
msg: "success"
})) : i ? (i = new FormData(), "debug" === this.config.debugMode || "debugOnly" === this.config.debugMode ? (i.append("source", "client"), 
i.append("appid", this.appId), i.append("dryRun", "debugOnly" === this.config.debugMode ? 1 : 0), 
i.append("deviceId", this.getDeviceId()), i.append("data", JSON.stringify(r.data[0]))) : (n = c.base64Encode(JSON.stringify(r)), 
i.append("data", n)), navigator.sendBeacon(t, i), c.isFunction(e.onComplete) && e.onComplete({
statusCode: 200
})) : T.enqueue(r, t, {
maxRetries: this.config.maxRetries,
sendTimeout: this.config.sendTimeout,
callback: e.onComplete,
debugMode: this.config.debugMode,
deviceId: this.getDeviceId()
})));
}
}, {
key: "_isObjectParams",
value: function(e) {
return c.isObject(e) && c.isFunction(e.onComplete);
}
}, {
key: "track",
value: function(e, t, i, r) {
var n;
this._hasDisabled() || (this._isObjectParams(e) && (e = (n = e).eventName, t = n.properties, 
i = n.time, r = n.onComplete), x.event(e) && x.properties(t) || !this.config.strict ? this._internalTrack(e, t, i, r) : c.isFunction(r) && r({
code: -1,
msg: "invalid parameters"
}));
}
}, {
key: "trackUpdate",
value: function(e) {
var t, i;
this._hasDisabled() || (e && e.eventId && (x.event(e.eventName) && x.properties(e.properties) || !this.config.strict) ? this._isReady() ? (t = c.checkCalibration(e.properties, e.time, this.config.enableCalibrationTime), 
i = c.isDate(e.time) ? e.time : new Date(), this._sendRequest({
type: "track_update",
eventName: e.eventName,
properties: t,
onComplete: e.onComplete,
extraId: e.eventId
}, i)) : this._queue.push([ "trackUpdate", [ e ] ]) : (v.warn("Invalide parameter for trackUpdate: you should pass an object contains eventId to trackUpdate()"), 
c.isFunction(e.onComplete) && e.onComplete({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "trackOverwrite",
value: function(e) {
var t, i;
this._hasDisabled() || (e && e.eventId && (x.event(e.eventName) && x.properties(e.properties) || !this.config.strict) ? this._isReady() ? (t = c.checkCalibration(e.properties, e.time, this.config.enableCalibrationTime), 
i = c.isDate(e.time) ? e.time : new Date(), this._sendRequest({
type: "track_overwrite",
eventName: e.eventName,
properties: t,
onComplete: e.onComplete,
extraId: e.eventId
}, i)) : this._queue.push([ "trackOverwrite", [ e ] ]) : (v.warn("Invalide parameter for trackOverwrite: you should pass an object contains eventId to trackOverwrite()"), 
c.isFunction(e.onComplete) && e.onComplete({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "trackFirstEvent",
value: function(e) {
var t, i;
this._hasDisabled() || (e && e.eventName && (x.event(e.eventName) && x.properties(e.properties) || !this.config.strict) ? this._isReady() ? (t = c.checkCalibration(e.properties, e.time, this.config.enableCalibrationTime), 
i = c.isDate(e.time) ? e.time : new Date(), this._sendRequest({
type: "track",
eventName: e.eventName,
properties: t,
onComplete: e.onComplete,
firstCheckId: e.firstCheckId || this.getDeviceId()
}, i)) : this._queue.push([ "trackFirstEvent", [ e ] ]) : (v.warn("Invalide parameter for trackFirstEvent: you should pass an object contains eventName to trackFirstEvent()"), 
c.isFunction(e.onComplete) && e.onComplete({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "_internalTrack",
value: function(e, t, i, r, n) {
var a;
this._hasDisabled() || (a = c.checkCalibration(t, i, this.config.enableCalibrationTime), 
i = c.isDate(i) ? i : new Date(), this._isReady() ? this._sendRequest({
type: "track",
eventName: e,
properties: a,
onComplete: r
}, i, n) : this._queue.push([ "_internalTrack", [ e, t, i, r ] ]));
}
}, {
key: "userSet",
value: function(e, t, i) {
var r;
this._hasDisabled() || (this._isObjectParams(e) && (e = (r = e).properties, t = r.time, 
i = r.onComplete), x.propertiesMust(e) || !this.config.strict ? (t = c.isDate(t) ? t : new Date(), 
this._isReady() ? this._sendRequest({
type: "user_set",
properties: e,
onComplete: i
}, t) : this._queue.push([ "userSet", [ e, t, i ] ])) : (v.warn("calling userSet failed due to invalid arguments"), 
c.isFunction(i) && i({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "userSetOnce",
value: function(e, t, i) {
var r;
this._hasDisabled() || (this._isObjectParams(e) && (e = (r = e).properties, t = r.time, 
i = r.onComplete), x.propertiesMust(e) || !this.config.strict ? (t = c.isDate(t) ? t : new Date(), 
this._isReady() ? this._sendRequest({
type: "user_setOnce",
properties: e,
onComplete: i
}, t) : this._queue.push([ "userSetOnce", [ e, t, i ] ])) : (v.warn("calling userSetOnce failed due to invalid arguments"), 
c.isFunction(i) && i({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "userUnset",
value: function(e, t, i) {
var r;
this._hasDisabled() || (this._isObjectParams(void 0) && (e = (r = void 0).property, 
t = r.time, i = r.onComplete), x.propertyName(e) || !this.config.strict ? (t = c.isDate(t) ? t : new Date(), 
this._isReady() ? ((r = {})[e] = 0, this._sendRequest({
type: "user_unset",
properties: r,
onComplete: i
}, t)) : this._queue.push([ "userUnset", [ e, i, t ] ])) : (v.warn("calling userUnset failed due to invalid arguments"), 
c.isFunction(i) && i({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "userDel",
value: function(e, t) {
var i;
this._hasDisabled() || (this._isObjectParams(e) && (e = (i = e).time, t = i.onComplete), 
e = c.isDate(e) ? e : new Date(), this._isReady() ? this._sendRequest({
type: "user_del",
onComplete: t
}, e) : this._queue.push([ "userDel", [ e, t ] ]));
}
}, {
key: "userAdd",
value: function(e, t, i) {
var r;
this._hasDisabled() || (this._isObjectParams(e) && (e = (r = e).properties, t = r.time, 
i = r.onComplete), x.userAddProperties(e) || !this.config.strict ? (t = c.isDate(t) ? t : new Date(), 
this._isReady() ? this._sendRequest({
type: "user_add",
properties: e,
onComplete: i
}, t) : this._queue.push([ "userAdd", [ e, t, i ] ])) : (v.warn("calling userAdd failed due to invalid arguments"), 
c.isFunction(i) && i({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "userAppend",
value: function(e, t, i) {
var r;
this._hasDisabled() || (this._isObjectParams(e) && (e = (r = e).properties, t = r.time, 
i = r.onComplete), x.userAppendProperties(e) || !this.config.strict ? (t = c.isDate(t) ? t : new Date(), 
this._isReady() ? this._sendRequest({
type: "user_append",
properties: e,
onComplete: i
}, t) : this._queue.push([ "userAppend", [ e, t, i ] ])) : (v.warn("calling userAppend failed due to invalid arguments"), 
c.isFunction(i) && i({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "userUniqAppend",
value: function(e, t, i) {
var r;
this._hasDisabled() || (this._isObjectParams(e) && (e = (r = e).properties, t = r.time, 
i = r.onComplete), x.userAppendProperties(e) || !this.config.strict ? (t = c.isDate(t) ? t : new Date(), 
this._isReady() ? this._sendRequest({
type: "user_uniq_append",
properties: e,
onComplete: i
}, t) : this._queue.push([ "userUniqAppend", [ e, t, i ] ])) : (v.warn("calling userAppend failed due to invalid arguments"), 
c.isFunction(i) && i({
code: -1,
msg: "invalid parameters"
})));
}
}, {
key: "flush",
value: function() {
this.batchConsumer && "none" === this.config.debugMode && this.batchConsumer.flush();
}
}, {
key: "authorizeOpenID",
value: function(e) {
this.identify(e);
}
}, {
key: "identify",
value: function(e) {
if (!this._hasDisabled()) {
if ("number" == typeof e) e = String(e); else if ("string" != typeof e) return !1;
this.store.setDistinctId(e);
}
}
}, {
key: "getDistinctId",
value: function() {
return this.store.getDistinctId();
}
}, {
key: "login",
value: function(e) {
if (!this._hasDisabled()) {
if ("number" == typeof e) e = String(e); else if ("string" != typeof e) return !1;
this.store.setAccountId(e);
}
}
}, {
key: "getAccountId",
value: function() {
return this.store.getAccountId();
}
}, {
key: "logout",
value: function() {
this._hasDisabled() || this.store.setAccountId(null);
}
}, {
key: "setSuperProperties",
value: function(e) {
this._hasDisabled() || (x.propertiesMust(e) || !this.config.strict ? this.store.setSuperProperties(e) : v.warn("setSuperProperties parameter must be a valid property value"));
}
}, {
key: "clearSuperProperties",
value: function() {
this._hasDisabled() || this.store.setSuperProperties({}, !0);
}
}, {
key: "unsetSuperProperty",
value: function(e) {
var t;
this._hasDisabled() || c.isString(e) && (delete (t = this.getSuperProperties())[e], 
this.store.setSuperProperties(t, !0));
}
}, {
key: "getSuperProperties",
value: function() {
return this.store.getSuperProperties();
}
}, {
key: "getPresetProperties",
value: function() {
var e = D.properties, t = {}, i = e["#os"], r = (i = (t.os = c.isUndefined(i) ? "" : i, 
e["#screen_width"]), i = (t.screenWidth = c.isUndefined(i) ? 0 : i, e["#screen_height"]), 
i = (t.screenHeight = c.isUndefined(i) ? 0 : i, e["#network_type"]), i = (t.networkType = c.isUndefined(i) ? "" : i, 
e["#device_model"]), i = (t.deviceModel = c.isUndefined(i) ? "" : i, e["#os_version"]), 
t.osVersion = c.isUndefined(i) ? "" : i, t.deviceId = this.getDeviceId(), 0 - new Date().getTimezoneOffset() / 60);
i = (t.zoneOffset = r, e["#manufacturer"]);
return t.manufacturer = c.isUndefined(i) ? "" : i, t.toEventPresetProperties = function() {
return {
"#device_model": t.deviceModel,
"#device_id": t.deviceId,
"#screen_width": t.screenWidth,
"#screen_height": t.screenHeight,
"#os": t.os,
"#os_version": t.osVersion,
"#network_type": t.networkType,
"#zone_offset": r,
"#manufacturer": t.manufacturer
};
}, t;
}
}, {
key: "setDynamicSuperProperties",
value: function(e) {
this._hasDisabled() || ("function" == typeof e ? x.properties(e()) || !this.config.strict ? this.dynamicProperties = e : v.warn("A dynamic public property must return a valid property value") : v.warn("setDynamicSuperProperties parameter must be a function type"));
}
}, {
key: "timeEvent",
value: function(e, t) {
this._hasDisabled() || (t = c.isDate(t) ? t : new Date(), this._isReady() ? x.event(e) || !this.config.strict ? this.store.setEventTimer(e, t.getTime()) : v.warn("calling timeEvent failed due to invalid eventName: " + e) : this._queue.push([ "timeEvent", [ e, t ] ]));
}
}, {
key: "getDeviceId",
value: function() {
return D.properties["#device_id"];
}
}, {
key: "enableTracking",
value: function(e) {
this.enabled = e, this.store._set("ta_enabled", e);
}
}, {
key: "optOutTracking",
value: function() {
this.store.setSuperProperties({}, !0), this.store.setDistinctId(c.UUID()), this.store.setAccountId(null), 
this._queue.splice(0, this._queue.length), this.isOptOut = !0, this.store._set("ta_isOptOut", !0);
}
}, {
key: "optOutTrackingAndDeleteUser",
value: function() {
var e = new Date();
this._sendRequest({
type: "user_del"
}, e), this.optOutTracking();
}
}, {
key: "optInTracking",
value: function() {
this.isOptOut = !1, this.store._set("ta_isOptOut", !1);
}
}, {
key: "setTrackStatus",
value: function(e) {
switch (e) {
case "PAUSE":
this.eventSaveOnly = !1, this.optInTracking(), this.enableTracking(!1);
break;

case "STOP":
this.eventSaveOnly = !1, this.optOutTracking(!0);
break;

case "SAVE_ONLY":
break;

default:
this.eventSaveOnly = !1, this.optInTracking(), this.enableTracking(!0);
}
v.info("switch track status:" + e);
}
} ]), e;
}(), q = {
name: "thinkingdata",
enableLog: !0,
enableNative: !1
}, F = function() {
function e(t) {
r(this, e), t.appId = t.appId ? c.checkAppId(t.appId) : c.checkAppId(t.appid), t.serverUrl = t.serverUrl ? c.checkUrl(t.serverUrl) : c.checkUrl(t.server_url);
var i = c.extend({}, q, P.getConfig());
c.isObject(t) ? this.config = c.extend(i, t) : this.config = i, this._init(this.config);
}
return a(e, [ {
key: "_isNativePlatform",
value: function() {
return !(!this._isIOS() && !this._isAndroid() || !this.config.enableNative);
}
}, {
key: "_isIOS",
value: function() {
return !(!cc.sys.isNative || "iOS" !== cc.sys.os);
}
}, {
key: "_isAndroid",
value: function() {
return !(!cc.sys.isNative || "Android" !== cc.sys.os);
}
}, {
key: "_init",
value: function(e) {
this.name = e.name, this.appId = e.appId || e.appid, this._isNativePlatform() ? (this.initInstanceForNative(this.name, e, this.appId), 
this._readStorage(e)) : this.taJs = new ThinkingAnalyticsAPIForJS(e);
}
}, {
key: "_readStorage",
value: function(e) {
var t = this, i = e.persistenceName, r = e.persistenceNameOld;
e.isChildInstance && (i = e.persistenceName + "_" + e.name, r = e.persistenceNameOld + "_" + e.name), 
this._state = P.getStorage(i) || {}, c.isEmptyObject(this._state) && (this._state = P.getStorage(r) || {}), 
c.isEmptyObject(this._state) ? P.getStorage(i, !0, function(e) {
c.isEmptyObject(e) ? P.getStorage(r, !0, function(e) {
t._state = c.extend2Layers({}, e, t._state);
}) : t._state = c.extend2Layers({}, e, t._state), t._state.distinct_id && t.identifyForNative(t._state.distinct_id), 
t._state.account_id && t.loginForNative(t._state.account_id);
}) : (this._state.distinct_id && this.identifyForNative(this._state.distinct_id), 
this._state.account_id && this.loginForNative(this._state.account_id));
}
}, {
key: "initInstance",
value: function(e, t) {
return this._isNativePlatform() ? c.isUndefined(t) ? this[e] = new ThinkingAnalyticsAPI(this.config) : this[e] = new ThinkingAnalyticsAPI(t) : this[e] = this.taJs.initInstance(e, t), 
this[e];
}
}, {
key: "lightInstance",
value: function(e) {
return this[e];
}
}, {
key: "init",
value: function() {
var e, t;
this._isNativePlatform() ? (e = window, t = this, e.__autoTrackCallback = function(e) {
return c.isFunction(t.config.autoTrack.callback) ? (e = t.config.autoTrack.callback(e), 
JSON.stringify(e)) : "{}";
}, this.startThinkingAnalyticsForNative()) : this.taJs.init();
}
}, {
key: "track",
value: function(e, t, i, r) {
this._isNativePlatform() ? this.trackForNative(e, t, i, this.appId) : this.taJs.track(e, t, i, r);
}
}, {
key: "trackUpdate",
value: function(e) {
this._isNativePlatform() ? this.trackUpdateForNative(e, this.appId) : this.taJs.trackUpdate(e);
}
}, {
key: "trackOverwrite",
value: function(e) {
this._isNativePlatform() ? this.trackOverwriteForNative(e, this.appId) : this.taJs.trackOverwrite(e);
}
}, {
key: "trackFirstEvent",
value: function(e) {
this._isNativePlatform() ? this.trackFirstEventForNative(e, this.appId) : this.taJs.trackFirstEvent(e);
}
}, {
key: "userSet",
value: function(e, t, i) {
this._isNativePlatform() ? this.userSetForNative(e, this.appId) : this.taJs.userSet(e, t, i);
}
}, {
key: "userSetOnce",
value: function(e, t, i) {
this._isNativePlatform() ? this.userSetOnceForNative(e, this.appId) : this.taJs.userSetOnce(e, t, i);
}
}, {
key: "userUnset",
value: function(e, t, i) {
this._isNativePlatform() ? this.userUnsetForNative(e, this.appId) : this.taJs.userUnset(e, t, i);
}
}, {
key: "userDel",
value: function(e, t) {
this._isNativePlatform() ? this.userDelForNative(this.appId) : this.taJs.userDel(e, t);
}
}, {
key: "userAdd",
value: function(e, t, i) {
this._isNativePlatform() ? this.userAddForNative(e, this.appId) : this.taJs.userAdd(e, t, i);
}
}, {
key: "userAppend",
value: function(e, t, i) {
this._isNativePlatform() ? this.userAppendForNative(e, this.appId) : this.taJs.userAppend(e, t, i);
}
}, {
key: "userUniqAppend",
value: function(e, t, i) {
this._isNativePlatform() ? this.userUniqAppendForNative(e, this.appId) : this.taJs.userUniqAppend(e, t, i);
}
}, {
key: "flush",
value: function() {
this._isNativePlatform() ? this.flushForNative(this.appId) : this.taJs.flush();
}
}, {
key: "authorizeOpenID",
value: function(e) {
this.identify(e);
}
}, {
key: "identify",
value: function(e) {
this._isNativePlatform() ? this.identifyForNative(e, this.appId) : this.taJs.identify(e);
}
}, {
key: "getDistinctId",
value: function() {
return this._isNativePlatform() ? this.getDistinctIdForNative(this.appId) : this.taJs.getDistinctId();
}
}, {
key: "login",
value: function(e) {
this._isNativePlatform() ? this.loginForNative(e, this.appId) : this.taJs.login(e);
}
}, {
key: "getAccountId",
value: function() {
return this._isNativePlatform() ? this.getAccountIdForNative(this.appId) : this.taJs.getAccountId();
}
}, {
key: "logout",
value: function() {
this._isNativePlatform() ? this.logoutForNative(this.appId) : this.taJs.logout();
}
}, {
key: "setSuperProperties",
value: function(e) {
this._isNativePlatform() ? this.setSuperPropertiesForNative(e, this.appId) : this.taJs.setSuperProperties(e);
}
}, {
key: "clearSuperProperties",
value: function() {
this._isNativePlatform() ? this.clearSuperPropertiesForNative(this.appId) : this.taJs.clearSuperProperties();
}
}, {
key: "unsetSuperProperty",
value: function(e) {
this._isNativePlatform() ? this.unsetSuperPropertyForNative(e, this.appId) : this.taJs.unsetSuperProperty(e);
}
}, {
key: "getSuperProperties",
value: function() {
return this._isNativePlatform() ? this.getSuperPropertiesForNative(this.appId) : this.taJs.getSuperProperties();
}
}, {
key: "getPresetProperties",
value: function() {
var e, t, i, r;
return this._isNativePlatform() ? (e = this.getPresetPropertiesForNative(this.appId), 
t = {}, r = e["#os"], t.os = c.isUndefined(r) ? "" : r, r = e["#screen_width"], 
t.screenWidth = c.isUndefined(r) ? 0 : r, r = e["#screen_height"], t.screenHeight = c.isUndefined(r) ? 0 : r, 
r = e["#network_type"], t.networkType = c.isUndefined(r) ? "" : r, r = e["#device_model"], 
t.deviceModel = c.isUndefined(r) ? "" : r, r = e["#os_version"], t.osVersion = c.isUndefined(r) ? "" : r, 
t.deviceId = this.getDeviceId(), i = 0 - new Date().getTimezoneOffset() / 60, t.zoneOffset = i, 
r = e["#manufacturer"], t.manufacturer = c.isUndefined(r) ? "" : r, t.toEventPresetProperties = function() {
return {
"#device_model": t.deviceModel,
"#device_id": t.deviceId,
"#screen_width": t.screenWidth,
"#screen_height": t.screenHeight,
"#os": t.os,
"#os_version": t.osVersion,
"#network_type": t.networkType,
"#zone_offset": i,
"#manufacturer": t.manufacturer
};
}, t) : this.taJs.getPresetProperties();
}
}, {
key: "setDynamicSuperProperties",
value: function(e) {
this._isNativePlatform() ? "function" == typeof e ? (this.dynamicProperties = e, 
window.__dynamicPropertiesForNative = function(t) {
console.log("__dynamicPropertiesForNative: native msg: ", t);
t = e(), t = c.encodeDates(t);
return JSON.stringify(t);
}, this.setDynamicSuperPropertiesForNative("__dynamicPropertiesForNative")) : logger.warn("setDynamicSuperProperties parameter must be a function type") : this.taJs.setDynamicSuperProperties(e);
}
}, {
key: "timeEvent",
value: function(e, t) {
return this._isNativePlatform() ? this.timeEventForNative(e, this.appId) : this.taJs.timeEvent(e, t);
}
}, {
key: "getDeviceId",
value: function() {
return this._isNativePlatform() ? this.getDeviceIdForNative(this.appId) : this.taJs.getDeviceId();
}
}, {
key: "enableTracking",
value: function(e) {
this._isNativePlatform() ? this.enableTrackingForNative(e, this.appId) : this.taJs.enableTracking(e);
}
}, {
key: "optOutTracking",
value: function() {
this._isNativePlatform() ? this.optOutTrackingForNative(this.appId) : this.taJs.optOutTracking();
}
}, {
key: "optOutTrackingAndDeleteUser",
value: function() {
this._isNativePlatform() ? this.optOutTrackingAndDeleteUserForNative(this.appId) : this.taJs.optOutTrackingAndDeleteUser();
}
}, {
key: "optInTracking",
value: function() {
this._isNativePlatform() ? this.optInTrackingForNative(this.appId) : this.taJs.optInTracking();
}
}, {
key: "setTrackStatus",
value: function(e) {
this._isNativePlatform() ? this.setTrackStatusForNative(e, this.appId) : this.taJs.setTrackStatus(e);
}
}, {
key: "trackForNative",
value: function(e, t, i, r) {
i = c.isDate(i) ? c.formatDate(i) : "";
c.isUndefined(t) && (t = {}), t = c.extend(t, this.dynamicProperties ? this.dynamicProperties() : {}), 
t = c.encodeDates(t), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "track", "(Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;Ljava/lang/String;)V", e, JSON.stringify(t), i, r) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "track:properties:time:appId:", e, JSON.stringify(t), i, r);
}
}, {
key: "trackUpdateForNative",
value: function(e, t) {
e.properties = c.extend(c.isUndefined(e.properties) ? {} : e.properties, this.dynamicProperties ? this.dynamicProperties() : {}), 
e = c.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "trackUpdate", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "trackUpdate:appId:", JSON.stringify(e), t);
}
}, {
key: "trackFirstEventForNative",
value: function(e, t) {
e.properties = c.extend(c.isUndefined(e.properties) ? {} : e.properties, this.dynamicProperties ? this.dynamicProperties() : {}), 
e = c.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "trackFirstEvent", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "trackFirstEvent:appId:", JSON.stringify(e), t);
}
}, {
key: "trackOverwriteForNative",
value: function(e, t) {
e.properties = c.extend(c.isUndefined(e.properties) ? {} : e.properties, this.dynamicProperties ? this.dynamicProperties() : {}), 
e = c.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "trackOverwrite", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "trackOverwrite:appId:", JSON.stringify(e), t);
}
}, {
key: "timeEventForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "timeEvent", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "timeEvent:appId:", e, t);
}
}, {
key: "loginForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "login", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "login:appId:", e, t);
}
}, {
key: "logoutForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "logout", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "logout:", e);
}
}, {
key: "setSuperPropertiesForNative",
value: function(e, t) {
e = c.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "setSuperProperties", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "setSuperProperties:appId:", JSON.stringify(e), t);
}
}, {
key: "getSuperPropertiesForNative",
value: function(e) {
var t = "{}";
return this._isAndroid() ? t = jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "getSuperProperties", "(Ljava/lang/String;)Ljava/lang/String;", e) : this._isIOS() && (t = jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "getSuperProperties:", e)), 
JSON.parse(t);
}
}, {
key: "unsetSuperPropertyForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "unsetSuperProperty", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "unsetSuperProperty:appId:", e, t);
}
}, {
key: "clearSuperPropertiesForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "clearSuperProperties", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "clearSuperProperties:", e);
}
}, {
key: "userSetForNative",
value: function(e, t) {
e = c.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userSet", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userSet:appId:", JSON.stringify(e), t);
}
}, {
key: "userSetOnceForNative",
value: function(e, t) {
e = c.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userSetOnce", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userSetOnce:appId:", JSON.stringify(e), t);
}
}, {
key: "userAppendForNative",
value: function(e, t) {
e = c.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userAppend", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userAppend:appId:", JSON.stringify(e), t);
}
}, {
key: "userUniqAppendForNative",
value: function(e, t) {
e = c.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userUniqAppend", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userUniqAppend:appId:", JSON.stringify(e), t);
}
}, {
key: "userAddForNative",
value: function(e, t) {
e = c.encodeDates(e), this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userAdd", "(Ljava/lang/String;Ljava/lang/String;)V", JSON.stringify(e), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userAdd:appId:", JSON.stringify(e), t);
}
}, {
key: "userUnsetForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userUnset", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userUnset:appId:", e, t);
}
}, {
key: "userDelForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "userDel", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "userDel:", e);
}
}, {
key: "flushForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "flush", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "flush:", e);
}
}, {
key: "authorizeOpenIDForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "authorizeOpenID", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "authorizeOpenID:appId:", e, t);
}
}, {
key: "identifyForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "identify", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "identify:appId:", e, t);
}
}, {
key: "initInstanceForNative",
value: function(e, t, i) {
this._isAndroid() ? (jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "setCustomerLibInfo", "(Ljava/lang/String;Ljava/lang/String;)V", "MG", "2.2.1"), 
c.isUndefined(t) ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "initInstanceAppId", "(Ljava/lang/String;Ljava/lang/String;)V", e, i) : jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "initInstanceConfig", "(Ljava/lang/String;Ljava/lang/String;)V", e, JSON.stringify(t))) : this._isIOS() && (jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "setCustomerLibInfoWithLibName:libVersion:", "MG", "2.2.1"), 
c.isUndefined(t) ? jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "initInstance:appId:", e, i) : jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "initInstance:config:", e, JSON.stringify(t)));
}
}, {
key: "lightInstanceForNative",
value: function(e, t) {
return this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "lightInstance", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() ? jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "lightInstance:appId:", e, t) : void 0;
}
}, {
key: "startThinkingAnalyticsForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "startThinkingAnalytics", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "startThinkingAnalytics:", e);
}
}, {
key: "setDynamicSuperPropertiesForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "setDynamicSuperProperties", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "setDynamicSuperProperties:appId:", e, t);
}
}, {
key: "getDeviceIdForNative",
value: function(e) {
return this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "getDeviceId", "(Ljava/lang/String;)Ljava/lang/String;", e) : this._isIOS() ? jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "getDeviceId:", e) : void 0;
}
}, {
key: "getDistinctIdForNative",
value: function(e) {
return this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "getDistinctId", "(Ljava/lang/String;)Ljava/lang/String;", e) : this._isIOS() ? jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "getDistinctId:", e) : void 0;
}
}, {
key: "getAccountIdForNative",
value: function(e) {
return this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "getAccountId", "(Ljava/lang/String;)Ljava/lang/String;", e) : this._isIOS() ? jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "getAccountId:", e) : void 0;
}
}, {
key: "getPresetPropertiesForNative",
value: function(e) {
var t = "{}";
return this._isAndroid() ? t = jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "getPresetProperties", "(Ljava/lang/String;)Ljava/lang/String;", e) : this._isIOS() && (t = jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "getPresetProperties:", e)), 
JSON.parse(t);
}
}, {
key: "enableTrackingForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "enableTracking", "(Ljava/lang/String;Ljava/lang/String;)V", e.toString(), t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "enableTracking:appId:", e.toString(), t);
}
}, {
key: "optOutTrackingForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "optOutTracking", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "optOutTracking:", e);
}
}, {
key: "optOutTrackingAndDeleteUserForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "optOutTrackingAndDeleteUser", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "optOutTrackingAndDeleteUser:", e);
}
}, {
key: "optInTrackingForNative",
value: function(e) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "optInTracking", "(Ljava/lang/String;)V", e) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "optInTracking:", e);
}
}, {
key: "setTrackStatusForNative",
value: function(e, t) {
this._isAndroid() ? jsb.reflection.callStaticMethod("com/cocos/game/CocosCreatorProxyApi", "setTrackStatus", "(Ljava/lang/String;Ljava/lang/String;)V", e, t) : this._isIOS() && jsb.reflection.callStaticMethod("CocosCreatorProxyApi", "setTrackStatus:appId:", e, t);
}
} ]), e;
}();
window.ThinkingAnalyticsAPI = F, window.ThinkingAnalyticsAPIForJS = U, t.exports = F;
cc._RF.pop();
}, {} ]
}, {}, [ "DotAction", "SESDKHelper", "TESDKHelper", "UpdateMgr", "crypto-js", "startscreen", "tdanalytics.mg.cocoscreator.min", "thinkingdata.mg.cocoscreator.min" ]);