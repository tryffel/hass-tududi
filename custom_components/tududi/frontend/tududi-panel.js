//#region node_modules/@lit/reactive-element/css-tag.js
var e = globalThis, t = e.ShadowRoot && (e.ShadyCSS === void 0 || e.ShadyCSS.nativeShadow) && "adoptedStyleSheets" in Document.prototype && "replace" in CSSStyleSheet.prototype, n = Symbol(), r = /* @__PURE__ */ new WeakMap(), i = class {
	constructor(e, t, r) {
		if (this._$cssResult$ = !0, r !== n) throw Error("CSSResult is not constructable. Use `unsafeCSS` or `css` instead.");
		this.cssText = e, this.t = t;
	}
	get styleSheet() {
		let e = this.o, n = this.t;
		if (t && e === void 0) {
			let t = n !== void 0 && n.length === 1;
			t && (e = r.get(n)), e === void 0 && ((this.o = e = new CSSStyleSheet()).replaceSync(this.cssText), t && r.set(n, e));
		}
		return e;
	}
	toString() {
		return this.cssText;
	}
}, a = (e) => new i(typeof e == "string" ? e : e + "", void 0, n), o = (e, ...t) => new i(e.length === 1 ? e[0] : t.reduce((t, n, r) => t + ((e) => {
	if (!0 === e._$cssResult$) return e.cssText;
	if (typeof e == "number") return e;
	throw Error("Value passed to 'css' function must be a 'css' function result: " + e + ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.");
})(n) + e[r + 1], e[0]), e, n), s = (n, r) => {
	if (t) n.adoptedStyleSheets = r.map((e) => e instanceof CSSStyleSheet ? e : e.styleSheet);
	else for (let t of r) {
		let r = document.createElement("style"), i = e.litNonce;
		i !== void 0 && r.setAttribute("nonce", i), r.textContent = t.cssText, n.appendChild(r);
	}
}, c = t ? (e) => e : (e) => e instanceof CSSStyleSheet ? ((e) => {
	let t = "";
	for (let n of e.cssRules) t += n.cssText;
	return a(t);
})(e) : e, { is: l, defineProperty: u, getOwnPropertyDescriptor: d, getOwnPropertyNames: ee, getOwnPropertySymbols: te, getPrototypeOf: ne } = Object, f = globalThis, re = f.trustedTypes, ie = re ? re.emptyScript : "", ae = f.reactiveElementPolyfillSupport, p = (e, t) => e, m = {
	toAttribute(e, t) {
		switch (t) {
			case Boolean:
				e = e ? ie : null;
				break;
			case Object:
			case Array: e = e == null ? e : JSON.stringify(e);
		}
		return e;
	},
	fromAttribute(e, t) {
		let n = e;
		switch (t) {
			case Boolean:
				n = e !== null;
				break;
			case Number:
				n = e === null ? null : Number(e);
				break;
			case Object:
			case Array: try {
				n = JSON.parse(e);
			} catch {
				n = null;
			}
		}
		return n;
	}
}, h = (e, t) => !l(e, t), oe = {
	attribute: !0,
	type: String,
	converter: m,
	reflect: !1,
	useDefault: !1,
	hasChanged: h
};
Symbol.metadata ??= Symbol("metadata"), f.litPropertyMetadata ??= /* @__PURE__ */ new WeakMap();
var g = class extends HTMLElement {
	static addInitializer(e) {
		this._$Ei(), (this.l ??= []).push(e);
	}
	static get observedAttributes() {
		return this.finalize(), this._$Eh && [...this._$Eh.keys()];
	}
	static createProperty(e, t = oe) {
		if (t.state && (t.attribute = !1), this._$Ei(), this.prototype.hasOwnProperty(e) && ((t = Object.create(t)).wrapped = !0), this.elementProperties.set(e, t), !t.noAccessor) {
			let n = Symbol(), r = this.getPropertyDescriptor(e, n, t);
			r !== void 0 && u(this.prototype, e, r);
		}
	}
	static getPropertyDescriptor(e, t, n) {
		let { get: r, set: i } = d(this.prototype, e) ?? {
			get() {
				return this[t];
			},
			set(e) {
				this[t] = e;
			}
		};
		return {
			get: r,
			set(t) {
				let a = r?.call(this);
				i?.call(this, t), this.requestUpdate(e, a, n);
			},
			configurable: !0,
			enumerable: !0
		};
	}
	static getPropertyOptions(e) {
		return this.elementProperties.get(e) ?? oe;
	}
	static _$Ei() {
		if (this.hasOwnProperty(p("elementProperties"))) return;
		let e = ne(this);
		e.finalize(), e.l !== void 0 && (this.l = [...e.l]), this.elementProperties = new Map(e.elementProperties);
	}
	static finalize() {
		if (this.hasOwnProperty(p("finalized"))) return;
		if (this.finalized = !0, this._$Ei(), this.hasOwnProperty(p("properties"))) {
			let e = this.properties, t = [...ee(e), ...te(e)];
			for (let n of t) this.createProperty(n, e[n]);
		}
		let e = this[Symbol.metadata];
		if (e !== null) {
			let t = litPropertyMetadata.get(e);
			if (t !== void 0) for (let [e, n] of t) this.elementProperties.set(e, n);
		}
		this._$Eh = /* @__PURE__ */ new Map();
		for (let [e, t] of this.elementProperties) {
			let n = this._$Eu(e, t);
			n !== void 0 && this._$Eh.set(n, e);
		}
		this.elementStyles = this.finalizeStyles(this.styles);
	}
	static finalizeStyles(e) {
		let t = [];
		if (Array.isArray(e)) {
			let n = new Set(e.flat(1 / 0).reverse());
			for (let e of n) t.unshift(c(e));
		} else e !== void 0 && t.push(c(e));
		return t;
	}
	static _$Eu(e, t) {
		let n = t.attribute;
		return !1 === n ? void 0 : typeof n == "string" ? n : typeof e == "string" ? e.toLowerCase() : void 0;
	}
	constructor() {
		super(), this._$Ep = void 0, this.isUpdatePending = !1, this.hasUpdated = !1, this._$Em = null, this._$Ev();
	}
	_$Ev() {
		this._$ES = new Promise((e) => this.enableUpdating = e), this._$AL = /* @__PURE__ */ new Map(), this._$E_(), this.requestUpdate(), this.constructor.l?.forEach((e) => e(this));
	}
	addController(e) {
		(this._$EO ??= /* @__PURE__ */ new Set()).add(e), this.renderRoot !== void 0 && this.isConnected && e.hostConnected?.();
	}
	removeController(e) {
		this._$EO?.delete(e);
	}
	_$E_() {
		let e = /* @__PURE__ */ new Map(), t = this.constructor.elementProperties;
		for (let n of t.keys()) this.hasOwnProperty(n) && (e.set(n, this[n]), delete this[n]);
		e.size > 0 && (this._$Ep = e);
	}
	createRenderRoot() {
		let e = this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
		return s(e, this.constructor.elementStyles), e;
	}
	connectedCallback() {
		this.renderRoot ??= this.createRenderRoot(), this.enableUpdating(!0), this._$EO?.forEach((e) => e.hostConnected?.());
	}
	enableUpdating(e) {}
	disconnectedCallback() {
		this._$EO?.forEach((e) => e.hostDisconnected?.());
	}
	attributeChangedCallback(e, t, n) {
		this._$AK(e, n);
	}
	_$ET(e, t) {
		let n = this.constructor.elementProperties.get(e), r = this.constructor._$Eu(e, n);
		if (r !== void 0 && !0 === n.reflect) {
			let i = (n.converter?.toAttribute === void 0 ? m : n.converter).toAttribute(t, n.type);
			this._$Em = e, i == null ? this.removeAttribute(r) : this.setAttribute(r, i), this._$Em = null;
		}
	}
	_$AK(e, t) {
		let n = this.constructor, r = n._$Eh.get(e);
		if (r !== void 0 && this._$Em !== r) {
			let e = n.getPropertyOptions(r), i = typeof e.converter == "function" ? { fromAttribute: e.converter } : e.converter?.fromAttribute === void 0 ? m : e.converter;
			this._$Em = r;
			let a = i.fromAttribute(t, e.type);
			this[r] = a ?? this._$Ej?.get(r) ?? a, this._$Em = null;
		}
	}
	requestUpdate(e, t, n, r = !1, i) {
		if (e !== void 0) {
			let a = this.constructor;
			if (!1 === r && (i = this[e]), n ??= a.getPropertyOptions(e), !((n.hasChanged ?? h)(i, t) || n.useDefault && n.reflect && i === this._$Ej?.get(e) && !this.hasAttribute(a._$Eu(e, n)))) return;
			this.C(e, t, n);
		}
		!1 === this.isUpdatePending && (this._$ES = this._$EP());
	}
	C(e, t, { useDefault: n, reflect: r, wrapped: i }, a) {
		n && !(this._$Ej ??= /* @__PURE__ */ new Map()).has(e) && (this._$Ej.set(e, a ?? t ?? this[e]), !0 !== i || a !== void 0) || (this._$AL.has(e) || (this.hasUpdated || n || (t = void 0), this._$AL.set(e, t)), !0 === r && this._$Em !== e && (this._$Eq ??= /* @__PURE__ */ new Set()).add(e));
	}
	async _$EP() {
		this.isUpdatePending = !0;
		try {
			await this._$ES;
		} catch (e) {
			Promise.reject(e);
		}
		let e = this.scheduleUpdate();
		return e != null && await e, !this.isUpdatePending;
	}
	scheduleUpdate() {
		return this.performUpdate();
	}
	performUpdate() {
		if (!this.isUpdatePending) return;
		if (!this.hasUpdated) {
			if (this.renderRoot ??= this.createRenderRoot(), this._$Ep) {
				for (let [e, t] of this._$Ep) this[e] = t;
				this._$Ep = void 0;
			}
			let e = this.constructor.elementProperties;
			if (e.size > 0) for (let [t, n] of e) {
				let { wrapped: e } = n, r = this[t];
				!0 !== e || this._$AL.has(t) || r === void 0 || this.C(t, void 0, n, r);
			}
		}
		let e = !1, t = this._$AL;
		try {
			e = this.shouldUpdate(t), e ? (this.willUpdate(t), this._$EO?.forEach((e) => e.hostUpdate?.()), this.update(t)) : this._$EM();
		} catch (t) {
			throw e = !1, this._$EM(), t;
		}
		e && this._$AE(t);
	}
	willUpdate(e) {}
	_$AE(e) {
		this._$EO?.forEach((e) => e.hostUpdated?.()), this.hasUpdated || (this.hasUpdated = !0, this.firstUpdated(e)), this.updated(e);
	}
	_$EM() {
		this._$AL = /* @__PURE__ */ new Map(), this.isUpdatePending = !1;
	}
	get updateComplete() {
		return this.getUpdateComplete();
	}
	getUpdateComplete() {
		return this._$ES;
	}
	shouldUpdate(e) {
		return !0;
	}
	update(e) {
		this._$Eq &&= this._$Eq.forEach((e) => this._$ET(e, this[e])), this._$EM();
	}
	updated(e) {}
	firstUpdated(e) {}
};
g.elementStyles = [], g.shadowRootOptions = { mode: "open" }, g[p("elementProperties")] = /* @__PURE__ */ new Map(), g[p("finalized")] = /* @__PURE__ */ new Map(), ae?.({ ReactiveElement: g }), (f.reactiveElementVersions ??= []).push("2.1.2");
//#endregion
//#region node_modules/lit-html/lit-html.js
var _ = globalThis, se = (e) => e, v = _.trustedTypes, ce = v ? v.createPolicy("lit-html", { createHTML: (e) => e }) : void 0, le = "$lit$", y = `lit$${Math.random().toFixed(9).slice(2)}$`, b = "?" + y, ue = `<${b}>`, x = document, S = () => x.createComment(""), C = (e) => e === null || typeof e != "object" && typeof e != "function", w = Array.isArray, de = (e) => w(e) || typeof e?.[Symbol.iterator] == "function", T = "[ 	\n\f\r]", E = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g, fe = /-->/g, pe = />/g, D = RegExp(`>|${T}(?:([^\\s"'>=/]+)(${T}*=${T}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`, "g"), me = /'/g, he = /"/g, ge = /^(?:script|style|textarea|title)$/i, _e = (e) => (t, ...n) => ({
	_$litType$: e,
	strings: t,
	values: n
}), O = _e(1), ve = _e(2), k = Symbol.for("lit-noChange"), A = Symbol.for("lit-nothing"), ye = /* @__PURE__ */ new WeakMap(), j = x.createTreeWalker(x, 129);
function M(e, t) {
	if (!w(e) || !e.hasOwnProperty("raw")) throw Error("invalid template strings array");
	return ce === void 0 ? t : ce.createHTML(t);
}
var be = (e, t) => {
	let n = e.length - 1, r = [], i, a = t === 2 ? "<svg>" : t === 3 ? "<math>" : "", o = E;
	for (let t = 0; t < n; t++) {
		let n = e[t], s, c, l = -1, u = 0;
		for (; u < n.length && (o.lastIndex = u, c = o.exec(n), c !== null);) u = o.lastIndex, o === E ? c[1] === "!--" ? o = fe : c[1] === void 0 ? c[2] === void 0 ? c[3] !== void 0 && (o = D) : (ge.test(c[2]) && (i = RegExp("</" + c[2], "g")), o = D) : o = pe : o === D ? c[0] === ">" ? (o = i ?? E, l = -1) : c[1] === void 0 ? l = -2 : (l = o.lastIndex - c[2].length, s = c[1], o = c[3] === void 0 ? D : c[3] === "\"" ? he : me) : o === he || o === me ? o = D : o === fe || o === pe ? o = E : (o = D, i = void 0);
		let d = o === D && e[t + 1].startsWith("/>") ? " " : "";
		a += o === E ? n + ue : l >= 0 ? (r.push(s), n.slice(0, l) + le + n.slice(l) + y + d) : n + y + (l === -2 ? t : d);
	}
	return [M(e, a + (e[n] || "<?>") + (t === 2 ? "</svg>" : t === 3 ? "</math>" : "")), r];
}, N = class e {
	constructor({ strings: t, _$litType$: n }, r) {
		let i;
		this.parts = [];
		let a = 0, o = 0, s = t.length - 1, c = this.parts, [l, u] = be(t, n);
		if (this.el = e.createElement(l, r), j.currentNode = this.el.content, n === 2 || n === 3) {
			let e = this.el.content.firstChild;
			e.replaceWith(...e.childNodes);
		}
		for (; (i = j.nextNode()) !== null && c.length < s;) {
			if (i.nodeType === 1) {
				if (i.hasAttributes()) for (let e of i.getAttributeNames()) if (e.endsWith(le)) {
					let t = u[o++], n = i.getAttribute(e).split(y), r = /([.?@])?(.*)/.exec(t);
					c.push({
						type: 1,
						index: a,
						name: r[2],
						strings: n,
						ctor: r[1] === "." ? Se : r[1] === "?" ? Ce : r[1] === "@" ? we : I
					}), i.removeAttribute(e);
				} else e.startsWith(y) && (c.push({
					type: 6,
					index: a
				}), i.removeAttribute(e));
				if (ge.test(i.tagName)) {
					let e = i.textContent.split(y), t = e.length - 1;
					if (t > 0) {
						i.textContent = v ? v.emptyScript : "";
						for (let n = 0; n < t; n++) i.append(e[n], S()), j.nextNode(), c.push({
							type: 2,
							index: ++a
						});
						i.append(e[t], S());
					}
				}
			} else if (i.nodeType === 8) {
				if (i.data === b) c.push({
					type: 2,
					index: a
				});
				else {
					let e = -1;
					for (; (e = i.data.indexOf(y, e + 1)) !== -1;) c.push({
						type: 7,
						index: a
					}), e += y.length - 1;
				}
			}
			a++;
		}
	}
	static createElement(e, t) {
		let n = x.createElement("template");
		return n.innerHTML = e, n;
	}
};
function P(e, t, n = e, r) {
	if (t === k) return t;
	let i = r === void 0 ? n._$Cl : n._$Co?.[r], a = C(t) ? void 0 : t._$litDirective$;
	return i?.constructor !== a && (i?._$AO?.(!1), a === void 0 ? i = void 0 : (i = new a(e), i._$AT(e, n, r)), r === void 0 ? n._$Cl = i : (n._$Co ??= [])[r] = i), i !== void 0 && (t = P(e, i._$AS(e, t.values), i, r)), t;
}
var xe = class {
	constructor(e, t) {
		this._$AV = [], this._$AN = void 0, this._$AD = e, this._$AM = t;
	}
	get parentNode() {
		return this._$AM.parentNode;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	u(e) {
		let { el: { content: t }, parts: n } = this._$AD, r = (e?.creationScope ?? x).importNode(t, !0);
		j.currentNode = r;
		let i = j.nextNode(), a = 0, o = 0, s = n[0];
		for (; s !== void 0;) {
			if (a === s.index) {
				let t;
				s.type === 2 ? t = new F(i, i.nextSibling, this, e) : s.type === 1 ? t = new s.ctor(i, s.name, s.strings, this, e) : s.type === 6 && (t = new Te(i, this, e)), this._$AV.push(t), s = n[++o];
			}
			a !== s?.index && (i = j.nextNode(), a++);
		}
		return j.currentNode = x, r;
	}
	p(e) {
		let t = 0;
		for (let n of this._$AV) n !== void 0 && (n.strings === void 0 ? n._$AI(e[t]) : (n._$AI(e, n, t), t += n.strings.length - 2)), t++;
	}
}, F = class e {
	get _$AU() {
		return this._$AM?._$AU ?? this._$Cv;
	}
	constructor(e, t, n, r) {
		this.type = 2, this._$AH = A, this._$AN = void 0, this._$AA = e, this._$AB = t, this._$AM = n, this.options = r, this._$Cv = r?.isConnected ?? !0;
	}
	get parentNode() {
		let e = this._$AA.parentNode, t = this._$AM;
		return t !== void 0 && e?.nodeType === 11 && (e = t.parentNode), e;
	}
	get startNode() {
		return this._$AA;
	}
	get endNode() {
		return this._$AB;
	}
	_$AI(e, t = this) {
		e = P(this, e, t), C(e) ? e === A || e == null || e === "" ? (this._$AH !== A && this._$AR(), this._$AH = A) : e !== this._$AH && e !== k && this._(e) : e._$litType$ === void 0 ? e.nodeType === void 0 ? de(e) ? this.k(e) : this._(e) : this.T(e) : this.$(e);
	}
	O(e) {
		return this._$AA.parentNode.insertBefore(e, this._$AB);
	}
	T(e) {
		this._$AH !== e && (this._$AR(), this._$AH = this.O(e));
	}
	_(e) {
		this._$AH !== A && C(this._$AH) ? this._$AA.nextSibling.data = e : this.T(x.createTextNode(e)), this._$AH = e;
	}
	$(e) {
		let { values: t, _$litType$: n } = e, r = typeof n == "number" ? this._$AC(e) : (n.el === void 0 && (n.el = N.createElement(M(n.h, n.h[0]), this.options)), n);
		if (this._$AH?._$AD === r) this._$AH.p(t);
		else {
			let e = new xe(r, this), n = e.u(this.options);
			e.p(t), this.T(n), this._$AH = e;
		}
	}
	_$AC(e) {
		let t = ye.get(e.strings);
		return t === void 0 && ye.set(e.strings, t = new N(e)), t;
	}
	k(t) {
		w(this._$AH) || (this._$AH = [], this._$AR());
		let n = this._$AH, r, i = 0;
		for (let a of t) i === n.length ? n.push(r = new e(this.O(S()), this.O(S()), this, this.options)) : r = n[i], r._$AI(a), i++;
		i < n.length && (this._$AR(r && r._$AB.nextSibling, i), n.length = i);
	}
	_$AR(e = this._$AA.nextSibling, t) {
		for (this._$AP?.(!1, !0, t); e !== this._$AB;) {
			let t = se(e).nextSibling;
			se(e).remove(), e = t;
		}
	}
	setConnected(e) {
		this._$AM === void 0 && (this._$Cv = e, this._$AP?.(e));
	}
}, I = class {
	get tagName() {
		return this.element.tagName;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	constructor(e, t, n, r, i) {
		this.type = 1, this._$AH = A, this._$AN = void 0, this.element = e, this.name = t, this._$AM = r, this.options = i, n.length > 2 || n[0] !== "" || n[1] !== "" ? (this._$AH = Array(n.length - 1).fill(/* @__PURE__ */ new String()), this.strings = n) : this._$AH = A;
	}
	_$AI(e, t = this, n, r) {
		let i = this.strings, a = !1;
		if (i === void 0) e = P(this, e, t, 0), a = !C(e) || e !== this._$AH && e !== k, a && (this._$AH = e);
		else {
			let r = e, o, s;
			for (e = i[0], o = 0; o < i.length - 1; o++) s = P(this, r[n + o], t, o), s === k && (s = this._$AH[o]), a ||= !C(s) || s !== this._$AH[o], s === A ? e = A : e !== A && (e += (s ?? "") + i[o + 1]), this._$AH[o] = s;
		}
		a && !r && this.j(e);
	}
	j(e) {
		e === A ? this.element.removeAttribute(this.name) : this.element.setAttribute(this.name, e ?? "");
	}
}, Se = class extends I {
	constructor() {
		super(...arguments), this.type = 3;
	}
	j(e) {
		this.element[this.name] = e === A ? void 0 : e;
	}
}, Ce = class extends I {
	constructor() {
		super(...arguments), this.type = 4;
	}
	j(e) {
		this.element.toggleAttribute(this.name, !!e && e !== A);
	}
}, we = class extends I {
	constructor(e, t, n, r, i) {
		super(e, t, n, r, i), this.type = 5;
	}
	_$AI(e, t = this) {
		if ((e = P(this, e, t, 0) ?? A) === k) return;
		let n = this._$AH, r = e === A && n !== A || e.capture !== n.capture || e.once !== n.once || e.passive !== n.passive, i = e !== A && (n === A || r);
		r && this.element.removeEventListener(this.name, this, n), i && this.element.addEventListener(this.name, this, e), this._$AH = e;
	}
	handleEvent(e) {
		typeof this._$AH == "function" ? this._$AH.call(this.options?.host ?? this.element, e) : this._$AH.handleEvent(e);
	}
}, Te = class {
	constructor(e, t, n) {
		this.element = e, this.type = 6, this._$AN = void 0, this._$AM = t, this.options = n;
	}
	get _$AU() {
		return this._$AM._$AU;
	}
	_$AI(e) {
		P(this, e);
	}
}, Ee = _.litHtmlPolyfillSupport;
Ee?.(N, F), (_.litHtmlVersions ??= []).push("3.3.3");
var De = (e, t, n) => {
	let r = n?.renderBefore ?? t, i = r._$litPart$;
	if (i === void 0) {
		let e = n?.renderBefore ?? null;
		r._$litPart$ = i = new F(t.insertBefore(S(), e), e, void 0, n ?? {});
	}
	return i._$AI(e), i;
}, L = globalThis, R = class extends g {
	constructor() {
		super(...arguments), this.renderOptions = { host: this }, this._$Do = void 0;
	}
	createRenderRoot() {
		let e = super.createRenderRoot();
		return this.renderOptions.renderBefore ??= e.firstChild, e;
	}
	update(e) {
		let t = this.render();
		this.hasUpdated || (this.renderOptions.isConnected = this.isConnected), super.update(e), this._$Do = De(t, this.renderRoot, this.renderOptions);
	}
	connectedCallback() {
		super.connectedCallback(), this._$Do?.setConnected(!0);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this._$Do?.setConnected(!1);
	}
	render() {
		return k;
	}
};
R._$litElement$ = !0, R.finalized = !0, L.litElementHydrateSupport?.({ LitElement: R });
var Oe = L.litElementPolyfillSupport;
Oe?.({ LitElement: R }), (L.litElementVersions ??= []).push("4.2.2");
//#endregion
//#region src/api.ts
var ke = class {
	constructor(e) {
		this.getHass = e;
	}
	call(e, t = {}) {
		return this.getHass().callWS({
			type: `tududi/${e}`,
			...t
		});
	}
	entries() {
		return this.call("entries");
	}
	subscribe(e, t) {
		return this.getHass().connection.subscribeMessage(t, {
			type: "tududi/subscribe",
			entry_id: e
		});
	}
	refresh(e) {
		return this.call("refresh", { entry_id: e });
	}
	createTask(e, t, n = {}) {
		return this.call("task/create", {
			entry_id: e,
			name: t,
			...n
		});
	}
	updateTask(e, t, n) {
		return this.call("task/update", {
			entry_id: e,
			uid: t,
			...n
		});
	}
	deleteTask(e, t) {
		return this.call("task/delete", {
			entry_id: e,
			uid: t
		});
	}
	createInvoice(e, t) {
		return this.call("invoice/create", {
			entry_id: e,
			...t
		});
	}
	updateInvoice(e, t, n) {
		return this.call("invoice/update", {
			entry_id: e,
			uid: t,
			...n
		});
	}
	createNote(e, t, n = {}) {
		return this.call("note/create", {
			entry_id: e,
			title: t,
			...n
		});
	}
	updateNote(e, t, n) {
		return this.call("note/update", {
			entry_id: e,
			uid: t,
			...n
		});
	}
	deleteNote(e, t) {
		return this.call("note/delete", {
			entry_id: e,
			uid: t
		});
	}
};
function z(e) {
	return e && typeof e == "object" && "message" in e ? String(e.message) : String(e);
}
//#endregion
//#region src/icons.ts
var Ae = {
	menu: "M3,6H21V8H3V6M3,11H21V13H3V11M3,16H21V18H3V16Z",
	refresh: "M17.65,6.35C16.2,4.9 14.21,4 12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20C15.73,20 18.84,17.45 19.73,14H17.65C16.83,16.33 14.61,18 12,18A6,6 0 0,1 6,12A6,6 0 0,1 12,6C13.66,6 15.14,6.69 16.22,7.78L13,11H20V4L17.65,6.35Z",
	close: "M19,6.41L17.59,5L12,10.59L6.41,5L5,6.41L10.59,12L5,17.59L6.41,19L12,13.41L17.59,19L19,17.59L13.41,12L19,6.41Z",
	delete: "M19,4H15.5L14.5,3H9.5L8.5,4H5V6H19M6,19A2,2 0 0,0 8,21H16A2,2 0 0,0 18,19V7H6V19Z",
	back: "M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z",
	check: "M21,7L9,19L3.5,13.5L4.91,12.09L9,16.17L19.59,5.59L21,7Z",
	plus: "M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z",
	note: "M14,10H19.5L14,4.5V10M5,3H15L21,9V19A2,2 0 0,1 19,21H5C3.89,21 3,20.1 3,19V5C3,3.89 3.89,3 5,3M5,12V14H19V12H5M5,16V18H14V16H5Z",
	pencil: "M20.71,7.04C21.1,6.65 21.1,6 20.71,5.63L18.37,3.29C18,2.9 17.35,2.9 16.96,3.29L15.12,5.12L18.87,8.87M3,17.25V21H6.75L17.81,9.93L14.06,6.18L3,17.25Z",
	receipt: "M3,22V2L4.5,3.5L6,2L7.5,3.5L9,2L10.5,3.5L12,2L13.5,3.5L15,2L16.5,3.5L18,2L19.5,3.5L21,2V22L19.5,20.5L18,22L16.5,20.5L15,22L13.5,20.5L12,22L10.5,20.5L9,22L7.5,20.5L6,22L4.5,20.5L3,22M18,9V7H6V9H18M18,13V11H6V13H18M18,17V15H6V17H18Z",
	chevronLeft: "M15.41,16.58L10.83,12L15.41,7.41L14,6L8,12L14,18L15.41,16.58Z",
	chevronRight: "M8.59,16.58L13.17,12L8.59,7.41L10,6L16,12L10,18L8.59,16.58Z",
	repeat: "M17,17H7V14L3,18L7,22V19H19V13H17M7,7H17V10L21,6L17,2V5H5V11H7V7Z"
};
function B(e, t = 24) {
	return ve`<svg viewBox="0 0 24 24" width=${t} height=${t} aria-hidden="true"><path fill="currentColor" d=${Ae[e]}></path></svg>`;
}
function V(e, t) {
	customElements.get(e) || customElements.define(e, t);
}
//#endregion
//#region src/logic.ts
var H = [
	{
		id: "today",
		label: "Today"
	},
	{
		id: "upcoming",
		label: "Upcoming"
	},
	{
		id: "overdue",
		label: "Overdue"
	},
	{
		id: "inbox",
		label: "Inbox"
	},
	{
		id: "invoices",
		label: "Invoices"
	},
	{
		id: "all",
		label: "All open"
	},
	{
		id: "done",
		label: "Completed"
	}
], je = 864e5;
function U(e) {
	let [t, n, r] = e.split("-").map(Number);
	return Date.UTC(t, n - 1, r);
}
function W(e, t) {
	return Math.round((U(t) - U(e)) / je);
}
function G(e, t) {
	return new Date(U(e) + t * je).toISOString().slice(0, 10);
}
function Me(e) {
	return e < 0 ? "overdue" : e === 0 ? "today" : e <= 7 ? "soon" : "later";
}
function K(e, t = "en") {
	return new Date(U(e)).toLocaleDateString(t, {
		weekday: "short",
		day: "numeric",
		month: "short",
		timeZone: "UTC"
	});
}
function q(e, t, n = "en") {
	let r = W(e, t);
	return r === 0 ? "Today" : r === 1 ? "Tomorrow" : r === -1 ? "Yesterday" : r < 0 ? `${-r} days overdue` : r < 7 ? new Date(U(t)).toLocaleDateString(n, {
		weekday: "long",
		timeZone: "UTC"
	}) : K(t, n);
}
function Ne(e, t) {
	let n = t.toLocaleLowerCase();
	return e.tags.some((e) => e.toLocaleLowerCase() === n);
}
function Pe(e, t) {
	if (e.due_date !== t.due_date) return e.due_date ? t.due_date ? e.due_date < t.due_date ? -1 : 1 : -1 : 1;
	let n = e.priority ?? -1, r = t.priority ?? -1;
	return n === r ? e.name.localeCompare(t.name) : r - n;
}
function Fe(e, t) {
	let n = e.completed_at ?? "", r = t.completed_at ?? "";
	return n === r ? e.name.localeCompare(t.name) : n < r ? 1 : -1;
}
function Ie(e, t) {
	let n = t.trim().toLocaleLowerCase();
	return !n || e.name.toLocaleLowerCase().includes(n) || e.note.toLocaleLowerCase().includes(n) || e.tags.some((e) => e.toLocaleLowerCase().includes(n));
}
function Le(e, t) {
	let n = e.today, r = e.tasks;
	if (t.startsWith("project:")) {
		let e = t.slice(8);
		return r.filter((t) => t.project_uid === e && (t.open || t.done));
	}
	if (t.startsWith("tag:")) {
		let e = t.slice(4);
		return r.filter((t) => Ne(t, e) && (t.open || t.done));
	}
	switch (t) {
		case "today": return r.filter((e) => e.open && e.due_date !== null && e.due_date <= n);
		case "upcoming": return r.filter((e) => e.open && e.due_date !== null && e.due_date > n);
		case "overdue": return r.filter((e) => e.open && e.due_date !== null && e.due_date < n);
		case "inbox": return r.filter((e) => e.open && !e.project_uid && !e.due_date);
		case "invoices": return r.filter((t) => Ne(t, e.reminder_tag) && (t.open || t.done));
		case "done": return r.filter((e) => e.done);
		default: return r.filter((e) => e.open);
	}
}
function J(e, t) {
	return Le(e, t).filter((e) => e.open).length;
}
function Re(e, t, n, r = "en") {
	let i = e.today, a = n.filter((e) => e.open).sort(Pe), o = n.filter((e) => !e.open).sort(Fe), s = [], c = (e, t, n) => {
		n.length && s.push({
			key: e,
			label: t,
			tasks: n
		});
	};
	if (t === "today") c("overdue", "Overdue", a.filter((e) => e.due_date < i)), c("today", "Today", a.filter((e) => e.due_date === i));
	else if (t === "upcoming") {
		let e = /* @__PURE__ */ new Map();
		for (let t of a) {
			let n = e.get(t.due_date) ?? [];
			n.push(t), e.set(t.due_date, n);
		}
		for (let [t, n] of e) c(t, W(i, t) < 7 ? `${q(i, t, r)} · ${K(t, r)}` : K(t, r), n);
	} else if (t === "invoices") {
		let t = G(i, e.reminder_days_before);
		c("overdue", "Overdue", a.filter((e) => e.due_date !== null && e.due_date < i)), c("soon", `Due within ${e.reminder_days_before} days`, a.filter((e) => e.due_date !== null && e.due_date >= i && e.due_date <= t)), c("later", "Later", a.filter((e) => e.due_date !== null && e.due_date > t)), c("nodate", "No due date", a.filter((e) => e.due_date === null)), c("done", "Paid", o);
	} else t === "done" ? c("done", null, o) : (c("open", null, a), c("done", "Completed", o));
	return s;
}
function ze(e, t) {
	if (t.startsWith("project:")) return { project_uid: t.slice(8) };
	if (t.startsWith("tag:")) return { tags: [t.slice(4)] };
	switch (t) {
		case "today": return { due_date: e.today };
		case "upcoming": return { due_date: G(e.today, 1) };
		case "invoices": return { tags: [e.reminder_tag] };
		default: return {};
	}
}
function Y(e, t) {
	if (t.startsWith("project:")) {
		let n = t.slice(8);
		return e?.projects.find((e) => e.uid === n)?.name ?? "Project";
	}
	return t.startsWith("tag:") ? `#${t.slice(4)}` : H.find((e) => e.id === t)?.label ?? "Tasks";
}
function Be(e) {
	let t = decodeURIComponent((e ?? "").replace(/^\/+/, ""));
	return t && (t.startsWith("project:") || t.startsWith("tag:") || H.some((e) => e.id === t)) ? t : "today";
}
function Ve(e) {
	let t = /* @__PURE__ */ new Set(), n = [];
	for (let r of e.split(",")) {
		let e = r.trim().replace(/^#/, ""), i = e.toLocaleLowerCase();
		e && !t.has(i) && (t.add(i), n.push(e));
	}
	return n;
}
function He(e) {
	return e.split(/\s+/).filter(Boolean).slice(0, 2).map((e) => e[0].toLocaleUpperCase()).join("");
}
function Ue(e, t) {
	let n = e.tasks.some((e) => e.uid === t.uid);
	return {
		...e,
		tasks: n ? e.tasks.map((e) => e.uid === t.uid ? t : e) : [...e.tasks, t]
	};
}
function We(e, t) {
	let [n, r, i] = e.split("-").map(Number), a = new Date(Date.UTC(n, r - 1 + t, 1)), o = new Date(Date.UTC(a.getUTCFullYear(), a.getUTCMonth() + 1, 0)).getUTCDate();
	return a.setUTCDate(Math.min(i, o)), a.toISOString().slice(0, 10);
}
function X(e) {
	if (e == null) return null;
	let t = e.replace(/[\s\u00a0]/g, "");
	return t.includes(",") && !t.includes(".") && (t = t.replace(",", ".")), /^-?\d+(\.\d+)?$/.test(t) ? Math.round(Number(t) * 100) : null;
}
function Z(e, t, n = "en") {
	if (e === null) return "";
	let r = typeof e == "number" ? e : Number(e);
	if (!Number.isFinite(r)) return String(e);
	if (t && /^[A-Z]{3}$/.test(t)) try {
		return new Intl.NumberFormat(n, {
			style: "currency",
			currency: t
		}).format(r);
	} catch {}
	let i = new Intl.NumberFormat(n, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2
	}).format(r);
	return t ? `${i} ${t}` : i;
}
function Ge(e, t, n = "en") {
	let r = /* @__PURE__ */ new Map();
	for (let n of e) {
		let e = X(n.invoice?.amount);
		if (e === null) continue;
		let i = n.invoice?.currency ?? t;
		r.set(i, (r.get(i) ?? 0) + e);
	}
	return [...r].map(([e, t]) => Z(t / 100, e, n)).join(" + ");
}
function Q(e) {
	return e.invoice !== void 0 && e.invoice !== null;
}
function Ke(e, t) {
	let n = t.trim().toLocaleLowerCase();
	if (n) return e.tasks.filter((e) => Q(e) && e.name.trim().toLocaleLowerCase() === n).sort((e, t) => (e.due_date ?? "").localeCompare(t.due_date ?? "")).at(-1);
}
function qe(e) {
	let t = /* @__PURE__ */ new Map(), n = e.tasks.filter(Q).sort((e, t) => (t.due_date ?? "").localeCompare(e.due_date ?? ""));
	for (let e of n) {
		let n = e.name.trim().toLocaleLowerCase();
		t.has(n) || t.set(n, e.name.trim());
	}
	return [...t.values()];
}
function Je(e, t) {
	return t ? {
		name: t.name,
		due_date: We(t.due_date ?? e.today, 1),
		amount: "",
		currency: t.invoice?.currency ?? e.currency,
		reference: "",
		project_uid: t.project_uid,
		assigned_to: t.assigned_to,
		note: "",
		previous_uid: t.uid
	} : {
		name: "",
		due_date: "",
		amount: "",
		currency: e.currency,
		reference: "",
		project_uid: null,
		assigned_to: null,
		note: ""
	};
}
V("tududi-invoice-form", class extends R {
	static {
		this.properties = {
			snap: { attribute: !1 },
			draft: { attribute: !1 },
			language: {},
			busy: { type: Boolean },
			values: { state: !0 },
			linkPrevious: { state: !0 },
			touched: { state: !0 }
		};
	}
	constructor() {
		super(), this.language = "en", this.busy = !1, this.linkPrevious = !0, this.touched = /* @__PURE__ */ new Set();
	}
	willUpdate(e) {
		e.has("draft") && this.draft && (this.values = { ...this.draft }, this.linkPrevious = !0, this.touched = /* @__PURE__ */ new Set());
	}
	firstUpdated() {
		let e = this.values.name ? "input[name=amount]" : "input[name=name]";
		this.renderRoot.querySelector(e)?.focus();
	}
	set(e, t) {
		this.values = {
			...this.values,
			[e]: t
		}, this.touched = new Set(this.touched).add(e), e === "name" && !this.draft.previous_uid && this.prefillFromPrevious();
	}
	prefillFromPrevious() {
		let e = Ke(this.snap, this.values.name);
		if (!e) return;
		let t = { ...this.values };
		this.touched.has("project_uid") || (t.project_uid = e.project_uid), this.touched.has("assigned_to") || (t.assigned_to = e.assigned_to), !this.touched.has("currency") && e.invoice?.currency && (t.currency = e.invoice.currency), this.values = t;
	}
	get amountInvalid() {
		return this.values.amount.trim() !== "" && X(this.values.amount) === null;
	}
	get valid() {
		return !!(this.values.name.trim() && this.values.due_date && !this.amountInvalid);
	}
	submit(e) {
		if (e.preventDefault(), !this.valid || this.busy) return;
		let t = this.values, n = {
			name: t.name.trim(),
			due_date: t.due_date,
			amount: t.amount.trim() || null,
			currency: t.currency.trim().toUpperCase() || null,
			reference: t.reference.trim() || null,
			project_uid: t.project_uid,
			assigned_to: t.assigned_to,
			note: t.note.trim() || null
		};
		this.linkPrevious ? this.draft.previous_uid && (n.previous_uid = this.draft.previous_uid) : n.previous_uid = null, this.dispatchEvent(new CustomEvent("invoice-submit", {
			detail: n,
			bubbles: !0,
			composed: !0
		}));
	}
	cancel() {
		this.dispatchEvent(new CustomEvent("cancel", {
			bubbles: !0,
			composed: !0
		}));
	}
	render() {
		let e = this.values, t = this.snap, n = this.draft.previous_uid ? t.tasks.find((e) => e.uid === this.draft.previous_uid) : Ke(t, e.name), r = (e) => (t) => this.set(e, t.target.value);
		return O`
      <form @submit=${this.submit}>
        <div class="title">
          ${B("receipt", 20)}
          <span>${this.draft.previous_uid ? "Next invoice" : "New invoice"}</span>
          <span class="spacer"></span>
          <button type="button" class="icon" title="Close" @click=${this.cancel}>
            ${B("close", 20)}
          </button>
        </div>

        <div class="grid">
          <label class="wide">
            <span>Name / payee *</span>
            <input
              name="name"
              list="tududi-invoice-names"
              placeholder="e.g. Electricity"
              required
              .value=${e.name}
              @input=${r("name")}
            />
            <datalist id="tududi-invoice-names">
              ${qe(t).map((e) => O`<option value=${e}></option>`)}
            </datalist>
          </label>

          <label>
            <span>Due date *</span>
            <input name="due_date" type="date" required .value=${e.due_date} @input=${r("due_date")} />
          </label>

          <label>
            <span>Amount</span>
            <div class="amount">
              <input
                name="amount"
                inputmode="decimal"
                placeholder="0.00"
                class=${this.amountInvalid ? "invalid" : ""}
                .value=${e.amount}
                @input=${r("amount")}
              />
              <input
                name="currency"
                class="currency"
                maxlength="3"
                .value=${e.currency}
                @input=${r("currency")}
              />
            </div>
          </label>

          <label class="wide">
            <span>Reference</span>
            <input
              name="reference"
              placeholder="Payment reference or invoice number"
              .value=${e.reference}
              @input=${r("reference")}
            />
          </label>

          <label>
            <span>Project</span>
            <select @change=${(e) => this.set("project_uid", e.target.value || null)}>
              <option value="" ?selected=${!e.project_uid}>No project</option>
              ${t.projects.map((t) => O`<option value=${t.uid} ?selected=${t.uid === e.project_uid}>${t.name}</option>`)}
            </select>
          </label>

          <label>
            <span>Paid by</span>
            <select @change=${(e) => this.set("assigned_to", e.target.value || null)}>
              <option value="" ?selected=${!e.assigned_to}>Nobody</option>
              ${t.people.map((t) => O`<option value=${t.uid} ?selected=${t.uid === e.assigned_to}>
                    ${t.name}${t.is_self ? " (me)" : ""}
                  </option>`)}
            </select>
          </label>

          <label class="wide">
            <span>Note</span>
            <textarea rows="2" .value=${e.note} @input=${r("note")}></textarea>
          </label>
        </div>

        ${n ? O`<label class="link">
              <input
                type="checkbox"
                .checked=${this.linkPrevious}
                @change=${(e) => this.linkPrevious = e.target.checked}
              />
              <span>
                Link to previous invoice: due ${n.due_date ? K(n.due_date, this.language) : "–"}${n.invoice?.amount ? O` · ${Z(n.invoice.amount, n.invoice.currency, this.language)}` : A}${n.done ? " · paid" : ""}
              </span>
            </label>` : A}

        <div class="actions">
          <span class="hint">Tagged #${t.reminder_tag}</span>
          <button type="button" class="text" @click=${this.cancel}>Cancel</button>
          <button type="submit" class="primary" ?disabled=${!this.valid || this.busy}>
            ${this.busy ? "Saving…" : "Add invoice"}
          </button>
        </div>
      </form>
    `;
	}
	static {
		this.styles = o`
    :host {
      display: block;
    }
    form {
      background: var(--card-background-color);
      border: 1px solid var(--primary-color);
      border-radius: 10px;
      padding: 12px 16px 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 500;
      color: var(--primary-color);
    }
    .spacer {
      flex: 1;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 10px 12px;
    }
    label {
      display: flex;
      flex-direction: column;
      gap: 4px;
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    label.wide {
      grid-column: 1 / -1;
    }
    label.link {
      flex-direction: row;
      align-items: center;
      gap: 8px;
      font-size: 0.9em;
    }
    label.link input {
      width: auto;
    }
    .amount {
      display: flex;
      gap: 6px;
    }
    input,
    select,
    textarea {
      font: inherit;
      font-size: 1rem;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      padding: 8px;
      box-sizing: border-box;
      width: 100%;
      color-scheme: light dark;
    }
    input.currency {
      width: 64px;
      flex: none;
      text-transform: uppercase;
    }
    input.invalid {
      border-color: var(--error-color);
    }
    textarea {
      resize: vertical;
    }
    .actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }
    .hint {
      flex: 1;
      font-size: 0.85em;
      color: var(--secondary-text-color);
    }
    button {
      font: inherit;
      cursor: pointer;
    }
    button.icon {
      background: none;
      border: none;
      color: var(--secondary-text-color);
      padding: 4px;
      border-radius: 50%;
      display: inline-flex;
    }
    button.text {
      background: none;
      border: none;
      color: var(--primary-color);
      padding: 6px 12px;
      border-radius: 6px;
    }
    button.primary {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
    }
    button.primary:disabled {
      opacity: 0.5;
      cursor: default;
    }
  `;
	}
}), V("tududi-notes", class extends R {
	static {
		this.properties = {
			notes: { attribute: !1 },
			heading: {},
			canAdd: {
				type: Boolean,
				attribute: "can-add"
			},
			editing: { state: !0 },
			draftTitle: { state: !0 },
			draftContent: { state: !0 },
			expanded: { state: !0 }
		};
	}
	constructor() {
		super(), this.notes = [], this.heading = "Notes", this.canAdd = !0, this.editing = null, this.draftTitle = "", this.draftContent = "", this.expanded = /* @__PURE__ */ new Set();
	}
	startEdit(e) {
		this.editing = e ? e.uid : "new", this.draftTitle = e?.title ?? "", this.draftContent = e?.content ?? "";
	}
	save() {
		let e = this.draftTitle.trim();
		e && (this.dispatchEvent(new CustomEvent("note-save", {
			detail: {
				uid: this.editing === "new" ? null : this.editing,
				title: e,
				content: this.draftContent
			},
			bubbles: !0,
			composed: !0
		})), this.editing = null);
	}
	removeNote(e) {
		confirm(`Delete note "${e.title}"?`) && this.dispatchEvent(new CustomEvent("note-delete", {
			detail: { uid: e.uid },
			bubbles: !0,
			composed: !0
		}));
	}
	toggle(e) {
		let t = new Set(this.expanded);
		t.has(e) ? t.delete(e) : t.add(e), this.expanded = t;
	}
	renderEditor() {
		return O`
      <div class="editor">
        <input
          class="title-input"
          placeholder="Title"
          .value=${this.draftTitle}
          @input=${(e) => this.draftTitle = e.target.value}
        />
        <textarea
          rows="5"
          placeholder="Write a note…"
          .value=${this.draftContent}
          @input=${(e) => this.draftContent = e.target.value}
        ></textarea>
        <div class="actions">
          <button class="text" @click=${() => this.editing = null}>Cancel</button>
          <button class="primary" ?disabled=${!this.draftTitle.trim()} @click=${this.save}>
            Save
          </button>
        </div>
      </div>
    `;
	}
	render() {
		let e = [...this.notes].sort((e, t) => (t.updated_at ?? "").localeCompare(e.updated_at ?? ""));
		return O`
      <div class="header">
        <span class="heading">${B("note", 18)} ${this.heading}</span>
        ${this.canAdd && this.editing !== "new" ? O`<button class="text" @click=${() => this.startEdit(null)}>
              ${B("plus", 18)} Add note
            </button>` : A}
      </div>
      ${this.editing === "new" ? this.renderEditor() : A}
      ${e.length === 0 && this.editing !== "new" ? O`<div class="empty">No notes yet.</div>` : A}
      ${e.map((e) => this.editing === e.uid ? this.renderEditor() : O`
              <div class="note">
                <div class="note-head">
                  <button class="note-title" @click=${() => this.toggle(e.uid)}>
                    ${e.title}
                  </button>
                  <button class="icon" title="Edit" @click=${() => this.startEdit(e)}>
                    ${B("pencil", 18)}
                  </button>
                  <button class="icon" title="Delete" @click=${() => this.removeNote(e)}>
                    ${B("delete", 18)}
                  </button>
                </div>
                <div class="content ${this.expanded.has(e.uid) ? "expanded" : ""}"
                  @click=${() => this.toggle(e.uid)}>${e.content}</div>
              </div>
            `)}
    `;
	}
	static {
		this.styles = o`
    :host {
      display: block;
    }
    .header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 8px;
    }
    .heading {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: var(--secondary-text-color);
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .empty {
      color: var(--secondary-text-color);
      font-size: 0.9em;
      padding: 4px 0 8px;
    }
    .note {
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 10px;
      margin-bottom: 8px;
      background: var(--card-background-color);
    }
    .note-head {
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .note-title {
      flex: 1;
      text-align: left;
      font: inherit;
      font-weight: 500;
      background: none;
      border: none;
      color: var(--primary-text-color);
      padding: 0;
      cursor: pointer;
    }
    .content {
      white-space: pre-wrap;
      color: var(--secondary-text-color);
      font-size: 0.9em;
      margin-top: 4px;
      max-height: 4.5em;
      overflow: hidden;
      cursor: pointer;
    }
    .content.expanded {
      max-height: none;
    }
    .editor {
      display: flex;
      flex-direction: column;
      gap: 8px;
      margin-bottom: 8px;
    }
    input,
    textarea {
      font: inherit;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      padding: 8px;
      box-sizing: border-box;
      width: 100%;
    }
    textarea {
      resize: vertical;
    }
    .actions {
      display: flex;
      justify-content: flex-end;
      gap: 8px;
    }
    button {
      font: inherit;
      cursor: pointer;
    }
    button.text {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: none;
      color: var(--primary-color);
      padding: 4px 6px;
      border-radius: 6px;
    }
    button.primary {
      background: var(--primary-color);
      color: var(--text-primary-color, #fff);
      border: none;
      border-radius: 6px;
      padding: 6px 14px;
    }
    button.primary:disabled {
      opacity: 0.5;
      cursor: default;
    }
    button.icon {
      background: none;
      border: none;
      color: var(--secondary-text-color);
      padding: 4px;
      border-radius: 50%;
      display: inline-flex;
    }
    button.icon:hover,
    button.text:hover {
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
    }
  `;
	}
});
//#endregion
//#region src/types.ts
var $ = {
	NOT_STARTED: 0,
	IN_PROGRESS: 1,
	DONE: 2,
	ARCHIVED: 3,
	WAITING: 4,
	CANCELLED: 5,
	PLANNED: 6
}, Ye = {
	0: "Not started",
	1: "In progress",
	2: "Done",
	3: "Archived",
	4: "Waiting",
	5: "Cancelled",
	6: "Planned"
}, Xe = {
	0: "Low",
	1: "Medium",
	2: "High"
}, Ze = [
	$.NOT_STARTED,
	$.IN_PROGRESS,
	$.WAITING,
	$.PLANNED,
	$.DONE
];
V("tududi-task-detail", class extends R {
	static {
		this.properties = {
			task: { attribute: !1 },
			snap: { attribute: !1 },
			language: {}
		};
	}
	constructor() {
		super(), this.language = "en";
	}
	change(e) {
		this.dispatchEvent(new CustomEvent("task-change", {
			detail: {
				uid: this.task.uid,
				fields: e
			},
			bubbles: !0,
			composed: !0
		}));
	}
	close() {
		this.dispatchEvent(new CustomEvent("close", {
			bubbles: !0,
			composed: !0
		}));
	}
	deleteTask() {
		confirm(`Delete task "${this.task.name}"?`) && this.dispatchEvent(new CustomEvent("task-delete", {
			detail: { uid: this.task.uid },
			bubbles: !0,
			composed: !0
		}));
	}
	onName(e) {
		let t = e.target.value.trim();
		t && t !== this.task.name ? this.change({ name: t }) : e.target.value = this.task.name;
	}
	onNote(e) {
		let t = e.target.value;
		t !== this.task.note && this.change({ note: t || null });
	}
	onTags(e) {
		let t = Ve(e.target.value);
		t.join(",") !== this.task.tags.join(",") && this.change({ tags: t });
	}
	setDue(e) {
		e !== this.task.due_date && this.change({ due_date: e });
	}
	emit(e, t) {
		this.dispatchEvent(new CustomEvent(e, {
			detail: t,
			bubbles: !0,
			composed: !0
		}));
	}
	onInvoice() {
		let e = (e) => this.renderRoot.querySelector(`input[name=${e}]`)?.value.trim() ?? "", t = e("amount");
		if (t && X(t) === null) return;
		let n = this.task.invoice, r = {
			amount: t || null,
			currency: e("currency").toUpperCase() || null,
			reference: e("reference") || null
		};
		(X(r.amount) !== X(n?.amount ?? null) || r.currency !== (n?.currency ?? null) || r.reference !== (n?.reference ?? null)) && this.emit("invoice-change", {
			uid: this.task.uid,
			...r
		});
	}
	renderLinked(e, t, n) {
		if (!t) return A;
		let r = this.snap.tasks.find((e) => e.uid === t), i = r ? O`${r.due_date ? K(r.due_date, this.language) : r.name}${r.invoice?.amount ? O` · ${Z(r.invoice.amount, r.invoice.currency, this.language)}` : A}${r.done ? " · paid" : ""}` : O`<em>not loaded</em>`;
		return O`<button
      class="linked ${n}"
      ?disabled=${!r}
      @click=${() => this.emit("select-task", { uid: t })}
    >
      ${n === "prev" ? B("chevronLeft", 18) : A}
      <span><span class="linked-label">${e}</span> ${i}</span>
      ${n === "next" ? B("chevronRight", 18) : A}
    </button>`;
	}
	renderInvoice() {
		let e = this.task.invoice;
		return e ? O`
      <section class="invoice">
        <div class="section-title">${B("receipt", 18)} Invoice</div>
        <div class="grid">
          <label>Amount</label>
          <div class="amount">
            <input
              name="amount"
              inputmode="decimal"
              placeholder="0.00"
              .value=${e.amount ?? ""}
              @input=${(e) => {
			let t = e.target;
			t.classList.toggle("invalid", t.value.trim() !== "" && X(t.value) === null);
		}}
              @change=${this.onInvoice}
            />
            <input
              name="currency"
              class="currency"
              maxlength="3"
              placeholder=${this.snap.currency}
              .value=${e.currency ?? ""}
              @change=${this.onInvoice}
            />
          </div>
          <label>Reference</label>
          <input
            name="reference"
            placeholder="Payment reference"
            .value=${e.reference ?? ""}
            @change=${this.onInvoice}
          />
        </div>
        <div class="links">
          ${this.renderLinked("Previous", e.previous_uid, "prev")}
          ${this.renderLinked("Next", e.next_uid, "next")}
        </div>
        ${e.next_uid ? A : O`<button class="chip next-invoice" @click=${() => this.emit("next-invoice", { uid: this.task.uid })}>
              ${B("plus", 16)} Create next invoice
            </button>`}
      </section>
    ` : A;
	}
	render() {
		let e = this.task, t = this.snap, n = e.project_uid ? t.notes.filter((t) => t.project_uid === e.project_uid) : [], r = t.projects.find((t) => t.uid === e.project_uid), i = e.due_date ? W(t.today, e.due_date) : null;
		return O`
      <div class="bar">
        <button class="icon" title="Close" @click=${this.close}>${B("back")}</button>
        <span class="spacer"></span>
        <button class="icon danger" title="Delete task" @click=${this.deleteTask}>
          ${B("delete")}
        </button>
      </div>

      <div class="content">
        <div class="name-row">
          <button
            class="check ${e.done ? "checked" : ""}"
            title=${e.done ? "Reopen" : "Mark done"}
            @click=${() => this.change({ status: e.done ? $.NOT_STARTED : $.DONE })}
          >
            ${e.done ? B("check", 18) : A}
          </button>
          <input
            class="name ${e.done ? "done" : ""}"
            .value=${e.name}
            @change=${this.onName}
            @keydown=${(e) => {
			e.key === "Enter" && e.target.blur();
		}}
          />
        </div>
        ${e.recurring ? O`<div class="hint">${B("repeat", 16)} Recurring task (edit recurrence in tududi)</div>` : A}

        <div class="grid">
          <label>Due date</label>
          <div class="due">
            <input
              type="date"
              .value=${e.due_date ?? ""}
              @change=${(e) => this.setDue(e.target.value || null)}
            />
            ${i === null ? A : O`<span class="badge ${Me(i)}">${q(t.today, e.due_date, this.language)}</span>`}
            <div class="quick">
              <button class="chip" @click=${() => this.setDue(t.today)}>Today</button>
              <button class="chip" @click=${() => this.setDue(G(t.today, 1))}>Tomorrow</button>
              <button class="chip" @click=${() => this.setDue(G(t.today, 7))}>+1 week</button>
              ${e.due_date ? O`<button class="chip" @click=${() => this.setDue(null)}>Clear</button>` : A}
            </div>
          </div>

          <label>Status</label>
          <select
            @change=${(e) => this.change({ status: Number(e.target.value) })}
          >
            ${Ze.map((t) => O`<option value=${t} ?selected=${t === e.status}>${Ye[t]}</option>`)}
          </select>

          <label>Priority</label>
          <select
            @change=${(e) => {
			let t = e.target.value;
			this.change({ priority: t === "" ? null : Number(t) });
		}}
          >
            <option value="" ?selected=${e.priority === null}>None</option>
            ${[
			0,
			1,
			2
		].map((t) => O`<option value=${t} ?selected=${t === e.priority}>${Xe[t]}</option>`)}
          </select>

          <label>Project</label>
          <select
            @change=${(e) => this.change({ project_uid: e.target.value || null })}
          >
            <option value="" ?selected=${!e.project_uid}>No project</option>
            ${t.projects.map((t) => O`<option value=${t.uid} ?selected=${t.uid === e.project_uid}>${t.name}</option>`)}
          </select>

          <label>Assigned to</label>
          <select
            @change=${(e) => this.change({ assigned_to: e.target.value || null })}
          >
            <option value="" ?selected=${!e.assigned_to}>Nobody</option>
            ${t.people.map((t) => O`<option value=${t.uid} ?selected=${t.uid === e.assigned_to}>
                  ${t.name}${t.is_self ? " (me)" : ""}
                </option>`)}
          </select>

          <label>Tags</label>
          <div>
            <input
              list="tududi-tags"
              placeholder="e.g. invoice, car"
              .value=${e.tags.join(", ")}
              @change=${this.onTags}
            />
            <datalist id="tududi-tags">
              ${t.tags.map((e) => O`<option value=${e}></option>`)}
            </datalist>
          </div>
        </div>

        ${this.renderInvoice()}

        <label class="block">Note</label>
        <textarea
          rows="6"
          placeholder="Details, invoice amount, reference number…"
          .value=${e.note}
          @change=${this.onNote}
        ></textarea>

        ${r ? O`<tududi-notes
              .notes=${n}
              heading=${`Notes · ${r.name}`}
              can-add
            ></tududi-notes>` : A}
      </div>
    `;
	}
	static {
		this.styles = o`
    :host {
      display: flex;
      flex-direction: column;
      height: 100%;
      background: var(--card-background-color);
      color: var(--primary-text-color);
    }
    .bar {
      display: flex;
      align-items: center;
      padding: 4px 8px;
      border-bottom: 1px solid var(--divider-color);
      min-height: 48px;
      box-sizing: border-box;
    }
    .spacer {
      flex: 1;
    }
    .content {
      padding: 16px;
      overflow-y: auto;
      flex: 1;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .content > * {
      flex-shrink: 0;
    }
    .name-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }
    input.name {
      font-size: 1.3em;
      font-weight: 500;
      border: 1px solid transparent;
      background: transparent;
      padding: 6px;
    }
    input.name:hover,
    input.name:focus {
      border-color: var(--divider-color);
    }
    input.name.done {
      text-decoration: line-through;
      color: var(--secondary-text-color);
    }
    .hint {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--secondary-text-color);
      font-size: 0.85em;
    }
    .grid {
      display: grid;
      grid-template-columns: 110px 1fr;
      gap: 10px 12px;
      align-items: center;
    }
    label {
      color: var(--secondary-text-color);
      font-size: 0.9em;
    }
    label.block {
      margin-bottom: -6px;
    }
    .due {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 8px;
    }
    .due input {
      width: auto;
    }
    .quick {
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      width: 100%;
    }
    input,
    select,
    textarea {
      font: inherit;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 6px;
      padding: 8px;
      box-sizing: border-box;
      width: 100%;
      color-scheme: light dark;
    }
    textarea {
      resize: vertical;
    }
    button {
      font: inherit;
      cursor: pointer;
    }
    button.icon {
      background: none;
      border: none;
      color: var(--primary-text-color);
      padding: 8px;
      border-radius: 50%;
      display: inline-flex;
    }
    button.icon:hover {
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.1));
    }
    button.icon.danger {
      color: var(--error-color);
    }
    button.chip {
      border: 1px solid var(--divider-color);
      background: none;
      color: var(--primary-text-color);
      border-radius: 16px;
      padding: 2px 10px;
      font-size: 0.85em;
    }
    button.chip:hover {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }
    .check {
      flex: none;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid var(--secondary-text-color);
      background: none;
      color: var(--text-primary-color, #fff);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .check.checked {
      background: var(--success-color, #43a047);
      border-color: var(--success-color, #43a047);
    }
    .badge {
      font-size: 0.8em;
      padding: 2px 8px;
      border-radius: 10px;
      background: var(--secondary-background-color, rgba(127, 127, 127, 0.15));
    }
    .badge.overdue {
      background: var(--error-color);
      color: #fff;
    }
    .badge.today {
      background: var(--warning-color, #ffa600);
      color: #fff;
    }
    .badge.soon {
      color: var(--primary-color);
    }
    tududi-notes {
      margin-top: 8px;
    }
    section.invoice {
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      padding: 10px 12px 12px;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }
    .section-title {
      display: flex;
      align-items: center;
      gap: 6px;
      font-weight: 500;
      color: var(--secondary-text-color);
      font-size: 0.9em;
      text-transform: uppercase;
      letter-spacing: 0.04em;
    }
    .amount {
      display: flex;
      gap: 6px;
    }
    input.currency {
      width: 64px;
      flex: none;
      text-transform: uppercase;
    }
    input.invalid {
      border-color: var(--error-color);
    }
    .links {
      display: flex;
      justify-content: space-between;
      gap: 8px;
      flex-wrap: wrap;
    }
    .links:empty {
      display: none;
    }
    button.linked {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: none;
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 4px 8px;
      color: var(--primary-text-color);
      font-size: 0.85em;
    }
    button.linked.next {
      margin-left: auto;
    }
    button.linked:hover:not([disabled]) {
      border-color: var(--primary-color);
    }
    .linked-label {
      color: var(--secondary-text-color);
    }
    button.next-invoice {
      align-self: flex-start;
      display: inline-flex;
      align-items: center;
      gap: 4px;
    }
  `;
	}
});
//#endregion
//#region src/tududi-panel.ts
var Qe = "tududi-panel-entry";
V("tududi-panel", class extends R {
	static {
		this.properties = {
			hass: { attribute: !1 },
			narrow: { type: Boolean },
			route: { attribute: !1 },
			panel: { attribute: !1 },
			entries: { state: !0 },
			entryId: { state: !0 },
			serverSnap: { state: !0 },
			overrides: { state: !0 },
			selectedUid: { state: !0 },
			search: { state: !0 },
			quickAdd: { state: !0 },
			toast: { state: !0 },
			loading: { state: !0 },
			refreshing: { state: !0 },
			draft: { state: !0 },
			savingInvoice: { state: !0 }
		};
	}
	constructor() {
		super(), this.api = new ke(() => this.hass), this.initialized = !1, this.narrow = !1, this.overrides = /* @__PURE__ */ new Map(), this.search = "", this.quickAdd = "", this.loading = !0, this.refreshing = !1, this.savingInvoice = !1;
	}
	connectedCallback() {
		super.connectedCallback(), this.entryId && !this.unsubscribe && this.subscribe(this.entryId);
	}
	disconnectedCallback() {
		super.disconnectedCallback(), this.unsubscribeNow();
	}
	willUpdate(e) {
		e.has("hass") && this.hass && !this.initialized && (this.initialized = !0, this.init());
	}
	async init() {
		try {
			let e = await this.api.entries();
			if (this.entries = e, !e.length) {
				this.loading = !1;
				return;
			}
			let t = localStorage.getItem(Qe), n = e.find((e) => e.entry_id === t) ?? e.find((e) => e.linked) ?? e[0];
			this.selectEntry(n.entry_id);
		} catch (e) {
			this.loading = !1, this.showToast(`Could not load tududi accounts: ${z(e)}`);
		}
	}
	selectEntry(e) {
		e !== this.entryId && (localStorage.setItem(Qe, e), this.unsubscribeNow(), this.entryId = e, this.serverSnap = void 0, this.overrides = /* @__PURE__ */ new Map(), this.selectedUid = void 0, this.loading = !0, this.subscribe(e));
	}
	subscribe(e) {
		this.unsubscribe = this.api.subscribe(e, (e) => {
			e.entry_id === this.entryId && (this.serverSnap = e, this.loading = !1);
		}), this.unsubscribe.catch((e) => {
			this.loading = !1, this.unsubscribe = void 0, this.showToast(`Could not load tasks: ${z(e)}`);
		});
	}
	unsubscribeNow() {
		let e = this.unsubscribe;
		this.unsubscribe = void 0, e?.then((e) => e()).catch(() => void 0);
	}
	get snap() {
		let e = this.serverSnap;
		if (!e || this.overrides.size === 0) return e;
		let t = e;
		for (let [e, n] of this.overrides) t = n === null ? {
			...t,
			tasks: t.tasks.filter((t) => t.uid !== e)
		} : Ue(t, n);
		return t;
	}
	get view() {
		return Be(this.route?.path);
	}
	get language() {
		return this.hass?.locale?.language ?? this.hass?.language ?? "en";
	}
	navigate(e) {
		let t = this.route?.prefix ?? "/tududi";
		history.pushState(null, "", `${t}/${encodeURIComponent(e)}`), window.dispatchEvent(new CustomEvent("location-changed")), this.selectedUid = void 0, this.search = "";
	}
	showToast(e) {
		this.toast = e, window.clearTimeout(this.toastTimer), this.toastTimer = window.setTimeout(() => this.toast = void 0, 6e3);
	}
	setOverride(e, t) {
		let n = new Map(this.overrides);
		t === void 0 ? n.delete(e) : n.set(e, t), this.overrides = n;
	}
	async updateTask(e, t) {
		let n = this.snap, r = this.entryId, i = n?.tasks.find((t) => t.uid === e);
		if (!n || !r || !i) return;
		let a = {
			...i,
			...t
		};
		t.status !== void 0 && (a.done = t.status === $.DONE, a.open = ![
			$.DONE,
			$.ARCHIVED,
			$.CANCELLED
		].includes(t.status)), this.setOverride(e, a);
		try {
			await this.api.updateTask(r, e, t);
		} catch (e) {
			this.showToast(`Saving failed: ${z(e)}`);
		} finally {
			this.setOverride(e, void 0);
		}
	}
	toggleDone(e) {
		this.updateTask(e.uid, { status: e.done ? $.NOT_STARTED : $.DONE });
	}
	async deleteTask(e) {
		if (this.entryId) {
			this.setOverride(e, null), this.selectedUid = void 0;
			try {
				await this.api.deleteTask(this.entryId, e);
			} catch (e) {
				this.showToast(`Deleting failed: ${z(e)}`);
			} finally {
				this.setOverride(e, void 0);
			}
		}
	}
	async addTask() {
		let e = this.quickAdd.trim(), t = this.snap;
		if (e && t && this.entryId) {
			this.quickAdd = "";
			try {
				await this.api.createTask(this.entryId, e, ze(t, this.view));
			} catch (t) {
				this.quickAdd = e, this.showToast(`Adding failed: ${z(t)}`);
			}
		}
	}
	async saveNote(e, t) {
		if (this.entryId) try {
			e.uid ? await this.api.updateNote(this.entryId, e.uid, {
				title: e.title,
				content: e.content
			}) : await this.api.createNote(this.entryId, e.title, {
				content: e.content,
				...t ? { project_uid: t } : {}
			});
		} catch (e) {
			this.showToast(`Saving note failed: ${z(e)}`);
		}
	}
	async deleteNote(e) {
		if (this.entryId) try {
			await this.api.deleteNote(this.entryId, e);
		} catch (e) {
			this.showToast(`Deleting note failed: ${z(e)}`);
		}
	}
	openInvoiceForm(e) {
		let t = this.snap;
		if (!t) return;
		let n = e ? t.tasks.find((t) => t.uid === e) : void 0;
		this.draft = Je(t, n), this.selectedUid = void 0;
	}
	async createInvoice(e) {
		if (this.entryId) {
			this.savingInvoice = !0;
			try {
				let t = await this.api.createInvoice(this.entryId, e);
				this.draft = void 0, this.selectedUid = t.uid;
			} catch (e) {
				this.showToast(`Adding invoice failed: ${z(e)}`);
			} finally {
				this.savingInvoice = !1;
			}
		}
	}
	async updateInvoice(e) {
		let t = this.snap?.tasks.find((t) => t.uid === e.uid);
		if (!this.entryId || !t?.invoice) return;
		let { uid: n, ...r } = e;
		this.setOverride(n, {
			...t,
			invoice: {
				...t.invoice,
				...r
			}
		});
		try {
			await this.api.updateInvoice(this.entryId, n, r);
		} catch (e) {
			this.showToast(`Saving invoice failed: ${z(e)}`);
		} finally {
			this.setOverride(n, void 0);
		}
	}
	async refresh() {
		if (this.entryId) {
			this.refreshing = !0;
			try {
				await this.api.refresh(this.entryId);
			} catch (e) {
				this.showToast(`Refresh failed: ${z(e)}`);
			} finally {
				this.refreshing = !1;
			}
		}
	}
	render() {
		let e = this.snap, t = e?.tasks.find((e) => e.uid === this.selectedUid);
		return O`
      <div class="toolbar">
        ${this.narrow ? O`<button
              class="icon"
              title="Menu"
              @click=${() => this.dispatchEvent(new CustomEvent("hass-toggle-menu", {
			bubbles: !0,
			composed: !0
		}))}
            >
              ${B("menu")}
            </button>` : A}
        <div class="title">Tududi</div>
        ${this.entries && this.entries.length > 1 ? O`<select
              class="entry"
              @change=${(e) => this.selectEntry(e.target.value)}
            >
              ${this.entries.map((e) => O`<option value=${e.entry_id} ?selected=${e.entry_id === this.entryId}>
                    ${e.title}
                  </option>`)}
            </select>` : A}
        <button
          class="icon ${this.refreshing ? "spin" : ""}"
          title="Refresh from tududi"
          ?disabled=${!this.entryId}
          @click=${this.refresh}
        >
          ${B("refresh")}
        </button>
      </div>
      ${this.renderBody(e, t)}
      ${this.toast ? O`<div class="toast" @click=${() => this.toast = void 0}>${this.toast}</div>` : A}
    `;
	}
	renderBody(e, t) {
		return this.entries && this.entries.length === 0 ? O`<div class="message">
        <h2>No tududi account</h2>
        <p>
          No tududi account is linked to your Home Assistant user. Ask an administrator to add
          the Tududi integration with your API key and select you as its Home Assistant user.
        </p>
      </div>` : this.loading || !e ? O`<div class="message">Loading…</div>` : O`
      <div class="body ${this.narrow ? "narrow" : ""} ${t ? "has-detail" : ""}">
        ${this.narrow ? A : this.renderNav(e)}
        <main class="list">
          ${this.narrow ? this.renderNarrowNav(e) : A}
          ${e.last_update_success ? A : O`<div class="warning">tududi is unreachable; showing cached tasks.</div>`}
          ${this.renderList(e)}
        </main>
        ${t ? O`<aside class="detail">
              <tududi-task-detail
                .task=${t}
                .snap=${e}
                .language=${this.language}
                @close=${() => this.selectedUid = void 0}
                @task-change=${(e) => this.updateTask(e.detail.uid, e.detail.fields)}
                @task-delete=${(e) => this.deleteTask(e.detail.uid)}
                @note-save=${(e) => this.saveNote(e.detail, t.project_uid)}
                @note-delete=${(e) => this.deleteNote(e.detail.uid)}
                @invoice-change=${(e) => this.updateInvoice(e.detail)}
                @select-task=${(e) => this.selectedUid = e.detail.uid}
                @next-invoice=${(e) => this.openInvoiceForm(e.detail.uid)}
              ></tududi-task-detail>
            </aside>` : A}
      </div>
    `;
	}
	renderNav(e) {
		let t = (e, t, n) => O`
      <button class="nav-item ${this.view === e ? "active" : ""}" @click=${() => this.navigate(e)}>
        <span class="nav-label">${t}</span>
        ${n ? O`<span class="count">${n}</span>` : A}
      </button>
    `;
		return O`
      <nav class="sidebar">
        ${H.map((n) => t(n.id, n.label, n.id === "done" ? void 0 : J(e, n.id)))}
        ${e.projects.length ? O`<div class="nav-section">Projects</div>
              ${e.projects.map((n) => t(`project:${n.uid}`, n.name, J(e, `project:${n.uid}`)))}` : A}
        ${e.tags.length ? O`<div class="nav-section">Tags</div>
              ${e.tags.map((n) => t(`tag:${n}`, `#${n}`, J(e, `tag:${n}`)))}` : A}
      </nav>
    `;
	}
	renderNarrowNav(e) {
		let t = this.view.startsWith("project:") || this.view.startsWith("tag:");
		return O`
      <div class="chips">
        ${H.map((t) => {
			let n = t.id === "done" ? 0 : J(e, t.id);
			return O`<button
            class="chip ${this.view === t.id ? "active" : ""}"
            @click=${() => this.navigate(t.id)}
          >
            ${t.label}${n ? O` <span class="count">${n}</span>` : A}
          </button>`;
		})}
        <select
          class="chip ${t ? "active" : ""}"
          @change=${(e) => {
			let t = e.target.value;
			t && this.navigate(t);
		}}
        >
          <option value="" ?selected=${!t}>Projects & tags…</option>
          ${e.projects.map((e) => O`<option value=${`project:${e.uid}`} ?selected=${this.view === `project:${e.uid}`}>
                ${e.name}
              </option>`)}
          ${e.tags.map((e) => O`<option value=${`tag:${e}`} ?selected=${this.view === `tag:${e}`}>#${e}</option>`)}
        </select>
      </div>
    `;
	}
	renderList(e) {
		let t = this.view, n = Re(e, t, Le(e, t).filter((e) => Ie(e, this.search)), this.language), r = t.startsWith("project:") ? t.slice(8) : null, i = t !== "done" && t !== "overdue" && t !== "invoices";
		return O`
      <div class="list-header">
        <h1>${Y(e, t)}</h1>
        <input
          class="search"
          type="search"
          placeholder="Search"
          .value=${this.search}
          @input=${(e) => this.search = e.target.value}
        />
      </div>
      ${i ? O`<form
            class="quick-add"
            @submit=${(e) => {
			e.preventDefault(), this.addTask();
		}}
          >
            ${B("plus")}
            <input
              placeholder=${this.quickAddPlaceholder(e, t)}
              .value=${this.quickAdd}
              @input=${(e) => this.quickAdd = e.target.value}
            />
          </form>` : A}
      ${this.draft ? O`<tududi-invoice-form
            .snap=${e}
            .draft=${this.draft}
            .language=${this.language}
            ?busy=${this.savingInvoice}
            @invoice-submit=${(e) => this.createInvoice(e.detail)}
            @cancel=${() => this.draft = void 0}
          ></tududi-invoice-form>` : t === "invoices" ? O`<button class="quick-add new-invoice" @click=${() => this.openInvoiceForm()}>
              ${B("receipt")} <span>New invoice</span>
            </button>` : A}
      ${r ? O`<tududi-notes
            class="project-notes"
            .notes=${e.notes.filter((e) => e.project_uid === r)}
            heading="Project notes"
            can-add
            @note-save=${(e) => this.saveNote(e.detail, r)}
            @note-delete=${(e) => this.deleteNote(e.detail.uid)}
          ></tududi-notes>` : A}
      ${n.length === 0 ? O`<div class="empty">${this.search ? "No matching tasks." : "Nothing here. 🎉"}</div>` : n.map((n) => O`
              <section>
                ${n.label ? O`<h2 class="group ${n.key}">
                      ${n.label}<span>${n.tasks.length}</span>
                      ${t === "invoices" && n.key !== "done" ? O`<span class="total">${Ge(n.tasks, e.currency, this.language)}</span>` : A}
                    </h2>` : A}
                ${n.tasks.map((n) => this.renderTask(e, n, t))}
              </section>
            `)}
    `;
	}
	quickAddPlaceholder(e, t) {
		return t === "today" ? "Add a task due today" : t === "upcoming" ? "Add a task due tomorrow" : t === "invoices" ? `Add an invoice (tagged #${e.reminder_tag})` : t.startsWith("project:") ? `Add a task to ${Y(e, t)}` : t.startsWith("tag:") ? `Add a task tagged ${Y(e, t)}` : "Add a task";
	}
	renderTask(e, t, n) {
		let r = n.startsWith("project:") ? void 0 : e.projects.find((e) => e.uid === t.project_uid), i = t.assigned_to && t.assigned_to !== e.self_person ? e.people.find((e) => e.uid === t.assigned_to) : void 0, a = t.due_date ? W(e.today, t.due_date) : null, o = n.startsWith("tag:") ? n.slice(4).toLocaleLowerCase() : null, s = t.tags.filter((e) => e.toLocaleLowerCase() !== o);
		return O`
      <div
        class="task ${t.uid === this.selectedUid ? "selected" : ""} ${t.open ? "" : "closed"}"
        @click=${() => this.selectedUid = t.uid}
      >
        <button
          class="check ${t.done ? "checked" : ""} ${t.priority === 2 ? "high" : ""}"
          title=${t.done ? "Reopen" : "Mark done"}
          @click=${(e) => {
			e.stopPropagation(), this.toggleDone(t);
		}}
        >
          ${t.done ? B("check", 16) : A}
        </button>
        <div class="task-main">
          <div class="task-name">${t.name}</div>
          <div class="meta">
            ${a !== null && t.open ? O`<span class="due ${Me(a)}">${q(e.today, t.due_date, this.language)}</span>` : A}
            ${t.status === $.IN_PROGRESS ? O`<span class="status">In progress</span>` : A}
            ${t.status === $.WAITING ? O`<span class="status">Waiting</span>` : A}
            ${r ? O`<span class="project">${r.name}</span>` : A}
            ${s.map((e) => O`<span class="tag">#${e}</span>`)}
            ${t.note ? O`<span class="has-note" title=${t.note}>${B("note", 14)}</span>` : A}
            ${t.recurring ? O`<span class="has-note">${B("repeat", 14)}</span>` : A}
          </div>
        </div>
        ${t.invoice?.amount ? O`<span class="money">${Z(t.invoice.amount, t.invoice.currency ?? e.currency, this.language)}</span>` : A}
        ${i ? O`<span class="avatar" title=${`Assigned to ${i.name}`}>${He(i.name)}</span>` : A}
      </div>
    `;
	}
	static {
		this.styles = o`
    :host {
      display: flex;
      flex-direction: column;
      height: 100vh;
      height: 100dvh;
      background: var(--primary-background-color);
      color: var(--primary-text-color);
      font-family: var(--paper-font-body1_-_font-family, inherit);
      position: relative;
    }
    button {
      font: inherit;
      cursor: pointer;
    }
    .toolbar {
      display: flex;
      align-items: center;
      gap: 8px;
      height: var(--header-height, 56px);
      padding: 0 8px 0 16px;
      background: var(--app-header-background-color, var(--primary-color));
      color: var(--app-header-text-color, var(--text-primary-color, #fff));
      border-bottom: var(--app-header-border-bottom, none);
      box-sizing: border-box;
      flex: none;
    }
    .toolbar .title {
      flex: 1;
      font-size: 20px;
      font-weight: 400;
    }
    .toolbar .icon {
      color: inherit;
    }
    .toolbar select.entry {
      font: inherit;
      color: inherit;
      background: rgba(255, 255, 255, 0.12);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 6px;
      padding: 4px 8px;
    }
    .toolbar select.entry option {
      color: var(--primary-text-color);
      background: var(--card-background-color);
    }
    button.icon {
      background: none;
      border: none;
      padding: 8px;
      border-radius: 50%;
      display: inline-flex;
      color: var(--primary-text-color);
    }
    button.icon:hover {
      background: rgba(127, 127, 127, 0.15);
    }
    button.icon.spin svg {
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      to {
        transform: rotate(360deg);
      }
    }
    .message {
      padding: 32px;
      max-width: 560px;
      margin: 0 auto;
      color: var(--secondary-text-color);
    }
    .body {
      flex: 1;
      display: flex;
      min-height: 0;
    }
    .sidebar {
      width: 220px;
      flex: none;
      overflow-y: auto;
      padding: 12px 8px;
      border-right: 1px solid var(--divider-color);
      box-sizing: border-box;
    }
    .nav-item {
      display: flex;
      width: 100%;
      align-items: center;
      gap: 8px;
      background: none;
      border: none;
      color: var(--primary-text-color);
      padding: 8px 12px;
      border-radius: 8px;
      text-align: left;
    }
    .nav-item:hover {
      background: rgba(127, 127, 127, 0.1);
    }
    .nav-item.active {
      background: rgba(var(--rgb-primary-color, 3, 169, 244), 0.15);
      color: var(--primary-color);
      font-weight: 500;
    }
    .nav-label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .count {
      font-size: 0.8em;
      color: var(--secondary-text-color);
      font-variant-numeric: tabular-nums;
    }
    .nav-section {
      margin: 16px 12px 4px;
      font-size: 0.75em;
      text-transform: uppercase;
      letter-spacing: 0.06em;
      color: var(--secondary-text-color);
    }
    .list {
      flex: 1;
      min-width: 0;
      overflow-y: auto;
      padding: 16px 24px 48px;
      box-sizing: border-box;
    }
    .body.narrow .list {
      padding: 8px 12px 48px;
    }
    .detail {
      width: 420px;
      flex: none;
      border-left: 1px solid var(--divider-color);
      min-height: 0;
    }
    .body.narrow .detail {
      position: absolute;
      inset: 0;
      width: auto;
      z-index: 5;
      border: none;
    }
    .chips {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      padding: 4px 0 8px;
      scrollbar-width: none;
    }
    .chip {
      flex: none;
      border: 1px solid var(--divider-color);
      background: var(--card-background-color);
      color: var(--primary-text-color);
      border-radius: 16px;
      padding: 4px 12px;
      font: inherit;
      font-size: 0.9em;
    }
    .chip.active {
      border-color: var(--primary-color);
      color: var(--primary-color);
      font-weight: 500;
    }
    .list-header {
      display: flex;
      align-items: center;
      gap: 12px;
      margin-bottom: 12px;
    }
    .list-header h1 {
      flex: 1;
      font-size: 1.6em;
      font-weight: 400;
      margin: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    input.search,
    .quick-add input {
      font: inherit;
      color: var(--primary-text-color);
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 8px;
      padding: 8px 10px;
      box-sizing: border-box;
    }
    input.search {
      width: 180px;
    }
    .quick-add {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      padding: 2px 10px;
      margin-bottom: 16px;
      color: var(--secondary-text-color);
    }
    .quick-add:focus-within {
      border-color: var(--primary-color);
      color: var(--primary-color);
    }
    .quick-add input {
      flex: 1;
      border: none;
      background: none;
      padding: 10px 0;
      outline: none;
    }
    .project-notes {
      margin-bottom: 16px;
    }
    tududi-invoice-form {
      margin-bottom: 16px;
    }
    button.new-invoice {
      width: 100%;
      font: inherit;
      padding: 10px;
      cursor: pointer;
      color: var(--primary-color);
    }
    button.new-invoice:hover {
      border-color: var(--primary-color);
    }
    h2.group .total {
      margin-left: auto;
      font-weight: 500;
      color: var(--primary-text-color);
      text-transform: none;
      letter-spacing: 0;
      font-variant-numeric: tabular-nums;
    }
    .money {
      flex: none;
      font-variant-numeric: tabular-nums;
      font-weight: 500;
    }
    .task.closed .money {
      color: var(--secondary-text-color);
    }
    .warning {
      background: var(--warning-color, #ffa600);
      color: #fff;
      border-radius: 8px;
      padding: 8px 12px;
      margin-bottom: 12px;
    }
    .empty {
      text-align: center;
      color: var(--secondary-text-color);
      padding: 48px 0;
    }
    h2.group {
      display: flex;
      align-items: baseline;
      gap: 8px;
      font-size: 0.85em;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--secondary-text-color);
      margin: 20px 0 6px;
    }
    h2.group span {
      font-weight: 400;
    }
    h2.group.overdue {
      color: var(--error-color);
    }
    .task {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 12px;
      background: var(--card-background-color);
      border: 1px solid var(--divider-color);
      border-radius: 10px;
      margin-bottom: 6px;
      cursor: pointer;
      transition: border-color 0.1s;
    }
    .task:hover {
      border-color: var(--primary-color);
    }
    .task.selected {
      border-color: var(--primary-color);
      box-shadow: 0 0 0 1px var(--primary-color);
    }
    .task.closed .task-name {
      text-decoration: line-through;
      color: var(--secondary-text-color);
    }
    .check {
      flex: none;
      width: 22px;
      height: 22px;
      border-radius: 50%;
      border: 2px solid var(--secondary-text-color);
      background: none;
      color: var(--text-primary-color, #fff);
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 0;
    }
    .check.high {
      border-color: var(--error-color);
    }
    .check:hover {
      border-color: var(--success-color, #43a047);
    }
    .check.checked {
      background: var(--success-color, #43a047);
      border-color: var(--success-color, #43a047);
    }
    .task-main {
      flex: 1;
      min-width: 0;
    }
    .task-name {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .meta {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 4px 10px;
      font-size: 0.8em;
      color: var(--secondary-text-color);
      margin-top: 2px;
    }
    .meta:empty {
      display: none;
    }
    .due.overdue {
      color: var(--error-color);
      font-weight: 500;
    }
    .due.today {
      color: var(--warning-color, #ffa600);
      font-weight: 500;
    }
    .due.soon {
      color: var(--primary-color);
    }
    .tag {
      color: var(--primary-color);
    }
    .has-note {
      display: inline-flex;
    }
    .avatar {
      flex: none;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--accent-color, #ff9800);
      color: #fff;
      font-size: 0.75em;
      font-weight: 500;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    .toast {
      position: absolute;
      left: 50%;
      bottom: 24px;
      transform: translateX(-50%);
      background: var(--primary-text-color);
      color: var(--primary-background-color);
      padding: 10px 16px;
      border-radius: 8px;
      max-width: 90%;
      z-index: 10;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      cursor: pointer;
    }
  `;
	}
});
//#endregion
